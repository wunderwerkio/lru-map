import { expect, test } from 'vitest';
import type { SizedLRUItem } from '../src/entry/index.js';
import { LimitAndSizeBasedLRUMap } from '../src/map/limit-and-size.js';

test('should evict when limit is exceeded even if size is within bounds', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 1000);

  map.set('one', { value: 1, size: 10 });
  map.set('two', { value: 2, size: 10 });
  map.set('three', { value: 3, size: 10 });

  expect(map.length).toEqual(3);
  expect(map.size).toEqual(30);

  // Adding fourth item exceeds limit (3) but not size (1000)
  const evicted = map.set('four', { value: 4, size: 10 });

  expect(evicted).toEqual(['one']);
  expect(map.length).toEqual(3);
  expect(map.size).toEqual(30);
  expect(Array.from(map.keys())).toEqual(['two', 'three', 'four']);
});

test('should evict when size is exceeded even if limit is within bounds', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(10, 100);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 40 });

  expect(map.length).toEqual(2);
  expect(map.size).toEqual(80);

  // Adding third item exceeds size (100) but not limit (10)
  const evicted = map.set('three', { value: 3, size: 30 });

  expect(evicted).toEqual(['one']);
  expect(map.length).toEqual(2);
  expect(map.size).toEqual(70);
  expect(Array.from(map.keys())).toEqual(['two', 'three']);
});

test('should evict multiple items when necessary to satisfy both constraints', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(4, 100);

  map.set('one', { value: 1, size: 25 });
  map.set('two', { value: 2, size: 25 });
  map.set('three', { value: 3, size: 25 });
  map.set('four', { value: 4, size: 25 });

  expect(map.length).toEqual(4);
  expect(map.size).toEqual(100);

  // Adding fifth item with large size requires evicting multiple items
  // After adding 'five' (60): we have 5 items and 160 total size
  // Need to evict until: length <= 4 AND size <= 100
  // Evict 'one': 4 items, 135 size - still exceeds size
  // Evict 'two': 3 items, 110 size - still exceeds size
  // Evict 'three': 2 items, 85 size - now within both constraints
  const evicted = map.set('five', { value: 5, size: 60 });

  expect(evicted).toEqual(['one', 'two', 'three']);
  expect(map.length).toEqual(2);
  expect(map.size).toEqual(85);
  expect(Array.from(map.keys())).toEqual(['four', 'five']);
});

test('should accept items until both constraints are satisfied', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 200);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 40 });
  map.set('three', { value: 3, size: 40 });
  map.set('four', { value: 4, size: 40 });

  expect(map.length).toEqual(4);
  expect(map.size).toEqual(160);

  // Within both constraints
  map.set('five', { value: 5, size: 30 });

  expect(map.length).toEqual(5);
  expect(map.size).toEqual(190);
  expect(Array.from(map.keys())).toEqual([
    'one',
    'two',
    'three',
    'four',
    'five'
  ]);
});

test('should respect LRU ordering when evicting', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 100);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  // Make 'one' most recently used
  map.get('one');

  // Adding fourth item should evict 'two' (oldest)
  const evicted = map.set('four', { value: 4, size: 30 });

  expect(evicted).toEqual(['two']);
  expect(Array.from(map.keys())).toEqual(['three', 'one', 'four']);
});

test('should throw error when item size exceeds maxSize', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(10, 100);

  expect(() => map.set('huge', { value: 1, size: 150 })).toThrow(
    'item size exceeds max size'
  );
});

test('should update existing entry without eviction if constraints still met', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  expect(map.size).toEqual(60);

  // Update existing entry with same size
  const evicted = map.set('two', { value: 22, size: 20 });

  expect(evicted).toEqual([]);
  expect(map.length).toEqual(3);
  expect(map.size).toEqual(60);
  expect(map.get('two')).toEqual({ value: 22, size: 20 });
});

test('should handle size change when updating existing entry', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  expect(map.size).toEqual(60);

  // Update entry with larger size
  map.set('two', { value: 22, size: 50 });

  expect(map.size).toEqual(90); // 20 + 50 + 20
  expect(map.length).toEqual(3);
});

