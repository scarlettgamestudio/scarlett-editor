/**
 * Scarlett @ DevTeam
 * This javascript file will include global utility functions that can be called from any context
 */

function fillPathWithSeparator (path) {
	return path + (path.endsWith('/') || path.endsWith('\\') ? '' : '/');
}
