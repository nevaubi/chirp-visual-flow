
import React from "react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-16 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[100px]">
          {/* Left column with stacked images */}
          <div className="flex flex-col items-start justify-start gap-8">
            {/* Features overview image - reduced size */}
            <div className="max-w-[150px] w-full">
              <img 
                src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" 
                alt="Features overview" 
                className="w-full h-auto rounded-lg shadow-xl"
                loading="lazy"
              />
            </div>
            
            {/* Newsletter image - reduced size */}
            <div className="max-w-[150px] w-full">
              <img 
                src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" 
                alt="Email newsletter example" 
                className="w-full h-auto rounded-lg shadow-xl"
                loading="lazy"
              />
            </div>
          </div>
          
          {/* Dee Image - reduced size by ~30% and placed to the right */}
          <div className="max-w-[280px] w-full md:ml-12 mt-8 md:mt-0">
            <img 
              src="/dee.png" 
              alt="Dee" 
              className="w-full h-auto rounded-lg shadow-xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
