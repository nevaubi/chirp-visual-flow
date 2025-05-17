
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const CTASection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950"
    >
      <div className="container-custom">
        <div 
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ease-out transform ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to boost your Twitter growth?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of creators, marketers, and Twitter enthusiasts who use Chirpmetrics to analyze, grow, and engage their audience.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/signup" 
              className="btn-primary text-center text-lg py-3 px-8"
            >
              Get Started For Free
            </Link>
            <Link 
              to="/demo" 
              className="btn-secondary text-center text-lg py-3 px-8"
            >
              Schedule a Demo
            </Link>
          </div>
          
          <div className="mt-10 text-sm text-gray-500 dark:text-gray-400">
            No credit card required • Free 14-day trial • Cancel anytime
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
