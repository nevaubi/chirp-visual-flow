import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if RESEND_API_KEY is available
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error. Please contact support." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("API Key found, length:", apiKey.length);

    const { email, firstName, lastName }: SubscriptionRequest = await req.json();

    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Adding contact to Ticker Drop audience:", { email, firstName, lastName });

    // Your Ticker Drop audience ID - make sure this is correct in your Resend dashboard
    const audienceId = "cb993060-68d6-40d9-a746-ddfde69bc003";
    
    console.log("Making request to Resend API for audience:", audienceId);

    // Use the correct Resend API endpoint with audience ID in the URL
    const resendResponse = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        unsubscribed: false,
        ...(firstName?.trim() && { firstName: firstName.trim() }),
        ...(lastName?.trim() && { lastName: lastName.trim() }),
      }),
    });

    console.log("Resend API response status:", resendResponse.status);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      
      // Parse error response
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Handle specific error cases
      if (resendResponse.status === 409 || 
          errorData.message?.includes("Contact already exists") || 
          errorData.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "You're already subscribed to The Ticker Drop!" }),
          {
            status: 409,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (resendResponse.status === 400) {
        return new Response(
          JSON.stringify({ error: "Please enter a valid email address" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (resendResponse.status === 404 || errorData.message?.includes("Audience not found")) {
        return new Response(
          JSON.stringify({ error: "Configuration error. Please contact support." }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Generic error for unhandled cases
      return new Response(
        JSON.stringify({ error: "Failed to subscribe. Please try again." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const responseData = await resendResponse.json();
    console.log("Contact added successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully subscribed to The Ticker Drop!",
        contactId: responseData.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in ticker-drop-subscribe function:", error);
    
    // Handle specific error cases that might be in the error message
    if (error.message?.includes("Contact already exists") || 
        error.message?.includes("already exists")) {
      return new Response(
        JSON.stringify({ error: "You're already subscribed to The Ticker Drop!" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to subscribe. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
