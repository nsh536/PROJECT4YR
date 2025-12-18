import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Users, 
  Briefcase, 
  MapPin, 
  Mail,
  Phone,
  GraduationCap,
  Clock,
  Loader2,
  LogOut,
  FileText,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  requirements: string[];
  skills_required: string[];
  is_active: boolean;
  created_at: string;
}

interface Candidate {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  experience_years: number;
  education: string;
  match_score: number;
  matching_skills: string[];
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
  };
}

export default function EmployerDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('candidates');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  
  // Search form state
  const [searchPosition, setSearchPosition] = useState('');
  const [searchSkills, setSearchSkills] = useState('');

  // Post job form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [jobSalaryMin, setJobSalaryMin] = useState('');
  const [jobSalaryMax, setJobSalaryMax] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobSkills, setJobSkills] = useState('');
  const [jobRequirements, setJobRequirements] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (profile && profile.role === 'student') {
      navigate('/student-dashboard');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user && profile?.role === 'employer') {
      fetchJobs();
    }
  }, [user, profile]);

  const fetchJobs = async () => {
    if (!user) return;
    setIsLoadingJobs(true);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data || []);
    }
    setIsLoadingJobs(false);
  };

  const handleSearchCandidates = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchPosition.trim() && !searchSkills.trim()) {
      toast.error('Please enter a position or skills to search');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-candidates', {
        body: { 
          position: searchPosition,
          requiredSkills: searchSkills.split(',').map(s => s.trim()).filter(Boolean)
        }
      });

      if (error) throw error;
      setCandidates(data.candidates || []);
      
      if (data.candidates?.length === 0) {
        toast.info('No matching candidates found');
      } else {
        toast.success(`Found ${data.candidates.length} matching candidates`);
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
      toast.error('Failed to search candidates');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobTitle.trim() || !jobLocation.trim() || !jobDescription.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .insert({
          employer_id: user!.id,
          title: jobTitle,
          company: profile?.company_name || 'Company',
          location: jobLocation,
          job_type: jobType,
          salary_min: jobSalaryMin ? parseInt(jobSalaryMin) : null,
          salary_max: jobSalaryMax ? parseInt(jobSalaryMax) : null,
          description: jobDescription,
          skills_required: jobSkills.split(',').map(s => s.trim()).filter(Boolean),
          requirements: jobRequirements.split('\n').map(r => r.trim()).filter(Boolean)
        });

      if (error) throw error;

      toast.success('Job posted successfully!');
      setShowPostDialog(false);
      fetchJobs();
      
      // Reset form
      setJobTitle('');
      setJobLocation('');
      setJobType('Full-time');
      setJobSalaryMin('');
      setJobSalaryMax('');
      setJobDescription('');
      setJobSkills('');
      setJobRequirements('');
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    } finally {
      setIsPosting(false);
    }
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              {profile?.company_name || 'Employer Dashboard'}
            </h1>
            <p className="text-muted-foreground">Find the perfect candidates for your positions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Post a New Job</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePostJob} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-title">Job Title *</Label>
                      <Input
                        id="job-title"
                        placeholder="e.g. Senior React Developer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-location">Location *</Label>
                      <Input
                        id="job-location"
                        placeholder="e.g. San Francisco, CA or Remote"
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-type">Job Type</Label>
                      <Select value={jobType} onValueChange={setJobType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary-min">Min Salary ($)</Label>
                      <Input
                        id="salary-min"
                        type="number"
                        placeholder="80000"
                        value={jobSalaryMin}
                        onChange={(e) => setJobSalaryMin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary-max">Max Salary ($)</Label>
                      <Input
                        id="salary-max"
                        type="number"
                        placeholder="120000"
                        value={jobSalaryMax}
                        onChange={(e) => setJobSalaryMax(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job-skills">Required Skills (comma-separated)</Label>
                    <Input
                      id="job-skills"
                      placeholder="e.g. React, TypeScript, Node.js, AWS"
                      value={jobSkills}
                      onChange={(e) => setJobSkills(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description *</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Describe the role, responsibilities, and what makes it great..."
                      rows={4}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job-requirements">Requirements (one per line)</Label>
                    <Textarea
                      id="job-requirements"
                      placeholder="5+ years of experience&#10;Bachelor's degree in CS&#10;Strong communication skills"
                      rows={3}
                      value={jobRequirements}
                      onChange={(e) => setJobRequirements(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isPosting}>
                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Post Job
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="candidates" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Search Candidates
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              My Job Postings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidates">
            {/* Search Form */}
            <Card className="border-border/50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Find Candidates
                </CardTitle>
                <CardDescription>
                  Enter a position or skills to find matching candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchCandidates} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search-position" className="sr-only">Position</Label>
                    <Input
                      id="search-position"
                      placeholder="Position (e.g. Frontend Developer)"
                      value={searchPosition}
                      onChange={(e) => setSearchPosition(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="search-skills" className="sr-only">Skills</Label>
                    <Input
                      id="search-skills"
                      placeholder="Skills (comma-separated: React, TypeScript)"
                      value={searchSkills}
                      onChange={(e) => setSearchSkills(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Candidates Results */}
            {candidates.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Search for Candidates</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Enter a position or skills above to find matching candidates from our database
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {candidates.map((candidate) => (
                  <Card key={candidate.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{candidate.profiles?.full_name || 'Anonymous'}</h3>
                          <p className="text-primary font-medium">{candidate.title || 'Professional'}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Match</span>
                            <Badge 
                              variant={candidate.match_score >= 70 ? 'default' : candidate.match_score >= 40 ? 'secondary' : 'outline'}
                              className={candidate.match_score >= 70 ? 'bg-green-500' : ''}
                            >
                              {candidate.match_score}%
                            </Badge>
                          </div>
                          <Progress value={candidate.match_score} className="w-24 h-2" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        {candidate.profiles?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {candidate.profiles.location}
                          </span>
                        )}
                        {candidate.experience_years > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {candidate.experience_years} years exp.
                          </span>
                        )}
                        {candidate.education && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4" />
                            {candidate.education}
                          </span>
                        )}
                      </div>

                      {candidate.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {candidate.summary}
                        </p>
                      )}

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 6).map((skill, i) => (
                              <Badge 
                                key={i} 
                                variant={candidate.matching_skills?.includes(skill.toLowerCase()) ? 'default' : 'secondary'}
                                className={candidate.matching_skills?.includes(skill.toLowerCase()) ? 'bg-primary/20 text-primary border-primary/30' : ''}
                              >
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 6 && (
                              <Badge variant="outline">+{candidate.skills.length - 6} more</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {candidate.profiles?.email && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${candidate.profiles.email}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </a>
                          </Button>
                        )}
                        <Button size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs">
            {isLoadingJobs ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Jobs Posted Yet</h3>
                  <p className="text-muted-foreground text-center max-w-sm mb-4">
                    Post your first job to start receiving applications from qualified candidates
                  </p>
                  <Button onClick={() => setShowPostDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            <Badge variant={job.is_active ? 'default' : 'secondary'}>
                              {job.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Posted {new Date(job.created_at).toLocaleDateString()}
                        </p>
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
                          <span>
                            ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {job.skills_required && job.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skills_required.map((skill, i) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
