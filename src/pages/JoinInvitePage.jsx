import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { inviteService } from '../services/inviteService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';

export function JoinInvitePage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { selectConversation, fetchConversations } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    inviteService.getInvitePreview(code)
      .then(res => setPreview(res.preview))
      .catch(err => addToast(err.message || 'Failed to fetch invite preview', 'error'))
      .finally(() => setLoading(false));
  }, [code, addToast]);

  const handleJoin = async () => {
    if (!user) {
      // Redirect non-logged-in user to login with return path
      navigate(`/login?redirect=/join/${code}`);
      return;
    }

    setJoining(true);
    try {
      const res = await inviteService.joinGroup(code);
      addToast(res.message || 'Successfully joined group!', 'success');
      await fetchConversations(true);
      if (res.conversation_id) {
        selectConversation(res.conversation_id);
        navigate('/chat');
      }
    } catch (err) {
      addToast(err.message || 'Failed to join group', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-gray-400">Loading invite preview...</div>;
  }

  if (!preview || !preview.is_valid) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-white">Invalid or Expired Link</h2>
          <p className="text-xs text-gray-400">
            {preview?.invalid_reason || 'This group invite link is no longer active.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold mt-2"
          >
            Go to MarkanM Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        <Avatar src={preview.group_avatar} name={preview.group_name} size="2xl" className="mb-4" />

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Group Invite</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">{preview.group_name}</h1>
        <p className="text-xs text-indigo-400 font-medium mb-3 flex items-center justify-center gap-1">
          <Users className="w-4 h-4" />
          <span>{preview.member_count} members</span>
        </p>

        {preview.group_description && (
          <p className="text-xs text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5 mb-6 leading-relaxed w-full">
            {preview.group_description}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full btn-gradient py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
        >
          <span>{joining ? 'Joining Group...' : user ? 'Join Group' : 'Log in to Join'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
