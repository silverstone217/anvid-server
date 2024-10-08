import express, { urlencoded, json } from "express";
import "dotenv/config";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { MsgType, RoomType } from "./types/user";
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

  // WebRTC signaling
  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
    console.log(JSON.stringify(payload), "offer");
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
    console.log(JSON.stringify(payload), "answer");
  });

  socket.on("ice-candidate", (incoming) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    console.log(incoming.candidate, "candidate");
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
    // Quittez la salle actuelle

    // Supprimez la salle si elle est vide
    let rmRoom = rooms && rooms.find((rm) => rm.users.includes(userId));
    if (rmRoom) {
      rmRoom.users = rmRoom.users.filter((us) => us !== userId);
      // Émettre l'événement pour notifier que l'utilisateur a quitté
      io.to(rmRoom.name).emit("user_left", {
        room: rmRoom,
        data: { user: "admin", message: `${userId} has left the room` },
      });
      rooms = rooms.filter((r) => r.name !== rmRoom.name);
      rooms.push(rmRoom);
    }

    let vRmRoom = vRooms && vRooms.find((rm) => rm.users.includes(userId));
    if (vRmRoom) {
      vRmRoom.users = vRmRoom.users.filter((us) => us !== userId);
      vRooms = vRooms.filter((r) => r.name !== vRmRoom.name);
      vRooms.push(vRmRoom);
    }

    // Supprimez les salles vides
    rooms = rooms.filter((rm) => rm.users.length > 0);
    vRooms = vRooms.filter((rm) => rm.users.length > 0);
  });
});
// rooms.length = 0;
server.listen(port, () => {
  console.log("listening on *: ", port);
});
