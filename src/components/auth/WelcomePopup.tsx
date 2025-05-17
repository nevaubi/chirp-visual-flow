
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
        className="sm:max-w-md md:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-14 w-14 mr-2 drop-shadow-md"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#0087C8]">chirpmetrics</h1>
          </div>
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight mb-1">
            Welcome to chirpmetrics
          </DialogTitle>
          <DialogDescription className="text-center text-base mb-4">
            Choose how you would like to use chirpmetrics
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => handleSelect("newsletters")}
            disabled={loading !== null}
            className={cn(
              "h-auto flex items-start p-6 bg-white hover:bg-blue-50 text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl transition-all duration-200",
              "flex-col sm:flex-row sm:items-center sm:text-left",
              loading === "newsletters" && "opacity-80"
            )}
            variant="outline"
          >
            <div className="rounded-full bg-[#0087C8]/10 p-4 mb-4 sm:mb-0 sm:mr-4 flex-shrink-0">
              <Mail 
                className={`h-8 w-8 ${loading === "newsletters" ? "text-[#0087C8]/50" : "text-[#0087C8]"}`} 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold mb-1">Auto Newsletters</span>
              <span className="text-sm text-gray-500 font-normal">
                Use your Twitter bookmarks to create weekly newsletters automatically
              </span>
            </div>
          </Button>

          <Button
            onClick={() => handleSelect("creator")}
            disabled={loading !== null}
            className={cn(
              "h-auto flex items-start p-6 bg-white hover:bg-blue-50 text-gray-800 border-2 border-[#0087C8]/30 hover:border-[#0087C8] rounded-xl transition-all duration-200",
              "flex-col sm:flex-row sm:items-center sm:text-left",
              loading === "creator" && "opacity-80"
            )}
            variant="outline"
          >
            <div className="rounded-full bg-[#0087C8]/10 p-4 mb-4 sm:mb-0 sm:mr-4 flex-shrink-0">
              <BarChart2 
                className={`h-8 w-8 ${loading === "creator" ? "text-[#0087C8]/50" : "text-[#0087C8]"}`} 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold mb-1">Creator Platform</span>
              <span className="text-sm text-gray-500 font-normal">
                Grow your Twitter with analytics and AI-generated content
              </span>
            </div>
          </Button>
        </div>
        
        <div className="text-xs text-center text-gray-400 mt-4">
          You can change your preference later in settings
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
