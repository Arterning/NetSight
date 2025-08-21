import { runExample } from '@src/lib/tech-crawl';

describe('crawlPage with a real external website ', () => {
  // Set a very long timeout for this test because it depends on the public internet
  // and the behavior of an external site.
  jest.setTimeout(60000); // 60 seconds

  it('should successfully crawl target tech information', async () => {
    const result = await runExample('https://www.awesomescreenshot.com/');

    console.log(result);

   
  });
});
