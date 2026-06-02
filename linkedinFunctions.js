const nodemailer = require("nodemailer");
const { chromium } = require("playwright");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

// LinkedIn Login Function
async function linkedinLogin(page, email, password) {
  console.log("Opening LinkedIn login...");

  try {
    // Navigate to LinkedIn login page with longer timeout and different wait conditions
    await page.goto("https://www.linkedin.com/login", { 
      waitUntil: "domcontentloaded", 
      timeout: 60000 
    });
    
    // Additional wait for page to settle
    await page.waitForTimeout(3000);
    
    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    
    // Wait for the username field to be present and visible with multiple selector attempts
    const usernameSelectors = [
      'input[type="email"]',
      '#username',
      'input[name="session_key"]',
      'input[autocomplete="username"]'
    ];
    
    let usernameFieldFound = false;
    for (const selector of usernameSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        console.log(`Found username field with selector: ${selector}`);
        usernameFieldFound = true;
        break;
      } catch (error) {
        console.log(`Selector ${selector} not found: ${error.message}`);
      }
    }
    
    if (!usernameFieldFound) {
      throw new Error('Could not find username field with any selector');
    }
    
    // Wait for password field
    const passwordSelectors = [
      'input[type="password"]',
      '#password',
      'input[name="session_password"]',
      'input[autocomplete="current-password"]'
    ];
    
    let passwordFieldFound = false;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        console.log(`Found password field with selector: ${selector}`);
        passwordFieldFound = true;
        break;
      } catch (error) {
        console.log(`Selector ${selector} not found: ${error.message}`);
      }
    }
    
    if (!passwordFieldFound) {
      throw new Error('Could not find password field with any selector');
    }
    
    // Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Click submit button
    const submitSelectors = [
      'button[type="submit"]',
      '.login__form_action_container button',
      'button[data-litms-control-urn^="login-submit"]'
    ];
    
    let submitButtonFound = false;
    for (const selector of submitSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        console.log(`Found submit button with selector: ${selector}`);
        await page.click(selector);
        submitButtonFound = true;
        break;
      } catch (error) {
        console.log(`Submit selector ${selector} not found: ${error.message}`);
      }
    }
    
    if (!submitButtonFound) {
      throw new Error('Could not find submit button with any selector');
    }
    
    // Wait for navigation or successful login
    await page.waitForTimeout(8000);
    
    // Check if login was successful by looking for elements that indicate logged-in state
    try {
      await page.waitForSelector('.global-nav, .feed-identity-module, .nav-item__link', { timeout: 10000 });
      console.log("Logged in successfully");
      return;
    } catch (error) {
      console.log("Login may have failed - checking for error messages or captcha...");
      
      // Check for error messages
      const errorSelectors = [
        '.alert-error',
        '.form__label--error',
        '.login__form_error_message',
        '.form__label--error'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await errorElement.textContent();
          console.log(`Login error found: ${errorText.trim()}`);
          if (errorText.toLowerCase().includes('invalid') || 
              errorText.toLowerCase().includes('incorrect') ||
              errorText.toLowerCase().includes('wrong')) {
            throw new Error(`Invalid credentials: ${errorText.trim()}`);
          }
          break;
        }
      }
      
      // Check for captcha or security challenge
      const captchaSelectors = [
        '.captcha',
        '.challenge',
        '[data-challenge-type]',
        'text=/security verification/i',
        'text=/verify your identity/i'
      ];
      
      for (const selector of captchaSelectors) {
        const captchaElement = await page.$(selector);
        if (captchaElement) {
          console.log('Captcha or security challenge detected');
          throw new Error('LinkedIn requires additional verification (captcha/security check)');
        }
      }
      
      // Check if we're still on login page or got redirected
      const currentUrl = page.url();
      console.log(`Current URL after login attempt: ${currentUrl}`);
      
      if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
        throw new Error(`Login failed - still on authentication page: ${currentUrl}`);
      }
      
      // If we got here, assume login might have succeeded despite no global-nav
      console.log("Login attempt completed - assuming success if not on login page");
    }
  } catch (error) {
    console.error(`Login failed with error: ${error.message}`);
    throw error;
  }
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
