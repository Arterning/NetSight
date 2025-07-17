// src/ai/flows/ip-association-analysis.ts
'use server';

/**
 * @fileOverview Analyzes the relationships between IP addresses, domains, geographical locations, and network topologies.
 *
 * - ipAssociationAnalysis - A function that handles the IP association analysis process.
 * - IpAssociationAnalysisInput - The input type for the ipAssociationAnalysis function.
 * - IpAssociationAnalysisOutput - The return type for the ipAssociationAnalysis function.
 */

import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY }
);

export async function ipAssociationAnalysis(input: { ip: string }) {
  const prompt = `请分析此 IP 或者域名的的可能关联信息: ${input.ip}`;
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}
