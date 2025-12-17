import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, skills } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Matching jobs for skills:', skills);

    // Get all active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) throw jobsError;

    // Calculate match scores
    const matchedJobs = jobs?.map(job => {
      const jobSkills = (job.skills_required || []).map((s: string) => s.toLowerCase());
      const resumeSkills = (skills || []).map((s: string) => s.toLowerCase());
      
      const matchingSkills = resumeSkills.filter((skill: string) => 
        jobSkills.some((jobSkill: string) => 
          jobSkill.includes(skill) || skill.includes(jobSkill)
        )
      );
      
      const matchScore = jobSkills.length > 0 
        ? Math.round((matchingSkills.length / jobSkills.length) * 100)
        : 0;
      
      return {
        ...job,
        match_score: matchScore,
        matching_skills: matchingSkills
      };
    }).sort((a, b) => b.match_score - a.match_score) || [];

    return new Response(JSON.stringify({ 
      success: true, 
      jobs: matchedJobs 
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
