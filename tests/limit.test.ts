import { expect, test } from 'vitest';
import type { LRUItem } from '../src/entry/index.js';
import { LimitBasedLRUMap } from '../src/map/limit.js';

const createMap = (limit: number) => {
  const map = new LimitBasedLRUMap<string, number>(limit);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });
  map.set('four', { value: 4 });

  return map;
};

test('should remove least recently used entry if exceeding limit', () => {
  const map = createMap(4);

  expect(Array.from(map.values())).toEqual([
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 }
  ]);

  expect(map.set('five', { value: 5 })).toEqual(['one']);

  expect(Array.from(map.values())).toEqual([
    { value: 2 },
    { value: 3 },
    { value: 4 },
    { value: 5 }
  ]);

  // Make 'two' the most recently used entry.
  map.get('two');
  expect(map.set('six', { value: 6 })).toEqual(['three']);

  expect(Array.from(map.values())).toEqual([
    { value: 4 },
    { value: 5 },
    { value: 2 },
    { value: 6 }
  ]);
});

test('should construct with initial entries', () => {
  const entries: [string, LRUItem<number>][] = [
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ];
  const map = new LimitBasedLRUMap<string, number>(2, entries);

  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should not evict when updating existing entry', () => {
  const map = new LimitBasedLRUMap<string, number>(3);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });

  expect(map.length).toEqual(3);

  // Update existing entry - this doesn't add a new entry so no eviction needed
  const evicted = map.set('two', { value: 22 });

  expect(evicted).toEqual([]);
  expect(map.length).toEqual(3);
  expect(map.get('two')).toEqual({ value: 22 });
});

test('should still respect limit after updating entries', () => {
  const map = new LimitBasedLRUMap<string, number>(3);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });

  // Update an existing entry (doesn't change position in LRU order)
  map.set('two', { value: 22 });

  expect(map.length).toEqual(3);

  // Now add a new entry - should evict oldest ('one')
  const evicted = map.set('four', { value: 4 });

  expect(evicted).toEqual(['one']);
  expect(map.length).toEqual(3);
  // Order is: two (oldest), three, four (newest)
  expect(Array.from(map.keys())).toEqual(['two', 'three', 'four']);
});

test('should handle shift on empty map without crashing', () => {
  const map = new LimitBasedLRUMap<string, number>(10);

  // Call shift on an empty map - should not crash
  expect(() => (map as unknown as { shift: () => void }).shift()).not.toThrow();
  expect((map as unknown as { shift: () => void }).shift()).toBeNull();
});

test('should handle eviction after clearing map', () => {
  const map = new LimitBasedLRUMap<string, number>(2);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });

  // Clear the map
  map.clear();

  expect(map.length).toEqual(0);

  // Now try to add items - this should not crash
  expect(() => map.set('three', { value: 3 })).not.toThrow();
  expect(map.length).toEqual(1);
});

test('should not return null in evicted array', () => {
  const map = new LimitBasedLRUMap<string, number>(3);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });

  // Add fourth item to trigger eviction
  const evicted = map.set('four', { value: 4 });

  // Check that no null values are in the evicted array
  expect(evicted).not.toContain(null);
  expect(evicted.every((key) => key !== null)).toBe(true);
  expect(evicted).toEqual(['one']);
});
