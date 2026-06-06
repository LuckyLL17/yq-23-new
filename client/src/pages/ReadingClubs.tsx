import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  X,
  MapPin,
  Calendar,
  Users,
  Search,
  Filter,
  Clock,
  BookMarked,
  User,
  Edit3,
  Trash2
} from 'lucide-react';
import { readingClubsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ReadingClubs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'organized' | 'registered'>('all');
  const [myClubs, setMyClubs] = useState<any>({ organized: [], registered: [] });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('start_time');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newMaxParticipants, setNewMaxParticipants] = useState(20);
  const [newCoverImage, setNewCoverImage] = useState('');

  useEffect(() => {
    fetchClubs();
  }, [searchKeyword, statusFilter, sortBy, page]);

  useEffect(() => {
    if (user) {
      fetchMyClubs();
    }
  }, [user]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const params: any = {
        sort_by: sortBy,
        sort_order: 'asc',
        page,
        limit: 10,
      };
      if (searchKeyword) params.search = searchKeyword;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await readingClubsAPI.getClubs(params);
      setClubs(res.data.clubs);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    try {
      const res = await readingClubsAPI.getMyClubs();
      setMyClubs(res.data);
    } catch (error) {
      console.error('Failed to fetch my clubs:', error);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewBookTitle('');
    setNewLocation('');
    setNewStartTime('');
    setNewEndTime('');
    setNewMaxParticipants(20);
    setNewCoverImage('');
  };

  const handleCreateClub = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !newLocation.trim() || !newStartTime || !newEndTime) {
      alert('请填写完整信息');
      return;
    }

    try {
      setSubmitting(true);
      const res = await readingClubsAPI.createClub({
        title: newTitle,
        description: newDescription,
        book_title: newBookTitle || undefined,
        location: newLocation,
        start_time: newStartTime,
        end_time: newEndTime,
        max_participants: newMaxParticipants,
        cover_image: newCoverImage || undefined,
      });
      setClubs([res.data, ...clubs]);
      setShowCreateModal(false);
      resetCreateForm();
      fetchMyClubs();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!deleteTarget) return;
    try {
      await readingClubsAPI.deleteClub(deleteTarget.id);
      setClubs(clubs.filter(c => c.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchMyClubs();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const handleRegister = async (clubId: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await readingClubsAPI.registerClub(clubId);
      fetchClubs();
      fetchMyClubs();
    } catch (err: any) {
      alert(err.response?.data?.error || '报名失败');
    }
  };

  const handleCancelRegistration = async (clubId: number) => {
    if (!confirm('确定要取消报名吗？')) return;
    try {
      await readingClubsAPI.cancelRegistration(clubId);
      fetchClubs();
      fetchMyClubs();
    } catch (err: any) {
      alert(err.response?.data?.error || '取消失败');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
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

  const getDisplayClubs = () => {
    if (activeTab === 'organized') return myClubs.organized || [];
    if (activeTab === 'registered') return myClubs.registered || [];
    return clubs;
  };

  if (loading && activeTab === 'all') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-book-ink font-serif">线下读书会</h1>
        <p className="text-gray-500 mt-1">以书会友，线下相聚共读</p>
      </div>
      {user && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-500 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>发起活动</span>
        </button>
      )}
    </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              全部活动
            </button>
            {user && (
              <>
                <button
                  onClick={() => setActiveTab('organized')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'organized'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  我发起的
                </button>
                <button
                  onClick={() => setActiveTab('registered')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'registered'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  我报名的
                </button>
              </>
            )}
          </div>

          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
                placeholder="搜索活动名称、地点或书籍..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              <option value="all">全部状态</option>
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="ended">已结束</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              <option value="start_time">按时间排序</option>
              <option value="created_at">按发布排序</option>
              <option value="participants">按人气排序</option>
            </select>
          </div>
        </div>
      </div>

      {getDisplayClubs().length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">
            {activeTab === 'all' ? '暂无读书会活动' :
             activeTab === 'organized' ? '还没有发起过活动' : '还没有报名任何活动'}
          </h3>
          <p className="text-gray-400 mb-4">
            {activeTab === 'all' ? '快来发起第一个读书会活动吧' : '去看看有哪些精彩活动'}
          </p>
          {user && activeTab !== 'organized' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-1 text-primary-500 hover:text-primary-600"
            >
              <Plus className="w-4 h-4" />
              <span>发起活动</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getDisplayClubs().map((club: any) => (
            <div
              key={club.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link to={`/reading-clubs/${club.id}`} className="block">
                <div className="h-48 bg-gradient-to-br from-primary-100 to-purple-100 relative overflow-hidden">
                  {club.cover_image ? (
                    <img
                      src={club.cover_image}
                      alt={club.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-primary-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(club.status)}`}>
                      {getStatusText(club.status)}
                    </span>
                  </div>
                  {club.book_title && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs bg-white/90 text-book-ink px-2 py-1 rounded-full flex items-center space-x-1">
                        <BookMarked className="w-3 h-3" />
                        <span>{club.book_title}</span>
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link to={`/reading-clubs/${club.id}`}>
                  <h3 className="font-bold text-lg text-book-ink mb-2 line-clamp-2 hover:text-primary-500 transition-colors">
                    {club.title}
                  </h3>
                </Link>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateTime(club.start_time)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(club.start_time)} - {formatTime(club.end_time)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{club.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>
                      {club.participant_count}/{club.max_participants} 人
                    </span>
                    {club.is_full && (
                      <span className="text-xs text-red-500">（已满）</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm text-gray-600">{club.organizer_name}</span>
                  </div>

                  {user && club.organizer_id !== user.id && (
                    club.is_registered ? (
                      <button
                        onClick={() => handleCancelRegistration(club.id)}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                      >
                        取消报名
                      </button>
                    ) : club.status === 'upcoming' || club.status === 'ongoing' ? (
                      <button
                        onClick={() => handleRegister(club.id)}
                        disabled={club.is_full}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          club.is_full
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                        }`}
                      >
                        {club.is_full ? '已满员' : '立即报名'}
                      </button>
                    ) : null
                  )}

                  {user && club.organizer_id === user.id && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => navigate(`/reading-clubs/${club.id}/edit`)}
                        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(club); setShowDeleteConfirm(true); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'all' && total > 10 && (
        <div className="flex justify-center pt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              第 {page} 页 / 共 {Math.ceil(total / 10)} 页
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 10)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">发起读书会活动</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  活动标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：《百年孤独》共读会"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  活动描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="描述一下活动内容、流程安排等..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  讨论书籍（选填）
                </label>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="例如：百年孤独"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  活动地点 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="例如：城市书房·南京路店"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    开始时间 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束时间 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最大参与人数
                </label>
                <input
                  type="number"
                  value={newMaxParticipants}
                  onChange={(e) => setNewMaxParticipants(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  封面图片链接（选填）
                </label>
                <input
                  type="text"
                  value={newCoverImage}
                  onChange={(e) => setNewCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateClub}
                disabled={!newTitle.trim() || !newDescription.trim() || !newLocation.trim() || !newStartTime || !newEndTime || submitting}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-book-ink mb-2">删除活动</h3>
              <p className="text-gray-500 mb-6">
                确定要删除「{deleteTarget.title}」吗？<br />
                此操作不可撤销。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteClub}
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

export default ReadingClubs;
