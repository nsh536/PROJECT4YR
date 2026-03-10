import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResumeData {
  skills: string[];
  experience_years: number;
  education: string;
  summary: string;
  title: string;
}

interface JobData {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  skills_required: string[];
  experience_min: number;
  requirements: string[];
}

interface AIMatchResult {
  job_id: string;
  overall_score: number;
  skill_match: number;
  experience_match: number;
  education_match: number;
  career_trajectory: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendation: string;
  growth_potential: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, skills, experience_years, education, summary, title } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('AI-powered job matching for resume:', { skills, experience_years, education, title });

    // Get all active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        jobs: [],
        ai_powered: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no Lovable API key, fall back to basic matching
    if (!lovableApiKey) {
      console.log('No LOVABLE_API_KEY, using basic matching');
      const matchedJobs = basicMatching(jobs, skills || []);
      return new Response(JSON.stringify({ 
        success: true, 
        jobs: matchedJobs,
        ai_powered: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare resume context for AI
    const resumeContext = {
      skills: skills || [],
      experience_years: experience_years || 0,
      education: education || '',
      summary: summary || '',
      current_title: title || ''
    };

    // Prepare jobs for AI analysis (limit to avoid token limits)
    const jobsForAnalysis = jobs.slice(0, 10).map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      job_type: job.job_type,
      description: job.description?.substring(0, 200) || '',
      skills_required: job.skills_required || [],
      experience_min: job.experience_min || 0,
      requirements: (job.requirements || []).slice(0, 3)
    }));

    // Call Lovable AI for intelligent matching
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a job matching AI. Return ONLY a JSON array. No markdown, no explanation. Be concise in recommendations (max 15 words each).`
          },
          {
            role: 'user',
            content: `Match candidate to jobs. Return JSON array only.

CANDIDATE: Skills: ${resumeContext.skills.slice(0, 15).join(', ')} | Exp: ${resumeContext.experience_years}yr | Education: ${resumeContext.education.substring(0, 100)} | Title: ${resumeContext.current_title}

JOBS: ${JSON.stringify(jobsForAnalysis)}

Return: [{"job_id":"uuid","overall_score":N,"skill_match":N,"experience_match":N,"education_match":N,"career_trajectory":N,"matching_skills":[],"missing_skills":[],"recommendation":"brief","growth_potential":"brief"}]`
          }
        ],
        temperature: 0.2,
        max_tokens: 6000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        console.log('Rate limited, falling back to basic matching');
        const matchedJobs = basicMatching(jobs, skills || []);
        return new Response(JSON.stringify({ 
          success: true, 
          jobs: matchedJobs,
          ai_powered: false,
          rate_limited: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Fall back to basic matching on any error
      const matchedJobs = basicMatching(jobs, skills || []);
      return new Response(JSON.stringify({ 
        success: true, 
        jobs: matchedJobs,
        ai_powered: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response length:', aiContent.length);

    // Parse AI response with recovery
    let aiMatches: AIMatchResult[] = [];
    try {
      let jsonContent = aiContent.trim();
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.split('```json')[1].split('```')[0].trim();
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.split('```')[1].split('```')[0].trim();
      }
      aiMatches = parseWithRecovery(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      const matchedJobs = basicMatching(jobs, skills || []);
      return new Response(JSON.stringify({ 
        success: true, 
        jobs: matchedJobs,
        ai_powered: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Merge AI scores with job data
    const enrichedJobs = jobs.map(job => {
      const aiMatch = aiMatches.find(m => m.job_id === job.id);
      
      if (aiMatch) {
        return {
          ...job,
          match_score: aiMatch.overall_score,
          skill_match: aiMatch.skill_match,
          experience_match: aiMatch.experience_match,
          education_match: aiMatch.education_match,
          career_trajectory: aiMatch.career_trajectory,
          matching_skills: aiMatch.matching_skills,
          missing_skills: aiMatch.missing_skills,
          recommendation: aiMatch.recommendation,
          growth_potential: aiMatch.growth_potential
        };
      }
      
      // For jobs not analyzed by AI, use basic matching
      const basicMatch = basicMatchSingle(job, skills || []);
      return {
        ...job,
        ...basicMatch
      };
    }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return new Response(JSON.stringify({ 
      success: true, 
      jobs: enrichedJobs,
      ai_powered: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in match-jobs function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Basic matching fallback
function basicMatching(jobs: JobData[], skills: string[]) {
  return jobs.map(job => basicMatchSingle(job, skills))
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

function basicMatchSingle(job: JobData, skills: string[]) {
  const jobSkills = (job.skills_required || []).map((s: string) => s.toLowerCase());
  const resumeSkills = (skills || []).map((s: string) => s.toLowerCase());
  
  const matchingSkills = skills.filter((skill: string) => 
    jobSkills.some((jobSkill: string) => 
      jobSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill)
    )
  );
  
  const matchScore = jobSkills.length > 0 
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 0;
  
  const missingSkills = (job.skills_required || []).filter((skill: string) => 
    !resumeSkills.some((rs: string) => 
      rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs)
    )
  );
  
  return {
    ...job,
    match_score: matchScore,
    skill_match: matchScore,
    experience_match: 50, // Default when no AI
    education_match: 50,
    career_trajectory: 50,
    matching_skills: matchingSkills,
    missing_skills: missingSkills,
    recommendation: matchScore >= 70 
      ? "Good skill match! Consider applying." 
      : matchScore >= 40 
        ? "Partial match. Review requirements carefully."
        : "Limited match. May require additional skills.",
    growth_potential: "Unable to assess without AI analysis."
  };
}
