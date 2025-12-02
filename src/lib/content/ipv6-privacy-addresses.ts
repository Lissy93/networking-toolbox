import { get } from 'svelte/store';
import { t, tRaw } from '$lib/stores/language';

export interface OSImplementation {
  os: string;
  defaultBehavior: string;
  configuration: string[];
  commands?: string[];
  values?: string[];
  behavior?: string;
}

export interface OSImplementations {
  title: string;
  windows?: OSImplementation;
  linux?: OSImplementation;
  macos?: OSImplementation;
  android?: OSImplementation;
  [key: string]: OSImplementation | string | undefined;
}

// Type guard function
export function isOSImplementation(value: unknown): value is OSImplementation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'os' in value &&
    'defaultBehavior' in value &&
    'configuration' in value
  );
}

export const getIpv6PrivacyContent = () => {
  const $t = get(t);
  const $tRaw = get(tRaw);

  // Transform osImplementations array into object with OS keys
  const osImplementationsRaw = $tRaw('pages/ipv6-privacy.ipv6Privacy.osImplementations') || {};
  const osImplementations: OSImplementations = (osImplementationsRaw.implementations || []).reduce(
    (acc: OSImplementations, impl: OSImplementation) => {
      if (impl.os) {
        acc[impl.os.toLowerCase()] = impl;
      }
      return acc;
    },
    { title: osImplementationsRaw.title || 'Operating System Support' },
  );

  return {
    title: $t('pages/ipv6-privacy.ipv6Privacy.title'),
    description: $t('pages/ipv6-privacy.ipv6Privacy.description'),

    sections: {
      overview: {
        title: $t('pages/ipv6-privacy.ipv6Privacy.sections.overview.title'),
        content: $t('pages/ipv6-privacy.ipv6Privacy.sections.overview.content'),
      },
      problem: {
        title: $t('pages/ipv6-privacy.ipv6Privacy.sections.problem.title'),
        content: $t('pages/ipv6-privacy.ipv6Privacy.sections.problem.content'),
      },
    },

    addressTypes: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.addressTypes.title'),
      types: $tRaw('pages/ipv6-privacy.ipv6Privacy.addressTypes.types') || [],
    },

    howItWorks: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.howItWorks.title'),
      addressGeneration: $tRaw('pages/ipv6-privacy.ipv6Privacy.howItWorks.addressGeneration') || [],
      temporaryLifecycle: $tRaw('pages/ipv6-privacy.ipv6Privacy.howItWorks.temporaryLifecycle') || [],
      defaultBehavior: $tRaw('pages/ipv6-privacy.ipv6Privacy.howItWorks.defaultBehavior') || [],
    },

    lifetimes: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.lifetimes.title'),
      preferredLifetime:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.lifetimes.preferredLifetime') ||
        ({} as {
          description: string;
          typical: string;
          behavior: string;
        }),
      validLifetime:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.lifetimes.validLifetime') ||
        ({} as {
          description: string;
          typical: string;
          behavior: string;
        }),
      regenerationInterval:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.lifetimes.regenerationInterval') ||
        ({} as {
          description: string;
          typical: string;
          behavior: string;
        }),
      maxTempAddresses:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.lifetimes.maxTempAddresses') ||
        ({} as {
          description: string;
          typical: string;
          behavior: string;
        }),
    },

    osImplementations,

    identifyingAddresses: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.identifyingAddresses.title'),
      methods:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.identifyingAddresses.methods') ||
        ([] as Array<{
          method: string;
          stable: string;
          temporary: string;
          example: string;
        }>),
    },

    troubleshooting: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.troubleshooting.title'),
      issues:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.troubleshooting.issues') ||
        ([] as Array<{
          issue: string;
          symptoms: string[];
          diagnosis: string;
          solutions: string[];
        }>),
    },

    securityConsiderations: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.securityConsiderations.title'),
      aspects:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.securityConsiderations.aspects') ||
        ([] as Array<{
          aspect: string;
          benefits?: string[];
          limitations?: string[];
          challenges?: string[];
        }>),
    },

    bestPractices: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.bestPractices.title'),
      practices: $tRaw('pages/ipv6-privacy.ipv6Privacy.bestPractices.practices') || [],
    },

    whenToUse: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.whenToUse.title'),
      scenarios:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.whenToUse.scenarios') ||
        ([] as Array<{
          scenario: string;
          recommendation: string;
          reasoning: string;
          configuration: string;
        }>),
    },

    commonMistakes: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.commonMistakes.title'),
      mistakes: $tRaw('pages/ipv6-privacy.ipv6Privacy.commonMistakes.mistakes') || [],
    },

    quickReference: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.title'),
      addressTypesTitle: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.addressTypesTitle'),
      identificationTitle: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.identificationTitle'),
      configurationTitle: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.configurationTitle'),
      troubleshootingTitle: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.troubleshootingTitle'),
      keyRuleTitle: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.keyRuleTitle'),
      keyRule: $t('pages/ipv6-privacy.ipv6Privacy.quickReference.keyRule'),
      addressTypes: $tRaw('pages/ipv6-privacy.ipv6Privacy.quickReference.addressTypes') || [],
      identification: $tRaw('pages/ipv6-privacy.ipv6Privacy.quickReference.identification') || [],
      configuration: $tRaw('pages/ipv6-privacy.ipv6Privacy.quickReference.configuration') || [],
      troubleshooting: $tRaw('pages/ipv6-privacy.ipv6Privacy.quickReference.troubleshooting') || [],
    },

    tools: {
      title: $t('pages/ipv6-privacy.ipv6Privacy.testingTools.title'),
      tools:
        $tRaw('pages/ipv6-privacy.ipv6Privacy.testingTools.tools') ||
        ([] as Array<{
          tool: string;
          purpose: string;
        }>),
    },
  };
};
