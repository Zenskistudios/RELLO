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

const TOKEN_KEY = "rello.session";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    if (response.status === 401 && token) clearToken();
    throw new Error(body.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export const json = (value: unknown) => JSON.stringify(value);
