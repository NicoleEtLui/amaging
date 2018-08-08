
const {httpError, fileTypeOrLookup} = require('../lib/utils')

const debug = require('debug')('amaging:reader:default')

module.exports = () =>
  function (req, res, next) {
    const { amaging } = req
    const customer = amaging.options.cache

    debug('Start default reader for file: %j', amaging.file)

    if (!amaging.file.exists()) {
      debug('Stop default reader cause to not found file.')
      return next(httpError(404, 'File not found'))
    }

    debug('File exists!')

    const fileType = fileTypeOrLookup(amaging.file.contentType(), amaging.file.filename)

    res.setHeader('Content-Length', amaging.file.contentLength())
    res.setHeader('Content-Type', fileType)
    res.setHeader('Etag', amaging.file.eTag())
    res.setHeader('Cache-Control', `max-age=${customer['maxAge']}, ${customer['cacheControl']}`)
    res.setHeader('Last-Modified', amaging.file.lastModified())

    return amaging.file.requestReadStream(function (err, stream) {
      if (err) { return next(err) }

      debug('Pipe stream in response.')
      stream.on('error', function (err) {
        if ((err.code !== 'ENOENT') && (err.code !== 'NotFound') && (err.code !== 'NoSuchKey')) {
          return next(err)
        } else {
          return next(httpError(404, 'File not found'))
        }
      })
      return stream.pipe(res)
    })
  }
