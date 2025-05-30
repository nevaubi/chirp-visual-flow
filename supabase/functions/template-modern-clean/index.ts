
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { selectedCount } = await req.json();

    // Validate selectedCount
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid selectedCount. Must be 10, 20, or 30.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Modern Clean Template: Starting newsletter generation for user ${user.id} with ${selectedCount} bookmarks`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has remaining generations
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      return new Response(
        JSON.stringify({ error: 'No remaining newsletter generations available' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has required subscription tier
    const hasRequiredTier = profile.subscription_tier === "Newsletter Standard" || 
                            profile.subscription_tier === "Newsletter Premium";
    
    if (!hasRequiredTier) {
      return new Response(
        JSON.stringify({ error: 'Subscription tier insufficient. Newsletter Standard or Premium required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Twitter bookmark tokens
    if (!profile.twitter_bookmark_access_token) {
      return new Response(
        JSON.stringify({ error: 'Twitter bookmark access not available. Please reconnect your Twitter account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrement remaining generations immediately
    const newRemainingGenerations = profile.remaining_newsletter_generations - 1;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ remaining_newsletter_generations: newRemainingGenerations })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating remaining generations:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update generation count' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Modern Clean Template: Updated remaining generations to ${newRemainingGenerations} for user ${user.id}`);

    // 6) Fetch bookmarks directly from Twitter API first
logStep("Fetching bookmarks", { count: selectedCount, userId: profile.numerical_id });
const bookmarksResp = await fetch(`https://api.twitter.com/2/users/${profile.numerical_id}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
    "Content-Type": "application/json"
  }
});

if (!bookmarksResp.ok) {
  const text = await bookmarksResp.text();
  console.error(`Twitter API error (${bookmarksResp.status}):`, text);
  
  if (bookmarksResp.status === 401) {
    throw new Error("Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.");
  }
  
  if (bookmarksResp.status === 429) {
    throw new Error("Twitter API rate limit exceeded. Please try again later.");
  }
  
  throw new Error(`Twitter API error: ${bookmarksResp.status}`);
}

const bookmarksData = await bookmarksResp.json();
if (!bookmarksData?.data) {
  console.error("Invalid or empty bookmark data:", bookmarksData);
  
  if (bookmarksData.meta?.result_count === 0) {
    throw new Error("You don't have any bookmarks. Please save some tweets before generating a newsletter.");
  }
  
  throw new Error("Failed to retrieve bookmarks from Twitter");
}

const tweetIds = bookmarksData.data.map((t) => t.id);
console.log(`Modern Clean Template: Successfully fetched bookmarks - ${tweetIds.length} tweets`);

// 7) Fetch detailed tweets via Apify using the tweet IDs
console.log('Modern Clean Template: Fetching detailed tweet data via Apify');
const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");

const apifyResp = await fetch(`https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
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
    tweetIDs: tweetIds
  })
});

if (!apifyResp.ok) {
  const text = await apifyResp.text();
  console.error(`Apify API error (${apifyResp.status}):`, text);
  throw new Error(`Apify API error: ${apifyResp.status}`);
}

const apifyData = await apifyResp.json();
console.log('Modern Clean Template: Successfully fetched detailed tweet data', { tweetCount: apifyData.length || 0 });

// 8) Format tweets for OpenAI
function parseToOpenAI(data) {
  const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  let out = "";
  
  arr.forEach((t, i) => {
    const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    let dateStr = "N/A";
    try {
      dateStr = new Date(t.createdAt).toISOString().split("T")[0];
    } catch {}
    
    const photo = t.extendedEntities?.media?.find((m) => m.type === "photo")?.media_url_https;
    
    out += `Tweet ${i + 1}\n`;
    out += `Tweet ID: ${t.id}\n`;
    out += `Tweet text: ${txt}\n`;
    out += `ReplyAmount: ${t.replyCount || 0}\n`;
    out += `LikesAmount: ${t.likeCount || 0}\n`;
    out += `Impressions: ${t.viewCount || 0}\n`;
    out += `Date: ${dateStr}\n`;
    out += `Tweet Author: ${t.author?.name || "Unknown"}\n`;
    out += `PhotoUrl: ${photo || "N/A"}\n`;
    
    if (i < arr.length - 1) out += "\n---\n\n";
  });
  
  return out;
}

