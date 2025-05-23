
import React from "react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-16 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4">
          <div className="max-w-xs w-full -mt-4 md:-mt-12 md:-ml-6">
            <img 
              src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" 
              alt="Features overview" 
              className="w-full h-auto rounded-lg shadow-xl"
              loading="lazy"
            />
          </div>
          
          {/* White Arrow pointing right */}
          <div className="hidden md:block">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 800 600"
              className="w-24 h-24"
              aria-hidden="true"
            >
              <path 
                d="M250,250 L250,350 L500,350 L500,425 L700,300 L500,175 L500,250 Z" 
                fill="white" 
              />
            </svg>
          </div>

          {/* Newsletter image */}
          <div className="max-w-xs md:max-w-sm w-full">
            <img 
              src="/Blue Pink Minimalist Business Email Newsletter (794 x 1500 px) (794 x 1600 px) (794 x 2300 px).png" 
              alt="Email newsletter example" 
              className="w-full h-auto rounded-lg shadow-xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
