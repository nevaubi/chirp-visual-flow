
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// The Dashboard UI component from the Hero section
const ChirpmetricsDashboard = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  return (
    <div className="relative rounded-xl border bg-background shadow-lg overflow-hidden">
      {/* Browser-like top bar with colored dots */}
      <div className="px-3 py-2 border-b bg-muted/50 text-xs flex items-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="ml-4 font-mono">Chirpmetrics Dashboard</div>
      </div>
      
      {/* Main content area with video */}
      <div className="aspect-video bg-gradient-to-br from-brand-blue/20 to-brand-blue/5">
        <AspectRatio ratio={16/9} className="rounded-b-xl overflow-hidden">
          <div className={`relative w-full h-full ${videoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
            <video 
              className="w-full h-full object-cover"
              autoPlay={true}
              muted={true}
              loop={true}
              playsInline={true}
              preload="auto"
              poster="https://placehold.co/800x450/1A1F2C/0EA5E9?text=Chirpmetrics+Dashboard&font=montserrat"
              onLoadedData={() => setVideoLoaded(true)}
              aria-label="Chirpmetrics dashboard demo video"
            >
              <source src="/homepagevid.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-blue/20 to-brand-blue/5">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </AspectRatio>
      </div>
    </div>
  );
};

export default ChirpmetricsDashboard;
