import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
}

interface Tag {
  id: number;
  name: string;
}

interface TrendingTopicsProps {
  onSelectTopic: (topicData: any) => void;
  selectedTopicId?: string;
  displayMode?: 'full' | 'compact'; // 'full' for original display, 'compact' for left column
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ 
  onSelectTopic, 
  selectedTopicId,
  displayMode = 'full'
}) => {
  // Initialize with AI tag selected
  const aiTag = { id: 1, name: 'AI' };
  const [selectedTags, setSelectedTags] = useState<Tag[]>([aiTag]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [hasAutoSelectedTopic, setHasAutoSelectedTopic] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const isCompact = displayMode === 'compact';

  // Function to clean topic headers by removing "TOPIC HEADER: " prefix
  const cleanHeader = (header: string): string => {
    return header.replace(/^TOPIC HEADER:\s*/i, '');
  };

  // Function to clean subtopic text by removing leading dash
  const cleanSubtopic = (subtopic: string): string => {
    return subtopic.replace(/^-\s*/, '');
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

  // Auto-select the first topic when topics are loaded
  useEffect(() => {
    if (trendingTopics.length > 0 && !selectedTopicId && !hasAutoSelectedTopic) {
      const firstTopic = trendingTopics[0];
      if (firstTopic) {
        handleSelectTopic(firstTopic);
        setHasAutoSelectedTopic(true);
      }
    }
  }, [trendingTopics, selectedTopicId, hasAutoSelectedTopic]);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // Only allow 1 tag - this is simpler than the original 2 tags max
      setSelectedTags([tag]);
      // Reset auto-select flag when changing tags
      setHasAutoSelectedTopic(false);
    }
  };

  const handleSelectTopic = (topic: TrendingTopic) => {
    // Clean the topic header before passing it
    const cleanedTopic = {
      ...topic,
      header: cleanHeader(topic.header)
    };
    
    // Pass the topic data to the parent component
    onSelectTopic(cleanedTopic);
  };

  const handleUseTopic = (topic: TrendingTopic) => {
    // Clean the topic header before passing it
    const cleanedTopic = {
      ...topic,
      header: cleanHeader(topic.header)
    };
    
    // Pass the topic data to the parent component without example tweets
    onSelectTopic({
      id: cleanedTopic.id,
      header: cleanedTopic.header,
      sentiment: cleanedTopic.sentiment.type,
      context: cleanedTopic.context,
      subTopics: cleanedTopic.subTopics
    });
    
    // Dispatch a custom event for the DashboardLayout to listen for
    window.dispatchEvent(new CustomEvent('topicSelected', { 
      detail: {
        id: cleanedTopic.id,
        header: cleanedTopic.header,
        sentiment: cleanedTopic.sentiment.type,
        context: cleanedTopic.context,
        subTopics: cleanedTopic.subTopics
      }
    }));
  };

  const showTopics = !isLoading && trendingTopics.length > 0;

  return (
    <Card className="shadow-md border border-gray-200 w-full bg-white">
      <CardHeader className="pb-3 border-b border-gray-200 bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#032d42]">
          <TrendingUp className="text-gray-700 h-5 w-5" />
          <span>Trending Topics</span>
        </CardTitle>
        <div className="text-sm text-gray-600">
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
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
        
        {/* Error and loading states */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-600">Loading trending topics...</p>
            </div>
          </div>
        )}
        
        {showTopics && (
          <div className={`grid ${isCompact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4 animate-fade-in`}>
            {trendingTopics.map(topic => {
              return (
                <div 
                  key={topic.id} 
                  className={`border border-gray-200 rounded-xl overflow-hidden 
                    ${selectedTopicId === topic.id ? 
                      'ring-2 ring-gray-400 shadow-lg bg-gray-50' : 'bg-white'} 
                    ${isCompact ? 'hover:bg-gray-50 transition-colors cursor-pointer' : 'hover:shadow-lg transition-shadow'}
                    ${isCompact ? 'min-h-[260px] flex flex-col' : ''}`}
                  onClick={isCompact ? () => handleSelectTopic(topic) : undefined}
                >
                  {/* Header */}
                  <div className="bg-gray-100 border-b border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="bg-gray-200 text-gray-700 text-xs font-medium border-gray-300">
                        {topic.tag}
                      </Badge>
                      <div className={`flex items-center bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full`}>
                        <topic.sentiment.icon size={12} className={`mr-1 ${topic.sentiment.color}`} />
                        <span className="capitalize">
                          {topic.sentiment.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-semibold text-[#032d42] truncate pr-2">
                        {cleanHeader(topic.header)}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Content */}
                  {!isCompact ? (
                    <div className="p-4 bg-white">
                      <p className="text-sm text-gray-600 mb-4">{topic.context}</p>
                      
                      {topic.subTopics.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#032d42] mb-2">Key Points</h4>
                          <ul className="space-y-2">
                            {topic.subTopics.slice(0, 1).map((subtopic, idx) => (
                              <li key={idx} className="flex items-start text-sm text-gray-700">
                                <span className="text-gray-500 mr-2 flex-shrink-0 mt-0.5">•</span>
                                <span>{cleanSubtopic(subtopic)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-5 flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={() => handleUseTopic(topic)}
                          className="bg-[#1DA1F2] hover:bg-[#1A91DA] text-white rounded-full text-sm px-4"
                        >
                          Use Topic
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white flex flex-col flex-grow">
                      {/* Expanded content for grid view */}
                      <p className="text-sm text-gray-600 mb-3 text-[1.05rem]">{topic.context}</p>
                      
                      {topic.subTopics.length > 0 && (
                        <div className="mb-3 flex-grow">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#032d42] mb-2">Key Points</h4>
                          <ul className="space-y-1.5">
                            {topic.subTopics.slice(0, 1).map((subtopic, idx) => (
                              <li key={idx} className="flex items-start text-sm text-gray-700 text-[1.05rem]">
                                <span className="text-gray-500 mr-1 flex-shrink-0 mt-0.5">•</span>
                                <span>{cleanSubtopic(subtopic)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-auto pt-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseTopic(topic);
                          }}
                          className="bg-[#1DA1F2] hover:bg-[#1A91DA] text-white rounded-full text-sm px-4 w-full"
                        >
                          Use Topic
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {!showTopics && selectedTags.length > 0 && !isLoading && (
          <div className="flex justify-center my-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse delay-150"></div>
              <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        )}
        
        {!showTopics && selectedTags.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-600">
            <p>Select a category above to see trending topics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingTopics;
