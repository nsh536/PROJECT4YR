import { useState } from "react";
import { Header } from "@/components/Header";
import { JobSearchForm } from "@/components/JobSearchForm";
import { JobCard } from "@/components/JobCard";
import { jobs } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Remote"];

const Jobs = () => {
  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter((job) => {
    const matchesType = selectedType === "All" || job.type === selectedType;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-10 px-4 gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Find Your <span className="gradient-text">Perfect Job</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse thousands of opportunities from top companies worldwide
            </p>
          </div>
          
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <JobSearchForm 
              onSearch={(q) => setSearchQuery(q)} 
            />
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
            {jobTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={selectedType === type ? "gradient-bg border-0" : ""}
              >
                {type}
              </Button>
            ))}
            {(selectedType !== "All" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedType("All"); setSearchQuery(""); }}
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
              Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> jobs
            </p>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {selectedType !== "All" && selectedType}
              {searchQuery && ` • "${searchQuery}"`}
              {selectedType === "All" && !searchQuery && "All Jobs"}
            </Badge>
          </div>

          {/* Job Listings */}
          <div className="grid lg:grid-cols-2 gap-6">
            {filteredJobs.map((job, index) => (
              <div
                key={job.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <JobCard job={job} />
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No jobs found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Jobs;
