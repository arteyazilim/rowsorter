module.exports = function(grunt) {
    grunt.initConfig({
        uglify: {
            target_1: {
                files: {
                    'dist/RowSorter.js': ['src/RowSorter.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify'); // load the given tasks
    grunt.registerTask('default', ['uglify']); // Default grunt tasks maps to grunt
};
