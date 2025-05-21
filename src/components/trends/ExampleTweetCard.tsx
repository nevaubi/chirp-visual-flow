
import React from 'react';

interface ExampleTweetCardProps {
  text: string;
  index: number;
}

const ExampleTweetCard: React.FC<ExampleTweetCardProps> = ({ text, index }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-2 text-xs text-gray-700 leading-snug shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0"></div>
        <span className="text-gray-500 text-xs">Example {index + 1}</span>
      </div>
      <p className="line-clamp-3">{text}</p>
    </div>
  );
};

export default ExampleTweetCard;
