import { json, error } from '@sveltejs/kit';
import * as tls from 'node:tls';
import * as net from 'node:net';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface TLSHandshakeRequest {
  hostname: string;
  port?: number;
}

interface HandshakePhase {
  phase: string;
  timestamp: number;
  duration?: number;
  details?: Record<string, any>;
}

interface TLSHandshakeResponse {
  hostname: string;
  port: number;
  success: boolean;
  totalTime: number;
  phases: HandshakePhase[];
  tlsVersion: string;
  cipherSuite: string;
  certificateInfo?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    san?: string[];
  };
  alpnProtocol?: string;
  timestamp: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: TLSHandshakeRequest = await request.json();
    const { hostname, port = 443 } = body;

    if (!hostname || typeof hostname !== 'string' || !hostname.trim()) {
      throw error(400, 'Hostname is required');
    }

    const trimmedHostname = hostname.trim();

    const result = await performTLSHandshake(trimmedHostname, port);
    return json(result);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'TLS Handshake API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `TLS handshake failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

function performTLSHandshake(hostname: string, port: number): Promise<TLSHandshakeResponse> {
  return new Promise((resolve, reject) => {
    const phases: HandshakePhase[] = [];
    const startTime = Date.now();
    let lastPhaseTime = startTime;

    const addPhase = (phase: string, details?: Record<string, any>) => {
      const now = Date.now();
      const duration = now - lastPhaseTime;
      phases.push({
        phase,
        timestamp: now - startTime,
        duration,
        details,
      });
      lastPhaseTime = now;
    };

    const tcpSocket = net.connect(
      {
        host: hostname,
        port,
        timeout: 10000,
      },
      () => {
        addPhase('TCP Connection Established', {
          address: tcpSocket.remoteAddress,
          port: tcpSocket.remotePort,
        });
      },
    );

    tcpSocket.on('error', (err: Error) => {
      reject(new Error(`TCP connection failed: ${err.message}`));
    });

    tcpSocket.on('timeout', () => {
      tcpSocket.destroy();
      reject(new Error('Connection timeout'));
    });

    const tlsSocket = (tls as any).connect(
      {
        socket: tcpSocket,
        servername: hostname,
        // SECURITY: rejectUnauthorized must be false for this TLS diagnostic tool.
        // This tool analyzes TLS handshakes including servers with certificate issues.
        rejectUnauthorized: false,
        ALPNProtocols: ['h2', 'http/1.1'],
      },
      () => {
        try {
          addPhase('TLS Handshake Complete');

          const cert = tlsSocket.getPeerCertificate();
          const cipher = tlsSocket.getCipher();
          const protocol = tlsSocket.getProtocol();
          const alpn = tlsSocket.alpnProtocol;

          addPhase('Certificate Received', {
            subject: cert.subject?.CN || 'Unknown',
            issuer: cert.issuer?.CN || 'Unknown',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            sanCount: cert.subjectaltname?.split(',').length || 0,
          });

          const totalTime = Date.now() - startTime;

          const response: TLSHandshakeResponse = {
            hostname,
            port,
            success: true,
            totalTime,
            phases,
            tlsVersion: protocol || 'Unknown',
            cipherSuite: cipher?.name || 'Unknown',
            certificateInfo: {
              subject: cert.subject?.CN || 'Unknown',
              issuer: cert.issuer?.CN || 'Unknown',
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              san: cert.subjectaltname?.split(', '),
            },
            alpnProtocol: alpn || undefined,
            timestamp: new Date().toISOString(),
          };

          tlsSocket.end();
          resolve(response);
        } catch (err) {
          tlsSocket.destroy();
          reject(err);
        }
      },
    );

    tlsSocket.on('error', (err: Error) => {
      reject(new Error(`TLS handshake failed: ${err.message}`));
    });
  });
}
