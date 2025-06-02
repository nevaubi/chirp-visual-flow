import React from "react";
import TwitterMockup from "./TwitterMockup";

const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-6">
          <p className="text-base font-medium">Here's how letternest works</p>
        </div>
        
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8">
          Generate a <span className="text-[#FF6B35]">beautiful newsletter</span> in<br className="hidden sm:block" />
          3 simple steps
        </h2>
        
        <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-16">
          Bookmark the tweets for your next newsletter, log in, choose how many to include, and hit <strong>'Create Newsletter'</strong>. Letternest adds enriched context, relevant research, and formatting - transforming your bookmarks into a <span className="text-gray-800 font-semibold">beautiful, ready-to-send newsletter in under 3 minutes</span>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 - Updated with TwitterMockup */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              1
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex items-center justify-center p-4 pt-6">
                <div className="bg-white rounded-lg w-full shadow-lg overflow-hidden">
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
                  <div className="w-full h-[200px] overflow-hidden bg-white">
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
                <h3 className="text-xl font-bold text-gray-800 mb-3">Bookmark tweets you love</h3>
                <p className="text-gray-600">
                  Use Twitter's bookmark feature to save tweets that you want to include in your next newsletter.
                </p>
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              2
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-64 bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex flex-col items-center justify-center gap-3 p-6 pt-8">
                {[
                  { url: "letternest.com" },
                  { url: "connect-twitter" },
                  { url: "select-bookmarks" }
                ].map((item, index) => (
                  <div key={index} className="bg-white rounded-lg w-full max-w-[200px] h-11 shadow-lg overflow-hidden transform rotate-0" style={{ transform: `rotate(${index === 0 ? -2 : index === 1 ? 1 : 0.5}deg)` }}>
                    <div className="h-5 bg-gray-50 border-b border-gray-200 flex items-center px-1.5 gap-1">
                      <div className="flex gap-1 scale-75">
                        <div className="w-2 h-2 rounded-full bg-[#ff5f57]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#28ca42]"></div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-md px-1.5 text-[10px] text-gray-600 flex items-center flex-1 ml-2">
                        <span className="text-[6px] mr-1">🔒</span>
                        {item.url}
                      </div>
                    </div>
                    <div className="h-[calc(100%-20px)] bg-white relative">
                      <div className="absolute right-1.5 bottom-0.5 text-xs text-gray-500">↗</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 text-center mt-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Connect your account</h3>
                <p className="text-gray-600">
                  Log in to letternest, connect your Twitter account, and select which bookmarks to include in your newsletter.
                </p>
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold z-20 shadow-lg border-2 border-white">
              3
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-64 bg-gradient-to-br from-[#0087C8] to-[#006CA1] flex items-center justify-center p-6 pt-8">
                <div className="bg-white rounded-lg w-full max-w-[260px] h-44 shadow-lg overflow-hidden">
                  <div className="h-7 bg-gray-50 border-b border-gray-200 flex items-center px-2 gap-1.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f57]"></div>
                      <div className="w-2 h-2 rounded-full bg-[#ffbd2e]"></div>
                      <div className="w-2 h-2 rounded-full bg-[#28ca42]"></div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-md px-2 text-xs text-gray-600 flex items-center flex-1 ml-4">
                      <span className="text-[8px] mr-1.5">🔒</span>
                      newsletter.html
                    </div>
                  </div>
                  <div className="h-[calc(100%-28px)] bg-gray-50 p-2">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="bg-white rounded p-2 mb-1.5 border-l-2 border-[#FF6B35] flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#FF6B35] rounded-full flex-shrink-0"></div>
                        <div className="h-2 bg-gray-200 rounded-sm flex-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 text-center mt-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Get your professional newsletter</h3>
                <p className="text-gray-600">
                  Letternest automatically enriches your bookmarks with context, formats them beautifully, and delivers your ready-to-send newsletter in minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection; 
