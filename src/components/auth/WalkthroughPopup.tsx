import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface WalkthroughPopupProps {
  open: boolean;
  onClose: () => void;
  steps: { 
    id: string; 
    title: string; 
    description: string; 
    image?: string; 
  }[];
  onComplete: () => void;
}

const WalkthroughPopup = ({ open, onClose, steps, onComplete }: WalkthroughPopupProps) => {
  const { authState } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Get user ID for debugging
  const userId = authState.user?.id;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing walkthrough:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!open) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        {currentStepData.image && (
          <div className="mb-4">
            <img src={currentStepData.image} alt={currentStepData.title} className="rounded-md shadow-md" />
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
              <ChevronsLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {isLastStep && (
              <Button type="button" onClick={handleComplete} disabled={isCompleting}>
                {isCompleting ? (
                  <>Completing...</>
                ) : (
                  <>
                    Complete
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          {!isLastStep && (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronsRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WalkthroughPopup;
