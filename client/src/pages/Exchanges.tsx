import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Check,
  X,
  Clock,
  User,
  Coins,
  XCircle,
  Play,
  CheckCircle2,
  Star,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { exchangesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ExchangeStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

interface ExchangeReview {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

interface Exchange {
  id: number;
  book_id: number;
  requester_id: number;
  owner_id: number;
  status: ExchangeStatus;
  message?: string;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  expired_at?: string;
  expires_at?: string;
  borrow_days?: number;
  title?: string;
  cover?: string;
  author?: string;
  points_required?: number;
  requester_name?: string;
  requester_avatar?: string;
  owner_name?: string;
  owner_avatar?: string;
  my_review?: ExchangeReview;
  other_review?: ExchangeReview;
}

const Exchanges = () => {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'incoming' | 'outgoing' | 'completed'
  >('all');
  const [reviewModal, setReviewModal] = useState<{
    exchangeId: number;
    otherUserName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchExchanges = async () => {
      if (!user) return;
      try {
        const res = await exchangesAPI.getExchanges();
        setExchanges(res.data);
      } catch (error) {
        console.error('Failed to fetch exchanges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExchanges();
  }, [user]);

  const formatTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return '';
    const expireDate = new Date(expiresAt);
    const diff = expireDate.getTime() - now.getTime();

    if (diff <= 0) return '已过期';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `剩余 ${days} 天 ${hours} 小时`;
    }
    if (hours > 0) {
      return `剩余 ${hours} 小时`;
    }
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `剩余 ${minutes} 分钟`;
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expireDate = new Date(expiresAt);
    const diff = expireDate.getTime() - now.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    return diff > 0 && diff < oneDay;
  };

  const getStatusInfo = (status: ExchangeStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: '待处理',
          color: 'bg-yellow-100 text-yellow-700',
          icon: Clock,
        };
      case 'accepted':
        return {
          label: '已接受',
          color: 'bg-blue-100 text-blue-700',
          icon: Check,
        };
      case 'in_progress':
        return {
          label: '借阅中',
          color: 'bg-purple-100 text-purple-700',
          icon: Play,
        };
      case 'completed':
        return {
          label: '已完成',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle2,
        };
      case 'rejected':
        return {
          label: '已拒绝',
          color: 'bg-red-100 text-red-700',
          icon: X,
        };
      case 'cancelled':
        return {
          label: '已取消',
          color: 'bg-gray-100 text-gray-700',
          icon: XCircle,
        };
      case 'expired':
        return {
          label: '已过期',
          color: 'bg-orange-100 text-orange-700',
          icon: AlertTriangle,
        };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const getStatusBadge = (status: ExchangeStatus) => {
    const info = getStatusInfo(status);
    const Icon = info.icon;
    return (
      <span className={`flex items-center space-x-1 ${info.color} px-3 py-1 rounded-full text-sm`}>
        <Icon className="w-3 h-3" />
        <span>{info.label}</span>
      </span>
    );
  };

  const getStatusTimeline = (exchange: Exchange) => {
    const steps = [
      { key: 'created', label: '发起请求', date: exchange.created_at, done: true },
      {
        key: 'accepted',
        label: '接受请求',
        date: exchange.accepted_at,
        done: ['accepted', 'in_progress', 'completed'].includes(exchange.status),
      },
      {
        key: 'in_progress',
        label: '开始借阅',
        date: exchange.started_at,
        done: ['in_progress', 'completed'].includes(exchange.status),
      },
      {
        key: 'completed',
        label: '交换完成',
        date: exchange.completed_at,
        done: exchange.status === 'completed',
      },
    ];
    return steps;
  };

  const handleAccept = async (id: number) => {
    try {
      await exchangesAPI.acceptExchange(id);
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: 'accepted', accepted_at: new Date().toISOString() }
            : e
        )
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await exchangesAPI.rejectExchange(id);
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: 'rejected', rejected_at: new Date().toISOString() }
            : e
        )
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定要取消这个交换请求吗？')) return;
    try {
      await exchangesAPI.cancelExchange(id);
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: 'cancelled', cancelled_at: new Date().toISOString() }
            : e
        )
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await exchangesAPI.startExchange(id);
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: 'in_progress', started_at: new Date().toISOString() }
            : e
        )
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('确认书籍已归还，交换完成？')) return;
    try {
      await exchangesAPI.completeExchange(id);
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: 'completed',
                completed_at: new Date().toISOString(),
              }
            : e
        )
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      await exchangesAPI.reviewExchange(
        reviewModal.exchangeId,
        reviewRating,
        reviewComment
      );
      setExchanges((prev) =>
        prev.map((e) =>
          e.id === reviewModal.exchangeId
            ? {
                ...e,
                my_review: {
                  id: Date.now(),
                  rating: reviewRating,
                  comment: reviewComment,
                  created_at: new Date().toISOString(),
                },
              }
            : e
        )
      );
      setReviewModal(null);
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      alert('评价失败');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredExchanges = useMemo(() => {
    return exchanges.filter((exchange) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'incoming') return exchange.owner_id === user?.id;
      if (activeTab === 'outgoing') return exchange.requester_id === user?.id;
      if (activeTab === 'completed') return exchange.status === 'completed';
      return true;
    });
  }, [exchanges, activeTab, user?.id]);

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <ArrowLeftRight className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">请先登录查看交换请求</p>
        <Link
          to="/login"
          className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-book-ink font-serif">交换请求</h1>
        <p className="text-gray-500 mt-1">管理你的书籍交换</p>
      </div>

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl inline-flex">
        {[
          { key: 'all', label: '全部' },
          { key: 'incoming', label: '收到的请求' },
          { key: 'outgoing', label: '发出的请求' },
          { key: 'completed', label: '已完成' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-28 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredExchanges.length > 0 ? (
        <div className="space-y-4">
          {filteredExchanges.map((exchange) => {
            const isIncoming = exchange.owner_id === user.id;
            const timeline = getStatusTimeline(exchange);
            const canReview =
              exchange.status === 'completed' && !exchange.my_review;

            return (
              <div
                key={exchange.id}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0">
                  <Link
                    to={`/books/${exchange.book_id}`}
                    className="flex-shrink-0"
                  >
                    {exchange.cover ? (
                      <img
                        src={exchange.cover}
                        alt={exchange.title}
                        className="w-20 h-28 object-cover rounded-lg shadow"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📖</span>
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 md:px-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/books/${exchange.book_id}`}
                          className="text-xl font-semibold text-book-ink hover:text-primary-500 transition-colors"
                        >
                          {exchange.title}
                        </Link>
                        <p className="text-gray-500 mt-1">{exchange.author}</p>
                      </div>
                      {getStatusBadge(exchange.status)}
                    </div>

                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>
                          {isIncoming
                            ? `申请人: ${exchange.requester_name}`
                            : `持有者: ${exchange.owner_name}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-amber-600">
                        <Coins className="w-4 h-4" />
                        <span>{exchange.points_required} 积分</span>
                      </div>
                    </div>

                    {exchange.message && (
                      <p className="text-sm text-gray-500 mt-3 bg-gray-50 px-3 py-2 rounded-lg">
                        "{exchange.message}"
                      </p>
                    )}

                    {exchange.status === 'pending' && exchange.expires_at && (
                      <div
                        className={`flex items-center space-x-2 mt-3 text-sm ${
                          isExpiringSoon(exchange.expires_at)
                            ? 'text-red-500'
                            : 'text-gray-500'
                        }`}
                      >
                        <Timer className="w-4 h-4" />
                        <span>{formatTimeRemaining(exchange.expires_at)}</span>
                        {isExpiringSoon(exchange.expires_at) && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            即将过期
                          </span>
                        )}
                      </div>
                    )}

                    {['accepted', 'in_progress', 'completed'].includes(
                      exchange.status
                    ) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          {timeline.map((step, index) => (
                            <div
                              key={step.key}
                              className="flex-1 flex flex-col items-center relative"
                            >
                              {index < timeline.length - 1 && (
                                <div
                                  className={`absolute top-3 left-1/2 w-full h-0.5 ${
                                    step.done && timeline[index + 1].done
                                      ? 'bg-green-400'
                                      : 'bg-gray-200'
                                  }`}
                                />
                              )}
                              <div
                                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  step.done
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {step.done ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <span
                                className={`text-xs mt-2 ${
                                  step.done
                                    ? 'text-green-600 font-medium'
                                    : 'text-gray-400'
                                }`}
                              >
                                {step.label}
                              </span>
                              {step.date && (
                                <span className="text-xs text-gray-400">
                                  {new Date(step.date).toLocaleDateString(
                                    'zh-CN'
                                  )}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {exchange.status === 'completed' && (
                      <div className="mt-4 space-y-3">
                        {exchange.my_review && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-green-700">
                                我的评价
                              </span>
                              {renderStars(exchange.my_review.rating)}
                            </div>
                            {exchange.my_review.comment && (
                              <p className="text-sm text-gray-600">
                                {exchange.my_review.comment}
                              </p>
                            )}
                          </div>
                        )}
                        {exchange.other_review && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-blue-700">
                                {isIncoming
                                  ? exchange.requester_name
                                  : exchange.owner_name}
                                的评价
                              </span>
                              {renderStars(exchange.other_review.rating)}
                            </div>
                            {exchange.other_review.comment && (
                              <p className="text-sm text-gray-600">
                                {exchange.other_review.comment}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-3 md:min-w-[180px]">
                    {isIncoming && exchange.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReject(exchange.id)}
                          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>拒绝</span>
                        </button>
                        <button
                          onClick={() => handleAccept(exchange.id)}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>接受</span>
                        </button>
                      </div>
                    )}

                    {!isIncoming && exchange.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(exchange.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>取消请求</span>
                      </button>
                    )}

                    {exchange.status === 'accepted' && (
                      <button
                        onClick={() => handleStart(exchange.id)}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-1"
                      >
                        <Play className="w-4 h-4" />
                        <span>开始借阅</span>
                      </button>
                    )}

                    {exchange.status === 'in_progress' && (
                      <button
                        onClick={() => handleComplete(exchange.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>确认归还</span>
                      </button>
                    )}

                    {canReview && (
                      <button
                        onClick={() =>
                          setReviewModal({
                            exchangeId: exchange.id,
                            otherUserName: isIncoming
                              ? exchange.requester_name || ''
                              : exchange.owner_name || '',
                          })
                        }
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-1"
                      >
                        <Star className="w-4 h-4" />
                        <span>去评价</span>
                      </button>
                    )}

                    <p className="text-xs text-gray-400">
                      {new Date(exchange.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl">
          <ArrowLeftRight className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-book-ink mb-2">
            暂无交换请求
          </h3>
          <p className="text-gray-500 mb-6">去书市发现更多好书吧</p>
          <Link
            to="/"
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            浏览书市
          </Link>
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-book-ink mb-4">
              评价 {reviewModal.otherUserName}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评分
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-gray-500 ml-2">
                  {reviewRating} 星
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评价内容（可选）
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="分享一下这次交换的体验..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setReviewRating(5);
                  setReviewComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submittingReview ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exchanges;
