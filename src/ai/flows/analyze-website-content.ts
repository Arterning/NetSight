'use server';

/**
 * @fileOverview AI flow to analyze website content and summarize its purpose, function, and services.
 *
 * - analyzeWebsiteContent - A function that handles the website content analysis process.
 * - AnalyzeWebsiteContentInput - The input type for the analyzeWebsiteContent function.
 * - AnalyzeWebsiteContentOutput - The return type for the analyzeWebsiteContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeWebsiteContentInputSchema = z.object({
  url: z.string().url().describe('The URL of the website to analyze.'),
  content: z.string().describe('The HTML content of the website.'),
});
export type AnalyzeWebsiteContentInput = z.infer<typeof AnalyzeWebsiteContentInputSchema>;

const AnalyzeWebsiteContentOutputSchema = z.object({
  summary: z.string().describe('A summary of the website content, including its purpose, function, and services.'),
});
export type AnalyzeWebsiteContentOutput = z.infer<typeof AnalyzeWebsiteContentOutputSchema>;

export async function analyzeWebsiteContent(input: AnalyzeWebsiteContentInput): Promise<AnalyzeWebsiteContentOutput> {
  return analyzeWebsiteContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWebsiteContentPrompt',
  input: {schema: AnalyzeWebsiteContentInputSchema},
  output: {schema: AnalyzeWebsiteContentOutputSchema},
  prompt: `You are an AI expert in analyzing website content.

You will analyze the provided website content and summarize its purpose, function, and services.

URL: {{{url}}}
Content: {{{content}}}

Summary:`,
});

const analyzeWebsiteContentFlow = ai.defineFlow(
  {
    name: 'analyzeWebsiteContentFlow',
    inputSchema: AnalyzeWebsiteContentInputSchema,
    outputSchema: AnalyzeWebsiteContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
