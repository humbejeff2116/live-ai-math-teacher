import type { ServerToClientMessage, TeacherState } from "@shared/types";
import { useReducer } from "react";

function reducer(
  _: TeacherState,
  message: ServerToClientMessage
): TeacherState {
  switch (message.type) {
    case "teacher_thinking":
      return "thinking";
    case "teacher_explaining":
      return "explaining";
    case "teacher_reexplaining":
      return "re-explaining";
    case "teacher_interrupted":
      return "interrupted";
    case "teacher_waiting":
      return "waiting";
    default:
      return _;
  }
}

export function useTeacherState() {
  return useReducer(reducer, "idle");
}
