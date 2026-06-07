import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  RefreshCw,
  MessageSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface StatsData {
  totalUsers: number;
  totalBooks: number;
  totalExchanges: number;
  totalPosts: number;
  pendingBooks: number;
  pendingDonations: number;
  activeUsers: number;
  bannedUsers: number;
  booksByCategory: Record<string, number>;
  exchangesByStatus: Record<string, number>;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { label: '总用户数', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
    { label: '活跃用户', value: stats?.activeUsers || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: '总书籍数', value: stats?.totalBooks || 0, icon: BookOpen, color: 'bg-purple-500' },
    { label: '待审核书籍', value: stats?.pendingBooks || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: '总交换数', value: stats?.totalExchanges || 0, icon: RefreshCw, color: 'bg-indigo-500' },
    { label: '待审核捐赠', value: stats?.pendingDonations || 0, icon: Award, color: 'bg-pink-500' },
    { label: '帖子总数', value: stats?.totalPosts || 0, icon: MessageSquare, color: 'bg-teal-500' },
    { label: '封禁用户', value: stats?.bannedUsers || 0, icon: AlertCircle, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">管理仪表板</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-slate-800">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">书籍分类统计</h2>
          {stats && Object.keys(stats.booksByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.booksByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${(count / (stats?.totalBooks || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">暂无数据</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">交换状态分布</h2>
          {stats && Object.keys(stats.exchangesByStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.exchangesByStatus).map(([status, count]) => {
                const statusLabels: Record<string, string> = {
                  pending: '待处理',
                  accepted: '已接受',
                  in_progress: '进行中',
                  completed: '已完成',
                  rejected: '已拒绝',
                  cancelled: '已取消',
                  expired: '已过期'
                };
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-500',
                  accepted: 'bg-blue-500',
                  in_progress: 'bg-purple-500',
                  completed: 'bg-green-500',
                  rejected: 'bg-red-500',
                  cancelled: 'bg-slate-400',
                  expired: 'bg-orange-500'
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{statusLabels[status] || status}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-slate-400'}`}></div>
                      <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
