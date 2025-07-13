import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 删除相关的执行记录和资产
    await prisma.asset.deleteMany({
      where: {
        taskExecution: {
          scheduledTaskId: id
        }
      }
    });

    await prisma.taskExecution.deleteMany({
      where: {
        scheduledTaskId: id
      }
    });

    // 删除定时任务
    await prisma.scheduledTask.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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