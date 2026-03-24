'use client';

import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';

interface ShareButtonProps {
  url: string;
  className?: string;
}

export function ShareButton({ url, className = '' }: ShareButtonProps) {
  const { showToast } = useToast();

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this tea ☕',
          url: url,
        });
        return;
      } catch {
        // User cancelled or error, fall back to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleShare();
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Share this post"
    >
      🔗 <span className="hidden sm:inline">Share</span>
    </motion.button>
  );
}
