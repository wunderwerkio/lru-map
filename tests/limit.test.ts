import { LRUItem } from '../src/entry/index.js';
import { LimitBasedLRUMap } from '../src/map/limit.js';
import test from 'ava';

const createMap = (limit: number) => {
  const map = new LimitBasedLRUMap<string, number>(limit);

  map.set('one', { value: 1 });
  map.set('two', { value: 2 });
  map.set('three', { value: 3 });
  map.set('four', { value: 4 });

  return map;
};

test('should remove least recently used entry if exceeding limit', (t) => {
  const map = createMap(4);

  t.deepEqual(Array.from(map.values()), [
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 }
  ]);

  t.deepEqual(map.set('five', { value: 5 }), ['one']);

  t.deepEqual(Array.from(map.values()), [
    { value: 2 },
    { value: 3 },
    { value: 4 },
    { value: 5 }
  ]);

  // Make 'two' the most recently used entry.
  map.get('two');
  t.deepEqual(map.set('six', { value: 6 }), ['three']);

  t.deepEqual(Array.from(map.values()), [
    { value: 4 },
    { value: 5 },
    { value: 2 },
    { value: 6 }
  ]);
});

test('should construct with initial entries', (t) => {
  const entries: [string, LRUItem<number>][] = [
    ['one', { value: 1 }],
    ['two', { value: 2 }],
    ['three', { value: 3 }],
    ['four', { value: 4 }]
  ];
  const map = new LimitBasedLRUMap<string, number>(2, entries);

  t.is(map.length, 2);
  t.deepEqual(Array.from(map.keys()), ['three', 'four']);
});
