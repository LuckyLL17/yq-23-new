import { Router } from 'express';
import db from '../database';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const getParticipantCount = (clubId: number) => {
  return db.data.readingClubParticipants.filter(
    p => p.club_id === clubId && p.status !== 'cancelled'
  ).length;
};

const enrichClub = (club: any, userId?: number) => {
  const organizer = db.data.users.find(u => u.id === club.organizer_id);
  const participantCount = getParticipantCount(club.id);
  
  let isRegistered = false;
  if (userId) {
    isRegistered = db.data.readingClubParticipants.some(
      p => p.club_id === club.id && p.user_id === userId && p.status !== 'cancelled'
    );
  }

  return {
    ...club,
    organizer_name: organizer?.username,
    organizer_avatar: organizer?.avatar,
    participant_count: participantCount,
    is_registered: isRegistered,
    is_full: participantCount >= club.max_participants
  };
};

router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const { status, search, sort_by = 'start_time', sort_order = 'asc', page = 1, limit = 10 } = req.query;
  const userId = req.user?.id;

  await db.read();

  let clubs = [...db.data.readingClubs];

  if (status) {
    clubs = clubs.filter(c => c.status === status);
  }

  if (search) {
    const keyword = (search as string).toLowerCase();
    clubs = clubs.filter(c =>
      c.title.toLowerCase().includes(keyword) ||
      c.description.toLowerCase().includes(keyword) ||
      c.location.toLowerCase().includes(keyword) ||
      (c.book_title && c.book_title.toLowerCase().includes(keyword))
    );
  }

  if (sort_by === 'start_time') {
    clubs.sort((a, b) => {
      const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      return sort_order === 'desc' ? -diff : diff;
    });
  } else if (sort_by === 'created_at') {
    clubs.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort_order === 'asc' ? -diff : diff;
    });
  } else if (sort_by === 'participants') {
    clubs.sort((a, b) => {
      const diff = getParticipantCount(b.id) - getParticipantCount(a.id);
      return sort_order === 'asc' ? -diff : diff;
    });
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = clubs.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedClubs = clubs.slice(startIndex, startIndex + limitNum);

  const enrichedClubs = paginatedClubs.map(club => enrichClub(club, userId));

  res.json({
    clubs: enrichedClubs,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum)
  });
});

router.get('/mine', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userId = req.user.id;
  
  const organizedClubs = db.data.readingClubs
    .filter(c => c.organizer_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const registeredClubIds = db.data.readingClubParticipants
    .filter(p => p.user_id === userId && p.status !== 'cancelled')
    .map(p => p.club_id);

  const registeredClubs = db.data.readingClubs
    .filter(c => registeredClubIds.includes(c.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    organized: organizedClubs.map(c => enrichClub(c, userId)),
    registered: registeredClubs.map(c => enrichClub(c, userId))
  });
});

router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  await db.read();

  const club = db.data.readingClubs.find(c => c.id === parseInt(id));

  if (!club) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  const participants = db.data.readingClubParticipants
    .filter(p => p.club_id === parseInt(id) && p.status !== 'cancelled')
    .map(p => {
      const user = db.data.users.find(u => u.id === p.user_id);
      return {
        ...p,
        user_name: user?.username,
        user_avatar: user?.avatar
      };
    });

  const enrichedClub = {
    ...enrichClub(club, userId),
    participants
  };

  res.json(enrichedClub);
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const {
    title,
    description,
    book_title,
    book_id,
    location,
    location_lat,
    location_lng,
    start_time,
    end_time,
    max_participants,
    cover_image
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '活动标题不能为空' });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({ error: '活动描述不能为空' });
  }

  if (!location || !location.trim()) {
    return res.status(400).json({ error: '活动地点不能为空' });
  }

  if (!start_time || !end_time) {
    return res.status(400).json({ error: '请设置活动开始和结束时间' });
  }

  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: '结束时间必须晚于开始时间' });
  }

  if (!max_participants || max_participants < 1) {
    return res.status(400).json({ error: '最大参与人数不能少于1人' });
  }

  await db.read();

  const newId = Math.max(0, ...db.data.readingClubs.map(c => c.id)) + 1;
  const now = new Date().toISOString();

  const newClub = {
    id: newId,
    title: title.trim(),
    description: description.trim(),
    book_title: book_title || undefined,
    book_id: book_id || undefined,
    organizer_id: req.user.id,
    location: location.trim(),
    location_lat: location_lat ? parseFloat(location_lat) : undefined,
    location_lng: location_lng ? parseFloat(location_lng) : undefined,
    start_time: new Date(start_time).toISOString(),
    end_time: new Date(end_time).toISOString(),
    max_participants: parseInt(max_participants),
    status: 'upcoming' as const,
    cover_image: cover_image || undefined,
    created_at: now,
    updated_at: now
  };

  db.data.readingClubs.push(newClub);
  await db.write();

  res.status(201).json(enrichClub(newClub, req.user.id));
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const {
    title,
    description,
    book_title,
    book_id,
    location,
    location_lat,
    location_lng,
    start_time,
    end_time,
    max_participants,
    status,
    cover_image
  } = req.body;

  await db.read();

  const clubIndex = db.data.readingClubs.findIndex(c => c.id === parseInt(id));

  if (clubIndex === -1) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  const club = db.data.readingClubs[clubIndex];

  if (club.organizer_id !== req.user.id) {
    return res.status(403).json({ error: '只有活动发起人可以编辑' });
  }

  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({ error: '活动标题不能为空' });
    }
    club.title = title.trim();
  }

  if (description !== undefined) {
    if (!description.trim()) {
      return res.status(400).json({ error: '活动描述不能为空' });
    }
    club.description = description.trim();
  }

  if (book_title !== undefined) {
    club.book_title = book_title || undefined;
  }

  if (book_id !== undefined) {
    club.book_id = book_id || undefined;
  }

  if (location !== undefined) {
    if (!location.trim()) {
      return res.status(400).json({ error: '活动地点不能为空' });
    }
    club.location = location.trim();
  }

  if (location_lat !== undefined) {
    club.location_lat = location_lat ? parseFloat(location_lat) : undefined;
  }

  if (location_lng !== undefined) {
    club.location_lng = location_lng ? parseFloat(location_lng) : undefined;
  }

  if (start_time !== undefined) {
    const endTime = end_time ? new Date(end_time) : new Date(club.end_time);
    if (new Date(start_time) >= endTime) {
      return res.status(400).json({ error: '结束时间必须晚于开始时间' });
    }
    club.start_time = new Date(start_time).toISOString();
  }

  if (end_time !== undefined) {
    if (new Date(club.start_time) >= new Date(end_time)) {
      return res.status(400).json({ error: '结束时间必须晚于开始时间' });
    }
    club.end_time = new Date(end_time).toISOString();
  }

  if (max_participants !== undefined) {
    const participantCount = getParticipantCount(parseInt(id));
    if (parseInt(max_participants) < participantCount) {
      return res.status(400).json({ error: `最大人数不能少于当前报名人数(${participantCount}人)` });
    }
    if (parseInt(max_participants) < 1) {
      return res.status(400).json({ error: '最大参与人数不能少于1人' });
    }
    club.max_participants = parseInt(max_participants);
  }

  if (status !== undefined && ['upcoming', 'ongoing', 'ended', 'cancelled'].includes(status)) {
    club.status = status;
  }

  if (cover_image !== undefined) {
    club.cover_image = cover_image || undefined;
  }

  club.updated_at = new Date().toISOString();

  await db.write();

  res.json(enrichClub(club, req.user.id));
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();

  const clubIndex = db.data.readingClubs.findIndex(c => c.id === parseInt(id));

  if (clubIndex === -1) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  const club = db.data.readingClubs[clubIndex];

  if (club.organizer_id !== req.user.id) {
    return res.status(403).json({ error: '只有活动发起人可以删除' });
  }

  db.data.readingClubParticipants = db.data.readingClubParticipants.filter(p => p.club_id !== parseInt(id));
  db.data.readingClubs.splice(clubIndex, 1);
  await db.write();

  res.json({ message: '读书会活动已删除' });
});

