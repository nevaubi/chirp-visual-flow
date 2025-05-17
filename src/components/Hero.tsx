
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ChevronDown } from "lucide-react";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Make hero visible after a tiny delay for the animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative bg-white dark:bg-gray-900 overflow-hidden pt-10 pb-24 md:pb-32">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16">
          {/* Left Column - Stacked Cards */}
          <div className="space-y-6">
            {/* Analytics Card */}
            <div className={`transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                {/* Analytics Header */}
                <div className="flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-twitter-blue h-5 w-5 mr-2">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  <h3 className="text-sm text-gray-600 dark:text-gray-400">Daily Audience</h3>
                </div>
                
                {/* Audience Number */}
                <div className="text-4xl font-bold mb-1">1,320,545</div>
                <div className="text-sm text-twitter-blue mb-6">+104K ↑</div>
                
                {/* Chart */}
                <div className="flex items-end h-24 mb-6 space-x-1">
                  {[20, 35, 28, 45, 30, 38, 75, 40, 50, 35, 60].map((height, i) => (
                    <div 
                      key={i} 
                      className={`w-full rounded-t-md ${i === 6 ? 'bg-twitter-blue' : 'bg-twitter-light dark:bg-twitter-blue/20'}`} 
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>
                
                {/* New Followers Section */}
                <div className="flex items-center border-t pt-4 dark:border-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 h-4 w-4 mr-2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">New Followers</span>
                  <div className="ml-auto bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 text-xs">+28</div>
                </div>
              </div>
            </div>

            {/* Twitter Bookmarks Digest Card - Now placed below the Analytics Card */}
            <div className={`transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-md overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="bg-chirp-orange/10 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-chirp-orange h-5 w-5">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Twitter Bookmarks Digest</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Auto-generated newsletters from your saves</p>
                  </div>
                  <div className="text-chirp-orange">
                    <Bookmark className="h-5 w-5" />
                  </div>
                </div>
                
                {/* Article Items */}
                <div className="p-4">
                  {[
                    "Top 10 Marketing Strategies for 2023",
                    "How AI is Transforming Content Creation",
                    "The Future of Social Media Engagement"
                  ].map((title, index) => (
                    <div key={index} className="flex py-2">
                      <div className="bg-chirp-orange/10 rounded-full p-1 mr-3 flex items-center justify-center">
                        <div className="text-chirp-orange text-xs">★</div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{title}</p>
                    </div>
                  ))}
                </div>
                
                {/* Delivery Schedule */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/10">
                  <div className="flex items-center text-xs text-chirp-orange">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Delivered every Monday
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Content */}
          <div className={`transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'} flex flex-col justify-center lg:order-last order-first`}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
              Need Twitter growth tools?
              <div className="mt-2 flex flex-wrap">
                <span className="text-twitter-blue">Automated </span>
                <span className="text-chirp-orange">newsletters </span>
                <span className="text-twitter-blue">from bookmarks</span>
                <span className="text-black dark:text-white">?</span>
              </div>
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-6">
              Choose one - <span className="text-chirp-orange">or both</span>.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup" className="btn-primary text-center px-6 py-3 rounded-full">
                Growth Analytics
              </Link>
              <Link to="/tools" className="btn-secondary text-center bg-chirp-orange hover:bg-chirp-orange/90 text-white border-none px-6 py-3 rounded-full">
                Twitter Newsletters
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider - Moved up to cover bottom ~10% of hero section */}
      <div className="hero-wave absolute bottom-0 left-0 w-full" style={{ bottom: "10%" }}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
