import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  Award,
  BookOpen,
  Coins,
  Trophy,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { donationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DonationRecords = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const pageSize = 10;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate, page, statusFilter, sortBy, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, statsRes] = await Promise.all([
        donationsAPI.getMyDonations({
          page,
          limit: pageSize,
          sort_by: sortBy,
          sort_order: sortOrder,
          status: statusFilter === 'all' ? undefined : statusFilter
        }),
        donationsAPI.getDonationStats()
      ]);
      setDonations(recordsRes.data.donations);
      setTotalPages(recordsRes.data.pagination.total_pages);
      setTotal(recordsRes.data.pagination.total);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch donation records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已通过</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">审核中</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已拒绝</span>;
      default:
        return null;
    }
  };

  const handleViewCertificate = (donationId: number) => {
    navigate(`/donations/${donationId}/certificate`);
  };

  const handleGoDonate = () => {
    navigate('/donate');
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => setPage(1)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              page === p
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <button
              onClick={() => setPage(totalPages)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center space-x-3">
              <Gift className="w-8 h-8" />
              <span>我的捐赠</span>
            </h1>
            <p className="text-white/80 mt-2">记录您的每一份爱心捐赠</p>
          </div>
          <button
            onClick={handleGoDonate}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Gift className="w-4 h-4" />
            <span>去捐赠</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.total_books || 0}</div>
              <div className="text-xs text-gray-500">捐赠书籍</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.total_donations || 0}</div>
              <div className="text-xs text-gray-500">捐赠次数</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.total_certificates || 0}</div>
              <div className="text-xs text-gray-500">捐赠证书</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">
                {stats?.my_rank ? `第${stats.my_rank}名` : '-'}
              </div>
              <div className="text-xs text-gray-500">
                共{stats?.total_donors || 0}位捐赠者
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              {[
                { key: 'all', label: '全部' },
                { key: 'approved', label: '已通过' },
                { key: 'pending', label: '审核中' },
                { key: 'rejected', label: '已拒绝' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setStatusFilter(item.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === item.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">排序:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(order);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="date-desc">最新捐赠</option>
              <option value="date-asc">最早捐赠</option>
              <option value="quantity-desc">数量最多</option>
              <option value="quantity-asc">数量最少</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          {donations.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">暂无捐赠记录</h3>
              <p className="text-gray-400 text-sm mb-6">开始您的第一次爱心捐赠吧</p>
              <button
                onClick={handleGoDonate}
                className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                立即捐赠
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {donation.book_cover ? (
                          <img
                            src={donation.book_cover}
                            alt={donation.book_title}
                            className="w-16 h-20 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-book-ink truncate">
                              {donation.book_title}
                            </h3>
                            {getStatusBadge(donation.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{donation.book_author}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(donation.donated_at)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Coins className="w-3.5 h-3.5" />
                              <span>{donation.quantity} 本</span>
                            </span>
                            {donation.book_category && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {donation.book_category}
                              </span>
                            )}
                          </div>
                          {donation.message && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              "{donation.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {donation.certificate_issued && donation.status === 'approved' ? (
                          <button
                            onClick={() => handleViewCertificate(donation.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                          >
                            <Award className="w-4 h-4" />
                            <span>查看证书</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {donation.status === 'pending' ? '等待审核' : '无证书'}
                          </span>
                        )}
                        <div className="text-xs text-amber-600 flex items-center space-x-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>+{donation.quantity * 20}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {renderPagination()}

              <div className="text-center text-sm text-gray-500 mt-4">
                共 {total} 条捐赠记录
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationRecords;
