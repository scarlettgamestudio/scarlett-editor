AttributeDictionary.addRule("assetcontainer", "path", {readOnly: true});

function AssetContainer(params) {
	params = params || {};

	this.path = params.path;
}

/**
 * Performs a save operation (normally to disk, depending on the asset implementation)
 * @returns {boolean}
 */
AssetContainer.prototype.save = function() {
	return false;
};