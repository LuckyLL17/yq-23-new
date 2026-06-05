import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Check, X, Clock, User, Coins } from 'lucide-react';
import { exchangesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Exchanges = () => {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing'>('all');

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

  const handleAccept = async (id: number) => {
    try {
      await exchangesAPI.acceptExchange(id);
      setExchanges((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'accepted' } : e))
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await exchangesAPI.rejectExchange(id);
      setExchanges((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'rejected' } : e))
      );
    } catch (error) {
      alert('操作失败');
    }
  };

  const filteredExchanges = exchanges.filter((exchange) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'incoming') return exchange.owner_id === user?.id;
    if (activeTab === 'outgoing') return exchange.requester_id === user?.id;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
            <Clock className="w-3 h-3" />
            <span>待处理</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
            <Check className="w-3 h-3" />
            <span>已接受</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
            <X className="w-3 h-3" />
            <span>已拒绝</span>
          </span>
        );
      default:
        return null;
    }
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

      <div className="flex space-x-4 bg-white p-2 rounded-xl inline-flex">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'incoming'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          收到的请求
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'outgoing'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          发出的请求
        </button>
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
            return (
              <div
                key={exchange.id}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0">
                  <Link to={`/books/${exchange.book_id}`} className="flex-shrink-0">
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
                    <Link
                      to={`/books/${exchange.book_id}`}
                      className="text-xl font-semibold text-book-ink hover:text-primary-500 transition-colors"
                    >
                      {exchange.title}
                    </Link>
                    <p className="text-gray-500 mt-1">{exchange.author}</p>

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
                  </div>

                  <div className="flex flex-col items-end space-y-3">
                    {getStatusBadge(exchange.status)}

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
          <h3 className="text-xl font-medium text-book-ink mb-2">暂无交换请求</h3>
          <p className="text-gray-500 mb-6">去书市发现更多好书吧</p>
          <Link
            to="/"
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            浏览书市
          </Link>
        </div>
      )}
    </div>
  );
};

export default Exchanges;
