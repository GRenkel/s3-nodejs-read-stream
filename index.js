import http from "http";
import path from "path";
import 'dotenv/config'
import fsPromises from "fs/promises";
import { pipeline } from "stream/promises";
import S3Client from "./services/S3Client.js";
import { serverLogEmitter } from "./serverLogger.js";
import { getRequestContentType } from "./serverHelper.js";

const CHUNK_SIZE = 3e6;
const API_PORT = process.env.PORT || 3001;

async function serveVideoStream(request, response) {

  try {
    const controller = new AbortController();

    const Bucket = process.env.BUCKET;
    const Key = request.url.replace('/', '')

    const objectParams = {
      Key,
      Bucket,
    };

    const videoSize = await S3Client.getObjectFileSize(objectParams);

    const requestedRange = request.headers.range || '';
    const start = Number(requestedRange.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;

    serverLogEmitter.emit(
      "log",
      `\nStarting byte: ${start}\nEnding byte: ${end}\nContent length:${contentLength}\n`,
      "requestChunks.txt"
    );

    response.statusCode = 206;
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Content-Range", `bytes ${start}-${end}/${videoSize}`);
    response.setHeader("Content-Length", contentLength);

    await pipeline(
      S3Client.initiateFileStream(objectParams, start, end), 
      response, 
      { signal: controller.signal }
    );
  } catch (error) {
    serverLogEmitter.emit(
      "log",
      `${error.name} - ${error.message}`,
      "errorLogs.txt"
    );
  }
}

const serveMainPage = async (request, response) => {
  try {
    let requestedFile = path.basename(request.url) || "index.html";

    const rawData = await fsPromises.readFile(
      path.join("./", "public", "views", requestedFile)
    );
    response.end(rawData);
  } catch (err) {
    serverLogEmitter.emit("log", `${err.name}: ${err.message}`, "errLog.txt");
    response.statusCode = 500;
    response.end();
  }
};

async function requestHandler(request, response) {
  serverLogEmitter.emit(
    "log",
    `${request.method}\t${request.url}`,
    "requestLogs.txt"
  );

  try {
    const contentType = getRequestContentType(request.url);

    response.setHeader("Content-Type", contentType);

    contentType === "video/mp4"
      ? serveVideoStream(request, response)
      : serveMainPage(request, response);
  } catch (error) {
    serverLogEmitter.emit(
      "log",
      `${error.name} - ${error.message}`,
      "errorLogs.txt"
    );
  }
}

http
  .createServer(requestHandler)
  .listen(API_PORT, () => console.log(`server listening o port ${API_PORT}`));


