<script lang="ts">
  import { cgnatContent } from '$lib/content/cgnat.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages/cgnat');
  });
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{cgnatContent.title}</h1>
      <p class="subtitle">{cgnatContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.sections.overview.title}</h2>
      <p>{cgnatContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.sections.why.title}</h2>
      <p>{cgnatContent.sections.why.content}</p>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.addressRange.title')}</h2>
      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="globe" size="sm" />
          {$t('pages.cgnat.addressRange.sharedSpace')}
        </div>
        <div class="highlight-content">
          <p>
            <strong>{$t('pages.cgnat.addressRange.labels.range')}:</strong>
            <code>{cgnatContent.addressRange.range}</code>
          </p>
          <p>
            <strong>{$t('pages.cgnat.addressRange.labels.fullRange')}:</strong>
            <code>{cgnatContent.addressRange.fullRange}</code>
          </p>
          <p>
            <strong>{$t('pages.cgnat.addressRange.labels.totalAddresses')}:</strong>
            {cgnatContent.addressRange.totalAddresses}
          </p>
          <p><strong>{$t('pages.cgnat.addressRange.labels.rfc')}:</strong> {cgnatContent.addressRange.rfc}</p>
        </div>
      </div>

      <h3>{$t('pages.cgnat.addressRange.breakdown.title')}</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('pages.cgnat.addressRange.breakdown.headers.network')}</th>
            <th>{$t('pages.cgnat.addressRange.breakdown.headers.addresses')}</th>
            <th>{$t('pages.cgnat.addressRange.breakdown.headers.use')}</th>
          </tr>
        </thead>
        <tbody>
          {#each cgnatContent.addressRange.breakdown as block, index (`${block.network}-${index}`)}
            <tr>
              <td><code>{block.network}</code></td>
              <td>{block.addresses}</td>
              <td>{block.use}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.howItWorks.title}</h2>
      <p>{cgnatContent.howItWorks.description}</p>

      <h3>{$t('pages.cgnat.natSystem.title')}</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>{$t('pages.cgnat.natSystem.headers.layer')}</th>
            <th>{$t('pages.cgnat.natSystem.headers.location')}</th>
            <th>{$t('pages.cgnat.natSystem.headers.insideAddress')}</th>
            <th>{$t('pages.cgnat.natSystem.headers.outsideAddress')}</th>
            <th>{$t('pages.cgnat.natSystem.headers.purpose')}</th>
          </tr>
        </thead>
        <tbody>
          {#each cgnatContent.howItWorks.layers as layer, index (`${layer.layer}-${index}`)}
            <tr>
              <td><strong>{layer.layer}</strong></td>
              <td>{layer.location}</td>
              <td><code>{layer.inside}</code></td>
              <td><code>{layer.outside}</code></td>
              <td>{layer.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>{$t('pages.cgnat.trafficFlow.title')}</h3>
      <ol>
        {#each cgnatContent.howItWorks.flow as step, index (`flow-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.identification.title}</h2>
      {#each cgnatContent.identification.methods as method, index (`${method.method}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{method.method}</div>
          <div class="example-item">
            <div><strong>{$t('pages.cgnat.identification.labels.description')}:</strong> {method.description}</div>
            <div>
              <strong>{$t('pages.cgnat.identification.labels.cgnatIndicator')}:</strong>
              <span style="color: var(--color-error)">{method.cgnatIndicator}</span>
            </div>
            <div>
              <strong>{$t('pages.cgnat.identification.labels.normalIndicator')}:</strong>
              <span style="color: var(--color-success)">{method.normalIndicator}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.impacts.title')}</h2>

      <h3>{$t('pages.cgnat.impacts.negative.title')}</h3>
      {#each cgnatContent.impacts.negative as impact, index (`${impact.impact}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="x-circle" size="sm" />
            {impact.impact}
          </div>
          <div class="warning-content">
            <p><strong>{$t('pages.cgnat.impacts.negative.labels.description')}:</strong> {impact.description}</p>
            <p>
              <strong>{$t('pages.cgnat.impacts.negative.labels.affectedServices')}:</strong>
              {impact.affectedServices.join(', ')}
            </p>
            <p><strong>{$t('pages.cgnat.impacts.negative.labels.workaround')}:</strong> {impact.workaround}</p>
          </div>
        </div>
      {/each}

      <h3>{$t('pages.cgnat.impacts.positive.title')}</h3>
      <ul>
        {#each cgnatContent.impacts.positive as positive, index (`positive-${index}`)}
          <li>{positive}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.workarounds.title')}</h2>
      {#each cgnatContent.workarounds as solution, index (`${solution.solution}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{solution.solution}</div>
          <div class="example-item">
            <div><strong>{$t('pages.cgnat.workarounds.labels.description')}:</strong> {solution.description}</div>
            <div><strong>{$t('pages.cgnat.workarounds.labels.effectiveness')}:</strong> {solution.effectiveness}</div>
            <div><strong>{$t('pages.cgnat.workarounds.labels.cost')}:</strong> {solution.cost}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.troubleshooting.title')}</h2>
      {#each cgnatContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>{$t('pages.cgnat.troubleshooting.labels.cause')}:</strong> {issue.cause}</p>
            <p><strong>{$t('pages.cgnat.troubleshooting.labels.diagnosis')}:</strong> {issue.diagnosis}</p>
            <p><strong>{$t('pages.cgnat.troubleshooting.labels.solution')}:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.quickCheck.title')}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{$t('pages.cgnat.quickCheck.stepsTitle')}</div>
          <ol>
            {#each cgnatContent.quickCheck.steps as step, index (`quickcheck-step-${index}`)}
              <li>{step}</li>
            {/each}
          </ol>
        </div>

        <div class="grid-item">
          <div class="item-title">{$t('pages.cgnat.quickCheck.nextStepsTitle')}</div>
          <ul>
            {#each cgnatContent.quickCheck.whatToDo as action, index (`whatToDo-${index}`)}
              <li>{action}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.bestPractices.title')}</h2>
      <ul>
        {#each cgnatContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{$t('pages.cgnat.ispPerspective.title')}</h2>
      <div class="ref-examples">
        <div class="examples-title">{$t('pages.cgnat.ispPerspective.whyTitle')}</div>
        {#each cgnatContent.ispPerspective as reason, index (`isp-reason-${index}`)}
          <div class="example-item">
            <div class="example-description">{reason}</div>
          </div>
        {/each}
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="info" size="sm" />
          {$t('pages.cgnat.ispPerspective.tradeoffTitle')}
        </div>
        <div class="highlight-content">
          {$t('pages.cgnat.ispPerspective.tradeoffDescription')}
        </div>
      </div>
    </div>
  </div>
</div>
