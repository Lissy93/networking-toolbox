<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { site } from '$lib/constants/site';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages');
  });
</script>

<svelte:head>
  <title>{$t('pages.legal.privacy.title')}</title>
  <meta name="description" content={$t('pages.legal.privacy.metaDescription')} />
  <meta property="og:title" content={$t('pages.legal.privacy.ogTitle')} />
  <meta property="og:description" content={$t('pages.legal.privacy.ogDescription')} />
  <meta property="og:url" content="{site.url}/about/legal/privacy" />
</svelte:head>

<div class="hero">
  <h2>{$t('pages.legal.privacy.hero.title')}</h2>
  <p class="lead">
    {$t('pages.legal.privacy.hero.lead')}
  </p>

  <h3>{$t('pages.legal.privacy.principles.title')}</h3>
  <ul>
    {#each $t('pages.legal.privacy.principles.items') as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
</div>

<section>
  <h3>{$t('pages.legal.privacy.overview.title')}</h3>
  <p>
    {$t('pages.legal.privacy.overview.description')}
  </p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.dataProcessing.title')}</h3>

  <h4>{$t('pages.legal.privacy.dataProcessing.clientSide.title')}</h4>
  <p>
    {$t('pages.legal.privacy.dataProcessing.clientSide.description')}
  </p>

  <h4>{$t('pages.legal.privacy.dataProcessing.serverSide.title')}</h4>
  <p>
    {$t('pages.legal.privacy.dataProcessing.serverSide.description')}
  </p>
  <ul>
    {#each $t('pages.legal.privacy.dataProcessing.serverSide.items') as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
</section>

<section id="local-storage">
  <h3>{$t('pages.legal.privacy.localStorage.title')}</h3>
  <p>
    {$t('pages.legal.privacy.localStorage.description')}
  </p>
  <ul>
    {#each $t('pages.legal.privacy.localStorage.items') as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
  <p>{$t('pages.legal.privacy.localStorage.note')}</p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.analytics.title')}</h3>
  <p>
    {$t('pages.legal.privacy.analytics.description')}
  </p>
  <ul>
    {#each $t('pages.legal.privacy.analytics.features') as feature, index (index)}
      <li>{feature}</li>
    {/each}
  </ul>
  <p>{$t('pages.legal.privacy.analytics.note')}</p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.thirdParty.title')}</h3>
  <p>{$t('pages.legal.privacy.thirdParty.description')}</p>
  <ul>
    {#each $t('pages.legal.privacy.thirdParty.services') as service, index (index)}
      <li>{service}</li>
    {/each}
  </ul>
  <p>{$t('pages.legal.privacy.thirdParty.note')}</p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.selfHosting.title')}</h3>
  <p>
    {$t('pages.legal.privacy.selfHosting.description')}
  </p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.openSource.title')}</h3>
  <p>{$t('pages.legal.privacy.openSource.description')}</p>
  <ul>
    <li>
      <a href={site.repo} rel="noopener noreferrer" target="_blank"
        >{$t('pages.legal.privacy.openSource.githubLinkText')}</a
      >
    </li>
  </ul>
</section>

<section>
  <h3>{$t('pages.legal.privacy.changes.title')}</h3>
  <p>
    {$t('pages.legal.privacy.changes.description')}
  </p>
  <p class="updated">{$t('pages.legal.privacy.changes.lastUpdated')}</p>
</section>

<section class="contact">
  <h3>{$t('pages.legal.privacy.contact.title')}</h3>
  <p>
    {$t('pages.legal.privacy.contact.description')}
  </p>
</section>
