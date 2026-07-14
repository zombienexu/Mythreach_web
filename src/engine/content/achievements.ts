export interface AchievementDef {
  id: string
  name: string
  description: string
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-blood', name: 'First Blood', description: 'Slay your first creature.' },
  { id: 'kills-100', name: 'Centurion', description: 'Slay 100 creatures.' },
  { id: 'kills-500', name: 'Extinction Event', description: 'Slay 500 creatures.' },
  { id: 'level-5', name: 'Apprentice No More', description: 'Reach level 5.' },
  { id: 'level-10', name: 'Adept of the Observatory', description: 'Reach level 10.' },
  { id: 'level-15', name: 'Archmage', description: 'Reach the level cap.' },
  { id: 'boss-grubthar', name: 'Regicide, Basically', description: 'Defeat Grubthar, the Cave King.' },
  { id: 'boss-bramble-widow', name: 'Pest Control', description: 'Defeat the Bramble Widow.' },
  { id: 'boss-kraghorn', name: 'Stormbreaker', description: 'Defeat Kraghorn, Thane of Storms.' },
  { id: 'boss-ashmaw', name: 'Firefighter', description: 'Defeat Pyrelord Ashmaw.' },
  { id: 'boss-malgrath', name: 'Worldmender', description: 'Defeat Malgrath the Worldrender.' },
  { id: 'gold-1000', name: 'Dragon Hoard', description: 'Earn 1,000 gold over your career.' },
  { id: 'epic-find', name: 'It Glows Purple', description: 'Find an epic item.' },
  { id: 'interrupts-10', name: 'Silence!', description: 'Interrupt 10 enemy spells.' },
  { id: 'deaths-10', name: 'Frequent Flyer', description: 'Die 10 times. The observatory keeps a cot for you.' },
  { id: 'worldboss-felled', name: 'Riftbreaker', description: 'Fell the Rift Colossus.' },
  { id: 'expeditions-10', name: 'Wayfarer', description: 'Complete 10 expeditions.' },
]

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)
