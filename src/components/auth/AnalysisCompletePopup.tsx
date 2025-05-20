
import React from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnalysisCompletePopupProps {
  open: boolean;
  onClose: () => void;
}

const AnalysisCompletePopup: React.FC<AnalysisCompletePopupProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <DialogTitle className="text-xl">You're all set!</DialogTitle>
          <DialogDescription className="pt-2">
            Your profile analysis is complete. You can now explore your personalized dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#0087C8] hover:bg-[#0076b2]"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisCompletePopup;