const tweetsForAnalysis = parseToOpenAI(apifyData);
console.log('Modern Clean Template: Formatted tweets for analysis');

    console.log('Modern Clean Template: Starting AI analysis...');

    // AI Analysis with OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const analysisPrompt = `You are an expert content analyst. Analyze these ${selectedCount} bookmarked tweets and create a comprehensive newsletter.

TWEETS DATA:
${JSON.stringify(tweetsForAnalysis, null, 2)}

Please provide a detailed analysis in the following JSON format:
{
  "mainTopics": ["topic1", "topic2", "topic3"],
  "keyInsights": ["insight1", "insight2", "insight3"],
  "trendingThemes": ["theme1", "theme2"],
  "contentSummary": "A comprehensive summary of the content",
  "recommendedSections": [
    {
      "title": "Section Title",
      "tweets": ["tweet_id1", "tweet_id2"],
      "summary": "Why these tweets are grouped together"
    }
  ]
}

Focus on identifying patterns, themes, and valuable insights from the bookmarked content.`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst specializing in social media content curation and newsletter creation.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('OpenAI Analysis API error:', analysisResponse.status, errorText);
      throw new Error(`OpenAI Analysis API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisContent = analysisData.choices[0].message.content;

    console.log('Modern Clean Template: AI analysis completed');

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Error parsing AI analysis:', parseError);
      // Fallback analysis
      parsedAnalysis = {
        mainTopics: ["Technology", "Business", "Innovation"],
        keyInsights: ["Emerging trends in the industry", "Market developments", "Thought leadership"],
        trendingThemes: ["AI/ML", "Productivity"],
        contentSummary: "A curated collection of valuable insights from your bookmarked content.",
        recommendedSections: [
          {
            title: "Featured Insights",
            tweets: tweetsForAnalysis.slice(0, 5).map(t => t.id),
            summary: "Top insights from your bookmarks"
          }
        ]
      };
    }

    console.log('Modern Clean Template: Starting web enrichment...');

    // Web enrichment with Perplexity for additional context
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    let webEnrichment = "Additional insights not available.";
    
    if (perplexityApiKey && parsedAnalysis.mainTopics && parsedAnalysis.mainTopics.length > 0) {
      try {
        const enrichmentPrompt = `Based on these main topics: ${parsedAnalysis.mainTopics.join(', ')}, provide current market insights, recent developments, and context that would be valuable for a newsletter audience. Keep it concise and actionable.`;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a market research analyst providing current insights and context for newsletter content.'
              },
              {
                role: 'user',
                content: enrichmentPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 800
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          webEnrichment = perplexityData.choices[0].message.content;
          console.log('Modern Clean Template: Web enrichment completed');
        }
      } catch (enrichmentError) {
        console.error('Web enrichment error:', enrichmentError);
      }
    }

    console.log('Modern Clean Template: Generating newsletter content...');

    // Generate newsletter content with Modern Clean styling
    const newsletterPrompt = `Create a beautifully formatted newsletter using this analyzed content and web enrichment data.

ANALYSIS DATA:
${JSON.stringify(parsedAnalysis, null, 2)}

WEB ENRICHMENT:
${webEnrichment}

ORIGINAL TWEETS:
${JSON.stringify(tweetsForAnalysis, null, 2)}

TEMPLATE: Modern Clean
- Use clean, minimalist design principles
- Focus on plenty of white space and readable typography
- Use a simplified color palette (blacks, whites, subtle grays)
- Keep visual elements minimal and purposeful

Create a comprehensive newsletter in markdown format that includes:
1. Engaging headline and introduction
2. Well-organized sections based on the analysis
3. Key insights and takeaways
4. Selected tweet highlights with proper attribution
5. Actionable conclusions
6. Clean, professional formatting throughout

Make it informative, engaging, and valuable for the reader. Focus on insights and synthesis rather than just listing tweets.`;

    const newsletterResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert newsletter writer specializing in clean, minimalist design and compelling content curation. Create content that follows Modern Clean design principles with excellent readability and professional presentation.'
          },
          {
            role: 'user',
            content: newsletterPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      }),
    });

    if (!newsletterResponse.ok) {
      const errorText = await newsletterResponse.text();
      console.error('OpenAI Newsletter API error:', newsletterResponse.status, errorText);
      throw new Error(`OpenAI Newsletter API error: ${newsletterResponse.status}`);
    }

    const newsletterData = await newsletterResponse.json();
    const newsletterMarkdown = newsletterData.choices[0].message.content;

    console.log('Modern Clean Template: Newsletter content generated');

    // Enhanced UI/UX generation for Modern Clean template
    const enhancedPrompt = `Transform this newsletter into a beautifully designed HTML email with Modern Clean aesthetics:

NEWSLETTER CONTENT:
${newsletterMarkdown}

MODERN CLEAN DESIGN REQUIREMENTS:
- Minimalist design with plenty of white space
- Clean typography hierarchy
- Simplified color palette (primary: #000000, secondary: #666666, accent: #f8f9fa)
- Maximum width: 600px for email compatibility
- Professional, readable layout
- Subtle borders and spacing
- No unnecessary visual elements
- Focus on content readability

Create a complete HTML email template with:
1. Inline CSS for email compatibility
2. Responsive design principles
3. Clean, modern typography
4. Proper spacing and hierarchy
5. Professional header and footer
6. Modern Clean aesthetic throughout

Output only the complete HTML code ready for email sending.`;

    const enhancedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email designer specializing in Modern Clean aesthetics and HTML email development. Create beautiful, minimalist designs with excellent email client compatibility.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!enhancedResponse.ok) {
      const errorText = await enhancedResponse.text();
      console.error('OpenAI Enhanced API error:', enhancedResponse.status, errorText);
      throw new Error(`OpenAI Enhanced API error: ${enhancedResponse.status}`);
    }

    const enhancedData = await enhancedResponse.json();
    let newsletterHtml = enhancedData.choices[0].message.content;

    // Clean up HTML if it has markdown code blocks
    if (newsletterHtml.includes('```html')) {
      newsletterHtml = newsletterHtml.replace(/```html\n?/, '').replace(/\n?```$/, '');
    }

    console.log('Modern Clean Template: Enhanced HTML newsletter generated');

    // Store the newsletter
    const { data: storedNewsletter, error: storageError } = await supabase
      .from('newsletter_storage')
      .insert({
        user_id: user.id,
        markdown_text: newsletterMarkdown
      })
      .select()
      .single();

    if (storageError) {
      console.error('Error storing newsletter:', storageError);
      throw new Error('Failed to store newsletter');
    }

    console.log('Modern Clean Template: Newsletter stored in database');

    // Send email if user has sending email configured
    if (profile.sending_email) {
      console.log('Modern Clean Template: Sending newsletter email...');
      
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
      } else {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Letternest <newsletters@letternest.com>',
              to: [profile.sending_email],
              subject: `Your Modern Clean Newsletter - ${new Date().toLocaleDateString()}`,
              html: newsletterHtml,
            }),
          });

          if (emailResponse.ok) {
            console.log('Modern Clean Template: Newsletter email sent successfully');
          } else {
            const emailError = await emailResponse.text();
            console.error('Email sending error:', emailError);
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }
      }
    }

    console.log('Modern Clean Template: Newsletter generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Modern Clean newsletter generated successfully',
        newsletterId: storedNewsletter.id,
        remainingGenerations: newRemainingGenerations
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Modern Clean Template Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred during Modern Clean template generation' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
