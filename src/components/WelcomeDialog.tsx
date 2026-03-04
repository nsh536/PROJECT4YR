import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Compass, GraduationCap, Building2, ArrowRight, Sparkles } from 'lucide-react';

// Global trigger function
let openWelcomeDialogFn: (() => void) | null = null;

export function openWelcomeDialog() {
  openWelcomeDialogFn?.();
}

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const showDialog = useCallback(() => setOpen(true), []);

  useEffect(() => {
    openWelcomeDialogFn = showDialog;
    return () => { openWelcomeDialogFn = null; };
  }, [showDialog]);

  useEffect(() => {
    // Only auto-show for unauthenticated first-time visitors
    if (user) return;
    const hasVisited = localStorage.getItem('cc_has_visited');
    if (!hasVisited) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleGetStarted = (role: 'student' | 'employer') => {
    localStorage.setItem('cc_has_visited', 'true');
    setOpen(false);
    navigate(`/auth?defaultTab=signup&role=${role}`);
  };

  const handleDismiss = () => {
    localStorage.setItem('cc_has_visited', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50">
        {/* Header with gradient */}
        <div className="gradient-bg p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background/20 backdrop-blur-sm mb-4">
              <Compass className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-display font-bold text-primary-foreground mb-1">
              Welcome to CareerCompass
            </h2>
            <p className="text-primary-foreground/80 text-sm">
              AI-powered career matching platform
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <DialogHeader className="text-center pb-0">
            <DialogTitle className="text-xl font-display">
              How would you like to get started?
            </DialogTitle>
            <DialogDescription>
              Choose your role to personalize your experience
            </DialogDescription>
          </DialogHeader>

          {/* Role selection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleGetStarted('student')}
              className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left"
            >
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">I'm a Job Seeker</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Find jobs, upload resume, get AI-matched
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Get Started <ArrowRight className="h-3 w-3" />
              </div>
            </button>

            <button
              onClick={() => handleGetStarted('employer')}
              className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left"
            >
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">I'm an Employer</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Post jobs, find talent, manage applications
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Get Started <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </div>

          {/* Features highlight */}
          <div className="flex items-center gap-2 justify-center pt-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>AI-powered matching • Smart resume parsing • Real-time messaging</span>
          </div>

          <div className="text-center pt-1">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
              Maybe later — just browsing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
