import { SvelteSet } from 'svelte/reactivity'
import {
  ABILITIES,
  ABILITY_IDS,
  ACHIEVEMENT_BY_ID,
  GameSim,
  abilityIdsFor,
  type AbilityId,
  type CombatEvent,
  type CombatSnapshot,
  type HeroIdentity,
  type Item,
  type ProgressSnapshot,
  type SaveData,
  type Side,
  type TalentId,
} from '../engine'
import { FxDirector, type FxHost } from './fx/director'
import type { Spot } from './fx/stage'
import { startLoop, type LoopHandle } from './loop'
import { SaveStore } from './persistence'
import {
  loadSettings,
  profileKeyFor,
  readProfile,
  saveKeyFor,
  saveSettings,
  touchProfile,
  type SlotId,
  type SlotProfile,
} from './profile'
import { Sfx, type SfxName } from './sfx'
import { currentDuel, type CampDuel } from './slice/camp'
import { FIRST_ORDER, SERGEANT, SLICE_IDENTITY } from './slice/content'
import { Expedition } from './slice/expedition.svelte'
import {
  activeQuestTargets,
  clusterOf,
  clusterSpec,
  rerollBoard,
  rollBoard,
  selectOffer as boardSelect,
  type FieldState,
} from './slice/field'

/** The slice's destinations on the uplink console. */
export type View = 'arena' | 'map' | 'talents' | 'dossier' | 'codex'

export interface FloatText {
  id: number
  side: Side
  kind: 'damage' | 'crit' | 'heal' | 'absorb'
  amount: number
  /** position in arena-stage px — where the spell actually landed */
  x: number
  y: number
  /** CSS colour of the spell that caused it */
  tone: string
  /** how big to draw it: derived from the damage as a share of the target's
   *  max HP, so the number *is* the readout. A chip is small, a crit is huge. */
  scale: number
  /** spawn time — only *fresh* floats claim a stacking lane */
  born: number
}

/** A card taking a blow. `power` and `crit` decide how hard it recoils. */
export interface Impact {
  n: number
  power: number
  crit: boolean
}

const FLOAT_LIFETIME_MS = 950
/** how far apart stacked damage numbers sit, and how close counts as a clash */
const LANE_HEIGHT = 34
const LANE_WIDTH = 68
/** A float older than this has visibly risen and faded — it no longer claims
 *  a lane. Without the cutoff, a pack of three attackers stacks new numbers
 *  four lanes up into the middle of the screen, orphaned from their card. */
const LANE_FRESH_MS = 450
const SAVE_EVERY_MS = 5000

/** One slot per ability, seeded with `v`. */
function byAbility<T>(v: T): Record<AbilityId, T> {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, v])) as Record<AbilityId, T>
}

function boot(store: SaveStore, identity: HeroIdentity | undefined): GameSim {
  const opts = identity ? { rng: Math.random, identity } : { rng: Math.random }
  try {
    const raw = store.load()
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      return GameSim.deserialize(data, opts)
    }
  } catch {
    // corrupted or incompatible save — start fresh
  }
  return new GameSim(opts)
}

/** Reactive bridge between the pure sim and the Svelte UI.
 *  Sim events are drained exactly once, inside step(); everything the UI
 *  shows is either a snapshot or an effect spawned from those events.
 *
 *  Game is also the FxDirector's host: the director decides *when* a number,
 *  a card recoil or a sound happens (a fireball's lands when the bolt does),
 *  and calls back in here to actually make it happen. */
export class Game implements FxHost {
  /** Which save slot this run lives in — decides the storage keys. */
  readonly slot: SlotId
  /** Identity written at character creation; null for saves that predate it. */
  readonly profile: SlotProfile | null
  readonly sim: GameSim
  /** The slice meta layer: Standing → Grace (teaching) → Codex → Recovery. */
  readonly expedition: Expedition

