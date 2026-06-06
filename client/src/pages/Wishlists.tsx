import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Plus,
  Trash2,
  BookOpen,
  Edit3,
  X,
  Check,
  Search,
  Eye,
  ChevronRight,
  ListPlus
} from 'lucide-react';
import { wishlistsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Wishlists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [selectedWishlist, setSelectedWishlist] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchWishlists();
  }, [user, navigate]);

  const fetchWishlists = async () => {
    try {
      setLoading(true);
      const res = await wishlistsAPI.getWishlists();
      setWishlists(res.data);
      if (res.data.length > 0 && !selectedWishlist) {
        const defaultWishlist = res.data.find((w: any) => w.is_default) || res.data[0];
        selectWishlist(defaultWishlist);
      }
    } catch (error) {
      console.error('Failed to fetch wishlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectWishlist = async (wishlist: any) => {
    try {
      setDetailLoading(true);
      setSelectedWishlist(wishlist);
      setSelectedBooks([]);
      const res = await wishlistsAPI.getWishlist(wishlist.id);
      setBooks(res.data.books);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateWishlist = async () => {
    if (!newName.trim()) return;
    try {
      setSubmitting(true);
      const res = await wishlistsAPI.createWishlist(newName, newDescription);
      setWishlists([res.data, ...wishlists]);
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      selectWishlist(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWishlist = async () => {
    if (!selectedWishlist || !editName.trim()) return;
    try {
      setSubmitting(true);
      const res = await wishlistsAPI.updateWishlist(
        selectedWishlist.id,
        editName,
        editDescription
      );
      setWishlists(wishlists.map(w => w.id === selectedWishlist.id ? res.data : w));
      setSelectedWishlist(res.data);
      setShowEditModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!selectedWishlist) return;
    setEditName(selectedWishlist.name);
    setEditDescription(selectedWishlist.description || '');
    setShowEditModal(true);
  };

  const handleDeleteWishlist = async () => {
    if (!selectedWishlist) return;
    try {
      await wishlistsAPI.deleteWishlist(selectedWishlist.id);
      const remaining = wishlists.filter(w => w.id !== selectedWishlist.id);
      setWishlists(remaining);
      setSelectedWishlist(null);
      setBooks([]);
      setShowDeleteConfirm(false);
      if (remaining.length > 0) {
        selectWishlist(remaining[0]);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const toggleSelectBook = (bookId: number) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter(id => id !== bookId));
    } else {
      setSelectedBooks([...selectedBooks, bookId]);
    }
  };

  const handleRemoveSelected = async () => {
    if (!selectedWishlist || selectedBooks.length === 0) return;
    if (!confirm(`确定要从心愿单中移除 ${selectedBooks.length} 本书吗？`)) return;
    try {
      await wishlistsAPI.batchRemoveFromWishlist(selectedWishlist.id, selectedBooks);
      setBooks(books.filter((b: any) => !selectedBooks.includes(b.id)));
      setSelectedBooks([]);
      setWishlists(wishlists.map(w =>
        w.id === selectedWishlist.id
          ? { ...w, book_count: w.book_count - selectedBooks.length }
          : w
      ));
    } catch (err: any) {
      console.error('Failed to remove books:', err);
      alert(err.response?.data?.error || '批量移除失败');
    }
  };

  const handleRemoveSingle = async (bookId: number) => {
    if (!selectedWishlist) return;
    if (!confirm('确定要从心愿单中移除这本书吗？')) return;
    try {
      await wishlistsAPI.removeFromWishlist(selectedWishlist.id, bookId);
      setBooks(books.filter((b: any) => b.id !== bookId));
      setWishlists(wishlists.map(w =>
        w.id === selectedWishlist.id
          ? { ...w, book_count: w.book_count - 1 }
          : w
      ));
    } catch (err: any) {
      console.error('Failed to remove book:', err);
      alert(err.response?.data?.error || '移除失败');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-book-ink font-serif">我的心愿单</h1>
          <p className="text-gray-500 mt-1">收藏你感兴趣的书籍，随时关注动态</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-500 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新建心愿单</span>
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-book-ink flex items-center space-x-2">
                <ListPlus className="w-5 h-5 text-primary-500" />
                <span>心愿单列表</span>
              </h3>
            </div>
            <div className="p-2">
              {wishlists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Heart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无心愿单</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {wishlists.map((wishlist) => (
                    <button
                      key={wishlist.id}
                      onClick={() => selectWishlist(wishlist)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                        selectedWishlist?.id === wishlist.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Heart
                          className={`w-5 h-5 ${
                            selectedWishlist?.id === wishlist.id
                              ? 'text-primary-500 fill-primary-500'
                              : 'text-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium truncate max-w-36">{wishlist.name}</p>
                          <p className="text-xs text-gray-400">{wishlist.book_count} 本书</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {!selectedWishlist ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">选择一个心愿单</h3>
              <p className="text-gray-400">从左侧选择心愿单查看详情，或创建新的心愿单</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-pink-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-2xl font-bold text-book-ink font-serif">
                        {selectedWishlist.name}
                      </h2>
                      {selectedWishlist.is_default && (
                        <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                          默认
                        </span>
                      )}
                    </div>
                    {selectedWishlist.description && (
                      <p className="text-gray-500 mt-2">{selectedWishlist.description}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      共 {books.length} 本书
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={openEditModal}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    {!selectedWishlist.is_default && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedBooks.length > 0 && (
                <div className="px-6 py-3 bg-amber-50 border-b flex items-center justify-between">
                  <span className="text-sm text-amber-700">
                    已选择 {selectedBooks.length} 本
                  </span>
                  <button
                    onClick={handleRemoveSelected}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>批量移除</span>
                  </button>
                </div>
              )}

              {detailLoading ? (
                <div className="p-12 flex justify-center">
                  <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : books.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">心愿单还是空的</h3>
                  <p className="text-gray-400 text-sm mb-4">去书市逛逛，收藏你喜欢的书吧</p>
                  <Link
                    to="/"
                    className="inline-flex items-center space-x-1 text-primary-500 hover:text-primary-600"
                  >
                    <Search className="w-4 h-4" />
                    <span>去发现好书</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {books.map((book: any) => (
                    <div
                      key={book.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center pt-1">
                          <button
                            onClick={() => toggleSelectBook(book.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedBooks.includes(book.id)
                                ? 'bg-primary-500 border-primary-500'
                                : 'border-gray-300 hover:border-primary-400'
                            }`}
                          >
                            {selectedBooks.includes(book.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                        </div>

                        <Link
                          to={`/books/${book.id}`}
                          className="w-20 h-28 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden"
                        >
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
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <Link
                                  to={`/books/${book.id}`}
                                  className="font-semibold text-book-ink hover:text-primary-500 transition-colors"
                                >
                                  {book.title}
                                </Link>
                                {book.is_looking_for && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center space-x-1">
                                    <Eye className="w-3 h-3" />
                                    <span>你正在找</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{book.author}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-amber-600">
                              <span className="font-bold">{book.points_required}</span>
                              <span className="text-xs">积分</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 mt-3">
                            {book.category && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {book.category}
                              </span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {book.condition}
                            </span>
                            {book.holder_name && (
                              <span className="text-xs text-gray-400">
                                持有者：{book.holder_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-400">
                              加入时间：{new Date(book.added_at).toLocaleDateString('zh-CN')}
                            </span>
                            <button
                              onClick={() => handleRemoveSingle(book.id)}
                              className="text-xs text-gray-400 hover:text-red-500 flex items-center space-x-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>移除</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">新建心愿单</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  心愿单名称
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：想读书单"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述（选填）
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="描述一下这个心愿单..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateWishlist}
                disabled={!newName.trim() || submitting}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">编辑心愿单</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  心愿单名称
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEditWishlist}
                disabled={!editName.trim() || submitting}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-book-ink mb-2">删除心愿单</h3>
              <p className="text-gray-500 mb-6">
                确定要删除「{selectedWishlist?.name}」吗？<br />
                此操作不可撤销，里面的书籍也将被移除。
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
                onClick={handleDeleteWishlist}
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

export default Wishlists;
