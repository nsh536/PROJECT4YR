CREATE POLICY "Students can delete their own resumes"
ON public.resumes
FOR DELETE
TO public
USING (auth.uid() = user_id);