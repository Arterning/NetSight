import puppeteer from 'puppeteer';
import { URL } from 'url'; // Node 内置，用于解析绝对链接

export async function crawlPage(url: string) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );

  console.log(`Visiting ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0' });

  const result = await page.evaluate(() => {
    // 提取可见文本
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
      rawLinks, // 注意：相对地址
    };
  });

  // 使用 Node 的 URL 类将相对地址转换为绝对地址
  const baseUrl = new URL(url);
  const absoluteLinks = result.rawLinks
    .filter((href) => !!href && !href.startsWith('javascript:') && !href.startsWith('#'))
    .map((href) => {
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((href) => !!href); // 去除解析失败的

  const content = await page.content();

  await browser.close();

  return {
    url,
    title: result.title,
    htmlContent: content,
    text: result.textContent.trim(),
    links: Array.from(new Set(absoluteLinks)), // 去重
  };
}
