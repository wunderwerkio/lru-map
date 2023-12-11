import { SizedLRUItem } from '../src/entry/index.js';
import { SizeBasedLRUMap } from '../src/map/size.js';
import test from 'ava';

test('should accept items up until maxSize is reached', (t) => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });

  map.get('three');

  t.deepEqual(Array.from(map.values()), [
    { value: 1, size: 24 },
    { value: 2, size: 300 },
    { value: 4, size: 400 },
    { value: 3, size: 300 }
  ]);
  t.is(map.size, 1024);
});

test('should make place for new item', (t) => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });

  t.deepEqual(map.set('five', { value: 5, size: 50 }), ['one', 'two']);

  t.deepEqual(Array.from(map.values()), [
    { value: 3, size: 300 },
    { value: 4, size: 400 },
    { value: 5, size: 50 }
  ]);
  t.is(map.size, 750);

  map.clear();

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 300 });
  map.set('four', { value: 4, size: 400 });
  map.set('five', { value: 5, size: 1024 });

  t.deepEqual(Array.from(map.values()), [{ value: 5, size: 1024 }]);
  t.is(map.size, 1024);
});

test('should not accept item larger than maxSize', (t) => {
  const map = new SizeBasedLRUMap(1024);

  t.throws(() => map.set('one', { value: 1, size: 2048 }));
});

test('should have correct size when deleting an entry', (t) => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });

  t.is(map.size, 324);
  map.delete('one');
  t.is(map.size, 300);
});

test('should have correct size on clear', (t) => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });

  map.clear();

  t.is(map.size, 0);
});

test('should construct with initial entries', (t) => {
  const entries: [string, SizedLRUItem<number>][] = [
    ['one', { value: 1, size: 24 }],
    ['two', { value: 2, size: 76 }]
  ];
  const map = new SizeBasedLRUMap<string, number>(1024, entries);

  t.is(map.size, 100);
});

test('should serialize', (t) => {
  const map = new SizeBasedLRUMap(1024);

  map.set('one', { value: 1, size: 24 });
  map.set('two', { value: 2, size: 300 });
  map.set('three', { value: 3, size: 200 });
  map.get('two');

  t.is(
    map.toJson(),
    '[["one",{"value":1,"size":24}],["three",{"value":3,"size":200}],["two",{"value":2,"size":300}]]'
  );
});

test('should unserialize', (t) => {
  const map = new SizeBasedLRUMap(1024);

  const data =
    '[["one",{"value":1,"size": 35}],["three",{"value":3,"size": 500}],["four",{"value":4,"size": 50}],["two",{"value":2,"size": 15}]]';

  map.assignFromJson(data);

  t.deepEqual(Array.from(map.values()), [
    { value: 1, size: 35 },
    { value: 3, size: 500 },
    { value: 4, size: 50 },
    { value: 2, size: 15 }
  ]);
  t.is(map.size, 600);
});
