
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Bookmark } from "lucide-react";
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
      {/* Newsletter mockups positioned symmetrically with reduced opacity */}
      <div className="absolute inset-0 z-0">
        {/* Left newsletter - NBA/Sports */}
        <div className="absolute left-8 top-32 transform -rotate-12 opacity-40">
          <div className="relative">
            <img 
              src="/1.png" 
              alt="Sports Newsletter" 
              className="w-64 h-auto rounded-lg shadow-xl border border-gray-200"
              style={{
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 rounded-lg"></div>
          </div>
        </div>

        {/* Right newsletter - AI/DeepSeek */}
        <div className="absolute right-8 top-40 transform rotate-12 opacity-40">
          <div className="relative">
            <img 
              src="/3.png" 
              alt="AI Newsletter" 
              className="w-64 h-auto rounded-lg shadow-xl border border-gray-200"
              style={{
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 rounded-lg"></div>
          </div>
        </div>

        {/* Center newsletter - NVIDIA/Tech - positioned further back */}
        <div className="absolute left-1/2 top-72 transform -translate-x-1/2 rotate-2 opacity-25 z-0">
          <div className="relative">
            <img 
              src="/2.png" 
              alt="Tech Newsletter" 
              className="w-72 h-auto rounded-lg shadow-2xl border border-gray-200"
              style={{
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/95 rounded-lg"></div>
          </div>
        </div>

        {/* Floating bookmark icons - more subtle */}
        <div className="absolute top-20 left-1/4 transform -translate-x-1/2">
          <Bookmark className="w-6 h-6 text-[#0087C8] opacity-20 animate-pulse-subtle" fill="currentColor" />
        </div>
        <div className="absolute top-28 right-1/4 transform translate-x-1/2">
          <Bookmark className="w-5 h-5 text-[#0087C8] opacity-15 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-80 left-1/3">
          <Bookmark className="w-4 h-4 text-[#0087C8] opacity-15 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute top-88 right-1/3">
          <Bookmark className="w-5 h-5 text-[#0087C8] opacity-20 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Large central bookmark icon - more subtle */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
          <Bookmark className="w-24 h-24 text-[#0087C8] opacity-8 animate-glow-pulse" fill="currentColor" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center">
          
          {/* Main headline with better contrast */}
          <div className="mb-8 relative z-20 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
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

          {/* Reviews section - with better visibility */}
          <div className="flex justify-center mb-10 relative z-20 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md">
            <ReviewsSection />
          </div>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 relative z-20">
            <Button 
              size="lg" 
              className="bg-[#0087C8] hover:bg-[#006CA1] text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              onClick={scrollToPricing}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white px-8 py-4 text-lg font-semibold rounded-full transition-all transform hover:scale-105"
            >
              <Mail className="mr-2 h-5 w-5" />
              See Live Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
