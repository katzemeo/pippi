export default ({ response }: { response: any; }) => {
  response.status = 404;
  response.body = { msg: "Not Found" };
};