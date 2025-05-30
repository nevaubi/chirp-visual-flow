
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ChainOfThoughtSignup() {
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
      // Insert email into database with email already verified
      const { error: insertError } = await supabase
        .from('cot_emails')
        .insert({
          email: email.toLowerCase().trim(),
          is_email_verified: true // Set as verified by default
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          setStatus('error');
          setMessage("This email is already subscribed to Chain of Thought!");
        } else {
          throw insertError;
        }
        return;
      }

      setStatus('success');
      setMessage("Success! You're now subscribed to Chain of Thought.");
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
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-purple-500/10 p-2 rounded-xl">
            <Mail className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">Subscribe to Chain of Thought</h3>
        </div>
        <p className="text-gray-600 text-lg">
          Tuesdays at 10am CT, Fridays at 4pm CT
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 text-base px-4 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all duration-200 bg-white/80"
            required
            disabled={isLoading}
          />
        </div>
        
        <Button 
          type="submit"
          className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Subscribing...
            </div>
          ) : (
            "Subscribe for Free"
          )}
        </Button>
      </form>

      {status !== 'idle' && (
        <div className={`mt-5 p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
          status === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {status === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-5 text-center leading-relaxed">
        No spam, unsubscribe at any time. By subscribing, you agree to receive marketing emails from Chain of Thought.
      </p>
    </div>
  );
}
