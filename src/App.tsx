import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgeCheck, Bell, Bookmark, Check, ChevronDown, ChevronRight,
  CircleHelp, Ellipsis, ExternalLink, Eye, EyeOff, Film, Flag, Globe2, Heart, House, ImagePlus, LocateFixed,
  LogOut, Map as MapIcon, MapPin, MessageCircle, MoreHorizontal, Play, Plus, Radio, Repeat2, Search,
  Settings2, ShieldCheck, Sparkles, X, type LucideIcon
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { api, assetUrl, clearToken, getToken, json, setToken, type Comment, type Notification, type Post, type User } from "./api";

type Screen = "feed" | "discover" | "map" | "notifications" | "bookmarks" | "profile" | "search";
type FeedTab = "for-you" | "following" | "nearby" | "trending";
type Toast = { id: number; message: string; tone?: "error" | "success" };
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const navItems: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: "feed", label: "Home", icon: House },
  { id: "discover", label: "Watch", icon: Film },
  { id: "map", label: "The map", icon: MapIcon },
  { id: "notifications", label: "Activity", icon: Bell },
  { id: "bookmarks", label: "Saved", icon: Bookmark }
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

function Avatar({ name, src, size = "md", online = false }: { name: string; src?: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  return (
    <span className={`avatar avatar-${size}`}>
      {src ? <img src={assetUrl(src)} alt="" /> : <span>{initials(name)}</span>}
      {online && <i />}
    </span>
  );
}

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(`${date.replace(" ", "T")}Z`).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(`${date.replace(" ", "T")}Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AuthScreen({ onAuth }: { onAuth: (user: User, token: string) => void }) {
  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const result = await api<{ user: User; token: string }>(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: json(payload)
      });
      onAuth(result.user, result.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't sign you in.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: "welcome" | "login" | "register") {
    setError("");
    setShowPassword(false);
    setMode(nextMode);
  }

  return (
    <main className={`auth-page ${mode === "welcome" ? "auth-welcome" : "auth-entering"}`}>
      <section className="auth-brand" aria-label="About Rello">
        <div className="brand-lockup brand-lockup-light" aria-label="Rello"><span className="brand-mark"><Activity size={21} strokeWidth={2.8} /></span><span>Rel<span>lo</span></span></div>
        <div className="auth-story">
          <div className="eyebrow"><span className="live-dot" /> A little closer to home</div>
          <h1>Your city,<br />in the <em>conversation.</em></h1>
          <p>Neighbourhood voices. Real-time updates. Small actions that make a city move.</p>
          <div className="auth-illustration" aria-hidden="true">
            <span className="auth-orbit auth-orbit-one" /><span className="auth-orbit auth-orbit-two" />
            <span className="auth-map-line auth-map-line-one" /><span className="auth-map-line auth-map-line-two" />
            <span className="auth-pin auth-pin-one"><MapPin size={19} fill="currentColor" /></span>
            <span className="auth-pin auth-pin-two"><MapPin size={16} fill="currentColor" /></span>
            <span className="auth-note"><span className="auth-note-dot" /> Around the corner <small>People & places, together</small></span>
          </div>
        </div>
        <div className="auth-community"><span>Made for the places we call home</span><span className="auth-community-spark">✳</span><span>Nigeria</span></div>
      </section>
      <section className="auth-form-wrap">
        <div className="mobile-auth-brand brand-lockup" aria-label="Rello"><span className="brand-mark"><Activity size={21} strokeWidth={2.8} /></span><span>Rel<span>lo</span></span></div>
        {mode === "welcome" ? (
          <div className="auth-welcome-card">
            <span className="eyebrow muted">YOUR NEIGHBOURHOOD IS HERE</span>
            <h2>Good things happen <span>closer.</span></h2>
            <p className="auth-subtitle">Find your people, share what’s happening, and stay in the conversation around the places you call home.</p>
            <button className="button button-primary auth-submit" onClick={() => changeMode("register")}>Create your account<ArrowUpRight size={17} /></button>
            <button className="button auth-login-button" onClick={() => changeMode("login")}>Log in</button>
            <p className="auth-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
            {error && <div className="auth-inline-note" role="status">{error}</div>}
          </div>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <button className="auth-back" type="button" onClick={() => changeMode("welcome")}><ArrowLeft size={15} /> Back</button>
            <span className="eyebrow muted">{mode === "register" ? "YOUR NEIGHBOURHOOD IS HERE" : "GOOD TO SEE YOU AGAIN"}</span>
            <h2>{mode === "register" ? "Make yourself at home." : "Welcome back."}</h2>
            <p className="auth-subtitle">{mode === "register" ? "Join the people shaping the places we share." : "The conversation has been going on without you."}</p>
            {mode === "register" && <label>Your name<input name="displayName" autoComplete="name" placeholder="How should we call you?" required minLength={2} maxLength={60} /></label>}
            {mode === "register" && <label>Choose a username<div className="input-prefix"><span>@</span><input name="username" autoComplete="username" placeholder="yourname" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" title="Use 3–30 letters, numbers, or underscores." /></div></label>}
            <label>{mode === "login" ? "Email address or username" : "Email address"}<input name={mode === "login" ? "identifier" : "email"} type={mode === "login" ? "text" : "email"} autoComplete={mode === "login" ? "username" : "email"} placeholder={mode === "login" ? "you@example.com or username" : "you@example.com"} required /></label>
            <label>Password<div className="auth-password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "At least 8 characters" : "Your password"} minLength={8} maxLength={128} required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {mode === "login" && <button type="button" className="auth-forgot" onClick={() => setError("Password reset isn't available yet. Please contact support if you need help accessing your account.")}>Forgot password?</button>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" disabled={loading}>{loading ? "One moment…" : mode === "register" ? "Create your account" : "Log in"}<ArrowUpRight size={17} /></button>
            <div className="auth-switch">{mode === "register" ? "Already part of the neighbourhood?" : "New around here?"}<button type="button" onClick={() => changeMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "Log in" : "Create an account"}</button></div>
            {mode === "register" && <p className="auth-terms">By continuing, you agree to keep this a kind, constructive space for everyone.</p>}
          </form>
        )}
        <span className="auth-footer">A little closer to home <span>✳</span> Nigeria</span>
      </section>
    </main>
  );
}

function PostCard({
  post, currentUser, onRefresh, notify, onOpenProfile
}: {
  post: Post; currentUser: User; onRefresh: () => void; notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenProfile: (username: string) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [reply, setReply] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const categoryLabel = post.category ? post.category.replaceAll("-", " ") : "";

  async function toggle(path: string) {
    setBusy(true);
    try { await api(`/api/posts/${post.id}/${path}`, { method: "POST", body: json({}) }); onRefresh(); }
    catch (error) { notify(error instanceof Error ? error.message : "That action didn't work.", "error"); }
    finally { setBusy(false); }
  }

  async function loadComments() {
    if (comments) { setComments(null); return; }
    try {
      const data = await api<{ comments: Comment[] }>(`/api/posts/${post.id}`);
      setComments(data.comments);
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't load the conversation.", "error"); }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      const comment = await api<Comment>(`/api/posts/${post.id}/comments`, { method: "POST", body: json({ body: reply.trim() }) });
      setComments((previous) => [...(previous ?? []), comment]);
      setReply("");
      onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't send your reply.", "error"); }
  }

  async function share() {
    const url = `${window.location.origin}/?post=${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${post.display_name} on Rello`, text: post.body, url });
      else { await navigator.clipboard.writeText(url); notify("Post link copied.", "success"); }
      await api(`/api/posts/${post.id}/share`, { method: "POST", body: json({}) });
      onRefresh();
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") notify("Couldn't share this post.", "error");
    }
  }

  async function reportPost() {
    const reason = window.prompt("What should our community team know about this post?");
    if (!reason) return;
    try {
      await api(`/api/posts/${post.id}/report`, { method: "POST", body: json({ reason }) });
      notify("Thanks for helping keep this community thoughtful.", "success");
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't report this post.", "error"); }
    setMenuOpen(false);
  }

  return (
    <article className="post-card" id={`post-${post.id}`}>
      {post.reposted === 1 && <div className="repost-by"><Repeat2 size={14} /> You reposted this</div>}
      <div className="post-main">
        <button className="avatar-button" onClick={() => onOpenProfile(post.username)} aria-label={`Open ${post.display_name}'s profile`}><Avatar name={post.display_name} src={post.avatar_url} /></button>
        <div className="post-content">
          <div className="post-heading">
            <div className="post-author">
              <button onClick={() => onOpenProfile(post.username)} className="author-name">{post.display_name}</button>
              {post.verified === 1 && <span className="verified-mark" title="Verified organisation"><BadgeCheck size={15} fill="currentColor" /></span>}
              <span className="author-handle">@{post.username}</span><span className="post-separator">·</span><time title={post.created_at}>{timeAgo(post.created_at)}</time>
            </div>
            <div className="post-menu-wrap">
              <button className="icon-button post-menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label="More post options"><MoreHorizontal size={19} /></button>
              {menuOpen && <div className="post-menu">
                {currentUser.id !== post.user_id && <button onClick={() => void toggle("block")}><ShieldCheck size={15} /> Block @{post.username}</button>}
                {currentUser.id !== post.user_id && <button onClick={() => void toggle("mute")}><EyeOff size={15} /> Mute @{post.username}</button>}
                <button onClick={() => void reportPost()}><Flag size={15} /> Report post</button>
              </div>}
            </div>
          </div>
          {post.post_type === "announcement" && <span className="official-label"><ShieldCheck size={12} /> Official organisation update</span>}
          {post.post_type === "incident" && <div className="incident-meta"><span className={`incident-dot incident-${post.incident_status}`} /><span>{categoryLabel || "Community report"}</span><span className="meta-divider" /><span>{post.incident_status === "unverified" ? "Community report · not verified" : post.incident_status.replace("-", " ")}</span></div>}
          {post.body && <p className="post-text">{post.body.split(/(#[-\w]+|@[\w]+)/g).map((part, index) => part.startsWith("#") || part.startsWith("@") ? <span className="post-link" key={`${part}-${index}`}>{part}</span> : part)}</p>}
          {post.location && <button className="location-tag" onClick={() => onOpenProfile(post.username)}><MapPin size={13} />{post.location}</button>}
          {post.media_url && (post.media_type === "video" ? (
            <video className="post-media" src={assetUrl(post.media_url)} controls preload="metadata" playsInline />
          ) : <img className="post-media" src={assetUrl(post.media_url)} alt="Shared by the community" loading="lazy" />)}
          <div className="engagement-row">
            <button className={`engagement-action ${post.liked ? "is-liked" : ""}`} onClick={() => void toggle("like")} disabled={busy} aria-label={`${post.liked ? "Unlike" : "Like"} post`}><Heart size={18} fill={post.liked ? "currentColor" : "none"} /><span>{post.like_count || ""}</span></button>
            <button className={`engagement-action ${comments ? "is-active" : ""}`} onClick={() => void loadComments()} aria-label="View replies"><MessageCircle size={18} /><span>{post.comment_count || ""}</span></button>
            <button className={`engagement-action ${post.reposted ? "is-reposted" : ""}`} onClick={() => void toggle("repost")} disabled={busy} aria-label="Repost"><Repeat2 size={18} /><span>{post.repost_count || ""}</span></button>
            {post.post_type === "incident" && <button className={`engagement-action incident-follow-action ${post.incident_following ? "is-saved" : ""}`} onClick={() => void toggle("follow-incident")} disabled={busy} aria-label={post.incident_following ? "Unfollow this report" : "Follow this report"}><MapPin size={17} /><span>{post.incident_follower_count || ""}</span></button>}
            <button className={`engagement-action bookmark-action ${post.bookmarked ? "is-saved" : ""}`} onClick={() => void toggle("bookmark")} disabled={busy} aria-label={`${post.bookmarked ? "Remove bookmark" : "Bookmark"} post`}><Bookmark size={18} fill={post.bookmarked ? "currentColor" : "none"} /></button>
            <button className="engagement-action share-action" onClick={() => void share()} aria-label="Share post"><ExternalLink size={17} /><span>{post.share_count || ""}</span></button>
          </div>
          {comments && <div className="conversation">
            {comments.map((comment) => <div className="reply-item" key={comment.id}><Avatar name={comment.display_name} src={comment.avatar_url} size="sm" /><div><div className="reply-author"><strong>{comment.display_name}</strong><span>@{comment.username}</span><time>{timeAgo(comment.created_at)}</time></div><p>{comment.body}</p></div></div>)}
            <form className="reply-form" onSubmit={submitReply}><Avatar name={currentUser.display_name} src={currentUser.avatar_url} size="sm" /><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add to the conversation…" maxLength={1000} aria-label="Write a reply" /><button aria-label="Send reply" disabled={!reply.trim()}><ArrowUpRight size={17} /></button></form>
          </div>}
        </div>
      </div>
    </article>
  );
}

function PostSkeleton() {
  return <div className="post-skeleton"><span /><div><i /><i /><i /></div></div>;
}

function Feed({
  posts, loading, tab, setTab, currentUser, refresh, notify, onCompose, onOpenProfile, onOpenMap
}: {
  posts: Post[]; loading: boolean; tab: FeedTab; setTab: (tab: FeedTab) => void; currentUser: User;
  refresh: () => void; notify: (message: string, tone?: Toast["tone"]) => void; onCompose: () => void;
  onOpenProfile: (username: string) => void; onOpenMap: () => void;
}) {
  const tabLabels: { id: FeedTab; name: string; icon: LucideIcon }[] = [
    { id: "for-you", name: "For you", icon: Sparkles },
    { id: "following", name: "Following", icon: Heart },
    { id: "nearby", name: "Nearby", icon: MapPin },
    { id: "trending", name: "Trending", icon: Activity }
  ];
  return (
    <section className="feed-column">
      <div className="feed-top">
        <div className="feed-heading"><div><span className="eyebrow muted">{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>Your neighbourhood</h1></div><span className="community-chip"><span className="live-dot" /> Lagos, NG</span></div>
        <div className="feed-tabs" role="tablist" aria-label="Choose your feed">
          {tabLabels.map(({ id, name, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={15} />{name}</button>)}
        </div>
      </div>
      <div className="quick-compose">
        <Avatar name={currentUser.display_name} src={currentUser.avatar_url} />
        <button className="compose-prompt" onClick={onCompose}>What’s happening around you?</button>
        <button className="compose-icon" onClick={onCompose} aria-label="Add a photo or video"><ImagePlus size={19} /></button>
        <button className="button button-small button-primary" onClick={onCompose}><Plus size={16} /> Post</button>
      </div>
      {loading ? <div className="feed-loading"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div> : posts.length ? <div className="post-list">{posts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onRefresh={refresh} notify={notify} onOpenProfile={onOpenProfile} />)}</div> : (
        <div className="empty-feed">
          <span className="empty-icon"><MessageCircle size={24} /></span>
          <h2>{tab === "following" ? "Your circle is just getting started." : tab === "nearby" ? "Nothing pinned nearby just yet." : "A fresh page, close to home."}</h2>
          <p>{tab === "following" ? "Follow people and local organisations to bring their updates into your feed." : tab === "nearby" ? "Add a location when you post, and neighbourhood updates will find their way here." : "Be the first to share what is happening in your neighbourhood."}</p>
          {tab === "nearby" ? <button className="button button-outline" onClick={onOpenMap}><MapIcon size={16} /> Explore the map</button> : <button className="button button-primary" onClick={onCompose}><Plus size={16} /> Start a conversation</button>}
        </div>
      )}
      <div className="feed-footnote"><span>✳</span> Rello is better when we share what matters.</div>
    </section>
  );
}

function RightRail({ trends, onSearch, onCompose }: { trends: { tag: string; count: number }[]; onSearch: (text: string) => void; onCompose: () => void }) {
  return (
    <aside className="right-rail">
      <label className="search-box"><Search size={17} /><input placeholder="Search Rello" onKeyDown={(event) => { if (event.key === "Enter") onSearch(event.currentTarget.value); }} /><kbd>⌘ K</kbd></label>
      <section className="rail-card neighbourhood-card">
        <div className="rail-card-heading"><span className="eyebrow muted">AROUND YOUR CITY</span><span className="city-spark">✳</span></div>
        <h3>It starts close to home.</h3>
        <p>Local voices are shaping a clearer picture of what’s happening across Lagos.</p>
        <button className="text-link" onClick={onCompose}>Add what you’re seeing <ArrowUpRight size={15} /></button>
        <div className="city-lines"><i /><i /><i /><i /><i /></div>
      </section>
      <section className="rail-card trends-card">
        <div className="rail-card-heading"><span className="eyebrow muted">IN THE CONVERSATION</span><Activity size={16} /></div>
        {trends.length ? trends.slice(0, 5).map((item, index) => <button className="trend-item" key={item.tag} onClick={() => onSearch(`#${item.tag}`)}><span className="trend-index">0{index + 1}</span><span className="trend-copy"><b>#{item.tag}</b><small>{item.count} {item.count === 1 ? "post" : "posts"}</small></span><ChevronRight size={16} /></button>) : <p className="no-trends">Topics from the community will show up here.</p>}
      </section>
      <section className="good-neighbour"><span><ShieldCheck size={18} /></span><div><b>A good neighbour check</b><p>Share what you know. Leave room for what you don’t.</p></div></section>
      <footer className="rail-footer">About · Community guidelines · Privacy<br />© 2026 Rello</footer>
    </aside>
  );
}

function Discover({ posts, loading, refresh, notify, onOpenProfile }: { posts: Post[]; loading: boolean; refresh: () => void; notify: (message: string, tone?: Toast["tone"]) => void; onOpenProfile: (username: string) => void }) {
  const videos = useMemo(() => posts.filter((post) => post.media_type === "video"), [posts]);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) void element.play().catch(() => undefined);
        else element.pause();
      }
    }, { threshold: 0.65 });
    for (const video of videoRefs.current.values()) observer.observe(video);
    return () => observer.disconnect();
  }, [videos]);

  async function act(post: Post, action: string) {
    try { await api(`/api/posts/${post.id}/${action}`, { method: "POST", body: json({}) }); refresh(); }
    catch (error) { notify(error instanceof Error ? error.message : "That action didn't work.", "error"); }
  }

  return (
    <section className="discover-page">
      <div className="page-title-row"><div><span className="eyebrow muted">A DIFFERENT VIEW OF THE CITY</span><h1>Watch</h1></div><span className="community-chip"><Film size={14} /> Short stories, close to home</span></div>
      {loading ? <div className="discover-empty"><span className="spin-loader" /></div> : videos.length ? <div className="video-feed" aria-label="Vertical video feed">
        {videos.map((post) => <article className="video-card" key={post.id}>
          <video ref={(element) => { if (element) videoRefs.current.set(post.id, element); else videoRefs.current.delete(post.id); }} src={assetUrl(post.media_url)} muted={muted} loop playsInline preload="metadata" onClick={(event) => { const video = event.currentTarget; if (video.paused) void video.play(); else video.pause(); }} />
          <div className="video-gradient" />
          <div className="video-topline"><span><span className="live-dot" /> FROM THE COMMUNITY</span><button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute video" : "Mute video"}>{muted ? <VolumeMuted /> : <VolumeOn />}</button></div>
          <div className="video-copy">
            {post.category && <span className="video-category">{post.category.replaceAll("-", " ")}</span>}
            {post.body && <p>{post.body}</p>}
            <div className="video-creator" onClick={() => onOpenProfile(post.username)} role="button" tabIndex={0}><Avatar name={post.display_name} src={post.avatar_url} size="sm" /><b>@{post.username}</b>{post.verified === 1 && <BadgeCheck size={14} />}</div>
            {post.location && <span className="video-location"><MapPin size={13} />{post.location}</span>}
          </div>
          <div className="video-actions">
            <button className={post.liked ? "active" : ""} onClick={() => void act(post, "like")} aria-label="Like video"><Heart size={21} fill={post.liked ? "currentColor" : "none"} /><span>{post.like_count}</span></button>
            <button onClick={() => document.getElementById(`video-comments-${post.id}`)?.scrollIntoView({ behavior: "smooth" })} aria-label="View comments"><MessageCircle size={21} /><span>{post.comment_count}</span></button>
            <button className={post.bookmarked ? "active" : ""} onClick={() => void act(post, "bookmark")} aria-label="Save video"><Bookmark size={20} fill={post.bookmarked ? "currentColor" : "none"} /></button>
            <button onClick={() => void act(post, "repost")} aria-label="Repost video"><Repeat2 size={20} /><span>{post.repost_count}</span></button>
          </div>
          <div id={`video-comments-${post.id}`} className="video-comment-link"><MessageCircle size={13} /> Join the conversation in the home feed</div>
        </article>)}
      </div> : <div className="discover-empty">
        <div className="video-empty-art"><span><Play size={26} fill="currentColor" /></span><i /><i /><i /></div>
        <span className="eyebrow muted">A CITY IN MOTION</span><h2>The next story could be yours.</h2><p>Short videos from the people and places around you will appear here. No staged live clips — just real moments shared by the community.</p>
        <button className="button button-primary" onClick={() => window.dispatchEvent(new CustomEvent("rello:compose", { detail: { mode: "video" } }))}><ImagePlus size={16} /> Share a video</button>
      </div>}
    </section>
  );
}

function VolumeMuted() { return <span className="volume-icon"><Radio size={16} /><X size={12} /></span>; }
function VolumeOn() { return <Radio size={17} />; }

function RelloMap({ posts, loading, onFilter, onOpenPost }: {
  posts: Post[]; loading: boolean; onFilter: (filter: { category: string; time: string; verified: string }) => void;
  onOpenPost: (id: number) => void;
}) {
  const [category, setCategory] = useState("");
  const [time, setTime] = useState("");
  const [verified, setVerified] = useState("");
  function apply(next: { category?: string; time?: string; verified?: string }) {
    const filters = { category: next.category ?? category, time: next.time ?? time, verified: next.verified ?? verified };
    setCategory(filters.category); setTime(filters.time); setVerified(filters.verified); onFilter(filters);
  }
  return (
    <section className="map-page">
      <div className="page-title-row map-page-title"><div><span className="eyebrow muted">A SHARED VIEW OF OUR STREETS</span><h1>The neighbourhood map</h1><p>See what’s being noticed around you. Every marker opens the conversation.</p></div><span className="map-count"><MapPin size={15} />{posts.length} {posts.length === 1 ? "update" : "updates"}</span></div>
      <div className="map-filters">
        <label><span>What’s happening</span><select value={category} onChange={(event) => apply({ category: event.target.value })}><option value="">All categories</option><option value="roads">Roads & transport</option><option value="flooding">Flooding</option><option value="waste">Waste & sanitation</option><option value="power">Power & utilities</option><option value="safety">Public safety</option><option value="health">Healthcare</option><option value="infrastructure">Infrastructure</option></select></label>
        <label><span>When</span><select value={time} onChange={(event) => apply({ time: event.target.value })}><option value="">Any time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select></label>
        <label><span>Verification</span><select value={verified} onChange={(event) => apply({ verified: event.target.value })}><option value="">All reports</option><option value="verified">Organisation verified</option><option value="unverified">Community reports</option></select></label>
        <span className="map-filter-note"><ShieldCheck size={14} /> A report is not an official confirmation.</span>
      </div>
      <div className="map-canvas">
        {loading ? <div className="map-loading"><span className="spin-loader" /> Gathering nearby updates…</div> : <MapContainer center={[6.5244, 3.3792]} zoom={11} scrollWheelZoom className="leaflet-map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {posts.filter((post) => post.latitude !== null && post.longitude !== null).map((post) => <CircleMarker key={post.id} center={[post.latitude!, post.longitude!]} radius={9} pathOptions={{ color: post.post_type === "announcement" ? "#28675e" : "#df735d", fillColor: post.post_type === "announcement" ? "#28675e" : "#df735d", fillOpacity: 0.9 }}>
            <Popup><div className="map-popup"><span className="eyebrow muted">{post.post_type === "announcement" ? "OFFICIAL UPDATE" : post.category || "COMMUNITY REPORT"}</span><b>{post.display_name}</b><p>{post.body || "A community update."}</p><small>{post.location || "Lagos"} · {timeAgo(post.created_at)}</small><button onClick={() => onOpenPost(post.id)}>Open conversation <ArrowUpRight size={14} /></button></div></Popup>
          </CircleMarker>)}
        </MapContainer>}
        {!loading && posts.length === 0 && <div className="map-empty-note"><MapPin size={16} /> No mapped reports match those filters yet.</div>}
        <div className="map-legend"><span><i className="legend-community" /> Community report</span><span><i className="legend-official" /> Official update</span></div>
      </div>
      <div className="map-bottom-note"><span className="info-dot"><CircleHelp size={15} /></span><span>Map pins are shared by the community. A Rello post is a community update, not an official diagnosis or resolution.</span></div>
    </section>
  );
}

function NotificationsPage({ notifications, onOpenPost, onOpenProfile }: { notifications: Notification[]; onOpenPost: (id: number) => void; onOpenProfile: (username: string) => void }) {
  const iconMap: Record<string, LucideIcon> = { like: Heart, comment: MessageCircle, repost: Repeat2, follow: ArrowDownLeft, mention: Bell };
  const actionCopy: Record<string, string> = { like: "liked your post", comment: "replied to your post", repost: "reposted your post", follow: "started following you", mention: "mentioned you in a post" };
  return <section className="notifications-page">
    <div className="page-title-row"><div><span className="eyebrow muted">YOUR CORNER OF THE COMMUNITY</span><h1>Activity</h1><p>Little signs that the conversation is moving.</p></div><span className="notification-mark"><Bell size={18} /></span></div>
    <div className="notification-list">{notifications.length ? notifications.map((item) => { const Icon = iconMap[item.kind] ?? Bell; return <button className={`notification-item ${!item.read_at ? "unread" : ""}`} key={item.id} onClick={() => item.kind === "follow" ? onOpenProfile(item.username) : item.post_id && onOpenPost(item.post_id)}><span className={`notification-kind kind-${item.kind}`}><Icon size={15} /></span><Avatar name={item.display_name} src={item.avatar_url} size="sm" /><span className="notification-copy"><b>{item.display_name}</b> {actionCopy[item.kind] ?? "interacted with you"}<time>{timeAgo(item.created_at)}</time></span><ChevronRight size={17} /></button>; }) : <div className="empty-feed notification-empty"><span className="empty-icon"><Bell size={23} /></span><h2>It’s quiet for now.</h2><p>Replies, mentions and follows will find their way here.</p></div>}</div>
  </section>;
}

function ProfilePage({ username, currentUser, refresh, notify, onOpenProfile, onBack, onEdit }: {
  username: string; currentUser: User; refresh: () => void; notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenProfile: (username: string) => void; onBack: () => void; onEdit: () => void;
}) {
  const [data, setData] = useState<{ user: User & { created_at?: string }; posts: Post[]; following: boolean; private?: boolean; followers: number; followingCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<typeof data>(`/api/users/${encodeURIComponent(username)}`).then((result) => { if (active) setData(result); }).catch((error) => notify(error instanceof Error ? error.message : "Couldn't load that profile.", "error")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username, currentUser]);
  async function follow() {
    if (!data) return;
    try { await api(`/api/users/${data.user.id}/follow`, { method: "POST", body: json({}) }); refresh(); setData({ ...data, following: !data.following, followers: data.followers + (data.following ? -1 : 1) }); }
    catch (error) { notify(error instanceof Error ? error.message : "Couldn't update that follow.", "error"); }
  }
  if (loading) return <div className="profile-loading"><span className="spin-loader" /></div>;
  if (!data) return <div className="profile-loading">This profile is unavailable.</div>;
  const ownProfile = data.user.id === currentUser.id;
  return <section className="profile-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to your feed</button>
    <div className="profile-cover"><span>✳</span><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /></div>
    <div className="profile-summary"><Avatar name={data.user.display_name} src={data.user.avatar_url} size="lg" /><div className="profile-actions">{ownProfile ? <button className="button button-outline" onClick={onEdit}><Settings2 size={15} /> Edit profile</button> : <button className={`button ${data.following ? "button-outline" : "button-primary"}`} onClick={() => void follow()}>{data.following ? <Check size={15} /> : <Plus size={15} />}{data.following ? "Following" : "Follow"}</button>}</div>
      <h1>{data.user.display_name}{data.user.verified === 1 && <span className="verified-mark" title="Verified organisation"><BadgeCheck size={18} fill="currentColor" /></span>}</h1><span className="profile-handle">@{data.user.username}</span>
      {data.user.bio && <p className="profile-bio">{data.user.bio}</p>}
      {data.user.location && <span className="profile-location"><MapPin size={14} />{data.user.location}</span>}
      <div className="profile-counts"><span><b>{data.followingCount}</b> Following</span><span><b>{data.followers}</b> Followers</span><span><b>{data.posts.length}</b> Contributions</span></div>
      {data.user.account_type === "organisation" && <div className="org-note"><ShieldCheck size={15} /> Organisational account · institutional authority is shown only when verified</div>}
    </div>
    <div className="profile-posts-head"><h2>Posts</h2><span>{data.posts.length} contributions</span></div>
    {data.private ? <div className="empty-feed"><span className="empty-icon"><EyeOff size={22} /></span><h2>This account is private.</h2><p>Follow this account to see their posts and contributions.</p></div> : data.posts.length ? data.posts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onRefresh={refresh} notify={notify} onOpenProfile={onOpenProfile} />) : <div className="empty-feed profile-empty"><h2>A neighbour still finding their voice.</h2><p>When they share a post, it’ll show up here.</p></div>}
  </section>;
}

