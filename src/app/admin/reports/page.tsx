'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import { timeAgo } from '@/lib/timeAgo';

type Report = {
  id: string;
  post_id: string;
  post_content: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  kettle_name: string;
};

// Demo data
const demoReports: Report[] = [
  {
    id: '1',
    post_id: 'p1',
    post_content: 'This is some offensive content that was reported...',
    reason: 'harassment',
    description: 'This post is targeting someone specifically',
    status: 'pending',
    created_at: '2026-02-04T10:30:00Z',
    kettle_name: 'Campus Chaos',
  },
  {
    id: '2',
    post_id: 'p2',
    post_content: 'Another reported post with spam content...',
    reason: 'spam',
    description: null,
    status: 'pending',
    created_at: '2026-02-04T09:15:00Z',
    kettle_name: 'Dorm Drama',
  },
  {
    id: '3',
    post_id: 'p3',
    post_content: 'This was reviewed and dismissed...',
    reason: 'other',
    description: 'Not actually a violation',
    status: 'dismissed',
    created_at: '2026-02-03T14:20:00Z',
    kettle_name: 'Professor Rants',
  },
];

const reasonLabels: Record<string, { label: string; color: string }> = {
  spam: { label: 'Spam', color: 'bg-yellow-500/20 text-yellow-400' },
  harassment: { label: 'Harassment', color: 'bg-red-500/20 text-red-400' },
  hate_speech: { label: 'Hate Speech', color: 'bg-red-600/20 text-red-500' },
  explicit_content: { label: 'Explicit', color: 'bg-pink-500/20 text-pink-400' },
  misinformation: { label: 'Misinfo', color: 'bg-orange-500/20 text-orange-400' },
  doxxing: { label: 'Doxxing', color: 'bg-red-700/20 text-red-600' },
  self_harm: { label: 'Self Harm', color: 'bg-purple-500/20 text-purple-400' },
  other: { label: 'Other', color: 'bg-zinc-500/20 text-zinc-400' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  reviewed: { label: 'Reviewed', color: 'bg-blue-500/20 text-blue-400' },
  actioned: { label: 'Actioned', color: 'bg-green-500/20 text-green-400' },
  dismissed: { label: 'Dismissed', color: 'bg-zinc-500/20 text-zinc-400' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(demoReports);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'actioned' | 'dismissed'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchReports = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setReports(demoReports);
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          post_id,
          reason,
          description,
          status,
          created_at,
          posts (content, kettles (name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(
        (data || []).map((r: Record<string, unknown>) => {
          const posts = r.posts as { content: string; kettles: { name: string } | null } | null;
          return {
            id: r.id as string,
            post_id: r.post_id as string,
            post_content: posts?.content || 'Post deleted',
            reason: r.reason as string,
            description: r.description as string | null,
            status: r.status as Report['status'],
            created_at: r.created_at as string,
            kettle_name: posts?.kettles?.name || 'Unknown',
          };
        })
      );
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports(demoReports);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (reportId: string, action: 'dismiss' | 'hide' | 'delete') => {
    setActionLoading(reportId);
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      if (!isSupabaseConfigured()) {
        showToast('Supabase not configured. Action happens locally only.', 'error');
        setReports(reports.map(r => 
          r.id === reportId 
            ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'actioned' } 
            : r
        ));
        setSelectedReport(null);
        setActionLoading(null);
        return;
      }

      const supabase = createSupabaseClient();
      
      if (action === 'dismiss') {
        const { error } = await supabase
          .from('reports')
          .update({ status: 'dismissed' })
          .eq('id', reportId);
        
        if (error) throw error;
        showToast('Report dismissed', 'success');
      } else if (action === 'hide') {
        // Try admin function first
        const { data: funcData, error: funcError } = await supabase.rpc('admin_hide_post', {
          post_id: report.post_id,
          admin_identifier: 'admin_panel'
        });
        
        // Fallback to direct update
        if (funcError) {
          console.log('Admin function not available, using direct update:', funcError.message);
          const { error: hideError } = await supabase
            .from('posts')
            .update({ is_hidden: true })
            .eq('id', report.post_id);
          
          if (hideError) {
            console.error('Hide error:', hideError);
            throw new Error(`Failed to hide post: ${hideError.message}`);
          }
        } else {
          console.log('Admin function succeeded:', funcData);
        }
        
        const { error: reportError } = await supabase
          .from('reports')
          .update({ status: 'actioned', action_taken: 'post_hidden' })
          .eq('id', reportId);
        
        if (reportError) throw reportError;
        showToast('Post hidden successfully', 'success');
      } else if (action === 'delete') {
        // Confirm deletion
        if (!confirm('⚠️ DELETE REPORTED POST\n\nAre you sure you want to permanently delete this post?\n\nThis will also delete all replies and mark the report as actioned.')) {
          setActionLoading(null);
          return;
        }
        
        // Try admin function first
        const { data, error: funcError } = await supabase.rpc('admin_delete_post', {
          post_id: report.post_id,
          admin_identifier: 'admin_panel'
        });
        
        // Fallback to direct delete
        if (funcError || !data) {
          const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', report.post_id);
          
          if (deleteError) {
            if (deleteError.message.includes('policy')) {
              throw new Error('Delete policy not configured. Please run supabase-fix-admin-delete.sql');
            }
            throw deleteError;
          }
        }
        
        const { error: reportError } = await supabase
          .from('reports')
          .update({ status: 'actioned', action_taken: 'post_deleted' })
          .eq('id', reportId);
        
        if (reportError) throw reportError;
        showToast('Post deleted successfully', 'success');
      }

      // Update local state only after successful database operation
      setReports(reports.map(r => 
        r.id === reportId 
          ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'actioned' } 
          : r
      ));
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to handle report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed: ${errorMessage}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Content Reports</h1>
          <p className="text-sm text-zinc-500">
            {pendingCount} pending reports need review
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/10"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'reviewed', 'actioned', 'dismissed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              filter === status
                ? 'bg-neon-green text-charcoal'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="glass-strong rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-zinc-500">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="glass-strong rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-zinc-500">No reports found</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <motion.div
                key={report.id}
                className="glass-strong rounded-2xl border border-white/10 p-4 cursor-pointer hover:border-neon-green/30 transition-all"
                onClick={() => setSelectedReport(report)}
                whileHover={{ scale: 1.005 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reasonLabels[report.reason]?.color || 'bg-zinc-500/20 text-zinc-400'}`}>
                        {reasonLabels[report.reason]?.label || report.reason}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusLabels[report.status].color}`}>
                        {statusLabels[report.status].label}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        in {report.kettle_name}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {report.post_content}
                    </p>
                    {report.description && (
                      <p className="mt-1 text-xs text-zinc-500 italic">
                        &quot;{report.description}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500">
                      {timeAgo(report.created_at)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 backdrop-blur-xl p-4"
          onClick={() => setSelectedReport(null)}
        >
          <motion.div
            className="glass-strong w-full max-w-lg rounded-2xl border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Report Details</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reasonLabels[selectedReport.reason]?.color || 'bg-zinc-500/20 text-zinc-400'}`}>
                    {reasonLabels[selectedReport.reason]?.label || selectedReport.reason}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusLabels[selectedReport.status].color}`}>
                    {statusLabels[selectedReport.status].label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500 mb-1">Reported Content</p>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-zinc-300">{selectedReport.post_content}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-500 mb-1">Reporter Note</p>
                  <p className="text-sm text-zinc-400 italic">&quot;{selectedReport.description}&quot;</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Kettle: {selectedReport.kettle_name}</span>
                <span>{timeAgo(selectedReport.created_at)}</span>
              </div>

              {selectedReport.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => handleAction(selectedReport.id, 'delete')}
                    disabled={actionLoading === selectedReport.id}
                    className="flex-1 rounded-xl bg-red-500/20 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedReport.id ? '...' : '🗑️ Delete Post'}
                  </button>
                  <button 
                    onClick={() => handleAction(selectedReport.id, 'hide')}
                    disabled={actionLoading === selectedReport.id}
                    className="flex-1 rounded-xl bg-yellow-500/20 py-2 text-sm font-bold text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedReport.id ? '...' : '👁️ Hide Post'}
                  </button>
                  <button 
                    onClick={() => handleAction(selectedReport.id, 'dismiss')}
                    disabled={actionLoading === selectedReport.id}
                    className="flex-1 rounded-xl bg-zinc-500/20 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedReport.id ? '...' : '✓ Dismiss'}
                  </button>
                </div>
              )}
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
