
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Newspaper, TrendingUp } from "lucide-react";

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
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-10 w-10 mr-2"
            />
            <h1 className="text-2xl font-bold text-[#0087C8]">chirpmetrics</h1>
          </div>
          <DialogTitle className="text-2xl text-center">Welcome to Chirpmetrics</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Let us know what brings you here today
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <Button
            onClick={() => handleSelect("newsletters")}
            disabled={loading !== null}
            className="h-auto flex flex-col p-6 bg-white hover:bg-blue-50 text-gray-800 border-2 border-[#0087C8] hover:border-[#0087C8]/80"
            variant="outline"
          >
            <Newspaper 
              className={`h-10 w-10 mb-3 ${loading === "newsletters" ? "animate-pulse text-[#0087C8]/50" : "text-[#0087C8]"}`} 
            />
            <span className="text-lg font-medium">Auto Newsletters</span>
            <span className="text-sm text-gray-500 font-normal mt-2">
              Use your Twitter bookmarks to create weekly newsletters
            </span>
          </Button>

          <Button
            onClick={() => handleSelect("creator")}
            disabled={loading !== null}
            className="h-auto flex flex-col p-6 bg-white hover:bg-blue-50 text-gray-800 border-2 border-[#0087C8] hover:border-[#0087C8]/80"
            variant="outline"
          >
            <TrendingUp 
              className={`h-10 w-10 mb-3 ${loading === "creator" ? "animate-pulse text-[#0087C8]/50" : "text-[#0087C8]"}`} 
            />
            <span className="text-lg font-medium">Creator Platform</span>
            <span className="text-sm text-gray-500 font-normal mt-2">
              Grow your Twitter with analytics and AI-generated content
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
