export const NEWER = Symbol('newer');
export const OLDER = Symbol('older');

export type Value = object | string | number | boolean | null;

export interface LRUItem<V extends Value> {
  value: V;
}

export interface SizedLRUItem<V extends Value> extends LRUItem<V> {
  size: number;
}

export interface LRUEntry<K, V> {
  key: K;
  item: V;

  [NEWER]: LRUEntry<K, V>;
  [OLDER]: LRUEntry<K, V>;
}

export const createEntry = <K, V>(key: K, item: V): LRUEntry<K, V> => ({
  key,
  item,

  [NEWER]: undefined,
  [OLDER]: undefined
});
