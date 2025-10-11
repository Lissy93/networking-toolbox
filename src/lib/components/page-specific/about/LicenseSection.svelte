<script lang="ts">
  import { site, author, license } from '$lib/constants/site';

  interface Props {
    longMode?: boolean;
  }

  let { longMode = false }: Props = $props();
</script>

<section id="license">
  <h2>License</h2>

  <p class="license-summary">
    <a href={site.url}>{site.title}</a> is licensed under the
    <a href="https://gist.github.com/Lissy93/143d2ee01ccc5c052a17">{license.name} License</a>
    © <a href={author.url}>{author.name}</a>
    {license.date}
  </p>

  {#if longMode}
    <h3>Conditions</h3>
    <ul class="license-tldr">
      <li class="license-tldr-item can">
        <div class="item-head">You Can</div>
        <ul>
          <li>Use commercially</li>
          <li>Modify the code</li>
          <li>Distribute the code</li>
          <li>Sublicense the app</li>
        </ul>
      </li>
      <li class="license-tldr-item cannot">
        <div class="item-head">You Cannot</div>
        <ul>
          <li>Hold the author liable</li>
        </ul>
      </li>
      <li class="license-tldr-item must">
        <div class="item-head">You Must</div>
        <ul>
          <li>Include the original copyright</li>
          <li>Include the below license in full</li>
        </ul>
      </li>
    </ul>
  {/if}

  {#if longMode}
    <h3>Full License</h3>
  {/if}
  <pre class="license-content">
Copyright (c) 2025 Alicia Sykes [aliciasykes.com]

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
</pre>
</section>

<style>
  .license-tldr {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
    list-style: none;
    padding: 0;
    max-width: 38rem;
    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
    .license-tldr-item {
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      .item-head {
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
        background: var(--color-primary);
        color: var(--bg-secondary);
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-md);
        text-align: center;
        font-weight: bold;
      }
      &.can {
        .item-head {
          background: var(--color-success);
        }
        ul li:before {
          content: '✓';
          color: var(--color-success);
        }
      }
      &.cannot {
        .item-head {
          background: var(--color-error);
        }
        ul li:before {
          content: '✕';
          color: var(--color-error);
        }
      }
      &.must {
        .item-head {
          background: var(--color-info);
        }
        ul li:before {
          content: '!';
          color: var(--color-info);
        }
      }

      ul {
        list-style: none;
        margin: 0;
        padding: var(--spacing-sm) 0;
        li {
          padding: 0 var(--spacing-sm);
          &:not(:last-child) {
            border-bottom: 1px solid var(--border-primary);
          }
          &:before {
            margin-right: var(--spacing-sm);
            font-weight: bold;
          }
        }
      }
    }
  }

  .license-content {
    overflow-x: auto;
    width: fit-content;
    max-width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    box-shadow: var(--shadow-sm);
  }
</style>
