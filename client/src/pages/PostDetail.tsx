import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, MessageSquare, Eye, User, Clock, ArrowLeft, Send, Reply, ChevronDown, ChevronUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { topicsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  parent_id: number | null;
  reply_to_user_id?: number;
  like_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  reply_to_username?: string;
  replies: Comment[];
  liked?: boolean;
}

const CommentItem = ({
  comment,
  depth = 0,
  onLike,
  onReply,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onCancelReply,
}: {
  comment: Comment;
  depth?: number;
  onLike: (id: number) => void;
  onReply: (comment: Comment) => void;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  replyContent: string;
  setReplyContent: (v: string) => void;
  onSubmitReply: (parentComment: Comment) => void;
  onCancelReply: () => void;
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReplying = replyingTo === comment.id;

  const handleReplyClick = () => {
    onReply(comment);
  };

  const handleSubmit = () => {
    onSubmitReply(comment);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-book-ink">{comment.author_name}</span>
            {comment.reply_to_username && (
              <span className="text-gray-400 text-sm">
                回复 <span className="text-primary-600">@{comment.reply_to_username}</span>
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-gray-700 mb-2 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 transition-colors ${
                comment.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${comment.liked ? 'fill-current' : ''}`} />
              <span>{comment.like_count}</span>
            </button>
            <button
              onClick={handleReplyClick}
              className="text-gray-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>回复</span>
            </button>
          </div>

          {isReplying && (
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-500">
                  回复 @{comment.author_name}
                </span>
                <button
                  onClick={onCancelReply}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-sm transition-all"
                autoFocus
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!replyContent.trim()}
                  className="px-4 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  回复
                </button>
              </div>
            </div>
          </div>
          )}

          {hasReplies && (
            <div className="mt-3">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                {showReplies ? (
                  <><ChevronUp className="w-4 h-4" /> 收起回复</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> {comment.replies.length} 条回复</>
                )}
              </button>
              {showReplies && (
                <div>
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      onLike={onLike}
                      onReply={onReply}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                      replyContent={replyingTo === reply.id ? replyContent : ''}
                      setReplyContent={setReplyContent}
                      onSubmitReply={onSubmitReply}
                      onCancelReply={onCancelReply}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);

  const postId = parseInt(id || '0');
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      
      setLoading(true);
      try {
        const [postRes, commentsRes] = await Promise.all([
          topicsAPI.getPost(postId),
          topicsAPI.getComments(postId),
        ]);
        setPost(postRes.data);
        setLikeCount(postRes.data.like_count);
        setComments(commentsRes.data);

        if (user) {
          try {
            const likeRes = await topicsAPI.getPostLikeStatus(postId);
            setLiked(likeRes.data.liked);
          } catch (e) {
            // ignore
          }
        }
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      hasFetched.current = false;
    };
  }, [postId, user]);

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      if (newLiked) {
        await topicsAPI.likePost(postId);
      } else {
        await topicsAPI.unlikePost(postId);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await topicsAPI.addComment(postId, { content: newComment });
      setComments(prev => [...prev, { ...res.data, replies: [] ]);
      setNewComment('');
      setPost((prev: any) => ({
        ...prev,
        comment_count: prev.comment_count + 1
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const findAndUpdateLike = (commentsList: Comment[]): Comment[] => {
        return commentsList.map(c => {
          if (c.id === commentId) {
            const newLiked = !c.liked;
            return {
              ...c,
              liked: newLiked,
              like_count: newLiked ? c.like_count + 1 : c.like_count - 1
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: findAndUpdateLike(c.replies) };
          }
          return c;
        });
      };

      const comment = findCommentById(comments, commentId);
      
      setComments(prev => findAndUpdateLike(prev));

      if (comment?.liked) {
        await topicsAPI.unlikeComment(commentId);
      } else {
        await topicsAPI.likeComment(commentId);
      }
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
    }
  };

  const findCommentById = (commentsList: Comment[], id: number): Comment | null => {
    for (const c of commentsList) {
      if (c.id === id) return c;
      if (c.replies) {
        const found = findCommentById(c.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleReply = useCallback((comment: Comment) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReplyTarget(comment);
    setReplyingTo(comment.id);
    setReplyContent('');
  }, [user, navigate]);

  const handleSubmitReply = async (parentComment: Comment) => {
    if (!user || !replyContent.trim()) return;

    try {
      const res = await topicsAPI.addComment(postId, {
        content: replyContent,
        parent_id: parentComment.parent_id || parentComment.id,
        reply_to_user_id: parentComment.author_id
      });

      const targetId = parentComment.parent_id || parentComment.id;

      const addReplyToTree = (commentsList: Comment[]): Comment[] => {
        return commentsList.map(c => {
          if (c.id === targetId) {
            return {
              ...c,
              replies: [...(c.replies || []), { ...res.data, replies: [] }]
            };
          }
          if (c.replies) {
            return { ...c, replies: addReplyToTree(c.replies) };
          }
          return c;
        });
      };

      setComments(prev => addReplyToTree(prev));
      setPost((prev: any) => ({
        ...prev,
        comment_count: prev.comment_count + 1
      }));
      setReplyingTo(null);
      setReplyTarget(null);
      setReplyContent('');
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyTarget(null);
    setReplyContent('');
  }, []);

  if (loading && !post) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">帖子不存在</p>
        <Link to="/topics" className="text-primary-500 hover:underline mt-4 inline-block">
          返回讨论区
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/topics')}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回讨论区</span>
      </button>

      <article className="bg-white rounded-2xl p-8 shadow-sm mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.topics?.map((topic: any) => (
            <span
              key={topic.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-600 text-sm rounded-full"
            >
              <span>{topic.icon}</span>
              <span>{topic.name}</span>
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-book-ink mb-4 font-serif">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-book-ink">{post.author_name}</p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.view_count} 浏览
              </span>
            </div>
          </div>
        </div>

        {post.images && post.images.length > 0 && (
          <div className="mb-6 grid gap-3">
            {post.images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="w-full max-h-96 object-cover rounded-xl"
              />
            ))}
          </div>
        )}

        <div className="prose max-w-none prose-headings:text-book-ink prose-p:text-gray-700 prose-strong:text-book-ink prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-primary-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-600 prose-blockquote:not-italic prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
              liked
                ? 'bg-red-50 text-red-500'
