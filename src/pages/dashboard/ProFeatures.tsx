
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ProFeatures = () => {
  const { authState } = useAuth();
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  
  const profile = authState.profile;
  const hasRequiredTier = profile?.subscription_tier === "Newsletter Standard" || 
                          profile?.subscription_tier === "Newsletter Premium";

  const handleUseTemplate = async (templateId: number, templateName: string) => {
    // Check if user has required subscription tier
    if (!hasRequiredTier) {
      toast.error("Subscription Required", {
        description: "Please upgrade to Newsletter Standard or Premium to use templates.",
      });
      return;
    }

    // Check if user has remaining generations
    if (!profile?.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      toast.error("No Generations Available", {
        description: "You don't have any remaining newsletter generations. Please upgrade your plan.",
      });
      return;
    }

    // For now, only Modern Clean (id: 1) is implemented
    if (templateId !== 1) {
      toast.error("Coming Soon", {
        description: `The ${templateName} template is not yet available. Modern Clean is currently the only implemented template.`,
      });
      return;
    }

    setLoadingTemplate(templateName);

    try {
      // For Modern Clean template, use default of 20 bookmarks
      const selectedCount = 20;

      console.log(`Using ${templateName} template with ${selectedCount} bookmarks`);

      const { data, error } = await supabase.functions.invoke('template-modern-clean', {
        body: { selectedCount },
      });

      if (error) {
        console.error(`Error generating ${templateName} newsletter:`, error);
        toast.error(`Failed to generate ${templateName} newsletter`, {
          description: error.message || 'Please try again later',
        });
        return;
      }

      if (data.error) {
        console.error(`Function returned error:`, data.error);
        toast.error(`Failed to generate ${templateName} newsletter`, {
          description: data.error,
        });
        return;
      }

      toast.success(`${templateName} Newsletter Generated!`, {
        description: `Your ${templateName.toLowerCase()} newsletter is being processed and will be available in your Library and email soon.`,
      });

    } catch (error) {
      console.error(`Error in handleUseTemplate for ${templateName}:`, error);
      toast.error(`Failed to generate ${templateName} newsletter`, {
        description: 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      setLoadingTemplate(null);
    }
  };

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
                <Button 
                  className="w-full bg-[#0087C8] hover:bg-[#006CA1]"
                  onClick={() => handleUseTemplate(template.id, template.name)}
                  disabled={loadingTemplate === template.name}
                >
                  {loadingTemplate === template.name ? (
                    <>
                      <span className="mr-2">Generating...</span>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </>
                  ) : (
                    'Use Template'
                  )}
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
