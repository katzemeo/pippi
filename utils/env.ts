import { load } from "../deps.ts";

async function loadEnv() {
  if (window._env) {
    console.debug(`loadEnv()`);
  }

  const shellenv: any = Deno.env.toObject();
  const options: any = {
    safe: true,
  }

  // Support overriding the location of the .env file via environment variable
  if (shellenv.ENV_PATH) {
    options.path = shellenv.ENV_PATH;
    //console.log(`Loading .env from "${options.path}" ...`);
  }
  let env = await load(options);

  // Support overriding/setting key values from environment variable

  if (shellenv.DEVELOPMENT_MODE) {
    env['DEVELOPMENT_MODE'] = shellenv.DEVELOPMENT_MODE;
  }

  if (shellenv.LOGGING_LEVEL) {
    env['LOGGING_LEVEL'] = shellenv.LOGGING_LEVEL;
  }

  if (shellenv.ENABLE_TLS) {
    env['ENABLE_TLS'] = shellenv.ENABLE_TLS;
  }

  if (shellenv.TLS_CERT_FILE) {
    env['TLS_CERT_FILE'] = shellenv.TLS_CERT_FILE;
  }

  if (shellenv.TLS_KEY_FILE) {
    env['TLS_KEY_FILE'] = shellenv.TLS_KEY_FILE;
  }

  //console.log(env);

  return env;
}

declare global {
  var _env: any;
  interface Window { _env: any; }
}
window._env = await loadEnv();

export default window._env;