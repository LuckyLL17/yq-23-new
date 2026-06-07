import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  RefreshCw,
  MessageSquare,
  Gift,
  Calendar,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: '仪表板', icon: LayoutDashboard, exact: true },
    { path: '/admin/books', label: '书籍管理', icon: BookOpen },
    { path: '/admin/users', label: '用户管理', icon: Users },
    { path: '/admin/exchanges', label: '交换管理', icon: RefreshCw },
    { path: '/admin/posts', label: '帖子管理', icon: MessageSquare },
    { path: '/admin/donations', label: '捐赠管理', icon: Gift },
    { path: '/admin/clubs', label: '读书会管理', icon: Calendar },
  ];

  return (
    <div className="w-64 bg-slate-800 min-h-screen text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          管理后台
        </h1>
        <p className="text-sm text-slate-400 mt-1">书籍交换系统</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white border-r-4 border-primary-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-slate-400">{user?.role === 'admin' ? '管理员' : '用户'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
