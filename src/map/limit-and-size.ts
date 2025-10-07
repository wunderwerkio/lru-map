import type { SizedLRUItem, Value } from '../entry/index.js';
import { type Key, LRUMap } from './base.js';

/**
 * LRU map that evicts entries based on both entry count limit and total size.
 * Entries are removed when either the count limit or size limit is exceeded.
 * This provides dual constraints for more flexible cache management.
 */
export class LimitAndSizeBasedLRUMap<
  K extends Key,
  V extends Value
> extends LRUMap<K, V, SizedLRUItem<V>> {
  protected _size = 0;
  protected readonly limit: number;
  protected readonly maxSize: number;

  /**
   * Creates a new limit-and-size-based LRU map.
   *
   * @param limit - Maximum number of entries allowed
   * @param maxSize - Maximum total size of all items
   * @param entries - Optional initial entries
   */
  constructor(
    limit: number,
    maxSize: number,
    entries: [K, SizedLRUItem<V>][] = []
  ) {
    super();

    this.limit = limit;
    this.maxSize = maxSize;

    if (entries && entries.length > 0) {
      this.assign(entries);
    }
  }

  /** Returns the current total size of all items in the map. */
  public get size() {
    return this._size;
  }

  /**
   * Adds or updates an entry. Throws if item size exceeds maxSize.
   *
   * @param key - The key to set
   * @param item - The item with size to store
   * @returns Array of evicted keys
   * @throws Error if item.size exceeds maxSize
   */
  public set(key: K, item: SizedLRUItem<V>) {
    // Check if entry fits within max size.
    if (item.size > this.maxSize) {
      throw new Error('item size exceeds max size');
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

  /** Removes oldest entries until both count and size constraints are satisfied. */
  public evict() {
    const evicted: K[] = [];

    // Evict until both constraints are satisfied
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
}
