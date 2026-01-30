import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { JobSearchForm } from "@/components/JobSearchForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Filter, 
  X, 
  MapPin, 
  Briefcase, 
  IndianRupee, 
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Star,
  Brain,
  GraduationCap,
  Lightbulb,
  Target,
  Home,
  Timer,
  FileText,
  Building,
  User,
  Users,
  Crown,
  Award,
  Bookmark,
  BookmarkCheck,
  Search,
  ClipboardList,
  FolderHeart,
  Eye,
  UserCheck,
  XCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  experience_min: number | null;
  description: string;
  skills_required: string[];
  created_at: string;
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  skillMatch?: number;
  experienceMatch?: number;
  educationMatch?: number;
  careerTrajectory?: number;
  recommendation?: string;
  growthPotential?: string;
  aiPowered?: boolean;
}

interface Resume {
  id: string;
  title: string;
  skills: string[];
  experience_years?: number;
  education?: string;
  summary?: string;
}

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Remote"];
const experienceLevels = ["All", "Entry", "Mid", "Senior", "Lead"];

// Job type configuration with icons and colors
const jobTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>, className: string }> = {
  "Remote": { 
    icon: Home, 
    className: "bg-[hsl(var(--job-remote))] text-[hsl(var(--job-remote-foreground))] border-transparent hover:bg-[hsl(var(--job-remote))]/90" 
  },
  "Part-time": { 
    icon: Timer, 
    className: "bg-[hsl(var(--job-parttime))] text-[hsl(var(--job-parttime-foreground))] border-transparent hover:bg-[hsl(var(--job-parttime))]/90" 
  },
  "Contract": { 
    icon: FileText, 
    className: "bg-[hsl(var(--job-contract))] text-[hsl(var(--job-contract-foreground))] border-transparent hover:bg-[hsl(var(--job-contract))]/90" 
  },
  "Full-time": { 
    icon: Building, 
    className: "bg-[hsl(var(--job-fulltime))] text-[hsl(var(--job-fulltime-foreground))] border-transparent hover:bg-[hsl(var(--job-fulltime))]/90" 
  },
};

// Experience level configuration with icons and colors
const experienceLevelConfig: Record<string, { icon: React.ComponentType<{ className?: string }>, className: string, minYears: number, maxYears: number }> = {
  "Entry": { 
    icon: User, 
    className: "bg-[hsl(var(--exp-entry))] text-[hsl(var(--exp-entry-foreground))] border-transparent hover:bg-[hsl(var(--exp-entry))]/90",
    minYears: 0,
    maxYears: 2
  },
  "Mid": { 
    icon: Users, 
    className: "bg-[hsl(var(--exp-mid))] text-[hsl(var(--exp-mid-foreground))] border-transparent hover:bg-[hsl(var(--exp-mid))]/90",
    minYears: 2,
    maxYears: 5
  },
  "Senior": { 
    icon: Award, 
    className: "bg-[hsl(var(--exp-senior))] text-[hsl(var(--exp-senior-foreground))] border-transparent hover:bg-[hsl(var(--exp-senior))]/90",
    minYears: 5,
    maxYears: 10
  },
  "Lead": { 
    icon: Crown, 
    className: "bg-[hsl(var(--exp-lead))] text-[hsl(var(--exp-lead-foreground))] border-transparent hover:bg-[hsl(var(--exp-lead))]/90",
    minYears: 10,
    maxYears: Infinity
  },
};

// Helper to determine experience level from years
const getExperienceLevel = (experienceMin: number | null): string => {
  const years = experienceMin || 0;
  if (years >= 10) return "Lead";
  if (years >= 5) return "Senior";
  if (years >= 2) return "Mid";
  return "Entry";
};

const MAX_SALARY = 300000;

