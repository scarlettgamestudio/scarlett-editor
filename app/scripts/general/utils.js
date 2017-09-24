/**
 * Scarlett @ DevTeam
 * This javascript file will include global utility functions that can be called from any context
 */

Array.prototype.indexOfObject = function arrayObjectIndexOf(search) {
    for (let i = 0, len = this.length; i < len; i++) {
        if (isEqual(this[i], search)) {
            return i;
        }
    }

    return -1;
};

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};