test('should evict when updating entry causes size to exceed maxSize', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.size).toEqual(90);

  // Update 'three' with larger size that exceeds maxSize
  const evicted = map.set('three', { value: 33, size: 50 });

  // Should evict oldest entries to make room
  expect(evicted).toEqual(['one']);
  expect(map.size).toEqual(80); // 30 + 50
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['two', 'three']);
});

test('should delete entry and update size', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 40 });
  map.set('three', { value: 3, size: 20 });

  expect(map.size).toEqual(90);

  const deleted = map.delete('two');

  expect(deleted).toBe(true);
  expect(map.size).toEqual(50);
  expect(map.length).toEqual(2);
});

test('should return false when deleting non-existent entry', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 30 });

  const deleted = map.delete('nonexistent');

  expect(deleted).toBe(false);
  expect(map.size).toEqual(30);
  expect(map.length).toEqual(1);
});

test('should clear all entries and reset size', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 40 });
  map.set('three', { value: 3, size: 20 });

  expect(map.size).toEqual(90);
  expect(map.length).toEqual(3);

  map.clear();

  expect(map.size).toEqual(0);
  expect(map.length).toEqual(0);
});

test('should construct with initial entries', () => {
  const entries: [string, SizedLRUItem<number>][] = [
    ['one', { value: 1, size: 30 }],
    ['two', { value: 2, size: 40 }],
    ['three', { value: 3, size: 30 }],
    ['four', { value: 4, size: 30 }]
  ];

  const map = new LimitAndSizeBasedLRUMap<string, number>(2, 100, entries);

  // Should only keep last 2 entries due to limit constraint
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
  expect(map.size).toEqual(60);
});

test('should handle find without affecting LRU order', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  // Use find() which doesn't affect LRU order
  const item = map.find('one');

  expect(item).toEqual({ value: 1, size: 20 });

  // Add fourth item - 'one' should still be evicted (it's oldest)
  const evicted = map.set('four', { value: 4, size: 20 });

  expect(evicted).toEqual(['one']);
});

test('should handle has() check', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });

  expect(map.has('one')).toBe(true);
  expect(map.has('two')).toBe(true);
  expect(map.has('three')).toBe(false);
});

test('should handle iterators', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  const keys = Array.from(map.keys());
  const values = Array.from(map.values());
  const entries = Array.from(map.entries());

  expect(keys).toEqual(['one', 'two', 'three']);
  expect(values).toEqual([
    { value: 1, size: 20 },
    { value: 2, size: 20 },
    { value: 3, size: 20 }
  ]);
  expect(entries).toEqual([
    ['one', { value: 1, size: 20 }],
    ['two', { value: 2, size: 20 }],
    ['three', { value: 3, size: 20 }]
  ]);
});

test('should handle toString()', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  expect(map.toString()).toBe('one < two < three');
});

test('should handle JSON serialization and deserialization', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 20 });
  map.set('two', { value: 2, size: 20 });
  map.set('three', { value: 3, size: 20 });

  const json = map.toJson();
  const newMap = new LimitAndSizeBasedLRUMap<string, number>(5, 100);
  newMap.assignFromJson(json);

  expect(newMap.length).toEqual(3);
  expect(newMap.size).toEqual(60);
  expect(Array.from(newMap.keys())).toEqual(['one', 'two', 'three']);
});

test('should handle edge case with both constraints at limit', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(3, 90);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.length).toEqual(3);
  expect(map.size).toEqual(90);

  // Add item that requires eviction due to both constraints
  const evicted = map.set('four', { value: 4, size: 30 });

  expect(evicted).toEqual(['one']);
  expect(map.length).toEqual(3);
  expect(map.size).toEqual(90);
});

test('should evict correctly when new item causes cascading evictions', () => {
  const map = new LimitAndSizeBasedLRUMap<string, number>(5, 100);

  map.set('one', { value: 1, size: 25 });
  map.set('two', { value: 2, size: 25 });
  map.set('three', { value: 3, size: 25 });
  map.set('four', { value: 4, size: 25 });

  expect(map.size).toEqual(100);
  expect(map.length).toEqual(4);

  // Add large item requiring multiple evictions
  const evicted = map.set('five', { value: 5, size: 80 });

  // Should evict entries until size constraint is satisfied
  expect(evicted.length).toBeGreaterThan(0);
  expect(map.size).toBeLessThanOrEqual(100);
  expect(map.has('five')).toBe(true);
});
