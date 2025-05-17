
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomePopupProps {
  open: boolean;
  onOptionSelect: (option: "newsletters" | "creator") => Promise<void>;
}

const WelcomePopup = ({ open, onOptionSelect }: WelcomePopupProps) => {
  const [loading, setLoading] = useState<"newsletters" | "creator" | null>(null);

  const handleSelect = async (option: "newsletters" | "creator") => {
    setLoading(option);
    await onOptionSelect(option);
    setLoading(null);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden w-[90%] max-w-md sm:max-w-lg md:max-w-xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-3 sm:p-4 md:p-5">
          <DialogHeader className="flex flex-col items-center space-y-3 sm:space-y-4">
            <div className="flex items-center justify-center">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 drop-shadow-md"
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0087C8] ml-2 md:ml-3">
                chirpmetrics
              </h1>
            </div>
            <div className="text-center w-full">
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl text-center font-extrabold tracking-tight mb-1 sm:mb-2">
                Welcome!
              </DialogTitle>
              <DialogDescription className="text-center text-sm sm:text-base max-w-md mx-auto">
                Which were you looking for?
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4">
            <Button
              onClick={() => handleSelect("newsletters")}
              disabled={loading !== null}
              className={cn(
                "h-auto flex items-center justify-between p-3 sm:p-4 bg-white hover:bg-blue-50",
                "text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl",
                "transition-all duration-200 w-full",
                loading === "newsletters" && "opacity-80"
              )}
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-base sm:text-lg font-semibold mb-0.5 sm:mb-1">
                  Auto Newsletters
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-normal">
                  Use your Twitter bookmarks to create weekly newsletters automatically
                </span>
              </div>
              <div className="rounded-full bg-[#0087C8]/10 p-2 sm:p-3 flex-shrink-0 ml-2">
                <Bookmark 
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    loading === "newsletters" ? "text-[#0087C8]/50" : "text-[#0087C8]"
                  }`} 
                />
              </div>
            </Button>

            <Button
              onClick={() => handleSelect("creator")}
              disabled={loading !== null}
              className={cn(
                "h-auto flex items-center justify-between p-3 sm:p-4 bg-white hover:bg-blue-50",
                "text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl",
                "transition-all duration-200 w-full",
                loading === "creator" && "opacity-80"
              )}
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-base sm:text-lg font-semibold mb-0.5 sm:mb-1">
                  X (formerly Twitter) Creator Platform
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-normal">
                  Grow your Twitter with analytics and AI-generated content
                </span>
              </div>
              <div className="rounded-full bg-[#0087C8]/10 p-2 sm:p-3 flex-shrink-0 ml-2">
                <Twitter 
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    loading === "creator" ? "text-[#0087C8]/50" : "text-[#0087C8]"
                  }`} 
                />
              </div>
            </Button>
          </div>
          
          <div className="text-[10px] sm:text-xs text-center text-gray-400 mt-3 sm:mt-4">
            You can change your preference later in settings
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
