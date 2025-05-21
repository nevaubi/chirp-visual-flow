
import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TrendingTopic {
  id: string;
  tag: string;
  title: string;
  sentiment: {
    type: string;
    icon: any;
    color: string;
  };
  context: string;
}

interface Tag {
  id: number;
  name: string;
}

interface TrendingTopicsProps {
  onSelectTopic: (topic: string) => void;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ onSelectTopic }) => {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTopics, setShowTopics] = useState(false);
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

  // Sentiment options with colors
  const sentiments = [
    { type: 'positive', icon: ArrowUp, color: 'text-emerald-500' },
    { type: 'neutral', icon: Minus, color: 'text-amber-500' },
    { type: 'negative', icon: ArrowDown, color: 'text-rose-500' }
  ];

  // Example context sentences
  const contextSentences = [
    "New breakthrough changes everything",
    "Experts weigh in on latest developments",
    "Community buzzing with excitement over release",
    "Controversial opinion sparks heated debate",
    "Unexpected announcement shocks followers",
    "Major update improves user experience",
    "Investors rush to capitalize on trend",
    "Exclusive look at inside information"
  ];

  // Mock trending topics based on selected tags
  useEffect(() => {
    if (selectedTags.length > 0) {
      // Simulate loading trending topics
      const timer = setTimeout(() => {
        const mockTopics: TrendingTopic[] = [];
        selectedTags.forEach(tag => {
          const tagTopics = Array.from({ length: 4 }, (_, i) => {
            const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const randomContext = contextSentences[Math.floor(Math.random() * contextSentences.length)];
            return {
              id: `${tag.id}-${i+1}`,
              tag: tag.name,
              title: `#${tag.name}Trending${i+1}`,
              sentiment: randomSentiment,
              context: randomContext
            };
          });
          mockTopics.push(...tagTopics);
        });
        setTrendingTopics(mockTopics);
        setShowTopics(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setShowTopics(false);
    }
  }, [selectedTags]);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // Only allow 2 tags max
      if (selectedTags.length < 2) {
        setSelectedTags([...selectedTags, tag]);
      } else {
        // Replace the oldest selected tag
        setSelectedTags([selectedTags[1], tag]);
      }
    }
  };

  const handleUseTopic = (topic: TrendingTopic) => {
    onSelectTopic(`${topic.title} - ${topic.context}`);
  };

  return (
    <Card className="shadow-md border-gray-200 w-full transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="text-primary h-5 w-5" />
          <span>Trending Topics</span>
        </CardTitle>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium px-3">
          Select up to two tags
        </Badge>
      </CardHeader>
      
      <CardContent>
        {!showTopics && (
          <div className="mb-4 text-muted-foreground animate-fade-in">
            <p className="text-sm">Select tags to see real-time trending topics</p>
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
        
        {showTopics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {trendingTopics.map(topic => (
              <Card 
                key={topic.id} 
                className="hover-lift overflow-hidden border border-border"
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-normal bg-background">
                        {topic.tag}
                      </Badge>
                      <div className={`flex items-center ${topic.sentiment.color}`}>
                        <topic.sentiment.icon size={14} className="mr-1" />
                        <span className="text-xs font-medium">{topic.sentiment.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-base font-semibold mb-1 text-foreground">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{topic.context}</p>
                  
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => handleUseTopic(topic)}
                      className="rounded-full text-xs h-8"
                    >
                      Use Topic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {!showTopics && selectedTags.length > 0 && (
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
