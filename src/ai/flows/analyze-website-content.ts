'use server';

/**
 * @fileOverview AI flow to analyze website content and summarize its purpose, function, and services.
 *
 * - analyzeWebsiteContent - A function that handles the website content analysis process.
 * - AnalyzeWebsiteContentInput - The input type for the analyzeWebsiteContent function.
 * - AnalyzeWebsiteContentOutput - The return type for the analyzeWebsiteContent function.
 */

import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY }
);

export async function analyzeWebsiteContent(input: { url: string, content: string }) {
  const prompt = `请根据以下网站内容，提取并总结以下信息：

1. 网站的性质（如政府、企业、教育、公益、新闻等，简要说明）
2. 管理单位（网站由哪个单位或组织主办/管理）
3. 所属领域（如金融、医疗、科技、交通、教育、能源等）

4. 站内关键信息：
  - 站内提及的人员信息（如姓名、职位等）
  - 网站关联组织或友链（如合作单位、友情链接等）
  - 网站上可能存在的敏感信息（如身份证号、联系方式、账号、密码、隐私数据等）

网站内容如下：
${input.content}

请用结构化的方式输出，例如：
网站性质：xxx
管理单位：xxx
所属领域：xxx
站内关键信息：
  人员信息：xxx
  关联组织/友链：xxx
  敏感信息：xxx
`;
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: 'user', content: prompt }
    ],
  });
  return completion.choices[0].message.content;
}
