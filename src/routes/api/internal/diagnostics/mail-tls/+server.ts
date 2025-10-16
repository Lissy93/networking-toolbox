import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connect } from 'node:net';
import * as tls from 'node:tls';
import { errorManager } from '$lib/utils/error-manager';

interface TLSCheckResult {
  domain: string;
  port: number;
  supportsSTARTTLS: boolean;
  supportsDirectTLS: boolean;
  certificate?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysUntilExpiry: number;
    serialNumber: string;
    fingerprint: string;
    commonName: string;
    altNames: string[];
  };
  tlsVersion?: string;
  cipherSuite?: string;
  timestamp: string;
}

function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

async function checkSTARTTLS(domain: string, port: number): Promise<Partial<TLSCheckResult>> {
  return new Promise((resolve) => {
    const socket = connect({ host: domain, port, timeout: 5000 });
    let response = '';
    let tlsSocket: any = null;

    const cleanup = () => {
      if (tlsSocket) tlsSocket.destroy();
      if (socket) socket.destroy();
    };

    socket.setTimeout(5000);

    socket.on('timeout', () => {
      cleanup();
      resolve({ supportsSTARTTLS: false });
    });

    socket.on('error', () => {
      cleanup();
      resolve({ supportsSTARTTLS: false });
    });

    socket.on('data', (data: any) => {
      response += data.toString();

      // Wait for SMTP greeting (220)
      if (response.includes('220 ') && !response.includes('STARTTLS')) {
        socket.write('EHLO client.local\r\n');
      }

      // Check for STARTTLS support
      if (response.includes('STARTTLS')) {
        socket.write('STARTTLS\r\n');
      }

      // Server ready for TLS (220 after STARTTLS)
      if (response.includes('STARTTLS') && response.match(/220.*ready/i)) {
        // Upgrade to TLS
        tlsSocket = (tls as any).connect({
          socket,
          servername: domain,
          // SECURITY: rejectUnauthorized must be false for this mail TLS diagnostic tool.
          // This tool analyzes mail server certificates including those with issues.
          rejectUnauthorized: false,
        });

        tlsSocket.on('secureConnect', () => {
          const cert = tlsSocket.getPeerCertificate();
          const cipher = tlsSocket.getCipher();

          if (cert && Object.keys(cert).length > 0) {
            const validTo = new Date(cert.valid_to);
            const now = new Date();
            const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            resolve({
              supportsSTARTTLS: true,
              certificate: {
                subject: cert.subject?.CN || '',
                issuer: cert.issuer?.CN || '',
                validFrom: cert.valid_from,
                validTo: cert.valid_to,
                daysUntilExpiry,
                serialNumber: cert.serialNumber || '',
                fingerprint: cert.fingerprint || '',
                commonName: cert.subject?.CN || '',
                altNames: cert.subjectaltname?.split(', ').map((n: string) => n.replace('DNS:', '')) || [],
              },
              tlsVersion: tlsSocket.getProtocol(),
              cipherSuite: `${cipher.name} (${cipher.version})`,
            });
          } else {
            resolve({ supportsSTARTTLS: true });
          }
          cleanup();
        });

        tlsSocket.on('error', () => {
          cleanup();
          resolve({ supportsSTARTTLS: true });
        });
      }
    });

    socket.on('end', () => {
      cleanup();
      if (!response.includes('STARTTLS')) {
        resolve({ supportsSTARTTLS: false });
      }
    });
  });
}

async function checkDirectTLS(domain: string, port: number): Promise<Partial<TLSCheckResult>> {
  return new Promise((resolve) => {
    const socket = (tls as any).connect({
      host: domain,
      port,
      servername: domain,
      // SECURITY: rejectUnauthorized must be false for this mail TLS diagnostic tool.
      // This tool analyzes mail server certificates including those with issues.
      rejectUnauthorized: false,
      timeout: 5000,
    });

    socket.setTimeout(5000);

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ supportsDirectTLS: false });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ supportsDirectTLS: false });
    });

    socket.on('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      const cipher = socket.getCipher();

      if (cert && Object.keys(cert).length > 0) {
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          supportsDirectTLS: true,
          certificate: {
            subject: cert.subject?.CN || '',
            issuer: cert.issuer?.CN || '',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysUntilExpiry,
            serialNumber: cert.serialNumber || '',
            fingerprint: cert.fingerprint || '',
            commonName: cert.subject?.CN || '',
            altNames: cert.subjectaltname?.split(', ').map((n: string) => n.replace('DNS:', '')) || [],
          },
          tlsVersion: socket.getProtocol(),
          cipherSuite: `${cipher.name} (${cipher.version})`,
        });
      } else {
        resolve({ supportsDirectTLS: true });
      }
      socket.destroy();
    });
  });
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { domain, port = 25 } = await request.json();

    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      return json({ message: 'Domain is required' }, { status: 400 });
    }

    const normalizedDomain = domain.trim().toLowerCase();

    if (!validateDomain(normalizedDomain)) {
      return json({ message: 'Invalid domain format' }, { status: 400 });
    }

    const portNum = Number(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return json({ message: 'Invalid port number' }, { status: 400 });
    }

    // Check both STARTTLS (port 25/587) and Direct TLS (port 465)
    const [starttlsResult, directTLSResult] = await Promise.all([
      portNum === 465
        ? Promise.resolve({ supportsSTARTTLS: false } as Partial<TLSCheckResult>)
        : checkSTARTTLS(normalizedDomain, portNum),
      portNum === 465
        ? checkDirectTLS(normalizedDomain, portNum)
        : Promise.resolve({ supportsDirectTLS: false } as Partial<TLSCheckResult>),
    ]);

    const result: TLSCheckResult = {
      domain: normalizedDomain,
      port: portNum,
      supportsSTARTTLS: starttlsResult.supportsSTARTTLS ?? false,
      supportsDirectTLS: directTLSResult.supportsDirectTLS ?? false,
      certificate: starttlsResult.certificate ?? directTLSResult.certificate,
      tlsVersion: starttlsResult.tlsVersion ?? directTLSResult.tlsVersion,
      cipherSuite: starttlsResult.cipherSuite ?? directTLSResult.cipherSuite,
      timestamp: new Date().toISOString(),
    };

    return json(result);
  } catch (error) {
    errorManager.captureException(error, 'error', { component: 'Mail TLS API' });
    return json(
      { message: error instanceof Error ? error.message : 'Failed to check mail server TLS' },
      { status: 500 },
    );
  }
};
