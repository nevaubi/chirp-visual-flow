// components/HeroSection.tsx
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Bookmark } from "lucide-react";
import ReviewsSection from "@/components/ReviewsSection";

export default function HeroSection() {
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
      {/* ----------------------- SCROLLING BACKGROUND ---------------------- */}
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

        {/* -- FLOATING BOOKMARK ICONS ------------------------------------- */}
        <div className="absolute top-24 left-1/5 z-20">
          <Bookmark
            className="w-4 h-4 text-[#0087C8] opacity-20 animate-pulse-subtle"
            fill="currentColor"
          />
        </div>
        <div className="absolute top-36 right-1/4 z-20">
          <Bookmark
            className="w-3 h-3 text-[#0087C8] opacity-15 animate-pulse-subtle"
            fill="currentColor"
            style={{ animationDelay: "1s" }}
          />
        </div>
        <div className="absolute bottom-40 left-1/3 z-20">
          <Bookmark
            className="w-5 h-5 text-[#0087C8] opacity-10 animate-pulse-subtle"
            fill="currentColor"
            style={{ animationDelay: "2s" }}
          />
        </div>
      </div>

      {/* ---------------------------- HERO CONTENT ------------------------- */}
      <div className="container mx-auto px-4 sm:px-6 relative z-30 pt-20">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center max-w-5xl mx-auto">
          {/* Headline ------------------------------------------------------ */}
          <div className="mb-8 relative z-20">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight text-gray-900">
              <span className="block">Turn X Bookmarks into</span>
              <span className="block bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">
                Professional Newsletters
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Never waste a good bookmark again.
              <span className="block mt-2 font-semibold text-[#0087C8]">
                Automatically curate and send beautiful newsletters to your
                audience.
              </span>
            </p>
          </div>

          {/* Social proof -------------------------------------------------- */}
          <div className="flex justify-center mb-10 relative z-20">
            <ReviewsSection />
          </div>

          {/* CTA buttons --------------------------------------------------- */}
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
