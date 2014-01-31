/*
 * grunt-mocha-casperjs
 * https://github.com/billingb/grunt-mocha-casperjs
 *
 * Copyright (c) 2014 Regents of the University of Colorado
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var util    = grunt.util,
    _       = util._,
    path = require("path"),
    exists = grunt.file.exists;

  grunt.registerMultiTask('mocha_casperjs', 'Run test with mocha-casperjs.', function() {
    // Merge options
    var options        = this.options({
        reporter: 'spec'
      }),
      filepaths = [],
      options = grunt.util._.defaults(this.options()),
      args           = [],
      binPath        = '.bin/mocha-casperjs' + (process.platform === 'win32' ? '.cmd' : ''),
      mochaCasperjsPath = path.join(__dirname, '..', '/node_modules/', binPath),
      errors         = 0,
      results        = '',
      output         = options.output || false,
      done           = this.async();


    // disable color if color not passed
    if (grunt.option('color') === false) {
      args.push('--no-color');
    }

    // Check for a local install of mocha-phantomjs to use
    if (!exists(mochaCasperjsPath)) {
      var i = module.paths.length,
        bin;
      while(i--) {
        bin = path.join(module.paths[i], binPath);
        if (exists(bin)) {
          mochaCasperjsPath = bin;
          break;
        }
      }
    }

    if(!exists(mochaCasperjsPath)) {
      grunt.fail.warn('Unable to find mocha-casperjs.');
    }

    _.each(_.omit(options, 'output'), function(value, key) {
      // Convert the key to a switch
      var sw = '--' + key;
      // Add the switch and its value
      // If the value is an array, add all array elements to the array.
      if(!_.isArray(value)) {
        value = [value];
      }

      _.each(value, function(value) {
        args.push([sw, value.toString()]);
      });
    });

    this.files.forEach(function(file) {
      file.src.filter(function(filepath) {
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          filepaths.push(filepath);
          return true;
        }
      });
    });

    util.async.forEachSeries(filepaths, function(f, next) {
      var mochaCasperjsProc = grunt.util.spawn({
        cmd: mochaCasperjsPath,
        args: _.flatten([f].concat(args))
      }, function(error, result, code) {
        next();
      });

      mochaCasperjsProc.stdout.pipe(process.stdout);
      mochaCasperjsProc.stderr.pipe(process.stderr);

      // Append output to be written to a file
      if(output) {
        mochaCasperjsProc.stdout.on('data', function(data){
          results += String(data.toString());
        });
      }

      mochaCasperjsProc.on('exit', function(code){
        if (code === 127) {
          grunt.fail.warn("Phantomjs isn't installed");
        }
        errors += code;
      });

    }, function(){
      // Fail if errors are reported and we aren't outputing to a file
      if(!output && errors > 0) {
        grunt.fail.warn(errors + " tests failed");
      } else if(output) {
        grunt.file.write(output, results);
      }
      done();
    });
  });

};