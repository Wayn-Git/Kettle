'use client';

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PourTeaModal } from "@/components/PourTeaModal";
import { VoteButtons } from "@/components/VoteButtons";
import { ShareButton } from "@/components/ShareButton";
import { ReportButton } from "@/components/ReportButton";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/timeAgo";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";

type Kettle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  heat_score: number | null;
  anonymous_identity: string | null;
  parent_post_id: string | null;
  created_at: string;
  replies?: Post[];
};

type KettleFeedProps = {
  kettle: Kettle;
  posts: Post[];
};

type ExpandedState = {
  expanded: string[];
  collapsed: string[];
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const cardMotion = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1]
    },
  },
};

// Recursively build nested replies tree
function buildReplyTree(posts: Post[]): Post[] {
  const postMap = new Map<string, Post>();
  const rootPosts: Post[] = [];

  // First pass: create all posts with empty replies arrays
  posts.forEach(post => {
    postMap.set(post.id, { ...post, replies: [] });
  });

  // Second pass: attach replies to their parents
  posts.forEach(post => {
    const postWithReplies = postMap.get(post.id)!;
    if (post.parent_post_id) {
      const parent = postMap.get(post.parent_post_id);
      if (parent) {
        parent.replies!.push(postWithReplies);
      }
    } else {
      rootPosts.push(postWithReplies);
    }
  });

  // Sort replies by created_at (oldest first for conversation flow)
  const sortReplies = (post: Post): Post => {
    if (post.replies && post.replies.length > 0) {
      post.replies.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      post.replies.forEach(sortReplies);
    }
    return post;
  };

  rootPosts.forEach(sortReplies);

  return rootPosts;
}

// Count all nested replies
function countAllReplies(post: Post): number {
  let count = post.replies?.length ?? 0;
  post.replies?.forEach(reply => {
    count += countAllReplies(reply);
  });
  return count;
}

