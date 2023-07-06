import {Readable} from 'stream'

class S3Stream extends Readable {
    _client = null;
    _chunk_size = 10e6;
    iterator = 1;

    constructor(s3Client, objectParams, fileSize, streamOptions) {
        super(streamOptions)
        this.client = s3Client
        this.fileSize = fileSize
        this.objectParams = objectParams
    }

    async _read() {
        const start = this._chunk_size * (this.iterator - 1);
        let end = this._chunk_size * this.iterator - 1;
        end = end > this.fileSize ? this.fileSize - 1 : end;
        this.iterator += 1;
        console.log('start: ', start)
        console.log('end: ', end)

        if (start >= this.fileSize) {
            console.log('END OF FILE')
            return this.push(null)
        }

        const streamRange = `bytes=${start}-${end}`
        console.log('stream range: ',  streamRange)
        try {

            const {Body: chunks} = await this.client.getObject({
                ...this.objectParams,
                Range: streamRange
            })
            const fetched = []
            for await(const chunk of chunks) {
                fetched.push(chunk)
            }
            const buffer = Buffer.concat(fetched)
            this.push(buffer)
            
    } catch (error) {
        this.destroy(error)
        console.log('Stream error', error)
    }

}};export default S3Stream
