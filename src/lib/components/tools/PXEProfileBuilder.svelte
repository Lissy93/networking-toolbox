<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';
  import {
    type PXEProfile,
    type PXEResult,
    generatePXEProfile,
    getDefaultPXEProfile,
    validatePXEProfile,
    validateNetworkSettings,
    PXE_PRESETS,
  } from '$lib/utils/dhcp-pxe-profile';

  let profile = $state<PXEProfile>({
    ...getDefaultPXEProfile(),
    network: {
      subnet: '',
      netmask: '',
      rangeStart: '',
      rangeEnd: '',
      gateway: '',
      dns: '',
    },
  });
  let result = $state<PXEResult | null>(null);
  let validationErrors = $state<string[]>([]);
  let networkValidationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface PresetExample {
    label: string;
    profile: PXEProfile;
    description: string;
  }

  const presetExamples: PresetExample[] = PXE_PRESETS.map((preset) => ({
    label: preset.name,
    profile: preset,
    description: `${preset.architecture === 'auto' ? 'Auto-detect UEFI/BIOS' : preset.architecture.toUpperCase()} - ${preset.tftpServer}`,
  }));

  const architectureOptions = $derived([
    { value: 'auto', label: $t('tools/pxe-profile-builder.profile.architecture.options.auto') },
    { value: 'bios', label: $t('tools/pxe-profile-builder.profile.architecture.options.bios') },
    { value: 'uefi-x64', label: $t('tools/pxe-profile-builder.profile.architecture.options.uefiX64') },
    { value: 'uefi-x86', label: $t('tools/pxe-profile-builder.profile.architecture.options.uefiX86') },
    { value: 'uefi-arm64', label: $t('tools/pxe-profile-builder.profile.architecture.options.uefiArm64') },
    { value: 'uefi-arm32', label: $t('tools/pxe-profile-builder.profile.architecture.options.uefiArm32') },
  ]);

  function validateAndGenerate(currentProfile: PXEProfile): void {
    validationErrors = validatePXEProfile(currentProfile);
    networkValidationErrors = validateNetworkSettings(currentProfile.network);

    if (validationErrors.length === 0 && networkValidationErrors.length === 0) {
      try {
        result = generatePXEProfile(currentProfile);
      } catch (e) {
        validationErrors = [e instanceof Error ? e.message : String(e)];
        result = null;
      }
    } else {
      result = null;
    }
  }

  function loadPresetExample(example: PresetExample, index: number): void {
    profile = {
      ...example.profile,
      network: profile.network,
    };
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = presetExamples[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const matches =
      profile.name === example.profile.name &&
      profile.architecture === example.profile.architecture &&
      profile.tftpServer === example.profile.tftpServer &&
      profile.biosBootfile === example.profile.biosBootfile &&
      profile.uefiX64Bootfile === example.profile.uefiX64Bootfile &&
      profile.uefiX86Bootfile === example.profile.uefiX86Bootfile &&
      profile.uefiArm64Bootfile === example.profile.uefiArm64Bootfile &&
      profile.uefiArm32Bootfile === example.profile.uefiArm32Bootfile;

    if (!matches) {
      selectedExampleIndex = null;
    }
  }

  $effect(() => {
    const currentProfile = {
      ...profile,
      network: profile.network ? { ...profile.network } : undefined,
    };

    untrack(() => {
      validateAndGenerate(currentProfile);
      checkIfExampleStillMatches();
    });
  });
</script>

<ToolContentContainer
  title={$t('tools/pxe-profile-builder.title')}
  description={$t('tools/pxe-profile-builder.subtitle')}
>
  <ExamplesCard
    examples={presetExamples}
    onSelect={loadPresetExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
    selectedIndex={selectedExampleIndex}
  />

  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('tools/pxe-profile-builder.profile.title')}</h3>
    </div>
    <div class="card-content">
      <div class="input-group">
        <label for="profile-name">
          <Icon name="tag" size="sm" />
          {$t('tools/pxe-profile-builder.profile.name.label')}
          <span class="required">{$t('tools/pxe-profile-builder.common.required')}</span>
        </label>
        <input
          id="profile-name"
          type="text"
          bind:value={profile.name}
          placeholder={$t('tools/pxe-profile-builder.profile.name.placeholder')}
        />
      </div>

      <div class="input-group">
        <label for="tftp-server">
          <Icon name="server" size="sm" />
          {$t('tools/pxe-profile-builder.profile.tftpServer.label')}
          <span class="required">{$t('tools/pxe-profile-builder.common.required')}</span>
        </label>
        <input
          id="tftp-server"
          type="text"
          bind:value={profile.tftpServer}
          placeholder={$t('tools/pxe-profile-builder.profile.tftpServer.placeholder')}
        />
        <span class="help-text">{$t('tools/pxe-profile-builder.profile.tftpServer.hint')}</span>
      </div>

      <div class="input-group">
        <label for="architecture">
          <Icon name="cpu" size="sm" />
          {$t('tools/pxe-profile-builder.profile.architecture.label')}
        </label>
        <select id="architecture" bind:value={profile.architecture}>
          {#each architectureOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <span class="help-text">
          {$t('tools/pxe-profile-builder.profile.architecture.hint')}
        </span>
      </div>
    </div>
  </div>

  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('tools/pxe-profile-builder.bootfiles.title')}</h3>
      <p class="help-text">
        {$t('tools/pxe-profile-builder.bootfiles.hint')}
      </p>
    </div>
    <div class="card-content">
      {#if profile.architecture === 'bios' || profile.architecture === 'auto'}
        <div class="input-group">
          <label for="bios-bootfile">
            <Icon name="hard-drive" size="sm" />
            {$t('tools/pxe-profile-builder.bootfiles.bios.label')}
            {#if profile.architecture === 'bios' || profile.architecture === 'auto'}
              <span class="recommended">{$t('tools/pxe-profile-builder.common.recommended')}</span>
            {/if}
          </label>
          <input
            id="bios-bootfile"
            type="text"
            bind:value={profile.biosBootfile}
            placeholder={$t('tools/pxe-profile-builder.bootfiles.bios.placeholder')}
          />
          <span class="help-text">{$t('tools/pxe-profile-builder.bootfiles.bios.hint')}</span>
        </div>
      {/if}

      {#if profile.architecture === 'uefi-x64' || profile.architecture === 'auto'}
        <div class="input-group">
          <label for="uefi-x64-bootfile">
            <Icon name="hard-drive" size="sm" />
            {$t('tools/pxe-profile-builder.bootfiles.uefiX64.label')}
            {#if profile.architecture === 'uefi-x64' || profile.architecture === 'auto'}
              <span class="recommended">{$t('tools/pxe-profile-builder.common.recommended')}</span>
            {/if}
          </label>
          <input
            id="uefi-x64-bootfile"
            type="text"
            bind:value={profile.uefiX64Bootfile}
            placeholder={$t('tools/pxe-profile-builder.bootfiles.uefiX64.placeholder')}
          />
          <span class="help-text">{$t('tools/pxe-profile-builder.bootfiles.uefiX64.hint')}</span>
        </div>
      {/if}

      {#if profile.architecture === 'uefi-x86' || profile.architecture === 'auto'}
        <div class="input-group">
          <label for="uefi-x86-bootfile">
            <Icon name="hard-drive" size="sm" />
            {$t('tools/pxe-profile-builder.bootfiles.uefiX86.label')}
          </label>
          <input
            id="uefi-x86-bootfile"
            type="text"
            bind:value={profile.uefiX86Bootfile}
            placeholder={$t('tools/pxe-profile-builder.bootfiles.uefiX86.placeholder')}
          />
          <span class="help-text">{$t('tools/pxe-profile-builder.bootfiles.uefiX86.hint')}</span>
        </div>
      {/if}

      {#if profile.architecture === 'uefi-arm64' || profile.architecture === 'auto'}
        <div class="input-group">
          <label for="uefi-arm64-bootfile">
            <Icon name="hard-drive" size="sm" />
            {$t('tools/pxe-profile-builder.bootfiles.uefiArm64.label')}
          </label>
          <input
            id="uefi-arm64-bootfile"
            type="text"
            bind:value={profile.uefiArm64Bootfile}
            placeholder={$t('tools/pxe-profile-builder.bootfiles.uefiArm64.placeholder')}
          />
          <span class="help-text">{$t('tools/pxe-profile-builder.bootfiles.uefiArm64.hint')}</span>
        </div>
      {/if}

      {#if profile.architecture === 'uefi-arm32' || profile.architecture === 'auto'}
        <div class="input-group">
          <label for="uefi-arm32-bootfile">
            <Icon name="hard-drive" size="sm" />
            {$t('tools/pxe-profile-builder.bootfiles.uefiArm32.label')}
          </label>
          <input
            id="uefi-arm32-bootfile"
            type="text"
            bind:value={profile.uefiArm32Bootfile}
            placeholder={$t('tools/pxe-profile-builder.bootfiles.uefiArm32.placeholder')}
          />
          <span class="help-text">{$t('tools/pxe-profile-builder.bootfiles.uefiArm32.hint')}</span>
        </div>
      {/if}
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>{$t('tools/pxe-profile-builder.errors.validation')}</h3>
      {#each validationErrors as error, i (i)}
        <div class="error-message">
          <Icon name="alert-triangle" size="sm" />
          {error}
        </div>
      {/each}
    </div>
  {/if}

  {#if result}
    <hr />

    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/pxe-profile-builder.network.title')}</h3>
        <p class="help-text">{$t('tools/pxe-profile-builder.network.hint')}</p>
      </div>
      <div class="card-content">
        <div class="input-row">
          <div class="input-group">
            <label for="subnet">
              <Icon name="network" size="sm" />
              {$t('tools/pxe-profile-builder.network.subnet.label')}
            </label>
            <input
              id="subnet"
              type="text"
              bind:value={profile.network!.subnet}
              placeholder={$t('tools/pxe-profile-builder.network.subnet.placeholder')}
            />
          </div>

          <div class="input-group">
            <label for="netmask">
              <Icon name="network" size="sm" />
              {$t('tools/pxe-profile-builder.network.netmask.label')}
            </label>
            <input
              id="netmask"
              type="text"
              bind:value={profile.network!.netmask}
              placeholder={$t('tools/pxe-profile-builder.network.netmask.placeholder')}
            />
          </div>
        </div>

        <div class="input-row">
          <div class="input-group">
            <label for="range-start">
              <Icon name="arrow-right" size="sm" />
              {$t('tools/pxe-profile-builder.network.rangeStart.label')}
            </label>
            <input
              id="range-start"
              type="text"
              bind:value={profile.network!.rangeStart}
              placeholder={$t('tools/pxe-profile-builder.network.rangeStart.placeholder')}
            />
          </div>

          <div class="input-group">
            <label for="range-end">
              <Icon name="arrow-right" size="sm" />
              {$t('tools/pxe-profile-builder.network.rangeEnd.label')}
            </label>
            <input
              id="range-end"
              type="text"
              bind:value={profile.network!.rangeEnd}
              placeholder={$t('tools/pxe-profile-builder.network.rangeEnd.placeholder')}
            />
          </div>
        </div>

        <div class="input-row">
          <div class="input-group">
            <label for="gateway">
              <Icon name="arrow-right" size="sm" />
              {$t('tools/pxe-profile-builder.network.gateway.label')}
            </label>
            <input
              id="gateway"
              type="text"
              bind:value={profile.network!.gateway}
              placeholder={$t('tools/pxe-profile-builder.network.gateway.placeholder')}
            />
          </div>

          <div class="input-group">
            <label for="dns">
              <Icon name="globe" size="sm" />
              {$t('tools/pxe-profile-builder.network.dns.label')}
            </label>
            <input
              id="dns"
              type="text"
              bind:value={profile.network!.dns}
              placeholder={$t('tools/pxe-profile-builder.network.dns.placeholder')}
            />
          </div>
        </div>
      </div>

      {#if networkValidationErrors.length > 0}
        <div class="network-errors">
          <h4>{$t('tools/pxe-profile-builder.errors.network')}</h4>
          {#each networkValidationErrors as error, i (i)}
            <div class="network-error-item">
              <Icon name="alert-triangle" size="sm" />
              {error}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if result && networkValidationErrors.length === 0}
    <div class="card results">
      <h3>{$t('tools/pxe-profile-builder.results.summary.title')}</h3>
      <div class="summary-card">
        <div><strong>{$t('tools/pxe-profile-builder.results.summary.profileName')}</strong> {result.profile.name}</div>
        <div>
          <strong>{$t('tools/pxe-profile-builder.results.summary.architecture')}</strong>
          {result.profile.architecture}
        </div>
        <div>
          <strong>{$t('tools/pxe-profile-builder.results.summary.tftpServer')}</strong>
          {result.profile.tftpServer}
        </div>
        {#if result.profile.biosBootfile}
          <div>
            <strong>{$t('tools/pxe-profile-builder.results.summary.biosBootfile')}</strong>
            {result.profile.biosBootfile}
          </div>
        {/if}
        {#if result.profile.uefiX64Bootfile}
          <div>
            <strong>{$t('tools/pxe-profile-builder.results.summary.uefiX64Bootfile')}</strong>
            {result.profile.uefiX64Bootfile}
          </div>
        {/if}
        {#if result.profile.uefiX86Bootfile}
          <div>
            <strong>{$t('tools/pxe-profile-builder.results.summary.uefiX86Bootfile')}</strong>
            {result.profile.uefiX86Bootfile}
          </div>
        {/if}
        {#if result.profile.uefiArm64Bootfile}
          <div>
            <strong>{$t('tools/pxe-profile-builder.results.summary.uefiArm64Bootfile')}</strong>
            {result.profile.uefiArm64Bootfile}
          </div>
        {/if}
        {#if result.profile.uefiArm32Bootfile}
          <div>
            <strong>{$t('tools/pxe-profile-builder.results.summary.uefiArm32Bootfile')}</strong>
            {result.profile.uefiArm32Bootfile}
          </div>
        {/if}
      </div>
    </div>

    <div class="card results">
      <h3>{$t('tools/pxe-profile-builder.results.config.title')}</h3>

      {#if result.examples.iscDhcpd}
        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/pxe-profile-builder.results.config.iscDhcpd')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('isc')}
              onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
            >
              <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('isc')
                ? $t('tools/pxe-profile-builder.common.copied')
                : $t('tools/pxe-profile-builder.common.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
        </div>
      {/if}

      {#if result.examples.keaDhcp4}
        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/pxe-profile-builder.results.config.keaDhcp4')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea')
                ? $t('tools/pxe-profile-builder.common.copied')
                : $t('tools/pxe-profile-builder.common.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
        </div>
      {/if}
    </div>

    <div class="card results">
      <h3>{$t('tools/pxe-profile-builder.results.archDetection.title')}</h3>
      <p>
        {$t('tools/pxe-profile-builder.results.archDetection.intro')}
      </p>
      <ul>
        <li><strong>0x0000</strong> - {$t('tools/pxe-profile-builder.results.archDetection.types.bios')}</li>
        <li><strong>0x0006</strong> - {$t('tools/pxe-profile-builder.results.archDetection.types.efiIa32')}</li>
        <li><strong>0x0007</strong> - {$t('tools/pxe-profile-builder.results.archDetection.types.efiBC')}</li>
        <li><strong>0x000a</strong> - {$t('tools/pxe-profile-builder.results.archDetection.types.efiArm32')}</li>
        <li><strong>0x000b</strong> - {$t('tools/pxe-profile-builder.results.archDetection.types.efiArm64')}</li>
      </ul>
      <p>
        {$t('tools/pxe-profile-builder.results.archDetection.autoDetectInfo')}
      </p>
    </div>
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-lg);

    &.input-card {
      background: var(--bg-tertiary);
      .card-header {
        margin-bottom: var(--spacing-sm);
      }
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-sm);
      font-size: 1.25rem;
      color: var(--text-primary);
    }
  }

  .card-header {
    .help-text {
      margin: var(--spacing-xs) 0 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    input,
    select {
      padding: var(--spacing-sm);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9375rem;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
      }
    }

    select {
      cursor: pointer;
    }
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .required {
    color: var(--color-error);
  }

  .recommended {
    color: var(--color-success);
    font-weight: var(--font-weight-normal);
    font-size: 0.75rem;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .results {
    background: var(--bg-tertiary);
    animation: slideIn 0.3s ease-out;

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: var(--spacing-sm) 0;
    }

    ul {
      margin: var(--spacing-md) 0;
      padding-left: var(--spacing-xl);
      color: var(--text-secondary);
      line-height: 1.8;

      li {
        margin: var(--spacing-xs) 0;

        strong {
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
      }
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &.copied {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }

  .output-value {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-primary);
    overflow-x: auto;
  }

  .code-block {
    white-space: pre;
    word-break: normal;
  }

  .summary-card {
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    font-size: 0.9375rem;

    div {
      strong {
        color: var(--text-primary);
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }

  .network-errors {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);

    h4 {
      margin: 0 0 var(--spacing-sm);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-error);
    }
  }

  .network-error-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) 0;
    color: var(--color-error);
    font-size: 0.875rem;
  }
</style>
