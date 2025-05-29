
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, MessageSquare, Repeat, Heart } from 'lucide-react';

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

interface ExampleTweetCardProps {
  text: string;
  profile: TweetProfile;
  metrics?: TweetMetrics;
  index: number;
}

const ExampleTweetCard: React.FC<ExampleTweetCardProps> = ({ text, profile, metrics, index }) => {
  // Format the timestamp to display in a Twitter-like format
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m`;
      } else if (diffHours < 24) {
        return `${diffHours}h`;
      } else {
        // Format as "Month Day" (e.g., "May 21")
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return "recent";
    }
  };
  
  // Format numbers for display (e.g., 1200 -> 1.2K)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  };
  
  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Truncate tweet text after 250 characters
  const truncateText = (text: string, maxLength: number = 250): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-4 hover:bg-blue-50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 rounded-full flex-shrink-0 border border-blue-200">
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} className="rounded-full" />
          <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
            {getInitials(profile.displayName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-bold text-gray-900">
              {profile.displayName}
            </span>
            {profile.verified && (
              <span className="text-blue-500 flex-shrink-0 ml-0.5">
                <Check className="h-4 w-4 bg-blue-500 text-white rounded-full p-0.5" />
              </span>
            )}
            <span className="text-gray-500 ml-1">@{profile.username}</span>
            <span className="text-gray-500 mx-1">·</span>
            <span className="text-gray-500">{formatTimestamp(profile.timestamp)}</span>
          </div>
          
          <p className="mt-2 text-gray-900 break-words leading-normal text-[15px] text-[1.05rem]">
            {truncateText(text)}
          </p>
          
          {metrics && (
            <div className="flex items-center gap-4 mt-3 text-gray-500 text-sm">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{formatNumber(metrics.replies)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-4 w-4" />
                <span>{formatNumber(metrics.retweets)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{formatNumber(metrics.likes)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExampleTweetCard;
