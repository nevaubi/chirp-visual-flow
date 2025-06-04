import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, CreditCard, Clock, AlertCircle, Info, Twitter, Bookmark, TrendingUp, Zap, Shield } from 'lucide-react';
import WalkthroughPopup from '@/components/auth/WalkthroughPopup';
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
  const NewsletterCard = ({ title, description, templateId, templateName, buttonText, isManual = false }) => (
    <Card className="border border-gray-200 bg-white shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {isManual && (
          null
        )}

        {/* Scrollable Container */}
        <div className="border border-gray-200 rounded-lg h-32 overflow-hidden">
          <ScrollArea className="h-full w-full p-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </ScrollArea>
        </div>

        {/* 2-Column Metrics Display */}
        <div className="space-y-3">
          {/* Avg Length */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Avg Length</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-sm">📜</span>
              ))}
            </div>
          </div>
          
          {/* Research Depth */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Research Depth</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-sm">🔍</span>
              ))}
            </div>
          </div>
          
          {/* Media */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Media</span>
            <div className="flex gap-1">
              <span className="text-sm">📝</span>
              <span className="text-sm">🖼️</span>
              <span className="text-sm">📽️</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-center gap-3 pt-4">
        {isManual && (
          <div className="text-sm text-gray-500">
            {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
          </div>
        )}
        
        <Button 
          onClick={isManual ? handleGenerateNewsletter : () => handleUseTemplate(templateId, templateName)}
          className={isManual ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white" : "bg-[#0078d7] hover:bg-[#106ebe] text-white"}
          disabled={isManual ? remainingGenerations <= 0 : loadingTemplate === templateName}
        >
          {!isManual && loadingTemplate === templateName ? (
            <>
              <span className="mr-2">Generating...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            buttonText
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header row with welcome text on left and instructions on right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left - Welcome text */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Newsletters, {profile?.twitter_username || 'User'}</h1>
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
        {/* Manual Newsletter Generation */}
        <NewsletterCard
          title="Generate Newsletter Manually"
          description="Instantly trigger a newsletter from your saved bookmarks. It will be sent to your email and displayed here."
          templateId={null}
          templateName=""
          buttonText="Generate Newsletter"
          isManual={true}
        />

        {/* Modern Clean Template */}
        <NewsletterCard
          title="Modern Clean"
          description="A minimalist design perfect for tech and startup newsletters"
          templateId={1}
          templateName="Modern Clean"
          buttonText="Generate Pro Newsletter"
          isManual={false}
        />

        {/* Twin Focus Template */}
        <NewsletterCard
          title="Twin Focus"
          description="A more structured perspective for visually appealing layouts"
          templateId={2}
          templateName="Twin Focus"
          buttonText="Generate Pro Newsletter"
          isManual={false}
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

  // Check if we need to show the walkthrough popup for newsletter platform
  useEffect(() => {
    if (profile) {
      // For newsletter platform: show walkthrough if twitter_bookmark_access_token is null
      setShowWalkthrough(profile.twitter_bookmark_access_token === null);
    }
  }, [profile]);

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
      
      {showWalkthrough && (
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
