import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { CreateGroupModal } from './components/CreateGroupModal';
import { EmailInviteModal } from './components/EmailInviteModal';
import { OTPModal } from './components/OTPModal';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { HomePage } from './pages/HomePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { ProfileCompletionModal } from './components/ProfileCompletionModal';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { JoinInvitePage } from './pages/JoinInvitePage';
import { SettingsPage } from './pages/SettingsPage';

// Update 2 Pages
import { DiscoverPage } from './pages/DiscoverPage';
import { LiveRoomPage } from './pages/LiveRoomPage';

// Update 3 Pages
import { SavedMessagesPage } from './pages/SavedMessagesPage';

// Update 4 Pages (Developer Platform & OAuth)
import { DeveloperPortalPage } from './pages/DeveloperPortalPage';
import { OAuthAuthorizePage } from './pages/OAuthAuthorizePage';

// Update 5 Pages (Experience Platform & Embeds)
import { ExperienceDirectoryPage } from './pages/ExperienceDirectoryPage';
import {
  WouldYouRatherEmbed,
  QuickQuizEmbed,
  PredictionPollEmbed,
  PartyGameEmbed,
  CompatibilityTestEmbed
} from './pages/embeds/BuiltInEmbedPages';

// Update 6 Pages (Character AI Platform)
import { CharactersPage } from './pages/CharactersPage';
import { CharacterDetailPage } from './pages/CharacterDetailPage';
import { CreateCharacterPage } from './pages/CreateCharacterPage';

// Admin System Components & Pages
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { AdminGuard } from './components/AdminGuard';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminDatabasePage } from './pages/admin/AdminDatabasePage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminBrandingPage } from './pages/admin/AdminBrandingPage';
import { SEOHead } from './components/SEOHead';

function ProtectedLayout() {
  const { user, loading, showProfileCompletion } = useAuth();
  const location = useLocation();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEmailInviteOpen, setIsEmailInviteOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-gray-400 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Initializing MarkanM Chat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Force OTP verification for unverified users even if session exists
  const isUnverified = user && !user.is_verified;

  return (
    <ChatProvider>
      <div className="flex flex-col h-screen w-screen bg-[#0B0E14] overflow-hidden">
        {/* App-Wide Admin Impersonation Banner */}
        <ImpersonationBanner />

        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          {/* Persistent Responsive Sidebar Navigation */}
          <Sidebar />

          {/* Main Workspace Area */}
          <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <DashboardPage
                    onOpenCreateGroup={() => setIsGroupModalOpen(true)}
                    onOpenEmailInvite={() => setIsEmailInviteOpen(true)}
                  />
                }
              />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:conversationId" element={<ChatPage />} />

              {/* Update 2 Discover & Live Room Routes */}
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/room/:code" element={<LiveRoomPage />} />
              <Route path="/r/:code" element={<LiveRoomPage />} />

              {/* Update 3 Saved Messages Route */}
              <Route path="/saved-messages" element={<SavedMessagesPage />} />

              {/* Update 4 Developer Portal Routes */}
              <Route path="/developers" element={<DeveloperPortalPage />} />
              <Route path="/developers/*" element={<DeveloperPortalPage />} />

              {/* Update 5 Experience Platform Routes */}
              <Route path="/experiences" element={<ExperienceDirectoryPage />} />
              <Route path="/experiences/:slug" element={<ExperienceDirectoryPage />} />

              {/* Update 6 Character AI Platform Routes */}
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/characters/create" element={<CreateCharacterPage />} />
              <Route path="/characters/:slug" element={<CharacterDetailPage />} />

              {/* Admin Panel Routes (Protected by AdminGuard) */}
              <Route path="/admin" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
              <Route path="/admin/users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
              <Route path="/admin/users/:id" element={<AdminGuard><AdminUserDetailPage /></AdminGuard>} />
              <Route path="/admin/logs" element={<AdminGuard><AdminLogsPage /></AdminGuard>} />
              <Route path="/admin/database" element={<AdminGuard><AdminDatabasePage /></AdminGuard>} />
              <Route path="/admin/settings" element={<AdminGuard><AdminSettingsPage /></AdminGuard>} />
              <Route path="/admin/branding" element={<AdminGuard><AdminBrandingPage /></AdminGuard>} />

              <Route
                path="/connections"
                element={<ConnectionsPage onOpenEmailInvite={() => setIsEmailInviteOpen(true)} />}
              />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Direct Profile View Variations inside Protected Workspace Layout */}
              <Route path="/@:username" element={<ProfilePage />} />
              <Route path="@:username" element={<ProfilePage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="u/:username" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Catch-all fallback inside main layout */}
              <Route path="*" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>

        <CreateGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
        />

        <EmailInviteModal
          isOpen={isEmailInviteOpen}
          onClose={() => setIsEmailInviteOpen(false)}
        />

        {/* Force Email OTP Verification for unverified logged-in users */}
        {isUnverified && (
          <OTPModal
            isOpen={true}
            email={user.email}
            redirectPath={location.pathname}
          />
        )}

        {/* Profile Completion Modal for Google-login users */}
        <ProfileCompletionModal isOpen={showProfileCompletion} />
      </div>
    </ChatProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SEOHead />
        <Routes>
          {/* Landing/Home Page — public */}
          <Route path="/" element={<HomePage />} />

          {/* Public Auth & Legal Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/join/:code" element={<JoinInvitePage />} />

          {/* Update 4 OAuth Authorization Consent Page */}
          <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />

          {/* Update 5 First-Party Sandboxed Embed Routes */}
          <Route path="/experiences/embed/would-you-rather" element={<WouldYouRatherEmbed />} />
          <Route path="/experiences/embed/quick-quiz" element={<QuickQuizEmbed />} />
          <Route path="/experiences/embed/prediction-poll" element={<PredictionPollEmbed />} />
          <Route path="/experiences/embed/party-game" element={<PartyGameEmbed />} />
          <Route path="/experiences/embed/compatibility-test" element={<CompatibilityTestEmbed />} />

          {/* Protected Main Application Routes */}
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
