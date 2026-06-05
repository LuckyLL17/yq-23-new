import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Coins, Plus, BookCopy, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="w-8 h-8 text-primary-500" />
            <span className="text-xl font-bold text-book-ink font-serif">书漂</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/" className="text-book-ink hover:text-primary-500 transition-colors">
              书市
            </Link>

            {user ? (
              <>
                <Link
                  to="/my-books"
                  className="text-book-ink hover:text-primary-500 transition-colors flex items-center space-x-1"
                >
                  <BookCopy className="w-4 h-4" />
                  <span>我的书架</span>
                </Link>

                <Link
                  to="/exchanges"
                  className="text-book-ink hover:text-primary-500 transition-colors"
                >
                  交换请求
                </Link>

                <Link
                  to="/add-book"
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>上架书籍</span>
                </Link>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-amber-600">
                    <Coins className="w-4 h-4" />
                    <span className="font-medium">{user.points}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="text-book-ink font-medium">{user.username}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-book-ink hover:text-primary-500 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
