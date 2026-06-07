import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Gift,
  User,
  Crown,
  Medal,
  BookOpen,
  TrendingUp,
  Calendar,
  Award,
  Coins,
  Users
} from 'lucide-react';
import { donationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DonationRanking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('all');
  const [type, setType] = useState<string>('total');
  const [totalDonors, setTotalDonors] = useState(0);

  useEffect(() => {
    fetchData();
  }, [period, type]);

  useEffect(() => {
    if (user) {
      fetchMyStats();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await donationsAPI.getDonationRanking({
        period,
        type,
        limit: 20
      });
      setRankings(res.data.rankings);
      setTotalDonors(res.data.total_users);
    } catch (error) {
      console.error('Failed to fetch donation ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStats = async () => {
    try {
      const res = await donationsAPI.getDonationStats();
      setMyStats(res.data);
    } catch (error) {
      console.error('Failed to fetch my stats:', error);
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
          text: 'text-white',
          icon: <Crown className="w-5 h-5" />,
          ring: 'ring-4 ring-yellow-200'
        };
      case 1:
        return {
          bg: 'bg-gradient-to-r from-gray-300 to-gray-400',
          text: 'text-white',
          icon: <Medal className="w-5 h-5" />,
          ring: 'ring-4 ring-gray-200'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-orange-400 to-amber-600',
          text: 'text-white',
          icon: <Medal className="w-5 h-5" />,
          ring: 'ring-4 ring-orange-200'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          icon: null,
          ring: ''
        };
    }
  };

  const handleGoDonate = () => {
    navigate('/donate');
  };

  const handleViewUser = (userId: number) => {
    navigate(`/users/${userId}`);
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
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center space-x-3">
              <Trophy className="w-8 h-8" />
              <span>捐赠排行榜</span>
            </h1>
            <p className="text-white/80 mt-2">致敬每一位爱心捐赠者</p>
          </div>
          <button
            onClick={handleGoDonate}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Gift className="w-4 h-4" />
            <span>我要捐赠</span>
          </button>
        </div>

        {user && myStats && (
          <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-white/70">我的捐赠</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {myStats.my_rank ? `第 ${myStats.my_rank} 名` : '暂无排名'}
                </div>
                <div className="text-sm text-white/70">
                  共 {myStats.total_books || 0} 本 · {myStats.total_donations || 0} 次
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{totalDonors}</div>
              <div className="text-xs text-gray-500">爱心捐赠者</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">
                {rankings.reduce((sum, r) => sum + r.total_books, 0)}
              </div>
              <div className="text-xs text-gray-500">累计捐赠书籍</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">
                {rankings.reduce((sum, r) => sum + r.total_donations, 0)}
              </div>
              <div className="text-xs text-gray-500">累计捐赠次数</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <span className="font-medium text-book-ink">排行榜</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: '全部' },
                { key: 'month', label: '本月' },
                { key: 'week', label: '本周' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPeriod(item.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    period === item.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'total', label: '书籍数' },
                { key: 'count', label: '次数' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setType(item.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    type === item.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4">
          {rankings.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">暂无排行数据</h3>
              <p className="text-gray-400 text-sm">成为第一位爱心捐赠者吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankings.map((item, index) => {
                const style = getRankStyle(index);
                const isMe = user && item.user_id === user.id;

                return (
                  <div
                    key={item.user_id}
                    onClick={() => handleViewUser(item.user_id)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                      isMe
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${style.bg} ${style.text} ${style.ring}`}
                      >
                        {style.icon || (index + 1)}
                      </div>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {item.user_avatar ? (
                          <img src={item.user_avatar} alt={item.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-book-ink flex items-center space-x-2">
                          <span>{item.username}</span>
                          {isMe && (
                            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                              我
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1 mt-0.5">
                          <Gift className="w-3 h-3" />
                          <span>{item.total_donations} 次捐赠</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-book-ink">
                        {item.total_books}
                        <span className="text-sm font-normal text-gray-500 ml-1">本</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-book-ink font-serif mb-4 flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-primary-500" />
          <span>捐赠说明</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">如何参与捐赠</h4>
              <p className="text-gray-500 text-xs mt-0.5">
                点击"我要捐赠"按钮，填写书籍信息即可完成捐赠
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">排行榜规则</h4>
              <p className="text-gray-500 text-xs mt-0.5">
                按照捐赠书籍数量排名，支持查看全部、本月、本周数据
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">捐赠证书</h4>
              <p className="text-gray-500 text-xs mt-0.5">
                每次成功捐赠都会颁发专属电子捐赠证书
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Coins className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">积分奖励</h4>
              <p className="text-gray-500 text-xs mt-0.5">
                每捐赠1本书可获得20积分，积分可用于兑换和交换
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationRanking;
