// curl -X POST -F file=@./NurserySample.wav http://localhost:8080/v1/googletools/transcript
// curl -X POST -F file=@./child1.jpg http://localhost:8080/v1/googletools/image-label-detection
// curl -X POST -F file=@./child1.jpg http://localhost:8080/v1/googletools/image-face-detection

const fs = require('fs');
const voiceRecogn = require('./voiceRecogn.js');
const imageRecogn = require('./imageRecogn.js');

let pi;
let log = console.log; // eslint-disable-line no-unused-vars
let localStorage;

module.exports = {
    init: init,
    onCall: onProcCall,
    onUISetSettings: onUISetSettings,
};

/**
 * Initialize plugin
 * @param {object} pluginInterface The interface of picogw plugin
 */
function init(pluginInterface) {
    pi = pluginInterface;
    log = pi.log;
    localStorage = pi.localStorage;

    try {
        fs.statSync(pi.pluginfs._pluginPath+'/gapCredentials.json');
        const creds = fs.readFileSync(pi.pluginfs._pluginPath+'/gapCredentials.json','utf-8');
        pi.localStorage.setItem('credentials', JSON.parse(creds));
        initClouds();
    } catch(e){
        if( pi.localStorage.getItem('credentials', null) )
            initClouds();
    }

    // List available members
    /*
    function listMember(obj,pathPrefix){
        for( let k in obj ){
            if( typeof obj[k] == 'object') listMember(obj[k],pathPrefix+'.'+k);
            else if( typeof obj[k] == 'string' ) log(`${pathPrefix}.${k}=${obj[k]}`);
            else log(`${pathPrefix}.${k}=(${typeof obj[k]})`);
        }
    }
    listMember(pi,'pluginInterface');
    */
};

function isCloudInited(){ return voiceRecogn.isInited() && imageRecogn.isInited();}

function initClouds(){
    const creds = pi.localStorage.getItem('credentials', null);
    if( creds == null ) return ;

    //log('credentials path:'+pi.localStorage.path+'/credentials');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = pi.localStorage.path+'/credentials';

    voiceRecogn.init(pi);
    imageRecogn.init(pi);

    log('Cloud inited.');
}

/**
 * onCall handler of plugin
 * @param {string} method Caller method, accept GET only.
 * @param {string} path Plugin URL path
 * @param {object} args parameters of this call
 * @return {object} Returns a Promise object or object containing the result
 */
function onProcCall(method, path, args, transport, files) {
    return new Promise(async (ac,rj)=>{
        let e;
        switch(method.toLowerCase()){
        case 'get':
            if( path == null || path.length==0 ){
                //if( args.info == 'true')
                ac({transcript:{}})
            } else
                rj({success:false,errors:[{error:'GET is not implemented.'}]});
            break ;
        case 'post':
            if( files == null ){
                rj({errors:[{message:'No file posted for upload.'}]});
                return ;
            }
            if( !isCloudInited()){
                rj({errors:[{message:'The cloud credentials are not supplied.'}]});
                return ;
            }
            switch(path.toLowerCase()){
                default:
                    rj({errors:[{error:`path "${path}" is invalid.`}]});
                break ;
                case 'image-label-detection':
                        imageRecogn.labelDetection(files).then(re=>{
                            ac({success:true,result:re});
                        }).catch(e=>{
                            rj({success:false,errors:[{error:e,message:'Could not annotate the image'}]});
                        });
                break;
                case 'image-face-detection':
                        imageRecogn.faceDetection(files).then(re=>{
                            ac({success:true,result:re});
                        }).catch(e=>{
                            rj({success:false,errors:[{error:e,message:'Could not annotate the image'}]});
                        });
                break;
                case 'transcript':
                    let re = {success:true,result:[]};
                    for( let fkey in files ){
                        const f = files[fkey];
                        switch( f.name.slice(-4).toLowerCase() ){
                            default:
                                rj({success:false,errors:[{error:'the file extension should be .wav, .raw, or .flac.'}]});
                                break;

                            case '.wav':
                            case '.raw':
                            case 'flac':
                            // Voice recognition
                            try {
                                let vret = await voiceRecogn.recognize(
                                    f.data,
                                    {
                                        encoding : 'LINEAR16',
                                        sampleRateHertz : 16000,
                                        languageCode : args.lang||'ja',
                                    }
                                );
                    
                                re.result.push(vret);
                            } catch(e){
                                re.result.push(e);
                            }
            
                            ac(re);

                            break;
                        }
                    }
                break;

            }
            break;
        case 'delete':
        case 'put': // Used only for adding row to a spreadsheet.
        default :
            rj({errors:[{message:`Method ${method} is not suppoted.`}]});
            break ;
        }
    });
}


/**
 * Setting value rewriting event for UI
 * @param {object} newSettings Settings edited for UI
 * @return {object} Settings to save
 */
function onUISetSettings(newSettings) {
    if (newSettings.credentials != null) {
        pi.localStorage.setItem('credentials', JSON.parse(newSettings.credentials));
        newSettings.credentials = '[Keep secret]'; // Keep it secret
        initClouds();
    }
    return newSettings;
}