  combat: CombatSnapshot
  progress: ProgressSnapshot
  /** Both derived from ABILITY_IDS, never hand-listed — adding an ability must
   *  not require remembering to add a slot here. */
  usable: Record<AbilityId, boolean> = $state(byAbility(false))
  /** bump counters: a press the sim refused, per ability */
  denied: Record<AbilityId, number> = $state(byAbility(0))
  view: View = $state('arena')
  /** The field board for the current front: the 3–4 sightings the player sizes
   *  up and chooses between, re-rolled on each clear. Replaced wholesale like
   *  the combat/progress snapshots. */
  field: FieldState = $state.raw({ regionId: '', offers: [], selectedId: null, nextId: 1, rerolls: 0 })
  floats: FloatText[] = $state([])
  /** bump counters driving hit-recoil / heal-bloom choreography */
  impacts: Record<Side, Impact> = $state({
    player: { n: 0, power: 1, crit: false },
    enemy: { n: 0, power: 1, crit: false },
  })
  /** per-enemy-card recoil counters, keyed by iid — a pack recoils per card */
  enemyImpacts: Record<number, Impact> = $state({})
  bloom = $state(0)
  /** a crit landed: bump counter + how hard, for the screen-wide flash */
  critFlash: { n: number; power: number; side: Side } = $state({ n: 0, power: 1, side: 'enemy' })
  pressed = new SvelteSet<string>()
  banner: { level: number; unlocked: AbilityId[] } | null = $state(null)
  toast: { id: number; title: string; body: string } | null = $state(null)
  /** the boss's name, while the challenge cinematic is on screen */
  bossIntro: string | null = $state(null)
  muted: boolean

  readonly fx = new FxDirector()

  /** Owns read/write/wipe of this slot's save; the wipe guard lives here. */
  private readonly store: SaveStore
  private readonly audio = new Sfx()
  private nextId = 1
  private loop: LoopHandle | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private bannerTimer: ReturnType<typeof setTimeout> | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private progressDirty = false
  /** The rarity of the sighting currently being fought — so a clean clear can
   *  pay its bonus and rotate the board. */
  private engagedRarity: string | null = null
  /** True while a Kindle Yard sparring duel is on the field — its clear
   *  advances the camp script rather than rotating the board. */
  private campDuelActive = false

  /** The active class's action bar, in kit order — hotkeys 1..n map onto it. */
  readonly kitIds: readonly AbilityId[]
  private readonly keyToAbility: ReadonlyMap<string, AbilityId>

  constructor(slot: SlotId = 1) {
    this.slot = slot
    this.store = new SaveStore(localStorage, saveKeyFor(slot))
    this.profile = readProfile(localStorage, slot)
    // The profile carries the identity for saves that predate v5; a v5 save's
    // own sealed-in identity wins inside deserialize.
    // The slice is one system, one life: a War-Weaver of the Ember Legion.
    // (A v5 save's own sealed identity still wins inside deserialize.)
    const identity: HeroIdentity = this.profile
      ? { classId: this.profile.classId, originId: this.profile.originId, signId: this.profile.signId }
      : { ...SLICE_IDENTITY }
    this.sim = boot(this.store, identity)
    // The world only lets you cast what it has taught you: Standing decides the
    // gate, and we arm the sim with it before the first canUse is ever asked.
    this.expedition = new Expedition(localStorage, slot)
    this.expedition.applyTo(this.sim)
    // Snapshots are immutable and replaced wholesale every publish — raw state
    // keeps the reassignment reactive without deep-proxying the whole tree
    // twenty times a second.
    this.combat = $state.raw(this.sim.combatSnapshot())
    this.progress = $state.raw(this.sim.progressSnapshot())
    this.kitIds = abilityIdsFor(this.progress.classId)
    this.keyToAbility = new Map(this.kitIds.map((id) => [ABILITIES[id].key, id]))
    this.muted = $state(loadSettings(localStorage).muted)
    // Roll the field board on the front the sim starts us on.
    this.field = rollBoard(
      this.progress.regionId,
      Math.random,
      this.progress.level,
      activeQuestTargets(this.progress.quests),
    )
  }

