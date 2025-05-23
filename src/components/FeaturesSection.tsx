import { useEffect, useRef } from "react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Powerful Features</h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Everything you need to streamline your social media workflow in one place.
          </p>
        </div>
        
        {/* Grid of features has been removed */}
      </div>
    </section>
  );
}
