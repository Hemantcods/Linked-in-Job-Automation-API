export function JsonPromptFromPost(posts: string[]) {
  return `
You are an information extraction system.

Extract internship/job information from each LinkedIn post.

Rules:
- Return ONLY valid JSON.
- Return an ARRAY.
- Return exactly ${posts.length} objects.
- Maintain the same order as the input posts.
- If a post is not a job/internship opportunity return all fields as null.
- Use null for missing fields.
- Do not hallucinate.
-Extract only technical skills,tools,frameworks,programming languages,platforms.
-Do NOT include(in skills):hashtags,locations,hiring tags,job tags,employment tags.
Schema:

[
  {
    "title": null,
    "companyName": null,
    "recruiterName": null,
    "location": null,
    "employmentType": null,
    "experienceRequired": null,
    "skills": [],
    "email": null,
    "linkedinProfile": null
  }
]

Posts:

${posts
  .map(
    (post, i) => `
POST ${i + 1}:
${post}
`,
  )
  .join("\n\n====================\n\n")}
`;
}
