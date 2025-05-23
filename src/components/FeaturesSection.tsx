
import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Twitter, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8">
        <div className="flex justify-start items-center">
          {/* Silver background container for tweet cards */}
          <div className="bg-gray-100 rounded-2xl p-5 shadow-xl mt-4 md:mt-0 md:-translate-y-20 md:-translate-x-10 scale-95">
            {/* Tweet Cards Container - Single column stacked */}
            <div className="flex flex-col gap-5 max-w-[250px]">
              {/* Light Theme Card */}
              <div className="relative w-full rounded-xl bg-white/90 border-l-4 border-[#1da1f2] shadow-md p-4">
                {/* Bookmark Icon */}
                <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center bg-[#1da1f2] text-white shadow-md">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                
                {/* User Info */}
                <div className="flex items-center mb-2 mt-1">
                  <Avatar className="h-8 w-8 border-2 border-white/30 mr-2">
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-xs font-bold text-gray-800">Alex Chen</h3>
                      <span className="ml-1 text-[#1da1f2]">
                        <Check size={12} />
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">@alexchen_dev</p>
                  </div>
                </div>
                
                {/* Tweet Content */}
                <p className="text-xs leading-relaxed text-gray-800">
                  Just launched my new portfolio! Excited to share what I've been building 🚀
                </p>
              </div>

              {/* Dark Theme Card */}
              <div className="relative w-full rounded-xl bg-[rgba(30,39,50,0.95)] border-l-4 border-[#1da1f2] shadow-md p-4">
                {/* Bookmark Icon */}
                <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center bg-black text-white shadow-md">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                
                {/* User Info */}
                <div className="flex items-center mb-2 mt-1">
                  <Avatar className="h-8 w-8 border-2 border-white/30 mr-2">
                    <AvatarFallback className="bg-gray-700 text-white">
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-xs font-bold text-white">Sarah Mitchell</h3>
                      <span className="ml-1 text-[#1da1f2]">
                        <Check size={12} />
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">@sarahmitchell</p>
                  </div>
                </div>
                
                {/* Tweet Content */}
                <p className="text-xs leading-relaxed text-gray-200">
                  Found an amazing coffee spot downtown! Perfect for remote work ☕️
                </p>
              </div>
            </div>
          </div>

          {/* Custom Arrow SVG pointing to the right - updated to be higher vertically */}
          <div className="hidden md:flex items-center ml-8 -translate-y-10">
            <div className="w-32 h-32 bg-[#0087C8] rounded-full flex items-center justify-center border-4 border-white">
              <svg 
                width="85" 
                height="85" 
                viewBox="0 0 200 200" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M60 100H140M140 100L105 65M140 100L105 135" 
                  stroke="white" 
                  strokeWidth="22" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
