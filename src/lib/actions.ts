'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import type { Asset } from '@/components/asset-card';

const formSchema = z.object({
  ipRange: z.string().min(1, 'IP range is required.'),
  scanRate: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const mockContents: { [key: string]: string } = {
  '192.168.1.23': `<html><title>Innovatech Solutions</title><body><h1>Innovatech Solutions</h1><p>We provide cutting-edge AI-driven solutions for enterprise customers.</p></body></html>`,
  '192.168.1.58': `<html><title>CloudSphere Hosting</title><body><h1>CloudSphere Hosting</h1><p>Reliable and scalable cloud hosting for your business-critical applications.</p></body></html>`,
  '192.168.1.102': `<html><title>Gamer's Hub</title><body><h1>Gamer's Hub</h1><p>Your one-stop shop for gaming news, reviews, and community forums.</p></body></html>`,
  '192.168.1.174': `<html><title>OpenSource Project - NetWeaver</title><body><h1>NetWeaver</h1><p>A free, open-source library for network packet analysis.</p></body></html>`,
  '192.168.1.219': `<html><title>SecureVault VPN</title><body><h1>SecureVault VPN</h1><p>Protect your online privacy with our military-grade encrypted VPN service.</p></body></html>`,
};

// Simulate finding active IPs
const getActiveIPs = () => {
  const ips = ['192.168.1.23', '192.168.1.58', '192.168.1.102', '192.168.1.174', '192.168.1.219'];
  const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 results
  return ips.sort(() => 0.5 - Math.random()).slice(0, count);
};

export async function scanAndAnalyzeAction(
  values: FormValues
): Promise<{ data: Asset[] | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    return { data: null, error: 'Invalid input.' };
  }

  try {
    // Simulate network latency for scanning
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const activeIPs = getActiveIPs();

    const analysisPromises = activeIPs.map(async (ip) => {
      const mockContent = mockContents[ip] || `<html><body><h1>No content found for ${ip}</h1></body></html>`;
      const mockUrl = `http://${ip}`;

      const [analysisResult, businessValueResult, associationResult] = await Promise.all([
        analyzeWebsiteContent({ url: mockUrl, content: mockContent }),
        determineBusinessValue({ websiteUrl: mockUrl, websiteContent: mockContent }),
        ipAssociationAnalysis({ ipAddress: ip }),
      ]);

      return {
        ip,
        analysis: analysisResult,
        businessValue: businessValueResult,
        association: associationResult,
      };
    });

    const results = await Promise.all(analysisPromises);
    return { data: results, error: null };
  } catch (error) {
    console.error('Error during scan and analysis:', error);
    return { data: null, error: 'Failed to complete analysis. Please try again.' };
  }
}
