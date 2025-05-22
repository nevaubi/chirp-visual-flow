
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface CircadianHeatmapProps {
  data: number[][]; // 2D array [day][hour]
  timezone?: string | null;
}

const CircadianHeatmap = ({ data, timezone }: CircadianHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<{day: number, hour: number, value: number} | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);
  
  // Find maximum value in the heatmap data for proper color scaling
  React.useEffect(() => {
    if (data && data.length > 0) {
      const allValues = data.flat();
      const max = allValues.length > 0 ? Math.max(...allValues) : 8;
      setMaxValue(max > 0 ? max : 8); // Default max if no data
    }
  }, [data]);
  
  // If no data provided, create an empty 7x24 grid (days x hours)
  const heatmapData = data && data.length > 0 ? data : Array(7).fill(Array(24).fill(0));
  
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate simplified hour labels (every 2 hours)
  const hourLabels = [];
  for (let i = 0; i < 24; i += 2) {
    const formattedHour = i === 0 ? '12am' : i === 12 ? '12pm' : i < 12 ? `${i}am` : `${i-12}pm`;
    hourLabels.push(formattedHour);
  }
  
  // Color intensity function - enhanced blue gradient with darker shades
  const getColor = (value: number, max: number) => {
    if (value === 0) return '#fafafa'; // Even lighter gray for zero values for better contrast
    
    // Calculate intensity (0-1)
    const intensity = value / max;
    
    // Enhanced blue gradient with darker shades for better visual distinction
    if (intensity < 0.2) return '#b6d0f7'; // Darker light blue (two shades darker)
    if (intensity < 0.4) return '#7aa9f0'; // Darker medium light blue (two shades darker)
    if (intensity < 0.6) return '#3d84e6'; // Darker medium blue (two shades darker)
    if (intensity < 0.8) return '#1668d9'; // Darker medium-dark blue (two shades darker)
    return '#0043a0';                      // Darker blue for highest values (two shades darker)
  };
  
  // Get border color for cell based on value - darker borders for higher values
  const getBorderColor = (value: number, max: number) => {
    if (value === 0) return 'border-gray-100';
    
    const intensity = value / max;
    if (intensity < 0.3) return 'border-blue-200';
    if (intensity < 0.6) return 'border-blue-300';
    return 'border-blue-400';
  };
  
  // Format timezone for display
  const formatTimezone = (tz: string | null | undefined) => {
    if (!tz) return 'UTC';
    
    // Extract city or region from timezone format
    try {
      const parts = tz.split('/');
      if (parts.length > 1) {
        return parts[parts.length - 1].replace(/_/g, ' ');
      }
      return tz;
    } catch (error) {
      return tz;
    }
  };
  
  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock size={18} className="text-[#0087C8]" />
          Weekly Activity Pattern
        </CardTitle>
        <CardDescription className="text-xs">
          When you typically post throughout the week
        </CardDescription>
        
        {/* Timezone indicator */}
        {timezone && (
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center">
              <Clock className="h-3 w-3 mr-1" /> {formatTimezone(timezone)} timezone
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[550px]">
            {/* Hour labels (simplified) */}
            <div className="flex mb-0.5 pl-10">
              {hourLabels.map((label, i) => (
                <div key={i} className="flex-1 text-xs text-gray-500 text-center">
                  {label}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            {heatmapData.map((dayData, dayIndex) => (
              <div key={dayIndex} className="flex items-center mb-0.5">
                {/* Day label */}
                <div className="w-10 text-xs font-medium text-gray-600 text-right pr-2">
                  {dayLabels[dayIndex]}
                </div>
                
                {/* Hour cells */}
                <div className="flex-1 grid grid-cols-12 gap-[1px]">
                  {Array.from({ length: 12 }).map((_, colIndex) => {
                    // Each cell represents 2 hours, taking the max value of those hours
                    const hourIndex1 = colIndex * 2;
                    const hourIndex2 = hourIndex1 + 1;
                    const value1 = dayData[hourIndex1] || 0;
                    const value2 = dayData[hourIndex2] || 0;
                    const value = Math.max(value1, value2);
                    const borderClass = getBorderColor(value, maxValue);
                    
                    return (
                      <div
                        key={colIndex}
                        className={`h-5 border cursor-pointer transition-all duration-200 hover:border-blue-400 ${borderClass}`}
                        style={{ backgroundColor: getColor(value, maxValue) }}
                        onMouseEnter={() => setHoveredCell({ 
                          day: dayIndex, 
                          hour: hourIndex1, 
                          value: value
                        })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Hover info display */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                <div className="text-xs text-gray-600 mb-1 sm:mb-0">
                  {hoveredCell ? (
                    <span className="font-medium">
                      {dayLabels[hoveredCell.day]} at {hoveredCell.hour % 12 || 12}{hoveredCell.hour < 12 ? 'am' : 'pm'}: {hoveredCell.value} events
                    </span>
                  ) : (
                    'Hover over cells for details'
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Less</span>
                  <div className="w-3 h-3 border border-blue-200" style={{ backgroundColor: '#b6d0f7' }}></div>
                  <div className="w-3 h-3 border border-blue-200" style={{ backgroundColor: '#7aa9f0' }}></div>
                  <div className="w-3 h-3 border border-blue-300" style={{ backgroundColor: '#3d84e6' }}></div>
                  <div className="w-3 h-3 border border-blue-300" style={{ backgroundColor: '#1668d9' }}></div>
                  <div className="w-3 h-3 border border-blue-400" style={{ backgroundColor: '#0043a0' }}></div>
                  <span className="text-xs text-gray-500">More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CircadianHeatmap;
