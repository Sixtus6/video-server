import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { IceCandidateData, IncomingCallData, OutgoingCallData, RoomData } from "./interfaces";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "CCL Video P2P Service" });
});

app.set("io", io);

let activeConnections: string[] = [];
let roompeers: RoomData[] = []; //connections


io.use((socket: Socket, next) => {
  const callerId = socket.handshake.query.callerId as string;

  if (callerId) {
    socket.data.user = callerId;
    next();
  } else {
    next(new Error("callerId is required"));
  }
});

io.on("connection", (socket: Socket) => {
  const user = socket.data.user;
  if (!user) return;

  activeConnections.push(user);
  console.log(`${user} Connected - ${socket.id}`);

  socket.join(user);
  socket.emit("userId", socket.id);
  socket.emit("users", activeConnections.filter((u) => u !== user)); //---Irrelevant: Just showing all the user socket currencly connected

  socket.on("joinRoom", (data: RoomData) => {

    socket.data.roomId =  data.roomId //socket.handshake.query.room as string;

    // IMPLEMENT JOINING ROOM ---------------------------------------------------
    const roomName = data.roomId;

    socket.join(roomName); //FOR DASHBOARD CUSTOMER BROADCAST

    const clientsInRoom = io.sockets.adapter.rooms.get(roomName);

    if (clientsInRoom) {

      const roomies = Array.from(clientsInRoom);
      console.log(`Room: ${roomName}: Roomies:`, roomies);

      if(roomies.length === 2){
        io.to(roomies[0]).emit("joinedRoom", data); // let first user know you've joined so they can send an offer
      }

      roompeers.push(data); //-- add second room peer info after notifying the first user


    } else {
      // console.log(`Room ${roomName} does not exist or is empty.`); // GOOD LOG
    }

    console.log(data.socketId, "New Peer-", roomName, data);


    // ---------------------------------------------------------------------------
  });

  socket.on("makeCall", (data: OutgoingCallData) => {
    const { calleeId, sdpOffer } = data;

    socket.to(calleeId).emit("newCall", {
      callerId: user,
      sdpOffer,
    });
  });

  socket.on("answerCall", (data: IncomingCallData) => {
    const { callerId, sdpAnswer } = data;

    socket.to(callerId).emit("callAnswered", {
      callee: user,
      sdpAnswer,
    });
  });

  socket.on("IceCandidate", (data: IceCandidateData) => {
    const { calleeId, iceCandidate } = data;

    // console.log("-------iceCandidate-------", iceCandidate); // GOOD LOG

    socket.to(calleeId).emit("IceCandidate", {
      sender: user,
      iceCandidate,
    });
  });

  socket.on("endCall", (data: any) => {
    const {callerId, calleeId, roomId}  = data;

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
