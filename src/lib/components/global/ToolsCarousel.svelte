<script lang="ts">
  import ToolCard from './ToolCard.svelte';
  import type { NavItem } from '$lib/constants/nav';

  /** Optional NavGroup type if used in your SUB_NAV */
  type NavGroup = { title?: string; items: NavItem[] };

  /**
   * Input data: usually SUB_NAV (Record<categoryPath, (NavItem|NavGroup)[]>)
   * Sensible default is an empty object; component renders nothing gracefully.
   */
  export let sections: Record<string, (NavItem | NavGroup)[]> = {};

  /** Base seconds per loop for ~8 items (scaled by item count) */
  export let speedBase: number = 40;

  /** Gap between cards and rows (CSS length) */
  export let gap: string = 'var(--spacing-md)';

  /** Pause a row when hovered */
  export let pauseOnHover: boolean = true;

  /** Alternate direction per row (row 0 L→R, row 1 R→L, etc.) */
  export let reverseAlternate: boolean = true;

  /** Fixed card width (CSS length or number in px). Keeps rows tidy and smooth. */
  export let cardWidth: number | string = 260;

  // ---- helpers ----
  const asItems = (e: NavItem | NavGroup): NavItem[] =>
    (e as NavGroup).items ? (e as NavGroup).items : [e as NavItem];

  const rows = Object.entries(sections ?? {})
    .map(([category, entries]) => ({ category, items: entries.flatMap(asItems) }))
    .filter((r) => r.items.length > 0);

  const dupe = (arr: NavItem[]) => [...arr, ...arr]; // seamless loop

  const durationFor = (count: number) => Math.max(12, Math.round(speedBase * (count / 4))); // scale with item count

  const cardWidthCss = typeof cardWidth === 'number' ? `${cardWidth}px` : cardWidth;
</script>

<div class="tools-carousel" style="--gap:{gap}; --card-width:{cardWidthCss};">
  {#each rows as row, i (row.category)}
    <section
      class="row {pauseOnHover ? 'pausable' : ''}"
      data-dir={reverseAlternate && i % 2 ? 'rtl' : 'ltr'}
      aria-label={row.category}
    >
      <!--
        For L→R rows we start at -50% and animate to 0 so the row is never empty.
        For R→L rows we animate 0 → -50%.
      -->
      <div class="track" style="animation-duration: {durationFor(row.items.length)}s;">
        {#each dupe(row.items).map((t, idx) => ({ t, idx })) as it (it.t.href + '-' + it.idx)}
          <div class="card-wrap">
            <ToolCard tool={it.t} size="small" />
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style lang="scss">
  .tools-carousel {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    // background: var(--bg-tertiary);
    // padding: var(--spacing-md);
    // border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    :global(.card-wrap) {
      --card-width: 16rem;
    }
    :global(.tool-card) {
      &:hover {
        transform: translateY(0);
      }
    }
  }

  /* Each row is a masked viewport */
  .row {
    position: relative;
    overflow: hidden;

    /* Pause on hover (per row) */
    &.pausable:hover .track {
      animation-play-state: paused;
    }
  }

  /* Scrolling track: two copies of items side-by-side for seamless loop */
  .track {
    display: flex;
    align-items: stretch;
    gap: var(--gap);
    width: max-content;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    will-change: transform; /* extra smoothness */

    /* direction per row */
    .row[data-dir='ltr'] & {
      animation-name: scroll-right;
    } /* visual motion L→R */
    .row[data-dir='rtl'] & {
      animation-name: scroll-left;
    } /* visual motion R→L */
  }

  /* Cards: fixed width to avoid reflow during animation */
  .card-wrap {
    flex: 0 0 auto;
    width: var(--card-width);
    min-width: var(--card-width);
  }

  /* GPU-accelerated transforms */
  @keyframes scroll-left {
    from {
      transform: translate3d(0, 0, 0);
    }
    to {
      transform: translate3d(-50%, 0, 0);
    }
  }
  @keyframes scroll-right {
    from {
      transform: translate3d(-50%, 0, 0);
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  }

  /* Responsive niceties */
  @media (max-width: 768px) {
    .tools-carousel {
      gap: calc(var(--gap) * 0.75);
    }
  }
</style>
