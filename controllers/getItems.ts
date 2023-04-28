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

async function loadPreviousSprint(json: any, teamName: string, teamDir: string) {
  if (json.base && json.base[teamName].length > 0) {
    let index = json.base[teamName].indexOf(json.sprint);
    if (index > 0) {
      const previousSprint = json.base[teamName][index - 1];
      return await readSprintFile(teamDir, previousSprint);
    }
  }
  return null;
}

function valueEquals(v1: any, v2: any) {
  if (v1 == v2) {
    return true;
  } else if (v1 && v2) {
    if (v1 instanceof Array && v2 instanceof Array) {
      if (v1.length != v2.length) {
        return false;
      }

      for (let i=0; i < v1.length; i++) {
        if (v1[i] instanceof Array && v2[i] instanceof Array) {
          if (!valueEquals(v1[i], (v2[i]))) {
            return false;
          }
        } else if (!valueEquals(v1[i], v2[i])) {
          return false;
        }
      }
    }
  }
  return false;
}

async function computeDelta(json: any, teamName: string, teamDir: string) {
  const teamKeys = ["name", "squad", "sp_per_day_rate", "capacity", "computed_sp", "completed", "remaining"];
  const base: any = { added: {}, updated: {}, unchanged: {}, removed: {} };
  const itemMap: any = {};

  function compareItem(item: any) {
    // Compare with base data, build change log
    const baseItem = itemMap[item.jira];
    if (baseItem) {
      // Compare base and item and checked if any values changed
      baseItem.matched = true;
      let diffs = Object.fromEntries(Object.entries(item).filter(([k, v]) =>
        k !== "completed" && k != "remaining" && k != "computed_sp" &&
        k !== "updated" && k != "resolved" && k != "assignee" && k !== "summary" && k != "description" && k != "ac" &&
        k != "children" && !valueEquals(baseItem[k], v)));
      if (Object.keys(diffs).length > 0) {
        let changes: any = { type: item.type, diffs: [], summary: item.summary };
        Object.entries(diffs).forEach(([k, v]) => {
          let c: any = {};
          c["key"] = k;
          c["old"] = baseItem[k] ?? "(none)";
          c["new"] = v ?? "(none)";
          changes.diffs.push(c);
        });
        //console.log(changes);
        base.updated[item.jira] = changes;
        item.delta = "updated";
      } else {
        base.unchanged[item.jira] = item.summary;
      }
    } else {
      //console.log(`Adding item ${item.jira}`);
      let changes: any = { estimate: item.estimate, summary: item.summary };
      base.added[item.jira] = changes;
      item.delta = "new";
    }

    if (item.children) {
      item.children.forEach((child:any) => {
        compareItem(child);
      });  
    }  
  }

  function mapItemsByJira(item: any) {
    if (item.children) {
      item.children.forEach((child:any) => {
        mapItemsByJira(child);
      });
    }
  
    if (item.jira) {
      itemMap[item.jira] = item;
    }
  }

  const previous = await loadPreviousSprint(json, teamName, teamDir);
  if (previous) {
    // Prepare base for comparison
    previous.items.forEach((child:any) => {
      mapItemsByJira(child);
    });
    teamKeys.forEach((k) => {
      base[k] = json[k];
    });

    // Recursively compare changes with previous items
    json.items.forEach((feat: any) => {
      compareItem(feat);
    });

    // Build change log for each feature
    json.items.forEach((feat: any) => {
      const baseItem = itemMap[feat.jira];
      if (baseItem) {
        teamKeys.forEach((k) => {
          if (baseItem[k] !== feat[k]) {
            let changes: any = base.updated[feat.jira];
            if (!changes) {
              changes = { diffs: [], summary: feat.summary, type: feat.type };
              base.updated[feat.jira] = changes;
            }
            let c: any = {};
            //c[k] = `${baseItem[k]} -> ${feat[k]}`;
            c["key"] = k;
            c["old"] = baseItem[k] ?? "(none)";
            c["new"] = feat[k] ?? "(none)";
            changes.diffs.push(c);
          }
        });  
      }
    });

    // Compare totals to see if any progress / scope changed
    teamKeys.forEach((k) => {
      if (previous[k] !== json[k]) {
        //base.updated[k] = `${previous[k]} -> ${json[k]}`;
        base.updated["key"] = k;
        base.updated["old"] = previous[k] ?? "(none)";
        base.updated["new"] = json[k] ?? "(none)";
      }  
    });

    Object.values(itemMap).forEach((item: any) => {
      if (!item.matched) {
        let changes: any = { estimate: item.estimate, summary: item.summary };
        base.removed[item.jira] = changes;    
      }
    });

    console.debug("#".repeat(80));
    console.debug(base.updated);
    console.debug("+".repeat(80));
    console.debug(base.added);
    console.debug("-".repeat(80));
    console.debug(base.removed);
  }

  return base;
}

async function readSprintFile(teamDir: string, sprint: string) {
  const fileName = `${sprint}.json`;
  const json = await readJSONFromFile(join(teamDir, fileName));
  return json;
}

async function getTeamItems(teamName: string, sprint: string|null = null, delta: boolean = false) {
  let json: any = null;
  if (env.BASE_DIR) {
    if (teamName === "MY_TEAM") {
      teamName = env.TEAM_NAME;
    }
    const teamDir = join(env.BASE_DIR, teamName);
    if (!sprint || sprint === "<PI PLANNING>") {
      sprint = "BASE";
    }

    json = await readSprintFile(teamDir, sprint);
    if (json) {
      if (!json.sprint) {
        json.sprint = sprint;
      } else if (json.sprint !== sprint) {
        console.warn(`getTeamItems("${teamName}", "${sprint}") - does not match with sprint in file "${json.sprint}"`);
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
      if (delta) {
        json.delta = await computeDelta(json, teamName, teamDir);
      }
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
  const delta = urlParams.get("delta") === "true";

  try {
    let data: any = await getTeamItems(teamName, sprint, delta);
    response.body = data;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { msg: "Unable to get team items" };
  }
};