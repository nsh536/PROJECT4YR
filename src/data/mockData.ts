export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  salary: string;
  description: string;
  requirements: string[];
  posted: string;
  logo: string;
  tags: string[];
}

export interface Candidate {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: string;
  skills: string[];
  avatar: string;
  bio: string;
  education: string;
  availability: string;
  expectedSalary: string;
}

export const jobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "₹12L - ₹16L",
    description: "We're looking for a passionate frontend developer to join our growing team and help build the next generation of web applications.",
    requirements: ["5+ years React experience", "TypeScript proficiency", "Strong CSS skills", "Team collaboration"],
    posted: "2 days ago",
    logo: "TC",
    tags: ["React", "TypeScript", "Tailwind"],
  },
  {
    id: "2",
    title: "Product Designer",
    company: "DesignHub",
    location: "New York, NY",
    type: "Full-time",
    salary: "₹10L - ₹14L",
    description: "Join our design team to create beautiful, user-centered experiences for millions of users worldwide.",
    requirements: ["4+ years product design", "Figma expertise", "User research skills", "Portfolio required"],
    posted: "1 week ago",
    logo: "DH",
    tags: ["Figma", "UI/UX", "Research"],
  },
  {
    id: "3",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    location: "Remote",
    type: "Remote",
    salary: "₹13L - ₹18L",
    description: "Help us build scalable solutions from the ground up. We're a fast-growing startup looking for talented engineers.",
    requirements: ["Node.js & React", "Database design", "API development", "Startup experience preferred"],
    posted: "3 days ago",
    logo: "SX",
    tags: ["Node.js", "React", "PostgreSQL"],
  },
  {
    id: "4",
    title: "Data Scientist",
    company: "DataFlow Inc",
    location: "Austin, TX",
    type: "Full-time",
    salary: "₹14L - ₹19L",
    description: "Transform raw data into actionable insights. Work with cutting-edge ML models and big data technologies.",
    requirements: ["Python & R proficiency", "ML/AI experience", "Statistics background", "PhD preferred"],
    posted: "5 days ago",
    logo: "DF",
    tags: ["Python", "ML", "TensorFlow"],
  },
  {
    id: "5",
    title: "DevOps Engineer",
    company: "CloudNine",
    location: "Seattle, WA",
    type: "Contract",
    salary: "₹15L - ₹20L",
    description: "Build and maintain our cloud infrastructure. We're looking for someone who loves automation and scalability.",
    requirements: ["AWS/GCP expertise", "Kubernetes", "CI/CD pipelines", "Infrastructure as Code"],
    posted: "1 day ago",
    logo: "CN",
    tags: ["AWS", "Kubernetes", "Terraform"],
  },
  {
    id: "6",
    title: "Mobile Developer",
    company: "AppWorks",
    location: "Los Angeles, CA",
    type: "Full-time",
    salary: "₹11L - ₹15L",
    description: "Create stunning mobile experiences for iOS and Android. Join our talented mobile team.",
    requirements: ["React Native", "Swift or Kotlin", "App Store experience", "UI/UX sensibility"],
    posted: "4 days ago",
    logo: "AW",
    tags: ["React Native", "iOS", "Android"],
  },
];

export const candidates: Candidate[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    title: "Senior Software Engineer",
    location: "San Francisco, CA",
    experience: "8 years",
    skills: ["React", "TypeScript", "Node.js", "AWS", "GraphQL"],
    avatar: "SJ",
    bio: "Passionate about building scalable web applications and mentoring junior developers. Previously at Google and Stripe.",
    education: "MS Computer Science, Stanford",
    availability: "Immediately",
    expectedSalary: "₹18L - ₹22L",
  },
  {
    id: "2",
    name: "Michael Chen",
    title: "Product Designer",
    location: "New York, NY",
    experience: "6 years",
    skills: ["Figma", "UI/UX", "Design Systems", "User Research", "Prototyping"],
    avatar: "MC",
    bio: "Design leader with experience at top tech companies. Focused on creating delightful user experiences.",
    education: "BFA Design, Parsons",
    availability: "2 weeks notice",
    expectedSalary: "₹15L - ₹18L",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    title: "Data Scientist",
    location: "Austin, TX",
    experience: "5 years",
    skills: ["Python", "TensorFlow", "SQL", "Tableau", "Statistics"],
    avatar: "ER",
    bio: "Data scientist specializing in machine learning and predictive analytics. Love turning data into actionable insights.",
    education: "PhD Statistics, MIT",
    availability: "1 month notice",
    expectedSalary: "₹16L - ₹20L",
  },
  {
    id: "4",
    name: "David Kim",
    title: "DevOps Engineer",
    location: "Seattle, WA",
    experience: "7 years",
    skills: ["AWS", "Kubernetes", "Docker", "Terraform", "Jenkins"],
    avatar: "DK",
    bio: "Infrastructure enthusiast with a passion for automation. Building reliable and scalable systems.",
    education: "BS Computer Engineering, UW",
    availability: "Immediately",
    expectedSalary: "₹17L - ₹21L",
  },
  {
    id: "5",
    name: "Lisa Wang",
    title: "Full Stack Developer",
    location: "Remote",
    experience: "4 years",
    skills: ["Vue.js", "Python", "PostgreSQL", "Redis", "Docker"],
    avatar: "LW",
    bio: "Full stack developer who loves both frontend and backend challenges. Startup experience at heart.",
    education: "BS Software Engineering, Berkeley",
    availability: "2 weeks notice",
    expectedSalary: "₹13L - ₹16L",
  },
  {
    id: "6",
    name: "James Wilson",
    title: "Mobile Developer",
    location: "Los Angeles, CA",
    experience: "5 years",
    skills: ["React Native", "Swift", "Kotlin", "Firebase", "App Store"],
    avatar: "JW",
    bio: "Mobile developer with apps reaching millions of users. Passionate about creating smooth mobile experiences.",
    education: "BS Computer Science, UCLA",
    availability: "1 week notice",
    expectedSalary: "₹14L - ₹17L",
  },
];
