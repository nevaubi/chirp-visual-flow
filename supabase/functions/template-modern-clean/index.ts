
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

    // Fetch bookmarks using Apify
    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    if (!apifyApiKey) {
      throw new Error('APIFY_API_KEY not configured');
    }

    console.log('Modern Clean Template: Fetching bookmarks from Twitter API...');
    
    const apifyInput = {
      "startUrls": [
        {
          "url": `https://api.twitter.com/2/users/${profile.numerical_id}/bookmarks?max_results=${selectedCount}&tweet.fields=created_at,author_id,public_metrics,context_annotations,entities&expansions=author_id&user.fields=username,name,verified,profile_image_url,public_metrics`
        }
      ],
      "maxRequestRetries": 3,
      "requestTimeoutSecs": 30,
      "headers": {
        "Authorization": `Bearer ${profile.twitter_bookmark_access_token}`
      }
    };

    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/apify~twitter-url-scraper/run-sync-get-dataset-items?token=${apifyApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apifyInput),
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('Apify API error:', apifyResponse.status, errorText);
      throw new Error(`Apify API error: ${apifyResponse.status}`);
    }

    const apifyData = await apifyResponse.json();
    console.log('Modern Clean Template: Apify response received, items count:', apifyData.length);

    if (!apifyData || apifyData.length === 0) {
      throw new Error('No data received from Apify');
    }

    // Parse the response
    let bookmarksData;
    try {
      const responseItem = apifyData[0];
      if (responseItem && responseItem.response) {
        bookmarksData = JSON.parse(responseItem.response);
      } else {
        throw new Error('Invalid response structure from Apify');
      }
    } catch (parseError) {
      console.error('Error parsing Apify response:', parseError);
      throw new Error('Failed to parse bookmark data');
    }

    if (!bookmarksData.data || bookmarksData.data.length === 0) {
      throw new Error('No bookmarks found in the response');
    }

    console.log(`Modern Clean Template: Found ${bookmarksData.data.length} bookmarks`);

    // Process tweets and users
    const tweets = bookmarksData.data;
    const users = bookmarksData.includes?.users || [];
    
    // Create a user lookup map
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, user);
    });

    // Enrich tweets with user data
    const enrichedTweets = tweets.map(tweet => {
      const author = userMap.get(tweet.author_id);
      return {
        ...tweet,
        author: author || { username: 'unknown', name: 'Unknown User' }
      };
    });

    console.log('Modern Clean Template: Enriched tweets with user data');

    // Prepare tweets for AI analysis
    const tweetsForAnalysis = enrichedTweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      author: tweet.author.username,
      authorName: tweet.author.name,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      entities: tweet.entities
    }));

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
