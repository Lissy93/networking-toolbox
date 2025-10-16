import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connect } from 'node:net';
import { errorManager } from '$lib/utils/error-manager';

interface GreylistTestResult {
  domain: string;
  port: number;
  implementsGreylisting: boolean;
  attempts: Array<{
    attemptNumber: number;
    timestamp: string;
    connected: boolean;
    response?: string;
    responseCode?: string;
    duration: number;
    error?: string;
  }>;
  analysis: {
    initialRejected: boolean;
    subsequentAccepted: boolean;
    typicalDelay?: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  timestamp: string;
}

function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

async function testSMTPConnection(
  domain: string,
  port: number,
  _attemptNumber: number,
): Promise<{
  connected: boolean;
  response?: string;
  responseCode?: string;
  duration: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = connect({ host: domain, port, timeout: 10000 });
    let response = '';
    let resolved = false;

    const safeResolve = (result: any) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(10000);

    socket.on('timeout', () => {
      safeResolve({
        connected: false,
        duration: Date.now() - startTime,
        error: 'Connection timeout',
      });
    });

    socket.on('error', (err: any) => {
      safeResolve({
        connected: false,
        duration: Date.now() - startTime,
        error: err.message || 'Connection failed',
      });
    });

    socket.on('data', (data: any) => {
      response += data.toString();

      // Got initial greeting
      if (
        response.includes('220') ||
        response.includes('421') ||
        response.includes('450') ||
        response.includes('451')
      ) {
        const lines = response.split('\n');
        const greetingLine = lines.find(
          (l) => l.startsWith('220') || l.startsWith('421') || l.startsWith('450') || l.startsWith('451'),
        );

        if (greetingLine) {
          const code = greetingLine.substring(0, 3);
          socket.write('QUIT\r\n');

          setTimeout(() => {
            safeResolve({
              connected: true,
              response: greetingLine.trim(),
              responseCode: code,
              duration: Date.now() - startTime,
            });
          }, 100);
        }
      }
    });

    socket.on('end', () => {
      if (!resolved && !response) {
        safeResolve({
          connected: false,
          duration: Date.now() - startTime,
          error: 'Connection closed without response',
        });
      }
    });

    socket.on('close', () => {
      if (!resolved && !response) {
        safeResolve({
          connected: false,
          duration: Date.now() - startTime,
          error: 'Connection closed',
        });
      }
    });
  });
}

function analyzeGreylistBehavior(attempts: GreylistTestResult['attempts']): GreylistTestResult['analysis'] {
  if (attempts.length < 2) {
    return {
      initialRejected: false,
      subsequentAccepted: false,
      confidence: 'none',
    };
  }

  const firstAttempt = attempts[0];
  const lastAttempt = attempts[attempts.length - 1];

  // Check for temporary rejection codes (421, 450, 451)
  const initialRejected =
    firstAttempt.responseCode === '421' ||
    firstAttempt.responseCode === '450' ||
    firstAttempt.responseCode === '451' ||
    (firstAttempt.response &&
      (firstAttempt.response.toLowerCase().includes('greylist') ||
        firstAttempt.response.toLowerCase().includes('try again') ||
        firstAttempt.response.toLowerCase().includes('temporary')));

  // Check if later attempts succeeded
  const subsequentAccepted =
    lastAttempt.responseCode === '220' ||
    (lastAttempt.connected && !lastAttempt.error && lastAttempt.responseCode !== '421');

  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

  // Calculate typical delay if greylisting detected
  let typicalDelay: number | undefined;
  if (initialRejected && subsequentAccepted) {
    const firstTime = new Date(attempts[0].timestamp).getTime();
    const lastTime = new Date(lastAttempt.timestamp).getTime();
    typicalDelay = Math.round((lastTime - firstTime) / 1000); // seconds

    // High confidence: explicit greylist message + subsequent acceptance
    if (
      firstAttempt.response?.toLowerCase().includes('greylist') ||
      firstAttempt.response?.toLowerCase().includes('greylisted')
    ) {
      confidence = 'high';
    }
    // Medium confidence: temporary rejection codes + subsequent acceptance
    else if (firstAttempt.responseCode === '450' || firstAttempt.responseCode === '451') {
      confidence = 'medium';
    }
    // Low confidence: soft rejection followed by acceptance
    else {
      confidence = 'low';
    }
  }
  // Check if all attempts were rejected similarly (no greylisting)
  else if (attempts.every((a) => a.responseCode === firstAttempt.responseCode)) {
    confidence = 'none';
  }
  // Mixed results without clear pattern
  else {
    confidence = 'low';
  }

  return {
    initialRejected: initialRejected || false,
    subsequentAccepted: subsequentAccepted || false,
    typicalDelay,
    confidence,
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { domain, port = 25, attempts = 3, delayBetweenAttempts = 60 } = await request.json();

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

    const attemptsNum = Number(attempts);
    if (isNaN(attemptsNum) || attemptsNum < 2 || attemptsNum > 5) {
      return json({ message: 'Attempts must be between 2 and 5' }, { status: 400 });
    }

    const delayNum = Number(delayBetweenAttempts);
    if (isNaN(delayNum) || delayNum < 1 || delayNum > 300) {
      return json({ message: 'Delay must be between 1 and 300 seconds' }, { status: 400 });
    }

    const testAttempts: GreylistTestResult['attempts'] = [];

    // Perform multiple connection attempts with delays
    for (let i = 0; i < attemptsNum; i++) {
      const timestamp = new Date().toISOString();
      const result = await testSMTPConnection(normalizedDomain, portNum, i + 1);

      testAttempts.push({
        attemptNumber: i + 1,
        timestamp,
        ...result,
      });

      // Wait before next attempt (except for last one)
      if (i < attemptsNum - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayNum * 1000));
      }
    }

    const analysis = analyzeGreylistBehavior(testAttempts);

    const result: GreylistTestResult = {
      domain: normalizedDomain,
      port: portNum,
      implementsGreylisting: analysis.confidence !== 'none' && analysis.initialRejected,
      attempts: testAttempts,
      analysis,
      timestamp: new Date().toISOString(),
    };

    return json(result);
  } catch (error) {
    errorManager.captureException(error, 'error', { component: 'Greylist API' });
    return json({ message: error instanceof Error ? error.message : 'Failed to test greylisting' }, { status: 500 });
  }
};
