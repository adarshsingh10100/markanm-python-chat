import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Bell, Home, Settings, LogOut, Sparkles, Compass, Code, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { developerService } from '../services/developerService';
import { Avatar } from './Avatar';

export function Sidebar({ unreadNotificationsCount = 0 }) {
  const { user, logout } = useAuth();
  const { unreadTotal } = useChat();
  const navigate = useNavigate();

  const [isDeveloper, setIsDeveloper] = useState(false);

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
    { label: 'Experiences', path: '/experiences', icon: Gamepad2 }
  ];

  if (isDeveloper) {
    navItems.push({ label: 'Developer Portal', path: '/developers', icon: Code });
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
    <aside className="w-16 md:w-64 h-full glass-panel flex flex-col justify-between p-3 border-r border-white/10 shrink-0 select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
              MarkanM
            </h1>
            <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase">Chat</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline text-sm">{item.label}</span>

                {Boolean(item.badge) && item.badge > 0 && (
                  <span className="absolute right-2 md:right-3 px-2 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      {user && (
        <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
          >
            <Avatar
              src={user.avatar_url}
              name={user.display_name}
              isOnline={true}
              size="sm"
            />
            <div className="hidden md:block min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
              <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-semibold"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
