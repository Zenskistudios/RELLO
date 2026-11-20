import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "./db";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const sessionSecret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");
mkdirSync("uploads", { recursive: true });
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve("uploads"), { maxAge: "1d" }));

type User = { id: number; username: string; display_name: string; email: string };
type AuthRequest = Request & { user?: User };
type PostRow = {
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
  liked: number;
  bookmarked: number;
  reposted: number;
  following: number;
};

const publicUser = (id: number) =>
  db.prepare("SELECT id, username, display_name, bio, location, avatar_url, verified, account_type, is_private FROM users WHERE id = ?").get(id);

function signToken(user: User) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return res.status(401).json({ error: "Your session is invalid. Sign in again." });
  const expected = createHmac("sha256", sessionSecret).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return res.status(401).json({ error: "Your session is invalid. Sign in again." });
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: "Your session is invalid. Sign in again." });
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id: number; exp: number };
    if (!Number.isInteger(data.id) || data.exp < Date.now()) return res.status(401).json({ error: "Your session has expired. Sign in again." });
    const user = db.prepare("SELECT id, username, display_name, email FROM users WHERE id = ?").get(data.id) as User | undefined;
    if (!user) return res.status(401).json({ error: "Your account is no longer available." });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid. Sign in again." });
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, "uploads"),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/.test(file.mimetype)) callback(null, true);
    else callback(new Error("Upload a JPG, PNG, GIF, WebP, MP4, WebM, or MOV file."));
  }
});
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, "uploads"),
    filename: (_req, file, callback) => callback(null, `avatar-${Date.now()}-${randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) callback(null, true);
    else callback(new Error("Profile photos must be JPG, PNG, GIF, or WebP images."));
  }
});

function addNotification(userId: number, actorId: number, kind: string, postId: number | null = null) {
  if (userId !== actorId) {
    db.prepare("INSERT INTO notifications (user_id, actor_id, kind, post_id) VALUES (?, ?, ?, ?)").run(userId, actorId, kind, postId);
  }
}

function saveTagsAndMentions(postId: number, body: string, actorId: number) {
  const tags = [...body.matchAll(/#([\p{L}\p{N}_]{1,50})/gu)].map((match) => match[1]);
  const insertTag = db.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag) VALUES (?, ?)");
  for (const tag of tags) insertTag.run(postId, tag);
  const mentions = [...new Set([...body.matchAll(/@([a-zA-Z0-9_]{2,30})/g)].map((match) => match[1].toLowerCase()))];
  const findUser = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE");
  const insertMention = db.prepare("INSERT OR IGNORE INTO post_mentions (post_id, user_id) VALUES (?, ?)");
  for (const username of mentions) {
    const mentioned = findUser.get(username) as { id: number } | undefined;
    if (mentioned) {
      insertMention.run(postId, mentioned.id);
      addNotification(mentioned.id, actorId, "mention", postId);
    }
  }
}

const postSelect = `
  SELECT p.*, u.username, u.display_name, u.avatar_url, u.verified,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
    (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS repost_count,
    (SELECT COUNT(*) FROM shares s WHERE s.post_id = p.id) AS share_count,
    (SELECT COUNT(*) FROM incident_follows i WHERE i.post_id = p.id) AS incident_follower_count,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = @viewer) AS liked,
    EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = @viewer) AS bookmarked,
    EXISTS(SELECT 1 FROM reposts r WHERE r.post_id = p.id AND r.user_id = @viewer) AS reposted,
    EXISTS(SELECT 1 FROM incident_follows i WHERE i.post_id = p.id AND i.user_id = @viewer) AS incident_following,
    EXISTS(SELECT 1 FROM follows f WHERE f.followed_id = p.user_id AND f.follower_id = @viewer) AS following
  FROM posts p JOIN users u ON u.id = p.user_id`;

const accessCondition = `(p.visibility = 'public' OR p.user_id = @viewer OR (p.visibility = 'followers' AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = @viewer AND f.followed_id = p.user_id)))`;

function postForViewer(id: number, viewerId: number) {
  return db.prepare(`${postSelect} WHERE p.id = @id AND ${accessCondition}`).get({ viewer: viewerId, id });
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", (req, res) => {
  const username = String(req.body.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const displayName = String(req.body.displayName ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: "Usernames must be 3–30 letters, numbers, or underscores." });
  if (displayName.length < 2 || displayName.length > 60) return res.status(400).json({ error: "Add a display name between 2 and 60 characters." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Your password must be at least 8 characters." });
  const actualSalt = randomBytes(16).toString("hex");
  const actualHash = scryptSync(password, actualSalt, 64).toString("hex");
  try {
    const result = db.prepare("INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)").run(username, displayName, email, `${actualSalt}:${actualHash}`);
    const user = db.prepare("SELECT id, username, display_name, email FROM users WHERE id = ?").get(result.lastInsertRowid) as User;
    return res.status(201).json({ token: signToken(user), user: publicUser(user.id) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return res.status(409).json({ error: "That email or username is already in use." });
    throw error;
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const user = db.prepare("SELECT id, username, display_name, email, password_hash FROM users WHERE email = ? COLLATE NOCASE").get(email) as (User & { password_hash: string }) | undefined;
  const [salt, storedHash] = user?.password_hash.split(":") ?? ["", ""];
  const actualHash = user ? scryptSync(password, salt, 64) : randomBytes(64);
  const expectedHash = Buffer.from(storedHash || "0".repeat(128), "hex");
  if (!user || expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  return res.json({ token: signToken(user), user: publicUser(user.id) });
});

app.get("/api/auth/me", authenticate, (req: AuthRequest, res) => res.json(publicUser(req.user!.id)));

app.patch("/api/profile", authenticate, avatarUpload.single("avatar"), (req: AuthRequest, res) => {
  const displayName = String(req.body.display_name ?? "").trim();
  const bio = String(req.body.bio ?? "");
  const location = String(req.body.location ?? "").trim();
  const isPrivate = req.body.is_private === "true" || req.body.is_private === true;
  if (displayName.length < 2 || displayName.length > 60) return res.status(400).json({ error: "Your display name must be between 2 and 60 characters." });
  if (bio.length > 280) return res.status(400).json({ error: "Your bio can be up to 280 characters." });
  if (location.length > 120) return res.status(400).json({ error: "Your location can be up to 120 characters." });
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.prepare(`
    UPDATE users SET display_name = ?, bio = ?, location = ?, is_private = ?, avatar_url = COALESCE(?, avatar_url)
    WHERE id = ?
  `).run(displayName, bio, location, isPrivate ? 1 : 0, avatarUrl, req.user!.id);
  return res.json(publicUser(req.user!.id));
});

app.get("/api/feed", authenticate, (req: AuthRequest, res) => {
  const viewerId = req.user!.id;
  const tab = String(req.query.tab ?? "for-you");
  const category = String(req.query.category ?? "");
  const conditions = [accessCondition, "NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id = @viewer AND b.blocked_user_id = p.user_id)", "NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id = p.user_id AND b.blocked_user_id = @viewer)", "NOT EXISTS (SELECT 1 FROM mutes m WHERE m.user_id = @viewer AND m.muted_user_id = p.user_id)"];
  if (tab === "following") conditions.push("EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = @viewer AND f.followed_id = p.user_id)");
  if (tab === "nearby") conditions.push("(p.location <> '' OR p.latitude IS NOT NULL)");
  if (category) conditions.push("p.category = @category");
  const order = tab === "trending" ? "like_count DESC, comment_count DESC, p.created_at DESC" : "p.created_at DESC";
  const posts = db.prepare(`${postSelect} WHERE ${conditions.join(" AND ")} ORDER BY ${order} LIMIT 60`)
    .all({ viewer: viewerId, category }) as PostRow[];
  return res.json(posts);
});

app.get("/api/posts/:id", authenticate, (req: AuthRequest, res) => {
  const post = postForViewer(Number(req.params.id), req.user!.id);
  if (!post) return res.status(404).json({ error: "This post could not be found." });
  const comments = db.prepare(`
    SELECT c.id, c.post_id, c.parent_id, c.body, c.created_at, u.id AS user_id,
      u.username, u.display_name, u.avatar_url, u.verified
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC LIMIT 100
  `).all(req.params.id);
  return res.json({ post, comments });
});

app.post("/api/posts", authenticate, upload.single("media"), (req: AuthRequest, res) => {
  const body = String(req.body.body ?? "").trim().slice(0, 2000);
  const mode = String(req.body.mode ?? "update");
  const visibility = ["public", "followers", "private"].includes(req.body.visibility) ? req.body.visibility : "public";
  const location = String(req.body.location ?? "").trim().slice(0, 120);
  const category = String(req.body.category ?? "").trim().slice(0, 40);
  const latitude = req.body.latitude ? Number(req.body.latitude) : null;
  const longitude = req.body.longitude ? Number(req.body.longitude) : null;
  const mediaUrl = req.file ? `/uploads/${req.file.filename}` : "";
  const mediaType = req.file ? req.file.mimetype.startsWith("video/") ? "video" : "image" : "";
  const postType = mode === "incident" ? "incident" : mode === "announcement" ? "announcement" : mediaType || "update";
  if (!body && !mediaUrl) return res.status(400).json({ error: "Add a note or an attachment before posting." });
  if (body.length > 2000) return res.status(400).json({ error: "Posts can be up to 2,000 characters." });
  if (mode === "incident" && !category) return res.status(400).json({ error: "Choose an incident category." });
  if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
    return res.status(400).json({ error: "Enter valid map coordinates." });
  }
  if (mode === "announcement") {
    const author = db.prepare("SELECT account_type, verified FROM users WHERE id = ?").get(req.user!.id) as { account_type: string; verified: number };
    if (author.account_type !== "organisation" || !author.verified) return res.status(403).json({ error: "Only verified organisation accounts can publish public safety announcements." });
  }
  const postId = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO posts (user_id, body, media_url, media_type, post_type, visibility, location, latitude, longitude, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user!.id, body, mediaUrl, mediaType, postType, visibility, location, latitude, longitude, category);
    saveTagsAndMentions(Number(result.lastInsertRowid), body, req.user!.id);
    return Number(result.lastInsertRowid);
  })();
  return res.status(201).json(postForViewer(postId, req.user!.id));
});

app.get("/api/videos", authenticate, (req: AuthRequest, res) => {
  const videos = db.prepare(`${postSelect} WHERE p.visibility = 'public' AND p.media_type = 'video' AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id = @viewer AND b.blocked_user_id = p.user_id) AND NOT EXISTS (SELECT 1 FROM mutes m WHERE m.user_id = @viewer AND m.muted_user_id = p.user_id) ORDER BY p.created_at DESC LIMIT 50`).all({ viewer: req.user!.id });
  return res.json(videos);
});

app.post("/api/posts/:id/like", authenticate, (req: AuthRequest, res) => {
  const post = postForViewer(Number(req.params.id), req.user!.id) as { user_id: number } | undefined;
  if (!post) return res.status(404).json({ error: "This post could not be found." });
  const exists = db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?").get(req.user!.id, req.params.id);
  if (exists) db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(req.user!.id, req.params.id);
  else {
    db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(req.user!.id, req.params.id);
    addNotification(post.user_id, req.user!.id, "like", Number(req.params.id));
  }
  return res.json({ liked: !exists });
});

app.post("/api/posts/:id/comments", authenticate, (req: AuthRequest, res) => {
  const post = postForViewer(Number(req.params.id), req.user!.id) as { user_id: number } | undefined;
  const body = String(req.body.body ?? "").trim();
  const parentId = req.body.parentId ? Number(req.body.parentId) : null;
  if (!post) return res.status(404).json({ error: "This post could not be found." });
  if (!body || body.length > 1000) return res.status(400).json({ error: "Replies must be between 1 and 1,000 characters." });
  if (parentId && !db.prepare("SELECT 1 FROM comments WHERE id = ? AND post_id = ?").get(parentId, req.params.id)) return res.status(400).json({ error: "That reply is no longer available." });
  const result = db.prepare("INSERT INTO comments (user_id, post_id, parent_id, body) VALUES (?, ?, ?, ?)").run(req.user!.id, req.params.id, parentId, body);
  addNotification(post.user_id, req.user!.id, "comment", Number(req.params.id));
  saveTagsAndMentions(Number(req.params.id), body, req.user!.id);
  const comment = db.prepare("SELECT c.id, c.post_id, c.parent_id, c.body, c.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.verified FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?").get(result.lastInsertRowid);
  return res.status(201).json(comment);
});

app.post("/api/posts/:id/repost", authenticate, (req: AuthRequest, res) => {
  const post = postForViewer(Number(req.params.id), req.user!.id) as { user_id: number } | undefined;
  if (!post) return res.status(404).json({ error: "This post could not be found." });
  const quote = String(req.body.quote ?? "").trim().slice(0, 500);
  const exists = db.prepare("SELECT 1 FROM reposts WHERE user_id = ? AND post_id = ?").get(req.user!.id, req.params.id);
  if (exists) db.prepare("DELETE FROM reposts WHERE user_id = ? AND post_id = ?").run(req.user!.id, req.params.id);
  else {
    db.prepare("INSERT INTO reposts (user_id, post_id, quote) VALUES (?, ?, ?)").run(req.user!.id, req.params.id, quote);
    addNotification(post.user_id, req.user!.id, "repost", Number(req.params.id));
  }
  return res.json({ reposted: !exists });
});

app.post("/api/posts/:id/bookmark", authenticate, (req: AuthRequest, res) => {
  if (!postForViewer(Number(req.params.id), req.user!.id)) return res.status(404).json({ error: "This post could not be found." });
  const exists = db.prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?").get(req.user!.id, req.params.id);
  if (exists) db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?").run(req.user!.id, req.params.id);
  else db.prepare("INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)").run(req.user!.id, req.params.id);
  return res.json({ bookmarked: !exists });
});

app.post("/api/posts/:id/share", authenticate, (req: AuthRequest, res) => {
  if (!postForViewer(Number(req.params.id), req.user!.id)) return res.status(404).json({ error: "This post could not be found." });
  db.prepare("INSERT INTO shares (user_id, post_id) VALUES (?, ?)").run(req.user!.id, req.params.id);
  return res.status(201).json({ shared: true });
});

app.post("/api/posts/:id/follow-incident", authenticate, (req: AuthRequest, res) => {
  const post = postForViewer(Number(req.params.id), req.user!.id) as { post_type?: string } | undefined;
  if (!post || post.post_type !== "incident") return res.status(404).json({ error: "This civic report could not be found." });
  const exists = db.prepare("SELECT 1 FROM incident_follows WHERE user_id = ? AND post_id = ?").get(req.user!.id, req.params.id);
  if (exists) db.prepare("DELETE FROM incident_follows WHERE user_id = ? AND post_id = ?").run(req.user!.id, req.params.id);
  else db.prepare("INSERT INTO incident_follows (user_id, post_id) VALUES (?, ?)").run(req.user!.id, req.params.id);
  return res.json({ following: !exists });
});

app.get("/api/bookmarks", authenticate, (req: AuthRequest, res) => {
  const posts = db.prepare(`${postSelect} JOIN bookmarks b ON b.post_id = p.id AND b.user_id = @viewer WHERE ${accessCondition} ORDER BY b.created_at DESC LIMIT 60`).all({ viewer: req.user!.id });
  return res.json(posts);
});

app.post("/api/users/:id/follow", authenticate, (req: AuthRequest, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user!.id) return res.status(400).json({ error: "You cannot follow yourself." });
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(targetId);
  if (!target) return res.status(404).json({ error: "This account could not be found." });
  const exists = db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?").get(req.user!.id, targetId);
  if (exists) db.prepare("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?").run(req.user!.id, targetId);
  else {
    db.prepare("INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)").run(req.user!.id, targetId);
    addNotification(targetId, req.user!.id, "follow");
  }
  return res.json({ following: !exists });
});

app.get("/api/users/:username", authenticate, (req: AuthRequest, res) => {
  const user = db.prepare("SELECT id, username, display_name, bio, location, avatar_url, verified, account_type, is_private, created_at FROM users WHERE username = ? COLLATE NOCASE").get(req.params.username) as (Record<string, unknown> & { id: number }) | undefined;
  if (!user) return res.status(404).json({ error: "This account could not be found." });
  const viewerId = req.user!.id;
  const follows = Boolean(db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?").get(viewerId, user.id));
  if (user.is_private && user.id !== viewerId && !follows) return res.json({ user, posts: [], following: false, private: true, followers: 0, followingCount: 0 });
  const posts = db.prepare(`${postSelect} WHERE p.user_id = @profile AND ${accessCondition} ORDER BY p.created_at DESC LIMIT 60`).all({ viewer: viewerId, profile: user.id });
  const followers = Number(db.prepare("SELECT COUNT(*) FROM follows WHERE followed_id = ?").pluck().get(user.id));
  const followingCount = Number(db.prepare("SELECT COUNT(*) FROM follows WHERE follower_id = ?").pluck().get(user.id));
  return res.json({ user, posts, following: follows, followers, followingCount });
});

app.get("/api/search", authenticate, (req: AuthRequest, res) => {
  const query = String(req.query.q ?? "").trim().slice(0, 100);
  if (!query) return res.json({ users: [], posts: [], trends: [] });
  const users = db.prepare("SELECT id, username, display_name, bio, avatar_url, verified FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 10").all(`%${query}%`, `%${query}%`);
  const posts = db.prepare(`${postSelect} WHERE p.visibility = 'public' AND p.body LIKE @query ORDER BY p.created_at DESC LIMIT 20`).all({ viewer: req.user!.id, query: `%${query}%` });
  const trends = db.prepare("SELECT tag, COUNT(*) AS count FROM post_tags WHERE tag LIKE ? GROUP BY tag ORDER BY count DESC LIMIT 5").all(`%${query.replace(/^#/, "")}%`);
  return res.json({ users, posts, trends });
});

