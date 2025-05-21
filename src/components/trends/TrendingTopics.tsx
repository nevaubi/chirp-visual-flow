
import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';

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
    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 w-full transition-all duration-300 ease-in-out">
      <div className="flex items-center mb-2">
        <TrendingUp className="text-blue-600 mr-2" />
        <h2 className="text-gray-900 text-lg font-semibold">Trending Topics</h2>
      </div>
      
      <div className="text-xs text-blue-600 font-medium mb-3 flex items-center">
        <span className="inline-flex items-center bg-blue-50 rounded-full px-2 py-0.5">
          Select up to two tags
        </span>
      </div>
      
      {!showTopics && (
        <div className="mb-4 text-gray-700 animate-fade-in">
          <p className="mb-3">Select tags to see real-time trending topics</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
              selectedTags.find(t => t.id === tag.id)
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      
      {showTopics && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
          {trendingTopics.map(topic => (
            <div 
              key={topic.id} 
              className="p-3 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <p className="text-xs text-gray-600 mr-2">Trending in {topic.tag}</p>
                  <div className={`flex items-center font-medium ${topic.sentiment.color}`}>
                    <topic.sentiment.icon size={14} />
                    <span className="text-xs ml-1">{topic.sentiment.type}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-800 font-medium mb-1">{topic.title}</p>
              <p className="text-xs text-gray-600 mb-3">{topic.context}</p>
              
              <button 
                onClick={() => handleUseTopic(topic)}
                className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-full transition-colors duration-200 flex items-center justify-center shadow-sm"
              >
                Use Topic
              </button>
            </div>
          ))}
        </div>
      )}
      
      {!showTopics && selectedTags.length > 0 && (
        <div className="flex justify-center my-4">
          <div className="animate-pulse flex space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingTopics;
