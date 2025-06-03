
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
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

      {status !== 'idle' && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
          status === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
        No spam, unsubscribe at any time. By subscribing, you agree to receive marketing emails from Satoshi Summary.
      </p>
    </div>
  );
}
