import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Coins, BookOpen, MessageSquare, Users, Calendar, Heart, Eye } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'books'>('posts');
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const userId = parseInt(id);
        const [userRes, postsRes, booksRes] = await Promise.all([
          usersAPI.getUser(userId),
          usersAPI.getUserPosts(userId, { page: 1, limit: 20 }),
          usersAPI.getUserBooks(userId)
        ]);
        setUser(userRes.data);
        setPosts(postsRes.data.posts);
        setBooks(booksRes.data);
        setFollowerCount(userRes.data.follower_count);

        if (currentUser) {
          if (currentUser.id === userId) {
            setIsSelf(true);
            setIsFollowing(false);
          } else {
            const statusRes = await usersAPI.getFollowStatus(userId);
            setIsFollowing(statusRes.data.is_following);
            setIsSelf(statusRes.data.is_self);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!id) return;
    try {
      const userId = parseInt(id);
      if (isFollowing) {
        const res = await usersAPI.unfollowUser(userId);
        setIsFollowing(false);
        setFollowerCount(res.data.follower_count);
      } else {
        const res = await usersAPI.followUser(userId);
        setIsFollowing(true);
        setFollowerCount(res.data.follower_count);
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">用户不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-32"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12">
            <div className="flex items-end space-x-4">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary-500" />
                )}
              </div>
              <div className="pb-2">
                <h1 className="text-2xl font-bold text-book-ink">{user.username}</h1>
                {user.bio && (
                  <p className="text-gray-600 text-sm mt-1">{user.bio}</p>
                )}
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              {!isSelf ? (
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isFollowing ? '已关注' : '+ 关注'}
                </button>
              ) : (
                <Link
                  to="/my-books"
                  className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  个人中心
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
            <Link
              to={`/users/${user.id}/followers`}
              className="flex items-center space-x-2 hover:text-primary-500 transition-colors"
            >
              <Users className="w-5 h-5 text-gray-500" />
              <div>
                <span className="font-bold text-book-ink">{followerCount}</span>
                <span className="text-gray-500 text-sm ml-1">粉丝</span>
              </div>
            </Link>
            <Link
              to={`/users/${user.id}/following`}
              className="flex items-center space-x-2 hover:text-primary-500 transition-colors"
            >
              <Users className="w-5 h-5 text-gray-500" />
              <div>
                <span className="font-bold text-book-ink">{user.following_count}</span>
                <span className="text-gray-500 text-sm ml-1">关注</span>
              </div>
            </Link>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-gray-500" />
              <div>
                <span className="font-bold text-book-ink">{user.book_count}</span>
                <span className="text-gray-500 text-sm ml-1">书籍</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <div>
                <span className="font-bold text-book-ink">{user.post_count}</span>
                <span className="text-gray-500 text-sm ml-1">帖子</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <div>
                <span className="font-bold text-book-ink">{user.points}</span>
                <span className="text-gray-500 text-sm ml-1">积分</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-gray-500 text-sm">
                {new Date(user.created_at).toLocaleDateString('zh-CN')} 加入
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-5 h-5 inline-block mr-2" />
            帖子
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'books'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5 inline-block mr-2" />
            书籍
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无帖子</p>
                </div>
              ) : (
                posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/topics/posts/${post.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-book-ink hover:text-primary-500">
                        {post.title}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    {post.topics && post.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.topics.map((topic: any) => (
                          <span
                            key={topic.id}
                            className="text-xs px-2 py-1 bg-primary-100 text-primary-600 rounded-full"
                          >
                            {topic.icon} {topic.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                      {stripHtml(post.content)}
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {post.view_count}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {post.like_count}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.comment_count}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'books' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无书籍</p>
                </div>
              ) : (
                books.map((book) => (
                  <Link
                    key={book.id}
                    to={`/books/${book.id}`}
                    className="block group"
                  >
                    <div className="aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden mb-2">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-book-ink text-sm truncate group-hover:text-primary-500">
                      {book.title}
                    </h3>
                    <p className="text-gray-500 text-xs truncate">{book.author}</p>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
