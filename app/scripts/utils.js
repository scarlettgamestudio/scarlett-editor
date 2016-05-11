/**
 * Scarlett @ DevTeam
 * This javascript file will include global utility functions that can be called from any context
 */

function fillPathWithSeparator(path) {
	return path + (path.endsWith('/') || path.endsWith('\\') ? '' : '/');
}

function getDirectoryFromPath(path) {
	var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return path.substring(0, (index >= 0 ? index : path.length));
}

function getFilenameFromPath(path) {
	var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return path.substring((index >= 0 && index < path.length - 1 ? index + 1 : 0), path.length);
}

function ensureDirectorySlash(path) {
	var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return path + (index < path.length - 1 ? '/' : '');
}

function getFileExtension(path) {
	return path.substring(path.lastIndexOf('.'), path.length);
}