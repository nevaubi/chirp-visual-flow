
import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Twitter } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8">
        <div className="flex justify-start">
          {/* Tweet Cards Container - Single column stacked */}
          <div className="flex flex-col gap-8 max-w-[320px]">
            {/* Light Theme Card */}
            <div className="relative w-full rounded-2xl bg-white/90 border-l-4 border-[#1da1f2] shadow-lg p-6">
              {/* Bookmark Icon */}
              <div className="absolute -top-5 -left-5 w-14 h-14 rounded-full flex items-center justify-center bg-[#1da1f2] text-white shadow-md">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              
              {/* User Info */}
              <div className="flex items-center mb-4 mt-2">
                <Avatar className="h-12 w-12 border-2 border-white/30 mr-3">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="Alex Chen" />
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-base font-bold text-gray-800">Alex Chen</h3>
                    <span className="ml-1 text-[#1da1f2]">
                      <Check size={16} />
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">@alexchen_dev</p>
                </div>
              </div>
              
              {/* Tweet Content */}
              <p className="text-[15px] leading-relaxed text-gray-800">
                Just launched my new portfolio! Excited to share what I've been building 🚀
              </p>
            </div>

            {/* Dark Theme Card */}
            <div className="relative w-full rounded-2xl bg-[rgba(30,39,50,0.95)] border-l-4 border-[#1da1f2] shadow-lg p-6">
              {/* Bookmark Icon */}
              <div className="absolute -top-5 -left-5 w-14 h-14 rounded-full flex items-center justify-center bg-black text-white shadow-md">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              
              {/* User Info */}
              <div className="flex items-center mb-4 mt-2">
                <Avatar className="h-12 w-12 border-2 border-white/30 mr-3">
                  <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face" alt="Sarah Mitchell" />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-base font-bold text-white">Sarah Mitchell</h3>
                    <span className="ml-1 text-[#1da1f2]">
                      <Check size={16} />
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">@sarahmitchell</p>
                </div>
              </div>
              
              {/* Tweet Content */}
              <p className="text-[15px] leading-relaxed text-gray-200">
                Found an amazing coffee spot downtown! Perfect for remote work ☕️
              </p>
            </div>
          </div>

          {/* Right side content could go here if needed */}
        </div>
      </div>
    </section>
  );
}
