
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HandleIdConverter from "@/components/tools/HandleIdConverter";

const TweetIdConverter = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-center mb-8 text-twitter-blue">
          Tweet-ID Converter
        </h1>
        <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-white shadow-sm">
          <HandleIdConverter />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TweetIdConverter;
