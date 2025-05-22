
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import InsightCard from './InsightCard';

interface CircadianInsightsProps {
  data: number[][];
  timezone?: string | null;
}

const CircadianInsights = ({ data, timezone }: CircadianInsightsProps) => {
  // Find peak activity time (moved from CircadianHeatmap)
  const getPeakActivity = () => {
    if (!data || data.length === 0) return { day: 'N/A', hour: 'N/A', value: 0 };
    
    let maxDay = 0;
    let maxHour = 0;
    let maxValue = 0;
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    data.forEach((dayData, dayIndex) => {
      dayData.forEach((value, hourIndex) => {
        if (value > maxValue) {
          maxValue = value;
          maxHour = hourIndex;
          maxDay = dayIndex;
        }
      });
    });
    
    const formattedHour = maxHour === 0 ? '12 AM' : 
                         maxHour === 12 ? '12 PM' : 
                         maxHour < 12 ? `${maxHour} AM` : 
                         `${maxHour - 12} PM`;
    
    return { 
      day: dayLabels[maxDay], 
      hour: formattedHour,
      value: maxValue 
    };
  };
  
  // Find quiet hours (lowest activity) (moved from CircadianHeatmap)
  const getQuietHours = () => {
    if (!data || data.length === 0) return 'None detected';
    
    // Get average activity by hour across all days
    const hourlyAverages = Array(24).fill(0);
    
    data.forEach(dayData => {
      dayData.forEach((value, hour) => {
        hourlyAverages[hour] += value;
      });
    });
    
    // Divide by number of days
    hourlyAverages.forEach((sum, idx) => {
      hourlyAverages[idx] = sum / data.length;
    });
    
    // Find hours with lowest average activity
    const hourEntries = hourlyAverages
      .map((value, hour) => ({ hour, value }))
      .sort((a, b) => a.value - b.value)
      .filter(entry => entry.value <= 1)
      .slice(0, 2)
      .map(entry => {
        const h = entry.hour;
        return h === 0 ? '12 AM' : 
               h === 12 ? '12 PM' : 
               h < 12 ? `${h} AM` : 
               `${h - 12} PM`;
      });
    
    return hourEntries.length > 0 ? hourEntries.join(', ') : 'None detected';
  };

  const peak = getPeakActivity();

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-4 text-blue-700">Key Insights: Posting frequency</h3>
        
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Peak Activity</span>
            </div>
            <p className="text-sm">{peak.day} at {peak.hour} ({peak.value})</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Best Posting Time</span>
            </div>
            <p className="text-sm">6-8 PM (Weekdays)</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Quiet Hours</span>
            </div>
            <p className="text-sm">{getQuietHours()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CircadianInsights;
