const nodemailer = require("nodemailer");
const { chromium } = require("playwright");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const dotenv = require("dotenv");
const {
  candidateDetailsTable,
  jobDescriptionTable,
  relevantExperienceBox,
} = require("./data");
dotenv.config();

// LinkedIn Login Function
async function linkedinLogin(page, email, password) {
  console.log("Opening LinkedIn login...");

  try {
    // Navigate to LinkedIn login page with longer timeout and different wait conditions
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Additional wait for page to settle
    await page.waitForTimeout(3000);

    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    // Fill in credentials
    const emailInput = page.locator('input[type="email"]').first();

    await emailInput.click();
    await emailInput.fill(email);
    // TODO fix the login system

    // Click submit button
    const submitSelectors = [
      'button[type="submit"]',
      ".login__form_action_container button",
      'button[data-litms-control-urn^="login-submit"]',
    ];

    let submitButtonFound = false;
    for (const selector of submitSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: "visible",
          timeout: 5000,
        });
        console.log(`Found submit button with selector: ${selector}`);
        await page.click(selector);
        submitButtonFound = true;
        break;
      } catch (error) {
        console.log(`Submit selector ${selector} not found: ${error.message}`);
      }
    }

    if (!submitButtonFound) {
      throw new Error("Could not find submit button with any selector");
    }

    // Wait for navigation or successful login
    await page.waitForTimeout(8000);

    // Check if login was successful by looking for elements that indicate logged-in state
    try {
      await page.waitForSelector(
        ".global-nav, .feed-identity-module, .nav-item__link",
        { timeout: 10000 },
      );
      console.log("Logged in successfully");
      return;
    } catch (error) {
      console.log(
        "Login may have failed - checking for error messages or captcha...",
      );

      // Check for error messages
      const errorSelectors = [
        ".alert-error",
        ".form__label--error",
        ".login__form_error_message",
        ".form__label--error",
      ];

      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await errorElement.textContent();
          console.log(`Login error found: ${errorText.trim()}`);
          if (
            errorText.toLowerCase().includes("invalid") ||
            errorText.toLowerCase().includes("incorrect") ||
            errorText.toLowerCase().includes("wrong")
          ) {
            throw new Error(`Invalid credentials: ${errorText.trim()}`);
          }
          break;
        }
      }

      // Check for captcha or security challenge
      const captchaSelectors = [
        ".captcha",
        ".challenge",
        "[data-challenge-type]",
        "text=/security verification/i",
        "text=/verify your identity/i",
      ];

      for (const selector of captchaSelectors) {
        const captchaElement = await page.$(selector);
        if (captchaElement) {
          console.log("Captcha or security challenge detected");
          throw new Error(
            "LinkedIn requires additional verification (captcha/security check)",
          );
        }
      }

      // Check if we're still on login page or got redirected
      const currentUrl = page.url();
      console.log(`Current URL after login attempt: ${currentUrl}`);

      if (
        currentUrl.includes("login") ||
        currentUrl.includes("checkpoint") ||
        currentUrl.includes("challenge")
      ) {
        throw new Error(
          `Login failed - still on authentication page: ${currentUrl}`,
        );
      }

      // If we got here, assume login might have succeeded despite no global-nav
      console.log(
        "Login attempt completed - assuming success if not on login page",
      );
    }
  } catch (error) {
    console.error(`Login failed with error: ${error.message}`);
    throw error;
  }
}

