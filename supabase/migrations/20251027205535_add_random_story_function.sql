-- Migration: Add get_random_story() function
-- Description: Creates a PostgreSQL function to retrieve a random story from the authenticated user's collection.
-- This function uses ORDER BY RANDOM() to select a random row efficiently with RLS enforcement.

CREATE OR REPLACE FUNCTION get_random_story()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject varchar(150),
  difficulty smallint,
  darkness smallint,
  question text,
  answer text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.subject,
    s.difficulty,
    s.darkness,
    s.question,
    s.answer,
    s.created_at
  FROM public.stories s
  WHERE s.user_id = auth.uid()
  ORDER BY random()
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_random_story() TO authenticated;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION get_random_story() IS
'Returns a random story from the authenticated user''s collection. Returns no rows if user has no stories. Protected by RLS - only returns stories where user_id matches auth.uid().';