
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const CheckoutCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Payment Cancelled</h1>
        
        <p className="text-muted-foreground mb-6">
          Your subscription payment was cancelled. You can try again when you're ready.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={() => navigate("/dashboard/home")} 
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            Return to Dashboard
          </Button>
          
          <Button 
            onClick={() => navigate("/dashboard/create-newsletter")} 
            variant="outline" 
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
