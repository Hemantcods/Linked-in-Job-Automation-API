export interface Project {
  name: string;
  skillsUsed: string[];
  summary: string;
}

export interface Experience {
  title: string;
  company: string;
  summary: string;
}

export interface Candidate {
  name: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  experienceYears: string;

  projects: Project[];

  experience: Experience[];
}