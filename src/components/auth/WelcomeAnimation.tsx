
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";

interface WelcomeAnimationProps {
  profilePicUrl?: string | null;
  username?: string | null;
  onComplete: () => void;
}

const WelcomeAnimation = ({ profilePicUrl, username, onComplete }: WelcomeAnimationProps) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const steps = [
    "Welcome to your newsletter platform!",
    "Setting up your account...",
    "Configuring newsletter preferences...",
    "Almost ready!"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        const newProgress = oldProgress + 2;
        
        // Update step based on progress
        if (newProgress >= 25 && currentStep === 0) {
          setCurrentStep(1);
        } else if (newProgress >= 50 && currentStep === 1) {
          setCurrentStep(2);
        } else if (newProgress >= 75 && currentStep === 2) {
          setCurrentStep(3);
        } else if (newProgress >= 100) {
          setShowSuccess(true);
          setTimeout(() => {
            onComplete();
          }, 1000);
          return 100;
        }
        
        return newProgress;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentStep, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-blue-50 p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
        {/* Profile Picture */}
        <div className="mb-8">
          <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100">
            {profilePicUrl ? (
              <img 
                src={profilePicUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            {showSuccess && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 animate-fade-in">
            Welcome{username ? `, ${username}` : ''}!
          </h1>
          <p 
            key={currentStep}
            className="text-gray-600 animate-fade-in transition-all duration-500"
          >
            {steps[currentStep]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress 
            value={progress} 
            className="h-3 mb-2"
            indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          />
          <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
        </div>

        {/* Loading Animation */}
        {!showSuccess && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Success Animation */}
        {showSuccess && (
          <div className="animate-fade-in">
            <p className="text-green-600 font-semibold">All set! Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeAnimation;
