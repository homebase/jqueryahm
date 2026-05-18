/**
 * vanilla-ahm: ajax html modification library
 */
AHM = {
    ahm: function(url, options) {
        options = options || {};

        if ("undefined" == typeof options.dataType) {
            options.dataType = "json";
        }
        let _method = 'GET';
        let post_params = "";
        if(options.type && options.type === 'POST') {
            _method = 'POST';
            options.dataType = "json";
            post_params = new FormData();
            if (options.data) {
                post_params =  AHM.appendArray(post_params,options.data)
            }
        } else {
            if (options.data) {
                var queryString = Object.keys(options.data).map(key => key + '=' + encodeURIComponent(options.data[key])).join('&');
                let url_params = new URLSearchParams(url);
                if (Array.from(url_params).length > 1) {
                    url = url + "&" + queryString;
                } else {
                    url = url + "?" + queryString;
                }
            }
        }

        var request = new XMLHttpRequest();
        request.open(_method, url, true);
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        request.responseType = options.dataType;
        request.onreadystatechange = function() {
            if (this.readyState === request.DONE && this.status === 200) {
                AHM.ahm_exec(request.response);
            } else {
                if (options.error && "function" == typeof options.error) {
                    options.error(this);
                }
            }
        };
        request.send(post_params);
        return false;
    },

    /**
     * ahm form helper extension
     * call this for all form submissions
     * @return false
     */
    // Send form, disables control on submission, doe NOT resets controls on complete
    ahm_form_modal: function(form, options) {
        var options = options || {};
        if ("undefined" == typeof options.complete) {
            options.complete = function(jqXHR, textStatus) {};
        }
        return AHM.ahm_form(form, options);
    },
    // Send form, disables control on submission, resets controls on complete
    ahm_form: function(form, options) {
        // get form
        if (form) {
            if ("FORM" != form.nodeName) {
                form = form.closest('form');
            }

            if (form.getAttribute("data-submit-status") && ("done" != form.getAttribute("data-submit-status")) ) {
                console.log("UZBAGOYSYA!")
                return;
            }


            // get submit
            let submit = form.querySelector(".form-submitter") || form.querySelector("[type='submit']");
            let orig_value = "";

            if (submit) {
                orig_value = submit.value
                submit.setAttribute('disabled', 'disabled');
            }
            form.setAttribute("data-submit-status", "ahm");


            /**
             * because FormData cannot work with jQuery object
             */
            let formData = new FormData(form);
            let request = new XMLHttpRequest();
            let url = form.getAttribute('action');
            let method = form.getAttribute('method') || "post";

            /**
             * because if GET method, request loses get params
             * doesn't add them automatically
             */
            if (method == 'get') {
                url = url + '?' + AHM.serialize_form_data(form);
            }
            request.open(method, url, true);
            request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            request.onreadystatechange = function () {
                if (this.readyState === request.DONE && this.status === 200) {
                    // Request finished. Do processing here.
                    setTimeout(
                        function () {
                            if (submit) {
                                submit.value = orig_value;
                                //submit.removeAttribute('disabled');
                            }
                            if ("ahm" == form.getAttribute("data-submit-status")) {
                                if (submit) {
                                    submit.removeAttribute('disabled');
                                }
                                form.setAttribute("data-submit-status", "done");
                            }
                        }, 500
                    );
                    AHM.ahm_exec(request.response);
                } else if (this.readyState === request.DONE && this.status === 500) {
                }
            };
            request.send(formData);

            if (submit) {
                if (submit.getAttribute("data-loading-text")) {
                    submit.value = submit.getAttribute("data-loading-text");
                }

            }
        }
        return false;
    },

    /**
     * @TODO add discription to the ahm documentation
     * e.g.
     * AHM.ahm_exec({'/alert':'test'}); - built-in function
     * AHM.ahm_exec({"\/Rdf.top_go":"\/my\/agent\/dashboard"}); - json
     * AHM.ahm_exec({/Rdf.top_go: "/my/agent/dashboard"}); - object
     *
     * @param response []string
     */
    ahm_exec: function (response) {
        if (typeof response !== 'object') {
            response = JSON.parse(response);
        }

        for (let [index, params] of Object.entries(response)) {
            // get selector + callback
            var action   = index.split('/');
            var selector = action[0];
            var callback = action[1] ? action[1] : 'html'; // default callback is html

            // execute ahm callback
            AHM.exec(selector, callback, params);
        }
    },

    // execute callbacks: jquery functions/plugins take precedence
    exec: function (selector, callback, params) {
        // check for callback + this in params (object or array)
        if (typeof params == 'object') {
            for (let [index, value] of Object.entries(params)) {
                if (typeof value == 'string' && value.indexOf('function') == 0)
                    params[index] = window['eval']('(' + value + ')');	// yui-compressor hack
                else if (value == 'this')
                    params[index] = options.context;
            }
        }

        // replace this in selectors + params
        if (selector == 'this')
            selector = options.context;
        if (params == 'this')
            params = options.context;

        // get callback namespace
        var namespace;
        if (selector) {
            namespace = document.querySelector(selector);
        } else if (window[callback]) {
            namespace = window;
        } else if (callback.indexOf('.') !== -1) { // only support dot notation
            var method = callback.split('.');
            namespace = window[method[0]];
            callback = method[1];
        } else {
            alert('ahm: undefined callback=' + callback);
            return;
        }

        // exec callback
        if (namespace) {
            if (typeof namespace[callback] == 'function') {
                if (Array.isArray(params)) namespace[callback]['apply'](namespace, params);
                else if (params) namespace[callback](params);
                else namespace[callback]();
            } else {

                switch (callback) {
                    case "val":
                        namespace.value = params;
                        break;
                    case "html":
                        AHM.innerHTML(namespace, params);
                        break;
                }
            }
        }
    },

    /**
     * ahm load extension
     * dynamically load javascript only if not previously loaded
     * @return null
     */
    ahm_loaded: [],
    ahm_load: function(url, onload) {
        if (AHM.ahm_loaded.indexOf(url) == -1) {
            AHM.ahm_loaded.push(url);

            var s = document.createElement('script');
            s.src = url;
            if ("function" === typeof(onload)) {
                s.onload = onload;
            }
            document.getElementsByTagName('head')[0].appendChild(s);
        }
    },

    serialize_form_data: function (form) {
        var serialized = [];

        // Loop through each field in the form
        for (var i = 0; i < form.elements.length; i++) {

            var field = form.elements[i];

            // Don't serialize fields without a name, submits, buttons, file and reset inputs, and disabled fields
            if (!field.name || field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') continue;

            // If a multi-select, get all selections
            if (field.type === 'select-multiple') {
                for (var n = 0; n < field.options.length; n++) {
                    if (!field.options[n].selected) continue;
                    serialized.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[n].value));
                }
            }

            // Convert field data to a query string
            else if ((field.type !== 'checkbox' && field.type !== 'radio') || field.checked) {
                serialized.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
            }
        }

        return serialized.join('&');
    },
    appendArray: function (form_data, values, name) {
        if (!values && name !== undefined) {
            form_data.append(name, '');
        } else {
            if (typeof values == 'object') {
                for (let key in values) {
                    if (typeof values[key] == 'object') {
                        if (!name) {
                            AHM.appendArray(form_data, values[key], key);
                        } else {
                            AHM.appendArray(form_data, values[key], name + '[' + key + ']');
                        }
                    } else {
                        form_data.append((name ? name + '[' + key + ']' : key), values[key]);
                    }
                }
            } else {
                form_data.append(name, values);
            }
        }
        return form_data;
    },

    get: function(url, callback) {
        AHM._sc(url, "GET", "text", callback);
    },

    post: function(url, callback) {
        AHM._sc(url, "POST", "text", callback);
    },

    load: function(url, el) {
        AHM._sc(url, "POST", "text", function(d){ el.innerHTML = d});
    },

    _sc: function (url, type, data_type, callback) {
        let oReq = new XMLHttpRequest();
        oReq.open(type, url, true);
        oReq.responseType = data_type;
        if ("function" == typeof(callback)) {
            oReq.onload = function (e) {
                callback(oReq.responseText);
            }
        }
        oReq.send();
    },

    innerHTML: function(el, html) {
        el.innerHTML = html;
        Array.from(el.querySelectorAll("script")).forEach( oldScript => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes)
                .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

};

