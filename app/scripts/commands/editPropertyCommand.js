/**
 *
 */
EditPropertyCommand = Undo.Command.extend({
    constructor: function(container, property, oldValue, newValue) {
        this.container = container;
        this.oldValue = JSON.parse(JSON.stringify(oldValue));
        this.newValue = JSON.parse(JSON.stringify(newValue));
        this.property = property;
        this.recursiveApply = function recursive (container, property, value) {
            if (typeof container[property] === "object") {
                Object.keys(container[property]).forEach(function (innerProperty) {
                    recursive(container[property], innerProperty, value);
                });
            } else {
                container[property] = (typeof value === "object" ? value[property] : value);
            }
        }
    },
    execute: function() {
        this.recursiveApply(this.container, this.property, this.newValue);
    },
    undo: function() {
        this.recursiveApply(this.container, this.property, this.oldValue);
    },
    redo: function() {
        this.recursiveApply(this.container, this.property, this.newValue);
    }
});