import { Candidate } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, GraduationCap } from "lucide-react";

interface CandidateCardProps {
  candidate: Candidate;
  onViewProfile?: (candidate: Candidate) => void;
}

export function CandidateCard({ candidate, onViewProfile }: CandidateCardProps) {
  return (
    <div className="group gradient-card rounded-2xl p-6 border border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-xl shadow-soft">
          {candidate.avatar}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {candidate.name}
              </h3>
              <p className="text-primary font-medium">{candidate.title}</p>
            </div>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-0">
              {candidate.availability}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {candidate.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              {candidate.experience}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {candidate.education}
            </span>
          </div>

          {/* Bio */}
          <p className="mt-3 text-muted-foreground text-sm line-clamp-2">
            {candidate.bio}
          </p>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {candidate.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 4 && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                +{candidate.skills.length - 4} more
              </span>
            )}
          </div>

          {/* Salary & Actions */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Expected: <span className="font-semibold text-foreground">{candidate.expectedSalary}</span>
            </span>
            <div className="flex gap-2">
              <Button 
                variant="gradient" 
                size="sm"
                onClick={() => onViewProfile?.(candidate)}
              >
                View Profile
              </Button>
              <Button variant="outline" size="sm">
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
