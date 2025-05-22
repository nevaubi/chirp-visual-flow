
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ReplyVsPostDonutChartProps {
  replyVsPostStats?: {
    replyCount: number;
    replyPercentage: number;
    postCount: number;
    postPercentage: number;
  };
}

const ReplyVsPostDonutChart = ({ replyVsPostStats }: ReplyVsPostDonutChartProps) => {
  // Prepare data for the chart
  const prepareData = () => {
    if (!replyVsPostStats) {
      return [];
    }

    return [
      { 
        name: 'Posts', 
        value: replyVsPostStats.postCount || 0,
        percentage: (replyVsPostStats.postPercentage || 0) * 100,
        color: '#0087C8'
      },
      { 
        name: 'Replies', 
        value: replyVsPostStats.replyCount || 0,
        percentage: (replyVsPostStats.replyPercentage || 0) * 100, 
        color: '#6B46C1'
      }
    ];
  };

  const data = prepareData();
  const totalCount = data.reduce((sum, item) => sum + item.value, 0);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percentage } = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md text-xs">
          <p className="font-medium">{name}</p>
          <p className="text-gray-600">Count: <span className="font-medium">{value}</span></p>
          <p className="text-gray-600">Percentage: <span className="font-medium">{percentage.toFixed(1)}%</span></p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = () => (
    <div className="flex justify-center gap-4 mt-2">
      {data.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
          <span className="text-xs text-gray-600">{entry.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-medium mb-3 text-blue-700">Posts vs. Replies</h3>
        <div className="w-full flex-1 flex flex-col">
          {totalCount > 0 ? (
            <>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <CustomLegend />
            </>
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

export default ReplyVsPostDonutChart;
