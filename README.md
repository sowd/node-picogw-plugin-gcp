**node-picogw-plugin-gcp** is a plugin module for [PicoGW](https://github.com/KAIT-HEMS/node-picogw), a [Home Automation](https://en.wikipedia.org/wiki/Home_automation) and [Building Automation](https://en.wikipedia.org/wiki/Building_automation) devices gateway server, developed by [Kanagawa Institute of Technology, Smart House Research Center](http://sh-center.org/en/), released under [MIT license](https://opensource.org/licenses/mit-license.php).

### APIs

#### POST /v1/gcp/transcript?lang=[Language code (default is ja)]

Transcript the posted raw audio file (wav, raw, or flac) into given language. ffmpeg should be installed and available in $PATH.
List of possible language codes is [here](https://cloud.google.com/translate/docs/languages).

### Samples

curl -X POST -F file=@./NurserySample.wav http://localhost:8080/v1/gcp/transcript
curl -X POST -F file=@./child1.jpg http://localhost:8080/v1/gcp/image-label-detection
curl -X POST -F file=@./child1.jpg http://localhost:8080/v1/gcp/image-face-detection