  start(): void {
    this.audio.muted = this.muted
    this.fx.bind(this)
    touchProfile(localStorage, this.slot)

    this.loop = startLoop(
      () => this.step(),
      (ran) => {
        if (ran > 0) this.publish()
      },
    )
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('pointerdown', this.unlockAudio)
    window.addEventListener('keydown', this.unlockAudio)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('beforeunload', this.saveNow)
    this.saveTimer = setInterval(this.saveNow, SAVE_EVERY_MS)
  }

  stop(): void {
    this.loop?.stop()
    if (this.saveTimer) clearInterval(this.saveTimer)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('pointerdown', this.unlockAudio)
    window.removeEventListener('keydown', this.unlockAudio)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('beforeunload', this.saveNow)
    this.fx.destroy()
    this.audio.dispose()
    this.saveNow()
  }

  // ─────────────── FxHost — the director calls back in here ───────────────

  float(f: { side: Side; kind: FloatText['kind']; amount: number; tone: string; scale: number; at: Spot }): void {
    const id = this.nextId++
    // Lifted clear of the portrait it belongs to, with a little scatter so a
    // flurry of ticks reads as several numbers rather than one blur.
    const x = f.at.x + (Math.random() * 44 - 22)
    let y = f.at.y - 34 + (Math.random() * 18 - 9)

    // A DoT tick and a Pyroblast landing on the same frame would otherwise
    // overlap into an unreadable smear ("122" over "11" reads as "1122").
    // Stack them into lanes instead, newest highest — the way every game
    // client does it.
    const now = Date.now()
    for (let guard = 0; guard < 6; guard++) {
      const clash = this.floats.some(
        (o) =>
          now - o.born < LANE_FRESH_MS &&
          o.side === f.side &&
          Math.abs(o.y - y) < LANE_HEIGHT &&
          Math.abs(o.x - x) < LANE_WIDTH,
      )
      if (!clash) break
      y -= LANE_HEIGHT
    }

    this.floats.push({ id, side: f.side, kind: f.kind, amount: f.amount, tone: f.tone, scale: f.scale, x, y, born: now })
    setTimeout(() => {
      const i = this.floats.findIndex((f2) => f2.id === id)
      if (i !== -1) this.floats.splice(i, 1)
    }, FLOAT_LIFETIME_MS)
  }

  bump(side: Side, power: number, crit: boolean, iid?: number): void {
    if (side === 'enemy' && iid !== undefined) {
      const cur = this.enemyImpacts[iid] ?? { n: 0, power: 1, crit: false }
      this.enemyImpacts[iid] = { n: cur.n + 1, power, crit }
    } else {
      const cur = this.impacts[side]
      this.impacts[side] = { n: cur.n + 1, power, crit }
    }
    // A crit is felt past the card it landed on — the room flashes.
    if (crit) this.critFlash = { n: this.critFlash.n + 1, power, side }
  }

  sfx(name: SfxName, gain = 1): void {
    this.audio.play(name, gain)
  }

  // ─────────────── player intents ───────────────

  use(id: AbilityId): void {
    if (this.sim.useAbility(id)) {
      this.publish()
    } else {
      // The sim said no — out of mana, on cooldown, nothing to hit. The button
      // should refuse visibly rather than swallow the press in silence.
      this.denied[id]++
      this.audio.play('denied')
    }
  }

  /** Begin the next fight (a bare random roll — kept for callers that don't go
   *  through the field board). */
  startFight(): void {
    if (this.sim.startFight()) this.publish()
  }

  // ─────────────── the Kindle Yard: the camp's sparring circle ──────────────

  /** The duel the circle offers next, or null once graduated. */
  get campDuel(): CampDuel | null {
    return currentDuel(this.expedition.camp)
  }

