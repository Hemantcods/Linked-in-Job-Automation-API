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

There are exactly ${posts.length} posts.

Return exactly ${posts.length} JSON objects.

Rules:
- Return ONLY valid JSON.
- Do not wrap the response in markdown.
- Do not add explanations.
- Preserve the input index exactly.
- There are multiple Job posts in the Posts return them in the schema, in the from of json in array
- If there are multiple posts return the posts data in a array, with the respective index
- If a post is not a job post, return all fields as null/empty values.
- If recruter email is not present, return all other fields as null/empty values.
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
export function JsonPromptForApplication(candidate: Candidate, job: Job) {
  return `
You are an expert technical recruiter and resume writer.

Candidate:
${JSON.stringify(candidate)}

Job:
${JSON.stringify(job)}

Rules:
- Do NOT invent skills, projects, companies, achievements, numbers, or experience.
- Only use information already present in the candidate profile.
- Rewrite existing experience in a stronger and more job-relevant way.
- Output resume-ready bullet points, not instructions.
- Each bullet should sound professional and achievement-oriented.
- Focus on technologies and responsibilities that match the job.

Tasks:

1. Generate 5 concise highlights for an outreach email.
2. Generate up to 5 ATS-friendly resume bullet points that can be directly pasted into the resume.

Return ONLY valid JSON:

{
  "highlights": [],
  "resumeEnhancements": []
}
`;
}
