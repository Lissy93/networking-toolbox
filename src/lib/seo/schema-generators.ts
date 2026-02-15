import { site, author } from '$lib/constants/site';

/**
 * Schema markup generators for SEO optimization
 * All functions return JSON-LD structured data objects
 */

/**
 * Generate WebSite schema for homepage
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    description: site.description,
    url: site.url,
    inLanguage: 'en-US',
    copyrightYear: '2025',
    copyrightHolder: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    creator: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.url}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate SoftwareApplication schema for homepage
 */
export function generateHomepageSoftwareSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    description: site.longDescription,
    url: site.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    softwareVersion: '3.0',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
    featureList: [
      'IPv4 and IPv6 subnet calculator',
      'CIDR notation converter',
      'IP address format conversion',
      'Network diagnostics tools',
      'DNS record generators',
      'DHCP configuration builder',
      'Offline-first PWA',
    ],
  };
}

/**
 * Generate Organization schema for homepage
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.url,
    logo: {
      '@type': 'ImageObject',
      url: `${site.url}/icon.png`,
      width: '1024',
      height: '1024',
    },
    description: site.longDescription,
    founder: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    sameAs: [site.repo, site.mirror, site.docker, author.githubUrl, author.portfolio],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Developer',
      url: site.repo,
    },
  };
}

/**
 * Generate SoftwareApplication schema for individual tool pages
 */
export function generateToolSchema(options: {
  url: string;
  title: string;
  description: string;
  keywords?: string[];
  category?: string;
}) {
  const { url, title, description, keywords = [], category = 'DeveloperApplication' } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    description,
    url,
    applicationCategory: category,
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Modern browser required.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    provider: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
    },
    isAccessibleForFree: true,
    inLanguage: 'en-US',
    keywords: keywords.join(', '),
    applicationSubCategory: 'Network Tool',
  };
}

/**
 * Generate HowTo schema for tools with step-by-step usage
 */
export function generateHowToSchema(options: {
  url: string;
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
  toolName?: string;
}) {
  const { url, name, description, steps, toolName } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url,
    inLanguage: 'en-US',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
    ...(toolName && {
      tool: {
        '@type': 'HowToTool',
        name: toolName,
      },
    }),
    totalTime: 'PT2M',
  };
}

/**
 * Generate WebPage schema for tool pages
 */
export function generateWebPageSchema(options: {
  url: string;
  title: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const { url, title, description, datePublished, dateModified } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
    },
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
    },
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
  };
}

interface PageDetails {
  title: string;
  description: string;
  keywords: string[];
}

/**
 * Smart schema generator for tool pages
 * Automatically generates appropriate schemas based on page type
 */
export function generateToolPageSchemas(pageDetails: PageDetails, currentPath: string): object[] {
  const url = `${site.url}${currentPath}`;
  const schemas: object[] = [];

  // Add SoftwareApplication schema
  schemas.push(
    generateToolSchema({
      url,
      title: pageDetails.title,
      description: pageDetails.description || '',
      keywords: pageDetails.keywords,
    }),
  );

  // Add WebPage schema
  schemas.push(
    generateWebPageSchema({
      url,
      title: pageDetails.title,
      description: pageDetails.description || '',
      dateModified: new Date().toISOString(),
    }),
  );

  // Add HowTo schema for calculator-type tools
  if (
    pageDetails.title.toLowerCase().includes('calculator') ||
    pageDetails.title.toLowerCase().includes('converter') ||
    pageDetails.title.toLowerCase().includes('generator')
  ) {
    schemas.push(
      generateHowToSchema({
        url,
        name: `How to use ${pageDetails.title}`,
        description: `Step-by-step guide for using the ${pageDetails.title} tool`,
        toolName: pageDetails.title,
        steps: [
          {
            name: 'Enter your input',
            text: 'Enter the required information into the input fields',
          },
          {
            name: 'Review the results',
            text: 'The tool automatically calculates and displays the results',
          },
          {
            name: 'Copy or export results',
            text: 'Copy the results to your clipboard or export as needed',
          },
        ],
      }),
    );
  }

  return schemas;
}
