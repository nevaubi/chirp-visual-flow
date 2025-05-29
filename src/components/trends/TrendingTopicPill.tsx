
import React from 'react';
import { X } from 'lucide-react';

interface TrendingTopicPillProps {
  header: string;
  onRemove: () => void;
}

const TrendingTopicPill: React.FC<TrendingTopicPillProps> = ({ header, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium border border-blue-200 shadow-sm">
      <span>Trending: {header}</span>
      <button 
        type="button"
        onClick={onRemove} 
        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
        aria-label="Remove topic"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
};

export default TrendingTopicPill;
