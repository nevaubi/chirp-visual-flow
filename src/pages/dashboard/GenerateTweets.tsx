
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TrendingTopics from '@/components/trends/TrendingTopics';

interface SelectedTopic {
  id: string;
  header: string;
  sentiment: string;
  context: string;
  subTopics: string[];
}

const GenerateTweets = () => {
  return (
    <div className="space-y-6 relative">
      <TweetGenerationView />
    </div>
  );
};

const TweetGenerationView = () => {
  // Handle topic selection by dispatching a custom event
  const handleSelectTopic = (topic: SelectedTopic) => {
    if (topic) {
      // Dispatch a custom event that will be caught by the DashboardLayout
      window.dispatchEvent(new CustomEvent('topicSelected', { detail: topic }));
    }
  };

  return (
    <div className="relative">
      {/* Main content - Trending Topics */}
      <div className="w-full">
        <TrendingTopics onSelectTopic={handleSelectTopic} />
      </div>
    </div>
  );
};

export default GenerateTweets;
