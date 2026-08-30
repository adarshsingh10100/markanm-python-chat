import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MessageCircle, Users, Shield, Zap, Globe, Bot,
  Star, ArrowRight, ChevronDown, Image, Mic, Video, Hash,
  Bell, Search, Lock, Smile, Play
} from 'lucide-react';

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Real-time Messaging',
    desc: 'Instant end-to-end messaging with delivery receipts, reactions, and media sharing.',
    color: 'from-indigo-500 to-purple-600',
    glow: 'rgba(99,102,241,0.25)',
  },
  {
    icon: Users,
    title: 'Group Chats & Channels',
    desc: 'Create groups, add members, assign admins, and manage your community with ease.',
    color: 'from-purple-500 to-pink-500',
    glow: 'rgba(168,85,247,0.25)',
  },
  {
    icon: Bot,
    title: 'AI Bots Integration',
    desc: 'Add powerful AI bots to your groups — assistants, translators, code helpers, and more.',
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.25)',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'Your data is yours. Secure sessions, encrypted storage, and no data selling — ever.',
    color: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.25)',
  },
  {
    icon: Globe,
    title: 'Discover People',
    desc: 'Find and connect with people who share your interests across the globe.',
    color: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    icon: Zap,
    title: 'Developer Platform',
    desc: 'Build custom bots and integrations with our powerful developer API.',
    color: 'from-rose-500 to-red-600',
    glow: 'rgba(244,63,94,0.25)',
  },
];

const STATS = [
  { value: '10K+', label: 'Active Users' },
  { value: '50K+', label: 'Messages Sent' },
  { value: '1K+', label: 'Groups Created' },
  { value: '99.9%', label: 'Uptime' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma', handle: '@priya_s', avatar: 'PS',
    text: 'MarkanM has completely changed how my team communicates. The group features are incredibly smooth!',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    name: 'Rahul Verma', handle: '@rahulv', avatar: 'RV',
    text: 'Finally a chat app that feels premium. The dark UI, animations — everything feels polished.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Aditya Kumar', handle: '@adityak', avatar: 'AK',
    text: 'Adding the AI assistant bot to my group was a game changer. Highly recommend MarkanM!',
    color: 'from-cyan-500 to-blue-600',
  },
];

