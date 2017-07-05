AttributeDictionary.addRule("ImageAssetContainer", "imageSrc", {editor: "image", displayName: "Preview"});

/**
 *
 * @param params
 * @constructor
 */
function ImageAssetContainer(params) {
	AssetContainer.call(this, params);

	this.imageSrc = params.path;
}

SC.inheritsFrom(ImageAssetContainer, AssetContainer);

ImageAssetContainer.prototype.getType = function() {
	return "ImageAssetContainer";
};
