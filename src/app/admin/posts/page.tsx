'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import { timeAgo } from '@/lib/timeAgo';

type Post = {
  id: string;
  content: string;
  heat_score: number;
  anonymous_identity: string;
  parent_post_id: string | null;
  created_at: string;
  is_hidden: boolean;
  kettle_name?: string;
};

// Demo data
const demoPosts: Post[] = [
  {
    id: '1',
    content: 'Just saw my professor doing the walk of shame from the student dorms... 💀',
    heat_score: 89,
    anonymous_identity: 'Spicy Matcha',
    parent_post_id: null,
    created_at: '2026-02-04T10:30:00Z',
    is_hidden: false,
    kettle_name: 'Campus Chaos',
  },
  {
    id: '2',
    content: 'The dining hall mystery meat strikes again 🤢',
    heat_score: 45,
    anonymous_identity: 'Earl Grey Ghost',
    parent_post_id: null,
    created_at: '2026-02-04T09:15:00Z',
    is_hidden: false,
    kettle_name: 'Dorm Drama',
  },
  {
    id: '3',
    content: 'This post was hidden for spam',
    heat_score: 2,
    anonymous_identity: 'Chamomile Chaos',
    parent_post_id: null,
    created_at: '2026-02-03T14:20:00Z',
    is_hidden: true,
    kettle_name: 'Professor Rants',
  },
];

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>(demoPosts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'heat' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPosts(demoPosts);
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          heat_score,
          anonymous_identity,
          parent_post_id,
          created_at,
          is_hidden,
          kettles (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setPosts(
        (data || []).map((p: Record<string, unknown>) => ({
          ...p,
          is_hidden: p.is_hidden ?? false,
          kettle_name: (p.kettles as { name: string } | null)?.name || 'Unknown',
        })) as Post[]
      );
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts(demoPosts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleHidePost = async (postId: string) => {
    setActionLoading(postId);
    try {
      if (!isSupabaseConfigured()) {
        showToast('Supabase not configured. Update happens locally only.', 'error');
        setPosts(posts.map(p => p.id === postId ? { ...p, is_hidden: true } : p));
        setSelectedPost(null);
        setActionLoading(null);
        return;
      }

      const supabase = createSupabaseClient();
      
      // Try using admin function first
      const { data: funcData, error: funcError } = await supabase.rpc('admin_hide_post', {
        post_id: postId,
        admin_identifier: 'admin_panel'
      });
      
      // Fallback to direct update if function doesn't exist
      if (funcError) {
        console.log('Admin function not available, using direct update:', funcError.message);
        const { error: updateError } = await supabase
          .from('posts')
          .update({ is_hidden: true })
          .eq('id', postId);
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update: ${updateError.message}`);
        }
      } else {
        console.log('Admin function succeeded:', funcData);
      }
      
      // Update local state only after successful database update
      setPosts(posts.map(p => p.id === postId ? { ...p, is_hidden: true } : p));
      setSelectedPost(null);
      showToast('Post hidden successfully', 'success');
    } catch (error) {
      console.error('Failed to hide post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to hide: ${errorMessage}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestorePost = async (postId: string) => {
    setActionLoading(postId);
    try {
      if (!isSupabaseConfigured()) {
        showToast('Supabase not configured. Update happens locally only.', 'error');
        setPosts(posts.map(p => p.id === postId ? { ...p, is_hidden: false } : p));
        setSelectedPost(null);
        setActionLoading(null);
        return;
      }

      const supabase = createSupabaseClient();
      
      // Try using admin function first
      const { data: funcData, error: funcError } = await supabase.rpc('admin_restore_post', {
        post_id: postId,
        admin_identifier: 'admin_panel'
      });
      
      // Fallback to direct update if function doesn't exist
      if (funcError) {
        console.log('Admin function not available, using direct update:', funcError.message);
        const { error: updateError } = await supabase
          .from('posts')
          .update({ is_hidden: false })
          .eq('id', postId);
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update: ${updateError.message}`);
        }
      } else {
        console.log('Admin function succeeded:', funcData);
      }
      
      // Update local state only after successful database update
      setPosts(posts.map(p => p.id === postId ? { ...p, is_hidden: false } : p));
      setSelectedPost(null);
      showToast('Post restored successfully', 'success');
    } catch (error) {
      console.error('Failed to restore post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to restore: ${errorMessage}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete this post?\n\nThis action CANNOT be undone and will also delete:\n• All replies to this post\n• All reports for this post\n\nType YES to confirm:') && 
        prompt('Type YES to confirm deletion:')?.toUpperCase() !== 'YES') {
      return;
    }
    
    setActionLoading(postId);
    try {
      if (!isSupabaseConfigured()) {
        showToast('Supabase not configured. Delete happens locally only.', 'error');
        setPosts(posts.filter(p => p.id !== postId));
        setSelectedPost(null);
        setActionLoading(null);
        return;
      }

      const supabase = createSupabaseClient();
      
      // Try using admin delete function first
      const { data, error: funcError } = await supabase.rpc('admin_delete_post', {
        post_id: postId,
        admin_identifier: 'admin_panel'
      });
      
      // Fallback to direct delete if function doesn't exist
      if (funcError || !data) {
        console.log('Admin function not available, using direct delete');
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);
        
        if (deleteError) {
          // Check if it's an RLS policy error
          if (deleteError.message.includes('policy')) {
            throw new Error('Delete policy not configured. Please run supabase-fix-admin-delete.sql');
          }
          throw deleteError;
        }
      }
      
      // Update local state only after successful database delete
      setPosts(posts.filter(p => p.id !== postId));
      setSelectedPost(null);
      showToast('Post deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to delete: ${errorMessage}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPosts = posts
    .filter(p => {
      if (filter === 'visible') return !p.is_hidden;
      if (filter === 'hidden') return p.is_hidden;
      return true;
    })
    .filter(p => 
      search === '' || 
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.anonymous_identity.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'heat') return b.heat_score - a.heat_score;
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Manage Posts</h1>
          <p className="text-sm text-zinc-500">
            {posts.length} total posts • {posts.filter(p => p.is_hidden).length} hidden
          </p>
        </div>
        <button
          onClick={fetchPosts}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/10"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-neon-green/50 focus:outline-none"
        />
        
        <div className="flex gap-2">
          {(['all', 'visible', 'hidden'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-neon-green text-charcoal'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-100"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="heat">Most Heat</option>
        </select>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="glass-strong rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-zinc-500">Loading posts...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="glass-strong rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-zinc-500">No posts found</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                className={`glass-strong rounded-2xl border p-4 cursor-pointer transition-all ${
                  post.is_hidden 
                    ? 'border-red-500/30 opacity-60' 
                    : 'border-white/10 hover:border-neon-green/30'
                }`}
                onClick={() => setSelectedPost(post)}
                whileHover={{ scale: 1.002 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-neon-green">
                        {post.anonymous_identity}
                      </span>
                      {post.kettle_name && (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                          {post.kettle_name}
                        </span>
                      )}
                      {post.parent_post_id && (
                        <span className="text-[10px] text-zinc-600">• reply</span>
                      )}
                      {post.is_hidden && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-hot-pink">{post.heat_score}🔥</p>
                    <p className="text-[10px] text-zinc-500">{timeAgo(post.created_at)}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 backdrop-blur-xl p-4"
          onClick={() => setSelectedPost(null)}
        >
          <motion.div
            className="glass-strong w-full max-w-lg rounded-2xl border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Post Details</h3>
                <p className="text-xs text-zinc-500">ID: {selectedPost.id.slice(0, 8)}...</p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neon-green">{selectedPost.anonymous_identity}</span>
                <span className="text-xs text-zinc-500">• {timeAgo(selectedPost.created_at)}</span>
                {selectedPost.is_hidden && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    Hidden
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-sm text-zinc-200">{selectedPost.content}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>🔥 {selectedPost.heat_score} heat</span>
                {selectedPost.kettle_name && <span>🫖 {selectedPost.kettle_name}</span>}
                {selectedPost.parent_post_id && <span>💬 Reply</span>}
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                {selectedPost.is_hidden ? (
                  <button
                    onClick={() => handleRestorePost(selectedPost.id)}
                    disabled={actionLoading === selectedPost.id}
                    className="flex-1 rounded-xl bg-green-500/20 py-2 text-sm font-bold text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedPost.id ? '...' : '👁️ Restore Post'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleHidePost(selectedPost.id)}
                    disabled={actionLoading === selectedPost.id}
                    className="flex-1 rounded-xl bg-yellow-500/20 py-2 text-sm font-bold text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedPost.id ? '...' : '🙈 Hide Post'}
                  </button>
                )}
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  disabled={actionLoading === selectedPost.id}
                  className="flex-1 rounded-xl bg-red-500/20 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                >
                  {actionLoading === selectedPost.id ? '...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 z-[100] rounded-xl border px-6 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'border-green-500/30 bg-green-500/20 text-green-400'
                : 'border-red-500/30 bg-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{toast.type === 'success' ? '✓' : '✗'}</span>
              <p className="text-sm font-bold">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
