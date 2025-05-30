
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <section className="relative min-h-screen overflow-hidden bg-white">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #0087C8 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Floating UI Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Enhanced Newsletter mockup - top left */}
        <div className="absolute top-20 left-4 transform -rotate-6 hover:rotate-0 transition-transform duration-700">
          <Card className="w-80 h-[500px] shadow-2xl border-2 border-gray-200 bg-white relative overflow-hidden">
            <CardContent className="p-0 h-full">
              {/* Newsletter Header */}
              <div className="h-16 bg-[#0087C8] flex items-center px-6">
                <div className="w-8 h-8 bg-white rounded-full mr-3"></div>
                <div className="text-white font-bold text-lg">Weekly Tech Digest</div>
              </div>
              
              {/* Newsletter Content */}
              <div className="p-6 space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">🚀 This Week's Top Stories</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="h-3 bg-gray-800 rounded w-5/6 mb-1"></div>
                      <div className="h-2 bg-gray-400 rounded w-full"></div>
                      <div className="h-2 bg-gray-400 rounded w-3/4"></div>
                    </div>
                    <div>
                      <div className="h-3 bg-gray-800 rounded w-4/5 mb-1"></div>
                      <div className="h-2 bg-gray-400 rounded w-full"></div>
                      <div className="h-2 bg-gray-400 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
                
                {/* Tweet Section */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-400 rounded-full mr-2"></div>
                    <div className="h-2 bg-gray-600 rounded w-20"></div>
                  </div>
                  <div className="h-2 bg-gray-300 rounded w-full mb-1"></div>
                  <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                </div>
                
                {/* More Content */}
                <div className="space-y-2">
                  <div className="h-2 bg-gray-300 rounded w-full"></div>
                  <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                  <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
              
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Email client preview - top right */}
        <div className="absolute top-32 right-8 transform rotate-3 hover:rotate-0 transition-transform duration-700">
          <Card className="w-96 h-[420px] shadow-xl border border-gray-300 bg-white relative overflow-hidden">
            <CardContent className="p-0 h-full">
              {/* Email Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500 rounded-full mr-2"></div>
                    <div className="text-sm font-medium text-gray-900">Weekly Newsletter</div>
                  </div>
                  <div className="text-xs text-gray-500">2h ago</div>
                </div>
                <div className="text-sm text-gray-600">news@yourcompany.com</div>
                <div className="font-semibold text-gray-900 mt-1">Your curated content is ready! 📧</div>
              </div>
              
              {/* Email Body */}
              <div className="p-4 space-y-4">
                <div className="text-sm text-gray-700">
                  <div className="h-3 bg-gray-800 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-400 rounded w-full mb-1"></div>
                  <div className="h-2 bg-gray-400 rounded w-5/6"></div>
                </div>
                
                {/* Content Preview */}
                <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                  <div className="h-2 bg-blue-600 rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-500 rounded w-full mb-1"></div>
                  <div className="h-2 bg-gray-500 rounded w-4/5"></div>
                </div>
                
                <div className="space-y-2">
                  <div className="h-2 bg-gray-300 rounded w-full"></div>
                  <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                </div>
                
                {/* CTA Button */}
                <div className="bg-[#0087C8] text-white text-center py-2 px-4 rounded text-sm font-medium">
                  Read Full Newsletter
                </div>
              </div>
              
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
            </CardContent>
          </Card>
        </div>

        {/* Floating badges */}
        <div className="absolute top-1/3 left-1/4 animate-pulse-subtle">
          <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm font-medium">
            5-min setup
          </Badge>
        </div>

        <div className="absolute top-1/2 right-1/4 animate-pulse-subtle" style={{ animationDelay: '2s' }}>
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-4 py-2 text-sm font-medium">
            Auto-pilot mode
          </Badge>
        </div>

        <div className="absolute bottom-1/3 left-1/3 animate-pulse-subtle" style={{ animationDelay: '4s' }}>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium">
            No coding required
          </Badge>
        </div>
      </div>

      {/* Blue wavy border at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg width="100%" height="120" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 20C120 60 240 80 360 70C480 60 600 35 720 25C840 15 960 35 1080 45C1200 55 1320 50 1440 35V120H0V20Z" fill="#0087C8" />
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center">
          
          {/* Main headline */}
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
              <span className="block">Turn X Bookmarks into</span>
              <span className="block">Professional Newsletters</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Stop letting great content get lost in your bookmarks. 
              <span className="block mt-2 font-semibold text-[#0087C8]">
                Automatically curate and send beautiful newsletters to your audience.
              </span>
            </p>
          </div>

          {/* Reviews section */}
          <div className="flex justify-center mb-10">
            <ReviewsSection />
          </div>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={scrollToPricing}
              size="lg" 
              className="bg-[#0087C8] hover:bg-[#0076b2] text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Mail className="w-5 h-5 mr-2" />
              Start Creating Newsletters
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              See Live Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
