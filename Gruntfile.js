module.exports = function(grunt) {
    grunt.initConfig({
        uglify: {
            dist: {
                files: {
                    'dist/RowSorter.js': ['src/RowSorter.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify']);
};
