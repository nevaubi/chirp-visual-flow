import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// The Dashboard UI component from the Hero section
const ChirpmetricsDashboard = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  return <div className="relative rounded-xl border bg-background shadow-lg overflow-hidden">
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
        
      </div>
    </div>;
};
export default ChirpmetricsDashboard;