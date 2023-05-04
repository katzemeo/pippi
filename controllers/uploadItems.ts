import { propagateDueDate } from "./getItems.ts";

const MAX_JSON_FILE_SIZE = 500 * 1024;
const ERR_UPLOAD_FILE_SIZE = "Unable to upload.  Please check the file size.";
const ERR_UPLOAD_FILE_CONTENTS = "Unable to parse JSON file.  Please check file contents for team items.";
const ERR_UPLOAD_UNEXPECTED = "Unable to upload due to unexpected error.";
const ERR_UPLOAD_JSON_EXPECTED = "Invalid file type, JSON file expected.";

async function parseJSONTeamItems(uploadFilename: string, text: string) {
  try {
    const result = JSON.parse(text);
    console.debug(`Validating uploaded JSON file ${uploadFilename}...`);

    if (!result.name) {
      result.name = uploadFilename;
    }

    if (!result.squad) {
      result.squad = "My Squad";
    }

    if (!result.items) {
      throw new Error(`Missing items property!`);
    }

    const items: any = result.items.map((e: any) => ({
      index: e.index ?? Number(e.priority ?? 1),
      jira: e.jira ?? null,
      theme: e.theme ?? "BAU",
      priority: Number(e.priority ?? -1),
      summary: e.summary ?? "Item Summary Missing",
      description: e.description ?? "Item Description Missing",
      type: e.type ?? "FEAT",
      client: e.client ?? null,
      estimate: Number(e["estimate"]),
      unit: e["unit"] ?? "SP",
      ac: e.ac ?? null,
      t_shirt_size: e.t_shirt_size ?? "",
      status: e["status"] ?? "BACKLOG",
      assignee: e.assignee ?? null,
      reporter: e.reporter ?? null,
      creator: e.creator ?? null,
      created: e.created ?? null,
      updated: e.updated ?? null,
      resolved: e.resolved ?? null,
      due: e.due ?? null,
      sprint_start: e.sprint_start ?? null,
      sprint_end: e.sprint_end ?? null,
      release: e.release ?? null,
      completed: Number(e["completed"] ?? 0),
      remaining: Number(e["remaining"]) ?? null,
      action: e.action ?? null,
      children: e.children ?? null
    }));

    // Recursively propagate any due dates from child to parent items
    if (items) {
      items.forEach((feat: any) => {
        propagateDueDate(feat);
      });  
    }

    result.items = items;
    if (result.capacity) {
      result.capacity = Number(result.capacity);
    }
    result.date = result.date ?? new Date();

    return result;
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to parse for JSON file!`);
  }
}

export default async (
  { request, response, params }: { request: any; response: any; params: any },
) => {
  var data: any;
  try {
    const body = await request.body({ type: "form-data" });
    data = await body.value.read({
      maxFilesize: MAX_JSON_FILE_SIZE,
      maxSize: MAX_JSON_FILE_SIZE * 2,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof TypeError) {
      response.status = 413;
      response.body = { msg: ERR_UPLOAD_FILE_SIZE };
    } else {
      response.status = 400;
      response.body = { msg: ERR_UPLOAD_UNEXPECTED };
    }
    return;
  }

  if (
    data.files &&
    (data.files[0].contentType == "application/json")
  ) {
    let uploadFilename = data.files[0].originalName;
    console.debug(`Uploading items "${uploadFilename}" into team`);
    let json;
    if (data.files[0].content) {
      try {
        json = await parseJSONTeamItems(uploadFilename, new TextDecoder().decode(data.files[0].content));
        response.body = json;
      } catch (e) {
        console.error(e);
        response.status = 422;
        response.body = { msg: ERR_UPLOAD_FILE_CONTENTS };
      }
    } else {
      try {
        const stat = await Deno.stat(data.files[0].filename);
        if (stat.size <= MAX_JSON_FILE_SIZE) {
          json = await parseJSONTeamItems(uploadFilename, await Deno.readTextFile(data.files[0].filename));
          response.body = json;
        } else {
          response.status = 413;
          response.body = { msg: ERR_UPLOAD_FILE_SIZE };
        }
      } catch (e) {
        console.error(e);
        response.status = 422;
        response.body = { msg: ERR_UPLOAD_FILE_CONTENTS };
      } finally {
        Deno.remove(data.files[0].filename);
      }
    }
  } else {
    response.status = 415;
    response.body = { msg: ERR_UPLOAD_JSON_EXPECTED };
  }
};
