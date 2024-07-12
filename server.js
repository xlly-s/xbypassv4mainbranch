import { createBareServer } from '@tomphttp/bare-server-node';
import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const bare = createBareServer('/bare/');
const app = express();
const publicPath = 'public';

app.use(express.static(publicPath));

app.use((req, res) => {
	res.status(404);
	res.sendFile(join(__dirname, publicPath, '404.html'));
});

const server = createServer();

server.on('request', (req, res) => {
	if (bare.shouldRoute(req)) {
		bare.routeRequest(req, res);
	} else {
		app(req, res);
	}
});

server.on('upgrade', (req, socket, head) => {
	if (bare.shouldRoute(req)) {
		bare.routeUpgrade(req, socket, head);
	} else {
		socket.end();
	}
});

let port = parseInt(process.env.PORT || '');

if (isNaN(port)) port = 3000;

server.on('listening', () => {
	const address = server.address();
	console.log('Listening on:');
	console.log(`\thttp://localhost:${address.port}`);
	console.log(
		`\thttp://${
			address.family === 'IPv6' ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

// https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
	console.log('SIGTERM signal received: closing HTTP server');
	server.close();
	bare.close();
	process.exit(0);
}

server.listen({
	port
});
