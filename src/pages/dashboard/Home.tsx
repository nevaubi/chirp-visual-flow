

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Clock, AlertCircle, Info, Twitter, Bookmark, TrendingUp, Zap, Shield } from 'lucide-react';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ManualNewsletterDialog from '@/components/newsletter/ManualNewsletterDialog';

// Newsletter Platform Dashboard - enhanced version
const NewsletterDashboard = ({ profile }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState(10);
  const { refreshProfile } = useAuth();

  // Check if user has a subscription
  const isSubscribed = profile?.subscribed;
  const subscriptionTier = profile?.subscription_tier;
  const isPremium = subscriptionTier === "Newsletter Premium";
  
  // Number of remaining manual generations
  const remainingGenerations = profile?.remaining_newsletter_generations || 0;
  
  // Function to handle subscription checkout
  const handleUpgradeSubscription = async () => {
    setIsLoading(true);
    try {
      // Use the create-checkout edge function with the Newsletter Premium price
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId: "price_newsletter_premium", // This should be replaced with your actual Stripe price ID
          frequency: "monthly",
          metadata: {
            newsletter_day_preference: "Friday",
          }
        }
      });
      
      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Could not start checkout process");
        return;
      }
      
      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error in handleUpgradeSubscription:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNewsletter = () => {
    setShowManualDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header row with welcome text on left and instructions on right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left - Welcome text */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Newsletters, {profile?.twitter_username || 'User'}</h1>
        </div>

        {/* Right - Instructions */}
        <div className="text-center lg:text-right">
          <p className="text-base text-gray-600 mb-2">To generate newsletters you need to:</p>
          <div className="flex flex-col lg:flex-row lg:gap-6 gap-2">
            <div className="flex items-center justify-center lg:justify-end gap-2">
              <span>Authorize X access via popup</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
                1
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end gap-2">
              <span>Upgrade to subscription</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-semibold">
                2
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - Manual Newsletter Generation */}
      <div className="flex justify-start">
        <div className="w-full lg:w-2/3 xl:w-1/2">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Generate Newsletter Manually
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Instantly trigger a newsletter from your saved bookmarks. It will be sent to your email and displayed here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-md p-3 text-sm text-[#FF6B35]">
                <p>Make sure you've already saved the bookmarks you'd like to include in your newsletter.</p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">How many of your most recent bookmarks to use:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[10, 20, 30].map((count) => (
                    <div
                      key={count}
                      onClick={() => setSelectedCount(count)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCount === count
                          ? 'border-[#FF6B35] bg-[#FF6B35]/10'
                          : 'border-gray-200 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5'
                      }`}
                    >
                      <div className="text-2xl font-bold mb-2">{count}</div>
                      <div className="text-sm text-gray-600">tweets</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-500">
                {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
              </div>
              <Button 
                onClick={handleGenerateNewsletter}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                disabled={remainingGenerations <= 0}
              >
                Generate Newsletter
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Add processing status card when a newsletter is being generated */}
      {isLoading && (
        <Card className="border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-t-transparent border-amber-500 rounded-full animate-spin"></div>
              <div>
                <h3 className="font-semibold text-amber-800">Newsletter Generation in Progress</h3>
                <p className="text-amber-700 text-sm">
                  Your newsletter is being generated in the background. You'll receive an email when it's ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Newsletter Dialog */}
      <ManualNewsletterDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        remainingGenerations={remainingGenerations}
      />
    </div>
  );
};

const DashboardHome = () => {
  const { authState, updateProfile, refreshProfile } = useAuth();
  const profile = authState.profile;
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // Check if we need to show the walkthrough popup for newsletter platform
  useEffect(() => {
    if (profile) {
      // For newsletter platform: show walkthrough if twitter_bookmark_access_token is null
      setShowWalkthrough(profile.twitter_bookmark_access_token === null);
    }
  }, [profile]);

  // Handle walkthrough completion
  const handleWalkthroughComplete = async () => {
    try {
      // Simply close the walkthrough popup without modifying any profile data
      setShowWalkthrough(false);
    } catch (error) {
      console.error("Error updating timezone:", error);
    }
  };

  return (
    <>
      <NewsletterDashboard profile={profile} />
      
      {showWalkthrough && (
        <WalkthroughPopup 
          open={showWalkthrough} 
          onComplete={handleWalkthroughComplete} 
          isCreatorPlatform={false}
        />
      )}
    </>
  );
};

export default DashboardHome;

