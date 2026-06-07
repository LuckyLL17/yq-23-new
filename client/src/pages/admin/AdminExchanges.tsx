import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface Exchange {
  id: number;
  book_id: number;
  book_title?: string;
  book_cover?: string;
  requester_id: number;
  requester_name?: string;
  owner_id: number;
  owner_name?: string;
  status: string;
  message?: string;
  created_at: string;
}

const AdminExchanges: React.FC = () => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchExchanges = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await adminAPI.getExchanges(params);
      setExchanges(response.data.exchanges);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch exchanges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchanges();
  }, [search, statusFilter, page]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: '已接受', color: 'bg-blue-100 text-blue-700' },
      in_progress: { label: '进行中', color: 'bg-purple-100 text-purple-700' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
      cancelled: { label: '已取消', color: 'bg-slate-100 text-slate-700' },
      expired: { label: '已过期', color: 'bg-orange-100 text-orange-700' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusList = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled', 'expired'];
  const statusLabels: Record<string, string> = {
    all: '全部',
    pending: '待处理',
    accepted: '已接受',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝',
    cancelled: '已取消',
    expired: '已过期'
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">交换管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索..."
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
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        ) : exchanges.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无交换数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">书籍</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">请求者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">所有者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">申请时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {exchanges.map((exchange) => (
                  <tr key={exchange.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {exchange.book_cover ? (
                          <img src={exchange.book_cover} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-slate-200 rounded flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium text-slate-800">{exchange.book_title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{exchange.requester_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{exchange.owner_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(exchange.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(exchange.created_at).toLocaleDateString('zh-CN')}
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

export default AdminExchanges;