function PostCard({
  post,
  kettleId,
  kettleName,
  kettleSlug,
  depth = 0,
  onNewReply,
  expandedState,
  onToggleExpand,
  onExpandPost
}: {
  post: Post;
  kettleId: string;
  kettleName: string;
  kettleSlug: string;
  depth?: number;
  onNewReply?: () => void;
  expandedState: ExpandedState;
  onToggleExpand: (postId: string, currentlyExpanded: boolean) => void;
  onExpandPost: (postId: string) => void;
}) {
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const identity = post.anonymous_identity || 'Anonymous Tea';
  const directReplyCount = post.replies?.length ?? 0;
  const totalReplyCount = countAllReplies(post);
  const isNested = depth > 0;
  const maxDepth = 5; // Max nesting level for UI

  // Determine expansion state
  const isExplicitlyExpanded = expandedState.expanded.includes(post.id);
  const isExplicitlyCollapsed = expandedState.collapsed.includes(post.id);

  // Default: expand first 2 levels automatically
  const isDefaultExpanded = depth < 2 && directReplyCount > 0;

  // Final expansion state: explicitly set states take priority, then fall back to default
  const isExpanded = isExplicitlyExpanded || (isDefaultExpanded && !isExplicitlyCollapsed);

  const handleToggleExpand = () => {
    onToggleExpand(post.id, isExpanded);
  };

  const handleReplySuccess = () => {
    setShowReplyModal(false);
    setModalKey(k => k + 1); // Reset modal state
    // Auto-expand when user adds a reply
    onExpandPost(post.id);
    if (onNewReply) {
      onNewReply();
    }
  };

  return (
    <motion.article
      variants={cardMotion}
      className={`glass-strong relative overflow-hidden rounded-[20px] p-[1.125rem] transition-colors duration-300 ${isNested
        ? 'border-l-[3px] border-l-neon-green/30 border-y border-r border-white/5 bg-charcoal/20 hover:bg-charcoal/30'
        : 'border border-white/10 hover:border-white/20'
        }`}
      style={{ marginLeft: isNested ? Math.min(depth * 20, 48) : 0 }}
      layout
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center justify-center rounded-full border bg-neon-green-dim text-sm transition-transform hover:scale-105 duration-300 ${isNested ? 'h-7 w-7 border-neon-green/20 text-xs' : 'h-10 w-10 border-neon-green/30'
            }`}>
            {isNested ? '💬' : '☕'}
          </div>
          <div className="flex flex-col">
            <span className={`font-semibold tracking-tight text-neon-green ${isNested ? 'text-[13px]' : 'text-sm'}`}>
              {identity}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
              {timeAgo(post.created_at)}
              {isNested && <><span className="w-1 h-1 rounded-full bg-zinc-600"></span> reply</>}
            </span>
          </div>
        </div>

        {/* Heat voting on ALL posts including replies */}
        <VoteButtons
          postId={post.id}
          initialHeat={post.heat_score ?? 0}
          size="sm"
        />
      </div>

      <p className={`mb-4 text-zinc-100 leading-[1.6] ${isNested ? 'text-[14px] font-regular' : 'text-[15px] font-medium'}`}>
        {post.content}
      </p>

      {post.image_url && (
        <motion.div
          className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt="Attached receipt"
            className="max-h-80 w-full object-cover rounded-2xl"
          />
        </motion.div>
      )}

      {/* Reply actions - available on all posts up to maxDepth */}
      <div className="flex items-center gap-4 pt-3 mt-1">
        {depth < maxDepth && (
          <motion.button
            type="button"
            onClick={() => setShowReplyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 px-3.5 py-1.5 text-[12px] font-semibold text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors duration-200"
            whileTap={{ scale: 0.96 }}
          >
            💬 Reply
          </motion.button>
        )}

        {directReplyCount > 0 && (
          <motion.button
            type="button"
            onClick={handleToggleExpand}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zinc-400 hover:text-zinc-200"
          >
            <span className="transition-transform duration-300 ease-in-out" style={{
              display: 'inline-block',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            {totalReplyCount} {totalReplyCount === 1 ? 'reply' : 'replies'}
          </motion.button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Share button */}
          <ShareButton
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/k/${kettleSlug}#post-${post.id}`}
          />

          {/* Report button */}
          <ReportButton key={`report-${post.id}`} postId={post.id} />
        </div>
      </div>

      {/* Nested Replies - Always visible when expanded */}
      <AnimatePresence>
        {isExpanded && post.replies && post.replies.length > 0 && (
          <motion.div
            className="mt-4 space-y-3 relative"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          >
            {post.replies.map((reply) => (
              <MemoizedPostCard
                key={reply.id}
                post={reply}
                kettleId={kettleId}
                kettleName={kettleName}
                kettleSlug={kettleSlug}
                depth={depth + 1}
                onNewReply={onNewReply}
                expandedState={expandedState}
                onToggleExpand={onToggleExpand}
                onExpandPost={onExpandPost}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply modal */}
      <PourTeaModal
        key={`reply-modal-${post.id}-${modalKey}`}
        open={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        kettleId={kettleId}
        kettleName={kettleName}
        parentPostId={post.id}
        replyingTo={identity}
        onSuccess={handleReplySuccess}
      />
    </motion.article>
  );
}

// Memoized PostCard for performance
const MemoizedPostCard = memo(PostCard);

export function KettleFeed({ kettle, posts: initialPosts }: KettleFeedProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Proper React state for expansion tracking - using arrays for proper React diffing
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    expanded: [],
    collapsed: []
  });

  const handleToggleExpand = useCallback((postId: string, currentlyExpanded: boolean) => {
    setExpandedState(prev => {
      const newExpanded = prev.expanded.filter(id => id !== postId);
      const newCollapsed = prev.collapsed.filter(id => id !== postId);

      if (currentlyExpanded) {
        // Currently expanded -> collapse it
        newCollapsed.push(postId);
      } else {
        // Currently collapsed -> expand it
        newExpanded.push(postId);
      }

      return { expanded: newExpanded, collapsed: newCollapsed };
    });
  }, []);

  const handleExpandPost = useCallback((postId: string) => {
    setExpandedState(prev => {
      const newExpanded = prev.expanded.includes(postId)
        ? prev.expanded
        : [...prev.expanded, postId];
      const newCollapsed = prev.collapsed.filter(id => id !== postId);
      return { expanded: newExpanded, collapsed: newCollapsed };
    });
  }, []);

  // Build the nested reply tree - memoized for performance
  const threadedPosts = useMemo(() => buildReplyTree(posts), [posts]);

  // Calculate stats - memoized for performance
  const { totalHeat, isBoiling, totalReplies, parentPostCount } = useMemo(() => {
    const heat = posts.reduce((sum, p) => sum + (p.heat_score ?? 0), 0);
    return {
      totalHeat: heat,
      isBoiling: heat >= 100,
      totalReplies: posts.filter(p => p.parent_post_id).length,
      parentPostCount: posts.filter(p => !p.parent_post_id).length
    };
  }, [posts]);

  // Function to fetch latest posts (silent - no toast)
  const fetchLatestPosts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createSupabaseClient();
      const { data: newPosts, error } = await supabase
        .from("posts")
        .select("id, content, image_url, heat_score, anonymous_identity, parent_post_id, created_at")
        .eq("kettle_id", kettle.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Failed to fetch posts:', error);
        return;
      }

      if (newPosts) {
        setPosts(newPosts);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, [kettle.id]);

  // Real-time subscription for new posts
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createSupabaseClient();

    const channel = supabase
      .channel(`kettle-${kettle.id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `kettle_id=eq.${kettle.id}`
        },
        () => {
          // Fetch all posts when a new one is inserted
          fetchLatestPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `kettle_id=eq.${kettle.id}`
        },
        () => {
          fetchLatestPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `kettle_id=eq.${kettle.id}`
        },
        () => {
          fetchLatestPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kettle.id, fetchLatestPosts]);

  const handleRefresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      router.refresh();
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchLatestPosts();
      showToast(`Refreshed!`, 'success');
    } catch (error) {
      console.error('Failed to refresh:', error);
      showToast('Failed to refresh, trying full reload...', 'error');
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLatestPosts, router, showToast]);

  return (
    <motion.div
      className="flex w-full flex-col gap-8 lg:flex-row lg:gap-12"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <section className="flex-1 space-y-6 lg:max-w-sm sticky top-24 self-start">
        <motion.div
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold shadow-premium ${isBoiling
            ? 'border-hot-pink/30 bg-hot-pink-dim text-hot-pink'
            : 'border-neon-green/30 bg-neon-green-dim text-neon-green'
            }`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className={`h-2 w-2 rounded-full animate-soft-pulse ${isBoiling ? 'bg-hot-pink' : 'bg-neon-green'}`} />
          {isBoiling ? '🔥 Kettle is BOILING' : 'Kettle is live'}
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl leading-tight">
            {kettle.name}
          </h1>
          {kettle.description && (
            <p className="text-[15px] leading-[1.6] text-zinc-300">
              {kettle.description}
            </p>
          )}
        </div>

        {/* Kettle stats */}
        <div className="glass-strong rounded-2xl border border-white/5 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between group">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Total Heat
            </span>
            <span className={`text-xl font-extrabold transition-colors duration-300 ${isBoiling ? 'text-hot-pink group-hover:text-violet-400' : 'text-neon-green group-hover:text-sky-400'}`}>
              {totalHeat}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/50 shadow-inner">
            <motion.div
              className={`h-full ${isBoiling ? 'bg-gradient-to-r from-hot-pink to-indigo-500' : 'bg-gradient-to-r from-neon-green to-teal-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(totalHeat, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
            <span>{parentPostCount} posts • {totalReplies} replies</span>
            <span>{isBoiling ? '🔥 Boiling' : `${Math.max(100 - totalHeat, 0)} to boil`}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <motion.button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group flex-1 inline-flex justify-center items-center gap-2 rounded-full bg-zinc-50 px-5 py-3 text-[14px] font-bold text-zinc-900 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Pour the Tea
            <span className="text-lg leading-none transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              ☕
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center p-3 rounded-full border border-white/10 glass text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
            aria-label="Refresh Feed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={`text-lg leading-none ${isRefreshing ? 'animate-spin' : ''}`}>
              ↻
            </span>
          </motion.button>
        </div>

        <p className="text-[12px] font-medium text-zinc-500 flex items-center gap-2 pt-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          Live updating
        </p>
      </section>

      <section className="flex-1 space-y-5 lg:min-w-[600px] pb-12">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">
            Feed
          </h2>
          <span className="text-[12px] font-medium text-zinc-500 bg-zinc-800/30 px-2 py-1 rounded-md">
            {parentPostCount} {parentPostCount === 1 ? 'thread' : 'threads'}
          </span>
        </div>

        <motion.div
          className="space-y-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {threadedPosts.length === 0 ? (
              <motion.div
                key="empty"
                className="glass rounded-[24px] border border-dashed border-white/10 p-10 text-center shadow-sm"
                variants={cardMotion}
              >
                <div className="text-4xl mb-3 opacity-50">🍃</div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-2">It's quiet here.</h3>
                <p className="text-sm text-zinc-400 mb-6 max-w-[250px] mx-auto leading-relaxed">
                  Be the first to step into the kettle and start the conversation.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start brewing ☕
                </motion.button>
              </motion.div>
            ) : (
              threadedPosts.map((post) => (
                <MemoizedPostCard
                  key={post.id}
                  post={post}
                  kettleId={kettle.id}
                  kettleName={kettle.name}
                  kettleSlug={kettle.slug}
                  onNewReply={fetchLatestPosts}
                  expandedState={expandedState}
                  onToggleExpand={handleToggleExpand}
                  onExpandPost={handleExpandPost}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      <PourTeaModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        kettleId={kettle.id}
        kettleName={kettle.name}
        onSuccess={fetchLatestPosts}
      />
    </motion.div>
  );
}


