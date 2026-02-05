import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyEmployerRequest {
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  resumeTitle: string;
  matchScore?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-employer function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId, applicantName, applicantEmail, resumeTitle, matchScore }: NotifyEmployerRequest = await req.json();
    
    console.log("========== NOTIFY EMPLOYER EMAIL DEBUG ==========");
    console.log("Job ID:", jobId);
    console.log("Applicant Name:", applicantName);
    console.log("Applicant Email:", applicantEmail);
    console.log("Resume Title:", resumeTitle || "N/A");
    console.log("Match Score:", matchScore || "N/A");
    console.log("=================================================");

    // Get job details including employer info
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("title, company, employer_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      throw new Error("Job not found");
    }

    console.log("Job found:", job);

    // Get employer's email from profiles
    const { data: employerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", job.employer_id)
      .single();

    if (profileError || !employerProfile) {
      console.error("Error fetching employer profile:", profileError);
      throw new Error("Employer profile not found");
    }

    console.log("Employer Email:", employerProfile.email);
    console.log("Employer Name:", employerProfile.full_name || "N/A");
    console.log("Job Title:", job.title);
    console.log("Company:", job.company);
    console.log("Subject:", `New Application for ${job.title} at ${job.company}`);
    console.log("=================================================");

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "CareerCompass <onboarding@resend.dev>",
      to: [employerProfile.email],
      subject: `New Application for ${job.title} at ${job.company}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .applicant-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .match-score { display: inline-block; background: ${matchScore && matchScore >= 70 ? '#22c55e' : matchScore && matchScore >= 40 ? '#f59e0b' : '#6366f1'}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 New Job Application!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone is interested in your job posting</p>
            </div>
            <div class="content">
              <p>Hi ${employerProfile.full_name || 'there'},</p>
              <p>Great news! You've received a new application for your job posting.</p>
              
              <div class="applicant-card">
                <h3 style="margin-top: 0; color: #6366f1;">Applicant Details</h3>
                <p><strong>Name:</strong> ${applicantName}</p>
                <p><strong>Email:</strong> ${applicantEmail}</p>
                <p><strong>Position Applied:</strong> ${job.title}</p>
                ${resumeTitle ? `<p><strong>Resume Title:</strong> ${resumeTitle}</p>` : ''}
                ${matchScore ? `<p><strong>Match Score:</strong> <span class="match-score">${matchScore}%</span></p>` : ''}
              </div>
              
              <p>Log in to CareerCompass to view the full application and candidate profile.</p>
              
              <div class="footer">
                <p>This email was sent by CareerCompass</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-employer function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
