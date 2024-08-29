"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});
app.use((0, cors_1.default)());
app.get("/", (req, res) => {
    res.json({ message: "CCL Video P2P Service" });
});
app.set("io", io);
let activeConnections = [];
let roompeers = []; //connections
io.use((socket, next) => {
    const callerId = socket.handshake.query.callerId;
    if (callerId) {
        socket.data.user = callerId;
        next();
    }
    else {
        next(new Error("callerId is required"));
    }
});
io.on("connection", (socket) => {
    const user = socket.data.user;
    if (!user)
        return;
    activeConnections.push(user);
    console.log(`${user} Connected - ${socket.id}`);
    socket.join(user);
    socket.emit("userId", socket.id);
    socket.emit("users", activeConnections.filter((u) => u !== user)); //---Irrelevant: Just showing all the user socket currencly connected
    socket.on("joinRoom", (data) => {
        socket.data.roomId = data.roomId; //socket.handshake.query.room as string;
        // IMPLEMENT JOINING ROOM ---------------------------------------------------
        const roomName = data.roomId;
        socket.join(roomName); //FOR DASHBOARD CUSTOMER BROADCAST
        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        if (clientsInRoom) {
            const roomies = Array.from(clientsInRoom);
            console.log(`Room: ${roomName}: Roomies:`, roomies);
            if (roomies.length === 2) {
                io.to(roomies[0]).emit("joinedRoom", data); // let first user know you've joined so they can send an offer
            }
            roompeers.push(data); //-- add second room peer info after notifying the first user
        }
        else {
            // console.log(`Room ${roomName} does not exist or is empty.`); // GOOD LOG
        }
        console.log(data.socketId, "New Peer-", roomName, data);
        // ---------------------------------------------------------------------------
    });
    socket.on("makeCall", (data) => {
        const { calleeId, sdpOffer } = data;
        socket.to(calleeId).emit("newCall", {
            callerId: user,
            sdpOffer,
        });
    });
    socket.on("answerCall", (data) => {
        const { callerId, sdpAnswer } = data;
        socket.to(callerId).emit("callAnswered", {
            callee: user,
            sdpAnswer,
        });
    });
    socket.on("IceCandidate", (data) => {
        const { calleeId, iceCandidate } = data;
        // console.log("-------iceCandidate-------", iceCandidate); // GOOD LOG
        socket.to(calleeId).emit("IceCandidate", {
            sender: user,
            iceCandidate,
        });
    });
    socket.on("endCall", (data) => {
        const { callerId, calleeId, roomId } = data;
        io.to(roomId).emit("terminate", {});
        console.log("this is the termination request to room", data);
    });
    socket.on("disconnect", () => {
        console.log(user, "disconnected");
        activeConnections = activeConnections.filter((u) => u !== user);
    });
});
const PORT = process.env.PORT || 9099;
server.listen(PORT, () => console.log(`CCL P2P Video Service ${PORT}`));
