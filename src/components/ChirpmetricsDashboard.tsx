
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// The Dashboard UI component from the Hero section
const ChirpmetricsDashboard = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden shadow-2xl">
        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <div className="text-center p-8">
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">Dashboard Preview</h3>
            <p className="text-gray-500">Beautiful newsletter dashboard coming soon</p>
          </div>
        </div>
      </AspectRatio>
    </div>
  );
};

export default ChirpmetricsDashboard;
