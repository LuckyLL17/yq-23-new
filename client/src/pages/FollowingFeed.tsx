import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Eye, User, Clock, Sparkles } from 'lucide-react';
import { usersAPI, topicsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FollowingFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPosts(1);
  }, [user, navigate]);

  const fetchPosts = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await usersAPI.getFollowingFeed({ page: pageNum, limit: 10 });
      if (pageNum === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.posts]);
      }
      setHasMore(pageNum < res.data.total_pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch following feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number, index: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const post = posts[index];
      if (post.liked) {
        await topicsAPI.unlikePost(postId);
        const newPosts = [...posts];
        newPosts[index] = { ...post, liked: false, like_count: post.like_count - 1 };
        setPosts(newPosts);
      } else {
        await topicsAPI.likePost(postId);
        const newPosts = [...posts];
        newPosts[index] = { ...post, liked: true, like_count: post.like_count + 1 };
        setPosts(newPosts);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-book-ink flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-primary-500" />
            关注动态
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            查看你关注的人发布的帖子
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading && posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无关注动态</p>
            <p className="text-gray-400 text-sm">
              去关注一些有趣的书友吧～
            </p>
          </div>
        ) : (
          posts.map((post, index) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Link
                    to={`/users/${post.author_id}`}
                    className="flex items-center space-x-3 hover:opacity-80"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                      {post.author_avatar ? (
                        <img
                          src={post.author_avatar}
                          alt={post.author_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-book-ink">
                        {post.author_name}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  </Link>
                </div>

                <Link to={`/topics/posts/${post.id}`}>
                  <h2 className="text-lg font-semibold text-book-ink mb-2 hover:text-primary-500">
                    {post.title}
                  </h2>
                </Link>

                {post.topics && post.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
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

                {post.images && post.images.length > 0 && (
                  <div className="mb-3">
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {stripHtml(post.content)}
                </p>

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <button
                    onClick={() => handleLike(post.id, index)}
                    className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                      post.liked ? 'text-red-500' : ''
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.liked ? 'fill-current' : ''
                      }`}
                    />
                    <span>{post.like_count}</span>
                  </button>
                  <Link
                    to={`/topics/posts/${post.id}`}
                    className="flex items-center space-x-1 hover:text-primary-500 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{post.comment_count}</span>
                  </Link>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-5 h-5" />
                    <span>{post.view_count}</span>
                  </span>
                </div>
              </div>
            </article>
          ))
        )}

        {hasMore && !loading && posts.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={() => fetchPosts(page + 1)}
              className="px-6 py-2 bg-white text-primary-500 border border-primary-500 rounded-lg hover:bg-primary-50 transition-colors"
            >
              加载更多
            </button>
          </div>
        )}

        {loading && posts.length > 0 && (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingFeed;
