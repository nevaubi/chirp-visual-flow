
import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-8 md:py-12 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row -mt-[100px]">
          {/* Left column with stacked images */}
          <div className="flex flex-col items-start justify-start gap-6">
            {/* Features overview image - increased by 30% */}
            <div className="max-w-[195px] w-full">
              <img 
                src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" 
                alt="Features overview" 
                className="w-full h-auto rounded-lg"
                loading="lazy"
              />
            </div>
            
            {/* Arrows between images - side by side */}
            <div className="flex flex-row items-center justify-center w-full gap-4">
              <ArrowUp className="h-8 w-8 text-white" />
              <ArrowDown className="h-8 w-8 text-white" />
            </div>
            
            {/* Newsletter image - increased by 30% */}
            <div className="max-w-[195px] w-full">
              <img 
                src="/1c8576dd-211e-4e04-b6d1-be098d655656.png" 
                alt="Email newsletter example" 
                className="w-full h-auto rounded-lg"
                loading="lazy"
              />
            </div>
          </div>
          
          {/* Dee Image - increased size by 20% from the current size */}
          <div className="max-w-[408px] w-full md:ml-12 mt-8 md:mt-0">
            <img 
              src="/dee.png" 
              alt="Dee" 
              className="w-full h-auto rounded-lg"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
