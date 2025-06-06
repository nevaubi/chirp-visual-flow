
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface TemplateSelectionCardProps {
  templateId: string;
  name: string;
  description: string;
  isSelected: boolean;
  isLocked: boolean;
  price?: string;
  onClick: () => void;
}

const TemplateSelectionCard = ({
  templateId,
  name,
  description,
  isSelected,
  isLocked,
  price,
  onClick
}: TemplateSelectionCardProps) => {
  return (
    <Card
      onClick={isLocked ? undefined : onClick}
      className={`cursor-pointer transition-all hover:shadow-md border-2 relative ${
        isLocked 
          ? 'opacity-30 cursor-not-allowed bg-gray-100 border-dashed border-gray-300' 
          : isSelected 
            ? 'border-primary bg-primary/5' 
            : 'hover:border-primary/50'
      }`}
    >
      {isLocked && (
        <>
          <div className="absolute inset-0 bg-gray-200/40 rounded-lg z-10"></div>
          <div className="absolute top-3 right-3 z-20">
            <Lock className="w-6 h-6 text-gray-500" />
          </div>
        </>
      )}
      
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {name}
              {templateId === 'template1' && (
                <Badge variant="outline" className="text-xs">
                  Free
                </Badge>
              )}
              {isLocked && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                  Premium
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
        
        {isLocked && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
              🔓 Upgrade to unlock
            </Badge>
            {price && (
              <p className="text-xs text-gray-600 mt-1 font-medium">{price}</p>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
};

export default TemplateSelectionCard;
