import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Trophy,
  Target,
  BookOpen,
  MessageSquare,
  Package,
  Coins,
  Sparkles,
  Lock,
} from 'lucide-react';
import { achievementsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Achievements = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  const achievementTypes = [
    { key: 'all', name: '全部成就', icon: Trophy },
    { key: 'reading', name: '阅读成就', icon: BookOpen },
    { key: 'goal', name: '目标成就', icon: Target },
    { key: 'social', name: '社交成就', icon: MessageSquare },
    { key: 'collection', name: '收藏成就', icon: Package },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [achRes, statsRes] = await Promise.all([
        achievementsAPI.getAchievements(),
        achievementsAPI.getStats(),
      ]);
      setAchievements(achRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = activeTab === 'all'
    ? achievements
    : achievements.filter(a => a.type === activeTab);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reading': return 'from-blue-500 to-blue-600';
      case 'goal': return 'from-green-500 to-green-600';
      case 'social': return 'from-purple-500 to-purple-600';
      case 'collection': return 'from-amber-500 to-amber-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'reading': return 'bg-blue-50 text-blue-600';
      case 'goal': return 'bg-green-50 text-green-600';
      case 'social': return 'bg-purple-50 text-purple-600';
      case 'collection': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getTypeBorder = (type: string) => {
    switch (type) {
      case 'reading': return 'border-blue-200 hover:border-blue-400';
      case 'goal': return 'border-green-200 hover:border-green-400';
      case 'social': return 'border-purple-200 hover:border-purple-400';
      case 'collection': return 'border-amber-200 hover:border-amber-400';
      default: return 'border-gray-200 hover:border-gray-400';
    }
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
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center space-x-3">
              <Trophy className="w-8 h-8" />
              <span>成就墙</span>
            </h1>
            <p className="text-white/80 mt-2">记录你的每一次成长与突破</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {unlockedCount}<span className="text-2xl text-white/60">/{totalCount}</span>
            </div>
            <p className="text-white/80 text-sm mt-1">已解锁成就</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">总进度</span>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white h-3 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.books_read || 0}</div>
              <div className="text-xs text-gray-500">已读书籍</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.goals_completed || 0}</div>
              <div className="text-xs text-gray-500">完成目标</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.posts_made || 0}</div>
              <div className="text-xs text-gray-500">发布帖子</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-book-ink">{stats?.achievements_unlocked || 0}</div>
              <div className="text-xs text-gray-500">解锁成就</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b">
          <div className="flex space-x-1 p-2">
            {achievementTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.key}
                  onClick={() => setActiveTab(type.key)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === type.key
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.name}</span>
                  {type.key !== 'all' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === type.key
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {achievements.filter(a => a.type === type.key).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">暂无成就</h3>
              <p className="text-gray-400 text-sm">继续努力，解锁更多成就吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`relative group border-2 rounded-xl p-4 transition-all duration-300 ${
                    achievement.unlocked
                      ? `${getTypeBorder(achievement.type)} bg-white hover:shadow-md`
                      : 'border-gray-100 bg-gray-50 opacity-75'
                  }`}
                >
                  {achievement.unlocked ? (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-4 h-4 text-gray-300" />
                    </div>
                  )}

                  <div className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${
                        achievement.unlocked
                          ? `bg-gradient-to-br ${getTypeColor(achievement.type)} shadow-md`
                          : 'bg-gray-200 grayscale'
                      }`}
                    >
                      {achievement.unlocked ? (
                        <span>{achievement.icon}</span>
                      ) : (
                        <span className="opacity-40">{achievement.icon}</span>
                      )}
                    </div>

                    <h3 className={`font-semibold mb-1 ${
                      achievement.unlocked ? 'text-book-ink' : 'text-gray-400'
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className={`text-xs mb-3 line-clamp-2 ${
                      achievement.unlocked ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {achievement.description}
                    </p>

                    <div className="flex items-center justify-center space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        achievement.unlocked
                          ? getTypeBg(achievement.type)
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {achievement.condition_value} 个
                      </span>
                      <span className="text-xs text-amber-600 flex items-center space-x-0.5">
                        <Coins className="w-3 h-3" />
                        <span>{achievement.points_reward}</span>
                      </span>
                    </div>

                    {achievement.unlocked && achievement.unlocked_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(achievement.unlocked_at)} 解锁
                      </p>
                    )}

                    {!achievement.unlocked && (
                      <p className="text-xs text-gray-400 mt-2">
                        未解锁
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-book-ink font-serif mb-4 flex items-center space-x-2">
          <Award className="w-6 h-6 text-primary-500" />
          <span>成就说明</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">阅读成就</h4>
              <p className="text-gray-500 text-xs mt-0.5">通过阅读书籍获得，读得越多等级越高</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">目标成就</h4>
              <p className="text-gray-500 text-xs mt-0.5">完成阅读目标获得，见证你的坚持</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">社交成就</h4>
              <p className="text-gray-500 text-xs mt-0.5">通过发帖、交换等社交行为获得</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-book-ink">收藏成就</h4>
              <p className="text-gray-500 text-xs mt-0.5">上架书籍获得，分享你的藏书</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
