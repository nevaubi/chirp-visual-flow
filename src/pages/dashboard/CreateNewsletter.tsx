
import { Button } from '@/components/ui/button';
import { BookmarkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateNewsletter = () => {
  const navigate = useNavigate();
  
  const handleCreateClick = () => {
    // This is a placeholder for future functionality
    // Will be implemented in a future step
    console.log('Create newsletter workflow started');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
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
    </div>
  );
};

export default CreateNewsletter;
