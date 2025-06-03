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

    // Handle different templates
    if (templateId === 1) {
      // Modern Clean template
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
    } else if (templateId === 2) {
      // Twin Focus template
      setLoadingTemplate(templateName);
      
      try {
        const selectedCount = 20;
        console.log(`Using ${templateName} template with ${selectedCount} bookmarks`);

        const { data, error } = await supabase.functions.invoke('template-twin-focus', {
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
    } else {
      // Creative Colorful or other templates - coming soon
      toast.error("Coming Soon", {
        description: `The ${templateName} template is not yet available.`,
      });
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
      preview: "bg-gradient-to-br from-blue-50 to-indigo-100"
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
      preview: "bg-gradient-to-br from-emerald-50 to-teal-100"
    },
    {
      id: 3,
      name: "Creative Colorful",
      description: "Vibrant design perfect for creative and lifestyle newsletters",
      features: ["Bold colors", "Creative layouts", "Image-focused"],
      preview: "bg-gradient-to-br from-purple-50 to-pink-100"
    }
  ];

  // Enhanced Modern Clean Card Component
  const ModernCleanCard = ({ template }: { template: typeof templates[0] }) => (
    <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full border-2 border-blue-200/40 hover:border-blue-400/60 group">
      {/* Decorative Header */}
      <div className="bg-gradient-to-r from-blue-100/80 to-indigo-100/80 p-5 m-5 rounded-[12px] flex flex-col items-center justify-center border border-blue-200/50">
        <div className="w-[30%] h-2 bg-gradient-to-r from-blue-400 to-indigo-400 mb-2 rounded-full shadow-sm"></div>
        <div className="w-[25%] h-2 bg-gradient-to-r from-blue-300 to-indigo-300 mb-2 rounded-full shadow-sm"></div>
        <div className="w-[35%] h-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full shadow-sm"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{template.name}</h2>
        <p className="text-gray-600 text-sm mb-5">{template.description}</p>
      </div>

      {/* Enhanced Preview */}
      <div className="mx-5 mb-6 p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-[12px] flex-1 flex flex-col justify-between border border-blue-200/30">
        <div>
          <div className="h-2.5 bg-gradient-to-r from-blue-300 to-indigo-300 rounded mb-3 w-[80%] shadow-sm"></div>
          <div className="h-2.5 bg-gradient-to-r from-blue-200 to-indigo-200 rounded mb-3 w-[60%] shadow-sm"></div>
          <div className="h-2.5 bg-gradient-to-r from-blue-300 to-indigo-300 rounded mb-3 w-full shadow-sm"></div>
        </div>
        <div>
          <div className="h-2.5 bg-gradient-to-r from-blue-200 to-indigo-200 rounded mb-3 w-[60%] shadow-sm"></div>
          <div className="h-2.5 bg-gradient-to-r from-blue-300 to-indigo-300 rounded mb-3 w-[80%] shadow-sm"></div>
        </div>
        <div>
          <div className="h-2.5 bg-gradient-to-r from-blue-300 to-indigo-300 rounded mb-3 w-[80%] shadow-sm"></div>
          <div className="h-2.5 bg-gradient-to-r from-blue-200 to-indigo-200 rounded w-[60%] shadow-sm"></div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row mx-5 mb-5">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Features:</h3>
          <ul className="list-none p-0 m-0">
            {template.features.map((feature, index) => (
              <li key={index} className="relative pl-5 mb-2 text-xs text-gray-700">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-sm"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 lg:pl-4 lg:border-l border-blue-200/60 mt-3 lg:mt-0 lg:pt-0 pt-3 border-t lg:border-t-0">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Layout Description:</h3>
          <ul className="list-none p-0 m-0">
            {template.layoutFeatures?.map((feature, index) => (
              <li key={index} className="relative pl-5 mb-2 text-xs text-gray-700">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-sm"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2 h-[42px] bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
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
        <p className="text-center text-gray-500 text-xs italic mx-5 mb-4">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
  );

  // Enhanced Twin Focus Card Component
  const TwinFocusCard = ({ template }: { template: typeof templates[0] }) => (
    <div className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full border-2 border-emerald-200/40 hover:border-emerald-400/60 group">
      {/* Decorative Header */}
      <div className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 p-5 m-5 rounded-[12px] flex flex-col items-center justify-center border border-emerald-200/50">
        <div className="w-[30%] h-2 bg-gradient-to-r from-emerald-400 to-teal-400 mb-2 rounded-full shadow-sm"></div>
        <div className="w-[25%] h-2 bg-gradient-to-r from-emerald-300 to-teal-300 mb-2 rounded-full shadow-sm"></div>
        <div className="w-[35%] h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-sm"></div>
      </div>

      {/* Title and Description */}
      <div className="px-5">
        <h2 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-emerald-700 transition-colors">{template.name}</h2>
        <p className="text-gray-600 text-sm mb-5">{template.description}</p>
      </div>

      {/* Enhanced Preview with Twin Focus Layout */}
      <div className="mx-5 mb-6 p-3 bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-[12px] flex flex-col flex-1 border border-emerald-200/30">
        {/* Two-column layout at top */}
        <div className="flex gap-4 mb-4 md:flex-row flex-col">
          {/* Left column with image and bullets */}
          <div className="flex-1 bg-gradient-to-br from-emerald-100/70 to-teal-100/70 rounded-lg p-2.5 shadow-sm border border-emerald-200/40">
            {/* Grey image placeholder */}
            <div className="bg-gradient-to-br from-emerald-200 to-teal-200 h-16 rounded-md mb-2.5 shadow-sm"></div>
            {/* Three bullet points */}
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[60%] ml-3 mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-[60%] ml-3 mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[60%] ml-3 shadow-sm"></div>
          </div>
          
          {/* Right column with text mockup */}
          <div className="flex-1 bg-gradient-to-br from-emerald-100/70 to-teal-100/70 rounded-lg p-2.5 shadow-sm border border-emerald-200/40">
            <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-[80%] mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-full mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-[60%] mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[80%] mb-2 shadow-sm"></div>
            <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-[60%] shadow-sm"></div>
          </div>
        </div>
        
        {/* First horizontal section */}
        <div className="bg-gradient-to-r from-emerald-100/60 to-teal-100/60 p-2 rounded-md mb-2.5 border border-emerald-200/30">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[80%] mb-2 shadow-sm"></div>
          <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-[60%] shadow-sm"></div>
        </div>
        
        {/* Second horizontal section */}
        <div className="p-2">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[80%] mb-2 shadow-sm"></div>
          <div className="h-2 bg-gradient-to-r from-emerald-300 to-teal-300 rounded w-full mb-2 shadow-sm"></div>
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded w-[60%] shadow-sm"></div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row mx-5 mb-5">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Features:</h3>
          <ul className="list-none p-0 m-0">
            {template.features.map((feature, index) => (
              <li key={index} className="relative pl-5 mb-2 text-xs text-gray-700">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-sm"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 lg:pl-4 lg:border-l border-emerald-200/60 mt-3 lg:mt-0 lg:pt-0 pt-3 border-t lg:border-t-0">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Layout Description:</h3>
          <ul className="list-none p-0 m-0">
            {template.layoutFeatures?.map((feature, index) => (
              <li key={index} className="relative pl-5 mb-2 text-xs text-gray-700">
                <div className="absolute left-0 top-1.5 w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-sm"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Button and Text */}
      <div className="mt-auto">
        <Button 
          className="w-[calc(100%-40px)] mx-5 mb-2 h-[42px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
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
        <p className="text-center text-gray-500 text-xs italic mx-5 mb-4">
          (Defaults to 20 Bookmarks w/enriched context)
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] overflow-hidden">
      {/* Enhanced Header */}
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl border-2 border-yellow-200/60 shadow-sm">
          <Crown className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pro Features</h1>
          <p className="text-gray-600">Professional newsletter templates and advanced features</p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-200/60 ml-auto shadow-sm hover:shadow-md transition-shadow">
          <Crown className="w-3 h-3 mr-1" />
          Premium Templates
        </Badge>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-auto">
        {templates.map((template) => (
          template.id === 1 ? (
            <ModernCleanCard key={template.id} template={template} />
          ) : template.id === 2 ? (
            <TwinFocusCard key={template.id} template={template} />
          ) : (
            <Card key={template.id} className="hover:shadow-xl transition-all duration-300 flex flex-col h-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/50 border-2 border-purple-200/40 hover:border-purple-400/60 group">
              <CardHeader className="pb-4">
                <div className={`w-full h-24 rounded-lg ${template.preview} border-2 border-purple-200/50 mb-3 flex items-center justify-center shadow-sm`}>
                  <div className="text-center text-purple-600">
                    <div className="w-12 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded mb-2 mx-auto shadow-sm"></div>
                    <div className="w-8 h-2 bg-gradient-to-r from-purple-300 to-pink-300 rounded mb-2 mx-auto shadow-sm"></div>
                    <div className="w-16 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded mx-auto shadow-sm"></div>
                  </div>
                </div>
                <CardTitle className="text-lg group-hover:text-purple-700 transition-colors font-bold">{template.name}</CardTitle>
                <CardDescription className="text-sm text-gray-600">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end pt-0">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">Features:</h4>
                    <ul className="space-y-1">
                      {template.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full shadow-sm"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 hover:from-purple-600 hover:via-purple-700 hover:to-pink-700 h-10 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] font-semibold"
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
