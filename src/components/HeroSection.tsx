
// components/HeroSection.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";
import ReviewsSection from "@/components/ReviewsSection";

export default function HeroSection() {
  /* -------------------------------------------------- */
  /* helper: scroll to top on component mount           */
  /* -------------------------------------------------- */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* -------------------------------------------------- */
  /* helper: smooth-scroll to pricing                    */
  /* -------------------------------------------------- */
  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing-section");
    if (!pricingSection) return;

    const navbarHeight = 80; // px – adjust if your nav height changes
    const offset = pricingSection.offsetTop - navbarHeight;

    window.scrollTo({ top: offset, behavior: "smooth" });
  };

  /* -------------------------------------------------- */
  /* render                                             */
  /* -------------------------------------------------- */
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50/30 to-white">
      {/* -- SCROLLING BACKGROUND -- */}
      <div className="absolute inset-0 z-0">
        {/* -- LEFT OUTER (scroll ↑) --------------------------------------- */}
        <div className="absolute left-4 sm:left-16 top-0 w-32 sm:w-48 h-[150vh] sm:h-[200vh] opacity-10">
          <div className="animate-scroll-slow transform-gpu flex flex-col gap-8 sm:gap-12">
            {/** repeat images for seamless loop */}
            {[
              "/real1.png",
              "/real3.png",
              "/real1.png",
              "/real3.png",
              "/real1.png",
              "/real3.png",
              "/real1.png",
              "/real3.png",
            ].map((src) => (
              <img
                key={src + "L1"}
                src={src}
                alt="Newsletter"
                className="w-full h-auto rounded-lg shadow-lg border border-gray-200/50"
              />
            ))}
          </div>
        </div>

        {/* -- LEFT INNER (scroll ↓) --------------------------------------- */}
        <div className="absolute left-1/2 sm:left-80 top-0 w-32 sm:w-48 h-[150vh] sm:h-[200vh] opacity-10 -translate-x-1/2 sm:translate-x-0">
          <div className="animate-scroll-slow-reverse transform-gpu flex flex-col gap-8 sm:gap-12">
            {[
              "/real2.png",
              "/real4.png",
              "/real2.png",
              "/real4.png",
              "/real2.png",
              "/real4.png",
              "/real2.png",
              "/real4.png",
            ].map((src) => (
              <img
                key={src + "L2"}
                src={src}
                alt="Newsletter"
                className="w-full h-auto rounded-lg shadow-lg border border-gray-200/50"
              />
            ))}
          </div>
        </div>

        {/* -- RIGHT INNER (scroll ↑) -------------------------------------- */}
        <div className="absolute right-1/2 sm:right-80 top-0 w-32 sm:w-48 h-[150vh] sm:h-[200vh] opacity-10 translate-x-1/2 sm:translate-x-0">
          <div className="animate-scroll-slow transform-gpu flex flex-col gap-8 sm:gap-12">
            {[
              "/real1.png",
              "/real4.png",
              "/real1.png",
              "/real4.png",
              "/real1.png",
              "/real4.png",
              "/real1.png",
              "/real4.png",
            ].map((src) => (
              <img
                key={src + "R1"}
                src={src}
                alt="Newsletter"
                className="w-full h-auto rounded-lg shadow-lg border border-gray-200/50"
              />
            ))}
          </div>
        </div>

        {/* -- RIGHT OUTER (scroll ↓) -------------------------------------- */}
        <div className="absolute right-4 sm:right-16 top-0 w-32 sm:w-48 h-[150vh] sm:h-[200vh] opacity-10">
          <div className="animate-scroll-slow-reverse transform-gpu flex flex-col gap-8 sm:gap-12">
            {[
              "/real2.png",
              "/real3.png",
              "/real2.png",
              "/real3.png",
              "/real2.png",
              "/real3.png",
              "/real2.png",
              "/real3.png",
            ].map((src) => (
              <img
                key={src + "R2"}
                src={src}
                alt="Newsletter"
                className="w-full h-auto rounded-lg shadow-lg border border-gray-200/50"
              />
            ))}
          </div>
        </div>

        {/* -- GRADIENT FADES ---------------------------------------------- */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/80 to-transparent z-10" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
        <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-blue-50/60 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-blue-50/60 to-transparent z-10" />
      </div>

      {/* ---------------------------- HERO CONTENT ------------------------- */}
      <div className="container mx-auto px-4 sm:px-6 relative z-30 pt-24 sm:pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-200px)] justify-center max-w-6xl mx-auto">
          
          {/* Mobile Layout: Text → Images → Social proof + CTA */}
          <div className="lg:hidden w-full">
            {/* Headline */}
            <div className="mb-6 sm:mb-8 relative z-20 w-full">
              <h1 className="text-5xl sm:text-5xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
                <span className="block">Turn <span className="text-[#FF6B35]">X Bookmarks</span></span>
                <span className="block">into Professional</span>
                <span className="block bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">
                  Newsletters
                </span>
              </h1>
              <p className="text-xl sm:text-xl leading-relaxed text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto">
                <span className="text-[#FF6B35]">Never</span> waste a good bookmark again.
                <span className="block mt-2 font-semibold text-[#0087C8]">
                  <span className="text-[#FF6B35]">Automatically</span> curate and send beautiful newsletters to your
                  audience.
                </span>
              </p>
            </div>

            {/* Image Sequence */}
            <div className="mb-8 sm:mb-10 relative z-20">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {/* First Image */}
                <div className="relative rounded-2xl overflow-hidden w-[25%] sm:w-[30%]">
                  <img
                    src="/homepic1.png"
                    alt="X Bookmarks Dashboard"
                    className="w-full h-auto"
                  />
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-[#0087C8] animate-pulse" />
                </div>

                {/* Second Image - 40% larger */}
                <div className="relative rounded-2xl overflow-hidden w-[35%] sm:w-[42%]">
                  <img
                    src="/homepic2.png"
                    alt="Generated Newsletter"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex justify-center relative z-20 mb-8 sm:mb-10">
              <ReviewsSection />
            </div>

            {/* CTA button */}
            <div className="flex justify-center relative z-20 w-full">
              <Button
                size="lg"
                className="bg-[#0087C8] hover:bg-[#006CA1] text-white px-10 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 w-full sm:w-auto max-w-sm"
                onClick={scrollToPricing}
              >
                Get Started Free
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Large Screen Layout: Text left, Social proof + CTA right, Images below */}
          <div className="hidden lg:block w-full">
            {/* Two-column layout for text and social proof + CTA */}
            <div className="grid grid-cols-2 gap-16 items-start mb-16">
              {/* Left Column: Hero Text (headline + subtext) */}
              <div className="text-left">
                <h1 className="text-5xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
                  <span className="block">Turn <span className="text-[#FF6B35]">X Bookmarks</span></span>
                  <span className="block">into Professional</span>
                  <span className="block bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">
                    Newsletters
                  </span>
                </h1>
                
                {/* Subtext moved under headline */}
                <p className="text-2xl text-gray-600 leading-relaxed text-left">
                  <span className="text-[#FF6B35]">Never</span> waste a good bookmark again.
                  <span className="block mt-2 font-semibold text-[#0087C8]">
                    <span className="text-[#FF6B35]">Automatically</span> curate and send beautiful newsletters to your
                    audience.
                  </span>
                </p>
              </div>

              {/* Right Column: Social proof + CTA */}
              <div className="flex flex-col items-start space-y-8">
                {/* Social proof */}
                <div className="relative z-20">
                  <ReviewsSection />
                </div>

                {/* CTA button - left aligned */}
                <div className="relative z-20 w-full">
                  <Button
                    size="lg"
                    className="bg-[#0087C8] hover:bg-[#006CA1] text-white px-10 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 w-full max-w-sm"
                    onClick={scrollToPricing}
                  >
                    Get Started Free
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </div>

                {/* Bullet points list - Enhanced styling */}
                <div className="relative z-20 w-full">
                  <ul className="space-y-4 text-lg">
                    <li className="flex items-center group">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-green-200 transition-colors">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-bold">Auto enriched for context</span>
                    </li>
                    <li className="flex items-center group">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-green-200 transition-colors">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-bold">Any niche/topic</span>
                    </li>
                    <li className="flex items-center group">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-green-200 transition-colors">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-bold">Emailed in 2-3 minutes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Full-width Image Sequence */}
            <div className="relative z-20">
              <div className="flex items-center justify-center gap-8">
                {/* First Image */}
                <div className="relative rounded-2xl overflow-hidden w-[35%] max-w-md">
                  <img
                    src="/homepic1.png"
                    alt="X Bookmarks Dashboard"
                    className="w-full h-auto"
                  />
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ArrowRight className="w-12 h-12 text-[#0087C8] animate-pulse" />
                </div>

                {/* Second Image - 40% larger */}
                <div className="relative rounded-2xl overflow-hidden w-[49%] max-w-lg">
                  <img
                    src="/homepic2.png"
                    alt="Generated Newsletter"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
