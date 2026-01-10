export type ClientToServerMessage =
  | {
      type: "user_message";
      payload: {
        text: string;
      };
    }
  | {
      type: "close";
    }
  | { 
      type: "user_interrupt" 
    };

export type ServerToClientMessage =
  | {
      type: "ai_audio_chunk";
      payload: {
        audioBase64: string;
      };
    }
  | {
      type: "ai_message_chunk";
      payload: {
        textDelta: string;
        isFinal: boolean;
      };
    }
  | {
      type: "equation_step";
      payload: {
        id: string;
        description: string;
        equation: string;
      };
    }
  | {
      type: "ai_message";
      payload: {
        text: string;
      };
    }
  | {
    type: "ai_interrupted"
  }