// delegate default ahm listeners
document.addEventListener("DOMContentLoaded", function() {

    document.querySelectorAll("a.ahm").forEach(
        function (e) {
            let a = e.getAttribute("ahm-href")
            let b = e.getAttribute("href")
            if(a === undefined || a === null){
                if(b === undefined || b === null){
                    console.error("undefined href");

                }else {
                    e.setAttribute("ahm-href", b);
                }
            }else{
                if (b){
                    console.error("double attribute ahm-href and href");
                }
            }
            e.setAttribute("href", "javascript:void(0)")
        }
    );

    document.querySelectorAll("span.ahm").forEach(
        function(e) {
            if (e.getAttribute("data-url")) {
                if (e.getAttribute("data-delay"))
                    setTimeout(function() {AHM.ahm(e.getAttribute('data-url'), {context:e});}, e.getAttribute('data-delay'));
                else
                    AHM.ahm(e.getAttribute('data-url'), {context:e});
            }
        }
    );

    document.addEventListener("click", function(e) {
        if (e.target) {
            if (e.target.classList.contains("ahm")) {
                switch (e.target.nodeName) {
                    case "A":
                    case "SPAN":
                        e.stopPropagation();e.preventDefault();
                        var href = e.target.getAttribute("ahm-href"); if (!href) { href = e.target.getAttribute("href") }; return AHM.ahm(href, {context:this});
                        break;
                }
            }
        }
    });

    document.addEventListener("submit", function(e) {
        if (e.target) {
            if ("FORM" == e.target.nodeName) {
                if (e.target.classList.contains("ahm")) {
                    e.stopPropagation();e.preventDefault();
                    AHM.ahm_form(e.target);
                    return false;
                } else if (e.target.classList.contains("ahm_modal")) {
                    e.stopPropagation();e.preventDefault();
                    AHM.ahm_form_modal(e.target);
                    return false;
                }
            }
        }
    });

    document.querySelectorAll("form.ahm, form.ahm_modal").forEach(function(e) {
        e.submit = function() { return AHM.ahm_form(this); };
    });

});
