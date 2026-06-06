import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  Clock,
  Users,
  BookMarked
} from 'lucide-react';
import { readingClubsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ReadingClubEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState('upcoming');

  useEffect(() => {
    if (!id) return;
    fetchClubData();
  }, [id]);

  const fetchClubData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await readingClubsAPI.getClub(parseInt(id));
      const club = res.data;

      if (user && club.organizer_id !== user.id) {
        alert('只有活动发起人可以编辑');
        navigate(`/reading-clubs/${id}`);
        return;
      }

      setTitle(club.title);
      setDescription(club.description);
      setBookTitle(club.book_title || '');
      setLocation(club.location);
      setStartTime(formatDateTimeLocal(club.start_time));
      setEndTime(formatDateTimeLocal(club.end_time));
      setMaxParticipants(club.max_participants);
      setCoverImage(club.cover_image || '');
      setStatus(club.status);
    } catch (error: any) {
      console.error('Failed to fetch club:', error);
      if (error.response?.status === 404) {
        alert('活动不存在');
        navigate('/reading-clubs');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !location.trim() || !startTime || !endTime) {
      alert('请填写完整信息');
      return;
    }

    if (!id) return;

    try {
      setSubmitting(true);
      await readingClubsAPI.updateClub(parseInt(id), {
        title,
        description,
        book_title: bookTitle || undefined,
        location,
        start_time: startTime,
        end_time: endTime,
        max_participants: maxParticipants,
        cover_image: coverImage || undefined,
        status,
      });
      alert('保存成功');
      navigate(`/reading-clubs/${id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '保存失败');
    } finally {
      setSubmitting(false);
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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-book-ink font-serif mb-6">编辑读书会活动</h1>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              活动标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：《百年孤独》共读会"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              活动描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下活动内容、流程安排等..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <BookMarked className="w-4 h-4 inline mr-1" />
              讨论书籍（选填）
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="例如：百年孤独"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1" />
              活动地点 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：城市书房·南京路店"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Clock className="w-4 h-4 inline mr-1" />
                结束时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Users className="w-4 h-4 inline mr-1" />
                最大参与人数
              </label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                活动状态
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="upcoming">即将开始</option>
                <option value="ongoing">进行中</option>
                <option value="ended">已结束</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              封面图片链接（选填）
            </label>
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-100">
          <Link
            to={`/reading-clubs/${id}`}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-center"
          >
            取消
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || !location.trim() || !startTime || !endTime || submitting}
            className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? '保存中...' : '保存修改'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingClubEdit;