  /** Step into the circle: spawn the current sparring duel. Duels spawn
   *  already engaged — both of you squared up, no dormant grace. */
  engageCampDuel(): void {
    if (this.combat.phase !== 'idle' || !this.combat.player.alive) return
    const duel = this.campDuel
    if (!duel) return
    this.campDuelActive = true
    if (this.sim.startFight({ enemyIds: [duel.opponentId], sparring: true, engaged: true })) {
      this.audio.play('target')
      this.publish()
    } else {
      this.campDuelActive = false
    }
  }

  /** A camp duel was won: advance the script, pay boundary bonuses (the
   *  proving's crossing is what teaches Fireball), and at graduation hand the
   *  conscript the boar order and open the world. */
  private onCampDuelCleared(): void {
    this.campDuelActive = false
    const taught = this.expedition.advanceCamp()
    if (taught) {
      this.expedition.applyTo(this.sim)
      this.audio.play('level')
    }
    if (!this.expedition.inCamp) {
      // Graduation: the first true order, in the oldest tradition there is.
      if (this.sim.acceptQuest(FIRST_ORDER)) this.progressDirty = true
      this.audio.play('epic')
    }
  }

  // ─────────────── the field board: size up sightings, pick your fight ──────

  /** Mark a sighting to engage. */
  selectOffer(id: number): void {
    this.field = boardSelect(this.field, id)
    this.audio.play('target', 0.6)
  }

  /** Engage the marked sighting (Enter / the Engage control / a click). */
  engageSelectedOffer(): void {
    if (this.field.selectedId !== null) this.engageOffer(this.field.selectedId)
  }

  /** Tab: slide the mark to the next sighting scattered across the field. */
  cycleOffer(): void {
    const offers = this.field.offers
    if (offers.length < 2) return
    const i = offers.findIndex((o) => o.id === this.field.selectedId)
    const next = offers[(i + 1) % offers.length]!
    this.selectOffer(next.id)
  }

  /** Space in a lull: walk on. The field turns over and a fresh screen of
   *  sightings is scattered across it — nothing on this one tempted you. */
  nextScreen(): void {
    if (this.combat.phase !== 'idle' || this.expedition.inCamp) return
    this.field = rerollBoard(
      this.field,
      Math.random,
      this.progress.level,
      activeQuestTargets(this.progress.quests),
    )
    this.engagedRarity = null
    this.audio.play('target', 0.5)
  }

  /** Commit to a sighting: spawn it *and everything standing too close to it* —
   *  pull one group inside the aggro radius and its neighbours come too. The
   *  engaged group's rarity is remembered so a clean clear pays its bonus and
   *  turns the field over. */
  engageOffer(id: number): void {
    if (this.combat.phase !== 'idle' || !this.combat.player.alive) return
    const o = this.field.offers.find((x) => x.id === id)
    if (!o) return
    const cluster = clusterOf(this.field, id)
    if (this.sim.startFight(clusterSpec(this.field, id))) {
      this.engagedRarity = o.rarity
      this.field = boardSelect(this.field, o.id)
      if (cluster.length > 1) {
        this.audio.play('boss')
        this.showToast(
          'The whole clearing turns',
          `${cluster.length} groups stood inside each other's watch — every one of them is on you now.`,
        )
      } else if (o.rarity === 'apex') {
        this.audio.play('boss')
        this.showToast('Apex sighting', `${o.title} stands the field — a rare quarry.`)
      } else if (o.rarity === 'rare') {
        this.audio.play('epic', 0.6)
      } else {
        this.audio.play('target')
      }
      this.publish()
    }
  }

  /** Space / the heart of the wheel: whatever the moment calls for — the
   *  circle in camp, walking on to the next screen of sightings in the field,
   *  the sweep on a loot screen, and mid-fight the universal Focus: the timing
   *  read on any swing about to land, yours or theirs. */
  hubAction(): void {
    if (this.combat.phase === 'looting') {
      this.lootAll()
      return
    }
    if (this.combat.enemies.length === 0 && this.combat.player.alive) {
      // A lull: in camp, Space steps into the sparring circle. In the field it
      // walks on — nothing here is worth the fight, so turn the screen over.
      if (this.expedition.inCamp) this.engageCampDuel()
      else this.nextScreen()
      return
    }
    if (!this.combat.player.alive) return
    this.focus()
  }

