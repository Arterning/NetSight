import { crawlMetaData } from '@src/lib/crawl';
import axios from 'axios';

// Mock the axios library
jest.mock('axios');

// Type assertion for the mocked axios
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('crawlMetaData', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should fetch and parse Open Graph metadata correctly', async () => {
    const testUrl = 'https://example.com';
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Page</title>
        <meta property="og:title" content="Example Title" />
        <meta property="og:description" content="This is a description." />
        <meta property="og:image" content="https://example.com/image.jpg" />
        <meta property="og:type" content="website" />
      </head>
      <body>
        <h1>Hello</h1>
      </body>
      </html>
    `;
    const mockImageBuffer = Buffer.from('fake-image-data');

    // Mock the HTML response
    axiosMock.get.mockResolvedValueOnce({
      data: mockHtml,
      headers: { 'content-type': 'text/html' },
    });

    // Mock the image response
    axiosMock.get.mockResolvedValueOnce({
      data: mockImageBuffer,
      headers: { 'content-type': 'image/jpeg' },
    });

    const metadata = await crawlMetaData(testUrl);

    // Check that axios was called correctly
    expect(axiosMock.get).toHaveBeenCalledWith(testUrl, expect.any(Object));
    expect(axiosMock.get).toHaveBeenCalledWith('https://example.com/image.jpg', { responseType: 'arraybuffer' });

    // Check the parsed metadata
    expect(metadata.title).toBe('Example Title');
    expect(metadata.description).toBe('This is a description.');
    expect(metadata.image).toBe('https://example.com/image.jpg');
    expect(metadata.type).toBe('website');

    // Check the base64 encoded image
    const expectedBase64 = `data:image/jpeg;base64,${mockImageBuffer.toString('base64')}`;
    expect(metadata.image_base64).toBe(expectedBase64);
  });

  it('should handle missing Open Graph image gracefully', async () => {
    const testUrl = 'https://example.com/no-image';
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>No Image Page</title>
        <meta property="og:title" content="No Image" />
      </head>
      <body></body>
      </html>
    `;

    axiosMock.get.mockResolvedValueOnce({
      data: mockHtml,
      headers: { 'content-type': 'text/html' },
    });

    const metadata = await crawlMetaData(testUrl);

    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(metadata.title).toBe('No Image');
    expect(metadata.image).toBeUndefined();
    expect(metadata.image_base64).toBeUndefined();
  });

  it('should handle image download failure', async () => {
    const testUrl = 'https://example.com/bad-image';
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bad Image</title>
        <meta property="og:image" content="https://example.com/broken-image.jpg" />
      </head>
      <body></body>
      </html>
    `;

    // Mock the HTML response
    axiosMock.get.mockResolvedValueOnce({
      data: mockHtml,
      headers: { 'content-type': 'text/html' },
    });

    // Mock the image download to fail
    axiosMock.get.mockRejectedValueOnce(new Error('Network error'));

    const metadata = await crawlMetaData(testUrl);

    expect(axiosMock.get).toHaveBeenCalledTimes(2);
    expect(metadata.image).toBe('https://example.com/broken-image.jpg');
    expect(metadata.image_base64).toBeUndefined();
    expect(metadata.image_error).toBe('Image download failed');
  });

  it('should return an empty object on main page fetch failure', async () => {
    const testUrl = 'https://non-existent-site.com';

    axiosMock.get.mockRejectedValueOnce(new Error('Failed to resolve host'));

    const metadata = await crawlMetaData(testUrl);

    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(metadata).toEqual({});
  });
});
