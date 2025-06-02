
import React from "react";
import { CheckCircle, Zap, Clock, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const WhoLetternestIsForSection = () => {
  const personas = [
    { 
      number: "1", 
      title: "Solo Founders", 
      description: "Managing everything yourself",
      detail: "You bookmark insights but lack time to create professional newsletters"
    },
    { 
      number: "2", 
      title: "Growth Marketers", 
      description: "Large scale audience",
      detail: "You need regular newsletters but spend hours on research and formatting"
    },
    { 
      number: "3", 
      title: "Content Creators", 
      description: "Building personal brands",
      detail: "You capture great ideas but struggle turning them into polished content"
    },
    { 
      number: "4", 
      title: "Thought Leaders", 
      description: "Deeply researched insights",
      detail: "You have valuable insights but publishing consistently feels overwhelming"
    }
  ];

  const benefits = [
    { icon: <Zap className="w-5 h-5" />, title: "3-Minute Creation", description: "From bookmarks to beautiful newsletter in under 3 minutes" },
    { icon: <Lightbulb className="w-5 h-5" />, title: "Auto-Enriched Content", description: "AI adds context, sources, and professional formatting" },
    { icon: <Clock className="w-5 h-5" />, title: "Save 8+ Hours", description: "No more research, writing, and design work per issue" },
    { icon: <CheckCircle className="w-5 h-5" />, title: "Zero Design Skills", description: "Professional newsletters without any design experience" }
  ];

  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-white">
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black mb-4">
            Who Uses <span className="text-[#0087C8]">Letternest</span>?
          </h2>
          <p className="text-xl text-gray-700 font-medium max-w-4xl mx-auto">
            For <span className="underline decoration-[#FF6B35] decoration-2">anyone</span> who wants beautiful newsletters, instantly.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column - Who It's For */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-black mb-2">
                Perfect <span className="text-[#0087C8]">For</span>
              </h3>
              <p className="text-gray-600 text-lg">People who want newsletters but struggle with the process</p>
            </div>
            
            <div className="space-y-8">
              {personas.map((persona, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#0087C8] hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start space-x-5">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-[#0087C8] rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                        {persona.number}
                      </div>
                    </div>
                    <div className="flex-1 pt-1 space-y-2">
                      <h4 className="text-xl font-black text-black">{persona.title} - {persona.description}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed italic">{persona.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-black mb-2">
                Why You'd <span className="text-[#FF6B35]">Love</span> It
              </h3>
              <p className="text-gray-600 text-lg">The benefits that make newsletter creation effortless</p>
            </div>
            
            <div className="space-y-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#FF6B35] hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start space-x-5">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-[#FF6B35] rounded-lg flex items-center justify-center text-white">
                        {benefit.icon}
                      </div>
                    </div>
                    <div className="flex-1 pt-1 space-y-2">
                      <h4 className="text-xl font-black text-black">{benefit.title}</h4>
                      <p className="text-gray-700 font-medium text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <Link 
            to="/auth"
            className="inline-flex items-center bg-gradient-to-r from-[#0087C8] to-[#006CA1] text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <span>Ready to get started?</span>
            <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WhoLetternestIsForSection;
