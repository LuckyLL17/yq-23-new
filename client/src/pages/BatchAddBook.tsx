import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookPlus,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { booksAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface BookForm {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  isbn: string;
  category: string;
  condition: string;
  points_required: number;
}

const BatchAddBook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [books, setBooks] = useState<BookForm[]>([
    {
      id: '1',
      title: '',
      author: '',
      cover: '',
      description: '',
      isbn: '',
      category: '',
      condition: '九成新',
      points_required: 10
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showUrlInputId, setShowUrlInputId] = useState<string | null>(null);

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

  const addBookForm = () => {
    const newId = Date.now().toString();
    setBooks((prev) => [
      ...prev,
      {
        id: newId,
        title: '',
        author: '',
        cover: '',
        description: '',
        isbn: '',
        category: '',
        condition: '九成新',
        points_required: 10
      }
    ]);
  };

  const removeBookForm = (id: string) => {
    if (books.length <= 1) return;
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBookField = (id: string, field: string, value: any) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      handleUploadImage(file, bookId);
    } else {
      setError('请选择图片文件');
    }
    e.target.value = '';
  };

  const handleUploadImage = async (file: File, bookId: string) => {
    setUploadingId(bookId);
    setError('');
    try {
      const res = await uploadAPI.uploadImage(file);
      updateBookField(bookId, 'cover', res.data.url);
    } catch (err: any) {
      setError(err.response?.data?.error || '图片上传失败，请重试');
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveCover = (bookId: string) => {
    updateBookField(bookId, 'cover', '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validBooks = books.filter((b) => b.title && b.author && b.condition);

    if (validBooks.length === 0) {
      setError('请至少填写一本完整的书籍信息（书名、作者、状态为必填）');
      return;
    }

    setLoading(true);

    try {
      const res = await booksAPI.batchCreateBooks(validBooks);
      alert(`成功上架 ${res.data.created} 本书，获得 ${res.data.total_points_earned} 积分！`);
      navigate('/my-books');
    } catch (err: any) {
      setError(err.response?.data?.error || '批量上架失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = books.reduce(
    (sum, b) => sum + (b.title && b.author ? b.points_required : 0),
    0
  );
  const validCount = books.filter((b) => b.title && b.author && b.condition).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-book-ink font-serif">批量上架书籍</h1>
            <p className="text-gray-500 text-sm">一次添加多本书籍，快速扩充你的书架</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {books.map((book, index) => (
            <div
              key={book.id}
              className="border border-gray-200 rounded-xl p-6 relative"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-book-ink flex items-center space-x-2">
                  <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  <span>书籍 {index + 1}</span>
                  {book.title && (
                    <span className="text-gray-400 text-sm font-normal">
                      - {book.title}
                    </span>
                  )}
                </h3>
                {books.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBookForm(book.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="移除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 md:grid md:grid-cols-2 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      书名 *
                    </label>
                    <input
                      type="text"
                      value={book.title}
                      onChange={(e) =>
                        updateBookField(book.id, 'title', e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="请输入书名"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      作者 *
                    </label>
                    <input
                      type="text"
                      value={book.author}
                      onChange={(e) =>
                        updateBookField(book.id, 'author', e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="请输入作者"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                  <select
                    value={book.category}
                    onChange={(e) =>
                      updateBookField(book.id, 'category', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">请选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    书籍状态 *
                  </label>
                  <select
                    value={book.condition}
                    onChange={(e) =>
                      updateBookField(book.id, 'condition', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  >
                    {conditions.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
                  <input
                    type="text"
                    value={book.isbn}
                    onChange={(e) =>
                      updateBookField(book.id, 'isbn', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="选填"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    所需积分 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={book.points_required}
                    onChange={(e) =>
                      updateBookField(
                        book.id,
                        'points_required',
                        parseInt(e.target.value) || 10
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">封面图片</label>

                  {book.cover ? (
                    <div className="relative inline-block">
                      <img
                        src={book.cover}
                        alt="封面预览"
                        className="w-24 h-36 object-cover rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCover(book.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, book.id)}
                          className="hidden"
                        />
                        <div
                          className={`flex items-center gap-2 px-4 py-3 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors ${
                            uploadingId === book.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="w-5 h-5" />
                          <span>
                            {uploadingId === book.id ? '上传中...' : '上传封面'}
                          </span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowUrlInputId(showUrlInputId === book.id ? null : book.id)
                        }
                        className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ImageIcon className="w-5 h-5 inline mr-1" />
                        <span>使用图片链接</span>
                      </button>
                    </div>
                  )}

                  {showUrlInputId === book.id && !book.cover && (
                    <div className="mt-3">
                      <input
                        type="url"
                        value={book.cover}
                        onChange={(e) =>
                          updateBookField(book.id, 'cover', e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">书籍简介</label>
                  <textarea
                    value={book.description}
                    onChange={(e) =>
                      updateBookField(book.id, 'description', e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="简单介绍一下这本书..."
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addBookForm}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>添加更多书籍</span>
          </button>

          <div className="bg-amber-50 p-4 rounded-lg flex items-center justify-between">
            <p className="text-sm text-amber-700">
              💡 已填写 <span className="font-bold">{validCount}</span> 本完整书籍，
              上架成功后共获得 <span className="font-bold">{totalPoints}</span> 积分
            </p>
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
              disabled={loading || validCount === 0}
              className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <BookPlus className="w-5 h-5" />
              <span>{loading ? '上架中...' : `批量上架 (${validCount}本)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchAddBook;
