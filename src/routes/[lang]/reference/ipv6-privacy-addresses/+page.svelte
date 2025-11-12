<script lang="ts">
  import { ipv6PrivacyContent } from '$lib/content/ipv6-privacy-addresses.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/i18n';

  interface OSImplementation {
    os: string;
    defaultBehavior: string;
    configuration: string[];
    commands: string[];
    values?: string[];
    behavior?: string;
  }
</script>

<div class="page-container">
  <div class="ref-page">
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
      <h2>{t('pages.ipv6-privacy.labels.addressTypes')}</h2>
      {#each ipv6PrivacyContent.addressTypes as type, index (`${type.type}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{type.type}</div>
          <div class="example-item">
            <div><strong>{t('pages.ipv6-privacy.labels.formation')}</strong> {type.formation}</div>
            <div><strong>{t('common.labels.example')}</strong> <code>{type.example}</code></div>
            <div><strong>{t('pages.ipv6-privacy.labels.privacyLevel')}</strong> {type.privacy}</div>

            <h4>{t('pages.ipv6-privacy.labels.characteristics')}</h4>
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

      <h3>{t('pages.ipv6-privacy.labels.addressGenerationProcess')}</h3>
      <ol>
        {#each ipv6PrivacyContent.howItWorks.addressGeneration as step, index (`gen-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{t('pages.ipv6-privacy.labels.temporaryAddressLifecycle')}</h3>
      <ol>
        {#each ipv6PrivacyContent.howItWorks.temporaryLifecycle as step, index (`lifecycle-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>{t('pages.ipv6-privacy.labels.defaultOperatingSystemBehavior')}</h3>
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
          <div class="item-title">{t('pages.ipv6-privacy.labels.preferredLifetime')}</div>
          <div class="item-description">{ipv6PrivacyContent.lifetimes.preferredLifetime.description}</div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.typical')}</strong>
            {ipv6PrivacyContent.lifetimes.preferredLifetime.typical}
          </div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.behavior')}</strong>
            {ipv6PrivacyContent.lifetimes.preferredLifetime.behavior}
          </div>
        </div>

        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.validLifetime')}</div>
          <div class="item-description">{ipv6PrivacyContent.lifetimes.validLifetime.description}</div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.typical')}</strong>
            {ipv6PrivacyContent.lifetimes.validLifetime.typical}
          </div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.behavior')}</strong>
            {ipv6PrivacyContent.lifetimes.validLifetime.behavior}
          </div>
        </div>

        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.regenerationInterval')}</div>
          <div class="item-description">{ipv6PrivacyContent.lifetimes.regenerationInterval.description}</div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.typical')}</strong>
            {ipv6PrivacyContent.lifetimes.regenerationInterval.typical}
          </div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.behavior')}</strong>
            {ipv6PrivacyContent.lifetimes.regenerationInterval.behavior}
          </div>
        </div>

        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.maxTemporaryAddresses')}</div>
          <div class="item-description">{ipv6PrivacyContent.lifetimes.maxTempAddresses.description}</div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.typical')}</strong>
            {ipv6PrivacyContent.lifetimes.maxTempAddresses.typical}
          </div>
          <div>
            <strong>{t('pages.ipv6-privacy.labels.behavior')}</strong>
            {ipv6PrivacyContent.lifetimes.maxTempAddresses.behavior}
          </div>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{ipv6PrivacyContent.osImplementations.title}</h2>

      {#each Object.entries(ipv6PrivacyContent.osImplementations) as [key, os] (key)}
        {#if typeof os === 'object' && os.os}
          <div class="ref-examples">
            <div class="examples-title">{os.os}</div>
            <div class="example-item">
              <div><strong>{t('pages.ipv6-privacy.labels.defaultBehavior')}</strong> {os.defaultBehavior}</div>

              <h4>{t('common.labels.configuration')}</h4>
              {#each os.configuration as config, index (`config-${index}`)}
                <code class="example-input">{config}</code>
              {/each}

              {#if (os as OSImplementation).values}
                <h4>{t('pages.ipv6-privacy.labels.values')}</h4>
                <ul>
                  {#each (os as OSImplementation).values! as value, index (`value-${index}`)}
                    <li><code>{value}</code></li>
                  {/each}
                </ul>
              {/if}

              <h4>{t('pages.ipv6-privacy.labels.usefulCommands')}</h4>
              {#each (os as OSImplementation).commands as command, index (`command-${index}`)}
                <code class="example-input">{command}</code>
              {/each}

              {#if (os as OSImplementation).behavior}
                <div>
                  <strong>{t('pages.ipv6-privacy.labels.behavior')}</strong>
                  {(os as OSImplementation).behavior}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <div class="ref-section">
      <h2>{t('pages.ipv6-privacy.labels.identifyingAddressTypes')}</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>{t('pages.ipv6-privacy.labels.method')}</th>
            <th>{t('pages.ipv6-privacy.labels.stableAddress')}</th>
            <th>{t('pages.ipv6-privacy.labels.temporaryAddress')}</th>
            <th>{t('common.labels.example')}</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6PrivacyContent.identifyingAddresses as method, index (`method-${index}`)}
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
      <h2>{t('common.sections.troubleshooting')}</h2>
      {#each ipv6PrivacyContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>{t('pages.ipv6-privacy.labels.symptoms')}</strong> {issue.symptoms.join(', ')}</p>
            <p><strong>{t('pages.ipv6-privacy.labels.diagnosis')}</strong> {issue.diagnosis}</p>
            <div><strong>{t('pages.ipv6-privacy.labels.solutions')}</strong></div>
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
      <h2>{t('pages.ipv6-privacy.labels.securityConsiderations')}</h2>
      {#each ipv6PrivacyContent.securityConsiderations as security, index (`${security.aspect}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{security.aspect}</div>
          <div class="example-item">
            <h4>{t('pages.ipv6-privacy.labels.benefits')}</h4>
            <ul>
              {#each security.benefits as benefit, index (`benefit-${index}`)}
                <li>{benefit}</li>
              {/each}
            </ul>

            <h4>
              {security.limitations
                ? t('pages.ipv6-privacy.labels.limitations')
                : t('pages.ipv6-privacy.labels.challenges')}:
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
      <h2>{t('pages.ipv6-privacy.labels.whenToUsePrivacyAddresses')}</h2>
      {#each ipv6PrivacyContent.whenToUse as scenario, index (`${scenario.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{scenario.scenario}</div>
          <div class="example-item">
            <div><strong>{t('pages.ipv6-privacy.labels.recommendation')}</strong> {scenario.recommendation}</div>
            <div><strong>{t('pages.ipv6-privacy.labels.reasoning')}</strong> {scenario.reasoning}</div>
            <div><strong>{t('common.labels.configuration')}</strong> {scenario.configuration}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{t('pages.ipv6-privacy.labels.bestPractices')}</h2>
      <ul>
        {#each ipv6PrivacyContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{t('pages.ipv6-privacy.labels.commonMistakes')}</h2>
      <ul>
        {#each ipv6PrivacyContent.commonMistakes as mistake, index (`mistake-${index}`)}
          <li>{mistake}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>{t('pages.ipv6-privacy.labels.quickReference')}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.addressTypesSection')}</div>
          {#each ipv6PrivacyContent.quickReference.addressTypes as type, index (`qr-type-${index}`)}
            <div class="item-description">{type}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.identification')}</div>
          {#each ipv6PrivacyContent.quickReference.identification as tip, index (`qr-id-${index}`)}
            <div class="item-description">{tip}</div>
          {/each}
        </div>
      </div>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.configurationSection')}</div>
          {#each ipv6PrivacyContent.quickReference.configuration as config, index (`qr-config-${index}`)}
            <div class="item-code">{config}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{t('pages.ipv6-privacy.labels.troubleshootingSection')}</div>
          {#each ipv6PrivacyContent.quickReference.troubleshooting as tip, index (`qr-trouble-${index}`)}
            <div class="item-description">{tip}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          {t('pages.ipv6-privacy.labels.keyPoint')}
        </div>
        <div class="highlight-content">
          {t('pages.ipv6-privacy.content.keyPointDescription')}
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{t('pages.ipv6-privacy.labels.usefulTools')}</h2>
      <div class="ref-grid two-col">
        {#each ipv6PrivacyContent.tools as tool, index (`${tool.tool}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{tool.tool}</div>
            <div class="item-description">{tool.purpose}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
