<script>
  import '../../../../styles/page-specific/about-page.scss';
</script>

<section id="deploying">
  <h2>Deploying</h2>
  <p>
    As well as our free hosted version, at <a href="https://networkingtoolbox.net">networkingtoolbox.net</a>, we've made
    it as quick and easy as possible for you to deploy your own instance. Either on your own infrastructure, or using
    one of our supported free hosting providers.
  </p>

  <h3>Option #1 - Docker</h3>
  <p>With Docker installed, just run the following command:</p>
  <div class="code">
    <code>docker run -p 8080:3000 lissy93/networking-toolbox</code>
  </div>
  <p>
    You can also checkout our
    <a href="https://github.com/Lissy93/networking-toolbox/blob/main/docker-compose.yml"
      ><code>docker-compose.yml</code></a
    >, using the
    <a href="https://hub.docker.com/r/lissy93/networking-toolbox"><code>lissy93/networking-toolbox</code></a> image from
    DockerHub.
  </p>

  <h3>Option #2 - Free Hosting Provider</h3>
  <p>
    You can quickly and easily deploy your own instance for free, on any other our supported hosting providers! Just
    fork our repository, and then import it into your chosen provider.
  </p>

  <p>Alternatively, just click one of the buttons below!</p>

  <h3>Option #3 - GitHub Pages</h3>
  <ol>
    <li>Fork the repository (you'll need a free GitHub account)</li>
    <li>Go to your new repo's Settings → Pages → Source and select the <code>gh-pages</code> branch</li>
    <li>Then, head to the Actions tab, find the "Deploy to GitHub Pages" workflow, and trigger it</li>
    <li>Visit <code>https://[your-username].github.io/networking-toolbox/</code> to see your deployed app</li>
  </ol>

  <h3>Option #4 - Source</h3>
  <p>
    If you want to make any changes before deploying, or want to host it on any other platform not already covered
    above, then you can easily do so, by compiling the app from source. It's very easy, and we've dot detailed
    <a href="/about/building">Building Instructions</a>, or you can check out the docs in the repo.
  </p>
</section>

<section>
  <h2>Customizing</h2>
  <p>You can customize the branding of your instance, by setting a few environment variables. All are optional.</p>
  <ul>
    <li><code>NTB_SITE_TITLE</code> - Change site name</li>
    <li><code>NTB_SITE_DESCRIPTION</code> - Change site tagline</li>
    <li><code>NTB_SITE_ICON</code> - Set site icon</li>
    <li><code>NTB_HOMEPAGE_LAYOUT</code> - Set homepage layout</li>
    <li><code>NTB_NAVBAR_DISPLAY</code> - Set navbar display option</li>
    <li><code>NTB_DEFAULT_THEME</code> - Set default theme</li>
    <li><code>NTB_DEFAULT_LANGUAGE</code> - Set default language</li>
    <li><code>NTB_ANALYTICS_DOMAIN</code> - Analytics domain (or set to <code>false</code> to disable)</li>
    <li><code>NTB_ANALYTICS_DSN</code> - Analytics script URL (or set to <code>false</code> to disable)</li>
  </ul>

  <p>
    For examples on how to apply these, take a look at
    <a href="https://github.com/Lissy93/networking-toolbox/blob/main/.github/docs/app-customization.md">these docs</a>.
  </p>
</section>

<section>
  <h2>Terms</h2>
  <p>Your only obligations are:</p>
  <ul>
    <li>
      Preserve the MIT license. You can view this on the <a href="/about/legal/license">Licensing Page</a>
    </li>
    <li>
      You can not hold the author liable for any damages, and you understand that the software is provided "as is" with
      no warranties
    </li>
    <li>
      Not use the name "Networking Toolbox" or the logo commercially to build a competing product, without prior
      permission (you can rebrand it though)
    </li>
    <li>Not use the software for anything illegal, harmful, offensive, or otherwise objectionable</li>
  </ul>
  <p>
    Beyond that, you're free to use it however you want, for personal or commercial use. You can rebrand it, or use
    parts of the code in your own projects and edit anything.
  </p>
  <p class="sponsor-section">
    If you've found the project helpful, and want to support us, considering <a
      href="https://github.com/sponsors/Lissy93">sponsoring us</a
    > on GitHub. It always means the world to me, and helps cover ongoing running costs 🩷
  </p>
</section>

<style>
  ol {
    padding-left: 2rem;
  }
  h3 {
    margin-top: var(--spacing-lg);
  }
  .sponsor-section {
    background: color-mix(in srgb, var(--color-pink), transparent 40%);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-pink);
  }
</style>
