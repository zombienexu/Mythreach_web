import { describe, expect, it } from 'vitest'
import { SaveStore, type Storagelike } from '../src/ui/persistence'

/** A minimal in-memory Storagelike backed by a Map. */
function fakeStorage(): Storagelike {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('SaveStore', () => {
  it('writes through to storage', () => {
    const store = new SaveStore(fakeStorage(), 'k')
    store.save('x')
    expect(store.load()).toBe('x')
  })

  it('wipe removes the save', () => {
    const store = new SaveStore(fakeStorage(), 'k')
    store.save('x')
    store.wipe()
    expect(store.load()).toBeNull()
  })

  it('a wiped store refuses further saves', () => {
    // This is the exact regression the reset bug was: a save fired on
    // reload/unload must not resurrect the save the player just wiped.
    const store = new SaveStore(fakeStorage(), 'k')
    store.save('x')
    store.wipe()
    store.save('y')
    expect(store.load()).toBeNull()
  })
})
