import {S3} from "@aws-sdk/client-s3";

const s3Options = {
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
};

export default {
    _client: new S3(s3Options),
    _bucket: process.env.BUCKET,

    async getObjectFileSize(Key) {
        const {ContentLength} = await this._client.headObject({
            Key,
            Bucket: this._bucket,
        });
        return ContentLength
    },

    async * initiateObjectStream(Key, start, end) {
        const streamRange = `bytes=${start}-${end}`

        const {Body: chunks} = await this._client.getObject({
            Key,
            Bucket: this._bucket,
            Range: streamRange
        })

        for await(const chunk of chunks) {
            yield chunk;
        }
    }
}
