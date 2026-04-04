export type Category =
  | 'Shopping'
  | 'Tech'
  | 'Fashion'
  | 'Food'
  | 'Travel'
  | 'Relationships'
  | 'Lifestyle'
  | 'Home'
  | 'Other';

export interface Post {
  id: string;
  username: string;
  avatarUrl?: string;
  question: string;
  categories: Category[];
  images?: string[];
  yesCount: number;
  noCount: number;
  commentCount: number;
  createdAt: string;
  userVote?: 'yes' | 'no' | null;
}

export interface Comment {
  id: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isPublic: boolean;
}

export type VoteType = 'yes' | 'no';
