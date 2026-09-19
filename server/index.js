import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS — allow all origins so Netlify / localhost can call API ──
app.use(cors());

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

  // @sparticuz/chromium provides a lightweight Chromium binary
  // that works in containerized environments like Render
  const executablePath = await chromium.executablePath();

  browserInstance = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
  return browserInstance;
}

// ── Foundit / Monster Scraper Endpoint ─────────────────────────
app.get('/scrape/monster', async (req, res) => {
  const query = req.query.query || req.query.term || 'developer';
  const locations = req.query.locations || req.query.location || '';
  const limit = req.query.limit || 25;

  try {
    const url = `https://www.foundit.in/middleware/jobsearch?query=${encodeURIComponent(query)}&locations=${encodeURIComponent(locations)}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'X-Source-Country': 'IN',
        'X-Source-Site-Context': 'rexmonster',
        'Referer': 'https://www.foundit.in/',
      },
    });

    if (!response.ok) {
      throw new Error(`Foundit API responded with status ${response.status}`);
    }

    const data = await response.json();
    const rawJobs = data?.jobSearchResponse?.data || [];
    const jobs = [];

    rawJobs.forEach((job) => {
      // Filter out ads / banners
      if (!job.title && !job.jdUrl) return;

      const title = job.title || `${query} Specialist`;
      const company = job.companyName || job.recruiterName || 'Company via Foundit';
      const locStr = job.locations || locations || 'India';

      let jobUrl = 'https://www.foundit.in';
      if (job.jdUrl) {
        jobUrl = job.jdUrl.startsWith('http') ? job.jdUrl : `https://www.foundit.in${job.jdUrl}`;
      } else if (job.redirectUrl) {
        jobUrl = job.redirectUrl.startsWith('http') ? job.redirectUrl : `https://www.foundit.in${job.redirectUrl}`;
      } else if (job.seoJdUrl) {
        jobUrl = `https://www.foundit.in${job.seoJdUrl}`;
      }

      let skills = [];
      if (typeof job.skills === 'string') {
        skills = job.skills.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(job.skills)) {
        skills = job.skills;
      }

      let salary = 'Not disclosed';
      if (job.salary && job.salary !== '0-0 INR' && job.salary !== '0 INR') {
        salary = job.salary;
      } else if (job.minimumSalary?.absoluteValue && job.minimumSalary.absoluteValue > 0) {
        const minSal = job.minimumSalary.absoluteValue.toLocaleString();
        const maxSal = job.maximumSalary?.absoluteValue ? job.maximumSalary.absoluteValue.toLocaleString() : '';
        const curr = job.minimumSalary.currency || 'INR';
        salary = maxSal ? `${minSal} - ${maxSal} ${curr}` : `${minSal} ${curr}`;
      }

      jobs.push({
        title,
        company,
        location: locStr,
        platform: 'Monster',
        url: jobUrl,
        description: job.description || `${title} at ${company}. Location: ${locStr}`,
        salary,
        experience: job.exp || '',
        skills,
        postedDate: job.postedBy || 'Recently',
      });
    });

    console.log(`[Monster/Foundit] Found ${jobs.length} jobs for ${query} in ${locations}`);
    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[Monster/Foundit Error]:', err.message);
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

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

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Wait for job cards or Next.js hydration
    try {
      await page.waitForSelector(
        '.srp-jobtuple-wrapper, .cust-job-tuple, a[href*="job-listings"]',
        { timeout: 12000 }
      );
    } catch {
      console.warn('[Naukri] Job card selector timed out — waiting briefly before extraction');
    }

    // Give 2.5 seconds for full React rendering
    await new Promise((r) => setTimeout(r, 2500));

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
          'a.comp-name, [class*="comp-name"], a[class*="company"], .comp-name'
        );
        const locEl = card.querySelector(
          '.locWdth, [class*="locWdth"], [class*="location"], .loc-wrap, .ni-job-tuple-icon-srp-location'
        );
        const salEl = card.querySelector(
          '.sal-wrap, [class*="sal"], .ni-job-tuple-icon-srp-rupee, .sal'
        );
        const expEl = card.querySelector(
          '.expwdth, [class*="exp"], .ni-job-tuple-icon-srp-experience'
        );
        const descEl = card.querySelector(
          '.job-desc, [class*="job-desc"], [class*="desc"], .job-description'
        );
        const tagEls = card.querySelectorAll(
          'ul.tags-gt li, [class*="tag"] li, .tag-li, .dot-gt li'
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
      try {
        await page.close();
      } catch {
        /* ignore */
      }
    }
  }
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Naukri & Monster Scraper API running on port ${PORT}`);
  // Pre-warm the browser so first request is faster
  getBrowser().then(() => console.log('✅ Browser pre-warmed'));
});
