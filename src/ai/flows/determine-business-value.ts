'use server';

/**
 * @fileOverview An AI agent that determines the business value delivered by a website.
 *
 * - determineBusinessValue - A function that handles the business value determination process.
 * - DetermineBusinessValueInput - The input type for the determineBusinessValue function.
 * - DetermineBusinessValueOutput - The return type for the determineBusinessValue function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetermineBusinessValueInputSchema = z.object({
  websiteContent: z
    .string()
    .describe('The HTML content of the website to analyze.'),
  websiteUrl: z.string().describe('The URL of the website being analyzed.'),
});
export type DetermineBusinessValueInput = z.infer<
  typeof DetermineBusinessValueInputSchema
>;

const DetermineBusinessValueOutputSchema = z.object({
  businessValueSummary: z
    .string()
    .describe(
      'A summary of the business value delivered by the website, extracted from its content.'
    ),
  valuePropositionScore: z
    .number()
    .describe(
      'A score (0-100) indicating the strength of the value proposition presented on the website. Higher scores indicate a clearer and more compelling value proposition.'
    ),
});
export type DetermineBusinessValueOutput = z.infer<
  typeof DetermineBusinessValueOutputSchema
>;

export async function determineBusinessValue(
  input: DetermineBusinessValueInput
): Promise<DetermineBusinessValueOutput> {
  return determineBusinessValueFlow(input);
}

const prompt = ai.definePrompt({
  name: 'determineBusinessValuePrompt',
  input: {schema: DetermineBusinessValueInputSchema},
  output: {schema: DetermineBusinessValueOutputSchema},
  prompt: `You are an AI expert in analyzing website content to determine the business value it delivers. Analyze the provided website content and URL to extract the value proposition and summarize the business value.

Website URL: {{{websiteUrl}}}
Website Content:
{{{websiteContent}}}

Provide a concise summary of the business value delivered by the website in the businessValueSummary field.  Also, score the strength of the website's value proposition from 0 to 100 in the valuePropositionScore field; higher scores mean the website is very clear about the value it provides, and low scores mean the website doesn't clearly convey the value.

Ensure your answer is valid JSON satisfying the schema.`,
});

const determineBusinessValueFlow = ai.defineFlow(
  {
    name: 'determineBusinessValueFlow',
    inputSchema: DetermineBusinessValueInputSchema,
    outputSchema: DetermineBusinessValueOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
