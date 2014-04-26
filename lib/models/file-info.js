'use strict';

var fs = require('fs');
var _ = require('lodash-node');
var Promise = require('../ext/promise');
var readFile = Promise.denodeify(fs.readFile);
var chalk = require('chalk');

function processTemplate(content, context) {
  return _.template(content)(context);
}

FileInfo.prototype.confirmOverwrite = function(path) {
  var promptOptions = {
    type: 'expand',
    name: 'answer',
    default: false,
    message: chalk.red('Overwrite') + ' ' + path + '?',
    choices: [
      { key: 'y', name: 'Yes, overwrite', value: 'overwrite' },
      { key: 'n', name: 'No, skip', value: 'skip' },
      { key: 'd', name: 'Diff', value: 'diff' }
    ]
  };

  return this.ui.prompt(promptOptions)
    .then(function(response) {
      return response.answer;
    });
};

FileInfo.prototype.displayDiff = function(path) {
  var promptOptions = {
    type: 'expand',
    name: 'answer',
    default: false,
    message: chalk.red('Overwrite') + ' ' + path + '?',
    choices: [
      { key: 'y', name: 'Yes, overwrite', value: 'overwrite' },
      { key: 'n', name: 'No, skip', value: 'skip' },
      { key: 'd', name: 'Diff', value: 'diff' }
    ]
  };

  return this.ui.prompt(promptOptions)
    .then(function(response) {
      return response.answer;
    });
};

function FileInfo(options) {
  this.action = options.action;
  this.outputPath = options.outputPath;
  this.displayPath = options.displayPath;
  this.inputPath =  options.inputPath;
  this.templateVariables = options.templateVariables;
  this.ui = options.ui;
}

FileInfo.prototype.render = function() {
  var path = this.inputPath,
      context = this.templateVariables;
  if (!this.rendered) {
    this.rendered = readFile(path).then(function(content){
      return processTemplate(content.toString(), context);
    });
  }
  return this.rendered;
};

FileInfo.prototype.checkForConflict = function() {
  return new Promise(function (resolve, reject) {
    fs.exists(this.outputPath, function (doesExist, error) {
      if (error) {
        reject(error);
        return;
      }

      var result;

      if (doesExist) {
        result = Promise.hash({
          input: this.render(),
          output: readFile(this.outputPath)
        }).then(function(result) {
          var type;
          if (result.input === result.output.toString()) {
            type = 'identical';
          } else {
            type = 'confirm';
          }
          return type;
        }.bind(this));
      } else {
        result = 'none';
      }

      resolve(result);
    }.bind(this));
  }.bind(this));
};

FileInfo.prototype.confirmOverwriteTask = function() {
  var info = this;

  return function() {
    var defer = Promise.defer();
    function doConfirm(){
      info.confirmOverwrite(info.outputPath).then(function(action){
        if (action === 'diff') {
          info.displayDiff().then(doConfirm);
        } else {
          info.action = action;
          defer.resolve(info);
        }
      });
    }

    return defer.promise;
  }.bind(this);
};

module.exports = FileInfo;
