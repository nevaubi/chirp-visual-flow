
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface ContentTypeEngagementChartProps {
  engagementByContentType?: {
    text_only: number;
    with_image: number;
    with_video: number;
    with_link: number;
  };
}

const ContentTypeEngagementChart = ({ engagementByContentType }: ContentTypeEngagementChartProps) => {
  // Format the data for the chart
  const prepareData = () => {
    if (!engagementByContentType) {
      return [];
    }

    const types = [
      { key: 'text_only', label: 'Text Only', color: '#0087C8' },
      { key: 'with_image', label: 'Images', color: '#6B46C1' },
      { key: 'with_video', label: 'Videos', color: '#10B981' },
      { key: 'with_link', label: 'Links', color: '#F59E0B' },
    ];

    return types
      .map(type => ({
        type: type.key,
        label: type.label,
        value: engagementByContentType[type.key as keyof typeof engagementByContentType] || 0,
        color: type.color
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  };

  const data = prepareData();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md text-xs">
          <p className="font-medium">{payload[0].payload.label}</p>
          <p className="text-gray-600">
            Engagement: <span className="font-medium">{payload[0].value.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-3 text-blue-700">Content Type Engagement</h3>
        <div className="w-full h-44">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <XAxis 
                  type="number" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  type="category"
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentTypeEngagementChart;
