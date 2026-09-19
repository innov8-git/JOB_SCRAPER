import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS — allow your Netlify frontend ──────────────────────
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      /\.netlify\.app$/,   // any *.netlify.app subdomain
    ],
    methods: ['GET'],
  })
);

// ── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'naukri-scraper-api' });
});

// Keep a browser instance alive to avoid cold-start per request
let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--disable-dev-shm-usage',   // important for Render's low-memory containers
      '--window-size=1280,800',
    ],
  });
  return browserInstance;
}

// ── Naukri scrape endpoint ───────────────────────────────────
app.get('/scrape/naukri', async (req, res) => {
  const term = req.query.term || 'developer';
  const location = req.query.location || '';

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Stealth tweaks
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Build Naukri search URL
    const termSlug = term
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const locSlug = location
      ? location
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '';
    const targetUrl = locSlug
      ? `https://www.naukri.com/${termSlug}-jobs-in-${locSlug}`
      : `https://www.naukri.com/${termSlug}-jobs`;

    console.log(`[Naukri] Scraping: ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Wait for job cards (best-effort)
    try {
      await page.waitForSelector(
        '.srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id]',
        { timeout: 10000 }
      );
    } catch {
      console.warn('[Naukri] Job card selector timed out — extracting whatever is available');
    }

    // Extract job data from DOM
    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '.srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id]'
      );
      const list = [];

      cards.forEach((card) => {
        const titleEl = card.querySelector(
          'a.title, [class*="title"] a, a[href*="job-listings"]'
        );
        const compEl = card.querySelector(
          'a.comp-name, [class*="comp-name"], a[class*="company"]'
        );
        const locEl = card.querySelector(
          '.locWdth, [class*="locWdth"], [class*="location"], .loc-wrap'
        );
        const salEl = card.querySelector(
          '.sal-wrap, [class*="sal"], .ni-job-tuple-icon-srp-rupee'
        );
        const expEl = card.querySelector('.expwdth, [class*="exp"]');
        const descEl = card.querySelector(
          '.job-desc, [class*="job-desc"], [class*="desc"]'
        );
        const tagEls = card.querySelectorAll(
          'ul.tags-gt li, [class*="tag"] li, .tag-li'
        );
        const skills = Array.from(tagEls)
          .map((t) => t.innerText.trim())
          .filter(Boolean);

        const title = titleEl ? titleEl.innerText.trim() : '';
        const href = titleEl ? titleEl.href : '';

        if (title && href) {
          list.push({
            title,
            url: href,
            company: compEl ? compEl.innerText.trim() : 'Company via Naukri',
            location: locEl ? locEl.innerText.trim() : 'India',
            salary: salEl ? salEl.innerText.trim() : 'Not disclosed',
            experience: expEl ? expEl.innerText.trim() : '',
            description: descEl
              ? descEl.innerText.trim()
              : `${title} at ${compEl ? compEl.innerText.trim() : 'Company'}`,
            skills,
            platform: 'Naukri',
          });
        }
      });

      return list;
    });

    console.log(`[Naukri] Found ${jobs.length} jobs`);
    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[Naukri Error]:', err.message);
    res.status(500).json({ success: false, error: err.message, data: [] });
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Naukri Scraper API running on port ${PORT}`);
  // Pre-warm the browser so first request is faster
  getBrowser().then(() => console.log('✅ Browser pre-warmed'));
});
