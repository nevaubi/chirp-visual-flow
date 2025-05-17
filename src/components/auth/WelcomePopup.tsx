
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
  disableClose?: boolean;
  fullscreen?: boolean;
}

const WelcomePopup = ({ 
  open, 
  onOptionSelect, 
  disableClose = false,
  fullscreen = false
}: WelcomePopupProps) => {
  const [loading, setLoading] = useState<"newsletters" | "creator" | null>(null);
  const [hovered, setHovered] = useState<"newsletters" | "creator" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const handleSelect = async (option: "newsletters" | "creator") => {
    setLoading(option);
    setLoadingMessage(`Taking you to the ${option === "newsletters" ? "Newsletters" : "Creator"} platform...`);
    
    await onOptionSelect(option);
    setLoading(null);
    setLoadingMessage("");
  };

  // Show loading screen when a platform is being loaded
  if (loading) {
    return (
      <Dialog open={true}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl p-0 font-sans",
            fullscreen ? "w-[95%] max-w-2xl" : "w-[95%] max-w-md sm:max-w-lg lg:max-w-xl"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton={true}
        >
          <div className="p-8 sm:p-10 lg:p-12 flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-12 h-12 mb-6 border-4 border-t-transparent border-[#0087C8] rounded-full animate-spin"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">{loadingMessage}</h3>
            <p className="text-gray-600 text-center">Please wait while we set up your experience.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl p-0 font-sans",
          fullscreen ? "w-[95%] max-w-2xl" : "w-[95%] max-w-md sm:max-w-lg lg:max-w-xl"
        )}
        onInteractOutside={(e) => disableClose && e.preventDefault()}
        onEscapeKeyDown={(e) => disableClose && e.preventDefault()}
        hideCloseButton={disableClose}
      >
        <div className="p-4 sm:p-5 lg:p-6">
          <DialogHeader className="flex flex-col items-center space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-lg"
              />
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#0087C8] to-[#00A3F5] bg-clip-text text-transparent ml-2">
                chirpmetrics
              </h1>
            </div>
            <div className="text-center w-full">
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl text-center font-extrabold tracking-tight mb-1 font-heading">
                Welcome!
              </DialogTitle>
              <DialogDescription className="text-center text-xs sm:text-sm md:text-base max-w-xs sm:max-w-sm md:max-w-md mx-auto text-gray-600">
                Which option best suits your needs?
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 sm:gap-3 mt-3">
            <Button
              onClick={() => handleSelect("newsletters")}
              disabled={loading !== null}
              onMouseEnter={() => setHovered("newsletters")}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "h-auto p-2.5 flex items-start text-left",
                "text-gray-800 border-2 rounded-xl",
                "transition-all duration-200 w-full",
                loading === "newsletters" && "opacity-80",
                hovered === "newsletters" || loading === "newsletters" 
                  ? "bg-amber-50 border-amber-400 shadow-md" 
                  : "bg-white hover:bg-amber-50 border-amber-200 hover:border-amber-400"
              )}
              variant="outline"
            >
              <div className="flex-grow pr-2 min-w-0">
                <span className="text-sm sm:text-base lg:text-lg font-semibold block mb-1 text-amber-700 line-clamp-1 font-heading">
                  Auto Newsletters
                </span>
                <span className="text-xs text-gray-600 font-normal block line-clamp-2">
                  Auto generate based on your X bookmarks
                </span>
              </div>
              <div className={cn(
                "rounded-full p-2 flex-shrink-0 ml-1 transition-all duration-200 self-center",
                hovered === "newsletters" || loading === "newsletters"
                  ? "bg-amber-400 shadow"
                  : "bg-amber-100"
              )}>
                <Bookmark 
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${
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
                "h-auto p-2.5 flex items-start text-left",
                "text-gray-800 border-2 rounded-xl",
                "transition-all duration-200 w-full",
                loading === "creator" && "opacity-80",
                hovered === "creator" || loading === "creator" 
                  ? "bg-blue-50 border-blue-400 shadow-md" 
                  : "bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-400"
              )}
              variant="outline"
            >
              <div className="flex-grow pr-2 min-w-0">
                <span className="text-sm sm:text-base lg:text-lg font-semibold block mb-1 text-blue-700 line-clamp-1 font-heading">
                  X Creator Platform
                </span>
                <span className="text-xs text-gray-600 font-normal block line-clamp-2">
                  Growth and analytics platform for X users.
                </span>
              </div>
              <div className={cn(
                "rounded-full p-2 flex-shrink-0 ml-1 transition-all duration-200 self-center",
                hovered === "creator" || loading === "creator"
                  ? "bg-blue-400 shadow"
                  : "bg-blue-100"
              )}>
                <Twitter 
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    hovered === "creator" || loading === "creator" ? "text-white" : "text-blue-500"
                  }`} 
                />
              </div>
            </Button>
          </div>
          
          {!disableClose && (
            <div className="text-xs text-center text-gray-500 mt-3">
              You can change your preference later in settings
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
