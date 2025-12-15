import { useState } from "react";
import { Header } from "@/components/Header";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateProfileDialog } from "@/components/CandidateProfileDialog";
import { candidates, Candidate } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, X } from "lucide-react";

const skillFilters = ["All", "React", "Python", "AWS", "Figma", "Node.js"];

const Candidates = () => {
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSkill = selectedSkill === "All" || candidate.skills.includes(selectedSkill);
    const matchesSearch = 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSkill && matchesSearch;
  });

  const handleViewProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-10 px-4 gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Find <span className="gradient-text">Top Talent</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Connect with skilled professionals ready to join your team
            </p>
          </div>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="glass rounded-2xl p-3 shadow-elevated">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, title, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 border-0 bg-secondary/50 rounded-xl text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Skill Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Skills:</span>
            {skillFilters.map((skill) => (
              <Button
                key={skill}
                variant={selectedSkill === skill ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSkill(skill)}
                className={selectedSkill === skill ? "gradient-bg border-0" : ""}
              >
                {skill}
              </Button>
            ))}
            {(selectedSkill !== "All" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedSkill("All"); setSearchQuery(""); }}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredCandidates.length}</span> candidates available
            </p>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Users className="h-3 w-3 mr-1" />
              {selectedSkill !== "All" && selectedSkill}
              {searchQuery && ` • "${searchQuery}"`}
              {selectedSkill === "All" && !searchQuery && "All Candidates"}
            </Badge>
          </div>

          {/* Candidate Listings */}
          <div className="grid lg:grid-cols-2 gap-6">
            {filteredCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CandidateCard 
                  candidate={candidate} 
                  onViewProfile={handleViewProfile}
                />
              </div>
            ))}
          </div>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No candidates found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </section>

      {/* Profile Dialog */}
      <CandidateProfileDialog
        candidate={selectedCandidate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Candidates;
