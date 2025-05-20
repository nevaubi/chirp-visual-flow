
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProfileHeatmapProps {
  data: Record<string, number>;
}

const ProfileHeatmap = ({ data }: ProfileHeatmapProps) => {
  const [maxCount, setMaxCount] = useState(0);
  
  useEffect(() => {
    // Find the maximum value for scaling
    if (Object.keys(data).length > 0) {
      const max = Math.max(...Object.values(data));
      setMaxCount(max > 0 ? max : 1); // Avoid division by zero
    }
  }, [data]);
  
  // Generate color based on value intensity
  const getColor = (count: number) => {
    const intensity = Math.min(count / maxCount, 1); // 0 to 1
    
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 0.2) return 'bg-blue-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-300';
    if (intensity < 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };
  
  const formatHour = (hour: string) => {
    const hourNum = parseInt(hour);
    if (hourNum === 0) return '12am';
    if (hourNum === 12) return '12pm';
    return hourNum < 12 ? `${hourNum}am` : `${hourNum - 12}pm`;
  };
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex items-end mb-1">
          <div className="w-16"></div>
          <div className="flex-1 flex justify-between px-1">
            {Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b)).map((hour) => (
              <div key={hour} className="text-xs text-gray-500 w-8 text-center">
                {parseInt(hour) % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-16 pr-2 text-right">
            <span className="text-xs text-gray-500">Activity</span>
          </div>
          <div className="flex-1 flex items-center justify-between h-16 rounded-lg bg-gray-50 p-2">
            {Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b)).map((hour) => {
              const count = data[hour] || 0;
              return (
                <div key={hour} className="relative flex flex-col items-center justify-end h-full w-8">
                  <div 
                    className={cn(
                      "w-6 transition-all duration-200 rounded",
                      getColor(count)
                    )}
                    style={{
                      height: `${Math.max(count / maxCount * 100, 4)}%`,
                    }}
                  />
                  {count > 0 && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-5 opacity-0 hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none z-10">
                      {count} post{count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-end mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Less</span>
            <div className="flex">
              <div className="w-4 h-4 bg-blue-100"></div>
              <div className="w-4 h-4 bg-blue-200"></div>
              <div className="w-4 h-4 bg-blue-300"></div>
              <div className="w-4 h-4 bg-blue-400"></div>
              <div className="w-4 h-4 bg-blue-500"></div>
            </div>
            <span className="text-xs text-gray-500">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeatmap;
