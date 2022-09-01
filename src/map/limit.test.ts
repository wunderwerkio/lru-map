import { LRUItem } from '../entry';
import { LimitBasedLRUMap } from './limit';

describe('Limit based LRU Map', () => {
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

    expect(map.length).toBe(2);
    expect(Array.from(map.keys())).toEqual(['three', 'four']);
  });
});
