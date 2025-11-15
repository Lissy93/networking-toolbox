#!/usr/bin/env node

/**
 * This is just a wrapper around the built SvelteKit app,
 * which can otherwise be started with `node build`
 * The purpose of this wrapper is to add:
 * - Automatic restarts with exponential backoff on crashes
 * - Graceful shutdown on SIGTERM and SIGINT
 * - Improved logging
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = join(__dirname, 'build');
const ENTRY_FILE = join(BUILD_DIR, 'index.js');
const MAX_RESTARTS = 10;
const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 30000;

let restartCount = 0;
let backoffTime = INITIAL_BACKOFF;
let child = null;
let isShuttingDown = false;

// Console logging with colors and icons
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

const log = (message, type = 'info') => {
	const styles = {
		error: { color: colors.red, icon: '❌' },
		success: { color: colors.green, icon: '✅' },
		warning: { color: colors.yellow, icon: '⚠️ ' },
		info: { color: colors.cyan, icon: 'ℹ️ ' },
		start: { color: colors.blue, icon: '🚀' },
		stop: { color: colors.yellow, icon: '⏹️ ' },
		wait: { color: colors.yellow, icon: '⏳' }
	};

	const { color, icon } = styles[type] || styles.info;
	console.log(`${color}${icon} ${message}${colors.reset}`);
};

// Validate build exists and is correct type
function validateBuild() {
	if (!existsSync(BUILD_DIR)) {
		log('Build directory not found.', 'error');
		log('Run: npm run build:node', 'info');
		process.exit(1);
	}

	if (!existsSync(ENTRY_FILE)) {
		log('Build entry file not found.', 'error');
		log('The build might not be a Node.js build.', 'warning');
		log('Run: npm run build:node', 'info');
		process.exit(1);
	}

	// Check for handler.js which indicates adapter-node
	const handlerFile = join(BUILD_DIR, 'handler.js');
	if (!existsSync(handlerFile)) {
		log('This appears to be a static build, not a Node.js build.', 'error');
		log('Run: npm run build:node', 'info');
		process.exit(1);
	}
}

function startServer() {
	if (isShuttingDown) return;

	log(`Starting server... (attempt ${restartCount + 1})`, 'start');

	child = spawn('node', ['build'], {
		stdio: 'inherit',
		env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
	});

	// Reset counters after successful run (30s uptime)
	const successTimer = setTimeout(() => {
		restartCount = 0;
		backoffTime = INITIAL_BACKOFF;
	}, 30000);

	child.on('error', (err) => {
		clearTimeout(successTimer);
		log(`Failed to start server: ${err.message}`, 'error');
		// Error event is always followed by exit event, so we handle restart there
	});

	child.on('exit', (code, signal) => {
		clearTimeout(successTimer);
		child = null;

		if (isShuttingDown) {
			log('Server stopped gracefully', 'success');
			process.exit(0);
		}

		if (code === 0) {
			log('Server exited normally', 'success');
			process.exit(0);
		}

		restartCount++;

		if (restartCount >= MAX_RESTARTS) {
			log(`Server crashed ${MAX_RESTARTS} times. Giving up.`, 'error');
			process.exit(1);
		}

		log(`Server crashed with ${signal ? `signal ${signal}` : `code ${code}`}`, 'warning');
		log(`Restarting in ${backoffTime / 1000}s...`, 'wait');

		setTimeout(() => {
			backoffTime = Math.min(backoffTime * 2, MAX_BACKOFF);
			startServer();
		}, backoffTime);
	});
}

function shutdown(signal) {
	if (isShuttingDown) return;
	isShuttingDown = true;

	log(`Received ${signal}, shutting down gracefully...`, 'stop');

	if (child) {
		child.kill('SIGTERM');

		// Force kill after 10s if not stopped
		setTimeout(() => {
			if (child) {
				log('Force killing server...', 'warning');
				child.kill('SIGKILL');
			}
		}, 10000);
	} else {
		process.exit(0);
	}
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
	log(`Unhandled rejection: ${err.message}`, 'error');
	shutdown('unhandledRejection');
});

// Validate and start
validateBuild();
log('Node.js build detected', 'success');
startServer();

