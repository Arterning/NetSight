import { crawlPage } from '@src/lib/crawl';
import http from 'http';
import { AddressInfo } from 'net';

describe('crawlPage with real puppeteer (integration test)', () => {
  let server: http.Server;
  let serverUrl: string;

  // Before all tests, set up a local web server
  beforeAll((done) => {
    server = http.createServer((req, res) => {
      // Serve a simple HTML page designed for testing
      res.writeHead(200, {
        'Content-Type': 'text/html',
        // Intentionally missing headers to trigger vulnerability checks
      });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Real Test Page</title>
        </head>
        <body>
          <h1>Welcome to the Real Test</h1>
          <p>This is a paragraph.</p>
          <a href="/about-us">About Us</a>
          
          <!-- A form without a CSRF token to trigger a vulnerability check -->
          <form method="POST" action="/submit">
            <input type="text" name="data" />
            <button type="submit">Submit</button>
          </form>
        </body>
        </html>
      `);
    });

    server.listen(0, () => { // Listen on a random free port
      const address = server.address() as AddressInfo;
      serverUrl = `http://localhost:${address.port}`;
      console.log(`Local test server running at ${serverUrl}`);
      done();
    });
  });

  // After all tests, shut down the server
  afterAll((done) => {
    server.close(done);
  });

  // Set a longer timeout for this test since it involves a real browser
  jest.setTimeout(30000); // 30 seconds

  it('should crawl a real, locally-served page and extract correct information', async () => {
    const result = await crawlPage(serverUrl);

    // --- Assertions for page content ---
    expect(result.url).toBe(serverUrl);
    expect(result.title).toBe('Real Test Page');
    expect(result.text).toContain('Welcome to the Real Test');
    expect(result.links).toEqual([`${serverUrl}/about-us`]);

    // --- Assertions for vulnerabilities ---
    // The server is intentionally configured to have these vulnerabilities
    const clickjackingVuln = result.vulnerabilities.find(v => v.type === 'Clickjacking');
    const missingCspVuln = result.vulnerabilities.find(v => v.type === 'Missing CSP Header');
    const missingCsrfVuln = result.vulnerabilities.find(v => v.type === 'Missing CSRF Token');

    expect(clickjackingVuln).toBeDefined();
    expect(missingCspVuln).toBeDefined();
    expect(missingCsrfVuln).toBeDefined();

    // Ensure no other unexpected vulnerabilities were found
    expect(result.vulnerabilities).toHaveLength(3);

    // Print the result
    console.log('Crawl result:', JSON.stringify(result, null, 2));
  });
});