// Search Jobs Function
async function searchPosts(page, keyword, jobType, timeFilter) {
  console.log("Searching jobs...");
  const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
    keyword + " " + jobType,
  )}&f_TPR=${timeFilter}`;

  await page.goto(searchUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(10000);
  for (let i = 0; i < 1; i++) {
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
async function scrapeJobs(page, maxJobs = 1) {
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
async function readPostsFromPage(page) {
  console.log("Reading posts from page...");

  // const posts = [];
  const posts = page.locator("div.feed-shared-update-v2");

  const count = await posts.count();
  console.log(`Found ${count} posts`);
  for (let i = 0; i < count; i++) {
    const post = posts.nth(i);

    const html = await post.innerHTML();

    // console.log(html);
  }
  for (let i = 0; i < postElements.length; i++) {
    try {
      const post = postElements[i];
      const content = await post.$eval(
        ".feed-shared-update-v2__description",
        (el) => el.innerText.trim(),
      );
      const author = await post.$eval(".feed-shared-actor__name", (el) =>
        el.innerText.trim(),
      );
      const timestamp = await post.$eval("time", (el) =>
        el.getAttribute("datetime"),
      );

      posts.push({ author, content, timestamp });

      console.log(
        `Post ${i + 1} by ${author}: ${content.substring(0, 100)}...`,
      );
    } catch (err) {
      console.log(`Error reading post ${i + 1}:`, err.message);
    }
  }
  return posts;
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
  const jobsWithStatus = jobs.map((job) => ({
    ...job,
    emailStatus: job.emailStatus || "pending",
  }));

  await csvWriter.writeRecords(jobsWithStatus);

  console.log(`Saved jobs to ${filePath}`);
}

// Function to send email notification to the recruiter with the resume
async function sendResumeEmail({ job, candidate, highlights, resumePath }) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  // Email content
  const mailOptions = {
    from: process.env.GMAIL_USER,

    to: job.recruterEmail,

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

// Generate HR email based on company name
function generateHREmail(companyName) {
  // Clean company name: remove special characters, spaces, and convert to lowercase
  const cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");

  // Handle common company name variations
  const emailMap = {
    americanglobalbusinesstravel: "amex", // American Express
    buildingandindustrialcontrolsystembicsys: "bicsys",
    societegenerateglobalsolutioncentre: "socgen",
    google: "google",
    deloitte: "deloitte",
    nttdatanorthamerica: "nttdata",
    persistentsystems: "persistent",
    docusign: "docusign",
    ust: "ust",
    americanexpressglobalbusinesstravel: "amex",
  };

  const domain = "company.com"; // Default domain

  // Check if we have a special mapping
  const mappedName = emailMap[cleanName] || cleanName;

  // Truncate if too long
  const finalName =
    mappedName.length > 20 ? mappedName.substring(0, 20) : mappedName;

  return `hr@${finalName}.${domain}`;
}

// Helper function to update email status in CSV
async function updateEmailStatusInCSV(filePath, jobLink, status) {
  const csv = require("csv-parser");
  const fs = require("fs");
  const path = require("path");

  const rows = [];
  let fileExists = fs.existsSync(filePath);

  if (fileExists) {
    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv({
            mapHeaders: ({ header }) => {
              if (header === "TITLE") return "title";
              if (header === "COMPANY") return "company";
              if (header === "LINK") return "link";
              if (header === "EMAIL_STATUS") return "emailStatus";
              return header;
            },
          }),
        )
        .on("data", (data) => {
          // Update status if this is the job we're looking for
          if (data.link === jobLink) {
            data.emailStatus = status;
          }
          results.push(data);
        })
        .on("end", () => {
          resolve(results);
        })
        .on("error", reject);
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

/**
 * Allows for manual login to create a session state file.
 * This is useful when automated login fails due to CAPTCHA or other security checks.
 * @param {string} stateFilePath - The path to save the session state file.
 */
async function createManualLoginSession(stateFilePath = "state.json") {
  console.log("Starting manual login session creation...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to LinkedIn login page...");
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("\n==================================================");
    console.log(
      "Please log in to your LinkedIn account manually in the browser window.",
    );
    console.log("The script will continue automatically after successful login.");
    console.log("==================================================\n");

    // Wait for successful login, which is usually a navigation to the feed.
    await page.waitForURL("https://www.linkedin.com/feed/**", {
      timeout: 300000, // 5 minutes timeout for manual login
    });

    console.log("Login successful! Saving session state...");

    // Save the session state to the specified file
    await context.storageState({ path: stateFilePath });

    console.log(`Session state saved successfully to ${stateFilePath}`);
    console.log("You can now run the scraper, which will use this saved session.");
  } catch (error) {
    console.error("Error during manual login session creation:", error);
    if (error.name === "TimeoutError") {
      console.error("Login was not completed within the 5-minute time limit.");
    }
    throw error;
  } finally {
    console.log("Closing browser.");
    await browser.close();
  }
}

module.exports = {
  linkedinLogin,
  searchPosts,
  scrapeJobs,
  saveJobs,
  sendResumeEmail,
  updateEmailStatusInCSV,
  generateHREmail,
  readPostsFromPage,
  createManualLoginSession,
};
