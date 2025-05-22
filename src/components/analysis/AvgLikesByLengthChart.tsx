
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AvgLikesByLengthChartProps {
  avgLikesByLength?: Record<string, number>;
}

const AvgLikesByLengthChart = ({ avgLikesByLength }: AvgLikesByLengthChartProps) => {
  // Format the data for the chart
  const prepareData = () => {
    if (!avgLikesByLength) {
      return [];
    }

    // Create an ordered array of categories to ensure consistent display
    const categories = ['<50', '50-100', '100-150', '150+'];
    
    return categories.map(category => ({
      category,
      value: avgLikesByLength[category] || 0,
      label: `${category} chars`
    }));
  };

  const data = prepareData();
  
  // Custom tooltip to show the average likes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md text-xs">
          <p className="font-medium">{payload[0].payload.label}</p>
          <p className="text-gray-600">
            Avg Likes: <span className="font-medium">{payload[0].value.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-medium mb-3 text-blue-700">Avg. Likes by Length</h3>
        <div className="w-full flex-1 flex items-center justify-center">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <XAxis 
                  dataKey="category" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#0087C8" radius={[4, 4, 0, 0]} />
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

export default AvgLikesByLengthChart;
