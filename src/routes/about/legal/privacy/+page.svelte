<script lang="ts">
  import { site } from '$lib/constants/site';
</script>

<svelte:head>
  <title>Privacy Policy | Networking Toolbox</title>
  <meta name="description" content="Privacy policy for Networking Toolbox - how we handle your data" />
  <meta property="og:title" content="Privacy Policy | {site.title}" />
  <meta property="og:description" content="Learn about how Networking Toolbox handles your data and privacy" />
  <meta property="og:url" content="{site.url}/about/legal/privacy" />
</svelte:head>

<div class="hero">
  <h2>Privacy Policy</h2>
  <p class="lead">
    Your privacy matters. Actually, that's one of the reasons that I built this (and my other apps). I believe you
    should have total transparency of how an app works (e.g. access to it's code), and full control over your data. So,
    weather you're self-hosting Networking Toolbox, or using the public instance, you can be sure that your data is
    handled with care.
  </p>

  <h3>Principles</h3>
  <ul>
    <li>We only collect the minimum data needed for things to work</li>
    <li>We never store anything which isn't 100% necessary</li>
    <li>Any stored data stays local in your browser or is encrypted with your own key (we can't access it)</li>
    <li>We don't use cookies or tracking of any kind</li>
    <li>We never share your data with anyone else</li>
    <li>We're transparent about what's collected, stored, used and why</li>
    <li>Our code is fully open source, so you can verify our claims for yourself</li>
  </ul>
</div>

<section>
  <h3>Overview</h3>
  <p>
    Networking Toolbox is designed with privacy in mind. All network calculations and most diagnostic tools run entirely
    in your browser, meaning your data never leaves your device.
  </p>
</section>

<section>
  <h3>Data Processing</h3>

  <h4>Client-Side Processing</h4>
  <p>
    The majority of tools (CIDR calculators, IP converters, subnet planners, etc.) perform all calculations locally in
    your browser. No data from these tools is transmitted to any server.
  </p>

  <h4>Server-Side Diagnostic Tools</h4>
  <p>
    Some diagnostic tools (DNS lookups, DNSBL checks, TLS tests, etc.) require server-side processing to query external
    services. For these tools:
  </p>
  <ul>
    <li>Only the specific domain or IP address you enter is sent to our server</li>
    <li>Data is processed in real-time and not stored permanently</li>
    <li>Requests may be temporarily logged for debugging purposes (logs are automatically purged)</li>
    <li>No personally identifiable information is collected</li>
  </ul>
</section>

<section id="local-storage">
  <h3>Local Storage</h3>
  <p>
    We use browser localStorage (not cookies) to save your preferences locally. This data never leaves your device and
    can be cleared at any time through your browser settings.
  </p>
  <ul>
    <li><strong>Theme settings:</strong> Your chosen color theme and accessibility preferences</li>
    <li><strong>Layout preferences:</strong> Homepage and navigation layout choices</li>
    <li><strong>Bookmarked tools:</strong> Your saved favorite tools for quick access</li>
  </ul>
  <p>All localStorage usage is optional and strictly for your convenience. The application works without it.</p>
</section>

<section>
  <h3>Analytics & Tracking</h3>
  <p>
    Unless disabled, we log basic anonymous usage statistics using a self-hosted Plausible Analytics instance. This
    helps us understand which features are most useful and improve the application.
  </p>
  <ul>
    <li><strong>Privacy-focused:</strong> No cookies, no tracking across sites, no personal data collection</li>
    <li>
      <strong>Anonymous only:</strong> We only collect page views and referrer information - no IP addresses, user agents,
      or any personally identifiable information
    </li>
    <li>
      <strong>Self-hosted:</strong> Analytics data stays on our infrastructure and is never shared with third parties
    </li>
    <li><strong>Opt-out:</strong> You can disable analytics by enabling "Do Not Track" in your browser settings</li>
  </ul>
  <p>We do not use any third-party advertising services or tracking scripts that follow you across the web.</p>
</section>

<section>
  <h3>Third-Party Services</h3>
  <p>When using diagnostic tools, your queries may be sent to third-party services:</p>
  <ul>
    <li><strong>DNS queries:</strong> Public DNS resolvers (Google, Cloudflare, Quad9, etc.)</li>
    <li><strong>DNSBL checks:</strong> Spam blacklist providers (Spamhaus, SORBS, etc.)</li>
    <li><strong>WHOIS/RDAP:</strong> Regional Internet registries</li>
    <li><strong>Certificate checks:</strong> Certificate Transparency logs</li>
  </ul>
  <p>These services have their own privacy policies and are outside our control.</p>
</section>

<section>
  <h3>Self-Hosting</h3>
  <p>
    For maximum privacy, you can self-host Networking Toolbox. When self-hosted, you have complete control over all data
    processing and server logs. See the <a href="/about/deploying">Self-Hosting section</a>
    for instructions.
  </p>
</section>

<section>
  <h3>Open Source</h3>
  <p>Networking Toolbox is fully open source. You can review the code to verify our privacy practices:</p>
  <ul>
    <li><a href={site.repo} rel="noopener noreferrer" target="_blank">Source code on GitHub</a></li>
  </ul>
</section>

<section>
  <h3>Changes to This Policy</h3>
  <p>
    This privacy policy may be updated occasionally. Significant changes will be noted in the
    <a href={site.repo + '/blob/main/CHANGELOG.md'} rel="noopener noreferrer" target="_blank">changelog</a>.
  </p>
  <p class="updated">Last updated: January 2025</p>
</section>

<section class="contact">
  <h3>Questions?</h3>
  <p>
    If you have questions about this privacy policy, please open an issue on
    <a href={site.repo + '/issues'} rel="noopener noreferrer" target="_blank">GitHub</a>.
  </p>
</section>
