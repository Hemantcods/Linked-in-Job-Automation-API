const { chromium } = require("playwright");
const { linkedinLogin } = require("./linkedinFunctions.js");
const fs = require("fs");
const path = require("path");

/**
 * Scrape LinkedIn posts from the last 24 hours for a given search query
 * @param {string} query - Search query for posts
 * @returns {Promise<Array>} Array of post objects
 */
async function scrapeLinkedInPosts(query) {
  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Set to true for production

  let context;
  const stateFilePath = path.join(process.cwd(), "state.json");

  // Check if we have saved session state
  if (fs.existsSync(stateFilePath)) {
    console.log("Loading saved session state...");
    context = await browser.newContext({ storageState: stateFilePath });
  } else {
    console.log("No saved session found, creating new context...");
    context = await browser.newContext();
  }
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "https://www.linkedin.com",
  });
  const page = await context.newPage();

  try {
    // Always attempt to verify/login state to ensure we're properly authenticated
    // and to update the session state
    const email = process.env.LINKEDIN_EMAIL;
    const password = process.env.LINKEDIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables must be set",
      );
    }

    // Check if we're already logged in by looking for feed elements
    let isLoggedIn =true;
    try {
      // Go to LinkedIn feed to check login status
      await page.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await page.waitForTimeout(3000);

      // Check for feed elements that indicate logged-in state
      const feedSelectors = [
        ".feed-identity-module",
        ".global-nav",
        ".nav-item__link",
        '[data-test-id="home-feed-icon"]',
      ];

      for (const selector of feedSelectors) {
        const element = await page.$(selector);
        if (element) {
          isLoggedIn = true;
          break;
        }
      }

      // Also check if we're on a login/welcome page that needs handling
      const currentUrl = page.url();
      // if (currentUrl.includes('login') || currentUrl.includes('checkpoint') ||
      //     currentUrl.includes('welcome') || currentUrl.includes('signup')) {
      //   isLoggedIn = false;
      // }
    } catch (error) {
      console.log("Error checking login status:", error.message);
      isLoggedIn = false;
    }

    if (!isLoggedIn) {
      console.log("Not logged in or session expired, performing login...");
      await linkedinLogin(page, email, password);
      console.log("Logged in successfully");
    } else {
      console.log("Already logged in using saved session");
    }

    // Save/Update the session state for future use
    await context.storageState({ path: stateFilePath });
    console.log("Session state updated and saved to state.json");

    // Handle any potential welcome/consent pages that might appear after login
    await handleWelcomePage(page);

    // Navigate to LinkedIn search for posts from last 24 hours
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}&f_TPR=r86400`;
    // Use domcontentloaded instead of networkidle to avoid timeout issues with background requests
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Wait for content to load with multiple selector attempts
    // await waitForPostsToLoad(page);
    // await page.waitForTimeout(3000); // Additional wait for content to stabilize
    // Scroll to load more posts
    await autoScroll(page);
    // Extract posts
    const posts = await extractPosts(page);

    return posts;
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Wait for posts to load using multiple selector strategies
 * @param {import('playwright').Page} page - Playwright page object
 */
async function waitForPostsToLoad(page) {
  // Try multiple selectors that LinkedIn might use for posts
  const postSelectors = [
    ".feed-shared-update-v2",
    "div[data-chat-entry-point]",
    ".artdeco-card.feed-shared-update-v2",
    ".scaffold-finite-scroll__content",
    ".search-results-container",
    'div[class*="feed-shared-update-v2"]',
  ];

  for (const selector of postSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 8000 });
      console.log(`Posts found with selector: ${selector}`);
      return;
    } catch (error) {
      // Try next selector
      continue;
    }
  }

  // If none of the selectors worked, wait a bit longer and try again
  console.log("Trying to wait for any post-like content...");
  await page.waitForTimeout(5000);
}

/**
 * Handle LinkedIn welcome/consent pages that might appear
 * @param {import('playwright').Page} page - Playwright page object
 */
async function handleWelcomePage(page) {
  try {
    // Wait a bit for any welcome/consent dialogs to appear
    await page.waitForTimeout(2000);

    // Common welcome/consent selectors on LinkedIn
    const welcomeSelectors = [
      // Welcome back modals
      "text=/Welcome back/i",
      "text=/We've missed you/i",
      "text=/See what's new/i",

      // Consent dialogs
      "text=/Accept/i",
      "text=/Agree/i",
      "text=/Allow/i",

      // Specific button selectors
      '.artdeco-modal__actionbar button[aria-label*="Accept"]',
      '.artdeco-modal__actionbar button[aria-label*="Agree"]',
      '.artdeco-modal__actionbar button:has-text("Accept")',
      '.artdeco-modal__actionbar button:has-text("Agree")',
    ];

    for (const selector of welcomeSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found welcome/consent element: ${selector}`);
          await element.click();
          await page.waitForTimeout(1000);
          console.log("Clicked welcome/consent button");
          break; // Exit after first click
        }
      } catch (error) {
        // Selector not found, continue to next
        continue;
      }
    }

    // Check for and dismiss any modals that might have appeared
    const modalSelectors = [
      ".artdeco-modal",
      ".modal-container",
      '[role="dialog"]',
    ];

    for (const selector of modalSelectors) {
      try {
        const modal = await page.$(selector);
        if (modal) {
          // Try to dismiss by clicking outside or on close button
          const closeButton = await modal.$(
            '[aria-label="Dismiss"], [aria-label="Close"], .artdeco-modal__dismiss',
          );
          if (closeButton) {
            await closeButton.click();
            await page.waitForTimeout(500);
            console.log("Dismissed modal");
          }
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.log(
      "Error handling welcome page (continuing anyway):",
      error.message,
    );
    // Continue anyway - welcome page handling is best-effort
  }
}

/**
 * Auto-scroll to load more content
 * @param {import('playwright').Page} page - Playwright page object
 */
async function autoScroll(page) {
  let lastPostCount = 0;
  let sameCount = 0;

  while (sameCount < 3) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(3000);

    const postCount = await page.$$eval(
      'div[role="listitem"]',
      (posts) => posts.length,
    );

    console.log(`Posts loaded: ${postCount}`);

    if (postCount === lastPostCount) {
      sameCount++;
    } else {
      sameCount = 0;
    }

    lastPostCount = postCount;
  }

  console.log("Finished scrolling");
}

