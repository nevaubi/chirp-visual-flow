
import React from 'react';
import { X } from 'lucide-react';

interface TrendingTopicPillProps {
  header: string;
  onRemove: () => void;
}

const TrendingTopicPill: React.FC<TrendingTopicPillProps> = ({ header, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
      <span className="font-medium">Trending Topic: {header}</span>
      <button 
        type="button"
        onClick={onRemove} 
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
};

export default TrendingTopicPill;
