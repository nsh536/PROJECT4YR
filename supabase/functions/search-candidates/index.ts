import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo candidate profiles to supplement real data when fewer than 10 results
const demoCandidates = [
  {
    id: 'demo-1',
    title: 'Full Stack Developer',
    summary: 'Experienced full stack developer with expertise in React, Node.js, and cloud technologies. Built scalable web applications serving thousands of users.',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB', 'GraphQL'],
    experience_years: 4,
    education: 'B.Tech in Computer Science, IIT Delhi',
    status: 'parsed',
    profiles: { full_name: 'Arjun Mehta', email: 'arjun.m@example.com', phone: '+91 98765 43210', location: 'Bangalore, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'TechCorp', position: 'Senior Developer', duration: '2 years', description: 'Led frontend architecture for SaaS platform' }] }
  },
  {
    id: 'demo-2',
    title: 'Data Scientist',
    summary: 'Data scientist skilled in machine learning, deep learning, and statistical analysis. Published research in NLP and computer vision.',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Pandas', 'Scikit-learn', 'NLP'],
    experience_years: 3,
    education: 'M.Sc in Data Science, IISC Bangalore',
    status: 'parsed',
    profiles: { full_name: 'Priya Sharma', email: 'priya.s@example.com', phone: '+91 87654 32109', location: 'Hyderabad, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'DataMinds', position: 'ML Engineer', duration: '2 years', description: 'Built recommendation engines and NLP pipelines' }] }
  },
  {
    id: 'demo-3',
    title: 'Frontend Developer',
    summary: 'Creative frontend developer with a strong eye for design. Specializes in responsive, accessible web applications.',
    skills: ['React', 'Vue.js', 'CSS', 'Tailwind', 'JavaScript', 'Figma'],
    experience_years: 2,
    education: 'B.E in Information Technology, Anna University',
    status: 'parsed',
    profiles: { full_name: 'Karthik Rajan', email: 'karthik.r@example.com', phone: '+91 76543 21098', location: 'Chennai, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'WebStudio', position: 'UI Developer', duration: '1.5 years', description: 'Developed component libraries and design systems' }] }
  },
  {
    id: 'demo-4',
    title: 'Backend Engineer',
    summary: 'Backend engineer experienced in building microservices, RESTful APIs, and distributed systems at scale.',
    skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'Kubernetes', 'Redis'],
    experience_years: 5,
    education: 'M.Tech in Software Engineering, NIT Trichy',
    status: 'parsed',
    profiles: { full_name: 'Sneha Patel', email: 'sneha.p@example.com', phone: '+91 65432 10987', location: 'Pune, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'CloudServe', position: 'Senior Backend Engineer', duration: '3 years', description: 'Designed and maintained high-throughput payment processing systems' }] }
  },
  {
    id: 'demo-5',
    title: 'DevOps Engineer',
    summary: 'DevOps professional with deep expertise in CI/CD pipelines, infrastructure automation, and cloud-native architectures.',
    skills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'Jenkins', 'Linux', 'Ansible'],
    experience_years: 4,
    education: 'B.Tech in Computer Science, VIT Vellore',
    status: 'parsed',
    profiles: { full_name: 'Rahul Verma', email: 'rahul.v@example.com', phone: '+91 54321 09876', location: 'Mumbai, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'InfraOps', position: 'DevOps Lead', duration: '2 years', description: 'Automated deployment pipelines reducing release time by 60%' }] }
  },
  {
    id: 'demo-6',
    title: 'Mobile App Developer',
    summary: 'Mobile developer experienced in building cross-platform apps with React Native and Flutter for iOS and Android.',
    skills: ['React Native', 'Flutter', 'Dart', 'TypeScript', 'Firebase', 'REST APIs'],
    experience_years: 3,
    education: 'B.Sc in Computer Science, Delhi University',
    status: 'parsed',
    profiles: { full_name: 'Ananya Gupta', email: 'ananya.g@example.com', phone: '+91 43210 98765', location: 'Delhi, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'AppForge', position: 'Mobile Developer', duration: '2 years', description: 'Shipped 5+ apps with 100K+ downloads on Play Store' }] }
  },
  {
    id: 'demo-7',
    title: 'UI/UX Designer',
    summary: 'Product designer passionate about user-centered design, prototyping, and design systems for enterprise products.',
    skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'CSS'],
    experience_years: 3,
    education: 'B.Des in Interaction Design, NID Ahmedabad',
    status: 'parsed',
    profiles: { full_name: 'Meera Nair', email: 'meera.n@example.com', phone: '+91 32109 87654', location: 'Kochi, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'DesignLab', position: 'Senior UX Designer', duration: '2 years', description: 'Led design system creation for B2B SaaS product' }] }
  },
  {
    id: 'demo-8',
    title: 'Cloud Architect',
    summary: 'AWS-certified cloud architect with experience designing fault-tolerant, cost-optimized cloud infrastructures.',
    skills: ['AWS', 'Azure', 'GCP', 'Terraform', 'Serverless', 'Microservices', 'Python'],
    experience_years: 6,
    education: 'M.Tech in Cloud Computing, BITS Pilani',
    status: 'parsed',
    profiles: { full_name: 'Vikram Singh', email: 'vikram.s@example.com', phone: '+91 21098 76543', location: 'Noida, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'CloudFirst', position: 'Solutions Architect', duration: '3 years', description: 'Architected multi-region cloud solutions for Fortune 500 clients' }] }
  },
  {
    id: 'demo-9',
    title: 'Cybersecurity Analyst',
    summary: 'Security analyst with hands-on experience in penetration testing, vulnerability assessment, and incident response.',
    skills: ['Network Security', 'SIEM', 'Penetration Testing', 'Python', 'Linux', 'OWASP'],
    experience_years: 3,
    education: 'M.Sc in Cybersecurity, Amity University',
    status: 'parsed',
    profiles: { full_name: 'Deepika Reddy', email: 'deepika.r@example.com', phone: '+91 10987 65432', location: 'Hyderabad, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'SecureNet', position: 'Security Analyst', duration: '2 years', description: 'Conducted vulnerability assessments for banking applications' }] }
  },
  {
    id: 'demo-10',
    title: 'Machine Learning Engineer',
    summary: 'ML engineer building production-ready models for recommendation systems, fraud detection, and predictive analytics.',
    skills: ['Python', 'TensorFlow', 'MLOps', 'SQL', 'Spark', 'Deep Learning', 'Docker'],
    experience_years: 4,
    education: 'M.Tech in AI, IIT Madras',
    status: 'parsed',
    profiles: { full_name: 'Aditya Kumar', email: 'aditya.k@example.com', phone: '+91 09876 54321', location: 'Bangalore, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'AIVentures', position: 'ML Engineer', duration: '2.5 years', description: 'Built real-time fraud detection system processing 1M+ transactions/day' }] }
  },
  {
    id: 'demo-11',
    title: 'QA Automation Engineer',
    summary: 'Quality engineer specializing in test automation frameworks, CI/CD integration, and performance testing.',
    skills: ['Selenium', 'Cypress', 'Jest', 'Python', 'Jenkins', 'Postman', 'JMeter'],
    experience_years: 3,
    education: 'B.Tech in Computer Science, SRM University',
    status: 'parsed',
    profiles: { full_name: 'Kavitha Sundaram', email: 'kavitha.s@example.com', phone: '+91 98712 34567', location: 'Chennai, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'TestPro', position: 'QA Lead', duration: '2 years', description: 'Automated 80% of regression tests reducing QA cycle by 50%' }] }
  },
  {
    id: 'demo-12',
    title: 'Blockchain Developer',
    summary: 'Blockchain developer experienced in smart contract development, DeFi protocols, and Web3 integrations.',
    skills: ['Solidity', 'Ethereum', 'Web3.js', 'React', 'Node.js', 'Smart Contracts'],
    experience_years: 2,
    education: 'B.Tech in Computer Science, IIIT Hyderabad',
    status: 'parsed',
    profiles: { full_name: 'Rohan Joshi', email: 'rohan.j@example.com', phone: '+91 87612 34567', location: 'Pune, India', avatar_url: null },
    parsed_data: { experience: [{ company: 'ChainWorks', position: 'Smart Contract Developer', duration: '1.5 years', description: 'Developed DeFi lending protocol with $10M+ TVL' }] }
  },
];

function scoreDemoCandidate(demo: typeof demoCandidates[0], searchTerms: string[]) {
  const resumeSkills = demo.skills.map(s => s.toLowerCase());
  const resumeTitle = demo.title.toLowerCase();
  let matchScore = 0;
  const matchingSkills: string[] = [];

  searchTerms.forEach(term => {
    if (resumeSkills.some(skill => skill.includes(term) || term.includes(skill))) {
      matchScore += 20;
      matchingSkills.push(term);
    }
  });

  // Title match
  const position = searchTerms[0] || '';
  if (position && resumeTitle.includes(position)) {
    matchScore += 30;
  }

  matchScore = Math.min(matchScore, 100);
  return { ...demo, match_score: matchScore, matching_skills: matchingSkills };
}

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

    // Get all resumes (parsed and pending)
    const { data: resumes, error: resumesError } = await supabase
      .from('resumes')
      .select('*');

    if (resumesError) throw resumesError;

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, phone, location, avatar_url');

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const searchTerms = [
      position?.toLowerCase(),
      ...(requiredSkills || []).map((s: string) => s.toLowerCase())
    ].filter(Boolean);

    // Score real candidates
    const matchedCandidates = resumes?.map(resume => {
      const resumeSkills = (resume.skills || []).map((s: string) => s.toLowerCase());
      const resumeTitle = (resume.title || '').toLowerCase();
      
      let matchScore = 0;
      const matchingSkills: string[] = [];
      
      searchTerms.forEach(term => {
        if (resumeSkills.some((skill: string) => skill.includes(term) || term.includes(skill))) {
          matchScore += 20;
          matchingSkills.push(term);
        }
      });
      
      if (position && resumeTitle.includes(position.toLowerCase())) {
        matchScore += 30;
      }
      
      matchScore = Math.min(matchScore, 100);

      const profile = profilesMap.get(resume.user_id);
      
      return {
        ...resume,
        profiles: profile || null,
        match_score: matchScore,
        matching_skills: matchingSkills
      };
    }).sort((a, b) => b.match_score - a.match_score) || [];

    // If fewer than 10 results, supplement with demo candidates
    const MIN_RESULTS = 10;
    let finalCandidates = [...matchedCandidates];

    if (finalCandidates.length < MIN_RESULTS) {
      const existingIds = new Set(finalCandidates.map(c => c.id));
      const scoredDemos = demoCandidates
        .map(d => scoreDemoCandidate(d, searchTerms))
        .filter(d => !existingIds.has(d.id))
        .sort((a, b) => b.match_score - a.match_score);

      const needed = MIN_RESULTS - finalCandidates.length;
      finalCandidates = [...finalCandidates, ...scoredDemos.slice(0, needed)];
    }

    // Sort final list by match score
    finalCandidates.sort((a, b) => b.match_score - a.match_score);

    return new Response(JSON.stringify({ 
      success: true, 
      candidates: finalCandidates 
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
