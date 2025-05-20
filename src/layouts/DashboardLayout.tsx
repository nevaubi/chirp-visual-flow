import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart2,
  Home,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  Bookmark,
  Book,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ManualNewsletterDialog from '@/components/newsletter/ManualNewsletterDialog';

const DashboardLayout = () => {
  const { authState, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isManualGenerationOpen, setIsManualGenerationOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const profile = authState.profile;
  const initials = profile?.twitter_username
    ? profile.twitter_username.substring(0, 2).toUpperCase()
    : 'CM';
  const isNewsletterPlatform = profile?.is_newsletter_platform;
  const isCreatorPlatform = profile?.is_creator_platform;
  const isSubscribed = profile?.subscribed;
  
  // Check if user has the required subscription tier
  const hasRequiredTier = profile?.subscription_tier === "Newsletter Standard" || 
                          profile?.subscription_tier === "Newsletter Premium";

  // Check if the current device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setExpanded(false);
      }
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSignOut = () => {
    signOut();
  };

  const handleCreateNewsletter = () => {
    // Check if user has required subscription tier
    if (!hasRequiredTier) {
      toast.error("Subscription Required", {
        description: "Please upgrade to Newsletter Standard or Premium to create newsletters.",
      });
      return;
    }
    
    // Check if manual generation is available for the user
    if (profile?.remaining_newsletter_generations && profile.remaining_newsletter_generations > 0) {
      setIsManualGenerationOpen(true);
    } else {
      toast.error("No Generations Available", {
        description: "You don't have any remaining newsletter generations. Please upgrade your plan.",
      });
    }
  };
  
  // Function to handle subscription management via Stripe portal
  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
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
      setIsPortalLoading(false);
    }
  };

  // Create sidebar items array conditionally based on platform type
  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard/home' },
    { icon: Book, label: 'Library', path: '/dashboard/analytics' },
    // For Creator platform, show "Generate Tweets" instead of "Community"
    ...(isCreatorPlatform 
        ? [{ icon: Sparkles, label: 'Generate Tweets', path: '/dashboard/community' }] 
        : !isNewsletterPlatform 
          ? [{ icon: Users, label: 'Community', path: '/dashboard/community' }]
          : []),
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Manual Newsletter Generation Dialog */}
      <ManualNewsletterDialog
        open={isManualGenerationOpen}
        onOpenChange={setIsManualGenerationOpen}
        remainingGenerations={profile?.remaining_newsletter_generations || 0}
      />
      
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={20} />
          </Button>
          <img 
            src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
            alt="Chirpmetrics Logo" 
            className="h-8 w-8"
          />
          <span className="font-bold text-xl text-[#0087C8]">chirpmetrics</span>
        </div>
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-[#181F2C] text-white z-30 flex flex-col transition-all duration-300 ease-in-out",
            expanded ? "w-60" : "w-16",
            isMobile && "fixed inset-y-0 left-0",
            isMobile && !mobileMenuOpen && "transform -translate-x-full",
            isMobile && mobileMenuOpen && "transform translate-x-0"
          )}
          onMouseEnter={() => !isMobile && setExpanded(true)}
          onMouseLeave={() => !isMobile && setExpanded(false)}
        >
          {/* Logo */}
          <div className={cn(
            "flex items-center gap-2 p-4 border-b border-gray-700",
            !expanded && "justify-center"
          )}>
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-8 w-8 shrink-0"
            />
            {expanded && <span className="font-bold text-xl text-white whitespace-nowrap overflow-hidden">chirpmetrics</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6">
            {isNewsletterPlatform && (
              <Button
                className={cn(
                  "w-full mb-4 flex items-center gap-3 justify-start px-3",
                  !expanded && "justify-center px-0",
                  hasRequiredTier 
                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                    : "bg-amber-500/40 text-white/70 cursor-not-allowed"
                )}
                onClick={handleCreateNewsletter}
                disabled={!hasRequiredTier}
              >
                <Bookmark size={20} />
                {expanded && (
                  <span className="overflow-hidden whitespace-nowrap">Create Newsletter</span>
                )}
              </Button>
            )}
            <ul className="space-y-2 px-2">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.label}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full flex items-center gap-3 justify-start px-3 py-2 text-white hover:bg-white/10 rounded-md transition-colors",
                        isActive && "bg-[#0087C8] hover:bg-[#0087C8]/90",
                        !expanded && "justify-center px-0"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon size={20} />
                      {expanded && <span className="overflow-hidden whitespace-nowrap">{item.label}</span>}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className={cn(
            "mt-auto border-t border-gray-700 p-4",
            !expanded && "flex flex-col items-center"
          )}>
            {/* Subscription management button */}
            <Button 
              variant="ghost" 
              className={cn(
                "w-full mb-4 justify-start text-white hover:bg-white/10",
                !expanded && "justify-center px-0",
                isSubscribed ? "text-green-400 hover:text-green-300" : "text-amber-400 hover:text-amber-300"
              )}
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              <CreditCard size={16} className={cn("shrink-0", expanded && "mr-2")} />
              {expanded && (
                <span className="overflow-hidden whitespace-nowrap">
                  {isSubscribed ? "Manage Subscription" : "Upgrade Subscription"}
                </span>
              )}
            </Button>
            
            {expanded ? (
              <div className="flex items-center gap-2 mb-4">
                <Avatar className="h-9 w-9 border border-gray-700">
                  <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm text-white truncate">{profile?.twitter_username || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">@{profile?.twitter_handle || 'handle'}</p>
                </div>
              </div>
            ) : (
              <Avatar className="h-9 w-9 border border-gray-700 mb-4">
                <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start text-white hover:bg-white/10",
                !expanded && "justify-center px-0"
              )}
              onClick={handleSignOut}
            >
              <LogOut size={16} className={cn("shrink-0", expanded && "mr-2")} />
              {expanded && <span>Sign out</span>}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col overflow-y-auto bg-gray-50 transition-all duration-300 relative",
          isMobile && mobileMenuOpen && "filter blur-sm"
        )}>
          {/* Desktop Header - search bar removed */}
          <header className="hidden lg:flex items-center justify-end p-4 bg-white border-b gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-600">
                <Bell size={20} />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {profile?.twitter_username || 'User'}
                </span>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
