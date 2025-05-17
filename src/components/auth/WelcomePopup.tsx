
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart2, Mail } from "lucide-react";
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
        className="max-h-[90vh] overflow-y-auto w-[95%] xs:w-[90%] sm:w-[85%] md:max-w-xl lg:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-2 xs:p-3 sm:p-4 md:p-6">
          <DialogHeader className="flex flex-col items-center space-y-3 xs:space-y-4 md:space-y-5">
            <div className="relative flex items-center justify-center">
              <div className="flex items-center justify-center">
                <img 
                  src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                  alt="Chirpmetrics Logo" 
                  className="h-10 w-10 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 drop-shadow-md"
                />
                <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-[#0087C8] ml-2 md:ml-3">
                  chirpmetrics
                </h1>
              </div>
            </div>
            <div className="text-center w-full">
              <DialogTitle className="text-xl xs:text-2xl sm:text-3xl md:text-3xl text-center font-extrabold tracking-tight mb-1 sm:mb-2">
                Welcome to chirpmetrics
              </DialogTitle>
              <DialogDescription className="text-center text-sm xs:text-base md:text-lg max-w-md mx-auto">
                Choose how you would like to use chirpmetrics
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 pt-3 xs:pt-4 sm:pt-5 mt-2 sm:mt-3 md:mt-4">
            <Button
              onClick={() => handleSelect("newsletters")}
              disabled={loading !== null}
              className={cn(
                "h-auto flex items-start p-3 xs:p-4 sm:p-5 md:p-6 bg-white hover:bg-blue-50",
                "text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl sm:rounded-2xl",
                "transition-all duration-200 flex-col text-left w-full",
                loading === "newsletters" && "opacity-80"
              )}
              variant="outline"
            >
              <div className="flex items-start w-full gap-3 xs:gap-4">
                <div className="rounded-full bg-[#0087C8]/10 p-2 xs:p-3 sm:p-4 flex-shrink-0">
                  <Mail 
                    className={`h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${
                      loading === "newsletters" ? "text-[#0087C8]/50" : "text-[#0087C8]"
                    }`} 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold mb-0.5 xs:mb-1 sm:mb-2">
                    Auto Newsletters
                  </span>
                  <span className="text-xs xs:text-sm md:text-base text-gray-500 font-normal">
                    Use your Twitter bookmarks to create weekly newsletters automatically
                  </span>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleSelect("creator")}
              disabled={loading !== null}
              className={cn(
                "h-auto flex items-start p-3 xs:p-4 sm:p-5 md:p-6 bg-white hover:bg-blue-50",
                "text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl sm:rounded-2xl",
                "transition-all duration-200 flex-col text-left w-full",
                loading === "creator" && "opacity-80"
              )}
              variant="outline"
            >
              <div className="flex items-start w-full gap-3 xs:gap-4">
                <div className="rounded-full bg-[#0087C8]/10 p-2 xs:p-3 sm:p-4 flex-shrink-0">
                  <BarChart2 
                    className={`h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${
                      loading === "creator" ? "text-[#0087C8]/50" : "text-[#0087C8]"
                    }`} 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold mb-0.5 xs:mb-1 sm:mb-2">
                    Creator Platform
                  </span>
                  <span className="text-xs xs:text-sm md:text-base text-gray-500 font-normal">
                    Grow your Twitter with analytics and AI-generated content
                  </span>
                </div>
              </div>
            </Button>
          </div>
          
          <div className="text-[10px] xs:text-xs text-center text-gray-400 mt-3 xs:mt-4 sm:mt-5">
            You can change your preference later in settings
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
