
import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import ExampleTweetCard from "./ExampleTweetCard";

interface TweetProfile {
  username: string;
  displayName: string;
  verified: boolean;
  timestamp: string;
  avatarUrl: string;
}

interface TweetMetrics {
  likes: number;
  replies: number;
  retweets: number;
}

interface ExampleTweet {
  text: string;
  profile: TweetProfile;
  metrics: TweetMetrics;
}

interface DetailedTweetViewProps {
  topic: {
    id: string;
    header: string;
    sentiment: string | { type: string; icon: any; color: string };
    context: string;
    subTopics: string[];
    exampleTweets?: ExampleTweet[];
    tag?: string;
  };
  onUseTopic: (topic: any) => void;
}

const DetailedTweetView: React.FC<DetailedTweetViewProps> = ({ topic, onUseTopic }) => {
  const isMobile = useIsMobile();
  
  // Clean the topic header
  const cleanHeader = (header: string): string => {
    return header.replace(/^TOPIC HEADER:\s*/i, '');
  };
  
  // Determine sentiment icon and color
  const getSentimentData = (sentiment: string | { type: string; icon: any; color: string }) => {
    if (typeof sentiment === 'object') {
      return sentiment;
    }
    
    const sentimentType = sentiment.toLowerCase();
    
    if (sentimentType.includes('positive') || 
        sentimentType.includes('excited') || 
        sentimentType.includes('enthusiastic') || 
        sentimentType.includes('optimistic')) {
      return { type: sentimentType, icon: ArrowUp, color: 'text-emerald-500' };
    }
    
    if (sentimentType.includes('negative') || 
        sentimentType.includes('concerned') || 
        sentimentType.includes('worried') || 
        sentimentType.includes('skeptical') ||
        sentimentType.includes('critical')) {
      return { type: sentimentType, icon: ArrowDown, color: 'text-rose-500' };
    }
    
    return { type: sentimentType, icon: Minus, color: 'text-amber-500' };
  };
  
  const sentimentData = getSentimentData(topic.sentiment);
  const SentimentIcon = sentimentData.icon;
  
  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs font-medium">
            {topic.tag || 'Trending'}
          </Badge>
          <div className={`flex items-center ${sentimentData.color} text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800`}>
            <SentimentIcon size={14} className="mr-1.5" />
            <span className="capitalize">{sentimentData.type}</span>
          </div>
        </div>
        <CardTitle className="text-lg font-semibold">
          {cleanHeader(topic.header)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{topic.context}</p>
        
        {topic.subTopics.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Key Points</h4>
            <ul className="space-y-2">
              {topic.subTopics.map((subtopic, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-twitter-blue mr-2 flex-shrink-0 mt-0.5">•</span>
                  <span>{subtopic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Example Tweets Section */}
        {topic.exampleTweets && topic.exampleTweets.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Example Tweets</h4>
            <div className="space-y-3">
              {topic.exampleTweets.map((tweet, index) => (
                <ExampleTweetCard
                  key={`${topic.id}-tweet-${index}`}
                  text={tweet.text}
                  profile={tweet.profile}
                  metrics={tweet.metrics}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={() => onUseTopic(topic)}
            className="bg-twitter-blue hover:bg-twitter-dark text-white rounded-full text-sm px-4"
          >
            Use Topic
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedTweetView;
