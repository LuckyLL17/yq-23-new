export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export type SortOrder = 'asc' | 'desc';

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ValidationErrorResponse {
  code: number;
  message: string;
  errors: ErrorDetail[];
}

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';

export type BookStatus = 'available' | 'borrowed' | 'lost' | 'removed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type GoalStatus = 'active' | 'completed' | 'failed';
export type ClubStatus = 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
export type DonationStatus = 'pending' | 'approved' | 'rejected';

export type AchievementType = 'reading' | 'goal' | 'social' | 'collection';
export type ConditionType = 'books_read' | 'goals_completed' | 'posts_made' | 'books_added' | 'streak_days' | 'exchange_count';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  points: number;
  role: string;
  status: string;
  avatar?: string;
  bio?: string;
  reading_tags?: string[];
  expertise_fields?: string[];
  shelf_style?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface IdParam {
  id: string;
}