/**
 * Extract posts from the current page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Array>} Array of post objects
 */
// async function extractPosts(page) {
//   // Try multiple selectors to find post containers
//  const postElements = await page.$$(
//   'div[componentkey*="FeedType"]'
// );

//   let postElements1 = [];
//   let usedSelector = '';

//   for (const selector of postElements) {
//     try {
//       const elements = await page.$$(selector);
//       if (elements.length > 0) {
//         postElements1 = elements;
//         usedSelector = selector;
//         console.log(`Found ${elements.length} posts using selector: ${selector}`);
//         break;
//       }
//     } catch (error) {
//       continue;
//     }
//   }

//   if (postElements1.length === 0) {
//     console.log('No post elements found with any selector');
//     return [];
//   }

//   const posts = [];

//   for (const postElement of postElements1) {
//     try {
//       // Extract author name - try multiple selectors
//       let author = 'Unknown Author';
//       const authorSelectors = [
//         '.feed-shared-actor__name',
//         '.feed-shared-actor__name span[aria-hidden="true"]',
//         '.update-components-actor__name',
//         '[data-test-id="post-actor-name"]'
//       ];

//       for (const selector of authorSelectors) {
//         try {
//           const authorElement = await postElement.$(selector);
//           if (authorElement) {
//             const text = await authorElement.innerText();
//             if (text && text.trim()) {
//               author = text.trim();
//               break;
//             }
//           }
//         } catch (error) {
//           continue;
//         }
//       }

//       // Extract post content - try multiple selectors
//       let content = '';
//       const contentSelectors = [
//         '.feed-shared-update-v2__description',
//         '.feed-shared-text',
//         '.update-components-text',
//         '[data-test-id="post-content"]'
//       ];

