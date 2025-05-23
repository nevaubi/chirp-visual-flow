
import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Twitter, User } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8">
        <div className="flex justify-start">
          {/* White background container for tweet cards */}
          <div className="bg-white rounded-2xl p-6 shadow-xl mt-4 md:mt-0 md:-translate-y-6 md:-translate-x-4">
            {/* Tweet Cards Container - Single column stacked */}
            <div className="flex flex-col gap-6 max-w-[300px]">
              {/* Light Theme Card */}
              <div className="relative w-full rounded-xl bg-white/90 border-l-4 border-[#1da1f2] shadow-md p-5">
                {/* Bookmark Icon */}
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center bg-[#1da1f2] text-white shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                
                {/* User Info */}
                <div className="flex items-center mb-3 mt-2">
                  <Avatar className="h-10 w-10 border-2 border-white/30 mr-3">
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-sm font-bold text-gray-800">Alex Chen</h3>
                      <span className="ml-1 text-[#1da1f2]">
                        <Check size={14} />
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">@alexchen_dev</p>
                  </div>
                </div>
                
                {/* Tweet Content */}
                <p className="text-sm leading-relaxed text-gray-800">
                  Just launched my new portfolio! Excited to share what I've been building 🚀
                </p>
              </div>

              {/* Dark Theme Card */}
              <div className="relative w-full rounded-xl bg-[rgba(30,39,50,0.95)] border-l-4 border-[#1da1f2] shadow-md p-5">
                {/* Bookmark Icon */}
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center bg-black text-white shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                
                {/* User Info */}
                <div className="flex items-center mb-3 mt-2">
                  <Avatar className="h-10 w-10 border-2 border-white/30 mr-3">
                    <AvatarFallback className="bg-gray-700 text-white">
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-sm font-bold text-white">Sarah Mitchell</h3>
                      <span className="ml-1 text-[#1da1f2]">
                        <Check size={14} />
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">@sarahmitchell</p>
                  </div>
                </div>
                
                {/* Tweet Content */}
                <p className="text-sm leading-relaxed text-gray-200">
                  Found an amazing coffee spot downtown! Perfect for remote work ☕️
                </p>
              </div>
            </div>
          </div>

          {/* Right side content could go here if needed */}
        </div>
      </div>
    </section>
  );
}
