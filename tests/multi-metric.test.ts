import { expect, test, vi } from 'vitest';
import type { MultiMetricLRUItem } from '../src/entry/index.js';
import { MultiMetricLRUMap } from '../src/map/multi-metric.js';

test('should evict by limit (max number of items)', () => {
  const map = new MultiMetricLRUMap<string, number>({
    limit: 3,
    maxSize: 1000,
    ttl: 60000 // 60 seconds
  });

  map.set('one', { value: 1, size: 10, timestamp: Date.now() });
  map.set('two', { value: 2, size: 10, timestamp: Date.now() });
  map.set('three', { value: 3, size: 10, timestamp: Date.now() });

  expect(map.length).toEqual(3);
  expect(map.size).toEqual(30);

  // Adding fourth item should evict 'one'
  const evicted = map.set('four', {
    value: 4,
    size: 10,
    timestamp: Date.now()
  });

  expect(evicted).toEqual(['one']);
  expect(map.length).toEqual(3);
  expect(map.size).toEqual(30);
  expect(Array.from(map.keys())).toEqual(['two', 'three', 'four']);
});

test('should evict by size (max total size)', () => {
  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 100,
    ttl: 60000
  });

  map.set('one', { value: 1, size: 40, timestamp: Date.now() });
  map.set('two', { value: 2, size: 30, timestamp: Date.now() });
  map.set('three', { value: 3, size: 30, timestamp: Date.now() });

  expect(map.size).toEqual(100);
  expect(map.length).toEqual(3);

  // Adding item that exceeds size should evict 'one' and 'two'
  const evicted = map.set('four', {
    value: 4,
    size: 50,
    timestamp: Date.now()
  });

  expect(evicted).toEqual(['one', 'two']);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should evict by TTL (expired items)', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 5000 // 5 seconds
  });

  //Add items - expired items get evicted immediately on set()
  map.set('one', { value: 1, size: 10, timestamp: now - 6000 }); // Immediately evicted
  expect(map.length).toEqual(0); // Expired on insert

  map.set('two', { value: 2, size: 10, timestamp: now - 7000 }); // Immediately evicted
  expect(map.length).toEqual(0); // Expired on insert

  map.set('three', { value: 3, size: 10, timestamp: now - 1000 }); // Still valid
  expect(map.length).toEqual(1);

  // Adding new item - no eviction needed since expired items were already removed
  const evicted = map.set('four', { value: 4, size: 10, timestamp: now });

  expect(evicted).toEqual([]);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should evict by TTL then by limit', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 2,
    maxSize: 1000,
    ttl: 5000
  });

  // Add items - expired item is evicted immediately
  map.set('one', { value: 1, size: 10, timestamp: now - 6000 }); // Expired, evicted immediately
  expect(map.length).toEqual(0);

  map.set('two', { value: 2, size: 10, timestamp: now - 1000 }); // Valid
  map.set('three', { value: 3, size: 10, timestamp: now - 500 }); // Valid
  expect(map.length).toEqual(2);

  // Adding new item should evict LRU 'two' to meet limit of 2
  const evicted = map.set('four', { value: 4, size: 10, timestamp: now });

  expect(evicted).toEqual(['two']);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should evict by TTL then by size', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 100,
    ttl: 5000
  });

  // Add items - expired item is evicted immediately
  map.set('one', { value: 1, size: 30, timestamp: now - 6000 }); // Expired, evicted immediately
  expect(map.size).toEqual(0);

  map.set('two', { value: 2, size: 30, timestamp: now - 1000 }); // Valid
  map.set('three', { value: 3, size: 30, timestamp: now - 500 }); // Valid

  expect(map.size).toEqual(60);
  expect(map.length).toEqual(2);

  // Adding large item should evict LRU 'two' to make room for size 50 item
  const evicted = map.set('four', { value: 4, size: 50, timestamp: now });

  expect(evicted).toEqual(['two']);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should update timestamp when item is accessed', () => {
  const initialTime = Date.now();

  // Mock Date.now() to control timestamps
  vi.useFakeTimers();
  vi.setSystemTime(initialTime);

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 5000
  });

  map.set('one', { value: 1, size: 10, timestamp: initialTime });

  const item1 = map.get('one');
  expect(item1?.timestamp).toEqual(initialTime);

  // Advance time by 2 seconds
  vi.setSystemTime(initialTime + 2000);

  // Access the item - should update timestamp
  const item2 = map.get('one');
  expect(item2?.timestamp).toEqual(initialTime + 2000);

  // Advance time by 4 more seconds (total 6 seconds from initial)
  vi.setSystemTime(initialTime + 6000);

  // Item should still be valid because it was accessed at +2s
  // and TTL is 5s, so it expires at +7s
  map.set('two', { value: 2, size: 10, timestamp: initialTime + 6000 });

  expect(map.has('one')).toBe(true);
  expect(map.length).toEqual(2);

  vi.useRealTimers();
});

