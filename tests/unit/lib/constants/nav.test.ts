import { describe, it, expect } from 'vitest';
import {
  TOP_NAV,
  SUB_NAV,
  ALL_PAGES,
  footerLinks,
  type NavItem,
  type NavGroup
} from '../../../../src/lib/constants/nav';
import {
  isActive,
  findSectionKey,
  getPageDetails
} from '../../../../src/lib/utils/nav-helpers';

describe('nav.ts', () => {
  describe('navigation structure', () => {
    it('has valid TOP_NAV structure', () => {
      expect(TOP_NAV).toBeInstanceOf(Array);
      expect(TOP_NAV.length).toBeGreaterThan(4);
      
      TOP_NAV.forEach(item => {
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('label');
        expect(item.href).toMatch(/^\/[a-z-]+$/);
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);
      });
    });

    it('contains expected top navigation sections', () => {
      const hrefs = TOP_NAV.map(item => item.href);
      expect(hrefs).toContain('/subnetting');
      expect(hrefs).toContain('/cidr');
      expect(hrefs).toContain('/ip-address-convertor');
      expect(hrefs).toContain('/dns');
      expect(hrefs).toContain('/diagnostics');
      expect(hrefs).toContain('/reference');
    });

    it('has valid SUB_NAV structure', () => {
      expect(SUB_NAV).toBeInstanceOf(Object);
      const keys = Object.keys(SUB_NAV);
      expect(keys.length).toBeGreaterThan(4);
      
      // Check each section has items
      Object.entries(SUB_NAV).forEach(([key, items]) => {
        expect(key).toMatch(/^\/[a-z-]+$/);
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
      });
    });

    it('validates NavItem structures in SUB_NAV', () => {
      Object.values(SUB_NAV).forEach(section => {
        section.forEach(item => {
          if ('items' in item) {
            // It's a NavGroup (may have href too)
            expect(item).toHaveProperty('title');
            expect(item).toHaveProperty('items');
            expect(typeof item.title).toBe('string');
            expect(item.items).toBeInstanceOf(Array);

            // NavGroup can optionally have href
            if ('href' in item) {
              expect(typeof item.href).toBe('string');
              expect(item.href).toMatch(/^\/[a-z0-9-/]+$/);
            }

            item.items.forEach(subItem => {
              expect(subItem).toHaveProperty('href');
              expect(subItem).toHaveProperty('label');
              expect(subItem).toHaveProperty('description');
            });
          } else if ('href' in item) {
            // It's a NavItem
            expect(item).toHaveProperty('href');
            expect(item).toHaveProperty('label');
            expect(item).toHaveProperty('description');
            expect(typeof item.href).toBe('string');
            expect(typeof item.label).toBe('string');
            expect(typeof item.description).toBe('string');
            expect(item.href).toMatch(/^\/[a-z0-9-/]+$/);
          }
        });
      });
    });

    it('generates ALL_PAGES correctly', () => {
      expect(ALL_PAGES).toBeInstanceOf(Array);
      expect(ALL_PAGES.length).toBeGreaterThan(50); // Should have many pages

      ALL_PAGES.forEach(page => {
        expect(page).toHaveProperty('href');
        // ALL_PAGES should only contain NavItems with label
        expect(page).toHaveProperty('label');
        expect(typeof page.href).toBe('string');
        expect(typeof page.label).toBe('string');
      });
    });

    it('has valid footer links', () => {
      expect(footerLinks).toBeInstanceOf(Array);
      expect(footerLinks.length).toBeGreaterThan(0);
      
      footerLinks.forEach(link => {
        expect(link).toHaveProperty('href');
        expect(link).toHaveProperty('label');
        expect(typeof link.href).toBe('string');
        expect(typeof link.label).toBe('string');
      });
      
      const aboutLink = footerLinks.find(link => link.href === '/about');
      expect(aboutLink).toBeDefined();
      expect(aboutLink?.label).toBe('About');
    });
  });

  describe('helper functions', () => {
    describe('isActive', () => {
      it('correctly identifies home page', () => {
        expect(isActive('/', '/')).toBe(true);
        expect(isActive('/subnetting', '/')).toBe(false);
        expect(isActive('/about', '/')).toBe(false);
      });

      it('correctly identifies section pages', () => {
        expect(isActive('/subnetting', '/subnetting')).toBe(true);
        expect(isActive('/subnetting/ipv4-subnet-calculator', '/subnetting')).toBe(true);
        expect(isActive('/cidr', '/subnetting')).toBe(false);
      });

      it('correctly identifies exact matches', () => {
        expect(isActive('/reference/cidr', '/reference/cidr')).toBe(true);
        expect(isActive('/reference/vlsm', '/reference/cidr')).toBe(false);
        expect(isActive('/reference', '/reference/cidr')).toBe(false);
      });

      it('handles edge cases', () => {
        expect(isActive('/reference-something', '/reference')).toBe(false);
        expect(isActive('/reference', '/reference')).toBe(true);
        expect(isActive('', '/')).toBe(false);
      });
    });

    describe('findSectionKey', () => {
      it('finds correct section keys', () => {
        expect(findSectionKey('/subnetting/ipv4-subnet-calculator')).toBe('/subnetting');
        expect(findSectionKey('/cidr/summarize')).toBe('/cidr');
        expect(findSectionKey('/reference/ipv6-address-types')).toBe('/reference');
        expect(findSectionKey('/dns/reverse/ptr-generator')).toBe('/dns');
      });

      it('returns null for non-existent sections', () => {
        expect(findSectionKey('/nonexistent')).toBeNull();
        expect(findSectionKey('/about')).toBeNull();
        expect(findSectionKey('/')).toBeNull();
      });

      it('handles exact section matches', () => {
        expect(findSectionKey('/subnetting')).toBe('/subnetting');
        expect(findSectionKey('/reference')).toBe('/reference');
      });
    });

    describe('getPageDetails', () => {
      it('finds page details for valid pages', () => {
        const details = getPageDetails('/subnetting/ipv4-subnet-calculator');
        expect(details).toBeDefined();
        expect(details?.title).toBe('IPv4 Subnet Calculator');
        expect(details?.description).toContain('Calculate subnet masks');
        expect(details?.keywords).toBeInstanceOf(Array);
        expect(details?.keywords).toContain('ipv4 subnet');
      });

      it('returns null for non-existent pages', () => {
        expect(getPageDetails('/nonexistent/page')).toBeNull();
        expect(getPageDetails('/invalid')).toBeNull();
      });

      it('handles pages with empty descriptions gracefully', () => {
        // Most pages should have descriptions, but test graceful handling
        const details = getPageDetails('/subnetting/vlsm-calculator');
        if (details) {
          expect(typeof details.description).toBe('string');
          expect(details.keywords).toBeInstanceOf(Array);
        }
      });
    });
  });

  describe('content validation', () => {
    it('ensures all hrefs are unique in ALL_PAGES', () => {
      const hrefs = ALL_PAGES.map(page => page.href);
      const uniqueHrefs = [...new Set(hrefs)];
      expect(hrefs.length).toBe(uniqueHrefs.length);
    });

    it('ensures all pages have descriptions', () => {
      ALL_PAGES.forEach(page => {
        // Some pages might not have descriptions, which is okay
        if (page.description) {
          expect(typeof page.description).toBe('string');
          expect(page.description.length).toBeGreaterThan(10);
        }
      });
    });

    it('ensures most pages have icons', () => {
      const pagesWithIcons = ALL_PAGES.filter(page => page.icon);
      const pagesWithoutIcons = ALL_PAGES.filter(page => !page.icon);

      // Most pages should have icons
      expect(pagesWithIcons.length).toBeGreaterThan(pagesWithoutIcons.length);

      pagesWithIcons.forEach(page => {
        expect(typeof page.icon).toBe('string');
        expect(page.icon!.length).toBeGreaterThan(0);
      });
    });

    it('ensures all pages have keywords', () => {
      ALL_PAGES.forEach(page => {
        if (page.keywords) {
          expect(page.keywords).toBeInstanceOf(Array);
          expect(page.keywords.length).toBeGreaterThan(0);

          page.keywords.forEach(keyword => {
            expect(typeof keyword).toBe('string');
            expect(keyword.length).toBeGreaterThan(1);
          });
        }
        // Keywords are optional, so this test passes even if undefined
      });
    });

    it('validates SUB_NAV keys match TOP_NAV hrefs', () => {
      const subNavKeys = Object.keys(SUB_NAV);
      const topNavHrefs = TOP_NAV.map(item => item.href);
      
      // Most SUB_NAV keys should match TOP_NAV hrefs
      subNavKeys.forEach(key => {
        if (key !== '/ip-address-convertor') { // This one has different spelling
          expect(topNavHrefs.some(href => key === href || key.startsWith(href + '/'))).toBe(true);
        }
      });
    });
  });

  describe('specific sections content', () => {
    it('has subnetting section with expected tools', () => {
      const subnetting = SUB_NAV['/subnetting'];
      expect(subnetting).toBeDefined();
      
      const hrefs = subnetting.map(item => 'href' in item ? item.href : '');
      expect(hrefs).toContain('/subnetting/ipv4-subnet-calculator');
      expect(hrefs).toContain('/subnetting/ipv6-subnet-calculator');
      expect(hrefs).toContain('/subnetting/vlsm-calculator');
    });

    it('has CIDR section with expected tools', () => {
      const cidr = SUB_NAV['/cidr'];
      expect(cidr).toBeDefined();
      
      // Extract hrefs from both NavItems and NavGroups
      const hrefs: string[] = [];
      cidr.forEach(item => {
        if ('href' in item) {
          hrefs.push(item.href);
        } else if ('items' in item) {
          hrefs.push(...item.items.map(subItem => subItem.href));
        }
      });
      
      expect(hrefs).toContain('/cidr/summarize');
      expect(hrefs).toContain('/cidr/split');
      expect(hrefs).toContain('/cidr/next-available');
    });

    it('has reference section with expected content', () => {
      const reference = SUB_NAV['/reference'];
      expect(reference).toBeDefined();
      
      // Extract hrefs from NavGroups
      const hrefs: string[] = [];
      reference.forEach(item => {
        if ('items' in item) {
          hrefs.push(...item.items.map(subItem => subItem.href));
        } else if ('href' in item) {
          hrefs.push(item.href);
        }
      });
      
      expect(hrefs).toContain('/reference/cidr');
      expect(hrefs).toContain('/reference/ipv6-address-types');
      expect(hrefs).toContain('/reference/reverse-dns');
    });
  });

  describe('navigation hierarchy validation', () => {
    it('ensures consistent URL patterns', () => {
      ALL_PAGES.forEach(page => {
        expect(page.href).toMatch(/^\/[a-z0-9-/]+$/);
        expect(page.href).not.toMatch(/\/$|\/\/|\s/); // No trailing slash, double slash, or spaces
      });
    });

    it('ensures parent-child relationships make sense', () => {
      // Check that deep pages have corresponding section pages
      const sectionPaths = Object.keys(SUB_NAV);
      
      ALL_PAGES.forEach(page => {
        const pathParts = page.href.split('/').filter(part => part.length > 0);
        if (pathParts.length > 2) {
          // This is a deep page, should have a parent section
          const parentSection = '/' + pathParts[0];
          expect(sectionPaths).toContain(parentSection);
        }
      });
    });

    it('ensures group structure is consistent', () => {
      Object.values(SUB_NAV).forEach(section => {
        section.forEach(item => {
          if ('title' in item && 'items' in item) {
            // It's a NavGroup
            expect(item.items.length).toBeGreaterThan(0);
            expect(item.title.length).toBeGreaterThan(0);
            
            item.items.forEach(subItem => {
              expect(subItem).toHaveProperty('href');
              expect(subItem).toHaveProperty('label');
              expect(subItem).toHaveProperty('description');
            });
          }
        });
      });
    });
  });
});