In this project, we will analyze a code that implements video streaming from an S3 bucket using Node.js. We will examine how the HTTP protocol for partial content (status 206) works and how Node.js streams are used to obtain ranges of a file from an S3 bucket.

It is worth noting that this project aims to propose a simpler approach to streaming data from an S3 bucket. While searching for references on the internet about this application, I noticed that there weren't as many resources as I had imagined, and some approaches were somewhat complex or even deprecated.

## ****The Scenario****

The developed code consists of an HTTP server implemented using only Node.js's native modules, which streams a movie stored in an S3 bucket. It is responsible for handling client requests and transmitting video content partially based on the byte ranges specified by the client. This way, it is possible to serve the content in small pieces, ensuring that the application is scalable due to the optimized use of the server's RAM.

# ****Understanding Partial Content Streaming via HTTP****

In the context of content streaming, it is essential to understand how selective data transmission works, where only specific parts of a file are transmitted instead of the entire file. This is particularly relevant when dealing with large files such as videos, as it allows saving computational resources, bandwidth, and enabling faster content playback.

The HTTP protocol supports partial content transmission through the use of status codes, headers, and ranges. The HTTP status code **`206`** (Partial Content) is used to indicate that only a portion of the content was sent in response to the client's request.

In this type of request, the **`Range`** header is used by the client to specify the desired content range. This header informs the server which part of the file the client is interested in receiving. The server can then process this information and respond with the correct portion of the file, including the necessary information in the response header.

When processing the client's request, the **`Content-Range`** response header is used to inform the client about the range of content being sent. It specifies the byte range of the content present in the response and the total size of the content. This information allows the client to understand the received portion of the file and correctly calculate the transmission progress.

To indicate the total size of the file content being sent by the server in fragments, the **`Content-Length`** header is added to the response to the request. This information is essential for the client, as it allows it to know how many bytes to expect and monitor the transmission progress.

The figure below illustrates the HTTP headers used in communication between a client and a server for sending a video in equal parts of 1024 bytes in size.

![S3_Video_Stream.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/a86bd8ec-a88d-49ee-be3b-b726a9f34a1e/S3_Video_Stream.png)

## ****Benefits of Using Streams for File Download****

Streams are a fundamental component in Node.js applications as they enable sequential reading and writing of data. Their use offers an efficient approach to handle various tasks, such as file manipulation and network communication. Generally, there are four types of streams in Node.js:

**Writable:** Used to write data sequentially;
**Readable:** Used to read data sequentially;
**Duplex:** Used for both reading and writing data sequentially;
**Transform:** Employed when you want to sequentially modify the data being read or written. For example, it could be applied to transform lines of a text file to lowercase as they are being read.

Several native Node.js modules implement Stream interfaces, including the HTTP module and the File System (fs), which, when combined, optimize the use of a server's RAM when receiving or sending large files.

For example, if we tried to send a 2GB file in an HTTP response without using streams, the file would first be loaded into RAM and then written to the response object. In this way, to process this request, the server would need to have enough available memory.

Contrary to the traditional method of loading an entire file into memory, streams process data in smaller chunks. Thus, when sending a 2GB file, the file would not be entirely loaded into memory. Instead, each of the fragments would be sequentially loaded into memory and written to the response object of the request, greatly optimizing the server's RAM usage.

Below is a simplified illustration of the difference between conventional file reading and reading through a Readable Stream.

![StreamNode.drawio.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/5bc0e5bd-ad51-4257-b37b-bc9abff80348/StreamNode.drawio.png)

In general, the following benefits can be pointed out when using Streams in Node.js for large-scale data processing:

1. **Memory efficiency**: When using streams, file data is read and transmitted in small chunks instead of loading the entire file into memory. This allows applications to handle large files without consuming an excessive amount of memory.
2. **Efficiency**: Streams allow data to be transmitted while being read, instead of waiting for the complete file to be read. This results in faster downloads as data is sent to the client as soon as it becomes available, without the need to wait for the entire file to be loaded into memory.
3. **Scalability**: With streams, it is possible to handle simultaneous downloads of multiple large files without overloading the server's resources. Data chunks are transmitted in real-time, making the process more efficient and scalable.
4. **Progressive responses**: Using streams allows clients to receive partial content while the file is being downloaded. This enables displaying a progress bar or starting content playback even before the complete download.
5. **Flexibility**: Streams provide flexibility to manipulate and transform data during transmission. Operations such as compression, encryption, or real-time data format conversion can be performed without storing the entire file on disk before performing these operations.

## ****Using Streams in Node.js with an S3 Bucket****

In an application that utilizes AWS cloud services, files like videos are commonly stored in an S3 bucket. Therefore, it is crucial to create an interface that implements a reading stream for the object saved in the bucket.

The code below presents the implementation of an S3 client that the application's server uses to partially obtain a file stored in an S3 bucket. Note that the **`initiateObjectStream`** function is a generator function, an extremely useful function type for dealing with streams.

```
import { S3 } from "@aws-sdk/client-s3";

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
    const { ContentLength } = await this._client.headObject({
      Key,
      Bucket: this._bucket,
    });
    return ContentLength
  },

  async * initiateObjectStream(Key, start, end) {
    const streamRange = `bytes=${start}-${end}`

    const { Body: chunks } = await this._client.getObject({
      Key,
      Bucket: this._bucket,
      Range: streamRange
    })

    for await (const chunk of chunks) {
      yield chunk;
    }
  }
}

```

Next, let's analyze the main parts of the object exported by this module:

