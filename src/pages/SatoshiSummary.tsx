
import React from "react";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChainOfThoughtSignup from "@/components/newsletter/ChainOfThoughtSignup";

export default function SatoshiSummary() {
  const scrollToNewsletter = () => {
    document.getElementById('newsletter-signup')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Bitcoin className="h-12 w-12 text-orange-500" />
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900">
              <span className="text-orange-500">Satoshi</span> Summary
            </h1>
          </div>
          
          <p className="text-xl lg:text-2xl text-gray-600 mb-4 italic">
            Every Tuesday & Friday
          </p>
          
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            Stay ahead of the crypto curve with curated insights, market analysis, and blockchain trends that matter. From Bitcoin to DeFi, we decode the digital asset space for you.
          </p>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section id="newsletter-signup" className="py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <ChainOfThoughtSignup />
        </div>
      </section>

      {/* Newsletter Examples Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Newsletter Examples
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our subscribers receive. Crypto insights made clear and actionable.
            </p>
          </div>
          
          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Newsletter 1 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/crypto1.png"
                  alt="Satoshi Summary Newsletter Example 1"
                  className="w-full h-auto object-cover select-none pointer-events-none"
                  loading="lazy"
                  draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>

            {/* Newsletter 2 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/crypto2.png"
                  alt="Satoshi Summary Newsletter Example 2"
                  className="w-full h-auto object-cover select-none pointer-events-none"
                  loading="lazy"
                  draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>

            {/* Newsletter 3 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/crypto3.png"
                  alt="Satoshi Summary Newsletter Example 3"
                  className="w-full h-auto object-cover select-none pointer-events-none"
                  loading="lazy"
                  draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Master the Crypto Market?
          </h2>
          <Button 
            onClick={scrollToNewsletter}
            size="lg"
            className="bg-white text-orange-500 hover:bg-gray-100 px-12 py-4 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Subscribe Now - Free
          </Button>
          <p className="text-orange-200 mt-4 text-sm">
            Delivered twice weekly • No spam • Unsubscribe anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
