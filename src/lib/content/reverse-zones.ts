import { get } from 'svelte/store';
import { t, tRaw } from '$lib/stores/language';

export const getReverseZonesContent = () => {
  const $t = get(t);
  const $tRaw = get(tRaw);

  return {
    title: $t('pages/reverse-zones.reverseZones.title'),
    description: $t('pages/reverse-zones.reverseZones.description'),

    sections: {
      overview: {
        title: $t('pages/reverse-zones.reverseZones.sections.overview.title'),
        content: $t('pages/reverse-zones.reverseZones.sections.overview.content'),
      },
      delegation: {
        title: $t('pages/reverse-zones.reverseZones.sections.delegation.title'),
        content: $t('pages/reverse-zones.reverseZones.sections.delegation.content'),
      },
    },

    ipv4Zones: {
      title: $t('pages/reverse-zones.reverseZones.ipv4Zones.title'),
      classfullBoundaries:
        $tRaw('pages/reverse-zones.reverseZones.ipv4Zones.classfullBoundaries') ||
        ([] as Array<{
          cidr: string;
          example: string;
          reverseZone: string;
          description: string;
          delegation: string;
        }>),
      classlessDelegation:
        $tRaw('pages/reverse-zones.reverseZones.ipv4Zones.classlessDelegation') ||
        ([] as Array<{
          cidr: string;
          example: string;
          addresses: string;
          problem: string;
          solution: string;
          zones: string[];
        }>),
      practicalExamples:
        $tRaw('pages/reverse-zones.reverseZones.ipv4Zones.practicalExamples') ||
        ([] as Array<{
          scenario: string;
          network: string;
          reverseZone?: string;
          reverseZones?: string[];
          ptrRecords?: string[];
          description?: string;
          delegation: string;
        }>),
    },

    ipv6Zones: {
      title: $t('pages/reverse-zones.reverseZones.ipv6Zones.title'),
      nibbleBoundaries:
        $tRaw('pages/reverse-zones.reverseZones.ipv6Zones.nibbleBoundaries') ||
        ([] as Array<{
          cidr: string;
          example: string;
          reverseZone: string;
          description: string;
          delegation: string;
        }>),
      practicalExamples:
        $tRaw('pages/reverse-zones.reverseZones.ipv6Zones.practicalExamples') ||
        ([] as Array<{
          scenario: string;
          network: string;
          reverseZone: string;
          subZones: string[];
          management: string;
        }>),
    },

    zoneCreation: {
      title: $t('pages/reverse-zones.reverseZones.zoneCreation.title'),
      ipv4Example:
        $tRaw('pages/reverse-zones.reverseZones.zoneCreation.ipv4Example') ||
        ({} as {
          network: string;
          zoneName: string;
          zoneFile: string;
          explanation: string[];
        }),
      ipv6Example:
        $tRaw('pages/reverse-zones.reverseZones.zoneCreation.ipv6Example') ||
        ({} as {
          network: string;
          zoneName: string;
          zoneFile: string;
          explanation: string[];
        }),
    },

    delegationScenarios:
      $tRaw('pages/reverse-zones.reverseZones.delegationScenarios.scenarios') ||
      ([] as Array<{
        scenario: string;
        delegation: string;
        customerActions?: string[];
        ispActions?: string[];
        process?: string[];
      }>),

    bestPractices: $tRaw('pages/reverse-zones.reverseZones.bestPractices.practices') || [],

    troubleshooting:
      $tRaw('pages/reverse-zones.reverseZones.troubleshooting.issues') ||
      ([] as Array<{
        issue: string;
        causes: string[];
        diagnosis: string;
        solution: string;
      }>),

    quickReference: {
      zoneFormulas: $tRaw('pages/reverse-zones.reverseZones.quickReference.zoneFormulas') || [],
      essentialRecords: $tRaw('pages/reverse-zones.reverseZones.quickReference.essentialRecords') || [],
    },

    tools:
      $tRaw('pages/reverse-zones.reverseZones.testingTools.tools') ||
      ([] as Array<{
        tool: string;
        purpose: string;
      }>),
  };
};
