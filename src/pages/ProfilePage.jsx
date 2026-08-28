import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Calendar, MessageSquare, UserPlus, Check, ShieldCheck, Camera,
  Share2, ExternalLink, Sparkles, Edit3, Link as LinkIcon
} from 'lucide-react';
import { userService } from '../services/userService';
import { connectionService } from '../services/connectionService';
import { chatService } from '../services/chatService';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { decodeHTML } from '../utils/textUtils';
import { getSocialPlatform } from '../utils/socialUtils';

export function ProfilePage() {
  const { username: paramUsername } = useParams();
  const location = useLocation();
  const { user: currentUser, setUser: setCurrentUser } = useAuth();
  const { addToast } = useToast();
  const { selectConversation, fetchConversations } = useChat();
  const navigate = useNavigate();

  const bannerInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Extract username cleanly from route params or pathname (e.g. /@ayush)
  let rawUsername = paramUsername;
  if (!rawUsername) {
    const searchParams = new URLSearchParams(location.search);
    rawUsername = searchParams.get('username');
  }
  if (!rawUsername && location.pathname.includes('/@')) {
    rawUsername = location.pathname.split('/@')[1]?.split('/')[0];
  }

  const targetUsername = rawUsername
    ? rawUsername.replace(/^@/, '').trim()
    : (currentUser?.username || '');

  const loadProfile = () => {
    if (!targetUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    userService.getProfile(targetUsername)
      .then(res => setProfile(res.user))
      .catch(err => addToast(err.message || 'Failed to load user profile', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [targetUsername, location.pathname]);

  const handleSendRequest = async () => {
    if (!profile) return;
    try {
      await connectionService.sendRequest(profile.id);
      addToast('Connection request sent!', 'success');
      setProfile(prev => ({ ...prev, connection_status: 'request_sent' }));
    } catch (err) {
      addToast(err.message || 'Failed to send request', 'error');
    }
  };

  const handleStartDM = async () => {
    if (!profile) return;
    try {
      const res = await chatService.createDirectChat(profile.id);
      await fetchConversations(true);
      if (res.conversation_id) {
        selectConversation(res.conversation_id);
        navigate(`/chat/${res.conversation_id}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to open conversation', 'error');
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('banner', file);

    setUploadingBanner(true);
    try {
      const res = await userService.uploadBanner(formData);
      addToast('Cover banner updated!', 'success');
      setProfile(prev => ({ ...prev, banner_url: res.banner_url }));
      if (profile?.is_self) {
        setCurrentUser(prev => ({ ...prev, banner_url: res.banner_url }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload banner', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await userService.uploadAvatar(formData);
      addToast('Profile picture updated!', 'success');
      setProfile(prev => ({ ...prev, avatar_url: res.avatar_url }));
      if (profile?.is_self) {
        setCurrentUser(prev => ({ ...prev, avatar_url: res.avatar_url }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-red-400 text-sm font-medium">
        User profile not found.
      </div>
    );
  }

  const bioText = decodeHTML(profile.bio || '');
  const displayNameText = decodeHTML(profile.display_name || '');
  const socialLinks = Array.isArray(profile.social_links) ? profile.social_links : [];

  return (
    <div className="flex-1 h-full overflow-y-auto p-3 sm:p-6 bg-[#0B0E14] text-white">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Main Cover Banner Card */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl">
          {/* Cover Banner Header */}
          <div className="h-44 sm:h-56 w-full relative bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 overflow-hidden">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Profile Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/30 via-purple-600/20 to-transparent" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-transparent to-black/30" />

            {/* Banner Change Action Button (for owner) */}
            {profile.is_self && (
              <>
                <input
                  type="file"
                  ref={bannerInputRef}
                  onChange={handleBannerUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingBanner ? 'Uploading...' : 'Change Cover'}</span>
                </button>
              </>
            )}
          </div>

          {/* Profile Details Container */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col items-center sm:items-start text-center sm:text-left">
            {/* Avatar Overhang */}
            <div className="-mt-16 sm:-mt-20 mb-4 relative inline-block">
              <Avatar
                src={profile.avatar_url}
                name={displayNameText}
                size="3xl"
                className="ring-4 ring-[#131822] shadow-2xl"
              />

              {profile.is_self && (
                <>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-1 right-1 p-2 bg-indigo-600 hover:bg-indigo-500 border-2 border-[#131822] text-white rounded-full transition-all shadow-lg"
                    title="Upload Profile Picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Name & Handles */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>{displayNameText}</span>
                  {profile.is_verified && (
                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" title="Verified Account" />
                  )}
                </h1>
                <p className="text-sm font-semibold text-indigo-400 mt-0.5">@{profile.username}</p>
              </div>

              {/* Action Controls */}
              {profile.is_self ? (
                <Link
                  to="/settings"
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Link>
              ) : (
                <div className="flex items-center justify-center sm:justify-end gap-3">
                  {profile.connection_status === 'connected' ? (
                    <button
                      onClick={handleStartDM}
                      className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Send Message</span>
                    </button>
                  ) : profile.connection_status === 'request_sent' ? (
                    <span className="px-4 py-2 bg-amber-950/60 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold">
                      Request Sent
                    </span>
                  ) : (
                    <button
                      onClick={handleSendRequest}
                      className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bio */}
            {bioText && (
              <div className="w-full mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-gray-200 leading-relaxed text-left">
                {bioText}
              </div>
            )}

            {/* Member Join Date */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
            </div>

            {/* Detected Social Links */}
            {socialLinks.length > 0 && (
              <div className="w-full mt-6 pt-5 border-t border-white/10 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 text-left">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Social Links & Connections</span>
                </span>
                <div className="flex flex-wrap gap-2.5 mt-1">
                  {socialLinks.map((linkUrl, idx) => {
                    const item = getSocialPlatform(linkUrl);
                    if (!item) return null;
                    const IconComp = item.icon;

                    return (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3.5 py-2 rounded-xl bg-white/5 border text-xs font-semibold text-gray-300 flex items-center gap-2 transition-all ${item.color}`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span>{item.platform}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
