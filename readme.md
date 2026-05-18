jquery-ahm
==========

`ahm` (ajax html modification) reduces ajax client code by letting the **server response itself describe the callbacks**. One request → server returns a JSON map of `{selector/action: payload}` pairs → AHM applies *all* of them in one pass. The server stays the source of truth for both layout and validation; the client is a thin executor.

* Super light-weight: ~1KB minified
* Drop-in replacement for `$.ajax()`
* Works with all jQuery methods + plugins + custom callbacks
* No repetitive javascript code for every ajax request
* Dynamically load scripts on the fly (`$.ahm_load`)
* Two implementations of the same protocol: **jQuery** (this repo) and **vanilla** (no jQuery dependency)

Requirements
------------
jQuery 1.5+ (jQuery version) / no dependencies (vanilla version)

Use when
--------
Use AHM for small server-driven UI updates:

- replace HTML fragments
- update input values
- call simple global page callbacks
- submit forms without a full page reload
- popup forms whose HTML is lazy-loaded on demand
- server-side form validation (server re-paints all error divs in one response)

Avoid AHM for high-frequency interactions (slider drags, live typing). Each AHM call is a server round-trip — fine for submits and clicks, wrong tool for `oninput`.

Response Protocol
-----------------
The server returns an object where each key describes one action:

```json
{
  "#message/html": "Saved",
  "#email/val": "user@example.com",
  "/App.reload": {"force": true},
  "/alert": "Hello"
}
```

Each key is split by `/`:

- left side: CSS selector, or empty string for a global callback
- right side: action / callback name
- default action: `html`

Built-in actions
----------------

| action | jQuery version                                              | vanilla version                                                                  |
|--------|-------------------------------------------------------------|----------------------------------------------------------------------------------|
| `html` | jQuery's `.html()` (does **not** re-execute injected `<script>` tags) | `AHM.innerHTML(el, html)` — replaces innerHTML AND re-creates `<script>` nodes so injected scripts execute |
| `val`  | jQuery's `.val()`                                           | sets `element.value`                                                             |
| any other | tries jQuery method/plugin; if none, assigns as a property | **silent no-op** (the switch only handles `html` and `val`)                       |

Global callbacks (empty selector):

- `"/alert": "text"` → `window.alert("text")`
- `"/Namespace.method": params` → `window.Namespace.method(params)`

If `params` is an array, AHM calls the callback with `apply()`.

> Dot notation supports only **one level**: `Foo.Bar.baz` resolves to `window.Foo['Bar']` — the rest is dropped.

Patterns
--------

### Popup form — lazy load + submit

Empty popup shell on the page; click a trigger, AHM fetches the form HTML, server returns it as one `html` action:

```html
<a class="ahm" href="/contact-form?listing=123">Contact</a>
<div id="popup"></div>
```

```json
// server response when the link is clicked
{
  "#popup/html": "<form class=\"ahm\" action=\"/contact-submit\" method=\"post\">…</form>"
}
```

The fetched form is *itself* `class="ahm"`, so submit is intercepted automatically — same response protocol applies.

### Server-side validation

On invalid input the server returns one response that paints all field errors at once + keeps the popup open:

```json
{
  "#email-error/html": "Invalid email",
  "#phone-error/html": "",
  "#popup-status/val": "draft"
}
```

On valid input the same response protocol does the success flow — close popup, update page, show toast — no separate success code path on the client:

```json
{
  "#popup/html": "",
  "#listing-counter/html": "27 inquiries",
  "/Toast.show": "Message sent"
}
```

### On-demand JS

```js
$.ahm_load('/js/dist/heavy-feature.js');                            // jQuery: synchronous, deduped by URL
AHM.ahm_load('/js/dist/heavy-feature.js', () => HeavyFeature.init()); // vanilla: async <script> append, optional onload
```

jQuery AHM (this repo)
----------------------

**Files:** `jquery-ahm.js`, `jquery-ahm.min.js`
**Version:** 1.6.0

### API

```js
$.ahm(url, options)                  // $.ajax replacement; runs response through $.ahm_exec
$.ahm_exec(response)                 // execute a response object directly
$.ahm_form(form, options)            // submit a form via FormData/XHR, run response
$.ahm_form_modal(form, options)      // same, intended for modal forms
$.ahm_load(url)                      // load a script once per URL (deduped)
$.ahm_loaded                         // array of already-loaded URLs
```

Typical calls:

```js
$.ahm('/url');
$.ahm('/url', {data: {a: 1}});
$.ahm('/url', {type: 'POST', data: {a: 1}, context: this});
$.ahm_exec({'#message/html': 'Saved'});
$.ahm_form(document.getElementById('form-id'));
```

### Auto-binding (on DOM ready)

| element              | behavior                                                                 |
|----------------------|--------------------------------------------------------------------------|
| `a.ahm`              | `href` copied to `ahm-href`, `href` set to `javascript:void(0)`; click → `$.ahm(href, {context: this})` |
| `span.ahm[data-url]` | request sent on page ready; `data-delay` delays it                       |
| `span.ahm` (any)     | click → `$.ahm(href, {context: this})`                                   |
| `div.ahm[data-url]`  | request sent on page ready                                               |
| `form.ahm`           | submit → `$.ahm_form(this)`                                              |
| `form.ahm_modal`     | submit → `$.ahm_form_modal(this)`                                        |