const ChatBubble = ({ msg, fromMe, delay }) => (
  <div
    className={`flex items-end gap-2 ${fromMe ? 'flex-row-reverse' : 'flex-row'} opacity-0 animate-fade-in`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    {!fromMe && (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
        {msg.avatar}
      </div>
    )}
    <div
      className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
        fromMe
          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
          : 'bg-white/8 border border-white/10 text-gray-200 rounded-bl-sm'
      }`}
    >
      {msg.text}
    </div>
  </div>
);

export function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const chatMessages = [
    { text: 'Hey! Did you see the new MarkanM update? 🚀', avatar: 'P', fromMe: false, delay: 300 },
    { text: 'Yes! The group channels feature is amazing 🔥', avatar: '', fromMe: true, delay: 700 },
    { text: 'The AI bot is super helpful for translations!', avatar: 'P', fromMe: false, delay: 1100 },
    { text: 'I know right! And the UI is so clean 😍', avatar: '', fromMe: true, delay: 1500 },
  ];

  return (
    <div className="min-h-screen bg-[#070A10] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#070A10]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            MarkanM
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Community</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5">
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-4 text-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/12 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-600/8 rounded-full blur-[80px]" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Chat Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.08] tracking-tight mb-6">
            <span className="text-white">Connect, Chat,</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Collaborate.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            MarkanM is a premium private messaging platform with real-time group chats,
            AI bots, media sharing, and a developer API — all in one beautiful dark interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold shadow-2xl shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40"
            >
              <span>Start for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <span>Sign In</span>
            </Link>
          </div>

          {/* Live Chat Demo */}
          <div className="relative mx-auto max-w-sm">
            <div className="bg-[#111827]/80 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-xs font-bold text-white">M</div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">MarkanM Team</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                  </p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
              </div>
              {/* Messages */}
              <div className="flex flex-col gap-3 p-4 min-h-[180px]">
                {chatMessages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} fromMe={msg.fromMe} delay={msg.delay} />
                ))}
              </div>
              {/* Input bar */}
              <div className="flex items-center gap-2 px-3 py-3 border-t border-white/8 bg-white/3">
                <div className="flex-1 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center px-3">
                  <span className="text-[10px] text-gray-500">Type a message...</span>
                </div>
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -right-8 top-8 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm animate-bounce">
              🔒 End-to-End Encrypted
            </div>
            <div className="absolute -left-10 bottom-8 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
              ✦ AI Bot Enabled
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <a href="#features" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors animate-bounce">
          <span className="text-[10px] font-medium">Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </a>
      </section>

      {/* ── STATS BAND ── */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{s.value}</span>
              <span className="text-xs text-gray-500 font-medium mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/6 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" /> Everything You Need
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Packed with{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                powerful features
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From private DMs to massive group chats — MarkanM has the tools to keep your conversations flowing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-3xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${f.glow}, transparent 70%)` }} />
                <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="relative text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="relative text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-4">
              <Play className="w-3.5 h-3.5" /> Simple & Fast
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Get started in{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">3 steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Create Account',
                desc: 'Sign up with email or continue with Google — takes under 30 seconds.',
                color: 'from-indigo-500 to-purple-600',
              },
              {
                step: '02',
                icon: Search,
                title: 'Find Friends',
                desc: 'Search by username, browse the discover page, or invite via email.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                step: '03',
                icon: MessageCircle,
                title: 'Start Chatting',
                desc: 'Send messages, share media, create groups, and add AI bots instantly.',
                color: 'from-cyan-500 to-blue-600',
              },
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                {/* Step connector */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
                <div className="relative mb-6">
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-2xl shadow-black/30 transition-transform group-hover:scale-110`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#070A10] border border-white/20 text-[10px] font-black text-white flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHT: Media & more ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-emerald-600/6 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-6">
              <Image className="w-3.5 h-3.5" /> Rich Media
            </div>
            <h2 className="text-4xl font-black text-white mb-6 leading-tight">
              More than just{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                text messages
              </span>
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Share images, videos, voice notes, files, reactions, and more. MarkanM supports rich media in every conversation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Image, label: 'Photo & Video', color: 'text-blue-400' },
                { icon: Mic, label: 'Voice Messages', color: 'text-purple-400' },
                { icon: Smile, label: 'Emoji Reactions', color: 'text-yellow-400' },
                { icon: Bell, label: 'Smart Notifications', color: 'text-emerald-400' },
                { icon: Hash, label: 'Group Channels', color: 'text-pink-400' },
                { icon: Lock, label: 'Encrypted Chats', color: 'text-cyan-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/6 transition-all">
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                  <span className="text-xs font-semibold text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Visual mock */}
          <div className="relative">
            <div className="bg-[#111827]/80 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/8 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold text-white">A</div>
                <div>
                  <p className="text-xs font-semibold text-white">Aditya Kumar</p>
                  <p className="text-[10px] text-gray-500">📷 Sent a photo</p>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/20 h-32 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-indigo-300">
                    <Image className="w-8 h-8 opacity-60" />
                    <span className="text-xs font-medium opacity-60">sunset_photo.jpg</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['❤️', '🔥', '😍', '👏'].map((emoji, i) => (
                    <div key={i} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 cursor-pointer transition-all">
                      {emoji}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Mic className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 h-1 bg-emerald-500/30 rounded-full">
                    <div className="w-2/3 h-full bg-emerald-400 rounded-full" />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">0:32</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-6">
              <span className="text-3xl rotate-[-6deg]">🚀</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-xs font-semibold mb-4">
              <Star className="w-3.5 h-3.5" /> Community Love
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Loved by{' '}
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                our community
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 rounded-3xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all group">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-gray-500">{t.handle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/8 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/12 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Ready to{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              join MarkanM?
            </span>
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Join thousands of users already connecting, creating groups, and sharing moments on MarkanM Chat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-base font-bold shadow-2xl shadow-indigo-500/35 transition-all hover:scale-[1.03] hover:shadow-indigo-500/50"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-base font-semibold text-gray-300 hover:text-white transition-all"
            >
              Sign In
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-8">
            No credit card required • Free forever for personal use • Privacy-first
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold text-white">MarkanM Chat</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
            <span>© 2026 MarkanM. All rights reserved.</span>
            <Link to="/login" className="hover:text-gray-300 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-gray-300 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
