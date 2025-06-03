import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, AlertCircle, Brain, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ChainOfThoughtSignup() {
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
      console.log('Subscribing to Chain of Thought:', {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const { data, error } = await supabase.functions.invoke('chain-of-thought-subscribe', {
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
      setMessage(data?.message || "Success! You're now subscribed to Chain of Thought.");
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
        {/* Success Celebration State */}
        <div className="text-center animate-fade-in">
          {/* Animated Success Icon with Glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-600/20 rounded-full animate-ping"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center animate-bounce shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            {/* Sparkle Effects */}
            <div className="absolute top-2 left-12 w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-purple-700 rounded-full animate-pulse delay-300"></div>
            <div className="absolute bottom-4 left-8 w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse delay-500"></div>
          </div>

          {/* Success Message */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Mind Expanded!
            </h3>
            <p className="text-purple-600 font-semibold text-lg mb-2">
              You're now subscribed to Chain of Thought
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Get ready for cutting-edge AI insights delivered to your inbox every Tuesday & Friday!
            </p>
          </div>

          {/* What's Next Section */}
          <div className="bg-gradient-to-r from-purple-600/5 to-purple-700/5 rounded-xl p-4 mb-6 border border-purple-600/10">
            <h4 className="font-semibold text-gray-800 mb-2">What's Next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your email for a welcome message</li>
              <li>• Your first newsletter arrives Tuesday at 10am CT</li>
              <li>• Stay ahead of the AI revolution</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={resetForm}
              variant="outline"
              className="w-full border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Subscribe Another Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 max-w-md mx-auto">
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Subscribe to Chain of Thought</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Tuesdays at 10am CT, Fridays at 4pm CT
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
            className="h-10 border-gray-200 focus:border-purple-600 focus:ring-purple-600/20"
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
              className="h-10 border-gray-200 focus:border-purple-600 focus:ring-purple-600/20"
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
              className="h-10 border-gray-200 focus:border-purple-600 focus:ring-purple-600/20"
              disabled={isLoading}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          First and last name are optional but help us personalize your newsletters.
        </p>
        
        <Button 
          type="submit"
          className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all duration-200"
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
        No spam, unsubscribe at any time. By subscribing, you agree to receive marketing emails from Chain of Thought.
      </p>
    </div>
  );
}