1. **S3 client configuration**: First, an S3 client is created using the provided options, including the region and access credentials. This information is obtained from environment variables.
2. **Obtaining the object size**: The **`getObjectFileSize`** function is responsible for obtaining the size of the S3 object. It makes a call to the **`headObject`** method of the S3 client, providing the object's key (**`Key`**) and bucket (**`Bucket`**). The result is destructured to extract the **`ContentLength`**, which represents the object's size, and is returned as a numerical value.
3. **Initializing the object stream**: The **`initiateObjectStream`** function is used to initialize the S3 object stream based on the specified ranges. It receives the object key, start, and end of the range as arguments. The range is formatted as a string and used in the **`getObject`** method call of the S3 client. The result is destructured to extract the **`Body`**, which represents an iterable of chunks of the object being downloaded.
4. **Streaming the content**: The **`initiateObjectStream`** function is defined as an async generator function. It iterates over the chunks of the S3 object and returns them using the **`yield`** statement. This allows the server to consume the object's chunks asynchronously as they become available, without waiting for the complete download to finish.

This implementation utilizes the streaming features provided by the **`@aws-sdk/client-s3`** library and allows the server to transmit only specific chunks of the S3 object based on the ranges specified by the client. This way, real-time streaming of an object stored in the S3 bucket is possible.

## ****Streaming the Video in Real-Time via HTTP****

Now that we can partially obtain objects from an S3 bucket and generate a data stream, the final step is to enable an HTTP server to serve the video in real-time. For the proposed solution, the native HTTP module was used to instantiate the server, and the **`S3Client`** object refers to the module presented in the previous item.

For the sake of simplicity, the implementation related to server initialization will not be discussed here since its functionality is limited to serving a static HTML page with a video player and serving the video itself through the **`serveVideoStream`** function. If you have questions about how to implement this part, the code can be found [here](LINK GITHUB).

Below is the proposed function to handle the real-time video transmission.

In this function, there are several steps that enable partial content streaming. Let's analyze each of them:

```
async function serveVideoStream(request, response) {
  try {
    const controller = new AbortController();

    const videoKey = request.url.replace('/', '')

    const videoSize = await S3Client.getObjectFileSize(videoKey);

    const requestedRange = request.headers.range || '';
    const start = Number(requestedRange.replace(/\\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;

    response.statusCode = 206;
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Content-Range", `bytes ${start}-${end}/${videoSize}`);
    response.setHeader("Content-Length", contentLength);

    await pipeline(
      S3Client.initiateObjectStream(videoKey, start, end),
      response,
      { signal: controller.signal }
    );
  } catch (error) {
    //logs the error
  }
}

```

In this function, there are several steps that enable partial content streaming. Let's analyze each of them:

1. **Obtaining the video size**: The first step is to obtain the total size of the video to be transmitted. This is done by calling the **`getObjectFileSize`** function of the **`S3Client`** object. This function makes a request to the AWS S3 service to obtain the size of the object identified by the **`videoKey`** key. The size is returned as a numerical value.
2. **Processing the ranges**: Next, it is checked whether the HTTP request contains a **`range`** header to specify the desired content range. If the header exists, it is extracted and processed to determine the start and end of the requested range. This information is used to calculate the size of the partial content that will be sent.
3. **Setting up response headers**: The HTTP response is configured to indicate that the server is sending a partial response. The response status is set to 206 (Partial Content). The **`Accept-Ranges`**, **`Content-Range`**, and **`Content-Length`** headers are set to inform the client about the content range and the size of the partial content being sent.
4. **Streaming the content**: The **`pipeline`** function from the **`stream/promises`** module is used to initiate the streaming of the S3 object's content. This function takes as arguments an input stream (Readable Stream), an output stream (Writable Stream), and some options. The input stream is obtained by calling the **`initiateObjectStream`** function of the **`S3Client`** object, which returns a stream of chunks of the S3 object. The output stream is the HTTP response, represented by the **`response`** object. The **`signal`** option is set to the abort signal handler, which can be used to interrupt the streaming if necessary in case of application errors.

This function enables the server to transmit only specific parts of the requested video based on the ranges specified.

### ****Consuming the Video Stream****

This is undoubtedly the simplest part of the application, and a static page was used, incorporating the HTML tag **`<video>`**. The use of this tag allows embedding a video in a web page for the browser to play it. In this case, the **`src`** attribute points to the video file "nosferatu.mp4," and the defined MIME type is "video/mp4," indicating that the file is a video in MP4 format, as shown in the code snippet below.

```jsx
<video id="video" controls autoplay>
	<source src="/nosferatu.mp4" type="video/mp4">
		Sorry, it looks like your computer can't play it.
</video>
```

When the browser encounters this **`<video>`** tag with the **`src`** attribute, it will try to load the specified video file. If the server is configured to support the HTTP protocol for partial content (status 206), the browser will use this feature to stream the video in chunks as needed, instead of waiting for the entire video to be downloaded before starting playback.

The HTTP protocol for partial content (status 206) allows our server to send only specific parts of the requested video as per the "Range" header information sent by the browser.

## ****Conclusion****

In this project, we explored a code that implements video streaming using the HTTP protocol, Node.js, and the AWS S3 service. We focused on the functioning of the HTTP protocol for partial content (status 206) and the use of streams in Node.js to obtain ranges of a file from an S3 bucket.

The presented code illustrates how it is possible to transmit only specific parts of a video file using partial content streaming. This allows for more efficient streaming of videos, reducing the amount of data transmitted, and improving the user experience.

Furthermore, the use of streams in Node.js, along with the **`@aws-sdk/client-s3`** library, simplifies the obtaining of ranges from a file in an S3 bucket, making the process more efficient and scalable.

I hope this project has helped you understand the presented code and the functioning of partial content streaming using the HTTP protocol and Node.js. Understanding these concepts is essential for the development of applications and services involving efficient file transmission.