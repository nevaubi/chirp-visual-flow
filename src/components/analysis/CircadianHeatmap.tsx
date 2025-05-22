import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface CircadianHeatmapProps {
  data: Record<string, number>;
  timezone?: string | null;
}

const CircadianHeatmap = ({ data, timezone }: CircadianHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<{day: number, hour: number, value: number} | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);
  
  // Generate mock weekly data using the daily aggregates
  // This creates a heatmap for a full week based on the daily hour counts
  const generateWeeklyData = () => {
    const hourKeys = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Find max value for proper scaling
    const maxHourlyValue = Math.max(...Object.values(data));
    setMaxValue(maxHourlyValue > 0 ? maxHourlyValue : 8); // Default max if no data
    
    // Create weekly mock data that follows similar patterns to hourly data
    // but varies slightly by day to make the visualization more interesting
    return Array.from({ length: 7 }, (_, dayIndex) => {
      return hourKeys.map(hour => {
        const hourValue = data[hour] || 0;
        
        // Create variance based on day (more activity on weekdays, less on weekends)
        let dayFactor = 1;
        if (dayIndex === 0 || dayIndex === 6) {
          dayFactor = 0.7; // Less activity on weekends
        } else if (dayIndex === 2 || dayIndex === 3) {
          dayFactor = 1.2; // More activity midweek
        }
        
        // Add some randomness but keep the general pattern
        const variance = Math.random() * 0.5 + 0.75;
        
        // Calculate and round the value
        const cellValue = Math.round(hourValue * dayFactor * variance);
        
        // Cap at some reasonable maximum
        return Math.min(cellValue, maxHourlyValue * 1.5);
      });
    });
  };
  
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setHeatmapData(generateWeeklyData());
    }
  }, [data]);
  
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0') + ':00'
  );
  
  // Color intensity function
  const getColor = (value: number, max: number) => {
    if (value === 0) return 'rgb(248, 250, 252)'; // Very light gray
    const intensity = value / max;
    const hue = 220; // Blue hue
    const saturation = Math.min(70 + intensity * 30, 100);
    const lightness = Math.max(90 - intensity * 50, 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  
  // Format hour for display
  const formatHour = (hour: number | string) => {
    const h = typeof hour === 'string' ? parseInt(hour) : hour;
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };
  
  // Format timezone for display
  const formatTimezone = (tz: string | null | undefined) => {
    if (!tz) return 'UTC';
    
    // Convert technical timezone format to user-friendly name
    try {
      // Extract continent/city format to just city or region
      const parts = tz.split('/');
      if (parts.length > 1) {
        // Replace underscores with spaces and format the name
        return parts[parts.length - 1].replace(/_/g, ' ');
      }
      return tz;
    } catch (error) {
      return tz;
    }
  };
  
  // Find peak activity hour
  const getPeakActivityHour = () => {
    const hourEntries = Object.entries(data);
    if (hourEntries.length === 0) return { hour: "N/A", value: 0 };
    
    const peakEntry = hourEntries.reduce(
      (max, [hour, value]) => value > max.value ? { hour, value } : max,
      { hour: "0", value: 0 }
    );
    
    return { 
      hour: formatHour(peakEntry.hour), 
      value: peakEntry.value 
    };
  };
  
  // Find evening peak (6-9 PM)
  const getEveningPeak = () => {
    const eveningHours = ["18", "19", "20"];
    const totalEvents = eveningHours.reduce((sum, hour) => sum + (data[hour] || 0), 0);
    return totalEvents;
  };
  
  // Find quiet hours (hours with least activity)
  const getQuietHours = () => {
    const hourEntries = Object.entries(data)
      .filter(([_, value]) => value === 0 || value <= 1)
      .map(([hour, _]) => formatHour(hour))
      .slice(0, 2);
    
    return hourEntries.length > 0 
      ? hourEntries.join(', ')
      : 'None detected';
  };
  
  const peak = getPeakActivityHour();
  const eveningPeak = getEveningPeak();
  
  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={20} className="text-[#0087C8]" />
          Weekly Activity Pattern
        </CardTitle>
        <CardDescription>
          When you typically post throughout the week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px]">
            {timezone && (
              <div className="mb-2 flex justify-end">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> {formatTimezone(timezone)} timezone
                </span>
              </div>
            )}
            
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12 sm:w-16"></div>
              {hourLabels.map((hour, i) => (
                <div key={i} className="flex-1 min-w-6 text-xs text-gray-600 text-center">
                  {i % 4 === 0 ? hour.slice(0, 2) : ''}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            {heatmapData.map((dayData, dayIndex) => (
              <div key={dayIndex} className="flex items-center mb-1">
                {/* Day label */}
                <div className="w-12 sm:w-16 text-sm font-medium text-gray-700 text-right pr-2">
                  {dayLabels[dayIndex]}
                </div>
                
                {/* Hour cells */}
                {dayData.map((value, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="flex-1 min-w-6 aspect-square border border-gray-200 cursor-pointer transition-all duration-200 hover:border-gray-400"
                    style={{ backgroundColor: getColor(value, maxValue) }}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour: hourIndex, value })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {value > 0 && value > maxValue / 2 && (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-white">
                        {value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Legend and Insights */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                  {hoveredCell ? (
                    <span className="font-medium">
                      {dayLabels[hoveredCell.day]} {formatHour(hoveredCell.hour)}: {hoveredCell.value} events
                    </span>
                  ) : (
                    'Hover over cells for details'
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Less</span>
                  {[0, 1, 2, 4, 6, 8].map(val => (
                    <div
                      key={val}
                      className="w-4 h-4 border border-gray-200"
                      style={{ backgroundColor: getColor(val, maxValue) }}
                    ></div>
                  ))}
                  <span className="text-sm text-gray-600">More</span>
                </div>
              </div>
              
              {/* Key Insights */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Key Insights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Peak Activity:</span>
                    <br />{peak.hour} ({peak.value} events)
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Evening Activity:</span>
                    <br />6:00-8:00 PM ({eveningPeak} events)
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Quiet Hours:</span>
                    <br />{getQuietHours()}
                  </div>
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
