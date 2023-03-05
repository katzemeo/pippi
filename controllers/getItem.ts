
const ERR_UNIMPLEMENTED_FEATURE = "Unimplemented feature error!";

export default async (
  { request, response, params }: { request: any; response: any; params: any; },
) => {
  const itemID = params.id;
  if (!itemID) {
    response.status = 400;
    response.body = { msg: "Invalid Item ID" };
    return;
  }

  try {
    console.debug(`getItem() - ItemID=${itemID}`);
    throw new Error(ERR_UNIMPLEMENTED_FEATURE);
  } catch (error) {
    //console.error(error);
    response.status = 500;
    response.body = { msg: ERR_UNIMPLEMENTED_FEATURE };
  }
};