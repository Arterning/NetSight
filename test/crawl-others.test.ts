import { crawlPage } from '@src/lib/crawl';

describe('crawlPage with a real external website ', () => {
  // Set a very long timeout for this test because it depends on the public internet
  // and the behavior of an external site.
  jest.setTimeout(60000); // 60 seconds

  it('should successfully crawl target and extract basic information', async () => {
    // https://en.igcu.pku.edu.cn/
    // https://www.biocore.pku.edu.cn
    // www.dapecology.pku.edu.cn
    const url = 'https://www.dapecology.pku.edu.cn/';
    const result = await crawlPage(url);

    console.log(result);

    expect(result.url).toBe(url);
   
  });
});
