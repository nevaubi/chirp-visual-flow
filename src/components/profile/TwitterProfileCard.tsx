
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Profile } from '@/types/auth';

interface TwitterProfileCardProps {
  profile: Profile;
}

const TwitterProfileCard = ({ profile }: TwitterProfileCardProps) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 w-full max-w-xl">
      {/* Cover photo and profile image */}
      <div className="relative">
        <div className="bg-[#0087C8]/80 h-14 w-full"></div>
        <div className="absolute bottom-0 left-3 transform translate-y-1/2">
          <Avatar className="border-3 border-white w-12 h-12">
            <AvatarImage 
              src={profile?.twitter_profilepic_url || ''} 
              alt={profile?.twitter_username || 'Profile'} 
              className="object-cover"
            />
            <AvatarFallback className="text-base bg-[#0087C8] text-white">
              {profile?.twitter_username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* Profile information in a more horizontal layout */}
      <div className="pt-8 pb-3 px-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Left column: Name, handle, verification */}
          <div className="min-w-[140px]">
            {/* Name and verification */}
            <div className="flex items-center mb-1">
              <h1 className="text-base font-bold mr-1 break-words">{profile?.twitter_username || 'User'}</h1>
              {profile?.is_verified && (
                <CheckCircle size={14} className="text-[#0087C8] stroke-[#0087C8] fill-white flex-shrink-0" />
              )}
            </div>
            
            {/* Handle */}
            <p className="text-gray-500 text-xs mb-2 break-words">@{profile?.twitter_handle || profile?.twitter_username || 'user'}</p>
            
            {/* Following and Followers */}
            <div className="flex text-xs">
              <div className="mr-3">
                <span className="font-bold text-gray-900">{(profile?.following_count || 0).toLocaleString()}</span>
                <span className="text-gray-500"> Following</span>
              </div>
              <div>
                <span className="font-bold text-gray-900">{(profile?.follower_count || 0).toLocaleString()}</span>
                <span className="text-gray-500"> Followers</span>
              </div>
            </div>
          </div>
          
          {/* Right column: Bio */}
          <div className="flex-1">
            <p className="text-gray-800 text-xs break-words line-clamp-3">{profile?.bio || 'No bio available'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwitterProfileCard;
