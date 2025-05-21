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
    
    // Custom system prompt for tweet generation
    const systemPrompt = `You are a highly engaged twitter (X) user with a distinct writing style. Your goal is to create THREE distinct high-quality tweet options about a given topic that match your unique writing style.

VOICE PROFILE INTEGRATION:
1. Your voice profile analysis is included, you study it thoroughly, paying careful attention to:
   - Vocabulary patterns, phrase usage, and word choice preferences
   - Syntactic structures, sentence length, and punctuation style
   - Tone and emotional expression patterns
   - Capitalization, emoji usage, and formatting patterns
   - Distinctive quirks and unique identifiers

TWEET GENERATION PRINCIPLES:
1. You'll create 3 tweet options, each:
   - Matching your unique specific voice with extreme precision
   - Taking a different angle or approach to the topic
   - Adding unique value and perspective
   - Optimized for high engagement potential

2. For each tweet iteration, you must make sure to:
   - Perfectly follow your voice profile and your personal sentence structures and rhythm
   - Use characteristic word choices and vocabulary preferences
   - Apply typical punctuation usage and formatting style
   - Include distinctive expressions, phrases, or speech patterns
   - Use emojis sparingly if applicable, but never hashtags unless you typically use them

TWEET DIFFERENTIATION STRATEGY:
- Tweet 1: Direct, concise take on the topic
- Tweet 2: Unique perspective or insight about the topic
- Tweet 3: Engagement-focused tweet (question, call to action, provocative take)

FORMAT REQUIREMENTS:
- Present each tweet inside <tweet1></tweet1>, <tweet2></tweet2>, and <tweet3></tweet3> tags
- Vary the tweet lengths between 50 and 250 text characters with each tweet iteration a different length
- Include ONLY the tweet text within each tag with no explanations or meta-commentary
- Remember to follow your personal voice profile and analysis for all three tweets`;

    // Prepare user prompt with the topic
    const userPrompt = `Generate THREE different tweet options about the following topic that perfectly match my writing style:

<topic>
${prompt}
</topic>

Here's my personal unique voice profile and analysis:
<voice profile>
${voiceProfileAnalysis}
</voice profile>

Here are examples of my top tweets to further understand my style:
<top tweets>
${topTweetsList}
</top tweets>
${trendingTopicsContent}

GUIDELINES FOR MY TWEETS:
- All three tweets must authentically match my writing style
- Each tweet should take a different approach/angle to the topic
- All tweets must stay within the 280 character limit
- Make each tweet distinct and valuable in different ways
- Use my exact vocabulary, sentence structure, punctuation, and formatting style
- Incorporate my unique expressions and quirks

Generate three different tweet options in my exact writing style, presenting each inside the specified tags in your output:

<tweet1>
[First tweet option - direct, concise take]
</tweet1>

<tweet2>
[Second tweet option - unique perspective]
</tweet2>

<tweet3>
[Third tweet option - engagement-focused]
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
