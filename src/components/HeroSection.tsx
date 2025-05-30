
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";
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
          <path d="M0 20C120 60 240 80 360 70C480 60 600 35 720 25C840 15 960 35 1080 45C1200 55 1320 50 1440 35V120H0V20Z" fill="#0087C8" />
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center">
          
          {/* Main headline - 2 rows without gradient */}
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

          {/* Reviews section - centered under hero text */}
          <div className="flex justify-center mb-10">
            <ReviewsSection />
          </div>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            
            
          </div>
        </div>
      </div>
    </section>
  );
}
