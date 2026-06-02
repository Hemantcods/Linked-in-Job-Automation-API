const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Import our LinkedIn functions
const { 
  linkedinLogin, 
  searchJobs, 
  scrapeJobs, 
  saveJobs, 
  sendResumeEmail,
  updateEmailStatusInCSV,
  generateHREmail
} = require('./linkedinFunctions');

// Store scraping results
let scrapingResults = {
  jobs: [],
  status: 'idle', // idle, running, completed, error
  error: null
};

// Endpoint to start job scraping
app.post('/api/scrape-jobs', async (req, res) => {
  try {
    // Prevent concurrent scraping
    if (scrapingResults.status === 'running') {
      return res.status(409).json({ error: 'Scraping already in progress' });
    }

    // Reset results
    scrapingResults = {
      jobs: [],
      status: 'running',
      error: null
    };

    // Get parameters from request
    const { 
      searchKeyword = 'JAVA DEVELOPER', 
      searchType = 'CONTRACT',
      timeFilter = 'r86400', // Last 24 hours
      maxJobs = 20 
    } = req.body;

    console.log(`Starting job search for: ${searchKeyword} ${searchType}`);

    // Launch browser
    const browser = await chromium.launch({
      headless: true, // Change to false for debugging
      slowMo: 50
    });

    let context;
    if (fs.existsSync('state.json')) {
      context = await browser.newContext({ storageState: 'state.json' });
    } else {
      context = await browser.newContext();
    }
    
    const page = await context.newPage();
    
    try {
      // Login if needed
      if (!fs.existsSync('state.json')) {
        await linkedinLogin(page, process.env.LINKEDIN_EMAIL, process.env.LINKEDIN_PASSWORD);
        await context.storageState({ path: 'state.json' });
      }

      // Search jobs
      await searchJobs(page, searchKeyword, searchType, timeFilter);

      // Scrape jobs
      const jobs = await scrapeJobs(page, maxJobs);

      // Save to CSV
      await saveJobs(jobs, 'linkedin_jobs.csv');

      // Update results
      scrapingResults = {
        jobs,
        status: 'completed',
        error: null
      };

      res.json({
        message: 'Job scraping completed successfully',
        count: jobs.length,
        jobs
      });
    } catch (error) {
      scrapingResults = {
        jobs: [],
        status: 'error',
        error: error.message
      };
      
      throw error;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error in scrape-jobs endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to send application emails
app.post('/api/send-applications', async (req, res) => {
  try {
    const { 
      candidateName, 
      resumePath = './Hemant_Yadav_Resume.docx',
      maxApplications = 10 
    } = req.body;

    // Read jobs from CSV
    const jobs = await readJobsFromCSV('linkedin_jobs.csv');
    console.log(jobs)
    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ error: 'No jobs found. Please run scraping first.' });
    }

    // Limit applications
    const applicationsToSend = jobs.slice(0, maxApplications);
    const results = [];

    // Send emails (in test mode, just log what would be sent)
    for (const job of applicationsToSend) {
      try {
        // Generate HR email based on company name
        console.log(job)
        const recruiterEmail = generateHREmail(job.company);
        const recruiterName = "HR Team"; // Generic name since we don't have actual recruiter name
        
        console.log(`Would send email to: ${recruiterEmail} for ${job.title} at ${job.company}`);
        
        // In a real implementation, we would send the email here:
        await sendResumeEmail({
          recruiterEmail,
          recruiterName,
          candidateName,
          resumePath,
          jobTitle: job.title,
          companyName: job.company
        });
        
        // Update email status in CSV
        await updateEmailStatusInCSV('linkedin_jobs.csv', job.link, 'sent');
        
        results.push({
          jobTitle: job.title,
          company: job.company,
          recruiterEmail,
          status: 'sent',
          message: 'Email would be sent (test mode)'
        });
      } catch (error) {
        // Update email status in CSV as failed
        await updateEmailStatusInCSV('linkedin_jobs.csv', job.link, 'failed');
        
        results.push({
          jobTitle: job.title,
          company: job.company,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Application process completed (test mode - emails logged but not sent)',
      results
    });
  } catch (error) {
    console.error('Error in send-applications endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get scraping status
app.get('/api/status', (req, res) => {
  res.json(scrapingResults);
});

// Endpoint to get scraped jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await readJobsFromCSV('linkedin_jobs.csv');
    res.json({ jobs: jobs || [], count: jobs ? jobs.length : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Diagnostic listeners to catch silent crashes and unexpected exits
server.on('error', (err) => console.error('-> Server error:', err));

process.on('uncaughtException', (err) => console.error('-> Uncaught Exception:', err));

process.on('unhandledRejection', (reason) => console.error('-> Unhandled Rejection:', reason));

process.on('exit', (code) => {
  console.log(`-> Process exited with code: ${code}`);
  console.log(`   (If code is 0, another package explicitly called process.exit(0) or the event loop was forcibly emptied)`);
});

// Helper function to read jobs from CSV
async function readJobsFromCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const csv = require('csv-parser');
  const results = [];
  
  return new Promise((resolve, reject) => {
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
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

module.exports = app
