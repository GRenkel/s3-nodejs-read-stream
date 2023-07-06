import fs from "fs";
import {pipeline} from "stream/promises";
import S3Stream from "./S3Stream.js";
import { S3 } from "@aws-sdk/client-s3";

const s3Options = {
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'AKIASAPZCURNPJOGDXVB',
        secretAccessKey: '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'
    }
};

console.log('Process id:', process.pid)

const s3Client = new S3(s3Options)
const Bucket = 'nodejs-video-stream';
const Key = 'nosferatu.mp4'

const objectParams = {Key, Bucket}
const {ContentLength} = await s3Client.headObject(objectParams)
console.log('FILE SIZE: ', ContentLength)
const videoStream = new S3Stream(s3Client, objectParams, ContentLength)

const writeStream = fs.createWriteStream('./downloaded-nosferatu.mp4')
try {
    await pipeline(videoStream, writeStream);
} catch (error) {
    console.log('ERROR: ', error)    
}
