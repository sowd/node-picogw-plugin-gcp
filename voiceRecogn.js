const speech = require('@google-cloud/speech');
const fs = require('fs');
const exec = require('child_process').exec;

let pi;
let client;


exports.init = function(pluginInterface){
	pi = pluginInterface;
	// Creates a client
	client = new speech.SpeechClient();
}

exports.recognize = async function(data,config){
    return new Promise((ac,rj)=>{
		function convertData(cont){
			// Write data to file
			const webPath = pi.localStorage.path+'/../tmp.wav';

			var wbuf = new Buffer(data, 'base64');

			fs.writeFile(webPath, wbuf,(err)=>{
				if( err ){
					rj({errors:[{error:err,message:'could not write temporary file.'}]});
					return;
				}

				// Convert by ffmpeg
				exec(`ffmpeg -i ${webPath} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${webPath}.raw`, (err, stdout, stderr) => {
					if (err) {
						rj({errors:[{error:err,message:'Please install ffmpeg to run voice recognition.'}]});
						return;
					}
					// Converted
					fs.readFile(webPath+'.raw',function(err, _data) {
						if (err) {
							rj({errors:[{error:err,message:'Could not read ffmpeg-converted data.'}]});
							return;
						}
						data = _data;
						cont();

						fs.unlink(webPath,()=>{});
						fs.unlink(webPath+'.raw',()=>{});
					});
				});
			});
		}
		
		function recognize(){

			if( process.env.GOOGLE_APPLICATION_CREDENTIALS == null ){
				rj({errors:[{error:'No credentials supplied.'}]});
				return;
			}

			// Default values
			if( config == null ) config = {};
			config.encoding = config.encoding || 'LINEAR16';
			config.sampleRateHertz = config.sampleRateHertz || 16000;
			config.languageCode = config.languageCode || 'ja';

			const audioBytes = data.toString('base64');

			// The audio file's encoding, sample rate in hertz, and BCP-47 language code
			const audio = {
				content: audioBytes,
			};
			const request = {
				audio: audio,
				config: config,
			};

			// Detects speech in the audio file
			client
			.recognize(request)
			.then(data => {
				const response = data[0];
				const transcription = response.results
				.map(result => result.alternatives[0].transcript)
				.join('\n');
				ac({text:transcription});
				//pi.log(`Transcription: ${transcription}`);
			}).catch(err => {
				rj({errors:[{error:err}]});
			});
		};

		convertData(recognize);
    });
}

