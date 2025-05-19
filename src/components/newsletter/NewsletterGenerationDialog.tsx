
import { useState } from 'react';
import { Check } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewsletterGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingGenerations: number;
}

const NewsletterGenerationDialog = ({ 
  open, 
  onOpenChange,
  remainingGenerations
}: NewsletterGenerationDialogProps) => {
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const tweetCountOptions = [
    { count: 10, label: '10 Tweets', description: 'Quick summary' },
    { count: 20, label: '20 Tweets', description: 'Standard length' },
    { count: 30, label: '30 Tweets', description: 'Comprehensive' },
  ];

  const handleGenerate = () => {
    // No functionality yet, just close the dialog
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Generate Newsletter</DialogTitle>
          <DialogDescription>
            Generate a newsletter from your recent bookmarks. This will be displayed here and sent to your email.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
            <strong>Note:</strong> Make sure you've already saved the bookmarks you'd like to include in your newsletter.
          </div>

          <h3 className="text-sm font-medium mb-3">Select how many recent bookmarks to use:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tweetCountOptions.map((option) => (
              <Card 
                key={option.count}
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  selectedCount === option.count 
                    ? "border-amber-500 bg-amber-50" 
                    : "border-gray-200 hover:border-amber-300"
                )}
                onClick={() => setSelectedCount(option.count)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  {selectedCount === option.count && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                  <div className="text-xl font-bold mb-1">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-sm text-gray-500">
              {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
            </div>
            <Button 
              type="submit" 
              onClick={handleGenerate}
              className="bg-amber-500 hover:bg-amber-600 w-full sm:w-auto"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Newsletter'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterGenerationDialog;
