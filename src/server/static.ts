import http from "node:http";
import type { AddressInfo } from "node:net";
import sirv from "sirv";

export interface StaticServer {
  url: string;
  close: () => Promise<void>;
}

export async function startStaticServer(root: string): Promise<StaticServer> {
  const serve = sirv(root, {
    dev: true,
    etag: true,
    single: false,
    ignores: false,
  });

  const server = http.createServer((request, response) => {
    serve(request, response, () => {
      response.statusCode = 404;
      response.end("Not found");
    });
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });

  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolvePromise, rejectPromise) => {
        server.close((error) =>
          error ? rejectPromise(error) : resolvePromise(),
        );
      }),
  };
}
