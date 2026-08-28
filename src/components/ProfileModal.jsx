import React, { useState, useEffect } from 'react';
import { X, Camera, User, AtSign, FileText, Plus, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { decodeHTML } from '../utils/textUtils';

export function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();
  const { addToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(decodeHTML(user.display_name || ''));
      setUsername(user.username || '');
      setBio(decodeHTML(user.bio || ''));
      setSocialLinks(Array.isArray(user.social_links) && user.social_links.length > 0 ? user.social_links : ['']);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size cannot exceed 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await userService.uploadAvatar(formData);
      if (res.avatar_url) {
        updateUserProfile({ avatar_url: res.avatar_url });
        addToast('Avatar updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Banner image size cannot exceed 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('banner', file);

    setUploadingBanner(true);
    try {
      const res = await userService.uploadBanner(formData);
      if (res.banner_url) {
        updateUserProfile({ banner_url: res.banner_url });
        addToast('Cover banner updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload banner', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSocialLinkChange = (index, value) => {
    const updated = [...socialLinks];
    updated[index] = value;
    setSocialLinks(updated);
  };

  const addSocialLinkInput = () => {
    if (socialLinks.length < 5) {
      setSocialLinks([...socialLinks, '']);
    }
  };

  const removeSocialLinkInput = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast('Display name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const validLinks = socialLinks.map(l => l.trim()).filter(l => l.length > 0);
      const res = await userService.updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        social_links: validLinks
      });

      if (res.user) {
        updateUserProfile(res.user);
        addToast('Profile updated successfully!', 'success');
        onClose();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Edit Profile & Cover</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Banner & Avatar Upload Row */}
          <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Profile & Banner Media</span>
              </span>
            </div>

            <div className="flex items-center justify-around gap-4 pt-1">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative group cursor-pointer">
                  <Avatar src={user.avatar_url} name={user.display_name} size="xl" />
                  <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[11px] text-gray-400">Profile Photo</span>
              </div>

              {/* Banner Upload */}
              <div className="flex flex-col items-center gap-1.5">
                <label className="w-24 h-16 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-500 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <span className="text-[10px] text-gray-300 font-semibold mt-1">Upload Cover</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-gray-400">Cover Banner</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Username (@handle)</label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Bio</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
          </div>

          {/* Social Links Inputs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Social Links (GitHub, Twitter/X, LinkedIn, Website, etc.)</span>
              </label>
              {socialLinks.length < 5 && (
                <button
                  type="button"
                  onClick={addSocialLinkInput}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Link</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={link}
                    onChange={(e) => handleSocialLinkChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                  {socialLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocialLinkInput(idx)}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg"
            >
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
