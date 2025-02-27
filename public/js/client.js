// Socket.IO connection setup with reconnection logic
const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});

// DOM Elements
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const chatmain = document.querySelector('.chat-main');

// Message counter for client offset
let counter = 0;

// Track processed messages to avoid duplicates
const processedMessages = new Map();

// Connection status indicators
socket.on('connect', () => {
    console.log('Connected to server');
    addStatusMessage('Connected to the chat');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    addStatusMessage('Disconnected from the chat');
});

socket.on('connect_error', () => {
    console.log('Connection error');
    addStatusMessage('Connection error, trying to reconnect...');
});

// Form submission handler
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (input.value.trim()) {
        const message = input.value;
        const clientOffset = `${socket.id}-${counter++}`;
        
        // Clear input field immediately
        input.value = '';
        input.focus();
        
        // Send message to server
        socket.emit('chat message', message, clientOffset, () => {
            console.log('Message acknowledged by server');
        });
    }
});

// Handle incoming messages from server
socket.on('chat message', (data, serverOffset) => {
    // Store the server offset for reconnection
    socket.auth.serverOffset = serverOffset;
    
    // Create a unique message identifier
    const messageId = `msg-${serverOffset}`;
    
    // Check if we've already processed this message
    if (processedMessages.has(messageId)) {
        return; // Skip if already displayed
    }
    
    // Mark as processed
    processedMessages.set(messageId, true);
    
    const username = data.username;
    const message = data.message;
    
    // Add a regular message with username
    addMessage(username, message, messageId);
});

// General function to add messages with proper styling
function addMessage(username, messageText, messageId) {
    const item = document.createElement('li');
    item.className = 'message';
    item.id = messageId;
    
    // Add username if provided
    if (username) {
        const usernameEl = document.createElement('div');
        usernameEl.className = 'username';
        usernameEl.textContent = username;
        item.appendChild(usernameEl);
    }
    
    // Create message content
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = messageText;
    
    item.appendChild(messageContent);
    messages.appendChild(item);
    scrollToBottom();
}

function addStatusMessage(message) {
    const item = document.createElement('li');
    item.className = 'system-message';
    item.textContent = message;
    messages.appendChild(item);
    scrollToBottom();
}

function scrollToBottom() {
    chatmain.scrollTop = chatmain.scrollHeight;
}

// Add event listener to update UI when window is resized
window.addEventListener('resize', scrollToBottom);

// Menu toggle functionality (if needed)
const menuBtn = document.querySelector('.menu-btn');
const dropdownMenu = document.querySelector('.dropdown-menu');

if (menuBtn && dropdownMenu) {
    menuBtn.addEventListener('click', () => {
        const isDisplayed = dropdownMenu.style.display === 'block';
        dropdownMenu.style.display = isDisplayed ? 'none' : 'block';
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
}

// Clean up old messages from the tracking Map to prevent memory leaks
setInterval(() => {
    if (processedMessages.size > 1000) {
        // Keep only the last 500 messages
        const entries = Array.from(processedMessages.entries());
        const newEntries = entries.slice(entries.length - 500);
        processedMessages.clear();
        for (const [key, value] of newEntries) {
            processedMessages.set(key, value);
        }
    }
}, 60000); // Run every minute