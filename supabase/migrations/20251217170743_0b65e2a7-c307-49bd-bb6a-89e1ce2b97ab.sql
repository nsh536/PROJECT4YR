-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'employer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'student',
  company_name TEXT, -- For employers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_data JSONB, -- AI extracted data
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  education TEXT,
  summary TEXT,
  title TEXT, -- Job title from resume
  status TEXT DEFAULT 'pending', -- pending, parsed, error
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table for employers
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time',
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  experience_min INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, reviewed, shortlisted, rejected
  match_score INTEGER, -- AI calculated match percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Resumes policies
CREATE POLICY "Students can view their own resumes"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own resumes"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own resumes"
  ON public.resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Employers can view all resumes"
  ON public.resumes FOR SELECT
  USING (public.has_role(auth.uid(), 'employer'));

-- Jobs policies
CREATE POLICY "Anyone can view active jobs"
  ON public.jobs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Employers can insert their own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = employer_id AND public.has_role(auth.uid(), 'employer'));

CREATE POLICY "Employers can update their own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = employer_id);

-- Applications policies
CREATE POLICY "Students can view their own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
  ON public.applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = applications.job_id 
    AND jobs.employer_id = auth.uid()
  ));

CREATE POLICY "Employers can update applications for their jobs"
  ON public.applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = applications.job_id 
    AND jobs.employer_id = auth.uid()
  ));

-- Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes bucket
CREATE POLICY "Users can upload their own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Employers can view all resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'employer'));