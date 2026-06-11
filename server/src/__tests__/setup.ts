import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Data, User, Book } from '../database';

const JWT_SECRET = 'book-exchange-secret-key';
const DB_PATH = path.join(__dirname, '../../data/db.json');
const BACKUP_PATH = path.join(__dirname, '../../data/db.json.bak');

const now = new Date().toISOString();

const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
const hashedUserPassword = bcrypt.hashSync('password123', 10);

const seedUsers: User[] = [
  { id: 1, username: 'admin', email: 'admin@example.com', password: hashedAdminPassword, points: 999, role: 'admin', status: 'active', avatar: 'https://picsum.photos/seed/admin/100/100', bio: '系统管理员', created_at: now },
  { id: 2, username: 'booklover', email: 'booklover@example.com', password: hashedUserPassword, points: 150, role: 'user', status: 'active', avatar: 'https://picsum.photos/seed/booklover/100/100', bio: '热爱阅读，喜欢分享好书', created_at: now },
  { id: 3, username: 'reader123', email: 'reader@example.com', password: hashedUserPassword, points: 80, role: 'user', status: 'active', avatar: 'https://picsum.photos/seed/reader123/100/100', bio: '书虫一枚，各种类型都读', created_at: now },
  { id: 4, username: 'bibliophile', email: 'biblio@example.com', password: hashedUserPassword, points: 200, role: 'user', status: 'active', avatar: 'https://picsum.photos/seed/biblio/100/100', bio: '藏书爱好者，愿意与大家分享', created_at: now }
];

const seedBooks: Book[] = [
  { id: 1, title: '百年孤独', author: '加西亚·马尔克斯', cover: 'https://picsum.photos/seed/book1/200/300', description: '魔幻现实主义文学代表作，讲述布恩迪亚家族七代人的传奇故事', category: '文学', condition: '九成新', owner_id: 2, current_holder_id: 2, status: 'available', approval_status: 'approved', reviewed_by: 1, reviewed_at: now, points_required: 15, created_at: now },
  { id: 2, title: '三体', author: '刘慈欣', cover: 'https://picsum.photos/seed/book2/200/300', description: '中国科幻里程碑之作，展现宇宙级别的文明冲突', category: '科幻', condition: '全新', owner_id: 3, current_holder_id: 3, status: 'available', approval_status: 'approved', reviewed_by: 1, reviewed_at: now, points_required: 20, created_at: now },
  { id: 3, title: '小王子', author: '安托万·德·圣-埃克苏佩里', cover: 'https://picsum.photos/seed/book3/200/300', description: '写给大人的童话，关于爱与责任的寓言', category: '童话', condition: '八成新', owner_id: 2, current_holder_id: 2, status: 'available', approval_status: 'approved', reviewed_by: 1, reviewed_at: now, points_required: 8, created_at: now },
  { id: 4, title: '活着', author: '余华', cover: 'https://picsum.photos/seed/book4/200/300', description: '讲述一个人和他的命运之间的友情', category: '文学', condition: '九成新', owner_id: 4, current_holder_id: 4, status: 'available', approval_status: 'approved', reviewed_by: 1, reviewed_at: now, points_required: 12, created_at: now },
  { id: 5, title: '人类简史', author: '尤瓦尔·赫拉利', cover: 'https://picsum.photos/seed/book5/200/300', description: '从认知革命到科学革命，重新审视人类历史', category: '历史', condition: '全新', owner_id: 3, current_holder_id: 3, status: 'available', approval_status: 'approved', reviewed_by: 1, reviewed_at: now, points_required: 18, created_at: now }
];

