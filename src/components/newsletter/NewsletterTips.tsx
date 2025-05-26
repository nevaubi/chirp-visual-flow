
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookmarkPlus, MessageSquare, Image, Users, FileText, AlertCircle } from "lucide-react";

const NewsletterTips = () => {
  const tips = [
    {
      icon: FileText,
      title: "Use Detailed Tweets",
      description: "Bookmark tweets with specific information, details, and substantial content rather than short opinions.",
      color: "text-blue-500"
    },
    {
      icon: MessageSquare,
      title: "Focus on Main Tweets",
      description: "Prioritize original tweets discussing news, details, and main topics. Replies aren't recommended.",
      color: "text-green-500"
    },
    {
      icon: Users,
      title: "Multiple Tweets Per Topic",
      description: "Use several tweets covering the same topic to provide comprehensive coverage and depth.",
      color: "text-purple-500"
    },
    {
      icon: Image,
      title: "Images Strategy",
      description: "Include tweets with images if you want visuals in your newsletter. No images in bookmarks = no images in newsletter.",
      color: "text-orange-500"
    },
    {
      icon: AlertCircle,
      title: "Current Limitations",
      description: "Videos and links aren't included yet (coming soon). Only tweet text and images are processed.",
      color: "text-amber-500"
    },
    {
      icon: BookmarkPlus,
      title: "More Bookmarks = More Detail",
      description: "Additional bookmarks don't make newsletters longer, they provide more information and details about your topics.",
      color: "text-indigo-500"
    }
  ];

  return (
    <Card className="border-none shadow-sm hover:shadow transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookmarkPlus size={20} className="text-[#0087C8]" />
          Newsletter Generation Tips
        </CardTitle>
        <CardDescription>
          Follow these guidelines to create high-quality newsletters from your bookmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors">
              <div className={`p-2 rounded-full bg-gray-50 ${tip.color}`}>
                <tip.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{tip.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <BookmarkPlus size={18} className="text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Pro Tip</h4>
              <p className="text-blue-700 text-sm mt-1">
                The quality of your newsletter depends on the quality of your bookmarks. Choose tweets that provide value, insights, and detailed information about topics you're interested in.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsletterTips;
