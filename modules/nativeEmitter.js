/**
 * NativeEmitter
 * @constructor
 */
var NativeEmitter = function () {};
NativeEmitter._handlers = {};

/**
 *
 * @param topic
 * @param callback
 * @param context (optional)
 */
NativeEmitter.subscribe = function(topic, callback, context) {
    if(!NativeEmitter._handlers.hasOwnProperty(topic)) {
        NativeEmitter._handlers[topic] = [];
    }

    NativeEmitter._handlers[topic].push({
        callback: callback,
        context: context
    });
};

/**
 *
 * @param topic
 */
NativeEmitter.emit = function(topic) {
    if(NativeEmitter._handlers.hasOwnProperty(topic)) {
        // get the remaining arguments (if exist)
        var args = [];
        if(arguments.length > 1) {
            for(var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
        }
        
        NativeEmitter._handlers[topic].forEach(function(handler) {
            // call the function by sending the arguments and applying the given context (might not be available)
            handler.callback.apply(handler.context, args);
        });
    }
};

/**
 * Clears all subscriptions
 */
NativeEmitter.clear = function() {
    NativeEmitter._handlers = {};
};

module.exports = NativeEmitter;