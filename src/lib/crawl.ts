import puppeteer, { HTTPResponse } from 'puppeteer';
import { URL } from 'url';
import axios from 'axios'
import * as cheerio from 'cheerio'

interface Vulnerability {
  type: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export async function crawlPage(url: string) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );

  console.log(`Visiting ${url}`);
  let response: HTTPResponse | null = null;
  try {
    response = await page.goto(url, { waitUntil: 'networkidle0' });
  } catch (error) {
    console.error(`Failed to navigate to ${url}:`, error);
    await browser.close();
    // Return a specific structure for failed crawls
    return {
      url,
      title: 'Crawl Failed',
      htmlContent: '',
      text: `Failed to navigate to URL.`,
      links: [],
      vulnerabilities: JSON.stringify([{
        type: 'Crawl Error',
        description: `Puppeteer failed to navigate to the page. Error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical'
      }]),
      screenshotBase64: null,
    };
  }

  const base64Image = await page.screenshot({ encoding: 'base64', type: 'png'  });

  const screenshotBase64 = `data:image/png;base64,${base64Image}`;


  const headers = response?.headers() || {};
  const vulnerabilities: Vulnerability[] = [];

  // 1. Clickjacking Check
  const xFrameOptions = headers['x-frame-options']?.toLowerCase();
  const csp = headers['content-security-policy'];
  if (!xFrameOptions && (!csp || !csp.includes('frame-ancestors'))) {
    vulnerabilities.push({
      type: 'Clickjacking',
      description: 'The page is missing the X-Frame-Options header or a Content-Security-Policy with frame-ancestors directive. This could allow the page to be embedded in an iframe on a malicious site.',
      severity: 'Medium',
    });
  }

  // 2. CORS Misconfiguration Check
  const acao = headers['access-control-allow-origin'];
  if (acao === '*') {
    vulnerabilities.push({
      type: 'CORS Misconfiguration',
      description: 'The Access-Control-Allow-Origin header is set to "*", which is overly permissive. This could allow malicious websites to make requests to this page and read the response.',
      severity: 'Medium',
    });
  }
  
  // 3. Missing Content-Security-Policy (CSP) Header
  if (!csp) {
    vulnerabilities.push({
        type: 'Missing CSP Header',
        description: 'The Content-Security-Policy (CSP) header is not set. A strong CSP can help prevent Cross-Site Scripting (XSS) and other injection attacks.',
        severity: 'Medium'
    });
  }


  const pageAnalysisResult = await page.evaluate(() => {
    const foundVulnerabilities: Vulnerability[] = [];

    // 4. Sensitive Information Leakage in HTML content
    const html = document.documentElement.outerHTML;
    const sensitivePatterns = {
      // Regex for common API keys
      GOOGLE_API_KEY: /AIza[0-9A-Za-z-_]{35}/g,
      AWS_ACCESS_KEY_ID: /AKIA[0-9A-Z]{16}/g,
      GITHUB_TOKEN: /[a-zA-Z0-9_-]{40}/g, // Covers various token formats
      // Regex for private keys
      PRIVATE_KEY: /-----BEGIN (RSA|EC|PGP|OPENSSH) PRIVATE KEY-----/g,
      // Regex for sensitive file exposures in comments or scripts
      ENV_FILE: /\.env/g,
      CONFIG_FILE: /wp-config\.php/g,
    };

    for (const [key, regex] of Object.entries(sensitivePatterns)) {
      if (regex.test(html)) {
        foundVulnerabilities.push({
          type: 'Sensitive Information Leakage',
          description: `Potential exposure of ${key} found in the page's HTML source.`,
          severity: 'High',
        });
      }
    }

    // 5. CSRF Token Check in Forms
    document.querySelectorAll('form').forEach((form, index) => {
      const method = form.method.toUpperCase();
      // Check forms that typically cause state changes
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        const hasCsrfToken = !!form.querySelector('input[type="hidden"][name*="csrf"], input[type="hidden"][name*="token"], input[type="hidden"][name*="nonce"]');
        if (!hasCsrfToken) {
          foundVulnerabilities.push({
            type: 'Missing CSRF Token',
            description: `A form (action: ${form.action || 'N/A'}, method: ${method}) appears to be missing a CSRF token, which could make it vulnerable to Cross-Site Request Forgery.`,
            severity: 'Medium',
          });
        }
      }
    });
    
    // 6. Basic XSS check: Look for insecure `innerHTML` usage in scripts
    // This is a very basic check and might have false positives. A real test would involve injecting payloads.
    const scripts = Array.from(document.scripts).map(s => s.innerHTML).join('\n');
    if (scripts.includes('.innerHTML=')) {
        foundVulnerabilities.push({
            type: 'Potential XSS via innerHTML',
            description: 'A script on the page uses `.innerHTML=`, which can be a vector for XSS if user-provided data is not properly sanitized. Manual review is recommended.',
            severity: 'Low'
        });
    }

    // --- Existing page data extraction ---
    function getVisibleText(node: Node): string {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node?.textContent?.trim();
          return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });

      let text = '';
      while (walker.nextNode()) {
        text += walker.currentNode.textContent + '\n';
      }
      return text;
    }

    // 获取标题
    const title = document.title;

    // 提取所有链接
    const rawLinks = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));

    return {
      title,
      textContent: getVisibleText(document.body),
      rawLinks,
      vulnerabilities: foundVulnerabilities,
    };
  });

  vulnerabilities.push(...pageAnalysisResult.vulnerabilities);

  const baseUrl = new URL(url);
  const absoluteLinks = (pageAnalysisResult.rawLinks || [])
    .filter((href): href is string => !!href && !href.startsWith('javascript:') && !href.startsWith('#'))
    .map((href) => {
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((href): href is string => !!href);

  const content = await page.content();
  await browser.close();

  // 将 vulnerabilities 转换为友好阅读的文本
  const volnerabilitiesText = vulnerabilities.map(v =>
    `Type: ${v.type}\nDescription: ${v.description}\nSeverity: ${v.severity}\n`
  ).join('\n');
  
  return {
    url,
    title: pageAnalysisResult.title,
    htmlContent: content,
    text: pageAnalysisResult.textContent.trim(),
    links: Array.from(new Set(absoluteLinks)),
    vulnerabilities: volnerabilitiesText,
    screenshotBase64,
  };
}



export async function crawlMetaData(url :string) {
  try {
    // 1. 获取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetadataScraper/1.0)',
      },
    })
    const html = response.data

    // 2. 解析 Open Graph 元数据
    const $ = cheerio.load(html)
    const metadata: Record<string, string> = {}

    // 提取所有 og: 标签
    $('meta[property^="og:"]').each((_, element) => {
      const property = $(element).attr('property')?.replace('og:', '')
      const content = $(element).attr('content')
      if (property && content) {
        metadata[property] = content
      }
    })

    // 3. 处理图片（如果存在）
    if (metadata.image) {
      try {
        const imageResponse = await axios.get(metadata.image, {
          responseType: 'arraybuffer',
        })
        const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64')
        metadata.image_base64 = `data:${imageResponse.headers['content-type']};base64,${base64Image}`
      } catch (error) {
        console.error('Failed to download image:', error)
        metadata.image_error = 'Image download failed'
        metadata.error = 'Failed to fetch image'
        metadata.image_base64 = ''
      }
    }

    return metadata
  } catch (error) {
    console.error('Error:', error)
    return {
      image_base64: '',
      error: 'Failed to fetch metadata',
    }
  }
}
