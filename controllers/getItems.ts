import env from "../utils/env.ts";
import { join } from "https://deno.land/std@0.179.0/path/mod.ts";

async function readJSONFromFile(fileName: string) {  
  try {
    const text = await Deno.readTextFile(fileName);
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function getTeamItems(teamName: string, sprint: string|null = null) {
  let json: any = null;
  if (env.BASE_DIR) {
    if (teamName === "MY_TEAM") {
      teamName = env.TEAM_NAME;
    }
    const teamDir = join(env.BASE_DIR, teamName);
    if (!sprint || sprint === "<PI PLANNING>") {
      sprint = "BASE";
    }
    const fileName = `${sprint}.json`;
    json = await readJSONFromFile(join(teamDir, fileName));
    if (json) {
      if (!json.sprint) {
        json.sprint = sprint;
      }

      // Check available sprints for team and return back
      const entries: any = [];
      for await (const dirEntry of Deno.readDir(teamDir)) {
        if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
          entries.push(dirEntry.name.substring(0, dirEntry.name.length - 5));
        }
      }
      json.base = {};
      json.base[teamName] = entries.sort();
    }
  }
  return json;
}

export default async (
  { request, response, params }: { request: any; response: any; params: any; },
) => {
  const teamName = params.team;
  if (!teamName) {
    response.status = 400;
    response.body = { msg: "Invalid team name" };
    return;
  }

  const urlParams = new URLSearchParams(request.url.search);
  const sprint = urlParams.get("sprint");

  try {
    let data: any = await getTeamItems(teamName, sprint);
    response.body = data;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { msg: "Unable to get team items" };
  }
};