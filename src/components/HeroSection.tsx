
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Bookmark, Zap, Send } from "lucide-react";
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
        {/* Newsletter mockup - top left */}
        <div className="absolute top-32 left-8 transform -rotate-6 hover:rotate-0 transition-transform duration-700">
          <Card className="w-64 h-80 shadow-xl border-2 border-gray-100">
            <CardContent className="p-4">
              <div className="h-8 bg-[#0087C8] rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="mt-4 h-24 bg-gray-100 rounded"></div>
              <div className="mt-3 space-y-1">
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email preview - top right */}
        <div className="absolute top-40 right-12 transform rotate-3 hover:rotate-0 transition-transform duration-700">
          <Card className="w-56 h-64 shadow-lg border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-orange-400 rounded-full"></div>
                <div className="h-2 bg-gray-300 rounded w-20"></div>
              </div>
              <div className="h-3 bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="mt-3 h-16 bg-blue-50 rounded border-2 border-dashed border-blue-200"></div>
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

          {/* Visual Process Flow */}
          <div className="flex flex-col lg:flex-row items-center gap-8 mb-12 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center group">
              <Card className="w-32 h-32 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2">
                <Bookmark className="w-12 h-12 text-[#0087C8]" />
              </Card>
              <h3 className="font-semibold text-gray-900 mb-2">Bookmark Content</h3>
              <p className="text-sm text-gray-600 text-center max-w-32">Save interesting tweets and threads</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-8 h-8 text-gray-400 hidden lg:block" />

            {/* Step 2 */}
            <div className="flex flex-col items-center group">
              <Card className="w-32 h-32 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2">
                <Zap className="w-12 h-12 text-orange-500" />
              </Card>
              <h3 className="font-semibold text-gray-900 mb-2">AI Curation</h3>
              <p className="text-sm text-gray-600 text-center max-w-32">Smart AI organizes and formats</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-8 h-8 text-gray-400 hidden lg:block" />

            {/* Step 3 */}
            <div className="flex flex-col items-center group">
              <Card className="w-32 h-32 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2">
                <Send className="w-12 h-12 text-green-600" />
              </Card>
              <h3 className="font-semibold text-gray-900 mb-2">Send Newsletter</h3>
              <p className="text-sm text-gray-600 text-center max-w-32">Beautiful emails to your audience</p>
            </div>
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
