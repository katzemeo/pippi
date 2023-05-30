import "./utils/console.ts";
import env from "./utils/env.ts";
import { Application, Router, send, Status, open } from "./deps.ts";
import errorHandler from "./controllers/errorHandler.ts";
import status_404 from "./controllers/404.ts";
import ping from "./controllers/ping.ts";
import getItems from "./controllers/getItems.ts";
import renderItem from "./controllers/renderItem.ts";

const HOST = env.HOST ?? "0.0.0.0";
const PORT = env.PORT ? parseInt(env.PORT) : 8000;
const logRequest: boolean = env.SERVER_LOG_REQUEST === "true";

// If true, implement file sending directly instead of using Oak send()
const DEPLOY_OAK_SEND_WORKAROUND = true;

function redirect(ctx: any) {
  let redirectURL = env.SERVER_URL;
  if (redirectURL) {
    const urlParams = ctx.request.url.search;
    if (urlParams) {
      redirectURL += `/public/index.html${urlParams}`;
    }
    ctx.response.redirect(redirectURL);
  }
}

const router = new Router();
router
  .get("/ping", ping)
  .get("/redirect", redirect)
  .get("/items/:team", getItems)
  .get("/render/:id", renderItem)

const app = new Application();

app.use(async (ctx, next) => {
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
  app.use(async (ctx, next) => {
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
  app.use(async (ctx, next) => {
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
    index: "pippi.html",
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
app.use(async (ctx, next) => {
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
    ctx.response.redirect("/public/pippi.html");
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

let server: any;
if (env.ENABLE_TLS == 'true') {
  console.info(`Listening on: https://${HOST ?? "localhost"}:${PORT}`);
  server = Deno.listenTls({
    hostname: HOST,
    port: PORT,
    certFile: env.TLS_CERT_FILE,
    keyFile: env.TLS_KEY_FILE,
  });
} else {
  console.info(`Listening on: http://${HOST ?? "localhost"}:${PORT}`);
  server = Deno.listen({
    hostname: HOST,
    port: PORT
  });
}

// Automatically open browser on localhost if "special" PORT is specified (requires allow-run)
if (PORT === 9999 && Deno.run !== undefined) {
  open(`http://localhost:${PORT}`);
}

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const requests = Deno.serveHttp(conn);
  for await (const { request, respondWith } of requests) {
    // Workaround issue with sending static contents with Deno Deploy and Oak!
    let { pathname } = new URL(request.url);
    if (DEPLOY_OAK_SEND_WORKAROUND && pathname.startsWith("/public")) {
      pathname = pathname.substring(7);
      let status = "200";
      try {
        const file = await Deno.readFile(`${Deno.cwd()}/static/${pathname}`);
        const response = new Response(file);
        setReponseHeaders(pathname, response);
        respondWith(response);
      } catch (error) {
        status = "404";
        respondWith(new Response(null, {
          status: Status.NotFound
        }));
      }
      if (logRequest) {
        if (status !== "200") {
          console.error(`Sending: ${pathname} [${status}]`);
        } else {
          console.debug(`Sending: ${pathname} [${status}]`);
        }
      }
    } else {
      const response = await app.handle(request, conn);
      if (response) {
        respondWith(response);
      }
    }
  }
}