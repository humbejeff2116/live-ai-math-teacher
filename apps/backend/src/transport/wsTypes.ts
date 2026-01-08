export type WSMessage =
  | {
      type: "media";
      mediaType: "audio" | "video";
      payload: ArrayBuffer;
    }
  | {
      type: "event";
      name: "start" | "stop" | "heartbeat";
    }
  | {
      type: "error";
      message: string;
    };
