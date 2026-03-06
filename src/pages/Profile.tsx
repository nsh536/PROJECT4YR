import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Phone, MapPin, Briefcase, Camera, Loader2,
  Pencil, Check, X, GraduationCap, Building2, Globe, Github,
  Linkedin, ImagePlus, Link as LinkIcon
} from "lucide-react";

const Profile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    company_name: "",
    bio: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
  });

  const [resumeData, setResumeData] = useState<{
    title: string | null;
    skills: string[] | null;
    education: string | null;
    experience_years: number | null;
    summary: string | null;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        company_name: profile.company_name || "",
        bio: profile.bio || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
      });
      setBgImageUrl(profile.bg_image_url || null);
    }
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profileData?.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }

      if (profile?.role === "student") {
        const { data: resume } = await supabase
          .from("resumes")
          .select("title, skills, education, experience_years, summary")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resume) setResumeData(resume);
      }
    };

    fetchData();
  }, [user, profile]);

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleImageUpload = async (
    file: File,
    path: string,
    onSuccess: (url: string) => void,
    setUploading: (v: boolean) => void,
    dbField: string
  ) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Upload JPEG, PNG, GIF, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ [dbField]: publicUrl }).eq("user_id", user!.id);
    onSuccess(publicUrl);
    setUploading(false);
    toast({ title: "Image updated!" });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    await handleImageUpload(file, `${user.id}/avatar.${ext}`, setAvatarUrl, setUploadingAvatar, "avatar_url");
  };

  const handleBgUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    await handleImageUpload(file, `${user.id}/bg.${ext}`, setBgImageUrl, setUploadingBg, "bg_image_url");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        company_name: formData.company_name.trim(),
        bio: formData.bio.trim(),
        linkedin_url: formData.linkedin_url.trim(),
        github_url: formData.github_url.trim(),
        portfolio_url: formData.portfolio_url.trim(),
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Profile updated successfully!" });
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        company_name: profile.company_name || "",
        bio: profile.bio || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
      });
    }
    setEditing(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const socialLinks = [
    { key: "linkedin_url", icon: Linkedin, label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
    { key: "github_url", icon: Github, label: "GitHub", placeholder: "https://github.com/yourname" },
    { key: "portfolio_url", icon: Globe, label: "Portfolio", placeholder: "https://yourportfolio.com" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Profile Hero */}
        <Card className="overflow-hidden">
          {/* Background Image */}
          <div
            className="h-44 relative group"
            style={{
              background: bgImageUrl
                ? `url(${bgImageUrl}) center/cover no-repeat`
                : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 50%, hsl(var(--accent)) 100%)",
            }}
          >
            <button
              onClick={() => bgInputRef.current?.click()}
              disabled={uploadingBg}
              className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm text-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/90 shadow-sm"
            >
              {uploadingBg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </button>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleBgUpload}
              className="hidden"
            />
          </div>

          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {getInitials(formData.full_name || "U")}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Name & Role */}
              <div className="flex-1 pt-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {formData.full_name || "Your Name"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {profile?.role === "employer" ? "Employer" : "Student"}
                  </Badge>
                  {resumeData?.title && (
                    <span className="text-sm text-muted-foreground">{resumeData.title}</span>
                  )}
                </div>
                {/* Social Links Display (view mode) */}
                {!editing && (
                  <div className="flex items-center gap-3 mt-2">
                    {formData.linkedin_url && (
                      <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {formData.github_url && (
                      <a href={formData.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {formData.portfolio_url && (
                      <a href={formData.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Button */}
              <div className="sm:self-start sm:mt-4">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Personal Details */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Details
              </h2>

              <div className="space-y-4">
                <ProfileField
                  label="Full Name"
                  icon={<User className="h-4 w-4 text-muted-foreground" />}
                  value={formData.full_name}
                  editing={editing}
                  onChange={(v) => setFormData(p => ({ ...p, full_name: v }))}
                  placeholder="Enter your full name"
                />

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {formData.email}
                  </p>
                  {editing && <p className="text-xs text-muted-foreground">Email cannot be changed.</p>}
                </div>

                <ProfileField
                  label="Phone"
                  icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                  value={formData.phone}
                  editing={editing}
                  onChange={(v) => setFormData(p => ({ ...p, phone: v }))}
                  placeholder="+91 98765 43210"
                />

                <ProfileField
                  label="Location"
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  value={formData.location}
                  editing={editing}
                  onChange={(v) => setFormData(p => ({ ...p, location: v }))}
                  placeholder="Mumbai, India"
                />

                {profile?.role === "employer" && (
                  <ProfileField
                    label="Company Name"
                    icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                    value={formData.company_name}
                    editing={editing}
                    onChange={(v) => setFormData(p => ({ ...p, company_name: v }))}
                    placeholder="Your company name"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio / About Me */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                About Me
              </h2>

              {editing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Write a short bio about yourself — your passions, goals, and what makes you unique..."
                  className="min-h-32 resize-none"
                  maxLength={500}
                />
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {formData.bio || <span className="text-muted-foreground italic">No bio added yet. Click "Edit Profile" to tell the world about yourself!</span>}
                </p>
              )}

              {editing && (
                <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/500</p>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                Social Links
              </h2>

              <div className="space-y-4">
                {socialLinks.map(({ key, icon: Icon, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
                    {editing ? (
                      <div className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={formData[key as keyof typeof formData]}
                          onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="pl-10"
                        />
                      </div>
                    ) : formData[key as keyof typeof formData] ? (
                      <a
                        href={formData[key as keyof typeof formData]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {formData[key as keyof typeof formData]}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        Not set
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Professional Info */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {profile?.role === "employer" ? "Company Info" : "Professional Info"}
              </h2>

              {profile?.role === "student" && resumeData ? (
                <div className="space-y-4">
                  {resumeData.summary && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Summary</Label>
                      <p className="text-sm text-foreground leading-relaxed">{resumeData.summary}</p>
                    </div>
                  )}
                  {resumeData.education && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Education</Label>
                      <p className="text-sm text-foreground">{resumeData.education}</p>
                    </div>
                  )}
                  {resumeData.experience_years != null && resumeData.experience_years > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Experience</Label>
                      <p className="text-sm text-foreground">{resumeData.experience_years} year(s)</p>
                    </div>
                  )}
                  {resumeData.skills && resumeData.skills.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Skills</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {resumeData.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : profile?.role === "student" ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Upload your resume to see professional details here.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/resume")}>
                    Upload Resume
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Company</Label>
                    <p className="text-sm text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {formData.company_name || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Location</Label>
                    <p className="text-sm text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {formData.location || "Not set"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Reusable field component
function ProfileField({
  label, icon, value, editing, onChange, placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <p className="text-foreground font-medium flex items-center gap-2">
          {icon}
          {value || "Not set"}
        </p>
      )}
    </div>
  );
}

export default Profile;
