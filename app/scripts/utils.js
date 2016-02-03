/**
 * Scarlett @ DevTeam
 * This javascript file will include global utility functions that can be called from any context
 */

/**
 * This function will return true if there is something assigned to the given object and false if it isn't
 * @param obj
 * @returns {boolean}
 */
function isObjectAssigned(obj) {
	return (typeof obj !== "undefined" && obj !== null);
}