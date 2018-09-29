const _ = require('./underscore');
const log4js = require('log4js');


/**
 * Setup logging system.
 * @param  {Object} [options]
 * @param  {String} [options.loglevel] Minimum logging threshold (default: info).
 * @param  {String} [options.logfile] File to write logs to (default: no file logging).
 */
exports.setup = function (options) {
    options = _.extend({
        logfile: null,
        loglevel: null,
    }, options);

    // logging
    var log4jsOptions = {
        appenders: {
            console: { type: 'console' }
        },
        categories: {
            default: { appenders: ['console'], level: (options.loglevel || 'info').toUpperCase()}
        }
    };

    if (options.logfile) {
        log4jsOptions.appenders.filelog = {
            type: 'dateFile',
            filename: options.logfile,
            pattern: "_yyyy-MM-dd",
            level: (options.loglevel || 'info').toUpperCase(),
            alwaysIncludePattern: false,
            maxLogSize: 1024000000,
            backups: 4
        };
        log4jsOptions.categories.default.appenders.push("filelog");

    }


    log4js.configure(log4jsOptions);
};


exports.create = (category) => {
    const logger = log4js.getLogger(category);

    // Allow for easy creation of sub-categories.
    logger.create = (subCategory) => {
        return exports.create(`${category}/${subCategory}`);
    };

    return logger;
};
