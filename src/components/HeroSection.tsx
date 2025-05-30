
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
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50/30 to-white">
      {/* Newsletter mockups positioned around the edges with better masking */}
      <div className="absolute inset-0 z-0">
        {/* Left newsletter - positioned more towards edge */}
        <div className="absolute -left-20 top-20 transform -rotate-12 opacity-25">
          <div className="relative">
            <img 
              src="/1.png" 
              alt="Sports Newsletter" 
              className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50"
              style={{
                maskImage: 'linear-gradient(45deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(45deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)'
              }}
            />
          </div>
        </div>

        {/* Right newsletter - positioned more towards edge */}
        <div className="absolute -right-20 top-32 transform rotate-12 opacity-25">
          <div className="relative">
            <img 
              src="/3.png" 
              alt="AI Newsletter" 
              className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50"
              style={{
                maskImage: 'linear-gradient(-45deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(-45deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)'
              }}
            />
          </div>
        </div>

        {/* Bottom center newsletter - subtle background element */}
        <div className="absolute left-1/2 bottom-10 transform -translate-x-1/2 rotate-1 opacity-15">
          <div className="relative">
            <img 
              src="/2.png" 
              alt="Tech Newsletter" 
              className="w-56 h-auto rounded-lg shadow-lg border border-gray-200/50"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)'
              }}
            />
          </div>
        </div>

        {/* Subtle floating bookmark icons */}
        <div className="absolute top-24 left-1/5">
          <Bookmark className="w-4 h-4 text-[#0087C8] opacity-20 animate-pulse-subtle" fill="currentColor" />
        </div>
        <div className="absolute top-36 right-1/4">
          <Bookmark className="w-3 h-3 text-[#0087C8] opacity-15 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute bottom-40 left-1/3">
          <Bookmark className="w-5 h-5 text-[#0087C8] opacity-10 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center max-w-5xl mx-auto">
          
          {/* Main headline - clean and prominent */}
          <div className="mb-8 relative z-20">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
              <span className="block">Turn X Bookmarks into</span>
              <span className="block bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">
                Professional Newsletters
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Stop letting great content get lost in your bookmarks. 
              <span className="block mt-2 font-semibold text-[#0087C8]">
                Automatically curate and send beautiful newsletters to your audience.
              </span>
            </p>
          </div>

          {/* Reviews section - clean presentation */}
          <div className="flex justify-center mb-10 relative z-20">
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
