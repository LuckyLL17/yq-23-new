import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  points: number;
  avatar?: string;
  bio?: string;
  created_at: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  cover?: string;
  description?: string;
  isbn?: string;
  category?: string;
  condition: string;
  owner_id: number;
  current_holder_id: number;
  status: string;
  points_required: number;
  created_at: string;
}

interface DriftRecord {
  id: number;
  book_id: number;
  user_id: number;
  notes?: string;
  rating?: number;
  read_date?: string;
  created_at: string;
}

type ExchangeStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'expired';

interface Exchange {
  id: number;
  book_id: number;
  requester_id: number;
  owner_id: number;
  status: ExchangeStatus;
  message?: string;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  expired_at?: string;
  expires_at?: string;
  borrow_days?: number;
  owner_rated?: boolean;
  requester_rated?: boolean;
}

interface SearchHistory {
  id: number;
  user_id: number;
  keyword: string;
  created_at: string;
}

interface Topic {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  post_count: number;
  created_at: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  topic_ids: number[];
  images: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  parent_id: number | null;
  reply_to_user_id?: number;
  like_count: number;
  created_at: string;
}

interface PostLike {
  id: number;
  post_id: number;
  user_id: number;
  created_at: string;
}

interface CommentLike {
  id: number;
  comment_id: number;
  user_id: number;
  created_at: string;
}

interface Wishlist {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  created_at: string;
}

interface WishlistItem {
  id: number;
  wishlist_id: number;
  book_id: number;
  created_at: string;
}

interface ReadingGoal {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  target_books: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
}

interface GoalBook {
  id: number;
  goal_id: number;
  book_id: number;
  is_completed: boolean;
  completed_at?: string;
  added_at: string;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: 'reading' | 'goal' | 'social' | 'collection';
  condition_type: 'books_read' | 'goals_completed' | 'posts_made' | 'books_added' | 'streak_days' | 'exchange_count';
  condition_value: number;
  points_reward: number;
  created_at: string;
}

interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
}

interface ReadingClub {
  id: number;
  title: string;
  description: string;
  book_title?: string;
  book_id?: number;
  organizer_id: number;
  location: string;
  location_lat?: number;
  location_lng?: number;
  start_time: string;
  end_time: string;
  max_participants: number;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
  cover_image?: string;
  created_at: string;
  updated_at: string;
}

interface ReadingClubParticipant {
  id: number;
  club_id: number;
  user_id: number;
  status: 'registered' | 'cancelled' | 'attended';
  registered_at: string;
}

interface ExchangeReview {
  id: number;
  exchange_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
}

interface Donation {
  id: number;
  user_id: number;
  book_id: number | null;
  book_title: string;
  book_author: string;
  book_cover?: string;
  book_category?: string;
  book_condition: string;
  quantity: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  donated_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  certificate_issued?: boolean;
}

interface DonationCertificate {
  id: number;
  donation_id: number;
  user_id: number;
  certificate_no: string;
  issued_at: string;
}

interface Data {
  users: User[];
  books: Book[];
  driftRecords: DriftRecord[];
  exchanges: Exchange[];
  exchangeReviews: ExchangeReview[];
  searchHistories: SearchHistory[];
  topics: Topic[];
  posts: Post[];
  comments: Comment[];
  postLikes: PostLike[];
  commentLikes: CommentLike[];
  wishlists: Wishlist[];
  wishlistItems: WishlistItem[];
  readingGoals: ReadingGoal[];
  goalBooks: GoalBook[];
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  readingClubs: ReadingClub[];
  readingClubParticipants: ReadingClubParticipant[];
  follows: Follow[];
  donations: Donation[];
  donationCertificates: DonationCertificate[];
}

const defaultData: Data = {
  users: [],
  books: [],
  driftRecords: [],
  exchanges: [],
  exchangeReviews: [],
  searchHistories: [],
  topics: [],
  posts: [],
  comments: [],
  postLikes: [],
  commentLikes: [],
  wishlists: [],
  wishlistItems: [],
  readingGoals: [],
  goalBooks: [],
  achievements: [],
  userAchievements: [],
  readingClubs: [],
  readingClubParticipants: [],
  follows: [],
  donations: [],
  donationCertificates: []
};

