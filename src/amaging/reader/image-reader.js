
import { fileTypeOrLookup } from '../lib/utils'

import GMFilterEngine from '../../gm-filter/gm-filter'
import tmp from 'tmp'
import async from 'async'
import fs from 'fs'

import debugFactory from 'debug'
const debug = debugFactory('amaging:reader:image')

export default () =>
  function (req, res, next) {
    const { amaging } = req
    const { options } = amaging.file
    const acceptType = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/x-jg'
    ]

    debug('Start image reader for file: %j', amaging.file)

    if (!amaging.file.exists()) {
      debug('Stop image reader cause to not found file.')
      return next()
    }

    if (!options.length) {
      return next()
    }

    if (amaging.cacheFile.exists()) {
      debug('Stop image reader cause to cache file exists.')
      // really bad no?
      amaging.file = amaging.cacheFile
      return next()
    }

    const fileType = fileTypeOrLookup(amaging.file.contentType(), amaging.file.filename)
    if (!(acceptType.indexOf(fileType) > -1)) {
      debug('Stop image reader cause the file is not an image')
      return next()
    }

    const gmFilter = new GMFilterEngine()
    gmFilter.addOptions(options)

    if (!gmFilter.hasFilters()) {
      debug('Stop image reader cause to no filters match.')
      return next()
    }

    let tmpFile = null
    let writeStream = null
    let tmpStats = null

    debug('Begin image transform with filters. %j', gmFilter)

    return async.series([
      done =>
        tmp.file(function (err, _tmpFile) {
          tmpFile = _tmpFile
          return done(err)
        }),
      done =>
        amaging.file.requestReadStream(function (err, read) {
          if (err) { return done(err) }

          const write = fs.createWriteStream(tmpFile)
          read.pipe(write)
          return read.on('end', done)
        }),
      done => gmFilter.runOn(tmpFile, done),
      done =>
        fs.stat(tmpFile, function (err, stats) {
          tmpStats = stats
          return done(err)
        }),
      done =>
        amaging.cacheFile.requestWriteStream({
          ContentLength: tmpStats.size,
          ContentType: amaging.file.contentType()
        })
          .then(v => {
            writeStream = v
            done(null, v)
          })
          .catch(err => done(err)),
      function (done) {
        const tmpRead = fs.createReadStream(tmpFile)
        tmpRead.pipe(writeStream)
        return writeStream.on('close', () => done())
      },
      done => fs.unlink(tmpFile, done),
      done =>
        amaging.cacheFile.readInfo()
          .then(v => done(null, v))
          .catch(err => done(err)),
      function (done) {
        // really bad no?
        amaging.file = amaging.cacheFile
        return done()
      }
    ], err => next(err))
  }
