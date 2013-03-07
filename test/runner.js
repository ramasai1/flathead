#!/usr/bin/env node

// runner.js
// ---------
// Finds and runs the JavaScript test suite on flathead.
//
// Run this script with NodeJS.
//
// -x / --exec     Specify an alternate executable to run the test files with.
//
//                 e.g. -x node
//
// -a / --args     A template in which the string "[test]" will be interpolated
//                 with the path to each test script and given as argument to
//                 the executable.
//
//                 e.g. -a "-f test/rhino-harness.js -f [test]"
//
// -t / --timeout  Time in milliseconds after which a test execution is killed
//                 and the test failed.
//
//                 e.g. -t 2000
//
// -q / --quiet    Only display failed tests

var exec = require('child_process').exec,
    fs = require('fs'),
    _ = require('./underscore');

var testRunner = exports.testRunner = {

  options: {
    exec: __dirname + '/../bin/flat',
    argsTemplate: '[test]',
    timeout: 2000,
    quiet: false,
    files: []
  },

  stats: {
    passed: 0,
    failed: 0,
    found: 0,
    done: function() {
      return this.passed + this.failed === this.found;
    }
  },

  colors: {
    success: '\033[34m',
    failure: '\033[31m',
    reset: '\033[0m'
  },

  print: function(msg, force) {
    if (!this.options.quiet || force) console.log(msg);
  },

  error: function(msg) {
    console.error(msg);
  },

  // Parse command line arguments into the options object.
  parseArgs: function() {
    this.args = process.argv;

    this.options.exec = this.getOpt('exec', 'x') || this.options.exec;
    this.options.argsTemplate = this.getOpt('args', 'a') || this.options.argsTemplate;
    this.options.timeout = this.getOpt('timeout', 't', true, Number) || this.options.timeout;
    this.options.quiet = this.getOpt('quiet', 'q', false) || this.options.quiet;

    if (this.args.length > 2)
      this.options.files = this.args.slice(2);
  },

  // Get and remove an option from the args array.
  getOpt: function(longOpt, shortOpt, hasVal, type) {
    var val, index, args = this.args;

    // Just indicate presence of the option
    hasVal = hasVal === undefined ? true : hasVal;
    if (!hasVal) val = false;

    _.each(['--' + longOpt, '-' + shortOpt], function(opt) {
      if ((index = args.indexOf(opt)) >= 0) {
        if (hasVal) {
          val = args[index + 1];
          args = _.without(args, args[index], args[index + 1]);
        } else {
          val = true;
          args = _.without(args, args[index]);
        }
      }
    });
    this.args = args;

    if (type == Number)
      val = parseInt(val, 10);

    return val;
  },

  // Print a success message and update the stats.
  onTestPass: function(fileName) {
    this.stats.passed++;
    if (!this.options.quiet)
      this.print(this.colors.success + '✓ ' + fileName + this.colors.reset);
    if (this.stats.done()) this.finish();
  },

  // Print a failure message and update the stats.
  onTestFail: function(fileName, err, stderr) {
    this.stats.failed++;
    this.error(this.colors.failure + '✖ ' + fileName + this.colors.reset);
    this.error(err);
    this.error(stderr);
    if (this.stats.done()) this.finish();
  },

  // Print the test summary.
  finish: function() {
    this.print(
      '\n' +
      this.stats.passed + ' passed, ' +
      this.stats.failed + ' failed' +
      ' (' + this.options.exec + ')' +
      '\n',
      true
    );
    if (this.stats.failed > 0)
      process.exit(1);
  },

  // Execute the given (or default) command providing the file as an argument.
  // Provide success/failure callbacks. A test is considered failed if the
  // exit code is non-zero, or the output streams are non-empty.
  runScript: function(fileName, onSuccess, onFailure) {
    var args = this.options.argsTemplate.replace('[test]', fileName);
    var cmd = [this.options.exec, args].join(' ');
    exec(cmd, {timeout: this.options.timeout}, function(err, stdout, stderr) {
      fileName = fileName.split('/')[fileName.split('/').length - 1];
      return (err || stderr) ?
        onFailure(fileName, err, stderr) :
        onSuccess(fileName);
    });
  },

  // Look for test files in this file's directory and run them.
  runAll: function() {
    var that = this;
    fs.readdir(__dirname, function(err, files) {
      files.forEach(function(f) {
        if (f.match(/^test_/)) {
          that.runScript(
            [__dirname, f].join('/'),
            that.onTestPass,
            that.onTestFail
          );
          that.stats.found++;
        }
      });
      that.print('Found ' + that.stats.found + ' test files.\n  ');
    });
  },

  // Run each file in an array of filename strings.
  runEach: function(files) {
    this.stats.found = files.length;
    files.forEach(function(f) {
      this.runScript(f, this.onTestPass, this.onTestFail);
    }, this);
  },

  // Start running tests.
  run: function() {
    this.parseArgs();

    if (this.options.files.length)
      return this.runEach(this.options.files);
    return this.runAll();
  }
};

_.bindAll(testRunner);

if (require.main === module) testRunner.run();
