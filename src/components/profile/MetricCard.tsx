
import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  className?: string;
}

const MetricCard = ({ title, value, description, icon, className }: MetricCardProps) => {
  return (
    <Card className={`border-none shadow-sm hover:shadow transition-shadow ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="text-2xl font-semibold mt-1">{value}</div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
