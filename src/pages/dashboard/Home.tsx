
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Clock, AlertCircle, Info, Twitter, Bookmark, TrendingUp, Zap, Shield } from 'lucide-react';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Newsletter Platform Dashboard - enhanced version
const NewsletterDashboard = ({ profile }) => {
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div className="space-y-6">
      {/* Updated header layout with left column */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left - Manual Newsletter Generation */}
        <div className="w-full lg:w-1/4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-[#FF6B35]" />
                Manual Generation
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Create newsletters from your X bookmarks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-12 border-gray-200 hover:bg-gray-50"
                disabled
              >
                <Bookmark className="h-4 w-4" />
                <span className="font-medium">10 Bookmarks</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-12 border-gray-200 hover:bg-gray-50"
                disabled
              >
                <Bookmark className="h-4 w-4" />
                <span className="font-medium">20 Bookmarks</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-12 border-gray-200 hover:bg-gray-50"
                disabled
              >
                <Bookmark className="h-4 w-4" />
                <span className="font-medium">30 Bookmarks</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Center and Right - Welcome and Instructions */}
        <div className="w-full lg:w-3/4 flex flex-col lg:flex-row gap-6">
          {/* Center - Welcome text */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Welcome to Newsletters, {profile?.twitter_username || 'User'}</h1>
            </div>
          </div>
          
          {/* Right - Instructions - Center aligned on mobile */}
          <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end">
            <div className="text-center lg:text-right">
              <p className="text-base text-gray-600 mb-2">To generate newsletters you need to:</p>
              <div className="flex flex-col gap-2">
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
