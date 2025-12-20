import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, Loader2, Briefcase, GraduationCap, Clock, MapPin, Mail, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CandidateProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
}

interface MatchedCandidate {
  id: string;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience_years: number | null;
  education: string | null;
  match_score: number;
  matching_skills: string[];
  profiles: CandidateProfile | null;
  parsed_data: {
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
      description: string;
    }>;
  } | null;
}

const Candidates = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<MatchedCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchedCandidate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && profile?.role !== 'employer') {
      navigate('/');
      toast.error('Only employers can access Find Talent');
    }
  }, [user, profile, authLoading, navigate]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a job role to search');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-candidates', {
        body: {
          position: searchQuery,
          requiredSkills: searchQuery.split(' ').filter(s => s.length > 2)
        }
      });

      if (error) throw error;

      if (data?.candidates) {
        setCandidates(data.candidates);
        if (data.candidates.length === 0) {
          toast.info('No matching candidates found');
        }
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
      toast.error('Failed to search candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
              Enter a job role to find candidates with matching skills and experience
            </p>
          </div>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="glass rounded-2xl p-3 shadow-elevated">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Enter job role (e.g., React Developer, Data Scientist)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-12 h-14 border-0 bg-secondary/50 rounded-xl text-base"
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading}
                  className="h-14 px-8 gradient-bg"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching for matching candidates...</p>
            </div>
          ) : hasSearched ? (
            <>
              {/* Results Count */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{candidates.length}</span> candidates found
                </p>
                {searchQuery && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {searchQuery}
                  </Badge>
                )}
              </div>

              {/* Candidate Listings */}
              {candidates.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-6">
                  {candidates.map((candidate, index) => (
                    <Card 
                      key={candidate.id}
                      className="hover:shadow-lg transition-all cursor-pointer animate-fade-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setDialogOpen(true);
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {candidate.profiles?.full_name || 'Anonymous Candidate'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {candidate.title || 'Professional'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className={`text-xl font-bold ${
                                candidate.match_score >= 70 ? 'text-green-500' :
                                candidate.match_score >= 40 ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}>
                                {candidate.match_score}%
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">match</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {candidate.profiles?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {candidate.profiles.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {candidate.experience_years || 0} years exp.
                          </span>
                          {candidate.education && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {candidate.education.length > 30 
                                ? candidate.education.substring(0, 30) + '...' 
                                : candidate.education}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Skill Match</span>
                            <span className="font-medium">{candidate.matching_skills.length} matching</span>
                          </div>
                          <Progress value={candidate.match_score} className="h-2" />
                        </div>

                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 5).map((skill, idx) => (
                              <Badge 
                                key={idx} 
                                variant={candidate.matching_skills.includes(skill.toLowerCase()) ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.skills.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button className="w-full" size="sm">
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2">No candidates found</h3>
                  <p className="text-muted-foreground">Try a different job role or check back later</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-2xl mb-2">Search for Candidates</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter a job role above to find candidates whose skills and experience match your requirements
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedCandidate.profiles?.full_name || 'Anonymous Candidate'}
                </DialogTitle>
                <p className="text-muted-foreground">{selectedCandidate.title || 'Professional'}</p>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Match Score */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className={`text-3xl font-bold ${
                    selectedCandidate.match_score >= 70 ? 'text-green-500' :
                    selectedCandidate.match_score >= 40 ? 'text-yellow-500' : 'text-muted-foreground'
                  }`}>
                    {selectedCandidate.match_score}%
                  </div>
                  <div>
                    <p className="font-medium">Match Score</p>
                    <p className="text-sm text-muted-foreground">Based on skills and experience</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCandidate.profiles?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCandidate.profiles.email}</span>
                    </div>
                  )}
                  {selectedCandidate.profiles?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCandidate.profiles.phone}</span>
                    </div>
                  )}
                  {selectedCandidate.profiles?.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCandidate.profiles.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCandidate.experience_years || 0} years experience</span>
                  </div>
                </div>

                {/* Summary */}
                {selectedCandidate.summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-muted-foreground">{selectedCandidate.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, idx) => (
                        <Badge 
                          key={idx}
                          variant={selectedCandidate.matching_skills.includes(skill.toLowerCase()) ? "default" : "secondary"}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedCandidate.education && (
                  <div>
                    <h3 className="font-semibold mb-2">Education</h3>
                    <p className="text-muted-foreground">{selectedCandidate.education}</p>
                  </div>
                )}

                {/* Experience */}
                {selectedCandidate.parsed_data?.experience && selectedCandidate.parsed_data.experience.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Experience</h3>
                    <div className="space-y-4">
                      {selectedCandidate.parsed_data.experience.map((exp, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-card">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{exp.position}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                            </div>
                            <Badge variant="outline">{exp.duration}</Badge>
                          </div>
                          {exp.description && (
                            <p className="text-sm text-muted-foreground">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Candidates;
