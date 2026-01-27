-- ============================================================================
-- Chronos Database Schema
-- Complete setup including tables, RLS policies, functions, and triggers
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Tables
-- ============================================================================

-- Todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  is_completed    BOOLEAN DEFAULT FALSE NOT NULL,
  accumulated_time INTEGER DEFAULT 0 NOT NULL CHECK (accumulated_time >= 0),
  last_start_time  TIMESTAMPTZ DEFAULT NULL,
  position        INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comment to table
COMMENT ON TABLE public.todos IS 'User todo items with timer tracking';

-- Column comments
COMMENT ON COLUMN public.todos.id IS 'Unique identifier for the todo';
COMMENT ON COLUMN public.todos.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN public.todos.title IS 'Todo title (1-200 characters)';
COMMENT ON COLUMN public.todos.is_completed IS 'Whether the todo is marked complete';
COMMENT ON COLUMN public.todos.accumulated_time IS 'Total time tracked in milliseconds';
COMMENT ON COLUMN public.todos.last_start_time IS 'When the timer was last started (null if not running)';
COMMENT ON COLUMN public.todos.position IS 'Sort order position';
COMMENT ON COLUMN public.todos.created_at IS 'When the todo was created';
COMMENT ON COLUMN public.todos.updated_at IS 'When the todo was last updated';

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for fetching user's todos ordered by position
CREATE INDEX IF NOT EXISTS idx_todos_user_position 
  ON public.todos(user_id, position);

-- Index for finding running timers
CREATE INDEX IF NOT EXISTS idx_todos_running 
  ON public.todos(user_id, last_start_time) 
  WHERE last_start_time IS NOT NULL;

-- Index for completed todos
CREATE INDEX IF NOT EXISTS idx_todos_completed 
  ON public.todos(user_id, is_completed) 
  WHERE is_completed = TRUE;

-- Index for recent todos
CREATE INDEX IF NOT EXISTS idx_todos_created 
  ON public.todos(user_id, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on todos table
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own todos
CREATE POLICY "Users can view own todos" 
  ON public.todos 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own todos
CREATE POLICY "Users can insert own todos" 
  ON public.todos 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own todos
CREATE POLICY "Users can update own todos" 
  ON public.todos 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own todos
CREATE POLICY "Users can delete own todos" 
  ON public.todos 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's todo statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE is_completed = TRUE),
    'active_tasks', COUNT(*) FILTER (WHERE is_completed = FALSE),
    'total_time_ms', COALESCE(SUM(accumulated_time), 0),
    'running_timers', COUNT(*) FILTER (WHERE last_start_time IS NOT NULL)
  ) INTO result
  FROM public.todos
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pause all running timers for a user
CREATE OR REPLACE FUNCTION public.pause_all_timers(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.todos
  SET 
    accumulated_time = accumulated_time + 
      EXTRACT(EPOCH FROM (now() - last_start_time))::INTEGER * 1000,
    last_start_time = NULL,
    updated_at = now()
  WHERE 
    user_id = p_user_id 
    AND last_start_time IS NOT NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder todos
CREATE OR REPLACE FUNCTION public.reorder_todos(
  p_user_id UUID,
  p_todo_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(p_todo_ids, 1) LOOP
    UPDATE public.todos
    SET position = i - 1, updated_at = now()
    WHERE id = p_todo_ids[i] AND user_id = p_user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear completed todos
CREATE OR REPLACE FUNCTION public.clear_completed_todos(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  DELETE FROM public.todos
  WHERE user_id = p_user_id AND is_completed = TRUE;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS on_todos_updated ON public.todos;
CREATE TRIGGER on_todos_updated
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Realtime
-- ============================================================================

-- Enable realtime for todos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

-- ============================================================================
-- Storage (optional - for future avatar uploads)
-- ============================================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Anyone can view avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Storage policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Seed Data (optional - for development)
-- ============================================================================

-- Note: Uncomment below to add sample data for testing
-- This requires a valid user_id from auth.users

/*
INSERT INTO public.todos (user_id, title, is_completed, accumulated_time, position) VALUES
  ('your-user-id-here', 'Welcome to Chronos! 👋', false, 0, 0),
  ('your-user-id-here', 'Try starting a timer by clicking play', false, 0, 1),
  ('your-user-id-here', 'Complete a task by clicking the checkbox', false, 0, 2),
  ('your-user-id-here', 'This is a completed task example', true, 3600000, 3);
*/

-- ============================================================================
-- Grants
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to todos table
GRANT ALL ON public.todos TO authenticated;
GRANT SELECT ON public.todos TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_all_timers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_todos(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_completed_todos(UUID) TO authenticated;

-- ============================================================================
-- NEW: ENHANCED SCHEMA UPDATES (Appended)
-- ============================================================================

-- Add new columns to todos table
ALTER TABLE public.todos 
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL CHECK (priority IN ('high', 'medium', 'low') OR priority IS NULL),
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_time INTEGER DEFAULT NULL CHECK (estimated_time >= 0 OR estimated_time IS NULL),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_todos_due_at 
  ON public.todos(user_id, due_at) 
  WHERE due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todos_priority 
  ON public.todos(user_id, priority) 
  WHERE priority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todos_tags 
  ON public.todos USING GIN(tags);

-- Update the stats function
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE is_completed = TRUE),
    'active_tasks', COUNT(*) FILTER (WHERE is_completed = FALSE),
    'overdue_tasks', COUNT(*) FILTER (WHERE is_completed = FALSE AND due_at < NOW()),
    'total_time_ms', COALESCE(SUM(accumulated_time), 0),
    'estimated_time_ms', COALESCE(SUM(estimated_time), 0),
    'running_timers', COUNT(*) FILTER (WHERE last_start_time IS NOT NULL),
    'high_priority', COUNT(*) FILTER (WHERE priority = 'high' AND is_completed = FALSE),
    'due_today', COUNT(*) FILTER (WHERE DATE(due_at) = CURRENT_DATE AND is_completed = FALSE)
  ) INTO result
  FROM public.todos
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;