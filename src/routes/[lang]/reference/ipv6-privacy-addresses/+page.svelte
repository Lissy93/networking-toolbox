<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import {
    getIpv6PrivacyContent,
    type OSImplementation,
    isOSImplementation,
  } from '$lib/content/ipv6-privacy-addresses.js';
  import Icon from '$lib/components/global/Icon.svelte';

  let ipv6PrivacyContent: ReturnType<typeof getIpv6PrivacyContent>;

  // Load translations for this page
  onMount(async () => {
    await loadTranslations(get(locale), 'pages/ipv6-privacy');
    ipv6PrivacyContent = getIpv6PrivacyContent();
  });
</script>

<svelte:head>
  <title
    >{ipv6PrivacyContent ? ipv6PrivacyContent.title : ''}{$t('common.meta.titleSeparator')}{$t(
      'common.meta.titleSuffix',
    )}</title
  >
  <meta
    name="description"
    content={ipv6PrivacyContent ? ipv6PrivacyContent.description : $t('common.meta.defaultDescription')}
  />
</svelte:head>

<div class="page-container">
  <div class="ref-page">
    {#if ipv6PrivacyContent}
      <div class="ref-header">
        <h1>{ipv6PrivacyContent.title}</h1>
        <p class="subtitle">{ipv6PrivacyContent.description}</p>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.sections.overview.title}</h2>
        <p>{ipv6PrivacyContent.sections.overview.content}</p>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.sections.problem.title}</h2>
        <p>{ipv6PrivacyContent.sections.problem.content}</p>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.addressTypes.title}</h2>
        {#each ipv6PrivacyContent.addressTypes.types as type, index (`${type.type}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{type.type}</div>
            <div class="example-item">
              <div><strong>{$t('pages.ipv6Privacy.labels.formation')}:</strong> {type.formation}</div>
              <div><strong>{$t('pages.ipv6Privacy.labels.example')}:</strong> <code>{type.example}</code></div>
              <div><strong>{$t('pages.ipv6Privacy.labels.privacyLevel')}:</strong> {type.privacy}</div>

              <h4>{$t('pages.ipv6Privacy.labels.characteristics')}:</h4>
              <ul>
                {#each type.characteristics as characteristic, index (`characteristic-${index}`)}
                  <li>{characteristic}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.howItWorks.title}</h2>

        <h3>{$t('pages.ipv6Privacy.howItWorks.addressGenerationTitle')}</h3>
        <ol>
          {#each ipv6PrivacyContent.howItWorks.addressGeneration as step, index (`gen-step-${index}`)}
            <li>{step}</li>
          {/each}
        </ol>

        <h3>{$t('pages.ipv6Privacy.howItWorks.temporaryLifecycleTitle')}</h3>
        <ol>
          {#each ipv6PrivacyContent.howItWorks.temporaryLifecycle as step, index (`lifecycle-step-${index}`)}
            <li>{step}</li>
          {/each}
        </ol>

        <h3>{$t('pages.ipv6Privacy.howItWorks.defaultBehaviorTitle')}</h3>
        <ul>
          {#each ipv6PrivacyContent.howItWorks.defaultBehavior as behavior, index (`behavior-${index}`)}
            <li>{behavior}</li>
          {/each}
        </ul>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.lifetimes.title}</h2>

        <div class="ref-grid two-col">
          <div class="grid-item">
            <div class="item-title">{$t('pages.ipv6Privacy.lifetimes.preferredLifetime.title')}</div>
            <div class="item-description">{ipv6PrivacyContent.lifetimes.preferredLifetime.description}</div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.typical')}:</strong>
              {ipv6PrivacyContent.lifetimes.preferredLifetime.typical}
            </div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.behavior')}:</strong>
              {ipv6PrivacyContent.lifetimes.preferredLifetime.behavior}
            </div>
          </div>

          <div class="grid-item">
            <div class="item-title">{$t('pages.ipv6Privacy.lifetimes.validLifetime.title')}</div>
            <div class="item-description">{ipv6PrivacyContent.lifetimes.validLifetime.description}</div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.typical')}:</strong>
              {ipv6PrivacyContent.lifetimes.validLifetime.typical}
            </div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.behavior')}:</strong>
              {ipv6PrivacyContent.lifetimes.validLifetime.behavior}
            </div>
          </div>

          <div class="grid-item">
            <div class="item-title">{$t('pages.ipv6Privacy.lifetimes.regenerationInterval.title')}</div>
            <div class="item-description">{ipv6PrivacyContent.lifetimes.regenerationInterval.description}</div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.typical')}:</strong>
              {ipv6PrivacyContent.lifetimes.regenerationInterval.typical}
            </div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.behavior')}:</strong>
              {ipv6PrivacyContent.lifetimes.regenerationInterval.behavior}
            </div>
          </div>

          <div class="grid-item">
            <div class="item-title">{$t('pages.ipv6Privacy.lifetimes.maxTempAddresses.title')}</div>
            <div class="item-description">{ipv6PrivacyContent.lifetimes.maxTempAddresses.description}</div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.typical')}:</strong>
              {ipv6PrivacyContent.lifetimes.maxTempAddresses.typical}
            </div>
            <div>
              <strong>{$t('pages.ipv6Privacy.labels.behavior')}:</strong>
              {ipv6PrivacyContent.lifetimes.maxTempAddresses.behavior}
            </div>
          </div>
        </div>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.osImplementations.title}</h2>

        {#each Object.entries(ipv6PrivacyContent.osImplementations) as [key, os] (key)}
          {#if isOSImplementation(os)}
            <div class="ref-examples">
              <div class="examples-title">{os.os}</div>
              <div class="example-item">
                <div>
                  <strong>{$t('pages.ipv6Privacy.labels.defaultBehavior')}:</strong>
                  {os.defaultBehavior}
                </div>

                <h4>{$t('pages.ipv6Privacy.labels.configuration')}:</h4>
                {#each os.configuration || [] as config, index (`config-${index}`)}
                  <code class="example-input">{config}</code>
                {/each}

                {#if (os as OSImplementation).values}
                  <h4>{$t('pages.ipv6Privacy.labels.values')}:</h4>
                  <ul>
                    {#each (os as OSImplementation).values! as value, index (`value-${index}`)}
                      <li><code>{value}</code></li>
                    {/each}
                  </ul>
                {/if}

                <h4>{$t('pages.ipv6Privacy.labels.commands')}:</h4>
                {#each (os as OSImplementation).commands as command, index (`command-${index}`)}
                  <code class="example-input">{command}</code>
                {/each}

                {#if (os as OSImplementation).behavior}
                  <div>
                    <strong>{$t('pages.ipv6Privacy.labels.behavior')}:</strong>
                    {(os as OSImplementation).behavior}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.identifyingAddresses.title}</h2>
        <table class="ref-table">
          <thead>
            <tr>
              <th>{$t('pages.ipv6Privacy.labels.method')}</th>
              <th>{$t('pages.ipv6Privacy.labels.stable')}</th>
              <th>{$t('pages.ipv6Privacy.labels.temporary')}</th>
              <th>{$t('pages.ipv6Privacy.labels.example')}</th>
            </tr>
          </thead>
          <tbody>
            {#each ipv6PrivacyContent.identifyingAddresses.methods as method, index (`method-${index}`)}
              <tr>
                <td><strong>{method.method}</strong></td>
                <td>{method.stable}</td>
                <td>{method.temporary}</td>
                <td>{method.example}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.troubleshooting.title}</h2>
        {#each ipv6PrivacyContent.troubleshooting.issues as issue, index (`${issue.issue}-${index}`)}
          <div class="ref-warning">
            <div class="warning-title">
              <Icon name="help-circle" size="sm" />
              {issue.issue}
            </div>
            <div class="warning-content">
              <p><strong>{$t('pages.ipv6Privacy.labels.symptoms')}:</strong> {issue.symptoms.join(', ')}</p>
              <p><strong>{$t('pages.ipv6Privacy.labels.diagnosis')}:</strong> {issue.diagnosis}</p>
              <div><strong>{$t('pages.ipv6Privacy.labels.solutions')}:</strong></div>
              <ul>
                {#each issue.solutions as solution, index (`solution-${index}`)}
                  <li>{solution}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.securityConsiderations.title}</h2>
        {#each ipv6PrivacyContent.securityConsiderations.aspects as security, index (`${security.aspect}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{security.aspect}</div>
            <div class="example-item">
              <h4>{$t('pages.ipv6Privacy.labels.benefits')}:</h4>
              <ul>
                {#each security.benefits as benefit, index (`benefit-${index}`)}
                  <li>{benefit}</li>
                {/each}
              </ul>

              <h4>
                {security.limitations
                  ? $t('pages.ipv6Privacy.labels.limitations')
                  : $t('pages.ipv6Privacy.labels.challenges')}:
              </h4>
              <ul>
                {#each security.limitations || security.challenges as item, index (`limitation-${index}`)}
                  <li>{item}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.whenToUse.title}</h2>
        {#each ipv6PrivacyContent.whenToUse.scenarios as scenario, index (`${scenario.scenario}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{scenario.scenario}</div>
            <div class="example-item">
              <div><strong>{$t('pages.ipv6Privacy.labels.recommendation')}:</strong> {scenario.recommendation}</div>
              <div><strong>{$t('pages.ipv6Privacy.labels.reasoning')}:</strong> {scenario.reasoning}</div>
              <div><strong>{$t('pages.ipv6Privacy.labels.configuration')}:</strong> {scenario.configuration}</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.bestPractices.title}</h2>
        <ul>
          {#each ipv6PrivacyContent.bestPractices.practices as practice, index (`practice-${index}`)}
            <li>{practice}</li>
          {/each}
        </ul>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.commonMistakes.title}</h2>
        <ul>
          {#each ipv6PrivacyContent.commonMistakes.mistakes as mistake, index (`mistake-${index}`)}
            <li>{mistake}</li>
          {/each}
        </ul>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.quickReference.title}</h2>

        <div class="ref-grid two-col">
          <div class="grid-item">
            <div class="item-title">{ipv6PrivacyContent.quickReference.addressTypesTitle}</div>
            {#each ipv6PrivacyContent.quickReference.addressTypes as type, index (`qr-type-${index}`)}
              <div class="item-description">{type}</div>
            {/each}
          </div>

          <div class="grid-item">
            <div class="item-title">{ipv6PrivacyContent.quickReference.identificationTitle}</div>
            {#each ipv6PrivacyContent.quickReference.identification as tip, index (`qr-id-${index}`)}
              <div class="item-description">{tip}</div>
            {/each}
          </div>
        </div>

        <div class="ref-grid two-col">
          <div class="grid-item">
            <div class="item-title">{ipv6PrivacyContent.quickReference.configurationTitle}</div>
            {#each ipv6PrivacyContent.quickReference.configuration as config, index (`qr-config-${index}`)}
              <div class="item-code">{config}</div>
            {/each}
          </div>

          <div class="grid-item">
            <div class="item-title">{ipv6PrivacyContent.quickReference.troubleshootingTitle}</div>
            {#each ipv6PrivacyContent.quickReference.troubleshooting as tip, index (`qr-trouble-${index}`)}
              <div class="item-description">{tip}</div>
            {/each}
          </div>
        </div>

        <div class="ref-highlight">
          <div class="highlight-title">
            <Icon name="key" size="sm" />
            {ipv6PrivacyContent.quickReference.keyRuleTitle}
          </div>
          <div class="highlight-content">
            {ipv6PrivacyContent.quickReference.keyRule}
          </div>
        </div>
      </div>

      <div class="ref-section">
        <h2>{ipv6PrivacyContent.tools.title}</h2>
        <div class="ref-grid two-col">
          {#each ipv6PrivacyContent.tools.tools as tool, index (`${tool.tool}-${index}`)}
            <div class="grid-item">
              <div class="item-title">{tool.tool}</div>
              <div class="item-description">{tool.purpose}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
