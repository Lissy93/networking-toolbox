<script lang="ts">
  import { commonPortsContent } from '$lib/content/common-ports.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{commonPortsContent.title}</h1>
      <p class="subtitle">{commonPortsContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>Port Ranges</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Range</th>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each commonPortsContent.ranges as range, index (index)}
            <tr>
              <td><code>{range.range}</code></td>
              <td>{range.name}</td>
              <td>{range.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Well-Known Ports (0-1023)</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Port</th>
            <th>Protocol</th>
            <th>Service</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each commonPortsContent.wellKnown as port (port.port)}
            <tr>
              <td><code>{port.port}</code></td>
              <td>{port.protocol}</td>
              <td><strong>{port.service}</strong></td>
              <td>{port.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Registered Ports (1024-49151)</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Port</th>
            <th>Protocol</th>
            <th>Service</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each commonPortsContent.registered as port (port.port)}
            <tr>
              <td><code>{port.port}</code></td>
              <td>{port.protocol}</td>
              <td><strong>{port.service}</strong></td>
              <td>{port.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Common Service Categories</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Web Services</div>
          {#each commonPortsContent.categories.web as service, index (index)}
            <div class="item-code">{service.ports} - {service.service}</div>
            <div
              class="item-description"
              style="color: {service.secure ? 'var(--color-success)' : 'var(--color-error)'}"
            >
              {service.secure ? 'Secure' : 'Not secure'}
            </div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Email Services</div>
          {#each commonPortsContent.categories.email as service, index (index)}
            <div class="item-code">{service.ports} - {service.service}</div>
            <div
              class="item-description"
              style="color: {service.secure ? 'var(--color-success)' : 'var(--color-error)'}"
            >
              {service.secure ? 'Secure' : 'Not secure'}
            </div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Remote Access</div>
          {#each commonPortsContent.categories.remote as service, index (index)}
            <div class="item-code">{service.ports} - {service.service}</div>
            <div
              class="item-description"
              style="color: {service.secure ? 'var(--color-success)' : 'var(--color-error)'}"
            >
              {service.secure ? 'Secure' : 'Not secure'}
            </div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Database Services</div>
          {#each commonPortsContent.categories.database as service, index (index)}
            <div class="item-code">{service.ports} - {service.service}</div>
            <div
              class="item-description"
              style="color: {service.secure ? 'var(--color-success)' : 'var(--color-error)'}"
            >
              {service.secure ? 'Secure' : 'Not secure'}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Important Security Tips</h2>
      <div class="ref-examples">
        <div class="examples-title">Remember These</div>
        {#each commonPortsContent.tips as tip, index (index)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>

      <div class="ref-warning">
        <div class="warning-title">
          <Icon name="shield" size="sm" />
          Security Note
        </div>
        <div class="warning-content">
          Many services have both secure and insecure versions. Always use the secure versions (HTTPS, SSH, FTPS, etc.)
          when possible, especially over untrusted networks.
        </div>
      </div>
    </div>
  </div>
</div>
