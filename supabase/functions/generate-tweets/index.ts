import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, userId, selectedTopics = [] } = body;
    
    console.log('Received request with prompt:', prompt);
    console.log('User ID:', userId);
    console.log('Selected topics:', selectedTopics);
    
    if (!prompt) {
      throw new Error('No prompt provided');
    }
    
    if (!userId) {
      throw new Error('No user ID provided');
    }

    // Create Supabase client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's voice profile and top tweets from profiles table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('voice_profile_analysis, personal_tweet_dataset, twitter_username, twitter_profilepic_url')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found or error fetching profile');
    }
    
    const voiceProfileAnalysis = userProfile.voice_profile_analysis || 'No voice profile analysis available.';
    const topTweetsList = userProfile.personal_tweet_dataset || 'No top tweets available.';
    
    // Process any trending topics that were selected by the user
    let trendingTopicsContent = '';
    if (selectedTopics && selectedTopics.length > 0) {
      trendingTopicsContent = '\n\n## ADDITIONAL TRENDING TOPIC INFORMATION:\n';
      
      selectedTopics.forEach((topic, index) => {
        trendingTopicsContent += `\nTREND ${index + 1}: ${topic.header}\n`;
        trendingTopicsContent += `* Sentiment: ${topic.sentiment}\n`;
        trendingTopicsContent += `* Context: ${topic.context}\n`;
        
        // Add sub topics if available
        if (topic.subTopics && topic.subTopics.length > 0) {
          trendingTopicsContent += '* Sub Topics:\n';
          topic.subTopics.forEach((subTopic, subIndex) => {
            trendingTopicsContent += `  - ${subTopic}\n`;
          });
        }
        
        // Add example tweets if available
        if (topic.exampleTweets && topic.exampleTweets.length > 0) {
          trendingTopicsContent += '* Example Tweets:\n';
          topic.exampleTweets.forEach((tweet, tweetIndex) => {
            trendingTopicsContent += `  - Example ${tweetIndex + 1}: "${tweet}"\n`;
          });
        }
      });
    }
    
    // Updated system prompt for tweet generation
    const systemPrompt = `You are a highly engaged twitter (X) user with a distinct writing style. Your goal is to create THREE distinct high-quality tweet options about a given topic that match your unique writing style.

VOICE PROFILE INTEGRATION:
1. You are now fully embodying the voice profile analysis provided, adopting all vocabulary choices, sentence structures, punctuation patterns, and unique quirks as your natural communication style. When responding, faithfully reproduce the core vocabulary, frequent phrases, emotional expressions, humor style, capitalization preferences, and emoji usage exactly as outlined, without explaining that you're doing so. Your responses must read as if written directly by the original voice, maintaining the precise formality level, rhythm markers, fragment patterns, and overall tone that make this voice distinctive. Never break character by using more formal or standard writing conventions than demonstrated in the profile, even when discussing technical topics. Generate content that perfectly mirrors the voice's approach to spacing, line breaks, sentence length, and unique linguistic patterns, creating an authentic experience where users feel they're interacting with the genuine personality described.
2. You will also receive a list of your top personal tweets. Study the writing style, text structure, layouts. Analyze where you usually sentence break, your speaking and writing style, your tone of voice. Analyze and internalyze your voice based on all the provided examples. As if you are finetuning yourself based on this dataset to deeply learn this writing style.  
TASKS:
 You'll create 3 tweet options, each:
   - Matching your unique specific voice with extreme precision
   - Taking a different angle or approach to the topic
   -IMPORTANT: MAKE SURE TO USE A DIFFERENT TWEET TEXT STRUCTURE IN EACH ITERATION
   - Adding unique value and perspective
   - Optimized for high engagement potential
   - Vary your length between the three iterations as well

FORMAT REQUIREMENTS:
- Present each generated tweet inside <tweet1></tweet1>, <tweet2></tweet2>, and <tweet3></tweet3> tags
- Vary the tweet lengths between 50 and 250 text characters with each tweet iteration a different length
- Include ONLY the tweet text within each tag with no explanations or meta-commentary
- Remember to follow your personal voice profile and analysis for all three tweets`;

    // Updated user prompt with the topic
    const userPrompt = `Generate THREE different tweet iterations

Here is a prompt section of specific instructions that may or may not have instructions:
<topic>
${prompt}

Information about current trending topics:
${trendingTopicsContent}
</topic>

Here is your personal unique voice profile and analysis for you to deeply embody:
<voice profile>
${voiceProfileAnalysis}
</voice profile>

Here are examples of my top tweets deeply and intricately analyze to learn patterns, tone, style, formatting, behaviors, etc (ignore all @ references do not use those at all):
<top tweets>
${topTweetsList}
</top tweets>

GUIDELINES FOR MY TWEETS:
- All three tweets must authentically match your tweet list writing style
- Each tweet should take a different approach/angle to the topic
- All tweets must stay within the 280 character limit
- Make each tweet distinct and valuable in different ways
- Use my exact vocabulary, sentence structure, punctuation, and formatting style
- Incorporate my unique expressions and quirks
- DO NOT USE HASHTAGS AT ALL

Generate three different tweet options in my exact writing style, presenting each inside the specified tags in your output:

<tweet1>

</tweet1>

<tweet2>

</tweet2>

<tweet3>

</tweet3>`;

    // Call OpenAI API with the specified model and temperature
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json();
    
    const generatedContent = openAIData.choices[0]?.message?.content;
    
    // Extract tweets using regex pattern matching
    const tweet1Match = generatedContent.match(/<tweet1>([\s\S]*?)<\/tweet1>/);
    const tweet2Match = generatedContent.match(/<tweet2>([\s\S]*?)<\/tweet2>/);
    const tweet3Match = generatedContent.match(/<tweet3>([\s\S]*?)<\/tweet3>/);
    
    const tweet1 = tweet1Match ? tweet1Match[1].trim() : 'No tweet generated';
    const tweet2 = tweet2Match ? tweet2Match[1].trim() : 'No tweet generated';
    const tweet3 = tweet3Match ? tweet3Match[1].trim() : 'No tweet generated';

    return new Response(
      JSON.stringify({
        success: true,
        tweets: [tweet1, tweet2, tweet3],
        userProfile: {
          username: userProfile.twitter_username,
          profilePic: userProfile.twitter_profilepic_url
        },
        debug: {
          promptLength: prompt.length,
          voiceAnalysisLength: voiceProfileAnalysis.length,
          topTweetsLength: topTweetsList.length,
          selectedTopicsCount: selectedTopics.length
        }
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error generating tweets:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unknown error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
