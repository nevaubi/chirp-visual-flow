
import { useAuth } from '@/contexts/AuthContext';
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
  ArrowDown
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

const DashboardHome = () => {
  const { authState } = useAuth();
  const profile = authState.profile;

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
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.twitter_username || 'User'}</h1>
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

export default DashboardHome;
