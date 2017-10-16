use('sake-bundle')
use('sake-outdated')
use('sake-version')

var os  = require('os')
var fs  = require('fs')
var tar = require('tar')

var extensionConversion = {
  win32:  '.zip',
  linux:  '.tar.gz',
  darwin: '.tar.gz',
}

var platformConversion = {
  win32:  'windows-386',
  linux:  'linux-386',
  darwin: 'darwin-amd64',
}

var gethUriPrefix  = 'https://gethstore.blob.core.windows.net/builds/'
var gethFilePrefix = 'geth-'
var gethVersion    = '1.7.2-1db4ecdc'

function downloadGeth(platform: string) {
    exec('mkdir .geth')

    var ext  = extensionConversion[platform]
    var file = gethFilePrefix
      + platformConversion[platform]
      + '-'
      + gethVersion
      + ext
    var uri  = gethUriPrefix + file

    console.log('Downloading "' + uri + '"')

    exec.sync(`curl -O "${ uri }"`)

    return file
}

task('start', function* (opts) {
  console.log(`Starting Geth-Node
              INSTANCE: ${ process.env.GAE_INSTANCE }
              GAE_MEMORY_MB: ${ process.env.GAE_MEMORY_MB }
              GAE_SERVICE: ${ process.env.GAE_SERVICE }
              GAE_VERSION: ${ process.env.GAE_VERSION }
              GCLOUD_PROJECT: ${ process.env.GCLOUD_PROJECT }
              NODE_ENV: ${ process.env.NODE_ENV }
              PORT: ${ process.env.PORT }
              `)
  var platform = os.platform()
  var testnet = (process.env.GAE_SERVICE == 'geth-node-testnet' ? '--testnet' : '')

  console.log(`Downloading Geth for ${ platform }`)
  switch(platform) {
    case 'win32':
      console.log('Windows is not currently supported')
      return
    default:
      try {
        fs.statSync('.geth/geth')
      } catch (e) {
        var file = downloadGeth(platform)
        console.log('Decompressing Geth')
        tar.x({
          file: file,
          sync: true,
          cwd: '.geth',
        })
        exec.sync('mv .geth/' + file.split('.tar')[0] + '/geth .geth')
      }
  }

  console.log('Starting Geth')
  status = (yield exec.interactive(`.geth/geth ${ testnet } --fast --cache=96 --datadir .ethereum --rpcport ${ process.env.PORT || 8080 }`)).status
})

task('auth', 'authenticate google sdk', (opts) => {
  exec('gcloud auth login')
})

task('deploy:testnet', 'deploy reader to appengine', (opts) => {
  exec('gcloud app deploy --quiet --project crowdstart-us app.testnet.yaml --version=v1')
})

task('deploy:ethereum', 'deploy reader to appengine', (opts) => {
  exec('gcloud app deploy --quiet --project crowdstart-us app.ethereum.yaml --version=v1')
})

task('browse', 'view application from web browser', (opts) => {
  exec('gcloud app browse -s geth-node-ethereum --project crowdstart-us app.ethereum.yaml')
})

task('logs', 'view application logs', (opts) => {
  exec('gcloud app logs tail -s geth-node-ethereum --project crowdstart-us app.ethereum.yaml')
})
