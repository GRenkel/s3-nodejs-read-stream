import http from "http";
import fs from "fs";
import { pipeline } from "stream/promises";
import EventEmitter from "events";
import { serverLogger } from "./serverLogger.js";
import { getRequestContentType } from "./serverHelper.js";
import path from "path";
const fsPromises = fs.promises;
import S3Stream from "./S3Stream.js";
import { S3 } from "@aws-sdk/client-s3";

const CHUNK_SIZE = 10e6;


const s3Options = {
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIASAPZCURNPJOGDXVB",
    secretAccessKey: "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",
  },
};

const s3Client = new S3(s3Options);
const API_PORT = process.env.PORT || 3001;

const serverLogEmitter = new EventEmitter();
serverLogEmitter.on("log", (message, logFileName) =>
  serverLogger(message, logFileName)
);

async function serveVideoStream(request, response) {
  try {
    const controller = new AbortController();

    const Bucket = "nodejs-video-stream";
    const Key = "nosferatu.mp4";

    const objectParams = {
      Key,
      Bucket,
    };
    
    const s3Stream = new S3Stream(s3Client, objectParams);
    const videoSize = await s3Stream.getObjectFileSize()

    const requestedRange = request.headers.range;
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

    await pipeline(s3Stream.generateFileStream(start, end), response, {
      signal: controller.signal,
    });

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
    
    let requestedFile = path.basename(request.url) || "index.html"

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
