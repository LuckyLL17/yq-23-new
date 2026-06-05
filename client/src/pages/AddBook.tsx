import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookPlus, Upload } from 'lucide-react';
import { booksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AddBook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    cover: '',
    description: '',
    isbn: '',
    category: '',
    condition: '九成新',
    points_required: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const conditions = ['全新', '九成新', '八成新', '七成新', '六成新及以下'];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await booksAPI.getCategories();
        setCategories(res.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await booksAPI.createBook(formData);
      navigate('/my-books');
    } catch (err: any) {
      setError(err.response?.data?.error || '上架失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <BookPlus className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-book-ink font-serif">上架书籍</h1>
            <p className="text-gray-500 text-sm">分享你的闲置书籍，获得积分</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">书名 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入书名"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">作者 *</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入作者"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">请选择分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">书籍状态 *</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                required
              >
                {conditions.map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => handleChange('isbn', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="选填"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">所需积分 *</label>
              <input
                type="number"
                min="1"
                value={formData.points_required}
                onChange={(e) => handleChange('points_required', parseInt(e.target.value) || 10)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">封面图片链接</label>
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={formData.cover}
                  onChange={(e) => handleChange('cover', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>上传</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">书籍简介</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="简单介绍一下这本书..."
              />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-700">
              💡 上架成功后，你将获得 <span className="font-bold">{formData.points_required}</span> 积分
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '上架中...' : '确认上架'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBook;
