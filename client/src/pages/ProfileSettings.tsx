import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Upload, X, Settings, BookOpen, Award, LayoutGrid, List, Save, Camera } from 'lucide-react';
import { usersAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const READING_TAGS_OPTIONS = [
  '文学小说', '科幻', '悬疑推理', '历史', '哲学',
  '心理学', '经济管理', '科技', '艺术', '传记',
  '漫画', '儿童文学', '诗歌', '散文', '旅行',
  '美食', '养生健康', '职场', '教育', '宗教'
];

const EXPERTISE_FIELDS_OPTIONS = [
  '文学评论', '科幻研究', '历史研究', '哲学思考',
  '心理学分析', '经济学', '编程技术', '艺术鉴赏',
  '传记研究', '教育方法', '职场经验', '投资理财',
  '健康养生', '美食烹饪', '旅行攻略', '写作技巧'
];

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    avatar: '',
    bio: '',
    reading_tags: [] as string[],
    expertise_fields: [] as string[],
    shelf_style: 'grid' as 'grid' | 'list'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await usersAPI.getMyProfile();
        const data = res.data;
        setFormData({
          avatar: data.avatar || '',
          bio: data.bio || '',
          reading_tags: data.reading_tags || [],
          expertise_fields: data.expertise_fields || [],
          shelf_style: data.shelf_style || 'grid'
        });
      } catch (err: any) {
        setError(err.response?.data?.error || '加载失败，请重试');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      handleUploadAvatar(file);
    } else {
      setError('请选择图片文件');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, avatar: res.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.error || '图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: '' }));
  };

  const toggleReadingTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      reading_tags: prev.reading_tags.includes(tag)
        ? prev.reading_tags.filter(t => t !== tag)
        : [...prev.reading_tags, tag]
    }));
  };

  const toggleExpertiseField = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      expertise_fields: prev.expertise_fields.includes(field)
        ? prev.expertise_fields.filter(f => f !== field)
        : [...prev.expertise_fields, field]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await usersAPI.updateProfile(formData);
      await refreshUser();
      setSuccess('保存成功！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-book-ink font-serif">个人资料设置</h1>
            <p className="text-gray-500 text-sm">完善你的个人信息，让大家更好地认识你</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">头像</label>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-28 h-28 bg-primary-50 rounded-full flex items-center justify-center overflow-hidden border-4 border-primary-100">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-primary-400" />
                  )}
                </div>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5" />
                  <span>{uploading ? '上传中...' : '上传头像'}</span>
                </button>
                <p className="text-xs text-gray-400">支持 JPG、PNG、GIF 格式，大小不超过 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="简单介绍一下你自己..."
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{formData.bio.length}/200</p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <label className="block text-sm font-medium text-gray-700">阅读标签</label>
            </div>
            <p className="text-sm text-gray-500 mb-3">选择你感兴趣的阅读类型（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {READING_TAGS_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleReadingTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    formData.reading_tags.includes(tag)
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">已选择 {formData.reading_tags.length} 个标签</p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <label className="block text-sm font-medium text-gray-700">擅长领域</label>
            </div>
            <p className="text-sm text-gray-500 mb-3">选择你擅长的领域，展示你的专业度（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_FIELDS_OPTIONS.map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleExpertiseField(field)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    formData.expertise_fields.includes(field)
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {field}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">已选择 {formData.expertise_fields.length} 个领域</p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <LayoutGrid className="w-5 h-5 text-green-500" />
              <label className="block text-sm font-medium text-gray-700">书架展示风格</label>
            </div>
            <p className="text-sm text-gray-500 mb-3">选择你喜欢的书架展示方式</p>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleChange('shelf_style', 'grid')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.shelf_style === 'grid'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LayoutGrid className={`w-8 h-8 mx-auto mb-2 ${
                  formData.shelf_style === 'grid' ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium text-center ${
                  formData.shelf_style === 'grid' ? 'text-primary-600' : 'text-gray-600'
                }`}>网格布局</p>
                <p className="text-xs text-gray-400 text-center mt-1">封面为主，直观展示</p>
              </button>
              <button
                type="button"
                onClick={() => handleChange('shelf_style', 'list')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.shelf_style === 'list'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <List className={`w-8 h-8 mx-auto mb-2 ${
                  formData.shelf_style === 'list' ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium text-center ${
                  formData.shelf_style === 'list' ? 'text-primary-600' : 'text-gray-600'
                }`}>列表布局</p>
                <p className="text-xs text-gray-400 text-center mt-1">信息详细，便于浏览</p>
              </button>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? '保存中...' : '保存修改'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
