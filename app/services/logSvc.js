/**
 * Created by John on 12/6/15.
 */

app.factory("logSvc", function () {
	return {
		log: function() {
			console.log(arguments);
		},
		warn: function () {
			console.warn(arguments);
		},
		error: function (message) {
			console.error(arguments);
		}
	}
});
