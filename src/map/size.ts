import type { SizedLRUItem, Value } from '../entry/index.js';
import { type Key, LRUMap } from './base.js';

/**
 * LRU map that evicts entries based on total size of all items.
 * When maxSize is exceeded, oldest entries are removed until the new entry fits.
 */
export class SizeBasedLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  SizedLRUItem<V>
> {
  protected _size = 0;
  protected readonly maxSize: number;

  /**
   * Creates a new size-based LRU map.
   *
   * @param maxSize - Maximum total size of all items
   * @param entries - Optional initial entries
   */
  constructor(maxSize: number, entries: [K, SizedLRUItem<V>][] = []) {
    super();

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
    // By updating the existing entry, the item size is not guaranteed to stay the same.
    const existingEntry = this.keymap.get(key);
    if (existingEntry) {
      this._size = this._size - existingEntry.item.size;
    }

    // Add the size of the newly added item to the total size.
    this._size = this._size + item.size;

    return super.set(key, item);
  }

  /** Removes oldest entries until total size is within maxSize. */
  public evict() {
    const evicted: K[] = [];

    while (this._size > this.maxSize) {
      const key = this.shift();
      if (key !== null) {
        evicted.push(key);
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
      this._size = this._size - sizeToSubtract;

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
