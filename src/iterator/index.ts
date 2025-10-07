import { type LRUEntry, NEWER } from '../entry/index.js';

type LRUIteratorResult<R> = {
  done: boolean;
  value: R | undefined;
};

/** Base iterator for traversing LRU entries from oldest to newest. */
abstract class LRUIterator<K, V, R> {
  protected entry: LRUEntry<K, V>;

  constructor(oldestEntry: LRUEntry<K, V>) {
    this.entry = oldestEntry;
  }

  public [Symbol.iterator]() {
    return this;
  }

  /** Returns the next item in the iteration sequence. */
  public next(): LRUIteratorResult<R> {
    const entry = this.entry;

    if (entry) {
      this.entry = entry[NEWER];

      return {
        done: false,
        value: this.buildValue(entry)
      };
    }
    return {
      done: true,
      value: undefined
    };
  }

  protected abstract buildValue(entry: LRUEntry<K, V>): R;
}

/** Iterator that returns [key, value] tuples. */
export class EntryIterator<K, V> extends LRUIterator<K, V, [K, V]> {
  protected buildValue(entry: LRUEntry<K, V>): [K, V] {
    return [entry.key, entry.item];
  }
}

/** Iterator that returns only keys. */
export class KeyIterator<K, V> extends LRUIterator<K, V, K> {
  protected buildValue(entry: LRUEntry<K, V>) {
    return entry.key;
  }
}

/** Iterator that returns only values. */
export class ValueIterator<K, V> extends LRUIterator<K, V, V> {
  protected buildValue(entry: LRUEntry<K, V>) {
    return entry.item;
  }
}
