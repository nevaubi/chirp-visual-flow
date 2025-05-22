
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, Check } from 'lucide-react';

interface GrowthCardProps {
  opportunities: string[];
}

const GrowthCard = ({ opportunities }: GrowthCardProps) => {
  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-1 text-base">
          <Award size={16} className="text-amber-500" />
          Growth Opportunities
        </CardTitle>
        <CardDescription className="text-xs">
          Personalized recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <ul className="space-y-1.5">
          {opportunities.map((opportunity, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <div className="mt-0.5 flex-shrink-0">
                <Check size={12} className="text-green-500" />
              </div>
              <p className="text-gray-700 text-xs">{opportunity}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default GrowthCard;
