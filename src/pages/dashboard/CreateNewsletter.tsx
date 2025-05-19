
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookmarkIcon, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNavigate } from 'react-router-dom';

const CreateNewsletter = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = intro, 1 = audience, 2 = frequency, 3 = content, 4 = style
  const [selectedAudience, setSelectedAudience] = useState<
    'personal' | 'audience' | null
  >(null);
  const [selectedFrequency, setSelectedFrequency] = useState<
    'biweekly' | 'weekly' | null
  >(null);
  const [contentApproach, setContentApproach] = useState<
    'everything' | 'topics' | null
  >(null);
  const [topics, setTopics] = useState('');
  const [writingStyle, setWritingStyle] = useState<
    'first' | 'third' | 'emulate' | null
  >(null);
  const [styleExample, setStyleExample] = useState('');
  
  const handleCreateClick = () => {
    setStep(1);
    console.log('Create newsletter workflow started');
  };

  const handleAudienceSelect = (type: 'personal' | 'audience') => {
    setSelectedAudience(type);
    console.log(`Selected newsletter type: ${type}`);
  };

  const handleFrequencySelect = (freq: 'biweekly' | 'weekly') => {
    setSelectedFrequency(freq);
    console.log(`Selected frequency: ${freq}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
      {step === 0 ? (
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
      ) : step === 1 ? (
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
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                selectedAudience === 'personal' ? 'border-primary' : ''
              }`}
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
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                selectedAudience === 'audience' ? 'border-amber-500' : ''
              }`}
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

          {selectedAudience && (
            <div className="text-center mt-6">
              <Button
                onClick={() => setStep(2)}
                className="bg-amber-500 text-white px-8 py-4 hover:bg-amber-600"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      ) : step === 2 ? (
        // Frequency selection view
        <div className="w-full max-w-4xl space-y-8 animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              How often do you want your newsletter?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Biweekly */}
            <Card
              onClick={() => handleFrequencySelect('biweekly')}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                selectedFrequency === 'biweekly' ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle>Biweekly</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <CardDescription>up to 30 tweets</CardDescription>
                <div className="font-semibold">$19 / month</div>
              </CardContent>
            </Card>
            {/* Weekly */}
            <Card
              onClick={() => handleFrequencySelect('weekly')}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                selectedFrequency === 'weekly' ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle>Weekly</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <CardDescription>up to 50 tweets</CardDescription>
                <div className="font-semibold">$10 / month</div>
              </CardContent>
            </Card>
          </div>

          {selectedFrequency && (
            <div className="text-center mt-6">
              <Button
                onClick={() => setStep(3)}
                className="bg-amber-500 text-white px-8 py-4 hover:bg-amber-600"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      ) : step === 3 ? (
        // Content approach view
        <div className="w-full max-w-2xl space-y-8 animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Content approach:</h2>
          </div>

          <RadioGroup
            value={contentApproach ?? ''}
            onValueChange={(v) => setContentApproach(v as 'everything' | 'topics')}
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="everything" id="everything" />
              <div>
                <label htmlFor="everything" className="font-medium">
                  Everything from my bookmarks
                </label>
                <p className="text-sm text-muted-foreground">
                  Use every bookmarked tweet since my last newsletter
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="topics" id="topics" />
                <div>
                  <label htmlFor="topics" className="font-medium">
                    General topics only
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Stick with only these general topics (type your desired main topics and we'll do the rest!)
                  </p>
                </div>
              </div>
              {contentApproach === 'topics' && (
                <Input
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Type topics here..."
                  className="ml-7"
                />
              )}
            </div>
          </RadioGroup>

          {(contentApproach === 'everything' || (contentApproach === 'topics' && topics.trim().length > 0)) && (
            <div className="text-center mt-6">
              <Button
                onClick={() => setStep(4)}
                className="bg-amber-500 text-white px-8 py-4 hover:bg-amber-600"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      ) : step === 4 ? (
        // Writing style selection view
        <div className="w-full max-w-4xl space-y-8 animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Choose your writing style</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First Person */}
            <Card
              onClick={() => setWritingStyle('first')}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                writingStyle === 'first' ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle>First Person</CardTitle>
              </CardHeader>
            </Card>

            {/* Third Person */}
            <Card
              onClick={() => setWritingStyle('third')}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                writingStyle === 'third' ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle>Third Person</CardTitle>
              </CardHeader>
            </Card>

            {/* Emulate style */}
            <Card
              onClick={() => setWritingStyle('emulate')}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                writingStyle === 'emulate' ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle>Emulate a writing style</CardTitle>
              </CardHeader>
              {writingStyle === 'emulate' && (
                <CardContent className="space-y-2">
                  <Textarea
                    value={styleExample}
                    onChange={(e) => setStyleExample(e.target.value)}
                    placeholder="Paste text examples of your desired writing style for your newsletters, the more text the better the output! (1000 text character max)"
                    maxLength={1000}
                  />
                </CardContent>
              )}
            </Card>
          </div>

          {(writingStyle === 'first' || writingStyle === 'third' || (writingStyle === 'emulate' && styleExample.trim().length > 0)) && (
            <div className="text-center mt-6">
              <Button
                onClick={() => setStep(5)}
                className="bg-amber-500 text-white px-8 py-4 hover:bg-amber-600"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      ) : step === 5 ? (
        <div className="text-center">Next step coming soon...</div>
      ) : null}
    </div>
  );
};

export default CreateNewsletter;
