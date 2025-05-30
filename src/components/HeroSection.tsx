
import { Button } from "@/components/ui/button";
import { Mail, Bell, ChevronDown, Twitter } from "lucide-react";
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
    <section className="pt-28 pb-32 relative overflow-hidden bg-white">
      {/* Blue wavy border at the bottom - improved curve smoothness */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg width="100%" height="auto" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 40C120 80 240 100 360 85C480 70 600 45 720 30C840 15 960 40 1080 55C1200 70 1320 60 1440 40V200H0V40Z" fill="#0087C8"/>
        </svg>
      </div>

      {/* Arrow graphic - repositioned down a bit more */}
      <div className="absolute top-[110px] right-[300px] z-10 hidden lg:block">
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
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
            <span className="text-[#0f2e47]">Want </span>
            <span className="text-[#0087C8]">Twitter </span>
            <span className="text-[#0f2e47]">growth?</span>
          </h2>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
            <span className="block">
              <span className="text-[#0087C8]">Automated </span>
              <span className="text-[#FF6B35]">newsletters </span>
              <span className="text-[#0087C8]">from </span>
              <span className="text-[#0087C8]">bookmarks</span>
              <span className="text-[#0f2e47]">?</span>
            </span>
          </h2>
          
          {/* "Choose one or both" text */}
          <p className="text-xl text-[#0f2e47] mb-4">
            Choose one - <span className="text-[#FF6B35]">or both</span>.
          </p>

          {/* Mobile reviews section */}
          <div className="flex justify-center mb-6">
            <ReviewsSection />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          {/* Left column with dashboard UI */}
          <div className="w-full lg:w-2/5 pt-[40px]">
            <div className="relative">
              {/* Replace Daily Audience card with ChirpmetricsDashboard */}
              <ChirpmetricsDashboard />
              
              {/* Floating followers card */}
              <div className="absolute -bottom-12 left-4">
                <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
                  <div className="flex items-center mb-1">
                    <Bell size={14} className="text-[#0087C8] mr-1" />
                    <span className="text-xs font-medium text-gray-600">New Followers</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-2">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">A</div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">B</div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">C</div>
                    </div>
                    <span className="text-xs font-semibold text-[#0087C8]">+28</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column with main message */}
          <div className="w-full lg:w-3/5 pt-[48px] lg:pt-[44px]">
            {/* Main marketing message - hidden on mobile */}
            <div className="mb-6 hidden lg:block">
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                <span className="text-[#0f2e47]">Want </span>
                <span className="text-[#0087C8]">Twitter </span>
                <span className="text-[#0f2e47]">growth?</span>
              </h2>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
                <span className="whitespace-nowrap md:whitespace-normal">
                  <span className="text-[#0087C8]">Automated </span>
                  <span className="text-[#FF6B35]">newsletters </span>
                  <span className="text-[#0087C8]">from </span>
                  <span className="text-[#0087C8]">bookmarks</span>
                  <span className="text-[#0f2e47]">?</span>
                </span>
              </h2>
              
              {/* "Choose one or both" text as separate element */}
              <p className="text-xl text-[#0f2e47] mb-4">
                Choose one - <span className="text-[#FF6B35]">or both</span>.
              </p>
              
              {/* Buttons stacked below the text - hidden on mobile */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Button 
                  className="bg-[#0087C8] hover:bg-[#0270A8] text-white rounded-xl px-5 py-2 font-medium"
                  onClick={scrollToPricing}
                >
                  Creator Platform
                </Button>
                <Button 
                  className="bg-[#FF6B35] hover:bg-[#e05a2c] text-white rounded-xl px-5 py-2 font-medium"
                  onClick={scrollToPricing}
                >
                  Twitter Newsletters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
