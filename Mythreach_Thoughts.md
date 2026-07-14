# Thoughts on Mythreach

## Overall Impression

I think Mythreach has the potential to be a genuinely compelling indie game because it has a very clear identity:

> **Idle when you're away. An RPG when you're here.**

Rather than trying to compete directly with traditional RPGs or MMOs, it occupies a space between idle games and active RPG combat. The concept is easy to explain in one sentence: *"What if Melvor Idle had genuinely engaging MMO-style combat?"*

That clarity is one of its biggest strengths.

## What Makes It Different

The strongest design decision is not actually the combat—it is the decision that **the dashboard is the world**.

Instead of spending years building environments, animation systems, pathfinding, and cinematic presentation, the game embraces information-dense UI as its aesthetic. This keeps development focused on systems instead of content that is expensive to produce.

That decision naturally supports web, desktop, and eventually mobile.

## The Biggest Challenge

The combat prototype proves the *feel* of the game, but long-term retention will depend on enemy design rather than player abilities.

The interesting decisions should come from:

- enemy mechanics
- reacting to unpredictable situations
- choosing the right ability for the encounter
- adapting rather than repeating a solved rotation

The player shouldn't simply master a rotation—they should learn to master increasingly interesting encounters.

## Active vs Idle

One of the biggest balancing challenges will be making active play rewarding without making idle play feel worthless.

A healthier approach may be:

- Idle earns steady progression.
- Active play earns better efficiency and unique rewards.
- Rare loot, achievements, bosses, reputation, and special resources come from active participation rather than simply larger numbers.

## Engine Recommendation

The one architectural recommendation I feel strongly about is this:

**Keep the game engine completely pure.**

The engine should know nothing about:

- browsers
- Svelte
- rendering
- animations
- sounds
- networking

It should simply simulate the world.

Everything else should react to the simulation.

If every rule of the game can be executed from a command-line program without rendering anything, then the architecture is healthy.

This also makes automated testing, balancing, offline progression, and future multiplayer dramatically easier.

## Multiplayer Thoughts

I would **not** try to build a traditional MMO.

Instead, I think Mythreach could become something much more unique.

### Start Small

Multiplayer should evolve gradually:

- accounts
- leaderboards
- friends
- chat
- guilds
- player marketplace
- shared economy

These social systems dramatically increase player retention before real cooperative gameplay even exists.

### Shared World Bosses

One of my favorite ideas is asynchronous world bosses.

Instead of requiring dozens of players to log in simultaneously, imagine a guild boss with enormous health.

Every player contributes whenever they have time.

You log in.

Fight the boss.

Deal damage.

Log off.

The next player continues where you left off.

Eventually the guild defeats the boss together even though everyone played at different times.

This perfectly matches Mythreach's philosophy of respecting the player's schedule.

### Hiring Offline Characters

This is the multiplayer feature I find most exciting.

When a player logs off, their character doesn't disappear.

Instead, other players can recruit that hero into their dungeon party.

Your equipment, talents, and build determine how your AI-controlled hero performs.

When you return, you discover:

- your hero completed dungeon runs
- earned gold
- gained experience
- collected loot
- helped other players

Your character remains part of the world even while you're away.

That idea feels extremely consistent with the game's identity.

### Guild Progression

Guilds could also become persistent communities that build together.

Examples include:

- guild research
- guild mines
- guild farms
- guild castles
- guild-wide progression
- cooperative projects

Every player's idle progress contributes to something larger.

### Persistent World Events

Eventually the world itself could respond to player actions.

Imagine a weekly dragon attack.

Players choose how to contribute:

- fight
- craft supplies
- gather resources
- defend towns

The collective outcome changes the world for everyone.

The game becomes massively multiplayer without needing traditional MMO gameplay.

## Final Thoughts

I think Mythreach has the potential to become something that doesn't currently exist.

Not another MMO.

Not another idle game.

Instead, a persistent online systems game where optimization, progression, social interaction, and meaningful combat all reinforce each other.

If the game remains focused on its core identity—respecting the player's time while rewarding mastery—it has the potential to carve out a very distinctive niche.
