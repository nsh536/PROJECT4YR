-- Allow employers to view profiles of candidates (for talent search)
CREATE POLICY "Employers can view candidate profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'employer'::app_role)
);