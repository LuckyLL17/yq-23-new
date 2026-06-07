import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface ReadingClub {
  id: number;
  title: string;
  description: string;
  organizer_id: number;
  organizer_name?: string;
  location: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  participant_count?: number;
  status: string;
  cover_image?: string;
  created_at: string;
}

const AdminClubs: React.FC = () => {
  const [clubs, setClubs] = useState<ReadingClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await adminAPI.getReadingClubs(params);
      setClubs(response.data.clubs);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [search, statusFilter, page]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个读书会吗？删除后无法恢复。')) return;
    try {
      await adminAPI.deleteReadingClub(id);
      fetchClubs();
    } catch (error) {
      console.error('Failed to delete club:', error);
      alert('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      upcoming: { label: '即将开始', color: 'bg-blue-100 text-blue-700' },
      ongoing: { label: '进行中', color: 'bg-green-100 text-green-700' },
      ended: { label: '已结束', color: 'bg-slate-100 text-slate-700' },
      cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusList = ['all', 'upcoming', 'ongoing', 'ended', 'cancelled'];
  const statusLabels: Record<string, string> = {
    all: '全部',
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束',
    cancelled: '已取消'
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">读书会管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索读书会..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusList.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无读书会数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">读书会</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">组织者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">地点</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">参与人数</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">开始时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clubs.map((club) => (
                  <tr key={club.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                      {club.cover_image ? (
                        <img src={club.cover_image} alt="" className="w-16 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-10 bg-slate-200 rounded flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium text-slate-800">{club.title}</span>
                    </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{club.organizer_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{club.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {club.participant_count} / {club.max_participants}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(club.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(club.start_time).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(club.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
    </div>
  );
};

export default AdminClubs;