### Form submit

Uses raw `XMLHttpRequest` (not `$.ajax`):

- serializes with `FormData(form[0])`
- sets `X-Requested-With: XMLHttpRequest`
- disables `:submit`; re-enables it after ~500 ms
- on HTTP 200 → runs `$.ahm_exec(response)`
- non-200 is silently ignored (no `else` branch)

### Request

`$.ahm()` delegates to `$.ajax(settings)`. `dataType` defaults to `'json'`. GET/POST encoding follows jQuery's `$.param()`.

### Quirks

- **`options.context` ReferenceError.** Inside the inner `exec()` of `$.ahm_exec`, `options` is not in scope, yet `options.context` is referenced whenever a value or selector equals the literal string `"this"`. Triggering that path throws.
- **Unknown action on a `$(selector)` namespace** falls through to `namespace[callback] = params` — assigns onto the jQuery object instead of doing anything visible.
- **`alert('ahm: undefined callback=...')`** is shown to end users when an empty-selector callback can't be resolved.
- **`$.ahm_exec` evals strings starting with `"function"`** as JS (yui-compressor hack).
- **`html` action does not re-execute injected `<script>` tags** — that's a vanilla-only feature via `AHM.innerHTML`. Push scripts via `$.ahm_load` instead.

Vanilla AHM
-----------

A jQuery-free implementation of the same protocol. Not part of this repo — see `vanilla-ahm.js` in your project's vanilla AHM bundle.

### API

```js
AHM.ahm(url, options)                  // raw-XHR request; runs response through AHM.ahm_exec
AHM.ahm_exec(response)
AHM.exec(selector, callback, params)   // single action
AHM.ahm_form(form, options)            // submit a form
AHM.ahm_form_modal(form, options)
AHM.ahm_load(url, onload)              // dedupes by URL; appends <script>, optional onload
AHM.ahm_loaded                         // array of already-loaded URLs

// plain text XHR helpers (do NOT use the AHM protocol)
AHM.get(url, callback)
AHM.post(url, callback)
AHM.load(url, element)                 // → element.innerHTML

// utilities
AHM.serialize_form_data(form)          // GET-style form serialization (skips disabled/file/submit/button/reset)
AHM.appendArray(formData, values, name)// PHP-style nested FormData keys
AHM.innerHTML(element, html)           // replaces innerHTML and re-creates <script> nodes
```

### Auto-binding (on DOMContentLoaded)

Same selectors as jQuery (`a.ahm`, `span.ahm[data-url]`, `form.ahm`, `form.ahm_modal`). Click dispatch is one document-level listener.

Additional vanilla behaviors:
- Every `form.ahm` / `form.ahm_modal` present at DOMContentLoaded has its `.submit` method overridden to call `AHM.ahm_form(this)`. Dynamically-injected forms don't get this override (the submit *event* still works through the document-level delegate).
- `a.ahm` with both `ahm-href` AND `href` already set logs `console.error("double attribute ahm-href and href")`.

### Form submit

- serializes with `FormData(form)`
- submit element: `form.querySelector(".form-submitter") || form.querySelector("[type='submit']")` — `.form-submitter` wins if present
- sets `data-submit-status="ahm"` on submit; only flips to `"done"` after the 500 ms re-enable timer
- **Duplicate-submit guard**: if `data-submit-status` is set and not `"done"`, submit returns early after logging `UZBAGOYSYA!` to the console
- Submit button supports `data-loading-text`: its `value` is swapped to that text during submission and restored on completion
- GET method: appends `AHM.serialize_form_data(form)` to the URL
- HTTP 500 path is an **empty** branch — server errors are silently swallowed

### Request

- GET: appends `options.data` to query string via `encodeURIComponent` (flat — no nested support)
- POST: sends `FormData`; nested objects encoded with PHP-style keys via `AHM.appendArray()`
- Sets `X-Requested-With: XMLHttpRequest`
- `options.dataType` defaults to `'json'` and is set as `XMLHttpRequest.responseType`
- `options.error(xhr)` fires from inside `onreadystatechange`'s else branch — may fire **multiple times** per request (once per non-200 readyState transition)

### Vanilla-only quirks

- `AHM = {...}` is declared without `var`/`let`/`const`.
- The action switch on DOM elements only handles `html` and `val`. Any other action against a selector is a **silent no-op**.
- **GET URL-concat bug**: when both the URL has an existing query string AND `options.data` is provided, the implementation does `new URLSearchParams(url)` on the whole URL (not the query portion). For a base URL with a single `?key=val` this misclassifies and produces a second `?`, yielding `/foo?a=1?b=2`. Avoid GET with `options.data` when the URL already has a query string.
- The `data-submit-status` guard is sticky: a form that never transitions to `"done"` stays permanently un-submittable.

Shared quirks (both versions)
-----------------------------

- **`options.context` ReferenceError** when value or selector equals `"this"` — `options` is out of scope inside the inner `exec()`.
- **Dot-notation single level** — `Foo.Bar.baz` only resolves to `window.Foo['Bar']`.
- **`alert('ahm: undefined callback=...')`** when an empty-selector callback can't be resolved.
- **Strings starting with `"function"`** in params are `eval`'d as JS.

License
-------
MIT
