'use server'

import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { rssFeeds } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function addFeed(url: string, name: string) {
  await db.insert(rssFeeds).values({ id: nanoid(), url, name, createdAt: new Date() })
  revalidatePath('/feeds')
}

export async function deleteFeed(id: string) {
  await db.delete(rssFeeds).where(eq(rssFeeds.id, id))
  revalidatePath('/feeds')
}
