
import { useEffect, useRef, useState } from "react";

interface FeatureProps {
  title: string;
  description: string;
  icon: JSX.Element;
  delay: number;
}

const Feature = ({ title, description, icon, delay }: FeatureProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const featureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Add a delay based on the feature's index
        setTimeout(() => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        }, delay);
      },
      { threshold: 0.1 }
    );

    if (featureRef.current) {
      observer.observe(featureRef.current);
    }

    return () => {
      if (featureRef.current) {
        observer.unobserve(featureRef.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={featureRef}
      className={`feature-item p-6 rounded-xl border border-gray-100 dark:border-gray-800 transition-all duration-500 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="feature-icon mb-5 text-twitter-blue w-14 h-14 flex items-center justify-center rounded-full bg-twitter-light dark:bg-twitter-blue/10 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
};

const Features = () => {
  return (
    <section className="py-20 bg-twitter-blue">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Features You'll Love
          </h2>
          <p className="text-blue-100 md:text-lg max-w-3xl mx-auto">
            Powerful tools to enhance your Twitter experience and grow your audience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Feature
            title="Easy Twitter Analysis"
            description="Get detailed insights about your Twitter audience, engagement, and growth metrics with beautiful visualizations."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            }
            delay={100}
          />
          <Feature
            title="Automated Bookmark Management"
            description="Create newsletters from your Twitter bookmarks automatically, perfect for content curation and sharing."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            }
            delay={200}
          />
          <Feature
            title="Custom Tweet Recommendations"
            description="Get personalized content recommendations based on your interests and audience engagement patterns."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            }
            delay={300}
          />
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="flex items-center mb-4">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-8 w-8 mr-3" 
              />
              <h3 className="text-xl font-semibold">Twitter Bookmarks Digest</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Auto-generated newsletters from your saves</p>
            
            <div className="space-y-4 text-left">
              <div className="flex items-start">
                <span className="text-chirp-orange mr-2">★</span>
                <p className="text-gray-800 dark:text-gray-200">Top 10 Marketing Strategies for 2023</p>
              </div>
              <div className="flex items-start">
                <span className="text-chirp-orange mr-2">★</span>
                <p className="text-gray-800 dark:text-gray-200">How AI is Transforming Content Creation</p>
              </div>
              <div className="flex items-start">
                <span className="text-chirp-orange mr-2">★</span>
                <p className="text-gray-800 dark:text-gray-200">The Future of Social Media Engagement</p>
              </div>
            </div>
            
            <div className="mt-6 py-2 px-4 bg-chirp-orange/10 text-chirp-orange rounded-lg text-sm">
              Delivered every Monday
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
