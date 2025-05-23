
import React from "react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-16 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8 mx-auto">
        <div className="flex items-center md:justify-start justify-center">
          <div className="max-w-xs w-full -mt-4 md:-mt-12 md:-ml-6">
            <img 
              src="/ChatGPT Image May 22, 2025, 09_59_40 PM.png" 
              alt="Features overview" 
              className="w-full h-auto rounded-lg shadow-xl"
              loading="lazy"
            />
          </div>
          
          {/* White Arrow pointing right */}
          <div className="hidden md:block ml-4">
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
        </div>
      </div>
    </section>
  );
}
