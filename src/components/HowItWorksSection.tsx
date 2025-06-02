
import React from "react";
import TwitterMockup from "./TwitterMockup";
import BookmarkComponent from "./BookmarkComponent";
import Step3Image from "./Step3image";

const HowItWorksSection = () => {
  return (
    <section className="py-8 md:py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16">
          Generate a <span className="text-[#FF6B35]">beautiful newsletter</span> in <br className="hidden sm:block" />
          3 simple steps
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Step 1 - Updated with TwitterMockup */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-12 h-12 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              1
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-64 bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex items-center justify-center p-4 pt-6">
                <div className="bg-white rounded-lg w-full shadow-lg overflow-hidden max-h-full">
                  <div className="h-6 bg-gray-50 border-b border-gray-200 flex items-center px-2 gap-1">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff5f57]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ffbd2e]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#28ca42]"></div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded px-1.5 text-[10px] text-gray-600 flex items-center flex-1 ml-3">
                      <span className="text-[6px] mr-1">🔒</span>
                      twitter.com
                    </div>
                  </div>
                  <div className="w-full h-[180px] overflow-hidden bg-white">
                    <div 
                      className="w-full h-full flex items-start justify-center"
                      style={{ 
                        transform: 'scale(0.42)', 
                        transformOrigin: 'top center',
                        width: '238%',
                        marginLeft: '-69%'
                      }}
                    >
                      <TwitterMockup />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Bookmark your tweets</h3>
                <p className="text-gray-600">
                  Bookmark the tweets that include the topics and info you want in your next newsletter.
                </p>
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-12 h-12 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              2
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-64 bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex flex-col items-center justify-center gap-3 p-6 pt-8">
                <BookmarkComponent />
              </div>
              <div className="p-6 text-center mt-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  Login to letter<span style={{ color: '#FF6B2C' }}>nest</span>
                </h3>
                <p className="text-gray-600">
                  Manually create or schedule a newsletter. Use your chosen bookmarks - or let us decide. Pick a template.
                </p>
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-12 h-12 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              3
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-64 bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex items-center justify-center p-6 pt-8">
                <Step3Image />
              </div>
              <div className="p-6 text-center mt-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Get your newsletter</h3>
                <p className="text-gray-600">
                  Letternest analyzes and auto enriches the content, formats, and delivers your professional newsletter.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto">
          Bookmark tweets, select how many to include, and hit <strong className="text-gray-800">'Create Newsletter'</strong>. Letternest adds context and formatting - <strong className="text-gray-800">turning your bookmarks into a polished newsletter in under 3 minutes</strong>.
        </p>
      </div>
    </section>
  );
};

export default HowItWorksSection;
