import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Initialize Resend client
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[NEWSLETTER-GEN] ${step}${detailsStr}`);
};

// Main function for newsletter generation - runs in the background
async function generateNewsletter(userId: string, selectedCount: number, jwt: string) {
  // 2) Set up Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let generationDecrementedCount: number | null = null;

  try {
    // 3) Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle")
      .eq("id", userId)
      .single();
      
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // 4) Subscription & plan & tokens checks
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      throw new Error("You have no remaining newsletter generations");
    }
    if (!profile.twitter_bookmark_access_token) {
      throw new Error("Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings.");
    }
    const now = Math.floor(Date.now() / 1000);
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      throw new Error("Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks.");
    }

    // 5) **ANTI-SPAM: Decrement generation count immediately**
    logStep("Decrementing generation count immediately to prevent spam");
    const newCount = profile.remaining_newsletter_generations - 1;
    const { error: decrementError } = await supabase
      .from("profiles")
      .update({ remaining_newsletter_generations: newCount })
      .eq("id", userId);

    if (decrementError) {
      console.error("Failed to decrement generation count:", decrementError);
      throw new Error("Failed to update generation count");
    }

    generationDecrementedCount = newCount;
    logStep("Generation count decremented", { newCount });

    // 6) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(`https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`, {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com"
          }
        });
        
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              numerical_id: numericalId
            })
            .eq("id", userId);
            
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error("Could not retrieve your Twitter ID. Please try again later.");
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        throw new Error("Could not retrieve your Twitter ID. Please try again later.");
      }
    }
    
    if (!numericalId) {
      throw new Error("Could not determine your Twitter ID. Please update your Twitter handle in settings.");
    }

    // 7) Fetch bookmarks
    logStep("Fetching bookmarks", { count: selectedCount, userId: numericalId });
    const bookmarksResp = await fetch(`https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`, {
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
    logStep("Successfully fetched bookmarks", { count: tweetIds.length });

    // 8) Fetch detailed tweets via Apify
    logStep("Fetching detailed tweet data via Apify");
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
    logStep("Successfully fetched detailed tweet data", { tweetCount: apifyData.length || 0 });

    // 9) Format tweets for OpenAI
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
    
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 10) Call OpenAI for analysis
    logStep("Calling OpenAI for analysis");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert Twitter content analyst specializing in creating compelling newsletters from bookmark collections.`;
    const analysisUserPrompt = `Based on the provided tweet collection, create an engaging newsletter...`;
    
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: `${analysisUserPrompt}\n\nTweet collection:\n${formattedTweets}` }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });
    
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated analysis");

    // 11) Generate markdown newsletter
    let markdownNewsletter = analysisResult;

    // 12) Convert markdown to HTML
    const htmlBody = marked(markdownNewsletter);
    const emailHtml = juice(`<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${htmlBody}</body>`);

    // 13) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai";
      const emailSubject = `Your Newsletter from LetterNest`;
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`, 
        to: profile.sending_email, 
        subject: emailSubject, 
        html: emailHtml, 
        text: markdownNewsletter 
      });
      if (emailError) {
        console.error("Error sending email with Resend:", emailError);
        throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
      }
      logStep("Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 14) Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({
        user_id: userId,
        markdown_text: markdownNewsletter
      });
      
      if (storageError) {
        console.error("Failed to save newsletter to storage:", storageError);
      } else {
        logStep("Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving newsletter to storage:", storageErr);
    }

    // 15) Final log & response
    const timestamp = new Date().toISOString();
    logStep("Newsletter generation successful", {
      userId,
      timestamp,
      tweetCount: selectedCount,
      remainingGenerations: generationDecrementedCount,
    });
    return {
      status: "success",
      message: "Newsletter generated and process initiated for email.",
      remainingGenerations: generationDecrementedCount,
      data: { analysisResult, markdownNewsletter, timestamp }
    };
  } catch (error) {
    console.error("Error in background newsletter generation process:", error);
    
    // **ROLLBACK: Restore generation count if we decremented it**
    if (generationDecrementedCount !== null) {
      try {
        logStep("Rolling back generation count due to error");
        const { error: rollbackError } = await supabase
          .from("profiles")
          .update({ remaining_newsletter_generations: generationDecrementedCount + 1 })
          .eq("id", userId);
        
        if (rollbackError) {
          console.error("Failed to rollback generation count:", rollbackError);
        } else {
          logStep("Successfully rolled back generation count");
        }
      } catch (rollbackErr) {
        console.error("Error during rollback:", rollbackErr);
      }
    }
    
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    logStep("Starting newsletter generation process (HTTP)");
    
    // 1) Initial validation - fast checks before starting the heavy work
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(JSON.stringify({
        error: "Invalid selection. Please choose 10, 20, or 30 tweets."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 2) Authenticate - do this synchronously
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "No authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({
        error: "Authentication failed"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 3) Get the current remaining generations for immediate response
    const { data: profile } = await supabase
      .from("profiles")
      .select("remaining_newsletter_generations")
      .eq("id", user.id)
      .single();

    // 4) Start async task - this is the core of the optimization
    const backgroundTask = generateNewsletter(user.id, selectedCount, jwt);
    
    // Use EdgeRuntime.waitUntil to continue processing after sending response
    // @ts-ignore - EdgeRuntime exists in Deno Deploy but might not be in type definitions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      // Fallback for local development
      backgroundTask.then(result => {
        logStep("Background task completed (local/fallback)", result);
      }).catch(err => {
        console.error("Background task error (local/fallback):", err);
      });
    }
    
    // 5) Send immediate response to client
    return new Response(JSON.stringify({
      status: "processing",
      message: "Your newsletter generation has started. You will receive an email when it's ready.",
      remainingGenerations: Math.max(0, (profile?.remaining_newsletter_generations || 1) - 1)
    }), {
      status: 202, // Accepted - the request has been accepted for processing
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
