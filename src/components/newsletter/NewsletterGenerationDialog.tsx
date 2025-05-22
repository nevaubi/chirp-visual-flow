
import React, { useState, useEffect } from "react";
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
import NewsletterAnimation from "./NewsletterAnimation";

interface NewsletterGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingGenerations: number;
  onGenerate: (count: number) => Promise<void>;
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    )}
  </Card>
);

const NewsletterGenerationDialog: React.FC<NewsletterGenerationDialogProps> = ({
  open,
  onOpenChange,
  remainingGenerations,
  onGenerate
}) => {
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [updatedRemainingGenerations, setUpdatedRemainingGenerations] = useState<number | null>(null);

  // Reset states when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setUpdatedRemainingGenerations(null);
      setAnimationState('idle');
      setIsGenerating(false);
    }
  }, [open]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setAnimationState('loading');
      
      // Call the parent's generate function
      await onGenerate(selectedCount);
      
      // Show success animation
      setAnimationState('success');
      
    } catch (error) {
      console.error('Error in handleGenerate:', error);
      setAnimationState('idle');
      setIsGenerating(false);
    }
  };

  const handleAnimationComplete = () => {
    // Close the dialog
    onOpenChange(false);
    setIsGenerating(false);
    setAnimationState('idle');
  };

  // Display either the updated count or the original count
  const displayRemainingGenerations = updatedRemainingGenerations !== null 
    ? updatedRemainingGenerations 
    : remainingGenerations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Generate Newsletter</DialogTitle>
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
        
        {/* Animation section */}
        <div className="h-[250px] relative border-t border-b border-gray-100 py-4 my-2">
          <NewsletterAnimation 
            state={animationState} 
            onComplete={handleAnimationComplete}
          />
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            {displayRemainingGenerations} generation{displayRemainingGenerations !== 1 ? 's' : ''} remaining
          </div>
          <Button 
            type="button" 
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleGenerate}
            disabled={isGenerating || displayRemainingGenerations <= 0}
          >
            {isGenerating ? (
              <>
                <span className="mr-2">Processing...</span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              'Generate Newsletter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterGenerationDialog;
