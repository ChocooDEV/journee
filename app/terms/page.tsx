'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function TermsPage() {
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F3E9] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-black hover:underline mb-8"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-black mb-6">General Conditions</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-sm max-w-none text-gray-800 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-black mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Journee (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">2. Use of Service</h2>
              <p>
                You agree to use the Service only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the Service. You are responsible for maintaining the confidentiality of your account and password.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">3. User Content and Media</h2>
              <p>
                You are solely responsible for all content, including photos, videos, and other media (collectively, "User Content") that you upload, post, or otherwise transmit through the Service. You retain all ownership rights in your User Content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">4. Data Loss and Backup</h2>
              <p>
                <strong>We are not responsible for any loss of media, data, or User Content.</strong> While we make reasonable efforts to ensure the availability and security of the Service, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Technical failures, system errors, or interruptions may occur</li>
                <li>Data loss may occur due to various factors beyond our control</li>
                <li>You are responsible for maintaining your own backups of your User Content</li>
                <li>We do not guarantee the permanent storage or availability of your User Content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">5. Service Availability and Issues</h2>
              <p>
                <strong>We are not liable for any issues, interruptions, or problems with the Service.</strong> The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>Defects will be corrected</li>
                <li>The Service or servers are free of viruses or other harmful components</li>
                <li>The results obtained from using the Service will be accurate or reliable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">6. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, <strong>we shall not be liable for any indirect, incidental, special, consequential, or punitive damages</strong>, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Your use or inability to use the Service</li>
                <li>Any loss of media, data, or User Content</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                <li>Any bugs, viruses, trojan horses, or the like that may be transmitted to or through the Service</li>
                <li>Any errors or omissions in any content or for any loss or damage incurred as a result of the use of any content posted, emailed, transmitted, or otherwise made available through the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">7. User Responsibility</h2>
              <p>
                You acknowledge that you are using the Service at your own risk. You are responsible for:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Backing up your User Content</li>
                <li>Ensuring the security of your account credentials</li>
                <li>Complying with all applicable laws and regulations</li>
                <li>Respecting the intellectual property rights of others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">8. Modifications to Service</h2>
              <p>
                We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these General Conditions at any time. Your continued use of the Service after any such changes constitutes your acceptance of the new General Conditions. It is your responsibility to review these terms periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black mb-3">10. Contact Information</h2>
              <p>
                If you have any questions about these General Conditions, please contact us through our GitHub repository <a href="https://github.com/journee-app/journee" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">here</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

