
import React from "react";
import { Bookmark, Plus } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section 
      id="features" 
      className="py-2 md:py-12 relative bg-[#0087C8] -mt-1 pt-8 md:pt-2"
    >
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[20px] md:-mt-[100px]">
          {/* Left column with side-by-side images - changed to horizontal on mobile */}
          <div className="flex flex-row md:flex-row items-center md:items-start justify-center md:justify-start gap-3 md:gap-6 ml-0 md:-ml-[50px]">
            {/* Features overview image - enlarged on mobile for better visibility */}
            <div className="max-w-[145px] md:max-w-[280px] w-full">
              <img src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" alt="Features overview" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
            
            {/* Plus icon between images - centered for mobile */}
            <div className="flex items-center justify-center md:mt-[100px]">
              <Plus className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            
            {/* Newsletter image - enlarged on mobile for better visibility */}
            <div className="max-w-[145px] md:max-w-[280px] w-full">
              <img src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" alt="Email newsletter example" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
          </div>
          
          {/* Right column with animated text content - optimized for mobile */}
          <div className="max-w-[500px] w-full ml-0 md:ml-20 mt-2 md:mt-0 text-white px-2 md:px-0">
            <div className="space-y-2 md:space-y-6 md:space-y-8 pl-0 md:pl-2 md:pl-4">
              <h2 
                className="text-2xl md:text-3xl md:text-4xl font-bold opacity-0 text-center md:text-left" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.2s"
                }}
              >
                What's your time worth?
              </h2>
              
              {/* Hide this text on mobile only */}
              <div 
                className="hidden md:block text-lg md:text-xl md:text-2xl font-semibold opacity-0 text-center md:text-left" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.6s"
                }}
              >
                <span className="underline decoration-2 underline-offset-4">One</span>-click end to end newsletter automation.
              </div>
              
              <div 
                className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-xl md:text-2xl md:text-3xl font-semibold opacity-0" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "1s"
                }}
              >
                <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] bg-[#1A9ADB] rounded-lg flex items-center justify-center hover:bg-[#2EABED] transition-colors">
                  <Bookmark className="h-6 w-6 md:h-9 md:w-9 text-white" />
                </div>
                <span className="text-xl md:text-2xl md:text-3xl">→ publish.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        {`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        `}
      </style>
    </section>
  );
}
