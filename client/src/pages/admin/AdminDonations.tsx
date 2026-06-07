import React, { useState, useEffect } from 'react';
import {
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Gift
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface Donation {
  id: number;
  user_id: number;
  username?: string;
  user_email?: string;
  book_id: number | null;
  book_title: string;
  book_author: string;
  book_cover?: string;
  book_category?: string;
  book_condition: string;
  quantity: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  donated_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
}

const AdminDonations: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const pageSize = 10;

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (filter !== 'all') params.status = filter;
      const response = await adminAPI.getDonations(params);
      setDonations(response.data.donations);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [search, filter, page]);

  const handleApprove = async (id: number) => {
    try {
      await adminAPI.approveDonation(id);
      fetchDonations();
    } catch (error) {
      console.error('Failed to approve donation:', error);
      alert('审核失败');
    }
  };

  const handleReject = async () => {
    if (!selectedDonation) return;
    try {
      await adminAPI.rejectDonation(selectedDonation.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedDonation(null);
      fetchDonations();
    } catch (error) {
      console.error('Failed to reject donation:', error);
      alert('拒绝失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">已通过</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">待审核</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">已拒绝</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{status}</span>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">捐赠管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
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
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'pending' ? '待审核' : f === 'approved' ? '已通过' : '已拒绝'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无捐赠数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">书籍</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">捐赠者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">数量</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">捐赠时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {donation.book_cover ? (
                          <img src={donation.book_cover} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-slate-200 rounded flex items-center justify-center">
                            <BookIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{donation.book_title}</p>
                          <p className="text-sm text-slate-500">{donation.book_author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-800">{donation.username}</p>
                      <p className="text-xs text-slate-500">{donation.user_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{donation.quantity}</td>
                    <td className="px-6 py-4">{getStatusBadge(donation.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(donation.donated_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {donation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(donation.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="通过"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDonation(donation);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="拒绝"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
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

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">拒绝捐赠审核</h3>
            <p className="text-sm text-slate-600 mb-4">
              书籍：<span className="font-medium">{selectedDonation?.book_title}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">拒绝原因</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="请输入拒绝原因..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedDonation(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BookIcon = (props: any) => {
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
};

export default AdminDonations;
