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
  const prompt = `请根据以下网站内容，提取并总结以下三方面信息：\n\n1. 网站的性质（如政府、企业、教育、公益、新闻等，简要说明）\n2. 管理单位（网站由哪个单位或组织主办/管理）\n3. 所属领域（如金融、医疗、科技、交通、教育、能源等）\n\n网站内容如下：\n${input.content}\n\n请用结构化的方式输出，例如：\n网站性质：xxx\n管理单位：xxx\n所属领域：xxx`;
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: 'user', content: prompt }
    ],
  });
  return completion.choices[0].message.content;
}