router.post('/:id/register', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const clubId = parseInt(id);

  await db.read();

  const club = db.data.readingClubs.find(c => c.id === clubId);

  if (!club) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  if (club.organizer_id === req.user.id) {
    return res.status(400).json({ error: '活动发起人无需报名' });
  }

  if (club.status !== 'upcoming' && club.status !== 'ongoing') {
    return res.status(400).json({ error: '活动已结束或已取消，无法报名' });
  }

  const existingParticipant = db.data.readingClubParticipants.find(
    p => p.club_id === clubId && p.user_id === req.user!.id
  );

  if (existingParticipant && existingParticipant.status !== 'cancelled') {
    return res.status(400).json({ error: '您已报名该活动' });
  }

  const participantCount = getParticipantCount(clubId);
  if (participantCount >= club.max_participants) {
    return res.status(400).json({ error: '报名人数已满' });
  }

  if (existingParticipant && existingParticipant.status === 'cancelled') {
    existingParticipant.status = 'registered';
    existingParticipant.registered_at = new Date().toISOString();
  } else {
    const newId = Math.max(0, ...db.data.readingClubParticipants.map(p => p.id)) + 1;
    db.data.readingClubParticipants.push({
      id: newId,
      club_id: clubId,
      user_id: req.user.id,
      status: 'registered',
      registered_at: new Date().toISOString()
    });
  }

  await db.write();

  const user = db.data.users.find(u => u.id === req.user!.id);

  res.json({
    message: '报名成功',
    participant: {
      id: existingParticipant?.id || Math.max(...db.data.readingClubParticipants.map(p => p.id)),
      club_id: clubId,
      user_id: req.user.id,
      status: 'registered',
      registered_at: new Date().toISOString(),
      user_name: user?.username,
      user_avatar: user?.avatar
    }
  });
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const clubId = parseInt(id);

  await db.read();

  const club = db.data.readingClubs.find(c => c.id === clubId);

  if (!club) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  const participant = db.data.readingClubParticipants.find(
    p => p.club_id === clubId && p.user_id === req.user!.id && p.status !== 'cancelled'
  );

  if (!participant) {
    return res.status(400).json({ error: '您尚未报名该活动' });
  }

  participant.status = 'cancelled';
  await db.write();

  res.json({ message: '已取消报名' });
});

router.get('/:id/participants', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const clubId = parseInt(id);

  await db.read();

  const club = db.data.readingClubs.find(c => c.id === clubId);

  if (!club) {
    return res.status(404).json({ error: '读书会活动不存在' });
  }

  const participants = db.data.readingClubParticipants
    .filter(p => p.club_id === clubId && p.status !== 'cancelled')
    .sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime())
    .map(p => {
      const user = db.data.users.find(u => u.id === p.user_id);
      return {
        ...p,
        user_name: user?.username,
        user_avatar: user?.avatar,
        user_bio: user?.bio
      };
    });

  res.json(participants);
});

export default router;
