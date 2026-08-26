interface TaggedItem {
  tags: { name: string; color?: string | null }[];
}

interface TagBucketItem {
  name: string;
  value: number;
  /** e.g. "Task" / "Habit" / "Note" — present only when `bucketByTag` is called with a `kindOf`. */
  kind?: string;
}

interface TagBucket {
  label: string;
  value: number;
  color: string;
  /** Present only when `bucketByTag` is called with a `nameOf` — the individual
   * items (tasks/habits/etc.) that make up this bucket's total, for use in
   * tooltips/breakdowns. Sorted by value, descending. */
  items?: TagBucketItem[];
}

/**
 * Buckets a list of tagged items by tag name, folding a numeric value per
 * item (hours, a count of 1, etc.) into each bucket's total, with an
 * "Untagged" catch-all for items with no tags. An item with more than one
 * tag contributes its full value to every one of its tags — a task tagged
 * both "Work" and "Urgent" counts fully toward both buckets, matching every
 * hand-rolled version of this reduce this replaces. Sorted by total value,
 * descending.
 *
 * Pass `nameOf` to also collect, per bucket, the individual items that make
 * it up (e.g. so a chart can show "Work: Finish report (2h), Standup (0.5h)"
 * on hover instead of just the tag total). Pass `kindOf` alongside it to also
 * tag each item with what it is (task/habit/note), so items of different
 * kinds that happen to share a title aren't merged together and can be
 * labeled distinctly in the UI.
 */
export function bucketByTag<T extends TaggedItem>(
  items: T[],
  valueOf: (item: T) => number,
  nameOf?: (item: T) => string,
  kindOf?: (item: T) => string,
): TagBucket[] {
  type ItemAgg = { name: string; kind?: string; value: number };
  const map = new Map<string, { color: string; value: number; items: Map<string, ItemAgg> }>();
  let untagged = 0;
  const untaggedItems = new Map<string, ItemAgg>();
  const keyOf = (name: string, kind?: string) => (kind ? `${kind}:${name}` : name);
  for (const item of items) {
    const value = valueOf(item);
    if (value <= 0) continue;
    if (item.tags.length === 0) {
      untagged += value;
      if (nameOf) {
        const name = nameOf(item);
        const kind = kindOf?.(item);
        const key = keyOf(name, kind);
        const existing = untaggedItems.get(key);
        if (existing) existing.value += value;
        else untaggedItems.set(key, { name, kind, value });
      }
      continue;
    }
    for (const tag of item.tags) {
      let existing = map.get(tag.name);
      if (!existing) {
        existing = { color: tag.color ?? 'var(--tm-accent)', value: 0, items: new Map() };
        map.set(tag.name, existing);
      }
      existing.value += value;
      if (nameOf) {
        const name = nameOf(item);
        const kind = kindOf?.(item);
        const key = keyOf(name, kind);
        const existingItem = existing.items.get(key);
        if (existingItem) existingItem.value += value;
        else existing.items.set(key, { name, kind, value });
      }
    }
  }
  const toItems = (m: Map<string, ItemAgg>): TagBucketItem[] | undefined =>
    nameOf ? Array.from(m.values()).sort((a, b) => b.value - a.value) : undefined;
  const rows: TagBucket[] = Array.from(map.entries()).map(([label, { color, value, items: itemMap }]) => ({
    label, value, color, items: toItems(itemMap),
  }));
  if (untagged > 0) rows.push({ label: 'Untagged', value: untagged, color: 'var(--tm-border)', items: toItems(untaggedItems) });
  return rows.sort((a, b) => b.value - a.value);
}
