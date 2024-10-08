declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      DATABASE_URL: string;
      PORT: string;
    }
  }
}

export {};

import { Socket } from "socket.io";

declare module "socket.io" {
  interface Socket {
    userId?: string; // Add userId as an optional property
  }
}
