import env from "../utils/env.ts";

export default async (
  { request, response }: { request: any; response: any },
) => {

  // Check if API Server is up
  let status: any = "UNKNOWN";
  if (env.SERVER_URL) {
    const url = new URL(env.SERVER_URL + "/livez");
    const headers = new Headers({
      "X-API-KEY": env.API_KEY ?? "",
    });

    try {
      const res = await fetch(url, {
        headers: headers,
      });
    
      if (res.status == 200) {
        status = "UP";
      } else {
        status = `DOWN (${res.status})`;
      }
    } catch (e) {
      console.error(e);
      status = "ERR";
    }
  }

  response.body = {
    title: env.TITLE,
    server: env.SERVER_URL ?? "NONE",
    time: new Date(),
    status: status,
  };
};
