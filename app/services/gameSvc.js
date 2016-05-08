/**
 * Created by John
 */

app.factory("gameSvc", function () {
	var svc = {};
	var activeProject = null;

	svc.setActiveProject = function(project) {
		activeProject = project;

		// TODO: broadcast the event
	};

	return svc;
});
