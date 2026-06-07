import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, BookHeart, Upload, X, Image as ImageIcon, Award, Coins } from 'lucide-react';
import { donationsAPI, booksAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DonateBook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    book_title: '',
    book_author: '',
    book_cover: '',
    book_category: '',
    book_condition: '九成新',
    quantity: 1,
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const conditions = ['全新', '九成新', '八成新', '七成新', '六成新及以下'];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchCategories = async () => {
      try {
        const res = await booksAPI.getCategories();
        setCategories(res.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await donationsAPI.createDonation(formData);
      setResultData(res.data);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || '捐赠提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      handleUploadImage(file);
    } else {
      setError('请选择图片文件');
    }
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, book_cover: res.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.error || '图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = () => {
    setFormData((prev) => ({ ...prev, book_cover: '' }));
  };

  const pointsEarned = 20 * formData.quantity;

  const handleViewCertificate = () => {
    if (resultData?.donation?.id) {
      navigate(`/donations/${resultData.donation.id}/certificate`);
    }
  };

  const handleViewRecords = () => {
    navigate('/donations/records');
  };

  if (showSuccess && resultData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-book-ink font-serif mb-2">捐赠成功！</h1>
          <p className="text-gray-500 mb-6">感谢您的爱心捐赠，您将获得专属捐赠证书</p>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Coins className="w-5 h-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-700">+{resultData.points_earned} 积分</span>
            </div>
            <p className="text-sm text-amber-600">捐赠奖励积分已到账</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-medium text-book-ink mb-3">捐赠详情</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">书籍名称</span>
                <span className="text-book-ink font-medium">{resultData.donation.book_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">作者</span>
                <span className="text-book-ink">{resultData.donation.book_author}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">数量</span>
                <span className="text-book-ink">{resultData.donation.quantity} 本</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">证书编号</span>
                <span className="text-primary-600 font-mono text-xs">{resultData.certificate.certificate_no}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleViewRecords}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              查看我的捐赠
            </button>
            <button
              onClick={handleViewCertificate}
              className="flex-1 bg-gradient-to-r from-primary-500 to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              <Award className="w-5 h-5" />
              <span>查看证书</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-book-ink font-serif">书籍捐赠</h1>
            <p className="text-gray-500 text-sm">捐赠您的闲置书籍，传递知识与温暖</p>
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
                value={formData.book_title}
                onChange={(e) => handleChange('book_title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入书名"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">作者 *</label>
              <input
                type="text"
                value={formData.book_author}
                onChange={(e) => handleChange('book_author', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入作者"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
              <select
                value={formData.book_category}
                onChange={(e) => handleChange('book_category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">请选择分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">书籍状况 *</label>
              <select
                value={formData.book_condition}
                onChange={(e) => handleChange('book_condition', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                required
              >
                {conditions.map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">捐赠数量 *</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div className="flex items-end">
              <div className="bg-pink-50 px-4 py-3 rounded-lg flex items-center space-x-2">
                <Coins className="w-5 h-5 text-pink-600" />
                <div>
                  <div className="text-lg font-bold text-pink-700">+{pointsEarned}</div>
                  <div className="text-xs text-pink-500">预计获得积分</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">封面图片</label>
              
              {formData.book_cover ? (
                <div className="relative inline-block">
                  <img
                    src={formData.book_cover}
                    alt="封面预览"
                    className="w-32 h-48 object-cover rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-3 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{uploading ? '上传中...' : '上传封面'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 inline mr-1" />
                    <span>使用图片链接</span>
                  </button>
                </div>
              )}

              {showUrlInput && !formData.book_cover && (
                <div className="mt-3">
                  <input
                    type="url"
                    value={formData.book_cover}
                    onChange={(e) => handleChange('book_cover', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              )}

              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">捐赠寄语</label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="写下您想对受赠者说的话..."
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-50 to-orange-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <BookHeart className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-pink-700 font-medium">爱心捐赠说明</p>
                <p className="text-xs text-pink-600 mt-1">
                  每捐赠1本书可获得 <span className="font-bold">20</span> 积分，捐赠成功后立即颁发电子捐赠证书。
                  您的爱心将帮助更多人获得阅读的机会。
                </p>
              </div>
            </div>
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
              className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Gift className="w-5 h-5" />
              <span>{loading ? '提交中...' : '确认捐赠'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonateBook;
