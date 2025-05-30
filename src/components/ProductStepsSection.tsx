
import React from 'react';

export default function ProductStepsSection() {
  const steps = [
    {
      number: "01",
      title: "Select Your Content",
      description: "Choose your bookmarks or let AI curate trending topics"
    },
    {
      number: "02", 
      title: "AI Curates & Analyzes",
      description: "Advanced AI processes and organizes your content with insights"
    },
    {
      number: "03",
      title: "Professional Results",
      description: "Beautiful, ready-to-send newsletters in your library"
    }
  ];

  return (
    <div className="relative z-20 mb-10">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          From Bookmarks to Newsletters in 3 Simple Steps
        </h3>
        <p className="text-gray-600 max-w-xl mx-auto text-sm">
          See exactly how Letternest transforms your saved content into professional newsletters
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <div 
            key={step.number}
            className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {/* Step Number */}
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-[#0087C8] to-[#006CA1] text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs">
              {step.number}
            </div>
            
            {/* Video Placeholder Area - ready for future video integration */}
            <div className="relative mb-3 rounded-lg bg-gray-100/50 h-32 flex items-center justify-center border border-gray-200/30">
              <div className="text-gray-400 text-xs font-medium">Video Coming Soon</div>
            </div>
            
            {/* Content */}
            <h4 className="text-base font-bold text-gray-900 mb-2">
              {step.title}
            </h4>
            <p className="text-gray-600 text-xs leading-relaxed">
              {step.description}
            </p>
            
            {/* Connection Line (except for last item) */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-[#0087C8] to-transparent transform -translate-y-1/2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
