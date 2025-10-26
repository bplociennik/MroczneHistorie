-- ============================================================================
-- Migration: Create stories table and setup RLS
-- ============================================================================
-- Author: Database Migration System
-- Created: 2025-10-26 16:21:04 UTC
--
-- Description:
-- Creates the main stories table for MroczneHistorie MVP application.
-- Implements comprehensive Row Level Security to ensure users can only
-- access their own stories.
--
-- Tables affected:
-- - public.stories (created)
--
-- Indexes created:
-- - idx_stories_user_created (composite index on user_id, created_at desc)
--
-- RLS policies created:
-- - 4 policies for authenticated users (select, insert, update, delete)
-- - 4 policies for anonymous users (all operations blocked)
--
-- Special notes:
-- - Uses uuid for primary key to prevent resource enumeration attacks
-- - Implements ON DELETE CASCADE for user_id foreign key to maintain referential integrity
-- - Composite index optimizes the main read query (user story listing with date sorting)
-- - RLS policies provide defense-in-depth security at the database level
-- ============================================================================

-- ============================================================================
-- Table: public.stories
-- ============================================================================
-- Main application table storing user-generated horror stories with
-- AI-generated riddles and solutions.
create table public.stories (
  -- primary key: uuid for security (prevents id enumeration)
  id uuid primary key default gen_random_uuid(),

  -- foreign key to auth.users with cascade delete
  -- ensures all user stories are automatically deleted when user account is removed
  user_id uuid not null references auth.users(id) on delete cascade,

  -- user-provided story subject/topic
  -- limited to 150 characters for UI consistency
  subject varchar(150) not null,

  -- difficulty level: 1 (easy), 2 (medium), 3 (hard)
  -- validation happens on frontend, default to easiest level
  difficulty smallint not null default 1,

  -- darkness/horror level: 1 (mild), 2 (moderate), 3 (intense)
  -- validation happens on frontend, default to mildest level
  darkness smallint not null default 1,

  -- ai-generated question/riddle based on subject and parameters
  question text not null,

  -- ai-generated answer/solution to the riddle
  answer text not null,

  -- creation timestamp for sorting and audit trail
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Table and column comments
-- ============================================================================
comment on table public.stories is
'Stores user-generated horror stories with AI-generated questions and answers. Each story belongs to a single user and contains a riddle with its solution.';

comment on column public.stories.id is
'Unique identifier for the story. Uses uuid to prevent enumeration attacks.';

comment on column public.stories.user_id is
'Foreign key reference to auth.users. Owner of the story. Cascade delete ensures cleanup when user account is removed.';

comment on column public.stories.subject is
'User-provided topic/subject for the story. Maximum 150 characters.';

comment on column public.stories.difficulty is
'Difficulty level of the riddle: 1 (easy), 2 (medium), 3 (hard). Validated by frontend.';

comment on column public.stories.darkness is
'Darkness/horror intensity level: 1 (mild), 2 (moderate), 3 (intense). Validated by frontend.';

comment on column public.stories.question is
'AI-generated riddle/question based on the subject and selected parameters.';

comment on column public.stories.answer is
'AI-generated solution/answer to the riddle.';

comment on column public.stories.created_at is
'Timestamp of story creation. Used for sorting stories from newest to oldest.';

-- ============================================================================
-- Indexes
-- ============================================================================
-- Composite B-tree index optimized for the main application read query:
-- SELECT * FROM stories WHERE user_id = X ORDER BY created_at DESC
--
-- Index structure (user_id, created_at desc) provides:
-- 1. Efficient filtering on user_id (first column in index)
-- 2. Direct index usage for descending sort by created_at (no separate sort step)
-- 3. Potential for index-only scans depending on query selectivity
--
-- This is the primary access pattern for Epic 3.1 (display user's story list)
create index idx_stories_user_created
on public.stories (user_id, created_at desc);

comment on index idx_stories_user_created is
'Composite index optimizing user story listing queries. Covers filtering by user_id and sorting by created_at descending.';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Enable RLS on stories table to enforce data isolation at database level.
-- This provides defense-in-depth: even if application code has bugs,
-- PostgreSQL will enforce access control based on authenticated user identity.
alter table public.stories enable row level security;

-- ============================================================================
-- RLS Policies: Authenticated Users
-- ============================================================================
-- Authenticated users have full CRUD access to their own stories only.
-- All policies use auth.uid() which returns the user id from the JWT token
-- provided by Supabase Auth. If auth.uid() is null or doesn't match user_id,
-- the policy condition fails and access is denied.

-- Policy: SELECT for authenticated users
-- Allows users to view only their own stories (Epic 3.1)
-- Condition: auth.uid() must equal story's user_id
create policy stories_select_own_authenticated
on public.stories
for select
to authenticated
using (auth.uid() = user_id);

comment on policy stories_select_own_authenticated on public.stories is
'Authenticated users can only SELECT stories where they are the owner (user_id matches auth.uid())';

-- Policy: INSERT for authenticated users
-- Allows users to create stories only for their own account (Epic 2)
-- Check constraint: auth.uid() must equal the user_id being inserted
create policy stories_insert_own_authenticated
on public.stories
for insert
to authenticated
with check (auth.uid() = user_id);

comment on policy stories_insert_own_authenticated on public.stories is
'Authenticated users can only INSERT stories with their own user_id (prevents creating stories for other users)';

-- Policy: UPDATE for authenticated users
-- Allows users to edit only their own stories (Epic 3, ID 3.8-3.9)
-- Condition: auth.uid() must equal story's user_id
create policy stories_update_own_authenticated
on public.stories
for update
to authenticated
using (auth.uid() = user_id);

comment on policy stories_update_own_authenticated on public.stories is
'Authenticated users can only UPDATE their own stories (enables story editing feature)';

-- Policy: DELETE for authenticated users
-- Allows users to delete only their own stories (Epic 3, ID 3.7)
-- Condition: auth.uid() must equal story's user_id
create policy stories_delete_own_authenticated
on public.stories
for delete
to authenticated
using (auth.uid() = user_id);

comment on policy stories_delete_own_authenticated on public.stories is
'Authenticated users can only DELETE their own stories (enables story deletion feature)';

-- ============================================================================
-- RLS Policies: Anonymous Users
-- ============================================================================
-- Anonymous (non-authenticated) users have NO access to stories.
-- The following policies explicitly block all operations for the 'anon' role.
-- While blocking could be achieved by simply not creating policies for 'anon',
-- explicit denial policies provide:
-- 1. Clear documentation of security intent
-- 2. Defense-in-depth (prevents accidental access if default policies change)
-- 3. Easier auditing and security reviews

-- Policy: SELECT blocked for anonymous users
-- Denies all SELECT operations for non-authenticated users
create policy stories_select_blocked_anon
on public.stories
for select
to anon
using (false);

comment on policy stories_select_blocked_anon on public.stories is
'Anonymous users cannot SELECT any stories (explicit denial)';

-- Policy: INSERT blocked for anonymous users
-- Denies all INSERT operations for non-authenticated users
create policy stories_insert_blocked_anon
on public.stories
for insert
to anon
with check (false);

comment on policy stories_insert_blocked_anon on public.stories is
'Anonymous users cannot INSERT stories (explicit denial)';

-- Policy: UPDATE blocked for anonymous users
-- Denies all UPDATE operations for non-authenticated users
create policy stories_update_blocked_anon
on public.stories
for update
to anon
using (false);

comment on policy stories_update_blocked_anon on public.stories is
'Anonymous users cannot UPDATE stories (explicit denial)';

-- Policy: DELETE blocked for anonymous users
-- Denies all DELETE operations for non-authenticated users
create policy stories_delete_blocked_anon
on public.stories
for delete
to anon
using (false);

comment on policy stories_delete_blocked_anon on public.stories is
'Anonymous users cannot DELETE stories (explicit denial)';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The stories table is now ready for use with:
-- ✓ Secure uuid-based primary keys
-- ✓ Proper foreign key constraints with cascade delete
-- ✓ Optimized composite index for main query pattern
-- ✓ Complete RLS implementation for data isolation
-- ✓ Comprehensive documentation via comments
-- ============================================================================
