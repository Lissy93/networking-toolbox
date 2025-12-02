<script lang="ts">
  import { site } from '$lib/constants/site';

  const sections = [
    {
      title: 'Our Commitment',
      content:
        'Networking Toolbox is designed to be accessible to everyone. We meet WCAG 2.1 Level AA standards and continuously work to improve accessibility for all users.',
    },
    {
      title: 'Accessibility Features',
      list: [
        'Fully keyboard navigable - use Tab, Enter, and arrow keys to navigate without a mouse',
        'Screen reader compatible - tested with NVDA, JAWS, and VoiceOver',
        'Customizable display options in Settings:',
        '  • High contrast themes',
        '  • Adjustable text size',
        '  • Dyslexic-friendly font option',
        '  • Enhanced focus indicators',
        '  • Reduced motion mode',
        'Semantic HTML and ARIA labels throughout',
        'Clear color contrast ratios',
        'Alternative text for all images and icons',
      ],
    },
    {
      title: 'Feedback & Improvements',
      content:
        'We welcome feedback on accessibility issues. If you encounter any barriers while using Networking Toolbox, please open an issue on GitHub or contact us directly. Pull requests for accessibility enhancements are always appreciated.',
      link: {
        text: 'Report an accessibility issue',
        url: site.repo + '/issues',
      },
    },
    {
      title: 'Third-Party Content',
      content:
        'While we strive to ensure our platform is accessible, some diagnostic tools may interact with third-party services beyond our control. We do our best to present this information accessibly.',
    },
  ];
</script>

<svelte:head>
  <title>Accessibility Policy | Networking Toolbox</title>
  <meta
    name="description"
    content="Accessibility policy for Networking Toolbox - WCAG AA compliant with keyboard navigation and screen reader support"
  />
  <meta property="og:title" content="Accessibility Policy | {site.title}" />
  <meta property="og:description" content="Learn about accessibility features and standards in Networking Toolbox" />
  <meta property="og:url" content="{site.url}/about/legal/accessibility" />
</svelte:head>

<div class="hero">
  <h2>Accessibility Policy</h2>
  <p class="lead">Making networking tools accessible to everyone.</p>
</div>

{#each sections as section (section.title)}
  <section>
    <h3>{section.title}</h3>
    <p>{section.content}</p>

    {#if section.list}
      <ul>
        {#each section.list as item, index (index)}
          <li>{item}</li>
        {/each}
      </ul>
    {/if}

    {#if section.link}
      <p>
        <a href={section.link.url} rel="noopener noreferrer" target="_blank">{section.link.text}</a>
      </p>
    {/if}
  </section>
{/each}
