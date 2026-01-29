import { Job } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, IndianRupee, Briefcase } from "lucide-react";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  return (
    <div className="group gradient-card rounded-2xl p-6 border border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-bold text-lg shadow-soft">
          {job.logo}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              <p className="text-muted-foreground font-medium">{job.company}</p>
            </div>
            <Badge 
              variant={job.type === "Remote" ? "default" : "secondary"}
              className={job.type === "Remote" ? "gradient-bg border-0" : ""}
            >
              {job.type}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4" />
              {job.salary}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {job.posted}
            </span>
          </div>

          {/* Description */}
          <p className="mt-3 text-muted-foreground text-sm line-clamp-2">
            {job.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
            <Button 
              variant="gradient" 
              size="sm"
              onClick={() => onApply?.(job)}
            >
              Apply Now
            </Button>
            <Button variant="outline" size="sm">
              Save Job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
