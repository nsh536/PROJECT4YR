import { Header } from "@/components/Header";
import { JobSearchForm } from "@/components/JobSearchForm";
import { JobCard } from "@/components/JobCard";
import { HelpButton } from "@/components/HelpButton";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { Button } from "@/components/ui/button";
import { jobs, Job } from "@/data/mockData";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRight, 
  Briefcase, 
  Users, 
  FileText, 
  Sparkles,
  CheckCircle,
  TrendingUp,
  Globe,
  Zap,
  Upload,
  LogIn
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const stats = [
  { icon: Briefcase, value: "10,000+", label: "Active Jobs" },
  { icon: Users, value: "50,000+", label: "Candidates" },
  { icon: Globe, value: "500+", label: "Companies" },
  { icon: TrendingUp, value: "95%", label: "Success Rate" },
];

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our intelligent algorithms match you with the perfect opportunities based on your skills and preferences.",
    link: "/jobs",
    buttonText: "Find Matches",
  },
  {
    icon: FileText,
    title: "Smart Resume Builder",
    description: "Create stunning resumes with AI assistance that highlight your strengths and get noticed by recruiters.",
    link: "/resume",
    buttonText: "Build Resume",
  },
  {
    icon: Zap,
    title: "Instant Applications",
    description: "Apply to multiple jobs with one click. Save time and increase your chances of landing interviews.",
    link: "/jobs",
    buttonText: "Browse Jobs",
  },
  {
    icon: CheckCircle,
    title: "Verified Employers",
    description: "All companies on our platform are verified, ensuring you only connect with legitimate opportunities.",
    link: "/candidates",
    buttonText: "View Talent",
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const checkResume = async () => {
      if (user) {
        const { data } = await supabase
          .from("resumes")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        setHasResume(data && data.length > 0);
      }
    };
    checkResume();
  }, [user]);

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!hasResume) {
      setShowResumeDialog(true);
      return;
    }
    
    // User is logged in and has resume - navigate to jobs page to apply
    navigate("/jobs");
  };

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="animate-fade-up">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              🚀 AI-Powered Career Platform
            </span>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Smart Career Advisor
              <br />
              <span className="gradient-text">Using ML Job Based Recommendation System</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Career Compass uses cutting-edge AI to match you with perfect job opportunities, 
              build stunning resumes, and accelerate your career growth.
            </p>
          </div>

          {/* Search Form */}
          <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <JobSearchForm onSearch={(q, l, t) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (l && l !== "all") params.set("location", l);
              if (t) params.set("type", t);
              navigate(`/jobs?${params.toString()}`);
            }} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="font-display font-bold text-2xl md:text-3xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Why Choose Career Compass?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine cutting-edge AI technology with a human touch to help you navigate your career journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="gradient-card p-6 rounded-2xl border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-fade-up cursor-pointer group"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(feature.link)}
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 shadow-soft">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {feature.buttonText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="gradient-bg rounded-3xl p-10 md:p-16 text-center shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Transform Your Career?
              </h2>
              <p className="text-primary-foreground/90 max-w-xl mx-auto mb-8">
                Join thousands of professionals who have found their dream jobs through Career Compass.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/jobs">
                  <Button 
                    size="xl" 
                    className="bg-background text-foreground hover:bg-background/90 shadow-elevated"
                  >
                    Find Jobs
                  </Button>
                </Link>
                <Link to="/resume">
                  <Button 
                    variant="outline" 
                    size="xl"
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    Build Resume
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl gradient-bg">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">CareerCompass</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Career Compass AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Resume Upload Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Upload Your Resume First</DialogTitle>
            <DialogDescription className="text-center">
              To apply for <span className="font-semibold text-foreground">{selectedJob?.title}</span> at {selectedJob?.company}, please upload your resume so employers can learn about your skills and experience.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowResumeDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="gradient" 
              onClick={() => navigate("/resume")} 
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Sign In Required</DialogTitle>
            <DialogDescription className="text-center">
              Please sign in or create an account to apply for <span className="font-semibold text-foreground">{selectedJob?.title}</span> at {selectedJob?.company}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="gradient" 
              onClick={() => navigate("/auth")} 
              className="flex-1"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpButton />
      <WelcomeDialog />
    </div>
  );
};

export default Index;
