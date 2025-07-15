import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Use a transaction to ensure all related data is deleted atomically
    await prisma.$transaction(async (tx) => {
      // 1. Find all task executions for the scheduled task
      const executions = await tx.taskExecution.findMany({
        where: { scheduledTaskId: id },
        select: { id: true },
      });
      const executionIds = executions.map(e => e.id);

      if (executionIds.length > 0) {
        // 2. Find all assets related to these executions
        const assets = await tx.asset.findMany({
          where: { taskExecutionId: { in: executionIds } },
          select: { id: true },
        });
        const assetIds = assets.map(a => a.id);

        if (assetIds.length > 0) {
          // 3. Delete all webpages linked to these assets first
          await tx.webpage.deleteMany({
            where: { assetId: { in: assetIds } },
          });
        }

        // 4. Delete all assets linked to these executions
        await tx.asset.deleteMany({
            where: { taskExecutionId: { in: executionIds } },
        });
      }

      // 5. Delete all task executions for the scheduled task
      await tx.taskExecution.deleteMany({
        where: { scheduledTaskId: id },
      });

      // 6. Finally, delete the scheduled task itself
      await tx.scheduledTask.delete({
        where: { id: id },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { isActive } = body;

    const task = await prisma.scheduledTask.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
} 