/**
 * Language Store
 * Reactive store for managing current language and translations
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { i18n, type TranslationObject, type InterpolationParams } from '$lib/i18n';
import { detectLanguage, setStoredLanguage, buildLocalizedPath } from '$lib/i18n/lang-detector';
import { DEFAULT_LANGUAGE, type Language, SUPPORTED_LANGUAGES, LANGUAGE_CODES } from '$lib/i18n/supported-languages';

// Import English translations synchronously at build time / and pre-loaded server-side
// This is to ensure they're bundled and available immediately (preventing flash of keys)
import enCommon from '$lib/i18n/translations/en/common.json';
import enNav from '$lib/i18n/translations/en/nav.json';
import enSettings from '$lib/i18n/translations/en/settings.json';
import enTools from '$lib/i18n/translations/en/tools.json';
import enToolsIPConverter from '$lib/i18n/translations/en/tools/ip-converter.json';
import enToolsSupernetCalculator from '$lib/i18n/translations/en/tools/supernet-calculator.json';
import enToolsCIDRAllocator from '$lib/i18n/translations/en/tools/cidr-allocator.json';
import enToolsCIDRSplitter from '$lib/i18n/translations/en/tools/cidr-splitter.json';
import enToolsCIDRAlignment from '$lib/i18n/translations/en/tools/cidr-alignment.json';
import enToolsCIDROverlap from '$lib/i18n/translations/en/tools/cidr-overlap.json';
import enToolsCIDRContains from '$lib/i18n/translations/en/tools/cidr-contains.json';
import enToolsCIDRDiff from '$lib/i18n/translations/en/tools/cidr-diff.json';
import enToolsCIDRDeaggregate from '$lib/i18n/translations/en/tools/cidr-deaggregate.json';
import enToolsCIDRCompare from '$lib/i18n/translations/en/tools/cidr-compare.json';
import enToolsCIDRSummarizer from '$lib/i18n/translations/en/tools/cidr-summarizer.json';
import enToolsNAPTRBuilder from '$lib/i18n/translations/en/tools/naptr-builder.json';
import enToolsSPFBuilder from '$lib/i18n/translations/en/tools/spf-builder.json';
import enToolsDMARCBuilder from '$lib/i18n/translations/en/tools/dmarc-builder.json';
import enToolsCAABuilder from '$lib/i18n/translations/en/tools/caa-builder.json';
import enToolsDKIMKeyGenerator from '$lib/i18n/translations/en/tools/dkim-key-generator.json';
import enToolsDNSKEYKeyTag from '$lib/i18n/translations/en/tools/dnskey-key-tag.json';
import enToolsDNSCNAMEBuilder from '$lib/i18n/translations/en/tools/dns-cname-builder.json';
import enToolsDNSAAAABulk from '$lib/i18n/translations/en/tools/dns-aaaa-bulk.json';
import enToolsDNSTXTEscape from '$lib/i18n/translations/en/tools/dns-txt-escape.json';
import enToolsDNSSRVBuilder from '$lib/i18n/translations/en/tools/dns-srv-builder.json';
import enToolsDNSRecordValidator from '$lib/i18n/translations/en/tools/dns-record-validator.json';
import enToolsDNSMXPlanner from '$lib/i18n/translations/en/tools/dns-mx-planner.json';
import enToolsDNSLabelNormalizer from '$lib/i18n/translations/en/tools/dns-label-normalizer.json';
import enToolsDHCPOptions615 from '$lib/i18n/translations/en/tools/dhcp-options-6-15.json';
import enToolsDHCPLeaseTimeCalculator from '$lib/i18n/translations/en/tools/dhcp-lease-time-calculator.json';
import enToolsDHCPDUIDGenerator from '$lib/i18n/translations/en/tools/dhcp-duid-generator.json';
import enToolsDHCPOption150Builder from '$lib/i18n/translations/en/tools/dhcp-option150-builder.json';
import enToolsDHCPOption43Generator from '$lib/i18n/translations/en/tools/dhcp-option43-generator.json';
import enToolsDHCPOption60Builder from '$lib/i18n/translations/en/tools/dhcp-option60-builder.json';
import enToolsDHCPOption121Builder from '$lib/i18n/translations/en/tools/dhcp-option121-builder.json';
import enToolsDHCPOption119Builder from '$lib/i18n/translations/en/tools/dhcp-option119-builder.json';
import enToolsDHCPFingerprinting from '$lib/i18n/translations/en/tools/dhcp-fingerprinting.json';
import enToolsDHCPOption82Builder from '$lib/i18n/translations/en/tools/dhcp-option82-builder.json';
import enToolsDHCPSnippetsGenerator from '$lib/i18n/translations/en/tools/dhcp-snippets-generator.json';
import enToolsDHCPv6DNSBuilder from '$lib/i18n/translations/en/tools/dhcpv6-dns-builder.json';
import enToolsDHCPv6FQDN from '$lib/i18n/translations/en/tools/dhcpv6-fqdn.json';
import enToolsClientIDOption61 from '$lib/i18n/translations/en/tools/clientid-option61.json';
import enToolsGatewayOption3 from '$lib/i18n/translations/en/tools/gateway-option3.json';
import enToolsLeaseTimeOption51 from '$lib/i18n/translations/en/tools/lease-time-option51.json';
import enToolsPXEProfileBuilder from '$lib/i18n/translations/en/tools/pxe-profile-builder.json';
import enToolsFreeformTLVBuilder from '$lib/i18n/translations/en/tools/freeform-tlv-builder.json';
import enToolsIAIDCalculator from '$lib/i18n/translations/en/tools/iaid-calculator.json';
import enToolsPrefixDelegation from '$lib/i18n/translations/en/tools/prefix-delegation.json';
import enToolsWildcardMask from '$lib/i18n/translations/en/tools/wildcard-mask.json';
import enToolsRandomIP from '$lib/i18n/translations/en/tools/random-ip.json';
import enDiagnosticsEmailDmarcCheck from '$lib/i18n/translations/en/diagnostics/email-dmarc-check.json';
import enDiagnosticsDNSSOASerial from '$lib/i18n/translations/en/diagnostics/dns-soa-serial.json';
import enDiagnosticsDNSNSSOACheck from '$lib/i18n/translations/en/diagnostics/dns-ns-soa-check.json';
import enDiagnosticsTLSBanner from '$lib/i18n/translations/en/diagnostics/tls-banner.json';
import enDiagnosticsDNSTrace from '$lib/i18n/translations/en/diagnostics/dns-trace.json';
import enDiagnosticsDNSLookup from '$lib/i18n/translations/en/diagnostics/dns-lookup.json';
import enDiagnosticsDNSPropagation from '$lib/i18n/translations/en/diagnostics/dns-propagation.json';
import enDiagnosticsDNSReverseLookup from '$lib/i18n/translations/en/diagnostics/dns-reverse-lookup.json';
import enDiagnosticsDNSCAAEffective from '$lib/i18n/translations/en/diagnostics/dns-caa-effective.json';

/* Current locale store */
export const locale = writable<string>(DEFAULT_LANGUAGE);

