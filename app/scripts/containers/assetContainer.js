AttributeDictionary.addRule("assetcontainer", "path", {readOnly: true});

function AssetContainer(params) {
	params = params || {};

	this.path = params.path;
}