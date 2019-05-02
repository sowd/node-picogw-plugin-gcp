const vision = require('@google-cloud/vision');
const fs = require('fs');
const pathm = require('path');

let pi;
let log=console.log;
let client;

exports.init = function(pluginInterface){
	pi = pluginInterface;
	log=function(msg){pi.log(' imageRecognition> '+msg);}
	// Create a client
	client = new vision.ImageAnnotatorClient();

	['faceDetection','labelDetection'].forEach(funcName=>{
		exports[funcName] = genImageAnnotationFuncGeneric(funcName);
	});
}

function genImageAnnotationFuncGeneric(funcName){
	return function(files){
		function body(file){
			return new Promise((ac,rj)=>{
				/*
				file.name=NurserySample.wav
				file.data=object
				file.encoding=7bit
				file.truncated=boolean
				file.mimetype=application/octet-stream
				file.md5=9a8c8dff2164fe5c929fe38165b9c61e
				file.mv = function
				*/
				createFile(file).then(webPath=>{

					function deleteAndReturn(retObj){
						deleteFile(webPath)
						.then(()=>{
							ac(retObj);
						}).catch(e=>{
							retObj.fileDeleteError = e;
							ac(retObj);
						})
					}
					
					// Call client func names 'funcName' in general
					client[funcName](webPath)
						//.labelDetection(webPath)
						.then(results => {
							deleteAndReturn(results[0]);
						})
						.catch(e => {
							deleteAndReturn({success:false,errors:[{error:e}]});
						});
				}).catch(e=>{
					ac({success:false,errors:[{error:e,message:'Could not create temporary file'}]});
				});
			});
		}

		return new Promise(async (ac,rj)=>{
			let re = [];
			for( let fkey in files ){
				re.push( await body(files[fkey]) );
			}
			ac(re);
		});
	}
}

/*
exports.annotate = function(files){
	function body(file){
		return new Promise((ac,rj)=>{
			createFile(file).then(webPath=>{
				function deleteAndReturn(retObj){
					deleteFile(webPath)
					.then(()=>{
						ac(retObj);
					}).catch(e=>{
						retObj.fileDeleteError = e;
						ac(retObj);
					})
				}
				
				client
					.labelDetection(webPath)
					.then(results => {
						let resultObj = (
							results[0].success
							? {success:true,result:results[0].result}
							: results[0]);
							deleteAndReturn(resultObj);
						})
					.catch(e => {
						deleteAndReturn({success:false,errors:[{error:e}]});
					});
			}).catch(e=>{
				ac({success:false,errors:[{error:e,message:'Could not create temporary file'}]});
			});
		});
	}

	return new Promise(async (ac,rj)=>{
		let re = [];
		for( let fkey in files ){
			re.push( await body(files[fkey]) );
		}
		ac(re);
	});
}
*/

function createFile(fileObj){
	return new Promise((ac,rj)=>{
		const webPath = pathm.join(pi.localStorage.path,'..',fileObj.name);
		var wbuf = new Buffer(fileObj.data, 'base64');

		fs.writeFile(webPath, wbuf,(err)=>{
			if( err ) rj({success:false,errors:[{error:err,message:'Could not create file:'+webPath}]});
			else ac(webPath);
		});
	});
}
function deleteFile(path){
	return new Promise((ac,rj)=>{
		fs.unlink(path, function (err) {
			if(err) rj(err);
			else ac(null);
		});
});
}

/*
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

*/