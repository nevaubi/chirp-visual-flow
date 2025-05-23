
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-20 max-w-5xl">
        <div className="bg-white rounded-lg shadow-sm p-8 my-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-[#0087C8]">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-8 text-center">Last updated: May 15, 2025</p>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-gray-700">
                Chirpmetrics ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-gray-700">
                We may collect information about you in various ways, including:
              </p>
              
              <h3 className="text-lg font-medium mt-4 mb-2">2.1 Personal Information</h3>
              <p className="text-gray-700">
                When you register for an account, we may collect your name, email address, and profile 
                information. If you connect your social media accounts, we may collect public profile 
                data and analytics information.
              </p>
              
              <h3 className="text-lg font-medium mt-4 mb-2">2.2 Usage Data</h3>
              <p className="text-gray-700">
                We automatically collect information about how you interact with our service, including 
                your device information, IP address, browser type, pages visited, and time spent on the service.
              </p>
              
              <h3 className="text-lg font-medium mt-4 mb-2">2.3 Payment Information</h3>
              <p className="text-gray-700">
                When you subscribe to our premium services, payment information is processed by our 
                third-party payment processors. We do not store complete credit card information on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-gray-700">
                We may use the information we collect to:
              </p>
              <ul className="list-disc pl-8 text-gray-700 mt-2 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and manage your account</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Personalize your experience and provide tailored content</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700">
                We may share your information with:
              </p>
              <ul className="list-disc pl-8 text-gray-700 mt-2 space-y-1">
                <li>Service providers who perform services on our behalf</li>
                <li>Partners with whom we offer co-branded services or promotions</li>
                <li>Legal authorities when required by law or to protect our rights</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We will not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate security measures to protect your personal information. 
                However, no method of transmission over the Internet or electronic storage is 100% secure. 
                We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Rights and Choices</h2>
              <p className="text-gray-700">
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc pl-8 text-gray-700 mt-2 space-y-1">
                <li>Access, correct, or delete your personal information</li>
                <li>Object to or restrict processing of your personal data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-700 mt-3">
                To exercise these rights, please contact us using the information provided in the "Contact Us" section.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700">
                We use cookies and similar tracking technologies to track activity on our service and 
                hold certain information. You can instruct your browser to refuse all cookies or to 
                indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update our Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:privacy@chirpmetrics.com" className="text-[#0087C8] hover:underline">privacy@chirpmetrics.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
