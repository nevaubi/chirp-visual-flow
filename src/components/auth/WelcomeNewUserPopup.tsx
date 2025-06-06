
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeNewUserPopupProps {
  open: boolean;
  onGotIt: () => void;
}

const WelcomeNewUserPopup = ({ open, onGotIt }: WelcomeNewUserPopupProps) => {
  return (
    <Dialog 
      open={open} 
      onOpenChange={() => {}} // Prevent closing by any means
    >
      <DialogContent 
        className="sm:max-w-md bg-white rounded-lg shadow-xl border-0"
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={{ zIndex: 9999 }} // Higher z-index than any other popup
      >
        <div className="text-center p-6">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to LetterNest!
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              You're all set! Your account has been created successfully. 
              Get ready to transform your X bookmarks into amazing newsletters.
            </p>
          </div>
          
          <Button 
            onClick={onGotIt}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeNewUserPopup;
