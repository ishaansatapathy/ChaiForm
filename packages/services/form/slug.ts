import { db, eq } from "@repo/database";
import { formsTable } from "@repo/database/schema";

import { slugifyTitle } from "./slug-utils";

export { slugifyTitle } from "./slug-utils";

export async function createUniqueSlug(titleOrSlug: string, excludeFormId?: string) {
  const base = slugifyTitle(titleOrSlug);
  let slug = base;
  let suffix = 0;

  while (true) {
    const [existing] = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(eq(formsTable.slug, slug))
      .limit(1);

    if (!existing || existing.id === excludeFormId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}
