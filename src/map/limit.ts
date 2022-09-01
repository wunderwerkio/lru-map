import { LRUItem, Value } from '../entry';
import { LRUMap, Key } from './base';

export class LimitBasedLRUMap<K extends Key, V extends Value> extends LRUMap<
  K,
  V,
  LRUItem<V>
> {
  protected limit: number;

  constructor(limit: number, entries: [K, LRUItem<V>][] = []) {
    super();

    this.limit = limit;

    if (entries && entries.length > 0) {
      this.assign(entries);
    }
  }

  protected evict() {
    if (this._length > this.limit) {
      return [this.shift()];
    }

    return [];
  }
}
