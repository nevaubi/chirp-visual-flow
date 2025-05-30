
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  verificationToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, verificationToken }: VerificationEmailRequest = await req.json();

    const verificationUrl = `${req.headers.get("origin") || "https://localhost:3000"}/ticker-drop/verify?token=${verificationToken}`;

    const emailResponse = await resend.emails.send({
      from: "The Ticker Drop <noreply@yourdomain.com>",
      to: [email],
      subject: "Verify your subscription to The Ticker Drop",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0087C8; font-size: 28px; margin-bottom: 10px;">The Ticker Drop</h1>
            <p style="color: #666; font-size: 16px;">Market insights delivered twice weekly</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to The Ticker Drop!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for subscribing to our newsletter. To complete your subscription, please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #0087C8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              This link will expire in 24 hours. If you didn't sign up for The Ticker Drop, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>© 2025 The Ticker Drop. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
