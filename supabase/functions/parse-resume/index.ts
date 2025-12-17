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
    const { resumeId, fileContent } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Parsing resume with AI:', resumeId);

    const systemPrompt = `You are a resume parser. Extract the following information from the resume text and return it as JSON:
{
  "title": "Job title/position the candidate is seeking or currently holds",
  "summary": "Brief professional summary (2-3 sentences)",
  "skills": ["array", "of", "technical", "and", "soft", "skills"],
  "experience_years": number of years of experience (integer),
  "education": "Highest education level and institution",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "duration": "Duration",
      "description": "Brief description"
    }
  ]
}

Be thorough in extracting skills - include programming languages, frameworks, tools, soft skills, certifications, etc.
If information is not available, use reasonable defaults (empty array for skills, 0 for years, empty string for text).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this resume:\n\n${fileContent}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse the JSON from the response
    let parsedData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      parsedData = {
        title: '',
        summary: content,
        skills: [],
        experience_years: 0,
        education: ''
      };
    }

    // Update the resume record with parsed data
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        parsed_data: parsedData,
        skills: parsedData.skills || [],
        experience_years: parsedData.experience_years || 0,
        education: parsedData.education || '',
        summary: parsedData.summary || '',
        title: parsedData.title || '',
        status: 'parsed'
      })
      .eq('id', resumeId);

    if (updateError) {
      console.error('Error updating resume:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      parsedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
