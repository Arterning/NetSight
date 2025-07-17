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
  const prompt = `请分析这个网站的内容: ${input.content}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}
