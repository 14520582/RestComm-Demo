import { WebRTCommClient } from './WebRTComm'

var wrtcClient;
var wrtcEventListener = undefined;
var wrtcConfiguration = undefined;
var localStream;
var remoteMedia;
var username;
var inCall = false;

export class WrtcEventListener {
    device: Device
    constructor(device: Device){
        if (device.debugEnabled) {
            console.log("WrtcEventListener::WrtcEventListener constructor");
        }
        this.device = device
    }
}


export class Connection {
    constructor(){      
    }
   
}


export class Device {
	public status: string = 'offline';
	public connection: Connection;
    public debugEnabled: boolean = false;
    public sounds = new Sound()

    constructor(){      
    }

    setup(parameters: any) {
        if ('debug' in parameters && parameters['debug'] == true) {
            this.debugEnabled = true;
        }

        if (this.debugEnabled) {
            console.log("Device::setup(): " + JSON.stringify(parameters));
        }

        // if parameters.registrar is either unset or empty we should function is registrar-less mode
        //if (parameters['registrar'] && parameters['registrar'] != "") {
        // let's default to register until https://github.com/Mobicents/webrtcomm/issues/24 is fixed
        var register = true;
        if ('register' in parameters && parameters['register'] == false) {
            register = false;
        }

        // Once https://github.com/Mobicents/webrtcomm/issues/24 is fixed we can remove these lines and pass down registrar and domain to webrtcomm
        if (!parameters['registrar'] || parameters['registrar'] == "") {
            console.log("Device::setup(): registrar has not been provided. Defaulting to wss://cloud.restcomm.com:5063");
            parameters['registrar'] = 'wss://cloud.restcomm.com:5063';
        }
        if (!parameters['domain'] || parameters['domain'] == "") {
            console.log("Device::setup(): domain has not been provided. Defaulting to cloud.restcomm.com");
            parameters['domain'] = 'cloud.restcomm.com';
        }

        // setup WebRTClient
        wrtcConfiguration = {
            communicationMode: WebRTCommClient.SIP,
            sip: {
                sipUserAgent: 'TelScale RestComm Web Client 1.0.0 BETA4',
                sipRegisterMode: register,
                sipOutboundProxy: parameters['registrar'],
                sipDomain: parameters['domain'],
                sipDisplayName: parameters['username'],
                sipUserName: parameters['username'],
                sipLogin: parameters['username'],
                sipPassword: parameters['password'],
            },
            RTCPeerConnection: {
                iceServers: undefined,
                stunServer: 'stun.l.google.com:19302',
                turnServer: undefined,
                turnLogin: undefined,
                turnPassword: undefined,
            }
        };

        username = parameters['username'];

        // setup sounds
        /*
        this.soundRinging = parameters['ringing-sound'];
        this.soundCalling = parameters['calling-sound'];
        this.soundMessage = parameters['message-sound'];
        */

        this.sounds.audioRinging = new Audio(this.sounds.soundRinging);
        this.sounds.audioRinging.loop = true;
        this.sounds.audioCalling = new Audio(this.sounds.soundCalling);
        this.sounds.audioCalling.loop = true;
        this.sounds.audioMessage = new Audio(this.sounds.soundMessage);

        // create listener to retrieve webrtcomm events
        wrtcEventListener = new WrtcEventListener(this);

        // initialize webrtcomm facilities through WebRTCommClient and register with RestComm
        wrtcClient = new WebRTCommClient(wrtcEventListener);
        wrtcClient.open(wrtcConfiguration);
    }
}
export class Sound {
    // sound files to be used for various events
	public soundRinging: string = '../../assets/sounds/ringing.mp3';
	public soundCalling: string = '../../assets/sounds/calling.mp3';
	public soundMessage: string = '../../assets/sounds/message.mp3';

	// audio objects to handle sound playback
	public audioRinging = null;
	public audioCalling = null;
	public audioMessage = null;

	public incomingEnabled: boolean = true;
	public outgoingEnabled: boolean = true;
    public disconnectEnabled: boolean = true;
    
    constructor() {
    }

    incoming(mute) {
        if (typeof mute == 'boolean') {
            this.incomingEnabled = mute;	
        }
    }

    outgoing(mute) {
        if (typeof mute == 'boolean') {
            this.outgoingEnabled = mute;	
        }
        else {
            return this.outgoingEnabled;
        }
    }

    disconnect(mute) {
        if (typeof mute == 'boolean') {
            this.disconnectEnabled = mute;	
        }
        else {
            return this.disconnectEnabled;
        }
    }
}