import env from "../utils/env.ts";
import { send, join, isAbsolute, ensureFile } from "../deps.ts";

async function renderItem(teamName: string, sprint: string|null = null, itemID: string) {
  let image: any = null;
  if (env.BASE_DIR) {
    if (teamName === "MY_TEAM") {
      teamName = env.TEAM_NAME;
    }
    const teamDir = join(env.BASE_DIR, teamName);
    if (!sprint || sprint === "<PI PLANNING>") {
      sprint = "BASE";
    }

    let fileName = `${itemID}.png`;
    image = join(teamName, sprint, fileName);
    let imagePath = join(teamDir, sprint, fileName);
    try {
      const file = await Deno.open(imagePath);
      Deno.close(file.rid);
    } catch (error) {
      //console.log(error);
      ensureFile(imagePath);
      image = "default_item.png";
    }
  }
  return image;
}

export default async (ctx: any) => {
  const itemID = ctx.params.id;
  if (!itemID) {
    ctx.response.status = 400;
    ctx.response.body = { msg: "Invalid Item ID" };
    return;
  }

  const urlParams = new URLSearchParams(ctx.request.url.search);
  let teamName: any = urlParams.get("team");
  const sprint: string|null = urlParams.get("sprint");

  if (!teamName || teamName === "MY_TEAM") {
    teamName = env.TEAM_NAME;
  }

  try {
    let data: any = await renderItem(teamName, sprint, itemID);
    if (data) {
      let root = env.BASE_DIR;
      if (!isAbsolute(root)) {
        root = join(Deno.cwd(), env.BASE_DIR);
      }
      ctx.response.headers.set("Cache-Control", "no-cache");
      await send(ctx, data, {
        root: root
      });
    }
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { msg: `Unable to render specified item ${itemID}` };
  }
};
