
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePicture {
  id: string;
  imageUrl?: string;
  fallback: string;
}

interface ReviewsSectionProps {
  profilePictures?: ProfilePicture[];
}

export default function ReviewsSection({ profilePictures }: ReviewsSectionProps) {
  // Default profile pictures with the uploaded images
  const defaultProfiles: ProfilePicture[] = [
    { id: "1", imageUrl: "/profilepic1.png", fallback: "JD" },
    { id: "2", imageUrl: "/profilepic2.png", fallback: "SM" },
    { id: "3", imageUrl: "/profilepic3.png", fallback: "AL" },
    { id: "4", imageUrl: "/profilepic4.png", fallback: "MK" }
  ];

  const profiles = profilePictures || defaultProfiles;

  return (
    <div className="flex items-center gap-4 max-w-sm">
      {/* Profile Pictures - overlapping on the left */}
      <div className="flex -space-x-2">
        {profiles.map((profile, index) => (
          <Avatar 
            key={profile.id} 
            className="w-10 h-10 border-2 border-white shadow-sm"
            style={{ zIndex: profiles.length - index }}
          >
            <AvatarImage src={profile.imageUrl} alt={`Creator ${index + 1}`} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
              {profile.fallback}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Stars and Text - stacked vertically on the right */}
      <div className="flex flex-col gap-1">
        {/* 5 Stars Row */}
        <div className="flex gap-0.5 justify-center">
          {[...Array(5)].map((_, index) => (
            <Star 
              key={index} 
              className="w-5 h-5 fill-yellow-400 text-yellow-400" 
            />
          ))}
        </div>
        
        {/* Text Content - increased by 10% and made bold */}
        <p className="text-base text-gray-600 font-bold text-center">
          5-stars from 100+ creators during pre-launch testing
        </p>
      </div>
    </div>
  );
}
