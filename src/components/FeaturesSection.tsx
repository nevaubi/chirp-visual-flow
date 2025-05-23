
import React from "react";

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
          
          {/* Dee Image - increased size by 20% from the current size */}
          <div className="max-w-[500px] w-full md:ml-12 mt-8 md:mt-0">
            
          </div>
        </div>
      </div>
    </section>
  );
}
