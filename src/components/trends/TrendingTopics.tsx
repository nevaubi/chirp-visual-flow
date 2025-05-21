
import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ExampleTweetCard from './ExampleTweetCard';

interface TweetProfile {
  username: string;
  displayName: string;
  verified: boolean;
  timestamp: string;
  avatarUrl: string;
}

interface ExampleTweet {
  text: string;
  profile: TweetProfile;
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
}

interface Tag {
  id: number;
  name: string;
}

interface TrendingTopicsProps {
  onSelectTopic: (topicData: any) => void;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ onSelectTopic }) => {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

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
      
      setTrendingTopics(formattedTopics);
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

  const handleUseTopic = (topic: TrendingTopic) => {
    // Pass the full topic data to the parent component
    onSelectTopic({
      id: topic.id,
      header: topic.header,
      sentiment: topic.sentiment.type,
      context: topic.context,
      subTopics: topic.subTopics,
      exampleTweets: topic.exampleTweets.map(tweet => tweet.text)
    });
  };

  // Helper function to get a better title when the header is "Unknown Topic"
  const getDisplayHeader = (topic: TrendingTopic): string => {
    if (topic.header !== "Unknown Topic") {
      return topic.header;
    }
    
    // Try to extract a meaningful title from the context
    if (topic.context && topic.context.length > 0) {
      // Use the first sentence or up to 40 chars
      const firstSentence = topic.context.split('.')[0];
      if (firstSentence.length <= 40) {
        return firstSentence;
      }
      return firstSentence.substring(0, 40) + '...';
    }
    
    // If all else fails, use subtopics
    if (topic.subTopics.length > 0) {
      return topic.subTopics[0];
    }
    
    return "Trending Topic";
  };

  const showTopics = !isLoading && trendingTopics.length > 0;

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-800 w-full bg-white dark:bg-gray-900">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="text-primary h-5 w-5" />
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
        
        {showTopics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {trendingTopics.map(topic => (
              <div 
                key={topic.id} 
                className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">
                      {topic.tag}
                    </Badge>
                    <div className={`flex items-center ${topic.sentiment.color} text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800`}>
                      <topic.sentiment.icon size={12} className="mr-1" />
                      <span className="capitalize">{topic.sentiment.type}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {getDisplayHeader(topic)}
                  </h3>
                </div>
                
                {/* Content */}
                <div className="p-4 bg-white dark:bg-gray-900">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{topic.context}</p>
                  
                  {topic.subTopics.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Key Points</h4>
                      <ul className="space-y-2 ml-1">
                        {topic.subTopics.map((subtopic, idx) => (
                          <li key={idx} className="flex text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-twitter-blue mr-2 flex-shrink-0">•</span>
                            <span>{subtopic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Example Tweets */}
                  {topic.exampleTweets.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Example Tweets</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {topic.exampleTweets.map((tweet, idx) => (
                          <ExampleTweetCard 
                            key={idx} 
                            text={tweet.text} 
                            profile={tweet.profile} 
                            index={idx} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => handleUseTopic(topic)}
                      className="bg-twitter-blue hover:bg-twitter-dark text-white rounded-full text-sm px-4"
                    >
                      Use Topic
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!showTopics && selectedTags.length > 0 && isLoading && (
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