function ProfileEditModal({ user, onClose, onUpdated, notify }: {
  user: User; onClose: () => void; onUpdated: (user: User) => void; notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (avatar) form.set("avatar", avatar);
    setLoading(true);
    try {
      const updated = await api<User>("/api/profile", { method: "PATCH", body: form });
      onUpdated(updated);
      notify("Profile updated.", "success");
      onClose();
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't update your profile.", "error"); }
    finally { setLoading(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="compose-modal profile-edit-modal" onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow muted">MAKE THIS PROFILE YOURS</span><h2>Edit profile</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <div className="profile-edit-avatar"><Avatar name={user.display_name} src={user.avatar_url} size="lg" /><div><b>{user.display_name}</b><small>@{user.username}</small><input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /><button type="button" className="text-link" onClick={() => fileInput.current?.click()}><ImagePlus size={14} />{avatar ? avatar.name : "Change profile photo"}</button></div></div>
      <label className="profile-edit-field">Display name<input name="display_name" defaultValue={user.display_name} required minLength={2} maxLength={60} /></label>
      <label className="profile-edit-field">Bio<textarea name="bio" defaultValue={user.bio ?? ""} maxLength={280} rows={3} placeholder="A little about you…" /></label>
      <label className="profile-edit-field">Location<input name="location" defaultValue={user.location ?? ""} maxLength={120} placeholder="City, neighbourhood, or keep it private" /></label>
      <label className="privacy-toggle"><span><b>Private profile</b><small>Only followers can see your posts and contributions.</small></span><input name="is_private" type="checkbox" value="true" defaultChecked={Boolean(user.is_private)} /></label>
      <div className="profile-edit-footer"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={loading}>{loading ? "Saving…" : "Save changes"}<Check size={15} /></button></div>
    </form>
  </div>;
}

function SearchPage({ query, onOpenProfile, currentUser, refresh, notify }: { query: string; onOpenProfile: (username: string) => void; currentUser: User; refresh: () => void; notify: (message: string, tone?: Toast["tone"]) => void }) {
  const [result, setResult] = useState<{ users: User[]; posts: Post[]; trends: { tag: string; count: number }[] }>({ users: [], posts: [], trends: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<typeof result>(`/api/search?q=${encodeURIComponent(query)}`).then((data) => { if (active) setResult(data); }).catch((error) => notify(error instanceof Error ? error.message : "Couldn't search right now.", "error")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);
  return <section className="search-page"><div className="page-title-row"><div><span className="eyebrow muted">LOOKING A LITTLE CLOSER</span><h1>Search</h1><p>People, updates and topics matching <b>{query}</b></p></div></div>
    {loading ? <div className="feed-loading"><PostSkeleton /><PostSkeleton /></div> : <>
      {result.users.length > 0 && <div className="search-section"><h2>People</h2>{result.users.map((user) => <button className="search-user" key={user.id} onClick={() => onOpenProfile(user.username)}><Avatar name={user.display_name} src={user.avatar_url} size="sm" /><span><b>{user.display_name}</b><small>@{user.username}</small></span><ChevronRight size={17} /></button>)}</div>}
      {result.trends.length > 0 && <div className="search-section"><h2>Topics</h2><div className="topic-pills">{result.trends.map((trend) => <span key={trend.tag}>#{trend.tag} <small>{trend.count}</small></span>)}</div></div>}
      {result.posts.length > 0 && <div className="search-section"><h2>Posts</h2>{result.posts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onRefresh={refresh} notify={notify} onOpenProfile={onOpenProfile} />)}</div>}
      {!result.posts.length && !result.users.length && !result.trends.length && <div className="empty-feed"><span className="empty-icon"><Search size={22} /></span><h2>No matches just yet.</h2><p>Try a name, neighbourhood, or topic like #Lagos.</p></div>}
    </>}
  </section>;
}

function ComposeModal({ currentUser, initialMode, onClose, onPublished, notify }: {
  currentUser: User; initialMode: string; onClose: () => void; onPublished: () => void; notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [mode, setMode] = useState(["update", "photo", "video", "incident", "announcement"].includes(initialMode) ? initialMode : "update");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [visibility, setVisibility] = useState("public");
  const [geoLoading, setGeoLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const modes = [
    { id: "update", label: "Update", icon: MessageCircle },
    { id: "photo", label: "Photo", icon: ImagePlus },
    { id: "video", label: "Video", icon: Film },
    { id: "incident", label: "Report nearby", icon: MapPin },
    { id: "announcement", label: "Official update", icon: ShieldCheck }
  ];

  async function findLocation() {
    if (!navigator.geolocation) { notify("Location sharing isn’t available in this browser.", "error"); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (!location) setLocation("Current location");
      setGeoLoading(false);
    }, () => { setGeoLoading(false); notify("We couldn’t read your location. You can add a neighbourhood instead.", "error"); }, { timeout: 10000 });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("mode", mode);
    form.set("visibility", visibility);
    form.set("location", location);
    if (coordinates) { form.set("latitude", String(coordinates.latitude)); form.set("longitude", String(coordinates.longitude)); }
    if (file) form.set("media", file);
    setLoading(true);
    try {
      await api<Post>("/api/posts", { method: "POST", body: form });
      notify(mode === "incident" ? "Your report is out there. Community reports aren’t official confirmations." : "Posted. Your neighbourhood is listening.", "success");
      onPublished();
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't publish your post.", "error"); }
    finally { setLoading(false); }
  }

  const isOrg = currentUser.account_type === "organisation" && currentUser.verified === 1;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="compose-modal" onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow muted">YOUR VOICE, YOUR NEIGHBOURHOOD</span><h2>Start a conversation</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <div className="compose-modes">{modes.filter((item) => item.id !== "announcement" || isOrg).map(({ id, label, icon: Icon }) => <button type="button" key={id} className={mode === id ? "selected" : ""} onClick={() => setMode(id)}><Icon size={15} />{label}</button>)}</div>
      {mode === "announcement" && !isOrg && <div className="official-permission"><ShieldCheck size={16} /> Public safety announcements are available to verified organisation accounts.</div>}
      <div className="compose-body"><Avatar name={currentUser.display_name} src={currentUser.avatar_url} /><textarea name="body" placeholder={mode === "incident" ? "What did you notice? Share the details that might help a neighbour…" : "What’s happening around you?"} rows={4} maxLength={2000} autoFocus required={!file} /><span className="character-limit">Up to 2,000 characters</span></div>
      {mode === "incident" && <div className="incident-fields"><label>Incident category<select name="category" required defaultValue=""><option value="" disabled>Choose what you’re seeing</option><option value="roads">Roads & transport</option><option value="flooding">Flooding</option><option value="waste">Waste & sanitation</option><option value="power">Power & utilities</option><option value="safety">Public safety</option><option value="health">Healthcare</option><option value="infrastructure">Infrastructure</option></select></label><div className="unverified-note"><ShieldCheck size={15} /> Your post will be marked as a community report until verified by an authorised organisation.</div></div>}
      {file && <div className="selected-file"><span>{file.type.startsWith("video") ? <Film size={16} /> : <ImagePlus size={16} />}{file.name}</span><button type="button" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }} aria-label="Remove attachment"><X size={16} /></button></div>}
      <div className="compose-location"><label className="location-entry"><MapPin size={15} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Add a neighbourhood or place" maxLength={120} />{coordinates && <span className="location-ready"><Check size={13} /> Pin added</span>}</label><button type="button" className="location-action" onClick={() => void findLocation()} disabled={geoLoading}><LocateFixed size={15} />{geoLoading ? "Finding…" : "Use my location"}</button></div>
      <div className="compose-bottom"><label className="visibility-select"><Globe2 size={15} /><select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Post visibility"><option value="public">Everyone</option><option value="followers">Followers</option><option value="private">Only me</option></select><ChevronDown size={13} /></label><div className="compose-tools"><input ref={fileInput} className="visually-hidden" type="file" accept={mode === "video" ? "video/mp4,video/webm,video/quicktime" : mode === "photo" ? "image/jpeg,image/png,image/gif,image/webp" : "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" className="icon-button" onClick={() => fileInput.current?.click()} aria-label="Attach media"><ImagePlus size={19} /></button><button type="submit" className="button button-primary" disabled={loading || (!file && mode !== "incident" && mode !== "announcement" && mode !== "update")}>{loading ? "Posting…" : mode === "incident" ? "Share report" : "Post"}<ArrowUpRight size={16} /></button></div></div>
      {mode === "announcement" && <p className="compose-disclaimer">Official responses and safety notices will always be labelled so they’re easy to distinguish from community posts.</p>}
    </form>
  </div>;
}

function Toasts({ items, dismiss }: { items: Toast[]; dismiss: (id: number) => void }) {
  return <div className="toast-stack" aria-live="polite">{items.map((toast) => <div key={toast.id} className={`toast ${toast.tone === "error" ? "toast-error" : ""}`}><span>{toast.tone === "error" ? <CircleHelp size={17} /> : <Check size={17} />}</span>{toast.message}<button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={15} /></button></div>)}</div>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("feed");
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [mapPosts, setMapPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [trends, setTrends] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [modalMode, setModalMode] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [accountMenu, setAccountMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const [videos, setVideos] = useState<Post[]>([]);
  const [mapFilter, setMapFilter] = useState({ category: "", time: "", verified: "" });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((message: string, tone?: Toast["tone"]) => {
    const id = ++toastId.current;
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Post[]>(`/api/feed?tab=${tab}`);
      setPosts(data);
    } catch (error) { if (getToken()) notify(error instanceof Error ? error.message : "Couldn't refresh the feed.", "error"); }
    finally { setLoading(false); }
  }, [tab, notify]);

  const refreshSupplemental = useCallback(async () => {
    try {
      const [trendData, notificationData, savedData] = await Promise.all([
        api<{ tag: string; count: number }[]>("/api/trending"),
        api<Notification[]>("/api/notifications"),
        api<Post[]>("/api/bookmarks")
      ]);
      setTrends(trendData);
      setNotifications(notificationData);
      setUnread(notificationData.filter((item) => !item.read_at).length);
      setSavedPosts(savedData);
    } catch (error) { notify(error instanceof Error ? error.message : "Some community activity couldn’t be loaded.", "error"); }
  }, [notify]);

  async function loadMap(filter = mapFilter) {
    setMapLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, value]) => value));
      setMapPosts(await api<Post[]>(`/api/map/incidents?${params}`));
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't load the map.", "error"); }
    finally { setMapLoading(false); }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api<User>("/api/auth/me").then(setUser).catch(() => { clearToken(); setUser(null); setLoading(false); });
  }, []);

  useEffect(() => { if (user) void refreshFeed(); }, [user, refreshFeed]);
  useEffect(() => { if (user) void refreshSupplemental(); }, [user, refreshSupplemental]);
  useEffect(() => {
    if (!user || screen !== "map") return;
    setMapFilter({ category: "", time: "", verified: "" });
    void loadMap({ category: "", time: "", verified: "" });
  }, [user, screen]);
  useEffect(() => {
    if (!user || screen !== "discover") return;
    api<Post[]>("/api/videos").then(setVideos).catch((error) => notify(error instanceof Error ? error.message : "Couldn't load videos.", "error"));
  }, [user, screen, notify]);
  useEffect(() => {
    function handleCompose(event: Event) { setModalMode((event as CustomEvent<{ mode?: string }>).detail?.mode ?? "update"); }
    window.addEventListener("rello:compose", handleCompose);
        return () => window.removeEventListener("rello:compose", handleCompose);
  }, []);
  useEffect(() => {
    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() { setInstallPrompt(null); }
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") === "update") setModalMode("update");
    if (params.get("view") === "map") setScreen("map");
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  useEffect(() => {
    function keyHandler(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); const input = document.querySelector<HTMLInputElement>(".search-box input"); input?.focus(); }
      if (event.key === "Escape") { setModalMode(null); setAccountMenu(false); }
    }
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, []);

  function onAuth(nextUser: User, token: string) {
    setToken(token); setUser(nextUser); setScreen("feed"); setLoading(true);
  }

  function goProfile(username: string) {
    setProfileName(username); setScreen("profile");
  }

  async function showNotifications() {
    setScreen("notifications");
    try { await api("/api/notifications/read", { method: "POST", body: json({}) }); setUnread(0); setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); }
    catch (error) { notify(error instanceof Error ? error.message : "Couldn't update activity.", "error"); }
  }

  function updateProfile(updated: User) {
    setUser(updated);
    void refreshSupplemental();
    void refreshFeed();
  }

  async function openPost(id: number) {
    setScreen("feed");
    setTab("for-you");
    window.setTimeout(() => {
      const element = document.getElementById(`post-${id}`);
      if (element) { element.scrollIntoView({ behavior: "smooth", block: "center" }); element.classList.add("post-highlight"); window.setTimeout(() => element.classList.remove("post-highlight"), 1800); }
      else notify("That post may have moved out of the latest feed.", "error");
    }, 350);
  }

  if (!user) return <><AuthScreen onAuth={onAuth} /><Toasts items={toasts} dismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} /></>;

  const visiblePosts = screen === "bookmarks" ? savedPosts : posts;
  return (
    <div className="app-shell">
      <aside className="left-rail">
        <button className="brand-lockup" onClick={() => { setScreen("feed"); setTab("for-you"); }} aria-label="Rello home"><span className="brand-mark"><Activity size={20} strokeWidth={2.8} /></span><span>Rel<span>lo</span></span></button>
        <div className="current-place"><span className="place-icon"><MapPin size={16} /></span><span><small>YOUR CITY</small><b>Lagos, Nigeria</b></span><ChevronDown size={14} /></div>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-section-label">YOUR SPACE</span>
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${screen === id || (id === "feed" && screen === "profile") || (id === "feed" && screen === "search") ? "active" : ""}`} onClick={() => { if (id === "notifications") void showNotifications(); else { setScreen(id); if (id === "feed") setTab("for-you"); } }}><Icon size={19} strokeWidth={screen === id ? 2.2 : 1.8} /><span>{label}</span>{id === "notifications" && unread > 0 && <span className="nav-unread">{unread > 9 ? "9+" : unread}</span>}{id === "feed" && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="button button-primary sidebar-compose" onClick={() => setModalMode("update")}><Plus size={17} /> Start a post</button>
          {installPrompt && <button className="pwa-install-button" onClick={() => void installApp()}><ArrowDownLeft size={16} /> Install Rello</button>}
          <div className="profile-menu-wrap">
            <button className="sidebar-profile" onClick={() => setAccountMenu(!accountMenu)}><Avatar name={user.display_name} src={user.avatar_url} size="sm" /><span><b>{user.display_name}</b><small>@{user.username}</small></span><Ellipsis size={19} /></button>
            {accountMenu && <div className="account-menu"><button onClick={() => { goProfile(user.username); setAccountMenu(false); }}><Eye size={15} /> View profile</button><button onClick={() => { clearToken(); setUser(null); setAccountMenu(false); }}><LogOut size={15} /> Sign out</button></div>}
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-header"><button className="brand-lockup" onClick={() => { setScreen("feed"); setTab("for-you"); }}><span className="brand-mark"><Activity size={19} strokeWidth={2.8} /></span><span>Rel<span>lo</span></span></button><button className="icon-button" onClick={() => void showNotifications()} aria-label="Activity"><Bell size={19} />{unread > 0 && <i />}</button></header>
        <main className="main-content">
          <div className="main-column">
            {screen === "feed" && <Feed posts={posts} loading={loading} tab={tab} setTab={setTab} currentUser={user} refresh={() => { void refreshFeed(); void refreshSupplemental(); }} notify={notify} onCompose={() => setModalMode("update")} onOpenProfile={goProfile} onOpenMap={() => setScreen("map")} />}
            {screen === "discover" && <Discover posts={videos} loading={false} refresh={() => { void refreshSupplemental(); api<Post[]>("/api/videos").then(setVideos).catch((error) => notify(error instanceof Error ? error.message : "Couldn't refresh videos.", "error")); }} notify={notify} onOpenProfile={goProfile} />}
            {screen === "map" && <RelloMap posts={mapPosts} loading={mapLoading} onFilter={(filter) => { setMapFilter(filter); void loadMap(filter); }} onOpenPost={openPost} />}
            {screen === "notifications" && <NotificationsPage notifications={notifications} onOpenPost={(id) => void openPost(id)} onOpenProfile={goProfile} />}
            {screen === "bookmarks" && <section className="feed-column"><div className="page-title-row"><div><span className="eyebrow muted">YOUR PERSONAL COLLECTION</span><h1>Saved for later</h1></div><Bookmark size={20} /></div>{loading ? <PostSkeleton /> : visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={user} onRefresh={() => { void refreshSupplemental(); void refreshFeed(); }} notify={notify} onOpenProfile={goProfile} />) : <div className="empty-feed"><span className="empty-icon"><Bookmark size={22} /></span><h2>Keep a thought close.</h2><p>Bookmark a post to find it again, right here.</p></div>}</section>}
            {screen === "profile" && <ProfilePage key={profileName} username={profileName} currentUser={user} refresh={() => { void refreshSupplemental(); void refreshFeed(); }} notify={notify} onOpenProfile={goProfile} onBack={() => setScreen("feed")} onEdit={() => setEditProfile(true)} />}
            {screen === "search" && <SearchPage query={searchQuery} onOpenProfile={goProfile} currentUser={user} refresh={() => void refreshFeed()} notify={notify} />}
          </div>
          <RightRail trends={trends} onSearch={(query) => { setSearchQuery(query); setScreen("search"); }} onCompose={() => setModalMode("update")} />
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} className={screen === id ? "active" : ""} onClick={() => { if (id === "notifications") void showNotifications(); else setScreen(id); }} aria-label={label}><Icon size={20} />{id === "notifications" && unread > 0 && <i />}</button>)}<button onClick={() => setModalMode("update")} aria-label="Create a post"><Plus size={21} /></button></nav>
      {modalMode && <ComposeModal currentUser={user} initialMode={modalMode} onClose={() => setModalMode(null)} onPublished={() => { setModalMode(null); setScreen("feed"); setTab("for-you"); void refreshFeed(); void refreshSupplemental(); }} notify={notify} />}
      {editProfile && <ProfileEditModal user={user} onClose={() => setEditProfile(false)} onUpdated={updateProfile} notify={notify} />}
      <Toasts items={toasts} dismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </div>
  );
}

export default App;
