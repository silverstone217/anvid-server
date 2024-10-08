import express, { urlencoded, json } from "express";
import "dotenv/config";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { MsgType, RoomType } from "./types/user";
import { createOrJoinRoom } from "./rooms/chat";

export let rooms: RoomType[] = [];
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

  // Join or create room
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
  socket.on("disconnect", (userId: string) => {
    console.log("User disconnected");
    // TODO: Remove user from all rooms and handle disconnect gracefully

    rooms = rooms.filter((rm) => rm.users.length > 0); // Supprimez la salle si elle est vide
  });
});
// rooms.length = 0;
server.listen(port, () => {
  console.log("listening on *: ", port);
});
