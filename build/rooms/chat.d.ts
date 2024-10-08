import { Socket } from "socket.io";
import { RoomType } from "../types/user";
export declare const checkIfRoomExists: (roomName: string) => boolean;
export declare const checkIfFreeRoom: () => boolean;
export declare const firstEmptyRoom: () => false | RoomType;
export declare const checkIfUserIsRoom: (userId: string, roomName: string) => boolean | undefined;
export declare const createOrJoinRoom: (userId: string, socket: Socket) => RoomType;
export declare const removeUserFromRoom: (userId: string, roomName: string) => RoomType | undefined;
