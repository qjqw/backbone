//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
 
(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  // 声明一个变量指向全局对象
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  // 先把之前的 backbone 存起来，跟 jQuery 好像
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  // 保存 Array 的一些方法
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.
  // backbone 的主体开始啦，先判断是在服务端还是浏览器..
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  // 声明版本号
  Backbone.VERSION = '1.0.0';

  // Require Underscore, if we're on the server, and it's not already present.
  // 保存 underscore.js 的下划线，如果是服务端就用 require 导入 underscore
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  // 保存其它框架的$
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  // noConflict方法，如果调用了就把 Backbone指向以前版本的 backbone对象.....
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  // 打开 emulateHTTP ( 设置emulateHTTP为true )，可以对于不支持REST的服务器伪装PUT和DETELE请求，
  // 并且加入_method参数说明这个请求的行为，设置X-Http-Method-Override头信息(查了好久..)
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  // 对于不支持 application/json 编码的浏览器，采用 application/x-www-form-urlencoded 方式发送数据，
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  // Events 模块，支持任何对象，用法就像上面的例子
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    // 绑定事件
    on: function(name, callback, context) {
      // 判断是否需要把参数拆分..
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      // 设置_events对象， 所有的事件都会保存在这里
      // 例如：
      // Obj = {
      //   _events: {
      //     click: [ Method List ],
      //     mousedown: [ Method List ]
      //   }
      // }
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);

      // 把方法push进_events里的相关属性里
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    // 只执行一次绑定的事件
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      // 利用 underscore 的 once 方法创建一个只可以执行一次 function..
      var once = _.once(function() {
      	// 去除已经绑定的事件
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      // 把 underscore 的返回值绑给自己
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    // 解绑已经绑定的事件，支持 callback 或者 context 解绑
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      // 先判断是否有已经绑定的事件
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      // 如果参数为空，解绑所有已绑定的事件，也就是把_events设为一个空的object
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      /* 设置要解绑的事件名子集合，如果传了name，只返回[ name ]
         如果不传 name 的值，就返回 _events( 保存事件的Object ) 里的所有事件名
         比如 Obj = {
			    _events: {
				  click: [ Method List ],
				  mousedown: [ Method List ]
			    }
    	      }
	  	 names = [ 'click', 'mousedown' ]
	  */
      names = name ? [name] : _.keys(this._events);
      // ....如果不传 name ，会遍历所有的已绑定事件
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        // 事件列表赋值给 events，顺便判断是不是空的或者其它返回 false 的值
        if (events = this._events[name]) {
          // 先把事件的列表设为空的...
          this._events[name] = retain = [];
          if (callback || context) {
          	// 如果设置了 callback 或者 context，
          	// 判断是不是不符合条件
          	// 判断 callback 是不是相等 ( _callback 是 once 事件绑定的，所以也需要判断 )，或者 context
          	// 是不是相等
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
              	// 注意 retain === _events[ name ]，所以这里相当与把不符合条件的 callback
                // 又push回去了
                retain.push(ev);
              }
            }
          }
          // 如果这个事件里没有绑定的方法了，就删掉这个事件，省内存..
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
	// 触发事件
    trigger: function(name) {
      // 先判断_events对象是不是存在
      if (!this._events) return this;
      // 把传进来的参数从第2个开始转换为一个Array，最后当成参数传给 callback 们
      var args = slice.call(arguments, 1);
      // 同样先进行拆分
      if (!eventsApi(this, 'trigger', name, args)) return this;
      // 取到事件对象
      var events = this._events[name];
      // Collection 里用了 all 参数，会执行所有已绑定的事件..
      var allEvents = this._events.all;
      // 执行事件
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      // 判断是否要删除监听对象
      var deleteListener = !name && !callback;
      // 判断第二个参数是不是 object，如果是object，就不需要 callback 了，因为 object，是 event: callback 的格式，
      // 而且eventsApi 拆分 object 的时候，还会把 off 方法传的第二个参数当成 context 处理，
      // 所以这里把 callback 指向 this
      if (typeof name === 'object') callback = this;
      // 如果传了 obj 值，把 listener 指向一个新创建的 object，并且把新 object 的名字为obj._listenerId的属性
      // 赋值给新的 object
      // 相当于
      // obj = {
      //   _listenerId: 'test'
      // }
      // listener = {}
      // listener[ obj._listenerId ] = obj;
      // 最终结果 listener.test = obj;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      // 为 listener 的每一个属性都调用 off 事件解绑
      for (var id in listeners) {
      	// 解绑方法..
        listeners[id].off(name, callback, this);
        // 如果没传 callback 和 name 就删除 _listener里的引用
        // 所以如果 stopListening 执行的时候如果什么都没传，会清空所有的 listener
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  // 正则 是否有空格
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  /* 处理 Events 对象用的，主要用于绑定、解绑事件，当然还有once和trigger
     执行原理分三种情况
     第一种：参数是不带空格的string
     会返回 true
     第二种：调用函数时传的是 object
     例如 Obj.on({ 
     	click: function a(){},
     	mousedown: function b(){}
     }),
     这时会立刻执行 eventsApi，这时on里面的代码不再继续执行(因为参数是object类型
     ，eventsApi的返回值是false)，然后把每一个属性都再次传给 on，
     相当于 Obj.on( 'click', function a(){} ); Obj.on( 'click', function b() {} );
	 这时on执行eventsApi结果会返回true，因为第一个参数是没有空格的string，然后通过
	 on里面的后续代码完成事件的绑定。
	 第三种： 调用函数时传的是 '{string} {string}' 类型
	 例如： var a = function(){};
	 Obj.on( 'click mousedown', a );
	 同上，第一次执行会分成 click 和 mousedown 两个事件分别调用 on,
	 Obj.on( 'click', a ); Obj.on( 'mousedown', a );
	 注意：这里会把 click 和 mousedown 绑定同一个方法..
  */
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  // 据英文注释说，这样写可以优化性能，是不是可以理解为 call 比 apply 的效率高？
  // 看了下 ecmascript 手册，确实 apply 的步骤比 call 多很多，不知道浏览器实现的时候是不是这样
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  // listen 对象，用于监听别的对象的事件
  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  // 向 Events 对象中添加 on 和 once 方法，类似于
  /*
	 Events.on = function( obj, name, callback ) {
		var listeners = this._listeners || (this._listeners = {});
		var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
		listeners[id] = obj;
		if ( typeof name === 'object' ) callback = this;
		obj.on( name, callback, this );
		return this;
	 } 
	 once 同 on
  */
  _.each(listenMethods, function(implementation, method) {
  	// implementation 在这里分别是 'on' 和 'once'
  	// method 分别是 'listenTo' 和 'listenToOnce'
    Events[method] = function(obj, name, callback) {
      // 先判断对象是否有 _listeners 属性， 如果没有创建一个空的 object
      var listeners = this._listeners || (this._listeners = {});
      // 为 obj 添加 _listenerId ， this 添加 obj._listenerId 的值为 obj
      // 形似 a = { _listenerId: "{唯一标识，例如l001}"}; b = { l001: a }
      // _.uniqueId 的作用是创建唯一标识..
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      // 判断传的参数是不是 { Event: Callback, Event1: Callback1 } 这种格式
      if (typeof name === 'object') callback = this;
      // 调用 on 或者 once 为传进来的 obj 绑定事件
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  // 新添加两个属性，分别指向 on 和 off，我自己更喜欢用 bind...
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  // 把 Events 对象放进 Backbone
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  // 模板的构造函数
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    // 为模板设置一个以 c 开头的标记
    this.cid = _.uniqueId('c');
    this.attributes = {};
    // 把 options 里的 url, urlRoot, collection 参数设给 this
    _.extend(this, _.pick(options, modelOptions));
    // 如果设置 options 的 parse 为 true，就执行 parse 方法， 把返回结果放到 attrs 中
    if (options.parse) attrs = this.parse(attrs, options) || {};
    // 返回 this.defaults 的结果，赋给 defaults
    if (defaults = _.result(this, 'defaults')) {
      // 如果 defaults 有结果，就把 defaults 的值放到 attrs 中
      // defaults跟extend的区别是, defaults 不会把原有的值覆盖掉
      attrs = _.defaults({}, attrs, defaults);
    }
    // 调用 set 方法，设置属性，如果属性改变，还会触发 change 事件
    this.set(attrs, options);
    // 设置记录的已改变的属性为空对象
    this.changed = {};
    // 调用初始化方法，默认是空的函数，可以通过 attributes 传进来.
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  // 为 Model 类设置原型，这里会把 Events 对象放进去，所以 Model 也添加了事件的一系列方法
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    // 记录改变的属性
    changed: null,

    // The value returned during the last failed validation.
    // 记录验证失败
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    // 如英文注释
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 默认会调用 initialize 方法，比如传给构造函数一个 initialiaze 方法，那么就会被自动调用
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    // 返回 attributes 的浅度克隆的对象，就是说如果 attributes 的一个属性是对象，那么这个值
    // 改变了，返回值的对象的值也会跟着改变
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    // 发请求的方法，Backbone 默认调 jQuery，详细看 Backbone.sync
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    // get方法..
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    // 转化属性
    // http://baike.baidu.com/view/801172.htm
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    // 判断属性是否是有效值
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    // 设置属性值
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      // 如果第一个参数是 { key: value } 这种格式，把第二个参数当做 options 处理
      // 如果是字符串，创建一个 { key: value } 的对象
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      // 验证属性，需要设置 validate 方法，注意没有下划线
      // validate 可以在 options 里设置，也可以在初始化模板的时候设置
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      // 设置_changing 为 true
      this._changing  = true;

      // 这个 if 的作用是判断是不是在递归调用中，详细看下面
      // 如果是在递归中，不会重新设置 _previousAttributes 和 changed
      if (!changing) {
      	// 保存改变之前的属性
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      // 设置id，这么写的原因前面解释过了，有些人喜欢用_id
      // 用法应该是在初始化的时候设置idAttribute属性为自己喜欢的名字
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        // 如果传进来的参数之前已经有值了，并且它们不相等，就把值 push 进changes
        // _.isEqual 最大的作用是判断两个 object 是否相等，因为两个 object 用 == 判断不出来
        // 就像 [] != [] 一样，因为就是两个不相等的对象，isEqual就是分别判断里面的值是不是相等，so..
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        // 判断传进来的参数是否于之前改变的属性相等，如果相等就删掉之前的属性，
        // 如果不等，或者不存在，就替换掉原来改变的参数。
        // 比如说第一次执行set的时候 changed 会被设置为 {}
        // 然后设置 test 为 true，那么 changed 会变为 { test: true }，
        // 再次设置 test 为 true，就删除掉 test，changed又变回 {}
        // 相当于本次执行没有改变值，changed里储存的总是最后一次改变的值
        // PS: 如果本次执行触发的 change 事件中调用了 set，也算成本次事件改变的
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        // 如果设置 unset 为 true，会删除掉原有的属性
        // 设置为 false 会覆盖原有属性，或者新增
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      // 如果 options 里设置 slient 为 true，
      // 不会触发change事件，这里会触发每一个属性的 change 方法
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      // T.T 终于明白 changing 是做什么用的了，因为 change 事件很有可能再次调用 set 方法，
      // 然后 change 事件里的 changing 会为 true，也就是再这里停掉，就像注释说的，这是一个
      // 递归，只有第一次调用 set 才会继续执行后面的部分，而 change 里的 set 方法，只会执行
      // 到这里
      if (changing) return this;
      // pending 和 changing 差不多原理，因为 change 事件还有可能会调用 set，然后把_pending
      // 设置为 true，乍一看很 if 语句差不多，这个地方主要是触发整个对象的change事件，
      // 跟上面不一样..
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      // set结束，设置 _pending 和 _changing 为 false
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    // 删除属性，并且触发 change 事件
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    // 清空属性，并且触发 change 事件
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    // 判断属性在最后一次 set 方法中是否被改变了
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    // 判断 diff 传的参数中，有哪些参数与上一次的数据不一致，
    // 比如上一次有个属性为 a = 1，在最后一次 set 中，设置了 a = 2
    // 用 changedAttributes 会判断diff 中的 a 是否等于 1，虽然 changed 结果中
    // 已经有 a = 2，但是 changed 方法跟直接判断 diff 中的 a 有些差异，好混乱...
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      // 如果在 change 事件中调用 changedAttributes，设置 old 为 change 之前的 attributes
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired. 
    // 返回最后一次 change 事件执行之前的属性
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    // 返回所有最后一次 change 事件触发之前的属性
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    // 重新从服务器获取数据
    fetch: function(options) {
      // 让 options 指向一个新创建的对象，而不是原对象
      // 因为下面会修改 parse 和 success 属性，如果是引用，会把原对象的属性改变
      options = options ? _.clone(options) : {};
      // 设置 parse 默认为 true
      if (options.parse === void 0) options.parse = true;
      var model = this;
      // 保存 options 中的 success 方法
      var success = options.success;
      options.success = function(resp) {
      	// 把返回的数据设置到属性中..
        if (!model.set(model.parse(resp, options), options)) return false;
        // 调用原来的 success 方法
        if (success) success(model, resp, options);
        // 触发 sync 事件
        model.trigger('sync', model, resp, options);
      };
      // 类似 success，error也被包装了一下
      wrapError(this, options);
      // 调用 sync 发请求
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      // 支持 {} 参数格式
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      // 如果没传 options 或者 没设置 wait 属性，就先设置数据，并且触发 change 事件，
      // 如果 set 属性的时候验证数据失败，就 return false;
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      // 让 options 指向一个新创建的对象，默认设置 validate 为 true，再把原 options 的属性
      // 复制过来..
      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      // 数据验证
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      // 如果 options 设置了 wait 属性，就先把 attrs 设置到 attributes 里
      // 方便把修改后的数据发送到服务器，这里先不触发 change 事件，因为还不知道
      // 保存数据是否成功，并且把 attributes 指向一个新的对象，
      // 所以这里 attributes !== this.attributes..
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      // 如果没传 parse，设置 parse 为 true
      if (options.parse === void 0) options.parse = true;
      var model = this;
      // 储存 options 中的 success 方法
      var success = options.success;
      // 设置 success 方法
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        // 重新设置一下 attributes，因为设置了 wait 属性， 当前 model 的属性会被改变一次指向
        model.attributes = attributes;
        // 调用 parse 方法处理服务器返回的数据
        var serverAttrs = model.parse(resp, options);
        // 如果设置了 wait 属性，把 attrs 放到 serverAttrs 中，
        // 如果没有设置 wait，就不需要这么做了，因为刚进入函数的时候，
        // attrs 已经被设置到 attributes 里了..
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        // 调用 set 方法，设置属性，如果数据验证不通过，返回 false..
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        // 调用原 options 中的 success 事件
        if (success) success(model, resp, options);
        // 触发 sync 事件..
        model.trigger('sync', model, resp, options);
      };
      // 设置 error 方法
      wrapError(this, options);

      // 设置发数据的方法
      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      // 在设置了 wait 的情况下，重新设置 attributes 为原来的 attributes..
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      // 贮存 success 事件
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
      	// 如果设置了 wait，直接触发 destroy 事件
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        // 触发 sync 事件
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      // 如果当前的 model 是新的，也就是没有被贮存到服务器中，
      // 直接执行 success 方法..
      if (this.isNew()) {
        options.success();
        return false;
      }
      // 包装 error 方法
      wrapError(this, options);

      // 向服务器发请求
      var xhr = this.sync('delete', this, options);
      // 如果没设置 wait 方法，直接触发 destroy 事件
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    // 取到当前 model 的 url
    url: function() {
      // 取到 baseURL，如果失败抛出一个 url 错误
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      // 把baseURL   + '/{id}'，假如 baseUrl 为 http://www.test.com/ id 为 123
      // 最终会变成 http://www.test.com/123
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    // 处理数据用的，通常应该传给 model 一个 parse 对象
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    // 克隆当前 model
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    // 判断当前 model 是否是没被存到服务器中的..
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    // 验证当前 model 的数据
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    // 用于验证数据的方法，调用 this.validate 验证
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  // 把 underscore 的一些方法放到 Model 中
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  // Collection 的构造函数
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    // 一系列的设置
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    // 设置所有的数据为空值
    this._reset();
    // 初始化
    this.initialize.apply(this, arguments);
    // 调用 reset 方法把传进来的 models 放到 this.models 中，默认不触发事件
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  // set 方法的默认 options
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  // 设置 Collection.prototype
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    // 如英文注释，只是一个默认的 model，大部分情况需要覆盖它
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.'
  	// 默认的 initialize 方法，只是为了在构造函数中调用不出错..
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      // 通过调用每一个 model 的 toJSON 方法，把所有的 model 的 attributes 拿出来，返回一个集合，
      // this.map 是一个包装的 underscore 的 map 方法，类似
      // this.map = function( fn ) {
      //   return _.map( this.models, fn );
      // }
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    // 默认调用 Backbone.sync
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    // 添加 model，可以是一个 model 或者 多个 model
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    // 删除 models
    remove: function(models, options) {
      // 处理传进来的 models，如果是一个类数组，就调用 slice
      // 方法处理成数组，否则直接创建一个数组，把 models 放进去
      models = _.isArray(models) ? models.slice() : [models];
      // 处理 options
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
      	// 通过 models[i] 的 id 找到 model..
        model = this.get(models[i]);
        if (!model) continue;
        // 从 _byId 中删除 model 的引用
        delete this._byId[model.id];
        delete this._byId[model.cid];
        // 找到当前 model 在 models 中的下标
        index = this.indexOf(model);
        // 通过 splice 方法删除 model
        this.models.splice(index, 1);
        // 修改当前 Collection 的 length
        // splice 方法只会修改 this.models.length 而不会修改 this.length
        this.length--;
        // 如果没有设置 silent 属性，就触发 remove 事件
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        // 删除 model 中当前 collection 的引用，并且解绑所有有关于当前
        // collection 的事件
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      // 把 options 没有设置的参数设置为默认参数
      options = _.defaults(options || {}, setOptions);
      // 是否需要 parse
      if (options.parse) models = this.parse(models, options);
      // 把 models 处理为一个 Array
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      // options.at 的作用是设置添加位置
      var at = options.at;
      // 是否需要排序
      var sortable = this.comparator && (at == null) && options.sort !== false;
      // 排序方式
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      // 处理 add, merge，和为 remove 操作筛选出不需要删除的 models
      for (i = 0, l = models.length; i < l; i++) {
      	// 创建一个 model
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        // 如果之前 model 已经在这个集合中了
        if (existing = this.get(model)) {
          // 如果 options 的 remove 参数为 true，就把 model 的 cid 放到 modelMap 里
          // 表示这些 model 不需要删掉
          if (options.remove) modelMap[existing.cid] = true;
          // 如果 options 的 merge 参数为 true，就把两个 model 合并
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          // 把新 model 添加到 toAdd 中
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          // 为 model 绑上当前 Collection 的事件
          model.on('all', this._onModelEvent, this);
          // 向 _byId 属性中添加当前 Collection 的引用
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      // 处理 remove 模式
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          // 筛选 models，把传进来的 models 留下，把其余的删掉
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        // 把 toAdd 里的 model 添加到 this.models 里
        // 如果设置了 at，则把 at 放置到相应位置
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      // 排序
      if (sort) this.sort({silent: true});

      // 如果设置了 silent 为 true，不再继续往下执行
      if (options.silent) return this;

      // Trigger `add` events.
      // 触发 add 事件
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      // 触发 sort 事件
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      // 先删除所有 model 跟当前 collection 的关联
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      // 保存之前的 models
      options.previousModels = this.models;
      // 从 collection 中删掉所有 model
      this._reset();
      // 调用 add 方法把传进来的 models 添加到 collection 中，
      // 设置默认不触发 add 事件
      this.add(models, _.extend({silent: true}, options));
      // 如果设置了 silent， fire reset 事件
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    // 添加一个 model 到 this.models 中
    push: function(model, options) {
      // 创建一个 model 实例
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    // 删除最后一个 model
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    // 在 models 开头添加一个 model
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    // 删除第一个 model
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    // 返回从 begin 到 end 的 Array
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    // 通过 model 的 id 返回一个 model, 参数可以是一个 model 也可以是 id
    get: function(obj) {
      if (obj == null) return void 0;
      // 从_byId 的 object 中找到 model
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    // 通过传一个下标返回 model，而 get 是通过传一个 model 来找到 models
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    // 找到符合条件的 model..  如果设置了 first，只返回第一个 model，
    // 否则返回所有符合条件的 model
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    // 默认是 true 参数的 where..
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    // 排序
    sort: function(options) {
      // 如果没定义 comparator 抛出一个异常
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      // 调用 sortBy 处理 this.comparator，如果是字符串，就在每个 model 查找
      // 相对应的属性，并以此为依据排序。如果是 function，并且 function 可以接受一个参数，
      // 则调用 function，以 function 的返回值排序
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
      	// 否则调用 Array.prototype.sort 根据 this.comparator 的返回结果进行排序..
        this.models.sort(_.bind(this.comparator, this));
      }

      // 如果设置了 slient 属性，不触发 sort 事件。
      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    // 根据传进的 model 的 value 属性判断 model 应该放到 models 中的哪个位置
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    // 获取每个 model 的 attr 属性性
    pluck: function(attr) {
      // 调用每个 model 的 get 方法，返回一个属性值 array
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      // 创建一个 options 的克隆对象，因为后面要修改 options
      options = options ? _.clone(options) : {};
      // 默认调用 parse 方法
      if (options.parse === void 0) options.parse = true;
      // 保存传进来的 success 方法
      var success = options.success;
      // 保存 this
      var collection = this;
      options.success = function(resp) {
      	// 判断是 set 方法还是 reset 方法，默认用 set
        var method = options.reset ? 'reset' : 'set';
        // 调用 set 或者 reset 设置返回的属性
        collection[method](resp, options);
        // 调用 success 函数
        if (success) success(collection, resp, options);
        // 触发 sync 事件
        collection.trigger('sync', collection, resp, options);
      };
      // 包装 error 事件
      wrapError(this, options);
      // 发请求
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      // 依然克隆一个 options
      options = options ? _.clone(options) : {};
      // 如果 model 不能通过当前 collection 的一系列验证 return false
      if (!(model = this._prepareModel(model, options))) return false;
      // 如果没有设置 wait 属性，发请求之前就把 model 放到 models 里 
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
      	// 如果设置了 wait 属性，发请求之后再 add 到 models 里
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      // 调用 model 的 save 方法发请求
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    // 转换请求返回来的数据格式，默认什么都不做，通常需要在创建 collection 时自定义一个 parse 方法
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    // 返回一个新创建的 collection，新的 collection 跟当前的 collection 有相同的 models 
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    // 设置所有的有关于 model 的数据为空
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      // 判断 attrs 是否是一个 Model 类型的对象
      // 如果是一个 model 对象，设置对象的 collection，并返回 attrs
      if (attrs instanceof Model) {
      	// 向 attrs 添加指向当前 collection 的属性
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      // 创建一个当前 collection model 的实例 
      var model = new this.model(attrs, options);
      // 数据验证，如果验证失败 return false
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    // 删除一个 model 对当前 collection 所有的关联
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    // 向 collection 中添加 model 时会自动调用这个方法，
    // 主要用来监听 model 的事件
    // 比如 remove,add 等等， model 事件处发时，也会触发 'all' 事件，以便
    // collection 做相关的操作
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      // 做完相关操作以后，再触发 collection 的相关事件
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  // 主要在后面把 underscore 的相关方法添加到 collection 实例的 models 属性中
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  // 向 collection 实例的 models 中添加方法
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.'
  // 跟上面差不多，只不过这些方法需要的参数形式不能用上面的方式添加到 models 中，
  // 所以对这几个方法做了特殊处理
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  // View 的构造函数
  var View = Backbone.View = function(options) {
  	// 创建一个唯一标识
    this.cid = _.uniqueId('view');
    // 把 options 放到 'this' 中
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  // delegate 方法中需要这个正则匹配事件
  // 这个正则匹配的是 {X个非空字符} + {Y个空字符} + {Z个非空字符} X > 0  Y >= 0  Z >= 0
  // 并且在匹配结果中同时获取到两个非空字符串
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    // 默认是一个 div 标签
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    // 在当前对象中用 selector 查找元素
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 设置一个空的，防止调用出错
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    // 提供一个接口 ?   没明白做什么用的
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    // 删除当前对象，并解绑所有其它对象对当前 view 的事件
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      // 先解绑之前 el 绑定的事件
      if (this.$el) this.undelegateEvents();
      // 如果 element 是个字符串，就用 $ 取到 element
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      // $el 是一个 jQuery 对象，类似数组，用[0]获取到第一个元素并设置到 el 里
      this.el = this.$el[0];
      // 如果 delegate 不为 false 就绑定事件
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      // 如果没传 events，而且 'this' 没有 'events' 属性，则返回当前 view 的 events 属性
      if (!(events || (events = _.result(this, 'events')))) return this;
      // 先解绑所有事件
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        // 先判断 events[ key ] 是不是一个方法，就从当前 view 的属性中找到 events[ key ] 的值
        if (!_.isFunction(method)) method = this[events[key]];
        // 检查 method
        if (!method) continue;

        // 用正则把 eventName 和 selector 取出来
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        // 给 method 方法绑定运行时的上下文
        method = _.bind(method, this);
        // 处理 eventName
        eventName += '.delegateEvents' + this.cid;
        // 调用 jQuery 的 on 绑定事件..
        if (selector === '') { 
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    // 解除当前 view 的所有事件
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    // 用来处理 options
    _configure: function(options) {
      // 把 options 跟 this.options 合并到一个新创建的对象中..
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      // 把 options 中有关于 viewOptions 的属性拿出来并做为自己的属性存放
      _.extend(this, _.pick(options, viewOptions));
      // 设置 options
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      // 如果 this.el 不在就创建一个 domelement
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        // 调用 jQuery 创建对象并设置属性
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        // 设置元素到 'this' 中
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  // 发请求的模块   默认用 jquery
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    // 设置默认的请求方式（是否支持rest和json..)
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    // 确保请求中带有 URL
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      // 把对应的 object 对象转换成 JSON 字符串
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    // 如果打开了 emulateJSON，就把 contentType 设置为 application/x-www-form-urlencoded..
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    // 如果打开发 emulateHTTP 就把 PUT、DELETE、PATCH 方法用 post 的方式发送过去
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      // 如果设置了 emulateJSON 就把请求的方法设置到 data._method 中
      if (options.emulateJSON) params.data._method = type;
   	  // 先储存 beforeSend
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
      	// 设置 requestHeader
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    // 如果是 get 请求，不处理数据
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    // 如果是 patch 方法，并且是老版本的IE  就用 ActiveXObejct 发请求
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    // 触发 request 事件
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  // 根据设置的方法决定发请求的方式
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  // 调用$的 ajax 模块
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  // Router 用于控制 url
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    // 如果 options 中传了 routes，就把 routes 放到 'this' 中
    if (options.routes) this.routes = options.routes;
    // 
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  // 匹配 (XXXX) 并获取 XXXX
  var optionalParam = /\((.*?)\)/g;
  // 匹配 (?:XXXX 也可以匹配 :XXXX
  var namedParam    = /(\(\?)?:\w+/g;
  // 匹配 n个\ m个\w(字母、数字、下划线)  类似 \\\\XXXX
  var splatParam    = /\*\w+/g;
  // 匹配 '-{}[]+?.,\^$|# ' 中的字符
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 默认的 initialize，防止不传 options 的情况下报错
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  // 为 router 模拟浏览器的 history 
  var History = Backbone.History = function() {
    this.handlers = [];
    // 把 checkUrl 绑给 this
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    // 保证 History 对象能在浏览器外使用
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  // 匹配 '#XX' '/XX' 'XX  '
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  // 匹配 '/////////XXXX' 或者 'XXXXX////////'
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  // 用于判断是不是IE..
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  // 匹配 以 '/' 结尾的字符串
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  // 用于判断是否已经调用过 start 方法
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    // 定义 setInterval 的循环时间
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    // 取到当前的 hash，据注释说，不用 location.hash 的原因是如果用这个方法取到
    // hash，firefox 会把 location.hash 的值解码..
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
      	// 如果要使用 pushState
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          // pathname..
          fragment = this.location.pathname;
          // 把 root 结尾的 '/' 去掉
          var root = this.root.replace(trailingSlash, '');
          // 如果在 fragment 的字符串开头找到了 root，就把 root从 fragment 去掉
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          // 如果不使用 pushState 则直接取到当前 hash
          fragment = this.getHash();
        }
      }

      // 去掉 fragment 开头的 '#' '/' 和 结尾的连续空格
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      // 如果已经调用过 start 方法，抛出一个异常
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      // 设置默认的 root 为 '/'，如果 options 带了 root 值，则用 options 的 root
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      // 是否触发 hashChange 事件
      this._wantsHashChange = this.options.hashChange !== false;
      // 是否使用 HTML5 的 pushState
      this._wantsPushState  = !!this.options.pushState;
      // 判断浏览器是否支持 pushState
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      // IE的文档模式
      var docMode           = document.documentMode;
      // 判断是否是 IE7 及以前的版本
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      // 把 root 处理为 '/XXXX/'的格式
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // 如果需要使用历史记录并且是老版本的IE，用 iframe 方法，记录历史
      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);
