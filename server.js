// This code is property of CHR. Do not use for commercial use.
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const bannedIps = new Set();
const invisibleUsers = new Set();
const protectedUsers = new Set();
const swearWords = ['shit', 'nigger', 'ass', 'fuck', 'bitch', 'cock', 'dick', 'damn']; // This is a list of words that will ban you when entered lol
const connectedUsers = new Map();
console.log("Loaded commands");
console.log("Server ready");
console.log("Server is ready to be started on ngrok");
console.log("Server is starting the command list...");
console.log("Command list ready");
console.log("Checking other variables...");
console.log("Do people even read these?");
console.log("Ready");
const commandsList = `
Available commands:
/list - List all commands
---$ban <username> - Ban a user
---$unban <username> - Unban a user
---$unbanme - Unban yourself
---$invis <username> - Make a user invisible
---$banprot <username, @s for self> - Add ban protection to a user
---$remove <invis, banprot> <username> - Remove invisibility or ban protection from a user
---$fakeuser <username> - Create a fake user (May not always work)
---$banall - Ban all users except those with ban protection
---$<name> say <message> x<times> - Make a user say a message. User can be fake. Use 'x' to define the amount of times it is said. SPACE SENSITIVE!!
---$chatbot-say <message> x<times> - Make the chatbot say a message multiple times
`;

