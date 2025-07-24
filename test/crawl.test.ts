import { crawlPage } from '@src/lib/crawl';
import puppeteer from 'puppeteer';

// Mock the entire puppeteer library
jest.mock('puppeteer');

// Type assertion for the mocked puppeteer
const puppeteerMock = puppeteer as jest.Mocked<typeof puppeteer>;

describe('crawlPage', () => {
  const mockPage = {
    goto: jest.fn(),
    setUserAgent: jest.fn(),
    headers: jest.fn().mockReturnValue({}),
    evaluate: jest.fn(),
    content: jest.fn(),
    close: jest.fn(),
  };

  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Setup the mock implementation for launch
    puppeteerMock.launch.mockResolvedValue(mockBrowser as any);
  });

  it('should successfully crawl a page and extract information', async () => {
    const testUrl = 'https://example.com';

    // Mock the return values for a successful crawl
    mockPage.goto.mockResolvedValue({
      headers: () => ({
        'x-frame-options': 'DENY',
        'content-security-policy': `frame-ancestors 'none'`,
      }),
    } as any);

    mockPage.evaluate.mockResolvedValue({
      title: 'Example Domain',
      textContent: 'This is the example domain page.',
      rawLinks: ['/about', 'https://iana.org'],
      vulnerabilities: [],
    });

    mockPage.content.mockResolvedValue('<html><body><p>This is the example domain page.</p><a href="/about">About</a><a href="https://iana.org">IANA</a></body></html>');

    const result = await crawlPage(testUrl);

    expect(puppeteer.launch).toHaveBeenCalledWith({ headless: true, args: ['--no-sandbox'] });
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(testUrl, { waitUntil: 'networkidle0' });
    expect(mockPage.evaluate).toHaveBeenCalled();
    expect(result.url).toBe(testUrl);
    expect(result.title).toBe('Example Domain');
    expect(result.text).toContain('This is the example domain page.');
    expect(result.links).toEqual(['https://example.com/about', 'https://iana.org/']);
    expect(result.vulnerabilities).toEqual([]);
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle navigation failure gracefully', async () => {
    const testUrl = 'https://invalid-url.com';
    const errorMessage = 'net::ERR_NAME_NOT_RESOLVED';

    // Mock page.goto to reject with an error
    mockPage.goto.mockRejectedValue(new Error(errorMessage));

    const result = await crawlPage(testUrl);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(testUrl, { waitUntil: 'networkidle0' });
    expect(mockPage.evaluate).not.toHaveBeenCalled(); // Should not be called on failure
    expect(result.url).toBe(testUrl);
    expect(result.title).toBe('Crawl Failed');
    expect(result.text).toBe('Failed to navigate to URL.');
    const parsedVulnerabilities = JSON.parse(result.vulnerabilities as string);
    expect(parsedVulnerabilities).toHaveLength(1);
    expect(parsedVulnerabilities[0].type).toBe('Crawl Error');
    expect(parsedVulnerabilities[0].description).toContain(errorMessage);
    expect(parsedVulnerabilities[0].severity).toBe('Critical');
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
