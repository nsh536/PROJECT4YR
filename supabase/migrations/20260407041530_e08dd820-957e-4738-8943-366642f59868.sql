CREATE POLICY "Students can delete their pending applications"
ON public.applications
FOR DELETE
TO public
USING (auth.uid() = user_id AND status = 'pending');