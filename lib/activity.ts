import { prisma } from './prisma'
import { ActivityType } from '@prisma/client'

export async function logActivity(
  userId: string | null,
  action: ActivityType,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        entity,
        entity_id: entityId,
        meta: (meta ?? undefined) as any,
      },
    })
  } catch {
    // Non-blocking — never crash on activity log failure
  }
}
