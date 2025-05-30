
import React from 'react';

export default function ProductStepsSection() {
  const steps = [
    {
      number: "01",
      title: "Select Your Content",
      description: "Choose your bookmarks or let AI curate trending topics",
      image: "/lovable-uploads/500bc22a-2740-421b-a6ee-42fc8078a831.png",
      alt: "Manual newsletter generation interface"
    },
    {
      number: "02", 
      title: "AI Curates & Analyzes",
      description: "Advanced AI processes and organizes your content with insights",
      image: "/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png",
      alt: "Newsletter with analytics chart"
    },
    {
      number: "03",
      title: "Professional Results",
      description: "Beautiful, ready-to-send newsletters in your library",
      image: "/Screenshot 2025-05-30 051623.png",
      alt: "Newsletter library interface"
    }
  ];

  return (
    <div className="relative z-20 mb-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          From Bookmarks to Newsletters in 3 Simple Steps
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          See exactly how Letternest transforms your saved content into professional newsletters
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {steps.map((step, index) => (
          <div 
            key={step.number}
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {/* Step Number */}
            <div className="absolute -top-4 left-6 bg-gradient-to-r from-[#0087C8] to-[#006CA1] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              {step.number}
            </div>
            
            {/* Image Container */}
            <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200">
              <img 
                src={step.image}
                alt={step.alt}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            {/* Content */}
            <h4 className="text-lg font-bold text-gray-900 mb-2">
              {step.title}
            </h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              {step.description}
            </p>
            
            {/* Connection Line (except for last item) */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#0087C8] to-transparent transform -translate-y-1/2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
