import "./utils/console.ts";
import env from "./utils/env.ts";
import { Application, Router, send, Status } from "./deps.ts";
import errorHandler from "./controllers/errorHandler.ts";
import status_404 from "./controllers/404.ts";
import healthz from "./controllers/healthz.ts";
import getItems from "./controllers/getItems.ts";
import getItem from "./controllers/getItem.ts";
import uploadItems from "./controllers/uploadItems.ts";
import renderItem from "./controllers/renderItem.ts";

const PORT = env.PORT ? parseInt(env.PORT) : 8000;
const logRequest: boolean = env.SERVER_LOG_REQUEST === "true";

var ready = false;

function livez({ response }: { response: any; }) {
  console.debug(`livez() - ${ready}`);
  response.body = "Alive";
}

function readyz({ response }: { response: any; }) {
  console.debug(`readyz() - ${ready}`);
  if (ready) {
    response.body = "Ready";
    response.code = 200;
  } else {
    response.body = "Not Ready";
    response.code = 503;
  }
}

const router = new Router();
router
  .get("/healthz", healthz)
  .get("/livez", livez)
  .get("/readyz", readyz)
  .get("/render/:id", renderItem)  
  .get("/items/:team", getItems)
  .get("/item/:id", getItem)
  .post("/items/upload", uploadItems)

const app = new Application();

app.use(async (ctx: any, next: any) => {
  const req: any = ctx.request;
  const res: any = ctx.response;

  // Attach env to req.
  req.env = env;

  if (env.DEVELOPMENT_MODE !== 'true' && !req.secure) {
    //console.warn(`secure=${req.secure}, url=${req.url}`);

    // If TLS is enabled, enforce HTTPS connections.  Otherwise, rely on proxy / API gateway for HTTPS.
    if (env.ENABLE_TLS == 'true') {
      res.status = 403;
      res.body = { msg: "HTTPS Required" };
      return;
    }
  }

  await next();
});

app.use(errorHandler);
app.use(router.allowedMethods());

// Log requests and responses (including elapsed time warning if too slow)
if (logRequest) {
  app.use(async (ctx: any, next: any) => {
    const req: any = ctx.request;
    const res: any = ctx.response;
    const userAndRole = "public";
    console.debug(`--> [${userAndRole}] ${req.method} ${req.url}`);
    await next();
    const rt = res.headers.get("X-Response-Time") ?? "0";
    if (parseInt(rt, 10) > 2000) {
      console.warn(`${res.status ? res.status : "200"} [${userAndRole}] ${req.method} ${req.url.href} - ${rt}`);
    } else {
      console.debug(`${res.status ? res.status : "200"} [${userAndRole}] ${req.method} ${req.url.href} - ${rt}`);
    }
  });

  // Measure response time and set in header
  app.use(async (ctx: any, next: any) => {
    const start = Date.now();
    try {
      await next();
    } catch (e) {
      console.error(e);
      if (e.message === "User not authorized to perform operation!") {
        ctx.response.status = 403;
        ctx.response.body = { msg: "Not Authorized!" };
      } else if (e.message === "Request is not authenticated!") {
        ctx.response.status = 401;
        ctx.response.body = { msg: "Not Authenticated!" };
      }
    }

    const ms = Date.now() - start;
    ctx.response.headers.set("X-Response-Time", `${ms}ms`);
  });
}

app.use(router.routes());

const sendFile = async (ctx: any, pathname: string) => {
  if (logRequest) {
    console.debug(`sendFile(): ${pathname}`);
  }
  await send(ctx, pathname, {
    root: `${Deno.cwd()}/static`,
    index: "index.html",
  });
};

function setReponseHeaders(pathname: string, response: any) {
  let cacheControl = "";
  if (pathname.endsWith(".png") || pathname.endsWith(".ico")) {
    // Can be stored by any cache for 1 year.
    cacheControl = "public, max-age=31536000";
  } else if (pathname.endsWith(".js") || pathname.endsWith(".vue")) {
    response.headers.set("Content-Type", "text/javascript; charset=utf-8");
    // Can be cached by the browser (but not intermediary caches) for up to 10 minutes.
    cacheControl = "private, max-age=600";
  } else if (pathname.endsWith(".css")) {
    response.headers.set("Content-Type", "text/css; charset=utf-8");
    // Can be cached by the browser (but not intermediary caches) for up to 10 minutes.
    cacheControl = "private, max-age=600";
  } else if (pathname.endsWith(".html")) {
    response.headers.set("Content-Type", "text/html; charset=utf-8");
    cacheControl = "private, max-age=600";
  }

  if (env.DEVELOPMENT_MODE != 'true' && cacheControl) {
    response.headers.set("Cache-Control", cacheControl);
  }
}

// Send static content (for UI), redirect to home page if error.
app.use(async (ctx: any, next: any) => {
  const pathname = ctx.request.url.pathname;
  if (pathname.startsWith("/public")) {
    try {
      setReponseHeaders(pathname, ctx.response);
      await sendFile(ctx, pathname.substring(7));
    } catch (e) {
      //console.error(e);
      console.error(pathname);
      await next();
    }
  } else if (pathname == "" || pathname == "/") {
    ctx.response.redirect("/public/index.html");
  } else {
    await next();
  }
});

app.use(status_404);

const START = new Date();
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.info(`SERVER UP: ${START.toLocaleString()}, Time Zone: ${timezone} (Offset: ${START.getTimezoneOffset()})`);
if (env.DEVELOPMENT_MODE == 'true') {
  console.info(Deno.version ?? "Deno version unknown");
  console.warn("DEVELOPMENT_MODE=true, web resources will not be cached!");
  console.warn(`Deno CWD: "${Deno.cwd()}"`);
  if (window.location) {
    console.warn(`Location: "${window.location}"`);
  }
}

// Handle Ctrl-C
Deno.addSignalListener("SIGINT", () => {
  console.warn("SIGINT: Interrupted!");
  Deno.exit();
});

// Handle Ctrl-Break (Windows)
// Note: not supported on Mac/Linux
/*
Deno.addSignalListener("SIGBREAK", () => {
  console.warn("SIGBREAK: Interrupted!");
});
*/

// Handle graceful shutdown (i.e. kill -s SIGTERM <deno PID>)
// Note: not supported on WINDOWS
/*
Deno.addSignalListener("SIGTERM", () => {
  ready = false;
  console.warn("SIGTERM: Graceful shutdown initiated!");
  setTimeout(shutdown, 5*1000);
});

function shutdown() {
  console.warn("shutdown: Exiting...");
  Deno.exit();
}
*/

ready = true;

await app.listen({ port: PORT });