const Jobs = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [applyingTo, setApplyingTo] = useState<Job | null>(null);
  const [userResume, setUserResume] = useState<Resume | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [showRecommended, setShowRecommended] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, MAX_SALARY]);
  const [selectedExperience, setSelectedExperience] = useState("All");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [savingJob, setSavingJob] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState(searchParams.get("location") || "");
  const [viewMode, setViewMode] = useState<"all" | "saved" | "applied">("all");
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, string>>({});

  // Extract unique locations from jobs
  const uniqueLocations = [...new Set(jobs.map(job => job.location))].filter(Boolean).sort();

  useEffect(() => {
    fetchJobs();
    if (user) {
      fetchUserResume();
      fetchAppliedJobs();
      fetchSavedJobs();
    }
  }, [user]);

  // Fetch AI-powered job matches when resume is loaded
  useEffect(() => {
    if (userResume?.skills?.length && jobs.length && !aiPowered) {
      fetchAIMatches();
    }
  }, [userResume, jobs.length]);

  const fetchAIMatches = async () => {
    if (!userResume || isLoadingAI) return;
    
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-jobs', {
        body: {
          resumeId: userResume.id,
          skills: userResume.skills,
          experience_years: userResume.experience_years || 0,
          education: userResume.education || '',
          summary: userResume.summary || '',
          title: userResume.title || ''
        }
      });

      if (error) {
        console.error('AI matching error:', error);
        // Fall back to basic matching
        applyBasicMatching();
        return;
      }

      if (data?.jobs) {
        const enrichedJobs = data.jobs.map((job: any) => ({
          ...job,
          matchScore: job.match_score,
          matchingSkills: job.matching_skills,
          missingSkills: job.missing_skills,
          skillMatch: job.skill_match,
          experienceMatch: job.experience_match,
          educationMatch: job.education_match,
          careerTrajectory: job.career_trajectory,
          recommendation: job.recommendation,
          growthPotential: job.growth_potential,
          aiPowered: data.ai_powered
        }));
        setJobs(enrichedJobs);
        setAiPowered(data.ai_powered);
        
        if (data.ai_powered) {
          toast.success("AI-powered recommendations ready!", {
            description: "Jobs ranked by skill, experience & career fit"
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI matches:', err);
      applyBasicMatching();
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyBasicMatching = () => {
    if (!userResume?.skills?.length) return;
    
    const jobsWithScores = jobs.map(job => {
      const { score, matchingSkills } = calculateMatchDetails(
        job.skills_required || [], 
        userResume.skills
      );
      return { ...job, matchScore: score, matchingSkills };
    });
    setJobs(jobsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
  };

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
      .select("id, title, skills, experience_years, education, summary")
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
      .select("job_id, status")
      .eq("user_id", user.id);

    setAppliedJobs(data?.map(a => a.job_id) || []);
    
    // Build status map
    const statusMap: Record<string, string> = {};
    data?.forEach(a => {
      statusMap[a.job_id] = a.status || 'pending';
    });
    setApplicationStatuses(statusMap);
  };

  const fetchSavedJobs = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id);

    setSavedJobs(data?.map(s => s.job_id) || []);
  };

  const toggleSaveJob = async (jobId: string) => {
    if (!user) {
      toast.error("Please sign in to save jobs");
      return;
    }

    setSavingJob(jobId);
    const isSaved = savedJobs.includes(jobId);

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        if (error) throw error;
        setSavedJobs(savedJobs.filter(id => id !== jobId));
        toast.success("Job removed from saved");
      } else {
        const { error } = await supabase
          .from("saved_jobs")
          .insert({ user_id: user.id, job_id: jobId });

        if (error) throw error;
        setSavedJobs([...savedJobs, jobId]);
        toast.success("Job saved for later");
      }
    } catch (error: any) {
      console.error("Save job error:", error);
      toast.error(error.message || "Failed to save job");
    } finally {
      setSavingJob(null);
    }
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
        console.error("Employer notification error:", notifyError);
      }

      // Send confirmation email to applicant
      const { error: applicantNotifyError } = await supabase.functions.invoke("notify-applicant", {
        body: {
          applicantName: profile?.full_name || user.email?.split('@')[0],
          applicantEmail: user.email,
          jobTitle: applyingTo.title,
          company: applyingTo.company,
          matchScore
        }
      });

      if (applicantNotifyError) {
        console.error("Applicant notification error:", applicantNotifyError);
      }

      toast.success("Application submitted! Check your email for confirmation.");
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
    
    // Salary filter
    const jobMinSalary = job.salary_min || 0;
    const jobMaxSalary = job.salary_max || MAX_SALARY;
    const matchesSalary = 
      (salaryRange[0] === 0 && salaryRange[1] === MAX_SALARY) || // No filter applied
      (jobMinSalary <= salaryRange[1] && jobMaxSalary >= salaryRange[0]);
    
    // Experience level filter
    const jobExpLevel = getExperienceLevel(job.experience_min);
    const matchesExperience = selectedExperience === "All" || jobExpLevel === selectedExperience;
    
    // Location filter
    const matchesLocation = !locationSearch || 
      job.location.toLowerCase().includes(locationSearch.toLowerCase());
    
    return matchesType && matchesSearch && matchesSalary && matchesExperience && matchesLocation;
  });

  // Filter based on view mode
  const displayedJobs = viewMode === "saved" 
    ? filteredJobs.filter(job => savedJobs.includes(job.id))
    : viewMode === "applied"
    ? filteredJobs.filter(job => appliedJobs.includes(job.id))
    : filteredJobs;

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const formatAmount = (amount: number) => `₹${(amount / 100000).toFixed(1)}L`;
    if (min && max) return `${formatAmount(min)} - ${formatAmount(max)}`;
    if (min) return `From ${formatAmount(min)}`;
    return `Up to ${formatAmount(max!)}`;
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

  // Application status configuration
  const applicationStatusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
    },
    reviewed: {
      label: "Reviewed",
      icon: Eye,
      className: "bg-blue-500/20 text-blue-600 border-blue-500/30"
    },
    interview: {
      label: "Interview",
      icon: UserCheck,
      className: "bg-green-500/20 text-green-600 border-green-500/30"
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      className: "bg-red-500/20 text-red-600 border-red-500/30"
    }
  };

  const getApplicationStatus = (jobId: string) => {
    const status = applicationStatuses[jobId] || 'pending';
    return applicationStatusConfig[status] || applicationStatusConfig.pending;
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

      {/* AI-Powered Suggested Jobs Section */}
      {!searchQuery && !locationSearch && selectedType === "All" && selectedExperience === "All" && salaryRange[0] === 0 && salaryRange[1] === MAX_SALARY && viewMode === "all" && jobs.length > 0 && (
        <section className="py-8 px-4 bg-gradient-to-b from-primary/5 to-transparent border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${userResume && aiPowered ? 'bg-gradient-to-br from-primary/30 to-purple-500/30' : 'bg-primary/20'}`}>
                  {userResume && aiPowered ? <Brain className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">
                      {userResume ? 'Top Matches for You' : 'Suggested Jobs'}
                    </h2>
                    {userResume && aiPowered && (
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/20 to-purple-500/20">
                        <Brain className="h-3 w-3 mr-1" />
                        AI Powered
                      </Badge>
                    )}
                    {isLoadingAI && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userResume 
                      ? aiPowered 
                        ? 'Matched based on your skills, experience & career goals'
                        : `Based on ${userResume.skills?.length || 0} skills from your resume`
                      : 'Popular jobs you might be interested in'
                    }
                  </p>
                </div>
              </div>
              {!userResume && user && (
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/resume'}>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Resume for Personalized Matches
                </Button>
              )}
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {(userResume 
                ? jobs.filter(j => (j.matchScore || 0) > 0).slice(0, 3) 
                : jobs.slice(0, 3)
              ).map((job, index) => {
                const expLevel = getExperienceLevel(job.experience_min);
                const expConfig = experienceLevelConfig[expLevel];
                const typeConfig = jobTypeConfig[job.job_type];
                const TypeIcon = typeConfig?.icon;
                const isSaved = savedJobs.includes(job.id);
                const isApplied = appliedJobs.includes(job.id);
                const hasAIData = userResume && (job.matchScore !== undefined);
                
                return (
                  <Card 
                    key={`suggested-${job.id}`}
                    className="group relative overflow-hidden border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => !isApplied && setApplyingTo(job)}
                  >
                    {/* Match score indicator for AI matches */}
                    {hasAIData && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary/50" />
                    )}
                    {!hasAIData && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                    )}
                    
                    {/* Ranking badge for top matches */}
                    {hasAIData && index < 3 && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground border-0 shadow-md">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          #{index + 1} Match
                        </Badge>
                      </div>
                    )}
                    
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-16">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                            {job.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 -mt-1 absolute top-12 right-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveJob(job.id);
                          }}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* AI Match Score with breakdown */}
                      {hasAIData && job.matchScore !== undefined && (
                        <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Match Score</span>
                            <span className="text-lg font-bold text-primary">{job.matchScore}%</span>
                          </div>
                          <Progress value={job.matchScore} className="h-2 mb-2" />
                          
                          {/* Skill match details */}
                          {job.matchingSkills && job.matchingSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {job.matchingSkills.slice(0, 3).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  {skill}
                                </Badge>
                              ))}
                              {job.matchingSkills.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{job.matchingSkills.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* AI recommendation */}
                          {job.recommendation && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                              <Lightbulb className="h-3 w-3 inline mr-1 text-yellow-500" />
                              {job.recommendation}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {job.location}
                        </Badge>
                        {typeConfig && (
                          <Badge className={`text-xs ${typeConfig.className}`}>
                            {TypeIcon && <TypeIcon className="h-3 w-3 mr-1" />}
                            {job.job_type}
                          </Badge>
                        )}
                      </div>
                      
                      {formatSalary(job.salary_min, job.salary_max) && (
                        <p className="text-sm font-medium text-primary">
                          {formatSalary(job.salary_min, job.salary_max)}
                        </p>
                      )}
                      
                      {isApplied && (
                        <Badge className="mt-3 bg-green-500/20 text-green-600 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Empty state for no matches */}
            {userResume && jobs.filter(j => (j.matchScore || 0) > 0).length === 0 && !isLoadingAI && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Analyzing your resume to find the best matches...</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Personalized Recommendations Banner */}
      {userResume && profile?.role === 'student' && (
        <section className="py-6 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${aiPowered ? 'bg-gradient-to-br from-primary/30 to-purple-500/30' : 'bg-primary/20'}`}>
                  {aiPowered ? <Brain className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">
                      {aiPowered ? 'AI-Powered Recommendations' : 'Personalized for You'}
                    </h2>
                    {aiPowered && (
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/20 to-purple-500/20">
                        <Brain className="h-3 w-3 mr-1" />
                        Smart Match
                      </Badge>
                    )}
                    {isLoadingAI && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {aiPowered 
                      ? 'Analyzing skills, experience, education & career trajectory'
                      : `Jobs matched to your resume skills (${userResume.skills?.length || 0} skills detected)`
                    }
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

      {/* View Mode Tabs */}
      {user && profile?.role === 'student' && (
        <section className="py-4 px-4 border-b bg-muted/20">
          <div className="container mx-auto max-w-6xl">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "saved" | "applied")}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  All Jobs
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex items-center gap-2">
                  <FolderHeart className="h-4 w-4" />
                  Saved
                  {savedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs">
                      {savedJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applied" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Applied
                  {appliedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs">
                      {appliedJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>
      )}

      {/* Filters & Results */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Filters */}
          <div className="space-y-4 mb-8">
            {/* Job Type Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground mr-2">Type:</span>
              {jobTypes.map((type) => {
                const config = jobTypeConfig[type];
                const TypeIcon = config?.icon;
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className={selectedType === type && config ? config.className : ""}
                  >
                    {TypeIcon && <TypeIcon className="h-4 w-4 mr-1" />}
                    {type}
                  </Button>
                );
              })}
            {(selectedType !== "All" || searchQuery || salaryRange[0] > 0 || salaryRange[1] < MAX_SALARY || selectedExperience !== "All" || locationSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { 
                    setSelectedType("All"); 
                    setSearchQuery(""); 
                    setSalaryRange([0, MAX_SALARY]);
                    setSelectedExperience("All");
                    setLocationSearch("");
                  }}
                  className="text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Experience Level Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground mr-2">Experience:</span>
              {experienceLevels.map((level) => {
                const config = experienceLevelConfig[level];
                const LevelIcon = config?.icon;
                return (
                  <Button
                    key={level}
                    variant={selectedExperience === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedExperience(level)}
                    className={selectedExperience === level && config ? config.className : ""}
                  >
                    {LevelIcon && <LevelIcon className="h-4 w-4 mr-1" />}
                    {level}
                  </Button>
                );
              })}
            </div>

            {/* Location Filter */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Location:</span>
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search city or region..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-9 bg-background"
                  list="location-suggestions"
                />
                <datalist id="location-suggestions">
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
              </div>
              {locationSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocationSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Salary Range Filter */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Salary Range:</span>
              <div className="flex-1 max-w-md">
                <Slider
                  value={salaryRange}
                  onValueChange={(value) => setSalaryRange(value as [number, number])}
                  min={0}
                  max={MAX_SALARY}
                  step={5000}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  ${salaryRange[0].toLocaleString()}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className="font-medium text-foreground">
                  ${salaryRange[1].toLocaleString()}{salaryRange[1] === MAX_SALARY && "+"}
                </span>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {viewMode === "saved" ? (
                <>Showing <span className="font-semibold text-foreground">{displayedJobs.length}</span> saved jobs</>
              ) : viewMode === "applied" ? (
                <>Showing <span className="font-semibold text-foreground">{displayedJobs.length}</span> applied jobs</>
              ) : userResume && showRecommended ? (
                <>Showing <span className="font-semibold text-foreground">{displayedJobs.filter(j => (j.matchScore || 0) > 0).length}</span> matching jobs</>
              ) : (
                <>Showing <span className="font-semibold text-foreground">{displayedJobs.length}</span> jobs</>
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
              {/* Empty State for Saved/Applied */}
              {displayedJobs.length === 0 && (viewMode === "saved" || viewMode === "applied") ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  {viewMode === "saved" ? (
                    <>
                      <FolderHeart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
                      <p className="text-muted-foreground max-w-md">
                        Click the bookmark icon on any job to save it for later review.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setViewMode("all")}
                      >
                        Browse Jobs
                      </Button>
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                      <p className="text-muted-foreground max-w-md">
                        Start applying to jobs that match your skills and experience.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setViewMode("all")}
                      >
                        Browse Jobs
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Job Listings */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {(userResume && showRecommended && viewMode === "all"
                      ? displayedJobs.filter(j => (j.matchScore || 0) > 0)
                      : displayedJobs
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
                        <div className="flex flex-col gap-1.5 items-end">
                          {(() => {
                            const config = jobTypeConfig[job.job_type];
                            const TypeIcon = config?.icon;
                            return (
                              <Badge 
                                className={config ? config.className : "bg-secondary text-secondary-foreground"}
                              >
                                {TypeIcon && <TypeIcon className="h-3 w-3 mr-1" />}
                                {job.job_type}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            const expLevel = getExperienceLevel(job.experience_min);
                            const config = experienceLevelConfig[expLevel];
                            const LevelIcon = config?.icon;
                            return (
                              <Badge 
                                variant="outline"
                                className={config ? config.className : "bg-secondary text-secondary-foreground"}
                              >
                                {LevelIcon && <LevelIcon className="h-3 w-3 mr-1" />}
                                {expLevel}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        {formatSalary(job.salary_min, job.salary_max) && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
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
                          
                          {/* AI-Powered Match Breakdown */}
                          {userResume && job.matchScore !== undefined && job.matchScore > 0 && (
                            <TooltipProvider>
                              <div className="space-y-2">
                                {/* Overall Progress */}
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    {job.aiPowered && <Brain className="h-3 w-3" />}
                                    Overall Match
                                  </span>
                                  <span className="font-medium">{job.matchScore}%</span>
                                </div>
                                <Progress 
                                  value={job.matchScore} 
                                  className="h-1.5"
                                />

                                {/* Detailed AI Breakdown */}
                                {job.aiPowered && job.skillMatch !== undefined && (
                                  <div className="grid grid-cols-4 gap-1 pt-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-center cursor-help">
                                          <div className="text-xs text-muted-foreground mb-1">
                                            <Target className="h-3 w-3 mx-auto" />
                                          </div>
                                          <div className={`text-xs font-bold ${job.skillMatch >= 70 ? 'text-green-500' : job.skillMatch >= 40 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                            {job.skillMatch}%
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">Skills</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">Skill Match: {job.skillMatch}%</p>
                                        <p className="text-xs text-muted-foreground">How your skills align with requirements</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-center cursor-help">
                                          <div className="text-xs text-muted-foreground mb-1">
                                            <Briefcase className="h-3 w-3 mx-auto" />
                                          </div>
                                          <div className={`text-xs font-bold ${job.experienceMatch && job.experienceMatch >= 70 ? 'text-green-500' : job.experienceMatch && job.experienceMatch >= 40 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                            {job.experienceMatch}%
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">Experience</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">Experience Match: {job.experienceMatch}%</p>
                                        <p className="text-xs text-muted-foreground">Your experience level vs. requirements</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-center cursor-help">
                                          <div className="text-xs text-muted-foreground mb-1">
                                            <GraduationCap className="h-3 w-3 mx-auto" />
                                          </div>
                                          <div className={`text-xs font-bold ${job.educationMatch && job.educationMatch >= 70 ? 'text-green-500' : job.educationMatch && job.educationMatch >= 40 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                            {job.educationMatch}%
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">Education</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">Education Match: {job.educationMatch}%</p>
                                        <p className="text-xs text-muted-foreground">Educational background relevance</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-center cursor-help">
                                          <div className="text-xs text-muted-foreground mb-1">
                                            <TrendingUp className="h-3 w-3 mx-auto" />
                                          </div>
                                          <div className={`text-xs font-bold ${job.careerTrajectory && job.careerTrajectory >= 70 ? 'text-green-500' : job.careerTrajectory && job.careerTrajectory >= 40 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                            {job.careerTrajectory}%
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">Career Fit</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">Career Trajectory: {job.careerTrajectory}%</p>
                                        <p className="text-xs text-muted-foreground">How this fits your career path</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}

                                {/* AI Recommendation */}
                                {job.aiPowered && job.recommendation && (
                                  <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                    <div className="flex items-start gap-1.5">
                                      <Lightbulb className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground">{job.recommendation}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipProvider>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {appliedJobs.includes(job.id) ? (
                          (() => {
                            const statusInfo = getApplicationStatus(job.id);
                            const StatusIcon = statusInfo.icon;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" className={`flex-1 ${statusInfo.className}`} disabled>
                                      <StatusIcon className="h-4 w-4 mr-2" />
                                      {statusInfo.label}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Application Status: {statusInfo.label}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()
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
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => toggleSaveJob(job.id)}
                          disabled={savingJob === job.id}
                          className={savedJobs.includes(job.id) ? "text-primary border-primary" : ""}
                        >
                          {savingJob === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : savedJobs.includes(job.id) ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>

                  {displayedJobs.length === 0 && viewMode === "all" && (
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
