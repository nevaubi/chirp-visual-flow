
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TweetScreenshotTool from "@/components/tools/TweetScreenshot";

const TweetScreenshot = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-white shadow-sm">
          <TweetScreenshotTool />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TweetScreenshot;
