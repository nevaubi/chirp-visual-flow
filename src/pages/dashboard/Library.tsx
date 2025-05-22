
import { useEffect, useState } from "react";
import { Book, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

  // Configure marked options to handle HTML
  useEffect(() => {
    marked.setOptions({
      headerIds: false,
      mangle: false,
      breaks: true,
      gfm: true,
      sanitize: false, // Allow HTML to pass through
    });
  }, []);

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

  // Create a cleaner preview of the newsletter content
  const createPreview = (markdown: string | null) => {
    if (!markdown) return "No content available";
    
    try {
      // Create a sanitized version for preview
      let sanitized = markdown
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove markdown formatting
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s?/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/~~[^~]*~~/g, '')
        .replace(/>\s?(.*)/g, '$1')
        .replace(/\n{2,}/g, ' ')
        .replace(/\n/g, ' ')
        .trim();
      
      // Extract the first meaningful content as title
      const firstLine = sanitized.split('.')[0];
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      
      // Get the rest as description (without duplicating the title)
      let description = sanitized.substring(firstLine.length).trim();
      if (description.startsWith('.')) {
        description = description.substring(1).trim();
      }
      
      if (description.length > 100) {
        description = description.substring(0, 100) + '...';
      }
      
      return title + (description ? ` - ${description}` : "");
    } catch (err) {
      console.error("Error creating preview:", err);
      return "Preview not available";
    }
  };

  // Render markdown to HTML with improved handling
  const renderMarkdown = (markdown: string | null) => {
    if (!markdown) return "<p>No content available</p>";
    
    try {
      // Pre-process the markdown to handle potential HTML content
      const processedMarkdown = markdown
        // Ensure proper line breaks for paragraphs
        .replace(/<\/p>\s*<p>/g, '</p>\n\n<p>')
        // Add space after headings
        .replace(/(<\/h[1-6]>)(<h[1-6]>)/g, '$1\n\n$2')
        // Make sure lists render properly 
        .replace(/<\/li>\s*<li>/g, '</li>\n<li>');
      
      return marked.parse(processedMarkdown);
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
        <Book className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Newsletter Library</h1>
      </div>
      
      {isLoading ? (
        // Loading state with skeleton cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter className="bg-muted/50 px-6 py-3">
                <Skeleton className="h-4 w-24" />
              </CardFooter>
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
          <Book className="h-10 w-10 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No newsletters yet</h3>
          <p className="text-gray-500">Generated newsletters will appear here.</p>
        </div>
      ) : (
        // Display newsletters in grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex-grow">
                <div className="text-sm text-muted-foreground mb-2">
                  {formatDate(newsletter.created_at)}
                </div>
                <div className="prose-sm line-clamp-4">
                  <h3 className="font-medium text-base mb-1">
                    {createPreview(newsletter.markdown_text)}
                  </h3>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 px-6 py-3 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Newsletter #{newsletter.id.substring(0, 8)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => viewNewsletter(newsletter)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View Newsletter
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Newsletter Dialog with improved styling */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedNewsletter && (
            <>
              <DialogHeader>
                <DialogTitle>Newsletter from {formatDate(selectedNewsletter.created_at)}</DialogTitle>
                <DialogDescription>
                  Generated on {new Date(selectedNewsletter.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div 
                className="prose dark:prose-invert max-w-none my-6 px-2 newsletter-content" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNewsletter.markdown_text) }}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNewsletter.markdown_text || "")
                      .then(() => toast.success("Newsletter content copied to clipboard"))
                      .catch(() => toast.error("Failed to copy to clipboard"));
                  }}
                >
                  Copy Content
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
