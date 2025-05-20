
import { useState, useEffect } from "react";
import { getUserNewsletters, NewsletterData } from "@/integrations/upstash/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';

const Library = () => {
  const { authState } = useAuth();
  const [newsletters, setNewsletters] = useState<NewsletterData[]>([]);
  const [filteredNewsletters, setFilteredNewsletters] = useState<NewsletterData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedNewsletter, setSelectedNewsletter] = useState<NewsletterData | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    const fetchNewsletters = async () => {
      if (authState.user?.id) {
        setLoading(true);
        try {
          const data = await getUserNewsletters(authState.user.id);
          setNewsletters(data);
          setFilteredNewsletters(data);
        } catch (error) {
          console.error("Error fetching newsletters:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchNewsletters();
  }, [authState.user?.id]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredNewsletters(newsletters);
    } else {
      const filtered = newsletters.filter(newsletter => 
        newsletter.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNewsletters(filtered);
    }
  }, [searchTerm, newsletters]);

  const handleViewNewsletter = (newsletter: NewsletterData) => {
    setSelectedNewsletter(newsletter);
    setViewOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Newsletter Library</h1>
          <div className="w-64 relative">
            <Skeleton className="h-10 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && filteredNewsletters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Newsletter Library</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search newsletters..."
              className="pl-9 pr-4 py-2 rounded-full bg-gray-100 border-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Card className="w-full flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No newsletters yet</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            {searchTerm ? 
              "No newsletters match your search query. Try a different search term." : 
              "Start generating newsletters to build your library."}
          </p>
          {!searchTerm && (
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white" 
              onClick={() => setSearchTerm("")}
            >
              Generate Your First Newsletter
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Newsletter Library</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search newsletters..."
            className="pl-9 pr-4 py-2 rounded-full bg-gray-100 border-none w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNewsletters.map((newsletter) => (
          <Card key={newsletter.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">Newsletter</CardTitle>
              <CardDescription>{formatDate(newsletter.createdAt)}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="line-clamp-4 text-sm text-gray-600">
                {newsletter.content.substring(0, 200)}...
              </div>
            </CardContent>
            <CardFooter className="p-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => handleViewNewsletter(newsletter)}
              >
                View Newsletter
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Newsletter Viewer Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Newsletter - {selectedNewsletter && formatDate(selectedNewsletter.createdAt)}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none mt-4">
            {selectedNewsletter && (
              <ReactMarkdown>{selectedNewsletter.content}</ReactMarkdown>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
