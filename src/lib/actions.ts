'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import type { Asset as AssetCardData } from '@/components/asset-card';
import { prisma } from '@/lib/prisma';
import type { Asset } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const formSchema = z.object({
  ipRange: z.string().min(1, 'IP range is required.'),
  scanRate: z.string(),
});

const assetSchema = z.object({
  ip: z.string().min(1, 'IP address is required.'),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).default('Active'),
});

type FormValues = z.infer<typeof formSchema>;
type AssetFormValues = z.infer<typeof assetSchema>;

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
): Promise<{ data: AssetCardData[] | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    return { data: null, error: 'Invalid input.' };
  }

  try {
    // Simulate network latency for scanning
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const activeIPs = getActiveIPs();
    const taskName = `Scan_${new Date().toISOString()}`;

    const analysisPromises = activeIPs.map(async (ip) => {
      const mockContent = mockContents[ip] || `<html><body><h1>No content found for ${ip}</h1></body></html>`;
      const mockUrl = `http://${ip}`;

      const [analysisResult, businessValueResult, associationResult] = await Promise.all([
        analyzeWebsiteContent({ url: mockUrl, content: mockContent }),
        determineBusinessValue({ websiteUrl: mockUrl, websiteContent: mockContent }),
        ipAssociationAnalysis({ ipAddress: ip }),
      ]);
      
      const assetData = {
        ip: ip,
        domain: associationResult.domain,
        status: 'Active',
        openPorts: '80, 443', // Mock data
        valuePropositionScore: businessValueResult.valuePropositionScore,
        summary: analysisResult.summary,
        geolocation: associationResult.geolocation,
        services: associationResult.services,
        networkTopology: associationResult.networkTopology,
        taskName: taskName,
      };

      await prisma.asset.upsert({
        where: { ip: ip },
        update: assetData,
        create: assetData,
      });

      return {
        ip,
        analysis: analysisResult,
        businessValue: businessValueResult,
        association: associationResult,
      };
    });

    const results = await Promise.all(analysisPromises);
    revalidatePath('/');
    return { data: results, error: null };
  } catch (error) {
    console.error('Error during scan and analysis:', error);
    return { data: null, error: 'Failed to complete analysis. Please try again.' };
  }
}

export async function getAssets(search?: string, filter?: string): Promise<Asset[]> {
    const where: any = {
        isDeleted: false
    };

    if (search) {
        where.OR = [
            { ip: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { domain: { contains: search, mode: 'insensitive' } },
            { owner: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (filter) {
        where.status = filter;
    }

    return prisma.asset.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getAssetById(id: string): Promise<Asset | null> {
    return prisma.asset.findFirst({
        where: {
            id,
            isDeleted: false
        }
    });
}

export async function createAssetAction(values: AssetFormValues): Promise<{ success: boolean; error?: string }> {
    const validation = assetSchema.safeParse(values);
    if (!validation.success) {
        return { success: false, error: 'Invalid input data.' };
    }

    try {
        await prisma.asset.create({
            data: {
                ...values,
                domain: values.domain || '',
                openPorts: '',
                valuePropositionScore: 0,
                summary: '',
                geolocation: '',
                services: '',
                networkTopology: '',
                taskName: 'Manual Entry',
            }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error creating asset:', error);
        return { success: false, error: 'Failed to create asset.' };
    }
}

export async function updateAssetAction(id: string, values: AssetFormValues): Promise<{ success: boolean; error?: string }> {
    const validation = assetSchema.safeParse(values);
    if (!validation.success) {
        return { success: false, error: 'Invalid input data.' };
    }

    try {
        await prisma.asset.update({
            where: { id },
            data: values
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error updating asset:', error);
        return { success: false, error: 'Failed to update asset.' };
    }
}

export async function deleteAssetAction(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.asset.update({
            where: { id },
            data: { isDeleted: true }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error deleting asset:', error);
        return { success: false, error: 'Failed to delete asset.' };
    }
}

export async function getAssetStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    byPriority: { [key: string]: number };
}> {
    const assets = await prisma.asset.findMany({
        where: { isDeleted: false }
    });

    const stats = {
        total: assets.length,
        active: assets.filter(a => a.status === 'Active').length,
        inactive: assets.filter(a => a.status === 'Inactive').length,
        maintenance: assets.filter(a => a.status === 'Maintenance').length,
        byPriority: {
            Low: assets.filter(a => a.priority === 'Low').length,
            Medium: assets.filter(a => a.priority === 'Medium').length,
            High: assets.filter(a => a.priority === 'High').length,
            Critical: assets.filter(a => a.priority === 'Critical').length,
        }
    };

    return stats;
}
