import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeSkills, resumeTitle, resumeExperience, resumeEducation, jobTitle, jobSkills, jobRequirements, jobDescription } = await req.json();

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a career development advisor. Analyze a candidate's skills against a job's requirements and provide a detailed skills gap analysis with actionable improvement suggestions. Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Analyze the skills gap between this candidate and job:

CANDIDATE:
- Title: ${resumeTitle || 'Not specified'}
- Skills: ${(resumeSkills || []).join(', ') || 'None listed'}
- Experience: ${resumeExperience || 0} years
- Education: ${resumeEducation || 'Not specified'}

JOB:
- Title: ${jobTitle}
- Required Skills: ${(jobSkills || []).join(', ')}
- Requirements: ${(jobRequirements || []).join('; ')}
- Description: ${(jobDescription || '').substring(0, 400)}

Return JSON with this structure:
{
  "overall_readiness": number (0-100),
  "matched_skills": [{"skill": "name", "proficiency": "strong|moderate|basic"}],
  "missing_skills": [{"skill": "name", "priority": "critical|important|nice-to-have", "suggestion": "How to learn this skill in 1-2 sentences"}],
  "transferable_skills": [{"from": "existing skill", "to": "required skill", "relevance": "explanation"}],
  "recommended_courses": [{"title": "Course name", "platform": "Platform", "duration": "estimated time"}],
  "action_plan": "A 3-step action plan paragraph to bridge the gap"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }
      parsed = JSON.parse(jsonContent);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, analysis: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Skills gap analyzer error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
