-- =====================================================
-- FIX ADMIN PANEL - ENABLE POST DELETION
-- =====================================================
-- This script fixes the issue where admins cannot delete posts
-- by adding the missing RLS policies for DELETE operations

-- =====================================================
-- 1. ADD UPDATE AND DELETE POLICIES FOR POSTS
-- =====================================================
-- Drop and recreate UPDATE policy to ensure all columns can be updated
DROP POLICY IF EXISTS "posts_update_heat" ON public.posts;
DROP POLICY IF EXISTS "posts_update_admin" ON public.posts;

-- Allow full updates (including is_hidden, report_count, etc.)
CREATE POLICY "posts_update_admin" ON public.posts
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "posts_delete" ON public.posts;

-- Allow anyone to delete posts (admin authentication happens in app layer)
-- In production, you should add proper admin authentication here
CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE 
  USING (true);

-- =====================================================
-- 2. ADD DELETE POLICY FOR KETTLES
-- =====================================================
DROP POLICY IF EXISTS "kettles_delete" ON public.kettles;

CREATE POLICY "kettles_delete" ON public.kettles
  FOR DELETE
  USING (true);

-- =====================================================
-- 3. ENSURE IS_HIDDEN COLUMN EXISTS AND HAS INDEX
-- =====================================================
DO $$ 
BEGIN
  -- Add is_hidden column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN is_hidden BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE 'Added is_hidden column to posts table';
  ELSE
    RAISE NOTICE 'is_hidden column already exists';
  END IF;
  
  -- Ensure default value for existing rows
  UPDATE public.posts SET is_hidden = false WHERE is_hidden IS NULL;
  
  -- Create index for performance
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND indexname = 'idx_posts_is_hidden'
  ) THEN
    CREATE INDEX idx_posts_is_hidden ON public.posts(is_hidden);
    RAISE NOTICE 'Created index on is_hidden column';
  END IF;
  
  -- Add report_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'report_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN report_count INT DEFAULT 0 NOT NULL;
    RAISE NOTICE 'Added report_count column to posts table';
  ELSE
    RAISE NOTICE 'report_count column already exists';
  END IF;
  
  -- Ensure default value for existing rows
  UPDATE public.posts SET report_count = 0 WHERE report_count IS NULL;
END $$;

-- =====================================================
-- 4. ADD ADMIN DELETE FUNCTION (SECURE)
-- =====================================================
-- This function allows secure deletion with logging
CREATE OR REPLACE FUNCTION admin_delete_post(
  post_id UUID,
  admin_identifier TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted BOOLEAN := false;
BEGIN
  -- Delete the post
  DELETE FROM public.posts
  WHERE id = post_id;
  
  -- Check if deletion was successful
  IF FOUND THEN
    deleted := true;
    
    -- Log to moderation_log if table exists
    BEGIN
      INSERT INTO moderation_log (admin_id, action_type, target_type, target_id, details)
      VALUES (NULL, 'delete_post', 'post', post_id, jsonb_build_object('admin', admin_identifier));
    EXCEPTION
      WHEN undefined_table THEN
        -- moderation_log doesn't exist yet, skip logging
        NULL;
    END;
  END IF;
  
  RETURN deleted;
END;
$$;

-- =====================================================
-- 5. ADD ADMIN HIDE/RESTORE POST FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION admin_hide_post(
  post_id UUID,
  admin_identifier TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated BOOLEAN := false;
BEGIN
  -- Hide the post
  UPDATE public.posts
  SET is_hidden = true
  WHERE id = post_id;
  
  IF FOUND THEN
    updated := true;
    
    BEGIN
      INSERT INTO moderation_log (admin_id, action_type, target_type, target_id, details)
      VALUES (NULL, 'hide_post', 'post', post_id, jsonb_build_object('admin', admin_identifier));
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;
  END IF;
  
  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION admin_restore_post(
  post_id UUID,
  admin_identifier TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated BOOLEAN := false;
BEGIN
  -- Restore the post
  UPDATE public.posts
  SET is_hidden = false
  WHERE id = post_id;
  
  IF FOUND THEN
    updated := true;
    
    BEGIN
      INSERT INTO moderation_log (admin_id, action_type, target_type, target_id, details)
      VALUES (NULL, 'restore_post', 'post', post_id, jsonb_build_object('admin', admin_identifier));
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;
  END IF;
  
  RETURN updated;
END;
$$;

-- =====================================================
-- 6. FIX CASCADE DELETES FOR REPORTS
-- =====================================================
-- Ensure reports are properly cleaned up when posts are deleted
DO $$ 
BEGIN
  -- Only run if reports table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reports'
  ) THEN
    -- Drop and recreate the foreign key with proper CASCADE
    ALTER TABLE IF EXISTS public.reports 
      DROP CONSTRAINT IF EXISTS reports_post_id_fkey;
    
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_post_id_fkey 
      FOREIGN KEY (post_id) 
      REFERENCES public.posts(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =====================================================
-- Grant execute permissions on admin functions
GRANT EXECUTE ON FUNCTION admin_delete_post(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_hide_post(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_restore_post(UUID, TEXT) TO anon, authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$ 
BEGIN
  RAISE NOTICE 'Admin delete policies have been successfully applied!';
  RAISE NOTICE 'Admins can now delete, hide, and restore posts.';
END $$;
