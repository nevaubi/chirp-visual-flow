
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

const ProFeatures = () => {
  const templates = [
    {
      id: 1,
      name: "Modern Clean",
      description: "A minimalist design perfect for tech and startup newsletters",
      features: ["Clean typography", "Minimal layout", "Mobile optimized"],
      preview: "bg-gradient-to-br from-blue-50 to-white"
    },
    {
      id: 2,
      name: "Professional Business",
      description: "Corporate-style layout ideal for business and finance content",
      features: ["Professional styling", "Data-friendly", "Chart integration"],
      preview: "bg-gradient-to-br from-gray-50 to-blue-50"
    },
    {
      id: 3,
      name: "Creative Colorful",
      description: "Vibrant design perfect for creative and lifestyle newsletters",
      features: ["Bold colors", "Creative layouts", "Image-focused"],
      preview: "bg-gradient-to-br from-purple-50 to-pink-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
          <Crown className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pro Features</h1>
          <p className="text-gray-600">Professional newsletter templates and advanced features</p>
        </div>
      </div>

      {/* Pro Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Crown className="w-3 h-3 mr-1" />
          Premium Templates
        </Badge>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className={`w-full h-32 rounded-lg ${template.preview} border border-gray-200 mb-4 flex items-center justify-center`}>
                <div className="text-center text-gray-500">
                  <div className="w-16 h-2 bg-gray-300 rounded mb-2 mx-auto"></div>
                  <div className="w-12 h-2 bg-gray-300 rounded mb-2 mx-auto"></div>
                  <div className="w-20 h-2 bg-gray-300 rounded mx-auto"></div>
                </div>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Features:</h4>
                  <ul className="space-y-1">
                    {template.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full bg-[#0087C8] hover:bg-[#006CA1]">
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Section */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">More Pro Features Coming Soon</h2>
        <p className="text-gray-600 mb-4">We're working on additional premium features to enhance your newsletter experience:</p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            Advanced analytics and insights
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            Custom branding options
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            A/B testing for newsletters
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            Priority customer support
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProFeatures;
