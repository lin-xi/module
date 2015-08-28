(function(window){
	var _modCache = {};
	var _fileCache = {};

	if(Array.prototype.forEach == undefined){
		Array.prototype.forEach = function(fn){
			for (var i = 0, len = this.length; i < len; i++) {
		        fn.call(this, this[i], i);
		     }
		}
	}

	function module(){
		var args = arguments;
		var path, func;

		if(args.length == 2){
			path = args[0];
			func = args[1];
		}

		var mod = _modCache[path];
		if(!mod){
			_modCache[path] = {
				path: path,
				func: func.apply(null)
			};
		}
	}

	function require(path){
		var mod = _modCache[path];
		if(mod){
			return mod.func;
		}
	}

	function _use(path){
		var defer = new Deferred();
		use(path, function(Mod){
			defer.resolve(path, Mod);
		});
		return defer;
	}

	function use(names, onload, onerror){
		if(!names) return;

		var paths = names;
		if(typeof(names) == 'string'){
			paths = names.split(',');
		}
		var mods = [];

		function doResolve(arr){
			if(arr.length > 0){
				var p = arr.shift().replace(/^\s*/, '').replace(/\s*$/, '');
				if(!/\.js$/.test(p)){
					p += '.js';
				}
				if(!_fileCache[p]){
					ajax.get(p).then(function(data){
						_fileCache[p] = data;
						compile(p).then(function(){
							mods.push(_modCache[p].func);
							doResolve(arr);
						});
					});
				}else{
					if(_modCache[p]){
						mods.push(_modCache[p].func);
						doResolve(arr);
					} else {
						console.error('not exist', p);
					}
				}
		 	} else {
		 		onload.apply(null, mods);
		 	}
		}
		doResolve(paths);
	}

	function compile(path){
		var defer = new Deferred();
		var jsData = _fileCache[path];
		// zebra has done this
		// var reg = /module\s*\(\s*function\s*\(\)\s*\{/;
		// jsData = jsData.replace(reg, function(s0, s1){
		// 	return 'module("'+path+'", function(){';
		// });
		// _fileCache[path] = jsData;
		// var basePath = '/';

		var reg2 = /require\([^\)]+\)/g;
		var reg3 = /require\(([^\)]+)\)/;
		var group = jsData.match(reg2);
		if(group){
			function doResolve(arr){
				if(arr.length > 0){
					var rpath = arr.shift().match(reg3)[1];
					rpath = rpath.slice(1, -1);
					// zebra has done this
					// if(/^(\.\/)|(\.\.\/)/.test(rpath)){
					// 	rpath = relative2absolute(rpath, basePath);
					// }

					if(!_modCache[rpath]){
						_use(rpath).then(function(){
							loadJs(rpath, function(){
								console.log("compile ", rpath);
								doResolve(arr);
							});
						});
					} else {
						doResolve(arr);
					}
				} else {
					loadJs(path, function(){
						console.log("compile ", path);
						defer.resolve();
					});
				}
			}
			doResolve(group);
		}else{
			loadJs(path, function(){
				console.log("compile ", path);
				defer.resolve();
			});
		}
		return defer;
	}

	var ajax = {
        send: function(url, method, params, cb) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    var data = xhr.responseText;
                    cb && cb(data);
                }
            }
            var body;
            if (params) {
                var bodies = [];
                for (var name in params) {
                    bodies.push(name + '=' + encodeURIComponent(params[name]));
                }
                body = bodies.join('&');
                if (body.length) {
                    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); 
                }        
            }
            xhr.send(body);
        },
        get: function(url, params) {
        	var defer = new Deferred();
            ajax.send(url, 'GET', params, function(data){
            	defer.resolve(data);
            });
            return defer;
        },
        post: function(url, params) {
        	var defer = new Deferred();
            ajax.send(url, 'POST', params, function(data){
            	defer.resolve(data);
            });
            return defer;
        }
    };

    var Deferred = function(){
    	var STATE = {
    		INIT: '1',
    		DONE: '2'
    	}
        var fn = null;
        var stat = STATE.INIT;
        return {
            then: function(func){
                fn = func;
                stat == STATE.DONE && fn();
            },
            resolve: function(){
            	stat = STATE.DONE;
                fn && fn.apply(null, arguments);
            }
        }
    };

    function when(ds){
    	var whenDefer = new Deferred();
    	var results = [], count = 0;

    	if(ds.length == 0){
    		setTimeout(function(){
    			whenDefer.resolve.apply(null);
    		}, 0);
    	} else {
	    	for(var i=0; i<ds.length; i++){
	    		(function(idx){
	    			var defer = ds[idx];
		    		if(defer){
			    		defer.then(function(data){
			    			resolve(idx, data);
			    		});
		    		}else{
		    			resolve(idx, null);
					}
	    		})(i);
	    	}
	    }

		function resolve(i, data){
			results[i] = data;
			count++;
			
			if(count == ds.length){
				whenDefer.resolve.apply(null, results);
			}
		}
		return whenDefer;
    }

    function relative2absolute(path, basePath) {
        if (!basePath || path.match(/^\//)) {
            return path;
        }
        var pathParts = path.split('/');
        var basePathParts = basePath.split('/');

        var item = pathParts[0];
        while(item === '.' || item === '..') {
            if (item === '..') {
                basePathParts.pop();
            }
            pathParts.shift();
            item = pathParts[0];
        }
        return basePathParts.join('/') + '/' + pathParts.join('/');
    }

	function newFunction(func) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    function F() {
	        return func.apply(this, args);
	    }
	    F.prototype = func.prototype;
	    return new F();
	};

	function loadJs(path, fn) {
		var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.onload = script.onreadystatechange = function() {
            if(!this.readyState || this.readyState=='loaded' || this.readyState=='complete') {
                fn && fn();
            }
        }
        script.type = 'text/javascript';
        script.src = path;
        head.appendChild(script);
    }

	window._modCache = _modCache;
	window.module = module;
	window.require = require;
	window.use = use;
})(window)