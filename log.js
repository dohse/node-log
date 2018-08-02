// Copyright 2011-2012 mbr targeting GmbH. All Rights Reserved.

const util = require('util');

const assign = require('lodash.assign');
const getenv = require('getenv');
const isError = require('lodash.iserror');
const isString = require('lodash.isstring');

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug'];

function jsonifyError(error) {
  const stack = error.stack.split('\n').map(
    (line) => line.replace(/ {4}/g, '\t')
  ).join('\n');
  return JSON.stringify(assign({}, error, {stack})).replace(/ /g, '\\u0020');
}

const logStack = getenv.bool('LOG_STACK', true);
const logStackJson = getenv.bool('LOG_STACK_JSON', false);
function forward(target, prefix) {
  return (format, ...args_) => {
    const placeholders = isString(format) ?
      (format.match(/%[sdifjoO%]/g) || [])
        .filter((placeholder) => placeholder !== '%%')
        .length :
      0;
    const args = args_.slice(0, placeholders);

    const errors = (logStack ? args_ : [])
      .filter(isError)
      .map((error) => logStackJson ?
        jsonifyError(error) :
        util.inspect(error, false, 3)
      );

    const errorSeparator = logStackJson ? ' ' : '\n';
    const rest = args_.slice(placeholders).filter((value) => !isError(value));
    console[target]('%s', util.format(prefix + format, ...args, ...rest) +
                          ['', ...errors].join(errorSeparator));
  };
}

exports.fatal = forward('error', 'FATAL: ');
exports.error = forward('error', 'ERROR: ');
exports.warn = forward('warn', 'WARN : ');
exports.info = forward('log', 'INFO : ');
exports.debug = forward('log', 'DEBUG: ');

const logLevel = getenv.string('LOG_LEVEL', 'debug');
const index = logLevels.indexOf(logLevel);
if (index === -1) {
  throw new Error('Log.InvalidLogLevel: ' + logLevel + ', set LOG_LEVEL');
}
logLevels.forEach(function(level, cur) {
  if (cur > index) {
    exports[level] = function() {};
  }
});
