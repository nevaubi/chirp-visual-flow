
import { Button } from "@/components/ui/button";
import { Mail, Star, Bell, ChevronDown, Twitter } from "lucide-react";
import ChirpmetricsDashboard from "@/components/ChirpmetricsDashboard";

export default function HeroSection() {
  return (
    <section className="pt-28 pb-32 relative overflow-hidden bg-white">
      {/* Blue wavy border at the bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg width="100%" height="auto" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 30C240 90 480 120 720 30C960 -60 1200 60 1440 30V200H0V30Z" fill="#0087C8"/>
        </svg>
      </div>

      {/* Arrow graphic - repositioned much further to the left */}
      <div className="absolute top-[72px] right-[300px] z-10 hidden md:block">
        <img 
          src="/arrow1.png" 
          alt="Arrow graphic" 
          width="35" 
          height="35"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          {/* Left column with dashboard UI */}
          <div className="w-full lg:w-2/5 pt-[40px]">
            <div className="relative">
              {/* Replace Daily Audience card with ChirpmetricsDashboard */}
              <ChirpmetricsDashboard />
              
              {/* Floating followers card */}
              <div className="absolute -bottom-12 left-4">
                <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
                  <div className="flex items-center mb-1">
                    <Bell size={14} className="text-[#0087C8] mr-1" />
                    <span className="text-xs font-medium text-gray-600">New Followers</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-2">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">A</div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">B</div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8F4FB] flex items-center justify-center text-[10px] text-[#0087C8] font-bold">C</div>
                    </div>
                    <span className="text-xs font-semibold text-[#0087C8]">+28</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reviews image placed directly below the dashboard card */}
            <div className="mt-16 flex justify-center">
              <img 
                src="/reviews1.png" 
                alt="Reviews from creators" 
                className="max-w-full"
              />
            </div>
          </div>
          
          {/* Right column with main message and bookmark card */}
          <div className="w-full lg:w-3/5 pt-[48px] lg:pt-[44px]">
            {/* Main marketing message */}
            <div className="mb-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2e47] leading-tight mb-4">
                Need Twitter growth tools?
              </h2>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
                <span className="text-[#0087C8]">Automated </span>
                <span className="text-[#FF6B35]">newsletters</span>
                <span className="text-[#0087C8]"> from bookmarks</span>
                <span className="text-[#0f2e47]">?</span>
              </h2>
              
              {/* "Choose one or both" text as separate element */}
              <p className="text-xl text-[#0f2e47] mb-4">
                Choose one - <span className="text-[#FF6B35]">or both</span>.
              </p>
              
              {/* Buttons stacked below the text */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white rounded-xl px-5 py-2 font-medium">
                  Growth Analytics
                </Button>
                <Button className="bg-[#FF6B35] hover:bg-[#e05a2c] text-white rounded-xl px-5 py-2 font-medium">
                  Twitter Newsletters
                </Button>
              </div>
            </div>
            
            {/* Twitter Bookmarks Digest card */}
            <div className="bg-white rounded-3xl shadow-md p-5 border border-gray-200 relative">
              {/* Card header */}
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-[#FFEEE8] flex items-center justify-center mr-3">
                  <Twitter className="h-5 w-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f2e47]">Twitter Bookmarks Digest</h3>
                  <p className="text-sm text-gray-500">Auto-generated newsletters from your saves</p>
                </div>
              </div>
              
              {/* Bookmark icon */}
              <div className="absolute top-5 right-5">
                <div className="h-10 w-10 rounded-full bg-[#FFEEE8] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" fill="#FF6B35" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              {/* Bookmark items */}
              <div className="space-y-3 mb-4">
                {[
                  "Top 10 Marketing Strategies for 2023",
                  "How AI is Transforming Content Creation",
                  "The Future of Social Media Engagement"
                ].map((item, i) => (
                  <div key={i} className="flex items-center p-2 rounded-lg hover:bg-[#FFEEE8] group">
                    <div className="h-6 w-6 rounded-full bg-[#FFEEE8] flex items-center justify-center mr-2">
                      <Star className="h-3 w-3 text-[#FF6B35]" />
                    </div>
                    <span className="text-sm text-[#0f2e47]">{item}</span>
                  </div>
                ))}
              </div>
              
              {/* Card footer */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#FFEEE8] rounded-xl">
                <div className="flex items-center text-[#FF6B35]">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Delivered every Monday</span>
                </div>
                <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-[#FF6B35] hover:bg-[#FFEEE8]/80 focus:ring-0">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
