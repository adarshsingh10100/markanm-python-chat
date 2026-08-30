import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070A10] text-gray-300 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mt-2">Last updated: August 30, 2026 • MarkanM Chat</p>
        </div>

        {/* Content Panel */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" /> 1. Introduction
            </h2>
            <p className="text-gray-300">
              Welcome to <strong>MarkanM Chat</strong> ("we", "our", or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website at <a href="https://chat.markanm.com" className="text-indigo-400 hover:underline">chat.markanm.com</a> and associated services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" /> 2. Information We Collect
            </h2>
            <div className="space-y-3 text-gray-300">
              <p>We collect information to provide better services to all our users:</p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li><strong>Account Information:</strong> When you register or sign in via Google OAuth, we collect your name, email address, username, profile picture URL, and Google ID (for OAuth authentication).</li>
                <li><strong>Optional Profile Data:</strong> Gender and date of birth provided during profile completion to customize your experience.</li>
                <li><strong>Chat Data & Media:</strong> Messages, group chat memberships, uploaded images, audio messages, and attachments stored securely to enable chat functionality.</li>
                <li><strong>Technical Data:</strong> IP address, user-agent string, operating system, and login timestamp logs used strictly for security, session management, and fraud prevention.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" /> 3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>To operate, maintain, and provide the features of MarkanM Chat.</li>
              <li>To authenticate your identity via secure password verification or Google OAuth.</li>
              <li>To send password reset emails, account verification codes, and security alerts.</li>
              <li>To enable real-time messaging, group chats, AI bot interactions, and notifications.</li>
              <li>To prevent abuse, unauthorized access, and ensure platform safety.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" /> 4. Data Sharing & Third Parties
            </h2>
            <p className="text-gray-300">
              We <strong>never sell or rent your personal data</strong> to third parties or advertisers. We only share information in the following limited circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
              <li><strong>Google OAuth:</strong> To allow Google Sign-In, Google processes authentication requests in accordance with their privacy policy.</li>
              <li><strong>Email Services:</strong> Transactional emails (like password reset) are dispatched securely via SMTP mail services.</li>
              <li><strong>Legal Requirements:</strong> If required by law, subpoena, or court order to comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data Retention & Your Rights</h2>
            <p className="text-gray-300">
              You have the right to access, update, or delete your personal account information at any time through your Profile Settings page or by contacting our support team. Account deletion permanently removes your profile and sessions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions or concerns regarding this Privacy Policy, please contact us at:
            </p>
            <p className="text-indigo-400 font-semibold mt-2">
              Email: <a href="mailto:privacy@markanm.com" className="hover:underline">privacy@markanm.com</a>
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <span>© 2026 MarkanM Chat. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/terms-of-service" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
              <Link to="/login" className="hover:text-gray-300 transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
