import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    
    // Prepare contact data with all required fields
    const contactData = {
      email: email.toLowerCase().trim(),
      audienceId: audienceId,
      unsubscribed: false, // This was missing in your original code
      ...(firstName?.trim() && { firstName: firstName.trim() }),
      ...(lastName?.trim() && { lastName: lastName.trim() }),
    };

    console.log("Contact data being sent to Resend:", contactData);

    const result = await resend.contacts.create(contactData);

    console.log("Contact added successfully:", result);

    // Handle both success and error cases from Resend
    if (result.error) {
      console.error("Resend API error:", result.error);
      
      // Handle specific error cases
      if (result.error.message?.includes("Contact already exists") || 
          result.error.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "You're already subscribed to The Ticker Drop!" }),
          {
            status: 409,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (result.error.message?.includes("Invalid email") || 
          result.error.message?.includes("email")) {
        return new Response(
          JSON.stringify({ error: "Please enter a valid email address" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (result.error.message?.includes("Audience not found") ||
          result.error.message?.includes("audienceId")) {
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully subscribed to The Ticker Drop!",
        contactId: result.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in ticker-drop-subscribe function:", error);
    
    // Handle specific Resend API errors
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

    if (error.message?.includes("Invalid email") || 
        error.message?.includes("email")) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (error.message?.includes("Audience not found") ||
        error.message?.includes("audienceId")) {
      return new Response(
        JSON.stringify({ error: "Configuration error. Please contact support." }),
        {
          status: 500,
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
