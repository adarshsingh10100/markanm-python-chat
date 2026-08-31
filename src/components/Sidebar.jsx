import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Bell, Home, Settings, LogOut, Sparkles, Compass, Code, Gamepad2, Bot, PanelLeftClose, PanelLeft, Shield, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { developerService } from '../services/developerService';
import { Avatar } from './Avatar';

export function Sidebar({ unreadNotificationsCount = 0 }) {
  const { user, logout } = useAuth();
  const { unreadTotal } = useChat();
  const navigate = useNavigate();

  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (user) {
      developerService.getApps()
        .then(res => setIsDeveloper(res.is_developer))
        .catch(() => setIsDeveloper(false));
    }
  }, [user]);

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Chats', path: '/chat', icon: MessageSquare, badge: unreadTotal },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Characters', path: '/characters', icon: Bot },
    { label: 'Experiences', path: '/experiences', icon: Gamepad2 }
  ];

  if (isDeveloper) {
    navItems.push({ label: 'Developer Portal', path: '/developers', icon: Code });
  }

  const role = (user?.role || '').toLowerCase();
  const uname = (user?.username || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'superadmin' || uname === 'gdr' || uname === 'admin' || Number(user?.id) === 1;

  if (isAdmin) {
    navItems.push(
      { label: 'Admin Panel', path: '/admin/users', icon: Shield },
      { label: 'Branding & SEO', path: '/admin/branding', icon: Globe }
    );
  }

  navItems.push(
    { label: 'Connections', path: '/connections', icon: Users },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadNotificationsCount },
    { label: 'Settings', path: '/settings', icon: Settings }
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`h-full glass-panel flex flex-col justify-between border-r border-white/10 shrink-0 select-none z-20 transition-all duration-300 overflow-x-hidden ${
      isCollapsed ? 'w-16 p-2' : 'w-16 md:w-64 p-3'
    }`}>
      {/* Scrollable Nav Section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none flex flex-col gap-2">
        {/* Brand Header & Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center py-2' : 'justify-between px-2 py-3'} mb-2 shrink-0 border-b border-white/5 pb-2`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 cursor-pointer hover:scale-105 transition-transform"
              title="MarkanM Chat"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="hidden md:block min-w-0">
                <h1 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 truncate">
                  MarkanM
                </h1>
                <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase">Chat</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0 flex items-center justify-center"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5 text-indigo-400" /> : <PanelLeftClose className="w-5 h-5 hidden md:block" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 w-full overflow-x-hidden">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'} rounded-xl transition-all duration-200 group relative w-full ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                {!isCollapsed && <span className="hidden md:inline text-sm truncate">{item.label}</span>}

                {Boolean(item.badge) && item.badge > 0 && (
                  <span className={`${
                    isCollapsed
                      ? 'absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-500 text-white rounded-full border border-[#0B0E14]'
                      : 'absolute right-2 md:right-3 px-2 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Log Out Footer (Pinned) */}
      {user && (
        <div className="shrink-0 pt-3 border-t border-white/10 flex flex-col gap-1.5 mt-auto w-full overflow-x-hidden">
          <div
            onClick={() => navigate('/profile')}
            title={`${user.display_name} (@${user.username})`}
            className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'gap-3 p-2'} rounded-xl hover:bg-white/5 cursor-pointer transition-colors w-full`}
          >
            <Avatar
              src={user.avatar_url}
              name={user.display_name}
              isOnline={true}
              size="sm"
            />
            {!isCollapsed && (
              <div className="hidden md:block min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
                <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-semibold w-full`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 shrink-0 text-red-400" />
            {!isCollapsed && <span className="hidden md:inline text-red-300 font-bold truncate">Log Out</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
