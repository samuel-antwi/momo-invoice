import type { User } from "@supabase/supabase-js";
import { eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { businesses } from "../db/schema";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const ensureBusinessForUser = async (user: User) => {
  const [owned] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerId, user.id))
    .limit(1);

  if (owned) {
    return owned;
  }

  const [unclaimed] = await db
    .select()
    .from(businesses)
    .where(isNull(businesses.ownerId))
    .limit(1);

  if (unclaimed) {
    const [claimed] = await db
      .update(businesses)
      .set({
        ownerId: user.id,
        email: unclaimed.email ?? user.email ?? null,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, unclaimed.id))
      .returning();

    return claimed;
  }

  const rawName =
    (typeof user.user_metadata?.business_name === "string" && user.user_metadata.business_name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    user.email?.split("@")[0] ||
    "My MoMo Business";

  const name = rawName || "My MoMo Business";
  const slugCandidate = slugify(name);
  const slug = slugCandidate || `workspace-${user.id.slice(0, 8)}`;

  const [created] = await db
    .insert(businesses)
    .values({
      ownerId: user.id,
      name,
      slug,
      email: user.email ?? null,
      plan: "free",
    })
    .returning();

  return created;
};
