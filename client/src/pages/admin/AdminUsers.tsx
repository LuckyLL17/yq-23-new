import React, { useState, useEffect } from 'react';
import {
  Search,
  Ban,
  UserCheck,
  Shield,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  Edit3
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  avatar?: string;
  bio?: string;
  created_at: string;
  book_count: number;
  exchange_count: number;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pointsValue, setPointsValue] = useState('');
  const pageSize = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleFilter !== 'all') params.role = roleFilter;
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, roleFilter, page]);

  const handleBan = async (id: number) => {
    if (!confirm('确定要封禁该用户吗？')) return;
    try {
      await adminAPI.banUser(id);
      fetchUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('操作失败');
    }
  };

  const handleUnban = async (id: number) => {
    try {
      await adminAPI.unbanUser(id);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('操作失败');
    }
  };

  const handleRoleChange = async (id: number, role: string) => {
    const confirmMsg = role === 'admin' ? '确定要将该用户设为管理员吗？' : '确定要取消该用户的管理员权限吗？';
    if (!confirm(confirmMsg)) return;
    try {
      await adminAPI.updateUserRole(id, role);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('操作失败');
    }
  };

  const handlePointsUpdate = async () => {
    if (!selectedUser || !pointsValue) return;
    try {
      await adminAPI.updateUserPoints(selectedUser.id, parseInt(pointsValue));
      setShowPointsModal(false);
      setPointsValue('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update points:', error);
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">正常</span>;
      case 'banned':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">已封禁</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{status}</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">管理员</span>;
      case 'user':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">普通用户</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{role}</span>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">用户管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="active">正常</option>
                <option value="banned">已封禁</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">全部角色</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">用户</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">角色</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">积分</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">书籍数</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">交换数</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">注册时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{user.username}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{user.points}</span>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setPointsValue(user.points.toString());
                            setShowPointsModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="调整积分"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.book_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.exchange_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="封禁用户"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="解封用户"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {user.role === 'admin' ? (
                          <button
                            onClick={() => handleRoleChange(user.id, 'user')}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="取消管理员"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="设为管理员"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">调整用户积分</h3>
            <p className="text-sm text-slate-600 mb-4">
              用户：<span className="font-medium">{selectedUser?.username}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">积分数值</label>
              <input
                type="number"
                value={pointsValue}
                onChange={(e) => setPointsValue(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPointsModal(false);
                  setPointsValue('');
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePointsUpdate}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Users = (props: any) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

export default AdminUsers;
