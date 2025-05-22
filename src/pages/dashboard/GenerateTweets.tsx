
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TrendingTopics from '@/components/trends/TrendingTopics';
import DetailedTweetView from '@/components/trends/DetailedTweetView';
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
      <TweetGenerationView />
    </div>
  );
};

const TweetGenerationView = () => {
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const isMobile = useIsMobile();

  // Handle topic selection to display in the right panel
  const handleSelectTopic = (topic: SelectedTopic) => {
    setSelectedTopic(topic);
  };

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
    <div className="relative">
      <div className={`w-full grid gap-6 ${!isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left column - Trending Topics */}
        <div className="w-full">
          <TrendingTopics 
            onSelectTopic={handleSelectTopic} 
            selectedTopicId={selectedTopic?.id} 
            displayMode="compact"
          />
        </div>
        
        {/* Right column - Selected topic details and tweets */}
        <div className="w-full">
          {selectedTopic ? (
            <DetailedTweetView 
              topic={selectedTopic} 
              onUseTopic={handleUseTopic}
            />
          ) : (
            <Card className="h-full flex items-center justify-center text-center p-8 text-muted-foreground border border-gray-200 dark:border-gray-800">
              <CardContent>
                <p>Select a trending topic from the left to view example tweets</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateTweets;
