import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  Loader2,
  LogOut,
  User,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  skills: string[];
  experience_years: number;
  education: string;
  summary: string;
  title: string;
  status: string;
  created_at: string;
}

interface MatchedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  skills_required: string[];
  match_score: number;
  matching_skills: string[];
}

export default function StudentDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (profile && profile.role === 'employer') {
      navigate('/employer-dashboard');
    }
  }, [user, profile, loading, navigate]);

  const fetchResume = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching resume:', error);
      return;
    }

    setResume(data);
    
    // If resume is parsed, fetch matching jobs
    if (data?.status === 'parsed' && data?.skills?.length > 0) {
      fetchMatchingJobs(data.skills);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchResume();
    }
  }, [user, fetchResume]);

  const fetchMatchingJobs = async (skills: string[]) => {
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-jobs', {
        body: { skills }
      });

      if (error) throw error;
      setMatchedJobs(data.jobs || []);
    } catch (error) {
      console.error('Error matching jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Create resume record
      const { data: resumeData, error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setResume(resumeData);
      toast.success('Resume uploaded successfully! Analyzing...');

      // Parse the resume with AI
      setIsParsing(true);
      
      // Read file content for AI parsing
      const fileContent = await readFileContent(file);
      
      const { error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { 
          resumeId: resumeData.id,
          fileContent 
        }
      });

      if (parseError) throw parseError;

      // Refresh resume data
      await fetchResume();
      toast.success('Resume analyzed successfully!');

    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // For PDF/DOC, we send the base64 content
        // The AI will extract text from it
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile?.full_name || 'Student'}</h1>
            <p className="text-muted-foreground">Upload your resume to find matching jobs</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Resume Upload Section */}
          <div className="lg:col-span-1">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Your Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume and let AI find matching jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!resume ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      ) : (
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                      )}
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF or DOC (max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{resume.file_name}</p>
                        <div className="flex items-center gap-2">
                          {resume.status === 'parsed' ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          ) : isParsing ? (
                            <Badge variant="secondary">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyzing...
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {resume.status === 'parsed' && (
                      <>
                        {resume.title && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Detected Role</p>
                            <p className="font-medium">{resume.title}</p>
                          </div>
                        )}
                        
                        {resume.experience_years > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Experience</p>
                            <p className="font-medium">{resume.experience_years} years</p>
                          </div>
                        )}

                        {resume.skills && resume.skills.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Skills Detected</p>
                            <div className="flex flex-wrap gap-1">
                              {resume.skills.slice(0, 8).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {resume.skills.length > 8 && (
                                <Badge variant="outline" className="text-xs">
                                  +{resume.skills.length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('resume-upload')?.click()}
                      disabled={isUploading || isParsing}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Resume
                    </Button>
                    <input
                      id="resume-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Matched Jobs Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Matching Jobs
              </h2>
              {resume?.status === 'parsed' && (
                <Button
                  variant="outline"
                  onClick={() => fetchMatchingJobs(resume.skills || [])}
                  disabled={isLoadingJobs}
                >
                  {isLoadingJobs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Refresh Matches
                </Button>
              )}
            </div>

            {!resume ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Resume Uploaded</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Upload your resume to see AI-matched job opportunities based on your skills
                  </p>
                </CardContent>
              </Card>
            ) : resume.status !== 'parsed' ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analyzing Your Resume</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Our AI is extracting your skills and experience to find the best job matches
                  </p>
                </CardContent>
              </Card>
            ) : isLoadingJobs ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50 animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : matchedJobs.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Matching Jobs Found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    We couldn't find jobs matching your skills. Check back later for new opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {matchedJobs.map((job) => (
                  <Card key={job.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{job.title}</h3>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Match</span>
                            <Badge 
                              variant={job.match_score >= 70 ? 'default' : job.match_score >= 40 ? 'secondary' : 'outline'}
                              className={job.match_score >= 70 ? 'bg-green-500' : ''}
                            >
                              {job.match_score}%
                            </Badge>
                          </div>
                          <Progress value={job.match_score} className="w-24 h-2" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.job_type}
                        </span>
                        {job.salary_min && job.salary_max && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {job.description}
                      </p>

                      {job.matching_skills && job.matching_skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-2">Matching Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {job.matching_skills.map((skill, i) => (
                              <Badge key={i} variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button className="w-full">Apply Now</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
