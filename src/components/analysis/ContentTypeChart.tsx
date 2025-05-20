
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ContentTypeChartProps {
  data: {
    text_only: number;
    with_image: number;
    with_video: number;
    with_link: number;
  };
}

const COLORS = ['#0087C8', '#6B46C1', '#10B981', '#F59E0B'];

const ContentTypeChart = ({ data }: ContentTypeChartProps) => {
  // Format the data for the chart
  const chartData = [
    { name: 'Text Only', value: data.text_only || 0, label: 'Text Only' },
    { name: 'Images', value: data.with_image || 0, label: 'With Images' },
    { name: 'Videos', value: data.with_video || 0, label: 'With Videos' },
    { name: 'Links', value: data.with_link || 0, label: 'With Links' },
  ].sort((a, b) => b.value - a.value); // Sort by value descending
  
  // Custom tooltip to show the engagement value
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="text-sm font-medium">{payload[0].payload.label}</p>
          <p className="text-sm text-gray-600">
            Engagement: <span className="font-medium">{payload[0].value.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
        >
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span className="text-xs text-gray-600">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentTypeChart;
