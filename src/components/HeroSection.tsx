
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const scrollToNextSection = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-28 pb-24 sm:pt-36 sm:pb-32 bg-gradient-to-br from-white to-blue-50/30">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-twitter-blue to-twitter-dark">
            Twitter Growth Analytics Made Simple
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-8">
            Track your Twitter growth, analyze engagement, and create beautiful 
            newsletters automatically. All in one powerful platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/twitter-growth">
              <Button size="lg" className="bg-twitter-blue hover:bg-twitter-dark text-white font-medium rounded-full px-6">
                Growth Analytics
              </Button>
            </Link>
            <Link to="/auto-newsletters">
              <Button variant="outline" size="lg" className="border-twitter-blue text-twitter-blue hover:bg-blue-50 font-medium rounded-full px-6">
                Twitter Newsletters
              </Button>
            </Link>
          </div>
        </div>

        {/* Twitter Bookmarks Digest Card */}
        <div className="mt-16 max-w-md mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 animate-fade-in-slow">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                  alt="Chirpmetrics" 
                  className="w-8 h-8 mr-2"
                />
                <div>
                  <p className="font-semibold text-sm">Twitter Bookmarks Digest</p>
                  <p className="text-xs text-gray-500">Weekly newsletter</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">June 26</div>
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-lg mb-2">Your Weekly Twitter Bookmarks</h3>
            <p className="text-sm text-gray-600 mb-4">
              The best content you've saved this week, curated and organized for easy reading.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-sm font-medium text-gray-800">🔥 Growth Strategies That Work</p>
              <p className="text-xs text-gray-500">5 bookmarks · 12 min read</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-800">💡 Product Innovation Ideas</p>
              <p className="text-xs text-gray-500">3 bookmarks · 8 min read</p>
            </div>
          </div>
        </div>

        {/* Call to scroll - only visible on non-mobile screens */}
        <div className="hidden sm:flex flex-col items-center mt-16">
          <p className="text-sm text-gray-500 mb-2">Learn more</p>
          <button
            onClick={scrollToNextSection}
            className="text-gray-400 hover:text-twitter-blue transition-colors"
            aria-label="Scroll to features"
          >
            <ArrowDown className="h-6 w-6 animate-bounce" />
          </button>
        </div>
      </div>

      {/* Blue wavy border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgMTI4MCAxNDAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI2YwZjlmZiI+PHBhdGggZD0iTTAgNTEuNzZjMzYuMjEtMi4yNSA3Ny41Ny0zLjU4IDEyNi40Mi0zLjU4IDMyMCAwIDMyMCA1NyA2NDAgNTcgMjcxLjE1IDAgMzEyLjU4LTQwLjkxIDUxMy41OC01My40VjBIMFoiIGZpbGwtb3BhY2l0eT0iLjMiLz48cGF0aCBkPSJNMCA5MGMzMi43MSAyLjI1IDcxLjYyIDMuOTkgMTEyLjYgMy45OSAzMjAgMCAzMjAgODUuNTQgNjQwIDg1LjU0IDEyOC4xMyAwIDEyOC4wMi00LjEgMjU2LjEtNCAxMzAuNjcgMCAxMzEuOTkgNC4xIDI3MS4zIDQuMUw2NCA0Yi4yNSAzMiAxLjYgMCAwdjkwWiIgZmlsbC1vcGFjaXR5PSIuNSIvPjxwYXRoIGQ9Ik0wIDB2NDYuMjkgMjcuOWMzNS45LS45NyA3Mi41MS0xLjkyIDExMi42LTEuOTIgMzIwIDAgMzIwIDU3IDY0MCA1NyAyNTYuMSAwIDMwNy4yOC01Ny42NiA1MTMuNTgtNTMuNFYwWiIvPjwvZz48L3N2Zz4=')]"></div>
    </section>
  );
};

export default HeroSection;
