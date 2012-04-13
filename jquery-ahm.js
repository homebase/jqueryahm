/**
 * jquery-ahm: ajax html modification jquery plugin
 * -packaged with jquery-do @ git@github.com:homebase/jqueryrun.git
 * 
 * @author    Sergey <parf@comfi.com>, Jusun <jusun@comfi.com>
 * @copyright 2011 Comfi.com, Sergey Porfiriev, Jusun Lee 
 * @license   MIT License: http://www.jqueryahm.com/license
 * @version   1.5.1
 * @requires  jQuery 1.5+
 */
if (typeof jQuery['ahm'] === 'undefined') {
    jQuery.extend({
        /**
         * ahm jquery extension
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
            ajax.success(function(response) { 
                $.each(response, function(index, params) {
                    // get selector + callback
                    var action   = index.split('/');
                    var selector = action[0];
                    var callback = action[1] ? action[1] : 'html'; // default callback is html
    
                    // execute ahm callback
                    exec(selector, callback, params);
                });
            });
            
            // execute callbacks: jquery functions/plugins take precedence
            var exec = function(selector, callback, params) {
                // check for callback + this in params (object or array)
                if (typeof params === 'object') {
                    $.each(params, function(index, value) {
                        if (typeof value === 'string' && value.indexOf('function') === 0)
                            params[index] = window['eval']('[' + value + ']')[0]; // yui-compressor+ie hack
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
                    alert('ahm: undefined callback='+callback);
                    return;
                }
                
                // exec callback
                if (typeof namespace[callback] === 'function') {
                    if ($.isArray(params)) namespace[callback]['apply'](namespace, params);
                    else namespace[callback](params);
                } else {
                    namespace[callback] = params;
                }
            };
            
            return false;
        }, 
        
        /**
         * ahm form helper extension
         * -call this for all form submissions
         * @return false
         */
        ahm_form: function(form, options) {
            // get form
            form = $(form);
            if (form.is('form') == false)
                form = form.closest('form');
            
            // get submit
            var submit = form.find(':submit').not('[disabled="disabled"]');
            
            // execute ahm + return
            var settings = { 
                type: form.attr('method'),
                data: form.serialize(),
                context: form,
                beforeSend: function(jqXHR, settings) {
                    submit.attr('disabled', 'disabled');
                },
                complete: function(jqXHR, textStatus) {
                    submit.removeAttr('disabled');
                }
            };
            $.extend(settings, options);
            return $.ahm(form.attr('action'), settings);
        },
        
        /**
         * include $.run package
         * -https://github.com/homebase/jqueryrun
         */
        'run_loaded': [],
        'run': function(/* url, callback, params, .. */) {
            var args = [].slice.apply(arguments); // convert arguments to Array
            var url = args.shift();
            var callback = args.shift();

            if (url[0] === ':')
                url = "/js/" + url.substring(1) + ".js";

            if (typeof callback !== 'function') {
                var namespace = window;
                var cb = callback;
                callback = function() {
                    var i = cb.indexOf(".");
                    if (i != -1) {
                        namespace = window[cb.substr(0, i)];
                        cb = cb.substr(i+1);
                    }
                    namespace[cb].apply(namespace, args);
                };
            }

            if ($.inArray(url, $.run_loaded) != -1) {
                callback();
                return;
            }

            $.run_loaded.push(url);
            $.getScript(url).done(callback);
        }
        
    });
    
    // bind default ahm functions
    $(function() {
        $('body').delegate('a.ahm', 'click', function() { return $.ahm(this.href, {context:this}); });
        $('body').delegate('form.ahm', 'submit', function() { return $.ahm_form(this); });
    
        $('div.ahm,span.ahm').each(function() { 
            var el = $(this);
            if (el.attr('data-url')) {    
                if (el.attr('data-delay'))
                    setTimeout(function() {$.ahm(el.attr('data-url'), {context:el});}, el.attr('data-delay'));
                else
                    $.ahm(el.attr('data-url'), {context:el}); 
            }
        });
    });
}