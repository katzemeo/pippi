import env from "./env.ts";
import { Colors } from "../deps.ts";

function getDateTime() {
  const dt = new Date();
  return `${dt.getFullYear().toString().padStart(4, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`;
}

console.debug = function (message?: any, ...optionalParams: any[]) {
  if (env.LOGGING_LEVEL !== "NONE" && env.LOGGING_LEVEL !== "INFO") {
    console.log(Colors.brightGreen("[" + getDateTime() + " DEBUG]"), message, ...optionalParams);
  }
};

console.info = function (message?: any, ...optionalParams: any[]) {
  if (env.LOGGING_LEVEL !== "NONE") {
    console.log(Colors.brightBlue("[" + getDateTime() + " INFO]"), message, ...optionalParams);
  }
};

console.warn = function (message?: any, ...optionalParams: any[]) {
  if (env.LOGGING_LEVEL !== "NONE") {
    console.log(Colors.yellow("[" + getDateTime() + " WARN]"), message, ...optionalParams);
  }
};

console.error = function (message?: any, ...optionalParams: any[]) {
  if (env.LOGGING_LEVEL !== "NONE") {
    console.log(Colors.brightRed("[" + getDateTime() + " ERROR]"), message, ...optionalParams);
  }
};
