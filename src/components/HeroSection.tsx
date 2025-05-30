
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, BookOpen, Zap, Users } from "lucide-react";
import ChirpmetricsDashboard from "@/components/ChirpmetricsDashboard";
import ReviewsSection from "@/components/ReviewsSection";

export default function HeroSection() {
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      const navbarHeight = 80;
      const elementPosition = pricingSection.offsetTop;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-100 via-white to-blue-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-pink-200/30 to-purple-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Blue wavy border at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg width="100%" height="120" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 20C120 60 240 80 360 70C480 60 600 35 720 25C840 15 960 35 1080 45C1200 55 1320 50 1440 35V120H0V20Z" fill="#0087C8"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center">
          
          {/* Main centered content */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            {/* Main headline - updated to 2 rows */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight">
              <span className="block bg-gradient-to-r from-[#0087C8] to-[#0066CC] bg-clip-text text-transparent">
                Turn X Bookmarks into
              </span>
              <span className="block bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] bg-clip-text text-transparent">
                Professional Newsletters
              </span>
            </h1>
            
            {/* Updated subtext */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto font-semibold">
              Never waste a good bookmark again.
            </p>

            {/* CTA buttons - matching screenshot dual button layout */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                className="bg-gradient-to-r from-[#0087C8] to-[#0066CC] hover:from-[#006ba3] hover:to-[#0052a3] text-white rounded-full px-8 py-4 font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                onClick={scrollToPricing}
              >
                Get Started
                <ArrowRight size={20} />
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-8 py-4 font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={scrollToPricing}
              >
                Learn More
                <ArrowRight size={20} />
              </Button>
            </div>

            {/* Centered Reviews Section */}
            <div className="flex justify-center">
              <ReviewsSection />
            </div>
          </div>

          {/* Bottom section with flanking cards - matching screenshot layout */}
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between relative">
            
            {/* Left showcase card */}
            <div className="hidden lg:block relative">
              <div className="transform rotate-[-8deg] hover:rotate-[-4deg] transition-transform duration-500">
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 max-w-[350px]">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mr-4">
                      <BookOpen size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">Newsletter Ready</div>
                      <div className="text-sm text-gray-500">From your bookmarks</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-4/5"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-3/5"></div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm text-gray-500">5 articles curated</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-semibold">Ready to send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center section with arrow and text */}
            <div className="text-center">
              <div className="hidden lg:block mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight size={24} className="text-white" />
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-700">See How</div>
              <div className="text-lg font-semibold text-gray-700">It's Done</div>
            </div>

            {/* Right showcase card */}
            <div className="hidden lg:block relative">
              <div className="transform rotate-[8deg] hover:rotate-[4deg] transition-transform duration-500">
                <div className="relative z-10">
                  <ChirpmetricsDashboard />
                </div>
                
                {/* Enhanced floating newsletter success card */}
                <div className="absolute -bottom-4 -left-4 z-20">
                  <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 max-w-[280px] transform rotate-[-4deg] hover:rotate-0 transition-transform duration-300">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                        <Mail size={16} className="text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Analytics</div>
                        <div className="text-xs text-gray-500">Live insights</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-3">
                      <span className="font-semibold text-[#0087C8]">1,847 subscribers</span> engaged
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-semibold">96% open rate</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
