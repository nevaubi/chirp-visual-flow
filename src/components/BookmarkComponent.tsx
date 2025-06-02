import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function BookmarkComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Stop observing once animation starts
        }
      },
      {
        threshold: 0.3, // Trigger when 30% of the component is visible
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before it's fully in view
      }
    );

    if (componentRef.current) {
      observer.observe(componentRef.current);
    }

    return () => {
      if (componentRef.current) {
        observer.unobserve(componentRef.current);
      }
    };
  }, []);

  return (
    <div ref={componentRef} className="w-full h-full flex items-center justify-center p-4">
      <style>{`
        @keyframes dropIn {
          0% {
            transform: translateY(-100px) rotate(-3deg);
            opacity: 0;
          }
          50% {
            transform: translateY(10px) rotate(-3deg);
            opacity: 1;
          }
          100% {
            transform: translateY(0) rotate(-3deg);
            opacity: 1;
          }
        }
        
        @keyframes dropInStraight {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          50% {
            transform: translateY(10px);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .bookmark-1.animate {
          animation: dropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.2s;
        }
        
        .bookmark-2.animate {
          animation: dropInStraight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.4s;
        }
        
        .bookmark-3.animate {
          animation: dropInStraight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.6s;
        }
        
        .or-element.animate {
          animation: fadeIn 0.6s ease-out forwards;
          animation-delay: 0.8s;
        }
        
        .calendar-element.animate {
          animation: fadeIn 0.6s ease-out forwards;
          animation-delay: 1s;
        }
        
        .bookmark-1, .bookmark-2, .bookmark-3, .or-element, .calendar-element {
          opacity: 0;
        }
        
        .bookmark-1.animate, .bookmark-2.animate, .bookmark-3.animate, .or-element.animate, .calendar-element.animate {
          opacity: 0;
        }
      `}</style>
      
      <div className="flex items-center space-x-8 scale-75 -ml-0 sm:-ml-8">
        {/* Left side - Bookmark options */}
        <div className="flex flex-col space-y-4">
          {/* First button - slightly rotated */}
          <button 
            className={`bookmark-1 ${isVisible ? 'animate' : ''} bg-white rounded-3xl px-4 py-2 shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-between w-48 transform -rotate-3`}
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex flex-col items-start">
              <span className="text-black text-sm font-bold">Use</span>
              <span className="text-black text-lg font-bold">10 Bookmarks</span>
            </div>
            <div className="bg-blue-900 rounded-full p-1.5">
              <Bookmark className="w-4 h-4 text-white fill-white" />
            </div>
          </button>
          
          <button className={`bookmark-2 ${isVisible ? 'animate' : ''} bg-white rounded-3xl px-4 py-2 shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-between w-48`}
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex flex-col items-start">
              <span className="text-black text-sm font-bold">Use</span>
              <span className="text-black text-lg font-bold">20 Bookmarks</span>
            </div>
            <div className="bg-blue-900 rounded-full p-1.5">
              <Bookmark className="w-4 h-4 text-white fill-white" />
            </div>
          </button>
          
          <button className={`bookmark-3 ${isVisible ? 'animate' : ''} bg-white rounded-3xl px-4 py-2 shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-between w-48`}
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex flex-col items-start">
              <span className="text-black text-sm font-bold">Use</span>
              <span className="text-black text-lg font-bold">30 Bookmarks</span>
            </div>
            <div className="bg-blue-900 rounded-full p-1.5">
              <Bookmark className="w-4 h-4 text-white fill-white" />
            </div>
          </button>
        </div>
        
        {/* Center - OR element */}
        <div className={`or-element ${isVisible ? 'animate' : ''} bg-orange-500 rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}>
          <span className="text-white text-lg font-bold">or</span>
        </div>
        
        {/* Right side - Calendar option */}
        <div className={`calendar-element ${isVisible ? 'animate' : ''} bg-white rounded-full w-36 h-36 flex items-center justify-center shadow-2xl relative`}
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 2px 4px 0 rgba(255, 255, 255, 0.6)' }}
        >
          <div className="relative">
            {/* Calendar grid */}
            <div className="text-blue-700">
              <svg width="90" height="90" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Calendar header */}
                <rect x="12" y="16" width="72" height="64" rx="4" stroke="currentColor" strokeWidth="3" fill="none"/>
                <rect x="12" y="16" width="72" height="16" rx="4" fill="currentColor"/>
                
                {/* Calendar rings/bindings */}
                <rect x="28" y="8" width="4" height="16" rx="2" fill="currentColor"/>
                <rect x="44" y="8" width="4" height="16" rx="2" fill="currentColor"/>
                <rect x="60" y="8" width="4" height="16" rx="2" fill="currentColor"/>
                
                {/* Calendar grid squares */}
                <rect x="20" y="40" width="8" height="6" fill="currentColor"/>
                <rect x="32" y="40" width="8" height="6" fill="currentColor"/>
                <rect x="44" y="40" width="8" height="6" fill="currentColor"/>
                <rect x="56" y="40" width="8" height="6" fill="currentColor"/>
                
                <rect x="20" y="50" width="8" height="6" fill="currentColor"/>
                <rect x="32" y="50" width="8" height="6" fill="currentColor"/>
                <rect x="44" y="50" width="8" height="6" fill="currentColor"/>
                <rect x="56" y="50" width="8" height="6" fill="currentColor"/>
                
                <rect x="20" y="60" width="8" height="6" fill="currentColor"/>
                <rect x="32" y="60" width="8" height="6" fill="currentColor"/>
                <rect x="44" y="60" width="8" height="6" fill="currentColor"/>
              </svg>
            </div>
            
            {/* Clock/timer overlay */}
            <div className="absolute -bottom-1 -right-1 bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center">
              <div className="relative">
                {/* Dotted circle */}
                <svg width="24" height="24" viewBox="0 0 32 32" className="absolute inset-0">
                  <circle 
                    cx="16" 
                    cy="16" 
                    r="12" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="2 2"
                    opacity="0.7"
                  />
                </svg>
                {/* Clock hands and checkmark */}
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                    <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.2 6.4l-4 4c-.2.2-.4.3-.7.3s-.5-.1-.7-.3l-2-2c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.3 1.3 3.3-3.3c.4-.4 1-.4 1.4 0s.4 1 0 1.4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
