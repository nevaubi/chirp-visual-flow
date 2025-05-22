
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award size={18} className="text-amber-500" />
          Growth Opportunities
        </CardTitle>
        <CardDescription>
          Personalized recommendations to improve your performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {opportunities.map((opportunity, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="mt-1 flex-shrink-0">
                <Check size={16} className="text-green-500" />
              </div>
              <p className="text-gray-700 text-sm">{opportunity}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default GrowthCard;
