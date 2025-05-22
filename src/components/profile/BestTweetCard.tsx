
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Twitter, Award } from 'lucide-react';

interface BestTweetCardProps {
  tweet: {
    text: string;
    engagement: number;
    date: string;
  };
  username: string;
}

const BestTweetCard = ({ tweet, username }: BestTweetCardProps) => {
  if (!tweet || !tweet.text) {
    return null;
  }

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award size={18} className="text-[#0087C8]" />
          Your Best Performing Tweet
        </CardTitle>
        <CardDescription>
          This tweet received {tweet.engagement} engagements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0087C8] flex items-center justify-center text-white flex-shrink-0">
              <Twitter size={16} />
            </div>
            <div>
              <div className="font-medium mb-1">{username}</div>
              <p className="text-gray-700">{tweet.text}</p>
              <p className="text-sm text-gray-500 mt-2">
                {new Date(tweet.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BestTweetCard;
