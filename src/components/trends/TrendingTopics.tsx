
import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ExampleTweetCard from './ExampleTweetCard';

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
  exampleTweets: string[];
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
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

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

  // Toggle expanded state for example tweets
  const toggleExampleTweets = (topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
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
        
        // Initialize expanded state for this topic
        setExpandedTopics(prev => ({
          ...prev,
          [topicId]: false
        }));
        
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
      exampleTweets: topic.exampleTweets
    });
  };

  const showTopics = !isLoading && trendingTopics.length > 0;

  return (
    <Card className="shadow-md border-gray-200 w-full transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="text-primary h-5 w-5" />
          <span>Trending Topics</span>
        </CardTitle>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium px-3">
          Select a tag to see trending topics
        </Badge>
      </CardHeader>
      
      <CardContent>
        {!showTopics && !isLoading && !error && (
          <div className="mb-4 text-muted-foreground animate-fade-in">
            <p className="text-sm">Select a tag to see real-time trending topics from Twitter</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-4">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${
                selectedTags.find(t => t.id === tag.id)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted hover:bg-muted/80 text-foreground/80 border border-border'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
        
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading trending topics...</p>
            </div>
          </div>
        )}
        
        {showTopics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {trendingTopics.map(topic => (
              <Collapsible 
                key={topic.id} 
                open={expandedTopics[topic.id]}
                onOpenChange={() => toggleExampleTweets(topic.id)}
                className="hover-lift overflow-hidden border border-border rounded-lg"
              >
                <div className="bg-muted/30">
                  {/* Header section with sentiment badge */}
                  <div className="p-3 border-b border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs font-normal bg-background">
                        {topic.tag}
                      </Badge>
                      <div className={`flex items-center ${topic.sentiment.color} text-xs px-2 py-0.5 rounded-full bg-background/80 border border-border/50`}>
                        <topic.sentiment.icon size={12} className="mr-1" />
                        <span className="font-medium capitalize">{topic.sentiment.type}</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {topic.header !== "Unknown Topic" ? topic.header : 
                        (topic.context.length > 20 ? topic.context.substring(0, 20) + "..." : topic.context)}
                    </h3>
                  </div>
                  
                  {/* Content section */}
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-3 leading-normal">{topic.context}</p>
                    
                    {topic.subTopics.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-foreground/70 mb-1.5 block">Key points:</span>
                        <ul className="space-y-1.5">
                          {topic.subTopics.slice(0, 2).map((subtopic, idx) => (
                            <li key={idx} className="flex text-xs text-muted-foreground">
                              <span className="mr-2 text-primary flex-shrink-0">•</span>
                              <span className="flex-1">{subtopic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs flex items-center gap-1"
                        >
                          {expandedTopics[topic.id] ? (
                            <>
                              <ChevronUp size={14} />
                              <span>Hide Examples</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              <span>Show Examples</span>
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleUseTopic(topic)}
                        className="rounded-full text-xs h-7"
                      >
                        Use Topic
                      </Button>
                    </div>
                  </div>
                </div>
                
                <CollapsibleContent>
                  {topic.exampleTweets.length > 0 ? (
                    <div className="p-3 bg-muted/10 border-t border-border/30">
                      <h4 className="text-xs font-medium text-foreground/70 mb-2">Example Tweets:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {topic.exampleTweets.map((tweet, idx) => (
                          <ExampleTweetCard key={idx} text={tweet} index={idx} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/10 border-t border-border/30 text-center text-xs text-muted-foreground">
                      No example tweets available
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
        
        {!showTopics && selectedTags.length > 0 && isLoading && (
          <div className="flex justify-center my-4">
            <div className="flex space-x-2">
              <div className="w-2.5 h-2.5 bg-primary/70 rounded-full animate-pulse"></div>
              <div className="w-2.5 h-2.5 bg-primary/50 rounded-full animate-pulse delay-150"></div>
              <div className="w-2.5 h-2.5 bg-primary/30 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingTopics;
