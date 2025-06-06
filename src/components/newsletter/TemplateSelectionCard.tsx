
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
          ? 'opacity-50 cursor-not-allowed bg-gray-50' 
          : isSelected 
            ? 'border-primary bg-primary/5' 
            : 'hover:border-primary/50'
      }`}
    >
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
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
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
        
        {isLocked && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              Upgrade to unlock
            </Badge>
            {price && (
              <p className="text-xs text-gray-500 mt-1">{price}</p>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
};

export default TemplateSelectionCard;
