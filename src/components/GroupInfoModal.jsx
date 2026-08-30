import React, { useRef, useState } from 'react';
import { X, Users, ShieldCheck, LogOut, UserMinus, Camera, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chatService } from '../services/chatService';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';

export function GroupInfoModal({ isOpen, onClose, conversation }) {
  const { user } = useAuth();
  const { selectConversation, fetchConversations } = useChat();
  const { addToast } = useToast();

  const iconInputRef = useRef(null);
  const [updatingIcon, setUpdatingIcon] = useState(false);

  if (!isOpen || !conversation) return null;

  const isGroup = conversation.type === 'group';
  const myRole = conversation.my_role || 'member';
  const isOwnerOrAdmin = ['owner', 'admin'].includes(myRole);

  const handleGroupIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdatingIcon(true);
    addToast('Uploading group icon...', 'info');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const uploaded = await chatService.uploadAttachment(conversation.id, formData);
      if (uploaded && uploaded.url) {
        await chatService.updateGroup(conversation.id, {
          name: conversation.name,
          description: conversation.description,
          icon_url: uploaded.url
        });
        addToast('Group icon updated!', 'success');
        fetchConversations(true);
      }
    } catch (err) {
      addToast(err.message || 'Failed to update group icon', 'error');
    } finally {
      setUpdatingIcon(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await chatService.leaveGroup(conversation.id);
      addToast('You left the group.', 'info');
      await fetchConversations(true);
      selectConversation(null);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to leave group', 'error');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    try {
      await chatService.removeMember(conversation.id, targetUserId);
      addToast('Member removed from group', 'success');
      fetchConversations(true);
    } catch (err) {
      addToast(err.message || 'Failed to remove member', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-base font-bold text-white">Conversation Info</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="relative group/avatar cursor-pointer" onClick={() => isOwnerOrAdmin && iconInputRef.current?.click()}>
            <Avatar src={conversation.icon_url || conversation.avatar_url} name={conversation.name} size="xl" />
            {isOwnerOrAdmin && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
            <input
              type="file"
              ref={iconInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleGroupIconUpload}
            />
          </div>

          <div className="text-center">
            <h4 className="text-lg font-bold text-white">{conversation.name}</h4>
            {conversation.description && (
              <p className="text-xs text-gray-400 mt-1 max-w-xs">{conversation.description}</p>
            )}
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-lg text-[11px] font-bold transition-all border border-white/10"
              >
                {updatingIcon ? 'Uploading...' : '📷 Change Group Icon'}
              </button>
            )}
          </div>
        </div>

        {/* Group Members List */}
        {isGroup && (
          <div className="mt-6">
            <h5 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Group Members ({conversation.members?.length || 0})
            </h5>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/5 bg-white/5 border border-white/10 rounded-2xl p-2">
              {conversation.members?.map(m => (
                <div key={m.user_id} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatar_url} name={m.display_name} size="sm" presence={m.presence} />
                    <div>
                      <p className="text-xs font-semibold text-white flex items-center gap-1">
                        <span>{m.display_name}</span>
                        {m.role === 'owner' && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
                      </p>
                      <p className="text-[10px] text-gray-400">@{m.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>

                    {isOwnerOrAdmin && m.user_id !== user.id && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                        title="Remove member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Group Action */}
        {isGroup && (
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={handleLeaveGroup}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
