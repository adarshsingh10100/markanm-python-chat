import React, { useState, useEffect } from 'react';
import { Image, Upload, Save, Globe, Share2, Sparkles, CheckCircle, RefreshCw, Eye, Smartphone, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function AdminBrandingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  const [form, setForm] = useState({
    site_title: 'MarkanM Chat — End-to-End AI & Private Messaging',
    site_description: 'Experience private, end-to-end encrypted messaging, interactive AI anime characters, and real-time chat on MarkanM Chat.',
    site_keywords: 'MarkanM, AI chat, anime character chat, private messaging, end to end encryption',
    site_logo_url: '/assets/logo.png',
    site_favicon_url: '/favicon.svg',
    apple_touch_icon_url: '/apple-touch-icon.png',
    og_image_url: 'https://chat.markanm.com/assets/og-preview.png',
    robots_indexing: 'index, follow'
  });

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const res = await adminService.getBranding();
      if (res.branding) {
        setForm(prev => ({ ...prev, ...res.branding }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to load branding settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const res = await adminService.uploadBrandingAsset(file);
      if (res.url) {
        handleChange(field, res.url);
        addToast(`Uploaded asset for ${field}!`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Asset upload failed', 'error');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminService.updateBranding(form);
      addToast(res.message || 'Branding & SEO settings saved!', 'success');
      // Apply changes to current page instantly
      document.title = form.site_title;
    } catch (err) {
      addToast(err.message || 'Failed to save branding settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const role = (user?.role || '').toLowerCase();
  const uname = (user?.username || '').toLowerCase();
  const isSuperAdmin = role === 'superadmin' || role === 'admin' || uname === 'gdr' || uname === 'admin' || Number(user?.id) === 1;

  if (!isSuperAdmin) {
    return (
      <div className="p-8 bg-[#0B0E14] text-white">
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>Superadmin role required to access Platform Branding & SEO settings.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Branding, Logo & SEO Engine</h1>
            <p className="text-xs text-gray-400">Manage site logos, favicon icons, meta tags, and social link preview cards</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          className="btn-gradient px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Branding & SEO'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading branding configuration...</div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-7 space-y-6">
            {/* Website Identity */}
            <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-bold text-sm text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span>Website Identity & Title</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Site Title (Appears on Browser Tab & Google Search)</label>
                <input
                  type="text"
                  required
                  value={form.site_title}
                  onChange={(e) => handleChange('site_title', e.target.value)}
                  placeholder="MarkanM Chat — End-to-End AI & Private Messaging"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Search Engine Meta Description (SEO Summary)</label>
                <textarea
                  rows="3"
                  required
                  value={form.site_description}
                  onChange={(e) => handleChange('site_description', e.target.value)}
                  placeholder="Experience private, end-to-end encrypted messaging, interactive AI anime characters..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">SEO Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={form.site_keywords}
                  onChange={(e) => handleChange('site_keywords', e.target.value)}
                  placeholder="MarkanM, AI chat, anime character chat, private messaging"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Logo & Favicon Assets */}
            <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-bold text-sm text-indigo-400">
                <Image className="w-4 h-4" />
                <span>Logos, Favicons & Social Preview Image</span>
              </div>

              {/* Site Logo */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Main Website Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={form.site_logo_url || '/assets/logo.png'}
                      alt="Site Logo"
                      className="max-w-full max-h-full object-contain p-1"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=Logo'; }}
                    />
                  </div>
                  <input
                    type="text"
                    value={form.site_logo_url}
                    onChange={(e) => handleChange('site_logo_url', e.target.value)}
                    placeholder="/assets/logo.png or image URL"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <label className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'site_logo_url' ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload('site_logo_url', e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Browser Favicon (.ico / .png / .svg)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={form.site_favicon_url || '/favicon.svg'}
                      alt="Favicon"
                      className="w-8 h-8 object-contain"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Favicon'; }}
                    />
                  </div>
                  <input
                    type="text"
                    value={form.site_favicon_url}
                    onChange={(e) => handleChange('site_favicon_url', e.target.value)}
                    placeholder="/favicon.svg or icon URL"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <label className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'site_favicon_url' ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload('site_favicon_url', e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Apple Touch Icon */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Apple Touch Favicon (iOS Home Screen)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={form.apple_touch_icon_url || '/apple-touch-icon.png'}
                      alt="Apple Touch Icon"
                      className="w-10 h-10 rounded-xl object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Apple'; }}
                    />
                  </div>
                  <input
                    type="text"
                    value={form.apple_touch_icon_url}
                    onChange={(e) => handleChange('apple_touch_icon_url', e.target.value)}
                    placeholder="/apple-touch-icon.png or icon URL"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <label className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'apple_touch_icon_url' ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload('apple_touch_icon_url', e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Social OpenGraph Link Preview Image */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Social Link Preview Banner (WhatsApp / Twitter / Discord Card Image)</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={form.og_image_url || '/assets/og-preview.png'}
                      alt="Social Link Preview Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/300x160?text=Preview+Banner'; }}
                    />
                  </div>
                  <input
                    type="text"
                    value={form.og_image_url}
                    onChange={(e) => handleChange('og_image_url', e.target.value)}
                    placeholder="https://chat.markanm.com/assets/og-preview.png"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <label className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'og_image_url' ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload('og_image_url', e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Social & Google Search Preview Simulator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl sticky top-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-bold text-sm text-amber-400">
                <Share2 className="w-4 h-4" />
                <span>Live Link Preview Simulator</span>
              </div>

              {/* WhatsApp / Telegram / iMessage Preview Card */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp & iMessage Shared Link Card</span>
                </div>
                <div className="bg-[#0b141a] border border-emerald-500/30 rounded-2xl p-3 space-y-2 shadow-lg">
                  <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 aspect-video relative">
                    <img
                      src={form.og_image_url || '/assets/og-preview.png'}
                      alt="Link Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400x220?text=Link+Preview+Logo'; }}
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-gray-300 font-mono">
                      chat.markanm.com
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white line-clamp-1">{form.site_title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{form.site_description}</p>
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">https://chat.markanm.com</span>
                  </div>
                </div>
              </div>

              {/* Google Search Result Preview */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Google Search Result Snippet</span>
                </div>
                <div className="bg-[#18191b] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
                  <div className="flex items-center gap-2">
                    <img
                      src={form.site_favicon_url || '/favicon.svg'}
                      alt="Favicon"
                      className="w-4 h-4 object-contain"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/20'; }}
                    />
                    <span className="text-[11px] text-gray-300 font-mono">chat.markanm.com</span>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-400 hover:underline line-clamp-1 cursor-pointer">
                    {form.site_title}
                  </h3>
                  <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                    {form.site_description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
