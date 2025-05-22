import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface TrendingTopic {
  id: string;
  tag: string;
  header: string;
  sentiment: {
    type: string;
    icon: any;
    color: string;
  };
  context: string;
  subTopics: string[];
  exampleTweets: ExampleTweet[];
  percentage?: number; // Adding percentage for trending relevance
}

interface Tag {
  id: number;
  name: string;
}

interface TrendingTopicsProps {
  onUseTopic: (topicData: any) => void;
  selectedTopicId?: string;
  displayMode?: 'compact' | 'full' | 'grid'; // Added 'grid' mode
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ 
  onUseTopic, 
  selectedTopicId,
  displayMode = 'full'
}) => {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const isMobile = useIsMobile();
  const isGrid = displayMode === 'grid';

  // Function to clean topic headers by removing "TOPIC HEADER: " prefix
  const cleanHeader = (header: string): string => {
    return header.replace(/^TOPIC HEADER:\s*/i, '');
  };

  const availableTags = [
    { id: 1, name: 'AI' },
    { id: 2, name: 'Coding' },
    { id: 3, name: 'Crypto' },
    { id: 4, name: 'Entertainment' },
    { id: 5, name: 'Finance' },
    { id: 6, name: 'Marketing' },
    { id: 7, name: 'Politics' },
    { id: 8, name: 'Sports' },
    { id: 9, name: 'Tech' },
  ];

  // Map sentiment types to icons and colors
  const getSentimentData = (sentimentType: string) => {
    sentimentType = sentimentType.toLowerCase();
    
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

  // Generate random trending percentages for the topics
  const generatePercentages = (topics: TrendingTopic[]): TrendingTopic[] => {
    return topics.map(topic => ({
      ...topic,
      percentage: Math.floor(Math.random() * 30) + 70 // Random value between 70% and 99%
    }));
  };

  // Fetch trending topics from our edge function
  const fetchTrendingTopics = async (tag: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-trending-topics', {
        body: { category: tag }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch trending topics');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trending topics');
      }
      
      // Transform the data to match our component's expected format
      const formattedTopics: TrendingTopic[] = data.topics.map((topic: any, index: number) => {
        const sentiment = getSentimentData(topic.sentiment);
        const topicId = `${tag}-${index + 1}`;
        
        return {
          id: topicId,
          tag: tag,
          header: topic.header,
          sentiment,
          context: topic.context,
          subTopics: topic.subTopics || [],
          exampleTweets: topic.exampleTweets || []
        };
      });
      
      // Add trending percentages
      const topicsWithPercentages = generatePercentages(formattedTopics);
      setTrendingTopics(topicsWithPercentages);
    } catch (err: any) {
      console.error('Error fetching trending topics:', err);
      setError(err.message || 'Failed to fetch trending topics');
      toast({
        title: 'Error loading trending topics',
        description: err.message || 'Please try again later',
        variant: 'destructive',
      });
      setTrendingTopics([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch trending topics when tags change
  useEffect(() => {
    if (selectedTags.length > 0) {
      const tag = selectedTags[0].name;
      fetchTrendingTopics(tag);
    } else {
      setTrendingTopics([]);
    }
  }, [selectedTags]);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // Only allow 1 tag - this is simpler than the original 2 tags max
      setSelectedTags([tag]);
    }
  };

  const handleSelectTopic = (topic: TrendingTopic) => {
    // Clean the topic header before passing it
    const cleanedTopic = {
      ...topic,
      header: cleanHeader(topic.header)
    };
    
    // Pass the topic data to the parent component
    onUseTopic(cleanedTopic);
  };

  const showTopics = !isLoading && trendingTopics.length > 0;

  // Render the grid view of trending topics
  const renderGridTopics = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
        {trendingTopics.map(topic => (
          <Card 
            key={topic.id} 
            className="border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300 flex flex-col"
          >
            {/* Header */}
            <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs font-medium">
                    {topic.tag}
                  </Badge>
                  
                  {topic.percentage && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {topic.percentage}% trending
                    </span>
                  )}
                </div>
                
                <div className={`flex items-center ${topic.sentiment.color} text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800`}>
                  <topic.sentiment.icon size={12} className="mr-1" />
                  <span className="capitalize">{topic.sentiment.type}</span>
                </div>
              </div>
              
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                {cleanHeader(topic.header)}
              </CardTitle>
            </CardHeader>
            
            {/* Content */}
            <CardContent className="pt-3 pb-1 flex-grow">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{topic.context}</p>
              
              {topic.subTopics.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Key Points</h4>
                  <ul className="space-y-1.5">
                    {topic.subTopics.slice(0, 3).map((subtopic, idx) => (
                      <li key={idx} className="flex items-start text-xs text-gray-700 dark:text-gray-300">
                        <span className="text-twitter-blue mr-1.5 flex-shrink-0 mt-0.5">•</span>
                        <span className="line-clamp-1">{subtopic}</span>
                      </li>
                    ))}
                    {topic.subTopics.length > 3 && (
                      <li className="text-xs text-twitter-blue font-medium pl-4">+ {topic.subTopics.length - 3} more points</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-end">
              <Button 
                size="sm" 
                onClick={() => handleSelectTopic(topic)}
                className="bg-twitter-blue hover:bg-twitter-dark text-white rounded-full text-xs px-3 py-1.5"
              >
                Use Topic
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-800 w-full bg-white dark:bg-gray-900">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="text-twitter-blue h-5 w-5" />
          <span>Trending Topics</span>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Select a category to discover trending topics on Twitter
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2 mb-5">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedTags.find(t => t.id === tag.id)
                  ? 'bg-twitter-blue text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
        
        {/* Error and loading states */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-800/30">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-twitter-blue animate-spin" />
              <p className="text-sm text-muted-foreground">Loading trending topics...</p>
            </div>
          </div>
        )}
        
        {/* Grid View */}
        {showTopics && isGrid && renderGridTopics()}
        
        {/* Original List View (kept for compatibility) */}
        {showTopics && !isGrid && (
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
            {/* ... keep existing code (original list view rendering) */}
          </div>
        )}
        
        {!showTopics && selectedTags.length > 0 && !isLoading && (
          <div className="flex justify-center my-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-twitter-blue/70 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-twitter-blue/50 rounded-full animate-pulse delay-150"></div>
              <div className="w-3 h-3 bg-twitter-blue/30 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        )}
        
        {!showTopics && selectedTags.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a category above to see trending topics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingTopics;
