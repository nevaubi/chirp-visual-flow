
import React, { useState } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [updatedRemainingGenerations, setUpdatedRemainingGenerations] = useState<number | null>(null);
  const { authState } = useAuth();

  // Reset updatedRemainingGenerations when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setUpdatedRemainingGenerations(null);
      setProgress(0);
      setShowSuccess(false);
    }
  }, [open]);

  // Simulate progress updates while generating
  React.useEffect(() => {
    if (!isGenerating || showSuccess) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + Math.random() * 4, 95);
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isGenerating, showSuccess]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setShowSuccess(false);

      // Call the Supabase Edge Function to generate the newsletter
      const { data, error } = await supabase.functions.invoke('manual-newsletter-generation', {
        body: { selectedCount },
      });
      
      if (error) {
        console.error('Error generating newsletter:', error);
        toast.error('Failed to generate newsletter', {
          description: error.message || 'Please try again later',
        });
        return;
      }
      
      if (data.error) {
        console.error('Function returned error:', data.error);
        toast.error('Failed to generate newsletter', {
          description: data.error,
        });
        return;
      }
      
      // Success! Update local state with the new remaining generations count
      if (data.remainingGenerations !== undefined) {
        setUpdatedRemainingGenerations(data.remainingGenerations);
      }
      
      // In a real implementation, we would now process the bookmarks and generate the newsletter
      console.log('Newsletter generated successfully:', data);
      
      toast.success('Newsletter generated successfully', {
        description: `Your newsletter with ${selectedCount} tweets has been analyzed and will be delivered to your email soon.`,
      });

      // Show success state before closing
      setProgress(100);
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setIsGenerating(false);
        setShowSuccess(false);
        setProgress(0);
      }, 3500);

    } catch (error) {
      console.error('Error in handleGenerate:', error);
      toast.error('Failed to generate newsletter', {
        description: 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      if (!showSuccess) {
        setIsGenerating(false);
      }
    }
  };

  // Display either the updated count or the original count
  const displayRemainingGenerations = updatedRemainingGenerations !== null 
    ? updatedRemainingGenerations 
    : remainingGenerations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="relative sm:max-w-md md:max-w-lg">
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(150px) rotate(720deg); opacity: 0; }
          }
          .confetti-piece {
            position: absolute;
            top: 0;
            animation: confetti-fall 1.5s forwards;
          }
          @keyframes checkmark {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-checkmark {
            animation: checkmark 0.6s ease-out forwards;
          }
        `}</style>
        {isGenerating && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-md">
            <div className="flex flex-col items-center gap-4 p-6">
              {showSuccess ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white rounded-full p-3 shadow animate-checkmark">
                    <Check className="h-10 w-10 text-green-500" />
                  </div>
                  <p className="text-green-700 font-medium">Newsletter Generated!</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-t-transparent border-amber-500 rounded-full animate-spin" />
                  <p className="text-amber-700 font-medium">Generating...</p>
                </div>
              )}
              <Progress value={progress} className="w-60 h-2" />
            </div>

            {showSuccess && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => {
                  const size = 6 + Math.random() * 4;
                  const left = Math.random() * 100;
                  const delay = Math.random() * 0.2;
                  const colors = [
                    'bg-amber-400',
                    'bg-amber-500',
                    'bg-yellow-400',
                    'bg-orange-400'
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <div
                      key={i}
                      className={`confetti-piece ${color}`}
                      style={{
                        left: `${left}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        animationDelay: `${delay}s`
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
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
            {displayRemainingGenerations} generation{displayRemainingGenerations !== 1 ? 's' : ''} remaining
          </div>
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleGenerate}
            disabled={isGenerating || displayRemainingGenerations <= 0}
          >
            {isGenerating ? 'Generating...' : 'Generate Newsletter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualNewsletterDialog;
