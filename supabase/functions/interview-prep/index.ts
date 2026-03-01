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
    const { jobTitle, jobDescription, jobSkills, jobRequirements, company, candidateSkills, candidateExperience } = await req.json();

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
            content: `You are an expert interview coach. Generate tailored interview preparation material based on the job posting and candidate's background. Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Generate interview prep for this role:

JOB:
- Title: ${jobTitle}
- Company: ${company}
- Description: ${(jobDescription || '').substring(0, 500)}
- Required Skills: ${(jobSkills || []).join(', ')}
- Requirements: ${(jobRequirements || []).join('; ')}

CANDIDATE:
- Skills: ${(candidateSkills || []).join(', ') || 'Not specified'}
- Experience: ${candidateExperience || 0} years

Return JSON:
{
  "technical_questions": [
    {"question": "Q", "tip": "How to answer well", "difficulty": "easy|medium|hard"}
  ],
  "behavioral_questions": [
    {"question": "Q", "tip": "What they're looking for", "example_framework": "STAR or similar"}
  ],
  "company_research_tips": ["tip1", "tip2", "tip3"],
  "dos_and_donts": {
    "dos": ["do1", "do2", "do3"],
    "donts": ["dont1", "dont2", "dont3"]
  },
  "salary_negotiation_tips": "Brief advice paragraph",
  "closing_questions": ["Question to ask the interviewer 1", "Question 2", "Question 3"]
}

Generate 5 technical questions, 4 behavioral questions, and 3 of everything else.`
          }
        ],
        temperature: 0.4,
        max_tokens: 3000,
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

    return new Response(JSON.stringify({ success: true, prep: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Interview prep error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
