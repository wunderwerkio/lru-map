import {
  createEntry,
  LRUItem,
  LRUEntry,
  NEWER,
  OLDER,
  Value
} from '../entry/index.js';
import {
  EntryIterator,
  KeyIterator,
  ValueIterator
} from '../iterator/index.js';

export type Key = string | number;

export abstract class LRUMap<
  K extends Key,
  V extends Value,
  I extends LRUItem<V>
> {
  protected _length = 0;
  protected oldest: LRUEntry<K, I> = undefined;
  protected newest: LRUEntry<K, I> = undefined;
  protected keymap = new Map<K, LRUEntry<K, I>>();

  public get length() {
    return this._length;
  }

  public get(key: K): I | null {
    const entry = this.keymap.get(key);

    if (!entry) {
      return null;
    }

    this.markEntryAsUsed(entry);

    return entry.item;
  }

  public assign(entries: [K, I][]) {
    if (this._length > 0) {
      this.clear();
    }

    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  public set(key: K, item: I): K[] {
    // Check if entry exists.
    const existingEntry = this.keymap.get(key);
    if (existingEntry) {
      // Update existing entry.
      existingEntry.item = item;

      return [];
    }

    // Create new entry.
    const newEntry = createEntry(key, item);

    this.keymap.set(newEntry.key, newEntry);

    if (this.newest) {
      // Link previous newest to the new newest entry.
      this.newest[NEWER] = newEntry;
      newEntry[OLDER] = this.newest;
    } else {
      // This is the first entry, which is automatically the oldest.
      this.oldest = newEntry;
    }

    // The newly created entry is the newest entry.
    this.newest = newEntry;
    this._length++;

    return this.evict();
  }

  protected shift(): K | null {
    const entry = this.oldest;

    if (entry) {
      if (this.oldest[NEWER]) {
        // Advance the list.
        this.oldest = this.oldest[NEWER];
        this.oldest[OLDER] = undefined;
      } else {
        // Map is exhausted.
        this.oldest = undefined;
        this.newest = undefined;
      }

      // Remove references.
      entry[NEWER] = undefined;
      entry[OLDER] = undefined;
      this.keymap.delete(entry.key);

      this._length--;

      return entry.key;
    }

    return null;
  }

  protected markEntryAsUsed(entry: LRUEntry<K, I>) {
    if (entry === this.newest) {
      // Already the most recently used entry.
      return;
    }

    // HEAD--------------TAIL
    //   <.older   .newer>
    //  <--- add direction --
    //   A  B  C  <D>  E
    if (entry[NEWER]) {
      if (entry === this.oldest) {
        this.oldest = entry[NEWER];
      }

      entry[NEWER][OLDER] = entry[OLDER]; // C <-- E.
    }

    if (entry[OLDER]) {
      entry[OLDER][NEWER] = entry[NEWER]; // C. --> E
    }

    entry[NEWER] = undefined; // D --x
    entry[OLDER] = this.newest; // D. --> E

    if (this.newest) {
      this.newest[NEWER] = entry; // E. <-- D
    }

    this.newest = entry;
  }

  protected abstract evict(): K[];

  public [Symbol.iterator]() {
    return new EntryIterator(this.oldest);
  }

  public keys() {
    return new KeyIterator(this.oldest);
  }

  public values() {
    return new ValueIterator(this.oldest);
  }

  public entries() {
    return this[Symbol.iterator]();
  }

  public find(key: K) {
    const entry = this.keymap.get(key);

    return entry ? entry.item : undefined;
  }

  public has(key: K) {
    return this.keymap.has(key);
  }

  public delete(key: K) {
    const entry = this.keymap.get(key);

    // Nothing to delete.
    if (!entry) {
      return false;
    }

    this.keymap.delete(entry.key);

    if (entry[NEWER] && entry[OLDER]) {
      // Relink older entry with the newer entry.
      entry[OLDER][NEWER] = entry[NEWER];
      entry[NEWER][OLDER] = entry[OLDER];
    } else if (entry[NEWER]) {
      // Make second oldest entry the oldest entry.
      entry[NEWER][OLDER] = undefined;
      this.oldest = entry[NEWER];
    } else if (entry[OLDER]) {
      // Make second newest entry the newest entry.
      entry[OLDER][NEWER] = undefined;
      this.newest = entry[OLDER];
    } else {
      // Removed last entry in map.
      this.newest = undefined;
      this.oldest = undefined;
    }

    this._length--;

    return true;
  }

  public clear() {
    this.newest = undefined;
    this.oldest = undefined;
    this._length = 0;

    this.keymap.clear();
  }

  public toString() {
    let s = '';

    for (const [key] of this) {
      s += `${key} < `;
    }

    return s.substring(0, s.length - 3);
  }

  public toJson() {
    const data = [];

    for (const entry of this) {
      data.push(entry);
    }

    return JSON.stringify(data);
  }

  public assignFromJson(data: string) {
    const entries = JSON.parse(data);

    this.assign(entries);
  }
}