/* Loaded translations store */
export const translations = writable<Record<string, TranslationObject>>({});

/* Available languages */
export const languages = writable<Language[]>(SUPPORTED_LANGUAGES);

/* Track loaded namespaces to avoid re-loading */
const loadedNamespaces = new Set<string>();

/* Initialize English translations immediately / synchronously */
function initializeEnglishTranslations() {
  i18n.addNamespace(DEFAULT_LANGUAGE, 'common', enCommon);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'nav', enNav);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'settings', enSettings);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools', enTools);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/ip-converter', enToolsIPConverter);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/supernet-calculator', enToolsSupernetCalculator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-allocator', enToolsCIDRAllocator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-splitter', enToolsCIDRSplitter);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-alignment', enToolsCIDRAlignment);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-overlap', enToolsCIDROverlap);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-contains', enToolsCIDRContains);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-diff', enToolsCIDRDiff);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-deaggregate', enToolsCIDRDeaggregate);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-compare', enToolsCIDRCompare);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/cidr-summarizer', enToolsCIDRSummarizer);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/naptr-builder', enToolsNAPTRBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/spf-builder', enToolsSPFBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dmarc-builder', enToolsDMARCBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/caa-builder', enToolsCAABuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dkim-key-generator', enToolsDKIMKeyGenerator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dnskey-key-tag', enToolsDNSKEYKeyTag);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-cname-builder', enToolsDNSCNAMEBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-aaaa-bulk', enToolsDNSAAAABulk);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-txt-escape', enToolsDNSTXTEscape);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-srv-builder', enToolsDNSSRVBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-record-validator', enToolsDNSRecordValidator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-mx-planner', enToolsDNSMXPlanner);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dns-label-normalizer', enToolsDNSLabelNormalizer);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-options-6-15', enToolsDHCPOptions615);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-lease-time-calculator', enToolsDHCPLeaseTimeCalculator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-duid-generator', enToolsDHCPDUIDGenerator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option150-builder', enToolsDHCPOption150Builder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option43-generator', enToolsDHCPOption43Generator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option60-builder', enToolsDHCPOption60Builder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option121-builder', enToolsDHCPOption121Builder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option119-builder', enToolsDHCPOption119Builder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-fingerprinting', enToolsDHCPFingerprinting);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-option82-builder', enToolsDHCPOption82Builder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcp-snippets-generator', enToolsDHCPSnippetsGenerator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcpv6-dns-builder', enToolsDHCPv6DNSBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/dhcpv6-fqdn', enToolsDHCPv6FQDN);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/clientid-option61', enToolsClientIDOption61);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/gateway-option3', enToolsGatewayOption3);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/lease-time-option51', enToolsLeaseTimeOption51);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/pxe-profile-builder', enToolsPXEProfileBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/freeform-tlv-builder', enToolsFreeformTLVBuilder);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/iaid-calculator', enToolsIAIDCalculator);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/prefix-delegation', enToolsPrefixDelegation);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/wildcard-mask', enToolsWildcardMask);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'tools/random-ip', enToolsRandomIP);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/email-dmarc-check', enDiagnosticsEmailDmarcCheck);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-soa-serial', enDiagnosticsDNSSOASerial);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-ns-soa-check', enDiagnosticsDNSNSSOACheck);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/tls-banner', enDiagnosticsTLSBanner);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-trace', enDiagnosticsDNSTrace);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-lookup', enDiagnosticsDNSLookup);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-propagation', enDiagnosticsDNSPropagation);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-reverse-lookup', enDiagnosticsDNSReverseLookup);
  i18n.addNamespace(DEFAULT_LANGUAGE, 'diagnostics/dns-caa-effective', enDiagnosticsDNSCAAEffective);

  // Mark as loaded
  loadedNamespaces.add('en:common');
  loadedNamespaces.add('en:nav');
  loadedNamespaces.add('en:settings');
  loadedNamespaces.add('en:tools');
  loadedNamespaces.add('en:tools/ip-converter');
  loadedNamespaces.add('en:tools/supernet-calculator');
  loadedNamespaces.add('en:tools/cidr-allocator');
  loadedNamespaces.add('en:tools/cidr-splitter');
  loadedNamespaces.add('en:tools/cidr-alignment');
  loadedNamespaces.add('en:tools/cidr-overlap');
  loadedNamespaces.add('en:tools/cidr-contains');
  loadedNamespaces.add('en:tools/cidr-diff');
  loadedNamespaces.add('en:tools/cidr-deaggregate');
  loadedNamespaces.add('en:tools/cidr-compare');
  loadedNamespaces.add('en:tools/cidr-summarizer');
  loadedNamespaces.add('en:tools/naptr-builder');
  loadedNamespaces.add('en:tools/spf-builder');
  loadedNamespaces.add('en:tools/dmarc-builder');
  loadedNamespaces.add('en:tools/caa-builder');
  loadedNamespaces.add('en:tools/dkim-key-generator');
  loadedNamespaces.add('en:tools/dnskey-key-tag');
  loadedNamespaces.add('en:tools/dns-cname-builder');
  loadedNamespaces.add('en:tools/dns-aaaa-bulk');
  loadedNamespaces.add('en:tools/dns-txt-escape');
  loadedNamespaces.add('en:tools/dns-srv-builder');
  loadedNamespaces.add('en:tools/dns-record-validator');
  loadedNamespaces.add('en:tools/dns-mx-planner');
  loadedNamespaces.add('en:tools/dns-label-normalizer');
  loadedNamespaces.add('en:tools/dhcp-options-6-15');
  loadedNamespaces.add('en:tools/dhcp-lease-time-calculator');
  loadedNamespaces.add('en:tools/dhcp-duid-generator');
  loadedNamespaces.add('en:tools/dhcp-option150-builder');
  loadedNamespaces.add('en:tools/dhcp-option43-generator');
  loadedNamespaces.add('en:tools/dhcp-option60-builder');
  loadedNamespaces.add('en:tools/dhcp-option121-builder');
  loadedNamespaces.add('en:tools/dhcp-option119-builder');
  loadedNamespaces.add('en:tools/dhcp-fingerprinting');
  loadedNamespaces.add('en:tools/dhcp-option82-builder');
  loadedNamespaces.add('en:tools/dhcp-snippets-generator');
  loadedNamespaces.add('en:tools/dhcpv6-dns-builder');
  loadedNamespaces.add('en:tools/dhcpv6-fqdn');
  loadedNamespaces.add('en:tools/clientid-option61');
  loadedNamespaces.add('en:tools/gateway-option3');
  loadedNamespaces.add('en:tools/lease-time-option51');
  loadedNamespaces.add('en:tools/pxe-profile-builder');
  loadedNamespaces.add('en:tools/freeform-tlv-builder');
  loadedNamespaces.add('en:tools/iaid-calculator');
  loadedNamespaces.add('en:tools/prefix-delegation');
  loadedNamespaces.add('en:tools/wildcard-mask');
  loadedNamespaces.add('en:tools/random-ip');
  loadedNamespaces.add('en:diagnostics/email-dmarc-check');
  loadedNamespaces.add('en:diagnostics/dns-soa-serial');
  loadedNamespaces.add('en:diagnostics/dns-ns-soa-check');
  loadedNamespaces.add('en:diagnostics/tls-banner');
  loadedNamespaces.add('en:diagnostics/dns-trace');
  loadedNamespaces.add('en:diagnostics/dns-lookup');
  loadedNamespaces.add('en:diagnostics/dns-propagation');
  loadedNamespaces.add('en:diagnostics/dns-reverse-lookup');
  loadedNamespaces.add('en:diagnostics/dns-caa-effective');

  // Update store
  translations.set({
    en: {
      common: enCommon,
      nav: enNav,
      settings: enSettings,
      tools: enTools,
      'tools/ip-converter': enToolsIPConverter,
      'tools/supernet-calculator': enToolsSupernetCalculator,
      'tools/cidr-allocator': enToolsCIDRAllocator,
      'tools/cidr-splitter': enToolsCIDRSplitter,
      'tools/cidr-alignment': enToolsCIDRAlignment,
      'tools/cidr-overlap': enToolsCIDROverlap,
      'tools/cidr-contains': enToolsCIDRContains,
      'tools/cidr-diff': enToolsCIDRDiff,
      'tools/cidr-deaggregate': enToolsCIDRDeaggregate,
      'tools/cidr-compare': enToolsCIDRCompare,
      'tools/cidr-summarizer': enToolsCIDRSummarizer,
      'tools/naptr-builder': enToolsNAPTRBuilder,
      'tools/spf-builder': enToolsSPFBuilder,
      'tools/dmarc-builder': enToolsDMARCBuilder,
      'tools/caa-builder': enToolsCAABuilder,
      'tools/dkim-key-generator': enToolsDKIMKeyGenerator,
      'tools/dnskey-key-tag': enToolsDNSKEYKeyTag,
      'tools/dns-cname-builder': enToolsDNSCNAMEBuilder,
      'tools/dns-aaaa-bulk': enToolsDNSAAAABulk,
      'tools/dns-txt-escape': enToolsDNSTXTEscape,
      'tools/dns-srv-builder': enToolsDNSSRVBuilder,
      'tools/dns-record-validator': enToolsDNSRecordValidator,
      'tools/dns-mx-planner': enToolsDNSMXPlanner,
      'tools/dns-label-normalizer': enToolsDNSLabelNormalizer,
      'tools/dhcp-options-6-15': enToolsDHCPOptions615,
      'tools/dhcp-lease-time-calculator': enToolsDHCPLeaseTimeCalculator,
      'tools/dhcp-duid-generator': enToolsDHCPDUIDGenerator,
      'tools/dhcp-option150-builder': enToolsDHCPOption150Builder,
      'tools/dhcp-option43-generator': enToolsDHCPOption43Generator,
      'tools/dhcp-option60-builder': enToolsDHCPOption60Builder,
      'tools/dhcp-option121-builder': enToolsDHCPOption121Builder,
      'tools/dhcp-option119-builder': enToolsDHCPOption119Builder,
      'tools/dhcp-fingerprinting': enToolsDHCPFingerprinting,
      'tools/dhcp-option82-builder': enToolsDHCPOption82Builder,
      'tools/dhcp-snippets-generator': enToolsDHCPSnippetsGenerator,
      'tools/dhcpv6-dns-builder': enToolsDHCPv6DNSBuilder,
      'tools/dhcpv6-fqdn': enToolsDHCPv6FQDN,
      'tools/clientid-option61': enToolsClientIDOption61,
      'tools/gateway-option3': enToolsGatewayOption3,
      'tools/lease-time-option51': enToolsLeaseTimeOption51,
      'tools/pxe-profile-builder': enToolsPXEProfileBuilder,
      'tools/freeform-tlv-builder': enToolsFreeformTLVBuilder,
      'tools/iaid-calculator': enToolsIAIDCalculator,
      'tools/prefix-delegation': enToolsPrefixDelegation,
      'tools/wildcard-mask': enToolsWildcardMask,
      'tools/random-ip': enToolsRandomIP,
      'diagnostics/email-dmarc-check': enDiagnosticsEmailDmarcCheck,
      'diagnostics/dns-soa-serial': enDiagnosticsDNSSOASerial,
      'diagnostics/dns-ns-soa-check': enDiagnosticsDNSNSSOACheck,
      'diagnostics/tls-banner': enDiagnosticsTLSBanner,
      'diagnostics/dns-trace': enDiagnosticsDNSTrace,
      'diagnostics/dns-lookup': enDiagnosticsDNSLookup,
      'diagnostics/dns-propagation': enDiagnosticsDNSPropagation,
      'diagnostics/dns-reverse-lookup': enDiagnosticsDNSReverseLookup,
      'diagnostics/dns-caa-effective': enDiagnosticsDNSCAAEffective,
    },
  });
}

