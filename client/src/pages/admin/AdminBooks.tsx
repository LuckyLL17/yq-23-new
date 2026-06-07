import React, { useState, useEffect } from 'react';
import {
  Search,
  Check,
  X,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface Book {
  id: number;
  title: string;
  author: string;
  cover?: string;
  description?: string;
  category?: string;
  condition: string;
  owner_id: number;
  owner_name?: string;
  owner_email?: string;
  status: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  points_required: number;
  created_at: string;
}

const AdminBooks: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const pageSize = 10;

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (filter !== 'all') params.approval_status = filter;
      const response = await adminAPI.getBooks(params);
      setBooks(response.data.books);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search, filter, page]);

  const handleApprove = async (id: number) => {
    try {
      await adminAPI.approveBook(id);
      fetchBooks();
    } catch (error) {
      console.error('Failed to approve book:', error);
      alert('审核失败');
    }
  };

  const handleReject = async () => {
    if (!selectedBook) return;
    try {
      await adminAPI.rejectBook(selectedBook.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedBook(null);
      fetchBooks();
    } catch (error) {
      console.error('Failed to reject book:', error);
      alert('拒绝失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这本书吗？')) return;
    try {
      await adminAPI.deleteBook(id);
      fetchBooks();
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('删除失败');
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">书籍管理</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索书名或作者..."
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
        ) : books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无书籍数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">书籍</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">所有者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">分类</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">积分</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">提交时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} className="w-12 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-16 bg-slate-200 rounded flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{book.title}</p>
                          <p className="text-sm text-slate-500">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-800">{book.owner_name}</p>
                      <p className="text-xs text-slate-500">{book.owner_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{book.category || '未分类'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{book.points_required}</td>
                    <td className="px-6 py-4">{getStatusBadge(book.approval_status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(book.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {book.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(book.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="通过"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBook(book);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="拒绝"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
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

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">拒绝书籍审核</h3>
            <p className="text-sm text-slate-600 mb-4">
              书籍：<span className="font-medium">{selectedBook?.title}</span>
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
                  setSelectedBook(null);
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

const BookOpen = (props: any) => {
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
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
};

export default AdminBooks;
