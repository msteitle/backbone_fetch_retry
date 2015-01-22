define([
    'underscore',
    'utils'
], function (
    _,
    utils
) {
   "use strict";

    var now = function () {
        return (new Date()).getTime();
    };

    var fetch_retry_proto = {
        incrementDelay: function () {
            this.delay_ms *= 2;
        },

        fetch: function (options) {
            return this.model.fetch(options);
        },

        start_fetch: function (options) {
            this.fetch_options = _.extend({}, options, {
                success: _.wrap(options.success, _.bind(this.successWrapper, this))
            });

            this.start = now();

            return this.fetch(this.fetch_options);
        },

        successWrapper: function (success_fn, model, response, options) {
            var args = Array.prototype.slice.call(arguments, 1);

            if (this.test_success.apply(this.test_success, args)) {
                success_fn.apply(success_fn, args);
            }
            else {
                if (now() - this.start < this.timeout_ms) {
                    window.setTimeout(_.bind(this.fetch, this), this.delay_ms, this.fetch_options);
                    this.incrementDelay();
                }
                else {
                    options.error && options.error.apply(options.error, args);
                }
            }
        }
    };

    var createFetchRetry = function (options) {
        var instance = Object.create(fetch_retry_proto);

        var defaults = {
            delay_ms: 2000,
            timeout_ms: 30000,
            test_success: function () {
                return true;
            }
        };

        return _.extend(instance, defaults, options);
    };

    return {
        /**
         * @param {Object} options Backbone fetch options
         * @param {Function} options.test_success Function to evaluate additional success logic for fetch success. truthy = execute success, falsy = retry fetch after delay
         * @param {Number} options.delay_ms [Optional] Initial retry delay in ms
         * @param {Number} options.timeout_ms [Optional] Timeout (before executing error callback) in ms
         */
        fetch_retry: function (options) {
            utils.assert(options.test_success, 'Model.fetch_retry: \'test_success\' is a required option');
            utils.assert(options.success, 'Model.fetch_retry: \'success\' is a required option');

            var prop_list = ['test_success', 'delay_ms', 'timeout_ms'];

            // @todo Consider not filtering options so object prototype props can be overridden
            return createFetchRetry(_.extend({model: this}, _.pick(options, prop_list)))
                .start_fetch(_.omit(options, prop_list));
        }
    };
});
