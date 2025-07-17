import puppeteer from 'puppeteer';

export async function crawlTextContent(url: string): Promise<string> {

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // 设置 UA 和请求参数模拟正常访问
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );

  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0' }); // 等待网络空闲

  // 提取可见的文本内容
  const textContent = await page.evaluate(() => {
    function getVisibleText(node: Node): string {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = getComputedStyle(parent);
          if (style && (style.display === 'none' || style.visibility === 'hidden')) {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node?.textContent?.trim();
          return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      let result = '';
      while (walker.nextNode()) {
        result += walker.currentNode.textContent + '\n';
      }
      return result;
    }

    return getVisibleText(document.body);
  });

  console.log("Extracted text:\n", textContent);

  await browser.close();

  return textContent;
}

