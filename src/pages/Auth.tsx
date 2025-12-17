import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Compass, GraduationCap, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const { user, profile, signUp, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRole, setSignupRole] = useState<'student' | 'employer'>('student');
  const [signupCompanyName, setSignupCompanyName] = useState('');

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      if (!signupFullName.trim()) {
        toast.error('Full name is required');
        return;
      }
      if (signupRole === 'employer' && !signupCompanyName.trim()) {
        toast.error('Company name is required for employers');
        return;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupRole, 
      signupFullName,
      signupRole === 'employer' ? signupCompanyName : undefined
    );
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Compass className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Career Compass
            </span>
          </div>
          <p className="text-muted-foreground">Your AI-powered career guide</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Get started with Career Compass</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label>I am a</Label>
                    <RadioGroup
                      value={signupRole}
                      onValueChange={(value) => setSignupRole(value as 'student' | 'employer')}
                      className="grid grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="role-student"
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          signupRole === 'student' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="student" id="role-student" className="sr-only" />
                        <GraduationCap className={`h-6 w-6 ${signupRole === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">Student</p>
                          <p className="text-xs text-muted-foreground">Looking for jobs</p>
                        </div>
                      </Label>
                      <Label
                        htmlFor="role-employer"
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          signupRole === 'employer' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="employer" id="role-employer" className="sr-only" />
                        <Building2 className={`h-6 w-6 ${signupRole === 'employer' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">Employer</p>
                          <p className="text-xs text-muted-foreground">Hiring talent</p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                    />
                  </div>

                  {signupRole === 'employer' && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-company">Company Name</Label>
                      <Input
                        id="signup-company"
                        type="text"
                        placeholder="Acme Inc."
                        value={signupCompanyName}
                        onChange={(e) => setSignupCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
