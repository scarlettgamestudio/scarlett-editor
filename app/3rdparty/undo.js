/*
 * Undo.js - A undo/redo framework for JavaScript
 *
 * http://jzaefferer.github.com/undo
 *
 * Copyright (c) 2011 Jörn Zaefferer
 *
 * Edited by AnlageHub
 *
 * MIT licensed.
 */
(function () {
    // based on Backbone.js' inherits
    var ctor = function () {
    };
    var inherits = function (parent, protoProps) {
        var child;

        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            };
        }

        ctor.prototype = parent.prototype;
        child.prototype = new ctor();

        if (protoProps) extend(child.prototype, protoProps);

        child.prototype.constructor = child;
        child.__super__ = parent.prototype;
        return child;
    };

    function extend(target, ref) {
        var name, value;
        for (name in ref) {
            value = ref[name];
            if (value !== undefined) {
                target[name] = value;
            }
        }
        return target;
    }

    var Undo = {
        version: '0.1.16'
    };

    Undo.Stack = function (maxHistory) {
        this.commands = [];
        this.stackPosition = -1;
        this.savePosition = -1;
        this.maxHistory = maxHistory || 48;
    };

    extend(Undo.Stack.prototype, {
        execute: function (command, storeOnly) {
            this._clearRedo();

            if (!storeOnly) {
                if (Array.isArray(command)) {
                    command.forEach(function (cmd) {
                        cmd.execute();
                    });
                } else {
                    command.execute();
                }
            }

            this.commands.push(command);

            if (this.commands.length > this.maxHistory) {
                this.commands.splice(0, 1);

            } else {
                this.stackPosition++;
            }

            this.changed();
        },
        store: function (command) {
            this.execute(command, true);
        },
        undo: function () {
            if(!this.canUndo()) {
                return;
            }

            if (Array.isArray(this.commands[this.stackPosition])) {
                this.commands[this.stackPosition].forEach(function (command) {
                    command.undo();
                });
            } else {
                this.commands[this.stackPosition].undo();
            }

            this.stackPosition--;
            this.changed();
        },
        canUndo: function () {
            return this.stackPosition >= 0;
        },
        redo: function () {
            if(!this.canRedo()) {
                return;
            }

            this.stackPosition++;
            if (Array.isArray(this.commands[this.stackPosition])) {
                this.commands[this.stackPosition].forEach(function (command) {
                    command.redo();
                });
            } else {
                this.commands[this.stackPosition].redo();
            }
            this.changed();
        },
        canRedo: function () {
            return this.stackPosition < this.commands.length - 1;
        },
        save: function () {
            this.savePosition = this.stackPosition;
            this.changed();
        },
        dirty: function () {
            return this.stackPosition != this.savePosition;
        },
        _clearRedo: function () {
            // TODO there's probably a more efficient way for this
            this.commands = this.commands.slice(0, this.stackPosition + 1);
        },
        changed: function () {
            // do nothing, override
        }
    });

    Undo.Command = function (name) {
        this.name = name;
    };

    var up = new Error("cannot extend");

    extend(Undo.Command.prototype, {
        execute: function () {
            throw up;
        },
        undo: function () {
            throw up;
        },
        redo: function () {
            this.execute();
        }
    });

    Undo.Command.extend = function (protoProps) {
        var child = inherits(this, protoProps);
        child.extend = Undo.Command.extend;
        return child;
    };

    this.Undo = Undo;

})();