
import React, { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight } from "lucide-react";

interface ManualNewsletterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingGenerations: number;
}

const TWEET_COUNT_OPTIONS = [10, 20, 30];

const ManualNewsletterDialog = ({ 
  open, 
  onOpenChange,
  remainingGenerations
}: ManualNewsletterDialogProps) => {
  const [selectedCount, setSelectedCount] = useState<number>(10);

  const handleGenerate = () => {
    // This will be implemented later
    console.log(`Generating newsletter with ${selectedCount} tweets`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#9b87f5]">
            Manual Newsletter Generation
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Generate a newsletter from your most recent X bookmarks. 
            This will be sent to your email and also displayed here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Please make sure you've saved the bookmarks you'd like to include 
              in your newsletter before generating.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              How many of your most recent bookmarks would you like to include?
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TWEET_COUNT_OPTIONS.map((count) => (
                <Card 
                  key={count}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCount === count 
                      ? "border-[#9b87f5] bg-[#D6BCFA] bg-opacity-20" 
                      : "border-gray-200"
                  }`}
                  onClick={() => setSelectedCount(count)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <BookOpen 
                      className={`h-8 w-8 mb-2 ${
                        selectedCount === count ? "text-[#9b87f5]" : "text-gray-400"
                      }`} 
                    />
                    <p className="text-lg font-bold">
                      {count} Tweets
                    </p>
                    <p className="text-xs text-gray-500">
                      Most recent bookmarks
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="text-sm text-gray-500 mr-auto mb-2 sm:mb-0">
            {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
          </div>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="bg-[#1EAEDB] hover:bg-[#1EAEDB]/90"
            onClick={handleGenerate}
            disabled={remainingGenerations <= 0}
          >
            Generate <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualNewsletterDialog;
