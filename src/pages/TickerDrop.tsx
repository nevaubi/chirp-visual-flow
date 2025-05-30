
import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TickerDropSignup from "@/components/newsletter/TickerDropSignup";

export default function TickerDrop() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FileText className="h-12 w-12 text-[#0087C8]" />
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900">
              The <span className="text-[#0087C8]">Ticker Drop</span>
            </h1>
          </div>
          
          <p className="text-xl lg:text-2xl text-gray-600 mb-4 italic">
            Every Tues & Fri
          </p>
          
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            Twice a week, get the stock insights and market updates that actually matter. Macro trends, expert commentary, biggest headlines - every Tuesday & Friday.
          </p>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <TickerDropSignup />
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
              See what our subscribers receive. Professional market analysis made simple.
            </p>
          </div>
          
          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Newsletter 1 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/picone.png"
                  alt="The Ticker Drop Newsletter Example 1"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>

            {/* Newsletter 2 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/pictwo.png"
                  alt="The Ticker Drop Newsletter Example 2"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>

            {/* Newsletter 3 */}
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-102 bg-white border border-gray-200">
                <img
                  src="/picthree.png"
                  alt="The Ticker Drop Newsletter Example 3"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#0087C8] to-[#006CA1]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Level Up Your Investment Game?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of investors who trust The Ticker Drop for market insights and profitable opportunities.
          </p>
          <Button 
            size="lg"
            className="bg-white text-[#0087C8] hover:bg-gray-100 px-12 py-4 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Subscribe Now - Free
          </Button>
          <p className="text-blue-200 mt-4 text-sm">
            Delivered twice weekly • No spam • Unsubscribe anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
