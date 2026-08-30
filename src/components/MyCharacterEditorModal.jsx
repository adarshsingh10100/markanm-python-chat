import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image as ImageIcon, Upload, Globe, Lock, Link as LinkIcon, Copy, Trash2, BookOpen, User, MessageSquare, Check, RefreshCw } from 'lucide-react';
import { characterService } from '../services/characterService';
import { userService } from '../services/userService';
import { useToast } from '../context/ToastContext';

export function MyCharacterEditorModal({ character, isOpen, onClose, onSave }) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [animeName, setAnimeName] = useState('');
  const [category, setCategory] = useState('Anime');
  const [greeting, setGreeting] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Persona state
  const [description, setDescription] = useState('');
  const [personalitySummary, setPersonalitySummary] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');

  // Visibility state
  const [visibility, setVisibility] = useState('public');

  // Retraining & Knowledge Base state
  const [retrainFact, setRetrainFact] = useState('');
  const [addingLore, setAddingLore] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Image Uploading
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (character) {
      setDisplayName(character.display_name || '');
      setAnimeName(character.anime_name || '');
      setCategory(character.category || 'Anime');
      setGreeting(character.greeting || '');
      setAvatarUrl(character.avatar_url || '');
      setBannerUrl(character.banner_url || '');
      setDescription(character.description || '');
      setPersonalitySummary(character.personality_summary || '');
      setVisibility(character.visibility || 'public');

      const persona = character.persona || {};
      setSpeakingStyle(persona.speaking_style || '');
      setLikes(Array.isArray(persona.likes) ? persona.likes.join(', ') : (persona.likes || ''));
      setDislikes(Array.isArray(persona.dislikes) ? persona.dislikes.join(', ') : (persona.dislikes || ''));

      loadMemories(character.id);
    }
  }, [character]);

  const loadMemories = async (charId) => {
    if (!charId) return;
    setLoadingMemories(true);
    try {
      const res = await characterService.getMemories(charId);
      if (res.memories) {
        setMemories(res.memories || []);
      }
    } catch (e) {
    } finally {
      setLoadingMemories(false);
    }
  };

  if (!isOpen || !character) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await userService.uploadAvatar(formData);
      if (res.avatar_url) {
        setAvatarUrl(res.avatar_url);
        addToast('Avatar uploaded successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Avatar upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('banner', file);
      const res = await userService.uploadBanner(formData);
      if (res.banner_url) {
        setBannerUrl(res.banner_url);
        addToast('Banner uploaded successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Banner upload failed', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        display_name: displayName,
        anime_name: animeName,
        category,
        greeting,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        description,
        personality_summary: personalitySummary,
        speaking_style: speakingStyle,
        likes: likes ? likes.split(',').map(s => s.trim()).filter(Boolean) : [],
        dislikes: dislikes ? dislikes.split(',').map(s => s.trim()).filter(Boolean) : [],
        visibility
      };

      const res = await characterService.updateCharacter(character.id, payload);
      addToast('Character updated successfully!', 'success');
      if (onSave) onSave(res.character || payload);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update character', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRetrainingLore = async (e) => {
    e.preventDefault();
    if (!retrainFact.trim()) return;
    setAddingLore(true);
    try {
      const res = await characterService.retrainCharacter(character.id, { fact: retrainFact.trim() });
      addToast('Character retrained with new knowledge!', 'success');
      setRetrainFact('');
      loadMemories(character.id);
    } catch (err) {
      addToast(err.message || 'Failed to add knowledge base fact', 'error');
    } finally {
      setAddingLore(false);
    }
  };

  const shareLink = `${window.location.origin}/character/${character.slug || character.id}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    addToast('Unlisted share link copied to clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0B0E14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Character Studio & Retrainer</h2>
              <p className="text-xs text-gray-400">Editing '{character.display_name}'</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10 text-xs font-bold scrollbar-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Images</span>
          </button>

          <button
            onClick={() => setActiveTab('persona')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'persona' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Persona & Tone</span>
          </button>

          <button
            onClick={() => setActiveTab('retrain')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'retrain' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Retraining & Knowledge</span>
          </button>

          <button
            onClick={() => setActiveTab('visibility')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'visibility' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Visibility & Share</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: PROFILE & IMAGES */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Character Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Franchise / Universe</label>
                  <input
                    type="text"
                    placeholder="e.g. Naruto, Original, Genshin"
                    value={animeName}
                    onChange={(e) => setAnimeName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Canonical Greeting Message</label>
                <textarea
                  rows="2"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="First message character sends when starting a new chat..."
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {/* Avatar Upload / URL */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-white block">Profile Picture (Avatar)</span>
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl || 'https://via.placeholder.com/150'}
                    alt="Avatar Preview"
                    className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="Paste Image URL..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer hover:bg-indigo-600/30 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAvatar ? 'Uploading...' : 'Upload File'}</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Banner Upload / URL */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-white block">Banner Image</span>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 rounded-xl bg-black/50 border border-white/10 overflow-hidden shrink-0">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]">No Banner</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="Paste Banner URL..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer hover:bg-indigo-600/30 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingBanner ? 'Uploading...' : 'Upload File'}</span>
                      <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PERSONA & TONE */}
          {activeTab === 'persona' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Personality Summary</label>
                <textarea
                  rows="3"
                  value={personalitySummary}
                  onChange={(e) => setPersonalitySummary(e.target.value)}
                  placeholder="e.g. Calm, stoic, wise Uchiha prodigy who values peace and duty..."
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Speaking Style & Tone</label>
                <input
                  type="text"
                  value={speakingStyle}
                  onChange={(e) => setSpeakingStyle(e.target.value)}
                  placeholder="e.g. Quiet authority, formal Japanese/English phrasing, uses 'foolish brother'..."
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Likes (comma separated)</label>
                  <input
                    type="text"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="e.g. Dango, Peace, Reading, Tea"
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Dislikes (comma separated)</label>
                  <input
                    type="text"
                    value={dislikes}
                    onChange={(e) => setDislikes(e.target.value)}
                    placeholder="e.g. War, Conflict, Arrogance"
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Persona Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RETRAINING & KNOWLEDGE BASE */}
          {activeTab === 'retrain' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Character Knowledge Base Retraining</span>
                </h4>
                <p className="text-[11px] text-gray-400">
                  Give custom facts, backstory lore, dataset notes, or rules to retrain this AI character. The character will remember and use these facts when chatting!
                </p>
              </div>

              <form onSubmit={handleAddRetrainingLore} className="space-y-3">
                <label className="block text-xs font-bold text-gray-300">Add New Retraining Fact / Lore Note</label>
                <textarea
                  rows="3"
                  value={retrainFact}
                  onChange={(e) => setRetrainFact(e.target.value)}
                  placeholder="e.g. 'In our AU, Itachi survived the battle and lives in a hidden cabin in the Rain Village.'"
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingLore || !retrainFact.trim()}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${addingLore ? 'animate-spin' : ''}`} />
                    <span>{addingLore ? 'Retraining...' : 'Add Knowledge Fact'}</span>
                  </button>
                </div>
              </form>

              {/* Retrained Memories List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-gray-300 block">Existing Knowledge Base Memories ({memories.length})</span>
                {loadingMemories ? (
                  <div className="text-center py-4 text-xs text-gray-500">Loading knowledge base...</div>
                ) : memories.length === 0 ? (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-gray-400">
                    No retraining facts added yet. Add a fact above to retrain your character!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {memories.map((m) => (
                      <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-200 flex items-start justify-between gap-3">
                        <p className="flex-1 text-[11px] leading-relaxed">{m.memory_value || m.fact_value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: VISIBILITY & UNLISTED SHARE */}
          {activeTab === 'visibility' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Visibility & Discovery Settings</h3>
                <p className="text-xs text-gray-400">Control who can find and chat with '{character.display_name}'</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Public */}
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    visibility === 'public'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    {visibility === 'public' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <span className="font-bold text-xs">Public</span>
                  <p className="text-[11px] text-gray-400">Listed in the public community directory for everyone to discover.</p>
                </button>

                {/* Unlisted */}
                <button
                  type="button"
                  onClick={() => setVisibility('unlisted')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    visibility === 'unlisted'
                      ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <LinkIcon className="w-5 h-5 text-amber-400" />
                    {visibility === 'unlisted' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  <span className="font-bold text-xs">Unlisted</span>
                  <p className="text-[11px] text-gray-400">Hidden from directory search. Accessible ONLY via direct Share Link.</p>
                </button>

                {/* Private */}
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    visibility === 'private'
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Lock className="w-5 h-5 text-purple-400" />
                    {visibility === 'private' && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                  <span className="font-bold text-xs">Private</span>
                  <p className="text-[11px] text-gray-400">Visible and usable strictly by you (the creator).</p>
                </button>
              </div>

              {/* Share Link Box */}
              {(visibility === 'unlisted' || visibility === 'public') && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-white block">Direct Shareable Link</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareLink}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-indigo-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Visibility Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
