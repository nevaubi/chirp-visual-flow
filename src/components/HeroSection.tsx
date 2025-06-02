
// components/HeroSection.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReviewsSection from "@/components/ReviewsSection";

function AutoScrollCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Newsletter card data - simplified without colors
  const cards = [
    { id: 1, title: "AI Newsletter", subtitle: "Weekly AI insights" },
    { id: 2, title: "Crypto Weekly", subtitle: "Market updates" },
    { id: 3, title: "Tech Trends", subtitle: "Latest in tech" },
    { id: 4, title: "Finance Focus", subtitle: "Money matters" },
    { id: 5, title: "Design Daily", subtitle: "Creative insights" },
    { id: 6, title: "Startup Stories", subtitle: "Entrepreneurship" },
    { id: 7, title: "Health Hub", subtitle: "Wellness tips" },
    { id: 8, title: "Travel Tales", subtitle: "Adventure stories" },
  ];

  // Check for mobile device and reduced motion preference
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection Observer to only animate when visible
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(carousel);
    return () => observer.unobserve(carousel);
  }, []);

  // Optimized animation with requestAnimationFrame
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !isVisible || isPaused) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let scrollAmount = carousel.scrollLeft;
    let scrollDirection = 1;
    // Improved speed and smoothness - faster on mobile
    const scrollSpeed = isMobile ? 1.2 : 0.5;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      // Smoother animation timing - consistent 60fps
      const frameDelay = 16; // Always 60fps for smoothness
      
      if (currentTime - lastTime >= frameDelay) {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        
        // Change direction at boundaries
        if (scrollAmount >= maxScroll) {
          scrollDirection = -1;
        } else if (scrollAmount <= 0) {
          scrollDirection = 1;
        }
        
        scrollAmount += scrollSpeed * scrollDirection;
        carousel.scrollLeft = scrollAmount;
        
        lastTime = currentTime;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Sync scrollAmount with manual scroll
    const handleScroll = () => {
      scrollAmount = carousel.scrollLeft;
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      carousel.removeEventListener('scroll', handleScroll);
    };
  }, [isVisible, isPaused, isMobile]);
  
  return (
    <div className="w-full relative">
      {/* Optimized fade gradients */}
      <div className="absolute left-0 top-0 h-full w-16 z-10 pointer-events-none bg-gradient-to-r from-gray-50 to-transparent"></div>
      
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 pt-2 px-1 carousel-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {cards.map((card) => (
          <div 
            key={card.id}
            className="flex-shrink-0 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gray-100 p-4 flex flex-col justify-between w-28 h-40 sm:w-40 sm:h-56 lg:w-48 lg:h-72 card-optimized"
          >
            <div>
              <h3 className="font-bold text-xs sm:text-sm lg:text-base text-gray-700">{card.title}</h3>
              <p className="text-xs sm:text-xs lg:text-sm text-gray-600 opacity-80">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Right fade */}
      <div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none bg-gradient-to-l from-gray-50 to-transparent"></div>
    </div>
  );
}

export default function HeroSection() {
  /* -------------------------------------------------- */
  /* helper: scroll to top on component mount           */
  /* -------------------------------------------------- */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing-section");
    if (!pricingSection) return;

    const navbarHeight = 80;
    const offset = pricingSection.offsetTop - navbarHeight;

    window.scrollTo({ top: offset, behavior: "smooth" });
  };

  /* -------------------------------------------------- */
  /* render                                             */
  /* -------------------------------------------------- */
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50/30 to-white">
      {/* ---------------------------- HERO CONTENT ------------------------- */}
      <div className="container mx-auto px-4 sm:px-6 relative z-30 pt-24 sm:pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-200px)] justify-center max-w-6xl mx-auto">
          
          {/* Mobile Layout: Text → Images → Social proof + CTA */}
          <div className="lg:hidden w-full">
            {/* Headline */}
            <div className="mb-6 sm:mb-8 relative z-20 w-full">
              <h1 
                className="sm:text-5xl leading-tight mb-6 tracking-tight text-gray-900" 
                style={{ 
                  fontSize: '40px',
                  fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontWeight: '900'
                }}
              >
                Turn <span className="text-[#0087C8]">X Bookmarks</span> into Professional <span className="text-[#FF6B35]">Newsletters</span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto">
                <span className="text-[#FF6B35]">Never</span> waste a good bookmark again.
                <span className="block mt-2 font-semibold text-[#0087C8]">
                  <span className="text-[#FF6B35]">Automatically</span> curate and send beautiful newsletters to your
                  audience.
                </span>
              </p>
            </div>

            {/* Horizontal Carousel */}
            <div className="mb-8 sm:mb-10 relative z-20">
              <AutoScrollCarousel />
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
                  <span className="block">Turn <span className="bg-gradient-to-r from-[#0087C8] to-[#006CA1] bg-clip-text text-transparent">X Bookmarks</span></span>
                  <span className="block">into Professional</span>
                  <span className="block text-[#FF6B35]">
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

              {/* Right Column: Social proof + Bullet points + CTA */}
              <div className="flex flex-col items-start space-y-8">
                {/* Social proof */}
                <div className="relative z-20">
                  <ReviewsSection />
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

                {/* CTA button - moved below bullet list */}
                <div className="relative z-20 w-full">
                  <Button
                    size="lg"
                    className="bg-[#0087C8] hover:bg-[#006CA1] text-white px-10 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    onClick={scrollToPricing}
                  >
                    Get Started Free
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                  <p className="text-sm text-gray-500 italic mt-2">No credit card required</p>
                </div>
              </div>
            </div>

            {/* Horizontal Carousel */}
            <div className="mb-8 sm:mb-10 relative z-20">
              <AutoScrollCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
