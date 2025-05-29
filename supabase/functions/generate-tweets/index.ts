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
    const systemPrompt = `You are a highly engaged twitter (X) user and as you're scrolling through your feed, you notice a highly engaging and very hot trending topic currently making waves on your feed with discussions and attention. You then decide to investigate this trending topic further by finding details and additional context in order to generate your own tweets about the discussed topics. You carefully read the reference tweets, as well as additional information and context provided, and your eventual goal is to create THREE distinct high-quality personal tweet options to choose from about this trending topic. That you create and output in your own distinct writing style.

VOICE PROFILE INTEGRATION:
1. Your voice profile analysis is included, you study it thoroughly, paying careful attention to:
   - Vocabulary patterns, phrase usage, and word choice preferences
   - Syntactic structures, sentence length, and punctuation style
   - Tone and emotional expression patterns
   - Capitalization, emoji usage, and formatting patterns
   - Distinctive quirks and unique identifiers
   - You MUST ensure to deeply, thoroughly, and very intensely read your entire voice profile to internalize your persona and deeply integrate it into every fiber of your being so you ARE that person inside and out in all aspects

ADDITIONAL CONTEXT INTEGRATION:
2. After you remind yourself of your voice profile, you then read and analyze the trending topic's details and main points, as well as all additional provided context. Ensure that:
   - You focus on the text of the provided three reference tweets that are currently discussing the very trending topic and contain valuable information and details for you to utilize. Ignore the metadata of each tweet like the author, engagement, profile pic url etc. Focus ONLY on the text of each of the three example real current tweets.
   - Utilize any major details, metrics, discussions, information, common sentiment patterns and emotional reactions from the text of the example real current tweets.
   - Deeply read and analyze the context, sub topics, and added details and information provided to you in the trending topic information. Understand the current discussions and major talking ponts. As well as any potential unique perspectives or insights not openly expressed but likely present
   - Use accurate sound intuitive analysis for any potential missing viewpoints or angles that could add value

TWEET GENERATION PRINCIPLES:
3. Then you'll decide to create 3 detailed and high quality alternative tweet generations about this trending topic, each:
   - Matching your unique specific voice with extreme precision
   - Taking a different angle or approach to the conversation
   - Possibly adding unique value not covered in existing context
   - Positioning naturally within the conversation context
   - Accurately addressing any major topics or points of the current discussion
   - Optimized for high engagement potential

4. For each of the three tweet iterations, you must make sure to:
   - Perfectly follow your voice profile and your personal sentence structures and rhythm
   - Characteristic word choices and vocabulary preferences
   - Typical punctuation usage and formatting style
   - Have distinctive expressions, phrases, or speech patterns
   - Use emojis sparingly if applicable, but NEVER hashtags and NEVER use an em dash '—' in your tweet outputs.

TWEET GENERATIONS DIFFERENTIATION STRATEGY:
- Tweet 1: Direct response to the original trending topic's main point and main important details
- Tweet 2: Unique perspective or insight not covered in existing context but inferred from accurately sound cross analysis of the provided context
- Tweet 3: Engagement-focused (question, call to action, controversial but not negative take, addressing significant topics or arguments)

FORMAT REQUIREMENTS:
- Present each generated tweet inside <tweet1></tweet1>, <tweet2></tweet2>, and <tweet3></tweet3> tags
- Vary the tweet lengths between 200 and 300 text characters with each tweet iteration a different length
- Include ONLY the tweet text within each tag with no explanations or meta-commentary
- Remember to follow your personal voice profile and analysis for all three tweet iterations`;

    // Updated user prompt with the topic
    const userPrompt = `You now NEED to create THREE different high-quality tweet generation iterations using a current trending topic while ensuring the three tweet iterations perfectly matche your writing style and profile analysis. You're going to use your personal unique voice profile and analyze the trending topic's details and additional context to craft these tweet iterations.


Here is a prompt section of specific instructions that may or may not have instructions:
<prompt text>
${prompt}
</prompt text>

Additional important context and information about current trending topic including the text of the real current examples, as well as the metadata of each example tweet which again, the metadata like author name and profile pic url etc should be ignored:
<topic information>
${trendingTopicsContent}
</topic information>

Here is your personal unique voice profile and analysis for you to deeply embody as if you ARE that person:
<voice profile>
${voiceProfileAnalysis}
</voice profile>


GUIDELINES FOR YOUR TWEETS:
- All three tweets must authentically match your personal writing style
- Each tweet should take a different approach/angle to the topic
- All tweets MUST be at least 200 text characters MINIMUM
- Make each tweet distinct and valuable in different ways
- Use your deeply internalized voice profile and persona to output as YOU
- Incorporate your unique expressions and quirks if applicable
- DO NOT USE HASHTAGS AT ALL
- DO NOT USE EM DASHES AT ALL

Generate three different tweet options in your exact writing style, presenting each inside the specified tags in your output:

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
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1200
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
