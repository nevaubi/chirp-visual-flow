
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookmarkPlus, MessageSquare, Image, Users, FileText, AlertCircle } from "lucide-react";

const NewsletterTips = () => {
  const tips = [
    {
      icon: FileText,
      title: "Choose Detailed Tweets",
      description: "Bookmark tweets with specific information and substantial content rather than short opinions.",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200"
    },
    {
      icon: MessageSquare,
      title: "Main Tweets Only",
      description: "Focus on original tweets discussing news and topics. Avoid replies - they don't work well.",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      icon: Users,
      title: "Multiple Tweets Per Topic",
      description: "Use several tweets covering the same subject for comprehensive coverage and depth.",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      icon: Image,
      title: "Images Strategy",
      description: "Include tweets with images if you want visuals. No images in bookmarks = no images in newsletter.",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200"
    },
    {
      icon: AlertCircle,
      title: "Videos & Links Coming Soon",
      description: "Currently, only tweet text and images are processed. Video and link support coming soon.",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200"
    },
    {
      icon: BookmarkPlus,
      title: "More Bookmarks = More Detail",
      description: "Additional bookmarks provide more information about topics, not longer newsletters.",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-200"
    }
  ];

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-[#0087C8]/10">
            <BookmarkPlus size={24} className="text-[#0087C8]" />
          </div>
          Newsletter Generation Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tips.map((tip, index) => (
            <div 
              key={index} 
              className={`p-5 rounded-xl border-2 ${tip.bgColor} ${tip.borderColor} hover:shadow-md transition-all duration-200 hover:-translate-y-1`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white shadow-sm ${tip.iconColor} flex-shrink-0`}>
                  <tip.icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsletterTips;
