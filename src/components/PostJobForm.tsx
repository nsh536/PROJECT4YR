import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Briefcase, Building, MapPin, DollarSign, FileText, Tags, CheckCircle } from "lucide-react";

export function PostJobForm() {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    salaryMin: "",
    salaryMax: "",
    description: "",
    requirements: "",
    tags: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Job Posted Successfully!",
      description: "Your job listing is now live and visible to candidates.",
    });
    // Reset form
    setFormData({
      title: "",
      company: "",
      location: "",
      type: "Full-time",
      salaryMin: "",
      salaryMax: "",
      description: "",
      requirements: "",
      tags: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Job Title
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g., Senior Frontend Developer"
          value={formData.title}
          onChange={handleChange}
          required
          className="h-12"
        />
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company" className="flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          Company Name
        </Label>
        <Input
          id="company"
          name="company"
          placeholder="e.g., TechCorp Inc."
          value={formData.company}
          onChange={handleChange}
          required
          className="h-12"
        />
      </div>

      {/* Location & Type */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </Label>
          <Input
            id="location"
            name="location"
            placeholder="e.g., San Francisco, CA or Remote"
            value={formData.location}
            onChange={handleChange}
            required
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Job Type
          </Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full h-12 px-4 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {/* Salary Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Salary Range (Annual)
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="salaryMin"
            placeholder="Min (e.g., 100000)"
            type="number"
            value={formData.salaryMin}
            onChange={handleChange}
            className="h-12"
          />
          <Input
            name="salaryMax"
            placeholder="Max (e.g., 150000)"
            type="number"
            value={formData.salaryMax}
            onChange={handleChange}
            className="h-12"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Job Description
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
          value={formData.description}
          onChange={handleChange}
          required
          className="min-h-32 resize-none"
        />
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <Label htmlFor="requirements" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          Requirements (one per line)
        </Label>
        <Textarea
          id="requirements"
          name="requirements"
          placeholder="5+ years of React experience&#10;Strong TypeScript skills&#10;Experience with REST APIs"
          value={formData.requirements}
          onChange={handleChange}
          className="min-h-28 resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary" />
          Skills / Tags (comma separated)
        </Label>
        <Input
          id="tags"
          name="tags"
          placeholder="e.g., React, TypeScript, Node.js, AWS"
          value={formData.tags}
          onChange={handleChange}
          className="h-12"
        />
      </div>

      {/* Submit */}
      <Button type="submit" variant="hero" size="xl" className="w-full">
        Post Job
      </Button>
    </form>
  );
}
