import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FreeTools = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-center mb-8 text-twitter-blue">Free Tools</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="border rounded-lg p-6 bg-white shadow-sm text-center">
            <h2 className="text-xl font-semibold mb-2">Handle to ID</h2>
            <p className="text-gray-600 mb-4">Convert any Twitter @handle to its numeric ID.</p>
            <div className="h-32 flex items-center justify-center bg-gray-50 border rounded-md text-gray-400">
              UI coming soon
            </div>
          </div>
          <div className="border rounded-lg p-6 bg-white shadow-sm text-center">
            <h2 className="text-xl font-semibold mb-2">Tweet to Screenshot</h2>
            <p className="text-gray-600 mb-4">Turn a tweet URL into a shareable screenshot image.</p>
            <div className="h-32 flex items-center justify-center bg-gray-50 border rounded-md text-gray-400">
              UI coming soon
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FreeTools;
