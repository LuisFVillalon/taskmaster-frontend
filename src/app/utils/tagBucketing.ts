interface TaggedItem {
  tags: { name: string; color?: string | null }[];
}

export interface TagBucket {
  label: string;
  value: number;
  color: string;
}

/**
 * Buckets a list of tagged items by tag name, folding a numeric value per
 * item (hours, a count of 1, etc.) into each bucket's total, with an
 * "Untagged" catch-all for items with no tags. An item with more than one
 * tag contributes its full value to every one of its tags — a task tagged
 * both "Work" and "Urgent" counts fully toward both buckets, matching every
 * hand-rolled version of this reduce this replaces. Sorted by total value,
 * descending.
 */
export function bucketByTag<T extends TaggedItem>(
  items: T[],
  valueOf: (item: T) => number,
): TagBucket[] {
  const map = new Map<string, { color: string; value: number }>();
  let untagged = 0;
  for (const item of items) {
    const value = valueOf(item);
    if (value <= 0) continue;
    if (item.tags.length === 0) { untagged += value; continue; }
    for (const tag of item.tags) {
      const existing = map.get(tag.name);
      if (existing) existing.value += value;
      else map.set(tag.name, { color: tag.color ?? 'var(--tm-accent)', value });
    }
  }
  const rows: TagBucket[] = Array.from(map.entries()).map(([label, { color, value }]) => ({ label, value, color }));
  if (untagged > 0) rows.push({ label: 'Untagged', value: untagged, color: 'var(--tm-border)' });
  return rows.sort((a, b) => b.value - a.value);
}
