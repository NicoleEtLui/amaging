
{httpError} = require '../lib/utils'
assert = require('chai').assert

debug = require('debug') 'cache-resolver'

doneCacheWith = (res, file, headers, next) ->
  unless file
    debug('No file')
    next()
  else
    debug('Compare file headers ETag')
    info = file.info

    debug('info: ', info)
    debug('headers: ', headers)

    unless info?['ETag']
      next()
    else
      debug(headers['if-none-match'] + ' // ' + info['ETag'])
      if(headers['if-none-match'] != info['ETag'])
        next()
      else
        return httpError 304, 'Not Modified', res

module.exports = ->
  (req, res, next) ->
    amaging = req.amaging
    headers = req.headers

    #console.log 'OPTIONS: ', amaging.file.options.length

    if amaging.file.options.length == 0
      debug('AMAGING FILE')
      doneCacheWith(res, amaging.file, headers, next)
    else
      debug('AMAGING CACHE FILE')
      doneCacheWith(res, amaging.cacheFile, headers, next)