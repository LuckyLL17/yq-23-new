import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  MapPin,
  Calendar,
  Clock,
  Users,
  User,
  BookMarked,
  ArrowLeft,
  Edit3,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { readingClubsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ReadingClubDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchClubDetail();
  }, [id]);

  const fetchClubDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await readingClubsAPI.getClub(parseInt(id));
      setClub(res.data);
    } catch (error) {
      console.error('Failed to fetch club detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    try {
      await readingClubsAPI.registerClub(parseInt(id));
      fetchClubDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || '报名失败');
    }
  };

  const handleCancelRegistration = async () => {
    if (!confirm('确定要取消报名吗？')) return;
    if (!id) return;
    try {
      await readingClubsAPI.cancelRegistration(parseInt(id));
      fetchClubDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || '取消失败');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await readingClubsAPI.deleteClub(parseInt(id));
      navigate('/reading-clubs');
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return '即将开始';
      case 'ongoing': return '进行中';
      case 'ended': return '已结束';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-green-600 bg-green-50';
      case 'ongoing': return 'text-blue-600 bg-blue-50';
      case 'ended': return 'text-gray-600 bg-gray-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500">活动不存在</p>
        <Link
          to="/reading-clubs"
          className="inline-flex items-center space-x-1 text-primary-500 hover:text-primary-600 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回列表</span>
        </Link>
      </div>
    );
  }

  const isOrganizer = user && club.organizer_id === user.id;
  const canRegister = !isOrganizer && (club.status === 'upcoming' || club.status === 'ongoing');

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-64 bg-gradient-to-br from-primary-200 to-purple-200 relative">
          {club.cover_image ? (
            <img
              src={club.cover_image}
              alt={club.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-24 h-24 text-white/50" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(club.status)}`}>
              {getStatusText(club.status)}
            </span>
          </div>
          {isOrganizer && (
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => navigate(`/reading-clubs/${club.id}/edit`)}
                className="p-2 bg-white/90 rounded-lg text-gray-600 hover:text-primary-500 hover:bg-white transition-colors"
                title="编辑活动"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-white/90 rounded-lg text-gray-600 hover:text-red-500 hover:bg-white transition-colors"
                title="删除活动"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          <h1 className="text-3xl font-bold text-book-ink font-serif mb-4">
            {club.title}
          </h1>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-book-ink">{club.organizer_name}</p>
                <p className="text-xs text-gray-500">发起人</p>
              </div>
            </div>
            {club.book_title && (
              <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                <BookMarked className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">{club.book_title}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">活动时间</p>
                  <p className="font-medium text-book-ink text-sm">{formatDate(club.start_time)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">起止时间</p>
                  <p className="font-medium text-book-ink text-sm">
                    {formatTime(club.start_time)} - {formatTime(club.end_time)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">参与人数</p>
                  <p className="font-medium text-book-ink text-sm">
                    {club.participant_count}/{club.max_participants} 人
                    {club.is_full && <span className="text-red-500 ml-1">（已满）</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-book-ink">活动地点</p>
                <p className="text-gray-600">{club.location}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-book-ink mb-3">活动介绍</h3>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
              {club.description}
            </div>
          </div>

          {canRegister && (
            <div className="pt-4 border-t border-gray-100">
              {club.is_registered ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">已报名成功</span>
                  </div>
                  <button
                    onClick={handleCancelRegistration}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消报名
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={club.is_full}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    club.is_full
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {club.is_full ? '报名人数已满' : '立即报名参加'}
                </button>
              )}
            </div>
          )}

          {isOrganizer && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-3">您是本次活动的发起人</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate(`/reading-clubs/${club.id}/edit`)}
                  className="flex-1 py-2.5 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>编辑活动</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除活动</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-book-ink mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary-500" />
          <span>参与人员 ({club.participants?.length || 0})</span>
        </h3>

        {!club.participants || club.participants.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无参与人员</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {club.participants.map((p: any) => (
              <div key={p.id} className="text-center">
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="w-7 h-7 text-primary-600" />
                </div>
                <p className="font-medium text-sm text-book-ink truncate">{p.user_name}</p>
                {p.status === 'attended' && (
                  <span className="text-xs text-green-600">已参加</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-book-ink mb-2">删除活动</h3>
              <p className="text-gray-500 mb-6">
                确定要删除「{club.title}」吗？<br />
                此操作不可撤销。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingClubDetail;
