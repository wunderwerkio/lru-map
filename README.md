# LRU Map implementation

This package provides a Map that implements the LRU (Least Recently Used) algorithm.

Most of the implementation was inferred from [rsms/js-lru](https://github.com/rsms/js-lru).

## Design

- Map entry priority is achieved by linking each entry to the newer
  and older sibling in the list.
- The map has a *head* (oldest) and a *tail* (newest).
- When an entry is retrieved from the list, it is automatically the newest entry.
- The map can be serialized to JSON and created from previously serialized
  data. This makes the map persistable in the browser.

**General design**:

```txt
           entry             entry             entry             entry
           ______            ______            ______            ______
          | head |.newer => |      |.newer => |      |.newer => | tail |
.oldest = |  A   |          |  B   |          |  C   |          |  D   | = .newest
          |______| <= older.|______| <= older.|______| <= older.|______|

       removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
```

## Flavors

The LRU Map is currently implemented in two flavors:

- **Limit based**
  A limit of the maximum number of entries the LRU map can hold defines
  the max number of valid entries.
  When a new entry is added to the map, the oldest entry is removed.
- **Entry-Size based**
  Each entry must have a size associated with it (e.g. bytes) when adding them
  to the map.
  The map has a maximum size that must not be exceeded.
  When a new entry is added to the map, the oldest entry/entries are removed
  until the new entries size fits into the map.

## Examples

### Limit based

```typescript
import { LimitBasedLRUMap } from '@wunderwerk/lru-map';

const map = new LimitBasedLRUMap<string, string>(3);

map.set('one', { value: 'value-one' });
map.set('two', { value: 'value-two' });
map.set('three', { value: 'value-three' });

map.toString();     // -> "one < two < three";

// By getting 'two', it is now the most recently used entry.
map.get('two');

map.toString();     // -> "one < three < two";

// By adding a new entry and therefore exceeding the map limit of 3,
// The least recently used entry is removed.
map.set('four', { value: 'value-four' });

map.toString();     // -> "three < two < four";
```

### Size based

```typescript
import { SizeBasedLRUMap } from '@wunderwerk/lru-map';

const map = new SizeBasedLRUMap<string, string>(100);

map.set('one', { value: 'value-one', size: 20 });
map.set('two', { value: 'value-two', size: 50 });
map.set('three', { value: 'value-three', size: 30 });

map.toString();     // -> "one < two < three"
map.size;           // -> 100

// By adding a new entry and therefore exceeding the map size of 100,
// the oldest entries are removed until there is room for the new entry.
// In our case, the two oldest entries are removed.
map.set('four', { value: 'value-four', size: 30 });

map.toString();     // -> "three < four"
```
