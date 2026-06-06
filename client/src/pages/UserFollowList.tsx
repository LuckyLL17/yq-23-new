import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ListType = 'followers' | 'following';

const UserFollowList = ({ type }: { type: ListType }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const userId = parseInt(id);
        const [userRes, listRes] = await Promise.all([
          usersAPI.getUser(userId),
          type === 'followers'
            ? usersAPI.getFollowers(userId)
            : usersAPI.getFollowing(userId)
        ]);
        setUserInfo(userRes.data);
        setUsers(listRes.data);

        if (currentUser) {
          const statusMap: Record<number, boolean> = {};
          for (const u of listRes.data) {
            if (u.id !== currentUser.id) {
              try {
                const statusRes = await usersAPI.getFollowStatus(u.id);
                statusMap[u.id] = statusRes.data.is_following;
              } catch (e) {
                statusMap[u.id] = false;
              }
            }
          }
          setFollowingStatus(statusMap);
        }
      } catch (error) {
        console.error('Failed to fetch follow list:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, type, currentUser]);

  const handleFollowToggle = async (userId: number, isCurrentlyFollowing: boolean) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      if (isCurrentlyFollowing) {
        await usersAPI.unfollowUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
      } else {
        await usersAPI.followUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    }
  };

  const title = type === 'followers' ? '粉丝' : '关注';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex items-center p-4 border-b border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-book-ink">
              {userInfo?.username} 的{title}
            </h1>
            <p className="text-sm text-gray-500">共 {users.length} 人</p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无{title}</p>
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <Link
                  to={`/users/${u.id}`}
                  className="flex items-center space-x-3 flex-1"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-book-ink hover:text-primary-500">
                      {u.username}
                    </p>
                    {u.bio && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {u.bio}
                      </p>
                    )}
                  </div>
                </Link>
                {currentUser && currentUser.id !== u.id && (
                  <button
                    onClick={() => handleFollowToggle(u.id, followingStatus[u.id])}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      followingStatus[u.id]
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {followingStatus[u.id] ? '已关注' : '+ 关注'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFollowList;
