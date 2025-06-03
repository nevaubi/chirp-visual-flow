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

    if (!profile?.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      toast.error("No Generations Available", {
        description: "You don't have any remaining newsletter generations. Please upgrade your plan.",
      });
      return;
    }

    if (templateId !== 1) {
      toast.error("Coming Soon", {
        description: `The ${templateName} template is not yet available. Modern Clean is currently the only implemented template.`,
      });
      return;
    }

    setLoadingTemplate(templateName);

    try {
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
      layoutFeatures: [
        "Horizontal content sections",
        "Colored header blocks", 
        "Topic images & icons",
        "Bullet-point highlights",
        "Quote & reference blocks"
      ],
      preview: "bg-gradient-to-br from-blue-50 to-white"
    },
    {
      id: 2,
      name: "Twin Focus",
      description: "A more structured perspective for visually appealing layouts",
      features: ["Dual-column structure", "Visual content blocks", "Clean separation"],
      layoutFeatures: [
        "Balanced side-by-side sections",
        "Alternating content blocks",
        "Organized information flow"
      ],
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

  // Enhanced Modern Clean Card Component
  const ModernCleanCard = ({ template }: { template: typeof templates[0] }) => (
    <div className="bg-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full max-w-[600px] mx-auto">
      {/* Decorative Header */}
      <div className="bg-gray-50 p-5 m-5 rounded-[10px] flex flex-col items-center justify-center">
        <div className="w-[30%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[25%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[35%] h-1.5 bg-gray-300 rounded-full"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">{template.name}</h2>
        <p className="text-gray-500 text-base mb-7">{template.description}</p>
      </div>

      {/* Enhanced Preview */}
      <div className="mx-5 mb-10 p-5 bg-gray-50 rounded-[10px] h-[200px] flex flex-col justify-between">
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[60%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-full"></div>
        </div>
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[60%]"></div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
        </div>
        <div>
          <div className="h-2 bg-gray-300 rounded mb-2.5 w-[80%]"></div>
          <div className="h-2 bg-gray-300 rounded w-[60%]"></div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row mx-5 mb-7">
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-800 mb-2.5">Features:</h3>
          <ul className="list-none p-0 m-0">
            {template.features.map((feature, index) => (
              <li key={index} className="relative pl-6 mb-2.5 text-sm text-gray-600">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-green-500 rounded-full"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 md:pl-5 md:border-l border-gray-200 mt-4 md:mt-0 md:pt-0 pt-4 border-t md:border-t-0">
          <h3 className="text-base font-medium text-gray-800 mb-2.5">Layout Description:</h3>
          <ul className="list-none p-0 m-0">
            {template.layoutFeatures?.map((feature, index) => (
              <li key={index} className="relative pl-6 mb-2.5 text-sm text-gray-600">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-green-500 rounded-full"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2.5 h-[50px] bg-[#0078d7] hover:bg-[#106ebe] text-white rounded-full text-base font-medium"
          onClick={() => handleUseTemplate(template.id, template.name)}
          disabled={loadingTemplate === template.name}
        >
          {loadingTemplate === template.name ? (
            <>
              <span className="mr-2">Generating...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            'Generate Pro Newsletter'
          )}
        </Button>
        <p className="text-center text-gray-400 text-sm italic mx-5 mb-5">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
  );

  // Enhanced Twin Focus Card Component
  const TwinFocusCard = ({ template }: { template: typeof templates[0] }) => (
    <div className="bg-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full max-w-[600px] mx-auto">
      {/* Decorative Header */}
      <div className="bg-gray-50 p-5 m-5 rounded-[10px] flex flex-col items-center justify-center">
        <div className="w-[30%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[25%] h-1.5 bg-gray-300 mb-1 rounded-full"></div>
        <div className="w-[35%] h-1.5 bg-gray-300 rounded-full"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">{template.name}</h2>
        <p className="text-gray-500 text-base mb-7">{template.description}</p>
      </div>

      {/* Enhanced Preview with Twin Focus Layout */}
      <div className="mx-5 mb-10 p-4 bg-gray-50 rounded-[10px] flex flex-col">
        {/* Two-column layout at top */}
        <div className="flex gap-5 mb-5 md:flex-row flex-col">
          {/* Left column with image and bullets */}
          <div className="flex-1 bg-gray-200 rounded-lg p-3 shadow-sm">
            {/* Grey image placeholder */}
            <div className="bg-gray-300 h-20 rounded-md mb-3"></div>
            {/* Three bullet points */}
            <div className="h-2 bg-gray-400 rounded w-[60%] ml-4 mb-2.5"></div>
            <div className="h-2 bg-gray-400 rounded w-[60%] ml-4 mb-2.5"></div>
            <div className="h-2 bg-gray-400 rounded w-[60%] ml-4"></div>
          </div>
          
          {/* Right column with text mockup */}
          <div className="flex-1 bg-gray-200 rounded-lg p-3 shadow-sm">
            <div className="h-2 bg-gray-350 rounded w-[80%] mb-2.5"></div>
            <div className="h-2 bg-gray-350 rounded w-full mb-2.5"></div>
            <div className="h-2 bg-gray-350 rounded w-[60%] mb-2.5"></div>
            <div className="h-2 bg-gray-350 rounded w-[80%] mb-2.5"></div>
            <div className="h-2 bg-gray-350 rounded w-[60%]"></div>
          </div>
        </div>
        
        {/* First horizontal section */}
        <div className="bg-gray-100 p-2.5 rounded-md mb-3">
          <div className="h-2 bg-gray-300 rounded w-[80%] mb-2.5"></div>
          <div className="h-2 bg-gray-300 rounded w-[60%]"></div>
        </div>
        
        {/* Second horizontal section */}
        <div className="p-2.5">
          <div className="h-2 bg-gray-300 rounded w-[80%] mb-2.5"></div>
          <div className="h-2 bg-gray-300 rounded w-full mb-2.5"></div>
          <div className="h-2 bg-gray-300 rounded w-[60%]"></div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row mx-5 mb-7">
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-800 mb-2.5">Features:</h3>
          <ul className="list-none p-0 m-0">
            {template.features.map((feature, index) => (
              <li key={index} className="relative pl-6 mb-2.5 text-sm text-gray-600">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-green-500 rounded-full"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 md:pl-5 md:border-l border-gray-200 mt-4 md:mt-0 md:pt-0 pt-4 border-t md:border-t-0">
          <h3 className="text-base font-medium text-gray-800 mb-2.5">Layout Description:</h3>
          <ul className="list-none p-0 m-0">
            {template.layoutFeatures?.map((feature, index) => (
              <li key={index} className="relative pl-6 mb-2.5 text-sm text-gray-600">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-green-500 rounded-full"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2.5 h-[50px] bg-[#0078d7] hover:bg-[#106ebe] text-white rounded-full text-base font-medium"
          onClick={() => handleUseTemplate(template.id, template.name)}
          disabled={loadingTemplate === template.name}
        >
          {loadingTemplate === template.name ? (
            <>
              <span className="mr-2">Generating...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            'Generate Pro Newsletter'
          )}
        </Button>
        <p className="text-center text-gray-400 text-sm italic mx-5 mb-5">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
          <Crown className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pro Features</h1>
          <p className="text-gray-600">Professional newsletter templates and advanced features</p>
        </div>
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 ml-auto">
          <Crown className="w-3 h-3 mr-1" />
          Premium Templates
        </Badge>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
        {templates.map((template) => (
          template.id === 1 ? (
            <ModernCleanCard key={template.id} template={template} />
          ) : template.id === 2 ? (
            <TwinFocusCard key={template.id} template={template} />
          ) : (
            <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
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
              <CardContent className="flex-1 flex flex-col justify-end">
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
                  <div className="space-y-2">
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
                        'Generate Pro Newsletter'
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 italic text-center">
                      (Defaults to 20 Bookmarks w/enriched context)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </div>
  );
};

export default ProFeatures;
