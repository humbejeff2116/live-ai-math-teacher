import { Client } from "@upstash/qstash";
import { env } from "../config/env.js";

const client = new Client({ token: env.qstashToken! });

export function pingRenderService() {
  return client.schedules.create({
    destination: env.koyebServiceUrl!,
    cron: "*/5 * * * *",
  });
}
