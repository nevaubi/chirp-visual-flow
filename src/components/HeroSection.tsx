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
      {/* Vertically scrolling newsletter columns */}
      <div className="absolute inset-0 z-0">
        {/* Left scrolling column - upward */}
        <div className="absolute -left-16 top-0 w-48 h-[200vh] opacity-15">
          <div className="animate-scroll-up flex flex-col gap-8">
            {/* First set of newsletters */}
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Duplicate set for seamless loop */}
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Third set for extra smoothness */}
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
          </div>
        </div>

        {/* Right scrolling column - downward with delay */}
        <div className="absolute -right-16 top-0 w-48 h-[200vh] opacity-15">
          <div className="animate-scroll-down flex flex-col gap-8">
            {/* First set of newsletters */}
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Duplicate set for seamless loop */}
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Third set for extra smoothness */}
            <img src="/2.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/1.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-48 h-auto rounded-lg shadow-lg border border-gray-200/50" />
          </div>
        </div>

        {/* Middle left column - slower upward */}
        <div className="absolute left-8 top-0 w-40 h-[200vh] opacity-10">
          <div className="animate-scroll-up-slow flex flex-col gap-12">
            {/* First set */}
            <img src="/3.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/1.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Duplicate set */}
            <img src="/3.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/1.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
          </div>
        </div>

        {/* Middle right column - slower downward */}
        <div className="absolute right-8 top-0 w-40 h-[200vh] opacity-10">
          <div className="animate-scroll-down-slow flex flex-col gap-12">
            {/* First set */}
            <img src="/1.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            {/* Duplicate set */}
            <img src="/1.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/3.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
            <img src="/2.png" alt="Newsletter" className="w-40 h-auto rounded-lg shadow-lg border border-gray-200/50" />
          </div>
        </div>

        {/* Gradient overlays to fade edges */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/80 to-transparent z-10"></div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent z-10"></div>
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-blue-50/60 to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-blue-50/60 to-transparent z-10"></div>

        {/* Subtle floating bookmark icons */}
        <div className="absolute top-24 left-1/5 z-20">
          <Bookmark className="w-4 h-4 text-[#0087C8] opacity-20 animate-pulse-subtle" fill="currentColor" />
        </div>
        <div className="absolute top-36 right-1/4 z-20">
          <Bookmark className="w-3 h-3 text-[#0087C8] opacity-15 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute bottom-40 left-1/3 z-20">
          <Bookmark className="w-5 h-5 text-[#0087C8] opacity-10 animate-pulse-subtle" fill="currentColor" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-30 pt-32">
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
