
import React from 'react';
import { X } from 'lucide-react';

interface TrendingTopicPillProps {
  header: string;
  onRemove: () => void;
}

const TrendingTopicPill: React.FC<TrendingTopicPillProps> = ({ header, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-twitter-blue/10 text-twitter-blue text-sm font-medium border border-twitter-blue/20">
      <span>Trending: {header}</span>
      <button 
        type="button"
        onClick={onRemove} 
        className="hover:bg-twitter-blue/20 rounded-full p-0.5 transition-colors"
        aria-label="Remove topic"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
};

export default TrendingTopicPill;
