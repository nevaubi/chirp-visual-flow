
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

    // Add contact to the Ticker Drop audience
    const audienceId = "cb993060-68d6-40d9-a746-ddfde69bc003";
    
    const contactData: any = {
      email: email.toLowerCase().trim(),
      audienceId: audienceId,
    };

    // Add first and last name if provided
    if (firstName?.trim() || lastName?.trim()) {
      contactData.firstName = firstName?.trim() || "";
      contactData.lastName = lastName?.trim() || "";
    }

    const result = await resend.contacts.create(contactData);

    console.log("Contact added successfully:", result);

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
    if (error.message?.includes("Contact already exists")) {
      return new Response(
        JSON.stringify({ error: "You're already subscribed to The Ticker Drop!" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (error.message?.includes("Invalid email")) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        {
          status: 400,
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
