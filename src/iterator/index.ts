import { LRUEntry, NEWER } from '../entry/index.js';

type LRUIteratorResult<R> = {
  done: boolean;
  value: R | undefined;
};

abstract class LRUIterator<K, V, R> {
  protected entry: LRUEntry<K, V>;

  constructor(oldestEntry: LRUEntry<K, V>) {
    this.entry = oldestEntry;
  }

  public [Symbol.iterator]() {
    return this;
  }

  public next(): LRUIteratorResult<R> {
    const entry = this.entry;

    if (entry) {
      this.entry = entry[NEWER];

      return {
        done: false,
        value: this.buildValue(entry)
      };
    } else {
      return {
        done: true,
        value: undefined
      };
    }
  }

  protected abstract buildValue(entry: LRUEntry<K, V>): R;
}

export class EntryIterator<K, V> extends LRUIterator<K, V, [K, V]> {
  protected buildValue(entry: LRUEntry<K, V>): [K, V] {
    return [entry.key, entry.item];
  }
}

export class KeyIterator<K, V> extends LRUIterator<K, V, K> {
  protected buildValue(entry: LRUEntry<K, V>) {
    return entry.key;
  }
}

export class ValueIterator<K, V> extends LRUIterator<K, V, V> {
  protected buildValue(entry: LRUEntry<K, V>) {
    return entry.item;
  }
}
