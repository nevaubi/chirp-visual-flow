
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function TickerDropSignup() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      // Generate verification token
      const verificationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Insert email into database
      const { error: insertError } = await supabase
        .from('tickerdrop_emails')
        .insert({
          email: email.toLowerCase().trim(),
          verification_token: verificationToken,
          verification_token_expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          setStatus('error');
          setMessage("This email is already subscribed to The Ticker Drop!");
        } else {
          throw insertError;
        }
        return;
      }

      // Send verification email
      const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: { email: email.toLowerCase().trim(), verificationToken }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        setStatus('error');
        setMessage("Subscription successful, but verification email failed to send. Please contact support.");
        return;
      }

      setStatus('success');
      setMessage("Success! Check your email to verify your subscription to The Ticker Drop.");
      setEmail("");
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Mail className="h-8 w-8 text-[#0087C8]" />
          <h3 className="text-2xl font-bold text-gray-900">Subscribe to The Ticker Drop</h3>
        </div>
        <p className="text-gray-600">
          Get market insights and stock analysis delivered to your inbox every Tuesday & Friday
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 text-base"
            required
            disabled={isLoading}
          />
        </div>
        
        <Button 
          type="submit"
          className="w-full h-12 bg-[#0087C8] hover:bg-[#0270A8] text-white font-semibold text-base"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? "Subscribing..." : "Subscribe for Free"}
        </Button>
      </form>

      {status !== 'idle' && (
        <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
          status === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {status === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        No spam, unsubscribe at any time. By subscribing, you agree to receive marketing emails from The Ticker Drop.
      </p>
    </div>
  );
}
