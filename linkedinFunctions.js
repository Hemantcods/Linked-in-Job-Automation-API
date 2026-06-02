const nodemailer = require("nodemailer");
const { chromium } = require("playwright");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

// LinkedIn Login Function
async function linkedinLogin(page, email, password) {
  console.log("Opening LinkedIn login...");

  await page.goto("https://www.linkedin.com/login");
  console.log(await page.$$("#username"));
  page.waitForTimeout(2000);
  await page.fill("#username", email);
  await page.fill("#password", password);

  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);

  console.log("Logged in successfully");
}

// Search Jobs Function
async function searchJobs(page, keyword, jobType, timeFilter) {
  console.log("Searching jobs...");
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
    keyword + " " + jobType,
  )}&f_TPR=${timeFilter}`;

  await page.goto(searchUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(10000);
  for (let i = 0; i < 5; i++) {
    // scroll the joblist section to load more jobs
    console.log(`Scrolling to load more jobs... (${i + 1}/5)`);

    const jobCards = page.locator(".job-card-container");
    const count = await jobCards.count();
    if (count > 0) {
      await jobCards.nth(count - 1).hover();
      await page.mouse.wheel(0, 1000); // Scroll down to trigger lazy loading
    }

    await page.waitForTimeout(2000);
  }
  console.log("Jobs loaded");
}

// Scrape Jobs Function
async function scrapeJobs(page, maxJobs = 20) {
  console.log("Scraping jobs...");

  const jobs = [];

  const cards = await page.$$(".job-card-container");
  console.log(`Found ${cards.length} jobs`);

  for (let i = 0; i < Math.min(cards.length, maxJobs); i++) {
    try {
      const card = cards[i];
      // click the card
      await card.click();
      await page.waitForTimeout(200);
      // check the left section for the job details
      const leftSection = await page.$(".jobs-search__job-details--wrapper");
      const title = await leftSection.$eval(
        ".job-details-jobs-unified-top-card__job-title",
        (el) => el.innerText.trim(),
      );
      const company = await leftSection.$eval(
        ".job-details-jobs-unified-top-card__company-name",
        (el) => el.innerText.trim(),
      );
      const link = await leftSection.$eval(
        ".job-details-jobs-unified-top-card__job-title a",
        (el) => el.href,
      );
      // const description = await leftSection.$eval(
      //   ".jobs-description-content__text--stretch",
      //   (el) => el.innerText.trim(),
      // );
      jobs.push({
        title,
        company,
        link,
        // description,
      });

      console.log(`${i + 1}. ${title} - ${company}`);
    } catch (err) {
      console.log("Error scraping card:", err.message);
    }
  }

  return jobs;
}

// Save Jobs Function
async function saveJobs(jobs, filePath) {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: "title", title: "TITLE" },
      { id: "company", title: "COMPANY" },
      { id: "link", title: "LINK" },
      { id: "emailStatus", title: "EMAIL_STATUS" }, // Added email status column
      // { id: "description", title: "DESCRIPTION" },
    ],
  });

  // Add emailStatus field to each job if not present
  const jobsWithStatus = jobs.map(job => ({
    ...job,
    emailStatus: job.emailStatus || "pending"
  }));

  await csvWriter.writeRecords(jobsWithStatus);

  console.log(`Saved jobs to ${filePath}`);
}

// Function to send email notification to the recruiter with the resume
async function sendResumeEmail({
  recruiterEmail,
  recruiterName,
  candidateName,
  resumePath,
  jobTitle,
  companyName
}) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  // Email content
  const mailOptions = {
    from: process.env.GMAIL_USER,

    to: recruiterEmail,

    subject: `Application for ${jobTitle}`,

    text: `
Hello ${recruiterName || "Recruiter"},

I hope you are doing well.

I am writing to apply for the ${jobTitle} position at ${companyName}.

Please find my resume attached for your consideration.

Thank you for your time and consideration.

Best Regards,
${candidateName}
    `,

    attachments: [
      {
        filename: "Resume.docx",
        path: resumePath
      }
    ]
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log("Email sent:", info.response);
}

// Generate HR email based on company name
function generateHREmail(companyName) {
  // Clean company name: remove special characters, spaces, and convert to lowercase
  const cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
  
  // Handle common company name variations
  const emailMap = {
    'americanglobalbusinesstravel': 'amex', // American Express
    'buildingandindustrialcontrolsystembicsys': 'bicsys',
    'societegenerateglobalsolutioncentre': 'socgen',
    'google': 'google',
    'deloitte': 'deloitte',
    'nttdatanorthamerica': 'nttdata',
    'persistentsystems': 'persistent',
    'docusign': 'docusign',
    'ust': 'ust',
    'americanexpressglobalbusinesstravel': 'amex'
  };
  
  const domain = 'company.com'; // Default domain
  
  // Check if we have a special mapping
  const mappedName = emailMap[cleanName] || cleanName;
  
  // Truncate if too long
  const finalName = mappedName.length > 20 ? mappedName.substring(0, 20) : mappedName;
  
  return `hr@${finalName}.${domain}`;
}

// Helper function to update email status in CSV
async function updateEmailStatusInCSV(filePath, jobLink, status) {
  const csv = require('csv-parser');
  const fs = require('fs');
  const path = require('path');
  
  const rows = [];
  let fileExists = fs.existsSync(filePath);
  
  if (fileExists) {
    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            if (header === 'TITLE') return 'title';
            if (header === 'COMPANY') return 'company';
            if (header === 'LINK') return 'link';
            if (header === 'EMAIL_STATUS') return 'emailStatus';
            return header;
          }
        }))
        .on('data', (data) => {
          // Update status if this is the job we're looking for
          if (data.link === jobLink) {
            data.emailStatus = status;
          }
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', reject);
    });
    
    // Rewrite the CSV with updated status
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: "title", title: "TITLE" },
        { id: "company", title: "COMPANY" },
        { id: "link", title: "LINK" },
        { id: "emailStatus", title: "EMAIL_STATUS" },
      ],
    });
    
    await csvWriter.writeRecords(results);
  }
}

module.exports = {
  linkedinLogin,
  searchJobs,
  scrapeJobs,
  saveJobs,
  sendResumeEmail,
  updateEmailStatusInCSV,
  generateHREmail
};
