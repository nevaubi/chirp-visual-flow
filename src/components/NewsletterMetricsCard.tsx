
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock } from "lucide-react";

interface NewsletterMetricsCardProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function NewsletterMetricsCard({ className, style }: NewsletterMetricsCardProps) {
  return (
    <Card 
      className={`w-[350px] shadow-md border border-opacity-10 ${className}`}
      style={style}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">Newsletter Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-4">
          {/* Newsletter Metric */}
          <div className="flex-1 p-3 rounded-md bg-blue-50 border border-blue-100">
            <div className="flex items-center mb-3">
              <div className="text-blue-600 mr-2">
                <Mail className="h-4 w-4" />
              </div>
              <div className="text-sm text-gray-600 font-medium">Newsletters</div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 m-0">12</p>
          </div>
          
          {/* Time Saved Metric */}
          <div className="flex-1 p-3 rounded-md bg-green-50 border border-green-100">
            <div className="flex items-center mb-3">
              <div className="text-green-600 mr-2">
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-sm text-gray-600 font-medium">Time Saved</div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 m-0">
              6.7<span className="text-sm text-gray-500 font-normal ml-1">hours</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
