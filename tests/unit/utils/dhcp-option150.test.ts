import { describe, it, expect } from 'vitest';
import {
	buildTFTPOptions,
	parseOption150,
	parseOption66,
	parseOption67,
	getDefaultTFTPConfig,
	TFTP_EXAMPLES,
	type TFTPConfig,
} from '../../../src/lib/utils/dhcp-option150';

describe('dhcp-option150.ts', () => {
	describe('buildTFTPOptions', () => {
		describe('Option 150 encoding', () => {
			it('encodes single TFTP server', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
				};

				const result = buildTFTPOptions(config);

				expect(result.option150).toBeDefined();
				expect(result.option150!.hexEncoded).toBe('c0a8010a');
				expect(result.option150!.servers).toEqual(['192.168.1.10']);
				expect(result.option150!.totalLength).toBe(4);
			});

			it('encodes multiple TFTP servers', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11'],
				};

				const result = buildTFTPOptions(config);

				expect(result.option150).toBeDefined();
				expect(result.option150!.hexEncoded).toBe('c0a8010ac0a8010b');
				expect(result.option150!.servers.length).toBe(2);
				expect(result.option150!.totalLength).toBe(8);
			});

			it('provides wire format with spaces', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
				};

				const result = buildTFTPOptions(config);

				expect(result.option150!.wireFormat).toBe('c0 a8 01 0a');
			});
		});

		describe('Option 66 encoding', () => {
			it('encodes hostname as Option 66', () => {
				const config: TFTPConfig = {
					option66Server: 'pxe.example.com',
				};

				const result = buildTFTPOptions(config);

				expect(result.option66).toBeDefined();
				expect(result.option66!.value).toBe('pxe.example.com');
				expect(result.option66!.hexEncoded).toBe('7078652e6578616d706c652e636f6d');
				expect(result.option66!.totalLength).toBe(15);
			});

			it('encodes IP address as Option 66', () => {
				const config: TFTPConfig = {
					option66Server: '192.168.1.10',
				};

				const result = buildTFTPOptions(config);

				expect(result.option66).toBeDefined();
				expect(result.option66!.value).toBe('192.168.1.10');
			});
		});

		describe('Option 67 encoding', () => {
			it('encodes bootfile name as Option 67', () => {
				const config: TFTPConfig = {
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);

				expect(result.option67).toBeDefined();
				expect(result.option67!.value).toBe('pxelinux.0');
				expect(result.option67!.hexEncoded).toBe('7078656c696e75782e30');
			});

			it('encodes UEFI bootfile', () => {
				const config: TFTPConfig = {
					option67Bootfile: 'bootx64.efi',
				};

				const result = buildTFTPOptions(config);

				expect(result.option67).toBeDefined();
				expect(result.option67!.value).toBe('bootx64.efi');
			});
		});

		describe('combined options', () => {
			it('encodes all three options together', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11'],
					option66Server: 'pxe.example.com',
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);

				expect(result.option150).toBeDefined();
				expect(result.option66).toBeDefined();
				expect(result.option67).toBeDefined();
			});

			it('encodes Option 150 + 67 only', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
					option67Bootfile: 'SEP{MAC}.cnf.xml',
				};

				const result = buildTFTPOptions(config);

				expect(result.option150).toBeDefined();
				expect(result.option66).toBeUndefined();
				expect(result.option67).toBeDefined();
			});

			it('encodes Option 66 + 67 only', () => {
				const config: TFTPConfig = {
					option66Server: 'tftp.example.com',
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);

				expect(result.option150).toBeUndefined();
				expect(result.option66).toBeDefined();
				expect(result.option67).toBeDefined();
			});
		});

		describe('validation', () => {
			it('rejects empty Option 150 server', () => {
				const config: TFTPConfig = {
					option150Servers: [''],
				};

				expect(() => buildTFTPOptions(config)).toThrow('cannot be empty');
			});

			it('rejects invalid IPv4 address in Option 150', () => {
				const config: TFTPConfig = {
					option150Servers: ['256.0.0.0'],
				};

				expect(() => buildTFTPOptions(config)).toThrow('Invalid IPv4 address');
			});

			it('rejects empty Option 66 server', () => {
				const config: TFTPConfig = {
					option66Server: '',
				};

				expect(() => buildTFTPOptions(config)).toThrow('At least one TFTP option must be configured');
			});

			it('rejects empty Option 67 bootfile', () => {
				const config: TFTPConfig = {
					option67Bootfile: '',
				};

				expect(() => buildTFTPOptions(config)).toThrow('At least one TFTP option must be configured');
			});

			it('requires at least one option configured', () => {
				const config: TFTPConfig = {};

				expect(() => buildTFTPOptions(config)).toThrow('At least one TFTP option must be configured');
			});

			it('accepts valid Option 150 configuration', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11', '10.0.0.1'],
				};

				expect(() => buildTFTPOptions(config)).not.toThrow();
			});
		});

		describe('configuration examples', () => {
			it('generates ISC dhcpd configuration', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);

				expect(result.examples.iscDhcpd).toBeDefined();
				expect(result.examples.iscDhcpd).toContain('tftp-server-address');
				expect(result.examples.iscDhcpd).toContain('filename');
			});

			it('generates Kea DHCPv4 configuration', () => {
				const config: TFTPConfig = {
					option66Server: 'tftp.example.com',
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);

				expect(result.examples.keaDhcp4).toBeDefined();
				expect(result.examples.keaDhcp4).toContain('next-server');
				expect(result.examples.keaDhcp4).toContain('boot-file-name');
			});

			it('generates Cisco IOS configuration for Option 150', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11'],
				};

				const result = buildTFTPOptions(config);

				expect(result.examples.ciscoIos).toBeDefined();
				expect(result.examples.ciscoIos).toContain('option 150 ip');
				expect(result.examples.ciscoIos).toContain('192.168.1.10');
				expect(result.examples.ciscoIos).toContain('192.168.1.11');
			});

			it('uses default network settings when not provided', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
				};

				const result = buildTFTPOptions(config);

				expect(result.examples.iscDhcpd).toContain('192.168.1.0');
				expect(result.examples.iscDhcpd).toContain('255.255.255.0');
			});

			it('uses custom network settings when provided', () => {
				const config: TFTPConfig = {
					option150Servers: ['10.0.0.1'],
					network: {
						subnet: '10.0.0.0',
						netmask: '255.255.255.0',
						rangeStart: '10.0.0.50',
						rangeEnd: '10.0.0.150',
					},
				};

				const result = buildTFTPOptions(config);

				expect(result.examples.iscDhcpd).toContain('10.0.0.0');
				expect(result.examples.iscDhcpd).toContain('10.0.0.50');
			});
		});
	});

	describe('parseOption150', () => {
		describe('basic decoding', () => {
			it('decodes single TFTP server', () => {
				const hexInput = 'c0a8010a';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10']);
				expect(result.totalLength).toBe(4);
			});

			it('decodes multiple TFTP servers', () => {
				const hexInput = 'c0a8010ac0a8010b';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10', '192.168.1.11']);
				expect(result.totalLength).toBe(8);
			});

			it('handles hex input with spaces', () => {
				const hexInput = 'c0 a8 01 0a';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10']);
			});

			it('handles hex input with colons', () => {
				const hexInput = 'c0:a8:01:0a';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10']);
			});

			it('handles mixed case hex input', () => {
				const hexInput = 'C0A8010A';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10']);
			});
		});

		describe('error handling', () => {
			it('rejects empty hex string', () => {
				expect(() => parseOption150('')).toThrow('Empty hex string');
			});

			it('rejects hex string with odd number of characters', () => {
				expect(() => parseOption150('c0a801')).toThrow('multiple of 4 bytes');
			});

			it('rejects data not multiple of 4 bytes', () => {
				// 6 bytes instead of 4 or 8
				expect(() => parseOption150('c0a8010ac0a8')).toThrow('multiple of 4 bytes');
			});
		});

		describe('round-trip encoding/decoding', () => {
			it('maintains data integrity for single server', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10'],
				};

				const encoded = buildTFTPOptions(config);
				const decoded = parseOption150(encoded.option150!.hexEncoded);

				expect(decoded.servers).toEqual(config.option150Servers);
			});

			it('maintains data integrity for multiple servers', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11', '10.0.0.1'],
				};

				const encoded = buildTFTPOptions(config);
				const decoded = parseOption150(encoded.option150!.hexEncoded);

				expect(decoded.servers).toEqual(config.option150Servers);
			});
		});
	});

	describe('parseOption66', () => {
		describe('basic decoding', () => {
			it('decodes hostname', () => {
				const hexInput = '7078652e6578616d706c652e636f6d';

				const result = parseOption66(hexInput);

				expect(result.value).toBe('pxe.example.com');
				expect(result.totalLength).toBe(15);
			});

			it('decodes IP address', () => {
				const hexInput = '3139322e3136382e312e3130';

				const result = parseOption66(hexInput);

				expect(result.value).toBe('192.168.1.10');
			});

			it('handles hex input with spaces', () => {
				const hexInput = '70 78 65 2e 65 78 61 6d 70 6c 65 2e 63 6f 6d';

				const result = parseOption66(hexInput);

				expect(result.value).toBe('pxe.example.com');
			});
		});

		describe('error handling', () => {
			it('rejects empty hex string', () => {
				expect(() => parseOption66('')).toThrow('Empty hex string');
			});

			it('rejects hex string with odd number of characters', () => {
				expect(() => parseOption66('70786')).toThrow('odd number of characters');
			});
		});

		describe('round-trip encoding/decoding', () => {
			it('maintains data integrity for hostname', () => {
				const config: TFTPConfig = {
					option66Server: 'tftp.example.com',
				};

				const encoded = buildTFTPOptions(config);
				const decoded = parseOption66(encoded.option66!.hexEncoded);

				expect(decoded.value).toBe(config.option66Server);
			});
		});
	});

	describe('parseOption67', () => {
		describe('basic decoding', () => {
			it('decodes bootfile name', () => {
				const hexInput = '7078656c696e75782e30';

				const result = parseOption67(hexInput);

				expect(result.value).toBe('pxelinux.0');
			});

			it('decodes UEFI bootfile', () => {
				const hexInput = '626f6f747836342e656669';

				const result = parseOption67(hexInput);

				expect(result.value).toBe('bootx64.efi');
			});
		});

		describe('error handling', () => {
			it('rejects empty hex string', () => {
				expect(() => parseOption67('')).toThrow('Empty hex string');
			});

			it('rejects hex string with odd number of characters', () => {
				expect(() => parseOption67('70786')).toThrow('odd number of characters');
			});
		});

		describe('round-trip encoding/decoding', () => {
			it('maintains data integrity for bootfile', () => {
				const config: TFTPConfig = {
					option67Bootfile: 'pxelinux.0',
				};

				const encoded = buildTFTPOptions(config);
				const decoded = parseOption67(encoded.option67!.hexEncoded);

				expect(decoded.value).toBe(config.option67Bootfile);
			});
		});
	});

	describe('getDefaultTFTPConfig', () => {
		it('returns default configuration', () => {
			const config = getDefaultTFTPConfig();

			expect(config.option150Servers).toBeDefined();
			expect(config.option66Server).toBeDefined();
			expect(config.option67Bootfile).toBeDefined();
		});

		it('returns valid configuration that can be encoded', () => {
			const config = getDefaultTFTPConfig();

			expect(() => buildTFTPOptions(config)).not.toThrow();
		});
	});

	describe('TFTP_EXAMPLES', () => {
		it('provides multiple example configurations', () => {
			expect(TFTP_EXAMPLES.length).toBeGreaterThan(0);
		});

		it('each example has required properties', () => {
			for (const example of TFTP_EXAMPLES) {
				expect(example.label).toBeDefined();
				expect(example.description).toBeDefined();
			}
		});

		it('all examples can be successfully encoded', () => {
			for (const example of TFTP_EXAMPLES) {
				const config: TFTPConfig = {
					option150Servers: example.option150Servers,
					option66Server: example.option66Server,
					option67Bootfile: example.option67Bootfile,
				};

				expect(() => buildTFTPOptions(config)).not.toThrow();
			}
		});
	});

	describe('UI component examples validation', () => {
		describe('encode examples', () => {
			it('Cisco IP Phones example produces valid output', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11'],
				};

				const result = buildTFTPOptions(config);
				expect(result.option150!.hexEncoded).toBe('c0a8010ac0a8010b');
			});

			it('PXE Boot (Standard) example produces valid output', () => {
				const config: TFTPConfig = {
					option66Server: 'pxe.example.com',
					option67Bootfile: 'pxelinux.0',
				};

				const result = buildTFTPOptions(config);
				expect(result.option66).toBeDefined();
				expect(result.option67).toBeDefined();
			});

			it('PXE Boot (UEFI) example produces valid output', () => {
				const config: TFTPConfig = {
					option66Server: '192.168.1.10',
					option67Bootfile: 'bootx64.efi',
				};

				const result = buildTFTPOptions(config);
				expect(result.option66).toBeDefined();
				expect(result.option67).toBeDefined();
			});

			it('Combined (Option 150 + 67) example produces valid output', () => {
				const config: TFTPConfig = {
					option150Servers: ['192.168.1.10', '192.168.1.11'],
					option67Bootfile: 'SEP{MAC}.cnf.xml',
				};

				const result = buildTFTPOptions(config);
				expect(result.option150).toBeDefined();
				expect(result.option67).toBeDefined();
			});
		});

		describe('decode examples', () => {
			it('Option 150: Dual TFTP decode example is valid', () => {
				const hexInput = 'c0a8010ac0a8010b';

				const result = parseOption150(hexInput);

				expect(result.servers).toEqual(['192.168.1.10', '192.168.1.11']);
			});

			it('Option 66: Hostname decode example is valid', () => {
				const hexInput = '7078652e6578616d706c652e636f6d';

				const result = parseOption66(hexInput);

				expect(result.value).toBe('pxe.example.com');
			});

			it('Option 67: PXE Boot decode example is valid', () => {
				const hexInput = '7078656c696e75782e30';

				const result = parseOption67(hexInput);

				expect(result.value).toBe('pxelinux.0');
			});

			it('Option 67: UEFI Boot decode example is valid', () => {
				const hexInput = '626f6f747836342e656669';

				const result = parseOption67(hexInput);

				expect(result.value).toBe('bootx64.efi');
			});

			it('all decode examples match their descriptions', () => {
				// Option 150: Dual TFTP
				const opt150 = parseOption150('c0a8010ac0a8010b');
				expect(opt150.servers).toEqual(['192.168.1.10', '192.168.1.11']);

				// Option 66: Hostname
				const opt66 = parseOption66('7078652e6578616d706c652e636f6d');
				expect(opt66.value).toBe('pxe.example.com');

				// Option 67: PXE Boot
				const opt67Pxe = parseOption67('7078656c696e75782e30');
				expect(opt67Pxe.value).toBe('pxelinux.0');

				// Option 67: UEFI Boot
				const opt67Uefi = parseOption67('626f6f747836342e656669');
				expect(opt67Uefi.value).toBe('bootx64.efi');
			});
		});
	});

	describe('edge cases', () => {
		it('handles maximum number of Option 150 servers', () => {
			const servers = Array.from({ length: 10 }, (_, i) => `192.168.1.${i + 10}`);
			const config: TFTPConfig = {
				option150Servers: servers,
			};

			const result = buildTFTPOptions(config);
			const decoded = parseOption150(result.option150!.hexEncoded);

			expect(decoded.servers).toEqual(servers);
			expect(decoded.servers.length).toBe(10);
		});

		it('handles very long hostname in Option 66', () => {
			const hostname = 'very-long-hostname-for-tftp-server.subdomain.example.com';
			const config: TFTPConfig = {
				option66Server: hostname,
			};

			const result = buildTFTPOptions(config);
			const decoded = parseOption66(result.option66!.hexEncoded);

			expect(decoded.value).toBe(hostname);
		});

		it('handles special characters in bootfile name', () => {
			const bootfile = 'boot/{MAC}-config.cfg';
			const config: TFTPConfig = {
				option67Bootfile: bootfile,
			};

			const result = buildTFTPOptions(config);
			const decoded = parseOption67(result.option67!.hexEncoded);

			expect(decoded.value).toBe(bootfile);
		});

		it('handles different IP ranges for Option 150', () => {
			const config: TFTPConfig = {
				option150Servers: ['10.0.0.1', '172.16.0.1', '192.168.1.1'],
			};

			const result = buildTFTPOptions(config);
			const decoded = parseOption150(result.option150!.hexEncoded);

			expect(decoded.servers).toEqual(config.option150Servers);
		});
	});
});
