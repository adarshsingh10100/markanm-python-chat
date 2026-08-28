import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, UserPlus, ShieldOff, ShieldAlert, Sparkles, ExternalLink, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { discoverService } from '../services/discoverService';
import { chatService } from '../services/chatService';
import { connectionService } from '../services/connectionService';
import { userService } from '../services/userService';
import { useToast } from '../context/ToastContext';
import { getSocialPlatform } from '../utils/socialUtils';
import { decodeHTML } from '../utils/textUtils';
import { ReportModal } from './ReportModal';
import { encodeId } from '../utils/hashUtils';

export function ProfilePreviewModal({ isOpen, onClose, userProfile: initialProfile }) {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(initialProfile);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (isOpen && initialProfile) {
      setProfile(initialProfile);
      const targetId = initialProfile.id || initialProfile.user_id;
      const targetUsername = initialProfile.username;

      // Fetch fresh profile data including exact connection status
      if (targetUsername) {
        userService.getProfile(targetUsername)
          .then(res => {
            if (res.user) setProfile(prev => ({ ...prev, ...res.user }));
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialProfile]);

  if (!isOpen || !profile) return null;

  const targetId = profile.id || profile.user_id;

  const handleMessage = async () => {
    setLoadingAction(true);
    try {
      const res = await chatService.createDirectChat(targetId);
      onClose();
      if (res.conversation_id || res.hash_id) {
        const slug = res.hash_id || (profile.username ? `@${profile.username}` : encodeId(res.conversation_id));
        navigate(`/chat/${slug}`);
      }
    } catch (err) {
      addToast(err.message || 'Could not start direct conversation.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConnect = async () => {
    if (profile.connection_status === 'connected') return;
    setLoadingAction(true);
    try {
      await connectionService.sendRequest(targetId);
      addToast('Connection request sent!', 'success');
      setProfile(prev => ({ ...prev, connection_status: 'request_sent' }));
    } catch (err) {
      addToast(err.message || 'Could not send request', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Are you sure you want to block @${profile.username}?`)) return;
    setLoadingAction(true);
    try {
      await discoverService.blockUser(targetId);
      addToast(`Blocked @${profile.username}`, 'info');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to block user', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const isConnected = profile.connection_status === 'connected' || profile.is_connected;
  const isRequestSent = profile.connection_status === 'request_sent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white rounded-lg">
          <X className="w-5 h-5" />
        </button>

        {/* Avatar Header */}
        <div className="mt-2 mb-3">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            presence={profile.presence || 'online'}
          />
        </div>

        <h2 className="text-xl font-extrabold text-white">{decodeHTML(profile.display_name)}</h2>
        <p className="text-xs font-semibold text-indigo-400">@{profile.username}</p>

        {profile.bio && (
          <p className="text-xs text-gray-300 mt-3 px-2 line-clamp-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            "{decodeHTML(profile.bio)}"
          </p>
        )}

        {/* Social Links */}
        {Array.isArray(profile.social_links) && profile.social_links.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {profile.social_links.map((link, idx) => {
              const platform = getSocialPlatform(link);
              if (!platform) return null;
              const Icon = platform.icon;
              return (
                <a
                  key={idx}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white flex items-center gap-1"
                >
                  <Icon className="w-3 h-3" />
                  <span>{platform.platform}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Actions Row */}
        <div className="w-full flex flex-col gap-2 mt-6">
          <button
            onClick={handleMessage}
            disabled={loadingAction}
            className="w-full btn-gradient py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Direct Message</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            {isConnected ? (
              <button
                disabled
                className="py-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-default"
                title="Already Connected"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected</span>
              </button>
            ) : isRequestSent ? (
              <button
                disabled
                className="py-2.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-default"
                title="Request Sent"
              >
                <span>Sent</span>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loadingAction}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                title="Connect"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Connect</span>
              </button>
            )}

            <button
              onClick={handleBlock}
              disabled={loadingAction}
              className="py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              title="Block"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="py-2.5 bg-white/5 hover:bg-amber-500/10 border border-white/10 text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              title="Report"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            navigate(`/@${profile.username}`);
          }}
          className="mt-4 text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>View Full Profile</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetType="user"
          targetId={targetId}
          targetName={profile.display_name}
        />
      </div>
    </div>
  );
}
