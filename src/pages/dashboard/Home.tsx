import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Clock, AlertCircle, Info, Twitter, Bookmark, TrendingUp, Zap, Shield, Lock } from 'lucide-react';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
import WelcomeNewUserPopup from '@/components/auth/WelcomeNewUserPopup';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ManualNewsletterDialog from '@/components/newsletter/ManualNewsletterDialog';

// Newsletter Platform Dashboard - enhanced version
const NewsletterDashboard = ({ profile }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState(10);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const { refreshProfile } = useAuth();

  // Check if user has a subscription
  const isSubscribed = profile?.subscribed;
  const subscriptionTier = profile?.subscription_tier;
  const isPremium = subscriptionTier === "Newsletter Premium";
  const isFreePlan = !isSubscribed;
  
  // Number of remaining manual generations
  const remainingGenerations = profile?.remaining_newsletter_generations || 0;
  
  // Check if user has required subscription tier for pro templates
  const hasRequiredTier = profile?.subscription_tier === "Newsletter Standard" || 
                          profile?.subscription_tier === "Newsletter Premium";

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

  const handleGenerateNewsletter = () => {
    setShowManualDialog(true);
  };

  const handleUseTemplate = async (templateId: number, templateName: string) => {
    // Check if user has required subscription tier
    if (!hasRequiredTier) {
      toast.error("Subscription Required", {
        description: "Please upgrade to Newsletter Standard or Premium to use templates.",
      });
      return;
    }

    if (!profile?.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      toast.error("No Generations Available", {
        description: "You don't have any remaining newsletter generations. Please upgrade your plan.",
      });
      return;
    }

    // Handle different templates
    if (templateId === 1) {
      // Modern Clean template
      setLoadingTemplate(templateName);
      
      try {
        const selectedCount = 20;
        console.log(`Using ${templateName} template with ${selectedCount} bookmarks`);

        const { data, error } = await supabase.functions.invoke('template-modern-clean', {
          body: { selectedCount },
        });

        if (error) {
          console.error(`Error generating ${templateName} newsletter:`, error);
          toast.error(`Failed to generate ${templateName} newsletter`, {
            description: error.message || 'Please try again later',
          });
          return;
        }

        if (data.error) {
          console.error(`Function returned error:`, data.error);
          toast.error(`Failed to generate ${templateName} newsletter`, {
            description: data.error,
          });
          return;
        }

        toast.success(`${templateName} Newsletter Generated!`, {
          description: `Your ${templateName.toLowerCase()} newsletter is being processed and will be available in your Library and email soon.`,
        });

      } catch (error) {
        console.error(`Error in handleUseTemplate for ${templateName}:`, error);
        toast.error(`Failed to generate ${templateName} newsletter`, {
          description: 'An unexpected error occurred. Please try again later.',
        });
      } finally {
        setLoadingTemplate(null);
      }
    } else if (templateId === 2) {
      // Twin Focus template
      setLoadingTemplate(templateName);
      
      try {
        const selectedCount = 20;
        console.log(`Using ${templateName} template with ${selectedCount} bookmarks`);

        const { data, error } = await supabase.functions.invoke('template-twin-focus', {
          body: { selectedCount },
        });

        if (error) {
          console.error(`Error generating ${templateName} newsletter:`, error);
          toast.error(`Failed to generate ${templateName} newsletter`, {
            description: error.message || 'Please try again later',
          });
          return;
        }

        if (data.error) {
          console.error(`Function returned error:`, data.error);
          toast.error(`Failed to generate ${templateName} newsletter`, {
            description: data.error,
          });
          return;
        }

        toast.success(`${templateName} Newsletter Generated!`, {
          description: `Your ${templateName.toLowerCase()} newsletter is being processed and will be available in your Library and email soon.`,
        });

      } catch (error) {
        console.error(`Error in handleUseTemplate for ${templateName}:`, error);
        toast.error(`Failed to generate ${templateName} newsletter`, {
          description: 'An unexpected error occurred. Please try again later.',
        });
      } finally {
        setLoadingTemplate(null);
      }
    }
  };

  // Standardized Newsletter Card Component
  const NewsletterCard = ({ 
    title, 
    description, 
    templateId, 
    templateName, 
    buttonText, 
    isManual = false, 
    templateNumber,
    avgLengthActive = 5,
    researchDepthActive = 5,
    mediaActive = 3,
    isLocked = false
  }) => {
    // Determine if this template should be disabled
    const isDisabled = isLocked || (isManual && remainingGenerations <= 0);
    
    return (
      <Card className={`bg-white rounded-xl shadow-sm h-full flex flex-col relative ${
        isLocked ? 'opacity-60 border-dashed border-gray-300' : ''
      }`}>
        {isLocked && (
          <>
            <div className="absolute inset-0 bg-gray-200/30 rounded-xl z-10"></div>
            <div className="absolute top-4 right-4 z-20">
              <Lock className="w-5 h-5 text-gray-500" />
            </div>
          </>
        )}
        
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">
            {title}
          </CardTitle>
          <div className="flex gap-2">
            {templateNumber && (
              <Badge variant="secondary" className="w-fit text-xs">
                Template {templateNumber}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="secondary" className="w-fit text-xs bg-amber-100 text-amber-800 border-amber-200">
                Premium
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm text-gray-600">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          {/* Enhanced Content Preview Area */}
          <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded-full w-full"></div>
                <div className="h-4 bg-gray-200 rounded-full w-4/5"></div>
                <div className="h-4 bg-gray-200 rounded-full w-full"></div>
                <div className="h-4 bg-gray-200 rounded-full w-2/5"></div>
                <div className="h-4 bg-gray-200 rounded-full w-full"></div>
                <div className="h-4 bg-gray-200 rounded-full w-3/5"></div>
              </div>
            </ScrollArea>
          </div>

          {/* Enhanced Metrics Display */}
          <div className="space-y-3">
            {/* Avg Length */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Avg Length</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`text-base ${i >= avgLengthActive ? 'opacity-20' : ''}`}
                  >
                    📄
                  </span>
                ))}
              </div>
            </div>
            
            {/* Research Depth */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Research Depth</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`text-base ${i >= researchDepthActive ? 'opacity-20' : ''}`}
                  >
                    🔍
                  </span>
                ))}
              </div>
            </div>
            
            {/* Media */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Media</span>
              <div className="flex space-x-2">
                {['📝', '🖼️', '📊'].map((emoji, i) => (
                  <span 
                    key={i} 
                    className={`text-base ${i >= mediaActive ? 'opacity-20' : ''}`}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center gap-3 pt-4">
          {isLocked && (
            <div className="w-full text-center mb-2">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                🔓 Upgrade to unlock
              </Badge>
            </div>
          )}
          
          <Button 
            onClick={isLocked ? undefined : (isManual ? handleGenerateNewsletter : () => handleUseTemplate(templateId, templateName))}
            className={`w-full font-medium py-3 px-4 rounded-full transition-all duration-200 transform hover:scale-[1.02] hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
              isDisabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : isManual 
                  ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white" 
                  : "bg-[#0078d7] hover:bg-[#106ebe] text-white"
            }`}
            disabled={isDisabled || (isManual ? remainingGenerations <= 0 : loadingTemplate === templateName)}
          >
            {!isManual && loadingTemplate === templateName ? (
              <>
                <span className="mr-2">Generating...</span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : isLocked ? (
              "Upgrade Required"
            ) : isManual && remainingGenerations <= 0 ? (
              "No Generations Left"
            ) : (
              buttonText
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header row with welcome text on left and instructions on right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left - Welcome text - updated from "Welcome to Newsletters" to "Welcome" */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile?.twitter_username || 'User'}</h1>
        </div>

        {/* Right - Instructions */}
        <div className="text-center lg:text-right">
          <p className="text-base text-gray-600 mb-2">To generate newsletters you need to:</p>
          <div className="flex flex-col lg:flex-row lg:gap-6 gap-2">
            <div className="flex items-center justify-center lg:justify-end gap-2">
              <span>Authorize X access via popup</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
                1
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end gap-2">
              <span>Upgrade to subscription</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-semibold">
                2
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid - 3 equal columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Newsletter Generation - Classic Layout (3/5, 3/5, 2/3) */}
        <NewsletterCard
          title="Classic Layout"
          description="Manually generate a newsletter with your chosen bookmark count - clean, structured layout for polished daily reading."
          templateId={null}
          templateName=""
          buttonText="Generate Newsletter"
          isManual={true}
          templateNumber="1"
          avgLengthActive={3}
          researchDepthActive={3}
          mediaActive={2}
          isLocked={false}
        />

        {/* Twin Focus Template - Daily Bytes (3/5, 4/5, 2/3) */}
        <NewsletterCard
          title="Daily Bytes"
          description="A sleek, balanced layout designed for fast yet detailed insights—built to inform, not overload."
          templateId={2}
          templateName="Twin Focus"
          buttonText="Generate Newsletter"
          isManual={false}
          templateNumber="2"
          avgLengthActive={3}
          researchDepthActive={4}
          mediaActive={2}
          isLocked={isFreePlan}
        />

        {/* Modern Clean Template - Weekly Lens (4/5, 5/5, 2/3) */}
        <NewsletterCard
          title="Weekly Lens"
          description="A minimalist design with white background and clean formatting, perfect for audiences or production use cases"
          templateId={1}
          templateName="Modern Clean"
          buttonText="Generate Newsletter"
          isManual={false}
          templateNumber="3"
          avgLengthActive={4}
          researchDepthActive={5}
          mediaActive={2}
          isLocked={isFreePlan}
        />
      </div>

      {/* Add processing status card when a newsletter is being generated */}
      {(isLoading || loadingTemplate) && (
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

      {/* Manual Newsletter Dialog */}
      <ManualNewsletterDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        remainingGenerations={remainingGenerations}
      />
    </div>
  );
};

const DashboardHome = () => {
  const { authState, updateProfile, refreshProfile } = useAuth();
  const profile = authState.profile;
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showWelcomeNewUser, setShowWelcomeNewUser] = useState(false);

  // Check if we need to show the welcome popup for first-time users
  useEffect(() => {
    if (profile) {
      // Show welcome popup if this is a first-time user
      if (profile.first_time_login === true) {
        setShowWelcomeNewUser(true);
      }
      
      // For newsletter platform: show walkthrough if twitter_bookmark_access_token is null
      // Only show if not showing the welcome popup
      if (!profile.first_time_login && profile.twitter_bookmark_access_token === null) {
        setShowWalkthrough(true);
      }
    }
  }, [profile]);

  // Handle welcome popup "Got it" button click
  const handleWelcomeGotIt = async () => {
    try {
      // Update the profile to set first_time_login to false
      await updateProfile({ first_time_login: false });
      
      // Hide the welcome popup
      setShowWelcomeNewUser(false);
      
      // Now check if we should show the walkthrough popup
      if (profile && profile.twitter_bookmark_access_token === null) {
        setShowWalkthrough(true);
      }
    } catch (error) {
      console.error("Error updating first_time_login:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Handle walkthrough completion
  const handleWalkthroughComplete = async () => {
    try {
      // Simply close the walkthrough popup without modifying any profile data
      setShowWalkthrough(false);
    } catch (error) {
      console.error("Error updating timezone:", error);
    }
  };

  return (
    <>
      <NewsletterDashboard profile={profile} />
      
      {/* Welcome popup for first-time users - highest priority, non-closable */}
      {showWelcomeNewUser && (
        <WelcomeNewUserPopup 
          open={showWelcomeNewUser} 
          onGotIt={handleWelcomeGotIt}
        />
      )}
      
      {/* Walkthrough popup - lower priority, only shown after welcome is dismissed */}
      {showWalkthrough && !showWelcomeNewUser && (
        <WalkthroughPopup 
          open={showWalkthrough} 
          onComplete={handleWalkthroughComplete} 
          isCreatorPlatform={false}
        />
      )}
    </>
  );
};

export default DashboardHome;
