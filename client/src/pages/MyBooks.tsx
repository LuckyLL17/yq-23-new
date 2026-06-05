import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookCopy, Plus, BookOpen } from 'lucide-react';
import { booksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BookCard from '../components/BookCard';

const MyBooks = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Link
          to="/add-book"
          className="bg-primary-500 text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>上架新书</span>
        </Link>
      </div>

      {loading ? (
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
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <Link key={book.id} to={`/books/${book.id}`}>
              <BookCard book={book} />
            </Link>
          ))}
        </div>
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
