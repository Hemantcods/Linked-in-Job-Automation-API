import nodemailer from "nodemailer";
import { ApplicationHighlight, SendEmail } from "./application.types";
import { Candidate, CandidateDocumet } from "../candidate/candidate.model";
import { Job, JobDocument } from "../job/job.model";
import { ApplicationBatchModel, ApplicationModel } from "./application.model";
import { JsonPromptForApplication } from "../../ai/prompt";
import { generateJson } from "../../ai/ai";
export async function sendResumeEmail({
  job,
  candidate,
  highlights,
  resumePath,
}: SendEmail) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  // Validate recruiter email
  if (!job.recruiterEmail) {
    throw new Error("Recruiter email is required to send the application");
  }

  // Email content
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: job.recruiterEmail,
    subject: `Submission "${job.title}"`,
    html: ` 
      <p>Hi ${job.recruiterName || "Recruiter"},</p>

<p>Hope you are doing well.</p>

<p>
I came across your LinkedIn post and would like to submit my profile
for the ${job.title} position.
</p>

${candidateDetailsTable(candidate)}

${jobDescriptionTable(job)}

${relevantExperienceBox(highlights)}

<p>
Please find my resume attached for your review.
</p>

<p>
Looking forward to hearing from you.
</p>

<p>
Regards,<br/>
${candidate.name}<br/>
${candidate.email}<br/>
${candidate.phone}
</p>
  `,
    attachments: [
      {
        filename: "Resume.docx",
        path: resumePath,
      },
    ],
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log("Email sent:", info.response);
}

function createRow(label: string, value: string | null | undefined) {
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
function candidateDetailsTable(candidate: Candidate) {
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
        ${createRow("Open to Relocate", "yes")}
        ${createRow("Work Authorization", "yes")}
        ${createRow("Availability", "yes")}
        ${createRow("Total Experience", candidate.experienceYears)}
        ${createRow("Salary", null)}
      </table>
    </div>
  `;
}

function jobDescriptionTable(job: Job) {
  const rows = [
    createRow("Position", job.title),
    createRow("Posted By", job.recruiterName),
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

function relevantExperienceBox(points: string[]) {
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
async function processSingleApplication(
  batchId: string,
  candidate: CandidateDocumet,
  job: JobDocument,
) {
  // prevent duplicates
  const existing = await ApplicationModel.findOne({
    candidateId:candidate._id,
    jobId: job._id,
  });

  if (existing) {
    return;
  }
  // //   TODO implement highlight and resume update feature
  const ApplicationPrompt=JsonPromptForApplication(candidate,job)
  const {highlights,resumeEnhancements}=await generateJson<ApplicationHighlight>(ApplicationPrompt)
  const resumePath = "./uploads/resume.docx";
  await sendResumeEmail({ job, candidate, highlights, resumePath });
  await ApplicationModel.create({
    batchId,
    candidateId:candidate._id,
    jobId: job._id,
    recruiterEmail: job.recruiterEmail as string,
    status: "sent",
    appliedAt: new Date(),
  });
}

export async function processApplications(
  batchId: string,
  candidate: CandidateDocumet,
  jobs: JobDocument[],
) {
  try {
    await ApplicationBatchModel.findByIdAndUpdate(batchId, {
      status: "processing",
    });
    for (const job of jobs) {
      try {
        processSingleApplication(batchId, candidate, job);
        await ApplicationBatchModel.findByIdAndUpdate(batchId, {
          $inc: {
            completedJobs: 1,
          },
        });
      } catch (error) {
        // console.error(`Failed Job ${job._id}`, error);
        await ApplicationBatchModel.findByIdAndUpdate(batchId, {
          $inc: {
            completedJobs: 1,
            failedJobs: 1,
          },
        });
      }
    }
    await ApplicationBatchModel.findByIdAndUpdate(batchId, {
      status: "completed",
      finishedAt: new Date(),
    });
  } catch (error: any) {
    await ApplicationBatchModel.findByIdAndUpdate(batchId, {
      status: "failed",
      finishedAt: new Date(),
    });
    throw error;
  }
}
