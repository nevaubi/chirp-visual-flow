import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  // Enhanced Modern Clean Card Component
  const ModernCleanCard = () => (
    <div className="bg-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Decorative Header */}
      <div className="bg-gray-50 p-5 m-5 rounded-[10px] flex flex-col items-center justify-center">
        <div className="w-[30%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[25%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[35%] h-1.5 bg-gray-300 rounded-full"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Modern Clean</h2>
        <p className="text-gray-500 text-sm mb-5">A minimalist design perfect for tech and startup newsletters</p>
      </div>

      {/* Enhanced Preview */}
      <div className="mx-5 mb-6 p-4 bg-gray-50 rounded-[10px] flex-1 flex flex-col justify-between">
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[60%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-full"></div>
        </div>
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[60%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
        </div>
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
          <div className="h-2 bg-gray-300 rounded w-[60%]"></div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-5 mb-5">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Features:</h3>
        <ul className="list-none p-0 m-0">
          {["Clean typography", "Minimal layout", "Mobile optimized"].map((feature, index) => (
            <li key={index} className="relative pl-5 mb-2 text-xs text-gray-600">
              <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2 h-[40px] bg-[#0078d7] hover:bg-[#106ebe] text-white rounded-full text-sm font-medium"
          onClick={() => handleUseTemplate(1, "Modern Clean")}
          disabled={loadingTemplate === "Modern Clean"}
        >
          {loadingTemplate === "Modern Clean" ? (
            <>
              <span className="mr-2">Generating...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            'Generate Pro Newsletter'
          )}
        </Button>
        <p className="text-center text-gray-400 text-xs italic mx-5 mb-4">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
  );

  // Enhanced Twin Focus Card Component
  const TwinFocusCard = () => (
    <div className="bg-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Decorative Header */}
      <div className="bg-gray-50 p-5 m-5 rounded-[10px] flex flex-col items-center justify-center">
        <div className="w-[30%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[25%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[35%] h-1.5 bg-gray-300 rounded-full"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Twin Focus</h2>
        <p className="text-gray-500 text-sm mb-5">A more structured perspective for visually appealing layouts</p>
      </div>

      {/* Enhanced Preview with Twin Focus Layout */}
      <div className="mx-5 mb-6 p-3 bg-gray-50 rounded-[10px] flex flex-col flex-1">
        {/* Two-column layout at top */}
        <div className="flex gap-4 mb-4 md:flex-row flex-col">
          {/* Left column with image and bullets */}
          <div className="flex-1 bg-gray-200 rounded-lg p-2.5 shadow-sm">
            {/* Grey image placeholder */}
            <div className="bg-gray-300 h-16 rounded-md mb-2.5"></div>
            {/* Three bullet points */}
            <div className="h-1.5 bg-gray-400 rounded w-[60%] ml-3 mb-2"></div>
            <div className="h-1.5 bg-gray-400 rounded w-[60%] ml-3 mb-2"></div>
            <div className="h-1.5 bg-gray-400 rounded w-[60%] ml-3"></div>
          </div>
          
          {/* Right column with text mockup */}
          <div className="flex-1 bg-gray-200 rounded-lg p-2.5 shadow-sm">
            <div className="h-1.5 bg-gray-350 rounded w-[80%] mb-2"></div>
            <div className="h-1.5 bg-gray-350 rounded w-full mb-2"></div>
            <div className="h-1.5 bg-gray-350 rounded w-[60%] mb-2"></div>
            <div className="h-1.5 bg-gray-350 rounded w-[80%] mb-2"></div>
            <div className="h-1.5 bg-gray-350 rounded w-[60%]"></div>
          </div>
        </div>
        
        {/* First horizontal section */}
        <div className="bg-gray-100 p-2 rounded-md mb-2.5">
          <div className="h-1.5 bg-gray-300 rounded w-[80%] mb-2"></div>
          <div className="h-1.5 bg-gray-300 rounded w-[60%]"></div>
        </div>
        
        {/* Second horizontal section */}
        <div className="p-2">
          <div className="h-1.5 bg-gray-300 rounded w-[80%] mb-2"></div>
          <div className="h-1.5 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-1.5 bg-gray-300 rounded w-[60%]"></div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-5 mb-5">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Features:</h3>
        <ul className="list-none p-0 m-0">
          {["Dual-column structure", "Visual content blocks", "Clean separation"].map((feature, index) => (
            <li key={index} className="relative pl-5 mb-2 text-xs text-gray-600">
              <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2 h-[40px] bg-[#0078d7] hover:bg-[#106ebe] text-white rounded-full text-sm font-medium"
          onClick={() => handleUseTemplate(2, "Twin Focus")}
          disabled={loadingTemplate === "Twin Focus"}
        >
          {loadingTemplate === "Twin Focus" ? (
            <>
              <span className="mr-2">Generating...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            'Generate Pro Newsletter'
          )}
        </Button>
        <p className="text-center text-gray-400 text-xs italic mx-5 mb-4">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
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

      {/* Main content grid - Manual Newsletter Generation and Pro Templates */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Manual Newsletter Generation */}
        <div className="xl:col-span-1">
          <Card className="border border-gray-200 bg-white shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Generate Newsletter Manually
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Instantly trigger a newsletter from your saved bookmarks. It will be sent to your email and displayed here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-md p-3 text-sm text-[#FF6B35]">
                <p>Make sure you've already saved the bookmarks you'd like to include in your newsletter.</p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">How many of your most recent bookmarks to use:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[10, 20, 30].map((count) => (
                    <div
                      key={count}
                      onClick={() => setSelectedCount(count)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCount === count
                          ? 'border-[#FF6B35] bg-[#FF6B35]/10'
                          : 'border-gray-200 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5'
                      }`}
                    >
                      <div className="text-2xl font-bold mb-2">{count}</div>
                      <div className="text-sm text-gray-600">tweets</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-500">
                {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
              </div>
              <Button 
                onClick={handleGenerateNewsletter}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                disabled={remainingGenerations <= 0}
              >
                Generate Newsletter
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Pro Templates */}
        <div className="xl:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Pro Templates</h2>
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">Premium</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ModernCleanCard />
              <TwinFocusCard />
            </div>
          </div>
        </div>
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
