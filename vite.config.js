import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

/**
 * Custom Vite plugin providing an internal API endpoint to scrape Naukri jobs
 * using the local Chrome or Edge browser in headless stealth mode.
 */
function naukriScraperPlugin() {
  let browserPromise = null;

  async function getBrowser() {
    if (browserPromise) {
      try {
        const b = await browserPromise;
        if (b.isConnected()) return b;
      } catch {
        browserPromise = null;
      }
    }
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    let execPath = null;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        execPath = p;
        break;
      }
    }
    if (!execPath) throw new Error('Neither Chrome nor Edge was found on this system');

    browserPromise = puppeteer.launch({
      executablePath: execPath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });
    return browserPromise;
  }

  return {
    name: 'naukri-scraper-plugin',
    configureServer(server) {
      server.middlewares.use('/api/scrape/naukri', async (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const term = urlObj.searchParams.get('term') || 'developer';
        const location = urlObj.searchParams.get('location') || '';

        try {
          const browser = await getBrowser();
          const page = await browser.newPage();
          try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1280, height: 800 });
            await page.evaluateOnNewDocument(() => {
              Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });

            const termSlug = term.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const locSlug = location ? location.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
            const targetUrl = locSlug
              ? `https://www.naukri.com/${termSlug}-jobs-in-${locSlug}`
              : `https://www.naukri.com/${termSlug}-jobs`;

            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            try {
              await page.waitForSelector('.srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id]', { timeout: 8000 });
            } catch {
              // If selector wait times out, continue to extract whatever cards exist
            }

            const jobs = await page.evaluate(() => {
              const cards = document.querySelectorAll('.srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id]');
              const list = [];
              cards.forEach((card) => {
                const titleEl = card.querySelector('a.title, [class*="title"] a, a[href*="job-listings"]');
                const compEl = card.querySelector('a.comp-name, [class*="comp-name"], a[class*="company"]');
                const locEl = card.querySelector('.locWdth, [class*="locWdth"], [class*="location"], .loc-wrap');
                const salEl = card.querySelector('.sal-wrap, [class*="sal"], .ni-job-tuple-icon-srp-rupee');
                const expEl = card.querySelector('.expwdth, [class*="exp"]');
                const descEl = card.querySelector('.job-desc, [class*="job-desc"], [class*="desc"]');
                const tagEls = card.querySelectorAll('ul.tags-gt li, [class*="tag"] li, .tag-li');
                const skills = Array.from(tagEls).map(t => t.innerText.trim()).filter(Boolean);

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
                    description: descEl ? descEl.innerText.trim() : `${title} at ${compEl ? compEl.innerText.trim() : 'Company'}`,
                    skills,
                    platform: 'Naukri',
                  });
                }
              });
              return list;
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: jobs }));
          } finally {
            await page.close();
          }
        } catch (err) {
          console.error('[NaukriScraper Error]:', err.message);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message, data: [] }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), naukriScraperPlugin()],
  server: {
    proxy: {
      // LinkedIn guest job search API — returns HTML job cards without auth
      '/proxy/linkedin': {
        target: 'https://www.linkedin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/linkedin/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      // Monster / Foundit free job search API — returns JSON
      '/proxy/monster': {
        target: 'https://www.foundit.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/monster/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'X-Source-Country': 'IN',
          'X-Source-Site-Context': 'rexmonster',
          'Referer': 'https://www.foundit.in/',
        },
      },
    },
  },
})
