
import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface ManualNewsletterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingGenerations: number;
}

const TweetCountOption = ({ 
  count, 
  selected, 
  onSelect 
}: { 
  count: number; 
  selected: boolean; 
  onSelect: () => void; 
}) => (
  <Card 
    className={cn(
      "flex flex-col items-center justify-center p-4 cursor-pointer border-2 transition-all",
      selected 
        ? "border-amber-500 bg-amber-50" 
        : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
    )}
    onClick={onSelect}
  >
    <div className="text-2xl font-bold mb-2">{count}</div>
    <div className="text-sm text-gray-600">tweets</div>
    {selected && (
      <div className="absolute top-2 right-2 text-amber-500">
        <Check size={16} />
      </div>
    )}
  </Card>
);

const ManualNewsletterDialog: React.FC<ManualNewsletterDialogProps> = ({
  open,
  onOpenChange,
  remainingGenerations
}) => {
  const [selectedCount, setSelectedCount] = React.useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const { authState } = useAuth();

  const handleGenerate = async () => {
    if (!authState.user) {
      toast.error("You must be logged in to generate a newsletter");
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('manual-newsletter-generation', {
        body: {
          tweetCount: selectedCount,
          userId: authState.user.id
        }
      });
      
      if (error) {
        console.error("Error invoking function:", error);
        toast.error("Failed to generate newsletter", {
          description: error.message || "Please try again later"
        });
        return;
      }
      
      if (data.error) {
        console.error("Function returned error:", data.error);
        toast.error("Failed to generate newsletter", {
          description: data.error || "Please try again later"
        });
        return;
      }
      
      // Display success message
      toast.success("Newsletter generated successfully", {
        description: `A newsletter with ${selectedCount} tweets has been created and sent to your email`
      });
      
      // Close the dialog
      onOpenChange(false);
      
    } catch (error: any) {
      console.error("Error generating newsletter:", error);
      toast.error("An unexpected error occurred", {
        description: error.message || "Please try again later"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Generate Newsletter Manually</DialogTitle>
          <DialogDescription>
            Instantly trigger a newsletter from your saved bookmarks. 
            It will be sent to your email and displayed here.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            <p>Make sure you've already saved the bookmarks you'd like to include in your newsletter.</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">How many of your most recent bookmarks to use:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TweetCountOption 
                count={10} 
                selected={selectedCount === 10} 
                onSelect={() => setSelectedCount(10)} 
              />
              <TweetCountOption 
                count={20} 
                selected={selectedCount === 20} 
                onSelect={() => setSelectedCount(20)} 
              />
              <TweetCountOption 
                count={30} 
                selected={selectedCount === 30} 
                onSelect={() => setSelectedCount(30)} 
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
          </div>
          <Button 
            type="button" 
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Newsletter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualNewsletterDialog;
