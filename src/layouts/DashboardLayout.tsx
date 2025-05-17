
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, BarChart2, Home, Users, Settings } from 'lucide-react';

const DashboardLayout = () => {
  const { authState, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const profile = authState.profile;
  const initials = profile?.twitter_username 
    ? profile.twitter_username.substring(0, 2).toUpperCase() 
    : 'CM';

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md text-gray-700"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-2 py-4 mb-8 border-b">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-8 w-8"
            />
            <span className="font-bold text-xl text-[#0087C8]">chirpmetrics</span>
          </div>

          <nav className="flex-1 space-y-1">
            <a
              href="/dashboard/home"
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-[#0087C8] rounded-md transition-colors"
            >
              <Home size={18} />
              <span>Home</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-[#0087C8] rounded-md transition-colors"
            >
              <BarChart2 size={18} />
              <span>Analytics</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-[#0087C8] rounded-md transition-colors"
            >
              <Users size={18} />
              <span>Community</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-[#0087C8] rounded-md transition-colors"
            >
              <Settings size={18} />
              <span>Settings</span>
            </a>
          </nav>

          {/* User profile */}
          <div className="mt-auto border-t pt-4">
            {profile && (
              <div className="flex items-center gap-2 mb-4">
                <Avatar className="h-10 w-10 border border-gray-200">
                  <AvatarImage src={profile.twitter_profilepic_url || undefined} alt={profile.twitter_username || 'User'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm text-gray-900 truncate">{profile.twitter_username}</p>
                  <p className="text-xs text-gray-500 truncate">@{profile.twitter_handle}</p>
                </div>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start text-gray-700" 
              onClick={signOut}
            >
              <LogOut size={16} className="mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'lg:ml-64' : ''
      } ml-0 lg:ml-64`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* Overlay to close sidebar on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
