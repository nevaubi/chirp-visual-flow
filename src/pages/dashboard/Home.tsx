import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Check, CreditCard, Clock, LineChart, Users, AlertCircle, Info, Twitter, Bookmark, TrendingUp, Zap, Shield } from 'lucide-react';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import AnalysisCompletePopup from '@/components/auth/AnalysisCompletePopup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import TwitterProfileCard from '@/components/profile/TwitterProfileCard';
import MetricCard from '@/components/profile/MetricCard';
import GrowthCard from '@/components/profile/GrowthCard';
import CircadianHeatmap from '@/components/analysis/CircadianHeatmap';
import HourlyEngagementChart from '@/components/analysis/HourlyEngagementChart';
import ProfileHeatmap from '@/components/analysis/ProfileHeatmap';
import CircadianInsights from '@/components/analysis/CircadianInsights';
import HourlyInsights from '@/components/analysis/HourlyInsights';
import AvgLikesByLengthChart from '@/components/analysis/AvgLikesByLengthChart';
import ReplyVsPostDonutChart from '@/components/analysis/ReplyVsPostDonutChart';
import ContentTypeEngagementChart from '@/components/analysis/ContentTypeEngagementChart';
import NewsletterTips from '@/components/newsletter/NewsletterTips';

// Enhanced Creator Platform Dashboard with profile analysis
const CreatorDashboard = ({ profile }) => {
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [localProfile, setLocalProfile] = useState(profile);
  const { refreshProfile } = useAuth();
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  
  // Update local profile when the parent profile changes
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);
  
  // Extract profile analysis results from local state
  const analysisResults = localProfile?.profile_analysis_results;
  const hasAnalysisResults = !!analysisResults;
  
  // Trigger a new analysis if needed
  const handleRefreshAnalysis = async () => {
    if (!localProfile?.twitter_username || !localProfile?.timezone) {
      toast.error("Missing Twitter username or timezone. Please update your profile settings.");
      return;
    }
    
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('initial-profile-analysis', {
        body: {
          userId: localProfile.id,
          twitterUsername: localProfile.twitter_username,
          timezone: localProfile.timezone
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Profile analysis failed");
      }
      
      // Refresh profile to get the updated analysis results
      const updatedProfile = await refreshProfile();
      
      // Force component update with the new profile data
      setLocalProfile(updatedProfile);
      
      // Show the completion popup
      setShowCompletionPopup(true);
      
      toast.success("Profile analysis refreshed successfully");
    } catch (error) {
      console.error("Error refreshing profile analysis:", error);
      setAnalysisError(error.message || "An error occurred during analysis refresh");
      toast.error("Failed to refresh profile analysis");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };
  
  // If analysis is not yet available, show initial state
  if (!hasAnalysisResults) {
    return (
      <div className="space-y-6">
        {/* Top section with action button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.twitter_username || 'User'}</h1>
            <p className="text-gray-600">Your creator dashboard is being set up</p>
          </div>
        </div>

        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart size={20} className="text-[#0087C8]" />
              Profile Analysis
            </CardTitle>
            <CardDescription>
              {isLoadingAnalysis ? "Running profile analysis..." : "Let's analyze your X profile to provide personalized insights"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-10">
            {isLoadingAnalysis ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-t-transparent border-[#0087C8] rounded-full animate-spin"></div>
                <p className="text-gray-600">Analyzing your profile data...</p>
                <p className="text-sm text-gray-500">This may take a minute or two</p>
              </div>
            ) : analysisError ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-gray-600 mb-2">There was an issue with the analysis:</p>
                  <p className="text-sm text-red-500">{analysisError}</p>
                </div>
                <Button 
                  onClick={handleRefreshAnalysis}
                  className="gap-2"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="text-center mb-6 space-y-4">
                <p className="text-gray-600">
                  We'll analyze your posting patterns, engagement metrics, and content performance.
                </p>
                <Button 
                  onClick={handleRefreshAnalysis}
                  className="gap-2 bg-[#0087C8] hover:bg-[#0076b2]"
                  disabled={isLoadingAnalysis}
                >
                  <BarChart size={16} /> Analyze My Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Completion popup */}
        <AnalysisCompletePopup 
          open={showCompletionPopup} 
          onClose={() => setShowCompletionPopup(false)} 
        />
      </div>
    );
  }
  
  // When analysis results are available, show the enhanced dashboard
  return (
    <div className="space-y-6">
      {/* Background gradient decoration */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-[#E5DEFF]/20 via-[#D3E4FD]/20 to-[#F1F0FB]/20 -z-10 rounded-md"></div>
      
      {/* Profile Section with Metrics */}
      <div className="w-full">
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">PROFILE & METRICS</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Twitter Profile Card - now in a responsive grid */}
          <div className="lg:col-span-1">
            <TwitterProfileCard profile={localProfile} />
          </div>
          
          {/* New charts in the remaining space */}
          <div className="lg:col-span-1">
            <AvgLikesByLengthChart avgLikesByLength={analysisResults?.avgLikesByLength} />
          </div>
          
          <div className="lg:col-span-1">
            <ReplyVsPostDonutChart replyVsPostStats={analysisResults?.replyVsPostStats} />
          </div>
          
          <div className="lg:col-span-1">
            <ContentTypeEngagementChart engagementByContentType={analysisResults?.engagement_by_content_type} />
          </div>
        </div>
      </div>
      
      {/* Section Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2"></div>
      
      {/* Weekly Activity Pattern Row - with two columns */}
      <div className="w-full">
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">WEEKLY ACTIVITY PATTERN</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: CircadianHeatmap */}
          <div className="lg:col-span-1">
            <CircadianHeatmap 
              data={analysisResults?.circadianHeatmap || []} 
              timezone={localProfile?.timezone} 
            />
          </div>
          
          {/* Right column: Insights */}
          <div className="lg:col-span-1">
            <CircadianInsights 
              data={analysisResults?.circadianHeatmap || []}
              timezone={localProfile?.timezone}
            />
          </div>
        </div>
      </div>
      
      {/* Section Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2"></div>
      
      {/* Hourly Engagement Row - with two columns */}
      <div className="w-full">
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">HOURLY ENGAGEMENT</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: HourlyEngagementChart */}
          <div className="lg:col-span-1">
            <HourlyEngagementChart 
              hourlyAvgLikes={analysisResults?.hourlyAvgLikes || {}} 
              averageTweetsPerHour={analysisResults?.averageTweetsPerHour || {}} 
              timezone={localProfile?.timezone}
              bestHour={parseInt(analysisResults?.bestHourByAvgLikes?.hour?.toString() || "0")}
            />
          </div>
          
          {/* Right column: Insights */}
          <div className="lg:col-span-1">
            <HourlyInsights
              hourlyAvgLikes={analysisResults?.hourlyAvgLikes || {}}
              averageTweetsPerHour={analysisResults?.averageTweetsPerHour || {}}
              bestHour={parseInt(analysisResults?.bestHourByAvgLikes?.hour?.toString() || "0")}
            />
          </div>
        </div>
      </div>

      {/* Completion popup */}
      <AnalysisCompletePopup 
        open={showCompletionPopup} 
        onClose={() => setShowCompletionPopup(false)} 
      />
    </div>
  );
};

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

  // Steps for how the newsletter generation works
  const steps = [
    {
      title: "Bookmark tweets",
      description: "Save tweets you find valuable by bookmarking them on X (Twitter).",
      icon: Bookmark
    },
    {
      title: "Connect your X account",
      description: "Allow us to access your bookmarks securely.",
      icon: Twitter
    },
    {
      title: "Generate newsletters",
      description: "We'll transform your bookmarks into a well-formatted newsletter.",
      icon: TrendingUp
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Newsletters, {profile?.twitter_username || 'User'}</h1>
          <p className="text-gray-600">Generate newsletters from your X bookmarks</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-base text-gray-600 mb-1">To generate newsletters you need to:</p>
          <div className="text-base text-gray-600 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                1
              </div>
              <span>Authorize X access via popup</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-semibold">
                2
              </div>
              <span>Upgrade to subscription</span>
            </div>
          </div>
          {isLoading && (
            <p className="text-xs text-amber-600">
              <Clock size={12} className="inline mr-1" /> Newsletter generation in progress...
            </p>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      <Card className="border-none shadow-sm hover:shadow transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={18} className="text-[#0087C8]" />
            How It Works
          </CardTitle>
          <CardDescription>
            Turn your X (Twitter) bookmarks into beautiful newsletters in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4 rounded-lg border border-gray-100 hover:border-[#0087C8]/20 hover:bg-blue-50/30 transition-colors">
                <div className="p-3 rounded-full bg-[#0087C8]/10 mb-4">
                  <step.icon size={24} className="text-[#0087C8]" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Tips Section - replaces the subscription card */}
      <NewsletterTips />

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
  
  // Determine which dashboard to show based on profile settings
  const isNewsletterPlatform = profile?.is_newsletter_platform;
  const isCreatorPlatform = profile?.is_creator_platform;

  // Check if we need to show the walkthrough popup
  useEffect(() => {
    if (profile) {
      if (isNewsletterPlatform) {
        // For newsletter platform: show walkthrough if twitter_bookmark_access_token is null
        setShowWalkthrough(profile.twitter_bookmark_access_token === null);
      } else {
        // For creator platform: keep the original behavior checking timezone
        setShowWalkthrough(profile.timezone === null);
      }
    }
  }, [profile, isNewsletterPlatform]);

  // Handle walkthrough completion
  const handleWalkthroughComplete = async () => {
    try {
      // Simply close the walkthrough popup without modifying any profile data
      setShowWalkthrough(false);
    } catch (error) {
      console.error("Error updating timezone:", error);
    }
  };

  // If neither platform is set, show creator platform by default
  if (!isNewsletterPlatform && !isCreatorPlatform) {
    return (
      <>
        <CreatorDashboard profile={profile} />
        {showWalkthrough && (
          <WalkthroughPopup 
            open={showWalkthrough} 
            onComplete={handleWalkthroughComplete} 
            isCreatorPlatform={true}
          />
        )}
      </>
    );
  }

  // Show the appropriate platform dashboard
  return (
    <>
      {isNewsletterPlatform ? (
        <NewsletterDashboard profile={profile} />
      ) : (
        <CreatorDashboard profile={profile} />
      )}
      
      {showWalkthrough && (
        <WalkthroughPopup 
          open={showWalkthrough} 
          onComplete={handleWalkthroughComplete} 
          isCreatorPlatform={isCreatorPlatform || false}
        />
      )}
    </>
  );
};

export default DashboardHome;
