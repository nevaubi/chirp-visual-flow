
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Profile } from '@/types/auth';

interface TwitterProfileCardProps {
  profile: Profile;
}

const TwitterProfileCard = ({ profile }: TwitterProfileCardProps) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Cover photo and profile image */}
      <div className="relative">
        <div className="bg-[#0087C8]/80 h-20 w-full"></div>
        <div className="absolute bottom-0 left-4 transform translate-y-1/2">
          <Avatar className="border-4 border-white w-24 h-24">
            <AvatarImage 
              src={profile?.twitter_profilepic_url || ''} 
              alt={profile?.twitter_username || 'Profile'} 
              className="object-cover"
            />
            <AvatarFallback className="text-2xl bg-[#0087C8] text-white">
              {profile?.twitter_username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* Profile information */}
      <div className="pt-16 pb-6 px-4">
        {/* Name and verification */}
        <div className="flex items-center mb-1">
          <h1 className="text-xl font-bold mr-1">{profile?.twitter_username || 'User'}</h1>
          {profile?.is_verified && <CheckCircle size={18} className="text-[#0087C8] fill-[#0087C8]" />}
        </div>
        
        {/* Handle */}
        <p className="text-gray-500 mb-3">@{profile?.twitter_handle || profile?.twitter_username || 'user'}</p>
        
        {/* Bio */}
        <p className="text-gray-800 mb-4">{profile?.bio || 'No bio available'}</p>
        
        {/* Following and Followers */}
        <div className="flex text-sm">
          <div className="mr-4">
            <span className="font-bold text-gray-900">{(profile?.following_count || 0).toLocaleString()}</span>
            <span className="text-gray-500"> Following</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{(profile?.follower_count || 0).toLocaleString()}</span>
            <span className="text-gray-500"> Followers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwitterProfileCard;
