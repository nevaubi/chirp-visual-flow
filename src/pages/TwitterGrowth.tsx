
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TwitterGrowth = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Navbar />
      <main className="flex-1 container-custom py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-twitter-blue">Twitter Growth</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            Supercharge your Twitter growth with our advanced analytics and growth strategies. 
            Track your performance, analyze your audience, and get actionable insights to grow your presence.
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
                  <h3 className="font-semibold text-lg">Engagement Analytics</h3>
                  <p className="text-gray-600">Track likes, retweets, and replies to optimize your content strategy.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-twitter-light p-2 rounded-full mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#0099db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Audience Insights</h3>
                  <p className="text-gray-600">Understand your followers' demographics, interests, and online behavior.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-twitter-light p-2 rounded-full mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#0099db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Growth Recommendations</h3>
                  <p className="text-gray-600">Get personalized suggestions to increase your follower count and engagement.</p>
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

export default TwitterGrowth;
