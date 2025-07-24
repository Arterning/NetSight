import { crawlPage } from '@src/lib/crawl';

describe('crawlPage with a real external website (baidu.com)', () => {
  // Set a very long timeout for this test because it depends on the public internet
  // and the behavior of an external site.
  jest.setTimeout(60000); // 60 seconds

  it('should successfully crawl baidu.com and extract basic information', async () => {
    const url = 'https://www.baidu.com';
    const result = await crawlPage(url);

    // We can't make very specific assertions because the content is dynamic and external.
    // We will check for basic, stable characteristics of the Baidu homepage.

    expect(result.url).toBe(url);
    
    // Baidu's title is known to be "百度一下，你就知道"
    expect(result.title).toBe('百度一下，你就知道');

    // The HTML content should not be empty
    expect(result.htmlContent).toBeTruthy();
    expect(result.htmlContent.length).toBeGreaterThan(1000);

    // The text content should contain some expected strings
    expect(result.text).toContain('百度');
    expect(result.text).toContain('新闻');
    expect(result.text).toContain('地图');

    // The page should have links
    expect(result.links.length).toBeGreaterThan(5);
    
    // We can check for the presence of some well-known links
    const hasNewsLink = result.links.some(link => link.includes('news.baidu.com'));
    const hasMapLink = result.links.some(link => link.includes('map.baidu.com'));
    expect(hasNewsLink).toBe(true);
    expect(hasMapLink).toBe(true);

    // We can't be certain about vulnerabilities as they might be fixed or changed.
    // A simple check that the result is an array is sufficient.
    expect(Array.isArray(result.vulnerabilities)).toBe(true);
  });
});
