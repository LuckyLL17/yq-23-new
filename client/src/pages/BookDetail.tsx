import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Coins, User, Star, MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { booksAPI, exchangesAPI } from '../services/api';
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

            <div className="mt-6 pt-6 border-t flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">当前持有者</p>
                  <p className="font-medium text-book-ink">{book.holder_name}</p>
                </div>
              </div>

              {user && !isOwner && (
                <button
                  onClick={() => setShowExchangeModal(true)}
                  className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  请求交换
                </button>
              )}

              {isOwner && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
                  这本书在你的书架上
                </div>
              )}
            </div>
          </div>
        </div>
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
            {driftRecords.map((record, index) => (
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
    </div>
  );
};

export default BookDetail;
