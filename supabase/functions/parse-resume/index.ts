import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using multiple strategies
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer);
  let text = '';
  
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(uint8Array);
  
  // Strategy 1: Extract text objects from PDF parentheses
  const textMatches = content.match(/\(([^)]+)\)/g);
  if (textMatches) {
    text = textMatches
      .map(match => match.slice(1, -1))
      .filter(t => t.length > 1 && !/^[\x00-\x1F]+$/.test(t))
      .join(' ');
  }
  
  // Strategy 2: Extract from text streams
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  while ((match = streamRegex.exec(content)) !== null) {
    const streamContent = match[1];
    const readableText = streamContent.match(/[A-Za-z0-9\s.,!?;:'"()\-\/&@#%+]{10,}/g);
    if (readableText) {
      text += ' ' + readableText.join(' ');
    }
  }

  // Strategy 3: Look for BT...ET text blocks (PDF text objects)
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      text += ' ' + tjMatches.map(m => m.replace(/\)\s*Tj/, '').replace(/\(/, '')).join(' ');
    }
    const tjArrayMatches = block.match(/\[([^\]]*)\]\s*TJ/g);
    if (tjArrayMatches) {
      for (const tjArr of tjArrayMatches) {
        const innerTexts = tjArr.match(/\(([^)]*)\)/g);
        if (innerTexts) {
          text += ' ' + innerTexts.map(m => m.slice(1, -1)).join('');
        }
      }
    }
  }
  
  return text.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, fileContent, fileName, fileUrl } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Parsing resume with AI:', resumeId, 'File:', fileName);

    let textContent = fileContent || '';
    
    // If we have a file URL and the content looks like binary/garbled, fetch and parse
    if (fileUrl && (!textContent || textContent.length < 50 || /[\x00-\x08\x0E-\x1F]/.test(textContent.substring(0, 100)))) {
      console.log('Fetching file from URL for better parsing...');
      try {
        const fileResponse = await fetch(fileUrl);
        if (fileResponse.ok) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          const extension = fileName?.toLowerCase().split('.').pop() || '';
          
          if (extension === 'pdf') {
            textContent = await extractTextFromPDF(arrayBuffer);
            console.log('Extracted PDF text length:', textContent.length);
          } else if (extension === 'txt') {
            textContent = new TextDecoder().decode(arrayBuffer);
          } else {
            // For DOCX, try to extract XML content
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const content = decoder.decode(new Uint8Array(arrayBuffer));
            // Extract readable text from DOCX XML
            const textMatches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
            if (textMatches) {
              textContent = textMatches
                .map(match => match.replace(/<[^>]+>/g, ''))
                .join(' ');
            }
          }
        }
      } catch (fetchError) {
        console.error('Error fetching file:', fetchError);
      }
    }

    // Clean up the text content
    textContent = textContent
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Remove non-printable chars
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();

    if (textContent.length < 50) {
      console.log('Warning: Extracted text is very short, using raw content');
      textContent = fileContent || 'Unable to extract text from resume';
    }

    console.log('Text content preview:', textContent.substring(0, 500));

    const systemPrompt = `You are an expert resume parser. Extract the following information from the resume text and return it as JSON:
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

IMPORTANT:
- Be thorough in extracting skills - include programming languages, frameworks, tools, soft skills, certifications, etc.
- Look for keywords and context clues even if the text is partially garbled
- If information is not clearly available, use reasonable defaults (empty array for skills, 0 for years, empty string for text)
- Return ONLY valid JSON, no other text`;

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
          { role: 'user', content: `Parse this resume:\n\n${textContent.substring(0, 15000)}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
        education: '',
        experience: []
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