app.get("/api/trending", authenticate, (_req, res) => {
  const trends = db.prepare("SELECT tag, COUNT(*) AS count FROM post_tags GROUP BY tag ORDER BY count DESC, tag LIMIT 8").all();
  return res.json(trends);
});

app.get("/api/notifications", authenticate, (req: AuthRequest, res) => {
  const notifications = db.prepare(`
    SELECT n.id, n.kind, n.post_id, n.read_at, n.created_at, u.username, u.display_name, u.avatar_url, u.verified
    FROM notifications n JOIN users u ON u.id = n.actor_id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).all(req.user!.id);
  return res.json(notifications);
});

app.post("/api/notifications/read", authenticate, (req: AuthRequest, res) => {
  db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(req.user!.id);
  return res.json({ ok: true });
});

app.post("/api/posts/:id/report", authenticate, (req: AuthRequest, res) => {
  const reason = String(req.body.reason ?? "").trim().slice(0, 200);
  if (reason.length < 3) return res.status(400).json({ error: "Tell us why you are reporting this post." });
  try {
    db.prepare("INSERT INTO content_reports (reporter_id, post_id, reason) VALUES (?, ?, ?)").run(req.user!.id, req.params.id, reason);
    return res.status(201).json({ reported: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return res.status(409).json({ error: "You have already reported this post." });
    if (error instanceof Error && error.message.includes("FOREIGN KEY")) return res.status(404).json({ error: "This post could not be found." });
    throw error;
  }
});

app.post("/api/users/:id/:action", authenticate, (req: AuthRequest, res) => {
  const targetId = Number(req.params.id);
  const action = req.params.action;
  if (!Number.isInteger(targetId) || targetId === req.user!.id || !["block", "mute"].includes(action)) return res.status(400).json({ error: "That action is not available." });
  if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(targetId)) return res.status(404).json({ error: "This account could not be found." });
  const table = action === "block" ? "blocks" : "mutes";
  const targetColumn = action === "block" ? "blocked_user_id" : "muted_user_id";
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE user_id = ? AND ${targetColumn} = ?`).get(req.user!.id, targetId);
  if (exists) db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND ${targetColumn} = ?`).run(req.user!.id, targetId);
  else db.prepare(`INSERT INTO ${table} (user_id, ${targetColumn}) VALUES (?, ?)`).run(req.user!.id, targetId);
  return res.json({ active: !exists });
});

app.get("/api/map/incidents", authenticate, (req: AuthRequest, res) => {
  const category = String(req.query.category ?? "");
  const time = String(req.query.time ?? "");
  const verified = String(req.query.verified ?? "");
  const conditions = ["p.visibility = 'public'", "p.post_type IN ('incident', 'announcement')", "p.latitude IS NOT NULL", "p.longitude IS NOT NULL", "NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id = @viewer AND b.blocked_user_id = p.user_id)"];
  if (category) conditions.push("p.category = @category");
  if (time === "24h") conditions.push("p.created_at >= datetime('now', '-1 day')");
  else if (time === "7d") conditions.push("p.created_at >= datetime('now', '-7 days')");
  if (verified === "verified") conditions.push("p.incident_status IN ('verified', 'acknowledged', 'in-progress', 'resolved')");
  else if (verified === "unverified") conditions.push("p.incident_status = 'unverified'");
  const posts = db.prepare(`${postSelect} WHERE ${conditions.join(" AND ")} ORDER BY p.created_at DESC LIMIT 200`).all({ viewer: req.user!.id, category });
  return res.json(posts);
});

if (existsSync(path.resolve("dist", "index.html"))) {
  app.use(express.static(path.resolve("dist")));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) return res.sendFile(path.resolve("dist", "index.html"));
    return next();
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Attachments must be 50 MB or smaller." : error.message });
  if (error instanceof Error && (error.message.startsWith("Upload a") || error.message.startsWith("Profile photos"))) return res.status(400).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(port, () => console.log(`Rello API listening on http://localhost:${port}`));