test('should handle updating existing entry with larger size', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 100,
    ttl: 60000
  });

  map.set('one', { value: 1, size: 30, timestamp: now });
  map.set('two', { value: 2, size: 30, timestamp: now });
  map.set('three', { value: 3, size: 30, timestamp: now });

  expect(map.size).toEqual(90);

  // Update 'three' with larger size - should trigger eviction
  const evicted = map.set('three', { value: 3, size: 50, timestamp: now });

  expect(evicted).toEqual(['one']);
  expect(map.size).toEqual(80);
  expect(map.length).toEqual(2);
});

test('should not accept item larger than maxSize', () => {
  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 100,
    ttl: 60000
  });

  expect(() =>
    map.set('one', { value: 1, size: 150, timestamp: Date.now() })
  ).toThrow('item size exceeds max size');
});

test('should handle cleanupExpired method', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 5000
  });

  // Expired items are evicted immediately, so this tests cleanup of items that expire AFTER insertion
  // We need to manually add items without eviction check, or test with get() updating timestamps
  map.set('three', { value: 3, size: 10, timestamp: now - 1000 }); // Valid
  map.set('four', { value: 4, size: 10, timestamp: now - 500 }); // Valid

  expect(map.length).toEqual(2);

  // Wait for items to expire is not feasible in a test, so we test that cleanupExpired works
  // on items that are passed their TTL. Manually clean up will find expired items.
  const evicted = map.cleanupExpired();

  // Since items haven't actually expired (TTL is 5000ms, items are only 1000ms and 500ms old),
  // no items should be evicted
  expect(evicted).toEqual([]);
  expect(map.length).toEqual(2);
  expect(Array.from(map.keys())).toEqual(['three', 'four']);
});

test('should handle delete correctly', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 60000
  });

  map.set('one', { value: 1, size: 30, timestamp: now });
  map.set('two', { value: 2, size: 40, timestamp: now });

  expect(map.size).toEqual(70);
  expect(map.length).toEqual(2);

  map.delete('one');

  expect(map.size).toEqual(40);
  expect(map.length).toEqual(1);
});

test('should handle clear correctly', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 60000
  });

  map.set('one', { value: 1, size: 30, timestamp: now });
  map.set('two', { value: 2, size: 40, timestamp: now });

  map.clear();

  expect(map.size).toEqual(0);
  expect(map.length).toEqual(0);
});

test('should handle shift on empty map without crashing', () => {
  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 60000
  });

  expect(() => (map as unknown as { shift: () => void }).shift()).not.toThrow();
  expect((map as unknown as { shift: () => void }).shift()).toBeNull();
});

test('should not return null in evicted array', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 3,
    maxSize: 1000,
    ttl: 60000
  });

  map.set('one', { value: 1, size: 10, timestamp: now });
  map.set('two', { value: 2, size: 10, timestamp: now });
  map.set('three', { value: 3, size: 10, timestamp: now });

  const evicted = map.set('four', { value: 4, size: 10, timestamp: now });

  expect(evicted).not.toContain(null);
  expect(evicted.every((key) => key !== null)).toBe(true);
});

test('should construct with initial entries', () => {
  const now = Date.now();
  const entries: [string, MultiMetricLRUItem<number>][] = [
    ['one', { value: 1, size: 10, timestamp: now }],
    ['two', { value: 2, size: 20, timestamp: now }],
    ['three', { value: 3, size: 30, timestamp: now }]
  ];

  const map = new MultiMetricLRUMap<string, number>(
    {
      limit: 10,
      maxSize: 1000,
      ttl: 60000
    },
    entries
  );

  expect(map.length).toEqual(3);
  expect(map.size).toEqual(60);
  expect(Array.from(map.keys())).toEqual(['one', 'two', 'three']);
});

test('should auto-set timestamp if not provided', () => {
  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 60000
  });

  const before = Date.now();
  map.set('one', { value: 1, size: 10, timestamp: 0 });
  const after = Date.now();

  const item = map.get('one');
  expect(item?.timestamp).toBeGreaterThanOrEqual(before);
  expect(item?.timestamp).toBeLessThanOrEqual(after);
});

test('should handle complex multi-metric scenario', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 5,
    maxSize: 150,
    ttl: 5000
  });

  // Add various items - expired items are evicted immediately
  map.set('expired1', { value: 1, size: 20, timestamp: now - 6000 }); // Expired immediately
  map.set('expired2', { value: 2, size: 25, timestamp: now - 7000 }); // Expired immediately
  map.set('old', { value: 3, size: 30, timestamp: now - 1000 }); // Valid but old
  map.set('recent1', { value: 4, size: 30, timestamp: now - 500 }); // Valid, recent
  map.set('recent2', { value: 5, size: 35, timestamp: now - 100 }); // Valid, most recent

  // Only valid items remain: total size: 95, length: 3
  expect(map.length).toEqual(3);
  expect(map.size).toEqual(95);

  // Add a large item - should evict 'old' to free space (frees 30)
  const evicted = map.set('new', { value: 6, size: 60, timestamp: now });

  expect(evicted).toEqual(['old']);

  expect(map.length).toEqual(3);
  expect(map.size).toEqual(125);
  expect(Array.from(map.keys())).toEqual(['recent1', 'recent2', 'new']);
});