const seedData: Data = {
  users: seedUsers,
  books: seedBooks,
  driftRecords: [
    { id: 1, book_id: 1, user_id: 1, notes: '这是我读过最震撼的小说，魔幻与现实交织得如此美妙', rating: 5, read_date: '2024-01-15', created_at: now },
    { id: 2, book_id: 1, user_id: 2, notes: '布恩迪亚家族的命运让人唏嘘，好书值得反复阅读', rating: 5, read_date: '2024-03-20', created_at: now },
    { id: 3, book_id: 2, user_id: 2, notes: '想象力爆炸！三体世界的设定太精彩了', rating: 5, read_date: '2024-02-10', created_at: now },
    { id: 4, book_id: 4, user_id: 3, notes: '余华的文字朴实但有力量，读完思考了很久人生', rating: 4, read_date: '2024-04-05', created_at: now }
  ],
  exchanges: [],
  exchangeReviews: [],
  searchHistories: [],
  topics: [
    { id: 1, name: '读书分享', description: '分享你的读书心得和感悟', icon: '📚', post_count: 3, created_at: now },
    { id: 2, name: '书评推荐', description: '好书推荐和深度书评', icon: '⭐', post_count: 2, created_at: now },
    { id: 3, name: '二手书交流', description: '二手书交换、买卖信息', icon: '🔄', post_count: 1, created_at: now },
    { id: 4, name: '读书打卡', description: '每日读书打卡，记录成长', icon: '📅', post_count: 1, created_at: now },
    { id: 5, name: '文学讨论', description: '讨论文学作品与作家', icon: '✍️', post_count: 0, created_at: now }
  ],
  posts: [
    { id: 1, title: '《百年孤独》读后感：孤独是生命的底色', content: '马尔克斯用他魔幻现实主义的笔触，为我们描绘了布恩迪亚家族七代人的传奇故事。', author_id: 1, topic_ids: [1, 2], images: [], view_count: 128, like_count: 15, comment_count: 3, created_at: now, updated_at: now },
    { id: 2, title: '最近在读《三体》，科幻迷们来聊聊', content: '三体世界的设定太绝了！刘慈欣的想象力简直是宇宙级的。', author_id: 2, topic_ids: [1, 5], images: [], view_count: 256, like_count: 32, comment_count: 5, created_at: now, updated_at: now },
    { id: 3, title: '有想换书的朋友吗？我有一批九成新的书', content: '整理书架翻出一批书，九成新，想换一些没看过的书。', author_id: 3, topic_ids: [3], images: [], view_count: 89, like_count: 8, comment_count: 2, created_at: now, updated_at: now }
  ],
  comments: [
    { id: 1, post_id: 1, author_id: 2, content: '写得太好了！每次都有新的感悟。', parent_id: null, like_count: 5, created_at: now },
    { id: 2, post_id: 1, author_id: 3, content: '同感，孤独是这本书永恒的主题。', parent_id: null, like_count: 3, created_at: now },
    { id: 3, post_id: 2, author_id: 1, content: '黑暗森林法则真的是天才级的设定！', parent_id: null, like_count: 8, created_at: now }
  ],
  postLikes: [
    { id: 1, post_id: 1, user_id: 2, created_at: now },
    { id: 2, post_id: 2, user_id: 1, created_at: now }
  ],
  commentLikes: [
    { id: 1, comment_id: 1, user_id: 3, created_at: now }
  ],
  wishlists: [
    { id: 1, user_id: 1, name: '默认心愿单', description: '我的收藏', is_default: true, created_at: now },
    { id: 2, user_id: 2, name: '默认心愿单', description: '我的收藏', is_default: true, created_at: now }
  ],
  wishlistItems: [
    { id: 1, wishlist_id: 1, book_id: 2, created_at: now },
    { id: 2, wishlist_id: 2, book_id: 1, created_at: now }
  ],
  readingGoals: [],
  goalBooks: [],
  achievements: [
    { id: 1, name: '初入书虫', description: '读完第一本书', icon: '📖', type: 'reading', condition_type: 'books_read', condition_value: 1, points_reward: 10, created_at: now },
    { id: 2, name: '阅读新手', description: '累计读完5本书', icon: '📚', type: 'reading', condition_type: 'books_read', condition_value: 5, points_reward: 30, created_at: now },
    { id: 3, name: '社群活跃分子', description: '发布第一篇帖子', icon: '✍️', type: 'social', condition_type: 'posts_made', condition_value: 1, points_reward: 5, created_at: now }
  ],
  userAchievements: [
    { id: 1, user_id: 1, achievement_id: 1, unlocked_at: now }
  ],
  readingClubs: [],
  readingClubParticipants: [],
  follows: [
    { id: 1, follower_id: 2, following_id: 1, created_at: now },
    { id: 2, follower_id: 3, following_id: 1, created_at: now }
  ],
  donations: [],
  donationCertificates: []
};

export function getAuthHeader(userId: number): { Authorization: string } {
  const user = seedUsers.find(u => u.id === userId);
  if (!user) {
    throw new Error(`Test user with id ${userId} not found`);
  }
  const payload = { id: user.id, username: user.username, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

export const TEST_TOKENS = {
  admin: (() => {
    const payload = { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin' };
    return jwt.sign(payload, JWT_SECRET);
  })(),
  booklover: (() => {
    const payload = { id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' };
    return jwt.sign(payload, JWT_SECRET);
  })(),
  reader123: (() => {
    const payload = { id: 3, username: 'reader123', email: 'reader@example.com', role: 'user' };
    return jwt.sign(payload, JWT_SECRET);
  })(),
  bibliophile: (() => {
    const payload = { id: 4, username: 'bibliophile', email: 'biblio@example.com', role: 'user' };
    return jwt.sign(payload, JWT_SECRET);
  })()
};

export const AUTH_HEADERS = {
  admin: { Authorization: `Bearer ${TEST_TOKENS.admin}` },
  booklover: { Authorization: `Bearer ${TEST_TOKENS.booklover}` },
  reader123: { Authorization: `Bearer ${TEST_TOKENS.reader123}` },
  bibliophile: { Authorization: `Bearer ${TEST_TOKENS.bibliophile}` }
};

export { seedData, JWT_SECRET };

beforeAll(async () => {
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
  }

  const adapter = new JSONFile<Data>(DB_PATH);
  const db = new Low<Data>(adapter, seedData);
  db.data = seedData;
  await db.write();
});

afterAll(() => {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    fs.unlinkSync(BACKUP_PATH);
  }
});
