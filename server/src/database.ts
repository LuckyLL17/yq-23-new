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

interface Exchange {
  id: number;
  book_id: number;
  requester_id: number;
  owner_id: number;
  status: string;
  message?: string;
  created_at: string;
}

interface Data {
  users: User[];
  books: Book[];
  driftRecords: DriftRecord[];
  exchanges: Exchange[];
}

const defaultData: Data = {
  users: [],
  books: [],
  driftRecords: [],
  exchanges: []
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

    await db.write();
    console.log('Sample data inserted');
  }

  console.log('Database initialized');
}

initDatabase();

export default db;
