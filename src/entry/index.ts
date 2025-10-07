export const NEWER = Symbol('newer');
export const OLDER = Symbol('older');

export type Value = object | string | number | boolean | null;

/** Basic LRU item containing only a value. */
export interface LRUItem<V extends Value> {
  value: V;
}

/** LRU item with an associated size for size-based eviction. */
export interface SizedLRUItem<V extends Value> extends LRUItem<V> {
  size: number;
}

/** LRU item with size and timestamp for multi-metric eviction. */
export interface MultiMetricLRUItem<V extends Value> extends LRUItem<V> {
  size: number;
  timestamp: number;
}

/** Internal doubly-linked list entry structure. */
export interface LRUEntry<K, V> {
  key: K;
  item: V;

  [NEWER]: LRUEntry<K, V>;
  [OLDER]: LRUEntry<K, V>;
}

/**
 * Creates a new LRU entry with unlinked pointers.
 *
 * @param key - Entry key
 * @param item - Entry item
 * @returns New unlinked entry
 */
export const createEntry = <K, V>(key: K, item: V): LRUEntry<K, V> => ({
  key,
  item,

  [NEWER]: undefined,
  [OLDER]: undefined
});
