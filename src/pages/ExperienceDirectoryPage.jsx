import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, Search, Gamepad2, Wrench, Bot, Users, Palette, Trophy,
  Star, Play, CheckCircle2, Shield, Plus, ArrowRight, X, ExternalLink,
  MessageSquare, User, Lock, HeartHandshake
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { experienceService } from '../services/experienceService';
import { ExperienceSandboxModal } from '../components/ExperienceSandboxModal';

export function ExperienceDirectoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [experiences, setExperiences] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal & Sandbox state
  const [detailExp, setDetailExp] = useState(null);
  const [activeSandboxExp, setActiveSandboxExp] = useState(null);
  const [activeSessionCode, setActiveSessionCode] = useState(null);
  const [installingId, setInstallingId] = useState(null);

  const fetchExperiences = async () => {
    setLoading(true);
    try {
      const res = await experienceService.getDirectory(selectedCat, searchQuery, selectedFilter);
      setExperiences(res.experiences || []);
    } catch (err) {
      addToast('Failed to load experience directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, [selectedCat, selectedFilter]);

  useEffect(() => {
    if (slug) {
      loadExperienceDetails(slug);
    }
  }, [slug]);

  const loadExperienceDetails = async (expSlug) => {
    try {
      const res = await experienceService.getBySlug(expSlug);
      setDetailExp(res.experience);
    } catch (e) {
      addToast('Experience not found', 'error');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExperiences();
  };

  const handleInstall = async (exp) => {
    setInstallingId(exp.id);
    try {
      await experienceService.install(exp.id);
      addToast(`"${exp.name}" added to your account!`, 'success');
      if (detailExp && detailExp.id === exp.id) {
        setDetailExp({ ...detailExp, is_installed: true });
      }
      fetchExperiences();
    } catch (err) {
      addToast(err.message || 'Failed to add experience', 'error');
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstall = async (exp) => {
    try {
      await experienceService.uninstall(exp.id);
      addToast(`"${exp.name}" removed`, 'info');
      if (detailExp && detailExp.id === exp.id) {
        setDetailExp({ ...detailExp, is_installed: false });
      }
      fetchExperiences();
    } catch (err) {
      addToast(err.message || 'Failed to remove experience', 'error');
    }
  };

  const handleLaunchExperience = async (exp) => {
    try {
      const res = await experienceService.createSession(exp.id);
      setActiveSessionCode(res.session_code);
      setActiveSandboxExp(exp);
      setDetailExp(null);
    } catch (err) {
      addToast(err.message || 'Failed to launch session', 'error');
    }
  };

  const categories = [
    { name: 'All', icon: Sparkles },
    { name: 'Game', icon: Gamepad2 },
    { name: 'Tools', icon: Wrench },
    { name: 'AI', icon: Bot },
    { name: 'Social', icon: Users },
    { name: 'Creative', icon: Palette }
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Directory Banner Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              MarkanM Ecosystem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Experience Directory</h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Discover developer-built mini apps, party games, AI assistants, and interactive social experiences to play with friends right inside MarkanM!
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search games, tools, AI agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
          </form>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-3 bg-[#131822] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500/50 font-semibold"
            >
              <option value="trending">🔥 Trending</option>
              <option value="popular">⭐ Most Popular</option>
              <option value="new">🆕 Newest</option>
              <option value="featured">🏆 Featured</option>
            </select>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCat(cat.name)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                  selectedCat === cat.name
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Experience Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="h-64 glass-panel rounded-3xl animate-pulse bg-white/5" />
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400 glass-panel rounded-3xl border border-white/10">
            No experiences found in this category. Be the first developer to publish one!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {experiences.map(exp => (
              <div
                key={exp.id}
                onClick={() => {
                  setDetailExp(exp);
                  navigate(`/experiences/${exp.slug}`, { replace: true });
                }}
                className="glass-card p-5 rounded-3xl border border-white/10 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:border-indigo-500/40 relative overflow-hidden group"
              >
                <div>
                  {/* Banner image or top header */}
                  {exp.banner_url && (
                    <div className="w-full h-28 rounded-2xl overflow-hidden mb-4 relative bg-black/40">
                      <img src={exp.banner_url} alt={exp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0 flex items-center justify-center shadow-md">
                      {exp.icon_url ? (
                        <img src={exp.icon_url} alt={exp.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-white truncate">{exp.name}</h3>
                        {exp.is_first_party && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold shrink-0">
                            Official
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">by @{exp.developer_username}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 mt-3 line-clamp-2 leading-relaxed">
                    {exp.tagline || exp.description || 'Interactive social experience built for MarkanM.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{exp.rating_avg}</span>
                    </span>
                    <span>👥 <strong>{exp.total_users}</strong> users</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchExperience(exp);
                    }}
                    className="btn-gradient px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 hover:scale-105 transition-transform"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL DRAWER */}
      {detailExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative my-8 flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 p-0.5 shrink-0 flex items-center justify-center">
                  {detailExp.icon_url ? (
                    <img src={detailExp.icon_url} alt={detailExp.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{detailExp.name}</h2>
                  <p className="text-xs text-indigo-400 font-semibold">by @{detailExp.developer_username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">
                      {detailExp.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{detailExp.rating_avg} ({detailExp.rating_count} reviews)</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setDetailExp(null);
                  navigate('/experiences', { replace: true });
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">{detailExp.description}</p>

            {/* Requested Permissions Scopes */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Requested MarkanM Permissions</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300 mt-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Your MarkanM Username
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Display Name & Avatar
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Lock className="w-3.5 h-3.5" /> Active Session State
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {detailExp.is_installed ? (
                <button
                  onClick={() => handleUninstall(detailExp)}
                  className="px-5 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-2xl text-xs font-bold text-red-300"
                >
                  Remove Experience
                </button>
              ) : (
                <button
                  onClick={() => handleInstall(detailExp)}
                  disabled={installingId === detailExp.id}
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>{installingId === detailExp.id ? 'Adding...' : 'Add to Account'}</span>
                </button>
              )}

              <button
                onClick={() => handleLaunchExperience(detailExp)}
                className="flex-1 btn-gradient py-3 rounded-2xl text-xs font-bold shadow-xl flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Experience</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sandboxed Experience Container Modal */}
      {activeSandboxExp && (
        <ExperienceSandboxModal
          isOpen={true}
          onClose={() => {
            setActiveSandboxExp(null);
            setActiveSessionCode(null);
          }}
          experience={activeSandboxExp}
          sessionCode={activeSessionCode}
        />
      )}
    </div>
  );
}
