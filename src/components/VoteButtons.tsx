'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { motion } from 'framer-motion';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

type VoteButtonsProps = {
  postId: string;
  initialHeat: number;
  size?: 'sm' | 'md';
};

type VoteState = 'up' | 'down' | null;

const VOTE_STORAGE_KEY = 'tea_votes';

function getStoredVotes(): Record<string, VoteState> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(VOTE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredVote(postId: string, vote: VoteState) {
  if (typeof window === 'undefined') return;
  try {
    const votes = getStoredVotes();
    if (vote === null) {
      delete votes[postId];
    } else {
      votes[postId] = vote;
    }
    localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // localStorage not available
  }
}

// Optimized vote function using Edge API
async function submitVote(postId: string, action: 'up' | 'down' | 'remove-up' | 'remove-down'): Promise<number | null> {
  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, action }),
    });

    if (!response.ok) {
      throw new Error('Vote failed');
    }

    const data = await response.json();
    return data.heat ?? null;
  } catch (error) {
    console.error('Vote error:', error);
    return null;
  }
}

export function VoteButtons({ postId, initialHeat, size = 'md' }: VoteButtonsProps) {
  const [heat, setHeat] = useState(initialHeat);
  const [voteState, setVoteState] = useState<VoteState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = getStoredVotes();
    setVoteState(stored[postId] ?? null);
  }, [postId]);

  const handleVote = useCallback((e: React.MouseEvent, direction: 'up' | 'down') => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupabaseConfigured() || isPending) return;

    const currentVote = voteState;

    // Optimistic update
    let optimisticHeat = heat;
    let newVoteState: VoteState = direction;
    let action: 'up' | 'down' | 'remove-up' | 'remove-down';

    if (currentVote === direction) {
      // Removing vote
      action = direction === 'up' ? 'remove-up' : 'remove-down';
      optimisticHeat = direction === 'up' ? heat - 1 : heat + 1;
      newVoteState = null;
    } else if (currentVote !== null) {
      // Changing vote
      action = direction;
      optimisticHeat = direction === 'up' ? heat + 2 : heat - 2;
    } else {
      // New vote
      action = direction;
      optimisticHeat = direction === 'up' ? heat + 1 : heat - 1;
    }

    // Apply optimistic update immediately
    setHeat(Math.max(0, optimisticHeat));
    setVoteState(newVoteState);
    setStoredVote(postId, newVoteState);

    // Submit to Edge API in background
    startTransition(async () => {
      const serverHeat = await submitVote(postId, action);
      if (serverHeat !== null) {
        setHeat(serverHeat);
      }
    });
  }, [postId, heat, voteState, isPending]);

  const isBoiling = heat >= 100;

  // Calculate size variables based on 'size' prop
  const iconSizeClass = size === 'sm' ? 'w-5 h-5 text-[11px]' : 'w-7 h-7 text-[13px]';
  const digitSizeClass = size === 'sm' ? 'text-base' : 'text-lg';
  const labelSizeClass = size === 'sm' ? 'text-[8px]' : 'text-[9.5px]';

  return (
    <div className="flex items-center gap-2.5">
      {/* Up/Down buttons container */}
      <div className="flex flex-col items-center gap-1.5 p-1 rounded-full bg-charcoal/40 border border-white/5">
        <motion.button
          type="button"
          onClick={(e) => handleVote(e, 'up')}
          disabled={isPending}
          className={`${iconSizeClass} flex items-center justify-center rounded-full font-bold transition-all duration-300 disabled:opacity-50 ${voteState === 'up'
            ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]'
            : 'text-zinc-500 hover:text-sky-400 hover:bg-sky-500/10'
            }`}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          aria-label="Upvote"
        >
          ▲
        </motion.button>
        <div className="w-3 h-px bg-white/10" />
        <motion.button
          type="button"
          onClick={(e) => handleVote(e, 'down')}
          disabled={isPending}
          className={`${iconSizeClass} flex items-center justify-center rounded-full font-bold transition-all duration-300 disabled:opacity-50 ${voteState === 'down'
            ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
            : 'text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10'
            }`}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          aria-label="Downvote"
        >
          ▼
        </motion.button>
      </div>

      {/* Heat Score */}
      <motion.div
        className="flex flex-col items-start min-w-[40px]"
        key={heat}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <span
          className={`${digitSizeClass} font-extrabold tracking-tight tabular-nums transition-colors duration-300 ${isBoiling ? 'text-violet-400' : 'text-zinc-200'
            }`}
        >
          {heat}
        </span>
        <span
          className={`${labelSizeClass} font-bold uppercase tracking-[0.15em] transition-colors duration-300 ${isBoiling ? 'text-violet-500' : 'text-zinc-500'
            }`}
        >
          {isBoiling ? '🔥 Boiling' : 'Heat'}
        </span>
      </motion.div>
    </div>
  );
}
