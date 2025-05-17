
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AutoNewsletters = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Navbar />
      <main className="flex-1 container-custom py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-twitter-blue">Auto Newsletters</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            Automatically generate and send beautiful newsletters from your Twitter content. Save time and delight your audience with curated content delivered straight to their inbox.
          </p>
          
          <div className="bg-white shadow-lg rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-4">Key Features</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-twitter-light p-2 rounded-full mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#0099db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Automated Curation</h3>
                  <p className="text-gray-600">AI-powered content selection from your top-performing tweets.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-twitter-light p-2 rounded-full mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#0099db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Beautiful Templates</h3>
                  <p className="text-gray-600">Professional newsletter designs that match your brand identity.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-twitter-light p-2 rounded-full mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#0099db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Scheduled Delivery</h3>
                  <p className="text-gray-600">Set it and forget it - newsletters are sent automatically at optimal times.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AutoNewsletters;
