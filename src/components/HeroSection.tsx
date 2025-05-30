
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReviewsSection from "@/components/ReviewsSection";

export default function HeroSection() {
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      const navbarHeight = 80;
      const elementPosition = pricingSection.offsetTop;
      const offsetPosition = elementPosition - navbarHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-white">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #0087C8 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Floating UI Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        
        {/* Floating Bookmark Icons */}
        <div className="absolute top-16 left-8 animate-pulse-subtle">
          <Bookmark className="w-8 h-8 text-[#0087C8] opacity-70 fill-current" style={{ animationDelay: '0s' }} />
        </div>
        <div className="absolute top-32 right-12 animate-pulse-subtle">
          <Bookmark className="w-6 h-6 text-purple-500 opacity-60 fill-current" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-24 left-1/3 animate-pulse-subtle">
          <Bookmark className="w-10 h-10 text-green-500 opacity-50 fill-current" style={{ animationDelay: '3s' }} />
        </div>
        <div className="absolute bottom-1/3 right-16 animate-pulse-subtle">
          <Bookmark className="w-7 h-7 text-orange-500 opacity-65 fill-current" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute top-1/2 left-12 animate-pulse-subtle">
          <Bookmark className="w-5 h-5 text-pink-500 opacity-70 fill-current" style={{ animationDelay: '4s' }} />
        </div>

        {/* Enhanced Newsletter mockup - left side */}
        <div className="absolute top-20 left-4 transform -rotate-3 hover:rotate-0 transition-transform duration-700">
          <Card className="w-96 h-[600px] shadow-2xl border-2 border-gray-200 bg-white relative overflow-hidden">
            <CardContent className="p-0 h-full">
              {/* Newsletter Header */}
              <div className="h-20 bg-gradient-to-r from-[#0087C8] to-blue-600 flex items-center px-6">
                <div className="w-10 h-10 bg-white rounded-full mr-4 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#0087C8]" />
                </div>
                <div>
                  <div className="text-white font-bold text-xl">Tech Weekly Digest</div>
                  <div className="text-blue-100 text-sm">Issue #247 • May 30, 2025</div>
                </div>
              </div>
              
              {/* Newsletter Content */}
              <div className="p-6 space-y-6">
                {/* Featured Article */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">🚀 This Week's Top Story</h3>
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                    <h4 className="font-semibold text-gray-900 mb-2">Breaking: New AI Model Surpasses GPT-4 in Reasoning Tasks</h4>
                    <p className="text-gray-600 text-sm mb-2">Researchers at Stanford unveil breakthrough architecture that demonstrates superior performance...</p>
                    <div className="text-xs text-blue-600 font-medium">Read more →</div>
                  </div>
                </div>
                
                {/* Tweet Section */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">💬 Trending Discussions</h3>
                  <div className="border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mr-3"></div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">@elonmusk</div>
                        <div className="text-xs text-gray-500">2h ago</div>
                      </div>
                    </div>
                    <p className="text-gray-800 text-sm mb-2">"The future of AI development will be determined by those who can balance innovation with responsibility."</p>
                    <div className="flex space-x-4 text-xs text-gray-500">
                      <span>❤️ 12.5K</span>
                      <span>🔄 3.2K</span>
                      <span>💬 892</span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mr-3"></div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">@paulg</div>
                        <div className="text-xs text-gray-500">4h ago</div>
                      </div>
                    </div>
                    <p className="text-gray-800 text-sm mb-2">"The best startups are built by founders who deeply understand their users' problems."</p>
                    <div className="flex space-x-4 text-xs text-gray-500">
                      <span>❤️ 8.7K</span>
                      <span>🔄 2.1K</span>
                      <span>💬 445</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Links */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">📚 Must-Read Articles</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-[#0087C8] rounded-full mr-3"></div>
                      <span className="text-gray-800">5 Marketing Strategies That Actually Work in 2025</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-800">Why Remote Work Is Here to Stay</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-800">The Rise of Sustainable Technology</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Email client preview - right side */}
        <div className="absolute top-40 right-8 transform rotate-2 hover:rotate-0 transition-transform duration-700">
          <Card className="w-[420px] h-[520px] shadow-xl border border-gray-300 bg-white relative overflow-hidden">
            <CardContent className="p-0 h-full">
              {/* Email Client Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#0087C8] to-blue-600 rounded-full mr-3 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Tech Weekly Digest</div>
                      <div className="text-xs text-gray-500">hello@techweekly.com</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Just now</div>
                </div>
                <div className="font-semibold text-gray-900 mb-1">🚀 Your Weekly Tech Roundup is Ready!</div>
                <div className="text-sm text-gray-600">5 trending articles • 12 social insights • 3 must-read threads</div>
              </div>
              
              {/* Email Body Preview */}
              <div className="p-4 space-y-4">
                <div className="text-sm text-gray-700">
                  <p className="mb-3">Hi there! 👋</p>
                  <p className="mb-4">Your personalized newsletter is ready with this week's most engaging content from your bookmarks.</p>
                </div>
                
                {/* Content Preview Sections */}
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                  <div className="font-semibold text-blue-900 mb-2">🔥 Trending This Week</div>
                  <div className="text-sm text-gray-700 mb-2">AI development, startup funding, and remote work strategies dominated your feed.</div>
                  <div className="text-xs text-blue-600 font-medium">View full analysis →</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                  <div className="font-semibold text-green-900 mb-2">💡 Top Insights</div>
                  <div className="text-sm text-gray-700 mb-2">3 breakthrough articles that align with your interests in technology and business.</div>
                  <div className="text-xs text-green-600 font-medium">Read insights →</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                  <div className="font-semibold text-purple-900 mb-2">🗣️ Social Highlights</div>
                  <div className="text-sm text-gray-700 mb-2">Key discussions from industry leaders you follow on social media.</div>
                  <div className="text-xs text-purple-600 font-medium">See highlights →</div>
                </div>
                
                {/* CTA Section */}
                <div className="mt-6 text-center">
                  <div className="bg-[#0087C8] text-white py-3 px-6 rounded-lg text-sm font-semibold mb-3">
                    📖 Read Your Full Newsletter
                  </div>
                  <div className="text-xs text-gray-500">
                    Curated from 47 bookmarks • Generated in under 30 seconds
                  </div>
                </div>
              </div>
              
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"></div>
            </CardContent>
          </Card>
        </div>

        {/* Floating badges with bookmark theme */}
        <div className="absolute top-1/3 left-1/4 animate-pulse-subtle">
          <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm font-medium flex items-center">
            <Bookmark className="w-3 h-3 mr-1 fill-current" />
            Auto-curated
          </Badge>
        </div>

        <div className="absolute top-1/2 right-1/4 animate-pulse-subtle" style={{ animationDelay: '2s' }}>
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-4 py-2 text-sm font-medium flex items-center">
            <Bookmark className="w-3 h-3 mr-1 fill-current" />
            Smart filtering
          </Badge>
        </div>

        <div className="absolute bottom-1/3 left-1/3 animate-pulse-subtle" style={{ animationDelay: '4s' }}>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium flex items-center">
            <Bookmark className="w-3 h-3 mr-1 fill-current" />
            One-click setup
          </Badge>
        </div>
      </div>

      {/* Blue wavy border at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg width="100%" height="120" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 20C120 60 240 80 360 70C480 60 600 35 720 25C840 15 960 35 1080 45C1200 55 1320 50 1440 35V120H0V20Z" fill="#0087C8" />
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-32">
        <div className="flex flex-col items-center text-center min-h-[calc(100vh-200px)] justify-center">
          
          {/* Main headline */}
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

          {/* Reviews section */}
          <div className="flex justify-center mb-10">
            <ReviewsSection />
          </div>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={scrollToPricing}
              size="lg" 
              className="bg-[#0087C8] hover:bg-[#0076b2] text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Mail className="w-5 h-5 mr-2" />
              Start Creating Newsletters
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-[#0087C8] text-[#0087C8] hover:bg-[#0087C8] hover:text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              See Live Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
