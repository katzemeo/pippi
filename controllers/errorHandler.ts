export default async (
  { response }: { response: any; }, nextFn: any
) => {

  try {
    await nextFn();
  } catch (err) {
    console.log(err);
    response.status = 500;
    response.body = { msg: err.message };
  }
};