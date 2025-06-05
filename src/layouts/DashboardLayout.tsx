import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ManualNewsletterDialog from '@/components/newsletter/ManualNewsletterDialog';
import TweetGenerationPanel from '@/components/tweets/TweetGenerationPanel';
import FeedbackDialog from '@/components/feedback/FeedbackDialog';

const DashboardLayout = () => {
  const { authState, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isManualGenerationOpen, setIsManualGenerationOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isTweetPanelOpen, setIsTweetPanelOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const profile = authState.profile;
  const initials = profile?.twitter_username
    ? profile.twitter_username.substring(0, 2).toUpperCase()
    : 'LN';
  const isNewsletterPlatform = profile?.is_newsletter_platform;
  const isCreatorPlatform = profile?.is_creator_platform;
  const isSubscribed = profile?.subscribed;
  
  // Check if user has the required subscription tier
  const hasRequiredTier = profile?.subscription_tier === "Newsletter Standard" || 
                          profile?.subscription_tier === "Newsletter Premium";

  // Listen for topic selection events
  useEffect(() => {
    const handleTopicSelected = (event: CustomEvent) => {
      const topic = event.detail;
      if (topic) {
        setSelectedTopic(topic);
        setIsTweetPanelOpen(true);
      }
    };

    window.addEventListener('topicSelected', handleTopicSelected as EventListener);

    return () => {
      window.removeEventListener('topicSelected', handleTopicSelected as EventListener);
    };
  }, []);

  // Add swipe gesture support for mobile
  useEffect(() => {
    if (!isMobile) return;

    let startX = 0;
    let currentX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (!mobileMenuOpen) return;
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mobileMenuOpen) return;
      currentX = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (!mobileMenuOpen) return;
      const diffX = startX - currentX;
      if (diffX > 50) { // Swipe left to close
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, mobileMenuOpen]);

  const handleSignOut = () => {
    signOut();
  };

  const handleCreateNewsletter = () => {
    if (!hasRequiredTier) {
      toast.error("Subscription Required", {
        description: "Please upgrade to Newsletter Standard or Premium to create newsletters.",
      });
      return;
    }
    
    if (profile?.remaining_newsletter_generations && profile.remaining_newsletter_generations > 0) {
      setIsManualGenerationOpen(true);
    } else {
      toast.error("No Generations Available", {
        description: "You don't have any remaining newsletter generations. Please upgrade your plan.",
      });
    }
    
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };
  
  // Function to handle subscription management or checkout based on subscription status
  const handleManageSubscription = async () => {
    // If user is already subscribed, direct to customer portal
    if (isSubscribed) {
      setIsPortalLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("customer-portal");
        
        if (error) {
          console.error("Error opening customer portal:", error);
          toast.error("Could not open subscription management portal");
          return;
        }
        
        if (data?.url) {
          // Close mobile menu before navigation
          if (isMobile && mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
          
          // Use different navigation strategy for mobile vs desktop
          if (isMobile) {
            // On mobile, navigate in the same tab to avoid popup blocking
            window.location.href = data.url;
          } else {
            // On desktop, try to open in new tab with fallback
            try {
              const popup = window.open(data.url, "_blank");
              if (!popup || popup.closed || typeof popup.closed === "undefined") {
                // Popup was blocked, fallback to same tab
                window.location.href = data.url;
                toast("Popup blocked - redirecting in current tab", {
                  description: "Please allow popups for this site for better experience."
                });
              }
            } catch (popupError) {
              // Fallback to same tab navigation
              window.location.href = data.url;
            }
          }
        }
      } catch (error) {
        console.error("Error in handleManageSubscription:", error);
        toast.error("Something went wrong");
      } finally {
        setIsPortalLoading(false);
      }
    } 
    // If user is not subscribed, direct to checkout
    else {
      setIsCheckoutLoading(true);
      try {
        // Determine which price ID to use based on platform type
        let priceId = "price_1RQUm7DBIslKIY5sNlWTFrQH"; // Default to Newsletter Standard
        
        if (isCreatorPlatform) {
          priceId = "price_1RRXZ2DBIslKIY5s4gxpBlME"; // Creator platform price
        }
        
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { 
            priceId,
            platform: isCreatorPlatform ? "creator" : "newsletter"
          }
        });
        
        if (error) {
          console.error("Error creating checkout session:", error);
          toast.error("Could not create checkout session");
          return;
        }
        
        if (data?.url) {
          // Close mobile menu before navigation
          if (isMobile && mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
          
          // Use different navigation strategy for mobile vs desktop
          if (isMobile) {
            // On mobile, navigate in the same tab to avoid popup blocking
            window.location.href = data.url;
          } else {
            // On desktop, try to open in new tab with fallback
            try {
              const popup = window.open(data.url, "_blank");
              if (!popup || popup.closed || typeof popup.closed === "undefined") {
                // Popup was blocked, fallback to same tab
                window.location.href = data.url;
                toast("Popup blocked - redirecting in current tab", {
                  description: "Please allow popups for this site for better experience."
                });
              } else {
                toast("Checkout opened in a new tab", {
                  description: "If the checkout window doesn't open, please check your popup blocker."
                });
              }
            } catch (popupError) {
              // Fallback to same tab navigation
              window.location.href = data.url;
            }
          }
        }
      } catch (error) {
        console.error("Error in handleCheckout:", error);
        toast.error("Something went wrong");
      } finally {
        setIsCheckoutLoading(false);
      }
    }
  };

  // Create sidebar items array conditionally based on platform type
  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard/home' },
    { icon: Book, label: 'Library', path: '/dashboard/analytics' },
    ...(isCreatorPlatform 
        ? [{ icon: TrendingUp, label: 'Trending Topics', path: '/dashboard/community' }] 
        : !isNewsletterPlatform 
          ? [{ icon: Users, label: 'Community', path: '/dashboard/community' }]
          : []),
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setIsTweetPanelOpen(true);
  };

  const handleCloseTweetPanel = () => {
    setIsTweetPanelOpen(false);
  };

  const shouldShowExpanded = !isMobile ? expanded : mobileMenuOpen;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ManualNewsletterDialog
        open={isManualGenerationOpen}
        onOpenChange={setIsManualGenerationOpen}
        remainingGenerations={profile?.remaining_newsletter_generations || 0}
      />
      
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hover:bg-gray-100 transition-colors duration-200"
          >
            <Menu size={20} />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logoo.png" 
              alt="Letternest Logo" 
              className="h-8 w-8 transition-transform duration-200 hover:scale-105"
            />
            <span className="font-bold text-xl">
              <span className="text-black">letter</span>
              <span className="text-[#FF6B35]">nest</span>
            </span>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-gray-200 transition-all duration-200">
              <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Enhanced Sidebar */}
        <aside 
          className={cn(
            "bg-gradient-to-b from-[#181F2C] to-[#1a2332] text-white z-30 flex flex-col transition-all duration-300 ease-out shadow-xl",
            isMobile 
              ? "fixed inset-y-0 left-0 w-56" 
              : shouldShowExpanded ? "w-56" : "w-16",
            isMobile && !mobileMenuOpen && "transform -translate-x-full",
            isMobile && mobileMenuOpen && "transform translate-x-0"
          )}
          onMouseEnter={() => !isMobile && setExpanded(true)}
          onMouseLeave={() => !isMobile && setExpanded(false)}
        >
          {/* Enhanced Logo Section */}
          <div className={cn(
            "flex items-center gap-3 p-4 border-b border-gray-600/50",
            shouldShowExpanded ? "justify-center" : "justify-center"
          )}>
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src="/logoo.png" 
                alt="Letternest Logo" 
                className="h-8 w-8 shrink-0 transition-transform duration-200 group-hover:scale-110"
              />
              {shouldShowExpanded && (
                <span className="font-bold text-xl whitespace-nowrap animate-fade-in">
                  <span className="text-white">letter</span>
                  <span className="text-[#FF6B35]">nest</span>
                </span>
              )}
            </Link>
          </div>

          {/* Enhanced Feedback Section */}
          <div className="border-b border-gray-600/50">
            <div className="p-3">
              <FeedbackDialog>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full text-white hover:bg-white/10 transition-all duration-200 bg-white/5 border border-gray-600/50 rounded hover:scale-[1.02] hover:shadow-lg hover:border-gray-500/50",
                    shouldShowExpanded ? "justify-center" : "justify-center px-0"
                  )}
                >
                  <MessageSquare size={16} className={cn("shrink-0", shouldShowExpanded && "mr-2")} />
                  {shouldShowExpanded && (
                    <span className="overflow-hidden whitespace-nowrap font-medium animate-fade-in">Feedback</span>
                  )}
                </Button>
              </FeedbackDialog>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <nav className="flex-1 py-6">
            <ul className="space-y-2 px-3">
              {isNewsletterPlatform && (
                <li>
                  <Button
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-white rounded transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
                      shouldShowExpanded ? "justify-center" : "justify-center px-0",
                      hasRequiredTier 
                        ? "bg-gradient-to-r from-[#FF6B35] to-[#ff5722] hover:from-[#ff5722] hover:to-[#e64a19] shadow-md" 
                        : "bg-[#FF6B35]/40 text-white/70 cursor-not-allowed"
                    )}
                    onClick={handleCreateNewsletter}
                    disabled={!hasRequiredTier}
                  >
                    <Bookmark size={20} />
                    {shouldShowExpanded && (
                      <span className="overflow-hidden whitespace-nowrap font-medium animate-fade-in">Quick Create</span>
                    )}
                  </Button>
                </li>
              )}
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.label}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded transition-all duration-200 hover:scale-[1.02] hover:shadow-md group",
                        isActive && "bg-gradient-to-r from-[#0087C8] to-[#006fa8] hover:from-[#006fa8] hover:to-[#005a8b] shadow-md",
                        shouldShowExpanded ? "justify-center" : "justify-center px-0"
                      )}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <item.icon size={22} className="transition-transform duration-200 group-hover:scale-110" />
                      {shouldShowExpanded && (
                        <span className="overflow-hidden whitespace-nowrap font-medium text-base animate-fade-in">{item.label}</span>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Enhanced User Profile Section */}
          <div className={cn(
            "border-t border-gray-600/50 p-4 space-y-4",
            !shouldShowExpanded && !isMobile && "flex flex-col items-center"
          )}>
            {/* Enhanced Subscription Button */}
            <Button 
              variant="ghost" 
              className={cn(
                "w-full text-white hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-md rounded border border-gray-600/30 hover:border-gray-500/50",
                shouldShowExpanded ? "justify-center" : "justify-center px-0",
                isSubscribed ? "text-green-400 hover:text-green-300 bg-green-900/20" : "text-amber-400 hover:text-amber-300 bg-amber-900/20"
              )}
              onClick={handleManageSubscription}
              disabled={isPortalLoading || isCheckoutLoading}
            >
              {shouldShowExpanded && (
                <span className="overflow-hidden whitespace-nowrap font-medium animate-fade-in">
                  {isSubscribed ? "Manage Subscription" : "Upgrade Subscription"}
                </span>
              )}
            </Button>
            
            {/* Enhanced Profile Display */}
            {shouldShowExpanded ? (
              <div className="flex items-center gap-3 p-2 rounded bg-white/5 hover:bg-white/10 transition-colors duration-200 justify-center">
                <Avatar className="h-10 w-10 border-2 border-gray-600 ring-2 ring-transparent hover:ring-gray-500 transition-all duration-200">
                  <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden text-center">
                  <p className="font-medium text-sm text-white truncate">{profile?.twitter_username || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">@{profile?.twitter_handle || 'handle'}</p>
                </div>
              </div>
            ) : !isMobile && (
              <div className="flex justify-center w-full">
                <Avatar className="h-10 w-10 border-2 border-gray-600 ring-2 ring-transparent hover:ring-gray-500 transition-all duration-200 hover:scale-105">
                  <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Enhanced Sign Out Button */}
            <Button 
              variant="ghost" 
              className={cn(
                "w-full text-white hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-md rounded border border-gray-600/30 hover:border-red-500/50",
                shouldShowExpanded ? "justify-center" : "justify-center px-0"
              )}
              onClick={handleSignOut}
            >
              <LogOut size={16} className={cn("shrink-0 transition-transform duration-200 hover:scale-110", shouldShowExpanded && "mr-2")} />
              {shouldShowExpanded && <span className="font-medium animate-fade-in">Sign out</span>}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col overflow-y-auto bg-gray-50 transition-all duration-300 relative",
          isMobile && mobileMenuOpen && "filter blur-sm"
        )}>
          {/* Enhanced Desktop Header */}
          <header className="hidden lg:flex items-center justify-end p-4 bg-white border-b shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 hover:scale-105 transition-all duration-200">
                <Bell size={20} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded p-2 transition-all duration-200 hover:scale-[1.02]">
                    <span className="text-sm font-medium text-gray-700">
                      {profile?.twitter_username || 'User'}
                    </span>
                    <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-gray-200 transition-all duration-200">
                      <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Tweet Generation Panel for Creator Platform */}
      {isCreatorPlatform && (
        <TweetGenerationPanel 
          onTopicSelect={handleTopicSelect}
          selectedTopic={selectedTopic}
          isOpen={isTweetPanelOpen}
          onClose={handleCloseTweetPanel}
        />
      )}

      {/* Enhanced Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-all duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
