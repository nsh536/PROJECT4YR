import { Candidate } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, GraduationCap, Mail, Calendar, DollarSign } from "lucide-react";

interface CandidateProfileDialogProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateProfileDialog({ candidate, open, onOpenChange }: CandidateProfileDialogProps) {
  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-soft">
              {candidate.avatar}
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display text-2xl">{candidate.name}</DialogTitle>
              <p className="text-primary font-semibold text-lg mt-1">{candidate.title}</p>
              <Badge variant="secondary" className="mt-2 bg-accent/10 text-accent border-0">
                {candidate.availability}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {candidate.location}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              {candidate.experience}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {candidate.education.split(",")[0]}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {candidate.expectedSalary}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h4 className="font-display font-semibold mb-2">About</h4>
            <p className="text-muted-foreground">{candidate.bio}</p>
          </div>

          {/* Education */}
          <div>
            <h4 className="font-display font-semibold mb-2">Education</h4>
            <p className="text-muted-foreground">{candidate.education}</p>
          </div>

          {/* Skills */}
          <div>
            <h4 className="font-display font-semibold mb-3">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="gradient" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Contact Candidate
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
