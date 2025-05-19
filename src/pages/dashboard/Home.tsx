<think>

</think>

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Info
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import NewsletterGenerationDialog from '@/components/newsletter/NewsletterGenerationDialog';

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

// Newsletter Platform Dashboard
const NewsletterDashboard = ({ profile }) => {
  // State for manual newsletter generation dialog
  const [isGeneratingDialogOpen, setIsGeneratingDialogOpen] = useState(false);

  // Sample newsletter data
  const recentNewsletters = [
    { title: "Weekly Tech Roundup", date: "May 10, 2025", subscribers: 542 },
    { title: "AI Innovations", date: "May 3, 2025", subscribers: 498 },
    { title: "Developer Updates", date: "Apr 26, 2025", subscribers: 467 },
  ];

  const bookmarkCollections = [
    { name: "Tech News", count: 37, lastUpdated: "2 days ago" },
    { name: "Programming", count: 24, lastUpdated: "1 week ago" },
    { name: "AI & ML", count: 19, lastUpdated: "3 days ago" },
  ];

  // Function to check if the user has a manual generation plan
  const hasManualGenerationPlan = () => {
    if (!profile) return false;
    
    // Check for manual plans (Manual: 4 or Manual: 8)
    const dayPreference = profile.newsletter_day_preference;
    return dayPreference === 'Manual: 4' || dayPreference === 'Manual: 8';
  };
  
  // Function to get remaining generations
  const getRemainingGenerations = () => {
    return profile?.remaining_newsletter_generations || 0;
  };
  
  // Check if the button should be enabled
  const isGenerationEnabled = hasManualGenerationPlan() && getRemainingGenerations() > 0;
  
  // Get tooltip message based on status
  const getTooltipMessage = () => {
    if (!profile?.subscription_tier) {
      return "Available with paid plans only";
    }
    if (!hasManualGenerationPlan()) {
      return "Available with manual generation plans only";
    }
    if (getRemainingGenerations() <= 0) {
      return "No remaining generations available";
    }
    return `${getRemainingGenerations()} generation${getRemainingGenerations() !== 1 ? 's' : ''} remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Newsletters, {profile?.twitter_username || 'User'}</h1>
          <p className="text-gray-600">Generate newsletters from your X bookmarks</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    className={cn(
                      "bg-amber-500 hover:bg-amber-600",
                      !isGenerationEnabled && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!isGenerationEnabled}
                    onClick={() => setIsGeneratingDialogOpen(true)}
                  >
                    Manual Newsletter Generation
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getTooltipMessage()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center text-xs text-gray-500">
            <Info size={12} className="mr-1" />
            <span>For plans with manual generation options</span>
          </div>
        </div>
      </div>

      {/* Newsletter Generation Dialog */}
      <NewsletterGenerationDialog 
        open={isGeneratingDialogOpen}
        onOpenChange={setIsGeneratingDialogOpen}
        remainingGenerations={getRemainingGenerations()}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">578</div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+12 new this week</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Newsletters Sent</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">12</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">3 sent this month</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Average Open Rate</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">42.8%</div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+3.2% from last month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Newsletters */}
        <Card className="border-none shadow-sm hover:shadow transition-shadow lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Newsletters</CardTitle>
                <CardDescription>Your recently sent newsletters</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                View all <ChevronRight size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNewsletters.map((newsletter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{newsletter.title}</h3>
                    <p className="text-xs text-gray-500">Sent on {newsletter.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{newsletter.subscribers} subscribers</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bookmark Collections */}
        <Card className="border-none shadow-sm hover:shadow transition-shadow">
          <CardHeader>
            <CardTitle>Bookmark Collections</CardTitle>
            <CardDescription>Sources for your newsletters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookmarkCollections.map((collection, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <Bookmark size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{collection.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{collection.count} bookmarks</span>
                      <span>•</span>
                      <span>Updated {collection.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                Sync Bookmarks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Newsletter Performance */}
      <Card className="border-none shadow-sm hover:shadow transition-shadow">
        <CardHeader>
          <CardTitle>Newsletter Performance</CardTitle>
          <CardDescription>Last 6 months engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <EngagementChart />
        </CardContent>
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
    if (profile && profile.timezone === null) {
      setShowWalkthrough(true);
    }
  }, [profile]);

  // Handle walkthrough completion
  const handleWalkthroughComplete = async () => {
    try {
      // FIXED: No longer setting timezone - we'll keep the user-selected timezone from the dropdown
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
