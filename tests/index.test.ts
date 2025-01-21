import { LimitBasedLRUMap } from '../src/map/limit.js';
import { test, expect } from 'vitest';

const createMap = () => {
  const map = new LimitBasedLRUMap<string, number>(Number.MAX_VALUE);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });
  map.set('four', { value: 4 });

  return map;
};

test('should get previously set value', () => {
  const map = createMap();

  expect(map.get('three')).toEqual({ value: 3 });
});

test('should return key iterator', () => {
  const map = createMap();

  const keys = [];
  for (const key of map.keys()) {
    keys.push(key);
  }

  expect(keys).toEqual(['one', 'two', 'three', 'four']);
});

test('should return value iterator', () => {
  const map = createMap();

  const values = [];
  for (const value of map.values()) {
    values.push(value);
  }

  expect(values).toEqual([
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 }
  ]);
});

test('should be iteratable', () => {
  const map = createMap();

  const entries = [];
  for (const entry of map) {
    entries.push(entry);
  }

  expect(entries).toEqual([
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ]);
});

test('should return entries iterator', () => {
  const map = createMap();

  const entries = [];
  for (const entry of map.entries()) {
    entries.push(entry);
  }

  expect(entries).toEqual([
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ]);
});

test('should find value by key', () => {
  const map = createMap();

  expect(map.find('three')).toEqual({ value: 3 });
  expect(map.find('invalid-key')).toBeUndefined();
});

test('should check if key exists', () => {
  const map = createMap();

  expect(map.has('three')).toBeTruthy();
  expect(map.has('invalid-key')).toBeFalsy();
});

test('should delete entry by key', () => {
  const map = createMap();

  expect(Array.from(map.values())).toEqual([
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 }
  ]);

  expect(map.has('three')).toBeTruthy();
  expect(map.delete('three')).toBeTruthy();
  expect(map.has('three')).toBeFalsy();
  expect(map.delete('three')).toBeFalsy();

  expect(Array.from(map.values())).toEqual([
    { value: 1 },
    { value: 2 },
    { value: 4 }
  ]);
});

test('should clear map', () => {
  const map = createMap();

  expect(Array.from(map).length).toEqual(4);
  map.clear();
  expect(Array.from(map).length).toEqual(0);
});

test('should print list as string', () => {
  const map = createMap();

  map.get('two');

  expect(map.toString()).toEqual('one < three < four < two');
});

test('should serialize', () => {
  const map = createMap();

  map.get('two');

  expect(map.toJson()).toEqual(
    '[["one",{"value":1}],["three",{"value":3}],["four",{"value":4}],["two",{"value":2}]]'
  );
});

test('should unserialize', () => {
  const map = createMap();

  const data =
    '[["one",{"value":1}],["three",{"value":3}],["four",{"value":4}],["two",{"value":2}]]';

  map.assignFromJson(data);

  expect(Array.from(map.values())).toEqual([
    { value: 1 },
    { value: 3 },
    { value: 4 },
    { value: 2 }
  ]);
});
