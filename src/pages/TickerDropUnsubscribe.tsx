
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TickerDropUnsubscribe() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || "");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase
        .from('tickerdrop_emails')
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setStatus('error');
        setMessage("Email not found or already unsubscribed.");
        return;
      }

      setStatus('success');
      setMessage("You have been successfully unsubscribed from The Ticker Drop.");
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
      setMessage("Something went wrong. Please try again or contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-white">
      <Navbar />
      
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
            <div className="text-center mb-8">
              <Mail className="h-16 w-16 text-[#0087C8] mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Unsubscribe from The Ticker Drop</h1>
              <p className="text-lg text-gray-600">
                We're sorry to see you go. Enter your email address to unsubscribe from our newsletter.
              </p>
            </div>

            {status === 'success' ? (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg text-green-800 font-semibold mb-6">{message}</p>
                <p className="text-gray-600 mb-6">
                  You will no longer receive emails from The Ticker Drop. If you change your mind, you can always subscribe again.
                </p>
                <a href="/ticker-drop" className="text-[#0087C8] hover:underline">
                  Back to The Ticker Drop
                </a>
              </div>
            ) : (
              <form onSubmit={handleUnsubscribe} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
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
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold text-base"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? "Unsubscribing..." : "Unsubscribe"}
                </Button>

                {status === 'error' && (
                  <div className="mt-4 p-4 rounded-lg flex items-center gap-3 bg-red-50 text-red-800 border border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium">{message}</p>
                  </div>
                )}

                <p className="text-sm text-gray-500 text-center">
                  Having trouble? Contact us at support@yourdomain.com
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
