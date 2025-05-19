import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HandleIdConverter from "@/components/tools/HandleIdConverter";
import TweetScreenshot from "@/components/tools/TweetScreenshot";

const FreeTools = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-center mb-8 text-twitter-blue">Free tools, no sign in required</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">Handle to ID</h2>
            <HandleIdConverter />
          </div>
          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">Tweet to Screenshot</h2>
            <TweetScreenshot />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FreeTools;
