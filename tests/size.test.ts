import { SizedLRUItem } from '../src/entry/index.js';
import { SizeBasedLRUMap } from '../src/map/size.js';
import { test, expect } from 'vitest';

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
