
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TrendingTopics from '@/components/trends/TrendingTopics';
import { useIsMobile } from '@/hooks/use-mobile';

interface SelectedTopic {
  id: string;
  header: string;
  sentiment: string | { type: string; icon: any; color: string };
  context: string;
  subTopics: string[];
  exampleTweets?: any[];
  tag?: string;
}

const GenerateTweets = () => {
  return (
    <div className="space-y-6 relative">
      <TrendingTopicsGrid />
    </div>
  );
};

const TrendingTopicsGrid = () => {
  // Handle using a topic by dispatching a custom event
  const handleUseTopic = (topic: SelectedTopic) => {
    if (topic) {
      // Clean up the topic data before dispatching
      const cleanedTopic = {
        id: topic.id,
        header: topic.header,
        sentiment: typeof topic.sentiment === 'string' ? topic.sentiment : 
                  typeof topic.sentiment === 'object' && topic.sentiment ? topic.sentiment.type : 'neutral',
        context: topic.context,
        subTopics: topic.subTopics
      };
      
      // Dispatch a custom event that will be caught by the DashboardLayout
      window.dispatchEvent(new CustomEvent('topicSelected', { detail: cleanedTopic }));
    }
  };

  return (
    <div className="w-full">
      <TrendingTopics 
        onUseTopic={handleUseTopic}
        displayMode="grid"
      />
    </div>
  );
};

export default GenerateTweets;
