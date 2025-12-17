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
    const { position, requiredSkills } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Searching candidates for position:', position, 'skills:', requiredSkills);

    // Get all parsed resumes with profile info
    const { data: resumes, error: resumesError } = await supabase
      .from('resumes')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email,
          phone,
          location,
          avatar_url
        )
      `)
      .eq('status', 'parsed');

    if (resumesError) throw resumesError;

    // Calculate match scores based on position and skills
    const searchTerms = [
      position?.toLowerCase(),
      ...(requiredSkills || []).map((s: string) => s.toLowerCase())
    ].filter(Boolean);

    const matchedCandidates = resumes?.map(resume => {
      const resumeSkills = (resume.skills || []).map((s: string) => s.toLowerCase());
      const resumeTitle = (resume.title || '').toLowerCase();
      
      let matchScore = 0;
      const matchingSkills: string[] = [];
      
      // Check skills match
      searchTerms.forEach(term => {
        if (resumeSkills.some((skill: string) => skill.includes(term) || term.includes(skill))) {
          matchScore += 20;
          matchingSkills.push(term);
        }
      });
      
      // Check title match
      if (position && resumeTitle.includes(position.toLowerCase())) {
        matchScore += 30;
      }
      
      // Cap at 100
      matchScore = Math.min(matchScore, 100);
      
      return {
        ...resume,
        match_score: matchScore,
        matching_skills: matchingSkills
      };
    }).filter(c => c.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score) || [];

    return new Response(JSON.stringify({ 
      success: true, 
      candidates: matchedCandidates 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search-candidates function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
