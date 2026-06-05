import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Eye, Heart, User, Clock, Plus, Search, TrendingUp, Hash } from 'lucide-react';
import { topicsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SORT_OPTIONS = [
  { value: 'created_at', label: '最新发布' },
  { value: 'like_count', label: '最多点赞' },
  { value: 'view_count', label: '最多浏览' },
  { value: 'comment_count', label: '最多评论' }
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const getExcerpt = (content: string, maxLength: number = 150) => {
  const text = content.replace(/[#*`>\-\[\]()]/g, '').replace(/\n/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

const Topics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await topicsAPI.getTopics();
        setTopics(res.data);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      }
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params: any = {
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          limit: 10
        };
        if (selectedTopic) params.topic_id = selectedTopic;
        if (searchQuery) params.search = searchQuery;
        const res = await topicsAPI.getPosts(params);
        setPosts(res.data.posts);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [selectedTopic, searchQuery, sortBy, sortOrder, page, user]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.fromPostDetail && state?.postId) {
      setPosts(prev => prev.map(p =>
        p.id === state.postId
          ? { ...p, liked: state.liked, like_count: state.likeCount }
          : p
      ));
    }
  }, [location.state]);

  const handleTopicClick = (topicId: number | null) => {
    setSelectedTopic(topicId);
    setPage(1);
  };

  const handleCreatePost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/topics/new');
  };

  const handleLike = useCallback(async (postId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const newLiked = !post.liked;

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: newLiked, like_count: newLiked ? p.like_count + 1 : p.like_count - 1 }
        : p
    ));

    try {
      if (newLiked) {
        await topicsAPI.likePost(postId);
      } else {
        await topicsAPI.unlikePost(postId);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked: !newLiked, like_count: !newLiked ? p.like_count + 1 : p.like_count - 1 }
          : p
      ));
    }
  }, [user, navigate, posts]);

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-serif mb-2">话题讨论区</h1>
              <p className="text-primary-100">分享读书心得，交流阅读感悟</p>
            </div>
            <button
              onClick={handleCreatePost}
              className="bg-white text-primary-600 px-5 py-2.5 rounded-xl font-medium hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              发布帖子
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="搜索帖子..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => handleTopicClick(null)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedTopic === null
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                全部话题
              </button>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedTopic === topic.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{topic.icon}</span>
                  <span>{topic.name}</span>
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/topics/posts/${post.id}`}
                className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.topics?.map((topic: any) => (
                    <span
                      key={topic.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 text-sm rounded-full"
                    >
                      <span>{topic.icon}</span>
                      <span>{topic.name}</span>
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-bold text-book-ink mb-2 hover:text-primary-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {getExcerpt(post.content)}
                </p>
                {post.images && post.images.length > 0 && (
                  <div className="mb-4 flex gap-2">
                    {post.images.slice(0, 3).map((img: string, idx: number) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                    {post.images.length > 3 && (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                        +{post.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <span>{post.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{post.view_count}</span>
                    </div>
                    <button
                      onClick={(e) => handleLike(post.id, e)}
                      className={`flex items-center gap-1 transition-colors ${
                        post.liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
                      <span>{post.like_count}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comment_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无帖子</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <div className="w-72 shrink-0 hidden lg:block">
        <div className="bg-white rounded-xl p-5 shadow-sm sticky top-24">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-book-ink">热门话题</h3>
          </div>
          <div className="space-y-3">
            {topics.slice(0, 5).map((topic, index) => (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  selectedTopic === topic.id
                    ? 'bg-primary-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  index < 3 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span>{topic.icon}</span>
                    <span className="font-medium text-book-ink truncate">{topic.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{topic.post_count} 篇帖子</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topics;
