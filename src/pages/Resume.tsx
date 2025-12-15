import { Header } from "@/components/Header";
import { ResumeForm } from "@/components/ResumeForm";
import { Sparkles, FileText, Download, Eye } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Suggestions",
    description: "Get intelligent recommendations to improve your resume",
  },
  {
    icon: FileText,
    title: "Professional Templates",
    description: "Choose from beautiful, ATS-friendly templates",
  },
  {
    icon: Download,
    title: "Multiple Formats",
    description: "Download as PDF, Word, or share a link",
  },
  {
    icon: Eye,
    title: "Real-time Preview",
    description: "See changes instantly as you type",
  },
];

const Resume = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-10 px-4 gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10 animate-fade-up">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              AI Resume Builder
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Build a <span className="gradient-text">Standout Resume</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create a professional resume in minutes with AI assistance. Get noticed by top employers.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="gradient-card rounded-2xl border border-border p-8 shadow-card animate-fade-up">
            <ResumeForm />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Resume;
