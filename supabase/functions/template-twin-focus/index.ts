
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : "";
  console.log(`[NEWSLETTER-GEN] ${step}${detailsStr}`);
};

// Enhanced JSON extraction function with multiple parsing strategies
const extractAndParseJSON = (content: string): any => {
  // Strategy 1: Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockPatterns = [
    /```(?:json)?\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /`([\s\S]*?)`/
  ];

  for (const pattern of codeBlockPatterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const extracted = match[1].trim();
        return JSON.parse(extracted);
      } catch {
        continue;
      }
    }
  }

  // Strategy 3: Find JSON-like structure by braces
  const bracePattern = /\{[\s\S]*\}/;
  const braceMatch = content.match(bracePattern);
  if (braceMatch) {
    try {
      let jsonStr = braceMatch[0];
      
      // Clean up common issues
      jsonStr = jsonStr
        // Fix unescaped quotes in strings
        .replace(/(['"])(.*?)\1/g, (match, quote, inner) => {
          const escaped = inner.replace(/"/g, '\\"').replace(/'/g, "\\'");
          return `"${escaped}"`;
        })
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing quotes around keys
        .replace(/(\w+)(\s*:)/g, '"$1"$2');
      
      return JSON.parse(jsonStr);
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Try to construct valid JSON from content
  try {
    // Look for key patterns and try to build a basic structure
    const hookMatch = content.match(/hook['":\s]*['"]([^'"]*)['"]/i);
    const titleMatches = content.match(/title['":\s]*['"]([^'"]*)['"]/gi);
    
    if (hookMatch || titleMatches) {
      const fallbackStructure = {
        hook: hookMatch ? hookMatch[1] : "Newsletter Update",
        mainSections: titleMatches ? titleMatches.slice(0, 3).map((match, i) => ({
          title: match.match(/['"]([^'"]*)['"]/)?.[1] || `Section ${i + 1}`,
          image: null,
          dualPerspective: {
            columnA: { header: "Analysis", points: ["Key insight 1", "Key insight 2"] },
            columnB: { header: "Context", points: ["Supporting detail 1", "Supporting detail 2"] }
          },
          synthesis: "This section provides comprehensive analysis of the trending topics."
        })) : [],
        quickInsights: [
          {
            title: "Key Takeaway",
            summary: "Important insights from the analyzed content.",
            quote: null,
            image: null
          }
        ]
      };
      return fallbackStructure;
    }
  } catch {
    // Final fallback
  }

  throw new Error("Unable to extract valid JSON from OpenAI response");
};

// Helper function to convert text to proper HTML formatting with visual breaks
const formatTextForHTML = (text: string): string => {
  if (!text) return '';
  
  // Split long text into paragraphs for better readability
  const sentences = text.split(/[.!?]+/);
  let formattedText = '';
  let currentParagraph = '';
  
  sentences.forEach((sentence, index) => {
    sentence = sentence.trim();
    if (sentence.length === 0) return;
    
    currentParagraph += sentence + '. ';
    
    // Create paragraph breaks every 2-3 sentences or at natural breaks
    if ((index + 1) % 3 === 0 || sentence.includes('**') || currentParagraph.length > 300) {
      formattedText += `<p style="margin: 0 0 1.2em 0; line-height: 1.7; font-size: 16px; color: #201f42; font-family: 'Inter', sans-serif;">${currentParagraph.trim()}</p>`;
      currentParagraph = '';
    }
  });
  
  // Add any remaining text
  if (currentParagraph.trim()) {
    formattedText += `<p style="margin: 0 0 1.2em 0; line-height: 1.7; font-size: 16px; color: #201f42; font-family: 'Inter', sans-serif;">${currentParagraph.trim()}</p>`;
  }
  
  return formattedText
    // Convert markdown bold to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #01caa6;">$1</strong>')
    // Fix any double periods
    .replace(/\.\./g, '.');
};

// Helper function to split long synthesis text into visual sections
const createVisualSections = (synthesis: string): string => {
  const sections = synthesis.split(/\*\*(.*?)\*\*/);
  let result = '';
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    if (i % 2 === 1) {
      // This is a header (was between **)
      result += `
        <div style="background-color: #f8fbf7; padding: 16px; margin: 16px 0; border-left: 4px solid #01caa6; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; color: #01caa6; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600;">${section}</h4>
        </div>`;
    } else {
      // Regular text content
      result += formatTextForHTML(section);
    }
  }
  
  return result || formatTextForHTML(synthesis);
};

// Clean HTML template with placeholders for dynamic content
const getNewsletterHTML = (data: any) => {
  const { hook, mainSections, quickInsights, date } = data;
  
  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
	<title>Newsletter from LetterNest</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!--[if mso]>
	<xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
	<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
	<![endif]-->
	<!--[if !mso]><!-->
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Work+Sans:wght@700&display=swap" rel="stylesheet" type="text/css">
	<!--<![endif]-->
	<style>
		* { box-sizing: border-box; }
		body { margin: 0; padding: 0; }
		a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
		#MessageViewBody a { color: inherit; text-decoration: none; }
		p { line-height: inherit }
		.desktop_hide, .desktop_hide table { mso-hide: all; display: none; max-height: 0px; overflow: hidden; }
		.image_block img+div { display: none; }
		sup, sub { font-size: 75%; line-height: 0; }
		
		@media (max-width:620px) {
			.desktop_hide table.icons-inner { display: inline-block !important; }
			.icons-inner { text-align: center; }
			.icons-inner td { margin: 0 auto; }
			.mobile_hide { display: none; }
			.row-content { width: 100% !important; }
			.stack .column { width: 100%; display: block; }
			.mobile_hide { min-height: 0; max-height: 0; max-width: 0; overflow: hidden; font-size: 0px; }
			.desktop_hide, .desktop_hide table { display: table !important; max-height: none !important; }
		}
	</style>
</head>

<body class="body" style="background-color: #f6f6f6; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6;">
		<tbody>
			<tr>
				<td>
					<!-- Header Spacer -->
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #201f42; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top;">
													<div class="spacer_block block-1" style="height:6px;line-height:6px;font-size:1px;">&#8202;</div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>

					<!-- Main Hook Section -->
					<table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8fbf7; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 24px; padding-left: 24px; padding-right: 24px; padding-top: 24px; vertical-align: top;">
													<table class="heading_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h1 style="margin: 0; color: #01caa6; direction: ltr; font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 34px;">
																	<span style="word-break: break-word;">Newsletter Update</span>
																	<br><span style="word-break: break-word; color: #515151; font-size: 16px;">${date}</span>
																</h1>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#201f42;direction:ltr;font-family:'Inter', sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.8;text-align:left;mso-line-height-alt:29px;">
																	<p style="margin: 0;">${hook}</p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>

					${mainSections.map((section: any, index: number) => `
					<!-- Main Section ${index + 1} -->
					<table class="row" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 24px; padding-right: 24px; padding-top: 32px; vertical-align: top;">
													${section.image ? `
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;">
																<div class="alignment" align="center">
																	<div style="max-width: 552px;"><img src="${section.image}" style="display: block; height: auto; border: 0; width: 100%; max-height: 300px; object-fit: cover;" width="552" alt="${section.title}" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													` : ''}
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #201f42; direction: ltr; font-family: 'Inter', sans-serif; font-size: 23px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 28px;">
																	<span style="word-break: break-word;">${section.title}</span>
																</h2>
															</td>
														</tr>
													</table>
													
													<!-- Dual Perspective Table -->
													${section.dualPerspective ? `
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<table width="100%" border="1" cellpadding="12" cellspacing="0" style="border-collapse: collapse; border: 2px solid #01caa6; border-radius: 8px; margin: 16px 0;">
																	<tr style="background-color: #f8fbf7;">
																		<th style="border: 1px solid #01caa6; padding: 15px; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #201f42; text-align: left; width: 50%;">
																			${section.dualPerspective.columnA.header}
																		</th>
																		<th style="border: 1px solid #01caa6; padding: 15px; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #201f42; text-align: left; width: 50%;">
																			${section.dualPerspective.columnB.header}
																		</th>
																	</tr>
																	<tr>
																		<td style="border: 1px solid #01caa6; padding: 15px; font-family: 'Inter', sans-serif; font-size: 15px; color: #201f42; vertical-align: top; line-height: 1.6;">
																			<ul style="margin: 0; padding-left: 18px; list-style-type: disc;">
																				${section.dualPerspective.columnA.points.map((point: string) => `<li style="margin-bottom: 10px; line-height: 1.6;">${point}</li>`).join('')}
																			</ul>
																		</td>
																		<td style="border: 1px solid #01caa6; padding: 15px; font-family: 'Inter', sans-serif; font-size: 15px; color: #201f42; vertical-align: top; line-height: 1.6;">
																			<ul style="margin: 0; padding-left: 18px; list-style-type: disc;">
																				${section.dualPerspective.columnB.points.map((point: string) => `<li style="margin-bottom: 10px; line-height: 1.6;">${point}</li>`).join('')}
																			</ul>
																		</td>
																	</tr>
																</table>
															</td>
														</tr>
													</table>
													` : ''}
													
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding: 20px 10px;">
																<div style="color:#201f42;direction:ltr;font-family:'Inter', sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.7;text-align:left;">
																	${createVisualSections(section.synthesis)}
																</div>
															</td>
														</tr>
													</table>
													
													<!-- Section Divider -->
													<table class="divider_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding: 10px;">
																<div style="background-color: #e8f5f3; height: 2px; width: 100%; margin: 20px 0;"></div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					`).join('')}

					<!-- Quick Insights Section -->
					<table class="row" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #01caa6; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 20px; padding-right: 20px; padding-top: 32px; vertical-align: top;">
													<table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;text-align:center;width:100%;">
																<h3 style="margin: 0; color: #ffffff; direction: ltr; font-family: 'Inter', sans-serif; font-size: 17px; font-weight: 400; letter-spacing: normal; line-height: 1.5; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 26px;">
																	<span style="word-break: break-word;">QUICK INSIGHTS</span>
																</h3>
															</td>
														</tr>
													</table>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h3 style="margin: 0; color: #ffffff; direction: ltr; font-family: 'Inter', sans-serif; font-size: 23px; font-weight: 700; letter-spacing: normal; line-height: 1.5; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 35px;">
																	<span style="word-break: break-word;">Key Takeaways & Additional Context</span>
																</h3>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>

					${quickInsights.map((insight: any, index: number) => `
					<!-- Quick Insight ${index + 1} -->
					<table class="row" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #01caa6; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 16px; padding-left: 20px; padding-right: 20px; padding-top: 16px; vertical-align: top;">
													<table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-left:10px;padding-right:10px;text-align:left;width:100%;">
																<h3 style="margin: 0; color: #ffffff; direction: ltr; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 22px;">
																	<span style="word-break: break-word;">${insight.title}</span>
																</h3>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;">
																<div style="color:#201f42;direction:ltr;font-family:'Inter', sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.7;text-align:left;">
																	${formatTextForHTML(insight.summary)}
																</div>
															</td>
														</tr>
													</table>
													${insight.quote ? `
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:'Inter', sans-serif;font-size:14px;font-weight:400;letter-spacing:0px;line-height:1.6;text-align:left;mso-line-height-alt:22px; font-style: italic; border-left: 3px solid #ffffff; padding-left: 15px;">
																	<p style="margin: 0;">"${insight.quote}"</p>
																</div>
															</td>
														</tr>
													</table>
													` : ''}
												</td>
												<td class="column column-2" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													${insight.image ? `
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-top:15px;width:100%;">
																<div class="alignment" align="center">
																	<div style="max-width: 280px;"><img src="${insight.image}" style="display: block; height: auto; border: 0; width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;" width="280" alt="${insight.title}" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													` : ''}
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					`).join('')}

					<!-- Spacer -->
					<table class="row" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #01caa6; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-left: 20px; padding-right: 20px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:32px;line-height:32px;font-size:1px;">&#8202;</div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>

					<!-- Footer -->
					<table class="row" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-top: 15px; vertical-align: top;">
													<table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
																<div style="color:#666666;direction:ltr;font-family:'Inter', sans-serif;font-size:12px;font-weight:400;letter-spacing:0px;line-height:1.5;text-align:center;mso-line-height-alt:18px;">
																	<p style="margin: 0;">Powered by <strong style="color: #01caa6;">LetterNest</strong><br>
																	Professional Newsletter Generation</p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
	</table>
</body>
</html>`;
};