//       for (const selector of contentSelectors) {
//         try {
//           const contentElement = await postElement.$(selector);
//           if (contentElement) {
//             const text = await contentElement.innerText();
//             if (text && text.trim()) {
//               content = text.trim();
//               break;
//             }
//           }
//         } catch (error) {
//           continue;
//         }
//       }

//       // Extract timestamp - try multiple selectors
//       let timestamp = new Date().toISOString();
//       const timeSelectors = [
//         'time',
//         '.feed-shared-actor__sub-description time',
//         '.update-components-actor__meta time',
//         '[data-test-id="post-timestamp"]'
//       ];

//       for (const selector of timeSelectors) {
//         try {
//           const timeElement = await postElement.$(selector);
//           if (timeElement) {
//             const datetime = await timeElement.getAttribute('datetime');
//             if (datetime) {
//               timestamp = datetime;
//               break;
//             }
//           }
//         } catch (error) {
//           continue;
//         }
//       }

//       // Extract post URL - try multiple selectors
//       let postUrl = '';
//       const urlSelectors = [
//         '.feed-shared-update-v2__wrapper a',
//         '.feed-shared-text-v2 a',
//         '.update-components-link',
//         'a[href*="/posts/"]'
//       ];

//       for (const selector of urlSelectors) {
//         try {
//           const linkElement = await postElement.$(selector);
//           if (linkElement) {
//             const href = await linkElement.getAttribute('href');
//             if (href) {
//               postUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
//               break;
//             }
//           }
//         } catch (error) {
//           continue;
//         }
//       }

//       // Only add if we have meaningful content
//       if (content.trim() || author !== 'Unknown Author') {
//         posts.push({
//           author: author,
//           content: content,
//           timestamp: timestamp,
//           postUrl: postUrl,
//           scrapedAt: new Date().toISOString()
//         });

//         console.log(`Post by ${author}: ${content.substring(0, 50)}...`);
//       }
//     } catch (err) {
//       console.warn('Error extracting a post:', err.message);
//       continue;
//     }
//   }

//   return posts;
// }

async function extractPosts(page) {
  const posts = [];

  const postElements = await page.$$('div[role="listitem"]');

  console.log(`Found ${postElements.length} posts`);

  for (const postElement of postElements) {
    try {
      const menuButton = await postElement.$(
        'button[aria-label*="Open control menu"]',
      );

      await menuButton.click();

      await page.waitForTimeout(1000);

      await page.getByText("Copy link to post").click();

      const postUrl = await page.evaluate(() => navigator.clipboard.readText());
      console.log(postUrl)
      const data = await postElement.evaluate((el) => {
        // Author
        let author = "";

        const companyLink = el.querySelector(
          'a[href*="/company/"], a[href*="/in/"]',
        );

        if (companyLink) {
          const spans = companyLink.querySelectorAll("span");

          for (const span of spans) {
            const text = span.textContent?.trim();

            if (text && text.length > 2 && !text.includes("View company")) {
              author = text;
              break;
            }
          }
        }

        // Post Content
        let content = "";

        const textBox = el.querySelector('[data-testid="expandable-text-box"]');

        if (textBox) {
          content = textBox.textContent
            .replace(/\.\.\.\s*more$/i, "")
            .replace(/…\s*more$/i, "")
            .trim();
        }

        // Posted Time
        let postedTime = "";

        const allText = el.innerText;

        const timeMatch = allText.match(/(\d+\s?(m|h|d|w)|Yesterday|Today)/i);

        if (timeMatch) {
          postedTime = timeMatch[0];
        }

        // Post URL
        // let postUrl = "";

        // const postLink =
        //   el.querySelector('a[href*="/posts/"]') ||
        //   el.querySelector('a[href*="/activity/"]');

        // if (postLink) {
        //   postUrl = postLink.href;
        // }

        return {
          author,
          content,
          postedTime,
        };
      });

      if (data.author || data.content) {
        posts.push({...data, postUrl});
      }
    } catch (err) {
      console.warn("Error extracting post:", err.message);
    }
  }

  return posts;
}


module.exports = { scrapeLinkedInPosts };