// Initialize English immediately on module load
initializeEnglishTranslations();

/**
 * Initialize language from detection
 */
export function initLanguage(pathname?: string): void {
  const detected = detectLanguage(pathname);

  // Validate and fallback to English if invalid
  const validLang = LANGUAGE_CODES.includes(detected) ? detected : DEFAULT_LANGUAGE;

  locale.set(validLang);
  i18n.setLocale(validLang);

  // Load namespaces for non-English languages
  if (validLang !== DEFAULT_LANGUAGE) {
    loadNamespaces(validLang, ['common', 'nav', 'settings', 'tools']);
  }
}

/**
 * Change language
 */
export function setLanguage(lang: string): void {
  // Validate language code
  if (!LANGUAGE_CODES.includes(lang)) {
    console.warn(`[i18n] Invalid language code: ${lang}, falling back to ${DEFAULT_LANGUAGE}`);
    lang = DEFAULT_LANGUAGE;
  }

  locale.set(lang);
  i18n.setLocale(lang);
  setStoredLanguage(lang);

  // Pre-load common namespaces for the new language
  if (lang !== DEFAULT_LANGUAGE) {
    loadNamespaces(lang, ['common', 'nav', 'settings', 'tools']);
  }
}

/**
 * Load translations for a namespace
 */
