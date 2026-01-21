import { Client } from "@upstash/qstash";

const client = new Client({ token: process.env.QSTASH_TOKEN! });

export function pingRenderService() {
  return client.schedules.create({
    destination: process.env.RENDER_SERVICE_URL!,
    cron: "*/5 * * * *",
  });
}
