import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const execution = await prisma.taskExecution.findUnique({
      where: { id },
      select: { 
        stage: true, 
        status: true,
        startTime: true,
        endTime: true,
        duration: true,
        assetsFound: true,
        assets: {
          include: {
            apiEndpoints: true,
            webpages: {
              select: {
                title: true,
                url: true,
                content: true,
              }
            },
          }
        },
      }
    });
    
    if (!execution) {
      return NextResponse.json({ error: 'Task execution not found' }, { status: 404 });
    }
    
    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error fetching task execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task execution' },
      { status: 500 }
    );
  }
} 
