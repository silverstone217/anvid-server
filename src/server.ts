import express, { urlencoded, json } from "express";
import "dotenv/config";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { DataVideoRoomResponse, MsgType, RoomType } from "./types/user";
import { createOrJoinRoom } from "./rooms/chat";
import { createOrJoinVRoom } from "./rooms/video";

export let rooms: RoomType[] = [];
export let vRooms: RoomType[] = [];
const port = process.env.PORT;
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = new Server(server, {
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

app.use(urlencoded({ extended: true }));
app.use(json());
// Enable CORS for Express routes (optional)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://anvid-chat.vercel.app",
      "http://192.168.1.5:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Optional
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the anonym chat app!" });
});

io.on("connection", (socket: Socket) => {
  console.log("A user connected");

  // Generate unique ID for user and emit to client
  const userId = uuidv4().toString().replace(/-/g, "");
  socket.emit("userId", { id: userId });
  socket.userId = userId;

  // Join or create room chat
  socket.on("join_or_create_room", (userId) => {
    // Check for existing rooms with one user
    const create_or_join = createOrJoinRoom(userId, socket);
    socket.join(create_or_join.name);

    socket.emit("chat_room", {
      room: create_or_join,
      data: { user: "admin", message: userId + " joined the room" },
    });
    // console.log(userId + " joined the room", create_or_join.name);
    // console.log("rooms: " + rooms.length);
  });

  // Send message
  socket.on("send_message", (data: MsgType) => {
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
    const create_or_join = createOrJoinVRoom(userId, socket);
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
  socket.on(
    "leave_room",
    ({ room, userId }: { userId: string; room: RoomType }) => {
      const lvRoom = rooms && rooms.find((rn) => rn.name === room.name);

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
          rooms = rooms.filter((rm) => rm.name !== room.name); // Supprimez la salle si elle est vide
        }
      }
    }
  );

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
    rooms.forEach((room) => {
      room.users = room.users.filter((user) => user !== socket.userId);
      if (room.users.length === 0) {
        rooms = rooms.filter((r) => r.name !== room.name); // Remove empty rooms
      }
    });
  });
});
// rooms.length = 0;
server.listen(port, () => {
  console.log("listening on *: ", port);
});
