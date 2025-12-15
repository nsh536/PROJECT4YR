import { Header } from "@/components/Header";
import { PostJobForm } from "@/components/PostJobForm";
import { CheckCircle, Users, Zap, Globe } from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "50,000+ Active Candidates",
    description: "Reach a vast pool of qualified professionals",
  },
  {
    icon: Zap,
    title: "AI-Powered Matching",
    description: "Get matched with the best candidates automatically",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Find talent from anywhere in the world",
  },
  {
    icon: CheckCircle,
    title: "Verified Profiles",
    description: "All candidates are verified and vetted",
  },
];

const PostJob = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-10 px-4 gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10 animate-fade-up">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              For Employers
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Post a Job & Find <span className="gradient-text">Top Talent</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Reach thousands of qualified candidates and fill your positions faster with AI-powered matching
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Form */}
            <div className="lg:col-span-2 animate-fade-up">
              <div className="gradient-card rounded-2xl border border-border p-8 shadow-card">
                <h2 className="font-display font-semibold text-2xl mb-6">Job Details</h2>
                <PostJobForm />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {/* Benefits */}
              <div className="gradient-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-lg mb-4">Why Post With Us?</h3>
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{benefit.title}</h4>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="gradient-bg rounded-2xl p-6 text-primary-foreground shadow-glow">
                <h3 className="font-display font-semibold text-lg mb-2">Free Job Posting</h3>
                <p className="text-sm text-primary-foreground/90 mb-4">
                  Post your first job for free and see the results. Upgrade anytime for premium features.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    30-day job listing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    AI candidate matching
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Unlimited applications
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PostJob;
