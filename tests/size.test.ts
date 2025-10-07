import { expect, test } from 'vitest';
import type { SizedLRUItem } from '../src/entry/index.js';
import { SizeBasedLRUMap } from '../src/map/size.js';

test('should accept items up until maxSize is reached', () => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });

  map.get('three');

  expect(Array.from(map.values())).toEqual([
    { value: 1, size: 24 },
    { value: 2, size: 300 },
    { value: 4, size: 400 },
    { value: 3, size: 300 }
  ]);
  expect(map.size).toEqual(1024);
});

test('should make place for new item', () => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });

  expect(map.set('five', { value: 5, size: 50 })).toEqual(['one', 'two']);

  expect(Array.from(map.values())).toEqual([
    { value: 3, size: 300 },
    { value: 4, size: 400 },
    { value: 5, size: 50 }
  ]);
  expect(map.size).toEqual(750);

  map.clear();

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });
  map.set('five', { value: 5, size: 1024 });

  expect(Array.from(map.values())).toEqual([{ value: 5, size: 1024 }]);
  expect(map.size).toEqual(1024);
});

test('should not accept item larger than maxSize', () => {
  const map = new SizeBasedLRUMap(1024);

  expect(() => map.set('one', { value: 1, size: 2048 })).toThrow();
});

test('should have correct size when deleting an entry', () => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });

  expect(map.size).toEqual(324);
  map.delete('one');
  expect(map.size).toEqual(300);
});

test('should have correct size on clear', () => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });

  map.clear();

  expect(map.size).toEqual(0);
});

test('should construct with initial entries', () => {
  const entries: [string, SizedLRUItem<number>][] = [
    ['one', { value: 1, size: 24 }],
    ['two', { value: 2, size: 76 }]
  ];
  const map = new SizeBasedLRUMap<string, number>(1024, entries);

  expect(map.size).toEqual(100);
});

test('should serialize', () => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 200 });
  map.get('two');

  expect(map.toJson()).toEqual(
    '[["one",{"value":1,"size":24}],["three",{"value":3,"size":200}],["two",{"value":2,"size":300}]]'
  );
});

test('should unserialize', () => {
  const map = new SizeBasedLRUMap(1024);

  const data =
    '[["one",{"value":1,"size": 35}],["three",{"value":3,"size": 500}],["four",{"value":4,"size": 50}],["two",{"value":2,"size": 15}]]';

  map.assignFromJson(data);

  expect(Array.from(map.values())).toEqual([
    { value: 1, size: 35 },
    { value: 3, size: 500 },
    { value: 4, size: 50 },
    { value: 2, size: 15 }
  ]);
  expect(map.size).toEqual(600);
});

test('should evict when updating existing entry with larger size', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.size).toEqual(100);
  expect(map.length).toEqual(3);

  // Update 'three' with a much larger size
  // This should trigger eviction of 'one' and 'two' to make room
  const evicted = map.set('three', { value: 3, size: 80 });

  expect(evicted).toEqual(['one', 'two']);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(1);
  expect(Array.from(map.keys())).toEqual(['three']);
});

test('should evict when updating existing entry causes size to exceed limit', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 30 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.size).toEqual(90);
  expect(map.length).toEqual(3);

  // Update 'three' to size 50, which brings total to 110
  // Should evict 'one' to bring it back under 100
  const evicted = map.set('three', { value: 3, size: 50 });

  expect(evicted).toEqual(['one']);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['two', 'three']);
});

test('should not evict when updating existing entry with smaller size', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.size).toEqual(100);

  // Update 'three' with a smaller size - no eviction needed
  const evicted = map.set('three', { value: 3, size: 10 });

  expect(evicted).toEqual([]);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(3);
});

test('should not evict when updating existing entry with same size', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  expect(map.size).toEqual(100);

  // Update 'three' with same size - no eviction needed
  const evicted = map.set('three', { value: 333, size: 30 });

  expect(evicted).toEqual([]);
  expect(map.size).toEqual(100);
  expect(map.length).toEqual(3);
  expect(map.get('three')).toEqual({ value: 333, size: 30 });
});

test('should handle shift on empty map without crashing', () => {
  const map = new SizeBasedLRUMap(1024);

  // Call shift on an empty map - should not crash
  expect(() => (map as unknown as { shift: () => void }).shift()).not.toThrow();
  expect((map as unknown as { shift: () => void }).shift()).toBeNull();
});

test('should handle eviction after clearing map', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 50 });
  map.set('two', { value: 2, size: 50 });

  // Clear the map
  map.clear();

  expect(map.size).toEqual(0);
  expect(map.length).toEqual(0);

  // Now try to add a new item - this should not crash
  expect(() => map.set('three', { value: 3, size: 50 })).not.toThrow();
  expect(map.size).toEqual(50);
  expect(map.length).toEqual(1);
});

test('should not return null in evicted array', () => {
  const map = new SizeBasedLRUMap(100);

  map.set('one', { value: 1, size: 40 });
  map.set('two', { value: 2, size: 30 });
  map.set('three', { value: 3, size: 30 });

  // Update 'three' with larger size to trigger eviction
  const evicted = map.set('three', { value: 3, size: 80 });

  // Check that no null values are in the evicted array
  expect(evicted).not.toContain(null);
  expect(evicted.every((key) => key !== null)).toBe(true);
  expect(evicted).toEqual(['one', 'two']);
});