const file = path.join(dataDir, 'db.json');
const adapter = new JSONFile<Data>(file);
const db = new Low<Data>(adapter, defaultData);

async function initDatabase() {
  await db.read();

  if (db.data.users.length === 0) {
    const hashedPassword = bcrypt.hashSync('password123', 10);
    
    db.data.users = [
      { id: 1, username: 'booklover', email: 'booklover@example.com', password: hashedPassword, points: 150, bio: '热爱阅读，喜欢分享好书', created_at: new Date().toISOString() },
      { id: 2, username: 'reader123', email: 'reader@example.com', password: hashedPassword, points: 80, bio: '书虫一枚，各种类型都读', created_at: new Date().toISOString() },
      { id: 3, username: 'bibliophile', email: 'biblio@example.com', password: hashedPassword, points: 200, bio: '藏书爱好者，愿意与大家分享', created_at: new Date().toISOString() }
    ];

    db.data.books = [
      { id: 1, title: '百年孤独', author: '加西亚·马尔克斯', cover: 'https://picsum.photos/seed/book1/200/300', description: '魔幻现实主义文学代表作，讲述布恩迪亚家族七代人的传奇故事', category: '文学', condition: '九成新', owner_id: 1, current_holder_id: 1, status: 'available', points_required: 15, created_at: new Date().toISOString() },
      { id: 2, title: '三体', author: '刘慈欣', cover: 'https://picsum.photos/seed/book2/200/300', description: '中国科幻里程碑之作，展现宇宙级别的文明冲突', category: '科幻', condition: '全新', owner_id: 2, current_holder_id: 2, status: 'available', points_required: 20, created_at: new Date().toISOString() },
      { id: 3, title: '小王子', author: '安托万·德·圣-埃克苏佩里', cover: 'https://picsum.photos/seed/book3/200/300', description: '写给大人的童话，关于爱与责任的寓言', category: '童话', condition: '八成新', owner_id: 1, current_holder_id: 1, status: 'available', points_required: 8, created_at: new Date().toISOString() },
      { id: 4, title: '活着', author: '余华', cover: 'https://picsum.photos/seed/book4/200/300', description: '讲述一个人和他的命运之间的友情', category: '文学', condition: '九成新', owner_id: 3, current_holder_id: 3, status: 'available', points_required: 12, created_at: new Date().toISOString() },
      { id: 5, title: '人类简史', author: '尤瓦尔·赫拉利', cover: 'https://picsum.photos/seed/book5/200/300', description: '从认知革命到科学革命，重新审视人类历史', category: '历史', condition: '全新', owner_id: 2, current_holder_id: 2, status: 'available', points_required: 18, created_at: new Date().toISOString() }
    ];

    db.data.driftRecords = [
      { id: 1, book_id: 1, user_id: 1, notes: '这是我读过最震撼的小说，魔幻与现实交织得如此美妙', rating: 5, read_date: '2024-01-15', created_at: new Date().toISOString() },
      { id: 2, book_id: 1, user_id: 2, notes: '布恩迪亚家族的命运让人唏嘘，好书值得反复阅读', rating: 5, read_date: '2024-03-20', created_at: new Date().toISOString() },
      { id: 3, book_id: 2, user_id: 2, notes: '想象力爆炸！三体世界的设定太精彩了', rating: 5, read_date: '2024-02-10', created_at: new Date().toISOString() },
      { id: 4, book_id: 4, user_id: 3, notes: '余华的文字朴实但有力量，读完思考了很久人生', rating: 4, read_date: '2024-04-05', created_at: new Date().toISOString() }
    ];

    db.data.topics = [
      { id: 1, name: '读书分享', description: '分享你的读书心得和感悟', icon: '📚', post_count: 3, created_at: new Date().toISOString() },
      { id: 2, name: '书评推荐', description: '好书推荐和深度书评', icon: '⭐', post_count: 2, created_at: new Date().toISOString() },
      { id: 3, name: '二手书交流', description: '二手书交换、买卖信息', icon: '🔄', post_count: 1, created_at: new Date().toISOString() },
      { id: 4, name: '读书打卡', description: '每日读书打卡，记录成长', icon: '📅', post_count: 1, created_at: new Date().toISOString() },
      { id: 5, name: '文学讨论', description: '讨论文学作品与作家', icon: '✍️', post_count: 0, created_at: new Date().toISOString() }
    ];

    db.data.posts = [
      {
        id: 1,
        title: '《百年孤独》读后感：孤独是生命的底色',
        content: `# 《百年孤独》读后感

马尔克斯用他魔幻现实主义的笔触，为我们描绘了布恩迪亚家族七代人的传奇故事。

## 关于孤独

书中每个人物都在以不同的方式与孤独对抗：
- 乌尔苏拉的孤独是坚守与等待
- 奥雷里亚诺的孤独是战争与虚无
- 阿玛兰妲的孤独是爱与悔恨

> 生命中曾经有过的所有灿烂，终究都需要用寂寞来偿还。

## 个人感悟

读完这本书，我最大的感受是：孤独并不可怕，它是生命的一部分。我们能做的，是在孤独中寻找意义，在虚无中创造价值。

你们觉得这本书最打动你的是什么？欢迎讨论～`,
        author_id: 1,
        topic_ids: [1, 2],
        images: ['https://picsum.photos/seed/post1/800/400'],
        view_count: 128,
        like_count: 15,
        comment_count: 3,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 2,
        title: '最近在读《三体》，科幻迷们来聊聊',
        content: `## 三体世界的设定太绝了！

作为一个科幻迷，《三体》真的刷新了我的认知。刘慈欣的想象力简直是宇宙级的。

### 最喜欢的设定
1. **黑暗森林法则** - 这个设定太震撼了
2. **降维打击** - 二向箔的描写让人不寒而栗
3. **智子工程** - 科学与玄幻的完美结合

![科幻](https://picsum.photos/seed/scifi/600/300)

有没有同好一起讨论？你们最喜欢哪一部？`,
        author_id: 2,
        topic_ids: [1, 5],
        images: ['https://picsum.photos/seed/scifi/600/300'],
        view_count: 256,
        like_count: 32,
        comment_count: 5,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 3,
        title: '有想换书的朋友吗？我有一批九成新的书',
        content: `## 闲置书籍交换

整理书架翻出一批书，九成新，想换一些没看过的书。

### 可交换书籍
- 《活着》余华
- 《围城》钱钟书
- 《平凡的世界》路遥
- 《小王子》圣埃克苏佩里

### 想换的书
- 悬疑推理类优先
- 或者你们有什么好书推荐也可以

有兴趣的朋友可以评论区留言～`,
        author_id: 3,
        topic_ids: [3],
        images: [],
        view_count: 89,
        like_count: 8,
        comment_count: 2,
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 4,
        title: '读书打卡Day30｜坚持一个月啦！',
        content: `# 读书打卡第30天

不知不觉已经坚持读书一个月了！给自己点个赞👍

## 本月书单
1. 《百年孤独》⭐⭐⭐⭐⭐
2. 《三体》⭐⭐⭐⭐⭐
3. 《小王子》⭐⭐⭐⭐
4. 《活着》⭐⭐⭐⭐⭐
5. 《人类简史》⭐⭐⭐⭐

## 心得
每天读书一小时，感觉整个人都沉静下来了。阅读真的是成本最低的自我提升方式。

有没有一起打卡的小伙伴？互相监督呀～`,
        author_id: 1,
        topic_ids: [4],
        images: [],
        view_count: 67,
        like_count: 12,
        comment_count: 1,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 5,
        title: '深度书评：为什么《活着》是余华最好的作品',
        content: `## 为什么说《活着》是余华的巅峰之作？

余华的作品我读过不少，但《活着》始终是最震撼我的一本。

### 语言的力量
余华的文字很朴实，没有华丽的辞藻，但就是这种朴实，才让福贵的苦难显得格外真实。

### 生命的韧性
福贵的一生经历了太多苦难：
- 家道中落
- 失去亲人
- 孤独终老

但他依然活着，这种韧性本身就是对生命最大的礼赞。

> 人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。

你们觉得呢？`,
        author_id: 3,
        topic_ids: [2, 5],
        images: ['https://picsum.photos/seed/bookreview/700/350'],
        view_count: 198,
        like_count: 28,
        comment_count: 4,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];

    db.data.comments = [
      { id: 1, post_id: 1, author_id: 2, content: '写得太好了！马尔克斯的文字真的有魔力，这本书我也读了三遍，每次都有新的感悟。', parent_id: null, like_count: 5, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, post_id: 1, author_id: 3, content: '同感，孤独是这本书永恒的主题。不过我觉得乌尔苏拉才是全书最坚强的人。', parent_id: null, like_count: 3, created_at: new Date(Date.now() - 86400000 * 0.8).toISOString() },
      { id: 3, post_id: 1, author_id: 1, content: '没错！乌尔苏拉用她的一生支撑起了整个家族，她的孤独是最隐忍的。', parent_id: 2, reply_to_user_id: 3, like_count: 2, created_at: new Date(Date.now() - 86400000 * 0.5).toISOString() },
      { id: 4, post_id: 2, author_id: 1, content: '我也喜欢三体！黑暗森林法则真的是天才级的设定，太震撼了。', parent_id: null, like_count: 8, created_at: new Date(Date.now() - 3600000 * 10).toISOString() },
      { id: 5, post_id: 2, author_id: 3, content: '第二部《黑暗森林》是巅峰！罗辑的人设太酷了，从浪子到面壁者的转变。', parent_id: null, like_count: 12, created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
      { id: 6, post_id: 2, author_id: 2, content: '同意！第二部的思想深度是三部里最强的。不过第三部的降维打击也很绝', parent_id: 5, reply_to_user_id: 3, like_count: 4, created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
      { id: 7, post_id: 2, author_id: 1, content: '我最喜欢第一部，古筝行动那段看的我鸡皮疙瘩都起来了', parent_id: 5, reply_to_user_id: 3, like_count: 3, created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 8, post_id: 3, author_id: 1, content: '有兴趣！《活着》和《平凡的世界》我都想看，我有一些东野圭吾的书可以换', parent_id: null, like_count: 1, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
      { id: 9, post_id: 3, author_id: 2, content: '《围城》还有吗？我想用《白夜行》换', parent_id: null, like_count: 2, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 10, post_id: 4, author_id: 2, content: '好棒！一起打卡呀～我也在坚持读书', parent_id: null, like_count: 3, created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 11, post_id: 5, author_id: 1, content: '说得好！余华用最朴素的语言讲了最沉重的故事', parent_id: null, like_count: 6, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 12, post_id: 5, author_id: 2, content: '《活着》确实经典，我推荐给好多朋友了，都说好。', parent_id: null, like_count: 4, created_at: new Date(Date.now() - 86400000 * 1.5).toISOString() },
      { id: 13, post_id: 5, author_id: 3, content: '谢谢喜欢～余华的《许三观卖血记》也很推荐', parent_id: 12, reply_to_user_id: 2, like_count: 2, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 14, post_id: 5, author_id: 2, content: '马克了！下次就看这本', parent_id: 13, reply_to_user_id: 3, like_count: 1, created_at: new Date(Date.now() - 43200000).toISOString() }
    ];

    db.data.postLikes = [
      { id: 1, post_id: 1, user_id: 2, created_at: new Date().toISOString() },
      { id: 2, post_id: 1, user_id: 3, created_at: new Date().toISOString() },
      { id: 3, post_id: 2, user_id: 1, created_at: new Date().toISOString() },
      { id: 4, post_id: 2, user_id: 3, created_at: new Date().toISOString() },
      { id: 5, post_id: 3, user_id: 1, created_at: new Date().toISOString() },
      { id: 6, post_id: 4, user_id: 2, created_at: new Date().toISOString() },
      { id: 7, post_id: 5, user_id: 1, created_at: new Date().toISOString() },
      { id: 8, post_id: 5, user_id: 2, created_at: new Date().toISOString() }
    ];

    db.data.commentLikes = [
      { id: 1, comment_id: 1, user_id: 3, created_at: new Date().toISOString() },
      { id: 2, comment_id: 4, user_id: 3, created_at: new Date().toISOString() },
      { id: 3, comment_id: 5, user_id: 1, created_at: new Date().toISOString() }
    ];

    db.data.wishlists = [
      { id: 1, user_id: 1, name: '默认心愿单', description: '我的收藏', is_default: true, created_at: new Date().toISOString() },
      { id: 2, user_id: 1, name: '想读书单', description: '计划要读的书', is_default: false, created_at: new Date().toISOString() },
      { id: 3, user_id: 2, name: '默认心愿单', description: '我的收藏', is_default: true, created_at: new Date().toISOString() }
    ];

    db.data.wishlistItems = [
      { id: 1, wishlist_id: 1, book_id: 2, created_at: new Date().toISOString() },
      { id: 2, wishlist_id: 1, book_id: 4, created_at: new Date().toISOString() },
      { id: 3, wishlist_id: 2, book_id: 5, created_at: new Date().toISOString() },
      { id: 4, wishlist_id: 3, book_id: 1, created_at: new Date().toISOString() }
    ];

    db.data.achievements = [
      { id: 1, name: '初入书虫', description: '读完第一本书', icon: '📖', type: 'reading', condition_type: 'books_read', condition_value: 1, points_reward: 10, created_at: new Date().toISOString() },
      { id: 2, name: '阅读新手', description: '累计读完5本书', icon: '📚', type: 'reading', condition_type: 'books_read', condition_value: 5, points_reward: 30, created_at: new Date().toISOString() },
      { id: 3, name: '阅读达人', description: '累计读完10本书', icon: '🏆', type: 'reading', condition_type: 'books_read', condition_value: 10, points_reward: 50, created_at: new Date().toISOString() },
      { id: 4, name: '读书狂魔', description: '累计读完20本书', icon: '👑', type: 'reading', condition_type: 'books_read', condition_value: 20, points_reward: 100, created_at: new Date().toISOString() },
      { id: 5, name: '目标达成者', description: '完成第一个阅读目标', icon: '🎯', type: 'goal', condition_type: 'goals_completed', condition_value: 1, points_reward: 20, created_at: new Date().toISOString() },
      { id: 6, name: '持之以恒', description: '完成5个阅读目标', icon: '⭐', type: 'goal', condition_type: 'goals_completed', condition_value: 5, points_reward: 60, created_at: new Date().toISOString() },
      { id: 7, name: '社群活跃分子', description: '发布第一篇帖子', icon: '✍️', type: 'social', condition_type: 'posts_made', condition_value: 1, points_reward: 5, created_at: new Date().toISOString() },
      { id: 8, name: '分享达人', description: '发布10篇帖子', icon: '📝', type: 'social', condition_type: 'posts_made', condition_value: 10, points_reward: 40, created_at: new Date().toISOString() },
      { id: 9, name: '藏书新手', description: '上架第一本书', icon: '📦', type: 'collection', condition_type: 'books_added', condition_value: 1, points_reward: 10, created_at: new Date().toISOString() },
      { id: 10, name: '小图书馆', description: '上架10本书', icon: '🏛️', type: 'collection', condition_type: 'books_added', condition_value: 10, points_reward: 50, created_at: new Date().toISOString() },
      { id: 11, name: '交换新手', description: '完成第一次书籍交换', icon: '🔄', type: 'social', condition_type: 'exchange_count', condition_value: 1, points_reward: 15, created_at: new Date().toISOString() },
      { id: 12, name: '书漂达人', description: '完成5次书籍交换', icon: '🌊', type: 'social', condition_type: 'exchange_count', condition_value: 5, points_reward: 80, created_at: new Date().toISOString() }
    ];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    db.data.readingGoals = [
      {
        id: 1,
        user_id: 1,
        title: '六月阅读计划',
        description: '本月目标读完4本书',
        target_books: 4,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    db.data.goalBooks = [
      { id: 1, goal_id: 1, book_id: 1, is_completed: true, completed_at: new Date(Date.now() - 86400000 * 5).toISOString(), added_at: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: 2, goal_id: 1, book_id: 2, is_completed: true, completed_at: new Date(Date.now() - 86400000 * 3).toISOString(), added_at: new Date(Date.now() - 86400000 * 8).toISOString() },
      { id: 3, goal_id: 1, book_id: 3, is_completed: false, added_at: new Date(Date.now() - 86400000 * 2).toISOString() }
    ];

    db.data.userAchievements = [
      { id: 1, user_id: 1, achievement_id: 1, unlocked_at: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: 2, user_id: 1, achievement_id: 2, unlocked_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 3, user_id: 1, achievement_id: 7, unlocked_at: new Date(Date.now() - 86400000 * 7).toISOString() },
      { id: 4, user_id: 1, achievement_id: 9, unlocked_at: new Date(Date.now() - 86400000 * 15).toISOString() }
    ];

    db.data.readingClubs = [
      {
        id: 1,
        title: '《百年孤独》深度共读会',
        description: '一起深度研读马尔克斯的魔幻现实主义经典《百年孤独》，探讨布恩迪亚家族的命运与孤独的主题。欢迎各位书友带着自己的见解来参加！',
        book_title: '百年孤独',
        book_id: 1,
        organizer_id: 1,
        location: '城市书房·南京路店',
        location_lat: 31.2304,
        location_lng: 121.4737,
        start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 7 + 3600000 * 3).toISOString(),
        max_participants: 20,
        status: 'upcoming',
        cover_image: 'https://picsum.photos/seed/bookclub1/800/400',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 2,
        title: '科幻迷的聚会：《三体》主题读书会',
        description: '三体迷看过来！一起讨论刘慈欣的《三体》三部曲，从黑暗森林法则到降维打击，畅聊科幻世界的无限可能。',
        book_title: '三体',
        book_id: 2,
        organizer_id: 2,
        location: '时光咖啡馆·大学路店',
        location_lat: 31.2975,
        location_lng: 121.5036,
        start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 3 + 3600000 * 2.5).toISOString(),
        max_participants: 15,
        status: 'upcoming',
        cover_image: 'https://picsum.photos/seed/bookclub2/800/400',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 3,
        title: '文学经典：《活着》读书分享会',
        description: '余华代表作《活着》深度分享，聊聊福贵的一生带给我们的思考。活动将有轮流分享和自由讨论环节。',
        book_title: '活着',
        book_id: 4,
        organizer_id: 3,
        location: '静安区图书馆·多功能厅',
        location_lat: 31.2297,
        location_lng: 121.4473,
        start_time: new Date(Date.now() - 86400000 * 2).toISOString(),
        end_time: new Date(Date.now() - 86400000 * 2 + 3600000 * 2).toISOString(),
        max_participants: 30,
        status: 'ended',
        cover_image: 'https://picsum.photos/seed/bookclub3/800/400',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ];

    db.data.readingClubParticipants = [
      { id: 1, club_id: 1, user_id: 2, status: 'registered', registered_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 2, club_id: 1, user_id: 3, status: 'registered', registered_at: new Date(Date.now() - 86400000 * 1).toISOString() },
      { id: 3, club_id: 2, user_id: 1, status: 'registered', registered_at: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 4, club_id: 2, user_id: 3, status: 'registered', registered_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 5, club_id: 3, user_id: 1, status: 'attended', registered_at: new Date(Date.now() - 86400000 * 8).toISOString() },
      { id: 6, club_id: 3, user_id: 2, status: 'attended', registered_at: new Date(Date.now() - 86400000 * 7).toISOString() }
    ];

    db.data.follows = [
      { id: 1, follower_id: 2, following_id: 1, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 2, follower_id: 3, following_id: 1, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 3, follower_id: 1, following_id: 2, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 4, follower_id: 3, following_id: 2, created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
    ];

    await db.write();
    console.log('Sample data inserted');
  }

  console.log('Database initialized');
}

initDatabase();

export default db;
