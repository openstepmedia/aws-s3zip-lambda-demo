'use strict'

const test = require('japa')
const WebSocket = require('ws')

// To run japa test: @see https://github.com/thetutlage/japa#readme
// node onzip.spec.js

test('onzip.ws', async (assert) => {
  // find this in AWS console: https://console.aws.amazon.com/apigateway/home
  // get the apiID and apiStage from the api gateway console
  const apiID = 'o9j2e49eig'
  const apiStage = 'demo'

  const params = {
    region: 'us-east-1',
    bucket: 's3zipdemo',
    folder: 'audio/',
    files: [
      'file1.mp3',
      'file2.mp3'
    ],
    zipBucket: 's3zipdemo',
    zipFolder: 'zipfiles/',
    zipFileName: 'audiofiles.zip',
    signedUrlExpireSeconds: 60 * 60 * 10
  }

  // find this in AWS console: https://console.aws.amazon.com/apigateway/home
  const url = 'wss://' + apiID + '.execute-api.us-east-1.amazonaws.com/' + apiStage
  const action = { action: 'onzip', params: params }

  try {
    const promise = new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.on('open', function open () {
        console.log('open')
        ws.send(JSON.stringify(action))
      })

      ws.on('message', function incoming (data) {
        console.log('raw:', data)
        const message = JSON.parse(data)
        if (message.statusCode === 'success') {
          console.log('completed')
          resolve()
        }

        if (message.statusCode === 'error') {
          console.log('message.error')
          resolve()
        }

        if (message.message === 'Internal server error') {
          console.log('message.message -- internal error')
          resolve()
        }
      })

      ws.on('error', function incoming (error) {
        console.log('ws.error:', error.toString())
      })

      ws.on('close', function incoming (data) {
        console.log('close:', data)
        resolve()
      })
    })
    await promise
  } catch (e) {
    console.error(e)
  }
}).timeout(0)
