
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, BookOpen, Zap, Users } from "lucide-react";
import ChirpmetricsDashboard from "@/components/ChirpmetricsDashboard";
import ReviewsSection from "@/components/ReviewsSection";

export default function HeroSection() {
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      const navbarHeight = 80; // Account for navbar height
      const elementPosition = pricingSection.offsetTop;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-200/30 to-pink-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Blue wavy border at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg width="100%" height="120" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 20C120 60 240 80 360 70C480 60 600 35 720 25C840 15 960 35 1080 45C1200 55 1320 50 1440 35V120H0V20Z" fill="#0087C8"/>
        </svg>
      </div>

      {/* Arrow graphic - repositioned for better balance */}
      <div className="absolute top-32 right-80 z-10 hidden xl:block animate-bounce">
        <img 
          src="/arrow1.png" 
          alt="Arrow graphic" 
          width="60" 
          height="60"
          className="opacity-80"
        />
      </div>

      {/* Reviews section - positioned strategically above blue wave */}
      <div className="absolute bottom-32 right-12 z-20 hidden lg:block transform scale-125 hover:scale-130 transition-transform duration-300">
        <ReviewsSection />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center min-h-[calc(100vh-200px)]">
          
          {/* Left column - Main content */}
          <div className="w-full lg:w-3/5 lg:pr-8">
            {/* Mobile reviews section */}
            <div className="flex justify-center mb-8 lg:hidden">
              <ReviewsSection />
            </div>

            {/* Main headline */}
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight">
                <span className="block text-gray-900">Transform your</span>
                <span className="block bg-gradient-to-r from-[#0087C8] to-[#0066CC] bg-clip-text text-transparent">
                  Twitter bookmarks
                </span>
                <span className="block text-gray-900">into stunning</span>
                <span className="block bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] bg-clip-text text-transparent">
                  newsletters
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Stop letting great content get lost in your bookmarks. 
                <span className="block mt-2 font-semibold text-[#0087C8]">
                  Automatically curate and send beautiful newsletters to your audience.
                </span>
              </p>
            </div>

            {/* Key value propositions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0087C8] to-[#0066CC] rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Automated</div>
                  <div className="text-sm text-gray-600">Zero writing needed</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Beautiful</div>
                  <div className="text-sm text-gray-600">Professional design</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Engaging</div>
                  <div className="text-sm text-gray-600">High open rates</div>
                </div>
              </div>
            </div>
            
            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#e05a2c] hover:to-[#e07a35] text-white rounded-2xl px-8 py-4 font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                onClick={scrollToPricing}
              >
                <Mail size={22} />
                Start Creating Newsletters
                <ArrowRight size={20} />
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white rounded-2xl px-8 py-4 font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={scrollToPricing}
              >
                View Pricing
              </Button>
            </div>
          </div>
          
          {/* Right column - Dashboard preview */}
          <div className="w-full lg:w-2/5 relative">
            <div className="relative transform hover:scale-105 transition-transform duration-500">
              {/* Dashboard component with enhanced styling */}
              <div className="relative z-10">
                <ChirpmetricsDashboard />
              </div>
              
              {/* Enhanced floating newsletter success card */}
              <div className="absolute -bottom-8 -left-8 z-20">
                <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 max-w-[320px] transform rotate-[-2deg] hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mr-3">
                      <Mail size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Newsletter Sent!</div>
                      <div className="text-xs text-gray-500">Just now</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-3">
                    "Weekly Tech Digest" delivered to <span className="font-semibold text-[#0087C8]">1,847 subscribers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-semibold">96% open rate</span>
                    </div>
                    <span className="text-xs text-gray-500">from bookmarks</span>
                  </div>
                </div>
              </div>

              {/* Decorative gradient blur behind dashboard */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0087C8]/10 to-[#FF6B35]/10 rounded-3xl blur-2xl transform scale-110 -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
