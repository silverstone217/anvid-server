import { Socket } from "socket.io";
import { rooms } from "../server.js";
import { RoomType } from "../types/user";
import { v4 as uuidv4 } from "uuid";

// Check if a room exists
export const checkIfRoomExists = (roomName: string): boolean => {
  return rooms.some((room) => room.name === roomName);
};

export const checkIfFreeRoom = () => {
  return rooms.length > 0;
};

export const firstEmptyRoom = () => {
  return rooms.find((rm) => rm.users.length < 2) || false;
};

export const checkIfUserIsRoom = (userId: string, roomName: string) => {
  return rooms.find((room) => room.name === roomName)?.users.includes(userId);
};

// Create a new room
export const createOrJoinRoom = (userId: string, socket: Socket) => {
  const existingRoom = rooms.find((room) => room.users.includes(userId));

  if (existingRoom) {
    return existingRoom; // L'utilisateur est déjà dans une salle
  }

  const room = firstEmptyRoom();

  if (room) {
    // Ajoute l'utilisateur à la salle existante
    room.users.push(userId);
    socket.to(room.name).emit("user_joined", {
      room,
      data: { user: "admin", message: `${userId} has joined th room` },
    });
    return room;
  } else {
    // Crée une nouvelle salle
    const newRoom: RoomType = {
      name: uuidv4().toString(),
      users: [userId],
    };
    rooms.push(newRoom);
    return newRoom;
  }
};

// Remove user from room
export const removeUserFromRoom = (userId: string, roomName: string) => {
  const room = rooms.find((room) => room.name === roomName);
  if (room) {
    room.users = room.users.filter((user) => user !== userId);
  }
  return room;
};
