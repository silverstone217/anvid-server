"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUserFromRoom = exports.createOrJoinRoom = exports.checkIfUserIsRoom = exports.firstEmptyRoom = exports.checkIfFreeRoom = exports.checkIfRoomExists = void 0;
const server_js_1 = require("../server.js");
const uuid_1 = require("uuid");
// Check if a room exists
const checkIfRoomExists = (roomName) => {
    return server_js_1.rooms.some((room) => room.name === roomName);
};
exports.checkIfRoomExists = checkIfRoomExists;
const checkIfFreeRoom = () => {
    return server_js_1.rooms.length > 0;
};
exports.checkIfFreeRoom = checkIfFreeRoom;
const firstEmptyRoom = () => {
    return server_js_1.rooms.find((rm) => rm.users.length < 2) || false;
};
exports.firstEmptyRoom = firstEmptyRoom;
const checkIfUserIsRoom = (userId, roomName) => {
    var _a;
    return (_a = server_js_1.rooms.find((room) => room.name === roomName)) === null || _a === void 0 ? void 0 : _a.users.includes(userId);
};
exports.checkIfUserIsRoom = checkIfUserIsRoom;
// Create a new room
const createOrJoinRoom = (userId, socket) => {
    const existingRoom = server_js_1.rooms.find((room) => room.users.includes(userId));
    if (existingRoom) {
        return existingRoom; // L'utilisateur est déjà dans une salle
    }
    const room = (0, exports.firstEmptyRoom)();
    if (room) {
        // Ajoute l'utilisateur à la salle existante
        room.users.push(userId);
        socket.to(room.name).emit("user_joined", {
            room,
            data: { user: "admin", message: `${userId} has joined th room` },
        });
        return room;
    }
    else {
        // Crée une nouvelle salle
        const newRoom = {
            name: (0, uuid_1.v4)().toString(),
            users: [userId],
        };
        server_js_1.rooms.push(newRoom);
        return newRoom;
    }
};
exports.createOrJoinRoom = createOrJoinRoom;
// Remove user from room
const removeUserFromRoom = (userId, roomName) => {
    const room = server_js_1.rooms.find((room) => room.name === roomName);
    if (room) {
        room.users = room.users.filter((user) => user !== userId);
    }
    return room;
};
exports.removeUserFromRoom = removeUserFromRoom;
//# sourceMappingURL=chat.js.map