
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TickerDropVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [email, setEmail] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const emailParam = searchParams.get('email');
      
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        // TODO: Integrate with Resend API to verify email subscription
        console.log('Email verification request:', {
          token,
          email: emailParam,
          newsletter: 'ticker-drop'
        });

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For now, assume successful verification
        setEmail(emailParam || 'your-email@example.com');
        setStatus('success');
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-white">
      <Navbar />
      
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          {status === 'loading' && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0087C8] mx-auto mb-6"></div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Verifying Your Email</h1>
              <p className="text-lg text-gray-600">Please wait while we verify your subscription...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Email Verified Successfully!</h1>
              <p className="text-lg text-gray-600 mb-6">
                Welcome to The Ticker Drop! Your email <span className="font-semibold text-[#0087C8]">{email}</span> has been verified.
              </p>
              <div className="bg-blue-50 rounded-lg p-6 mb-8">
                <Mail className="h-8 w-8 text-[#0087C8] mx-auto mb-3" />
                <p className="text-gray-700">
                  You'll start receiving our market insights and stock analysis every Tuesday & Friday.
                </p>
              </div>
              <Link to="/ticker-drop">
                <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white px-8 py-3 rounded-full font-semibold">
                  Back to The Ticker Drop
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h1>
              <p className="text-lg text-gray-600 mb-8">
                The verification link is invalid or has already been used. Please try subscribing again.
              </p>
              <Link to="/ticker-drop">
                <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white px-8 py-3 rounded-full font-semibold">
                  Back to The Ticker Drop
                </Button>
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
              <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Verification Link Expired</h1>
              <p className="text-lg text-gray-600 mb-8">
                This verification link has expired. Please subscribe again to receive a new verification email.
              </p>
              <Link to="/ticker-drop">
                <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white px-8 py-3 rounded-full font-semibold">
                  Subscribe Again
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
