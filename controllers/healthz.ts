export default ({ response }: { response: any; }) => {
  console.debug(`healthz() - returning 200 OK - "Healthy"`);
  response.body = "Healthy";
};
