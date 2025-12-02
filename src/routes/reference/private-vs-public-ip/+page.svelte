<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, loadTranslations, t } from '$lib/stores/language.js';
  import { privateVsPublicContent } from '$lib/content/private-vs-public-ip.js';
  import Icon from '$lib/components/global/Icon.svelte';

  onMount(async () => {
    await loadTranslations(get(locale), 'reference/private-vs-public-ip');
  });
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{$t('title')}</h1>
      <p class="subtitle">{$t('description')}</p>
    </div>

    <div class="ref-section">
      <h2>{$t('sections.overview.title')}</h2>
      <p>{$t('sections.overview.content')}</p>
    </div>

    <div class="ref-section">
      <h2>{$t('privateRanges.title')}</h2>
      {#each privateVsPublicContent.privateRanges as range, index (`${range.range}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{range.range} - {range.class}</div>
          <div class="example-item">
            <div><strong>{$t('privateRanges.labels.fullRange')}</strong> <code>{range.fullRange}</code></div>
            <div><strong>{$t('privateRanges.labels.totalAddresses')}</strong> {range.addresses}</div>
            <div><strong>{$t('privateRanges.labels.commonUse')}</strong> {range.commonUse}</div>
            <div><strong>{$t('privateRanges.labels.examples')}</strong></div>
            {#each range.examples as example, index (`example-${index}`)}
              <code class="example-input">{example}</code>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('publicRanges.title')}</h2>
      <p>{$t('publicRanges.description')}</p>

      <h3>{$t('publicRanges.characteristics.title')}</h3>
      <ul>
        {#each $t('publicRanges.characteristics.items') as characteristic, index (`char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>{$t('publicRanges.examples.title')}</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('publicRanges.examples.headers.publicIp')}</th>
            <th>{$t('publicRanges.examples.headers.ownerService')}</th>
          </tr>
        </thead>
        <tbody>
          {#each privateVsPublicContent.publicRanges.examples as example, index (`public-example-${index}`)}
            <tr>
              <td><code>{example.ip}</code></td>
              <td>{example.owner}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{$t('natImplications.title')}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{privateVsPublicContent.natImplications.privateToPublic.title}</div>
          <div class="item-description">{privateVsPublicContent.natImplications.privateToPublic.description}</div>

          <h4>{$t('natImplications.privateToPublic.process.title')}</h4>
          <ol>
            {#each $t('natImplications.privateToPublic.process.steps') as step, index (`nat-step-${index}`)}
              <li>{step}</li>
            {/each}
          </ol>

          <h4>{$t('natImplications.privateToPublic.benefits.title')}</h4>
          <ul>
            {#each $t('natImplications.privateToPublic.benefits.items') as benefit, index (`benefit-${index}`)}
              <li>{benefit}</li>
            {/each}
          </ul>
        </div>

        <div class="grid-item">
          <div class="item-title">{privateVsPublicContent.natImplications.publicToPrivate.title}</div>
          <div class="item-description">{privateVsPublicContent.natImplications.publicToPrivate.description}</div>

          <h4>{$t('natImplications.publicToPrivate.challenges.title')}</h4>
          <ul>
            {#each $t('natImplications.publicToPrivate.challenges.items') as challenge, index (`challenge-${index}`)}
              <li>{challenge}</li>
            {/each}
          </ul>

          <h4>{$t('natImplications.publicToPrivate.solutions.title')}</h4>
          <ul>
            {#each $t('natImplications.publicToPrivate.solutions.items') as solution, index (`solution-${index}`)}
              <li>{solution}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{$t('identification.title')}</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('identification.headers.method')}</th>
            <th>Description</th>
            <th>{$t('identification.headers.privateIndicator')}</th>
            <th>{$t('identification.headers.publicIndicator')}</th>
          </tr>
        </thead>
        <tbody>
          {#each privateVsPublicContent.identification.quickCheck as method, index (`method-${index}`)}
            <tr>
              <td><strong>{method.method}</strong></td>
              <td>{method.description}</td>
              <td><code>{method.private}</code></td>
              <td><code>{method.public}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>{$t('tools.title')}</h3>
      <div class="ref-grid two-col">
        {#each privateVsPublicContent.identification.tools as tool, index (`${tool.tool}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{tool.tool}</div>
            <div class="item-description">{tool.purpose}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>{$t('commonScenarios.title')}</h2>
      {#each privateVsPublicContent.commonScenarios as scenario, index (`${scenario.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{scenario.scenario}</div>
          <div class="example-item">
            <div><strong>{$t('commonScenarios.labels.setup')}</strong> {scenario.setup}</div>
            <div><strong>{$t('commonScenarios.labels.privateIps')}</strong> {scenario.privateIPs}</div>
            <div><strong>{$t('commonScenarios.labels.publicIp')}</strong> {scenario.publicIP}</div>
            <div><strong>{$t('commonScenarios.labels.natBehavior')}</strong> {scenario.natBehavior}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('troubleshooting.title')}</h2>
      {#each privateVsPublicContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>{$t('troubleshooting.labels.possibleCauses')}</strong> {issue.possibleCauses.join(', ')}</p>
            <p><strong>{$t('troubleshooting.labels.diagnosis')}</strong> {issue.diagnosis}</p>
            <p><strong>{$t('troubleshooting.labels.solution')}</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('security.title')}</h2>
      {#each privateVsPublicContent.securityConsiderations as security, index (`${security.aspect}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{security.aspect}</div>
          <div class="example-item">
            <ul>
              {#each security.considerations as consideration, index (`consideration-${index}`)}
                <li>{consideration}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('bestPractices.title')}</h2>
      <ul>
        {#each privateVsPublicContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('quickReference.title')}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{$t('quickReference.privateRanges.title')}</div>
          {#each privateVsPublicContent.quickReference.privateRanges as range, index (`qr-range-${index}`)}
            <div class="item-code">{range}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{$t('quickReference.identificationTips.title')}</div>
          {#each privateVsPublicContent.quickReference.identificationTips as tip, index (`qr-tip-${index}`)}
            <div class="item-description">{tip}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          Key Rule
        </div>
        <div class="highlight-content">
          If an IP starts with 10, 172.16-31, or 192.168, it's private. Everything else (except other reserved ranges)
          is public. Private IPs need NAT to reach the internet.
        </div>
      </div>
    </div>
  </div>
</div>
