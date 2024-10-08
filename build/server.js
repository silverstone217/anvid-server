"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vRooms = exports.rooms = void 0;
const express_1 = __importStar(require("express"));
require("dotenv/config");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const chat_1 = require("./rooms/chat");
const video_1 = require("./rooms/video");
exports.rooms = [];
exports.vRooms = [];
const port = process.env.PORT;
const app = (0, express_1.default)();
const http = require("http");
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://anvid-chat.vercel.app",
            "http://192.168.1.5:3000",
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true, // Optional: if you need to send cookies or HTTP authentication
    },
});
app.use((0, express_1.urlencoded)({ extended: true }));
app.use((0, express_1.json)());
// Enable CORS for Express routes (optional)
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://anvid-chat.vercel.app",
        "http://192.168.1.5:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Optional
}));
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to the anonym chat app!" });
});
io.on("connection", (socket) => {
    console.log("A user connected");
    // Generate unique ID for user and emit to client
    const userId = (0, uuid_1.v4)().toString().replace(/-/g, "");
    socket.emit("userId", { id: userId });
    socket.userId = userId;
    // Join or create room chat
    socket.on("join_or_create_room", (userId) => {
        // Check for existing rooms with one user
        const create_or_join = (0, chat_1.createOrJoinRoom)(userId, socket);
        socket.join(create_or_join.name);
        socket.emit("chat_room", {
            room: create_or_join,
            data: { user: "admin", message: userId + " joined the room" },
        });
        // console.log(userId + " joined the room", create_or_join.name);
        // console.log("rooms: " + rooms.length);
    });
    // Send message
    socket.on("send_message", (data) => {
        const { room, message, userId } = data;
        io.to(room.name).emit("receive_message", {
            room,
            data: {
                user: userId,
                message: message,
            },
        });
    });
    // Video call launching
    socket.on("join_or_create_video_room", (userId) => {
        // Check for existing rooms with one user
        const create_or_join = (0, video_1.createOrJoinVRoom)(userId, socket);
        socket.join(create_or_join.name);
        socket.emit("video_room", {
            room: create_or_join,
            data: { user: "admin", message: userId + " joined the video room" },
        });
        // console.log(userId + " joined the room", create_or_join.name);
        // console.log("rooms: " + rooms.length);
    });
    // Video call receiving
    socket.on("localVideo", (payload) => {
        const { room, candidate } = payload;
        // console.log("Candidat reçu :", candidate);
        socket.to(room.name).emit("localVideo", payload);
    });
    // Handle video offer
    socket.on("video_offer", (payload) => {
        const { room, offer, userId } = payload;
        // console.log("Offre vidéo reçue :", offer);
        socket.to(room.name).emit("video_offer", {
            offer,
            userId,
        });
    });
    // Handle video answer
    socket.on("video_answer", (payload) => {
        const { room, answer, userId } = payload;
        // console.log("Réponse vidéo reçue :", answer);
        socket.to(room.name).emit("video_answer", {
            answer,
            userId,
        });
    });
    // Leave room event
    socket.on("leave_room", ({ room, userId }) => {
        const lvRoom = exports.rooms && exports.rooms.find((rn) => rn.name === room.name);
        if (lvRoom) {
            // Retirer l'utilisateur de la salle
            lvRoom.users = lvRoom.users.filter((uId) => uId !== userId);
            // Émettre l'événement pour notifier que l'utilisateur a quitté
            io.to(room.name).emit("user_left", {
                room,
                data: { user: "admin", message: `${userId} has left the room` },
            });
            // Si la salle est vide après le départ de l'utilisateur, vous pouvez choisir de la supprimer
            if (lvRoom.users.length === 0) {
                exports.rooms = exports.rooms.filter((rm) => rm.name !== room.name); // Supprimez la salle si elle est vide
            }
        }
    });
    // Disconnect event
    socket.on("disconnect", () => {
        console.log(`User ${socket.userId} disconnected`);
        // Notify other users in the room
        const roomsJoined = Array.from(socket.rooms);
        roomsJoined.forEach((room) => {
            io.to(room).emit("user_left", {
                room,
                data: { user: "admin", message: `${socket.userId} has left the room` },
            });
        });
        // Clean up rooms
        exports.rooms.forEach((room) => {
            room.users = room.users.filter((user) => user !== socket.userId);
            if (room.users.length === 0) {
                exports.rooms = exports.rooms.filter((r) => r.name !== room.name); // Remove empty rooms
            }
        });
    });
});
// rooms.length = 0;
server.listen(port, () => {
    console.log("listening on *: ", port);
});
//# sourceMappingURL=server.js.map