import React, { useState, useEffect } from 'react';
import {
  Code, Terminal, Key, ShieldCheck, Cpu, Plus, Copy, Check, RefreshCw,
  Trash2, Globe, Sparkles, BookOpen, Activity, Send, CheckCircle2, Lock,
  AlertTriangle, ExternalLink, ArrowRight, Server, Play, X, Bot as BotIcon,
  MessageSquare, Shield, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { developerService } from '../services/developerService';
import { request } from '../services/api';

export function DeveloperPortalPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('home');
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals & Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateBotOpen, setIsCreateBotOpen] = useState(false);
  const [newAppForm, setNewAppForm] = useState({
    name: '',
    description: '',
    website_url: '',
    contact_email: '',
    category: 'Utility',
    redirect_uris: ['https://']
  });
  const [newBotForm, setNewBotForm] = useState({
    bot_username: '',
    display_name: '',
    bio: '',
    category: 'Utility',
    webhook_url: ''
  });
  const [createdBotSecret, setCreatedBotSecret] = useState(null);

  const [createdSecret, setCreatedSecret] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [creatingApp, setCreatingApp] = useState(false);

  // Bot Workspace state
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [botLogs, setBotLogs] = useState([]);
  const [testingBotWebhook, setTestingBotWebhook] = useState(false);
  const [botTestResult, setBotTestResult] = useState(null);

  // Usage & Webhooks
  const [usageStats, setUsageStats] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Live Demo OAuth PKCE state
  const [demoCode, setDemoCode] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [demoUserData, setDemoUserData] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoClientSecretInput, setDemoClientSecretInput] = useState('');

  // Documentation language selector tab
  const [docsLang, setDocsLang] = useState('js');

  const fetchDeveloperData = async () => {
    setLoading(true);
    try {
      const res = await developerService.getApps();
      setIsDeveloper(res.is_developer);
      setApps(res.apps || []);
      if (res.apps?.length > 0 && !selectedApp) {
        loadAppDetails(res.apps[0].id);
      }
    } catch (e) {
      addToast('Failed to load developer status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloperData();
  }, []);

  const loadAppDetails = async (appId) => {
    try {
      const res = await developerService.getAppDetails(appId);
      setSelectedApp(res.app);
      if (res.app.webhook) {
        setWebhookUrl(res.app.webhook.url);
        setWebhookSecret(res.app.webhook.secret);
      }
      loadUsage(appId);
    } catch (e) {}
  };

  const loadUsage = async (appId) => {
    try {
      const res = await developerService.getAppUsage(appId);
      setUsageStats(res.usage);
    } catch (e) {}
  };

  const handleActivateDev = async () => {
    try {
      await developerService.activateDeveloper();
      addToast('Developer Mode Activated!', 'success');
      setIsDeveloper(true);
      fetchDeveloperData();
    } catch (err) {
      addToast(err.message || 'Failed to activate developer status', 'error');
    }
  };

  const handleCreateAppSubmit = async (e) => {
    e.preventDefault();
    if (!newAppForm.name.trim() || !newAppForm.website_url.trim()) {
      addToast('Application Name and Website URL are required.', 'error');
      return;
    }

    setCreatingApp(true);
    try {
      const res = await developerService.createApp({
        ...newAppForm,
        contact_email: newAppForm.contact_email || user?.email
      });
      addToast('Application created successfully!', 'success');
      setCreatedSecret(res.app.client_secret);
      setDemoClientSecretInput(res.app.client_secret);
      setIsCreateModalOpen(false);
      fetchDeveloperData();
      if (res.app?.id) {
        loadAppDetails(res.app.id);
        setActiveTab('credentials');
      }
    } catch (err) {
      addToast(err.message || 'Failed to create app', 'error');
    } finally {
      setCreatingApp(false);
    }
  };

  const handleCreateBotSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) {
      addToast('Select an application first to create a bot', 'error');
      return;
    }

    try {
      const res = await request('/developer/bots', {
        method: 'POST',
        body: JSON.stringify({
          app_id: selectedApp.id,
          ...newBotForm
        })
      });
      addToast(`Bot @${res.bot.bot_username} created successfully!`, 'success');
      setCreatedBotSecret(res.bot.bot_token);
      setIsCreateBotOpen(false);
      setSelectedBot(res.bot);
      setActiveTab('bots');
    } catch (err) {
      addToast(err.message || 'Failed to create bot', 'error');
    }
  };

  const handleRotateBotToken = async () => {
    if (!selectedBot) return;
    if (!window.confirm('Regenerate Bot Token? Existing bot connections will immediately fail!')) return;
    try {
      const res = await request(`/developer/bots/${selectedBot.id}/rotate-token`, { method: 'POST' });
      setCreatedBotSecret(res.new_bot_token);
      addToast('Bot Token regenerated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to regenerate bot token', 'error');
    }
  };

  const handleTestBotWebhookPing = async () => {
    if (!selectedBot) return;
    setTestingBotWebhook(true);
    try {
      const res = await request(`/developer/bots/${selectedBot.id}/webhooks/test`, { method: 'POST' });
      setBotTestResult(res);
      addToast(`Bot Webhook test: HTTP ${res.response_code}`, 'info');
    } catch (err) {
      addToast(err.message || 'Bot Webhook test failed', 'error');
    } fontally {
      setTestingBotWebhook(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    addToast('Copied to clipboard!', 'info');
  };

  const activeClientId = selectedApp ? selectedApp.client_id : 'mkm_app_YOUR_CLIENT_ID';
  const activeRedirectUri = selectedApp?.redirect_uris?.[0] || selectedApp?.website_url || 'https://yourwebsite.com/oauth/callback';

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-0.5 shadow-xl flex items-center justify-center">
              <div className="w-full h-full bg-[#0B0E14] rounded-[14px] flex items-center justify-center">
                <Code className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">MarkanM Connect</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase">
                  Developer & Bot Platform
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">OAuth 2.0 Authorization, Bot API v1, Webhooks, Python/JS/PHP SDKs</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isDeveloper ? (
              <button
                onClick={handleActivateDev}
                className="btn-gradient px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Activate Developer Mode</span>
              </button>
            ) : (
              <div className="px-4 py-2 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Developer Account Active (@{user?.username})</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs font-semibold scrollbar-none">
          {[
            { id: 'home', name: 'Developer Home', icon: Terminal },
            { id: 'apps', name: `My Apps (${apps.length})`, icon: Cpu },
            { id: 'bots', name: 'Developer Bots', icon: BotIcon },
            { id: 'credentials', name: 'Credentials', icon: Key },
            { id: 'usage', name: 'API Usage', icon: Activity },
            { id: 'webhooks', name: 'Webhooks', icon: Server },
            { id: 'docs', name: 'API & SDK Documentation', icon: BookOpen },
            { id: 'demo', name: 'Live OAuth Demo', icon: Play }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white font-bold shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Developer Home */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">MarkanM Developer Platform</span>
              <h2 className="text-2xl font-black text-white">Build Bots, Apps & Experiences</h2>
              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                Build Telegram/Discord-style developer bots in <strong>Python (`pip install markanm`)</strong>, <strong>JavaScript (`npm i @markanm/bot`)</strong>, or <strong>PHP (`composer req markanm/bot`)</strong>.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-gradient px-6 py-3 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Application</span>
                </button>
                <button
                  onClick={() => setIsCreateBotOpen(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-xl"
                >
                  <BotIcon className="w-4 h-4 text-white" />
                  <span>+ Create Developer Bot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab BOTS: Developer Bots Workspace */}
        {activeTab === 'bots' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Developer Bots Platform</h2>
                <p className="text-xs text-gray-400">Manage bots, tokens (`mkbot_...`), slash commands, and signed webhooks</p>
              </div>

              <button
                onClick={() => setIsCreateBotOpen(true)}
                className="btn-gradient px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Bot</span>
              </button>
            </div>

            {createdBotSecret && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Copy Bot Token Now (Revealed Only Once!)</span>
                </div>
                <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-emerald-500/30">
                  <code className="text-xs font-mono text-emerald-300 break-all">{createdBotSecret}</code>
                  <button onClick={() => copyToClipboard(createdBotSecret, 'bot_secret')} className="p-1.5 text-emerald-400 hover:text-white">
                    {copiedField === 'bot_secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-indigo-400">PyPI Python SDK (`pip install markanm`)</span>
                <pre className="bg-black/60 p-3 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto">
{`from markanm import Bot

bot = Bot("mkbot_YOUR_TOKEN")

@bot.command("hello")
async def hello(ctx):
    await ctx.reply("Hello 👋 from Python!")

bot.run()`}
                </pre>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-purple-400">Node.js SDK (`npm i @markanm/bot`)</span>
                <pre className="bg-black/60 p-3 rounded-xl text-[11px] font-mono text-purple-300 overflow-x-auto">
{`import { Bot } from "@markanm/bot";

const bot = new Bot("mkbot_YOUR_TOKEN");

bot.command("hello", async (ctx) => {
    await ctx.reply("Hello 👋 from JS!");
});`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Interactive Step-by-Step API Documentation */}
        {activeTab === 'docs' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider">Multi-Language SDK & API Reference</span>
                <h2 className="text-2xl font-black text-white mt-1">Bot Platform & SDK Guide</h2>
                <p className="text-xs text-gray-400 mt-0.5">Code examples in Python, JavaScript, and PHP</p>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
                {[
                  { id: 'python', name: 'Python (PyPI)' },
                  { id: 'js', name: 'JavaScript (npm)' },
                  { id: 'php', name: 'PHP (Composer)' }
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => setDocsLang(l.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      docsLang === l.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-black/60 rounded-2xl border border-white/10 font-mono text-xs text-indigo-300">
              {docsLang === 'python' ? '# Install PyPI Package:\npip install markanm' : docsLang === 'php' ? '// Install Composer Package:\ncomposer require markanm/bot' : '// Install npm Package:\nnpm install @markanm/bot'}
            </div>
          </div>
        )}
      </div>

      {/* CREATE BOT MODAL */}
      {isCreateBotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BotIcon className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Create Developer Bot</h3>
              </div>
              <button onClick={() => setIsCreateBotOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBotSubmit} className="flex flex-col gap-4 mt-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Bot Username *</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-gray-400 font-bold mr-1">@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GameMaster, AIHelper"
                    value={newBotForm.bot_username}
                    onChange={(e) => setNewBotForm({ ...newBotForm, bot_username: e.target.value })}
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Game Master Bot"
                  value={newBotForm.display_name}
                  onChange={(e) => setNewBotForm({ ...newBotForm, display_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Webhook URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yourserver.com/markanm/webhook"
                  value={newBotForm.webhook_url}
                  onChange={(e) => setNewBotForm({ ...newBotForm, webhook_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBotOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  Create Bot & Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
