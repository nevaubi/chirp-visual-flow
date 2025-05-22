import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Twitter, BookOpen, BarChart2, Activity, Users, Check, Loader2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startPkceAuth } from "@/integrations/twitterPkce";

interface WalkthroughPopupProps {
  open: boolean;
  onComplete: () => Promise<void>;
  isCreatorPlatform: boolean;
}

const WalkthroughPopup = ({
  open,
  onComplete,
  isCreatorPlatform
}: WalkthroughPopupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Processing...");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const totalSteps = 4;
  const { toast } = useToast();
  const { authState, updateProfile } = useAuth();

  // Form state for creator platform step 4
  const [timezone, setTimezone] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [permission, setPermission] = useState<boolean>(false);

  // Reset form when opening the dialog
  useEffect(() => {
    if (open) {
      setTimezone("");
      setUsername("");
      setPermission(false);
      setVerificationError(null);
      setAnalysisError(null);
    }
  }, [open]);

  // Check if all required fields are filled for creator platform step 4
  const isCreatorFormValid = timezone && username && permission;

  const handleNextStep = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      // On final step completion
      // Check if we're in the creator platform and need to verify username
      if (isCreatorPlatform) {
        if (!isCreatorFormValid) {
          toast({
            title: "Missing information",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }

        setIsLoading(true);
        setLoadingMessage("Verifying username...");
        setVerificationError(null);
        setAnalysisError(null);
        
        try {
          // Add console.log to check if authState.user?.id exists
          console.log("authState.user?.id before API call:", authState.user?.id);
          
          if (!authState.user?.id) {
            throw new Error("User is not authenticated");
          }
          
          // Call the username verification edge function with user ID and timezone
          const { data, error } = await supabase.functions.invoke('username_verification', {
            body: { 
              username,
              userId: authState.user.id,
              timezone
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          if (!data.isValid) {
            setVerificationError(data.message || "Could not verify this username. Please check and try again.");
            setIsLoading(false);
            return;
          }
          
          // At this point, username is verified successfully and profile should be updated by the edge function
          toast({
            title: "Username verified",
            description: "Your profile has been updated with your Twitter information",
          });
          
          // Now that username is verified, start the profile analysis
          setLoadingMessage("Analyzing your Twitter profile...");
          
          try {
            // Call the initial profile analysis edge function
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke('initial-profile-analysis', {
              body: {
                userId: authState.user.id,
                twitterUsername: username,
                timezone
              }
            });
            
            if (analysisError) {
              throw new Error(analysisError.message);
            }
            
            if (!analysisData.success) {
              throw new Error(analysisData.error || "Profile analysis failed");
            }
            
            // Analysis completed successfully
            toast({
              title: "Analysis complete",
              description: "Your profile has been analyzed and insights are ready",
            });
            
          } catch (error) {
            console.error("Error during profile analysis:", error);
            setAnalysisError(error.message || "An error occurred during profile analysis. Your profile is still set up, but we couldn't complete the analysis.");
            
            // We'll continue with onComplete even if analysis fails
            toast({
              title: "Profile setup complete",
              description: "Your profile was set up, but we encountered an issue during analysis. You can try again later.",
              variant: "default",
            });
          }
          
          // Continue with onComplete
          await onComplete();
        } catch (error) {
          console.error("Error verifying username:", error);
          setVerificationError(error.message || "An error occurred during verification. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        // For newsletter platform, just update the timezone and complete
        setIsLoading(true);
        try {
          if (timezone) {
            await updateProfile({ timezone });
          }
          await onComplete();
        } catch (error) {
          console.error("Error updating timezone:", error);
          toast({
            title: "Error",
            description: "An error occurred while updating your preferences.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  // When requesting bookmarks consent we also persist the selected timezone
  // so it can be applied after the PKCE flow completes. This avoids the
  // walkthrough restarting from the first step on return.
  const handleBookmarksConsent = () => {
    if (timezone) {
      sessionStorage.setItem('selected_timezone', timezone);
    }
    startPkceAuth();
  };

  // Content based on platform and step
  const getContent = () => {
    if (isCreatorPlatform) {
      // Creator platform walkthrough content
      switch (currentStep) {
        case 1:
          return {
            icon: <Twitter className="h-10 w-10 text-[#0087C8]" />,
            title: "Dashboard Overview",
            description: "Profile analysis? Yes, but also, so much more. Let's get started.",
          };
        case 2:
          return {
            icon: <BarChart2 className="h-10 w-10 text-purple-500" />,
            title: "Analytics Insights",
            description: (
              <div className="text-left">
                <p>Right away we'll start with a profile scan for instant insights. You'll see:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>your best hour of the day for engagement</li>
                  <li>performance by tweet type (photo, video, text)</li>
                  <li>follower mapping and sentiment analysis (if paid)</li>
                  <li>data driven suggestions for growth</li>
                  <li>much more</li>
                </ul>
              </div>
            ),
          };
        case 3:
          return {
            icon: <Activity className="h-10 w-10 text-[#FF6B35]" />,
            title: "Tweet Generation",
            description: (
              <div className="text-left">
                <p>Our AI learns your 'voice profile' to write tweets you'd be proud to post:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>auto-create high quality tweets in your voice</li>
                  <li>daily trending topics based on your niche</li>
                  <li>niche-specific viral tweets to reply to</li>
                  <li>daily auto-refresh tweet inspiration</li>
                  <li>seamless and (soon) scheduled posting</li>
                </ul>
              </div>
            ),
          };
        case 4:
          return {
            icon: null,
            title: "All we need to get started is...",
            description: (
              <div className="text-left space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Your Timezone (for accurate info and posting):</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone" className="w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="Europe/London">Greenwich Mean Time (UTC+0)</SelectItem>
                      <SelectItem value="Europe/Paris">Central European Time (UTC+1)</SelectItem>
                      <SelectItem value="Asia/Shanghai">China Standard Time (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan Standard Time (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="handle">Your account handle '@' (of account you signed in with, for verification):</Label>
                  <Input 
                    id="handle" 
                    placeholder="@username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cn(verificationError && "border-red-500")}
                  />
                  {verificationError && (
                    <p className="text-sm text-red-500 mt-1">{verificationError}</p>
                  )}
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="permission" 
                    checked={permission}
                    onCheckedChange={(checked) => setPermission(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="permission" className="text-sm font-normal">
                      Your permission to allow Chirpmetrics to use only your public X data to guide your growth on X
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      <a href="#" className="text-blue-500 hover:underline">Terms of Service</a> & <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <p className="font-medium">Ready to get started?</p>
                </div>
              </div>
            ),
          };
        default:
          return { icon: null, title: "", description: "" };
      }
    } else {
      // Newsletter platform walkthrough content
      switch (currentStep) {
        case 1:
          return {
            icon: <BookOpen className="h-10 w-10 text-amber-500" />,
            title: "Newsletter Dashboard",
            description: "Personal use? Paying audience? We've got you. Meet the first auto-newsletter built from your X bookmarks.",
          };
        case 2:
          return {
            icon: <Twitter className="h-10 w-10 text-[#0087C8]" />,
            title: "Bookmark Integration",
            description: (
              <div className="text-left">
                <p>Daily, bi-weekly, or weekly. You choose and we do the rest:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>secure auto-sync with your X bookmarks</li>
                  <li>smart selection for newsletter topics</li>
                  <li>tailored for either personal use or paid audience</li>
                </ul>
                <p className="mt-2">All we need you to do is... bookmark!</p>
              </div>
            ),
          };
        case 3:
          return {
            icon: <BarChart2 className="h-10 w-10 text-purple-500" />,
            title: "Seamless Workflows",
            description: (
              <div className="text-left">
                <p>We start with a few simple questions to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>learn your goals and any guidelines</li>
                  <li>preferences and specifics</li>
                  <li>preferred frequency, day, and email for delivery</li>
                </ul>
                <p className="mt-2 flex items-center">
                  Want newsletters in your unique writing style? Available to all paid tiers 
                  <span className="ml-1 inline-flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-500" />
                  </span>
                </p>
              </div>
            ),
          };
        case 4:
          return {
            icon: null,
            title: "To get started, all we need is...",
            description: (
              <div className="text-left space-y-4">
                {/* Removed timezone selection for newsletter platform */}
                
                <div className="mt-4 mb-6">
                  <p className="text-base font-medium mb-2">Your permission to read (but never write or edit) your bookmarks:</p>
                  <p className="text-sm text-gray-600 mb-4">
                    This allows us to create newsletters from your bookmarked content automatically.
                  </p>
                  <Button 
                    onClick={handleBookmarksConsent} 
                    className="w-full py-3 bg-[#0087C8] hover:bg-[#0087C8]/90 text-white font-medium flex items-center justify-center gap-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                  >
                    <Twitter className="h-5 w-5" />
                    Authorize & Finish
                  </Button>
                </div>
              </div>
            ),
          };
        default:
          return { icon: null, title: "", description: "" };
      }
    }
  };

  const content = getContent();
  const platformType = isCreatorPlatform ? "creator platform" : "auto newsletter dashboard";

  // Loading screen when updating timezone
  if (isLoading) {
    return (
      <Dialog open={true}>
        <DialogContent
          className="max-h-[90vh] sm:max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl p-0 font-sans w-[95%] max-w-md sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton={true}
        >
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[150px] sm:min-h-[200px]">
            <div className="w-8 h-8 sm:w-10 sm:h-10 mb-4 border-4 border-t-transparent border-[#0087C8] rounded-full animate-spin"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 text-center">
              {loadingMessage}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 text-center">
              {isCreatorPlatform 
                ? "Please wait while we verify your account and analyze your profile." 
                : "Please wait while we save your preferences."}
            </p>
            {analysisError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <p className="font-medium mb-1">There was an issue with the analysis:</p>
                <p>{analysisError}</p>
                <p className="mt-2">Don't worry, your profile is set up and you can continue.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[90vh] sm:max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl p-0 font-sans w-[95%] max-w-md sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
              Welcome to your {platformType}!
            </h1>
          </div>

          {/* Breadcrumb */}
          <div className="mb-4 sm:mb-6">
            <Breadcrumb>
              <BreadcrumbList className="justify-center">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem key={index}>
                      <div 
                        className={cn(
                          "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm",
                          currentStep > index + 1 ? 
                            "bg-green-500 text-white" : 
                            currentStep === index + 1 ? 
                              (isCreatorPlatform ? "bg-[#0087C8] text-white" : "bg-amber-500 text-white") : 
                              "bg-gray-200 text-gray-500"
                        )}
                      >
                        {index + 1}
                      </div>
                    </BreadcrumbItem>
                  </>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Content */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col items-center">
              {content.icon && (
                <div className={cn(
                  "p-3 sm:p-4 rounded-full mb-4",
                  isCreatorPlatform ? "bg-blue-100" : "bg-amber-100"
                )}>
                  {content.icon}
                </div>
              )}
              <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-center">{content.title}</h2>
              <div className="text-sm sm:text-base text-gray-600 w-full">
                {content.description}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            {/* Show "Maybe Later" button only on step 4 for newsletter platform */}
            {currentStep === totalSteps && !isCreatorPlatform ? (
              <div className="flex justify-end w-full">
                <Button 
                  onClick={handleNextStep}
                  variant="ghost" 
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Maybe Later
                </Button>
              </div>
            ) : (
              // Regular navigation button for all other cases
              <div className="flex justify-center w-full">
                <Button 
                  onClick={handleNextStep}
                  className={cn(
                    "px-6 py-2 font-medium",
                    isCreatorPlatform ? 
                      "bg-[#0087C8] hover:bg-[#0087C8]/90" : 
                      "bg-amber-500 hover:bg-amber-600"
                  )}
                  disabled={currentStep === totalSteps && isCreatorPlatform && !isCreatorFormValid}
                >
                  {currentStep < totalSteps ? "Next" : "Finish"}
                  {currentStep === totalSteps && isCreatorPlatform && !isCreatorFormValid && (
                    <span className="ml-2 text-xs opacity-70">(Complete all fields)</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalkthroughPopup;
