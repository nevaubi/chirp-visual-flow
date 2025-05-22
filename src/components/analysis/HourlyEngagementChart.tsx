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
  
  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  useEffect(() => {
    if (hourlyAvgLikes && averageTweetsPerHour) {
      // Process and prepare data
      const data = Array.from({ length: 24 }, (_, h) => {
        const hourStr = h.toString();
        const avgLikes = hourlyAvgLikes[hourStr] ?? 0;
        const avgTweets = averageTweetsPerHour[hourStr] ?? 0;
        
        return {
          hour: h,
          hourLabel: h.toString().padStart(2, '0'),
          avgLikes,
          avgTweets,
          isTopHour: h === bestHour
        };
      });
      
      setChartData(data);
    }
  }, [hourlyAvgLikes, averageTweetsPerHour, bestHour]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const hour = parseInt(label);
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-[#DDE3E8] text-xs">
        <p className="font-semibold text-gray-800 mb-1">{formatHour(hour)}</p>
        <p className="text-[#1DA1F2] flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#1DA1F2]"></span>
          Avg Likes/Tweet: {payload[0]?.value?.toFixed(2) || '0.00'}
        </p>
        <p className="text-[#17BF63] flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#17BF63]"></span>
          Avg Tweets/Hour: {payload[1]?.value?.toFixed(3) || '0.000'}
        </p>
        {hour === bestHour && (
          <p className="text-[#FFB300] font-semibold mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FFB300]"></span>
            Peak engagement hour
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp size={18} className="text-[#0087C8]" />
          Hourly Engagement
        </CardTitle>
        <CardDescription className="text-xs">
          Use data-backed insights to time your tweets
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
        {/* Chart - with increased height to match CircadianHeatmap */}
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 40, bottom: 0, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_GRAY} strokeWidth={1} />
              <XAxis
                dataKey="hourLabel"
                stroke={TEXT_GRAY}
                fontSize={12}
                interval={3}
                tick={{ dy: 5 }}
                height={25}
                axisLine={{ strokeWidth: 1, stroke: TEXT_GRAY }}
              />
              <YAxis
                yAxisId="likes"
                stroke={TWEET_BLUE}
                tick={{ fontSize: 12, fill: TEXT_GRAY }}
                axisLine={{ strokeWidth: 1, stroke: TWEET_BLUE }}
                label={{ value: 'Likes', angle: -90, position: 'insideLeft', fill: TEXT_GRAY, style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <YAxis
                yAxisId="tweets"
                orientation="right"
                stroke={LINE_GREEN}
                tick={{ fontSize: 12, fill: TEXT_GRAY }}
                axisLine={{ strokeWidth: 1, stroke: LINE_GREEN }}
                label={{ value: 'Tweets', angle: 90, position: 'insideRight', fill: TEXT_GRAY, style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={15} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ marginTop: -5, fontSize: '10px' }} 
              />

              <Bar 
                yAxisId="likes" 
                dataKey="avgLikes" 
                name="Avg Likes/Tweet" 
                radius={[3, 3, 0, 0]}
                barSize={10}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isTopHour ? PEAK_GOLD : TWEET_BLUE}
                    stroke={entry.isTopHour ? PEAK_GOLD_DARK : 'none'} 
                    strokeWidth={entry.isTopHour ? 1 : 0}
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
                activeDot={{ r: 4, stroke: LINE_GREEN, strokeWidth: 1 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyEngagementChart;
