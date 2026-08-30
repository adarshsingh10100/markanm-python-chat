import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, CheckCircle, ArrowLeft } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#070A10] text-gray-300 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Terms of Service</h1>
          <p className="text-xs text-gray-400 mt-2">Effective Date: August 30, 2026 • MarkanM Chat</p>
        </div>

        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-300">
              By accessing or using <strong>MarkanM Chat</strong> (<a href="https://chat.markanm.com" className="text-indigo-400 hover:underline">chat.markanm.com</a>), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Account Registration & Conduct</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>You must be at least 13 years old to create an account on MarkanM Chat.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You agree not to use MarkanM Chat to send spam, harass others, distribute malicious content, or violate any applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Acceptable Use Policy</h2>
            <p className="text-gray-300">
              We reserve the right to suspend or terminate accounts that violate our community guidelines, engage in harassment, or attempt to exploit our infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Intellectual Property</h2>
            <p className="text-gray-300">
              All branding, logos, software design, and source code associated with MarkanM Chat are the exclusive property of MarkanM. You retain ownership of content and media you upload to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Disclaimer of Warranties</h2>
            <p className="text-gray-300">
              MarkanM Chat is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Changes to Terms</h2>
            <p className="text-gray-300">
              We may modify these Terms of Service at any time. Continued use of the service following modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <span>© 2026 MarkanM Chat. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link to="/login" className="hover:text-gray-300 transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
