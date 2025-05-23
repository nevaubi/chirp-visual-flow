
import React from "react";
import { Bookmark } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section 
      id="features" 
      className="py-8 md:py-12 relative bg-[#0087C8] -mt-1" // Added -mt-1 to remove the thin white line
    >
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[100px]">
          {/* Left column with side-by-side images */}
          <div className="flex flex-col md:flex-row items-start justify-start gap-6">
            {/* Features overview image - increased by 15% */}
            <div className="max-w-[280px] w-full">
              <img src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" alt="Features overview" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
            
            {/* Newsletter image - increased by 15% */}
            <div className="max-w-[280px] w-full">
              <img src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" alt="Email newsletter example" className="w-full h-auto rounded-lg" loading="lazy" />
            </div>
          </div>
          
          {/* Right column with animated text content */}
          <div className="max-w-[500px] w-full md:ml-12 mt-8 md:mt-0 text-white">
            <div className="space-y-4">
              {/* Main heading with animation */}
              <h2 className="text-3xl md:text-4xl font-bold animate-fade-in" style={{ animationDelay: '0.3s' }}>
                What's your time worth?
              </h2>
              
              {/* Subheading with underlined "One" and delayed animation */}
              <div className="text-xl md:text-2xl font-semibold animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <span className="underline decoration-2 underline-offset-4">One</span>-click end to end newsletter automation.
              </div>
              
              {/* Bookmark to publish with icon and further delayed animation */}
              <div className="flex items-center gap-2 text-xl md:text-2xl font-semibold animate-fade-in" style={{ animationDelay: '0.9s' }}>
                <Bookmark className="h-6 w-6" />
                <span>→ publish.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
