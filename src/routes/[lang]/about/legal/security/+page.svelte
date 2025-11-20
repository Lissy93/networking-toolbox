<script lang="ts">
  import { site } from '$lib/constants/site';
</script>

<svelte:head>
  <title>Security Policy | Networking Toolbox</title>
  <meta name="description" content="Security policy and vulnerability reporting for Networking Toolbox" />
  <meta property="og:title" content="Security Policy | {site.title}" />
  <meta property="og:description" content="Learn how to report security vulnerabilities in Networking Toolbox" />
  <meta property="og:url" content="{site.url}/about/legal/security" />
</svelte:head>

<div class="hero">
  <h2>Security Policy</h2>
  <p class="lead">How we handle security and vulnerability disclosures.</p>
</div>

<section>
  <h3>Reporting Vulnerabilities</h3>
  <p>
    If you discover a security vulnerability, please report it by emailing the maintainer directly on
    <code>security at as93 dot net</code>.
  </p>
</section>

<section>
  <h3>Security Practices</h3>
  <ul>
    <li>All connections are fully encrypted (HTTPS/TLS)</li>
    <li>Your data is encrypted locally or with keys only you control</li>
    <li>We follow the principle of least privilege — only what’s needed has access</li>
    <li>We use strong security headers and proven, modern encryption</li>
    <li>We never trust or expose unvalidated data</li>
    <li>Secrets are securely stored and never committed to code</li>
    <li>All code is open source and regularly reviewed</li>
    <li>Dependencies are audited and kept up to date</li>
    <li>We log safely — no personal or sensitive data is ever recorded</li>
    <li>We respond quickly to any reported security issues</li>
  </ul>
</section>

<section>
  <h3>Supported Versions</h3>
  <p>We support security updates for the latest release only. Self-hosted instances should update regularly.</p>
</section>

<section class="contact">
  <h3>Response Time</h3>
  <p>We aim to acknowledge security reports within 48 hours and provide updates on resolution progress.</p>
</section>
