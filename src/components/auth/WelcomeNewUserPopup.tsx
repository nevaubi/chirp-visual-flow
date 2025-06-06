
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Book, Settings } from 'lucide-react';

interface WelcomeNewUserPopupProps {
  open: boolean;
  onGotIt: () => void;
}

type AnimationPhase = 'welcome' | 'tabs' | 'cta' | 'button';

const WelcomeNewUserPopup = ({ open, onGotIt }: WelcomeNewUserPopupProps) => {
  const { authState } = useAuth();
  const [phase, setPhase] = useState<AnimationPhase>('welcome');
  const [showContent, setShowContent] = useState(true);

  const username = authState.profile?.twitter_username || 'User';

  const tabs = [
    { name: 'Home', description: 'Generate newsletters', icon: Home },
    { name: 'Library', description: 'Saved newsletters', icon: Book },
    { name: 'Settings', description: 'Manage subscriptions', icon: Settings }
  ];

  useEffect(() => {
    if (!open) {
      setPhase('welcome');
      setShowContent(true);
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    // Welcome phase - show for 2 seconds
    timers.push(setTimeout(() => {
      setShowContent(false);
      setTimeout(() => {
        setPhase('tabs');
        setShowContent(true);
      }, 300);
    }, 2000));

    // Tabs phase - show for 5 seconds (increased from 3)
    timers.push(setTimeout(() => {
      setShowContent(false);
      setTimeout(() => {
        setPhase('cta');
        setShowContent(true);
      }, 300);
    }, 7300)); // Updated timing: 2000 + 300 + 5000

    // CTA phase - show for 2 seconds then show button
    timers.push(setTimeout(() => {
      setPhase('button');
    }, 9300)); // Updated timing: 7300 + 2000

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [open]);

  const renderContent = () => {
    switch (phase) {
      case 'welcome':
        return (
          <div className={`text-center transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Hi {username}!
            </h2>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome to letter<span className="text-[#FF6B35]">nest</span> 🎉
            </h3>
          </div>
        );

      case 'tabs':
        return (
          <div className={`text-center transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Explore our features:
            </h3>
            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
              {/* Left column - Sidebar-style tabs */}
              <div className="space-y-2">
                {tabs.map((tab, index) => {
                  const IconComponent = tab.icon;
                  return (
                    <div 
                      key={tab.name}
                      className="bg-[#1A1F2C] text-white p-3 rounded-lg flex items-center gap-3 animate-fade-in h-12"
                      style={{ 
                        animationDelay: `${index * 0.2}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm">{tab.name}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Right column - Descriptions */}
              <div className="space-y-2 text-left">
                {tabs.map((tab, index) => (
                  <div 
                    key={`${tab.name}-desc`}
                    className="p-3 flex items-center h-12 animate-fade-in"
                    style={{ 
                      animationDelay: `${index * 0.2 + 0.1}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    <p className="text-sm text-gray-600">{tab.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="text-center transition-opacity duration-300">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Try out our site with 3 free newsletters, just auth and you're good to go!
            </h3>
          </div>
        );

      case 'button':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Try out our site with 3 free newsletters, just auth and you're good to go!
            </h3>
            <Button 
              onClick={onGotIt}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] shadow-lg animate-fade-in"
            >
              Got it!
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={() => {}} // Prevent closing by any means
    >
      <DialogContent 
        className="sm:max-w-md bg-white rounded-lg shadow-xl border-0"
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={{ zIndex: 9999 }} // Higher z-index than any other popup
      >
        <div className="p-6 min-h-[300px] flex items-center justify-center">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeNewUserPopup;
