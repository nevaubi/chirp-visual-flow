
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, LineChart } from 'lucide-react';

interface HourlyInsightsProps {
  hourlyAvgLikes: Record<string, number>;
  averageTweetsPerHour: Record<string, number>;
  bestHour?: number | null;
}

const HourlyInsights = ({ 
  hourlyAvgLikes, 
  averageTweetsPerHour,
  bestHour 
}: HourlyInsightsProps) => {
  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };
  
  // Find hour with max likes
  const getTopLikeHour = () => {
    if (!hourlyAvgLikes || Object.keys(hourlyAvgLikes).length === 0) {
      return { hour: 0, value: 0 };
    }
    
    return Object.entries(hourlyAvgLikes)
      .reduce((max, [hour, value]) => (
        value > max.value ? {hour: parseInt(hour), value} : max
      ), {hour: 0, value: 0});
  };
  
  // Find hour with max tweets
  const getTopTweetHour = () => {
    if (!averageTweetsPerHour || Object.keys(averageTweetsPerHour).length === 0) {
      return { hour: 0, value: 0 };
    }
    
    return Object.entries(averageTweetsPerHour)
      .reduce((max, [hour, value]) => (
        value > max.value ? {hour: parseInt(hour), value} : max
      ), {hour: 0, value: 0});
  };
  
  // Determine the "sweet spot" by finding a range of hours with good engagement
  const getSweetSpot = () => {
    const topTweetHour = getTopTweetHour();
    if (topTweetHour.hour === 0 && topTweetHour.value === 0) return 'Not enough data';
    
    // Look for a cluster of 2-3 hours with good engagement
    const sweetStart = topTweetHour.hour;
    const sweetEnd = (sweetStart + 2) % 24;
    
    return `${formatHour(sweetStart)}–${formatHour(sweetEnd)}`;
  };

  const topLikeHour = getTopLikeHour();
  const topTweetHour = getTopTweetHour();
  
  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-4 text-blue-700">Engagement Insights: Performance metrics</h3>
        
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Peak Likes</span>
            </div>
            <p className="text-sm">
              {formatHour(topLikeHour.hour)} ({topLikeHour.value.toFixed(1)})
            </p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Most Active</span>
            </div>
            <p className="text-sm">
              {formatHour(topTweetHour.hour)} ({topTweetHour.value.toFixed(1)})
            </p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <LineChart className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-700">Sweet Spot</span>
            </div>
            <p className="text-sm">{getSweetSpot()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyInsights;