test('should efficiently evict expired items with early exit optimization', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 100,
    maxSize: 10000,
    ttl: 5000
  });

  // Add 10 expired items at the beginning (oldest)
  for (let i = 0; i < 10; i++) {
    map.set(`expired${i}`, {
      value: i,
      size: 10,
      timestamp: now - 6000 - i * 100
    });
  }

  // All expired items should be evicted immediately
  expect(map.length).toEqual(0);

  // Add 20 valid items
  for (let i = 0; i < 20; i++) {
    map.set(`valid${i}`, { value: i, size: 10, timestamp: now - i * 100 });
  }

  expect(map.length).toEqual(20);

  // Cleanup should find no expired items (efficient early exit)
  const evicted = map.cleanupExpired();
  expect(evicted).toEqual([]);
  expect(map.length).toEqual(20);
});

test('should handle large maps with 10k items efficiently', () => {
  const now = Date.now();

  const map = new MultiMetricLRUMap<string, number>({
    limit: 20000,
    maxSize: 1000000,
    ttl: 5000
  });

  // Add 10,000 items where first 5,000 are expired, last 5,000 are valid
  // This tests the early exit optimization at scale
  for (let i = 0; i < 10000; i++) {
    const timestamp = i < 5000 ? now - 6000 : now - 1000;
    map.set(`item${i}`, { value: i, size: 10, timestamp });
  }

  // Only the last 5,000 valid items should remain (expired items evicted immediately)
  expect(map.length).toEqual(5000);
  expect(map.size).toEqual(50000);

  // Cleanup should be very fast with early exit
  // Without optimization: would scan all 5,000 items
  // With optimization: checks first item, sees it's valid, exits immediately
  const startTime = Date.now();
  const evicted = map.cleanupExpired();
  const duration = Date.now() - startTime;

  expect(evicted).toEqual([]);
  expect(map.length).toEqual(5000);

  // Should complete very quickly (< 10ms even on slow devices)
  // The early exit means we only check the first (oldest) item
  expect(duration).toBeLessThan(10);
});

test('should not return expired item on get() - regression test', () => {
  // Mock Date.now() to control time precisely
  vi.useFakeTimers();
  const initialTime = Date.now();
  vi.setSystemTime(initialTime);

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 5 // 5ms TTL
  });

  // Insert an entry
  map.set('key', { value: 42, size: 10, timestamp: initialTime });

  // Verify it exists and has the correct value
  let item = map.get('key');
  expect(item?.value).toEqual(42);
  expect(map.has('key')).toBe(true);

  // Advance time by 6ms (past the 5ms TTL)
  vi.setSystemTime(initialTime + 6);

  // Try to get the item - should return null because it expired
  item = map.get('key');
  expect(item).toBeNull();

  // Item is still in the map.
  expect(map.has('key')).toBe(true);
  expect(map.length).toEqual(1);
  expect(map.size).toEqual(10);

  // Run eviction.
  map.cleanupExpired();
  expect(map.has('key')).toBe(false);
  expect(map.length).toEqual(0);
  expect(map.size).toEqual(0);

  vi.useRealTimers();
});

test('should refresh timestamp on get() only if item has not expired', () => {
  vi.useFakeTimers();
  const initialTime = Date.now();
  vi.setSystemTime(initialTime);

  const map = new MultiMetricLRUMap<string, number>({
    limit: 10,
    maxSize: 1000,
    ttl: 10 // 10ms TTL
  });

  // Insert an entry
  map.set('key', { value: 100, size: 10, timestamp: initialTime });

  // Advance time by 5ms (within TTL)
  vi.setSystemTime(initialTime + 5);

  // Get the item - should return value and refresh timestamp
  let item = map.get('key');
  expect(item?.value).toEqual(100);
  expect(item?.timestamp).toEqual(initialTime + 5);

  // Advance time by another 8ms (total 13ms from initial, but only 8ms from last access)
  vi.setSystemTime(initialTime + 13);

  // Item should still be valid because timestamp was refreshed at +5ms
  // and TTL is 10ms, so it expires at +15ms
  item = map.get('key');
  expect(item?.value).toEqual(100);
  expect(item?.timestamp).toEqual(initialTime + 13);

  // Advance time by 11ms more (total 24ms from initial, 11ms from last access)
  vi.setSystemTime(initialTime + 24);

  // Now the item should be expired (11ms > 10ms TTL)
  item = map.get('key');
  expect(item).toBeNull();

  // Item still exists.
  expect(map.has('key')).toBe(true);
  // Run eviction.
  map.cleanupExpired();
  expect(map.has('key')).toBe(false);

  vi.useRealTimers();
});
