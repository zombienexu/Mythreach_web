/** Save slots, character profiles, and player settings — the title screen's
 *  ledger. All of it is UI-owned localStorage; the engine save itself is
 *  still written by SaveStore and never learns any of this exists.
 *
 *  Slot 1 keeps the original save key, so every character rolled before the
 *  title screen existed shows up on it, un-migrated and unharmed.
 */
import type { ClassId } from './content/identity'
import type { Storagelike } from './persistence'

export type SlotId = 1 | 2 | 3
export const SLOT_IDS: readonly SlotId[] = [1, 2, 3]

/** Who lives in a slot. Written at character creation; legacy saves have
 *  none and are presented as the default Arcanist. */
export interface SlotProfile {
  name: string
  classId: ClassId
  originId: string
  signId: string
  createdAt: number
  playedAt: number
}

/** What the title screen can say about a save without booting the sim. */
export interface SlotSummary {
  level: number
  gold: number
  regionId: string
}

export interface SlotView {
  id: SlotId
  /** Null when the slot is empty *or* the save predates profiles. */
  profile: SlotProfile | null
  /** Null when the slot is empty (an unreadable save counts as empty). */
  summary: SlotSummary | null
}

export function saveKeyFor(slot: SlotId): string {
  // Slot 1 is the pre-title-screen key — existing saves land here.
  return slot === 1 ? 'mythreach-save-v1' : `mythreach-save-s${slot}-v1`
}

export function profileKeyFor(slot: SlotId): string {
  return `mythreach-profile-s${slot}-v1`
}

export function expeditionKeyFor(slot: SlotId): string {
  // Slot 1 keeps the pre-roster key so the first expedition ever run — written
  // before slots were per-account — stays exactly where it was.
  return slot === 1 ? 'mythreach-expedition-v1' : `mythreach-expedition-s${slot}-v1`
}

function readSummary(storage: Storagelike, slot: SlotId): SlotSummary | null {
  try {
    const raw = storage.getItem(saveKeyFor(slot))
    if (!raw) return null
    const data = JSON.parse(raw) as { level?: number; gold?: number; regionId?: string }
    if (typeof data.level !== 'number') return null
    return {
      level: data.level,
      gold: typeof data.gold === 'number' ? data.gold : 0,
      regionId: typeof data.regionId === 'string' ? data.regionId : '',
    }
  } catch {
    // Unreadable save: the sim would start it fresh anyway, so the title
    // screen presents it as an unwritten page.
    return null
  }
}

export function readProfile(storage: Storagelike, slot: SlotId): SlotProfile | null {
  try {
    const raw = storage.getItem(profileKeyFor(slot))
    if (!raw) return null
    const p = JSON.parse(raw) as SlotProfile
    if (typeof p.name !== 'string' || typeof p.classId !== 'string') return null
    return p
  } catch {
    return null
  }
}

export function readSlot(storage: Storagelike, slot: SlotId): SlotView {
  return { id: slot, profile: readProfile(storage, slot), summary: readSummary(storage, slot) }
}

export function readSlots(storage: Storagelike): SlotView[] {
  return SLOT_IDS.map((id) => readSlot(storage, id))
}

export function writeProfile(storage: Storagelike, slot: SlotId, profile: SlotProfile): void {
  try {
    storage.setItem(profileKeyFor(slot), JSON.stringify(profile))
  } catch {
    // storage unavailable — the run continues, nameless in the ledger
  }
}

/** Stamp "last played" without disturbing the rest of the profile. */
export function touchProfile(storage: Storagelike, slot: SlotId): void {
  const p = readProfile(storage, slot)
  if (p) writeProfile(storage, slot, { ...p, playedAt: Date.now() })
}

/** Erase a slot outright: save and profile both. Title-screen use only —
 *  a *running* game must go through Game's wipe guard instead. */
export function eraseSlot(storage: Storagelike, slot: SlotId): void {
  storage.removeItem(saveKeyFor(slot))
  storage.removeItem(profileKeyFor(slot))
}

/* ---- Settings ----------------------------------------------------------- */

const SETTINGS_KEY = 'mythreach-settings-v1'

export interface GameSettings {
  muted: boolean
  /** Screen shake on hits. Off = the world holds still. */
  shake: boolean
  /** 'reduced' quiets ambient/decorative animation even when the OS doesn't ask. */
  motion: 'auto' | 'reduced'
}

export const DEFAULT_SETTINGS: GameSettings = { muted: false, shake: true, motion: 'auto' }

/** Reads settings, tolerating the legacy `{ muted }` shape and garbage alike. */
export function loadSettings(storage: Storagelike): GameSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const s = JSON.parse(raw) as Partial<GameSettings>
    return {
      muted: s.muted === true,
      shake: s.shake !== false,
      motion: s.motion === 'reduced' ? 'reduced' : 'auto',
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(storage: Storagelike, settings: GameSettings): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable — the toggles still hold for this session
  }
}

/** Reflect the motion preference onto the document, where CSS can see it. */
export function applyMotion(settings: GameSettings): void {
  document.documentElement.dataset.motion = settings.motion
}
