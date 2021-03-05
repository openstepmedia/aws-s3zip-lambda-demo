/**
 * AWS Lambda function for zipping s3 assets
 *
 * sample event payload is:
 * const payload = {
 *  region: 'us-east-1',
 *  bucket: 'demobucket', <-- all assets in same bucket
 *  folder: 'audio/', <-- must have trailing slash
 *  files: [
 *    'file1.mp3',  <-- files in above folder
 *    'file2.mp3'
 *  ],
 *  zipBucket: 'demobucket', <-- bucket for resulting .zip file
 *  zipFolder: 'temp/', <-- must have trailing slash
 *  zipFileName: 'demo1.zip',
 *  signedUrlExpireSeconds: 60 * 60 * 10 <-- expiration time of signedUrl of s3object
 * }
 *
 * Caveats:
 * Current lambda has been tested on 5GB files
 * Lambda timeout should be at minimum 10 minutes
 * Lambda memory size should be at miminum 8GB
 */
'use strict'

const AWS = require('aws-sdk')
const s3Zip = require('s3-zip')

exports.handler = async (event, context) => {
  console.log('event', event)

  const params = JSON.parse(event.body).params
  const files = params.files
  const region = params.region
  const bucket = params.bucket
  const folder = params.folder

  const zipBucket = params.zipBucket
  const zipFolder = params.zipFolder
  const zipFileName = params.zipFileName
  const signedUrlExpireSeconds = parseInt(params.signedUrlExpireSeconds)

  const stage = event.requestContext.stage
  const domainName = event.requestContext.domainName

  if (!(files.length > 0)) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        statusCode: 'error',
        message: 'No files to zip'
      })
    }
  }

  // @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ApiGatewayManagementApi.html
  // Allows the Lambda function to communicate with the websocket client
  const api = new AWS.ApiGatewayManagementApi({
    endpoint: 'https://' + domainName + '/' + stage
  })

  // event.requestContext.connectionId contains the Websocket id
  const apiParams = {
    ConnectionId: event.requestContext.connectionId,
    Data: null
  }

  const s3 = new AWS.S3()

  // validate files and calculate total size of downlad
  let totalBytes = 0
  const invalidFiles = []
  for (const file of files) {
    const p = {
      Bucket: bucket,
      Key: folder + file
    }
    try {
      const headInfo = await s3.headObject(p).promise()
      totalBytes += headInfo.ContentLength
      console.log(headInfo)
    } catch (e) {
      invalidFiles.push(folder + file)
    }
  }

  if (invalidFiles.length) {
    console.error('Invalid files:' + invalidFiles.join(', '))
    const invalidResponse = JSON.stringify({
      message: 'Invalid files:' + invalidFiles.join(', '),
      statusCode: 'error'
    })

    apiParams.Data = invalidResponse
    await api.postToConnection(apiParams).promise()

    return {
      statusCode: 500,
      body: invalidResponse
    }
  }

  try {
    const body = s3Zip.archive({ region: region, bucket: bucket }, folder, files)
    const zipKey = zipFolder + zipFileName
    const zipParams = { params: { Bucket: zipBucket, Key: zipKey } }
    const zipFile = new AWS.S3(zipParams)

    const promise = new Promise((resolve, reject) => {
      zipFile.upload({ Body: body })
        .on('httpUploadProgress',
          async function (evt) {
            evt.statusCode = 'progress'
            evt.pctComplete = (100 * evt.loaded / totalBytes)
            apiParams.Data = JSON.stringify(evt)
            // communicate with the Websockets, returning the pctComplete
            await api.postToConnection(apiParams).promise()
          })
        .send(async function (e, r) {
          if (e) {
            e.statusCode = 'error'
            reject(e)
          } else {
            r.statusCode = 'success'
            r.Files = files
            r.Folder = folder
            r.SignedUrl = s3.getSignedUrl('getObject', {
              Bucket: zipBucket,
              Key: r.Key,
              Expires: signedUrlExpireSeconds
            })
            resolve(r)
          }
        })
    })

    // wait for s3zip process to complete
    const res = await promise

    // message push back through websocket with zip results
    apiParams.Data = JSON.stringify(res)
    await api.postToConnection(apiParams).promise()

    return {
      statusCode: 200,
      body: JSON.stringify(res)
    }
  } catch (e) {
    // send error messages back to websocket client
    apiParams.Data = JSON.stringify(e)
    await api.postToConnection(apiParams).promise()
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    }
  }
}
