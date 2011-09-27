/**
 * jquery-ahm: ajax html modification jquery plugin
 * 
 * @author    Sergey <parf@comfi.com>, Jusun <jusun@comfi.com>
 * @copyright 2011 Comfi.com, Sergey Porfiriev, Jusun Lee 
 * @license   MIT License: http://www.jqueryahm.com/license
 * @version   1.3.0
 * @requires  jQuery 1.5+
 */
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
			if (selector)
				var namespace = $(selector);
			else if (jQuery[callback])
				var namespace = jQuery;
			else if (window[callback])
				var namespace = window;
			else if ((f = window['eval'](callback)) && (callback = 'custom'))  // class.method/class[method]
				var namespace = { custom: f };
			else
				return alert('ahm: undefined callback='+callback);
			
			// exec callback
			if (typeof namespace[callback] == 'function') {
				if ($.isArray(params)) namespace[callback]['apply'](namespace, params);
				else if (params) namespace[callback](params);
				else namespace[callback]();
			} else {
				namespace[callback] = params;
			}
		};
		
		return false;
	}, 
	
	/**
	 * ahm form helper extension
	 * call this for all form submissions
	 * @return false
	 */
	ahm_form: function(form, options) {
		// get form
		var form = $(form);
		if (form.is('form') == false)
			form = form.closest('form');
		
		// get submit
		var submit = form.find(':submit');
		
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
	$('a.ahm').click(function() { return $.ahm(this.href, {context:this}); });
	$('form.ahm').submit(function() { return $.ahm_form(this); });
});