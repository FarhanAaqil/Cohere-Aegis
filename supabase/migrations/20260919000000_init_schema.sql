-- Cohere Aegis Full Database Schema

-- Enums (optional/text constraints)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public screenshot viewing
CREATE POLICY "Public Access Screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "Authenticated Upload Screenshots" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'screenshots');

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manager_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN', 'HR_MANAGER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  job_title TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  monitor_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add manager fk now that users table exists
ALTER TABLE public.teams 
  DROP CONSTRAINT IF EXISTS fk_teams_manager;
ALTER TABLE public.teams 
  ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Shifts
CREATE TABLE IF NOT EXISTS public.user_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Work Sessions
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  total_active_seconds INTEGER DEFAULT 0,
  total_idle_seconds INTEGER DEFAULT 0,
  notes TEXT,
  manager_comment TEXT,
  source TEXT DEFAULT 'MANUAL',
  login_type TEXT DEFAULT 'SITE',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Breaks
CREATE TABLE IF NOT EXISTS public.breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.work_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  break_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY', 'WEEKEND')),
  total_work_seconds INTEGER DEFAULT 0,
  overtime_seconds INTEGER DEFAULT 0,
  undertime_seconds INTEGER DEFAULT 0,
  notes TEXT,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 9. Attendance Corrections
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_in TIMESTAMPTZ NOT NULL,
  requested_out TIMESTAMPTZ NOT NULL,
  original_in TIMESTAMPTZ,
  original_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Chat Groups
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (group_type IN ('GENERAL', 'TEAM', 'PROJECT', 'DIRECT')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Chat Group Members
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 13. Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assignee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Task Activity
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Browser History
CREATE TABLE IF NOT EXISTS public.browser_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  duration_seconds INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID REFERENCES public.work_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Screenshots
CREATE TABLE IF NOT EXISTS public.screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.work_sessions(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_blurred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. IP Configurations
CREATE TABLE IF NOT EXISTS public.ip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Policies
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Devices
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  os_type TEXT DEFAULT 'WINDOWS',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- 22. Heartbeats
CREATE TABLE IF NOT EXISTS public.heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  type TEXT NOT NULL,
  metadata JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow service_role full bypass
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access work_sessions" ON public.work_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access breaks" ON public.breaks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access attendance" ON public.attendance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access teams" ON public.teams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access departments" ON public.departments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access shifts" ON public.shifts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access user_shifts" ON public.user_shifts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access leave_requests" ON public.leave_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access corrections" ON public.attendance_corrections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access chat_groups" ON public.chat_groups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access chat_group_members" ON public.chat_group_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access chat_messages" ON public.chat_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access tasks" ON public.tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access task_activity" ON public.task_activity FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access browser_history" ON public.browser_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access screenshots" ON public.screenshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access ip_configs" ON public.ip_configs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access audit_logs" ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access policies" ON public.policies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access devices" ON public.devices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access heartbeats" ON public.heartbeats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access events" ON public.events FOR ALL USING (auth.role() = 'service_role');

-- General read policies for authenticated users or realtime if needed
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Users can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Users can read policies" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Users can read shifts" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Users can read chat groups" ON public.chat_groups FOR SELECT USING (true);
CREATE POLICY "Users can read chat messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert chat messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
