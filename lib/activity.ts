import { prisma } from './prisma'
import { ActivityType } from '@prisma/client'

export type ActivityMeta = {
  operation: string;
  resource_type: "DOCUMENT" | "FOLDER" | "MEMBER" | "WORKSPACE" | "SYSTEM" | "USER";
  resource_id: string;
  resource_label: string;
  source: string;
  workspace?: string;
  context?: string;
  location_before?: string;
  location_after?: string;
  previous?: any;
  current?: any;
  [key: string]: any;
}

export async function logActivity(
  userId: string | null,
  action: ActivityType,
  meta: ActivityMeta
) {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        entity: meta.resource_type,
        entity_id: meta.resource_id,
        meta: meta as any,
      },
    })
  } catch (error) {
    // Non-blocking — never crash on activity log failure
    console.error("Failed to log activity:", error)
  }
}
