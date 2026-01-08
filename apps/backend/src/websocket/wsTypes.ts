export type ClientToServerMessage =
  | {
      type: "user_message";
      payload: {
        text: string;
      };
    }
  | {
      type: "close";
    };

export type ServerToClientMessage =
  | {
      type: "ai_message";
      payload: {
        text: string;
      };
    }
  | {
      type: "error";
      payload: {
        message: string;
      };
    };
