<script lang="ts">
  import ToolsCarousel from '$lib/components/global/ToolsCarousel.svelte';
  import { SUB_NAV } from '$lib/constants/nav';
  import { site } from '$lib/constants/site';
</script>

<div class="carousel-layout">
  <!-- Hero Title -->
  <section class="hero">
    <h1 class="title">{site.title}</h1>
    <p class="subtitle">{site.heroDescription}</p>
    <div class="search-cta">
      <kbd>⌘</kbd>
      <kbd>K</kbd>
      <span>to search</span>
    </div>
  </section>

  <!-- Carousel -->
  <ToolsCarousel sections={SUB_NAV} speedBase={36} gap="var(--spacing-sm)" pauseOnHover reverseAlternate />
</div>

<style lang="scss">
  .carousel-layout {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    justify-content: space-evenly;
    width: 100vw;
    min-height: calc(100vh - 5rem);
    position: absolute;
    left: 0;
    top: 5rem;
    background-color: var(--bg-primary);
    opacity: 1;
    background-image:
      linear-gradient(var(--bg-secondary) 1px, transparent 1px),
      linear-gradient(to right, var(--bg-secondary) 1px, var(--bg-primary) 1px);
    background-size: 20px 20px;
  }

  .hero {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-md);
    margin: 0 auto;
    max-width: 50rem;
  }

  .title {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    background: linear-gradient(
      135deg,
      var(--color-primary),
      color-mix(in srgb, var(--color-primary), var(--color-primary-hover) 40%)
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 var(--spacing-md) 0;
    line-height: 1.1;
    letter-spacing: -0.02em;
    animation: titleEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .subtitle {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
    font-weight: 400;
  }

  .search-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-lg);
    font-size: var(--font-size-md);
    color: var(--text-secondary);

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      padding: 0 var(--spacing-sm);
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
      box-shadow: 0 1px 0 0 var(--border-secondary);
    }

    span {
      font-weight: 400;
    }
  }

  :global(body:has(.carousel-layout) .footer) {
    position: absolute;
    bottom: 0;
    background: var(--bg-primary);
  }

  @keyframes titleEnter {
    0% {
      transform: translateY(-50px);
      opacity: 0;
      clip-path: polygon(100% 0, 100% 100%, 0 100%, 0 80%);
    }
    100% {
      transform: translateY(0);
      opacity: 1;
      clip-path: polygon(100% 0, 100% 100%, 0 100%, 0 15%);
    }
  }

  @media (max-width: 768px) {
    .hero {
      padding: var(--spacing-lg) var(--spacing-md) var(--spacing-sm);
    }

    .subtitle {
      font-size: var(--font-size-md);
    }
  }
</style>
