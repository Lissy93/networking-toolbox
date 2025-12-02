<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { site } from '$lib/constants/site';

  // Load translations for this page
  onMount(async () => {
    await loadTranslations(get(locale), 'pages/legal');
  });
</script>

<svelte:head>
  <title>{$t('pages.legal.privacy.title')}{$t('common.meta.titleSeparator')}{$t('common.meta.titleSuffix')}</title>
  <meta name="description" content={$t('pages.legal.privacy.metaDescription')} />
  <meta property="og:title" content={$t('pages.legal.privacy.ogTitle', { siteTitle: site.title })} />
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
    {#each $t('pages.legal.privacy.principles.items') as principle, index (index)}
      <li>{principle}</li>
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
    {#each $t('pages.legal.privacy.localStorage.items') as unknown as { title: string; description: string }[] as item, index (index)}
      <li><strong>{item.title}</strong> {item.description}</li>
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
    {#each $t('pages.legal.privacy.analytics.features') as unknown as { title: string; description: string }[] as feature, index (index)}
      <li><strong>{feature.title}</strong> {feature.description}</li>
    {/each}
  </ul>
  <p>{$t('pages.legal.privacy.analytics.note')}</p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.thirdParty.title')}</h3>
  <p>{$t('pages.legal.privacy.thirdParty.description')}</p>
  <ul>
    {#each $t('pages.legal.privacy.thirdParty.services') as unknown as { title: string; description: string }[] as service, index (index)}
      <li><strong>{service.title}</strong> {service.description}</li>
    {/each}
  </ul>
  <p>{$t('pages.legal.privacy.thirdParty.note')}</p>
</section>

<section>
  <h3>{$t('pages.legal.privacy.selfHosting.title')}</h3>
  <p>
    {$t('pages.legal.privacy.selfHosting.description', {
      deployingLink: `<a href="/about/deploying">${$t('pages.legal.privacy.selfHosting.deployingLinkText')}</a>`,
    })}
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
    {$t('pages.legal.privacy.changes.description', {
      changelogLink: `<a href="${site.repo}/blob/main/CHANGELOG.md" rel="noopener noreferrer" target="_blank">${$t('pages.legal.privacy.changes.changelogLinkText')}</a>`,
    })}
  </p>
  <p class="updated">{$t('pages.legal.privacy.changes.lastUpdated')}</p>
</section>

<section class="contact">
  <h3>{$t('pages.legal.privacy.contact.title')}</h3>
  <p>
    {$t('pages.legal.privacy.contact.description', {
      githubLink: `<a href="${site.repo}/issues" rel="noopener noreferrer" target="_blank">${$t('pages.legal.privacy.contact.githubLinkText')}</a>`,
    })}
  </p>
</section>
