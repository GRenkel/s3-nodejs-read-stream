import path from "path";

export function getRequestContentType(requestURL) {
  const extension = path.extname(requestURL);

  let contentType;

  switch (extension) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".mp4":
      contentType = "video/mp4";
      break;
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    default:
      contentType = "text/html";
  }

  return contentType;
}
