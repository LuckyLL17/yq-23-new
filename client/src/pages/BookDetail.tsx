import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Coins, User, Star, MessageSquare, ArrowLeft, Send, Heart, ChevronDown, Check, Plus, X } from 'lucide-react';
import { booksAPI, exchangesAPI, wishlistsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [driftRecords, setDriftRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [addingNote, setAddingNote] = useState(false);
  const [exchangeMessage, setExchangeMessage] = useState('');
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [wishlistStatus, setWishlistStatus] = useState<{ is_in_wishlist: boolean; wishlists: any[] }>({
    is_in_wishlist: false,
    wishlists: []
  });
  const [showWishlistDropdown, setShowWishlistDropdown] = useState(false);
  const [showNewWishlistModal, setShowNewWishlistModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDesc, setNewWishlistDesc] = useState('');
  const [creatingWishlist, setCreatingWishlist] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [bookRes, recordsRes] = await Promise.all([
          booksAPI.getBook(parseInt(id)),
          booksAPI.getDriftRecords(parseInt(id))
        ]);
        setBook(bookRes.data);
        setDriftRecords(recordsRes.data);
      } catch (error) {
        console.error('Failed to fetch book:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      fetchWishlistData();
    }
  }, [user, id]);

  const fetchWishlistData = async () => {
    if (!id) return;
    try {
      const [wishlistsRes, statusRes] = await Promise.all([
        wishlistsAPI.getWishlists(),
        wishlistsAPI.checkWishlistStatus(parseInt(id))
      ]);
      setWishlists(wishlistsRes.data);
      setWishlistStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to fetch wishlist data:', error);
    }
  };

  const handleExchange = async () => {
    if (!user || !book) return;
    setExchangeLoading(true);
    try {
      await exchangesAPI.requestExchange(book.id, exchangeMessage);
      setShowExchangeModal(false);
      alert('交换请求已发送！');
    } catch (err: any) {
      alert(err.response?.data?.error || '请求失败');
    } finally {
      setExchangeLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!user || !book || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await booksAPI.addDriftRecord(book.id, {
        notes: newNote,
        rating: newRating,
        read_date: new Date().toISOString().split('T')[0]
      });
      setNewNote('');
      setNewRating(5);
      const res = await booksAPI.getDriftRecords(book.id);
      setDriftRecords(res.data);
    } catch (error) {
      alert('添加笔记失败');
    } finally {
      setAddingNote(false);
    }
  };

  const handleToggleWishlistItem = async (wishlistId: number) => {
    if (!book) return;
    const isInThisWishlist = wishlistStatus.wishlists.some(w => w.id === wishlistId);

    try {
      if (isInThisWishlist) {
        await wishlistsAPI.removeFromWishlist(wishlistId, book.id);
      } else {
        await wishlistsAPI.addToWishlist(wishlistId, book.id);
      }
      fetchWishlistData();
    } catch (err: any) {
      console.error('Failed to toggle wishlist item:', err);
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) return;
    try {
      setCreatingWishlist(true);
      const res = await wishlistsAPI.createWishlist(newWishlistName, newWishlistDesc);
      if (book) {
        await wishlistsAPI.addToWishlist(res.data.id, book.id);
      }
      setShowNewWishlistModal(false);
      setNewWishlistName('');
      setNewWishlistDesc('');
      fetchWishlistData();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    } finally {
      setCreatingWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">书籍不存在</p>
      </div>
    );
  }

  const isOwner = user && user.id === book.current_holder_id;

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回</span>
      </button>

      <div className="relative">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 bg-gray-100 p-8 flex items-center justify-center">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="max-w-full max-h-80 object-contain shadow-lg rounded-lg"
                />
              ) : (
                <div className="w-48 h-72 bg-gradient-to-br from-primary-200 to-primary-300 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-6xl">📖</span>
                </div>
              )}
            </div>
            <div className="md:w-2/3 p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-book-ink font-serif">{book.title}</h1>
                  <p className="text-xl text-gray-600 mt-2">{book.author}</p>
                </div>
                <div className="flex items-center space-x-2 bg-amber-50 px-4 py-2 rounded-lg">
                  <Coins className="w-6 h-6 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-700">{book.points_required}</span>
                </div>
              </div>

              {book.category && (
                <div className="mt-4">
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm">
                    {book.category}
                  </span>
                  <span className="ml-2 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                    {book.condition}
                  </span>
                </div>
              )}

              <p className="mt-6 text-gray-600 leading-relaxed">{book.description}</p>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">当前持有者</p>
                      <p className="font-medium text-book-ink">{book.holder_name}</p>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
                      这本书在你的书架上
                    </div>
                  )}
                </div>

                {user && (
                  <div className="flex items-center space-x-3 mt-4">
                    {!isOwner && (
                      <button
                        onClick={() => setShowExchangeModal(true)}
                        className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                      >
                        请求交换
                      </button>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => setShowWishlistDropdown(!showWishlistDropdown)}
                        className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-lg font-medium transition-colors ${
                          wishlistStatus.is_in_wishlist
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${wishlistStatus.is_in_wishlist ? 'fill-current' : ''}`} />
                        <span>{wishlistStatus.is_in_wishlist ? '已收藏' : '收藏'}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showWishlistDropdown && user && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowWishlistDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
              <div className="p-3 border-b bg-gray-50">
                <p className="text-sm font-medium text-gray-700">添加到心愿单</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {wishlists.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    暂无心愿单
                  </div>
                ) : (
                  wishlists.map((wl: any) => {
                    const isIn = wishlistStatus.wishlists.some(w => w.id === wl.id);
                    return (
                      <button
                        key={wl.id}
                        onClick={() => handleToggleWishlistItem(wl.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Heart className={`w-4 h-4 ${isIn ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} />
                          <span className={isIn ? 'text-primary-700 font-medium' : 'text-gray-700'}>
                            {wl.name}
                          </span>
                        </div>
                        {isIn && <Check className="w-4 h-4 text-primary-500" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowWishlistDropdown(false);
                    setShowNewWishlistModal(true);
                  }}
                  className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建心愿单</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-book-ink font-serif mb-6 flex items-center space-x-2">
          <MessageSquare className="w-6 h-6 text-primary-500" />
          <span>漂流记录</span>
        </h2>

        {user && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-book-ink mb-3">留下你的阅读感想</h3>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm text-gray-600">评分：</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setNewRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= newRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="写下你的读后感..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{addingNote ? '发布中...' : '发布'}</span>
              </button>
            </div>
          </div>
        )}

        {driftRecords.length > 0 ? (
          <div className="relative drift-timeline pl-12">
            {driftRecords.map((record) => (
              <div key={record.id} className="relative mb-8 last:mb-0">
                <div className="absolute left-[-36px] top-2 w-5 h-5 bg-primary-500 rounded-full border-4 border-white shadow"></div>
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-book-ink">{record.username}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(record.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700">{record.notes}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>这本书还没有漂流记录</p>
            {user && <p className="text-sm mt-1">成为第一个留下感想的人吧！</p>}
          </div>
        )}
      </div>

      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-book-ink mb-4">请求交换</h3>
            <p className="text-gray-600 mb-4">
              你将花费 <span className="font-bold text-amber-600">{book.points_required} 积分</span> 来交换这本书
            </p>
            {user && (
              <p className="text-sm text-gray-500 mb-4">
                当前积分：{user.points} 积分
              </p>
            )}
            <textarea
              value={exchangeMessage}
              onChange={(e) => setExchangeMessage(e.target.value)}
              placeholder="给对方留个言（选填）..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none mb-4 resize-none"
              rows={3}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowExchangeModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExchange}
                disabled={exchangeLoading}
                className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {exchangeLoading ? '发送中...' : '确认请求'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewWishlistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">新建心愿单</h3>
              <button
                onClick={() => setShowNewWishlistModal(false)}
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
                  value={newWishlistName}
                  onChange={(e) => setNewWishlistName(e.target.value)}
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
                  value={newWishlistDesc}
                  onChange={(e) => setNewWishlistDesc(e.target.value)}
                  placeholder="描述一下这个心愿单..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowNewWishlistModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateWishlist}
                disabled={!newWishlistName.trim() || creatingWishlist}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {creatingWishlist ? '创建中...' : '创建并添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
