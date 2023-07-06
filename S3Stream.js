class S3Stream {
    _client = null;
    _chunk_size = 10e6;
    iterator = 1;

    constructor(s3Client, objectParams) {
        this.client = s3Client
        this.objectParams = objectParams
    }

    async getObjectFileSize(){
        const { ContentLength } = await this.client.headObject(this.objectParams);
        return ContentLength
    }
    async * generateFileStream(start, end) {
        const streamRange = `bytes=${start}-${end}`

        const {Body: chunks} = await this.client.getObject({
            ...this.objectParams,
            Range: streamRange
        })

        for await(const chunk of chunks) {
            yield chunk;
        }
    
}};

export default S3Stream
