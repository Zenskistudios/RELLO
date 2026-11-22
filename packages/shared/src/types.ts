export type User = {
  id: number;
  username: string;
  display_name: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  verified: number;
  account_type?: string;
  is_private?: number;
};

export type Post = {
  id: number;
  user_id: number;
  body: string;
  media_url: string;
  media_type: string;
  post_type: string;
  visibility: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  incident_status: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  verified: number;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  incident_follower_count: number;
  liked: number;
  bookmarked: number;
  reposted: number;
  incident_following: number;
  following: number;
};

export type Comment = {
  id: number;
  post_id: number;
  parent_id: number | null;
  body: string;
  created_at: string;
  user_id: number;
  username: string;
  display_name: string;
  avatar_url: string;
  verified: number;
};

export type Notification = {
  id: number;
  kind: string;
  post_id: number | null;
  read_at: string | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  verified: number;
};
