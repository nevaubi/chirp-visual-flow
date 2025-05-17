
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Followers</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Twitter</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{profile?.follower_count?.toLocaleString() || '0'}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Following</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Twitter</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{profile?.following_count?.toLocaleString() || '0'}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Twitter</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${profile?.is_verified ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <p className="text-lg font-semibold text-gray-900">{profile?.is_verified ? 'Verified' : 'Standard'}</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
        
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
      </div>
    </div>
  );
};

export default DashboardHome;
