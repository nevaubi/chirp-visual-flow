
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, AlertCircle, Bitcoin, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SatoshiSummarySignup() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      console.log('Subscribing to Satoshi Summary:', {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const { data, error } = await supabase.functions.invoke('satoshi-summary-subscribe', {
        body: {
          email: email.toLowerCase().trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }
      });

      if (error) {
        console.error('Subscription error:', error);
        setStatus('error');
        setMessage(error.message || "Something went wrong. Please try again.");
        return;
      }

      if (data?.error) {
        console.error('API error:', data.error);
        setStatus('error');
        setMessage(data.error);
        return;
      }

      setStatus('success');
      setMessage(data?.message || "Success! You're now subscribed to Satoshi Summary.");
      setEmail("");
      setFirstName("");
      setLastName("");
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setMessage("");
  };

  if (status === 'success') {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 max-w-md mx-auto">
        <div className="text-center animate-fade-in">
          {/* Simple Success Icon */}
          <div className="mb-6">
            <div className="bg-orange-500 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Bitcoin className="h-5 w-5 text-orange-500" />
              To the Moon! 🚀
            </h3>
            <p className="text-orange-500 font-semibold text-lg mb-2">
              You're now subscribed to Satoshi Summary
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Get ready for premium crypto insights delivered to your inbox every Tuesday & Friday!
            </p>
          </div>

          {/* What's Next Section */}
          <div className="bg-orange-500/5 rounded-xl p-4 mb-6 border border-orange-500/10">
            <h4 className="font-semibold text-gray-800 mb-2">What's Next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your email for a welcome message</li>
              <li>• Your first newsletter arrives Tuesday</li>
              <li>• Navigate the crypto market like a pro</li>
            </ul>
          </div>

          {/* Action Button */}
          <Button 
            onClick={resetForm}
            variant="outline"
            className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Subscribe Another Email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 max-w-md mx-auto">
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <Mail className="h-5 w-5 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Subscribe to Satoshi Summary</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Every Tuesday & Friday
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
              disabled={isLoading}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          First and last name are optional but help us personalize your newsletters.
        </p>
        
        <Button 
          type="submit"
          className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all duration-200"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Subscribing...
            </div>
          ) : (
            "Subscribe for Free"
          )}
        </Button>
      </form>

      {status === 'error' && (
        <div className="mt-4 p-3 rounded-lg flex items-center gap-2 transition-all duration-300 bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
        No spam, unsubscribe at any time. By subscribing, you agree to receive marketing emails from Satoshi Summary.
      </p>
    </div>
  );
}
