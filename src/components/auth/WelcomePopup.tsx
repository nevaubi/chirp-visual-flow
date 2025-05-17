
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Bookmark, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomePopupProps {
  open: boolean;
  onOptionSelect: (option: "newsletters" | "creator") => Promise<void>;
  disableClose?: boolean;
  fullscreen?: boolean;
  profilePicUrl?: string | null;
  username?: string | null;
}

const WelcomePopup = ({
  open,
  onOptionSelect,
  disableClose = false,
  fullscreen = false,
  profilePicUrl = null,
  username = null,
}: WelcomePopupProps) => {
  const [loading, setLoading] = useState<"newsletters" | "creator" | null>(null);
  const [visible, setVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  useEffect(() => {
    // Animate in after component mounts
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = async (option: "newsletters" | "creator") => {
    setLoading(option);
    setLoadingMessage(`Taking you to the ${option === "newsletters" ? "Newsletters" : "Creator"} platform...`);
    
    await onOptionSelect(option);
    setLoading(null);
    setLoadingMessage("");
  };

  // Show loading screen when a platform is being loaded
  if (loading) {
    return (
      <Dialog open={true}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl p-0 font-sans",
            fullscreen ? "w-[95%] max-w-2xl" : "w-[95%] max-w-md sm:max-w-lg lg:max-w-xl"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton={true}
        >
          <div className="p-8 sm:p-10 lg:p-12 flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-12 h-12 mb-6 border-4 border-t-transparent border-[#0087C8] rounded-full animate-spin"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">{loadingMessage}</h3>
            <p className="text-gray-600 text-center">Please wait while we set up your experience.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-2xl p-0 font-sans",
          fullscreen ? "w-[95%] max-w-2xl" : "w-[95%] max-w-md sm:max-w-lg lg:max-w-xl"
        )}
        onInteractOutside={(e) => disableClose && e.preventDefault()}
        onEscapeKeyDown={(e) => disableClose && e.preventDefault()}
        hideCloseButton={disableClose}
      >
        <div 
          className={`transform transition-all duration-500 ease-out ${
            visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
          }`}
        >
          {/* Fix: Remove the jsx attribute and use standard style tag */}
          <style>
            {`
              @keyframes subtle-bounce {
                0%, 100% { 
                  transform: translateY(0); 
                }
                50% { 
                  transform: translateY(-3px); 
                }
              }
              .animate-subtle-bounce {
                animation: subtle-bounce 3s ease-in-out infinite;
              }
            `}
          </style>
          
          <div className="text-center pt-10 pb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">
              Welcome{username ? `, ${username}` : ''}!
            </h1>
            
            {/* Profile pic with sparkles and subtle bounce animation */}
            <div className="relative inline-block mb-6">
              {/* Profile pic with subtle bounce animation */}
              <div className="animate-subtle-bounce h-24 w-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 overflow-hidden">
                {profilePicUrl ? (
                  <img 
                    src={profilePicUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-12 h-12">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {/* Animated sparkles - positioned in front with z-index */}
              <div className="absolute text-yellow-400 text-2xl z-10" style={{ top: "0px", left: "5px" }}>
                <span className="animate-pulse inline-block">✨</span>
              </div>
              <div className="absolute text-yellow-400 text-2xl z-10" style={{ top: "15px", right: "0px" }}>
                <span className="animate-pulse inline-block" style={{ animationDelay: "0.5s" }}>✨</span>
              </div>
              <div className="absolute text-yellow-400 text-2xl z-10" style={{ bottom: "10px", left: "10px" }}>
                <span className="animate-pulse inline-block" style={{ animationDelay: "0.7s" }}>✨</span>
              </div>
              <div className="absolute text-yellow-400 text-2xl z-10" style={{ bottom: "0px", right: "15px" }}>
                <span className="animate-pulse inline-block" style={{ animationDelay: "0.2s" }}>✨</span>
              </div>
            </div>
            
            <p className="text-xl text-gray-600 mb-10">Let's get you set up! What are you here for?</p>
          </div>

          {/* Options - Side by side */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Option 1 */}
              <div 
                className="bg-amber-50 hover:bg-amber-100 transition-all duration-300 rounded-2xl p-7 cursor-pointer group transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-amber-300"
                onClick={() => handleSelect("newsletters")}
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-amber-800 mb-2">Auto Newsletters</h2>
                  <div className="bg-amber-200 rounded-full p-3 group-hover:bg-amber-300 transition-colors">
                    <Bookmark size={24} className="text-amber-700" />
                  </div>
                </div>
                <p className="text-amber-700 text-lg">Auto generate based on your X bookmarks</p>
              </div>

              {/* Option 2 */}
              <div 
                className="bg-blue-50 hover:bg-blue-100 transition-all duration-300 rounded-2xl p-7 cursor-pointer group transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-blue-300"
                onClick={() => handleSelect("creator")}
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-blue-800 mb-2">X Creator Platform</h2>
                  <div className="bg-blue-200 rounded-full p-3 group-hover:bg-blue-300 transition-colors">
                    <Twitter size={24} className="text-blue-700" />
                  </div>
                </div>
                <p className="text-blue-700 text-lg">Growth and analytics platform for X users.</p>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="text-center py-4 mb-4">
            <div className="text-xl font-bold text-indigo-600 mb-2">Both? Coming soon!</div>
            {!disableClose && (
              <div className="text-sm text-gray-500">You can always change later in settings</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
