import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
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
  const [updatedRemainingGenerations, setUpdatedRemainingGenerations] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const { authState } = useAuth();

  // Reset updatedRemainingGenerations and progress when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setUpdatedRemainingGenerations(null);
      setProgress(0);
      setIsGenerating(false);
    }
  }, [open]);

  // Simulate progress updates during processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let completionTimer: NodeJS.Timeout;
    
    if (isGenerating && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => {
          // Cap progress at 90% for the actual API call to complete
          const newProgress = prev + Math.random() * 4;
          return Math.min(newProgress, 90);
        });
      }, 200);
    }
    
    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [isGenerating, progress]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      
      // Call the Supabase Edge Function to generate the newsletter
      const { data, error } = await supabase.functions.invoke('manual-newsletter-generation', {
        body: { selectedCount },
      });
      
      if (error) {
        console.error('Error generating newsletter:', error);
        toast.error('Failed to generate newsletter', {
          description: error.message || 'Please try again later',
        });
        setIsGenerating(false);
        return;
      }
      
      if (data.error) {
        console.error('Function returned error:', data.error);
        toast.error('Failed to generate newsletter', {
          description: data.error,
        });
        setIsGenerating(false);
        return;
      }
      
      // Success! Update local state with the new remaining generations count
      if (data.remainingGenerations !== undefined) {
        setUpdatedRemainingGenerations(data.remainingGenerations);
      }
      
      // Set progress to 100% to show completion
      setProgress(100);
      
      // Keep the completion screen visible for 4 seconds
      setTimeout(() => {
        toast.success('Newsletter generating in background - check Library/email in 2-3 mins!', {
          description: `Your newsletter with ${selectedCount} tweets is being processed and will be available soon.`,
        });
        
        // Close the dialog
        onOpenChange(false);
        setIsGenerating(false);
      }, 4000);
      
    } catch (error) {
      console.error('Error in handleGenerate:', error);
      toast.error('Failed to generate newsletter', {
        description: 'An unexpected error occurred. Please try again later.',
      });
      setIsGenerating(false);
    }
  };

  // Display either the updated count or the original count
  const displayRemainingGenerations = updatedRemainingGenerations !== null 
    ? updatedRemainingGenerations 
    : remainingGenerations;

  return (
    <>
      <style>{`
        @keyframes bookmark-right {
          0% { transform: translateY(0) translateX(0) rotate(-15deg) scale(0.9); }
          20% { transform: translateY(-20px) translateX(40px) rotate(-5deg) scale(1.1); }
          40% { transform: translateY(-10px) translateX(80px) rotate(5deg) scale(1); }
          70% { transform: translateY(-30px) translateX(130px) rotate(10deg) scale(1.05); }
          100% { transform: translateY(-50px) translateX(180px) rotate(15deg) scale(0); opacity: 0; }
        }
        @keyframes bookmark-left {
          0% { transform: translateY(0) translateX(0) rotate(15deg) scale(0.9); }
          20% { transform: translateY(-20px) translateX(-40px) rotate(5deg) scale(1.1); }
          40% { transform: translateY(-10px) translateX(-80px) rotate(-5deg) scale(1); }
          70% { transform: translateY(-30px) translateX(-130px) rotate(-10deg) scale(1.05); }
          100% { transform: translateY(-50px) translateX(-180px) rotate(-15deg) scale(0); opacity: 0; }
        }
        @keyframes float-right {
          0% { transform: translate(0, 0) rotate(0); }
          25% { transform: translate(15px, -10px) rotate(10deg); }
          50% { transform: translate(30px, 0) rotate(0); }
          75% { transform: translate(15px, 10px) rotate(-10deg); }
          100% { transform: translate(0, 0) rotate(0); }
        }
        @keyframes float-left {
          0% { transform: translate(0, 0) rotate(0); }
          25% { transform: translate(-15px, -10px) rotate(-10deg); }
          50% { transform: translate(-30px, 0) rotate(0); }
          75% { transform: translate(-15px, 10px) rotate(10deg); }
          100% { transform: translate(0, 0) rotate(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s infinite ease-in-out;
        }
        @keyframes pulse-bookmark {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.2); }
        }
        .animate-pulse-bookmark {
          animation: pulse-bookmark 1.5s infinite ease-in-out;
        }
        @keyframes confetti-right {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          80% { opacity: 0.7; }
          100% { transform: translateY(100px) translateX(50px) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-left {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          80% { opacity: 0.7; }
          100% { transform: translateY(100px) translateX(-50px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Generate Newsletter Manually</DialogTitle>
            <DialogDescription>
              Instantly trigger a newsletter from your saved bookmarks. 
              It will be sent to your email and displayed here.
            </DialogDescription>
          </DialogHeader>
          
          {/* Processing overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg px-4">
              <div className="w-80 h-64 mb-6 relative">
                <div className="flex justify-center items-center h-full">
                  {/* Newsletter illustration */}
                  <div className={`relative w-48 h-64 transition-all duration-500 ${progress >= 100 ? 'animate-pulse-soft' : ''}`}>
                    {/* Newsletter paper */}
                    <div className={`absolute top-0 left-0 w-48 h-64 bg-white border-2 ${progress >= 100 ? 'border-green-400' : 'border-gray-300'} rounded-md shadow-lg overflow-hidden flex flex-col transition-colors duration-300`}>
                      {/* Newsletter header with pulse effect */}
                      <div className={`h-10 w-full ${progress >= 100 ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gradient-to-r from-amber-50 to-amber-100'} border-b ${progress >= 100 ? 'border-green-200' : 'border-amber-200'} flex items-center justify-center transition-colors duration-300`}>
                        <div className={`w-24 h-3 ${progress >= 100 ? 'bg-green-400' : 'bg-amber-400'} rounded-full relative overflow-hidden transition-colors duration-300`}>
                          <div className="absolute inset-0 overflow-hidden">
                            <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white via-20% to-transparent to-40% bg-opacity-20"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Newsletter content - fills up gradually based on progress */}
                      <div className="flex-1 p-3">
                        {/* Content lines that appear based on progress - with staggered delays and varied widths */}
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out transform ${progress > 10 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-amber-300 to-amber-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-100 transform ${progress > 20 ? 'w-5/6 opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-200 transform ${progress > 30 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-amber-300 to-amber-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-300 transform ${progress > 40 ? 'w-4/5 opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-400 transform ${progress > 50 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-500 transform ${progress > 60 ? 'w-3/4 opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-600 transform ${progress > 70 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full mb-3 transition-all duration-700 ease-out delay-700 transform ${progress > 80 ? 'w-5/6 opacity-100' : 'w-0 opacity-0'}`}></div>
                        
                        <div className={`h-2.5 bg-gradient-to-r ${progress >= 100 ? 'from-green-300 to-green-200' : 'from-gray-300 to-gray-200'} rounded-full transition-all duration-700 ease-out delay-800 transform ${progress > 90 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                      </div>
                    </div>
                    
                    {/* Confetti animation when complete */}
                    {progress >= 100 && (
                      <div className="absolute inset-0">
                        {/* Generate confetti particles */}
                        {Array.from({ length: 30 }).map((_, i) => {
                          const size = 4 + Math.random() * 8;
                          const startX = 10 + Math.random() * 60;
                          const fallSpeed = 1.5 + Math.random() * 3.5;
                          const delay = Math.random() * 1.2;
                          
                          // Vibrant colors - yellows and ambers only
                          const colors = [
                            'bg-amber-400', 'bg-amber-500',
                            'bg-yellow-300', 'bg-yellow-400', 'bg-orange-400'
                          ];
                          const color = colors[Math.floor(Math.random() * colors.length)];
                          
                          // Various shapes
                          const shapes = ['rounded-full', 'rounded-sm', 'rounded-none'];
                          const shape = shapes[Math.floor(Math.random() * shapes.length)];
                          
                          // Position relative to center
                          const side = i % 2 === 0 ? -1 : 1;
                          const startLeft = 50 + (side * startX);
                          
                          return (
                            <div
                              key={i}
                              className={`absolute ${color} ${shape}`}
                              style={{
                                width: `${size}px`,
                                height: `${shape === 'rounded-none' ? size * 1.5 : size}px`,
                                top: '40%',
                                left: `${startLeft}%`,
                                animation: `confetti-${side > 0 ? 'right' : 'left'} ${fallSpeed}s forwards`,
                                animationDelay: `${delay}s`,
                                transform: `rotate(${Math.random() * 360}deg)`,
                                zIndex: 50
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Animated bookmarks moving toward the newsletter - only show when progress < 100 */}
                  {progress < 100 && (
                    <div className="absolute w-full h-full">
                      {/* Generate bookmark icons that fly toward the newsletter */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        // Calculate when this bookmark should appear based on progress
                        const progressThreshold = Math.min(5 + (i * 10), 85);
                        const shouldShow = progress > progressThreshold;
                        
                        // Different starting positions for each bookmark
                        const side = i % 2 === 0 ? 'left' : 'right';
                        const topPosition = -10 + (i * 15);
                        const leftPosition = side === 'left' ? -20 - (i % 3 * 10) : 120 + (i % 3 * 10);
                        
                        // Different delays for more natural movement
                        const animationDelay = `${(i * 0.15)}s`;
                        const animationName = side === 'left' ? 'bookmark-right' : 'bookmark-left';
                        
                        // Different sizes for depth effect
                        const size = 32 + (i % 3 * 4);
                        
                        // Different colors for visual interest
                        const colors = [
                          'text-amber-500', 
                          'text-amber-400', 
                          'text-yellow-500',
                          'text-orange-400'
                        ];
                        const colorClass = colors[i % colors.length];
                        
                        return (
                          <div 
                            key={i}
                            className={`absolute transition-opacity duration-500 ease-in-out ${shouldShow ? 'opacity-100' : 'opacity-0'}`}
                            style={{ 
                              top: `${topPosition}%`, 
                              left: `${leftPosition}%`,
                              animation: shouldShow ? `${animationName} 2s forwards ease-in-out` : 'none',
                              animationDelay
                            }}
                          >
                            <div className={`animate-pulse-bookmark ${colorClass}`}>
                              {/* Bookmark icon */}
                              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
                                <path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 17.5L5 21V5Z" fill="currentColor" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add some decorative smaller bookmarks that just float around */}
                      {Array.from({ length: 6 }).map((_, i) => {
                        // Only show these decorative bookmarks after some progress
                        const shouldShow = progress > 30;
                        
                        // Random positions
                        const topPosition = 10 + (i * 12);
                        const leftPosition = 20 + (i * 10);
                        
                        // Small sizes for background effect
                        const size = 15 + (i % 3 * 2);
                        
                        // Different colors
                        const colors = [
                          'text-amber-300 opacity-40', 
                          'text-amber-200 opacity-30', 
                          'text-yellow-200 opacity-35'
                        ];
                        const colorClass = colors[i % colors.length];
                        
                        return (
                          <div 
                            key={`float-${i}`}
                            className={`absolute transition-opacity duration-1000 ease-in-out ${shouldShow ? 'opacity-100' : 'opacity-0'}`}
                            style={{ 
                              top: `${topPosition}%`, 
                              left: `${leftPosition}%`,
                              animation: shouldShow ? `float-${i % 2 === 0 ? 'right' : 'left'} ${3 + (i % 3)}s infinite ease-in-out` : 'none',
                              animationDelay: `${i * 0.2}s`
                            }}
                          >
                            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={colorClass}>
                              <path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 17.5L5 21V5Z" fill="currentColor" />
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-64 mb-4">
                <Progress 
                  value={progress} 
                  className="h-2 bg-gray-200"
                  indicatorClassName={cn(
                    "transition-all duration-300",
                    progress >= 100 
                      ? "bg-gradient-to-r from-green-400 via-green-500 to-green-400" 
                      : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
                  )}
                />
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {progress >= 100 
                  ? "Newsletter generated successfully!" 
                  : "Analyzing your bookmarks and generating newsletter..."}
              </p>

              {/* New message that appears after 40% progress */}
              <p 
                className={`text-xs text-gray-400 transition-opacity duration-1000 ${
                  progress > 40 && progress < 100 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                You can close this window while the newsletter generates
              </p>
            </div>
          )}
          
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
    </>
  );
};

export default ManualNewsletterDialog;
