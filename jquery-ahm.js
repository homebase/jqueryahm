/**
 * jquery-ahm: ajax html modification jquery plugin
 * 
 * @author    Sergey <parf@comfi.com>, Jusun <jusun@comfi.com>
 * @copyright 2011 Comfi.com, Sergey Porfiriev, Jusun Lee 
 * @license   MIT License: http://www.jqueryahm.com/license
 * @version   1.1.0
 * @requires  jQuery 1.5+
 */
jQuery.extend({
	/**
	 * ahm jquery extension
	 * first-class extension, same level as $.ajax(), will not work on selectors
	 * @return false
	 */
	ahm: function(url, params, options) {
		// default ajax settings
		var settings = {
			url:	  url,
			data:	  params,
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
			// check for callback in params
			$.each(params, function(index, value) {
				if (typeof value == 'string' && value.indexOf('function') == 0)
					params[index] = window['eval']('(' + value + ')');
			});
			
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
		
		// get submit + original value
		var submit = form.find(':submit');
		var value  = submit.attr('value');
		
		// execute ahm + return
		var settings = { 
			type: form.attr('method'),
			beforeSend: function(jqXHR, settings) {
				submit.attr('value', 'Please wait...').attr('disabled', 'disabled');
			},
			complete: function(jqXHR, textStatus) {
				submit.removeAttr('disabled').attr('value', value);
			}
		};
		$.extend(settings, options);
		return $.ahm(form.attr('action'), form.serialize(), settings);
	}
	
});

// bind default ahm functions
$(function() {
	$('a.ahm').click(function() { return $.ahm(this.href); });
	$('form.ahm').submit(function() { return $.ahm_form(this); });
});