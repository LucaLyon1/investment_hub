'use server'

import { eq } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { aiIdeas } from '@/lib/db/schema'

export async function approveIdea(id: string): Promise<void> {
  await db
    .update(aiIdeas)
    .set({ status: 'approved', actedAt: new Date() })
    .where(eq(aiIdeas.id, id))
  updateTag('ideas')
}

export async function dismissIdea(id: string): Promise<void> {
  await db
    .update(aiIdeas)
    .set({ status: 'dismissed', actedAt: new Date() })
    .where(eq(aiIdeas.id, id))
  updateTag('ideas')
}
