
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from 'lucide-react';

interface TweetProfile {
  username: string;
  displayName: string;
  verified: boolean;
  timestamp: string;
  avatarUrl: string;
}

interface ExampleTweetCardProps {
  text: string;
  profile: TweetProfile;
  index: number;
}

const ExampleTweetCard: React.FC<ExampleTweetCardProps> = ({ text, profile, index }) => {
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
  
  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 rounded-full flex-shrink-0">
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} className="rounded-full" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(profile.displayName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white truncate mr-0.5">
              {profile.displayName}
            </span>
            {profile.verified && (
              <span className="text-blue-500 flex-shrink-0">
                <Check className="h-4 w-4 bg-blue-500 text-white rounded-full p-0.5" />
              </span>
            )}
            <span className="text-gray-500 dark:text-gray-400 truncate ml-0.5">@{profile.username}</span>
            <span className="text-gray-500 dark:text-gray-400 mx-1">·</span>
            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimestamp(profile.timestamp)}</span>
          </div>
          
          <p className="mt-1 text-gray-900 dark:text-gray-100 break-words leading-normal">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default ExampleTweetCard;
