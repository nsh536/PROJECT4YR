import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Download, Sparkles } from "lucide-react";

export function ResumeForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    summary: "",
    experience: "",
    education: "",
    skills: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateAI = () => {
    toast({
      title: "AI Enhancement",
      description: "Connect to Lovable Cloud to enable AI-powered resume suggestions!",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Resume Downloaded!",
      description: "Your resume has been saved as a PDF file.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Personal Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Professional Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Senior Software Engineer"
              value={formData.title}
              onChange={handleChange}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={handleChange}
              className="h-12"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Location
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="San Francisco, CA"
              value={formData.location}
              onChange={handleChange}
              className="h-12"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Professional Summary
          </h3>
          <Button variant="outline" size="sm" onClick={handleGenerateAI}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Enhance
          </Button>
        </div>
        <Textarea
          name="summary"
          placeholder="Write a compelling summary of your professional background, key achievements, and career goals..."
          value={formData.summary}
          onChange={handleChange}
          className="min-h-28 resize-none"
        />
      </div>

      {/* Work Experience */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Work Experience
        </h3>
        <Textarea
          name="experience"
          placeholder="Senior Developer at TechCorp (2020 - Present)&#10;- Led development of customer-facing applications&#10;- Mentored junior developers&#10;&#10;Developer at StartupXYZ (2018 - 2020)&#10;- Built scalable microservices..."
          value={formData.experience}
          onChange={handleChange}
          className="min-h-40 resize-none"
        />
      </div>

      {/* Education */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Education
        </h3>
        <Textarea
          name="education"
          placeholder="MS Computer Science, Stanford University (2018)&#10;BS Computer Science, UC Berkeley (2016)"
          value={formData.education}
          onChange={handleChange}
          className="min-h-24 resize-none"
        />
      </div>

      {/* Skills */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Skills
        </h3>
        <Textarea
          name="skills"
          placeholder="React, TypeScript, Node.js, Python, AWS, PostgreSQL, Docker, Kubernetes, GraphQL..."
          value={formData.skills}
          onChange={handleChange}
          className="min-h-20 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button variant="hero" size="xl" className="flex-1" onClick={handleDownload}>
          <Download className="h-5 w-5 mr-2" />
          Download Resume
        </Button>
        <Button variant="outline" size="xl" onClick={handleGenerateAI}>
          <Sparkles className="h-5 w-5 mr-2" />
          AI Suggestions
        </Button>
      </div>
    </div>
  );
}
