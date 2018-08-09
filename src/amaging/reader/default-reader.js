
import pEvent from 'p-event'
import { httpError, fileTypeOrLookup } from '../lib/utils'

import debugFactory from 'debug'
const debug = debugFactory('amaging:reader:default')

export default () =>
  async function (req, res, next) {
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

    const stream = await amaging.file.requestReadStream()

    debug('Pipe stream in response.')
    stream.pipe(res)

    try {
      await pEvent(stream, 'end')
    } catch (err) {
      if ((err.code !== 'ENOENT') && (err.code !== 'NotFound') && (err.code !== 'NoSuchKey')) {
        throw err
      }
      throw httpError(404, 'File not found')
    }
  }
