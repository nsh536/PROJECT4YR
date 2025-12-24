import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { JobSearchForm } from "@/components/JobSearchForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Filter, 
  X, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  skills_required: string[];
  created_at: string;
  matchScore?: number;
  matchingSkills?: string[];
}

interface Resume {
  id: string;
  title: string;
  skills: string[];
}

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Remote"];

const Jobs = () => {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingTo, setApplyingTo] = useState<Job | null>(null);
  const [userResume, setUserResume] = useState<Resume | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [showRecommended, setShowRecommended] = useState(true);

  useEffect(() => {
    fetchJobs();
    if (user) {
      fetchUserResume();
      fetchAppliedJobs();
    }
  }, [user]);

  // Calculate match scores when resume is loaded
  useEffect(() => {
    if (userResume?.skills?.length && jobs.length) {
      const jobsWithScores = jobs.map(job => {
        const { score, matchingSkills } = calculateMatchDetails(
          job.skills_required || [], 
          userResume.skills
        );
        return { ...job, matchScore: score, matchingSkills };
      });
      // Sort by match score for recommended view
      setJobs(jobsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
    }
  }, [userResume]);

  const calculateMatchDetails = (jobSkills: string[], resumeSkills: string[]): { score: number; matchingSkills: string[] } => {
    if (!jobSkills?.length || !resumeSkills?.length) return { score: 0, matchingSkills: [] };
    
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
    const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
    
    const matchingSkills = jobSkills.filter(skill => 
      resumeSkillsLower.some(rs => 
        rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs)
      )
    );
    
    const score = Math.round((matchingSkills.length / jobSkillsLower.length) * 100);
    return { score, matchingSkills };
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      // If we have resume skills, calculate match scores
      if (userResume?.skills?.length) {
        const jobsWithScores = (data || []).map(job => {
          const { score, matchingSkills } = calculateMatchDetails(
            job.skills_required || [], 
            userResume.skills
          );
          return { ...job, matchScore: score, matchingSkills };
        });
        setJobs(jobsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
      } else {
        setJobs(data || []);
      }
    }
    setIsLoading(false);
  };

  const fetchUserResume = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("resumes")
      .select("id, title, skills")
      .eq("user_id", user.id)
      .eq("status", "parsed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setUserResume(data);
  };

  const fetchAppliedJobs = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", user.id);

    setAppliedJobs(data?.map(a => a.job_id) || []);
  };

  const calculateMatchScore = (jobSkills: string[], resumeSkills: string[]): number => {
    if (!jobSkills?.length || !resumeSkills?.length) return 0;
    
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
    const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
    
    const matchingSkills = jobSkillsLower.filter(skill => 
      resumeSkillsLower.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    return Math.round((matchingSkills.length / jobSkillsLower.length) * 100);
  };

  const handleApply = async () => {
    if (!user || !applyingTo || !userResume) return;
    
    setIsApplying(true);
    
    try {
      const matchScore = calculateMatchScore(
        applyingTo.skills_required || [], 
        userResume.skills || []
      );

      // Create application
      const { error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          job_id: applyingTo.id,
          resume_id: userResume.id,
          match_score: matchScore,
          status: "pending"
        });

      if (appError) throw appError;

      // Send notification to employer
      const { error: notifyError } = await supabase.functions.invoke("notify-employer", {
        body: {
          jobId: applyingTo.id,
          applicantName: profile?.full_name || user.email,
          applicantEmail: user.email,
          resumeTitle: userResume.title || "Resume",
          matchScore
        }
      });

      if (notifyError) {
        console.error("Notification error:", notifyError);
        // Don't fail the application if notification fails
      }

      toast.success("Application submitted! The employer has been notified.");
      setAppliedJobs([...appliedJobs, applyingTo.id]);
      setApplyingTo(null);
    } catch (error: any) {
      console.error("Application error:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesType = selectedType === "All" || job.job_type === selectedType;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.skills_required || []).some(skill => 
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesType && matchesSearch;
  });

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-10 px-4 gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Find Your <span className="gradient-text">Perfect Job</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse opportunities from top companies worldwide
            </p>
          </div>
          
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <JobSearchForm onSearch={(q) => setSearchQuery(q)} />
          </div>
        </div>
      </section>

      {/* Personalized Recommendations Banner */}
      {userResume && profile?.role === 'student' && (
        <section className="py-6 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Personalized for You</h2>
                  <p className="text-sm text-muted-foreground">
                    Jobs matched to your resume skills ({userResume.skills?.length || 0} skills detected)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={showRecommended ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowRecommended(true)}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Best Matches
                </Button>
                <Button 
                  variant={!showRecommended ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowRecommended(false)}
                >
                  All Jobs
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters & Results */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
            {jobTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
            {(selectedType !== "All" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedType("All"); setSearchQuery(""); }}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {userResume && showRecommended ? (
                <>Showing <span className="font-semibold text-foreground">{filteredJobs.filter(j => (j.matchScore || 0) > 0).length}</span> matching jobs</>
              ) : (
                <>Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> jobs</>
              )}
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Job Listings */}
              <div className="grid lg:grid-cols-2 gap-6">
                {(userResume && showRecommended 
                  ? filteredJobs.filter(j => (j.matchScore || 0) > 0)
                  : filteredJobs
                ).map((job, index) => (
                  <Card 
                    key={job.id} 
                    className={`border-border/50 hover:shadow-lg transition-all animate-fade-up relative ${
                      job.matchScore && job.matchScore >= 70 ? 'ring-2 ring-green-500/30' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Match Score Badge */}
                    {userResume && job.matchScore !== undefined && job.matchScore > 0 && (
                      <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ${
                        job.matchScore >= 70 ? 'bg-green-500 text-white' :
                        job.matchScore >= 40 ? 'bg-yellow-500 text-white' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        <Star className="h-3 w-3" />
                        {job.matchScore}% Match
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{job.title}</h3>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <Badge variant="secondary">{job.job_type}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        {formatSalary(job.salary_min, job.salary_max) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formatSalary(job.salary_min, job.salary_max)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {getTimeAgo(job.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {job.description}
                      </p>

                      {/* Skills with match highlighting */}
                      {job.skills_required && job.skills_required.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <div className="flex flex-wrap gap-1">
                            {job.skills_required.slice(0, 6).map((skill, i) => {
                              const isMatching = job.matchingSkills?.includes(skill);
                              return (
                                <Badge 
                                  key={i} 
                                  variant={isMatching ? "default" : "outline"} 
                                  className={`text-xs ${isMatching ? 'bg-green-500/80 hover:bg-green-500' : ''}`}
                                >
                                  {isMatching && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {skill}
                                </Badge>
                              );
                            })}
                            {job.skills_required.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.skills_required.length - 6}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Match progress bar */}
                          {userResume && job.matchScore !== undefined && job.matchScore > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Skill Match</span>
                                <span className="font-medium">{job.matchingSkills?.length || 0}/{job.skills_required.length} skills</span>
                              </div>
                              <Progress 
                                value={job.matchScore} 
                                className="h-1.5"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {appliedJobs.includes(job.id) ? (
                          <Button variant="outline" className="flex-1" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            Applied
                          </Button>
                        ) : (
                          <Button 
                            className="flex-1"
                            onClick={() => setApplyingTo(job)}
                            disabled={!user || profile?.role === 'employer'}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {!user ? "Sign in to Apply" : profile?.role === 'employer' ? "Employers can't apply" : "Apply Now"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2">No jobs found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or check back later</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Apply Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={() => setApplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {applyingTo?.title}</DialogTitle>
            <DialogDescription>
              at {applyingTo?.company}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {userResume ? (
              <>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Your Resume</p>
                  <p className="text-muted-foreground">{userResume.title || "Uploaded Resume"}</p>
                  {userResume.skills && userResume.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userResume.skills.slice(0, 6).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleApply} className="w-full" disabled={isApplying}>
                  {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Application
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  You need to upload a resume before applying to jobs.
                </p>
                <Button variant="outline" onClick={() => setApplyingTo(null)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Jobs;
