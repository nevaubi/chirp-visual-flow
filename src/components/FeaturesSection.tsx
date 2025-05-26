
import React from "react";
import { Bookmark, Plus } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section 
      id="features" 
      className="py-8 md:py-12 relative bg-[#0087C8] -mt-1" // Added -mt-1 to remove the thin white line
    >
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[100px]">
          {/* Left column with side-by-side images - moved 50px left */}
          <div className="flex flex-col md:flex-row items-start justify-start gap-6 -ml-[50px]">
            {/* Features overview image - increased by 15% */}
            <div className="max-w-[280px] w-full">
              <img src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" alt="Features overview" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
            
            {/* Plus icon between images */}
            <div className="flex items-center justify-center">
              <Plus className="h-8 w-8 text-white" />
            </div>
            
            {/* Newsletter image - increased by 15% */}
            <div className="max-w-[280px] w-full">
              <img src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" alt="Email newsletter example" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
          </div>
          
          {/* Right column with animated text content - improved spacing and animations */}
          <div className="max-w-[500px] w-full md:ml-20 mt-8 md:mt-0 text-white">
            <div className="space-y-6 md:space-y-8 pl-2 md:pl-4">
              {/* Main heading with smoother animation */}
              <h2 
                className="text-3xl md:text-4xl font-bold opacity-0" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.2s"
                }}
              >
                What's your time worth?
              </h2>
              
              {/* Subheading with underlined "One" and improved animation */}
              <div 
                className="text-xl md:text-2xl font-semibold opacity-0" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "0.6s"
                }}
              >
                <span className="underline decoration-2 underline-offset-4">One</span>-click end to end newsletter automation.
              </div>
              
              {/* Bookmark to publish with icon and further improved animation - INCREASED TEXT SIZE */}
              <div 
                className="flex items-center gap-3 text-2xl md:text-3xl font-semibold opacity-0" 
                style={{
                  animation: "fadeInUp 0.7s ease-out forwards",
                  animationDelay: "1s"
                }}
              >
                {/* Added square background container for the Bookmark icon */}
                <div className="w-[50px] h-[50px] bg-[#1A9ADB] rounded-lg flex items-center justify-center hover:bg-[#2EABED] transition-colors">
                  <Bookmark className="h-9 w-9 text-white" /> {/* Increased icon size */}
                </div>
                <span className="text-2xl md:text-3xl">→ publish.</span> {/* Kept increased text size */}
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
