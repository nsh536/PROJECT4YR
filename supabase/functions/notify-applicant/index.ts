import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyApplicantRequest {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  company: string;
  matchScore?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-applicant function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, applicantEmail, jobTitle, company, matchScore }: NotifyApplicantRequest = await req.json();
    
    console.log("Sending confirmation to:", { applicantName, applicantEmail, jobTitle, company, matchScore });

    // Send confirmation email to applicant
    const emailResponse = await resend.emails.send({
      from: "CareerCompass <onboarding@resend.dev>",
      to: [applicantEmail],
      subject: `Application Confirmed: ${jobTitle} at ${company}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .job-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #6366f1; }
            .match-score { display: inline-block; background: ${matchScore && matchScore >= 70 ? '#22c55e' : matchScore && matchScore >= 40 ? '#f59e0b' : '#6366f1'}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
            .checkmark { font-size: 48px; margin-bottom: 10px; }
            .tips { background: #e0e7ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .tips h4 { color: #4338ca; margin: 0 0 10px 0; }
            .tips ul { margin: 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="checkmark">✅</div>
              <h1 style="margin: 0;">Application Submitted!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your application is on its way</p>
            </div>
            <div class="content">
              <p>Hi ${applicantName || 'there'},</p>
              <p>Great news! Your application has been successfully submitted and the employer has been notified.</p>
              
              <div class="job-card">
                <h3 style="margin-top: 0; color: #6366f1;">📋 Application Details</h3>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${company}</p>
                ${matchScore ? `<p><strong>Your Match Score:</strong> <span class="match-score">${matchScore}%</span></p>` : ''}
                <p><strong>Status:</strong> Pending Review</p>
              </div>
              
              <div class="tips">
                <h4>💡 What's Next?</h4>
                <ul>
                  <li>The employer will review your application</li>
                  <li>You'll receive updates on your application status</li>
                  <li>Keep checking your email for interview invitations</li>
                  <li>Continue exploring other opportunities on CareerCompass</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>Good luck with your application! 🍀</p>
                <p style="color: #94a3b8; font-size: 12px;">This email was sent by CareerCompass</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-applicant function:", error);
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
