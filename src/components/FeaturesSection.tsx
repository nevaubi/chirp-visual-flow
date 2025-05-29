
import React from "react";
import { Bookmark, Plus } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section 
      id="features" 
      className="py-4 md:py-12 relative bg-[#0087C8] -mt-1" // Reduced mobile padding from py-8 to py-4
    >
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[50px] md:-mt-[100px]"> {/* Reduced mobile negative margin */}
          {/* Left column with side-by-side images - optimized for mobile */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-3 md:gap-6 ml-0 md:-ml-[50px]"> {/* Removed problematic left margin on mobile */}
            {/* Features overview image - smaller on mobile */}
            <div className="max-w-[160px] md:max-w-[280px] w-full">
              <img src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" alt="Features overview" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
            
            {/* Plus icon between images - adjusted positioning for mobile */}
            <div className="flex items-center justify-center mt-2 md:mt-[100px]">
              <Plus className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            
            {/* Newsletter image - smaller on mobile */}
            <div className="max-w-[160px] md:max-w-[280px] w-full">
              <img src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" alt="Email newsletter example" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
          </div>
          
          {/* Right column with animated text content - optimized for mobile */}
          <div className="max-w-[500px] w-full ml-0 md:ml-20 mt-4 md:mt-0 text-white px-2 md:px-0"> {/* Reduced mobile spacing and added padding */}
            <div className="space-y-3 md:space-y-6 md:space-y-8 pl-0 md:pl-2 md:pl-4"> {/* Reduced mobile spacing */}
              {/* Main heading with smoother animation - smaller on mobile */}
              <h2 
                className="text-2xl md:text-3xl md:text-4xl font-bold opacity-0 text-center md:text-left" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.2s"
                }}
              >
                What's your time worth?
              </h2>
              
              {/* Subheading with underlined "One" and improved animation - smaller on mobile */}
              <div 
                className="text-lg md:text-xl md:text-2xl font-semibold opacity-0 text-center md:text-left" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.6s"
                }}
              >
                <span className="underline decoration-2 underline-offset-4">One</span>-click end to end newsletter automation.
              </div>
              
              {/* Bookmark to publish with icon - smaller on mobile and centered */}
              <div 
                className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-xl md:text-2xl md:text-3xl font-semibold opacity-0" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "1s"
                }}
              >
                {/* Added square background container for the Bookmark icon - smaller on mobile */}
                <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] bg-[#1A9ADB] rounded-lg flex items-center justify-center hover:bg-[#2EABED] transition-colors">
                  <Bookmark className="h-6 w-6 md:h-9 md:w-9 text-white" />
                </div>
                <span className="text-xl md:text-2xl md:text-3xl">→ publish.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add custom keyframes for smoother animations as a regular style tag */}
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
