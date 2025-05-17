import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const CreateNewsletter = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Newsletter</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Newsletter</CardTitle>
          <CardDescription>Fill out the details below to compose your newsletter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Subject" />
          <Textarea rows={10} placeholder="Write your newsletter..." />
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">Send Preview</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateNewsletter;
