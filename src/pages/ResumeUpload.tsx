import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, Briefcase, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/Header';

interface ParsedResume {
  id: string;
  file_name: string;
  file_url: string;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience_years: number | null;
  education: string | null;
  status: string;
  created_at: string;
  parsed_data: {
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
      description: string;
    }>;
  } | null;
}

export default function ResumeUpload() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && profile?.role === 'employer') {
      navigate('/');
      toast.error('Only students can upload resumes');
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchResume();
    }
  }, [user]);

  const fetchResume = async () => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setResume(data as ParsedResume | null);
    } catch (error) {
      console.error('Error fetching resume:', error);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Create resume record
      const { data: resumeData, error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Resume uploaded! Parsing with AI...');
      setUploading(false);
      setParsing(true);

      // Read file content for parsing
      const fileContent = await file.text();

      // Call parse-resume function
      const { error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: {
          resumeId: resumeData.id,
          fileContent: fileContent
        }
      });

      if (parseError) throw parseError;

      toast.success('Resume parsed successfully!');
      await fetchResume();
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  if (authLoading || loadingResume) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Your Resume</h1>
            <p className="text-muted-foreground text-lg">
              Upload your resume and let AI extract your skills and experience
            </p>
          </div>

          {/* Upload Section */}
          <Card className="border-dashed border-2">
            <CardContent className="py-12">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || parsing}
                />
                {uploading || parsing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                      {uploading ? 'Uploading...' : 'AI is parsing your resume...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-medium">
                        {resume ? 'Upload a new resume' : 'Click to upload your resume'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, DOC, DOCX, or TXT (max 5MB)
                      </p>
                    </div>
                    <Button variant="outline">Select File</Button>
                  </div>
                )}
              </label>
            </CardContent>
          </Card>

          {/* Parsed Resume Display */}
          {resume && resume.status === 'parsed' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle>{resume.title || 'Your Resume'}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <FileText className="h-4 w-4" />
                          {resume.file_name}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  {resume.summary && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Summary</h3>
                      <p className="text-muted-foreground">{resume.summary}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Experience</p>
                        <p className="font-semibold text-foreground">
                          {resume.experience_years || 0} years
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Education</p>
                        <p className="font-semibold text-foreground line-clamp-1">
                          {resume.education || 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p className="font-semibold text-foreground">
                          {resume.skills?.length || 0} identified
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {resume.skills && resume.skills.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {resume.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {resume.parsed_data?.experience && resume.parsed_data.experience.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Experience</h3>
                      <div className="space-y-4">
                        {resume.parsed_data.experience.map((exp, index) => (
                          <div key={index} className="p-4 rounded-lg border bg-card">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-foreground">{exp.position}</p>
                                <p className="text-sm text-muted-foreground">{exp.company}</p>
                              </div>
                              <Badge variant="outline">{exp.duration}</Badge>
                            </div>
                            {exp.description && (
                              <p className="text-sm text-muted-foreground">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pending Status */}
          {resume && resume.status === 'pending' && (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Your resume is being processed...
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
