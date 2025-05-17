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
  const [hovered, setHovered] = useState<"newsletters" | "creator" | null>(null);

  const handleSelect = async (option: "newsletters" | "creator") => {
    setLoading(option);
    await onOptionSelect(option);
    setLoading(null);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden w-[90%] max-w-sm sm:max-w-md md:max-w-lg rounded-2xl shadow-xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-3 sm:p-4 md:p-5">
          <DialogHeader className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 drop-shadow-lg"
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0087C8] to-[#00A3F5] bg-clip-text text-transparent ml-2 sm:ml-3">
                chirpmetrics
              </h1>
            </div>
            <div className="text-center w-full mt-1 sm:mt-2">
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl text-center font-extrabold tracking-tight mb-1 sm:mb-2">
                Welcome!
              </DialogTitle>
              <DialogDescription className="text-center text-sm sm:text-base max-w-md mx-auto text-gray-600">
                Which option best suits your needs?
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 sm:gap-4 mt-4">
            <Button
              onClick={() => handleSelect("newsletters")}
              disabled={loading !== null}
              onMouseEnter={() => setHovered("newsletters")}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "h-auto flex items-center justify-between p-3 sm:p-4",
                "text-gray-800 border-2 rounded-xl",
                "transition-all duration-300 w-full",
                loading === "newsletters" && "opacity-80",
                hovered === "newsletters" || loading === "newsletters" 
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-400 shadow-md" 
                  : "bg-white hover:bg-amber-50 border-amber-200 hover:border-amber-400"
              )}
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-amber-700">
                  Auto Newsletters
                </span>
                <span className="text-xs sm:text-sm text-gray-600 font-normal break-words">
                  Use your Twitter bookmarks to create weekly newsletters automatically
                </span>
              </div>
              <div className={cn(
                "rounded-full p-2 sm:p-3 flex-shrink-0 ml-2 transition-all duration-300",
                hovered === "newsletters" || loading === "newsletters"
                  ? "bg-gradient-to-r from-amber-400 to-orange-400 shadow-lg"
                  : "bg-amber-100"
              )}>
                <Bookmark 
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    hovered === "newsletters" || loading === "newsletters" ? "text-white" : "text-amber-500"
                  }`} 
                />
              </div>
            </Button>

            <Button
              onClick={() => handleSelect("creator")}
              disabled={loading !== null}
              onMouseEnter={() => setHovered("creator")}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "h-auto flex items-center justify-between p-3 sm:p-4",
                "text-gray-800 border-2 rounded-xl",
                "transition-all duration-300 w-full",
                loading === "creator" && "opacity-80",
                hovered === "creator" || loading === "creator" 
                  ? "bg-gradient-to-r from-blue-50 to-sky-50 border-blue-400 shadow-md" 
                  : "bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-400"
              )}
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-blue-700">
                  X (formerly Twitter) Creator Platform
                </span>
                <span className="text-xs sm:text-sm text-gray-600 font-normal break-words">
                  Grow your Twitter with analytics and AI-generated content
                </span>
              </div>
              <div className={cn(
                "rounded-full p-2 sm:p-3 flex-shrink-0 ml-2 transition-all duration-300",
                hovered === "creator" || loading === "creator"
                  ? "bg-gradient-to-r from-blue-400 to-sky-400 shadow-lg"
                  : "bg-blue-100"
              )}>
                <Twitter 
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    hovered === "creator" || loading === "creator" ? "text-white" : "text-blue-500"
                  }`} 
                />
              </div>
            </Button>
          </div>
          
          <div className="text-xs sm:text-sm text-center text-gray-500 mt-4 sm:mt-5">
            You can change your preference later in settings
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
