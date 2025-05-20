import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  BarChart2, 
  Users, 
  Activity, 
  Twitter, 
  MessageCircle, 
  ThumbsUp, 
  TrendingUp, 
  Clock, 
  Calendar,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Bookmark,
  Info,
  Check,
  CreditCard,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Chart component - we'll create a simple placeholder
const EngagementChart = () => (
  <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-md">
    <span className="text-gray-400">Engagement Chart Placeholder</span>
  </div>
);

// Circular progress component
const CircularProgress = ({ value, size = 60, strokeWidth = 5, color = "#0087C8" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dash = (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - dash}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
        fontSize={size / 5}
        fontWeight="bold"
        fill={color}
        className="transform rotate-90"
      >
        {value}%
      </text>
    </svg>
  );
};

// Activity item component
const ActivityItem = ({ title, time, description, icon: Icon, color }) => (
  <div className="flex items-start gap-3 py-3">
    <div className={cn("p-2 rounded-full", color)}>
      <Icon size={14} className="text-white" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

// Creator Platform Dashboard
const CreatorDashboard = ({ profile }) => {
  // Sample schedule data
  const scheduleItems = [
    { day: 'Monday', time: '10:00 AM', title: 'Post update on new features' },
    { day: 'Wednesday', time: '2:00 PM', title: 'Twitter Space with followers' },
    { day: 'Friday', time: '4:30 PM', title: 'Weekly analytics review' },
  ];

  // Sample activity data
  const activityItems = [
    { 
      title: 'New Follower', 
      time: '2 min ago', 
      description: '@techuser123 started following you', 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Engagement', 
      time: '1 hour ago', 
      description: 'Your post received 24 likes', 
      icon: ThumbsUp, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Mention', 
      time: '3 hours ago', 
      description: '@marketingpro mentioned you in a tweet', 
      icon: MessageCircle, 
      color: 'bg-purple-500' 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Creator Platform, {profile?.twitter_username || 'User'}</h1>
          <p className="text-gray-600">Here's what's happening with your Twitter account</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Followers</CardTitle>
            <Twitter className="h-4 w-4 text-[#0087C8]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{profile?.follower_count?.toLocaleString() || '0'}</div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+2.5% from last week</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Following</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{profile?.following_count?.toLocaleString() || '0'}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">Steady growth</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-[#FF6B35]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">4.6%</div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+0.8% from last month</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Impressions</CardTitle>
            <BarChart2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">12.8K</div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+18% from last week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follower Goal */}
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader>
            <CardTitle>Follower Goal</CardTitle>
            <CardDescription>Progress towards 10K followers</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <CircularProgress value={Math.round((profile?.follower_count || 0) / 100)} />
            <div className="mt-6 text-center">
              <p className="text-lg font-bold text-gray-900">{profile?.follower_count?.toLocaleString() || '0'}/10,000</p>
              <p className="text-sm text-gray-600">
                {10000 - (profile?.follower_count || 0)} more followers to reach your goal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>Your upcoming Twitter tasks</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduleItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-100 text-[#0087C8]">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{item.day} • {item.time}</p>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-2 text-[#0087C8] border-[#0087C8] hover:bg-[#0087C8] hover:text-white"
              >
                View Full Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest Twitter interactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-[#0087C8]">
              View all <ChevronRight size={16} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activityItems.map((item, index) => (
                <ActivityItem key={index} {...item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Analytics */}
      <Card className="border-none shadow-sm hover:shadow transition-shadow">
        <CardHeader>
          <CardTitle>Engagement Analytics</CardTitle>
          <CardDescription>Last 30 days performance</CardDescription>
        </CardHeader>
        <CardContent>
          <EngagementChart />
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="border-none shadow-sm hover:shadow transition-shadow">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your Twitter profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Username</h3>
              <p className="text-gray-900">{profile?.twitter_username || 'Not available'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Handle</h3>
              <p className="text-gray-900">@{profile?.twitter_handle || 'Not available'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Verified</h3>
              <p className="text-gray-900">{profile?.is_verified ? 'Yes' : 'No'}</p>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
              <p className="text-gray-900">{profile?.bio || 'No bio available'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
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
  
  // Function to handle subscription management via Stripe portal
  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) {
        console.error("Error opening customer portal:", error);
        toast.error("Could not open subscription management portal");
        return;
      }
      
      if (data?.url) {
        // Open the customer portal in a new tab
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error in handleManageSubscription:", error);
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
      icon: Zap
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
          <p className="text-sm text-gray-600">
            Use the "Create Newsletter" button in the sidebar to generate a newsletter
          </p>
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
          
          <div className="mt-8 bg-amber-50 p-4 rounded-lg border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-600 mt-1">
                <Info size={16} />
              </div>
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Pro Tip</h4>
                <p className="text-sm text-amber-700">
                  Organize your bookmarks by topic to create more focused newsletters. 
                  We'll automatically group related content together for better readability.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card className="border-none shadow-sm hover:shadow transition-shadow overflow-hidden">
        <CardHeader className={cn(
          "relative pb-8",
          isPremium ? "bg-gradient-to-r from-amber-100 to-amber-50" : "bg-gray-50"
        )}>
          {isPremium && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 transform translate-x-8 translate-y-5 -rotate-45 shadow-md">
              Premium
            </div>
          )}
          <CardTitle>{isPremium ? "Premium Plan" : "Free Plan"}</CardTitle>
          <CardDescription>
            {isPremium 
              ? "You're currently on the Newsletter Premium plan" 
              : "Upgrade to Premium for additional features"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Current Features:</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check size={18} className={isPremium ? "text-amber-500" : "text-gray-400"} />
                <span className={isPremium ? "text-gray-900" : "text-gray-500"}>
                  <strong>{isPremium ? "30" : "0"}</strong> manual newsletter generations
                  {isPremium && remainingGenerations > 0 && (
                    <span className="ml-2 text-sm text-amber-600">
                      ({remainingGenerations} remaining)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex items-start gap-2">
                <Check size={18} className={isPremium ? "text-amber-500" : "text-gray-400"} />
                <span className={isPremium ? "text-gray-900" : "text-gray-500"}>
                  Customizable newsletter templates
                </span>
              </div>
              
              <div className="flex items-start gap-2">
                <Check size={18} className={isPremium ? "text-amber-500" : "text-gray-400"} />
                <span className={isPremium ? "text-gray-900" : "text-gray-500"}>
                  Save and edit newsletters
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end bg-gray-50 border-t border-gray-100 p-4">
          {isPremium ? (
            <Button 
              variant="outline" 
              className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={handleManageSubscription}
              disabled={isLoading}
            >
              <CreditCard size={16} />
              Manage Subscription
            </Button>
          ) : (
            <Button 
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleUpgradeSubscription}
              disabled={isLoading}
            >
              <CreditCard size={16} />
              Upgrade to Premium
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

const DashboardHome = () => {
  const { authState, updateProfile } = useAuth();
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
