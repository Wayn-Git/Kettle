'use client';

import { useState, FormEvent, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { generateRandomTeaName } from "@/lib/randomTeaName";

type PourTeaModalProps = {
  open: boolean;
  onClose: () => void;
  kettleId: string;
  kettleName: string;
  parentPostId?: string;
  replyingTo?: string;
  onSuccess?: () => void | Promise<void>;
};

export function PourTeaModal({
  open,
  onClose,
  kettleId,
  kettleName,
  parentPostId,
  replyingTo,
  onSuccess,
}: PourTeaModalProps) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate identity once when modal opens (memoized)
  const generatedIdentity = useMemo(() => generateRandomTeaName(), []);

  const isReply = !!parentPostId;
  const maxLength = 500;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Spill at least a little tea first.");
      return;
    }

    if (content.length > maxLength) {
      setError(`Keep it under ${maxLength} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseClient();

      let imageUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `posts/${kettleId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(path, file);

        if (uploadError) {
          console.error(uploadError);
          setError("Could not upload your image. Try again without it?");
          setIsSubmitting(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(path);

        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase.from("posts").insert({
        kettle_id: kettleId,
        parent_post_id: parentPostId ?? null,
        content: content.trim(),
        image_url: imageUrl,
        anonymous_identity: generatedIdentity,
        heat_score: 0,
      });

      if (insertError) {
        console.error(insertError);
        setError(
          insertError.message ||
          "Something went wrong while pouring the tea."
        );
        setIsSubmitting(false);
        return;
      }

      setContent("");
      setFile(null);
      onClose();

      // Small delay to ensure Supabase has propagated the insert, then refresh
      setTimeout(async () => {
        if (onSuccess) {
          await onSuccess();
        }
      }, 150);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Unexpected error. Try again in a sec.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setFile(null);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/80 backdrop-blur-xl p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          <motion.div
            className="glass-strong relative w-full max-w-lg rounded-[24px] border border-white/10 p-6 sm:p-8 shadow-premium"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full glass border border-white/5 px-2.5 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ✕
            </motion.button>

            <div className="mb-5 space-y-1.5 pr-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neon-green">
                {isReply ? '💬 Reply' : 'Pour the Tea'}
              </p>
              <h2 className="text-xl font-bold text-zinc-50 tracking-tight leading-tight">
                {isReply ? (
                  <>Replying to <span className="text-neon-green">{replyingTo}</span></>
                ) : (
                  <>New drop in <span className="text-neon-green">{kettleName}</span></>
                )}
              </h2>
              <p className="text-[13px] font-medium text-zinc-400 mt-1">
                Your identity will be{" "}
                <span className="font-semibold text-neon-green">
                  {generatedIdentity}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-zinc-300">
                    What&apos;s the tea?
                  </label>
                  <span className={`text-[11px] font-medium ${content.length > maxLength ? 'text-hot-pink' : 'text-zinc-500'
                    }`}>
                    {content.length}/{maxLength}
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-[16px] border border-white/10 glass p-3.5 text-[15px] font-medium text-zinc-100 placeholder:text-zinc-600 outline-none transition-all duration-300 focus:border-neon-green/40 focus:ring-4 focus:ring-neon-green/10 resize-none"
                    placeholder={isReply ? '"I heard that..."' : '"My roommate just…"'}
                    maxLength={maxLength + 50}
                  />
                </div>
              </div>

              {!isReply && (
                <div className="space-y-3">
                  <label className="text-[13px] font-semibold text-zinc-300">
                    Add a receipt <span className="text-zinc-500 font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-charcoal-light/50 border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-zinc-300 hover:bg-white/5 hover:border-white/20 hover:text-white transition-all duration-300"
                    >
                      <span className="text-lg">📸</span> Upload Image
                    </label>
                    {file && (
                      <div className="flex items-center gap-2 text-[12px] text-zinc-400 bg-charcoal-light/30 px-3 py-1.5 rounded-lg border border-white/5">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-hot-pink hover:text-hot-pink/80 transition-colors ml-1 p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-zinc-500">
                    We recommend censoring names/handles before uploading.
                  </p>
                </div>
              )}

              {error && (
                <motion.p
                  className="rounded-lg bg-hot-pink/10 border border-hot-pink/20 p-3 text-[13px] font-semibold text-hot-pink flex items-center gap-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="text-base text-hot-pink/80">⚠️</span> {error}
                </motion.p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <p className="text-[11px] font-medium text-zinc-500 max-w-[55%] leading-relaxed">
                  Posts are anonymous but still need to follow basic decency.
                </p>
                <motion.button
                  type="submit"
                  disabled={isSubmitting || content.length > maxLength}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-50 px-6 py-2.5 text-[14px] font-bold text-zinc-900 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-zinc-50 disabled:hover:shadow-none"
                  whileHover={!(isSubmitting || content.length > maxLength) ? { scale: 1.02, translateY: -1 } : {}}
                  whileTap={!(isSubmitting || content.length > maxLength) ? { scale: 0.98 } : {}}
                >
                  {isSubmitting ? "Pouring..." : isReply ? "Reply" : "Drop the Tea"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

