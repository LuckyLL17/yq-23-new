import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookCopy, Plus, BookOpen, LayoutGrid, List, Coins, User } from 'lucide-react';
import { booksAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BookCard from '../components/BookCard';

const MyBooks = () => {
  const { user, refreshUser } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shelfStyle, setShelfStyle] = useState<'grid' | 'list'>('grid');

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-book-ink font-serif">我的书架</h1>
          <p className="text-gray-500 mt-1">
            共 {books.length} 本藏书
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
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
        </div>
      </div>

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
              <Link key={book.id} to={`/books/${book.id}`}>
                <BookCard book={book} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <Link
                key={book.id}
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
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl">
          <BookOpen className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-book-ink mb-2">书架空空如也</h3>
          <p className="text-gray-500 mb-6">分享你的闲置书籍，开启漂流之旅</p>
          <Link
            to="/add-book"
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            上架第一本书
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyBooks;
