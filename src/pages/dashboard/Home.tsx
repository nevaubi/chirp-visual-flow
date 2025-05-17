
import { useAuth } from '@/contexts/AuthContext';
import { BarChart2, Users, Activity, Twitter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DashboardHome = () => {
  const { authState } = useAuth();
  const profile = authState.profile;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.twitter_username || 'User'}</h1>
          <p className="text-gray-600">Here's what's happening with your Twitter account</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Followers</CardTitle>
            <Twitter className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{profile?.follower_count?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-500 mt-1">+2.5% from last week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Following</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{profile?.following_count?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-500 mt-1">Steady growth</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">4.6%</div>
            <p className="text-xs text-gray-500 mt-1">+0.8% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Impressions</CardTitle>
            <BarChart2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">12.8K</div>
            <p className="text-xs text-gray-500 mt-1">+18% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your Twitter profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Username</h3>
              <p className="text-gray-900">{profile?.twitter_username || 'Not available'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Handle</h3>
              <p className="text-gray-900">@{profile?.twitter_handle || 'Not available'}</p>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
              <p className="text-gray-900">{profile?.bio || 'No bio available'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest Twitter interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center items-center h-40 bg-gray-50 rounded-md border border-dashed border-gray-200">
              <p className="text-gray-500">Activity data will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
