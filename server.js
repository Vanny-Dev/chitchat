import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
//import { setupDatabase } from './db.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';
import sharedSession from 'express-socket.io-session';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (cluster.isPrimary) {
    const numCPUs = availableParallelism();
    console.log(`Primary ${process.pid} is running`);
    console.log(`Starting ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork({
            PORT: 3000 + i
        });
    }

    setupPrimary();

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork({
            PORT: worker.process.env.PORT
        });
    });
} else {
    const startServer = async () => {
        const db = new sqlite3.Database('./database.db');
        //await setupDatabase();

        const app = express();
        const server = createServer(app);
        const io = new Server(server, {
            connectionStateRecovery: {},
            adapter: createAdapter()
        });

        // Middleware
        app.use(cors());
        app.use(bodyParser.json());
        app.use(express.static(join(__dirname, 'public')));
        // Create Express session middleware
        const sessionMiddleware = session({
            secret: 'abc123.def456',
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false }
        });

        // Use session middleware in Express
        app.use(sessionMiddleware);

        // Share session with Socket.IO
        io.use((socket, next) => {
            sessionMiddleware(socket.request, {}, next);
        });

        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Create tables if they don't exist
        db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      client_offset TEXT UNIQUE,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (username) REFERENCES users (username)
    );
  `);

        // Signup route
        app.post('/signup', (req, res) => {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.json({ success: false, message: "Username and password are required!" });
            }
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
                if (err) {
                    return res.json({ success: false, message: "Username already taken!" });
                }
                res.json({ success: true, message: "Signup successful!" });
            });
        });

        // Login route
        app.post('/login', (req, res) => {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.json({ success: false, message: "Please fill up both fields!" });
            }
            db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
                if (user) {
                    req.session.user = { id: user.id, username: user.username };
                    res.json({ success: true, message: "Login successful!" });
                } else {
                    res.json({ success: false, message: "Incorrect Credentials!" });
                }
            });
        });

        // Logout route
        app.post('/logout', (req, res) => {
            req.session.destroy((err) => {
                if (err) {
                    return res.json({ success: false, message: "Logout failed!" });
                }
                res.json({ success: true, message: "Logged out successfully!" });
            });
        });

        // Check authentication
        app.get('/auth/user', (req, res) => {
            if (req.session.user) {
                res.json({ loggedIn: true, username: req.session.user.username });
            } else {
                res.json({ loggedIn: false });
            }
        });

        // Check login status
        app.get('/check-auth', (req, res) => {
            if (req.session.user) {
                res.json({ loggedIn: true, user: req.session.user });
            } else {
                res.json({ loggedIn: false });
            }
        });

        // Socket.IO connection handling
        io.on('connection', async (socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });

            socket.on('chat message', async (msg, clientOffset, callback) => {
                if (!socket.request.session || !socket.request.session.user) {
                    console.warn('Unauthorized user attempted to send a message.');
                    return;
                }

                const username = socket.request.session.user.username; // Get username from session
                try {
                    await db.run(
                        'INSERT INTO messages (username, content, client_offset) VALUES (?, ?, ?)',
                        [username, msg, clientOffset]
                    );
                    io.emit('chat message', { username, message: msg }, clientOffset);
                    callback();
                } catch (e) {
                    console.error('Database insert error:', e);
                }
            });

            if (!socket.recovered) {
                try {
                    await db.each('SELECT id, username, content FROM messages WHERE id > ?',
                        [socket.handshake.auth.serverOffset || 0],
                        (_err, row) => {
                            socket.emit('chat message', { username: row.username, message: row.content }, row.id);
                        }
                    );

                } catch (e) {
                    console.error('Recovery error:', e);
                }
            }
        });

        const port = process.env.PORT || 3000;
        server.listen(port, () => {
            console.log(`Worker ${process.pid} started - Server running at http://localhost:${port}`);
        });
    };

    startServer().catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}
