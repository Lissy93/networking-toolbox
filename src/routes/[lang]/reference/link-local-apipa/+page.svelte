<script lang="ts">
  import { linkLocalApipaContent } from '$lib/content/link-local-apipa.js';

  import Icon from '$lib/components/global/Icon.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages/link-local-apipa');
  });
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{linkLocalApipaContent.title}</h1>
      <p class="subtitle">{linkLocalApipaContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.sections.overview.title}</h2>
      <p>{linkLocalApipaContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.apipa.title}</h2>

      <div class="ref-examples">
        <div class="examples-title">{$t('pages.linkLocalApipa.apipa.addressRange.title')}</div>
        <div class="example-item">
          <div>
            <strong>{$t('pages.linkLocalApipa.apipa.addressRange.network')}:</strong>
            <code>{linkLocalApipaContent.apipa.range}</code>
          </div>
          <div>
            <strong>{$t('pages.linkLocalApipa.apipa.addressRange.fullRange')}:</strong>
            <code>{linkLocalApipaContent.apipa.fullRange}</code>
          </div>
          <div>
            <strong>{$t('pages.linkLocalApipa.apipa.addressRange.usableRange')}:</strong>
            <code>{linkLocalApipaContent.apipa.usableRange}</code>
          </div>
          <div>
            <strong>{$t('pages.linkLocalApipa.apipa.addressRange.reserved')}:</strong>
            {linkLocalApipaContent.apipa.reservedAddresses.join(', ')}
          </div>
        </div>
      </div>

      <p>{linkLocalApipaContent.apipa.description}</p>

      <h3>{$t('pages.linkLocalApipa.apipa.whenUsedTitle')}</h3>
      <ul>
        {#each linkLocalApipaContent.apipa.whenUsed as reason, index (`apipa-reason-${index}`)}
          <li>{reason}</li>
        {/each}
      </ul>

      <h3>{$t('pages.linkLocalApipa.apipa.howItWorksTitle')}</h3>
      <ol>
        {#each linkLocalApipaContent.apipa.howItWorks as step, index (`apipa-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{$t('pages.linkLocalApipa.apipa.characteristicsTitle')}</h3>
      <ul>
        {#each linkLocalApipaContent.apipa.characteristics as characteristic, index (`apipa-char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>{$t('pages.linkLocalApipa.apipa.troubleshootingTitle')}</h3>
      {#each linkLocalApipaContent.apipa.troubleshooting as issue, index (`${issue.symptom}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {issue.symptom}
          </div>
          <div class="warning-content">
            <p><strong>{$t('pages.linkLocalApipa.apipa.troubleshootingLabels.meaning')}:</strong> {issue.meaning}</p>
            <p><strong>{$t('pages.linkLocalApipa.apipa.troubleshootingLabels.solution')}:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.ipv6LinkLocal.title}</h2>

      <div class="ref-examples">
        <div class="examples-title">{$t('pages.linkLocalApipa.ipv6.addressRange.title')}</div>
        <div class="example-item">
          <div>
            <strong>{$t('pages.linkLocalApipa.ipv6.addressRange.network')}:</strong>
            <code>{linkLocalApipaContent.ipv6LinkLocal.range}</code>
          </div>
          <div>
            <strong>{$t('pages.linkLocalApipa.ipv6.addressRange.fullRange')}:</strong>
            <code>{linkLocalApipaContent.ipv6LinkLocal.fullRange}</code>
          </div>
          <div>
            <strong>{$t('pages.linkLocalApipa.ipv6.addressRange.commonFormat')}:</strong>
            <code>{linkLocalApipaContent.ipv6LinkLocal.commonFormat}</code>
          </div>
        </div>
      </div>

      <p>{linkLocalApipaContent.ipv6LinkLocal.description}</p>

      <h3>{$t('pages.linkLocalApipa.ipv6.addressFormationTitle')}</h3>
      <ol>
        {#each linkLocalApipaContent.ipv6LinkLocal.formation as step, index (`ipv6-formation-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{$t('pages.linkLocalApipa.ipv6.whenUsedTitle')}</h3>
      <ul>
        {#each linkLocalApipaContent.ipv6LinkLocal.whenUsed as use, index (`ipv6-use-${index}`)}
          <li>{use}</li>
        {/each}
      </ul>

      <h3>{$t('pages.linkLocalApipa.ipv6.characteristicsTitle')}</h3>
      <ul>
        {#each linkLocalApipaContent.ipv6LinkLocal.characteristics as characteristic, index (`ipv6-char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>{$t('pages.linkLocalApipa.ipv6.typesTitle')}</h3>
      <div class="ref-grid two-col">
        {#each linkLocalApipaContent.ipv6LinkLocal.types as type, index (`${type.type}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{type.type}</div>
            <div class="item-description">{type.description}</div>
            <div>
              <strong>{$t('pages.linkLocalApipa.ipv6.typeLabels.example')}:</strong> <code>{type.example}</code>
            </div>
            <div><strong>{$t('pages.linkLocalApipa.ipv6.typeLabels.privacy')}:</strong> {type.privacy}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.comparison.title')}</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('pages.linkLocalApipa.comparison.headers.aspect')}</th>
            <th>{$t('pages.linkLocalApipa.comparison.headers.ipv4Apipa')}</th>
            <th>{$t('pages.linkLocalApipa.comparison.headers.ipv6LinkLocal')}</th>
          </tr>
        </thead>
        <tbody>
          {#each linkLocalApipaContent.comparison as row, index (`${row.aspect}-${index}`)}
            <tr>
              <td><strong>{row.aspect}</strong></td>
              <td>{row.ipv4}</td>
              <td>{row.ipv6}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.practicalExamples.title')}</h2>
      {#each linkLocalApipaContent.practicalExamples as example, index (`${example.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}</div>
          <div class="example-item">
            <div>
              <strong>{$t('pages.linkLocalApipa.practicalExamples.labels.ipv4Behavior')}:</strong>
              {example.ipv4Behavior}
            </div>
            <div>
              <strong>{$t('pages.linkLocalApipa.practicalExamples.labels.ipv6Behavior')}:</strong>
              {example.ipv6Behavior}
            </div>
            <div><strong>{$t('pages.linkLocalApipa.practicalExamples.labels.impact')}:</strong> {example.impact}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.troubleshootingCommands.title')}</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('pages.linkLocalApipa.troubleshootingCommands.headers.purpose')}</th>
            <th>{$t('pages.linkLocalApipa.troubleshootingCommands.headers.windows')}</th>
            <th>{$t('pages.linkLocalApipa.troubleshootingCommands.headers.linux')}</th>
            <th>{$t('pages.linkLocalApipa.troubleshootingCommands.headers.macOS')}</th>
          </tr>
        </thead>
        <tbody>
          {#each linkLocalApipaContent.troubleshootingCommands as cmd, index (`${cmd.purpose}-${index}`)}
            <tr>
              <td><strong>{cmd.purpose}</strong></td>
              <td><code>{cmd.windows}</code></td>
              <td><code>{cmd.linux}</code></td>
              <td><code>{cmd.macOS}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.whenToWorry.title')}</h2>
      {#each linkLocalApipaContent.whenToWorry as situation, index (`${situation.situation}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{situation.situation}</div>
          <div class="example-item">
            <div>
              <strong>{$t('pages.linkLocalApipa.whenToWorry.labels.concernLevel')}:</strong>
              {situation.concern}
            </div>
            <div><strong>{$t('pages.linkLocalApipa.whenToWorry.labels.action')}:</strong> {situation.action}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.bestPractices.title')}</h2>
      <ul>
        {#each linkLocalApipaContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.commonMistakes.title')}</h2>
      <ul>
        {#each linkLocalApipaContent.commonMistakes as mistake, index (`mistake-${index}`)}
          <li>{mistake}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.linkLocalApipa.quickReference.title')}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{$t('pages.linkLocalApipa.quickReference.recognitionTitle')}</div>
          {#each linkLocalApipaContent.quickReference.recognition as item, index (`recognition-${index}`)}
            <div class="item-description">{item}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{$t('pages.linkLocalApipa.quickReference.troubleshootingTitle')}</div>
          {#each linkLocalApipaContent.quickReference.troubleshooting as item, index (`qr-trouble-${index}`)}
            <div class="item-description">{item}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          {$t('pages.linkLocalApipa.quickReference.keyDifferenceTitle')}
        </div>
        <div class="highlight-content">
          {$t('pages.linkLocalApipa.quickReference.keyDifferenceText')}
        </div>
      </div>
    </div>
  </div>
</div>
