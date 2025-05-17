import { useState } from "react";
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
import { Twitter, BookOpen, BarChart2, Activity, Users } from "lucide-react";

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
  const totalSteps = 4;

  const handleNextStep = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      // On final step completion
      setIsLoading(true);
      await onComplete();
      setIsLoading(false);
    }
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
            description: "Track your performance over time with detailed charts and metrics to help you understand your audience better.",
          };
        case 3:
          return {
            icon: <Activity className="h-10 w-10 text-[#FF6B35]" />,
            title: "Engagement Tracking",
            description: "Monitor how your audience interacts with your content and identify which posts perform best.",
          };
        case 4:
          return {
            icon: <Users className="h-10 w-10 text-green-500" />,
            title: "Community Management",
            description: "Keep track of your followers and build stronger relationships with your audience through targeted engagement.",
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
            description: "We automatically sync with your X bookmarks to help you generate content for your newsletters.",
          };
        case 3:
          return {
            icon: <BarChart2 className="h-10 w-10 text-purple-500" />,
            title: "Performance Analytics",
            description: "Track how your newsletters perform with detailed metrics on opens, clicks, and subscriber growth.",
          };
        case 4:
          return {
            icon: <Activity className="h-10 w-10 text-green-500" />,
            title: "Content Generation",
            description: "Click 'Generate Newsletter' to turn your bookmarks into engaging newsletter content for your subscribers.",
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
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 text-center">Finalizing your setup...</h3>
            <p className="text-sm sm:text-base text-gray-600 text-center">Please wait while we save your preferences.</p>
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
            <p className="text-sm sm:text-base text-gray-600">
              Here's a 20sec walkthrough of how to use it
            </p>
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
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "p-3 sm:p-4 rounded-full mb-4",
                isCreatorPlatform ? "bg-blue-100" : "bg-amber-100"
              )}>
                {content.icon}
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{content.title}</h2>
              <p className="text-sm sm:text-base text-gray-600">{content.description}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center">
            <Button 
              onClick={handleNextStep}
              className={cn(
                "px-6 py-2 font-medium",
                isCreatorPlatform ? 
                  "bg-[#0087C8] hover:bg-[#0087C8]/90" : 
                  "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {currentStep < totalSteps ? "Next" : "Finish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalkthroughPopup;
