/** The subset of the Web Storage API the save layer needs — small enough to
 *  fake in a test. */
export interface Storagelike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Owns reading, writing, and *wiping* the save. Once wiped, it refuses further
 *  writes — so a `beforeunload`/`stop` save fired during a reset-and-reload can
 *  never resurrect the save the player just erased. */
export class SaveStore {
  private wiped = false

  constructor(
    private readonly storage: Storagelike,
    private readonly key: string,
  ) {}

  load(): string | null {
    return this.storage.getItem(this.key)
  }

  save(serialized: string): void {
    if (this.wiped) return
    this.storage.setItem(this.key, serialized)
  }

  wipe(): void {
    this.wiped = true
    this.storage.removeItem(this.key)
  }
}
