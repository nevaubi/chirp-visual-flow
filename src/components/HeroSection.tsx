

// components/HeroSection.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import ReviewsSection from "@/components/ReviewsSection";
import VideoPlayer from "@/components/VideoPlayer";

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
      <div className="container mx-auto px-4 sm:px-6 relative z-30 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center max-w-6xl mx-auto">
          {/* Headline ------------------------------------------------------ */}
          <div className="mb-8 relative z-20 w-full">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
              <span className="block">Turn <span className="text-[#FF6B35]">X Bookmarks</span> into</span>
              <span className="block bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">
                Professional Newsletters
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              <span className="text-[#FF6B35]">Never</span> waste a good bookmark again.
              <span className="block mt-2 font-semibold text-[#0087C8]">
                <span className="text-[#FF6B35]">Automatically</span> curate and send beautiful newsletters to your
                audience.
              </span>
            </p>
          </div>

          {/* Two-column layout for desktop ------------------------------- */}
          <div className="w-full lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left Column: Social proof + CTA button */}
            <div className="flex flex-col items-center lg:items-start space-y-10 lg:pl-12 xl:pl-20">
              {/* Social proof -------------------------------------------------- */}
              <div className="flex justify-center lg:justify-start relative z-20">
                <ReviewsSection />
              </div>

              {/* CTA button --------------------------------------------------- */}
              <div className="flex justify-center lg:justify-start relative z-20 w-full">
                <Button
                  size="lg"
                  className="bg-[#0087C8] hover:bg-[#006CA1] text-white px-10 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 w-full sm:w-auto lg:w-full max-w-sm"
                  onClick={scrollToPricing}
                >
                  Get Started Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Right Column: Custom Video Player */}
            <div className="mt-12 lg:mt-0 relative z-20">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50">
                <VideoPlayer
                  src="/final.mp4"
                  autoPlay={true}
                  loop={true}
                  muted={true}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

