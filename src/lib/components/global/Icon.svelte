<script lang="ts">
  import { iconMap } from '$lib/constants/icon-map';

  interface Props {
    name: IconName;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    animate?: 'spin' | 'pulse' | 'pulse-once' | 'bounce' | 'fade' | null;
    rotate?: 0 | 90 | 180 | 270;
  }

  let { name, size = 'md', animate = null, rotate = 0 }: Props = $props();

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  type IconName = keyof typeof iconMap;

  /**
   * Get SVG content for the given icon name
   * @param iconName - The name of the icon to retrieve
   * @returns The SVG content string or undefined if not found
   */
  function getSvgContent(iconName: string): string | undefined {
    const icon = iconMap[iconName];
    if (!icon) {
      console.warn(`Icon "${iconName}" not found. Using default icon.`);
    }
    return icon;
  }

  // Get the SVG content for the current icon (reactive to name changes)
  const svgContent = $derived(getSvgContent(name));
</script>

<div class="icon {sizeClasses[size]} {animate ? `animate-${animate}` : ''} {rotate ? `rotate rotate-${rotate}` : ''} ">
  {#if svgContent}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html svgContent}
  {:else}
    <svg fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  {/if}
</div>

<style>
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    :global(svg) {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
    height: 2rem;
    width: 2rem;
  }

  /* Size classes */
  .w-2 {
    width: 1rem;
    height: 1rem;
  }
  .h-2 {
    height: 1rem;
  }
  .w-4 {
    width: 1.25rem;
    height: 1.25rem;
  }
  .h-4 {
    height: 1.25rem;
  }
  .w-6 {
    width: 1.5rem;
    height: 1.5rem;
  }
  .h-6 {
    height: 1.5rem;
  }
  .w-8 {
    width: 1.75rem;
    height: 1.75rem;
  }
  .h-8 {
    height: 1.75rem;
  }
  .w-8 {
    width: 2rem;
    height: 2rem;
  }

  .rotate {
    transition: transform 0.3s ease;
    &.rotate-0 {
      transform: rotate(0deg);
    }
    &.rotate-90 {
      transform: rotate(90deg);
    }
    &.rotate-180 {
      transform: rotate(180deg);
    }
    &.rotate-270 {
      transform: rotate(270deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-pulse-once {
    animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) 1;
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }

  .animate-fade {
    animation: fade 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: none;
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }

  @keyframes fade {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
</style>