async function generateNewsletter(
  userId: string,
  selectedCount: number,
  jwt: string,
) {
  try {
    // 1) Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2) Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle",
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // 3) Subscription & plan & tokens checks
    if (!profile.subscription_tier) {
      throw new Error(
        "You must have an active subscription to generate newsletters",
      );
    }
    if (
      !profile.remaining_newsletter_generations ||
      profile.remaining_newsletter_generations <= 0
    ) {
      throw new Error("You have no remaining newsletter generations");
    }
    if (!profile.twitter_bookmark_access_token) {
      throw new Error(
        "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings.",
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < now
    ) {
      throw new Error(
        "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks.",
      );
    }

    // 4) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(
          `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(
            cleanHandle,
          )}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": "twitter293.p.rapidapi.com",
            },
          },
        );
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase.from("profiles")
            .update({
              numerical_id: numericalId,
            }).eq("id", userId);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error(
            "Could not retrieve your Twitter ID. Please try again later.",
          );
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        throw new Error(
          "Could not retrieve your Twitter ID. Please try again later.",
        );
      }
    }
    if (!numericalId) {
      throw new Error(
        "Could not determine your Twitter ID. Please update your Twitter handle in settings.",
      );
    }

    // 5) Fetch bookmarks
    logStep("Fetching bookmarks", { count: selectedCount, userId: numericalId });
    const bookmarksResp = await fetch(
      `https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!bookmarksResp.ok) {
      const text = await bookmarksResp.text();
      console.error(`Twitter API error (${bookmarksResp.status}):`, text);
      if (bookmarksResp.status === 401) {
        throw new Error(
          "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.",
        );
      }
      if (bookmarksResp.status === 429) {
        throw new Error(
          "Twitter API rate limit exceeded. Please try again later.",
        );
      }
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) {
        throw new Error(
          "You don't have any bookmarks. Please save some tweets before generating a newsletter.",
        );
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t: any) => t.id);
    logStep("Successfully fetched bookmarks", { count: tweetIds.length });

    // 6) Fetch detailed tweets via Apify
    logStep("Fetching detailed tweet data via Apify");
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
      throw new Error("Missing APIFY_API_KEY environment variable");
    }
    const apifyResp = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "filter:blue_verified": false,
          "filter:consumer_video": false,
          "filter:has_engagement": false,
          "filter:hashtags": false,
          "filter:images": false,
          "filter:links": false,
          "filter:media": false,
          "filter:mentions": false,
          "filter:native_video": false,
          "filter:nativeretweets": false,
          "filter:news": false,
          "filter:pro_video": false,
          "filter:quote": false,
          "filter:replies": false,
          "filter:safe": false,
          "filter:spaces": false,
          "filter:twimg": false,
          "filter:videos": false,
          "filter:vine": false,
          lang: "en",
          maxItems: selectedCount,
          tweetIDs: tweetIds,
        }),
      },
    );
    if (!apifyResp.ok) {
      const text = await apifyResp.text();
      console.error(`Apify API error (${apifyResp.status}):`, text);
      throw new Error(`Apify API error: ${apifyResp.status}`);
    }
    const apifyData = await apifyResp.json();
    logStep("Successfully fetched detailed tweet data", {
      tweetCount: apifyData.length || 0,
    });

    // 7) Format tweets for OpenAI
    function parseToOpenAI(data: any) {
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      let out = "";
      arr.forEach((t, i) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {
        }
        const photo = t.extendedEntities?.media?.find(
          (m: any) => m.type === "photo",
        )?.media_url_https;
        out +=
          `Tweet ${i + 1}\nID: ${t.id}\nText: ${txt}\nReplies: ${
            t.replyCount || 0
          }\nLikes: ${t.likeCount || 0}\nImpressions: ${
            t.viewCount || 0
          }\nDate: ${dateStr}\nAuthor: ${
            t.author?.name || "Unknown"
          }\nPhotoUrl: ${photo || "N/A"}\n`;
        if (i < arr.length - 1) out += "\n---\n\n";
      });
      return out;
    }
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 8) Call OpenAI for main analysis with improved prompt
    logStep("Calling OpenAI for Twin Focus analysis");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const analysisSystemPrompt =
      `You are an expert content strategist for newsletter creation. Your task is to analyze a collection of tweets and organize them into a structured format for a professional newsletter layout.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown formatting, no code blocks. Just pure JSON.

RESPONSE FORMAT (EXACT JSON STRUCTURE):
{
  "hook": "A compelling 1-2 sentence opener",
  "mainSections": [
    {
      "title": "Main section title",
      "image": null,
      "dualPerspective": {
        "columnA": {
          "header": "Dynamic column header",
          "points": ["point 1", "point 2", "point 3"]
        },
        "columnB": {
          "header": "Dynamic column header", 
          "points": ["point 1", "point 2", "point 3"]
        }
      },
      "synthesis": "300-500 word comprehensive synthesis connecting both perspectives"
    }
  ],
  "quickInsights": [
    {
      "title": "Insight title",
      "summary": "100-150 word detailed summary",
      "quote": null,
      "image": null
    }
  ]
}

REQUIREMENTS:
- RESPOND WITH PURE JSON ONLY
- 3-4 main sections with dual perspectives
- 2-3 quick insights
- Set image values to null (no image URLs)
- NO direct tweet quotes, IDs, or authors
- Conversational, accessible tone
- Focus on balanced, comparative analysis
- Generate meaningful column headers based on content
- Synthesis sections should be comprehensive (300-500 words each)
- Quick insight summaries should be detailed (100-150 words each)
- Use proper JSON string escaping for quotes and special characters`;

    const analysisUserPrompt =
      `Analyze the following tweet collection and generate a structured JSON response for the newsletter:

${formattedTweets}`;

    let analysisResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        logStep(`OpenAI API call attempt ${retryCount + 1}`);
        
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: analysisSystemPrompt },
              { role: "user", content: analysisUserPrompt },
            ],
            temperature: 0.3,
            max_tokens: 12000,
          }),
        });
        
        if (!openaiRes.ok) {
          const txt = await openaiRes.text();
          console.error(`OpenAI API error (${openaiRes.status}):`, txt);
          throw new Error(`OpenAI API error: ${openaiRes.status}`);
        }
        
        const openaiJson = await openaiRes.json();
        const rawContent = openaiJson.choices[0].message.content.trim();
        
        logStep("Raw OpenAI response received", { 
          length: rawContent.length,
          preview: rawContent.substring(0, 200) + "..."
        });
        
        // Use enhanced JSON extraction
        analysisResult = extractAndParseJSON(rawContent);
        logStep("Successfully parsed OpenAI JSON response");
        break;
        
      } catch (parseError) {
        retryCount++;
        console.error(`JSON parsing attempt ${retryCount} failed:`, parseError);
        
        if (retryCount >= maxRetries) {
          logStep("All JSON parsing attempts failed, using fallback structure");
          // Provide a basic fallback structure
          analysisResult = {
            hook: "Stay updated with the latest insights from your saved content.",
            mainSections: [
              {
                title: "Key Insights from Your Bookmarks",
                image: null,
                dualPerspective: {
                  columnA: {
                    header: "Main Points",
                    points: ["Important trends identified", "Key developments noted", "Emerging patterns observed"]
                  },
                  columnB: {
                    header: "Context",
                    points: ["Market implications", "Industry impact", "Future considerations"]
                  }
                },
                synthesis: "This newsletter compilation highlights the most significant themes from your recent bookmark activity. The content reflects current market trends and important developments that warrant attention. These insights provide valuable context for understanding the broader landscape of topics you're following."
              }
            ],
            quickInsights: [
              {
                title: "Notable Trend",
                summary: "A significant pattern has emerged from your bookmark collection, indicating important shifts in the topics you're tracking. This development suggests continued evolution in the areas of your interest.",
                quote: null,
                image: null
              }
            ]
          };
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    logStep("Successfully generated Twin Focus analysis");

    // 9) Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const focusesToEnrich = analysisResult.mainSections.slice(0, 3); // Take first 3 main sections
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (PERPLEXITY_API_KEY && focusesToEnrich.length > 0) {
      logStep("Making Perplexity API calls for web enrichment", {
        focusCount: focusesToEnrich.length,
      });
      
      for (const focus of focusesToEnrich) {
        try {
          const searchQuery = `${focus.title} latest news trends analysis`;
          const perplexityRes = await fetch(
            "https://api.perplexity.ai/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              },
              body: JSON.stringify({
                model: "sonar-pro",
                messages: [{ role: "user", content: searchQuery }],
                temperature: 0.2,
                max_tokens: 1000,
              }),
            },
          );
          if (perplexityRes.ok) {
            const data = await perplexityRes.json();
            const webContent = data.choices[0].message.content;
            
            // Enhance synthesis with web content (full length, no truncation)
            focus.synthesis += `\n\n**Broader Context Online:** ${webContent}`;
            logStep(`Successfully enriched focus: ${focus.title}`);
          }
        } catch (err) {
          console.error(`Perplexity fetch failed for "${focus.title}":`, err);
        }
      }
    }

    // 10) Generate HTML email
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const emailHtml = getNewsletterHTML({
      hook: analysisResult.hook,
      mainSections: analysisResult.mainSections,
      quickInsights: analysisResult.quickInsights,
      date: currentDate
    });

    logStep("Generated HTML newsletter with new template");

    // 11) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") ||
        "newsletter@newsletters.letternest.ai";
      const emailSubject = "Twin Focus: Your Newsletter from LetterNest";
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`,
        to: profile.sending_email,
        subject: emailSubject,
        html: emailHtml,
        text: `${analysisResult.hook}\n\n${analysisResult.mainSections.map((s: any) => `${s.title}\n${s.synthesis}`).join('\n\n')}`,
      });
      if (emailError) {
        console.error("Error sending email with Resend:", emailError);
        throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
      }
      logStep("Twin Focus Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 12) Save the newsletter to newsletter_storage table
    try {
      const markdownContent = `# Newsletter Update - ${currentDate}\n\n${analysisResult.hook}\n\n${analysisResult.mainSections.map((s: any) => `## ${s.title}\n\n${s.synthesis}`).join('\n\n')}`;
      
      const { error: storageError } = await supabase.from("newsletter_storage")
        .insert({
          user_id: userId,
          markdown_text: markdownContent,
        });
      if (storageError) {
        console.error(
          "Failed to save Twin Focus newsletter to storage:",
          storageError,
        );
      } else {
        logStep("Twin Focus Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving Twin Focus newsletter to storage:", storageErr);
    }

    // 13) Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({
        remaining_newsletter_generations: newCount,
      }).eq("id", userId);
      if (updateError) {
        console.error("Failed to update remaining generations:", updateError);
      } else {
        logStep("Updated remaining generations count", { newCount });
      }
    }

    // Final log & response data
    const timestamp = new Date().toISOString();
    logStep("Twin Focus newsletter generation successful", {
      userId,
      timestamp,
      tweetCount: selectedCount,
      remainingGenerations:
        profile.remaining_newsletter_generations > 0
          ? profile.remaining_newsletter_generations - 1
          : 0,
    });
    return {
      status: "success",
      message:
        "Twin Focus newsletter generated and sent successfully.",
      remainingGenerations:
        profile.remaining_newsletter_generations > 0
          ? profile.remaining_newsletter_generations - 1
          : 0,
      data: {
        analysisResult: analysisResult,
        timestamp,
      },
    };
  } catch (error) {
    console.error(
      "Error in background Twin Focus newsletter generation process:",
      error,
    );
    return {
      status: "error",
      message:
        (error as Error).message || "Internal server error during Twin Focus generation",
    };
  }
}

serve(
  async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      logStep("Starting Twin Focus newsletter generation process (HTTP)");
      const { selectedCount } = await req.json();
      if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
        return new Response(
          JSON.stringify({
            error: "Invalid selection. Please choose 10, 20, or 30 tweets.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        jwt,
      );
      if (userError || !user) {
        console.error("Authentication error:", userError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const backgroundTask = generateNewsletter(user.id, selectedCount, jwt);
      // @ts-ignore EdgeRuntime provided in Deno Deploy / Vercel Edge functions
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask);
      } else {
        backgroundTask.then((result) => {
          logStep("Background task completed (local/fallback)", result);
        }).catch((err) => {
          console.error("Background task error (local/fallback):", err);
        });
      }
      return new Response(
        JSON.stringify({
          status: "processing",
          message:
            "Your Twin Focus newsletter generation has started. You will receive an email when it's ready.",
        }),
        {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error in Twin Focus newsletter generation function:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
);
