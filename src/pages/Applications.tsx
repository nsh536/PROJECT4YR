import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  MapPin, 
  Building, 
  Calendar,
  Clock,
  CheckCircle2,
  Eye,
  UserCheck,
  XCircle,
  Briefcase,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Application {
  id: string;
  job_id: string;
  match_score: number | null;
  status: string;
  created_at: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    job_type: string;
    salary_min: number | null;
    salary_max: number | null;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-[hsl(var(--status-pending))] text-[hsl(var(--status-pending-foreground))] border-transparent"
  },
  reviewed: {
    label: "Reviewed",
    icon: Eye,
    className: "bg-[hsl(var(--status-reviewed))] text-[hsl(var(--status-reviewed-foreground))] border-transparent"
  },
  interview: {
    label: "Interview",
    icon: UserCheck,
    className: "bg-[hsl(var(--status-interview))] text-[hsl(var(--status-interview-foreground))] border-transparent"
  },
  rejected: {
    label: "Not Selected",
    icon: XCircle,
    className: "bg-[hsl(var(--status-rejected))] text-[hsl(var(--status-rejected-foreground))] border-transparent"
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-[hsl(var(--status-accepted))] text-[hsl(var(--status-accepted-foreground))] border-transparent"
  }
};

const Applications = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "student") {
      navigate("/");
      return;
    }
    fetchApplications();

    // Subscribe to real-time updates for this user's applications
    const channel = supabase
      .channel('applications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update the specific application in state
          setApplications(prev => 
            prev.map(app => 
              app.id === payload.new.id 
                ? { ...app, status: payload.new.status, match_score: payload.new.match_score }
                : app
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch to get the full application with job details
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const fetchApplications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        job_id,
        match_score,
        status,
        created_at,
        job:jobs(id, title, company, location, job_type, salary_min, salary_max)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(data || []);
    }
    setIsLoading(false);
  };

  const filteredApplications = applications.filter(app => 
    filterStatus === "all" || app.status === filterStatus
  );

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: applications.length };
    applications.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

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
          <h1 className="text-3xl font-bold mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            Track the status of all your job applications
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({statusCounts.all || 0})
          </button>
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filterStatus === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {config.label} ({statusCounts[key] || 0})
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filterStatus === "all" 
                ? "No applications yet"
                : `No ${statusConfig[filterStatus]?.label.toLowerCase()} applications`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterStatus === "all"
                ? "Start applying to jobs to track your applications here"
                : "Try selecting a different filter"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const status = statusConfig[application.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <Card key={application.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {application.job?.title || "Job no longer available"}
                            </h3>
                            <p className="text-muted-foreground">
                              {application.job?.company}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                              {application.job?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {application.job.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Applied {format(new Date(application.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status & Match Score */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {application.match_score !== null && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {application.match_score}% Match
                            </span>
                          </div>
                        )}
                        <Badge className={`${status.className} flex items-center gap-1.5 px-3 py-1.5`}>
                          <StatusIcon className="h-4 w-4" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Salary Info */}
                    {application.job && formatSalary(application.job.salary_min, application.job.salary_max) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                          Salary: {formatSalary(application.job.salary_min, application.job.salary_max)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        {applications.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              const count = statusCounts[key] || 0;
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.className}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Applications;
