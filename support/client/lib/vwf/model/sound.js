"use strict";

/// vwf/model/sound.js is a sound driver that wraps the capabilities of the 
/// HTML5 web audio API.
/// 
/// @module vwf/model/sound
/// @requires vwf/model

// References:
//  http://www.html5rocks.com/en/tutorials/webaudio/intro/
//  https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
//  http://www.html5rocks.com/en/tutorials/webaudio/fieldrunners/

define( [ "module", "vwf/model" ], function( module, model ) {

    // TODO: should these be stored in this.state so that the view can access them?
    var context;
    var soundData = {};
    var soundGroups = {};
    var masterVolume = 1.0;
    var logger;
    var soundDriver;
    var startTime = Date.now();
    var driver = model.load( module, {

        initialize: function() {
            // In case somebody tries to reference it before we get a chance to create it.
            // (it's created in the view)
            this.state.soundManager = {};
            soundDriver = this;
            masterVolume = this.masterVolume;
            logger = this.logger;

            try {
                // I quote: "For WebKit- and Blink-based browsers, you 
                // currently need to use the webkit prefix, i.e. 
                // webkitAudioContext."
                // http://www.html5rocks.com/en/tutorials/webaudio/intro/
                if ( !window.AudioContext ) {
                    window.AudioContext = window.webkitAudioContext;
                }
                context = new AudioContext();
            }
            catch( e ) {
                // alert( 'Web Audio API is not supported in this browser' );
                logger.warnx( "initialize", "Web Audio API is not supported in this browser." );
            }
        },

        callingMethod: function( nodeID, methodName, params ) { 
            if ( nodeID !== this.state.soundManager.nodeID ) {
                return undefined;
            }

            if ( !context ) {
                return undefined;
            }

            // variables that we'll need in the switch statement below.  These all have function
            // scope, might as well declare them here.
            var soundDefinition, successCallback, failureCallback, exitCallback;
            var soundName, soundNames, soundDatum, soundDefinition, soundInstance;
            var instanceIDs, instanceID, i, volume, fadeTime, fadeMethod, instanceHandle;
            var isLayered;

            switch( methodName ) {
                // arguments: soundDefinition, successCallback, failureCallback
                case "loadSound":
                    soundDefinition = params[ 0 ];
                    successCallback = params[ 1 ];
                    failureCallback = params[ 2 ];

                    if ( soundDefinition === undefined ) {
                        logger.errorx( "loadSound", "The 'loadSound' method requires " +
                                       "a definition for the sound." );
                        return undefined;
                    }

                    soundName = soundDefinition.soundName;
                    if ( soundName === undefined ) {
                        logger.errorx( "loadSound", "The sound definition must contain soundName." );
                        return undefined;
                    }

                    if ( soundData[ soundName ] !== undefined ) {
                        logger.errorx( "loadSound", "Duplicate sound named '" + soundName + "'." );
                        return undefined;
                    }

                    if ( !soundDefinition.isLayered && 
                         ( soundDefinition.soundURL === undefined ) ) {
                        logger.errorx( "loadSound", "The sound definition for '" + soundName +
                                       "' must contain soundURL." );
                        return undefined;
                    }
                    // if ( soundDefinition.initialVolume && 
                    //      ( soundDefinition.initialVolume === 0 ) ) {
                    //     logger.warnx( "loadSound", "Your initial volume for '" + soundName +
                    //                   "' is 0." );
                    // }
                    // Create the sound.
                    // NOTE: the sound file is loaded into a buffer asynchronously, so the
                    // sound will not be ready to play immediately.  That's why we have the
                    // callbacks.

                    if ( !soundDefinition.isLayered ) {

                        soundData[ soundName ] = new SoundDatum( soundDefinition, 
                                                                 successCallback, 
                                                                 failureCallback );

                    } else {

                        soundData[ soundName ] = new LayeredSoundDatum( soundDefinition, 
                                                                        successCallback, 
                                                                        failureCallback );

                    }

                    return;

                // arguments: soundName 
                // returns: true if sound is done loading and is playable
                case "isReady":
                    soundDatum = getSoundDatum( params[ 0 ] );
                    return soundDatum !== undefined ? !!soundDatum.buffer : false;

                // arguments: soundName, exitCallback (which is called when the sound stops) 
                // returns: an instance handle, which is an object: 
                //   { soundName: value, instanceID: value }
                //   instanceID is -1 on failure  
                case "playSound":
                    soundName = params[ 0 ];
                    soundDatum = getSoundDatum( soundName );
                    exitCallback = params[ 1 ];
                    return soundDatum ? soundDatum.playSound( exitCallback ) 
                                      : { soundName: soundName, instanceID: -1 };

                case "playSequence":
                    var soundNames = params;
                    soundDatum = getSoundDatum( soundNames[ 0 ] );

                    var playNext = function ( soundNames, current ){

                        if (current !== soundNames.length){
                        soundDatum = getSoundDatum( soundNames[ current ] );
                        soundDatum.playSound( playNext ( soundNames, current + 1 ) );
                        }

                    }
                    return soundDatum ? soundDatum.playSound( playNext ( soundNames, 0 ) ) 
                                      : { soundName: soundName, instanceID: - 1 };

                // arguments: soundName
                // returns: true if sound is currently playing
                case "isSoundPlaying":
                    soundDatum = getSoundDatum( params[ 0 ] );
                    return soundDatum ? soundDatum.isPlaying() : false;

                // arguments: instanceHandle
                // returns: true if sound is currently playing
                case "isInstancePlaying":
                    return getSoundInstance( params[ 0 ] ) !== undefined;

                // // arguments: instanceHandle, volume, fadeTime, fadeMethod
                case "setVolume":
                    instanceHandle = params [ 0 ];
                    soundDatum = getSoundDatum( instanceHandle.soundName );

                    if ( soundDatum ){
                        soundDatum.setVolume ( params [ 0 ], params [ 1 ], params [ 2 ], params [ 3 ] );
                    }
                
                // // arguments: volume (0.0-1.0)
                case "setMasterVolume":
                    masterVolume = params [ 0 ];

                    for ( var soundName in soundData ){
                        var soundDatum = soundData[ soundName ];
                        if ( soundDatum ) {
                            soundDatum.resetOnMasterVolumeChange();
                        }
                    }

                // // arguments: instanceHandle
                case "hasSubtitle":
                    instanceHandle = params [ 0 ];
                    soundDatum = getSoundDatum( instanceHandle.soundName );

                    return soundDatum ? !!soundDatum.subtitle : undefined;

                // // arguments: instanceHandle
                case "getSubtitle":
                    instanceHandle = params [ 0 ];
                    soundDatum = getSoundDatum( instanceHandle.soundName );

                    return soundDatum ? soundDatum.subtitle : undefined;

                // arguments: instanceHandle
                // returns: the duration of the sound
                case "getDuration":
                    instanceHandle = params[ 0 ];
                    soundDatum = getSoundDatum( instanceHandle.soundName );

                    return soundDatum && soundDatum.buffer ? soundDatum.buffer.duration : undefined;

                // arguments: instanceHandle
                case "stopSoundInstance":

                    instanceHandle = params [ 0 ];

                    //If a user chooses to pass just a soundName, stop all instances with that name.
                    if ( !instanceHandle.soundName ){
                        soundName = params [ 0 ];
                        soundDatum = getSoundDatum( soundName );
                        if ( soundDatum ){
                            soundDatum.stopDatumSoundInstances();
                        }
                    } else {
                    //Otherwise stop the specific instance.
                        soundDatum = getSoundDatum( instanceHandle.soundName );
                        if ( soundDatum ){
                            soundDatum.stopInstance( instanceHandle );
                        }
                    }
                    return;

                // arguments: none
                case "stopAllSoundInstances":
                    for ( var soundName in soundData ){
                        var soundDatum = soundData[ soundName ];
                        if ( soundDatum ) {
                            soundDatum.stopDatumSoundInstances();
                        }
                    }
                    return undefined;

                // arguments: soundName
                case "getSoundDefinition":
                    soundDatum = getSoundDatum( params[ 0 ] );
                    return soundDatum ? soundDatum.soundDefinition : undefined;
                    
            }

            return undefined;
        }

    } );

    function LayeredSoundDatum( layeredSoundDefinition, successCallback, failureCallback ) {
        this.initialize( layeredSoundDefinition, successCallback, failureCallback );
        return this;
    }

    LayeredSoundDatum.prototype = {
        constructor: LayeredSoundDatum,

        name: undefined,
        soundDefinitions: null,

        playOnLoad: false,

        // NOTE: these two arrays should be synchronized - for any given index,
        //   the layer name should be the name of the instance handle's sound.
        layerNames: null,
        instanceHandles: null,

        initialize: function ( layeredSoundDefinition, successCallback, failureCallback ) {

            this.name = layeredSoundDefinition.soundName;
            this.soundDefinitions = layeredSoundDefinition.soundDefinitions;
            this.playOnLoad = layeredSoundDefinition.playOnLoad;
            this.layerNames = [];
            this.instanceHandles = [];

            var soundDefinitionObjects = Object.keys( layeredSoundDefinition.soundDefinitions );

            for ( var k = 0; k < soundDefinitionObjects.length; ++k ) {

                var doneLoading = function() {
                    successCallback && successCallback();
                }

                var failureToLoad = function() {
                    failureCallback && failureCallback();
                }

                // TODO: I doubt this will work because they won't all load at
                //   the same time, but we need to synchronize them.
                if ( this.playOnLoad === true ) {
                    layeredSoundDefinition.soundDefinitions[k].playOnLoad = true;
                }

                var layerName = layeredSoundDefinition.soundDefinitions[k].soundName;
                this.layerNames.push( layerName );
                this.instanceHandles.push( undefined );

                if ( soundData[ layerName ] ) {
                    logger.warnx( "LayeredSoundDatum.initialize", 
                                  "Duplicate sound name for layer '" +
                                  layerName + "'." );
                } else {
                    // Again... we're going to call doneLoading for each layer, 
                    //   which doesn't seem right...
                    soundData[ layerName ] = new SoundDatum( layeredSoundDefinition.soundDefinitions[k], doneLoading , failureToLoad );
                }
            }

            // TODO: We haven't really succeeded until every sound has loaded -and
            //   at this point, none of them have!!
            successCallback && successCallback();
        },

        playSound: function ( exitCallback ) {
            if ( this.isPlaying() ) {
                logger.warnx( "LayeredSoundDatum.playSound", "Sound '" + 
                              this.name + "'is already playing, and layered " +
                              "sounds don't allow multiplay." );
                return { soundName: this.name, instanceID: -1 };
            }

            for ( var i = 0; i < this.layerNames.length; ++i ) {
                var layerDatum = soundData[ this.layerNames[ i ] ];
                if ( !layerDatum ) {
                    logger.errorx( "LayeredSoundDatum.playSound", "Missing " +
                                   "sound datum: '" + this.layerNames[ i ] +
                                   "'." );
                }

                var handle = layerDatum.playSound();
                this.instanceHandles[ i ] = handle;
            }

            return { soundName: this.name, instanceID: 0 };
        },

        stopInstance: function () {
            for ( var i = 0; i < this.layerNames.length; ++i ) {
                var layerDatum = soundData[ this.layerNames[ i ] ];
                layerDatum.stopInstance( this.instanceHandles[ i ] );
                this.instanceHandles[ i ] = undefined;
            }
        },

        stopDatumSoundInstances: function () {
            // There is never more than one instance of a layered sound.
            this.stopInstance();
        },

        resetOnMasterVolumeChange: function () {
            for ( var i = 0; i < this.layerNames.length; ++i ) {
                var layerDatum = soundData[ this.layerNames[ i ] ];
                layerDatum.resetOnMasterVolumeChange();
            }
        },

        setVolume: function( id, volume, duration, type ) {
            for ( var i = 0; i < this.layerNames.length; ++i ) {
                var layerDatum = soundData[ this.layerNames[ i ] ];
                layerDatum.setVolume( this.instanceHandles[ i ], volume, 
                                      duration, type);
            }
        },

        isPlaying: function() {
            for ( var x in this.layers ) {
                if ( this.instanceHandles[ x ] ) {
                    return true;
                }
            }
            return false;
         },

         // TODO: right now there is no way to play individual layers.  We might
         //   want to work on that, since that's the whole point of having
         //   layered sounds. :)
    }

    function SoundDatum( soundDefinition, successCallback, failureCallback ) {
        this.initialize( soundDefinition, successCallback, failureCallback );
        return this;
    }

    SoundDatum.prototype = {
        constructor: SoundDatum,

        // the name
        name: "",

        // the actual sound
        buffer: null,

        // a hashtable of sound instances
        playingInstances: null,

        // control parameters
        initialVolume: 1.0,
        isLooping: false,
        allowMultiplay: false,
        volumeAdjustment: 1.0,
        soundDefinition: null,
        playOnLoad: false,

        subtitle: undefined,

        soundGroup: undefined,
        groupReplacementMethod: undefined,
        queueDelayTime: 0.8,  // in seconds

        // a counter for creating instance IDs
        instanceIDCounter: 0,

        initialize: function( soundDefinition, successCallback, failureCallback ) {

            this.name = soundDefinition.soundName;
            this.playingInstances = {};
            this.soundDefinition = soundDefinition;

            if ( this.soundDefinition.isLooping !== undefined ) {
                this.isLooping = soundDefinition.isLooping;
            }

            if ( this.soundDefinition.allowMultiplay !== undefined ) {
                this.allowMultiplay = soundDefinition.allowMultiplay;
            }

            if ( this.soundDefinition.volumeAdjustment !== undefined ) {
                this.volumeAdjustment = soundDefinition.volumeAdjustment;
            }

            if (this.soundDefinition.initialVolume !== undefined ) {
                this.initialVolume = soundDefinition.initialVolume;
            }

            if ( this.soundDefinition.playOnLoad !== undefined ) {
                this.playOnLoad = soundDefinition.playOnLoad;
            }

            this.subtitle = this.soundDefinition.subtitle;

            this.soundGroup = this.soundDefinition.soundGroup;
            if ( this.soundGroup ) {
                if ( !soundGroups[ this.soundGroup ] ) {
                    soundGroups[ this.soundGroup ] = { soundData: {}, queue: [] };
                }

                soundGroups[ this.soundGroup ].soundData[ this.name ] = this;
            }

            this.groupReplacementMethod = this.soundDefinition.groupReplacementMethod;

            if ( this.soundDefinition.queueDelayTime !== undefined ) {
                this.queueDelayTime = this.soundDefinition.queueDelayTime;
            }

            if ( this.groupReplacementMethod && !this.soundGroup ) {
                logger.warnx( "SoundDatum.initialize", 
                              "You defined a replacement method but not a sound " +
                              "group.  Replacement is only done when you replace " +
                              "another sound in the same group!" );
            }

            // Create & send the request to load the sound asynchronously
            var request = new XMLHttpRequest();
            request.open( 'GET', soundDefinition.soundURL, true );
            request.responseType = 'arraybuffer';

            var thisSoundDatum = this;
            request.onload = function() {
                context.decodeAudioData(
                    request.response, 
                    function( buffer ) {
                        thisSoundDatum.buffer = buffer;

                        if ( thisSoundDatum.playOnLoad === true ) {
                            thisSoundDatum.playSound( null, true );
                        }

                        successCallback && successCallback();
                    }, 
                    function() {
                        logger.warnx( "SoundDatum.initialize", "Failed to load sound: '" + 
                                      thisSoundDatum.name + "'." );

                        delete soundData[ thisSoundDatum.name ];

                        failureCallback && failureCallback();
                    }
                );
            }
            request.send();
        },

        playSound: function( exitCallback ) {

            if ( !this.buffer ) {
                logger.errorx( "SoundDatum.playSound", "Sound '" + this.name + "' hasn't finished " +
                               "loading, or loaded improperly." );
                return { soundName: this.name, instanceID: -1 };
            }

            if ( !this.allowMultiplay && this.isPlaying() ) {
                return { soundName: this.name, 
                         instanceID: this.playingInstances[ 0 ] };
            }

            var id = this.instanceIDCounter;
            ++this.instanceIDCounter;

            this.playingInstances[ id ] = new PlayingInstance( this, id, exitCallback );
            return { soundName: this.name, instanceID: id };
        },

        stopInstance: function( instanceHandle ) {
            var soundInstance = this.playingInstances[ instanceHandle.instanceID ];
            soundInstance && soundInstance.stop();
        },

        stopDatumSoundInstances: function () {
            for ( var instanceID in this.playingInstances ) {
                var soundInstance = this.playingInstances[ instanceID ];
                soundInstance && soundInstance.stop();
            }

            // I have no freaking idea why uncommenting this breaks absolutely 
            //  everything, but it does!
            // this.playingInstances = {};
        },

        resetOnMasterVolumeChange: function () {
            for ( var instanceID in this.playingInstances ) {
                var soundInstance = this.playingInstances[ instanceID ];
                if ( !!soundInstance ) {
                    soundInstance.gainNode.gain.value = this.initialVolume * masterVolume;
                }
            }
        },

        setVolume: function ( instanceHandle, volume, fadeTime, fadeMethod ) {
           // arguments: instanceHandle, volume, fadeTime, fadeMethod
            var soundInstance = getSoundInstance( instanceHandle );
            soundInstance && soundInstance.setVolume( volume, fadeTime, fadeMethod );
        },

        isPlaying: function() {
            var instanceIDs = Object.keys( this.playingInstances );
            return instanceIDs.length > 0;
        },
    }

    function PlayingInstance( soundDatum, id, exitCallback, successCallback ) {
        this.initialize( soundDatum, id, exitCallback, successCallback );
        return this;
    }

    PlayingInstance.prototype = {
        constructor: PlayingInstance,

        // our id, for future reference
        id: undefined,

        // a reference back to the soundDatum
        soundDatum: null,

        // the control nodes for the flowgraph
        sourceNode: undefined,
        gainNode: undefined,

        isStarted: false, 

        initialize: function( soundDatum, id, exitCallback, successCallback ) {
            // NOTE: from http://www.html5rocks.com/en/tutorials/webaudio/intro/:
            //
            // An important point to note is that on iOS, Apple currently mutes all sound 
            // output until the first time a sound is played during a user interaction 
            // event - for example, calling playSound() inside a touch event handler. 
            // You may struggle with Web Audio on iOS "not working" unless you circumvent 
            // this - in order to avoid problems like this, just play a sound (it can even
            // be muted by connecting to a Gain Node with zero gain) inside an early UI
            // event - e.g. "touch here to play".
            this.id = id;
            this.soundDatum = soundDatum;

            this.sourceNode = context.createBufferSource();
            this.sourceNode.buffer = this.soundDatum.buffer;
            this.sourceNode.loop = this.soundDatum.isLooping;

            this.gainNode = context.createGain();
            this.gainNode.gain.value = this.soundDatum.initialVolume * masterVolume;

            this.sourceNode.connect( this.gainNode );
            this.gainNode.connect( context.destination );

            var group = soundGroups[ soundDatum.soundGroup ];

            // Browsers will handle onended differently depending on audio 
            //   filetype - needs support.
            var thisInstance = this;
            this.sourceNode.onended =  function() {
                thisInstance.isStarted = false;
                fireSoundEvent( "soundFinished", thisInstance );

                // logger.logx( "PlayingInstance.onended",
                //              "Sound ended: '" + thisInstance.soundDatum.name +
                //              "', Timestamp: " + timestamp() );

                if ( group && ( group.queue.length > 0 ) ) {
                    var nextInstance = group.queue.pop();
                    if ( nextInstance ) {
                        var delaySeconds = nextInstance.soundDatum.queueDelayTime;

                        // logger.logx( "PlayingInstance.onended", 
                        //              "Popped from the queue: '" + 
                        //              nextInstance.soundDatum.name +
                        //              ", Timeout: " + delaySeconds +
                        //              ", Timestamp: " + timestamp() );

                        setTimeout( function() { 
                                        startSoundInstance( nextInstance ); 
                                    }, 
                                    delaySeconds * 1000 );
                    }
                }

                delete soundDatum.playingInstances[ id ];
                exitCallback && exitCallback();
            }

            if ( group ) {
                switch ( soundDatum.groupReplacementMethod ) {
                    case "queue":
                        // We're only going to play the sound if there isn't 
                        //   already a sound from this group playing.  
                        //   Otherwise, add it to a queue to play later.
                        if ( isGroupPlaying( group ) ) {
                            group.queue.unshift( this );
                        } else {
                            startSoundInstance( this );
                        }

                        break;

                    case "replace":
                        stopSoundGroup( group );
                        startSoundInstance( this );
                        break;

                    default:
                        logger.errorx( "PlayingInstance.initialize",
                                       "This sound ('" + thisInstance.soundDatum.name + 
                                       "') is in a group, but doesn't " +
                                       "have a valid replacement method!" );

                        stopSoundGroup( group );
                        startSoundInstance( this );
                }
            } else {
                startSoundInstance( this );
            }
        },

        setVolume: function( volume, fadeTime, fadeMethod ) {
            if ( !volume ) {
                logger.errorx( "setVolume", "The 'setVolume' method " +
                               "requires a volume." );
                return;
            }

            var thisPlayingInstance = this;

            var targetVolume = volume * masterVolume;
             fadeTime = fadeTime ? fadeTime : 0;
             fadeMethod = fadeMethod ? fadeMethod : "linear";

            if ( fadeTime <= 0 ) {
                this.sourceNode.gain.value = targetVolume;
            } else {
                var endTime = context.currentTime + fadeTime;
                var now = context.currentTime;
                this.gainNode.gain.cancelScheduledValues( now );

                switch( fadeMethod ) {
                    case "linear":
                        this.gainNode.gain.linearRampToValueAtTime( volume, endTime );
                        break;
                    case "exponential":
                        this.gainNode.gain.setTargetValueAtTime( volume, now, fadeTime );
                        break;
                    default:
                        logger.errorx( "setVolume", "Unknown fade method: '" +
                                       fadeMethod + "'.  Using a linear fade." );
                        this.sourceNode.gain.linearRampToValueAtTime( volume, endTime );
                }
            }
        },

        stop: function() {
            if ( this.isStarted ) {
                this.sourceNode.stop();
            } 
        }
    }

    function getSoundDatum( soundName ) {
        if ( soundName === undefined ) {
            logger.errorx( "getSoundDatum", "The 'getSoundDatum' method " +
                           "requires the sound name." );
            return undefined;
        }

        var soundDatum = soundData[ soundName ];
        if ( soundDatum === undefined ) {
            logger.errorx( "getSoundDatum", "Sound '" + soundName + "' not found." );
            return undefined;
        }

        return soundDatum;
    }

    function getSoundInstance( instanceHandle ) {
        if ( instanceHandle === undefined ) {
            logger.errorx( "getSoundInstance", "The 'GetSoundInstance' method " +
                           "requires the instance ID." );
            return undefined;
        }

        if ( ( instanceHandle.soundName === undefined ) || 
             ( instanceHandle.instanceID === undefined ) ) {
            logger.errorx( "getSoundInstance", "The instance handle must contain " +
                           "soundName and instanceID values");
            return undefined;
        }

        var soundDatum = getSoundDatum( instanceHandle.soundName );

        if ( soundDatum.isLayered === true ) {
            return soundDatum;
        } else {
            return soundDatum ? soundDatum.playingInstances[ instanceHandle.instanceID ] 
                              : undefined;
        }
    }

    function startSoundInstance( instance ) {
        instance.sourceNode.start( 0 ); 
        instance.isStarted = true;

        // logger.logx( "startSoundInstance",
        //              "Sound started: '" + instance.soundDatum.name + 
        //              "', Timestamp: " + timestamp() );

        fireSoundEvent( "soundStarted", instance );
    }

    function fireSoundEvent( eventString, instance ) {
        vwf_view.kernel.fireEvent( soundDriver.state.soundManager.nodeID, 
                                   eventString,
                                   [ { soundName: instance.soundDatum.name, 
                                       instanceID: instance.id } ] );
    }

    function isGroupPlaying( group ) {
        for ( var soundName in group.soundData ) {
            var sound = group.soundData[ soundName ];

            if ( sound && sound.isPlaying() ) {
                return true;
            }
        }
        return false;
    }

    function stopSoundGroup( group ) {
        group.queue = [];

        for ( var soundName in group.soundData ) {
            var sound = group.soundData[ soundName ];
            sound && sound.stopDatumSoundInstances();
        }
    }

    function timestamp() {
        var delta = Date.now() - startTime;
        var minutes = Math.floor( delta / 60000 );
        var seconds = ( delta % 60000 ) / 1000;

        return "" + minutes + ":" + seconds;
    }

    return driver;
} );


