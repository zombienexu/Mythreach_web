import { describe, expect, it } from 'vitest'
import type { Storagelike } from '../src/ui/persistence'
import {
  DEFAULT_SETTINGS,
  eraseSlot,
  expeditionKeyFor,
  loadSettings,
  profileKeyFor,
  readProfile,
  readSlots,
  saveKeyFor,
  saveSettings,
  touchProfile,
  writeProfile,
  type SlotProfile,
} from '../src/ui/profile'

function fakeStorage(): Storagelike {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

const PROFILE: SlotProfile = {
  name: 'Vespermere',
  classId: 'arcanist',
  originId: 'guild-courier',
  signId: 'moth',
  createdAt: 1000,
  playedAt: 2000,
}

describe('save slots', () => {
  it('slot 1 keeps the legacy save key, so old saves surface untouched', () => {
    expect(saveKeyFor(1)).toBe('mythreach-save-v1')
    expect(saveKeyFor(2)).not.toBe(saveKeyFor(1))
    expect(saveKeyFor(2)).not.toBe(saveKeyFor(3))
  })

  it('an empty storage reads as three unwritten pages', () => {
    const slots = readSlots(fakeStorage())
    expect(slots.map((s) => s.id)).toEqual([1, 2, 3])
    for (const s of slots) {
      expect(s.profile).toBeNull()
      expect(s.summary).toBeNull()
    }
  })

  it('a legacy save with no profile is occupied but nameless', () => {
    const storage = fakeStorage()
    storage.setItem(saveKeyFor(1), JSON.stringify({ version: 4, level: 9, gold: 321, regionId: 'mirefen' }))
    const slots = readSlots(storage)
    expect(slots[0]!.summary).toEqual({ level: 9, gold: 321, regionId: 'mirefen' })
    expect(slots[0]!.profile).toBeNull()
    expect(slots[1]!.summary).toBeNull()
  })

  it('an unreadable save reads as empty — the sim would restart it anyway', () => {
    const storage = fakeStorage()
    storage.setItem(saveKeyFor(2), '{not json')
    storage.setItem(saveKeyFor(3), JSON.stringify({ gold: 5 })) // no level
    const slots = readSlots(storage)
    expect(slots[1]!.summary).toBeNull()
    expect(slots[2]!.summary).toBeNull()
  })

  it('profiles round-trip per slot', () => {
    const storage = fakeStorage()
    writeProfile(storage, 2, PROFILE)
    expect(readProfile(storage, 2)).toEqual(PROFILE)
    expect(readProfile(storage, 1)).toBeNull()
  })

  it('touchProfile bumps playedAt and disturbs nothing else', () => {
    const storage = fakeStorage()
    writeProfile(storage, 1, PROFILE)
    touchProfile(storage, 1)
    const after = readProfile(storage, 1)!
    expect(after.playedAt).toBeGreaterThan(PROFILE.playedAt)
    expect({ ...after, playedAt: PROFILE.playedAt }).toEqual(PROFILE)
  })

  it('touchProfile on an empty slot writes nothing', () => {
    const storage = fakeStorage()
    touchProfile(storage, 3)
    expect(storage.getItem(profileKeyFor(3))).toBeNull()
  })

  it('eraseSlot takes the save, the profile, and the expedition together', () => {
    const storage = fakeStorage()
    storage.setItem(saveKeyFor(2), JSON.stringify({ level: 3 }))
    writeProfile(storage, 2, PROFILE)
    // The slice's expedition shares the slot — a stale one left behind would
    // let a new conscript inherit "already briefed" meta and skip the camp.
    storage.setItem(expeditionKeyFor(2), JSON.stringify({ standing: 500, briefed: true }))
    eraseSlot(storage, 2)
    expect(storage.getItem(saveKeyFor(2))).toBeNull()
    expect(readProfile(storage, 2)).toBeNull()
    expect(storage.getItem(expeditionKeyFor(2))).toBeNull()
  })
})

describe('settings', () => {
  it('defaults: sound on, shake on, motion auto', () => {
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS)
  })

  it('tolerates the legacy { muted } shape', () => {
    const storage = fakeStorage()
    storage.setItem('mythreach-settings-v1', JSON.stringify({ muted: true }))
    expect(loadSettings(storage)).toEqual({ muted: true, shake: true, motion: 'auto' })
  })

  it('round-trips the full shape', () => {
    const storage = fakeStorage()
    saveSettings(storage, { muted: true, shake: false, motion: 'reduced' })
    expect(loadSettings(storage)).toEqual({ muted: true, shake: false, motion: 'reduced' })
  })

  it('garbage reads as defaults', () => {
    const storage = fakeStorage()
    storage.setItem('mythreach-settings-v1', 'nope{')
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })
})
