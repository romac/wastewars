;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){

var Crafty = require('./lib/crafty'),
    Stats  = require('./stats');

require('./loading');
require('./actor');
require('./ship');
require('./planet');

var Game = module.exports = {

  start: function() {
    Crafty.init(Crafty.DOM.window.width, Crafty.DOM.window.height);
    Crafty.canvas.init();
    Crafty.background('black');
    Crafty.scene('Loading');
    Stats.FPS(document.querySelector('#fps'));
  }

};

Crafty.scene( 'Game', function() {
  this.player = Crafty.e('Ship');
  this.player.x = -500;
  this.player.y = -300;
  this.planet = Crafty.e('Planet');

  Crafty.viewport.centerOn(this.planet, 1); 
} );

window.addEventListener('load', Game.start);

},{"./lib/crafty":2,"./stats":3,"./loading":4,"./actor":5,"./ship":6,"./planet":7}],2:[function(require,module,exports){
(function(){/*!
* Crafty v0.5.3
* http://craftyjs.com
*
* Copyright 2010, Louis Stowasser
* Dual licensed under the MIT or GPL licenses.
*/

(function (window, initComponents, undefined) {

    /**@
    * #Crafty
    * @category Core
    * Select a set of or single entities by components or an entity's ID.
    *
    * Crafty uses syntax similar to jQuery by having a selector engine to select entities by their components.
    *
    * @example
    * ~~~
    *    Crafty("MyComponent")
    *    Crafty("Hello 2D Component")
    *    Crafty("Hello, 2D, Component")
    * ~~~
    * 
    * The first selector will return all entities that have the component `MyComponent`. The second will return all entities that have `Hello` and `2D` and `Component` whereas the last will return all entities that have at least one of those components (or).
    *
    * ~~~
    *   Crafty("*")
    * ~~~
    * Passing `*` will select all entities.
    *
    * ~~~
    *   Crafty(1)
    * ~~~
    * Passing an integer will select the entity with that `ID`.
    *
    * Finding out the `ID` of an entity can be done by returning the property `0`.
    * ~~~
    *    var ent = Crafty.e("2D");
    *    ent[0]; //ID
    * ~~~
    */
    var Crafty = function (selector) {
        return new Crafty.fn.init(selector);
    },

    GUID, FPS, frame, components, entities, handlers, onloads, tick, requestID,
	noSetter, loops, milliSecPerFrame, nextGameTick, slice, rlist, rspace,

	initState = function () {
    	GUID = 1; //GUID for entity IDs
    	FPS = 50;
    	frame = 1;

    	components = {}; //map of components and their functions
    	entities = {}; //map of entities and their data
        entityFactories = {}; //templates of entities
    	handlers = {}; //global event handlers
    	onloads = []; //temporary storage of onload handlers
    	tick;

    	/*
		* `window.requestAnimationFrame` or its variants is called for animation.
		* `.requestID` keeps a record of the return value previous `window.requestAnimationFrame` call.
		* This is an internal variable. Used to stop frame.
		*/
    	requestID;

    	noSetter;

    	loops = 0;
    	milliSecPerFrame = 1000 / FPS;
    	nextGameTick = (new Date).getTime();

    	slice = Array.prototype.slice;
    	rlist = /\s*,\s*/;
    	rspace = /\s+/;
    };

    initState();

    /**@
    * #Crafty Core
    * @category Core
    * @trigger NewEntityName - After setting new name for entity - String - entity name
    * @trigger NewComponent - when a new component is added to the entity - String - Component
    * @trigger RemoveComponent - when a component is removed from the entity - String - Component
    * @trigger Remove - when the entity is removed by calling .destroy()
    * 
    * Set of methods added to every single entity.
    */
    Crafty.fn = Crafty.prototype = {

        init: function (selector) {
            //select entities by component
            if (typeof selector === "string") {
                var elem = 0, //index elements
                e, //entity forEach
                current,
                and = false, //flags for multiple
                or = false,
                del,
                comps,
                score,
                i, l;

                if (selector === '*') {
                    for (e in entities) {
                        this[+e] = entities[e];
                        elem++;
                    }
                    this.length = elem;
                    return this;
                }

                //multiple components OR
                if (selector.indexOf(',') !== -1) {
                    or = true;
                    del = rlist;
                    //deal with multiple components AND
                } else if (selector.indexOf(' ') !== -1) {
                    and = true;
                    del = rspace;
                }

                //loop over entities
                for (e in entities) {
                    if (!entities.hasOwnProperty(e)) continue; //skip
                    current = entities[e];

                    if (and || or) { //multiple components
                        comps = selector.split(del);
                        i = 0;
                        l = comps.length;
                        score = 0;

                        for (; i < l; i++) //loop over components
                            if (current.__c[comps[i]]) score++; //if component exists add to score

                        //if anded comps and has all OR ored comps and at least 1
                        if (and && score === l || or && score > 0) this[elem++] = +e;

                    } else if (current.__c[selector]) this[elem++] = +e; //convert to int
                }

                //extend all common components
                if (elem > 0 && !and && !or) this.extend(components[selector]);
                if (comps && and) for (i = 0; i < l; i++) this.extend(components[comps[i]]);

                this.length = elem; //length is the last index (already incremented)
				
				// if there's only one entity, return the actual entity
				if (elem === 1) {
					return entities[this[elem-1]];
				}

            } else { //Select a specific entity

                if (!selector) { //nothin passed creates God entity
                    selector = 0;
                    if (!(selector in entities)) entities[selector] = this;
                }

                //if not exists, return undefined
                if (!(selector in entities)) {
                    this.length = 0;
                    return this;
                }

                this[0] = selector;
                this.length = 1;

                //update from the cache
                if (!this.__c) this.__c = {};

                //update to the cache if NULL
                if (!entities[selector]) entities[selector] = this;
                return entities[selector]; //return the cached selector
            }

            return this;
        },

        /**@
        * #.setName
        * @comp Crafty Core
        * @sign public this .setName(String name)
        * @param name - A human readable name for debugging purposes.
        *
        * @example
        * ~~~
        * this.setName("Player");
        * ~~~
        */
        setName: function (name) {
            var entityName = String(name);

            this._entityName = entityName;

            this.trigger("NewEntityName", entityName);
            return this;
        },

        /**@
        * #.addComponent
        * @comp Crafty Core
        * @sign public this .addComponent(String componentList)
        * @param componentList - A string of components to add separated by a comma `,`
        * @sign public this .addComponent(String Component1[, .., String ComponentN])
        * @param Component# - Component ID to add.
        * Adds a component to the selected entities or entity.
        *
        * Components are used to extend the functionality of entities.
        * This means it will copy properties and assign methods to
        * augment the functionality of the entity.
        *
        * There are multiple methods of adding components. Passing a
        * string with a list of component names or passing multiple
        * arguments with the component names.
        *
        * If the component has a function named `init` it will be called.
        *
        * @example
        * ~~~
        * this.addComponent("2D, Canvas");
        * this.addComponent("2D", "Canvas");
        * ~~~
        */
        addComponent: function (id) {
            var uninit = [], c = 0, ul, //array of components to init
            i = 0, l, comps;

            //add multiple arguments
            if (arguments.length > 1) {
                l = arguments.length;
                for (; i < l; i++) {
                    this.__c[arguments[i]] = true;
                    uninit.push(arguments[i]);
                }
                //split components if contains comma
            } else if (id.indexOf(',') !== -1) {
                comps = id.split(rlist);
                l = comps.length;
                for (; i < l; i++) {
                    this.__c[comps[i]] = true;
                    uninit.push(comps[i]);
                }
                //single component passed
            } else {
                this.__c[id] = true;
                uninit.push(id);
            }

            //extend the components
            ul = uninit.length;
            for (; c < ul; c++) {
                comp = components[uninit[c]];
                this.extend(comp);

                //if constructor, call it
                if (comp && "init" in comp) {
                    comp.init.call(this);
                }
            }

            this.trigger("NewComponent", ul);
            return this;
        },

        /**@
        * #.toggleComponent
        * @comp Crafty Core
        * @sign public this .toggleComponent(String ComponentList)
        * @param ComponentList - A string of components to add or remove separated by a comma `,`
        * @sign public this .toggleComponent(String Component1[, .., String componentN])
        * @param Component# - Component ID to add or remove.
        * Add or Remove Components from an entity.
        * 
        * @example
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.toggleComponent("Test,Test2"); //Remove Test, add Test2
        * e.toggleComponent("Test,Test2"); //Add Test, remove Test2
        * ~~~
        *
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.toggleComponent("Test","Test2"); //Remove Test, add Test2
        * e.toggleComponent("Test","Test2"); //Add Test, remove Test2
        * e.toggleComponent("Test");         //Remove Test
        * ~~~
        */
       toggleComponent:function(toggle){
            var i = 0, l, comps;
            if (arguments.length > 1) {
                l = arguments.length;
                        
                for (; i < l; i++) {
                    if(this.has(arguments[i])){ 
                        this.removeComponent(arguments[i]);
                    }else{
                        this.addComponent(arguments[i]);
                    }
                }
            //split components if contains comma
            } else if (toggle.indexOf(',') !== -1) {
                comps = toggle.split(rlist);
                l = comps.length;
                for (; i < l; i++) {
                    if(this.has(comps[i])){ 
                        this.removeComponent(comps[i]);
                    }else{
                        this.addComponent(comps[i]);
                    }
                }
                
            //single component passed
            } else {
                if(this.has(toggle)){ 
                    this.removeComponent(toggle);
                }else{
                    this.addComponent(toggle);
                }
            }

            return this;
        },

        /**@
        * #.requires
        * @comp Crafty Core
        * @sign public this .requires(String componentList)
        * @param componentList - List of components that must be added
        * 
        * Makes sure the entity has the components listed. If the entity does not
        * have the component, it will add it.
        * 
        * @see .addComponent
        */
        requires: function (list) {
            var comps = list.split(rlist),
            i = 0, l = comps.length,
            comp;

            //loop over the list of components and add if needed
            for (; i < l; ++i) {
                comp = comps[i];
                if (!this.has(comp)) this.addComponent(comp);
            }

            return this;
        },

        /**@
        * #.removeComponent
        * @comp Crafty Core
        * @sign public this .removeComponent(String Component[, soft])
        * @param component - Component to remove
        * @param soft - Whether to soft remove it (defaults to `true`)
        *
        * Removes a component from an entity. A soft remove (the default) will only
        * refrain `.has()` from returning true. Hard will remove all
        * associated properties and methods.
        *
        * @example
        * ~~~
        * var e = Crafty.e("2D,DOM,Test");
        * e.removeComponent("Test");        //Soft remove Test component
        * e.removeComponent("Test", false); //Hard remove Test component
        * ~~~
        */
        removeComponent: function (id, soft) {
            if (soft === false) {
                var props = components[id], prop;
                for (prop in props) {
                    delete this[prop];
                }
            }
            delete this.__c[id];

            this.trigger("RemoveComponent", id);
            return this;
        },

        /**@
        * #.has
        * @comp Crafty Core
        * @sign public Boolean .has(String component)
        * Returns `true` or `false` depending on if the
        * entity has the given component.
        *
        * For better performance, simply use the `.__c` object
        * which will be `true` if the entity has the component or
        * will not exist (or be `false`).
        */
        has: function (id) {
            return !!this.__c[id];
        },

        /**@
        * #.attr
        * @comp Crafty Core
        * @sign public this .attr(String property, * value)
        * @param property - Property of the entity to modify
        * @param value - Value to set the property to
        * @sign public this .attr(Object map)
        * @param map - Object where the key is the property to modify and the value as the property value
        * @trigger Change - when properties change - {key: value}
        * 
        * Use this method to set any property of the entity.
        * 
        * @example
        * ~~~
        * this.attr({key: "value", prop: 5});
        * this.key; //value
        * this.prop; //5
        *
        * this.attr("key", "newvalue");
        * this.key; //newvalue
        * ~~~
        */
        attr: function (key, value) {
            if (arguments.length === 1) {
                //if just the key, return the value
                if (typeof key === "string") {
                    return this[key];
                }

                //extend if object
                this.extend(key);
                this.trigger("Change", key); //trigger change event
                return this;
            }
            //if key value pair
            this[key] = value;

            var change = {};
            change[key] = value;
            this.trigger("Change", change); //trigger change event
            return this;
        },

        /**@
        * #.toArray
        * @comp Crafty Core
        * @sign public this .toArray(void)
        * 
        * This method will simply return the found entities as an array.
        */
        toArray: function () {
            return slice.call(this, 0);
        },

        /**@
        * #.timeout
        * @comp Crafty Core
        * @sign public this .timeout(Function callback, Number delay)
        * @param callback - Method to execute after given amount of milliseconds
        * @param delay - Amount of milliseconds to execute the method
        * 
        * The delay method will execute a function after a given amount of time in milliseconds.
        *
        * Essentially a wrapper for `setTimeout`.
        *
        * @example
        * Destroy itself after 100 milliseconds
        * ~~~
        * this.timeout(function() {
             this.destroy();
        * }, 100);
        * ~~~
        */
        timeout: function (callback, duration) {
            this.each(function () {
                var self = this;
                setTimeout(function () {
                    callback.call(self);
                }, duration);
            });
            return this;
        },

        /**@
        * #.bind
        * @comp Crafty Core
        * @sign public this .bind(String eventName, Function callback)
        * @param eventName - Name of the event to bind to
        * @param callback - Method to execute when the event is triggered
        * Attach the current entity (or entities) to listen for an event.
        *
        * Callback will be invoked when an event with the event name passed
        * is triggered. Depending on the event, some data may be passed
        * via an argument to the callback function.
        *
        * The first argument is the event name (can be anything) whilst the
        * second argument is the callback. If the event has data, the
        * callback should have an argument.
        *
        * Events are arbitrary and provide communication between components.
        * You can trigger or bind an event even if it doesn't exist yet.
        * 
        * @example
        * ~~~
        * this.attr("triggers", 0); //set a trigger count
        * this.bind("myevent", function() {
        *     this.triggers++; //whenever myevent is triggered, increment
        * });
        * this.bind("EnterFrame", function() {
        *     this.trigger("myevent"); //trigger myevent on every frame
        * });
        * ~~~
        * 
        * @see .trigger, .unbind
        */
        bind: function (event, callback) {
            //optimization for 1 entity
            if (this.length === 1) {
                if (!handlers[event]) handlers[event] = {};
                var h = handlers[event];

                if (!h[this[0]]) h[this[0]] = []; //init handler array for entity
                h[this[0]].push(callback); //add current callback
                return this;
            }

            this.each(function () {
                //init event collection
                if (!handlers[event]) handlers[event] = {};
                var h = handlers[event];

                if (!h[this[0]]) h[this[0]] = []; //init handler array for entity
                h[this[0]].push(callback); //add current callback
            });
            return this;
        },

        /**@
        * #.unbind
        * @comp Crafty Core
        * @sign public this .unbind(String eventName[, Function callback])
        * @param eventName - Name of the event to unbind
        * @param callback - Function to unbind
        * Removes binding with an event from current entity.
        *
        * Passing an event name will remove all events bound to
        * that event. Passing a reference to the callback will
        * unbind only that callback.
        * @see .bind, .trigger
        */
        unbind: function (event, callback) {
            this.each(function () {
                var hdl = handlers[event], i = 0, l, current;
                //if no events, cancel
                if (hdl && hdl[this[0]]) l = hdl[this[0]].length;
                else return this;

                //if no function, delete all
                if (!callback) {
                    delete hdl[this[0]];
                    return this;
                }
                //look for a match if the function is passed
                for (; i < l; i++) {
                    current = hdl[this[0]];
                    if (current[i] == callback) {
                        current.splice(i, 1);
                        i--;
                    }
                }
            });

            return this;
        },

        /**@
        * #.trigger
        * @comp Crafty Core
        * @sign public this .trigger(String eventName[, Object data])
        * @param eventName - Event to trigger
        * @param data - Arbitrary data that will be passed into every callback as an argument
        * Trigger an event with arbitrary data. Will invoke all callbacks with
        * the context (value of `this`) of the current entity object.
        *
        * *Note: This will only execute callbacks within the current entity, no other entity.*
        *
        * The first argument is the event name to trigger and the optional
        * second argument is the arbitrary event data. This can be absolutely anything.
        */
        trigger: function (event, data) {
            if (this.length === 1) {
                //find the handlers assigned to the event and entity
                if (handlers[event] && handlers[event][this[0]]) {
                    var callbacks = handlers[event][this[0]], i = 0, l = callbacks.length;
                    for (; i < l; i++) {
                        callbacks[i].call(this, data);
                    }
                }
                return this;
            }

            this.each(function () {
                //find the handlers assigned to the event and entity
                if (handlers[event] && handlers[event][this[0]]) {
                    var callbacks = handlers[event][this[0]], i = 0, l = callbacks.length;
                    for (; i < l; i++) {
                        callbacks[i].call(this, data);
                    }
                }
            });
            return this;
        },

        /**@
        * #.each
        * @sign public this .each(Function method)
        * @param method - Method to call on each iteration
        * Iterates over found entities, calling a function for every entity.
        *
        * The function will be called for every entity and will pass the index
        * in the iteration as an argument. The context (value of `this`) of the
        * function will be the current entity in the iteration.
        * 
        * @example
        * Destroy every second 2D entity
        * ~~~
        * Crafty("2D").each(function(i) {
        *     if(i % 2 === 0) {
        *         this.destroy();
        *     }
        * });
        * ~~~
        */
        each: function (func) {
            var i = 0, l = this.length;
            for (; i < l; i++) {
                //skip if not exists
                if (!entities[this[i]]) continue;
                func.call(entities[this[i]], i);
            }
            return this;
        },

        /**@
        * #.clone
        * @comp Crafty Core
        * @sign public Entity .clone(void)
        * @returns Cloned entity of the current entity
        * 
        * Method will create another entity with the exact same
        * properties, components and methods as the current entity.
        */
        clone: function () {
            var comps = this.__c,
            comp,
            prop,
            clone = Crafty.e();

            for (comp in comps) {
                clone.addComponent(comp);
            }
            for (prop in this) {
                if (prop != "0" && prop != "_global" && prop != "_changed" && typeof this[prop] != "function" && typeof this[prop] != "object") {
                    clone[prop] = this[prop];
                }
            }

            return clone;
        },

        /**@
        * #.setter
        * @comp Crafty Core
        * @sign public this .setter(String property, Function callback)
        * @param property - Property to watch for modification
        * @param callback - Method to execute if the property is modified
        * Will watch a property waiting for modification and will then invoke the
        * given callback when attempting to modify.
        *
        * *Note: Support in IE<9 is slightly different. The method will be executed
        * after the property has been set*
        */
        setter: function (prop, callback) {
            if (Crafty.support.setter) {
                this.__defineSetter__(prop, callback);
            } else if (Crafty.support.defineProperty) {
                Object.defineProperty(this, prop, {
                    set: callback,
                    configurable: true
                });
            } else {
                noSetter.push({
                    prop: prop,
                    obj: this,
                    fn: callback
                });
            }
            return this;
        },

        /**@
        * #.destroy
        * @comp Crafty Core
        * @sign public this .destroy(void)
        * Will remove all event listeners and delete all properties as well as removing from the stage
        */
        destroy: function () {
            //remove all event handlers, delete from entities
            this.each(function () {
                this.trigger("Remove");
                for (var e in handlers) {
                    this.unbind(e);
                }
                delete entities[this[0]];
            });
        }
    };

    //give the init instances the Crafty prototype
    Crafty.fn.init.prototype = Crafty.fn;

    /**
    * Extension method to extend the namespace and
    * selector instances
    */
    Crafty.extend = Crafty.fn.extend = function (obj) {
        var target = this, key;

        //don't bother with nulls
        if (!obj) return target;

        for (key in obj) {
            if (target === obj[key]) continue; //handle circular reference
            target[key] = obj[key];
        }

        return target;
    };

    /**@
    * #Crafty.extend
    * @category Core
    * Used to extend the Crafty namespace.
    */
    Crafty.extend({
        /**@
        * #Crafty.init
        * @category Core
        * @trigger EnterFrame - on each frame - { frame: Number }
        * @trigger Load - Just after the viewport is initialised. Before the EnterFrame loops is started
        * @sign public this Crafty.init([Number width, Number height])
        * @param width - Width of the stage
        * @param height - Height of the stage
        * 
        * Create a div with id `cr-stage`, if there is not already an HTMLElement with id `cr-stage` (by `Crafty.viewport.init`).
        *
        * Starts the `EnterFrame` interval. This will call the `EnterFrame` event for every frame.
        *
        * Can pass width and height values for the stage otherwise will default to window size (see `Crafty.DOM.window`).
        *
        * All `Load` events will be executed.
        *
        * Uses `requestAnimationFrame` to sync the drawing with the browser but will default to `setInterval` if the browser does not support it.
        * @see Crafty.stop,  Crafty.viewport
        */
        init: function (w, h) {
            Crafty.viewport.init(w, h);

            //call all arbitrary functions attached to onload
            this.trigger("Load");
            this.timer.init();

            return this;
        },

        /**@
        * #.getVersion
        * @comp Crafty Core
        * @sign public this .getVersion()
        * @returns Actually crafty version
        *
        * @example
        * ~~~
        * Crafty.getVersion(); //'0.5.2'
        * ~~~
        */
        getVersion: function () {
            return '0.5.3';
        },

        /**@
        * #Crafty.stop
        * @category Core
        * @trigger CraftyStop - when the game is stopped
        * @sign public this Crafty.stop([bool clearState])
		* @param clearState - if true the stage and all game state is cleared.
        *
        * Stops the EnterFrame interval and removes the stage element.
        *
        * To restart, use `Crafty.init()`.
        * @see Crafty.init
        */
        stop: function (clearState) {
        	this.timer.stop();
        	if (clearState) {
        		if (Crafty.stage && Crafty.stage.elem.parentNode) {
        			var newCrStage = document.createElement('div');
        			newCrStage.id = "cr-stage";
        			Crafty.stage.elem.parentNode.replaceChild(newCrStage, Crafty.stage.elem);
        		}
        		initState();
        		initComponents(Crafty, window, window.document);
        	}

            Crafty.trigger("CraftyStop");

        	return this;
        },

        /**@
        * #Crafty.pause
        * @category Core
        * @trigger Pause - when the game is paused
        * @trigger Unpause - when the game is unpaused
        * @sign public this Crafty.pause(void)
        * 
        * Pauses the game by stopping the EnterFrame event from firing. If the game is already paused it is unpaused.
        * You can pass a boolean parameter if you want to pause or unpause mo matter what the current state is.
        * Modern browsers pauses the game when the page is not visible to the user. If you want the Pause event
        * to be triggered when that happens you can enable autoPause in `Crafty.settings`.
        * 
        * @example
        * Have an entity pause the game when it is clicked.
        * ~~~
        * button.bind("click", function() {
        *     Crafty.pause();
        * });
        * ~~~
        */
        pause: function (toggle) {
            if (arguments.length == 1 ? toggle : !this._paused) {
                this.trigger('Pause');
                this._paused = true;
                setTimeout(function(){ Crafty.timer.stop(); }, 0);
                Crafty.keydown = {};
            } else {
                this.trigger('Unpause');
                this._paused = false;
                setTimeout(function(){ Crafty.timer.init(); }, 0);
            }
            return this;
        },

        /**@
         * #Crafty.isPaused
         * @category Core
         * @sign public this Crafty.isPaused()
         * 
         * Check whether the game is already paused or not.
         * 
         * @example
         * ~~~
         * Crafty.isPaused();
         * ~~~
         */
        isPaused: function () {
            return this._paused;
        },

        /**@
        * #Crafty.timer
        * @category Internal
        * Handles game ticks
        */
        timer: {
            prev: (+new Date),
            current: (+new Date),
            currentTime: +new Date(),
            frames:0,
            frameTime:0,
            init: function () {
                var onFrame = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    null;

                if (onFrame) {
                    tick = function () {
                        Crafty.timer.step();
                        requestID = onFrame(tick);
                        //console.log(requestID + ', ' + frame)
                    }

                    tick();
                } else {
                    tick = setInterval(function () { Crafty.timer.step(); }, 1000 / FPS);
                }
            },

            stop: function () {
                Crafty.trigger("CraftyStopTimer");

                if (typeof tick === "number") clearInterval(tick);

                var onFrame = window.cancelRequestAnimationFrame ||
                    window.webkitCancelRequestAnimationFrame ||
                    window.mozCancelRequestAnimationFrame ||
                    window.oCancelRequestAnimationFrame ||
                    window.msCancelRequestAnimationFrame ||
                    null;

                if (onFrame) onFrame(requestID);
                tick = null;
            },

            /**@
            * #Crafty.timer.step
            * @comp Crafty.timer
            * @sign public void Crafty.timer.step()
            * Advances the game by triggering `EnterFrame` and calls `Crafty.DrawManager.draw` to update the stage.
            */
            step: function () {
                loops = 0;
                this.currentTime = +new Date();
                if (this.currentTime - nextGameTick > 60 * milliSecPerFrame) {
                    nextGameTick = this.currentTime - milliSecPerFrame;
                }
                while (this.currentTime > nextGameTick) {
                    Crafty.trigger("EnterFrame", { frame: frame++ });
                    nextGameTick += milliSecPerFrame;
                    loops++;
                }
                if (loops) {
                    Crafty.DrawManager.draw();
                }
               if(this.currentTime > this.frameTime){
                    Crafty.trigger("MessureFPS",{value:this.frame});
                    this.frame = 0;
                    this.frameTime = this.currentTime + 1000;
                }else{
                    this.frame++;
                }
            
            },
            /**@
            * #Crafty.timer.getFPS
            * @comp Crafty.timer
            * @sign public void Crafty.timer.getFPS()
            * Returns the target frames per second. This is not an actual frame rate.
            */
            getFPS: function () {
                return FPS;
            },

            /**@
            * #Crafty.timer.simulateFrames
            * @comp Crafty.timer
            * Advances the game state by a number of frames and draws the resulting stage at the end. Useful for tests and debugging.
            * @sign public this Crafty.timer.simulateFrames(Number frames)
            * @param frames - number of frames to simulate
            */
            simulateFrames: function (frames) {
                while (frames-- > 0) {
                    Crafty.trigger("EnterFrame", { frame: frame++ });
                }
                Crafty.DrawManager.draw();
            }

        },

        /**@
        * #Crafty.addEntityFactory
        * @category Core
        * @param name - Name of the entity factory.
        * @param callback - Function containing the entity creation procedure.
        * 
        * Registers an Entity Factory.  An Entity Factory allows for the repeatable creation of an Entity.
        *
        * @example
        * ~~~
        * Crafty.addEntityFactory('Projectile', function() {
        *   var entity = Crafty.e('2D, Canvas, Color, Physics, Collision')
        *   .color("red")
        *   .attr({
        *     w: 3,
        *     h: 3,
        *     x: this.x,
        *     y: this.y
        *   })
        *   .addComponent('Gravity').gravity("Floor");
        *   
        *   return entity;
        * });
        * ~~~
        * 
        * @see Crafty.e
        */
        addEntityFactory: function(name, callback) {
            this.entityFactories[name] = callback;
        },

        /**@
        * #Crafty.newFactoryEntity
        * @category Core
        * @param name - Name of the entity factory.
        * 
        * Creates a new entity based on a specific Entity Factory.
        *
        * @example
        * ~~~
        * Crafty.addEntityFactory('Projectile', function() {
        *   var entity = Crafty.e('2D, Canvas, Color, Physics, Collision')
        *   .color("red")
        *   .attr({
        *     w: 3,
        *     h: 3,
        *     x: this.x,
        *     y: this.y
        *   })
        *   .addComponent('Gravity').gravity("Floor");
        *   
        *   return entity;
        * });
        *
        * Crafty.newFactoryEntity('Projectile'); // This returns a new Projectile Entity.
        * ~~~
        * 
        * @see Crafty.e
        */
        newFactoryEntity: function(name) {
            return this.entityTemplates[name]();
        },

        /**@
        * #Crafty.e
        * @category Core
        * @trigger NewEntity - When the entity is created and all components are added - { id:Number }
        * @sign public Entity Crafty.e(String componentList)
        * @param componentList - List of components to assign to new entity
        * @sign public Entity Crafty.e(String component1[, .., String componentN])
        * @param component# - Component to add
        * 
        * Creates an entity. Any arguments will be applied in the same
        * way `.addComponent()` is applied as a quick way to add components.
        *
        * Any component added will augment the functionality of
        * the created entity by assigning the properties and methods from the component to the entity.
        * 
        * @example
        * ~~~
        * var myEntity = Crafty.e("2D, DOM, Color");
        * ~~~
        * 
        * @see Crafty.c
        */
        e: function () {
            var id = UID(), craft;

            entities[id] = null; //register the space
            entities[id] = craft = Crafty(id);

            if (arguments.length > 0) {
                craft.addComponent.apply(craft, arguments);
            }
            craft.setName('Entity #'+id); //set default entity human readable name
            craft.addComponent("obj"); //every entity automatically assumes obj

            Crafty.trigger("NewEntity", { id: id });

            return craft;
        },

        /**@
        * #Crafty.c
        * @category Core
        * @sign public void Crafty.c(String name, Object component)
        * @param name - Name of the component
        * @param component - Object with the components properties and methods
        * Creates a component where the first argument is the ID and the second
        * is the object that will be inherited by entities.
        *
        * There is a convention for writing components. 
        *
        * - Properties or methods that start with an underscore are considered private.
        * - A method called `init` will automatically be called as soon as the
        * component is added to an entity.
        * - A method with the same name as the component is considered to be a constructor
        * and is generally used when you need to pass configuration data to the component on a per entity basis.
        *
        * @example
        * ~~~
        * Crafty.c("Annoying", {
        *     _message: "HiHi",
        *     init: function() {
        *         this.bind("EnterFrame", function() { alert(this.message); });
        *     },
        *     annoying: function(message) { this.message = message; }
        * });
        *
        * Crafty.e("Annoying").annoying("I'm an orange...");
        * ~~~
        *
        * 
        * WARNING: 
        *
        * in the example above the field _message is local to the entity. That is, if you create many entities with the Annoying component they can all have different values for _message. That is because it is a simple value, and simple values are copied by value. If however the field had been an object or array, the value would have been shared by all entities with the component because complex types are copied by reference in javascript. This is probably not what you want and the following example demonstrates how to work around it:
        *
        * ~~~
        * Crafty.c("MyComponent", {
        *     _iAmShared: { a: 3, b: 4 },
        *     init: function() {
        *         this._iAmNotShared = { a: 3, b: 4 };
        *     },
        * });
        * ~~~
        *
        * @see Crafty.e
        */
        c: function (compName, component) {
            components[compName] = component;
        },

        /**@
        * #Crafty.trigger
        * @category Core, Events
        * @sign public void Crafty.trigger(String eventName, * data)
        * @param eventName - Name of the event to trigger
        * @param data - Arbitrary data to pass into the callback as an argument
        * 
        * This method will trigger every single callback attached to the event name. This means
        * every global event and every entity that has a callback.
        * 
        * @see Crafty.bind
        */
        trigger: function (event, data) {
            var hdl = handlers[event], h, i, l;
            //loop over every object bound
            for (h in hdl) {
                if (!hdl.hasOwnProperty(h)) continue;

                //loop over every handler within object
                for (i = 0, l = hdl[h].length; i < l; i++) {
                    if (hdl[h] && hdl[h][i]) {
                        //if an entity, call with that context
                        if (entities[h]) {
                            hdl[h][i].call(Crafty(+h), data);
                        } else { //else call with Crafty context
                            hdl[h][i].call(Crafty, data);
                        }
                    }
                }
            }
        },

        /**@
        * #Crafty.bind
        * @category Core, Events
        * @sign public Number bind(String eventName, Function callback)
        * @param eventName - Name of the event to bind to
        * @param callback - Method to execute upon event triggered
        * @returns ID of the current callback used to unbind
        * 
        * Binds to a global event. Method will be executed when `Crafty.trigger` is used
        * with the event name.
        * 
        * @see Crafty.trigger, Crafty.unbind
        */
        bind: function (event, callback) {
            if (!handlers[event]) handlers[event] = {};
            var hdl = handlers[event];

            if (!hdl.global) hdl.global = [];
            return hdl.global.push(callback) - 1;
        },

        /**@
        * #Crafty.unbind
        * @category Core, Events
        * @sign public Boolean Crafty.unbind(String eventName, Function callback)
        * @param eventName - Name of the event to unbind
        * @param callback - Function to unbind
        * @sign public Boolean Crafty.unbind(String eventName, Number callbackID)
        * @param callbackID - ID of the callback
        * @returns True or false depending on if a callback was unbound
        * Unbind any event from any entity or global event.
        */
        unbind: function (event, callback) {
            var hdl = handlers[event], h, i, l;

            //loop over every object bound
            for (h in hdl) {
                if (!hdl.hasOwnProperty(h)) continue;

                //if passed the ID
                if (typeof callback === "number") {
                    delete hdl[h][callback];
                    return true;
                }

                //loop over every handler within object
                for (i = 0, l = hdl[h].length; i < l; i++) {
                    if (hdl[h][i] === callback) {
                        delete hdl[h][i];
                        return true;
                    }
                }
            }

            return false;
        },

        /**@
        * #Crafty.frame
        * @category Core
        * @sign public Number Crafty.frame(void)
        * Returns the current frame number
        */
        frame: function () {
            return frame;
        },

        components: function () {
            return components;
        },

        isComp: function (comp) {
            return comp in components;
        },

        debug: function () {
            return entities;
        },

        /**@
        * #Crafty.settings
        * @category Core
        * Modify the inner workings of Crafty through the settings.
        */
        settings: (function () {
            var states = {},
            callbacks = {};

            return {
            /**@
            * #Crafty.settings.register
            * @comp Crafty.settings
            * @sign public void Crafty.settings.register(String settingName, Function callback)
            * @param settingName - Name of the setting
            * @param callback - Function to execute when use modifies setting
            * 
            * Use this to register custom settings. Callback will be executed when `Crafty.settings.modify` is used.
            * 
            * @see Crafty.settings.modify
            */
                register: function (setting, callback) {
                    callbacks[setting] = callback;
                },

            /**@
            * #Crafty.settings.modify
            * @comp Crafty.settings
            * @sign public void Crafty.settings.modify(String settingName, * value)
            * @param settingName - Name of the setting
            * @param value - Value to set the setting to
            * 
            * Modify settings through this method.
            * 
            * @see Crafty.settings.register, Crafty.settings.get
            */
                modify: function (setting, value) {
                    if (!callbacks[setting]) return;
                    callbacks[setting].call(states[setting], value);
                    states[setting] = value;
                },

            /**@
            * #Crafty.settings.get
            * @comp Crafty.settings
            * @sign public * Crafty.settings.get(String settingName)
            * @param settingName - Name of the setting
            * @returns Current value of the setting
            * 
            * Returns the current value of the setting.
            * 
            * @see Crafty.settings.register, Crafty.settings.get
            */
                get: function (setting) {
                    return states[setting];
                }
            };
        })(),

        clone: clone
    });

    /**
    * Return a unique ID
    */
    function UID() {
        var id = GUID++;
        //if GUID is not unique
        if (id in entities) {
            return UID(); //recurse until it is unique
        }
        return id;
    }

    /**@
    * #Crafty.clone
    * @category Core
    * @sign public Object .clone(Object obj)
    * @param obj - an object
    * 
    * Deep copy (a.k.a clone) of an object.
    */
    function clone(obj) {
        if (obj === null || typeof(obj) != 'object')
            return obj;

        var temp = obj.constructor(); // changed

        for (var key in obj)
            temp[key] = clone(obj[key]);
        return temp;
    }

    Crafty.bind("Load", function () {
        if (!Crafty.support.setter && Crafty.support.defineProperty) {
            noSetter = [];
            Crafty.bind("EnterFrame", function () {
                var i = 0, l = noSetter.length, current;
                for (; i < l; ++i) {
                    current = noSetter[i];
                    if (current.obj[current.prop] !== current.obj['_' + current.prop]) {
                        current.fn.call(current.obj, current.obj[current.prop]);
                    }
                }
            });
        }
    });

    initComponents(Crafty, window, window.document);

    //make Crafty global
    window.Crafty = Crafty;

    if (typeof define === 'function') {
        define('crafty', [], function() { return Crafty; });
    }

    module.exports = Crafty;
})(window,

//wrap around components
function(Crafty, window, document) {

/**
* Spatial HashMap for broad phase collision
*
* @author Louis Stowasser
*/
(function (parent) {


	/**@
	* #Crafty.HashMap.constructor
	* @comp Crafty.HashMap
	* @sign public void Crafty.HashMap([cellsize])
	* @param cellsize - the cell size. If omitted, `cellsize` is 64.
	* 
    * Set `cellsize`.
    * And create `this.map`.
	*/
	var cellsize,

	HashMap = function (cell) {
		cellsize = cell || 64;
		this.map = {};
	},

	SPACE = " ";

	HashMap.prototype = {
	/**@
	* #Crafty.map.insert
	* @comp Crafty.map
    * @sign public Object Crafty.map.insert(Object obj)
	* @param obj - An entity to be inserted.
	* 
    * `obj` is inserted in '.map' of the corresponding broad phase cells. An object of the following fields is returned.
    * ~~~
    * - the object that keep track of cells (keys)
    * - `obj`
    * - the HashMap object
    * ~~~
	*/
		insert: function (obj) {
			var keys = HashMap.key(obj),
			entry = new Entry(keys, obj, this),
			i = 0,
			j,
			hash;

			//insert into all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;
					if (!this.map[hash]) this.map[hash] = [];
					this.map[hash].push(obj);
				}
			}

			return entry;
		},

	/**@
	* #Crafty.map.search
	* @comp Crafty.map
    * @sign public Object Crafty.map.search(Object rect[, Boolean filter])
	* @param rect - the rectangular region to search for entities.
	* @param filter - Default value is true. Otherwise, must be false.
	* 
    * - If `filter` is `false`, just search for all the entries in the give `rect` region by broad phase collision. Entity may be returned duplicated.
    * - If `filter` is `true`, filter the above results by checking that they actually overlap `rect`.
    * The easier usage is with `filter`=`true`. For performance reason, you may use `filter`=`false`, and filter the result yourself. See examples in drawing.js and collision.js
	*/
		search: function (rect, filter) {
			var keys = HashMap.key(rect),
			i, j,
			hash,
			results = [];

			if (filter === undefined) filter = true; //default filter to true

			//search in all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;

					if (this.map[hash]) {
						results = results.concat(this.map[hash]);
					}
				}
			}

			if (filter) {
				var obj, id, finalresult = [], found = {};
				//add unique elements to lookup table with the entity ID as unique key
				for (i = 0, l = results.length; i < l; i++) {
					obj = results[i];
					if (!obj) continue; //skip if deleted
					id = obj[0]; //unique ID

					//check if not added to hash and that actually intersects
					if (!found[id] && obj.x < rect._x + rect._w && obj._x + obj._w > rect._x &&
								 obj.y < rect._y + rect._h && obj._h + obj._y > rect._y)
						found[id] = results[i];
				}

				//loop over lookup table and copy to final array
				for (obj in found) finalresult.push(found[obj]);

				return finalresult;
			} else {
				return results;
			}
		},

	/**@
	* #Crafty.map.remove
	* @comp Crafty.map
	* @sign public void Crafty.map.remove([Object keys, ]Object obj)
	* @param keys - key region. If omitted, it will be derived from obj by `Crafty.HashMap.key`.
	* @param obj - need more document.
	* 
	* Remove an entity in a broad phase map.
	* - The second form is only used in Crafty.HashMap to save time for computing keys again, where keys were computed previously from obj. End users should not call this form directly.
	*
	* @example 
	* ~~~
	* Crafty.map.remove(e);
	* ~~~
	*/
		remove: function (keys, obj) {
			var i = 0, j, hash;

			if (arguments.length == 1) {
				obj = keys;
				keys = HashMap.key(obj);
			}

			//search in all x buckets
			for (i = keys.x1; i <= keys.x2; i++) {
				//insert into all y buckets
				for (j = keys.y1; j <= keys.y2; j++) {
					hash = i + SPACE + j;

					if (this.map[hash]) {
						var cell = this.map[hash],
						m,
						n = cell.length;
						//loop over objs in cell and delete
						for (m = 0; m < n; m++)
							if (cell[m] && cell[m][0] === obj[0])
								cell.splice(m, 1);
					}
				}
			}
		},

	/**@
	* #Crafty.map.boundaries
	* @comp Crafty.map
	* @sign public Object Crafty.map.boundaries()
	* 
    * The return `Object` is of the following format.
    * ~~~
	* {
    *   min: {
    *     x: val_x,
    *     y: val_y
    *   },
    *   max: {
    *     x: val_x,
    *     y: val_y
    *   }
    * }
    * ~~~
	*/
		boundaries: function () {
			var k, ent,
			hash = {
				max: { x: -Infinity, y: -Infinity },
				min: { x: Infinity, y: Infinity }
			},
			coords = {
				max: { x: -Infinity, y: -Infinity },
				min: { x: Infinity, y: Infinity }
			};

      //Using broad phase hash to speed up the computation of boundaries.
			for (var h in this.map) {
				if (!this.map[h].length) continue;

        //broad phase coordinate
				var map_coord = h.split(SPACE),
					i=map_coord[0],
					j=map_coord[0];
				if (i >= hash.max.x) {
					hash.max.x = i;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						//make sure that this is a Crafty entity
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.max.x = Math.max(coords.max.x, ent.x + ent.w);
						}
					}
				}
				if (i <= hash.min.x) {
					hash.min.x = i;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.min.x = Math.min(coords.min.x, ent.x);
						}
					}
				}
				if (j >= hash.max.y) {
					hash.max.y = j;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.max.y = Math.max(coords.max.y, ent.y + ent.h);
						}
					}
				}
				if (j <= hash.min.y) {
					hash.min.y = j;
					for (k in this.map[h]) {
						ent = this.map[h][k];
						if (typeof ent == 'object' && 'requires' in ent) {
							coords.min.y = Math.min(coords.min.y, ent.y);
						}
					}
				}
			}

			return coords;
		}
	};

/**@
* #Crafty.HashMap
* @category 2D
* Broad-phase collision detection engine. See background information at 
*
* ~~~
* - [N Tutorial B - Broad-Phase Collision](http://www.metanetsoftware.com/technique/tutorialB.html)
* - [Broad-Phase Collision Detection with CUDA](http.developer.nvidia.com/GPUGems3/gpugems3_ch32.html)
* ~~~
* @see Crafty.map
*/

	/**@
	* #Crafty.HashMap.key
	* @comp Crafty.HashMap
	* @sign public Object Crafty.HashMap.key(Object obj)
	* @param obj - an Object that has .mbr() or _x, _y, _w and _h.
    * Get the rectangular region (in terms of the grid, with grid size `cellsize`), where the object may fall in. This region is determined by the object's bounding box.
    * The `cellsize` is 64 by default.
    * 
    * @see Crafty.HashMap.constructor
	*/
	HashMap.key = function (obj) {
		if (obj.hasOwnProperty('mbr')) {
			obj = obj.mbr();
		}
		var x1 = Math.floor(obj._x / cellsize),
		y1 = Math.floor(obj._y / cellsize),
		x2 = Math.floor((obj._w + obj._x) / cellsize),
		y2 = Math.floor((obj._h + obj._y) / cellsize);
		return { x1: x1, y1: y1, x2: x2, y2: y2 };
	};

	HashMap.hash = function (keys) {
		return keys.x1 + SPACE + keys.y1 + SPACE + keys.x2 + SPACE + keys.y2;
	};

	function Entry(keys, obj, map) {
		this.keys = keys;
		this.map = map;
		this.obj = obj;
	}

	Entry.prototype = {
		update: function (rect) {
			//check if buckets change
			if (HashMap.hash(HashMap.key(rect)) != HashMap.hash(this.keys)) {
				this.map.remove(this.keys, this.obj);
				var e = this.map.insert(this.obj);
				this.keys = e.keys;
			}
		}
	};

	parent.HashMap = HashMap;
})(Crafty);

/**@
* #Crafty.map
* @category 2D
* Functions related with querying entities.
* @see Crafty.HashMap
*/
Crafty.map = new Crafty.HashMap();
var M = Math,
	Mc = M.cos,
	Ms = M.sin,
	PI = M.PI,
	DEG_TO_RAD = PI / 180;


/**@
* #2D
* @category 2D
* Component for any entity that has a position on the stage.
* @trigger Move - when the entity has moved - { _x:Number, _y:Number, _w:Number, _h:Number } - Old position
* @trigger Change - when the entity has moved - { _x:Number, _y:Number, _w:Number, _h:Number } - Old position
* @trigger Rotate - when the entity is rotated - { cos:Number, sin:Number, deg:Number, rad:Number, o: {x:Number, y:Number}, matrix: {M11, M12, M21, M22} }
*/
Crafty.c("2D", {
/**@
	* #.x
	* @comp 2D
	* The `x` position on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._x` property.
	* @see ._attr
	*/
	_x: 0,
	/**@
	* #.y
	* @comp 2D
	* The `y` position on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._y` property.
	* @see ._attr
	*/
	_y: 0,
	/**@
	* #.w
	* @comp 2D
	* The width of the entity. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._w` property.
	*
	* Changing this value is not recommended as canvas has terrible resize quality and DOM will just clip the image.
	* @see ._attr
	*/
	_w: 0,
	/**@
	* #.h
	* @comp 2D
	* The height of the entity. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._h` property.
	*
	* Changing this value is not recommended as canvas has terrible resize quality and DOM will just clip the image.
	* @see ._attr
	*/
	_h: 0,
	/**@
	* #.z
	* @comp 2D
	* The `z` index on the stage. When modified, will automatically be redrawn.
	* Is actually a getter/setter so when using this value for calculations and not modifying it,
	* use the `._z` property.
	*
	* A higher `z` value will be closer to the front of the stage. A smaller `z` value will be closer to the back.
	* A global Z index is produced based on its `z` value as well as the GID (which entity was created first).
	* Therefore entities will naturally maintain order depending on when it was created if same z value.
	* @see ._attr
	*/
	_z: 0,
	/**@
	* #.rotation
	* @comp 2D
	* Set the rotation of your entity. Rotation takes degrees in a clockwise direction.
	* It is important to note there is no limit on the rotation value. Setting a rotation
	* mod 360 will give the same rotation without reaching huge numbers.
	* @see ._attr
	*/
	_rotation: 0,
	/**@
	* #.alpha
	* @comp 2D
	* Transparency of an entity. Must be a decimal value between 0.0 being fully transparent to 1.0 being fully opaque.
	*/
	_alpha: 1.0,
	/**@
	* #.visible
	* @comp 2D
	* If the entity is visible or not. Accepts a true or false value.
	* Can be used for optimization by setting an entities visibility to false when not needed to be drawn.
	*
	* The entity will still exist and can be collided with but just won't be drawn.
  * @see Crafty.DrawManager.draw, Crafty.DrawManager.drawAll
	*/
	_visible: true,

	/**@
	* #._globalZ
	* @comp 2D
	* When two entities overlap, the one with the larger `_globalZ` will be on top of the other.
	* @see Crafty.DrawManager.draw, Crafty.DrawManager.drawAll
	*/
	_globalZ: null,

	_origin: null,
	_mbr: null,
	_entry: null,
	_children: null,
	_parent: null,
	_changed: false,

	_defineGetterSetter_setter: function() {
		//create getters and setters using __defineSetter__ and __defineGetter__
		this.__defineSetter__('x', function (v) { this._attr('_x', v); });
		this.__defineSetter__('y', function (v) { this._attr('_y', v); });
		this.__defineSetter__('w', function (v) { this._attr('_w', v); });
		this.__defineSetter__('h', function (v) { this._attr('_h', v); });
		this.__defineSetter__('z', function (v) { this._attr('_z', v); });
		this.__defineSetter__('rotation', function (v) { this._attr('_rotation', v); });
		this.__defineSetter__('alpha', function (v) { this._attr('_alpha', v); });
		this.__defineSetter__('visible', function (v) { this._attr('_visible', v); });

		this.__defineGetter__('x', function () { return this._x; });
		this.__defineGetter__('y', function () { return this._y; });
		this.__defineGetter__('w', function () { return this._w; });
		this.__defineGetter__('h', function () { return this._h; });
		this.__defineGetter__('z', function () { return this._z; });
		this.__defineGetter__('rotation', function () { return this._rotation; });
		this.__defineGetter__('alpha', function () { return this._alpha; });
		this.__defineGetter__('visible', function () { return this._visible; });
		this.__defineGetter__('parent', function () { return this._parent; });
		this.__defineGetter__('numChildren', function () { return this._children.length; });
	},

	_defineGetterSetter_defineProperty: function() {
		Object.defineProperty(this, 'x', {
				set: function (v) { this._attr('_x', v); }
				, get: function () { return this._x; }
				, configurable: true
			});

		Object.defineProperty(this, 'y', {
				set: function (v) { this._attr('_y', v); }
				, get: function () { return this._y; }
				, configurable: true
			});

		Object.defineProperty(this, 'w', {
				set: function (v) { this._attr('_w', v); }
				, get: function () { return this._w; }
				, configurable: true
			});

		Object.defineProperty(this, 'h', {
				set: function (v) { this._attr('_h', v); }
				, get: function () { return this._h; }
				, configurable: true
			});

		Object.defineProperty(this, 'z', {
				set: function (v) { this._attr('_z', v); }
				, get: function () { return this._z; }
				, configurable: true
			});

		Object.defineProperty(this, 'rotation', {
			set: function (v) { this._attr('_rotation', v); }
			, get: function () { return this._rotation; }
			, configurable: true
		});

		Object.defineProperty(this, 'alpha', {
			set: function (v) { this._attr('_alpha', v); }
			, get: function () { return this._alpha; }
			, configurable: true
		});

		Object.defineProperty(this, 'visible', {
			set: function (v) { this._attr('_visible', v); }
			, get: function () { return this._visible; }
			, configurable: true
		});
	},

	_defineGetterSetter_fallback: function() {
		//set the public properties to the current private properties
		this.x = this._x;
		this.y = this._y;
		this.w = this._w;
		this.h = this._h;
		this.z = this._z;
		this.rotation = this._rotation;
		this.alpha = this._alpha;
		this.visible = this._visible;

		//on every frame check for a difference in any property
		this.bind("EnterFrame", function () {
			//if there are differences between the public and private properties
			if (this.x !== this._x || this.y !== this._y ||
				this.w !== this._w || this.h !== this._h ||
				this.z !== this._z || this.rotation !== this._rotation ||
				this.alpha !== this._alpha || this.visible !== this._visible) {

				//save the old positions
				var old = this.mbr() || this.pos();

				//if rotation has changed, use the private rotate method
				if (this.rotation !== this._rotation) {
					this._rotate(this.rotation);
				} else {
					//update the MBR
					var mbr = this._mbr, moved = false;
					// If the browser doesn't have getters or setters,
					// {x, y, w, h, z} and {_x, _y, _w, _h, _z} may be out of sync,
					// in which case t checks if they are different on tick and executes the Change event.
					if (mbr) { //check each value to see which has changed
						if (this.x !== this._x) { mbr._x -= this.x - this._x; moved = true; }
						else if (this.y !== this._y) { mbr._y -= this.y - this._y; moved = true; }
						else if (this.w !== this._w) { mbr._w -= this.w - this._w; moved = true; }
						else if (this.h !== this._h) { mbr._h -= this.h - this._h; moved = true; }
						else if (this.z !== this._z) { mbr._z -= this.z - this._z; moved = true; }
					}

					//if the moved flag is true, trigger a move
					if (moved) this.trigger("Move", old);
				}

				//set the public properties to the private properties
				this._x = this.x;
				this._y = this.y;
				this._w = this.w;
				this._h = this.h;
				this._z = this.z;
				this._rotation = this.rotation;
				this._alpha = this.alpha;
				this._visible = this.visible;

				//trigger the changes
				this.trigger("Change", old);
				//without this entities weren't added correctly to Crafty.map.map in IE8.
				//not entirely sure this is the best way to fix it though
				this.trigger("Move", old);
			}
		});
  },

	init: function() {
		this._globalZ = this[0];
		this._origin = { x: 0, y: 0 };
		this._children = [];

		if(Crafty.support.setter) {
      this._defineGetterSetter_setter();
		} else if (Crafty.support.defineProperty) {
			//IE9 supports Object.defineProperty
      this._defineGetterSetter_defineProperty();
		} else {
			/*
			If no setters and getters are supported (e.g. IE8) supports,
			check on every frame for a difference between this._(x|y|w|h|z...)
			and this.(x|y|w|h|z) and update accordingly.
			*/
      this._defineGetterSetter_fallback();
		}

		//insert self into the HashMap
		this._entry = Crafty.map.insert(this);

		//when object changes, update HashMap
		this.bind("Move", function (e) {
			var area = this._mbr || this;
			this._entry.update(area);
			this._cascade(e);
		});

		this.bind("Rotate", function (e) {
			var old = this._mbr || this;
			this._entry.update(old);
			this._cascade(e);
		});

		//when object is removed, remove from HashMap and destroy attached children
		this.bind("Remove", function () {
			if (this._children) {
				for (var i = 0; i < this._children.length; i++) {
					if (this._children[i].destroy) {
						this._children[i].destroy();
					}
				}
				this._children = [];
			}
			
			if (this._parent) {
				this._parent.detach(this);
			}

			Crafty.map.remove(this);

			this.detach();
		});
	},

	/**
	* Calculates the MBR when rotated with an origin point
	*/
	_rotate: function (v) {
		var theta = -1 * (v % 360), //angle always between 0 and 359
			rad = theta * DEG_TO_RAD,
			ct = Math.cos(rad), //cache the sin and cosine of theta
			st = Math.sin(rad),
			o = {
			x: this._origin.x + this._x,
			y: this._origin.y + this._y
		};

		//if the angle is 0 and is currently 0, skip
		if (!theta) {
			this._mbr = null;
			if (!this._rotation % 360) return;
		}

		var x0 = o.x + (this._x - o.x) * ct + (this._y - o.y) * st,
			y0 = o.y - (this._x - o.x) * st + (this._y - o.y) * ct,
			x1 = o.x + (this._x + this._w - o.x) * ct + (this._y - o.y) * st,
			y1 = o.y - (this._x + this._w - o.x) * st + (this._y - o.y) * ct,
			x2 = o.x + (this._x + this._w - o.x) * ct + (this._y + this._h - o.y) * st,
			y2 = o.y - (this._x + this._w - o.x) * st + (this._y + this._h - o.y) * ct,
			x3 = o.x + (this._x - o.x) * ct + (this._y + this._h - o.y) * st,
			y3 = o.y - (this._x - o.x) * st + (this._y + this._h - o.y) * ct,
			minx = Math.round(Math.min(x0, x1, x2, x3)),
			miny = Math.round(Math.min(y0, y1, y2, y3)),
			maxx = Math.round(Math.max(x0, x1, x2, x3)),
			maxy = Math.round(Math.max(y0, y1, y2, y3));

		this._mbr = { _x: minx, _y: miny, _w: maxx - minx, _h: maxy - miny };

		//trigger rotation event
		var difference = this._rotation - v,
			drad = difference * DEG_TO_RAD;

		this.trigger("Rotate", {
			cos: Math.cos(drad),
			sin: Math.sin(drad),
			deg: difference,
			rad: drad,
			o: { x: o.x, y: o.y },
			matrix: { M11: ct, M12: st, M21: -st, M22: ct }
		});
	},

	/**@
	* #.area
	* @comp 2D
	* @sign public Number .area(void)
	* Calculates the area of the entity
	*/
	area: function () {
		return this._w * this._h;
	},

	/**@
	* #.intersect
	* @comp 2D
	* @sign public Boolean .intersect(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .intersect(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if this entity intersects a rectangle.
	*/
	intersect: function (x, y, w, h) {
		var rect, obj = this._mbr || this;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return obj._x < rect.x + rect.w && obj._x + obj._w > rect.x &&
			   obj._y < rect.y + rect.h && obj._h + obj._y > rect.y;
	},

	/**@
	* #.within
	* @comp 2D
	* @sign public Boolean .within(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .within(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if this current entity is within another rectangle.
	*/
	within: function (x, y, w, h) {
		var rect;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return rect.x <= this.x && rect.x + rect.w >= this.x + this.w &&
				rect.y <= this.y && rect.y + rect.h >= this.y + this.h;
	},

	/**@
	* #.contains
	* @comp 2D
	* @sign public Boolean .contains(Number x, Number y, Number w, Number h)
	* @param x - X position of the rect
	* @param y - Y position of the rect
	* @param w - Width of the rect
	* @param h - Height of the rect
	* @sign public Boolean .contains(Object rect)
	* @param rect - An object that must have the `x, y, w, h` values as properties
	* Determines if the rectangle is within the current entity.
	*/
	contains: function (x, y, w, h) {
		var rect;
		if (typeof x === "object") {
			rect = x;
		} else {
			rect = { x: x, y: y, w: w, h: h };
		}

		return rect.x >= this.x && rect.x + rect.w <= this.x + this.w &&
				rect.y >= this.y && rect.y + rect.h <= this.y + this.h;
	},

	/**@
	* #.pos
	* @comp 2D
	* @sign public Object .pos(void)
	* Returns the x, y, w, h properties as a rect object
	* (a rect object is just an object with the keys _x, _y, _w, _h).
	*
	* The keys have an underscore prefix. This is due to the x, y, w, h
	* properties being merely setters and getters that wrap the properties with an underscore (_x, _y, _w, _h).
	*/
	pos: function () {
		return {
			_x: (this._x),
			_y: (this._y),
			_w: (this._w),
			_h: (this._h)
		};
	},

	/**@
	* #.mbr
	* @comp 2D
	* @sign public Object .mbr()
	* Returns the minimum bounding rectangle. If there is no rotation
	* on the entity it will return the rect.
	*/
	mbr: function () {
		if (!this._mbr) return this.pos();
		return {
			_x: (this._mbr._x),
			_y: (this._mbr._y),
			_w: (this._mbr._w),
			_h: (this._mbr._h)
		};
	},

	/**@
	* #.isAt
	* @comp 2D
	* @sign public Boolean .isAt(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	* Determines whether a point is contained by the entity. Unlike other methods,
	* an object can't be passed. The arguments require the x and y value
	*/
	isAt: function (x, y) {
		if (this.mapArea) {
      		return this.mapArea.containsPoint(x, y);
		} else if (this.map) {
			return this.map.containsPoint(x, y);
		}
		return this.x <= x && this.x + this.w >= x &&
			   this.y <= y && this.y + this.h >= y;
	},

	/**@
	* #.move
	* @comp 2D
	* @sign public this .move(String dir, Number by)
	* @param dir - Direction to move (n,s,e,w,ne,nw,se,sw)
	* @param by - Amount to move in the specified direction
	* Quick method to move the entity in a direction (n, s, e, w, ne, nw, se, sw) by an amount of pixels.
	*/
	move: function (dir, by) {
		if (dir.charAt(0) === 'n') this.y -= by;
		if (dir.charAt(0) === 's') this.y += by;
		if (dir === 'e' || dir.charAt(1) === 'e') this.x += by;
		if (dir === 'w' || dir.charAt(1) === 'w') this.x -= by;

		return this;
	},

	/**@
	* #.shift
	* @comp 2D
	* @sign public this .shift(Number x, Number y, Number w, Number h)
	* @param x - Amount to move X
	* @param y - Amount to move Y
	* @param w - Amount to widen
	* @param h - Amount to increase height
	* Shift or move the entity by an amount. Use negative values
	* for an opposite direction.
	*/
	shift: function (x, y, w, h) {
		if (x) this.x += x;
		if (y) this.y += y;
		if (w) this.w += w;
		if (h) this.h += h;

		return this;
	},

	/**@
	* #._cascade
	* @comp 2D
    * @sign public void ._cascade(e)
	* @param e - Amount to move X
	* Shift move or rotate the entity by an amount. Use negative values
	* for an opposite direction.
	*/
	_cascade: function (e) {
		if (!e) return; //no change in position
		var i = 0, children = this._children, l = children.length, obj;
		//rotation
		if (e.cos) {
			for (; i < l; ++i) {
				obj = children[i];
				if ('rotate' in obj) obj.rotate(e);
			}
		} else {
			//use MBR or current
			var rect = this._mbr || this,
				dx = rect._x - e._x,
				dy = rect._y - e._y,
				dw = rect._w - e._w,
				dh = rect._h - e._h;

			for (; i < l; ++i) {
				obj = children[i];
				obj.shift(dx, dy, dw, dh);
			}
		}
	},

	/**@
	* #.attach
	* @comp 2D
	* @sign public this .attach(Entity obj[, .., Entity objN])
	* @param obj - Entity(s) to attach
	* Attaches an entities position and rotation to current entity. When the current entity moves,
	* the attached entity will move by the same amount. Attached entities stored in _children array,
	* the parent object is stored in _parent on the child entities.
	*
	* As many objects as wanted can be attached and a hierarchy of objects is possible by attaching.
	*/
	attach: function () {
		var i = 0, arg = arguments, l = arguments.length, obj;
		for (; i < l; ++i) {
			obj = arg[i];
			if (obj._parent) { obj._parent.detach(obj); }
			obj._parent = this;
			this._children.push(obj);
		}

		return this;
	},

	/**@
	* #.detach
	* @comp 2D
	* @sign public this .detach([Entity obj])
	* @param obj - The entity to detach. Left blank will remove all attached entities
	* Stop an entity from following the current entity. Passing no arguments will stop
	* every entity attached.
	*/
	detach: function (obj) {
		//if nothing passed, remove all attached objects
		if (!obj) {
			for (var i = 0; i < this._children.length; i++) {
				this._children[i]._parent = null;
			}
			this._children = [];
			return this;
		}

		//if obj passed, find the handler and unbind
		for (var i = 0; i < this._children.length; i++) {
			if (this._children[i] == obj) {
				this._children.splice(i, 1);
			}
		}
		obj._parent = null;

		return this;
	},

	/**@
	* #.origin
	* @comp 2D
	* @sign public this .origin(Number x, Number y)
	* @param x - Pixel value of origin offset on the X axis
	* @param y - Pixel value of origin offset on the Y axis
	* @sign public this .origin(String offset)
	* @param offset - Combination of center, top, bottom, middle, left and right
	* Set the origin point of an entity for it to rotate around.
	*
	* @example
	* ~~~
	* this.origin("top left")
	* this.origin("center")
	* this.origin("bottom right")
	* this.origin("middle right")
	* ~~~
	*
	* @see .rotation
	*/
	origin: function (x, y) {
		//text based origin
		if (typeof x === "string") {
			if (x === "centre" || x === "center" || x.indexOf(' ') === -1) {
				x = this._w / 2;
				y = this._h / 2;
			} else {
				var cmd = x.split(' ');
				if (cmd[0] === "top") y = 0;
				else if (cmd[0] === "bottom") y = this._h;
				else if (cmd[0] === "middle" || cmd[1] === "center" || cmd[1] === "centre") y = this._h / 2;

				if (cmd[1] === "center" || cmd[1] === "centre" || cmd[1] === "middle") x = this._w / 2;
				else if (cmd[1] === "left") x = 0;
				else if (cmd[1] === "right") x = this._w;
			}
		}

		this._origin.x = x;
		this._origin.y = y;

		return this;
	},

	/**@
	* #.flip
	* @comp 2D
	* @trigger Change - when the entity has flipped
	* @sign public this .flip(String dir)
	* @param dir - Flip direction
	*
	* Flip entity on passed direction
	*
	* @example
	* ~~~
	* this.flip("X")
	* ~~~
	*/
	flip: function (dir) {
		dir = dir || "X";
                if(!this["_flip" + dir]) {
                    this["_flip" + dir] = true;
                    this.trigger("Change");
                }
	},

        /**@
	* #.unflip
	* @comp 2D
	* @trigger Change - when the entity has unflipped
	* @sign public this .unflip(String dir)
	* @param dir - Unflip direction
	*
	* Unflip entity on passed direction (if it's flipped)
	*
	* @example
	* ~~~
	* this.unflip("X")
	* ~~~
	*/
	unflip: function (dir) {
		dir = dir || "X";
                if(this["_flip" + dir]) {
                    this["_flip" + dir] = false;
                    this.trigger("Change");
                }
	},

	/**
	* Method for rotation rather than through a setter
	*/
	rotate: function (e) {
		//assume event data origin
		this._origin.x = e.o.x - this._x;
		this._origin.y = e.o.y - this._y;

		//modify through the setter method
		this._attr('_rotation', e.theta);
	},

	/**@
	* #._attr
	* @comp 2D
	* Setter method for all 2D properties including
	* x, y, w, h, alpha, rotation and visible.
	*/
	_attr: function (name, value) {
		//keep a reference of the old positions
		var pos = this.pos(),
			old = this.mbr() || pos;

		//if rotation, use the rotate method
		if (name === '_rotation') {
			this._rotate(value);
			this.trigger("Rotate");
			//set the global Z and trigger reorder just in case
		} else if (name === '_z') {
			this._globalZ = parseInt(value + Crafty.zeroFill(this[0], 5), 10); //magic number 10e5 is the max num of entities
			this.trigger("reorder");
			//if the rect bounds change, update the MBR and trigger move
		} else if (name == '_x' || name === '_y' || name === '_w' || name === '_h') {
			var mbr = this._mbr;
			if (mbr) {
				mbr[name] -= this[name] - value;
			}
			this[name] = value;
			this.trigger("Move", old);
		}

		//everything will assume the value
		this[name] = value;

		//trigger a change
		this.trigger("Change", old);
	}
});

Crafty.c("Physics", {
	_gravity: 0.4,
	_friction: 0.2,
	_bounce: 0.5,

	gravity: function (gravity) {
		this._gravity = gravity;
	}
});

/**@
* #Gravity
* @category 2D
* Adds gravitational pull to the entity.
*/
Crafty.c("Gravity", {
	_gravityConst: 0.2,
	_gy: 0,
	_falling: true,
	_anti: null,

	init: function () {
		this.requires("2D");
	},

	/**@
	* #.gravity
	* @comp Gravity
	* @sign public this .gravity([comp])
	* @param comp - The name of a component that will stop this entity from falling
	*
	* Enable gravity for this entity no matter whether comp parameter is not specified,
	* If comp parameter is specified all entities with that component will stop this entity from falling.
	* For a player entity in a platform game this would be a component that is added to all entities
	* that the player should be able to walk on.
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color, Gravity")
	*	 .color("red")
	*	 .attr({ w: 100, h: 100 })
	*	 .gravity("platform")
	* ~~~
	*/
	gravity: function (comp) {
		if (comp) this._anti = comp;

		this.bind("EnterFrame", this._enterFrame);

		return this;
	},

	/**@
	* #.gravityConst
	* @comp Gravity
	* @sign public this .gravityConst(g)
	* @param g - gravitational constant
	*
	* Set the gravitational constant to g. The default is .2. The greater g, the faster the object falls.
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color, Gravity")
	*   .color("red")
	*   .attr({ w: 100, h: 100 })
	*   .gravity("platform")
	*   .gravityConst(2)
	* ~~~
	*/
	gravityConst: function(g) {
		this._gravityConst=g;
		return this;
	},

	_enterFrame: function () {
		if (this._falling) {
			//if falling, move the players Y
			this._gy += this._gravityConst;
			this.y += this._gy;
		} else {
			this._gy = 0; //reset change in y
		}

		var obj, hit = false, pos = this.pos(),
			q, i = 0, l;

		//Increase by 1 to make sure map.search() finds the floor
		pos._y++;

		//map.search wants _x and intersect wants x...
		pos.x = pos._x;
		pos.y = pos._y;
		pos.w = pos._w;
		pos.h = pos._h;

		q = Crafty.map.search(pos);
		l = q.length;

		for (; i < l; ++i) {
			obj = q[i];
			//check for an intersection directly below the player
			if (obj !== this && obj.has(this._anti) && obj.intersect(pos)) {
				hit = obj;
				break;
			}
		}

		if (hit) { //stop falling if found
			if (this._falling) this.stopFalling(hit);
		} else {
			this._falling = true; //keep falling otherwise
		}
	},

	stopFalling: function (e) {
		if (e) this.y = e._y - this._h; //move object

		//this._gy = -1 * this._bounce;
		this._falling = false;
		if (this._up) this._up = false;
		this.trigger("hit");
	},

	/**@
	* #.antigravity
	* @comp Gravity
	* @sign public this .antigravity()
	* Disable gravity for this component. It can be reenabled by calling .gravity()
	*/
	antigravity: function () {
		this.unbind("EnterFrame", this._enterFrame);
	}
});

/**@
* #Crafty.polygon
* @category 2D
*
* Polygon object used for hitboxes and click maps. Must pass an Array for each point as an
* argument where index 0 is the x position and index 1 is the y position.
*
* For example one point of a polygon will look like this: `[0,5]` where the `x` is `0` and the `y` is `5`.
*
* Can pass an array of the points or simply put each point as an argument.
*
* When creating a polygon for an entity, each point should be offset or relative from the entities `x` and `y`
* (don't include the absolute values as it will automatically calculate this).
*
*
* @example
* ~~~
* new Crafty.polygon([50,0],[100,100],[0,100]);
* new Crafty.polygon([[50,0],[100,100],[0,100]]);
* ~~~
*/
Crafty.polygon = function (poly) {
	if (arguments.length > 1) {
		poly = Array.prototype.slice.call(arguments, 0);
	}
	this.points = poly;
};

Crafty.polygon.prototype = {
	/**@
	* #.containsPoint
	* @comp Crafty.polygon
	* @sign public Boolean .containsPoint(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	*
	* Method is used to determine if a given point is contained by the polygon.
	*
	* @example
	* ~~~
	* var poly = new Crafty.polygon([50,0],[100,100],[0,100]);
	* poly.containsPoint(50, 50); //TRUE
	* poly.containsPoint(0, 0); //FALSE
	* ~~~
	*/
	containsPoint: function (x, y) {
		var p = this.points, i, j, c = false;

		for (i = 0, j = p.length - 1; i < p.length; j = i++) {
			if (((p[i][1] > y) != (p[j][1] > y)) && (x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) {
				c = !c;
			}
		}

		return c;
	},

	/**@
	* #.shift
	* @comp Crafty.polygon
	* @sign public void .shift(Number x, Number y)
	* @param x - Amount to shift the `x` axis
	* @param y - Amount to shift the `y` axis
	*
	* Shifts every single point in the polygon by the specified amount.
	*
	* @example
	* ~~~
	* var poly = new Crafty.polygon([50,0],[100,100],[0,100]);
	* poly.shift(5,5);
	* //[[55,5], [105,5], [5,105]];
	* ~~~
	*/
	shift: function (x, y) {
		var i = 0, l = this.points.length, current;
		for (; i < l; i++) {
			current = this.points[i];
			current[0] += x;
			current[1] += y;
		}
	},

	rotate: function (e) {
		var i = 0, l = this.points.length,
			current, x, y;

		for (; i < l; i++) {
			current = this.points[i];

			x = e.o.x + (current[0] - e.o.x) * e.cos + (current[1] - e.o.y) * e.sin;
			y = e.o.y - (current[0] - e.o.x) * e.sin + (current[1] - e.o.y) * e.cos;

			current[0] = x;
			current[1] = y;
		}
	}
};

/**@
* #Crafty.circle
* @category 2D
* Circle object used for hitboxes and click maps. Must pass a `x`, a `y` and a `radius` value.
*
*@example
* ~~~
* var centerX = 5,
*     centerY = 10,
*     radius = 25;
*
* new Crafty.circle(centerX, centerY, radius);
* ~~~
*
* When creating a circle for an entity, each point should be offset or relative from the entities `x` and `y`
* (don't include the absolute values as it will automatically calculate this).
*/
Crafty.circle = function (x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;

    // Creates an octagon that approximate the circle for backward compatibility.
    this.points = [];
    var theta;

    for (var i = 0; i < 8; i++) {
        theta = i * Math.PI / 4;
        this.points[i] = [this.x + (Math.sin(theta) * radius), this.y + (Math.cos(theta) * radius)];
    }
};

Crafty.circle.prototype = {
    /**@
	* #.containsPoint
	* @comp Crafty.circle
	* @sign public Boolean .containsPoint(Number x, Number y)
	* @param x - X position of the point
	* @param y - Y position of the point
	*
	* Method is used to determine if a given point is contained by the circle.
	*
	* @example
	* ~~~
	* var circle = new Crafty.circle(0, 0, 10);
	* circle.containsPoint(0, 0); //TRUE
	* circle.containsPoint(50, 50); //FALSE
	* ~~~
	*/
	containsPoint: function (x, y) {
		var radius = this.radius,
		    sqrt = Math.sqrt,
		    deltaX = this.x - x,
		    deltaY = this.y - y;

		return (deltaX * deltaX + deltaY * deltaY) < (radius * radius);
	},

	/**@
	* #.shift
	* @comp Crafty.circle
	* @sign public void .shift(Number x, Number y)
	* @param x - Amount to shift the `x` axis
	* @param y - Amount to shift the `y` axis
	*
	* Shifts the circle by the specified amount.
	*
	* @example
	* ~~~
	* var poly = new Crafty.circle(0, 0, 10);
	* circle.shift(5,5);
	* //{x: 5, y: 5, radius: 10};
	* ~~~
	*/
	shift: function (x, y) {
		this.x += x;
		this.y += y;

		var i = 0, l = this.points.length, current;
		for (; i < l; i++) {
			current = this.points[i];
			current[0] += x;
			current[1] += y;
		}
	},

	rotate: function () {
		// We are a circle, we don't have to rotate :)
	}
};


Crafty.matrix = function (m) {
	this.mtx = m;
	this.width = m[0].length;
	this.height = m.length;
};

Crafty.matrix.prototype = {
	x: function (other) {
		if (this.width != other.height) {
			return;
		}

		var result = [];
		for (var i = 0; i < this.height; i++) {
			result[i] = [];
			for (var j = 0; j < other.width; j++) {
				var sum = 0;
				for (var k = 0; k < this.width; k++) {
					sum += this.mtx[i][k] * other.mtx[k][j];
				}
				result[i][j] = sum;
			}
		}
		return new Crafty.matrix(result);
	},


	e: function (row, col) {
		//test if out of bounds
		if (row < 1 || row > this.mtx.length || col < 1 || col > this.mtx[0].length) return null;
		return this.mtx[row - 1][col - 1];
	}
}

/**@
* #Collision
* @category 2D
* Component to detect collision between any two convex polygons.
*/
Crafty.c("Collision", {
    /**@
     * #.init
     * @comp Collision
     * Create a rectangle polygon based on the x, y, w, h dimensions.
     *
     * You must ensure that the x, y, w, h properties are set before the init function is called. If you have a Car component that sets these properties you should create your entity like this
     * ~~~
     * Crafty.e('2D, DOM, Car, Collision');
     * ~~~
     * And not like
     * ~~~
     * Crafty.e('2D, DOM, Collision, Car');
     * ~~~
     */
    init: function () {
        this.requires("2D");
        var area = this._mbr || this;

        poly = new Crafty.polygon([0, 0], [area._w, 0], [area._w, area._h], [0, area._h]);
        this.map = poly;
        this.attach(this.map);
        this.map.shift(area._x, area._y);
    },

    /**@
	* #.collision
	* @comp Collision
	* 
	* @sign public this .collision([Crafty.polygon polygon])
	* @param polygon - Crafty.polygon object that will act as the hit area
	* 
	* @sign public this .collision(Array point1, .., Array pointN)
	* @param point# - Array with an `x` and `y` position to generate a polygon
	* 
	* Constructor takes a polygon or array of points to use as the hit area.
	*
	* The hit area (polygon) must be a convex shape and not concave
	* for the collision detection to work.
    *
    * If no hit area is specified x, y, w, h properties of the entity will be used.
	* 
	* @example
	* ~~~
	* Crafty.e("2D, Collision").collision(
	*     new Crafty.polygon([50,0], [100,100], [0,100])
	* );
    * 
    * Crafty.e("2D, Collision").collision([50,0], [100,100], [0,100]);
	* ~~~
	* 
	* @see Crafty.polygon
	*/
    collision: function (poly) {
        var area = this._mbr || this;

        if (!poly) {
            poly = new Crafty.polygon([0, 0], [area._w, 0], [area._w, area._h], [0, area._h]);
        }

        if (arguments.length > 1) {
            //convert args to array to create polygon
            var args = Array.prototype.slice.call(arguments, 0);
            poly = new Crafty.polygon(args);
        }

        this.map = poly;
        this.attach(this.map);
        this.map.shift(area._x, area._y);

        return this;
    },

	/**@
	* #.hit
	* @comp Collision
	* @sign public Boolean/Array hit(String component)
	* @param component - Check collision with entities that has this component
	* @return `false` if no collision. If a collision is detected, returns an Array of objects that are colliding.
	* 
	* Takes an argument for a component to test collision for. If a collision is found, an array of
	* every object in collision along with the amount of overlap is passed.
	*
	* If no collision, will return false. The return collision data will be an Array of Objects with the
	* type of collision used, the object collided and if the type used was SAT (a polygon was used as the hitbox) then an amount of overlap.\
	* ~~~
	* [{
	*    obj: [entity],
	*    type "MBR" or "SAT",
	*    overlap: [number]
	* }]
	* ~~~
	* `MBR` is your standard axis aligned rectangle intersection (`.intersect` in the 2D component).
	* `SAT` is collision between any convex polygon.
	* 
	* @see .onHit, 2D
	*/
	hit: function (comp) {
		var area = this._mbr || this,
			results = Crafty.map.search(area, false),
			i = 0, l = results.length,
			dupes = {},
			id, obj, oarea, key,
			hasMap = ('map' in this && 'containsPoint' in this.map),
			finalresult = [];

		if (!l) {
			return false;
		}

		for (; i < l; ++i) {
			obj = results[i];
			oarea = obj._mbr || obj; //use the mbr

			if (!obj) continue;
			id = obj[0];

			//check if not added to hash and that actually intersects
			if (!dupes[id] && this[0] !== id && obj.__c[comp] &&
							 oarea._x < area._x + area._w && oarea._x + oarea._w > area._x &&
							 oarea._y < area._y + area._h && oarea._h + oarea._y > area._y)
				dupes[id] = obj;
		}

		for (key in dupes) {
			obj = dupes[key];

			if (hasMap && 'map' in obj) {
				var SAT = this._SAT(this.map, obj.map);
				SAT.obj = obj;
				SAT.type = "SAT";
				if (SAT) finalresult.push(SAT);
			} else {
				finalresult.push({ obj: obj, type: "MBR" });
			}
		}

		if (!finalresult.length) {
			return false;
		}

		return finalresult;
	},

	/**@
	* #.onHit
	* @comp Collision
	* @sign public this .onHit(String component, Function hit[, Function noHit])
	* @param component - Component to check collisions for
	* @param hit - Callback method to execute when collided with component
	* @param noHit - Callback method executed once as soon as collision stops
	* 
	* Creates an enterframe event calling .hit() each time and if collision detected will invoke the callback.
	* 
	* @see .hit
	*/
	onHit: function (comp, callback, callbackOff) {
		var justHit = false;
		this.bind("EnterFrame", function () {
			var hitdata = this.hit(comp);
			if (hitdata) {
				justHit = true;
				callback.call(this, hitdata);
			} else if (justHit) {
				if (typeof callbackOff == 'function') {
					callbackOff.call(this);
				}
				justHit = false;
			}
		});
		return this;
	},

	_SAT: function (poly1, poly2) {
		var points1 = poly1.points,
			points2 = poly2.points,
			i = 0, l = points1.length,
			j, k = points2.length,
			normal = { x: 0, y: 0 },
			length,
			min1, min2,
			max1, max2,
			interval,
			MTV = null,
			MTV2 = null,
			MN = null,
			dot,
			nextPoint,
			currentPoint;

		//loop through the edges of Polygon 1
		for (; i < l; i++) {
			nextPoint = points1[(i == l - 1 ? 0 : i + 1)];
			currentPoint = points1[i];

			//generate the normal for the current edge
			normal.x = -(nextPoint[1] - currentPoint[1]);
			normal.y = (nextPoint[0] - currentPoint[0]);

			//normalize the vector
			length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
			normal.x /= length;
			normal.y /= length;

			//default min max
			min1 = min2 = -1;
			max1 = max2 = -1;

			//project all vertices from poly1 onto axis
			for (j = 0; j < l; ++j) {
				dot = points1[j][0] * normal.x + points1[j][1] * normal.y;
				if (dot > max1 || max1 === -1) max1 = dot;
				if (dot < min1 || min1 === -1) min1 = dot;
			}

			//project all vertices from poly2 onto axis
			for (j = 0; j < k; ++j) {
				dot = points2[j][0] * normal.x + points2[j][1] * normal.y;
				if (dot > max2 || max2 === -1) max2 = dot;
				if (dot < min2 || min2 === -1) min2 = dot;
			}

			//calculate the minimum translation vector should be negative
			if (min1 < min2) {
				interval = min2 - max1;

				normal.x = -normal.x;
				normal.y = -normal.y;
			} else {
				interval = min1 - max2;
			}

			//exit early if positive
			if (interval >= 0) {
				return false;
			}

			if (MTV === null || interval > MTV) {
				MTV = interval;
				MN = { x: normal.x, y: normal.y };
			}
		}

		//loop through the edges of Polygon 2
		for (i = 0; i < k; i++) {
			nextPoint = points2[(i == k - 1 ? 0 : i + 1)];
			currentPoint = points2[i];

			//generate the normal for the current edge
			normal.x = -(nextPoint[1] - currentPoint[1]);
			normal.y = (nextPoint[0] - currentPoint[0]);

			//normalize the vector
			length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
			normal.x /= length;
			normal.y /= length;

			//default min max
			min1 = min2 = -1;
			max1 = max2 = -1;

			//project all vertices from poly1 onto axis
			for (j = 0; j < l; ++j) {
				dot = points1[j][0] * normal.x + points1[j][1] * normal.y;
				if (dot > max1 || max1 === -1) max1 = dot;
				if (dot < min1 || min1 === -1) min1 = dot;
			}

			//project all vertices from poly2 onto axis
			for (j = 0; j < k; ++j) {
				dot = points2[j][0] * normal.x + points2[j][1] * normal.y;
				if (dot > max2 || max2 === -1) max2 = dot;
				if (dot < min2 || min2 === -1) min2 = dot;
			}

			//calculate the minimum translation vector should be negative
			if (min1 < min2) {
				interval = min2 - max1;

				normal.x = -normal.x;
				normal.y = -normal.y;
			} else {
				interval = min1 - max2;


			}

			//exit early if positive
			if (interval >= 0) {
				return false;
			}

			if (MTV === null || interval > MTV) MTV = interval;
			if (interval > MTV2 || MTV2 === null) {
				MTV2 = interval;
				MN = { x: normal.x, y: normal.y };
			}
		}

		return { overlap: MTV2, normal: MN };
	}
});


/**@
* #.WiredHitBox
* @comp Collision
* 
* Components to display Crafty.polygon Array for debugging collision detection
* 
* @example
* This will display a wired square over your original Canvas screen
* ~~~
* Crafty.e("2D,DOM,Player,Collision,WiredHitBox").collision(new Crafty.polygon([0,0],[0,300],[300,300],[300,0]))
* ~~~
*/
Crafty.c("WiredHitBox", {

	init: function () {

		if (Crafty.support.canvas) {
			var c = document.getElementById('HitBox');
			if (!c) {
				c = document.createElement("canvas");
				c.id = 'HitBox';
				c.width = Crafty.viewport.width;
				c.height = Crafty.viewport.height;
				c.style.position = 'absolute';
				c.style.left = "0px";
				c.style.top = "0px";
				c.style.zIndex = '1000';
				Crafty.stage.elem.appendChild(c);
			}
			var ctx = c.getContext('2d');
			var drawed = 0, total = Crafty("WiredHitBox").length;
			this.requires("Collision").bind("EnterFrame", function () {
				if (drawed == total) {
					ctx.clearRect(0, 0, Crafty.viewport.width, Crafty.viewport.height);
					drawed = 0;
				}
				ctx.beginPath();
				for (var p in this.map.points) {
					ctx.lineTo(Crafty.viewport.x + this.map.points[p][0], Crafty.viewport.y + this.map.points[p][1]);
				}
				ctx.closePath();
				ctx.stroke();
				drawed++;

			});
		}

		return this;
	}
});
/**@
* #.SolidHitBox
* @comp Collision
* 
* Components to display Crafty.polygon Array for debugging collision detection
* 
* @example
* This will display a solid triangle over your original Canvas screen
* ~~~
* Crafty.e("2D,DOM,Player,Collision,SolidHitBox").collision(new Crafty.polygon([0,0],[0,300],[300,300]))
* ~~~
*/
Crafty.c("SolidHitBox", {
	init: function () {
		if (Crafty.support.canvas) {
			var c = document.getElementById('HitBox');
			if (!c) {
				c = document.createElement("canvas");
				c.id = 'HitBox';
				c.width = Crafty.viewport.width;
				c.height = Crafty.viewport.height;
				c.style.position = 'absolute';
				c.style.left = "0px";
				c.style.top = "0px";
				c.style.zIndex = '1000';
				Crafty.stage.elem.appendChild(c);
			}
			var ctx = c.getContext('2d');
			var drawed = 0, total = Crafty("SolidHitBox").length;
			this.requires("Collision").bind("EnterFrame", function () {
				if (drawed == total) {
					ctx.clearRect(0, 0, Crafty.viewport.width, Crafty.viewport.height);
					drawed = 0;
				}
				ctx.beginPath();
				for (var p in this.map.points) {
					ctx.lineTo(Crafty.viewport.x + this.map.points[p][0], Crafty.viewport.y + this.map.points[p][1]);
				}
				ctx.closePath();
				ctx.fill();
				drawed++;
			});
		}

		return this;
	}
});
/**@
* #DOM
* @category Graphics
* Draws entities as DOM nodes, specifically `<DIV>`s.
*/
Crafty.c("DOM", {
    /**@
	* #._element
	* @comp DOM
	* The DOM element used to represent the entity.
	*/
	_element: null,
	//holds current styles, so we can check if there are changes to be written to the DOM
	_cssStyles: null,

	init: function () {
		this._cssStyles = { visibility: '', left: '', top: '', width: '', height: '', zIndex: '', opacity: '', transformOrigin: '', transform: '' };
		this._element = document.createElement("div");
		Crafty.stage.inner.appendChild(this._element);
		this._element.style.position = "absolute";
		this._element.id = "ent" + this[0];

		this.bind("Change", function () {
			if (!this._changed) {
				this._changed = true;
				Crafty.DrawManager.add(this);
			}
		});

		function updateClass() {
			var i = 0, c = this.__c, str = "";
			for (i in c) {
				str += ' ' + i;
			}
			str = str.substr(1);
			this._element.className = str;
		}

		this.bind("NewComponent", updateClass).bind("RemoveComponent", updateClass);

		if (Crafty.support.prefix === "ms" && Crafty.support.version < 9) {
			this._filters = {};

			this.bind("Rotate", function (e) {
				var m = e.matrix,
					elem = this._element.style,
					M11 = m.M11.toFixed(8),
					M12 = m.M12.toFixed(8),
					M21 = m.M21.toFixed(8),
					M22 = m.M22.toFixed(8);

				this._filters.rotation = "progid:DXImageTransform.Microsoft.Matrix(M11=" + M11 + ", M12=" + M12 + ", M21=" + M21 + ", M22=" + M22 + ",sizingMethod='auto expand')";
			});
		}

		this.bind("Remove", this.undraw);
		this.bind("RemoveComponent", function (compName) {
			if (compName === "DOM")
				this.undraw();
		});
	},

	/**@
	* #.getDomId
	* @comp DOM
	* @sign public this .getId()
	* 
	* Get the Id of the DOM element used to represent the entity.
	*/
	getDomId: function() {
		return this._element.id;
	},

	/**@
	* #.DOM
	* @comp DOM
	* @trigger Draw - when the entity is ready to be drawn to the stage - { style:String, type:"DOM", co}
	* @sign public this .DOM(HTMLElement elem)
	* @param elem - HTML element that will replace the dynamically created one
	* 
	* Pass a DOM element to use rather than one created. Will set `._element` to this value. Removes the old element.
	*/
	DOM: function (elem) {
		if (elem && elem.nodeType) {
			this.undraw();
			this._element = elem;
			this._element.style.position = 'absolute';
		}
		return this;
	},

	/**@
	* #.draw
	* @comp DOM
	* @sign public this .draw(void)
	* 
	* Updates the CSS properties of the node to draw on the stage.
	*/
	draw: function () {
		var style = this._element.style,
			coord = this.__coord || [0, 0, 0, 0],
			co = { x: coord[0], y: coord[1] },
			prefix = Crafty.support.prefix,
			trans = [];

		if (this._cssStyles.visibility != this._visible) {
			this._cssStyles.visibility = this._visible;
			if (!this._visible) {
				style.visibility = "hidden";
			} else {
				style.visibility = "visible";
			}
		}

		//utilize CSS3 if supported
		if (Crafty.support.css3dtransform) {
			trans.push("translate3d(" + (~~this._x) + "px," + (~~this._y) + "px,0)");
		} else {
			if (this._cssStyles.left != this._x) {
				this._cssStyles.left = this._x;
				style.left = ~~(this._x) + "px";
			}
			if (this._cssStyles.top != this._y) {
				this._cssStyles.top = this._y;
				style.top = ~~(this._y) + "px";
			}
		}

		if (this._cssStyles.width != this._w) {
			this._cssStyles.width = this._w;
			style.width = ~~(this._w) + "px";
		}
		if (this._cssStyles.height != this._h) {
			this._cssStyles.height = this._h;
			style.height = ~~(this._h) + "px";
		}
		if (this._cssStyles.zIndex != this._z) {
			this._cssStyles.zIndex = this._z;
			style.zIndex = this._z;
		}

		if (this._cssStyles.opacity != this._alpha) {
			this._cssStyles.opacity = this._alpha;
			style.opacity = this._alpha;
			style[prefix + "Opacity"] = this._alpha;
		}

		//if not version 9 of IE
		if (prefix === "ms" && Crafty.support.version < 9) {
			//for IE version 8, use ImageTransform filter
			if (Crafty.support.version === 8) {
				this._filters.alpha = "progid:DXImageTransform.Microsoft.Alpha(Opacity=" + (this._alpha * 100) + ")"; // first!
				//all other versions use filter
			} else {
				this._filters.alpha = "alpha(opacity=" + (this._alpha * 100) + ")";
			}
		}

		if (this._mbr) {
			var origin = this._origin.x + "px " + this._origin.y + "px";
			style.transformOrigin = origin;
			style[prefix + "TransformOrigin"] = origin;
			if (Crafty.support.css3dtransform) trans.push("rotateZ(" + this._rotation + "deg)");
			else trans.push("rotate(" + this._rotation + "deg)");
		}

		if (this._flipX) {
			trans.push("scaleX(-1)");
			if (prefix === "ms" && Crafty.support.version < 9) {
				this._filters.flipX = "fliph";
			}
		}

		if (this._flipY) {
			trans.push("scaleY(-1)");
			if (prefix === "ms" && Crafty.support.version < 9) {
				this._filters.flipY = "flipv";
			}
		}

		//apply the filters if IE
		if (prefix === "ms" && Crafty.support.version < 9) {
			this.applyFilters();
		}

		if (this._cssStyles.transform != trans.join(" ")) {
			this._cssStyles.transform = trans.join(" ");
			style.transform = this._cssStyles.transform;
			style[prefix + "Transform"] = this._cssStyles.transform;
		}

		this.trigger("Draw", { style: style, type: "DOM", co: co });

		return this;
	},

	applyFilters: function () {
		this._element.style.filter = "";
		var str = "";

		for (var filter in this._filters) {
			if (!this._filters.hasOwnProperty(filter)) continue;
			str += this._filters[filter] + " ";
		}

		this._element.style.filter = str;
	},

	/**@
	* #.undraw
	* @comp DOM
	* @sign public this .undraw(void)
	* 
	* Removes the element from the stage.
	*/
	undraw: function () {
		if (this._element) {
			Crafty.stage.inner.removeChild(this._element);
		}
		return this;
	},

	/**@
	* #.css
	* @comp DOM
	* @sign public * css(String property, String value)
	* @param property - CSS property to modify
	* @param value - Value to give the CSS property
	* @sign public * css(Object map)
	* @param map - Object where the key is the CSS property and the value is CSS value
	* 
	* Apply CSS styles to the element.
	*
	* Can pass an object where the key is the style property and the value is style value.
	*
	* For setting one style, simply pass the style as the first argument and the value as the second.
	*
	* The notation can be CSS or JS (e.g. `text-align` or `textAlign`).
	*
	* To return a value, pass the property.
	* 
	* @example
	* ~~~
	* this.css({'text-align', 'center', font: 'Arial'});
	* this.css("textAlign", "center");
	* this.css("text-align"); //returns center
	* ~~~
	*/
	css: function (obj, value) {
		var key,
			elem = this._element,
			val,
			style = elem.style;

		//if an object passed
		if (typeof obj === "object") {
			for (key in obj) {
				if (!obj.hasOwnProperty(key)) continue;
				val = obj[key];
				if (typeof val === "number") val += 'px';

				style[Crafty.DOM.camelize(key)] = val;
			}
		} else {
			//if a value is passed, set the property
			if (value) {
				if (typeof value === "number") value += 'px';
				style[Crafty.DOM.camelize(obj)] = value;
			} else { //otherwise return the computed property
				return Crafty.DOM.getStyle(elem, obj);
			}
		}

		this.trigger("Change");

		return this;
	}
});

/**
* Fix IE6 background flickering
*/
try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e) { }

Crafty.extend({
    /**@
	* #Crafty.DOM
	* @category Graphics
	* 
	* Collection of utilities for using the DOM.
	*/
	DOM: {
	/**@
		* #Crafty.DOM.window
		* @comp Crafty.DOM
		* 
		* Object with `width` and `height` values representing the width
		* and height of the `window`.
		*/
		window: {
			init: function () {
				this.width = window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth);
				this.height = window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight);
			},

			width: 0,
			height: 0
		},

		/**@
		* #Crafty.DOM.inner
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.inner(HTMLElement obj)
		* @param obj - HTML element to calculate the position
		* @returns Object with `x` key being the `x` position, `y` being the `y` position
		* 
		* Find a DOM elements position including
		* padding and border.
		*/
		inner: function (obj) {
			var rect = obj.getBoundingClientRect(),
				x = rect.left + (window.pageXOffset ? window.pageXOffset : document.body.scrollLeft),
				y = rect.top + (window.pageYOffset ? window.pageYOffset : document.body.scrollTop),

			//border left
				borderX = parseInt(this.getStyle(obj, 'border-left-width') || 0, 10) || parseInt(this.getStyle(obj, 'borderLeftWidth') || 0, 10) || 0,
				borderY = parseInt(this.getStyle(obj, 'border-top-width') || 0, 10) || parseInt(this.getStyle(obj, 'borderTopWidth') || 0, 10) || 0;

			x += borderX;
			y += borderY;

			return { x: x, y: y };
		},

		/**@
		* #Crafty.DOM.getStyle
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.getStyle(HTMLElement obj, String property)
		* @param obj - HTML element to find the style
		* @param property - Style to return
		* 
		* Determine the value of a style on an HTML element. Notation can be
		* in either CSS or JS.
		*/
		getStyle: function (obj, prop) {
			var result;
			if (obj.currentStyle)
				result = obj.currentStyle[this.camelize(prop)];
			else if (window.getComputedStyle)
				result = document.defaultView.getComputedStyle(obj, null).getPropertyValue(this.csselize(prop));
			return result;
		},

		/**
		* Used in the Zepto framework
		*
		* Converts CSS notation to JS notation
		*/
		camelize: function (str) {
			return str.replace(/-+(.)?/g, function (match, chr){ return chr ? chr.toUpperCase() : '' });
		},

		/**
		* Converts JS notation to CSS notation
		*/
		csselize: function (str) {
			return str.replace(/[A-Z]/g, function (chr){ return chr ? '-' + chr.toLowerCase() : '' });
		},

		/**@
		* #Crafty.DOM.translate
		* @comp Crafty.DOM
		* @sign public Object Crafty.DOM.translate(Number x, Number y)
		* @param x - x position to translate
		* @param y - y position to translate
		* @return Object with x and y as keys and translated values
		*
		* Method will translate x and y positions to positions on the
		* stage. Useful for mouse events with `e.clientX` and `e.clientY`.
		*/
		translate: function (x, y) {
			return {
				x: (x - Crafty.stage.x + document.body.scrollLeft + document.documentElement.scrollLeft - Crafty.viewport._x)/Crafty.viewport._zoom,
				y: (y - Crafty.stage.y + document.body.scrollTop + document.documentElement.scrollTop - Crafty.viewport._y)/Crafty.viewport._zoom
			}
		}
	}
});

/**@
* #HTML
* @category Graphics
* Component allow for insertion of arbitrary HTML into an entity
*/
Crafty.c("HTML", {
	inner: '',

	init: function () {
		this.requires('2D, DOM');
	},

	/**@
	* #.replace
	* @comp HTML
	* @sign public this .replace(String html)
	* @param html - arbitrary html
	* 
	* This method will replace the content of this entity with the supplied html
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .replace("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	replace: function (new_html) {
		this.inner = new_html;
		this._element.innerHTML = new_html;
		return this;
	},

	/**@
	* #.append
	* @comp HTML
	* @sign public this .append(String html)
	* @param html - arbitrary html
	* 
	* This method will add the supplied html in the end of the entity
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .append("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	append: function (new_html) {
		this.inner += new_html;
		this._element.innerHTML += new_html;
		return this;
	},

	/**@
	* #.prepend
	* @comp HTML
	* @sign public this .prepend(String html)
	* @param html - arbitrary html
	* 
	* This method will add the supplied html in the beginning of the entity
	*
	* @example
	* Create a link
	* ~~~
	* Crafty.e("HTML")
	*    .attr({x:20, y:20, w:100, h:100})
    *    .prepend("<a href='http://www.craftyjs.com'>Crafty.js</a>");
	* ~~~
	*/
	prepend: function (new_html) {
		this.inner = new_html + this.inner;
		this._element.innerHTML = new_html + this.inner;
		return this;
	}
});
/**@
 * #Storage
 * @category Utilities
 * Utility to allow data to be saved to a permanent storage solution: IndexedDB, WebSql, localstorage or cookies
 */
    /**@
	 * #.open
	 * @comp Storage
	 * @sign .open(String gameName)
	 * @param gameName - a machine readable string to uniquely identify your game
	 * 
	 * Opens a connection to the database. If the best they have is localstorage or lower, it does nothing
	 *
	 * @example
	 * Open a database
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * ~~~
	 */

    /**@
	 * #.save
	 * @comp Storage
	 * @sign .save(String key, String type, Mixed data)
	 * @param key - A unique key for identifying this piece of data
	 * @param type - 'save' or 'cache'
	 * @param data - Some kind of data.
	 * 
	 * Saves a piece of data to the database. Can be anything, although entities are preferred.
	 * For all storage methods but IndexedDB, the data will be serialized as a string
	 * During serialization, an entity's SaveData event will be triggered.
	 * Components should implement a SaveData handler and attach the necessary information to the passed object
	 *
	 * @example
	 * Saves an entity to the database
	 * ~~~
	 * var ent = Crafty.e("2D, DOM")
	 *                     .attr({x: 20, y: 20, w: 100, h:100});
	 * Crafty.storage.open('MyGame');
	 * Crafty.storage.save('MyEntity', 'save', ent);
	 * ~~~
	 */

    /**@
	 * #.load
	 * @comp Storage
	 * @sign .load(String key, String type)
	 * @param key - A unique key to search for
	 * @param type - 'save' or 'cache'
	 * @param callback - Do things with the data you get back
	 * 
	 * Loads a piece of data from the database.
	 * Entities will be reconstructed from the serialized string

	 * @example
	 * Loads an entity from the database
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * Crafty.storage.load('MyEntity', 'save', function (data) { // do things });
	 * ~~~
	 */

    /**@
	 * #.getAllKeys
	 * @comp Storage
	 * @sign .getAllKeys(String type)
	 * @param type - 'save' or 'cache'
	 * Gets all the keys for a given type

	 * @example
	 * Gets all the save games saved
	 * ~~~
	 * Crafty.storage.open('MyGame');
	 * var saves = Crafty.storage.getAllKeys('save');
	 * ~~~
	 */

    /**@
	 * #.external
	 * @comp Storage
	 * @sign .external(String url)
	 * @param url - URL to an external to save games too
	 * 
	 * Enables and sets the url for saving games to an external server
	 * 
	 * @example
	 * Save an entity to an external server
	 * ~~~
	 * Crafty.storage.external('http://somewhere.com/server.php');
	 * Crafty.storage.open('MyGame');
	 * var ent = Crafty.e('2D, DOM')
	 *                     .attr({x: 20, y: 20, w: 100, h:100});
	 * Crafty.storage.save('save01', 'save', ent);
	 * ~~~
	 */

    /**@
	 * #SaveData event
	 * @comp Storage
	 * @param data - An object containing all of the data to be serialized
	 * @param prepare - The function to prepare an entity for serialization
	 * 
	 * Any data a component wants to save when it's serialized should be added to this object.
	 * Straight attribute should be set in data.attr.
	 * Anything that requires a special handler should be set in a unique property.
	 *
	 * @example
	 * Saves the innerHTML of an entity
	 * ~~~
	 * Crafty.e("2D DOM").bind("SaveData", function (data, prepare) {
	 *     data.attr.x = this.x;
	 *     data.attr.y = this.y;
	 *     data.dom = this.element.innerHTML;
	 * });
	 * ~~~
	 */

    /**@
	 * #LoadData event
	 * @param data - An object containing all the data that been saved
	 * @param process - The function to turn a string into an entity
	 * 
	 * Handlers for processing any data that needs more than straight assignment
	 *
	 * Note that data stored in the .attr object is automatically added to the entity.
	 * It does not need to be handled here
	 *
	 * @example
	 * ~~~
	 * Sets the innerHTML from a saved entity
	 * Crafty.e("2D DOM").bind("LoadData", function (data, process) {
	 *     this.element.innerHTML = data.dom;
	 * });
	 * ~~~
	 */

Crafty.storage = (function () {
	var db = null, url, gameName, timestamps = {}, 
		transactionType = { READ: "readonly", READ_WRITE: "readwrite" };

	/*
	 * Processes a retrieved object.
	 * Creates an entity if it is one
	 */
	function process(obj) {
		if (obj.c) {
			var d = Crafty.e(obj.c)
						.attr(obj.attr)
						.trigger('LoadData', obj, process);
			return d;
		}
		else if (typeof obj == 'object') {
			for (var prop in obj) {
				obj[prop] = process(obj[prop]);
			}
		}
		return obj;
	}

	function unserialize(str) {
		if (typeof str != 'string') return null;
		var data = (JSON ? JSON.parse(str) : eval('(' + str + ')'));
		return process(data);
	}

	/* recursive function
	 * searches for entities in an object and processes them for serialization
	 */
	function prep(obj) {
		if (obj.__c) {
			// object is entity
			var data = { c: [], attr: {} };
			obj.trigger("SaveData", data, prep);
			for (var i in obj.__c) {
				data.c.push(i);
			}
			data.c = data.c.join(', ');
			obj = data;
		}
		else if (typeof obj == 'object') {
			// recurse and look for entities
			for (var prop in obj) {
				obj[prop] = prep(obj[prop]);
			}
		}
		return obj;
	}

	function serialize(e) {
		if (JSON) {
			var data = prep(e);
			return JSON.stringify(data);
		}
		else {
			alert("Crafty does not support saving on your browser. Please upgrade to a newer browser.");
			return false;
		}
	}

	// for saving a game to a central server
	function external(setUrl) {
		url = setUrl;
	}

	function openExternal() {
		if (1 && typeof url == "undefined") return;
		// get the timestamps for external saves and compare them to local
		// if the external is newer, load it

		var xml = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.onreadystatechange = function (evt) {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var data = eval("(" + xhr.responseText + ")");
					for (var i in data) {
						if (Crafty.storage.check(data[i].key, data[i].timestamp)) {
							loadExternal(data[i].key);
						}
					}
				}
			}
		}
		xhr.send("mode=timestamps&game=" + gameName);
	}

	function saveExternal(key, data, ts) {
		if (1 && typeof url == "undefined") return;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.send("mode=save&key=" + key + "&data=" + encodeURIComponent(data) + "&ts=" + ts + "&game=" + gameName);
	}

	function loadExternal(key) {
		if (1 && typeof url == "undefined") return;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.onreadystatechange = function (evt) {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var data = eval("(" + xhr.responseText + ")");
					Crafty.storage.save(key, 'save', data);
				}
			}
		}
		xhr.send("mode=load&key=" + key + "&game=" + gameName);
	}

	/**
	 * get timestamp
	 */
	function ts() {
		var d = new Date();
		return d.getTime();
	}

	// everyone names their object different. Fix that nonsense.
	if (typeof indexedDB != 'object') {
		window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
		
		/* Numeric constants for transaction type are deprecated
		 * Ensure that the script will work consistenly for recent and legacy browser versions
		 */
		if (typeof IDBTransaction == 'object') {
			transactionType.READ = IDBTransaction.READ || IDBTransaction.readonly || transactionType.READ;
			transactionType.READ_WRITE = IDBTransaction.READ_WRITE || IDBTransaction.readwrite || transactionType.READ_WRITE;
		}
	}

	if (typeof indexedDB == 'object') {

		return {
			open: function (gameName_n) {
				gameName = gameName_n;
				var stores = [];

				if (arguments.length == 1) {
					stores.push('save');
					stores.push('cache');
				}
				else {
					stores = arguments;
					stores.shift();
					stores.push('save');
					stores.push('cache');
				}
				if (db == null) {
					var request = indexedDB.open(gameName);
					request.onsuccess = function (e) {
						db = e.target.result;
						createStores();
						getTimestamps();
						openExternal();
					};
				}
				else {
					createStores();
					getTimestamps();
					openExternal();
				}

				// get all the timestamps for existing keys
				function getTimestamps() {
					try {
						var trans = db.transaction(['save'], transactionType.READ),
						store = trans.objectStore('save'),
						request = store.getAll();
						request.onsuccess = function (e) {
							var i = 0, a = event.target.result, l = a.length;
							for (; i < l; i++) {
								timestamps[a[i].key] = a[i].timestamp;
							}
						};
					}
					catch (e) {
					}
				}

				function createStores() {
					var request = db.setVersion("1.0");
					request.onsuccess = function (e) {
						for (var i = 0; i < stores.length; i++) {
							var st = stores[i];
							if (db.objectStoreNames.contains(st)) continue;
							db.createObjectStore(st, { keyPath: "key" });
						}
					};
				}
			},

			save: function (key, type, data) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.save(key, type, data); }, 1);
					return;
				}

				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				try {
					var trans = db.transaction([type], transactionType.READ_WRITE),
					store = trans.objectStore(type),
					request = store.put({
						"data": str,
						"timestamp": t,
						"key": key
					});
				}
				catch (e) {
					console.error(e);
				}
			},

			load: function (key, type, callback) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.load(key, type, callback); }, 1);
					return;
				}
				try {
					var trans = db.transaction([type], transactionType.READ),
					store = trans.objectStore(type),
					request = store.get(key);
					request.onsuccess = function (e) {
						callback(unserialize(e.target.result.data));
					};
				}
				catch (e) {
					console.error(e);
				}
			},

			getAllKeys: function (type, callback) {
				if (db == null) {
					setTimeout(function () { Crafty.storage.getAllkeys(type, callback); }, 1);
				}
				try {
					var trans = db.transaction([type], transactionType.READ),
					store = trans.objectStore(type),
					request = store.getCursor(),
					res = [];
					request.onsuccess = function (e) {
						var cursor = e.target.result;
						if (cursor) {
							res.push(cursor.key);
							// 'continue' is a reserved word, so .continue() causes IE8 to completely bark with "SCRIPT1010: Expected identifier".
							cursor['continue']();
						}
						else {
							callback(res);
						}
					};
				}
				catch (e) {
					console.error(e);
				}
			},

			check: function (key, timestamp) {
				return (timestamps[key] > timestamp);
			},

			external: external
		};
	}
	else if (typeof openDatabase == 'function') {
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
				if (arguments.length == 1) {
					db = {
						save: openDatabase(gameName_n + '_save', '1.0', 'Saves games for ' + gameName_n, 5 * 1024 * 1024),
						cache: openDatabase(gameName_n + '_cache', '1.0', 'Cache for ' + gameName_n, 5 * 1024 * 1024)
					}
				}
				else {
					// allows for any other types that can be thought of
					var args = arguments, i = 0;
					args.shift();
					for (; i < args.length; i++) {
						if (typeof db[args[i]] == 'undefined')
							db[args[i]] = openDatabase(gameName + '_' + args[i], '1.0', type, 5 * 1024 * 1024);
					}
				}

				db['save'].transaction(function (tx) {
					tx.executeSql('SELECT key, timestamp FROM data', [], function (tx, res) {
						var i = 0, a = res.rows, l = a.length;
						for (; i < l; i++) {
							timestamps[a.item(i).key] = a.item(i).timestamp;
						}
					});
				});
			},

			save: function (key, type, data) {
				if (typeof db[type] == 'undefined' && gameName != '') {
					this.open(gameName, type);
				}

				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				db[type].transaction(function (tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS data (key unique, text, timestamp)');
					tx.executeSql('SELECT * FROM data WHERE key = ?', [key], function (tx, results) {
						if (results.rows.length) {
							tx.executeSql('UPDATE data SET text = ?, timestamp = ? WHERE key = ?', [str, t, key]);
						}
						else {
							tx.executeSql('INSERT INTO data VALUES (?, ?, ?)', [key, str, t]);
						}
					});
				});
			},

			load: function (key, type, callback) {
				if (db[type] == null) {
					setTimeout(function () { Crafty.storage.load(key, type, callback); }, 1);
					return;
				}
				db[type].transaction(function (tx) {
					tx.executeSql('SELECT text FROM data WHERE key = ?', [key], function (tx, results) {
						if (results.rows.length) {
							res = unserialize(results.rows.item(0).text);
							callback(res);
						}
					});
				});
			},

			getAllKeys: function (type, callback) {
				if (db[type] == null) {
					setTimeout(function () { Crafty.storage.getAllKeys(type, callback); }, 1);
					return;
				}
				db[type].transaction(function (tx) {
					tx.executeSql('SELECT key FROM data', [], function (tx, results) {
						callback(results.rows);
					});
				});
			},

			check: function (key, timestamp) {
				return (timestamps[key] > timestamp);
			},

			external: external
		};
	}
	else if (typeof window.localStorage == 'object') {
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
			},

			save: function (key, type, data) {
				var k = gameName + '.' + type + '.' + key,
					str = serialize(data),
					t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				window.localStorage[k] = str;
				if (type == 'save')
					window.localStorage[k + '.ts'] = t;
			},

			load: function (key, type, callback) {
				var k = gameName + '.' + type + '.' + key,
					str = window.localStorage[k];

				callback(unserialize(str));
			},

			getAllKeys: function (type, callback) {
				var res = {}, output = [], header = gameName + '.' + type;
				for (var i in window.localStorage) {
					if (i.indexOf(header) != -1) {
						var key = i.replace(header, '').replace('.ts', '');
						res[key] = true;
					}
				}
				for (i in res) {
					output.push(i);
				}
				callback(output);
			},

			check: function (key, timestamp) {
				var ts = window.localStorage[gameName + '.save.' + key + '.ts'];

				return (parseInt(timestamp) > parseInt(ts));
			},

			external: external
		};
	}
	else {
		// default fallback to cookies
		return {
			open: function (gameName_n) {
				gameName = gameName_n;
			},

			save: function (key, type, data) {
				// cookies are very limited in space. we can only keep saves there
				if (type != 'save') return;
				var str = serialize(data), t = ts();
				if (type == 'save')	saveExternal(key, str, t);
				document.cookie = gameName + '_' + key + '=' + str + '; ' + gameName + '_' + key + '_ts=' + t + '; expires=Thur, 31 Dec 2099 23:59:59 UTC; path=/';
			},

			load: function (key, type, callback) {
				if (type != 'save') return;
				var reg = new RegExp(gameName + '_' + key + '=[^;]*'),
					result = reg.exec(document.cookie),
					data = unserialize(result[0].replace(gameName + '_' + key + '=', ''));

				callback(data);
			},

			getAllKeys: function (type, callback) {
				if (type != 'save') return;
				var reg = new RegExp(gameName + '_[^_=]', 'g'),
					matches = reg.exec(document.cookie),
					i = 0, l = matches.length, res = {}, output = [];
				for (; i < l; i++) {
					var key = matches[i].replace(gameName + '_', '');
					res[key] = true;
				}
				for (i in res) {
					output.push(i);
				}
				callback(output);
			},

			check: function (key, timestamp) {
				var header = gameName + '_' + key + '_ts',
					reg = new RegExp(header + '=[^;]'),
					result = reg.exec(document.cookie),
					ts = result[0].replace(header + '=', '');

				return (parseInt(timestamp) > parseInt(ts));
			},

			external: external
		};
	}
	/* template
	return {
		open: function (gameName) {
		},
		save: function (key, type, data) {
		},
		load: function (key, type, callback) {
		},
	}*/
})();
/**@
* #Crafty.support
* @category Misc, Core
* Determines feature support for what Crafty can do.
*/

(function testSupport() {
    var support = Crafty.support = {},
        ua = navigator.userAgent.toLowerCase(),
        match = /(webkit)[ \/]([\w.]+)/.exec(ua) ||
                /(o)pera(?:.*version)?[ \/]([\w.]+)/.exec(ua) ||
                /(ms)ie ([\w.]+)/.exec(ua) ||
                /(moz)illa(?:.*? rv:([\w.]+))?/.exec(ua) || [],
        mobile = /iPad|iPod|iPhone|Android|webOS|IEMobile/i.exec(ua);

    /**@
    * #Crafty.mobile
    * @comp Crafty.device
    * 
    * Determines if Crafty is running on mobile device.
    * 
    * If Crafty.mobile is equal true Crafty does some things under hood:
    * ~~~
    * - set viewport on max device width and height
    * - set Crafty.stage.fullscreen on true
    * - hide window scrollbars
    * ~~~
    * 
    * @see Crafty.viewport
    */
    if (mobile) Crafty.mobile = mobile[0];

    /**@
    * #Crafty.support.setter
    * @comp Crafty.support
    * Is `__defineSetter__` supported?
    */
    support.setter = ('__defineSetter__' in this && '__defineGetter__' in this);

    /**@
    * #Crafty.support.defineProperty
    * @comp Crafty.support
    * Is `Object.defineProperty` supported?
    */
    support.defineProperty = (function () {
        if (!'defineProperty' in Object) return false;
        try { Object.defineProperty({}, 'x', {}); }
        catch (e) { return false };
        return true;
    })();

    /**@
    * #Crafty.support.audio
    * @comp Crafty.support
    * Is HTML5 `Audio` supported?
    */
    support.audio = ('Audio' in window);

    /**@
    * #Crafty.support.prefix
    * @comp Crafty.support
    * Returns the browser specific prefix (`Moz`, `O`, `ms`, `webkit`).
    */
    support.prefix = (match[1] || match[0]);

    //browser specific quirks
    if (support.prefix === "moz") support.prefix = "Moz";
    if (support.prefix === "o") support.prefix = "O";

    if (match[2]) {
        /**@
        * #Crafty.support.versionName
        * @comp Crafty.support
        * Version of the browser
        */
        support.versionName = match[2];

        /**@
        * #Crafty.support.version
        * @comp Crafty.support
        * Version number of the browser as an Integer (first number)
        */
        support.version = +(match[2].split("."))[0];
    }

    /**@
    * #Crafty.support.canvas
    * @comp Crafty.support
    * Is the `canvas` element supported?
    */
    support.canvas = ('getContext' in document.createElement("canvas"));

    /**@
    * #Crafty.support.webgl
    * @comp Crafty.support
    * Is WebGL supported on the canvas element?
    */
    if (support.canvas) {
        var gl;
        try {
            gl = document.createElement("canvas").getContext("experimental-webgl");
            gl.viewportWidth = support.canvas.width;
            gl.viewportHeight = support.canvas.height;
        }
        catch (e) { }
        support.webgl = !!gl;
    }
    else {
        support.webgl = false;
    }

    /**@
    * #Crafty.support.css3dtransform
    * @comp Crafty.support
    * Is css3Dtransform supported by browser.
    */
    support.css3dtransform = (typeof document.createElement("div").style["Perspective"] !== "undefined")
                            || (typeof document.createElement("div").style[support.prefix + "Perspective"] !== "undefined");

    /**@
    * #Crafty.support.deviceorientation
    * @comp Crafty.support
    * Is deviceorientation event supported by browser.
    */
    support.deviceorientation = (typeof window.DeviceOrientationEvent !== "undefined") || (typeof window.OrientationEvent !== "undefined");

    /**@
    * #Crafty.support.devicemotion
    * @comp Crafty.support
    * Is devicemotion event supported by browser.
    */
    support.devicemotion = (typeof window.DeviceMotionEvent !== "undefined");

})();
Crafty.extend({

    zeroFill: function (number, width) {
        width -= number.toString().length;
        if (width > 0)
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        return number.toString();
    },

    /**@
    * #Crafty.sprite
    * @category Graphics
    * @sign public this Crafty.sprite([Number tile], String url, Object map[, Number paddingX[, Number paddingY]])
    * @param tile - Tile size of the sprite map, defaults to 1
    * @param url - URL of the sprite image
    * @param map - Object where the key is what becomes a new component and the value points to a position on the sprite map
    * @param paddingX - Horizontal space in between tiles. Defaults to 0.
    * @param paddingY - Vertical space in between tiles. Defaults to paddingX.
    * Generates components based on positions in a sprite image to be applied to entities.
    *
    * Accepts a tile size, URL and map for the name of the sprite and it's position.
    *
    * The position must be an array containing the position of the sprite where index `0`
    * is the `x` position, `1` is the `y` position and optionally `2` is the width and `3`
    * is the height. If the sprite map has padding, pass the values for the `x` padding
    * or `y` padding. If they are the same, just add one value.
    *
    * If the sprite image has no consistent tile size, `1` or no argument need be
    * passed for tile size.
    *
    * Entities that add the generated components are also given a component called `Sprite`.
    * 
    * @see Sprite
    */
    sprite: function (tile, tileh, url, map, paddingX, paddingY) {
        var spriteName, temp, x, y, w, h, img;

        //if no tile value, default to 1
        if (typeof tile === "string") {
            paddingY = paddingX;
            paddingX = map;
            map = tileh;
            url = tile;
            tile = 1;
            tileh = 1;
        }

        if (typeof tileh == "string") {
            paddingY = paddingX;
            paddingX = map;
            map = url;
            url = tileh;
            tileh = tile;
        }

        //if no paddingY, use paddingX
        if (!paddingY && paddingX) paddingY = paddingX;
        paddingX = parseInt(paddingX || 0, 10); //just incase
        paddingY = parseInt(paddingY || 0, 10);

        img = Crafty.asset(url);
        if (!img) {
            img = new Image();
            img.src = url;
            Crafty.asset(url, img);
            img.onload = function () {
                //all components with this img are now ready
                for (spriteName in map) {
                    Crafty(spriteName).each(function () {
                        this.ready = true;
                        this.trigger("Change");
                    });
                }
            };
        }

        for (spriteName in map) {
            if (!map.hasOwnProperty(spriteName)) continue;

            temp = map[spriteName];
            x = temp[0] * (tile + paddingX);
            y = temp[1] * (tileh + paddingY);
            w = temp[2] * tile || tile;
            h = temp[3] * tileh || tileh;

            //generates sprite components for each tile in the map
            Crafty.c(spriteName, {
                ready: false,
                __coord: [x, y, w, h],

                init: function () {
                    this.requires("Sprite");
                    this.__trim = [0, 0, 0, 0];
                    this.__image = url;
                    this.__coord = [this.__coord[0], this.__coord[1], this.__coord[2], this.__coord[3]];
                    this.__tile = tile;
                    this.__tileh = tileh;
                    this.__padding = [paddingX, paddingY];
                    this.img = img;

                    //draw now
                    if (this.img.complete && this.img.width > 0) {
                        this.ready = true;
                        this.trigger("Change");
                    }

                    //set the width and height to the sprite size
                    this.w = this.__coord[2];
                    this.h = this.__coord[3];
                }
            });
        }

        return this;
    },

    _events: {},

    /**@
    * #Crafty.addEvent
    * @category Events, Misc
    * @sign public this Crafty.addEvent(Object ctx, HTMLElement obj, String event, Function callback)
    * @param ctx - Context of the callback or the value of `this`
    * @param obj - Element to add the DOM event to
    * @param event - Event name to bind to
    * @param callback - Method to execute when triggered
    * 
    * Adds DOM level 3 events to elements. The arguments it accepts are the call
    * context (the value of `this`), the DOM element to attach the event to,
    * the event name (without `on` (`click` rather than `onclick`)) and
    * finally the callback method.
    *
    * If no element is passed, the default element will be `window.document`.
    *
    * Callbacks are passed with event data.
    * 
    * @see Crafty.removeEvent
    */
    addEvent: function (ctx, obj, type, callback) {
        if (arguments.length === 3) {
            callback = type;
            type = obj;
            obj = window.document;
        }

        //save anonymous function to be able to remove
        var afn = function (e) { 
                var e = e || window.event; 

                if (typeof callback === 'function') {
                    callback.call(ctx, e);
                }
            },
            id = ctx[0] || "";

        if (!this._events[id + obj + type + callback]) this._events[id + obj + type + callback] = afn;
        else return;

        if (obj.attachEvent) { //IE
            obj.attachEvent('on' + type, afn);
        } else { //Everyone else
            obj.addEventListener(type, afn, false);
        }
    },

    /**@
    * #Crafty.removeEvent
    * @category Events, Misc
    * @sign public this Crafty.removeEvent(Object ctx, HTMLElement obj, String event, Function callback)
    * @param ctx - Context of the callback or the value of `this`
    * @param obj - Element the event is on
    * @param event - Name of the event
    * @param callback - Method executed when triggered
    * 
    * Removes events attached by `Crafty.addEvent()`. All parameters must
    * be the same that were used to attach the event including a reference
    * to the callback method.
    * 
    * @see Crafty.addEvent
    */
    removeEvent: function (ctx, obj, type, callback) {
        if (arguments.length === 3) {
            callback = type;
            type = obj;
            obj = window.document;
        }

        //retrieve anonymous function
        var id = ctx[0] || "",
            afn = this._events[id + obj + type + callback];

        if (afn) {
            if (obj.detachEvent) {
                obj.detachEvent('on' + type, afn);
            } else obj.removeEventListener(type, afn, false);
            delete this._events[id + obj + type + callback];
        }
    },

    /**@
    * #Crafty.background
    * @category Graphics, Stage
    * @sign public void Crafty.background(String value)
    * @param style - Modify the background with a color or image
    * 
    * This method is essentially a shortcut for adding a background
    * style to the stage element.
    */
    background: function (style) {
        Crafty.stage.elem.style.background = style;
    },

    /**@
    * #Crafty.viewport
    * @category Stage
    * 
    * Viewport is essentially a 2D camera looking at the stage. Can be moved which
    * in turn will react just like a camera moving in that direction.
    */
    viewport: {
    /**@
        * #Crafty.viewport.clampToEntities
        * @comp Crafty.viewport
        * 
        * Decides if the viewport functions should clamp to game entities.
        * When set to `true` functions such as Crafty.viewport.mouselook() will not allow you to move the
        * viewport over areas of the game that has no entities.
        * For development it can be useful to set this to false.
        */
        clampToEntities: true,
        width: 0,
        height: 0,
        /**@
        * #Crafty.viewport.x
        * @comp Crafty.viewport
        * 
        * Will move the stage and therefore every visible entity along the `x`
        * axis in the opposite direction.
        *
        * When this value is set, it will shift the entire stage. This means that entity
        * positions are not exactly where they are on screen. To get the exact position,
        * simply add `Crafty.viewport.x` onto the entities `x` position.
        */
        _x: 0,
        /**@
        * #Crafty.viewport.y
        * @comp Crafty.viewport
        * 
        * Will move the stage and therefore every visible entity along the `y`
        * axis in the opposite direction.
        *
        * When this value is set, it will shift the entire stage. This means that entity
        * positions are not exactly where they are on screen. To get the exact position,
        * simply add `Crafty.viewport.y` onto the entities `y` position.
        */
        _y: 0,
		
		/**@
         * #Crafty.viewport.bounds
         * @comp Crafty.viewport
         *
		 * A rectangle which defines the bounds of the viewport. If this 
		 * variable is null, Crafty uses the bounding box of all the items
		 * on the stage.
         */
        bounds:null,

        /**@
         * #Crafty.viewport.scroll
         * @comp Crafty.viewport
         * @sign Crafty.viewport.scroll(String axis, Number v)
         * @param axis - 'x' or 'y'
         * @param v - The new absolute position on the axis
         *
         * Will move the viewport to the position given on the specified axis
         * 
         * @example 
         * Will move the camera 500 pixels right of its initial position, in effect
         * shifting everything in the viewport 500 pixels to the left.
         * 
         * ~~~
         * Crafty.viewport.scroll('_x', 500);
         * ~~~
         */
        scroll: function (axis, v) {
            v = Math.floor(v);
            var change = v - this[axis], //change in direction
                context = Crafty.canvas.context,
                style = Crafty.stage.inner.style,
                canvas;

            //update viewport and DOM scroll
            this[axis] = v;
			if (context) {
				if (axis == '_x') {
					context.translate(change, 0);
				} else {
					context.translate(0, change);
				}
				Crafty.DrawManager.drawAll();
			}
            style[axis == '_x' ? "left" : "top"] = v + "px";
        },

        rect: function () {
            return { _x: -this._x, _y: -this._y, _w: this.width, _h: this.height };
        },

        /**@
         * #Crafty.viewport.pan
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.pan(String axis, Number v, Number time)
         * @param String axis - 'x' or 'y'. The axis to move the camera on
         * @param Number v - the distance to move the camera by
         * @param Number time - The duration in frames for the entire camera movement
         *
         * Pans the camera a given number of pixels over a given number of frames
         */
        pan: (function () {
            var tweens = {}, i, bound = false;

            function enterFrame(e) {
                var l = 0;
                for (i in tweens) {
                    var prop = tweens[i];
                    if (prop.remTime > 0) {
                        prop.current += prop.diff;
                        prop.remTime--;
                        Crafty.viewport[i] = Math.floor(prop.current);
                        l++;
                    }
                    else {
                        delete tweens[i];
                    }
                }
                if (l) Crafty.viewport._clamp();
            }

            return function (axis, v, time) {
                Crafty.viewport.follow();
                if (axis == 'reset') {
                    for (i in tweens) {
                        tweens[i].remTime = 0;
                    }
                    return;
                }
                if (time == 0) time = 1;
                tweens[axis] = {
                    diff: -v / time,
                    current: Crafty.viewport[axis],
                    remTime: time
                };
                if (!bound) {
                    Crafty.bind("EnterFrame", enterFrame);
                    bound = true;
                }
            }
        })(),

        /**@
         * #Crafty.viewport.follow
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.follow(Object target, Number offsetx, Number offsety)
         * @param Object target - An entity with the 2D component
         * @param Number offsetx - Follow target should be offsetx pixels away from center
         * @param Number offsety - Positive puts target to the right of center
         *
         * Follows a given entity with the 2D component. If following target will take a portion of
         * the viewport out of bounds of the world, following will stop until the target moves away.
         * 
         * @example
         * ~~~
         * var ent = Crafty.e('2D, DOM').attr({w: 100, h: 100:});
         * Crafty.viewport.follow(ent, 0, 0);
         * ~~~
         */
        follow: (function () {
            var oldTarget, offx, offy;

            function change() {
                Crafty.viewport.scroll('_x', -(this.x + (this.w / 2) - (Crafty.viewport.width / 2) - offx));
                Crafty.viewport.scroll('_y', -(this.y + (this.h / 2) - (Crafty.viewport.height / 2) - offy));
                Crafty.viewport._clamp();
            }

            return function (target, offsetx, offsety) {
                if (oldTarget)
                    oldTarget.unbind('Change', change);
                if (!target || !target.has('2D'))
                    return;
                Crafty.viewport.pan('reset');

                oldTarget = target;
                offx = (typeof offsetx != 'undefined') ? offsetx : 0;
                offy = (typeof offsety != 'undefined') ? offsety : 0;

                target.bind('Change', change);
                change.call(target);
            }
        })(),

        /**@
         * #Crafty.viewport.centerOn
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.centerOn(Object target, Number time)
         * @param Object target - An entity with the 2D component
         * @param Number time - The number of frames to perform the centering over
         *
         * Centers the viewport on the given entity
         */
        centerOn: function (targ, time) {
            var x = targ.x,
                    y = targ.y,
                    mid_x = targ.w / 2,
                    mid_y = targ.h / 2,
                    cent_x = Crafty.viewport.width / 2,
                    cent_y = Crafty.viewport.height / 2,
                    new_x = x + mid_x - cent_x,
                    new_y = y + mid_y - cent_y;

            Crafty.viewport.pan('reset');
            Crafty.viewport.pan('x', new_x, time);
            Crafty.viewport.pan('y', new_y, time);
        },
        /**@
        * #Crafty.viewport._zoom
        * @comp Crafty.viewport
        * 
        * This value keeps an amount of viewport zoom, required for calculating mouse position at entity
        */
        _zoom : 1,

        /**@
         * #Crafty.viewport.zoom
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.zoom(Number amt, Number cent_x, Number cent_y, Number time)
         * @param Number amt - amount to zoom in on the target by (eg. 2, 4, 0.5)
         * @param Number cent_x - the center to zoom on
         * @param Number cent_y - the center to zoom on
         * @param Number time - the duration in frames of the entire zoom operation
         *
         * Zooms the camera in on a given point. amt > 1 will bring the camera closer to the subject
         * amt < 1 will bring it farther away. amt = 0 will do nothing.
         * Zooming is multiplicative. To reset the zoom amount, pass 0.
         */
        zoom: (function () {
            var zoom = 1,
                zoom_tick = 0,
                dur = 0,
                prop = Crafty.support.prefix + "Transform",
                bound = false,
                act = {},
                prct = {};
            // what's going on:
            // 1. Get the original point as a percentage of the stage
            // 2. Scale the stage
            // 3. Get the new size of the stage
            // 4. Get the absolute position of our point using previous percentage
            // 4. Offset inner by that much

            function enterFrame() {
                if (dur > 0) {
					if (isFinite(Crafty.viewport._zoom)) zoom = Crafty.viewport._zoom;
                    var old = {
                        width: act.width * zoom,
                        height: act.height * zoom
                    };
                    zoom += zoom_tick;
                    Crafty.viewport._zoom = zoom;
                    var new_s = {
                        width: act.width * zoom,
                        height: act.height * zoom
                    },
                    diff = {
                        width: new_s.width - old.width,
                        height: new_s.height - old.height
                    };
                    Crafty.stage.inner.style[prop] = 'scale(' + zoom + ',' + zoom + ')';
                    if (Crafty.canvas._canvas) {
						var czoom = zoom / (zoom - zoom_tick);
						Crafty.canvas.context.scale(czoom, czoom);
                        Crafty.DrawManager.drawAll();
                    }
                    Crafty.viewport.x -= diff.width * prct.width;
                    Crafty.viewport.y -= diff.height * prct.height;
                    dur--;
                }
            }

            return function (amt, cent_x, cent_y, time) {
                var bounds = this.bounds || Crafty.map.boundaries(),
                    final_zoom = amt ? zoom * amt : 1;
				if (!amt) {	// we're resetting to defaults
					zoom = 1;
					this._zoom = 1;
				}

                act.width = bounds.max.x - bounds.min.x;
                act.height = bounds.max.y - bounds.min.y;

                prct.width = cent_x / act.width;
                prct.height = cent_y / act.height;

                if (time == 0) time = 1;
                zoom_tick = (final_zoom - zoom) / time;
                dur = time;

                Crafty.viewport.pan('reset');
                if (!bound) {
                    Crafty.bind('EnterFrame', enterFrame);
                    bound = true;
                }
            }
        })(),
        /**@
         * #Crafty.viewport.scale
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.scale(Number amt)
         * @param Number amt - amount to zoom/scale in on the element on the viewport by (eg. 2, 4, 0.5)
         *
         * Zooms/scale the camera. amt > 1 increase all entities on stage 
         * amt < 1 will reduce all entities on stage. amt = 0 will reset the zoom/scale.
         * Zooming/scaling is multiplicative. To reset the zoom/scale amount, pass 0.
         *
         * @example
         * ~~~
         * Crafty.viewport.scale(2); //to see effect add some entities on stage.
         * ~~~
         */
        scale: (function () {
            var prop = Crafty.support.prefix + "Transform",
                act = {};
            return function (amt) {
                var bounds = this.bounds || Crafty.map.boundaries(),
                    final_zoom = amt ? this._zoom * amt : 1,
					czoom = final_zoom / this._zoom;

                this._zoom = final_zoom;
                act.width = bounds.max.x - bounds.min.x;
                act.height = bounds.max.y - bounds.min.y;
                var new_s = {
                    width: act.width * final_zoom,
                    height: act.height * final_zoom
                }
                Crafty.viewport.pan('reset');
                Crafty.stage.inner.style['transform'] = 
				Crafty.stage.inner.style[prop] = 'scale(' + this._zoom + ',' + this._zoom + ')';

                if (Crafty.canvas._canvas) {
                    Crafty.canvas.context.scale(czoom, czoom);
                    Crafty.DrawManager.drawAll();
                }
                //Crafty.viewport.width = new_s.width;
                //Crafty.viewport.height = new_s.height;
            }
        })(),
        /**@
         * #Crafty.viewport.mouselook
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.mouselook(Boolean active)
         * @param Boolean active - Activate or deactivate mouselook
         *
         * Toggle mouselook on the current viewport.
         * Simply call this function and the user will be able to
         * drag the viewport around.
         */
        mouselook: (function () {
            var active = false,
                dragging = false,
                lastMouse = {}
            old = {};


            return function (op, arg) {
                if (typeof op == 'boolean') {
                    active = op;
                    if (active) {
                        Crafty.mouseObjs++;
                    }
                    else {
                        Crafty.mouseObjs = Math.max(0, Crafty.mouseObjs - 1);
                    }
                    return;
                }
                if (!active) return;
                switch (op) {
                    case 'move':
                    case 'drag':
                        if (!dragging) return;
                        diff = {
                            x: arg.clientX - lastMouse.x,
                            y: arg.clientY - lastMouse.y
                        };

                        Crafty.viewport.x += diff.x;
                        Crafty.viewport.y += diff.y;
                        Crafty.viewport._clamp(); 
                    case 'start':
                        lastMouse.x = arg.clientX;
                        lastMouse.y = arg.clientY;
                        dragging = true;
                        break;
                    case 'stop':
                        dragging = false;
                        break;
                }
            };
        })(),
        _clamp: function () {
            // clamps the viewport to the viewable area
            // under no circumstances should the viewport see something outside the boundary of the 'world'
            if (!this.clampToEntities) return;
            var bound = this.bounds || Crafty.map.boundaries();
			bound.max.x *= this._zoom;
			bound.min.x *= this._zoom;
			bound.max.y *= this._zoom;
			bound.min.y *= this._zoom;
            if (bound.max.x - bound.min.x > Crafty.viewport.width) {
                bound.max.x -= Crafty.viewport.width;

                if (Crafty.viewport.x < -bound.max.x) {
                    Crafty.viewport.x = -bound.max.x;
                }
                else if (Crafty.viewport.x > -bound.min.x) {
                    Crafty.viewport.x = -bound.min.x;
                }
            }
            else {
                Crafty.viewport.x = -1 * (bound.min.x + (bound.max.x - bound.min.x) / 2 - Crafty.viewport.width / 2);
            }
            if (bound.max.y - bound.min.y > Crafty.viewport.height) {
                bound.max.y -= Crafty.viewport.height;

                if (Crafty.viewport.y < -bound.max.y) {
                    Crafty.viewport.y = -bound.max.y;
                }
                else if (Crafty.viewport.y > -bound.min.y) {
                    Crafty.viewport.y = -bound.min.y;
                }
            }
            else {
                Crafty.viewport.y = -1 * (bound.min.y + (bound.max.y - bound.min.y) / 2 - Crafty.viewport.height / 2);
            }
        },

        /**@
         * #Crafty.viewport.init
         * @comp Crafty.viewport
         * @sign public void Crafty.viewport.init([Number width, Number height])
         * @param width - Width of the viewport
         * @param height - Height of the viewport
         *
         * Initialize the viewport. If the arguments 'width' or 'height' are missing, or Crafty.mobile is true, use Crafty.DOM.window.width and Crafty.DOM.window.height (full screen model).
         * Create a div with id `cr-stage`, if there is not already an HTMLElement with id `cr-stage` (by `Crafty.viewport.init`).
         *
         * @see Crafty.device, Crafty.DOM, Crafty.stage
         */
        init: function (w, h) {
            Crafty.DOM.window.init();

            //fullscreen if mobile or not specified
            this.width = (!w || Crafty.mobile) ? Crafty.DOM.window.width : w;
            this.height = (!h || Crafty.mobile) ? Crafty.DOM.window.height : h;

            //check if stage exists
            var crstage = document.getElementById("cr-stage");

            /**@
             * #Crafty.stage
             * @category Core
             * The stage where all the DOM entities will be placed.
             */

            /**@
             * #Crafty.stage.elem
             * @comp Crafty.stage
             * The `#cr-stage` div element.
             */

            /**@
             * #Crafty.stage.inner
             * @comp Crafty.stage
             * `Crafty.stage.inner` is a div inside the `#cr-stage` div that holds all DOM entities.
             * If you use canvas, a `canvas` element is created at the same level in the dom
             * as the the `Crafty.stage.inner` div. So the hierarchy in the DOM is
             * 
             * `Crafty.stage.elem`
             * <!-- not sure how to do indentation in the document-->
             *
             *     - `Crafty.stage.inner` (a div HTMLElement)
             *
             *     - `Crafty.canvas._canvas` (a canvas HTMLElement) 
             */

            //create stage div to contain everything
            Crafty.stage = {
                x: 0,
                y: 0,
                fullscreen: false,
                elem: (crstage ? crstage : document.createElement("div")),
                inner: document.createElement("div")
            };

            //fullscreen, stop scrollbars
            if ((!w && !h) || Crafty.mobile) {
                document.body.style.overflow = "hidden";
                Crafty.stage.fullscreen = true;
            }

            Crafty.addEvent(this, window, "resize", Crafty.viewport.reload);

            Crafty.addEvent(this, window, "blur", function () {
                if (Crafty.settings.get("autoPause")) {
                    if(!Crafty._paused) Crafty.pause();
                }
            });
            Crafty.addEvent(this, window, "focus", function () {
                if (Crafty._paused && Crafty.settings.get("autoPause")) {
                    Crafty.pause();
                }
            });

            //make the stage unselectable
            Crafty.settings.register("stageSelectable", function (v) {
                Crafty.stage.elem.onselectstart = v ? function () { return true; } : function () { return false; };
            });
            Crafty.settings.modify("stageSelectable", false);

            //make the stage have no context menu
            Crafty.settings.register("stageContextMenu", function (v) {
                Crafty.stage.elem.oncontextmenu = v ? function () { return true; } : function () { return false; };
            });
            Crafty.settings.modify("stageContextMenu", false);

            Crafty.settings.register("autoPause", function (){ });
            Crafty.settings.modify("autoPause", false);

            //add to the body and give it an ID if not exists
            if (!crstage) {
                document.body.appendChild(Crafty.stage.elem);
                Crafty.stage.elem.id = "cr-stage";
            }

            var elem = Crafty.stage.elem.style,
                offset;

            Crafty.stage.elem.appendChild(Crafty.stage.inner);
            Crafty.stage.inner.style.position = "absolute";
            Crafty.stage.inner.style.zIndex = "1";

            //css style
            elem.width = this.width + "px";
            elem.height = this.height + "px";
            elem.overflow = "hidden";

            if (Crafty.mobile) {
                elem.position = "absolute";
                elem.left = "0px";
                elem.top = "0px";

                // remove default gray highlighting after touch
                if (typeof elem.webkitTapHighlightColor != undefined) {
                    elem.webkitTapHighlightColor = "rgba(0,0,0,0)";
                }

                var meta = document.createElement("meta"),
                    head = document.getElementsByTagName("HEAD")[0];

                //stop mobile zooming and scrolling
                meta.setAttribute("name", "viewport");
                meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
                head.appendChild(meta);

                //hide the address bar
                meta = document.createElement("meta");
                meta.setAttribute("name", "apple-mobile-web-app-capable");
                meta.setAttribute("content", "yes");
                head.appendChild(meta);
                setTimeout(function () { window.scrollTo(0, 1); }, 0);

                Crafty.addEvent(this, window, "touchmove", function (e) {
                    e.preventDefault();
                });

                Crafty.stage.x = 0;
                Crafty.stage.y = 0;

            } else {
                elem.position = "relative";
                //find out the offset position of the stage
                offset = Crafty.DOM.inner(Crafty.stage.elem);
                Crafty.stage.x = offset.x;
                Crafty.stage.y = offset.y;
            }

            if (Crafty.support.setter) {
                //define getters and setters to scroll the viewport
                this.__defineSetter__('x', function (v) { this.scroll('_x', v); });
                this.__defineSetter__('y', function (v) { this.scroll('_y', v); });
                this.__defineGetter__('x', function () { return this._x; });
                this.__defineGetter__('y', function () { return this._y; });
                //IE9
            } else if (Crafty.support.defineProperty) {
                Object.defineProperty(this, 'x', { set: function (v) { this.scroll('_x', v); }, get: function () { return this._x; } });
                Object.defineProperty(this, 'y', { set: function (v) { this.scroll('_y', v); }, get: function () { return this._y; } });
            } else {
                //create empty entity waiting for enterframe
                this.x = this._x;
                this.y = this._y;
                Crafty.e("viewport");
            }
        },

        /**@
         * #Crafty.viewport.reload
         * @comp Crafty.stage
         * 
         * @sign public Crafty.viewport.reload()
         * 
         * Recalculate and reload stage width, height and position.
         * Useful when browser return wrong results on init (like safari on Ipad2).
         * 
         */
        reload : function () {
            Crafty.DOM.window.init();
            var w = Crafty.DOM.window.width,
                h = Crafty.DOM.window.height,
                offset;


            if (Crafty.stage.fullscreen) {
                this.width = w;
                this.height = h;
                Crafty.stage.elem.style.width = w + "px";
                Crafty.stage.elem.style.height = h + "px";

                if (Crafty.canvas._canvas) {
                    Crafty.canvas._canvas.width = w;
                    Crafty.canvas._canvas.height = h;
                    Crafty.DrawManager.drawAll();
                }
            }

            offset = Crafty.DOM.inner(Crafty.stage.elem);
            Crafty.stage.x = offset.x;
            Crafty.stage.y = offset.y;
        },
		
		/**@
		 * #Crafty.viewport.reset
		 * @comp Crafty.stage
		 *
		 * @sign public Crafty.viewport.reset()
		 *
		 * Resets the viewport to starting values
		 * Called when scene() is run.
		 */
		reset: function () {
			Crafty.viewport.pan('reset');
			Crafty.viewport.follow();
			Crafty.viewport.mouselook('stop');
			Crafty.viewport.scale();
		}
    },

    /**@
    * #Crafty.keys
    * @category Input
    * Object of key names and the corresponding key code.
    * 
    * ~~~
    * BACKSPACE: 8,
    * TAB: 9,
    * ENTER: 13,
    * PAUSE: 19,
    * CAPS: 20,
    * ESC: 27,
    * SPACE: 32,
    * PAGE_UP: 33,
    * PAGE_DOWN: 34,
    * END: 35,
    * HOME: 36,
    * LEFT_ARROW: 37,
    * UP_ARROW: 38,
    * RIGHT_ARROW: 39,
    * DOWN_ARROW: 40,
    * INSERT: 45,
    * DELETE: 46,
    * 0: 48,
    * 1: 49,
    * 2: 50,
    * 3: 51,
    * 4: 52,
    * 5: 53,
    * 6: 54,
    * 7: 55,
    * 8: 56,
    * 9: 57,
    * A: 65,
    * B: 66,
    * C: 67,
    * D: 68,
    * E: 69,
    * F: 70,
    * G: 71,
    * H: 72,
    * I: 73,
    * J: 74,
    * K: 75,
    * L: 76,
    * M: 77,
    * N: 78,
    * O: 79,
    * P: 80,
    * Q: 81,
    * R: 82,
    * S: 83,
    * T: 84,
    * U: 85,
    * V: 86,
    * W: 87,
    * X: 88,
    * Y: 89,
    * Z: 90,
    * NUMPAD_0: 96,
    * NUMPAD_1: 97,
    * NUMPAD_2: 98,
    * NUMPAD_3: 99,
    * NUMPAD_4: 100,
    * NUMPAD_5: 101,
    * NUMPAD_6: 102,
    * NUMPAD_7: 103,
    * NUMPAD_8: 104,
    * NUMPAD_9: 105,
    * MULTIPLY: 106,
    * ADD: 107,
    * SUBSTRACT: 109,
    * DECIMAL: 110,
    * DIVIDE: 111,
    * F1: 112,
    * F2: 113,
    * F3: 114,
    * F4: 115,
    * F5: 116,
    * F6: 117,
    * F7: 118,
    * F8: 119,
    * F9: 120,
    * F10: 121,
    * F11: 122,
    * F12: 123,
    * SHIFT: 16,
    * CTRL: 17,
    * ALT: 18,
    * PLUS: 187,
    * COMMA: 188,
    * MINUS: 189,
    * PERIOD: 190,
    * PULT_UP: 29460,
    * PULT_DOWN: 29461,
    * PULT_LEFT: 4,
    * PULT_RIGHT': 5
    * ~~~
    */
    keys: {
        'BACKSPACE': 8,
        'TAB': 9,
        'ENTER': 13,
        'PAUSE': 19,
        'CAPS': 20,
        'ESC': 27,
        'SPACE': 32,
        'PAGE_UP': 33,
        'PAGE_DOWN': 34,
        'END': 35,
        'HOME': 36,
        'LEFT_ARROW': 37,
        'UP_ARROW': 38,
        'RIGHT_ARROW': 39,
        'DOWN_ARROW': 40,
        'INSERT': 45,
        'DELETE': 46,
        '0': 48,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        'A': 65,
        'B': 66,
        'C': 67,
        'D': 68,
        'E': 69,
        'F': 70,
        'G': 71,
        'H': 72,
        'I': 73,
        'J': 74,
        'K': 75,
        'L': 76,
        'M': 77,
        'N': 78,
        'O': 79,
        'P': 80,
        'Q': 81,
        'R': 82,
        'S': 83,
        'T': 84,
        'U': 85,
        'V': 86,
        'W': 87,
        'X': 88,
        'Y': 89,
        'Z': 90,
        'NUMPAD_0': 96,
        'NUMPAD_1': 97,
        'NUMPAD_2': 98,
        'NUMPAD_3': 99,
        'NUMPAD_4': 100,
        'NUMPAD_5': 101,
        'NUMPAD_6': 102,
        'NUMPAD_7': 103,
        'NUMPAD_8': 104,
        'NUMPAD_9': 105,
        'MULTIPLY': 106,
        'ADD': 107,
        'SUBSTRACT': 109,
        'DECIMAL': 110,
        'DIVIDE': 111,
        'F1': 112,
        'F2': 113,
        'F3': 114,
        'F4': 115,
        'F5': 116,
        'F6': 117,
        'F7': 118,
        'F8': 119,
        'F9': 120,
        'F10': 121,
        'F11': 122,
        'F12': 123,
        'SHIFT': 16,
        'CTRL': 17,
        'ALT': 18,
        'PLUS': 187,
        'COMMA': 188,
        'MINUS': 189,
        'PERIOD': 190,
        'PULT_UP': 29460,
        'PULT_DOWN': 29461,
        'PULT_LEFT': 4,
        'PULT_RIGHT': 5

    },

    /**@
    * #Crafty.mouseButtons
    * @category Input
    * Object of mouseButton names and the corresponding button ID.
    * In all mouseEvents we add the e.mouseButton property with a value normalized to match e.button of modern webkit
    * 
    * ~~~
    * LEFT: 0,
    * MIDDLE: 1,
    * RIGHT: 2
    * ~~~
    */
    mouseButtons: {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
    }
});



/**
* Entity fixes the lack of setter support
*/
Crafty.c("viewport", {
    init: function () {
        this.bind("EnterFrame", function () {
            if (Crafty.viewport._x !== Crafty.viewport.x) {
                Crafty.viewport.scroll('_x', Crafty.viewport.x);
            }

            if (Crafty.viewport._y !== Crafty.viewport.y) {
                Crafty.viewport.scroll('_y', Crafty.viewport.y);
            }
        });
    }
});

Crafty.extend({
    /**@
    * #Crafty.device
    * @category Misc
    */
    device : {
        _deviceOrientationCallback : false,
        _deviceMotionCallback : false,

        /**
        * The HTML5 DeviceOrientation event returns three pieces of data:
        *  * alpha the direction the device is facing according to the compass
        *  * beta the angle in degrees the device is tilted front-to-back
        *  * gamma the angle in degrees the device is tilted left-to-right.
        *  * The angles values increase as you tilt the device to the right or towards you.
        *
        * Since Firefox uses the MozOrientationEvent which returns similar data but
        * using different parameters and a different measurement system, we want to
        * normalize that before we pass it to our _deviceOrientationCallback function.
        *
        * @param eventData HTML5 DeviceOrientation event
        */
        _normalizeDeviceOrientation : function(eventData) {
            var data;
            if (window.DeviceOrientationEvent) {
                data = {
                    // gamma is the left-to-right tilt in degrees, where right is positive
                    'tiltLR'    :    eventData.gamma,
                    // beta is the front-to-back tilt in degrees, where front is positive
                    'tiltFB'    :     eventData.beta,
                    // alpha is the compass direction the device is facing in degrees
                    'dir'         :     eventData.alpha,
                    // deviceorientation does not provide this data
                    'motUD'     :     null
                }
            } else if (window.OrientationEvent) {
                data = {
                    // x is the left-to-right tilt from -1 to +1, so we need to convert to degrees
                    'tiltLR'    :    eventData.x * 90,
                    // y is the front-to-back tilt from -1 to +1, so we need to convert to degrees
                    // We also need to invert the value so tilting the device towards us (forward)
                    // results in a positive value.
                    'tiltFB'    :     eventData.y * -90,
                    // MozOrientation does not provide this data
                    'dir'         :     null,
                    // z is the vertical acceleration of the device
                    'motUD'     :     eventData.z
                }
            }

            Crafty.device._deviceOrientationCallback(data);
        },

        /**
        * @param eventData HTML5 DeviceMotion event
        */
        _normalizeDeviceMotion : function(eventData) {
            var acceleration    = eventData.accelerationIncludingGravity,
                facingUp        = (acceleration.z > 0) ? +1 : -1;

            var data = {
                // Grab the acceleration including gravity from the results
                'acceleration' : acceleration,
                'rawAcceleration' : "["+  Math.round(acceleration.x) +", "+Math.round(acceleration.y) + ", " + Math.round(acceleration.z) + "]",
                // Z is the acceleration in the Z axis, and if the device is facing up or down
                'facingUp' : facingUp,
                // Convert the value from acceleration to degrees acceleration.x|y is the
                // acceleration according to gravity, we'll assume we're on Earth and divide
                // by 9.81 (earth gravity) to get a percentage value, and then multiply that
                // by 90 to convert to degrees.
                'tiltLR' : Math.round(((acceleration.x) / 9.81) * -90),
                'tiltFB' : Math.round(((acceleration.y + 9.81) / 9.81) * 90 * facingUp)
            };

            Crafty.device._deviceMotionCallback(data);
        },

        /**@
        * #Crafty.device.deviceOrientation
        * @comp Crafty.device
        * @sign public Crafty.device.deviceOrientation(Function callback)
        * @param callback - Callback method executed once as soon as device orientation is change
        *
        * Do something with normalized device orientation data:
        * ~~~
        * {
        *   'tiltLR'    :   'gamma the angle in degrees the device is tilted left-to-right.',
        *   'tiltFB'    :   'beta the angle in degrees the device is tilted front-to-back',
        *   'dir'       :   'alpha the direction the device is facing according to the compass',
        *   'motUD'     :   'The angles values increase as you tilt the device to the right or towards you.'
        * }
        * ~~~
        *
        * @example
        * ~~~
        * // Get DeviceOrientation event normalized data.
        * Crafty.device.deviceOrientation(function(data){
        *     console.log('data.tiltLR : '+Math.round(data.tiltLR)+', data.tiltFB : '+Math.round(data.tiltFB)+', data.dir : '+Math.round(data.dir)+', data.motUD : '+data.motUD+'');
        * });
        * ~~~
        *
        * See browser support at http://caniuse.com/#search=device orientation.
        */
        deviceOrientation : function(func) {
            this._deviceOrientationCallback = func;
            if (Crafty.support.deviceorientation) {
                if (window.DeviceOrientationEvent) {
                    // Listen for the deviceorientation event and handle DeviceOrientationEvent object
                    Crafty.addEvent(this, window, 'deviceorientation', this._normalizeDeviceOrientation);
                } else if (window.OrientationEvent) {
                    // Listen for the MozOrientation event and handle OrientationData object
                    Crafty.addEvent(this, window, 'MozOrientation', this._normalizeDeviceOrientation)
                }
            }
        },

        /**@
        * #Crafty.device.deviceMotion
        * @comp Crafty.device
        * @sign public Crafty.device.deviceMotion(Function callback)
        * @param callback - Callback method executed once as soon as device motion is change
        *
        * Do something with normalized device motion data:
        * ~~~
        * {
        *     'acceleration' : ' Grab the acceleration including gravity from the results',
        *     'rawAcceleration' : 'Display the raw acceleration data',
        *     'facingUp' : 'Z is the acceleration in the Z axis, and if the device is facing up or down',
        *     'tiltLR' : 'Convert the value from acceleration to degrees. acceleration.x is the acceleration according to gravity, we'll assume we're on Earth and divide by 9.81 (earth gravity) to get a percentage value, and then multiply that by 90 to convert to degrees.',
        *     'tiltFB' : 'Convert the value from acceleration to degrees.'
        * }
        * ~~~
        *
        * @example
        * ~~~
        * // Get DeviceMotion event normalized data.
        * Crafty.device.deviceMotion(function(data){
        *     console.log('data.moAccel : '+data.rawAcceleration+', data.moCalcTiltLR : '+Math.round(data.tiltLR)+', data.moCalcTiltFB : '+Math.round(data.tiltFB)+'');
        * });
        * ~~~
        *
        * See browser support at http://caniuse.com/#search=motion.
        */
        deviceMotion : function(func) {
            this._deviceMotionCallback = func;
            if (Crafty.support.devicemotion) {
                if (window.DeviceMotionEvent) {
                    // Listen for the devicemotion event and handle DeviceMotionEvent object
                    Crafty.addEvent(this, window, 'devicemotion', this._normalizeDeviceMotion);
                }
            }
        }
    }
});

/**@
* #Sprite
* @category Graphics
* @trigger Change - when the sprites change
* Component for using tiles in a sprite map.
*/
Crafty.c("Sprite", {
	__image: '',
	/*
	* #.__tile
	* @comp Sprite
	*
	* Horizontal sprite tile size.
	*/
	__tile: 0,
	/*
	* #.__tileh
	* @comp Sprite
	*
	* Vertical sprite tile size.
	*/
	__tileh: 0,
	__padding: null,
	__trim: null,
	img: null,
	//ready is changed to true in Crafty.sprite
	ready: false,

	init: function () {
		this.__trim = [0, 0, 0, 0];

		var draw = function (e) {
			var co = e.co,
				pos = e.pos,
				context = e.ctx;

			if (e.type === "canvas") {
				//draw the image on the canvas element
				context.drawImage(this.img, //image element
								 co.x, //x position on sprite
								 co.y, //y position on sprite
								 co.w, //width on sprite
								 co.h, //height on sprite
								 pos._x, //x position on canvas
								 pos._y, //y position on canvas
								 pos._w, //width on canvas
								 pos._h //height on canvas
				);
			} else if (e.type === "DOM") {
				this._element.style.background = "url('" + this.__image + "') no-repeat -" + co.x + "px -" + co.y + "px";
				this._element.style.backgroundSize = 'cover';
			}
		};

		this.bind("Draw", draw).bind("RemoveComponent", function (id) {
			if (id === "Sprite") this.unbind("Draw", draw);
		});
	},

	/**@
	* #.sprite
	* @comp Sprite
	* @sign public this .sprite(Number x, Number y, Number w, Number h)
	* @param x - X cell position
	* @param y - Y cell position
	* @param w - Width in cells
	* @param h - Height in cells
	* 
	* Uses a new location on the sprite map as its sprite.
	*
	* Values should be in tiles or cells (not pixels).
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Sprite")
	* 	.sprite(0, 0, 2, 2);
	* ~~~
	*/

	/**@
	* #.__coord
	* @comp Sprite
	*
	* The coordinate of the slide within the sprite in the format of [x, y, w, h].
	*/
	sprite: function (x, y, w, h) {
		this.__coord = [x * this.__tile + this.__padding[0] + this.__trim[0],
						y * this.__tileh + this.__padding[1] + this.__trim[1],
						this.__trim[2] || w * this.__tile || this.__tile,
						this.__trim[3] || h * this.__tileh || this.__tileh];

		this.trigger("Change");
		return this;
	},

	/**@
	* #.crop
	* @comp Sprite
	* @sign public this .crop(Number x, Number y, Number w, Number h)
	* @param x - Offset x position
	* @param y - Offset y position
	* @param w - New width
	* @param h - New height
	* 
	* If the entity needs to be smaller than the tile size, use this method to crop it.
	*
	* The values should be in pixels rather than tiles.
	*
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Sprite")
	* 	.crop(40, 40, 22, 23);
	* ~~~
	*/
	crop: function (x, y, w, h) {
		var old = this._mbr || this.pos();
		this.__trim = [];
		this.__trim[0] = x;
		this.__trim[1] = y;
		this.__trim[2] = w;
		this.__trim[3] = h;

		this.__coord[0] += x;
		this.__coord[1] += y;
		this.__coord[2] = w;
		this.__coord[3] = h;
		this._w = w;
		this._h = h;

		this.trigger("Change", old);
		return this;
	}
});

/**@
* #Canvas
* @category Graphics
* @trigger Draw - when the entity is ready to be drawn to the stage - {type: "canvas", pos, co, ctx}
* @trigger NoCanvas - if the browser does not support canvas
* 
* When this component is added to an entity it will be drawn to the global canvas element. The canvas element (and hence all Canvas entities) is always rendered below any DOM entities. 
* 
* Crafty.canvas.init() will be automatically called if it is not called already to initialize the canvas element.
*
* Create a canvas entity like this
* ~~~
* var myEntity = Crafty.e("2D, Canvas, Color").color("green")
*                                             .attr({x: 13, y: 37, w: 42, h: 42});
*~~~
*/
Crafty.c("Canvas", {

	init: function () {
		if (!Crafty.canvas.context) {
			Crafty.canvas.init();
		}

		//increment the amount of canvas objs
		Crafty.DrawManager.total2D++;

		this.bind("Change", function (e) {
			//if within screen, add to list
			if (this._changed === false) {
				this._changed = Crafty.DrawManager.add(e || this, this);
			} else {
				if (e) this._changed = Crafty.DrawManager.add(e, this);
			}
		});

		this.bind("Remove", function () {
			Crafty.DrawManager.total2D--;
			Crafty.DrawManager.add(this, this);
		});
	},

	/**@
	* #.draw
	* @comp Canvas
	* @sign public this .draw([[Context ctx, ]Number x, Number y, Number w, Number h])
	* @param ctx - Canvas 2D context if drawing on another canvas is required
	* @param x - X offset for drawing a segment
	* @param y - Y offset for drawing a segment
	* @param w - Width of the segment to draw
	* @param h - Height of the segment to draw
	* 
	* Method to draw the entity on the canvas element. Can pass rect values for redrawing a segment of the entity.
	*/
	draw: function (ctx, x, y, w, h) {
		if (!this.ready) return;
		if (arguments.length === 4) {
			h = w;
			w = y;
			y = x;
			x = ctx;
			ctx = Crafty.canvas.context;
		}

		var pos = { //inlined pos() function, for speed
			_x: (this._x + (x || 0)),
			_y: (this._y + (y || 0)),
			_w: (w || this._w),
			_h: (h || this._h)
		},
			context = ctx || Crafty.canvas.context,
			coord = this.__coord || [0, 0, 0, 0],
			co = {
			x: coord[0] + (x || 0),
			y: coord[1] + (y || 0),
			w: w || coord[2],
			h: h || coord[3]
		};

		if (this._mbr) {
			context.save();

			context.translate(this._origin.x + this._x, this._origin.y + this._y);
			pos._x = -this._origin.x;
			pos._y = -this._origin.y;

			context.rotate((this._rotation % 360) * (Math.PI / 180));
		}
		
		if(this._flipX || this._flipY) {
			context.save();
			context.scale((this._flipX ? -1 : 1), (this._flipY ? -1 : 1));
			if(this._flipX) {
				pos._x = -(pos._x + pos._w)
			}
			if(this._flipY) {
				pos._y = -(pos._y + pos._h)
			}
		}
		
		//draw with alpha
		if (this._alpha < 1.0) {
			var globalpha = context.globalAlpha;
			context.globalAlpha = this._alpha;
		}

		this.trigger("Draw", { type: "canvas", pos: pos, co: co, ctx: context });

		if (this._mbr || (this._flipX || this._flipY)) {
			context.restore();
		}
		if (globalpha) {
			context.globalAlpha = globalpha;
		}
		return this;
	}
});

/**@
* #Crafty.canvas
* @category Graphics
* 
* Collection of methods to draw on canvas.
*/
Crafty.extend({
	canvas: {
	/**@
		* #Crafty.canvas.context
		* @comp Crafty.canvas
		* 
		* This will return the 2D context of the main canvas element.
		* The value returned from `Crafty.canvas._canvas.getContext('2d')`.
		*/
		context: null,
		/**@
		* #Crafty.canvas._canvas
		* @comp Crafty.canvas
		* 
		* Main Canvas element
		*/

		/**@
		* #Crafty.canvas.init
		* @comp Crafty.canvas
		* @sign public void Crafty.canvas.init(void)
        * @trigger NoCanvas - triggered if `Crafty.support.canvas` is false
        * 
		* Creates a `canvas` element inside `Crafty.stage.elem`. Must be called
		* before any entities with the Canvas component can be drawn.
		*
		* This method will automatically be called if no `Crafty.canvas.context` is
		* found.
		*/
		init: function () {
			//check if canvas is supported
			if (!Crafty.support.canvas) {
				Crafty.trigger("NoCanvas");
				Crafty.stop();
				return;
			}

			//create 3 empty canvas elements
			var c;
			c = document.createElement("canvas");
			c.width = Crafty.viewport.width;
			c.height = Crafty.viewport.height;
			c.style.position = 'absolute';
			c.style.left = "0px";
			c.style.top = "0px";

			Crafty.stage.elem.appendChild(c);
			Crafty.canvas.context = c.getContext('2d');
			Crafty.canvas._canvas = c;
		}
	}
});

Crafty.extend({
	over: null, //object mouseover, waiting for out
	mouseObjs: 0,
	mousePos: {},
	lastEvent: null,
	keydown: {},
	selected: false,

	/**@
	* #Crafty.keydown
	* @category Input
	* Remembering what keys (referred by Unicode) are down.
	* 
	* @example
	* ~~~
	* Crafty.c("Keyboard", {
	*   isDown: function (key) {
	*     if (typeof key === "string") {
	*       key = Crafty.keys[key];
	*     }
	*     return !!Crafty.keydown[key];
	*   }
	* });
	* ~~~
	* @see Keyboard, Crafty.keys
	*/

	detectBlur: function (e) {
		var selected = ((e.clientX > Crafty.stage.x && e.clientX < Crafty.stage.x + Crafty.viewport.width) &&
                    (e.clientY > Crafty.stage.y && e.clientY < Crafty.stage.y + Crafty.viewport.height));

		if (!Crafty.selected && selected)
			Crafty.trigger("CraftyFocus");
		if (Crafty.selected && !selected)
			Crafty.trigger("CraftyBlur");

		Crafty.selected = selected;
	},

	mouseDispatch: function (e) {
		
		if (!Crafty.mouseObjs) return;
		Crafty.lastEvent = e;

		var maxz = -1,
			closest,
			q,
			i = 0, l,
			pos = Crafty.DOM.translate(e.clientX, e.clientY),
			x, y,
			dupes = {},
			tar = e.target ? e.target : e.srcElement,
			type = e.type;

		//Normalize button according to http://unixpapa.com/js/mouse.html
		if (e.which == null) {
			e.mouseButton = (e.button < 2) ? Crafty.mouseButtons.LEFT : ((e.button == 4) ? Crafty.mouseButtons.MIDDLE : Crafty.mouseButtons.RIGHT);
		} else {
			e.mouseButton = (e.which < 2) ? Crafty.mouseButtons.LEFT : ((e.which == 2) ? Crafty.mouseButtons.MIDDLE : Crafty.mouseButtons.RIGHT);
		}

		e.realX = x = Crafty.mousePos.x = pos.x;
		e.realY = y = Crafty.mousePos.y = pos.y;

		//if it's a DOM element with Mouse component we are done
		if (tar.nodeName != "CANVAS") {
			while (typeof (tar.id) != 'string' && tar.id.indexOf('ent') == -1) {
				tar = tar.parentNode;
			}
			ent = Crafty(parseInt(tar.id.replace('ent', '')))
			if (ent.has('Mouse') && ent.isAt(x, y))
				closest = ent;
		}
		//else we search for an entity with Mouse component
		if (!closest) {
			q = Crafty.map.search({ _x: x, _y: y, _w: 1, _h: 1 }, false);

			for (l = q.length; i < l; ++i) {
				if (!q[i].__c.Mouse || !q[i]._visible) continue;

				var current = q[i],
					flag = false;

				//weed out duplicates
				if (dupes[current[0]]) continue;
				else dupes[current[0]] = true;

				if (current.mapArea) {
					if (current.mapArea.containsPoint(x, y)) {
						flag = true;
					}
				} else if (current.isAt(x, y)) flag = true;

				if (flag && (current._z >= maxz || maxz === -1)) {
					//if the Z is the same, select the closest GUID
					if (current._z === maxz && current[0] < closest[0]) {
						continue;
					}
					maxz = current._z;
					closest = current;
				}
			}
		}

		//found closest object to mouse
		if (closest) {
			//click must mousedown and out on tile
			if (type === "mousedown") {
				closest.trigger("MouseDown", e);
            } else if (type === "mouseup") {
				closest.trigger("MouseUp", e);
			} else if (type == "dblclick") {
				closest.trigger("DoubleClick", e);
			} else if (type == "click") {
				closest.trigger("Click", e);
			}else if (type === "mousemove") {
				closest.trigger("MouseMove", e);
				if (this.over !== closest) { //if new mousemove, it is over
					if (this.over) {
						this.over.trigger("MouseOut", e); //if over wasn't null, send mouseout
						this.over = null;
					}
					this.over = closest;
					closest.trigger("MouseOver", e);
				}
			} else closest.trigger(type, e); //trigger whatever it is
		} else {
			if (type === "mousemove" && this.over) {
				this.over.trigger("MouseOut", e);
				this.over = null;
			}
			if (type === "mousedown") {
				Crafty.viewport.mouselook('start', e);
			}
			else if (type === "mousemove") {
				Crafty.viewport.mouselook('drag', e);
			}
			else if (type == "mouseup") {
				Crafty.viewport.mouselook('stop');
			}
		}

		if (type === "mousemove") {
			this.lastEvent = e;
		}

	},


    /**@
    * #Crafty.touchDispatch
    * @category Input
    * 
    * TouchEvents have a different structure then MouseEvents.
    * The relevant data lives in e.changedTouches[0].
    * To normalize TouchEvents we catch em and dispatch a mock MouseEvent instead.
    * 
    * @see Crafty.mouseDispatch
    */

    touchDispatch: function(e) {
        var type,
            lastEvent = Crafty.lastEvent;

        if (e.type === "touchstart") type = "mousedown";
        else if (e.type === "touchmove") type = "mousemove";
        else if (e.type === "touchend") type = "mouseup";
        else if (e.type === "touchcancel") type = "mouseup";
        else if (e.type === "touchleave") type = "mouseup";
        
        if(e.touches && e.touches.length) {
            first = e.touches[0];
        } else if(e.changedTouches && e.changedTouches.length) {
            first = e.changedTouches[0];
        }

        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1,
            first.screenX, 
            first.screenY,
            first.clientX, 
            first.clientY, 
            false, false, false, false, 0, e.relatedTarget
        );

        first.target.dispatchEvent(simulatedEvent);

        // trigger click when it should be triggered
        if (lastEvent != null && lastEvent.type == 'mousedown' && type == 'mouseup') {
            type = 'click';

            var simulatedEvent = document.createEvent("MouseEvent");
            simulatedEvent.initMouseEvent(type, true, true, window, 1,
                first.screenX, 
                first.screenY,
                first.clientX, 
                first.clientY, 
                false, false, false, false, 0, e.relatedTarget
            );
            first.target.dispatchEvent(simulatedEvent);
        }

        if(e.preventDefault) e.preventDefault();
        else e.returnValue = false;
    },


	/**@
	* #KeyboardEvent
	* @category Input
    * Keyboard Event triggered by Crafty Core
	* @trigger KeyDown - is triggered for each entity when the DOM 'keydown' event is triggered.
	* @trigger KeyUp - is triggered for each entity when the DOM 'keyup' event is triggered.
	* 
	* @example
	* ~~~
    * Crafty.e("2D, DOM, Color")
    *   .attr({x: 100, y: 100, w: 50, h: 50})
    *   .color("red")
    *   .bind('KeyDown', function(e) {
    *     if(e.key == Crafty.keys['LEFT_ARROW']) {
    *       this.x=this.x-1;
    *     } else if (e.key == Crafty.keys['RIGHT_ARROW']) {
    *     this.x=this.x+1;
    *     } else if (e.key == Crafty.keys['UP_ARROW']) {
    *     this.y=this.y-1;
    *     } else if (e.key == Crafty.keys['DOWN_ARROW']) {
    *     this.y=this.y+1;
    *     }
    *   });
	* ~~~
	* 
	* @see Crafty.keys
	*/

	/**@
	* #Crafty.eventObject
	* @category Input
	* 
	* Event Object used in Crafty for cross browser compatibility
	*/

	/**@
	* #.key
	* @comp Crafty.eventObject
	* 
	* Unicode of the key pressed
	*/
	keyboardDispatch: function (e) {
		// Use a Crafty-standard event object to avoid cross-browser issues
		var original = e,
			evnt = {},
			props = "char charCode keyCode type shiftKey ctrlKey metaKey timestamp".split(" ");
		for (var i = props.length; i;) {
			var prop = props[--i];
			evnt[prop] = original[prop];
		}
		evnt.which = original.charCode != null ? original.charCode : original.keyCode;
		evnt.key = original.keyCode || original.which;
		evnt.originalEvent = original;
		e = evnt;

		if (e.type === "keydown") {
			if (Crafty.keydown[e.key] !== true) {
				Crafty.keydown[e.key] = true;
				Crafty.trigger("KeyDown", e);
			}
		} else if (e.type === "keyup") {
			delete Crafty.keydown[e.key];
			Crafty.trigger("KeyUp", e);
		}

		//prevent default actions for all keys except backspace and F1-F12.
		//Among others this prevent the arrow keys from scrolling the parent page
		//of an iframe hosting the game
		if(Crafty.selected && !(e.key == 8 || e.key >= 112 && e.key <= 135)) {
			if(e.stopPropagation) e.stopPropagation();
            else e.cancelBubble = true;

			if(e.preventDefault) e.preventDefault();
			else e.returnValue = false;
			return false;
		}
	}
});

//initialize the input events onload
Crafty.bind("Load", function () {
	Crafty.addEvent(this, "keydown", Crafty.keyboardDispatch);
	Crafty.addEvent(this, "keyup", Crafty.keyboardDispatch);

	Crafty.addEvent(this, Crafty.stage.elem, "mousedown", Crafty.mouseDispatch);
	Crafty.addEvent(this, Crafty.stage.elem, "mouseup", Crafty.mouseDispatch);
	Crafty.addEvent(this, document.body, "mouseup", Crafty.detectBlur);
	Crafty.addEvent(this, Crafty.stage.elem, "mousemove", Crafty.mouseDispatch);
	Crafty.addEvent(this, Crafty.stage.elem, "click", Crafty.mouseDispatch);
	Crafty.addEvent(this, Crafty.stage.elem, "dblclick", Crafty.mouseDispatch);

	Crafty.addEvent(this, Crafty.stage.elem, "touchstart", Crafty.touchDispatch);
	Crafty.addEvent(this, Crafty.stage.elem, "touchmove", Crafty.touchDispatch);
	Crafty.addEvent(this, Crafty.stage.elem, "touchend", Crafty.touchDispatch);
    Crafty.addEvent(this, Crafty.stage.elem, "touchcancel", Crafty.touchDispatch);
    Crafty.addEvent(this, Crafty.stage.elem, "touchleave", Crafty.touchDispatch);
   });

Crafty.bind("CraftyStop", function () {
	Crafty.removeEvent(this, "keydown", Crafty.keyboardDispatch);
	Crafty.removeEvent(this, "keyup", Crafty.keyboardDispatch);

	if (Crafty.stage) {
		Crafty.removeEvent(this, Crafty.stage.elem, "mousedown", Crafty.mouseDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "mouseup", Crafty.mouseDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "mousemove", Crafty.mouseDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "click", Crafty.mouseDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "dblclick", Crafty.mouseDispatch);

		Crafty.removeEvent(this, Crafty.stage.elem, "touchstart", Crafty.touchDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "touchmove", Crafty.touchDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "touchend", Crafty.touchDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "touchcancel", Crafty.touchDispatch);
		Crafty.removeEvent(this, Crafty.stage.elem, "touchleave", Crafty.touchDispatch);
	}

	Crafty.removeEvent(this, document.body, "mouseup", Crafty.detectBlur);
});

/**@
* #Mouse
* @category Input
* Provides the entity with mouse related events
* @trigger MouseOver - when the mouse enters the entity - MouseEvent
* @trigger MouseOut - when the mouse leaves the entity - MouseEvent
* @trigger MouseDown - when the mouse button is pressed on the entity - MouseEvent
* @trigger MouseUp - when the mouse button is released on the entity - MouseEvent
* @trigger Click - when the user clicks the entity. [See documentation](http://www.quirksmode.org/dom/events/click.html) - MouseEvent
* @trigger DoubleClick - when the user double clicks the entity - MouseEvent
* @trigger MouseMove - when the mouse is over the entity and moves - MouseEvent
* Crafty adds the mouseButton property to MouseEvents that match one of
*
* ~~~
* - Crafty.mouseButtons.LEFT
* - Crafty.mouseButtons.RIGHT
* - Crafty.mouseButtons.MIDDLE
* ~~~
* 
* @example
* ~~~
* myEntity.bind('Click', function() {
*      console.log("Clicked!!");
* })
*
* myEntity.bind('MouseUp', function(e) {
*    if( e.mouseButton == Crafty.mouseButtons.RIGHT )
*        console.log("Clicked right button");
* })
* ~~~
*/
Crafty.c("Mouse", {
	init: function () {
		Crafty.mouseObjs++;
		this.bind("Remove", function () {
			Crafty.mouseObjs--;
		});
	},

	/**@
	* #.areaMap
	* @comp Mouse
	* @sign public this .areaMap(Crafty.polygon polygon)
	* @param polygon - Instance of Crafty.polygon used to check if the mouse coordinates are inside this region
	* @sign public this .areaMap(Array point1, .., Array pointN)
	* @param point# - Array with an `x` and `y` position to generate a polygon
	* 
	* Assign a polygon to the entity so that mouse events will only be triggered if
	* the coordinates are inside the given polygon.
	* 
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color, Mouse")
	*     .color("red")
	*     .attr({ w: 100, h: 100 })
	*     .bind('MouseOver', function() {console.log("over")})
	*     .areaMap([0,0], [50,0], [50,50], [0,50])
	* ~~~
	* 
	* @see Crafty.polygon
	*/
	areaMap: function (poly) {
		//create polygon
		if (arguments.length > 1) {
			//convert args to array to create polygon
			var args = Array.prototype.slice.call(arguments, 0);
			poly = new Crafty.polygon(args);
		}

		poly.shift(this._x, this._y);
		//this.map = poly;
		this.mapArea = poly;

		this.attach(this.mapArea);
		return this;
	}
});

/**@
* #Draggable
* @category Input
* Enable drag and drop of the entity.
* @trigger Dragging - is triggered each frame the entity is being dragged - MouseEvent
* @trigger StartDrag - is triggered when dragging begins - MouseEvent
* @trigger StopDrag - is triggered when dragging ends - MouseEvent
*/
Crafty.c("Draggable", {
  _origMouseDOMPos: null,
	_oldX: null,
	_oldY: null,
	_dragging: false,
	_dir:null,

	_ondrag: null,
	_ondown: null,
	_onup: null,

	//Note: the code is note tested with zoom, etc., that may distort the direction between the viewport and the coordinate on the canvas.
	init: function () {
		this.requires("Mouse");
		
		this._ondrag = function (e) {
			var pos = Crafty.DOM.translate(e.clientX, e.clientY);

			// ignore invalid 0 0 position - strange problem on ipad
			if (pos.x == 0 || pos.y == 0) {
			    return false;
			}
	    
			if(this._dir) {
			    var len = (pos.x - this._origMouseDOMPos.x) * this._dir.x + (pos.y - this._origMouseDOMPos.y) * this._dir.y;
			    this.x = this._oldX + len * this._dir.x;
			    this.y = this._oldY + len * this._dir.y;
			} else {
			    this.x = this._oldX + (pos.x - this._origMouseDOMPos.x);
			    this.y = this._oldY + (pos.y - this._origMouseDOMPos.y);
			}
	    
			this.trigger("Dragging", e);
		};

		this._ondown = function (e) {
			if (e.mouseButton !== Crafty.mouseButtons.LEFT) return;
			this._startDrag(e);
		};

		this._onup = function upper(e) {
			if (this._dragging == true) {
			    Crafty.removeEvent(this, Crafty.stage.elem, "mousemove", this._ondrag);
			    Crafty.removeEvent(this, Crafty.stage.elem, "mouseup", this._onup);
			    this._dragging = false;
			    this.trigger("StopDrag", e);
			}
		};

		this.enableDrag();
	},

	/**@
	* #.dragDirection
	* @comp Draggable
	* @sign public this .dragDirection()
    * Remove any previously specified direction.
    *
	* @sign public this .dragDirection(vector)
    * @param vector - Of the form of {x: valx, y: valy}, the vector (valx, valy) denotes the move direction.
    * 
	* @sign public this .dragDirection(degree)
    * @param degree - A number, the degree (clockwise) of the move direction with respect to the x axis. 
	* Specify the dragging direction.
	* 
	* @example
	* ~~~
	* this.dragDirection()
	* this.dragDirection({x:1, y:0}) //Horizontal
	* this.dragDirection({x:0, y:1}) //Vertical
    * // Note: because of the orientation of x and y axis,
    * // this is 45 degree clockwise with respect to the x axis.
	* this.dragDirection({x:1, y:1}) //45 degree.
	* this.dragDirection(60) //60 degree.
	* ~~~
	*/
	dragDirection: function(dir) {
		if (typeof dir === 'undefined') {
			this._dir=null;
		} else if (("" + parseInt(dir)) == dir) { //dir is a number
      this._dir={
        x: Math.cos(dir/180*Math.PI)
        , y: Math.sin(dir/180*Math.PI)
      };
    }
    else {
      var r=Math.sqrt(dir.x * dir.x + dir.y * dir.y)
			this._dir={
        x: dir.x/r
        , y: dir.y/r
      };
		}
	},
	
	
	/**@
	* #._startDrag
	* @comp Draggable
	* Internal method for starting a drag of an entity either programatically or via Mouse click
	*
	* @param e - a mouse event
	*/
	_startDrag: function(e){
		this._origMouseDOMPos = Crafty.DOM.translate(e.clientX, e.clientY);
		this._oldX = this._x;
		this._oldY = this._y;
		this._dragging = true;

		Crafty.addEvent(this, Crafty.stage.elem, "mousemove", this._ondrag);
		Crafty.addEvent(this, Crafty.stage.elem, "mouseup", this._onup);
		this.trigger("StartDrag", e);
	},
	
	/**@
	* #.stopDrag
	* @comp Draggable
	* @sign public this .stopDrag(void)
	* @trigger StopDrag - Called right after the mouse listeners are removed
	* 
	* Stop the entity from dragging. Essentially reproducing the drop.
	* 
	* @see .startDrag
	*/
	stopDrag: function () {
		Crafty.removeEvent(this, Crafty.stage.elem, "mousemove", this._ondrag);
		Crafty.removeEvent(this, Crafty.stage.elem, "mouseup", this._onup);

		this._dragging = false;
		this.trigger("StopDrag");
		return this;
	},

	/**@
	* #.startDrag
	* @comp Draggable
	* @sign public this .startDrag(void)
	* 
	* Make the entity follow the mouse positions.
	* 
	* @see .stopDrag
	*/
	startDrag: function () {
		if (!this._dragging) {
			//Use the last known position of the mouse
			this._startDrag(Crafty.lastEvent);
		}
		return this;
	},

	/**@
	* #.enableDrag
	* @comp Draggable
	* @sign public this .enableDrag(void)
	* 
	* Rebind the mouse events. Use if `.disableDrag` has been called.
	* 
	* @see .disableDrag
	*/
	enableDrag: function () {
		this.bind("MouseDown", this._ondown);

		Crafty.addEvent(this, Crafty.stage.elem, "mouseup", this._onup);
		return this;
	},

	/**@
	* #.disableDrag
	* @comp Draggable
	* @sign public this .disableDrag(void)
	* 
	* Stops entity from being draggable. Reenable with `.enableDrag()`.
	* 
	* @see .enableDrag
	*/
	disableDrag: function () {
		this.unbind("MouseDown", this._ondown);
		this.stopDrag();
		return this;
	}
});

/**@
* #Keyboard
* @category Input
* Give entities keyboard events (`keydown` and `keyup`).
*/
Crafty.c("Keyboard", {
/**@
	* #.isDown
	* @comp Keyboard
	* @sign public Boolean isDown(String keyName)
	* @param keyName - Name of the key to check. See `Crafty.keys`.
	* @sign public Boolean isDown(Number keyCode)
	* @param keyCode - Key code in `Crafty.keys`.
	* 
	* Determine if a certain key is currently down.
	* 
	* @example
	* ~~~
	* entity.requires('Keyboard').bind('KeyDown', function () { if (this.isDown('SPACE')) jump(); });
	* ~~~
	* 
	* @see Crafty.keys
	*/
	isDown: function (key) {
		if (typeof key === "string") {
			key = Crafty.keys[key];
		}
		return !!Crafty.keydown[key];
	}
});

/**@
* #Multiway
* @category Input
* Used to bind keys to directions and have the entity move accordingly
* @trigger NewDirection - triggered when direction changes - { x:Number, y:Number } - New direction
* @trigger Moved - triggered on movement on either x or y axis. If the entity has moved on both axes for diagonal movement the event is triggered twice - { x:Number, y:Number } - Old position
*/
Crafty.c("Multiway", {
	_speed: 3,

  _keydown: function (e) {
		if (this._keys[e.key]) {
			this._movement.x = Math.round((this._movement.x + this._keys[e.key].x) * 1000) / 1000;
			this._movement.y = Math.round((this._movement.y + this._keys[e.key].y) * 1000) / 1000;
			this.trigger('NewDirection', this._movement);
		}
	},

  _keyup: function (e) {
		if (this._keys[e.key]) {
			this._movement.x = Math.round((this._movement.x - this._keys[e.key].x) * 1000) / 1000;
			this._movement.y = Math.round((this._movement.y - this._keys[e.key].y) * 1000) / 1000;
			this.trigger('NewDirection', this._movement);
		}
	},

  _enterframe: function () {
		if (this.disableControls) return;

		if (this._movement.x !== 0) {
			this.x += this._movement.x;
			this.trigger('Moved', { x: this.x - this._movement.x, y: this.y });
		}
		if (this._movement.y !== 0) {
			this.y += this._movement.y;
			this.trigger('Moved', { x: this.x, y: this.y - this._movement.y });
		}
	},

	/**@
	* #.multiway
	* @comp Multiway
	* @sign public this .multiway([Number speed,] Object keyBindings )
	* @param speed - Amount of pixels to move the entity whilst a key is down
	* @param keyBindings - What keys should make the entity go in which direction. Direction is specified in degrees
	* Constructor to initialize the speed and keyBindings. Component will listen to key events and move the entity appropriately.
	*
	* When direction changes a NewDirection event is triggered with an object detailing the new direction: {x: x_movement, y: y_movement}
	* When entity has moved on either x- or y-axis a Moved event is triggered with an object specifying the old position {x: old_x, y: old_y}
	* 
	* @example
	* ~~~
	* this.multiway(3, {UP_ARROW: -90, DOWN_ARROW: 90, RIGHT_ARROW: 0, LEFT_ARROW: 180});
	* this.multiway({x:3,y:1.5}, {UP_ARROW: -90, DOWN_ARROW: 90, RIGHT_ARROW: 0, LEFT_ARROW: 180});
	* this.multiway({W: -90, S: 90, D: 0, A: 180});
	* ~~~
	*/
	multiway: function (speed, keys) {
		this._keyDirection = {};
		this._keys = {};
		this._movement = { x: 0, y: 0 };
		this._speed = { x: 3, y: 3 };

		if (keys) {
			if (speed.x && speed.y) {
				this._speed.x = speed.x;
				this._speed.y = speed.y;
			} else {
				this._speed.x = speed;
				this._speed.y = speed;
			}
		} else {
			keys = speed;
		}

		this._keyDirection = keys;
		this.speed(this._speed);

		this.disableControl();
		this.enableControl();

		//Apply movement if key is down when created
		for (var k in keys) {
			if (Crafty.keydown[Crafty.keys[k]]) {
				this.trigger("KeyDown", { key: Crafty.keys[k] });
			}
		}

		return this;
	},

	/**@
	* #.enableControl
	* @comp Multiway
	* @sign public this .enableControl()
	* 
	* Enable the component to listen to key events.
	*
	* @example
	* ~~~
    * this.enableControl();
	* ~~~
	*/
  enableControl: function() {
		this.bind("KeyDown", this._keydown)
		.bind("KeyUp", this._keyup)
		.bind("EnterFrame", this._enterframe);
		return this;
  },

	/**@
	* #.disableControl
	* @comp Multiway
	* @sign public this .disableControl()
	* 
	* Disable the component to listen to key events.
	*
	* @example
	* ~~~
    * this.disableControl();
	* ~~~
	*/

  disableControl: function() {
		this.unbind("KeyDown", this._keydown)
		.unbind("KeyUp", this._keyup)
		.unbind("EnterFrame", this._enterframe);
		return this;
  },

	speed: function (speed) {
		for (var k in this._keyDirection) {
			var keyCode = Crafty.keys[k] || k;
			this._keys[keyCode] = {
				x: Math.round(Math.cos(this._keyDirection[k] * (Math.PI / 180)) * 1000 * speed.x) / 1000,
				y: Math.round(Math.sin(this._keyDirection[k] * (Math.PI / 180)) * 1000 * speed.y) / 1000
			};
		}
		return this;
	}
});

/**@
* #Fourway
* @category Input
* Move an entity in four directions by using the
* arrow keys or `W`, `A`, `S`, `D`.
*/
Crafty.c("Fourway", {

	init: function () {
		this.requires("Multiway");
	},

	/**@
	* #.fourway
	* @comp Fourway
	* @sign public this .fourway(Number speed)
	* @param speed - Amount of pixels to move the entity whilst a key is down
	* Constructor to initialize the speed. Component will listen for key events and move the entity appropriately.
	* This includes `Up Arrow`, `Right Arrow`, `Down Arrow`, `Left Arrow` as well as `W`, `A`, `S`, `D`.
	*
	* When direction changes a NewDirection event is triggered with an object detailing the new direction: {x: x_movement, y: y_movement}
	* When entity has moved on either x- or y-axis a Moved event is triggered with an object specifying the old position {x: old_x, y: old_y}
	*
	* The key presses will move the entity in that direction by the speed passed in the argument.
	* 
	* @see Multiway
	*/
	fourway: function (speed) {
		this.multiway(speed, {
			UP_ARROW: -90,
			DOWN_ARROW: 90,
			RIGHT_ARROW: 0,
			LEFT_ARROW: 180,
			W: -90,
			S: 90,
			D: 0,
			A: 180,
			Z: -90,
			Q: 180
		});

		return this;
	}
});

/**@
* #Twoway
* @category Input
* Move an entity left or right using the arrow keys or `D` and `A` and jump using up arrow or `W`.
*
* When direction changes a NewDirection event is triggered with an object detailing the new direction: {x: x_movement, y: y_movement}. This is consistent with Fourway and Multiway components.
* When entity has moved on x-axis a Moved event is triggered with an object specifying the old position {x: old_x, y: old_y}
*/
Crafty.c("Twoway", {
	_speed: 3,
	_up: false,

	init: function () {
		this.requires("Fourway, Keyboard");
	},

	/**@
	* #.twoway
	* @comp Twoway
	* @sign public this .twoway(Number speed[, Number jumpSpeed])
	* @param speed - Amount of pixels to move left or right
	* @param jumpSpeed - How high the entity should jump
	* 
	* Constructor to initialize the speed and power of jump. Component will
	* listen for key events and move the entity appropriately. This includes
	* ~~~
	* `Up Arrow`, `Right Arrow`, `Left Arrow` as well as W, A, D. Used with the
	* `gravity` component to simulate jumping.
	* ~~~
	* 
	* The key presses will move the entity in that direction by the speed passed in
	* the argument. Pressing the `Up Arrow` or `W` will cause the entity to jump.
	* 
	* @see Gravity, Fourway
	*/
	twoway: function (speed, jump) {

		this.multiway(speed, {
			RIGHT_ARROW: 0,
			LEFT_ARROW: 180,
			D: 0,
			A: 180,
			Q: 180
		});

		if (speed) this._speed = speed;
		jump = jump || this._speed * 2;

		this.bind("EnterFrame", function () {
			if (this.disableControls) return;
			if (this._up) {
				this.y -= jump;
				this._falling = true;
			}
		}).bind("KeyDown", function () {
			if (this.isDown("UP_ARROW") || this.isDown("W") || this.isDown("Z")) this._up = true;
		});

		return this;
	}
});

/**@
* #SpriteAnimation
* @category Animation
* @trigger AnimationEnd - When the animation finishes - { reel }
* @trigger Change - On each frame
*
* Used to animate sprites by changing the sprites in the sprite map.
*
*/
Crafty.c("SpriteAnimation", {
/**@
	* #._reels
	* @comp SpriteAnimation
	*
	* A map consists of arrays that contains the coordinates of each frame within the sprite, e.g.,
    * `{"walk_left":[[96,48],[112,48],[128,48]]}`
	*/
	_reels: null,
	_frame: null,

	/**@
	* #._currentReelId
	* @comp SpriteAnimation
	*
	* The current playing reel (one element of `this._reels`). It is `null` if no reel is playing.
	*/
	_currentReelId: null,

	init: function () {
		this._reels = {};
	},

	/**@
	* #.animate
	* @comp SpriteAnimation
	* @sign public this .animate(String reelId, Number fromX, Number y, Number toX)
	* @param reelId - ID of the animation reel being created
	* @param fromX - Starting `x` position (in the unit of sprite horizontal size) on the sprite map
	* @param y - `y` position on the sprite map (in the unit of sprite vertical size). Remains constant through the animation.
	* @param toX - End `x` position on the sprite map (in the unit of sprite horizontal size)
	* @sign public this .animate(String reelId, Array frames)
	* @param reelId - ID of the animation reel being created
	* @param frames - Array of arrays containing the `x` and `y` values: [[x1,y1],[x2,y2],...]
	* @sign public this .animate(String reelId, Number duration[, Number repeatCount])
	* @param reelId - ID of the animation reel to play
	* @param duration - Play the animation within a duration (in frames)
	* @param repeatCount - number of times to repeat the animation. Use -1 for infinitely
	*
	* Method to setup animation reels or play pre-made reels. Animation works by changing the sprites over
	* a duration. Only works for sprites built with the Crafty.sprite methods. See the Tween component for animation of 2D properties.
	*
	* To setup an animation reel, pass the name of the reel (used to identify the reel and play it later), and either an
	* array of absolute sprite positions or the start x on the sprite map, the y on the sprite map and then the end x on the sprite map.
	*
	* To play a reel, pass the name of the reel and the duration it should play for (in frames). If you need
	* to repeat the animation, simply pass in the amount of times the animation should repeat. To repeat
	* forever, pass in `-1`.
	*
	* @example
	* ~~~
	* Crafty.sprite(16, "images/sprite.png", {
	*     PlayerSprite: [0,0]
	* });
	*
	* Crafty.e("2D, DOM, SpriteAnimation, PlayerSprite")
	*     .animate('PlayerRunning', 0, 0, 3) //setup animation
	*     .animate('PlayerRunning', 15, -1) // start animation
	*
	* Crafty.e("2D, DOM, SpriteAnimation, PlayerSprite")
	*     .animate('PlayerRunning', 0, 3, 0) //setup animation
	*     .animate('PlayerRunning', 15, -1) // start animation
	* ~~~
	*
	* @see crafty.sprite
	*/
	animate: function (reelId, fromx, y, tox) {
		var reel, i, tile, tileh, duration, pos;

		//play a reel
		//.animate('PlayerRunning', 15, -1) // start animation
		if (arguments.length < 4 && typeof fromx === "number") {
			duration = fromx;

			//make sure not currently animating
			this._currentReelId = reelId;

			currentReel = this._reels[reelId];

			this._frame = {
				currentReel: currentReel,
				numberOfFramesBetweenSlides: Math.ceil(duration / currentReel.length),
				currentSlideNumber: 0,
				frameNumberBetweenSlides: 0,
				repeat: 0
			};
			if (arguments.length === 3 && typeof y === "number") {
				//User provided repetition count
				if (y === -1) this._frame.repeatInfinitly = true;
				else this._frame.repeat = y;
			}

			pos = this._frame.currentReel[0];
			this.__coord[0] = pos[0];
			this.__coord[1] = pos[1];

			this.bind("EnterFrame", this.updateSprite);
			return this;
		}
		// .animate('PlayerRunning', 0, 0, 3) //setup animation
		if (typeof fromx === "number") {
			// Defind in Sprite component.
			tile = this.__tile + parseInt(this.__padding[0] || 0, 10);
			tileh = this.__tileh + parseInt(this.__padding[1] || 0, 10);

			reel = [];
			i = fromx;
			if (tox > fromx) {
				for (; i <= tox; i++) {
					reel.push([i * tile, y * tileh]);
				}
			} else {
				for (; i >= tox; i--) {
					reel.push([i * tile, y * tileh]);
				}
			}

			this._reels[reelId] = reel;
		} else if (typeof fromx === "object") {
			// @sign public this .animate(reelId, [[x1,y1],[x2,y2],...])
			i = 0;
			reel = [];
			tox = fromx.length - 1;
			tile = this.__tile + parseInt(this.__padding[0] || 0, 10);
			tileh = this.__tileh + parseInt(this.__padding[1] || 0, 10);

			for (; i <= tox; i++) {
				pos = fromx[i];
				reel.push([pos[0] * tile, pos[1] * tileh]);
			}

			this._reels[reelId] = reel;
		}

		return this;
	},

	/**@
	* #.updateSprite
	* @comp SpriteAnimation
	* @sign private void .updateSprite()
	*
	* This is called at every `EnterFrame` event when `.animate()` enables animation. It update the SpriteAnimation component when the slide in the sprite should be updated.
	*
	* @example
	* ~~~
	* this.bind("EnterFrame", this.updateSprite);
	* ~~~
	*
	* @see crafty.sprite
	*/
	updateSprite: function () {
		var data = this._frame;
		if (!data) {
			return;
		}

		if (this._frame.frameNumberBetweenSlides++ === data.numberOfFramesBetweenSlides) {
			var pos = data.currentReel[data.currentSlideNumber++];

			this.__coord[0] = pos[0];
			this.__coord[1] = pos[1];
			this._frame.frameNumberBetweenSlides = 0;
		}


		if (data.currentSlideNumber === data.currentReel.length) {
			
			if (this._frame.repeatInfinitly === true || this._frame.repeat > 0) {
				if (this._frame.repeat) this._frame.repeat--;
				this._frame.frameNumberBetweenSlides = 0;
				this._frame.currentSlideNumber = 0;
			} else {
				if (this._frame.frameNumberBetweenSlides === data.numberOfFramesBetweenSlides) {
				    this.trigger("AnimationEnd", { reel: data.currentReel });
				    this.stop();
				    return;
                }
			}

		}

		this.trigger("Change");
	},

	/**@
	* #.stop
	* @comp SpriteAnimation
	* @sign public this .stop(void)
	*
	* Stop any animation currently playing.
	*/
	stop: function () {
		this.unbind("EnterFrame", this.updateSprite);
		this.unbind("AnimationEnd");
		this._currentReelId = null;
		this._frame = null;

		return this;
	},

	/**@
	* #.reset
	* @comp SpriteAnimation
	* @sign public this .reset(void)
	*
	* Method will reset the entities sprite to its original.
	*/
	reset: function () {
		if (!this._frame) return this;

		var co = this._frame.currentReel[0];
		this.__coord[0] = co[0];
		this.__coord[1] = co[1];
		this.stop();

		return this;
	},

	/**@
	* #.isPlaying
	* @comp SpriteAnimation
	* @sign public Boolean .isPlaying([String reelId])
	* @param reelId - Determine if the animation reel with this reelId is playing.
	*
	* Determines if an animation is currently playing. If a reel is passed, it will determine
	* if the passed reel is playing.
	*
	* @example
	* ~~~
	* myEntity.isPlaying() //is any animation playing
	* myEntity.isPlaying('PlayerRunning') //is the PlayerRunning animation playing
	* ~~~
	*/
	isPlaying: function (reelId) {
		if (!reelId) return !!this._currentReelId;
		return this._currentReelId === reelId;
	}
});

/**@
* #Tween
* @category Animation
* @trigger TweenEnd - when a tween finishes - String - property
*
* Component to animate the change in 2D properties over time.
*/
Crafty.c("Tween", {
	_step: null,
	_numProps: 0,

	/**@
	* #.tween
	* @comp Tween
	* @sign public this .tween(Object properties, Number duration)
	* @param properties - Object of 2D properties and what they should animate to
	* @param duration - Duration to animate the properties over (in frames)
	*
	* This method will animate a 2D entities properties over the specified duration.
	* These include `x`, `y`, `w`, `h`, `alpha` and `rotation`.
	*
	* The object passed should have the properties as keys and the value should be the resulting
	* values of the properties.
	*
	* @example
	* Move an object to 100,100 and fade out in 200 frames.
	* ~~~
	* Crafty.e("2D, Tween")
	*    .attr({alpha: 1.0, x: 0, y: 0})
	*    .tween({alpha: 0.0, x: 100, y: 100}, 200)
	* ~~~
	*/
	tween: function (props, duration) {
		this.each(function () {
			if (this._step == null) {
				this._step = {};
				this.bind('EnterFrame', tweenEnterFrame);
				this.bind('RemoveComponent', function (c) {
					if (c == 'Tween') {
						this.unbind('EnterFrame', tweenEnterFrame);
					}
				});
			}

			for (var prop in props) {
				this._step[prop] = { prop: props[prop], val: (props[prop] - this[prop]) / duration, rem: duration };
				this._numProps++;
			}
		});
		return this;
	}
});

function tweenEnterFrame(e) {
	if (this._numProps <= 0) return;

	var prop, k;
	for (k in this._step) {
		prop = this._step[k];
		this[k] += prop.val;
		if (--prop.rem == 0) {
			// decimal numbers rounding fix
			this[k] = prop.prop;
			this.trigger("TweenEnd", k);
			// make sure the duration wasn't changed in TweenEnd
			if (this._step[k].rem <= 0) {
				delete this._step[k];
			}
			this._numProps--;
		}
	}

	if (this.has('Mouse')) {
		var over = Crafty.over,
			mouse = Crafty.mousePos;
		if (over && over[0] == this[0] && !this.isAt(mouse.x, mouse.y)) {
			this.trigger('MouseOut', Crafty.lastEvent);
			Crafty.over = null;
		}
		else if ((!over || over[0] != this[0]) && this.isAt(mouse.x, mouse.y)) {
			Crafty.over = this;
			this.trigger('MouseOver', Crafty.lastEvent);
		}
	}
}


/**@
* #Color
* @category Graphics
* Draw a solid color for the entity
*/
Crafty.c("Color", {
	_color: "",
	ready: true,

	init: function () {
		this.bind("Draw", function (e) {
			if (e.type === "DOM") {
				e.style.background = this._color;
				e.style.lineHeight = 0;
			} else if (e.type === "canvas") {
				if (this._color) e.ctx.fillStyle = this._color;
				e.ctx.fillRect(e.pos._x, e.pos._y, e.pos._w, e.pos._h);
			}
		});
	},

	/**@
	* #.color
	* @comp Color
	* @trigger Change - when the color changes
	* @sign public this .color(String color)
	* @sign public String .color()
	* @param color - Color of the rectangle
	* Will create a rectangle of solid color for the entity, or return the color if no argument is given.
	*
	* The argument must be a color readable depending on which browser you
	* choose to support. IE 8 and below doesn't support the rgb() syntax.
	* 
	* @example
	* ~~~
	* Crafty.e("2D, DOM, Color")
	*    .color("#969696");
	* ~~~
	*/
	color: function (color) {
		if (!color) return this._color;
		this._color = color;
		this.trigger("Change");
		return this;
	}
});

/**@
* #Tint
* @category Graphics
* Similar to Color by adding an overlay of semi-transparent color.
*
* *Note: Currently only works for Canvas*
*/
Crafty.c("Tint", {
	_color: null,
	_strength: 1.0,

	init: function () {
		var draw = function d(e) {
			var context = e.ctx || Crafty.canvas.context;

			context.fillStyle = this._color || "rgb(0,0,0)";
			context.fillRect(e.pos._x, e.pos._y, e.pos._w, e.pos._h);
		};

		this.bind("Draw", draw).bind("RemoveComponent", function (id) {
			if (id === "Tint") this.unbind("Draw", draw);
		});
	},

	/**@
	* #.tint
	* @comp Tint
	* @trigger Change - when the tint is applied
	* @sign public this .tint(String color, Number strength)
	* @param color - The color in hexadecimal
	* @param strength - Level of opacity
	* 
	* Modify the color and level opacity to give a tint on the entity.
	* 
	* @example
	* ~~~
	* Crafty.e("2D, Canvas, Tint")
	*    .tint("#969696", 0.3);
	* ~~~
	*/
	tint: function (color, strength) {
		this._strength = strength;
		this._color = Crafty.toRGB(color, this._strength);

		this.trigger("Change");
		return this;
	}
});

/**@
* #Image
* @category Graphics
* Draw an image with or without repeating (tiling).
*/
Crafty.c("Image", {
	_repeat: "repeat",
	ready: false,

	init: function () {
		var draw = function (e) {
			if (e.type === "canvas") {
				//skip if no image
				if (!this.ready || !this._pattern) return;

				var context = e.ctx;
				
				context.fillStyle = this._pattern;
				
				context.save();
				context.translate(e.pos._x, e.pos._y);
				context.fillRect(0, 0, this._w, this._h);
				context.restore();
			} else if (e.type === "DOM") {
				if (this.__image)
					e.style.background = "url(" + this.__image + ") " + this._repeat;
			}
		};

		this.bind("Draw", draw).bind("RemoveComponent", function (id) {
			if (id === "Image") this.unbind("Draw", draw);
		});
	},

	/**@
	* #.image
	* @comp Image
	* @trigger Change - when the image is loaded
	* @sign public this .image(String url[, String repeat])
	* @param url - URL of the image
	* @param repeat - If the image should be repeated to fill the entity.
	* 
	* Draw specified image. Repeat follows CSS syntax (`"no-repeat", "repeat", "repeat-x", "repeat-y"`);
	*
	* *Note: Default repeat is `no-repeat` which is different to standard DOM (which is `repeat`)*
	*
	* If the width and height are `0` and repeat is set to `no-repeat` the width and
	* height will automatically assume that of the image. This is an
	* easy way to create an image without needing sprites.
	* 
	* @example
	* Will default to no-repeat. Entity width and height will be set to the images width and height
	* ~~~
	* var ent = Crafty.e("2D, DOM, Image").image("myimage.png");
	* ~~~
	* Create a repeating background.
	* ~~~
	* var bg = Crafty.e("2D, DOM, Image")
	*              .attr({w: Crafty.viewport.width, h: Crafty.viewport.height})
	*              .image("bg.png", "repeat");
	* ~~~
	* 
	* @see Crafty.sprite
	*/
	image: function (url, repeat) {
		this.__image = url;
		this._repeat = repeat || "no-repeat";

		this.img = Crafty.asset(url);
		if (!this.img) {
			this.img = new Image();
			Crafty.asset(url, this.img);
			this.img.src = url;
			var self = this;

			this.img.onload = function () {
				if (self.has("Canvas")) self._pattern = Crafty.canvas.context.createPattern(self.img, self._repeat);
				self.ready = true;

				if (self._repeat === "no-repeat") {
					self.w = self.img.width;
					self.h = self.img.height;
				}

				self.trigger("Change");
			};

			return this;
		} else {
			this.ready = true;
			if (this.has("Canvas")) this._pattern = Crafty.canvas.context.createPattern(this.img, this._repeat);
			if (this._repeat === "no-repeat") {
				this.w = this.img.width;
				this.h = this.img.height;
			}
		}


		this.trigger("Change");

		return this;
	}
});

Crafty.extend({
	_scenes: [],
	_current: null,

	/**@
	* #Crafty.scene
	* @category Scenes, Stage
	* @trigger SceneChange - when a scene is played - { oldScene:String, newScene:String }
	* @sign public void Crafty.scene(String sceneName, Function init[, Function uninit])
	* @param sceneName - Name of the scene to add
	* @param init - Function to execute when scene is played
	* @param uninit - Function to execute before next scene is played, after entities with `2D` are destroyed
	* @sign public void Crafty.scene(String sceneName)
	* @param sceneName - Name of scene to play
	* 
	* Method to create scenes on the stage. Pass an ID and function to register a scene.
	*
	* To play a scene, just pass the ID. When a scene is played, all
	* entities with the `2D` component on the stage are destroyed.
	*
	* If you want some entities to persist over scenes (as in not be destroyed)
	* simply add the component `Persist`.
	*
	* @example
	* ~~~
	* Crafty.scene("loading", function() {});
	*
	* Crafty.scene("loading", function() {}, function() {});
	*
	* Crafty.scene("loading");
	* ~~~
	*/
	scene: function (name, intro, outro) {
		//play scene
		if (arguments.length === 1) {
			Crafty.viewport.reset();
			Crafty("2D").each(function () {
				if (!this.has("Persist")) this.destroy();
			});
			// uninitialize previous scene
			if (this._current !== null && 'uninitialize' in this._scenes[this._current]) {
				this._scenes[this._current].uninitialize.call(this);
			}
			// initialize next scene
			this._scenes[name].initialize.call(this);
			var oldScene = this._current;
			this._current = name;
			Crafty.trigger("SceneChange", { oldScene: oldScene, newScene: name });
			return;
		}
		//add scene
		this._scenes[name] = {}
		this._scenes[name].initialize = intro
		if (typeof outro !== 'undefined') {
			this._scenes[name].uninitialize = outro;
		}
		return;
	},

	/**@
	* #Crafty.toRGB
	* @category Graphics
	* @sign public String Crafty.scene(String hex[, Number alpha])
	* @param hex - a 6 character hex number string representing RGB color
	* @param alpha - The alpha value.
	* 
	* Get a rgb string or rgba string (if `alpha` presents).
	* 
	* @example
	* ~~~
	* Crafty.toRGB("ffffff"); // rgb(255,255,255)
	* Crafty.toRGB("#ffffff"); // rgb(255,255,255)
	* Crafty.toRGB("ffffff", .5); // rgba(255,255,255,0.5)
	* ~~~
	* 
	* @see Text.textColor
	*/
	toRGB: function (hex, alpha) {
		var hex = (hex.charAt(0) === '#') ? hex.substr(1) : hex,
			c = [], result;

		c[0] = parseInt(hex.substr(0, 2), 16);
		c[1] = parseInt(hex.substr(2, 2), 16);
		c[2] = parseInt(hex.substr(4, 2), 16);

		result = alpha === undefined ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + alpha + ')';

		return result;
	}
});

var DirtyRectangles = (function() {

	function x1(rect) { return rect._x; }
	function x2(rect) { return rect._x + rect._w; }
	function y1(rect) { return rect._y; }
	function y2(rect) { return rect._y + rect._h; }

	function intersects(a, b) {
		return x1(a) < x2(b) && x2(a) > x1(b) && y1(a) < y2(b) && y2(a) > y1(b);
	}

	var corner_data = {};

	function reset_corner_data() {
		corner_data.x1y1 = false;
		corner_data.x1y2 = false;
		corner_data.x2y1 = false;
		corner_data.x2y2 = false;
		corner_data.count = 0;
	}

	// Return the number of corners of b that are inside a.
	// _cornersInside stores its results in _corner_data. This is safe to do
	// since the only recursive call in this file is in tail position.
	function corners_inside(a, b) {
		reset_corner_data();

		// The x1, y1 corner of b.
		if (x1(b) >= x1(a) && x1(b) <= x2(a)) {

			// The x1, y1 corner of b.
			if (y1(b) >= y1(a) && y1(b) <= y2(a)) {
				corner_data.x1y1 = true;
				corner_data.count++;
			}
			// The x1, y2 corner of b
			if (y2(b) >= y1(a) && y2(b) <= y2(a)) {
				corner_data.x1y2 = true;
				corner_data.count++;
			}
		}

		if (x2(b) >= x1(a) && x2(b) <= x2(a)) {
			// The x2, y1 corner of b.
			if (y1(b) >= y1(a) && y1(b) <= y2(a)) {
				corner_data.x2y1 = true;
				corner_data.count++;
			}
			// The x2, y2 corner of b
			if (y2(b) >= y1(a) && y2(b) <= y2(a)) {
				corner_data.x2y2 = true;
				corner_data.count++;
			}
		}

		return corner_data.count;
	}

	// Shrink contained so that it no longer overlaps containing.
	// Requires:
	//   * Exactly two corners of contained are within containing.
	//   * _cornersInside called for containing and contained.
	function shrink_rect(containing, contained) {

		// The x1, y1 and x2, y1 corner of contained.
		if (corner_data.x1y1 && corner_data.x2y1) {
			contained._h -= y2(containing) - y1(contained);
			contained._y = y2(containing);
			return;
		}

		// The x1, y1 and x1, y2 corner of contained.
		if (corner_data.x1y1 && corner_data.x1y2) {
			contained._w -= x2(containing) - x1(contained);
			contained._x = x2(containing);
			return;
		}

		// The x1, y2 and x2, y2 corner of contained.
		if (corner_data.x1y2 && corner_data.x2y2) {
			contained._h = y1(containing) - y1(contained);
			return;
		}

		// The x2, y1 and x2, y2 corner of contained.
		if (corner_data.x2y1 && corner_data.x2y2) {
			contained._w = x1(containing) - x1(contained);
			return;
		}

	}

	// Enlarge `a` such that it covers `b` as well.
	function merge_into(a, b) {
		var newX2 = Math.max(x2(a), x2(b));
		var newY2 = Math.max(y2(a), y2(b));

		a._x = Math.min(a._x, b._x);
		a._y = Math.min(a._y, b._y);

		a._w = newX2 - a._x;
		a._h = newY2 - a._y;
	}

	function DirtyRectangles() {
		this.rectangles = [];
	};

	DirtyRectangles.prototype.add_rectangle = function(new_rect) {
		var _this = this;

		var indices_to_delete = [];

		function delete_indices() {
			var i, index;
			for (i = 0; i < indices_to_delete.length; i++) {
				index = indices_to_delete[i];
				_this.rectangles.splice(index, 1);
			}
		}

		var index, rect, corners, indices_to_delete;

		for (index = 0; index < this.rectangles.length; index++) {
			rect = this.rectangles[index];

			if (intersects(new_rect, rect)) {
				corners = corners_inside(rect, new_rect);
				switch (corners) {
					case 4:
						// If 4 corners of new_rect lie within rect, we can discard
						// new_rect.  We shouldn't have found any rectangles to delete,
						// because if a rectangle in the list is contained within
						// new_rect, and new_rect is contained with rect, then there are
						// overlapping rectangles in the list.
						if (indices_to_delete.length > 0)
							console.error("Dirty rectangle bug");
						return;
					case 3:
						console.error("Impossible corner count");
						return;
					case 2:
						// Shrink new_rect to not overlap rect.
						shrink_rect(rect, new_rect);
						break;
					case 1:
						corners = corners_inside(new_rect, rect);
						switch (corners) {
							case 1:
								// Merge the two rectangles.
								merge_into(rect, new_rect);
								// TODO: Must remove rect and re-insert it.
								indices_to_delete.unshift(index);
								delete_indices();
								_this.add_rectangle(rect);
								return;
							case 2:
								// This case looks like this:
								// +--------+=========+----------+
								// |rect    |         |          |
								// |        |         |          |
								// +--------+---------+ new_rect |
								//          +--------------------+
								// Note how new_rect has 1 corner in rect, while
								// rect has 2 corners in new_rect.
								//
								// Obviously, we shrink rect to not overlap new_rect.
								shrink_rect(new_rect, rect);
								break;
							case 4:
								// This case occurs when new_rect and rect have 1 corner in common,
								// but rect lies entirely within new_rect.
								// We delete rect, since new_rect encompasses it, and continue with
								// insertion normally.
								indices_to_delete.unshift(index);
								break;
							default:
								console.error("Dirty rectangle bug");
						}
						break;
					case 0:
						// No corners of new_rect are inside rect. Instead, see how many
						// corners of rect are inside new_rect
						corners = corners_inside(new_rect, rect);
						switch (corners) {
							case 4:
								// Delete rect, continue with insertion of new_rect
								indices_to_delete.unshift(index);
								break;
							case 3:
								console.error("Impossible corner count");
								return;
							case 2:
								// Shrink rect to not overlap new_rect, continue with insertion.
								shrink_rect(new_rect, rect);
								break;
							case 1:
								// This should be impossible, the earlier case of 1 corner overlapping
								// should have been triggered.
								console.error("Impossible corner count");
								return;
						}
				}
			}
		}

		delete_indices();
		this.rectangles.push(new_rect);
	};

	return DirtyRectangles;

})();

/**@
* #Crafty.DrawManager
* @category Graphics
* @sign Crafty.DrawManager
* 
* An internal object manage objects to be drawn and implement
* the best method of drawing in both DOM and canvas
*/
Crafty.DrawManager = (function () {
	/** array of dirty rects on screen */
	var dirty_rects = [],
	/** array of DOMs needed updating */
		dom = [];

	return {
		/**@
		* #Crafty.DrawManager.total2D
		* @comp Crafty.DrawManager
		* 
		* Total number of the entities that have the `2D` component.
		*/
		total2D: Crafty("2D").length,

		/**@
		* #Crafty.DrawManager.onScreen
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.onScreen(Object rect)
		* @param rect - A rectangle with field {_x: x_val, _y: y_val, _w: w_val, _h: h_val}
		* 
		* Test if a rectangle is completely in viewport
		*/
		onScreen: function (rect) {
			return Crafty.viewport._x + rect._x + rect._w > 0 && Crafty.viewport._y + rect._y + rect._h > 0 &&
				   Crafty.viewport._x + rect._x < Crafty.viewport.width && Crafty.viewport._y + rect._y < Crafty.viewport.height;
		},

		/**@
		* #Crafty.DrawManager.merge
		* @comp Crafty.DrawManager
		* @sign public Object Crafty.DrawManager.merge(Object set)
		* @param set - an array of rectangular regions
		* 
		* Merged into non overlapping rectangular region
		* Its an optimization for the redraw regions.
		*/
		merge: function (set) {
			var dr = new DirtyRectangles();
			for (var i = 0, new_rect; new_rect = set[i]; i++) {
				dr.add_rectangle(new_rect);
			}
			return dr.rectangles;
		},

		/**@
		* #Crafty.DrawManager.add
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.add(old, current)
		* @param old - Undocumented
		* @param current - Undocumented
		* 
		* Calculate the bounding rect of dirty data and add to the register of dirty rectangles
		*/
		add: function add(old, current) {
			if (!current) {
				dom.push(old);
				return;
			}

			var rect,
				before = old._mbr || old,
				after = current._mbr || current;

			if (old === current) {
				rect = old.mbr() || old.pos();
			} else {
				rect = {
					_x: ~~Math.min(before._x, after._x),
					_y: ~~Math.min(before._y, after._y),
					_w: Math.max(before._w, after._w) + Math.max(before._x, after._x),
					_h: Math.max(before._h, after._h) + Math.max(before._y, after._y)
				};

				rect._w = (rect._w - rect._x);
				rect._h = (rect._h - rect._y);
			}

			if (rect._w === 0 || rect._h === 0 || !this.onScreen(rect)) {
				return false;
			}

			//floor/ceil
			rect._x = ~~rect._x;
			rect._y = ~~rect._y;
			rect._w = (rect._w === ~~rect._w) ? rect._w : rect._w + 1 | 0;
			rect._h = (rect._h === ~~rect._h) ? rect._h : rect._h + 1 | 0;

			//add to dirty_rects, check for merging
			dirty_rects.push(rect);

			//if it got merged
			return true;
		},

		/**@
		* #Crafty.DrawManager.debug
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.debug()
		*/
		debug: function () {
			console.log(dirty_rects, dom);
		},

		/**@
		* #Crafty.DrawManager.draw
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.draw([Object rect])
        * @param rect - a rectangular region {_x: x_val, _y: y_val, _w: w_val, _h: h_val}
        * ~~~
		* - If rect is omitted, redraw within the viewport
		* - If rect is provided, redraw within the rect
		* ~~~
		*/
		drawAll: function (rect) {
			var rect = rect || Crafty.viewport.rect(),
				q = Crafty.map.search(rect),
				i = 0,
				l = q.length,
				ctx = Crafty.canvas.context,
				current;

			ctx.clearRect(rect._x, rect._y, rect._w, rect._h);

			//sort the objects by the global Z
			q.sort(function (a, b) { return a._globalZ - b._globalZ; });
			for (; i < l; i++) {
				current = q[i];
				if (current._visible && current.__c.Canvas) {
					current.draw();
					current._changed = false;
				}
			}
		},

		/**@
		* #Crafty.DrawManager.boundingRect
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.boundingRect(set)
		* @param set - Undocumented
		* ~~~
		* - Calculate the common bounding rect of multiple canvas entities.
		* - Returns coords
		* ~~~
		*/
		boundingRect: function (set) {
			if (!set || !set.length) return;
			var newset = [], i = 1,
			l = set.length, current, master = set[0], tmp;
			master = [master._x, master._y, master._x + master._w, master._y + master._h];
			while (i < l) {
				current = set[i];
				tmp = [current._x, current._y, current._x + current._w, current._y + current._h];
				if (tmp[0] < master[0]) master[0] = tmp[0];
				if (tmp[1] < master[1]) master[1] = tmp[1];
				if (tmp[2] > master[2]) master[2] = tmp[2];
				if (tmp[3] > master[3]) master[3] = tmp[3];
				i++;
			}
			tmp = master;
			master = { _x: tmp[0], _y: tmp[1], _w: tmp[2] - tmp[0], _h: tmp[3] - tmp[1] };

			return master;
		},

		/**@
		* #Crafty.DrawManager.draw
		* @comp Crafty.DrawManager
		* @sign public Crafty.DrawManager.draw()
		* ~~~
		* - If the number of rects is over 60% of the total number of objects
		*	do the naive method redrawing `Crafty.DrawManager.drawAll`
		* - Otherwise, clear the dirty regions, and redraw entities overlapping the dirty regions.
		* ~~~
		* 
        * @see Canvas.draw, DOM.draw
		*/
		draw: function draw() {
			//if nothing in dirty_rects, stop
			if (!dirty_rects.length && !dom.length) return;

			var i = 0, l = dirty_rects.length, k = dom.length, rect, q,
				j, len, dupes, obj, ent, objs = [], ctx = Crafty.canvas.context;

			//loop over all DOM elements needing updating
			for (; i < k; ++i) {
				dom[i].draw()._changed = false;
			}
			//reset DOM array
            dom.length = 0;
			//again, stop if nothing in dirty_rects
			if (!l) { return; }

			//if the amount of rects is over 60% of the total objects
			//do the naive method redrawing
			if (true || l / this.total2D > 0.6) {
				this.drawAll();
				dirty_rects.length = 0;
				return;
			}

			dirty_rects = this.merge(dirty_rects);
			for (i = 0; i < l; ++i) { //loop over every dirty rect
				rect = dirty_rects[i];
				if (!rect) continue;
				q = Crafty.map.search(rect, false); //search for ents under dirty rect

				dupes = {};

				//loop over found objects removing dupes and adding to obj array
				for (j = 0, len = q.length; j < len; ++j) {
					obj = q[j];

					if (dupes[obj[0]] || !obj._visible || !obj.__c.Canvas)
						continue;
					dupes[obj[0]] = true;

					objs.push({ obj: obj, rect: rect });
				}

				//clear the rect from the main canvas
				ctx.clearRect(rect._x, rect._y, rect._w, rect._h);

			}

			//sort the objects by the global Z
			objs.sort(function (a, b) { return a.obj._globalZ - b.obj._globalZ; });
			if (!objs.length){ return; }

			//loop over the objects
			for (i = 0, l = objs.length; i < l; ++i) {
				obj = objs[i];
				rect = obj.rect;
				ent = obj.obj;

				var area = ent._mbr || ent,
					x = (rect._x - area._x <= 0) ? 0 : ~~(rect._x - area._x),
					y = (rect._y - area._y < 0) ? 0 : ~~(rect._y - area._y),
					w = ~~Math.min(area._w - x, rect._w - (area._x - rect._x), rect._w, area._w),
					h = ~~Math.min(area._h - y, rect._h - (area._y - rect._y), rect._h, area._h);

				//no point drawing with no width or height
				if (h === 0 || w === 0) continue;

				ctx.save();
				ctx.beginPath();
				ctx.moveTo(rect._x, rect._y);
				ctx.lineTo(rect._x + rect._w, rect._y);
				ctx.lineTo(rect._x + rect._w, rect._h + rect._y);
				ctx.lineTo(rect._x, rect._h + rect._y);
				ctx.lineTo(rect._x, rect._y);

				ctx.clip();

				ent.draw();
				ctx.closePath();
				ctx.restore();

				//allow entity to re-dirty_rects
				ent._changed = false;
			}

			//empty dirty_rects
			dirty_rects.length = 0;
			//all merged IDs are now invalid
			merged = {};
		}
	};
})();

Crafty.extend({
/**@
* #Crafty.isometric
* @category 2D
* Place entities in a 45deg isometric fashion.
*/
    isometric: {
        _tile: {
            width: 0,
            height: 0
        },
        _elements:{},
        _pos: {
            x:0,
            y:0
        },
        _z: 0,
        /**@
        * #Crafty.isometric.size
        * @comp Crafty.isometric
        * @sign public this Crafty.isometric.size(Number tileSize)
        * @param tileSize - The size of the tiles to place.
        * 
        * Method used to initialize the size of the isometric placement.
        * Recommended to use a size values in the power of `2` (128, 64 or 32).
        * This makes it easy to calculate positions and implement zooming.
        * 
        * @example
        * ~~~
        * var iso = Crafty.isometric.size(128);
        * ~~~
        * 
        * @see Crafty.isometric.place
        */
        size: function (width, height) {
            this._tile.width = width;
            this._tile.height = height > 0 ? height : width/2; //Setup width/2 if height isn't set
            return this;
        },
        /**@
        * #Crafty.isometric.place
        * @comp Crafty.isometric
        * @sign public this Crafty.isometric.place(Number x, Number y, Number z, Entity tile)
        * @param x - The `x` position to place the tile
        * @param y - The `y` position to place the tile
        * @param z - The `z` position or height to place the tile
        * @param tile - The entity that should be position in the isometric fashion
        * 
        * Use this method to place an entity in an isometric grid.
        * 
        * @example
        * ~~~
        * var iso = Crafty.isometric.size(128);
        * iso.place(2, 1, 0, Crafty.e('2D, DOM, Color').color('red').attr({w:128, h:128}));
        * ~~~
        * 
        * @see Crafty.isometric.size
        */
        place: function (x, y, z, obj) {
            var pos = this.pos2px(x,y);
            pos.top -= z * (this._tile.width / 2);
            obj.attr({
                x: pos.left + Crafty.viewport._x, 
                y: pos.top + Crafty.viewport._y
            }).z += z;
            return this;
        },
        /**@
         * #Crafty.isometric.pos2px
         * @comp Crafty.isometric
         * @sign public this Crafty.isometric.pos2px(Number x,Number y)
         * @param x 
         * @param y
         * @return Object {left Number,top Number}
         * 
         * This method calculate the X and Y Coordinates to Pixel Positions
         * 
         * @example
         * ~~~
         * var iso = Crafty.isometric.size(128,96);
         * var position = iso.pos2px(100,100); //Object { left=12800, top=4800}
         * ~~~
         */
        pos2px:function(x,y){
            return {
                left:x * this._tile.width + (y & 1) * (this._tile.width / 2),
                top:y * this._tile.height / 2 
            }
        },
         /**@
         * #Crafty.isometric.px2pos
         * @comp Crafty.isometric
         * @sign public this Crafty.isometric.px2pos(Number left,Number top)
         * @param top 
         * @param left
         * @return Object {x Number,y Number}
         * 
         * This method calculate pixel top,left positions to x,y coordinates
         * 
         * @example
         * ~~~
         * var iso = Crafty.isometric.size(128,96);
         * var px = iso.pos2px(12800,4800);
         * console.log(px); //Object { x=-100, y=-100}
         * ~~~
         */
        px2pos:function(left,top){
            return {
                x:Math.ceil(-left / this._tile.width - (top & 1)*0.5),
                y:-top / this._tile.height * 2
            }; 
        },
        /**@
         * #Crafty.isometric.centerAt
         * @comp Crafty.isometric
         * @sign public this Crafty.isometric.centerAt(Number x,Number y)
         * @param top 
         * @param left
         * 
         * This method center the Viewport at x/y location or gives the current centerpoint of the viewport
         * 
         * @example
         * ~~~
         * var iso = Crafty.isometric.size(128,96).centerAt(10,10); //Viewport is now moved
         * //After moving the viewport by another event you can get the new center point
         * console.log(iso.centerAt());
         * ~~~
         */
        centerAt:function(x,y){   
            if(typeof x == "number" && typeof y == "number"){
                var center = this.pos2px(x,y);
                Crafty.viewport._x = -center.left+Crafty.viewport.width/2-this._tile.width/2;
                Crafty.viewport._y = -center.top+Crafty.viewport.height/2-this._tile.height/2;
                return this;
            }else{
                return {
                    top:-Crafty.viewport._y+Crafty.viewport.height/2-this._tile.height/2,
                    left:-Crafty.viewport._x+Crafty.viewport.width/2-this._tile.width/2
                } 
            }
        },
        /**@
         * #Crafty.isometric.area
         * @comp Crafty.isometric
         * @sign public this Crafty.isometric.area()
         * @return Object {x:{start Number,end Number},y:{start Number,end Number}}
         * 
         * This method get the Area surrounding by the centerpoint depends on viewport height and width
         * 
         * @example
         * ~~~
         * var iso = Crafty.isometric.size(128,96).centerAt(10,10); //Viewport is now moved
         * var area = iso.area(); //get the area
         * for(var y = area.y.start;y <= area.y.end;y++){
         *   for(var x = area.x.start ;x <= area.x.end;x++){
         *       iso.place(x,y,0,Crafty.e("2D,DOM,gras")); //Display tiles in the Screen
         *   }
         * }  
         * ~~~
         */
        area:function(){
            //Get the center Point in the viewport
            var center = this.centerAt();
            var start = this.px2pos(-center.left+Crafty.viewport.width/2,-center.top+Crafty.viewport.height/2);
            var end = this.px2pos(-center.left-Crafty.viewport.width/2,-center.top-Crafty.viewport.height/2);
            return {
                x:{
                    start : start.x,
                    end : end.x
                },
                y:{
                    start : start.y,
                    end : end.y
                }
            };
        } 
    }
});


Crafty.extend({
    /**@
* #Crafty.diamondIso
* @category 2D
* Place entities in a 45deg diamond isometric fashion. It is similar to isometric but has another grid locations
*/
    diamondIso:{
        _tile: {
            width: 0,
            height: 0,
            r:0
        },
        _map:{
            width:0,
            height:0,
            x:0,
            y:0
        },
        
        _origin:{
            x:0,
            y:0
        },
        /**@
        * #Crafty.diamondIso.init
        * @comp Crafty.diamondIso
        * @sign public this Crafty.diamondIso.init(Number tileWidth,Number tileHeight,Number mapWidth,Number mapHeight)
        * @param tileWidth - The size of base tile width in Pixel
        * @param tileHeight - The size of base tile height in Pixel
        * @param mapWidth - The width of whole map in Tiles
        * @param mapHeight - The height of whole map in Tiles
        * 
        * Method used to initialize the size of the isometric placement.
        * Recommended to use a size alues in the power of `2` (128, 64 or 32).
        * This makes it easy to calculate positions and implement zooming.
        * 
        * @example
        * ~~~
        * var iso = Crafty.diamondIso.init(64,128,20,20);
        * ~~~
        * 
        * @see Crafty.diamondIso.place
        */
        init:function(tw, th,mw,mh){
            this._tile.width = parseInt(tw);
            this._tile.height = parseInt(th)||parseInt(tw)/2;
            this._tile.r = this._tile.width / this._tile.height;
            
            this._map.width = parseInt(mw);
            this._map.height = parseInt(mh) || parseInt(mw);
       
            this._origin.x = this._map.height * this._tile.width / 2;
            return this;
        },
   /**@
        * #Crafty.diamondIso.place
        * @comp Crafty.diamondIso
        * @sign public this Crafty.diamondIso.place(Entity tile,Number x, Number y, Number layer)
        * @param x - The `x` position to place the tile
        * @param y - The `y` position to place the tile
        * @param layer - The `z` position to place the tile (calculated by y position * layer)
        * @param tile - The entity that should be position in the isometric fashion
        * 
        * Use this method to place an entity in an isometric grid.
        * 
        * @example
        * ~~~
        * var iso = Crafty.diamondIso.init(64,128,20,20);
        * isos.place(Crafty.e('2D, DOM, Color').color('red').attr({w:128, h:128}),1,1,2);
        * ~~~
        * 
        * @see Crafty.diamondIso.size
        */
        place:function(obj,x,y,layer){
            var pos = this.pos2px(x,y);
            if(!layer) layer = 1;
            var marginX = 0,marginY = 0;
            if(obj.__margin !== undefined){
                marginX = obj.__margin[0];
                marginY = obj.__margin[1];
            }
          
            obj.x = pos.left+(marginX);
            obj.y = (pos.top+marginY)-obj.h;
            obj.z = (pos.top)*layer;
           
            
        },
        centerAt:function(x,y){
            var pos = this.pos2px(x,y);
            Crafty.viewport.x = -pos.left+Crafty.viewport.width/2-this._tile.width;
            Crafty.viewport.y = -pos.top+Crafty.viewport.height/2;
        
        },
        area:function(offset){
            if(!offset) offset = 0;
            //calculate the corners
            var vp = Crafty.viewport.rect();
            var ow = offset*this._tile.width;
            var oh = offset*this._tile.height;
            vp._x -= (this._tile.width/2+ow);
            vp._y -= (this._tile.height/2+oh);
            vp._w += (this._tile.width/2+ow);
            vp._h += (this._tile.height/2+oh); 
            /*  Crafty.viewport.x = -vp._x;
            Crafty.viewport.y = -vp._y;    
            Crafty.viewport.width = vp._w;
            Crafty.viewport.height = vp._h;   */
            
            var grid = [];
            for(var y = vp._y,yl = (vp._y+vp._h);y<yl;y+=this._tile.height/2){
                for(var x = vp._x,xl = (vp._x+vp._w);x<xl;x+=this._tile.width/2){
                    var row = this.px2pos(x,y);
                    grid.push([~~row.x,~~row.y]);
                }
            }
            return grid;       
        },
        pos2px:function(x,y){
            return{
                left:((x-y)*this._tile.width/2+this._origin.x),
                top:((x+y)*this._tile.height/2)
            }
        },
        px2pos:function(left,top){
            var x = (left - this._origin.x)/this._tile.r;
            return {
                x:((top+x) / this._tile.height),
                y:((top-x) / this._tile.height)
            }
        },
        
        polygon:function(obj){
     
            obj.requires("Collision");
            var marginX = 0,marginY = 0;
            if(obj.__margin !== undefined){
                marginX = obj.__margin[0];
                marginY = obj.__margin[1];
            }
            var points = [
            [marginX-0,obj.h-marginY-this._tile.height/2],
            [marginX-this._tile.width/2,obj.h-marginY-0],
            [marginX-this._tile.width,obj.h-marginY-this._tile.height/2],
            [marginX-this._tile.width/2,obj.h-marginY-this._tile.height]
            ];
            var poly = new Crafty.polygon(points);
            return poly;
           
        }
       
    }
});


/**@
* #Particles
* @category Graphics
* Based on Parcycle by Mr. Speaker, licensed under the MIT, Ported by Leo Koppelkamm
* **This is canvas only & won't do anything if the browser doesn't support it!**
* To see how this works take a look in https://github.com/craftyjs/Crafty/blob/master/src/particles.js
*/
Crafty.c("Particles", {
	init: function () {
		//We need to clone it
		this._Particles = Crafty.clone(this._Particles);
	},

	/**@
    * #.particles
    * @comp Particles
    * @sign public this .particles(Object options)
    * @param options - Map of options that specify the behavior and look of the particles.
    *
    * @example
    * ~~~
	* var options = {
	*	maxParticles: 150,
	*	size: 18,
	*	sizeRandom: 4,
	*	speed: 1,
	*	speedRandom: 1.2,
	*	// Lifespan in frames
	*	lifeSpan: 29,
	*	lifeSpanRandom: 7,
	*	// Angle is calculated clockwise: 12pm is 0deg, 3pm is 90deg etc.
	*	angle: 65,
	*	angleRandom: 34,
	*	startColour: [255, 131, 0, 1],
	*	startColourRandom: [48, 50, 45, 0],
	*	endColour: [245, 35, 0, 0],
	*	endColourRandom: [60, 60, 60, 0],
	*	// Only applies when fastMode is off, specifies how sharp the gradients are drawn
	*	sharpness: 20,
	*	sharpnessRandom: 10,
	*	// Random spread from origin
	*	spread: 10,
	*	// How many frames should this last
	*	duration: -1,
	*	// Will draw squares instead of circle gradients
	*	fastMode: false,
	*	gravity: { x: 0, y: 0.1 },
	*	// sensible values are 0-3
	*	jitter: 0
	* }
	*
	* Crafty.e("2D,Canvas,Particles").particles(options);
    * ~~~
    */
	particles: function (options) {

		if (!Crafty.support.canvas || Crafty.deactivateParticles) return this;

		//If we drew on the main canvas, we'd have to redraw
		//potentially huge sections of the screen every frame
		//So we create a separate canvas, where we only have to redraw
		//the changed particles.
		var c, ctx, relativeX, relativeY, bounding;

		c = document.createElement("canvas");
		c.width = Crafty.viewport.width;
		c.height = Crafty.viewport.height;
		c.style.position = 'absolute';

		Crafty.stage.elem.appendChild(c);

		ctx = c.getContext('2d');

		this._Particles.init(options);

		// Clean up the DOM when this component is removed
		this.bind('Remove', function () {
			Crafty.stage.elem.removeChild(c);
		}).bind("RemoveComponent", function (id) {
			if (id === "particles")
				Crafty.stage.elem.removeChild(c);
		});;

		relativeX = this.x + Crafty.viewport.x;
		relativeY = this.y + Crafty.viewport.y;
		this._Particles.position = this._Particles.vectorHelpers.create(relativeX, relativeY);

		var oldViewport = { x: Crafty.viewport.x, y: Crafty.viewport.y };

		this.bind('EnterFrame', function () {
			relativeX = this.x + Crafty.viewport.x;
			relativeY = this.y + Crafty.viewport.y;
			this._Particles.viewportDelta = { x: Crafty.viewport.x - oldViewport.x, y: Crafty.viewport.y - oldViewport.y };

			oldViewport = { x: Crafty.viewport.x, y: Crafty.viewport.y };

			this._Particles.position = this._Particles.vectorHelpers.create(relativeX, relativeY);

			//Selective clearing
			if (typeof Crafty.DrawManager.boundingRect == 'function') {
				bounding = Crafty.DrawManager.boundingRect(this._Particles.register);
				if (bounding) ctx.clearRect(bounding._x, bounding._y, bounding._w, bounding._h);
			} else {
				ctx.clearRect(0, 0, Crafty.viewport.width, Crafty.viewport.height);
			}

			//This updates all particle colors & positions
			this._Particles.update();

			//This renders the updated particles
			this._Particles.render(ctx);
		});
		return this;
	},
	_Particles: {
		presets: {
			maxParticles: 150,
			size: 18,
			sizeRandom: 4,
			speed: 1,
			speedRandom: 1.2,
			// Lifespan in frames
			lifeSpan: 29,
			lifeSpanRandom: 7,
			// Angle is calculated clockwise: 12pm is 0deg, 3pm is 90deg etc.
			angle: 65,
			angleRandom: 34,
			startColour: [255, 131, 0, 1],
			startColourRandom: [48, 50, 45, 0],
			endColour: [245, 35, 0, 0],
			endColourRandom: [60, 60, 60, 0],
			// Only applies when fastMode is off, specifies how sharp the gradients are drawn
			sharpness: 20,
			sharpnessRandom: 10,
			// Random spread from origin
			spread: 10,
			// How many frames should this last
			duration: -1,
			// Will draw squares instead of circle gradients
			fastMode: false,
			gravity: { x: 0, y: 0.1 },
			// sensible values are 0-3
			jitter: 0,

			//Don't modify the following
			particles: [],
			active: true,
			particleCount: 0,
			elapsedFrames: 0,
			emissionRate: 0,
			emitCounter: 0,
			particleIndex: 0
		},


		init: function (options) {
			this.position = this.vectorHelpers.create(0, 0);
			if (typeof options == 'undefined') var options = {};

			//Create current config by merging given options and presets.
			for (key in this.presets) {
				if (typeof options[key] != 'undefined') this[key] = options[key];
				else this[key] = this.presets[key];
			}

			this.emissionRate = this.maxParticles / this.lifeSpan;
			this.positionRandom = this.vectorHelpers.create(this.spread, this.spread);
		},

		addParticle: function () {
			if (this.particleCount == this.maxParticles) {
				return false;
			}

			// Take the next particle out of the particle pool we have created and initialize it
			var particle = new this.particle(this.vectorHelpers);
			this.initParticle(particle);
			this.particles[this.particleCount] = particle;
			// Increment the particle count
			this.particleCount++;

			return true;
		},
		RANDM1TO1: function () {
			return Math.random() * 2 - 1;
		},
		initParticle: function (particle) {
			particle.position.x = this.position.x + this.positionRandom.x * this.RANDM1TO1();
			particle.position.y = this.position.y + this.positionRandom.y * this.RANDM1TO1();

			var newAngle = (this.angle + this.angleRandom * this.RANDM1TO1()) * (Math.PI / 180); // convert to radians
			var vector = this.vectorHelpers.create(Math.sin(newAngle), -Math.cos(newAngle)); // Could move to lookup for speed
			var vectorSpeed = this.speed + this.speedRandom * this.RANDM1TO1();
			particle.direction = this.vectorHelpers.multiply(vector, vectorSpeed);

			particle.size = this.size + this.sizeRandom * this.RANDM1TO1();
			particle.size = particle.size < 0 ? 0 : ~~particle.size;
			particle.timeToLive = this.lifeSpan + this.lifeSpanRandom * this.RANDM1TO1();

			particle.sharpness = this.sharpness + this.sharpnessRandom * this.RANDM1TO1();
			particle.sharpness = particle.sharpness > 100 ? 100 : particle.sharpness < 0 ? 0 : particle.sharpness;
			// internal circle gradient size - affects the sharpness of the radial gradient
			particle.sizeSmall = ~~((particle.size / 200) * particle.sharpness); //(size/2/100)
			var start = [
				this.startColour[0] + this.startColourRandom[0] * this.RANDM1TO1(),
				this.startColour[1] + this.startColourRandom[1] * this.RANDM1TO1(),
				this.startColour[2] + this.startColourRandom[2] * this.RANDM1TO1(),
				this.startColour[3] + this.startColourRandom[3] * this.RANDM1TO1()
				];

			var end = [
				this.endColour[0] + this.endColourRandom[0] * this.RANDM1TO1(),
				this.endColour[1] + this.endColourRandom[1] * this.RANDM1TO1(),
				this.endColour[2] + this.endColourRandom[2] * this.RANDM1TO1(),
				this.endColour[3] + this.endColourRandom[3] * this.RANDM1TO1()
				];

			particle.colour = start;
			particle.deltaColour[0] = (end[0] - start[0]) / particle.timeToLive;
			particle.deltaColour[1] = (end[1] - start[1]) / particle.timeToLive;
			particle.deltaColour[2] = (end[2] - start[2]) / particle.timeToLive;
			particle.deltaColour[3] = (end[3] - start[3]) / particle.timeToLive;
		},
		update: function () {
			if (this.active && this.emissionRate > 0) {
				var rate = 1 / this.emissionRate;
				this.emitCounter++;
				while (this.particleCount < this.maxParticles && this.emitCounter > rate) {
					this.addParticle();
					this.emitCounter -= rate;
				}
				this.elapsedFrames++;
				if (this.duration != -1 && this.duration < this.elapsedFrames) {
					this.stop();
				}
			}

			this.particleIndex = 0;
			this.register = [];
			var draw;
			while (this.particleIndex < this.particleCount) {

				var currentParticle = this.particles[this.particleIndex];

				// If the current particle is alive then update it
				if (currentParticle.timeToLive > 0) {

					// Calculate the new direction based on gravity
					currentParticle.direction = this.vectorHelpers.add(currentParticle.direction, this.gravity);
					currentParticle.position = this.vectorHelpers.add(currentParticle.position, currentParticle.direction);
					currentParticle.position = this.vectorHelpers.add(currentParticle.position, this.viewportDelta);
					if (this.jitter) {
						currentParticle.position.x += this.jitter * this.RANDM1TO1();
						currentParticle.position.y += this.jitter * this.RANDM1TO1();
					}
					currentParticle.timeToLive--;

					// Update colours
					var r = currentParticle.colour[0] += currentParticle.deltaColour[0];
					var g = currentParticle.colour[1] += currentParticle.deltaColour[1];
					var b = currentParticle.colour[2] += currentParticle.deltaColour[2];
					var a = currentParticle.colour[3] += currentParticle.deltaColour[3];

					// Calculate the rgba string to draw.
					draw = [];
					draw.push("rgba(" + (r > 255 ? 255 : r < 0 ? 0 : ~~r));
					draw.push(g > 255 ? 255 : g < 0 ? 0 : ~~g);
					draw.push(b > 255 ? 255 : b < 0 ? 0 : ~~b);
					draw.push((a > 1 ? 1 : a < 0 ? 0 : a.toFixed(2)) + ")");
					currentParticle.drawColour = draw.join(",");

					if (!this.fastMode) {
						draw[3] = "0)";
						currentParticle.drawColourEnd = draw.join(",");
					}

					this.particleIndex++;
				} else {
					// Replace particle with the last active
					if (this.particleIndex != this.particleCount - 1) {
						this.particles[this.particleIndex] = this.particles[this.particleCount - 1];
					}
					this.particleCount--;
				}
				var rect = {};
				rect._x = ~~currentParticle.position.x;
				rect._y = ~~currentParticle.position.y;
				rect._w = currentParticle.size;
				rect._h = currentParticle.size;

				this.register.push(rect);
			}
		},

		stop: function () {
			this.active = false;
			this.elapsedFrames = 0;
			this.emitCounter = 0;
		},

		render: function (context) {

			for (var i = 0, j = this.particleCount; i < j; i++) {
				var particle = this.particles[i];
				var size = particle.size;
				var halfSize = size >> 1;

				if (particle.position.x + size < 0
					|| particle.position.y + size < 0
					|| particle.position.x - size > Crafty.viewport.width
					|| particle.position.y - size > Crafty.viewport.height) {
					//Particle is outside
					continue;
				}
				var x = ~~particle.position.x;
				var y = ~~particle.position.y;

				if (this.fastMode) {
					context.fillStyle = particle.drawColour;
				} else {
					var radgrad = context.createRadialGradient(x + halfSize, y + halfSize, particle.sizeSmall, x + halfSize, y + halfSize, halfSize);
					radgrad.addColorStop(0, particle.drawColour);
					//0.9 to avoid visible boxing
					radgrad.addColorStop(0.9, particle.drawColourEnd);
					context.fillStyle = radgrad;
				}
				context.fillRect(x, y, size, size);
			}
		},
		particle: function (vectorHelpers) {
			this.position = vectorHelpers.create(0, 0);
			this.direction = vectorHelpers.create(0, 0);
			this.size = 0;
			this.sizeSmall = 0;
			this.timeToLive = 0;
			this.colour = [];
			this.drawColour = "";
			this.deltaColour = [];
			this.sharpness = 0;
		},
		vectorHelpers: {
			create: function (x, y) {
				return {
					"x": x,
					"y": y
				};
			},
			multiply: function (vector, scaleFactor) {
				vector.x *= scaleFactor;
				vector.y *= scaleFactor;
				return vector;
			},
			add: function (vector1, vector2) {
				vector1.x += vector2.x;
				vector1.y += vector2.y;
				return vector1;
			}
		}
	}
});
Crafty.extend({
	/**@
	 * #Crafty.audio
	 * @category Audio
	 *
	 * Add sound files and play them. Chooses best format for browser support.
	 * Due to the nature of HTML5 audio, three types of audio files will be
	 * required for cross-browser capabilities. These formats are MP3, Ogg and WAV.
	 * When sound was not muted on before pause, sound will be unmuted after unpause.
	 * When sound is muted Crafty.pause() does not have any effect on sound.
	 */
	audio : {
		sounds : {},
		supported : {},
		codecs : {// Chart from jPlayer
			ogg : 'audio/ogg; codecs="vorbis"', //OGG
			wav : 'audio/wav; codecs="1"', // PCM
			webma : 'audio/webm; codecs="vorbis"', // WEBM
			mp3 : 'audio/mpeg; codecs="mp3"', //MP3
			m4a : 'audio/mp4; codecs="mp4a.40.2"'// AAC / MP4
		},
		volume : 1, //Global Volume
		muted : false,
		paused : false,
		/**
		 * Function to setup supported formats
		 **/
		canPlay : function() {
			var audio = this.audioElement(), canplay;
			for (var i in this.codecs) {
				canplay = audio.canPlayType(this.codecs[i]);
				if (canplay !== "" && canplay !== "no") {
					this.supported[i] = true;
				} else {
					this.supported[i] = false;
				}
			}

		},
		/**
		 * Function to get an Audio Element
		 **/
		audioElement : function() {
			//IE does not support Audio Object
			return typeof Audio !== 'undefined' ? new Audio("") : document.createElement('audio');
		},
		/**@
		 * #Crafty.audio.add
		 * @comp Crafty.audio
		 * @sign public this Crafty.audio.add(String id, String url)
		 * @param id - A string to refer to sounds
		 * @param url - A string pointing to the sound file
		 * @sign public this Crafty.audio.add(String id, Array urls)
		 * @param urls - Array of urls pointing to different format of the same sound, selecting the first that is playable
		 * @sign public this Crafty.audio.add(Object map)
		 * @param map - key-value pairs where the key is the `id` and the value is either a `url` or `urls`
		 *
		 * Loads a sound to be played. Due to the nature of HTML5 audio,
		 * three types of audio files will be required for cross-browser capabilities.
		 * These formats are MP3, Ogg and WAV.
		 *
		 * Passing an array of URLs will determine which format the browser can play and select it over any other.
		 *
		 * Accepts an object where the key is the audio name and
		 * either a URL or an Array of URLs (to determine which type to use).
		 *
		 * The ID you use will be how you refer to that sound when using `Crafty.audio.play`.
		 *
		 * @example
		 * ~~~
		 * //adding audio from an object
		 * Crafty.audio.add({
		 * shoot: ["sounds/shoot.wav",
		 * "sounds/shoot.mp3",
		 * "sounds/shoot.ogg"],
		 *
		 * coin: "sounds/coin.mp3"
		 * });
		 *
		 * //adding a single sound
		 * Crafty.audio.add("walk", [
		 * "sounds/walk.mp3",
		 * "sounds/walk.ogg",
		 * "sounds/walk.wav"
		 * ]);
		 *
		 * //only one format
		 * Crafty.audio.add("jump", "sounds/jump.mp3");
		 * ~~~
		 */
		add : function(id, url) {
			Crafty.support.audio = !!this.audioElement().canPlayType;
			//Setup audio support
			if (!Crafty.support.audio)
				return;

			this.canPlay();
			//Setup supported Extensions

			var audio, ext, path;
			if (arguments.length === 1 && typeof id === "object") {
				for (var i in id) {
					for (var src in id[i]) {
						audio = this.audioElement();
						audio.id = i;
						audio.preload = "auto";
						audio.volume = Crafty.audio.volume;
						path = id[i][src];
						ext = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
						if (this.supported[ext]) {
							audio.src = path;
							Crafty.asset(path, audio);
							this.sounds[i] = {
								obj : audio,
								played : 0,
								volume : Crafty.audio.volume
							}
						}

					}
				}
			}
			if ( typeof id === "string") {
				audio = this.audioElement();
				audio.id = id;
				audio.preload = "auto";
				audio.volume = Crafty.audio.volume;

				if ( typeof url === "string") {
					ext = url.substr(url.lastIndexOf('.') + 1).toLowerCase();
					if (this.supported[ext]) {
						audio.src = url;
						Crafty.asset(url, audio);
						this.sounds[id] = {
							obj : audio,
							played : 0,
							volume : Crafty.audio.volume
						}

					}

				}

				if ( typeof url === "object") {
					for (src in url) {
						audio = this.audioElement();
						audio.id = id;
						audio.preload = "auto";
						audio.volume = Crafty.audio.volume;
						path = url[src];
						ext = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
						if (this.supported[ext]) {
							audio.src = path;
							Crafty.asset(path, audio);
							this.sounds[id] = {
								obj : audio,
								played : 0,
								volume : Crafty.audio.volume
							}
						}

					}
				}

			}

		},
		/**@
		 * #Crafty.audio.play
		 * @comp Crafty.audio
		 * @sign public this Crafty.audio.play(String id)
		 * @sign public this Crafty.audio.play(String id, Number repeatCount)
		 * @sign public this Crafty.audio.play(String id, Number repeatCount,Number volume)
		 * @param id - A string to refer to sounds
		 * @param repeatCount - Repeat count for the file, where -1 stands for repeat forever.
		 * @param volume - volume can be a number between 0.0 and 1.0
		 *
		 * Will play a sound previously added by using the ID that was used in `Crafty.audio.add`.
		 * Has a default maximum of 5 channels so that the same sound can play simultaneously unless all of the channels are playing.

		 * *Note that the implementation of HTML5 Audio is buggy at best.*
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.play("walk");
		 *
		 * //play and repeat forever
		 * Crafty.audio.play("backgroundMusic", -1);
		 * Crafty.audio.play("explosion",1,0.5); //play sound once with volume of 50%
		 * ~~~
		 */
		play : function(id, repeat, volume) {
			if (repeat == 0 || !Crafty.support.audio || !this.sounds[id])
				return;
			var s = this.sounds[id];
			s.volume = s.obj.volume = volume || Crafty.audio.volume;
			if (s.obj.currentTime)
				s.obj.currentTime = 0;
			if (this.muted)
				s.obj.volume = 0;
			s.obj.play();
			s.played++;
			s.obj.addEventListener("ended", function() {
				if (s.played < repeat || repeat == -1) {
					if (this.currentTime)
						this.currentTime = 0;
					this.play();
					s.played++;
				}
			}, true);
		},
		/**@
		 * #Crafty.audio.stop
		 * @sign public this Crafty.audio.stop([Number ID])
		 *
		 * Stops any playing sound. if id is not set, stop all sounds which are playing
		 *
		 * @example
		 * ~~~
		 * //all sounds stopped playing now
		 * Crafty.audio.stop();
		 *
		 * ~~~
		 */
		stop : function(id) {
			if (!Crafty.support.audio)
				return;
			var s;
			if (!id) {
				for (var i in this.sounds) {
					s = this.sounds[i];
					if (!s.obj.paused)
						s.obj.pause();
				}
			}
			if (!this.sounds[id])
				return;
			s = this.sounds[id];
			if (!s.obj.paused)
				s.obj.pause();
		},
		/**
		 * #Crafty.audio._mute
		 * @sign public this Crafty.audio._mute([Boolean mute])
		 *
		 * Mute or unmute every Audio instance that is playing.
		 */
		_mute : function(mute) {
			if (!Crafty.support.audio)
				return;
			var s;
			for (var i in this.sounds) {
				s = this.sounds[i];
				s.obj.volume = mute ? 0 : s.volume;
			}
			this.muted = mute;
		},
		/**@
		 * #Crafty.audio.toggleMute
		 * @sign public this Crafty.audio.toggleMute()
		 *
		 * Mute or unmute every Audio instance that is playing. Toggles between
		 * pausing or playing depending on the state.
		 *
		 * @example
		 * ~~~
		 * //toggle mute and unmute depending on current state
		 * Crafty.audio.toggleMute();
		 * ~~~
		 */
		toggleMute : function() {
			if (!this.muted) {
				this._mute(true);
			} else {
				this._mute(false);
			}

		},
		/**@
		 * #Crafty.audio.mute
		 * @sign public this Crafty.audio.mute()
		 *
		 * Mute every Audio instance that is playing.
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.mute();
		 * ~~~
		 */
		mute : function() {
			this._mute(true);
		},
		/**@
		 * #Crafty.audio.unmute
		 * @sign public this Crafty.audio.unmute()
		 *
		 * Unmute every Audio instance that is playing.
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.unmute();
		 * ~~~
		 */
		unmute : function() {
			this._mute(false);
		},

		/**@
		 * #Crafty.audio.pause
		 * @sign public this Crafty.audio.pause(string ID)
		 *
		 * Pause the Audio instance specified by id param.
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.pause('music');
		 * ~~~
		 *
		 * @param {string} id The id of the audio object to pause
		 */
		pause : function(id) {
			if (!Crafty.support.audio || !id || !this.sounds[id])
				return;
			var s = this.sounds[id];
			if (!s.obj.paused)
				s.obj.pause();
		},

		/**@
		 * #Crafty.audio.unpause
		 * @sign public this Crafty.audio.unpause(string ID)
		 *
		 * Resume playing the Audio instance specified by id param.
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.unpause('music');
		 * ~~~
		 *
		 * @param {string} id The id of the audio object to unpause
		 */
		unpause : function(id) {
			if (!Crafty.support.audio || !id || !this.sounds[id])
				return;
			var s = this.sounds[id];
			if (s.obj.paused)
				s.obj.play();
		},

		/**@
		 * #Crafty.audio.togglePause
		 * @sign public this Crafty.audio.togglePause(string ID)
		 *
		 * Toggle the pause status of the Audio instance specified by id param.
		 *
		 * @example
		 * ~~~
		 * Crafty.audio.togglePause('music');
		 * ~~~
		 *
		 * @param {string} id The id of the audio object to pause/unpause
		 */
		togglePause : function(id) {
			if (!Crafty.support.audio || !id || !this.sounds[id])
				return;
			var s = this.sounds[id];
			if (s.obj.paused) {
				s.obj.play();
			} else {
				s.obj.pause();
			}
		}
	}
});

/**@
* #Text
* @category Graphics
* @trigger Change - when the text is changed
* @requires Canvas or DOM
* Component to draw text inside the body of an entity.
*/
Crafty.c("Text", {
	_text: "",
	_textFont: {
		"type": "",
		"weight": "",
		"size": "",
		"family": ""
	},
	ready: true,

	init: function () {
		this.requires("2D");

		this.bind("Draw", function (e) {
			var font = this._textFont["type"] + ' ' + this._textFont["weight"] + ' ' +
				this._textFont["size"] + ' ' + this._textFont["family"];

			if (e.type === "DOM") {
				var el = this._element,
					style = el.style;

				style.color = this._textColor;
				style.font = font;
				el.innerHTML = this._text;
			} else if (e.type === "canvas") {
				var context = e.ctx,
                    metrics = null;

				context.save();

				context.fillStyle = this._textColor || "rgb(0,0,0)";
				context.font = font;

				context.translate(this.x, this.y + this.h);
				context.fillText(this._text, 0, 0);

				metrics = context.measureText(this._text);
				this._w = metrics.width;

				context.restore();
			}
		});
	},

	/**@
    * #.text
    * @comp Text
    * @sign public this .text(String text)
    * @sign public this .text(Function textgenerator)
    * @param text - String of text that will be inserted into the DOM or Canvas element.
    * 
    * This method will update the text inside the entity.
    * If you use DOM, to modify the font, use the `.css` method inherited from the DOM component.
    *
    * If you need to reference attributes on the entity itself you can pass a function instead of a string.
    * 
    * @example
    * ~~~
    * Crafty.e("2D, DOM, Text").attr({ x: 100, y: 100 }).text("Look at me!!");
    *
    * Crafty.e("2D, DOM, Text").attr({ x: 100, y: 100 })
    *     .text(function () { return "My position is " + this._x });
    *
    * Crafty.e("2D, Canvas, Text").attr({ x: 100, y: 100 }).text("Look at me!!");
    *
    * Crafty.e("2D, Canvas, Text").attr({ x: 100, y: 100 })
    *     .text(function () { return "My position is " + this._x });
    * ~~~
    */
	text: function (text) {
		if (!(typeof text !== "undefined" && text !== null)) return this._text;
		if (typeof(text) == "function")
			this._text = text.call(this);
		else
			this._text = text;
		this.trigger("Change");
		return this;
	},

	/**@
    * #.textColor
    * @comp Text
    * @sign public this .textColor(String color, Number strength)
    * @param color - The color in hexadecimal
    * @param strength - Level of opacity
    *
    * Modify the text color and level of opacity.
    * 
    * @example
    * ~~~
    * Crafty.e("2D, DOM, Text").attr({ x: 100, y: 100 }).text("Look at me!!")
    *   .textColor('#FF0000');
    *
    * Crafty.e("2D, Canvas, Text").attr({ x: 100, y: 100 }).text('Look at me!!')
    *   .textColor('#FF0000', 0.6);
    * ~~~
    * @see Crafty.toRGB
    */
	textColor: function (color, strength) {
		this._strength = strength;
		this._textColor = Crafty.toRGB(color, this._strength);
		this.trigger("Change");
		return this;
	},

	/**@
    * #.textFont
    * @comp Text
    * @triggers Change
    * @sign public this .textFont(String key, * value)
    * @param key - Property of the entity to modify
    * @param value - Value to set the property to
    *
    * @sign public this .textFont(Object map)
    * @param map - Object where the key is the property to modify and the value as the property value
    *
    * Use this method to set font property of the text entity.
    * 
    * @example
    * ~~~
    * Crafty.e("2D, DOM, Text").textFont({ type: 'italic', family: 'Arial' });
    * Crafty.e("2D, Canvas, Text").textFont({ size: '20px', weight: 'bold' });
    *
    * Crafty.e("2D, Canvas, Text").textFont("type", "italic");
    * Crafty.e("2D, Canvas, Text").textFont("type"); // italic
    * ~~~
    */
	textFont: function (key, value) {
		if (arguments.length === 1) {
			//if just the key, return the value
			if (typeof key === "string") {
				return this._textFont[key];
			}

			if (typeof key === "object") {
				for (propertyKey in key) {
					this._textFont[propertyKey] = key[propertyKey];
				}
			}
		} else {
			this._textFont[key] = value;
		}

		this.trigger("Change");
		return this;
	}
});

Crafty.extend({
/**@
	* #Crafty.assets
	* @category Assets
	* An object containing every asset used in the current Crafty game.
	* The key is the URL and the value is the `Audio` or `Image` object.
	*
	* If loading an asset, check that it is in this object first to avoid loading twice.
	* 
	* @example
	* ~~~
	* var isLoaded = !!Crafty.assets["images/sprite.png"];
	* ~~~
	* @see Crafty.loader
	*/
	assets: {},

    /**@
    * #Crafty.asset
    * @category Assets
    * 
    * @trigger NewAsset - After setting new asset - Object - key and value of new added asset.
    * @sign public void Crafty.asset(String key, Object asset)
    * @param key - asset url.
    * @param asset - Audio` or `Image` object.
    * Add new asset to assets object.
    * 
    * @sign public void Crafty.asset(String key)
    * @param key - asset url.
    * Get asset from assets object.
    * 
    * @example
    * ~~~
    * Crafty.asset(key, value);
    * var asset = Crafty.asset(key); //object with key and value fields
    * ~~~
    * 
    * @see Crafty.assets
    */
    asset: function(key, value) {
        if (arguments.length === 1) {
            return Crafty.assets[key];
        }

        if (!Crafty.assets[key]) {
            Crafty.assets[key] = value;
            this.trigger("NewAsset", {key : key, value : value});
        }
    },
        /**@
	* #Crafty.image_whitelist
	* @category Assets
	* 
    * 
    * A list of file extensions that can be loaded as images by Crafty.load
    *
	* @example
	* ~~~
        * Crafty.image_whitelist.push("tif")
	* Crafty.load(["images/sprite.tif", "sounds/jump.mp3"],
	*     function() {
	*         //when loaded
	*         Crafty.scene("main"); //go to main scene
	*         Crafty.audio.play("jump.mp3"); //Play the audio file
	*     },
	*
	*     function(e) {
	*       //progress
	*     },
	*
	*     function(e) {
	*       //uh oh, error loading
	*     }
	* );
	* ~~~
	* 
	* @see Crafty.asset
        * @see Crafty.load
	*/
    image_whitelist: ["jpg", "jpeg", "gif", "png", "svg"],
	/**@
	* #Crafty.loader
	* @category Assets
	* @sign public void Crafty.load(Array assets, Function onLoad[, Function onProgress, Function onError])
	* @param assets - Array of assets to load (accepts sounds and images)
	* @param onLoad - Callback when the assets are loaded
	* @param onProgress - Callback when an asset is loaded. Contains information about assets loaded
	* @param onError - Callback when an asset fails to load
	* 
	* Preloader for all assets. Takes an array of URLs and
	* adds them to the `Crafty.assets` object.
	*
	* Files with suffixes in `image_whitelist` (case insensitive) will be loaded.
	*
	* If `Crafty.support.audio` is `true`, files with the following suffixes `mp3`, `wav`, `ogg` and `mp4` (case insensitive) can be loaded.
	*
	* The `onProgress` function will be passed on object with information about
	* the progress including how many assets loaded, total of all the assets to
	* load and a percentage of the progress.
    * ~~~
    * { loaded: j, total: total, percent: (j / total * 100) ,src:src})
	* ~~~
	*
	* `onError` will be passed with the asset that couldn't load.
    *
	* When `onError` is not provided, the onLoad is loaded even some assets are not successfully loaded. Otherwise, onLoad will be called no matter whether there are errors or not. 
	* 
	* @example
	* ~~~
	* Crafty.load(["images/sprite.png", "sounds/jump.mp3"],
	*     function() {
	*         //when loaded
	*         Crafty.scene("main"); //go to main scene
	*         Crafty.audio.play("jump.mp3"); //Play the audio file
	*     },
	*
	*     function(e) {
	*       //progress
	*     },
	*
	*     function(e) {
	*       //uh oh, error loading
	*     }
	* );
	* ~~~
	* 
	* @see Crafty.assets
        * @see Crafty.image_whitelist
	*/
    load: function (data, oncomplete, onprogress, onerror) {
            
        var i = 0, l = data.length, current, obj, total = l, j = 0, ext = "" ;
  
        //Progress function
        function pro(){
            var src = this.src;
           
            //Remove events cause audio trigger this event more than once(depends on browser)
            if (this.removeEventListener) {  
                this.removeEventListener('canplaythrough', pro, false);     
            }
           
            ++j;
            //if progress callback, give information of assets loaded, total and percent
            if (onprogress) 
                onprogress({
                    loaded: j, 
                    total: total, 
                    percent: (j / total * 100),
                    src:src
                });
				
            if(j === total && oncomplete) oncomplete();
        };
        //Error function
        function err(){
            var src = this.src;
            if (onerror) 
                onerror({
                    loaded: j, 
                    total: total, 
                    percent: (j / total * 100),
                    src:src
                });
           		
            j++;
            if(j === total && oncomplete) oncomplete();
        };
           
        for (; i < l; ++i) {       
            current = data[i];
            ext = current.substr(current.lastIndexOf('.') + 1, 3).toLowerCase();
           
            obj = Crafty.asset(current) || null;   
          
            if (Crafty.support.audio && Crafty.audio.supported[ext]) {   
                //Create new object if not exists
                if(!obj){
                    var name = current.substr(current.lastIndexOf('/') + 1).toLowerCase();
                    obj = Crafty.audio.audioElement();
                    obj.id = name;
                    obj.src = current;
                    obj.preload = "auto";
                    obj.volume = Crafty.audio.volume;
                    Crafty.asset(current, obj);
                    Crafty.audio.sounds[name] = {
                        obj:obj,
                        played:0
                    } 
                }
        
                //addEventListener is supported on IE9 , Audio as well
                if (obj.addEventListener) {  
                    obj.addEventListener('canplaythrough', pro, false);     
                }
                   
                 
            } else if (Crafty.image_whitelist.indexOf(ext) >= 0) { 
                if(!obj) {
                    obj = new Image();
                    Crafty.asset(current, obj);   
                }
                obj.onload=pro;
                obj.src = current; //setup src after onload function Opera/IE Bug
             
            } else {
                total--;
                continue; //skip if not applicable
            }
            obj.onerror = err;
        }
       
       
    },
	/**@
	* #Crafty.modules
	* @category Assets
	* @sign public void Crafty.modules([String repoLocation,] Object moduleMap[, Function onLoad])
	* @param modules - Map of name:version pairs for modules to load
	* @param onLoad - Callback when the modules are loaded
	* 
	* Browse the selection of community modules on http://craftycomponents.com
	* 
    * It is possible to create your own repository.
	*
	*
	* @example
	* ~~~
	* // Loading from default repository
	* Crafty.modules({ moveto: 'DEV' }, function () {
	*     //module is ready
	*     Crafty.e("MoveTo, 2D, DOM");
	* });
	*
	* // Loading from your own server
	* Crafty.modules({ 'http://mydomain.com/js/mystuff.js': 'DEV' }, function () {
	*     //module is ready
	*     Crafty.e("MoveTo, 2D, DOM");
	* });
	*
	* // Loading from alternative repository
	* Crafty.modules('http://cdn.crafty-modules.com', { moveto: 'DEV' }, function () {
	*     //module is ready
	*     Crafty.e("MoveTo, 2D, DOM");
	* });
	*
	* // Loading from the latest component website
	* Crafty.modules(
	*     'http://cdn.craftycomponents.com'
	*     , { MoveTo: 'release' }
	*     , function () {
	*     Crafty.e("2D, DOM, Color, MoveTo")
	*       .attr({x: 0, y: 0, w: 50, h: 50})
	*       .color("green");
	*     });
	* });
	* ~~~
	*
	*/
	modules: function (modulesRepository, moduleMap, oncomplete) {

		if (arguments.length === 2 && typeof modulesRepository === "object") {
			oncomplete = moduleMap;
			moduleMap = modulesRepository;
			modulesRepository = 'http://cdn.craftycomponents.com';
		}

		/*!
		  * $script.js Async loader & dependency manager
		  * https://github.com/ded/script.js
		  * (c) Dustin Diaz, Jacob Thornton 2011
		  * License: MIT
		  */
		var $script = (function () {
			var win = this, doc = document
			, head = doc.getElementsByTagName('head')[0]
			, validBase = /^https?:\/\//
			, old = win.$script, list = {}, ids = {}, delay = {}, scriptpath
			, scripts = {}, s = 'string', f = false
			, push = 'push', domContentLoaded = 'DOMContentLoaded', readyState = 'readyState'
			, addEventListener = 'addEventListener', onreadystatechange = 'onreadystatechange'

			function every(ar, fn, i) {
				for (i = 0, j = ar.length; i < j; ++i) if (!fn(ar[i])) return f
				return 1
			}
			function each(ar, fn) {
				every(ar, function (el) {
					return !fn(el)
				})
			}

			if (!doc[readyState] && doc[addEventListener]) {
				doc[addEventListener](domContentLoaded, function fn() {
					doc.removeEventListener(domContentLoaded, fn, f)
					doc[readyState] = 'complete'
				}, f)
				doc[readyState] = 'loading'
			}

			function $script(paths, idOrDone, optDone) {
				paths = paths[push] ? paths : [paths]
				var idOrDoneIsDone = idOrDone && idOrDone.call
				, done = idOrDoneIsDone ? idOrDone : optDone
				, id = idOrDoneIsDone ? paths.join('') : idOrDone
				, queue = paths.length
				function loopFn(item) {
					return item.call ? item() : list[item]
				}
				function callback() {
					if (!--queue) {
						list[id] = 1
						done && done()
						for (var dset in delay) {
							every(dset.split('|'), loopFn) && !each(delay[dset], loopFn) && (delay[dset] = [])
						}
					}
				}
				setTimeout(function () {
					each(paths, function (path) {
						if (scripts[path]) {
							id && (ids[id] = 1)
							return scripts[path] == 2 && callback()
						}
						scripts[path] = 1
						id && (ids[id] = 1)
						create(!validBase.test(path) && scriptpath ? scriptpath + path + '.js' : path, callback)
					})
				}, 0)
				return $script
			}

			function create(path, fn) {
				var el = doc.createElement('script')
				, loaded = f
				el.onload = el.onerror = el[onreadystatechange] = function () {
					if ((el[readyState] && !(/^c|loade/.test(el[readyState]))) || loaded) return;
					el.onload = el[onreadystatechange] = null
					loaded = 1
					scripts[path] = 2
					fn()
				}
				el.async = 1
				el.src = path
				head.insertBefore(el, head.firstChild)
			}

			$script.get = create

			$script.order = function (scripts, id, done) {
				(function callback(s) {
					s = scripts.shift()
					if (!scripts.length) $script(s, id, done)
					else $script(s, callback)
				}())
			}

			$script.path = function (p) {
				scriptpath = p
			}
			$script.ready = function (deps, ready, req) {
				deps = deps[push] ? deps : [deps]
				var missing = [];
				!each(deps, function (dep) {
					list[dep] || missing[push](dep);
				}) && every(deps, function (dep) { return list[dep] }) ?
				ready() : !function (key) {
					delay[key] = delay[key] || []
					delay[key][push](ready)
					req && req(missing)
				}(deps.join('|'))
				return $script
			}

			$script.noConflict = function () {
				win.$script = old;
				return this
			}

			return $script
		})();

		var modules = [];
		var validBase = /^(https?|file):\/\//;
		for (var i in moduleMap) {
			if (validBase.test(i))
				modules.push(i)
			else
				modules.push(modulesRepository + '/' + i.toLowerCase() + '-' + moduleMap[i].toLowerCase() + '.js');
		}

		$script(modules, function () {
			if (oncomplete) oncomplete();
		});
	}
});

/**@
* #Crafty.math
* @category 2D
* Static functions.
*/
Crafty.math = {
/**@
	 * #Crafty.math.abs
	 * @comp Crafty.math
     * @sign public this Crafty.math.abs(Number n)
     * @param n - Some value.
     * @return Absolute value.
     * 
	 * Returns the absolute value.
     */
	abs: function (x) {
		return x < 0 ? -x : x;
	},

	/**@
     * #Crafty.math.amountOf
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.amountOf(Number checkValue, Number minValue, Number maxValue)
     * @param checkValue - Value that should checked with minimum and maximum.
     * @param minValue - Minimum value to check.
     * @param maxValue - Maximum value to check.
     * @return Amount of checkValue compared to minValue and maxValue.
     * 
	 * Returns the amount of how much a checkValue is more like minValue (=0)
     * or more like maxValue (=1)
     */
	amountOf: function (checkValue, minValue, maxValue) {
		if (minValue < maxValue)
			return (checkValue - minValue) / (maxValue - minValue);
		else
			return (checkValue - maxValue) / (minValue - maxValue);
	},


	/**@
     * #Crafty.math.clamp
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.clamp(Number value, Number min, Number max)
     * @param value - A value.
     * @param max - Maximum that value can be.
     * @param min - Minimum that value can be.
     * @return The value between minimum and maximum.
     * 
	 * Restricts a value to be within a specified range.
     */
	clamp: function (value, min, max) {
		if (value > max)
			return max;
		else if (value < min)
			return min;
		else
			return value;
	},

	/**@
     * Converts angle from degree to radian.
	 * @comp Crafty.math
     * @param angleInDeg - The angle in degree.
     * @return The angle in radian.
     */
	degToRad: function (angleInDeg) {
		return angleInDeg * Math.PI / 180;
	},

	/**@
     * #Crafty.math.distance
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.distance(Number x1, Number y1, Number x2, Number y2)
     * @param x1 - First x coordinate.
     * @param y1 - First y coordinate.
     * @param x2 - Second x coordinate.
     * @param y2 - Second y coordinate.
     * @return The distance between the two points.
     * 
	 * Distance between two points.
     */
	distance: function (x1, y1, x2, y2) {
		var squaredDistance = Crafty.math.squaredDistance(x1, y1, x2, y2);
		return Math.sqrt(parseFloat(squaredDistance));
	},

	/**@
     * #Crafty.math.lerp
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.lerp(Number value1, Number value2, Number amount)
     * @param value1 - One value.
     * @param value2 - Another value.
     * @param amount - Amount of value2 to value1.
     * @return Linear interpolated value.
     * 
	 * Linear interpolation. Passing amount with a value of 0 will cause value1 to be returned,
     * a value of 1 will cause value2 to be returned.
     */
	lerp: function (value1, value2, amount) {
		return value1 + (value2 - value1) * amount;
	},

	/**@
     * #Crafty.math.negate
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.negate(Number percent)
     * @param percent - If you pass 1 a -1 will be returned. If you pass 0 a 1 will be returned.
     * @return 1 or -1.
     * 
	 * Returnes "randomly" -1.
     */
	negate: function (percent) {
		if (Math.random() < percent)
			return -1;
		else
			return 1;
	},

	/**@
     * #Crafty.math.radToDeg
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.radToDeg(Number angle)
     * @param angleInRad - The angle in radian.
     * @return The angle in degree.
     * 
	 * Converts angle from radian to degree.
     */
	radToDeg: function (angleInRad) {
		return angleInRad * 180 / Math.PI;
	},

	/**@
     * #Crafty.math.randomElementOfArray
	 * @comp Crafty.math
	 * @sign public Object Crafty.math.randomElementOfArray(Array array)
     * @param array - A specific array.
     * @return A random element of a specific array.
     * 
	 * Returns a random element of a specific array.
     */
	randomElementOfArray: function (array) {
		return array[Math.floor(array.length * Math.random())];
	},

	/**@
     * #Crafty.math.randomInt
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.randomInt(Number start, Number end)
     * @param start - Smallest int value that can be returned.
     * @param end - Biggest int value that can be returned.
     * @return A random int.
     * 
	 * Returns a random int in within a specific range.
     */
	randomInt: function (start, end) {
		return start + Math.floor((1 + end - start) * Math.random());
	},

	/**@
     * #Crafty.math.randomNumber
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.randomInt(Number start, Number end)
     * @param start - Smallest number value that can be returned.
     * @param end - Biggest number value that can be returned.
     * @return A random number.
     * 
	 * Returns a random number in within a specific range.
     */
	randomNumber: function (start, end) {
		return start + (end - start) * Math.random();
	},

	/**@
	 * #Crafty.math.squaredDistance
	 * @comp Crafty.math
	 * @sign public Number Crafty.math.squaredDistance(Number x1, Number y1, Number x2, Number y2)
     * @param x1 - First x coordinate.
     * @param y1 - First y coordinate.
     * @param x2 - Second x coordinate.
     * @param y2 - Second y coordinate.
     * @return The squared distance between the two points.
     * 
	 * Squared distance between two points.
     */
	squaredDistance: function (x1, y1, x2, y2) {
		return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
	},

	/**@
     * #Crafty.math.withinRange
	 * @comp Crafty.math
	 * @sign public Boolean Crafty.math.withinRange(Number value, Number min, Number max)
     * @param value - The specific value.
     * @param min - Minimum value.
     * @param max - Maximum value.
     * @return Returns true if value is within a specific range.
     * 
	 * Check if a value is within a specific range.
     */
	withinRange: function (value, min, max) {
		return (value >= min && value <= max);
	}
};

Crafty.math.Vector2D = (function () {
	/**@
	 * #Crafty.math.Vector2D
	 * @category 2D
	 * @class This is a general purpose 2D vector class
	 *
	 * Vector2D uses the following form:
	 * <x, y>
	 *
	 * @public
	 * @sign public {Vector2D} Vector2D();
	 * @sign public {Vector2D} Vector2D(Vector2D);
	 * @sign public {Vector2D} Vector2D(Number, Number);
	 * @param {Vector2D|Number=0} x
	 * @param {Number=0} y
	 */
	function Vector2D(x, y) {
		if (x instanceof Vector2D) {
			this.x = x.x;
			this.y = x.y;
		} else if (arguments.length === 2) {
			this.x = x;
			this.y = y;
		} else if (arguments.length > 0)
			throw "Unexpected number of arguments for Vector2D()";
	} // class Vector2D

	Vector2D.prototype.x = 0;
	Vector2D.prototype.y = 0;

	/**@
	 * #.add
	 * @comp Crafty.math.Vector2D
     *
	 * Adds the passed vector to this vector
	 *
	 * @public
	 * @sign public {Vector2D} add(Vector2D);
	 * @param {vector2D} vecRH
	 * @returns {Vector2D} this after adding
	 */
	Vector2D.prototype.add = function (vecRH) {
		this.x += vecRH.x;
		this.y += vecRH.y;
		return this;
	} // add

	/**@
	 * #.angleBetween
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the angle between the passed vector and this vector, using <0,0> as the point of reference.
	 * Angles returned have the range (−π, π].
	 *
	 * @public
	 * @sign public {Number} angleBetween(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Number} the angle between the two vectors in radians
	 */
	Vector2D.prototype.angleBetween = function (vecRH) {
		return Math.atan2(this.x * vecRH.y - this.y * vecRH.x, this.x * vecRH.x + this.y * vecRH.y);
	} // angleBetween

	/**@
	 * #.angleTo
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the angle to the passed vector from this vector, using this vector as the point of reference.
	 *
	 * @public
	 * @sign public {Number} angleTo(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Number} the angle to the passed vector in radians
	 */
	Vector2D.prototype.angleTo = function (vecRH) {
		return Math.atan2(vecRH.y - this.y, vecRH.x - this.x);
	};

	/**@
	 * #.clone
     * @comp Crafty.math.Vector2D
	 *
	 * Creates and exact, numeric copy of this vector
	 *
	 * @public
	 * @sign public {Vector2D} clone();
	 * @returns {Vector2D} the new vector
	 */
    Vector2D.prototype.clone = function() {
        return new Vector2D(this);
    }; // clone

	/**@
	 * #.distance
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the distance from this vector to the passed vector.
	 *
	 * @public
	 * @sign public {Number} distance(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Number} the distance between the two vectors
	 */
    Vector2D.prototype.distance = function(vecRH) {
        return Math.sqrt((vecRH.x - this.x) * (vecRH.x - this.x) + (vecRH.y - this.y) * (vecRH.y - this.y));
    }; // distance

	/**@
	 * #.distanceSq
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the squared distance from this vector to the passed vector.
	 * This function avoids calculating the square root, thus being slightly faster than .distance( ).
	 *
	 * @public
	 * @sign public {Number} distanceSq(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Number} the squared distance between the two vectors
	 * @see .distance
	 */
    Vector2D.prototype.distanceSq = function(vecRH) {
        return (vecRH.x - this.x) * (vecRH.x - this.x) + (vecRH.y - this.y) * (vecRH.y - this.y);
    }; // distanceSq

	/**@
	 * #.divide
     * @comp Crafty.math.Vector2D
	 *
	 * Divides this vector by the passed vector.
	 *
	 * @public
	 * @sign public {Vector2D} divide(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Vector2D} this vector after dividing
	 */
    Vector2D.prototype.divide = function(vecRH) {
        this.x /= vecRH.x;
        this.y /= vecRH.y;
        return this;
    }; // divide

	/**@
	 * #.dotProduct
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the dot product of this and the passed vectors
	 *
	 * @public
	 * @sign public {Number} dotProduct(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Number} the resultant dot product
	 */
    Vector2D.prototype.dotProduct = function(vecRH) {
        return this.x * vecRH.x + this.y * vecRH.y;
    }; // dotProduct

	/**@
	 * #.equals
     * @comp Crafty.math.Vector2D
	 *
	 * Determines if this vector is numerically equivalent to the passed vector.
	 *
	 * @public
	 * @sign public {Boolean} equals(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Boolean} true if the vectors are equivalent
	 */
    Vector2D.prototype.equals = function(vecRH) {
        return vecRH instanceof Vector2D &&
            this.x == vecRH.x && this.y == vecRH.y;
    }; // equals

	/**@
	 * #.getNormal
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates a new right-handed normal vector for the line created by this and the passed vectors.
	 *
	 * @public
	 * @sign public {Vector2D} getNormal([Vector2D]);
	 * @param {Vector2D=<0,0>} [vecRH]
	 * @returns {Vector2D} the new normal vector
	 */
    Vector2D.prototype.getNormal = function(vecRH) {
        if (vecRH === undefined)
            return new Vector2D(-this.y, this.x); // assume vecRH is <0, 0>
        return new Vector2D(vecRH.y - this.y, this.x - vecRH.x).normalize();
    }; // getNormal

	/**@
	 * #.isZero
     * @comp Crafty.math.Vector2D
	 *
	 * Determines if this vector is equal to <0,0>
	 *
	 * @public
	 * @sign public {Boolean} isZero();
	 * @returns {Boolean} true if this vector is equal to <0,0>
	 */
    Vector2D.prototype.isZero = function() {
        return this.x === 0 && this.y === 0;
    }; // isZero

	/**@
	 * #.magnitude
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the magnitude of this vector.
	 * Note: Function objects in JavaScript already have a 'length' member, hence the use of magnitude instead.
	 *
	 * @public
	 * @sign public {Number} magnitude();
	 * @returns {Number} the magnitude of this vector
	 */
    Vector2D.prototype.magnitude = function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }; // magnitude

	/**@
	 * #.magnitudeSq
     * @comp Crafty.math.Vector2D
	 *
	 * Calculates the square of the magnitude of this vector.
	 * This function avoids calculating the square root, thus being slightly faster than .magnitude( ).
	 *
	 * @public
	 * @sign public {Number} magnitudeSq();
	 * @returns {Number} the square of the magnitude of this vector
	 * @see .magnitude
	 */
    Vector2D.prototype.magnitudeSq = function() {
        return this.x * this.x + this.y * this.y;
    }; // magnitudeSq

	/**@
	 * #.multiply
     * @comp Crafty.math.Vector2D
	 *
	 * Multiplies this vector by the passed vector
	 *
	 * @public
	 * @sign public {Vector2D} multiply(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {Vector2D} this vector after multiplying
	 */
    Vector2D.prototype.multiply = function(vecRH) {
        this.x *= vecRH.x;
        this.y *= vecRH.y;
        return this;
    }; // multiply

	/**@
	 * #.negate
     * @comp Crafty.math.Vector2D
	 *
	 * Negates this vector (ie. <-x,-y>)
	 *
	 * @public
	 * @sign public {Vector2D} negate();
	 * @returns {Vector2D} this vector after negation
	 */
    Vector2D.prototype.negate = function() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }; // negate

	/**@
	 * #.normalize
     * @comp Crafty.math.Vector2D
	 *
	 * Normalizes this vector (scales the vector so that its new magnitude is 1)
	 * For vectors where magnitude is 0, <1,0> is returned.
	 *
	 * @public
	 * @sign public {Vector2D} normalize();
	 * @returns {Vector2D} this vector after normalization
	 */
    Vector2D.prototype.normalize = function() {
        var lng = Math.sqrt(this.x * this.x + this.y * this.y);

        if (lng === 0) {
            // default due East
            this.x = 1;
            this.y = 0;
        } else {
            this.x /= lng;
            this.y /= lng;
        } // else

        return this;
    }; // normalize

	/**@
	 * #.scale
	 * @comp Crafty.math.Vector2D
     *
	 * Scales this vector by the passed amount(s)
	 * If scalarY is omitted, scalarX is used for both axes
	 *
	 * @public
	 * @sign public {Vector2D} scale(Number[, Number]);
	 * @param {Number} scalarX
	 * @param {Number} [scalarY]
	 * @returns {Vector2D} this after scaling
	 */
    Vector2D.prototype.scale = function(scalarX, scalarY) {
        if (scalarY === undefined)
            scalarY = scalarX;

        this.x *= scalarX;
        this.y *= scalarY;

        return this;
    }; // scale

	/**@
	 * #.scaleToMagnitude
	 * @comp Crafty.math.Vector2D
     *
	 * Scales this vector such that its new magnitude is equal to the passed value.
	 *
	 * @public
	 * @sign public {Vector2D} scaleToMagnitude(Number);
	 * @param {Number} mag
	 * @returns {Vector2D} this vector after scaling
	 */
    Vector2D.prototype.scaleToMagnitude = function(mag) {
        var k = mag / this.magnitude();
        this.x *= k;
        this.y *= k;
        return this;
    }; // scaleToMagnitude

	/**@
	 * #.setValues
	 * @comp Crafty.math.Vector2D
     *
	 * Sets the values of this vector using a passed vector or pair of numbers.
	 *
	 * @public
	 * @sign public {Vector2D} setValues(Vector2D);
	 * @sign public {Vector2D} setValues(Number, Number);
	 * @param {Number|Vector2D} x
	 * @param {Number} y
	 * @returns {Vector2D} this vector after setting of values
	 */
    Vector2D.prototype.setValues = function(x, y) {
        if (x instanceof Vector2D) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        } // else

        return this;
    }; // setValues

	/**@
	 * #.subtract
	 * @comp Crafty.math.Vector2D
     *
	 * Subtracts the passed vector from this vector.
	 *
	 * @public
	 * @sign public {Vector2D} subtract(Vector2D);
	 * @param {Vector2D} vecRH
	 * @returns {vector2D} this vector after subtracting
	 */
    Vector2D.prototype.subtract = function(vecRH) {
        this.x -= vecRH.x;
        this.y -= vecRH.y;
        return this;
    }; // subtract

	/**@
	 * #.toString
	 * @comp Crafty.math.Vector2D
     *
	 * Returns a string representation of this vector.
	 *
	 * @public
	 * @sign public {String} toString();
	 * @returns {String}
	 */
    Vector2D.prototype.toString = function() {
        return "Vector2D(" + this.x + ", " + this.y + ")";
    }; // toString

	/**@
	 * #.translate
	 * @comp Crafty.math.Vector2D
     *
	 * Translates (moves) this vector by the passed amounts.
	 * If dy is omitted, dx is used for both axes.
	 *
	 * @public
	 * @sign public {Vector2D} translate(Number[, Number]);
	 * @param {Number} dx
	 * @param {Number} [dy]
	 * @returns {Vector2D} this vector after translating
	 */
    Vector2D.prototype.translate = function(dx, dy) {
        if (dy === undefined)
            dy = dx;

        this.x += dx;
        this.y += dy;

        return this;
    }; // translate

	/**@
	 * #.tripleProduct
	 * @comp Crafty.math.Vector2D
     *
	 * Calculates the triple product of three vectors.
	 * triple vector product = b(a•c) - a(b•c)
	 *
	 * @public
	 * @static
	 * @sign public {Vector2D} tripleProduct(Vector2D, Vector2D, Vector2D);
	 * @param {Vector2D} a
	 * @param {Vector2D} b
	 * @param {Vector2D} c
	 * @return {Vector2D} the triple product as a new vector
	 */
	Vector2D.tripleProduct = function (a, b, c) {
		var ac = a.dotProduct(c);
		var bc = b.dotProduct(c);
		return new Crafty.math.Vector2D(b.x * ac - a.x * bc, b.y * ac - a.y * bc);
	};

	return Vector2D;
})();

Crafty.math.Matrix2D = (function () {
	/**@
	 * #Crafty.math.Matrix2D
	 * @category 2D
	 *
	 * @class This is a 2D Matrix2D class. It is 3x3 to allow for affine transformations in 2D space.
	 * The third row is always assumed to be [0, 0, 1].
	 *
	 * Matrix2D uses the following form, as per the whatwg.org specifications for canvas.transform():
	 * [a, c, e]
	 * [b, d, f]
	 * [0, 0, 1]
	 *
	 * @public
	 * @sign public {Matrix2D} new Matrix2D();
	 * @sign public {Matrix2D} new Matrix2D(Matrix2D);
	 * @sign public {Matrix2D} new Matrix2D(Number, Number, Number, Number, Number, Number);
	 * @param {Matrix2D|Number=1} a
	 * @param {Number=0} b
	 * @param {Number=0} c
	 * @param {Number=1} d
	 * @param {Number=0} e
	 * @param {Number=0} f
	 */
	Matrix2D = function (a, b, c, d, e, f) {
		if (a instanceof Matrix2D) {
			this.a = a.a;
			this.b = a.b;
			this.c = a.c;
			this.d = a.d;
			this.e = a.e;
			this.f = a.f;
		} else if (arguments.length === 6) {
			this.a = a;
			this.b = b;
			this.c = c;
			this.d = d;
			this.e = e;
			this.f = f;
		} else if (arguments.length > 0)
			throw "Unexpected number of arguments for Matrix2D()";
	} // class Matrix2D

	Matrix2D.prototype.a = 1;
	Matrix2D.prototype.b = 0;
	Matrix2D.prototype.c = 0;
	Matrix2D.prototype.d = 1;
	Matrix2D.prototype.e = 0;
	Matrix2D.prototype.f = 0;

	/**@
	 * #.apply
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies the matrix transformations to the passed object
	 *
	 * @public
	 * @sign public {Vector2D} apply(Vector2D);
	 * @param {Vector2D} vecRH - vector to be transformed
	 * @returns {Vector2D} the passed vector object after transforming
	 */
    Matrix2D.prototype.apply = function(vecRH) {
        // I'm not sure of the best way for this function to be implemented. Ideally
        // support for other objects (rectangles, polygons, etc) should be easily
        // addable in the future. Maybe a function (apply) is not the best way to do
        // this...?

        var tmpX = vecRH.x;
        vecRH.x = tmpX * this.a + vecRH.y * this.c + this.e;
        vecRH.y = tmpX * this.b + vecRH.y * this.d + this.f;
        // no need to homogenize since the third row is always [0, 0, 1]

        return vecRH;
    }; // apply

	/**@
	 * #.clone
     * @comp Crafty.math.Matrix2D
	 *
	 * Creates an exact, numeric copy of the current matrix
	 *
	 * @public
	 * @sign public {Matrix2D} clone();
	 * @returns {Matrix2D}
	 */
    Matrix2D.prototype.clone = function() {
        return new Matrix2D(this);
    }; // clone

	/**@
	 * #.combine
     * @comp Crafty.math.Matrix2D
	 *
	 * Multiplies this matrix with another, overriding the values of this matrix.
	 * The passed matrix is assumed to be on the right-hand side.
	 *
	 * @public
	 * @sign public {Matrix2D} combine(Matrix2D);
	 * @param {Matrix2D} mtrxRH
	 * @returns {Matrix2D} this matrix after combination
	 */
    Matrix2D.prototype.combine = function(mtrxRH) {
        var tmp = this.a;
        this.a = tmp * mtrxRH.a + this.b * mtrxRH.c;
        this.b = tmp * mtrxRH.b + this.b * mtrxRH.d;
        tmp = this.c;
        this.c = tmp * mtrxRH.a + this.d * mtrxRH.c;
        this.d = tmp * mtrxRH.b + this.d * mtrxRH.d;
        tmp = this.e;
        this.e = tmp * mtrxRH.a + this.f * mtrxRH.c + mtrxRH.e;
        this.f = tmp * mtrxRH.b + this.f * mtrxRH.d + mtrxRH.f;
        return this;
    }; // combine

	/**@
	 * #.equals
     * @comp Crafty.math.Matrix2D
	 *
	 * Checks for the numeric equality of this matrix versus another.
	 *
	 * @public
	 * @sign public {Boolean} equals(Matrix2D);
	 * @param {Matrix2D} mtrxRH
	 * @returns {Boolean} true if the two matrices are numerically equal
	 */
    Matrix2D.prototype.equals = function(mtrxRH) {
        return mtrxRH instanceof Matrix2D &&
            this.a == mtrxRH.a && this.b == mtrxRH.b && this.c == mtrxRH.c &&
            this.d == mtrxRH.d && this.e == mtrxRH.e && this.f == mtrxRH.f;
    }; // equals

	/**@
	 * #.determinant
     * @comp Crafty.math.Matrix2D
	 *
	 * Calculates the determinant of this matrix
	 *
	 * @public
	 * @sign public {Number} determinant();
	 * @returns {Number} det(this matrix)
	 */
    Matrix2D.prototype.determinant = function() {
        return this.a * this.d - this.b * this.c;
    }; // determinant

	/**@
	 * #.invert
     * @comp Crafty.math.Matrix2D
	 *
	 * Inverts this matrix if possible
	 *
	 * @public
	 * @sign public {Matrix2D} invert();
	 * @returns {Matrix2D} this inverted matrix or the original matrix on failure
	 * @see .isInvertible
	 */
    Matrix2D.prototype.invert = function() {
        var det = this.determinant();

        // matrix is invertible if its determinant is non-zero
        if (det !== 0) {
            var old = {
                a: this.a,
                b: this.b,
                c: this.c,
                d: this.d,
                e: this.e,
                f: this.f
            };
            this.a = old.d / det;
            this.b = -old.b / det;
            this.c = -old.c / det;
            this.d = old.a / det;
            this.e = (old.c * old.f - old.e * old.d) / det;
            this.f = (old.e * old.b - old.a * old.f) / det;
        } // if

        return this;
    }; // invert

	/**@
	 * #.isIdentity
     * @comp Crafty.math.Matrix2D
	 *
	 * Returns true if this matrix is the identity matrix
	 *
	 * @public
	 * @sign public {Boolean} isIdentity();
	 * @returns {Boolean}
	 */
    Matrix2D.prototype.isIdentity = function() {
        return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
    }; // isIdentity

	/**@
	 * #.isInvertible
     * @comp Crafty.math.Matrix2D
	 *
	 * Determines is this matrix is invertible.
	 *
	 * @public
	 * @sign public {Boolean} isInvertible();
	 * @returns {Boolean} true if this matrix is invertible
	 * @see .invert
	 */
    Matrix2D.prototype.isInvertible = function() {
        return this.determinant() !== 0;
    }; // isInvertible

	/**@
	 * #.preRotate
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a counter-clockwise pre-rotation to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} preRotate(Number);
	 * @param {number} rads - angle to rotate in radians
	 * @returns {Matrix2D} this matrix after pre-rotation
	 */
    Matrix2D.prototype.preRotate = function(rads) {
        var nCos = Math.cos(rads);
        var nSin = Math.sin(rads);

        var tmp = this.a;
        this.a = nCos * tmp - nSin * this.b;
        this.b = nSin * tmp + nCos * this.b;
        tmp = this.c;
        this.c = nCos * tmp - nSin * this.d;
        this.d = nSin * tmp + nCos * this.d;

        return this;
    }; // preRotate

	/**@
	 * #.preScale
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a pre-scaling to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} preScale(Number[, Number]);
	 * @param {Number} scalarX
	 * @param {Number} [scalarY] scalarX is used if scalarY is undefined
	 * @returns {Matrix2D} this after pre-scaling
	 */
    Matrix2D.prototype.preScale = function(scalarX, scalarY) {
        if (scalarY === undefined)
            scalarY = scalarX;

        this.a *= scalarX;
        this.b *= scalarY;
        this.c *= scalarX;
        this.d *= scalarY;

        return this;
    }; // preScale

	/**@
	 * #.preTranslate
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a pre-translation to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} preTranslate(Vector2D);
	 * @sign public {Matrix2D} preTranslate(Number, Number);
	 * @param {Number|Vector2D} dx
	 * @param {Number} dy
	 * @returns {Matrix2D} this matrix after pre-translation
	 */
    Matrix2D.prototype.preTranslate = function(dx, dy) {
        if (typeof dx === "number") {
            this.e += dx;
            this.f += dy;
        } else {
            this.e += dx.x;
            this.f += dx.y;
        } // else

        return this;
    }; // preTranslate

	/**@
	 * #.rotate
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a counter-clockwise post-rotation to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} rotate(Number);
	 * @param {Number} rads - angle to rotate in radians
	 * @returns {Matrix2D} this matrix after rotation
	 */
    Matrix2D.prototype.rotate = function(rads) {
        var nCos = Math.cos(rads);
        var nSin = Math.sin(rads);

        var tmp = this.a;
        this.a = nCos * tmp - nSin * this.b;
        this.b = nSin * tmp + nCos * this.b;
        tmp = this.c;
        this.c = nCos * tmp - nSin * this.d;
        this.d = nSin * tmp + nCos * this.d;
        tmp = this.e;
        this.e = nCos * tmp - nSin * this.f;
        this.f = nSin * tmp + nCos * this.f;

        return this;
    }; // rotate

	/**@
	 * #.scale
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a post-scaling to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} scale(Number[, Number]);
	 * @param {Number} scalarX
	 * @param {Number} [scalarY] scalarX is used if scalarY is undefined
	 * @returns {Matrix2D} this after post-scaling
	 */
    Matrix2D.prototype.scale = function(scalarX, scalarY) {
        if (scalarY === undefined)
            scalarY = scalarX;

        this.a *= scalarX;
        this.b *= scalarY;
        this.c *= scalarX;
        this.d *= scalarY;
        this.e *= scalarX;
        this.f *= scalarY;

        return this;
    }; // scale

	/**@
	 * #.setValues
     * @comp Crafty.math.Matrix2D
	 *
	 * Sets the values of this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} setValues(Matrix2D);
	 * @sign public {Matrix2D} setValues(Number, Number, Number, Number, Number, Number);
	 * @param {Matrix2D|Number} a
	 * @param {Number} b
	 * @param {Number} c
	 * @param {Number} d
	 * @param {Number} e
	 * @param {Number} f
	 * @returns {Matrix2D} this matrix containing the new values
	 */
    Matrix2D.prototype.setValues = function(a, b, c, d, e, f) {
        if (a instanceof Matrix2D) {
            this.a = a.a;
            this.b = a.b;
            this.c = a.c;
            this.d = a.d;
            this.e = a.e;
            this.f = a.f;
        } else {
            this.a = a;
            this.b = b;
            this.c = c;
            this.d = d;
            this.e = e;
            this.f = f;
        } // else

        return this;
    }; // setValues

	/**@
	 * #.toString
     * @comp Crafty.math.Matrix2D
	 *
	 * Returns the string representation of this matrix.
	 *
	 * @public
	 * @sign public {String} toString();
	 * @returns {String}
	 */
    Matrix2D.prototype.toString = function() {
        return "Matrix2D([" + this.a + ", " + this.c + ", " + this.e +
            "] [" + this.b + ", " + this.d + ", " + this.f + "] [0, 0, 1])";
    }; // toString

	/**@
	 * #.translate
     * @comp Crafty.math.Matrix2D
	 *
	 * Applies a post-translation to this matrix
	 *
	 * @public
	 * @sign public {Matrix2D} translate(Vector2D);
	 * @sign public {Matrix2D} translate(Number, Number);
	 * @param {Number|Vector2D} dx
	 * @param {Number} dy
	 * @returns {Matrix2D} this matrix after post-translation
	 */
	Matrix2D.prototype.translate = function (dx, dy) {
		if (typeof dx === "number") {
			this.e += this.a * dx + this.c * dy;
			this.f += this.b * dx + this.d * dy;
		} else {
			this.e += this.a * dx.x + this.c * dx.y;
			this.f += this.b * dx.x + this.d * dx.y;
		} // else

		return this;
	} // translate

	return Matrix2D;
})();

/**@
* #Crafty Time
* @category Utilities
*/
Crafty.c("Delay", {
	init : function() {
		this._delays = [];
		this.bind("EnterFrame", function() {
			var now = new Date().getTime();
			for(var index in this._delays) {
				var item = this._delays[index];
				if(!item.triggered && item.start + item.delay + item.pause < now) {
					item.triggered=true;
					item.func.call(this);
				}
			}
		});
		this.bind("Pause", function() {
			var now = new Date().getTime();
			for(var index in this._delays) {
				this._delays[index].pauseBuffer = now;
			}
		});
		this.bind("Unpause", function() {
			var now = new Date().getTime();
			for(var index in this._delays) {
				var item = this._delays[index];
				item.pause += now-item.pauseBuffer;
			}
		});
	},
    /**@
	* #.delay
	* @comp Crafty Time
	* @sign public this.delay(Function callback, Number delay)
	* @param callback - Method to execute after given amount of milliseconds
	* @param delay - Amount of milliseconds to execute the method
	* 
	* The delay method will execute a function after a given amount of time in milliseconds.
	* 
	* It is not a wrapper for `setTimeout`.
	* 
	* If Crafty is paused, the delay is interrupted with the pause and then resume when unpaused
	*
	* If the entity is destroyed, the delay is also destroyed and will not have effect. 
	*
	* @example
	* ~~~
	* console.log("start");
	* this.delay(function() {
	     console.log("100ms later");
	* }, 100);
	* ~~~
	*/
	delay : function(func, delay) {
		return this._delays.push({
			start : new Date().getTime(),
			func : func,
			delay : delay,
			triggered : false,
			pauseBuffer: 0,
			pause: 0
		});
	}
});

});

})()
},{}],3:[function(require,module,exports){
 
var Crafty = require( './lib/crafty' );

exports.FPS = function( el, maxValue )
{
  var fps = Crafty.e( '2D, Canvas, FPS' );
  fps.attr( { maxValue: maxValue } )
  Crafty.bind( 'MessureFPS', function( fps ) {
    el.innerHTML = fps.value;
  } );
};
},{"./lib/crafty":2}],4:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.scene('Loading', function() {
  var modules = {
    Shape: 'RELEASE',
    MouseFace: 'RELEASE'
  };
  
  Crafty.modules(modules, done);

  function done() {
    Crafty.scene('Game');
  }
});
},{"./lib/crafty":2}],5:[function(require,module,exports){

var Crafty = require( './lib/crafty' );

Crafty.c('Actor', {
  init: function() {
    this.requires('2D, Canvas');
  },
  stopOnSolid: function() {
    this.onHit('Solid', this.stopMovement);
    return this;
  },
  stopMovement: function() {
    this._speed = 0;
    if (this._movement) {
      this.x -= this._movement.x;
      this.y -= this._movement.y;
    }
  }
} );
},{"./lib/crafty":2}],6:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require( './bounded' );
require( './shooter' );

Crafty.c('Ship', {
  init: function() {
    this.requires('Actor, Bounded, Shooter, Fourway, MouseFace, Color, Collision');
    this.fourway(4);
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
      curAngle: 0
    });
    this.origin('center');
    this.color('white');
    this.stopOnSolid();
    this.MouseFace({x: 0, y: 0});

    this.bind('MouseMoved', function(e) {
      this.origin('center');
      this.curAngle = e.grad + 90;
      this.rotation = this.curAngle;
    });

    this.bind('MouseUp', function(e) {
      this.shoot(this._dirAngle + Math.PI, 5);
    });
  }
} );

},{"./bounded":8,"./lib/crafty":2,"./shooter":9}],7:[function(require,module,exports){

var Crafty = require( './lib/crafty' );

Crafty.c('Planet', {
  init: function() {
    this.requires('Actor, Shape, Solid, Color, Collision, Tint');
    this.origin('center');
    this.circle(50);
    this.color('white');
    this.bind('BulletHit', this.pulsate('red'));
  },
  pulsate: function(color) {
    return (function() {
      this.tint(color, 0.3);
      this.timeout(function() {
        this.color('white');
      }.bind(this), 300);
    }).bind(this);
  }
} );

},{"./lib/crafty":2}],8:[function(require,module,exports){

var Crafty = require( './lib/crafty' );

Crafty.c('Bounded', {
  init: function() {
    this.requires('2D, Canvas');
    this.bind('Moved', function(from) {
      if(this.isOutOfBounds()) {
          this.trigger('HitBounds');
          this.attr({
            x: from.x, 
            y: from.y
          });
      }
    });
  },
  isOutOfBounds: function() {
    return this.x + this.w > Crafty.viewport.width / 2 ||
           this.x - 10 < -Crafty.viewport.width / 2 ||
           this.y + this.h > Crafty.viewport.height / 2 ||
           this.y - 10 < -Crafty.viewport.height / 2;
  }
} );
},{"./lib/crafty":2}],9:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./bullet');

Crafty.c('Shooter', {
  init: function() {
    this.requires('2D');
  },
  shoot: function(angle, speed) {
    Crafty.e('Bullet').bullet({
      attr: {
        x: this.x,
        y: this.y,
        angle: angle,
        speed: speed || 5
      }
    });
  }
});

},{"./lib/crafty":2,"./bullet":10}],10:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./bounded');

Crafty.c('Bullet', {

  // FIXME: Optimize later, and refactor
  bullet: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.color) {
      this.color(options.color);
    }
  },

  init: function() {
    this.requires('Bounded, Color, Collision');
    this.attr({
      w: 3,
      h: 3,
      speed: 5
    });
    this.color('#FA5656');
    this.bind('EnterFrame', this._enteredFrame);
    this.bind('HitBounds', this.destroy);
    this.onHit('Solid', this._hitObject);
  },

  _hitObject: function(e) {
    if(!e.length || !e[0].obj) return;
    e[0].obj.trigger('BulletHit', { bullet: this });
    this.destroy();
  },

  _enteredFrame: function(frame) {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

});
},{"./bounded":8,"./lib/crafty":2}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcm9tYWMvRGV2L1NwYWNlQXBwc0dhbWUvanMvZ2FtZS5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvU3BhY2VBcHBzR2FtZS9qcy9saWIvY3JhZnR5LmpzIiwiL1VzZXJzL3JvbWFjL0Rldi9TcGFjZUFwcHNHYW1lL2pzL3N0YXRzLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi9TcGFjZUFwcHNHYW1lL2pzL2xvYWRpbmcuanMiLCIvVXNlcnMvcm9tYWMvRGV2L1NwYWNlQXBwc0dhbWUvanMvYWN0b3IuanMiLCIvVXNlcnMvcm9tYWMvRGV2L1NwYWNlQXBwc0dhbWUvanMvc2hpcC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvU3BhY2VBcHBzR2FtZS9qcy9wbGFuZXQuanMiLCIvVXNlcnMvcm9tYWMvRGV2L1NwYWNlQXBwc0dhbWUvanMvYm91bmRlZC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvU3BhY2VBcHBzR2FtZS9qcy9zaG9vdGVyLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi9TcGFjZUFwcHNHYW1lL2pzL2J1bGxldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxNlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpLFxuICAgIFN0YXRzICA9IHJlcXVpcmUoJy4vc3RhdHMnKTtcblxucmVxdWlyZSgnLi9sb2FkaW5nJyk7XG5yZXF1aXJlKCcuL2FjdG9yJyk7XG5yZXF1aXJlKCcuL3NoaXAnKTtcbnJlcXVpcmUoJy4vcGxhbmV0Jyk7XG5cbnZhciBHYW1lID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIENyYWZ0eS5pbml0KENyYWZ0eS5ET00ud2luZG93LndpZHRoLCBDcmFmdHkuRE9NLndpbmRvdy5oZWlnaHQpO1xuICAgIENyYWZ0eS5jYW52YXMuaW5pdCgpO1xuICAgIENyYWZ0eS5iYWNrZ3JvdW5kKCdibGFjaycpO1xuICAgIENyYWZ0eS5zY2VuZSgnTG9hZGluZycpO1xuICAgIFN0YXRzLkZQUyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZnBzJykpO1xuICB9XG5cbn07XG5cbkNyYWZ0eS5zY2VuZSggJ0dhbWUnLCBmdW5jdGlvbigpIHtcbiAgdGhpcy5wbGF5ZXIgPSBDcmFmdHkuZSgnU2hpcCcpO1xuICB0aGlzLnBsYXllci54ID0gLTUwMDtcbiAgdGhpcy5wbGF5ZXIueSA9IC0zMDA7XG4gIHRoaXMucGxhbmV0ID0gQ3JhZnR5LmUoJ1BsYW5ldCcpO1xuXG4gIENyYWZ0eS52aWV3cG9ydC5jZW50ZXJPbih0aGlzLnBsYW5ldCwgMSk7IFxufSApO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIEdhbWUuc3RhcnQpO1xuIiwiKGZ1bmN0aW9uKCl7LyohXG4qIENyYWZ0eSB2MC41LjNcbiogaHR0cDovL2NyYWZ0eWpzLmNvbVxuKlxuKiBDb3B5cmlnaHQgMjAxMCwgTG91aXMgU3Rvd2Fzc2VyXG4qIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgbGljZW5zZXMuXG4qL1xuXG4oZnVuY3Rpb24gKHdpbmRvdywgaW5pdENvbXBvbmVudHMsIHVuZGVmaW5lZCkge1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eVxuICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAqIFNlbGVjdCBhIHNldCBvZiBvciBzaW5nbGUgZW50aXRpZXMgYnkgY29tcG9uZW50cyBvciBhbiBlbnRpdHkncyBJRC5cbiAgICAqXG4gICAgKiBDcmFmdHkgdXNlcyBzeW50YXggc2ltaWxhciB0byBqUXVlcnkgYnkgaGF2aW5nIGEgc2VsZWN0b3IgZW5naW5lIHRvIHNlbGVjdCBlbnRpdGllcyBieSB0aGVpciBjb21wb25lbnRzLlxuICAgICpcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cbiAgICAqICAgIENyYWZ0eShcIk15Q29tcG9uZW50XCIpXG4gICAgKiAgICBDcmFmdHkoXCJIZWxsbyAyRCBDb21wb25lbnRcIilcbiAgICAqICAgIENyYWZ0eShcIkhlbGxvLCAyRCwgQ29tcG9uZW50XCIpXG4gICAgKiB+fn5cbiAgICAqIFxuICAgICogVGhlIGZpcnN0IHNlbGVjdG9yIHdpbGwgcmV0dXJuIGFsbCBlbnRpdGllcyB0aGF0IGhhdmUgdGhlIGNvbXBvbmVudCBgTXlDb21wb25lbnRgLiBUaGUgc2Vjb25kIHdpbGwgcmV0dXJuIGFsbCBlbnRpdGllcyB0aGF0IGhhdmUgYEhlbGxvYCBhbmQgYDJEYCBhbmQgYENvbXBvbmVudGAgd2hlcmVhcyB0aGUgbGFzdCB3aWxsIHJldHVybiBhbGwgZW50aXRpZXMgdGhhdCBoYXZlIGF0IGxlYXN0IG9uZSBvZiB0aG9zZSBjb21wb25lbnRzIChvcikuXG4gICAgKlxuICAgICogfn5+XG4gICAgKiAgIENyYWZ0eShcIipcIilcbiAgICAqIH5+flxuICAgICogUGFzc2luZyBgKmAgd2lsbCBzZWxlY3QgYWxsIGVudGl0aWVzLlxuICAgICpcbiAgICAqIH5+flxuICAgICogICBDcmFmdHkoMSlcbiAgICAqIH5+flxuICAgICogUGFzc2luZyBhbiBpbnRlZ2VyIHdpbGwgc2VsZWN0IHRoZSBlbnRpdHkgd2l0aCB0aGF0IGBJRGAuXG4gICAgKlxuICAgICogRmluZGluZyBvdXQgdGhlIGBJRGAgb2YgYW4gZW50aXR5IGNhbiBiZSBkb25lIGJ5IHJldHVybmluZyB0aGUgcHJvcGVydHkgYDBgLlxuICAgICogfn5+XG4gICAgKiAgICB2YXIgZW50ID0gQ3JhZnR5LmUoXCIyRFwiKTtcbiAgICAqICAgIGVudFswXTsgLy9JRFxuICAgICogfn5+XG4gICAgKi9cbiAgICB2YXIgQ3JhZnR5ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBuZXcgQ3JhZnR5LmZuLmluaXQoc2VsZWN0b3IpO1xuICAgIH0sXG5cbiAgICBHVUlELCBGUFMsIGZyYW1lLCBjb21wb25lbnRzLCBlbnRpdGllcywgaGFuZGxlcnMsIG9ubG9hZHMsIHRpY2ssIHJlcXVlc3RJRCxcblx0bm9TZXR0ZXIsIGxvb3BzLCBtaWxsaVNlY1BlckZyYW1lLCBuZXh0R2FtZVRpY2ssIHNsaWNlLCBybGlzdCwgcnNwYWNlLFxuXG5cdGluaXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdEdVSUQgPSAxOyAvL0dVSUQgZm9yIGVudGl0eSBJRHNcbiAgICBcdEZQUyA9IDUwO1xuICAgIFx0ZnJhbWUgPSAxO1xuXG4gICAgXHRjb21wb25lbnRzID0ge307IC8vbWFwIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIGZ1bmN0aW9uc1xuICAgIFx0ZW50aXRpZXMgPSB7fTsgLy9tYXAgb2YgZW50aXRpZXMgYW5kIHRoZWlyIGRhdGFcbiAgICAgICAgZW50aXR5RmFjdG9yaWVzID0ge307IC8vdGVtcGxhdGVzIG9mIGVudGl0aWVzXG4gICAgXHRoYW5kbGVycyA9IHt9OyAvL2dsb2JhbCBldmVudCBoYW5kbGVyc1xuICAgIFx0b25sb2FkcyA9IFtdOyAvL3RlbXBvcmFyeSBzdG9yYWdlIG9mIG9ubG9hZCBoYW5kbGVyc1xuICAgIFx0dGljaztcblxuICAgIFx0Lypcblx0XHQqIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBvciBpdHMgdmFyaWFudHMgaXMgY2FsbGVkIGZvciBhbmltYXRpb24uXG5cdFx0KiBgLnJlcXVlc3RJRGAga2VlcHMgYSByZWNvcmQgb2YgdGhlIHJldHVybiB2YWx1ZSBwcmV2aW91cyBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgY2FsbC5cblx0XHQqIFRoaXMgaXMgYW4gaW50ZXJuYWwgdmFyaWFibGUuIFVzZWQgdG8gc3RvcCBmcmFtZS5cblx0XHQqL1xuICAgIFx0cmVxdWVzdElEO1xuXG4gICAgXHRub1NldHRlcjtcblxuICAgIFx0bG9vcHMgPSAwO1xuICAgIFx0bWlsbGlTZWNQZXJGcmFtZSA9IDEwMDAgLyBGUFM7XG4gICAgXHRuZXh0R2FtZVRpY2sgPSAobmV3IERhdGUpLmdldFRpbWUoKTtcblxuICAgIFx0c2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gICAgXHRybGlzdCA9IC9cXHMqLFxccyovO1xuICAgIFx0cnNwYWNlID0gL1xccysvO1xuICAgIH07XG5cbiAgICBpbml0U3RhdGUoKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkgQ29yZVxuICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAqIEB0cmlnZ2VyIE5ld0VudGl0eU5hbWUgLSBBZnRlciBzZXR0aW5nIG5ldyBuYW1lIGZvciBlbnRpdHkgLSBTdHJpbmcgLSBlbnRpdHkgbmFtZVxuICAgICogQHRyaWdnZXIgTmV3Q29tcG9uZW50IC0gd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgYWRkZWQgdG8gdGhlIGVudGl0eSAtIFN0cmluZyAtIENvbXBvbmVudFxuICAgICogQHRyaWdnZXIgUmVtb3ZlQ29tcG9uZW50IC0gd2hlbiBhIGNvbXBvbmVudCBpcyByZW1vdmVkIGZyb20gdGhlIGVudGl0eSAtIFN0cmluZyAtIENvbXBvbmVudFxuICAgICogQHRyaWdnZXIgUmVtb3ZlIC0gd2hlbiB0aGUgZW50aXR5IGlzIHJlbW92ZWQgYnkgY2FsbGluZyAuZGVzdHJveSgpXG4gICAgKiBcbiAgICAqIFNldCBvZiBtZXRob2RzIGFkZGVkIHRvIGV2ZXJ5IHNpbmdsZSBlbnRpdHkuXG4gICAgKi9cbiAgICBDcmFmdHkuZm4gPSBDcmFmdHkucHJvdG90eXBlID0ge1xuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgLy9zZWxlY3QgZW50aXRpZXMgYnkgY29tcG9uZW50XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW0gPSAwLCAvL2luZGV4IGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgZSwgLy9lbnRpdHkgZm9yRWFjaFxuICAgICAgICAgICAgICAgIGN1cnJlbnQsXG4gICAgICAgICAgICAgICAgYW5kID0gZmFsc2UsIC8vZmxhZ3MgZm9yIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgb3IgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWwsXG4gICAgICAgICAgICAgICAgY29tcHMsXG4gICAgICAgICAgICAgICAgc2NvcmUsXG4gICAgICAgICAgICAgICAgaSwgbDtcblxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoZSBpbiBlbnRpdGllcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1srZV0gPSBlbnRpdGllc1tlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vbXVsdGlwbGUgY29tcG9uZW50cyBPUlxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3Rvci5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIG9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGVsID0gcmxpc3Q7XG4gICAgICAgICAgICAgICAgICAgIC8vZGVhbCB3aXRoIG11bHRpcGxlIGNvbXBvbmVudHMgQU5EXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxlY3Rvci5pbmRleE9mKCcgJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRlbCA9IHJzcGFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2xvb3Agb3ZlciBlbnRpdGllc1xuICAgICAgICAgICAgICAgIGZvciAoZSBpbiBlbnRpdGllcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWVudGl0aWVzLmhhc093blByb3BlcnR5KGUpKSBjb250aW51ZTsgLy9za2lwXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBlbnRpdGllc1tlXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5kIHx8IG9yKSB7IC8vbXVsdGlwbGUgY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHMgPSBzZWxlY3Rvci5zcGxpdChkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsID0gY29tcHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcmUgPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykgLy9sb29wIG92ZXIgY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Ll9fY1tjb21wc1tpXV0pIHNjb3JlKys7IC8vaWYgY29tcG9uZW50IGV4aXN0cyBhZGQgdG8gc2NvcmVcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9pZiBhbmRlZCBjb21wcyBhbmQgaGFzIGFsbCBPUiBvcmVkIGNvbXBzIGFuZCBhdCBsZWFzdCAxXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5kICYmIHNjb3JlID09PSBsIHx8IG9yICYmIHNjb3JlID4gMCkgdGhpc1tlbGVtKytdID0gK2U7XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50Ll9fY1tzZWxlY3Rvcl0pIHRoaXNbZWxlbSsrXSA9ICtlOyAvL2NvbnZlcnQgdG8gaW50XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9leHRlbmQgYWxsIGNvbW1vbiBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPiAwICYmICFhbmQgJiYgIW9yKSB0aGlzLmV4dGVuZChjb21wb25lbnRzW3NlbGVjdG9yXSk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBzICYmIGFuZCkgZm9yIChpID0gMDsgaSA8IGw7IGkrKykgdGhpcy5leHRlbmQoY29tcG9uZW50c1tjb21wc1tpXV0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5sZW5ndGggPSBlbGVtOyAvL2xlbmd0aCBpcyB0aGUgbGFzdCBpbmRleCAoYWxyZWFkeSBpbmNyZW1lbnRlZClcblx0XHRcdFx0XG5cdFx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgZW50aXR5LCByZXR1cm4gdGhlIGFjdHVhbCBlbnRpdHlcblx0XHRcdFx0aWYgKGVsZW0gPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gZW50aXRpZXNbdGhpc1tlbGVtLTFdXTtcblx0XHRcdFx0fVxuXG4gICAgICAgICAgICB9IGVsc2UgeyAvL1NlbGVjdCBhIHNwZWNpZmljIGVudGl0eVxuXG4gICAgICAgICAgICAgICAgaWYgKCFzZWxlY3RvcikgeyAvL25vdGhpbiBwYXNzZWQgY3JlYXRlcyBHb2QgZW50aXR5XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoc2VsZWN0b3IgaW4gZW50aXRpZXMpKSBlbnRpdGllc1tzZWxlY3Rvcl0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vaWYgbm90IGV4aXN0cywgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIGlmICghKHNlbGVjdG9yIGluIGVudGl0aWVzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXNbMF0gPSBzZWxlY3RvcjtcbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCA9IDE7XG5cbiAgICAgICAgICAgICAgICAvL3VwZGF0ZSBmcm9tIHRoZSBjYWNoZVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fX2MpIHRoaXMuX19jID0ge307XG5cbiAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0byB0aGUgY2FjaGUgaWYgTlVMTFxuICAgICAgICAgICAgICAgIGlmICghZW50aXRpZXNbc2VsZWN0b3JdKSBlbnRpdGllc1tzZWxlY3Rvcl0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnRpdGllc1tzZWxlY3Rvcl07IC8vcmV0dXJuIHRoZSBjYWNoZWQgc2VsZWN0b3JcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuc2V0TmFtZVxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnNldE5hbWUoU3RyaW5nIG5hbWUpXG4gICAgICAgICogQHBhcmFtIG5hbWUgLSBBIGh1bWFuIHJlYWRhYmxlIG5hbWUgZm9yIGRlYnVnZ2luZyBwdXJwb3Nlcy5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdGhpcy5zZXROYW1lKFwiUGxheWVyXCIpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBzZXROYW1lOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgdmFyIGVudGl0eU5hbWUgPSBTdHJpbmcobmFtZSk7XG5cbiAgICAgICAgICAgIHRoaXMuX2VudGl0eU5hbWUgPSBlbnRpdHlOYW1lO1xuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJOZXdFbnRpdHlOYW1lXCIsIGVudGl0eU5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuYWRkQ29tcG9uZW50XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuYWRkQ29tcG9uZW50KFN0cmluZyBjb21wb25lbnRMaXN0KVxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnRMaXN0IC0gQSBzdHJpbmcgb2YgY29tcG9uZW50cyB0byBhZGQgc2VwYXJhdGVkIGJ5IGEgY29tbWEgYCxgXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmFkZENvbXBvbmVudChTdHJpbmcgQ29tcG9uZW50MVssIC4uLCBTdHJpbmcgQ29tcG9uZW50Tl0pXG4gICAgICAgICogQHBhcmFtIENvbXBvbmVudCMgLSBDb21wb25lbnQgSUQgdG8gYWRkLlxuICAgICAgICAqIEFkZHMgYSBjb21wb25lbnQgdG8gdGhlIHNlbGVjdGVkIGVudGl0aWVzIG9yIGVudGl0eS5cbiAgICAgICAgKlxuICAgICAgICAqIENvbXBvbmVudHMgYXJlIHVzZWQgdG8gZXh0ZW5kIHRoZSBmdW5jdGlvbmFsaXR5IG9mIGVudGl0aWVzLlxuICAgICAgICAqIFRoaXMgbWVhbnMgaXQgd2lsbCBjb3B5IHByb3BlcnRpZXMgYW5kIGFzc2lnbiBtZXRob2RzIHRvXG4gICAgICAgICogYXVnbWVudCB0aGUgZnVuY3Rpb25hbGl0eSBvZiB0aGUgZW50aXR5LlxuICAgICAgICAqXG4gICAgICAgICogVGhlcmUgYXJlIG11bHRpcGxlIG1ldGhvZHMgb2YgYWRkaW5nIGNvbXBvbmVudHMuIFBhc3NpbmcgYVxuICAgICAgICAqIHN0cmluZyB3aXRoIGEgbGlzdCBvZiBjb21wb25lbnQgbmFtZXMgb3IgcGFzc2luZyBtdWx0aXBsZVxuICAgICAgICAqIGFyZ3VtZW50cyB3aXRoIHRoZSBjb21wb25lbnQgbmFtZXMuXG4gICAgICAgICpcbiAgICAgICAgKiBJZiB0aGUgY29tcG9uZW50IGhhcyBhIGZ1bmN0aW9uIG5hbWVkIGBpbml0YCBpdCB3aWxsIGJlIGNhbGxlZC5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdGhpcy5hZGRDb21wb25lbnQoXCIyRCwgQ2FudmFzXCIpO1xuICAgICAgICAqIHRoaXMuYWRkQ29tcG9uZW50KFwiMkRcIiwgXCJDYW52YXNcIik7XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIGFkZENvbXBvbmVudDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICB2YXIgdW5pbml0ID0gW10sIGMgPSAwLCB1bCwgLy9hcnJheSBvZiBjb21wb25lbnRzIHRvIGluaXRcbiAgICAgICAgICAgIGkgPSAwLCBsLCBjb21wcztcblxuICAgICAgICAgICAgLy9hZGQgbXVsdGlwbGUgYXJndW1lbnRzXG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY1thcmd1bWVudHNbaV1dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdW5pbml0LnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9zcGxpdCBjb21wb25lbnRzIGlmIGNvbnRhaW5zIGNvbW1hXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBjb21wcyA9IGlkLnNwbGl0KHJsaXN0KTtcbiAgICAgICAgICAgICAgICBsID0gY29tcHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jW2NvbXBzW2ldXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVuaW5pdC5wdXNoKGNvbXBzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9zaW5nbGUgY29tcG9uZW50IHBhc3NlZFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fY1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHVuaW5pdC5wdXNoKGlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9leHRlbmQgdGhlIGNvbXBvbmVudHNcbiAgICAgICAgICAgIHVsID0gdW5pbml0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoOyBjIDwgdWw7IGMrKykge1xuICAgICAgICAgICAgICAgIGNvbXAgPSBjb21wb25lbnRzW3VuaW5pdFtjXV07XG4gICAgICAgICAgICAgICAgdGhpcy5leHRlbmQoY29tcCk7XG5cbiAgICAgICAgICAgICAgICAvL2lmIGNvbnN0cnVjdG9yLCBjYWxsIGl0XG4gICAgICAgICAgICAgICAgaWYgKGNvbXAgJiYgXCJpbml0XCIgaW4gY29tcCkge1xuICAgICAgICAgICAgICAgICAgICBjb21wLmluaXQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIk5ld0NvbXBvbmVudFwiLCB1bCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy50b2dnbGVDb21wb25lbnRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50b2dnbGVDb21wb25lbnQoU3RyaW5nIENvbXBvbmVudExpc3QpXG4gICAgICAgICogQHBhcmFtIENvbXBvbmVudExpc3QgLSBBIHN0cmluZyBvZiBjb21wb25lbnRzIHRvIGFkZCBvciByZW1vdmUgc2VwYXJhdGVkIGJ5IGEgY29tbWEgYCxgXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRvZ2dsZUNvbXBvbmVudChTdHJpbmcgQ29tcG9uZW50MVssIC4uLCBTdHJpbmcgY29tcG9uZW50Tl0pXG4gICAgICAgICogQHBhcmFtIENvbXBvbmVudCMgLSBDb21wb25lbnQgSUQgdG8gYWRkIG9yIHJlbW92ZS5cbiAgICAgICAgKiBBZGQgb3IgUmVtb3ZlIENvbXBvbmVudHMgZnJvbSBhbiBlbnRpdHkuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgZSA9IENyYWZ0eS5lKFwiMkQsRE9NLFRlc3RcIik7XG4gICAgICAgICogZS50b2dnbGVDb21wb25lbnQoXCJUZXN0LFRlc3QyXCIpOyAvL1JlbW92ZSBUZXN0LCBhZGQgVGVzdDJcbiAgICAgICAgKiBlLnRvZ2dsZUNvbXBvbmVudChcIlRlc3QsVGVzdDJcIik7IC8vQWRkIFRlc3QsIHJlbW92ZSBUZXN0MlxuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGUgPSBDcmFmdHkuZShcIjJELERPTSxUZXN0XCIpO1xuICAgICAgICAqIGUudG9nZ2xlQ29tcG9uZW50KFwiVGVzdFwiLFwiVGVzdDJcIik7IC8vUmVtb3ZlIFRlc3QsIGFkZCBUZXN0MlxuICAgICAgICAqIGUudG9nZ2xlQ29tcG9uZW50KFwiVGVzdFwiLFwiVGVzdDJcIik7IC8vQWRkIFRlc3QsIHJlbW92ZSBUZXN0MlxuICAgICAgICAqIGUudG9nZ2xlQ29tcG9uZW50KFwiVGVzdFwiKTsgICAgICAgICAvL1JlbW92ZSBUZXN0XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgdG9nZ2xlQ29tcG9uZW50OmZ1bmN0aW9uKHRvZ2dsZSl7XG4gICAgICAgICAgICB2YXIgaSA9IDAsIGwsIGNvbXBzO1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZih0aGlzLmhhcyhhcmd1bWVudHNbaV0pKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvL3NwbGl0IGNvbXBvbmVudHMgaWYgY29udGFpbnMgY29tbWFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG9nZ2xlLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBjb21wcyA9IHRvZ2dsZS5zcGxpdChybGlzdCk7XG4gICAgICAgICAgICAgICAgbCA9IGNvbXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZih0aGlzLmhhcyhjb21wc1tpXSkpeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ29tcG9uZW50KGNvbXBzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjb21wc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAvL3NpbmdsZSBjb21wb25lbnQgcGFzc2VkXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuaGFzKHRvZ2dsZSkpeyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQodG9nZ2xlKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodG9nZ2xlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnJlcXVpcmVzXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAucmVxdWlyZXMoU3RyaW5nIGNvbXBvbmVudExpc3QpXG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudExpc3QgLSBMaXN0IG9mIGNvbXBvbmVudHMgdGhhdCBtdXN0IGJlIGFkZGVkXG4gICAgICAgICogXG4gICAgICAgICogTWFrZXMgc3VyZSB0aGUgZW50aXR5IGhhcyB0aGUgY29tcG9uZW50cyBsaXN0ZWQuIElmIHRoZSBlbnRpdHkgZG9lcyBub3RcbiAgICAgICAgKiBoYXZlIHRoZSBjb21wb25lbnQsIGl0IHdpbGwgYWRkIGl0LlxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgLmFkZENvbXBvbmVudFxuICAgICAgICAqL1xuICAgICAgICByZXF1aXJlczogZnVuY3Rpb24gKGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBjb21wcyA9IGxpc3Quc3BsaXQocmxpc3QpLFxuICAgICAgICAgICAgaSA9IDAsIGwgPSBjb21wcy5sZW5ndGgsXG4gICAgICAgICAgICBjb21wO1xuXG4gICAgICAgICAgICAvL2xvb3Agb3ZlciB0aGUgbGlzdCBvZiBjb21wb25lbnRzIGFuZCBhZGQgaWYgbmVlZGVkXG4gICAgICAgICAgICBmb3IgKDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgIGNvbXAgPSBjb21wc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzKGNvbXApKSB0aGlzLmFkZENvbXBvbmVudChjb21wKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMucmVtb3ZlQ29tcG9uZW50XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAucmVtb3ZlQ29tcG9uZW50KFN0cmluZyBDb21wb25lbnRbLCBzb2Z0XSlcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50IC0gQ29tcG9uZW50IHRvIHJlbW92ZVxuICAgICAgICAqIEBwYXJhbSBzb2Z0IC0gV2hldGhlciB0byBzb2Z0IHJlbW92ZSBpdCAoZGVmYXVsdHMgdG8gYHRydWVgKVxuICAgICAgICAqXG4gICAgICAgICogUmVtb3ZlcyBhIGNvbXBvbmVudCBmcm9tIGFuIGVudGl0eS4gQSBzb2Z0IHJlbW92ZSAodGhlIGRlZmF1bHQpIHdpbGwgb25seVxuICAgICAgICAqIHJlZnJhaW4gYC5oYXMoKWAgZnJvbSByZXR1cm5pbmcgdHJ1ZS4gSGFyZCB3aWxsIHJlbW92ZSBhbGxcbiAgICAgICAgKiBhc3NvY2lhdGVkIHByb3BlcnRpZXMgYW5kIG1ldGhvZHMuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBlID0gQ3JhZnR5LmUoXCIyRCxET00sVGVzdFwiKTtcbiAgICAgICAgKiBlLnJlbW92ZUNvbXBvbmVudChcIlRlc3RcIik7ICAgICAgICAvL1NvZnQgcmVtb3ZlIFRlc3QgY29tcG9uZW50XG4gICAgICAgICogZS5yZW1vdmVDb21wb25lbnQoXCJUZXN0XCIsIGZhbHNlKTsgLy9IYXJkIHJlbW92ZSBUZXN0IGNvbXBvbmVudFxuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICByZW1vdmVDb21wb25lbnQ6IGZ1bmN0aW9uIChpZCwgc29mdCkge1xuICAgICAgICAgICAgaWYgKHNvZnQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzID0gY29tcG9uZW50c1tpZF0sIHByb3A7XG4gICAgICAgICAgICAgICAgZm9yIChwcm9wIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9fY1tpZF07XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIlJlbW92ZUNvbXBvbmVudFwiLCBpZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5oYXNcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5oYXMoU3RyaW5nIGNvbXBvbmVudClcbiAgICAgICAgKiBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiBpZiB0aGVcbiAgICAgICAgKiBlbnRpdHkgaGFzIHRoZSBnaXZlbiBjb21wb25lbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBGb3IgYmV0dGVyIHBlcmZvcm1hbmNlLCBzaW1wbHkgdXNlIHRoZSBgLl9fY2Agb2JqZWN0XG4gICAgICAgICogd2hpY2ggd2lsbCBiZSBgdHJ1ZWAgaWYgdGhlIGVudGl0eSBoYXMgdGhlIGNvbXBvbmVudCBvclxuICAgICAgICAqIHdpbGwgbm90IGV4aXN0IChvciBiZSBgZmFsc2VgKS5cbiAgICAgICAgKi9cbiAgICAgICAgaGFzOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuX19jW2lkXTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5hdHRyXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuYXR0cihTdHJpbmcgcHJvcGVydHksICogdmFsdWUpXG4gICAgICAgICogQHBhcmFtIHByb3BlcnR5IC0gUHJvcGVydHkgb2YgdGhlIGVudGl0eSB0byBtb2RpZnlcbiAgICAgICAgKiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBzZXQgdGhlIHByb3BlcnR5IHRvXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmF0dHIoT2JqZWN0IG1hcClcbiAgICAgICAgKiBAcGFyYW0gbWFwIC0gT2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIHByb3BlcnR5IHRvIG1vZGlmeSBhbmQgdGhlIHZhbHVlIGFzIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICAgICAgICAqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gcHJvcGVydGllcyBjaGFuZ2UgLSB7a2V5OiB2YWx1ZX1cbiAgICAgICAgKiBcbiAgICAgICAgKiBVc2UgdGhpcyBtZXRob2QgdG8gc2V0IGFueSBwcm9wZXJ0eSBvZiB0aGUgZW50aXR5LlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdGhpcy5hdHRyKHtrZXk6IFwidmFsdWVcIiwgcHJvcDogNX0pO1xuICAgICAgICAqIHRoaXMua2V5OyAvL3ZhbHVlXG4gICAgICAgICogdGhpcy5wcm9wOyAvLzVcbiAgICAgICAgKlxuICAgICAgICAqIHRoaXMuYXR0cihcImtleVwiLCBcIm5ld3ZhbHVlXCIpO1xuICAgICAgICAqIHRoaXMua2V5OyAvL25ld3ZhbHVlXG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIGF0dHI6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIC8vaWYganVzdCB0aGUga2V5LCByZXR1cm4gdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2V4dGVuZCBpZiBvYmplY3RcbiAgICAgICAgICAgICAgICB0aGlzLmV4dGVuZChrZXkpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiLCBrZXkpOyAvL3RyaWdnZXIgY2hhbmdlIGV2ZW50XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2lmIGtleSB2YWx1ZSBwYWlyXG4gICAgICAgICAgICB0aGlzW2tleV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IHt9O1xuICAgICAgICAgICAgY2hhbmdlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiLCBjaGFuZ2UpOyAvL3RyaWdnZXIgY2hhbmdlIGV2ZW50XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy50b0FycmF5XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudG9BcnJheSh2b2lkKVxuICAgICAgICAqIFxuICAgICAgICAqIFRoaXMgbWV0aG9kIHdpbGwgc2ltcGx5IHJldHVybiB0aGUgZm91bmQgZW50aXRpZXMgYXMgYW4gYXJyYXkuXG4gICAgICAgICovXG4gICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzbGljZS5jYWxsKHRoaXMsIDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnRpbWVvdXRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50aW1lb3V0KEZ1bmN0aW9uIGNhbGxiYWNrLCBOdW1iZXIgZGVsYXkpXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgYWZ0ZXIgZ2l2ZW4gYW1vdW50IG9mIG1pbGxpc2Vjb25kc1xuICAgICAgICAqIEBwYXJhbSBkZWxheSAtIEFtb3VudCBvZiBtaWxsaXNlY29uZHMgdG8gZXhlY3V0ZSB0aGUgbWV0aG9kXG4gICAgICAgICogXG4gICAgICAgICogVGhlIGRlbGF5IG1ldGhvZCB3aWxsIGV4ZWN1dGUgYSBmdW5jdGlvbiBhZnRlciBhIGdpdmVuIGFtb3VudCBvZiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICAgICAgKlxuICAgICAgICAqIEVzc2VudGlhbGx5IGEgd3JhcHBlciBmb3IgYHNldFRpbWVvdXRgLlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiBEZXN0cm95IGl0c2VsZiBhZnRlciAxMDAgbWlsbGlzZWNvbmRzXG4gICAgICAgICogfn5+XG4gICAgICAgICogdGhpcy50aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICAqIH0sIDEwMCk7XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIHRpbWVvdXQ6IGZ1bmN0aW9uIChjYWxsYmFjaywgZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHNlbGYpO1xuICAgICAgICAgICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuYmluZFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmJpbmQoU3RyaW5nIGV2ZW50TmFtZSwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIGJpbmQgdG9cbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSB3aGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWRcbiAgICAgICAgKiBBdHRhY2ggdGhlIGN1cnJlbnQgZW50aXR5IChvciBlbnRpdGllcykgdG8gbGlzdGVuIGZvciBhbiBldmVudC5cbiAgICAgICAgKlxuICAgICAgICAqIENhbGxiYWNrIHdpbGwgYmUgaW52b2tlZCB3aGVuIGFuIGV2ZW50IHdpdGggdGhlIGV2ZW50IG5hbWUgcGFzc2VkXG4gICAgICAgICogaXMgdHJpZ2dlcmVkLiBEZXBlbmRpbmcgb24gdGhlIGV2ZW50LCBzb21lIGRhdGEgbWF5IGJlIHBhc3NlZFxuICAgICAgICAqIHZpYSBhbiBhcmd1bWVudCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICpcbiAgICAgICAgKiBUaGUgZmlyc3QgYXJndW1lbnQgaXMgdGhlIGV2ZW50IG5hbWUgKGNhbiBiZSBhbnl0aGluZykgd2hpbHN0IHRoZVxuICAgICAgICAqIHNlY29uZCBhcmd1bWVudCBpcyB0aGUgY2FsbGJhY2suIElmIHRoZSBldmVudCBoYXMgZGF0YSwgdGhlXG4gICAgICAgICogY2FsbGJhY2sgc2hvdWxkIGhhdmUgYW4gYXJndW1lbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBFdmVudHMgYXJlIGFyYml0cmFyeSBhbmQgcHJvdmlkZSBjb21tdW5pY2F0aW9uIGJldHdlZW4gY29tcG9uZW50cy5cbiAgICAgICAgKiBZb3UgY2FuIHRyaWdnZXIgb3IgYmluZCBhbiBldmVudCBldmVuIGlmIGl0IGRvZXNuJ3QgZXhpc3QgeWV0LlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdGhpcy5hdHRyKFwidHJpZ2dlcnNcIiwgMCk7IC8vc2V0IGEgdHJpZ2dlciBjb3VudFxuICAgICAgICAqIHRoaXMuYmluZChcIm15ZXZlbnRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICogICAgIHRoaXMudHJpZ2dlcnMrKzsgLy93aGVuZXZlciBteWV2ZW50IGlzIHRyaWdnZXJlZCwgaW5jcmVtZW50XG4gICAgICAgICogfSk7XG4gICAgICAgICogdGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgICAgdGhpcy50cmlnZ2VyKFwibXlldmVudFwiKTsgLy90cmlnZ2VyIG15ZXZlbnQgb24gZXZlcnkgZnJhbWVcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIC50cmlnZ2VyLCAudW5iaW5kXG4gICAgICAgICovXG4gICAgICAgIGJpbmQ6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vb3B0aW1pemF0aW9uIGZvciAxIGVudGl0eVxuICAgICAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYW5kbGVyc1tldmVudF0pIGhhbmRsZXJzW2V2ZW50XSA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBoID0gaGFuZGxlcnNbZXZlbnRdO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFoW3RoaXNbMF1dKSBoW3RoaXNbMF1dID0gW107IC8vaW5pdCBoYW5kbGVyIGFycmF5IGZvciBlbnRpdHlcbiAgICAgICAgICAgICAgICBoW3RoaXNbMF1dLnB1c2goY2FsbGJhY2spOyAvL2FkZCBjdXJyZW50IGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy9pbml0IGV2ZW50IGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZXJzW2V2ZW50XSkgaGFuZGxlcnNbZXZlbnRdID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGggPSBoYW5kbGVyc1tldmVudF07XG5cbiAgICAgICAgICAgICAgICBpZiAoIWhbdGhpc1swXV0pIGhbdGhpc1swXV0gPSBbXTsgLy9pbml0IGhhbmRsZXIgYXJyYXkgZm9yIGVudGl0eVxuICAgICAgICAgICAgICAgIGhbdGhpc1swXV0ucHVzaChjYWxsYmFjayk7IC8vYWRkIGN1cnJlbnQgY2FsbGJhY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMudW5iaW5kXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudW5iaW5kKFN0cmluZyBldmVudE5hbWVbLCBGdW5jdGlvbiBjYWxsYmFja10pXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIHVuYmluZFxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIHVuYmluZFxuICAgICAgICAqIFJlbW92ZXMgYmluZGluZyB3aXRoIGFuIGV2ZW50IGZyb20gY3VycmVudCBlbnRpdHkuXG4gICAgICAgICpcbiAgICAgICAgKiBQYXNzaW5nIGFuIGV2ZW50IG5hbWUgd2lsbCByZW1vdmUgYWxsIGV2ZW50cyBib3VuZCB0b1xuICAgICAgICAqIHRoYXQgZXZlbnQuIFBhc3NpbmcgYSByZWZlcmVuY2UgdG8gdGhlIGNhbGxiYWNrIHdpbGxcbiAgICAgICAgKiB1bmJpbmQgb25seSB0aGF0IGNhbGxiYWNrLlxuICAgICAgICAqIEBzZWUgLmJpbmQsIC50cmlnZ2VyXG4gICAgICAgICovXG4gICAgICAgIHVuYmluZDogZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGRsID0gaGFuZGxlcnNbZXZlbnRdLCBpID0gMCwgbCwgY3VycmVudDtcbiAgICAgICAgICAgICAgICAvL2lmIG5vIGV2ZW50cywgY2FuY2VsXG4gICAgICAgICAgICAgICAgaWYgKGhkbCAmJiBoZGxbdGhpc1swXV0pIGwgPSBoZGxbdGhpc1swXV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGVsc2UgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgICAgICAgICAvL2lmIG5vIGZ1bmN0aW9uLCBkZWxldGUgYWxsXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaGRsW3RoaXNbMF1dO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9sb29rIGZvciBhIG1hdGNoIGlmIHRoZSBmdW5jdGlvbiBpcyBwYXNzZWRcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gaGRsW3RoaXNbMF1dO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudFtpXSA9PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMudHJpZ2dlclxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRyaWdnZXIoU3RyaW5nIGV2ZW50TmFtZVssIE9iamVjdCBkYXRhXSlcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gRXZlbnQgdG8gdHJpZ2dlclxuICAgICAgICAqIEBwYXJhbSBkYXRhIC0gQXJiaXRyYXJ5IGRhdGEgdGhhdCB3aWxsIGJlIHBhc3NlZCBpbnRvIGV2ZXJ5IGNhbGxiYWNrIGFzIGFuIGFyZ3VtZW50XG4gICAgICAgICogVHJpZ2dlciBhbiBldmVudCB3aXRoIGFyYml0cmFyeSBkYXRhLiBXaWxsIGludm9rZSBhbGwgY2FsbGJhY2tzIHdpdGhcbiAgICAgICAgKiB0aGUgY29udGV4dCAodmFsdWUgb2YgYHRoaXNgKSBvZiB0aGUgY3VycmVudCBlbnRpdHkgb2JqZWN0LlxuICAgICAgICAqXG4gICAgICAgICogKk5vdGU6IFRoaXMgd2lsbCBvbmx5IGV4ZWN1dGUgY2FsbGJhY2tzIHdpdGhpbiB0aGUgY3VycmVudCBlbnRpdHksIG5vIG90aGVyIGVudGl0eS4qXG4gICAgICAgICpcbiAgICAgICAgKiBUaGUgZmlyc3QgYXJndW1lbnQgaXMgdGhlIGV2ZW50IG5hbWUgdG8gdHJpZ2dlciBhbmQgdGhlIG9wdGlvbmFsXG4gICAgICAgICogc2Vjb25kIGFyZ3VtZW50IGlzIHRoZSBhcmJpdHJhcnkgZXZlbnQgZGF0YS4gVGhpcyBjYW4gYmUgYWJzb2x1dGVseSBhbnl0aGluZy5cbiAgICAgICAgKi9cbiAgICAgICAgdHJpZ2dlcjogZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvL2ZpbmQgdGhlIGhhbmRsZXJzIGFzc2lnbmVkIHRvIHRoZSBldmVudCBhbmQgZW50aXR5XG4gICAgICAgICAgICAgICAgaWYgKGhhbmRsZXJzW2V2ZW50XSAmJiBoYW5kbGVyc1tldmVudF1bdGhpc1swXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGhhbmRsZXJzW2V2ZW50XVt0aGlzWzBdXSwgaSA9IDAsIGwgPSBjYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmNhbGwodGhpcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy9maW5kIHRoZSBoYW5kbGVycyBhc3NpZ25lZCB0byB0aGUgZXZlbnQgYW5kIGVudGl0eVxuICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyc1tldmVudF0gJiYgaGFuZGxlcnNbZXZlbnRdW3RoaXNbMF1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSBoYW5kbGVyc1tldmVudF1bdGhpc1swXV0sIGkgPSAwLCBsID0gY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5jYWxsKHRoaXMsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5lYWNoXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmVhY2goRnVuY3Rpb24gbWV0aG9kKVxuICAgICAgICAqIEBwYXJhbSBtZXRob2QgLSBNZXRob2QgdG8gY2FsbCBvbiBlYWNoIGl0ZXJhdGlvblxuICAgICAgICAqIEl0ZXJhdGVzIG92ZXIgZm91bmQgZW50aXRpZXMsIGNhbGxpbmcgYSBmdW5jdGlvbiBmb3IgZXZlcnkgZW50aXR5LlxuICAgICAgICAqXG4gICAgICAgICogVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBlbnRpdHkgYW5kIHdpbGwgcGFzcyB0aGUgaW5kZXhcbiAgICAgICAgKiBpbiB0aGUgaXRlcmF0aW9uIGFzIGFuIGFyZ3VtZW50LiBUaGUgY29udGV4dCAodmFsdWUgb2YgYHRoaXNgKSBvZiB0aGVcbiAgICAgICAgKiBmdW5jdGlvbiB3aWxsIGJlIHRoZSBjdXJyZW50IGVudGl0eSBpbiB0aGUgaXRlcmF0aW9uLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogRGVzdHJveSBldmVyeSBzZWNvbmQgMkQgZW50aXR5XG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5KFwiMkRcIikuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICogICAgIGlmKGkgJSAyID09PSAwKSB7XG4gICAgICAgICogICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgKiAgICAgfVxuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBlYWNoOiBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICAgICAgdmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vc2tpcCBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKCFlbnRpdGllc1t0aGlzW2ldXSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgZnVuYy5jYWxsKGVudGl0aWVzW3RoaXNbaV1dLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmNsb25lXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgRW50aXR5IC5jbG9uZSh2b2lkKVxuICAgICAgICAqIEByZXR1cm5zIENsb25lZCBlbnRpdHkgb2YgdGhlIGN1cnJlbnQgZW50aXR5XG4gICAgICAgICogXG4gICAgICAgICogTWV0aG9kIHdpbGwgY3JlYXRlIGFub3RoZXIgZW50aXR5IHdpdGggdGhlIGV4YWN0IHNhbWVcbiAgICAgICAgKiBwcm9wZXJ0aWVzLCBjb21wb25lbnRzIGFuZCBtZXRob2RzIGFzIHRoZSBjdXJyZW50IGVudGl0eS5cbiAgICAgICAgKi9cbiAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb21wcyA9IHRoaXMuX19jLFxuICAgICAgICAgICAgY29tcCxcbiAgICAgICAgICAgIHByb3AsXG4gICAgICAgICAgICBjbG9uZSA9IENyYWZ0eS5lKCk7XG5cbiAgICAgICAgICAgIGZvciAoY29tcCBpbiBjb21wcykge1xuICAgICAgICAgICAgICAgIGNsb25lLmFkZENvbXBvbmVudChjb21wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAocHJvcCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3AgIT0gXCIwXCIgJiYgcHJvcCAhPSBcIl9nbG9iYWxcIiAmJiBwcm9wICE9IFwiX2NoYW5nZWRcIiAmJiB0eXBlb2YgdGhpc1twcm9wXSAhPSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHRoaXNbcHJvcF0gIT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICBjbG9uZVtwcm9wXSA9IHRoaXNbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuc2V0dGVyXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuc2V0dGVyKFN0cmluZyBwcm9wZXJ0eSwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIHByb3BlcnR5IC0gUHJvcGVydHkgdG8gd2F0Y2ggZm9yIG1vZGlmaWNhdGlvblxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIGlmIHRoZSBwcm9wZXJ0eSBpcyBtb2RpZmllZFxuICAgICAgICAqIFdpbGwgd2F0Y2ggYSBwcm9wZXJ0eSB3YWl0aW5nIGZvciBtb2RpZmljYXRpb24gYW5kIHdpbGwgdGhlbiBpbnZva2UgdGhlXG4gICAgICAgICogZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhdHRlbXB0aW5nIHRvIG1vZGlmeS5cbiAgICAgICAgKlxuICAgICAgICAqICpOb3RlOiBTdXBwb3J0IGluIElFPDkgaXMgc2xpZ2h0bHkgZGlmZmVyZW50LiBUaGUgbWV0aG9kIHdpbGwgYmUgZXhlY3V0ZWRcbiAgICAgICAgKiBhZnRlciB0aGUgcHJvcGVydHkgaGFzIGJlZW4gc2V0KlxuICAgICAgICAqL1xuICAgICAgICBzZXR0ZXI6IGZ1bmN0aW9uIChwcm9wLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdXBwb3J0LnNldHRlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX19kZWZpbmVTZXR0ZXJfXyhwcm9wLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKENyYWZ0eS5zdXBwb3J0LmRlZmluZVByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3AsIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0OiBjYWxsYmFjayxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vU2V0dGVyLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBwcm9wOiBwcm9wLFxuICAgICAgICAgICAgICAgICAgICBvYmo6IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGZuOiBjYWxsYmFja1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuZGVzdHJveVxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmRlc3Ryb3kodm9pZClcbiAgICAgICAgKiBXaWxsIHJlbW92ZSBhbGwgZXZlbnQgbGlzdGVuZXJzIGFuZCBkZWxldGUgYWxsIHByb3BlcnRpZXMgYXMgd2VsbCBhcyByZW1vdmluZyBmcm9tIHRoZSBzdGFnZVxuICAgICAgICAqL1xuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvL3JlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMsIGRlbGV0ZSBmcm9tIGVudGl0aWVzXG4gICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIlJlbW92ZVwiKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlIGluIGhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5iaW5kKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWxldGUgZW50aXRpZXNbdGhpc1swXV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvL2dpdmUgdGhlIGluaXQgaW5zdGFuY2VzIHRoZSBDcmFmdHkgcHJvdG90eXBlXG4gICAgQ3JhZnR5LmZuLmluaXQucHJvdG90eXBlID0gQ3JhZnR5LmZuO1xuXG4gICAgLyoqXG4gICAgKiBFeHRlbnNpb24gbWV0aG9kIHRvIGV4dGVuZCB0aGUgbmFtZXNwYWNlIGFuZFxuICAgICogc2VsZWN0b3IgaW5zdGFuY2VzXG4gICAgKi9cbiAgICBDcmFmdHkuZXh0ZW5kID0gQ3JhZnR5LmZuLmV4dGVuZCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMsIGtleTtcblxuICAgICAgICAvL2Rvbid0IGJvdGhlciB3aXRoIG51bGxzXG4gICAgICAgIGlmICghb2JqKSByZXR1cm4gdGFyZ2V0O1xuXG4gICAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gb2JqW2tleV0pIGNvbnRpbnVlOyAvL2hhbmRsZSBjaXJjdWxhciByZWZlcmVuY2VcbiAgICAgICAgICAgIHRhcmdldFtrZXldID0gb2JqW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmV4dGVuZFxuICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAqIFVzZWQgdG8gZXh0ZW5kIHRoZSBDcmFmdHkgbmFtZXNwYWNlLlxuICAgICovXG4gICAgQ3JhZnR5LmV4dGVuZCh7XG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmluaXRcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEB0cmlnZ2VyIEVudGVyRnJhbWUgLSBvbiBlYWNoIGZyYW1lIC0geyBmcmFtZTogTnVtYmVyIH1cbiAgICAgICAgKiBAdHJpZ2dlciBMb2FkIC0gSnVzdCBhZnRlciB0aGUgdmlld3BvcnQgaXMgaW5pdGlhbGlzZWQuIEJlZm9yZSB0aGUgRW50ZXJGcmFtZSBsb29wcyBpcyBzdGFydGVkXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmluaXQoW051bWJlciB3aWR0aCwgTnVtYmVyIGhlaWdodF0pXG4gICAgICAgICogQHBhcmFtIHdpZHRoIC0gV2lkdGggb2YgdGhlIHN0YWdlXG4gICAgICAgICogQHBhcmFtIGhlaWdodCAtIEhlaWdodCBvZiB0aGUgc3RhZ2VcbiAgICAgICAgKiBcbiAgICAgICAgKiBDcmVhdGUgYSBkaXYgd2l0aCBpZCBgY3Itc3RhZ2VgLCBpZiB0aGVyZSBpcyBub3QgYWxyZWFkeSBhbiBIVE1MRWxlbWVudCB3aXRoIGlkIGBjci1zdGFnZWAgKGJ5IGBDcmFmdHkudmlld3BvcnQuaW5pdGApLlxuICAgICAgICAqXG4gICAgICAgICogU3RhcnRzIHRoZSBgRW50ZXJGcmFtZWAgaW50ZXJ2YWwuIFRoaXMgd2lsbCBjYWxsIHRoZSBgRW50ZXJGcmFtZWAgZXZlbnQgZm9yIGV2ZXJ5IGZyYW1lLlxuICAgICAgICAqXG4gICAgICAgICogQ2FuIHBhc3Mgd2lkdGggYW5kIGhlaWdodCB2YWx1ZXMgZm9yIHRoZSBzdGFnZSBvdGhlcndpc2Ugd2lsbCBkZWZhdWx0IHRvIHdpbmRvdyBzaXplIChzZWUgYENyYWZ0eS5ET00ud2luZG93YCkuXG4gICAgICAgICpcbiAgICAgICAgKiBBbGwgYExvYWRgIGV2ZW50cyB3aWxsIGJlIGV4ZWN1dGVkLlxuICAgICAgICAqXG4gICAgICAgICogVXNlcyBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0byBzeW5jIHRoZSBkcmF3aW5nIHdpdGggdGhlIGJyb3dzZXIgYnV0IHdpbGwgZGVmYXVsdCB0byBgc2V0SW50ZXJ2YWxgIGlmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgaXQuXG4gICAgICAgICogQHNlZSBDcmFmdHkuc3RvcCwgIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAqL1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAodywgaCkge1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LmluaXQodywgaCk7XG5cbiAgICAgICAgICAgIC8vY2FsbCBhbGwgYXJiaXRyYXJ5IGZ1bmN0aW9ucyBhdHRhY2hlZCB0byBvbmxvYWRcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkxvYWRcIik7XG4gICAgICAgICAgICB0aGlzLnRpbWVyLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuZ2V0VmVyc2lvblxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmdldFZlcnNpb24oKVxuICAgICAgICAqIEByZXR1cm5zIEFjdHVhbGx5IGNyYWZ0eSB2ZXJzaW9uXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eS5nZXRWZXJzaW9uKCk7IC8vJzAuNS4yJ1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBnZXRWZXJzaW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJzAuNS4zJztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5zdG9wXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAdHJpZ2dlciBDcmFmdHlTdG9wIC0gd2hlbiB0aGUgZ2FtZSBpcyBzdG9wcGVkXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LnN0b3AoW2Jvb2wgY2xlYXJTdGF0ZV0pXG5cdFx0KiBAcGFyYW0gY2xlYXJTdGF0ZSAtIGlmIHRydWUgdGhlIHN0YWdlIGFuZCBhbGwgZ2FtZSBzdGF0ZSBpcyBjbGVhcmVkLlxuICAgICAgICAqXG4gICAgICAgICogU3RvcHMgdGhlIEVudGVyRnJhbWUgaW50ZXJ2YWwgYW5kIHJlbW92ZXMgdGhlIHN0YWdlIGVsZW1lbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBUbyByZXN0YXJ0LCB1c2UgYENyYWZ0eS5pbml0KClgLlxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmluaXRcbiAgICAgICAgKi9cbiAgICAgICAgc3RvcDogZnVuY3Rpb24gKGNsZWFyU3RhdGUpIHtcbiAgICAgICAgXHR0aGlzLnRpbWVyLnN0b3AoKTtcbiAgICAgICAgXHRpZiAoY2xlYXJTdGF0ZSkge1xuICAgICAgICBcdFx0aWYgKENyYWZ0eS5zdGFnZSAmJiBDcmFmdHkuc3RhZ2UuZWxlbS5wYXJlbnROb2RlKSB7XG4gICAgICAgIFx0XHRcdHZhciBuZXdDclN0YWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIFx0XHRcdG5ld0NyU3RhZ2UuaWQgPSBcImNyLXN0YWdlXCI7XG4gICAgICAgIFx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld0NyU3RhZ2UsIENyYWZ0eS5zdGFnZS5lbGVtKTtcbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHRcdGluaXRTdGF0ZSgpO1xuICAgICAgICBcdFx0aW5pdENvbXBvbmVudHMoQ3JhZnR5LCB3aW5kb3csIHdpbmRvdy5kb2N1bWVudCk7XG4gICAgICAgIFx0fVxuXG4gICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIkNyYWZ0eVN0b3BcIik7XG5cbiAgICAgICAgXHRyZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5wYXVzZVxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHRyaWdnZXIgUGF1c2UgLSB3aGVuIHRoZSBnYW1lIGlzIHBhdXNlZFxuICAgICAgICAqIEB0cmlnZ2VyIFVucGF1c2UgLSB3aGVuIHRoZSBnYW1lIGlzIHVucGF1c2VkXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LnBhdXNlKHZvaWQpXG4gICAgICAgICogXG4gICAgICAgICogUGF1c2VzIHRoZSBnYW1lIGJ5IHN0b3BwaW5nIHRoZSBFbnRlckZyYW1lIGV2ZW50IGZyb20gZmlyaW5nLiBJZiB0aGUgZ2FtZSBpcyBhbHJlYWR5IHBhdXNlZCBpdCBpcyB1bnBhdXNlZC5cbiAgICAgICAgKiBZb3UgY2FuIHBhc3MgYSBib29sZWFuIHBhcmFtZXRlciBpZiB5b3Ugd2FudCB0byBwYXVzZSBvciB1bnBhdXNlIG1vIG1hdHRlciB3aGF0IHRoZSBjdXJyZW50IHN0YXRlIGlzLlxuICAgICAgICAqIE1vZGVybiBicm93c2VycyBwYXVzZXMgdGhlIGdhbWUgd2hlbiB0aGUgcGFnZSBpcyBub3QgdmlzaWJsZSB0byB0aGUgdXNlci4gSWYgeW91IHdhbnQgdGhlIFBhdXNlIGV2ZW50XG4gICAgICAgICogdG8gYmUgdHJpZ2dlcmVkIHdoZW4gdGhhdCBoYXBwZW5zIHlvdSBjYW4gZW5hYmxlIGF1dG9QYXVzZSBpbiBgQ3JhZnR5LnNldHRpbmdzYC5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIEhhdmUgYW4gZW50aXR5IHBhdXNlIHRoZSBnYW1lIHdoZW4gaXQgaXMgY2xpY2tlZC5cbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBidXR0b24uYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgICBDcmFmdHkucGF1c2UoKTtcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgcGF1c2U6IGZ1bmN0aW9uICh0b2dnbGUpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEgPyB0b2dnbGUgOiAhdGhpcy5fcGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdQYXVzZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpeyBDcmFmdHkudGltZXIuc3RvcCgpOyB9LCAwKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkua2V5ZG93biA9IHt9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ1VucGF1c2UnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IENyYWZ0eS50aW1lci5pbml0KCk7IH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LmlzUGF1c2VkXG4gICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc1BhdXNlZCgpXG4gICAgICAgICAqIFxuICAgICAgICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnYW1lIGlzIGFscmVhZHkgcGF1c2VkIG9yIG5vdC5cbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiBDcmFmdHkuaXNQYXVzZWQoKTtcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBpc1BhdXNlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS50aW1lclxuICAgICAgICAqIEBjYXRlZ29yeSBJbnRlcm5hbFxuICAgICAgICAqIEhhbmRsZXMgZ2FtZSB0aWNrc1xuICAgICAgICAqL1xuICAgICAgICB0aW1lcjoge1xuICAgICAgICAgICAgcHJldjogKCtuZXcgRGF0ZSksXG4gICAgICAgICAgICBjdXJyZW50OiAoK25ldyBEYXRlKSxcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lOiArbmV3IERhdGUoKSxcbiAgICAgICAgICAgIGZyYW1lczowLFxuICAgICAgICAgICAgZnJhbWVUaW1lOjAsXG4gICAgICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgbnVsbDtcblxuICAgICAgICAgICAgICAgIGlmIChvbkZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkudGltZXIuc3RlcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdElEID0gb25GcmFtZSh0aWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVxdWVzdElEICsgJywgJyArIGZyYW1lKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGljaygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2sgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7IENyYWZ0eS50aW1lci5zdGVwKCk7IH0sIDEwMDAgLyBGUFMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIkNyYWZ0eVN0b3BUaW1lclwiKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGljayA9PT0gXCJudW1iZXJcIikgY2xlYXJJbnRlcnZhbCh0aWNrKTtcblxuICAgICAgICAgICAgICAgIHZhciBvbkZyYW1lID0gd2luZG93LmNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cud2Via2l0Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5tb3pDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm9DYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1zQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIG51bGw7XG5cbiAgICAgICAgICAgICAgICBpZiAob25GcmFtZSkgb25GcmFtZShyZXF1ZXN0SUQpO1xuICAgICAgICAgICAgICAgIHRpY2sgPSBudWxsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnRpbWVyLnN0ZXBcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnRpbWVyXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS50aW1lci5zdGVwKClcbiAgICAgICAgICAgICogQWR2YW5jZXMgdGhlIGdhbWUgYnkgdHJpZ2dlcmluZyBgRW50ZXJGcmFtZWAgYW5kIGNhbGxzIGBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd2AgdG8gdXBkYXRlIHRoZSBzdGFnZS5cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbG9vcHMgPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZSAtIG5leHRHYW1lVGljayA+IDYwICogbWlsbGlTZWNQZXJGcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0R2FtZVRpY2sgPSB0aGlzLmN1cnJlbnRUaW1lIC0gbWlsbGlTZWNQZXJGcmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuY3VycmVudFRpbWUgPiBuZXh0R2FtZVRpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJFbnRlckZyYW1lXCIsIHsgZnJhbWU6IGZyYW1lKysgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5leHRHYW1lVGljayArPSBtaWxsaVNlY1BlckZyYW1lO1xuICAgICAgICAgICAgICAgICAgICBsb29wcysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobG9vcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICBpZih0aGlzLmN1cnJlbnRUaW1lID4gdGhpcy5mcmFtZVRpbWUpe1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIk1lc3N1cmVGUFNcIix7dmFsdWU6dGhpcy5mcmFtZX0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZyYW1lID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZVRpbWUgPSB0aGlzLmN1cnJlbnRUaW1lICsgMTAwMDtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZSsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS50aW1lci5nZXRGUFNcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnRpbWVyXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS50aW1lci5nZXRGUFMoKVxuICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSB0YXJnZXQgZnJhbWVzIHBlciBzZWNvbmQuIFRoaXMgaXMgbm90IGFuIGFjdHVhbCBmcmFtZSByYXRlLlxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldEZQUzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBGUFM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkudGltZXIuc2ltdWxhdGVGcmFtZXNcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnRpbWVyXG4gICAgICAgICAgICAqIEFkdmFuY2VzIHRoZSBnYW1lIHN0YXRlIGJ5IGEgbnVtYmVyIG9mIGZyYW1lcyBhbmQgZHJhd3MgdGhlIHJlc3VsdGluZyBzdGFnZSBhdCB0aGUgZW5kLiBVc2VmdWwgZm9yIHRlc3RzIGFuZCBkZWJ1Z2dpbmcuXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS50aW1lci5zaW11bGF0ZUZyYW1lcyhOdW1iZXIgZnJhbWVzKVxuICAgICAgICAgICAgKiBAcGFyYW0gZnJhbWVzIC0gbnVtYmVyIG9mIGZyYW1lcyB0byBzaW11bGF0ZVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNpbXVsYXRlRnJhbWVzOiBmdW5jdGlvbiAoZnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGZyYW1lcy0tID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIkVudGVyRnJhbWVcIiwgeyBmcmFtZTogZnJhbWUrKyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmFkZEVudGl0eUZhY3RvcnlcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEBwYXJhbSBuYW1lIC0gTmFtZSBvZiB0aGUgZW50aXR5IGZhY3RvcnkuXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gRnVuY3Rpb24gY29udGFpbmluZyB0aGUgZW50aXR5IGNyZWF0aW9uIHByb2NlZHVyZS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBSZWdpc3RlcnMgYW4gRW50aXR5IEZhY3RvcnkuICBBbiBFbnRpdHkgRmFjdG9yeSBhbGxvd3MgZm9yIHRoZSByZXBlYXRhYmxlIGNyZWF0aW9uIG9mIGFuIEVudGl0eS5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5LmFkZEVudGl0eUZhY3RvcnkoJ1Byb2plY3RpbGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgIHZhciBlbnRpdHkgPSBDcmFmdHkuZSgnMkQsIENhbnZhcywgQ29sb3IsIFBoeXNpY3MsIENvbGxpc2lvbicpXG4gICAgICAgICogICAuY29sb3IoXCJyZWRcIilcbiAgICAgICAgKiAgIC5hdHRyKHtcbiAgICAgICAgKiAgICAgdzogMyxcbiAgICAgICAgKiAgICAgaDogMyxcbiAgICAgICAgKiAgICAgeDogdGhpcy54LFxuICAgICAgICAqICAgICB5OiB0aGlzLnlcbiAgICAgICAgKiAgIH0pXG4gICAgICAgICogICAuYWRkQ29tcG9uZW50KCdHcmF2aXR5JykuZ3Jhdml0eShcIkZsb29yXCIpO1xuICAgICAgICAqICAgXG4gICAgICAgICogICByZXR1cm4gZW50aXR5O1xuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmVcbiAgICAgICAgKi9cbiAgICAgICAgYWRkRW50aXR5RmFjdG9yeTogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuZW50aXR5RmFjdG9yaWVzW25hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkubmV3RmFjdG9yeUVudGl0eVxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHBhcmFtIG5hbWUgLSBOYW1lIG9mIHRoZSBlbnRpdHkgZmFjdG9yeS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBDcmVhdGVzIGEgbmV3IGVudGl0eSBiYXNlZCBvbiBhIHNwZWNpZmljIEVudGl0eSBGYWN0b3J5LlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkuYWRkRW50aXR5RmFjdG9yeSgnUHJvamVjdGlsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgdmFyIGVudGl0eSA9IENyYWZ0eS5lKCcyRCwgQ2FudmFzLCBDb2xvciwgUGh5c2ljcywgQ29sbGlzaW9uJylcbiAgICAgICAgKiAgIC5jb2xvcihcInJlZFwiKVxuICAgICAgICAqICAgLmF0dHIoe1xuICAgICAgICAqICAgICB3OiAzLFxuICAgICAgICAqICAgICBoOiAzLFxuICAgICAgICAqICAgICB4OiB0aGlzLngsXG4gICAgICAgICogICAgIHk6IHRoaXMueVxuICAgICAgICAqICAgfSlcbiAgICAgICAgKiAgIC5hZGRDb21wb25lbnQoJ0dyYXZpdHknKS5ncmF2aXR5KFwiRmxvb3JcIik7XG4gICAgICAgICogICBcbiAgICAgICAgKiAgIHJldHVybiBlbnRpdHk7XG4gICAgICAgICogfSk7XG4gICAgICAgICpcbiAgICAgICAgKiBDcmFmdHkubmV3RmFjdG9yeUVudGl0eSgnUHJvamVjdGlsZScpOyAvLyBUaGlzIHJldHVybnMgYSBuZXcgUHJvamVjdGlsZSBFbnRpdHkuXG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuZVxuICAgICAgICAqL1xuICAgICAgICBuZXdGYWN0b3J5RW50aXR5OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbnRpdHlUZW1wbGF0ZXNbbmFtZV0oKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5lXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAdHJpZ2dlciBOZXdFbnRpdHkgLSBXaGVuIHRoZSBlbnRpdHkgaXMgY3JlYXRlZCBhbmQgYWxsIGNvbXBvbmVudHMgYXJlIGFkZGVkIC0geyBpZDpOdW1iZXIgfVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBFbnRpdHkgQ3JhZnR5LmUoU3RyaW5nIGNvbXBvbmVudExpc3QpXG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudExpc3QgLSBMaXN0IG9mIGNvbXBvbmVudHMgdG8gYXNzaWduIHRvIG5ldyBlbnRpdHlcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgRW50aXR5IENyYWZ0eS5lKFN0cmluZyBjb21wb25lbnQxWywgLi4sIFN0cmluZyBjb21wb25lbnROXSlcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50IyAtIENvbXBvbmVudCB0byBhZGRcbiAgICAgICAgKiBcbiAgICAgICAgKiBDcmVhdGVzIGFuIGVudGl0eS4gQW55IGFyZ3VtZW50cyB3aWxsIGJlIGFwcGxpZWQgaW4gdGhlIHNhbWVcbiAgICAgICAgKiB3YXkgYC5hZGRDb21wb25lbnQoKWAgaXMgYXBwbGllZCBhcyBhIHF1aWNrIHdheSB0byBhZGQgY29tcG9uZW50cy5cbiAgICAgICAgKlxuICAgICAgICAqIEFueSBjb21wb25lbnQgYWRkZWQgd2lsbCBhdWdtZW50IHRoZSBmdW5jdGlvbmFsaXR5IG9mXG4gICAgICAgICogdGhlIGNyZWF0ZWQgZW50aXR5IGJ5IGFzc2lnbmluZyB0aGUgcHJvcGVydGllcyBhbmQgbWV0aG9kcyBmcm9tIHRoZSBjb21wb25lbnQgdG8gdGhlIGVudGl0eS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBteUVudGl0eSA9IENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3JcIik7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuY1xuICAgICAgICAqL1xuICAgICAgICBlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBVSUQoKSwgY3JhZnQ7XG5cbiAgICAgICAgICAgIGVudGl0aWVzW2lkXSA9IG51bGw7IC8vcmVnaXN0ZXIgdGhlIHNwYWNlXG4gICAgICAgICAgICBlbnRpdGllc1tpZF0gPSBjcmFmdCA9IENyYWZ0eShpZCk7XG5cbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNyYWZ0LmFkZENvbXBvbmVudC5hcHBseShjcmFmdCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNyYWZ0LnNldE5hbWUoJ0VudGl0eSAjJytpZCk7IC8vc2V0IGRlZmF1bHQgZW50aXR5IGh1bWFuIHJlYWRhYmxlIG5hbWVcbiAgICAgICAgICAgIGNyYWZ0LmFkZENvbXBvbmVudChcIm9ialwiKTsgLy9ldmVyeSBlbnRpdHkgYXV0b21hdGljYWxseSBhc3N1bWVzIG9ialxuXG4gICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIk5ld0VudGl0eVwiLCB7IGlkOiBpZCB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGNyYWZ0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmNcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5jKFN0cmluZyBuYW1lLCBPYmplY3QgY29tcG9uZW50KVxuICAgICAgICAqIEBwYXJhbSBuYW1lIC0gTmFtZSBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudCAtIE9iamVjdCB3aXRoIHRoZSBjb21wb25lbnRzIHByb3BlcnRpZXMgYW5kIG1ldGhvZHNcbiAgICAgICAgKiBDcmVhdGVzIGEgY29tcG9uZW50IHdoZXJlIHRoZSBmaXJzdCBhcmd1bWVudCBpcyB0aGUgSUQgYW5kIHRoZSBzZWNvbmRcbiAgICAgICAgKiBpcyB0aGUgb2JqZWN0IHRoYXQgd2lsbCBiZSBpbmhlcml0ZWQgYnkgZW50aXRpZXMuXG4gICAgICAgICpcbiAgICAgICAgKiBUaGVyZSBpcyBhIGNvbnZlbnRpb24gZm9yIHdyaXRpbmcgY29tcG9uZW50cy4gXG4gICAgICAgICpcbiAgICAgICAgKiAtIFByb3BlcnRpZXMgb3IgbWV0aG9kcyB0aGF0IHN0YXJ0IHdpdGggYW4gdW5kZXJzY29yZSBhcmUgY29uc2lkZXJlZCBwcml2YXRlLlxuICAgICAgICAqIC0gQSBtZXRob2QgY2FsbGVkIGBpbml0YCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgY2FsbGVkIGFzIHNvb24gYXMgdGhlXG4gICAgICAgICogY29tcG9uZW50IGlzIGFkZGVkIHRvIGFuIGVudGl0eS5cbiAgICAgICAgKiAtIEEgbWV0aG9kIHdpdGggdGhlIHNhbWUgbmFtZSBhcyB0aGUgY29tcG9uZW50IGlzIGNvbnNpZGVyZWQgdG8gYmUgYSBjb25zdHJ1Y3RvclxuICAgICAgICAqIGFuZCBpcyBnZW5lcmFsbHkgdXNlZCB3aGVuIHlvdSBuZWVkIHRvIHBhc3MgY29uZmlndXJhdGlvbiBkYXRhIHRvIHRoZSBjb21wb25lbnQgb24gYSBwZXIgZW50aXR5IGJhc2lzLlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkuYyhcIkFubm95aW5nXCIsIHtcbiAgICAgICAgKiAgICAgX21lc3NhZ2U6IFwiSGlIaVwiLFxuICAgICAgICAqICAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgICAgICAgIHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24oKSB7IGFsZXJ0KHRoaXMubWVzc2FnZSk7IH0pO1xuICAgICAgICAqICAgICB9LFxuICAgICAgICAqICAgICBhbm5veWluZzogZnVuY3Rpb24obWVzc2FnZSkgeyB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlOyB9XG4gICAgICAgICogfSk7XG4gICAgICAgICpcbiAgICAgICAgKiBDcmFmdHkuZShcIkFubm95aW5nXCIpLmFubm95aW5nKFwiSSdtIGFuIG9yYW5nZS4uLlwiKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIFxuICAgICAgICAqIFdBUk5JTkc6IFxuICAgICAgICAqXG4gICAgICAgICogaW4gdGhlIGV4YW1wbGUgYWJvdmUgdGhlIGZpZWxkIF9tZXNzYWdlIGlzIGxvY2FsIHRvIHRoZSBlbnRpdHkuIFRoYXQgaXMsIGlmIHlvdSBjcmVhdGUgbWFueSBlbnRpdGllcyB3aXRoIHRoZSBBbm5veWluZyBjb21wb25lbnQgdGhleSBjYW4gYWxsIGhhdmUgZGlmZmVyZW50IHZhbHVlcyBmb3IgX21lc3NhZ2UuIFRoYXQgaXMgYmVjYXVzZSBpdCBpcyBhIHNpbXBsZSB2YWx1ZSwgYW5kIHNpbXBsZSB2YWx1ZXMgYXJlIGNvcGllZCBieSB2YWx1ZS4gSWYgaG93ZXZlciB0aGUgZmllbGQgaGFkIGJlZW4gYW4gb2JqZWN0IG9yIGFycmF5LCB0aGUgdmFsdWUgd291bGQgaGF2ZSBiZWVuIHNoYXJlZCBieSBhbGwgZW50aXRpZXMgd2l0aCB0aGUgY29tcG9uZW50IGJlY2F1c2UgY29tcGxleCB0eXBlcyBhcmUgY29waWVkIGJ5IHJlZmVyZW5jZSBpbiBqYXZhc2NyaXB0LiBUaGlzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHlvdSB3YW50IGFuZCB0aGUgZm9sbG93aW5nIGV4YW1wbGUgZGVtb25zdHJhdGVzIGhvdyB0byB3b3JrIGFyb3VuZCBpdDpcbiAgICAgICAgKlxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eS5jKFwiTXlDb21wb25lbnRcIiwge1xuICAgICAgICAqICAgICBfaUFtU2hhcmVkOiB7IGE6IDMsIGI6IDQgfSxcbiAgICAgICAgKiAgICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICogICAgICAgICB0aGlzLl9pQW1Ob3RTaGFyZWQgPSB7IGE6IDMsIGI6IDQgfTtcbiAgICAgICAgKiAgICAgfSxcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmVcbiAgICAgICAgKi9cbiAgICAgICAgYzogZnVuY3Rpb24gKGNvbXBOYW1lLCBjb21wb25lbnQpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHNbY29tcE5hbWVdID0gY29tcG9uZW50O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnRyaWdnZXJcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZSwgRXZlbnRzXG4gICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnRyaWdnZXIoU3RyaW5nIGV2ZW50TmFtZSwgKiBkYXRhKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBOYW1lIG9mIHRoZSBldmVudCB0byB0cmlnZ2VyXG4gICAgICAgICogQHBhcmFtIGRhdGEgLSBBcmJpdHJhcnkgZGF0YSB0byBwYXNzIGludG8gdGhlIGNhbGxiYWNrIGFzIGFuIGFyZ3VtZW50XG4gICAgICAgICogXG4gICAgICAgICogVGhpcyBtZXRob2Qgd2lsbCB0cmlnZ2VyIGV2ZXJ5IHNpbmdsZSBjYWxsYmFjayBhdHRhY2hlZCB0byB0aGUgZXZlbnQgbmFtZS4gVGhpcyBtZWFuc1xuICAgICAgICAqIGV2ZXJ5IGdsb2JhbCBldmVudCBhbmQgZXZlcnkgZW50aXR5IHRoYXQgaGFzIGEgY2FsbGJhY2suXG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuYmluZFxuICAgICAgICAqL1xuICAgICAgICB0cmlnZ2VyOiBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBoZGwgPSBoYW5kbGVyc1tldmVudF0sIGgsIGksIGw7XG4gICAgICAgICAgICAvL2xvb3Agb3ZlciBldmVyeSBvYmplY3QgYm91bmRcbiAgICAgICAgICAgIGZvciAoaCBpbiBoZGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhkbC5oYXNPd25Qcm9wZXJ0eShoKSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAvL2xvb3Agb3ZlciBldmVyeSBoYW5kbGVyIHdpdGhpbiBvYmplY3RcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaGRsW2hdLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGRsW2hdICYmIGhkbFtoXVtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9pZiBhbiBlbnRpdHksIGNhbGwgd2l0aCB0aGF0IGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdGllc1toXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhkbFtoXVtpXS5jYWxsKENyYWZ0eSgraCksIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9lbHNlIGNhbGwgd2l0aCBDcmFmdHkgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhkbFtoXVtpXS5jYWxsKENyYWZ0eSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuYmluZFxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlLCBFdmVudHNcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIGJpbmQoU3RyaW5nIGV2ZW50TmFtZSwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIGJpbmQgdG9cbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSB1cG9uIGV2ZW50IHRyaWdnZXJlZFxuICAgICAgICAqIEByZXR1cm5zIElEIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrIHVzZWQgdG8gdW5iaW5kXG4gICAgICAgICogXG4gICAgICAgICogQmluZHMgdG8gYSBnbG9iYWwgZXZlbnQuIE1ldGhvZCB3aWxsIGJlIGV4ZWN1dGVkIHdoZW4gYENyYWZ0eS50cmlnZ2VyYCBpcyB1c2VkXG4gICAgICAgICogd2l0aCB0aGUgZXZlbnQgbmFtZS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS50cmlnZ2VyLCBDcmFmdHkudW5iaW5kXG4gICAgICAgICovXG4gICAgICAgIGJpbmQ6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcnNbZXZlbnRdKSBoYW5kbGVyc1tldmVudF0gPSB7fTtcbiAgICAgICAgICAgIHZhciBoZGwgPSBoYW5kbGVyc1tldmVudF07XG5cbiAgICAgICAgICAgIGlmICghaGRsLmdsb2JhbCkgaGRsLmdsb2JhbCA9IFtdO1xuICAgICAgICAgICAgcmV0dXJuIGhkbC5nbG9iYWwucHVzaChjYWxsYmFjaykgLSAxO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnVuYmluZFxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlLCBFdmVudHNcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgQm9vbGVhbiBDcmFmdHkudW5iaW5kKFN0cmluZyBldmVudE5hbWUsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBOYW1lIG9mIHRoZSBldmVudCB0byB1bmJpbmRcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byB1bmJpbmRcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgQm9vbGVhbiBDcmFmdHkudW5iaW5kKFN0cmluZyBldmVudE5hbWUsIE51bWJlciBjYWxsYmFja0lEKVxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFja0lEIC0gSUQgb2YgdGhlIGNhbGxiYWNrXG4gICAgICAgICogQHJldHVybnMgVHJ1ZSBvciBmYWxzZSBkZXBlbmRpbmcgb24gaWYgYSBjYWxsYmFjayB3YXMgdW5ib3VuZFxuICAgICAgICAqIFVuYmluZCBhbnkgZXZlbnQgZnJvbSBhbnkgZW50aXR5IG9yIGdsb2JhbCBldmVudC5cbiAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaGRsID0gaGFuZGxlcnNbZXZlbnRdLCBoLCBpLCBsO1xuXG4gICAgICAgICAgICAvL2xvb3Agb3ZlciBldmVyeSBvYmplY3QgYm91bmRcbiAgICAgICAgICAgIGZvciAoaCBpbiBoZGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhkbC5oYXNPd25Qcm9wZXJ0eShoKSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAvL2lmIHBhc3NlZCB0aGUgSURcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBoZGxbaF1bY2FsbGJhY2tdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2xvb3Agb3ZlciBldmVyeSBoYW5kbGVyIHdpdGhpbiBvYmplY3RcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaGRsW2hdLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGRsW2hdW2ldID09PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGhkbFtoXVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZnJhbWVcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5LmZyYW1lKHZvaWQpXG4gICAgICAgICogUmV0dXJucyB0aGUgY3VycmVudCBmcmFtZSBudW1iZXJcbiAgICAgICAgKi9cbiAgICAgICAgZnJhbWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmcmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb21wb25lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcG9uZW50cztcbiAgICAgICAgfSxcblxuICAgICAgICBpc0NvbXA6IGZ1bmN0aW9uIChjb21wKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcCBpbiBjb21wb25lbnRzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlYnVnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZW50aXRpZXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuc2V0dGluZ3NcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIE1vZGlmeSB0aGUgaW5uZXIgd29ya2luZ3Mgb2YgQ3JhZnR5IHRocm91Z2ggdGhlIHNldHRpbmdzLlxuICAgICAgICAqL1xuICAgICAgICBzZXR0aW5nczogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZXMgPSB7fSxcbiAgICAgICAgICAgIGNhbGxiYWNrcyA9IHt9O1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyXG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS5zZXR0aW5nc1xuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIoU3RyaW5nIHNldHRpbmdOYW1lLCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgICAgICogQHBhcmFtIHNldHRpbmdOYW1lIC0gTmFtZSBvZiB0aGUgc2V0dGluZ1xuICAgICAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdXNlIG1vZGlmaWVzIHNldHRpbmdcbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIFVzZSB0aGlzIHRvIHJlZ2lzdGVyIGN1c3RvbSBzZXR0aW5ncy4gQ2FsbGJhY2sgd2lsbCBiZSBleGVjdXRlZCB3aGVuIGBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5YCBpcyB1c2VkLlxuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogQHNlZSBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoc2V0dGluZywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW3NldHRpbmddID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnNldHRpbmdzLm1vZGlmeVxuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkuc2V0dGluZ3NcbiAgICAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeShTdHJpbmcgc2V0dGluZ05hbWUsICogdmFsdWUpXG4gICAgICAgICAgICAqIEBwYXJhbSBzZXR0aW5nTmFtZSAtIE5hbWUgb2YgdGhlIHNldHRpbmdcbiAgICAgICAgICAgICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gc2V0IHRoZSBzZXR0aW5nIHRvXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBNb2RpZnkgc2V0dGluZ3MgdGhyb3VnaCB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIEBzZWUgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyLCBDcmFmdHkuc2V0dGluZ3MuZ2V0XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1vZGlmeTogZnVuY3Rpb24gKHNldHRpbmcsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FsbGJhY2tzW3NldHRpbmddKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tzZXR0aW5nXS5jYWxsKHN0YXRlc1tzZXR0aW5nXSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZXNbc2V0dGluZ10gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkuc2V0dGluZ3MuZ2V0XG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS5zZXR0aW5nc1xuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgKiBDcmFmdHkuc2V0dGluZ3MuZ2V0KFN0cmluZyBzZXR0aW5nTmFtZSlcbiAgICAgICAgICAgICogQHBhcmFtIHNldHRpbmdOYW1lIC0gTmFtZSBvZiB0aGUgc2V0dGluZ1xuICAgICAgICAgICAgKiBAcmV0dXJucyBDdXJyZW50IHZhbHVlIG9mIHRoZSBzZXR0aW5nXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBzZXR0aW5nLlxuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogQHNlZSBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIsIENyYWZ0eS5zZXR0aW5ncy5nZXRcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoc2V0dGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGVzW3NldHRpbmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKCksXG5cbiAgICAgICAgY2xvbmU6IGNsb25lXG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAqIFJldHVybiBhIHVuaXF1ZSBJRFxuICAgICovXG4gICAgZnVuY3Rpb24gVUlEKCkge1xuICAgICAgICB2YXIgaWQgPSBHVUlEKys7XG4gICAgICAgIC8vaWYgR1VJRCBpcyBub3QgdW5pcXVlXG4gICAgICAgIGlmIChpZCBpbiBlbnRpdGllcykge1xuICAgICAgICAgICAgcmV0dXJuIFVJRCgpOyAvL3JlY3Vyc2UgdW50aWwgaXQgaXMgdW5pcXVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH1cblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuY2xvbmVcbiAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgKiBAc2lnbiBwdWJsaWMgT2JqZWN0IC5jbG9uZShPYmplY3Qgb2JqKVxuICAgICogQHBhcmFtIG9iaiAtIGFuIG9iamVjdFxuICAgICogXG4gICAgKiBEZWVwIGNvcHkgKGEuay5hIGNsb25lKSBvZiBhbiBvYmplY3QuXG4gICAgKi9cbiAgICBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICAgICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Yob2JqKSAhPSAnb2JqZWN0JylcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG5cbiAgICAgICAgdmFyIHRlbXAgPSBvYmouY29uc3RydWN0b3IoKTsgLy8gY2hhbmdlZFxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopXG4gICAgICAgICAgICB0ZW1wW2tleV0gPSBjbG9uZShvYmpba2V5XSk7XG4gICAgICAgIHJldHVybiB0ZW1wO1xuICAgIH1cblxuICAgIENyYWZ0eS5iaW5kKFwiTG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghQ3JhZnR5LnN1cHBvcnQuc2V0dGVyICYmIENyYWZ0eS5zdXBwb3J0LmRlZmluZVByb3BlcnR5KSB7XG4gICAgICAgICAgICBub1NldHRlciA9IFtdO1xuICAgICAgICAgICAgQ3JhZnR5LmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IDAsIGwgPSBub1NldHRlci5sZW5ndGgsIGN1cnJlbnQ7XG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IG5vU2V0dGVyW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5vYmpbY3VycmVudC5wcm9wXSAhPT0gY3VycmVudC5vYmpbJ18nICsgY3VycmVudC5wcm9wXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudC5mbi5jYWxsKGN1cnJlbnQub2JqLCBjdXJyZW50Lm9ialtjdXJyZW50LnByb3BdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpbml0Q29tcG9uZW50cyhDcmFmdHksIHdpbmRvdywgd2luZG93LmRvY3VtZW50KTtcblxuICAgIC8vbWFrZSBDcmFmdHkgZ2xvYmFsXG4gICAgd2luZG93LkNyYWZ0eSA9IENyYWZ0eTtcblxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlZmluZSgnY3JhZnR5JywgW10sIGZ1bmN0aW9uKCkgeyByZXR1cm4gQ3JhZnR5OyB9KTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IENyYWZ0eTtcbn0pKHdpbmRvdyxcblxuLy93cmFwIGFyb3VuZCBjb21wb25lbnRzXG5mdW5jdGlvbihDcmFmdHksIHdpbmRvdywgZG9jdW1lbnQpIHtcblxuLyoqXG4qIFNwYXRpYWwgSGFzaE1hcCBmb3IgYnJvYWQgcGhhc2UgY29sbGlzaW9uXG4qXG4qIEBhdXRob3IgTG91aXMgU3Rvd2Fzc2VyXG4qL1xuKGZ1bmN0aW9uIChwYXJlbnQpIHtcblxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lkhhc2hNYXAuY29uc3RydWN0b3Jcblx0KiBAY29tcCBDcmFmdHkuSGFzaE1hcFxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5IYXNoTWFwKFtjZWxsc2l6ZV0pXG5cdCogQHBhcmFtIGNlbGxzaXplIC0gdGhlIGNlbGwgc2l6ZS4gSWYgb21pdHRlZCwgYGNlbGxzaXplYCBpcyA2NC5cblx0KiBcbiAgICAqIFNldCBgY2VsbHNpemVgLlxuICAgICogQW5kIGNyZWF0ZSBgdGhpcy5tYXBgLlxuXHQqL1xuXHR2YXIgY2VsbHNpemUsXG5cblx0SGFzaE1hcCA9IGZ1bmN0aW9uIChjZWxsKSB7XG5cdFx0Y2VsbHNpemUgPSBjZWxsIHx8IDY0O1xuXHRcdHRoaXMubWFwID0ge307XG5cdH0sXG5cblx0U1BBQ0UgPSBcIiBcIjtcblxuXHRIYXNoTWFwLnByb3RvdHlwZSA9IHtcblx0LyoqQFxuXHQqICNDcmFmdHkubWFwLmluc2VydFxuXHQqIEBjb21wIENyYWZ0eS5tYXBcbiAgICAqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5Lm1hcC5pbnNlcnQoT2JqZWN0IG9iailcblx0KiBAcGFyYW0gb2JqIC0gQW4gZW50aXR5IHRvIGJlIGluc2VydGVkLlxuXHQqIFxuICAgICogYG9iamAgaXMgaW5zZXJ0ZWQgaW4gJy5tYXAnIG9mIHRoZSBjb3JyZXNwb25kaW5nIGJyb2FkIHBoYXNlIGNlbGxzLiBBbiBvYmplY3Qgb2YgdGhlIGZvbGxvd2luZyBmaWVsZHMgaXMgcmV0dXJuZWQuXG4gICAgKiB+fn5cbiAgICAqIC0gdGhlIG9iamVjdCB0aGF0IGtlZXAgdHJhY2sgb2YgY2VsbHMgKGtleXMpXG4gICAgKiAtIGBvYmpgXG4gICAgKiAtIHRoZSBIYXNoTWFwIG9iamVjdFxuICAgICogfn5+XG5cdCovXG5cdFx0aW5zZXJ0OiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0XHR2YXIga2V5cyA9IEhhc2hNYXAua2V5KG9iaiksXG5cdFx0XHRlbnRyeSA9IG5ldyBFbnRyeShrZXlzLCBvYmosIHRoaXMpLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRqLFxuXHRcdFx0aGFzaDtcblxuXHRcdFx0Ly9pbnNlcnQgaW50byBhbGwgeCBidWNrZXRzXG5cdFx0XHRmb3IgKGkgPSBrZXlzLngxOyBpIDw9IGtleXMueDI7IGkrKykge1xuXHRcdFx0XHQvL2luc2VydCBpbnRvIGFsbCB5IGJ1Y2tldHNcblx0XHRcdFx0Zm9yIChqID0ga2V5cy55MTsgaiA8PSBrZXlzLnkyOyBqKyspIHtcblx0XHRcdFx0XHRoYXNoID0gaSArIFNQQUNFICsgajtcblx0XHRcdFx0XHRpZiAoIXRoaXMubWFwW2hhc2hdKSB0aGlzLm1hcFtoYXNoXSA9IFtdO1xuXHRcdFx0XHRcdHRoaXMubWFwW2hhc2hdLnB1c2gob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZW50cnk7XG5cdFx0fSxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS5tYXAuc2VhcmNoXG5cdCogQGNvbXAgQ3JhZnR5Lm1hcFxuICAgICogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkubWFwLnNlYXJjaChPYmplY3QgcmVjdFssIEJvb2xlYW4gZmlsdGVyXSlcblx0KiBAcGFyYW0gcmVjdCAtIHRoZSByZWN0YW5ndWxhciByZWdpb24gdG8gc2VhcmNoIGZvciBlbnRpdGllcy5cblx0KiBAcGFyYW0gZmlsdGVyIC0gRGVmYXVsdCB2YWx1ZSBpcyB0cnVlLiBPdGhlcndpc2UsIG11c3QgYmUgZmFsc2UuXG5cdCogXG4gICAgKiAtIElmIGBmaWx0ZXJgIGlzIGBmYWxzZWAsIGp1c3Qgc2VhcmNoIGZvciBhbGwgdGhlIGVudHJpZXMgaW4gdGhlIGdpdmUgYHJlY3RgIHJlZ2lvbiBieSBicm9hZCBwaGFzZSBjb2xsaXNpb24uIEVudGl0eSBtYXkgYmUgcmV0dXJuZWQgZHVwbGljYXRlZC5cbiAgICAqIC0gSWYgYGZpbHRlcmAgaXMgYHRydWVgLCBmaWx0ZXIgdGhlIGFib3ZlIHJlc3VsdHMgYnkgY2hlY2tpbmcgdGhhdCB0aGV5IGFjdHVhbGx5IG92ZXJsYXAgYHJlY3RgLlxuICAgICogVGhlIGVhc2llciB1c2FnZSBpcyB3aXRoIGBmaWx0ZXJgPWB0cnVlYC4gRm9yIHBlcmZvcm1hbmNlIHJlYXNvbiwgeW91IG1heSB1c2UgYGZpbHRlcmA9YGZhbHNlYCwgYW5kIGZpbHRlciB0aGUgcmVzdWx0IHlvdXJzZWxmLiBTZWUgZXhhbXBsZXMgaW4gZHJhd2luZy5qcyBhbmQgY29sbGlzaW9uLmpzXG5cdCovXG5cdFx0c2VhcmNoOiBmdW5jdGlvbiAocmVjdCwgZmlsdGVyKSB7XG5cdFx0XHR2YXIga2V5cyA9IEhhc2hNYXAua2V5KHJlY3QpLFxuXHRcdFx0aSwgaixcblx0XHRcdGhhc2gsXG5cdFx0XHRyZXN1bHRzID0gW107XG5cblx0XHRcdGlmIChmaWx0ZXIgPT09IHVuZGVmaW5lZCkgZmlsdGVyID0gdHJ1ZTsgLy9kZWZhdWx0IGZpbHRlciB0byB0cnVlXG5cblx0XHRcdC8vc2VhcmNoIGluIGFsbCB4IGJ1Y2tldHNcblx0XHRcdGZvciAoaSA9IGtleXMueDE7IGkgPD0ga2V5cy54MjsgaSsrKSB7XG5cdFx0XHRcdC8vaW5zZXJ0IGludG8gYWxsIHkgYnVja2V0c1xuXHRcdFx0XHRmb3IgKGogPSBrZXlzLnkxOyBqIDw9IGtleXMueTI7IGorKykge1xuXHRcdFx0XHRcdGhhc2ggPSBpICsgU1BBQ0UgKyBqO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXMubWFwW2hhc2hdKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQodGhpcy5tYXBbaGFzaF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZmlsdGVyKSB7XG5cdFx0XHRcdHZhciBvYmosIGlkLCBmaW5hbHJlc3VsdCA9IFtdLCBmb3VuZCA9IHt9O1xuXHRcdFx0XHQvL2FkZCB1bmlxdWUgZWxlbWVudHMgdG8gbG9va3VwIHRhYmxlIHdpdGggdGhlIGVudGl0eSBJRCBhcyB1bmlxdWUga2V5XG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSByZXN1bHRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdG9iaiA9IHJlc3VsdHNbaV07XG5cdFx0XHRcdFx0aWYgKCFvYmopIGNvbnRpbnVlOyAvL3NraXAgaWYgZGVsZXRlZFxuXHRcdFx0XHRcdGlkID0gb2JqWzBdOyAvL3VuaXF1ZSBJRFxuXG5cdFx0XHRcdFx0Ly9jaGVjayBpZiBub3QgYWRkZWQgdG8gaGFzaCBhbmQgdGhhdCBhY3R1YWxseSBpbnRlcnNlY3RzXG5cdFx0XHRcdFx0aWYgKCFmb3VuZFtpZF0gJiYgb2JqLnggPCByZWN0Ll94ICsgcmVjdC5fdyAmJiBvYmouX3ggKyBvYmouX3cgPiByZWN0Ll94ICYmXG5cdFx0XHRcdFx0XHRcdFx0IG9iai55IDwgcmVjdC5feSArIHJlY3QuX2ggJiYgb2JqLl9oICsgb2JqLl95ID4gcmVjdC5feSlcblx0XHRcdFx0XHRcdGZvdW5kW2lkXSA9IHJlc3VsdHNbaV07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL2xvb3Agb3ZlciBsb29rdXAgdGFibGUgYW5kIGNvcHkgdG8gZmluYWwgYXJyYXlcblx0XHRcdFx0Zm9yIChvYmogaW4gZm91bmQpIGZpbmFscmVzdWx0LnB1c2goZm91bmRbb2JqXSk7XG5cblx0XHRcdFx0cmV0dXJuIGZpbmFscmVzdWx0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS5tYXAucmVtb3ZlXG5cdCogQGNvbXAgQ3JhZnR5Lm1hcFxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5tYXAucmVtb3ZlKFtPYmplY3Qga2V5cywgXU9iamVjdCBvYmopXG5cdCogQHBhcmFtIGtleXMgLSBrZXkgcmVnaW9uLiBJZiBvbWl0dGVkLCBpdCB3aWxsIGJlIGRlcml2ZWQgZnJvbSBvYmogYnkgYENyYWZ0eS5IYXNoTWFwLmtleWAuXG5cdCogQHBhcmFtIG9iaiAtIG5lZWQgbW9yZSBkb2N1bWVudC5cblx0KiBcblx0KiBSZW1vdmUgYW4gZW50aXR5IGluIGEgYnJvYWQgcGhhc2UgbWFwLlxuXHQqIC0gVGhlIHNlY29uZCBmb3JtIGlzIG9ubHkgdXNlZCBpbiBDcmFmdHkuSGFzaE1hcCB0byBzYXZlIHRpbWUgZm9yIGNvbXB1dGluZyBrZXlzIGFnYWluLCB3aGVyZSBrZXlzIHdlcmUgY29tcHV0ZWQgcHJldmlvdXNseSBmcm9tIG9iai4gRW5kIHVzZXJzIHNob3VsZCBub3QgY2FsbCB0aGlzIGZvcm0gZGlyZWN0bHkuXG5cdCpcblx0KiBAZXhhbXBsZSBcblx0KiB+fn5cblx0KiBDcmFmdHkubWFwLnJlbW92ZShlKTtcblx0KiB+fn5cblx0Ki9cblx0XHRyZW1vdmU6IGZ1bmN0aW9uIChrZXlzLCBvYmopIHtcblx0XHRcdHZhciBpID0gMCwgaiwgaGFzaDtcblxuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRvYmogPSBrZXlzO1xuXHRcdFx0XHRrZXlzID0gSGFzaE1hcC5rZXkob2JqKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9zZWFyY2ggaW4gYWxsIHggYnVja2V0c1xuXHRcdFx0Zm9yIChpID0ga2V5cy54MTsgaSA8PSBrZXlzLngyOyBpKyspIHtcblx0XHRcdFx0Ly9pbnNlcnQgaW50byBhbGwgeSBidWNrZXRzXG5cdFx0XHRcdGZvciAoaiA9IGtleXMueTE7IGogPD0ga2V5cy55MjsgaisrKSB7XG5cdFx0XHRcdFx0aGFzaCA9IGkgKyBTUEFDRSArIGo7XG5cblx0XHRcdFx0XHRpZiAodGhpcy5tYXBbaGFzaF0pIHtcblx0XHRcdFx0XHRcdHZhciBjZWxsID0gdGhpcy5tYXBbaGFzaF0sXG5cdFx0XHRcdFx0XHRtLFxuXHRcdFx0XHRcdFx0biA9IGNlbGwubGVuZ3RoO1xuXHRcdFx0XHRcdFx0Ly9sb29wIG92ZXIgb2JqcyBpbiBjZWxsIGFuZCBkZWxldGVcblx0XHRcdFx0XHRcdGZvciAobSA9IDA7IG0gPCBuOyBtKyspXG5cdFx0XHRcdFx0XHRcdGlmIChjZWxsW21dICYmIGNlbGxbbV1bMF0gPT09IG9ialswXSlcblx0XHRcdFx0XHRcdFx0XHRjZWxsLnNwbGljZShtLCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lm1hcC5ib3VuZGFyaWVzXG5cdCogQGNvbXAgQ3JhZnR5Lm1hcFxuXHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5Lm1hcC5ib3VuZGFyaWVzKClcblx0KiBcbiAgICAqIFRoZSByZXR1cm4gYE9iamVjdGAgaXMgb2YgdGhlIGZvbGxvd2luZyBmb3JtYXQuXG4gICAgKiB+fn5cblx0KiB7XG4gICAgKiAgIG1pbjoge1xuICAgICogICAgIHg6IHZhbF94LFxuICAgICogICAgIHk6IHZhbF95XG4gICAgKiAgIH0sXG4gICAgKiAgIG1heDoge1xuICAgICogICAgIHg6IHZhbF94LFxuICAgICogICAgIHk6IHZhbF95XG4gICAgKiAgIH1cbiAgICAqIH1cbiAgICAqIH5+flxuXHQqL1xuXHRcdGJvdW5kYXJpZXM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBrLCBlbnQsXG5cdFx0XHRoYXNoID0ge1xuXHRcdFx0XHRtYXg6IHsgeDogLUluZmluaXR5LCB5OiAtSW5maW5pdHkgfSxcblx0XHRcdFx0bWluOiB7IHg6IEluZmluaXR5LCB5OiBJbmZpbml0eSB9XG5cdFx0XHR9LFxuXHRcdFx0Y29vcmRzID0ge1xuXHRcdFx0XHRtYXg6IHsgeDogLUluZmluaXR5LCB5OiAtSW5maW5pdHkgfSxcblx0XHRcdFx0bWluOiB7IHg6IEluZmluaXR5LCB5OiBJbmZpbml0eSB9XG5cdFx0XHR9O1xuXG4gICAgICAvL1VzaW5nIGJyb2FkIHBoYXNlIGhhc2ggdG8gc3BlZWQgdXAgdGhlIGNvbXB1dGF0aW9uIG9mIGJvdW5kYXJpZXMuXG5cdFx0XHRmb3IgKHZhciBoIGluIHRoaXMubWFwKSB7XG5cdFx0XHRcdGlmICghdGhpcy5tYXBbaF0ubGVuZ3RoKSBjb250aW51ZTtcblxuICAgICAgICAvL2Jyb2FkIHBoYXNlIGNvb3JkaW5hdGVcblx0XHRcdFx0dmFyIG1hcF9jb29yZCA9IGguc3BsaXQoU1BBQ0UpLFxuXHRcdFx0XHRcdGk9bWFwX2Nvb3JkWzBdLFxuXHRcdFx0XHRcdGo9bWFwX2Nvb3JkWzBdO1xuXHRcdFx0XHRpZiAoaSA+PSBoYXNoLm1heC54KSB7XG5cdFx0XHRcdFx0aGFzaC5tYXgueCA9IGk7XG5cdFx0XHRcdFx0Zm9yIChrIGluIHRoaXMubWFwW2hdKSB7XG5cdFx0XHRcdFx0XHRlbnQgPSB0aGlzLm1hcFtoXVtrXTtcblx0XHRcdFx0XHRcdC8vbWFrZSBzdXJlIHRoYXQgdGhpcyBpcyBhIENyYWZ0eSBlbnRpdHlcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZW50ID09ICdvYmplY3QnICYmICdyZXF1aXJlcycgaW4gZW50KSB7XG5cdFx0XHRcdFx0XHRcdGNvb3Jkcy5tYXgueCA9IE1hdGgubWF4KGNvb3Jkcy5tYXgueCwgZW50LnggKyBlbnQudyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChpIDw9IGhhc2gubWluLngpIHtcblx0XHRcdFx0XHRoYXNoLm1pbi54ID0gaTtcblx0XHRcdFx0XHRmb3IgKGsgaW4gdGhpcy5tYXBbaF0pIHtcblx0XHRcdFx0XHRcdGVudCA9IHRoaXMubWFwW2hdW2tdO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlbnQgPT0gJ29iamVjdCcgJiYgJ3JlcXVpcmVzJyBpbiBlbnQpIHtcblx0XHRcdFx0XHRcdFx0Y29vcmRzLm1pbi54ID0gTWF0aC5taW4oY29vcmRzLm1pbi54LCBlbnQueCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChqID49IGhhc2gubWF4LnkpIHtcblx0XHRcdFx0XHRoYXNoLm1heC55ID0gajtcblx0XHRcdFx0XHRmb3IgKGsgaW4gdGhpcy5tYXBbaF0pIHtcblx0XHRcdFx0XHRcdGVudCA9IHRoaXMubWFwW2hdW2tdO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlbnQgPT0gJ29iamVjdCcgJiYgJ3JlcXVpcmVzJyBpbiBlbnQpIHtcblx0XHRcdFx0XHRcdFx0Y29vcmRzLm1heC55ID0gTWF0aC5tYXgoY29vcmRzLm1heC55LCBlbnQueSArIGVudC5oKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGogPD0gaGFzaC5taW4ueSkge1xuXHRcdFx0XHRcdGhhc2gubWluLnkgPSBqO1xuXHRcdFx0XHRcdGZvciAoayBpbiB0aGlzLm1hcFtoXSkge1xuXHRcdFx0XHRcdFx0ZW50ID0gdGhpcy5tYXBbaF1ba107XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGVudCA9PSAnb2JqZWN0JyAmJiAncmVxdWlyZXMnIGluIGVudCkge1xuXHRcdFx0XHRcdFx0XHRjb29yZHMubWluLnkgPSBNYXRoLm1pbihjb29yZHMubWluLnksIGVudC55KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGNvb3Jkcztcblx0XHR9XG5cdH07XG5cbi8qKkBcbiogI0NyYWZ0eS5IYXNoTWFwXG4qIEBjYXRlZ29yeSAyRFxuKiBCcm9hZC1waGFzZSBjb2xsaXNpb24gZGV0ZWN0aW9uIGVuZ2luZS4gU2VlIGJhY2tncm91bmQgaW5mb3JtYXRpb24gYXQgXG4qXG4qIH5+flxuKiAtIFtOIFR1dG9yaWFsIEIgLSBCcm9hZC1QaGFzZSBDb2xsaXNpb25dKGh0dHA6Ly93d3cubWV0YW5ldHNvZnR3YXJlLmNvbS90ZWNobmlxdWUvdHV0b3JpYWxCLmh0bWwpXG4qIC0gW0Jyb2FkLVBoYXNlIENvbGxpc2lvbiBEZXRlY3Rpb24gd2l0aCBDVURBXShodHRwLmRldmVsb3Blci5udmlkaWEuY29tL0dQVUdlbXMzL2dwdWdlbXMzX2NoMzIuaHRtbClcbiogfn5+XG4qIEBzZWUgQ3JhZnR5Lm1hcFxuKi9cblxuXHQvKipAXG5cdCogI0NyYWZ0eS5IYXNoTWFwLmtleVxuXHQqIEBjb21wIENyYWZ0eS5IYXNoTWFwXG5cdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkuSGFzaE1hcC5rZXkoT2JqZWN0IG9iailcblx0KiBAcGFyYW0gb2JqIC0gYW4gT2JqZWN0IHRoYXQgaGFzIC5tYnIoKSBvciBfeCwgX3ksIF93IGFuZCBfaC5cbiAgICAqIEdldCB0aGUgcmVjdGFuZ3VsYXIgcmVnaW9uIChpbiB0ZXJtcyBvZiB0aGUgZ3JpZCwgd2l0aCBncmlkIHNpemUgYGNlbGxzaXplYCksIHdoZXJlIHRoZSBvYmplY3QgbWF5IGZhbGwgaW4uIFRoaXMgcmVnaW9uIGlzIGRldGVybWluZWQgYnkgdGhlIG9iamVjdCdzIGJvdW5kaW5nIGJveC5cbiAgICAqIFRoZSBgY2VsbHNpemVgIGlzIDY0IGJ5IGRlZmF1bHQuXG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5Lkhhc2hNYXAuY29uc3RydWN0b3Jcblx0Ki9cblx0SGFzaE1hcC5rZXkgPSBmdW5jdGlvbiAob2JqKSB7XG5cdFx0aWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnbWJyJykpIHtcblx0XHRcdG9iaiA9IG9iai5tYnIoKTtcblx0XHR9XG5cdFx0dmFyIHgxID0gTWF0aC5mbG9vcihvYmouX3ggLyBjZWxsc2l6ZSksXG5cdFx0eTEgPSBNYXRoLmZsb29yKG9iai5feSAvIGNlbGxzaXplKSxcblx0XHR4MiA9IE1hdGguZmxvb3IoKG9iai5fdyArIG9iai5feCkgLyBjZWxsc2l6ZSksXG5cdFx0eTIgPSBNYXRoLmZsb29yKChvYmouX2ggKyBvYmouX3kpIC8gY2VsbHNpemUpO1xuXHRcdHJldHVybiB7IHgxOiB4MSwgeTE6IHkxLCB4MjogeDIsIHkyOiB5MiB9O1xuXHR9O1xuXG5cdEhhc2hNYXAuaGFzaCA9IGZ1bmN0aW9uIChrZXlzKSB7XG5cdFx0cmV0dXJuIGtleXMueDEgKyBTUEFDRSArIGtleXMueTEgKyBTUEFDRSArIGtleXMueDIgKyBTUEFDRSArIGtleXMueTI7XG5cdH07XG5cblx0ZnVuY3Rpb24gRW50cnkoa2V5cywgb2JqLCBtYXApIHtcblx0XHR0aGlzLmtleXMgPSBrZXlzO1xuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMub2JqID0gb2JqO1xuXHR9XG5cblx0RW50cnkucHJvdG90eXBlID0ge1xuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKHJlY3QpIHtcblx0XHRcdC8vY2hlY2sgaWYgYnVja2V0cyBjaGFuZ2Vcblx0XHRcdGlmIChIYXNoTWFwLmhhc2goSGFzaE1hcC5rZXkocmVjdCkpICE9IEhhc2hNYXAuaGFzaCh0aGlzLmtleXMpKSB7XG5cdFx0XHRcdHRoaXMubWFwLnJlbW92ZSh0aGlzLmtleXMsIHRoaXMub2JqKTtcblx0XHRcdFx0dmFyIGUgPSB0aGlzLm1hcC5pbnNlcnQodGhpcy5vYmopO1xuXHRcdFx0XHR0aGlzLmtleXMgPSBlLmtleXM7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHBhcmVudC5IYXNoTWFwID0gSGFzaE1hcDtcbn0pKENyYWZ0eSk7XG5cbi8qKkBcbiogI0NyYWZ0eS5tYXBcbiogQGNhdGVnb3J5IDJEXG4qIEZ1bmN0aW9ucyByZWxhdGVkIHdpdGggcXVlcnlpbmcgZW50aXRpZXMuXG4qIEBzZWUgQ3JhZnR5Lkhhc2hNYXBcbiovXG5DcmFmdHkubWFwID0gbmV3IENyYWZ0eS5IYXNoTWFwKCk7XG52YXIgTSA9IE1hdGgsXG5cdE1jID0gTS5jb3MsXG5cdE1zID0gTS5zaW4sXG5cdFBJID0gTS5QSSxcblx0REVHX1RPX1JBRCA9IFBJIC8gMTgwO1xuXG5cbi8qKkBcbiogIzJEXG4qIEBjYXRlZ29yeSAyRFxuKiBDb21wb25lbnQgZm9yIGFueSBlbnRpdHkgdGhhdCBoYXMgYSBwb3NpdGlvbiBvbiB0aGUgc3RhZ2UuXG4qIEB0cmlnZ2VyIE1vdmUgLSB3aGVuIHRoZSBlbnRpdHkgaGFzIG1vdmVkIC0geyBfeDpOdW1iZXIsIF95Ok51bWJlciwgX3c6TnVtYmVyLCBfaDpOdW1iZXIgfSAtIE9sZCBwb3NpdGlvblxuKiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBlbnRpdHkgaGFzIG1vdmVkIC0geyBfeDpOdW1iZXIsIF95Ok51bWJlciwgX3c6TnVtYmVyLCBfaDpOdW1iZXIgfSAtIE9sZCBwb3NpdGlvblxuKiBAdHJpZ2dlciBSb3RhdGUgLSB3aGVuIHRoZSBlbnRpdHkgaXMgcm90YXRlZCAtIHsgY29zOk51bWJlciwgc2luOk51bWJlciwgZGVnOk51bWJlciwgcmFkOk51bWJlciwgbzoge3g6TnVtYmVyLCB5Ok51bWJlcn0sIG1hdHJpeDoge00xMSwgTTEyLCBNMjEsIE0yMn0gfVxuKi9cbkNyYWZ0eS5jKFwiMkRcIiwge1xuLyoqQFxuXHQqICMueFxuXHQqIEBjb21wIDJEXG5cdCogVGhlIGB4YCBwb3NpdGlvbiBvbiB0aGUgc3RhZ2UuIFdoZW4gbW9kaWZpZWQsIHdpbGwgYXV0b21hdGljYWxseSBiZSByZWRyYXduLlxuXHQqIElzIGFjdHVhbGx5IGEgZ2V0dGVyL3NldHRlciBzbyB3aGVuIHVzaW5nIHRoaXMgdmFsdWUgZm9yIGNhbGN1bGF0aW9ucyBhbmQgbm90IG1vZGlmeWluZyBpdCxcblx0KiB1c2UgdGhlIGAuX3hgIHByb3BlcnR5LlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF94OiAwLFxuXHQvKipAXG5cdCogIy55XG5cdCogQGNvbXAgMkRcblx0KiBUaGUgYHlgIHBvc2l0aW9uIG9uIHRoZSBzdGFnZS4gV2hlbiBtb2RpZmllZCwgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHJlZHJhd24uXG5cdCogSXMgYWN0dWFsbHkgYSBnZXR0ZXIvc2V0dGVyIHNvIHdoZW4gdXNpbmcgdGhpcyB2YWx1ZSBmb3IgY2FsY3VsYXRpb25zIGFuZCBub3QgbW9kaWZ5aW5nIGl0LFxuXHQqIHVzZSB0aGUgYC5feWAgcHJvcGVydHkuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X3k6IDAsXG5cdC8qKkBcblx0KiAjLndcblx0KiBAY29tcCAyRFxuXHQqIFRoZSB3aWR0aCBvZiB0aGUgZW50aXR5LiBXaGVuIG1vZGlmaWVkLCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcmVkcmF3bi5cblx0KiBJcyBhY3R1YWxseSBhIGdldHRlci9zZXR0ZXIgc28gd2hlbiB1c2luZyB0aGlzIHZhbHVlIGZvciBjYWxjdWxhdGlvbnMgYW5kIG5vdCBtb2RpZnlpbmcgaXQsXG5cdCogdXNlIHRoZSBgLl93YCBwcm9wZXJ0eS5cblx0KlxuXHQqIENoYW5naW5nIHRoaXMgdmFsdWUgaXMgbm90IHJlY29tbWVuZGVkIGFzIGNhbnZhcyBoYXMgdGVycmlibGUgcmVzaXplIHF1YWxpdHkgYW5kIERPTSB3aWxsIGp1c3QgY2xpcCB0aGUgaW1hZ2UuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X3c6IDAsXG5cdC8qKkBcblx0KiAjLmhcblx0KiBAY29tcCAyRFxuXHQqIFRoZSBoZWlnaHQgb2YgdGhlIGVudGl0eS4gV2hlbiBtb2RpZmllZCwgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHJlZHJhd24uXG5cdCogSXMgYWN0dWFsbHkgYSBnZXR0ZXIvc2V0dGVyIHNvIHdoZW4gdXNpbmcgdGhpcyB2YWx1ZSBmb3IgY2FsY3VsYXRpb25zIGFuZCBub3QgbW9kaWZ5aW5nIGl0LFxuXHQqIHVzZSB0aGUgYC5faGAgcHJvcGVydHkuXG5cdCpcblx0KiBDaGFuZ2luZyB0aGlzIHZhbHVlIGlzIG5vdCByZWNvbW1lbmRlZCBhcyBjYW52YXMgaGFzIHRlcnJpYmxlIHJlc2l6ZSBxdWFsaXR5IGFuZCBET00gd2lsbCBqdXN0IGNsaXAgdGhlIGltYWdlLlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF9oOiAwLFxuXHQvKipAXG5cdCogIy56XG5cdCogQGNvbXAgMkRcblx0KiBUaGUgYHpgIGluZGV4IG9uIHRoZSBzdGFnZS4gV2hlbiBtb2RpZmllZCwgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHJlZHJhd24uXG5cdCogSXMgYWN0dWFsbHkgYSBnZXR0ZXIvc2V0dGVyIHNvIHdoZW4gdXNpbmcgdGhpcyB2YWx1ZSBmb3IgY2FsY3VsYXRpb25zIGFuZCBub3QgbW9kaWZ5aW5nIGl0LFxuXHQqIHVzZSB0aGUgYC5femAgcHJvcGVydHkuXG5cdCpcblx0KiBBIGhpZ2hlciBgemAgdmFsdWUgd2lsbCBiZSBjbG9zZXIgdG8gdGhlIGZyb250IG9mIHRoZSBzdGFnZS4gQSBzbWFsbGVyIGB6YCB2YWx1ZSB3aWxsIGJlIGNsb3NlciB0byB0aGUgYmFjay5cblx0KiBBIGdsb2JhbCBaIGluZGV4IGlzIHByb2R1Y2VkIGJhc2VkIG9uIGl0cyBgemAgdmFsdWUgYXMgd2VsbCBhcyB0aGUgR0lEICh3aGljaCBlbnRpdHkgd2FzIGNyZWF0ZWQgZmlyc3QpLlxuXHQqIFRoZXJlZm9yZSBlbnRpdGllcyB3aWxsIG5hdHVyYWxseSBtYWludGFpbiBvcmRlciBkZXBlbmRpbmcgb24gd2hlbiBpdCB3YXMgY3JlYXRlZCBpZiBzYW1lIHogdmFsdWUuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X3o6IDAsXG5cdC8qKkBcblx0KiAjLnJvdGF0aW9uXG5cdCogQGNvbXAgMkRcblx0KiBTZXQgdGhlIHJvdGF0aW9uIG9mIHlvdXIgZW50aXR5LiBSb3RhdGlvbiB0YWtlcyBkZWdyZWVzIGluIGEgY2xvY2t3aXNlIGRpcmVjdGlvbi5cblx0KiBJdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGVyZSBpcyBubyBsaW1pdCBvbiB0aGUgcm90YXRpb24gdmFsdWUuIFNldHRpbmcgYSByb3RhdGlvblxuXHQqIG1vZCAzNjAgd2lsbCBnaXZlIHRoZSBzYW1lIHJvdGF0aW9uIHdpdGhvdXQgcmVhY2hpbmcgaHVnZSBudW1iZXJzLlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF9yb3RhdGlvbjogMCxcblx0LyoqQFxuXHQqICMuYWxwaGFcblx0KiBAY29tcCAyRFxuXHQqIFRyYW5zcGFyZW5jeSBvZiBhbiBlbnRpdHkuIE11c3QgYmUgYSBkZWNpbWFsIHZhbHVlIGJldHdlZW4gMC4wIGJlaW5nIGZ1bGx5IHRyYW5zcGFyZW50IHRvIDEuMCBiZWluZyBmdWxseSBvcGFxdWUuXG5cdCovXG5cdF9hbHBoYTogMS4wLFxuXHQvKipAXG5cdCogIy52aXNpYmxlXG5cdCogQGNvbXAgMkRcblx0KiBJZiB0aGUgZW50aXR5IGlzIHZpc2libGUgb3Igbm90LiBBY2NlcHRzIGEgdHJ1ZSBvciBmYWxzZSB2YWx1ZS5cblx0KiBDYW4gYmUgdXNlZCBmb3Igb3B0aW1pemF0aW9uIGJ5IHNldHRpbmcgYW4gZW50aXRpZXMgdmlzaWJpbGl0eSB0byBmYWxzZSB3aGVuIG5vdCBuZWVkZWQgdG8gYmUgZHJhd24uXG5cdCpcblx0KiBUaGUgZW50aXR5IHdpbGwgc3RpbGwgZXhpc3QgYW5kIGNhbiBiZSBjb2xsaWRlZCB3aXRoIGJ1dCBqdXN0IHdvbid0IGJlIGRyYXduLlxuICAqIEBzZWUgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcsIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsXG5cdCovXG5cdF92aXNpYmxlOiB0cnVlLFxuXG5cdC8qKkBcblx0KiAjLl9nbG9iYWxaXG5cdCogQGNvbXAgMkRcblx0KiBXaGVuIHR3byBlbnRpdGllcyBvdmVybGFwLCB0aGUgb25lIHdpdGggdGhlIGxhcmdlciBgX2dsb2JhbFpgIHdpbGwgYmUgb24gdG9wIG9mIHRoZSBvdGhlci5cblx0KiBAc2VlIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3LCBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbFxuXHQqL1xuXHRfZ2xvYmFsWjogbnVsbCxcblxuXHRfb3JpZ2luOiBudWxsLFxuXHRfbWJyOiBudWxsLFxuXHRfZW50cnk6IG51bGwsXG5cdF9jaGlsZHJlbjogbnVsbCxcblx0X3BhcmVudDogbnVsbCxcblx0X2NoYW5nZWQ6IGZhbHNlLFxuXG5cdF9kZWZpbmVHZXR0ZXJTZXR0ZXJfc2V0dGVyOiBmdW5jdGlvbigpIHtcblx0XHQvL2NyZWF0ZSBnZXR0ZXJzIGFuZCBzZXR0ZXJzIHVzaW5nIF9fZGVmaW5lU2V0dGVyX18gYW5kIF9fZGVmaW5lR2V0dGVyX19cblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3gnLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeCcsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3knLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeScsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3cnLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfdycsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ2gnLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfaCcsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3onLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeicsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3JvdGF0aW9uJywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3JvdGF0aW9uJywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygnYWxwaGEnLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfYWxwaGEnLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCd2aXNpYmxlJywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3Zpc2libGUnLCB2KTsgfSk7XG5cblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3gnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94OyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3knLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95OyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3cnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl93OyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ2gnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9oOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3onLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl96OyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3JvdGF0aW9uJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fcm90YXRpb247IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygnYWxwaGEnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9hbHBoYTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCd2aXNpYmxlJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fdmlzaWJsZTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCdwYXJlbnQnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9wYXJlbnQ7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygnbnVtQ2hpbGRyZW4nLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7IH0pO1xuXHR9LFxuXG5cdF9kZWZpbmVHZXR0ZXJTZXR0ZXJfZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uKCkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAneCcsIHtcblx0XHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeCcsIHYpOyB9XG5cdFx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94OyB9XG5cdFx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAneScsIHtcblx0XHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeScsIHYpOyB9XG5cdFx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95OyB9XG5cdFx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndycsIHtcblx0XHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfdycsIHYpOyB9XG5cdFx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl93OyB9XG5cdFx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaCcsIHtcblx0XHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfaCcsIHYpOyB9XG5cdFx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9oOyB9XG5cdFx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAneicsIHtcblx0XHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfeicsIHYpOyB9XG5cdFx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl96OyB9XG5cdFx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncm90YXRpb24nLCB7XG5cdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19yb3RhdGlvbicsIHYpOyB9XG5cdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fcm90YXRpb247IH1cblx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2FscGhhJywge1xuXHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfYWxwaGEnLCB2KTsgfVxuXHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2FscGhhOyB9XG5cdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aXNpYmxlJywge1xuXHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfdmlzaWJsZScsIHYpOyB9XG5cdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fdmlzaWJsZTsgfVxuXHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHR9KTtcblx0fSxcblxuXHRfZGVmaW5lR2V0dGVyU2V0dGVyX2ZhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHQvL3NldCB0aGUgcHVibGljIHByb3BlcnRpZXMgdG8gdGhlIGN1cnJlbnQgcHJpdmF0ZSBwcm9wZXJ0aWVzXG5cdFx0dGhpcy54ID0gdGhpcy5feDtcblx0XHR0aGlzLnkgPSB0aGlzLl95O1xuXHRcdHRoaXMudyA9IHRoaXMuX3c7XG5cdFx0dGhpcy5oID0gdGhpcy5faDtcblx0XHR0aGlzLnogPSB0aGlzLl96O1xuXHRcdHRoaXMucm90YXRpb24gPSB0aGlzLl9yb3RhdGlvbjtcblx0XHR0aGlzLmFscGhhID0gdGhpcy5fYWxwaGE7XG5cdFx0dGhpcy52aXNpYmxlID0gdGhpcy5fdmlzaWJsZTtcblxuXHRcdC8vb24gZXZlcnkgZnJhbWUgY2hlY2sgZm9yIGEgZGlmZmVyZW5jZSBpbiBhbnkgcHJvcGVydHlcblx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vaWYgdGhlcmUgYXJlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIHB1YmxpYyBhbmQgcHJpdmF0ZSBwcm9wZXJ0aWVzXG5cdFx0XHRpZiAodGhpcy54ICE9PSB0aGlzLl94IHx8IHRoaXMueSAhPT0gdGhpcy5feSB8fFxuXHRcdFx0XHR0aGlzLncgIT09IHRoaXMuX3cgfHwgdGhpcy5oICE9PSB0aGlzLl9oIHx8XG5cdFx0XHRcdHRoaXMueiAhPT0gdGhpcy5feiB8fCB0aGlzLnJvdGF0aW9uICE9PSB0aGlzLl9yb3RhdGlvbiB8fFxuXHRcdFx0XHR0aGlzLmFscGhhICE9PSB0aGlzLl9hbHBoYSB8fCB0aGlzLnZpc2libGUgIT09IHRoaXMuX3Zpc2libGUpIHtcblxuXHRcdFx0XHQvL3NhdmUgdGhlIG9sZCBwb3NpdGlvbnNcblx0XHRcdFx0dmFyIG9sZCA9IHRoaXMubWJyKCkgfHwgdGhpcy5wb3MoKTtcblxuXHRcdFx0XHQvL2lmIHJvdGF0aW9uIGhhcyBjaGFuZ2VkLCB1c2UgdGhlIHByaXZhdGUgcm90YXRlIG1ldGhvZFxuXHRcdFx0XHRpZiAodGhpcy5yb3RhdGlvbiAhPT0gdGhpcy5fcm90YXRpb24pIHtcblx0XHRcdFx0XHR0aGlzLl9yb3RhdGUodGhpcy5yb3RhdGlvbik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly91cGRhdGUgdGhlIE1CUlxuXHRcdFx0XHRcdHZhciBtYnIgPSB0aGlzLl9tYnIsIG1vdmVkID0gZmFsc2U7XG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBoYXZlIGdldHRlcnMgb3Igc2V0dGVycyxcblx0XHRcdFx0XHQvLyB7eCwgeSwgdywgaCwgen0gYW5kIHtfeCwgX3ksIF93LCBfaCwgX3p9IG1heSBiZSBvdXQgb2Ygc3luYyxcblx0XHRcdFx0XHQvLyBpbiB3aGljaCBjYXNlIHQgY2hlY2tzIGlmIHRoZXkgYXJlIGRpZmZlcmVudCBvbiB0aWNrIGFuZCBleGVjdXRlcyB0aGUgQ2hhbmdlIGV2ZW50LlxuXHRcdFx0XHRcdGlmIChtYnIpIHsgLy9jaGVjayBlYWNoIHZhbHVlIHRvIHNlZSB3aGljaCBoYXMgY2hhbmdlZFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMueCAhPT0gdGhpcy5feCkgeyBtYnIuX3ggLT0gdGhpcy54IC0gdGhpcy5feDsgbW92ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLnkgIT09IHRoaXMuX3kpIHsgbWJyLl95IC09IHRoaXMueSAtIHRoaXMuX3k7IG1vdmVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy53ICE9PSB0aGlzLl93KSB7IG1ici5fdyAtPSB0aGlzLncgLSB0aGlzLl93OyBtb3ZlZCA9IHRydWU7IH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHRoaXMuaCAhPT0gdGhpcy5faCkgeyBtYnIuX2ggLT0gdGhpcy5oIC0gdGhpcy5faDsgbW92ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLnogIT09IHRoaXMuX3opIHsgbWJyLl96IC09IHRoaXMueiAtIHRoaXMuX3o7IG1vdmVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vaWYgdGhlIG1vdmVkIGZsYWcgaXMgdHJ1ZSwgdHJpZ2dlciBhIG1vdmVcblx0XHRcdFx0XHRpZiAobW92ZWQpIHRoaXMudHJpZ2dlcihcIk1vdmVcIiwgb2xkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vc2V0IHRoZSBwdWJsaWMgcHJvcGVydGllcyB0byB0aGUgcHJpdmF0ZSBwcm9wZXJ0aWVzXG5cdFx0XHRcdHRoaXMuX3ggPSB0aGlzLng7XG5cdFx0XHRcdHRoaXMuX3kgPSB0aGlzLnk7XG5cdFx0XHRcdHRoaXMuX3cgPSB0aGlzLnc7XG5cdFx0XHRcdHRoaXMuX2ggPSB0aGlzLmg7XG5cdFx0XHRcdHRoaXMuX3ogPSB0aGlzLno7XG5cdFx0XHRcdHRoaXMuX3JvdGF0aW9uID0gdGhpcy5yb3RhdGlvbjtcblx0XHRcdFx0dGhpcy5fYWxwaGEgPSB0aGlzLmFscGhhO1xuXHRcdFx0XHR0aGlzLl92aXNpYmxlID0gdGhpcy52aXNpYmxlO1xuXG5cdFx0XHRcdC8vdHJpZ2dlciB0aGUgY2hhbmdlc1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIiwgb2xkKTtcblx0XHRcdFx0Ly93aXRob3V0IHRoaXMgZW50aXRpZXMgd2VyZW4ndCBhZGRlZCBjb3JyZWN0bHkgdG8gQ3JhZnR5Lm1hcC5tYXAgaW4gSUU4LlxuXHRcdFx0XHQvL25vdCBlbnRpcmVseSBzdXJlIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IHRvIGZpeCBpdCB0aG91Z2hcblx0XHRcdFx0dGhpcy50cmlnZ2VyKFwiTW92ZVwiLCBvbGQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuICB9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2dsb2JhbFogPSB0aGlzWzBdO1xuXHRcdHRoaXMuX29yaWdpbiA9IHsgeDogMCwgeTogMCB9O1xuXHRcdHRoaXMuX2NoaWxkcmVuID0gW107XG5cblx0XHRpZihDcmFmdHkuc3VwcG9ydC5zZXR0ZXIpIHtcbiAgICAgIHRoaXMuX2RlZmluZUdldHRlclNldHRlcl9zZXR0ZXIoKTtcblx0XHR9IGVsc2UgaWYgKENyYWZ0eS5zdXBwb3J0LmRlZmluZVByb3BlcnR5KSB7XG5cdFx0XHQvL0lFOSBzdXBwb3J0cyBPYmplY3QuZGVmaW5lUHJvcGVydHlcbiAgICAgIHRoaXMuX2RlZmluZUdldHRlclNldHRlcl9kZWZpbmVQcm9wZXJ0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvKlxuXHRcdFx0SWYgbm8gc2V0dGVycyBhbmQgZ2V0dGVycyBhcmUgc3VwcG9ydGVkIChlLmcuIElFOCkgc3VwcG9ydHMsXG5cdFx0XHRjaGVjayBvbiBldmVyeSBmcmFtZSBmb3IgYSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcy5fKHh8eXx3fGh8ei4uLilcblx0XHRcdGFuZCB0aGlzLih4fHl8d3xofHopIGFuZCB1cGRhdGUgYWNjb3JkaW5nbHkuXG5cdFx0XHQqL1xuICAgICAgdGhpcy5fZGVmaW5lR2V0dGVyU2V0dGVyX2ZhbGxiYWNrKCk7XG5cdFx0fVxuXG5cdFx0Ly9pbnNlcnQgc2VsZiBpbnRvIHRoZSBIYXNoTWFwXG5cdFx0dGhpcy5fZW50cnkgPSBDcmFmdHkubWFwLmluc2VydCh0aGlzKTtcblxuXHRcdC8vd2hlbiBvYmplY3QgY2hhbmdlcywgdXBkYXRlIEhhc2hNYXBcblx0XHR0aGlzLmJpbmQoXCJNb3ZlXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgYXJlYSA9IHRoaXMuX21iciB8fCB0aGlzO1xuXHRcdFx0dGhpcy5fZW50cnkudXBkYXRlKGFyZWEpO1xuXHRcdFx0dGhpcy5fY2FzY2FkZShlKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYmluZChcIlJvdGF0ZVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIG9sZCA9IHRoaXMuX21iciB8fCB0aGlzO1xuXHRcdFx0dGhpcy5fZW50cnkudXBkYXRlKG9sZCk7XG5cdFx0XHR0aGlzLl9jYXNjYWRlKGUpO1xuXHRcdH0pO1xuXG5cdFx0Ly93aGVuIG9iamVjdCBpcyByZW1vdmVkLCByZW1vdmUgZnJvbSBIYXNoTWFwIGFuZCBkZXN0cm95IGF0dGFjaGVkIGNoaWxkcmVuXG5cdFx0dGhpcy5iaW5kKFwiUmVtb3ZlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLl9jaGlsZHJlbikge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX2NoaWxkcmVuW2ldLmRlc3Ryb3kpIHtcblx0XHRcdFx0XHRcdHRoaXMuX2NoaWxkcmVuW2ldLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fY2hpbGRyZW4gPSBbXTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuX3BhcmVudCkge1xuXHRcdFx0XHR0aGlzLl9wYXJlbnQuZGV0YWNoKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRDcmFmdHkubWFwLnJlbW92ZSh0aGlzKTtcblxuXHRcdFx0dGhpcy5kZXRhY2goKTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0KiBDYWxjdWxhdGVzIHRoZSBNQlIgd2hlbiByb3RhdGVkIHdpdGggYW4gb3JpZ2luIHBvaW50XG5cdCovXG5cdF9yb3RhdGU6IGZ1bmN0aW9uICh2KSB7XG5cdFx0dmFyIHRoZXRhID0gLTEgKiAodiAlIDM2MCksIC8vYW5nbGUgYWx3YXlzIGJldHdlZW4gMCBhbmQgMzU5XG5cdFx0XHRyYWQgPSB0aGV0YSAqIERFR19UT19SQUQsXG5cdFx0XHRjdCA9IE1hdGguY29zKHJhZCksIC8vY2FjaGUgdGhlIHNpbiBhbmQgY29zaW5lIG9mIHRoZXRhXG5cdFx0XHRzdCA9IE1hdGguc2luKHJhZCksXG5cdFx0XHRvID0ge1xuXHRcdFx0eDogdGhpcy5fb3JpZ2luLnggKyB0aGlzLl94LFxuXHRcdFx0eTogdGhpcy5fb3JpZ2luLnkgKyB0aGlzLl95XG5cdFx0fTtcblxuXHRcdC8vaWYgdGhlIGFuZ2xlIGlzIDAgYW5kIGlzIGN1cnJlbnRseSAwLCBza2lwXG5cdFx0aWYgKCF0aGV0YSkge1xuXHRcdFx0dGhpcy5fbWJyID0gbnVsbDtcblx0XHRcdGlmICghdGhpcy5fcm90YXRpb24gJSAzNjApIHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgeDAgPSBvLnggKyAodGhpcy5feCAtIG8ueCkgKiBjdCArICh0aGlzLl95IC0gby55KSAqIHN0LFxuXHRcdFx0eTAgPSBvLnkgLSAodGhpcy5feCAtIG8ueCkgKiBzdCArICh0aGlzLl95IC0gby55KSAqIGN0LFxuXHRcdFx0eDEgPSBvLnggKyAodGhpcy5feCArIHRoaXMuX3cgLSBvLngpICogY3QgKyAodGhpcy5feSAtIG8ueSkgKiBzdCxcblx0XHRcdHkxID0gby55IC0gKHRoaXMuX3ggKyB0aGlzLl93IC0gby54KSAqIHN0ICsgKHRoaXMuX3kgLSBvLnkpICogY3QsXG5cdFx0XHR4MiA9IG8ueCArICh0aGlzLl94ICsgdGhpcy5fdyAtIG8ueCkgKiBjdCArICh0aGlzLl95ICsgdGhpcy5faCAtIG8ueSkgKiBzdCxcblx0XHRcdHkyID0gby55IC0gKHRoaXMuX3ggKyB0aGlzLl93IC0gby54KSAqIHN0ICsgKHRoaXMuX3kgKyB0aGlzLl9oIC0gby55KSAqIGN0LFxuXHRcdFx0eDMgPSBvLnggKyAodGhpcy5feCAtIG8ueCkgKiBjdCArICh0aGlzLl95ICsgdGhpcy5faCAtIG8ueSkgKiBzdCxcblx0XHRcdHkzID0gby55IC0gKHRoaXMuX3ggLSBvLngpICogc3QgKyAodGhpcy5feSArIHRoaXMuX2ggLSBvLnkpICogY3QsXG5cdFx0XHRtaW54ID0gTWF0aC5yb3VuZChNYXRoLm1pbih4MCwgeDEsIHgyLCB4MykpLFxuXHRcdFx0bWlueSA9IE1hdGgucm91bmQoTWF0aC5taW4oeTAsIHkxLCB5MiwgeTMpKSxcblx0XHRcdG1heHggPSBNYXRoLnJvdW5kKE1hdGgubWF4KHgwLCB4MSwgeDIsIHgzKSksXG5cdFx0XHRtYXh5ID0gTWF0aC5yb3VuZChNYXRoLm1heCh5MCwgeTEsIHkyLCB5MykpO1xuXG5cdFx0dGhpcy5fbWJyID0geyBfeDogbWlueCwgX3k6IG1pbnksIF93OiBtYXh4IC0gbWlueCwgX2g6IG1heHkgLSBtaW55IH07XG5cblx0XHQvL3RyaWdnZXIgcm90YXRpb24gZXZlbnRcblx0XHR2YXIgZGlmZmVyZW5jZSA9IHRoaXMuX3JvdGF0aW9uIC0gdixcblx0XHRcdGRyYWQgPSBkaWZmZXJlbmNlICogREVHX1RPX1JBRDtcblxuXHRcdHRoaXMudHJpZ2dlcihcIlJvdGF0ZVwiLCB7XG5cdFx0XHRjb3M6IE1hdGguY29zKGRyYWQpLFxuXHRcdFx0c2luOiBNYXRoLnNpbihkcmFkKSxcblx0XHRcdGRlZzogZGlmZmVyZW5jZSxcblx0XHRcdHJhZDogZHJhZCxcblx0XHRcdG86IHsgeDogby54LCB5OiBvLnkgfSxcblx0XHRcdG1hdHJpeDogeyBNMTE6IGN0LCBNMTI6IHN0LCBNMjE6IC1zdCwgTTIyOiBjdCB9XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYXJlYVxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIE51bWJlciAuYXJlYSh2b2lkKVxuXHQqIENhbGN1bGF0ZXMgdGhlIGFyZWEgb2YgdGhlIGVudGl0eVxuXHQqL1xuXHRhcmVhOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3cgKiB0aGlzLl9oO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmludGVyc2VjdFxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmludGVyc2VjdChOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gdyAtIFdpZHRoIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIGggLSBIZWlnaHQgb2YgdGhlIHJlY3Rcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuaW50ZXJzZWN0KE9iamVjdCByZWN0KVxuXHQqIEBwYXJhbSByZWN0IC0gQW4gb2JqZWN0IHRoYXQgbXVzdCBoYXZlIHRoZSBgeCwgeSwgdywgaGAgdmFsdWVzIGFzIHByb3BlcnRpZXNcblx0KiBEZXRlcm1pbmVzIGlmIHRoaXMgZW50aXR5IGludGVyc2VjdHMgYSByZWN0YW5nbGUuXG5cdCovXG5cdGludGVyc2VjdDogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHR2YXIgcmVjdCwgb2JqID0gdGhpcy5fbWJyIHx8IHRoaXM7XG5cdFx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRyZWN0ID0geDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVjdCA9IHsgeDogeCwgeTogeSwgdzogdywgaDogaCB9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvYmouX3ggPCByZWN0LnggKyByZWN0LncgJiYgb2JqLl94ICsgb2JqLl93ID4gcmVjdC54ICYmXG5cdFx0XHQgICBvYmouX3kgPCByZWN0LnkgKyByZWN0LmggJiYgb2JqLl9oICsgb2JqLl95ID4gcmVjdC55O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLndpdGhpblxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLndpdGhpbihOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gdyAtIFdpZHRoIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIGggLSBIZWlnaHQgb2YgdGhlIHJlY3Rcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAud2l0aGluKE9iamVjdCByZWN0KVxuXHQqIEBwYXJhbSByZWN0IC0gQW4gb2JqZWN0IHRoYXQgbXVzdCBoYXZlIHRoZSBgeCwgeSwgdywgaGAgdmFsdWVzIGFzIHByb3BlcnRpZXNcblx0KiBEZXRlcm1pbmVzIGlmIHRoaXMgY3VycmVudCBlbnRpdHkgaXMgd2l0aGluIGFub3RoZXIgcmVjdGFuZ2xlLlxuXHQqL1xuXHR3aXRoaW46IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0dmFyIHJlY3Q7XG5cdFx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRyZWN0ID0geDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVjdCA9IHsgeDogeCwgeTogeSwgdzogdywgaDogaCB9O1xuXHRcdH1cblxuXHRcdHJldHVybiByZWN0LnggPD0gdGhpcy54ICYmIHJlY3QueCArIHJlY3QudyA+PSB0aGlzLnggKyB0aGlzLncgJiZcblx0XHRcdFx0cmVjdC55IDw9IHRoaXMueSAmJiByZWN0LnkgKyByZWN0LmggPj0gdGhpcy55ICsgdGhpcy5oO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmNvbnRhaW5zXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuY29udGFpbnMoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHcgLSBXaWR0aCBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSBoIC0gSGVpZ2h0IG9mIHRoZSByZWN0XG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmNvbnRhaW5zKE9iamVjdCByZWN0KVxuXHQqIEBwYXJhbSByZWN0IC0gQW4gb2JqZWN0IHRoYXQgbXVzdCBoYXZlIHRoZSBgeCwgeSwgdywgaGAgdmFsdWVzIGFzIHByb3BlcnRpZXNcblx0KiBEZXRlcm1pbmVzIGlmIHRoZSByZWN0YW5nbGUgaXMgd2l0aGluIHRoZSBjdXJyZW50IGVudGl0eS5cblx0Ki9cblx0Y29udGFpbnM6IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0dmFyIHJlY3Q7XG5cdFx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRyZWN0ID0geDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVjdCA9IHsgeDogeCwgeTogeSwgdzogdywgaDogaCB9O1xuXHRcdH1cblxuXHRcdHJldHVybiByZWN0LnggPj0gdGhpcy54ICYmIHJlY3QueCArIHJlY3QudyA8PSB0aGlzLnggKyB0aGlzLncgJiZcblx0XHRcdFx0cmVjdC55ID49IHRoaXMueSAmJiByZWN0LnkgKyByZWN0LmggPD0gdGhpcy55ICsgdGhpcy5oO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnBvc1xuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIE9iamVjdCAucG9zKHZvaWQpXG5cdCogUmV0dXJucyB0aGUgeCwgeSwgdywgaCBwcm9wZXJ0aWVzIGFzIGEgcmVjdCBvYmplY3Rcblx0KiAoYSByZWN0IG9iamVjdCBpcyBqdXN0IGFuIG9iamVjdCB3aXRoIHRoZSBrZXlzIF94LCBfeSwgX3csIF9oKS5cblx0KlxuXHQqIFRoZSBrZXlzIGhhdmUgYW4gdW5kZXJzY29yZSBwcmVmaXguIFRoaXMgaXMgZHVlIHRvIHRoZSB4LCB5LCB3LCBoXG5cdCogcHJvcGVydGllcyBiZWluZyBtZXJlbHkgc2V0dGVycyBhbmQgZ2V0dGVycyB0aGF0IHdyYXAgdGhlIHByb3BlcnRpZXMgd2l0aCBhbiB1bmRlcnNjb3JlIChfeCwgX3ksIF93LCBfaCkuXG5cdCovXG5cdHBvczogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRfeDogKHRoaXMuX3gpLFxuXHRcdFx0X3k6ICh0aGlzLl95KSxcblx0XHRcdF93OiAodGhpcy5fdyksXG5cdFx0XHRfaDogKHRoaXMuX2gpXG5cdFx0fTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5tYnJcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBPYmplY3QgLm1icigpXG5cdCogUmV0dXJucyB0aGUgbWluaW11bSBib3VuZGluZyByZWN0YW5nbGUuIElmIHRoZXJlIGlzIG5vIHJvdGF0aW9uXG5cdCogb24gdGhlIGVudGl0eSBpdCB3aWxsIHJldHVybiB0aGUgcmVjdC5cblx0Ki9cblx0bWJyOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9tYnIpIHJldHVybiB0aGlzLnBvcygpO1xuXHRcdHJldHVybiB7XG5cdFx0XHRfeDogKHRoaXMuX21ici5feCksXG5cdFx0XHRfeTogKHRoaXMuX21ici5feSksXG5cdFx0XHRfdzogKHRoaXMuX21ici5fdyksXG5cdFx0XHRfaDogKHRoaXMuX21ici5faClcblx0XHR9O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmlzQXRcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5pc0F0KE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqIERldGVybWluZXMgd2hldGhlciBhIHBvaW50IGlzIGNvbnRhaW5lZCBieSB0aGUgZW50aXR5LiBVbmxpa2Ugb3RoZXIgbWV0aG9kcyxcblx0KiBhbiBvYmplY3QgY2FuJ3QgYmUgcGFzc2VkLiBUaGUgYXJndW1lbnRzIHJlcXVpcmUgdGhlIHggYW5kIHkgdmFsdWVcblx0Ki9cblx0aXNBdDogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHRpZiAodGhpcy5tYXBBcmVhKSB7XG4gICAgICBcdFx0cmV0dXJuIHRoaXMubWFwQXJlYS5jb250YWluc1BvaW50KHgsIHkpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5tYXApIHtcblx0XHRcdHJldHVybiB0aGlzLm1hcC5jb250YWluc1BvaW50KHgsIHkpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy54IDw9IHggJiYgdGhpcy54ICsgdGhpcy53ID49IHggJiZcblx0XHRcdCAgIHRoaXMueSA8PSB5ICYmIHRoaXMueSArIHRoaXMuaCA+PSB5O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLm1vdmVcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5tb3ZlKFN0cmluZyBkaXIsIE51bWJlciBieSlcblx0KiBAcGFyYW0gZGlyIC0gRGlyZWN0aW9uIHRvIG1vdmUgKG4scyxlLHcsbmUsbncsc2Usc3cpXG5cdCogQHBhcmFtIGJ5IC0gQW1vdW50IHRvIG1vdmUgaW4gdGhlIHNwZWNpZmllZCBkaXJlY3Rpb25cblx0KiBRdWljayBtZXRob2QgdG8gbW92ZSB0aGUgZW50aXR5IGluIGEgZGlyZWN0aW9uIChuLCBzLCBlLCB3LCBuZSwgbncsIHNlLCBzdykgYnkgYW4gYW1vdW50IG9mIHBpeGVscy5cblx0Ki9cblx0bW92ZTogZnVuY3Rpb24gKGRpciwgYnkpIHtcblx0XHRpZiAoZGlyLmNoYXJBdCgwKSA9PT0gJ24nKSB0aGlzLnkgLT0gYnk7XG5cdFx0aWYgKGRpci5jaGFyQXQoMCkgPT09ICdzJykgdGhpcy55ICs9IGJ5O1xuXHRcdGlmIChkaXIgPT09ICdlJyB8fCBkaXIuY2hhckF0KDEpID09PSAnZScpIHRoaXMueCArPSBieTtcblx0XHRpZiAoZGlyID09PSAndycgfHwgZGlyLmNoYXJBdCgxKSA9PT0gJ3cnKSB0aGlzLnggLT0gYnk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5zaGlmdFxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnNoaWZ0KE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gQW1vdW50IHRvIG1vdmUgWFxuXHQqIEBwYXJhbSB5IC0gQW1vdW50IHRvIG1vdmUgWVxuXHQqIEBwYXJhbSB3IC0gQW1vdW50IHRvIHdpZGVuXG5cdCogQHBhcmFtIGggLSBBbW91bnQgdG8gaW5jcmVhc2UgaGVpZ2h0XG5cdCogU2hpZnQgb3IgbW92ZSB0aGUgZW50aXR5IGJ5IGFuIGFtb3VudC4gVXNlIG5lZ2F0aXZlIHZhbHVlc1xuXHQqIGZvciBhbiBvcHBvc2l0ZSBkaXJlY3Rpb24uXG5cdCovXG5cdHNoaWZ0OiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdGlmICh4KSB0aGlzLnggKz0geDtcblx0XHRpZiAoeSkgdGhpcy55ICs9IHk7XG5cdFx0aWYgKHcpIHRoaXMudyArPSB3O1xuXHRcdGlmIChoKSB0aGlzLmggKz0gaDtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLl9jYXNjYWRlXG5cdCogQGNvbXAgMkRcbiAgICAqIEBzaWduIHB1YmxpYyB2b2lkIC5fY2FzY2FkZShlKVxuXHQqIEBwYXJhbSBlIC0gQW1vdW50IHRvIG1vdmUgWFxuXHQqIFNoaWZ0IG1vdmUgb3Igcm90YXRlIHRoZSBlbnRpdHkgYnkgYW4gYW1vdW50LiBVc2UgbmVnYXRpdmUgdmFsdWVzXG5cdCogZm9yIGFuIG9wcG9zaXRlIGRpcmVjdGlvbi5cblx0Ki9cblx0X2Nhc2NhZGU6IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKCFlKSByZXR1cm47IC8vbm8gY2hhbmdlIGluIHBvc2l0aW9uXG5cdFx0dmFyIGkgPSAwLCBjaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuLCBsID0gY2hpbGRyZW4ubGVuZ3RoLCBvYmo7XG5cdFx0Ly9yb3RhdGlvblxuXHRcdGlmIChlLmNvcykge1xuXHRcdFx0Zm9yICg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0b2JqID0gY2hpbGRyZW5baV07XG5cdFx0XHRcdGlmICgncm90YXRlJyBpbiBvYmopIG9iai5yb3RhdGUoZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vdXNlIE1CUiBvciBjdXJyZW50XG5cdFx0XHR2YXIgcmVjdCA9IHRoaXMuX21iciB8fCB0aGlzLFxuXHRcdFx0XHRkeCA9IHJlY3QuX3ggLSBlLl94LFxuXHRcdFx0XHRkeSA9IHJlY3QuX3kgLSBlLl95LFxuXHRcdFx0XHRkdyA9IHJlY3QuX3cgLSBlLl93LFxuXHRcdFx0XHRkaCA9IHJlY3QuX2ggLSBlLl9oO1xuXG5cdFx0XHRmb3IgKDsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHRvYmogPSBjaGlsZHJlbltpXTtcblx0XHRcdFx0b2JqLnNoaWZ0KGR4LCBkeSwgZHcsIGRoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYXR0YWNoXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYXR0YWNoKEVudGl0eSBvYmpbLCAuLiwgRW50aXR5IG9iak5dKVxuXHQqIEBwYXJhbSBvYmogLSBFbnRpdHkocykgdG8gYXR0YWNoXG5cdCogQXR0YWNoZXMgYW4gZW50aXRpZXMgcG9zaXRpb24gYW5kIHJvdGF0aW9uIHRvIGN1cnJlbnQgZW50aXR5LiBXaGVuIHRoZSBjdXJyZW50IGVudGl0eSBtb3Zlcyxcblx0KiB0aGUgYXR0YWNoZWQgZW50aXR5IHdpbGwgbW92ZSBieSB0aGUgc2FtZSBhbW91bnQuIEF0dGFjaGVkIGVudGl0aWVzIHN0b3JlZCBpbiBfY2hpbGRyZW4gYXJyYXksXG5cdCogdGhlIHBhcmVudCBvYmplY3QgaXMgc3RvcmVkIGluIF9wYXJlbnQgb24gdGhlIGNoaWxkIGVudGl0aWVzLlxuXHQqXG5cdCogQXMgbWFueSBvYmplY3RzIGFzIHdhbnRlZCBjYW4gYmUgYXR0YWNoZWQgYW5kIGEgaGllcmFyY2h5IG9mIG9iamVjdHMgaXMgcG9zc2libGUgYnkgYXR0YWNoaW5nLlxuXHQqL1xuXHRhdHRhY2g6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgaSA9IDAsIGFyZyA9IGFyZ3VtZW50cywgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIG9iajtcblx0XHRmb3IgKDsgaSA8IGw7ICsraSkge1xuXHRcdFx0b2JqID0gYXJnW2ldO1xuXHRcdFx0aWYgKG9iai5fcGFyZW50KSB7IG9iai5fcGFyZW50LmRldGFjaChvYmopOyB9XG5cdFx0XHRvYmouX3BhcmVudCA9IHRoaXM7XG5cdFx0XHR0aGlzLl9jaGlsZHJlbi5wdXNoKG9iaik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZGV0YWNoXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZGV0YWNoKFtFbnRpdHkgb2JqXSlcblx0KiBAcGFyYW0gb2JqIC0gVGhlIGVudGl0eSB0byBkZXRhY2guIExlZnQgYmxhbmsgd2lsbCByZW1vdmUgYWxsIGF0dGFjaGVkIGVudGl0aWVzXG5cdCogU3RvcCBhbiBlbnRpdHkgZnJvbSBmb2xsb3dpbmcgdGhlIGN1cnJlbnQgZW50aXR5LiBQYXNzaW5nIG5vIGFyZ3VtZW50cyB3aWxsIHN0b3Bcblx0KiBldmVyeSBlbnRpdHkgYXR0YWNoZWQuXG5cdCovXG5cdGRldGFjaDogZnVuY3Rpb24gKG9iaikge1xuXHRcdC8vaWYgbm90aGluZyBwYXNzZWQsIHJlbW92ZSBhbGwgYXR0YWNoZWQgb2JqZWN0c1xuXHRcdGlmICghb2JqKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuW2ldLl9wYXJlbnQgPSBudWxsO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fY2hpbGRyZW4gPSBbXTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdC8vaWYgb2JqIHBhc3NlZCwgZmluZCB0aGUgaGFuZGxlciBhbmQgdW5iaW5kXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX2NoaWxkcmVuW2ldID09IG9iaikge1xuXHRcdFx0XHR0aGlzLl9jaGlsZHJlbi5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdG9iai5fcGFyZW50ID0gbnVsbDtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLm9yaWdpblxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLm9yaWdpbihOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBQaXhlbCB2YWx1ZSBvZiBvcmlnaW4gb2Zmc2V0IG9uIHRoZSBYIGF4aXNcblx0KiBAcGFyYW0geSAtIFBpeGVsIHZhbHVlIG9mIG9yaWdpbiBvZmZzZXQgb24gdGhlIFkgYXhpc1xuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5vcmlnaW4oU3RyaW5nIG9mZnNldClcblx0KiBAcGFyYW0gb2Zmc2V0IC0gQ29tYmluYXRpb24gb2YgY2VudGVyLCB0b3AsIGJvdHRvbSwgbWlkZGxlLCBsZWZ0IGFuZCByaWdodFxuXHQqIFNldCB0aGUgb3JpZ2luIHBvaW50IG9mIGFuIGVudGl0eSBmb3IgaXQgdG8gcm90YXRlIGFyb3VuZC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5vcmlnaW4oXCJ0b3AgbGVmdFwiKVxuXHQqIHRoaXMub3JpZ2luKFwiY2VudGVyXCIpXG5cdCogdGhpcy5vcmlnaW4oXCJib3R0b20gcmlnaHRcIilcblx0KiB0aGlzLm9yaWdpbihcIm1pZGRsZSByaWdodFwiKVxuXHQqIH5+flxuXHQqXG5cdCogQHNlZSAucm90YXRpb25cblx0Ki9cblx0b3JpZ2luOiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdC8vdGV4dCBiYXNlZCBvcmlnaW5cblx0XHRpZiAodHlwZW9mIHggPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdGlmICh4ID09PSBcImNlbnRyZVwiIHx8IHggPT09IFwiY2VudGVyXCIgfHwgeC5pbmRleE9mKCcgJykgPT09IC0xKSB7XG5cdFx0XHRcdHggPSB0aGlzLl93IC8gMjtcblx0XHRcdFx0eSA9IHRoaXMuX2ggLyAyO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGNtZCA9IHguc3BsaXQoJyAnKTtcblx0XHRcdFx0aWYgKGNtZFswXSA9PT0gXCJ0b3BcIikgeSA9IDA7XG5cdFx0XHRcdGVsc2UgaWYgKGNtZFswXSA9PT0gXCJib3R0b21cIikgeSA9IHRoaXMuX2g7XG5cdFx0XHRcdGVsc2UgaWYgKGNtZFswXSA9PT0gXCJtaWRkbGVcIiB8fCBjbWRbMV0gPT09IFwiY2VudGVyXCIgfHwgY21kWzFdID09PSBcImNlbnRyZVwiKSB5ID0gdGhpcy5faCAvIDI7XG5cblx0XHRcdFx0aWYgKGNtZFsxXSA9PT0gXCJjZW50ZXJcIiB8fCBjbWRbMV0gPT09IFwiY2VudHJlXCIgfHwgY21kWzFdID09PSBcIm1pZGRsZVwiKSB4ID0gdGhpcy5fdyAvIDI7XG5cdFx0XHRcdGVsc2UgaWYgKGNtZFsxXSA9PT0gXCJsZWZ0XCIpIHggPSAwO1xuXHRcdFx0XHRlbHNlIGlmIChjbWRbMV0gPT09IFwicmlnaHRcIikgeCA9IHRoaXMuX3c7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fb3JpZ2luLnggPSB4O1xuXHRcdHRoaXMuX29yaWdpbi55ID0geTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmZsaXBcblx0KiBAY29tcCAyRFxuXHQqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIGVudGl0eSBoYXMgZmxpcHBlZFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5mbGlwKFN0cmluZyBkaXIpXG5cdCogQHBhcmFtIGRpciAtIEZsaXAgZGlyZWN0aW9uXG5cdCpcblx0KiBGbGlwIGVudGl0eSBvbiBwYXNzZWQgZGlyZWN0aW9uXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMuZmxpcChcIlhcIilcblx0KiB+fn5cblx0Ki9cblx0ZmxpcDogZnVuY3Rpb24gKGRpcikge1xuXHRcdGRpciA9IGRpciB8fCBcIlhcIjtcbiAgICAgICAgICAgICAgICBpZighdGhpc1tcIl9mbGlwXCIgKyBkaXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbXCJfZmxpcFwiICsgZGlyXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cdH0sXG5cbiAgICAgICAgLyoqQFxuXHQqICMudW5mbGlwXG5cdCogQGNvbXAgMkRcblx0KiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBlbnRpdHkgaGFzIHVuZmxpcHBlZFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC51bmZsaXAoU3RyaW5nIGRpcilcblx0KiBAcGFyYW0gZGlyIC0gVW5mbGlwIGRpcmVjdGlvblxuXHQqXG5cdCogVW5mbGlwIGVudGl0eSBvbiBwYXNzZWQgZGlyZWN0aW9uIChpZiBpdCdzIGZsaXBwZWQpXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMudW5mbGlwKFwiWFwiKVxuXHQqIH5+flxuXHQqL1xuXHR1bmZsaXA6IGZ1bmN0aW9uIChkaXIpIHtcblx0XHRkaXIgPSBkaXIgfHwgXCJYXCI7XG4gICAgICAgICAgICAgICAgaWYodGhpc1tcIl9mbGlwXCIgKyBkaXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbXCJfZmxpcFwiICsgZGlyXSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG4gICAgICAgICAgICAgICAgfVxuXHR9LFxuXG5cdC8qKlxuXHQqIE1ldGhvZCBmb3Igcm90YXRpb24gcmF0aGVyIHRoYW4gdGhyb3VnaCBhIHNldHRlclxuXHQqL1xuXHRyb3RhdGU6IGZ1bmN0aW9uIChlKSB7XG5cdFx0Ly9hc3N1bWUgZXZlbnQgZGF0YSBvcmlnaW5cblx0XHR0aGlzLl9vcmlnaW4ueCA9IGUuby54IC0gdGhpcy5feDtcblx0XHR0aGlzLl9vcmlnaW4ueSA9IGUuby55IC0gdGhpcy5feTtcblxuXHRcdC8vbW9kaWZ5IHRocm91Z2ggdGhlIHNldHRlciBtZXRob2Rcblx0XHR0aGlzLl9hdHRyKCdfcm90YXRpb24nLCBlLnRoZXRhKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5fYXR0clxuXHQqIEBjb21wIDJEXG5cdCogU2V0dGVyIG1ldGhvZCBmb3IgYWxsIDJEIHByb3BlcnRpZXMgaW5jbHVkaW5nXG5cdCogeCwgeSwgdywgaCwgYWxwaGEsIHJvdGF0aW9uIGFuZCB2aXNpYmxlLlxuXHQqL1xuXHRfYXR0cjogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG5cdFx0Ly9rZWVwIGEgcmVmZXJlbmNlIG9mIHRoZSBvbGQgcG9zaXRpb25zXG5cdFx0dmFyIHBvcyA9IHRoaXMucG9zKCksXG5cdFx0XHRvbGQgPSB0aGlzLm1icigpIHx8IHBvcztcblxuXHRcdC8vaWYgcm90YXRpb24sIHVzZSB0aGUgcm90YXRlIG1ldGhvZFxuXHRcdGlmIChuYW1lID09PSAnX3JvdGF0aW9uJykge1xuXHRcdFx0dGhpcy5fcm90YXRlKHZhbHVlKTtcblx0XHRcdHRoaXMudHJpZ2dlcihcIlJvdGF0ZVwiKTtcblx0XHRcdC8vc2V0IHRoZSBnbG9iYWwgWiBhbmQgdHJpZ2dlciByZW9yZGVyIGp1c3QgaW4gY2FzZVxuXHRcdH0gZWxzZSBpZiAobmFtZSA9PT0gJ196Jykge1xuXHRcdFx0dGhpcy5fZ2xvYmFsWiA9IHBhcnNlSW50KHZhbHVlICsgQ3JhZnR5Lnplcm9GaWxsKHRoaXNbMF0sIDUpLCAxMCk7IC8vbWFnaWMgbnVtYmVyIDEwZTUgaXMgdGhlIG1heCBudW0gb2YgZW50aXRpZXNcblx0XHRcdHRoaXMudHJpZ2dlcihcInJlb3JkZXJcIik7XG5cdFx0XHQvL2lmIHRoZSByZWN0IGJvdW5kcyBjaGFuZ2UsIHVwZGF0ZSB0aGUgTUJSIGFuZCB0cmlnZ2VyIG1vdmVcblx0XHR9IGVsc2UgaWYgKG5hbWUgPT0gJ194JyB8fCBuYW1lID09PSAnX3knIHx8IG5hbWUgPT09ICdfdycgfHwgbmFtZSA9PT0gJ19oJykge1xuXHRcdFx0dmFyIG1iciA9IHRoaXMuX21icjtcblx0XHRcdGlmIChtYnIpIHtcblx0XHRcdFx0bWJyW25hbWVdIC09IHRoaXNbbmFtZV0gLSB2YWx1ZTtcblx0XHRcdH1cblx0XHRcdHRoaXNbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdHRoaXMudHJpZ2dlcihcIk1vdmVcIiwgb2xkKTtcblx0XHR9XG5cblx0XHQvL2V2ZXJ5dGhpbmcgd2lsbCBhc3N1bWUgdGhlIHZhbHVlXG5cdFx0dGhpc1tuYW1lXSA9IHZhbHVlO1xuXG5cdFx0Ly90cmlnZ2VyIGEgY2hhbmdlXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIsIG9sZCk7XG5cdH1cbn0pO1xuXG5DcmFmdHkuYyhcIlBoeXNpY3NcIiwge1xuXHRfZ3Jhdml0eTogMC40LFxuXHRfZnJpY3Rpb246IDAuMixcblx0X2JvdW5jZTogMC41LFxuXG5cdGdyYXZpdHk6IGZ1bmN0aW9uIChncmF2aXR5KSB7XG5cdFx0dGhpcy5fZ3Jhdml0eSA9IGdyYXZpdHk7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNHcmF2aXR5XG4qIEBjYXRlZ29yeSAyRFxuKiBBZGRzIGdyYXZpdGF0aW9uYWwgcHVsbCB0byB0aGUgZW50aXR5LlxuKi9cbkNyYWZ0eS5jKFwiR3Jhdml0eVwiLCB7XG5cdF9ncmF2aXR5Q29uc3Q6IDAuMixcblx0X2d5OiAwLFxuXHRfZmFsbGluZzogdHJ1ZSxcblx0X2FudGk6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoXCIyRFwiKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5ncmF2aXR5XG5cdCogQGNvbXAgR3Jhdml0eVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5ncmF2aXR5KFtjb21wXSlcblx0KiBAcGFyYW0gY29tcCAtIFRoZSBuYW1lIG9mIGEgY29tcG9uZW50IHRoYXQgd2lsbCBzdG9wIHRoaXMgZW50aXR5IGZyb20gZmFsbGluZ1xuXHQqXG5cdCogRW5hYmxlIGdyYXZpdHkgZm9yIHRoaXMgZW50aXR5IG5vIG1hdHRlciB3aGV0aGVyIGNvbXAgcGFyYW1ldGVyIGlzIG5vdCBzcGVjaWZpZWQsXG5cdCogSWYgY29tcCBwYXJhbWV0ZXIgaXMgc3BlY2lmaWVkIGFsbCBlbnRpdGllcyB3aXRoIHRoYXQgY29tcG9uZW50IHdpbGwgc3RvcCB0aGlzIGVudGl0eSBmcm9tIGZhbGxpbmcuXG5cdCogRm9yIGEgcGxheWVyIGVudGl0eSBpbiBhIHBsYXRmb3JtIGdhbWUgdGhpcyB3b3VsZCBiZSBhIGNvbXBvbmVudCB0aGF0IGlzIGFkZGVkIHRvIGFsbCBlbnRpdGllc1xuXHQqIHRoYXQgdGhlIHBsYXllciBzaG91bGQgYmUgYWJsZSB0byB3YWxrIG9uLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIENvbG9yLCBHcmF2aXR5XCIpXG5cdCpcdCAuY29sb3IoXCJyZWRcIilcblx0Klx0IC5hdHRyKHsgdzogMTAwLCBoOiAxMDAgfSlcblx0Klx0IC5ncmF2aXR5KFwicGxhdGZvcm1cIilcblx0KiB+fn5cblx0Ki9cblx0Z3Jhdml0eTogZnVuY3Rpb24gKGNvbXApIHtcblx0XHRpZiAoY29tcCkgdGhpcy5fYW50aSA9IGNvbXA7XG5cblx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMuX2VudGVyRnJhbWUpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZ3Jhdml0eUNvbnN0XG5cdCogQGNvbXAgR3Jhdml0eVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5ncmF2aXR5Q29uc3QoZylcblx0KiBAcGFyYW0gZyAtIGdyYXZpdGF0aW9uYWwgY29uc3RhbnRcblx0KlxuXHQqIFNldCB0aGUgZ3Jhdml0YXRpb25hbCBjb25zdGFudCB0byBnLiBUaGUgZGVmYXVsdCBpcyAuMi4gVGhlIGdyZWF0ZXIgZywgdGhlIGZhc3RlciB0aGUgb2JqZWN0IGZhbGxzLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIENvbG9yLCBHcmF2aXR5XCIpXG5cdCogICAuY29sb3IoXCJyZWRcIilcblx0KiAgIC5hdHRyKHsgdzogMTAwLCBoOiAxMDAgfSlcblx0KiAgIC5ncmF2aXR5KFwicGxhdGZvcm1cIilcblx0KiAgIC5ncmF2aXR5Q29uc3QoMilcblx0KiB+fn5cblx0Ki9cblx0Z3Jhdml0eUNvbnN0OiBmdW5jdGlvbihnKSB7XG5cdFx0dGhpcy5fZ3Jhdml0eUNvbnN0PWc7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2VudGVyRnJhbWU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fZmFsbGluZykge1xuXHRcdFx0Ly9pZiBmYWxsaW5nLCBtb3ZlIHRoZSBwbGF5ZXJzIFlcblx0XHRcdHRoaXMuX2d5ICs9IHRoaXMuX2dyYXZpdHlDb25zdDtcblx0XHRcdHRoaXMueSArPSB0aGlzLl9neTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fZ3kgPSAwOyAvL3Jlc2V0IGNoYW5nZSBpbiB5XG5cdFx0fVxuXG5cdFx0dmFyIG9iaiwgaGl0ID0gZmFsc2UsIHBvcyA9IHRoaXMucG9zKCksXG5cdFx0XHRxLCBpID0gMCwgbDtcblxuXHRcdC8vSW5jcmVhc2UgYnkgMSB0byBtYWtlIHN1cmUgbWFwLnNlYXJjaCgpIGZpbmRzIHRoZSBmbG9vclxuXHRcdHBvcy5feSsrO1xuXG5cdFx0Ly9tYXAuc2VhcmNoIHdhbnRzIF94IGFuZCBpbnRlcnNlY3Qgd2FudHMgeC4uLlxuXHRcdHBvcy54ID0gcG9zLl94O1xuXHRcdHBvcy55ID0gcG9zLl95O1xuXHRcdHBvcy53ID0gcG9zLl93O1xuXHRcdHBvcy5oID0gcG9zLl9oO1xuXG5cdFx0cSA9IENyYWZ0eS5tYXAuc2VhcmNoKHBvcyk7XG5cdFx0bCA9IHEubGVuZ3RoO1xuXG5cdFx0Zm9yICg7IGkgPCBsOyArK2kpIHtcblx0XHRcdG9iaiA9IHFbaV07XG5cdFx0XHQvL2NoZWNrIGZvciBhbiBpbnRlcnNlY3Rpb24gZGlyZWN0bHkgYmVsb3cgdGhlIHBsYXllclxuXHRcdFx0aWYgKG9iaiAhPT0gdGhpcyAmJiBvYmouaGFzKHRoaXMuX2FudGkpICYmIG9iai5pbnRlcnNlY3QocG9zKSkge1xuXHRcdFx0XHRoaXQgPSBvYmo7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoaXQpIHsgLy9zdG9wIGZhbGxpbmcgaWYgZm91bmRcblx0XHRcdGlmICh0aGlzLl9mYWxsaW5nKSB0aGlzLnN0b3BGYWxsaW5nKGhpdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2ZhbGxpbmcgPSB0cnVlOyAvL2tlZXAgZmFsbGluZyBvdGhlcndpc2Vcblx0XHR9XG5cdH0sXG5cblx0c3RvcEZhbGxpbmc6IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKGUpIHRoaXMueSA9IGUuX3kgLSB0aGlzLl9oOyAvL21vdmUgb2JqZWN0XG5cblx0XHQvL3RoaXMuX2d5ID0gLTEgKiB0aGlzLl9ib3VuY2U7XG5cdFx0dGhpcy5fZmFsbGluZyA9IGZhbHNlO1xuXHRcdGlmICh0aGlzLl91cCkgdGhpcy5fdXAgPSBmYWxzZTtcblx0XHR0aGlzLnRyaWdnZXIoXCJoaXRcIik7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYW50aWdyYXZpdHlcblx0KiBAY29tcCBHcmF2aXR5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFudGlncmF2aXR5KClcblx0KiBEaXNhYmxlIGdyYXZpdHkgZm9yIHRoaXMgY29tcG9uZW50LiBJdCBjYW4gYmUgcmVlbmFibGVkIGJ5IGNhbGxpbmcgLmdyYXZpdHkoKVxuXHQqL1xuXHRhbnRpZ3Jhdml0eTogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMudW5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLl9lbnRlckZyYW1lKTtcblx0fVxufSk7XG5cbi8qKkBcbiogI0NyYWZ0eS5wb2x5Z29uXG4qIEBjYXRlZ29yeSAyRFxuKlxuKiBQb2x5Z29uIG9iamVjdCB1c2VkIGZvciBoaXRib3hlcyBhbmQgY2xpY2sgbWFwcy4gTXVzdCBwYXNzIGFuIEFycmF5IGZvciBlYWNoIHBvaW50IGFzIGFuXG4qIGFyZ3VtZW50IHdoZXJlIGluZGV4IDAgaXMgdGhlIHggcG9zaXRpb24gYW5kIGluZGV4IDEgaXMgdGhlIHkgcG9zaXRpb24uXG4qXG4qIEZvciBleGFtcGxlIG9uZSBwb2ludCBvZiBhIHBvbHlnb24gd2lsbCBsb29rIGxpa2UgdGhpczogYFswLDVdYCB3aGVyZSB0aGUgYHhgIGlzIGAwYCBhbmQgdGhlIGB5YCBpcyBgNWAuXG4qXG4qIENhbiBwYXNzIGFuIGFycmF5IG9mIHRoZSBwb2ludHMgb3Igc2ltcGx5IHB1dCBlYWNoIHBvaW50IGFzIGFuIGFyZ3VtZW50LlxuKlxuKiBXaGVuIGNyZWF0aW5nIGEgcG9seWdvbiBmb3IgYW4gZW50aXR5LCBlYWNoIHBvaW50IHNob3VsZCBiZSBvZmZzZXQgb3IgcmVsYXRpdmUgZnJvbSB0aGUgZW50aXRpZXMgYHhgIGFuZCBgeWBcbiogKGRvbid0IGluY2x1ZGUgdGhlIGFic29sdXRlIHZhbHVlcyBhcyBpdCB3aWxsIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlIHRoaXMpLlxuKlxuKlxuKiBAZXhhbXBsZVxuKiB+fn5cbiogbmV3IENyYWZ0eS5wb2x5Z29uKFs1MCwwXSxbMTAwLDEwMF0sWzAsMTAwXSk7XG4qIG5ldyBDcmFmdHkucG9seWdvbihbWzUwLDBdLFsxMDAsMTAwXSxbMCwxMDBdXSk7XG4qIH5+flxuKi9cbkNyYWZ0eS5wb2x5Z29uID0gZnVuY3Rpb24gKHBvbHkpIHtcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0cG9seSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cdH1cblx0dGhpcy5wb2ludHMgPSBwb2x5O1xufTtcblxuQ3JhZnR5LnBvbHlnb24ucHJvdG90eXBlID0ge1xuXHQvKipAXG5cdCogIy5jb250YWluc1BvaW50XG5cdCogQGNvbXAgQ3JhZnR5LnBvbHlnb25cblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuY29udGFpbnNQb2ludChOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KlxuXHQqIE1ldGhvZCBpcyB1c2VkIHRvIGRldGVybWluZSBpZiBhIGdpdmVuIHBvaW50IGlzIGNvbnRhaW5lZCBieSB0aGUgcG9seWdvbi5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdmFyIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oWzUwLDBdLFsxMDAsMTAwXSxbMCwxMDBdKTtcblx0KiBwb2x5LmNvbnRhaW5zUG9pbnQoNTAsIDUwKTsgLy9UUlVFXG5cdCogcG9seS5jb250YWluc1BvaW50KDAsIDApOyAvL0ZBTFNFXG5cdCogfn5+XG5cdCovXG5cdGNvbnRhaW5zUG9pbnQ6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0dmFyIHAgPSB0aGlzLnBvaW50cywgaSwgaiwgYyA9IGZhbHNlO1xuXG5cdFx0Zm9yIChpID0gMCwgaiA9IHAubGVuZ3RoIC0gMTsgaSA8IHAubGVuZ3RoOyBqID0gaSsrKSB7XG5cdFx0XHRpZiAoKChwW2ldWzFdID4geSkgIT0gKHBbal1bMV0gPiB5KSkgJiYgKHggPCAocFtqXVswXSAtIHBbaV1bMF0pICogKHkgLSBwW2ldWzFdKSAvIChwW2pdWzFdIC0gcFtpXVsxXSkgKyBwW2ldWzBdKSkge1xuXHRcdFx0XHRjID0gIWM7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc2hpZnRcblx0KiBAY29tcCBDcmFmdHkucG9seWdvblxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIC5zaGlmdChOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBBbW91bnQgdG8gc2hpZnQgdGhlIGB4YCBheGlzXG5cdCogQHBhcmFtIHkgLSBBbW91bnQgdG8gc2hpZnQgdGhlIGB5YCBheGlzXG5cdCpcblx0KiBTaGlmdHMgZXZlcnkgc2luZ2xlIHBvaW50IGluIHRoZSBwb2x5Z29uIGJ5IHRoZSBzcGVjaWZpZWQgYW1vdW50LlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB2YXIgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihbNTAsMF0sWzEwMCwxMDBdLFswLDEwMF0pO1xuXHQqIHBvbHkuc2hpZnQoNSw1KTtcblx0KiAvL1tbNTUsNV0sIFsxMDUsNV0sIFs1LDEwNV1dO1xuXHQqIH5+flxuXHQqL1xuXHRzaGlmdDogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHR2YXIgaSA9IDAsIGwgPSB0aGlzLnBvaW50cy5sZW5ndGgsIGN1cnJlbnQ7XG5cdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdGN1cnJlbnQgPSB0aGlzLnBvaW50c1tpXTtcblx0XHRcdGN1cnJlbnRbMF0gKz0geDtcblx0XHRcdGN1cnJlbnRbMV0gKz0geTtcblx0XHR9XG5cdH0sXG5cblx0cm90YXRlOiBmdW5jdGlvbiAoZSkge1xuXHRcdHZhciBpID0gMCwgbCA9IHRoaXMucG9pbnRzLmxlbmd0aCxcblx0XHRcdGN1cnJlbnQsIHgsIHk7XG5cblx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0Y3VycmVudCA9IHRoaXMucG9pbnRzW2ldO1xuXG5cdFx0XHR4ID0gZS5vLnggKyAoY3VycmVudFswXSAtIGUuby54KSAqIGUuY29zICsgKGN1cnJlbnRbMV0gLSBlLm8ueSkgKiBlLnNpbjtcblx0XHRcdHkgPSBlLm8ueSAtIChjdXJyZW50WzBdIC0gZS5vLngpICogZS5zaW4gKyAoY3VycmVudFsxXSAtIGUuby55KSAqIGUuY29zO1xuXG5cdFx0XHRjdXJyZW50WzBdID0geDtcblx0XHRcdGN1cnJlbnRbMV0gPSB5O1xuXHRcdH1cblx0fVxufTtcblxuLyoqQFxuKiAjQ3JhZnR5LmNpcmNsZVxuKiBAY2F0ZWdvcnkgMkRcbiogQ2lyY2xlIG9iamVjdCB1c2VkIGZvciBoaXRib3hlcyBhbmQgY2xpY2sgbWFwcy4gTXVzdCBwYXNzIGEgYHhgLCBhIGB5YCBhbmQgYSBgcmFkaXVzYCB2YWx1ZS5cbipcbipAZXhhbXBsZVxuKiB+fn5cbiogdmFyIGNlbnRlclggPSA1LFxuKiAgICAgY2VudGVyWSA9IDEwLFxuKiAgICAgcmFkaXVzID0gMjU7XG4qXG4qIG5ldyBDcmFmdHkuY2lyY2xlKGNlbnRlclgsIGNlbnRlclksIHJhZGl1cyk7XG4qIH5+flxuKlxuKiBXaGVuIGNyZWF0aW5nIGEgY2lyY2xlIGZvciBhbiBlbnRpdHksIGVhY2ggcG9pbnQgc2hvdWxkIGJlIG9mZnNldCBvciByZWxhdGl2ZSBmcm9tIHRoZSBlbnRpdGllcyBgeGAgYW5kIGB5YFxuKiAoZG9uJ3QgaW5jbHVkZSB0aGUgYWJzb2x1dGUgdmFsdWVzIGFzIGl0IHdpbGwgYXV0b21hdGljYWxseSBjYWxjdWxhdGUgdGhpcykuXG4qL1xuQ3JhZnR5LmNpcmNsZSA9IGZ1bmN0aW9uICh4LCB5LCByYWRpdXMpIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5yYWRpdXMgPSByYWRpdXM7XG5cbiAgICAvLyBDcmVhdGVzIGFuIG9jdGFnb24gdGhhdCBhcHByb3hpbWF0ZSB0aGUgY2lyY2xlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LlxuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdmFyIHRoZXRhO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgICAgdGhldGEgPSBpICogTWF0aC5QSSAvIDQ7XG4gICAgICAgIHRoaXMucG9pbnRzW2ldID0gW3RoaXMueCArIChNYXRoLnNpbih0aGV0YSkgKiByYWRpdXMpLCB0aGlzLnkgKyAoTWF0aC5jb3ModGhldGEpICogcmFkaXVzKV07XG4gICAgfVxufTtcblxuQ3JhZnR5LmNpcmNsZS5wcm90b3R5cGUgPSB7XG4gICAgLyoqQFxuXHQqICMuY29udGFpbnNQb2ludFxuXHQqIEBjb21wIENyYWZ0eS5jaXJjbGVcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuY29udGFpbnNQb2ludChOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KlxuXHQqIE1ldGhvZCBpcyB1c2VkIHRvIGRldGVybWluZSBpZiBhIGdpdmVuIHBvaW50IGlzIGNvbnRhaW5lZCBieSB0aGUgY2lyY2xlLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB2YXIgY2lyY2xlID0gbmV3IENyYWZ0eS5jaXJjbGUoMCwgMCwgMTApO1xuXHQqIGNpcmNsZS5jb250YWluc1BvaW50KDAsIDApOyAvL1RSVUVcblx0KiBjaXJjbGUuY29udGFpbnNQb2ludCg1MCwgNTApOyAvL0ZBTFNFXG5cdCogfn5+XG5cdCovXG5cdGNvbnRhaW5zUG9pbnQ6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0dmFyIHJhZGl1cyA9IHRoaXMucmFkaXVzLFxuXHRcdCAgICBzcXJ0ID0gTWF0aC5zcXJ0LFxuXHRcdCAgICBkZWx0YVggPSB0aGlzLnggLSB4LFxuXHRcdCAgICBkZWx0YVkgPSB0aGlzLnkgLSB5O1xuXG5cdFx0cmV0dXJuIChkZWx0YVggKiBkZWx0YVggKyBkZWx0YVkgKiBkZWx0YVkpIDwgKHJhZGl1cyAqIHJhZGl1cyk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc2hpZnRcblx0KiBAY29tcCBDcmFmdHkuY2lyY2xlXG5cdCogQHNpZ24gcHVibGljIHZvaWQgLnNoaWZ0KE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIEFtb3VudCB0byBzaGlmdCB0aGUgYHhgIGF4aXNcblx0KiBAcGFyYW0geSAtIEFtb3VudCB0byBzaGlmdCB0aGUgYHlgIGF4aXNcblx0KlxuXHQqIFNoaWZ0cyB0aGUgY2lyY2xlIGJ5IHRoZSBzcGVjaWZpZWQgYW1vdW50LlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB2YXIgcG9seSA9IG5ldyBDcmFmdHkuY2lyY2xlKDAsIDAsIDEwKTtcblx0KiBjaXJjbGUuc2hpZnQoNSw1KTtcblx0KiAvL3t4OiA1LCB5OiA1LCByYWRpdXM6IDEwfTtcblx0KiB+fn5cblx0Ki9cblx0c2hpZnQ6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0dGhpcy54ICs9IHg7XG5cdFx0dGhpcy55ICs9IHk7XG5cblx0XHR2YXIgaSA9IDAsIGwgPSB0aGlzLnBvaW50cy5sZW5ndGgsIGN1cnJlbnQ7XG5cdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdGN1cnJlbnQgPSB0aGlzLnBvaW50c1tpXTtcblx0XHRcdGN1cnJlbnRbMF0gKz0geDtcblx0XHRcdGN1cnJlbnRbMV0gKz0geTtcblx0XHR9XG5cdH0sXG5cblx0cm90YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gV2UgYXJlIGEgY2lyY2xlLCB3ZSBkb24ndCBoYXZlIHRvIHJvdGF0ZSA6KVxuXHR9XG59O1xuXG5cbkNyYWZ0eS5tYXRyaXggPSBmdW5jdGlvbiAobSkge1xuXHR0aGlzLm10eCA9IG07XG5cdHRoaXMud2lkdGggPSBtWzBdLmxlbmd0aDtcblx0dGhpcy5oZWlnaHQgPSBtLmxlbmd0aDtcbn07XG5cbkNyYWZ0eS5tYXRyaXgucHJvdG90eXBlID0ge1xuXHR4OiBmdW5jdGlvbiAob3RoZXIpIHtcblx0XHRpZiAodGhpcy53aWR0aCAhPSBvdGhlci5oZWlnaHQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmhlaWdodDsgaSsrKSB7XG5cdFx0XHRyZXN1bHRbaV0gPSBbXTtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgb3RoZXIud2lkdGg7IGorKykge1xuXHRcdFx0XHR2YXIgc3VtID0gMDtcblx0XHRcdFx0Zm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLndpZHRoOyBrKyspIHtcblx0XHRcdFx0XHRzdW0gKz0gdGhpcy5tdHhbaV1ba10gKiBvdGhlci5tdHhba11bal07XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVzdWx0W2ldW2pdID0gc3VtO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbmV3IENyYWZ0eS5tYXRyaXgocmVzdWx0KTtcblx0fSxcblxuXG5cdGU6IGZ1bmN0aW9uIChyb3csIGNvbCkge1xuXHRcdC8vdGVzdCBpZiBvdXQgb2YgYm91bmRzXG5cdFx0aWYgKHJvdyA8IDEgfHwgcm93ID4gdGhpcy5tdHgubGVuZ3RoIHx8IGNvbCA8IDEgfHwgY29sID4gdGhpcy5tdHhbMF0ubGVuZ3RoKSByZXR1cm4gbnVsbDtcblx0XHRyZXR1cm4gdGhpcy5tdHhbcm93IC0gMV1bY29sIC0gMV07XG5cdH1cbn1cblxuLyoqQFxuKiAjQ29sbGlzaW9uXG4qIEBjYXRlZ29yeSAyRFxuKiBDb21wb25lbnQgdG8gZGV0ZWN0IGNvbGxpc2lvbiBiZXR3ZWVuIGFueSB0d28gY29udmV4IHBvbHlnb25zLlxuKi9cbkNyYWZ0eS5jKFwiQ29sbGlzaW9uXCIsIHtcbiAgICAvKipAXG4gICAgICogIy5pbml0XG4gICAgICogQGNvbXAgQ29sbGlzaW9uXG4gICAgICogQ3JlYXRlIGEgcmVjdGFuZ2xlIHBvbHlnb24gYmFzZWQgb24gdGhlIHgsIHksIHcsIGggZGltZW5zaW9ucy5cbiAgICAgKlxuICAgICAqIFlvdSBtdXN0IGVuc3VyZSB0aGF0IHRoZSB4LCB5LCB3LCBoIHByb3BlcnRpZXMgYXJlIHNldCBiZWZvcmUgdGhlIGluaXQgZnVuY3Rpb24gaXMgY2FsbGVkLiBJZiB5b3UgaGF2ZSBhIENhciBjb21wb25lbnQgdGhhdCBzZXRzIHRoZXNlIHByb3BlcnRpZXMgeW91IHNob3VsZCBjcmVhdGUgeW91ciBlbnRpdHkgbGlrZSB0aGlzXG4gICAgICogfn5+XG4gICAgICogQ3JhZnR5LmUoJzJELCBET00sIENhciwgQ29sbGlzaW9uJyk7XG4gICAgICogfn5+XG4gICAgICogQW5kIG5vdCBsaWtlXG4gICAgICogfn5+XG4gICAgICogQ3JhZnR5LmUoJzJELCBET00sIENvbGxpc2lvbiwgQ2FyJyk7XG4gICAgICogfn5+XG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlcXVpcmVzKFwiMkRcIik7XG4gICAgICAgIHZhciBhcmVhID0gdGhpcy5fbWJyIHx8IHRoaXM7XG5cbiAgICAgICAgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihbMCwgMF0sIFthcmVhLl93LCAwXSwgW2FyZWEuX3csIGFyZWEuX2hdLCBbMCwgYXJlYS5faF0pO1xuICAgICAgICB0aGlzLm1hcCA9IHBvbHk7XG4gICAgICAgIHRoaXMuYXR0YWNoKHRoaXMubWFwKTtcbiAgICAgICAgdGhpcy5tYXAuc2hpZnQoYXJlYS5feCwgYXJlYS5feSk7XG4gICAgfSxcblxuICAgIC8qKkBcblx0KiAjLmNvbGxpc2lvblxuXHQqIEBjb21wIENvbGxpc2lvblxuXHQqIFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5jb2xsaXNpb24oW0NyYWZ0eS5wb2x5Z29uIHBvbHlnb25dKVxuXHQqIEBwYXJhbSBwb2x5Z29uIC0gQ3JhZnR5LnBvbHlnb24gb2JqZWN0IHRoYXQgd2lsbCBhY3QgYXMgdGhlIGhpdCBhcmVhXG5cdCogXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmNvbGxpc2lvbihBcnJheSBwb2ludDEsIC4uLCBBcnJheSBwb2ludE4pXG5cdCogQHBhcmFtIHBvaW50IyAtIEFycmF5IHdpdGggYW4gYHhgIGFuZCBgeWAgcG9zaXRpb24gdG8gZ2VuZXJhdGUgYSBwb2x5Z29uXG5cdCogXG5cdCogQ29uc3RydWN0b3IgdGFrZXMgYSBwb2x5Z29uIG9yIGFycmF5IG9mIHBvaW50cyB0byB1c2UgYXMgdGhlIGhpdCBhcmVhLlxuXHQqXG5cdCogVGhlIGhpdCBhcmVhIChwb2x5Z29uKSBtdXN0IGJlIGEgY29udmV4IHNoYXBlIGFuZCBub3QgY29uY2F2ZVxuXHQqIGZvciB0aGUgY29sbGlzaW9uIGRldGVjdGlvbiB0byB3b3JrLlxuICAgICpcbiAgICAqIElmIG5vIGhpdCBhcmVhIGlzIHNwZWNpZmllZCB4LCB5LCB3LCBoIHByb3BlcnRpZXMgb2YgdGhlIGVudGl0eSB3aWxsIGJlIHVzZWQuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBDb2xsaXNpb25cIikuY29sbGlzaW9uKFxuXHQqICAgICBuZXcgQ3JhZnR5LnBvbHlnb24oWzUwLDBdLCBbMTAwLDEwMF0sIFswLDEwMF0pXG5cdCogKTtcbiAgICAqIFxuICAgICogQ3JhZnR5LmUoXCIyRCwgQ29sbGlzaW9uXCIpLmNvbGxpc2lvbihbNTAsMF0sIFsxMDAsMTAwXSwgWzAsMTAwXSk7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkucG9seWdvblxuXHQqL1xuICAgIGNvbGxpc2lvbjogZnVuY3Rpb24gKHBvbHkpIHtcbiAgICAgICAgdmFyIGFyZWEgPSB0aGlzLl9tYnIgfHwgdGhpcztcblxuICAgICAgICBpZiAoIXBvbHkpIHtcbiAgICAgICAgICAgIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oWzAsIDBdLCBbYXJlYS5fdywgMF0sIFthcmVhLl93LCBhcmVhLl9oXSwgWzAsIGFyZWEuX2hdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy9jb252ZXJ0IGFyZ3MgdG8gYXJyYXkgdG8gY3JlYXRlIHBvbHlnb25cbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgICAgIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oYXJncyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1hcCA9IHBvbHk7XG4gICAgICAgIHRoaXMuYXR0YWNoKHRoaXMubWFwKTtcbiAgICAgICAgdGhpcy5tYXAuc2hpZnQoYXJlYS5feCwgYXJlYS5feSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipAXG5cdCogIy5oaXRcblx0KiBAY29tcCBDb2xsaXNpb25cblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbi9BcnJheSBoaXQoU3RyaW5nIGNvbXBvbmVudClcblx0KiBAcGFyYW0gY29tcG9uZW50IC0gQ2hlY2sgY29sbGlzaW9uIHdpdGggZW50aXRpZXMgdGhhdCBoYXMgdGhpcyBjb21wb25lbnRcblx0KiBAcmV0dXJuIGBmYWxzZWAgaWYgbm8gY29sbGlzaW9uLiBJZiBhIGNvbGxpc2lvbiBpcyBkZXRlY3RlZCwgcmV0dXJucyBhbiBBcnJheSBvZiBvYmplY3RzIHRoYXQgYXJlIGNvbGxpZGluZy5cblx0KiBcblx0KiBUYWtlcyBhbiBhcmd1bWVudCBmb3IgYSBjb21wb25lbnQgdG8gdGVzdCBjb2xsaXNpb24gZm9yLiBJZiBhIGNvbGxpc2lvbiBpcyBmb3VuZCwgYW4gYXJyYXkgb2Zcblx0KiBldmVyeSBvYmplY3QgaW4gY29sbGlzaW9uIGFsb25nIHdpdGggdGhlIGFtb3VudCBvZiBvdmVybGFwIGlzIHBhc3NlZC5cblx0KlxuXHQqIElmIG5vIGNvbGxpc2lvbiwgd2lsbCByZXR1cm4gZmFsc2UuIFRoZSByZXR1cm4gY29sbGlzaW9uIGRhdGEgd2lsbCBiZSBhbiBBcnJheSBvZiBPYmplY3RzIHdpdGggdGhlXG5cdCogdHlwZSBvZiBjb2xsaXNpb24gdXNlZCwgdGhlIG9iamVjdCBjb2xsaWRlZCBhbmQgaWYgdGhlIHR5cGUgdXNlZCB3YXMgU0FUIChhIHBvbHlnb24gd2FzIHVzZWQgYXMgdGhlIGhpdGJveCkgdGhlbiBhbiBhbW91bnQgb2Ygb3ZlcmxhcC5cXFxuXHQqIH5+flxuXHQqIFt7XG5cdCogICAgb2JqOiBbZW50aXR5XSxcblx0KiAgICB0eXBlIFwiTUJSXCIgb3IgXCJTQVRcIixcblx0KiAgICBvdmVybGFwOiBbbnVtYmVyXVxuXHQqIH1dXG5cdCogfn5+XG5cdCogYE1CUmAgaXMgeW91ciBzdGFuZGFyZCBheGlzIGFsaWduZWQgcmVjdGFuZ2xlIGludGVyc2VjdGlvbiAoYC5pbnRlcnNlY3RgIGluIHRoZSAyRCBjb21wb25lbnQpLlxuXHQqIGBTQVRgIGlzIGNvbGxpc2lvbiBiZXR3ZWVuIGFueSBjb252ZXggcG9seWdvbi5cblx0KiBcblx0KiBAc2VlIC5vbkhpdCwgMkRcblx0Ki9cblx0aGl0OiBmdW5jdGlvbiAoY29tcCkge1xuXHRcdHZhciBhcmVhID0gdGhpcy5fbWJyIHx8IHRoaXMsXG5cdFx0XHRyZXN1bHRzID0gQ3JhZnR5Lm1hcC5zZWFyY2goYXJlYSwgZmFsc2UpLFxuXHRcdFx0aSA9IDAsIGwgPSByZXN1bHRzLmxlbmd0aCxcblx0XHRcdGR1cGVzID0ge30sXG5cdFx0XHRpZCwgb2JqLCBvYXJlYSwga2V5LFxuXHRcdFx0aGFzTWFwID0gKCdtYXAnIGluIHRoaXMgJiYgJ2NvbnRhaW5zUG9pbnQnIGluIHRoaXMubWFwKSxcblx0XHRcdGZpbmFscmVzdWx0ID0gW107XG5cblx0XHRpZiAoIWwpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRmb3IgKDsgaSA8IGw7ICsraSkge1xuXHRcdFx0b2JqID0gcmVzdWx0c1tpXTtcblx0XHRcdG9hcmVhID0gb2JqLl9tYnIgfHwgb2JqOyAvL3VzZSB0aGUgbWJyXG5cblx0XHRcdGlmICghb2JqKSBjb250aW51ZTtcblx0XHRcdGlkID0gb2JqWzBdO1xuXG5cdFx0XHQvL2NoZWNrIGlmIG5vdCBhZGRlZCB0byBoYXNoIGFuZCB0aGF0IGFjdHVhbGx5IGludGVyc2VjdHNcblx0XHRcdGlmICghZHVwZXNbaWRdICYmIHRoaXNbMF0gIT09IGlkICYmIG9iai5fX2NbY29tcF0gJiZcblx0XHRcdFx0XHRcdFx0IG9hcmVhLl94IDwgYXJlYS5feCArIGFyZWEuX3cgJiYgb2FyZWEuX3ggKyBvYXJlYS5fdyA+IGFyZWEuX3ggJiZcblx0XHRcdFx0XHRcdFx0IG9hcmVhLl95IDwgYXJlYS5feSArIGFyZWEuX2ggJiYgb2FyZWEuX2ggKyBvYXJlYS5feSA+IGFyZWEuX3kpXG5cdFx0XHRcdGR1cGVzW2lkXSA9IG9iajtcblx0XHR9XG5cblx0XHRmb3IgKGtleSBpbiBkdXBlcykge1xuXHRcdFx0b2JqID0gZHVwZXNba2V5XTtcblxuXHRcdFx0aWYgKGhhc01hcCAmJiAnbWFwJyBpbiBvYmopIHtcblx0XHRcdFx0dmFyIFNBVCA9IHRoaXMuX1NBVCh0aGlzLm1hcCwgb2JqLm1hcCk7XG5cdFx0XHRcdFNBVC5vYmogPSBvYmo7XG5cdFx0XHRcdFNBVC50eXBlID0gXCJTQVRcIjtcblx0XHRcdFx0aWYgKFNBVCkgZmluYWxyZXN1bHQucHVzaChTQVQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmluYWxyZXN1bHQucHVzaCh7IG9iajogb2JqLCB0eXBlOiBcIk1CUlwiIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICghZmluYWxyZXN1bHQubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZpbmFscmVzdWx0O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLm9uSGl0XG5cdCogQGNvbXAgQ29sbGlzaW9uXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLm9uSGl0KFN0cmluZyBjb21wb25lbnQsIEZ1bmN0aW9uIGhpdFssIEZ1bmN0aW9uIG5vSGl0XSlcblx0KiBAcGFyYW0gY29tcG9uZW50IC0gQ29tcG9uZW50IHRvIGNoZWNrIGNvbGxpc2lvbnMgZm9yXG5cdCogQHBhcmFtIGhpdCAtIENhbGxiYWNrIG1ldGhvZCB0byBleGVjdXRlIHdoZW4gY29sbGlkZWQgd2l0aCBjb21wb25lbnRcblx0KiBAcGFyYW0gbm9IaXQgLSBDYWxsYmFjayBtZXRob2QgZXhlY3V0ZWQgb25jZSBhcyBzb29uIGFzIGNvbGxpc2lvbiBzdG9wc1xuXHQqIFxuXHQqIENyZWF0ZXMgYW4gZW50ZXJmcmFtZSBldmVudCBjYWxsaW5nIC5oaXQoKSBlYWNoIHRpbWUgYW5kIGlmIGNvbGxpc2lvbiBkZXRlY3RlZCB3aWxsIGludm9rZSB0aGUgY2FsbGJhY2suXG5cdCogXG5cdCogQHNlZSAuaGl0XG5cdCovXG5cdG9uSGl0OiBmdW5jdGlvbiAoY29tcCwgY2FsbGJhY2ssIGNhbGxiYWNrT2ZmKSB7XG5cdFx0dmFyIGp1c3RIaXQgPSBmYWxzZTtcblx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBoaXRkYXRhID0gdGhpcy5oaXQoY29tcCk7XG5cdFx0XHRpZiAoaGl0ZGF0YSkge1xuXHRcdFx0XHRqdXN0SGl0ID0gdHJ1ZTtcblx0XHRcdFx0Y2FsbGJhY2suY2FsbCh0aGlzLCBoaXRkYXRhKTtcblx0XHRcdH0gZWxzZSBpZiAoanVzdEhpdCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGNhbGxiYWNrT2ZmID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjYWxsYmFja09mZi5jYWxsKHRoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGp1c3RIaXQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfU0FUOiBmdW5jdGlvbiAocG9seTEsIHBvbHkyKSB7XG5cdFx0dmFyIHBvaW50czEgPSBwb2x5MS5wb2ludHMsXG5cdFx0XHRwb2ludHMyID0gcG9seTIucG9pbnRzLFxuXHRcdFx0aSA9IDAsIGwgPSBwb2ludHMxLmxlbmd0aCxcblx0XHRcdGosIGsgPSBwb2ludHMyLmxlbmd0aCxcblx0XHRcdG5vcm1hbCA9IHsgeDogMCwgeTogMCB9LFxuXHRcdFx0bGVuZ3RoLFxuXHRcdFx0bWluMSwgbWluMixcblx0XHRcdG1heDEsIG1heDIsXG5cdFx0XHRpbnRlcnZhbCxcblx0XHRcdE1UViA9IG51bGwsXG5cdFx0XHRNVFYyID0gbnVsbCxcblx0XHRcdE1OID0gbnVsbCxcblx0XHRcdGRvdCxcblx0XHRcdG5leHRQb2ludCxcblx0XHRcdGN1cnJlbnRQb2ludDtcblxuXHRcdC8vbG9vcCB0aHJvdWdoIHRoZSBlZGdlcyBvZiBQb2x5Z29uIDFcblx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0bmV4dFBvaW50ID0gcG9pbnRzMVsoaSA9PSBsIC0gMSA/IDAgOiBpICsgMSldO1xuXHRcdFx0Y3VycmVudFBvaW50ID0gcG9pbnRzMVtpXTtcblxuXHRcdFx0Ly9nZW5lcmF0ZSB0aGUgbm9ybWFsIGZvciB0aGUgY3VycmVudCBlZGdlXG5cdFx0XHRub3JtYWwueCA9IC0obmV4dFBvaW50WzFdIC0gY3VycmVudFBvaW50WzFdKTtcblx0XHRcdG5vcm1hbC55ID0gKG5leHRQb2ludFswXSAtIGN1cnJlbnRQb2ludFswXSk7XG5cblx0XHRcdC8vbm9ybWFsaXplIHRoZSB2ZWN0b3Jcblx0XHRcdGxlbmd0aCA9IE1hdGguc3FydChub3JtYWwueCAqIG5vcm1hbC54ICsgbm9ybWFsLnkgKiBub3JtYWwueSk7XG5cdFx0XHRub3JtYWwueCAvPSBsZW5ndGg7XG5cdFx0XHRub3JtYWwueSAvPSBsZW5ndGg7XG5cblx0XHRcdC8vZGVmYXVsdCBtaW4gbWF4XG5cdFx0XHRtaW4xID0gbWluMiA9IC0xO1xuXHRcdFx0bWF4MSA9IG1heDIgPSAtMTtcblxuXHRcdFx0Ly9wcm9qZWN0IGFsbCB2ZXJ0aWNlcyBmcm9tIHBvbHkxIG9udG8gYXhpc1xuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGw7ICsraikge1xuXHRcdFx0XHRkb3QgPSBwb2ludHMxW2pdWzBdICogbm9ybWFsLnggKyBwb2ludHMxW2pdWzFdICogbm9ybWFsLnk7XG5cdFx0XHRcdGlmIChkb3QgPiBtYXgxIHx8IG1heDEgPT09IC0xKSBtYXgxID0gZG90O1xuXHRcdFx0XHRpZiAoZG90IDwgbWluMSB8fCBtaW4xID09PSAtMSkgbWluMSA9IGRvdDtcblx0XHRcdH1cblxuXHRcdFx0Ly9wcm9qZWN0IGFsbCB2ZXJ0aWNlcyBmcm9tIHBvbHkyIG9udG8gYXhpc1xuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGs7ICsraikge1xuXHRcdFx0XHRkb3QgPSBwb2ludHMyW2pdWzBdICogbm9ybWFsLnggKyBwb2ludHMyW2pdWzFdICogbm9ybWFsLnk7XG5cdFx0XHRcdGlmIChkb3QgPiBtYXgyIHx8IG1heDIgPT09IC0xKSBtYXgyID0gZG90O1xuXHRcdFx0XHRpZiAoZG90IDwgbWluMiB8fCBtaW4yID09PSAtMSkgbWluMiA9IGRvdDtcblx0XHRcdH1cblxuXHRcdFx0Ly9jYWxjdWxhdGUgdGhlIG1pbmltdW0gdHJhbnNsYXRpb24gdmVjdG9yIHNob3VsZCBiZSBuZWdhdGl2ZVxuXHRcdFx0aWYgKG1pbjEgPCBtaW4yKSB7XG5cdFx0XHRcdGludGVydmFsID0gbWluMiAtIG1heDE7XG5cblx0XHRcdFx0bm9ybWFsLnggPSAtbm9ybWFsLng7XG5cdFx0XHRcdG5vcm1hbC55ID0gLW5vcm1hbC55O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aW50ZXJ2YWwgPSBtaW4xIC0gbWF4Mjtcblx0XHRcdH1cblxuXHRcdFx0Ly9leGl0IGVhcmx5IGlmIHBvc2l0aXZlXG5cdFx0XHRpZiAoaW50ZXJ2YWwgPj0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChNVFYgPT09IG51bGwgfHwgaW50ZXJ2YWwgPiBNVFYpIHtcblx0XHRcdFx0TVRWID0gaW50ZXJ2YWw7XG5cdFx0XHRcdE1OID0geyB4OiBub3JtYWwueCwgeTogbm9ybWFsLnkgfTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL2xvb3AgdGhyb3VnaCB0aGUgZWRnZXMgb2YgUG9seWdvbiAyXG5cdFx0Zm9yIChpID0gMDsgaSA8IGs7IGkrKykge1xuXHRcdFx0bmV4dFBvaW50ID0gcG9pbnRzMlsoaSA9PSBrIC0gMSA/IDAgOiBpICsgMSldO1xuXHRcdFx0Y3VycmVudFBvaW50ID0gcG9pbnRzMltpXTtcblxuXHRcdFx0Ly9nZW5lcmF0ZSB0aGUgbm9ybWFsIGZvciB0aGUgY3VycmVudCBlZGdlXG5cdFx0XHRub3JtYWwueCA9IC0obmV4dFBvaW50WzFdIC0gY3VycmVudFBvaW50WzFdKTtcblx0XHRcdG5vcm1hbC55ID0gKG5leHRQb2ludFswXSAtIGN1cnJlbnRQb2ludFswXSk7XG5cblx0XHRcdC8vbm9ybWFsaXplIHRoZSB2ZWN0b3Jcblx0XHRcdGxlbmd0aCA9IE1hdGguc3FydChub3JtYWwueCAqIG5vcm1hbC54ICsgbm9ybWFsLnkgKiBub3JtYWwueSk7XG5cdFx0XHRub3JtYWwueCAvPSBsZW5ndGg7XG5cdFx0XHRub3JtYWwueSAvPSBsZW5ndGg7XG5cblx0XHRcdC8vZGVmYXVsdCBtaW4gbWF4XG5cdFx0XHRtaW4xID0gbWluMiA9IC0xO1xuXHRcdFx0bWF4MSA9IG1heDIgPSAtMTtcblxuXHRcdFx0Ly9wcm9qZWN0IGFsbCB2ZXJ0aWNlcyBmcm9tIHBvbHkxIG9udG8gYXhpc1xuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGw7ICsraikge1xuXHRcdFx0XHRkb3QgPSBwb2ludHMxW2pdWzBdICogbm9ybWFsLnggKyBwb2ludHMxW2pdWzFdICogbm9ybWFsLnk7XG5cdFx0XHRcdGlmIChkb3QgPiBtYXgxIHx8IG1heDEgPT09IC0xKSBtYXgxID0gZG90O1xuXHRcdFx0XHRpZiAoZG90IDwgbWluMSB8fCBtaW4xID09PSAtMSkgbWluMSA9IGRvdDtcblx0XHRcdH1cblxuXHRcdFx0Ly9wcm9qZWN0IGFsbCB2ZXJ0aWNlcyBmcm9tIHBvbHkyIG9udG8gYXhpc1xuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGs7ICsraikge1xuXHRcdFx0XHRkb3QgPSBwb2ludHMyW2pdWzBdICogbm9ybWFsLnggKyBwb2ludHMyW2pdWzFdICogbm9ybWFsLnk7XG5cdFx0XHRcdGlmIChkb3QgPiBtYXgyIHx8IG1heDIgPT09IC0xKSBtYXgyID0gZG90O1xuXHRcdFx0XHRpZiAoZG90IDwgbWluMiB8fCBtaW4yID09PSAtMSkgbWluMiA9IGRvdDtcblx0XHRcdH1cblxuXHRcdFx0Ly9jYWxjdWxhdGUgdGhlIG1pbmltdW0gdHJhbnNsYXRpb24gdmVjdG9yIHNob3VsZCBiZSBuZWdhdGl2ZVxuXHRcdFx0aWYgKG1pbjEgPCBtaW4yKSB7XG5cdFx0XHRcdGludGVydmFsID0gbWluMiAtIG1heDE7XG5cblx0XHRcdFx0bm9ybWFsLnggPSAtbm9ybWFsLng7XG5cdFx0XHRcdG5vcm1hbC55ID0gLW5vcm1hbC55O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aW50ZXJ2YWwgPSBtaW4xIC0gbWF4MjtcblxuXG5cdFx0XHR9XG5cblx0XHRcdC8vZXhpdCBlYXJseSBpZiBwb3NpdGl2ZVxuXHRcdFx0aWYgKGludGVydmFsID49IDApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoTVRWID09PSBudWxsIHx8IGludGVydmFsID4gTVRWKSBNVFYgPSBpbnRlcnZhbDtcblx0XHRcdGlmIChpbnRlcnZhbCA+IE1UVjIgfHwgTVRWMiA9PT0gbnVsbCkge1xuXHRcdFx0XHRNVFYyID0gaW50ZXJ2YWw7XG5cdFx0XHRcdE1OID0geyB4OiBub3JtYWwueCwgeTogbm9ybWFsLnkgfTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4geyBvdmVybGFwOiBNVFYyLCBub3JtYWw6IE1OIH07XG5cdH1cbn0pO1xuXG5cbi8qKkBcbiogIy5XaXJlZEhpdEJveFxuKiBAY29tcCBDb2xsaXNpb25cbiogXG4qIENvbXBvbmVudHMgdG8gZGlzcGxheSBDcmFmdHkucG9seWdvbiBBcnJheSBmb3IgZGVidWdnaW5nIGNvbGxpc2lvbiBkZXRlY3Rpb25cbiogXG4qIEBleGFtcGxlXG4qIFRoaXMgd2lsbCBkaXNwbGF5IGEgd2lyZWQgc3F1YXJlIG92ZXIgeW91ciBvcmlnaW5hbCBDYW52YXMgc2NyZWVuXG4qIH5+flxuKiBDcmFmdHkuZShcIjJELERPTSxQbGF5ZXIsQ29sbGlzaW9uLFdpcmVkSGl0Qm94XCIpLmNvbGxpc2lvbihuZXcgQ3JhZnR5LnBvbHlnb24oWzAsMF0sWzAsMzAwXSxbMzAwLDMwMF0sWzMwMCwwXSkpXG4qIH5+flxuKi9cbkNyYWZ0eS5jKFwiV2lyZWRIaXRCb3hcIiwge1xuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdGlmIChDcmFmdHkuc3VwcG9ydC5jYW52YXMpIHtcblx0XHRcdHZhciBjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ0hpdEJveCcpO1xuXHRcdFx0aWYgKCFjKSB7XG5cdFx0XHRcdGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuXHRcdFx0XHRjLmlkID0gJ0hpdEJveCc7XG5cdFx0XHRcdGMud2lkdGggPSBDcmFmdHkudmlld3BvcnQud2lkdGg7XG5cdFx0XHRcdGMuaGVpZ2h0ID0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblx0XHRcdFx0Yy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRcdGMuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdFx0XHRcdGMuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRcdFx0Yy5zdHlsZS56SW5kZXggPSAnMTAwMCc7XG5cdFx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLmFwcGVuZENoaWxkKGMpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGN0eCA9IGMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHZhciBkcmF3ZWQgPSAwLCB0b3RhbCA9IENyYWZ0eShcIldpcmVkSGl0Qm94XCIpLmxlbmd0aDtcblx0XHRcdHRoaXMucmVxdWlyZXMoXCJDb2xsaXNpb25cIikuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoZHJhd2VkID09IHRvdGFsKSB7XG5cdFx0XHRcdFx0Y3R4LmNsZWFyUmVjdCgwLCAwLCBDcmFmdHkudmlld3BvcnQud2lkdGgsIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpO1xuXHRcdFx0XHRcdGRyYXdlZCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0XHRmb3IgKHZhciBwIGluIHRoaXMubWFwLnBvaW50cykge1xuXHRcdFx0XHRcdGN0eC5saW5lVG8oQ3JhZnR5LnZpZXdwb3J0LnggKyB0aGlzLm1hcC5wb2ludHNbcF1bMF0sIENyYWZ0eS52aWV3cG9ydC55ICsgdGhpcy5tYXAucG9pbnRzW3BdWzFdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguY2xvc2VQYXRoKCk7XG5cdFx0XHRcdGN0eC5zdHJva2UoKTtcblx0XHRcdFx0ZHJhd2VkKys7XG5cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcbi8qKkBcbiogIy5Tb2xpZEhpdEJveFxuKiBAY29tcCBDb2xsaXNpb25cbiogXG4qIENvbXBvbmVudHMgdG8gZGlzcGxheSBDcmFmdHkucG9seWdvbiBBcnJheSBmb3IgZGVidWdnaW5nIGNvbGxpc2lvbiBkZXRlY3Rpb25cbiogXG4qIEBleGFtcGxlXG4qIFRoaXMgd2lsbCBkaXNwbGF5IGEgc29saWQgdHJpYW5nbGUgb3ZlciB5b3VyIG9yaWdpbmFsIENhbnZhcyBzY3JlZW5cbiogfn5+XG4qIENyYWZ0eS5lKFwiMkQsRE9NLFBsYXllcixDb2xsaXNpb24sU29saWRIaXRCb3hcIikuY29sbGlzaW9uKG5ldyBDcmFmdHkucG9seWdvbihbMCwwXSxbMCwzMDBdLFszMDAsMzAwXSkpXG4qIH5+flxuKi9cbkNyYWZ0eS5jKFwiU29saWRIaXRCb3hcIiwge1xuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKENyYWZ0eS5zdXBwb3J0LmNhbnZhcykge1xuXHRcdFx0dmFyIGMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnSGl0Qm94Jyk7XG5cdFx0XHRpZiAoIWMpIHtcblx0XHRcdFx0YyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0XHRcdGMuaWQgPSAnSGl0Qm94Jztcblx0XHRcdFx0Yy53aWR0aCA9IENyYWZ0eS52aWV3cG9ydC53aWR0aDtcblx0XHRcdFx0Yy5oZWlnaHQgPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXHRcdFx0XHRjLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHRcdFx0Yy5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblx0XHRcdFx0Yy5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdFx0XHRjLnN0eWxlLnpJbmRleCA9ICcxMDAwJztcblx0XHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0uYXBwZW5kQ2hpbGQoYyk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgY3R4ID0gYy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0dmFyIGRyYXdlZCA9IDAsIHRvdGFsID0gQ3JhZnR5KFwiU29saWRIaXRCb3hcIikubGVuZ3RoO1xuXHRcdFx0dGhpcy5yZXF1aXJlcyhcIkNvbGxpc2lvblwiKS5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmIChkcmF3ZWQgPT0gdG90YWwpIHtcblx0XHRcdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIENyYWZ0eS52aWV3cG9ydC53aWR0aCwgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCk7XG5cdFx0XHRcdFx0ZHJhd2VkID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdGZvciAodmFyIHAgaW4gdGhpcy5tYXAucG9pbnRzKSB7XG5cdFx0XHRcdFx0Y3R4LmxpbmVUbyhDcmFmdHkudmlld3BvcnQueCArIHRoaXMubWFwLnBvaW50c1twXVswXSwgQ3JhZnR5LnZpZXdwb3J0LnkgKyB0aGlzLm1hcC5wb2ludHNbcF1bMV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5jbG9zZVBhdGgoKTtcblx0XHRcdFx0Y3R4LmZpbGwoKTtcblx0XHRcdFx0ZHJhd2VkKys7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG4vKipAXG4qICNET01cbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIERyYXdzIGVudGl0aWVzIGFzIERPTSBub2Rlcywgc3BlY2lmaWNhbGx5IGA8RElWPmBzLlxuKi9cbkNyYWZ0eS5jKFwiRE9NXCIsIHtcbiAgICAvKipAXG5cdCogIy5fZWxlbWVudFxuXHQqIEBjb21wIERPTVxuXHQqIFRoZSBET00gZWxlbWVudCB1c2VkIHRvIHJlcHJlc2VudCB0aGUgZW50aXR5LlxuXHQqL1xuXHRfZWxlbWVudDogbnVsbCxcblx0Ly9ob2xkcyBjdXJyZW50IHN0eWxlcywgc28gd2UgY2FuIGNoZWNrIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIHRvIGJlIHdyaXR0ZW4gdG8gdGhlIERPTVxuXHRfY3NzU3R5bGVzOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9jc3NTdHlsZXMgPSB7IHZpc2liaWxpdHk6ICcnLCBsZWZ0OiAnJywgdG9wOiAnJywgd2lkdGg6ICcnLCBoZWlnaHQ6ICcnLCB6SW5kZXg6ICcnLCBvcGFjaXR5OiAnJywgdHJhbnNmb3JtT3JpZ2luOiAnJywgdHJhbnNmb3JtOiAnJyB9O1xuXHRcdHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdENyYWZ0eS5zdGFnZS5pbm5lci5hcHBlbmRDaGlsZCh0aGlzLl9lbGVtZW50KTtcblx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXHRcdHRoaXMuX2VsZW1lbnQuaWQgPSBcImVudFwiICsgdGhpc1swXTtcblxuXHRcdHRoaXMuYmluZChcIkNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIXRoaXMuX2NoYW5nZWQpIHtcblx0XHRcdFx0dGhpcy5fY2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdENyYWZ0eS5EcmF3TWFuYWdlci5hZGQodGhpcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVDbGFzcygpIHtcblx0XHRcdHZhciBpID0gMCwgYyA9IHRoaXMuX19jLCBzdHIgPSBcIlwiO1xuXHRcdFx0Zm9yIChpIGluIGMpIHtcblx0XHRcdFx0c3RyICs9ICcgJyArIGk7XG5cdFx0XHR9XG5cdFx0XHRzdHIgPSBzdHIuc3Vic3RyKDEpO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSBzdHI7XG5cdFx0fVxuXG5cdFx0dGhpcy5iaW5kKFwiTmV3Q29tcG9uZW50XCIsIHVwZGF0ZUNsYXNzKS5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIHVwZGF0ZUNsYXNzKTtcblxuXHRcdGlmIChDcmFmdHkuc3VwcG9ydC5wcmVmaXggPT09IFwibXNcIiAmJiBDcmFmdHkuc3VwcG9ydC52ZXJzaW9uIDwgOSkge1xuXHRcdFx0dGhpcy5fZmlsdGVycyA9IHt9O1xuXG5cdFx0XHR0aGlzLmJpbmQoXCJSb3RhdGVcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIG0gPSBlLm1hdHJpeCxcblx0XHRcdFx0XHRlbGVtID0gdGhpcy5fZWxlbWVudC5zdHlsZSxcblx0XHRcdFx0XHRNMTEgPSBtLk0xMS50b0ZpeGVkKDgpLFxuXHRcdFx0XHRcdE0xMiA9IG0uTTEyLnRvRml4ZWQoOCksXG5cdFx0XHRcdFx0TTIxID0gbS5NMjEudG9GaXhlZCg4KSxcblx0XHRcdFx0XHRNMjIgPSBtLk0yMi50b0ZpeGVkKDgpO1xuXG5cdFx0XHRcdHRoaXMuX2ZpbHRlcnMucm90YXRpb24gPSBcInByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5NYXRyaXgoTTExPVwiICsgTTExICsgXCIsIE0xMj1cIiArIE0xMiArIFwiLCBNMjE9XCIgKyBNMjEgKyBcIiwgTTIyPVwiICsgTTIyICsgXCIsc2l6aW5nTWV0aG9kPSdhdXRvIGV4cGFuZCcpXCI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLmJpbmQoXCJSZW1vdmVcIiwgdGhpcy51bmRyYXcpO1xuXHRcdHRoaXMuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCBmdW5jdGlvbiAoY29tcE5hbWUpIHtcblx0XHRcdGlmIChjb21wTmFtZSA9PT0gXCJET01cIilcblx0XHRcdFx0dGhpcy51bmRyYXcoKTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5nZXREb21JZFxuXHQqIEBjb21wIERPTVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5nZXRJZCgpXG5cdCogXG5cdCogR2V0IHRoZSBJZCBvZiB0aGUgRE9NIGVsZW1lbnQgdXNlZCB0byByZXByZXNlbnQgdGhlIGVudGl0eS5cblx0Ki9cblx0Z2V0RG9tSWQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9lbGVtZW50LmlkO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLkRPTVxuXHQqIEBjb21wIERPTVxuXHQqIEB0cmlnZ2VyIERyYXcgLSB3aGVuIHRoZSBlbnRpdHkgaXMgcmVhZHkgdG8gYmUgZHJhd24gdG8gdGhlIHN0YWdlIC0geyBzdHlsZTpTdHJpbmcsIHR5cGU6XCJET01cIiwgY299XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLkRPTShIVE1MRWxlbWVudCBlbGVtKVxuXHQqIEBwYXJhbSBlbGVtIC0gSFRNTCBlbGVtZW50IHRoYXQgd2lsbCByZXBsYWNlIHRoZSBkeW5hbWljYWxseSBjcmVhdGVkIG9uZVxuXHQqIFxuXHQqIFBhc3MgYSBET00gZWxlbWVudCB0byB1c2UgcmF0aGVyIHRoYW4gb25lIGNyZWF0ZWQuIFdpbGwgc2V0IGAuX2VsZW1lbnRgIHRvIHRoaXMgdmFsdWUuIFJlbW92ZXMgdGhlIG9sZCBlbGVtZW50LlxuXHQqL1xuXHRET006IGZ1bmN0aW9uIChlbGVtKSB7XG5cdFx0aWYgKGVsZW0gJiYgZWxlbS5ub2RlVHlwZSkge1xuXHRcdFx0dGhpcy51bmRyYXcoKTtcblx0XHRcdHRoaXMuX2VsZW1lbnQgPSBlbGVtO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmRyYXdcblx0KiBAY29tcCBET01cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZHJhdyh2b2lkKVxuXHQqIFxuXHQqIFVwZGF0ZXMgdGhlIENTUyBwcm9wZXJ0aWVzIG9mIHRoZSBub2RlIHRvIGRyYXcgb24gdGhlIHN0YWdlLlxuXHQqL1xuXHRkcmF3OiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHN0eWxlID0gdGhpcy5fZWxlbWVudC5zdHlsZSxcblx0XHRcdGNvb3JkID0gdGhpcy5fX2Nvb3JkIHx8IFswLCAwLCAwLCAwXSxcblx0XHRcdGNvID0geyB4OiBjb29yZFswXSwgeTogY29vcmRbMV0gfSxcblx0XHRcdHByZWZpeCA9IENyYWZ0eS5zdXBwb3J0LnByZWZpeCxcblx0XHRcdHRyYW5zID0gW107XG5cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLnZpc2liaWxpdHkgIT0gdGhpcy5fdmlzaWJsZSkge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLnZpc2liaWxpdHkgPSB0aGlzLl92aXNpYmxlO1xuXHRcdFx0aWYgKCF0aGlzLl92aXNpYmxlKSB7XG5cdFx0XHRcdHN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vdXRpbGl6ZSBDU1MzIGlmIHN1cHBvcnRlZFxuXHRcdGlmIChDcmFmdHkuc3VwcG9ydC5jc3MzZHRyYW5zZm9ybSkge1xuXHRcdFx0dHJhbnMucHVzaChcInRyYW5zbGF0ZTNkKFwiICsgKH5+dGhpcy5feCkgKyBcInB4LFwiICsgKH5+dGhpcy5feSkgKyBcInB4LDApXCIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLmxlZnQgIT0gdGhpcy5feCkge1xuXHRcdFx0XHR0aGlzLl9jc3NTdHlsZXMubGVmdCA9IHRoaXMuX3g7XG5cdFx0XHRcdHN0eWxlLmxlZnQgPSB+fih0aGlzLl94KSArIFwicHhcIjtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9jc3NTdHlsZXMudG9wICE9IHRoaXMuX3kpIHtcblx0XHRcdFx0dGhpcy5fY3NzU3R5bGVzLnRvcCA9IHRoaXMuX3k7XG5cdFx0XHRcdHN0eWxlLnRvcCA9IH5+KHRoaXMuX3kpICsgXCJweFwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMud2lkdGggIT0gdGhpcy5fdykge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLndpZHRoID0gdGhpcy5fdztcblx0XHRcdHN0eWxlLndpZHRoID0gfn4odGhpcy5fdykgKyBcInB4XCI7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMuaGVpZ2h0ICE9IHRoaXMuX2gpIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy5oZWlnaHQgPSB0aGlzLl9oO1xuXHRcdFx0c3R5bGUuaGVpZ2h0ID0gfn4odGhpcy5faCkgKyBcInB4XCI7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMuekluZGV4ICE9IHRoaXMuX3opIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy56SW5kZXggPSB0aGlzLl96O1xuXHRcdFx0c3R5bGUuekluZGV4ID0gdGhpcy5fejtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLm9wYWNpdHkgIT0gdGhpcy5fYWxwaGEpIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy5vcGFjaXR5ID0gdGhpcy5fYWxwaGE7XG5cdFx0XHRzdHlsZS5vcGFjaXR5ID0gdGhpcy5fYWxwaGE7XG5cdFx0XHRzdHlsZVtwcmVmaXggKyBcIk9wYWNpdHlcIl0gPSB0aGlzLl9hbHBoYTtcblx0XHR9XG5cblx0XHQvL2lmIG5vdCB2ZXJzaW9uIDkgb2YgSUVcblx0XHRpZiAocHJlZml4ID09PSBcIm1zXCIgJiYgQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA8IDkpIHtcblx0XHRcdC8vZm9yIElFIHZlcnNpb24gOCwgdXNlIEltYWdlVHJhbnNmb3JtIGZpbHRlclxuXHRcdFx0aWYgKENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPT09IDgpIHtcblx0XHRcdFx0dGhpcy5fZmlsdGVycy5hbHBoYSA9IFwicHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0LkFscGhhKE9wYWNpdHk9XCIgKyAodGhpcy5fYWxwaGEgKiAxMDApICsgXCIpXCI7IC8vIGZpcnN0IVxuXHRcdFx0XHQvL2FsbCBvdGhlciB2ZXJzaW9ucyB1c2UgZmlsdGVyXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9maWx0ZXJzLmFscGhhID0gXCJhbHBoYShvcGFjaXR5PVwiICsgKHRoaXMuX2FscGhhICogMTAwKSArIFwiKVwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9tYnIpIHtcblx0XHRcdHZhciBvcmlnaW4gPSB0aGlzLl9vcmlnaW4ueCArIFwicHggXCIgKyB0aGlzLl9vcmlnaW4ueSArIFwicHhcIjtcblx0XHRcdHN0eWxlLnRyYW5zZm9ybU9yaWdpbiA9IG9yaWdpbjtcblx0XHRcdHN0eWxlW3ByZWZpeCArIFwiVHJhbnNmb3JtT3JpZ2luXCJdID0gb3JpZ2luO1xuXHRcdFx0aWYgKENyYWZ0eS5zdXBwb3J0LmNzczNkdHJhbnNmb3JtKSB0cmFucy5wdXNoKFwicm90YXRlWihcIiArIHRoaXMuX3JvdGF0aW9uICsgXCJkZWcpXCIpO1xuXHRcdFx0ZWxzZSB0cmFucy5wdXNoKFwicm90YXRlKFwiICsgdGhpcy5fcm90YXRpb24gKyBcImRlZylcIik7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2ZsaXBYKSB7XG5cdFx0XHR0cmFucy5wdXNoKFwic2NhbGVYKC0xKVwiKTtcblx0XHRcdGlmIChwcmVmaXggPT09IFwibXNcIiAmJiBDcmFmdHkuc3VwcG9ydC52ZXJzaW9uIDwgOSkge1xuXHRcdFx0XHR0aGlzLl9maWx0ZXJzLmZsaXBYID0gXCJmbGlwaFwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9mbGlwWSkge1xuXHRcdFx0dHJhbnMucHVzaChcInNjYWxlWSgtMSlcIik7XG5cdFx0XHRpZiAocHJlZml4ID09PSBcIm1zXCIgJiYgQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA8IDkpIHtcblx0XHRcdFx0dGhpcy5fZmlsdGVycy5mbGlwWSA9IFwiZmxpcHZcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL2FwcGx5IHRoZSBmaWx0ZXJzIGlmIElFXG5cdFx0aWYgKHByZWZpeCA9PT0gXCJtc1wiICYmIENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPCA5KSB7XG5cdFx0XHR0aGlzLmFwcGx5RmlsdGVycygpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMudHJhbnNmb3JtICE9IHRyYW5zLmpvaW4oXCIgXCIpKSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMudHJhbnNmb3JtID0gdHJhbnMuam9pbihcIiBcIik7XG5cdFx0XHRzdHlsZS50cmFuc2Zvcm0gPSB0aGlzLl9jc3NTdHlsZXMudHJhbnNmb3JtO1xuXHRcdFx0c3R5bGVbcHJlZml4ICsgXCJUcmFuc2Zvcm1cIl0gPSB0aGlzLl9jc3NTdHlsZXMudHJhbnNmb3JtO1xuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcihcIkRyYXdcIiwgeyBzdHlsZTogc3R5bGUsIHR5cGU6IFwiRE9NXCIsIGNvOiBjbyB9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGFwcGx5RmlsdGVyczogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUuZmlsdGVyID0gXCJcIjtcblx0XHR2YXIgc3RyID0gXCJcIjtcblxuXHRcdGZvciAodmFyIGZpbHRlciBpbiB0aGlzLl9maWx0ZXJzKSB7XG5cdFx0XHRpZiAoIXRoaXMuX2ZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkgY29udGludWU7XG5cdFx0XHRzdHIgKz0gdGhpcy5fZmlsdGVyc1tmaWx0ZXJdICsgXCIgXCI7XG5cdFx0fVxuXG5cdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5maWx0ZXIgPSBzdHI7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMudW5kcmF3XG5cdCogQGNvbXAgRE9NXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnVuZHJhdyh2b2lkKVxuXHQqIFxuXHQqIFJlbW92ZXMgdGhlIGVsZW1lbnQgZnJvbSB0aGUgc3RhZ2UuXG5cdCovXG5cdHVuZHJhdzogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9lbGVtZW50KSB7XG5cdFx0XHRDcmFmdHkuc3RhZ2UuaW5uZXIucmVtb3ZlQ2hpbGQodGhpcy5fZWxlbWVudCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmNzc1xuXHQqIEBjb21wIERPTVxuXHQqIEBzaWduIHB1YmxpYyAqIGNzcyhTdHJpbmcgcHJvcGVydHksIFN0cmluZyB2YWx1ZSlcblx0KiBAcGFyYW0gcHJvcGVydHkgLSBDU1MgcHJvcGVydHkgdG8gbW9kaWZ5XG5cdCogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gZ2l2ZSB0aGUgQ1NTIHByb3BlcnR5XG5cdCogQHNpZ24gcHVibGljICogY3NzKE9iamVjdCBtYXApXG5cdCogQHBhcmFtIG1hcCAtIE9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHRoZSBDU1MgcHJvcGVydHkgYW5kIHRoZSB2YWx1ZSBpcyBDU1MgdmFsdWVcblx0KiBcblx0KiBBcHBseSBDU1Mgc3R5bGVzIHRvIHRoZSBlbGVtZW50LlxuXHQqXG5cdCogQ2FuIHBhc3MgYW4gb2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIHN0eWxlIHByb3BlcnR5IGFuZCB0aGUgdmFsdWUgaXMgc3R5bGUgdmFsdWUuXG5cdCpcblx0KiBGb3Igc2V0dGluZyBvbmUgc3R5bGUsIHNpbXBseSBwYXNzIHRoZSBzdHlsZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kIHRoZSB2YWx1ZSBhcyB0aGUgc2Vjb25kLlxuXHQqXG5cdCogVGhlIG5vdGF0aW9uIGNhbiBiZSBDU1Mgb3IgSlMgKGUuZy4gYHRleHQtYWxpZ25gIG9yIGB0ZXh0QWxpZ25gKS5cblx0KlxuXHQqIFRvIHJldHVybiBhIHZhbHVlLCBwYXNzIHRoZSBwcm9wZXJ0eS5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMuY3NzKHsndGV4dC1hbGlnbicsICdjZW50ZXInLCBmb250OiAnQXJpYWwnfSk7XG5cdCogdGhpcy5jc3MoXCJ0ZXh0QWxpZ25cIiwgXCJjZW50ZXJcIik7XG5cdCogdGhpcy5jc3MoXCJ0ZXh0LWFsaWduXCIpOyAvL3JldHVybnMgY2VudGVyXG5cdCogfn5+XG5cdCovXG5cdGNzczogZnVuY3Rpb24gKG9iaiwgdmFsdWUpIHtcblx0XHR2YXIga2V5LFxuXHRcdFx0ZWxlbSA9IHRoaXMuX2VsZW1lbnQsXG5cdFx0XHR2YWwsXG5cdFx0XHRzdHlsZSA9IGVsZW0uc3R5bGU7XG5cblx0XHQvL2lmIGFuIG9iamVjdCBwYXNzZWRcblx0XHRpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0Zm9yIChrZXkgaW4gb2JqKSB7XG5cdFx0XHRcdGlmICghb2JqLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXHRcdFx0XHR2YWwgPSBvYmpba2V5XTtcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIpIHZhbCArPSAncHgnO1xuXG5cdFx0XHRcdHN0eWxlW0NyYWZ0eS5ET00uY2FtZWxpemUoa2V5KV0gPSB2YWw7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vaWYgYSB2YWx1ZSBpcyBwYXNzZWQsIHNldCB0aGUgcHJvcGVydHlcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSB2YWx1ZSArPSAncHgnO1xuXHRcdFx0XHRzdHlsZVtDcmFmdHkuRE9NLmNhbWVsaXplKG9iaildID0gdmFsdWU7XG5cdFx0XHR9IGVsc2UgeyAvL290aGVyd2lzZSByZXR1cm4gdGhlIGNvbXB1dGVkIHByb3BlcnR5XG5cdFx0XHRcdHJldHVybiBDcmFmdHkuRE9NLmdldFN0eWxlKGVsZW0sIG9iaik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipcbiogRml4IElFNiBiYWNrZ3JvdW5kIGZsaWNrZXJpbmdcbiovXG50cnkge1xuXHRkb2N1bWVudC5leGVjQ29tbWFuZChcIkJhY2tncm91bmRJbWFnZUNhY2hlXCIsIGZhbHNlLCB0cnVlKTtcbn0gY2F0Y2ggKGUpIHsgfVxuXG5DcmFmdHkuZXh0ZW5kKHtcbiAgICAvKipAXG5cdCogI0NyYWZ0eS5ET01cblx0KiBAY2F0ZWdvcnkgR3JhcGhpY3Ncblx0KiBcblx0KiBDb2xsZWN0aW9uIG9mIHV0aWxpdGllcyBmb3IgdXNpbmcgdGhlIERPTS5cblx0Ki9cblx0RE9NOiB7XG5cdC8qKkBcblx0XHQqICNDcmFmdHkuRE9NLndpbmRvd1xuXHRcdCogQGNvbXAgQ3JhZnR5LkRPTVxuXHRcdCogXG5cdFx0KiBPYmplY3Qgd2l0aCBgd2lkdGhgIGFuZCBgaGVpZ2h0YCB2YWx1ZXMgcmVwcmVzZW50aW5nIHRoZSB3aWR0aFxuXHRcdCogYW5kIGhlaWdodCBvZiB0aGUgYHdpbmRvd2AuXG5cdFx0Ki9cblx0XHR3aW5kb3c6IHtcblx0XHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dGhpcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoIHx8ICh3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIHx8IHdpbmRvdy5kb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKTtcblx0XHRcdFx0dGhpcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgKHdpbmRvdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IHx8IHdpbmRvdy5kb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCk7XG5cdFx0XHR9LFxuXG5cdFx0XHR3aWR0aDogMCxcblx0XHRcdGhlaWdodDogMFxuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRPTS5pbm5lclxuXHRcdCogQGNvbXAgQ3JhZnR5LkRPTVxuXHRcdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkuRE9NLmlubmVyKEhUTUxFbGVtZW50IG9iailcblx0XHQqIEBwYXJhbSBvYmogLSBIVE1MIGVsZW1lbnQgdG8gY2FsY3VsYXRlIHRoZSBwb3NpdGlvblxuXHRcdCogQHJldHVybnMgT2JqZWN0IHdpdGggYHhgIGtleSBiZWluZyB0aGUgYHhgIHBvc2l0aW9uLCBgeWAgYmVpbmcgdGhlIGB5YCBwb3NpdGlvblxuXHRcdCogXG5cdFx0KiBGaW5kIGEgRE9NIGVsZW1lbnRzIHBvc2l0aW9uIGluY2x1ZGluZ1xuXHRcdCogcGFkZGluZyBhbmQgYm9yZGVyLlxuXHRcdCovXG5cdFx0aW5uZXI6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRcdHZhciByZWN0ID0gb2JqLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuXHRcdFx0XHR4ID0gcmVjdC5sZWZ0ICsgKHdpbmRvdy5wYWdlWE9mZnNldCA/IHdpbmRvdy5wYWdlWE9mZnNldCA6IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCksXG5cdFx0XHRcdHkgPSByZWN0LnRvcCArICh3aW5kb3cucGFnZVlPZmZzZXQgPyB3aW5kb3cucGFnZVlPZmZzZXQgOiBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCksXG5cblx0XHRcdC8vYm9yZGVyIGxlZnRcblx0XHRcdFx0Ym9yZGVyWCA9IHBhcnNlSW50KHRoaXMuZ2V0U3R5bGUob2JqLCAnYm9yZGVyLWxlZnQtd2lkdGgnKSB8fCAwLCAxMCkgfHwgcGFyc2VJbnQodGhpcy5nZXRTdHlsZShvYmosICdib3JkZXJMZWZ0V2lkdGgnKSB8fCAwLCAxMCkgfHwgMCxcblx0XHRcdFx0Ym9yZGVyWSA9IHBhcnNlSW50KHRoaXMuZ2V0U3R5bGUob2JqLCAnYm9yZGVyLXRvcC13aWR0aCcpIHx8IDAsIDEwKSB8fCBwYXJzZUludCh0aGlzLmdldFN0eWxlKG9iaiwgJ2JvcmRlclRvcFdpZHRoJykgfHwgMCwgMTApIHx8IDA7XG5cblx0XHRcdHggKz0gYm9yZGVyWDtcblx0XHRcdHkgKz0gYm9yZGVyWTtcblxuXHRcdFx0cmV0dXJuIHsgeDogeCwgeTogeSB9O1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRPTS5nZXRTdHlsZVxuXHRcdCogQGNvbXAgQ3JhZnR5LkRPTVxuXHRcdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkuRE9NLmdldFN0eWxlKEhUTUxFbGVtZW50IG9iaiwgU3RyaW5nIHByb3BlcnR5KVxuXHRcdCogQHBhcmFtIG9iaiAtIEhUTUwgZWxlbWVudCB0byBmaW5kIHRoZSBzdHlsZVxuXHRcdCogQHBhcmFtIHByb3BlcnR5IC0gU3R5bGUgdG8gcmV0dXJuXG5cdFx0KiBcblx0XHQqIERldGVybWluZSB0aGUgdmFsdWUgb2YgYSBzdHlsZSBvbiBhbiBIVE1MIGVsZW1lbnQuIE5vdGF0aW9uIGNhbiBiZVxuXHRcdCogaW4gZWl0aGVyIENTUyBvciBKUy5cblx0XHQqL1xuXHRcdGdldFN0eWxlOiBmdW5jdGlvbiAob2JqLCBwcm9wKSB7XG5cdFx0XHR2YXIgcmVzdWx0O1xuXHRcdFx0aWYgKG9iai5jdXJyZW50U3R5bGUpXG5cdFx0XHRcdHJlc3VsdCA9IG9iai5jdXJyZW50U3R5bGVbdGhpcy5jYW1lbGl6ZShwcm9wKV07XG5cdFx0XHRlbHNlIGlmICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSlcblx0XHRcdFx0cmVzdWx0ID0gZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShvYmosIG51bGwpLmdldFByb3BlcnR5VmFsdWUodGhpcy5jc3NlbGl6ZShwcm9wKSk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQqIFVzZWQgaW4gdGhlIFplcHRvIGZyYW1ld29ya1xuXHRcdCpcblx0XHQqIENvbnZlcnRzIENTUyBub3RhdGlvbiB0byBKUyBub3RhdGlvblxuXHRcdCovXG5cdFx0Y2FtZWxpemU6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvLSsoLik/L2csIGZ1bmN0aW9uIChtYXRjaCwgY2hyKXsgcmV0dXJuIGNociA/IGNoci50b1VwcGVyQ2FzZSgpIDogJycgfSk7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCogQ29udmVydHMgSlMgbm90YXRpb24gdG8gQ1NTIG5vdGF0aW9uXG5cdFx0Ki9cblx0XHRjc3NlbGl6ZTogZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9bQS1aXS9nLCBmdW5jdGlvbiAoY2hyKXsgcmV0dXJuIGNociA/ICctJyArIGNoci50b0xvd2VyQ2FzZSgpIDogJycgfSk7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRE9NLnRyYW5zbGF0ZVxuXHRcdCogQGNvbXAgQ3JhZnR5LkRPTVxuXHRcdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkuRE9NLnRyYW5zbGF0ZShOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdFx0KiBAcGFyYW0geCAtIHggcG9zaXRpb24gdG8gdHJhbnNsYXRlXG5cdFx0KiBAcGFyYW0geSAtIHkgcG9zaXRpb24gdG8gdHJhbnNsYXRlXG5cdFx0KiBAcmV0dXJuIE9iamVjdCB3aXRoIHggYW5kIHkgYXMga2V5cyBhbmQgdHJhbnNsYXRlZCB2YWx1ZXNcblx0XHQqXG5cdFx0KiBNZXRob2Qgd2lsbCB0cmFuc2xhdGUgeCBhbmQgeSBwb3NpdGlvbnMgdG8gcG9zaXRpb25zIG9uIHRoZVxuXHRcdCogc3RhZ2UuIFVzZWZ1bCBmb3IgbW91c2UgZXZlbnRzIHdpdGggYGUuY2xpZW50WGAgYW5kIGBlLmNsaWVudFlgLlxuXHRcdCovXG5cdFx0dHJhbnNsYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogKHggLSBDcmFmdHkuc3RhZ2UueCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IC0gQ3JhZnR5LnZpZXdwb3J0Ll94KS9DcmFmdHkudmlld3BvcnQuX3pvb20sXG5cdFx0XHRcdHk6ICh5IC0gQ3JhZnR5LnN0YWdlLnkgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgLSBDcmFmdHkudmlld3BvcnQuX3kpL0NyYWZ0eS52aWV3cG9ydC5fem9vbVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8qKkBcbiogI0hUTUxcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIENvbXBvbmVudCBhbGxvdyBmb3IgaW5zZXJ0aW9uIG9mIGFyYml0cmFyeSBIVE1MIGludG8gYW4gZW50aXR5XG4qL1xuQ3JhZnR5LmMoXCJIVE1MXCIsIHtcblx0aW5uZXI6ICcnLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKCcyRCwgRE9NJyk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMucmVwbGFjZVxuXHQqIEBjb21wIEhUTUxcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAucmVwbGFjZShTdHJpbmcgaHRtbClcblx0KiBAcGFyYW0gaHRtbCAtIGFyYml0cmFyeSBodG1sXG5cdCogXG5cdCogVGhpcyBtZXRob2Qgd2lsbCByZXBsYWNlIHRoZSBjb250ZW50IG9mIHRoaXMgZW50aXR5IHdpdGggdGhlIHN1cHBsaWVkIGh0bWxcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogQ3JlYXRlIGEgbGlua1xuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiSFRNTFwiKVxuXHQqICAgIC5hdHRyKHt4OjIwLCB5OjIwLCB3OjEwMCwgaDoxMDB9KVxuICAgICogICAgLnJlcGxhY2UoXCI8YSBocmVmPSdodHRwOi8vd3d3LmNyYWZ0eWpzLmNvbSc+Q3JhZnR5LmpzPC9hPlwiKTtcblx0KiB+fn5cblx0Ki9cblx0cmVwbGFjZTogZnVuY3Rpb24gKG5ld19odG1sKSB7XG5cdFx0dGhpcy5pbm5lciA9IG5ld19odG1sO1xuXHRcdHRoaXMuX2VsZW1lbnQuaW5uZXJIVE1MID0gbmV3X2h0bWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYXBwZW5kXG5cdCogQGNvbXAgSFRNTFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hcHBlbmQoU3RyaW5nIGh0bWwpXG5cdCogQHBhcmFtIGh0bWwgLSBhcmJpdHJhcnkgaHRtbFxuXHQqIFxuXHQqIFRoaXMgbWV0aG9kIHdpbGwgYWRkIHRoZSBzdXBwbGllZCBodG1sIGluIHRoZSBlbmQgb2YgdGhlIGVudGl0eVxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBDcmVhdGUgYSBsaW5rXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCJIVE1MXCIpXG5cdCogICAgLmF0dHIoe3g6MjAsIHk6MjAsIHc6MTAwLCBoOjEwMH0pXG4gICAgKiAgICAuYXBwZW5kKFwiPGEgaHJlZj0naHR0cDovL3d3dy5jcmFmdHlqcy5jb20nPkNyYWZ0eS5qczwvYT5cIik7XG5cdCogfn5+XG5cdCovXG5cdGFwcGVuZDogZnVuY3Rpb24gKG5ld19odG1sKSB7XG5cdFx0dGhpcy5pbm5lciArPSBuZXdfaHRtbDtcblx0XHR0aGlzLl9lbGVtZW50LmlubmVySFRNTCArPSBuZXdfaHRtbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5wcmVwZW5kXG5cdCogQGNvbXAgSFRNTFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5wcmVwZW5kKFN0cmluZyBodG1sKVxuXHQqIEBwYXJhbSBodG1sIC0gYXJiaXRyYXJ5IGh0bWxcblx0KiBcblx0KiBUaGlzIG1ldGhvZCB3aWxsIGFkZCB0aGUgc3VwcGxpZWQgaHRtbCBpbiB0aGUgYmVnaW5uaW5nIG9mIHRoZSBlbnRpdHlcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogQ3JlYXRlIGEgbGlua1xuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiSFRNTFwiKVxuXHQqICAgIC5hdHRyKHt4OjIwLCB5OjIwLCB3OjEwMCwgaDoxMDB9KVxuICAgICogICAgLnByZXBlbmQoXCI8YSBocmVmPSdodHRwOi8vd3d3LmNyYWZ0eWpzLmNvbSc+Q3JhZnR5LmpzPC9hPlwiKTtcblx0KiB+fn5cblx0Ki9cblx0cHJlcGVuZDogZnVuY3Rpb24gKG5ld19odG1sKSB7XG5cdFx0dGhpcy5pbm5lciA9IG5ld19odG1sICsgdGhpcy5pbm5lcjtcblx0XHR0aGlzLl9lbGVtZW50LmlubmVySFRNTCA9IG5ld19odG1sICsgdGhpcy5pbm5lcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG4vKipAXG4gKiAjU3RvcmFnZVxuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogVXRpbGl0eSB0byBhbGxvdyBkYXRhIHRvIGJlIHNhdmVkIHRvIGEgcGVybWFuZW50IHN0b3JhZ2Ugc29sdXRpb246IEluZGV4ZWREQiwgV2ViU3FsLCBsb2NhbHN0b3JhZ2Ugb3IgY29va2llc1xuICovXG4gICAgLyoqQFxuXHQgKiAjLm9wZW5cblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAc2lnbiAub3BlbihTdHJpbmcgZ2FtZU5hbWUpXG5cdCAqIEBwYXJhbSBnYW1lTmFtZSAtIGEgbWFjaGluZSByZWFkYWJsZSBzdHJpbmcgdG8gdW5pcXVlbHkgaWRlbnRpZnkgeW91ciBnYW1lXG5cdCAqIFxuXHQgKiBPcGVucyBhIGNvbm5lY3Rpb24gdG8gdGhlIGRhdGFiYXNlLiBJZiB0aGUgYmVzdCB0aGV5IGhhdmUgaXMgbG9jYWxzdG9yYWdlIG9yIGxvd2VyLCBpdCBkb2VzIG5vdGhpbmdcblx0ICpcblx0ICogQGV4YW1wbGVcblx0ICogT3BlbiBhIGRhdGFiYXNlXG5cdCAqIH5+flxuXHQgKiBDcmFmdHkuc3RvcmFnZS5vcGVuKCdNeUdhbWUnKTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjLnNhdmVcblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAc2lnbiAuc2F2ZShTdHJpbmcga2V5LCBTdHJpbmcgdHlwZSwgTWl4ZWQgZGF0YSlcblx0ICogQHBhcmFtIGtleSAtIEEgdW5pcXVlIGtleSBmb3IgaWRlbnRpZnlpbmcgdGhpcyBwaWVjZSBvZiBkYXRhXG5cdCAqIEBwYXJhbSB0eXBlIC0gJ3NhdmUnIG9yICdjYWNoZSdcblx0ICogQHBhcmFtIGRhdGEgLSBTb21lIGtpbmQgb2YgZGF0YS5cblx0ICogXG5cdCAqIFNhdmVzIGEgcGllY2Ugb2YgZGF0YSB0byB0aGUgZGF0YWJhc2UuIENhbiBiZSBhbnl0aGluZywgYWx0aG91Z2ggZW50aXRpZXMgYXJlIHByZWZlcnJlZC5cblx0ICogRm9yIGFsbCBzdG9yYWdlIG1ldGhvZHMgYnV0IEluZGV4ZWREQiwgdGhlIGRhdGEgd2lsbCBiZSBzZXJpYWxpemVkIGFzIGEgc3RyaW5nXG5cdCAqIER1cmluZyBzZXJpYWxpemF0aW9uLCBhbiBlbnRpdHkncyBTYXZlRGF0YSBldmVudCB3aWxsIGJlIHRyaWdnZXJlZC5cblx0ICogQ29tcG9uZW50cyBzaG91bGQgaW1wbGVtZW50IGEgU2F2ZURhdGEgaGFuZGxlciBhbmQgYXR0YWNoIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gdGhlIHBhc3NlZCBvYmplY3Rcblx0ICpcblx0ICogQGV4YW1wbGVcblx0ICogU2F2ZXMgYW4gZW50aXR5IHRvIHRoZSBkYXRhYmFzZVxuXHQgKiB+fn5cblx0ICogdmFyIGVudCA9IENyYWZ0eS5lKFwiMkQsIERPTVwiKVxuXHQgKiAgICAgICAgICAgICAgICAgICAgIC5hdHRyKHt4OiAyMCwgeTogMjAsIHc6IDEwMCwgaDoxMDB9KTtcblx0ICogQ3JhZnR5LnN0b3JhZ2Uub3BlbignTXlHYW1lJyk7XG5cdCAqIENyYWZ0eS5zdG9yYWdlLnNhdmUoJ015RW50aXR5JywgJ3NhdmUnLCBlbnQpO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICMubG9hZFxuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBzaWduIC5sb2FkKFN0cmluZyBrZXksIFN0cmluZyB0eXBlKVxuXHQgKiBAcGFyYW0ga2V5IC0gQSB1bmlxdWUga2V5IHRvIHNlYXJjaCBmb3Jcblx0ICogQHBhcmFtIHR5cGUgLSAnc2F2ZScgb3IgJ2NhY2hlJ1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBEbyB0aGluZ3Mgd2l0aCB0aGUgZGF0YSB5b3UgZ2V0IGJhY2tcblx0ICogXG5cdCAqIExvYWRzIGEgcGllY2Ugb2YgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZS5cblx0ICogRW50aXRpZXMgd2lsbCBiZSByZWNvbnN0cnVjdGVkIGZyb20gdGhlIHNlcmlhbGl6ZWQgc3RyaW5nXG5cblx0ICogQGV4YW1wbGVcblx0ICogTG9hZHMgYW4gZW50aXR5IGZyb20gdGhlIGRhdGFiYXNlXG5cdCAqIH5+flxuXHQgKiBDcmFmdHkuc3RvcmFnZS5vcGVuKCdNeUdhbWUnKTtcblx0ICogQ3JhZnR5LnN0b3JhZ2UubG9hZCgnTXlFbnRpdHknLCAnc2F2ZScsIGZ1bmN0aW9uIChkYXRhKSB7IC8vIGRvIHRoaW5ncyB9KTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjLmdldEFsbEtleXNcblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAc2lnbiAuZ2V0QWxsS2V5cyhTdHJpbmcgdHlwZSlcblx0ICogQHBhcmFtIHR5cGUgLSAnc2F2ZScgb3IgJ2NhY2hlJ1xuXHQgKiBHZXRzIGFsbCB0aGUga2V5cyBmb3IgYSBnaXZlbiB0eXBlXG5cblx0ICogQGV4YW1wbGVcblx0ICogR2V0cyBhbGwgdGhlIHNhdmUgZ2FtZXMgc2F2ZWRcblx0ICogfn5+XG5cdCAqIENyYWZ0eS5zdG9yYWdlLm9wZW4oJ015R2FtZScpO1xuXHQgKiB2YXIgc2F2ZXMgPSBDcmFmdHkuc3RvcmFnZS5nZXRBbGxLZXlzKCdzYXZlJyk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogIy5leHRlcm5hbFxuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBzaWduIC5leHRlcm5hbChTdHJpbmcgdXJsKVxuXHQgKiBAcGFyYW0gdXJsIC0gVVJMIHRvIGFuIGV4dGVybmFsIHRvIHNhdmUgZ2FtZXMgdG9vXG5cdCAqIFxuXHQgKiBFbmFibGVzIGFuZCBzZXRzIHRoZSB1cmwgZm9yIHNhdmluZyBnYW1lcyB0byBhbiBleHRlcm5hbCBzZXJ2ZXJcblx0ICogXG5cdCAqIEBleGFtcGxlXG5cdCAqIFNhdmUgYW4gZW50aXR5IHRvIGFuIGV4dGVybmFsIHNlcnZlclxuXHQgKiB+fn5cblx0ICogQ3JhZnR5LnN0b3JhZ2UuZXh0ZXJuYWwoJ2h0dHA6Ly9zb21ld2hlcmUuY29tL3NlcnZlci5waHAnKTtcblx0ICogQ3JhZnR5LnN0b3JhZ2Uub3BlbignTXlHYW1lJyk7XG5cdCAqIHZhciBlbnQgPSBDcmFmdHkuZSgnMkQsIERPTScpXG5cdCAqICAgICAgICAgICAgICAgICAgICAgLmF0dHIoe3g6IDIwLCB5OiAyMCwgdzogMTAwLCBoOjEwMH0pO1xuXHQgKiBDcmFmdHkuc3RvcmFnZS5zYXZlKCdzYXZlMDEnLCAnc2F2ZScsIGVudCk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogI1NhdmVEYXRhIGV2ZW50XG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHBhcmFtIGRhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyBhbGwgb2YgdGhlIGRhdGEgdG8gYmUgc2VyaWFsaXplZFxuXHQgKiBAcGFyYW0gcHJlcGFyZSAtIFRoZSBmdW5jdGlvbiB0byBwcmVwYXJlIGFuIGVudGl0eSBmb3Igc2VyaWFsaXphdGlvblxuXHQgKiBcblx0ICogQW55IGRhdGEgYSBjb21wb25lbnQgd2FudHMgdG8gc2F2ZSB3aGVuIGl0J3Mgc2VyaWFsaXplZCBzaG91bGQgYmUgYWRkZWQgdG8gdGhpcyBvYmplY3QuXG5cdCAqIFN0cmFpZ2h0IGF0dHJpYnV0ZSBzaG91bGQgYmUgc2V0IGluIGRhdGEuYXR0ci5cblx0ICogQW55dGhpbmcgdGhhdCByZXF1aXJlcyBhIHNwZWNpYWwgaGFuZGxlciBzaG91bGQgYmUgc2V0IGluIGEgdW5pcXVlIHByb3BlcnR5LlxuXHQgKlxuXHQgKiBAZXhhbXBsZVxuXHQgKiBTYXZlcyB0aGUgaW5uZXJIVE1MIG9mIGFuIGVudGl0eVxuXHQgKiB+fn5cblx0ICogQ3JhZnR5LmUoXCIyRCBET01cIikuYmluZChcIlNhdmVEYXRhXCIsIGZ1bmN0aW9uIChkYXRhLCBwcmVwYXJlKSB7XG5cdCAqICAgICBkYXRhLmF0dHIueCA9IHRoaXMueDtcblx0ICogICAgIGRhdGEuYXR0ci55ID0gdGhpcy55O1xuXHQgKiAgICAgZGF0YS5kb20gPSB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MO1xuXHQgKiB9KTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjTG9hZERhdGEgZXZlbnRcblx0ICogQHBhcmFtIGRhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGRhdGEgdGhhdCBiZWVuIHNhdmVkXG5cdCAqIEBwYXJhbSBwcm9jZXNzIC0gVGhlIGZ1bmN0aW9uIHRvIHR1cm4gYSBzdHJpbmcgaW50byBhbiBlbnRpdHlcblx0ICogXG5cdCAqIEhhbmRsZXJzIGZvciBwcm9jZXNzaW5nIGFueSBkYXRhIHRoYXQgbmVlZHMgbW9yZSB0aGFuIHN0cmFpZ2h0IGFzc2lnbm1lbnRcblx0ICpcblx0ICogTm90ZSB0aGF0IGRhdGEgc3RvcmVkIGluIHRoZSAuYXR0ciBvYmplY3QgaXMgYXV0b21hdGljYWxseSBhZGRlZCB0byB0aGUgZW50aXR5LlxuXHQgKiBJdCBkb2VzIG5vdCBuZWVkIHRvIGJlIGhhbmRsZWQgaGVyZVxuXHQgKlxuXHQgKiBAZXhhbXBsZVxuXHQgKiB+fn5cblx0ICogU2V0cyB0aGUgaW5uZXJIVE1MIGZyb20gYSBzYXZlZCBlbnRpdHlcblx0ICogQ3JhZnR5LmUoXCIyRCBET01cIikuYmluZChcIkxvYWREYXRhXCIsIGZ1bmN0aW9uIChkYXRhLCBwcm9jZXNzKSB7XG5cdCAqICAgICB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gZGF0YS5kb207XG5cdCAqIH0pO1xuXHQgKiB+fn5cblx0ICovXG5cbkNyYWZ0eS5zdG9yYWdlID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIGRiID0gbnVsbCwgdXJsLCBnYW1lTmFtZSwgdGltZXN0YW1wcyA9IHt9LCBcblx0XHR0cmFuc2FjdGlvblR5cGUgPSB7IFJFQUQ6IFwicmVhZG9ubHlcIiwgUkVBRF9XUklURTogXCJyZWFkd3JpdGVcIiB9O1xuXG5cdC8qXG5cdCAqIFByb2Nlc3NlcyBhIHJldHJpZXZlZCBvYmplY3QuXG5cdCAqIENyZWF0ZXMgYW4gZW50aXR5IGlmIGl0IGlzIG9uZVxuXHQgKi9cblx0ZnVuY3Rpb24gcHJvY2VzcyhvYmopIHtcblx0XHRpZiAob2JqLmMpIHtcblx0XHRcdHZhciBkID0gQ3JhZnR5LmUob2JqLmMpXG5cdFx0XHRcdFx0XHQuYXR0cihvYmouYXR0cilcblx0XHRcdFx0XHRcdC50cmlnZ2VyKCdMb2FkRGF0YScsIG9iaiwgcHJvY2Vzcyk7XG5cdFx0XHRyZXR1cm4gZDtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodHlwZW9mIG9iaiA9PSAnb2JqZWN0Jykge1xuXHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBvYmopIHtcblx0XHRcdFx0b2JqW3Byb3BdID0gcHJvY2VzcyhvYmpbcHJvcF0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb2JqO1xuXHR9XG5cblx0ZnVuY3Rpb24gdW5zZXJpYWxpemUoc3RyKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHIgIT0gJ3N0cmluZycpIHJldHVybiBudWxsO1xuXHRcdHZhciBkYXRhID0gKEpTT04gPyBKU09OLnBhcnNlKHN0cikgOiBldmFsKCcoJyArIHN0ciArICcpJykpO1xuXHRcdHJldHVybiBwcm9jZXNzKGRhdGEpO1xuXHR9XG5cblx0LyogcmVjdXJzaXZlIGZ1bmN0aW9uXG5cdCAqIHNlYXJjaGVzIGZvciBlbnRpdGllcyBpbiBhbiBvYmplY3QgYW5kIHByb2Nlc3NlcyB0aGVtIGZvciBzZXJpYWxpemF0aW9uXG5cdCAqL1xuXHRmdW5jdGlvbiBwcmVwKG9iaikge1xuXHRcdGlmIChvYmouX19jKSB7XG5cdFx0XHQvLyBvYmplY3QgaXMgZW50aXR5XG5cdFx0XHR2YXIgZGF0YSA9IHsgYzogW10sIGF0dHI6IHt9IH07XG5cdFx0XHRvYmoudHJpZ2dlcihcIlNhdmVEYXRhXCIsIGRhdGEsIHByZXApO1xuXHRcdFx0Zm9yICh2YXIgaSBpbiBvYmouX19jKSB7XG5cdFx0XHRcdGRhdGEuYy5wdXNoKGkpO1xuXHRcdFx0fVxuXHRcdFx0ZGF0YS5jID0gZGF0YS5jLmpvaW4oJywgJyk7XG5cdFx0XHRvYmogPSBkYXRhO1xuXHRcdH1cblx0XHRlbHNlIGlmICh0eXBlb2Ygb2JqID09ICdvYmplY3QnKSB7XG5cdFx0XHQvLyByZWN1cnNlIGFuZCBsb29rIGZvciBlbnRpdGllc1xuXHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBvYmopIHtcblx0XHRcdFx0b2JqW3Byb3BdID0gcHJlcChvYmpbcHJvcF0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb2JqO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2VyaWFsaXplKGUpIHtcblx0XHRpZiAoSlNPTikge1xuXHRcdFx0dmFyIGRhdGEgPSBwcmVwKGUpO1xuXHRcdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGFsZXJ0KFwiQ3JhZnR5IGRvZXMgbm90IHN1cHBvcnQgc2F2aW5nIG9uIHlvdXIgYnJvd3Nlci4gUGxlYXNlIHVwZ3JhZGUgdG8gYSBuZXdlciBicm93c2VyLlwiKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHQvLyBmb3Igc2F2aW5nIGEgZ2FtZSB0byBhIGNlbnRyYWwgc2VydmVyXG5cdGZ1bmN0aW9uIGV4dGVybmFsKHNldFVybCkge1xuXHRcdHVybCA9IHNldFVybDtcblx0fVxuXG5cdGZ1bmN0aW9uIG9wZW5FeHRlcm5hbCgpIHtcblx0XHRpZiAoMSAmJiB0eXBlb2YgdXJsID09IFwidW5kZWZpbmVkXCIpIHJldHVybjtcblx0XHQvLyBnZXQgdGhlIHRpbWVzdGFtcHMgZm9yIGV4dGVybmFsIHNhdmVzIGFuZCBjb21wYXJlIHRoZW0gdG8gbG9jYWxcblx0XHQvLyBpZiB0aGUgZXh0ZXJuYWwgaXMgbmV3ZXIsIGxvYWQgaXRcblxuXHRcdHZhciB4bWwgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbihcIlBPU1RcIiwgdXJsKTtcblx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2dCkge1xuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG5cdFx0XHRcdFx0dmFyIGRhdGEgPSBldmFsKFwiKFwiICsgeGhyLnJlc3BvbnNlVGV4dCArIFwiKVwiKTtcblx0XHRcdFx0XHRmb3IgKHZhciBpIGluIGRhdGEpIHtcblx0XHRcdFx0XHRcdGlmIChDcmFmdHkuc3RvcmFnZS5jaGVjayhkYXRhW2ldLmtleSwgZGF0YVtpXS50aW1lc3RhbXApKSB7XG5cdFx0XHRcdFx0XHRcdGxvYWRFeHRlcm5hbChkYXRhW2ldLmtleSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHhoci5zZW5kKFwibW9kZT10aW1lc3RhbXBzJmdhbWU9XCIgKyBnYW1lTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlRXh0ZXJuYWwoa2V5LCBkYXRhLCB0cykge1xuXHRcdGlmICgxICYmIHR5cGVvZiB1cmwgPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbihcIlBPU1RcIiwgdXJsKTtcblx0XHR4aHIuc2VuZChcIm1vZGU9c2F2ZSZrZXk9XCIgKyBrZXkgKyBcIiZkYXRhPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGEpICsgXCImdHM9XCIgKyB0cyArIFwiJmdhbWU9XCIgKyBnYW1lTmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBsb2FkRXh0ZXJuYWwoa2V5KSB7XG5cdFx0aWYgKDEgJiYgdHlwZW9mIHVybCA9PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKFwiUE9TVFwiLCB1cmwpO1xuXHRcdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCkge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcblx0XHRcdFx0XHR2YXIgZGF0YSA9IGV2YWwoXCIoXCIgKyB4aHIucmVzcG9uc2VUZXh0ICsgXCIpXCIpO1xuXHRcdFx0XHRcdENyYWZ0eS5zdG9yYWdlLnNhdmUoa2V5LCAnc2F2ZScsIGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHhoci5zZW5kKFwibW9kZT1sb2FkJmtleT1cIiArIGtleSArIFwiJmdhbWU9XCIgKyBnYW1lTmFtZSk7XG5cdH1cblxuXHQvKipcblx0ICogZ2V0IHRpbWVzdGFtcFxuXHQgKi9cblx0ZnVuY3Rpb24gdHMoKSB7XG5cdFx0dmFyIGQgPSBuZXcgRGF0ZSgpO1xuXHRcdHJldHVybiBkLmdldFRpbWUoKTtcblx0fVxuXG5cdC8vIGV2ZXJ5b25lIG5hbWVzIHRoZWlyIG9iamVjdCBkaWZmZXJlbnQuIEZpeCB0aGF0IG5vbnNlbnNlLlxuXHRpZiAodHlwZW9mIGluZGV4ZWREQiAhPSAnb2JqZWN0Jykge1xuXHRcdHdpbmRvdy5pbmRleGVkREIgPSB3aW5kb3cuaW5kZXhlZERCIHx8IHdpbmRvdy5tb3pJbmRleGVkREIgfHwgd2luZG93LndlYmtpdEluZGV4ZWREQiB8fCB3aW5kb3cubXNJbmRleGVkREI7XG5cdFx0d2luZG93LklEQlRyYW5zYWN0aW9uID0gd2luZG93LklEQlRyYW5zYWN0aW9uIHx8IHdpbmRvdy53ZWJraXRJREJUcmFuc2FjdGlvbjtcblx0XHRcblx0XHQvKiBOdW1lcmljIGNvbnN0YW50cyBmb3IgdHJhbnNhY3Rpb24gdHlwZSBhcmUgZGVwcmVjYXRlZFxuXHRcdCAqIEVuc3VyZSB0aGF0IHRoZSBzY3JpcHQgd2lsbCB3b3JrIGNvbnNpc3Rlbmx5IGZvciByZWNlbnQgYW5kIGxlZ2FjeSBicm93c2VyIHZlcnNpb25zXG5cdFx0ICovXG5cdFx0aWYgKHR5cGVvZiBJREJUcmFuc2FjdGlvbiA9PSAnb2JqZWN0Jykge1xuXHRcdFx0dHJhbnNhY3Rpb25UeXBlLlJFQUQgPSBJREJUcmFuc2FjdGlvbi5SRUFEIHx8IElEQlRyYW5zYWN0aW9uLnJlYWRvbmx5IHx8IHRyYW5zYWN0aW9uVHlwZS5SRUFEO1xuXHRcdFx0dHJhbnNhY3Rpb25UeXBlLlJFQURfV1JJVEUgPSBJREJUcmFuc2FjdGlvbi5SRUFEX1dSSVRFIHx8IElEQlRyYW5zYWN0aW9uLnJlYWR3cml0ZSB8fCB0cmFuc2FjdGlvblR5cGUuUkVBRF9XUklURTtcblx0XHR9XG5cdH1cblxuXHRpZiAodHlwZW9mIGluZGV4ZWREQiA9PSAnb2JqZWN0Jykge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW46IGZ1bmN0aW9uIChnYW1lTmFtZV9uKSB7XG5cdFx0XHRcdGdhbWVOYW1lID0gZ2FtZU5hbWVfbjtcblx0XHRcdFx0dmFyIHN0b3JlcyA9IFtdO1xuXG5cdFx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0XHRzdG9yZXMucHVzaCgnc2F2ZScpO1xuXHRcdFx0XHRcdHN0b3Jlcy5wdXNoKCdjYWNoZScpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHN0b3JlcyA9IGFyZ3VtZW50cztcblx0XHRcdFx0XHRzdG9yZXMuc2hpZnQoKTtcblx0XHRcdFx0XHRzdG9yZXMucHVzaCgnc2F2ZScpO1xuXHRcdFx0XHRcdHN0b3Jlcy5wdXNoKCdjYWNoZScpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkYiA9PSBudWxsKSB7XG5cdFx0XHRcdFx0dmFyIHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihnYW1lTmFtZSk7XG5cdFx0XHRcdFx0cmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0ZGIgPSBlLnRhcmdldC5yZXN1bHQ7XG5cdFx0XHRcdFx0XHRjcmVhdGVTdG9yZXMoKTtcblx0XHRcdFx0XHRcdGdldFRpbWVzdGFtcHMoKTtcblx0XHRcdFx0XHRcdG9wZW5FeHRlcm5hbCgpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3JlYXRlU3RvcmVzKCk7XG5cdFx0XHRcdFx0Z2V0VGltZXN0YW1wcygpO1xuXHRcdFx0XHRcdG9wZW5FeHRlcm5hbCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gZ2V0IGFsbCB0aGUgdGltZXN0YW1wcyBmb3IgZXhpc3Rpbmcga2V5c1xuXHRcdFx0XHRmdW5jdGlvbiBnZXRUaW1lc3RhbXBzKCkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHR2YXIgdHJhbnMgPSBkYi50cmFuc2FjdGlvbihbJ3NhdmUnXSwgdHJhbnNhY3Rpb25UeXBlLlJFQUQpLFxuXHRcdFx0XHRcdFx0c3RvcmUgPSB0cmFucy5vYmplY3RTdG9yZSgnc2F2ZScpLFxuXHRcdFx0XHRcdFx0cmVxdWVzdCA9IHN0b3JlLmdldEFsbCgpO1xuXHRcdFx0XHRcdFx0cmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgaSA9IDAsIGEgPSBldmVudC50YXJnZXQucmVzdWx0LCBsID0gYS5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGltZXN0YW1wc1thW2ldLmtleV0gPSBhW2ldLnRpbWVzdGFtcDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBjcmVhdGVTdG9yZXMoKSB7XG5cdFx0XHRcdFx0dmFyIHJlcXVlc3QgPSBkYi5zZXRWZXJzaW9uKFwiMS4wXCIpO1xuXHRcdFx0XHRcdHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3RvcmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBzdCA9IHN0b3Jlc1tpXTtcblx0XHRcdFx0XHRcdFx0aWYgKGRiLm9iamVjdFN0b3JlTmFtZXMuY29udGFpbnMoc3QpKSBjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoc3QsIHsga2V5UGF0aDogXCJrZXlcIiB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChkYiA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IENyYWZ0eS5zdG9yYWdlLnNhdmUoa2V5LCB0eXBlLCBkYXRhKTsgfSwgMSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHN0ciA9IHNlcmlhbGl6ZShkYXRhKSwgdCA9IHRzKCk7XG5cdFx0XHRcdGlmICh0eXBlID09ICdzYXZlJylcdHNhdmVFeHRlcm5hbChrZXksIHN0ciwgdCk7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIHRyYW5zID0gZGIudHJhbnNhY3Rpb24oW3R5cGVdLCB0cmFuc2FjdGlvblR5cGUuUkVBRF9XUklURSksXG5cdFx0XHRcdFx0c3RvcmUgPSB0cmFucy5vYmplY3RTdG9yZSh0eXBlKSxcblx0XHRcdFx0XHRyZXF1ZXN0ID0gc3RvcmUucHV0KHtcblx0XHRcdFx0XHRcdFwiZGF0YVwiOiBzdHIsXG5cdFx0XHRcdFx0XHRcInRpbWVzdGFtcFwiOiB0LFxuXHRcdFx0XHRcdFx0XCJrZXlcIjoga2V5XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRsb2FkOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAoZGIgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBDcmFmdHkuc3RvcmFnZS5sb2FkKGtleSwgdHlwZSwgY2FsbGJhY2spOyB9LCAxKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgdHJhbnMgPSBkYi50cmFuc2FjdGlvbihbdHlwZV0sIHRyYW5zYWN0aW9uVHlwZS5SRUFEKSxcblx0XHRcdFx0XHRzdG9yZSA9IHRyYW5zLm9iamVjdFN0b3JlKHR5cGUpLFxuXHRcdFx0XHRcdHJlcXVlc3QgPSBzdG9yZS5nZXQoa2V5KTtcblx0XHRcdFx0XHRyZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjayh1bnNlcmlhbGl6ZShlLnRhcmdldC5yZXN1bHQuZGF0YSkpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRBbGxLZXlzOiBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKGRiID09IG51bGwpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnN0b3JhZ2UuZ2V0QWxsa2V5cyh0eXBlLCBjYWxsYmFjayk7IH0sIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIHRyYW5zID0gZGIudHJhbnNhY3Rpb24oW3R5cGVdLCB0cmFuc2FjdGlvblR5cGUuUkVBRCksXG5cdFx0XHRcdFx0c3RvcmUgPSB0cmFucy5vYmplY3RTdG9yZSh0eXBlKSxcblx0XHRcdFx0XHRyZXF1ZXN0ID0gc3RvcmUuZ2V0Q3Vyc29yKCksXG5cdFx0XHRcdFx0cmVzID0gW107XG5cdFx0XHRcdFx0cmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0dmFyIGN1cnNvciA9IGUudGFyZ2V0LnJlc3VsdDtcblx0XHRcdFx0XHRcdGlmIChjdXJzb3IpIHtcblx0XHRcdFx0XHRcdFx0cmVzLnB1c2goY3Vyc29yLmtleSk7XG5cdFx0XHRcdFx0XHRcdC8vICdjb250aW51ZScgaXMgYSByZXNlcnZlZCB3b3JkLCBzbyAuY29udGludWUoKSBjYXVzZXMgSUU4IHRvIGNvbXBsZXRlbHkgYmFyayB3aXRoIFwiU0NSSVBUMTAxMDogRXhwZWN0ZWQgaWRlbnRpZmllclwiLlxuXHRcdFx0XHRcdFx0XHRjdXJzb3JbJ2NvbnRpbnVlJ10oKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjYWxsYmFjayhyZXMpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRjaGVjazogZnVuY3Rpb24gKGtleSwgdGltZXN0YW1wKSB7XG5cdFx0XHRcdHJldHVybiAodGltZXN0YW1wc1trZXldID4gdGltZXN0YW1wKTtcblx0XHRcdH0sXG5cblx0XHRcdGV4dGVybmFsOiBleHRlcm5hbFxuXHRcdH07XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIG9wZW5EYXRhYmFzZSA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW46IGZ1bmN0aW9uIChnYW1lTmFtZV9uKSB7XG5cdFx0XHRcdGdhbWVOYW1lID0gZ2FtZU5hbWVfbjtcblx0XHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRcdGRiID0ge1xuXHRcdFx0XHRcdFx0c2F2ZTogb3BlbkRhdGFiYXNlKGdhbWVOYW1lX24gKyAnX3NhdmUnLCAnMS4wJywgJ1NhdmVzIGdhbWVzIGZvciAnICsgZ2FtZU5hbWVfbiwgNSAqIDEwMjQgKiAxMDI0KSxcblx0XHRcdFx0XHRcdGNhY2hlOiBvcGVuRGF0YWJhc2UoZ2FtZU5hbWVfbiArICdfY2FjaGUnLCAnMS4wJywgJ0NhY2hlIGZvciAnICsgZ2FtZU5hbWVfbiwgNSAqIDEwMjQgKiAxMDI0KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHQvLyBhbGxvd3MgZm9yIGFueSBvdGhlciB0eXBlcyB0aGF0IGNhbiBiZSB0aG91Z2h0IG9mXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBhcmd1bWVudHMsIGkgPSAwO1xuXHRcdFx0XHRcdGFyZ3Muc2hpZnQoKTtcblx0XHRcdFx0XHRmb3IgKDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZGJbYXJnc1tpXV0gPT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHRcdFx0XHRcdGRiW2FyZ3NbaV1dID0gb3BlbkRhdGFiYXNlKGdhbWVOYW1lICsgJ18nICsgYXJnc1tpXSwgJzEuMCcsIHR5cGUsIDUgKiAxMDI0ICogMTAyNCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGJbJ3NhdmUnXS50cmFuc2FjdGlvbihmdW5jdGlvbiAodHgpIHtcblx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdTRUxFQ1Qga2V5LCB0aW1lc3RhbXAgRlJPTSBkYXRhJywgW10sIGZ1bmN0aW9uICh0eCwgcmVzKSB7XG5cdFx0XHRcdFx0XHR2YXIgaSA9IDAsIGEgPSByZXMucm93cywgbCA9IGEubGVuZ3RoO1xuXHRcdFx0XHRcdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0dGltZXN0YW1wc1thLml0ZW0oaSkua2V5XSA9IGEuaXRlbShpKS50aW1lc3RhbXA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZTogZnVuY3Rpb24gKGtleSwgdHlwZSwgZGF0YSkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGRiW3R5cGVdID09ICd1bmRlZmluZWQnICYmIGdhbWVOYW1lICE9ICcnKSB7XG5cdFx0XHRcdFx0dGhpcy5vcGVuKGdhbWVOYW1lLCB0eXBlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBzdHIgPSBzZXJpYWxpemUoZGF0YSksIHQgPSB0cygpO1xuXHRcdFx0XHRpZiAodHlwZSA9PSAnc2F2ZScpXHRzYXZlRXh0ZXJuYWwoa2V5LCBzdHIsIHQpO1xuXHRcdFx0XHRkYlt0eXBlXS50cmFuc2FjdGlvbihmdW5jdGlvbiAodHgpIHtcblx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBkYXRhIChrZXkgdW5pcXVlLCB0ZXh0LCB0aW1lc3RhbXApJyk7XG5cdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnU0VMRUNUICogRlJPTSBkYXRhIFdIRVJFIGtleSA9ID8nLCBba2V5XSwgZnVuY3Rpb24gKHR4LCByZXN1bHRzKSB7XG5cdFx0XHRcdFx0XHRpZiAocmVzdWx0cy5yb3dzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdVUERBVEUgZGF0YSBTRVQgdGV4dCA9ID8sIHRpbWVzdGFtcCA9ID8gV0hFUkUga2V5ID0gPycsIFtzdHIsIHQsIGtleV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ0lOU0VSVCBJTlRPIGRhdGEgVkFMVUVTICg/LCA/LCA/KScsIFtrZXksIHN0ciwgdF0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cblx0XHRcdGxvYWQ6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkYlt0eXBlXSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IENyYWZ0eS5zdG9yYWdlLmxvYWQoa2V5LCB0eXBlLCBjYWxsYmFjayk7IH0sIDEpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRkYlt0eXBlXS50cmFuc2FjdGlvbihmdW5jdGlvbiAodHgpIHtcblx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdTRUxFQ1QgdGV4dCBGUk9NIGRhdGEgV0hFUkUga2V5ID0gPycsIFtrZXldLCBmdW5jdGlvbiAodHgsIHJlc3VsdHMpIHtcblx0XHRcdFx0XHRcdGlmIChyZXN1bHRzLnJvd3MubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdHJlcyA9IHVuc2VyaWFsaXplKHJlc3VsdHMucm93cy5pdGVtKDApLnRleHQpO1xuXHRcdFx0XHRcdFx0XHRjYWxsYmFjayhyZXMpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cblx0XHRcdGdldEFsbEtleXM6IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAoZGJbdHlwZV0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBDcmFmdHkuc3RvcmFnZS5nZXRBbGxLZXlzKHR5cGUsIGNhbGxiYWNrKTsgfSwgMSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRiW3R5cGVdLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0eCkge1xuXHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ1NFTEVDVCBrZXkgRlJPTSBkYXRhJywgW10sIGZ1bmN0aW9uICh0eCwgcmVzdWx0cykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2socmVzdWx0cy5yb3dzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRjaGVjazogZnVuY3Rpb24gKGtleSwgdGltZXN0YW1wKSB7XG5cdFx0XHRcdHJldHVybiAodGltZXN0YW1wc1trZXldID4gdGltZXN0YW1wKTtcblx0XHRcdH0sXG5cblx0XHRcdGV4dGVybmFsOiBleHRlcm5hbFxuXHRcdH07XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIHdpbmRvdy5sb2NhbFN0b3JhZ2UgPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbjogZnVuY3Rpb24gKGdhbWVOYW1lX24pIHtcblx0XHRcdFx0Z2FtZU5hbWUgPSBnYW1lTmFtZV9uO1xuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZTogZnVuY3Rpb24gKGtleSwgdHlwZSwgZGF0YSkge1xuXHRcdFx0XHR2YXIgayA9IGdhbWVOYW1lICsgJy4nICsgdHlwZSArICcuJyArIGtleSxcblx0XHRcdFx0XHRzdHIgPSBzZXJpYWxpemUoZGF0YSksXG5cdFx0XHRcdFx0dCA9IHRzKCk7XG5cdFx0XHRcdGlmICh0eXBlID09ICdzYXZlJylcdHNhdmVFeHRlcm5hbChrZXksIHN0ciwgdCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2Vba10gPSBzdHI7XG5cdFx0XHRcdGlmICh0eXBlID09ICdzYXZlJylcblx0XHRcdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlW2sgKyAnLnRzJ10gPSB0O1xuXHRcdFx0fSxcblxuXHRcdFx0bG9hZDogZnVuY3Rpb24gKGtleSwgdHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0dmFyIGsgPSBnYW1lTmFtZSArICcuJyArIHR5cGUgKyAnLicgKyBrZXksXG5cdFx0XHRcdFx0c3RyID0gd2luZG93LmxvY2FsU3RvcmFnZVtrXTtcblxuXHRcdFx0XHRjYWxsYmFjayh1bnNlcmlhbGl6ZShzdHIpKTtcblx0XHRcdH0sXG5cblx0XHRcdGdldEFsbEtleXM6IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHR2YXIgcmVzID0ge30sIG91dHB1dCA9IFtdLCBoZWFkZXIgPSBnYW1lTmFtZSArICcuJyArIHR5cGU7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gd2luZG93LmxvY2FsU3RvcmFnZSkge1xuXHRcdFx0XHRcdGlmIChpLmluZGV4T2YoaGVhZGVyKSAhPSAtMSkge1xuXHRcdFx0XHRcdFx0dmFyIGtleSA9IGkucmVwbGFjZShoZWFkZXIsICcnKS5yZXBsYWNlKCcudHMnLCAnJyk7XG5cdFx0XHRcdFx0XHRyZXNba2V5XSA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAoaSBpbiByZXMpIHtcblx0XHRcdFx0XHRvdXRwdXQucHVzaChpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhvdXRwdXQpO1xuXHRcdFx0fSxcblxuXHRcdFx0Y2hlY2s6IGZ1bmN0aW9uIChrZXksIHRpbWVzdGFtcCkge1xuXHRcdFx0XHR2YXIgdHMgPSB3aW5kb3cubG9jYWxTdG9yYWdlW2dhbWVOYW1lICsgJy5zYXZlLicgKyBrZXkgKyAnLnRzJ107XG5cblx0XHRcdFx0cmV0dXJuIChwYXJzZUludCh0aW1lc3RhbXApID4gcGFyc2VJbnQodHMpKTtcblx0XHRcdH0sXG5cblx0XHRcdGV4dGVybmFsOiBleHRlcm5hbFxuXHRcdH07XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gZGVmYXVsdCBmYWxsYmFjayB0byBjb29raWVzXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW46IGZ1bmN0aW9uIChnYW1lTmFtZV9uKSB7XG5cdFx0XHRcdGdhbWVOYW1lID0gZ2FtZU5hbWVfbjtcblx0XHRcdH0sXG5cblx0XHRcdHNhdmU6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGRhdGEpIHtcblx0XHRcdFx0Ly8gY29va2llcyBhcmUgdmVyeSBsaW1pdGVkIGluIHNwYWNlLiB3ZSBjYW4gb25seSBrZWVwIHNhdmVzIHRoZXJlXG5cdFx0XHRcdGlmICh0eXBlICE9ICdzYXZlJykgcmV0dXJuO1xuXHRcdFx0XHR2YXIgc3RyID0gc2VyaWFsaXplKGRhdGEpLCB0ID0gdHMoKTtcblx0XHRcdFx0aWYgKHR5cGUgPT0gJ3NhdmUnKVx0c2F2ZUV4dGVybmFsKGtleSwgc3RyLCB0KTtcblx0XHRcdFx0ZG9jdW1lbnQuY29va2llID0gZ2FtZU5hbWUgKyAnXycgKyBrZXkgKyAnPScgKyBzdHIgKyAnOyAnICsgZ2FtZU5hbWUgKyAnXycgKyBrZXkgKyAnX3RzPScgKyB0ICsgJzsgZXhwaXJlcz1UaHVyLCAzMSBEZWMgMjA5OSAyMzo1OTo1OSBVVEM7IHBhdGg9Lyc7XG5cdFx0XHR9LFxuXG5cdFx0XHRsb2FkOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAodHlwZSAhPSAnc2F2ZScpIHJldHVybjtcblx0XHRcdFx0dmFyIHJlZyA9IG5ldyBSZWdFeHAoZ2FtZU5hbWUgKyAnXycgKyBrZXkgKyAnPVteO10qJyksXG5cdFx0XHRcdFx0cmVzdWx0ID0gcmVnLmV4ZWMoZG9jdW1lbnQuY29va2llKSxcblx0XHRcdFx0XHRkYXRhID0gdW5zZXJpYWxpemUocmVzdWx0WzBdLnJlcGxhY2UoZ2FtZU5hbWUgKyAnXycgKyBrZXkgKyAnPScsICcnKSk7XG5cblx0XHRcdFx0Y2FsbGJhY2soZGF0YSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRBbGxLZXlzOiBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKHR5cGUgIT0gJ3NhdmUnKSByZXR1cm47XG5cdFx0XHRcdHZhciByZWcgPSBuZXcgUmVnRXhwKGdhbWVOYW1lICsgJ19bXl89XScsICdnJyksXG5cdFx0XHRcdFx0bWF0Y2hlcyA9IHJlZy5leGVjKGRvY3VtZW50LmNvb2tpZSksXG5cdFx0XHRcdFx0aSA9IDAsIGwgPSBtYXRjaGVzLmxlbmd0aCwgcmVzID0ge30sIG91dHB1dCA9IFtdO1xuXHRcdFx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdHZhciBrZXkgPSBtYXRjaGVzW2ldLnJlcGxhY2UoZ2FtZU5hbWUgKyAnXycsICcnKTtcblx0XHRcdFx0XHRyZXNba2V5XSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yIChpIGluIHJlcykge1xuXHRcdFx0XHRcdG91dHB1dC5wdXNoKGkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKG91dHB1dCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRjaGVjazogZnVuY3Rpb24gKGtleSwgdGltZXN0YW1wKSB7XG5cdFx0XHRcdHZhciBoZWFkZXIgPSBnYW1lTmFtZSArICdfJyArIGtleSArICdfdHMnLFxuXHRcdFx0XHRcdHJlZyA9IG5ldyBSZWdFeHAoaGVhZGVyICsgJz1bXjtdJyksXG5cdFx0XHRcdFx0cmVzdWx0ID0gcmVnLmV4ZWMoZG9jdW1lbnQuY29va2llKSxcblx0XHRcdFx0XHR0cyA9IHJlc3VsdFswXS5yZXBsYWNlKGhlYWRlciArICc9JywgJycpO1xuXG5cdFx0XHRcdHJldHVybiAocGFyc2VJbnQodGltZXN0YW1wKSA+IHBhcnNlSW50KHRzKSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRleHRlcm5hbDogZXh0ZXJuYWxcblx0XHR9O1xuXHR9XG5cdC8qIHRlbXBsYXRlXG5cdHJldHVybiB7XG5cdFx0b3BlbjogZnVuY3Rpb24gKGdhbWVOYW1lKSB7XG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBkYXRhKSB7XG5cdFx0fSxcblx0XHRsb2FkOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdH0sXG5cdH0qL1xufSkoKTtcbi8qKkBcbiogI0NyYWZ0eS5zdXBwb3J0XG4qIEBjYXRlZ29yeSBNaXNjLCBDb3JlXG4qIERldGVybWluZXMgZmVhdHVyZSBzdXBwb3J0IGZvciB3aGF0IENyYWZ0eSBjYW4gZG8uXG4qL1xuXG4oZnVuY3Rpb24gdGVzdFN1cHBvcnQoKSB7XG4gICAgdmFyIHN1cHBvcnQgPSBDcmFmdHkuc3VwcG9ydCA9IHt9LFxuICAgICAgICB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgbWF0Y2ggPSAvKHdlYmtpdClbIFxcL10oW1xcdy5dKykvLmV4ZWModWEpIHx8XG4gICAgICAgICAgICAgICAgLyhvKXBlcmEoPzouKnZlcnNpb24pP1sgXFwvXShbXFx3Ll0rKS8uZXhlYyh1YSkgfHxcbiAgICAgICAgICAgICAgICAvKG1zKWllIChbXFx3Ll0rKS8uZXhlYyh1YSkgfHxcbiAgICAgICAgICAgICAgICAvKG1veilpbGxhKD86Lio/IHJ2OihbXFx3Ll0rKSk/Ly5leGVjKHVhKSB8fCBbXSxcbiAgICAgICAgbW9iaWxlID0gL2lQYWR8aVBvZHxpUGhvbmV8QW5kcm9pZHx3ZWJPU3xJRU1vYmlsZS9pLmV4ZWModWEpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5tb2JpbGVcbiAgICAqIEBjb21wIENyYWZ0eS5kZXZpY2VcbiAgICAqIFxuICAgICogRGV0ZXJtaW5lcyBpZiBDcmFmdHkgaXMgcnVubmluZyBvbiBtb2JpbGUgZGV2aWNlLlxuICAgICogXG4gICAgKiBJZiBDcmFmdHkubW9iaWxlIGlzIGVxdWFsIHRydWUgQ3JhZnR5IGRvZXMgc29tZSB0aGluZ3MgdW5kZXIgaG9vZDpcbiAgICAqIH5+flxuICAgICogLSBzZXQgdmlld3BvcnQgb24gbWF4IGRldmljZSB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgKiAtIHNldCBDcmFmdHkuc3RhZ2UuZnVsbHNjcmVlbiBvbiB0cnVlXG4gICAgKiAtIGhpZGUgd2luZG93IHNjcm9sbGJhcnNcbiAgICAqIH5+flxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS52aWV3cG9ydFxuICAgICovXG4gICAgaWYgKG1vYmlsZSkgQ3JhZnR5Lm1vYmlsZSA9IG1vYmlsZVswXTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5zZXR0ZXJcbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBgX19kZWZpbmVTZXR0ZXJfX2Agc3VwcG9ydGVkP1xuICAgICovXG4gICAgc3VwcG9ydC5zZXR0ZXIgPSAoJ19fZGVmaW5lU2V0dGVyX18nIGluIHRoaXMgJiYgJ19fZGVmaW5lR2V0dGVyX18nIGluIHRoaXMpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmRlZmluZVByb3BlcnR5XG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAgc3VwcG9ydGVkP1xuICAgICovXG4gICAgc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghJ2RlZmluZVByb3BlcnR5JyBpbiBPYmplY3QpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdHJ5IHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAneCcsIHt9KTsgfVxuICAgICAgICBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2UgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSkoKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5hdWRpb1xuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIEhUTUw1IGBBdWRpb2Agc3VwcG9ydGVkP1xuICAgICovXG4gICAgc3VwcG9ydC5hdWRpbyA9ICgnQXVkaW8nIGluIHdpbmRvdyk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQucHJlZml4XG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogUmV0dXJucyB0aGUgYnJvd3NlciBzcGVjaWZpYyBwcmVmaXggKGBNb3pgLCBgT2AsIGBtc2AsIGB3ZWJraXRgKS5cbiAgICAqL1xuICAgIHN1cHBvcnQucHJlZml4ID0gKG1hdGNoWzFdIHx8IG1hdGNoWzBdKTtcblxuICAgIC8vYnJvd3NlciBzcGVjaWZpYyBxdWlya3NcbiAgICBpZiAoc3VwcG9ydC5wcmVmaXggPT09IFwibW96XCIpIHN1cHBvcnQucHJlZml4ID0gXCJNb3pcIjtcbiAgICBpZiAoc3VwcG9ydC5wcmVmaXggPT09IFwib1wiKSBzdXBwb3J0LnByZWZpeCA9IFwiT1wiO1xuXG4gICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnN1cHBvcnQudmVyc2lvbk5hbWVcbiAgICAgICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICAgICAqIFZlcnNpb24gb2YgdGhlIGJyb3dzZXJcbiAgICAgICAgKi9cbiAgICAgICAgc3VwcG9ydC52ZXJzaW9uTmFtZSA9IG1hdGNoWzJdO1xuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnN1cHBvcnQudmVyc2lvblxuICAgICAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgICAgICogVmVyc2lvbiBudW1iZXIgb2YgdGhlIGJyb3dzZXIgYXMgYW4gSW50ZWdlciAoZmlyc3QgbnVtYmVyKVxuICAgICAgICAqL1xuICAgICAgICBzdXBwb3J0LnZlcnNpb24gPSArKG1hdGNoWzJdLnNwbGl0KFwiLlwiKSlbMF07XG4gICAgfVxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmNhbnZhc1xuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIHRoZSBgY2FudmFzYCBlbGVtZW50IHN1cHBvcnRlZD9cbiAgICAqL1xuICAgIHN1cHBvcnQuY2FudmFzID0gKCdnZXRDb250ZXh0JyBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC53ZWJnbFxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIFdlYkdMIHN1cHBvcnRlZCBvbiB0aGUgY2FudmFzIGVsZW1lbnQ/XG4gICAgKi9cbiAgICBpZiAoc3VwcG9ydC5jYW52YXMpIHtcbiAgICAgICAgdmFyIGdsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZ2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIik7XG4gICAgICAgICAgICBnbC52aWV3cG9ydFdpZHRoID0gc3VwcG9ydC5jYW52YXMud2lkdGg7XG4gICAgICAgICAgICBnbC52aWV3cG9ydEhlaWdodCA9IHN1cHBvcnQuY2FudmFzLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgICAgIHN1cHBvcnQud2ViZ2wgPSAhIWdsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3VwcG9ydC53ZWJnbCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5jc3MzZHRyYW5zZm9ybVxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIGNzczNEdHJhbnNmb3JtIHN1cHBvcnRlZCBieSBicm93c2VyLlxuICAgICovXG4gICAgc3VwcG9ydC5jc3MzZHRyYW5zZm9ybSA9ICh0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKS5zdHlsZVtcIlBlcnNwZWN0aXZlXCJdICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICh0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKS5zdHlsZVtzdXBwb3J0LnByZWZpeCArIFwiUGVyc3BlY3RpdmVcIl0gIT09IFwidW5kZWZpbmVkXCIpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmRldmljZW9yaWVudGF0aW9uXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgZGV2aWNlb3JpZW50YXRpb24gZXZlbnQgc3VwcG9ydGVkIGJ5IGJyb3dzZXIuXG4gICAgKi9cbiAgICBzdXBwb3J0LmRldmljZW9yaWVudGF0aW9uID0gKHR5cGVvZiB3aW5kb3cuRGV2aWNlT3JpZW50YXRpb25FdmVudCAhPT0gXCJ1bmRlZmluZWRcIikgfHwgKHR5cGVvZiB3aW5kb3cuT3JpZW50YXRpb25FdmVudCAhPT0gXCJ1bmRlZmluZWRcIik7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuZGV2aWNlbW90aW9uXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgZGV2aWNlbW90aW9uIGV2ZW50IHN1cHBvcnRlZCBieSBicm93c2VyLlxuICAgICovXG4gICAgc3VwcG9ydC5kZXZpY2Vtb3Rpb24gPSAodHlwZW9mIHdpbmRvdy5EZXZpY2VNb3Rpb25FdmVudCAhPT0gXCJ1bmRlZmluZWRcIik7XG5cbn0pKCk7XG5DcmFmdHkuZXh0ZW5kKHtcblxuICAgIHplcm9GaWxsOiBmdW5jdGlvbiAobnVtYmVyLCB3aWR0aCkge1xuICAgICAgICB3aWR0aCAtPSBudW1iZXIudG9TdHJpbmcoKS5sZW5ndGg7XG4gICAgICAgIGlmICh3aWR0aCA+IDApXG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5KHdpZHRoICsgKC9cXC4vLnRlc3QobnVtYmVyKSA/IDIgOiAxKSkuam9pbignMCcpICsgbnVtYmVyO1xuICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3ByaXRlXG4gICAgKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5zcHJpdGUoW051bWJlciB0aWxlXSwgU3RyaW5nIHVybCwgT2JqZWN0IG1hcFssIE51bWJlciBwYWRkaW5nWFssIE51bWJlciBwYWRkaW5nWV1dKVxuICAgICogQHBhcmFtIHRpbGUgLSBUaWxlIHNpemUgb2YgdGhlIHNwcml0ZSBtYXAsIGRlZmF1bHRzIHRvIDFcbiAgICAqIEBwYXJhbSB1cmwgLSBVUkwgb2YgdGhlIHNwcml0ZSBpbWFnZVxuICAgICogQHBhcmFtIG1hcCAtIE9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHdoYXQgYmVjb21lcyBhIG5ldyBjb21wb25lbnQgYW5kIHRoZSB2YWx1ZSBwb2ludHMgdG8gYSBwb3NpdGlvbiBvbiB0aGUgc3ByaXRlIG1hcFxuICAgICogQHBhcmFtIHBhZGRpbmdYIC0gSG9yaXpvbnRhbCBzcGFjZSBpbiBiZXR3ZWVuIHRpbGVzLiBEZWZhdWx0cyB0byAwLlxuICAgICogQHBhcmFtIHBhZGRpbmdZIC0gVmVydGljYWwgc3BhY2UgaW4gYmV0d2VlbiB0aWxlcy4gRGVmYXVsdHMgdG8gcGFkZGluZ1guXG4gICAgKiBHZW5lcmF0ZXMgY29tcG9uZW50cyBiYXNlZCBvbiBwb3NpdGlvbnMgaW4gYSBzcHJpdGUgaW1hZ2UgdG8gYmUgYXBwbGllZCB0byBlbnRpdGllcy5cbiAgICAqXG4gICAgKiBBY2NlcHRzIGEgdGlsZSBzaXplLCBVUkwgYW5kIG1hcCBmb3IgdGhlIG5hbWUgb2YgdGhlIHNwcml0ZSBhbmQgaXQncyBwb3NpdGlvbi5cbiAgICAqXG4gICAgKiBUaGUgcG9zaXRpb24gbXVzdCBiZSBhbiBhcnJheSBjb250YWluaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGUgc3ByaXRlIHdoZXJlIGluZGV4IGAwYFxuICAgICogaXMgdGhlIGB4YCBwb3NpdGlvbiwgYDFgIGlzIHRoZSBgeWAgcG9zaXRpb24gYW5kIG9wdGlvbmFsbHkgYDJgIGlzIHRoZSB3aWR0aCBhbmQgYDNgXG4gICAgKiBpcyB0aGUgaGVpZ2h0LiBJZiB0aGUgc3ByaXRlIG1hcCBoYXMgcGFkZGluZywgcGFzcyB0aGUgdmFsdWVzIGZvciB0aGUgYHhgIHBhZGRpbmdcbiAgICAqIG9yIGB5YCBwYWRkaW5nLiBJZiB0aGV5IGFyZSB0aGUgc2FtZSwganVzdCBhZGQgb25lIHZhbHVlLlxuICAgICpcbiAgICAqIElmIHRoZSBzcHJpdGUgaW1hZ2UgaGFzIG5vIGNvbnNpc3RlbnQgdGlsZSBzaXplLCBgMWAgb3Igbm8gYXJndW1lbnQgbmVlZCBiZVxuICAgICogcGFzc2VkIGZvciB0aWxlIHNpemUuXG4gICAgKlxuICAgICogRW50aXRpZXMgdGhhdCBhZGQgdGhlIGdlbmVyYXRlZCBjb21wb25lbnRzIGFyZSBhbHNvIGdpdmVuIGEgY29tcG9uZW50IGNhbGxlZCBgU3ByaXRlYC5cbiAgICAqIFxuICAgICogQHNlZSBTcHJpdGVcbiAgICAqL1xuICAgIHNwcml0ZTogZnVuY3Rpb24gKHRpbGUsIHRpbGVoLCB1cmwsIG1hcCwgcGFkZGluZ1gsIHBhZGRpbmdZKSB7XG4gICAgICAgIHZhciBzcHJpdGVOYW1lLCB0ZW1wLCB4LCB5LCB3LCBoLCBpbWc7XG5cbiAgICAgICAgLy9pZiBubyB0aWxlIHZhbHVlLCBkZWZhdWx0IHRvIDFcbiAgICAgICAgaWYgKHR5cGVvZiB0aWxlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBwYWRkaW5nWSA9IHBhZGRpbmdYO1xuICAgICAgICAgICAgcGFkZGluZ1ggPSBtYXA7XG4gICAgICAgICAgICBtYXAgPSB0aWxlaDtcbiAgICAgICAgICAgIHVybCA9IHRpbGU7XG4gICAgICAgICAgICB0aWxlID0gMTtcbiAgICAgICAgICAgIHRpbGVoID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgdGlsZWggPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcGFkZGluZ1kgPSBwYWRkaW5nWDtcbiAgICAgICAgICAgIHBhZGRpbmdYID0gbWFwO1xuICAgICAgICAgICAgbWFwID0gdXJsO1xuICAgICAgICAgICAgdXJsID0gdGlsZWg7XG4gICAgICAgICAgICB0aWxlaCA9IHRpbGU7XG4gICAgICAgIH1cblxuICAgICAgICAvL2lmIG5vIHBhZGRpbmdZLCB1c2UgcGFkZGluZ1hcbiAgICAgICAgaWYgKCFwYWRkaW5nWSAmJiBwYWRkaW5nWCkgcGFkZGluZ1kgPSBwYWRkaW5nWDtcbiAgICAgICAgcGFkZGluZ1ggPSBwYXJzZUludChwYWRkaW5nWCB8fCAwLCAxMCk7IC8vanVzdCBpbmNhc2VcbiAgICAgICAgcGFkZGluZ1kgPSBwYXJzZUludChwYWRkaW5nWSB8fCAwLCAxMCk7XG5cbiAgICAgICAgaW1nID0gQ3JhZnR5LmFzc2V0KHVybCk7XG4gICAgICAgIGlmICghaW1nKSB7XG4gICAgICAgICAgICBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSB1cmw7XG4gICAgICAgICAgICBDcmFmdHkuYXNzZXQodXJsLCBpbWcpO1xuICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2FsbCBjb21wb25lbnRzIHdpdGggdGhpcyBpbWcgYXJlIG5vdyByZWFkeVxuICAgICAgICAgICAgICAgIGZvciAoc3ByaXRlTmFtZSBpbiBtYXApIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5KHNwcml0ZU5hbWUpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHNwcml0ZU5hbWUgaW4gbWFwKSB7XG4gICAgICAgICAgICBpZiAoIW1hcC5oYXNPd25Qcm9wZXJ0eShzcHJpdGVOYW1lKSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHRlbXAgPSBtYXBbc3ByaXRlTmFtZV07XG4gICAgICAgICAgICB4ID0gdGVtcFswXSAqICh0aWxlICsgcGFkZGluZ1gpO1xuICAgICAgICAgICAgeSA9IHRlbXBbMV0gKiAodGlsZWggKyBwYWRkaW5nWSk7XG4gICAgICAgICAgICB3ID0gdGVtcFsyXSAqIHRpbGUgfHwgdGlsZTtcbiAgICAgICAgICAgIGggPSB0ZW1wWzNdICogdGlsZWggfHwgdGlsZWg7XG5cbiAgICAgICAgICAgIC8vZ2VuZXJhdGVzIHNwcml0ZSBjb21wb25lbnRzIGZvciBlYWNoIHRpbGUgaW4gdGhlIG1hcFxuICAgICAgICAgICAgQ3JhZnR5LmMoc3ByaXRlTmFtZSwge1xuICAgICAgICAgICAgICAgIHJlYWR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBfX2Nvb3JkOiBbeCwgeSwgdywgaF0sXG5cbiAgICAgICAgICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWlyZXMoXCJTcHJpdGVcIik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cmltID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9faW1hZ2UgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jb29yZCA9IFt0aGlzLl9fY29vcmRbMF0sIHRoaXMuX19jb29yZFsxXSwgdGhpcy5fX2Nvb3JkWzJdLCB0aGlzLl9fY29vcmRbM11dO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdGlsZSA9IHRpbGU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190aWxlaCA9IHRpbGVoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fcGFkZGluZyA9IFtwYWRkaW5nWCwgcGFkZGluZ1ldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZyA9IGltZztcblxuICAgICAgICAgICAgICAgICAgICAvL2RyYXcgbm93XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmltZy5jb21wbGV0ZSAmJiB0aGlzLmltZy53aWR0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy9zZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgdG8gdGhlIHNwcml0ZSBzaXplXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudyA9IHRoaXMuX19jb29yZFsyXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5fX2Nvb3JkWzNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9ldmVudHM6IHt9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5hZGRFdmVudFxuICAgICogQGNhdGVnb3J5IEV2ZW50cywgTWlzY1xuICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmFkZEV2ZW50KE9iamVjdCBjdHgsIEhUTUxFbGVtZW50IG9iaiwgU3RyaW5nIGV2ZW50LCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAqIEBwYXJhbSBjdHggLSBDb250ZXh0IG9mIHRoZSBjYWxsYmFjayBvciB0aGUgdmFsdWUgb2YgYHRoaXNgXG4gICAgKiBAcGFyYW0gb2JqIC0gRWxlbWVudCB0byBhZGQgdGhlIERPTSBldmVudCB0b1xuICAgICogQHBhcmFtIGV2ZW50IC0gRXZlbnQgbmFtZSB0byBiaW5kIHRvXG4gICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSB3aGVuIHRyaWdnZXJlZFxuICAgICogXG4gICAgKiBBZGRzIERPTSBsZXZlbCAzIGV2ZW50cyB0byBlbGVtZW50cy4gVGhlIGFyZ3VtZW50cyBpdCBhY2NlcHRzIGFyZSB0aGUgY2FsbFxuICAgICogY29udGV4dCAodGhlIHZhbHVlIG9mIGB0aGlzYCksIHRoZSBET00gZWxlbWVudCB0byBhdHRhY2ggdGhlIGV2ZW50IHRvLFxuICAgICogdGhlIGV2ZW50IG5hbWUgKHdpdGhvdXQgYG9uYCAoYGNsaWNrYCByYXRoZXIgdGhhbiBgb25jbGlja2ApKSBhbmRcbiAgICAqIGZpbmFsbHkgdGhlIGNhbGxiYWNrIG1ldGhvZC5cbiAgICAqXG4gICAgKiBJZiBubyBlbGVtZW50IGlzIHBhc3NlZCwgdGhlIGRlZmF1bHQgZWxlbWVudCB3aWxsIGJlIGB3aW5kb3cuZG9jdW1lbnRgLlxuICAgICpcbiAgICAqIENhbGxiYWNrcyBhcmUgcGFzc2VkIHdpdGggZXZlbnQgZGF0YS5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkucmVtb3ZlRXZlbnRcbiAgICAqL1xuICAgIGFkZEV2ZW50OiBmdW5jdGlvbiAoY3R4LCBvYmosIHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHR5cGU7XG4gICAgICAgICAgICB0eXBlID0gb2JqO1xuICAgICAgICAgICAgb2JqID0gd2luZG93LmRvY3VtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy9zYXZlIGFub255bW91cyBmdW5jdGlvbiB0byBiZSBhYmxlIHRvIHJlbW92ZVxuICAgICAgICB2YXIgYWZuID0gZnVuY3Rpb24gKGUpIHsgXG4gICAgICAgICAgICAgICAgdmFyIGUgPSBlIHx8IHdpbmRvdy5ldmVudDsgXG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY3R4LCBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWQgPSBjdHhbMF0gfHwgXCJcIjtcblxuICAgICAgICBpZiAoIXRoaXMuX2V2ZW50c1tpZCArIG9iaiArIHR5cGUgKyBjYWxsYmFja10pIHRoaXMuX2V2ZW50c1tpZCArIG9iaiArIHR5cGUgKyBjYWxsYmFja10gPSBhZm47XG4gICAgICAgIGVsc2UgcmV0dXJuO1xuXG4gICAgICAgIGlmIChvYmouYXR0YWNoRXZlbnQpIHsgLy9JRVxuICAgICAgICAgICAgb2JqLmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCBhZm4pO1xuICAgICAgICB9IGVsc2UgeyAvL0V2ZXJ5b25lIGVsc2VcbiAgICAgICAgICAgIG9iai5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGFmbiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkucmVtb3ZlRXZlbnRcbiAgICAqIEBjYXRlZ29yeSBFdmVudHMsIE1pc2NcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5yZW1vdmVFdmVudChPYmplY3QgY3R4LCBIVE1MRWxlbWVudCBvYmosIFN0cmluZyBldmVudCwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgKiBAcGFyYW0gY3R4IC0gQ29udGV4dCBvZiB0aGUgY2FsbGJhY2sgb3IgdGhlIHZhbHVlIG9mIGB0aGlzYFxuICAgICogQHBhcmFtIG9iaiAtIEVsZW1lbnQgdGhlIGV2ZW50IGlzIG9uXG4gICAgKiBAcGFyYW0gZXZlbnQgLSBOYW1lIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIGV4ZWN1dGVkIHdoZW4gdHJpZ2dlcmVkXG4gICAgKiBcbiAgICAqIFJlbW92ZXMgZXZlbnRzIGF0dGFjaGVkIGJ5IGBDcmFmdHkuYWRkRXZlbnQoKWAuIEFsbCBwYXJhbWV0ZXJzIG11c3RcbiAgICAqIGJlIHRoZSBzYW1lIHRoYXQgd2VyZSB1c2VkIHRvIGF0dGFjaCB0aGUgZXZlbnQgaW5jbHVkaW5nIGEgcmVmZXJlbmNlXG4gICAgKiB0byB0aGUgY2FsbGJhY2sgbWV0aG9kLlxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS5hZGRFdmVudFxuICAgICovXG4gICAgcmVtb3ZlRXZlbnQ6IGZ1bmN0aW9uIChjdHgsIG9iaiwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSBvYmo7XG4gICAgICAgICAgICBvYmogPSB3aW5kb3cuZG9jdW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvL3JldHJpZXZlIGFub255bW91cyBmdW5jdGlvblxuICAgICAgICB2YXIgaWQgPSBjdHhbMF0gfHwgXCJcIixcbiAgICAgICAgICAgIGFmbiA9IHRoaXMuX2V2ZW50c1tpZCArIG9iaiArIHR5cGUgKyBjYWxsYmFja107XG5cbiAgICAgICAgaWYgKGFmbikge1xuICAgICAgICAgICAgaWYgKG9iai5kZXRhY2hFdmVudCkge1xuICAgICAgICAgICAgICAgIG9iai5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgYWZuKTtcbiAgICAgICAgICAgIH0gZWxzZSBvYmoucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBhZm4sIGZhbHNlKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbaWQgKyBvYmogKyB0eXBlICsgY2FsbGJhY2tdO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuYmFja2dyb3VuZFxuICAgICogQGNhdGVnb3J5IEdyYXBoaWNzLCBTdGFnZVxuICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmJhY2tncm91bmQoU3RyaW5nIHZhbHVlKVxuICAgICogQHBhcmFtIHN0eWxlIC0gTW9kaWZ5IHRoZSBiYWNrZ3JvdW5kIHdpdGggYSBjb2xvciBvciBpbWFnZVxuICAgICogXG4gICAgKiBUaGlzIG1ldGhvZCBpcyBlc3NlbnRpYWxseSBhIHNob3J0Y3V0IGZvciBhZGRpbmcgYSBiYWNrZ3JvdW5kXG4gICAgKiBzdHlsZSB0byB0aGUgc3RhZ2UgZWxlbWVudC5cbiAgICAqL1xuICAgIGJhY2tncm91bmQ6IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5zdHlsZS5iYWNrZ3JvdW5kID0gc3R5bGU7XG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkudmlld3BvcnRcbiAgICAqIEBjYXRlZ29yeSBTdGFnZVxuICAgICogXG4gICAgKiBWaWV3cG9ydCBpcyBlc3NlbnRpYWxseSBhIDJEIGNhbWVyYSBsb29raW5nIGF0IHRoZSBzdGFnZS4gQ2FuIGJlIG1vdmVkIHdoaWNoXG4gICAgKiBpbiB0dXJuIHdpbGwgcmVhY3QganVzdCBsaWtlIGEgY2FtZXJhIG1vdmluZyBpbiB0aGF0IGRpcmVjdGlvbi5cbiAgICAqL1xuICAgIHZpZXdwb3J0OiB7XG4gICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuY2xhbXBUb0VudGl0aWVzXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICogXG4gICAgICAgICogRGVjaWRlcyBpZiB0aGUgdmlld3BvcnQgZnVuY3Rpb25zIHNob3VsZCBjbGFtcCB0byBnYW1lIGVudGl0aWVzLlxuICAgICAgICAqIFdoZW4gc2V0IHRvIGB0cnVlYCBmdW5jdGlvbnMgc3VjaCBhcyBDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKCkgd2lsbCBub3QgYWxsb3cgeW91IHRvIG1vdmUgdGhlXG4gICAgICAgICogdmlld3BvcnQgb3ZlciBhcmVhcyBvZiB0aGUgZ2FtZSB0aGF0IGhhcyBubyBlbnRpdGllcy5cbiAgICAgICAgKiBGb3IgZGV2ZWxvcG1lbnQgaXQgY2FuIGJlIHVzZWZ1bCB0byBzZXQgdGhpcyB0byBmYWxzZS5cbiAgICAgICAgKi9cbiAgICAgICAgY2xhbXBUb0VudGl0aWVzOiB0cnVlLFxuICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC54XG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICogXG4gICAgICAgICogV2lsbCBtb3ZlIHRoZSBzdGFnZSBhbmQgdGhlcmVmb3JlIGV2ZXJ5IHZpc2libGUgZW50aXR5IGFsb25nIHRoZSBgeGBcbiAgICAgICAgKiBheGlzIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24uXG4gICAgICAgICpcbiAgICAgICAgKiBXaGVuIHRoaXMgdmFsdWUgaXMgc2V0LCBpdCB3aWxsIHNoaWZ0IHRoZSBlbnRpcmUgc3RhZ2UuIFRoaXMgbWVhbnMgdGhhdCBlbnRpdHlcbiAgICAgICAgKiBwb3NpdGlvbnMgYXJlIG5vdCBleGFjdGx5IHdoZXJlIHRoZXkgYXJlIG9uIHNjcmVlbi4gVG8gZ2V0IHRoZSBleGFjdCBwb3NpdGlvbixcbiAgICAgICAgKiBzaW1wbHkgYWRkIGBDcmFmdHkudmlld3BvcnQueGAgb250byB0aGUgZW50aXRpZXMgYHhgIHBvc2l0aW9uLlxuICAgICAgICAqL1xuICAgICAgICBfeDogMCxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudmlld3BvcnQueVxuICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAqIFxuICAgICAgICAqIFdpbGwgbW92ZSB0aGUgc3RhZ2UgYW5kIHRoZXJlZm9yZSBldmVyeSB2aXNpYmxlIGVudGl0eSBhbG9uZyB0aGUgYHlgXG4gICAgICAgICogYXhpcyBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uLlxuICAgICAgICAqXG4gICAgICAgICogV2hlbiB0aGlzIHZhbHVlIGlzIHNldCwgaXQgd2lsbCBzaGlmdCB0aGUgZW50aXJlIHN0YWdlLiBUaGlzIG1lYW5zIHRoYXQgZW50aXR5XG4gICAgICAgICogcG9zaXRpb25zIGFyZSBub3QgZXhhY3RseSB3aGVyZSB0aGV5IGFyZSBvbiBzY3JlZW4uIFRvIGdldCB0aGUgZXhhY3QgcG9zaXRpb24sXG4gICAgICAgICogc2ltcGx5IGFkZCBgQ3JhZnR5LnZpZXdwb3J0LnlgIG9udG8gdGhlIGVudGl0aWVzIGB5YCBwb3NpdGlvbi5cbiAgICAgICAgKi9cbiAgICAgICAgX3k6IDAsXG5cdFx0XG5cdFx0LyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LmJvdW5kc1xuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICpcblx0XHQgKiBBIHJlY3RhbmdsZSB3aGljaCBkZWZpbmVzIHRoZSBib3VuZHMgb2YgdGhlIHZpZXdwb3J0LiBJZiB0aGlzIFxuXHRcdCAqIHZhcmlhYmxlIGlzIG51bGwsIENyYWZ0eSB1c2VzIHRoZSBib3VuZGluZyBib3ggb2YgYWxsIHRoZSBpdGVtc1xuXHRcdCAqIG9uIHRoZSBzdGFnZS5cbiAgICAgICAgICovXG4gICAgICAgIGJvdW5kczpudWxsLFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5zY3JvbGxcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoU3RyaW5nIGF4aXMsIE51bWJlciB2KVxuICAgICAgICAgKiBAcGFyYW0gYXhpcyAtICd4JyBvciAneSdcbiAgICAgICAgICogQHBhcmFtIHYgLSBUaGUgbmV3IGFic29sdXRlIHBvc2l0aW9uIG9uIHRoZSBheGlzXG4gICAgICAgICAqXG4gICAgICAgICAqIFdpbGwgbW92ZSB0aGUgdmlld3BvcnQgdG8gdGhlIHBvc2l0aW9uIGdpdmVuIG9uIHRoZSBzcGVjaWZpZWQgYXhpc1xuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGUgXG4gICAgICAgICAqIFdpbGwgbW92ZSB0aGUgY2FtZXJhIDUwMCBwaXhlbHMgcmlnaHQgb2YgaXRzIGluaXRpYWwgcG9zaXRpb24sIGluIGVmZmVjdFxuICAgICAgICAgKiBzaGlmdGluZyBldmVyeXRoaW5nIGluIHRoZSB2aWV3cG9ydCA1MDAgcGl4ZWxzIHRvIHRoZSBsZWZ0LlxuICAgICAgICAgKiBcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoJ194JywgNTAwKTtcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBzY3JvbGw6IGZ1bmN0aW9uIChheGlzLCB2KSB7XG4gICAgICAgICAgICB2ID0gTWF0aC5mbG9vcih2KTtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSB2IC0gdGhpc1theGlzXSwgLy9jaGFuZ2UgaW4gZGlyZWN0aW9uXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IENyYWZ0eS5jYW52YXMuY29udGV4dCxcbiAgICAgICAgICAgICAgICBzdHlsZSA9IENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZSxcbiAgICAgICAgICAgICAgICBjYW52YXM7XG5cbiAgICAgICAgICAgIC8vdXBkYXRlIHZpZXdwb3J0IGFuZCBET00gc2Nyb2xsXG4gICAgICAgICAgICB0aGlzW2F4aXNdID0gdjtcblx0XHRcdGlmIChjb250ZXh0KSB7XG5cdFx0XHRcdGlmIChheGlzID09ICdfeCcpIHtcblx0XHRcdFx0XHRjb250ZXh0LnRyYW5zbGF0ZShjaGFuZ2UsIDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnRleHQudHJhbnNsYXRlKDAsIGNoYW5nZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Q3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGwoKTtcblx0XHRcdH1cbiAgICAgICAgICAgIHN0eWxlW2F4aXMgPT0gJ194JyA/IFwibGVmdFwiIDogXCJ0b3BcIl0gPSB2ICsgXCJweFwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IF94OiAtdGhpcy5feCwgX3k6IC10aGlzLl95LCBfdzogdGhpcy53aWR0aCwgX2g6IHRoaXMuaGVpZ2h0IH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnBhblxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0LnBhbihTdHJpbmcgYXhpcywgTnVtYmVyIHYsIE51bWJlciB0aW1lKVxuICAgICAgICAgKiBAcGFyYW0gU3RyaW5nIGF4aXMgLSAneCcgb3IgJ3knLiBUaGUgYXhpcyB0byBtb3ZlIHRoZSBjYW1lcmEgb25cbiAgICAgICAgICogQHBhcmFtIE51bWJlciB2IC0gdGhlIGRpc3RhbmNlIHRvIG1vdmUgdGhlIGNhbWVyYSBieVxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIHRpbWUgLSBUaGUgZHVyYXRpb24gaW4gZnJhbWVzIGZvciB0aGUgZW50aXJlIGNhbWVyYSBtb3ZlbWVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBQYW5zIHRoZSBjYW1lcmEgYSBnaXZlbiBudW1iZXIgb2YgcGl4ZWxzIG92ZXIgYSBnaXZlbiBudW1iZXIgb2YgZnJhbWVzXG4gICAgICAgICAqL1xuICAgICAgICBwYW46IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdHdlZW5zID0ge30sIGksIGJvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGVudGVyRnJhbWUoZSkge1xuICAgICAgICAgICAgICAgIHZhciBsID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gdHdlZW5zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0gdHdlZW5zW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcC5yZW1UaW1lID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcC5jdXJyZW50ICs9IHByb3AuZGlmZjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3AucmVtVGltZS0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0W2ldID0gTWF0aC5mbG9vcihwcm9wLmN1cnJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHR3ZWVuc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobCkgQ3JhZnR5LnZpZXdwb3J0Ll9jbGFtcCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGF4aXMsIHYsIHRpbWUpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuZm9sbG93KCk7XG4gICAgICAgICAgICAgICAgaWYgKGF4aXMgPT0gJ3Jlc2V0Jykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgaW4gdHdlZW5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0d2VlbnNbaV0ucmVtVGltZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGltZSA9PSAwKSB0aW1lID0gMTtcbiAgICAgICAgICAgICAgICB0d2VlbnNbYXhpc10gPSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZmY6IC12IC8gdGltZSxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudDogQ3JhZnR5LnZpZXdwb3J0W2F4aXNdLFxuICAgICAgICAgICAgICAgICAgICByZW1UaW1lOiB0aW1lXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAoIWJvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5iaW5kKFwiRW50ZXJGcmFtZVwiLCBlbnRlckZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuZm9sbG93XG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQuZm9sbG93KE9iamVjdCB0YXJnZXQsIE51bWJlciBvZmZzZXR4LCBOdW1iZXIgb2Zmc2V0eSlcbiAgICAgICAgICogQHBhcmFtIE9iamVjdCB0YXJnZXQgLSBBbiBlbnRpdHkgd2l0aCB0aGUgMkQgY29tcG9uZW50XG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgb2Zmc2V0eCAtIEZvbGxvdyB0YXJnZXQgc2hvdWxkIGJlIG9mZnNldHggcGl4ZWxzIGF3YXkgZnJvbSBjZW50ZXJcbiAgICAgICAgICogQHBhcmFtIE51bWJlciBvZmZzZXR5IC0gUG9zaXRpdmUgcHV0cyB0YXJnZXQgdG8gdGhlIHJpZ2h0IG9mIGNlbnRlclxuICAgICAgICAgKlxuICAgICAgICAgKiBGb2xsb3dzIGEgZ2l2ZW4gZW50aXR5IHdpdGggdGhlIDJEIGNvbXBvbmVudC4gSWYgZm9sbG93aW5nIHRhcmdldCB3aWxsIHRha2UgYSBwb3J0aW9uIG9mXG4gICAgICAgICAqIHRoZSB2aWV3cG9ydCBvdXQgb2YgYm91bmRzIG9mIHRoZSB3b3JsZCwgZm9sbG93aW5nIHdpbGwgc3RvcCB1bnRpbCB0aGUgdGFyZ2V0IG1vdmVzIGF3YXkuXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogdmFyIGVudCA9IENyYWZ0eS5lKCcyRCwgRE9NJykuYXR0cih7dzogMTAwLCBoOiAxMDA6fSk7XG4gICAgICAgICAqIENyYWZ0eS52aWV3cG9ydC5mb2xsb3coZW50LCAwLCAwKTtcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBmb2xsb3c6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2xkVGFyZ2V0LCBvZmZ4LCBvZmZ5O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBjaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbCgnX3gnLCAtKHRoaXMueCArICh0aGlzLncgLyAyKSAtIChDcmFmdHkudmlld3BvcnQud2lkdGggLyAyKSAtIG9mZngpKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKCdfeScsIC0odGhpcy55ICsgKHRoaXMuaCAvIDIpIC0gKENyYWZ0eS52aWV3cG9ydC5oZWlnaHQgLyAyKSAtIG9mZnkpKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuX2NsYW1wKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBvZmZzZXR4LCBvZmZzZXR5KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9sZFRhcmdldClcbiAgICAgICAgICAgICAgICAgICAgb2xkVGFyZ2V0LnVuYmluZCgnQ2hhbmdlJywgY2hhbmdlKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0LmhhcygnMkQnKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3Jlc2V0Jyk7XG5cbiAgICAgICAgICAgICAgICBvbGRUYXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgb2ZmeCA9ICh0eXBlb2Ygb2Zmc2V0eCAhPSAndW5kZWZpbmVkJykgPyBvZmZzZXR4IDogMDtcbiAgICAgICAgICAgICAgICBvZmZ5ID0gKHR5cGVvZiBvZmZzZXR5ICE9ICd1bmRlZmluZWQnKSA/IG9mZnNldHkgOiAwO1xuXG4gICAgICAgICAgICAgICAgdGFyZ2V0LmJpbmQoJ0NoYW5nZScsIGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgY2hhbmdlLmNhbGwodGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuY2VudGVyT25cbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5jZW50ZXJPbihPYmplY3QgdGFyZ2V0LCBOdW1iZXIgdGltZSlcbiAgICAgICAgICogQHBhcmFtIE9iamVjdCB0YXJnZXQgLSBBbiBlbnRpdHkgd2l0aCB0aGUgMkQgY29tcG9uZW50XG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgdGltZSAtIFRoZSBudW1iZXIgb2YgZnJhbWVzIHRvIHBlcmZvcm0gdGhlIGNlbnRlcmluZyBvdmVyXG4gICAgICAgICAqXG4gICAgICAgICAqIENlbnRlcnMgdGhlIHZpZXdwb3J0IG9uIHRoZSBnaXZlbiBlbnRpdHlcbiAgICAgICAgICovXG4gICAgICAgIGNlbnRlck9uOiBmdW5jdGlvbiAodGFyZywgdGltZSkge1xuICAgICAgICAgICAgdmFyIHggPSB0YXJnLngsXG4gICAgICAgICAgICAgICAgICAgIHkgPSB0YXJnLnksXG4gICAgICAgICAgICAgICAgICAgIG1pZF94ID0gdGFyZy53IC8gMixcbiAgICAgICAgICAgICAgICAgICAgbWlkX3kgPSB0YXJnLmggLyAyLFxuICAgICAgICAgICAgICAgICAgICBjZW50X3ggPSBDcmFmdHkudmlld3BvcnQud2lkdGggLyAyLFxuICAgICAgICAgICAgICAgICAgICBjZW50X3kgPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMixcbiAgICAgICAgICAgICAgICAgICAgbmV3X3ggPSB4ICsgbWlkX3ggLSBjZW50X3gsXG4gICAgICAgICAgICAgICAgICAgIG5ld195ID0geSArIG1pZF95IC0gY2VudF95O1xuXG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCdyZXNldCcpO1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigneCcsIG5ld194LCB0aW1lKTtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3knLCBuZXdfeSwgdGltZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0Ll96b29tXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICogXG4gICAgICAgICogVGhpcyB2YWx1ZSBrZWVwcyBhbiBhbW91bnQgb2Ygdmlld3BvcnQgem9vbSwgcmVxdWlyZWQgZm9yIGNhbGN1bGF0aW5nIG1vdXNlIHBvc2l0aW9uIGF0IGVudGl0eVxuICAgICAgICAqL1xuICAgICAgICBfem9vbSA6IDEsXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0Lnpvb21cbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC56b29tKE51bWJlciBhbXQsIE51bWJlciBjZW50X3gsIE51bWJlciBjZW50X3ksIE51bWJlciB0aW1lKVxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIGFtdCAtIGFtb3VudCB0byB6b29tIGluIG9uIHRoZSB0YXJnZXQgYnkgKGVnLiAyLCA0LCAwLjUpXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgY2VudF94IC0gdGhlIGNlbnRlciB0byB6b29tIG9uXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgY2VudF95IC0gdGhlIGNlbnRlciB0byB6b29tIG9uXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgdGltZSAtIHRoZSBkdXJhdGlvbiBpbiBmcmFtZXMgb2YgdGhlIGVudGlyZSB6b29tIG9wZXJhdGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBab29tcyB0aGUgY2FtZXJhIGluIG9uIGEgZ2l2ZW4gcG9pbnQuIGFtdCA+IDEgd2lsbCBicmluZyB0aGUgY2FtZXJhIGNsb3NlciB0byB0aGUgc3ViamVjdFxuICAgICAgICAgKiBhbXQgPCAxIHdpbGwgYnJpbmcgaXQgZmFydGhlciBhd2F5LiBhbXQgPSAwIHdpbGwgZG8gbm90aGluZy5cbiAgICAgICAgICogWm9vbWluZyBpcyBtdWx0aXBsaWNhdGl2ZS4gVG8gcmVzZXQgdGhlIHpvb20gYW1vdW50LCBwYXNzIDAuXG4gICAgICAgICAqL1xuICAgICAgICB6b29tOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHpvb20gPSAxLFxuICAgICAgICAgICAgICAgIHpvb21fdGljayA9IDAsXG4gICAgICAgICAgICAgICAgZHVyID0gMCxcbiAgICAgICAgICAgICAgICBwcm9wID0gQ3JhZnR5LnN1cHBvcnQucHJlZml4ICsgXCJUcmFuc2Zvcm1cIixcbiAgICAgICAgICAgICAgICBib3VuZCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdCA9IHt9LFxuICAgICAgICAgICAgICAgIHByY3QgPSB7fTtcbiAgICAgICAgICAgIC8vIHdoYXQncyBnb2luZyBvbjpcbiAgICAgICAgICAgIC8vIDEuIEdldCB0aGUgb3JpZ2luYWwgcG9pbnQgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBzdGFnZVxuICAgICAgICAgICAgLy8gMi4gU2NhbGUgdGhlIHN0YWdlXG4gICAgICAgICAgICAvLyAzLiBHZXQgdGhlIG5ldyBzaXplIG9mIHRoZSBzdGFnZVxuICAgICAgICAgICAgLy8gNC4gR2V0IHRoZSBhYnNvbHV0ZSBwb3NpdGlvbiBvZiBvdXIgcG9pbnQgdXNpbmcgcHJldmlvdXMgcGVyY2VudGFnZVxuICAgICAgICAgICAgLy8gNC4gT2Zmc2V0IGlubmVyIGJ5IHRoYXQgbXVjaFxuXG4gICAgICAgICAgICBmdW5jdGlvbiBlbnRlckZyYW1lKCkge1xuICAgICAgICAgICAgICAgIGlmIChkdXIgPiAwKSB7XG5cdFx0XHRcdFx0aWYgKGlzRmluaXRlKENyYWZ0eS52aWV3cG9ydC5fem9vbSkpIHpvb20gPSBDcmFmdHkudmlld3BvcnQuX3pvb207XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYWN0LndpZHRoICogem9vbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogYWN0LmhlaWdodCAqIHpvb21cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgem9vbSArPSB6b29tX3RpY2s7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5fem9vbSA9IHpvb207XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdfcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBhY3Qud2lkdGggKiB6b29tLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBhY3QuaGVpZ2h0ICogem9vbVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkaWZmID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IG5ld19zLndpZHRoIC0gb2xkLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBuZXdfcy5oZWlnaHQgLSBvbGQuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZVtwcm9wXSA9ICdzY2FsZSgnICsgem9vbSArICcsJyArIHpvb20gKyAnKSc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChDcmFmdHkuY2FudmFzLl9jYW52YXMpIHtcblx0XHRcdFx0XHRcdHZhciBjem9vbSA9IHpvb20gLyAoem9vbSAtIHpvb21fdGljayk7XG5cdFx0XHRcdFx0XHRDcmFmdHkuY2FudmFzLmNvbnRleHQuc2NhbGUoY3pvb20sIGN6b29tKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggLT0gZGlmZi53aWR0aCAqIHByY3Qud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55IC09IGRpZmYuaGVpZ2h0ICogcHJjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGR1ci0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhbXQsIGNlbnRfeCwgY2VudF95LCB0aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzIHx8IENyYWZ0eS5tYXAuYm91bmRhcmllcygpLFxuICAgICAgICAgICAgICAgICAgICBmaW5hbF96b29tID0gYW10ID8gem9vbSAqIGFtdCA6IDE7XG5cdFx0XHRcdGlmICghYW10KSB7XHQvLyB3ZSdyZSByZXNldHRpbmcgdG8gZGVmYXVsdHNcblx0XHRcdFx0XHR6b29tID0gMTtcblx0XHRcdFx0XHR0aGlzLl96b29tID0gMTtcblx0XHRcdFx0fVxuXG4gICAgICAgICAgICAgICAgYWN0LndpZHRoID0gYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54O1xuICAgICAgICAgICAgICAgIGFjdC5oZWlnaHQgPSBib3VuZHMubWF4LnkgLSBib3VuZHMubWluLnk7XG5cbiAgICAgICAgICAgICAgICBwcmN0LndpZHRoID0gY2VudF94IC8gYWN0LndpZHRoO1xuICAgICAgICAgICAgICAgIHByY3QuaGVpZ2h0ID0gY2VudF95IC8gYWN0LmhlaWdodDtcblxuICAgICAgICAgICAgICAgIGlmICh0aW1lID09IDApIHRpbWUgPSAxO1xuICAgICAgICAgICAgICAgIHpvb21fdGljayA9IChmaW5hbF96b29tIC0gem9vbSkgLyB0aW1lO1xuICAgICAgICAgICAgICAgIGR1ciA9IHRpbWU7XG5cbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCdyZXNldCcpO1xuICAgICAgICAgICAgICAgIGlmICghYm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmJpbmQoJ0VudGVyRnJhbWUnLCBlbnRlckZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKSxcbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnNjYWxlXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQuc2NhbGUoTnVtYmVyIGFtdClcbiAgICAgICAgICogQHBhcmFtIE51bWJlciBhbXQgLSBhbW91bnQgdG8gem9vbS9zY2FsZSBpbiBvbiB0aGUgZWxlbWVudCBvbiB0aGUgdmlld3BvcnQgYnkgKGVnLiAyLCA0LCAwLjUpXG4gICAgICAgICAqXG4gICAgICAgICAqIFpvb21zL3NjYWxlIHRoZSBjYW1lcmEuIGFtdCA+IDEgaW5jcmVhc2UgYWxsIGVudGl0aWVzIG9uIHN0YWdlIFxuICAgICAgICAgKiBhbXQgPCAxIHdpbGwgcmVkdWNlIGFsbCBlbnRpdGllcyBvbiBzdGFnZS4gYW10ID0gMCB3aWxsIHJlc2V0IHRoZSB6b29tL3NjYWxlLlxuICAgICAgICAgKiBab29taW5nL3NjYWxpbmcgaXMgbXVsdGlwbGljYXRpdmUuIFRvIHJlc2V0IHRoZSB6b29tL3NjYWxlIGFtb3VudCwgcGFzcyAwLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogQ3JhZnR5LnZpZXdwb3J0LnNjYWxlKDIpOyAvL3RvIHNlZSBlZmZlY3QgYWRkIHNvbWUgZW50aXRpZXMgb24gc3RhZ2UuXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgc2NhbGU6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcHJvcCA9IENyYWZ0eS5zdXBwb3J0LnByZWZpeCArIFwiVHJhbnNmb3JtXCIsXG4gICAgICAgICAgICAgICAgYWN0ID0ge307XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFtdCkge1xuICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kcyB8fCBDcmFmdHkubWFwLmJvdW5kYXJpZXMoKSxcbiAgICAgICAgICAgICAgICAgICAgZmluYWxfem9vbSA9IGFtdCA/IHRoaXMuX3pvb20gKiBhbXQgOiAxLFxuXHRcdFx0XHRcdGN6b29tID0gZmluYWxfem9vbSAvIHRoaXMuX3pvb207XG5cbiAgICAgICAgICAgICAgICB0aGlzLl96b29tID0gZmluYWxfem9vbTtcbiAgICAgICAgICAgICAgICBhY3Qud2lkdGggPSBib3VuZHMubWF4LnggLSBib3VuZHMubWluLng7XG4gICAgICAgICAgICAgICAgYWN0LmhlaWdodCA9IGJvdW5kcy5tYXgueSAtIGJvdW5kcy5taW4ueTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3X3MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBhY3Qud2lkdGggKiBmaW5hbF96b29tLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGFjdC5oZWlnaHQgKiBmaW5hbF96b29tXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3Jlc2V0Jyk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlWyd0cmFuc2Zvcm0nXSA9IFxuXHRcdFx0XHRDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGVbcHJvcF0gPSAnc2NhbGUoJyArIHRoaXMuX3pvb20gKyAnLCcgKyB0aGlzLl96b29tICsgJyknO1xuXG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS5jYW52YXMuX2NhbnZhcykge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuY2FudmFzLmNvbnRleHQuc2NhbGUoY3pvb20sIGN6b29tKTtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9DcmFmdHkudmlld3BvcnQud2lkdGggPSBuZXdfcy53aWR0aDtcbiAgICAgICAgICAgICAgICAvL0NyYWZ0eS52aWV3cG9ydC5oZWlnaHQgPSBuZXdfcy5oZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCksXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2tcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soQm9vbGVhbiBhY3RpdmUpXG4gICAgICAgICAqIEBwYXJhbSBCb29sZWFuIGFjdGl2ZSAtIEFjdGl2YXRlIG9yIGRlYWN0aXZhdGUgbW91c2Vsb29rXG4gICAgICAgICAqXG4gICAgICAgICAqIFRvZ2dsZSBtb3VzZWxvb2sgb24gdGhlIGN1cnJlbnQgdmlld3BvcnQuXG4gICAgICAgICAqIFNpbXBseSBjYWxsIHRoaXMgZnVuY3Rpb24gYW5kIHRoZSB1c2VyIHdpbGwgYmUgYWJsZSB0b1xuICAgICAgICAgKiBkcmFnIHRoZSB2aWV3cG9ydCBhcm91bmQuXG4gICAgICAgICAqL1xuICAgICAgICBtb3VzZWxvb2s6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYWN0aXZlID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBsYXN0TW91c2UgPSB7fVxuICAgICAgICAgICAgb2xkID0ge307XG5cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvcCwgYXJnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcCA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlID0gb3A7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS5tb3VzZU9ianMrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS5tb3VzZU9ianMgPSBNYXRoLm1heCgwLCBDcmFmdHkubW91c2VPYmpzIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWFjdGl2ZSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAob3ApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW92ZSc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RyYWcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBhcmcuY2xpZW50WCAtIGxhc3RNb3VzZS54LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGFyZy5jbGllbnRZIC0gbGFzdE1vdXNlLnlcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54ICs9IGRpZmYueDtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ICs9IGRpZmYueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5fY2xhbXAoKTsgXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0YXJ0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RNb3VzZS54ID0gYXJnLmNsaWVudFg7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0TW91c2UueSA9IGFyZy5jbGllbnRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKCksXG4gICAgICAgIF9jbGFtcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gY2xhbXBzIHRoZSB2aWV3cG9ydCB0byB0aGUgdmlld2FibGUgYXJlYVxuICAgICAgICAgICAgLy8gdW5kZXIgbm8gY2lyY3Vtc3RhbmNlcyBzaG91bGQgdGhlIHZpZXdwb3J0IHNlZSBzb21ldGhpbmcgb3V0c2lkZSB0aGUgYm91bmRhcnkgb2YgdGhlICd3b3JsZCdcbiAgICAgICAgICAgIGlmICghdGhpcy5jbGFtcFRvRW50aXRpZXMpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBib3VuZCA9IHRoaXMuYm91bmRzIHx8IENyYWZ0eS5tYXAuYm91bmRhcmllcygpO1xuXHRcdFx0Ym91bmQubWF4LnggKj0gdGhpcy5fem9vbTtcblx0XHRcdGJvdW5kLm1pbi54ICo9IHRoaXMuX3pvb207XG5cdFx0XHRib3VuZC5tYXgueSAqPSB0aGlzLl96b29tO1xuXHRcdFx0Ym91bmQubWluLnkgKj0gdGhpcy5fem9vbTtcbiAgICAgICAgICAgIGlmIChib3VuZC5tYXgueCAtIGJvdW5kLm1pbi54ID4gQ3JhZnR5LnZpZXdwb3J0LndpZHRoKSB7XG4gICAgICAgICAgICAgICAgYm91bmQubWF4LnggLT0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoO1xuXG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS52aWV3cG9ydC54IDwgLWJvdW5kLm1heC54KSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54ID0gLWJvdW5kLm1heC54O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDcmFmdHkudmlld3BvcnQueCA+IC1ib3VuZC5taW4ueCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCA9IC1ib3VuZC5taW4ueDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCA9IC0xICogKGJvdW5kLm1pbi54ICsgKGJvdW5kLm1heC54IC0gYm91bmQubWluLngpIC8gMiAtIENyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJvdW5kLm1heC55IC0gYm91bmQubWluLnkgPiBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgYm91bmQubWF4LnkgLT0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblxuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkudmlld3BvcnQueSA8IC1ib3VuZC5tYXgueSkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSA9IC1ib3VuZC5tYXgueTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoQ3JhZnR5LnZpZXdwb3J0LnkgPiAtYm91bmQubWluLnkpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgPSAtYm91bmQubWluLnk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgPSAtMSAqIChib3VuZC5taW4ueSArIChib3VuZC5tYXgueSAtIGJvdW5kLm1pbi55KSAvIDIgLSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LmluaXRcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5pbml0KFtOdW1iZXIgd2lkdGgsIE51bWJlciBoZWlnaHRdKVxuICAgICAgICAgKiBAcGFyYW0gd2lkdGggLSBXaWR0aCBvZiB0aGUgdmlld3BvcnRcbiAgICAgICAgICogQHBhcmFtIGhlaWdodCAtIEhlaWdodCBvZiB0aGUgdmlld3BvcnRcbiAgICAgICAgICpcbiAgICAgICAgICogSW5pdGlhbGl6ZSB0aGUgdmlld3BvcnQuIElmIHRoZSBhcmd1bWVudHMgJ3dpZHRoJyBvciAnaGVpZ2h0JyBhcmUgbWlzc2luZywgb3IgQ3JhZnR5Lm1vYmlsZSBpcyB0cnVlLCB1c2UgQ3JhZnR5LkRPTS53aW5kb3cud2lkdGggYW5kIENyYWZ0eS5ET00ud2luZG93LmhlaWdodCAoZnVsbCBzY3JlZW4gbW9kZWwpLlxuICAgICAgICAgKiBDcmVhdGUgYSBkaXYgd2l0aCBpZCBgY3Itc3RhZ2VgLCBpZiB0aGVyZSBpcyBub3QgYWxyZWFkeSBhbiBIVE1MRWxlbWVudCB3aXRoIGlkIGBjci1zdGFnZWAgKGJ5IGBDcmFmdHkudmlld3BvcnQuaW5pdGApLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAc2VlIENyYWZ0eS5kZXZpY2UsIENyYWZ0eS5ET00sIENyYWZ0eS5zdGFnZVxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKHcsIGgpIHtcbiAgICAgICAgICAgIENyYWZ0eS5ET00ud2luZG93LmluaXQoKTtcblxuICAgICAgICAgICAgLy9mdWxsc2NyZWVuIGlmIG1vYmlsZSBvciBub3Qgc3BlY2lmaWVkXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gKCF3IHx8IENyYWZ0eS5tb2JpbGUpID8gQ3JhZnR5LkRPTS53aW5kb3cud2lkdGggOiB3O1xuICAgICAgICAgICAgdGhpcy5oZWlnaHQgPSAoIWggfHwgQ3JhZnR5Lm1vYmlsZSkgPyBDcmFmdHkuRE9NLndpbmRvdy5oZWlnaHQgOiBoO1xuXG4gICAgICAgICAgICAvL2NoZWNrIGlmIHN0YWdlIGV4aXN0c1xuICAgICAgICAgICAgdmFyIGNyc3RhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNyLXN0YWdlXCIpO1xuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAgKiAjQ3JhZnR5LnN0YWdlXG4gICAgICAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAgICAgICogVGhlIHN0YWdlIHdoZXJlIGFsbCB0aGUgRE9NIGVudGl0aWVzIHdpbGwgYmUgcGxhY2VkLlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICAqICNDcmFmdHkuc3RhZ2UuZWxlbVxuICAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnN0YWdlXG4gICAgICAgICAgICAgKiBUaGUgYCNjci1zdGFnZWAgZGl2IGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgICogI0NyYWZ0eS5zdGFnZS5pbm5lclxuICAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnN0YWdlXG4gICAgICAgICAgICAgKiBgQ3JhZnR5LnN0YWdlLmlubmVyYCBpcyBhIGRpdiBpbnNpZGUgdGhlIGAjY3Itc3RhZ2VgIGRpdiB0aGF0IGhvbGRzIGFsbCBET00gZW50aXRpZXMuXG4gICAgICAgICAgICAgKiBJZiB5b3UgdXNlIGNhbnZhcywgYSBgY2FudmFzYCBlbGVtZW50IGlzIGNyZWF0ZWQgYXQgdGhlIHNhbWUgbGV2ZWwgaW4gdGhlIGRvbVxuICAgICAgICAgICAgICogYXMgdGhlIHRoZSBgQ3JhZnR5LnN0YWdlLmlubmVyYCBkaXYuIFNvIHRoZSBoaWVyYXJjaHkgaW4gdGhlIERPTSBpc1xuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBgQ3JhZnR5LnN0YWdlLmVsZW1gXG4gICAgICAgICAgICAgKiA8IS0tIG5vdCBzdXJlIGhvdyB0byBkbyBpbmRlbnRhdGlvbiBpbiB0aGUgZG9jdW1lbnQtLT5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiAgICAgLSBgQ3JhZnR5LnN0YWdlLmlubmVyYCAoYSBkaXYgSFRNTEVsZW1lbnQpXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogICAgIC0gYENyYWZ0eS5jYW52YXMuX2NhbnZhc2AgKGEgY2FudmFzIEhUTUxFbGVtZW50KSBcbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvL2NyZWF0ZSBzdGFnZSBkaXYgdG8gY29udGFpbiBldmVyeXRoaW5nXG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UgPSB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIGZ1bGxzY3JlZW46IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVsZW06IChjcnN0YWdlID8gY3JzdGFnZSA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikpLFxuICAgICAgICAgICAgICAgIGlubmVyOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvL2Z1bGxzY3JlZW4sIHN0b3Agc2Nyb2xsYmFyc1xuICAgICAgICAgICAgaWYgKCghdyAmJiAhaCkgfHwgQ3JhZnR5Lm1vYmlsZSkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5mdWxsc2NyZWVuID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgXCJyZXNpemVcIiwgQ3JhZnR5LnZpZXdwb3J0LnJlbG9hZCk7XG5cbiAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csIFwiYmx1clwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS5zZXR0aW5ncy5nZXQoXCJhdXRvUGF1c2VcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIUNyYWZ0eS5fcGF1c2VkKSBDcmFmdHkucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csIFwiZm9jdXNcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkuX3BhdXNlZCAmJiBDcmFmdHkuc2V0dGluZ3MuZ2V0KFwiYXV0b1BhdXNlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvL21ha2UgdGhlIHN0YWdlIHVuc2VsZWN0YWJsZVxuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyKFwic3RhZ2VTZWxlY3RhYmxlXCIsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0ub25zZWxlY3RzdGFydCA9IHYgPyBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9IDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5tb2RpZnkoXCJzdGFnZVNlbGVjdGFibGVcIiwgZmFsc2UpO1xuXG4gICAgICAgICAgICAvL21ha2UgdGhlIHN0YWdlIGhhdmUgbm8gY29udGV4dCBtZW51XG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIoXCJzdGFnZUNvbnRleHRNZW51XCIsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0ub25jb250ZXh0bWVudSA9IHYgPyBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9IDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5tb2RpZnkoXCJzdGFnZUNvbnRleHRNZW51XCIsIGZhbHNlKTtcblxuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyKFwiYXV0b1BhdXNlXCIsIGZ1bmN0aW9uICgpeyB9KTtcbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5tb2RpZnkoXCJhdXRvUGF1c2VcIiwgZmFsc2UpO1xuXG4gICAgICAgICAgICAvL2FkZCB0byB0aGUgYm9keSBhbmQgZ2l2ZSBpdCBhbiBJRCBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICBpZiAoIWNyc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKENyYWZ0eS5zdGFnZS5lbGVtKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5pZCA9IFwiY3Itc3RhZ2VcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZW0gPSBDcmFmdHkuc3RhZ2UuZWxlbS5zdHlsZSxcbiAgICAgICAgICAgICAgICBvZmZzZXQ7XG5cbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLmFwcGVuZENoaWxkKENyYWZ0eS5zdGFnZS5pbm5lcik7XG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGUuekluZGV4ID0gXCIxXCI7XG5cbiAgICAgICAgICAgIC8vY3NzIHN0eWxlXG4gICAgICAgICAgICBlbGVtLndpZHRoID0gdGhpcy53aWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIGVsZW0uaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICBlbGVtLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcblxuICAgICAgICAgICAgaWYgKENyYWZ0eS5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICBlbGVtLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICAgICAgICAgIGVsZW0ubGVmdCA9IFwiMHB4XCI7XG4gICAgICAgICAgICAgICAgZWxlbS50b3AgPSBcIjBweFwiO1xuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGRlZmF1bHQgZ3JheSBoaWdobGlnaHRpbmcgYWZ0ZXIgdG91Y2hcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVsZW0ud2Via2l0VGFwSGlnaGxpZ2h0Q29sb3IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0ud2Via2l0VGFwSGlnaGxpZ2h0Q29sb3IgPSBcInJnYmEoMCwwLDAsMClcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgbWV0YSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJtZXRhXCIpLFxuICAgICAgICAgICAgICAgICAgICBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJIRUFEXCIpWzBdO1xuXG4gICAgICAgICAgICAgICAgLy9zdG9wIG1vYmlsZSB6b29taW5nIGFuZCBzY3JvbGxpbmdcbiAgICAgICAgICAgICAgICBtZXRhLnNldEF0dHJpYnV0ZShcIm5hbWVcIiwgXCJ2aWV3cG9ydFwiKTtcbiAgICAgICAgICAgICAgICBtZXRhLnNldEF0dHJpYnV0ZShcImNvbnRlbnRcIiwgXCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MSwgbWF4aW11bS1zY2FsZT0xLCB1c2VyLXNjYWxhYmxlPW5vXCIpO1xuICAgICAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQobWV0YSk7XG5cbiAgICAgICAgICAgICAgICAvL2hpZGUgdGhlIGFkZHJlc3MgYmFyXG4gICAgICAgICAgICAgICAgbWV0YSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJtZXRhXCIpO1xuICAgICAgICAgICAgICAgIG1ldGEuc2V0QXR0cmlidXRlKFwibmFtZVwiLCBcImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGVcIik7XG4gICAgICAgICAgICAgICAgbWV0YS5zZXRBdHRyaWJ1dGUoXCJjb250ZW50XCIsIFwieWVzXCIpO1xuICAgICAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQobWV0YSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHdpbmRvdy5zY3JvbGxUbygwLCAxKTsgfSwgMCk7XG5cbiAgICAgICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCBcInRvdWNobW92ZVwiLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UueCA9IDA7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnkgPSAwO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW0ucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgICAgICAgICAgLy9maW5kIG91dCB0aGUgb2Zmc2V0IHBvc2l0aW9uIG9mIHRoZSBzdGFnZVxuICAgICAgICAgICAgICAgIG9mZnNldCA9IENyYWZ0eS5ET00uaW5uZXIoQ3JhZnR5LnN0YWdlLmVsZW0pO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS54ID0gb2Zmc2V0Lng7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnkgPSBvZmZzZXQueTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdXBwb3J0LnNldHRlcikge1xuICAgICAgICAgICAgICAgIC8vZGVmaW5lIGdldHRlcnMgYW5kIHNldHRlcnMgdG8gc2Nyb2xsIHRoZSB2aWV3cG9ydFxuICAgICAgICAgICAgICAgIHRoaXMuX19kZWZpbmVTZXR0ZXJfXygneCcsIGZ1bmN0aW9uICh2KSB7IHRoaXMuc2Nyb2xsKCdfeCcsIHYpOyB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3knLCBmdW5jdGlvbiAodikgeyB0aGlzLnNjcm9sbCgnX3knLCB2KTsgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZUdldHRlcl9fKCd4JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feDsgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZUdldHRlcl9fKCd5JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feTsgfSk7XG4gICAgICAgICAgICAgICAgLy9JRTlcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQ3JhZnR5LnN1cHBvcnQuZGVmaW5lUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3gnLCB7IHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5zY3JvbGwoJ194Jywgdik7IH0sIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feDsgfSB9KTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3knLCB7IHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5zY3JvbGwoJ195Jywgdik7IH0sIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feTsgfSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgZW1wdHkgZW50aXR5IHdhaXRpbmcgZm9yIGVudGVyZnJhbWVcbiAgICAgICAgICAgICAgICB0aGlzLnggPSB0aGlzLl94O1xuICAgICAgICAgICAgICAgIHRoaXMueSA9IHRoaXMuX3k7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LmUoXCJ2aWV3cG9ydFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQucmVsb2FkXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS5zdGFnZVxuICAgICAgICAgKiBcbiAgICAgICAgICogQHNpZ24gcHVibGljIENyYWZ0eS52aWV3cG9ydC5yZWxvYWQoKVxuICAgICAgICAgKiBcbiAgICAgICAgICogUmVjYWxjdWxhdGUgYW5kIHJlbG9hZCBzdGFnZSB3aWR0aCwgaGVpZ2h0IGFuZCBwb3NpdGlvbi5cbiAgICAgICAgICogVXNlZnVsIHdoZW4gYnJvd3NlciByZXR1cm4gd3JvbmcgcmVzdWx0cyBvbiBpbml0IChsaWtlIHNhZmFyaSBvbiBJcGFkMikuXG4gICAgICAgICAqIFxuICAgICAgICAgKi9cbiAgICAgICAgcmVsb2FkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgQ3JhZnR5LkRPTS53aW5kb3cuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHcgPSBDcmFmdHkuRE9NLndpbmRvdy53aWR0aCxcbiAgICAgICAgICAgICAgICBoID0gQ3JhZnR5LkRPTS53aW5kb3cuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIG9mZnNldDtcblxuXG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN0YWdlLmZ1bGxzY3JlZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLndpZHRoID0gdztcbiAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCA9IGg7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0uc3R5bGUud2lkdGggPSB3ICsgXCJweFwiO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLnN0eWxlLmhlaWdodCA9IGggKyBcInB4XCI7XG5cbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LmNhbnZhcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5jYW52YXMuX2NhbnZhcy53aWR0aCA9IHc7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5jYW52YXMuX2NhbnZhcy5oZWlnaHQgPSBoO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2Zmc2V0ID0gQ3JhZnR5LkRPTS5pbm5lcihDcmFmdHkuc3RhZ2UuZWxlbSk7XG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UueCA9IG9mZnNldC54O1xuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnkgPSBvZmZzZXQueTtcbiAgICAgICAgfSxcblx0XHRcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS52aWV3cG9ydC5yZXNldFxuXHRcdCAqIEBjb21wIENyYWZ0eS5zdGFnZVxuXHRcdCAqXG5cdFx0ICogQHNpZ24gcHVibGljIENyYWZ0eS52aWV3cG9ydC5yZXNldCgpXG5cdFx0ICpcblx0XHQgKiBSZXNldHMgdGhlIHZpZXdwb3J0IHRvIHN0YXJ0aW5nIHZhbHVlc1xuXHRcdCAqIENhbGxlZCB3aGVuIHNjZW5lKCkgaXMgcnVuLlxuXHRcdCAqL1xuXHRcdHJlc2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRDcmFmdHkudmlld3BvcnQucGFuKCdyZXNldCcpO1xuXHRcdFx0Q3JhZnR5LnZpZXdwb3J0LmZvbGxvdygpO1xuXHRcdFx0Q3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vaygnc3RvcCcpO1xuXHRcdFx0Q3JhZnR5LnZpZXdwb3J0LnNjYWxlKCk7XG5cdFx0fVxuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmtleXNcbiAgICAqIEBjYXRlZ29yeSBJbnB1dFxuICAgICogT2JqZWN0IG9mIGtleSBuYW1lcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcga2V5IGNvZGUuXG4gICAgKiBcbiAgICAqIH5+flxuICAgICogQkFDS1NQQUNFOiA4LFxuICAgICogVEFCOiA5LFxuICAgICogRU5URVI6IDEzLFxuICAgICogUEFVU0U6IDE5LFxuICAgICogQ0FQUzogMjAsXG4gICAgKiBFU0M6IDI3LFxuICAgICogU1BBQ0U6IDMyLFxuICAgICogUEFHRV9VUDogMzMsXG4gICAgKiBQQUdFX0RPV046IDM0LFxuICAgICogRU5EOiAzNSxcbiAgICAqIEhPTUU6IDM2LFxuICAgICogTEVGVF9BUlJPVzogMzcsXG4gICAgKiBVUF9BUlJPVzogMzgsXG4gICAgKiBSSUdIVF9BUlJPVzogMzksXG4gICAgKiBET1dOX0FSUk9XOiA0MCxcbiAgICAqIElOU0VSVDogNDUsXG4gICAgKiBERUxFVEU6IDQ2LFxuICAgICogMDogNDgsXG4gICAgKiAxOiA0OSxcbiAgICAqIDI6IDUwLFxuICAgICogMzogNTEsXG4gICAgKiA0OiA1MixcbiAgICAqIDU6IDUzLFxuICAgICogNjogNTQsXG4gICAgKiA3OiA1NSxcbiAgICAqIDg6IDU2LFxuICAgICogOTogNTcsXG4gICAgKiBBOiA2NSxcbiAgICAqIEI6IDY2LFxuICAgICogQzogNjcsXG4gICAgKiBEOiA2OCxcbiAgICAqIEU6IDY5LFxuICAgICogRjogNzAsXG4gICAgKiBHOiA3MSxcbiAgICAqIEg6IDcyLFxuICAgICogSTogNzMsXG4gICAgKiBKOiA3NCxcbiAgICAqIEs6IDc1LFxuICAgICogTDogNzYsXG4gICAgKiBNOiA3NyxcbiAgICAqIE46IDc4LFxuICAgICogTzogNzksXG4gICAgKiBQOiA4MCxcbiAgICAqIFE6IDgxLFxuICAgICogUjogODIsXG4gICAgKiBTOiA4MyxcbiAgICAqIFQ6IDg0LFxuICAgICogVTogODUsXG4gICAgKiBWOiA4NixcbiAgICAqIFc6IDg3LFxuICAgICogWDogODgsXG4gICAgKiBZOiA4OSxcbiAgICAqIFo6IDkwLFxuICAgICogTlVNUEFEXzA6IDk2LFxuICAgICogTlVNUEFEXzE6IDk3LFxuICAgICogTlVNUEFEXzI6IDk4LFxuICAgICogTlVNUEFEXzM6IDk5LFxuICAgICogTlVNUEFEXzQ6IDEwMCxcbiAgICAqIE5VTVBBRF81OiAxMDEsXG4gICAgKiBOVU1QQURfNjogMTAyLFxuICAgICogTlVNUEFEXzc6IDEwMyxcbiAgICAqIE5VTVBBRF84OiAxMDQsXG4gICAgKiBOVU1QQURfOTogMTA1LFxuICAgICogTVVMVElQTFk6IDEwNixcbiAgICAqIEFERDogMTA3LFxuICAgICogU1VCU1RSQUNUOiAxMDksXG4gICAgKiBERUNJTUFMOiAxMTAsXG4gICAgKiBESVZJREU6IDExMSxcbiAgICAqIEYxOiAxMTIsXG4gICAgKiBGMjogMTEzLFxuICAgICogRjM6IDExNCxcbiAgICAqIEY0OiAxMTUsXG4gICAgKiBGNTogMTE2LFxuICAgICogRjY6IDExNyxcbiAgICAqIEY3OiAxMTgsXG4gICAgKiBGODogMTE5LFxuICAgICogRjk6IDEyMCxcbiAgICAqIEYxMDogMTIxLFxuICAgICogRjExOiAxMjIsXG4gICAgKiBGMTI6IDEyMyxcbiAgICAqIFNISUZUOiAxNixcbiAgICAqIENUUkw6IDE3LFxuICAgICogQUxUOiAxOCxcbiAgICAqIFBMVVM6IDE4NyxcbiAgICAqIENPTU1BOiAxODgsXG4gICAgKiBNSU5VUzogMTg5LFxuICAgICogUEVSSU9EOiAxOTAsXG4gICAgKiBQVUxUX1VQOiAyOTQ2MCxcbiAgICAqIFBVTFRfRE9XTjogMjk0NjEsXG4gICAgKiBQVUxUX0xFRlQ6IDQsXG4gICAgKiBQVUxUX1JJR0hUJzogNVxuICAgICogfn5+XG4gICAgKi9cbiAgICBrZXlzOiB7XG4gICAgICAgICdCQUNLU1BBQ0UnOiA4LFxuICAgICAgICAnVEFCJzogOSxcbiAgICAgICAgJ0VOVEVSJzogMTMsXG4gICAgICAgICdQQVVTRSc6IDE5LFxuICAgICAgICAnQ0FQUyc6IDIwLFxuICAgICAgICAnRVNDJzogMjcsXG4gICAgICAgICdTUEFDRSc6IDMyLFxuICAgICAgICAnUEFHRV9VUCc6IDMzLFxuICAgICAgICAnUEFHRV9ET1dOJzogMzQsXG4gICAgICAgICdFTkQnOiAzNSxcbiAgICAgICAgJ0hPTUUnOiAzNixcbiAgICAgICAgJ0xFRlRfQVJST1cnOiAzNyxcbiAgICAgICAgJ1VQX0FSUk9XJzogMzgsXG4gICAgICAgICdSSUdIVF9BUlJPVyc6IDM5LFxuICAgICAgICAnRE9XTl9BUlJPVyc6IDQwLFxuICAgICAgICAnSU5TRVJUJzogNDUsXG4gICAgICAgICdERUxFVEUnOiA0NixcbiAgICAgICAgJzAnOiA0OCxcbiAgICAgICAgJzEnOiA0OSxcbiAgICAgICAgJzInOiA1MCxcbiAgICAgICAgJzMnOiA1MSxcbiAgICAgICAgJzQnOiA1MixcbiAgICAgICAgJzUnOiA1MyxcbiAgICAgICAgJzYnOiA1NCxcbiAgICAgICAgJzcnOiA1NSxcbiAgICAgICAgJzgnOiA1NixcbiAgICAgICAgJzknOiA1NyxcbiAgICAgICAgJ0EnOiA2NSxcbiAgICAgICAgJ0InOiA2NixcbiAgICAgICAgJ0MnOiA2NyxcbiAgICAgICAgJ0QnOiA2OCxcbiAgICAgICAgJ0UnOiA2OSxcbiAgICAgICAgJ0YnOiA3MCxcbiAgICAgICAgJ0cnOiA3MSxcbiAgICAgICAgJ0gnOiA3MixcbiAgICAgICAgJ0knOiA3MyxcbiAgICAgICAgJ0onOiA3NCxcbiAgICAgICAgJ0snOiA3NSxcbiAgICAgICAgJ0wnOiA3NixcbiAgICAgICAgJ00nOiA3NyxcbiAgICAgICAgJ04nOiA3OCxcbiAgICAgICAgJ08nOiA3OSxcbiAgICAgICAgJ1AnOiA4MCxcbiAgICAgICAgJ1EnOiA4MSxcbiAgICAgICAgJ1InOiA4MixcbiAgICAgICAgJ1MnOiA4MyxcbiAgICAgICAgJ1QnOiA4NCxcbiAgICAgICAgJ1UnOiA4NSxcbiAgICAgICAgJ1YnOiA4NixcbiAgICAgICAgJ1cnOiA4NyxcbiAgICAgICAgJ1gnOiA4OCxcbiAgICAgICAgJ1knOiA4OSxcbiAgICAgICAgJ1onOiA5MCxcbiAgICAgICAgJ05VTVBBRF8wJzogOTYsXG4gICAgICAgICdOVU1QQURfMSc6IDk3LFxuICAgICAgICAnTlVNUEFEXzInOiA5OCxcbiAgICAgICAgJ05VTVBBRF8zJzogOTksXG4gICAgICAgICdOVU1QQURfNCc6IDEwMCxcbiAgICAgICAgJ05VTVBBRF81JzogMTAxLFxuICAgICAgICAnTlVNUEFEXzYnOiAxMDIsXG4gICAgICAgICdOVU1QQURfNyc6IDEwMyxcbiAgICAgICAgJ05VTVBBRF84JzogMTA0LFxuICAgICAgICAnTlVNUEFEXzknOiAxMDUsXG4gICAgICAgICdNVUxUSVBMWSc6IDEwNixcbiAgICAgICAgJ0FERCc6IDEwNyxcbiAgICAgICAgJ1NVQlNUUkFDVCc6IDEwOSxcbiAgICAgICAgJ0RFQ0lNQUwnOiAxMTAsXG4gICAgICAgICdESVZJREUnOiAxMTEsXG4gICAgICAgICdGMSc6IDExMixcbiAgICAgICAgJ0YyJzogMTEzLFxuICAgICAgICAnRjMnOiAxMTQsXG4gICAgICAgICdGNCc6IDExNSxcbiAgICAgICAgJ0Y1JzogMTE2LFxuICAgICAgICAnRjYnOiAxMTcsXG4gICAgICAgICdGNyc6IDExOCxcbiAgICAgICAgJ0Y4JzogMTE5LFxuICAgICAgICAnRjknOiAxMjAsXG4gICAgICAgICdGMTAnOiAxMjEsXG4gICAgICAgICdGMTEnOiAxMjIsXG4gICAgICAgICdGMTInOiAxMjMsXG4gICAgICAgICdTSElGVCc6IDE2LFxuICAgICAgICAnQ1RSTCc6IDE3LFxuICAgICAgICAnQUxUJzogMTgsXG4gICAgICAgICdQTFVTJzogMTg3LFxuICAgICAgICAnQ09NTUEnOiAxODgsXG4gICAgICAgICdNSU5VUyc6IDE4OSxcbiAgICAgICAgJ1BFUklPRCc6IDE5MCxcbiAgICAgICAgJ1BVTFRfVVAnOiAyOTQ2MCxcbiAgICAgICAgJ1BVTFRfRE9XTic6IDI5NDYxLFxuICAgICAgICAnUFVMVF9MRUZUJzogNCxcbiAgICAgICAgJ1BVTFRfUklHSFQnOiA1XG5cbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5tb3VzZUJ1dHRvbnNcbiAgICAqIEBjYXRlZ29yeSBJbnB1dFxuICAgICogT2JqZWN0IG9mIG1vdXNlQnV0dG9uIG5hbWVzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBidXR0b24gSUQuXG4gICAgKiBJbiBhbGwgbW91c2VFdmVudHMgd2UgYWRkIHRoZSBlLm1vdXNlQnV0dG9uIHByb3BlcnR5IHdpdGggYSB2YWx1ZSBub3JtYWxpemVkIHRvIG1hdGNoIGUuYnV0dG9uIG9mIG1vZGVybiB3ZWJraXRcbiAgICAqIFxuICAgICogfn5+XG4gICAgKiBMRUZUOiAwLFxuICAgICogTUlERExFOiAxLFxuICAgICogUklHSFQ6IDJcbiAgICAqIH5+flxuICAgICovXG4gICAgbW91c2VCdXR0b25zOiB7XG4gICAgICAgIExFRlQ6IDAsXG4gICAgICAgIE1JRERMRTogMSxcbiAgICAgICAgUklHSFQ6IDJcbiAgICB9XG59KTtcblxuXG5cbi8qKlxuKiBFbnRpdHkgZml4ZXMgdGhlIGxhY2sgb2Ygc2V0dGVyIHN1cHBvcnRcbiovXG5DcmFmdHkuYyhcInZpZXdwb3J0XCIsIHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKENyYWZ0eS52aWV3cG9ydC5feCAhPT0gQ3JhZnR5LnZpZXdwb3J0LngpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKCdfeCcsIENyYWZ0eS52aWV3cG9ydC54KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKENyYWZ0eS52aWV3cG9ydC5feSAhPT0gQ3JhZnR5LnZpZXdwb3J0LnkpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKCdfeScsIENyYWZ0eS52aWV3cG9ydC55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbkNyYWZ0eS5leHRlbmQoe1xuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuZGV2aWNlXG4gICAgKiBAY2F0ZWdvcnkgTWlzY1xuICAgICovXG4gICAgZGV2aWNlIDoge1xuICAgICAgICBfZGV2aWNlT3JpZW50YXRpb25DYWxsYmFjayA6IGZhbHNlLFxuICAgICAgICBfZGV2aWNlTW90aW9uQ2FsbGJhY2sgOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgKiBUaGUgSFRNTDUgRGV2aWNlT3JpZW50YXRpb24gZXZlbnQgcmV0dXJucyB0aHJlZSBwaWVjZXMgb2YgZGF0YTpcbiAgICAgICAgKiAgKiBhbHBoYSB0aGUgZGlyZWN0aW9uIHRoZSBkZXZpY2UgaXMgZmFjaW5nIGFjY29yZGluZyB0byB0aGUgY29tcGFzc1xuICAgICAgICAqICAqIGJldGEgdGhlIGFuZ2xlIGluIGRlZ3JlZXMgdGhlIGRldmljZSBpcyB0aWx0ZWQgZnJvbnQtdG8tYmFja1xuICAgICAgICAqICAqIGdhbW1hIHRoZSBhbmdsZSBpbiBkZWdyZWVzIHRoZSBkZXZpY2UgaXMgdGlsdGVkIGxlZnQtdG8tcmlnaHQuXG4gICAgICAgICogICogVGhlIGFuZ2xlcyB2YWx1ZXMgaW5jcmVhc2UgYXMgeW91IHRpbHQgdGhlIGRldmljZSB0byB0aGUgcmlnaHQgb3IgdG93YXJkcyB5b3UuXG4gICAgICAgICpcbiAgICAgICAgKiBTaW5jZSBGaXJlZm94IHVzZXMgdGhlIE1vek9yaWVudGF0aW9uRXZlbnQgd2hpY2ggcmV0dXJucyBzaW1pbGFyIGRhdGEgYnV0XG4gICAgICAgICogdXNpbmcgZGlmZmVyZW50IHBhcmFtZXRlcnMgYW5kIGEgZGlmZmVyZW50IG1lYXN1cmVtZW50IHN5c3RlbSwgd2Ugd2FudCB0b1xuICAgICAgICAqIG5vcm1hbGl6ZSB0aGF0IGJlZm9yZSB3ZSBwYXNzIGl0IHRvIG91ciBfZGV2aWNlT3JpZW50YXRpb25DYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgKlxuICAgICAgICAqIEBwYXJhbSBldmVudERhdGEgSFRNTDUgRGV2aWNlT3JpZW50YXRpb24gZXZlbnRcbiAgICAgICAgKi9cbiAgICAgICAgX25vcm1hbGl6ZURldmljZU9yaWVudGF0aW9uIDogZnVuY3Rpb24oZXZlbnREYXRhKSB7XG4gICAgICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgICAgIGlmICh3aW5kb3cuRGV2aWNlT3JpZW50YXRpb25FdmVudCkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdhbW1hIGlzIHRoZSBsZWZ0LXRvLXJpZ2h0IHRpbHQgaW4gZGVncmVlcywgd2hlcmUgcmlnaHQgaXMgcG9zaXRpdmVcbiAgICAgICAgICAgICAgICAgICAgJ3RpbHRMUicgICAgOiAgICBldmVudERhdGEuZ2FtbWEsXG4gICAgICAgICAgICAgICAgICAgIC8vIGJldGEgaXMgdGhlIGZyb250LXRvLWJhY2sgdGlsdCBpbiBkZWdyZWVzLCB3aGVyZSBmcm9udCBpcyBwb3NpdGl2ZVxuICAgICAgICAgICAgICAgICAgICAndGlsdEZCJyAgICA6ICAgICBldmVudERhdGEuYmV0YSxcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxwaGEgaXMgdGhlIGNvbXBhc3MgZGlyZWN0aW9uIHRoZSBkZXZpY2UgaXMgZmFjaW5nIGluIGRlZ3JlZXNcbiAgICAgICAgICAgICAgICAgICAgJ2RpcicgICAgICAgICA6ICAgICBldmVudERhdGEuYWxwaGEsXG4gICAgICAgICAgICAgICAgICAgIC8vIGRldmljZW9yaWVudGF0aW9uIGRvZXMgbm90IHByb3ZpZGUgdGhpcyBkYXRhXG4gICAgICAgICAgICAgICAgICAgICdtb3RVRCcgICAgIDogICAgIG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5PcmllbnRhdGlvbkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgLy8geCBpcyB0aGUgbGVmdC10by1yaWdodCB0aWx0IGZyb20gLTEgdG8gKzEsIHNvIHdlIG5lZWQgdG8gY29udmVydCB0byBkZWdyZWVzXG4gICAgICAgICAgICAgICAgICAgICd0aWx0TFInICAgIDogICAgZXZlbnREYXRhLnggKiA5MCxcbiAgICAgICAgICAgICAgICAgICAgLy8geSBpcyB0aGUgZnJvbnQtdG8tYmFjayB0aWx0IGZyb20gLTEgdG8gKzEsIHNvIHdlIG5lZWQgdG8gY29udmVydCB0byBkZWdyZWVzXG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGFsc28gbmVlZCB0byBpbnZlcnQgdGhlIHZhbHVlIHNvIHRpbHRpbmcgdGhlIGRldmljZSB0b3dhcmRzIHVzIChmb3J3YXJkKVxuICAgICAgICAgICAgICAgICAgICAvLyByZXN1bHRzIGluIGEgcG9zaXRpdmUgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICd0aWx0RkInICAgIDogICAgIGV2ZW50RGF0YS55ICogLTkwLFxuICAgICAgICAgICAgICAgICAgICAvLyBNb3pPcmllbnRhdGlvbiBkb2VzIG5vdCBwcm92aWRlIHRoaXMgZGF0YVxuICAgICAgICAgICAgICAgICAgICAnZGlyJyAgICAgICAgIDogICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgIC8vIHogaXMgdGhlIHZlcnRpY2FsIGFjY2VsZXJhdGlvbiBvZiB0aGUgZGV2aWNlXG4gICAgICAgICAgICAgICAgICAgICdtb3RVRCcgICAgIDogICAgIGV2ZW50RGF0YS56XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDcmFmdHkuZGV2aWNlLl9kZXZpY2VPcmllbnRhdGlvbkNhbGxiYWNrKGRhdGEpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAqIEBwYXJhbSBldmVudERhdGEgSFRNTDUgRGV2aWNlTW90aW9uIGV2ZW50XG4gICAgICAgICovXG4gICAgICAgIF9ub3JtYWxpemVEZXZpY2VNb3Rpb24gOiBmdW5jdGlvbihldmVudERhdGEpIHtcbiAgICAgICAgICAgIHZhciBhY2NlbGVyYXRpb24gICAgPSBldmVudERhdGEuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSxcbiAgICAgICAgICAgICAgICBmYWNpbmdVcCAgICAgICAgPSAoYWNjZWxlcmF0aW9uLnogPiAwKSA/ICsxIDogLTE7XG5cbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIC8vIEdyYWIgdGhlIGFjY2VsZXJhdGlvbiBpbmNsdWRpbmcgZ3Jhdml0eSBmcm9tIHRoZSByZXN1bHRzXG4gICAgICAgICAgICAgICAgJ2FjY2VsZXJhdGlvbicgOiBhY2NlbGVyYXRpb24sXG4gICAgICAgICAgICAgICAgJ3Jhd0FjY2VsZXJhdGlvbicgOiBcIltcIisgIE1hdGgucm91bmQoYWNjZWxlcmF0aW9uLngpICtcIiwgXCIrTWF0aC5yb3VuZChhY2NlbGVyYXRpb24ueSkgKyBcIiwgXCIgKyBNYXRoLnJvdW5kKGFjY2VsZXJhdGlvbi56KSArIFwiXVwiLFxuICAgICAgICAgICAgICAgIC8vIFogaXMgdGhlIGFjY2VsZXJhdGlvbiBpbiB0aGUgWiBheGlzLCBhbmQgaWYgdGhlIGRldmljZSBpcyBmYWNpbmcgdXAgb3IgZG93blxuICAgICAgICAgICAgICAgICdmYWNpbmdVcCcgOiBmYWNpbmdVcCxcbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSB2YWx1ZSBmcm9tIGFjY2VsZXJhdGlvbiB0byBkZWdyZWVzIGFjY2VsZXJhdGlvbi54fHkgaXMgdGhlXG4gICAgICAgICAgICAgICAgLy8gYWNjZWxlcmF0aW9uIGFjY29yZGluZyB0byBncmF2aXR5LCB3ZSdsbCBhc3N1bWUgd2UncmUgb24gRWFydGggYW5kIGRpdmlkZVxuICAgICAgICAgICAgICAgIC8vIGJ5IDkuODEgKGVhcnRoIGdyYXZpdHkpIHRvIGdldCBhIHBlcmNlbnRhZ2UgdmFsdWUsIGFuZCB0aGVuIG11bHRpcGx5IHRoYXRcbiAgICAgICAgICAgICAgICAvLyBieSA5MCB0byBjb252ZXJ0IHRvIGRlZ3JlZXMuXG4gICAgICAgICAgICAgICAgJ3RpbHRMUicgOiBNYXRoLnJvdW5kKCgoYWNjZWxlcmF0aW9uLngpIC8gOS44MSkgKiAtOTApLFxuICAgICAgICAgICAgICAgICd0aWx0RkInIDogTWF0aC5yb3VuZCgoKGFjY2VsZXJhdGlvbi55ICsgOS44MSkgLyA5LjgxKSAqIDkwICogZmFjaW5nVXApXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBDcmFmdHkuZGV2aWNlLl9kZXZpY2VNb3Rpb25DYWxsYmFjayhkYXRhKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5kZXZpY2UuZGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgKiBAY29tcCBDcmFmdHkuZGV2aWNlXG4gICAgICAgICogQHNpZ24gcHVibGljIENyYWZ0eS5kZXZpY2UuZGV2aWNlT3JpZW50YXRpb24oRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGJhY2sgbWV0aG9kIGV4ZWN1dGVkIG9uY2UgYXMgc29vbiBhcyBkZXZpY2Ugb3JpZW50YXRpb24gaXMgY2hhbmdlXG4gICAgICAgICpcbiAgICAgICAgKiBEbyBzb21ldGhpbmcgd2l0aCBub3JtYWxpemVkIGRldmljZSBvcmllbnRhdGlvbiBkYXRhOlxuICAgICAgICAqIH5+flxuICAgICAgICAqIHtcbiAgICAgICAgKiAgICd0aWx0TFInICAgIDogICAnZ2FtbWEgdGhlIGFuZ2xlIGluIGRlZ3JlZXMgdGhlIGRldmljZSBpcyB0aWx0ZWQgbGVmdC10by1yaWdodC4nLFxuICAgICAgICAqICAgJ3RpbHRGQicgICAgOiAgICdiZXRhIHRoZSBhbmdsZSBpbiBkZWdyZWVzIHRoZSBkZXZpY2UgaXMgdGlsdGVkIGZyb250LXRvLWJhY2snLFxuICAgICAgICAqICAgJ2RpcicgICAgICAgOiAgICdhbHBoYSB0aGUgZGlyZWN0aW9uIHRoZSBkZXZpY2UgaXMgZmFjaW5nIGFjY29yZGluZyB0byB0aGUgY29tcGFzcycsXG4gICAgICAgICogICAnbW90VUQnICAgICA6ICAgJ1RoZSBhbmdsZXMgdmFsdWVzIGluY3JlYXNlIGFzIHlvdSB0aWx0IHRoZSBkZXZpY2UgdG8gdGhlIHJpZ2h0IG9yIHRvd2FyZHMgeW91LidcbiAgICAgICAgKiB9XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIC8vIEdldCBEZXZpY2VPcmllbnRhdGlvbiBldmVudCBub3JtYWxpemVkIGRhdGEuXG4gICAgICAgICogQ3JhZnR5LmRldmljZS5kZXZpY2VPcmllbnRhdGlvbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgKiAgICAgY29uc29sZS5sb2coJ2RhdGEudGlsdExSIDogJytNYXRoLnJvdW5kKGRhdGEudGlsdExSKSsnLCBkYXRhLnRpbHRGQiA6ICcrTWF0aC5yb3VuZChkYXRhLnRpbHRGQikrJywgZGF0YS5kaXIgOiAnK01hdGgucm91bmQoZGF0YS5kaXIpKycsIGRhdGEubW90VUQgOiAnK2RhdGEubW90VUQrJycpO1xuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogU2VlIGJyb3dzZXIgc3VwcG9ydCBhdCBodHRwOi8vY2FuaXVzZS5jb20vI3NlYXJjaD1kZXZpY2Ugb3JpZW50YXRpb24uXG4gICAgICAgICovXG4gICAgICAgIGRldmljZU9yaWVudGF0aW9uIDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgdGhpcy5fZGV2aWNlT3JpZW50YXRpb25DYWxsYmFjayA9IGZ1bmM7XG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN1cHBvcnQuZGV2aWNlb3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAod2luZG93LkRldmljZU9yaWVudGF0aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciB0aGUgZGV2aWNlb3JpZW50YXRpb24gZXZlbnQgYW5kIGhhbmRsZSBEZXZpY2VPcmllbnRhdGlvbkV2ZW50IG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCAnZGV2aWNlb3JpZW50YXRpb24nLCB0aGlzLl9ub3JtYWxpemVEZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuT3JpZW50YXRpb25FdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIHRoZSBNb3pPcmllbnRhdGlvbiBldmVudCBhbmQgaGFuZGxlIE9yaWVudGF0aW9uRGF0YSBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgJ01vek9yaWVudGF0aW9uJywgdGhpcy5fbm9ybWFsaXplRGV2aWNlT3JpZW50YXRpb24pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmRldmljZS5kZXZpY2VNb3Rpb25cbiAgICAgICAgKiBAY29tcCBDcmFmdHkuZGV2aWNlXG4gICAgICAgICogQHNpZ24gcHVibGljIENyYWZ0eS5kZXZpY2UuZGV2aWNlTW90aW9uKEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIENhbGxiYWNrIG1ldGhvZCBleGVjdXRlZCBvbmNlIGFzIHNvb24gYXMgZGV2aWNlIG1vdGlvbiBpcyBjaGFuZ2VcbiAgICAgICAgKlxuICAgICAgICAqIERvIHNvbWV0aGluZyB3aXRoIG5vcm1hbGl6ZWQgZGV2aWNlIG1vdGlvbiBkYXRhOlxuICAgICAgICAqIH5+flxuICAgICAgICAqIHtcbiAgICAgICAgKiAgICAgJ2FjY2VsZXJhdGlvbicgOiAnIEdyYWIgdGhlIGFjY2VsZXJhdGlvbiBpbmNsdWRpbmcgZ3Jhdml0eSBmcm9tIHRoZSByZXN1bHRzJyxcbiAgICAgICAgKiAgICAgJ3Jhd0FjY2VsZXJhdGlvbicgOiAnRGlzcGxheSB0aGUgcmF3IGFjY2VsZXJhdGlvbiBkYXRhJyxcbiAgICAgICAgKiAgICAgJ2ZhY2luZ1VwJyA6ICdaIGlzIHRoZSBhY2NlbGVyYXRpb24gaW4gdGhlIFogYXhpcywgYW5kIGlmIHRoZSBkZXZpY2UgaXMgZmFjaW5nIHVwIG9yIGRvd24nLFxuICAgICAgICAqICAgICAndGlsdExSJyA6ICdDb252ZXJ0IHRoZSB2YWx1ZSBmcm9tIGFjY2VsZXJhdGlvbiB0byBkZWdyZWVzLiBhY2NlbGVyYXRpb24ueCBpcyB0aGUgYWNjZWxlcmF0aW9uIGFjY29yZGluZyB0byBncmF2aXR5LCB3ZSdsbCBhc3N1bWUgd2UncmUgb24gRWFydGggYW5kIGRpdmlkZSBieSA5LjgxIChlYXJ0aCBncmF2aXR5KSB0byBnZXQgYSBwZXJjZW50YWdlIHZhbHVlLCBhbmQgdGhlbiBtdWx0aXBseSB0aGF0IGJ5IDkwIHRvIGNvbnZlcnQgdG8gZGVncmVlcy4nLFxuICAgICAgICAqICAgICAndGlsdEZCJyA6ICdDb252ZXJ0IHRoZSB2YWx1ZSBmcm9tIGFjY2VsZXJhdGlvbiB0byBkZWdyZWVzLidcbiAgICAgICAgKiB9XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIC8vIEdldCBEZXZpY2VNb3Rpb24gZXZlbnQgbm9ybWFsaXplZCBkYXRhLlxuICAgICAgICAqIENyYWZ0eS5kZXZpY2UuZGV2aWNlTW90aW9uKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAqICAgICBjb25zb2xlLmxvZygnZGF0YS5tb0FjY2VsIDogJytkYXRhLnJhd0FjY2VsZXJhdGlvbisnLCBkYXRhLm1vQ2FsY1RpbHRMUiA6ICcrTWF0aC5yb3VuZChkYXRhLnRpbHRMUikrJywgZGF0YS5tb0NhbGNUaWx0RkIgOiAnK01hdGgucm91bmQoZGF0YS50aWx0RkIpKycnKTtcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIFNlZSBicm93c2VyIHN1cHBvcnQgYXQgaHR0cDovL2Nhbml1c2UuY29tLyNzZWFyY2g9bW90aW9uLlxuICAgICAgICAqL1xuICAgICAgICBkZXZpY2VNb3Rpb24gOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICB0aGlzLl9kZXZpY2VNb3Rpb25DYWxsYmFjayA9IGZ1bmM7XG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN1cHBvcnQuZGV2aWNlbW90aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5EZXZpY2VNb3Rpb25FdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIHRoZSBkZXZpY2Vtb3Rpb24gZXZlbnQgYW5kIGhhbmRsZSBEZXZpY2VNb3Rpb25FdmVudCBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgJ2RldmljZW1vdGlvbicsIHRoaXMuX25vcm1hbGl6ZURldmljZU1vdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8qKkBcbiogI1Nwcml0ZVxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgc3ByaXRlcyBjaGFuZ2VcbiogQ29tcG9uZW50IGZvciB1c2luZyB0aWxlcyBpbiBhIHNwcml0ZSBtYXAuXG4qL1xuQ3JhZnR5LmMoXCJTcHJpdGVcIiwge1xuXHRfX2ltYWdlOiAnJyxcblx0Lypcblx0KiAjLl9fdGlsZVxuXHQqIEBjb21wIFNwcml0ZVxuXHQqXG5cdCogSG9yaXpvbnRhbCBzcHJpdGUgdGlsZSBzaXplLlxuXHQqL1xuXHRfX3RpbGU6IDAsXG5cdC8qXG5cdCogIy5fX3RpbGVoXG5cdCogQGNvbXAgU3ByaXRlXG5cdCpcblx0KiBWZXJ0aWNhbCBzcHJpdGUgdGlsZSBzaXplLlxuXHQqL1xuXHRfX3RpbGVoOiAwLFxuXHRfX3BhZGRpbmc6IG51bGwsXG5cdF9fdHJpbTogbnVsbCxcblx0aW1nOiBudWxsLFxuXHQvL3JlYWR5IGlzIGNoYW5nZWQgdG8gdHJ1ZSBpbiBDcmFmdHkuc3ByaXRlXG5cdHJlYWR5OiBmYWxzZSxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fX3RyaW0gPSBbMCwgMCwgMCwgMF07XG5cblx0XHR2YXIgZHJhdyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgY28gPSBlLmNvLFxuXHRcdFx0XHRwb3MgPSBlLnBvcyxcblx0XHRcdFx0Y29udGV4dCA9IGUuY3R4O1xuXG5cdFx0XHRpZiAoZS50eXBlID09PSBcImNhbnZhc1wiKSB7XG5cdFx0XHRcdC8vZHJhdyB0aGUgaW1hZ2Ugb24gdGhlIGNhbnZhcyBlbGVtZW50XG5cdFx0XHRcdGNvbnRleHQuZHJhd0ltYWdlKHRoaXMuaW1nLCAvL2ltYWdlIGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0XHQgY28ueCwgLy94IHBvc2l0aW9uIG9uIHNwcml0ZVxuXHRcdFx0XHRcdFx0XHRcdCBjby55LCAvL3kgcG9zaXRpb24gb24gc3ByaXRlXG5cdFx0XHRcdFx0XHRcdFx0IGNvLncsIC8vd2lkdGggb24gc3ByaXRlXG5cdFx0XHRcdFx0XHRcdFx0IGNvLmgsIC8vaGVpZ2h0IG9uIHNwcml0ZVxuXHRcdFx0XHRcdFx0XHRcdCBwb3MuX3gsIC8veCBwb3NpdGlvbiBvbiBjYW52YXNcblx0XHRcdFx0XHRcdFx0XHQgcG9zLl95LCAvL3kgcG9zaXRpb24gb24gY2FudmFzXG5cdFx0XHRcdFx0XHRcdFx0IHBvcy5fdywgLy93aWR0aCBvbiBjYW52YXNcblx0XHRcdFx0XHRcdFx0XHQgcG9zLl9oIC8vaGVpZ2h0IG9uIGNhbnZhc1xuXHRcdFx0XHQpO1xuXHRcdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09IFwiRE9NXCIpIHtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJ1cmwoJ1wiICsgdGhpcy5fX2ltYWdlICsgXCInKSBuby1yZXBlYXQgLVwiICsgY28ueCArIFwicHggLVwiICsgY28ueSArIFwicHhcIjtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kU2l6ZSA9ICdjb3Zlcic7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuYmluZChcIkRyYXdcIiwgZHJhdykuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdGlmIChpZCA9PT0gXCJTcHJpdGVcIikgdGhpcy51bmJpbmQoXCJEcmF3XCIsIGRyYXcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnNwcml0ZVxuXHQqIEBjb21wIFNwcml0ZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5zcHJpdGUoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBYIGNlbGwgcG9zaXRpb25cblx0KiBAcGFyYW0geSAtIFkgY2VsbCBwb3NpdGlvblxuXHQqIEBwYXJhbSB3IC0gV2lkdGggaW4gY2VsbHNcblx0KiBAcGFyYW0gaCAtIEhlaWdodCBpbiBjZWxsc1xuXHQqIFxuXHQqIFVzZXMgYSBuZXcgbG9jYXRpb24gb24gdGhlIHNwcml0ZSBtYXAgYXMgaXRzIHNwcml0ZS5cblx0KlxuXHQqIFZhbHVlcyBzaG91bGQgYmUgaW4gdGlsZXMgb3IgY2VsbHMgKG5vdCBwaXhlbHMpLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIFNwcml0ZVwiKVxuXHQqIFx0LnNwcml0ZSgwLCAwLCAyLCAyKTtcblx0KiB+fn5cblx0Ki9cblxuXHQvKipAXG5cdCogIy5fX2Nvb3JkXG5cdCogQGNvbXAgU3ByaXRlXG5cdCpcblx0KiBUaGUgY29vcmRpbmF0ZSBvZiB0aGUgc2xpZGUgd2l0aGluIHRoZSBzcHJpdGUgaW4gdGhlIGZvcm1hdCBvZiBbeCwgeSwgdywgaF0uXG5cdCovXG5cdHNwcml0ZTogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHR0aGlzLl9fY29vcmQgPSBbeCAqIHRoaXMuX190aWxlICsgdGhpcy5fX3BhZGRpbmdbMF0gKyB0aGlzLl9fdHJpbVswXSxcblx0XHRcdFx0XHRcdHkgKiB0aGlzLl9fdGlsZWggKyB0aGlzLl9fcGFkZGluZ1sxXSArIHRoaXMuX190cmltWzFdLFxuXHRcdFx0XHRcdFx0dGhpcy5fX3RyaW1bMl0gfHwgdyAqIHRoaXMuX190aWxlIHx8IHRoaXMuX190aWxlLFxuXHRcdFx0XHRcdFx0dGhpcy5fX3RyaW1bM10gfHwgaCAqIHRoaXMuX190aWxlaCB8fCB0aGlzLl9fdGlsZWhdO1xuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmNyb3Bcblx0KiBAY29tcCBTcHJpdGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuY3JvcChOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIE9mZnNldCB4IHBvc2l0aW9uXG5cdCogQHBhcmFtIHkgLSBPZmZzZXQgeSBwb3NpdGlvblxuXHQqIEBwYXJhbSB3IC0gTmV3IHdpZHRoXG5cdCogQHBhcmFtIGggLSBOZXcgaGVpZ2h0XG5cdCogXG5cdCogSWYgdGhlIGVudGl0eSBuZWVkcyB0byBiZSBzbWFsbGVyIHRoYW4gdGhlIHRpbGUgc2l6ZSwgdXNlIHRoaXMgbWV0aG9kIHRvIGNyb3AgaXQuXG5cdCpcblx0KiBUaGUgdmFsdWVzIHNob3VsZCBiZSBpbiBwaXhlbHMgcmF0aGVyIHRoYW4gdGlsZXMuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgU3ByaXRlXCIpXG5cdCogXHQuY3JvcCg0MCwgNDAsIDIyLCAyMyk7XG5cdCogfn5+XG5cdCovXG5cdGNyb3A6IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0dmFyIG9sZCA9IHRoaXMuX21iciB8fCB0aGlzLnBvcygpO1xuXHRcdHRoaXMuX190cmltID0gW107XG5cdFx0dGhpcy5fX3RyaW1bMF0gPSB4O1xuXHRcdHRoaXMuX190cmltWzFdID0geTtcblx0XHR0aGlzLl9fdHJpbVsyXSA9IHc7XG5cdFx0dGhpcy5fX3RyaW1bM10gPSBoO1xuXG5cdFx0dGhpcy5fX2Nvb3JkWzBdICs9IHg7XG5cdFx0dGhpcy5fX2Nvb3JkWzFdICs9IHk7XG5cdFx0dGhpcy5fX2Nvb3JkWzJdID0gdztcblx0XHR0aGlzLl9fY29vcmRbM10gPSBoO1xuXHRcdHRoaXMuX3cgPSB3O1xuXHRcdHRoaXMuX2ggPSBoO1xuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIsIG9sZCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNDYW52YXNcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIEB0cmlnZ2VyIERyYXcgLSB3aGVuIHRoZSBlbnRpdHkgaXMgcmVhZHkgdG8gYmUgZHJhd24gdG8gdGhlIHN0YWdlIC0ge3R5cGU6IFwiY2FudmFzXCIsIHBvcywgY28sIGN0eH1cbiogQHRyaWdnZXIgTm9DYW52YXMgLSBpZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGNhbnZhc1xuKiBcbiogV2hlbiB0aGlzIGNvbXBvbmVudCBpcyBhZGRlZCB0byBhbiBlbnRpdHkgaXQgd2lsbCBiZSBkcmF3biB0byB0aGUgZ2xvYmFsIGNhbnZhcyBlbGVtZW50LiBUaGUgY2FudmFzIGVsZW1lbnQgKGFuZCBoZW5jZSBhbGwgQ2FudmFzIGVudGl0aWVzKSBpcyBhbHdheXMgcmVuZGVyZWQgYmVsb3cgYW55IERPTSBlbnRpdGllcy4gXG4qIFxuKiBDcmFmdHkuY2FudmFzLmluaXQoKSB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgY2FsbGVkIGlmIGl0IGlzIG5vdCBjYWxsZWQgYWxyZWFkeSB0byBpbml0aWFsaXplIHRoZSBjYW52YXMgZWxlbWVudC5cbipcbiogQ3JlYXRlIGEgY2FudmFzIGVudGl0eSBsaWtlIHRoaXNcbiogfn5+XG4qIHZhciBteUVudGl0eSA9IENyYWZ0eS5lKFwiMkQsIENhbnZhcywgQ29sb3JcIikuY29sb3IoXCJncmVlblwiKVxuKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKHt4OiAxMywgeTogMzcsIHc6IDQyLCBoOiA0Mn0pO1xuKn5+flxuKi9cbkNyYWZ0eS5jKFwiQ2FudmFzXCIsIHtcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCFDcmFmdHkuY2FudmFzLmNvbnRleHQpIHtcblx0XHRcdENyYWZ0eS5jYW52YXMuaW5pdCgpO1xuXHRcdH1cblxuXHRcdC8vaW5jcmVtZW50IHRoZSBhbW91bnQgb2YgY2FudmFzIG9ianNcblx0XHRDcmFmdHkuRHJhd01hbmFnZXIudG90YWwyRCsrO1xuXG5cdFx0dGhpcy5iaW5kKFwiQ2hhbmdlXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHQvL2lmIHdpdGhpbiBzY3JlZW4sIGFkZCB0byBsaXN0XG5cdFx0XHRpZiAodGhpcy5fY2hhbmdlZCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0dGhpcy5fY2hhbmdlZCA9IENyYWZ0eS5EcmF3TWFuYWdlci5hZGQoZSB8fCB0aGlzLCB0aGlzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChlKSB0aGlzLl9jaGFuZ2VkID0gQ3JhZnR5LkRyYXdNYW5hZ2VyLmFkZChlLCB0aGlzKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuYmluZChcIlJlbW92ZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRDcmFmdHkuRHJhd01hbmFnZXIudG90YWwyRC0tO1xuXHRcdFx0Q3JhZnR5LkRyYXdNYW5hZ2VyLmFkZCh0aGlzLCB0aGlzKTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5kcmF3XG5cdCogQGNvbXAgQ2FudmFzXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRyYXcoW1tDb250ZXh0IGN0eCwgXU51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoXSlcblx0KiBAcGFyYW0gY3R4IC0gQ2FudmFzIDJEIGNvbnRleHQgaWYgZHJhd2luZyBvbiBhbm90aGVyIGNhbnZhcyBpcyByZXF1aXJlZFxuXHQqIEBwYXJhbSB4IC0gWCBvZmZzZXQgZm9yIGRyYXdpbmcgYSBzZWdtZW50XG5cdCogQHBhcmFtIHkgLSBZIG9mZnNldCBmb3IgZHJhd2luZyBhIHNlZ21lbnRcblx0KiBAcGFyYW0gdyAtIFdpZHRoIG9mIHRoZSBzZWdtZW50IHRvIGRyYXdcblx0KiBAcGFyYW0gaCAtIEhlaWdodCBvZiB0aGUgc2VnbWVudCB0byBkcmF3XG5cdCogXG5cdCogTWV0aG9kIHRvIGRyYXcgdGhlIGVudGl0eSBvbiB0aGUgY2FudmFzIGVsZW1lbnQuIENhbiBwYXNzIHJlY3QgdmFsdWVzIGZvciByZWRyYXdpbmcgYSBzZWdtZW50IG9mIHRoZSBlbnRpdHkuXG5cdCovXG5cdGRyYXc6IGZ1bmN0aW9uIChjdHgsIHgsIHksIHcsIGgpIHtcblx0XHRpZiAoIXRoaXMucmVhZHkpIHJldHVybjtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gNCkge1xuXHRcdFx0aCA9IHc7XG5cdFx0XHR3ID0geTtcblx0XHRcdHkgPSB4O1xuXHRcdFx0eCA9IGN0eDtcblx0XHRcdGN0eCA9IENyYWZ0eS5jYW52YXMuY29udGV4dDtcblx0XHR9XG5cblx0XHR2YXIgcG9zID0geyAvL2lubGluZWQgcG9zKCkgZnVuY3Rpb24sIGZvciBzcGVlZFxuXHRcdFx0X3g6ICh0aGlzLl94ICsgKHggfHwgMCkpLFxuXHRcdFx0X3k6ICh0aGlzLl95ICsgKHkgfHwgMCkpLFxuXHRcdFx0X3c6ICh3IHx8IHRoaXMuX3cpLFxuXHRcdFx0X2g6IChoIHx8IHRoaXMuX2gpXG5cdFx0fSxcblx0XHRcdGNvbnRleHQgPSBjdHggfHwgQ3JhZnR5LmNhbnZhcy5jb250ZXh0LFxuXHRcdFx0Y29vcmQgPSB0aGlzLl9fY29vcmQgfHwgWzAsIDAsIDAsIDBdLFxuXHRcdFx0Y28gPSB7XG5cdFx0XHR4OiBjb29yZFswXSArICh4IHx8IDApLFxuXHRcdFx0eTogY29vcmRbMV0gKyAoeSB8fCAwKSxcblx0XHRcdHc6IHcgfHwgY29vcmRbMl0sXG5cdFx0XHRoOiBoIHx8IGNvb3JkWzNdXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLl9tYnIpIHtcblx0XHRcdGNvbnRleHQuc2F2ZSgpO1xuXG5cdFx0XHRjb250ZXh0LnRyYW5zbGF0ZSh0aGlzLl9vcmlnaW4ueCArIHRoaXMuX3gsIHRoaXMuX29yaWdpbi55ICsgdGhpcy5feSk7XG5cdFx0XHRwb3MuX3ggPSAtdGhpcy5fb3JpZ2luLng7XG5cdFx0XHRwb3MuX3kgPSAtdGhpcy5fb3JpZ2luLnk7XG5cblx0XHRcdGNvbnRleHQucm90YXRlKCh0aGlzLl9yb3RhdGlvbiAlIDM2MCkgKiAoTWF0aC5QSSAvIDE4MCkpO1xuXHRcdH1cblx0XHRcblx0XHRpZih0aGlzLl9mbGlwWCB8fCB0aGlzLl9mbGlwWSkge1xuXHRcdFx0Y29udGV4dC5zYXZlKCk7XG5cdFx0XHRjb250ZXh0LnNjYWxlKCh0aGlzLl9mbGlwWCA/IC0xIDogMSksICh0aGlzLl9mbGlwWSA/IC0xIDogMSkpO1xuXHRcdFx0aWYodGhpcy5fZmxpcFgpIHtcblx0XHRcdFx0cG9zLl94ID0gLShwb3MuX3ggKyBwb3MuX3cpXG5cdFx0XHR9XG5cdFx0XHRpZih0aGlzLl9mbGlwWSkge1xuXHRcdFx0XHRwb3MuX3kgPSAtKHBvcy5feSArIHBvcy5faClcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly9kcmF3IHdpdGggYWxwaGFcblx0XHRpZiAodGhpcy5fYWxwaGEgPCAxLjApIHtcblx0XHRcdHZhciBnbG9iYWxwaGEgPSBjb250ZXh0Lmdsb2JhbEFscGhhO1xuXHRcdFx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IHRoaXMuX2FscGhhO1xuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcihcIkRyYXdcIiwgeyB0eXBlOiBcImNhbnZhc1wiLCBwb3M6IHBvcywgY286IGNvLCBjdHg6IGNvbnRleHQgfSk7XG5cblx0XHRpZiAodGhpcy5fbWJyIHx8ICh0aGlzLl9mbGlwWCB8fCB0aGlzLl9mbGlwWSkpIHtcblx0XHRcdGNvbnRleHQucmVzdG9yZSgpO1xuXHRcdH1cblx0XHRpZiAoZ2xvYmFscGhhKSB7XG5cdFx0XHRjb250ZXh0Lmdsb2JhbEFscGhhID0gZ2xvYmFscGhhO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0NyYWZ0eS5jYW52YXNcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIFxuKiBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgdG8gZHJhdyBvbiBjYW52YXMuXG4qL1xuQ3JhZnR5LmV4dGVuZCh7XG5cdGNhbnZhczoge1xuXHQvKipAXG5cdFx0KiAjQ3JhZnR5LmNhbnZhcy5jb250ZXh0XG5cdFx0KiBAY29tcCBDcmFmdHkuY2FudmFzXG5cdFx0KiBcblx0XHQqIFRoaXMgd2lsbCByZXR1cm4gdGhlIDJEIGNvbnRleHQgb2YgdGhlIG1haW4gY2FudmFzIGVsZW1lbnQuXG5cdFx0KiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgQ3JhZnR5LmNhbnZhcy5fY2FudmFzLmdldENvbnRleHQoJzJkJylgLlxuXHRcdCovXG5cdFx0Y29udGV4dDogbnVsbCxcblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LmNhbnZhcy5fY2FudmFzXG5cdFx0KiBAY29tcCBDcmFmdHkuY2FudmFzXG5cdFx0KiBcblx0XHQqIE1haW4gQ2FudmFzIGVsZW1lbnRcblx0XHQqL1xuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5jYW52YXMuaW5pdFxuXHRcdCogQGNvbXAgQ3JhZnR5LmNhbnZhc1xuXHRcdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmNhbnZhcy5pbml0KHZvaWQpXG4gICAgICAgICogQHRyaWdnZXIgTm9DYW52YXMgLSB0cmlnZ2VyZWQgaWYgYENyYWZ0eS5zdXBwb3J0LmNhbnZhc2AgaXMgZmFsc2VcbiAgICAgICAgKiBcblx0XHQqIENyZWF0ZXMgYSBgY2FudmFzYCBlbGVtZW50IGluc2lkZSBgQ3JhZnR5LnN0YWdlLmVsZW1gLiBNdXN0IGJlIGNhbGxlZFxuXHRcdCogYmVmb3JlIGFueSBlbnRpdGllcyB3aXRoIHRoZSBDYW52YXMgY29tcG9uZW50IGNhbiBiZSBkcmF3bi5cblx0XHQqXG5cdFx0KiBUaGlzIG1ldGhvZCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgY2FsbGVkIGlmIG5vIGBDcmFmdHkuY2FudmFzLmNvbnRleHRgIGlzXG5cdFx0KiBmb3VuZC5cblx0XHQqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vY2hlY2sgaWYgY2FudmFzIGlzIHN1cHBvcnRlZFxuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5jYW52YXMpIHtcblx0XHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJOb0NhbnZhc1wiKTtcblx0XHRcdFx0Q3JhZnR5LnN0b3AoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2NyZWF0ZSAzIGVtcHR5IGNhbnZhcyBlbGVtZW50c1xuXHRcdFx0dmFyIGM7XG5cdFx0XHRjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHRcdGMud2lkdGggPSBDcmFmdHkudmlld3BvcnQud2lkdGg7XG5cdFx0XHRjLmhlaWdodCA9IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cdFx0XHRjLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHRcdGMuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdFx0XHRjLnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cblx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLmFwcGVuZENoaWxkKGMpO1xuXHRcdFx0Q3JhZnR5LmNhbnZhcy5jb250ZXh0ID0gYy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0Q3JhZnR5LmNhbnZhcy5fY2FudmFzID0gYztcblx0XHR9XG5cdH1cbn0pO1xuXG5DcmFmdHkuZXh0ZW5kKHtcblx0b3ZlcjogbnVsbCwgLy9vYmplY3QgbW91c2VvdmVyLCB3YWl0aW5nIGZvciBvdXRcblx0bW91c2VPYmpzOiAwLFxuXHRtb3VzZVBvczoge30sXG5cdGxhc3RFdmVudDogbnVsbCxcblx0a2V5ZG93bjoge30sXG5cdHNlbGVjdGVkOiBmYWxzZSxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS5rZXlkb3duXG5cdCogQGNhdGVnb3J5IElucHV0XG5cdCogUmVtZW1iZXJpbmcgd2hhdCBrZXlzIChyZWZlcnJlZCBieSBVbmljb2RlKSBhcmUgZG93bi5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5jKFwiS2V5Ym9hcmRcIiwge1xuXHQqICAgaXNEb3duOiBmdW5jdGlvbiAoa2V5KSB7XG5cdCogICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG5cdCogICAgICAga2V5ID0gQ3JhZnR5LmtleXNba2V5XTtcblx0KiAgICAgfVxuXHQqICAgICByZXR1cm4gISFDcmFmdHkua2V5ZG93bltrZXldO1xuXHQqICAgfVxuXHQqIH0pO1xuXHQqIH5+flxuXHQqIEBzZWUgS2V5Ym9hcmQsIENyYWZ0eS5rZXlzXG5cdCovXG5cblx0ZGV0ZWN0Qmx1cjogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgc2VsZWN0ZWQgPSAoKGUuY2xpZW50WCA+IENyYWZ0eS5zdGFnZS54ICYmIGUuY2xpZW50WCA8IENyYWZ0eS5zdGFnZS54ICsgQ3JhZnR5LnZpZXdwb3J0LndpZHRoKSAmJlxuICAgICAgICAgICAgICAgICAgICAoZS5jbGllbnRZID4gQ3JhZnR5LnN0YWdlLnkgJiYgZS5jbGllbnRZIDwgQ3JhZnR5LnN0YWdlLnkgKyBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KSk7XG5cblx0XHRpZiAoIUNyYWZ0eS5zZWxlY3RlZCAmJiBzZWxlY3RlZClcblx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiQ3JhZnR5Rm9jdXNcIik7XG5cdFx0aWYgKENyYWZ0eS5zZWxlY3RlZCAmJiAhc2VsZWN0ZWQpXG5cdFx0XHRDcmFmdHkudHJpZ2dlcihcIkNyYWZ0eUJsdXJcIik7XG5cblx0XHRDcmFmdHkuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcblx0fSxcblxuXHRtb3VzZURpc3BhdGNoOiBmdW5jdGlvbiAoZSkge1xuXHRcdFxuXHRcdGlmICghQ3JhZnR5Lm1vdXNlT2JqcykgcmV0dXJuO1xuXHRcdENyYWZ0eS5sYXN0RXZlbnQgPSBlO1xuXG5cdFx0dmFyIG1heHogPSAtMSxcblx0XHRcdGNsb3Nlc3QsXG5cdFx0XHRxLFxuXHRcdFx0aSA9IDAsIGwsXG5cdFx0XHRwb3MgPSBDcmFmdHkuRE9NLnRyYW5zbGF0ZShlLmNsaWVudFgsIGUuY2xpZW50WSksXG5cdFx0XHR4LCB5LFxuXHRcdFx0ZHVwZXMgPSB7fSxcblx0XHRcdHRhciA9IGUudGFyZ2V0ID8gZS50YXJnZXQgOiBlLnNyY0VsZW1lbnQsXG5cdFx0XHR0eXBlID0gZS50eXBlO1xuXG5cdFx0Ly9Ob3JtYWxpemUgYnV0dG9uIGFjY29yZGluZyB0byBodHRwOi8vdW5peHBhcGEuY29tL2pzL21vdXNlLmh0bWxcblx0XHRpZiAoZS53aGljaCA9PSBudWxsKSB7XG5cdFx0XHRlLm1vdXNlQnV0dG9uID0gKGUuYnV0dG9uIDwgMikgPyBDcmFmdHkubW91c2VCdXR0b25zLkxFRlQgOiAoKGUuYnV0dG9uID09IDQpID8gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5NSURETEUgOiBDcmFmdHkubW91c2VCdXR0b25zLlJJR0hUKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZS5tb3VzZUJ1dHRvbiA9IChlLndoaWNoIDwgMikgPyBDcmFmdHkubW91c2VCdXR0b25zLkxFRlQgOiAoKGUud2hpY2ggPT0gMikgPyBDcmFmdHkubW91c2VCdXR0b25zLk1JRERMRSA6IENyYWZ0eS5tb3VzZUJ1dHRvbnMuUklHSFQpO1xuXHRcdH1cblxuXHRcdGUucmVhbFggPSB4ID0gQ3JhZnR5Lm1vdXNlUG9zLnggPSBwb3MueDtcblx0XHRlLnJlYWxZID0geSA9IENyYWZ0eS5tb3VzZVBvcy55ID0gcG9zLnk7XG5cblx0XHQvL2lmIGl0J3MgYSBET00gZWxlbWVudCB3aXRoIE1vdXNlIGNvbXBvbmVudCB3ZSBhcmUgZG9uZVxuXHRcdGlmICh0YXIubm9kZU5hbWUgIT0gXCJDQU5WQVNcIikge1xuXHRcdFx0d2hpbGUgKHR5cGVvZiAodGFyLmlkKSAhPSAnc3RyaW5nJyAmJiB0YXIuaWQuaW5kZXhPZignZW50JykgPT0gLTEpIHtcblx0XHRcdFx0dGFyID0gdGFyLnBhcmVudE5vZGU7XG5cdFx0XHR9XG5cdFx0XHRlbnQgPSBDcmFmdHkocGFyc2VJbnQodGFyLmlkLnJlcGxhY2UoJ2VudCcsICcnKSkpXG5cdFx0XHRpZiAoZW50LmhhcygnTW91c2UnKSAmJiBlbnQuaXNBdCh4LCB5KSlcblx0XHRcdFx0Y2xvc2VzdCA9IGVudDtcblx0XHR9XG5cdFx0Ly9lbHNlIHdlIHNlYXJjaCBmb3IgYW4gZW50aXR5IHdpdGggTW91c2UgY29tcG9uZW50XG5cdFx0aWYgKCFjbG9zZXN0KSB7XG5cdFx0XHRxID0gQ3JhZnR5Lm1hcC5zZWFyY2goeyBfeDogeCwgX3k6IHksIF93OiAxLCBfaDogMSB9LCBmYWxzZSk7XG5cblx0XHRcdGZvciAobCA9IHEubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRcdGlmICghcVtpXS5fX2MuTW91c2UgfHwgIXFbaV0uX3Zpc2libGUpIGNvbnRpbnVlO1xuXG5cdFx0XHRcdHZhciBjdXJyZW50ID0gcVtpXSxcblx0XHRcdFx0XHRmbGFnID0gZmFsc2U7XG5cblx0XHRcdFx0Ly93ZWVkIG91dCBkdXBsaWNhdGVzXG5cdFx0XHRcdGlmIChkdXBlc1tjdXJyZW50WzBdXSkgY29udGludWU7XG5cdFx0XHRcdGVsc2UgZHVwZXNbY3VycmVudFswXV0gPSB0cnVlO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50Lm1hcEFyZWEpIHtcblx0XHRcdFx0XHRpZiAoY3VycmVudC5tYXBBcmVhLmNvbnRhaW5zUG9pbnQoeCwgeSkpIHtcblx0XHRcdFx0XHRcdGZsYWcgPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChjdXJyZW50LmlzQXQoeCwgeSkpIGZsYWcgPSB0cnVlO1xuXG5cdFx0XHRcdGlmIChmbGFnICYmIChjdXJyZW50Ll96ID49IG1heHogfHwgbWF4eiA9PT0gLTEpKSB7XG5cdFx0XHRcdFx0Ly9pZiB0aGUgWiBpcyB0aGUgc2FtZSwgc2VsZWN0IHRoZSBjbG9zZXN0IEdVSURcblx0XHRcdFx0XHRpZiAoY3VycmVudC5feiA9PT0gbWF4eiAmJiBjdXJyZW50WzBdIDwgY2xvc2VzdFswXSkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1heHogPSBjdXJyZW50Ll96O1xuXHRcdFx0XHRcdGNsb3Nlc3QgPSBjdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9mb3VuZCBjbG9zZXN0IG9iamVjdCB0byBtb3VzZVxuXHRcdGlmIChjbG9zZXN0KSB7XG5cdFx0XHQvL2NsaWNrIG11c3QgbW91c2Vkb3duIGFuZCBvdXQgb24gdGlsZVxuXHRcdFx0aWYgKHR5cGUgPT09IFwibW91c2Vkb3duXCIpIHtcblx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiTW91c2VEb3duXCIsIGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIm1vdXNldXBcIikge1xuXHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJNb3VzZVVwXCIsIGUpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09IFwiZGJsY2xpY2tcIikge1xuXHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJEb3VibGVDbGlja1wiLCBlKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PSBcImNsaWNrXCIpIHtcblx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiQ2xpY2tcIiwgZSk7XG5cdFx0XHR9ZWxzZSBpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikge1xuXHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJNb3VzZU1vdmVcIiwgZSk7XG5cdFx0XHRcdGlmICh0aGlzLm92ZXIgIT09IGNsb3Nlc3QpIHsgLy9pZiBuZXcgbW91c2Vtb3ZlLCBpdCBpcyBvdmVyXG5cdFx0XHRcdFx0aWYgKHRoaXMub3Zlcikge1xuXHRcdFx0XHRcdFx0dGhpcy5vdmVyLnRyaWdnZXIoXCJNb3VzZU91dFwiLCBlKTsgLy9pZiBvdmVyIHdhc24ndCBudWxsLCBzZW5kIG1vdXNlb3V0XG5cdFx0XHRcdFx0XHR0aGlzLm92ZXIgPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLm92ZXIgPSBjbG9zZXN0O1xuXHRcdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIk1vdXNlT3ZlclwiLCBlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGNsb3Nlc3QudHJpZ2dlcih0eXBlLCBlKTsgLy90cmlnZ2VyIHdoYXRldmVyIGl0IGlzXG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh0eXBlID09PSBcIm1vdXNlbW92ZVwiICYmIHRoaXMub3Zlcikge1xuXHRcdFx0XHR0aGlzLm92ZXIudHJpZ2dlcihcIk1vdXNlT3V0XCIsIGUpO1xuXHRcdFx0XHR0aGlzLm92ZXIgPSBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHR5cGUgPT09IFwibW91c2Vkb3duXCIpIHtcblx0XHRcdFx0Q3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vaygnc3RhcnQnLCBlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIHtcblx0XHRcdFx0Q3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vaygnZHJhZycsIGUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZSA9PSBcIm1vdXNldXBcIikge1xuXHRcdFx0XHRDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKCdzdG9wJyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIHtcblx0XHRcdHRoaXMubGFzdEV2ZW50ID0gZTtcblx0XHR9XG5cblx0fSxcblxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS50b3VjaERpc3BhdGNoXG4gICAgKiBAY2F0ZWdvcnkgSW5wdXRcbiAgICAqIFxuICAgICogVG91Y2hFdmVudHMgaGF2ZSBhIGRpZmZlcmVudCBzdHJ1Y3R1cmUgdGhlbiBNb3VzZUV2ZW50cy5cbiAgICAqIFRoZSByZWxldmFudCBkYXRhIGxpdmVzIGluIGUuY2hhbmdlZFRvdWNoZXNbMF0uXG4gICAgKiBUbyBub3JtYWxpemUgVG91Y2hFdmVudHMgd2UgY2F0Y2ggZW0gYW5kIGRpc3BhdGNoIGEgbW9jayBNb3VzZUV2ZW50IGluc3RlYWQuXG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2hcbiAgICAqL1xuXG4gICAgdG91Y2hEaXNwYXRjaDogZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgdHlwZSxcbiAgICAgICAgICAgIGxhc3RFdmVudCA9IENyYWZ0eS5sYXN0RXZlbnQ7XG5cbiAgICAgICAgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaHN0YXJ0XCIpIHR5cGUgPSBcIm1vdXNlZG93blwiO1xuICAgICAgICBlbHNlIGlmIChlLnR5cGUgPT09IFwidG91Y2htb3ZlXCIpIHR5cGUgPSBcIm1vdXNlbW92ZVwiO1xuICAgICAgICBlbHNlIGlmIChlLnR5cGUgPT09IFwidG91Y2hlbmRcIikgdHlwZSA9IFwibW91c2V1cFwiO1xuICAgICAgICBlbHNlIGlmIChlLnR5cGUgPT09IFwidG91Y2hjYW5jZWxcIikgdHlwZSA9IFwibW91c2V1cFwiO1xuICAgICAgICBlbHNlIGlmIChlLnR5cGUgPT09IFwidG91Y2hsZWF2ZVwiKSB0eXBlID0gXCJtb3VzZXVwXCI7XG4gICAgICAgIFxuICAgICAgICBpZihlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgZmlyc3QgPSBlLnRvdWNoZXNbMF07XG4gICAgICAgIH0gZWxzZSBpZihlLmNoYW5nZWRUb3VjaGVzICYmIGUuY2hhbmdlZFRvdWNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmaXJzdCA9IGUuY2hhbmdlZFRvdWNoZXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRcIik7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50LmluaXRNb3VzZUV2ZW50KHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSxcbiAgICAgICAgICAgIGZpcnN0LnNjcmVlblgsIFxuICAgICAgICAgICAgZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAgIGZpcnN0LmNsaWVudFgsIFxuICAgICAgICAgICAgZmlyc3QuY2xpZW50WSwgXG4gICAgICAgICAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgZS5yZWxhdGVkVGFyZ2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuXG4gICAgICAgIC8vIHRyaWdnZXIgY2xpY2sgd2hlbiBpdCBzaG91bGQgYmUgdHJpZ2dlcmVkXG4gICAgICAgIGlmIChsYXN0RXZlbnQgIT0gbnVsbCAmJiBsYXN0RXZlbnQudHlwZSA9PSAnbW91c2Vkb3duJyAmJiB0eXBlID09ICdtb3VzZXVwJykge1xuICAgICAgICAgICAgdHlwZSA9ICdjbGljayc7XG5cbiAgICAgICAgICAgIHZhciBzaW11bGF0ZWRFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudFwiKTtcbiAgICAgICAgICAgIHNpbXVsYXRlZEV2ZW50LmluaXRNb3VzZUV2ZW50KHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSxcbiAgICAgICAgICAgICAgICBmaXJzdC5zY3JlZW5YLCBcbiAgICAgICAgICAgICAgICBmaXJzdC5zY3JlZW5ZLFxuICAgICAgICAgICAgICAgIGZpcnN0LmNsaWVudFgsIFxuICAgICAgICAgICAgICAgIGZpcnN0LmNsaWVudFksIFxuICAgICAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLCBlLnJlbGF0ZWRUYXJnZXRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmaXJzdC50YXJnZXQuZGlzcGF0Y2hFdmVudChzaW11bGF0ZWRFdmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGVsc2UgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgIH0sXG5cblxuXHQvKipAXG5cdCogI0tleWJvYXJkRXZlbnRcblx0KiBAY2F0ZWdvcnkgSW5wdXRcbiAgICAqIEtleWJvYXJkIEV2ZW50IHRyaWdnZXJlZCBieSBDcmFmdHkgQ29yZVxuXHQqIEB0cmlnZ2VyIEtleURvd24gLSBpcyB0cmlnZ2VyZWQgZm9yIGVhY2ggZW50aXR5IHdoZW4gdGhlIERPTSAna2V5ZG93bicgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuXHQqIEB0cmlnZ2VyIEtleVVwIC0gaXMgdHJpZ2dlcmVkIGZvciBlYWNoIGVudGl0eSB3aGVuIHRoZSBET00gJ2tleXVwJyBldmVudCBpcyB0cmlnZ2VyZWQuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cbiAgICAqIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3JcIilcbiAgICAqICAgLmF0dHIoe3g6IDEwMCwgeTogMTAwLCB3OiA1MCwgaDogNTB9KVxuICAgICogICAuY29sb3IoXCJyZWRcIilcbiAgICAqICAgLmJpbmQoJ0tleURvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgKiAgICAgaWYoZS5rZXkgPT0gQ3JhZnR5LmtleXNbJ0xFRlRfQVJST1cnXSkge1xuICAgICogICAgICAgdGhpcy54PXRoaXMueC0xO1xuICAgICogICAgIH0gZWxzZSBpZiAoZS5rZXkgPT0gQ3JhZnR5LmtleXNbJ1JJR0hUX0FSUk9XJ10pIHtcbiAgICAqICAgICB0aGlzLng9dGhpcy54KzE7XG4gICAgKiAgICAgfSBlbHNlIGlmIChlLmtleSA9PSBDcmFmdHkua2V5c1snVVBfQVJST1cnXSkge1xuICAgICogICAgIHRoaXMueT10aGlzLnktMTtcbiAgICAqICAgICB9IGVsc2UgaWYgKGUua2V5ID09IENyYWZ0eS5rZXlzWydET1dOX0FSUk9XJ10pIHtcbiAgICAqICAgICB0aGlzLnk9dGhpcy55KzE7XG4gICAgKiAgICAgfVxuICAgICogICB9KTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5rZXlzXG5cdCovXG5cblx0LyoqQFxuXHQqICNDcmFmdHkuZXZlbnRPYmplY3Rcblx0KiBAY2F0ZWdvcnkgSW5wdXRcblx0KiBcblx0KiBFdmVudCBPYmplY3QgdXNlZCBpbiBDcmFmdHkgZm9yIGNyb3NzIGJyb3dzZXIgY29tcGF0aWJpbGl0eVxuXHQqL1xuXG5cdC8qKkBcblx0KiAjLmtleVxuXHQqIEBjb21wIENyYWZ0eS5ldmVudE9iamVjdFxuXHQqIFxuXHQqIFVuaWNvZGUgb2YgdGhlIGtleSBwcmVzc2VkXG5cdCovXG5cdGtleWJvYXJkRGlzcGF0Y2g6IGZ1bmN0aW9uIChlKSB7XG5cdFx0Ly8gVXNlIGEgQ3JhZnR5LXN0YW5kYXJkIGV2ZW50IG9iamVjdCB0byBhdm9pZCBjcm9zcy1icm93c2VyIGlzc3Vlc1xuXHRcdHZhciBvcmlnaW5hbCA9IGUsXG5cdFx0XHRldm50ID0ge30sXG5cdFx0XHRwcm9wcyA9IFwiY2hhciBjaGFyQ29kZSBrZXlDb2RlIHR5cGUgc2hpZnRLZXkgY3RybEtleSBtZXRhS2V5IHRpbWVzdGFtcFwiLnNwbGl0KFwiIFwiKTtcblx0XHRmb3IgKHZhciBpID0gcHJvcHMubGVuZ3RoOyBpOykge1xuXHRcdFx0dmFyIHByb3AgPSBwcm9wc1stLWldO1xuXHRcdFx0ZXZudFtwcm9wXSA9IG9yaWdpbmFsW3Byb3BdO1xuXHRcdH1cblx0XHRldm50LndoaWNoID0gb3JpZ2luYWwuY2hhckNvZGUgIT0gbnVsbCA/IG9yaWdpbmFsLmNoYXJDb2RlIDogb3JpZ2luYWwua2V5Q29kZTtcblx0XHRldm50LmtleSA9IG9yaWdpbmFsLmtleUNvZGUgfHwgb3JpZ2luYWwud2hpY2g7XG5cdFx0ZXZudC5vcmlnaW5hbEV2ZW50ID0gb3JpZ2luYWw7XG5cdFx0ZSA9IGV2bnQ7XG5cblx0XHRpZiAoZS50eXBlID09PSBcImtleWRvd25cIikge1xuXHRcdFx0aWYgKENyYWZ0eS5rZXlkb3duW2Uua2V5XSAhPT0gdHJ1ZSkge1xuXHRcdFx0XHRDcmFmdHkua2V5ZG93bltlLmtleV0gPSB0cnVlO1xuXHRcdFx0XHRDcmFmdHkudHJpZ2dlcihcIktleURvd25cIiwgZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09IFwia2V5dXBcIikge1xuXHRcdFx0ZGVsZXRlIENyYWZ0eS5rZXlkb3duW2Uua2V5XTtcblx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiS2V5VXBcIiwgZSk7XG5cdFx0fVxuXG5cdFx0Ly9wcmV2ZW50IGRlZmF1bHQgYWN0aW9ucyBmb3IgYWxsIGtleXMgZXhjZXB0IGJhY2tzcGFjZSBhbmQgRjEtRjEyLlxuXHRcdC8vQW1vbmcgb3RoZXJzIHRoaXMgcHJldmVudCB0aGUgYXJyb3cga2V5cyBmcm9tIHNjcm9sbGluZyB0aGUgcGFyZW50IHBhZ2Vcblx0XHQvL29mIGFuIGlmcmFtZSBob3N0aW5nIHRoZSBnYW1lXG5cdFx0aWYoQ3JhZnR5LnNlbGVjdGVkICYmICEoZS5rZXkgPT0gOCB8fCBlLmtleSA+PSAxMTIgJiYgZS5rZXkgPD0gMTM1KSkge1xuXHRcdFx0aWYoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlbHNlIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcblxuXHRcdFx0aWYoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZWxzZSBlLnJldHVyblZhbHVlID0gZmFsc2U7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KTtcblxuLy9pbml0aWFsaXplIHRoZSBpbnB1dCBldmVudHMgb25sb2FkXG5DcmFmdHkuYmluZChcIkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgXCJrZXlkb3duXCIsIENyYWZ0eS5rZXlib2FyZERpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIFwia2V5dXBcIiwgQ3JhZnR5LmtleWJvYXJkRGlzcGF0Y2gpO1xuXG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZWRvd25cIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBkb2N1bWVudC5ib2R5LCBcIm1vdXNldXBcIiwgQ3JhZnR5LmRldGVjdEJsdXIpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vtb3ZlXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcImNsaWNrXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcImRibGNsaWNrXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblxuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hzdGFydFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaG1vdmVcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hlbmRcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGNhbmNlbFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG4gICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNobGVhdmVcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuICAgfSk7XG5cbkNyYWZ0eS5iaW5kKFwiQ3JhZnR5U3RvcFwiLCBmdW5jdGlvbiAoKSB7XG5cdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBcImtleWRvd25cIiwgQ3JhZnR5LmtleWJvYXJkRGlzcGF0Y2gpO1xuXHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgXCJrZXl1cFwiLCBDcmFmdHkua2V5Ym9hcmREaXNwYXRjaCk7XG5cblx0aWYgKENyYWZ0eS5zdGFnZSkge1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZWRvd25cIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vtb3ZlXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwiY2xpY2tcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJkYmxjbGlja1wiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hzdGFydFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNobW92ZVwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoZW5kXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hjYW5jZWxcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGxlYXZlXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0fVxuXG5cdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBkb2N1bWVudC5ib2R5LCBcIm1vdXNldXBcIiwgQ3JhZnR5LmRldGVjdEJsdXIpO1xufSk7XG5cbi8qKkBcbiogI01vdXNlXG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBQcm92aWRlcyB0aGUgZW50aXR5IHdpdGggbW91c2UgcmVsYXRlZCBldmVudHNcbiogQHRyaWdnZXIgTW91c2VPdmVyIC0gd2hlbiB0aGUgbW91c2UgZW50ZXJzIHRoZSBlbnRpdHkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIE1vdXNlT3V0IC0gd2hlbiB0aGUgbW91c2UgbGVhdmVzIHRoZSBlbnRpdHkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIE1vdXNlRG93biAtIHdoZW4gdGhlIG1vdXNlIGJ1dHRvbiBpcyBwcmVzc2VkIG9uIHRoZSBlbnRpdHkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIE1vdXNlVXAgLSB3aGVuIHRoZSBtb3VzZSBidXR0b24gaXMgcmVsZWFzZWQgb24gdGhlIGVudGl0eSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgQ2xpY2sgLSB3aGVuIHRoZSB1c2VyIGNsaWNrcyB0aGUgZW50aXR5LiBbU2VlIGRvY3VtZW50YXRpb25dKGh0dHA6Ly93d3cucXVpcmtzbW9kZS5vcmcvZG9tL2V2ZW50cy9jbGljay5odG1sKSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgRG91YmxlQ2xpY2sgLSB3aGVuIHRoZSB1c2VyIGRvdWJsZSBjbGlja3MgdGhlIGVudGl0eSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgTW91c2VNb3ZlIC0gd2hlbiB0aGUgbW91c2UgaXMgb3ZlciB0aGUgZW50aXR5IGFuZCBtb3ZlcyAtIE1vdXNlRXZlbnRcbiogQ3JhZnR5IGFkZHMgdGhlIG1vdXNlQnV0dG9uIHByb3BlcnR5IHRvIE1vdXNlRXZlbnRzIHRoYXQgbWF0Y2ggb25lIG9mXG4qXG4qIH5+flxuKiAtIENyYWZ0eS5tb3VzZUJ1dHRvbnMuTEVGVFxuKiAtIENyYWZ0eS5tb3VzZUJ1dHRvbnMuUklHSFRcbiogLSBDcmFmdHkubW91c2VCdXR0b25zLk1JRERMRVxuKiB+fn5cbiogXG4qIEBleGFtcGxlXG4qIH5+flxuKiBteUVudGl0eS5iaW5kKCdDbGljaycsIGZ1bmN0aW9uKCkge1xuKiAgICAgIGNvbnNvbGUubG9nKFwiQ2xpY2tlZCEhXCIpO1xuKiB9KVxuKlxuKiBteUVudGl0eS5iaW5kKCdNb3VzZVVwJywgZnVuY3Rpb24oZSkge1xuKiAgICBpZiggZS5tb3VzZUJ1dHRvbiA9PSBDcmFmdHkubW91c2VCdXR0b25zLlJJR0hUIClcbiogICAgICAgIGNvbnNvbGUubG9nKFwiQ2xpY2tlZCByaWdodCBidXR0b25cIik7XG4qIH0pXG4qIH5+flxuKi9cbkNyYWZ0eS5jKFwiTW91c2VcIiwge1xuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0Q3JhZnR5Lm1vdXNlT2JqcysrO1xuXHRcdHRoaXMuYmluZChcIlJlbW92ZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRDcmFmdHkubW91c2VPYmpzLS07XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYXJlYU1hcFxuXHQqIEBjb21wIE1vdXNlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFyZWFNYXAoQ3JhZnR5LnBvbHlnb24gcG9seWdvbilcblx0KiBAcGFyYW0gcG9seWdvbiAtIEluc3RhbmNlIG9mIENyYWZ0eS5wb2x5Z29uIHVzZWQgdG8gY2hlY2sgaWYgdGhlIG1vdXNlIGNvb3JkaW5hdGVzIGFyZSBpbnNpZGUgdGhpcyByZWdpb25cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYXJlYU1hcChBcnJheSBwb2ludDEsIC4uLCBBcnJheSBwb2ludE4pXG5cdCogQHBhcmFtIHBvaW50IyAtIEFycmF5IHdpdGggYW4gYHhgIGFuZCBgeWAgcG9zaXRpb24gdG8gZ2VuZXJhdGUgYSBwb2x5Z29uXG5cdCogXG5cdCogQXNzaWduIGEgcG9seWdvbiB0byB0aGUgZW50aXR5IHNvIHRoYXQgbW91c2UgZXZlbnRzIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgaWZcblx0KiB0aGUgY29vcmRpbmF0ZXMgYXJlIGluc2lkZSB0aGUgZ2l2ZW4gcG9seWdvbi5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3IsIE1vdXNlXCIpXG5cdCogICAgIC5jb2xvcihcInJlZFwiKVxuXHQqICAgICAuYXR0cih7IHc6IDEwMCwgaDogMTAwIH0pXG5cdCogICAgIC5iaW5kKCdNb3VzZU92ZXInLCBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcIm92ZXJcIil9KVxuXHQqICAgICAuYXJlYU1hcChbMCwwXSwgWzUwLDBdLCBbNTAsNTBdLCBbMCw1MF0pXG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkucG9seWdvblxuXHQqL1xuXHRhcmVhTWFwOiBmdW5jdGlvbiAocG9seSkge1xuXHRcdC8vY3JlYXRlIHBvbHlnb25cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vY29udmVydCBhcmdzIHRvIGFycmF5IHRvIGNyZWF0ZSBwb2x5Z29uXG5cdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cdFx0XHRwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKGFyZ3MpO1xuXHRcdH1cblxuXHRcdHBvbHkuc2hpZnQodGhpcy5feCwgdGhpcy5feSk7XG5cdFx0Ly90aGlzLm1hcCA9IHBvbHk7XG5cdFx0dGhpcy5tYXBBcmVhID0gcG9seTtcblxuXHRcdHRoaXMuYXR0YWNoKHRoaXMubWFwQXJlYSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNEcmFnZ2FibGVcbiogQGNhdGVnb3J5IElucHV0XG4qIEVuYWJsZSBkcmFnIGFuZCBkcm9wIG9mIHRoZSBlbnRpdHkuXG4qIEB0cmlnZ2VyIERyYWdnaW5nIC0gaXMgdHJpZ2dlcmVkIGVhY2ggZnJhbWUgdGhlIGVudGl0eSBpcyBiZWluZyBkcmFnZ2VkIC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBTdGFydERyYWcgLSBpcyB0cmlnZ2VyZWQgd2hlbiBkcmFnZ2luZyBiZWdpbnMgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIFN0b3BEcmFnIC0gaXMgdHJpZ2dlcmVkIHdoZW4gZHJhZ2dpbmcgZW5kcyAtIE1vdXNlRXZlbnRcbiovXG5DcmFmdHkuYyhcIkRyYWdnYWJsZVwiLCB7XG4gIF9vcmlnTW91c2VET01Qb3M6IG51bGwsXG5cdF9vbGRYOiBudWxsLFxuXHRfb2xkWTogbnVsbCxcblx0X2RyYWdnaW5nOiBmYWxzZSxcblx0X2RpcjpudWxsLFxuXG5cdF9vbmRyYWc6IG51bGwsXG5cdF9vbmRvd246IG51bGwsXG5cdF9vbnVwOiBudWxsLFxuXG5cdC8vTm90ZTogdGhlIGNvZGUgaXMgbm90ZSB0ZXN0ZWQgd2l0aCB6b29tLCBldGMuLCB0aGF0IG1heSBkaXN0b3J0IHRoZSBkaXJlY3Rpb24gYmV0d2VlbiB0aGUgdmlld3BvcnQgYW5kIHRoZSBjb29yZGluYXRlIG9uIHRoZSBjYW52YXMuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKFwiTW91c2VcIik7XG5cdFx0XG5cdFx0dGhpcy5fb25kcmFnID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBwb3MgPSBDcmFmdHkuRE9NLnRyYW5zbGF0ZShlLmNsaWVudFgsIGUuY2xpZW50WSk7XG5cblx0XHRcdC8vIGlnbm9yZSBpbnZhbGlkIDAgMCBwb3NpdGlvbiAtIHN0cmFuZ2UgcHJvYmxlbSBvbiBpcGFkXG5cdFx0XHRpZiAocG9zLnggPT0gMCB8fCBwb3MueSA9PSAwKSB7XG5cdFx0XHQgICAgcmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHQgICAgXG5cdFx0XHRpZih0aGlzLl9kaXIpIHtcblx0XHRcdCAgICB2YXIgbGVuID0gKHBvcy54IC0gdGhpcy5fb3JpZ01vdXNlRE9NUG9zLngpICogdGhpcy5fZGlyLnggKyAocG9zLnkgLSB0aGlzLl9vcmlnTW91c2VET01Qb3MueSkgKiB0aGlzLl9kaXIueTtcblx0XHRcdCAgICB0aGlzLnggPSB0aGlzLl9vbGRYICsgbGVuICogdGhpcy5fZGlyLng7XG5cdFx0XHQgICAgdGhpcy55ID0gdGhpcy5fb2xkWSArIGxlbiAqIHRoaXMuX2Rpci55O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdCAgICB0aGlzLnggPSB0aGlzLl9vbGRYICsgKHBvcy54IC0gdGhpcy5fb3JpZ01vdXNlRE9NUG9zLngpO1xuXHRcdFx0ICAgIHRoaXMueSA9IHRoaXMuX29sZFkgKyAocG9zLnkgLSB0aGlzLl9vcmlnTW91c2VET01Qb3MueSk7XG5cdFx0XHR9XG5cdCAgICBcblx0XHRcdHRoaXMudHJpZ2dlcihcIkRyYWdnaW5nXCIsIGUpO1xuXHRcdH07XG5cblx0XHR0aGlzLl9vbmRvd24gPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUubW91c2VCdXR0b24gIT09IENyYWZ0eS5tb3VzZUJ1dHRvbnMuTEVGVCkgcmV0dXJuO1xuXHRcdFx0dGhpcy5fc3RhcnREcmFnKGUpO1xuXHRcdH07XG5cblx0XHR0aGlzLl9vbnVwID0gZnVuY3Rpb24gdXBwZXIoZSkge1xuXHRcdFx0aWYgKHRoaXMuX2RyYWdnaW5nID09IHRydWUpIHtcblx0XHRcdCAgICBDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vtb3ZlXCIsIHRoaXMuX29uZHJhZyk7XG5cdFx0XHQgICAgQ3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgdGhpcy5fb251cCk7XG5cdFx0XHQgICAgdGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHRcdCAgICB0aGlzLnRyaWdnZXIoXCJTdG9wRHJhZ1wiLCBlKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5lbmFibGVEcmFnKCk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZHJhZ0RpcmVjdGlvblxuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kcmFnRGlyZWN0aW9uKClcbiAgICAqIFJlbW92ZSBhbnkgcHJldmlvdXNseSBzcGVjaWZpZWQgZGlyZWN0aW9uLlxuICAgICpcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZHJhZ0RpcmVjdGlvbih2ZWN0b3IpXG4gICAgKiBAcGFyYW0gdmVjdG9yIC0gT2YgdGhlIGZvcm0gb2Yge3g6IHZhbHgsIHk6IHZhbHl9LCB0aGUgdmVjdG9yICh2YWx4LCB2YWx5KSBkZW5vdGVzIHRoZSBtb3ZlIGRpcmVjdGlvbi5cbiAgICAqIFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kcmFnRGlyZWN0aW9uKGRlZ3JlZSlcbiAgICAqIEBwYXJhbSBkZWdyZWUgLSBBIG51bWJlciwgdGhlIGRlZ3JlZSAoY2xvY2t3aXNlKSBvZiB0aGUgbW92ZSBkaXJlY3Rpb24gd2l0aCByZXNwZWN0IHRvIHRoZSB4IGF4aXMuIFxuXHQqIFNwZWNpZnkgdGhlIGRyYWdnaW5nIGRpcmVjdGlvbi5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMuZHJhZ0RpcmVjdGlvbigpXG5cdCogdGhpcy5kcmFnRGlyZWN0aW9uKHt4OjEsIHk6MH0pIC8vSG9yaXpvbnRhbFxuXHQqIHRoaXMuZHJhZ0RpcmVjdGlvbih7eDowLCB5OjF9KSAvL1ZlcnRpY2FsXG4gICAgKiAvLyBOb3RlOiBiZWNhdXNlIG9mIHRoZSBvcmllbnRhdGlvbiBvZiB4IGFuZCB5IGF4aXMsXG4gICAgKiAvLyB0aGlzIGlzIDQ1IGRlZ3JlZSBjbG9ja3dpc2Ugd2l0aCByZXNwZWN0IHRvIHRoZSB4IGF4aXMuXG5cdCogdGhpcy5kcmFnRGlyZWN0aW9uKHt4OjEsIHk6MX0pIC8vNDUgZGVncmVlLlxuXHQqIHRoaXMuZHJhZ0RpcmVjdGlvbig2MCkgLy82MCBkZWdyZWUuXG5cdCogfn5+XG5cdCovXG5cdGRyYWdEaXJlY3Rpb246IGZ1bmN0aW9uKGRpcikge1xuXHRcdGlmICh0eXBlb2YgZGlyID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5fZGlyPW51bGw7XG5cdFx0fSBlbHNlIGlmICgoXCJcIiArIHBhcnNlSW50KGRpcikpID09IGRpcikgeyAvL2RpciBpcyBhIG51bWJlclxuICAgICAgdGhpcy5fZGlyPXtcbiAgICAgICAgeDogTWF0aC5jb3MoZGlyLzE4MCpNYXRoLlBJKVxuICAgICAgICAsIHk6IE1hdGguc2luKGRpci8xODAqTWF0aC5QSSlcbiAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHI9TWF0aC5zcXJ0KGRpci54ICogZGlyLnggKyBkaXIueSAqIGRpci55KVxuXHRcdFx0dGhpcy5fZGlyPXtcbiAgICAgICAgeDogZGlyLngvclxuICAgICAgICAsIHk6IGRpci55L3JcbiAgICAgIH07XG5cdFx0fVxuXHR9LFxuXHRcblx0XG5cdC8qKkBcblx0KiAjLl9zdGFydERyYWdcblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBJbnRlcm5hbCBtZXRob2QgZm9yIHN0YXJ0aW5nIGEgZHJhZyBvZiBhbiBlbnRpdHkgZWl0aGVyIHByb2dyYW1hdGljYWxseSBvciB2aWEgTW91c2UgY2xpY2tcblx0KlxuXHQqIEBwYXJhbSBlIC0gYSBtb3VzZSBldmVudFxuXHQqL1xuXHRfc3RhcnREcmFnOiBmdW5jdGlvbihlKXtcblx0XHR0aGlzLl9vcmlnTW91c2VET01Qb3MgPSBDcmFmdHkuRE9NLnRyYW5zbGF0ZShlLmNsaWVudFgsIGUuY2xpZW50WSk7XG5cdFx0dGhpcy5fb2xkWCA9IHRoaXMuX3g7XG5cdFx0dGhpcy5fb2xkWSA9IHRoaXMuX3k7XG5cdFx0dGhpcy5fZHJhZ2dpbmcgPSB0cnVlO1xuXG5cdFx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlbW92ZVwiLCB0aGlzLl9vbmRyYWcpO1xuXHRcdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIHRoaXMuX29udXApO1xuXHRcdHRoaXMudHJpZ2dlcihcIlN0YXJ0RHJhZ1wiLCBlKTtcblx0fSxcblx0XG5cdC8qKkBcblx0KiAjLnN0b3BEcmFnXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnN0b3BEcmFnKHZvaWQpXG5cdCogQHRyaWdnZXIgU3RvcERyYWcgLSBDYWxsZWQgcmlnaHQgYWZ0ZXIgdGhlIG1vdXNlIGxpc3RlbmVycyBhcmUgcmVtb3ZlZFxuXHQqIFxuXHQqIFN0b3AgdGhlIGVudGl0eSBmcm9tIGRyYWdnaW5nLiBFc3NlbnRpYWxseSByZXByb2R1Y2luZyB0aGUgZHJvcC5cblx0KiBcblx0KiBAc2VlIC5zdGFydERyYWdcblx0Ki9cblx0c3RvcERyYWc6IGZ1bmN0aW9uICgpIHtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vtb3ZlXCIsIHRoaXMuX29uZHJhZyk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgdGhpcy5fb251cCk7XG5cblx0XHR0aGlzLl9kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdHRoaXMudHJpZ2dlcihcIlN0b3BEcmFnXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnN0YXJ0RHJhZ1xuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5zdGFydERyYWcodm9pZClcblx0KiBcblx0KiBNYWtlIHRoZSBlbnRpdHkgZm9sbG93IHRoZSBtb3VzZSBwb3NpdGlvbnMuXG5cdCogXG5cdCogQHNlZSAuc3RvcERyYWdcblx0Ki9cblx0c3RhcnREcmFnOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9kcmFnZ2luZykge1xuXHRcdFx0Ly9Vc2UgdGhlIGxhc3Qga25vd24gcG9zaXRpb24gb2YgdGhlIG1vdXNlXG5cdFx0XHR0aGlzLl9zdGFydERyYWcoQ3JhZnR5Lmxhc3RFdmVudCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmVuYWJsZURyYWdcblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZW5hYmxlRHJhZyh2b2lkKVxuXHQqIFxuXHQqIFJlYmluZCB0aGUgbW91c2UgZXZlbnRzLiBVc2UgaWYgYC5kaXNhYmxlRHJhZ2AgaGFzIGJlZW4gY2FsbGVkLlxuXHQqIFxuXHQqIEBzZWUgLmRpc2FibGVEcmFnXG5cdCovXG5cdGVuYWJsZURyYWc6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLmJpbmQoXCJNb3VzZURvd25cIiwgdGhpcy5fb25kb3duKTtcblxuXHRcdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIHRoaXMuX29udXApO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmRpc2FibGVEcmFnXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRpc2FibGVEcmFnKHZvaWQpXG5cdCogXG5cdCogU3RvcHMgZW50aXR5IGZyb20gYmVpbmcgZHJhZ2dhYmxlLiBSZWVuYWJsZSB3aXRoIGAuZW5hYmxlRHJhZygpYC5cblx0KiBcblx0KiBAc2VlIC5lbmFibGVEcmFnXG5cdCovXG5cdGRpc2FibGVEcmFnOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy51bmJpbmQoXCJNb3VzZURvd25cIiwgdGhpcy5fb25kb3duKTtcblx0XHR0aGlzLnN0b3BEcmFnKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNLZXlib2FyZFxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogR2l2ZSBlbnRpdGllcyBrZXlib2FyZCBldmVudHMgKGBrZXlkb3duYCBhbmQgYGtleXVwYCkuXG4qL1xuQ3JhZnR5LmMoXCJLZXlib2FyZFwiLCB7XG4vKipAXG5cdCogIy5pc0Rvd25cblx0KiBAY29tcCBLZXlib2FyZFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIGlzRG93bihTdHJpbmcga2V5TmFtZSlcblx0KiBAcGFyYW0ga2V5TmFtZSAtIE5hbWUgb2YgdGhlIGtleSB0byBjaGVjay4gU2VlIGBDcmFmdHkua2V5c2AuXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gaXNEb3duKE51bWJlciBrZXlDb2RlKVxuXHQqIEBwYXJhbSBrZXlDb2RlIC0gS2V5IGNvZGUgaW4gYENyYWZ0eS5rZXlzYC5cblx0KiBcblx0KiBEZXRlcm1pbmUgaWYgYSBjZXJ0YWluIGtleSBpcyBjdXJyZW50bHkgZG93bi5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIGVudGl0eS5yZXF1aXJlcygnS2V5Ym9hcmQnKS5iaW5kKCdLZXlEb3duJywgZnVuY3Rpb24gKCkgeyBpZiAodGhpcy5pc0Rvd24oJ1NQQUNFJykpIGp1bXAoKTsgfSk7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkua2V5c1xuXHQqL1xuXHRpc0Rvd246IGZ1bmN0aW9uIChrZXkpIHtcblx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0a2V5ID0gQ3JhZnR5LmtleXNba2V5XTtcblx0XHR9XG5cdFx0cmV0dXJuICEhQ3JhZnR5LmtleWRvd25ba2V5XTtcblx0fVxufSk7XG5cbi8qKkBcbiogI011bHRpd2F5XG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBVc2VkIHRvIGJpbmQga2V5cyB0byBkaXJlY3Rpb25zIGFuZCBoYXZlIHRoZSBlbnRpdHkgbW92ZSBhY2NvcmRpbmdseVxuKiBAdHJpZ2dlciBOZXdEaXJlY3Rpb24gLSB0cmlnZ2VyZWQgd2hlbiBkaXJlY3Rpb24gY2hhbmdlcyAtIHsgeDpOdW1iZXIsIHk6TnVtYmVyIH0gLSBOZXcgZGlyZWN0aW9uXG4qIEB0cmlnZ2VyIE1vdmVkIC0gdHJpZ2dlcmVkIG9uIG1vdmVtZW50IG9uIGVpdGhlciB4IG9yIHkgYXhpcy4gSWYgdGhlIGVudGl0eSBoYXMgbW92ZWQgb24gYm90aCBheGVzIGZvciBkaWFnb25hbCBtb3ZlbWVudCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkIHR3aWNlIC0geyB4Ok51bWJlciwgeTpOdW1iZXIgfSAtIE9sZCBwb3NpdGlvblxuKi9cbkNyYWZ0eS5jKFwiTXVsdGl3YXlcIiwge1xuXHRfc3BlZWQ6IDMsXG5cbiAgX2tleWRvd246IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKHRoaXMuX2tleXNbZS5rZXldKSB7XG5cdFx0XHR0aGlzLl9tb3ZlbWVudC54ID0gTWF0aC5yb3VuZCgodGhpcy5fbW92ZW1lbnQueCArIHRoaXMuX2tleXNbZS5rZXldLngpICogMTAwMCkgLyAxMDAwO1xuXHRcdFx0dGhpcy5fbW92ZW1lbnQueSA9IE1hdGgucm91bmQoKHRoaXMuX21vdmVtZW50LnkgKyB0aGlzLl9rZXlzW2Uua2V5XS55KSAqIDEwMDApIC8gMTAwMDtcblx0XHRcdHRoaXMudHJpZ2dlcignTmV3RGlyZWN0aW9uJywgdGhpcy5fbW92ZW1lbnQpO1xuXHRcdH1cblx0fSxcblxuICBfa2V5dXA6IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKHRoaXMuX2tleXNbZS5rZXldKSB7XG5cdFx0XHR0aGlzLl9tb3ZlbWVudC54ID0gTWF0aC5yb3VuZCgodGhpcy5fbW92ZW1lbnQueCAtIHRoaXMuX2tleXNbZS5rZXldLngpICogMTAwMCkgLyAxMDAwO1xuXHRcdFx0dGhpcy5fbW92ZW1lbnQueSA9IE1hdGgucm91bmQoKHRoaXMuX21vdmVtZW50LnkgLSB0aGlzLl9rZXlzW2Uua2V5XS55KSAqIDEwMDApIC8gMTAwMDtcblx0XHRcdHRoaXMudHJpZ2dlcignTmV3RGlyZWN0aW9uJywgdGhpcy5fbW92ZW1lbnQpO1xuXHRcdH1cblx0fSxcblxuICBfZW50ZXJmcmFtZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLmRpc2FibGVDb250cm9scykgcmV0dXJuO1xuXG5cdFx0aWYgKHRoaXMuX21vdmVtZW50LnggIT09IDApIHtcblx0XHRcdHRoaXMueCArPSB0aGlzLl9tb3ZlbWVudC54O1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdNb3ZlZCcsIHsgeDogdGhpcy54IC0gdGhpcy5fbW92ZW1lbnQueCwgeTogdGhpcy55IH0pO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbW92ZW1lbnQueSAhPT0gMCkge1xuXHRcdFx0dGhpcy55ICs9IHRoaXMuX21vdmVtZW50Lnk7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ01vdmVkJywgeyB4OiB0aGlzLngsIHk6IHRoaXMueSAtIHRoaXMuX21vdmVtZW50LnkgfSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKkBcblx0KiAjLm11bHRpd2F5XG5cdCogQGNvbXAgTXVsdGl3YXlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAubXVsdGl3YXkoW051bWJlciBzcGVlZCxdIE9iamVjdCBrZXlCaW5kaW5ncyApXG5cdCogQHBhcmFtIHNwZWVkIC0gQW1vdW50IG9mIHBpeGVscyB0byBtb3ZlIHRoZSBlbnRpdHkgd2hpbHN0IGEga2V5IGlzIGRvd25cblx0KiBAcGFyYW0ga2V5QmluZGluZ3MgLSBXaGF0IGtleXMgc2hvdWxkIG1ha2UgdGhlIGVudGl0eSBnbyBpbiB3aGljaCBkaXJlY3Rpb24uIERpcmVjdGlvbiBpcyBzcGVjaWZpZWQgaW4gZGVncmVlc1xuXHQqIENvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUgdGhlIHNwZWVkIGFuZCBrZXlCaW5kaW5ncy4gQ29tcG9uZW50IHdpbGwgbGlzdGVuIHRvIGtleSBldmVudHMgYW5kIG1vdmUgdGhlIGVudGl0eSBhcHByb3ByaWF0ZWx5LlxuXHQqXG5cdCogV2hlbiBkaXJlY3Rpb24gY2hhbmdlcyBhIE5ld0RpcmVjdGlvbiBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3QgZGV0YWlsaW5nIHRoZSBuZXcgZGlyZWN0aW9uOiB7eDogeF9tb3ZlbWVudCwgeTogeV9tb3ZlbWVudH1cblx0KiBXaGVuIGVudGl0eSBoYXMgbW92ZWQgb24gZWl0aGVyIHgtIG9yIHktYXhpcyBhIE1vdmVkIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBzcGVjaWZ5aW5nIHRoZSBvbGQgcG9zaXRpb24ge3g6IG9sZF94LCB5OiBvbGRfeX1cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMubXVsdGl3YXkoMywge1VQX0FSUk9XOiAtOTAsIERPV05fQVJST1c6IDkwLCBSSUdIVF9BUlJPVzogMCwgTEVGVF9BUlJPVzogMTgwfSk7XG5cdCogdGhpcy5tdWx0aXdheSh7eDozLHk6MS41fSwge1VQX0FSUk9XOiAtOTAsIERPV05fQVJST1c6IDkwLCBSSUdIVF9BUlJPVzogMCwgTEVGVF9BUlJPVzogMTgwfSk7XG5cdCogdGhpcy5tdWx0aXdheSh7VzogLTkwLCBTOiA5MCwgRDogMCwgQTogMTgwfSk7XG5cdCogfn5+XG5cdCovXG5cdG11bHRpd2F5OiBmdW5jdGlvbiAoc3BlZWQsIGtleXMpIHtcblx0XHR0aGlzLl9rZXlEaXJlY3Rpb24gPSB7fTtcblx0XHR0aGlzLl9rZXlzID0ge307XG5cdFx0dGhpcy5fbW92ZW1lbnQgPSB7IHg6IDAsIHk6IDAgfTtcblx0XHR0aGlzLl9zcGVlZCA9IHsgeDogMywgeTogMyB9O1xuXG5cdFx0aWYgKGtleXMpIHtcblx0XHRcdGlmIChzcGVlZC54ICYmIHNwZWVkLnkpIHtcblx0XHRcdFx0dGhpcy5fc3BlZWQueCA9IHNwZWVkLng7XG5cdFx0XHRcdHRoaXMuX3NwZWVkLnkgPSBzcGVlZC55O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fc3BlZWQueCA9IHNwZWVkO1xuXHRcdFx0XHR0aGlzLl9zcGVlZC55ID0gc3BlZWQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGtleXMgPSBzcGVlZDtcblx0XHR9XG5cblx0XHR0aGlzLl9rZXlEaXJlY3Rpb24gPSBrZXlzO1xuXHRcdHRoaXMuc3BlZWQodGhpcy5fc3BlZWQpO1xuXG5cdFx0dGhpcy5kaXNhYmxlQ29udHJvbCgpO1xuXHRcdHRoaXMuZW5hYmxlQ29udHJvbCgpO1xuXG5cdFx0Ly9BcHBseSBtb3ZlbWVudCBpZiBrZXkgaXMgZG93biB3aGVuIGNyZWF0ZWRcblx0XHRmb3IgKHZhciBrIGluIGtleXMpIHtcblx0XHRcdGlmIChDcmFmdHkua2V5ZG93bltDcmFmdHkua2V5c1trXV0pIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKFwiS2V5RG93blwiLCB7IGtleTogQ3JhZnR5LmtleXNba10gfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZW5hYmxlQ29udHJvbFxuXHQqIEBjb21wIE11bHRpd2F5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmVuYWJsZUNvbnRyb2woKVxuXHQqIFxuXHQqIEVuYWJsZSB0aGUgY29tcG9uZW50IHRvIGxpc3RlbiB0byBrZXkgZXZlbnRzLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cbiAgICAqIHRoaXMuZW5hYmxlQ29udHJvbCgpO1xuXHQqIH5+flxuXHQqL1xuICBlbmFibGVDb250cm9sOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmJpbmQoXCJLZXlEb3duXCIsIHRoaXMuX2tleWRvd24pXG5cdFx0LmJpbmQoXCJLZXlVcFwiLCB0aGlzLl9rZXl1cClcblx0XHQuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy5fZW50ZXJmcmFtZSk7XG5cdFx0cmV0dXJuIHRoaXM7XG4gIH0sXG5cblx0LyoqQFxuXHQqICMuZGlzYWJsZUNvbnRyb2xcblx0KiBAY29tcCBNdWx0aXdheVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kaXNhYmxlQ29udHJvbCgpXG5cdCogXG5cdCogRGlzYWJsZSB0aGUgY29tcG9uZW50IHRvIGxpc3RlbiB0byBrZXkgZXZlbnRzLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cbiAgICAqIHRoaXMuZGlzYWJsZUNvbnRyb2woKTtcblx0KiB+fn5cblx0Ki9cblxuICBkaXNhYmxlQ29udHJvbDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy51bmJpbmQoXCJLZXlEb3duXCIsIHRoaXMuX2tleWRvd24pXG5cdFx0LnVuYmluZChcIktleVVwXCIsIHRoaXMuX2tleXVwKVxuXHRcdC51bmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMuX2VudGVyZnJhbWUpO1xuXHRcdHJldHVybiB0aGlzO1xuICB9LFxuXG5cdHNwZWVkOiBmdW5jdGlvbiAoc3BlZWQpIHtcblx0XHRmb3IgKHZhciBrIGluIHRoaXMuX2tleURpcmVjdGlvbikge1xuXHRcdFx0dmFyIGtleUNvZGUgPSBDcmFmdHkua2V5c1trXSB8fCBrO1xuXHRcdFx0dGhpcy5fa2V5c1trZXlDb2RlXSA9IHtcblx0XHRcdFx0eDogTWF0aC5yb3VuZChNYXRoLmNvcyh0aGlzLl9rZXlEaXJlY3Rpb25ba10gKiAoTWF0aC5QSSAvIDE4MCkpICogMTAwMCAqIHNwZWVkLngpIC8gMTAwMCxcblx0XHRcdFx0eTogTWF0aC5yb3VuZChNYXRoLnNpbih0aGlzLl9rZXlEaXJlY3Rpb25ba10gKiAoTWF0aC5QSSAvIDE4MCkpICogMTAwMCAqIHNwZWVkLnkpIC8gMTAwMFxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNGb3Vyd2F5XG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBNb3ZlIGFuIGVudGl0eSBpbiBmb3VyIGRpcmVjdGlvbnMgYnkgdXNpbmcgdGhlXG4qIGFycm93IGtleXMgb3IgYFdgLCBgQWAsIGBTYCwgYERgLlxuKi9cbkNyYWZ0eS5jKFwiRm91cndheVwiLCB7XG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoXCJNdWx0aXdheVwiKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5mb3Vyd2F5XG5cdCogQGNvbXAgRm91cndheVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5mb3Vyd2F5KE51bWJlciBzcGVlZClcblx0KiBAcGFyYW0gc3BlZWQgLSBBbW91bnQgb2YgcGl4ZWxzIHRvIG1vdmUgdGhlIGVudGl0eSB3aGlsc3QgYSBrZXkgaXMgZG93blxuXHQqIENvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUgdGhlIHNwZWVkLiBDb21wb25lbnQgd2lsbCBsaXN0ZW4gZm9yIGtleSBldmVudHMgYW5kIG1vdmUgdGhlIGVudGl0eSBhcHByb3ByaWF0ZWx5LlxuXHQqIFRoaXMgaW5jbHVkZXMgYFVwIEFycm93YCwgYFJpZ2h0IEFycm93YCwgYERvd24gQXJyb3dgLCBgTGVmdCBBcnJvd2AgYXMgd2VsbCBhcyBgV2AsIGBBYCwgYFNgLCBgRGAuXG5cdCpcblx0KiBXaGVuIGRpcmVjdGlvbiBjaGFuZ2VzIGEgTmV3RGlyZWN0aW9uIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBkZXRhaWxpbmcgdGhlIG5ldyBkaXJlY3Rpb246IHt4OiB4X21vdmVtZW50LCB5OiB5X21vdmVtZW50fVxuXHQqIFdoZW4gZW50aXR5IGhhcyBtb3ZlZCBvbiBlaXRoZXIgeC0gb3IgeS1heGlzIGEgTW92ZWQgZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IHNwZWNpZnlpbmcgdGhlIG9sZCBwb3NpdGlvbiB7eDogb2xkX3gsIHk6IG9sZF95fVxuXHQqXG5cdCogVGhlIGtleSBwcmVzc2VzIHdpbGwgbW92ZSB0aGUgZW50aXR5IGluIHRoYXQgZGlyZWN0aW9uIGJ5IHRoZSBzcGVlZCBwYXNzZWQgaW4gdGhlIGFyZ3VtZW50LlxuXHQqIFxuXHQqIEBzZWUgTXVsdGl3YXlcblx0Ki9cblx0Zm91cndheTogZnVuY3Rpb24gKHNwZWVkKSB7XG5cdFx0dGhpcy5tdWx0aXdheShzcGVlZCwge1xuXHRcdFx0VVBfQVJST1c6IC05MCxcblx0XHRcdERPV05fQVJST1c6IDkwLFxuXHRcdFx0UklHSFRfQVJST1c6IDAsXG5cdFx0XHRMRUZUX0FSUk9XOiAxODAsXG5cdFx0XHRXOiAtOTAsXG5cdFx0XHRTOiA5MCxcblx0XHRcdEQ6IDAsXG5cdFx0XHRBOiAxODAsXG5cdFx0XHRaOiAtOTAsXG5cdFx0XHRROiAxODBcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjVHdvd2F5XG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBNb3ZlIGFuIGVudGl0eSBsZWZ0IG9yIHJpZ2h0IHVzaW5nIHRoZSBhcnJvdyBrZXlzIG9yIGBEYCBhbmQgYEFgIGFuZCBqdW1wIHVzaW5nIHVwIGFycm93IG9yIGBXYC5cbipcbiogV2hlbiBkaXJlY3Rpb24gY2hhbmdlcyBhIE5ld0RpcmVjdGlvbiBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3QgZGV0YWlsaW5nIHRoZSBuZXcgZGlyZWN0aW9uOiB7eDogeF9tb3ZlbWVudCwgeTogeV9tb3ZlbWVudH0uIFRoaXMgaXMgY29uc2lzdGVudCB3aXRoIEZvdXJ3YXkgYW5kIE11bHRpd2F5IGNvbXBvbmVudHMuXG4qIFdoZW4gZW50aXR5IGhhcyBtb3ZlZCBvbiB4LWF4aXMgYSBNb3ZlZCBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3Qgc3BlY2lmeWluZyB0aGUgb2xkIHBvc2l0aW9uIHt4OiBvbGRfeCwgeTogb2xkX3l9XG4qL1xuQ3JhZnR5LmMoXCJUd293YXlcIiwge1xuXHRfc3BlZWQ6IDMsXG5cdF91cDogZmFsc2UsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoXCJGb3Vyd2F5LCBLZXlib2FyZFwiKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy50d293YXlcblx0KiBAY29tcCBUd293YXlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAudHdvd2F5KE51bWJlciBzcGVlZFssIE51bWJlciBqdW1wU3BlZWRdKVxuXHQqIEBwYXJhbSBzcGVlZCAtIEFtb3VudCBvZiBwaXhlbHMgdG8gbW92ZSBsZWZ0IG9yIHJpZ2h0XG5cdCogQHBhcmFtIGp1bXBTcGVlZCAtIEhvdyBoaWdoIHRoZSBlbnRpdHkgc2hvdWxkIGp1bXBcblx0KiBcblx0KiBDb25zdHJ1Y3RvciB0byBpbml0aWFsaXplIHRoZSBzcGVlZCBhbmQgcG93ZXIgb2YganVtcC4gQ29tcG9uZW50IHdpbGxcblx0KiBsaXN0ZW4gZm9yIGtleSBldmVudHMgYW5kIG1vdmUgdGhlIGVudGl0eSBhcHByb3ByaWF0ZWx5LiBUaGlzIGluY2x1ZGVzXG5cdCogfn5+XG5cdCogYFVwIEFycm93YCwgYFJpZ2h0IEFycm93YCwgYExlZnQgQXJyb3dgIGFzIHdlbGwgYXMgVywgQSwgRC4gVXNlZCB3aXRoIHRoZVxuXHQqIGBncmF2aXR5YCBjb21wb25lbnQgdG8gc2ltdWxhdGUganVtcGluZy5cblx0KiB+fn5cblx0KiBcblx0KiBUaGUga2V5IHByZXNzZXMgd2lsbCBtb3ZlIHRoZSBlbnRpdHkgaW4gdGhhdCBkaXJlY3Rpb24gYnkgdGhlIHNwZWVkIHBhc3NlZCBpblxuXHQqIHRoZSBhcmd1bWVudC4gUHJlc3NpbmcgdGhlIGBVcCBBcnJvd2Agb3IgYFdgIHdpbGwgY2F1c2UgdGhlIGVudGl0eSB0byBqdW1wLlxuXHQqIFxuXHQqIEBzZWUgR3Jhdml0eSwgRm91cndheVxuXHQqL1xuXHR0d293YXk6IGZ1bmN0aW9uIChzcGVlZCwganVtcCkge1xuXG5cdFx0dGhpcy5tdWx0aXdheShzcGVlZCwge1xuXHRcdFx0UklHSFRfQVJST1c6IDAsXG5cdFx0XHRMRUZUX0FSUk9XOiAxODAsXG5cdFx0XHREOiAwLFxuXHRcdFx0QTogMTgwLFxuXHRcdFx0UTogMTgwXG5cdFx0fSk7XG5cblx0XHRpZiAoc3BlZWQpIHRoaXMuX3NwZWVkID0gc3BlZWQ7XG5cdFx0anVtcCA9IGp1bXAgfHwgdGhpcy5fc3BlZWQgKiAyO1xuXG5cdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5kaXNhYmxlQ29udHJvbHMpIHJldHVybjtcblx0XHRcdGlmICh0aGlzLl91cCkge1xuXHRcdFx0XHR0aGlzLnkgLT0ganVtcDtcblx0XHRcdFx0dGhpcy5fZmFsbGluZyA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSkuYmluZChcIktleURvd25cIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMuaXNEb3duKFwiVVBfQVJST1dcIikgfHwgdGhpcy5pc0Rvd24oXCJXXCIpIHx8IHRoaXMuaXNEb3duKFwiWlwiKSkgdGhpcy5fdXAgPSB0cnVlO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNTcHJpdGVBbmltYXRpb25cbiogQGNhdGVnb3J5IEFuaW1hdGlvblxuKiBAdHJpZ2dlciBBbmltYXRpb25FbmQgLSBXaGVuIHRoZSBhbmltYXRpb24gZmluaXNoZXMgLSB7IHJlZWwgfVxuKiBAdHJpZ2dlciBDaGFuZ2UgLSBPbiBlYWNoIGZyYW1lXG4qXG4qIFVzZWQgdG8gYW5pbWF0ZSBzcHJpdGVzIGJ5IGNoYW5naW5nIHRoZSBzcHJpdGVzIGluIHRoZSBzcHJpdGUgbWFwLlxuKlxuKi9cbkNyYWZ0eS5jKFwiU3ByaXRlQW5pbWF0aW9uXCIsIHtcbi8qKkBcblx0KiAjLl9yZWVsc1xuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqXG5cdCogQSBtYXAgY29uc2lzdHMgb2YgYXJyYXlzIHRoYXQgY29udGFpbnMgdGhlIGNvb3JkaW5hdGVzIG9mIGVhY2ggZnJhbWUgd2l0aGluIHRoZSBzcHJpdGUsIGUuZy4sXG4gICAgKiBge1wid2Fsa19sZWZ0XCI6W1s5Niw0OF0sWzExMiw0OF0sWzEyOCw0OF1dfWBcblx0Ki9cblx0X3JlZWxzOiBudWxsLFxuXHRfZnJhbWU6IG51bGwsXG5cblx0LyoqQFxuXHQqICMuX2N1cnJlbnRSZWVsSWRcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KlxuXHQqIFRoZSBjdXJyZW50IHBsYXlpbmcgcmVlbCAob25lIGVsZW1lbnQgb2YgYHRoaXMuX3JlZWxzYCkuIEl0IGlzIGBudWxsYCBpZiBubyByZWVsIGlzIHBsYXlpbmcuXG5cdCovXG5cdF9jdXJyZW50UmVlbElkOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9yZWVscyA9IHt9O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmFuaW1hdGVcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYW5pbWF0ZShTdHJpbmcgcmVlbElkLCBOdW1iZXIgZnJvbVgsIE51bWJlciB5LCBOdW1iZXIgdG9YKVxuXHQqIEBwYXJhbSByZWVsSWQgLSBJRCBvZiB0aGUgYW5pbWF0aW9uIHJlZWwgYmVpbmcgY3JlYXRlZFxuXHQqIEBwYXJhbSBmcm9tWCAtIFN0YXJ0aW5nIGB4YCBwb3NpdGlvbiAoaW4gdGhlIHVuaXQgb2Ygc3ByaXRlIGhvcml6b250YWwgc2l6ZSkgb24gdGhlIHNwcml0ZSBtYXBcblx0KiBAcGFyYW0geSAtIGB5YCBwb3NpdGlvbiBvbiB0aGUgc3ByaXRlIG1hcCAoaW4gdGhlIHVuaXQgb2Ygc3ByaXRlIHZlcnRpY2FsIHNpemUpLiBSZW1haW5zIGNvbnN0YW50IHRocm91Z2ggdGhlIGFuaW1hdGlvbi5cblx0KiBAcGFyYW0gdG9YIC0gRW5kIGB4YCBwb3NpdGlvbiBvbiB0aGUgc3ByaXRlIG1hcCAoaW4gdGhlIHVuaXQgb2Ygc3ByaXRlIGhvcml6b250YWwgc2l6ZSlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYW5pbWF0ZShTdHJpbmcgcmVlbElkLCBBcnJheSBmcmFtZXMpXG5cdCogQHBhcmFtIHJlZWxJZCAtIElEIG9mIHRoZSBhbmltYXRpb24gcmVlbCBiZWluZyBjcmVhdGVkXG5cdCogQHBhcmFtIGZyYW1lcyAtIEFycmF5IG9mIGFycmF5cyBjb250YWluaW5nIHRoZSBgeGAgYW5kIGB5YCB2YWx1ZXM6IFtbeDEseTFdLFt4Mix5Ml0sLi4uXVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hbmltYXRlKFN0cmluZyByZWVsSWQsIE51bWJlciBkdXJhdGlvblssIE51bWJlciByZXBlYXRDb3VudF0pXG5cdCogQHBhcmFtIHJlZWxJZCAtIElEIG9mIHRoZSBhbmltYXRpb24gcmVlbCB0byBwbGF5XG5cdCogQHBhcmFtIGR1cmF0aW9uIC0gUGxheSB0aGUgYW5pbWF0aW9uIHdpdGhpbiBhIGR1cmF0aW9uIChpbiBmcmFtZXMpXG5cdCogQHBhcmFtIHJlcGVhdENvdW50IC0gbnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgYW5pbWF0aW9uLiBVc2UgLTEgZm9yIGluZmluaXRlbHlcblx0KlxuXHQqIE1ldGhvZCB0byBzZXR1cCBhbmltYXRpb24gcmVlbHMgb3IgcGxheSBwcmUtbWFkZSByZWVscy4gQW5pbWF0aW9uIHdvcmtzIGJ5IGNoYW5naW5nIHRoZSBzcHJpdGVzIG92ZXJcblx0KiBhIGR1cmF0aW9uLiBPbmx5IHdvcmtzIGZvciBzcHJpdGVzIGJ1aWx0IHdpdGggdGhlIENyYWZ0eS5zcHJpdGUgbWV0aG9kcy4gU2VlIHRoZSBUd2VlbiBjb21wb25lbnQgZm9yIGFuaW1hdGlvbiBvZiAyRCBwcm9wZXJ0aWVzLlxuXHQqXG5cdCogVG8gc2V0dXAgYW4gYW5pbWF0aW9uIHJlZWwsIHBhc3MgdGhlIG5hbWUgb2YgdGhlIHJlZWwgKHVzZWQgdG8gaWRlbnRpZnkgdGhlIHJlZWwgYW5kIHBsYXkgaXQgbGF0ZXIpLCBhbmQgZWl0aGVyIGFuXG5cdCogYXJyYXkgb2YgYWJzb2x1dGUgc3ByaXRlIHBvc2l0aW9ucyBvciB0aGUgc3RhcnQgeCBvbiB0aGUgc3ByaXRlIG1hcCwgdGhlIHkgb24gdGhlIHNwcml0ZSBtYXAgYW5kIHRoZW4gdGhlIGVuZCB4IG9uIHRoZSBzcHJpdGUgbWFwLlxuXHQqXG5cdCogVG8gcGxheSBhIHJlZWwsIHBhc3MgdGhlIG5hbWUgb2YgdGhlIHJlZWwgYW5kIHRoZSBkdXJhdGlvbiBpdCBzaG91bGQgcGxheSBmb3IgKGluIGZyYW1lcykuIElmIHlvdSBuZWVkXG5cdCogdG8gcmVwZWF0IHRoZSBhbmltYXRpb24sIHNpbXBseSBwYXNzIGluIHRoZSBhbW91bnQgb2YgdGltZXMgdGhlIGFuaW1hdGlvbiBzaG91bGQgcmVwZWF0LiBUbyByZXBlYXRcblx0KiBmb3JldmVyLCBwYXNzIGluIGAtMWAuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5zcHJpdGUoMTYsIFwiaW1hZ2VzL3Nwcml0ZS5wbmdcIiwge1xuXHQqICAgICBQbGF5ZXJTcHJpdGU6IFswLDBdXG5cdCogfSk7XG5cdCpcblx0KiBDcmFmdHkuZShcIjJELCBET00sIFNwcml0ZUFuaW1hdGlvbiwgUGxheWVyU3ByaXRlXCIpXG5cdCogICAgIC5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMCwgMCwgMykgLy9zZXR1cCBhbmltYXRpb25cblx0KiAgICAgLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAxNSwgLTEpIC8vIHN0YXJ0IGFuaW1hdGlvblxuXHQqXG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBTcHJpdGVBbmltYXRpb24sIFBsYXllclNwcml0ZVwiKVxuXHQqICAgICAuYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDAsIDMsIDApIC8vc2V0dXAgYW5pbWF0aW9uXG5cdCogICAgIC5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMTUsIC0xKSAvLyBzdGFydCBhbmltYXRpb25cblx0KiB+fn5cblx0KlxuXHQqIEBzZWUgY3JhZnR5LnNwcml0ZVxuXHQqL1xuXHRhbmltYXRlOiBmdW5jdGlvbiAocmVlbElkLCBmcm9teCwgeSwgdG94KSB7XG5cdFx0dmFyIHJlZWwsIGksIHRpbGUsIHRpbGVoLCBkdXJhdGlvbiwgcG9zO1xuXG5cdFx0Ly9wbGF5IGEgcmVlbFxuXHRcdC8vLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAxNSwgLTEpIC8vIHN0YXJ0IGFuaW1hdGlvblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoIDwgNCAmJiB0eXBlb2YgZnJvbXggPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdGR1cmF0aW9uID0gZnJvbXg7XG5cblx0XHRcdC8vbWFrZSBzdXJlIG5vdCBjdXJyZW50bHkgYW5pbWF0aW5nXG5cdFx0XHR0aGlzLl9jdXJyZW50UmVlbElkID0gcmVlbElkO1xuXG5cdFx0XHRjdXJyZW50UmVlbCA9IHRoaXMuX3JlZWxzW3JlZWxJZF07XG5cblx0XHRcdHRoaXMuX2ZyYW1lID0ge1xuXHRcdFx0XHRjdXJyZW50UmVlbDogY3VycmVudFJlZWwsXG5cdFx0XHRcdG51bWJlck9mRnJhbWVzQmV0d2VlblNsaWRlczogTWF0aC5jZWlsKGR1cmF0aW9uIC8gY3VycmVudFJlZWwubGVuZ3RoKSxcblx0XHRcdFx0Y3VycmVudFNsaWRlTnVtYmVyOiAwLFxuXHRcdFx0XHRmcmFtZU51bWJlckJldHdlZW5TbGlkZXM6IDAsXG5cdFx0XHRcdHJlcGVhdDogMFxuXHRcdFx0fTtcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIHR5cGVvZiB5ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRcdC8vVXNlciBwcm92aWRlZCByZXBldGl0aW9uIGNvdW50XG5cdFx0XHRcdGlmICh5ID09PSAtMSkgdGhpcy5fZnJhbWUucmVwZWF0SW5maW5pdGx5ID0gdHJ1ZTtcblx0XHRcdFx0ZWxzZSB0aGlzLl9mcmFtZS5yZXBlYXQgPSB5O1xuXHRcdFx0fVxuXG5cdFx0XHRwb3MgPSB0aGlzLl9mcmFtZS5jdXJyZW50UmVlbFswXTtcblx0XHRcdHRoaXMuX19jb29yZFswXSA9IHBvc1swXTtcblx0XHRcdHRoaXMuX19jb29yZFsxXSA9IHBvc1sxXTtcblxuXHRcdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLnVwZGF0ZVNwcml0ZSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0Ly8gLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAwLCAwLCAzKSAvL3NldHVwIGFuaW1hdGlvblxuXHRcdGlmICh0eXBlb2YgZnJvbXggPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdC8vIERlZmluZCBpbiBTcHJpdGUgY29tcG9uZW50LlxuXHRcdFx0dGlsZSA9IHRoaXMuX190aWxlICsgcGFyc2VJbnQodGhpcy5fX3BhZGRpbmdbMF0gfHwgMCwgMTApO1xuXHRcdFx0dGlsZWggPSB0aGlzLl9fdGlsZWggKyBwYXJzZUludCh0aGlzLl9fcGFkZGluZ1sxXSB8fCAwLCAxMCk7XG5cblx0XHRcdHJlZWwgPSBbXTtcblx0XHRcdGkgPSBmcm9teDtcblx0XHRcdGlmICh0b3ggPiBmcm9teCkge1xuXHRcdFx0XHRmb3IgKDsgaSA8PSB0b3g7IGkrKykge1xuXHRcdFx0XHRcdHJlZWwucHVzaChbaSAqIHRpbGUsIHkgKiB0aWxlaF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKDsgaSA+PSB0b3g7IGktLSkge1xuXHRcdFx0XHRcdHJlZWwucHVzaChbaSAqIHRpbGUsIHkgKiB0aWxlaF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3JlZWxzW3JlZWxJZF0gPSByZWVsO1xuXHRcdH0gZWxzZSBpZiAodHlwZW9mIGZyb214ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHQvLyBAc2lnbiBwdWJsaWMgdGhpcyAuYW5pbWF0ZShyZWVsSWQsIFtbeDEseTFdLFt4Mix5Ml0sLi4uXSlcblx0XHRcdGkgPSAwO1xuXHRcdFx0cmVlbCA9IFtdO1xuXHRcdFx0dG94ID0gZnJvbXgubGVuZ3RoIC0gMTtcblx0XHRcdHRpbGUgPSB0aGlzLl9fdGlsZSArIHBhcnNlSW50KHRoaXMuX19wYWRkaW5nWzBdIHx8IDAsIDEwKTtcblx0XHRcdHRpbGVoID0gdGhpcy5fX3RpbGVoICsgcGFyc2VJbnQodGhpcy5fX3BhZGRpbmdbMV0gfHwgMCwgMTApO1xuXG5cdFx0XHRmb3IgKDsgaSA8PSB0b3g7IGkrKykge1xuXHRcdFx0XHRwb3MgPSBmcm9teFtpXTtcblx0XHRcdFx0cmVlbC5wdXNoKFtwb3NbMF0gKiB0aWxlLCBwb3NbMV0gKiB0aWxlaF0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9yZWVsc1tyZWVsSWRdID0gcmVlbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy51cGRhdGVTcHJpdGVcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KiBAc2lnbiBwcml2YXRlIHZvaWQgLnVwZGF0ZVNwcml0ZSgpXG5cdCpcblx0KiBUaGlzIGlzIGNhbGxlZCBhdCBldmVyeSBgRW50ZXJGcmFtZWAgZXZlbnQgd2hlbiBgLmFuaW1hdGUoKWAgZW5hYmxlcyBhbmltYXRpb24uIEl0IHVwZGF0ZSB0aGUgU3ByaXRlQW5pbWF0aW9uIGNvbXBvbmVudCB3aGVuIHRoZSBzbGlkZSBpbiB0aGUgc3ByaXRlIHNob3VsZCBiZSB1cGRhdGVkLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMudXBkYXRlU3ByaXRlKTtcblx0KiB+fn5cblx0KlxuXHQqIEBzZWUgY3JhZnR5LnNwcml0ZVxuXHQqL1xuXHR1cGRhdGVTcHJpdGU6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZGF0YSA9IHRoaXMuX2ZyYW1lO1xuXHRcdGlmICghZGF0YSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9mcmFtZS5mcmFtZU51bWJlckJldHdlZW5TbGlkZXMrKyA9PT0gZGF0YS5udW1iZXJPZkZyYW1lc0JldHdlZW5TbGlkZXMpIHtcblx0XHRcdHZhciBwb3MgPSBkYXRhLmN1cnJlbnRSZWVsW2RhdGEuY3VycmVudFNsaWRlTnVtYmVyKytdO1xuXG5cdFx0XHR0aGlzLl9fY29vcmRbMF0gPSBwb3NbMF07XG5cdFx0XHR0aGlzLl9fY29vcmRbMV0gPSBwb3NbMV07XG5cdFx0XHR0aGlzLl9mcmFtZS5mcmFtZU51bWJlckJldHdlZW5TbGlkZXMgPSAwO1xuXHRcdH1cblxuXG5cdFx0aWYgKGRhdGEuY3VycmVudFNsaWRlTnVtYmVyID09PSBkYXRhLmN1cnJlbnRSZWVsLmxlbmd0aCkge1xuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5fZnJhbWUucmVwZWF0SW5maW5pdGx5ID09PSB0cnVlIHx8IHRoaXMuX2ZyYW1lLnJlcGVhdCA+IDApIHtcblx0XHRcdFx0aWYgKHRoaXMuX2ZyYW1lLnJlcGVhdCkgdGhpcy5fZnJhbWUucmVwZWF0LS07XG5cdFx0XHRcdHRoaXMuX2ZyYW1lLmZyYW1lTnVtYmVyQmV0d2VlblNsaWRlcyA9IDA7XG5cdFx0XHRcdHRoaXMuX2ZyYW1lLmN1cnJlbnRTbGlkZU51bWJlciA9IDA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAodGhpcy5fZnJhbWUuZnJhbWVOdW1iZXJCZXR3ZWVuU2xpZGVzID09PSBkYXRhLm51bWJlck9mRnJhbWVzQmV0d2VlblNsaWRlcykge1xuXHRcdFx0XHQgICAgdGhpcy50cmlnZ2VyKFwiQW5pbWF0aW9uRW5kXCIsIHsgcmVlbDogZGF0YS5jdXJyZW50UmVlbCB9KTtcblx0XHRcdFx0ICAgIHRoaXMuc3RvcCgpO1xuXHRcdFx0XHQgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5zdG9wXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnN0b3Aodm9pZClcblx0KlxuXHQqIFN0b3AgYW55IGFuaW1hdGlvbiBjdXJyZW50bHkgcGxheWluZy5cblx0Ki9cblx0c3RvcDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMudW5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLnVwZGF0ZVNwcml0ZSk7XG5cdFx0dGhpcy51bmJpbmQoXCJBbmltYXRpb25FbmRcIik7XG5cdFx0dGhpcy5fY3VycmVudFJlZWxJZCA9IG51bGw7XG5cdFx0dGhpcy5fZnJhbWUgPSBudWxsO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMucmVzZXRcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAucmVzZXQodm9pZClcblx0KlxuXHQqIE1ldGhvZCB3aWxsIHJlc2V0IHRoZSBlbnRpdGllcyBzcHJpdGUgdG8gaXRzIG9yaWdpbmFsLlxuXHQqL1xuXHRyZXNldDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5fZnJhbWUpIHJldHVybiB0aGlzO1xuXG5cdFx0dmFyIGNvID0gdGhpcy5fZnJhbWUuY3VycmVudFJlZWxbMF07XG5cdFx0dGhpcy5fX2Nvb3JkWzBdID0gY29bMF07XG5cdFx0dGhpcy5fX2Nvb3JkWzFdID0gY29bMV07XG5cdFx0dGhpcy5zdG9wKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5pc1BsYXlpbmdcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuaXNQbGF5aW5nKFtTdHJpbmcgcmVlbElkXSlcblx0KiBAcGFyYW0gcmVlbElkIC0gRGV0ZXJtaW5lIGlmIHRoZSBhbmltYXRpb24gcmVlbCB3aXRoIHRoaXMgcmVlbElkIGlzIHBsYXlpbmcuXG5cdCpcblx0KiBEZXRlcm1pbmVzIGlmIGFuIGFuaW1hdGlvbiBpcyBjdXJyZW50bHkgcGxheWluZy4gSWYgYSByZWVsIGlzIHBhc3NlZCwgaXQgd2lsbCBkZXRlcm1pbmVcblx0KiBpZiB0aGUgcGFzc2VkIHJlZWwgaXMgcGxheWluZy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogbXlFbnRpdHkuaXNQbGF5aW5nKCkgLy9pcyBhbnkgYW5pbWF0aW9uIHBsYXlpbmdcblx0KiBteUVudGl0eS5pc1BsYXlpbmcoJ1BsYXllclJ1bm5pbmcnKSAvL2lzIHRoZSBQbGF5ZXJSdW5uaW5nIGFuaW1hdGlvbiBwbGF5aW5nXG5cdCogfn5+XG5cdCovXG5cdGlzUGxheWluZzogZnVuY3Rpb24gKHJlZWxJZCkge1xuXHRcdGlmICghcmVlbElkKSByZXR1cm4gISF0aGlzLl9jdXJyZW50UmVlbElkO1xuXHRcdHJldHVybiB0aGlzLl9jdXJyZW50UmVlbElkID09PSByZWVsSWQ7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNUd2VlblxuKiBAY2F0ZWdvcnkgQW5pbWF0aW9uXG4qIEB0cmlnZ2VyIFR3ZWVuRW5kIC0gd2hlbiBhIHR3ZWVuIGZpbmlzaGVzIC0gU3RyaW5nIC0gcHJvcGVydHlcbipcbiogQ29tcG9uZW50IHRvIGFuaW1hdGUgdGhlIGNoYW5nZSBpbiAyRCBwcm9wZXJ0aWVzIG92ZXIgdGltZS5cbiovXG5DcmFmdHkuYyhcIlR3ZWVuXCIsIHtcblx0X3N0ZXA6IG51bGwsXG5cdF9udW1Qcm9wczogMCxcblxuXHQvKipAXG5cdCogIy50d2VlblxuXHQqIEBjb21wIFR3ZWVuXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnR3ZWVuKE9iamVjdCBwcm9wZXJ0aWVzLCBOdW1iZXIgZHVyYXRpb24pXG5cdCogQHBhcmFtIHByb3BlcnRpZXMgLSBPYmplY3Qgb2YgMkQgcHJvcGVydGllcyBhbmQgd2hhdCB0aGV5IHNob3VsZCBhbmltYXRlIHRvXG5cdCogQHBhcmFtIGR1cmF0aW9uIC0gRHVyYXRpb24gdG8gYW5pbWF0ZSB0aGUgcHJvcGVydGllcyBvdmVyIChpbiBmcmFtZXMpXG5cdCpcblx0KiBUaGlzIG1ldGhvZCB3aWxsIGFuaW1hdGUgYSAyRCBlbnRpdGllcyBwcm9wZXJ0aWVzIG92ZXIgdGhlIHNwZWNpZmllZCBkdXJhdGlvbi5cblx0KiBUaGVzZSBpbmNsdWRlIGB4YCwgYHlgLCBgd2AsIGBoYCwgYGFscGhhYCBhbmQgYHJvdGF0aW9uYC5cblx0KlxuXHQqIFRoZSBvYmplY3QgcGFzc2VkIHNob3VsZCBoYXZlIHRoZSBwcm9wZXJ0aWVzIGFzIGtleXMgYW5kIHRoZSB2YWx1ZSBzaG91bGQgYmUgdGhlIHJlc3VsdGluZ1xuXHQqIHZhbHVlcyBvZiB0aGUgcHJvcGVydGllcy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogTW92ZSBhbiBvYmplY3QgdG8gMTAwLDEwMCBhbmQgZmFkZSBvdXQgaW4gMjAwIGZyYW1lcy5cblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBUd2VlblwiKVxuXHQqICAgIC5hdHRyKHthbHBoYTogMS4wLCB4OiAwLCB5OiAwfSlcblx0KiAgICAudHdlZW4oe2FscGhhOiAwLjAsIHg6IDEwMCwgeTogMTAwfSwgMjAwKVxuXHQqIH5+flxuXHQqL1xuXHR0d2VlbjogZnVuY3Rpb24gKHByb3BzLCBkdXJhdGlvbikge1xuXHRcdHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5fc3RlcCA9PSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuX3N0ZXAgPSB7fTtcblx0XHRcdFx0dGhpcy5iaW5kKCdFbnRlckZyYW1lJywgdHdlZW5FbnRlckZyYW1lKTtcblx0XHRcdFx0dGhpcy5iaW5kKCdSZW1vdmVDb21wb25lbnQnLCBmdW5jdGlvbiAoYykge1xuXHRcdFx0XHRcdGlmIChjID09ICdUd2VlbicpIHtcblx0XHRcdFx0XHRcdHRoaXMudW5iaW5kKCdFbnRlckZyYW1lJywgdHdlZW5FbnRlckZyYW1lKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBwcm9wIGluIHByb3BzKSB7XG5cdFx0XHRcdHRoaXMuX3N0ZXBbcHJvcF0gPSB7IHByb3A6IHByb3BzW3Byb3BdLCB2YWw6IChwcm9wc1twcm9wXSAtIHRoaXNbcHJvcF0pIC8gZHVyYXRpb24sIHJlbTogZHVyYXRpb24gfTtcblx0XHRcdFx0dGhpcy5fbnVtUHJvcHMrKztcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbmZ1bmN0aW9uIHR3ZWVuRW50ZXJGcmFtZShlKSB7XG5cdGlmICh0aGlzLl9udW1Qcm9wcyA8PSAwKSByZXR1cm47XG5cblx0dmFyIHByb3AsIGs7XG5cdGZvciAoayBpbiB0aGlzLl9zdGVwKSB7XG5cdFx0cHJvcCA9IHRoaXMuX3N0ZXBba107XG5cdFx0dGhpc1trXSArPSBwcm9wLnZhbDtcblx0XHRpZiAoLS1wcm9wLnJlbSA9PSAwKSB7XG5cdFx0XHQvLyBkZWNpbWFsIG51bWJlcnMgcm91bmRpbmcgZml4XG5cdFx0XHR0aGlzW2tdID0gcHJvcC5wcm9wO1xuXHRcdFx0dGhpcy50cmlnZ2VyKFwiVHdlZW5FbmRcIiwgayk7XG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGR1cmF0aW9uIHdhc24ndCBjaGFuZ2VkIGluIFR3ZWVuRW5kXG5cdFx0XHRpZiAodGhpcy5fc3RlcFtrXS5yZW0gPD0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5fc3RlcFtrXTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX251bVByb3BzLS07XG5cdFx0fVxuXHR9XG5cblx0aWYgKHRoaXMuaGFzKCdNb3VzZScpKSB7XG5cdFx0dmFyIG92ZXIgPSBDcmFmdHkub3Zlcixcblx0XHRcdG1vdXNlID0gQ3JhZnR5Lm1vdXNlUG9zO1xuXHRcdGlmIChvdmVyICYmIG92ZXJbMF0gPT0gdGhpc1swXSAmJiAhdGhpcy5pc0F0KG1vdXNlLngsIG1vdXNlLnkpKSB7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ01vdXNlT3V0JywgQ3JhZnR5Lmxhc3RFdmVudCk7XG5cdFx0XHRDcmFmdHkub3ZlciA9IG51bGw7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKCghb3ZlciB8fCBvdmVyWzBdICE9IHRoaXNbMF0pICYmIHRoaXMuaXNBdChtb3VzZS54LCBtb3VzZS55KSkge1xuXHRcdFx0Q3JhZnR5Lm92ZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdNb3VzZU92ZXInLCBDcmFmdHkubGFzdEV2ZW50KTtcblx0XHR9XG5cdH1cbn1cblxuXG4vKipAXG4qICNDb2xvclxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogRHJhdyBhIHNvbGlkIGNvbG9yIGZvciB0aGUgZW50aXR5XG4qL1xuQ3JhZnR5LmMoXCJDb2xvclwiLCB7XG5cdF9jb2xvcjogXCJcIixcblx0cmVhZHk6IHRydWUsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuYmluZChcIkRyYXdcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChlLnR5cGUgPT09IFwiRE9NXCIpIHtcblx0XHRcdFx0ZS5zdHlsZS5iYWNrZ3JvdW5kID0gdGhpcy5fY29sb3I7XG5cdFx0XHRcdGUuc3R5bGUubGluZUhlaWdodCA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gXCJjYW52YXNcIikge1xuXHRcdFx0XHRpZiAodGhpcy5fY29sb3IpIGUuY3R4LmZpbGxTdHlsZSA9IHRoaXMuX2NvbG9yO1xuXHRcdFx0XHRlLmN0eC5maWxsUmVjdChlLnBvcy5feCwgZS5wb3MuX3ksIGUucG9zLl93LCBlLnBvcy5faCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuY29sb3Jcblx0KiBAY29tcCBDb2xvclxuXHQqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIGNvbG9yIGNoYW5nZXNcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuY29sb3IoU3RyaW5nIGNvbG9yKVxuXHQqIEBzaWduIHB1YmxpYyBTdHJpbmcgLmNvbG9yKClcblx0KiBAcGFyYW0gY29sb3IgLSBDb2xvciBvZiB0aGUgcmVjdGFuZ2xlXG5cdCogV2lsbCBjcmVhdGUgYSByZWN0YW5nbGUgb2Ygc29saWQgY29sb3IgZm9yIHRoZSBlbnRpdHksIG9yIHJldHVybiB0aGUgY29sb3IgaWYgbm8gYXJndW1lbnQgaXMgZ2l2ZW4uXG5cdCpcblx0KiBUaGUgYXJndW1lbnQgbXVzdCBiZSBhIGNvbG9yIHJlYWRhYmxlIGRlcGVuZGluZyBvbiB3aGljaCBicm93c2VyIHlvdVxuXHQqIGNob29zZSB0byBzdXBwb3J0LiBJRSA4IGFuZCBiZWxvdyBkb2Vzbid0IHN1cHBvcnQgdGhlIHJnYigpIHN5bnRheC5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3JcIilcblx0KiAgICAuY29sb3IoXCIjOTY5Njk2XCIpO1xuXHQqIH5+flxuXHQqL1xuXHRjb2xvcjogZnVuY3Rpb24gKGNvbG9yKSB7XG5cdFx0aWYgKCFjb2xvcikgcmV0dXJuIHRoaXMuX2NvbG9yO1xuXHRcdHRoaXMuX2NvbG9yID0gY29sb3I7XG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjVGludFxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogU2ltaWxhciB0byBDb2xvciBieSBhZGRpbmcgYW4gb3ZlcmxheSBvZiBzZW1pLXRyYW5zcGFyZW50IGNvbG9yLlxuKlxuKiAqTm90ZTogQ3VycmVudGx5IG9ubHkgd29ya3MgZm9yIENhbnZhcypcbiovXG5DcmFmdHkuYyhcIlRpbnRcIiwge1xuXHRfY29sb3I6IG51bGwsXG5cdF9zdHJlbmd0aDogMS4wLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZHJhdyA9IGZ1bmN0aW9uIGQoZSkge1xuXHRcdFx0dmFyIGNvbnRleHQgPSBlLmN0eCB8fCBDcmFmdHkuY2FudmFzLmNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5fY29sb3IgfHwgXCJyZ2IoMCwwLDApXCI7XG5cdFx0XHRjb250ZXh0LmZpbGxSZWN0KGUucG9zLl94LCBlLnBvcy5feSwgZS5wb3MuX3csIGUucG9zLl9oKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5iaW5kKFwiRHJhd1wiLCBkcmF3KS5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWYgKGlkID09PSBcIlRpbnRcIikgdGhpcy51bmJpbmQoXCJEcmF3XCIsIGRyYXcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnRpbnRcblx0KiBAY29tcCBUaW50XG5cdCogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgdGludCBpcyBhcHBsaWVkXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnRpbnQoU3RyaW5nIGNvbG9yLCBOdW1iZXIgc3RyZW5ndGgpXG5cdCogQHBhcmFtIGNvbG9yIC0gVGhlIGNvbG9yIGluIGhleGFkZWNpbWFsXG5cdCogQHBhcmFtIHN0cmVuZ3RoIC0gTGV2ZWwgb2Ygb3BhY2l0eVxuXHQqIFxuXHQqIE1vZGlmeSB0aGUgY29sb3IgYW5kIGxldmVsIG9wYWNpdHkgdG8gZ2l2ZSBhIHRpbnQgb24gdGhlIGVudGl0eS5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGludFwiKVxuXHQqICAgIC50aW50KFwiIzk2OTY5NlwiLCAwLjMpO1xuXHQqIH5+flxuXHQqL1xuXHR0aW50OiBmdW5jdGlvbiAoY29sb3IsIHN0cmVuZ3RoKSB7XG5cdFx0dGhpcy5fc3RyZW5ndGggPSBzdHJlbmd0aDtcblx0XHR0aGlzLl9jb2xvciA9IENyYWZ0eS50b1JHQihjb2xvciwgdGhpcy5fc3RyZW5ndGgpO1xuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjSW1hZ2VcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIERyYXcgYW4gaW1hZ2Ugd2l0aCBvciB3aXRob3V0IHJlcGVhdGluZyAodGlsaW5nKS5cbiovXG5DcmFmdHkuYyhcIkltYWdlXCIsIHtcblx0X3JlcGVhdDogXCJyZXBlYXRcIixcblx0cmVhZHk6IGZhbHNlLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZHJhdyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoZS50eXBlID09PSBcImNhbnZhc1wiKSB7XG5cdFx0XHRcdC8vc2tpcCBpZiBubyBpbWFnZVxuXHRcdFx0XHRpZiAoIXRoaXMucmVhZHkgfHwgIXRoaXMuX3BhdHRlcm4pIHJldHVybjtcblxuXHRcdFx0XHR2YXIgY29udGV4dCA9IGUuY3R4O1xuXHRcdFx0XHRcblx0XHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSB0aGlzLl9wYXR0ZXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29udGV4dC5zYXZlKCk7XG5cdFx0XHRcdGNvbnRleHQudHJhbnNsYXRlKGUucG9zLl94LCBlLnBvcy5feSk7XG5cdFx0XHRcdGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgdGhpcy5fdywgdGhpcy5faCk7XG5cdFx0XHRcdGNvbnRleHQucmVzdG9yZSgpO1xuXHRcdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09IFwiRE9NXCIpIHtcblx0XHRcdFx0aWYgKHRoaXMuX19pbWFnZSlcblx0XHRcdFx0XHRlLnN0eWxlLmJhY2tncm91bmQgPSBcInVybChcIiArIHRoaXMuX19pbWFnZSArIFwiKSBcIiArIHRoaXMuX3JlcGVhdDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5iaW5kKFwiRHJhd1wiLCBkcmF3KS5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWYgKGlkID09PSBcIkltYWdlXCIpIHRoaXMudW5iaW5kKFwiRHJhd1wiLCBkcmF3KTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5pbWFnZVxuXHQqIEBjb21wIEltYWdlXG5cdCogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgaW1hZ2UgaXMgbG9hZGVkXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmltYWdlKFN0cmluZyB1cmxbLCBTdHJpbmcgcmVwZWF0XSlcblx0KiBAcGFyYW0gdXJsIC0gVVJMIG9mIHRoZSBpbWFnZVxuXHQqIEBwYXJhbSByZXBlYXQgLSBJZiB0aGUgaW1hZ2Ugc2hvdWxkIGJlIHJlcGVhdGVkIHRvIGZpbGwgdGhlIGVudGl0eS5cblx0KiBcblx0KiBEcmF3IHNwZWNpZmllZCBpbWFnZS4gUmVwZWF0IGZvbGxvd3MgQ1NTIHN5bnRheCAoYFwibm8tcmVwZWF0XCIsIFwicmVwZWF0XCIsIFwicmVwZWF0LXhcIiwgXCJyZXBlYXQteVwiYCk7XG5cdCpcblx0KiAqTm90ZTogRGVmYXVsdCByZXBlYXQgaXMgYG5vLXJlcGVhdGAgd2hpY2ggaXMgZGlmZmVyZW50IHRvIHN0YW5kYXJkIERPTSAod2hpY2ggaXMgYHJlcGVhdGApKlxuXHQqXG5cdCogSWYgdGhlIHdpZHRoIGFuZCBoZWlnaHQgYXJlIGAwYCBhbmQgcmVwZWF0IGlzIHNldCB0byBgbm8tcmVwZWF0YCB0aGUgd2lkdGggYW5kXG5cdCogaGVpZ2h0IHdpbGwgYXV0b21hdGljYWxseSBhc3N1bWUgdGhhdCBvZiB0aGUgaW1hZ2UuIFRoaXMgaXMgYW5cblx0KiBlYXN5IHdheSB0byBjcmVhdGUgYW4gaW1hZ2Ugd2l0aG91dCBuZWVkaW5nIHNwcml0ZXMuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiBXaWxsIGRlZmF1bHQgdG8gbm8tcmVwZWF0LiBFbnRpdHkgd2lkdGggYW5kIGhlaWdodCB3aWxsIGJlIHNldCB0byB0aGUgaW1hZ2VzIHdpZHRoIGFuZCBoZWlnaHRcblx0KiB+fn5cblx0KiB2YXIgZW50ID0gQ3JhZnR5LmUoXCIyRCwgRE9NLCBJbWFnZVwiKS5pbWFnZShcIm15aW1hZ2UucG5nXCIpO1xuXHQqIH5+flxuXHQqIENyZWF0ZSBhIHJlcGVhdGluZyBiYWNrZ3JvdW5kLlxuXHQqIH5+flxuXHQqIHZhciBiZyA9IENyYWZ0eS5lKFwiMkQsIERPTSwgSW1hZ2VcIilcblx0KiAgICAgICAgICAgICAgLmF0dHIoe3c6IENyYWZ0eS52aWV3cG9ydC53aWR0aCwgaDogQ3JhZnR5LnZpZXdwb3J0LmhlaWdodH0pXG5cdCogICAgICAgICAgICAgIC5pbWFnZShcImJnLnBuZ1wiLCBcInJlcGVhdFwiKTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5zcHJpdGVcblx0Ki9cblx0aW1hZ2U6IGZ1bmN0aW9uICh1cmwsIHJlcGVhdCkge1xuXHRcdHRoaXMuX19pbWFnZSA9IHVybDtcblx0XHR0aGlzLl9yZXBlYXQgPSByZXBlYXQgfHwgXCJuby1yZXBlYXRcIjtcblxuXHRcdHRoaXMuaW1nID0gQ3JhZnR5LmFzc2V0KHVybCk7XG5cdFx0aWYgKCF0aGlzLmltZykge1xuXHRcdFx0dGhpcy5pbWcgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdENyYWZ0eS5hc3NldCh1cmwsIHRoaXMuaW1nKTtcblx0XHRcdHRoaXMuaW1nLnNyYyA9IHVybDtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy5pbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoc2VsZi5oYXMoXCJDYW52YXNcIikpIHNlbGYuX3BhdHRlcm4gPSBDcmFmdHkuY2FudmFzLmNvbnRleHQuY3JlYXRlUGF0dGVybihzZWxmLmltZywgc2VsZi5fcmVwZWF0KTtcblx0XHRcdFx0c2VsZi5yZWFkeSA9IHRydWU7XG5cblx0XHRcdFx0aWYgKHNlbGYuX3JlcGVhdCA9PT0gXCJuby1yZXBlYXRcIikge1xuXHRcdFx0XHRcdHNlbGYudyA9IHNlbGYuaW1nLndpZHRoO1xuXHRcdFx0XHRcdHNlbGYuaCA9IHNlbGYuaW1nLmhlaWdodDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRcdH07XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnJlYWR5ID0gdHJ1ZTtcblx0XHRcdGlmICh0aGlzLmhhcyhcIkNhbnZhc1wiKSkgdGhpcy5fcGF0dGVybiA9IENyYWZ0eS5jYW52YXMuY29udGV4dC5jcmVhdGVQYXR0ZXJuKHRoaXMuaW1nLCB0aGlzLl9yZXBlYXQpO1xuXHRcdFx0aWYgKHRoaXMuX3JlcGVhdCA9PT0gXCJuby1yZXBlYXRcIikge1xuXHRcdFx0XHR0aGlzLncgPSB0aGlzLmltZy53aWR0aDtcblx0XHRcdFx0dGhpcy5oID0gdGhpcy5pbWcuaGVpZ2h0O1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5DcmFmdHkuZXh0ZW5kKHtcblx0X3NjZW5lczogW10sXG5cdF9jdXJyZW50OiBudWxsLFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5LnNjZW5lXG5cdCogQGNhdGVnb3J5IFNjZW5lcywgU3RhZ2Vcblx0KiBAdHJpZ2dlciBTY2VuZUNoYW5nZSAtIHdoZW4gYSBzY2VuZSBpcyBwbGF5ZWQgLSB7IG9sZFNjZW5lOlN0cmluZywgbmV3U2NlbmU6U3RyaW5nIH1cblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuc2NlbmUoU3RyaW5nIHNjZW5lTmFtZSwgRnVuY3Rpb24gaW5pdFssIEZ1bmN0aW9uIHVuaW5pdF0pXG5cdCogQHBhcmFtIHNjZW5lTmFtZSAtIE5hbWUgb2YgdGhlIHNjZW5lIHRvIGFkZFxuXHQqIEBwYXJhbSBpbml0IC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHNjZW5lIGlzIHBsYXllZFxuXHQqIEBwYXJhbSB1bmluaXQgLSBGdW5jdGlvbiB0byBleGVjdXRlIGJlZm9yZSBuZXh0IHNjZW5lIGlzIHBsYXllZCwgYWZ0ZXIgZW50aXRpZXMgd2l0aCBgMkRgIGFyZSBkZXN0cm95ZWRcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuc2NlbmUoU3RyaW5nIHNjZW5lTmFtZSlcblx0KiBAcGFyYW0gc2NlbmVOYW1lIC0gTmFtZSBvZiBzY2VuZSB0byBwbGF5XG5cdCogXG5cdCogTWV0aG9kIHRvIGNyZWF0ZSBzY2VuZXMgb24gdGhlIHN0YWdlLiBQYXNzIGFuIElEIGFuZCBmdW5jdGlvbiB0byByZWdpc3RlciBhIHNjZW5lLlxuXHQqXG5cdCogVG8gcGxheSBhIHNjZW5lLCBqdXN0IHBhc3MgdGhlIElELiBXaGVuIGEgc2NlbmUgaXMgcGxheWVkLCBhbGxcblx0KiBlbnRpdGllcyB3aXRoIHRoZSBgMkRgIGNvbXBvbmVudCBvbiB0aGUgc3RhZ2UgYXJlIGRlc3Ryb3llZC5cblx0KlxuXHQqIElmIHlvdSB3YW50IHNvbWUgZW50aXRpZXMgdG8gcGVyc2lzdCBvdmVyIHNjZW5lcyAoYXMgaW4gbm90IGJlIGRlc3Ryb3llZClcblx0KiBzaW1wbHkgYWRkIHRoZSBjb21wb25lbnQgYFBlcnNpc3RgLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuc2NlbmUoXCJsb2FkaW5nXCIsIGZ1bmN0aW9uKCkge30pO1xuXHQqXG5cdCogQ3JhZnR5LnNjZW5lKFwibG9hZGluZ1wiLCBmdW5jdGlvbigpIHt9LCBmdW5jdGlvbigpIHt9KTtcblx0KlxuXHQqIENyYWZ0eS5zY2VuZShcImxvYWRpbmdcIik7XG5cdCogfn5+XG5cdCovXG5cdHNjZW5lOiBmdW5jdGlvbiAobmFtZSwgaW50cm8sIG91dHJvKSB7XG5cdFx0Ly9wbGF5IHNjZW5lXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdENyYWZ0eS52aWV3cG9ydC5yZXNldCgpO1xuXHRcdFx0Q3JhZnR5KFwiMkRcIikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICghdGhpcy5oYXMoXCJQZXJzaXN0XCIpKSB0aGlzLmRlc3Ryb3koKTtcblx0XHRcdH0pO1xuXHRcdFx0Ly8gdW5pbml0aWFsaXplIHByZXZpb3VzIHNjZW5lXG5cdFx0XHRpZiAodGhpcy5fY3VycmVudCAhPT0gbnVsbCAmJiAndW5pbml0aWFsaXplJyBpbiB0aGlzLl9zY2VuZXNbdGhpcy5fY3VycmVudF0pIHtcblx0XHRcdFx0dGhpcy5fc2NlbmVzW3RoaXMuX2N1cnJlbnRdLnVuaW5pdGlhbGl6ZS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gaW5pdGlhbGl6ZSBuZXh0IHNjZW5lXG5cdFx0XHR0aGlzLl9zY2VuZXNbbmFtZV0uaW5pdGlhbGl6ZS5jYWxsKHRoaXMpO1xuXHRcdFx0dmFyIG9sZFNjZW5lID0gdGhpcy5fY3VycmVudDtcblx0XHRcdHRoaXMuX2N1cnJlbnQgPSBuYW1lO1xuXHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJTY2VuZUNoYW5nZVwiLCB7IG9sZFNjZW5lOiBvbGRTY2VuZSwgbmV3U2NlbmU6IG5hbWUgfSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdC8vYWRkIHNjZW5lXG5cdFx0dGhpcy5fc2NlbmVzW25hbWVdID0ge31cblx0XHR0aGlzLl9zY2VuZXNbbmFtZV0uaW5pdGlhbGl6ZSA9IGludHJvXG5cdFx0aWYgKHR5cGVvZiBvdXRybyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuX3NjZW5lc1tuYW1lXS51bmluaXRpYWxpemUgPSBvdXRybztcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5LnRvUkdCXG5cdCogQGNhdGVnb3J5IEdyYXBoaWNzXG5cdCogQHNpZ24gcHVibGljIFN0cmluZyBDcmFmdHkuc2NlbmUoU3RyaW5nIGhleFssIE51bWJlciBhbHBoYV0pXG5cdCogQHBhcmFtIGhleCAtIGEgNiBjaGFyYWN0ZXIgaGV4IG51bWJlciBzdHJpbmcgcmVwcmVzZW50aW5nIFJHQiBjb2xvclxuXHQqIEBwYXJhbSBhbHBoYSAtIFRoZSBhbHBoYSB2YWx1ZS5cblx0KiBcblx0KiBHZXQgYSByZ2Igc3RyaW5nIG9yIHJnYmEgc3RyaW5nIChpZiBgYWxwaGFgIHByZXNlbnRzKS5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS50b1JHQihcImZmZmZmZlwiKTsgLy8gcmdiKDI1NSwyNTUsMjU1KVxuXHQqIENyYWZ0eS50b1JHQihcIiNmZmZmZmZcIik7IC8vIHJnYigyNTUsMjU1LDI1NSlcblx0KiBDcmFmdHkudG9SR0IoXCJmZmZmZmZcIiwgLjUpOyAvLyByZ2JhKDI1NSwyNTUsMjU1LDAuNSlcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIFRleHQudGV4dENvbG9yXG5cdCovXG5cdHRvUkdCOiBmdW5jdGlvbiAoaGV4LCBhbHBoYSkge1xuXHRcdHZhciBoZXggPSAoaGV4LmNoYXJBdCgwKSA9PT0gJyMnKSA/IGhleC5zdWJzdHIoMSkgOiBoZXgsXG5cdFx0XHRjID0gW10sIHJlc3VsdDtcblxuXHRcdGNbMF0gPSBwYXJzZUludChoZXguc3Vic3RyKDAsIDIpLCAxNik7XG5cdFx0Y1sxXSA9IHBhcnNlSW50KGhleC5zdWJzdHIoMiwgMiksIDE2KTtcblx0XHRjWzJdID0gcGFyc2VJbnQoaGV4LnN1YnN0cig0LCAyKSwgMTYpO1xuXG5cdFx0cmVzdWx0ID0gYWxwaGEgPT09IHVuZGVmaW5lZCA/ICdyZ2IoJyArIGMuam9pbignLCcpICsgJyknIDogJ3JnYmEoJyArIGMuam9pbignLCcpICsgJywnICsgYWxwaGEgKyAnKSc7XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59KTtcblxudmFyIERpcnR5UmVjdGFuZ2xlcyA9IChmdW5jdGlvbigpIHtcblxuXHRmdW5jdGlvbiB4MShyZWN0KSB7IHJldHVybiByZWN0Ll94OyB9XG5cdGZ1bmN0aW9uIHgyKHJlY3QpIHsgcmV0dXJuIHJlY3QuX3ggKyByZWN0Ll93OyB9XG5cdGZ1bmN0aW9uIHkxKHJlY3QpIHsgcmV0dXJuIHJlY3QuX3k7IH1cblx0ZnVuY3Rpb24geTIocmVjdCkgeyByZXR1cm4gcmVjdC5feSArIHJlY3QuX2g7IH1cblxuXHRmdW5jdGlvbiBpbnRlcnNlY3RzKGEsIGIpIHtcblx0XHRyZXR1cm4geDEoYSkgPCB4MihiKSAmJiB4MihhKSA+IHgxKGIpICYmIHkxKGEpIDwgeTIoYikgJiYgeTIoYSkgPiB5MShiKTtcblx0fVxuXG5cdHZhciBjb3JuZXJfZGF0YSA9IHt9O1xuXG5cdGZ1bmN0aW9uIHJlc2V0X2Nvcm5lcl9kYXRhKCkge1xuXHRcdGNvcm5lcl9kYXRhLngxeTEgPSBmYWxzZTtcblx0XHRjb3JuZXJfZGF0YS54MXkyID0gZmFsc2U7XG5cdFx0Y29ybmVyX2RhdGEueDJ5MSA9IGZhbHNlO1xuXHRcdGNvcm5lcl9kYXRhLngyeTIgPSBmYWxzZTtcblx0XHRjb3JuZXJfZGF0YS5jb3VudCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBjb3JuZXJzIG9mIGIgdGhhdCBhcmUgaW5zaWRlIGEuXG5cdC8vIF9jb3JuZXJzSW5zaWRlIHN0b3JlcyBpdHMgcmVzdWx0cyBpbiBfY29ybmVyX2RhdGEuIFRoaXMgaXMgc2FmZSB0byBkb1xuXHQvLyBzaW5jZSB0aGUgb25seSByZWN1cnNpdmUgY2FsbCBpbiB0aGlzIGZpbGUgaXMgaW4gdGFpbCBwb3NpdGlvbi5cblx0ZnVuY3Rpb24gY29ybmVyc19pbnNpZGUoYSwgYikge1xuXHRcdHJlc2V0X2Nvcm5lcl9kYXRhKCk7XG5cblx0XHQvLyBUaGUgeDEsIHkxIGNvcm5lciBvZiBiLlxuXHRcdGlmICh4MShiKSA+PSB4MShhKSAmJiB4MShiKSA8PSB4MihhKSkge1xuXG5cdFx0XHQvLyBUaGUgeDEsIHkxIGNvcm5lciBvZiBiLlxuXHRcdFx0aWYgKHkxKGIpID49IHkxKGEpICYmIHkxKGIpIDw9IHkyKGEpKSB7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLngxeTEgPSB0cnVlO1xuXHRcdFx0XHRjb3JuZXJfZGF0YS5jb3VudCsrO1xuXHRcdFx0fVxuXHRcdFx0Ly8gVGhlIHgxLCB5MiBjb3JuZXIgb2YgYlxuXHRcdFx0aWYgKHkyKGIpID49IHkxKGEpICYmIHkyKGIpIDw9IHkyKGEpKSB7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLngxeTIgPSB0cnVlO1xuXHRcdFx0XHRjb3JuZXJfZGF0YS5jb3VudCsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh4MihiKSA+PSB4MShhKSAmJiB4MihiKSA8PSB4MihhKSkge1xuXHRcdFx0Ly8gVGhlIHgyLCB5MSBjb3JuZXIgb2YgYi5cblx0XHRcdGlmICh5MShiKSA+PSB5MShhKSAmJiB5MShiKSA8PSB5MihhKSkge1xuXHRcdFx0XHRjb3JuZXJfZGF0YS54MnkxID0gdHJ1ZTtcblx0XHRcdFx0Y29ybmVyX2RhdGEuY291bnQrKztcblx0XHRcdH1cblx0XHRcdC8vIFRoZSB4MiwgeTIgY29ybmVyIG9mIGJcblx0XHRcdGlmICh5MihiKSA+PSB5MShhKSAmJiB5MihiKSA8PSB5MihhKSkge1xuXHRcdFx0XHRjb3JuZXJfZGF0YS54MnkyID0gdHJ1ZTtcblx0XHRcdFx0Y29ybmVyX2RhdGEuY291bnQrKztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY29ybmVyX2RhdGEuY291bnQ7XG5cdH1cblxuXHQvLyBTaHJpbmsgY29udGFpbmVkIHNvIHRoYXQgaXQgbm8gbG9uZ2VyIG92ZXJsYXBzIGNvbnRhaW5pbmcuXG5cdC8vIFJlcXVpcmVzOlxuXHQvLyAgICogRXhhY3RseSB0d28gY29ybmVycyBvZiBjb250YWluZWQgYXJlIHdpdGhpbiBjb250YWluaW5nLlxuXHQvLyAgICogX2Nvcm5lcnNJbnNpZGUgY2FsbGVkIGZvciBjb250YWluaW5nIGFuZCBjb250YWluZWQuXG5cdGZ1bmN0aW9uIHNocmlua19yZWN0KGNvbnRhaW5pbmcsIGNvbnRhaW5lZCkge1xuXG5cdFx0Ly8gVGhlIHgxLCB5MSBhbmQgeDIsIHkxIGNvcm5lciBvZiBjb250YWluZWQuXG5cdFx0aWYgKGNvcm5lcl9kYXRhLngxeTEgJiYgY29ybmVyX2RhdGEueDJ5MSkge1xuXHRcdFx0Y29udGFpbmVkLl9oIC09IHkyKGNvbnRhaW5pbmcpIC0geTEoY29udGFpbmVkKTtcblx0XHRcdGNvbnRhaW5lZC5feSA9IHkyKGNvbnRhaW5pbmcpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB4MSwgeTEgYW5kIHgxLCB5MiBjb3JuZXIgb2YgY29udGFpbmVkLlxuXHRcdGlmIChjb3JuZXJfZGF0YS54MXkxICYmIGNvcm5lcl9kYXRhLngxeTIpIHtcblx0XHRcdGNvbnRhaW5lZC5fdyAtPSB4Mihjb250YWluaW5nKSAtIHgxKGNvbnRhaW5lZCk7XG5cdFx0XHRjb250YWluZWQuX3ggPSB4Mihjb250YWluaW5nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUaGUgeDEsIHkyIGFuZCB4MiwgeTIgY29ybmVyIG9mIGNvbnRhaW5lZC5cblx0XHRpZiAoY29ybmVyX2RhdGEueDF5MiAmJiBjb3JuZXJfZGF0YS54MnkyKSB7XG5cdFx0XHRjb250YWluZWQuX2ggPSB5MShjb250YWluaW5nKSAtIHkxKGNvbnRhaW5lZCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gVGhlIHgyLCB5MSBhbmQgeDIsIHkyIGNvcm5lciBvZiBjb250YWluZWQuXG5cdFx0aWYgKGNvcm5lcl9kYXRhLngyeTEgJiYgY29ybmVyX2RhdGEueDJ5Mikge1xuXHRcdFx0Y29udGFpbmVkLl93ID0geDEoY29udGFpbmluZykgLSB4MShjb250YWluZWQpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHR9XG5cblx0Ly8gRW5sYXJnZSBgYWAgc3VjaCB0aGF0IGl0IGNvdmVycyBgYmAgYXMgd2VsbC5cblx0ZnVuY3Rpb24gbWVyZ2VfaW50byhhLCBiKSB7XG5cdFx0dmFyIG5ld1gyID0gTWF0aC5tYXgoeDIoYSksIHgyKGIpKTtcblx0XHR2YXIgbmV3WTIgPSBNYXRoLm1heCh5MihhKSwgeTIoYikpO1xuXG5cdFx0YS5feCA9IE1hdGgubWluKGEuX3gsIGIuX3gpO1xuXHRcdGEuX3kgPSBNYXRoLm1pbihhLl95LCBiLl95KTtcblxuXHRcdGEuX3cgPSBuZXdYMiAtIGEuX3g7XG5cdFx0YS5faCA9IG5ld1kyIC0gYS5feTtcblx0fVxuXG5cdGZ1bmN0aW9uIERpcnR5UmVjdGFuZ2xlcygpIHtcblx0XHR0aGlzLnJlY3RhbmdsZXMgPSBbXTtcblx0fTtcblxuXHREaXJ0eVJlY3RhbmdsZXMucHJvdG90eXBlLmFkZF9yZWN0YW5nbGUgPSBmdW5jdGlvbihuZXdfcmVjdCkge1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0XHR2YXIgaW5kaWNlc190b19kZWxldGUgPSBbXTtcblxuXHRcdGZ1bmN0aW9uIGRlbGV0ZV9pbmRpY2VzKCkge1xuXHRcdFx0dmFyIGksIGluZGV4O1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGluZGljZXNfdG9fZGVsZXRlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4ID0gaW5kaWNlc190b19kZWxldGVbaV07XG5cdFx0XHRcdF90aGlzLnJlY3RhbmdsZXMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgaW5kZXgsIHJlY3QsIGNvcm5lcnMsIGluZGljZXNfdG9fZGVsZXRlO1xuXG5cdFx0Zm9yIChpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5yZWN0YW5nbGVzLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdFx0cmVjdCA9IHRoaXMucmVjdGFuZ2xlc1tpbmRleF07XG5cblx0XHRcdGlmIChpbnRlcnNlY3RzKG5ld19yZWN0LCByZWN0KSkge1xuXHRcdFx0XHRjb3JuZXJzID0gY29ybmVyc19pbnNpZGUocmVjdCwgbmV3X3JlY3QpO1xuXHRcdFx0XHRzd2l0Y2ggKGNvcm5lcnMpIHtcblx0XHRcdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdFx0XHQvLyBJZiA0IGNvcm5lcnMgb2YgbmV3X3JlY3QgbGllIHdpdGhpbiByZWN0LCB3ZSBjYW4gZGlzY2FyZFxuXHRcdFx0XHRcdFx0Ly8gbmV3X3JlY3QuICBXZSBzaG91bGRuJ3QgaGF2ZSBmb3VuZCBhbnkgcmVjdGFuZ2xlcyB0byBkZWxldGUsXG5cdFx0XHRcdFx0XHQvLyBiZWNhdXNlIGlmIGEgcmVjdGFuZ2xlIGluIHRoZSBsaXN0IGlzIGNvbnRhaW5lZCB3aXRoaW5cblx0XHRcdFx0XHRcdC8vIG5ld19yZWN0LCBhbmQgbmV3X3JlY3QgaXMgY29udGFpbmVkIHdpdGggcmVjdCwgdGhlbiB0aGVyZSBhcmVcblx0XHRcdFx0XHRcdC8vIG92ZXJsYXBwaW5nIHJlY3RhbmdsZXMgaW4gdGhlIGxpc3QuXG5cdFx0XHRcdFx0XHRpZiAoaW5kaWNlc190b19kZWxldGUubGVuZ3RoID4gMClcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkRpcnR5IHJlY3RhbmdsZSBidWdcIik7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkltcG9zc2libGUgY29ybmVyIGNvdW50XCIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRcdC8vIFNocmluayBuZXdfcmVjdCB0byBub3Qgb3ZlcmxhcCByZWN0LlxuXHRcdFx0XHRcdFx0c2hyaW5rX3JlY3QocmVjdCwgbmV3X3JlY3QpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdFx0Y29ybmVycyA9IGNvcm5lcnNfaW5zaWRlKG5ld19yZWN0LCByZWN0KTtcblx0XHRcdFx0XHRcdHN3aXRjaCAoY29ybmVycykge1xuXHRcdFx0XHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gTWVyZ2UgdGhlIHR3byByZWN0YW5nbGVzLlxuXHRcdFx0XHRcdFx0XHRcdG1lcmdlX2ludG8ocmVjdCwgbmV3X3JlY3QpO1xuXHRcdFx0XHRcdFx0XHRcdC8vIFRPRE86IE11c3QgcmVtb3ZlIHJlY3QgYW5kIHJlLWluc2VydCBpdC5cblx0XHRcdFx0XHRcdFx0XHRpbmRpY2VzX3RvX2RlbGV0ZS51bnNoaWZ0KGluZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRkZWxldGVfaW5kaWNlcygpO1xuXHRcdFx0XHRcdFx0XHRcdF90aGlzLmFkZF9yZWN0YW5nbGUocmVjdCk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhpcyBjYXNlIGxvb2tzIGxpa2UgdGhpczpcblx0XHRcdFx0XHRcdFx0XHQvLyArLS0tLS0tLS0rPT09PT09PT09Ky0tLS0tLS0tLS0rXG5cdFx0XHRcdFx0XHRcdFx0Ly8gfHJlY3QgICAgfCAgICAgICAgIHwgICAgICAgICAgfFxuXHRcdFx0XHRcdFx0XHRcdC8vIHwgICAgICAgIHwgICAgICAgICB8ICAgICAgICAgIHxcblx0XHRcdFx0XHRcdFx0XHQvLyArLS0tLS0tLS0rLS0tLS0tLS0tKyBuZXdfcmVjdCB8XG5cdFx0XHRcdFx0XHRcdFx0Ly8gICAgICAgICAgKy0tLS0tLS0tLS0tLS0tLS0tLS0tK1xuXHRcdFx0XHRcdFx0XHRcdC8vIE5vdGUgaG93IG5ld19yZWN0IGhhcyAxIGNvcm5lciBpbiByZWN0LCB3aGlsZVxuXHRcdFx0XHRcdFx0XHRcdC8vIHJlY3QgaGFzIDIgY29ybmVycyBpbiBuZXdfcmVjdC5cblx0XHRcdFx0XHRcdFx0XHQvL1xuXHRcdFx0XHRcdFx0XHRcdC8vIE9idmlvdXNseSwgd2Ugc2hyaW5rIHJlY3QgdG8gbm90IG92ZXJsYXAgbmV3X3JlY3QuXG5cdFx0XHRcdFx0XHRcdFx0c2hyaW5rX3JlY3QobmV3X3JlY3QsIHJlY3QpO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhpcyBjYXNlIG9jY3VycyB3aGVuIG5ld19yZWN0IGFuZCByZWN0IGhhdmUgMSBjb3JuZXIgaW4gY29tbW9uLFxuXHRcdFx0XHRcdFx0XHRcdC8vIGJ1dCByZWN0IGxpZXMgZW50aXJlbHkgd2l0aGluIG5ld19yZWN0LlxuXHRcdFx0XHRcdFx0XHRcdC8vIFdlIGRlbGV0ZSByZWN0LCBzaW5jZSBuZXdfcmVjdCBlbmNvbXBhc3NlcyBpdCwgYW5kIGNvbnRpbnVlIHdpdGhcblx0XHRcdFx0XHRcdFx0XHQvLyBpbnNlcnRpb24gbm9ybWFsbHkuXG5cdFx0XHRcdFx0XHRcdFx0aW5kaWNlc190b19kZWxldGUudW5zaGlmdChpbmRleCk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkRpcnR5IHJlY3RhbmdsZSBidWdcIik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlIDA6XG5cdFx0XHRcdFx0XHQvLyBObyBjb3JuZXJzIG9mIG5ld19yZWN0IGFyZSBpbnNpZGUgcmVjdC4gSW5zdGVhZCwgc2VlIGhvdyBtYW55XG5cdFx0XHRcdFx0XHQvLyBjb3JuZXJzIG9mIHJlY3QgYXJlIGluc2lkZSBuZXdfcmVjdFxuXHRcdFx0XHRcdFx0Y29ybmVycyA9IGNvcm5lcnNfaW5zaWRlKG5ld19yZWN0LCByZWN0KTtcblx0XHRcdFx0XHRcdHN3aXRjaCAoY29ybmVycykge1xuXHRcdFx0XHRcdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gRGVsZXRlIHJlY3QsIGNvbnRpbnVlIHdpdGggaW5zZXJ0aW9uIG9mIG5ld19yZWN0XG5cdFx0XHRcdFx0XHRcdFx0aW5kaWNlc190b19kZWxldGUudW5zaGlmdChpbmRleCk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgMzpcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSW1wb3NzaWJsZSBjb3JuZXIgY291bnRcIik7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gU2hyaW5rIHJlY3QgdG8gbm90IG92ZXJsYXAgbmV3X3JlY3QsIGNvbnRpbnVlIHdpdGggaW5zZXJ0aW9uLlxuXHRcdFx0XHRcdFx0XHRcdHNocmlua19yZWN0KG5ld19yZWN0LCByZWN0KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdFx0XHRcdC8vIFRoaXMgc2hvdWxkIGJlIGltcG9zc2libGUsIHRoZSBlYXJsaWVyIGNhc2Ugb2YgMSBjb3JuZXIgb3ZlcmxhcHBpbmdcblx0XHRcdFx0XHRcdFx0XHQvLyBzaG91bGQgaGF2ZSBiZWVuIHRyaWdnZXJlZC5cblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSW1wb3NzaWJsZSBjb3JuZXIgY291bnRcIik7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZGVsZXRlX2luZGljZXMoKTtcblx0XHR0aGlzLnJlY3RhbmdsZXMucHVzaChuZXdfcmVjdCk7XG5cdH07XG5cblx0cmV0dXJuIERpcnR5UmVjdGFuZ2xlcztcblxufSkoKTtcblxuLyoqQFxuKiAjQ3JhZnR5LkRyYXdNYW5hZ2VyXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBAc2lnbiBDcmFmdHkuRHJhd01hbmFnZXJcbiogXG4qIEFuIGludGVybmFsIG9iamVjdCBtYW5hZ2Ugb2JqZWN0cyB0byBiZSBkcmF3biBhbmQgaW1wbGVtZW50XG4qIHRoZSBiZXN0IG1ldGhvZCBvZiBkcmF3aW5nIGluIGJvdGggRE9NIGFuZCBjYW52YXNcbiovXG5DcmFmdHkuRHJhd01hbmFnZXIgPSAoZnVuY3Rpb24gKCkge1xuXHQvKiogYXJyYXkgb2YgZGlydHkgcmVjdHMgb24gc2NyZWVuICovXG5cdHZhciBkaXJ0eV9yZWN0cyA9IFtdLFxuXHQvKiogYXJyYXkgb2YgRE9NcyBuZWVkZWQgdXBkYXRpbmcgKi9cblx0XHRkb20gPSBbXTtcblxuXHRyZXR1cm4ge1xuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIudG90YWwyRFxuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBcblx0XHQqIFRvdGFsIG51bWJlciBvZiB0aGUgZW50aXRpZXMgdGhhdCBoYXZlIHRoZSBgMkRgIGNvbXBvbmVudC5cblx0XHQqL1xuXHRcdHRvdGFsMkQ6IENyYWZ0eShcIjJEXCIpLmxlbmd0aCxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIub25TY3JlZW5cblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5vblNjcmVlbihPYmplY3QgcmVjdClcblx0XHQqIEBwYXJhbSByZWN0IC0gQSByZWN0YW5nbGUgd2l0aCBmaWVsZCB7X3g6IHhfdmFsLCBfeTogeV92YWwsIF93OiB3X3ZhbCwgX2g6IGhfdmFsfVxuXHRcdCogXG5cdFx0KiBUZXN0IGlmIGEgcmVjdGFuZ2xlIGlzIGNvbXBsZXRlbHkgaW4gdmlld3BvcnRcblx0XHQqL1xuXHRcdG9uU2NyZWVuOiBmdW5jdGlvbiAocmVjdCkge1xuXHRcdFx0cmV0dXJuIENyYWZ0eS52aWV3cG9ydC5feCArIHJlY3QuX3ggKyByZWN0Ll93ID4gMCAmJiBDcmFmdHkudmlld3BvcnQuX3kgKyByZWN0Ll95ICsgcmVjdC5faCA+IDAgJiZcblx0XHRcdFx0ICAgQ3JhZnR5LnZpZXdwb3J0Ll94ICsgcmVjdC5feCA8IENyYWZ0eS52aWV3cG9ydC53aWR0aCAmJiBDcmFmdHkudmlld3BvcnQuX3kgKyByZWN0Ll95IDwgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5tZXJnZVxuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5EcmF3TWFuYWdlci5tZXJnZShPYmplY3Qgc2V0KVxuXHRcdCogQHBhcmFtIHNldCAtIGFuIGFycmF5IG9mIHJlY3Rhbmd1bGFyIHJlZ2lvbnNcblx0XHQqIFxuXHRcdCogTWVyZ2VkIGludG8gbm9uIG92ZXJsYXBwaW5nIHJlY3Rhbmd1bGFyIHJlZ2lvblxuXHRcdCogSXRzIGFuIG9wdGltaXphdGlvbiBmb3IgdGhlIHJlZHJhdyByZWdpb25zLlxuXHRcdCovXG5cdFx0bWVyZ2U6IGZ1bmN0aW9uIChzZXQpIHtcblx0XHRcdHZhciBkciA9IG5ldyBEaXJ0eVJlY3RhbmdsZXMoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwLCBuZXdfcmVjdDsgbmV3X3JlY3QgPSBzZXRbaV07IGkrKykge1xuXHRcdFx0XHRkci5hZGRfcmVjdGFuZ2xlKG5ld19yZWN0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkci5yZWN0YW5nbGVzO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLmFkZFxuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLmFkZChvbGQsIGN1cnJlbnQpXG5cdFx0KiBAcGFyYW0gb2xkIC0gVW5kb2N1bWVudGVkXG5cdFx0KiBAcGFyYW0gY3VycmVudCAtIFVuZG9jdW1lbnRlZFxuXHRcdCogXG5cdFx0KiBDYWxjdWxhdGUgdGhlIGJvdW5kaW5nIHJlY3Qgb2YgZGlydHkgZGF0YSBhbmQgYWRkIHRvIHRoZSByZWdpc3RlciBvZiBkaXJ0eSByZWN0YW5nbGVzXG5cdFx0Ki9cblx0XHRhZGQ6IGZ1bmN0aW9uIGFkZChvbGQsIGN1cnJlbnQpIHtcblx0XHRcdGlmICghY3VycmVudCkge1xuXHRcdFx0XHRkb20ucHVzaChvbGQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciByZWN0LFxuXHRcdFx0XHRiZWZvcmUgPSBvbGQuX21iciB8fCBvbGQsXG5cdFx0XHRcdGFmdGVyID0gY3VycmVudC5fbWJyIHx8IGN1cnJlbnQ7XG5cblx0XHRcdGlmIChvbGQgPT09IGN1cnJlbnQpIHtcblx0XHRcdFx0cmVjdCA9IG9sZC5tYnIoKSB8fCBvbGQucG9zKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWN0ID0ge1xuXHRcdFx0XHRcdF94OiB+fk1hdGgubWluKGJlZm9yZS5feCwgYWZ0ZXIuX3gpLFxuXHRcdFx0XHRcdF95OiB+fk1hdGgubWluKGJlZm9yZS5feSwgYWZ0ZXIuX3kpLFxuXHRcdFx0XHRcdF93OiBNYXRoLm1heChiZWZvcmUuX3csIGFmdGVyLl93KSArIE1hdGgubWF4KGJlZm9yZS5feCwgYWZ0ZXIuX3gpLFxuXHRcdFx0XHRcdF9oOiBNYXRoLm1heChiZWZvcmUuX2gsIGFmdGVyLl9oKSArIE1hdGgubWF4KGJlZm9yZS5feSwgYWZ0ZXIuX3kpXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0cmVjdC5fdyA9IChyZWN0Ll93IC0gcmVjdC5feCk7XG5cdFx0XHRcdHJlY3QuX2ggPSAocmVjdC5faCAtIHJlY3QuX3kpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVjdC5fdyA9PT0gMCB8fCByZWN0Ll9oID09PSAwIHx8ICF0aGlzLm9uU2NyZWVuKHJlY3QpKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly9mbG9vci9jZWlsXG5cdFx0XHRyZWN0Ll94ID0gfn5yZWN0Ll94O1xuXHRcdFx0cmVjdC5feSA9IH5+cmVjdC5feTtcblx0XHRcdHJlY3QuX3cgPSAocmVjdC5fdyA9PT0gfn5yZWN0Ll93KSA/IHJlY3QuX3cgOiByZWN0Ll93ICsgMSB8IDA7XG5cdFx0XHRyZWN0Ll9oID0gKHJlY3QuX2ggPT09IH5+cmVjdC5faCkgPyByZWN0Ll9oIDogcmVjdC5faCArIDEgfCAwO1xuXG5cdFx0XHQvL2FkZCB0byBkaXJ0eV9yZWN0cywgY2hlY2sgZm9yIG1lcmdpbmdcblx0XHRcdGRpcnR5X3JlY3RzLnB1c2gocmVjdCk7XG5cblx0XHRcdC8vaWYgaXQgZ290IG1lcmdlZFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIuZGVidWdcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5kZWJ1ZygpXG5cdFx0Ki9cblx0XHRkZWJ1ZzogZnVuY3Rpb24gKCkge1xuXHRcdFx0Y29uc29sZS5sb2coZGlydHlfcmVjdHMsIGRvbSk7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIuZHJhd1xuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcoW09iamVjdCByZWN0XSlcbiAgICAgICAgKiBAcGFyYW0gcmVjdCAtIGEgcmVjdGFuZ3VsYXIgcmVnaW9uIHtfeDogeF92YWwsIF95OiB5X3ZhbCwgX3c6IHdfdmFsLCBfaDogaF92YWx9XG4gICAgICAgICogfn5+XG5cdFx0KiAtIElmIHJlY3QgaXMgb21pdHRlZCwgcmVkcmF3IHdpdGhpbiB0aGUgdmlld3BvcnRcblx0XHQqIC0gSWYgcmVjdCBpcyBwcm92aWRlZCwgcmVkcmF3IHdpdGhpbiB0aGUgcmVjdFxuXHRcdCogfn5+XG5cdFx0Ki9cblx0XHRkcmF3QWxsOiBmdW5jdGlvbiAocmVjdCkge1xuXHRcdFx0dmFyIHJlY3QgPSByZWN0IHx8IENyYWZ0eS52aWV3cG9ydC5yZWN0KCksXG5cdFx0XHRcdHEgPSBDcmFmdHkubWFwLnNlYXJjaChyZWN0KSxcblx0XHRcdFx0aSA9IDAsXG5cdFx0XHRcdGwgPSBxLmxlbmd0aCxcblx0XHRcdFx0Y3R4ID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0LFxuXHRcdFx0XHRjdXJyZW50O1xuXG5cdFx0XHRjdHguY2xlYXJSZWN0KHJlY3QuX3gsIHJlY3QuX3ksIHJlY3QuX3csIHJlY3QuX2gpO1xuXG5cdFx0XHQvL3NvcnQgdGhlIG9iamVjdHMgYnkgdGhlIGdsb2JhbCBaXG5cdFx0XHRxLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEuX2dsb2JhbFogLSBiLl9nbG9iYWxaOyB9KTtcblx0XHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdGN1cnJlbnQgPSBxW2ldO1xuXHRcdFx0XHRpZiAoY3VycmVudC5fdmlzaWJsZSAmJiBjdXJyZW50Ll9fYy5DYW52YXMpIHtcblx0XHRcdFx0XHRjdXJyZW50LmRyYXcoKTtcblx0XHRcdFx0XHRjdXJyZW50Ll9jaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5ib3VuZGluZ1JlY3Rcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5ib3VuZGluZ1JlY3Qoc2V0KVxuXHRcdCogQHBhcmFtIHNldCAtIFVuZG9jdW1lbnRlZFxuXHRcdCogfn5+XG5cdFx0KiAtIENhbGN1bGF0ZSB0aGUgY29tbW9uIGJvdW5kaW5nIHJlY3Qgb2YgbXVsdGlwbGUgY2FudmFzIGVudGl0aWVzLlxuXHRcdCogLSBSZXR1cm5zIGNvb3Jkc1xuXHRcdCogfn5+XG5cdFx0Ki9cblx0XHRib3VuZGluZ1JlY3Q6IGZ1bmN0aW9uIChzZXQpIHtcblx0XHRcdGlmICghc2V0IHx8ICFzZXQubGVuZ3RoKSByZXR1cm47XG5cdFx0XHR2YXIgbmV3c2V0ID0gW10sIGkgPSAxLFxuXHRcdFx0bCA9IHNldC5sZW5ndGgsIGN1cnJlbnQsIG1hc3RlciA9IHNldFswXSwgdG1wO1xuXHRcdFx0bWFzdGVyID0gW21hc3Rlci5feCwgbWFzdGVyLl95LCBtYXN0ZXIuX3ggKyBtYXN0ZXIuX3csIG1hc3Rlci5feSArIG1hc3Rlci5faF07XG5cdFx0XHR3aGlsZSAoaSA8IGwpIHtcblx0XHRcdFx0Y3VycmVudCA9IHNldFtpXTtcblx0XHRcdFx0dG1wID0gW2N1cnJlbnQuX3gsIGN1cnJlbnQuX3ksIGN1cnJlbnQuX3ggKyBjdXJyZW50Ll93LCBjdXJyZW50Ll95ICsgY3VycmVudC5faF07XG5cdFx0XHRcdGlmICh0bXBbMF0gPCBtYXN0ZXJbMF0pIG1hc3RlclswXSA9IHRtcFswXTtcblx0XHRcdFx0aWYgKHRtcFsxXSA8IG1hc3RlclsxXSkgbWFzdGVyWzFdID0gdG1wWzFdO1xuXHRcdFx0XHRpZiAodG1wWzJdID4gbWFzdGVyWzJdKSBtYXN0ZXJbMl0gPSB0bXBbMl07XG5cdFx0XHRcdGlmICh0bXBbM10gPiBtYXN0ZXJbM10pIG1hc3RlclszXSA9IHRtcFszXTtcblx0XHRcdFx0aSsrO1xuXHRcdFx0fVxuXHRcdFx0dG1wID0gbWFzdGVyO1xuXHRcdFx0bWFzdGVyID0geyBfeDogdG1wWzBdLCBfeTogdG1wWzFdLCBfdzogdG1wWzJdIC0gdG1wWzBdLCBfaDogdG1wWzNdIC0gdG1wWzFdIH07XG5cblx0XHRcdHJldHVybiBtYXN0ZXI7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIuZHJhd1xuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcoKVxuXHRcdCogfn5+XG5cdFx0KiAtIElmIHRoZSBudW1iZXIgb2YgcmVjdHMgaXMgb3ZlciA2MCUgb2YgdGhlIHRvdGFsIG51bWJlciBvZiBvYmplY3RzXG5cdFx0Klx0ZG8gdGhlIG5haXZlIG1ldGhvZCByZWRyYXdpbmcgYENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsYFxuXHRcdCogLSBPdGhlcndpc2UsIGNsZWFyIHRoZSBkaXJ0eSByZWdpb25zLCBhbmQgcmVkcmF3IGVudGl0aWVzIG92ZXJsYXBwaW5nIHRoZSBkaXJ0eSByZWdpb25zLlxuXHRcdCogfn5+XG5cdFx0KiBcbiAgICAgICAgKiBAc2VlIENhbnZhcy5kcmF3LCBET00uZHJhd1xuXHRcdCovXG5cdFx0ZHJhdzogZnVuY3Rpb24gZHJhdygpIHtcblx0XHRcdC8vaWYgbm90aGluZyBpbiBkaXJ0eV9yZWN0cywgc3RvcFxuXHRcdFx0aWYgKCFkaXJ0eV9yZWN0cy5sZW5ndGggJiYgIWRvbS5sZW5ndGgpIHJldHVybjtcblxuXHRcdFx0dmFyIGkgPSAwLCBsID0gZGlydHlfcmVjdHMubGVuZ3RoLCBrID0gZG9tLmxlbmd0aCwgcmVjdCwgcSxcblx0XHRcdFx0aiwgbGVuLCBkdXBlcywgb2JqLCBlbnQsIG9ianMgPSBbXSwgY3R4ID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0O1xuXG5cdFx0XHQvL2xvb3Agb3ZlciBhbGwgRE9NIGVsZW1lbnRzIG5lZWRpbmcgdXBkYXRpbmdcblx0XHRcdGZvciAoOyBpIDwgazsgKytpKSB7XG5cdFx0XHRcdGRvbVtpXS5kcmF3KCkuX2NoYW5nZWQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdC8vcmVzZXQgRE9NIGFycmF5XG4gICAgICAgICAgICBkb20ubGVuZ3RoID0gMDtcblx0XHRcdC8vYWdhaW4sIHN0b3AgaWYgbm90aGluZyBpbiBkaXJ0eV9yZWN0c1xuXHRcdFx0aWYgKCFsKSB7IHJldHVybjsgfVxuXG5cdFx0XHQvL2lmIHRoZSBhbW91bnQgb2YgcmVjdHMgaXMgb3ZlciA2MCUgb2YgdGhlIHRvdGFsIG9iamVjdHNcblx0XHRcdC8vZG8gdGhlIG5haXZlIG1ldGhvZCByZWRyYXdpbmdcblx0XHRcdGlmICh0cnVlIHx8IGwgLyB0aGlzLnRvdGFsMkQgPiAwLjYpIHtcblx0XHRcdFx0dGhpcy5kcmF3QWxsKCk7XG5cdFx0XHRcdGRpcnR5X3JlY3RzLmxlbmd0aCA9IDA7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZGlydHlfcmVjdHMgPSB0aGlzLm1lcmdlKGRpcnR5X3JlY3RzKTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyArK2kpIHsgLy9sb29wIG92ZXIgZXZlcnkgZGlydHkgcmVjdFxuXHRcdFx0XHRyZWN0ID0gZGlydHlfcmVjdHNbaV07XG5cdFx0XHRcdGlmICghcmVjdCkgY29udGludWU7XG5cdFx0XHRcdHEgPSBDcmFmdHkubWFwLnNlYXJjaChyZWN0LCBmYWxzZSk7IC8vc2VhcmNoIGZvciBlbnRzIHVuZGVyIGRpcnR5IHJlY3RcblxuXHRcdFx0XHRkdXBlcyA9IHt9O1xuXG5cdFx0XHRcdC8vbG9vcCBvdmVyIGZvdW5kIG9iamVjdHMgcmVtb3ZpbmcgZHVwZXMgYW5kIGFkZGluZyB0byBvYmogYXJyYXlcblx0XHRcdFx0Zm9yIChqID0gMCwgbGVuID0gcS5sZW5ndGg7IGogPCBsZW47ICsraikge1xuXHRcdFx0XHRcdG9iaiA9IHFbal07XG5cblx0XHRcdFx0XHRpZiAoZHVwZXNbb2JqWzBdXSB8fCAhb2JqLl92aXNpYmxlIHx8ICFvYmouX19jLkNhbnZhcylcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdGR1cGVzW29ialswXV0gPSB0cnVlO1xuXG5cdFx0XHRcdFx0b2Jqcy5wdXNoKHsgb2JqOiBvYmosIHJlY3Q6IHJlY3QgfSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL2NsZWFyIHRoZSByZWN0IGZyb20gdGhlIG1haW4gY2FudmFzXG5cdFx0XHRcdGN0eC5jbGVhclJlY3QocmVjdC5feCwgcmVjdC5feSwgcmVjdC5fdywgcmVjdC5faCk7XG5cblx0XHRcdH1cblxuXHRcdFx0Ly9zb3J0IHRoZSBvYmplY3RzIGJ5IHRoZSBnbG9iYWwgWlxuXHRcdFx0b2Jqcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhLm9iai5fZ2xvYmFsWiAtIGIub2JqLl9nbG9iYWxaOyB9KTtcblx0XHRcdGlmICghb2Jqcy5sZW5ndGgpeyByZXR1cm47IH1cblxuXHRcdFx0Ly9sb29wIG92ZXIgdGhlIG9iamVjdHNcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHRvYmogPSBvYmpzW2ldO1xuXHRcdFx0XHRyZWN0ID0gb2JqLnJlY3Q7XG5cdFx0XHRcdGVudCA9IG9iai5vYmo7XG5cblx0XHRcdFx0dmFyIGFyZWEgPSBlbnQuX21iciB8fCBlbnQsXG5cdFx0XHRcdFx0eCA9IChyZWN0Ll94IC0gYXJlYS5feCA8PSAwKSA/IDAgOiB+fihyZWN0Ll94IC0gYXJlYS5feCksXG5cdFx0XHRcdFx0eSA9IChyZWN0Ll95IC0gYXJlYS5feSA8IDApID8gMCA6IH5+KHJlY3QuX3kgLSBhcmVhLl95KSxcblx0XHRcdFx0XHR3ID0gfn5NYXRoLm1pbihhcmVhLl93IC0geCwgcmVjdC5fdyAtIChhcmVhLl94IC0gcmVjdC5feCksIHJlY3QuX3csIGFyZWEuX3cpLFxuXHRcdFx0XHRcdGggPSB+fk1hdGgubWluKGFyZWEuX2ggLSB5LCByZWN0Ll9oIC0gKGFyZWEuX3kgLSByZWN0Ll95KSwgcmVjdC5faCwgYXJlYS5faCk7XG5cblx0XHRcdFx0Ly9ubyBwb2ludCBkcmF3aW5nIHdpdGggbm8gd2lkdGggb3IgaGVpZ2h0XG5cdFx0XHRcdGlmIChoID09PSAwIHx8IHcgPT09IDApIGNvbnRpbnVlO1xuXG5cdFx0XHRcdGN0eC5zYXZlKCk7XG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdFx0Y3R4Lm1vdmVUbyhyZWN0Ll94LCByZWN0Ll95KTtcblx0XHRcdFx0Y3R4LmxpbmVUbyhyZWN0Ll94ICsgcmVjdC5fdywgcmVjdC5feSk7XG5cdFx0XHRcdGN0eC5saW5lVG8ocmVjdC5feCArIHJlY3QuX3csIHJlY3QuX2ggKyByZWN0Ll95KTtcblx0XHRcdFx0Y3R4LmxpbmVUbyhyZWN0Ll94LCByZWN0Ll9oICsgcmVjdC5feSk7XG5cdFx0XHRcdGN0eC5saW5lVG8ocmVjdC5feCwgcmVjdC5feSk7XG5cblx0XHRcdFx0Y3R4LmNsaXAoKTtcblxuXHRcdFx0XHRlbnQuZHJhdygpO1xuXHRcdFx0XHRjdHguY2xvc2VQYXRoKCk7XG5cdFx0XHRcdGN0eC5yZXN0b3JlKCk7XG5cblx0XHRcdFx0Ly9hbGxvdyBlbnRpdHkgdG8gcmUtZGlydHlfcmVjdHNcblx0XHRcdFx0ZW50Ll9jaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vZW1wdHkgZGlydHlfcmVjdHNcblx0XHRcdGRpcnR5X3JlY3RzLmxlbmd0aCA9IDA7XG5cdFx0XHQvL2FsbCBtZXJnZWQgSURzIGFyZSBub3cgaW52YWxpZFxuXHRcdFx0bWVyZ2VkID0ge307XG5cdFx0fVxuXHR9O1xufSkoKTtcblxuQ3JhZnR5LmV4dGVuZCh7XG4vKipAXG4qICNDcmFmdHkuaXNvbWV0cmljXG4qIEBjYXRlZ29yeSAyRFxuKiBQbGFjZSBlbnRpdGllcyBpbiBhIDQ1ZGVnIGlzb21ldHJpYyBmYXNoaW9uLlxuKi9cbiAgICBpc29tZXRyaWM6IHtcbiAgICAgICAgX3RpbGU6IHtcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwXG4gICAgICAgIH0sXG4gICAgICAgIF9lbGVtZW50czp7fSxcbiAgICAgICAgX3Bvczoge1xuICAgICAgICAgICAgeDowLFxuICAgICAgICAgICAgeTowXG4gICAgICAgIH0sXG4gICAgICAgIF96OiAwLFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMuc2l6ZVxuICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLnNpemUoTnVtYmVyIHRpbGVTaXplKVxuICAgICAgICAqIEBwYXJhbSB0aWxlU2l6ZSAtIFRoZSBzaXplIG9mIHRoZSB0aWxlcyB0byBwbGFjZS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBNZXRob2QgdXNlZCB0byBpbml0aWFsaXplIHRoZSBzaXplIG9mIHRoZSBpc29tZXRyaWMgcGxhY2VtZW50LlxuICAgICAgICAqIFJlY29tbWVuZGVkIHRvIHVzZSBhIHNpemUgdmFsdWVzIGluIHRoZSBwb3dlciBvZiBgMmAgKDEyOCwgNjQgb3IgMzIpLlxuICAgICAgICAqIFRoaXMgbWFrZXMgaXQgZWFzeSB0byBjYWxjdWxhdGUgcG9zaXRpb25zIGFuZCBpbXBsZW1lbnQgem9vbWluZy5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5pc29tZXRyaWMucGxhY2VcbiAgICAgICAgKi9cbiAgICAgICAgc2l6ZTogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3RpbGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX3RpbGUuaGVpZ2h0ID0gaGVpZ2h0ID4gMCA/IGhlaWdodCA6IHdpZHRoLzI7IC8vU2V0dXAgd2lkdGgvMiBpZiBoZWlnaHQgaXNuJ3Qgc2V0XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLnBsYWNlXG4gICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMucGxhY2UoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgeiwgRW50aXR5IHRpbGUpXG4gICAgICAgICogQHBhcmFtIHggLSBUaGUgYHhgIHBvc2l0aW9uIHRvIHBsYWNlIHRoZSB0aWxlXG4gICAgICAgICogQHBhcmFtIHkgLSBUaGUgYHlgIHBvc2l0aW9uIHRvIHBsYWNlIHRoZSB0aWxlXG4gICAgICAgICogQHBhcmFtIHogLSBUaGUgYHpgIHBvc2l0aW9uIG9yIGhlaWdodCB0byBwbGFjZSB0aGUgdGlsZVxuICAgICAgICAqIEBwYXJhbSB0aWxlIC0gVGhlIGVudGl0eSB0aGF0IHNob3VsZCBiZSBwb3NpdGlvbiBpbiB0aGUgaXNvbWV0cmljIGZhc2hpb25cbiAgICAgICAgKiBcbiAgICAgICAgKiBVc2UgdGhpcyBtZXRob2QgdG8gcGxhY2UgYW4gZW50aXR5IGluIGFuIGlzb21ldHJpYyBncmlkLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgpO1xuICAgICAgICAqIGlzby5wbGFjZSgyLCAxLCAwLCBDcmFmdHkuZSgnMkQsIERPTSwgQ29sb3InKS5jb2xvcigncmVkJykuYXR0cih7dzoxMjgsIGg6MTI4fSkpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5Lmlzb21ldHJpYy5zaXplXG4gICAgICAgICovXG4gICAgICAgIHBsYWNlOiBmdW5jdGlvbiAoeCwgeSwgeiwgb2JqKSB7XG4gICAgICAgICAgICB2YXIgcG9zID0gdGhpcy5wb3MycHgoeCx5KTtcbiAgICAgICAgICAgIHBvcy50b3AgLT0geiAqICh0aGlzLl90aWxlLndpZHRoIC8gMik7XG4gICAgICAgICAgICBvYmouYXR0cih7XG4gICAgICAgICAgICAgICAgeDogcG9zLmxlZnQgKyBDcmFmdHkudmlld3BvcnQuX3gsIFxuICAgICAgICAgICAgICAgIHk6IHBvcy50b3AgKyBDcmFmdHkudmlld3BvcnQuX3lcbiAgICAgICAgICAgIH0pLnogKz0gejtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLnBvczJweFxuICAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMucG9zMnB4KE51bWJlciB4LE51bWJlciB5KVxuICAgICAgICAgKiBAcGFyYW0geCBcbiAgICAgICAgICogQHBhcmFtIHlcbiAgICAgICAgICogQHJldHVybiBPYmplY3Qge2xlZnQgTnVtYmVyLHRvcCBOdW1iZXJ9XG4gICAgICAgICAqIFxuICAgICAgICAgKiBUaGlzIG1ldGhvZCBjYWxjdWxhdGUgdGhlIFggYW5kIFkgQ29vcmRpbmF0ZXMgdG8gUGl4ZWwgUG9zaXRpb25zXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgsOTYpO1xuICAgICAgICAgKiB2YXIgcG9zaXRpb24gPSBpc28ucG9zMnB4KDEwMCwxMDApOyAvL09iamVjdCB7IGxlZnQ9MTI4MDAsIHRvcD00ODAwfVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIHBvczJweDpmdW5jdGlvbih4LHkpe1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBsZWZ0OnggKiB0aGlzLl90aWxlLndpZHRoICsgKHkgJiAxKSAqICh0aGlzLl90aWxlLndpZHRoIC8gMiksXG4gICAgICAgICAgICAgICAgdG9wOnkgKiB0aGlzLl90aWxlLmhlaWdodCAvIDIgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLnB4MnBvc1xuICAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMucHgycG9zKE51bWJlciBsZWZ0LE51bWJlciB0b3ApXG4gICAgICAgICAqIEBwYXJhbSB0b3AgXG4gICAgICAgICAqIEBwYXJhbSBsZWZ0XG4gICAgICAgICAqIEByZXR1cm4gT2JqZWN0IHt4IE51bWJlcix5IE51bWJlcn1cbiAgICAgICAgICogXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIGNhbGN1bGF0ZSBwaXhlbCB0b3AsbGVmdCBwb3NpdGlvbnMgdG8geCx5IGNvb3JkaW5hdGVzXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgsOTYpO1xuICAgICAgICAgKiB2YXIgcHggPSBpc28ucG9zMnB4KDEyODAwLDQ4MDApO1xuICAgICAgICAgKiBjb25zb2xlLmxvZyhweCk7IC8vT2JqZWN0IHsgeD0tMTAwLCB5PS0xMDB9XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgcHgycG9zOmZ1bmN0aW9uKGxlZnQsdG9wKXtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgeDpNYXRoLmNlaWwoLWxlZnQgLyB0aGlzLl90aWxlLndpZHRoIC0gKHRvcCAmIDEpKjAuNSksXG4gICAgICAgICAgICAgICAgeTotdG9wIC8gdGhpcy5fdGlsZS5oZWlnaHQgKiAyXG4gICAgICAgICAgICB9OyBcbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5jZW50ZXJBdFxuICAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMuY2VudGVyQXQoTnVtYmVyIHgsTnVtYmVyIHkpXG4gICAgICAgICAqIEBwYXJhbSB0b3AgXG4gICAgICAgICAqIEBwYXJhbSBsZWZ0XG4gICAgICAgICAqIFxuICAgICAgICAgKiBUaGlzIG1ldGhvZCBjZW50ZXIgdGhlIFZpZXdwb3J0IGF0IHgveSBsb2NhdGlvbiBvciBnaXZlcyB0aGUgY3VycmVudCBjZW50ZXJwb2ludCBvZiB0aGUgdmlld3BvcnRcbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCw5NikuY2VudGVyQXQoMTAsMTApOyAvL1ZpZXdwb3J0IGlzIG5vdyBtb3ZlZFxuICAgICAgICAgKiAvL0FmdGVyIG1vdmluZyB0aGUgdmlld3BvcnQgYnkgYW5vdGhlciBldmVudCB5b3UgY2FuIGdldCB0aGUgbmV3IGNlbnRlciBwb2ludFxuICAgICAgICAgKiBjb25zb2xlLmxvZyhpc28uY2VudGVyQXQoKSk7XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgY2VudGVyQXQ6ZnVuY3Rpb24oeCx5KXsgICBcbiAgICAgICAgICAgIGlmKHR5cGVvZiB4ID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIHkgPT0gXCJudW1iZXJcIil7XG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IHRoaXMucG9zMnB4KHgseSk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0Ll94ID0gLWNlbnRlci5sZWZ0K0NyYWZ0eS52aWV3cG9ydC53aWR0aC8yLXRoaXMuX3RpbGUud2lkdGgvMjtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuX3kgPSAtY2VudGVyLnRvcCtDcmFmdHkudmlld3BvcnQuaGVpZ2h0LzItdGhpcy5fdGlsZS5oZWlnaHQvMjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDotQ3JhZnR5LnZpZXdwb3J0Ll95K0NyYWZ0eS52aWV3cG9ydC5oZWlnaHQvMi10aGlzLl90aWxlLmhlaWdodC8yLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0Oi1DcmFmdHkudmlld3BvcnQuX3grQ3JhZnR5LnZpZXdwb3J0LndpZHRoLzItdGhpcy5fdGlsZS53aWR0aC8yXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5hcmVhXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5hcmVhKClcbiAgICAgICAgICogQHJldHVybiBPYmplY3Qge3g6e3N0YXJ0IE51bWJlcixlbmQgTnVtYmVyfSx5OntzdGFydCBOdW1iZXIsZW5kIE51bWJlcn19XG4gICAgICAgICAqIFxuICAgICAgICAgKiBUaGlzIG1ldGhvZCBnZXQgdGhlIEFyZWEgc3Vycm91bmRpbmcgYnkgdGhlIGNlbnRlcnBvaW50IGRlcGVuZHMgb24gdmlld3BvcnQgaGVpZ2h0IGFuZCB3aWR0aFxuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4LDk2KS5jZW50ZXJBdCgxMCwxMCk7IC8vVmlld3BvcnQgaXMgbm93IG1vdmVkXG4gICAgICAgICAqIHZhciBhcmVhID0gaXNvLmFyZWEoKTsgLy9nZXQgdGhlIGFyZWFcbiAgICAgICAgICogZm9yKHZhciB5ID0gYXJlYS55LnN0YXJ0O3kgPD0gYXJlYS55LmVuZDt5Kyspe1xuICAgICAgICAgKiAgIGZvcih2YXIgeCA9IGFyZWEueC5zdGFydCA7eCA8PSBhcmVhLnguZW5kO3grKyl7XG4gICAgICAgICAqICAgICAgIGlzby5wbGFjZSh4LHksMCxDcmFmdHkuZShcIjJELERPTSxncmFzXCIpKTsgLy9EaXNwbGF5IHRpbGVzIGluIHRoZSBTY3JlZW5cbiAgICAgICAgICogICB9XG4gICAgICAgICAqIH0gIFxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIGFyZWE6ZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIC8vR2V0IHRoZSBjZW50ZXIgUG9pbnQgaW4gdGhlIHZpZXdwb3J0XG4gICAgICAgICAgICB2YXIgY2VudGVyID0gdGhpcy5jZW50ZXJBdCgpO1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gdGhpcy5weDJwb3MoLWNlbnRlci5sZWZ0K0NyYWZ0eS52aWV3cG9ydC53aWR0aC8yLC1jZW50ZXIudG9wK0NyYWZ0eS52aWV3cG9ydC5oZWlnaHQvMik7XG4gICAgICAgICAgICB2YXIgZW5kID0gdGhpcy5weDJwb3MoLWNlbnRlci5sZWZ0LUNyYWZ0eS52aWV3cG9ydC53aWR0aC8yLC1jZW50ZXIudG9wLUNyYWZ0eS52aWV3cG9ydC5oZWlnaHQvMik7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHg6e1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA6IHN0YXJ0LngsXG4gICAgICAgICAgICAgICAgICAgIGVuZCA6IGVuZC54XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5OntcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgOiBzdGFydC55LFxuICAgICAgICAgICAgICAgICAgICBlbmQgOiBlbmQueVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gXG4gICAgfVxufSk7XG5cblxuQ3JhZnR5LmV4dGVuZCh7XG4gICAgLyoqQFxuKiAjQ3JhZnR5LmRpYW1vbmRJc29cbiogQGNhdGVnb3J5IDJEXG4qIFBsYWNlIGVudGl0aWVzIGluIGEgNDVkZWcgZGlhbW9uZCBpc29tZXRyaWMgZmFzaGlvbi4gSXQgaXMgc2ltaWxhciB0byBpc29tZXRyaWMgYnV0IGhhcyBhbm90aGVyIGdyaWQgbG9jYXRpb25zXG4qL1xuICAgIGRpYW1vbmRJc286e1xuICAgICAgICBfdGlsZToge1xuICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgICAgICByOjBcbiAgICAgICAgfSxcbiAgICAgICAgX21hcDp7XG4gICAgICAgICAgICB3aWR0aDowLFxuICAgICAgICAgICAgaGVpZ2h0OjAsXG4gICAgICAgICAgICB4OjAsXG4gICAgICAgICAgICB5OjBcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIF9vcmlnaW46e1xuICAgICAgICAgICAgeDowLFxuICAgICAgICAgICAgeTowXG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmRpYW1vbmRJc28uaW5pdFxuICAgICAgICAqIEBjb21wIENyYWZ0eS5kaWFtb25kSXNvXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmRpYW1vbmRJc28uaW5pdChOdW1iZXIgdGlsZVdpZHRoLE51bWJlciB0aWxlSGVpZ2h0LE51bWJlciBtYXBXaWR0aCxOdW1iZXIgbWFwSGVpZ2h0KVxuICAgICAgICAqIEBwYXJhbSB0aWxlV2lkdGggLSBUaGUgc2l6ZSBvZiBiYXNlIHRpbGUgd2lkdGggaW4gUGl4ZWxcbiAgICAgICAgKiBAcGFyYW0gdGlsZUhlaWdodCAtIFRoZSBzaXplIG9mIGJhc2UgdGlsZSBoZWlnaHQgaW4gUGl4ZWxcbiAgICAgICAgKiBAcGFyYW0gbWFwV2lkdGggLSBUaGUgd2lkdGggb2Ygd2hvbGUgbWFwIGluIFRpbGVzXG4gICAgICAgICogQHBhcmFtIG1hcEhlaWdodCAtIFRoZSBoZWlnaHQgb2Ygd2hvbGUgbWFwIGluIFRpbGVzXG4gICAgICAgICogXG4gICAgICAgICogTWV0aG9kIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgc2l6ZSBvZiB0aGUgaXNvbWV0cmljIHBsYWNlbWVudC5cbiAgICAgICAgKiBSZWNvbW1lbmRlZCB0byB1c2UgYSBzaXplIGFsdWVzIGluIHRoZSBwb3dlciBvZiBgMmAgKDEyOCwgNjQgb3IgMzIpLlxuICAgICAgICAqIFRoaXMgbWFrZXMgaXQgZWFzeSB0byBjYWxjdWxhdGUgcG9zaXRpb25zIGFuZCBpbXBsZW1lbnQgem9vbWluZy5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuZGlhbW9uZElzby5pbml0KDY0LDEyOCwyMCwyMCk7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuZGlhbW9uZElzby5wbGFjZVxuICAgICAgICAqL1xuICAgICAgICBpbml0OmZ1bmN0aW9uKHR3LCB0aCxtdyxtaCl7XG4gICAgICAgICAgICB0aGlzLl90aWxlLndpZHRoID0gcGFyc2VJbnQodHcpO1xuICAgICAgICAgICAgdGhpcy5fdGlsZS5oZWlnaHQgPSBwYXJzZUludCh0aCl8fHBhcnNlSW50KHR3KS8yO1xuICAgICAgICAgICAgdGhpcy5fdGlsZS5yID0gdGhpcy5fdGlsZS53aWR0aCAvIHRoaXMuX3RpbGUuaGVpZ2h0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9tYXAud2lkdGggPSBwYXJzZUludChtdyk7XG4gICAgICAgICAgICB0aGlzLl9tYXAuaGVpZ2h0ID0gcGFyc2VJbnQobWgpIHx8IHBhcnNlSW50KG13KTtcbiAgICAgICBcbiAgICAgICAgICAgIHRoaXMuX29yaWdpbi54ID0gdGhpcy5fbWFwLmhlaWdodCAqIHRoaXMuX3RpbGUud2lkdGggLyAyO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5kaWFtb25kSXNvLnBsYWNlXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LmRpYW1vbmRJc29cbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuZGlhbW9uZElzby5wbGFjZShFbnRpdHkgdGlsZSxOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciBsYXllcilcbiAgICAgICAgKiBAcGFyYW0geCAtIFRoZSBgeGAgcG9zaXRpb24gdG8gcGxhY2UgdGhlIHRpbGVcbiAgICAgICAgKiBAcGFyYW0geSAtIFRoZSBgeWAgcG9zaXRpb24gdG8gcGxhY2UgdGhlIHRpbGVcbiAgICAgICAgKiBAcGFyYW0gbGF5ZXIgLSBUaGUgYHpgIHBvc2l0aW9uIHRvIHBsYWNlIHRoZSB0aWxlIChjYWxjdWxhdGVkIGJ5IHkgcG9zaXRpb24gKiBsYXllcilcbiAgICAgICAgKiBAcGFyYW0gdGlsZSAtIFRoZSBlbnRpdHkgdGhhdCBzaG91bGQgYmUgcG9zaXRpb24gaW4gdGhlIGlzb21ldHJpYyBmYXNoaW9uXG4gICAgICAgICogXG4gICAgICAgICogVXNlIHRoaXMgbWV0aG9kIHRvIHBsYWNlIGFuIGVudGl0eSBpbiBhbiBpc29tZXRyaWMgZ3JpZC5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuZGlhbW9uZElzby5pbml0KDY0LDEyOCwyMCwyMCk7XG4gICAgICAgICogaXNvcy5wbGFjZShDcmFmdHkuZSgnMkQsIERPTSwgQ29sb3InKS5jb2xvcigncmVkJykuYXR0cih7dzoxMjgsIGg6MTI4fSksMSwxLDIpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmRpYW1vbmRJc28uc2l6ZVxuICAgICAgICAqL1xuICAgICAgICBwbGFjZTpmdW5jdGlvbihvYmoseCx5LGxheWVyKXtcbiAgICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBvczJweCh4LHkpO1xuICAgICAgICAgICAgaWYoIWxheWVyKSBsYXllciA9IDE7XG4gICAgICAgICAgICB2YXIgbWFyZ2luWCA9IDAsbWFyZ2luWSA9IDA7XG4gICAgICAgICAgICBpZihvYmouX19tYXJnaW4gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgbWFyZ2luWCA9IG9iai5fX21hcmdpblswXTtcbiAgICAgICAgICAgICAgICBtYXJnaW5ZID0gb2JqLl9fbWFyZ2luWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgICAgb2JqLnggPSBwb3MubGVmdCsobWFyZ2luWCk7XG4gICAgICAgICAgICBvYmoueSA9IChwb3MudG9wK21hcmdpblkpLW9iai5oO1xuICAgICAgICAgICAgb2JqLnogPSAocG9zLnRvcCkqbGF5ZXI7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIGNlbnRlckF0OmZ1bmN0aW9uKHgseSl7XG4gICAgICAgICAgICB2YXIgcG9zID0gdGhpcy5wb3MycHgoeCx5KTtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54ID0gLXBvcy5sZWZ0K0NyYWZ0eS52aWV3cG9ydC53aWR0aC8yLXRoaXMuX3RpbGUud2lkdGg7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSA9IC1wb3MudG9wK0NyYWZ0eS52aWV3cG9ydC5oZWlnaHQvMjtcbiAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIGFyZWE6ZnVuY3Rpb24ob2Zmc2V0KXtcbiAgICAgICAgICAgIGlmKCFvZmZzZXQpIG9mZnNldCA9IDA7XG4gICAgICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgY29ybmVyc1xuICAgICAgICAgICAgdmFyIHZwID0gQ3JhZnR5LnZpZXdwb3J0LnJlY3QoKTtcbiAgICAgICAgICAgIHZhciBvdyA9IG9mZnNldCp0aGlzLl90aWxlLndpZHRoO1xuICAgICAgICAgICAgdmFyIG9oID0gb2Zmc2V0KnRoaXMuX3RpbGUuaGVpZ2h0O1xuICAgICAgICAgICAgdnAuX3ggLT0gKHRoaXMuX3RpbGUud2lkdGgvMitvdyk7XG4gICAgICAgICAgICB2cC5feSAtPSAodGhpcy5fdGlsZS5oZWlnaHQvMitvaCk7XG4gICAgICAgICAgICB2cC5fdyArPSAodGhpcy5fdGlsZS53aWR0aC8yK293KTtcbiAgICAgICAgICAgIHZwLl9oICs9ICh0aGlzLl90aWxlLmhlaWdodC8yK29oKTsgXG4gICAgICAgICAgICAvKiAgQ3JhZnR5LnZpZXdwb3J0LnggPSAtdnAuX3g7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSA9IC12cC5feTsgICAgXG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQud2lkdGggPSB2cC5fdztcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQgPSB2cC5faDsgICAqL1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZ3JpZCA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciB5ID0gdnAuX3kseWwgPSAodnAuX3krdnAuX2gpO3k8eWw7eSs9dGhpcy5fdGlsZS5oZWlnaHQvMil7XG4gICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gdnAuX3gseGwgPSAodnAuX3grdnAuX3cpO3g8eGw7eCs9dGhpcy5fdGlsZS53aWR0aC8yKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJvdyA9IHRoaXMucHgycG9zKHgseSk7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQucHVzaChbfn5yb3cueCx+fnJvdy55XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGdyaWQ7ICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBwb3MycHg6ZnVuY3Rpb24oeCx5KXtcbiAgICAgICAgICAgIHJldHVybntcbiAgICAgICAgICAgICAgICBsZWZ0OigoeC15KSp0aGlzLl90aWxlLndpZHRoLzIrdGhpcy5fb3JpZ2luLngpLFxuICAgICAgICAgICAgICAgIHRvcDooKHgreSkqdGhpcy5fdGlsZS5oZWlnaHQvMilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcHgycG9zOmZ1bmN0aW9uKGxlZnQsdG9wKXtcbiAgICAgICAgICAgIHZhciB4ID0gKGxlZnQgLSB0aGlzLl9vcmlnaW4ueCkvdGhpcy5fdGlsZS5yO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB4OigodG9wK3gpIC8gdGhpcy5fdGlsZS5oZWlnaHQpLFxuICAgICAgICAgICAgICAgIHk6KCh0b3AteCkgLyB0aGlzLl90aWxlLmhlaWdodClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIHBvbHlnb246ZnVuY3Rpb24ob2JqKXtcbiAgICAgXG4gICAgICAgICAgICBvYmoucmVxdWlyZXMoXCJDb2xsaXNpb25cIik7XG4gICAgICAgICAgICB2YXIgbWFyZ2luWCA9IDAsbWFyZ2luWSA9IDA7XG4gICAgICAgICAgICBpZihvYmouX19tYXJnaW4gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgbWFyZ2luWCA9IG9iai5fX21hcmdpblswXTtcbiAgICAgICAgICAgICAgICBtYXJnaW5ZID0gb2JqLl9fbWFyZ2luWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHBvaW50cyA9IFtcbiAgICAgICAgICAgIFttYXJnaW5YLTAsb2JqLmgtbWFyZ2luWS10aGlzLl90aWxlLmhlaWdodC8yXSxcbiAgICAgICAgICAgIFttYXJnaW5YLXRoaXMuX3RpbGUud2lkdGgvMixvYmouaC1tYXJnaW5ZLTBdLFxuICAgICAgICAgICAgW21hcmdpblgtdGhpcy5fdGlsZS53aWR0aCxvYmouaC1tYXJnaW5ZLXRoaXMuX3RpbGUuaGVpZ2h0LzJdLFxuICAgICAgICAgICAgW21hcmdpblgtdGhpcy5fdGlsZS53aWR0aC8yLG9iai5oLW1hcmdpblktdGhpcy5fdGlsZS5oZWlnaHRdXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24ocG9pbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBwb2x5O1xuICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgIFxuICAgIH1cbn0pO1xuXG5cbi8qKkBcbiogI1BhcnRpY2xlc1xuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQmFzZWQgb24gUGFyY3ljbGUgYnkgTXIuIFNwZWFrZXIsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQsIFBvcnRlZCBieSBMZW8gS29wcGVsa2FtbVxuKiAqKlRoaXMgaXMgY2FudmFzIG9ubHkgJiB3b24ndCBkbyBhbnl0aGluZyBpZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgaXQhKipcbiogVG8gc2VlIGhvdyB0aGlzIHdvcmtzIHRha2UgYSBsb29rIGluIGh0dHBzOi8vZ2l0aHViLmNvbS9jcmFmdHlqcy9DcmFmdHkvYmxvYi9tYXN0ZXIvc3JjL3BhcnRpY2xlcy5qc1xuKi9cbkNyYWZ0eS5jKFwiUGFydGljbGVzXCIsIHtcblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdC8vV2UgbmVlZCB0byBjbG9uZSBpdFxuXHRcdHRoaXMuX1BhcnRpY2xlcyA9IENyYWZ0eS5jbG9uZSh0aGlzLl9QYXJ0aWNsZXMpO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAqICMucGFydGljbGVzXG4gICAgKiBAY29tcCBQYXJ0aWNsZXNcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5wYXJ0aWNsZXMoT2JqZWN0IG9wdGlvbnMpXG4gICAgKiBAcGFyYW0gb3B0aW9ucyAtIE1hcCBvZiBvcHRpb25zIHRoYXQgc3BlY2lmeSB0aGUgYmVoYXZpb3IgYW5kIGxvb2sgb2YgdGhlIHBhcnRpY2xlcy5cbiAgICAqXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG5cdCogdmFyIG9wdGlvbnMgPSB7XG5cdCpcdG1heFBhcnRpY2xlczogMTUwLFxuXHQqXHRzaXplOiAxOCxcblx0Klx0c2l6ZVJhbmRvbTogNCxcblx0Klx0c3BlZWQ6IDEsXG5cdCpcdHNwZWVkUmFuZG9tOiAxLjIsXG5cdCpcdC8vIExpZmVzcGFuIGluIGZyYW1lc1xuXHQqXHRsaWZlU3BhbjogMjksXG5cdCpcdGxpZmVTcGFuUmFuZG9tOiA3LFxuXHQqXHQvLyBBbmdsZSBpcyBjYWxjdWxhdGVkIGNsb2Nrd2lzZTogMTJwbSBpcyAwZGVnLCAzcG0gaXMgOTBkZWcgZXRjLlxuXHQqXHRhbmdsZTogNjUsXG5cdCpcdGFuZ2xlUmFuZG9tOiAzNCxcblx0Klx0c3RhcnRDb2xvdXI6IFsyNTUsIDEzMSwgMCwgMV0sXG5cdCpcdHN0YXJ0Q29sb3VyUmFuZG9tOiBbNDgsIDUwLCA0NSwgMF0sXG5cdCpcdGVuZENvbG91cjogWzI0NSwgMzUsIDAsIDBdLFxuXHQqXHRlbmRDb2xvdXJSYW5kb206IFs2MCwgNjAsIDYwLCAwXSxcblx0Klx0Ly8gT25seSBhcHBsaWVzIHdoZW4gZmFzdE1vZGUgaXMgb2ZmLCBzcGVjaWZpZXMgaG93IHNoYXJwIHRoZSBncmFkaWVudHMgYXJlIGRyYXduXG5cdCpcdHNoYXJwbmVzczogMjAsXG5cdCpcdHNoYXJwbmVzc1JhbmRvbTogMTAsXG5cdCpcdC8vIFJhbmRvbSBzcHJlYWQgZnJvbSBvcmlnaW5cblx0Klx0c3ByZWFkOiAxMCxcblx0Klx0Ly8gSG93IG1hbnkgZnJhbWVzIHNob3VsZCB0aGlzIGxhc3Rcblx0Klx0ZHVyYXRpb246IC0xLFxuXHQqXHQvLyBXaWxsIGRyYXcgc3F1YXJlcyBpbnN0ZWFkIG9mIGNpcmNsZSBncmFkaWVudHNcblx0Klx0ZmFzdE1vZGU6IGZhbHNlLFxuXHQqXHRncmF2aXR5OiB7IHg6IDAsIHk6IDAuMSB9LFxuXHQqXHQvLyBzZW5zaWJsZSB2YWx1ZXMgYXJlIDAtM1xuXHQqXHRqaXR0ZXI6IDBcblx0KiB9XG5cdCpcblx0KiBDcmFmdHkuZShcIjJELENhbnZhcyxQYXJ0aWNsZXNcIikucGFydGljbGVzKG9wdGlvbnMpO1xuICAgICogfn5+XG4gICAgKi9cblx0cGFydGljbGVzOiBmdW5jdGlvbiAob3B0aW9ucykge1xuXG5cdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5jYW52YXMgfHwgQ3JhZnR5LmRlYWN0aXZhdGVQYXJ0aWNsZXMpIHJldHVybiB0aGlzO1xuXG5cdFx0Ly9JZiB3ZSBkcmV3IG9uIHRoZSBtYWluIGNhbnZhcywgd2UnZCBoYXZlIHRvIHJlZHJhd1xuXHRcdC8vcG90ZW50aWFsbHkgaHVnZSBzZWN0aW9ucyBvZiB0aGUgc2NyZWVuIGV2ZXJ5IGZyYW1lXG5cdFx0Ly9TbyB3ZSBjcmVhdGUgYSBzZXBhcmF0ZSBjYW52YXMsIHdoZXJlIHdlIG9ubHkgaGF2ZSB0byByZWRyYXdcblx0XHQvL3RoZSBjaGFuZ2VkIHBhcnRpY2xlcy5cblx0XHR2YXIgYywgY3R4LCByZWxhdGl2ZVgsIHJlbGF0aXZlWSwgYm91bmRpbmc7XG5cblx0XHRjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHRjLndpZHRoID0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoO1xuXHRcdGMuaGVpZ2h0ID0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblx0XHRjLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblxuXHRcdENyYWZ0eS5zdGFnZS5lbGVtLmFwcGVuZENoaWxkKGMpO1xuXG5cdFx0Y3R4ID0gYy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdFx0dGhpcy5fUGFydGljbGVzLmluaXQob3B0aW9ucyk7XG5cblx0XHQvLyBDbGVhbiB1cCB0aGUgRE9NIHdoZW4gdGhpcyBjb21wb25lbnQgaXMgcmVtb3ZlZFxuXHRcdHRoaXMuYmluZCgnUmVtb3ZlJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0ucmVtb3ZlQ2hpbGQoYyk7XG5cdFx0fSkuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdGlmIChpZCA9PT0gXCJwYXJ0aWNsZXNcIilcblx0XHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0ucmVtb3ZlQ2hpbGQoYyk7XG5cdFx0fSk7O1xuXG5cdFx0cmVsYXRpdmVYID0gdGhpcy54ICsgQ3JhZnR5LnZpZXdwb3J0Lng7XG5cdFx0cmVsYXRpdmVZID0gdGhpcy55ICsgQ3JhZnR5LnZpZXdwb3J0Lnk7XG5cdFx0dGhpcy5fUGFydGljbGVzLnBvc2l0aW9uID0gdGhpcy5fUGFydGljbGVzLnZlY3RvckhlbHBlcnMuY3JlYXRlKHJlbGF0aXZlWCwgcmVsYXRpdmVZKTtcblxuXHRcdHZhciBvbGRWaWV3cG9ydCA9IHsgeDogQ3JhZnR5LnZpZXdwb3J0LngsIHk6IENyYWZ0eS52aWV3cG9ydC55IH07XG5cblx0XHR0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZWxhdGl2ZVggPSB0aGlzLnggKyBDcmFmdHkudmlld3BvcnQueDtcblx0XHRcdHJlbGF0aXZlWSA9IHRoaXMueSArIENyYWZ0eS52aWV3cG9ydC55O1xuXHRcdFx0dGhpcy5fUGFydGljbGVzLnZpZXdwb3J0RGVsdGEgPSB7IHg6IENyYWZ0eS52aWV3cG9ydC54IC0gb2xkVmlld3BvcnQueCwgeTogQ3JhZnR5LnZpZXdwb3J0LnkgLSBvbGRWaWV3cG9ydC55IH07XG5cblx0XHRcdG9sZFZpZXdwb3J0ID0geyB4OiBDcmFmdHkudmlld3BvcnQueCwgeTogQ3JhZnR5LnZpZXdwb3J0LnkgfTtcblxuXHRcdFx0dGhpcy5fUGFydGljbGVzLnBvc2l0aW9uID0gdGhpcy5fUGFydGljbGVzLnZlY3RvckhlbHBlcnMuY3JlYXRlKHJlbGF0aXZlWCwgcmVsYXRpdmVZKTtcblxuXHRcdFx0Ly9TZWxlY3RpdmUgY2xlYXJpbmdcblx0XHRcdGlmICh0eXBlb2YgQ3JhZnR5LkRyYXdNYW5hZ2VyLmJvdW5kaW5nUmVjdCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGJvdW5kaW5nID0gQ3JhZnR5LkRyYXdNYW5hZ2VyLmJvdW5kaW5nUmVjdCh0aGlzLl9QYXJ0aWNsZXMucmVnaXN0ZXIpO1xuXHRcdFx0XHRpZiAoYm91bmRpbmcpIGN0eC5jbGVhclJlY3QoYm91bmRpbmcuX3gsIGJvdW5kaW5nLl95LCBib3VuZGluZy5fdywgYm91bmRpbmcuX2gpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y3R4LmNsZWFyUmVjdCgwLCAwLCBDcmFmdHkudmlld3BvcnQud2lkdGgsIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpO1xuXHRcdFx0fVxuXG5cdFx0XHQvL1RoaXMgdXBkYXRlcyBhbGwgcGFydGljbGUgY29sb3JzICYgcG9zaXRpb25zXG5cdFx0XHR0aGlzLl9QYXJ0aWNsZXMudXBkYXRlKCk7XG5cblx0XHRcdC8vVGhpcyByZW5kZXJzIHRoZSB1cGRhdGVkIHBhcnRpY2xlc1xuXHRcdFx0dGhpcy5fUGFydGljbGVzLnJlbmRlcihjdHgpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRfUGFydGljbGVzOiB7XG5cdFx0cHJlc2V0czoge1xuXHRcdFx0bWF4UGFydGljbGVzOiAxNTAsXG5cdFx0XHRzaXplOiAxOCxcblx0XHRcdHNpemVSYW5kb206IDQsXG5cdFx0XHRzcGVlZDogMSxcblx0XHRcdHNwZWVkUmFuZG9tOiAxLjIsXG5cdFx0XHQvLyBMaWZlc3BhbiBpbiBmcmFtZXNcblx0XHRcdGxpZmVTcGFuOiAyOSxcblx0XHRcdGxpZmVTcGFuUmFuZG9tOiA3LFxuXHRcdFx0Ly8gQW5nbGUgaXMgY2FsY3VsYXRlZCBjbG9ja3dpc2U6IDEycG0gaXMgMGRlZywgM3BtIGlzIDkwZGVnIGV0Yy5cblx0XHRcdGFuZ2xlOiA2NSxcblx0XHRcdGFuZ2xlUmFuZG9tOiAzNCxcblx0XHRcdHN0YXJ0Q29sb3VyOiBbMjU1LCAxMzEsIDAsIDFdLFxuXHRcdFx0c3RhcnRDb2xvdXJSYW5kb206IFs0OCwgNTAsIDQ1LCAwXSxcblx0XHRcdGVuZENvbG91cjogWzI0NSwgMzUsIDAsIDBdLFxuXHRcdFx0ZW5kQ29sb3VyUmFuZG9tOiBbNjAsIDYwLCA2MCwgMF0sXG5cdFx0XHQvLyBPbmx5IGFwcGxpZXMgd2hlbiBmYXN0TW9kZSBpcyBvZmYsIHNwZWNpZmllcyBob3cgc2hhcnAgdGhlIGdyYWRpZW50cyBhcmUgZHJhd25cblx0XHRcdHNoYXJwbmVzczogMjAsXG5cdFx0XHRzaGFycG5lc3NSYW5kb206IDEwLFxuXHRcdFx0Ly8gUmFuZG9tIHNwcmVhZCBmcm9tIG9yaWdpblxuXHRcdFx0c3ByZWFkOiAxMCxcblx0XHRcdC8vIEhvdyBtYW55IGZyYW1lcyBzaG91bGQgdGhpcyBsYXN0XG5cdFx0XHRkdXJhdGlvbjogLTEsXG5cdFx0XHQvLyBXaWxsIGRyYXcgc3F1YXJlcyBpbnN0ZWFkIG9mIGNpcmNsZSBncmFkaWVudHNcblx0XHRcdGZhc3RNb2RlOiBmYWxzZSxcblx0XHRcdGdyYXZpdHk6IHsgeDogMCwgeTogMC4xIH0sXG5cdFx0XHQvLyBzZW5zaWJsZSB2YWx1ZXMgYXJlIDAtM1xuXHRcdFx0aml0dGVyOiAwLFxuXG5cdFx0XHQvL0Rvbid0IG1vZGlmeSB0aGUgZm9sbG93aW5nXG5cdFx0XHRwYXJ0aWNsZXM6IFtdLFxuXHRcdFx0YWN0aXZlOiB0cnVlLFxuXHRcdFx0cGFydGljbGVDb3VudDogMCxcblx0XHRcdGVsYXBzZWRGcmFtZXM6IDAsXG5cdFx0XHRlbWlzc2lvblJhdGU6IDAsXG5cdFx0XHRlbWl0Q291bnRlcjogMCxcblx0XHRcdHBhcnRpY2xlSW5kZXg6IDBcblx0XHR9LFxuXG5cblx0XHRpbml0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdFx0dGhpcy5wb3NpdGlvbiA9IHRoaXMudmVjdG9ySGVscGVycy5jcmVhdGUoMCwgMCk7XG5cdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMgPT0gJ3VuZGVmaW5lZCcpIHZhciBvcHRpb25zID0ge307XG5cblx0XHRcdC8vQ3JlYXRlIGN1cnJlbnQgY29uZmlnIGJ5IG1lcmdpbmcgZ2l2ZW4gb3B0aW9ucyBhbmQgcHJlc2V0cy5cblx0XHRcdGZvciAoa2V5IGluIHRoaXMucHJlc2V0cykge1xuXHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnNba2V5XSAhPSAndW5kZWZpbmVkJykgdGhpc1trZXldID0gb3B0aW9uc1trZXldO1xuXHRcdFx0XHRlbHNlIHRoaXNba2V5XSA9IHRoaXMucHJlc2V0c1trZXldO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmVtaXNzaW9uUmF0ZSA9IHRoaXMubWF4UGFydGljbGVzIC8gdGhpcy5saWZlU3Bhbjtcblx0XHRcdHRoaXMucG9zaXRpb25SYW5kb20gPSB0aGlzLnZlY3RvckhlbHBlcnMuY3JlYXRlKHRoaXMuc3ByZWFkLCB0aGlzLnNwcmVhZCk7XG5cdFx0fSxcblxuXHRcdGFkZFBhcnRpY2xlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5wYXJ0aWNsZUNvdW50ID09IHRoaXMubWF4UGFydGljbGVzKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVGFrZSB0aGUgbmV4dCBwYXJ0aWNsZSBvdXQgb2YgdGhlIHBhcnRpY2xlIHBvb2wgd2UgaGF2ZSBjcmVhdGVkIGFuZCBpbml0aWFsaXplIGl0XG5cdFx0XHR2YXIgcGFydGljbGUgPSBuZXcgdGhpcy5wYXJ0aWNsZSh0aGlzLnZlY3RvckhlbHBlcnMpO1xuXHRcdFx0dGhpcy5pbml0UGFydGljbGUocGFydGljbGUpO1xuXHRcdFx0dGhpcy5wYXJ0aWNsZXNbdGhpcy5wYXJ0aWNsZUNvdW50XSA9IHBhcnRpY2xlO1xuXHRcdFx0Ly8gSW5jcmVtZW50IHRoZSBwYXJ0aWNsZSBjb3VudFxuXHRcdFx0dGhpcy5wYXJ0aWNsZUNvdW50Kys7XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cdFx0UkFORE0xVE8xOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuXHRcdH0sXG5cdFx0aW5pdFBhcnRpY2xlOiBmdW5jdGlvbiAocGFydGljbGUpIHtcblx0XHRcdHBhcnRpY2xlLnBvc2l0aW9uLnggPSB0aGlzLnBvc2l0aW9uLnggKyB0aGlzLnBvc2l0aW9uUmFuZG9tLnggKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0cGFydGljbGUucG9zaXRpb24ueSA9IHRoaXMucG9zaXRpb24ueSArIHRoaXMucG9zaXRpb25SYW5kb20ueSAqIHRoaXMuUkFORE0xVE8xKCk7XG5cblx0XHRcdHZhciBuZXdBbmdsZSA9ICh0aGlzLmFuZ2xlICsgdGhpcy5hbmdsZVJhbmRvbSAqIHRoaXMuUkFORE0xVE8xKCkpICogKE1hdGguUEkgLyAxODApOyAvLyBjb252ZXJ0IHRvIHJhZGlhbnNcblx0XHRcdHZhciB2ZWN0b3IgPSB0aGlzLnZlY3RvckhlbHBlcnMuY3JlYXRlKE1hdGguc2luKG5ld0FuZ2xlKSwgLU1hdGguY29zKG5ld0FuZ2xlKSk7IC8vIENvdWxkIG1vdmUgdG8gbG9va3VwIGZvciBzcGVlZFxuXHRcdFx0dmFyIHZlY3RvclNwZWVkID0gdGhpcy5zcGVlZCArIHRoaXMuc3BlZWRSYW5kb20gKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0cGFydGljbGUuZGlyZWN0aW9uID0gdGhpcy52ZWN0b3JIZWxwZXJzLm11bHRpcGx5KHZlY3RvciwgdmVjdG9yU3BlZWQpO1xuXG5cdFx0XHRwYXJ0aWNsZS5zaXplID0gdGhpcy5zaXplICsgdGhpcy5zaXplUmFuZG9tICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdHBhcnRpY2xlLnNpemUgPSBwYXJ0aWNsZS5zaXplIDwgMCA/IDAgOiB+fnBhcnRpY2xlLnNpemU7XG5cdFx0XHRwYXJ0aWNsZS50aW1lVG9MaXZlID0gdGhpcy5saWZlU3BhbiArIHRoaXMubGlmZVNwYW5SYW5kb20gKiB0aGlzLlJBTkRNMVRPMSgpO1xuXG5cdFx0XHRwYXJ0aWNsZS5zaGFycG5lc3MgPSB0aGlzLnNoYXJwbmVzcyArIHRoaXMuc2hhcnBuZXNzUmFuZG9tICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdHBhcnRpY2xlLnNoYXJwbmVzcyA9IHBhcnRpY2xlLnNoYXJwbmVzcyA+IDEwMCA/IDEwMCA6IHBhcnRpY2xlLnNoYXJwbmVzcyA8IDAgPyAwIDogcGFydGljbGUuc2hhcnBuZXNzO1xuXHRcdFx0Ly8gaW50ZXJuYWwgY2lyY2xlIGdyYWRpZW50IHNpemUgLSBhZmZlY3RzIHRoZSBzaGFycG5lc3Mgb2YgdGhlIHJhZGlhbCBncmFkaWVudFxuXHRcdFx0cGFydGljbGUuc2l6ZVNtYWxsID0gfn4oKHBhcnRpY2xlLnNpemUgLyAyMDApICogcGFydGljbGUuc2hhcnBuZXNzKTsgLy8oc2l6ZS8yLzEwMClcblx0XHRcdHZhciBzdGFydCA9IFtcblx0XHRcdFx0dGhpcy5zdGFydENvbG91clswXSArIHRoaXMuc3RhcnRDb2xvdXJSYW5kb21bMF0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLnN0YXJ0Q29sb3VyWzFdICsgdGhpcy5zdGFydENvbG91clJhbmRvbVsxXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuc3RhcnRDb2xvdXJbMl0gKyB0aGlzLnN0YXJ0Q29sb3VyUmFuZG9tWzJdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5zdGFydENvbG91clszXSArIHRoaXMuc3RhcnRDb2xvdXJSYW5kb21bM10gKiB0aGlzLlJBTkRNMVRPMSgpXG5cdFx0XHRcdF07XG5cblx0XHRcdHZhciBlbmQgPSBbXG5cdFx0XHRcdHRoaXMuZW5kQ29sb3VyWzBdICsgdGhpcy5lbmRDb2xvdXJSYW5kb21bMF0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLmVuZENvbG91clsxXSArIHRoaXMuZW5kQ29sb3VyUmFuZG9tWzFdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5lbmRDb2xvdXJbMl0gKyB0aGlzLmVuZENvbG91clJhbmRvbVsyXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuZW5kQ29sb3VyWzNdICsgdGhpcy5lbmRDb2xvdXJSYW5kb21bM10gKiB0aGlzLlJBTkRNMVRPMSgpXG5cdFx0XHRcdF07XG5cblx0XHRcdHBhcnRpY2xlLmNvbG91ciA9IHN0YXJ0O1xuXHRcdFx0cGFydGljbGUuZGVsdGFDb2xvdXJbMF0gPSAoZW5kWzBdIC0gc3RhcnRbMF0pIC8gcGFydGljbGUudGltZVRvTGl2ZTtcblx0XHRcdHBhcnRpY2xlLmRlbHRhQ29sb3VyWzFdID0gKGVuZFsxXSAtIHN0YXJ0WzFdKSAvIHBhcnRpY2xlLnRpbWVUb0xpdmU7XG5cdFx0XHRwYXJ0aWNsZS5kZWx0YUNvbG91clsyXSA9IChlbmRbMl0gLSBzdGFydFsyXSkgLyBwYXJ0aWNsZS50aW1lVG9MaXZlO1xuXHRcdFx0cGFydGljbGUuZGVsdGFDb2xvdXJbM10gPSAoZW5kWzNdIC0gc3RhcnRbM10pIC8gcGFydGljbGUudGltZVRvTGl2ZTtcblx0XHR9LFxuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMuYWN0aXZlICYmIHRoaXMuZW1pc3Npb25SYXRlID4gMCkge1xuXHRcdFx0XHR2YXIgcmF0ZSA9IDEgLyB0aGlzLmVtaXNzaW9uUmF0ZTtcblx0XHRcdFx0dGhpcy5lbWl0Q291bnRlcisrO1xuXHRcdFx0XHR3aGlsZSAodGhpcy5wYXJ0aWNsZUNvdW50IDwgdGhpcy5tYXhQYXJ0aWNsZXMgJiYgdGhpcy5lbWl0Q291bnRlciA+IHJhdGUpIHtcblx0XHRcdFx0XHR0aGlzLmFkZFBhcnRpY2xlKCk7XG5cdFx0XHRcdFx0dGhpcy5lbWl0Q291bnRlciAtPSByYXRlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuZWxhcHNlZEZyYW1lcysrO1xuXHRcdFx0XHRpZiAodGhpcy5kdXJhdGlvbiAhPSAtMSAmJiB0aGlzLmR1cmF0aW9uIDwgdGhpcy5lbGFwc2VkRnJhbWVzKSB7XG5cdFx0XHRcdFx0dGhpcy5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5wYXJ0aWNsZUluZGV4ID0gMDtcblx0XHRcdHRoaXMucmVnaXN0ZXIgPSBbXTtcblx0XHRcdHZhciBkcmF3O1xuXHRcdFx0d2hpbGUgKHRoaXMucGFydGljbGVJbmRleCA8IHRoaXMucGFydGljbGVDb3VudCkge1xuXG5cdFx0XHRcdHZhciBjdXJyZW50UGFydGljbGUgPSB0aGlzLnBhcnRpY2xlc1t0aGlzLnBhcnRpY2xlSW5kZXhdO1xuXG5cdFx0XHRcdC8vIElmIHRoZSBjdXJyZW50IHBhcnRpY2xlIGlzIGFsaXZlIHRoZW4gdXBkYXRlIGl0XG5cdFx0XHRcdGlmIChjdXJyZW50UGFydGljbGUudGltZVRvTGl2ZSA+IDApIHtcblxuXHRcdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgbmV3IGRpcmVjdGlvbiBiYXNlZCBvbiBncmF2aXR5XG5cdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLmRpcmVjdGlvbiA9IHRoaXMudmVjdG9ySGVscGVycy5hZGQoY3VycmVudFBhcnRpY2xlLmRpcmVjdGlvbiwgdGhpcy5ncmF2aXR5KTtcblx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUucG9zaXRpb24gPSB0aGlzLnZlY3RvckhlbHBlcnMuYWRkKGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbiwgY3VycmVudFBhcnRpY2xlLmRpcmVjdGlvbik7XG5cdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uID0gdGhpcy52ZWN0b3JIZWxwZXJzLmFkZChjdXJyZW50UGFydGljbGUucG9zaXRpb24sIHRoaXMudmlld3BvcnREZWx0YSk7XG5cdFx0XHRcdFx0aWYgKHRoaXMuaml0dGVyKSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUucG9zaXRpb24ueCArPSB0aGlzLmppdHRlciAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUucG9zaXRpb24ueSArPSB0aGlzLmppdHRlciAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS50aW1lVG9MaXZlLS07XG5cblx0XHRcdFx0XHQvLyBVcGRhdGUgY29sb3Vyc1xuXHRcdFx0XHRcdHZhciByID0gY3VycmVudFBhcnRpY2xlLmNvbG91clswXSArPSBjdXJyZW50UGFydGljbGUuZGVsdGFDb2xvdXJbMF07XG5cdFx0XHRcdFx0dmFyIGcgPSBjdXJyZW50UGFydGljbGUuY29sb3VyWzFdICs9IGN1cnJlbnRQYXJ0aWNsZS5kZWx0YUNvbG91clsxXTtcblx0XHRcdFx0XHR2YXIgYiA9IGN1cnJlbnRQYXJ0aWNsZS5jb2xvdXJbMl0gKz0gY3VycmVudFBhcnRpY2xlLmRlbHRhQ29sb3VyWzJdO1xuXHRcdFx0XHRcdHZhciBhID0gY3VycmVudFBhcnRpY2xlLmNvbG91clszXSArPSBjdXJyZW50UGFydGljbGUuZGVsdGFDb2xvdXJbM107XG5cblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIHJnYmEgc3RyaW5nIHRvIGRyYXcuXG5cdFx0XHRcdFx0ZHJhdyA9IFtdO1xuXHRcdFx0XHRcdGRyYXcucHVzaChcInJnYmEoXCIgKyAociA+IDI1NSA/IDI1NSA6IHIgPCAwID8gMCA6IH5+cikpO1xuXHRcdFx0XHRcdGRyYXcucHVzaChnID4gMjU1ID8gMjU1IDogZyA8IDAgPyAwIDogfn5nKTtcblx0XHRcdFx0XHRkcmF3LnB1c2goYiA+IDI1NSA/IDI1NSA6IGIgPCAwID8gMCA6IH5+Yik7XG5cdFx0XHRcdFx0ZHJhdy5wdXNoKChhID4gMSA/IDEgOiBhIDwgMCA/IDAgOiBhLnRvRml4ZWQoMikpICsgXCIpXCIpO1xuXHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5kcmF3Q29sb3VyID0gZHJhdy5qb2luKFwiLFwiKTtcblxuXHRcdFx0XHRcdGlmICghdGhpcy5mYXN0TW9kZSkge1xuXHRcdFx0XHRcdFx0ZHJhd1szXSA9IFwiMClcIjtcblx0XHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5kcmF3Q29sb3VyRW5kID0gZHJhdy5qb2luKFwiLFwiKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGlzLnBhcnRpY2xlSW5kZXgrKztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBSZXBsYWNlIHBhcnRpY2xlIHdpdGggdGhlIGxhc3QgYWN0aXZlXG5cdFx0XHRcdFx0aWYgKHRoaXMucGFydGljbGVJbmRleCAhPSB0aGlzLnBhcnRpY2xlQ291bnQgLSAxKSB7XG5cdFx0XHRcdFx0XHR0aGlzLnBhcnRpY2xlc1t0aGlzLnBhcnRpY2xlSW5kZXhdID0gdGhpcy5wYXJ0aWNsZXNbdGhpcy5wYXJ0aWNsZUNvdW50IC0gMV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMucGFydGljbGVDb3VudC0tO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciByZWN0ID0ge307XG5cdFx0XHRcdHJlY3QuX3ggPSB+fmN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbi54O1xuXHRcdFx0XHRyZWN0Ll95ID0gfn5jdXJyZW50UGFydGljbGUucG9zaXRpb24ueTtcblx0XHRcdFx0cmVjdC5fdyA9IGN1cnJlbnRQYXJ0aWNsZS5zaXplO1xuXHRcdFx0XHRyZWN0Ll9oID0gY3VycmVudFBhcnRpY2xlLnNpemU7XG5cblx0XHRcdFx0dGhpcy5yZWdpc3Rlci5wdXNoKHJlY3QpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0dGhpcy5lbGFwc2VkRnJhbWVzID0gMDtcblx0XHRcdHRoaXMuZW1pdENvdW50ZXIgPSAwO1xuXHRcdH0sXG5cblx0XHRyZW5kZXI6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwLCBqID0gdGhpcy5wYXJ0aWNsZUNvdW50OyBpIDwgajsgaSsrKSB7XG5cdFx0XHRcdHZhciBwYXJ0aWNsZSA9IHRoaXMucGFydGljbGVzW2ldO1xuXHRcdFx0XHR2YXIgc2l6ZSA9IHBhcnRpY2xlLnNpemU7XG5cdFx0XHRcdHZhciBoYWxmU2l6ZSA9IHNpemUgPj4gMTtcblxuXHRcdFx0XHRpZiAocGFydGljbGUucG9zaXRpb24ueCArIHNpemUgPCAwXG5cdFx0XHRcdFx0fHwgcGFydGljbGUucG9zaXRpb24ueSArIHNpemUgPCAwXG5cdFx0XHRcdFx0fHwgcGFydGljbGUucG9zaXRpb24ueCAtIHNpemUgPiBDcmFmdHkudmlld3BvcnQud2lkdGhcblx0XHRcdFx0XHR8fCBwYXJ0aWNsZS5wb3NpdGlvbi55IC0gc2l6ZSA+IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpIHtcblx0XHRcdFx0XHQvL1BhcnRpY2xlIGlzIG91dHNpZGVcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgeCA9IH5+cGFydGljbGUucG9zaXRpb24ueDtcblx0XHRcdFx0dmFyIHkgPSB+fnBhcnRpY2xlLnBvc2l0aW9uLnk7XG5cblx0XHRcdFx0aWYgKHRoaXMuZmFzdE1vZGUpIHtcblx0XHRcdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IHBhcnRpY2xlLmRyYXdDb2xvdXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHJhZGdyYWQgPSBjb250ZXh0LmNyZWF0ZVJhZGlhbEdyYWRpZW50KHggKyBoYWxmU2l6ZSwgeSArIGhhbGZTaXplLCBwYXJ0aWNsZS5zaXplU21hbGwsIHggKyBoYWxmU2l6ZSwgeSArIGhhbGZTaXplLCBoYWxmU2l6ZSk7XG5cdFx0XHRcdFx0cmFkZ3JhZC5hZGRDb2xvclN0b3AoMCwgcGFydGljbGUuZHJhd0NvbG91cik7XG5cdFx0XHRcdFx0Ly8wLjkgdG8gYXZvaWQgdmlzaWJsZSBib3hpbmdcblx0XHRcdFx0XHRyYWRncmFkLmFkZENvbG9yU3RvcCgwLjksIHBhcnRpY2xlLmRyYXdDb2xvdXJFbmQpO1xuXHRcdFx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gcmFkZ3JhZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb250ZXh0LmZpbGxSZWN0KHgsIHksIHNpemUsIHNpemUpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cGFydGljbGU6IGZ1bmN0aW9uICh2ZWN0b3JIZWxwZXJzKSB7XG5cdFx0XHR0aGlzLnBvc2l0aW9uID0gdmVjdG9ySGVscGVycy5jcmVhdGUoMCwgMCk7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9IHZlY3RvckhlbHBlcnMuY3JlYXRlKDAsIDApO1xuXHRcdFx0dGhpcy5zaXplID0gMDtcblx0XHRcdHRoaXMuc2l6ZVNtYWxsID0gMDtcblx0XHRcdHRoaXMudGltZVRvTGl2ZSA9IDA7XG5cdFx0XHR0aGlzLmNvbG91ciA9IFtdO1xuXHRcdFx0dGhpcy5kcmF3Q29sb3VyID0gXCJcIjtcblx0XHRcdHRoaXMuZGVsdGFDb2xvdXIgPSBbXTtcblx0XHRcdHRoaXMuc2hhcnBuZXNzID0gMDtcblx0XHR9LFxuXHRcdHZlY3RvckhlbHBlcnM6IHtcblx0XHRcdGNyZWF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcInhcIjogeCxcblx0XHRcdFx0XHRcInlcIjogeVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblx0XHRcdG11bHRpcGx5OiBmdW5jdGlvbiAodmVjdG9yLCBzY2FsZUZhY3Rvcikge1xuXHRcdFx0XHR2ZWN0b3IueCAqPSBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0dmVjdG9yLnkgKj0gc2NhbGVGYWN0b3I7XG5cdFx0XHRcdHJldHVybiB2ZWN0b3I7XG5cdFx0XHR9LFxuXHRcdFx0YWRkOiBmdW5jdGlvbiAodmVjdG9yMSwgdmVjdG9yMikge1xuXHRcdFx0XHR2ZWN0b3IxLnggKz0gdmVjdG9yMi54O1xuXHRcdFx0XHR2ZWN0b3IxLnkgKz0gdmVjdG9yMi55O1xuXHRcdFx0XHRyZXR1cm4gdmVjdG9yMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuQ3JhZnR5LmV4dGVuZCh7XG5cdC8qKkBcblx0ICogI0NyYWZ0eS5hdWRpb1xuXHQgKiBAY2F0ZWdvcnkgQXVkaW9cblx0ICpcblx0ICogQWRkIHNvdW5kIGZpbGVzIGFuZCBwbGF5IHRoZW0uIENob29zZXMgYmVzdCBmb3JtYXQgZm9yIGJyb3dzZXIgc3VwcG9ydC5cblx0ICogRHVlIHRvIHRoZSBuYXR1cmUgb2YgSFRNTDUgYXVkaW8sIHRocmVlIHR5cGVzIG9mIGF1ZGlvIGZpbGVzIHdpbGwgYmVcblx0ICogcmVxdWlyZWQgZm9yIGNyb3NzLWJyb3dzZXIgY2FwYWJpbGl0aWVzLiBUaGVzZSBmb3JtYXRzIGFyZSBNUDMsIE9nZyBhbmQgV0FWLlxuXHQgKiBXaGVuIHNvdW5kIHdhcyBub3QgbXV0ZWQgb24gYmVmb3JlIHBhdXNlLCBzb3VuZCB3aWxsIGJlIHVubXV0ZWQgYWZ0ZXIgdW5wYXVzZS5cblx0ICogV2hlbiBzb3VuZCBpcyBtdXRlZCBDcmFmdHkucGF1c2UoKSBkb2VzIG5vdCBoYXZlIGFueSBlZmZlY3Qgb24gc291bmQuXG5cdCAqL1xuXHRhdWRpbyA6IHtcblx0XHRzb3VuZHMgOiB7fSxcblx0XHRzdXBwb3J0ZWQgOiB7fSxcblx0XHRjb2RlY3MgOiB7Ly8gQ2hhcnQgZnJvbSBqUGxheWVyXG5cdFx0XHRvZ2cgOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicsIC8vT0dHXG5cdFx0XHR3YXYgOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInLCAvLyBQQ01cblx0XHRcdHdlYm1hIDogJ2F1ZGlvL3dlYm07IGNvZGVjcz1cInZvcmJpc1wiJywgLy8gV0VCTVxuXHRcdFx0bXAzIDogJ2F1ZGlvL21wZWc7IGNvZGVjcz1cIm1wM1wiJywgLy9NUDNcblx0XHRcdG00YSA6ICdhdWRpby9tcDQ7IGNvZGVjcz1cIm1wNGEuNDAuMlwiJy8vIEFBQyAvIE1QNFxuXHRcdH0sXG5cdFx0dm9sdW1lIDogMSwgLy9HbG9iYWwgVm9sdW1lXG5cdFx0bXV0ZWQgOiBmYWxzZSxcblx0XHRwYXVzZWQgOiBmYWxzZSxcblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiB0byBzZXR1cCBzdXBwb3J0ZWQgZm9ybWF0c1xuXHRcdCAqKi9cblx0XHRjYW5QbGF5IDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXVkaW8gPSB0aGlzLmF1ZGlvRWxlbWVudCgpLCBjYW5wbGF5O1xuXHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLmNvZGVjcykge1xuXHRcdFx0XHRjYW5wbGF5ID0gYXVkaW8uY2FuUGxheVR5cGUodGhpcy5jb2RlY3NbaV0pO1xuXHRcdFx0XHRpZiAoY2FucGxheSAhPT0gXCJcIiAmJiBjYW5wbGF5ICE9PSBcIm5vXCIpIHtcblx0XHRcdFx0XHR0aGlzLnN1cHBvcnRlZFtpXSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zdXBwb3J0ZWRbaV0gPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiB0byBnZXQgYW4gQXVkaW8gRWxlbWVudFxuXHRcdCAqKi9cblx0XHRhdWRpb0VsZW1lbnQgOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vSUUgZG9lcyBub3Qgc3VwcG9ydCBBdWRpbyBPYmplY3Rcblx0XHRcdHJldHVybiB0eXBlb2YgQXVkaW8gIT09ICd1bmRlZmluZWQnID8gbmV3IEF1ZGlvKFwiXCIpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLmFkZFxuXHRcdCAqIEBjb21wIENyYWZ0eS5hdWRpb1xuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5hZGQoU3RyaW5nIGlkLCBTdHJpbmcgdXJsKVxuXHRcdCAqIEBwYXJhbSBpZCAtIEEgc3RyaW5nIHRvIHJlZmVyIHRvIHNvdW5kc1xuXHRcdCAqIEBwYXJhbSB1cmwgLSBBIHN0cmluZyBwb2ludGluZyB0byB0aGUgc291bmQgZmlsZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5hZGQoU3RyaW5nIGlkLCBBcnJheSB1cmxzKVxuXHRcdCAqIEBwYXJhbSB1cmxzIC0gQXJyYXkgb2YgdXJscyBwb2ludGluZyB0byBkaWZmZXJlbnQgZm9ybWF0IG9mIHRoZSBzYW1lIHNvdW5kLCBzZWxlY3RpbmcgdGhlIGZpcnN0IHRoYXQgaXMgcGxheWFibGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8uYWRkKE9iamVjdCBtYXApXG5cdFx0ICogQHBhcmFtIG1hcCAtIGtleS12YWx1ZSBwYWlycyB3aGVyZSB0aGUga2V5IGlzIHRoZSBgaWRgIGFuZCB0aGUgdmFsdWUgaXMgZWl0aGVyIGEgYHVybGAgb3IgYHVybHNgXG5cdFx0ICpcblx0XHQgKiBMb2FkcyBhIHNvdW5kIHRvIGJlIHBsYXllZC4gRHVlIHRvIHRoZSBuYXR1cmUgb2YgSFRNTDUgYXVkaW8sXG5cdFx0ICogdGhyZWUgdHlwZXMgb2YgYXVkaW8gZmlsZXMgd2lsbCBiZSByZXF1aXJlZCBmb3IgY3Jvc3MtYnJvd3NlciBjYXBhYmlsaXRpZXMuXG5cdFx0ICogVGhlc2UgZm9ybWF0cyBhcmUgTVAzLCBPZ2cgYW5kIFdBVi5cblx0XHQgKlxuXHRcdCAqIFBhc3NpbmcgYW4gYXJyYXkgb2YgVVJMcyB3aWxsIGRldGVybWluZSB3aGljaCBmb3JtYXQgdGhlIGJyb3dzZXIgY2FuIHBsYXkgYW5kIHNlbGVjdCBpdCBvdmVyIGFueSBvdGhlci5cblx0XHQgKlxuXHRcdCAqIEFjY2VwdHMgYW4gb2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIGF1ZGlvIG5hbWUgYW5kXG5cdFx0ICogZWl0aGVyIGEgVVJMIG9yIGFuIEFycmF5IG9mIFVSTHMgKHRvIGRldGVybWluZSB3aGljaCB0eXBlIHRvIHVzZSkuXG5cdFx0ICpcblx0XHQgKiBUaGUgSUQgeW91IHVzZSB3aWxsIGJlIGhvdyB5b3UgcmVmZXIgdG8gdGhhdCBzb3VuZCB3aGVuIHVzaW5nIGBDcmFmdHkuYXVkaW8ucGxheWAuXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIC8vYWRkaW5nIGF1ZGlvIGZyb20gYW4gb2JqZWN0XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLmFkZCh7XG5cdFx0ICogc2hvb3Q6IFtcInNvdW5kcy9zaG9vdC53YXZcIixcblx0XHQgKiBcInNvdW5kcy9zaG9vdC5tcDNcIixcblx0XHQgKiBcInNvdW5kcy9zaG9vdC5vZ2dcIl0sXG5cdFx0ICpcblx0XHQgKiBjb2luOiBcInNvdW5kcy9jb2luLm1wM1wiXG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiAvL2FkZGluZyBhIHNpbmdsZSBzb3VuZFxuXHRcdCAqIENyYWZ0eS5hdWRpby5hZGQoXCJ3YWxrXCIsIFtcblx0XHQgKiBcInNvdW5kcy93YWxrLm1wM1wiLFxuXHRcdCAqIFwic291bmRzL3dhbGsub2dnXCIsXG5cdFx0ICogXCJzb3VuZHMvd2Fsay53YXZcIlxuXHRcdCAqIF0pO1xuXHRcdCAqXG5cdFx0ICogLy9vbmx5IG9uZSBmb3JtYXRcblx0XHQgKiBDcmFmdHkuYXVkaW8uYWRkKFwianVtcFwiLCBcInNvdW5kcy9qdW1wLm1wM1wiKTtcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHRhZGQgOiBmdW5jdGlvbihpZCwgdXJsKSB7XG5cdFx0XHRDcmFmdHkuc3VwcG9ydC5hdWRpbyA9ICEhdGhpcy5hdWRpb0VsZW1lbnQoKS5jYW5QbGF5VHlwZTtcblx0XHRcdC8vU2V0dXAgYXVkaW8gc3VwcG9ydFxuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbylcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHR0aGlzLmNhblBsYXkoKTtcblx0XHRcdC8vU2V0dXAgc3VwcG9ydGVkIEV4dGVuc2lvbnNcblxuXHRcdFx0dmFyIGF1ZGlvLCBleHQsIHBhdGg7XG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2YgaWQgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSBpbiBpZCkge1xuXHRcdFx0XHRcdGZvciAodmFyIHNyYyBpbiBpZFtpXSkge1xuXHRcdFx0XHRcdFx0YXVkaW8gPSB0aGlzLmF1ZGlvRWxlbWVudCgpO1xuXHRcdFx0XHRcdFx0YXVkaW8uaWQgPSBpO1xuXHRcdFx0XHRcdFx0YXVkaW8ucHJlbG9hZCA9IFwiYXV0b1wiO1xuXHRcdFx0XHRcdFx0YXVkaW8udm9sdW1lID0gQ3JhZnR5LmF1ZGlvLnZvbHVtZTtcblx0XHRcdFx0XHRcdHBhdGggPSBpZFtpXVtzcmNdO1xuXHRcdFx0XHRcdFx0ZXh0ID0gcGF0aC5zdWJzdHIocGF0aC5sYXN0SW5kZXhPZignLicpICsgMSkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRcdGlmICh0aGlzLnN1cHBvcnRlZFtleHRdKSB7XG5cdFx0XHRcdFx0XHRcdGF1ZGlvLnNyYyA9IHBhdGg7XG5cdFx0XHRcdFx0XHRcdENyYWZ0eS5hc3NldChwYXRoLCBhdWRpbyk7XG5cdFx0XHRcdFx0XHRcdHRoaXMuc291bmRzW2ldID0ge1xuXHRcdFx0XHRcdFx0XHRcdG9iaiA6IGF1ZGlvLFxuXHRcdFx0XHRcdFx0XHRcdHBsYXllZCA6IDAsXG5cdFx0XHRcdFx0XHRcdFx0dm9sdW1lIDogQ3JhZnR5LmF1ZGlvLnZvbHVtZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggdHlwZW9mIGlkID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdGF1ZGlvID0gdGhpcy5hdWRpb0VsZW1lbnQoKTtcblx0XHRcdFx0YXVkaW8uaWQgPSBpZDtcblx0XHRcdFx0YXVkaW8ucHJlbG9hZCA9IFwiYXV0b1wiO1xuXHRcdFx0XHRhdWRpby52b2x1bWUgPSBDcmFmdHkuYXVkaW8udm9sdW1lO1xuXG5cdFx0XHRcdGlmICggdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdGV4dCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcuJykgKyAxKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdGlmICh0aGlzLnN1cHBvcnRlZFtleHRdKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5zcmMgPSB1cmw7XG5cdFx0XHRcdFx0XHRDcmFmdHkuYXNzZXQodXJsLCBhdWRpbyk7XG5cdFx0XHRcdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB7XG5cdFx0XHRcdFx0XHRcdG9iaiA6IGF1ZGlvLFxuXHRcdFx0XHRcdFx0XHRwbGF5ZWQgOiAwLFxuXHRcdFx0XHRcdFx0XHR2b2x1bWUgOiBDcmFmdHkuYXVkaW8udm9sdW1lXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggdHlwZW9mIHVybCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRcdGZvciAoc3JjIGluIHVybCkge1xuXHRcdFx0XHRcdFx0YXVkaW8gPSB0aGlzLmF1ZGlvRWxlbWVudCgpO1xuXHRcdFx0XHRcdFx0YXVkaW8uaWQgPSBpZDtcblx0XHRcdFx0XHRcdGF1ZGlvLnByZWxvYWQgPSBcImF1dG9cIjtcblx0XHRcdFx0XHRcdGF1ZGlvLnZvbHVtZSA9IENyYWZ0eS5hdWRpby52b2x1bWU7XG5cdFx0XHRcdFx0XHRwYXRoID0gdXJsW3NyY107XG5cdFx0XHRcdFx0XHRleHQgPSBwYXRoLnN1YnN0cihwYXRoLmxhc3RJbmRleE9mKCcuJykgKyAxKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMuc3VwcG9ydGVkW2V4dF0pIHtcblx0XHRcdFx0XHRcdFx0YXVkaW8uc3JjID0gcGF0aDtcblx0XHRcdFx0XHRcdFx0Q3JhZnR5LmFzc2V0KHBhdGgsIGF1ZGlvKTtcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VuZHNbaWRdID0ge1xuXHRcdFx0XHRcdFx0XHRcdG9iaiA6IGF1ZGlvLFxuXHRcdFx0XHRcdFx0XHRcdHBsYXllZCA6IDAsXG5cdFx0XHRcdFx0XHRcdFx0dm9sdW1lIDogQ3JhZnR5LmF1ZGlvLnZvbHVtZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5wbGF5XG5cdFx0ICogQGNvbXAgQ3JhZnR5LmF1ZGlvXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnBsYXkoU3RyaW5nIGlkKVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5wbGF5KFN0cmluZyBpZCwgTnVtYmVyIHJlcGVhdENvdW50KVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5wbGF5KFN0cmluZyBpZCwgTnVtYmVyIHJlcGVhdENvdW50LE51bWJlciB2b2x1bWUpXG5cdFx0ICogQHBhcmFtIGlkIC0gQSBzdHJpbmcgdG8gcmVmZXIgdG8gc291bmRzXG5cdFx0ICogQHBhcmFtIHJlcGVhdENvdW50IC0gUmVwZWF0IGNvdW50IGZvciB0aGUgZmlsZSwgd2hlcmUgLTEgc3RhbmRzIGZvciByZXBlYXQgZm9yZXZlci5cblx0XHQgKiBAcGFyYW0gdm9sdW1lIC0gdm9sdW1lIGNhbiBiZSBhIG51bWJlciBiZXR3ZWVuIDAuMCBhbmQgMS4wXG5cdFx0ICpcblx0XHQgKiBXaWxsIHBsYXkgYSBzb3VuZCBwcmV2aW91c2x5IGFkZGVkIGJ5IHVzaW5nIHRoZSBJRCB0aGF0IHdhcyB1c2VkIGluIGBDcmFmdHkuYXVkaW8uYWRkYC5cblx0XHQgKiBIYXMgYSBkZWZhdWx0IG1heGltdW0gb2YgNSBjaGFubmVscyBzbyB0aGF0IHRoZSBzYW1lIHNvdW5kIGNhbiBwbGF5IHNpbXVsdGFuZW91c2x5IHVubGVzcyBhbGwgb2YgdGhlIGNoYW5uZWxzIGFyZSBwbGF5aW5nLlxuXG5cdFx0ICogKk5vdGUgdGhhdCB0aGUgaW1wbGVtZW50YXRpb24gb2YgSFRNTDUgQXVkaW8gaXMgYnVnZ3kgYXQgYmVzdC4qXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby5wbGF5KFwid2Fsa1wiKTtcblx0XHQgKlxuXHRcdCAqIC8vcGxheSBhbmQgcmVwZWF0IGZvcmV2ZXJcblx0XHQgKiBDcmFmdHkuYXVkaW8ucGxheShcImJhY2tncm91bmRNdXNpY1wiLCAtMSk7XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnBsYXkoXCJleHBsb3Npb25cIiwxLDAuNSk7IC8vcGxheSBzb3VuZCBvbmNlIHdpdGggdm9sdW1lIG9mIDUwJVxuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdHBsYXkgOiBmdW5jdGlvbihpZCwgcmVwZWF0LCB2b2x1bWUpIHtcblx0XHRcdGlmIChyZXBlYXQgPT0gMCB8fCAhQ3JhZnR5LnN1cHBvcnQuYXVkaW8gfHwgIXRoaXMuc291bmRzW2lkXSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNvdW5kc1tpZF07XG5cdFx0XHRzLnZvbHVtZSA9IHMub2JqLnZvbHVtZSA9IHZvbHVtZSB8fCBDcmFmdHkuYXVkaW8udm9sdW1lO1xuXHRcdFx0aWYgKHMub2JqLmN1cnJlbnRUaW1lKVxuXHRcdFx0XHRzLm9iai5jdXJyZW50VGltZSA9IDA7XG5cdFx0XHRpZiAodGhpcy5tdXRlZClcblx0XHRcdFx0cy5vYmoudm9sdW1lID0gMDtcblx0XHRcdHMub2JqLnBsYXkoKTtcblx0XHRcdHMucGxheWVkKys7XG5cdFx0XHRzLm9iai5hZGRFdmVudExpc3RlbmVyKFwiZW5kZWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChzLnBsYXllZCA8IHJlcGVhdCB8fCByZXBlYXQgPT0gLTEpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5jdXJyZW50VGltZSlcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudFRpbWUgPSAwO1xuXHRcdFx0XHRcdHRoaXMucGxheSgpO1xuXHRcdFx0XHRcdHMucGxheWVkKys7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRydWUpO1xuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8uc3RvcFxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5zdG9wKFtOdW1iZXIgSURdKVxuXHRcdCAqXG5cdFx0ICogU3RvcHMgYW55IHBsYXlpbmcgc291bmQuIGlmIGlkIGlzIG5vdCBzZXQsIHN0b3AgYWxsIHNvdW5kcyB3aGljaCBhcmUgcGxheWluZ1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiAvL2FsbCBzb3VuZHMgc3RvcHBlZCBwbGF5aW5nIG5vd1xuXHRcdCAqIENyYWZ0eS5hdWRpby5zdG9wKCk7XG5cdFx0ICpcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHRzdG9wIDogZnVuY3Rpb24oaWQpIHtcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzO1xuXHRcdFx0aWYgKCFpZCkge1xuXHRcdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuc291bmRzKSB7XG5cdFx0XHRcdFx0cyA9IHRoaXMuc291bmRzW2ldO1xuXHRcdFx0XHRcdGlmICghcy5vYmoucGF1c2VkKVxuXHRcdFx0XHRcdFx0cy5vYmoucGF1c2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHMgPSB0aGlzLnNvdW5kc1tpZF07XG5cdFx0XHRpZiAoIXMub2JqLnBhdXNlZClcblx0XHRcdFx0cy5vYmoucGF1c2UoKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqICNDcmFmdHkuYXVkaW8uX211dGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8uX211dGUoW0Jvb2xlYW4gbXV0ZV0pXG5cdFx0ICpcblx0XHQgKiBNdXRlIG9yIHVubXV0ZSBldmVyeSBBdWRpbyBpbnN0YW5jZSB0aGF0IGlzIHBsYXlpbmcuXG5cdFx0ICovXG5cdFx0X211dGUgOiBmdW5jdGlvbihtdXRlKSB7XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcztcblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5zb3VuZHMpIHtcblx0XHRcdFx0cyA9IHRoaXMuc291bmRzW2ldO1xuXHRcdFx0XHRzLm9iai52b2x1bWUgPSBtdXRlID8gMCA6IHMudm9sdW1lO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tdXRlZCA9IG11dGU7XG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby50b2dnbGVNdXRlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnRvZ2dsZU11dGUoKVxuXHRcdCAqXG5cdFx0ICogTXV0ZSBvciB1bm11dGUgZXZlcnkgQXVkaW8gaW5zdGFuY2UgdGhhdCBpcyBwbGF5aW5nLiBUb2dnbGVzIGJldHdlZW5cblx0XHQgKiBwYXVzaW5nIG9yIHBsYXlpbmcgZGVwZW5kaW5nIG9uIHRoZSBzdGF0ZS5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogLy90b2dnbGUgbXV0ZSBhbmQgdW5tdXRlIGRlcGVuZGluZyBvbiBjdXJyZW50IHN0YXRlXG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnRvZ2dsZU11dGUoKTtcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHR0b2dnbGVNdXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIXRoaXMubXV0ZWQpIHtcblx0XHRcdFx0dGhpcy5fbXV0ZSh0cnVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX211dGUoZmFsc2UpO1xuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5tdXRlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLm11dGUoKVxuXHRcdCAqXG5cdFx0ICogTXV0ZSBldmVyeSBBdWRpbyBpbnN0YW5jZSB0aGF0IGlzIHBsYXlpbmcuXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby5tdXRlKCk7XG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0bXV0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fbXV0ZSh0cnVlKTtcblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnVubXV0ZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby51bm11dGUoKVxuXHRcdCAqXG5cdFx0ICogVW5tdXRlIGV2ZXJ5IEF1ZGlvIGluc3RhbmNlIHRoYXQgaXMgcGxheWluZy5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnVubXV0ZSgpO1xuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdHVubXV0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fbXV0ZShmYWxzZSk7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnBhdXNlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnBhdXNlKHN0cmluZyBJRClcblx0XHQgKlxuXHRcdCAqIFBhdXNlIHRoZSBBdWRpbyBpbnN0YW5jZSBzcGVjaWZpZWQgYnkgaWQgcGFyYW0uXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby5wYXVzZSgnbXVzaWMnKTtcblx0XHQgKiB+fn5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBpZCBUaGUgaWQgb2YgdGhlIGF1ZGlvIG9iamVjdCB0byBwYXVzZVxuXHRcdCAqL1xuXHRcdHBhdXNlIDogZnVuY3Rpb24oaWQpIHtcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8gfHwgIWlkIHx8ICF0aGlzLnNvdW5kc1tpZF0pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzID0gdGhpcy5zb3VuZHNbaWRdO1xuXHRcdFx0aWYgKCFzLm9iai5wYXVzZWQpXG5cdFx0XHRcdHMub2JqLnBhdXNlKCk7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnVucGF1c2Vcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8udW5wYXVzZShzdHJpbmcgSUQpXG5cdFx0ICpcblx0XHQgKiBSZXN1bWUgcGxheWluZyB0aGUgQXVkaW8gaW5zdGFuY2Ugc3BlY2lmaWVkIGJ5IGlkIHBhcmFtLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8udW5wYXVzZSgnbXVzaWMnKTtcblx0XHQgKiB+fn5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBpZCBUaGUgaWQgb2YgdGhlIGF1ZGlvIG9iamVjdCB0byB1bnBhdXNlXG5cdFx0ICovXG5cdFx0dW5wYXVzZSA6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvIHx8ICFpZCB8fCAhdGhpcy5zb3VuZHNbaWRdKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcyA9IHRoaXMuc291bmRzW2lkXTtcblx0XHRcdGlmIChzLm9iai5wYXVzZWQpXG5cdFx0XHRcdHMub2JqLnBsYXkoKTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8udG9nZ2xlUGF1c2Vcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8udG9nZ2xlUGF1c2Uoc3RyaW5nIElEKVxuXHRcdCAqXG5cdFx0ICogVG9nZ2xlIHRoZSBwYXVzZSBzdGF0dXMgb2YgdGhlIEF1ZGlvIGluc3RhbmNlIHNwZWNpZmllZCBieSBpZCBwYXJhbS5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnRvZ2dsZVBhdXNlKCdtdXNpYycpO1xuXHRcdCAqIH5+flxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgYXVkaW8gb2JqZWN0IHRvIHBhdXNlL3VucGF1c2Vcblx0XHQgKi9cblx0XHR0b2dnbGVQYXVzZSA6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvIHx8ICFpZCB8fCAhdGhpcy5zb3VuZHNbaWRdKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcyA9IHRoaXMuc291bmRzW2lkXTtcblx0XHRcdGlmIChzLm9iai5wYXVzZWQpIHtcblx0XHRcdFx0cy5vYmoucGxheSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cy5vYmoucGF1c2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4vKipAXG4qICNUZXh0XG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSB0ZXh0IGlzIGNoYW5nZWRcbiogQHJlcXVpcmVzIENhbnZhcyBvciBET01cbiogQ29tcG9uZW50IHRvIGRyYXcgdGV4dCBpbnNpZGUgdGhlIGJvZHkgb2YgYW4gZW50aXR5LlxuKi9cbkNyYWZ0eS5jKFwiVGV4dFwiLCB7XG5cdF90ZXh0OiBcIlwiLFxuXHRfdGV4dEZvbnQ6IHtcblx0XHRcInR5cGVcIjogXCJcIixcblx0XHRcIndlaWdodFwiOiBcIlwiLFxuXHRcdFwic2l6ZVwiOiBcIlwiLFxuXHRcdFwiZmFtaWx5XCI6IFwiXCJcblx0fSxcblx0cmVhZHk6IHRydWUsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoXCIyRFwiKTtcblxuXHRcdHRoaXMuYmluZChcIkRyYXdcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBmb250ID0gdGhpcy5fdGV4dEZvbnRbXCJ0eXBlXCJdICsgJyAnICsgdGhpcy5fdGV4dEZvbnRbXCJ3ZWlnaHRcIl0gKyAnICcgK1xuXHRcdFx0XHR0aGlzLl90ZXh0Rm9udFtcInNpemVcIl0gKyAnICcgKyB0aGlzLl90ZXh0Rm9udFtcImZhbWlseVwiXTtcblxuXHRcdFx0aWYgKGUudHlwZSA9PT0gXCJET01cIikge1xuXHRcdFx0XHR2YXIgZWwgPSB0aGlzLl9lbGVtZW50LFxuXHRcdFx0XHRcdHN0eWxlID0gZWwuc3R5bGU7XG5cblx0XHRcdFx0c3R5bGUuY29sb3IgPSB0aGlzLl90ZXh0Q29sb3I7XG5cdFx0XHRcdHN0eWxlLmZvbnQgPSBmb250O1xuXHRcdFx0XHRlbC5pbm5lckhUTUwgPSB0aGlzLl90ZXh0O1xuXHRcdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09IFwiY2FudmFzXCIpIHtcblx0XHRcdFx0dmFyIGNvbnRleHQgPSBlLmN0eCxcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljcyA9IG51bGw7XG5cblx0XHRcdFx0Y29udGV4dC5zYXZlKCk7XG5cblx0XHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSB0aGlzLl90ZXh0Q29sb3IgfHwgXCJyZ2IoMCwwLDApXCI7XG5cdFx0XHRcdGNvbnRleHQuZm9udCA9IGZvbnQ7XG5cblx0XHRcdFx0Y29udGV4dC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkgKyB0aGlzLmgpO1xuXHRcdFx0XHRjb250ZXh0LmZpbGxUZXh0KHRoaXMuX3RleHQsIDAsIDApO1xuXG5cdFx0XHRcdG1ldHJpY3MgPSBjb250ZXh0Lm1lYXN1cmVUZXh0KHRoaXMuX3RleHQpO1xuXHRcdFx0XHR0aGlzLl93ID0gbWV0cmljcy53aWR0aDtcblxuXHRcdFx0XHRjb250ZXh0LnJlc3RvcmUoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG4gICAgKiAjLnRleHRcbiAgICAqIEBjb21wIFRleHRcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50ZXh0KFN0cmluZyB0ZXh0KVxuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRleHQoRnVuY3Rpb24gdGV4dGdlbmVyYXRvcilcbiAgICAqIEBwYXJhbSB0ZXh0IC0gU3RyaW5nIG9mIHRleHQgdGhhdCB3aWxsIGJlIGluc2VydGVkIGludG8gdGhlIERPTSBvciBDYW52YXMgZWxlbWVudC5cbiAgICAqIFxuICAgICogVGhpcyBtZXRob2Qgd2lsbCB1cGRhdGUgdGhlIHRleHQgaW5zaWRlIHRoZSBlbnRpdHkuXG4gICAgKiBJZiB5b3UgdXNlIERPTSwgdG8gbW9kaWZ5IHRoZSBmb250LCB1c2UgdGhlIGAuY3NzYCBtZXRob2QgaW5oZXJpdGVkIGZyb20gdGhlIERPTSBjb21wb25lbnQuXG4gICAgKlxuICAgICogSWYgeW91IG5lZWQgdG8gcmVmZXJlbmNlIGF0dHJpYnV0ZXMgb24gdGhlIGVudGl0eSBpdHNlbGYgeW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gaW5zdGVhZCBvZiBhIHN0cmluZy5cbiAgICAqIFxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuICAgICogQ3JhZnR5LmUoXCIyRCwgRE9NLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KS50ZXh0KFwiTG9vayBhdCBtZSEhXCIpO1xuICAgICpcbiAgICAqIENyYWZ0eS5lKFwiMkQsIERPTSwgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSlcbiAgICAqICAgICAudGV4dChmdW5jdGlvbiAoKSB7IHJldHVybiBcIk15IHBvc2l0aW9uIGlzIFwiICsgdGhpcy5feCB9KTtcbiAgICAqXG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pLnRleHQoXCJMb29rIGF0IG1lISFcIik7XG4gICAgKlxuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KVxuICAgICogICAgIC50ZXh0KGZ1bmN0aW9uICgpIHsgcmV0dXJuIFwiTXkgcG9zaXRpb24gaXMgXCIgKyB0aGlzLl94IH0pO1xuICAgICogfn5+XG4gICAgKi9cblx0dGV4dDogZnVuY3Rpb24gKHRleHQpIHtcblx0XHRpZiAoISh0eXBlb2YgdGV4dCAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0ZXh0ICE9PSBudWxsKSkgcmV0dXJuIHRoaXMuX3RleHQ7XG5cdFx0aWYgKHR5cGVvZih0ZXh0KSA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aGlzLl90ZXh0ID0gdGV4dC5jYWxsKHRoaXMpO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMuX3RleHQgPSB0ZXh0O1xuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG4gICAgKiAjLnRleHRDb2xvclxuICAgICogQGNvbXAgVGV4dFxuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRleHRDb2xvcihTdHJpbmcgY29sb3IsIE51bWJlciBzdHJlbmd0aClcbiAgICAqIEBwYXJhbSBjb2xvciAtIFRoZSBjb2xvciBpbiBoZXhhZGVjaW1hbFxuICAgICogQHBhcmFtIHN0cmVuZ3RoIC0gTGV2ZWwgb2Ygb3BhY2l0eVxuICAgICpcbiAgICAqIE1vZGlmeSB0aGUgdGV4dCBjb2xvciBhbmQgbGV2ZWwgb2Ygb3BhY2l0eS5cbiAgICAqIFxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuICAgICogQ3JhZnR5LmUoXCIyRCwgRE9NLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KS50ZXh0KFwiTG9vayBhdCBtZSEhXCIpXG4gICAgKiAgIC50ZXh0Q29sb3IoJyNGRjAwMDAnKTtcbiAgICAqXG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pLnRleHQoJ0xvb2sgYXQgbWUhIScpXG4gICAgKiAgIC50ZXh0Q29sb3IoJyNGRjAwMDAnLCAwLjYpO1xuICAgICogfn5+XG4gICAgKiBAc2VlIENyYWZ0eS50b1JHQlxuICAgICovXG5cdHRleHRDb2xvcjogZnVuY3Rpb24gKGNvbG9yLCBzdHJlbmd0aCkge1xuXHRcdHRoaXMuX3N0cmVuZ3RoID0gc3RyZW5ndGg7XG5cdFx0dGhpcy5fdGV4dENvbG9yID0gQ3JhZnR5LnRvUkdCKGNvbG9yLCB0aGlzLl9zdHJlbmd0aCk7XG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAqICMudGV4dEZvbnRcbiAgICAqIEBjb21wIFRleHRcbiAgICAqIEB0cmlnZ2VycyBDaGFuZ2VcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50ZXh0Rm9udChTdHJpbmcga2V5LCAqIHZhbHVlKVxuICAgICogQHBhcmFtIGtleSAtIFByb3BlcnR5IG9mIHRoZSBlbnRpdHkgdG8gbW9kaWZ5XG4gICAgKiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBzZXQgdGhlIHByb3BlcnR5IHRvXG4gICAgKlxuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRleHRGb250KE9iamVjdCBtYXApXG4gICAgKiBAcGFyYW0gbWFwIC0gT2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIHByb3BlcnR5IHRvIG1vZGlmeSBhbmQgdGhlIHZhbHVlIGFzIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICAgICpcbiAgICAqIFVzZSB0aGlzIG1ldGhvZCB0byBzZXQgZm9udCBwcm9wZXJ0eSBvZiB0aGUgdGV4dCBlbnRpdHkuXG4gICAgKiBcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cbiAgICAqIENyYWZ0eS5lKFwiMkQsIERPTSwgVGV4dFwiKS50ZXh0Rm9udCh7IHR5cGU6ICdpdGFsaWMnLCBmYW1pbHk6ICdBcmlhbCcgfSk7XG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikudGV4dEZvbnQoeyBzaXplOiAnMjBweCcsIHdlaWdodDogJ2JvbGQnIH0pO1xuICAgICpcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS50ZXh0Rm9udChcInR5cGVcIiwgXCJpdGFsaWNcIik7XG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikudGV4dEZvbnQoXCJ0eXBlXCIpOyAvLyBpdGFsaWNcbiAgICAqIH5+flxuICAgICovXG5cdHRleHRGb250OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHQvL2lmIGp1c3QgdGhlIGtleSwgcmV0dXJuIHRoZSB2YWx1ZVxuXHRcdFx0aWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3RleHRGb250W2tleV07XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2Yga2V5ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdGZvciAocHJvcGVydHlLZXkgaW4ga2V5KSB7XG5cdFx0XHRcdFx0dGhpcy5fdGV4dEZvbnRbcHJvcGVydHlLZXldID0ga2V5W3Byb3BlcnR5S2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl90ZXh0Rm9udFtrZXldID0gdmFsdWU7XG5cdFx0fVxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuQ3JhZnR5LmV4dGVuZCh7XG4vKipAXG5cdCogI0NyYWZ0eS5hc3NldHNcblx0KiBAY2F0ZWdvcnkgQXNzZXRzXG5cdCogQW4gb2JqZWN0IGNvbnRhaW5pbmcgZXZlcnkgYXNzZXQgdXNlZCBpbiB0aGUgY3VycmVudCBDcmFmdHkgZ2FtZS5cblx0KiBUaGUga2V5IGlzIHRoZSBVUkwgYW5kIHRoZSB2YWx1ZSBpcyB0aGUgYEF1ZGlvYCBvciBgSW1hZ2VgIG9iamVjdC5cblx0KlxuXHQqIElmIGxvYWRpbmcgYW4gYXNzZXQsIGNoZWNrIHRoYXQgaXQgaXMgaW4gdGhpcyBvYmplY3QgZmlyc3QgdG8gYXZvaWQgbG9hZGluZyB0d2ljZS5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHZhciBpc0xvYWRlZCA9ICEhQ3JhZnR5LmFzc2V0c1tcImltYWdlcy9zcHJpdGUucG5nXCJdO1xuXHQqIH5+flxuXHQqIEBzZWUgQ3JhZnR5LmxvYWRlclxuXHQqL1xuXHRhc3NldHM6IHt9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5hc3NldFxuICAgICogQGNhdGVnb3J5IEFzc2V0c1xuICAgICogXG4gICAgKiBAdHJpZ2dlciBOZXdBc3NldCAtIEFmdGVyIHNldHRpbmcgbmV3IGFzc2V0IC0gT2JqZWN0IC0ga2V5IGFuZCB2YWx1ZSBvZiBuZXcgYWRkZWQgYXNzZXQuXG4gICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuYXNzZXQoU3RyaW5nIGtleSwgT2JqZWN0IGFzc2V0KVxuICAgICogQHBhcmFtIGtleSAtIGFzc2V0IHVybC5cbiAgICAqIEBwYXJhbSBhc3NldCAtIEF1ZGlvYCBvciBgSW1hZ2VgIG9iamVjdC5cbiAgICAqIEFkZCBuZXcgYXNzZXQgdG8gYXNzZXRzIG9iamVjdC5cbiAgICAqIFxuICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmFzc2V0KFN0cmluZyBrZXkpXG4gICAgKiBAcGFyYW0ga2V5IC0gYXNzZXQgdXJsLlxuICAgICogR2V0IGFzc2V0IGZyb20gYXNzZXRzIG9iamVjdC5cbiAgICAqIFxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuICAgICogQ3JhZnR5LmFzc2V0KGtleSwgdmFsdWUpO1xuICAgICogdmFyIGFzc2V0ID0gQ3JhZnR5LmFzc2V0KGtleSk7IC8vb2JqZWN0IHdpdGgga2V5IGFuZCB2YWx1ZSBmaWVsZHNcbiAgICAqIH5+flxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS5hc3NldHNcbiAgICAqL1xuICAgIGFzc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gQ3JhZnR5LmFzc2V0c1trZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFDcmFmdHkuYXNzZXRzW2tleV0pIHtcbiAgICAgICAgICAgIENyYWZ0eS5hc3NldHNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiTmV3QXNzZXRcIiwge2tleSA6IGtleSwgdmFsdWUgOiB2YWx1ZX0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAgICAgLyoqQFxuXHQqICNDcmFmdHkuaW1hZ2Vfd2hpdGVsaXN0XG5cdCogQGNhdGVnb3J5IEFzc2V0c1xuXHQqIFxuICAgICogXG4gICAgKiBBIGxpc3Qgb2YgZmlsZSBleHRlbnNpb25zIHRoYXQgY2FuIGJlIGxvYWRlZCBhcyBpbWFnZXMgYnkgQ3JhZnR5LmxvYWRcbiAgICAqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cbiAgICAgICAgKiBDcmFmdHkuaW1hZ2Vfd2hpdGVsaXN0LnB1c2goXCJ0aWZcIilcblx0KiBDcmFmdHkubG9hZChbXCJpbWFnZXMvc3ByaXRlLnRpZlwiLCBcInNvdW5kcy9qdW1wLm1wM1wiXSxcblx0KiAgICAgZnVuY3Rpb24oKSB7XG5cdCogICAgICAgICAvL3doZW4gbG9hZGVkXG5cdCogICAgICAgICBDcmFmdHkuc2NlbmUoXCJtYWluXCIpOyAvL2dvIHRvIG1haW4gc2NlbmVcblx0KiAgICAgICAgIENyYWZ0eS5hdWRpby5wbGF5KFwianVtcC5tcDNcIik7IC8vUGxheSB0aGUgYXVkaW8gZmlsZVxuXHQqICAgICB9LFxuXHQqXG5cdCogICAgIGZ1bmN0aW9uKGUpIHtcblx0KiAgICAgICAvL3Byb2dyZXNzXG5cdCogICAgIH0sXG5cdCpcblx0KiAgICAgZnVuY3Rpb24oZSkge1xuXHQqICAgICAgIC8vdWggb2gsIGVycm9yIGxvYWRpbmdcblx0KiAgICAgfVxuXHQqICk7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkuYXNzZXRcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5sb2FkXG5cdCovXG4gICAgaW1hZ2Vfd2hpdGVsaXN0OiBbXCJqcGdcIiwgXCJqcGVnXCIsIFwiZ2lmXCIsIFwicG5nXCIsIFwic3ZnXCJdLFxuXHQvKipAXG5cdCogI0NyYWZ0eS5sb2FkZXJcblx0KiBAY2F0ZWdvcnkgQXNzZXRzXG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmxvYWQoQXJyYXkgYXNzZXRzLCBGdW5jdGlvbiBvbkxvYWRbLCBGdW5jdGlvbiBvblByb2dyZXNzLCBGdW5jdGlvbiBvbkVycm9yXSlcblx0KiBAcGFyYW0gYXNzZXRzIC0gQXJyYXkgb2YgYXNzZXRzIHRvIGxvYWQgKGFjY2VwdHMgc291bmRzIGFuZCBpbWFnZXMpXG5cdCogQHBhcmFtIG9uTG9hZCAtIENhbGxiYWNrIHdoZW4gdGhlIGFzc2V0cyBhcmUgbG9hZGVkXG5cdCogQHBhcmFtIG9uUHJvZ3Jlc3MgLSBDYWxsYmFjayB3aGVuIGFuIGFzc2V0IGlzIGxvYWRlZC4gQ29udGFpbnMgaW5mb3JtYXRpb24gYWJvdXQgYXNzZXRzIGxvYWRlZFxuXHQqIEBwYXJhbSBvbkVycm9yIC0gQ2FsbGJhY2sgd2hlbiBhbiBhc3NldCBmYWlscyB0byBsb2FkXG5cdCogXG5cdCogUHJlbG9hZGVyIGZvciBhbGwgYXNzZXRzLiBUYWtlcyBhbiBhcnJheSBvZiBVUkxzIGFuZFxuXHQqIGFkZHMgdGhlbSB0byB0aGUgYENyYWZ0eS5hc3NldHNgIG9iamVjdC5cblx0KlxuXHQqIEZpbGVzIHdpdGggc3VmZml4ZXMgaW4gYGltYWdlX3doaXRlbGlzdGAgKGNhc2UgaW5zZW5zaXRpdmUpIHdpbGwgYmUgbG9hZGVkLlxuXHQqXG5cdCogSWYgYENyYWZ0eS5zdXBwb3J0LmF1ZGlvYCBpcyBgdHJ1ZWAsIGZpbGVzIHdpdGggdGhlIGZvbGxvd2luZyBzdWZmaXhlcyBgbXAzYCwgYHdhdmAsIGBvZ2dgIGFuZCBgbXA0YCAoY2FzZSBpbnNlbnNpdGl2ZSkgY2FuIGJlIGxvYWRlZC5cblx0KlxuXHQqIFRoZSBgb25Qcm9ncmVzc2AgZnVuY3Rpb24gd2lsbCBiZSBwYXNzZWQgb24gb2JqZWN0IHdpdGggaW5mb3JtYXRpb24gYWJvdXRcblx0KiB0aGUgcHJvZ3Jlc3MgaW5jbHVkaW5nIGhvdyBtYW55IGFzc2V0cyBsb2FkZWQsIHRvdGFsIG9mIGFsbCB0aGUgYXNzZXRzIHRvXG5cdCogbG9hZCBhbmQgYSBwZXJjZW50YWdlIG9mIHRoZSBwcm9ncmVzcy5cbiAgICAqIH5+flxuICAgICogeyBsb2FkZWQ6IGosIHRvdGFsOiB0b3RhbCwgcGVyY2VudDogKGogLyB0b3RhbCAqIDEwMCkgLHNyYzpzcmN9KVxuXHQqIH5+flxuXHQqXG5cdCogYG9uRXJyb3JgIHdpbGwgYmUgcGFzc2VkIHdpdGggdGhlIGFzc2V0IHRoYXQgY291bGRuJ3QgbG9hZC5cbiAgICAqXG5cdCogV2hlbiBgb25FcnJvcmAgaXMgbm90IHByb3ZpZGVkLCB0aGUgb25Mb2FkIGlzIGxvYWRlZCBldmVuIHNvbWUgYXNzZXRzIGFyZSBub3Qgc3VjY2Vzc2Z1bGx5IGxvYWRlZC4gT3RoZXJ3aXNlLCBvbkxvYWQgd2lsbCBiZSBjYWxsZWQgbm8gbWF0dGVyIHdoZXRoZXIgdGhlcmUgYXJlIGVycm9ycyBvciBub3QuIFxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmxvYWQoW1wiaW1hZ2VzL3Nwcml0ZS5wbmdcIiwgXCJzb3VuZHMvanVtcC5tcDNcIl0sXG5cdCogICAgIGZ1bmN0aW9uKCkge1xuXHQqICAgICAgICAgLy93aGVuIGxvYWRlZFxuXHQqICAgICAgICAgQ3JhZnR5LnNjZW5lKFwibWFpblwiKTsgLy9nbyB0byBtYWluIHNjZW5lXG5cdCogICAgICAgICBDcmFmdHkuYXVkaW8ucGxheShcImp1bXAubXAzXCIpOyAvL1BsYXkgdGhlIGF1ZGlvIGZpbGVcblx0KiAgICAgfSxcblx0KlxuXHQqICAgICBmdW5jdGlvbihlKSB7XG5cdCogICAgICAgLy9wcm9ncmVzc1xuXHQqICAgICB9LFxuXHQqXG5cdCogICAgIGZ1bmN0aW9uKGUpIHtcblx0KiAgICAgICAvL3VoIG9oLCBlcnJvciBsb2FkaW5nXG5cdCogICAgIH1cblx0KiApO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LmFzc2V0c1xuICAgICAgICAqIEBzZWUgQ3JhZnR5LmltYWdlX3doaXRlbGlzdFxuXHQqL1xuICAgIGxvYWQ6IGZ1bmN0aW9uIChkYXRhLCBvbmNvbXBsZXRlLCBvbnByb2dyZXNzLCBvbmVycm9yKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgdmFyIGkgPSAwLCBsID0gZGF0YS5sZW5ndGgsIGN1cnJlbnQsIG9iaiwgdG90YWwgPSBsLCBqID0gMCwgZXh0ID0gXCJcIiA7XG4gIFxuICAgICAgICAvL1Byb2dyZXNzIGZ1bmN0aW9uXG4gICAgICAgIGZ1bmN0aW9uIHBybygpe1xuICAgICAgICAgICAgdmFyIHNyYyA9IHRoaXMuc3JjO1xuICAgICAgICAgICBcbiAgICAgICAgICAgIC8vUmVtb3ZlIGV2ZW50cyBjYXVzZSBhdWRpbyB0cmlnZ2VyIHRoaXMgZXZlbnQgbW9yZSB0aGFuIG9uY2UoZGVwZW5kcyBvbiBicm93c2VyKVxuICAgICAgICAgICAgaWYgKHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcikgeyAgXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHBybywgZmFsc2UpOyAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgICAgKytqO1xuICAgICAgICAgICAgLy9pZiBwcm9ncmVzcyBjYWxsYmFjaywgZ2l2ZSBpbmZvcm1hdGlvbiBvZiBhc3NldHMgbG9hZGVkLCB0b3RhbCBhbmQgcGVyY2VudFxuICAgICAgICAgICAgaWYgKG9ucHJvZ3Jlc3MpIFxuICAgICAgICAgICAgICAgIG9ucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICBsb2FkZWQ6IGosIFxuICAgICAgICAgICAgICAgICAgICB0b3RhbDogdG90YWwsIFxuICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAoaiAvIHRvdGFsICogMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgc3JjOnNyY1xuICAgICAgICAgICAgICAgIH0pO1xuXHRcdFx0XHRcbiAgICAgICAgICAgIGlmKGogPT09IHRvdGFsICYmIG9uY29tcGxldGUpIG9uY29tcGxldGUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy9FcnJvciBmdW5jdGlvblxuICAgICAgICBmdW5jdGlvbiBlcnIoKXtcbiAgICAgICAgICAgIHZhciBzcmMgPSB0aGlzLnNyYztcbiAgICAgICAgICAgIGlmIChvbmVycm9yKSBcbiAgICAgICAgICAgICAgICBvbmVycm9yKHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVkOiBqLCBcbiAgICAgICAgICAgICAgICAgICAgdG90YWw6IHRvdGFsLCBcbiAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogKGogLyB0b3RhbCAqIDEwMCksXG4gICAgICAgICAgICAgICAgICAgIHNyYzpzcmNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXHRcdFxuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgaWYoaiA9PT0gdG90YWwgJiYgb25jb21wbGV0ZSkgb25jb21wbGV0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICAgICBcbiAgICAgICAgZm9yICg7IGkgPCBsOyArK2kpIHsgICAgICAgXG4gICAgICAgICAgICBjdXJyZW50ID0gZGF0YVtpXTtcbiAgICAgICAgICAgIGV4dCA9IGN1cnJlbnQuc3Vic3RyKGN1cnJlbnQubGFzdEluZGV4T2YoJy4nKSArIDEsIDMpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgb2JqID0gQ3JhZnR5LmFzc2V0KGN1cnJlbnQpIHx8IG51bGw7ICAgXG4gICAgICAgICAgXG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN1cHBvcnQuYXVkaW8gJiYgQ3JhZnR5LmF1ZGlvLnN1cHBvcnRlZFtleHRdKSB7ICAgXG4gICAgICAgICAgICAgICAgLy9DcmVhdGUgbmV3IG9iamVjdCBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYoIW9iail7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gY3VycmVudC5zdWJzdHIoY3VycmVudC5sYXN0SW5kZXhPZignLycpICsgMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gQ3JhZnR5LmF1ZGlvLmF1ZGlvRWxlbWVudCgpO1xuICAgICAgICAgICAgICAgICAgICBvYmouaWQgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICBvYmouc3JjID0gY3VycmVudDtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnByZWxvYWQgPSBcImF1dG9cIjtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnZvbHVtZSA9IENyYWZ0eS5hdWRpby52b2x1bWU7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hc3NldChjdXJyZW50LCBvYmopO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYXVkaW8uc291bmRzW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqOm9iaixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllZDowXG4gICAgICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAvL2FkZEV2ZW50TGlzdGVuZXIgaXMgc3VwcG9ydGVkIG9uIElFOSAsIEF1ZGlvIGFzIHdlbGxcbiAgICAgICAgICAgICAgICBpZiAob2JqLmFkZEV2ZW50TGlzdGVuZXIpIHsgIFxuICAgICAgICAgICAgICAgICAgICBvYmouYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBwcm8sIGZhbHNlKTsgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKENyYWZ0eS5pbWFnZV93aGl0ZWxpc3QuaW5kZXhPZihleHQpID49IDApIHsgXG4gICAgICAgICAgICAgICAgaWYoIW9iaikge1xuICAgICAgICAgICAgICAgICAgICBvYmogPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmFzc2V0KGN1cnJlbnQsIG9iaik7ICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9iai5vbmxvYWQ9cHJvO1xuICAgICAgICAgICAgICAgIG9iai5zcmMgPSBjdXJyZW50OyAvL3NldHVwIHNyYyBhZnRlciBvbmxvYWQgZnVuY3Rpb24gT3BlcmEvSUUgQnVnXG4gICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRvdGFsLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7IC8vc2tpcCBpZiBub3QgYXBwbGljYWJsZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2JqLm9uZXJyb3IgPSBlcnI7XG4gICAgICAgIH1cbiAgICAgICBcbiAgICAgICBcbiAgICB9LFxuXHQvKipAXG5cdCogI0NyYWZ0eS5tb2R1bGVzXG5cdCogQGNhdGVnb3J5IEFzc2V0c1xuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5tb2R1bGVzKFtTdHJpbmcgcmVwb0xvY2F0aW9uLF0gT2JqZWN0IG1vZHVsZU1hcFssIEZ1bmN0aW9uIG9uTG9hZF0pXG5cdCogQHBhcmFtIG1vZHVsZXMgLSBNYXAgb2YgbmFtZTp2ZXJzaW9uIHBhaXJzIGZvciBtb2R1bGVzIHRvIGxvYWRcblx0KiBAcGFyYW0gb25Mb2FkIC0gQ2FsbGJhY2sgd2hlbiB0aGUgbW9kdWxlcyBhcmUgbG9hZGVkXG5cdCogXG5cdCogQnJvd3NlIHRoZSBzZWxlY3Rpb24gb2YgY29tbXVuaXR5IG1vZHVsZXMgb24gaHR0cDovL2NyYWZ0eWNvbXBvbmVudHMuY29tXG5cdCogXG4gICAgKiBJdCBpcyBwb3NzaWJsZSB0byBjcmVhdGUgeW91ciBvd24gcmVwb3NpdG9yeS5cblx0KlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiAvLyBMb2FkaW5nIGZyb20gZGVmYXVsdCByZXBvc2l0b3J5XG5cdCogQ3JhZnR5Lm1vZHVsZXMoeyBtb3ZldG86ICdERVYnIH0sIGZ1bmN0aW9uICgpIHtcblx0KiAgICAgLy9tb2R1bGUgaXMgcmVhZHlcblx0KiAgICAgQ3JhZnR5LmUoXCJNb3ZlVG8sIDJELCBET01cIik7XG5cdCogfSk7XG5cdCpcblx0KiAvLyBMb2FkaW5nIGZyb20geW91ciBvd24gc2VydmVyXG5cdCogQ3JhZnR5Lm1vZHVsZXMoeyAnaHR0cDovL215ZG9tYWluLmNvbS9qcy9teXN0dWZmLmpzJzogJ0RFVicgfSwgZnVuY3Rpb24gKCkge1xuXHQqICAgICAvL21vZHVsZSBpcyByZWFkeVxuXHQqICAgICBDcmFmdHkuZShcIk1vdmVUbywgMkQsIERPTVwiKTtcblx0KiB9KTtcblx0KlxuXHQqIC8vIExvYWRpbmcgZnJvbSBhbHRlcm5hdGl2ZSByZXBvc2l0b3J5XG5cdCogQ3JhZnR5Lm1vZHVsZXMoJ2h0dHA6Ly9jZG4uY3JhZnR5LW1vZHVsZXMuY29tJywgeyBtb3ZldG86ICdERVYnIH0sIGZ1bmN0aW9uICgpIHtcblx0KiAgICAgLy9tb2R1bGUgaXMgcmVhZHlcblx0KiAgICAgQ3JhZnR5LmUoXCJNb3ZlVG8sIDJELCBET01cIik7XG5cdCogfSk7XG5cdCpcblx0KiAvLyBMb2FkaW5nIGZyb20gdGhlIGxhdGVzdCBjb21wb25lbnQgd2Vic2l0ZVxuXHQqIENyYWZ0eS5tb2R1bGVzKFxuXHQqICAgICAnaHR0cDovL2Nkbi5jcmFmdHljb21wb25lbnRzLmNvbSdcblx0KiAgICAgLCB7IE1vdmVUbzogJ3JlbGVhc2UnIH1cblx0KiAgICAgLCBmdW5jdGlvbiAoKSB7XG5cdCogICAgIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3IsIE1vdmVUb1wiKVxuXHQqICAgICAgIC5hdHRyKHt4OiAwLCB5OiAwLCB3OiA1MCwgaDogNTB9KVxuXHQqICAgICAgIC5jb2xvcihcImdyZWVuXCIpO1xuXHQqICAgICB9KTtcblx0KiB9KTtcblx0KiB+fn5cblx0KlxuXHQqL1xuXHRtb2R1bGVzOiBmdW5jdGlvbiAobW9kdWxlc1JlcG9zaXRvcnksIG1vZHVsZU1hcCwgb25jb21wbGV0ZSkge1xuXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIG1vZHVsZXNSZXBvc2l0b3J5ID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRvbmNvbXBsZXRlID0gbW9kdWxlTWFwO1xuXHRcdFx0bW9kdWxlTWFwID0gbW9kdWxlc1JlcG9zaXRvcnk7XG5cdFx0XHRtb2R1bGVzUmVwb3NpdG9yeSA9ICdodHRwOi8vY2RuLmNyYWZ0eWNvbXBvbmVudHMuY29tJztcblx0XHR9XG5cblx0XHQvKiFcblx0XHQgICogJHNjcmlwdC5qcyBBc3luYyBsb2FkZXIgJiBkZXBlbmRlbmN5IG1hbmFnZXJcblx0XHQgICogaHR0cHM6Ly9naXRodWIuY29tL2RlZC9zY3JpcHQuanNcblx0XHQgICogKGMpIER1c3RpbiBEaWF6LCBKYWNvYiBUaG9ybnRvbiAyMDExXG5cdFx0ICAqIExpY2Vuc2U6IE1JVFxuXHRcdCAgKi9cblx0XHR2YXIgJHNjcmlwdCA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgd2luID0gdGhpcywgZG9jID0gZG9jdW1lbnRcblx0XHRcdCwgaGVhZCA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdXG5cdFx0XHQsIHZhbGlkQmFzZSA9IC9eaHR0cHM/OlxcL1xcLy9cblx0XHRcdCwgb2xkID0gd2luLiRzY3JpcHQsIGxpc3QgPSB7fSwgaWRzID0ge30sIGRlbGF5ID0ge30sIHNjcmlwdHBhdGhcblx0XHRcdCwgc2NyaXB0cyA9IHt9LCBzID0gJ3N0cmluZycsIGYgPSBmYWxzZVxuXHRcdFx0LCBwdXNoID0gJ3B1c2gnLCBkb21Db250ZW50TG9hZGVkID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCByZWFkeVN0YXRlID0gJ3JlYWR5U3RhdGUnXG5cdFx0XHQsIGFkZEV2ZW50TGlzdGVuZXIgPSAnYWRkRXZlbnRMaXN0ZW5lcicsIG9ucmVhZHlzdGF0ZWNoYW5nZSA9ICdvbnJlYWR5c3RhdGVjaGFuZ2UnXG5cblx0XHRcdGZ1bmN0aW9uIGV2ZXJ5KGFyLCBmbiwgaSkge1xuXHRcdFx0XHRmb3IgKGkgPSAwLCBqID0gYXIubGVuZ3RoOyBpIDwgajsgKytpKSBpZiAoIWZuKGFyW2ldKSkgcmV0dXJuIGZcblx0XHRcdFx0cmV0dXJuIDFcblx0XHRcdH1cblx0XHRcdGZ1bmN0aW9uIGVhY2goYXIsIGZuKSB7XG5cdFx0XHRcdGV2ZXJ5KGFyLCBmdW5jdGlvbiAoZWwpIHtcblx0XHRcdFx0XHRyZXR1cm4gIWZuKGVsKVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWRvY1tyZWFkeVN0YXRlXSAmJiBkb2NbYWRkRXZlbnRMaXN0ZW5lcl0pIHtcblx0XHRcdFx0ZG9jW2FkZEV2ZW50TGlzdGVuZXJdKGRvbUNvbnRlbnRMb2FkZWQsIGZ1bmN0aW9uIGZuKCkge1xuXHRcdFx0XHRcdGRvYy5yZW1vdmVFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGZuLCBmKVxuXHRcdFx0XHRcdGRvY1tyZWFkeVN0YXRlXSA9ICdjb21wbGV0ZSdcblx0XHRcdFx0fSwgZilcblx0XHRcdFx0ZG9jW3JlYWR5U3RhdGVdID0gJ2xvYWRpbmcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uICRzY3JpcHQocGF0aHMsIGlkT3JEb25lLCBvcHREb25lKSB7XG5cdFx0XHRcdHBhdGhzID0gcGF0aHNbcHVzaF0gPyBwYXRocyA6IFtwYXRoc11cblx0XHRcdFx0dmFyIGlkT3JEb25lSXNEb25lID0gaWRPckRvbmUgJiYgaWRPckRvbmUuY2FsbFxuXHRcdFx0XHQsIGRvbmUgPSBpZE9yRG9uZUlzRG9uZSA/IGlkT3JEb25lIDogb3B0RG9uZVxuXHRcdFx0XHQsIGlkID0gaWRPckRvbmVJc0RvbmUgPyBwYXRocy5qb2luKCcnKSA6IGlkT3JEb25lXG5cdFx0XHRcdCwgcXVldWUgPSBwYXRocy5sZW5ndGhcblx0XHRcdFx0ZnVuY3Rpb24gbG9vcEZuKGl0ZW0pIHtcblx0XHRcdFx0XHRyZXR1cm4gaXRlbS5jYWxsID8gaXRlbSgpIDogbGlzdFtpdGVtXVxuXHRcdFx0XHR9XG5cdFx0XHRcdGZ1bmN0aW9uIGNhbGxiYWNrKCkge1xuXHRcdFx0XHRcdGlmICghLS1xdWV1ZSkge1xuXHRcdFx0XHRcdFx0bGlzdFtpZF0gPSAxXG5cdFx0XHRcdFx0XHRkb25lICYmIGRvbmUoKVxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgZHNldCBpbiBkZWxheSkge1xuXHRcdFx0XHRcdFx0XHRldmVyeShkc2V0LnNwbGl0KCd8JyksIGxvb3BGbikgJiYgIWVhY2goZGVsYXlbZHNldF0sIGxvb3BGbikgJiYgKGRlbGF5W2RzZXRdID0gW10pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGVhY2gocGF0aHMsIGZ1bmN0aW9uIChwYXRoKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2NyaXB0c1twYXRoXSkge1xuXHRcdFx0XHRcdFx0XHRpZCAmJiAoaWRzW2lkXSA9IDEpXG5cdFx0XHRcdFx0XHRcdHJldHVybiBzY3JpcHRzW3BhdGhdID09IDIgJiYgY2FsbGJhY2soKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0c2NyaXB0c1twYXRoXSA9IDFcblx0XHRcdFx0XHRcdGlkICYmIChpZHNbaWRdID0gMSlcblx0XHRcdFx0XHRcdGNyZWF0ZSghdmFsaWRCYXNlLnRlc3QocGF0aCkgJiYgc2NyaXB0cGF0aCA/IHNjcmlwdHBhdGggKyBwYXRoICsgJy5qcycgOiBwYXRoLCBjYWxsYmFjaylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LCAwKVxuXHRcdFx0XHRyZXR1cm4gJHNjcmlwdFxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBjcmVhdGUocGF0aCwgZm4pIHtcblx0XHRcdFx0dmFyIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG5cdFx0XHRcdCwgbG9hZGVkID0gZlxuXHRcdFx0XHRlbC5vbmxvYWQgPSBlbC5vbmVycm9yID0gZWxbb25yZWFkeXN0YXRlY2hhbmdlXSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRpZiAoKGVsW3JlYWR5U3RhdGVdICYmICEoL15jfGxvYWRlLy50ZXN0KGVsW3JlYWR5U3RhdGVdKSkpIHx8IGxvYWRlZCkgcmV0dXJuO1xuXHRcdFx0XHRcdGVsLm9ubG9hZCA9IGVsW29ucmVhZHlzdGF0ZWNoYW5nZV0gPSBudWxsXG5cdFx0XHRcdFx0bG9hZGVkID0gMVxuXHRcdFx0XHRcdHNjcmlwdHNbcGF0aF0gPSAyXG5cdFx0XHRcdFx0Zm4oKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsLmFzeW5jID0gMVxuXHRcdFx0XHRlbC5zcmMgPSBwYXRoXG5cdFx0XHRcdGhlYWQuaW5zZXJ0QmVmb3JlKGVsLCBoZWFkLmZpcnN0Q2hpbGQpXG5cdFx0XHR9XG5cblx0XHRcdCRzY3JpcHQuZ2V0ID0gY3JlYXRlXG5cblx0XHRcdCRzY3JpcHQub3JkZXIgPSBmdW5jdGlvbiAoc2NyaXB0cywgaWQsIGRvbmUpIHtcblx0XHRcdFx0KGZ1bmN0aW9uIGNhbGxiYWNrKHMpIHtcblx0XHRcdFx0XHRzID0gc2NyaXB0cy5zaGlmdCgpXG5cdFx0XHRcdFx0aWYgKCFzY3JpcHRzLmxlbmd0aCkgJHNjcmlwdChzLCBpZCwgZG9uZSlcblx0XHRcdFx0XHRlbHNlICRzY3JpcHQocywgY2FsbGJhY2spXG5cdFx0XHRcdH0oKSlcblx0XHRcdH1cblxuXHRcdFx0JHNjcmlwdC5wYXRoID0gZnVuY3Rpb24gKHApIHtcblx0XHRcdFx0c2NyaXB0cGF0aCA9IHBcblx0XHRcdH1cblx0XHRcdCRzY3JpcHQucmVhZHkgPSBmdW5jdGlvbiAoZGVwcywgcmVhZHksIHJlcSkge1xuXHRcdFx0XHRkZXBzID0gZGVwc1twdXNoXSA/IGRlcHMgOiBbZGVwc11cblx0XHRcdFx0dmFyIG1pc3NpbmcgPSBbXTtcblx0XHRcdFx0IWVhY2goZGVwcywgZnVuY3Rpb24gKGRlcCkge1xuXHRcdFx0XHRcdGxpc3RbZGVwXSB8fCBtaXNzaW5nW3B1c2hdKGRlcCk7XG5cdFx0XHRcdH0pICYmIGV2ZXJ5KGRlcHMsIGZ1bmN0aW9uIChkZXApIHsgcmV0dXJuIGxpc3RbZGVwXSB9KSA/XG5cdFx0XHRcdHJlYWR5KCkgOiAhZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0XHRcdGRlbGF5W2tleV0gPSBkZWxheVtrZXldIHx8IFtdXG5cdFx0XHRcdFx0ZGVsYXlba2V5XVtwdXNoXShyZWFkeSlcblx0XHRcdFx0XHRyZXEgJiYgcmVxKG1pc3NpbmcpXG5cdFx0XHRcdH0oZGVwcy5qb2luKCd8JykpXG5cdFx0XHRcdHJldHVybiAkc2NyaXB0XG5cdFx0XHR9XG5cblx0XHRcdCRzY3JpcHQubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0d2luLiRzY3JpcHQgPSBvbGQ7XG5cdFx0XHRcdHJldHVybiB0aGlzXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAkc2NyaXB0XG5cdFx0fSkoKTtcblxuXHRcdHZhciBtb2R1bGVzID0gW107XG5cdFx0dmFyIHZhbGlkQmFzZSA9IC9eKGh0dHBzP3xmaWxlKTpcXC9cXC8vO1xuXHRcdGZvciAodmFyIGkgaW4gbW9kdWxlTWFwKSB7XG5cdFx0XHRpZiAodmFsaWRCYXNlLnRlc3QoaSkpXG5cdFx0XHRcdG1vZHVsZXMucHVzaChpKVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRtb2R1bGVzLnB1c2gobW9kdWxlc1JlcG9zaXRvcnkgKyAnLycgKyBpLnRvTG93ZXJDYXNlKCkgKyAnLScgKyBtb2R1bGVNYXBbaV0udG9Mb3dlckNhc2UoKSArICcuanMnKTtcblx0XHR9XG5cblx0XHQkc2NyaXB0KG1vZHVsZXMsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChvbmNvbXBsZXRlKSBvbmNvbXBsZXRlKCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNDcmFmdHkubWF0aFxuKiBAY2F0ZWdvcnkgMkRcbiogU3RhdGljIGZ1bmN0aW9ucy5cbiovXG5DcmFmdHkubWF0aCA9IHtcbi8qKkBcblx0ICogI0NyYWZ0eS5tYXRoLmFic1xuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5tYXRoLmFicyhOdW1iZXIgbilcbiAgICAgKiBAcGFyYW0gbiAtIFNvbWUgdmFsdWUuXG4gICAgICogQHJldHVybiBBYnNvbHV0ZSB2YWx1ZS5cbiAgICAgKiBcblx0ICogUmV0dXJucyB0aGUgYWJzb2x1dGUgdmFsdWUuXG4gICAgICovXG5cdGFiczogZnVuY3Rpb24gKHgpIHtcblx0XHRyZXR1cm4geCA8IDAgPyAteCA6IHg7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5hbW91bnRPZlxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLmFtb3VudE9mKE51bWJlciBjaGVja1ZhbHVlLCBOdW1iZXIgbWluVmFsdWUsIE51bWJlciBtYXhWYWx1ZSlcbiAgICAgKiBAcGFyYW0gY2hlY2tWYWx1ZSAtIFZhbHVlIHRoYXQgc2hvdWxkIGNoZWNrZWQgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtLlxuICAgICAqIEBwYXJhbSBtaW5WYWx1ZSAtIE1pbmltdW0gdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIG1heFZhbHVlIC0gTWF4aW11bSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJuIEFtb3VudCBvZiBjaGVja1ZhbHVlIGNvbXBhcmVkIHRvIG1pblZhbHVlIGFuZCBtYXhWYWx1ZS5cbiAgICAgKiBcblx0ICogUmV0dXJucyB0aGUgYW1vdW50IG9mIGhvdyBtdWNoIGEgY2hlY2tWYWx1ZSBpcyBtb3JlIGxpa2UgbWluVmFsdWUgKD0wKVxuICAgICAqIG9yIG1vcmUgbGlrZSBtYXhWYWx1ZSAoPTEpXG4gICAgICovXG5cdGFtb3VudE9mOiBmdW5jdGlvbiAoY2hlY2tWYWx1ZSwgbWluVmFsdWUsIG1heFZhbHVlKSB7XG5cdFx0aWYgKG1pblZhbHVlIDwgbWF4VmFsdWUpXG5cdFx0XHRyZXR1cm4gKGNoZWNrVmFsdWUgLSBtaW5WYWx1ZSkgLyAobWF4VmFsdWUgLSBtaW5WYWx1ZSk7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIChjaGVja1ZhbHVlIC0gbWF4VmFsdWUpIC8gKG1pblZhbHVlIC0gbWF4VmFsdWUpO1xuXHR9LFxuXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5jbGFtcFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLmNsYW1wKE51bWJlciB2YWx1ZSwgTnVtYmVyIG1pbiwgTnVtYmVyIG1heClcbiAgICAgKiBAcGFyYW0gdmFsdWUgLSBBIHZhbHVlLlxuICAgICAqIEBwYXJhbSBtYXggLSBNYXhpbXVtIHRoYXQgdmFsdWUgY2FuIGJlLlxuICAgICAqIEBwYXJhbSBtaW4gLSBNaW5pbXVtIHRoYXQgdmFsdWUgY2FuIGJlLlxuICAgICAqIEByZXR1cm4gVGhlIHZhbHVlIGJldHdlZW4gbWluaW11bSBhbmQgbWF4aW11bS5cbiAgICAgKiBcblx0ICogUmVzdHJpY3RzIGEgdmFsdWUgdG8gYmUgd2l0aGluIGEgc3BlY2lmaWVkIHJhbmdlLlxuICAgICAqL1xuXHRjbGFtcDogZnVuY3Rpb24gKHZhbHVlLCBtaW4sIG1heCkge1xuXHRcdGlmICh2YWx1ZSA+IG1heClcblx0XHRcdHJldHVybiBtYXg7XG5cdFx0ZWxzZSBpZiAodmFsdWUgPCBtaW4pXG5cdFx0XHRyZXR1cm4gbWluO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB2YWx1ZTtcblx0fSxcblxuXHQvKipAXG4gICAgICogQ29udmVydHMgYW5nbGUgZnJvbSBkZWdyZWUgdG8gcmFkaWFuLlxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuICAgICAqIEBwYXJhbSBhbmdsZUluRGVnIC0gVGhlIGFuZ2xlIGluIGRlZ3JlZS5cbiAgICAgKiBAcmV0dXJuIFRoZSBhbmdsZSBpbiByYWRpYW4uXG4gICAgICovXG5cdGRlZ1RvUmFkOiBmdW5jdGlvbiAoYW5nbGVJbkRlZykge1xuXHRcdHJldHVybiBhbmdsZUluRGVnICogTWF0aC5QSSAvIDE4MDtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLmRpc3RhbmNlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGguZGlzdGFuY2UoTnVtYmVyIHgxLCBOdW1iZXIgeTEsIE51bWJlciB4MiwgTnVtYmVyIHkyKVxuICAgICAqIEBwYXJhbSB4MSAtIEZpcnN0IHggY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geTEgLSBGaXJzdCB5IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHgyIC0gU2Vjb25kIHggY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geTIgLSBTZWNvbmQgeSBjb29yZGluYXRlLlxuICAgICAqIEByZXR1cm4gVGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBwb2ludHMuXG4gICAgICogXG5cdCAqIERpc3RhbmNlIGJldHdlZW4gdHdvIHBvaW50cy5cbiAgICAgKi9cblx0ZGlzdGFuY2U6IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuXHRcdHZhciBzcXVhcmVkRGlzdGFuY2UgPSBDcmFmdHkubWF0aC5zcXVhcmVkRGlzdGFuY2UoeDEsIHkxLCB4MiwgeTIpO1xuXHRcdHJldHVybiBNYXRoLnNxcnQocGFyc2VGbG9hdChzcXVhcmVkRGlzdGFuY2UpKTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLmxlcnBcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5sZXJwKE51bWJlciB2YWx1ZTEsIE51bWJlciB2YWx1ZTIsIE51bWJlciBhbW91bnQpXG4gICAgICogQHBhcmFtIHZhbHVlMSAtIE9uZSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gdmFsdWUyIC0gQW5vdGhlciB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gYW1vdW50IC0gQW1vdW50IG9mIHZhbHVlMiB0byB2YWx1ZTEuXG4gICAgICogQHJldHVybiBMaW5lYXIgaW50ZXJwb2xhdGVkIHZhbHVlLlxuICAgICAqIFxuXHQgKiBMaW5lYXIgaW50ZXJwb2xhdGlvbi4gUGFzc2luZyBhbW91bnQgd2l0aCBhIHZhbHVlIG9mIDAgd2lsbCBjYXVzZSB2YWx1ZTEgdG8gYmUgcmV0dXJuZWQsXG4gICAgICogYSB2YWx1ZSBvZiAxIHdpbGwgY2F1c2UgdmFsdWUyIHRvIGJlIHJldHVybmVkLlxuICAgICAqL1xuXHRsZXJwOiBmdW5jdGlvbiAodmFsdWUxLCB2YWx1ZTIsIGFtb3VudCkge1xuXHRcdHJldHVybiB2YWx1ZTEgKyAodmFsdWUyIC0gdmFsdWUxKSAqIGFtb3VudDtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLm5lZ2F0ZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLm5lZ2F0ZShOdW1iZXIgcGVyY2VudClcbiAgICAgKiBAcGFyYW0gcGVyY2VudCAtIElmIHlvdSBwYXNzIDEgYSAtMSB3aWxsIGJlIHJldHVybmVkLiBJZiB5b3UgcGFzcyAwIGEgMSB3aWxsIGJlIHJldHVybmVkLlxuICAgICAqIEByZXR1cm4gMSBvciAtMS5cbiAgICAgKiBcblx0ICogUmV0dXJuZXMgXCJyYW5kb21seVwiIC0xLlxuICAgICAqL1xuXHRuZWdhdGU6IGZ1bmN0aW9uIChwZXJjZW50KSB7XG5cdFx0aWYgKE1hdGgucmFuZG9tKCkgPCBwZXJjZW50KVxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiAxO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgucmFkVG9EZWdcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5yYWRUb0RlZyhOdW1iZXIgYW5nbGUpXG4gICAgICogQHBhcmFtIGFuZ2xlSW5SYWQgLSBUaGUgYW5nbGUgaW4gcmFkaWFuLlxuICAgICAqIEByZXR1cm4gVGhlIGFuZ2xlIGluIGRlZ3JlZS5cbiAgICAgKiBcblx0ICogQ29udmVydHMgYW5nbGUgZnJvbSByYWRpYW4gdG8gZGVncmVlLlxuICAgICAqL1xuXHRyYWRUb0RlZzogZnVuY3Rpb24gKGFuZ2xlSW5SYWQpIHtcblx0XHRyZXR1cm4gYW5nbGVJblJhZCAqIDE4MCAvIE1hdGguUEk7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5yYW5kb21FbGVtZW50T2ZBcnJheVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5tYXRoLnJhbmRvbUVsZW1lbnRPZkFycmF5KEFycmF5IGFycmF5KVxuICAgICAqIEBwYXJhbSBhcnJheSAtIEEgc3BlY2lmaWMgYXJyYXkuXG4gICAgICogQHJldHVybiBBIHJhbmRvbSBlbGVtZW50IG9mIGEgc3BlY2lmaWMgYXJyYXkuXG4gICAgICogXG5cdCAqIFJldHVybnMgYSByYW5kb20gZWxlbWVudCBvZiBhIHNwZWNpZmljIGFycmF5LlxuICAgICAqL1xuXHRyYW5kb21FbGVtZW50T2ZBcnJheTogZnVuY3Rpb24gKGFycmF5KSB7XG5cdFx0cmV0dXJuIGFycmF5W01hdGguZmxvb3IoYXJyYXkubGVuZ3RoICogTWF0aC5yYW5kb20oKSldO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgucmFuZG9tSW50XG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGgucmFuZG9tSW50KE51bWJlciBzdGFydCwgTnVtYmVyIGVuZClcbiAgICAgKiBAcGFyYW0gc3RhcnQgLSBTbWFsbGVzdCBpbnQgdmFsdWUgdGhhdCBjYW4gYmUgcmV0dXJuZWQuXG4gICAgICogQHBhcmFtIGVuZCAtIEJpZ2dlc3QgaW50IHZhbHVlIHRoYXQgY2FuIGJlIHJldHVybmVkLlxuICAgICAqIEByZXR1cm4gQSByYW5kb20gaW50LlxuICAgICAqIFxuXHQgKiBSZXR1cm5zIGEgcmFuZG9tIGludCBpbiB3aXRoaW4gYSBzcGVjaWZpYyByYW5nZS5cbiAgICAgKi9cblx0cmFuZG9tSW50OiBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuXHRcdHJldHVybiBzdGFydCArIE1hdGguZmxvb3IoKDEgKyBlbmQgLSBzdGFydCkgKiBNYXRoLnJhbmRvbSgpKTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLnJhbmRvbU51bWJlclxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLnJhbmRvbUludChOdW1iZXIgc3RhcnQsIE51bWJlciBlbmQpXG4gICAgICogQHBhcmFtIHN0YXJ0IC0gU21hbGxlc3QgbnVtYmVyIHZhbHVlIHRoYXQgY2FuIGJlIHJldHVybmVkLlxuICAgICAqIEBwYXJhbSBlbmQgLSBCaWdnZXN0IG51bWJlciB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZC5cbiAgICAgKiBAcmV0dXJuIEEgcmFuZG9tIG51bWJlci5cbiAgICAgKiBcblx0ICogUmV0dXJucyBhIHJhbmRvbSBudW1iZXIgaW4gd2l0aGluIGEgc3BlY2lmaWMgcmFuZ2UuXG4gICAgICovXG5cdHJhbmRvbU51bWJlcjogZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm4gc3RhcnQgKyAoZW5kIC0gc3RhcnQpICogTWF0aC5yYW5kb20oKTtcblx0fSxcblxuXHQvKipAXG5cdCAqICNDcmFmdHkubWF0aC5zcXVhcmVkRGlzdGFuY2Vcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5zcXVhcmVkRGlzdGFuY2UoTnVtYmVyIHgxLCBOdW1iZXIgeTEsIE51bWJlciB4MiwgTnVtYmVyIHkyKVxuICAgICAqIEBwYXJhbSB4MSAtIEZpcnN0IHggY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geTEgLSBGaXJzdCB5IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHgyIC0gU2Vjb25kIHggY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geTIgLSBTZWNvbmQgeSBjb29yZGluYXRlLlxuICAgICAqIEByZXR1cm4gVGhlIHNxdWFyZWQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIHBvaW50cy5cbiAgICAgKiBcblx0ICogU3F1YXJlZCBkaXN0YW5jZSBiZXR3ZWVuIHR3byBwb2ludHMuXG4gICAgICovXG5cdHNxdWFyZWREaXN0YW5jZTogZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKSB7XG5cdFx0cmV0dXJuICh4MSAtIHgyKSAqICh4MSAtIHgyKSArICh5MSAtIHkyKSAqICh5MSAtIHkyKTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLndpdGhpblJhbmdlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBCb29sZWFuIENyYWZ0eS5tYXRoLndpdGhpblJhbmdlKE51bWJlciB2YWx1ZSwgTnVtYmVyIG1pbiwgTnVtYmVyIG1heClcbiAgICAgKiBAcGFyYW0gdmFsdWUgLSBUaGUgc3BlY2lmaWMgdmFsdWUuXG4gICAgICogQHBhcmFtIG1pbiAtIE1pbmltdW0gdmFsdWUuXG4gICAgICogQHBhcmFtIG1heCAtIE1heGltdW0gdmFsdWUuXG4gICAgICogQHJldHVybiBSZXR1cm5zIHRydWUgaWYgdmFsdWUgaXMgd2l0aGluIGEgc3BlY2lmaWMgcmFuZ2UuXG4gICAgICogXG5cdCAqIENoZWNrIGlmIGEgdmFsdWUgaXMgd2l0aGluIGEgc3BlY2lmaWMgcmFuZ2UuXG4gICAgICovXG5cdHdpdGhpblJhbmdlOiBmdW5jdGlvbiAodmFsdWUsIG1pbiwgbWF4KSB7XG5cdFx0cmV0dXJuICh2YWx1ZSA+PSBtaW4gJiYgdmFsdWUgPD0gbWF4KTtcblx0fVxufTtcblxuQ3JhZnR5Lm1hdGguVmVjdG9yMkQgPSAoZnVuY3Rpb24gKCkge1xuXHQvKipAXG5cdCAqICNDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKiBAY2F0ZWdvcnkgMkRcblx0ICogQGNsYXNzIFRoaXMgaXMgYSBnZW5lcmFsIHB1cnBvc2UgMkQgdmVjdG9yIGNsYXNzXG5cdCAqXG5cdCAqIFZlY3RvcjJEIHVzZXMgdGhlIGZvbGxvd2luZyBmb3JtOlxuXHQgKiA8eCwgeT5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBWZWN0b3IyRCgpO1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBWZWN0b3IyRChWZWN0b3IyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IFZlY3RvcjJEKE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRHxOdW1iZXI9MH0geFxuXHQgKiBAcGFyYW0ge051bWJlcj0wfSB5XG5cdCAqL1xuXHRmdW5jdGlvbiBWZWN0b3IyRCh4LCB5KSB7XG5cdFx0aWYgKHggaW5zdGFuY2VvZiBWZWN0b3IyRCkge1xuXHRcdFx0dGhpcy54ID0geC54O1xuXHRcdFx0dGhpcy55ID0geC55O1xuXHRcdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy54ID0geDtcblx0XHRcdHRoaXMueSA9IHk7XG5cdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMClcblx0XHRcdHRocm93IFwiVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIGZvciBWZWN0b3IyRCgpXCI7XG5cdH0gLy8gY2xhc3MgVmVjdG9yMkRcblxuXHRWZWN0b3IyRC5wcm90b3R5cGUueCA9IDA7XG5cdFZlY3RvcjJELnByb3RvdHlwZS55ID0gMDtcblxuXHQvKipAXG5cdCAqICMuYWRkXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogQWRkcyB0aGUgcGFzc2VkIHZlY3RvciB0byB0aGlzIHZlY3RvclxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IGFkZChWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7dmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyBhZnRlciBhZGRpbmdcblx0ICovXG5cdFZlY3RvcjJELnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodmVjUkgpIHtcblx0XHR0aGlzLnggKz0gdmVjUkgueDtcblx0XHR0aGlzLnkgKz0gdmVjUkgueTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSAvLyBhZGRcblxuXHQvKipAXG5cdCAqICMuYW5nbGVCZXR3ZWVuXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgYW5nbGUgYmV0d2VlbiB0aGUgcGFzc2VkIHZlY3RvciBhbmQgdGhpcyB2ZWN0b3IsIHVzaW5nIDwwLDA+IGFzIHRoZSBwb2ludCBvZiByZWZlcmVuY2UuXG5cdCAqIEFuZ2xlcyByZXR1cm5lZCBoYXZlIHRoZSByYW5nZSAo4oiSz4AsIM+AXS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gYW5nbGVCZXR3ZWVuKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIGFuZ2xlIGJldHdlZW4gdGhlIHR3byB2ZWN0b3JzIGluIHJhZGlhbnNcblx0ICovXG5cdFZlY3RvcjJELnByb3RvdHlwZS5hbmdsZUJldHdlZW4gPSBmdW5jdGlvbiAodmVjUkgpIHtcblx0XHRyZXR1cm4gTWF0aC5hdGFuMih0aGlzLnggKiB2ZWNSSC55IC0gdGhpcy55ICogdmVjUkgueCwgdGhpcy54ICogdmVjUkgueCArIHRoaXMueSAqIHZlY1JILnkpO1xuXHR9IC8vIGFuZ2xlQmV0d2VlblxuXG5cdC8qKkBcblx0ICogIy5hbmdsZVRvXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgYW5nbGUgdG8gdGhlIHBhc3NlZCB2ZWN0b3IgZnJvbSB0aGlzIHZlY3RvciwgdXNpbmcgdGhpcyB2ZWN0b3IgYXMgdGhlIHBvaW50IG9mIHJlZmVyZW5jZS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gYW5nbGVUbyhWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBhbmdsZSB0byB0aGUgcGFzc2VkIHZlY3RvciBpbiByYWRpYW5zXG5cdCAqL1xuXHRWZWN0b3IyRC5wcm90b3R5cGUuYW5nbGVUbyA9IGZ1bmN0aW9uICh2ZWNSSCkge1xuXHRcdHJldHVybiBNYXRoLmF0YW4yKHZlY1JILnkgLSB0aGlzLnksIHZlY1JILnggLSB0aGlzLngpO1xuXHR9O1xuXG5cdC8qKkBcblx0ICogIy5jbG9uZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENyZWF0ZXMgYW5kIGV4YWN0LCBudW1lcmljIGNvcHkgb2YgdGhpcyB2ZWN0b3Jcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBjbG9uZSgpO1xuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoZSBuZXcgdmVjdG9yXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcjJEKHRoaXMpO1xuICAgIH07IC8vIGNsb25lXG5cblx0LyoqQFxuXHQgKiAjLmRpc3RhbmNlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgZGlzdGFuY2UgZnJvbSB0aGlzIHZlY3RvciB0byB0aGUgcGFzc2VkIHZlY3Rvci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gZGlzdGFuY2UoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIHZlY3RvcnNcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmRpc3RhbmNlID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCgodmVjUkgueCAtIHRoaXMueCkgKiAodmVjUkgueCAtIHRoaXMueCkgKyAodmVjUkgueSAtIHRoaXMueSkgKiAodmVjUkgueSAtIHRoaXMueSkpO1xuICAgIH07IC8vIGRpc3RhbmNlXG5cblx0LyoqQFxuXHQgKiAjLmRpc3RhbmNlU3FcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBzcXVhcmVkIGRpc3RhbmNlIGZyb20gdGhpcyB2ZWN0b3IgdG8gdGhlIHBhc3NlZCB2ZWN0b3IuXG5cdCAqIFRoaXMgZnVuY3Rpb24gYXZvaWRzIGNhbGN1bGF0aW5nIHRoZSBzcXVhcmUgcm9vdCwgdGh1cyBiZWluZyBzbGlnaHRseSBmYXN0ZXIgdGhhbiAuZGlzdGFuY2UoICkuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGRpc3RhbmNlU3EoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgc3F1YXJlZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gdmVjdG9yc1xuXHQgKiBAc2VlIC5kaXN0YW5jZVxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZGlzdGFuY2VTcSA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHJldHVybiAodmVjUkgueCAtIHRoaXMueCkgKiAodmVjUkgueCAtIHRoaXMueCkgKyAodmVjUkgueSAtIHRoaXMueSkgKiAodmVjUkgueSAtIHRoaXMueSk7XG4gICAgfTsgLy8gZGlzdGFuY2VTcVxuXG5cdC8qKkBcblx0ICogIy5kaXZpZGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBEaXZpZGVzIHRoaXMgdmVjdG9yIGJ5IHRoZSBwYXNzZWQgdmVjdG9yLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IGRpdmlkZShWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgZGl2aWRpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmRpdmlkZSA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHRoaXMueCAvPSB2ZWNSSC54O1xuICAgICAgICB0aGlzLnkgLz0gdmVjUkgueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gZGl2aWRlXG5cblx0LyoqQFxuXHQgKiAjLmRvdFByb2R1Y3RcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBkb3QgcHJvZHVjdCBvZiB0aGlzIGFuZCB0aGUgcGFzc2VkIHZlY3RvcnNcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gZG90UHJvZHVjdChWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSByZXN1bHRhbnQgZG90IHByb2R1Y3Rcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmRvdFByb2R1Y3QgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ICogdmVjUkgueCArIHRoaXMueSAqIHZlY1JILnk7XG4gICAgfTsgLy8gZG90UHJvZHVjdFxuXG5cdC8qKkBcblx0ICogIy5lcXVhbHNcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBEZXRlcm1pbmVzIGlmIHRoaXMgdmVjdG9yIGlzIG51bWVyaWNhbGx5IGVxdWl2YWxlbnQgdG8gdGhlIHBhc3NlZCB2ZWN0b3IuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtCb29sZWFufSBlcXVhbHMoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGUgdmVjdG9ycyBhcmUgZXF1aXZhbGVudFxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgcmV0dXJuIHZlY1JIIGluc3RhbmNlb2YgVmVjdG9yMkQgJiZcbiAgICAgICAgICAgIHRoaXMueCA9PSB2ZWNSSC54ICYmIHRoaXMueSA9PSB2ZWNSSC55O1xuICAgIH07IC8vIGVxdWFsc1xuXG5cdC8qKkBcblx0ICogIy5nZXROb3JtYWxcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIGEgbmV3IHJpZ2h0LWhhbmRlZCBub3JtYWwgdmVjdG9yIGZvciB0aGUgbGluZSBjcmVhdGVkIGJ5IHRoaXMgYW5kIHRoZSBwYXNzZWQgdmVjdG9ycy5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBnZXROb3JtYWwoW1ZlY3RvcjJEXSk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkQ9PDAsMD59IFt2ZWNSSF1cblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGUgbmV3IG5vcm1hbCB2ZWN0b3Jcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmdldE5vcm1hbCA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIGlmICh2ZWNSSCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyRCgtdGhpcy55LCB0aGlzLngpOyAvLyBhc3N1bWUgdmVjUkggaXMgPDAsIDA+XG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yMkQodmVjUkgueSAtIHRoaXMueSwgdGhpcy54IC0gdmVjUkgueCkubm9ybWFsaXplKCk7XG4gICAgfTsgLy8gZ2V0Tm9ybWFsXG5cblx0LyoqQFxuXHQgKiAjLmlzWmVyb1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIERldGVybWluZXMgaWYgdGhpcyB2ZWN0b3IgaXMgZXF1YWwgdG8gPDAsMD5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge0Jvb2xlYW59IGlzWmVybygpO1xuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGlzIHZlY3RvciBpcyBlcXVhbCB0byA8MCwwPlxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuaXNaZXJvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggPT09IDAgJiYgdGhpcy55ID09PSAwO1xuICAgIH07IC8vIGlzWmVyb1xuXG5cdC8qKkBcblx0ICogIy5tYWduaXR1ZGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBtYWduaXR1ZGUgb2YgdGhpcyB2ZWN0b3IuXG5cdCAqIE5vdGU6IEZ1bmN0aW9uIG9iamVjdHMgaW4gSmF2YVNjcmlwdCBhbHJlYWR5IGhhdmUgYSAnbGVuZ3RoJyBtZW1iZXIsIGhlbmNlIHRoZSB1c2Ugb2YgbWFnbml0dWRlIGluc3RlYWQuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IG1hZ25pdHVkZSgpO1xuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgbWFnbml0dWRlIG9mIHRoaXMgdmVjdG9yXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5tYWduaXR1ZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xuICAgIH07IC8vIG1hZ25pdHVkZVxuXG5cdC8qKkBcblx0ICogIy5tYWduaXR1ZGVTcVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIHNxdWFyZSBvZiB0aGUgbWFnbml0dWRlIG9mIHRoaXMgdmVjdG9yLlxuXHQgKiBUaGlzIGZ1bmN0aW9uIGF2b2lkcyBjYWxjdWxhdGluZyB0aGUgc3F1YXJlIHJvb3QsIHRodXMgYmVpbmcgc2xpZ2h0bHkgZmFzdGVyIHRoYW4gLm1hZ25pdHVkZSggKS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gbWFnbml0dWRlU3EoKTtcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIHNxdWFyZSBvZiB0aGUgbWFnbml0dWRlIG9mIHRoaXMgdmVjdG9yXG5cdCAqIEBzZWUgLm1hZ25pdHVkZVxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUubWFnbml0dWRlU3EgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueTtcbiAgICB9OyAvLyBtYWduaXR1ZGVTcVxuXG5cdC8qKkBcblx0ICogIy5tdWx0aXBseVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIE11bHRpcGxpZXMgdGhpcyB2ZWN0b3IgYnkgdGhlIHBhc3NlZCB2ZWN0b3Jcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBtdWx0aXBseShWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgbXVsdGlwbHlpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLm11bHRpcGx5ID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgdGhpcy54ICo9IHZlY1JILng7XG4gICAgICAgIHRoaXMueSAqPSB2ZWNSSC55O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBtdWx0aXBseVxuXG5cdC8qKkBcblx0ICogIy5uZWdhdGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBOZWdhdGVzIHRoaXMgdmVjdG9yIChpZS4gPC14LC15Pilcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBuZWdhdGUoKTtcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBuZWdhdGlvblxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUubmVnYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIG5lZ2F0ZVxuXG5cdC8qKkBcblx0ICogIy5ub3JtYWxpemVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBOb3JtYWxpemVzIHRoaXMgdmVjdG9yIChzY2FsZXMgdGhlIHZlY3RvciBzbyB0aGF0IGl0cyBuZXcgbWFnbml0dWRlIGlzIDEpXG5cdCAqIEZvciB2ZWN0b3JzIHdoZXJlIG1hZ25pdHVkZSBpcyAwLCA8MSwwPiBpcyByZXR1cm5lZC5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBub3JtYWxpemUoKTtcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBub3JtYWxpemF0aW9uXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGxuZyA9IE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xuXG4gICAgICAgIGlmIChsbmcgPT09IDApIHtcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgZHVlIEVhc3RcbiAgICAgICAgICAgIHRoaXMueCA9IDE7XG4gICAgICAgICAgICB0aGlzLnkgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy54IC89IGxuZztcbiAgICAgICAgICAgIHRoaXMueSAvPSBsbmc7XG4gICAgICAgIH0gLy8gZWxzZVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIG5vcm1hbGl6ZVxuXG5cdC8qKkBcblx0ICogIy5zY2FsZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFNjYWxlcyB0aGlzIHZlY3RvciBieSB0aGUgcGFzc2VkIGFtb3VudChzKVxuXHQgKiBJZiBzY2FsYXJZIGlzIG9taXR0ZWQsIHNjYWxhclggaXMgdXNlZCBmb3IgYm90aCBheGVzXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gc2NhbGUoTnVtYmVyWywgTnVtYmVyXSk7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBzY2FsYXJYXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbc2NhbGFyWV1cblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIGFmdGVyIHNjYWxpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oc2NhbGFyWCwgc2NhbGFyWSkge1xuICAgICAgICBpZiAoc2NhbGFyWSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgc2NhbGFyWSA9IHNjYWxhclg7XG5cbiAgICAgICAgdGhpcy54ICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMueSAqPSBzY2FsYXJZO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHNjYWxlXG5cblx0LyoqQFxuXHQgKiAjLnNjYWxlVG9NYWduaXR1ZGVcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBTY2FsZXMgdGhpcyB2ZWN0b3Igc3VjaCB0aGF0IGl0cyBuZXcgbWFnbml0dWRlIGlzIGVxdWFsIHRvIHRoZSBwYXNzZWQgdmFsdWUuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gc2NhbGVUb01hZ25pdHVkZShOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gbWFnXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgc2NhbGluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuc2NhbGVUb01hZ25pdHVkZSA9IGZ1bmN0aW9uKG1hZykge1xuICAgICAgICB2YXIgayA9IG1hZyAvIHRoaXMubWFnbml0dWRlKCk7XG4gICAgICAgIHRoaXMueCAqPSBrO1xuICAgICAgICB0aGlzLnkgKj0gaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc2NhbGVUb01hZ25pdHVkZVxuXG5cdC8qKkBcblx0ICogIy5zZXRWYWx1ZXNcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBTZXRzIHRoZSB2YWx1ZXMgb2YgdGhpcyB2ZWN0b3IgdXNpbmcgYSBwYXNzZWQgdmVjdG9yIG9yIHBhaXIgb2YgbnVtYmVycy5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBzZXRWYWx1ZXMoVmVjdG9yMkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBzZXRWYWx1ZXMoTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge051bWJlcnxWZWN0b3IyRH0geFxuXHQgKiBAcGFyYW0ge051bWJlcn0geVxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIHNldHRpbmcgb2YgdmFsdWVzXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgVmVjdG9yMkQpIHtcbiAgICAgICAgICAgIHRoaXMueCA9IHgueDtcbiAgICAgICAgICAgIHRoaXMueSA9IHgueTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICB9IC8vIGVsc2VcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzZXRWYWx1ZXNcblxuXHQvKipAXG5cdCAqICMuc3VidHJhY3Rcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBTdWJ0cmFjdHMgdGhlIHBhc3NlZCB2ZWN0b3IgZnJvbSB0aGlzIHZlY3Rvci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBzdWJ0cmFjdChWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHt2ZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgc3VidHJhY3Rpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgdGhpcy54IC09IHZlY1JILng7XG4gICAgICAgIHRoaXMueSAtPSB2ZWNSSC55O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzdWJ0cmFjdFxuXG5cdC8qKkBcblx0ICogIy50b1N0cmluZ1xuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyB2ZWN0b3IuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtTdHJpbmd9IHRvU3RyaW5nKCk7XG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9XG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJWZWN0b3IyRChcIiArIHRoaXMueCArIFwiLCBcIiArIHRoaXMueSArIFwiKVwiO1xuICAgIH07IC8vIHRvU3RyaW5nXG5cblx0LyoqQFxuXHQgKiAjLnRyYW5zbGF0ZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFRyYW5zbGF0ZXMgKG1vdmVzKSB0aGlzIHZlY3RvciBieSB0aGUgcGFzc2VkIGFtb3VudHMuXG5cdCAqIElmIGR5IGlzIG9taXR0ZWQsIGR4IGlzIHVzZWQgZm9yIGJvdGggYXhlcy5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSB0cmFuc2xhdGUoTnVtYmVyWywgTnVtYmVyXSk7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkeFxuXHQgKiBAcGFyYW0ge051bWJlcn0gW2R5XVxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIHRyYW5zbGF0aW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgaWYgKGR5ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkeSA9IGR4O1xuXG4gICAgICAgIHRoaXMueCArPSBkeDtcbiAgICAgICAgdGhpcy55ICs9IGR5O1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHRyYW5zbGF0ZVxuXG5cdC8qKkBcblx0ICogIy50cmlwbGVQcm9kdWN0XG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgdHJpcGxlIHByb2R1Y3Qgb2YgdGhyZWUgdmVjdG9ycy5cblx0ICogdHJpcGxlIHZlY3RvciBwcm9kdWN0ID0gYihh4oCiYykgLSBhKGLigKJjKVxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzdGF0aWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gdHJpcGxlUHJvZHVjdChWZWN0b3IyRCwgVmVjdG9yMkQsIFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gYVxuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSBiXG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IGNcblx0ICogQHJldHVybiB7VmVjdG9yMkR9IHRoZSB0cmlwbGUgcHJvZHVjdCBhcyBhIG5ldyB2ZWN0b3Jcblx0ICovXG5cdFZlY3RvcjJELnRyaXBsZVByb2R1Y3QgPSBmdW5jdGlvbiAoYSwgYiwgYykge1xuXHRcdHZhciBhYyA9IGEuZG90UHJvZHVjdChjKTtcblx0XHR2YXIgYmMgPSBiLmRvdFByb2R1Y3QoYyk7XG5cdFx0cmV0dXJuIG5ldyBDcmFmdHkubWF0aC5WZWN0b3IyRChiLnggKiBhYyAtIGEueCAqIGJjLCBiLnkgKiBhYyAtIGEueSAqIGJjKTtcblx0fTtcblxuXHRyZXR1cm4gVmVjdG9yMkQ7XG59KSgpO1xuXG5DcmFmdHkubWF0aC5NYXRyaXgyRCA9IChmdW5jdGlvbiAoKSB7XG5cdC8qKkBcblx0ICogI0NyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqIEBjYXRlZ29yeSAyRFxuXHQgKlxuXHQgKiBAY2xhc3MgVGhpcyBpcyBhIDJEIE1hdHJpeDJEIGNsYXNzLiBJdCBpcyAzeDMgdG8gYWxsb3cgZm9yIGFmZmluZSB0cmFuc2Zvcm1hdGlvbnMgaW4gMkQgc3BhY2UuXG5cdCAqIFRoZSB0aGlyZCByb3cgaXMgYWx3YXlzIGFzc3VtZWQgdG8gYmUgWzAsIDAsIDFdLlxuXHQgKlxuXHQgKiBNYXRyaXgyRCB1c2VzIHRoZSBmb2xsb3dpbmcgZm9ybSwgYXMgcGVyIHRoZSB3aGF0d2cub3JnIHNwZWNpZmljYXRpb25zIGZvciBjYW52YXMudHJhbnNmb3JtKCk6XG5cdCAqIFthLCBjLCBlXVxuXHQgKiBbYiwgZCwgZl1cblx0ICogWzAsIDAsIDFdXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gbmV3IE1hdHJpeDJEKCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IG5ldyBNYXRyaXgyRChNYXRyaXgyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IG5ldyBNYXRyaXgyRChOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtNYXRyaXgyRHxOdW1iZXI9MX0gYVxuXHQgKiBAcGFyYW0ge051bWJlcj0wfSBiXG5cdCAqIEBwYXJhbSB7TnVtYmVyPTB9IGNcblx0ICogQHBhcmFtIHtOdW1iZXI9MX0gZFxuXHQgKiBAcGFyYW0ge051bWJlcj0wfSBlXG5cdCAqIEBwYXJhbSB7TnVtYmVyPTB9IGZcblx0ICovXG5cdE1hdHJpeDJEID0gZnVuY3Rpb24gKGEsIGIsIGMsIGQsIGUsIGYpIHtcblx0XHRpZiAoYSBpbnN0YW5jZW9mIE1hdHJpeDJEKSB7XG5cdFx0XHR0aGlzLmEgPSBhLmE7XG5cdFx0XHR0aGlzLmIgPSBhLmI7XG5cdFx0XHR0aGlzLmMgPSBhLmM7XG5cdFx0XHR0aGlzLmQgPSBhLmQ7XG5cdFx0XHR0aGlzLmUgPSBhLmU7XG5cdFx0XHR0aGlzLmYgPSBhLmY7XG5cdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSA2KSB7XG5cdFx0XHR0aGlzLmEgPSBhO1xuXHRcdFx0dGhpcy5iID0gYjtcblx0XHRcdHRoaXMuYyA9IGM7XG5cdFx0XHR0aGlzLmQgPSBkO1xuXHRcdFx0dGhpcy5lID0gZTtcblx0XHRcdHRoaXMuZiA9IGY7XG5cdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMClcblx0XHRcdHRocm93IFwiVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIGZvciBNYXRyaXgyRCgpXCI7XG5cdH0gLy8gY2xhc3MgTWF0cml4MkRcblxuXHRNYXRyaXgyRC5wcm90b3R5cGUuYSA9IDE7XG5cdE1hdHJpeDJELnByb3RvdHlwZS5iID0gMDtcblx0TWF0cml4MkQucHJvdG90eXBlLmMgPSAwO1xuXHRNYXRyaXgyRC5wcm90b3R5cGUuZCA9IDE7XG5cdE1hdHJpeDJELnByb3RvdHlwZS5lID0gMDtcblx0TWF0cml4MkQucHJvdG90eXBlLmYgPSAwO1xuXG5cdC8qKkBcblx0ICogIy5hcHBseVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgdGhlIG1hdHJpeCB0cmFuc2Zvcm1hdGlvbnMgdG8gdGhlIHBhc3NlZCBvYmplY3Rcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBhcHBseShWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIIC0gdmVjdG9yIHRvIGJlIHRyYW5zZm9ybWVkXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhlIHBhc3NlZCB2ZWN0b3Igb2JqZWN0IGFmdGVyIHRyYW5zZm9ybWluZ1xuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICAvLyBJJ20gbm90IHN1cmUgb2YgdGhlIGJlc3Qgd2F5IGZvciB0aGlzIGZ1bmN0aW9uIHRvIGJlIGltcGxlbWVudGVkLiBJZGVhbGx5XG4gICAgICAgIC8vIHN1cHBvcnQgZm9yIG90aGVyIG9iamVjdHMgKHJlY3RhbmdsZXMsIHBvbHlnb25zLCBldGMpIHNob3VsZCBiZSBlYXNpbHlcbiAgICAgICAgLy8gYWRkYWJsZSBpbiB0aGUgZnV0dXJlLiBNYXliZSBhIGZ1bmN0aW9uIChhcHBseSkgaXMgbm90IHRoZSBiZXN0IHdheSB0byBkb1xuICAgICAgICAvLyB0aGlzLi4uP1xuXG4gICAgICAgIHZhciB0bXBYID0gdmVjUkgueDtcbiAgICAgICAgdmVjUkgueCA9IHRtcFggKiB0aGlzLmEgKyB2ZWNSSC55ICogdGhpcy5jICsgdGhpcy5lO1xuICAgICAgICB2ZWNSSC55ID0gdG1wWCAqIHRoaXMuYiArIHZlY1JILnkgKiB0aGlzLmQgKyB0aGlzLmY7XG4gICAgICAgIC8vIG5vIG5lZWQgdG8gaG9tb2dlbml6ZSBzaW5jZSB0aGUgdGhpcmQgcm93IGlzIGFsd2F5cyBbMCwgMCwgMV1cblxuICAgICAgICByZXR1cm4gdmVjUkg7XG4gICAgfTsgLy8gYXBwbHlcblxuXHQvKipAXG5cdCAqICMuY2xvbmVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBDcmVhdGVzIGFuIGV4YWN0LCBudW1lcmljIGNvcHkgb2YgdGhlIGN1cnJlbnQgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gY2xvbmUoKTtcblx0ICogQHJldHVybnMge01hdHJpeDJEfVxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgyRCh0aGlzKTtcbiAgICB9OyAvLyBjbG9uZVxuXG5cdC8qKkBcblx0ICogIy5jb21iaW5lXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogTXVsdGlwbGllcyB0aGlzIG1hdHJpeCB3aXRoIGFub3RoZXIsIG92ZXJyaWRpbmcgdGhlIHZhbHVlcyBvZiB0aGlzIG1hdHJpeC5cblx0ICogVGhlIHBhc3NlZCBtYXRyaXggaXMgYXNzdW1lZCB0byBiZSBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IGNvbWJpbmUoTWF0cml4MkQpO1xuXHQgKiBAcGFyYW0ge01hdHJpeDJEfSBtdHJ4Ukhcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBhZnRlciBjb21iaW5hdGlvblxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uKG10cnhSSCkge1xuICAgICAgICB2YXIgdG1wID0gdGhpcy5hO1xuICAgICAgICB0aGlzLmEgPSB0bXAgKiBtdHJ4UkguYSArIHRoaXMuYiAqIG10cnhSSC5jO1xuICAgICAgICB0aGlzLmIgPSB0bXAgKiBtdHJ4UkguYiArIHRoaXMuYiAqIG10cnhSSC5kO1xuICAgICAgICB0bXAgPSB0aGlzLmM7XG4gICAgICAgIHRoaXMuYyA9IHRtcCAqIG10cnhSSC5hICsgdGhpcy5kICogbXRyeFJILmM7XG4gICAgICAgIHRoaXMuZCA9IHRtcCAqIG10cnhSSC5iICsgdGhpcy5kICogbXRyeFJILmQ7XG4gICAgICAgIHRtcCA9IHRoaXMuZTtcbiAgICAgICAgdGhpcy5lID0gdG1wICogbXRyeFJILmEgKyB0aGlzLmYgKiBtdHJ4UkguYyArIG10cnhSSC5lO1xuICAgICAgICB0aGlzLmYgPSB0bXAgKiBtdHJ4UkguYiArIHRoaXMuZiAqIG10cnhSSC5kICsgbXRyeFJILmY7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIGNvbWJpbmVcblxuXHQvKipAXG5cdCAqICMuZXF1YWxzXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQ2hlY2tzIGZvciB0aGUgbnVtZXJpYyBlcXVhbGl0eSBvZiB0aGlzIG1hdHJpeCB2ZXJzdXMgYW5vdGhlci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge0Jvb2xlYW59IGVxdWFscyhNYXRyaXgyRCk7XG5cdCAqIEBwYXJhbSB7TWF0cml4MkR9IG10cnhSSFxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGUgdHdvIG1hdHJpY2VzIGFyZSBudW1lcmljYWxseSBlcXVhbFxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24obXRyeFJIKSB7XG4gICAgICAgIHJldHVybiBtdHJ4UkggaW5zdGFuY2VvZiBNYXRyaXgyRCAmJlxuICAgICAgICAgICAgdGhpcy5hID09IG10cnhSSC5hICYmIHRoaXMuYiA9PSBtdHJ4UkguYiAmJiB0aGlzLmMgPT0gbXRyeFJILmMgJiZcbiAgICAgICAgICAgIHRoaXMuZCA9PSBtdHJ4UkguZCAmJiB0aGlzLmUgPT0gbXRyeFJILmUgJiYgdGhpcy5mID09IG10cnhSSC5mO1xuICAgIH07IC8vIGVxdWFsc1xuXG5cdC8qKkBcblx0ICogIy5kZXRlcm1pbmFudFxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIGRldGVybWluYW50IG9mIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGRldGVybWluYW50KCk7XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IGRldCh0aGlzIG1hdHJpeClcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmRldGVybWluYW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmEgKiB0aGlzLmQgLSB0aGlzLmIgKiB0aGlzLmM7XG4gICAgfTsgLy8gZGV0ZXJtaW5hbnRcblxuXHQvKipAXG5cdCAqICMuaW52ZXJ0XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogSW52ZXJ0cyB0aGlzIG1hdHJpeCBpZiBwb3NzaWJsZVxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IGludmVydCgpO1xuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgaW52ZXJ0ZWQgbWF0cml4IG9yIHRoZSBvcmlnaW5hbCBtYXRyaXggb24gZmFpbHVyZVxuXHQgKiBAc2VlIC5pc0ludmVydGlibGVcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZGV0ID0gdGhpcy5kZXRlcm1pbmFudCgpO1xuXG4gICAgICAgIC8vIG1hdHJpeCBpcyBpbnZlcnRpYmxlIGlmIGl0cyBkZXRlcm1pbmFudCBpcyBub24temVyb1xuICAgICAgICBpZiAoZGV0ICE9PSAwKSB7XG4gICAgICAgICAgICB2YXIgb2xkID0ge1xuICAgICAgICAgICAgICAgIGE6IHRoaXMuYSxcbiAgICAgICAgICAgICAgICBiOiB0aGlzLmIsXG4gICAgICAgICAgICAgICAgYzogdGhpcy5jLFxuICAgICAgICAgICAgICAgIGQ6IHRoaXMuZCxcbiAgICAgICAgICAgICAgICBlOiB0aGlzLmUsXG4gICAgICAgICAgICAgICAgZjogdGhpcy5mXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5hID0gb2xkLmQgLyBkZXQ7XG4gICAgICAgICAgICB0aGlzLmIgPSAtb2xkLmIgLyBkZXQ7XG4gICAgICAgICAgICB0aGlzLmMgPSAtb2xkLmMgLyBkZXQ7XG4gICAgICAgICAgICB0aGlzLmQgPSBvbGQuYSAvIGRldDtcbiAgICAgICAgICAgIHRoaXMuZSA9IChvbGQuYyAqIG9sZC5mIC0gb2xkLmUgKiBvbGQuZCkgLyBkZXQ7XG4gICAgICAgICAgICB0aGlzLmYgPSAob2xkLmUgKiBvbGQuYiAtIG9sZC5hICogb2xkLmYpIC8gZGV0O1xuICAgICAgICB9IC8vIGlmXG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gaW52ZXJ0XG5cblx0LyoqQFxuXHQgKiAjLmlzSWRlbnRpdHlcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBSZXR1cm5zIHRydWUgaWYgdGhpcyBtYXRyaXggaXMgdGhlIGlkZW50aXR5IG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7Qm9vbGVhbn0gaXNJZGVudGl0eSgpO1xuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmlzSWRlbnRpdHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYSA9PT0gMSAmJiB0aGlzLmIgPT09IDAgJiYgdGhpcy5jID09PSAwICYmIHRoaXMuZCA9PT0gMSAmJiB0aGlzLmUgPT09IDAgJiYgdGhpcy5mID09PSAwO1xuICAgIH07IC8vIGlzSWRlbnRpdHlcblxuXHQvKipAXG5cdCAqICMuaXNJbnZlcnRpYmxlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogRGV0ZXJtaW5lcyBpcyB0aGlzIG1hdHJpeCBpcyBpbnZlcnRpYmxlLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7Qm9vbGVhbn0gaXNJbnZlcnRpYmxlKCk7XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufSB0cnVlIGlmIHRoaXMgbWF0cml4IGlzIGludmVydGlibGVcblx0ICogQHNlZSAuaW52ZXJ0XG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5pc0ludmVydGlibGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV0ZXJtaW5hbnQoKSAhPT0gMDtcbiAgICB9OyAvLyBpc0ludmVydGlibGVcblxuXHQvKipAXG5cdCAqICMucHJlUm90YXRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIGNvdW50ZXItY2xvY2t3aXNlIHByZS1yb3RhdGlvbiB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHByZVJvdGF0ZShOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge251bWJlcn0gcmFkcyAtIGFuZ2xlIHRvIHJvdGF0ZSBpbiByYWRpYW5zXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggYWZ0ZXIgcHJlLXJvdGF0aW9uXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5wcmVSb3RhdGUgPSBmdW5jdGlvbihyYWRzKSB7XG4gICAgICAgIHZhciBuQ29zID0gTWF0aC5jb3MocmFkcyk7XG4gICAgICAgIHZhciBuU2luID0gTWF0aC5zaW4ocmFkcyk7XG5cbiAgICAgICAgdmFyIHRtcCA9IHRoaXMuYTtcbiAgICAgICAgdGhpcy5hID0gbkNvcyAqIHRtcCAtIG5TaW4gKiB0aGlzLmI7XG4gICAgICAgIHRoaXMuYiA9IG5TaW4gKiB0bXAgKyBuQ29zICogdGhpcy5iO1xuICAgICAgICB0bXAgPSB0aGlzLmM7XG4gICAgICAgIHRoaXMuYyA9IG5Db3MgKiB0bXAgLSBuU2luICogdGhpcy5kO1xuICAgICAgICB0aGlzLmQgPSBuU2luICogdG1wICsgbkNvcyAqIHRoaXMuZDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBwcmVSb3RhdGVcblxuXHQvKipAXG5cdCAqICMucHJlU2NhbGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgcHJlLXNjYWxpbmcgdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBwcmVTY2FsZShOdW1iZXJbLCBOdW1iZXJdKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxhclhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtzY2FsYXJZXSBzY2FsYXJYIGlzIHVzZWQgaWYgc2NhbGFyWSBpcyB1bmRlZmluZWRcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIGFmdGVyIHByZS1zY2FsaW5nXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5wcmVTY2FsZSA9IGZ1bmN0aW9uKHNjYWxhclgsIHNjYWxhclkpIHtcbiAgICAgICAgaWYgKHNjYWxhclkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHNjYWxhclkgPSBzY2FsYXJYO1xuXG4gICAgICAgIHRoaXMuYSAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLmIgKj0gc2NhbGFyWTtcbiAgICAgICAgdGhpcy5jICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMuZCAqPSBzY2FsYXJZO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHByZVNjYWxlXG5cblx0LyoqQFxuXHQgKiAjLnByZVRyYW5zbGF0ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBwcmUtdHJhbnNsYXRpb24gdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBwcmVUcmFuc2xhdGUoVmVjdG9yMkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBwcmVUcmFuc2xhdGUoTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge051bWJlcnxWZWN0b3IyRH0gZHhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGR5XG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggYWZ0ZXIgcHJlLXRyYW5zbGF0aW9uXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkeCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgdGhpcy5lICs9IGR4O1xuICAgICAgICAgICAgdGhpcy5mICs9IGR5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lICs9IGR4Lng7XG4gICAgICAgICAgICB0aGlzLmYgKz0gZHgueTtcbiAgICAgICAgfSAvLyBlbHNlXG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gcHJlVHJhbnNsYXRlXG5cblx0LyoqQFxuXHQgKiAjLnJvdGF0ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBjb3VudGVyLWNsb2Nrd2lzZSBwb3N0LXJvdGF0aW9uIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gcm90YXRlKE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSByYWRzIC0gYW5nbGUgdG8gcm90YXRlIGluIHJhZGlhbnNcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBhZnRlciByb3RhdGlvblxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24ocmFkcykge1xuICAgICAgICB2YXIgbkNvcyA9IE1hdGguY29zKHJhZHMpO1xuICAgICAgICB2YXIgblNpbiA9IE1hdGguc2luKHJhZHMpO1xuXG4gICAgICAgIHZhciB0bXAgPSB0aGlzLmE7XG4gICAgICAgIHRoaXMuYSA9IG5Db3MgKiB0bXAgLSBuU2luICogdGhpcy5iO1xuICAgICAgICB0aGlzLmIgPSBuU2luICogdG1wICsgbkNvcyAqIHRoaXMuYjtcbiAgICAgICAgdG1wID0gdGhpcy5jO1xuICAgICAgICB0aGlzLmMgPSBuQ29zICogdG1wIC0gblNpbiAqIHRoaXMuZDtcbiAgICAgICAgdGhpcy5kID0gblNpbiAqIHRtcCArIG5Db3MgKiB0aGlzLmQ7XG4gICAgICAgIHRtcCA9IHRoaXMuZTtcbiAgICAgICAgdGhpcy5lID0gbkNvcyAqIHRtcCAtIG5TaW4gKiB0aGlzLmY7XG4gICAgICAgIHRoaXMuZiA9IG5TaW4gKiB0bXAgKyBuQ29zICogdGhpcy5mO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHJvdGF0ZVxuXG5cdC8qKkBcblx0ICogIy5zY2FsZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBwb3N0LXNjYWxpbmcgdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBzY2FsZShOdW1iZXJbLCBOdW1iZXJdKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxhclhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtzY2FsYXJZXSBzY2FsYXJYIGlzIHVzZWQgaWYgc2NhbGFyWSBpcyB1bmRlZmluZWRcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIGFmdGVyIHBvc3Qtc2NhbGluZ1xuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbihzY2FsYXJYLCBzY2FsYXJZKSB7XG4gICAgICAgIGlmIChzY2FsYXJZID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBzY2FsYXJZID0gc2NhbGFyWDtcblxuICAgICAgICB0aGlzLmEgKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy5iICo9IHNjYWxhclk7XG4gICAgICAgIHRoaXMuYyAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLmQgKj0gc2NhbGFyWTtcbiAgICAgICAgdGhpcy5lICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMuZiAqPSBzY2FsYXJZO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHNjYWxlXG5cblx0LyoqQFxuXHQgKiAjLnNldFZhbHVlc1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIFNldHMgdGhlIHZhbHVlcyBvZiB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHNldFZhbHVlcyhNYXRyaXgyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHNldFZhbHVlcyhOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtNYXRyaXgyRHxOdW1iZXJ9IGFcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGJcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGZcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBjb250YWluaW5nIHRoZSBuZXcgdmFsdWVzXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbihhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgICAgIGlmIChhIGluc3RhbmNlb2YgTWF0cml4MkQpIHtcbiAgICAgICAgICAgIHRoaXMuYSA9IGEuYTtcbiAgICAgICAgICAgIHRoaXMuYiA9IGEuYjtcbiAgICAgICAgICAgIHRoaXMuYyA9IGEuYztcbiAgICAgICAgICAgIHRoaXMuZCA9IGEuZDtcbiAgICAgICAgICAgIHRoaXMuZSA9IGEuZTtcbiAgICAgICAgICAgIHRoaXMuZiA9IGEuZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYSA9IGE7XG4gICAgICAgICAgICB0aGlzLmIgPSBiO1xuICAgICAgICAgICAgdGhpcy5jID0gYztcbiAgICAgICAgICAgIHRoaXMuZCA9IGQ7XG4gICAgICAgICAgICB0aGlzLmUgPSBlO1xuICAgICAgICAgICAgdGhpcy5mID0gZjtcbiAgICAgICAgfSAvLyBlbHNlXG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc2V0VmFsdWVzXG5cblx0LyoqQFxuXHQgKiAjLnRvU3RyaW5nXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogUmV0dXJucyB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgbWF0cml4LlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7U3RyaW5nfSB0b1N0cmluZygpO1xuXHQgKiBAcmV0dXJucyB7U3RyaW5nfVxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFwiTWF0cml4MkQoW1wiICsgdGhpcy5hICsgXCIsIFwiICsgdGhpcy5jICsgXCIsIFwiICsgdGhpcy5lICtcbiAgICAgICAgICAgIFwiXSBbXCIgKyB0aGlzLmIgKyBcIiwgXCIgKyB0aGlzLmQgKyBcIiwgXCIgKyB0aGlzLmYgKyBcIl0gWzAsIDAsIDFdKVwiO1xuICAgIH07IC8vIHRvU3RyaW5nXG5cblx0LyoqQFxuXHQgKiAjLnRyYW5zbGF0ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBwb3N0LXRyYW5zbGF0aW9uIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gdHJhbnNsYXRlKFZlY3RvcjJEKTtcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gdHJhbnNsYXRlKE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ8VmVjdG9yMkR9IGR4XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkeVxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGFmdGVyIHBvc3QtdHJhbnNsYXRpb25cblx0ICovXG5cdE1hdHJpeDJELnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoZHgsIGR5KSB7XG5cdFx0aWYgKHR5cGVvZiBkeCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0dGhpcy5lICs9IHRoaXMuYSAqIGR4ICsgdGhpcy5jICogZHk7XG5cdFx0XHR0aGlzLmYgKz0gdGhpcy5iICogZHggKyB0aGlzLmQgKiBkeTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lICs9IHRoaXMuYSAqIGR4LnggKyB0aGlzLmMgKiBkeC55O1xuXHRcdFx0dGhpcy5mICs9IHRoaXMuYiAqIGR4LnggKyB0aGlzLmQgKiBkeC55O1xuXHRcdH0gLy8gZWxzZVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0gLy8gdHJhbnNsYXRlXG5cblx0cmV0dXJuIE1hdHJpeDJEO1xufSkoKTtcblxuLyoqQFxuKiAjQ3JhZnR5IFRpbWVcbiogQGNhdGVnb3J5IFV0aWxpdGllc1xuKi9cbkNyYWZ0eS5jKFwiRGVsYXlcIiwge1xuXHRpbml0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fZGVsYXlzID0gW107XG5cdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdGZvcih2YXIgaW5kZXggaW4gdGhpcy5fZGVsYXlzKSB7XG5cdFx0XHRcdHZhciBpdGVtID0gdGhpcy5fZGVsYXlzW2luZGV4XTtcblx0XHRcdFx0aWYoIWl0ZW0udHJpZ2dlcmVkICYmIGl0ZW0uc3RhcnQgKyBpdGVtLmRlbGF5ICsgaXRlbS5wYXVzZSA8IG5vdykge1xuXHRcdFx0XHRcdGl0ZW0udHJpZ2dlcmVkPXRydWU7XG5cdFx0XHRcdFx0aXRlbS5mdW5jLmNhbGwodGhpcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmJpbmQoXCJQYXVzZVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdGZvcih2YXIgaW5kZXggaW4gdGhpcy5fZGVsYXlzKSB7XG5cdFx0XHRcdHRoaXMuX2RlbGF5c1tpbmRleF0ucGF1c2VCdWZmZXIgPSBub3c7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5iaW5kKFwiVW5wYXVzZVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdGZvcih2YXIgaW5kZXggaW4gdGhpcy5fZGVsYXlzKSB7XG5cdFx0XHRcdHZhciBpdGVtID0gdGhpcy5fZGVsYXlzW2luZGV4XTtcblx0XHRcdFx0aXRlbS5wYXVzZSArPSBub3ctaXRlbS5wYXVzZUJ1ZmZlcjtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbiAgICAvKipAXG5cdCogIy5kZWxheVxuXHQqIEBjb21wIENyYWZ0eSBUaW1lXG5cdCogQHNpZ24gcHVibGljIHRoaXMuZGVsYXkoRnVuY3Rpb24gY2FsbGJhY2ssIE51bWJlciBkZWxheSlcblx0KiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSBhZnRlciBnaXZlbiBhbW91bnQgb2YgbWlsbGlzZWNvbmRzXG5cdCogQHBhcmFtIGRlbGF5IC0gQW1vdW50IG9mIG1pbGxpc2Vjb25kcyB0byBleGVjdXRlIHRoZSBtZXRob2Rcblx0KiBcblx0KiBUaGUgZGVsYXkgbWV0aG9kIHdpbGwgZXhlY3V0ZSBhIGZ1bmN0aW9uIGFmdGVyIGEgZ2l2ZW4gYW1vdW50IG9mIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuXHQqIFxuXHQqIEl0IGlzIG5vdCBhIHdyYXBwZXIgZm9yIGBzZXRUaW1lb3V0YC5cblx0KiBcblx0KiBJZiBDcmFmdHkgaXMgcGF1c2VkLCB0aGUgZGVsYXkgaXMgaW50ZXJydXB0ZWQgd2l0aCB0aGUgcGF1c2UgYW5kIHRoZW4gcmVzdW1lIHdoZW4gdW5wYXVzZWRcblx0KlxuXHQqIElmIHRoZSBlbnRpdHkgaXMgZGVzdHJveWVkLCB0aGUgZGVsYXkgaXMgYWxzbyBkZXN0cm95ZWQgYW5kIHdpbGwgbm90IGhhdmUgZWZmZWN0LiBcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogY29uc29sZS5sb2coXCJzdGFydFwiKTtcblx0KiB0aGlzLmRlbGF5KGZ1bmN0aW9uKCkge1xuXHQgICAgIGNvbnNvbGUubG9nKFwiMTAwbXMgbGF0ZXJcIik7XG5cdCogfSwgMTAwKTtcblx0KiB+fn5cblx0Ki9cblx0ZGVsYXkgOiBmdW5jdGlvbihmdW5jLCBkZWxheSkge1xuXHRcdHJldHVybiB0aGlzLl9kZWxheXMucHVzaCh7XG5cdFx0XHRzdGFydCA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuXHRcdFx0ZnVuYyA6IGZ1bmMsXG5cdFx0XHRkZWxheSA6IGRlbGF5LFxuXHRcdFx0dHJpZ2dlcmVkIDogZmFsc2UsXG5cdFx0XHRwYXVzZUJ1ZmZlcjogMCxcblx0XHRcdHBhdXNlOiAwXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG59KTtcblxufSkoKSIsIiBcbnZhciBDcmFmdHkgPSByZXF1aXJlKCAnLi9saWIvY3JhZnR5JyApO1xuXG5leHBvcnRzLkZQUyA9IGZ1bmN0aW9uKCBlbCwgbWF4VmFsdWUgKVxue1xuICB2YXIgZnBzID0gQ3JhZnR5LmUoICcyRCwgQ2FudmFzLCBGUFMnICk7XG4gIGZwcy5hdHRyKCB7IG1heFZhbHVlOiBtYXhWYWx1ZSB9IClcbiAgQ3JhZnR5LmJpbmQoICdNZXNzdXJlRlBTJywgZnVuY3Rpb24oIGZwcyApIHtcbiAgICBlbC5pbm5lckhUTUwgPSBmcHMudmFsdWU7XG4gIH0gKTtcbn07IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbkNyYWZ0eS5zY2VuZSgnTG9hZGluZycsIGZ1bmN0aW9uKCkge1xuICB2YXIgbW9kdWxlcyA9IHtcbiAgICBTaGFwZTogJ1JFTEVBU0UnLFxuICAgIE1vdXNlRmFjZTogJ1JFTEVBU0UnXG4gIH07XG4gIFxuICBDcmFmdHkubW9kdWxlcyhtb2R1bGVzLCBkb25lKTtcblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIENyYWZ0eS5zY2VuZSgnR2FtZScpO1xuICB9XG59KTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCAnLi9saWIvY3JhZnR5JyApO1xuXG5DcmFmdHkuYygnQWN0b3InLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJELCBDYW52YXMnKTtcbiAgfSxcbiAgc3RvcE9uU29saWQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub25IaXQoJ1NvbGlkJywgdGhpcy5zdG9wTW92ZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzdG9wTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NwZWVkID0gMDtcbiAgICBpZiAodGhpcy5fbW92ZW1lbnQpIHtcbiAgICAgIHRoaXMueCAtPSB0aGlzLl9tb3ZlbWVudC54O1xuICAgICAgdGhpcy55IC09IHRoaXMuX21vdmVtZW50Lnk7XG4gICAgfVxuICB9XG59ICk7IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoICcuL2JvdW5kZWQnICk7XG5yZXF1aXJlKCAnLi9zaG9vdGVyJyApO1xuXG5DcmFmdHkuYygnU2hpcCcsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnQWN0b3IsIEJvdW5kZWQsIFNob290ZXIsIEZvdXJ3YXksIE1vdXNlRmFjZSwgQ29sb3IsIENvbGxpc2lvbicpO1xuICAgIHRoaXMuZm91cndheSg0KTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgdzogMTAsXG4gICAgICBoOiAyMCxcbiAgICAgIHg6IDEwMCxcbiAgICAgIHk6IDEwMCxcbiAgICAgIGN1ckFuZ2xlOiAwXG4gICAgfSk7XG4gICAgdGhpcy5vcmlnaW4oJ2NlbnRlcicpO1xuICAgIHRoaXMuY29sb3IoJ3doaXRlJyk7XG4gICAgdGhpcy5zdG9wT25Tb2xpZCgpO1xuICAgIHRoaXMuTW91c2VGYWNlKHt4OiAwLCB5OiAwfSk7XG5cbiAgICB0aGlzLmJpbmQoJ01vdXNlTW92ZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICB0aGlzLm9yaWdpbignY2VudGVyJyk7XG4gICAgICB0aGlzLmN1ckFuZ2xlID0gZS5ncmFkICsgOTA7XG4gICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5jdXJBbmdsZTtcbiAgICB9KTtcblxuICAgIHRoaXMuYmluZCgnTW91c2VVcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRoaXMuc2hvb3QodGhpcy5fZGlyQW5nbGUgKyBNYXRoLlBJLCA1KTtcbiAgICB9KTtcbiAgfVxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSggJy4vbGliL2NyYWZ0eScgKTtcblxuQ3JhZnR5LmMoJ1BsYW5ldCcsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnQWN0b3IsIFNoYXBlLCBTb2xpZCwgQ29sb3IsIENvbGxpc2lvbiwgVGludCcpO1xuICAgIHRoaXMub3JpZ2luKCdjZW50ZXInKTtcbiAgICB0aGlzLmNpcmNsZSg1MCk7XG4gICAgdGhpcy5jb2xvcignd2hpdGUnKTtcbiAgICB0aGlzLmJpbmQoJ0J1bGxldEhpdCcsIHRoaXMucHVsc2F0ZSgncmVkJykpO1xuICB9LFxuICBwdWxzYXRlOiBmdW5jdGlvbihjb2xvcikge1xuICAgIHJldHVybiAoZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnRpbnQoY29sb3IsIDAuMyk7XG4gICAgICB0aGlzLnRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY29sb3IoJ3doaXRlJyk7XG4gICAgICB9LmJpbmQodGhpcyksIDMwMCk7XG4gICAgfSkuYmluZCh0aGlzKTtcbiAgfVxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSggJy4vbGliL2NyYWZ0eScgKTtcblxuQ3JhZnR5LmMoJ0JvdW5kZWQnLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJELCBDYW52YXMnKTtcbiAgICB0aGlzLmJpbmQoJ01vdmVkJywgZnVuY3Rpb24oZnJvbSkge1xuICAgICAgaWYodGhpcy5pc091dE9mQm91bmRzKCkpIHtcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ0hpdEJvdW5kcycpO1xuICAgICAgICAgIHRoaXMuYXR0cih7XG4gICAgICAgICAgICB4OiBmcm9tLngsIFxuICAgICAgICAgICAgeTogZnJvbS55XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGlzT3V0T2ZCb3VuZHM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnggKyB0aGlzLncgPiBDcmFmdHkudmlld3BvcnQud2lkdGggLyAyIHx8XG4gICAgICAgICAgIHRoaXMueCAtIDEwIDwgLUNyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oID4gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy55IC0gMTAgPCAtQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDI7XG4gIH1cbn0gKTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9idWxsZXQnKTtcblxuQ3JhZnR5LmMoJ1Nob290ZXInLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJEJyk7XG4gIH0sXG4gIHNob290OiBmdW5jdGlvbihhbmdsZSwgc3BlZWQpIHtcbiAgICBDcmFmdHkuZSgnQnVsbGV0JykuYnVsbGV0KHtcbiAgICAgIGF0dHI6IHtcbiAgICAgICAgeDogdGhpcy54LFxuICAgICAgICB5OiB0aGlzLnksXG4gICAgICAgIGFuZ2xlOiBhbmdsZSxcbiAgICAgICAgc3BlZWQ6IHNwZWVkIHx8wqA1XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0pO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoJy4vYm91bmRlZCcpO1xuXG5DcmFmdHkuYygnQnVsbGV0Jywge1xuXG4gIC8vIEZJWE1FOiBPcHRpbWl6ZSBsYXRlciwgYW5kIHJlZmFjdG9yXG4gIGJ1bGxldDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmKG9wdGlvbnMuYXR0cikge1xuICAgICAgdGhpcy5hdHRyKG9wdGlvbnMuYXR0cik7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuY29sb3IpIHtcbiAgICAgIHRoaXMuY29sb3Iob3B0aW9ucy5jb2xvcik7XG4gICAgfVxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJ0JvdW5kZWQsIENvbG9yLCBDb2xsaXNpb24nKTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgdzogMyxcbiAgICAgIGg6IDMsXG4gICAgICBzcGVlZDogNVxuICAgIH0pO1xuICAgIHRoaXMuY29sb3IoJyNGQTU2NTYnKTtcbiAgICB0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCB0aGlzLl9lbnRlcmVkRnJhbWUpO1xuICAgIHRoaXMuYmluZCgnSGl0Qm91bmRzJywgdGhpcy5kZXN0cm95KTtcbiAgICB0aGlzLm9uSGl0KCdTb2xpZCcsIHRoaXMuX2hpdE9iamVjdCk7XG4gIH0sXG5cbiAgX2hpdE9iamVjdDogZnVuY3Rpb24oZSkge1xuICAgIGlmKCFlLmxlbmd0aCB8fCAhZVswXS5vYmopIHJldHVybjtcbiAgICBlWzBdLm9iai50cmlnZ2VyKCdCdWxsZXRIaXQnLCB7IGJ1bGxldDogdGhpcyB9KTtcbiAgICB0aGlzLmRlc3Ryb3koKTtcbiAgfSxcblxuICBfZW50ZXJlZEZyYW1lOiBmdW5jdGlvbihmcmFtZSkge1xuICAgIHRoaXMueCArPSBNYXRoLmNvcyh0aGlzLmFuZ2xlKSAqIHRoaXMuc3BlZWQ7XG4gICAgdGhpcy55ICs9IE1hdGguc2luKHRoaXMuYW5nbGUpICogdGhpcy5zcGVlZDtcbiAgfVxuXG59KTsiXX0=
;