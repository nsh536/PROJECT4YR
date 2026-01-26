import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  MapPin, 
  Calendar,
  Clock,
  CheckCircle2,
  Eye,
  UserCheck,
  XCircle,
  Briefcase,
  TrendingUp,
  Users,
  FileText,
  Mail,
  CheckSquare,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Application {
  id: string;
  job_id: string;
  user_id: string;
  match_score: number | null;
  status: string;
  created_at: string;
  resume: {
    id: string;
    title: string | null;
    skills: string[] | null;
    experience_years: number | null;
    file_url: string;
  } | null;
  profile: {
    full_name: string | null;
    email: string;
    location: string | null;
  } | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  created_at: string;
  is_active: boolean;
  applications: Application[];
}

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-[hsl(var(--status-pending))] text-[hsl(var(--status-pending-foreground))]"
  },
  reviewed: {
    label: "Reviewed",
    icon: Eye,
    className: "bg-[hsl(var(--status-reviewed))] text-[hsl(var(--status-reviewed-foreground))]"
  },
  interview: {
    label: "Interview",
    icon: UserCheck,
    className: "bg-[hsl(var(--status-interview))] text-[hsl(var(--status-interview-foreground))]"
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-[hsl(var(--status-rejected))] text-[hsl(var(--status-rejected-foreground))]"
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-[hsl(var(--status-accepted))] text-[hsl(var(--status-accepted-foreground))]"
  }
};

const EmployerDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "employer") {
      navigate("/");
      return;
    }
    fetchJobsWithApplications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('employer-applications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications'
        },
        () => {
          fetchJobsWithApplications();
          toast.info("New application received!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const fetchJobsWithApplications = async () => {
    if (!user) return;

    // First fetch employer's jobs
    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company, location, created_at, is_active")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      setIsLoading(false);
      return;
    }

    // Then fetch applications for each job with resume and profile data
    const jobsWithApplications = await Promise.all(
      (jobsData || []).map(async (job) => {
        const { data: applications } = await supabase
          .from("applications")
          .select(`
            id,
            job_id,
            user_id,
            match_score,
            status,
            created_at,
            resume:resumes(id, title, skills, experience_years, file_url)
          `)
          .eq("job_id", job.id)
          .order("created_at", { ascending: false });

        // Fetch profiles separately due to RLS
        const applicationsWithProfiles = await Promise.all(
          (applications || []).map(async (app) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, email, location")
              .eq("user_id", app.user_id)
              .maybeSingle();

            return {
              ...app,
              profile: profileData
            };
          })
        );

        return {
          ...job,
          applications: applicationsWithProfiles
        };
      })
    );

    setJobs(jobsWithApplications);
    setIsLoading(false);
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingStatus(applicationId);

    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } else {
      // Update local state
      setJobs(prev => prev.map(job => ({
        ...job,
        applications: job.applications.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      })));
      toast.success(`Application status updated to ${statusConfig[newStatus]?.label || newStatus}`);
    }

    setUpdatingStatus(null);
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedApplications.size === 0) return;
    
    setIsBulkUpdating(true);
    const applicationIds = Array.from(selectedApplications);
    
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .in("id", applicationIds);

    if (error) {
      console.error("Error bulk updating status:", error);
      toast.error("Failed to update applications");
    } else {
      // Update local state
      setJobs(prev => prev.map(job => ({
        ...job,
        applications: job.applications.map(app =>
          selectedApplications.has(app.id) ? { ...app, status: newStatus } : app
        )
      })));
      toast.success(`Updated ${applicationIds.length} application(s) to ${statusConfig[newStatus]?.label || newStatus}`);
      setSelectedApplications(new Set());
    }
    
    setIsBulkUpdating(false);
  };

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)));
    }
  };

  const allApplications = jobs.flatMap(job => 
    job.applications.map(app => ({ ...app, jobTitle: job.title, jobCompany: job.company }))
  );

  const filteredApplications = selectedJob === "all" 
    ? allApplications 
    : allApplications.filter(app => app.job_id === selectedJob);

  const stats = {
    totalJobs: jobs.length,
    totalApplications: allApplications.length,
    pending: allApplications.filter(a => a.status === "pending").length,
    interviewing: allApplications.filter(a => a.status === "interview").length
  };

  const isAllSelected = filteredApplications.length > 0 && selectedApplications.size === filteredApplications.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Employer Dashboard</h1>
          <p className="text-muted-foreground">
            Manage applications and track candidates for your job postings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalApplications}</p>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--status-pending))]/20">
                <Clock className="h-5 w-5 text-[hsl(var(--status-pending))]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--status-interview))]/20">
                <UserCheck className="h-5 w-5 text-[hsl(var(--status-interview))]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.interviewing}</p>
                <p className="text-xs text-muted-foreground">In Interview</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Filter */}
        <div className="mb-6">
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs ({allApplications.length} applications)</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title} ({job.applications.length} applications)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select All & Bulk Actions */}
        {filteredApplications.length > 0 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all applications"
              />
              <span className="text-sm text-muted-foreground">
                {selectedApplications.size > 0 
                  ? `${selectedApplications.size} selected` 
                  : "Select all"}
              </span>
            </div>
            {selectedApplications.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplications(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Applications will appear here when candidates apply to your jobs
            </p>
            <Button onClick={() => navigate("/jobs")} variant="outline">
              Post a New Job
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const status = statusConfig[application.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <Card 
                  key={application.id} 
                  className={`overflow-hidden hover:shadow-md transition-shadow ${
                    selectedApplications.has(application.id) ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Candidate Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedApplications.has(application.id)}
                            onCheckedChange={() => toggleApplicationSelection(application.id)}
                            className="mt-1"
                            aria-label={`Select ${application.profile?.full_name || "application"}`}
                          />
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-semibold text-primary">
                              {application.profile?.full_name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg">
                              {application.profile?.full_name || "Unknown Candidate"}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              Applied for: <span className="text-foreground font-medium">{application.jobTitle}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                              {application.profile?.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {application.profile.email}
                                </span>
                              )}
                              {application.profile?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {application.profile.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(application.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Skills & Experience */}
                        {application.resume && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {application.resume.experience_years !== null && (
                              <Badge variant="secondary">
                                {application.resume.experience_years} years exp
                              </Badge>
                            )}
                            {application.resume.skills?.slice(0, 5).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {(application.resume.skills?.length || 0) > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{(application.resume.skills?.length || 0) - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions & Status */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Match Score */}
                        {application.match_score !== null && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {application.match_score}% Match
                            </span>
                          </div>
                        )}

                        {/* View Resume */}
                        {application.resume?.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(application.resume?.file_url, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                        )}

                        {/* Status Dropdown */}
                        <Select
                          value={application.status}
                          onValueChange={(value) => updateApplicationStatus(application.id, value)}
                          disabled={updatingStatus === application.id}
                        >
                          <SelectTrigger className={`w-[140px] ${status.className} border-0`}>
                            {updatingStatus === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4" />
                                <span>{status.label}</span>
                              </div>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => {
                              const Icon = config.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedApplications.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-elevated rounded-lg p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium">{selectedApplications.size} selected</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Update to:</span>
              <Select
                onValueChange={bulkUpdateStatus}
                disabled={isBulkUpdating}
              >
                <SelectTrigger className="w-[140px]">
                  {isBulkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue placeholder="Select status" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedApplications(new Set())}
            >
              Cancel
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployerDashboard;
