<script lang="ts">
  /** First-world arrival: the anchor lands warm in the Kindle Yard — the Ember
   *  Legion's recruitment camp — and the caster-sergeant sizes up the new
   *  conscript. No magic yet: a wooden staff, and three trainees waiting in
   *  the sparring circle. Accepting drops the uplink into the camp. */
  import Background from '../components/Background.svelte'
  import Filigree from '../components/Filigree.svelte'
  import { PROVING_DUELS } from './camp'
  import { ARRIVAL, FACTION } from './content'

  let { name, onaccept }: { name: string; onaccept: () => void } = $props()
</script>

<Background hue={FACTION.hue} />

<div class="arrival">
  <header class="mast">
    <p class="place readout">{ARRIVAL.place}</p>
    <h1>{FACTION.name}</h1>
    <p class="sub">Anchor landed · {name}, recruit of the Kindle Yard</p>
  </header>

  <section class="sergeant glass">
    <Filigree inset={6} size={18} />
    <div class="s-head">
      <span class="mark" aria-hidden="true">✦</span>
      <div class="s-who">
        <h2>{ARRIVAL.instructor}</h2>
        <p class="s-role">Caster-sergeant · drill instructor of the Kindle Yard</p>
      </div>
    </div>
    <p class="greeting">{ARRIVAL.greeting}</p>

    <article class="order console-panel ticked">
      <header class="o-head">
        <span class="readout">first charge · {ARRIVAL.instructor}</span>
        <span class="o-count mono">Best {PROVING_DUELS} trainees</span>
      </header>
      <h3 class="o-title">The Proving</h3>
      <p class="o-text">
        Step into the sparring circle with a wooden staff and nothing else. Three bouts, one at a
        time. Win them, and the Legion will consider you worth teaching.
      </p>
    </article>
  </section>

  <footer class="foot">
    <p class="foot-note">The circle is waiting, {name}.</p>
    <button class="seal begin" onclick={onaccept}>Take up the staff &amp; enter the yard</button>
  </footer>
</div>

<style>
  .arrival {
    width: min(640px, 100%);
    margin-inline: auto;
    padding: 44px 26px 60px;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .mast {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: ch-in 0.8s var(--ease-out-expo) both;
  }
  .place {
    color: var(--ember-glow);
    opacity: 0.85;
  }
  .mast h1 {
    font-size: clamp(28px, 5vw, 42px);
    background: linear-gradient(100deg, oklch(0.8 0.13 55), oklch(0.9 0.09 80), oklch(0.78 0.13 45));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .sub {
    margin: 0;
    font-size: 12.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .sergeant {
    position: relative;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: ch-in 0.8s 0.15s var(--ease-out-expo) both;
  }
  .s-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1px solid oklch(0.75 0.16 55 / 0.5);
    color: var(--ember-glow);
    font-size: 20px;
    background: radial-gradient(circle, oklch(0.72 0.19 45 / 0.18), transparent 70%);
    box-shadow: 0 0 22px oklch(0.72 0.19 45 / 0.25);
  }
  .s-who h2 {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 560;
    color: var(--ember-glow);
  }
  .s-role {
    margin: 1px 0 0;
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
  }
  .greeting {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text);
  }

  .order {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .o-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .o-count {
    font-size: 11px;
    color: var(--ember-glow);
  }
  .o-title {
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--text);
  }
  .o-text {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.6;
    font-style: italic;
    color: var(--text-dim);
  }

  .foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: ch-in 0.8s 0.3s var(--ease-out-expo) both;
  }
  .foot-note {
    margin: 0;
    font-size: 13px;
    font-style: italic;
    color: var(--text-dim);
  }
  .begin {
    font-size: 14px;
    padding: 12px 30px;
  }

  @keyframes ch-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mast,
    .sergeant,
    .foot {
      animation: none;
    }
  }
</style>
