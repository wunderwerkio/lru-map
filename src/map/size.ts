import { SizedLRUItem, Value } from '../entry/index.js';
import { Key, LRUMap } from './base.js';

export class SizeBasedLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  SizedLRUItem<V>
> {
  protected _size = 0;
  protected readonly maxSize: number;

  constructor(maxSize: number, entries: [K, SizedLRUItem<V>][] = []) {
    super();

    this.maxSize = maxSize;

    if (entries && entries.length > 0) {
      this.assign(entries);
    }
  }

  public get size() {
    return this._size;
  }

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

  protected evict() {
    const evicted = [];

    while (this._size > this.maxSize) {
      evicted.push(this.shift());
    }

    return evicted;
  }

  protected shift() {
    const entry = this.oldest;
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
      this._size = this._size - sizeToSubtract;

      return true;
    }

    return false;
  }

  public clear() {
    super.clear();

    this._size = 0;
  }
}
