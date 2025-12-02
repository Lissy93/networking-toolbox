<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { getReverseZonesContent } from '$lib/content/reverse-zones.js';
  import Icon from '$lib/components/global/Icon.svelte';

  let reverseZonesContent: ReturnType<typeof getReverseZonesContent>;

  // Load translations for this page
  onMount(async () => {
    await loadTranslations(get(locale), 'pages/reverse-zones');
    reverseZonesContent = getReverseZonesContent();
  });
</script>

<div class="page-container">
  <div class="ref-page">
    {#if reverseZonesContent}
      <div class="ref-header">
        <h1>{reverseZonesContent.title}</h1>
        <p class="subtitle">{reverseZonesContent.description}</p>
      </div>

      <div class="ref-section">
        <h2>{reverseZonesContent.sections.overview.title}</h2>
        <p>{reverseZonesContent.sections.overview.content}</p>
      </div>

      <div class="ref-section">
        <h2>{reverseZonesContent.sections.delegation.title}</h2>
        <p>{reverseZonesContent.sections.delegation.content}</p>
      </div>

      <div class="ref-section">
        <h2>{reverseZonesContent.ipv4Zones.title}</h2>

        <h3>{$t('pages.reverseZones.ipv4Zones.classfullBoundariesTitle')}</h3>
        <table class="ref-table">
          <thead>
            <tr>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.cidr')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.example')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.reverseZone')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.description')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.delegation')}</th>
            </tr>
          </thead>
          <tbody>
            {#each reverseZonesContent.ipv4Zones.classfullBoundaries as boundary, index (`${boundary.cidr}-${index}`)}
              <tr>
                <td><code>{boundary.cidr}</code></td>
                <td><code>{boundary.example}</code></td>
                <td><code>{boundary.reverseZone}</code></td>
                <td>{boundary.description}</td>
                <td>{boundary.delegation}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <h3>{$t('pages.reverseZones.ipv4Zones.classlessDelegationTitle')}</h3>
        {#each reverseZonesContent.ipv4Zones.classlessDelegation as delegation, index (`${delegation.cidr}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{delegation.cidr} - {delegation.example}</div>
            <div class="example-item">
              <div><strong>{$t('pages.reverseZones.labels.addresses')}:</strong> {delegation.addresses}</div>
              <div><strong>{$t('pages.reverseZones.labels.problem')}:</strong> {delegation.problem}</div>
              <div><strong>{$t('pages.reverseZones.labels.solution')}:</strong> {delegation.solution}</div>
              <div><strong>{$t('pages.reverseZones.labels.zoneNames')}:</strong></div>
              {#each delegation.zones as zone, index (`zone-${index}`)}
                <code class="example-input">{zone}</code>
              {/each}
            </div>
          </div>
        {/each}

        <h3>{$t('pages.reverseZones.ipv4Zones.practicalExamplesTitle')}</h3>
        {#each reverseZonesContent.ipv4Zones.practicalExamples as example, index (`${example.network}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{example.scenario}</div>
            <div class="example-item">
              <div><strong>{$t('pages.reverseZones.labels.network')}:</strong> <code>{example.network}</code></div>
              <div>
                <strong>{$t('pages.reverseZones.labels.reverseZone')}:</strong> <code>{example.reverseZone}</code>
              </div>
              {#if example.reverseZones}
                <div><strong>{$t('pages.reverseZones.labels.reverseZones')}:</strong></div>
                {#each example.reverseZones as zone, index (`rz-${index}`)}
                  <code class="example-input">{zone}</code>
                {/each}
                <div><strong>{$t('pages.reverseZones.labels.description')}:</strong> {example.description}</div>
              {:else}
                <div><strong>{$t('pages.reverseZones.labels.ptrRecords')}:</strong></div>
                {#each example.ptrRecords as record, index (`ptr-${index}`)}
                  <code class="example-input">{record}</code>
                {/each}
              {/if}
              <div><strong>{$t('pages.reverseZones.labels.delegation')}:</strong> {example.delegation}</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{reverseZonesContent.ipv6Zones.title}</h2>

        <h3>{$t('pages.reverseZones.ipv6Zones.nibbleBoundariesTitle')}</h3>
        <table class="ref-table">
          <thead>
            <tr>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.cidr')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.example')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.reverseZone')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.description')}</th>
              <th>{$t('pages.reverseZones.ipv4Zones.tableHeaders.delegation')}</th>
            </tr>
          </thead>
          <tbody>
            {#each reverseZonesContent.ipv6Zones.nibbleBoundaries as boundary, index (`${boundary.cidr}-${index}`)}
              <tr>
                <td><code>{boundary.cidr}</code></td>
                <td><code>{boundary.example}</code></td>
                <td><code>{boundary.reverseZone}</code></td>
                <td>{boundary.description}</td>
                <td>{boundary.delegation}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <h3>{$t('pages.reverseZones.ipv6Zones.practicalExamplesTitle')}</h3>
        {#each reverseZonesContent.ipv6Zones.practicalExamples as example, index (`${example.network}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{example.scenario}</div>
            <div class="example-item">
              <div><strong>{$t('pages.reverseZones.labels.network')}:</strong> <code>{example.network}</code></div>
              <div>
                <strong>{$t('pages.reverseZones.labels.masterZone')}:</strong> <code>{example.reverseZone}</code>
              </div>
              <div><strong>{$t('pages.reverseZones.labels.subZones')}:</strong></div>
              {#each example.subZones as zone, index (`subzone-${index}`)}
                <code class="example-input">{zone}</code>
              {/each}
              <div><strong>{$t('pages.reverseZones.labels.management')}:</strong> {example.management}</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{reverseZonesContent.zoneCreation.title}</h2>

        <div class="ref-grid two-col">
          <div class="grid-item">
            <div class="item-title">IPv4 Example ({reverseZonesContent.zoneCreation.ipv4Example.network})</div>
            <div>
              <strong>{$t('pages.reverseZones.labels.zoneName')}:</strong>
              <code>{reverseZonesContent.zoneCreation.ipv4Example.zoneName}</code>
            </div>

            <h4>{$t('pages.reverseZones.labels.zoneFile')}:</h4>
            <pre><code>{reverseZonesContent.zoneCreation.ipv4Example.zoneFile}</code></pre>

            <h4>{$t('pages.reverseZones.labels.explanation')}:</h4>
            <ul>
              {#each reverseZonesContent.zoneCreation.ipv4Example.explanation as point, index (`ipv4-point-${index}`)}
                <li>{point}</li>
              {/each}
            </ul>
          </div>

          <div class="grid-item">
            <div class="item-title">IPv6 Example ({reverseZonesContent.zoneCreation.ipv6Example.network})</div>
            <div>
              <strong>{$t('pages.reverseZones.labels.zoneName')}:</strong>
              <code>{reverseZonesContent.zoneCreation.ipv6Example.zoneName}</code>
            </div>

            <h4>{$t('pages.reverseZones.labels.zoneFile')}:</h4>
            <pre><code>{reverseZonesContent.zoneCreation.ipv6Example.zoneFile}</code></pre>

            <h4>{$t('pages.reverseZones.labels.explanation')}:</h4>
            <ul>
              {#each reverseZonesContent.zoneCreation.ipv6Example.explanation as point, index (`ipv6-point-${index}`)}
                <li>{point}</li>
              {/each}
            </ul>
          </div>
        </div>
      </div>

      <div class="ref-section">
        <h2>{$t('pages.reverseZones.delegationScenarios.title')}</h2>
        {#each reverseZonesContent.delegationScenarios as scenario, index (`${scenario.scenario}-${index}`)}
          <div class="ref-examples">
            <div class="examples-title">{scenario.scenario}</div>
            <div class="example-item">
              <div><strong>{$t('pages.reverseZones.labels.delegation')}:</strong> {scenario.delegation}</div>

              {#if scenario.customerActions}
                <div><strong>{$t('pages.reverseZones.labels.customerActions')}:</strong></div>
                <ul>
                  {#each scenario.customerActions as action, index (`customer-${index}`)}
                    <li>{action}</li>
                  {/each}
                </ul>

                <div><strong>{$t('pages.reverseZones.labels.ispActions')}:</strong></div>
                <ul>
                  {#each scenario.ispActions as action, index (`isp-${index}`)}
                    <li>{action}</li>
                  {/each}
                </ul>
              {:else}
                <div><strong>{$t('pages.reverseZones.labels.process')}:</strong></div>
                <ol>
                  {#each scenario.process as step, index (`process-${index}`)}
                    <li>{step}</li>
                  {/each}
                </ol>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{$t('pages.reverseZones.troubleshooting.title')}</h2>
        {#each reverseZonesContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
          <div class="ref-warning">
            <div class="warning-title">
              <Icon name="help-circle" size="sm" />
              {issue.issue}
            </div>
            <div class="warning-content">
              <p><strong>{$t('pages.reverseZones.labels.possibleCauses')}:</strong> {issue.causes.join(', ')}</p>
              <p><strong>{$t('pages.reverseZones.labels.diagnosis')}:</strong> {issue.diagnosis}</p>
              <p><strong>{$t('pages.reverseZones.labels.solution')}:</strong> {issue.solution}</p>
            </div>
          </div>
        {/each}
      </div>

      <div class="ref-section">
        <h2>{$t('pages.reverseZones.bestPractices.title')}</h2>
        <ul>
          {#each reverseZonesContent.bestPractices as practice, index (`practice-${index}`)}
            <li>{practice}</li>
          {/each}
        </ul>
      </div>

      <div class="ref-section">
        <h2>{$t('pages.reverseZones.quickReference.title')}</h2>

        <div class="ref-grid two-col">
          <div class="grid-item">
            <div class="item-title">{$t('pages.reverseZones.quickReference.zoneFormulasTitle')}</div>
            {#each reverseZonesContent.quickReference.zoneFormulas as formula, index (`formula-${index}`)}
              <div class="item-code">{formula}</div>
            {/each}
          </div>

          <div class="grid-item">
            <div class="item-title">{$t('pages.reverseZones.quickReference.essentialRecordsTitle')}</div>
            {#each reverseZonesContent.quickReference.essentialRecords as record, index (`record-${index}`)}
              <div class="item-description">{record}</div>
            {/each}
          </div>
        </div>

        <div class="ref-highlight">
          <div class="highlight-title">
            <Icon name="key" size="sm" />
            {$t('pages.reverseZones.labels.keyRuleTitle')}
          </div>
          <div class="highlight-content">
            {$t('pages.reverseZones.quickReference.keyRule')}
          </div>
        </div>
      </div>

      <div class="ref-section">
        <h2>{$t('pages.reverseZones.testingTools.title')}</h2>
        <div class="ref-grid two-col">
          {#each reverseZonesContent.tools as tool, index (`${tool.tool}-${index}`)}
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
