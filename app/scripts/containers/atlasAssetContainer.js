AttributeDictionary.addRule("AtlasAssetContainer", "imageSrc", {editor: "filePath", displayName: "Image Source"});

/**
 *
 * @param params
 * @constructor
 */
function AtlasAssetContainer(params) {
    AssetContainer.call(this, params);

    this.imageSrc = params.path;
}

inheritsFrom(AtlasAssetContainer, AssetContainer);

AtlasAssetContainer.prototype.getType = function() {
    return "AtlasAssetContainer";
};
