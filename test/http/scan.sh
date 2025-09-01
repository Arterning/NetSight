curl --location --request POST 'http://192.168.200.183:9002/api/scan' --header 'User-Agent: Apifox/1.0.0 (https://apifox.com)' --header 'Content-Type: application/json' --data-raw '{
    "url":"https://icode.pku.edu.cn/",
    "valueKeywords":["研究", "大学"],
    "crawlDepth":"level3",
    "customCrawlDepth":1
}'