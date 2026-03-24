'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

interface ReportButtonProps {
  postId: string;
}

const reportReasons = [
  { value: 'spam', label: '🗑️ Spam', description: 'Unwanted promotional content' },
  { value: 'harassment', label: '😠 Harassment', description: 'Targeting or bullying someone' },
  { value: 'hate_speech', label: '🚫 Hate Speech', description: 'Discriminatory language' },
  { value: 'explicit_content', label: '🔞 Explicit Content', description: 'NSFW or inappropriate content' },
  { value: 'misinformation', label: '📰 Misinformation', description: 'False or misleading info' },
  { value: 'doxxing', label: '🔍 Doxxing', description: 'Sharing private information' },
  { value: 'self_harm', label: '💔 Self Harm', description: 'Content promoting self-harm' },
  { value: 'other', label: '📋 Other', description: 'Something else' },
];

export function ReportButton({ postId }: ReportButtonProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedReason(null);
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseClient();

        // Get or create a fingerprint for the reporter
        let fingerprint = localStorage.getItem('tea-fingerprint');
        if (!fingerprint) {
          fingerprint = Math.random().toString(36).substring(2, 15);
          localStorage.setItem('tea-fingerprint', fingerprint);
        }

        const { error } = await supabase.from('reports').insert({
          post_id: postId,
          reporter_fingerprint: fingerprint,
          reason: selectedReason,
          description: description.trim() || null,
        });

        if (error) {
          throw error;
        }
      }

      showToast('Report submitted. Thanks for keeping Tea safe! 🙏', 'success');
      handleClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      showToast('Failed to submit report. Try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Report this post"
      >
        🚩 <span className="hidden sm:inline">Report</span>
      </motion.button>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/80 backdrop-blur-xl p-4 sm:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            >
              <motion.div
                className="glass-strong relative w-full max-w-lg rounded-[24px] border border-white/10 p-6 sm:p-8 shadow-premium"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6 pr-6">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-zinc-50">Report Post</h3>
                    <p className="text-[13px] font-medium text-zinc-400 mt-1">Help keep Tea a safe space</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-full glass border border-white/5 px-2.5 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-3">
                      Why are you reporting this?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {reportReasons.map((reason) => (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() => setSelectedReason(reason.value)}
                          className={`rounded-[16px] p-3.5 text-left transition-all duration-200 border ${selectedReason === reason.value
                            ? 'bg-violet-500/10 border-violet-500/30 ring-1 ring-violet-500/20'
                            : 'bg-charcoal/40 border-white/5 hover:bg-white/5 hover:border-white/10'
                            }`}
                        >
                          <p className={`text-[13px] font-bold ${selectedReason === reason.value ? 'text-violet-200' : 'text-zinc-200'}`}>
                            {reason.label}
                          </p>
                          <p className="text-[11px] font-medium text-zinc-500 mt-1">{reason.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-2 block">
                      Additional details <span className="font-normal normal-case opacity-70">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell us more about why this post is problematic..."
                      className="w-full rounded-[16px] border border-white/10 glass p-3.5 text-[14px] font-medium text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/30 focus:ring-4 focus:ring-violet-500/10 focus:outline-none resize-none transition-all duration-300"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 rounded-full bg-white/5 py-3 text-[14px] font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors border border-transparent hover:border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!selectedReason || isSubmitting}
                      className="flex-1 rounded-full bg-violet-500/90 py-3 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>

                  <p className="text-[11px] font-medium text-zinc-500 text-center leading-relaxed">
                    Reports are strictly anonymous and reviewed exclusively by our moderation team.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
