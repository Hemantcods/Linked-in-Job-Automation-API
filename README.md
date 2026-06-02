# LinkedIn Job Automation API

A Node.js/Express API that automates LinkedIn job searching, scraping, and application processes.

## Features

- 🔐 LinkedIn authentication with session persistence
- 🔍 Job search with customizable filters (keywords, job type, time range)
- 📊 Job scraping from LinkedIn search results
- 💾 Save scraped jobs to CSV format
- 📧 Automated application email sending with resume attachment
- 📈 Email status tracking per job application
- 🏥 Health check endpoints

## Project Structure

```
linkedin_api/
├── server.js              # Main Express server with API endpoints
├── linkedinFunctions.js   # Core LinkedIn automation functions
├── Hemant_Yadav_Resume.docx  # Sample resume file
├── linkedin_jobs.csv      # Generated CSV with job listings
├── state.json             # LinkedIn session storage (generated)
├── package.json           # Project dependencies
├── .env                   # Environment variables (not committed)
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## API Endpoints

### Job Scraping

**POST** `/api/scrape-jobs`
Initiates LinkedIn job scraping process.

**Request Body:**
```json
{
  "searchKeyword": "JAVA DEVELOPER",
  "searchType": "CONTRACT",
  "timeFilter": "r86400",
  "maxJobs": 20
}
```

**Response:**
```json
{
  "message": "Job scraping completed successfully",
  "count": 15,
  "jobs": [
    {
      "title": "Senior Java Developer",
      "company": "Tech Corp",
      "link": "https://linkedin.com/jobs/view/...",
      "emailStatus": "pending"
    }
  ]
}
```

### Application Sending

**POST** `/api/send-applications`
Sends application emails for scraped jobs.

**Request Body:**
```json
{
  "candidateName": "John Doe",
  "resumePath": "./Hemant_Yadav_Resume.docx",
  "maxApplications": 10
}
```

**Response:**
```json
{
  "message": "Application process completed (test mode - emails logged but not sent)",
  "results": [
    {
      "jobTitle": "Senior Java Developer",
      "company": "Tech Corp",
      "recruiterEmail": "hr@techcorp.company.com",
      "status": "sent",
      "message": "Email would be sent (test mode)"
    }
  ]
}
```

### Status & Data Retrieval

**GET** `/api/status`
Returns current scraping status.

**Response:**
```json
{
  "jobs": [...],
  "status": "completed",
  "error": null
}
```

**GET** `/api/jobs`
Returns all scraped jobs from CSV.

**Response:**
```json
{
  "jobs": [...],
  "count": 15
}
```

**GET** `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-06-02T09:47:00.000Z"
}
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your credentials:
   ```
   LINKEDIN_EMAIL=your_linkedin_email@example.com
   LINKEDIN_PASSWORD=your_linkedin_password
   GMAIL_USER=your_gmail_address@gmail.com
   GMAIL_PASS=your_gmail_app_password
   PORT=3000
   ```
4. Place your resume document in the project root (default: `Hemant_Yadav_Resume.docx`)

## Usage

1. Start the server:
   ```bash
   npm start
   ```
   or for development:
   ```bash
   npm run dev
   ```

2. The server will run on `http://localhost:3000`

3. Use the API endpoints as described above to:
   - Scrape jobs from LinkedIn
   - Send application emails
   - Check scraping status
   - Retrieve job listings

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| LINKEDIN_EMAIL | LinkedIn login email | Yes |
| LINKEDIN_PASSWORD | LinkedIn login password | Yes |
| GMAIL_USER | Gmail address for sending emails | Yes |
| GMAIL_PASS | Gmail app password (not regular password) | Yes |
| PORT | Server port (default: 3000) | No |

## How It Works

1. **Authentication**: The API logs into LinkedIn using Playwright and saves session state to `state.json` for future use.

2. **Job Search**: Navigates to LinkedIn jobs search with specified parameters and scrolls to load more results.

3. **Job Scraping**: Extracts job title, company, and application link from job cards.

4. **Data Storage**: Saves scraped jobs to CSV with columns: TITLE, COMPANY, LINK, EMAIL_STATUS.

5. **Email Processing**: Generates likely HR email addresses based on company names and sends personalized application emails with resume attachment.

6. **Status Tracking**: Updates EMAIL_STATUS in CSV to track which applications have been sent.

## Dependencies

- express: Web framework
- playwright: Browser automation for LinkedIn interaction
- nodemailer: Email sending functionality
- csv-parser & csv-writer: CSV file handling
- dotenv: Environment variable management

## Notes

- The email sending function runs in test mode by default (logs emails but doesn't actually send them)
- To enable actual email sending, modify the `send-applications` endpoint in `server.js`
- **For better email results**: LinkedIn doesn't provide email addresses directly. For production use, consider integrating with a 3rd party paid email finder API (such as Hunter.io, Apollo.io, or similar services) to get accurate HR/company email addresses.
- LinkedIn may block automated access; use responsibly and consider rate limiting
- Always comply with LinkedIn's Terms of Service and applicable laws

## License

ISC License

## Author

Hemant Yadav