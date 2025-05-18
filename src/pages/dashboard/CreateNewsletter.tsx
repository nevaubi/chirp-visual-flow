
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookmarkIcon, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateNewsletter = () => {
  const navigate = useNavigate();
  const [showSelection, setShowSelection] = useState(false);
  
  const handleCreateClick = () => {
    setShowSelection(true);
    console.log('Create newsletter workflow started');
  };

  const handleAudienceSelect = (type: 'personal' | 'audience') => {
    console.log(`Selected newsletter type: ${type}`);
    // Will handle navigation or state update in future implementation
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
      {!showSelection ? (
        // Initial view - Welcome message and CTA
        <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Create Your Next Newsletter
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Craft engaging newsletters that connect with your audience. 
            Simple, powerful, and ready to deliver your message.
          </p>
          
          <Button 
            onClick={handleCreateClick}
            size="lg" 
            className="bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 h-auto text-lg shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookmarkIcon className="mr-2 h-5 w-5" />
            Begin Creating
          </Button>
        </div>
      ) : (
        // Audience selection view
        <div className="w-full max-w-4xl animate-fade-in space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Who's this newsletter for?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the target audience for your newsletter to tailor the creation experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Newsletter Card */}
            <Card 
              onClick={() => handleAudienceSelect('personal')}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02]"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-blue-100 rounded-full p-3 mb-3">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Personal</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-sm md:text-base">
                  A private newsletter for your own use, notes, or personal content.
                </CardDescription>
              </CardContent>
              <CardFooter className="justify-center pt-0">
                <Button variant="ghost" size="sm" className="text-primary">
                  Select Personal
                </Button>
              </CardFooter>
            </Card>
            
            {/* Audience Newsletter Card */}
            <Card
              onClick={() => handleAudienceSelect('audience')}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02]"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-amber-100 rounded-full p-3 mb-3">
                  <Users className="h-8 w-8 text-amber-500" />
                </div>
                <CardTitle>For an audience</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-sm md:text-base">
                  Create newsletters to share with subscribers, followers, or customers.
                </CardDescription>
              </CardContent>
              <CardFooter className="justify-center pt-0">
                <Button variant="ghost" size="sm" className="text-amber-500">
                  Select Audience
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateNewsletter;
