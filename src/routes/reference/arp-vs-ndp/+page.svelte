<script lang="ts">
  import { arpVsNdpContent } from '$lib/content/arp-vs-ndp.js';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Icon from '$lib/components/global/Icon.svelte';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages/arp-vs-ndp');
  });
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{arpVsNdpContent.title}</h1>
      <p class="subtitle">{arpVsNdpContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{arpVsNdpContent.sections.overview.title}</h2>
      <p>{arpVsNdpContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{$t('comparison.title')}</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Aspect</th>
            <th>{$t('comparison.headers.arp')}</th>
            <th>{$t('comparison.headers.ndp')}</th>
          </tr>
        </thead>
        <tbody>
          {#each arpVsNdpContent.comparison.basic as item, index (`${item.aspect}-${index}`)}
            <tr>
              <td><strong>{item.aspect}</strong></td>
              <td>{item.arp}</td>
              <td>{item.ndp}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{arpVsNdpContent.arpDetails.title}</h2>

      <h3>{$t('arp.messageTypes.title')}</h3>
      {#each arpVsNdpContent.arpDetails.messageTypes as type, index (`${type.type}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{type.type}</div>
          <div class="example-item">
            <div><strong>{$t('arp.messageTypes.fields.description')}</strong> {type.description}</div>
            <div><strong>{$t('arp.messageTypes.fields.destination')}</strong> {type.destination}</div>
            <div><strong>{$t('arp.messageTypes.fields.response')}</strong> {type.response}</div>
          </div>
        </div>
      {/each}

      <h3>{$t('arp.process.title')}</h3>
      <ol>
        {#each arpVsNdpContent.arpDetails.process as step, index (`arp-process-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{$t('arp.limitations.title')}</h3>
      <ul>
        {#each arpVsNdpContent.arpDetails.limitations as limitation, index (`arp-limitation-${index}`)}
          <li>{limitation}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{arpVsNdpContent.ndpDetails.title}</h2>

      <h3>{$t('ndp.messageTypes.title')}</h3>
      {#each arpVsNdpContent.ndpDetails.messageTypes as type, index (`${type.type}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{type.type}</div>
          <div class="example-item">
            <div><strong>{$t('ndp.messageTypes.fields.icmpType')}</strong> <code>{type.icmpType}</code></div>
            <div><strong>{$t('ndp.messageTypes.fields.description')}</strong> {type.description}</div>
            <div><strong>{$t('ndp.messageTypes.fields.destination')}</strong> {type.destination}</div>
            <div><strong>{$t('ndp.messageTypes.fields.purpose')}</strong> {type.purpose}</div>
          </div>
        </div>
      {/each}

      <h3>{$t('ndp.process.title')}</h3>
      <ol>
        {#each arpVsNdpContent.ndpDetails.process as step, index (`ndp-process-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{$t('ndp.advantages.title')}</h3>
      <ul>
        {#each arpVsNdpContent.ndpDetails.advantages as advantage, index (`ndp-advantage-${index}`)}
          <li>{advantage}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('practical.title')}</h2>
      {#each arpVsNdpContent.practicalDifferences as diff, index (`${diff.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{diff.scenario}</div>
          <div class="example-item">
            <div><strong>{$t('practical.fields.arp')}</strong> {diff.arp}</div>
            <div><strong>{$t('practical.fields.ndp')}</strong> {diff.ndp}</div>
            <div><strong>{$t('practical.fields.impact')}</strong> {diff.impact}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('troubleshooting.title')}</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>{$t('troubleshooting.headers.ipv4')}</th>
            <th>{$t('troubleshooting.headers.ipv6')}</th>
            <th>Windows</th>
          </tr>
        </thead>
        <tbody>
          {#each arpVsNdpContent.troubleshootingCommands as cmd, index (`${cmd.purpose}-${index}`)}
            <tr>
              <td><strong>{cmd.purpose}</strong></td>
              <td><code>{cmd.ipv4}</code></td>
              <td><code style="font-size: 0.8em;">{cmd.ipv6}</code></td>
              <td><code style="font-size: 0.8em;">{cmd.windows}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{$t('issues.title')}</h2>
      {#each arpVsNdpContent.commonIssues as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {issue.issue} ({issue.protocol})
          </div>
          <div class="warning-content">
            <p><strong>{$t('issues.fields.description')}</strong> {issue.description}</p>
            <p><strong>{$t('issues.fields.detection')}</strong> {issue.detection}</p>
            <p><strong>{$t('issues.fields.mitigation')}</strong> {issue.mitigation}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('bestPractices.title')}</h2>
      {#each arpVsNdpContent.bestPractices as practices, index (`${practices.protocol}-${index}`)}
        <h3>{practices.protocol} Best Practices</h3>
        <ul>
          {#each practices.practices as practice, index (`practice-${index}`)}
            <li>{practice}</li>
          {/each}
        </ul>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('quickReference.title')}</h2>
      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{$t('quickReference.arp')}</div>
          {#each arpVsNdpContent.quickReference.arp as point, index (`arp-point-${index}`)}
            <div class="item-code">{point}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{$t('quickReference.ndp')}</div>
          {#each arpVsNdpContent.quickReference.ndp as point, index (`ndp-point-${index}`)}
            <div class="item-code">{point}</div>
          {/each}
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{$t('migration.title')}</h2>
      <div class="ref-examples">
        <div class="examples-title">{$t('migration.considerations')}</div>
        {#each arpVsNdpContent.migrationTips as tip, index (`migration-tip-${index}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="arrow-right" size="sm" />
          Key Takeaway
        </div>
        <div class="highlight-content">
          While NDP is more complex than ARP, it's also much more capable and efficient. Understanding both protocols is
          essential for mixed IPv4/IPv6 environments.
        </div>
      </div>
    </div>
  </div>
</div>
