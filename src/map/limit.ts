import type { LRUItem, Value } from '../entry/index.js';
import { type Key, LRUMap } from './base.js';

/**
 * LRU map that evicts entries when the number of items exceeds a limit.
 * When the limit is exceeded, the least recently used entry is removed.
 */
export class LimitBasedLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  LRUItem<V>
> {
  protected limit: number;

  /**
   * Creates a new limit-based LRU map.
   *
   * @param limit - Maximum number of entries allowed
   * @param entries - Optional initial entries
   */
  constructor(limit: number, entries: [K, LRUItem<V>][] = []) {
    super();

    this.limit = limit;

    if (entries && entries.length > 0) {
      this.assign(entries);
    }
  }

  /** Removes the oldest entry if the limit is exceeded. */
  public evict() {
    if (this._length > this.limit) {
      const evicted = this.shift();
      return evicted !== null ? [evicted] : [];
    }

    return [];
  }
}
