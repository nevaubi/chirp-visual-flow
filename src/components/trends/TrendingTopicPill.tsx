
import React from 'react';
import { X } from 'lucide-react';

interface TrendingTopicPillProps {
  header: string;
  onRemove: () => void;
}

const TrendingTopicPill: React.FC<TrendingTopicPillProps> = ({ header, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 shadow-sm">
      <span>Trending: {header}</span>
      <button 
        type="button"
        onClick={onRemove} 
        className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
        aria-label="Remove topic"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
};

export default TrendingTopicPill;
