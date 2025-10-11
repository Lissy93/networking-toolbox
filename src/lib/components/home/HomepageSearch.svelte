<script lang="ts">
  import GlobalSearch from '$lib/components/global/GlobalSearch.svelte';
  import { site } from '$lib/constants/site';
</script>

<div class="homepage-search">
  <section class="hero-search">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <h1>{site.title}</h1>
      <p class="hero-text">{site.heroDescription}</p>
    </div>
  </section>

  <div class="search-container">
    <GlobalSearch embedded={true} />
  </div>
</div>

<style lang="scss">
  .homepage-search {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .hero-search {
    position: relative;
    text-align: center;

    overflow: hidden;
    border-radius: var(--radius-lg);

    .hero-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse at center,
        color-mix(in srgb, var(--color-primary), transparent 94%),
        transparent 60%
      );
      animation:
        bgFadeIn 1s ease-out,
        bgPulse 8s ease-in-out 1s infinite;
      z-index: 0;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      animation: heroFadeIn 0.8s ease-out;
    }

    h1 {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      margin: 0 0 var(--spacing-sm);
      line-height: 1.2;
      animation: heroFadeIn 0.8s ease-out 0.1s both;

      @media (max-width: 768px) {
        font-size: var(--font-size-2xl);
      }
    }

    .hero-text {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
      animation: heroFadeIn 0.8s ease-out 0.2s both;

      @media (max-width: 768px) {
        font-size: var(--font-size-md);
      }
    }
  }

  @keyframes bgFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes bgPulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  @keyframes heroFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .search-container {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    padding: 0 var(--spacing-md);
  }
</style>