  /** Q — swing the staff. The basic attack is yours to time now: nothing
   *  swings on its own, and the blow that lands is the one you called for. */
  strike(): void {
    if (this.sim.strike()) {
      this.audio.play('target', 0.45)
      this.publish()
    } else if (!this.combat.player.strike?.swinging) {
      // A press during your own wind-up is just eagerness — stay quiet. Any
      // other refusal (nothing to hit, mid-cast, dead) is worth saying out loud.
      this.audio.play('denied')
    }
  }

  /** Learn a working the Legion has offered — done at leisure on the Talents
   *  screen, never in the middle of a fight. Re-arms the sim's teaching gate. */
  learn(id: AbilityId): void {
    if (!this.expedition.learn(id)) return
    this.expedition.applyTo(this.sim)
    this.progressDirty = true
    this.audio.play('level')
    this.showToast(
      ABILITIES[id]?.name ?? 'A new working',
      'Learned. It takes its place on your bar — the Weave answers to it now.',
    )
    this.publish()
  }

  /** Collect one corpse's spoils. */
  loot(iid: number): void {
    if (this.sim.collectLoot(iid)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  /** R: sweep the whole loot screen at once. */
  lootAll(): void {
    if (this.sim.collectAllLoot()) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  /** Click a card: point your spells at that mob. */
  target(iid: number): void {
    if (this.sim.setTarget(iid)) {
      this.audio.play('target')
      this.publish()
    }
  }

  /** Tab: slide the reticle to the next living mob. */
  cycleTarget(): void {
    if (this.sim.cycleTarget()) {
      this.audio.play('target')
      this.publish()
    }
  }

  setView(view: View): void {
    // The Map stays shut until the Kindle Yard graduates you.
    if (view === 'map' && this.expedition.inCamp) return
    this.view = view
  }

  /** The War-Weaving the hero has actually *learned* — what the action wheel
   *  shows and what the sim will let you cast. Reactive: reads the expedition. */
  get taught(): AbilityId[] {
    return this.expedition.taughtIds()
  }

  /** Workings the Legion has offered but the hero hasn't sat down and learned
   *  yet — the badge on the Talents rail. */
  get pendingLearns(): AbilityId[] {
    return this.expedition.pendingLearns
  }

  /** Is a ceremony holding the screen — the Heat lecture, a teaching, the
   *  graduation orders, the Recovery? While one is up the world underneath it
   *  must not take input: nobody should start a duel through a speech. */
  get ceremonyUp(): boolean {
    const ex = this.expedition
    return ex.justLecture || (ex.justTaught?.length ?? 0) > 0 || ex.justGraduated || ex.justRecovered
  }

  /** Acknowledge whatever is on screen, top-most first — the same order the
   *  shell stacks them in, so Space walks through the camp's big moments. */
  dismissCeremony(): void {
    const ex = this.expedition
    if (ex.justLecture) ex.clearLecture()
    else if ((ex.justTaught?.length ?? 0) > 0) ex.clearTeaching()
    else if (ex.justGraduated) ex.clearGraduated()
    else if (ex.justRecovered) ex.clearRecovered()
  }

  /** The wheel's "do it now" highlight: Detonate glows once the targeted foe's
   *  Smolder has matured to Volatile — the moment the payoff is biggest. */
  get heatEmpowered(): AbilityId | null {
    if (this.progress.classId !== 'arcanist') return null
    if (!this.taught.includes('detonate')) return null
    const t = this.combat.enemies.find((e) => e.iid === this.combat.target)
    return t?.smolder?.band === 'volatile' ? 'detonate' : null
  }

  /** Focus (the universal read-the-foe action, on the heart of the wheel /
   *  Space). Deflect a tell into an Opening — or eat a short lockout on a miss. */
  focus(): void {
    if (this.sim.focus()) {
      this.publish()
    } else {
      this.audio.play('denied')
    }
  }

  /** Transmit a completed Codex chapter home. */
  transmit(id: string): void {
    if (this.expedition.transmit(id)) {
      this.audio.play('epic')
      this.progressDirty = true
    }
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.audio.muted = this.muted
    saveSettings(localStorage, { ...loadSettings(localStorage), muted: this.muted })
  }

  enterRegion(regionId: string): void {
    if (this.sim.enterRegion(regionId)) {
      this.view = 'arena'
      this.publishAll()
      // A new front is a new set of sightings — roll a fresh board.
      this.field = rollBoard(
        this.progress.regionId,
        Math.random,
        this.progress.level,
        activeQuestTargets(this.progress.quests),
      )
      this.engagedRarity = null
    }
  }

  retreat(): void {
    if (this.sim.retreat()) {
      this.publishAll()
    }
  }

  assault(): void {
    if (this.sim.assaultWorldBoss()) {
      this.audio.play('boss')
      this.bossIntro = 'The Rift Colossus'
      this.view = 'arena'
      this.publishAll()
    }
  }

  hire(): void {
    if (this.sim.hireCompanion()) this.publishAll()
  }

  dismissBossIntro(): void {
    this.bossIntro = null
  }

  equip(item: Item): void {
    if (this.sim.equipItem(item.uid)) {
      this.audio.play('target')
      this.publishAll()
    }
  }

  sell(item: Item): void {
    if (this.sim.sellItem(item.uid)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  sellMaterial(id: string): void {
    if (this.sim.sellMaterial(id)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  spendTalent(id: TalentId): void {
    if (this.sim.spendTalent(id)) this.publishAll()
  }

  acceptQuest(id: string): void {
    if (this.sim.acceptQuest(id)) this.publishAll()
  }

  abandonQuest(id: string): void {
    if (this.sim.abandonQuest(id)) this.publishAll()
  }

  turnInQuest(id: string): void {
    if (this.sim.turnInQuest(id)) {
      this.audio.play('level')
      this.publishAll()
    }
  }

  respec(): void {
    if (this.sim.respec()) this.publishAll()
  }

  /** Wipe the save and reload back to the title screen. Detaches the save
   *  timer and unload handler first so nothing re-writes the erased save. */
  private wipeAndReload(): void {
    if (this.saveTimer) clearInterval(this.saveTimer)
    window.removeEventListener('beforeunload', this.saveNow)
    this.store.wipe()
    localStorage.removeItem(profileKeyFor(this.slot))
    Expedition.wipe(localStorage, this.slot)
    location.reload()
  }

  /** Write the save right now — called before handing control back to the
   *  title screen, which reads slots the moment it mounts. */
  flush(): void {
    this.saveNow()
  }

  newCharacter(): void {
    this.wipeAndReload()
  }

  deleteSave(): void {
    this.wipeAndReload()
  }

  // ─────────────── internals ───────────────

  private step(): void {
    const events = this.sim.tick()
    if (events.length === 0) return
    if (events.some((e) => e.kind === 'enemyDied')) this.audio.play('kill')
    for (const event of events) {
      this.onEvent(event)
      this.fx.handle(event)
    }
  }

  private publish(): void {
    this.combat = this.sim.combatSnapshot()
    if (this.combat.enemies.length > 0) {
      // A fresh pack retires the recoil counters of the one before it.
      for (const key of Object.keys(this.enemyImpacts)) {
        if (!this.combat.enemies.some((e) => e.iid === Number(key))) delete this.enemyImpacts[Number(key)]
      }
    }
    // Only the kit's abilities can ever be usable — the rest of the record
    // stays at its seeded false, which is exactly what canUse would say.
    for (const id of this.kitIds) this.usable[id] = this.sim.canUse(id)
    if (this.progressDirty) {
      this.progressDirty = false
      this.progress = this.sim.progressSnapshot()
    }

    // Standing effects follow the snapshot — a burn that expires quietly still
    // has to stop burning, and no event says so.
    this.fx.sync(this.combat)
    const p = this.combat.player
    this.audio.drone(this.combat.enemies.some((e) => e.rank === 'boss' && e.alive))
    this.audio.heartbeat(p.alive && p.maxHp > 0 && p.hp / p.maxHp < 0.35)
  }

  private publishAll(): void {
    this.progressDirty = true
    this.publish()
  }

  private onEvent(event: CombatEvent): void {
    // The slice meta reacts to combat first: Standing and the Codex fold in
    // every event. Crossing a Grace tier *offers* new War-Weaving — only the
    // First Weaving is pressed into your hands on the spot; the rest wait on
    // the Talents screen so nobody has to learn a spell mid-swing.
    const learned = this.expedition.observe(event)
    if (learned) {
      this.expedition.applyTo(this.sim)
      this.progressDirty = true
      this.audio.play('level')
    }
    const offered = this.expedition.justOffered
    if (offered && offered.length > 0) {
      this.expedition.clearOffered()
      this.showToast(
        'The Legion will teach you more',
        `${offered.map((id) => ABILITIES[id]?.name ?? id).join(' · ')} — waiting on the Talents screen, whenever you have the quiet for it.`,
      )
      this.audio.play('epic', 0.5)
    }
    // The floats, recoils, shakes and spell sounds are all the FxDirector's job
    // (fx.handle, called alongside this). Here we only keep reactive UI state:
    // banners, toasts, the heal bloom, and marking progression dirty.
    switch (event.kind) {
      case 'heal':
        this.bloom++
        break
      case 'enemyEnraged':
        this.bump('enemy', 1.6, false, event.iid)
        break
      case 'playerDied':
        // A lost sparring bout doesn't advance the script — the circle waits.
        this.campDuelActive = false
        this.progressDirty = true
        break
      case 'enemyDied':
      case 'xpGained':
      case 'goldGained':
      case 'companionHired':
        this.progressDirty = true
        break
      case 'materialDropped':
        this.progressDirty = true
        this.audio.play('loot')
        break
      case 'encounterCleared': {
        this.progressDirty = true
        // A won sparring duel advances the camp script instead of the board.
        if (this.campDuelActive) {
          this.onCampDuelCleared()
          break
        }
        // A rarer sighting pays a Standing bonus on a clean clear.
        if (this.engagedRarity) {
          const taught = this.expedition.awardClear(this.engagedRarity)
          if (taught) {
            this.expedition.applyTo(this.sim)
            this.audio.play('level')
          }
          if (this.engagedRarity === 'apex')
            this.showToast('Apex felled', 'A rare quarry down — the Legion logs it, bonus standing banked.')
          else if (this.engagedRarity === 'rare')
            this.showToast('Champion felled', 'Bonus standing banked.')
        }
        // The field rotates: a fresh roll of sightings for the next fight.
        this.field = rerollBoard(
          this.field,
          Math.random,
          this.progress.level,
          activeQuestTargets(this.progress.quests),
        )
        this.engagedRarity = null
        break
      }
      case 'regionEntered':
        this.progressDirty = true
        break
      case 'lootDropped':
        this.progressDirty = true
        this.audio.play(event.item.rarity === 'epic' ? 'epic' : 'loot')
        break
      case 'levelUp':
        this.progressDirty = true
        this.showBanner(event.level, event.unlocked)
        this.audio.play('level')
        break
      case 'worldBossAssaultEnded':
        this.progressDirty = true
        break
      case 'worldBossFelled':
        this.progressDirty = true
        this.audio.play('level')
        break
      case 'questAccepted':
        this.progressDirty = true
        break
      case 'questCompleted':
        this.progressDirty = true
        this.showToast(event.name, 'Orders fulfilled — report to the Dossier to be paid.')
        this.audio.play('loot')
        break
      case 'questTurnedIn':
        this.progressDirty = true
        this.showToast(event.name, `${SERGEANT} logs it, and pays out standing and coin.`)
        break
      case 'achievementUnlocked': {
        this.progressDirty = true
        const def = ACHIEVEMENT_BY_ID[event.id]
        this.showToast(event.name, def?.description ?? '')
        this.audio.play('loot')
        break
      }
      case 'cardPlayed':
        // The Fifty-Third gets a proclamation; ordinary cards speak through
        // their own effects (the numbers, the gold, the shield).
        if (event.card === 'fiftyThird') {
          this.showToast(event.label, 'The fifty-third card is played.')
          this.audio.play('epic')
        }
        if (event.card === 'coins' || event.label === 'The Mint') this.progressDirty = true
        break
      case 'signIntervened':
        this.showToast('The Tower holds', 'A killing blow leaves you at 1 HP. Once per fight.')
        this.audio.play('barrier')
        break
      case 'heatChanged':
        // Climbing into Empowered or Overheat is a felt milestone.
        if (event.crossedUp) {
          this.audio.play('crit', 0.5)
          this.bloom++
        }
        break
      case 'openingCreated':
        // A read landing (or a manufactured Opening) is a beat worth feeling.
        if (event.viaFocus) this.bloom++
        break
      case 'focusUsed':
        // The read deflects (a shield-ring of a sound); the Sharpen whets the
        // landing blow; a whiff is refused out loud.
        this.audio.play(
          event.mode === 'read' ? 'barrier' : event.mode === 'sharpen' ? 'target' : 'denied',
          event.mode === 'whiff' ? 1 : 0.7,
        )
        break
      case 'strikeLanded':
        if (event.sharpened) this.bloom++
        break
      case 'smolderDetonated':
        this.audio.play(event.band === 'volatile' ? 'crit' : 'hit', 0.7)
        break
    }
  }

  private showBanner(level: number, unlocked: AbilityId[]): void {
    this.banner = { level, unlocked }
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
    this.bannerTimer = setTimeout(() => (this.banner = null), 3600)
  }

  private showToast(title: string, body: string): void {
    this.toast = { id: this.nextId++, title, body }
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => (this.toast = null), 4200)
  }

  private saveNow = (): void => {
    try {
      this.store.save(JSON.stringify(this.sim.serialize()))
    } catch {
      // storage full or unavailable — the run continues unsaved
    }
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.saveNow()
  }

  private unlockAudio = (): void => {
    this.audio.unlock()
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    // A ceremony owns the screen while it is up: Space or Enter acknowledges
    // it, and nothing else reaches the world behind it.
    if (this.ceremonyUp) {
      e.preventDefault()
      if (e.key === ' ' || e.key === 'Enter') this.dismissCeremony()
      return
    }
    // Tab is target-switching, the way every MMO hand learned it — and out in
    // the field, where the quarry hasn't been picked yet, it walks the mark
    // across the sightings scattered over the ground.
    if (e.key === 'Tab') {
      e.preventDefault()
      if (this.combat.enemies.length === 0 && !this.expedition.inCamp) this.cycleOffer()
      else this.cycleTarget()
      return
    }
    // Q is the staff: the basic attack, swung on your call and no one else's.
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault()
      this.pressed.add('q')
      this.strike()
      return
    }
    // R sweeps the loot screen, the way every loot-window hand learned it.
    if (e.key === 'r') {
      this.lootAll()
      return
    }
    // Space presses the heart of the wheel: walk on to the next screen of
    // sightings while exploring, or the read (Focus) mid-fight.
    if (e.key === ' ') {
      e.preventDefault()
      this.hubAction()
      return
    }
    // Enter commits to the marked sighting — and to everything standing too
    // close to it.
    if (e.key === 'Enter') {
      e.preventDefault()
      this.engageSelectedOffer()
      return
    }
    const id = this.keyToAbility.get(e.key)
    if (!id) return
    this.pressed.add(e.key)
    this.use(id)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key === 'Q' ? 'q' : e.key)
  }
}
