function createRow(label, value) {
  if (!value) return "";

  return `
    <tr>
      <td style="padding:8px;font-weight:bold;width:180px;border-bottom:1px solid #eee;">
        ${label}
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;">
        ${value}
      </td>
    </tr>
  `;
}
function candidateDetailsTable(candidate) {
  return `
    <div style="margin:20px 0;">
      <div
        style="
          color:#1976d2;
          font-size:16px;
          font-weight:bold;
          margin-bottom:10px;
        "
      >
        👤 CANDIDATE DETAILS
      </div>

      <table
        style="
          width:100%;
          border-collapse:collapse;
          font-family:Arial,sans-serif;
          border-left:4px solid #1976d2;
          padding-left:10px;
        "
      >
        ${createRow("Full Name", candidate.name)}

        ${createRow(
          "Email Address",
          candidate.email
            ? `<a href="mailto:${candidate.email}">${candidate.email}</a>`
            : null,
        )}

        ${createRow("Phone", candidate.phone)}

        ${createRow(
          "LinkedIn",
          candidate.linkedin
            ? `<a href="${candidate.linkedin}">${candidate.linkedin}</a>`
            : null,
        )}

        ${createRow("Current Location", candidate.location)}
        ${createRow("Open to Relocate", candidate.relocate)}
        ${createRow("Work Authorization", candidate.authorization)}
        ${createRow("Availability", candidate.availability)}
        ${createRow("Total Experience", candidate.experience)}
        ${createRow("Salary", candidate.salary)}
      </table>
    </div>
  `;
}
function jobDescriptionTable(job) {
  const rows = [
    createRow("Position", job.title),
    createRow("Posted By", job.recruiterName),
    createRow("Posted On", job.postedOn),
    createRow(
      "Post Link",
      job.postUrl ? `<a href="${job.postUrl}">View on LinkedIn →</a>` : null,
    ),
    createRow("Location", job.location),
  ]
    .filter(Boolean)
    .join("");

  if (!rows) return "";

  return `
    <div
      style="
        background:#f8f8f8;
        border-left:4px solid #666;
        padding:15px;
        margin:20px 0;
      "
    >
      <div
        style="
          font-weight:bold;
          font-size:16px;
          margin-bottom:10px;
        "
      >
        📋 JOB DESCRIPTION (AS PER LINKEDIN POST)
      </div>

      <table
        style="
          width:100%;
          border-collapse:collapse;
          font-family:Arial,sans-serif;
        "
      >
        ${rows}
      </table>
    </div>
  `;
}
function relevantExperienceBox(points = []) {
  if (!points.length) return "";

  return `
    <div
      style="
        background:#eaf7e8;
        border-left:4px solid #28a745;
        padding:15px;
        margin:20px 0;
      "
    >
      <div
        style="
          color:#28a745;
          font-weight:bold;
          margin-bottom:10px;
        "
      >
        ✅ RELEVANT EXPERIENCE (TAILORED TO THIS ROLE)
      </div>

      <ul style="margin:0;padding-left:20px;">
        ${points.map((point) => `<li style="margin-bottom:8px;">${point}</li>`).join("")}
      </ul>
    </div>
  `;
}

function JsonPromptFromPost(Post_text) {
  return `
    You are an information extraction system.

Extract information from the LinkedIn job post.

Rules:
- Return ONLY valid JSON.
- Do not wrap the response in markdown.
- Do not add explanations.
- If information is missing, use null.
- Extract only information explicitly present in the post.

JSON Schema:

{
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

Job Post:
{${Post_text}}
`;
}
function JsonPromptForResume(resumeText) {
  return `You are a resume parser.

Extract candidate information.

Return ONLY valid JSON.

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
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
${resumeText}`
}
function JsonPromptForHighlight(resumeText, jobDescription){
  return `You are a technical recruiter.

Candidate Resume:
${resumeText}

Job Description:
${jobDescription}

Generate 5 job-relevant highlights.

Rules:
- Use only resume information.
- Do not invent experience.
- Maximum 20 words each.

Return JSON:

{
  "highlights":[]
}`
}
module.exports = {
  candidateDetailsTable,
  jobDescriptionTable,
  relevantExperienceBox,
  JsonPromptFromPost,
  JsonPromptForResume,
  JsonPromptForHighlight
};
