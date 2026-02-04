import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  HelpCircle,
  UserPlus,
  Upload,
  Search,
  Send,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const howItWorksSteps = [
  {
    icon: UserPlus,
    title: "1. Create Account",
    description: "Sign up as a Student (job seeker) or Employer (recruiter) to get started."
  },
  {
    icon: Upload,
    title: "2. Upload Resume",
    description: "Students upload their resume. Our AI parses and extracts your skills automatically."
  },
  {
    icon: Search,
    title: "3. Find Matches",
    description: "AI matches your skills with available jobs and shows you the best opportunities."
  },
  {
    icon: Send,
    title: "4. Apply Instantly",
    description: "Apply to jobs with one click. Your application and match score are sent to employers."
  },
  {
    icon: MessageSquare,
    title: "5. Connect & Communicate",
    description: "Employers review applications and can message candidates directly through the platform."
  }
];

export const HelpButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelpDialog(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full gradient-bg text-primary-foreground shadow-elevated hover:shadow-glow transition-all duration-300 hover:scale-105 group"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="font-medium">How it Works</span>
      </button>

      {/* How It Works Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">How Career Compass Works</DialogTitle>
            <DialogDescription className="text-center">
              Your AI-powered journey to finding the perfect job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {howItWorksSteps.map((step) => (
              <div 
                key={step.title}
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
                  <step.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="gradient" 
              onClick={() => {
                setShowHelpDialog(false);
                navigate(user ? "/resume" : "/auth");
              }} 
              className="w-full"
            >
              {user ? "Get Started" : "Sign Up Now"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