io.on('connection', (socket) => {
    const clientIp = socket.request.connection.remoteAddress;
console.log("Connected, Checking Ip")
    if (bannedIps.has(clientIp)) {
        socket.emit('banned');
console.log("User Ip is banned")
console.log("Wonder why that user's banned...")
        socket.disconnect();
console.log("The banned user was disconnected.")

        return;
    }

    console.log('A user connected');

    // Check if the user is banned
    socket.on('set name', (name) => {
        if (bannedIps.has(clientIp)) {
            socket.emit('banned');
            socket.disconnect();
        } else {
            socket.username = name;
            connectedUsers.set(socket.id, { name, ip: clientIp });
            io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
        }
    });

    socket.on('chat message', (msg) => {
        if (socket.username && msg.startsWith('/list')) {
console.log("Admin Command Alert: /list detected.")
            socket.emit('chat message', { user: 'System', text: commandsList });
        } else if (socket.username && msg.startsWith('---$ban ')) {
console.log("Internal Command '---$ban' detected.")
            const userToBan = msg.split(' ')[1];
            if (userToBan && !protectedUsers.has(userToBan)) {
                let userIp = null;
                for (let [id, user] of connectedUsers) {
                    if (user.name === userToBan) {
                        userIp = user.ip;
                        break;
                    }
                }
                if (userIp) {
                    bannedIps.add(userIp);
                    io.emit('user banned', userToBan);
                    for (let [id, user] of connectedUsers) {
                        if (user.ip === userIp) {
                            io.to(id).emit('banned');
                            io.sockets.sockets.get(id).disconnect();
                            connectedUsers.delete(id);
                        }
                    }
                    io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
                }
            }
        } else if (socket.username && msg.startsWith('---$banall')) {
console.log("Internal Command '---$banall' detected.")
console.log("You may want to run '---$unbanme' on your computer.")
console.log("Unless, of course, you have ban protection.")
            for (let [id, user] of connectedUsers) {
                if (!protectedUsers.has(user.name)) {
                    bannedIps.add(user.ip);
                    io.to(id).emit('banned');
                    io.sockets.sockets.get(id).disconnect();
                    connectedUsers.delete(id);
                }
            }
            io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
            io.emit('all users banned except protected');
        } else if (socket.username && msg.startsWith('---$unban ')) {
console.log("Internal Command '---$unban' has been run.")
console.log("If this command has any effect, you will be notified.")
            const userToUnban = msg.split(' ')[1];
            if (userToUnban) {
                let userIp = null;
                for (let [id, user] of connectedUsers) {
                    if (user.name === userToUnban) {
                        userIp = user.ip;
                        break;
                    }
                }
                if (userIp && bannedIps.has(userIp)) {
                    bannedIps.delete(userIp);
                    io.emit('user unbanned', userToUnban);
console.log("External Command '---$unban' detected.")
console.log("A user has been removed from the banned Ip list.")
                }
            }
        } else if (socket.username && msg.startsWith('---$unbanme')) {
            if (bannedIps.has(clientIp)) {
                bannedIps.delete(clientIp);
                io.emit('user unbanned', socket.username);
console.log("External Command '---$unbanme' unbanned a user.")
            }
        } else if (socket.username && msg.startsWith('---$invis ')) {
            const userToInvisible = msg.split(' ')[1];
            if (userToInvisible) {
                invisibleUsers.add(userToInvisible);
                io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
console.log("External Command '---$invis' detected.")
            }
        } else if (socket.username && msg.startsWith('---$banprot ')) {
            const userToProtect = msg.split(' ')[1];
            if (userToProtect) {
                if (userToProtect === '@s') {
                    protectedUsers.add(socket.username);
                } else {
                    protectedUsers.add(userToProtect);
                }
                io.emit('user protected', userToProtect === '@s' ? socket.username : userToProtect);
console.log("External Command '---$banprot' detected.")
            }
        } else if (socket.username && msg.startsWith('---$remove ')) {
console.log("External Command '---$remove' detected.")
            const parts = msg.split(' ');
            const type = parts[1];
            const userToRemove = parts[2];
            if (type === 'invis' && userToRemove) {
                invisibleUsers.delete(userToRemove);
                io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
            } else if (type === 'banprot' && userToRemove) {
                protectedUsers.delete(userToRemove);
                io.emit('user unprotected', userToRemove);
            }
        } else if (socket.username && msg.startsWith('---$usrlist')) {
console.log("External Command '---$usrlist' detected.")            
socket.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
        } else if (socket.username && msg.startsWith('---$chatbot-say ')) {
console.log("External/Internal Command '---$chatbot-say' detected.")
            const parts = msg.slice(15).trim().split(' x');
            const chatbotMessage = parts[0];
            const repeatCount = parseInt(parts[1], 10) || 1;
            if (chatbotMessage) {
                for (let i = 0; i < repeatCount; i++) {
                    const message = {
                        user: 'Chatbot',
                        text: chatbotMessage
                    };
                    io.emit('chat message', message);
                }
            }
        } else if (socket.username && msg.startsWith('---$')) {
console.log("External Command '---$ say' detected.")
            const parts = msg.split('say ');
            if (parts.length === 2) {
                const userAndMessage = parts[1].split(' x');
                const userMessage = userAndMessage[0].trim();
                const repeatCount = parseInt(userAndMessage[1], 10) || 1;
                const userName = msg.split('---$')[1].split('say')[0].trim();
                if (userMessage && userName) {
                    for (let i = 0; i < repeatCount; i++) {
                        const message = {
                            user: userName,
                            text: userMessage
                        };
                        io.emit('chat message', message);
                    }
                }
            }
        } else if (socket.username && msg.startsWith('---$discon ')) {
console.log("External Command '---$discon' detected.")
            const userToDisconnect = msg.split(' ')[1];
            if (userToDisconnect) {
                let socketIdToDisconnect = null;
                for (let [id, user] of connectedUsers) {
                    if (user.name === userToDisconnect) {
                        socketIdToDisconnect = id;
                        break;
                    }
                }
                if (socketIdToDisconnect) {
                    io.to(socketIdToDisconnect).emit('disconnected');
                    io.sockets.sockets.get(socketIdToDisconnect).disconnect();
                    connectedUsers.delete(socketIdToDisconnect);
                    io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
                }
            }
        } else if (socket.username && msg.startsWith('---$fakeuser ')) {
            const fakeUserName = msg.split(' ')[1];
            if (fakeUserName) {
                connectedUsers.set(`fake_${fakeUserName}`, {
 name: fakeUserName, ip: 'fake' });
                io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
            }
        } else if (socket.username) {
            // Check for swear words
            const containsSwearWord = swearWords.some(word => msg.includes(word));
console.log("Checking a message...")
            if (containsSwearWord) {
console.log("Message is profane.")
console.log("User was banned.")
                bannedIps.add(clientIp);
                socket.emit('banned');
                io.emit('user banned', socket.username);
                io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
                socket.disconnect();
            } else {
console.log("Message is clean.")
console.log("Displaying message...")
                const message = {
                    user: socket.username,
                    text: msg
                };
                io.emit('chat message', message);
            }
        }
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('user list', Array.from(connectedUsers.values()).filter(user => !invisibleUsers.has(user.name)).map(user => user.name));
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 4567;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
console.log("Note that the port may vary depending on how it was hosted.")
});
