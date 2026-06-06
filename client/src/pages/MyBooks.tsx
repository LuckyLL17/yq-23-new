import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookCopy,
  Plus,
  BookOpen,
  LayoutGrid,
  List,
  Coins,
  CheckSquare,
  Square,
  Download,
  Edit3,
  Tag,
  Trash2,
  X,
  Layers,
  Check,
  ChevronDown
} from 'lucide-react';
import { booksAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BookCard from '../components/BookCard';

const MyBooks = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shelfStyle, setShelfStyle] = useState<'grid' | 'list'>('grid');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    category: '',
    condition: '',
    status: '',
    points_required: ''
  });
  const [batchLoading, setBatchLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const conditions = ['全新', '九成新', '八成新', '七成新', '六成新及以下'];
  const statuses = [
    { value: 'available', label: '可借阅' },
    { value: 'unavailable', label: '不可借阅' }
  ];

  useEffect(() => {
    const fetchStyle = async () => {
      if (!user) return;
      try {
        const res = await usersAPI.getMyProfile();
        if (res.data.shelf_style) {
          setShelfStyle(res.data.shelf_style as 'grid' | 'list');
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchStyle();
  }, [user]);

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
    const fetchMyBooks = async () => {
      if (!user) return;
      try {
        const res = await booksAPI.getBooks({ owner_id: user.id });
        setBooks(res.data);
      } catch (error) {
        console.error('Failed to fetch my books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyBooks();
  }, [user]);

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds([]);
    }
  }, [selectMode]);

  const handleStyleChange = async (style: 'grid' | 'list') => {
    setShelfStyle(style);
    if (user) {
      try {
        await usersAPI.updateProfile({ shelf_style: style });
        await refreshUser();
      } catch (error) {
        console.error('Failed to update shelf style:', error);
      }
    }
  };

  const toggleSelect = (bookId: number) => {
    setSelectedIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === books.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(books.map((b) => b.id));
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const refreshBooks = async () => {
    if (!user) return;
    try {
      const res = await booksAPI.getBooks({ owner_id: user.id });
      setBooks(res.data);
    } catch (error) {
      console.error('Failed to refresh books:', error);
    }
  };

  const handleBatchCategory = async (category: string) => {
    setShowCategoryDropdown(false);
    if (selectedIds.length === 0) return;

    try {
      setBatchLoading(true);
      await booksAPI.batchUpdateBooks(selectedIds, { category });
      showSuccess(`已成功设置 ${selectedIds.length} 本书的分类`);
      setSelectMode(false);
      setSelectedIds([]);
      refreshBooks();
    } catch (error: any) {
      console.error('Failed to batch set category:', error);
      alert(error.response?.data?.error || '设置分类失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchEdit = async () => {
    if (selectedIds.length === 0) return;

    const updates: any = {};
    if (batchEditData.category) updates.category = batchEditData.category;
    if (batchEditData.condition) updates.condition = batchEditData.condition;
    if (batchEditData.status) updates.status = batchEditData.status;
    if (batchEditData.points_required)
      updates.points_required = parseInt(batchEditData.points_required);

    if (Object.keys(updates).length === 0) {
      alert('请至少选择一项要修改的内容');
      return;
    }

    try {
      setBatchLoading(true);
      await booksAPI.batchUpdateBooks(selectedIds, updates);
      showSuccess(`已成功编辑 ${selectedIds.length} 本书`);
      setShowBatchEditModal(false);
      setSelectMode(false);
      setSelectedIds([]);
      setBatchEditData({ category: '', condition: '', status: '', points_required: '' });
      refreshBooks();
    } catch (error: any) {
      console.error('Failed to batch edit:', error);
      alert(error.response?.data?.error || '批量编辑失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await booksAPI.exportBooks(format, selectedIds.length > 0 ? selectedIds : undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `books_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('导出成功');
    } catch (error) {
      console.error('Failed to export books:', error);
      alert('导出失败');
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 本书吗？此操作不可恢复。`)) {
      return;
    }

    try {
      setBatchLoading(true);
      for (const id of selectedIds) {
        await booksAPI.deleteBook(id);
      }
      showSuccess(`已删除 ${selectedIds.length} 本书`);
      setSelectMode(false);
      setSelectedIds([]);
      refreshBooks();
    } catch (error: any) {
      console.error('Failed to batch delete:', error);
      alert(error.response?.data?.error || '删除失败');
    } finally {
      setBatchLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <BookCopy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">请先登录查看你的书架</p>
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
    <div className="space-y-6">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <Check className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-book-ink font-serif">我的书架</h1>
          <p className="text-gray-500 mt-1">
            共 {books.length} 本藏书
            {selectMode && selectedIds.length > 0 && (
              <span className="ml-2 text-primary-600">
                已选择 {selectedIds.length} 本
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectMode && (
            <button
              onClick={() => setSelectMode(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>取消选择</span>
            </button>
          )}
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            <button
              onClick={() => setSelectMode(!selectMode)}
              className={`p-2 rounded-md transition-colors ${
                selectMode
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="批量选择"
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStyleChange('grid')}
              className={`p-2 rounded-md transition-colors ${
                shelfStyle === 'grid'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="网格视图"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStyleChange('list')}
              className={`p-2 rounded-md transition-colors ${
                shelfStyle === 'list'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="列表视图"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <Link
            to="/add-book"
            className="bg-primary-500 text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>上架新书</span>
          </Link>
          <Link
            to="/batch-add-book"
            className="bg-white text-primary-600 border border-primary-500 px-5 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors flex items-center space-x-2"
          >
            <Layers className="w-5 h-5" />
            <span>批量上架</span>
          </Link>
        </div>
      </div>

      {selectMode && books.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              {selectedIds.length === books.length ? (
                <CheckSquare className="w-5 h-5 text-primary-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span>全选</span>
            </button>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              已选择 <span className="font-medium text-primary-600">{selectedIds.length}</span> / {books.length} 本
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Tag className="w-4 h-4" />
                <span>设置分类</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleBatchCategory(cat)}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowBatchEditModal(true)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>批量编辑</span>
            </button>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleExport('json')}
                disabled={selectedIds.length === 0}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                导出 JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={selectedIds.length === 0}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                导出 CSV
              </button>
            </div>
            <button
              onClick={handleBatchDelete}
              disabled={selectedIds.length === 0 || batchLoading}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        shelfStyle === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-64 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse flex space-x-4">
                <div className="w-24 h-36 bg-gray-200 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-20 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : books.length > 0 ? (
        shelfStyle === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <div key={book.id} className="relative group">
                {selectMode && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelect(book.id);
                    }}
                    className="absolute top-3 left-3 z-10 w-6 h-6 rounded bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  >
                    {selectedIds.includes(book.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
                <Link to={`/books/${book.id}`}>
                  <BookCard book={book} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <div key={book.id} className="relative">
                {selectMode && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelect(book.id);
                    }}
                    className="absolute top-4 left-4 z-10 w-6 h-6 rounded bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  >
                    {selectedIds.includes(book.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
                <Link
                  to={`/books/${book.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex space-x-4">
                    <div className="w-24 h-36 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                          <span className="text-2xl">📖</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="text-lg font-semibold text-book-ink group-hover:text-primary-500 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">{book.author}</p>
                        {book.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                            {book.description}
                          </p>
                        )}
                        {book.category && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-primary-100 text-primary-600 rounded">
                            {book.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {book.condition}
                        </span>
                        <div className="flex items-center space-x-1 text-amber-600">
                          <Coins className="w-4 h-4" />
                          <span className="font-medium text-sm">{book.points_required} 积分</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl">
          <BookOpen className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-book-ink mb-2">书架空空如也</h3>
          <p className="text-gray-500 mb-6">分享你的闲置书籍，开启漂流之旅</p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              to="/add-book"
              className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              上架第一本书
            </Link>
            <Link
              to="/batch-add-book"
              className="inline-block bg-white border border-primary-500 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              批量上架
            </Link>
          </div>
        </div>
      )}

      {showBatchEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-book-ink">批量编辑</h2>
                <button
                  onClick={() => setShowBatchEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                已选择 <span className="font-medium text-primary-600">{selectedIds.length}</span> 本书
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <select
                  value={batchEditData.category}
                  onChange={(e) =>
                    setBatchEditData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">不修改</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">书籍状态</label>
                <select
                  value={batchEditData.condition}
                  onChange={(e) =>
                    setBatchEditData((prev) => ({ ...prev, condition: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">不修改</option>
                  {conditions.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">借阅状态</label>
                <select
                  value={batchEditData.status}
                  onChange={(e) =>
                    setBatchEditData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">不修改</option>
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">所需积分</label>
                <input
                  type="number"
                  min="1"
                  placeholder="不修改请留空"
                  value={batchEditData.points_required}
                  onChange={(e) =>
                    setBatchEditData((prev) => ({ ...prev, points_required: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex space-x-4">
              <button
                onClick={() => setShowBatchEditModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchEdit}
                disabled={batchLoading}
                className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchLoading ? '处理中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooks;
