import { LimitBasedLRUMap } from '../src/map/limit.js';
import test from 'ava';

const createMap = () => {
  const map = new LimitBasedLRUMap<string, number>(Number.MAX_VALUE);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });
  map.set('four', { value: 4 });

  return map;
};

test('should get previously set value', (t) => {
  const map = createMap();

  t.deepEqual(map.get('three'), { value: 3 });
});

test('should return key iterator', (t) => {
  const map = createMap();

  const keys = [];
  for (const key of map.keys()) {
    keys.push(key);
  }

  t.deepEqual(keys, ['one', 'two', 'three', 'four']);
});

test('should return value iterator', (t) => {
  const map = createMap();

  const values = [];
  for (const value of map.values()) {
    values.push(value);
  }

  t.deepEqual(values, [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }]);
});

test('should be iteratable', (t) => {
  const map = createMap();

  const entries = [];
  for (const entry of map) {
    entries.push(entry);
  }

  t.deepEqual(entries, [
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ]);
});

test('should return entries iterator', (t) => {
  const map = createMap();

  const entries = [];
  for (const entry of map.entries()) {
    entries.push(entry);
  }

  t.deepEqual(entries, [
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ]);
});

test('should find value by key', (t) => {
  const map = createMap();

  t.deepEqual(map.find('three'), { value: 3 });
  t.is(map.find('invalid-key'), undefined);
});

test('should check if key exists', (t) => {
  const map = createMap();

  t.truthy(map.has('three'));
  t.falsy(map.has('invalid-key'));
});

test('should delete entry by key', (t) => {
  const map = createMap();

  t.deepEqual(Array.from(map.values()), [
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 }
  ]);

  t.truthy(map.has('three'));
  t.truthy(map.delete('three'));
  t.falsy(map.has('three'));
  t.falsy(map.delete('three'));

  t.deepEqual(Array.from(map.values()), [
    { value: 1 },
    { value: 2 },
    { value: 4 }
  ]);
});

test('should clear map', (t) => {
  const map = createMap();

  t.is(Array.from(map).length, 4);
  map.clear();
  t.is(Array.from(map).length, 0);
});

test('should print list as string', (t) => {
  const map = createMap();

  map.get('two');

  t.is(map.toString(), 'one < three < four < two');
});

test('should serialize', (t) => {
  const map = createMap();

  map.get('two');

  t.is(
    map.toJson(),
    '[["one",{"value":1}],["three",{"value":3}],["four",{"value":4}],["two",{"value":2}]]'
  );
});

test('should unserialize', (t) => {
  const map = createMap();

  const data =
    '[["one",{"value":1}],["three",{"value":3}],["four",{"value":4}],["two",{"value":2}]]';

  map.assignFromJson(data);

  t.deepEqual(Array.from(map.values()), [
    { value: 1 },
    { value: 3 },
    { value: 4 },
    { value: 2 }
  ]);
});
