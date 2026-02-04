import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, Briefcase, GraduationCap, Clock, MapPin, Building2, TrendingUp, CloudUpload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { HelpButton } from '@/components/HelpButton';

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

interface MatchedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string[];
  match_score: number;
  matching_skills: string[];
}

export default function ResumeUpload() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && profile?.role === 'employer') {
      navigate('/');
      toast.error('Only students can upload resumes');
    } else if (!authLoading && user) {
      fetchResume();
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (resume && resume.status === 'parsed' && resume.skills?.length > 0) {
      fetchMatchingJobs(resume.skills);
    }
  }, [resume]);

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

  const fetchMatchingJobs = async (skills: string[]) => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-jobs', {
        body: { skills }
      });

      if (error) throw error;
      
      if (data?.jobs) {
        // Filter to only show jobs with some match
        const relevantJobs = data.jobs.filter((job: MatchedJob) => job.match_score > 0);
        setMatchedJobs(relevantJobs.slice(0, 6)); // Show top 6 matches
      }
    } catch (error) {
      console.error('Error fetching matching jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, DOCX, or TXT file');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return false;
    }
    return true;
  };

  const processFile = useCallback(async (file: File) => {
    if (!user) return;

    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

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

      let fileContent = '';
      try {
        fileContent = await file.text();
      } catch (e) {
        console.log('Could not read file as text, will use URL parsing');
      }

      const { error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: {
          resumeId: resumeData.id,
          fileContent: fileContent,
          fileName: file.name,
          fileUrl: publicUrl
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
  }, [user]);

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    await processFile(selectedFile);
    setSelectedFile(null);
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'text/plain': 'Text File'
    };
    return typeMap[type] || 'Document';
  };

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

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

          {/* Upload Section with Drag & Drop */}
          <Card 
            className={`border-dashed border-2 transition-all duration-300 ${
              isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02] shadow-glow' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CardContent className="py-12">
              {uploading || parsing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    {uploading ? 'Uploading...' : 'AI is parsing your resume...'}
                  </p>
                </div>
              ) : selectedFile ? (
                // File Preview State
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary/20">
                    <File className="h-12 w-12 text-primary" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-foreground font-semibold text-lg">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary">{getFileTypeLabel(selectedFile.type)}</Badge>
                      <span>•</span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleCancelUpload}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      variant="gradient" 
                      onClick={handleConfirmUpload}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload & Parse
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Click "Upload & Parse" to start AI-powered resume analysis
                  </p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isDragging ? (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <div className="p-6 rounded-full gradient-bg shadow-glow animate-pulse">
                        <CloudUpload className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-primary font-semibold text-lg">
                          Drop your resume here!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Release to preview
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-foreground font-medium">
                          {resume ? 'Upload a new resume' : 'Drag & drop your resume here'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or click to browse • PDF, DOC, DOCX, TXT (max 5MB)
                        </p>
                      </div>
                      <Button variant="outline">Select File</Button>
                    </div>
                  )}
                </label>
              )}
            </CardContent>
          </Card>

          {/* Parsed Resume Display */}
          {resume && resume.status === 'parsed' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <CheckCircle className="h-5 w-5 text-accent" />
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

          {/* Matching Jobs Section */}
          {resume && resume.status === 'parsed' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Jobs Matching Your Profile
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Based on your skills and experience
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/jobs">View All Jobs</Link>
                </Button>
              </div>

              {loadingJobs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : matchedJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {job.company}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className={`text-lg font-bold ${
                                job.match_score >= 70 ? 'text-green-500' :
                                job.match_score >= 40 ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}>
                                {job.match_score}%
                              </span>
                              <span className="text-xs text-muted-foreground">match</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {job.job_type}
                          </span>
                          {job.salary_min && job.salary_max && (
                            <span>
                              ₹{(job.salary_min / 100000).toFixed(1)}L - ₹{(job.salary_max / 100000).toFixed(1)}L
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Skill Match</span>
                            <span className="font-medium">{job.matching_skills.length}/{job.skills_required.length} skills</span>
                          </div>
                          <Progress value={job.match_score} className="h-2" />
                        </div>

                        {job.matching_skills.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Matching skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {job.matching_skills.slice(0, 4).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {job.matching_skills.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{job.matching_skills.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <Button className="w-full" size="sm" asChild>
                          <Link to="/jobs">View Job</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No matching jobs found. Check back later for new opportunities!
                    </p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/jobs">Browse All Jobs</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
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
      <HelpButton />
    </div>
  );
}
