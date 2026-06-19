import { chromium, errors, Page } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Scrape LinkedIn posts from the last 24 hours for a given search query
 * @param {string} query - Search query for posts
 * @returns {Promise<Array>} Array of post objects
 */
async function scrapeLinkedInPosts(query: String) {
  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Set to true for production

  let context;
  const stateFilePath = path.join(process.cwd(), "state.json");
  console.log(stateFilePath);
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
    // Check if we're already logged in by looking for feed elements
    let isLoggedIn = true;
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
    } catch (error: any) {
      console.log("Error checking login status:", error.message);
      isLoggedIn = false;
    }

    // Save/Update the session state for future use
    await context.storageState({ path: stateFilePath });
    console.log("Session state updated and saved to state.json");

    // Handle any potential welcome/consent pages that might appear after login
    await handleWelcomePage(page);

    // Navigate to LinkedIn search for posts from last 24 hours
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${query}&f_TPR=r86400`;
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
    // TODO Fix scrolling 


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
async function waitForPostsToLoad(page: Page) {
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
async function handleWelcomePage(page: Page) {
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
  } catch (error: any) {
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
async function autoScroll(page: Page) {
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

async function extractPosts(page: Page) {
  const posts = [];

  const postElements = await page.$$('div[role="listitem"]');

  console.log(`Found ${postElements.length} posts`);

  for (const postElement of postElements) {
    try {
      const menuButton = await postElement.$(
        'button[aria-label*="Open control menu"]',
      );
      if (menuButton) {
        await menuButton.click();
      }
      await page.waitForTimeout(1000);
      await page.getByText("Copy link to post").click();

      const postUrl = await page.evaluate(() => navigator.clipboard.readText());
      const data = await postElement.evaluate((el) => {
        // Author
        let author=""
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

        const allText = (el as HTMLElement).innerText || el.textContent || "";

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
      console.log(data.author)
      if (data.author || data.content) {
        posts.push({ ...data, postUrl });
      }
    } catch (err: any) {
      console.warn("Error extracting post:", err.message);
    }
  }

  return posts;
}

export { scrapeLinkedInPosts };
