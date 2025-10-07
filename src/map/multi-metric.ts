import type { MultiMetricLRUItem, Value } from '../entry/index.js';
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

    // First pass: evict all expired items (those exceeding TTL)
    const expiredKeys = this.getExpiredKeys(now);
    for (const key of expiredKeys) {
      const removed = this.evictEntry(key);
      if (removed !== null) {
        evicted.push(removed);
      }
    }

    // Second pass: evict LRU items if we exceed limit or maxSize
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
   * Get all keys of items that have exceeded their TTL
   */
  protected getExpiredKeys(now: number): K[] {
    const expiredKeys: K[] = [];

    for (const [key, item] of this) {
      const age = now - item.timestamp;
      if (age > this.ttl) {
        expiredKeys.push(key);
      }
    }

    return expiredKeys;
  }

  /**
   * Evict a specific entry by key
   */
  protected evictEntry(key: K): K | null {
    const entry = this.keymap.get(key);

    if (!entry) {
      return null;
    }

    // Delete the entry
    if (this.delete(key)) {
      // Size is already updated in delete method
      return key;
    }

    return null;
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
    const expiredKeys = this.getExpiredKeys(now);
    const evicted: K[] = [];

    for (const key of expiredKeys) {
      const removed = this.evictEntry(key);
      if (removed !== null) {
        evicted.push(removed);
      }
    }

    return evicted;
  }
}

