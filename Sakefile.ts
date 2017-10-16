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

task('build', (opts) => {
  exec('tsc')
})

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

task('start', ['build'], function* (opts) {
  var platform = os.platform()

  switch(platform) {
    case 'win32':
      console.log('not supported')
      return
    default:
      try {
        fs.statSync('.geth/geth')
      } catch (e) {
        var file = downloadGeth(platform)
        tar.x({
          file: file,
          sync: true,
          cwd: '.geth',
        })
        exec.sync('mv .geth/' + file.split('.tar')[0] + '/geth .geth')
      }
  }

  status = (yield exec.interactive('.geth/geth --testnet --datadir .ethereum')).status
})

task('auth', 'authenticate google sdk', (opts) => {
  exec('gcloud auth login')
})

task('deploy', 'deploy reader to appengine', ['build'], (opts) => {
  exec('gcloud app deploy --quiet --project crowdstart-us app.yaml --version=v1')
})

task('browse', 'view application from web browser', (opts) => {
  exec('gcloud app browse -s ethereum-reader --project crowdstart-us app.yaml')
})

task('logs', 'view application logs', (opts) => {
  exec('gcloud app logs tail -s ethereum-reader --project crowdstart-us app.yaml')
})
