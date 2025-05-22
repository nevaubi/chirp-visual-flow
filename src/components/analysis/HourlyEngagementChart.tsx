
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Clock } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface HourlyEngagementChartProps {
  hourlyAvgLikes: Record<string, number>;
  averageTweetsPerHour: Record<string, number>;
  timezone?: string | null;
  bestHour?: number | null;
}

const HourlyEngagementChart = ({ 
  hourlyAvgLikes, 
  averageTweetsPerHour, 
  timezone, 
  bestHour 
}: HourlyEngagementChartProps) => {
  // Palette
  const TWEET_BLUE = '#1DA1F2';
  const PEAK_GOLD = '#FFC400';
  const PEAK_GOLD_DARK = '#FFB300';
  const LINE_GREEN = '#17BF63';
  const GRID_GRAY = '#E6ECF0';
  const TEXT_GRAY = '#657786';
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [maxLikes, setMaxLikes] = useState<number>(0);
  const [maxTweets, setMaxTweets] = useState<number>(0);
  const [topLikeHour, setTopLikeHour] = useState<{hour: number, value: number}>({hour: 0, value: 0});
  const [topTweetHour, setTopTweetHour] = useState<{hour: number, value: number}>({hour: 0, value: 0});

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

  useEffect(() => {
    if (hourlyAvgLikes && averageTweetsPerHour) {
      // Process and prepare data
      const data = Array.from({ length: 24 }, (_, h) => {
        const hourStr = h.toString();
        const avgLikes = hourlyAvgLikes[hourStr] ?? 0;
        const avgTweets = averageTweetsPerHour[hourStr] ?? 0;
        
        return {
          hourLabel: h.toString().padStart(2, '0'),
          avgLikes,
          avgTweets,
          isTopHour: h === bestHour
        };
      });
      
      setChartData(data);
      
      // Find maximum values and top hours
      const likesValues = Object.values(hourlyAvgLikes);
      const tweetsValues = Object.values(averageTweetsPerHour);
      
      if (likesValues.length > 0) {
        const maxLikes = Math.max(...likesValues);
        setMaxLikes(maxLikes);
        
        // Find the hour with max likes
        const topLikeHour = Object.entries(hourlyAvgLikes)
          .reduce((max, [hour, value]) => (
            value > max.value ? {hour: parseInt(hour), value} : max
          ), {hour: 0, value: 0});
        
        setTopLikeHour(topLikeHour);
      }
      
      if (tweetsValues.length > 0) {
        const maxTweets = Math.max(...tweetsValues);
        setMaxTweets(maxTweets);
        
        // Find the hour with max tweets
        const topTweetHour = Object.entries(averageTweetsPerHour)
          .reduce((max, [hour, value]) => (
            value > max.value ? {hour: parseInt(hour), value} : max
          ), {hour: 0, value: 0});
        
        setTopTweetHour(topTweetHour);
      }
    }
  }, [hourlyAvgLikes, averageTweetsPerHour, bestHour]);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-[#DDE3E8] text-sm">
        <p className="font-semibold text-gray-800 mb-1">{label}:00</p>
        <p className="text-[#1DA1F2]">Avg Likes/Tweet: {d.avgLikes.toFixed(2)}</p>
        <p className="text-[#17BF63]">Avg Tweets/Hour: {d.avgTweets.toFixed(3)}</p>
        {d.isTopHour && <p className="text-[#FFB300] font-semibold mt-2">🏆 Peak hour</p>}
      </div>
    );
  };

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} className="text-[#0087C8]" />
          Hourly Engagement
        </CardTitle>
        <CardDescription>
          When your audience is most engaged with your content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: PEAK_GOLD }} />
            <span>Peak Likes: </span>
            <strong>{formatHour(topLikeHour.hour)} ({topLikeHour.value.toFixed(2)})</strong>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: LINE_GREEN }} />
            <span>Most Active: </span>
            <strong>{formatHour(topTweetHour.hour)} ({topTweetHour.value.toFixed(2)}/hr)</strong>
          </div>
          {timezone && (
            <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              <span>Timezone: </span>
              <strong>{formatTimezone(timezone)}</strong>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_GRAY} />
              <XAxis
                dataKey="hourLabel"
                stroke={TEXT_GRAY}
                tick={{ dy: 8, fontSize: 12 }}
                tickFormatter={(value) => parseInt(value) % 3 === 0 ? value : ''}
              />
              <YAxis
                yAxisId="likes"
                stroke={TWEET_BLUE}
                tick={{ fontSize: 12 }}
                width={40}
              />
              <YAxis
                yAxisId="tweets"
                orientation="right"
                stroke={LINE_GREEN}
                tick={{ fontSize: 12 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />

              <Bar 
                yAxisId="likes" 
                dataKey="avgLikes" 
                name="Avg Likes/Tweet" 
                fill={TWEET_BLUE}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isTopHour ? PEAK_GOLD : TWEET_BLUE} 
                  />
                ))}
              </Bar>

              <Line
                yAxisId="tweets"
                type="monotone"
                dataKey="avgTweets"
                name="Avg Tweets/Hour"
                stroke={LINE_GREEN}
                strokeWidth={2}
                dot={{ fill: LINE_GREEN, r: 3 }}
                activeDot={{ r: 5, stroke: LINE_GREEN }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyEngagementChart;
