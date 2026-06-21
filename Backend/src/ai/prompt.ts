import { Candidate } from "../modules/candidate/candidate.model";
import { Job } from "../modules/job/job.model";

export function JsonPromptFromPost(posts: string[]) {
  const formattedPosts = posts.map((post, index) => ({
    index,
    content: post,
  }));

  return `
You are an information extraction system.

Extract job information from each LinkedIn post.

Rules:
- Return ONLY valid JSON.
- Do not wrap the response in markdown.
- Do not add explanations.
- Preserve the input index exactly.
- Return one object for each input post.
- If a post is not a job post, return all fields as null/empty values.
- Extract only information explicitly present in the post.

Output Schema:

[
  {
    "index": 0,
    "title": "",
    "companyName": "",
    "recruiterName": "",
    "location": "",
    "employmentType": "",
    "experienceRequired": "",
    "skills": [],
    "email": "",
    "linkedinProfile": "",
    "jobSummary": ""
  }
]

Posts:
${JSON.stringify(formattedPosts, null, 2)}
`;
}

export function JsonPromptForResume(resumeText: string) {
  return `You are a resume parser.

Extract candidate information.

Return ONLY valid JSON.

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin":"",
  "skills": [],
  "experienceYears": "",
  "projects": [
    {
      "name": "",
      "skillsUsed": [],
      "summary": ""
    }
  ],
  "experience": [
    {
      "title": "",
      "company": "",
      "summary": ""
    }
  ]
}

Resume:
${resumeText}`;
}
export function JsonPromptForApplication(
  candidate: Candidate,
  job: Job
) {
  return `
You are a recruiter assistant.

Candidate:
${JSON.stringify(candidate)}

Job:
${JSON.stringify(job)}

Tasks:

1. Generate 5 concise highlights for an outreach email.
2. Generate up to 5 resume enhancement bullet points that make the candidate's existing experience more relevant to the job.
3. Do not invent any skills, projects, companies, or experience.

Return ONLY valid JSON:

{
  "highlights": [],
  "resumeEnhancements": []
}
`;
}