import { NEWER, type MultiMetricLRUItem, type Value } from '../entry/index.js';
import { type Key, LRUMap } from './base.js';

export interface MultiMetricLRUOptions {
  /** Maximum number of items allowed in the map */
  limit: number;
  /** Maximum total size of all items in the map */
  maxSize: number;
  /** Time-to-live in milliseconds - items not accessed within this time are evicted */
  ttl: number;
}

export class MultiMetricLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  MultiMetricLRUItem<V>
> {
  protected _size = 0;
  protected readonly limit: number;
  protected readonly maxSize: number;
  protected readonly ttl: number;

  constructor(
    options: MultiMetricLRUOptions,
    entries: [K, MultiMetricLRUItem<V>][] = []
  ) {
    super();

    this.limit = options.limit;
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;

    if (entries && entries.length > 0) {
      this.assign(entries);
    }
  }

  public get size() {
    return this._size;
  }

  public set(key: K, item: MultiMetricLRUItem<V>) {
    // Check if entry fits within max size.
    if (item.size > this.maxSize) {
      throw new Error('item size exceeds max size');
    }

    // Set timestamp to current time if not provided
    if (!item.timestamp) {
      item.timestamp = Date.now();
    }

    // If entry already exists, we first subtract the existing item size.
    const existingEntry = this.keymap.get(key);
    if (existingEntry) {
      this._size = this._size - existingEntry.item.size;
    }

    // Add the size of the newly added item to the total size.
    this._size = this._size + item.size;

    return super.set(key, item);
  }

  protected evict() {
    const evicted: K[] = [];
    const now = Date.now();

    // First pass: evict expired items starting from oldest (LRU)
    // This is efficient because expired items cluster near the oldest end
    this.evictExpiredFromOldest(now, evicted);

    // Second pass: evict LRU items if we still exceed limit or maxSize
    while (this._length > this.limit || this._size > this.maxSize) {
      const key = this.shift();
      if (key !== null) {
        evicted.push(key);
      } else {
        // No more items to evict
        break;
      }
    }

    return evicted;
  }

  /**
   * Efficiently evict expired items by starting from the oldest (LRU) entries.
   * Since older entries are more likely to have expired, we can often avoid
   * scanning the entire map by stopping once we find a valid (non-expired) item.
   *
   * This is O(k) where k is the number of expired items, rather than O(n) for all items.
   */
  protected evictExpiredFromOldest(now: number, evicted: K[]): void {
    let current = this.oldest;

    while (current) {
      const age = now - current.item.timestamp;

      if (age > this.ttl) {
        // Item is expired, evict it
        const keyToEvict = current.key;
        // Move to next before deleting current
        const next = current[NEWER];

        // Evict the expired entry
        if (this.delete(keyToEvict)) {
          evicted.push(keyToEvict);
        }

        current = next;
      } else {
        // Found first non-expired item, we can stop
        // All newer items will also be non-expired due to LRU ordering
        break;
      }
    }
  }

  protected shift() {
    const entry = this.oldest;

    if (!entry) {
      return null;
    }

    const sizeToSubtract = entry.item.size;

    // Remove oldest entry.
    const removed = super.shift();

    if (removed) {
      // If an entry was removed, we need to update the total size.
      this._size = this._size - sizeToSubtract;
    }

    return removed;
  }

  public delete(key: K): boolean {
    const entry = this.keymap.get(key);
    const sizeToSubtract = entry?.item.size;

    // Delete entry by key.
    if (super.delete(key)) {
      // If an entry was removed, we need to update the total size.
      if (sizeToSubtract !== undefined) {
        this._size = this._size - sizeToSubtract;
      }

      return true;
    }

    return false;
  }

  public clear() {
    super.clear();

    this._size = 0;
  }

  public get(key: K): MultiMetricLRUItem<V> | null {
    const item = super.get(key);

    if (item) {
      // Update timestamp when item is accessed
      item.timestamp = Date.now();
    }

    return item;
  }

  /**
   * Clean up expired items without affecting size/limit constraints
   * This is useful for proactive cleanup
   */
  public cleanupExpired(): K[] {
    const now = Date.now();
    const evicted: K[] = [];

    // Use efficient oldest-first approach
    this.evictExpiredFromOldest(now, evicted);

    return evicted;
  }
}
