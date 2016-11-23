/**
 * Created by John
 */

app.factory("assetSvc", function (config, logSvc) {

	var svc = {};

	svc.getAssetContainer = function(path) {
		var extension = Path.getFileExtension(path).toLowerCase();

		switch(extension) {
			// text related files
			case ".json":
			case ".txt":
				// TODO: add proper container here..
				return null;

			// image files
			case ".png":
			case ".jpg":
			case ".jpeg":
			case ".gif":
			case ".bmp":
			case ".svg":
			case ".ico":
				return new ImageAssetContainer({path: path});

			// default
			default:
				// TODO: add default file container here..
				return null;
		}
	};

	return svc;

});