export async function loadTranslations(lang: string, namespace: string): Promise<void> {
  const key = `${lang}:${namespace}`;

  // Skip if already loaded
  if (loadedNamespaces.has(key)) {
    return;
  }

  // English is pre-loaded, just mark as loaded
  if (lang === DEFAULT_LANGUAGE) {
    loadedNamespaces.add(key);
    return;
  }

  try {
    // Dynamic import for non-English languages
    const module = await import(`../i18n/translations/${lang}/${namespace}.json`);
    i18n.addNamespace(lang, namespace, module.default || module);

    // Mark as loaded
    loadedNamespaces.add(key);

    // Update translations store for reactivity
    translations.update((current) => ({
      ...current,
      [lang]: {
        ...current[lang],
        [namespace]: module.default || module,
      },
    }));
  } catch (error) {
    console.warn(`[i18n] Failed to load ${lang}/${namespace}, English fallback will be used`, error);

    // Mark English namespace as fallback
    const enKey = `${DEFAULT_LANGUAGE}:${namespace}`;
    if (!loadedNamespaces.has(enKey)) {
      loadedNamespaces.add(enKey);
    }
  }
}

/**
 * Load multiple namespaces at once
 */
export async function loadNamespaces(lang: string, namespaces: string[]): Promise<void> {
  await Promise.all(namespaces.map((ns) => loadTranslations(lang, ns)));
}

/**
 * Reactive translation function
 * Usage in components: $t('key.path', { param: value })
 *
 * ALWAYS falls back to English if translation is missing
 * NEVER shows translation keys to users
 */
export const t = derived([locale, translations], ([_$locale, _$translations]) => {
  return (key: string, params?: InterpolationParams): string => {
    return i18n.t(key, params);
  };
});

/**
 * Get localized path for current language
 */
export function localizedPath(path: string): string {
  const currentLocale = get(locale);
  return buildLocalizedPath(currentLocale, path);
}

/**
 * Navigate to localized path
 * Helper for goto(localizedNavigate('/settings'))
 */
export function localizedNavigate(path: string): string {
  return localizedPath(path);
}

/**
 * Subscribe to locale changes
 */
export function onLocaleChange(callback: (lang: string) => void): () => void {
  return locale.subscribe(callback);
}

// Auto-initialize on client
if (browser) {
  initLanguage(window.location.pathname);
}
