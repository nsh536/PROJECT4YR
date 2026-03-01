import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, Lightbulb, BookOpen, ArrowRight, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";

interface SkillsGapAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    title: string;
    company: string;
    skills_required: string[];
    requirements?: string[];
    description: string;
  };
  resume: {
    skills: string[];
    title?: string;
    experience_years?: number;
    education?: string;
  } | null;
}

interface GapAnalysis {
  overall_readiness: number;
  matched_skills: { skill: string; proficiency: string }[];
  missing_skills: { skill: string; priority: string; suggestion: string }[];
  transferable_skills: { from: string; to: string; relevance: string }[];
  recommended_courses: { title: string; platform: string; duration: string }[];
  action_plan: string;
}

export function SkillsGapAnalyzer({ open, onOpenChange, job, resume }: SkillsGapAnalyzerProps) {
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (!resume) {
      toast.error("Please upload a resume first to analyze skills gap.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("skills-gap-analyzer", {
        body: {
          resumeSkills: resume.skills,
          resumeTitle: resume.title,
          resumeExperience: resume.experience_years,
          resumeEducation: resume.education,
          jobTitle: job.title,
          jobSkills: job.skills_required,
          jobRequirements: job.requirements,
          jobDescription: job.description,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("Skills gap analysis error:", err);
      toast.error("Failed to analyze skills gap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
      case "important": return "bg-[hsl(var(--status-pending))]/10 text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending))]/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 75) return "text-[hsl(var(--status-accepted))]";
    if (score >= 50) return "text-[hsl(var(--status-pending))]";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Skills Gap Analyzer
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis for <span className="font-medium text-foreground">{job.title}</span> at {job.company}
          </DialogDescription>
        </DialogHeader>

        {!analysis && !loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-4 rounded-2xl gradient-bg shadow-glow">
              <Target className="h-10 w-10 text-primary-foreground" />
            </div>
            <p className="text-center text-muted-foreground max-w-sm">
              Compare your skills against the job requirements and get actionable suggestions to improve your profile.
            </p>
            <Button onClick={runAnalysis} disabled={!resume} className="gap-2">
              <Zap className="h-4 w-4" />
              Analyze My Skills Gap
            </Button>
            {!resume && (
              <p className="text-sm text-destructive">Upload a resume to use this feature.</p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your skills gap...</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6 animate-fade-in">
            {/* Readiness Score */}
            <div className="text-center p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-1">Overall Readiness</p>
              <p className={`text-4xl font-bold font-display ${getReadinessColor(analysis.overall_readiness)}`}>
                {analysis.overall_readiness}%
              </p>
              <Progress value={analysis.overall_readiness} className="mt-3 h-2" />
            </div>

            {/* Matched Skills */}
            {analysis.matched_skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-accepted))]" />
                  Matched Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.matched_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-[hsl(var(--status-accepted))]/10 text-[hsl(var(--status-accepted))] border-[hsl(var(--status-accepted))]/20">
                      {s.skill} • {s.proficiency}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Skills */}
            {analysis.missing_skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--status-pending))]" />
                  Skills to Develop
                </h3>
                <div className="space-y-2">
                  {analysis.missing_skills.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{s.skill}</span>
                        <Badge variant="outline" className={getPriorityColor(s.priority)}>
                          {s.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transferable Skills */}
            {analysis.transferable_skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Transferable Skills
                </h3>
                <div className="space-y-2">
                  {analysis.transferable_skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30">
                      <Badge variant="outline">{s.from}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Badge className="bg-primary/10 text-primary border-primary/20">{s.to}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{s.relevance}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Courses */}
            {analysis.recommended_courses?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-accent" />
                  Recommended Learning
                </h3>
                <div className="grid gap-2">
                  {analysis.recommended_courses.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.platform}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{c.duration}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Plan */}
            {analysis.action_plan && (
              <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Your Action Plan
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.action_plan}</p>
              </div>
            )}

            <Button onClick={runAnalysis} variant="outline" className="w-full gap-2">
              <Target className="h-4 w-4" />
              Re-analyze
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
