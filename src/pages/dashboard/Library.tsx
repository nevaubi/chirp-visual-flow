
import { useEffect, useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { marked } from "marked";
import { toast } from "sonner";

// Define the newsletter structure
interface Newsletter {
  id: string;
  created_at: string;
  markdown_text: string | null;
}

const Library = () => {
  const { authState } = useAuth();
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch newsletters from Supabase
  const { data: newsletters, isLoading, error } = useQuery({
    queryKey: ["newsletters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_storage")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data as Newsletter[];
    },
    enabled: !!authState.user,
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format short date for the card
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Render markdown to HTML
  const renderMarkdown = (markdown: string | null) => {
    if (!markdown) return "<p>No content available</p>";
    
    try {
      return marked.parse(markdown);
    } catch (err) {
      console.error("Error rendering markdown:", err);
      return "<p>Error rendering content</p>";
    }
  };

  // View newsletter in dialog
  const viewNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Newsletter Library</h1>
      </div>
      
      {isLoading ? (
        // Loading state with skeleton cards
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
              <AspectRatio ratio={1}>
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <Skeleton className="h-6 w-20 mb-3" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </AspectRatio>
            </Card>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>Unable to load newsletters: {error.message}</p>
        </div>
      ) : !newsletters || newsletters.length === 0 ? (
        // Empty state
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No newsletters yet</h3>
          <p className="text-gray-500">Generated newsletters will appear here.</p>
        </div>
      ) : (
        // Display newsletters in grid
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {newsletters.map((newsletter) => (
            <Card 
              key={newsletter.id} 
              className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
              onClick={() => viewNewsletter(newsletter)}
            >
              <AspectRatio ratio={1}>
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <span className="text-base font-medium text-primary mb-2">
                    {formatShortDate(newsletter.created_at)}
                  </span>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileText className="h-14 w-14 text-primary" />
                  </div>
                </div>
              </AspectRatio>
            </Card>
          ))}
        </div>
      )}

      {/* Newsletter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedNewsletter && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Newsletter from {formatDate(selectedNewsletter.created_at)}</DialogTitle>
                <DialogDescription>
                  Generated on {new Date(selectedNewsletter.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div 
                className="prose dark:prose-invert max-w-none my-4" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNewsletter.markdown_text) }}
              />
              
              <DialogFooter className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNewsletter.markdown_text || "")
                      .then(() => toast.success("Newsletter content copied to clipboard"))
                      .catch(() => toast.error("Failed to copy to clipboard"));
                  }}
                >
                  Copy Content
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
