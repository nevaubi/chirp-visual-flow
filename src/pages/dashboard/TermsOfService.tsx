
const TermsOfService = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#0087C8]">
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-8 text-center">Last updated: May 15, 2025</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-700">
              By accessing or using Chirpmetrics ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of the terms, you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Account Responsibilities</h2>
            <p className="text-gray-700">
              When you create an account with us, you must provide accurate and complete information. You are responsible 
              for safeguarding the password and for all activities that occur under your account. You agree to notify us 
              immediately of any unauthorized use of your account.
            </p>
            <p className="text-gray-700 mt-3">
              You may not use as a username the name of another person or entity that is not lawfully available for use, 
              or a name or trademark that is subject to any rights of another person or entity without appropriate authorization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Subscription Terms</h2>
            <p className="text-gray-700">
              Some features of the Service require a subscription. By subscribing to our services, you agree to the following:
            </p>
            <ul className="list-disc pl-8 text-gray-700 mt-2 space-y-1">
              <li>Subscription fees are charged in advance on a recurring basis</li>
              <li>Subscriptions automatically renew unless canceled before the renewal date</li>
              <li>You may cancel your subscription at any time through your account settings</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>We may change subscription fees upon notice before your next billing cycle</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-gray-700">
              You agree not to use the Service for any purpose that is illegal or prohibited by these Terms. Prohibited uses include, but are not limited to:
            </p>
            <ul className="list-disc pl-8 text-gray-700 mt-2 space-y-1">
              <li>Using the service to harass, abuse, or harm another person</li>
              <li>Using the service to distribute unsolicited promotional or commercial content</li>
              <li>Attempting to circumvent security measures or access unauthorized areas</li>
              <li>Interfering with or disrupting the Service or servers connected to the Service</li>
              <li>Introducing viruses, trojans, worms, or other malicious code</li>
              <li>Scraping, data-mining, or using automated tools to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Service Limitations and Modifications</h2>
            <p className="text-gray-700">
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, 
              with or without notice. We will not be liable to you or any third party for any modification, suspension, 
              or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Termination</h2>
            <p className="text-gray-700">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason, 
              including without limitation if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by applicable law, in no event shall Chirpmetrics be liable for any indirect, 
              punitive, incidental, special, consequential damages or any damages whatsoever including, without limitation, 
              damages for loss of use, data or profits, arising out of or in any way connected with the use or performance of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, 
              whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a 
              particular purpose, non-infringement or course of performance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by the laws of the country in which the company is established, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, 
              we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material 
              change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms, please contact us at: <a href="mailto:terms@chirpmetrics.com" className="text-[#0087C8] hover:underline">terms@chirpmetrics.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
