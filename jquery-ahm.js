/**
 * jquery-ahm: ajax html modification jquery plugin
 *
 * @author    Sergey <parf@comfi.com>, Jusun <jusun@comfi.com>
 * @copyright 2011 Comfi.com, Sergey Porfiriev, Jusun Lee
 * @license   MIT License: http://www.jqueryahm.com/license
 * @version   1.6.0
 * @requires  jQuery 1.5+
 */
if (typeof jQuery['ahm'] === 'undefined') {
    jQuery.extend({
        /**
         * ahm jquery extension
         * same level as $.ajax(), will not work on selectors
         * @return false
         */
        ahm: function(url, options) {
            // default ajax settings
            var settings = {
                url: url,
                dataType: 'json'
            };
            if (options) $.extend(settings, options);

            // actual ajax call
            var ajax = $.ajax(settings);

            ajax.done($.ahm_exec);
            return false;
        },

        /**
         * ahm form helper extension
         * call this for all form submissions
         * @return false
         */
        // Send form, disables control on submission, does NOT reset controls on complete
        ahm_form_modal: function(form, options) {
            var settings = {
                complete: function(jqXHR, textStatus) {}
            };
            $.extend(settings, options);
            return $.ahm_form(form, settings);
        },
        // Send form, disables control on submission, resets controls on complete
        ahm_form: function(form, options) {
            // get form
            form = $(form);
            if (form.is('form') == false)
                form = form.closest('form');

            // get submit
            var submit = form.find(':submit');

            submit.attr('disabled', 'disabled');

            /**
             * because FormData cannot work with jQuery object
             */
            var formData = new FormData(form[0]);
            var request = new XMLHttpRequest();
            var url = form.attr('action');
            /**
             * because if GET method, request loses get params
             * doesn't add them automatically
             */
            if (form.attr('method') == 'get') {
                url = url + '?' + form.serialize();
            }
            request.open(form.attr('method'), url, true);
            request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            request.onreadystatechange = function() {
                if (this.readyState === request.DONE && this.status === 200) {
                    setTimeout(
                        function() {
                            submit.removeAttr('disabled');
                        }, 500
                    );
                    $.ahm_exec(request.response);
                }
            };
            request.send(formData);
            return false;
        },

        /**
         * execute an ahm response object directly
         *
         * e.g.
         * $.ahm_exec({'/alert':'test'});                              - built-in function
         * $.ahm_exec({"\/Rdf.top_go":"\/my\/agent\/dashboard"});      - json
         * $.ahm_exec({'/Rdf.top_go': '/my/agent/dashboard'});         - object
         *
         * @param response object|string
         */
        ahm_exec: function (response) {
            if (typeof response !== 'object') {
                response = JSON.parse(response);
            }
            $.each(response, function(index, params) {
                // get selector + callback
                var action   = index.split('/');
                var selector = action[0];
                var callback = action[1] ? action[1] : 'html'; // default callback is html

                // execute ahm callback
                exec(selector, callback, params);
            });

            // execute callbacks: jquery functions/plugins take precedence
            function exec(selector, callback, params) {
                // check for callback + this in params (object or array)
                if (typeof params == 'object') {
                    $.each(params, function(index, value) {
                        if (typeof value == 'string' && value.indexOf('function') == 0)
                            params[index] = window['eval']('(' + value + ')');	// yui-compressor hack
                        else if (value == 'this')
                            params[index] = options.context;
                    });
                }

                // replace this in selectors + params
                if (selector == 'this')
                    selector = options.context;
                if (params == 'this')
                    params = options.context;

                // get callback namespace
                var namespace;
                if (selector) {
                    namespace = $(selector);
                } else if (window[callback]) {
                    namespace = window;
                } else if (jQuery[callback]) {
                    namespace = jQuery;
                } else if (callback.indexOf('.') !== -1) { // only support dot notation
                    var method = callback.split('.');
                    namespace = window[method[0]];
                    callback = method[1];
                } else {
                    alert('ahm: undefined callback=' + callback);
                    return;
                }

                // exec callback
                if (typeof namespace[callback] == 'function') {
                    if ($.isArray(params)) namespace[callback]['apply'](namespace, params);
                    else if (params) namespace[callback](params);
                    else namespace[callback]();
                } else {
                    namespace[callback] = params;
                }
            }
        },

        /**
         * ahm load extension
         * dynamically load javascript only if not previously loaded
         * @return null
         */
        ahm_loaded: [],
        ahm_load: function(url) {
            if ($.ahm_loaded.indexOf(url) == -1) {
                $.ahm_loaded.push(url);
                $.ajax({
                    url:      url,
                    async:    false,
                    dataType: 'script'
                });
            }
        }

    });

    // bind default ahm functions
    $(function() {
        $('a.ahm').each(function (index) { $(this).attr("ahm-href", $(this).attr("href")); $(this).attr("href", "javascript:void(0)"); });
        $('body').delegate('a.ahm', 'click', function() { var href = $(this).attr("ahm-href"); if (!href) { href = $(this).attr("href"); } return $.ahm(href, {context:this}); });
        $('body').delegate('form.ahm', 'submit', function() { return $.ahm_form(this); });
        $('body').delegate('form.ahm_modal', 'submit', function() { return $.ahm_form_modal(this); });

        $('div.ahm,span.ahm').each(function() {
            var el = $(this);
            if (el.attr('data-url')) {
                if (el.attr('data-delay'))
                    setTimeout(function() {$.ahm(el.attr('data-url'), {context:el});}, el.attr('data-delay'));
                else
                    $.ahm(el.attr('data-url'), {context:el});
            }
        });
        $('body').delegate('span.ahm', 'click', function() { var href = $(this).attr("ahm-href"); if (!href) { href = $(this).attr("href"); } return $.ahm(href, {context:this}); });
    });
}
