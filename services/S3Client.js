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
    
    async getObjectFileSize(objectParams) {
        const {ContentLength} = await this._client.headObject(objectParams);
        return ContentLength
    },

    async * initiateFileStream(objectParams, start, end) {
        const streamRange = `bytes=${start}-${end}`

        const {Body: chunks} = await this._client.getObject({
            ...objectParams,
            Range: streamRange
        })

        for await(const chunk of chunks) {
            yield chunk;
        }
    }
}
