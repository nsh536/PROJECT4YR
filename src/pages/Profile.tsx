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
  Pencil, Check, X, GraduationCap, Building2
} from "lucide-react";

const Profile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    company_name: "",
  });

  // Resume data for students
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
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch avatar
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profileData?.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }

      // Fetch resume data for students
      if (profile?.role === "student") {
        const { data: resume } = await supabase
          .from("resumes")
          .select("title, skills, education, experience_years, summary")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resume) {
          setResumeData(resume);
        }
      }
    };

    fetchData();
  }, [user, profile]);

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Upload JPEG, PNG, GIF, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
    toast({ title: "Avatar updated!" });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Profile Hero */}
        <Card className="overflow-hidden">
          <div className="h-32 gradient-bg" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-muted-foreground text-xs uppercase tracking-wide">
                    Full Name
                  </Label>
                  {editing ? (
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {formData.full_name || "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {formData.email}
                  </p>
                  {editing && (
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-muted-foreground text-xs uppercase tracking-wide">
                    Phone
                  </Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  ) : (
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {formData.phone || "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-muted-foreground text-xs uppercase tracking-wide">
                    Location
                  </Label>
                  {editing ? (
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                      placeholder="Mumbai, India"
                    />
                  ) : (
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {formData.location || "Not set"}
                    </p>
                  )}
                </div>

                {profile?.role === "employer" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name" className="text-muted-foreground text-xs uppercase tracking-wide">
                      Company Name
                    </Label>
                    {editing ? (
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))}
                        placeholder="Your company name"
                      />
                    ) : (
                      <p className="text-foreground font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {formData.company_name || "Not set"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Info (for students) / Company Info (for employers) */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
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
                      <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" /> Education
                      </Label>
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
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!resumeData.summary && !resumeData.education && (!resumeData.skills || resumeData.skills.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Upload your resume to auto-fill professional details.
                    </p>
                  )}
                </div>
              ) : profile?.role === "student" ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No resume uploaded yet. Upload your resume to see professional details here.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/resume")}
                  >
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

export default Profile;
