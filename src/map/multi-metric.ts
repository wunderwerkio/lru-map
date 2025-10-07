import { type MultiMetricLRUItem, NEWER, type Value } from '../entry/index.js';
import { type Key, LRUMap } from './base.js';

export interface MultiMetricLRUOptions {
  /** Maximum number of items allowed in the map */
  limit: number;
  /** Maximum total size of all items in the map */
  maxSize: number;
  /** Time-to-live in milliseconds - items not accessed within this time are evicted */
  ttl: number;
}

/**
 * LRU map with multi-metric eviction: limit, size, and time-to-live.
 * Entries are evicted based on expiration (TTL), count limit, or total size.
 */
export class MultiMetricLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  MultiMetricLRUItem<V>
> {
  protected _size = 0;
  protected readonly limit: number;
  protected readonly maxSize: number;
  protected readonly ttl: number;

  /**
   * Creates a new multi-metric LRU map.
   *
   * @param options - Configuration with limit, maxSize, and ttl
   * @param entries - Optional initial entries
   */
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

  /** Returns the current total size of all items in the map. */
  public get size() {
    return this._size;
  }

  /**
   * Adds or updates an entry. Sets timestamp if not provided. Throws if item size exceeds maxSize.
   *
   * @param key - The key to set
   * @param item - The item with size and optional timestamp
   * @returns Array of evicted keys
   * @throws Error if item.size exceeds maxSize
   */
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

  /**
   * Removes entries based on TTL expiration, count limit, and size limit.
   * Expired items are evicted first, then oldest entries until constraints are met.
   *
   * @returns Array of evicted keys
   */
  public evict() {
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
   *
   * Optimized for lower-end devices by:
   * - Avoiding redundant Map.get() calls in delete()
   * - Updating size directly without additional lookups
   * - Caching Date.now() (passed as parameter)
   */
  protected evictExpiredFromOldest(now: number, evicted: K[]): void {
    let current = this.oldest;

    while (current) {
      const age = now - current.item.timestamp;

      if (age > this.ttl) {
        // Item is expired, evict it
        const keyToEvict = current.key;
        const sizeToSubtract = current.item.size;

        // Move to next before deleting current
        const next = current[NEWER];

        // Optimized delete: update size first, then call super.delete()
        // This avoids the redundant Map.get() call in this.delete()
        if (super.delete(keyToEvict)) {
          this._size = this._size - sizeToSubtract;
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

  /** Removes the oldest entry and updates the total size. */
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

  /**
   * Removes an entry and updates the total size.
   *
   * @param key - The key to remove
   * @returns True if the entry was removed
   */
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

  /** Removes all entries and resets the total size to zero. */
  public clear() {
    super.clear();

    this._size = 0;
  }

  /**
   * Retrieves an item by key, marks it as used, and updates its timestamp.
   * Returns null if the item has expired.
   *
   * @param key - The key to look up
   * @returns The item or null if not found or expired
   */
  public get(key: K): MultiMetricLRUItem<V> | null {
    // Check if entry exists and hasn't expired before refreshing timestamp
    const entry = this.keymap.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.item.timestamp;

    // If item has expired, return null.
    // Item is then evicted by the eviction process.
    if (age > this.ttl) {
      return null;
    }

    // Item is valid, call super.get to move it to newest position
    const item = super.get(key);

    if (item) {
      item.timestamp = now;
    }

    return item;
  }

  /**
   * Proactively removes expired items without affecting size/limit constraints.
   *
   * @returns Array of evicted keys
   */
  public cleanupExpired(): K[] {
    const now = Date.now();
    const evicted: K[] = [];

    // Use efficient oldest-first approach
    this.evictExpiredFromOldest(now, evicted);

    return evicted;
  }
}
