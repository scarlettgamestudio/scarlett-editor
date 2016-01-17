module.exports = function(grunt) {

	grunt.initConfig({
		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
			options: {
				globals: {
					jQuery: true
				}
			}
		},
		sass: {
			dist: {
				files: [{
					expand: true,
					cwd: 'app/styles/',
					src: ['**/*.scss'],
					dest: 'app/css/theme',
					ext: '.css'
				}]
			}
		},
		watch: {
			css: {
				options: {
					livereload: true
				},
				files: 'app/styles/**/*.scss',
				tasks: ['sass']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-sass');

	grunt.registerTask('default', ['jshint', 'watch']);

};