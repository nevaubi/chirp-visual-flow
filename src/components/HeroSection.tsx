
import { Button } from "@/components/ui/button";
import { Mail, Bell, ChevronDown, ArrowRight } from "lucide-react";
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
    <section className="pt-28 pb-32 relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-white">
      {/* Blue wavy border at the bottom - improved curve smoothness */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg width="100%" height="auto" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 40C120 80 240 100 360 85C480 70 600 45 720 30C840 15 960 40 1080 55C1200 70 1320 60 1440 40V200H0V40Z" fill="#0087C8"/>
        </svg>
      </div>

      {/* Arrow graphic - repositioned */}
      <div className="absolute top-[120px] right-[280px] z-10 hidden lg:block">
        <img 
          src="/arrow1.png" 
          alt="Arrow graphic" 
          width="55" 
          height="55"
        />
      </div>

      {/* Reviews section - positioned on the right side above blue wave */}
      <div className="absolute bottom-24 right-8 z-10 hidden lg:block transform scale-110">
        <ReviewsSection />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        {/* Mobile-only text at top */}
        <div className="block lg:hidden mb-8 pt-[5px]">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
            <span className="text-[#0f2e47]">Turn your </span>
            <span className="text-[#0087C8]">Twitter bookmarks </span>
            <span className="text-[#0f2e47]">into </span>
            <span className="text-[#FF6B35]">beautiful newsletters</span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            Automatically generate and send newsletters from your saved Twitter content. 
            <span className="text-[#0087C8] font-semibold"> No writing required.</span>
          </p>

          {/* Mobile reviews section */}
          <div className="flex justify-center mb-8">
            <ReviewsSection />
          </div>

          {/* Mobile CTA buttons */}
          <div className="flex flex-col gap-3 mb-8">
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e05a2c] text-white rounded-xl px-6 py-3 font-semibold text-lg flex items-center justify-center gap-2"
              onClick={scrollToPricing}
            >
              <Mail size={20} />
              Start Creating Newsletters
              <ArrowRight size={18} />
            </Button>
            <Button 
              variant="outline"
              className="border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white rounded-xl px-6 py-3 font-medium"
              onClick={scrollToPricing}
            >
              View Pricing
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          {/* Left column with dashboard UI */}
          <div className="w-full lg:w-2/5 pt-[40px]">
            <div className="relative">
              {/* Dashboard component */}
              <ChirpmetricsDashboard />
              
              {/* Floating newsletter card */}
              <div className="absolute -bottom-12 left-4">
                <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 max-w-[280px]">
                  <div className="flex items-center mb-2">
                    <Mail size={16} className="text-[#FF6B35] mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Newsletter Sent</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    "Weekly Tech Roundup" sent to 1,247 subscribers
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium">✓ 94% open rate</span>
                    <span className="text-xs text-[#0087C8]">2 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column with main message */}
          <div className="w-full lg:w-3/5 pt-[48px] lg:pt-[44px]">
            {/* Main marketing message - hidden on mobile */}
            <div className="mb-8 hidden lg:block">
              <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-6">
                <span className="text-[#0f2e47]">Turn your </span>
                <span className="text-[#0087C8]">Twitter bookmarks </span>
                <span className="text-[#0f2e47]">into </span>
                <span className="text-[#FF6B35]">beautiful newsletters</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
                Automatically generate and send newsletters from your saved Twitter content. 
                <span className="text-[#0087C8] font-semibold"> No writing required.</span>
              </p>
              
              {/* Key benefits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#FF6B35] rounded-full"></div>
                  <span className="text-gray-700">Automated content curation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#0087C8] rounded-full"></div>
                  <span className="text-gray-700">Professional newsletter design</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#FF6B35] rounded-full"></div>
                  <span className="text-gray-700">Scheduled delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#0087C8] rounded-full"></div>
                  <span className="text-gray-700">Audience analytics</span>
                </div>
              </div>
              
              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4">
                <Button 
                  className="bg-[#FF6B35] hover:bg-[#e05a2c] text-white rounded-xl px-8 py-3 font-semibold text-lg flex items-center gap-2"
                  onClick={scrollToPricing}
                >
                  <Mail size={20} />
                  Start Creating Newsletters
                  <ArrowRight size={18} />
                </Button>
                <Button 
                  variant="outline"
                  className="border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white rounded-xl px-6 py-3 font-medium"
                  onClick={scrollToPricing}
                >
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
