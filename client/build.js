;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){

var Crafty = require('./lib/crafty'),
    Stats  = require('./stats');

require('./loading');
require('./actor');
require('./health');
require('./playership');
require('./planet');
require('./satellite');

var Game = module.exports = {

  start: function() {
    Crafty.init(800, 600);
    Crafty.viewport.bounds = {
      min: {
        x: -Crafty.viewport.width / 2,
        y: -Crafty.viewport.height / 2
      },
      max: {
        x: Crafty.viewport.width / 2,
        y: Crafty.viewport.height / 2
      }
    };
    Crafty.canvas.init();
    Crafty.background('black');
    Crafty.scene('Loading');
    Stats.FPS(document.querySelector('#fps'));
  }

};

Crafty.scene('Game', function() {
  this.player = Crafty.e('PlayerShip');
  this.player.attr({ x: Crafty.math.randomInt(-350, 350), y: Crafty.math.randomInt(-100, -250) });
  this.player.go();
  this.planet = Crafty.e('Planet');
  this.planet.bind('Die', function() {
    Crafty.trigger('GameOver');
  });
  Crafty.e('Health').health(this.player);
  Crafty.e('Health').health(this.planet);
  Crafty.viewport.centerOn(this.planet, 1); 
});

Crafty.bind('GameOver', function() {
  Crafty('Actor').destroy();
  Crafty.scene('GameOver');
});

Crafty.scene('GameOver', function() {
  Crafty.e('2D, DOM, Text')
    .attr({x: -50, y: -10, w: 200, h: 20})
    .text('Game OVER!');
});

window.addEventListener('load', Game.start);

},{"./lib/crafty":2,"./stats":3,"./loading":4,"./actor":5,"./health":6,"./playership":7,"./planet":8,"./satellite":9}],2:[function(require,module,exports){
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
 
var Crafty = require('./lib/crafty');

exports.FPS = function( el, maxValue )
{
  var fps = Crafty.e( '2D, Canvas, FPS' );
  fps.attr( { maxValue: maxValue } )
  Crafty.bind( 'MessureFPS', function( fps ) {
    el.innerHTML = fps.value;
  } );
};
},{"./lib/crafty":2}],4:[function(require,module,exports){

var Crafty = require('./lib/crafty'),
    client = require('./client');

require('./queue');

Crafty.scene('Loading', function() {
  var modules = {
      Shape: 'RELEASE',
      MouseFace: 'RELEASE'
    },
    i = 2;

  Crafty.modules(modules, done);
  client.connect(done);

  function done() {
    if(--i === 0) {
      Crafty.scene('Queue');
    }
  }
});
},{"./lib/crafty":2,"./client":10,"./queue":11}],5:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.c('Actor', {
  init: function() {
    this.requires('2D, Canvas, Solid');
    this.attr({
      health: 100
    });
    this.bind('ProjectileHit', this._wasHit);
    this.bind('Die', this.die);
  },

  die: function() {
    this.destroy();
  },
  
  stopOnSolid: function() {
    this.onHit('Solid', function() {
      this.stopMovement();
    });
    return this;
  },
  
  stopMovement: function(lastPosition) {
    this._speed = 0;
    if(lastPosition) {
      this.x = lastPosition.x;
      this.y = lastPosition.y;
    }
    else if (this._movement) {
      this.x -= this._movement.x;
      this.y -= this._movement.y;
    }
  },

  _wasHit: function(event) {
    var newHealth = this.health - event.projectile.damages;
    this.attr('health', newHealth);
    this.trigger('Wound', { health: newHealth, damages: event.projectile.damages });
    if( newHealth <= 0 ) {
      this.trigger('Die');
    }
  }
} );
},{"./lib/crafty":2}],7:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require( './ship' );
require( './bounded' );
require( './mouseshooter' );

Crafty.c('PlayerShip', {
  name: 'PlayerShip',
  init: function() {
    this.requires('Ship, Bounded, MouseShooter, Fourway, MouseFace');
    this.fourway(4);
    this.stopOnSolid();
    this.MouseFace({x: 0, y: 0});

    this.bind('MouseMoved', function(e) {
      this.origin('center');
      this.curAngle = e.grad + 90;
      this.rotation = this.curAngle;
    });

    this.bind('StartShooting', this._shoot);
    this.bind('HitBounds', this.stopMovement);
    this.bind('Die', function() {
      Crafty.trigger('DestroyShip');
    });
  },

  go: function() {
    this.sendUpdate();
  },

  sendUpdate: function() {
    this.timeout(function() {
      Crafty.trigger('UpdateShip', this.serialize());
      this.sendUpdate();
    }, 10);
  }

} );

},{"./lib/crafty":2,"./ship":12,"./bounded":13,"./mouseshooter":14}],6:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.c('Health', {

  init: function() {
    this.requires('2D, Canvas, Color');
    this.color('green');
    return this;
  },

  health: function(actor) {
    this.attr('healthWidth', Math.max((actor.radius) ? 2 * actor.radius : actor.w, 30));
    this.attr({
      maxHealth: actor.health,
      w: this.healthWidth,
      h: 4,
      x: actor.x,
      y: actor.y - 20
    });
    actor.bind('Change', this._updateHealth.bind(this));
    actor.bind('Moved', this._updateHealth.bind(this));
    this._updateHealth({health: actor.health, x: actor.x, y: actor.y});
  },

  _updateHealth: function(props) {
    if(!props) return;
    if('health' in props) {
      this.attr('w', Math.floor((props.health / this.maxHealth) * this.healthWidth));
    }
    if('x' in props) {
      this.attr('x', props.x);
    }
    if('y' in props) {
      this.attr('y', props.y - 20);
    }
  }

});
},{"./lib/crafty":2}],8:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.c('Planet', {
  name: 'Planet',
  init: function() {
    this.requires('Actor, Shape, Solid, Color, Collision, Tint');
    this.origin('center');
    this.circle(50);
    this.color('white');
    this.bind('ProjectileHit', this._planetWasHit);
    this.attr({
      health: 200
    });
  },

  pulsate: function(color) {
    this.tint(color, 0.5);
    this.timeout(function() {
      this.color('white');
    }.bind(this), 200);
  },

  _planetWasHit: function(event) {
    this.pulsate('red');
  }

} );

},{"./lib/crafty":2}],9:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  name: 'Satellite',
  init: function() {
    this.requires('Actor, Solid, Projectile, Color');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.color('#B70011');
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.attr({
      health: 2,
      damages: 10,
      speed: 3
    });
  },
  go: function() {
    this.target(Crafty('Planet'));
  }
} );

},{"./lib/crafty":2,"./projectile":15}],10:[function(require,module,exports){

var Crafty = require('./lib/crafty'),
    connect = require('./socket'),
    slice = Array.prototype.slice;

require('./netship');
require('./satellite');

module.exports = {
  id: null,
  socket: null,

  connect: function(cb) {
    connect((function(ws) {
      this.socket = ws;
      ws.onmessage = this.onMessage.bind(this);
      this.bindEvents();
      cb && cb(ws);
    }).bind(this));
  },

  bindEvents: function() {
    Crafty.bind('Ready', this.callMethod('ready'));
    Crafty.bind('GameOver', this.callMethod('gameOver'));
    Crafty.bind('UpdateShip', function(ship) {
      this.callMethod('updateShip', ship)();
    }.bind(this));
    Crafty.bind('DestroyShip', this.callMethod('destroyShip'));
  },

  callMethod: function(method /*, params... */) {
    var params = slice.call(arguments, 1);
    return function() {
      this.socket.send(JSON.stringify({
        id: this.id,
        method: method,
        params: params
      }));
    }.bind(this);
  },

  onMessage: function(e) {
    var data = JSON.parse(e.data);
    if(!data || !data.method || !this[data.method]) {
      console.error('Error: cannot call method: ', data && data.method);
      return;
    }
    this[data.method].apply(this,data.params);
  },

  setID: function(id) {
    this.id = id;
  },

  ships: {},

  updateShip: function(id, attr) {
    if(id === this.id) return;
    if(!this.ships[id]) {
      this.ships[id] = Crafty.e('NetShip');
    }
    this.ships[id].attr(attr);
  },

  destroyShip: function(id) {
    if(id === this.id) return;
    this.ships[id] && this.ships[id].destroy();
    delete this.ships[id];
  },

  spawn: function(type, attr) {
    var obj = Crafty.e(type);
    obj.attr(attr || {});
    if (typeof obj.go === 'function') {
        obj.go();
    }
  },


  play: function() {
    Crafty.scene('Game');
  }
};


},{"./lib/crafty":2,"./socket":16,"./netship":17,"./satellite":9}],11:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.scene('Queue', function() {
  Crafty.e('2D, DOM, Text')
    .attr({x: Crafty.viewport.width / 2 - 160, y: Crafty.viewport.height / 2 - 10, w: 320, h: 20})
    .text('Press space when you\'re ready...')
    .bind('KeyDown', function(e) {
      if(e.key !== Crafty.keys.SPACE) {
        return;
      }
      this.text('Waiting for others...');
      Crafty.trigger('Ready');
    });
});
},{"./lib/crafty":2}],12:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require( './bounded' );

Crafty.c('Ship', {
  name: 'Ship',
  init: function() {
    this.requires('Actor, Color, Shooter, Collision');
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });
    this.color('white');

    this.bind('Change', function(props) {
      if(props.isShooting) {
        this.trigger('StartShooting');
      }
    });
    this._shoot();
    this.bind('HitBounds', this.stopMovement);
  },

  serialize: function() {
    return {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      _dirAngle: this._dirAngle,
      health: this.health,
      isShooting: this.isShooting,
      origin: this.origin
    };
  },

  _shoot: function()
  {
    this.timeout(this._shoot, 120);
    if(!this.isShooting) {
      return;
    }
    this.shoot(this._dirAngle + Math.PI, 5);
  }
} );

},{"./lib/crafty":2,"./bounded":13}],13:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.c('Bounded', {
  init: function() {
    this.requires('2D, Canvas');
    this._lastInBoundsPosition = null;
    this.bind('EnterFrame', function() {
      if(this.isOutOfBounds()) {
        this.trigger('HitBounds', this._lastInBoundsPosition);
      } else {
        this._lastInBoundsPosition = {
          x: this.x,
          y: this.y
        };
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
},{"./lib/crafty":2}],14:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./shooter');

Crafty.c('MouseShooter', {
  init: function() {
    this.requires('Shooter');
    this.bind('MouseDown', function() {
      this.attr('isShooting', true);
      this.trigger('StartShooting');
    });
    this.bind('MouseUp', function() {
      this.attr('isShooting', false);
      this.trigger('StopShooting');
    });
  }
});

},{"./lib/crafty":2,"./shooter":18}],15:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./offscreen');

Crafty.c('Projectile', {
  init: function() {
    this.requires('2D, Canvas, Offscreen, Collision');
    this.attr({
      w: 20,
      h: 20,
      speed: 3,
      damages: 10
    });
    this.bind('EnterFrame', this._enteredFrame);
    this.onHit('Solid', this._hitObject);
    return this;
  },

  projectile: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.color) {
      this.color(options.color);
    }
    return this;
  },

  target: function(entity) {
      var pos = new Crafty.math.Vector2D(this.x, this.y),
          target = new Crafty.math.Vector2D(entity.x, entity.y),
          angle = pos.angleTo(target);
      this.attr('angle', angle);
      return this;
  },

  _enteredFrame: function(frame) {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  },

  _hitObject: function(events) {
    var self = this;
    if(!events.length) return;
    events.forEach(function(event) {
      event.obj.trigger('ProjectileHit', { projectile: self });
      self.trigger('HitObject', { object: event.obj });
    });
  },
} );

},{"./lib/crafty":2,"./offscreen":19}],16:[function(require,module,exports){

var socketState = {
  socket: null,
  opened: false,
  connect: function(cb) {
    if(!this.opened) {
      this.socket = new WebSocket('ws://' + window.location.hostname + ':8080');
      this.socket.onopen = (function() {
        this.opened = true;
        cb && cb(this.socket);
      }).bind(this);
    }
    return this.socket;
  }
};

module.exports = socketState.connect.bind(socketState);

},{}],17:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./ship');

Crafty.c('NetShip', {
  name: 'NetShip',
  init: function() {
    this.requires('Ship, Bounded');
  }
} );

},{"./lib/crafty":2,"./ship":12}],18:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./bullet');

Crafty.c('Shooter', {
  init: function() {
    this.requires('2D');
    this.attr({
      isShooting: false
    })
  },

  shoot: function(angle, speed) {
    Crafty.e('Bullet').bullet({
      attr: {
        x: this.x + Math.cos(angle) * Math.max(this.w, this.h),
        y: this.y + Math.sin(angle) * Math.max(this.w, this.h),
        angle: angle,
        speed: speed || 5
      }
    });
  }
});

},{"./lib/crafty":2,"./bullet":20}],19:[function(require,module,exports){

var Crafty = require('./lib/crafty'),
    shared = require('../../shared');

Crafty.c('Offscreen', {
  init: function() {
    this.requires('2D, Canvas');
    this.bind('Moved', function(from) {
      if(this.isInBounds()) {
        this.trigger('InBounds');
      }
    });
  },

  offscreen: function() {
    var pos = this.randomOffscreenCoordinates();
    this.x = pos.x;
    this.y = pos.y;
    return this;
  },

  isInBounds: function() {
    return this.x + this.w < Crafty.viewport.width / 2 ||
           this.x - 10 > -Crafty.viewport.width / 2 ||
           this.y + this.h < Crafty.viewport.height / 2 ||
           this.y - 10 > -Crafty.viewport.height / 2;
  },

  randomOffscreenCoordinates: function() {
    return shared.randomOffscreenCoordinates(Crafty.viewport, this);
  }
} );

},{"./lib/crafty":2,"../../shared":21}],21:[function(require,module,exports){

module.exports = {

  randomOffscreenCoordinates: function(viewport, size) {
    var angle = Math.random() * 2 * Math.PI,
        radius = Math.max(viewport.width / 2, viewport.height / 2)
               + Math.max(size.w, size.h);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }

};
},{}],20:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./bounded');

Crafty.c('Bullet', {

  bullet: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.emitter) {
      this.emitter = options.emitter;
    }
    if(options.color) {
      this.color(options.color);
    }
    return this;
  },

  init: function() {
    this.requires('Projectile, Color');
    this.color('#6FB2FF');
    this.bind('EnterFrame', this._enteredFrame);
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.attr({
      w: 3,
      h: 3,
      speed: 5,
      damages: 1
    });
    return this;
  }

});
},{"./lib/crafty":2,"./bounded":13}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvZ2FtZS5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9saWIvY3JhZnR5LmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3N0YXRzLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL2xvYWRpbmcuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvYWN0b3IuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvcGxheWVyc2hpcC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9oZWFsdGguanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvcGxhbmV0LmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3NhdGVsbGl0ZS5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9jbGllbnQuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvcXVldWUuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvc2hpcC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9ib3VuZGVkLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL21vdXNlc2hvb3Rlci5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9wcm9qZWN0aWxlLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3NvY2tldC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9uZXRzaGlwLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3Nob290ZXIuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvb2Zmc2NyZWVuLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvc2hhcmVkLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL2J1bGxldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxNlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKSxcbiAgICBTdGF0cyAgPSByZXF1aXJlKCcuL3N0YXRzJyk7XG5cbnJlcXVpcmUoJy4vbG9hZGluZycpO1xucmVxdWlyZSgnLi9hY3RvcicpO1xucmVxdWlyZSgnLi9oZWFsdGgnKTtcbnJlcXVpcmUoJy4vcGxheWVyc2hpcCcpO1xucmVxdWlyZSgnLi9wbGFuZXQnKTtcbnJlcXVpcmUoJy4vc2F0ZWxsaXRlJyk7XG5cbnZhciBHYW1lID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIENyYWZ0eS5pbml0KDgwMCwgNjAwKTtcbiAgICBDcmFmdHkudmlld3BvcnQuYm91bmRzID0ge1xuICAgICAgbWluOiB7XG4gICAgICAgIHg6IC1DcmFmdHkudmlld3BvcnQud2lkdGggLyAyLFxuICAgICAgICB5OiAtQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDJcbiAgICAgIH0sXG4gICAgICBtYXg6IHtcbiAgICAgICAgeDogQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMixcbiAgICAgICAgeTogQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDJcbiAgICAgIH1cbiAgICB9O1xuICAgIENyYWZ0eS5jYW52YXMuaW5pdCgpO1xuICAgIENyYWZ0eS5iYWNrZ3JvdW5kKCdibGFjaycpO1xuICAgIENyYWZ0eS5zY2VuZSgnTG9hZGluZycpO1xuICAgIFN0YXRzLkZQUyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZnBzJykpO1xuICB9XG5cbn07XG5cbkNyYWZ0eS5zY2VuZSgnR2FtZScsIGZ1bmN0aW9uKCkge1xuICB0aGlzLnBsYXllciA9IENyYWZ0eS5lKCdQbGF5ZXJTaGlwJyk7XG4gIHRoaXMucGxheWVyLmF0dHIoeyB4OiBDcmFmdHkubWF0aC5yYW5kb21JbnQoLTM1MCwgMzUwKSwgeTogQ3JhZnR5Lm1hdGgucmFuZG9tSW50KC0xMDAsIC0yNTApIH0pO1xuICB0aGlzLnBsYXllci5nbygpO1xuICB0aGlzLnBsYW5ldCA9IENyYWZ0eS5lKCdQbGFuZXQnKTtcbiAgdGhpcy5wbGFuZXQuYmluZCgnRGllJywgZnVuY3Rpb24oKSB7XG4gICAgQ3JhZnR5LnRyaWdnZXIoJ0dhbWVPdmVyJyk7XG4gIH0pO1xuICBDcmFmdHkuZSgnSGVhbHRoJykuaGVhbHRoKHRoaXMucGxheWVyKTtcbiAgQ3JhZnR5LmUoJ0hlYWx0aCcpLmhlYWx0aCh0aGlzLnBsYW5ldCk7XG4gIENyYWZ0eS52aWV3cG9ydC5jZW50ZXJPbih0aGlzLnBsYW5ldCwgMSk7IFxufSk7XG5cbkNyYWZ0eS5iaW5kKCdHYW1lT3ZlcicsIGZ1bmN0aW9uKCkge1xuICBDcmFmdHkoJ0FjdG9yJykuZGVzdHJveSgpO1xuICBDcmFmdHkuc2NlbmUoJ0dhbWVPdmVyJyk7XG59KTtcblxuQ3JhZnR5LnNjZW5lKCdHYW1lT3ZlcicsIGZ1bmN0aW9uKCkge1xuICBDcmFmdHkuZSgnMkQsIERPTSwgVGV4dCcpXG4gICAgLmF0dHIoe3g6IC01MCwgeTogLTEwLCB3OiAyMDAsIGg6IDIwfSlcbiAgICAudGV4dCgnR2FtZSBPVkVSIScpO1xufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgR2FtZS5zdGFydCk7XG4iLCIoZnVuY3Rpb24oKXsvKiFcbiogQ3JhZnR5IHYwLjUuM1xuKiBodHRwOi8vY3JhZnR5anMuY29tXG4qXG4qIENvcHlyaWdodCAyMDEwLCBMb3VpcyBTdG93YXNzZXJcbiogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBsaWNlbnNlcy5cbiovXG5cbihmdW5jdGlvbiAod2luZG93LCBpbml0Q29tcG9uZW50cywgdW5kZWZpbmVkKSB7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5XG4gICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICogU2VsZWN0IGEgc2V0IG9mIG9yIHNpbmdsZSBlbnRpdGllcyBieSBjb21wb25lbnRzIG9yIGFuIGVudGl0eSdzIElELlxuICAgICpcbiAgICAqIENyYWZ0eSB1c2VzIHN5bnRheCBzaW1pbGFyIHRvIGpRdWVyeSBieSBoYXZpbmcgYSBzZWxlY3RvciBlbmdpbmUgdG8gc2VsZWN0IGVudGl0aWVzIGJ5IHRoZWlyIGNvbXBvbmVudHMuXG4gICAgKlxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuICAgICogICAgQ3JhZnR5KFwiTXlDb21wb25lbnRcIilcbiAgICAqICAgIENyYWZ0eShcIkhlbGxvIDJEIENvbXBvbmVudFwiKVxuICAgICogICAgQ3JhZnR5KFwiSGVsbG8sIDJELCBDb21wb25lbnRcIilcbiAgICAqIH5+flxuICAgICogXG4gICAgKiBUaGUgZmlyc3Qgc2VsZWN0b3Igd2lsbCByZXR1cm4gYWxsIGVudGl0aWVzIHRoYXQgaGF2ZSB0aGUgY29tcG9uZW50IGBNeUNvbXBvbmVudGAuIFRoZSBzZWNvbmQgd2lsbCByZXR1cm4gYWxsIGVudGl0aWVzIHRoYXQgaGF2ZSBgSGVsbG9gIGFuZCBgMkRgIGFuZCBgQ29tcG9uZW50YCB3aGVyZWFzIHRoZSBsYXN0IHdpbGwgcmV0dXJuIGFsbCBlbnRpdGllcyB0aGF0IGhhdmUgYXQgbGVhc3Qgb25lIG9mIHRob3NlIGNvbXBvbmVudHMgKG9yKS5cbiAgICAqXG4gICAgKiB+fn5cbiAgICAqICAgQ3JhZnR5KFwiKlwiKVxuICAgICogfn5+XG4gICAgKiBQYXNzaW5nIGAqYCB3aWxsIHNlbGVjdCBhbGwgZW50aXRpZXMuXG4gICAgKlxuICAgICogfn5+XG4gICAgKiAgIENyYWZ0eSgxKVxuICAgICogfn5+XG4gICAgKiBQYXNzaW5nIGFuIGludGVnZXIgd2lsbCBzZWxlY3QgdGhlIGVudGl0eSB3aXRoIHRoYXQgYElEYC5cbiAgICAqXG4gICAgKiBGaW5kaW5nIG91dCB0aGUgYElEYCBvZiBhbiBlbnRpdHkgY2FuIGJlIGRvbmUgYnkgcmV0dXJuaW5nIHRoZSBwcm9wZXJ0eSBgMGAuXG4gICAgKiB+fn5cbiAgICAqICAgIHZhciBlbnQgPSBDcmFmdHkuZShcIjJEXCIpO1xuICAgICogICAgZW50WzBdOyAvL0lEXG4gICAgKiB+fn5cbiAgICAqL1xuICAgIHZhciBDcmFmdHkgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDcmFmdHkuZm4uaW5pdChzZWxlY3Rvcik7XG4gICAgfSxcblxuICAgIEdVSUQsIEZQUywgZnJhbWUsIGNvbXBvbmVudHMsIGVudGl0aWVzLCBoYW5kbGVycywgb25sb2FkcywgdGljaywgcmVxdWVzdElELFxuXHRub1NldHRlciwgbG9vcHMsIG1pbGxpU2VjUGVyRnJhbWUsIG5leHRHYW1lVGljaywgc2xpY2UsIHJsaXN0LCByc3BhY2UsXG5cblx0aW5pdFN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIFx0R1VJRCA9IDE7IC8vR1VJRCBmb3IgZW50aXR5IElEc1xuICAgIFx0RlBTID0gNTA7XG4gICAgXHRmcmFtZSA9IDE7XG5cbiAgICBcdGNvbXBvbmVudHMgPSB7fTsgLy9tYXAgb2YgY29tcG9uZW50cyBhbmQgdGhlaXIgZnVuY3Rpb25zXG4gICAgXHRlbnRpdGllcyA9IHt9OyAvL21hcCBvZiBlbnRpdGllcyBhbmQgdGhlaXIgZGF0YVxuICAgICAgICBlbnRpdHlGYWN0b3JpZXMgPSB7fTsgLy90ZW1wbGF0ZXMgb2YgZW50aXRpZXNcbiAgICBcdGhhbmRsZXJzID0ge307IC8vZ2xvYmFsIGV2ZW50IGhhbmRsZXJzXG4gICAgXHRvbmxvYWRzID0gW107IC8vdGVtcG9yYXJ5IHN0b3JhZ2Ugb2Ygb25sb2FkIGhhbmRsZXJzXG4gICAgXHR0aWNrO1xuXG4gICAgXHQvKlxuXHRcdCogYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIG9yIGl0cyB2YXJpYW50cyBpcyBjYWxsZWQgZm9yIGFuaW1hdGlvbi5cblx0XHQqIGAucmVxdWVzdElEYCBrZWVwcyBhIHJlY29yZCBvZiB0aGUgcmV0dXJuIHZhbHVlIHByZXZpb3VzIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBjYWxsLlxuXHRcdCogVGhpcyBpcyBhbiBpbnRlcm5hbCB2YXJpYWJsZS4gVXNlZCB0byBzdG9wIGZyYW1lLlxuXHRcdCovXG4gICAgXHRyZXF1ZXN0SUQ7XG5cbiAgICBcdG5vU2V0dGVyO1xuXG4gICAgXHRsb29wcyA9IDA7XG4gICAgXHRtaWxsaVNlY1BlckZyYW1lID0gMTAwMCAvIEZQUztcbiAgICBcdG5leHRHYW1lVGljayA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xuXG4gICAgXHRzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICBcdHJsaXN0ID0gL1xccyosXFxzKi87XG4gICAgXHRyc3BhY2UgPSAvXFxzKy87XG4gICAgfTtcblxuICAgIGluaXRTdGF0ZSgpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eSBDb3JlXG4gICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICogQHRyaWdnZXIgTmV3RW50aXR5TmFtZSAtIEFmdGVyIHNldHRpbmcgbmV3IG5hbWUgZm9yIGVudGl0eSAtIFN0cmluZyAtIGVudGl0eSBuYW1lXG4gICAgKiBAdHJpZ2dlciBOZXdDb21wb25lbnQgLSB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBhZGRlZCB0byB0aGUgZW50aXR5IC0gU3RyaW5nIC0gQ29tcG9uZW50XG4gICAgKiBAdHJpZ2dlciBSZW1vdmVDb21wb25lbnQgLSB3aGVuIGEgY29tcG9uZW50IGlzIHJlbW92ZWQgZnJvbSB0aGUgZW50aXR5IC0gU3RyaW5nIC0gQ29tcG9uZW50XG4gICAgKiBAdHJpZ2dlciBSZW1vdmUgLSB3aGVuIHRoZSBlbnRpdHkgaXMgcmVtb3ZlZCBieSBjYWxsaW5nIC5kZXN0cm95KClcbiAgICAqIFxuICAgICogU2V0IG9mIG1ldGhvZHMgYWRkZWQgdG8gZXZlcnkgc2luZ2xlIGVudGl0eS5cbiAgICAqL1xuICAgIENyYWZ0eS5mbiA9IENyYWZ0eS5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAvL3NlbGVjdCBlbnRpdGllcyBieSBjb21wb25lbnRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbSA9IDAsIC8vaW5kZXggZWxlbWVudHNcbiAgICAgICAgICAgICAgICBlLCAvL2VudGl0eSBmb3JFYWNoXG4gICAgICAgICAgICAgICAgY3VycmVudCxcbiAgICAgICAgICAgICAgICBhbmQgPSBmYWxzZSwgLy9mbGFncyBmb3IgbXVsdGlwbGVcbiAgICAgICAgICAgICAgICBvciA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlbCxcbiAgICAgICAgICAgICAgICBjb21wcyxcbiAgICAgICAgICAgICAgICBzY29yZSxcbiAgICAgICAgICAgICAgICBpLCBsO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChlIGluIGVudGl0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWytlXSA9IGVudGl0aWVzW2VdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbSsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gZWxlbTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9tdWx0aXBsZSBjb21wb25lbnRzIE9SXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yLmluZGV4T2YoJywnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZWwgPSBybGlzdDtcbiAgICAgICAgICAgICAgICAgICAgLy9kZWFsIHdpdGggbXVsdGlwbGUgY29tcG9uZW50cyBBTkRcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlbGVjdG9yLmluZGV4T2YoJyAnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGVsID0gcnNwYWNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vbG9vcCBvdmVyIGVudGl0aWVzXG4gICAgICAgICAgICAgICAgZm9yIChlIGluIGVudGl0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZW50aXRpZXMuaGFzT3duUHJvcGVydHkoZSkpIGNvbnRpbnVlOyAvL3NraXBcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGVudGl0aWVzW2VdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmQgfHwgb3IpIHsgLy9tdWx0aXBsZSBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wcyA9IHNlbGVjdG9yLnNwbGl0KGRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGwgPSBjb21wcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29yZSA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSAvL2xvb3Agb3ZlciBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQuX19jW2NvbXBzW2ldXSkgc2NvcmUrKzsgLy9pZiBjb21wb25lbnQgZXhpc3RzIGFkZCB0byBzY29yZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2lmIGFuZGVkIGNvbXBzIGFuZCBoYXMgYWxsIE9SIG9yZWQgY29tcHMgYW5kIGF0IGxlYXN0IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmQgJiYgc2NvcmUgPT09IGwgfHwgb3IgJiYgc2NvcmUgPiAwKSB0aGlzW2VsZW0rK10gPSArZTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnQuX19jW3NlbGVjdG9yXSkgdGhpc1tlbGVtKytdID0gK2U7IC8vY29udmVydCB0byBpbnRcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2V4dGVuZCBhbGwgY29tbW9uIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSA+IDAgJiYgIWFuZCAmJiAhb3IpIHRoaXMuZXh0ZW5kKGNvbXBvbmVudHNbc2VsZWN0b3JdKTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcHMgJiYgYW5kKSBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB0aGlzLmV4dGVuZChjb21wb25lbnRzW2NvbXBzW2ldXSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW07IC8vbGVuZ3RoIGlzIHRoZSBsYXN0IGluZGV4IChhbHJlYWR5IGluY3JlbWVudGVkKVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gaWYgdGhlcmUncyBvbmx5IG9uZSBlbnRpdHksIHJldHVybiB0aGUgYWN0dWFsIGVudGl0eVxuXHRcdFx0XHRpZiAoZWxlbSA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiBlbnRpdGllc1t0aGlzW2VsZW0tMV1dO1xuXHRcdFx0XHR9XG5cbiAgICAgICAgICAgIH0gZWxzZSB7IC8vU2VsZWN0IGEgc3BlY2lmaWMgZW50aXR5XG5cbiAgICAgICAgICAgICAgICBpZiAoIXNlbGVjdG9yKSB7IC8vbm90aGluIHBhc3NlZCBjcmVhdGVzIEdvZCBlbnRpdHlcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShzZWxlY3RvciBpbiBlbnRpdGllcykpIGVudGl0aWVzW3NlbGVjdG9yXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9pZiBub3QgZXhpc3RzLCByZXR1cm4gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKCEoc2VsZWN0b3IgaW4gZW50aXRpZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpc1swXSA9IHNlbGVjdG9yO1xuICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gMTtcblxuICAgICAgICAgICAgICAgIC8vdXBkYXRlIGZyb20gdGhlIGNhY2hlXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9fYykgdGhpcy5fX2MgPSB7fTtcblxuICAgICAgICAgICAgICAgIC8vdXBkYXRlIHRvIHRoZSBjYWNoZSBpZiBOVUxMXG4gICAgICAgICAgICAgICAgaWYgKCFlbnRpdGllc1tzZWxlY3Rvcl0pIGVudGl0aWVzW3NlbGVjdG9yXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGl0aWVzW3NlbGVjdG9yXTsgLy9yZXR1cm4gdGhlIGNhY2hlZCBzZWxlY3RvclxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5zZXROYW1lXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuc2V0TmFtZShTdHJpbmcgbmFtZSlcbiAgICAgICAgKiBAcGFyYW0gbmFtZSAtIEEgaHVtYW4gcmVhZGFibGUgbmFtZSBmb3IgZGVidWdnaW5nIHB1cnBvc2VzLlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB0aGlzLnNldE5hbWUoXCJQbGF5ZXJcIik7XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIHNldE5hbWU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICB2YXIgZW50aXR5TmFtZSA9IFN0cmluZyhuYW1lKTtcblxuICAgICAgICAgICAgdGhpcy5fZW50aXR5TmFtZSA9IGVudGl0eU5hbWU7XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIk5ld0VudGl0eU5hbWVcIiwgZW50aXR5TmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5hZGRDb21wb25lbnRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5hZGRDb21wb25lbnQoU3RyaW5nIGNvbXBvbmVudExpc3QpXG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudExpc3QgLSBBIHN0cmluZyBvZiBjb21wb25lbnRzIHRvIGFkZCBzZXBhcmF0ZWQgYnkgYSBjb21tYSBgLGBcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuYWRkQ29tcG9uZW50KFN0cmluZyBDb21wb25lbnQxWywgLi4sIFN0cmluZyBDb21wb25lbnROXSlcbiAgICAgICAgKiBAcGFyYW0gQ29tcG9uZW50IyAtIENvbXBvbmVudCBJRCB0byBhZGQuXG4gICAgICAgICogQWRkcyBhIGNvbXBvbmVudCB0byB0aGUgc2VsZWN0ZWQgZW50aXRpZXMgb3IgZW50aXR5LlxuICAgICAgICAqXG4gICAgICAgICogQ29tcG9uZW50cyBhcmUgdXNlZCB0byBleHRlbmQgdGhlIGZ1bmN0aW9uYWxpdHkgb2YgZW50aXRpZXMuXG4gICAgICAgICogVGhpcyBtZWFucyBpdCB3aWxsIGNvcHkgcHJvcGVydGllcyBhbmQgYXNzaWduIG1ldGhvZHMgdG9cbiAgICAgICAgKiBhdWdtZW50IHRoZSBmdW5jdGlvbmFsaXR5IG9mIHRoZSBlbnRpdHkuXG4gICAgICAgICpcbiAgICAgICAgKiBUaGVyZSBhcmUgbXVsdGlwbGUgbWV0aG9kcyBvZiBhZGRpbmcgY29tcG9uZW50cy4gUGFzc2luZyBhXG4gICAgICAgICogc3RyaW5nIHdpdGggYSBsaXN0IG9mIGNvbXBvbmVudCBuYW1lcyBvciBwYXNzaW5nIG11bHRpcGxlXG4gICAgICAgICogYXJndW1lbnRzIHdpdGggdGhlIGNvbXBvbmVudCBuYW1lcy5cbiAgICAgICAgKlxuICAgICAgICAqIElmIHRoZSBjb21wb25lbnQgaGFzIGEgZnVuY3Rpb24gbmFtZWQgYGluaXRgIGl0IHdpbGwgYmUgY2FsbGVkLlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB0aGlzLmFkZENvbXBvbmVudChcIjJELCBDYW52YXNcIik7XG4gICAgICAgICogdGhpcy5hZGRDb21wb25lbnQoXCIyRFwiLCBcIkNhbnZhc1wiKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgYWRkQ29tcG9uZW50OiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgIHZhciB1bmluaXQgPSBbXSwgYyA9IDAsIHVsLCAvL2FycmF5IG9mIGNvbXBvbmVudHMgdG8gaW5pdFxuICAgICAgICAgICAgaSA9IDAsIGwsIGNvbXBzO1xuXG4gICAgICAgICAgICAvL2FkZCBtdWx0aXBsZSBhcmd1bWVudHNcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jW2FyZ3VtZW50c1tpXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB1bmluaXQucHVzaChhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL3NwbGl0IGNvbXBvbmVudHMgaWYgY29udGFpbnMgY29tbWFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaWQuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGNvbXBzID0gaWQuc3BsaXQocmxpc3QpO1xuICAgICAgICAgICAgICAgIGwgPSBjb21wcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NbY29tcHNbaV1dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdW5pbml0LnB1c2goY29tcHNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL3NpbmdsZSBjb21wb25lbnQgcGFzc2VkXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX19jW2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdW5pbml0LnB1c2goaWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2V4dGVuZCB0aGUgY29tcG9uZW50c1xuICAgICAgICAgICAgdWwgPSB1bmluaXQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICg7IGMgPCB1bDsgYysrKSB7XG4gICAgICAgICAgICAgICAgY29tcCA9IGNvbXBvbmVudHNbdW5pbml0W2NdXTtcbiAgICAgICAgICAgICAgICB0aGlzLmV4dGVuZChjb21wKTtcblxuICAgICAgICAgICAgICAgIC8vaWYgY29uc3RydWN0b3IsIGNhbGwgaXRcbiAgICAgICAgICAgICAgICBpZiAoY29tcCAmJiBcImluaXRcIiBpbiBjb21wKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXAuaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiTmV3Q29tcG9uZW50XCIsIHVsKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnRvZ2dsZUNvbXBvbmVudFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRvZ2dsZUNvbXBvbmVudChTdHJpbmcgQ29tcG9uZW50TGlzdClcbiAgICAgICAgKiBAcGFyYW0gQ29tcG9uZW50TGlzdCAtIEEgc3RyaW5nIG9mIGNvbXBvbmVudHMgdG8gYWRkIG9yIHJlbW92ZSBzZXBhcmF0ZWQgYnkgYSBjb21tYSBgLGBcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudG9nZ2xlQ29tcG9uZW50KFN0cmluZyBDb21wb25lbnQxWywgLi4sIFN0cmluZyBjb21wb25lbnROXSlcbiAgICAgICAgKiBAcGFyYW0gQ29tcG9uZW50IyAtIENvbXBvbmVudCBJRCB0byBhZGQgb3IgcmVtb3ZlLlxuICAgICAgICAqIEFkZCBvciBSZW1vdmUgQ29tcG9uZW50cyBmcm9tIGFuIGVudGl0eS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBlID0gQ3JhZnR5LmUoXCIyRCxET00sVGVzdFwiKTtcbiAgICAgICAgKiBlLnRvZ2dsZUNvbXBvbmVudChcIlRlc3QsVGVzdDJcIik7IC8vUmVtb3ZlIFRlc3QsIGFkZCBUZXN0MlxuICAgICAgICAqIGUudG9nZ2xlQ29tcG9uZW50KFwiVGVzdCxUZXN0MlwiKTsgLy9BZGQgVGVzdCwgcmVtb3ZlIFRlc3QyXG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgZSA9IENyYWZ0eS5lKFwiMkQsRE9NLFRlc3RcIik7XG4gICAgICAgICogZS50b2dnbGVDb21wb25lbnQoXCJUZXN0XCIsXCJUZXN0MlwiKTsgLy9SZW1vdmUgVGVzdCwgYWRkIFRlc3QyXG4gICAgICAgICogZS50b2dnbGVDb21wb25lbnQoXCJUZXN0XCIsXCJUZXN0MlwiKTsgLy9BZGQgVGVzdCwgcmVtb3ZlIFRlc3QyXG4gICAgICAgICogZS50b2dnbGVDb21wb25lbnQoXCJUZXN0XCIpOyAgICAgICAgIC8vUmVtb3ZlIFRlc3RcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICB0b2dnbGVDb21wb25lbnQ6ZnVuY3Rpb24odG9nZ2xlKXtcbiAgICAgICAgICAgIHZhciBpID0gMCwgbCwgY29tcHM7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuaGFzKGFyZ3VtZW50c1tpXSkpeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ29tcG9uZW50KGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vc3BsaXQgY29tcG9uZW50cyBpZiBjb250YWlucyBjb21tYVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0b2dnbGUuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGNvbXBzID0gdG9nZ2xlLnNwbGl0KHJsaXN0KTtcbiAgICAgICAgICAgICAgICBsID0gY29tcHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuaGFzKGNvbXBzW2ldKSl7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQoY29tcHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNvbXBzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIC8vc2luZ2xlIGNvbXBvbmVudCBwYXNzZWRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYodGhpcy5oYXModG9nZ2xlKSl7IFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNvbXBvbmVudCh0b2dnbGUpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0b2dnbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMucmVxdWlyZXNcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5yZXF1aXJlcyhTdHJpbmcgY29tcG9uZW50TGlzdClcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50TGlzdCAtIExpc3Qgb2YgY29tcG9uZW50cyB0aGF0IG11c3QgYmUgYWRkZWRcbiAgICAgICAgKiBcbiAgICAgICAgKiBNYWtlcyBzdXJlIHRoZSBlbnRpdHkgaGFzIHRoZSBjb21wb25lbnRzIGxpc3RlZC4gSWYgdGhlIGVudGl0eSBkb2VzIG5vdFxuICAgICAgICAqIGhhdmUgdGhlIGNvbXBvbmVudCwgaXQgd2lsbCBhZGQgaXQuXG4gICAgICAgICogXG4gICAgICAgICogQHNlZSAuYWRkQ29tcG9uZW50XG4gICAgICAgICovXG4gICAgICAgIHJlcXVpcmVzOiBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgdmFyIGNvbXBzID0gbGlzdC5zcGxpdChybGlzdCksXG4gICAgICAgICAgICBpID0gMCwgbCA9IGNvbXBzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXA7XG5cbiAgICAgICAgICAgIC8vbG9vcCBvdmVyIHRoZSBsaXN0IG9mIGNvbXBvbmVudHMgYW5kIGFkZCBpZiBuZWVkZWRcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgY29tcCA9IGNvbXBzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXMoY29tcCkpIHRoaXMuYWRkQ29tcG9uZW50KGNvbXApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5yZW1vdmVDb21wb25lbnRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5yZW1vdmVDb21wb25lbnQoU3RyaW5nIENvbXBvbmVudFssIHNvZnRdKVxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnQgLSBDb21wb25lbnQgdG8gcmVtb3ZlXG4gICAgICAgICogQHBhcmFtIHNvZnQgLSBXaGV0aGVyIHRvIHNvZnQgcmVtb3ZlIGl0IChkZWZhdWx0cyB0byBgdHJ1ZWApXG4gICAgICAgICpcbiAgICAgICAgKiBSZW1vdmVzIGEgY29tcG9uZW50IGZyb20gYW4gZW50aXR5LiBBIHNvZnQgcmVtb3ZlICh0aGUgZGVmYXVsdCkgd2lsbCBvbmx5XG4gICAgICAgICogcmVmcmFpbiBgLmhhcygpYCBmcm9tIHJldHVybmluZyB0cnVlLiBIYXJkIHdpbGwgcmVtb3ZlIGFsbFxuICAgICAgICAqIGFzc29jaWF0ZWQgcHJvcGVydGllcyBhbmQgbWV0aG9kcy5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGUgPSBDcmFmdHkuZShcIjJELERPTSxUZXN0XCIpO1xuICAgICAgICAqIGUucmVtb3ZlQ29tcG9uZW50KFwiVGVzdFwiKTsgICAgICAgIC8vU29mdCByZW1vdmUgVGVzdCBjb21wb25lbnRcbiAgICAgICAgKiBlLnJlbW92ZUNvbXBvbmVudChcIlRlc3RcIiwgZmFsc2UpOyAvL0hhcmQgcmVtb3ZlIFRlc3QgY29tcG9uZW50XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIHJlbW92ZUNvbXBvbmVudDogZnVuY3Rpb24gKGlkLCBzb2Z0KSB7XG4gICAgICAgICAgICBpZiAoc29mdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSBjb21wb25lbnRzW2lkXSwgcHJvcDtcbiAgICAgICAgICAgICAgICBmb3IgKHByb3AgaW4gcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX19jW2lkXTtcblxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGlkKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmhhc1xuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIEJvb2xlYW4gLmhhcyhTdHJpbmcgY29tcG9uZW50KVxuICAgICAgICAqIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAgZGVwZW5kaW5nIG9uIGlmIHRoZVxuICAgICAgICAqIGVudGl0eSBoYXMgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICAgICAgKlxuICAgICAgICAqIEZvciBiZXR0ZXIgcGVyZm9ybWFuY2UsIHNpbXBseSB1c2UgdGhlIGAuX19jYCBvYmplY3RcbiAgICAgICAgKiB3aGljaCB3aWxsIGJlIGB0cnVlYCBpZiB0aGUgZW50aXR5IGhhcyB0aGUgY29tcG9uZW50IG9yXG4gICAgICAgICogd2lsbCBub3QgZXhpc3QgKG9yIGJlIGBmYWxzZWApLlxuICAgICAgICAqL1xuICAgICAgICBoYXM6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5fX2NbaWRdO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmF0dHJcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5hdHRyKFN0cmluZyBwcm9wZXJ0eSwgKiB2YWx1ZSlcbiAgICAgICAgKiBAcGFyYW0gcHJvcGVydHkgLSBQcm9wZXJ0eSBvZiB0aGUgZW50aXR5IHRvIG1vZGlmeVxuICAgICAgICAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIHNldCB0aGUgcHJvcGVydHkgdG9cbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuYXR0cihPYmplY3QgbWFwKVxuICAgICAgICAqIEBwYXJhbSBtYXAgLSBPYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgcHJvcGVydHkgdG8gbW9kaWZ5IGFuZCB0aGUgdmFsdWUgYXMgdGhlIHByb3BlcnR5IHZhbHVlXG4gICAgICAgICogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiBwcm9wZXJ0aWVzIGNoYW5nZSAtIHtrZXk6IHZhbHVlfVxuICAgICAgICAqIFxuICAgICAgICAqIFVzZSB0aGlzIG1ldGhvZCB0byBzZXQgYW55IHByb3BlcnR5IG9mIHRoZSBlbnRpdHkuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB0aGlzLmF0dHIoe2tleTogXCJ2YWx1ZVwiLCBwcm9wOiA1fSk7XG4gICAgICAgICogdGhpcy5rZXk7IC8vdmFsdWVcbiAgICAgICAgKiB0aGlzLnByb3A7IC8vNVxuICAgICAgICAqXG4gICAgICAgICogdGhpcy5hdHRyKFwia2V5XCIsIFwibmV3dmFsdWVcIik7XG4gICAgICAgICogdGhpcy5rZXk7IC8vbmV3dmFsdWVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgYXR0cjogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgLy9pZiBqdXN0IHRoZSBrZXksIHJldHVybiB0aGUgdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vZXh0ZW5kIGlmIG9iamVjdFxuICAgICAgICAgICAgICAgIHRoaXMuZXh0ZW5kKGtleSk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIsIGtleSk7IC8vdHJpZ2dlciBjaGFuZ2UgZXZlbnRcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vaWYga2V5IHZhbHVlIHBhaXJcbiAgICAgICAgICAgIHRoaXNba2V5XSA9IHZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgY2hhbmdlID0ge307XG4gICAgICAgICAgICBjaGFuZ2Vba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIsIGNoYW5nZSk7IC8vdHJpZ2dlciBjaGFuZ2UgZXZlbnRcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnRvQXJyYXlcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50b0FycmF5KHZvaWQpXG4gICAgICAgICogXG4gICAgICAgICogVGhpcyBtZXRob2Qgd2lsbCBzaW1wbHkgcmV0dXJuIHRoZSBmb3VuZCBlbnRpdGllcyBhcyBhbiBhcnJheS5cbiAgICAgICAgKi9cbiAgICAgICAgdG9BcnJheTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHNsaWNlLmNhbGwodGhpcywgMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMudGltZW91dFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRpbWVvdXQoRnVuY3Rpb24gY2FsbGJhY2ssIE51bWJlciBkZWxheSlcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSBhZnRlciBnaXZlbiBhbW91bnQgb2YgbWlsbGlzZWNvbmRzXG4gICAgICAgICogQHBhcmFtIGRlbGF5IC0gQW1vdW50IG9mIG1pbGxpc2Vjb25kcyB0byBleGVjdXRlIHRoZSBtZXRob2RcbiAgICAgICAgKiBcbiAgICAgICAgKiBUaGUgZGVsYXkgbWV0aG9kIHdpbGwgZXhlY3V0ZSBhIGZ1bmN0aW9uIGFmdGVyIGEgZ2l2ZW4gYW1vdW50IG9mIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgICAgICAqXG4gICAgICAgICogRXNzZW50aWFsbHkgYSB3cmFwcGVyIGZvciBgc2V0VGltZW91dGAuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIERlc3Ryb3kgaXRzZWxmIGFmdGVyIDEwMCBtaWxsaXNlY29uZHNcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB0aGlzLnRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgICogfSwgMTAwKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgdGltZW91dDogZnVuY3Rpb24gKGNhbGxiYWNrLCBkdXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoc2VsZik7XG4gICAgICAgICAgICAgICAgfSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5iaW5kXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuYmluZChTdHJpbmcgZXZlbnROYW1lLCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnQgdG8gYmluZCB0b1xuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZFxuICAgICAgICAqIEF0dGFjaCB0aGUgY3VycmVudCBlbnRpdHkgKG9yIGVudGl0aWVzKSB0byBsaXN0ZW4gZm9yIGFuIGV2ZW50LlxuICAgICAgICAqXG4gICAgICAgICogQ2FsbGJhY2sgd2lsbCBiZSBpbnZva2VkIHdoZW4gYW4gZXZlbnQgd2l0aCB0aGUgZXZlbnQgbmFtZSBwYXNzZWRcbiAgICAgICAgKiBpcyB0cmlnZ2VyZWQuIERlcGVuZGluZyBvbiB0aGUgZXZlbnQsIHNvbWUgZGF0YSBtYXkgYmUgcGFzc2VkXG4gICAgICAgICogdmlhIGFuIGFyZ3VtZW50IHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgKlxuICAgICAgICAqIFRoZSBmaXJzdCBhcmd1bWVudCBpcyB0aGUgZXZlbnQgbmFtZSAoY2FuIGJlIGFueXRoaW5nKSB3aGlsc3QgdGhlXG4gICAgICAgICogc2Vjb25kIGFyZ3VtZW50IGlzIHRoZSBjYWxsYmFjay4gSWYgdGhlIGV2ZW50IGhhcyBkYXRhLCB0aGVcbiAgICAgICAgKiBjYWxsYmFjayBzaG91bGQgaGF2ZSBhbiBhcmd1bWVudC5cbiAgICAgICAgKlxuICAgICAgICAqIEV2ZW50cyBhcmUgYXJiaXRyYXJ5IGFuZCBwcm92aWRlIGNvbW11bmljYXRpb24gYmV0d2VlbiBjb21wb25lbnRzLlxuICAgICAgICAqIFlvdSBjYW4gdHJpZ2dlciBvciBiaW5kIGFuIGV2ZW50IGV2ZW4gaWYgaXQgZG9lc24ndCBleGlzdCB5ZXQuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB0aGlzLmF0dHIoXCJ0cmlnZ2Vyc1wiLCAwKTsgLy9zZXQgYSB0cmlnZ2VyIGNvdW50XG4gICAgICAgICogdGhpcy5iaW5kKFwibXlldmVudFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgICAgdGhpcy50cmlnZ2VycysrOyAvL3doZW5ldmVyIG15ZXZlbnQgaXMgdHJpZ2dlcmVkLCBpbmNyZW1lbnRcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgICB0aGlzLnRyaWdnZXIoXCJteWV2ZW50XCIpOyAvL3RyaWdnZXIgbXlldmVudCBvbiBldmVyeSBmcmFtZVxuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgLnRyaWdnZXIsIC51bmJpbmRcbiAgICAgICAgKi9cbiAgICAgICAgYmluZDogZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy9vcHRpbWl6YXRpb24gZm9yIDEgZW50aXR5XG4gICAgICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZXJzW2V2ZW50XSkgaGFuZGxlcnNbZXZlbnRdID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGggPSBoYW5kbGVyc1tldmVudF07XG5cbiAgICAgICAgICAgICAgICBpZiAoIWhbdGhpc1swXV0pIGhbdGhpc1swXV0gPSBbXTsgLy9pbml0IGhhbmRsZXIgYXJyYXkgZm9yIGVudGl0eVxuICAgICAgICAgICAgICAgIGhbdGhpc1swXV0ucHVzaChjYWxsYmFjayk7IC8vYWRkIGN1cnJlbnQgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2luaXQgZXZlbnQgY29sbGVjdGlvblxuICAgICAgICAgICAgICAgIGlmICghaGFuZGxlcnNbZXZlbnRdKSBoYW5kbGVyc1tldmVudF0gPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgaCA9IGhhbmRsZXJzW2V2ZW50XTtcblxuICAgICAgICAgICAgICAgIGlmICghaFt0aGlzWzBdXSkgaFt0aGlzWzBdXSA9IFtdOyAvL2luaXQgaGFuZGxlciBhcnJheSBmb3IgZW50aXR5XG4gICAgICAgICAgICAgICAgaFt0aGlzWzBdXS5wdXNoKGNhbGxiYWNrKTsgLy9hZGQgY3VycmVudCBjYWxsYmFja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy51bmJpbmRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC51bmJpbmQoU3RyaW5nIGV2ZW50TmFtZVssIEZ1bmN0aW9uIGNhbGxiYWNrXSlcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnQgdG8gdW5iaW5kXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gdW5iaW5kXG4gICAgICAgICogUmVtb3ZlcyBiaW5kaW5nIHdpdGggYW4gZXZlbnQgZnJvbSBjdXJyZW50IGVudGl0eS5cbiAgICAgICAgKlxuICAgICAgICAqIFBhc3NpbmcgYW4gZXZlbnQgbmFtZSB3aWxsIHJlbW92ZSBhbGwgZXZlbnRzIGJvdW5kIHRvXG4gICAgICAgICogdGhhdCBldmVudC4gUGFzc2luZyBhIHJlZmVyZW5jZSB0byB0aGUgY2FsbGJhY2sgd2lsbFxuICAgICAgICAqIHVuYmluZCBvbmx5IHRoYXQgY2FsbGJhY2suXG4gICAgICAgICogQHNlZSAuYmluZCwgLnRyaWdnZXJcbiAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBoZGwgPSBoYW5kbGVyc1tldmVudF0sIGkgPSAwLCBsLCBjdXJyZW50O1xuICAgICAgICAgICAgICAgIC8vaWYgbm8gZXZlbnRzLCBjYW5jZWxcbiAgICAgICAgICAgICAgICBpZiAoaGRsICYmIGhkbFt0aGlzWzBdXSkgbCA9IGhkbFt0aGlzWzBdXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZWxzZSByZXR1cm4gdGhpcztcblxuICAgICAgICAgICAgICAgIC8vaWYgbm8gZnVuY3Rpb24sIGRlbGV0ZSBhbGxcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBoZGxbdGhpc1swXV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL2xvb2sgZm9yIGEgbWF0Y2ggaWYgdGhlIGZ1bmN0aW9uIGlzIHBhc3NlZFxuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBoZGxbdGhpc1swXV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50W2ldID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy50cmlnZ2VyXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudHJpZ2dlcihTdHJpbmcgZXZlbnROYW1lWywgT2JqZWN0IGRhdGFdKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBFdmVudCB0byB0cmlnZ2VyXG4gICAgICAgICogQHBhcmFtIGRhdGEgLSBBcmJpdHJhcnkgZGF0YSB0aGF0IHdpbGwgYmUgcGFzc2VkIGludG8gZXZlcnkgY2FsbGJhY2sgYXMgYW4gYXJndW1lbnRcbiAgICAgICAgKiBUcmlnZ2VyIGFuIGV2ZW50IHdpdGggYXJiaXRyYXJ5IGRhdGEuIFdpbGwgaW52b2tlIGFsbCBjYWxsYmFja3Mgd2l0aFxuICAgICAgICAqIHRoZSBjb250ZXh0ICh2YWx1ZSBvZiBgdGhpc2ApIG9mIHRoZSBjdXJyZW50IGVudGl0eSBvYmplY3QuXG4gICAgICAgICpcbiAgICAgICAgKiAqTm90ZTogVGhpcyB3aWxsIG9ubHkgZXhlY3V0ZSBjYWxsYmFja3Mgd2l0aGluIHRoZSBjdXJyZW50IGVudGl0eSwgbm8gb3RoZXIgZW50aXR5LipcbiAgICAgICAgKlxuICAgICAgICAqIFRoZSBmaXJzdCBhcmd1bWVudCBpcyB0aGUgZXZlbnQgbmFtZSB0byB0cmlnZ2VyIGFuZCB0aGUgb3B0aW9uYWxcbiAgICAgICAgKiBzZWNvbmQgYXJndW1lbnQgaXMgdGhlIGFyYml0cmFyeSBldmVudCBkYXRhLiBUaGlzIGNhbiBiZSBhYnNvbHV0ZWx5IGFueXRoaW5nLlxuICAgICAgICAqL1xuICAgICAgICB0cmlnZ2VyOiBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIC8vZmluZCB0aGUgaGFuZGxlcnMgYXNzaWduZWQgdG8gdGhlIGV2ZW50IGFuZCBlbnRpdHlcbiAgICAgICAgICAgICAgICBpZiAoaGFuZGxlcnNbZXZlbnRdICYmIGhhbmRsZXJzW2V2ZW50XVt0aGlzWzBdXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gaGFuZGxlcnNbZXZlbnRdW3RoaXNbMF1dLCBpID0gMCwgbCA9IGNhbGxiYWNrcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3NbaV0uY2FsbCh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2ZpbmQgdGhlIGhhbmRsZXJzIGFzc2lnbmVkIHRvIHRoZSBldmVudCBhbmQgZW50aXR5XG4gICAgICAgICAgICAgICAgaWYgKGhhbmRsZXJzW2V2ZW50XSAmJiBoYW5kbGVyc1tldmVudF1bdGhpc1swXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGhhbmRsZXJzW2V2ZW50XVt0aGlzWzBdXSwgaSA9IDAsIGwgPSBjYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmNhbGwodGhpcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmVhY2hcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuZWFjaChGdW5jdGlvbiBtZXRob2QpXG4gICAgICAgICogQHBhcmFtIG1ldGhvZCAtIE1ldGhvZCB0byBjYWxsIG9uIGVhY2ggaXRlcmF0aW9uXG4gICAgICAgICogSXRlcmF0ZXMgb3ZlciBmb3VuZCBlbnRpdGllcywgY2FsbGluZyBhIGZ1bmN0aW9uIGZvciBldmVyeSBlbnRpdHkuXG4gICAgICAgICpcbiAgICAgICAgKiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGVudGl0eSBhbmQgd2lsbCBwYXNzIHRoZSBpbmRleFxuICAgICAgICAqIGluIHRoZSBpdGVyYXRpb24gYXMgYW4gYXJndW1lbnQuIFRoZSBjb250ZXh0ICh2YWx1ZSBvZiBgdGhpc2ApIG9mIHRoZVxuICAgICAgICAqIGZ1bmN0aW9uIHdpbGwgYmUgdGhlIGN1cnJlbnQgZW50aXR5IGluIHRoZSBpdGVyYXRpb24uXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiBEZXN0cm95IGV2ZXJ5IHNlY29uZCAyRCBlbnRpdHlcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkoXCIyRFwiKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgKiAgICAgaWYoaSAlIDIgPT09IDApIHtcbiAgICAgICAgKiAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICAqICAgICB9XG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIGVhY2g6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgICAgICB2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy9za2lwIGlmIG5vdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoIWVudGl0aWVzW3RoaXNbaV1dKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBmdW5jLmNhbGwoZW50aXRpZXNbdGhpc1tpXV0sIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuY2xvbmVcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBFbnRpdHkgLmNsb25lKHZvaWQpXG4gICAgICAgICogQHJldHVybnMgQ2xvbmVkIGVudGl0eSBvZiB0aGUgY3VycmVudCBlbnRpdHlcbiAgICAgICAgKiBcbiAgICAgICAgKiBNZXRob2Qgd2lsbCBjcmVhdGUgYW5vdGhlciBlbnRpdHkgd2l0aCB0aGUgZXhhY3Qgc2FtZVxuICAgICAgICAqIHByb3BlcnRpZXMsIGNvbXBvbmVudHMgYW5kIG1ldGhvZHMgYXMgdGhlIGN1cnJlbnQgZW50aXR5LlxuICAgICAgICAqL1xuICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbXBzID0gdGhpcy5fX2MsXG4gICAgICAgICAgICBjb21wLFxuICAgICAgICAgICAgcHJvcCxcbiAgICAgICAgICAgIGNsb25lID0gQ3JhZnR5LmUoKTtcblxuICAgICAgICAgICAgZm9yIChjb21wIGluIGNvbXBzKSB7XG4gICAgICAgICAgICAgICAgY2xvbmUuYWRkQ29tcG9uZW50KGNvbXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChwcm9wIGluIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcCAhPSBcIjBcIiAmJiBwcm9wICE9IFwiX2dsb2JhbFwiICYmIHByb3AgIT0gXCJfY2hhbmdlZFwiICYmIHR5cGVvZiB0aGlzW3Byb3BdICE9IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgdGhpc1twcm9wXSAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb25lW3Byb3BdID0gdGhpc1twcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjbG9uZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5zZXR0ZXJcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5zZXR0ZXIoU3RyaW5nIHByb3BlcnR5LCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gcHJvcGVydHkgLSBQcm9wZXJ0eSB0byB3YXRjaCBmb3IgbW9kaWZpY2F0aW9uXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgaWYgdGhlIHByb3BlcnR5IGlzIG1vZGlmaWVkXG4gICAgICAgICogV2lsbCB3YXRjaCBhIHByb3BlcnR5IHdhaXRpbmcgZm9yIG1vZGlmaWNhdGlvbiBhbmQgd2lsbCB0aGVuIGludm9rZSB0aGVcbiAgICAgICAgKiBnaXZlbiBjYWxsYmFjayB3aGVuIGF0dGVtcHRpbmcgdG8gbW9kaWZ5LlxuICAgICAgICAqXG4gICAgICAgICogKk5vdGU6IFN1cHBvcnQgaW4gSUU8OSBpcyBzbGlnaHRseSBkaWZmZXJlbnQuIFRoZSBtZXRob2Qgd2lsbCBiZSBleGVjdXRlZFxuICAgICAgICAqIGFmdGVyIHRoZSBwcm9wZXJ0eSBoYXMgYmVlbiBzZXQqXG4gICAgICAgICovXG4gICAgICAgIHNldHRlcjogZnVuY3Rpb24gKHByb3AsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN1cHBvcnQuc2V0dGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZVNldHRlcl9fKHByb3AsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQ3JhZnR5LnN1cHBvcnQuZGVmaW5lUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcCwge1xuICAgICAgICAgICAgICAgICAgICBzZXQ6IGNhbGxiYWNrLFxuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9TZXR0ZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHByb3A6IHByb3AsXG4gICAgICAgICAgICAgICAgICAgIG9iajogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZm46IGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5kZXN0cm95XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuZGVzdHJveSh2b2lkKVxuICAgICAgICAqIFdpbGwgcmVtb3ZlIGFsbCBldmVudCBsaXN0ZW5lcnMgYW5kIGRlbGV0ZSBhbGwgcHJvcGVydGllcyBhcyB3ZWxsIGFzIHJlbW92aW5nIGZyb20gdGhlIHN0YWdlXG4gICAgICAgICovXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vcmVtb3ZlIGFsbCBldmVudCBoYW5kbGVycywgZGVsZXRlIGZyb20gZW50aXRpZXNcbiAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiUmVtb3ZlXCIpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGUgaW4gaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmJpbmQoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlbGV0ZSBlbnRpdGllc1t0aGlzWzBdXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vZ2l2ZSB0aGUgaW5pdCBpbnN0YW5jZXMgdGhlIENyYWZ0eSBwcm90b3R5cGVcbiAgICBDcmFmdHkuZm4uaW5pdC5wcm90b3R5cGUgPSBDcmFmdHkuZm47XG5cbiAgICAvKipcbiAgICAqIEV4dGVuc2lvbiBtZXRob2QgdG8gZXh0ZW5kIHRoZSBuYW1lc3BhY2UgYW5kXG4gICAgKiBzZWxlY3RvciBpbnN0YW5jZXNcbiAgICAqL1xuICAgIENyYWZ0eS5leHRlbmQgPSBDcmFmdHkuZm4uZXh0ZW5kID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcywga2V5O1xuXG4gICAgICAgIC8vZG9uJ3QgYm90aGVyIHdpdGggbnVsbHNcbiAgICAgICAgaWYgKCFvYmopIHJldHVybiB0YXJnZXQ7XG5cbiAgICAgICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09PSBvYmpba2V5XSkgY29udGludWU7IC8vaGFuZGxlIGNpcmN1bGFyIHJlZmVyZW5jZVxuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuZXh0ZW5kXG4gICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICogVXNlZCB0byBleHRlbmQgdGhlIENyYWZ0eSBuYW1lc3BhY2UuXG4gICAgKi9cbiAgICBDcmFmdHkuZXh0ZW5kKHtcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuaW5pdFxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHRyaWdnZXIgRW50ZXJGcmFtZSAtIG9uIGVhY2ggZnJhbWUgLSB7IGZyYW1lOiBOdW1iZXIgfVxuICAgICAgICAqIEB0cmlnZ2VyIExvYWQgLSBKdXN0IGFmdGVyIHRoZSB2aWV3cG9ydCBpcyBpbml0aWFsaXNlZC4gQmVmb3JlIHRoZSBFbnRlckZyYW1lIGxvb3BzIGlzIHN0YXJ0ZWRcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaW5pdChbTnVtYmVyIHdpZHRoLCBOdW1iZXIgaGVpZ2h0XSlcbiAgICAgICAgKiBAcGFyYW0gd2lkdGggLSBXaWR0aCBvZiB0aGUgc3RhZ2VcbiAgICAgICAgKiBAcGFyYW0gaGVpZ2h0IC0gSGVpZ2h0IG9mIHRoZSBzdGFnZVxuICAgICAgICAqIFxuICAgICAgICAqIENyZWF0ZSBhIGRpdiB3aXRoIGlkIGBjci1zdGFnZWAsIGlmIHRoZXJlIGlzIG5vdCBhbHJlYWR5IGFuIEhUTUxFbGVtZW50IHdpdGggaWQgYGNyLXN0YWdlYCAoYnkgYENyYWZ0eS52aWV3cG9ydC5pbml0YCkuXG4gICAgICAgICpcbiAgICAgICAgKiBTdGFydHMgdGhlIGBFbnRlckZyYW1lYCBpbnRlcnZhbC4gVGhpcyB3aWxsIGNhbGwgdGhlIGBFbnRlckZyYW1lYCBldmVudCBmb3IgZXZlcnkgZnJhbWUuXG4gICAgICAgICpcbiAgICAgICAgKiBDYW4gcGFzcyB3aWR0aCBhbmQgaGVpZ2h0IHZhbHVlcyBmb3IgdGhlIHN0YWdlIG90aGVyd2lzZSB3aWxsIGRlZmF1bHQgdG8gd2luZG93IHNpemUgKHNlZSBgQ3JhZnR5LkRPTS53aW5kb3dgKS5cbiAgICAgICAgKlxuICAgICAgICAqIEFsbCBgTG9hZGAgZXZlbnRzIHdpbGwgYmUgZXhlY3V0ZWQuXG4gICAgICAgICpcbiAgICAgICAgKiBVc2VzIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRvIHN5bmMgdGhlIGRyYXdpbmcgd2l0aCB0aGUgYnJvd3NlciBidXQgd2lsbCBkZWZhdWx0IHRvIGBzZXRJbnRlcnZhbGAgaWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICAgICAgKiBAc2VlIENyYWZ0eS5zdG9wLCAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICovXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICh3LCBoKSB7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuaW5pdCh3LCBoKTtcblxuICAgICAgICAgICAgLy9jYWxsIGFsbCBhcmJpdHJhcnkgZnVuY3Rpb25zIGF0dGFjaGVkIHRvIG9ubG9hZFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiTG9hZFwiKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5nZXRWZXJzaW9uXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAuZ2V0VmVyc2lvbigpXG4gICAgICAgICogQHJldHVybnMgQWN0dWFsbHkgY3JhZnR5IHZlcnNpb25cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5LmdldFZlcnNpb24oKTsgLy8nMC41LjInXG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIGdldFZlcnNpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnMC41LjMnO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnN0b3BcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEB0cmlnZ2VyIENyYWZ0eVN0b3AgLSB3aGVuIHRoZSBnYW1lIGlzIHN0b3BwZWRcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuc3RvcChbYm9vbCBjbGVhclN0YXRlXSlcblx0XHQqIEBwYXJhbSBjbGVhclN0YXRlIC0gaWYgdHJ1ZSB0aGUgc3RhZ2UgYW5kIGFsbCBnYW1lIHN0YXRlIGlzIGNsZWFyZWQuXG4gICAgICAgICpcbiAgICAgICAgKiBTdG9wcyB0aGUgRW50ZXJGcmFtZSBpbnRlcnZhbCBhbmQgcmVtb3ZlcyB0aGUgc3RhZ2UgZWxlbWVudC5cbiAgICAgICAgKlxuICAgICAgICAqIFRvIHJlc3RhcnQsIHVzZSBgQ3JhZnR5LmluaXQoKWAuXG4gICAgICAgICogQHNlZSBDcmFmdHkuaW5pdFxuICAgICAgICAqL1xuICAgICAgICBzdG9wOiBmdW5jdGlvbiAoY2xlYXJTdGF0ZSkge1xuICAgICAgICBcdHRoaXMudGltZXIuc3RvcCgpO1xuICAgICAgICBcdGlmIChjbGVhclN0YXRlKSB7XG4gICAgICAgIFx0XHRpZiAoQ3JhZnR5LnN0YWdlICYmIENyYWZ0eS5zdGFnZS5lbGVtLnBhcmVudE5vZGUpIHtcbiAgICAgICAgXHRcdFx0dmFyIG5ld0NyU3RhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgXHRcdFx0bmV3Q3JTdGFnZS5pZCA9IFwiY3Itc3RhZ2VcIjtcbiAgICAgICAgXHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Q3JTdGFnZSwgQ3JhZnR5LnN0YWdlLmVsZW0pO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0aW5pdFN0YXRlKCk7XG4gICAgICAgIFx0XHRpbml0Q29tcG9uZW50cyhDcmFmdHksIHdpbmRvdywgd2luZG93LmRvY3VtZW50KTtcbiAgICAgICAgXHR9XG5cbiAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiQ3JhZnR5U3RvcFwiKTtcblxuICAgICAgICBcdHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnBhdXNlXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAdHJpZ2dlciBQYXVzZSAtIHdoZW4gdGhlIGdhbWUgaXMgcGF1c2VkXG4gICAgICAgICogQHRyaWdnZXIgVW5wYXVzZSAtIHdoZW4gdGhlIGdhbWUgaXMgdW5wYXVzZWRcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkucGF1c2Uodm9pZClcbiAgICAgICAgKiBcbiAgICAgICAgKiBQYXVzZXMgdGhlIGdhbWUgYnkgc3RvcHBpbmcgdGhlIEVudGVyRnJhbWUgZXZlbnQgZnJvbSBmaXJpbmcuIElmIHRoZSBnYW1lIGlzIGFscmVhZHkgcGF1c2VkIGl0IGlzIHVucGF1c2VkLlxuICAgICAgICAqIFlvdSBjYW4gcGFzcyBhIGJvb2xlYW4gcGFyYW1ldGVyIGlmIHlvdSB3YW50IHRvIHBhdXNlIG9yIHVucGF1c2UgbW8gbWF0dGVyIHdoYXQgdGhlIGN1cnJlbnQgc3RhdGUgaXMuXG4gICAgICAgICogTW9kZXJuIGJyb3dzZXJzIHBhdXNlcyB0aGUgZ2FtZSB3aGVuIHRoZSBwYWdlIGlzIG5vdCB2aXNpYmxlIHRvIHRoZSB1c2VyLiBJZiB5b3Ugd2FudCB0aGUgUGF1c2UgZXZlbnRcbiAgICAgICAgKiB0byBiZSB0cmlnZ2VyZWQgd2hlbiB0aGF0IGhhcHBlbnMgeW91IGNhbiBlbmFibGUgYXV0b1BhdXNlIGluIGBDcmFmdHkuc2V0dGluZ3NgLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogSGF2ZSBhbiBlbnRpdHkgcGF1c2UgdGhlIGdhbWUgd2hlbiBpdCBpcyBjbGlja2VkLlxuICAgICAgICAqIH5+flxuICAgICAgICAqIGJ1dHRvbi5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICogICAgIENyYWZ0eS5wYXVzZSgpO1xuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBwYXVzZTogZnVuY3Rpb24gKHRvZ2dsZSkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSA/IHRvZ2dsZSA6ICF0aGlzLl9wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ1BhdXNlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IENyYWZ0eS50aW1lci5zdG9wKCk7IH0sIDApO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5rZXlkb3duID0ge307XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcignVW5wYXVzZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgQ3JhZnR5LnRpbWVyLmluaXQoKTsgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkuaXNQYXVzZWRcbiAgICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmlzUGF1c2VkKClcbiAgICAgICAgICogXG4gICAgICAgICAqIENoZWNrIHdoZXRoZXIgdGhlIGdhbWUgaXMgYWxyZWFkeSBwYXVzZWQgb3Igbm90LlxuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIENyYWZ0eS5pc1BhdXNlZCgpO1xuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIGlzUGF1c2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnRpbWVyXG4gICAgICAgICogQGNhdGVnb3J5IEludGVybmFsXG4gICAgICAgICogSGFuZGxlcyBnYW1lIHRpY2tzXG4gICAgICAgICovXG4gICAgICAgIHRpbWVyOiB7XG4gICAgICAgICAgICBwcmV2OiAoK25ldyBEYXRlKSxcbiAgICAgICAgICAgIGN1cnJlbnQ6ICgrbmV3IERhdGUpLFxuICAgICAgICAgICAgY3VycmVudFRpbWU6ICtuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZnJhbWVzOjAsXG4gICAgICAgICAgICBmcmFtZVRpbWU6MCxcbiAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICBudWxsO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9uRnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS50aW1lci5zdGVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0SUQgPSBvbkZyYW1lKHRpY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyZXF1ZXN0SUQgKyAnLCAnICsgZnJhbWUpXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aWNrKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGljayA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnRpbWVyLnN0ZXAoKTsgfSwgMTAwMCAvIEZQUyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiQ3JhZnR5U3RvcFRpbWVyXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aWNrID09PSBcIm51bWJlclwiKSBjbGVhckludGVydmFsKHRpY2spO1xuXG4gICAgICAgICAgICAgICAgdmFyIG9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy53ZWJraXRDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1vekNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cub0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubXNDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgbnVsbDtcblxuICAgICAgICAgICAgICAgIGlmIChvbkZyYW1lKSBvbkZyYW1lKHJlcXVlc3RJRCk7XG4gICAgICAgICAgICAgICAgdGljayA9IG51bGw7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkudGltZXIuc3RlcFxuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkudGltZXJcbiAgICAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnRpbWVyLnN0ZXAoKVxuICAgICAgICAgICAgKiBBZHZhbmNlcyB0aGUgZ2FtZSBieSB0cmlnZ2VyaW5nIGBFbnRlckZyYW1lYCBhbmQgY2FsbHMgYENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3YCB0byB1cGRhdGUgdGhlIHN0YWdlLlxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0ZXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsb29wcyA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZSA9ICtuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lIC0gbmV4dEdhbWVUaWNrID4gNjAgKiBtaWxsaVNlY1BlckZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRHYW1lVGljayA9IHRoaXMuY3VycmVudFRpbWUgLSBtaWxsaVNlY1BlckZyYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5jdXJyZW50VGltZSA+IG5leHRHYW1lVGljaykge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudHJpZ2dlcihcIkVudGVyRnJhbWVcIiwgeyBmcmFtZTogZnJhbWUrKyB9KTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEdhbWVUaWNrICs9IG1pbGxpU2VjUGVyRnJhbWU7XG4gICAgICAgICAgICAgICAgICAgIGxvb3BzKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsb29wcykge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIGlmKHRoaXMuY3VycmVudFRpbWUgPiB0aGlzLmZyYW1lVGltZSl7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiTWVzc3VyZUZQU1wiLHt2YWx1ZTp0aGlzLmZyYW1lfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWUgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZyYW1lVGltZSA9IHRoaXMuY3VycmVudFRpbWUgKyAxMDAwO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZyYW1lKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnRpbWVyLmdldEZQU1xuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkudGltZXJcbiAgICAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnRpbWVyLmdldEZQUygpXG4gICAgICAgICAgICAqIFJldHVybnMgdGhlIHRhcmdldCBmcmFtZXMgcGVyIHNlY29uZC4gVGhpcyBpcyBub3QgYW4gYWN0dWFsIGZyYW1lIHJhdGUuXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0RlBTOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEZQUztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS50aW1lci5zaW11bGF0ZUZyYW1lc1xuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkudGltZXJcbiAgICAgICAgICAgICogQWR2YW5jZXMgdGhlIGdhbWUgc3RhdGUgYnkgYSBudW1iZXIgb2YgZnJhbWVzIGFuZCBkcmF3cyB0aGUgcmVzdWx0aW5nIHN0YWdlIGF0IHRoZSBlbmQuIFVzZWZ1bCBmb3IgdGVzdHMgYW5kIGRlYnVnZ2luZy5cbiAgICAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LnRpbWVyLnNpbXVsYXRlRnJhbWVzKE51bWJlciBmcmFtZXMpXG4gICAgICAgICAgICAqIEBwYXJhbSBmcmFtZXMgLSBudW1iZXIgb2YgZnJhbWVzIHRvIHNpbXVsYXRlXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2ltdWxhdGVGcmFtZXM6IGZ1bmN0aW9uIChmcmFtZXMpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZnJhbWVzLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiRW50ZXJGcmFtZVwiLCB7IGZyYW1lOiBmcmFtZSsrIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuYWRkRW50aXR5RmFjdG9yeVxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHBhcmFtIG5hbWUgLSBOYW1lIG9mIHRoZSBlbnRpdHkgZmFjdG9yeS5cbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBGdW5jdGlvbiBjb250YWluaW5nIHRoZSBlbnRpdHkgY3JlYXRpb24gcHJvY2VkdXJlLlxuICAgICAgICAqIFxuICAgICAgICAqIFJlZ2lzdGVycyBhbiBFbnRpdHkgRmFjdG9yeS4gIEFuIEVudGl0eSBGYWN0b3J5IGFsbG93cyBmb3IgdGhlIHJlcGVhdGFibGUgY3JlYXRpb24gb2YgYW4gRW50aXR5LlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkuYWRkRW50aXR5RmFjdG9yeSgnUHJvamVjdGlsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgdmFyIGVudGl0eSA9IENyYWZ0eS5lKCcyRCwgQ2FudmFzLCBDb2xvciwgUGh5c2ljcywgQ29sbGlzaW9uJylcbiAgICAgICAgKiAgIC5jb2xvcihcInJlZFwiKVxuICAgICAgICAqICAgLmF0dHIoe1xuICAgICAgICAqICAgICB3OiAzLFxuICAgICAgICAqICAgICBoOiAzLFxuICAgICAgICAqICAgICB4OiB0aGlzLngsXG4gICAgICAgICogICAgIHk6IHRoaXMueVxuICAgICAgICAqICAgfSlcbiAgICAgICAgKiAgIC5hZGRDb21wb25lbnQoJ0dyYXZpdHknKS5ncmF2aXR5KFwiRmxvb3JcIik7XG4gICAgICAgICogICBcbiAgICAgICAgKiAgIHJldHVybiBlbnRpdHk7XG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuZVxuICAgICAgICAqL1xuICAgICAgICBhZGRFbnRpdHlGYWN0b3J5OiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5lbnRpdHlGYWN0b3JpZXNbbmFtZV0gPSBjYWxsYmFjaztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5uZXdGYWN0b3J5RW50aXR5XG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAcGFyYW0gbmFtZSAtIE5hbWUgb2YgdGhlIGVudGl0eSBmYWN0b3J5LlxuICAgICAgICAqIFxuICAgICAgICAqIENyZWF0ZXMgYSBuZXcgZW50aXR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgRW50aXR5IEZhY3RvcnkuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eS5hZGRFbnRpdHlGYWN0b3J5KCdQcm9qZWN0aWxlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICogICB2YXIgZW50aXR5ID0gQ3JhZnR5LmUoJzJELCBDYW52YXMsIENvbG9yLCBQaHlzaWNzLCBDb2xsaXNpb24nKVxuICAgICAgICAqICAgLmNvbG9yKFwicmVkXCIpXG4gICAgICAgICogICAuYXR0cih7XG4gICAgICAgICogICAgIHc6IDMsXG4gICAgICAgICogICAgIGg6IDMsXG4gICAgICAgICogICAgIHg6IHRoaXMueCxcbiAgICAgICAgKiAgICAgeTogdGhpcy55XG4gICAgICAgICogICB9KVxuICAgICAgICAqICAgLmFkZENvbXBvbmVudCgnR3Jhdml0eScpLmdyYXZpdHkoXCJGbG9vclwiKTtcbiAgICAgICAgKiAgIFxuICAgICAgICAqICAgcmV0dXJuIGVudGl0eTtcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKlxuICAgICAgICAqIENyYWZ0eS5uZXdGYWN0b3J5RW50aXR5KCdQcm9qZWN0aWxlJyk7IC8vIFRoaXMgcmV0dXJucyBhIG5ldyBQcm9qZWN0aWxlIEVudGl0eS5cbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5lXG4gICAgICAgICovXG4gICAgICAgIG5ld0ZhY3RvcnlFbnRpdHk6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVudGl0eVRlbXBsYXRlc1tuYW1lXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmVcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEB0cmlnZ2VyIE5ld0VudGl0eSAtIFdoZW4gdGhlIGVudGl0eSBpcyBjcmVhdGVkIGFuZCBhbGwgY29tcG9uZW50cyBhcmUgYWRkZWQgLSB7IGlkOk51bWJlciB9XG4gICAgICAgICogQHNpZ24gcHVibGljIEVudGl0eSBDcmFmdHkuZShTdHJpbmcgY29tcG9uZW50TGlzdClcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50TGlzdCAtIExpc3Qgb2YgY29tcG9uZW50cyB0byBhc3NpZ24gdG8gbmV3IGVudGl0eVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBFbnRpdHkgQ3JhZnR5LmUoU3RyaW5nIGNvbXBvbmVudDFbLCAuLiwgU3RyaW5nIGNvbXBvbmVudE5dKVxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnQjIC0gQ29tcG9uZW50IHRvIGFkZFxuICAgICAgICAqIFxuICAgICAgICAqIENyZWF0ZXMgYW4gZW50aXR5LiBBbnkgYXJndW1lbnRzIHdpbGwgYmUgYXBwbGllZCBpbiB0aGUgc2FtZVxuICAgICAgICAqIHdheSBgLmFkZENvbXBvbmVudCgpYCBpcyBhcHBsaWVkIGFzIGEgcXVpY2sgd2F5IHRvIGFkZCBjb21wb25lbnRzLlxuICAgICAgICAqXG4gICAgICAgICogQW55IGNvbXBvbmVudCBhZGRlZCB3aWxsIGF1Z21lbnQgdGhlIGZ1bmN0aW9uYWxpdHkgb2ZcbiAgICAgICAgKiB0aGUgY3JlYXRlZCBlbnRpdHkgYnkgYXNzaWduaW5nIHRoZSBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzIGZyb20gdGhlIGNvbXBvbmVudCB0byB0aGUgZW50aXR5LlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIG15RW50aXR5ID0gQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvclwiKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5jXG4gICAgICAgICovXG4gICAgICAgIGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IFVJRCgpLCBjcmFmdDtcblxuICAgICAgICAgICAgZW50aXRpZXNbaWRdID0gbnVsbDsgLy9yZWdpc3RlciB0aGUgc3BhY2VcbiAgICAgICAgICAgIGVudGl0aWVzW2lkXSA9IGNyYWZ0ID0gQ3JhZnR5KGlkKTtcblxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY3JhZnQuYWRkQ29tcG9uZW50LmFwcGx5KGNyYWZ0LCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3JhZnQuc2V0TmFtZSgnRW50aXR5ICMnK2lkKTsgLy9zZXQgZGVmYXVsdCBlbnRpdHkgaHVtYW4gcmVhZGFibGUgbmFtZVxuICAgICAgICAgICAgY3JhZnQuYWRkQ29tcG9uZW50KFwib2JqXCIpOyAvL2V2ZXJ5IGVudGl0eSBhdXRvbWF0aWNhbGx5IGFzc3VtZXMgb2JqXG5cbiAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiTmV3RW50aXR5XCIsIHsgaWQ6IGlkIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gY3JhZnQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuY1xuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmMoU3RyaW5nIG5hbWUsIE9iamVjdCBjb21wb25lbnQpXG4gICAgICAgICogQHBhcmFtIG5hbWUgLSBOYW1lIG9mIHRoZSBjb21wb25lbnRcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50IC0gT2JqZWN0IHdpdGggdGhlIGNvbXBvbmVudHMgcHJvcGVydGllcyBhbmQgbWV0aG9kc1xuICAgICAgICAqIENyZWF0ZXMgYSBjb21wb25lbnQgd2hlcmUgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIHRoZSBJRCBhbmQgdGhlIHNlY29uZFxuICAgICAgICAqIGlzIHRoZSBvYmplY3QgdGhhdCB3aWxsIGJlIGluaGVyaXRlZCBieSBlbnRpdGllcy5cbiAgICAgICAgKlxuICAgICAgICAqIFRoZXJlIGlzIGEgY29udmVudGlvbiBmb3Igd3JpdGluZyBjb21wb25lbnRzLiBcbiAgICAgICAgKlxuICAgICAgICAqIC0gUHJvcGVydGllcyBvciBtZXRob2RzIHRoYXQgc3RhcnQgd2l0aCBhbiB1bmRlcnNjb3JlIGFyZSBjb25zaWRlcmVkIHByaXZhdGUuXG4gICAgICAgICogLSBBIG1ldGhvZCBjYWxsZWQgYGluaXRgIHdpbGwgYXV0b21hdGljYWxseSBiZSBjYWxsZWQgYXMgc29vbiBhcyB0aGVcbiAgICAgICAgKiBjb21wb25lbnQgaXMgYWRkZWQgdG8gYW4gZW50aXR5LlxuICAgICAgICAqIC0gQSBtZXRob2Qgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIHRoZSBjb21wb25lbnQgaXMgY29uc2lkZXJlZCB0byBiZSBhIGNvbnN0cnVjdG9yXG4gICAgICAgICogYW5kIGlzIGdlbmVyYWxseSB1c2VkIHdoZW4geW91IG5lZWQgdG8gcGFzcyBjb25maWd1cmF0aW9uIGRhdGEgdG8gdGhlIGNvbXBvbmVudCBvbiBhIHBlciBlbnRpdHkgYmFzaXMuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eS5jKFwiQW5ub3lpbmdcIiwge1xuICAgICAgICAqICAgICBfbWVzc2FnZTogXCJIaUhpXCIsXG4gICAgICAgICogICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgICAgICAgdGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbigpIHsgYWxlcnQodGhpcy5tZXNzYWdlKTsgfSk7XG4gICAgICAgICogICAgIH0sXG4gICAgICAgICogICAgIGFubm95aW5nOiBmdW5jdGlvbihtZXNzYWdlKSB7IHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7IH1cbiAgICAgICAgKiB9KTtcbiAgICAgICAgKlxuICAgICAgICAqIENyYWZ0eS5lKFwiQW5ub3lpbmdcIikuYW5ub3lpbmcoXCJJJ20gYW4gb3JhbmdlLi4uXCIpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogXG4gICAgICAgICogV0FSTklORzogXG4gICAgICAgICpcbiAgICAgICAgKiBpbiB0aGUgZXhhbXBsZSBhYm92ZSB0aGUgZmllbGQgX21lc3NhZ2UgaXMgbG9jYWwgdG8gdGhlIGVudGl0eS4gVGhhdCBpcywgaWYgeW91IGNyZWF0ZSBtYW55IGVudGl0aWVzIHdpdGggdGhlIEFubm95aW5nIGNvbXBvbmVudCB0aGV5IGNhbiBhbGwgaGF2ZSBkaWZmZXJlbnQgdmFsdWVzIGZvciBfbWVzc2FnZS4gVGhhdCBpcyBiZWNhdXNlIGl0IGlzIGEgc2ltcGxlIHZhbHVlLCBhbmQgc2ltcGxlIHZhbHVlcyBhcmUgY29waWVkIGJ5IHZhbHVlLiBJZiBob3dldmVyIHRoZSBmaWVsZCBoYWQgYmVlbiBhbiBvYmplY3Qgb3IgYXJyYXksIHRoZSB2YWx1ZSB3b3VsZCBoYXZlIGJlZW4gc2hhcmVkIGJ5IGFsbCBlbnRpdGllcyB3aXRoIHRoZSBjb21wb25lbnQgYmVjYXVzZSBjb21wbGV4IHR5cGVzIGFyZSBjb3BpZWQgYnkgcmVmZXJlbmNlIGluIGphdmFzY3JpcHQuIFRoaXMgaXMgcHJvYmFibHkgbm90IHdoYXQgeW91IHdhbnQgYW5kIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkZW1vbnN0cmF0ZXMgaG93IHRvIHdvcmsgYXJvdW5kIGl0OlxuICAgICAgICAqXG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5LmMoXCJNeUNvbXBvbmVudFwiLCB7XG4gICAgICAgICogICAgIF9pQW1TaGFyZWQ6IHsgYTogMywgYjogNCB9LFxuICAgICAgICAqICAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgICAgICAgIHRoaXMuX2lBbU5vdFNoYXJlZCA9IHsgYTogMywgYjogNCB9O1xuICAgICAgICAqICAgICB9LFxuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogQHNlZSBDcmFmdHkuZVxuICAgICAgICAqL1xuICAgICAgICBjOiBmdW5jdGlvbiAoY29tcE5hbWUsIGNvbXBvbmVudCkge1xuICAgICAgICAgICAgY29tcG9uZW50c1tjb21wTmFtZV0gPSBjb21wb25lbnQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudHJpZ2dlclxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlLCBFdmVudHNcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudHJpZ2dlcihTdHJpbmcgZXZlbnROYW1lLCAqIGRhdGEpXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIHRyaWdnZXJcbiAgICAgICAgKiBAcGFyYW0gZGF0YSAtIEFyYml0cmFyeSBkYXRhIHRvIHBhc3MgaW50byB0aGUgY2FsbGJhY2sgYXMgYW4gYXJndW1lbnRcbiAgICAgICAgKiBcbiAgICAgICAgKiBUaGlzIG1ldGhvZCB3aWxsIHRyaWdnZXIgZXZlcnkgc2luZ2xlIGNhbGxiYWNrIGF0dGFjaGVkIHRvIHRoZSBldmVudCBuYW1lLiBUaGlzIG1lYW5zXG4gICAgICAgICogZXZlcnkgZ2xvYmFsIGV2ZW50IGFuZCBldmVyeSBlbnRpdHkgdGhhdCBoYXMgYSBjYWxsYmFjay5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5iaW5kXG4gICAgICAgICovXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgdmFyIGhkbCA9IGhhbmRsZXJzW2V2ZW50XSwgaCwgaSwgbDtcbiAgICAgICAgICAgIC8vbG9vcCBvdmVyIGV2ZXJ5IG9iamVjdCBib3VuZFxuICAgICAgICAgICAgZm9yIChoIGluIGhkbCkge1xuICAgICAgICAgICAgICAgIGlmICghaGRsLmhhc093blByb3BlcnR5KGgpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIC8vbG9vcCBvdmVyIGV2ZXJ5IGhhbmRsZXIgd2l0aGluIG9iamVjdFxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBoZGxbaF0ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoZGxbaF0gJiYgaGRsW2hdW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2lmIGFuIGVudGl0eSwgY2FsbCB3aXRoIHRoYXQgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0aWVzW2hdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGRsW2hdW2ldLmNhbGwoQ3JhZnR5KCtoKSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL2Vsc2UgY2FsbCB3aXRoIENyYWZ0eSBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGRsW2hdW2ldLmNhbGwoQ3JhZnR5LCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5iaW5kXG4gICAgICAgICogQGNhdGVnb3J5IENvcmUsIEV2ZW50c1xuICAgICAgICAqIEBzaWduIHB1YmxpYyBOdW1iZXIgYmluZChTdHJpbmcgZXZlbnROYW1lLCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnQgdG8gYmluZCB0b1xuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIHVwb24gZXZlbnQgdHJpZ2dlcmVkXG4gICAgICAgICogQHJldHVybnMgSUQgb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2sgdXNlZCB0byB1bmJpbmRcbiAgICAgICAgKiBcbiAgICAgICAgKiBCaW5kcyB0byBhIGdsb2JhbCBldmVudC4gTWV0aG9kIHdpbGwgYmUgZXhlY3V0ZWQgd2hlbiBgQ3JhZnR5LnRyaWdnZXJgIGlzIHVzZWRcbiAgICAgICAgKiB3aXRoIHRoZSBldmVudCBuYW1lLlxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LnRyaWdnZXIsIENyYWZ0eS51bmJpbmRcbiAgICAgICAgKi9cbiAgICAgICAgYmluZDogZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyc1tldmVudF0pIGhhbmRsZXJzW2V2ZW50XSA9IHt9O1xuICAgICAgICAgICAgdmFyIGhkbCA9IGhhbmRsZXJzW2V2ZW50XTtcblxuICAgICAgICAgICAgaWYgKCFoZGwuZ2xvYmFsKSBoZGwuZ2xvYmFsID0gW107XG4gICAgICAgICAgICByZXR1cm4gaGRsLmdsb2JhbC5wdXNoKGNhbGxiYWNrKSAtIDE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudW5iaW5kXG4gICAgICAgICogQGNhdGVnb3J5IENvcmUsIEV2ZW50c1xuICAgICAgICAqIEBzaWduIHB1YmxpYyBCb29sZWFuIENyYWZ0eS51bmJpbmQoU3RyaW5nIGV2ZW50TmFtZSwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHRvIHVuYmluZFxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIHVuYmluZFxuICAgICAgICAqIEBzaWduIHB1YmxpYyBCb29sZWFuIENyYWZ0eS51bmJpbmQoU3RyaW5nIGV2ZW50TmFtZSwgTnVtYmVyIGNhbGxiYWNrSUQpXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrSUQgLSBJRCBvZiB0aGUgY2FsbGJhY2tcbiAgICAgICAgKiBAcmV0dXJucyBUcnVlIG9yIGZhbHNlIGRlcGVuZGluZyBvbiBpZiBhIGNhbGxiYWNrIHdhcyB1bmJvdW5kXG4gICAgICAgICogVW5iaW5kIGFueSBldmVudCBmcm9tIGFueSBlbnRpdHkgb3IgZ2xvYmFsIGV2ZW50LlxuICAgICAgICAqL1xuICAgICAgICB1bmJpbmQ6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBoZGwgPSBoYW5kbGVyc1tldmVudF0sIGgsIGksIGw7XG5cbiAgICAgICAgICAgIC8vbG9vcCBvdmVyIGV2ZXJ5IG9iamVjdCBib3VuZFxuICAgICAgICAgICAgZm9yIChoIGluIGhkbCkge1xuICAgICAgICAgICAgICAgIGlmICghaGRsLmhhc093blByb3BlcnR5KGgpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIC8vaWYgcGFzc2VkIHRoZSBJRFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGhkbFtoXVtjYWxsYmFja107XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vbG9vcCBvdmVyIGV2ZXJ5IGhhbmRsZXIgd2l0aGluIG9iamVjdFxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBoZGxbaF0ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoZGxbaF1baV0gPT09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaGRsW2hdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5mcmFtZVxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkuZnJhbWUodm9pZClcbiAgICAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGZyYW1lIG51bWJlclxuICAgICAgICAqL1xuICAgICAgICBmcmFtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZyYW1lO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbXBvbmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnRzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzQ29tcDogZnVuY3Rpb24gKGNvbXApIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wIGluIGNvbXBvbmVudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVidWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBlbnRpdGllcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5zZXR0aW5nc1xuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogTW9kaWZ5IHRoZSBpbm5lciB3b3JraW5ncyBvZiBDcmFmdHkgdGhyb3VnaCB0aGUgc2V0dGluZ3MuXG4gICAgICAgICovXG4gICAgICAgIHNldHRpbmdzOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHN0YXRlcyA9IHt9LFxuICAgICAgICAgICAgY2FsbGJhY2tzID0ge307XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXJcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnNldHRpbmdzXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlcihTdHJpbmcgc2V0dGluZ05hbWUsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAgICAgKiBAcGFyYW0gc2V0dGluZ05hbWUgLSBOYW1lIG9mIHRoZSBzZXR0aW5nXG4gICAgICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB1c2UgbW9kaWZpZXMgc2V0dGluZ1xuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogVXNlIHRoaXMgdG8gcmVnaXN0ZXIgY3VzdG9tIHNldHRpbmdzLiBDYWxsYmFjayB3aWxsIGJlIGV4ZWN1dGVkIHdoZW4gYENyYWZ0eS5zZXR0aW5ncy5tb2RpZnlgIGlzIHVzZWQuXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBAc2VlIENyYWZ0eS5zZXR0aW5ncy5tb2RpZnlcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChzZXR0aW5nLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Nbc2V0dGluZ10gPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkuc2V0dGluZ3MubW9kaWZ5XG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS5zZXR0aW5nc1xuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5KFN0cmluZyBzZXR0aW5nTmFtZSwgKiB2YWx1ZSlcbiAgICAgICAgICAgICogQHBhcmFtIHNldHRpbmdOYW1lIC0gTmFtZSBvZiB0aGUgc2V0dGluZ1xuICAgICAgICAgICAgKiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBzZXQgdGhlIHNldHRpbmcgdG9cbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIE1vZGlmeSBzZXR0aW5ncyB0aHJvdWdoIHRoaXMgbWV0aG9kLlxuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogQHNlZSBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIsIENyYWZ0eS5zZXR0aW5ncy5nZXRcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbW9kaWZ5OiBmdW5jdGlvbiAoc2V0dGluZywgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFja3Nbc2V0dGluZ10pIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW3NldHRpbmddLmNhbGwoc3RhdGVzW3NldHRpbmddLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlc1tzZXR0aW5nXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS5zZXR0aW5ncy5nZXRcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnNldHRpbmdzXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyAqIENyYWZ0eS5zZXR0aW5ncy5nZXQoU3RyaW5nIHNldHRpbmdOYW1lKVxuICAgICAgICAgICAgKiBAcGFyYW0gc2V0dGluZ05hbWUgLSBOYW1lIG9mIHRoZSBzZXR0aW5nXG4gICAgICAgICAgICAqIEByZXR1cm5zIEN1cnJlbnQgdmFsdWUgb2YgdGhlIHNldHRpbmdcbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIHNldHRpbmcuXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBAc2VlIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlciwgQ3JhZnR5LnNldHRpbmdzLmdldFxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uIChzZXR0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZXNbc2V0dGluZ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkoKSxcblxuICAgICAgICBjbG9uZTogY2xvbmVcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICogUmV0dXJuIGEgdW5pcXVlIElEXG4gICAgKi9cbiAgICBmdW5jdGlvbiBVSUQoKSB7XG4gICAgICAgIHZhciBpZCA9IEdVSUQrKztcbiAgICAgICAgLy9pZiBHVUlEIGlzIG5vdCB1bmlxdWVcbiAgICAgICAgaWYgKGlkIGluIGVudGl0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gVUlEKCk7IC8vcmVjdXJzZSB1bnRpbCBpdCBpcyB1bmlxdWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5jbG9uZVxuICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAqIEBzaWduIHB1YmxpYyBPYmplY3QgLmNsb25lKE9iamVjdCBvYmopXG4gICAgKiBAcGFyYW0gb2JqIC0gYW4gb2JqZWN0XG4gICAgKiBcbiAgICAqIERlZXAgY29weSAoYS5rLmEgY2xvbmUpIG9mIGFuIG9iamVjdC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICAgICAgICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZihvYmopICE9ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuIG9iajtcblxuICAgICAgICB2YXIgdGVtcCA9IG9iai5jb25zdHJ1Y3RvcigpOyAvLyBjaGFuZ2VkXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iailcbiAgICAgICAgICAgIHRlbXBba2V5XSA9IGNsb25lKG9ialtrZXldKTtcbiAgICAgICAgcmV0dXJuIHRlbXA7XG4gICAgfVxuXG4gICAgQ3JhZnR5LmJpbmQoXCJMb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFDcmFmdHkuc3VwcG9ydC5zZXR0ZXIgJiYgQ3JhZnR5LnN1cHBvcnQuZGVmaW5lUHJvcGVydHkpIHtcbiAgICAgICAgICAgIG5vU2V0dGVyID0gW107XG4gICAgICAgICAgICBDcmFmdHkuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBpID0gMCwgbCA9IG5vU2V0dGVyLmxlbmd0aCwgY3VycmVudDtcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gbm9TZXR0ZXJbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Lm9ialtjdXJyZW50LnByb3BdICE9PSBjdXJyZW50Lm9ialsnXycgKyBjdXJyZW50LnByb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50LmZuLmNhbGwoY3VycmVudC5vYmosIGN1cnJlbnQub2JqW2N1cnJlbnQucHJvcF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGluaXRDb21wb25lbnRzKENyYWZ0eSwgd2luZG93LCB3aW5kb3cuZG9jdW1lbnQpO1xuXG4gICAgLy9tYWtlIENyYWZ0eSBnbG9iYWxcbiAgICB3aW5kb3cuQ3JhZnR5ID0gQ3JhZnR5O1xuXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGVmaW5lKCdjcmFmdHknLCBbXSwgZnVuY3Rpb24oKSB7IHJldHVybiBDcmFmdHk7IH0pO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gQ3JhZnR5O1xufSkod2luZG93LFxuXG4vL3dyYXAgYXJvdW5kIGNvbXBvbmVudHNcbmZ1bmN0aW9uKENyYWZ0eSwgd2luZG93LCBkb2N1bWVudCkge1xuXG4vKipcbiogU3BhdGlhbCBIYXNoTWFwIGZvciBicm9hZCBwaGFzZSBjb2xsaXNpb25cbipcbiogQGF1dGhvciBMb3VpcyBTdG93YXNzZXJcbiovXG4oZnVuY3Rpb24gKHBhcmVudCkge1xuXG5cblx0LyoqQFxuXHQqICNDcmFmdHkuSGFzaE1hcC5jb25zdHJ1Y3RvclxuXHQqIEBjb21wIENyYWZ0eS5IYXNoTWFwXG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5Lkhhc2hNYXAoW2NlbGxzaXplXSlcblx0KiBAcGFyYW0gY2VsbHNpemUgLSB0aGUgY2VsbCBzaXplLiBJZiBvbWl0dGVkLCBgY2VsbHNpemVgIGlzIDY0LlxuXHQqIFxuICAgICogU2V0IGBjZWxsc2l6ZWAuXG4gICAgKiBBbmQgY3JlYXRlIGB0aGlzLm1hcGAuXG5cdCovXG5cdHZhciBjZWxsc2l6ZSxcblxuXHRIYXNoTWFwID0gZnVuY3Rpb24gKGNlbGwpIHtcblx0XHRjZWxsc2l6ZSA9IGNlbGwgfHwgNjQ7XG5cdFx0dGhpcy5tYXAgPSB7fTtcblx0fSxcblxuXHRTUEFDRSA9IFwiIFwiO1xuXG5cdEhhc2hNYXAucHJvdG90eXBlID0ge1xuXHQvKipAXG5cdCogI0NyYWZ0eS5tYXAuaW5zZXJ0XG5cdCogQGNvbXAgQ3JhZnR5Lm1hcFxuICAgICogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkubWFwLmluc2VydChPYmplY3Qgb2JqKVxuXHQqIEBwYXJhbSBvYmogLSBBbiBlbnRpdHkgdG8gYmUgaW5zZXJ0ZWQuXG5cdCogXG4gICAgKiBgb2JqYCBpcyBpbnNlcnRlZCBpbiAnLm1hcCcgb2YgdGhlIGNvcnJlc3BvbmRpbmcgYnJvYWQgcGhhc2UgY2VsbHMuIEFuIG9iamVjdCBvZiB0aGUgZm9sbG93aW5nIGZpZWxkcyBpcyByZXR1cm5lZC5cbiAgICAqIH5+flxuICAgICogLSB0aGUgb2JqZWN0IHRoYXQga2VlcCB0cmFjayBvZiBjZWxscyAoa2V5cylcbiAgICAqIC0gYG9iamBcbiAgICAqIC0gdGhlIEhhc2hNYXAgb2JqZWN0XG4gICAgKiB+fn5cblx0Ki9cblx0XHRpbnNlcnQ6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRcdHZhciBrZXlzID0gSGFzaE1hcC5rZXkob2JqKSxcblx0XHRcdGVudHJ5ID0gbmV3IEVudHJ5KGtleXMsIG9iaiwgdGhpcyksXG5cdFx0XHRpID0gMCxcblx0XHRcdGosXG5cdFx0XHRoYXNoO1xuXG5cdFx0XHQvL2luc2VydCBpbnRvIGFsbCB4IGJ1Y2tldHNcblx0XHRcdGZvciAoaSA9IGtleXMueDE7IGkgPD0ga2V5cy54MjsgaSsrKSB7XG5cdFx0XHRcdC8vaW5zZXJ0IGludG8gYWxsIHkgYnVja2V0c1xuXHRcdFx0XHRmb3IgKGogPSBrZXlzLnkxOyBqIDw9IGtleXMueTI7IGorKykge1xuXHRcdFx0XHRcdGhhc2ggPSBpICsgU1BBQ0UgKyBqO1xuXHRcdFx0XHRcdGlmICghdGhpcy5tYXBbaGFzaF0pIHRoaXMubWFwW2hhc2hdID0gW107XG5cdFx0XHRcdFx0dGhpcy5tYXBbaGFzaF0ucHVzaChvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBlbnRyeTtcblx0XHR9LFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lm1hcC5zZWFyY2hcblx0KiBAY29tcCBDcmFmdHkubWFwXG4gICAgKiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5tYXAuc2VhcmNoKE9iamVjdCByZWN0WywgQm9vbGVhbiBmaWx0ZXJdKVxuXHQqIEBwYXJhbSByZWN0IC0gdGhlIHJlY3Rhbmd1bGFyIHJlZ2lvbiB0byBzZWFyY2ggZm9yIGVudGl0aWVzLlxuXHQqIEBwYXJhbSBmaWx0ZXIgLSBEZWZhdWx0IHZhbHVlIGlzIHRydWUuIE90aGVyd2lzZSwgbXVzdCBiZSBmYWxzZS5cblx0KiBcbiAgICAqIC0gSWYgYGZpbHRlcmAgaXMgYGZhbHNlYCwganVzdCBzZWFyY2ggZm9yIGFsbCB0aGUgZW50cmllcyBpbiB0aGUgZ2l2ZSBgcmVjdGAgcmVnaW9uIGJ5IGJyb2FkIHBoYXNlIGNvbGxpc2lvbi4gRW50aXR5IG1heSBiZSByZXR1cm5lZCBkdXBsaWNhdGVkLlxuICAgICogLSBJZiBgZmlsdGVyYCBpcyBgdHJ1ZWAsIGZpbHRlciB0aGUgYWJvdmUgcmVzdWx0cyBieSBjaGVja2luZyB0aGF0IHRoZXkgYWN0dWFsbHkgb3ZlcmxhcCBgcmVjdGAuXG4gICAgKiBUaGUgZWFzaWVyIHVzYWdlIGlzIHdpdGggYGZpbHRlcmA9YHRydWVgLiBGb3IgcGVyZm9ybWFuY2UgcmVhc29uLCB5b3UgbWF5IHVzZSBgZmlsdGVyYD1gZmFsc2VgLCBhbmQgZmlsdGVyIHRoZSByZXN1bHQgeW91cnNlbGYuIFNlZSBleGFtcGxlcyBpbiBkcmF3aW5nLmpzIGFuZCBjb2xsaXNpb24uanNcblx0Ki9cblx0XHRzZWFyY2g6IGZ1bmN0aW9uIChyZWN0LCBmaWx0ZXIpIHtcblx0XHRcdHZhciBrZXlzID0gSGFzaE1hcC5rZXkocmVjdCksXG5cdFx0XHRpLCBqLFxuXHRcdFx0aGFzaCxcblx0XHRcdHJlc3VsdHMgPSBbXTtcblxuXHRcdFx0aWYgKGZpbHRlciA9PT0gdW5kZWZpbmVkKSBmaWx0ZXIgPSB0cnVlOyAvL2RlZmF1bHQgZmlsdGVyIHRvIHRydWVcblxuXHRcdFx0Ly9zZWFyY2ggaW4gYWxsIHggYnVja2V0c1xuXHRcdFx0Zm9yIChpID0ga2V5cy54MTsgaSA8PSBrZXlzLngyOyBpKyspIHtcblx0XHRcdFx0Ly9pbnNlcnQgaW50byBhbGwgeSBidWNrZXRzXG5cdFx0XHRcdGZvciAoaiA9IGtleXMueTE7IGogPD0ga2V5cy55MjsgaisrKSB7XG5cdFx0XHRcdFx0aGFzaCA9IGkgKyBTUEFDRSArIGo7XG5cblx0XHRcdFx0XHRpZiAodGhpcy5tYXBbaGFzaF0pIHtcblx0XHRcdFx0XHRcdHJlc3VsdHMgPSByZXN1bHRzLmNvbmNhdCh0aGlzLm1hcFtoYXNoXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChmaWx0ZXIpIHtcblx0XHRcdFx0dmFyIG9iaiwgaWQsIGZpbmFscmVzdWx0ID0gW10sIGZvdW5kID0ge307XG5cdFx0XHRcdC8vYWRkIHVuaXF1ZSBlbGVtZW50cyB0byBsb29rdXAgdGFibGUgd2l0aCB0aGUgZW50aXR5IElEIGFzIHVuaXF1ZSBrZXlcblx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IHJlc3VsdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0b2JqID0gcmVzdWx0c1tpXTtcblx0XHRcdFx0XHRpZiAoIW9iaikgY29udGludWU7IC8vc2tpcCBpZiBkZWxldGVkXG5cdFx0XHRcdFx0aWQgPSBvYmpbMF07IC8vdW5pcXVlIElEXG5cblx0XHRcdFx0XHQvL2NoZWNrIGlmIG5vdCBhZGRlZCB0byBoYXNoIGFuZCB0aGF0IGFjdHVhbGx5IGludGVyc2VjdHNcblx0XHRcdFx0XHRpZiAoIWZvdW5kW2lkXSAmJiBvYmoueCA8IHJlY3QuX3ggKyByZWN0Ll93ICYmIG9iai5feCArIG9iai5fdyA+IHJlY3QuX3ggJiZcblx0XHRcdFx0XHRcdFx0XHQgb2JqLnkgPCByZWN0Ll95ICsgcmVjdC5faCAmJiBvYmouX2ggKyBvYmouX3kgPiByZWN0Ll95KVxuXHRcdFx0XHRcdFx0Zm91bmRbaWRdID0gcmVzdWx0c1tpXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vbG9vcCBvdmVyIGxvb2t1cCB0YWJsZSBhbmQgY29weSB0byBmaW5hbCBhcnJheVxuXHRcdFx0XHRmb3IgKG9iaiBpbiBmb3VuZCkgZmluYWxyZXN1bHQucHVzaChmb3VuZFtvYmpdKTtcblxuXHRcdFx0XHRyZXR1cm4gZmluYWxyZXN1bHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHRcdH1cblx0XHR9LFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lm1hcC5yZW1vdmVcblx0KiBAY29tcCBDcmFmdHkubWFwXG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5Lm1hcC5yZW1vdmUoW09iamVjdCBrZXlzLCBdT2JqZWN0IG9iailcblx0KiBAcGFyYW0ga2V5cyAtIGtleSByZWdpb24uIElmIG9taXR0ZWQsIGl0IHdpbGwgYmUgZGVyaXZlZCBmcm9tIG9iaiBieSBgQ3JhZnR5Lkhhc2hNYXAua2V5YC5cblx0KiBAcGFyYW0gb2JqIC0gbmVlZCBtb3JlIGRvY3VtZW50LlxuXHQqIFxuXHQqIFJlbW92ZSBhbiBlbnRpdHkgaW4gYSBicm9hZCBwaGFzZSBtYXAuXG5cdCogLSBUaGUgc2Vjb25kIGZvcm0gaXMgb25seSB1c2VkIGluIENyYWZ0eS5IYXNoTWFwIHRvIHNhdmUgdGltZSBmb3IgY29tcHV0aW5nIGtleXMgYWdhaW4sIHdoZXJlIGtleXMgd2VyZSBjb21wdXRlZCBwcmV2aW91c2x5IGZyb20gb2JqLiBFbmQgdXNlcnMgc2hvdWxkIG5vdCBjYWxsIHRoaXMgZm9ybSBkaXJlY3RseS5cblx0KlxuXHQqIEBleGFtcGxlIFxuXHQqIH5+flxuXHQqIENyYWZ0eS5tYXAucmVtb3ZlKGUpO1xuXHQqIH5+flxuXHQqL1xuXHRcdHJlbW92ZTogZnVuY3Rpb24gKGtleXMsIG9iaikge1xuXHRcdFx0dmFyIGkgPSAwLCBqLCBoYXNoO1xuXG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdG9iaiA9IGtleXM7XG5cdFx0XHRcdGtleXMgPSBIYXNoTWFwLmtleShvYmopO1xuXHRcdFx0fVxuXG5cdFx0XHQvL3NlYXJjaCBpbiBhbGwgeCBidWNrZXRzXG5cdFx0XHRmb3IgKGkgPSBrZXlzLngxOyBpIDw9IGtleXMueDI7IGkrKykge1xuXHRcdFx0XHQvL2luc2VydCBpbnRvIGFsbCB5IGJ1Y2tldHNcblx0XHRcdFx0Zm9yIChqID0ga2V5cy55MTsgaiA8PSBrZXlzLnkyOyBqKyspIHtcblx0XHRcdFx0XHRoYXNoID0gaSArIFNQQUNFICsgajtcblxuXHRcdFx0XHRcdGlmICh0aGlzLm1hcFtoYXNoXSkge1xuXHRcdFx0XHRcdFx0dmFyIGNlbGwgPSB0aGlzLm1hcFtoYXNoXSxcblx0XHRcdFx0XHRcdG0sXG5cdFx0XHRcdFx0XHRuID0gY2VsbC5sZW5ndGg7XG5cdFx0XHRcdFx0XHQvL2xvb3Agb3ZlciBvYmpzIGluIGNlbGwgYW5kIGRlbGV0ZVxuXHRcdFx0XHRcdFx0Zm9yIChtID0gMDsgbSA8IG47IG0rKylcblx0XHRcdFx0XHRcdFx0aWYgKGNlbGxbbV0gJiYgY2VsbFttXVswXSA9PT0gb2JqWzBdKVxuXHRcdFx0XHRcdFx0XHRcdGNlbGwuc3BsaWNlKG0sIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0LyoqQFxuXHQqICNDcmFmdHkubWFwLmJvdW5kYXJpZXNcblx0KiBAY29tcCBDcmFmdHkubWFwXG5cdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkubWFwLmJvdW5kYXJpZXMoKVxuXHQqIFxuICAgICogVGhlIHJldHVybiBgT2JqZWN0YCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm1hdC5cbiAgICAqIH5+flxuXHQqIHtcbiAgICAqICAgbWluOiB7XG4gICAgKiAgICAgeDogdmFsX3gsXG4gICAgKiAgICAgeTogdmFsX3lcbiAgICAqICAgfSxcbiAgICAqICAgbWF4OiB7XG4gICAgKiAgICAgeDogdmFsX3gsXG4gICAgKiAgICAgeTogdmFsX3lcbiAgICAqICAgfVxuICAgICogfVxuICAgICogfn5+XG5cdCovXG5cdFx0Ym91bmRhcmllczogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGssIGVudCxcblx0XHRcdGhhc2ggPSB7XG5cdFx0XHRcdG1heDogeyB4OiAtSW5maW5pdHksIHk6IC1JbmZpbml0eSB9LFxuXHRcdFx0XHRtaW46IHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5IH1cblx0XHRcdH0sXG5cdFx0XHRjb29yZHMgPSB7XG5cdFx0XHRcdG1heDogeyB4OiAtSW5maW5pdHksIHk6IC1JbmZpbml0eSB9LFxuXHRcdFx0XHRtaW46IHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5IH1cblx0XHRcdH07XG5cbiAgICAgIC8vVXNpbmcgYnJvYWQgcGhhc2UgaGFzaCB0byBzcGVlZCB1cCB0aGUgY29tcHV0YXRpb24gb2YgYm91bmRhcmllcy5cblx0XHRcdGZvciAodmFyIGggaW4gdGhpcy5tYXApIHtcblx0XHRcdFx0aWYgKCF0aGlzLm1hcFtoXS5sZW5ndGgpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vYnJvYWQgcGhhc2UgY29vcmRpbmF0ZVxuXHRcdFx0XHR2YXIgbWFwX2Nvb3JkID0gaC5zcGxpdChTUEFDRSksXG5cdFx0XHRcdFx0aT1tYXBfY29vcmRbMF0sXG5cdFx0XHRcdFx0aj1tYXBfY29vcmRbMF07XG5cdFx0XHRcdGlmIChpID49IGhhc2gubWF4LngpIHtcblx0XHRcdFx0XHRoYXNoLm1heC54ID0gaTtcblx0XHRcdFx0XHRmb3IgKGsgaW4gdGhpcy5tYXBbaF0pIHtcblx0XHRcdFx0XHRcdGVudCA9IHRoaXMubWFwW2hdW2tdO1xuXHRcdFx0XHRcdFx0Ly9tYWtlIHN1cmUgdGhhdCB0aGlzIGlzIGEgQ3JhZnR5IGVudGl0eVxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlbnQgPT0gJ29iamVjdCcgJiYgJ3JlcXVpcmVzJyBpbiBlbnQpIHtcblx0XHRcdFx0XHRcdFx0Y29vcmRzLm1heC54ID0gTWF0aC5tYXgoY29vcmRzLm1heC54LCBlbnQueCArIGVudC53KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGkgPD0gaGFzaC5taW4ueCkge1xuXHRcdFx0XHRcdGhhc2gubWluLnggPSBpO1xuXHRcdFx0XHRcdGZvciAoayBpbiB0aGlzLm1hcFtoXSkge1xuXHRcdFx0XHRcdFx0ZW50ID0gdGhpcy5tYXBbaF1ba107XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGVudCA9PSAnb2JqZWN0JyAmJiAncmVxdWlyZXMnIGluIGVudCkge1xuXHRcdFx0XHRcdFx0XHRjb29yZHMubWluLnggPSBNYXRoLm1pbihjb29yZHMubWluLngsIGVudC54KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGogPj0gaGFzaC5tYXgueSkge1xuXHRcdFx0XHRcdGhhc2gubWF4LnkgPSBqO1xuXHRcdFx0XHRcdGZvciAoayBpbiB0aGlzLm1hcFtoXSkge1xuXHRcdFx0XHRcdFx0ZW50ID0gdGhpcy5tYXBbaF1ba107XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGVudCA9PSAnb2JqZWN0JyAmJiAncmVxdWlyZXMnIGluIGVudCkge1xuXHRcdFx0XHRcdFx0XHRjb29yZHMubWF4LnkgPSBNYXRoLm1heChjb29yZHMubWF4LnksIGVudC55ICsgZW50LmgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaiA8PSBoYXNoLm1pbi55KSB7XG5cdFx0XHRcdFx0aGFzaC5taW4ueSA9IGo7XG5cdFx0XHRcdFx0Zm9yIChrIGluIHRoaXMubWFwW2hdKSB7XG5cdFx0XHRcdFx0XHRlbnQgPSB0aGlzLm1hcFtoXVtrXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZW50ID09ICdvYmplY3QnICYmICdyZXF1aXJlcycgaW4gZW50KSB7XG5cdFx0XHRcdFx0XHRcdGNvb3Jkcy5taW4ueSA9IE1hdGgubWluKGNvb3Jkcy5taW4ueSwgZW50LnkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY29vcmRzO1xuXHRcdH1cblx0fTtcblxuLyoqQFxuKiAjQ3JhZnR5Lkhhc2hNYXBcbiogQGNhdGVnb3J5IDJEXG4qIEJyb2FkLXBoYXNlIGNvbGxpc2lvbiBkZXRlY3Rpb24gZW5naW5lLiBTZWUgYmFja2dyb3VuZCBpbmZvcm1hdGlvbiBhdCBcbipcbiogfn5+XG4qIC0gW04gVHV0b3JpYWwgQiAtIEJyb2FkLVBoYXNlIENvbGxpc2lvbl0oaHR0cDovL3d3dy5tZXRhbmV0c29mdHdhcmUuY29tL3RlY2huaXF1ZS90dXRvcmlhbEIuaHRtbClcbiogLSBbQnJvYWQtUGhhc2UgQ29sbGlzaW9uIERldGVjdGlvbiB3aXRoIENVREFdKGh0dHAuZGV2ZWxvcGVyLm52aWRpYS5jb20vR1BVR2VtczMvZ3B1Z2VtczNfY2gzMi5odG1sKVxuKiB+fn5cbiogQHNlZSBDcmFmdHkubWFwXG4qL1xuXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lkhhc2hNYXAua2V5XG5cdCogQGNvbXAgQ3JhZnR5Lkhhc2hNYXBcblx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5IYXNoTWFwLmtleShPYmplY3Qgb2JqKVxuXHQqIEBwYXJhbSBvYmogLSBhbiBPYmplY3QgdGhhdCBoYXMgLm1icigpIG9yIF94LCBfeSwgX3cgYW5kIF9oLlxuICAgICogR2V0IHRoZSByZWN0YW5ndWxhciByZWdpb24gKGluIHRlcm1zIG9mIHRoZSBncmlkLCB3aXRoIGdyaWQgc2l6ZSBgY2VsbHNpemVgKSwgd2hlcmUgdGhlIG9iamVjdCBtYXkgZmFsbCBpbi4gVGhpcyByZWdpb24gaXMgZGV0ZXJtaW5lZCBieSB0aGUgb2JqZWN0J3MgYm91bmRpbmcgYm94LlxuICAgICogVGhlIGBjZWxsc2l6ZWAgaXMgNjQgYnkgZGVmYXVsdC5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkuSGFzaE1hcC5jb25zdHJ1Y3RvclxuXHQqL1xuXHRIYXNoTWFwLmtleSA9IGZ1bmN0aW9uIChvYmopIHtcblx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KCdtYnInKSkge1xuXHRcdFx0b2JqID0gb2JqLm1icigpO1xuXHRcdH1cblx0XHR2YXIgeDEgPSBNYXRoLmZsb29yKG9iai5feCAvIGNlbGxzaXplKSxcblx0XHR5MSA9IE1hdGguZmxvb3Iob2JqLl95IC8gY2VsbHNpemUpLFxuXHRcdHgyID0gTWF0aC5mbG9vcigob2JqLl93ICsgb2JqLl94KSAvIGNlbGxzaXplKSxcblx0XHR5MiA9IE1hdGguZmxvb3IoKG9iai5faCArIG9iai5feSkgLyBjZWxsc2l6ZSk7XG5cdFx0cmV0dXJuIHsgeDE6IHgxLCB5MTogeTEsIHgyOiB4MiwgeTI6IHkyIH07XG5cdH07XG5cblx0SGFzaE1hcC5oYXNoID0gZnVuY3Rpb24gKGtleXMpIHtcblx0XHRyZXR1cm4ga2V5cy54MSArIFNQQUNFICsga2V5cy55MSArIFNQQUNFICsga2V5cy54MiArIFNQQUNFICsga2V5cy55Mjtcblx0fTtcblxuXHRmdW5jdGlvbiBFbnRyeShrZXlzLCBvYmosIG1hcCkge1xuXHRcdHRoaXMua2V5cyA9IGtleXM7XG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0dGhpcy5vYmogPSBvYmo7XG5cdH1cblxuXHRFbnRyeS5wcm90b3R5cGUgPSB7XG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAocmVjdCkge1xuXHRcdFx0Ly9jaGVjayBpZiBidWNrZXRzIGNoYW5nZVxuXHRcdFx0aWYgKEhhc2hNYXAuaGFzaChIYXNoTWFwLmtleShyZWN0KSkgIT0gSGFzaE1hcC5oYXNoKHRoaXMua2V5cykpIHtcblx0XHRcdFx0dGhpcy5tYXAucmVtb3ZlKHRoaXMua2V5cywgdGhpcy5vYmopO1xuXHRcdFx0XHR2YXIgZSA9IHRoaXMubWFwLmluc2VydCh0aGlzLm9iaik7XG5cdFx0XHRcdHRoaXMua2V5cyA9IGUua2V5cztcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0cGFyZW50Lkhhc2hNYXAgPSBIYXNoTWFwO1xufSkoQ3JhZnR5KTtcblxuLyoqQFxuKiAjQ3JhZnR5Lm1hcFxuKiBAY2F0ZWdvcnkgMkRcbiogRnVuY3Rpb25zIHJlbGF0ZWQgd2l0aCBxdWVyeWluZyBlbnRpdGllcy5cbiogQHNlZSBDcmFmdHkuSGFzaE1hcFxuKi9cbkNyYWZ0eS5tYXAgPSBuZXcgQ3JhZnR5Lkhhc2hNYXAoKTtcbnZhciBNID0gTWF0aCxcblx0TWMgPSBNLmNvcyxcblx0TXMgPSBNLnNpbixcblx0UEkgPSBNLlBJLFxuXHRERUdfVE9fUkFEID0gUEkgLyAxODA7XG5cblxuLyoqQFxuKiAjMkRcbiogQGNhdGVnb3J5IDJEXG4qIENvbXBvbmVudCBmb3IgYW55IGVudGl0eSB0aGF0IGhhcyBhIHBvc2l0aW9uIG9uIHRoZSBzdGFnZS5cbiogQHRyaWdnZXIgTW92ZSAtIHdoZW4gdGhlIGVudGl0eSBoYXMgbW92ZWQgLSB7IF94Ok51bWJlciwgX3k6TnVtYmVyLCBfdzpOdW1iZXIsIF9oOk51bWJlciB9IC0gT2xkIHBvc2l0aW9uXG4qIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIGVudGl0eSBoYXMgbW92ZWQgLSB7IF94Ok51bWJlciwgX3k6TnVtYmVyLCBfdzpOdW1iZXIsIF9oOk51bWJlciB9IC0gT2xkIHBvc2l0aW9uXG4qIEB0cmlnZ2VyIFJvdGF0ZSAtIHdoZW4gdGhlIGVudGl0eSBpcyByb3RhdGVkIC0geyBjb3M6TnVtYmVyLCBzaW46TnVtYmVyLCBkZWc6TnVtYmVyLCByYWQ6TnVtYmVyLCBvOiB7eDpOdW1iZXIsIHk6TnVtYmVyfSwgbWF0cml4OiB7TTExLCBNMTIsIE0yMSwgTTIyfSB9XG4qL1xuQ3JhZnR5LmMoXCIyRFwiLCB7XG4vKipAXG5cdCogIy54XG5cdCogQGNvbXAgMkRcblx0KiBUaGUgYHhgIHBvc2l0aW9uIG9uIHRoZSBzdGFnZS4gV2hlbiBtb2RpZmllZCwgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHJlZHJhd24uXG5cdCogSXMgYWN0dWFsbHkgYSBnZXR0ZXIvc2V0dGVyIHNvIHdoZW4gdXNpbmcgdGhpcyB2YWx1ZSBmb3IgY2FsY3VsYXRpb25zIGFuZCBub3QgbW9kaWZ5aW5nIGl0LFxuXHQqIHVzZSB0aGUgYC5feGAgcHJvcGVydHkuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X3g6IDAsXG5cdC8qKkBcblx0KiAjLnlcblx0KiBAY29tcCAyRFxuXHQqIFRoZSBgeWAgcG9zaXRpb24gb24gdGhlIHN0YWdlLiBXaGVuIG1vZGlmaWVkLCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcmVkcmF3bi5cblx0KiBJcyBhY3R1YWxseSBhIGdldHRlci9zZXR0ZXIgc28gd2hlbiB1c2luZyB0aGlzIHZhbHVlIGZvciBjYWxjdWxhdGlvbnMgYW5kIG5vdCBtb2RpZnlpbmcgaXQsXG5cdCogdXNlIHRoZSBgLl95YCBwcm9wZXJ0eS5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfeTogMCxcblx0LyoqQFxuXHQqICMud1xuXHQqIEBjb21wIDJEXG5cdCogVGhlIHdpZHRoIG9mIHRoZSBlbnRpdHkuIFdoZW4gbW9kaWZpZWQsIHdpbGwgYXV0b21hdGljYWxseSBiZSByZWRyYXduLlxuXHQqIElzIGFjdHVhbGx5IGEgZ2V0dGVyL3NldHRlciBzbyB3aGVuIHVzaW5nIHRoaXMgdmFsdWUgZm9yIGNhbGN1bGF0aW9ucyBhbmQgbm90IG1vZGlmeWluZyBpdCxcblx0KiB1c2UgdGhlIGAuX3dgIHByb3BlcnR5LlxuXHQqXG5cdCogQ2hhbmdpbmcgdGhpcyB2YWx1ZSBpcyBub3QgcmVjb21tZW5kZWQgYXMgY2FudmFzIGhhcyB0ZXJyaWJsZSByZXNpemUgcXVhbGl0eSBhbmQgRE9NIHdpbGwganVzdCBjbGlwIHRoZSBpbWFnZS5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfdzogMCxcblx0LyoqQFxuXHQqICMuaFxuXHQqIEBjb21wIDJEXG5cdCogVGhlIGhlaWdodCBvZiB0aGUgZW50aXR5LiBXaGVuIG1vZGlmaWVkLCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcmVkcmF3bi5cblx0KiBJcyBhY3R1YWxseSBhIGdldHRlci9zZXR0ZXIgc28gd2hlbiB1c2luZyB0aGlzIHZhbHVlIGZvciBjYWxjdWxhdGlvbnMgYW5kIG5vdCBtb2RpZnlpbmcgaXQsXG5cdCogdXNlIHRoZSBgLl9oYCBwcm9wZXJ0eS5cblx0KlxuXHQqIENoYW5naW5nIHRoaXMgdmFsdWUgaXMgbm90IHJlY29tbWVuZGVkIGFzIGNhbnZhcyBoYXMgdGVycmlibGUgcmVzaXplIHF1YWxpdHkgYW5kIERPTSB3aWxsIGp1c3QgY2xpcCB0aGUgaW1hZ2UuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X2g6IDAsXG5cdC8qKkBcblx0KiAjLnpcblx0KiBAY29tcCAyRFxuXHQqIFRoZSBgemAgaW5kZXggb24gdGhlIHN0YWdlLiBXaGVuIG1vZGlmaWVkLCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcmVkcmF3bi5cblx0KiBJcyBhY3R1YWxseSBhIGdldHRlci9zZXR0ZXIgc28gd2hlbiB1c2luZyB0aGlzIHZhbHVlIGZvciBjYWxjdWxhdGlvbnMgYW5kIG5vdCBtb2RpZnlpbmcgaXQsXG5cdCogdXNlIHRoZSBgLl96YCBwcm9wZXJ0eS5cblx0KlxuXHQqIEEgaGlnaGVyIGB6YCB2YWx1ZSB3aWxsIGJlIGNsb3NlciB0byB0aGUgZnJvbnQgb2YgdGhlIHN0YWdlLiBBIHNtYWxsZXIgYHpgIHZhbHVlIHdpbGwgYmUgY2xvc2VyIHRvIHRoZSBiYWNrLlxuXHQqIEEgZ2xvYmFsIFogaW5kZXggaXMgcHJvZHVjZWQgYmFzZWQgb24gaXRzIGB6YCB2YWx1ZSBhcyB3ZWxsIGFzIHRoZSBHSUQgKHdoaWNoIGVudGl0eSB3YXMgY3JlYXRlZCBmaXJzdCkuXG5cdCogVGhlcmVmb3JlIGVudGl0aWVzIHdpbGwgbmF0dXJhbGx5IG1haW50YWluIG9yZGVyIGRlcGVuZGluZyBvbiB3aGVuIGl0IHdhcyBjcmVhdGVkIGlmIHNhbWUgeiB2YWx1ZS5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfejogMCxcblx0LyoqQFxuXHQqICMucm90YXRpb25cblx0KiBAY29tcCAyRFxuXHQqIFNldCB0aGUgcm90YXRpb24gb2YgeW91ciBlbnRpdHkuIFJvdGF0aW9uIHRha2VzIGRlZ3JlZXMgaW4gYSBjbG9ja3dpc2UgZGlyZWN0aW9uLlxuXHQqIEl0IGlzIGltcG9ydGFudCB0byBub3RlIHRoZXJlIGlzIG5vIGxpbWl0IG9uIHRoZSByb3RhdGlvbiB2YWx1ZS4gU2V0dGluZyBhIHJvdGF0aW9uXG5cdCogbW9kIDM2MCB3aWxsIGdpdmUgdGhlIHNhbWUgcm90YXRpb24gd2l0aG91dCByZWFjaGluZyBodWdlIG51bWJlcnMuXG5cdCogQHNlZSAuX2F0dHJcblx0Ki9cblx0X3JvdGF0aW9uOiAwLFxuXHQvKipAXG5cdCogIy5hbHBoYVxuXHQqIEBjb21wIDJEXG5cdCogVHJhbnNwYXJlbmN5IG9mIGFuIGVudGl0eS4gTXVzdCBiZSBhIGRlY2ltYWwgdmFsdWUgYmV0d2VlbiAwLjAgYmVpbmcgZnVsbHkgdHJhbnNwYXJlbnQgdG8gMS4wIGJlaW5nIGZ1bGx5IG9wYXF1ZS5cblx0Ki9cblx0X2FscGhhOiAxLjAsXG5cdC8qKkBcblx0KiAjLnZpc2libGVcblx0KiBAY29tcCAyRFxuXHQqIElmIHRoZSBlbnRpdHkgaXMgdmlzaWJsZSBvciBub3QuIEFjY2VwdHMgYSB0cnVlIG9yIGZhbHNlIHZhbHVlLlxuXHQqIENhbiBiZSB1c2VkIGZvciBvcHRpbWl6YXRpb24gYnkgc2V0dGluZyBhbiBlbnRpdGllcyB2aXNpYmlsaXR5IHRvIGZhbHNlIHdoZW4gbm90IG5lZWRlZCB0byBiZSBkcmF3bi5cblx0KlxuXHQqIFRoZSBlbnRpdHkgd2lsbCBzdGlsbCBleGlzdCBhbmQgY2FuIGJlIGNvbGxpZGVkIHdpdGggYnV0IGp1c3Qgd29uJ3QgYmUgZHJhd24uXG4gICogQHNlZSBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdywgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGxcblx0Ki9cblx0X3Zpc2libGU6IHRydWUsXG5cblx0LyoqQFxuXHQqICMuX2dsb2JhbFpcblx0KiBAY29tcCAyRFxuXHQqIFdoZW4gdHdvIGVudGl0aWVzIG92ZXJsYXAsIHRoZSBvbmUgd2l0aCB0aGUgbGFyZ2VyIGBfZ2xvYmFsWmAgd2lsbCBiZSBvbiB0b3Agb2YgdGhlIG90aGVyLlxuXHQqIEBzZWUgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXcsIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsXG5cdCovXG5cdF9nbG9iYWxaOiBudWxsLFxuXG5cdF9vcmlnaW46IG51bGwsXG5cdF9tYnI6IG51bGwsXG5cdF9lbnRyeTogbnVsbCxcblx0X2NoaWxkcmVuOiBudWxsLFxuXHRfcGFyZW50OiBudWxsLFxuXHRfY2hhbmdlZDogZmFsc2UsXG5cblx0X2RlZmluZUdldHRlclNldHRlcl9zZXR0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdC8vY3JlYXRlIGdldHRlcnMgYW5kIHNldHRlcnMgdXNpbmcgX19kZWZpbmVTZXR0ZXJfXyBhbmQgX19kZWZpbmVHZXR0ZXJfX1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygneCcsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ194Jywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygneScsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ195Jywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygndycsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ193Jywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygnaCcsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19oJywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygneicsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ196Jywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygncm90YXRpb24nLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfcm90YXRpb24nLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCdhbHBoYScsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19hbHBoYScsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3Zpc2libGUnLCBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfdmlzaWJsZScsIHYpOyB9KTtcblxuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygneCcsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3g7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygneScsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3k7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygndycsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3c7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygnaCcsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2g7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygneicsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3o7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygncm90YXRpb24nLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9yb3RhdGlvbjsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCdhbHBoYScsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2FscGhhOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3Zpc2libGUnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl92aXNpYmxlOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3BhcmVudCcsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3BhcmVudDsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCdudW1DaGlsZHJlbicsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2NoaWxkcmVuLmxlbmd0aDsgfSk7XG5cdH0sXG5cblx0X2RlZmluZUdldHRlclNldHRlcl9kZWZpbmVQcm9wZXJ0eTogZnVuY3Rpb24oKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd4Jywge1xuXHRcdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ194Jywgdik7IH1cblx0XHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3g7IH1cblx0XHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd5Jywge1xuXHRcdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ195Jywgdik7IH1cblx0XHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3k7IH1cblx0XHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3Jywge1xuXHRcdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ193Jywgdik7IH1cblx0XHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3c7IH1cblx0XHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdoJywge1xuXHRcdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19oJywgdik7IH1cblx0XHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2g7IH1cblx0XHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd6Jywge1xuXHRcdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ196Jywgdik7IH1cblx0XHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3o7IH1cblx0XHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyb3RhdGlvbicsIHtcblx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3JvdGF0aW9uJywgdik7IH1cblx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9yb3RhdGlvbjsgfVxuXHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYWxwaGEnLCB7XG5cdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19hbHBoYScsIHYpOyB9XG5cdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fYWxwaGE7IH1cblx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3Zpc2libGUnLCB7XG5cdFx0XHRzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ192aXNpYmxlJywgdik7IH1cblx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl92aXNpYmxlOyB9XG5cdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdH0pO1xuXHR9LFxuXG5cdF9kZWZpbmVHZXR0ZXJTZXR0ZXJfZmFsbGJhY2s6IGZ1bmN0aW9uKCkge1xuXHRcdC8vc2V0IHRoZSBwdWJsaWMgcHJvcGVydGllcyB0byB0aGUgY3VycmVudCBwcml2YXRlIHByb3BlcnRpZXNcblx0XHR0aGlzLnggPSB0aGlzLl94O1xuXHRcdHRoaXMueSA9IHRoaXMuX3k7XG5cdFx0dGhpcy53ID0gdGhpcy5fdztcblx0XHR0aGlzLmggPSB0aGlzLl9oO1xuXHRcdHRoaXMueiA9IHRoaXMuX3o7XG5cdFx0dGhpcy5yb3RhdGlvbiA9IHRoaXMuX3JvdGF0aW9uO1xuXHRcdHRoaXMuYWxwaGEgPSB0aGlzLl9hbHBoYTtcblx0XHR0aGlzLnZpc2libGUgPSB0aGlzLl92aXNpYmxlO1xuXG5cdFx0Ly9vbiBldmVyeSBmcmFtZSBjaGVjayBmb3IgYSBkaWZmZXJlbmNlIGluIGFueSBwcm9wZXJ0eVxuXHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly9pZiB0aGVyZSBhcmUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0aGUgcHVibGljIGFuZCBwcml2YXRlIHByb3BlcnRpZXNcblx0XHRcdGlmICh0aGlzLnggIT09IHRoaXMuX3ggfHwgdGhpcy55ICE9PSB0aGlzLl95IHx8XG5cdFx0XHRcdHRoaXMudyAhPT0gdGhpcy5fdyB8fCB0aGlzLmggIT09IHRoaXMuX2ggfHxcblx0XHRcdFx0dGhpcy56ICE9PSB0aGlzLl96IHx8IHRoaXMucm90YXRpb24gIT09IHRoaXMuX3JvdGF0aW9uIHx8XG5cdFx0XHRcdHRoaXMuYWxwaGEgIT09IHRoaXMuX2FscGhhIHx8IHRoaXMudmlzaWJsZSAhPT0gdGhpcy5fdmlzaWJsZSkge1xuXG5cdFx0XHRcdC8vc2F2ZSB0aGUgb2xkIHBvc2l0aW9uc1xuXHRcdFx0XHR2YXIgb2xkID0gdGhpcy5tYnIoKSB8fCB0aGlzLnBvcygpO1xuXG5cdFx0XHRcdC8vaWYgcm90YXRpb24gaGFzIGNoYW5nZWQsIHVzZSB0aGUgcHJpdmF0ZSByb3RhdGUgbWV0aG9kXG5cdFx0XHRcdGlmICh0aGlzLnJvdGF0aW9uICE9PSB0aGlzLl9yb3RhdGlvbikge1xuXHRcdFx0XHRcdHRoaXMuX3JvdGF0ZSh0aGlzLnJvdGF0aW9uKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvL3VwZGF0ZSB0aGUgTUJSXG5cdFx0XHRcdFx0dmFyIG1iciA9IHRoaXMuX21iciwgbW92ZWQgPSBmYWxzZTtcblx0XHRcdFx0XHQvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IGhhdmUgZ2V0dGVycyBvciBzZXR0ZXJzLFxuXHRcdFx0XHRcdC8vIHt4LCB5LCB3LCBoLCB6fSBhbmQge194LCBfeSwgX3csIF9oLCBfen0gbWF5IGJlIG91dCBvZiBzeW5jLFxuXHRcdFx0XHRcdC8vIGluIHdoaWNoIGNhc2UgdCBjaGVja3MgaWYgdGhleSBhcmUgZGlmZmVyZW50IG9uIHRpY2sgYW5kIGV4ZWN1dGVzIHRoZSBDaGFuZ2UgZXZlbnQuXG5cdFx0XHRcdFx0aWYgKG1icikgeyAvL2NoZWNrIGVhY2ggdmFsdWUgdG8gc2VlIHdoaWNoIGhhcyBjaGFuZ2VkXG5cdFx0XHRcdFx0XHRpZiAodGhpcy54ICE9PSB0aGlzLl94KSB7IG1ici5feCAtPSB0aGlzLnggLSB0aGlzLl94OyBtb3ZlZCA9IHRydWU7IH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHRoaXMueSAhPT0gdGhpcy5feSkgeyBtYnIuX3kgLT0gdGhpcy55IC0gdGhpcy5feTsgbW92ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLncgIT09IHRoaXMuX3cpIHsgbWJyLl93IC09IHRoaXMudyAtIHRoaXMuX3c7IG1vdmVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy5oICE9PSB0aGlzLl9oKSB7IG1ici5faCAtPSB0aGlzLmggLSB0aGlzLl9oOyBtb3ZlZCA9IHRydWU7IH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHRoaXMueiAhPT0gdGhpcy5feikgeyBtYnIuX3ogLT0gdGhpcy56IC0gdGhpcy5fejsgbW92ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly9pZiB0aGUgbW92ZWQgZmxhZyBpcyB0cnVlLCB0cmlnZ2VyIGEgbW92ZVxuXHRcdFx0XHRcdGlmIChtb3ZlZCkgdGhpcy50cmlnZ2VyKFwiTW92ZVwiLCBvbGQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9zZXQgdGhlIHB1YmxpYyBwcm9wZXJ0aWVzIHRvIHRoZSBwcml2YXRlIHByb3BlcnRpZXNcblx0XHRcdFx0dGhpcy5feCA9IHRoaXMueDtcblx0XHRcdFx0dGhpcy5feSA9IHRoaXMueTtcblx0XHRcdFx0dGhpcy5fdyA9IHRoaXMudztcblx0XHRcdFx0dGhpcy5faCA9IHRoaXMuaDtcblx0XHRcdFx0dGhpcy5feiA9IHRoaXMuejtcblx0XHRcdFx0dGhpcy5fcm90YXRpb24gPSB0aGlzLnJvdGF0aW9uO1xuXHRcdFx0XHR0aGlzLl9hbHBoYSA9IHRoaXMuYWxwaGE7XG5cdFx0XHRcdHRoaXMuX3Zpc2libGUgPSB0aGlzLnZpc2libGU7XG5cblx0XHRcdFx0Ly90cmlnZ2VyIHRoZSBjaGFuZ2VzXG5cdFx0XHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiLCBvbGQpO1xuXHRcdFx0XHQvL3dpdGhvdXQgdGhpcyBlbnRpdGllcyB3ZXJlbid0IGFkZGVkIGNvcnJlY3RseSB0byBDcmFmdHkubWFwLm1hcCBpbiBJRTguXG5cdFx0XHRcdC8vbm90IGVudGlyZWx5IHN1cmUgdGhpcyBpcyB0aGUgYmVzdCB3YXkgdG8gZml4IGl0IHRob3VnaFxuXHRcdFx0XHR0aGlzLnRyaWdnZXIoXCJNb3ZlXCIsIG9sZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG4gIH0sXG5cblx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fZ2xvYmFsWiA9IHRoaXNbMF07XG5cdFx0dGhpcy5fb3JpZ2luID0geyB4OiAwLCB5OiAwIH07XG5cdFx0dGhpcy5fY2hpbGRyZW4gPSBbXTtcblxuXHRcdGlmKENyYWZ0eS5zdXBwb3J0LnNldHRlcikge1xuICAgICAgdGhpcy5fZGVmaW5lR2V0dGVyU2V0dGVyX3NldHRlcigpO1xuXHRcdH0gZWxzZSBpZiAoQ3JhZnR5LnN1cHBvcnQuZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdC8vSUU5IHN1cHBvcnRzIE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuICAgICAgdGhpcy5fZGVmaW5lR2V0dGVyU2V0dGVyX2RlZmluZVByb3BlcnR5KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8qXG5cdFx0XHRJZiBubyBzZXR0ZXJzIGFuZCBnZXR0ZXJzIGFyZSBzdXBwb3J0ZWQgKGUuZy4gSUU4KSBzdXBwb3J0cyxcblx0XHRcdGNoZWNrIG9uIGV2ZXJ5IGZyYW1lIGZvciBhIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGlzLl8oeHx5fHd8aHx6Li4uKVxuXHRcdFx0YW5kIHRoaXMuKHh8eXx3fGh8eikgYW5kIHVwZGF0ZSBhY2NvcmRpbmdseS5cblx0XHRcdCovXG4gICAgICB0aGlzLl9kZWZpbmVHZXR0ZXJTZXR0ZXJfZmFsbGJhY2soKTtcblx0XHR9XG5cblx0XHQvL2luc2VydCBzZWxmIGludG8gdGhlIEhhc2hNYXBcblx0XHR0aGlzLl9lbnRyeSA9IENyYWZ0eS5tYXAuaW5zZXJ0KHRoaXMpO1xuXG5cdFx0Ly93aGVuIG9iamVjdCBjaGFuZ2VzLCB1cGRhdGUgSGFzaE1hcFxuXHRcdHRoaXMuYmluZChcIk1vdmVcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBhcmVhID0gdGhpcy5fbWJyIHx8IHRoaXM7XG5cdFx0XHR0aGlzLl9lbnRyeS51cGRhdGUoYXJlYSk7XG5cdFx0XHR0aGlzLl9jYXNjYWRlKGUpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5iaW5kKFwiUm90YXRlXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgb2xkID0gdGhpcy5fbWJyIHx8IHRoaXM7XG5cdFx0XHR0aGlzLl9lbnRyeS51cGRhdGUob2xkKTtcblx0XHRcdHRoaXMuX2Nhc2NhZGUoZSk7XG5cdFx0fSk7XG5cblx0XHQvL3doZW4gb2JqZWN0IGlzIHJlbW92ZWQsIHJlbW92ZSBmcm9tIEhhc2hNYXAgYW5kIGRlc3Ryb3kgYXR0YWNoZWQgY2hpbGRyZW5cblx0XHR0aGlzLmJpbmQoXCJSZW1vdmVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMuX2NoaWxkcmVuKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fY2hpbGRyZW5baV0uZGVzdHJveSkge1xuXHRcdFx0XHRcdFx0dGhpcy5fY2hpbGRyZW5baV0uZGVzdHJveSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9jaGlsZHJlbiA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5fcGFyZW50KSB7XG5cdFx0XHRcdHRoaXMuX3BhcmVudC5kZXRhY2godGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdENyYWZ0eS5tYXAucmVtb3ZlKHRoaXMpO1xuXG5cdFx0XHR0aGlzLmRldGFjaCgpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQqIENhbGN1bGF0ZXMgdGhlIE1CUiB3aGVuIHJvdGF0ZWQgd2l0aCBhbiBvcmlnaW4gcG9pbnRcblx0Ki9cblx0X3JvdGF0ZTogZnVuY3Rpb24gKHYpIHtcblx0XHR2YXIgdGhldGEgPSAtMSAqICh2ICUgMzYwKSwgLy9hbmdsZSBhbHdheXMgYmV0d2VlbiAwIGFuZCAzNTlcblx0XHRcdHJhZCA9IHRoZXRhICogREVHX1RPX1JBRCxcblx0XHRcdGN0ID0gTWF0aC5jb3MocmFkKSwgLy9jYWNoZSB0aGUgc2luIGFuZCBjb3NpbmUgb2YgdGhldGFcblx0XHRcdHN0ID0gTWF0aC5zaW4ocmFkKSxcblx0XHRcdG8gPSB7XG5cdFx0XHR4OiB0aGlzLl9vcmlnaW4ueCArIHRoaXMuX3gsXG5cdFx0XHR5OiB0aGlzLl9vcmlnaW4ueSArIHRoaXMuX3lcblx0XHR9O1xuXG5cdFx0Ly9pZiB0aGUgYW5nbGUgaXMgMCBhbmQgaXMgY3VycmVudGx5IDAsIHNraXBcblx0XHRpZiAoIXRoZXRhKSB7XG5cdFx0XHR0aGlzLl9tYnIgPSBudWxsO1xuXHRcdFx0aWYgKCF0aGlzLl9yb3RhdGlvbiAlIDM2MCkgcmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciB4MCA9IG8ueCArICh0aGlzLl94IC0gby54KSAqIGN0ICsgKHRoaXMuX3kgLSBvLnkpICogc3QsXG5cdFx0XHR5MCA9IG8ueSAtICh0aGlzLl94IC0gby54KSAqIHN0ICsgKHRoaXMuX3kgLSBvLnkpICogY3QsXG5cdFx0XHR4MSA9IG8ueCArICh0aGlzLl94ICsgdGhpcy5fdyAtIG8ueCkgKiBjdCArICh0aGlzLl95IC0gby55KSAqIHN0LFxuXHRcdFx0eTEgPSBvLnkgLSAodGhpcy5feCArIHRoaXMuX3cgLSBvLngpICogc3QgKyAodGhpcy5feSAtIG8ueSkgKiBjdCxcblx0XHRcdHgyID0gby54ICsgKHRoaXMuX3ggKyB0aGlzLl93IC0gby54KSAqIGN0ICsgKHRoaXMuX3kgKyB0aGlzLl9oIC0gby55KSAqIHN0LFxuXHRcdFx0eTIgPSBvLnkgLSAodGhpcy5feCArIHRoaXMuX3cgLSBvLngpICogc3QgKyAodGhpcy5feSArIHRoaXMuX2ggLSBvLnkpICogY3QsXG5cdFx0XHR4MyA9IG8ueCArICh0aGlzLl94IC0gby54KSAqIGN0ICsgKHRoaXMuX3kgKyB0aGlzLl9oIC0gby55KSAqIHN0LFxuXHRcdFx0eTMgPSBvLnkgLSAodGhpcy5feCAtIG8ueCkgKiBzdCArICh0aGlzLl95ICsgdGhpcy5faCAtIG8ueSkgKiBjdCxcblx0XHRcdG1pbnggPSBNYXRoLnJvdW5kKE1hdGgubWluKHgwLCB4MSwgeDIsIHgzKSksXG5cdFx0XHRtaW55ID0gTWF0aC5yb3VuZChNYXRoLm1pbih5MCwgeTEsIHkyLCB5MykpLFxuXHRcdFx0bWF4eCA9IE1hdGgucm91bmQoTWF0aC5tYXgoeDAsIHgxLCB4MiwgeDMpKSxcblx0XHRcdG1heHkgPSBNYXRoLnJvdW5kKE1hdGgubWF4KHkwLCB5MSwgeTIsIHkzKSk7XG5cblx0XHR0aGlzLl9tYnIgPSB7IF94OiBtaW54LCBfeTogbWlueSwgX3c6IG1heHggLSBtaW54LCBfaDogbWF4eSAtIG1pbnkgfTtcblxuXHRcdC8vdHJpZ2dlciByb3RhdGlvbiBldmVudFxuXHRcdHZhciBkaWZmZXJlbmNlID0gdGhpcy5fcm90YXRpb24gLSB2LFxuXHRcdFx0ZHJhZCA9IGRpZmZlcmVuY2UgKiBERUdfVE9fUkFEO1xuXG5cdFx0dGhpcy50cmlnZ2VyKFwiUm90YXRlXCIsIHtcblx0XHRcdGNvczogTWF0aC5jb3MoZHJhZCksXG5cdFx0XHRzaW46IE1hdGguc2luKGRyYWQpLFxuXHRcdFx0ZGVnOiBkaWZmZXJlbmNlLFxuXHRcdFx0cmFkOiBkcmFkLFxuXHRcdFx0bzogeyB4OiBvLngsIHk6IG8ueSB9LFxuXHRcdFx0bWF0cml4OiB7IE0xMTogY3QsIE0xMjogc3QsIE0yMTogLXN0LCBNMjI6IGN0IH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5hcmVhXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgTnVtYmVyIC5hcmVhKHZvaWQpXG5cdCogQ2FsY3VsYXRlcyB0aGUgYXJlYSBvZiB0aGUgZW50aXR5XG5cdCovXG5cdGFyZWE6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fdyAqIHRoaXMuX2g7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuaW50ZXJzZWN0XG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuaW50ZXJzZWN0KE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB3IC0gV2lkdGggb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gaCAtIEhlaWdodCBvZiB0aGUgcmVjdFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5pbnRlcnNlY3QoT2JqZWN0IHJlY3QpXG5cdCogQHBhcmFtIHJlY3QgLSBBbiBvYmplY3QgdGhhdCBtdXN0IGhhdmUgdGhlIGB4LCB5LCB3LCBoYCB2YWx1ZXMgYXMgcHJvcGVydGllc1xuXHQqIERldGVybWluZXMgaWYgdGhpcyBlbnRpdHkgaW50ZXJzZWN0cyBhIHJlY3RhbmdsZS5cblx0Ki9cblx0aW50ZXJzZWN0OiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdHZhciByZWN0LCBvYmogPSB0aGlzLl9tYnIgfHwgdGhpcztcblx0XHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdHJlY3QgPSB4O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWN0ID0geyB4OiB4LCB5OiB5LCB3OiB3LCBoOiBoIH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9iai5feCA8IHJlY3QueCArIHJlY3QudyAmJiBvYmouX3ggKyBvYmouX3cgPiByZWN0LnggJiZcblx0XHRcdCAgIG9iai5feSA8IHJlY3QueSArIHJlY3QuaCAmJiBvYmouX2ggKyBvYmouX3kgPiByZWN0Lnk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMud2l0aGluXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAud2l0aGluKE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB3IC0gV2lkdGggb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gaCAtIEhlaWdodCBvZiB0aGUgcmVjdFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC53aXRoaW4oT2JqZWN0IHJlY3QpXG5cdCogQHBhcmFtIHJlY3QgLSBBbiBvYmplY3QgdGhhdCBtdXN0IGhhdmUgdGhlIGB4LCB5LCB3LCBoYCB2YWx1ZXMgYXMgcHJvcGVydGllc1xuXHQqIERldGVybWluZXMgaWYgdGhpcyBjdXJyZW50IGVudGl0eSBpcyB3aXRoaW4gYW5vdGhlciByZWN0YW5nbGUuXG5cdCovXG5cdHdpdGhpbjogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHR2YXIgcmVjdDtcblx0XHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdHJlY3QgPSB4O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWN0ID0geyB4OiB4LCB5OiB5LCB3OiB3LCBoOiBoIH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlY3QueCA8PSB0aGlzLnggJiYgcmVjdC54ICsgcmVjdC53ID49IHRoaXMueCArIHRoaXMudyAmJlxuXHRcdFx0XHRyZWN0LnkgPD0gdGhpcy55ICYmIHJlY3QueSArIHJlY3QuaCA+PSB0aGlzLnkgKyB0aGlzLmg7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuY29udGFpbnNcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5jb250YWlucyhOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gdyAtIFdpZHRoIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIGggLSBIZWlnaHQgb2YgdGhlIHJlY3Rcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuY29udGFpbnMoT2JqZWN0IHJlY3QpXG5cdCogQHBhcmFtIHJlY3QgLSBBbiBvYmplY3QgdGhhdCBtdXN0IGhhdmUgdGhlIGB4LCB5LCB3LCBoYCB2YWx1ZXMgYXMgcHJvcGVydGllc1xuXHQqIERldGVybWluZXMgaWYgdGhlIHJlY3RhbmdsZSBpcyB3aXRoaW4gdGhlIGN1cnJlbnQgZW50aXR5LlxuXHQqL1xuXHRjb250YWluczogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHR2YXIgcmVjdDtcblx0XHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdHJlY3QgPSB4O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWN0ID0geyB4OiB4LCB5OiB5LCB3OiB3LCBoOiBoIH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlY3QueCA+PSB0aGlzLnggJiYgcmVjdC54ICsgcmVjdC53IDw9IHRoaXMueCArIHRoaXMudyAmJlxuXHRcdFx0XHRyZWN0LnkgPj0gdGhpcy55ICYmIHJlY3QueSArIHJlY3QuaCA8PSB0aGlzLnkgKyB0aGlzLmg7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMucG9zXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IC5wb3Modm9pZClcblx0KiBSZXR1cm5zIHRoZSB4LCB5LCB3LCBoIHByb3BlcnRpZXMgYXMgYSByZWN0IG9iamVjdFxuXHQqIChhIHJlY3Qgb2JqZWN0IGlzIGp1c3QgYW4gb2JqZWN0IHdpdGggdGhlIGtleXMgX3gsIF95LCBfdywgX2gpLlxuXHQqXG5cdCogVGhlIGtleXMgaGF2ZSBhbiB1bmRlcnNjb3JlIHByZWZpeC4gVGhpcyBpcyBkdWUgdG8gdGhlIHgsIHksIHcsIGhcblx0KiBwcm9wZXJ0aWVzIGJlaW5nIG1lcmVseSBzZXR0ZXJzIGFuZCBnZXR0ZXJzIHRoYXQgd3JhcCB0aGUgcHJvcGVydGllcyB3aXRoIGFuIHVuZGVyc2NvcmUgKF94LCBfeSwgX3csIF9oKS5cblx0Ki9cblx0cG9zOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdF94OiAodGhpcy5feCksXG5cdFx0XHRfeTogKHRoaXMuX3kpLFxuXHRcdFx0X3c6ICh0aGlzLl93KSxcblx0XHRcdF9oOiAodGhpcy5faClcblx0XHR9O1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLm1iclxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIE9iamVjdCAubWJyKClcblx0KiBSZXR1cm5zIHRoZSBtaW5pbXVtIGJvdW5kaW5nIHJlY3RhbmdsZS4gSWYgdGhlcmUgaXMgbm8gcm90YXRpb25cblx0KiBvbiB0aGUgZW50aXR5IGl0IHdpbGwgcmV0dXJuIHRoZSByZWN0LlxuXHQqL1xuXHRtYnI6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX21icikgcmV0dXJuIHRoaXMucG9zKCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdF94OiAodGhpcy5fbWJyLl94KSxcblx0XHRcdF95OiAodGhpcy5fbWJyLl95KSxcblx0XHRcdF93OiAodGhpcy5fbWJyLl93KSxcblx0XHRcdF9oOiAodGhpcy5fbWJyLl9oKVxuXHRcdH07XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuaXNBdFxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmlzQXQoTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcG9pbnQgaXMgY29udGFpbmVkIGJ5IHRoZSBlbnRpdHkuIFVubGlrZSBvdGhlciBtZXRob2RzLFxuXHQqIGFuIG9iamVjdCBjYW4ndCBiZSBwYXNzZWQuIFRoZSBhcmd1bWVudHMgcmVxdWlyZSB0aGUgeCBhbmQgeSB2YWx1ZVxuXHQqL1xuXHRpc0F0OiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdGlmICh0aGlzLm1hcEFyZWEpIHtcbiAgICAgIFx0XHRyZXR1cm4gdGhpcy5tYXBBcmVhLmNvbnRhaW5zUG9pbnQoeCwgeSk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLm1hcCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWFwLmNvbnRhaW5zUG9pbnQoeCwgeSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnggPD0geCAmJiB0aGlzLnggKyB0aGlzLncgPj0geCAmJlxuXHRcdFx0ICAgdGhpcy55IDw9IHkgJiYgdGhpcy55ICsgdGhpcy5oID49IHk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMubW92ZVxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLm1vdmUoU3RyaW5nIGRpciwgTnVtYmVyIGJ5KVxuXHQqIEBwYXJhbSBkaXIgLSBEaXJlY3Rpb24gdG8gbW92ZSAobixzLGUsdyxuZSxudyxzZSxzdylcblx0KiBAcGFyYW0gYnkgLSBBbW91bnQgdG8gbW92ZSBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdGlvblxuXHQqIFF1aWNrIG1ldGhvZCB0byBtb3ZlIHRoZSBlbnRpdHkgaW4gYSBkaXJlY3Rpb24gKG4sIHMsIGUsIHcsIG5lLCBudywgc2UsIHN3KSBieSBhbiBhbW91bnQgb2YgcGl4ZWxzLlxuXHQqL1xuXHRtb3ZlOiBmdW5jdGlvbiAoZGlyLCBieSkge1xuXHRcdGlmIChkaXIuY2hhckF0KDApID09PSAnbicpIHRoaXMueSAtPSBieTtcblx0XHRpZiAoZGlyLmNoYXJBdCgwKSA9PT0gJ3MnKSB0aGlzLnkgKz0gYnk7XG5cdFx0aWYgKGRpciA9PT0gJ2UnIHx8IGRpci5jaGFyQXQoMSkgPT09ICdlJykgdGhpcy54ICs9IGJ5O1xuXHRcdGlmIChkaXIgPT09ICd3JyB8fCBkaXIuY2hhckF0KDEpID09PSAndycpIHRoaXMueCAtPSBieTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnNoaWZ0XG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuc2hpZnQoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBBbW91bnQgdG8gbW92ZSBYXG5cdCogQHBhcmFtIHkgLSBBbW91bnQgdG8gbW92ZSBZXG5cdCogQHBhcmFtIHcgLSBBbW91bnQgdG8gd2lkZW5cblx0KiBAcGFyYW0gaCAtIEFtb3VudCB0byBpbmNyZWFzZSBoZWlnaHRcblx0KiBTaGlmdCBvciBtb3ZlIHRoZSBlbnRpdHkgYnkgYW4gYW1vdW50LiBVc2UgbmVnYXRpdmUgdmFsdWVzXG5cdCogZm9yIGFuIG9wcG9zaXRlIGRpcmVjdGlvbi5cblx0Ki9cblx0c2hpZnQ6IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0aWYgKHgpIHRoaXMueCArPSB4O1xuXHRcdGlmICh5KSB0aGlzLnkgKz0geTtcblx0XHRpZiAodykgdGhpcy53ICs9IHc7XG5cdFx0aWYgKGgpIHRoaXMuaCArPSBoO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuX2Nhc2NhZGVcblx0KiBAY29tcCAyRFxuICAgICogQHNpZ24gcHVibGljIHZvaWQgLl9jYXNjYWRlKGUpXG5cdCogQHBhcmFtIGUgLSBBbW91bnQgdG8gbW92ZSBYXG5cdCogU2hpZnQgbW92ZSBvciByb3RhdGUgdGhlIGVudGl0eSBieSBhbiBhbW91bnQuIFVzZSBuZWdhdGl2ZSB2YWx1ZXNcblx0KiBmb3IgYW4gb3Bwb3NpdGUgZGlyZWN0aW9uLlxuXHQqL1xuXHRfY2FzY2FkZTogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoIWUpIHJldHVybjsgLy9ubyBjaGFuZ2UgaW4gcG9zaXRpb25cblx0XHR2YXIgaSA9IDAsIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW4sIGwgPSBjaGlsZHJlbi5sZW5ndGgsIG9iajtcblx0XHQvL3JvdGF0aW9uXG5cdFx0aWYgKGUuY29zKSB7XG5cdFx0XHRmb3IgKDsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHRvYmogPSBjaGlsZHJlbltpXTtcblx0XHRcdFx0aWYgKCdyb3RhdGUnIGluIG9iaikgb2JqLnJvdGF0ZShlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly91c2UgTUJSIG9yIGN1cnJlbnRcblx0XHRcdHZhciByZWN0ID0gdGhpcy5fbWJyIHx8IHRoaXMsXG5cdFx0XHRcdGR4ID0gcmVjdC5feCAtIGUuX3gsXG5cdFx0XHRcdGR5ID0gcmVjdC5feSAtIGUuX3ksXG5cdFx0XHRcdGR3ID0gcmVjdC5fdyAtIGUuX3csXG5cdFx0XHRcdGRoID0gcmVjdC5faCAtIGUuX2g7XG5cblx0XHRcdGZvciAoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRcdG9iaiA9IGNoaWxkcmVuW2ldO1xuXHRcdFx0XHRvYmouc2hpZnQoZHgsIGR5LCBkdywgZGgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvKipAXG5cdCogIy5hdHRhY2hcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hdHRhY2goRW50aXR5IG9ialssIC4uLCBFbnRpdHkgb2JqTl0pXG5cdCogQHBhcmFtIG9iaiAtIEVudGl0eShzKSB0byBhdHRhY2hcblx0KiBBdHRhY2hlcyBhbiBlbnRpdGllcyBwb3NpdGlvbiBhbmQgcm90YXRpb24gdG8gY3VycmVudCBlbnRpdHkuIFdoZW4gdGhlIGN1cnJlbnQgZW50aXR5IG1vdmVzLFxuXHQqIHRoZSBhdHRhY2hlZCBlbnRpdHkgd2lsbCBtb3ZlIGJ5IHRoZSBzYW1lIGFtb3VudC4gQXR0YWNoZWQgZW50aXRpZXMgc3RvcmVkIGluIF9jaGlsZHJlbiBhcnJheSxcblx0KiB0aGUgcGFyZW50IG9iamVjdCBpcyBzdG9yZWQgaW4gX3BhcmVudCBvbiB0aGUgY2hpbGQgZW50aXRpZXMuXG5cdCpcblx0KiBBcyBtYW55IG9iamVjdHMgYXMgd2FudGVkIGNhbiBiZSBhdHRhY2hlZCBhbmQgYSBoaWVyYXJjaHkgb2Ygb2JqZWN0cyBpcyBwb3NzaWJsZSBieSBhdHRhY2hpbmcuXG5cdCovXG5cdGF0dGFjaDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBpID0gMCwgYXJnID0gYXJndW1lbnRzLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgb2JqO1xuXHRcdGZvciAoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRvYmogPSBhcmdbaV07XG5cdFx0XHRpZiAob2JqLl9wYXJlbnQpIHsgb2JqLl9wYXJlbnQuZGV0YWNoKG9iaik7IH1cblx0XHRcdG9iai5fcGFyZW50ID0gdGhpcztcblx0XHRcdHRoaXMuX2NoaWxkcmVuLnB1c2gob2JqKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5kZXRhY2hcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kZXRhY2goW0VudGl0eSBvYmpdKVxuXHQqIEBwYXJhbSBvYmogLSBUaGUgZW50aXR5IHRvIGRldGFjaC4gTGVmdCBibGFuayB3aWxsIHJlbW92ZSBhbGwgYXR0YWNoZWQgZW50aXRpZXNcblx0KiBTdG9wIGFuIGVudGl0eSBmcm9tIGZvbGxvd2luZyB0aGUgY3VycmVudCBlbnRpdHkuIFBhc3Npbmcgbm8gYXJndW1lbnRzIHdpbGwgc3RvcFxuXHQqIGV2ZXJ5IGVudGl0eSBhdHRhY2hlZC5cblx0Ki9cblx0ZGV0YWNoOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0Ly9pZiBub3RoaW5nIHBhc3NlZCwgcmVtb3ZlIGFsbCBhdHRhY2hlZCBvYmplY3RzXG5cdFx0aWYgKCFvYmopIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dGhpcy5fY2hpbGRyZW5baV0uX3BhcmVudCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9jaGlsZHJlbiA9IFtdO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0Ly9pZiBvYmogcGFzc2VkLCBmaW5kIHRoZSBoYW5kbGVyIGFuZCB1bmJpbmRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fY2hpbGRyZW5baV0gPT0gb2JqKSB7XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuLnNwbGljZShpLCAxKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0b2JqLl9wYXJlbnQgPSBudWxsO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMub3JpZ2luXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAub3JpZ2luKE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIFBpeGVsIHZhbHVlIG9mIG9yaWdpbiBvZmZzZXQgb24gdGhlIFggYXhpc1xuXHQqIEBwYXJhbSB5IC0gUGl4ZWwgdmFsdWUgb2Ygb3JpZ2luIG9mZnNldCBvbiB0aGUgWSBheGlzXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLm9yaWdpbihTdHJpbmcgb2Zmc2V0KVxuXHQqIEBwYXJhbSBvZmZzZXQgLSBDb21iaW5hdGlvbiBvZiBjZW50ZXIsIHRvcCwgYm90dG9tLCBtaWRkbGUsIGxlZnQgYW5kIHJpZ2h0XG5cdCogU2V0IHRoZSBvcmlnaW4gcG9pbnQgb2YgYW4gZW50aXR5IGZvciBpdCB0byByb3RhdGUgYXJvdW5kLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLm9yaWdpbihcInRvcCBsZWZ0XCIpXG5cdCogdGhpcy5vcmlnaW4oXCJjZW50ZXJcIilcblx0KiB0aGlzLm9yaWdpbihcImJvdHRvbSByaWdodFwiKVxuXHQqIHRoaXMub3JpZ2luKFwibWlkZGxlIHJpZ2h0XCIpXG5cdCogfn5+XG5cdCpcblx0KiBAc2VlIC5yb3RhdGlvblxuXHQqL1xuXHRvcmlnaW46IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0Ly90ZXh0IGJhc2VkIG9yaWdpblxuXHRcdGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0aWYgKHggPT09IFwiY2VudHJlXCIgfHwgeCA9PT0gXCJjZW50ZXJcIiB8fCB4LmluZGV4T2YoJyAnKSA9PT0gLTEpIHtcblx0XHRcdFx0eCA9IHRoaXMuX3cgLyAyO1xuXHRcdFx0XHR5ID0gdGhpcy5faCAvIDI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgY21kID0geC5zcGxpdCgnICcpO1xuXHRcdFx0XHRpZiAoY21kWzBdID09PSBcInRvcFwiKSB5ID0gMDtcblx0XHRcdFx0ZWxzZSBpZiAoY21kWzBdID09PSBcImJvdHRvbVwiKSB5ID0gdGhpcy5faDtcblx0XHRcdFx0ZWxzZSBpZiAoY21kWzBdID09PSBcIm1pZGRsZVwiIHx8IGNtZFsxXSA9PT0gXCJjZW50ZXJcIiB8fCBjbWRbMV0gPT09IFwiY2VudHJlXCIpIHkgPSB0aGlzLl9oIC8gMjtcblxuXHRcdFx0XHRpZiAoY21kWzFdID09PSBcImNlbnRlclwiIHx8IGNtZFsxXSA9PT0gXCJjZW50cmVcIiB8fCBjbWRbMV0gPT09IFwibWlkZGxlXCIpIHggPSB0aGlzLl93IC8gMjtcblx0XHRcdFx0ZWxzZSBpZiAoY21kWzFdID09PSBcImxlZnRcIikgeCA9IDA7XG5cdFx0XHRcdGVsc2UgaWYgKGNtZFsxXSA9PT0gXCJyaWdodFwiKSB4ID0gdGhpcy5fdztcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9vcmlnaW4ueCA9IHg7XG5cdFx0dGhpcy5fb3JpZ2luLnkgPSB5O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZmxpcFxuXHQqIEBjb21wIDJEXG5cdCogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgZW50aXR5IGhhcyBmbGlwcGVkXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmZsaXAoU3RyaW5nIGRpcilcblx0KiBAcGFyYW0gZGlyIC0gRmxpcCBkaXJlY3Rpb25cblx0KlxuXHQqIEZsaXAgZW50aXR5IG9uIHBhc3NlZCBkaXJlY3Rpb25cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5mbGlwKFwiWFwiKVxuXHQqIH5+flxuXHQqL1xuXHRmbGlwOiBmdW5jdGlvbiAoZGlyKSB7XG5cdFx0ZGlyID0gZGlyIHx8IFwiWFwiO1xuICAgICAgICAgICAgICAgIGlmKCF0aGlzW1wiX2ZsaXBcIiArIGRpcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tcIl9mbGlwXCIgKyBkaXJdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuICAgICAgICAgICAgICAgIH1cblx0fSxcblxuICAgICAgICAvKipAXG5cdCogIy51bmZsaXBcblx0KiBAY29tcCAyRFxuXHQqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIGVudGl0eSBoYXMgdW5mbGlwcGVkXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnVuZmxpcChTdHJpbmcgZGlyKVxuXHQqIEBwYXJhbSBkaXIgLSBVbmZsaXAgZGlyZWN0aW9uXG5cdCpcblx0KiBVbmZsaXAgZW50aXR5IG9uIHBhc3NlZCBkaXJlY3Rpb24gKGlmIGl0J3MgZmxpcHBlZClcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy51bmZsaXAoXCJYXCIpXG5cdCogfn5+XG5cdCovXG5cdHVuZmxpcDogZnVuY3Rpb24gKGRpcikge1xuXHRcdGRpciA9IGRpciB8fCBcIlhcIjtcbiAgICAgICAgICAgICAgICBpZih0aGlzW1wiX2ZsaXBcIiArIGRpcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tcIl9mbGlwXCIgKyBkaXJdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cdH0sXG5cblx0LyoqXG5cdCogTWV0aG9kIGZvciByb3RhdGlvbiByYXRoZXIgdGhhbiB0aHJvdWdoIGEgc2V0dGVyXG5cdCovXG5cdHJvdGF0ZTogZnVuY3Rpb24gKGUpIHtcblx0XHQvL2Fzc3VtZSBldmVudCBkYXRhIG9yaWdpblxuXHRcdHRoaXMuX29yaWdpbi54ID0gZS5vLnggLSB0aGlzLl94O1xuXHRcdHRoaXMuX29yaWdpbi55ID0gZS5vLnkgLSB0aGlzLl95O1xuXG5cdFx0Ly9tb2RpZnkgdGhyb3VnaCB0aGUgc2V0dGVyIG1ldGhvZFxuXHRcdHRoaXMuX2F0dHIoJ19yb3RhdGlvbicsIGUudGhldGEpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLl9hdHRyXG5cdCogQGNvbXAgMkRcblx0KiBTZXR0ZXIgbWV0aG9kIGZvciBhbGwgMkQgcHJvcGVydGllcyBpbmNsdWRpbmdcblx0KiB4LCB5LCB3LCBoLCBhbHBoYSwgcm90YXRpb24gYW5kIHZpc2libGUuXG5cdCovXG5cdF9hdHRyOiBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcblx0XHQvL2tlZXAgYSByZWZlcmVuY2Ugb2YgdGhlIG9sZCBwb3NpdGlvbnNcblx0XHR2YXIgcG9zID0gdGhpcy5wb3MoKSxcblx0XHRcdG9sZCA9IHRoaXMubWJyKCkgfHwgcG9zO1xuXG5cdFx0Ly9pZiByb3RhdGlvbiwgdXNlIHRoZSByb3RhdGUgbWV0aG9kXG5cdFx0aWYgKG5hbWUgPT09ICdfcm90YXRpb24nKSB7XG5cdFx0XHR0aGlzLl9yb3RhdGUodmFsdWUpO1xuXHRcdFx0dGhpcy50cmlnZ2VyKFwiUm90YXRlXCIpO1xuXHRcdFx0Ly9zZXQgdGhlIGdsb2JhbCBaIGFuZCB0cmlnZ2VyIHJlb3JkZXIganVzdCBpbiBjYXNlXG5cdFx0fSBlbHNlIGlmIChuYW1lID09PSAnX3onKSB7XG5cdFx0XHR0aGlzLl9nbG9iYWxaID0gcGFyc2VJbnQodmFsdWUgKyBDcmFmdHkuemVyb0ZpbGwodGhpc1swXSwgNSksIDEwKTsgLy9tYWdpYyBudW1iZXIgMTBlNSBpcyB0aGUgbWF4IG51bSBvZiBlbnRpdGllc1xuXHRcdFx0dGhpcy50cmlnZ2VyKFwicmVvcmRlclwiKTtcblx0XHRcdC8vaWYgdGhlIHJlY3QgYm91bmRzIGNoYW5nZSwgdXBkYXRlIHRoZSBNQlIgYW5kIHRyaWdnZXIgbW92ZVxuXHRcdH0gZWxzZSBpZiAobmFtZSA9PSAnX3gnIHx8IG5hbWUgPT09ICdfeScgfHwgbmFtZSA9PT0gJ193JyB8fCBuYW1lID09PSAnX2gnKSB7XG5cdFx0XHR2YXIgbWJyID0gdGhpcy5fbWJyO1xuXHRcdFx0aWYgKG1icikge1xuXHRcdFx0XHRtYnJbbmFtZV0gLT0gdGhpc1tuYW1lXSAtIHZhbHVlO1xuXHRcdFx0fVxuXHRcdFx0dGhpc1tuYW1lXSA9IHZhbHVlO1xuXHRcdFx0dGhpcy50cmlnZ2VyKFwiTW92ZVwiLCBvbGQpO1xuXHRcdH1cblxuXHRcdC8vZXZlcnl0aGluZyB3aWxsIGFzc3VtZSB0aGUgdmFsdWVcblx0XHR0aGlzW25hbWVdID0gdmFsdWU7XG5cblx0XHQvL3RyaWdnZXIgYSBjaGFuZ2Vcblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIiwgb2xkKTtcblx0fVxufSk7XG5cbkNyYWZ0eS5jKFwiUGh5c2ljc1wiLCB7XG5cdF9ncmF2aXR5OiAwLjQsXG5cdF9mcmljdGlvbjogMC4yLFxuXHRfYm91bmNlOiAwLjUsXG5cblx0Z3Jhdml0eTogZnVuY3Rpb24gKGdyYXZpdHkpIHtcblx0XHR0aGlzLl9ncmF2aXR5ID0gZ3Jhdml0eTtcblx0fVxufSk7XG5cbi8qKkBcbiogI0dyYXZpdHlcbiogQGNhdGVnb3J5IDJEXG4qIEFkZHMgZ3Jhdml0YXRpb25hbCBwdWxsIHRvIHRoZSBlbnRpdHkuXG4qL1xuQ3JhZnR5LmMoXCJHcmF2aXR5XCIsIHtcblx0X2dyYXZpdHlDb25zdDogMC4yLFxuXHRfZ3k6IDAsXG5cdF9mYWxsaW5nOiB0cnVlLFxuXHRfYW50aTogbnVsbCxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcyhcIjJEXCIpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmdyYXZpdHlcblx0KiBAY29tcCBHcmF2aXR5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmdyYXZpdHkoW2NvbXBdKVxuXHQqIEBwYXJhbSBjb21wIC0gVGhlIG5hbWUgb2YgYSBjb21wb25lbnQgdGhhdCB3aWxsIHN0b3AgdGhpcyBlbnRpdHkgZnJvbSBmYWxsaW5nXG5cdCpcblx0KiBFbmFibGUgZ3Jhdml0eSBmb3IgdGhpcyBlbnRpdHkgbm8gbWF0dGVyIHdoZXRoZXIgY29tcCBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCxcblx0KiBJZiBjb21wIHBhcmFtZXRlciBpcyBzcGVjaWZpZWQgYWxsIGVudGl0aWVzIHdpdGggdGhhdCBjb21wb25lbnQgd2lsbCBzdG9wIHRoaXMgZW50aXR5IGZyb20gZmFsbGluZy5cblx0KiBGb3IgYSBwbGF5ZXIgZW50aXR5IGluIGEgcGxhdGZvcm0gZ2FtZSB0aGlzIHdvdWxkIGJlIGEgY29tcG9uZW50IHRoYXQgaXMgYWRkZWQgdG8gYWxsIGVudGl0aWVzXG5cdCogdGhhdCB0aGUgcGxheWVyIHNob3VsZCBiZSBhYmxlIHRvIHdhbGsgb24uXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3IsIEdyYXZpdHlcIilcblx0Klx0IC5jb2xvcihcInJlZFwiKVxuXHQqXHQgLmF0dHIoeyB3OiAxMDAsIGg6IDEwMCB9KVxuXHQqXHQgLmdyYXZpdHkoXCJwbGF0Zm9ybVwiKVxuXHQqIH5+flxuXHQqL1xuXHRncmF2aXR5OiBmdW5jdGlvbiAoY29tcCkge1xuXHRcdGlmIChjb21wKSB0aGlzLl9hbnRpID0gY29tcDtcblxuXHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy5fZW50ZXJGcmFtZSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5ncmF2aXR5Q29uc3Rcblx0KiBAY29tcCBHcmF2aXR5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmdyYXZpdHlDb25zdChnKVxuXHQqIEBwYXJhbSBnIC0gZ3Jhdml0YXRpb25hbCBjb25zdGFudFxuXHQqXG5cdCogU2V0IHRoZSBncmF2aXRhdGlvbmFsIGNvbnN0YW50IHRvIGcuIFRoZSBkZWZhdWx0IGlzIC4yLiBUaGUgZ3JlYXRlciBnLCB0aGUgZmFzdGVyIHRoZSBvYmplY3QgZmFsbHMuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgQ29sb3IsIEdyYXZpdHlcIilcblx0KiAgIC5jb2xvcihcInJlZFwiKVxuXHQqICAgLmF0dHIoeyB3OiAxMDAsIGg6IDEwMCB9KVxuXHQqICAgLmdyYXZpdHkoXCJwbGF0Zm9ybVwiKVxuXHQqICAgLmdyYXZpdHlDb25zdCgyKVxuXHQqIH5+flxuXHQqL1xuXHRncmF2aXR5Q29uc3Q6IGZ1bmN0aW9uKGcpIHtcblx0XHR0aGlzLl9ncmF2aXR5Q29uc3Q9Zztcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfZW50ZXJGcmFtZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9mYWxsaW5nKSB7XG5cdFx0XHQvL2lmIGZhbGxpbmcsIG1vdmUgdGhlIHBsYXllcnMgWVxuXHRcdFx0dGhpcy5fZ3kgKz0gdGhpcy5fZ3Jhdml0eUNvbnN0O1xuXHRcdFx0dGhpcy55ICs9IHRoaXMuX2d5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9neSA9IDA7IC8vcmVzZXQgY2hhbmdlIGluIHlcblx0XHR9XG5cblx0XHR2YXIgb2JqLCBoaXQgPSBmYWxzZSwgcG9zID0gdGhpcy5wb3MoKSxcblx0XHRcdHEsIGkgPSAwLCBsO1xuXG5cdFx0Ly9JbmNyZWFzZSBieSAxIHRvIG1ha2Ugc3VyZSBtYXAuc2VhcmNoKCkgZmluZHMgdGhlIGZsb29yXG5cdFx0cG9zLl95Kys7XG5cblx0XHQvL21hcC5zZWFyY2ggd2FudHMgX3ggYW5kIGludGVyc2VjdCB3YW50cyB4Li4uXG5cdFx0cG9zLnggPSBwb3MuX3g7XG5cdFx0cG9zLnkgPSBwb3MuX3k7XG5cdFx0cG9zLncgPSBwb3MuX3c7XG5cdFx0cG9zLmggPSBwb3MuX2g7XG5cblx0XHRxID0gQ3JhZnR5Lm1hcC5zZWFyY2gocG9zKTtcblx0XHRsID0gcS5sZW5ndGg7XG5cblx0XHRmb3IgKDsgaSA8IGw7ICsraSkge1xuXHRcdFx0b2JqID0gcVtpXTtcblx0XHRcdC8vY2hlY2sgZm9yIGFuIGludGVyc2VjdGlvbiBkaXJlY3RseSBiZWxvdyB0aGUgcGxheWVyXG5cdFx0XHRpZiAob2JqICE9PSB0aGlzICYmIG9iai5oYXModGhpcy5fYW50aSkgJiYgb2JqLmludGVyc2VjdChwb3MpKSB7XG5cdFx0XHRcdGhpdCA9IG9iajtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGhpdCkgeyAvL3N0b3AgZmFsbGluZyBpZiBmb3VuZFxuXHRcdFx0aWYgKHRoaXMuX2ZhbGxpbmcpIHRoaXMuc3RvcEZhbGxpbmcoaGl0KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fZmFsbGluZyA9IHRydWU7IC8va2VlcCBmYWxsaW5nIG90aGVyd2lzZVxuXHRcdH1cblx0fSxcblxuXHRzdG9wRmFsbGluZzogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoZSkgdGhpcy55ID0gZS5feSAtIHRoaXMuX2g7IC8vbW92ZSBvYmplY3RcblxuXHRcdC8vdGhpcy5fZ3kgPSAtMSAqIHRoaXMuX2JvdW5jZTtcblx0XHR0aGlzLl9mYWxsaW5nID0gZmFsc2U7XG5cdFx0aWYgKHRoaXMuX3VwKSB0aGlzLl91cCA9IGZhbHNlO1xuXHRcdHRoaXMudHJpZ2dlcihcImhpdFwiKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5hbnRpZ3Jhdml0eVxuXHQqIEBjb21wIEdyYXZpdHlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYW50aWdyYXZpdHkoKVxuXHQqIERpc2FibGUgZ3Jhdml0eSBmb3IgdGhpcyBjb21wb25lbnQuIEl0IGNhbiBiZSByZWVuYWJsZWQgYnkgY2FsbGluZyAuZ3Jhdml0eSgpXG5cdCovXG5cdGFudGlncmF2aXR5OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy51bmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMuX2VudGVyRnJhbWUpO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjQ3JhZnR5LnBvbHlnb25cbiogQGNhdGVnb3J5IDJEXG4qXG4qIFBvbHlnb24gb2JqZWN0IHVzZWQgZm9yIGhpdGJveGVzIGFuZCBjbGljayBtYXBzLiBNdXN0IHBhc3MgYW4gQXJyYXkgZm9yIGVhY2ggcG9pbnQgYXMgYW5cbiogYXJndW1lbnQgd2hlcmUgaW5kZXggMCBpcyB0aGUgeCBwb3NpdGlvbiBhbmQgaW5kZXggMSBpcyB0aGUgeSBwb3NpdGlvbi5cbipcbiogRm9yIGV4YW1wbGUgb25lIHBvaW50IG9mIGEgcG9seWdvbiB3aWxsIGxvb2sgbGlrZSB0aGlzOiBgWzAsNV1gIHdoZXJlIHRoZSBgeGAgaXMgYDBgIGFuZCB0aGUgYHlgIGlzIGA1YC5cbipcbiogQ2FuIHBhc3MgYW4gYXJyYXkgb2YgdGhlIHBvaW50cyBvciBzaW1wbHkgcHV0IGVhY2ggcG9pbnQgYXMgYW4gYXJndW1lbnQuXG4qXG4qIFdoZW4gY3JlYXRpbmcgYSBwb2x5Z29uIGZvciBhbiBlbnRpdHksIGVhY2ggcG9pbnQgc2hvdWxkIGJlIG9mZnNldCBvciByZWxhdGl2ZSBmcm9tIHRoZSBlbnRpdGllcyBgeGAgYW5kIGB5YFxuKiAoZG9uJ3QgaW5jbHVkZSB0aGUgYWJzb2x1dGUgdmFsdWVzIGFzIGl0IHdpbGwgYXV0b21hdGljYWxseSBjYWxjdWxhdGUgdGhpcykuXG4qXG4qXG4qIEBleGFtcGxlXG4qIH5+flxuKiBuZXcgQ3JhZnR5LnBvbHlnb24oWzUwLDBdLFsxMDAsMTAwXSxbMCwxMDBdKTtcbiogbmV3IENyYWZ0eS5wb2x5Z29uKFtbNTAsMF0sWzEwMCwxMDBdLFswLDEwMF1dKTtcbiogfn5+XG4qL1xuQ3JhZnR5LnBvbHlnb24gPSBmdW5jdGlvbiAocG9seSkge1xuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRwb2x5ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblx0fVxuXHR0aGlzLnBvaW50cyA9IHBvbHk7XG59O1xuXG5DcmFmdHkucG9seWdvbi5wcm90b3R5cGUgPSB7XG5cdC8qKkBcblx0KiAjLmNvbnRhaW5zUG9pbnRcblx0KiBAY29tcCBDcmFmdHkucG9seWdvblxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5jb250YWluc1BvaW50KE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqXG5cdCogTWV0aG9kIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIGEgZ2l2ZW4gcG9pbnQgaXMgY29udGFpbmVkIGJ5IHRoZSBwb2x5Z29uLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB2YXIgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihbNTAsMF0sWzEwMCwxMDBdLFswLDEwMF0pO1xuXHQqIHBvbHkuY29udGFpbnNQb2ludCg1MCwgNTApOyAvL1RSVUVcblx0KiBwb2x5LmNvbnRhaW5zUG9pbnQoMCwgMCk7IC8vRkFMU0Vcblx0KiB+fn5cblx0Ki9cblx0Y29udGFpbnNQb2ludDogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHR2YXIgcCA9IHRoaXMucG9pbnRzLCBpLCBqLCBjID0gZmFsc2U7XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gcC5sZW5ndGggLSAxOyBpIDwgcC5sZW5ndGg7IGogPSBpKyspIHtcblx0XHRcdGlmICgoKHBbaV1bMV0gPiB5KSAhPSAocFtqXVsxXSA+IHkpKSAmJiAoeCA8IChwW2pdWzBdIC0gcFtpXVswXSkgKiAoeSAtIHBbaV1bMV0pIC8gKHBbal1bMV0gLSBwW2ldWzFdKSArIHBbaV1bMF0pKSB7XG5cdFx0XHRcdGMgPSAhYztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gYztcblx0fSxcblxuXHQvKipAXG5cdCogIy5zaGlmdFxuXHQqIEBjb21wIENyYWZ0eS5wb2x5Z29uXG5cdCogQHNpZ24gcHVibGljIHZvaWQgLnNoaWZ0KE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIEFtb3VudCB0byBzaGlmdCB0aGUgYHhgIGF4aXNcblx0KiBAcGFyYW0geSAtIEFtb3VudCB0byBzaGlmdCB0aGUgYHlgIGF4aXNcblx0KlxuXHQqIFNoaWZ0cyBldmVyeSBzaW5nbGUgcG9pbnQgaW4gdGhlIHBvbHlnb24gYnkgdGhlIHNwZWNpZmllZCBhbW91bnQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHZhciBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKFs1MCwwXSxbMTAwLDEwMF0sWzAsMTAwXSk7XG5cdCogcG9seS5zaGlmdCg1LDUpO1xuXHQqIC8vW1s1NSw1XSwgWzEwNSw1XSwgWzUsMTA1XV07XG5cdCogfn5+XG5cdCovXG5cdHNoaWZ0OiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdHZhciBpID0gMCwgbCA9IHRoaXMucG9pbnRzLmxlbmd0aCwgY3VycmVudDtcblx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0Y3VycmVudCA9IHRoaXMucG9pbnRzW2ldO1xuXHRcdFx0Y3VycmVudFswXSArPSB4O1xuXHRcdFx0Y3VycmVudFsxXSArPSB5O1xuXHRcdH1cblx0fSxcblxuXHRyb3RhdGU6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIGkgPSAwLCBsID0gdGhpcy5wb2ludHMubGVuZ3RoLFxuXHRcdFx0Y3VycmVudCwgeCwgeTtcblxuXHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50ID0gdGhpcy5wb2ludHNbaV07XG5cblx0XHRcdHggPSBlLm8ueCArIChjdXJyZW50WzBdIC0gZS5vLngpICogZS5jb3MgKyAoY3VycmVudFsxXSAtIGUuby55KSAqIGUuc2luO1xuXHRcdFx0eSA9IGUuby55IC0gKGN1cnJlbnRbMF0gLSBlLm8ueCkgKiBlLnNpbiArIChjdXJyZW50WzFdIC0gZS5vLnkpICogZS5jb3M7XG5cblx0XHRcdGN1cnJlbnRbMF0gPSB4O1xuXHRcdFx0Y3VycmVudFsxXSA9IHk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipAXG4qICNDcmFmdHkuY2lyY2xlXG4qIEBjYXRlZ29yeSAyRFxuKiBDaXJjbGUgb2JqZWN0IHVzZWQgZm9yIGhpdGJveGVzIGFuZCBjbGljayBtYXBzLiBNdXN0IHBhc3MgYSBgeGAsIGEgYHlgIGFuZCBhIGByYWRpdXNgIHZhbHVlLlxuKlxuKkBleGFtcGxlXG4qIH5+flxuKiB2YXIgY2VudGVyWCA9IDUsXG4qICAgICBjZW50ZXJZID0gMTAsXG4qICAgICByYWRpdXMgPSAyNTtcbipcbiogbmV3IENyYWZ0eS5jaXJjbGUoY2VudGVyWCwgY2VudGVyWSwgcmFkaXVzKTtcbiogfn5+XG4qXG4qIFdoZW4gY3JlYXRpbmcgYSBjaXJjbGUgZm9yIGFuIGVudGl0eSwgZWFjaCBwb2ludCBzaG91bGQgYmUgb2Zmc2V0IG9yIHJlbGF0aXZlIGZyb20gdGhlIGVudGl0aWVzIGB4YCBhbmQgYHlgXG4qIChkb24ndCBpbmNsdWRlIHRoZSBhYnNvbHV0ZSB2YWx1ZXMgYXMgaXQgd2lsbCBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZSB0aGlzKS5cbiovXG5DcmFmdHkuY2lyY2xlID0gZnVuY3Rpb24gKHgsIHksIHJhZGl1cykge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLnJhZGl1cyA9IHJhZGl1cztcblxuICAgIC8vIENyZWF0ZXMgYW4gb2N0YWdvbiB0aGF0IGFwcHJveGltYXRlIHRoZSBjaXJjbGUgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkuXG4gICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICB2YXIgdGhldGE7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykge1xuICAgICAgICB0aGV0YSA9IGkgKiBNYXRoLlBJIC8gNDtcbiAgICAgICAgdGhpcy5wb2ludHNbaV0gPSBbdGhpcy54ICsgKE1hdGguc2luKHRoZXRhKSAqIHJhZGl1cyksIHRoaXMueSArIChNYXRoLmNvcyh0aGV0YSkgKiByYWRpdXMpXTtcbiAgICB9XG59O1xuXG5DcmFmdHkuY2lyY2xlLnByb3RvdHlwZSA9IHtcbiAgICAvKipAXG5cdCogIy5jb250YWluc1BvaW50XG5cdCogQGNvbXAgQ3JhZnR5LmNpcmNsZVxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5jb250YWluc1BvaW50KE51bWJlciB4LCBOdW1iZXIgeSlcblx0KiBAcGFyYW0geCAtIFggcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqXG5cdCogTWV0aG9kIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIGEgZ2l2ZW4gcG9pbnQgaXMgY29udGFpbmVkIGJ5IHRoZSBjaXJjbGUuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHZhciBjaXJjbGUgPSBuZXcgQ3JhZnR5LmNpcmNsZSgwLCAwLCAxMCk7XG5cdCogY2lyY2xlLmNvbnRhaW5zUG9pbnQoMCwgMCk7IC8vVFJVRVxuXHQqIGNpcmNsZS5jb250YWluc1BvaW50KDUwLCA1MCk7IC8vRkFMU0Vcblx0KiB+fn5cblx0Ki9cblx0Y29udGFpbnNQb2ludDogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHR2YXIgcmFkaXVzID0gdGhpcy5yYWRpdXMsXG5cdFx0ICAgIHNxcnQgPSBNYXRoLnNxcnQsXG5cdFx0ICAgIGRlbHRhWCA9IHRoaXMueCAtIHgsXG5cdFx0ICAgIGRlbHRhWSA9IHRoaXMueSAtIHk7XG5cblx0XHRyZXR1cm4gKGRlbHRhWCAqIGRlbHRhWCArIGRlbHRhWSAqIGRlbHRhWSkgPCAocmFkaXVzICogcmFkaXVzKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5zaGlmdFxuXHQqIEBjb21wIENyYWZ0eS5jaXJjbGVcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCAuc2hpZnQoTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gQW1vdW50IHRvIHNoaWZ0IHRoZSBgeGAgYXhpc1xuXHQqIEBwYXJhbSB5IC0gQW1vdW50IHRvIHNoaWZ0IHRoZSBgeWAgYXhpc1xuXHQqXG5cdCogU2hpZnRzIHRoZSBjaXJjbGUgYnkgdGhlIHNwZWNpZmllZCBhbW91bnQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHZhciBwb2x5ID0gbmV3IENyYWZ0eS5jaXJjbGUoMCwgMCwgMTApO1xuXHQqIGNpcmNsZS5zaGlmdCg1LDUpO1xuXHQqIC8ve3g6IDUsIHk6IDUsIHJhZGl1czogMTB9O1xuXHQqIH5+flxuXHQqL1xuXHRzaGlmdDogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHR0aGlzLnggKz0geDtcblx0XHR0aGlzLnkgKz0geTtcblxuXHRcdHZhciBpID0gMCwgbCA9IHRoaXMucG9pbnRzLmxlbmd0aCwgY3VycmVudDtcblx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0Y3VycmVudCA9IHRoaXMucG9pbnRzW2ldO1xuXHRcdFx0Y3VycmVudFswXSArPSB4O1xuXHRcdFx0Y3VycmVudFsxXSArPSB5O1xuXHRcdH1cblx0fSxcblxuXHRyb3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBXZSBhcmUgYSBjaXJjbGUsIHdlIGRvbid0IGhhdmUgdG8gcm90YXRlIDopXG5cdH1cbn07XG5cblxuQ3JhZnR5Lm1hdHJpeCA9IGZ1bmN0aW9uIChtKSB7XG5cdHRoaXMubXR4ID0gbTtcblx0dGhpcy53aWR0aCA9IG1bMF0ubGVuZ3RoO1xuXHR0aGlzLmhlaWdodCA9IG0ubGVuZ3RoO1xufTtcblxuQ3JhZnR5Lm1hdHJpeC5wcm90b3R5cGUgPSB7XG5cdHg6IGZ1bmN0aW9uIChvdGhlcikge1xuXHRcdGlmICh0aGlzLndpZHRoICE9IG90aGVyLmhlaWdodCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaGVpZ2h0OyBpKyspIHtcblx0XHRcdHJlc3VsdFtpXSA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBvdGhlci53aWR0aDsgaisrKSB7XG5cdFx0XHRcdHZhciBzdW0gPSAwO1xuXHRcdFx0XHRmb3IgKHZhciBrID0gMDsgayA8IHRoaXMud2lkdGg7IGsrKykge1xuXHRcdFx0XHRcdHN1bSArPSB0aGlzLm10eFtpXVtrXSAqIG90aGVyLm10eFtrXVtqXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXN1bHRbaV1bal0gPSBzdW07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBuZXcgQ3JhZnR5Lm1hdHJpeChyZXN1bHQpO1xuXHR9LFxuXG5cblx0ZTogZnVuY3Rpb24gKHJvdywgY29sKSB7XG5cdFx0Ly90ZXN0IGlmIG91dCBvZiBib3VuZHNcblx0XHRpZiAocm93IDwgMSB8fCByb3cgPiB0aGlzLm10eC5sZW5ndGggfHwgY29sIDwgMSB8fCBjb2wgPiB0aGlzLm10eFswXS5sZW5ndGgpIHJldHVybiBudWxsO1xuXHRcdHJldHVybiB0aGlzLm10eFtyb3cgLSAxXVtjb2wgLSAxXTtcblx0fVxufVxuXG4vKipAXG4qICNDb2xsaXNpb25cbiogQGNhdGVnb3J5IDJEXG4qIENvbXBvbmVudCB0byBkZXRlY3QgY29sbGlzaW9uIGJldHdlZW4gYW55IHR3byBjb252ZXggcG9seWdvbnMuXG4qL1xuQ3JhZnR5LmMoXCJDb2xsaXNpb25cIiwge1xuICAgIC8qKkBcbiAgICAgKiAjLmluaXRcbiAgICAgKiBAY29tcCBDb2xsaXNpb25cbiAgICAgKiBDcmVhdGUgYSByZWN0YW5nbGUgcG9seWdvbiBiYXNlZCBvbiB0aGUgeCwgeSwgdywgaCBkaW1lbnNpb25zLlxuICAgICAqXG4gICAgICogWW91IG11c3QgZW5zdXJlIHRoYXQgdGhlIHgsIHksIHcsIGggcHJvcGVydGllcyBhcmUgc2V0IGJlZm9yZSB0aGUgaW5pdCBmdW5jdGlvbiBpcyBjYWxsZWQuIElmIHlvdSBoYXZlIGEgQ2FyIGNvbXBvbmVudCB0aGF0IHNldHMgdGhlc2UgcHJvcGVydGllcyB5b3Ugc2hvdWxkIGNyZWF0ZSB5b3VyIGVudGl0eSBsaWtlIHRoaXNcbiAgICAgKiB+fn5cbiAgICAgKiBDcmFmdHkuZSgnMkQsIERPTSwgQ2FyLCBDb2xsaXNpb24nKTtcbiAgICAgKiB+fn5cbiAgICAgKiBBbmQgbm90IGxpa2VcbiAgICAgKiB+fn5cbiAgICAgKiBDcmFmdHkuZSgnMkQsIERPTSwgQ29sbGlzaW9uLCBDYXInKTtcbiAgICAgKiB+fn5cbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVxdWlyZXMoXCIyRFwiKTtcbiAgICAgICAgdmFyIGFyZWEgPSB0aGlzLl9tYnIgfHwgdGhpcztcblxuICAgICAgICBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKFswLCAwXSwgW2FyZWEuX3csIDBdLCBbYXJlYS5fdywgYXJlYS5faF0sIFswLCBhcmVhLl9oXSk7XG4gICAgICAgIHRoaXMubWFwID0gcG9seTtcbiAgICAgICAgdGhpcy5hdHRhY2godGhpcy5tYXApO1xuICAgICAgICB0aGlzLm1hcC5zaGlmdChhcmVhLl94LCBhcmVhLl95KTtcbiAgICB9LFxuXG4gICAgLyoqQFxuXHQqICMuY29sbGlzaW9uXG5cdCogQGNvbXAgQ29sbGlzaW9uXG5cdCogXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmNvbGxpc2lvbihbQ3JhZnR5LnBvbHlnb24gcG9seWdvbl0pXG5cdCogQHBhcmFtIHBvbHlnb24gLSBDcmFmdHkucG9seWdvbiBvYmplY3QgdGhhdCB3aWxsIGFjdCBhcyB0aGUgaGl0IGFyZWFcblx0KiBcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuY29sbGlzaW9uKEFycmF5IHBvaW50MSwgLi4sIEFycmF5IHBvaW50Tilcblx0KiBAcGFyYW0gcG9pbnQjIC0gQXJyYXkgd2l0aCBhbiBgeGAgYW5kIGB5YCBwb3NpdGlvbiB0byBnZW5lcmF0ZSBhIHBvbHlnb25cblx0KiBcblx0KiBDb25zdHJ1Y3RvciB0YWtlcyBhIHBvbHlnb24gb3IgYXJyYXkgb2YgcG9pbnRzIHRvIHVzZSBhcyB0aGUgaGl0IGFyZWEuXG5cdCpcblx0KiBUaGUgaGl0IGFyZWEgKHBvbHlnb24pIG11c3QgYmUgYSBjb252ZXggc2hhcGUgYW5kIG5vdCBjb25jYXZlXG5cdCogZm9yIHRoZSBjb2xsaXNpb24gZGV0ZWN0aW9uIHRvIHdvcmsuXG4gICAgKlxuICAgICogSWYgbm8gaGl0IGFyZWEgaXMgc3BlY2lmaWVkIHgsIHksIHcsIGggcHJvcGVydGllcyBvZiB0aGUgZW50aXR5IHdpbGwgYmUgdXNlZC5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIENvbGxpc2lvblwiKS5jb2xsaXNpb24oXG5cdCogICAgIG5ldyBDcmFmdHkucG9seWdvbihbNTAsMF0sIFsxMDAsMTAwXSwgWzAsMTAwXSlcblx0KiApO1xuICAgICogXG4gICAgKiBDcmFmdHkuZShcIjJELCBDb2xsaXNpb25cIikuY29sbGlzaW9uKFs1MCwwXSwgWzEwMCwxMDBdLCBbMCwxMDBdKTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5wb2x5Z29uXG5cdCovXG4gICAgY29sbGlzaW9uOiBmdW5jdGlvbiAocG9seSkge1xuICAgICAgICB2YXIgYXJlYSA9IHRoaXMuX21iciB8fCB0aGlzO1xuXG4gICAgICAgIGlmICghcG9seSkge1xuICAgICAgICAgICAgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihbMCwgMF0sIFthcmVhLl93LCAwXSwgW2FyZWEuX3csIGFyZWEuX2hdLCBbMCwgYXJlYS5faF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAvL2NvbnZlcnQgYXJncyB0byBhcnJheSB0byBjcmVhdGUgcG9seWdvblxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihhcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFwID0gcG9seTtcbiAgICAgICAgdGhpcy5hdHRhY2godGhpcy5tYXApO1xuICAgICAgICB0aGlzLm1hcC5zaGlmdChhcmVhLl94LCBhcmVhLl95KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKkBcblx0KiAjLmhpdFxuXHQqIEBjb21wIENvbGxpc2lvblxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuL0FycmF5IGhpdChTdHJpbmcgY29tcG9uZW50KVxuXHQqIEBwYXJhbSBjb21wb25lbnQgLSBDaGVjayBjb2xsaXNpb24gd2l0aCBlbnRpdGllcyB0aGF0IGhhcyB0aGlzIGNvbXBvbmVudFxuXHQqIEByZXR1cm4gYGZhbHNlYCBpZiBubyBjb2xsaXNpb24uIElmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCByZXR1cm5zIGFuIEFycmF5IG9mIG9iamVjdHMgdGhhdCBhcmUgY29sbGlkaW5nLlxuXHQqIFxuXHQqIFRha2VzIGFuIGFyZ3VtZW50IGZvciBhIGNvbXBvbmVudCB0byB0ZXN0IGNvbGxpc2lvbiBmb3IuIElmIGEgY29sbGlzaW9uIGlzIGZvdW5kLCBhbiBhcnJheSBvZlxuXHQqIGV2ZXJ5IG9iamVjdCBpbiBjb2xsaXNpb24gYWxvbmcgd2l0aCB0aGUgYW1vdW50IG9mIG92ZXJsYXAgaXMgcGFzc2VkLlxuXHQqXG5cdCogSWYgbm8gY29sbGlzaW9uLCB3aWxsIHJldHVybiBmYWxzZS4gVGhlIHJldHVybiBjb2xsaXNpb24gZGF0YSB3aWxsIGJlIGFuIEFycmF5IG9mIE9iamVjdHMgd2l0aCB0aGVcblx0KiB0eXBlIG9mIGNvbGxpc2lvbiB1c2VkLCB0aGUgb2JqZWN0IGNvbGxpZGVkIGFuZCBpZiB0aGUgdHlwZSB1c2VkIHdhcyBTQVQgKGEgcG9seWdvbiB3YXMgdXNlZCBhcyB0aGUgaGl0Ym94KSB0aGVuIGFuIGFtb3VudCBvZiBvdmVybGFwLlxcXG5cdCogfn5+XG5cdCogW3tcblx0KiAgICBvYmo6IFtlbnRpdHldLFxuXHQqICAgIHR5cGUgXCJNQlJcIiBvciBcIlNBVFwiLFxuXHQqICAgIG92ZXJsYXA6IFtudW1iZXJdXG5cdCogfV1cblx0KiB+fn5cblx0KiBgTUJSYCBpcyB5b3VyIHN0YW5kYXJkIGF4aXMgYWxpZ25lZCByZWN0YW5nbGUgaW50ZXJzZWN0aW9uIChgLmludGVyc2VjdGAgaW4gdGhlIDJEIGNvbXBvbmVudCkuXG5cdCogYFNBVGAgaXMgY29sbGlzaW9uIGJldHdlZW4gYW55IGNvbnZleCBwb2x5Z29uLlxuXHQqIFxuXHQqIEBzZWUgLm9uSGl0LCAyRFxuXHQqL1xuXHRoaXQ6IGZ1bmN0aW9uIChjb21wKSB7XG5cdFx0dmFyIGFyZWEgPSB0aGlzLl9tYnIgfHwgdGhpcyxcblx0XHRcdHJlc3VsdHMgPSBDcmFmdHkubWFwLnNlYXJjaChhcmVhLCBmYWxzZSksXG5cdFx0XHRpID0gMCwgbCA9IHJlc3VsdHMubGVuZ3RoLFxuXHRcdFx0ZHVwZXMgPSB7fSxcblx0XHRcdGlkLCBvYmosIG9hcmVhLCBrZXksXG5cdFx0XHRoYXNNYXAgPSAoJ21hcCcgaW4gdGhpcyAmJiAnY29udGFpbnNQb2ludCcgaW4gdGhpcy5tYXApLFxuXHRcdFx0ZmluYWxyZXN1bHQgPSBbXTtcblxuXHRcdGlmICghbCkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGZvciAoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRvYmogPSByZXN1bHRzW2ldO1xuXHRcdFx0b2FyZWEgPSBvYmouX21iciB8fCBvYmo7IC8vdXNlIHRoZSBtYnJcblxuXHRcdFx0aWYgKCFvYmopIGNvbnRpbnVlO1xuXHRcdFx0aWQgPSBvYmpbMF07XG5cblx0XHRcdC8vY2hlY2sgaWYgbm90IGFkZGVkIHRvIGhhc2ggYW5kIHRoYXQgYWN0dWFsbHkgaW50ZXJzZWN0c1xuXHRcdFx0aWYgKCFkdXBlc1tpZF0gJiYgdGhpc1swXSAhPT0gaWQgJiYgb2JqLl9fY1tjb21wXSAmJlxuXHRcdFx0XHRcdFx0XHQgb2FyZWEuX3ggPCBhcmVhLl94ICsgYXJlYS5fdyAmJiBvYXJlYS5feCArIG9hcmVhLl93ID4gYXJlYS5feCAmJlxuXHRcdFx0XHRcdFx0XHQgb2FyZWEuX3kgPCBhcmVhLl95ICsgYXJlYS5faCAmJiBvYXJlYS5faCArIG9hcmVhLl95ID4gYXJlYS5feSlcblx0XHRcdFx0ZHVwZXNbaWRdID0gb2JqO1xuXHRcdH1cblxuXHRcdGZvciAoa2V5IGluIGR1cGVzKSB7XG5cdFx0XHRvYmogPSBkdXBlc1trZXldO1xuXG5cdFx0XHRpZiAoaGFzTWFwICYmICdtYXAnIGluIG9iaikge1xuXHRcdFx0XHR2YXIgU0FUID0gdGhpcy5fU0FUKHRoaXMubWFwLCBvYmoubWFwKTtcblx0XHRcdFx0U0FULm9iaiA9IG9iajtcblx0XHRcdFx0U0FULnR5cGUgPSBcIlNBVFwiO1xuXHRcdFx0XHRpZiAoU0FUKSBmaW5hbHJlc3VsdC5wdXNoKFNBVCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmaW5hbHJlc3VsdC5wdXNoKHsgb2JqOiBvYmosIHR5cGU6IFwiTUJSXCIgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFmaW5hbHJlc3VsdC5sZW5ndGgpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmluYWxyZXN1bHQ7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMub25IaXRcblx0KiBAY29tcCBDb2xsaXNpb25cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAub25IaXQoU3RyaW5nIGNvbXBvbmVudCwgRnVuY3Rpb24gaGl0WywgRnVuY3Rpb24gbm9IaXRdKVxuXHQqIEBwYXJhbSBjb21wb25lbnQgLSBDb21wb25lbnQgdG8gY2hlY2sgY29sbGlzaW9ucyBmb3Jcblx0KiBAcGFyYW0gaGl0IC0gQ2FsbGJhY2sgbWV0aG9kIHRvIGV4ZWN1dGUgd2hlbiBjb2xsaWRlZCB3aXRoIGNvbXBvbmVudFxuXHQqIEBwYXJhbSBub0hpdCAtIENhbGxiYWNrIG1ldGhvZCBleGVjdXRlZCBvbmNlIGFzIHNvb24gYXMgY29sbGlzaW9uIHN0b3BzXG5cdCogXG5cdCogQ3JlYXRlcyBhbiBlbnRlcmZyYW1lIGV2ZW50IGNhbGxpbmcgLmhpdCgpIGVhY2ggdGltZSBhbmQgaWYgY29sbGlzaW9uIGRldGVjdGVkIHdpbGwgaW52b2tlIHRoZSBjYWxsYmFjay5cblx0KiBcblx0KiBAc2VlIC5oaXRcblx0Ki9cblx0b25IaXQ6IGZ1bmN0aW9uIChjb21wLCBjYWxsYmFjaywgY2FsbGJhY2tPZmYpIHtcblx0XHR2YXIganVzdEhpdCA9IGZhbHNlO1xuXHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGhpdGRhdGEgPSB0aGlzLmhpdChjb21wKTtcblx0XHRcdGlmIChoaXRkYXRhKSB7XG5cdFx0XHRcdGp1c3RIaXQgPSB0cnVlO1xuXHRcdFx0XHRjYWxsYmFjay5jYWxsKHRoaXMsIGhpdGRhdGEpO1xuXHRcdFx0fSBlbHNlIGlmIChqdXN0SGl0KSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgY2FsbGJhY2tPZmYgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrT2ZmLmNhbGwodGhpcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0anVzdEhpdCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9TQVQ6IGZ1bmN0aW9uIChwb2x5MSwgcG9seTIpIHtcblx0XHR2YXIgcG9pbnRzMSA9IHBvbHkxLnBvaW50cyxcblx0XHRcdHBvaW50czIgPSBwb2x5Mi5wb2ludHMsXG5cdFx0XHRpID0gMCwgbCA9IHBvaW50czEubGVuZ3RoLFxuXHRcdFx0aiwgayA9IHBvaW50czIubGVuZ3RoLFxuXHRcdFx0bm9ybWFsID0geyB4OiAwLCB5OiAwIH0sXG5cdFx0XHRsZW5ndGgsXG5cdFx0XHRtaW4xLCBtaW4yLFxuXHRcdFx0bWF4MSwgbWF4Mixcblx0XHRcdGludGVydmFsLFxuXHRcdFx0TVRWID0gbnVsbCxcblx0XHRcdE1UVjIgPSBudWxsLFxuXHRcdFx0TU4gPSBudWxsLFxuXHRcdFx0ZG90LFxuXHRcdFx0bmV4dFBvaW50LFxuXHRcdFx0Y3VycmVudFBvaW50O1xuXG5cdFx0Ly9sb29wIHRocm91Z2ggdGhlIGVkZ2VzIG9mIFBvbHlnb24gMVxuXHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRuZXh0UG9pbnQgPSBwb2ludHMxWyhpID09IGwgLSAxID8gMCA6IGkgKyAxKV07XG5cdFx0XHRjdXJyZW50UG9pbnQgPSBwb2ludHMxW2ldO1xuXG5cdFx0XHQvL2dlbmVyYXRlIHRoZSBub3JtYWwgZm9yIHRoZSBjdXJyZW50IGVkZ2Vcblx0XHRcdG5vcm1hbC54ID0gLShuZXh0UG9pbnRbMV0gLSBjdXJyZW50UG9pbnRbMV0pO1xuXHRcdFx0bm9ybWFsLnkgPSAobmV4dFBvaW50WzBdIC0gY3VycmVudFBvaW50WzBdKTtcblxuXHRcdFx0Ly9ub3JtYWxpemUgdGhlIHZlY3RvclxuXHRcdFx0bGVuZ3RoID0gTWF0aC5zcXJ0KG5vcm1hbC54ICogbm9ybWFsLnggKyBub3JtYWwueSAqIG5vcm1hbC55KTtcblx0XHRcdG5vcm1hbC54IC89IGxlbmd0aDtcblx0XHRcdG5vcm1hbC55IC89IGxlbmd0aDtcblxuXHRcdFx0Ly9kZWZhdWx0IG1pbiBtYXhcblx0XHRcdG1pbjEgPSBtaW4yID0gLTE7XG5cdFx0XHRtYXgxID0gbWF4MiA9IC0xO1xuXG5cdFx0XHQvL3Byb2plY3QgYWxsIHZlcnRpY2VzIGZyb20gcG9seTEgb250byBheGlzXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgbDsgKytqKSB7XG5cdFx0XHRcdGRvdCA9IHBvaW50czFbal1bMF0gKiBub3JtYWwueCArIHBvaW50czFbal1bMV0gKiBub3JtYWwueTtcblx0XHRcdFx0aWYgKGRvdCA+IG1heDEgfHwgbWF4MSA9PT0gLTEpIG1heDEgPSBkb3Q7XG5cdFx0XHRcdGlmIChkb3QgPCBtaW4xIHx8IG1pbjEgPT09IC0xKSBtaW4xID0gZG90O1xuXHRcdFx0fVxuXG5cdFx0XHQvL3Byb2plY3QgYWxsIHZlcnRpY2VzIGZyb20gcG9seTIgb250byBheGlzXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgazsgKytqKSB7XG5cdFx0XHRcdGRvdCA9IHBvaW50czJbal1bMF0gKiBub3JtYWwueCArIHBvaW50czJbal1bMV0gKiBub3JtYWwueTtcblx0XHRcdFx0aWYgKGRvdCA+IG1heDIgfHwgbWF4MiA9PT0gLTEpIG1heDIgPSBkb3Q7XG5cdFx0XHRcdGlmIChkb3QgPCBtaW4yIHx8IG1pbjIgPT09IC0xKSBtaW4yID0gZG90O1xuXHRcdFx0fVxuXG5cdFx0XHQvL2NhbGN1bGF0ZSB0aGUgbWluaW11bSB0cmFuc2xhdGlvbiB2ZWN0b3Igc2hvdWxkIGJlIG5lZ2F0aXZlXG5cdFx0XHRpZiAobWluMSA8IG1pbjIpIHtcblx0XHRcdFx0aW50ZXJ2YWwgPSBtaW4yIC0gbWF4MTtcblxuXHRcdFx0XHRub3JtYWwueCA9IC1ub3JtYWwueDtcblx0XHRcdFx0bm9ybWFsLnkgPSAtbm9ybWFsLnk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpbnRlcnZhbCA9IG1pbjEgLSBtYXgyO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2V4aXQgZWFybHkgaWYgcG9zaXRpdmVcblx0XHRcdGlmIChpbnRlcnZhbCA+PSAwKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKE1UViA9PT0gbnVsbCB8fCBpbnRlcnZhbCA+IE1UVikge1xuXHRcdFx0XHRNVFYgPSBpbnRlcnZhbDtcblx0XHRcdFx0TU4gPSB7IHg6IG5vcm1hbC54LCB5OiBub3JtYWwueSB9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vbG9vcCB0aHJvdWdoIHRoZSBlZGdlcyBvZiBQb2x5Z29uIDJcblx0XHRmb3IgKGkgPSAwOyBpIDwgazsgaSsrKSB7XG5cdFx0XHRuZXh0UG9pbnQgPSBwb2ludHMyWyhpID09IGsgLSAxID8gMCA6IGkgKyAxKV07XG5cdFx0XHRjdXJyZW50UG9pbnQgPSBwb2ludHMyW2ldO1xuXG5cdFx0XHQvL2dlbmVyYXRlIHRoZSBub3JtYWwgZm9yIHRoZSBjdXJyZW50IGVkZ2Vcblx0XHRcdG5vcm1hbC54ID0gLShuZXh0UG9pbnRbMV0gLSBjdXJyZW50UG9pbnRbMV0pO1xuXHRcdFx0bm9ybWFsLnkgPSAobmV4dFBvaW50WzBdIC0gY3VycmVudFBvaW50WzBdKTtcblxuXHRcdFx0Ly9ub3JtYWxpemUgdGhlIHZlY3RvclxuXHRcdFx0bGVuZ3RoID0gTWF0aC5zcXJ0KG5vcm1hbC54ICogbm9ybWFsLnggKyBub3JtYWwueSAqIG5vcm1hbC55KTtcblx0XHRcdG5vcm1hbC54IC89IGxlbmd0aDtcblx0XHRcdG5vcm1hbC55IC89IGxlbmd0aDtcblxuXHRcdFx0Ly9kZWZhdWx0IG1pbiBtYXhcblx0XHRcdG1pbjEgPSBtaW4yID0gLTE7XG5cdFx0XHRtYXgxID0gbWF4MiA9IC0xO1xuXG5cdFx0XHQvL3Byb2plY3QgYWxsIHZlcnRpY2VzIGZyb20gcG9seTEgb250byBheGlzXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgbDsgKytqKSB7XG5cdFx0XHRcdGRvdCA9IHBvaW50czFbal1bMF0gKiBub3JtYWwueCArIHBvaW50czFbal1bMV0gKiBub3JtYWwueTtcblx0XHRcdFx0aWYgKGRvdCA+IG1heDEgfHwgbWF4MSA9PT0gLTEpIG1heDEgPSBkb3Q7XG5cdFx0XHRcdGlmIChkb3QgPCBtaW4xIHx8IG1pbjEgPT09IC0xKSBtaW4xID0gZG90O1xuXHRcdFx0fVxuXG5cdFx0XHQvL3Byb2plY3QgYWxsIHZlcnRpY2VzIGZyb20gcG9seTIgb250byBheGlzXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgazsgKytqKSB7XG5cdFx0XHRcdGRvdCA9IHBvaW50czJbal1bMF0gKiBub3JtYWwueCArIHBvaW50czJbal1bMV0gKiBub3JtYWwueTtcblx0XHRcdFx0aWYgKGRvdCA+IG1heDIgfHwgbWF4MiA9PT0gLTEpIG1heDIgPSBkb3Q7XG5cdFx0XHRcdGlmIChkb3QgPCBtaW4yIHx8IG1pbjIgPT09IC0xKSBtaW4yID0gZG90O1xuXHRcdFx0fVxuXG5cdFx0XHQvL2NhbGN1bGF0ZSB0aGUgbWluaW11bSB0cmFuc2xhdGlvbiB2ZWN0b3Igc2hvdWxkIGJlIG5lZ2F0aXZlXG5cdFx0XHRpZiAobWluMSA8IG1pbjIpIHtcblx0XHRcdFx0aW50ZXJ2YWwgPSBtaW4yIC0gbWF4MTtcblxuXHRcdFx0XHRub3JtYWwueCA9IC1ub3JtYWwueDtcblx0XHRcdFx0bm9ybWFsLnkgPSAtbm9ybWFsLnk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpbnRlcnZhbCA9IG1pbjEgLSBtYXgyO1xuXG5cblx0XHRcdH1cblxuXHRcdFx0Ly9leGl0IGVhcmx5IGlmIHBvc2l0aXZlXG5cdFx0XHRpZiAoaW50ZXJ2YWwgPj0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChNVFYgPT09IG51bGwgfHwgaW50ZXJ2YWwgPiBNVFYpIE1UViA9IGludGVydmFsO1xuXHRcdFx0aWYgKGludGVydmFsID4gTVRWMiB8fCBNVFYyID09PSBudWxsKSB7XG5cdFx0XHRcdE1UVjIgPSBpbnRlcnZhbDtcblx0XHRcdFx0TU4gPSB7IHg6IG5vcm1hbC54LCB5OiBub3JtYWwueSB9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7IG92ZXJsYXA6IE1UVjIsIG5vcm1hbDogTU4gfTtcblx0fVxufSk7XG5cblxuLyoqQFxuKiAjLldpcmVkSGl0Qm94XG4qIEBjb21wIENvbGxpc2lvblxuKiBcbiogQ29tcG9uZW50cyB0byBkaXNwbGF5IENyYWZ0eS5wb2x5Z29uIEFycmF5IGZvciBkZWJ1Z2dpbmcgY29sbGlzaW9uIGRldGVjdGlvblxuKiBcbiogQGV4YW1wbGVcbiogVGhpcyB3aWxsIGRpc3BsYXkgYSB3aXJlZCBzcXVhcmUgb3ZlciB5b3VyIG9yaWdpbmFsIENhbnZhcyBzY3JlZW5cbiogfn5+XG4qIENyYWZ0eS5lKFwiMkQsRE9NLFBsYXllcixDb2xsaXNpb24sV2lyZWRIaXRCb3hcIikuY29sbGlzaW9uKG5ldyBDcmFmdHkucG9seWdvbihbMCwwXSxbMCwzMDBdLFszMDAsMzAwXSxbMzAwLDBdKSlcbiogfn5+XG4qL1xuQ3JhZnR5LmMoXCJXaXJlZEhpdEJveFwiLCB7XG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXG5cdFx0aWYgKENyYWZ0eS5zdXBwb3J0LmNhbnZhcykge1xuXHRcdFx0dmFyIGMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnSGl0Qm94Jyk7XG5cdFx0XHRpZiAoIWMpIHtcblx0XHRcdFx0YyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0XHRcdGMuaWQgPSAnSGl0Qm94Jztcblx0XHRcdFx0Yy53aWR0aCA9IENyYWZ0eS52aWV3cG9ydC53aWR0aDtcblx0XHRcdFx0Yy5oZWlnaHQgPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXHRcdFx0XHRjLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHRcdFx0Yy5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblx0XHRcdFx0Yy5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdFx0XHRjLnN0eWxlLnpJbmRleCA9ICcxMDAwJztcblx0XHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0uYXBwZW5kQ2hpbGQoYyk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgY3R4ID0gYy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0dmFyIGRyYXdlZCA9IDAsIHRvdGFsID0gQ3JhZnR5KFwiV2lyZWRIaXRCb3hcIikubGVuZ3RoO1xuXHRcdFx0dGhpcy5yZXF1aXJlcyhcIkNvbGxpc2lvblwiKS5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmIChkcmF3ZWQgPT0gdG90YWwpIHtcblx0XHRcdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIENyYWZ0eS52aWV3cG9ydC53aWR0aCwgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCk7XG5cdFx0XHRcdFx0ZHJhd2VkID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdGZvciAodmFyIHAgaW4gdGhpcy5tYXAucG9pbnRzKSB7XG5cdFx0XHRcdFx0Y3R4LmxpbmVUbyhDcmFmdHkudmlld3BvcnQueCArIHRoaXMubWFwLnBvaW50c1twXVswXSwgQ3JhZnR5LnZpZXdwb3J0LnkgKyB0aGlzLm1hcC5wb2ludHNbcF1bMV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5jbG9zZVBhdGgoKTtcblx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xuXHRcdFx0XHRkcmF3ZWQrKztcblxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuLyoqQFxuKiAjLlNvbGlkSGl0Qm94XG4qIEBjb21wIENvbGxpc2lvblxuKiBcbiogQ29tcG9uZW50cyB0byBkaXNwbGF5IENyYWZ0eS5wb2x5Z29uIEFycmF5IGZvciBkZWJ1Z2dpbmcgY29sbGlzaW9uIGRldGVjdGlvblxuKiBcbiogQGV4YW1wbGVcbiogVGhpcyB3aWxsIGRpc3BsYXkgYSBzb2xpZCB0cmlhbmdsZSBvdmVyIHlvdXIgb3JpZ2luYWwgQ2FudmFzIHNjcmVlblxuKiB+fn5cbiogQ3JhZnR5LmUoXCIyRCxET00sUGxheWVyLENvbGxpc2lvbixTb2xpZEhpdEJveFwiKS5jb2xsaXNpb24obmV3IENyYWZ0eS5wb2x5Z29uKFswLDBdLFswLDMwMF0sWzMwMCwzMDBdKSlcbiogfn5+XG4qL1xuQ3JhZnR5LmMoXCJTb2xpZEhpdEJveFwiLCB7XG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQuY2FudmFzKSB7XG5cdFx0XHR2YXIgYyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdIaXRCb3gnKTtcblx0XHRcdGlmICghYykge1xuXHRcdFx0XHRjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHRcdFx0Yy5pZCA9ICdIaXRCb3gnO1xuXHRcdFx0XHRjLndpZHRoID0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoO1xuXHRcdFx0XHRjLmhlaWdodCA9IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cdFx0XHRcdGMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdFx0XHRjLnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHRcdFx0XHRjLnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0XHRcdGMuc3R5bGUuekluZGV4ID0gJzEwMDAnO1xuXHRcdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5hcHBlbmRDaGlsZChjKTtcblx0XHRcdH1cblx0XHRcdHZhciBjdHggPSBjLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XHR2YXIgZHJhd2VkID0gMCwgdG90YWwgPSBDcmFmdHkoXCJTb2xpZEhpdEJveFwiKS5sZW5ndGg7XG5cdFx0XHR0aGlzLnJlcXVpcmVzKFwiQ29sbGlzaW9uXCIpLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKGRyYXdlZCA9PSB0b3RhbCkge1xuXHRcdFx0XHRcdGN0eC5jbGVhclJlY3QoMCwgMCwgQ3JhZnR5LnZpZXdwb3J0LndpZHRoLCBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KTtcblx0XHRcdFx0XHRkcmF3ZWQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdFx0Zm9yICh2YXIgcCBpbiB0aGlzLm1hcC5wb2ludHMpIHtcblx0XHRcdFx0XHRjdHgubGluZVRvKENyYWZ0eS52aWV3cG9ydC54ICsgdGhpcy5tYXAucG9pbnRzW3BdWzBdLCBDcmFmdHkudmlld3BvcnQueSArIHRoaXMubWFwLnBvaW50c1twXVsxXSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmNsb3NlUGF0aCgpO1xuXHRcdFx0XHRjdHguZmlsbCgpO1xuXHRcdFx0XHRkcmF3ZWQrKztcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcbi8qKkBcbiogI0RPTVxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogRHJhd3MgZW50aXRpZXMgYXMgRE9NIG5vZGVzLCBzcGVjaWZpY2FsbHkgYDxESVY+YHMuXG4qL1xuQ3JhZnR5LmMoXCJET01cIiwge1xuICAgIC8qKkBcblx0KiAjLl9lbGVtZW50XG5cdCogQGNvbXAgRE9NXG5cdCogVGhlIERPTSBlbGVtZW50IHVzZWQgdG8gcmVwcmVzZW50IHRoZSBlbnRpdHkuXG5cdCovXG5cdF9lbGVtZW50OiBudWxsLFxuXHQvL2hvbGRzIGN1cnJlbnQgc3R5bGVzLCBzbyB3ZSBjYW4gY2hlY2sgaWYgdGhlcmUgYXJlIGNoYW5nZXMgdG8gYmUgd3JpdHRlbiB0byB0aGUgRE9NXG5cdF9jc3NTdHlsZXM6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX2Nzc1N0eWxlcyA9IHsgdmlzaWJpbGl0eTogJycsIGxlZnQ6ICcnLCB0b3A6ICcnLCB3aWR0aDogJycsIGhlaWdodDogJycsIHpJbmRleDogJycsIG9wYWNpdHk6ICcnLCB0cmFuc2Zvcm1PcmlnaW46ICcnLCB0cmFuc2Zvcm06ICcnIH07XG5cdFx0dGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0Q3JhZnR5LnN0YWdlLmlubmVyLmFwcGVuZENoaWxkKHRoaXMuX2VsZW1lbnQpO1xuXHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0dGhpcy5fZWxlbWVudC5pZCA9IFwiZW50XCIgKyB0aGlzWzBdO1xuXG5cdFx0dGhpcy5iaW5kKFwiQ2hhbmdlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghdGhpcy5fY2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLl9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0Q3JhZnR5LkRyYXdNYW5hZ2VyLmFkZCh0aGlzKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZUNsYXNzKCkge1xuXHRcdFx0dmFyIGkgPSAwLCBjID0gdGhpcy5fX2MsIHN0ciA9IFwiXCI7XG5cdFx0XHRmb3IgKGkgaW4gYykge1xuXHRcdFx0XHRzdHIgKz0gJyAnICsgaTtcblx0XHRcdH1cblx0XHRcdHN0ciA9IHN0ci5zdWJzdHIoMSk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0cjtcblx0XHR9XG5cblx0XHR0aGlzLmJpbmQoXCJOZXdDb21wb25lbnRcIiwgdXBkYXRlQ2xhc3MpLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgdXBkYXRlQ2xhc3MpO1xuXG5cdFx0aWYgKENyYWZ0eS5zdXBwb3J0LnByZWZpeCA9PT0gXCJtc1wiICYmIENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPCA5KSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzID0ge307XG5cblx0XHRcdHRoaXMuYmluZChcIlJvdGF0ZVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR2YXIgbSA9IGUubWF0cml4LFxuXHRcdFx0XHRcdGVsZW0gPSB0aGlzLl9lbGVtZW50LnN0eWxlLFxuXHRcdFx0XHRcdE0xMSA9IG0uTTExLnRvRml4ZWQoOCksXG5cdFx0XHRcdFx0TTEyID0gbS5NMTIudG9GaXhlZCg4KSxcblx0XHRcdFx0XHRNMjEgPSBtLk0yMS50b0ZpeGVkKDgpLFxuXHRcdFx0XHRcdE0yMiA9IG0uTTIyLnRvRml4ZWQoOCk7XG5cblx0XHRcdFx0dGhpcy5fZmlsdGVycy5yb3RhdGlvbiA9IFwicHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0Lk1hdHJpeChNMTE9XCIgKyBNMTEgKyBcIiwgTTEyPVwiICsgTTEyICsgXCIsIE0yMT1cIiArIE0yMSArIFwiLCBNMjI9XCIgKyBNMjIgKyBcIixzaXppbmdNZXRob2Q9J2F1dG8gZXhwYW5kJylcIjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuYmluZChcIlJlbW92ZVwiLCB0aGlzLnVuZHJhdyk7XG5cdFx0dGhpcy5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGZ1bmN0aW9uIChjb21wTmFtZSkge1xuXHRcdFx0aWYgKGNvbXBOYW1lID09PSBcIkRPTVwiKVxuXHRcdFx0XHR0aGlzLnVuZHJhdygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmdldERvbUlkXG5cdCogQGNvbXAgRE9NXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmdldElkKClcblx0KiBcblx0KiBHZXQgdGhlIElkIG9mIHRoZSBET00gZWxlbWVudCB1c2VkIHRvIHJlcHJlc2VudCB0aGUgZW50aXR5LlxuXHQqL1xuXHRnZXREb21JZDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2VsZW1lbnQuaWQ7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuRE9NXG5cdCogQGNvbXAgRE9NXG5cdCogQHRyaWdnZXIgRHJhdyAtIHdoZW4gdGhlIGVudGl0eSBpcyByZWFkeSB0byBiZSBkcmF3biB0byB0aGUgc3RhZ2UgLSB7IHN0eWxlOlN0cmluZywgdHlwZTpcIkRPTVwiLCBjb31cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuRE9NKEhUTUxFbGVtZW50IGVsZW0pXG5cdCogQHBhcmFtIGVsZW0gLSBIVE1MIGVsZW1lbnQgdGhhdCB3aWxsIHJlcGxhY2UgdGhlIGR5bmFtaWNhbGx5IGNyZWF0ZWQgb25lXG5cdCogXG5cdCogUGFzcyBhIERPTSBlbGVtZW50IHRvIHVzZSByYXRoZXIgdGhhbiBvbmUgY3JlYXRlZC4gV2lsbCBzZXQgYC5fZWxlbWVudGAgdG8gdGhpcyB2YWx1ZS4gUmVtb3ZlcyB0aGUgb2xkIGVsZW1lbnQuXG5cdCovXG5cdERPTTogZnVuY3Rpb24gKGVsZW0pIHtcblx0XHRpZiAoZWxlbSAmJiBlbGVtLm5vZGVUeXBlKSB7XG5cdFx0XHR0aGlzLnVuZHJhdygpO1xuXHRcdFx0dGhpcy5fZWxlbWVudCA9IGVsZW07XG5cdFx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZHJhd1xuXHQqIEBjb21wIERPTVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kcmF3KHZvaWQpXG5cdCogXG5cdCogVXBkYXRlcyB0aGUgQ1NTIHByb3BlcnRpZXMgb2YgdGhlIG5vZGUgdG8gZHJhdyBvbiB0aGUgc3RhZ2UuXG5cdCovXG5cdGRyYXc6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgc3R5bGUgPSB0aGlzLl9lbGVtZW50LnN0eWxlLFxuXHRcdFx0Y29vcmQgPSB0aGlzLl9fY29vcmQgfHwgWzAsIDAsIDAsIDBdLFxuXHRcdFx0Y28gPSB7IHg6IGNvb3JkWzBdLCB5OiBjb29yZFsxXSB9LFxuXHRcdFx0cHJlZml4ID0gQ3JhZnR5LnN1cHBvcnQucHJlZml4LFxuXHRcdFx0dHJhbnMgPSBbXTtcblxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMudmlzaWJpbGl0eSAhPSB0aGlzLl92aXNpYmxlKSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMudmlzaWJpbGl0eSA9IHRoaXMuX3Zpc2libGU7XG5cdFx0XHRpZiAoIXRoaXMuX3Zpc2libGUpIHtcblx0XHRcdFx0c3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly91dGlsaXplIENTUzMgaWYgc3VwcG9ydGVkXG5cdFx0aWYgKENyYWZ0eS5zdXBwb3J0LmNzczNkdHJhbnNmb3JtKSB7XG5cdFx0XHR0cmFucy5wdXNoKFwidHJhbnNsYXRlM2QoXCIgKyAofn50aGlzLl94KSArIFwicHgsXCIgKyAofn50aGlzLl95KSArIFwicHgsMClcIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh0aGlzLl9jc3NTdHlsZXMubGVmdCAhPSB0aGlzLl94KSB7XG5cdFx0XHRcdHRoaXMuX2Nzc1N0eWxlcy5sZWZ0ID0gdGhpcy5feDtcblx0XHRcdFx0c3R5bGUubGVmdCA9IH5+KHRoaXMuX3gpICsgXCJweFwiO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy50b3AgIT0gdGhpcy5feSkge1xuXHRcdFx0XHR0aGlzLl9jc3NTdHlsZXMudG9wID0gdGhpcy5feTtcblx0XHRcdFx0c3R5bGUudG9wID0gfn4odGhpcy5feSkgKyBcInB4XCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy53aWR0aCAhPSB0aGlzLl93KSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMud2lkdGggPSB0aGlzLl93O1xuXHRcdFx0c3R5bGUud2lkdGggPSB+fih0aGlzLl93KSArIFwicHhcIjtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy5oZWlnaHQgIT0gdGhpcy5faCkge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLmhlaWdodCA9IHRoaXMuX2g7XG5cdFx0XHRzdHlsZS5oZWlnaHQgPSB+fih0aGlzLl9oKSArIFwicHhcIjtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy56SW5kZXggIT0gdGhpcy5feikge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLnpJbmRleCA9IHRoaXMuX3o7XG5cdFx0XHRzdHlsZS56SW5kZXggPSB0aGlzLl96O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9jc3NTdHlsZXMub3BhY2l0eSAhPSB0aGlzLl9hbHBoYSkge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLm9wYWNpdHkgPSB0aGlzLl9hbHBoYTtcblx0XHRcdHN0eWxlLm9wYWNpdHkgPSB0aGlzLl9hbHBoYTtcblx0XHRcdHN0eWxlW3ByZWZpeCArIFwiT3BhY2l0eVwiXSA9IHRoaXMuX2FscGhhO1xuXHRcdH1cblxuXHRcdC8vaWYgbm90IHZlcnNpb24gOSBvZiBJRVxuXHRcdGlmIChwcmVmaXggPT09IFwibXNcIiAmJiBDcmFmdHkuc3VwcG9ydC52ZXJzaW9uIDwgOSkge1xuXHRcdFx0Ly9mb3IgSUUgdmVyc2lvbiA4LCB1c2UgSW1hZ2VUcmFuc2Zvcm0gZmlsdGVyXG5cdFx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA9PT0gOCkge1xuXHRcdFx0XHR0aGlzLl9maWx0ZXJzLmFscGhhID0gXCJwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuQWxwaGEoT3BhY2l0eT1cIiArICh0aGlzLl9hbHBoYSAqIDEwMCkgKyBcIilcIjsgLy8gZmlyc3QhXG5cdFx0XHRcdC8vYWxsIG90aGVyIHZlcnNpb25zIHVzZSBmaWx0ZXJcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2ZpbHRlcnMuYWxwaGEgPSBcImFscGhhKG9wYWNpdHk9XCIgKyAodGhpcy5fYWxwaGEgKiAxMDApICsgXCIpXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX21icikge1xuXHRcdFx0dmFyIG9yaWdpbiA9IHRoaXMuX29yaWdpbi54ICsgXCJweCBcIiArIHRoaXMuX29yaWdpbi55ICsgXCJweFwiO1xuXHRcdFx0c3R5bGUudHJhbnNmb3JtT3JpZ2luID0gb3JpZ2luO1xuXHRcdFx0c3R5bGVbcHJlZml4ICsgXCJUcmFuc2Zvcm1PcmlnaW5cIl0gPSBvcmlnaW47XG5cdFx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQuY3NzM2R0cmFuc2Zvcm0pIHRyYW5zLnB1c2goXCJyb3RhdGVaKFwiICsgdGhpcy5fcm90YXRpb24gKyBcImRlZylcIik7XG5cdFx0XHRlbHNlIHRyYW5zLnB1c2goXCJyb3RhdGUoXCIgKyB0aGlzLl9yb3RhdGlvbiArIFwiZGVnKVwiKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fZmxpcFgpIHtcblx0XHRcdHRyYW5zLnB1c2goXCJzY2FsZVgoLTEpXCIpO1xuXHRcdFx0aWYgKHByZWZpeCA9PT0gXCJtc1wiICYmIENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPCA5KSB7XG5cdFx0XHRcdHRoaXMuX2ZpbHRlcnMuZmxpcFggPSBcImZsaXBoXCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2ZsaXBZKSB7XG5cdFx0XHR0cmFucy5wdXNoKFwic2NhbGVZKC0xKVwiKTtcblx0XHRcdGlmIChwcmVmaXggPT09IFwibXNcIiAmJiBDcmFmdHkuc3VwcG9ydC52ZXJzaW9uIDwgOSkge1xuXHRcdFx0XHR0aGlzLl9maWx0ZXJzLmZsaXBZID0gXCJmbGlwdlwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vYXBwbHkgdGhlIGZpbHRlcnMgaWYgSUVcblx0XHRpZiAocHJlZml4ID09PSBcIm1zXCIgJiYgQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA8IDkpIHtcblx0XHRcdHRoaXMuYXBwbHlGaWx0ZXJzKCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy50cmFuc2Zvcm0gIT0gdHJhbnMuam9pbihcIiBcIikpIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy50cmFuc2Zvcm0gPSB0cmFucy5qb2luKFwiIFwiKTtcblx0XHRcdHN0eWxlLnRyYW5zZm9ybSA9IHRoaXMuX2Nzc1N0eWxlcy50cmFuc2Zvcm07XG5cdFx0XHRzdHlsZVtwcmVmaXggKyBcIlRyYW5zZm9ybVwiXSA9IHRoaXMuX2Nzc1N0eWxlcy50cmFuc2Zvcm07XG5cdFx0fVxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiRHJhd1wiLCB7IHN0eWxlOiBzdHlsZSwgdHlwZTogXCJET01cIiwgY286IGNvIH0pO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0YXBwbHlGaWx0ZXJzOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5maWx0ZXIgPSBcIlwiO1xuXHRcdHZhciBzdHIgPSBcIlwiO1xuXG5cdFx0Zm9yICh2YXIgZmlsdGVyIGluIHRoaXMuX2ZpbHRlcnMpIHtcblx0XHRcdGlmICghdGhpcy5fZmlsdGVycy5oYXNPd25Qcm9wZXJ0eShmaWx0ZXIpKSBjb250aW51ZTtcblx0XHRcdHN0ciArPSB0aGlzLl9maWx0ZXJzW2ZpbHRlcl0gKyBcIiBcIjtcblx0XHR9XG5cblx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLmZpbHRlciA9IHN0cjtcblx0fSxcblxuXHQvKipAXG5cdCogIy51bmRyYXdcblx0KiBAY29tcCBET01cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAudW5kcmF3KHZvaWQpXG5cdCogXG5cdCogUmVtb3ZlcyB0aGUgZWxlbWVudCBmcm9tIHRoZSBzdGFnZS5cblx0Ki9cblx0dW5kcmF3OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX2VsZW1lbnQpIHtcblx0XHRcdENyYWZ0eS5zdGFnZS5pbm5lci5yZW1vdmVDaGlsZCh0aGlzLl9lbGVtZW50KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuY3NzXG5cdCogQGNvbXAgRE9NXG5cdCogQHNpZ24gcHVibGljICogY3NzKFN0cmluZyBwcm9wZXJ0eSwgU3RyaW5nIHZhbHVlKVxuXHQqIEBwYXJhbSBwcm9wZXJ0eSAtIENTUyBwcm9wZXJ0eSB0byBtb2RpZnlcblx0KiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBnaXZlIHRoZSBDU1MgcHJvcGVydHlcblx0KiBAc2lnbiBwdWJsaWMgKiBjc3MoT2JqZWN0IG1hcClcblx0KiBAcGFyYW0gbWFwIC0gT2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIENTUyBwcm9wZXJ0eSBhbmQgdGhlIHZhbHVlIGlzIENTUyB2YWx1ZVxuXHQqIFxuXHQqIEFwcGx5IENTUyBzdHlsZXMgdG8gdGhlIGVsZW1lbnQuXG5cdCpcblx0KiBDYW4gcGFzcyBhbiBvYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgc3R5bGUgcHJvcGVydHkgYW5kIHRoZSB2YWx1ZSBpcyBzdHlsZSB2YWx1ZS5cblx0KlxuXHQqIEZvciBzZXR0aW5nIG9uZSBzdHlsZSwgc2ltcGx5IHBhc3MgdGhlIHN0eWxlIGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQgdGhlIHZhbHVlIGFzIHRoZSBzZWNvbmQuXG5cdCpcblx0KiBUaGUgbm90YXRpb24gY2FuIGJlIENTUyBvciBKUyAoZS5nLiBgdGV4dC1hbGlnbmAgb3IgYHRleHRBbGlnbmApLlxuXHQqXG5cdCogVG8gcmV0dXJuIGEgdmFsdWUsIHBhc3MgdGhlIHByb3BlcnR5LlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5jc3Moeyd0ZXh0LWFsaWduJywgJ2NlbnRlcicsIGZvbnQ6ICdBcmlhbCd9KTtcblx0KiB0aGlzLmNzcyhcInRleHRBbGlnblwiLCBcImNlbnRlclwiKTtcblx0KiB0aGlzLmNzcyhcInRleHQtYWxpZ25cIik7IC8vcmV0dXJucyBjZW50ZXJcblx0KiB+fn5cblx0Ki9cblx0Y3NzOiBmdW5jdGlvbiAob2JqLCB2YWx1ZSkge1xuXHRcdHZhciBrZXksXG5cdFx0XHRlbGVtID0gdGhpcy5fZWxlbWVudCxcblx0XHRcdHZhbCxcblx0XHRcdHN0eWxlID0gZWxlbS5zdHlsZTtcblxuXHRcdC8vaWYgYW4gb2JqZWN0IHBhc3NlZFxuXHRcdGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRmb3IgKGtleSBpbiBvYmopIHtcblx0XHRcdFx0aWYgKCFvYmouaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cdFx0XHRcdHZhbCA9IG9ialtrZXldO1xuXHRcdFx0XHRpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIikgdmFsICs9ICdweCc7XG5cblx0XHRcdFx0c3R5bGVbQ3JhZnR5LkRPTS5jYW1lbGl6ZShrZXkpXSA9IHZhbDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly9pZiBhIHZhbHVlIGlzIHBhc3NlZCwgc2V0IHRoZSBwcm9wZXJ0eVxuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHZhbHVlICs9ICdweCc7XG5cdFx0XHRcdHN0eWxlW0NyYWZ0eS5ET00uY2FtZWxpemUob2JqKV0gPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7IC8vb3RoZXJ3aXNlIHJldHVybiB0aGUgY29tcHV0ZWQgcHJvcGVydHlcblx0XHRcdFx0cmV0dXJuIENyYWZ0eS5ET00uZ2V0U3R5bGUoZWxlbSwgb2JqKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKlxuKiBGaXggSUU2IGJhY2tncm91bmQgZmxpY2tlcmluZ1xuKi9cbnRyeSB7XG5cdGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiQmFja2dyb3VuZEltYWdlQ2FjaGVcIiwgZmFsc2UsIHRydWUpO1xufSBjYXRjaCAoZSkgeyB9XG5cbkNyYWZ0eS5leHRlbmQoe1xuICAgIC8qKkBcblx0KiAjQ3JhZnR5LkRPTVxuXHQqIEBjYXRlZ29yeSBHcmFwaGljc1xuXHQqIFxuXHQqIENvbGxlY3Rpb24gb2YgdXRpbGl0aWVzIGZvciB1c2luZyB0aGUgRE9NLlxuXHQqL1xuXHRET006IHtcblx0LyoqQFxuXHRcdCogI0NyYWZ0eS5ET00ud2luZG93XG5cdFx0KiBAY29tcCBDcmFmdHkuRE9NXG5cdFx0KiBcblx0XHQqIE9iamVjdCB3aXRoIGB3aWR0aGAgYW5kIGBoZWlnaHRgIHZhbHVlcyByZXByZXNlbnRpbmcgdGhlIHdpZHRoXG5cdFx0KiBhbmQgaGVpZ2h0IG9mIHRoZSBgd2luZG93YC5cblx0XHQqL1xuXHRcdHdpbmRvdzoge1xuXHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR0aGlzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGggfHwgKHdpbmRvdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggfHwgd2luZG93LmRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpO1xuXHRcdFx0XHR0aGlzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCB8fCAod2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgfHwgd2luZG93LmRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0KTtcblx0XHRcdH0sXG5cblx0XHRcdHdpZHRoOiAwLFxuXHRcdFx0aGVpZ2h0OiAwXG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRE9NLmlubmVyXG5cdFx0KiBAY29tcCBDcmFmdHkuRE9NXG5cdFx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5ET00uaW5uZXIoSFRNTEVsZW1lbnQgb2JqKVxuXHRcdCogQHBhcmFtIG9iaiAtIEhUTUwgZWxlbWVudCB0byBjYWxjdWxhdGUgdGhlIHBvc2l0aW9uXG5cdFx0KiBAcmV0dXJucyBPYmplY3Qgd2l0aCBgeGAga2V5IGJlaW5nIHRoZSBgeGAgcG9zaXRpb24sIGB5YCBiZWluZyB0aGUgYHlgIHBvc2l0aW9uXG5cdFx0KiBcblx0XHQqIEZpbmQgYSBET00gZWxlbWVudHMgcG9zaXRpb24gaW5jbHVkaW5nXG5cdFx0KiBwYWRkaW5nIGFuZCBib3JkZXIuXG5cdFx0Ki9cblx0XHRpbm5lcjogZnVuY3Rpb24gKG9iaikge1xuXHRcdFx0dmFyIHJlY3QgPSBvYmouZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG5cdFx0XHRcdHggPSByZWN0LmxlZnQgKyAod2luZG93LnBhZ2VYT2Zmc2V0ID8gd2luZG93LnBhZ2VYT2Zmc2V0IDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0KSxcblx0XHRcdFx0eSA9IHJlY3QudG9wICsgKHdpbmRvdy5wYWdlWU9mZnNldCA/IHdpbmRvdy5wYWdlWU9mZnNldCA6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wKSxcblxuXHRcdFx0Ly9ib3JkZXIgbGVmdFxuXHRcdFx0XHRib3JkZXJYID0gcGFyc2VJbnQodGhpcy5nZXRTdHlsZShvYmosICdib3JkZXItbGVmdC13aWR0aCcpIHx8IDAsIDEwKSB8fCBwYXJzZUludCh0aGlzLmdldFN0eWxlKG9iaiwgJ2JvcmRlckxlZnRXaWR0aCcpIHx8IDAsIDEwKSB8fCAwLFxuXHRcdFx0XHRib3JkZXJZID0gcGFyc2VJbnQodGhpcy5nZXRTdHlsZShvYmosICdib3JkZXItdG9wLXdpZHRoJykgfHwgMCwgMTApIHx8IHBhcnNlSW50KHRoaXMuZ2V0U3R5bGUob2JqLCAnYm9yZGVyVG9wV2lkdGgnKSB8fCAwLCAxMCkgfHwgMDtcblxuXHRcdFx0eCArPSBib3JkZXJYO1xuXHRcdFx0eSArPSBib3JkZXJZO1xuXG5cdFx0XHRyZXR1cm4geyB4OiB4LCB5OiB5IH07XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRE9NLmdldFN0eWxlXG5cdFx0KiBAY29tcCBDcmFmdHkuRE9NXG5cdFx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5ET00uZ2V0U3R5bGUoSFRNTEVsZW1lbnQgb2JqLCBTdHJpbmcgcHJvcGVydHkpXG5cdFx0KiBAcGFyYW0gb2JqIC0gSFRNTCBlbGVtZW50IHRvIGZpbmQgdGhlIHN0eWxlXG5cdFx0KiBAcGFyYW0gcHJvcGVydHkgLSBTdHlsZSB0byByZXR1cm5cblx0XHQqIFxuXHRcdCogRGV0ZXJtaW5lIHRoZSB2YWx1ZSBvZiBhIHN0eWxlIG9uIGFuIEhUTUwgZWxlbWVudC4gTm90YXRpb24gY2FuIGJlXG5cdFx0KiBpbiBlaXRoZXIgQ1NTIG9yIEpTLlxuXHRcdCovXG5cdFx0Z2V0U3R5bGU6IGZ1bmN0aW9uIChvYmosIHByb3ApIHtcblx0XHRcdHZhciByZXN1bHQ7XG5cdFx0XHRpZiAob2JqLmN1cnJlbnRTdHlsZSlcblx0XHRcdFx0cmVzdWx0ID0gb2JqLmN1cnJlbnRTdHlsZVt0aGlzLmNhbWVsaXplKHByb3ApXTtcblx0XHRcdGVsc2UgaWYgKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKVxuXHRcdFx0XHRyZXN1bHQgPSBkb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKG9iaiwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZSh0aGlzLmNzc2VsaXplKHByb3ApKTtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCogVXNlZCBpbiB0aGUgWmVwdG8gZnJhbWV3b3JrXG5cdFx0KlxuXHRcdCogQ29udmVydHMgQ1NTIG5vdGF0aW9uIHRvIEpTIG5vdGF0aW9uXG5cdFx0Ki9cblx0XHRjYW1lbGl6ZTogZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC8tKyguKT8vZywgZnVuY3Rpb24gKG1hdGNoLCBjaHIpeyByZXR1cm4gY2hyID8gY2hyLnRvVXBwZXJDYXNlKCkgOiAnJyB9KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0KiBDb252ZXJ0cyBKUyBub3RhdGlvbiB0byBDU1Mgbm90YXRpb25cblx0XHQqL1xuXHRcdGNzc2VsaXplOiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1tBLVpdL2csIGZ1bmN0aW9uIChjaHIpeyByZXR1cm4gY2hyID8gJy0nICsgY2hyLnRvTG93ZXJDYXNlKCkgOiAnJyB9KTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5ET00udHJhbnNsYXRlXG5cdFx0KiBAY29tcCBDcmFmdHkuRE9NXG5cdFx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5ET00udHJhbnNsYXRlKE51bWJlciB4LCBOdW1iZXIgeSlcblx0XHQqIEBwYXJhbSB4IC0geCBwb3NpdGlvbiB0byB0cmFuc2xhdGVcblx0XHQqIEBwYXJhbSB5IC0geSBwb3NpdGlvbiB0byB0cmFuc2xhdGVcblx0XHQqIEByZXR1cm4gT2JqZWN0IHdpdGggeCBhbmQgeSBhcyBrZXlzIGFuZCB0cmFuc2xhdGVkIHZhbHVlc1xuXHRcdCpcblx0XHQqIE1ldGhvZCB3aWxsIHRyYW5zbGF0ZSB4IGFuZCB5IHBvc2l0aW9ucyB0byBwb3NpdGlvbnMgb24gdGhlXG5cdFx0KiBzdGFnZS4gVXNlZnVsIGZvciBtb3VzZSBldmVudHMgd2l0aCBgZS5jbGllbnRYYCBhbmQgYGUuY2xpZW50WWAuXG5cdFx0Ki9cblx0XHR0cmFuc2xhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiAoeCAtIENyYWZ0eS5zdGFnZS54ICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgLSBDcmFmdHkudmlld3BvcnQuX3gpL0NyYWZ0eS52aWV3cG9ydC5fem9vbSxcblx0XHRcdFx0eTogKHkgLSBDcmFmdHkuc3RhZ2UueSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCAtIENyYWZ0eS52aWV3cG9ydC5feSkvQ3JhZnR5LnZpZXdwb3J0Ll96b29tXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqQFxuKiAjSFRNTFxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQ29tcG9uZW50IGFsbG93IGZvciBpbnNlcnRpb24gb2YgYXJiaXRyYXJ5IEhUTUwgaW50byBhbiBlbnRpdHlcbiovXG5DcmFmdHkuYyhcIkhUTUxcIiwge1xuXHRpbm5lcjogJycsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoJzJELCBET00nKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5yZXBsYWNlXG5cdCogQGNvbXAgSFRNTFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5yZXBsYWNlKFN0cmluZyBodG1sKVxuXHQqIEBwYXJhbSBodG1sIC0gYXJiaXRyYXJ5IGh0bWxcblx0KiBcblx0KiBUaGlzIG1ldGhvZCB3aWxsIHJlcGxhY2UgdGhlIGNvbnRlbnQgb2YgdGhpcyBlbnRpdHkgd2l0aCB0aGUgc3VwcGxpZWQgaHRtbFxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBDcmVhdGUgYSBsaW5rXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCJIVE1MXCIpXG5cdCogICAgLmF0dHIoe3g6MjAsIHk6MjAsIHc6MTAwLCBoOjEwMH0pXG4gICAgKiAgICAucmVwbGFjZShcIjxhIGhyZWY9J2h0dHA6Ly93d3cuY3JhZnR5anMuY29tJz5DcmFmdHkuanM8L2E+XCIpO1xuXHQqIH5+flxuXHQqL1xuXHRyZXBsYWNlOiBmdW5jdGlvbiAobmV3X2h0bWwpIHtcblx0XHR0aGlzLmlubmVyID0gbmV3X2h0bWw7XG5cdFx0dGhpcy5fZWxlbWVudC5pbm5lckhUTUwgPSBuZXdfaHRtbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5hcHBlbmRcblx0KiBAY29tcCBIVE1MXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFwcGVuZChTdHJpbmcgaHRtbClcblx0KiBAcGFyYW0gaHRtbCAtIGFyYml0cmFyeSBodG1sXG5cdCogXG5cdCogVGhpcyBtZXRob2Qgd2lsbCBhZGQgdGhlIHN1cHBsaWVkIGh0bWwgaW4gdGhlIGVuZCBvZiB0aGUgZW50aXR5XG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIENyZWF0ZSBhIGxpbmtcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIkhUTUxcIilcblx0KiAgICAuYXR0cih7eDoyMCwgeToyMCwgdzoxMDAsIGg6MTAwfSlcbiAgICAqICAgIC5hcHBlbmQoXCI8YSBocmVmPSdodHRwOi8vd3d3LmNyYWZ0eWpzLmNvbSc+Q3JhZnR5LmpzPC9hPlwiKTtcblx0KiB+fn5cblx0Ki9cblx0YXBwZW5kOiBmdW5jdGlvbiAobmV3X2h0bWwpIHtcblx0XHR0aGlzLmlubmVyICs9IG5ld19odG1sO1xuXHRcdHRoaXMuX2VsZW1lbnQuaW5uZXJIVE1MICs9IG5ld19odG1sO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnByZXBlbmRcblx0KiBAY29tcCBIVE1MXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnByZXBlbmQoU3RyaW5nIGh0bWwpXG5cdCogQHBhcmFtIGh0bWwgLSBhcmJpdHJhcnkgaHRtbFxuXHQqIFxuXHQqIFRoaXMgbWV0aG9kIHdpbGwgYWRkIHRoZSBzdXBwbGllZCBodG1sIGluIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGVudGl0eVxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBDcmVhdGUgYSBsaW5rXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCJIVE1MXCIpXG5cdCogICAgLmF0dHIoe3g6MjAsIHk6MjAsIHc6MTAwLCBoOjEwMH0pXG4gICAgKiAgICAucHJlcGVuZChcIjxhIGhyZWY9J2h0dHA6Ly93d3cuY3JhZnR5anMuY29tJz5DcmFmdHkuanM8L2E+XCIpO1xuXHQqIH5+flxuXHQqL1xuXHRwcmVwZW5kOiBmdW5jdGlvbiAobmV3X2h0bWwpIHtcblx0XHR0aGlzLmlubmVyID0gbmV3X2h0bWwgKyB0aGlzLmlubmVyO1xuXHRcdHRoaXMuX2VsZW1lbnQuaW5uZXJIVE1MID0gbmV3X2h0bWwgKyB0aGlzLmlubmVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcbi8qKkBcbiAqICNTdG9yYWdlXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBVdGlsaXR5IHRvIGFsbG93IGRhdGEgdG8gYmUgc2F2ZWQgdG8gYSBwZXJtYW5lbnQgc3RvcmFnZSBzb2x1dGlvbjogSW5kZXhlZERCLCBXZWJTcWwsIGxvY2Fsc3RvcmFnZSBvciBjb29raWVzXG4gKi9cbiAgICAvKipAXG5cdCAqICMub3BlblxuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBzaWduIC5vcGVuKFN0cmluZyBnYW1lTmFtZSlcblx0ICogQHBhcmFtIGdhbWVOYW1lIC0gYSBtYWNoaW5lIHJlYWRhYmxlIHN0cmluZyB0byB1bmlxdWVseSBpZGVudGlmeSB5b3VyIGdhbWVcblx0ICogXG5cdCAqIE9wZW5zIGEgY29ubmVjdGlvbiB0byB0aGUgZGF0YWJhc2UuIElmIHRoZSBiZXN0IHRoZXkgaGF2ZSBpcyBsb2NhbHN0b3JhZ2Ugb3IgbG93ZXIsIGl0IGRvZXMgbm90aGluZ1xuXHQgKlxuXHQgKiBAZXhhbXBsZVxuXHQgKiBPcGVuIGEgZGF0YWJhc2Vcblx0ICogfn5+XG5cdCAqIENyYWZ0eS5zdG9yYWdlLm9wZW4oJ015R2FtZScpO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICMuc2F2ZVxuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBzaWduIC5zYXZlKFN0cmluZyBrZXksIFN0cmluZyB0eXBlLCBNaXhlZCBkYXRhKVxuXHQgKiBAcGFyYW0ga2V5IC0gQSB1bmlxdWUga2V5IGZvciBpZGVudGlmeWluZyB0aGlzIHBpZWNlIG9mIGRhdGFcblx0ICogQHBhcmFtIHR5cGUgLSAnc2F2ZScgb3IgJ2NhY2hlJ1xuXHQgKiBAcGFyYW0gZGF0YSAtIFNvbWUga2luZCBvZiBkYXRhLlxuXHQgKiBcblx0ICogU2F2ZXMgYSBwaWVjZSBvZiBkYXRhIHRvIHRoZSBkYXRhYmFzZS4gQ2FuIGJlIGFueXRoaW5nLCBhbHRob3VnaCBlbnRpdGllcyBhcmUgcHJlZmVycmVkLlxuXHQgKiBGb3IgYWxsIHN0b3JhZ2UgbWV0aG9kcyBidXQgSW5kZXhlZERCLCB0aGUgZGF0YSB3aWxsIGJlIHNlcmlhbGl6ZWQgYXMgYSBzdHJpbmdcblx0ICogRHVyaW5nIHNlcmlhbGl6YXRpb24sIGFuIGVudGl0eSdzIFNhdmVEYXRhIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkLlxuXHQgKiBDb21wb25lbnRzIHNob3VsZCBpbXBsZW1lbnQgYSBTYXZlRGF0YSBoYW5kbGVyIGFuZCBhdHRhY2ggdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byB0aGUgcGFzc2VkIG9iamVjdFxuXHQgKlxuXHQgKiBAZXhhbXBsZVxuXHQgKiBTYXZlcyBhbiBlbnRpdHkgdG8gdGhlIGRhdGFiYXNlXG5cdCAqIH5+flxuXHQgKiB2YXIgZW50ID0gQ3JhZnR5LmUoXCIyRCwgRE9NXCIpXG5cdCAqICAgICAgICAgICAgICAgICAgICAgLmF0dHIoe3g6IDIwLCB5OiAyMCwgdzogMTAwLCBoOjEwMH0pO1xuXHQgKiBDcmFmdHkuc3RvcmFnZS5vcGVuKCdNeUdhbWUnKTtcblx0ICogQ3JhZnR5LnN0b3JhZ2Uuc2F2ZSgnTXlFbnRpdHknLCAnc2F2ZScsIGVudCk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogIy5sb2FkXG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHNpZ24gLmxvYWQoU3RyaW5nIGtleSwgU3RyaW5nIHR5cGUpXG5cdCAqIEBwYXJhbSBrZXkgLSBBIHVuaXF1ZSBrZXkgdG8gc2VhcmNoIGZvclxuXHQgKiBAcGFyYW0gdHlwZSAtICdzYXZlJyBvciAnY2FjaGUnXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIERvIHRoaW5ncyB3aXRoIHRoZSBkYXRhIHlvdSBnZXQgYmFja1xuXHQgKiBcblx0ICogTG9hZHMgYSBwaWVjZSBvZiBkYXRhIGZyb20gdGhlIGRhdGFiYXNlLlxuXHQgKiBFbnRpdGllcyB3aWxsIGJlIHJlY29uc3RydWN0ZWQgZnJvbSB0aGUgc2VyaWFsaXplZCBzdHJpbmdcblxuXHQgKiBAZXhhbXBsZVxuXHQgKiBMb2FkcyBhbiBlbnRpdHkgZnJvbSB0aGUgZGF0YWJhc2Vcblx0ICogfn5+XG5cdCAqIENyYWZ0eS5zdG9yYWdlLm9wZW4oJ015R2FtZScpO1xuXHQgKiBDcmFmdHkuc3RvcmFnZS5sb2FkKCdNeUVudGl0eScsICdzYXZlJywgZnVuY3Rpb24gKGRhdGEpIHsgLy8gZG8gdGhpbmdzIH0pO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICMuZ2V0QWxsS2V5c1xuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBzaWduIC5nZXRBbGxLZXlzKFN0cmluZyB0eXBlKVxuXHQgKiBAcGFyYW0gdHlwZSAtICdzYXZlJyBvciAnY2FjaGUnXG5cdCAqIEdldHMgYWxsIHRoZSBrZXlzIGZvciBhIGdpdmVuIHR5cGVcblxuXHQgKiBAZXhhbXBsZVxuXHQgKiBHZXRzIGFsbCB0aGUgc2F2ZSBnYW1lcyBzYXZlZFxuXHQgKiB+fn5cblx0ICogQ3JhZnR5LnN0b3JhZ2Uub3BlbignTXlHYW1lJyk7XG5cdCAqIHZhciBzYXZlcyA9IENyYWZ0eS5zdG9yYWdlLmdldEFsbEtleXMoJ3NhdmUnKTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjLmV4dGVybmFsXG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHNpZ24gLmV4dGVybmFsKFN0cmluZyB1cmwpXG5cdCAqIEBwYXJhbSB1cmwgLSBVUkwgdG8gYW4gZXh0ZXJuYWwgdG8gc2F2ZSBnYW1lcyB0b29cblx0ICogXG5cdCAqIEVuYWJsZXMgYW5kIHNldHMgdGhlIHVybCBmb3Igc2F2aW5nIGdhbWVzIHRvIGFuIGV4dGVybmFsIHNlcnZlclxuXHQgKiBcblx0ICogQGV4YW1wbGVcblx0ICogU2F2ZSBhbiBlbnRpdHkgdG8gYW4gZXh0ZXJuYWwgc2VydmVyXG5cdCAqIH5+flxuXHQgKiBDcmFmdHkuc3RvcmFnZS5leHRlcm5hbCgnaHR0cDovL3NvbWV3aGVyZS5jb20vc2VydmVyLnBocCcpO1xuXHQgKiBDcmFmdHkuc3RvcmFnZS5vcGVuKCdNeUdhbWUnKTtcblx0ICogdmFyIGVudCA9IENyYWZ0eS5lKCcyRCwgRE9NJylcblx0ICogICAgICAgICAgICAgICAgICAgICAuYXR0cih7eDogMjAsIHk6IDIwLCB3OiAxMDAsIGg6MTAwfSk7XG5cdCAqIENyYWZ0eS5zdG9yYWdlLnNhdmUoJ3NhdmUwMScsICdzYXZlJywgZW50KTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjU2F2ZURhdGEgZXZlbnRcblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAcGFyYW0gZGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIGFsbCBvZiB0aGUgZGF0YSB0byBiZSBzZXJpYWxpemVkXG5cdCAqIEBwYXJhbSBwcmVwYXJlIC0gVGhlIGZ1bmN0aW9uIHRvIHByZXBhcmUgYW4gZW50aXR5IGZvciBzZXJpYWxpemF0aW9uXG5cdCAqIFxuXHQgKiBBbnkgZGF0YSBhIGNvbXBvbmVudCB3YW50cyB0byBzYXZlIHdoZW4gaXQncyBzZXJpYWxpemVkIHNob3VsZCBiZSBhZGRlZCB0byB0aGlzIG9iamVjdC5cblx0ICogU3RyYWlnaHQgYXR0cmlidXRlIHNob3VsZCBiZSBzZXQgaW4gZGF0YS5hdHRyLlxuXHQgKiBBbnl0aGluZyB0aGF0IHJlcXVpcmVzIGEgc3BlY2lhbCBoYW5kbGVyIHNob3VsZCBiZSBzZXQgaW4gYSB1bmlxdWUgcHJvcGVydHkuXG5cdCAqXG5cdCAqIEBleGFtcGxlXG5cdCAqIFNhdmVzIHRoZSBpbm5lckhUTUwgb2YgYW4gZW50aXR5XG5cdCAqIH5+flxuXHQgKiBDcmFmdHkuZShcIjJEIERPTVwiKS5iaW5kKFwiU2F2ZURhdGFcIiwgZnVuY3Rpb24gKGRhdGEsIHByZXBhcmUpIHtcblx0ICogICAgIGRhdGEuYXR0ci54ID0gdGhpcy54O1xuXHQgKiAgICAgZGF0YS5hdHRyLnkgPSB0aGlzLnk7XG5cdCAqICAgICBkYXRhLmRvbSA9IHRoaXMuZWxlbWVudC5pbm5lckhUTUw7XG5cdCAqIH0pO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICNMb2FkRGF0YSBldmVudFxuXHQgKiBAcGFyYW0gZGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgZGF0YSB0aGF0IGJlZW4gc2F2ZWRcblx0ICogQHBhcmFtIHByb2Nlc3MgLSBUaGUgZnVuY3Rpb24gdG8gdHVybiBhIHN0cmluZyBpbnRvIGFuIGVudGl0eVxuXHQgKiBcblx0ICogSGFuZGxlcnMgZm9yIHByb2Nlc3NpbmcgYW55IGRhdGEgdGhhdCBuZWVkcyBtb3JlIHRoYW4gc3RyYWlnaHQgYXNzaWdubWVudFxuXHQgKlxuXHQgKiBOb3RlIHRoYXQgZGF0YSBzdG9yZWQgaW4gdGhlIC5hdHRyIG9iamVjdCBpcyBhdXRvbWF0aWNhbGx5IGFkZGVkIHRvIHRoZSBlbnRpdHkuXG5cdCAqIEl0IGRvZXMgbm90IG5lZWQgdG8gYmUgaGFuZGxlZCBoZXJlXG5cdCAqXG5cdCAqIEBleGFtcGxlXG5cdCAqIH5+flxuXHQgKiBTZXRzIHRoZSBpbm5lckhUTUwgZnJvbSBhIHNhdmVkIGVudGl0eVxuXHQgKiBDcmFmdHkuZShcIjJEIERPTVwiKS5iaW5kKFwiTG9hZERhdGFcIiwgZnVuY3Rpb24gKGRhdGEsIHByb2Nlc3MpIHtcblx0ICogICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSBkYXRhLmRvbTtcblx0ICogfSk7XG5cdCAqIH5+flxuXHQgKi9cblxuQ3JhZnR5LnN0b3JhZ2UgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgZGIgPSBudWxsLCB1cmwsIGdhbWVOYW1lLCB0aW1lc3RhbXBzID0ge30sIFxuXHRcdHRyYW5zYWN0aW9uVHlwZSA9IHsgUkVBRDogXCJyZWFkb25seVwiLCBSRUFEX1dSSVRFOiBcInJlYWR3cml0ZVwiIH07XG5cblx0Lypcblx0ICogUHJvY2Vzc2VzIGEgcmV0cmlldmVkIG9iamVjdC5cblx0ICogQ3JlYXRlcyBhbiBlbnRpdHkgaWYgaXQgaXMgb25lXG5cdCAqL1xuXHRmdW5jdGlvbiBwcm9jZXNzKG9iaikge1xuXHRcdGlmIChvYmouYykge1xuXHRcdFx0dmFyIGQgPSBDcmFmdHkuZShvYmouYylcblx0XHRcdFx0XHRcdC5hdHRyKG9iai5hdHRyKVxuXHRcdFx0XHRcdFx0LnRyaWdnZXIoJ0xvYWREYXRhJywgb2JqLCBwcm9jZXNzKTtcblx0XHRcdHJldHVybiBkO1xuXHRcdH1cblx0XHRlbHNlIGlmICh0eXBlb2Ygb2JqID09ICdvYmplY3QnKSB7XG5cdFx0XHRmb3IgKHZhciBwcm9wIGluIG9iaikge1xuXHRcdFx0XHRvYmpbcHJvcF0gPSBwcm9jZXNzKG9ialtwcm9wXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvYmo7XG5cdH1cblxuXHRmdW5jdGlvbiB1bnNlcmlhbGl6ZShzdHIpIHtcblx0XHRpZiAodHlwZW9mIHN0ciAhPSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG5cdFx0dmFyIGRhdGEgPSAoSlNPTiA/IEpTT04ucGFyc2Uoc3RyKSA6IGV2YWwoJygnICsgc3RyICsgJyknKSk7XG5cdFx0cmV0dXJuIHByb2Nlc3MoZGF0YSk7XG5cdH1cblxuXHQvKiByZWN1cnNpdmUgZnVuY3Rpb25cblx0ICogc2VhcmNoZXMgZm9yIGVudGl0aWVzIGluIGFuIG9iamVjdCBhbmQgcHJvY2Vzc2VzIHRoZW0gZm9yIHNlcmlhbGl6YXRpb25cblx0ICovXG5cdGZ1bmN0aW9uIHByZXAob2JqKSB7XG5cdFx0aWYgKG9iai5fX2MpIHtcblx0XHRcdC8vIG9iamVjdCBpcyBlbnRpdHlcblx0XHRcdHZhciBkYXRhID0geyBjOiBbXSwgYXR0cjoge30gfTtcblx0XHRcdG9iai50cmlnZ2VyKFwiU2F2ZURhdGFcIiwgZGF0YSwgcHJlcCk7XG5cdFx0XHRmb3IgKHZhciBpIGluIG9iai5fX2MpIHtcblx0XHRcdFx0ZGF0YS5jLnB1c2goaSk7XG5cdFx0XHR9XG5cdFx0XHRkYXRhLmMgPSBkYXRhLmMuam9pbignLCAnKTtcblx0XHRcdG9iaiA9IGRhdGE7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHR5cGVvZiBvYmogPT0gJ29iamVjdCcpIHtcblx0XHRcdC8vIHJlY3Vyc2UgYW5kIGxvb2sgZm9yIGVudGl0aWVzXG5cdFx0XHRmb3IgKHZhciBwcm9wIGluIG9iaikge1xuXHRcdFx0XHRvYmpbcHJvcF0gPSBwcmVwKG9ialtwcm9wXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvYmo7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXJpYWxpemUoZSkge1xuXHRcdGlmIChKU09OKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHByZXAoZSk7XG5cdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YWxlcnQoXCJDcmFmdHkgZG9lcyBub3Qgc3VwcG9ydCBzYXZpbmcgb24geW91ciBicm93c2VyLiBQbGVhc2UgdXBncmFkZSB0byBhIG5ld2VyIGJyb3dzZXIuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdC8vIGZvciBzYXZpbmcgYSBnYW1lIHRvIGEgY2VudHJhbCBzZXJ2ZXJcblx0ZnVuY3Rpb24gZXh0ZXJuYWwoc2V0VXJsKSB7XG5cdFx0dXJsID0gc2V0VXJsO1xuXHR9XG5cblx0ZnVuY3Rpb24gb3BlbkV4dGVybmFsKCkge1xuXHRcdGlmICgxICYmIHR5cGVvZiB1cmwgPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuO1xuXHRcdC8vIGdldCB0aGUgdGltZXN0YW1wcyBmb3IgZXh0ZXJuYWwgc2F2ZXMgYW5kIGNvbXBhcmUgdGhlbSB0byBsb2NhbFxuXHRcdC8vIGlmIHRoZSBleHRlcm5hbCBpcyBuZXdlciwgbG9hZCBpdFxuXG5cdFx0dmFyIHhtbCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKFwiUE9TVFwiLCB1cmwpO1xuXHRcdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCkge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcblx0XHRcdFx0XHR2YXIgZGF0YSA9IGV2YWwoXCIoXCIgKyB4aHIucmVzcG9uc2VUZXh0ICsgXCIpXCIpO1xuXHRcdFx0XHRcdGZvciAodmFyIGkgaW4gZGF0YSkge1xuXHRcdFx0XHRcdFx0aWYgKENyYWZ0eS5zdG9yYWdlLmNoZWNrKGRhdGFbaV0ua2V5LCBkYXRhW2ldLnRpbWVzdGFtcCkpIHtcblx0XHRcdFx0XHRcdFx0bG9hZEV4dGVybmFsKGRhdGFbaV0ua2V5KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0eGhyLnNlbmQoXCJtb2RlPXRpbWVzdGFtcHMmZ2FtZT1cIiArIGdhbWVOYW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVFeHRlcm5hbChrZXksIGRhdGEsIHRzKSB7XG5cdFx0aWYgKDEgJiYgdHlwZW9mIHVybCA9PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKFwiUE9TVFwiLCB1cmwpO1xuXHRcdHhoci5zZW5kKFwibW9kZT1zYXZlJmtleT1cIiArIGtleSArIFwiJmRhdGE9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZGF0YSkgKyBcIiZ0cz1cIiArIHRzICsgXCImZ2FtZT1cIiArIGdhbWVOYW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGxvYWRFeHRlcm5hbChrZXkpIHtcblx0XHRpZiAoMSAmJiB0eXBlb2YgdXJsID09IFwidW5kZWZpbmVkXCIpIHJldHVybjtcblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0eGhyLm9wZW4oXCJQT1NUXCIsIHVybCk7XG5cdFx0eGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldnQpIHtcblx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuXHRcdFx0XHRcdHZhciBkYXRhID0gZXZhbChcIihcIiArIHhoci5yZXNwb25zZVRleHQgKyBcIilcIik7XG5cdFx0XHRcdFx0Q3JhZnR5LnN0b3JhZ2Uuc2F2ZShrZXksICdzYXZlJywgZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0eGhyLnNlbmQoXCJtb2RlPWxvYWQma2V5PVwiICsga2V5ICsgXCImZ2FtZT1cIiArIGdhbWVOYW1lKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBnZXQgdGltZXN0YW1wXG5cdCAqL1xuXHRmdW5jdGlvbiB0cygpIHtcblx0XHR2YXIgZCA9IG5ldyBEYXRlKCk7XG5cdFx0cmV0dXJuIGQuZ2V0VGltZSgpO1xuXHR9XG5cblx0Ly8gZXZlcnlvbmUgbmFtZXMgdGhlaXIgb2JqZWN0IGRpZmZlcmVudC4gRml4IHRoYXQgbm9uc2Vuc2UuXG5cdGlmICh0eXBlb2YgaW5kZXhlZERCICE9ICdvYmplY3QnKSB7XG5cdFx0d2luZG93LmluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93Lm1vekluZGV4ZWREQiB8fCB3aW5kb3cud2Via2l0SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQjtcblx0XHR3aW5kb3cuSURCVHJhbnNhY3Rpb24gPSB3aW5kb3cuSURCVHJhbnNhY3Rpb24gfHwgd2luZG93LndlYmtpdElEQlRyYW5zYWN0aW9uO1xuXHRcdFxuXHRcdC8qIE51bWVyaWMgY29uc3RhbnRzIGZvciB0cmFuc2FjdGlvbiB0eXBlIGFyZSBkZXByZWNhdGVkXG5cdFx0ICogRW5zdXJlIHRoYXQgdGhlIHNjcmlwdCB3aWxsIHdvcmsgY29uc2lzdGVubHkgZm9yIHJlY2VudCBhbmQgbGVnYWN5IGJyb3dzZXIgdmVyc2lvbnNcblx0XHQgKi9cblx0XHRpZiAodHlwZW9mIElEQlRyYW5zYWN0aW9uID09ICdvYmplY3QnKSB7XG5cdFx0XHR0cmFuc2FjdGlvblR5cGUuUkVBRCA9IElEQlRyYW5zYWN0aW9uLlJFQUQgfHwgSURCVHJhbnNhY3Rpb24ucmVhZG9ubHkgfHwgdHJhbnNhY3Rpb25UeXBlLlJFQUQ7XG5cdFx0XHR0cmFuc2FjdGlvblR5cGUuUkVBRF9XUklURSA9IElEQlRyYW5zYWN0aW9uLlJFQURfV1JJVEUgfHwgSURCVHJhbnNhY3Rpb24ucmVhZHdyaXRlIHx8IHRyYW5zYWN0aW9uVHlwZS5SRUFEX1dSSVRFO1xuXHRcdH1cblx0fVxuXG5cdGlmICh0eXBlb2YgaW5kZXhlZERCID09ICdvYmplY3QnKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbjogZnVuY3Rpb24gKGdhbWVOYW1lX24pIHtcblx0XHRcdFx0Z2FtZU5hbWUgPSBnYW1lTmFtZV9uO1xuXHRcdFx0XHR2YXIgc3RvcmVzID0gW107XG5cblx0XHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRcdHN0b3Jlcy5wdXNoKCdzYXZlJyk7XG5cdFx0XHRcdFx0c3RvcmVzLnB1c2goJ2NhY2hlJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0c3RvcmVzID0gYXJndW1lbnRzO1xuXHRcdFx0XHRcdHN0b3Jlcy5zaGlmdCgpO1xuXHRcdFx0XHRcdHN0b3Jlcy5wdXNoKCdzYXZlJyk7XG5cdFx0XHRcdFx0c3RvcmVzLnB1c2goJ2NhY2hlJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGRiID09IG51bGwpIHtcblx0XHRcdFx0XHR2YXIgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKGdhbWVOYW1lKTtcblx0XHRcdFx0XHRyZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRkYiA9IGUudGFyZ2V0LnJlc3VsdDtcblx0XHRcdFx0XHRcdGNyZWF0ZVN0b3JlcygpO1xuXHRcdFx0XHRcdFx0Z2V0VGltZXN0YW1wcygpO1xuXHRcdFx0XHRcdFx0b3BlbkV4dGVybmFsKCk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjcmVhdGVTdG9yZXMoKTtcblx0XHRcdFx0XHRnZXRUaW1lc3RhbXBzKCk7XG5cdFx0XHRcdFx0b3BlbkV4dGVybmFsKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBnZXQgYWxsIHRoZSB0aW1lc3RhbXBzIGZvciBleGlzdGluZyBrZXlzXG5cdFx0XHRcdGZ1bmN0aW9uIGdldFRpbWVzdGFtcHMoKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciB0cmFucyA9IGRiLnRyYW5zYWN0aW9uKFsnc2F2ZSddLCB0cmFuc2FjdGlvblR5cGUuUkVBRCksXG5cdFx0XHRcdFx0XHRzdG9yZSA9IHRyYW5zLm9iamVjdFN0b3JlKCdzYXZlJyksXG5cdFx0XHRcdFx0XHRyZXF1ZXN0ID0gc3RvcmUuZ2V0QWxsKCk7XG5cdFx0XHRcdFx0XHRyZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBpID0gMCwgYSA9IGV2ZW50LnRhcmdldC5yZXN1bHQsIGwgPSBhLmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0XHR0aW1lc3RhbXBzW2FbaV0ua2V5XSA9IGFbaV0udGltZXN0YW1wO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGNyZWF0ZVN0b3JlcygpIHtcblx0XHRcdFx0XHR2YXIgcmVxdWVzdCA9IGRiLnNldFZlcnNpb24oXCIxLjBcIik7XG5cdFx0XHRcdFx0cmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzdG9yZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0dmFyIHN0ID0gc3RvcmVzW2ldO1xuXHRcdFx0XHRcdFx0XHRpZiAoZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhzdCkpIGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShzdCwgeyBrZXlQYXRoOiBcImtleVwiIH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdHNhdmU6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGRhdGEpIHtcblx0XHRcdFx0aWYgKGRiID09IG51bGwpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnN0b3JhZ2Uuc2F2ZShrZXksIHR5cGUsIGRhdGEpOyB9LCAxKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgc3RyID0gc2VyaWFsaXplKGRhdGEpLCB0ID0gdHMoKTtcblx0XHRcdFx0aWYgKHR5cGUgPT0gJ3NhdmUnKVx0c2F2ZUV4dGVybmFsKGtleSwgc3RyLCB0KTtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgdHJhbnMgPSBkYi50cmFuc2FjdGlvbihbdHlwZV0sIHRyYW5zYWN0aW9uVHlwZS5SRUFEX1dSSVRFKSxcblx0XHRcdFx0XHRzdG9yZSA9IHRyYW5zLm9iamVjdFN0b3JlKHR5cGUpLFxuXHRcdFx0XHRcdHJlcXVlc3QgPSBzdG9yZS5wdXQoe1xuXHRcdFx0XHRcdFx0XCJkYXRhXCI6IHN0cixcblx0XHRcdFx0XHRcdFwidGltZXN0YW1wXCI6IHQsXG5cdFx0XHRcdFx0XHRcImtleVwiOiBrZXlcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGxvYWQ6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkYiA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IENyYWZ0eS5zdG9yYWdlLmxvYWQoa2V5LCB0eXBlLCBjYWxsYmFjayk7IH0sIDEpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciB0cmFucyA9IGRiLnRyYW5zYWN0aW9uKFt0eXBlXSwgdHJhbnNhY3Rpb25UeXBlLlJFQUQpLFxuXHRcdFx0XHRcdHN0b3JlID0gdHJhbnMub2JqZWN0U3RvcmUodHlwZSksXG5cdFx0XHRcdFx0cmVxdWVzdCA9IHN0b3JlLmdldChrZXkpO1xuXHRcdFx0XHRcdHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKHVuc2VyaWFsaXplKGUudGFyZ2V0LnJlc3VsdC5kYXRhKSk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGdldEFsbEtleXM6IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAoZGIgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBDcmFmdHkuc3RvcmFnZS5nZXRBbGxrZXlzKHR5cGUsIGNhbGxiYWNrKTsgfSwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgdHJhbnMgPSBkYi50cmFuc2FjdGlvbihbdHlwZV0sIHRyYW5zYWN0aW9uVHlwZS5SRUFEKSxcblx0XHRcdFx0XHRzdG9yZSA9IHRyYW5zLm9iamVjdFN0b3JlKHR5cGUpLFxuXHRcdFx0XHRcdHJlcXVlc3QgPSBzdG9yZS5nZXRDdXJzb3IoKSxcblx0XHRcdFx0XHRyZXMgPSBbXTtcblx0XHRcdFx0XHRyZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHR2YXIgY3Vyc29yID0gZS50YXJnZXQucmVzdWx0O1xuXHRcdFx0XHRcdFx0aWYgKGN1cnNvcikge1xuXHRcdFx0XHRcdFx0XHRyZXMucHVzaChjdXJzb3Iua2V5KTtcblx0XHRcdFx0XHRcdFx0Ly8gJ2NvbnRpbnVlJyBpcyBhIHJlc2VydmVkIHdvcmQsIHNvIC5jb250aW51ZSgpIGNhdXNlcyBJRTggdG8gY29tcGxldGVseSBiYXJrIHdpdGggXCJTQ1JJUFQxMDEwOiBFeHBlY3RlZCBpZGVudGlmaWVyXCIuXG5cdFx0XHRcdFx0XHRcdGN1cnNvclsnY29udGludWUnXSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKHJlcyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGNoZWNrOiBmdW5jdGlvbiAoa2V5LCB0aW1lc3RhbXApIHtcblx0XHRcdFx0cmV0dXJuICh0aW1lc3RhbXBzW2tleV0gPiB0aW1lc3RhbXApO1xuXHRcdFx0fSxcblxuXHRcdFx0ZXh0ZXJuYWw6IGV4dGVybmFsXG5cdFx0fTtcblx0fVxuXHRlbHNlIGlmICh0eXBlb2Ygb3BlbkRhdGFiYXNlID09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbjogZnVuY3Rpb24gKGdhbWVOYW1lX24pIHtcblx0XHRcdFx0Z2FtZU5hbWUgPSBnYW1lTmFtZV9uO1xuXHRcdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdFx0ZGIgPSB7XG5cdFx0XHRcdFx0XHRzYXZlOiBvcGVuRGF0YWJhc2UoZ2FtZU5hbWVfbiArICdfc2F2ZScsICcxLjAnLCAnU2F2ZXMgZ2FtZXMgZm9yICcgKyBnYW1lTmFtZV9uLCA1ICogMTAyNCAqIDEwMjQpLFxuXHRcdFx0XHRcdFx0Y2FjaGU6IG9wZW5EYXRhYmFzZShnYW1lTmFtZV9uICsgJ19jYWNoZScsICcxLjAnLCAnQ2FjaGUgZm9yICcgKyBnYW1lTmFtZV9uLCA1ICogMTAyNCAqIDEwMjQpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdC8vIGFsbG93cyBmb3IgYW55IG90aGVyIHR5cGVzIHRoYXQgY2FuIGJlIHRob3VnaHQgb2Zcblx0XHRcdFx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cywgaSA9IDA7XG5cdFx0XHRcdFx0YXJncy5zaGlmdCgpO1xuXHRcdFx0XHRcdGZvciAoOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBkYlthcmdzW2ldXSA9PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHRcdFx0ZGJbYXJnc1tpXV0gPSBvcGVuRGF0YWJhc2UoZ2FtZU5hbWUgKyAnXycgKyBhcmdzW2ldLCAnMS4wJywgdHlwZSwgNSAqIDEwMjQgKiAxMDI0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkYlsnc2F2ZSddLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0eCkge1xuXHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ1NFTEVDVCBrZXksIHRpbWVzdGFtcCBGUk9NIGRhdGEnLCBbXSwgZnVuY3Rpb24gKHR4LCByZXMpIHtcblx0XHRcdFx0XHRcdHZhciBpID0gMCwgYSA9IHJlcy5yb3dzLCBsID0gYS5sZW5ndGg7XG5cdFx0XHRcdFx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aW1lc3RhbXBzW2EuaXRlbShpKS5rZXldID0gYS5pdGVtKGkpLnRpbWVzdGFtcDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBkYXRhKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZGJbdHlwZV0gPT0gJ3VuZGVmaW5lZCcgJiYgZ2FtZU5hbWUgIT0gJycpIHtcblx0XHRcdFx0XHR0aGlzLm9wZW4oZ2FtZU5hbWUsIHR5cGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHN0ciA9IHNlcmlhbGl6ZShkYXRhKSwgdCA9IHRzKCk7XG5cdFx0XHRcdGlmICh0eXBlID09ICdzYXZlJylcdHNhdmVFeHRlcm5hbChrZXksIHN0ciwgdCk7XG5cdFx0XHRcdGRiW3R5cGVdLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0eCkge1xuXHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ0NSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGRhdGEgKGtleSB1bmlxdWUsIHRleHQsIHRpbWVzdGFtcCknKTtcblx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdTRUxFQ1QgKiBGUk9NIGRhdGEgV0hFUkUga2V5ID0gPycsIFtrZXldLCBmdW5jdGlvbiAodHgsIHJlc3VsdHMpIHtcblx0XHRcdFx0XHRcdGlmIChyZXN1bHRzLnJvd3MubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ1VQREFURSBkYXRhIFNFVCB0ZXh0ID0gPywgdGltZXN0YW1wID0gPyBXSEVSRSBrZXkgPSA/JywgW3N0ciwgdCwga2V5XSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnSU5TRVJUIElOVE8gZGF0YSBWQUxVRVMgKD8sID8sID8pJywgW2tleSwgc3RyLCB0XSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblxuXHRcdFx0bG9hZDogZnVuY3Rpb24gKGtleSwgdHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKGRiW3R5cGVdID09IG51bGwpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnN0b3JhZ2UubG9hZChrZXksIHR5cGUsIGNhbGxiYWNrKTsgfSwgMSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRiW3R5cGVdLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0eCkge1xuXHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ1NFTEVDVCB0ZXh0IEZST00gZGF0YSBXSEVSRSBrZXkgPSA/JywgW2tleV0sIGZ1bmN0aW9uICh0eCwgcmVzdWx0cykge1xuXHRcdFx0XHRcdFx0aWYgKHJlc3VsdHMucm93cy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0cmVzID0gdW5zZXJpYWxpemUocmVzdWx0cy5yb3dzLml0ZW0oMCkudGV4dCk7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKHJlcyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblxuXHRcdFx0Z2V0QWxsS2V5czogZnVuY3Rpb24gKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkYlt0eXBlXSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IENyYWZ0eS5zdG9yYWdlLmdldEFsbEtleXModHlwZSwgY2FsbGJhY2spOyB9LCAxKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGJbdHlwZV0udHJhbnNhY3Rpb24oZnVuY3Rpb24gKHR4KSB7XG5cdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnU0VMRUNUIGtleSBGUk9NIGRhdGEnLCBbXSwgZnVuY3Rpb24gKHR4LCByZXN1bHRzKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjayhyZXN1bHRzLnJvd3MpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cblx0XHRcdGNoZWNrOiBmdW5jdGlvbiAoa2V5LCB0aW1lc3RhbXApIHtcblx0XHRcdFx0cmV0dXJuICh0aW1lc3RhbXBzW2tleV0gPiB0aW1lc3RhbXApO1xuXHRcdFx0fSxcblxuXHRcdFx0ZXh0ZXJuYWw6IGV4dGVybmFsXG5cdFx0fTtcblx0fVxuXHRlbHNlIGlmICh0eXBlb2Ygd2luZG93LmxvY2FsU3RvcmFnZSA9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuOiBmdW5jdGlvbiAoZ2FtZU5hbWVfbikge1xuXHRcdFx0XHRnYW1lTmFtZSA9IGdhbWVOYW1lX247XG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBkYXRhKSB7XG5cdFx0XHRcdHZhciBrID0gZ2FtZU5hbWUgKyAnLicgKyB0eXBlICsgJy4nICsga2V5LFxuXHRcdFx0XHRcdHN0ciA9IHNlcmlhbGl6ZShkYXRhKSxcblx0XHRcdFx0XHR0ID0gdHMoKTtcblx0XHRcdFx0aWYgKHR5cGUgPT0gJ3NhdmUnKVx0c2F2ZUV4dGVybmFsKGtleSwgc3RyLCB0KTtcblx0XHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZVtrXSA9IHN0cjtcblx0XHRcdFx0aWYgKHR5cGUgPT0gJ3NhdmUnKVxuXHRcdFx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2VbayArICcudHMnXSA9IHQ7XG5cdFx0XHR9LFxuXG5cdFx0XHRsb2FkOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHR2YXIgayA9IGdhbWVOYW1lICsgJy4nICsgdHlwZSArICcuJyArIGtleSxcblx0XHRcdFx0XHRzdHIgPSB3aW5kb3cubG9jYWxTdG9yYWdlW2tdO1xuXG5cdFx0XHRcdGNhbGxiYWNrKHVuc2VyaWFsaXplKHN0cikpO1xuXHRcdFx0fSxcblxuXHRcdFx0Z2V0QWxsS2V5czogZnVuY3Rpb24gKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdHZhciByZXMgPSB7fSwgb3V0cHV0ID0gW10sIGhlYWRlciA9IGdhbWVOYW1lICsgJy4nICsgdHlwZTtcblx0XHRcdFx0Zm9yICh2YXIgaSBpbiB3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG5cdFx0XHRcdFx0aWYgKGkuaW5kZXhPZihoZWFkZXIpICE9IC0xKSB7XG5cdFx0XHRcdFx0XHR2YXIga2V5ID0gaS5yZXBsYWNlKGhlYWRlciwgJycpLnJlcGxhY2UoJy50cycsICcnKTtcblx0XHRcdFx0XHRcdHJlc1trZXldID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yIChpIGluIHJlcykge1xuXHRcdFx0XHRcdG91dHB1dC5wdXNoKGkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKG91dHB1dCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRjaGVjazogZnVuY3Rpb24gKGtleSwgdGltZXN0YW1wKSB7XG5cdFx0XHRcdHZhciB0cyA9IHdpbmRvdy5sb2NhbFN0b3JhZ2VbZ2FtZU5hbWUgKyAnLnNhdmUuJyArIGtleSArICcudHMnXTtcblxuXHRcdFx0XHRyZXR1cm4gKHBhcnNlSW50KHRpbWVzdGFtcCkgPiBwYXJzZUludCh0cykpO1xuXHRcdFx0fSxcblxuXHRcdFx0ZXh0ZXJuYWw6IGV4dGVybmFsXG5cdFx0fTtcblx0fVxuXHRlbHNlIHtcblx0XHQvLyBkZWZhdWx0IGZhbGxiYWNrIHRvIGNvb2tpZXNcblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbjogZnVuY3Rpb24gKGdhbWVOYW1lX24pIHtcblx0XHRcdFx0Z2FtZU5hbWUgPSBnYW1lTmFtZV9uO1xuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZTogZnVuY3Rpb24gKGtleSwgdHlwZSwgZGF0YSkge1xuXHRcdFx0XHQvLyBjb29raWVzIGFyZSB2ZXJ5IGxpbWl0ZWQgaW4gc3BhY2UuIHdlIGNhbiBvbmx5IGtlZXAgc2F2ZXMgdGhlcmVcblx0XHRcdFx0aWYgKHR5cGUgIT0gJ3NhdmUnKSByZXR1cm47XG5cdFx0XHRcdHZhciBzdHIgPSBzZXJpYWxpemUoZGF0YSksIHQgPSB0cygpO1xuXHRcdFx0XHRpZiAodHlwZSA9PSAnc2F2ZScpXHRzYXZlRXh0ZXJuYWwoa2V5LCBzdHIsIHQpO1xuXHRcdFx0XHRkb2N1bWVudC5jb29raWUgPSBnYW1lTmFtZSArICdfJyArIGtleSArICc9JyArIHN0ciArICc7ICcgKyBnYW1lTmFtZSArICdfJyArIGtleSArICdfdHM9JyArIHQgKyAnOyBleHBpcmVzPVRodXIsIDMxIERlYyAyMDk5IDIzOjU5OjU5IFVUQzsgcGF0aD0vJztcblx0XHRcdH0sXG5cblx0XHRcdGxvYWQ6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmICh0eXBlICE9ICdzYXZlJykgcmV0dXJuO1xuXHRcdFx0XHR2YXIgcmVnID0gbmV3IFJlZ0V4cChnYW1lTmFtZSArICdfJyArIGtleSArICc9W147XSonKSxcblx0XHRcdFx0XHRyZXN1bHQgPSByZWcuZXhlYyhkb2N1bWVudC5jb29raWUpLFxuXHRcdFx0XHRcdGRhdGEgPSB1bnNlcmlhbGl6ZShyZXN1bHRbMF0ucmVwbGFjZShnYW1lTmFtZSArICdfJyArIGtleSArICc9JywgJycpKTtcblxuXHRcdFx0XHRjYWxsYmFjayhkYXRhKTtcblx0XHRcdH0sXG5cblx0XHRcdGdldEFsbEtleXM6IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAodHlwZSAhPSAnc2F2ZScpIHJldHVybjtcblx0XHRcdFx0dmFyIHJlZyA9IG5ldyBSZWdFeHAoZ2FtZU5hbWUgKyAnX1teXz1dJywgJ2cnKSxcblx0XHRcdFx0XHRtYXRjaGVzID0gcmVnLmV4ZWMoZG9jdW1lbnQuY29va2llKSxcblx0XHRcdFx0XHRpID0gMCwgbCA9IG1hdGNoZXMubGVuZ3RoLCByZXMgPSB7fSwgb3V0cHV0ID0gW107XG5cdFx0XHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGtleSA9IG1hdGNoZXNbaV0ucmVwbGFjZShnYW1lTmFtZSArICdfJywgJycpO1xuXHRcdFx0XHRcdHJlc1trZXldID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKGkgaW4gcmVzKSB7XG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2sob3V0cHV0KTtcblx0XHRcdH0sXG5cblx0XHRcdGNoZWNrOiBmdW5jdGlvbiAoa2V5LCB0aW1lc3RhbXApIHtcblx0XHRcdFx0dmFyIGhlYWRlciA9IGdhbWVOYW1lICsgJ18nICsga2V5ICsgJ190cycsXG5cdFx0XHRcdFx0cmVnID0gbmV3IFJlZ0V4cChoZWFkZXIgKyAnPVteO10nKSxcblx0XHRcdFx0XHRyZXN1bHQgPSByZWcuZXhlYyhkb2N1bWVudC5jb29raWUpLFxuXHRcdFx0XHRcdHRzID0gcmVzdWx0WzBdLnJlcGxhY2UoaGVhZGVyICsgJz0nLCAnJyk7XG5cblx0XHRcdFx0cmV0dXJuIChwYXJzZUludCh0aW1lc3RhbXApID4gcGFyc2VJbnQodHMpKTtcblx0XHRcdH0sXG5cblx0XHRcdGV4dGVybmFsOiBleHRlcm5hbFxuXHRcdH07XG5cdH1cblx0LyogdGVtcGxhdGVcblx0cmV0dXJuIHtcblx0XHRvcGVuOiBmdW5jdGlvbiAoZ2FtZU5hbWUpIHtcblx0XHR9LFxuXHRcdHNhdmU6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGRhdGEpIHtcblx0XHR9LFxuXHRcdGxvYWQ6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0fSxcblx0fSovXG59KSgpO1xuLyoqQFxuKiAjQ3JhZnR5LnN1cHBvcnRcbiogQGNhdGVnb3J5IE1pc2MsIENvcmVcbiogRGV0ZXJtaW5lcyBmZWF0dXJlIHN1cHBvcnQgZm9yIHdoYXQgQ3JhZnR5IGNhbiBkby5cbiovXG5cbihmdW5jdGlvbiB0ZXN0U3VwcG9ydCgpIHtcbiAgICB2YXIgc3VwcG9ydCA9IENyYWZ0eS5zdXBwb3J0ID0ge30sXG4gICAgICAgIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLFxuICAgICAgICBtYXRjaCA9IC8od2Via2l0KVsgXFwvXShbXFx3Ll0rKS8uZXhlYyh1YSkgfHxcbiAgICAgICAgICAgICAgICAvKG8pcGVyYSg/Oi4qdmVyc2lvbik/WyBcXC9dKFtcXHcuXSspLy5leGVjKHVhKSB8fFxuICAgICAgICAgICAgICAgIC8obXMpaWUgKFtcXHcuXSspLy5leGVjKHVhKSB8fFxuICAgICAgICAgICAgICAgIC8obW96KWlsbGEoPzouKj8gcnY6KFtcXHcuXSspKT8vLmV4ZWModWEpIHx8IFtdLFxuICAgICAgICBtb2JpbGUgPSAvaVBhZHxpUG9kfGlQaG9uZXxBbmRyb2lkfHdlYk9TfElFTW9iaWxlL2kuZXhlYyh1YSk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5Lm1vYmlsZVxuICAgICogQGNvbXAgQ3JhZnR5LmRldmljZVxuICAgICogXG4gICAgKiBEZXRlcm1pbmVzIGlmIENyYWZ0eSBpcyBydW5uaW5nIG9uIG1vYmlsZSBkZXZpY2UuXG4gICAgKiBcbiAgICAqIElmIENyYWZ0eS5tb2JpbGUgaXMgZXF1YWwgdHJ1ZSBDcmFmdHkgZG9lcyBzb21lIHRoaW5ncyB1bmRlciBob29kOlxuICAgICogfn5+XG4gICAgKiAtIHNldCB2aWV3cG9ydCBvbiBtYXggZGV2aWNlIHdpZHRoIGFuZCBoZWlnaHRcbiAgICAqIC0gc2V0IENyYWZ0eS5zdGFnZS5mdWxsc2NyZWVuIG9uIHRydWVcbiAgICAqIC0gaGlkZSB3aW5kb3cgc2Nyb2xsYmFyc1xuICAgICogfn5+XG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5LnZpZXdwb3J0XG4gICAgKi9cbiAgICBpZiAobW9iaWxlKSBDcmFmdHkubW9iaWxlID0gbW9iaWxlWzBdO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LnNldHRlclxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIGBfX2RlZmluZVNldHRlcl9fYCBzdXBwb3J0ZWQ/XG4gICAgKi9cbiAgICBzdXBwb3J0LnNldHRlciA9ICgnX19kZWZpbmVTZXR0ZXJfXycgaW4gdGhpcyAmJiAnX19kZWZpbmVHZXR0ZXJfXycgaW4gdGhpcyk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuZGVmaW5lUHJvcGVydHlcbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCBzdXBwb3J0ZWQ/XG4gICAgKi9cbiAgICBzdXBwb3J0LmRlZmluZVByb3BlcnR5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCEnZGVmaW5lUHJvcGVydHknIGluIE9iamVjdCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0cnkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd4Jywge30pOyB9XG4gICAgICAgIGNhdGNoIChlKSB7IHJldHVybiBmYWxzZSB9O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSgpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmF1ZGlvXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgSFRNTDUgYEF1ZGlvYCBzdXBwb3J0ZWQ/XG4gICAgKi9cbiAgICBzdXBwb3J0LmF1ZGlvID0gKCdBdWRpbycgaW4gd2luZG93KTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5wcmVmaXhcbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBSZXR1cm5zIHRoZSBicm93c2VyIHNwZWNpZmljIHByZWZpeCAoYE1vemAsIGBPYCwgYG1zYCwgYHdlYmtpdGApLlxuICAgICovXG4gICAgc3VwcG9ydC5wcmVmaXggPSAobWF0Y2hbMV0gfHwgbWF0Y2hbMF0pO1xuXG4gICAgLy9icm93c2VyIHNwZWNpZmljIHF1aXJrc1xuICAgIGlmIChzdXBwb3J0LnByZWZpeCA9PT0gXCJtb3pcIikgc3VwcG9ydC5wcmVmaXggPSBcIk1velwiO1xuICAgIGlmIChzdXBwb3J0LnByZWZpeCA9PT0gXCJvXCIpIHN1cHBvcnQucHJlZml4ID0gXCJPXCI7XG5cbiAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuc3VwcG9ydC52ZXJzaW9uTmFtZVxuICAgICAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgICAgICogVmVyc2lvbiBvZiB0aGUgYnJvd3NlclxuICAgICAgICAqL1xuICAgICAgICBzdXBwb3J0LnZlcnNpb25OYW1lID0gbWF0Y2hbMl07XG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuc3VwcG9ydC52ZXJzaW9uXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAgICAgKiBWZXJzaW9uIG51bWJlciBvZiB0aGUgYnJvd3NlciBhcyBhbiBJbnRlZ2VyIChmaXJzdCBudW1iZXIpXG4gICAgICAgICovXG4gICAgICAgIHN1cHBvcnQudmVyc2lvbiA9ICsobWF0Y2hbMl0uc3BsaXQoXCIuXCIpKVswXTtcbiAgICB9XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuY2FudmFzXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgdGhlIGBjYW52YXNgIGVsZW1lbnQgc3VwcG9ydGVkP1xuICAgICovXG4gICAgc3VwcG9ydC5jYW52YXMgPSAoJ2dldENvbnRleHQnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIikpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LndlYmdsXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgV2ViR0wgc3VwcG9ydGVkIG9uIHRoZSBjYW52YXMgZWxlbWVudD9cbiAgICAqL1xuICAgIGlmIChzdXBwb3J0LmNhbnZhcykge1xuICAgICAgICB2YXIgZ2w7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBnbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIikuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiKTtcbiAgICAgICAgICAgIGdsLnZpZXdwb3J0V2lkdGggPSBzdXBwb3J0LmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIGdsLnZpZXdwb3J0SGVpZ2h0ID0gc3VwcG9ydC5jYW52YXMuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7IH1cbiAgICAgICAgc3VwcG9ydC53ZWJnbCA9ICEhZ2w7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzdXBwb3J0LndlYmdsID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmNzczNkdHJhbnNmb3JtXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgY3NzM0R0cmFuc2Zvcm0gc3VwcG9ydGVkIGJ5IGJyb3dzZXIuXG4gICAgKi9cbiAgICBzdXBwb3J0LmNzczNkdHJhbnNmb3JtID0gKHR5cGVvZiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLnN0eWxlW1wiUGVyc3BlY3RpdmVcIl0gIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgKHR5cGVvZiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLnN0eWxlW3N1cHBvcnQucHJlZml4ICsgXCJQZXJzcGVjdGl2ZVwiXSAhPT0gXCJ1bmRlZmluZWRcIik7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuZGV2aWNlb3JpZW50YXRpb25cbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBkZXZpY2VvcmllbnRhdGlvbiBldmVudCBzdXBwb3J0ZWQgYnkgYnJvd3Nlci5cbiAgICAqL1xuICAgIHN1cHBvcnQuZGV2aWNlb3JpZW50YXRpb24gPSAodHlwZW9mIHdpbmRvdy5EZXZpY2VPcmllbnRhdGlvbkV2ZW50ICE9PSBcInVuZGVmaW5lZFwiKSB8fCAodHlwZW9mIHdpbmRvdy5PcmllbnRhdGlvbkV2ZW50ICE9PSBcInVuZGVmaW5lZFwiKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5kZXZpY2Vtb3Rpb25cbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBkZXZpY2Vtb3Rpb24gZXZlbnQgc3VwcG9ydGVkIGJ5IGJyb3dzZXIuXG4gICAgKi9cbiAgICBzdXBwb3J0LmRldmljZW1vdGlvbiA9ICh0eXBlb2Ygd2luZG93LkRldmljZU1vdGlvbkV2ZW50ICE9PSBcInVuZGVmaW5lZFwiKTtcblxufSkoKTtcbkNyYWZ0eS5leHRlbmQoe1xuXG4gICAgemVyb0ZpbGw6IGZ1bmN0aW9uIChudW1iZXIsIHdpZHRoKSB7XG4gICAgICAgIHdpZHRoIC09IG51bWJlci50b1N0cmluZygpLmxlbmd0aDtcbiAgICAgICAgaWYgKHdpZHRoID4gMClcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXkod2lkdGggKyAoL1xcLi8udGVzdChudW1iZXIpID8gMiA6IDEpKS5qb2luKCcwJykgKyBudW1iZXI7XG4gICAgICAgIHJldHVybiBudW1iZXIudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zcHJpdGVcbiAgICAqIEBjYXRlZ29yeSBHcmFwaGljc1xuICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LnNwcml0ZShbTnVtYmVyIHRpbGVdLCBTdHJpbmcgdXJsLCBPYmplY3QgbWFwWywgTnVtYmVyIHBhZGRpbmdYWywgTnVtYmVyIHBhZGRpbmdZXV0pXG4gICAgKiBAcGFyYW0gdGlsZSAtIFRpbGUgc2l6ZSBvZiB0aGUgc3ByaXRlIG1hcCwgZGVmYXVsdHMgdG8gMVxuICAgICogQHBhcmFtIHVybCAtIFVSTCBvZiB0aGUgc3ByaXRlIGltYWdlXG4gICAgKiBAcGFyYW0gbWFwIC0gT2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgd2hhdCBiZWNvbWVzIGEgbmV3IGNvbXBvbmVudCBhbmQgdGhlIHZhbHVlIHBvaW50cyB0byBhIHBvc2l0aW9uIG9uIHRoZSBzcHJpdGUgbWFwXG4gICAgKiBAcGFyYW0gcGFkZGluZ1ggLSBIb3Jpem9udGFsIHNwYWNlIGluIGJldHdlZW4gdGlsZXMuIERlZmF1bHRzIHRvIDAuXG4gICAgKiBAcGFyYW0gcGFkZGluZ1kgLSBWZXJ0aWNhbCBzcGFjZSBpbiBiZXR3ZWVuIHRpbGVzLiBEZWZhdWx0cyB0byBwYWRkaW5nWC5cbiAgICAqIEdlbmVyYXRlcyBjb21wb25lbnRzIGJhc2VkIG9uIHBvc2l0aW9ucyBpbiBhIHNwcml0ZSBpbWFnZSB0byBiZSBhcHBsaWVkIHRvIGVudGl0aWVzLlxuICAgICpcbiAgICAqIEFjY2VwdHMgYSB0aWxlIHNpemUsIFVSTCBhbmQgbWFwIGZvciB0aGUgbmFtZSBvZiB0aGUgc3ByaXRlIGFuZCBpdCdzIHBvc2l0aW9uLlxuICAgICpcbiAgICAqIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHBvc2l0aW9uIG9mIHRoZSBzcHJpdGUgd2hlcmUgaW5kZXggYDBgXG4gICAgKiBpcyB0aGUgYHhgIHBvc2l0aW9uLCBgMWAgaXMgdGhlIGB5YCBwb3NpdGlvbiBhbmQgb3B0aW9uYWxseSBgMmAgaXMgdGhlIHdpZHRoIGFuZCBgM2BcbiAgICAqIGlzIHRoZSBoZWlnaHQuIElmIHRoZSBzcHJpdGUgbWFwIGhhcyBwYWRkaW5nLCBwYXNzIHRoZSB2YWx1ZXMgZm9yIHRoZSBgeGAgcGFkZGluZ1xuICAgICogb3IgYHlgIHBhZGRpbmcuIElmIHRoZXkgYXJlIHRoZSBzYW1lLCBqdXN0IGFkZCBvbmUgdmFsdWUuXG4gICAgKlxuICAgICogSWYgdGhlIHNwcml0ZSBpbWFnZSBoYXMgbm8gY29uc2lzdGVudCB0aWxlIHNpemUsIGAxYCBvciBubyBhcmd1bWVudCBuZWVkIGJlXG4gICAgKiBwYXNzZWQgZm9yIHRpbGUgc2l6ZS5cbiAgICAqXG4gICAgKiBFbnRpdGllcyB0aGF0IGFkZCB0aGUgZ2VuZXJhdGVkIGNvbXBvbmVudHMgYXJlIGFsc28gZ2l2ZW4gYSBjb21wb25lbnQgY2FsbGVkIGBTcHJpdGVgLlxuICAgICogXG4gICAgKiBAc2VlIFNwcml0ZVxuICAgICovXG4gICAgc3ByaXRlOiBmdW5jdGlvbiAodGlsZSwgdGlsZWgsIHVybCwgbWFwLCBwYWRkaW5nWCwgcGFkZGluZ1kpIHtcbiAgICAgICAgdmFyIHNwcml0ZU5hbWUsIHRlbXAsIHgsIHksIHcsIGgsIGltZztcblxuICAgICAgICAvL2lmIG5vIHRpbGUgdmFsdWUsIGRlZmF1bHQgdG8gMVxuICAgICAgICBpZiAodHlwZW9mIHRpbGUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHBhZGRpbmdZID0gcGFkZGluZ1g7XG4gICAgICAgICAgICBwYWRkaW5nWCA9IG1hcDtcbiAgICAgICAgICAgIG1hcCA9IHRpbGVoO1xuICAgICAgICAgICAgdXJsID0gdGlsZTtcbiAgICAgICAgICAgIHRpbGUgPSAxO1xuICAgICAgICAgICAgdGlsZWggPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0aWxlaCA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBwYWRkaW5nWSA9IHBhZGRpbmdYO1xuICAgICAgICAgICAgcGFkZGluZ1ggPSBtYXA7XG4gICAgICAgICAgICBtYXAgPSB1cmw7XG4gICAgICAgICAgICB1cmwgPSB0aWxlaDtcbiAgICAgICAgICAgIHRpbGVoID0gdGlsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgbm8gcGFkZGluZ1ksIHVzZSBwYWRkaW5nWFxuICAgICAgICBpZiAoIXBhZGRpbmdZICYmIHBhZGRpbmdYKSBwYWRkaW5nWSA9IHBhZGRpbmdYO1xuICAgICAgICBwYWRkaW5nWCA9IHBhcnNlSW50KHBhZGRpbmdYIHx8IDAsIDEwKTsgLy9qdXN0IGluY2FzZVxuICAgICAgICBwYWRkaW5nWSA9IHBhcnNlSW50KHBhZGRpbmdZIHx8IDAsIDEwKTtcblxuICAgICAgICBpbWcgPSBDcmFmdHkuYXNzZXQodXJsKTtcbiAgICAgICAgaWYgKCFpbWcpIHtcbiAgICAgICAgICAgIGltZyA9IG5ldyBJbWFnZSgpO1xuICAgICAgICAgICAgaW1nLnNyYyA9IHVybDtcbiAgICAgICAgICAgIENyYWZ0eS5hc3NldCh1cmwsIGltZyk7XG4gICAgICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vYWxsIGNvbXBvbmVudHMgd2l0aCB0aGlzIGltZyBhcmUgbm93IHJlYWR5XG4gICAgICAgICAgICAgICAgZm9yIChzcHJpdGVOYW1lIGluIG1hcCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkoc3ByaXRlTmFtZSkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoc3ByaXRlTmFtZSBpbiBtYXApIHtcbiAgICAgICAgICAgIGlmICghbWFwLmhhc093blByb3BlcnR5KHNwcml0ZU5hbWUpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgdGVtcCA9IG1hcFtzcHJpdGVOYW1lXTtcbiAgICAgICAgICAgIHggPSB0ZW1wWzBdICogKHRpbGUgKyBwYWRkaW5nWCk7XG4gICAgICAgICAgICB5ID0gdGVtcFsxXSAqICh0aWxlaCArIHBhZGRpbmdZKTtcbiAgICAgICAgICAgIHcgPSB0ZW1wWzJdICogdGlsZSB8fCB0aWxlO1xuICAgICAgICAgICAgaCA9IHRlbXBbM10gKiB0aWxlaCB8fCB0aWxlaDtcblxuICAgICAgICAgICAgLy9nZW5lcmF0ZXMgc3ByaXRlIGNvbXBvbmVudHMgZm9yIGVhY2ggdGlsZSBpbiB0aGUgbWFwXG4gICAgICAgICAgICBDcmFmdHkuYyhzcHJpdGVOYW1lLCB7XG4gICAgICAgICAgICAgICAgcmVhZHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIF9fY29vcmQ6IFt4LCB5LCB3LCBoXSxcblxuICAgICAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1aXJlcyhcIlNwcml0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RyaW0gPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19pbWFnZSA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2Nvb3JkID0gW3RoaXMuX19jb29yZFswXSwgdGhpcy5fX2Nvb3JkWzFdLCB0aGlzLl9fY29vcmRbMl0sIHRoaXMuX19jb29yZFszXV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190aWxlID0gdGlsZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RpbGVoID0gdGlsZWg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19wYWRkaW5nID0gW3BhZGRpbmdYLCBwYWRkaW5nWV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nID0gaW1nO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vZHJhdyBub3dcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1nLmNvbXBsZXRlICYmIHRoaXMuaW1nLndpZHRoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvL3NldCB0aGUgd2lkdGggYW5kIGhlaWdodCB0byB0aGUgc3ByaXRlIHNpemVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ID0gdGhpcy5fX2Nvb3JkWzJdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmggPSB0aGlzLl9fY29vcmRbM107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgX2V2ZW50czoge30sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmFkZEV2ZW50XG4gICAgKiBAY2F0ZWdvcnkgRXZlbnRzLCBNaXNjXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYWRkRXZlbnQoT2JqZWN0IGN0eCwgSFRNTEVsZW1lbnQgb2JqLCBTdHJpbmcgZXZlbnQsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICogQHBhcmFtIGN0eCAtIENvbnRleHQgb2YgdGhlIGNhbGxiYWNrIG9yIHRoZSB2YWx1ZSBvZiBgdGhpc2BcbiAgICAqIEBwYXJhbSBvYmogLSBFbGVtZW50IHRvIGFkZCB0aGUgRE9NIGV2ZW50IHRvXG4gICAgKiBAcGFyYW0gZXZlbnQgLSBFdmVudCBuYW1lIHRvIGJpbmQgdG9cbiAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIHdoZW4gdHJpZ2dlcmVkXG4gICAgKiBcbiAgICAqIEFkZHMgRE9NIGxldmVsIDMgZXZlbnRzIHRvIGVsZW1lbnRzLiBUaGUgYXJndW1lbnRzIGl0IGFjY2VwdHMgYXJlIHRoZSBjYWxsXG4gICAgKiBjb250ZXh0ICh0aGUgdmFsdWUgb2YgYHRoaXNgKSwgdGhlIERPTSBlbGVtZW50IHRvIGF0dGFjaCB0aGUgZXZlbnQgdG8sXG4gICAgKiB0aGUgZXZlbnQgbmFtZSAod2l0aG91dCBgb25gIChgY2xpY2tgIHJhdGhlciB0aGFuIGBvbmNsaWNrYCkpIGFuZFxuICAgICogZmluYWxseSB0aGUgY2FsbGJhY2sgbWV0aG9kLlxuICAgICpcbiAgICAqIElmIG5vIGVsZW1lbnQgaXMgcGFzc2VkLCB0aGUgZGVmYXVsdCBlbGVtZW50IHdpbGwgYmUgYHdpbmRvdy5kb2N1bWVudGAuXG4gICAgKlxuICAgICogQ2FsbGJhY2tzIGFyZSBwYXNzZWQgd2l0aCBldmVudCBkYXRhLlxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS5yZW1vdmVFdmVudFxuICAgICovXG4gICAgYWRkRXZlbnQ6IGZ1bmN0aW9uIChjdHgsIG9iaiwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSBvYmo7XG4gICAgICAgICAgICBvYmogPSB3aW5kb3cuZG9jdW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvL3NhdmUgYW5vbnltb3VzIGZ1bmN0aW9uIHRvIGJlIGFibGUgdG8gcmVtb3ZlXG4gICAgICAgIHZhciBhZm4gPSBmdW5jdGlvbiAoZSkgeyBcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGUgfHwgd2luZG93LmV2ZW50OyBcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjdHgsIGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZCA9IGN0eFswXSB8fCBcIlwiO1xuXG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzW2lkICsgb2JqICsgdHlwZSArIGNhbGxiYWNrXSkgdGhpcy5fZXZlbnRzW2lkICsgb2JqICsgdHlwZSArIGNhbGxiYWNrXSA9IGFmbjtcbiAgICAgICAgZWxzZSByZXR1cm47XG5cbiAgICAgICAgaWYgKG9iai5hdHRhY2hFdmVudCkgeyAvL0lFXG4gICAgICAgICAgICBvYmouYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGFmbik7XG4gICAgICAgIH0gZWxzZSB7IC8vRXZlcnlvbmUgZWxzZVxuICAgICAgICAgICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgYWZuLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5yZW1vdmVFdmVudFxuICAgICogQGNhdGVnb3J5IEV2ZW50cywgTWlzY1xuICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LnJlbW92ZUV2ZW50KE9iamVjdCBjdHgsIEhUTUxFbGVtZW50IG9iaiwgU3RyaW5nIGV2ZW50LCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAqIEBwYXJhbSBjdHggLSBDb250ZXh0IG9mIHRoZSBjYWxsYmFjayBvciB0aGUgdmFsdWUgb2YgYHRoaXNgXG4gICAgKiBAcGFyYW0gb2JqIC0gRWxlbWVudCB0aGUgZXZlbnQgaXMgb25cbiAgICAqIEBwYXJhbSBldmVudCAtIE5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgZXhlY3V0ZWQgd2hlbiB0cmlnZ2VyZWRcbiAgICAqIFxuICAgICogUmVtb3ZlcyBldmVudHMgYXR0YWNoZWQgYnkgYENyYWZ0eS5hZGRFdmVudCgpYC4gQWxsIHBhcmFtZXRlcnMgbXVzdFxuICAgICogYmUgdGhlIHNhbWUgdGhhdCB3ZXJlIHVzZWQgdG8gYXR0YWNoIHRoZSBldmVudCBpbmNsdWRpbmcgYSByZWZlcmVuY2VcbiAgICAqIHRvIHRoZSBjYWxsYmFjayBtZXRob2QuXG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5LmFkZEV2ZW50XG4gICAgKi9cbiAgICByZW1vdmVFdmVudDogZnVuY3Rpb24gKGN0eCwgb2JqLCB0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0eXBlO1xuICAgICAgICAgICAgdHlwZSA9IG9iajtcbiAgICAgICAgICAgIG9iaiA9IHdpbmRvdy5kb2N1bWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vcmV0cmlldmUgYW5vbnltb3VzIGZ1bmN0aW9uXG4gICAgICAgIHZhciBpZCA9IGN0eFswXSB8fCBcIlwiLFxuICAgICAgICAgICAgYWZuID0gdGhpcy5fZXZlbnRzW2lkICsgb2JqICsgdHlwZSArIGNhbGxiYWNrXTtcblxuICAgICAgICBpZiAoYWZuKSB7XG4gICAgICAgICAgICBpZiAob2JqLmRldGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb2JqLmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCBhZm4pO1xuICAgICAgICAgICAgfSBlbHNlIG9iai5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGFmbiwgZmFsc2UpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tpZCArIG9iaiArIHR5cGUgKyBjYWxsYmFja107XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5iYWNrZ3JvdW5kXG4gICAgKiBAY2F0ZWdvcnkgR3JhcGhpY3MsIFN0YWdlXG4gICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuYmFja2dyb3VuZChTdHJpbmcgdmFsdWUpXG4gICAgKiBAcGFyYW0gc3R5bGUgLSBNb2RpZnkgdGhlIGJhY2tncm91bmQgd2l0aCBhIGNvbG9yIG9yIGltYWdlXG4gICAgKiBcbiAgICAqIFRoaXMgbWV0aG9kIGlzIGVzc2VudGlhbGx5IGEgc2hvcnRjdXQgZm9yIGFkZGluZyBhIGJhY2tncm91bmRcbiAgICAqIHN0eWxlIHRvIHRoZSBzdGFnZSBlbGVtZW50LlxuICAgICovXG4gICAgYmFja2dyb3VuZDogZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLnN0eWxlLmJhY2tncm91bmQgPSBzdHlsZTtcbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS52aWV3cG9ydFxuICAgICogQGNhdGVnb3J5IFN0YWdlXG4gICAgKiBcbiAgICAqIFZpZXdwb3J0IGlzIGVzc2VudGlhbGx5IGEgMkQgY2FtZXJhIGxvb2tpbmcgYXQgdGhlIHN0YWdlLiBDYW4gYmUgbW92ZWQgd2hpY2hcbiAgICAqIGluIHR1cm4gd2lsbCByZWFjdCBqdXN0IGxpa2UgYSBjYW1lcmEgbW92aW5nIGluIHRoYXQgZGlyZWN0aW9uLlxuICAgICovXG4gICAgdmlld3BvcnQ6IHtcbiAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5jbGFtcFRvRW50aXRpZXNcbiAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgKiBcbiAgICAgICAgKiBEZWNpZGVzIGlmIHRoZSB2aWV3cG9ydCBmdW5jdGlvbnMgc2hvdWxkIGNsYW1wIHRvIGdhbWUgZW50aXRpZXMuXG4gICAgICAgICogV2hlbiBzZXQgdG8gYHRydWVgIGZ1bmN0aW9ucyBzdWNoIGFzIENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soKSB3aWxsIG5vdCBhbGxvdyB5b3UgdG8gbW92ZSB0aGVcbiAgICAgICAgKiB2aWV3cG9ydCBvdmVyIGFyZWFzIG9mIHRoZSBnYW1lIHRoYXQgaGFzIG5vIGVudGl0aWVzLlxuICAgICAgICAqIEZvciBkZXZlbG9wbWVudCBpdCBjYW4gYmUgdXNlZnVsIHRvIHNldCB0aGlzIHRvIGZhbHNlLlxuICAgICAgICAqL1xuICAgICAgICBjbGFtcFRvRW50aXRpZXM6IHRydWUsXG4gICAgICAgIHdpZHRoOiAwLFxuICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnhcbiAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgKiBcbiAgICAgICAgKiBXaWxsIG1vdmUgdGhlIHN0YWdlIGFuZCB0aGVyZWZvcmUgZXZlcnkgdmlzaWJsZSBlbnRpdHkgYWxvbmcgdGhlIGB4YFxuICAgICAgICAqIGF4aXMgaW4gdGhlIG9wcG9zaXRlIGRpcmVjdGlvbi5cbiAgICAgICAgKlxuICAgICAgICAqIFdoZW4gdGhpcyB2YWx1ZSBpcyBzZXQsIGl0IHdpbGwgc2hpZnQgdGhlIGVudGlyZSBzdGFnZS4gVGhpcyBtZWFucyB0aGF0IGVudGl0eVxuICAgICAgICAqIHBvc2l0aW9ucyBhcmUgbm90IGV4YWN0bHkgd2hlcmUgdGhleSBhcmUgb24gc2NyZWVuLiBUbyBnZXQgdGhlIGV4YWN0IHBvc2l0aW9uLFxuICAgICAgICAqIHNpbXBseSBhZGQgYENyYWZ0eS52aWV3cG9ydC54YCBvbnRvIHRoZSBlbnRpdGllcyBgeGAgcG9zaXRpb24uXG4gICAgICAgICovXG4gICAgICAgIF94OiAwLFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC55XG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICogXG4gICAgICAgICogV2lsbCBtb3ZlIHRoZSBzdGFnZSBhbmQgdGhlcmVmb3JlIGV2ZXJ5IHZpc2libGUgZW50aXR5IGFsb25nIHRoZSBgeWBcbiAgICAgICAgKiBheGlzIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24uXG4gICAgICAgICpcbiAgICAgICAgKiBXaGVuIHRoaXMgdmFsdWUgaXMgc2V0LCBpdCB3aWxsIHNoaWZ0IHRoZSBlbnRpcmUgc3RhZ2UuIFRoaXMgbWVhbnMgdGhhdCBlbnRpdHlcbiAgICAgICAgKiBwb3NpdGlvbnMgYXJlIG5vdCBleGFjdGx5IHdoZXJlIHRoZXkgYXJlIG9uIHNjcmVlbi4gVG8gZ2V0IHRoZSBleGFjdCBwb3NpdGlvbixcbiAgICAgICAgKiBzaW1wbHkgYWRkIGBDcmFmdHkudmlld3BvcnQueWAgb250byB0aGUgZW50aXRpZXMgYHlgIHBvc2l0aW9uLlxuICAgICAgICAqL1xuICAgICAgICBfeTogMCxcblx0XHRcblx0XHQvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuYm91bmRzXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKlxuXHRcdCAqIEEgcmVjdGFuZ2xlIHdoaWNoIGRlZmluZXMgdGhlIGJvdW5kcyBvZiB0aGUgdmlld3BvcnQuIElmIHRoaXMgXG5cdFx0ICogdmFyaWFibGUgaXMgbnVsbCwgQ3JhZnR5IHVzZXMgdGhlIGJvdW5kaW5nIGJveCBvZiBhbGwgdGhlIGl0ZW1zXG5cdFx0ICogb24gdGhlIHN0YWdlLlxuICAgICAgICAgKi9cbiAgICAgICAgYm91bmRzOm51bGwsXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbFxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbChTdHJpbmcgYXhpcywgTnVtYmVyIHYpXG4gICAgICAgICAqIEBwYXJhbSBheGlzIC0gJ3gnIG9yICd5J1xuICAgICAgICAgKiBAcGFyYW0gdiAtIFRoZSBuZXcgYWJzb2x1dGUgcG9zaXRpb24gb24gdGhlIGF4aXNcbiAgICAgICAgICpcbiAgICAgICAgICogV2lsbCBtb3ZlIHRoZSB2aWV3cG9ydCB0byB0aGUgcG9zaXRpb24gZ2l2ZW4gb24gdGhlIHNwZWNpZmllZCBheGlzXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZSBcbiAgICAgICAgICogV2lsbCBtb3ZlIHRoZSBjYW1lcmEgNTAwIHBpeGVscyByaWdodCBvZiBpdHMgaW5pdGlhbCBwb3NpdGlvbiwgaW4gZWZmZWN0XG4gICAgICAgICAqIHNoaWZ0aW5nIGV2ZXJ5dGhpbmcgaW4gdGhlIHZpZXdwb3J0IDUwMCBwaXhlbHMgdG8gdGhlIGxlZnQuXG4gICAgICAgICAqIFxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbCgnX3gnLCA1MDApO1xuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIHNjcm9sbDogZnVuY3Rpb24gKGF4aXMsIHYpIHtcbiAgICAgICAgICAgIHYgPSBNYXRoLmZsb29yKHYpO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IHYgLSB0aGlzW2F4aXNdLCAvL2NoYW5nZSBpbiBkaXJlY3Rpb25cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0LFxuICAgICAgICAgICAgICAgIHN0eWxlID0gQ3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlLFxuICAgICAgICAgICAgICAgIGNhbnZhcztcblxuICAgICAgICAgICAgLy91cGRhdGUgdmlld3BvcnQgYW5kIERPTSBzY3JvbGxcbiAgICAgICAgICAgIHRoaXNbYXhpc10gPSB2O1xuXHRcdFx0aWYgKGNvbnRleHQpIHtcblx0XHRcdFx0aWYgKGF4aXMgPT0gJ194Jykge1xuXHRcdFx0XHRcdGNvbnRleHQudHJhbnNsYXRlKGNoYW5nZSwgMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29udGV4dC50cmFuc2xhdGUoMCwgY2hhbmdlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbCgpO1xuXHRcdFx0fVxuICAgICAgICAgICAgc3R5bGVbYXhpcyA9PSAnX3gnID8gXCJsZWZ0XCIgOiBcInRvcFwiXSA9IHYgKyBcInB4XCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgX3g6IC10aGlzLl94LCBfeTogLXRoaXMuX3ksIF93OiB0aGlzLndpZHRoLCBfaDogdGhpcy5oZWlnaHQgfTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQucGFuXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQucGFuKFN0cmluZyBheGlzLCBOdW1iZXIgdiwgTnVtYmVyIHRpbWUpXG4gICAgICAgICAqIEBwYXJhbSBTdHJpbmcgYXhpcyAtICd4JyBvciAneScuIFRoZSBheGlzIHRvIG1vdmUgdGhlIGNhbWVyYSBvblxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIHYgLSB0aGUgZGlzdGFuY2UgdG8gbW92ZSB0aGUgY2FtZXJhIGJ5XG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgdGltZSAtIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMgZm9yIHRoZSBlbnRpcmUgY2FtZXJhIG1vdmVtZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIFBhbnMgdGhlIGNhbWVyYSBhIGdpdmVuIG51bWJlciBvZiBwaXhlbHMgb3ZlciBhIGdpdmVuIG51bWJlciBvZiBmcmFtZXNcbiAgICAgICAgICovXG4gICAgICAgIHBhbjogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0d2VlbnMgPSB7fSwgaSwgYm91bmQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZW50ZXJGcmFtZShlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGwgPSAwO1xuICAgICAgICAgICAgICAgIGZvciAoaSBpbiB0d2VlbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByb3AgPSB0d2VlbnNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wLnJlbVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wLmN1cnJlbnQgKz0gcHJvcC5kaWZmO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcC5yZW1UaW1lLS07XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnRbaV0gPSBNYXRoLmZsb29yKHByb3AuY3VycmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdHdlZW5zW2ldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsKSBDcmFmdHkudmlld3BvcnQuX2NsYW1wKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoYXhpcywgdiwgdGltZSkge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5mb2xsb3coKTtcbiAgICAgICAgICAgICAgICBpZiAoYXhpcyA9PSAncmVzZXQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSBpbiB0d2VlbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR3ZWVuc1tpXS5yZW1UaW1lID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aW1lID09IDApIHRpbWUgPSAxO1xuICAgICAgICAgICAgICAgIHR3ZWVuc1theGlzXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZGlmZjogLXYgLyB0aW1lLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50OiBDcmFmdHkudmlld3BvcnRbYXhpc10sXG4gICAgICAgICAgICAgICAgICAgIHJlbVRpbWU6IHRpbWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICghYm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmJpbmQoXCJFbnRlckZyYW1lXCIsIGVudGVyRnJhbWUpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpLFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5mb2xsb3dcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5mb2xsb3coT2JqZWN0IHRhcmdldCwgTnVtYmVyIG9mZnNldHgsIE51bWJlciBvZmZzZXR5KVxuICAgICAgICAgKiBAcGFyYW0gT2JqZWN0IHRhcmdldCAtIEFuIGVudGl0eSB3aXRoIHRoZSAyRCBjb21wb25lbnRcbiAgICAgICAgICogQHBhcmFtIE51bWJlciBvZmZzZXR4IC0gRm9sbG93IHRhcmdldCBzaG91bGQgYmUgb2Zmc2V0eCBwaXhlbHMgYXdheSBmcm9tIGNlbnRlclxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIG9mZnNldHkgLSBQb3NpdGl2ZSBwdXRzIHRhcmdldCB0byB0aGUgcmlnaHQgb2YgY2VudGVyXG4gICAgICAgICAqXG4gICAgICAgICAqIEZvbGxvd3MgYSBnaXZlbiBlbnRpdHkgd2l0aCB0aGUgMkQgY29tcG9uZW50LiBJZiBmb2xsb3dpbmcgdGFyZ2V0IHdpbGwgdGFrZSBhIHBvcnRpb24gb2ZcbiAgICAgICAgICogdGhlIHZpZXdwb3J0IG91dCBvZiBib3VuZHMgb2YgdGhlIHdvcmxkLCBmb2xsb3dpbmcgd2lsbCBzdG9wIHVudGlsIHRoZSB0YXJnZXQgbW92ZXMgYXdheS5cbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiB2YXIgZW50ID0gQ3JhZnR5LmUoJzJELCBET00nKS5hdHRyKHt3OiAxMDAsIGg6IDEwMDp9KTtcbiAgICAgICAgICogQ3JhZnR5LnZpZXdwb3J0LmZvbGxvdyhlbnQsIDAsIDApO1xuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIGZvbGxvdzogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvbGRUYXJnZXQsIG9mZngsIG9mZnk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKCdfeCcsIC0odGhpcy54ICsgKHRoaXMudyAvIDIpIC0gKENyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIpIC0gb2ZmeCkpO1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoJ195JywgLSh0aGlzLnkgKyAodGhpcy5oIC8gMikgLSAoQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIpIC0gb2ZmeSkpO1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5fY2xhbXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIG9mZnNldHgsIG9mZnNldHkpIHtcbiAgICAgICAgICAgICAgICBpZiAob2xkVGFyZ2V0KVxuICAgICAgICAgICAgICAgICAgICBvbGRUYXJnZXQudW5iaW5kKCdDaGFuZ2UnLCBjaGFuZ2UpO1xuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0IHx8ICF0YXJnZXQuaGFzKCcyRCcpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigncmVzZXQnKTtcblxuICAgICAgICAgICAgICAgIG9sZFRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICBvZmZ4ID0gKHR5cGVvZiBvZmZzZXR4ICE9ICd1bmRlZmluZWQnKSA/IG9mZnNldHggOiAwO1xuICAgICAgICAgICAgICAgIG9mZnkgPSAodHlwZW9mIG9mZnNldHkgIT0gJ3VuZGVmaW5lZCcpID8gb2Zmc2V0eSA6IDA7XG5cbiAgICAgICAgICAgICAgICB0YXJnZXQuYmluZCgnQ2hhbmdlJywgY2hhbmdlKTtcbiAgICAgICAgICAgICAgICBjaGFuZ2UuY2FsbCh0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpLFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5jZW50ZXJPblxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0LmNlbnRlck9uKE9iamVjdCB0YXJnZXQsIE51bWJlciB0aW1lKVxuICAgICAgICAgKiBAcGFyYW0gT2JqZWN0IHRhcmdldCAtIEFuIGVudGl0eSB3aXRoIHRoZSAyRCBjb21wb25lbnRcbiAgICAgICAgICogQHBhcmFtIE51bWJlciB0aW1lIC0gVGhlIG51bWJlciBvZiBmcmFtZXMgdG8gcGVyZm9ybSB0aGUgY2VudGVyaW5nIG92ZXJcbiAgICAgICAgICpcbiAgICAgICAgICogQ2VudGVycyB0aGUgdmlld3BvcnQgb24gdGhlIGdpdmVuIGVudGl0eVxuICAgICAgICAgKi9cbiAgICAgICAgY2VudGVyT246IGZ1bmN0aW9uICh0YXJnLCB0aW1lKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHRhcmcueCxcbiAgICAgICAgICAgICAgICAgICAgeSA9IHRhcmcueSxcbiAgICAgICAgICAgICAgICAgICAgbWlkX3ggPSB0YXJnLncgLyAyLFxuICAgICAgICAgICAgICAgICAgICBtaWRfeSA9IHRhcmcuaCAvIDIsXG4gICAgICAgICAgICAgICAgICAgIGNlbnRfeCA9IENyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIsXG4gICAgICAgICAgICAgICAgICAgIGNlbnRfeSA9IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQgLyAyLFxuICAgICAgICAgICAgICAgICAgICBuZXdfeCA9IHggKyBtaWRfeCAtIGNlbnRfeCxcbiAgICAgICAgICAgICAgICAgICAgbmV3X3kgPSB5ICsgbWlkX3kgLSBjZW50X3k7XG5cbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3Jlc2V0Jyk7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCd4JywgbmV3X3gsIHRpbWUpO1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigneScsIG5ld195LCB0aW1lKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuX3pvb21cbiAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgKiBcbiAgICAgICAgKiBUaGlzIHZhbHVlIGtlZXBzIGFuIGFtb3VudCBvZiB2aWV3cG9ydCB6b29tLCByZXF1aXJlZCBmb3IgY2FsY3VsYXRpbmcgbW91c2UgcG9zaXRpb24gYXQgZW50aXR5XG4gICAgICAgICovXG4gICAgICAgIF96b29tIDogMSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuem9vbVxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0Lnpvb20oTnVtYmVyIGFtdCwgTnVtYmVyIGNlbnRfeCwgTnVtYmVyIGNlbnRfeSwgTnVtYmVyIHRpbWUpXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgYW10IC0gYW1vdW50IHRvIHpvb20gaW4gb24gdGhlIHRhcmdldCBieSAoZWcuIDIsIDQsIDAuNSlcbiAgICAgICAgICogQHBhcmFtIE51bWJlciBjZW50X3ggLSB0aGUgY2VudGVyIHRvIHpvb20gb25cbiAgICAgICAgICogQHBhcmFtIE51bWJlciBjZW50X3kgLSB0aGUgY2VudGVyIHRvIHpvb20gb25cbiAgICAgICAgICogQHBhcmFtIE51bWJlciB0aW1lIC0gdGhlIGR1cmF0aW9uIGluIGZyYW1lcyBvZiB0aGUgZW50aXJlIHpvb20gb3BlcmF0aW9uXG4gICAgICAgICAqXG4gICAgICAgICAqIFpvb21zIHRoZSBjYW1lcmEgaW4gb24gYSBnaXZlbiBwb2ludC4gYW10ID4gMSB3aWxsIGJyaW5nIHRoZSBjYW1lcmEgY2xvc2VyIHRvIHRoZSBzdWJqZWN0XG4gICAgICAgICAqIGFtdCA8IDEgd2lsbCBicmluZyBpdCBmYXJ0aGVyIGF3YXkuIGFtdCA9IDAgd2lsbCBkbyBub3RoaW5nLlxuICAgICAgICAgKiBab29taW5nIGlzIG11bHRpcGxpY2F0aXZlLiBUbyByZXNldCB0aGUgem9vbSBhbW91bnQsIHBhc3MgMC5cbiAgICAgICAgICovXG4gICAgICAgIHpvb206IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgem9vbSA9IDEsXG4gICAgICAgICAgICAgICAgem9vbV90aWNrID0gMCxcbiAgICAgICAgICAgICAgICBkdXIgPSAwLFxuICAgICAgICAgICAgICAgIHByb3AgPSBDcmFmdHkuc3VwcG9ydC5wcmVmaXggKyBcIlRyYW5zZm9ybVwiLFxuICAgICAgICAgICAgICAgIGJvdW5kID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgYWN0ID0ge30sXG4gICAgICAgICAgICAgICAgcHJjdCA9IHt9O1xuICAgICAgICAgICAgLy8gd2hhdCdzIGdvaW5nIG9uOlxuICAgICAgICAgICAgLy8gMS4gR2V0IHRoZSBvcmlnaW5hbCBwb2ludCBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIHN0YWdlXG4gICAgICAgICAgICAvLyAyLiBTY2FsZSB0aGUgc3RhZ2VcbiAgICAgICAgICAgIC8vIDMuIEdldCB0aGUgbmV3IHNpemUgb2YgdGhlIHN0YWdlXG4gICAgICAgICAgICAvLyA0LiBHZXQgdGhlIGFic29sdXRlIHBvc2l0aW9uIG9mIG91ciBwb2ludCB1c2luZyBwcmV2aW91cyBwZXJjZW50YWdlXG4gICAgICAgICAgICAvLyA0LiBPZmZzZXQgaW5uZXIgYnkgdGhhdCBtdWNoXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGVudGVyRnJhbWUoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGR1ciA+IDApIHtcblx0XHRcdFx0XHRpZiAoaXNGaW5pdGUoQ3JhZnR5LnZpZXdwb3J0Ll96b29tKSkgem9vbSA9IENyYWZ0eS52aWV3cG9ydC5fem9vbTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBhY3Qud2lkdGggKiB6b29tLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBhY3QuaGVpZ2h0ICogem9vbVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB6b29tICs9IHpvb21fdGljaztcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0Ll96b29tID0gem9vbTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld19zID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGFjdC53aWR0aCAqIHpvb20sXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGFjdC5oZWlnaHQgKiB6b29tXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogbmV3X3Mud2lkdGggLSBvbGQud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IG5ld19zLmhlaWdodCAtIG9sZC5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlW3Byb3BdID0gJ3NjYWxlKCcgKyB6b29tICsgJywnICsgem9vbSArICcpJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKENyYWZ0eS5jYW52YXMuX2NhbnZhcykge1xuXHRcdFx0XHRcdFx0dmFyIGN6b29tID0gem9vbSAvICh6b29tIC0gem9vbV90aWNrKTtcblx0XHRcdFx0XHRcdENyYWZ0eS5jYW52YXMuY29udGV4dC5zY2FsZShjem9vbSwgY3pvb20pO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCAtPSBkaWZmLndpZHRoICogcHJjdC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgLT0gZGlmZi5oZWlnaHQgKiBwcmN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgZHVyLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFtdCwgY2VudF94LCBjZW50X3ksIHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHMgfHwgQ3JhZnR5Lm1hcC5ib3VuZGFyaWVzKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbmFsX3pvb20gPSBhbXQgPyB6b29tICogYW10IDogMTtcblx0XHRcdFx0aWYgKCFhbXQpIHtcdC8vIHdlJ3JlIHJlc2V0dGluZyB0byBkZWZhdWx0c1xuXHRcdFx0XHRcdHpvb20gPSAxO1xuXHRcdFx0XHRcdHRoaXMuX3pvb20gPSAxO1xuXHRcdFx0XHR9XG5cbiAgICAgICAgICAgICAgICBhY3Qud2lkdGggPSBib3VuZHMubWF4LnggLSBib3VuZHMubWluLng7XG4gICAgICAgICAgICAgICAgYWN0LmhlaWdodCA9IGJvdW5kcy5tYXgueSAtIGJvdW5kcy5taW4ueTtcblxuICAgICAgICAgICAgICAgIHByY3Qud2lkdGggPSBjZW50X3ggLyBhY3Qud2lkdGg7XG4gICAgICAgICAgICAgICAgcHJjdC5oZWlnaHQgPSBjZW50X3kgLyBhY3QuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgaWYgKHRpbWUgPT0gMCkgdGltZSA9IDE7XG4gICAgICAgICAgICAgICAgem9vbV90aWNrID0gKGZpbmFsX3pvb20gLSB6b29tKSAvIHRpbWU7XG4gICAgICAgICAgICAgICAgZHVyID0gdGltZTtcblxuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3Jlc2V0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCFib3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYmluZCgnRW50ZXJGcmFtZScsIGVudGVyRnJhbWUpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpLFxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuc2NhbGVcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5zY2FsZShOdW1iZXIgYW10KVxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIGFtdCAtIGFtb3VudCB0byB6b29tL3NjYWxlIGluIG9uIHRoZSBlbGVtZW50IG9uIHRoZSB2aWV3cG9ydCBieSAoZWcuIDIsIDQsIDAuNSlcbiAgICAgICAgICpcbiAgICAgICAgICogWm9vbXMvc2NhbGUgdGhlIGNhbWVyYS4gYW10ID4gMSBpbmNyZWFzZSBhbGwgZW50aXRpZXMgb24gc3RhZ2UgXG4gICAgICAgICAqIGFtdCA8IDEgd2lsbCByZWR1Y2UgYWxsIGVudGl0aWVzIG9uIHN0YWdlLiBhbXQgPSAwIHdpbGwgcmVzZXQgdGhlIHpvb20vc2NhbGUuXG4gICAgICAgICAqIFpvb21pbmcvc2NhbGluZyBpcyBtdWx0aXBsaWNhdGl2ZS4gVG8gcmVzZXQgdGhlIHpvb20vc2NhbGUgYW1vdW50LCBwYXNzIDAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiBDcmFmdHkudmlld3BvcnQuc2NhbGUoMik7IC8vdG8gc2VlIGVmZmVjdCBhZGQgc29tZSBlbnRpdGllcyBvbiBzdGFnZS5cbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBzY2FsZTogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcm9wID0gQ3JhZnR5LnN1cHBvcnQucHJlZml4ICsgXCJUcmFuc2Zvcm1cIixcbiAgICAgICAgICAgICAgICBhY3QgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoYW10KSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzIHx8IENyYWZ0eS5tYXAuYm91bmRhcmllcygpLFxuICAgICAgICAgICAgICAgICAgICBmaW5hbF96b29tID0gYW10ID8gdGhpcy5fem9vbSAqIGFtdCA6IDEsXG5cdFx0XHRcdFx0Y3pvb20gPSBmaW5hbF96b29tIC8gdGhpcy5fem9vbTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3pvb20gPSBmaW5hbF96b29tO1xuICAgICAgICAgICAgICAgIGFjdC53aWR0aCA9IGJvdW5kcy5tYXgueCAtIGJvdW5kcy5taW4ueDtcbiAgICAgICAgICAgICAgICBhY3QuaGVpZ2h0ID0gYm91bmRzLm1heC55IC0gYm91bmRzLm1pbi55O1xuICAgICAgICAgICAgICAgIHZhciBuZXdfcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGFjdC53aWR0aCAqIGZpbmFsX3pvb20sXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogYWN0LmhlaWdodCAqIGZpbmFsX3pvb21cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigncmVzZXQnKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGVbJ3RyYW5zZm9ybSddID0gXG5cdFx0XHRcdENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZVtwcm9wXSA9ICdzY2FsZSgnICsgdGhpcy5fem9vbSArICcsJyArIHRoaXMuX3pvb20gKyAnKSc7XG5cbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LmNhbnZhcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5jYW52YXMuY29udGV4dC5zY2FsZShjem9vbSwgY3pvb20pO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL0NyYWZ0eS52aWV3cG9ydC53aWR0aCA9IG5ld19zLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCA9IG5ld19zLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKSxcbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9va1xuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vayhCb29sZWFuIGFjdGl2ZSlcbiAgICAgICAgICogQHBhcmFtIEJvb2xlYW4gYWN0aXZlIC0gQWN0aXZhdGUgb3IgZGVhY3RpdmF0ZSBtb3VzZWxvb2tcbiAgICAgICAgICpcbiAgICAgICAgICogVG9nZ2xlIG1vdXNlbG9vayBvbiB0aGUgY3VycmVudCB2aWV3cG9ydC5cbiAgICAgICAgICogU2ltcGx5IGNhbGwgdGhpcyBmdW5jdGlvbiBhbmQgdGhlIHVzZXIgd2lsbCBiZSBhYmxlIHRvXG4gICAgICAgICAqIGRyYWcgdGhlIHZpZXdwb3J0IGFyb3VuZC5cbiAgICAgICAgICovXG4gICAgICAgIG1vdXNlbG9vazogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY3RpdmUgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBkcmFnZ2luZyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGxhc3RNb3VzZSA9IHt9XG4gICAgICAgICAgICBvbGQgPSB7fTtcblxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9wLCBhcmcpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmUgPSBvcDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5Lm1vdXNlT2JqcysrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5Lm1vdXNlT2JqcyA9IE1hdGgubWF4KDAsIENyYWZ0eS5tb3VzZU9ianMgLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghYWN0aXZlKSByZXR1cm47XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtb3ZlJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZHJhZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRyYWdnaW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGFyZy5jbGllbnRYIC0gbGFzdE1vdXNlLngsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogYXJnLmNsaWVudFkgLSBsYXN0TW91c2UueVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggKz0gZGlmZi54O1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgKz0gZGlmZi55O1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0Ll9jbGFtcCgpOyBcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdE1vdXNlLnggPSBhcmcuY2xpZW50WDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RNb3VzZS55ID0gYXJnLmNsaWVudFk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RvcCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkoKSxcbiAgICAgICAgX2NsYW1wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjbGFtcHMgdGhlIHZpZXdwb3J0IHRvIHRoZSB2aWV3YWJsZSBhcmVhXG4gICAgICAgICAgICAvLyB1bmRlciBubyBjaXJjdW1zdGFuY2VzIHNob3VsZCB0aGUgdmlld3BvcnQgc2VlIHNvbWV0aGluZyBvdXRzaWRlIHRoZSBib3VuZGFyeSBvZiB0aGUgJ3dvcmxkJ1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNsYW1wVG9FbnRpdGllcykgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGJvdW5kID0gdGhpcy5ib3VuZHMgfHwgQ3JhZnR5Lm1hcC5ib3VuZGFyaWVzKCk7XG5cdFx0XHRib3VuZC5tYXgueCAqPSB0aGlzLl96b29tO1xuXHRcdFx0Ym91bmQubWluLnggKj0gdGhpcy5fem9vbTtcblx0XHRcdGJvdW5kLm1heC55ICo9IHRoaXMuX3pvb207XG5cdFx0XHRib3VuZC5taW4ueSAqPSB0aGlzLl96b29tO1xuICAgICAgICAgICAgaWYgKGJvdW5kLm1heC54IC0gYm91bmQubWluLnggPiBDcmFmdHkudmlld3BvcnQud2lkdGgpIHtcbiAgICAgICAgICAgICAgICBib3VuZC5tYXgueCAtPSBDcmFmdHkudmlld3BvcnQud2lkdGg7XG5cbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LnZpZXdwb3J0LnggPCAtYm91bmQubWF4LngpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggPSAtYm91bmQubWF4Lng7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKENyYWZ0eS52aWV3cG9ydC54ID4gLWJvdW5kLm1pbi54KSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54ID0gLWJvdW5kLm1pbi54O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54ID0gLTEgKiAoYm91bmQubWluLnggKyAoYm91bmQubWF4LnggLSBib3VuZC5taW4ueCkgLyAyIC0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYm91bmQubWF4LnkgLSBib3VuZC5taW4ueSA+IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICBib3VuZC5tYXgueSAtPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS52aWV3cG9ydC55IDwgLWJvdW5kLm1heC55KSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ID0gLWJvdW5kLm1heC55O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDcmFmdHkudmlld3BvcnQueSA+IC1ib3VuZC5taW4ueSkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSA9IC1ib3VuZC5taW4ueTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSA9IC0xICogKGJvdW5kLm1pbi55ICsgKGJvdW5kLm1heC55IC0gYm91bmQubWluLnkpIC8gMiAtIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQgLyAyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuaW5pdFxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0LmluaXQoW051bWJlciB3aWR0aCwgTnVtYmVyIGhlaWdodF0pXG4gICAgICAgICAqIEBwYXJhbSB3aWR0aCAtIFdpZHRoIG9mIHRoZSB2aWV3cG9ydFxuICAgICAgICAgKiBAcGFyYW0gaGVpZ2h0IC0gSGVpZ2h0IG9mIHRoZSB2aWV3cG9ydFxuICAgICAgICAgKlxuICAgICAgICAgKiBJbml0aWFsaXplIHRoZSB2aWV3cG9ydC4gSWYgdGhlIGFyZ3VtZW50cyAnd2lkdGgnIG9yICdoZWlnaHQnIGFyZSBtaXNzaW5nLCBvciBDcmFmdHkubW9iaWxlIGlzIHRydWUsIHVzZSBDcmFmdHkuRE9NLndpbmRvdy53aWR0aCBhbmQgQ3JhZnR5LkRPTS53aW5kb3cuaGVpZ2h0IChmdWxsIHNjcmVlbiBtb2RlbCkuXG4gICAgICAgICAqIENyZWF0ZSBhIGRpdiB3aXRoIGlkIGBjci1zdGFnZWAsIGlmIHRoZXJlIGlzIG5vdCBhbHJlYWR5IGFuIEhUTUxFbGVtZW50IHdpdGggaWQgYGNyLXN0YWdlYCAoYnkgYENyYWZ0eS52aWV3cG9ydC5pbml0YCkuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBzZWUgQ3JhZnR5LmRldmljZSwgQ3JhZnR5LkRPTSwgQ3JhZnR5LnN0YWdlXG4gICAgICAgICAqL1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAodywgaCkge1xuICAgICAgICAgICAgQ3JhZnR5LkRPTS53aW5kb3cuaW5pdCgpO1xuXG4gICAgICAgICAgICAvL2Z1bGxzY3JlZW4gaWYgbW9iaWxlIG9yIG5vdCBzcGVjaWZpZWRcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSAoIXcgfHwgQ3JhZnR5Lm1vYmlsZSkgPyBDcmFmdHkuRE9NLndpbmRvdy53aWR0aCA6IHc7XG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9ICghaCB8fCBDcmFmdHkubW9iaWxlKSA/IENyYWZ0eS5ET00ud2luZG93LmhlaWdodCA6IGg7XG5cbiAgICAgICAgICAgIC8vY2hlY2sgaWYgc3RhZ2UgZXhpc3RzXG4gICAgICAgICAgICB2YXIgY3JzdGFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3Itc3RhZ2VcIik7XG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICAqICNDcmFmdHkuc3RhZ2VcbiAgICAgICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICAgICAgKiBUaGUgc3RhZ2Ugd2hlcmUgYWxsIHRoZSBET00gZW50aXRpZXMgd2lsbCBiZSBwbGFjZWQuXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgICogI0NyYWZ0eS5zdGFnZS5lbGVtXG4gICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkuc3RhZ2VcbiAgICAgICAgICAgICAqIFRoZSBgI2NyLXN0YWdlYCBkaXYgZWxlbWVudC5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAgKiAjQ3JhZnR5LnN0YWdlLmlubmVyXG4gICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkuc3RhZ2VcbiAgICAgICAgICAgICAqIGBDcmFmdHkuc3RhZ2UuaW5uZXJgIGlzIGEgZGl2IGluc2lkZSB0aGUgYCNjci1zdGFnZWAgZGl2IHRoYXQgaG9sZHMgYWxsIERPTSBlbnRpdGllcy5cbiAgICAgICAgICAgICAqIElmIHlvdSB1c2UgY2FudmFzLCBhIGBjYW52YXNgIGVsZW1lbnQgaXMgY3JlYXRlZCBhdCB0aGUgc2FtZSBsZXZlbCBpbiB0aGUgZG9tXG4gICAgICAgICAgICAgKiBhcyB0aGUgdGhlIGBDcmFmdHkuc3RhZ2UuaW5uZXJgIGRpdi4gU28gdGhlIGhpZXJhcmNoeSBpbiB0aGUgRE9NIGlzXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIGBDcmFmdHkuc3RhZ2UuZWxlbWBcbiAgICAgICAgICAgICAqIDwhLS0gbm90IHN1cmUgaG93IHRvIGRvIGluZGVudGF0aW9uIGluIHRoZSBkb2N1bWVudC0tPlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqICAgICAtIGBDcmFmdHkuc3RhZ2UuaW5uZXJgIChhIGRpdiBIVE1MRWxlbWVudClcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiAgICAgLSBgQ3JhZnR5LmNhbnZhcy5fY2FudmFzYCAoYSBjYW52YXMgSFRNTEVsZW1lbnQpIFxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8vY3JlYXRlIHN0YWdlIGRpdiB0byBjb250YWluIGV2ZXJ5dGhpbmdcbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZSA9IHtcbiAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgZnVsbHNjcmVlbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgZWxlbTogKGNyc3RhZ2UgPyBjcnN0YWdlIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSksXG4gICAgICAgICAgICAgICAgaW5uZXI6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vZnVsbHNjcmVlbiwgc3RvcCBzY3JvbGxiYXJzXG4gICAgICAgICAgICBpZiAoKCF3ICYmICFoKSB8fCBDcmFmdHkubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9IFwiaGlkZGVuXCI7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmZ1bGxzY3JlZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCBcInJlc2l6ZVwiLCBDcmFmdHkudmlld3BvcnQucmVsb2FkKTtcblxuICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgXCJibHVyXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LnNldHRpbmdzLmdldChcImF1dG9QYXVzZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICBpZighQ3JhZnR5Ll9wYXVzZWQpIENyYWZ0eS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgXCJmb2N1c1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS5fcGF1c2VkICYmIENyYWZ0eS5zZXR0aW5ncy5nZXQoXCJhdXRvUGF1c2VcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vbWFrZSB0aGUgc3RhZ2UgdW5zZWxlY3RhYmxlXG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIoXCJzdGFnZVNlbGVjdGFibGVcIiwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5vbnNlbGVjdHN0YXJ0ID0gdiA/IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH0gOiBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeShcInN0YWdlU2VsZWN0YWJsZVwiLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIC8vbWFrZSB0aGUgc3RhZ2UgaGF2ZSBubyBjb250ZXh0IG1lbnVcbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlcihcInN0YWdlQ29udGV4dE1lbnVcIiwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5vbmNvbnRleHRtZW51ID0gdiA/IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH0gOiBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeShcInN0YWdlQ29udGV4dE1lbnVcIiwgZmFsc2UpO1xuXG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MucmVnaXN0ZXIoXCJhdXRvUGF1c2VcIiwgZnVuY3Rpb24gKCl7IH0pO1xuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeShcImF1dG9QYXVzZVwiLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBib2R5IGFuZCBnaXZlIGl0IGFuIElEIGlmIG5vdCBleGlzdHNcbiAgICAgICAgICAgIGlmICghY3JzdGFnZSkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoQ3JhZnR5LnN0YWdlLmVsZW0pO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLmlkID0gXCJjci1zdGFnZVwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbSA9IENyYWZ0eS5zdGFnZS5lbGVtLnN0eWxlLFxuICAgICAgICAgICAgICAgIG9mZnNldDtcblxuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0uYXBwZW5kQ2hpbGQoQ3JhZnR5LnN0YWdlLmlubmVyKTtcbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZS56SW5kZXggPSBcIjFcIjtcblxuICAgICAgICAgICAgLy9jc3Mgc3R5bGVcbiAgICAgICAgICAgIGVsZW0ud2lkdGggPSB0aGlzLndpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgZWxlbS5oZWlnaHQgPSB0aGlzLmhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgIGVsZW0ub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuXG4gICAgICAgICAgICBpZiAoQ3JhZnR5Lm1vYmlsZSkge1xuICAgICAgICAgICAgICAgIGVsZW0ucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgICAgICAgICAgZWxlbS5sZWZ0ID0gXCIwcHhcIjtcbiAgICAgICAgICAgICAgICBlbGVtLnRvcCA9IFwiMHB4XCI7XG5cbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgZGVmYXVsdCBncmF5IGhpZ2hsaWdodGluZyBhZnRlciB0b3VjaFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZWxlbS53ZWJraXRUYXBIaWdobGlnaHRDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS53ZWJraXRUYXBIaWdobGlnaHRDb2xvciA9IFwicmdiYSgwLDAsMCwwKVwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtZXRhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm1ldGFcIiksXG4gICAgICAgICAgICAgICAgICAgIGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIkhFQURcIilbMF07XG5cbiAgICAgICAgICAgICAgICAvL3N0b3AgbW9iaWxlIHpvb21pbmcgYW5kIHNjcm9sbGluZ1xuICAgICAgICAgICAgICAgIG1ldGEuc2V0QXR0cmlidXRlKFwibmFtZVwiLCBcInZpZXdwb3J0XCIpO1xuICAgICAgICAgICAgICAgIG1ldGEuc2V0QXR0cmlidXRlKFwiY29udGVudFwiLCBcIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm9cIik7XG4gICAgICAgICAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChtZXRhKTtcblxuICAgICAgICAgICAgICAgIC8vaGlkZSB0aGUgYWRkcmVzcyBiYXJcbiAgICAgICAgICAgICAgICBtZXRhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm1ldGFcIik7XG4gICAgICAgICAgICAgICAgbWV0YS5zZXRBdHRyaWJ1dGUoXCJuYW1lXCIsIFwiYXBwbGUtbW9iaWxlLXdlYi1hcHAtY2FwYWJsZVwiKTtcbiAgICAgICAgICAgICAgICBtZXRhLnNldEF0dHJpYnV0ZShcImNvbnRlbnRcIiwgXCJ5ZXNcIik7XG4gICAgICAgICAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChtZXRhKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgd2luZG93LnNjcm9sbFRvKDAsIDEpOyB9LCAwKTtcblxuICAgICAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csIFwidG91Y2htb3ZlXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS54ID0gMDtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UueSA9IDA7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgICAgICAgICAvL2ZpbmQgb3V0IHRoZSBvZmZzZXQgcG9zaXRpb24gb2YgdGhlIHN0YWdlXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gQ3JhZnR5LkRPTS5pbm5lcihDcmFmdHkuc3RhZ2UuZWxlbSk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnggPSBvZmZzZXQueDtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UueSA9IG9mZnNldC55O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnN1cHBvcnQuc2V0dGVyKSB7XG4gICAgICAgICAgICAgICAgLy9kZWZpbmUgZ2V0dGVycyBhbmQgc2V0dGVycyB0byBzY3JvbGwgdGhlIHZpZXdwb3J0XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZVNldHRlcl9fKCd4JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5zY3JvbGwoJ194Jywgdik7IH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX19kZWZpbmVTZXR0ZXJfXygneScsIGZ1bmN0aW9uICh2KSB7IHRoaXMuc2Nyb2xsKCdfeScsIHYpOyB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3gnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94OyB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ3knLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95OyB9KTtcbiAgICAgICAgICAgICAgICAvL0lFOVxuICAgICAgICAgICAgfSBlbHNlIGlmIChDcmFmdHkuc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAneCcsIHsgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLnNjcm9sbCgnX3gnLCB2KTsgfSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94OyB9IH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAneScsIHsgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLnNjcm9sbCgnX3knLCB2KTsgfSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95OyB9IH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL2NyZWF0ZSBlbXB0eSBlbnRpdHkgd2FpdGluZyBmb3IgZW50ZXJmcmFtZVxuICAgICAgICAgICAgICAgIHRoaXMueCA9IHRoaXMuX3g7XG4gICAgICAgICAgICAgICAgdGhpcy55ID0gdGhpcy5feTtcbiAgICAgICAgICAgICAgICBDcmFmdHkuZShcInZpZXdwb3J0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5yZWxvYWRcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnN0YWdlXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgQ3JhZnR5LnZpZXdwb3J0LnJlbG9hZCgpXG4gICAgICAgICAqIFxuICAgICAgICAgKiBSZWNhbGN1bGF0ZSBhbmQgcmVsb2FkIHN0YWdlIHdpZHRoLCBoZWlnaHQgYW5kIHBvc2l0aW9uLlxuICAgICAgICAgKiBVc2VmdWwgd2hlbiBicm93c2VyIHJldHVybiB3cm9uZyByZXN1bHRzIG9uIGluaXQgKGxpa2Ugc2FmYXJpIG9uIElwYWQyKS5cbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICByZWxvYWQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDcmFmdHkuRE9NLndpbmRvdy5pbml0KCk7XG4gICAgICAgICAgICB2YXIgdyA9IENyYWZ0eS5ET00ud2luZG93LndpZHRoLFxuICAgICAgICAgICAgICAgIGggPSBDcmFmdHkuRE9NLndpbmRvdy5oZWlnaHQsXG4gICAgICAgICAgICAgICAgb2Zmc2V0O1xuXG5cbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3RhZ2UuZnVsbHNjcmVlbikge1xuICAgICAgICAgICAgICAgIHRoaXMud2lkdGggPSB3O1xuICAgICAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gaDtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5zdHlsZS53aWR0aCA9IHcgKyBcInB4XCI7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0uc3R5bGUuaGVpZ2h0ID0gaCArIFwicHhcIjtcblxuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkuY2FudmFzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmNhbnZhcy5fY2FudmFzLndpZHRoID0gdztcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmNhbnZhcy5fY2FudmFzLmhlaWdodCA9IGg7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvZmZzZXQgPSBDcmFmdHkuRE9NLmlubmVyKENyYWZ0eS5zdGFnZS5lbGVtKTtcbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZS54ID0gb2Zmc2V0Lng7XG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UueSA9IG9mZnNldC55O1xuICAgICAgICB9LFxuXHRcdFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LnZpZXdwb3J0LnJlc2V0XG5cdFx0ICogQGNvbXAgQ3JhZnR5LnN0YWdlXG5cdFx0ICpcblx0XHQgKiBAc2lnbiBwdWJsaWMgQ3JhZnR5LnZpZXdwb3J0LnJlc2V0KClcblx0XHQgKlxuXHRcdCAqIFJlc2V0cyB0aGUgdmlld3BvcnQgdG8gc3RhcnRpbmcgdmFsdWVzXG5cdFx0ICogQ2FsbGVkIHdoZW4gc2NlbmUoKSBpcyBydW4uXG5cdFx0ICovXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdENyYWZ0eS52aWV3cG9ydC5wYW4oJ3Jlc2V0Jyk7XG5cdFx0XHRDcmFmdHkudmlld3BvcnQuZm9sbG93KCk7XG5cdFx0XHRDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKCdzdG9wJyk7XG5cdFx0XHRDcmFmdHkudmlld3BvcnQuc2NhbGUoKTtcblx0XHR9XG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkua2V5c1xuICAgICogQGNhdGVnb3J5IElucHV0XG4gICAgKiBPYmplY3Qgb2Yga2V5IG5hbWVzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBrZXkgY29kZS5cbiAgICAqIFxuICAgICogfn5+XG4gICAgKiBCQUNLU1BBQ0U6IDgsXG4gICAgKiBUQUI6IDksXG4gICAgKiBFTlRFUjogMTMsXG4gICAgKiBQQVVTRTogMTksXG4gICAgKiBDQVBTOiAyMCxcbiAgICAqIEVTQzogMjcsXG4gICAgKiBTUEFDRTogMzIsXG4gICAgKiBQQUdFX1VQOiAzMyxcbiAgICAqIFBBR0VfRE9XTjogMzQsXG4gICAgKiBFTkQ6IDM1LFxuICAgICogSE9NRTogMzYsXG4gICAgKiBMRUZUX0FSUk9XOiAzNyxcbiAgICAqIFVQX0FSUk9XOiAzOCxcbiAgICAqIFJJR0hUX0FSUk9XOiAzOSxcbiAgICAqIERPV05fQVJST1c6IDQwLFxuICAgICogSU5TRVJUOiA0NSxcbiAgICAqIERFTEVURTogNDYsXG4gICAgKiAwOiA0OCxcbiAgICAqIDE6IDQ5LFxuICAgICogMjogNTAsXG4gICAgKiAzOiA1MSxcbiAgICAqIDQ6IDUyLFxuICAgICogNTogNTMsXG4gICAgKiA2OiA1NCxcbiAgICAqIDc6IDU1LFxuICAgICogODogNTYsXG4gICAgKiA5OiA1NyxcbiAgICAqIEE6IDY1LFxuICAgICogQjogNjYsXG4gICAgKiBDOiA2NyxcbiAgICAqIEQ6IDY4LFxuICAgICogRTogNjksXG4gICAgKiBGOiA3MCxcbiAgICAqIEc6IDcxLFxuICAgICogSDogNzIsXG4gICAgKiBJOiA3MyxcbiAgICAqIEo6IDc0LFxuICAgICogSzogNzUsXG4gICAgKiBMOiA3NixcbiAgICAqIE06IDc3LFxuICAgICogTjogNzgsXG4gICAgKiBPOiA3OSxcbiAgICAqIFA6IDgwLFxuICAgICogUTogODEsXG4gICAgKiBSOiA4MixcbiAgICAqIFM6IDgzLFxuICAgICogVDogODQsXG4gICAgKiBVOiA4NSxcbiAgICAqIFY6IDg2LFxuICAgICogVzogODcsXG4gICAgKiBYOiA4OCxcbiAgICAqIFk6IDg5LFxuICAgICogWjogOTAsXG4gICAgKiBOVU1QQURfMDogOTYsXG4gICAgKiBOVU1QQURfMTogOTcsXG4gICAgKiBOVU1QQURfMjogOTgsXG4gICAgKiBOVU1QQURfMzogOTksXG4gICAgKiBOVU1QQURfNDogMTAwLFxuICAgICogTlVNUEFEXzU6IDEwMSxcbiAgICAqIE5VTVBBRF82OiAxMDIsXG4gICAgKiBOVU1QQURfNzogMTAzLFxuICAgICogTlVNUEFEXzg6IDEwNCxcbiAgICAqIE5VTVBBRF85OiAxMDUsXG4gICAgKiBNVUxUSVBMWTogMTA2LFxuICAgICogQUREOiAxMDcsXG4gICAgKiBTVUJTVFJBQ1Q6IDEwOSxcbiAgICAqIERFQ0lNQUw6IDExMCxcbiAgICAqIERJVklERTogMTExLFxuICAgICogRjE6IDExMixcbiAgICAqIEYyOiAxMTMsXG4gICAgKiBGMzogMTE0LFxuICAgICogRjQ6IDExNSxcbiAgICAqIEY1OiAxMTYsXG4gICAgKiBGNjogMTE3LFxuICAgICogRjc6IDExOCxcbiAgICAqIEY4OiAxMTksXG4gICAgKiBGOTogMTIwLFxuICAgICogRjEwOiAxMjEsXG4gICAgKiBGMTE6IDEyMixcbiAgICAqIEYxMjogMTIzLFxuICAgICogU0hJRlQ6IDE2LFxuICAgICogQ1RSTDogMTcsXG4gICAgKiBBTFQ6IDE4LFxuICAgICogUExVUzogMTg3LFxuICAgICogQ09NTUE6IDE4OCxcbiAgICAqIE1JTlVTOiAxODksXG4gICAgKiBQRVJJT0Q6IDE5MCxcbiAgICAqIFBVTFRfVVA6IDI5NDYwLFxuICAgICogUFVMVF9ET1dOOiAyOTQ2MSxcbiAgICAqIFBVTFRfTEVGVDogNCxcbiAgICAqIFBVTFRfUklHSFQnOiA1XG4gICAgKiB+fn5cbiAgICAqL1xuICAgIGtleXM6IHtcbiAgICAgICAgJ0JBQ0tTUEFDRSc6IDgsXG4gICAgICAgICdUQUInOiA5LFxuICAgICAgICAnRU5URVInOiAxMyxcbiAgICAgICAgJ1BBVVNFJzogMTksXG4gICAgICAgICdDQVBTJzogMjAsXG4gICAgICAgICdFU0MnOiAyNyxcbiAgICAgICAgJ1NQQUNFJzogMzIsXG4gICAgICAgICdQQUdFX1VQJzogMzMsXG4gICAgICAgICdQQUdFX0RPV04nOiAzNCxcbiAgICAgICAgJ0VORCc6IDM1LFxuICAgICAgICAnSE9NRSc6IDM2LFxuICAgICAgICAnTEVGVF9BUlJPVyc6IDM3LFxuICAgICAgICAnVVBfQVJST1cnOiAzOCxcbiAgICAgICAgJ1JJR0hUX0FSUk9XJzogMzksXG4gICAgICAgICdET1dOX0FSUk9XJzogNDAsXG4gICAgICAgICdJTlNFUlQnOiA0NSxcbiAgICAgICAgJ0RFTEVURSc6IDQ2LFxuICAgICAgICAnMCc6IDQ4LFxuICAgICAgICAnMSc6IDQ5LFxuICAgICAgICAnMic6IDUwLFxuICAgICAgICAnMyc6IDUxLFxuICAgICAgICAnNCc6IDUyLFxuICAgICAgICAnNSc6IDUzLFxuICAgICAgICAnNic6IDU0LFxuICAgICAgICAnNyc6IDU1LFxuICAgICAgICAnOCc6IDU2LFxuICAgICAgICAnOSc6IDU3LFxuICAgICAgICAnQSc6IDY1LFxuICAgICAgICAnQic6IDY2LFxuICAgICAgICAnQyc6IDY3LFxuICAgICAgICAnRCc6IDY4LFxuICAgICAgICAnRSc6IDY5LFxuICAgICAgICAnRic6IDcwLFxuICAgICAgICAnRyc6IDcxLFxuICAgICAgICAnSCc6IDcyLFxuICAgICAgICAnSSc6IDczLFxuICAgICAgICAnSic6IDc0LFxuICAgICAgICAnSyc6IDc1LFxuICAgICAgICAnTCc6IDc2LFxuICAgICAgICAnTSc6IDc3LFxuICAgICAgICAnTic6IDc4LFxuICAgICAgICAnTyc6IDc5LFxuICAgICAgICAnUCc6IDgwLFxuICAgICAgICAnUSc6IDgxLFxuICAgICAgICAnUic6IDgyLFxuICAgICAgICAnUyc6IDgzLFxuICAgICAgICAnVCc6IDg0LFxuICAgICAgICAnVSc6IDg1LFxuICAgICAgICAnVic6IDg2LFxuICAgICAgICAnVyc6IDg3LFxuICAgICAgICAnWCc6IDg4LFxuICAgICAgICAnWSc6IDg5LFxuICAgICAgICAnWic6IDkwLFxuICAgICAgICAnTlVNUEFEXzAnOiA5NixcbiAgICAgICAgJ05VTVBBRF8xJzogOTcsXG4gICAgICAgICdOVU1QQURfMic6IDk4LFxuICAgICAgICAnTlVNUEFEXzMnOiA5OSxcbiAgICAgICAgJ05VTVBBRF80JzogMTAwLFxuICAgICAgICAnTlVNUEFEXzUnOiAxMDEsXG4gICAgICAgICdOVU1QQURfNic6IDEwMixcbiAgICAgICAgJ05VTVBBRF83JzogMTAzLFxuICAgICAgICAnTlVNUEFEXzgnOiAxMDQsXG4gICAgICAgICdOVU1QQURfOSc6IDEwNSxcbiAgICAgICAgJ01VTFRJUExZJzogMTA2LFxuICAgICAgICAnQUREJzogMTA3LFxuICAgICAgICAnU1VCU1RSQUNUJzogMTA5LFxuICAgICAgICAnREVDSU1BTCc6IDExMCxcbiAgICAgICAgJ0RJVklERSc6IDExMSxcbiAgICAgICAgJ0YxJzogMTEyLFxuICAgICAgICAnRjInOiAxMTMsXG4gICAgICAgICdGMyc6IDExNCxcbiAgICAgICAgJ0Y0JzogMTE1LFxuICAgICAgICAnRjUnOiAxMTYsXG4gICAgICAgICdGNic6IDExNyxcbiAgICAgICAgJ0Y3JzogMTE4LFxuICAgICAgICAnRjgnOiAxMTksXG4gICAgICAgICdGOSc6IDEyMCxcbiAgICAgICAgJ0YxMCc6IDEyMSxcbiAgICAgICAgJ0YxMSc6IDEyMixcbiAgICAgICAgJ0YxMic6IDEyMyxcbiAgICAgICAgJ1NISUZUJzogMTYsXG4gICAgICAgICdDVFJMJzogMTcsXG4gICAgICAgICdBTFQnOiAxOCxcbiAgICAgICAgJ1BMVVMnOiAxODcsXG4gICAgICAgICdDT01NQSc6IDE4OCxcbiAgICAgICAgJ01JTlVTJzogMTg5LFxuICAgICAgICAnUEVSSU9EJzogMTkwLFxuICAgICAgICAnUFVMVF9VUCc6IDI5NDYwLFxuICAgICAgICAnUFVMVF9ET1dOJzogMjk0NjEsXG4gICAgICAgICdQVUxUX0xFRlQnOiA0LFxuICAgICAgICAnUFVMVF9SSUdIVCc6IDVcblxuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5Lm1vdXNlQnV0dG9uc1xuICAgICogQGNhdGVnb3J5IElucHV0XG4gICAgKiBPYmplY3Qgb2YgbW91c2VCdXR0b24gbmFtZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGJ1dHRvbiBJRC5cbiAgICAqIEluIGFsbCBtb3VzZUV2ZW50cyB3ZSBhZGQgdGhlIGUubW91c2VCdXR0b24gcHJvcGVydHkgd2l0aCBhIHZhbHVlIG5vcm1hbGl6ZWQgdG8gbWF0Y2ggZS5idXR0b24gb2YgbW9kZXJuIHdlYmtpdFxuICAgICogXG4gICAgKiB+fn5cbiAgICAqIExFRlQ6IDAsXG4gICAgKiBNSURETEU6IDEsXG4gICAgKiBSSUdIVDogMlxuICAgICogfn5+XG4gICAgKi9cbiAgICBtb3VzZUJ1dHRvbnM6IHtcbiAgICAgICAgTEVGVDogMCxcbiAgICAgICAgTUlERExFOiAxLFxuICAgICAgICBSSUdIVDogMlxuICAgIH1cbn0pO1xuXG5cblxuLyoqXG4qIEVudGl0eSBmaXhlcyB0aGUgbGFjayBvZiBzZXR0ZXIgc3VwcG9ydFxuKi9cbkNyYWZ0eS5jKFwidmlld3BvcnRcIiwge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnZpZXdwb3J0Ll94ICE9PSBDcmFmdHkudmlld3BvcnQueCkge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoJ194JywgQ3JhZnR5LnZpZXdwb3J0LngpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQ3JhZnR5LnZpZXdwb3J0Ll95ICE9PSBDcmFmdHkudmlld3BvcnQueSkge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoJ195JywgQ3JhZnR5LnZpZXdwb3J0LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuQ3JhZnR5LmV4dGVuZCh7XG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5kZXZpY2VcbiAgICAqIEBjYXRlZ29yeSBNaXNjXG4gICAgKi9cbiAgICBkZXZpY2UgOiB7XG4gICAgICAgIF9kZXZpY2VPcmllbnRhdGlvbkNhbGxiYWNrIDogZmFsc2UsXG4gICAgICAgIF9kZXZpY2VNb3Rpb25DYWxsYmFjayA6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAqIFRoZSBIVE1MNSBEZXZpY2VPcmllbnRhdGlvbiBldmVudCByZXR1cm5zIHRocmVlIHBpZWNlcyBvZiBkYXRhOlxuICAgICAgICAqICAqIGFscGhhIHRoZSBkaXJlY3Rpb24gdGhlIGRldmljZSBpcyBmYWNpbmcgYWNjb3JkaW5nIHRvIHRoZSBjb21wYXNzXG4gICAgICAgICogICogYmV0YSB0aGUgYW5nbGUgaW4gZGVncmVlcyB0aGUgZGV2aWNlIGlzIHRpbHRlZCBmcm9udC10by1iYWNrXG4gICAgICAgICogICogZ2FtbWEgdGhlIGFuZ2xlIGluIGRlZ3JlZXMgdGhlIGRldmljZSBpcyB0aWx0ZWQgbGVmdC10by1yaWdodC5cbiAgICAgICAgKiAgKiBUaGUgYW5nbGVzIHZhbHVlcyBpbmNyZWFzZSBhcyB5b3UgdGlsdCB0aGUgZGV2aWNlIHRvIHRoZSByaWdodCBvciB0b3dhcmRzIHlvdS5cbiAgICAgICAgKlxuICAgICAgICAqIFNpbmNlIEZpcmVmb3ggdXNlcyB0aGUgTW96T3JpZW50YXRpb25FdmVudCB3aGljaCByZXR1cm5zIHNpbWlsYXIgZGF0YSBidXRcbiAgICAgICAgKiB1c2luZyBkaWZmZXJlbnQgcGFyYW1ldGVycyBhbmQgYSBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgc3lzdGVtLCB3ZSB3YW50IHRvXG4gICAgICAgICogbm9ybWFsaXplIHRoYXQgYmVmb3JlIHdlIHBhc3MgaXQgdG8gb3VyIF9kZXZpY2VPcmllbnRhdGlvbkNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAqXG4gICAgICAgICogQHBhcmFtIGV2ZW50RGF0YSBIVE1MNSBEZXZpY2VPcmllbnRhdGlvbiBldmVudFxuICAgICAgICAqL1xuICAgICAgICBfbm9ybWFsaXplRGV2aWNlT3JpZW50YXRpb24gOiBmdW5jdGlvbihldmVudERhdGEpIHtcbiAgICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgICAgaWYgKHdpbmRvdy5EZXZpY2VPcmllbnRhdGlvbkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2FtbWEgaXMgdGhlIGxlZnQtdG8tcmlnaHQgdGlsdCBpbiBkZWdyZWVzLCB3aGVyZSByaWdodCBpcyBwb3NpdGl2ZVxuICAgICAgICAgICAgICAgICAgICAndGlsdExSJyAgICA6ICAgIGV2ZW50RGF0YS5nYW1tYSxcbiAgICAgICAgICAgICAgICAgICAgLy8gYmV0YSBpcyB0aGUgZnJvbnQtdG8tYmFjayB0aWx0IGluIGRlZ3JlZXMsIHdoZXJlIGZyb250IGlzIHBvc2l0aXZlXG4gICAgICAgICAgICAgICAgICAgICd0aWx0RkInICAgIDogICAgIGV2ZW50RGF0YS5iZXRhLFxuICAgICAgICAgICAgICAgICAgICAvLyBhbHBoYSBpcyB0aGUgY29tcGFzcyBkaXJlY3Rpb24gdGhlIGRldmljZSBpcyBmYWNpbmcgaW4gZGVncmVlc1xuICAgICAgICAgICAgICAgICAgICAnZGlyJyAgICAgICAgIDogICAgIGV2ZW50RGF0YS5hbHBoYSxcbiAgICAgICAgICAgICAgICAgICAgLy8gZGV2aWNlb3JpZW50YXRpb24gZG9lcyBub3QgcHJvdmlkZSB0aGlzIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgJ21vdFVEJyAgICAgOiAgICAgbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93Lk9yaWVudGF0aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAvLyB4IGlzIHRoZSBsZWZ0LXRvLXJpZ2h0IHRpbHQgZnJvbSAtMSB0byArMSwgc28gd2UgbmVlZCB0byBjb252ZXJ0IHRvIGRlZ3JlZXNcbiAgICAgICAgICAgICAgICAgICAgJ3RpbHRMUicgICAgOiAgICBldmVudERhdGEueCAqIDkwLFxuICAgICAgICAgICAgICAgICAgICAvLyB5IGlzIHRoZSBmcm9udC10by1iYWNrIHRpbHQgZnJvbSAtMSB0byArMSwgc28gd2UgbmVlZCB0byBjb252ZXJ0IHRvIGRlZ3JlZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgYWxzbyBuZWVkIHRvIGludmVydCB0aGUgdmFsdWUgc28gdGlsdGluZyB0aGUgZGV2aWNlIHRvd2FyZHMgdXMgKGZvcndhcmQpXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlc3VsdHMgaW4gYSBwb3NpdGl2ZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgJ3RpbHRGQicgICAgOiAgICAgZXZlbnREYXRhLnkgKiAtOTAsXG4gICAgICAgICAgICAgICAgICAgIC8vIE1vek9yaWVudGF0aW9uIGRvZXMgbm90IHByb3ZpZGUgdGhpcyBkYXRhXG4gICAgICAgICAgICAgICAgICAgICdkaXInICAgICAgICAgOiAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgLy8geiBpcyB0aGUgdmVydGljYWwgYWNjZWxlcmF0aW9uIG9mIHRoZSBkZXZpY2VcbiAgICAgICAgICAgICAgICAgICAgJ21vdFVEJyAgICAgOiAgICAgZXZlbnREYXRhLnpcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENyYWZ0eS5kZXZpY2UuX2RldmljZU9yaWVudGF0aW9uQ2FsbGJhY2soZGF0YSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICogQHBhcmFtIGV2ZW50RGF0YSBIVE1MNSBEZXZpY2VNb3Rpb24gZXZlbnRcbiAgICAgICAgKi9cbiAgICAgICAgX25vcm1hbGl6ZURldmljZU1vdGlvbiA6IGZ1bmN0aW9uKGV2ZW50RGF0YSkge1xuICAgICAgICAgICAgdmFyIGFjY2VsZXJhdGlvbiAgICA9IGV2ZW50RGF0YS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LFxuICAgICAgICAgICAgICAgIGZhY2luZ1VwICAgICAgICA9IChhY2NlbGVyYXRpb24ueiA+IDApID8gKzEgOiAtMTtcblxuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgLy8gR3JhYiB0aGUgYWNjZWxlcmF0aW9uIGluY2x1ZGluZyBncmF2aXR5IGZyb20gdGhlIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAnYWNjZWxlcmF0aW9uJyA6IGFjY2VsZXJhdGlvbixcbiAgICAgICAgICAgICAgICAncmF3QWNjZWxlcmF0aW9uJyA6IFwiW1wiKyAgTWF0aC5yb3VuZChhY2NlbGVyYXRpb24ueCkgK1wiLCBcIitNYXRoLnJvdW5kKGFjY2VsZXJhdGlvbi55KSArIFwiLCBcIiArIE1hdGgucm91bmQoYWNjZWxlcmF0aW9uLnopICsgXCJdXCIsXG4gICAgICAgICAgICAgICAgLy8gWiBpcyB0aGUgYWNjZWxlcmF0aW9uIGluIHRoZSBaIGF4aXMsIGFuZCBpZiB0aGUgZGV2aWNlIGlzIGZhY2luZyB1cCBvciBkb3duXG4gICAgICAgICAgICAgICAgJ2ZhY2luZ1VwJyA6IGZhY2luZ1VwLFxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIHZhbHVlIGZyb20gYWNjZWxlcmF0aW9uIHRvIGRlZ3JlZXMgYWNjZWxlcmF0aW9uLnh8eSBpcyB0aGVcbiAgICAgICAgICAgICAgICAvLyBhY2NlbGVyYXRpb24gYWNjb3JkaW5nIHRvIGdyYXZpdHksIHdlJ2xsIGFzc3VtZSB3ZSdyZSBvbiBFYXJ0aCBhbmQgZGl2aWRlXG4gICAgICAgICAgICAgICAgLy8gYnkgOS44MSAoZWFydGggZ3Jhdml0eSkgdG8gZ2V0IGEgcGVyY2VudGFnZSB2YWx1ZSwgYW5kIHRoZW4gbXVsdGlwbHkgdGhhdFxuICAgICAgICAgICAgICAgIC8vIGJ5IDkwIHRvIGNvbnZlcnQgdG8gZGVncmVlcy5cbiAgICAgICAgICAgICAgICAndGlsdExSJyA6IE1hdGgucm91bmQoKChhY2NlbGVyYXRpb24ueCkgLyA5LjgxKSAqIC05MCksXG4gICAgICAgICAgICAgICAgJ3RpbHRGQicgOiBNYXRoLnJvdW5kKCgoYWNjZWxlcmF0aW9uLnkgKyA5LjgxKSAvIDkuODEpICogOTAgKiBmYWNpbmdVcClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENyYWZ0eS5kZXZpY2UuX2RldmljZU1vdGlvbkNhbGxiYWNrKGRhdGEpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmRldmljZS5kZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAqIEBjb21wIENyYWZ0eS5kZXZpY2VcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgQ3JhZnR5LmRldmljZS5kZXZpY2VPcmllbnRhdGlvbihGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsYmFjayBtZXRob2QgZXhlY3V0ZWQgb25jZSBhcyBzb29uIGFzIGRldmljZSBvcmllbnRhdGlvbiBpcyBjaGFuZ2VcbiAgICAgICAgKlxuICAgICAgICAqIERvIHNvbWV0aGluZyB3aXRoIG5vcm1hbGl6ZWQgZGV2aWNlIG9yaWVudGF0aW9uIGRhdGE6XG4gICAgICAgICogfn5+XG4gICAgICAgICoge1xuICAgICAgICAqICAgJ3RpbHRMUicgICAgOiAgICdnYW1tYSB0aGUgYW5nbGUgaW4gZGVncmVlcyB0aGUgZGV2aWNlIGlzIHRpbHRlZCBsZWZ0LXRvLXJpZ2h0LicsXG4gICAgICAgICogICAndGlsdEZCJyAgICA6ICAgJ2JldGEgdGhlIGFuZ2xlIGluIGRlZ3JlZXMgdGhlIGRldmljZSBpcyB0aWx0ZWQgZnJvbnQtdG8tYmFjaycsXG4gICAgICAgICogICAnZGlyJyAgICAgICA6ICAgJ2FscGhhIHRoZSBkaXJlY3Rpb24gdGhlIGRldmljZSBpcyBmYWNpbmcgYWNjb3JkaW5nIHRvIHRoZSBjb21wYXNzJyxcbiAgICAgICAgKiAgICdtb3RVRCcgICAgIDogICAnVGhlIGFuZ2xlcyB2YWx1ZXMgaW5jcmVhc2UgYXMgeW91IHRpbHQgdGhlIGRldmljZSB0byB0aGUgcmlnaHQgb3IgdG93YXJkcyB5b3UuJ1xuICAgICAgICAqIH1cbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogLy8gR2V0IERldmljZU9yaWVudGF0aW9uIGV2ZW50IG5vcm1hbGl6ZWQgZGF0YS5cbiAgICAgICAgKiBDcmFmdHkuZGV2aWNlLmRldmljZU9yaWVudGF0aW9uKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAqICAgICBjb25zb2xlLmxvZygnZGF0YS50aWx0TFIgOiAnK01hdGgucm91bmQoZGF0YS50aWx0TFIpKycsIGRhdGEudGlsdEZCIDogJytNYXRoLnJvdW5kKGRhdGEudGlsdEZCKSsnLCBkYXRhLmRpciA6ICcrTWF0aC5yb3VuZChkYXRhLmRpcikrJywgZGF0YS5tb3RVRCA6ICcrZGF0YS5tb3RVRCsnJyk7XG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBTZWUgYnJvd3NlciBzdXBwb3J0IGF0IGh0dHA6Ly9jYW5pdXNlLmNvbS8jc2VhcmNoPWRldmljZSBvcmllbnRhdGlvbi5cbiAgICAgICAgKi9cbiAgICAgICAgZGV2aWNlT3JpZW50YXRpb24gOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICB0aGlzLl9kZXZpY2VPcmllbnRhdGlvbkNhbGxiYWNrID0gZnVuYztcbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3VwcG9ydC5kZXZpY2VvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICh3aW5kb3cuRGV2aWNlT3JpZW50YXRpb25FdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIHRoZSBkZXZpY2VvcmllbnRhdGlvbiBldmVudCBhbmQgaGFuZGxlIERldmljZU9yaWVudGF0aW9uRXZlbnQgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csICdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMuX25vcm1hbGl6ZURldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5PcmllbnRhdGlvbkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgdGhlIE1vek9yaWVudGF0aW9uIGV2ZW50IGFuZCBoYW5kbGUgT3JpZW50YXRpb25EYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCAnTW96T3JpZW50YXRpb24nLCB0aGlzLl9ub3JtYWxpemVEZXZpY2VPcmllbnRhdGlvbilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZGV2aWNlLmRldmljZU1vdGlvblxuICAgICAgICAqIEBjb21wIENyYWZ0eS5kZXZpY2VcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgQ3JhZnR5LmRldmljZS5kZXZpY2VNb3Rpb24oRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGJhY2sgbWV0aG9kIGV4ZWN1dGVkIG9uY2UgYXMgc29vbiBhcyBkZXZpY2UgbW90aW9uIGlzIGNoYW5nZVxuICAgICAgICAqXG4gICAgICAgICogRG8gc29tZXRoaW5nIHdpdGggbm9ybWFsaXplZCBkZXZpY2UgbW90aW9uIGRhdGE6XG4gICAgICAgICogfn5+XG4gICAgICAgICoge1xuICAgICAgICAqICAgICAnYWNjZWxlcmF0aW9uJyA6ICcgR3JhYiB0aGUgYWNjZWxlcmF0aW9uIGluY2x1ZGluZyBncmF2aXR5IGZyb20gdGhlIHJlc3VsdHMnLFxuICAgICAgICAqICAgICAncmF3QWNjZWxlcmF0aW9uJyA6ICdEaXNwbGF5IHRoZSByYXcgYWNjZWxlcmF0aW9uIGRhdGEnLFxuICAgICAgICAqICAgICAnZmFjaW5nVXAnIDogJ1ogaXMgdGhlIGFjY2VsZXJhdGlvbiBpbiB0aGUgWiBheGlzLCBhbmQgaWYgdGhlIGRldmljZSBpcyBmYWNpbmcgdXAgb3IgZG93bicsXG4gICAgICAgICogICAgICd0aWx0TFInIDogJ0NvbnZlcnQgdGhlIHZhbHVlIGZyb20gYWNjZWxlcmF0aW9uIHRvIGRlZ3JlZXMuIGFjY2VsZXJhdGlvbi54IGlzIHRoZSBhY2NlbGVyYXRpb24gYWNjb3JkaW5nIHRvIGdyYXZpdHksIHdlJ2xsIGFzc3VtZSB3ZSdyZSBvbiBFYXJ0aCBhbmQgZGl2aWRlIGJ5IDkuODEgKGVhcnRoIGdyYXZpdHkpIHRvIGdldCBhIHBlcmNlbnRhZ2UgdmFsdWUsIGFuZCB0aGVuIG11bHRpcGx5IHRoYXQgYnkgOTAgdG8gY29udmVydCB0byBkZWdyZWVzLicsXG4gICAgICAgICogICAgICd0aWx0RkInIDogJ0NvbnZlcnQgdGhlIHZhbHVlIGZyb20gYWNjZWxlcmF0aW9uIHRvIGRlZ3JlZXMuJ1xuICAgICAgICAqIH1cbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogLy8gR2V0IERldmljZU1vdGlvbiBldmVudCBub3JtYWxpemVkIGRhdGEuXG4gICAgICAgICogQ3JhZnR5LmRldmljZS5kZXZpY2VNb3Rpb24oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICogICAgIGNvbnNvbGUubG9nKCdkYXRhLm1vQWNjZWwgOiAnK2RhdGEucmF3QWNjZWxlcmF0aW9uKycsIGRhdGEubW9DYWxjVGlsdExSIDogJytNYXRoLnJvdW5kKGRhdGEudGlsdExSKSsnLCBkYXRhLm1vQ2FsY1RpbHRGQiA6ICcrTWF0aC5yb3VuZChkYXRhLnRpbHRGQikrJycpO1xuICAgICAgICAqIH0pO1xuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogU2VlIGJyb3dzZXIgc3VwcG9ydCBhdCBodHRwOi8vY2FuaXVzZS5jb20vI3NlYXJjaD1tb3Rpb24uXG4gICAgICAgICovXG4gICAgICAgIGRldmljZU1vdGlvbiA6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIHRoaXMuX2RldmljZU1vdGlvbkNhbGxiYWNrID0gZnVuYztcbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3VwcG9ydC5kZXZpY2Vtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAod2luZG93LkRldmljZU1vdGlvbkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgdGhlIGRldmljZW1vdGlvbiBldmVudCBhbmQgaGFuZGxlIERldmljZU1vdGlvbkV2ZW50IG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCAnZGV2aWNlbW90aW9uJywgdGhpcy5fbm9ybWFsaXplRGV2aWNlTW90aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLyoqQFxuKiAjU3ByaXRlXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBzcHJpdGVzIGNoYW5nZVxuKiBDb21wb25lbnQgZm9yIHVzaW5nIHRpbGVzIGluIGEgc3ByaXRlIG1hcC5cbiovXG5DcmFmdHkuYyhcIlNwcml0ZVwiLCB7XG5cdF9faW1hZ2U6ICcnLFxuXHQvKlxuXHQqICMuX190aWxlXG5cdCogQGNvbXAgU3ByaXRlXG5cdCpcblx0KiBIb3Jpem9udGFsIHNwcml0ZSB0aWxlIHNpemUuXG5cdCovXG5cdF9fdGlsZTogMCxcblx0Lypcblx0KiAjLl9fdGlsZWhcblx0KiBAY29tcCBTcHJpdGVcblx0KlxuXHQqIFZlcnRpY2FsIHNwcml0ZSB0aWxlIHNpemUuXG5cdCovXG5cdF9fdGlsZWg6IDAsXG5cdF9fcGFkZGluZzogbnVsbCxcblx0X190cmltOiBudWxsLFxuXHRpbWc6IG51bGwsXG5cdC8vcmVhZHkgaXMgY2hhbmdlZCB0byB0cnVlIGluIENyYWZ0eS5zcHJpdGVcblx0cmVhZHk6IGZhbHNlLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9fdHJpbSA9IFswLCAwLCAwLCAwXTtcblxuXHRcdHZhciBkcmF3ID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBjbyA9IGUuY28sXG5cdFx0XHRcdHBvcyA9IGUucG9zLFxuXHRcdFx0XHRjb250ZXh0ID0gZS5jdHg7XG5cblx0XHRcdGlmIChlLnR5cGUgPT09IFwiY2FudmFzXCIpIHtcblx0XHRcdFx0Ly9kcmF3IHRoZSBpbWFnZSBvbiB0aGUgY2FudmFzIGVsZW1lbnRcblx0XHRcdFx0Y29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWcsIC8vaW1hZ2UgZWxlbWVudFxuXHRcdFx0XHRcdFx0XHRcdCBjby54LCAvL3ggcG9zaXRpb24gb24gc3ByaXRlXG5cdFx0XHRcdFx0XHRcdFx0IGNvLnksIC8veSBwb3NpdGlvbiBvbiBzcHJpdGVcblx0XHRcdFx0XHRcdFx0XHQgY28udywgLy93aWR0aCBvbiBzcHJpdGVcblx0XHRcdFx0XHRcdFx0XHQgY28uaCwgLy9oZWlnaHQgb24gc3ByaXRlXG5cdFx0XHRcdFx0XHRcdFx0IHBvcy5feCwgLy94IHBvc2l0aW9uIG9uIGNhbnZhc1xuXHRcdFx0XHRcdFx0XHRcdCBwb3MuX3ksIC8veSBwb3NpdGlvbiBvbiBjYW52YXNcblx0XHRcdFx0XHRcdFx0XHQgcG9zLl93LCAvL3dpZHRoIG9uIGNhbnZhc1xuXHRcdFx0XHRcdFx0XHRcdCBwb3MuX2ggLy9oZWlnaHQgb24gY2FudmFzXG5cdFx0XHRcdCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gXCJET01cIikge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLmJhY2tncm91bmQgPSBcInVybCgnXCIgKyB0aGlzLl9faW1hZ2UgKyBcIicpIG5vLXJlcGVhdCAtXCIgKyBjby54ICsgXCJweCAtXCIgKyBjby55ICsgXCJweFwiO1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLmJhY2tncm91bmRTaXplID0gJ2NvdmVyJztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5iaW5kKFwiRHJhd1wiLCBkcmF3KS5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWYgKGlkID09PSBcIlNwcml0ZVwiKSB0aGlzLnVuYmluZChcIkRyYXdcIiwgZHJhdyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc3ByaXRlXG5cdCogQGNvbXAgU3ByaXRlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnNwcml0ZShOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIFggY2VsbCBwb3NpdGlvblxuXHQqIEBwYXJhbSB5IC0gWSBjZWxsIHBvc2l0aW9uXG5cdCogQHBhcmFtIHcgLSBXaWR0aCBpbiBjZWxsc1xuXHQqIEBwYXJhbSBoIC0gSGVpZ2h0IGluIGNlbGxzXG5cdCogXG5cdCogVXNlcyBhIG5ldyBsb2NhdGlvbiBvbiB0aGUgc3ByaXRlIG1hcCBhcyBpdHMgc3ByaXRlLlxuXHQqXG5cdCogVmFsdWVzIHNob3VsZCBiZSBpbiB0aWxlcyBvciBjZWxscyAobm90IHBpeGVscykuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgU3ByaXRlXCIpXG5cdCogXHQuc3ByaXRlKDAsIDAsIDIsIDIpO1xuXHQqIH5+flxuXHQqL1xuXG5cdC8qKkBcblx0KiAjLl9fY29vcmRcblx0KiBAY29tcCBTcHJpdGVcblx0KlxuXHQqIFRoZSBjb29yZGluYXRlIG9mIHRoZSBzbGlkZSB3aXRoaW4gdGhlIHNwcml0ZSBpbiB0aGUgZm9ybWF0IG9mIFt4LCB5LCB3LCBoXS5cblx0Ki9cblx0c3ByaXRlOiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdHRoaXMuX19jb29yZCA9IFt4ICogdGhpcy5fX3RpbGUgKyB0aGlzLl9fcGFkZGluZ1swXSArIHRoaXMuX190cmltWzBdLFxuXHRcdFx0XHRcdFx0eSAqIHRoaXMuX190aWxlaCArIHRoaXMuX19wYWRkaW5nWzFdICsgdGhpcy5fX3RyaW1bMV0sXG5cdFx0XHRcdFx0XHR0aGlzLl9fdHJpbVsyXSB8fCB3ICogdGhpcy5fX3RpbGUgfHwgdGhpcy5fX3RpbGUsXG5cdFx0XHRcdFx0XHR0aGlzLl9fdHJpbVszXSB8fCBoICogdGhpcy5fX3RpbGVoIHx8IHRoaXMuX190aWxlaF07XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuY3JvcFxuXHQqIEBjb21wIFNwcml0ZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5jcm9wKE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gT2Zmc2V0IHggcG9zaXRpb25cblx0KiBAcGFyYW0geSAtIE9mZnNldCB5IHBvc2l0aW9uXG5cdCogQHBhcmFtIHcgLSBOZXcgd2lkdGhcblx0KiBAcGFyYW0gaCAtIE5ldyBoZWlnaHRcblx0KiBcblx0KiBJZiB0aGUgZW50aXR5IG5lZWRzIHRvIGJlIHNtYWxsZXIgdGhhbiB0aGUgdGlsZSBzaXplLCB1c2UgdGhpcyBtZXRob2QgdG8gY3JvcCBpdC5cblx0KlxuXHQqIFRoZSB2YWx1ZXMgc2hvdWxkIGJlIGluIHBpeGVscyByYXRoZXIgdGhhbiB0aWxlcy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBTcHJpdGVcIilcblx0KiBcdC5jcm9wKDQwLCA0MCwgMjIsIDIzKTtcblx0KiB+fn5cblx0Ki9cblx0Y3JvcDogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHR2YXIgb2xkID0gdGhpcy5fbWJyIHx8IHRoaXMucG9zKCk7XG5cdFx0dGhpcy5fX3RyaW0gPSBbXTtcblx0XHR0aGlzLl9fdHJpbVswXSA9IHg7XG5cdFx0dGhpcy5fX3RyaW1bMV0gPSB5O1xuXHRcdHRoaXMuX190cmltWzJdID0gdztcblx0XHR0aGlzLl9fdHJpbVszXSA9IGg7XG5cblx0XHR0aGlzLl9fY29vcmRbMF0gKz0geDtcblx0XHR0aGlzLl9fY29vcmRbMV0gKz0geTtcblx0XHR0aGlzLl9fY29vcmRbMl0gPSB3O1xuXHRcdHRoaXMuX19jb29yZFszXSA9IGg7XG5cdFx0dGhpcy5fdyA9IHc7XG5cdFx0dGhpcy5faCA9IGg7XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIiwgb2xkKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0NhbnZhc1xuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQHRyaWdnZXIgRHJhdyAtIHdoZW4gdGhlIGVudGl0eSBpcyByZWFkeSB0byBiZSBkcmF3biB0byB0aGUgc3RhZ2UgLSB7dHlwZTogXCJjYW52YXNcIiwgcG9zLCBjbywgY3R4fVxuKiBAdHJpZ2dlciBOb0NhbnZhcyAtIGlmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY2FudmFzXG4qIFxuKiBXaGVuIHRoaXMgY29tcG9uZW50IGlzIGFkZGVkIHRvIGFuIGVudGl0eSBpdCB3aWxsIGJlIGRyYXduIHRvIHRoZSBnbG9iYWwgY2FudmFzIGVsZW1lbnQuIFRoZSBjYW52YXMgZWxlbWVudCAoYW5kIGhlbmNlIGFsbCBDYW52YXMgZW50aXRpZXMpIGlzIGFsd2F5cyByZW5kZXJlZCBiZWxvdyBhbnkgRE9NIGVudGl0aWVzLiBcbiogXG4qIENyYWZ0eS5jYW52YXMuaW5pdCgpIHdpbGwgYmUgYXV0b21hdGljYWxseSBjYWxsZWQgaWYgaXQgaXMgbm90IGNhbGxlZCBhbHJlYWR5IHRvIGluaXRpYWxpemUgdGhlIGNhbnZhcyBlbGVtZW50LlxuKlxuKiBDcmVhdGUgYSBjYW52YXMgZW50aXR5IGxpa2UgdGhpc1xuKiB+fn5cbiogdmFyIG15RW50aXR5ID0gQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBDb2xvclwiKS5jb2xvcihcImdyZWVuXCIpXG4qICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoe3g6IDEzLCB5OiAzNywgdzogNDIsIGg6IDQyfSk7XG4qfn5+XG4qL1xuQ3JhZnR5LmMoXCJDYW52YXNcIiwge1xuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIUNyYWZ0eS5jYW52YXMuY29udGV4dCkge1xuXHRcdFx0Q3JhZnR5LmNhbnZhcy5pbml0KCk7XG5cdFx0fVxuXG5cdFx0Ly9pbmNyZW1lbnQgdGhlIGFtb3VudCBvZiBjYW52YXMgb2Jqc1xuXHRcdENyYWZ0eS5EcmF3TWFuYWdlci50b3RhbDJEKys7XG5cblx0XHR0aGlzLmJpbmQoXCJDaGFuZ2VcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdC8vaWYgd2l0aGluIHNjcmVlbiwgYWRkIHRvIGxpc3Rcblx0XHRcdGlmICh0aGlzLl9jaGFuZ2VkID09PSBmYWxzZSkge1xuXHRcdFx0XHR0aGlzLl9jaGFuZ2VkID0gQ3JhZnR5LkRyYXdNYW5hZ2VyLmFkZChlIHx8IHRoaXMsIHRoaXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGUpIHRoaXMuX2NoYW5nZWQgPSBDcmFmdHkuRHJhd01hbmFnZXIuYWRkKGUsIHRoaXMpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5iaW5kKFwiUmVtb3ZlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdENyYWZ0eS5EcmF3TWFuYWdlci50b3RhbDJELS07XG5cdFx0XHRDcmFmdHkuRHJhd01hbmFnZXIuYWRkKHRoaXMsIHRoaXMpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmRyYXdcblx0KiBAY29tcCBDYW52YXNcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZHJhdyhbW0NvbnRleHQgY3R4LCBdTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGhdKVxuXHQqIEBwYXJhbSBjdHggLSBDYW52YXMgMkQgY29udGV4dCBpZiBkcmF3aW5nIG9uIGFub3RoZXIgY2FudmFzIGlzIHJlcXVpcmVkXG5cdCogQHBhcmFtIHggLSBYIG9mZnNldCBmb3IgZHJhd2luZyBhIHNlZ21lbnRcblx0KiBAcGFyYW0geSAtIFkgb2Zmc2V0IGZvciBkcmF3aW5nIGEgc2VnbWVudFxuXHQqIEBwYXJhbSB3IC0gV2lkdGggb2YgdGhlIHNlZ21lbnQgdG8gZHJhd1xuXHQqIEBwYXJhbSBoIC0gSGVpZ2h0IG9mIHRoZSBzZWdtZW50IHRvIGRyYXdcblx0KiBcblx0KiBNZXRob2QgdG8gZHJhdyB0aGUgZW50aXR5IG9uIHRoZSBjYW52YXMgZWxlbWVudC4gQ2FuIHBhc3MgcmVjdCB2YWx1ZXMgZm9yIHJlZHJhd2luZyBhIHNlZ21lbnQgb2YgdGhlIGVudGl0eS5cblx0Ki9cblx0ZHJhdzogZnVuY3Rpb24gKGN0eCwgeCwgeSwgdywgaCkge1xuXHRcdGlmICghdGhpcy5yZWFkeSkgcmV0dXJuO1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSA0KSB7XG5cdFx0XHRoID0gdztcblx0XHRcdHcgPSB5O1xuXHRcdFx0eSA9IHg7XG5cdFx0XHR4ID0gY3R4O1xuXHRcdFx0Y3R4ID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0O1xuXHRcdH1cblxuXHRcdHZhciBwb3MgPSB7IC8vaW5saW5lZCBwb3MoKSBmdW5jdGlvbiwgZm9yIHNwZWVkXG5cdFx0XHRfeDogKHRoaXMuX3ggKyAoeCB8fCAwKSksXG5cdFx0XHRfeTogKHRoaXMuX3kgKyAoeSB8fCAwKSksXG5cdFx0XHRfdzogKHcgfHwgdGhpcy5fdyksXG5cdFx0XHRfaDogKGggfHwgdGhpcy5faClcblx0XHR9LFxuXHRcdFx0Y29udGV4dCA9IGN0eCB8fCBDcmFmdHkuY2FudmFzLmNvbnRleHQsXG5cdFx0XHRjb29yZCA9IHRoaXMuX19jb29yZCB8fCBbMCwgMCwgMCwgMF0sXG5cdFx0XHRjbyA9IHtcblx0XHRcdHg6IGNvb3JkWzBdICsgKHggfHwgMCksXG5cdFx0XHR5OiBjb29yZFsxXSArICh5IHx8IDApLFxuXHRcdFx0dzogdyB8fCBjb29yZFsyXSxcblx0XHRcdGg6IGggfHwgY29vcmRbM11cblx0XHR9O1xuXG5cdFx0aWYgKHRoaXMuX21icikge1xuXHRcdFx0Y29udGV4dC5zYXZlKCk7XG5cblx0XHRcdGNvbnRleHQudHJhbnNsYXRlKHRoaXMuX29yaWdpbi54ICsgdGhpcy5feCwgdGhpcy5fb3JpZ2luLnkgKyB0aGlzLl95KTtcblx0XHRcdHBvcy5feCA9IC10aGlzLl9vcmlnaW4ueDtcblx0XHRcdHBvcy5feSA9IC10aGlzLl9vcmlnaW4ueTtcblxuXHRcdFx0Y29udGV4dC5yb3RhdGUoKHRoaXMuX3JvdGF0aW9uICUgMzYwKSAqIChNYXRoLlBJIC8gMTgwKSk7XG5cdFx0fVxuXHRcdFxuXHRcdGlmKHRoaXMuX2ZsaXBYIHx8IHRoaXMuX2ZsaXBZKSB7XG5cdFx0XHRjb250ZXh0LnNhdmUoKTtcblx0XHRcdGNvbnRleHQuc2NhbGUoKHRoaXMuX2ZsaXBYID8gLTEgOiAxKSwgKHRoaXMuX2ZsaXBZID8gLTEgOiAxKSk7XG5cdFx0XHRpZih0aGlzLl9mbGlwWCkge1xuXHRcdFx0XHRwb3MuX3ggPSAtKHBvcy5feCArIHBvcy5fdylcblx0XHRcdH1cblx0XHRcdGlmKHRoaXMuX2ZsaXBZKSB7XG5cdFx0XHRcdHBvcy5feSA9IC0ocG9zLl95ICsgcG9zLl9oKVxuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvL2RyYXcgd2l0aCBhbHBoYVxuXHRcdGlmICh0aGlzLl9hbHBoYSA8IDEuMCkge1xuXHRcdFx0dmFyIGdsb2JhbHBoYSA9IGNvbnRleHQuZ2xvYmFsQWxwaGE7XG5cdFx0XHRjb250ZXh0Lmdsb2JhbEFscGhhID0gdGhpcy5fYWxwaGE7XG5cdFx0fVxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiRHJhd1wiLCB7IHR5cGU6IFwiY2FudmFzXCIsIHBvczogcG9zLCBjbzogY28sIGN0eDogY29udGV4dCB9KTtcblxuXHRcdGlmICh0aGlzLl9tYnIgfHwgKHRoaXMuX2ZsaXBYIHx8IHRoaXMuX2ZsaXBZKSkge1xuXHRcdFx0Y29udGV4dC5yZXN0b3JlKCk7XG5cdFx0fVxuXHRcdGlmIChnbG9iYWxwaGEpIHtcblx0XHRcdGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBnbG9iYWxwaGE7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjQ3JhZnR5LmNhbnZhc1xuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogXG4qIENvbGxlY3Rpb24gb2YgbWV0aG9kcyB0byBkcmF3IG9uIGNhbnZhcy5cbiovXG5DcmFmdHkuZXh0ZW5kKHtcblx0Y2FudmFzOiB7XG5cdC8qKkBcblx0XHQqICNDcmFmdHkuY2FudmFzLmNvbnRleHRcblx0XHQqIEBjb21wIENyYWZ0eS5jYW52YXNcblx0XHQqIFxuXHRcdCogVGhpcyB3aWxsIHJldHVybiB0aGUgMkQgY29udGV4dCBvZiB0aGUgbWFpbiBjYW52YXMgZWxlbWVudC5cblx0XHQqIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBDcmFmdHkuY2FudmFzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKWAuXG5cdFx0Ki9cblx0XHRjb250ZXh0OiBudWxsLFxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuY2FudmFzLl9jYW52YXNcblx0XHQqIEBjb21wIENyYWZ0eS5jYW52YXNcblx0XHQqIFxuXHRcdCogTWFpbiBDYW52YXMgZWxlbWVudFxuXHRcdCovXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LmNhbnZhcy5pbml0XG5cdFx0KiBAY29tcCBDcmFmdHkuY2FudmFzXG5cdFx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuY2FudmFzLmluaXQodm9pZClcbiAgICAgICAgKiBAdHJpZ2dlciBOb0NhbnZhcyAtIHRyaWdnZXJlZCBpZiBgQ3JhZnR5LnN1cHBvcnQuY2FudmFzYCBpcyBmYWxzZVxuICAgICAgICAqIFxuXHRcdCogQ3JlYXRlcyBhIGBjYW52YXNgIGVsZW1lbnQgaW5zaWRlIGBDcmFmdHkuc3RhZ2UuZWxlbWAuIE11c3QgYmUgY2FsbGVkXG5cdFx0KiBiZWZvcmUgYW55IGVudGl0aWVzIHdpdGggdGhlIENhbnZhcyBjb21wb25lbnQgY2FuIGJlIGRyYXduLlxuXHRcdCpcblx0XHQqIFRoaXMgbWV0aG9kIHdpbGwgYXV0b21hdGljYWxseSBiZSBjYWxsZWQgaWYgbm8gYENyYWZ0eS5jYW52YXMuY29udGV4dGAgaXNcblx0XHQqIGZvdW5kLlxuXHRcdCovXG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly9jaGVjayBpZiBjYW52YXMgaXMgc3VwcG9ydGVkXG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmNhbnZhcykge1xuXHRcdFx0XHRDcmFmdHkudHJpZ2dlcihcIk5vQ2FudmFzXCIpO1xuXHRcdFx0XHRDcmFmdHkuc3RvcCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vY3JlYXRlIDMgZW1wdHkgY2FudmFzIGVsZW1lbnRzXG5cdFx0XHR2YXIgYztcblx0XHRcdGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuXHRcdFx0Yy53aWR0aCA9IENyYWZ0eS52aWV3cG9ydC53aWR0aDtcblx0XHRcdGMuaGVpZ2h0ID0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblx0XHRcdGMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdFx0Yy5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblx0XHRcdGMuc3R5bGUudG9wID0gXCIwcHhcIjtcblxuXHRcdFx0Q3JhZnR5LnN0YWdlLmVsZW0uYXBwZW5kQ2hpbGQoYyk7XG5cdFx0XHRDcmFmdHkuY2FudmFzLmNvbnRleHQgPSBjLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XHRDcmFmdHkuY2FudmFzLl9jYW52YXMgPSBjO1xuXHRcdH1cblx0fVxufSk7XG5cbkNyYWZ0eS5leHRlbmQoe1xuXHRvdmVyOiBudWxsLCAvL29iamVjdCBtb3VzZW92ZXIsIHdhaXRpbmcgZm9yIG91dFxuXHRtb3VzZU9ianM6IDAsXG5cdG1vdXNlUG9zOiB7fSxcblx0bGFzdEV2ZW50OiBudWxsLFxuXHRrZXlkb3duOiB7fSxcblx0c2VsZWN0ZWQ6IGZhbHNlLFxuXG5cdC8qKkBcblx0KiAjQ3JhZnR5LmtleWRvd25cblx0KiBAY2F0ZWdvcnkgSW5wdXRcblx0KiBSZW1lbWJlcmluZyB3aGF0IGtleXMgKHJlZmVycmVkIGJ5IFVuaWNvZGUpIGFyZSBkb3duLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmMoXCJLZXlib2FyZFwiLCB7XG5cdCogICBpc0Rvd246IGZ1bmN0aW9uIChrZXkpIHtcblx0KiAgICAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcblx0KiAgICAgICBrZXkgPSBDcmFmdHkua2V5c1trZXldO1xuXHQqICAgICB9XG5cdCogICAgIHJldHVybiAhIUNyYWZ0eS5rZXlkb3duW2tleV07XG5cdCogICB9XG5cdCogfSk7XG5cdCogfn5+XG5cdCogQHNlZSBLZXlib2FyZCwgQ3JhZnR5LmtleXNcblx0Ki9cblxuXHRkZXRlY3RCbHVyOiBmdW5jdGlvbiAoZSkge1xuXHRcdHZhciBzZWxlY3RlZCA9ICgoZS5jbGllbnRYID4gQ3JhZnR5LnN0YWdlLnggJiYgZS5jbGllbnRYIDwgQ3JhZnR5LnN0YWdlLnggKyBDcmFmdHkudmlld3BvcnQud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgICAgIChlLmNsaWVudFkgPiBDcmFmdHkuc3RhZ2UueSAmJiBlLmNsaWVudFkgPCBDcmFmdHkuc3RhZ2UueSArIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpKTtcblxuXHRcdGlmICghQ3JhZnR5LnNlbGVjdGVkICYmIHNlbGVjdGVkKVxuXHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJDcmFmdHlGb2N1c1wiKTtcblx0XHRpZiAoQ3JhZnR5LnNlbGVjdGVkICYmICFzZWxlY3RlZClcblx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiQ3JhZnR5Qmx1clwiKTtcblxuXHRcdENyYWZ0eS5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuXHR9LFxuXG5cdG1vdXNlRGlzcGF0Y2g6IGZ1bmN0aW9uIChlKSB7XG5cdFx0XG5cdFx0aWYgKCFDcmFmdHkubW91c2VPYmpzKSByZXR1cm47XG5cdFx0Q3JhZnR5Lmxhc3RFdmVudCA9IGU7XG5cblx0XHR2YXIgbWF4eiA9IC0xLFxuXHRcdFx0Y2xvc2VzdCxcblx0XHRcdHEsXG5cdFx0XHRpID0gMCwgbCxcblx0XHRcdHBvcyA9IENyYWZ0eS5ET00udHJhbnNsYXRlKGUuY2xpZW50WCwgZS5jbGllbnRZKSxcblx0XHRcdHgsIHksXG5cdFx0XHRkdXBlcyA9IHt9LFxuXHRcdFx0dGFyID0gZS50YXJnZXQgPyBlLnRhcmdldCA6IGUuc3JjRWxlbWVudCxcblx0XHRcdHR5cGUgPSBlLnR5cGU7XG5cblx0XHQvL05vcm1hbGl6ZSBidXR0b24gYWNjb3JkaW5nIHRvIGh0dHA6Ly91bml4cGFwYS5jb20vanMvbW91c2UuaHRtbFxuXHRcdGlmIChlLndoaWNoID09IG51bGwpIHtcblx0XHRcdGUubW91c2VCdXR0b24gPSAoZS5idXR0b24gPCAyKSA/IENyYWZ0eS5tb3VzZUJ1dHRvbnMuTEVGVCA6ICgoZS5idXR0b24gPT0gNCkgPyBDcmFmdHkubW91c2VCdXR0b25zLk1JRERMRSA6IENyYWZ0eS5tb3VzZUJ1dHRvbnMuUklHSFQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRlLm1vdXNlQnV0dG9uID0gKGUud2hpY2ggPCAyKSA/IENyYWZ0eS5tb3VzZUJ1dHRvbnMuTEVGVCA6ICgoZS53aGljaCA9PSAyKSA/IENyYWZ0eS5tb3VzZUJ1dHRvbnMuTUlERExFIDogQ3JhZnR5Lm1vdXNlQnV0dG9ucy5SSUdIVCk7XG5cdFx0fVxuXG5cdFx0ZS5yZWFsWCA9IHggPSBDcmFmdHkubW91c2VQb3MueCA9IHBvcy54O1xuXHRcdGUucmVhbFkgPSB5ID0gQ3JhZnR5Lm1vdXNlUG9zLnkgPSBwb3MueTtcblxuXHRcdC8vaWYgaXQncyBhIERPTSBlbGVtZW50IHdpdGggTW91c2UgY29tcG9uZW50IHdlIGFyZSBkb25lXG5cdFx0aWYgKHRhci5ub2RlTmFtZSAhPSBcIkNBTlZBU1wiKSB7XG5cdFx0XHR3aGlsZSAodHlwZW9mICh0YXIuaWQpICE9ICdzdHJpbmcnICYmIHRhci5pZC5pbmRleE9mKCdlbnQnKSA9PSAtMSkge1xuXHRcdFx0XHR0YXIgPSB0YXIucGFyZW50Tm9kZTtcblx0XHRcdH1cblx0XHRcdGVudCA9IENyYWZ0eShwYXJzZUludCh0YXIuaWQucmVwbGFjZSgnZW50JywgJycpKSlcblx0XHRcdGlmIChlbnQuaGFzKCdNb3VzZScpICYmIGVudC5pc0F0KHgsIHkpKVxuXHRcdFx0XHRjbG9zZXN0ID0gZW50O1xuXHRcdH1cblx0XHQvL2Vsc2Ugd2Ugc2VhcmNoIGZvciBhbiBlbnRpdHkgd2l0aCBNb3VzZSBjb21wb25lbnRcblx0XHRpZiAoIWNsb3Nlc3QpIHtcblx0XHRcdHEgPSBDcmFmdHkubWFwLnNlYXJjaCh7IF94OiB4LCBfeTogeSwgX3c6IDEsIF9oOiAxIH0sIGZhbHNlKTtcblxuXHRcdFx0Zm9yIChsID0gcS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0aWYgKCFxW2ldLl9fYy5Nb3VzZSB8fCAhcVtpXS5fdmlzaWJsZSkgY29udGludWU7XG5cblx0XHRcdFx0dmFyIGN1cnJlbnQgPSBxW2ldLFxuXHRcdFx0XHRcdGZsYWcgPSBmYWxzZTtcblxuXHRcdFx0XHQvL3dlZWQgb3V0IGR1cGxpY2F0ZXNcblx0XHRcdFx0aWYgKGR1cGVzW2N1cnJlbnRbMF1dKSBjb250aW51ZTtcblx0XHRcdFx0ZWxzZSBkdXBlc1tjdXJyZW50WzBdXSA9IHRydWU7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnQubWFwQXJlYSkge1xuXHRcdFx0XHRcdGlmIChjdXJyZW50Lm1hcEFyZWEuY29udGFpbnNQb2ludCh4LCB5KSkge1xuXHRcdFx0XHRcdFx0ZmxhZyA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnQuaXNBdCh4LCB5KSkgZmxhZyA9IHRydWU7XG5cblx0XHRcdFx0aWYgKGZsYWcgJiYgKGN1cnJlbnQuX3ogPj0gbWF4eiB8fCBtYXh6ID09PSAtMSkpIHtcblx0XHRcdFx0XHQvL2lmIHRoZSBaIGlzIHRoZSBzYW1lLCBzZWxlY3QgdGhlIGNsb3Nlc3QgR1VJRFxuXHRcdFx0XHRcdGlmIChjdXJyZW50Ll96ID09PSBtYXh6ICYmIGN1cnJlbnRbMF0gPCBjbG9zZXN0WzBdKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWF4eiA9IGN1cnJlbnQuX3o7XG5cdFx0XHRcdFx0Y2xvc2VzdCA9IGN1cnJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL2ZvdW5kIGNsb3Nlc3Qgb2JqZWN0IHRvIG1vdXNlXG5cdFx0aWYgKGNsb3Nlc3QpIHtcblx0XHRcdC8vY2xpY2sgbXVzdCBtb3VzZWRvd24gYW5kIG91dCBvbiB0aWxlXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJtb3VzZWRvd25cIikge1xuXHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJNb3VzZURvd25cIiwgZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwibW91c2V1cFwiKSB7XG5cdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIk1vdXNlVXBcIiwgZSk7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT0gXCJkYmxjbGlja1wiKSB7XG5cdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIkRvdWJsZUNsaWNrXCIsIGUpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09IFwiY2xpY2tcIikge1xuXHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJDbGlja1wiLCBlKTtcblx0XHRcdH1lbHNlIGlmICh0eXBlID09PSBcIm1vdXNlbW92ZVwiKSB7XG5cdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIk1vdXNlTW92ZVwiLCBlKTtcblx0XHRcdFx0aWYgKHRoaXMub3ZlciAhPT0gY2xvc2VzdCkgeyAvL2lmIG5ldyBtb3VzZW1vdmUsIGl0IGlzIG92ZXJcblx0XHRcdFx0XHRpZiAodGhpcy5vdmVyKSB7XG5cdFx0XHRcdFx0XHR0aGlzLm92ZXIudHJpZ2dlcihcIk1vdXNlT3V0XCIsIGUpOyAvL2lmIG92ZXIgd2Fzbid0IG51bGwsIHNlbmQgbW91c2VvdXRcblx0XHRcdFx0XHRcdHRoaXMub3ZlciA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMub3ZlciA9IGNsb3Nlc3Q7XG5cdFx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiTW91c2VPdmVyXCIsIGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgY2xvc2VzdC50cmlnZ2VyKHR5cGUsIGUpOyAvL3RyaWdnZXIgd2hhdGV2ZXIgaXQgaXNcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIgJiYgdGhpcy5vdmVyKSB7XG5cdFx0XHRcdHRoaXMub3Zlci50cmlnZ2VyKFwiTW91c2VPdXRcIiwgZSk7XG5cdFx0XHRcdHRoaXMub3ZlciA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gXCJtb3VzZWRvd25cIikge1xuXHRcdFx0XHRDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKCdzdGFydCcsIGUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikge1xuXHRcdFx0XHRDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKCdkcmFnJywgZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlID09IFwibW91c2V1cFwiKSB7XG5cdFx0XHRcdENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soJ3N0b3AnKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikge1xuXHRcdFx0dGhpcy5sYXN0RXZlbnQgPSBlO1xuXHRcdH1cblxuXHR9LFxuXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnRvdWNoRGlzcGF0Y2hcbiAgICAqIEBjYXRlZ29yeSBJbnB1dFxuICAgICogXG4gICAgKiBUb3VjaEV2ZW50cyBoYXZlIGEgZGlmZmVyZW50IHN0cnVjdHVyZSB0aGVuIE1vdXNlRXZlbnRzLlxuICAgICogVGhlIHJlbGV2YW50IGRhdGEgbGl2ZXMgaW4gZS5jaGFuZ2VkVG91Y2hlc1swXS5cbiAgICAqIFRvIG5vcm1hbGl6ZSBUb3VjaEV2ZW50cyB3ZSBjYXRjaCBlbSBhbmQgZGlzcGF0Y2ggYSBtb2NrIE1vdXNlRXZlbnQgaW5zdGVhZC5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkubW91c2VEaXNwYXRjaFxuICAgICovXG5cbiAgICB0b3VjaERpc3BhdGNoOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciB0eXBlLFxuICAgICAgICAgICAgbGFzdEV2ZW50ID0gQ3JhZnR5Lmxhc3RFdmVudDtcblxuICAgICAgICBpZiAoZS50eXBlID09PSBcInRvdWNoc3RhcnRcIikgdHlwZSA9IFwibW91c2Vkb3duXCI7XG4gICAgICAgIGVsc2UgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaG1vdmVcIikgdHlwZSA9IFwibW91c2Vtb3ZlXCI7XG4gICAgICAgIGVsc2UgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaGVuZFwiKSB0eXBlID0gXCJtb3VzZXVwXCI7XG4gICAgICAgIGVsc2UgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaGNhbmNlbFwiKSB0eXBlID0gXCJtb3VzZXVwXCI7XG4gICAgICAgIGVsc2UgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaGxlYXZlXCIpIHR5cGUgPSBcIm1vdXNldXBcIjtcbiAgICAgICAgXG4gICAgICAgIGlmKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmaXJzdCA9IGUudG91Y2hlc1swXTtcbiAgICAgICAgfSBlbHNlIGlmKGUuY2hhbmdlZFRvdWNoZXMgJiYgZS5jaGFuZ2VkVG91Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZpcnN0ID0gZS5jaGFuZ2VkVG91Y2hlc1swXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzaW11bGF0ZWRFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudFwiKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLFxuICAgICAgICAgICAgZmlyc3Quc2NyZWVuWCwgXG4gICAgICAgICAgICBmaXJzdC5zY3JlZW5ZLFxuICAgICAgICAgICAgZmlyc3QuY2xpZW50WCwgXG4gICAgICAgICAgICBmaXJzdC5jbGllbnRZLCBcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLCBlLnJlbGF0ZWRUYXJnZXRcbiAgICAgICAgKTtcblxuICAgICAgICBmaXJzdC50YXJnZXQuZGlzcGF0Y2hFdmVudChzaW11bGF0ZWRFdmVudCk7XG5cbiAgICAgICAgLy8gdHJpZ2dlciBjbGljayB3aGVuIGl0IHNob3VsZCBiZSB0cmlnZ2VyZWRcbiAgICAgICAgaWYgKGxhc3RFdmVudCAhPSBudWxsICYmIGxhc3RFdmVudC50eXBlID09ICdtb3VzZWRvd24nICYmIHR5cGUgPT0gJ21vdXNldXAnKSB7XG4gICAgICAgICAgICB0eXBlID0gJ2NsaWNrJztcblxuICAgICAgICAgICAgdmFyIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50XCIpO1xuICAgICAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLFxuICAgICAgICAgICAgICAgIGZpcnN0LnNjcmVlblgsIFxuICAgICAgICAgICAgICAgIGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgICAgICAgZmlyc3QuY2xpZW50WCwgXG4gICAgICAgICAgICAgICAgZmlyc3QuY2xpZW50WSwgXG4gICAgICAgICAgICAgICAgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIGUucmVsYXRlZFRhcmdldFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZWxzZSBlLnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgfSxcblxuXG5cdC8qKkBcblx0KiAjS2V5Ym9hcmRFdmVudFxuXHQqIEBjYXRlZ29yeSBJbnB1dFxuICAgICogS2V5Ym9hcmQgRXZlbnQgdHJpZ2dlcmVkIGJ5IENyYWZ0eSBDb3JlXG5cdCogQHRyaWdnZXIgS2V5RG93biAtIGlzIHRyaWdnZXJlZCBmb3IgZWFjaCBlbnRpdHkgd2hlbiB0aGUgRE9NICdrZXlkb3duJyBldmVudCBpcyB0cmlnZ2VyZWQuXG5cdCogQHRyaWdnZXIgS2V5VXAgLSBpcyB0cmlnZ2VyZWQgZm9yIGVhY2ggZW50aXR5IHdoZW4gdGhlIERPTSAna2V5dXAnIGV2ZW50IGlzIHRyaWdnZXJlZC5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuICAgICogQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvclwiKVxuICAgICogICAuYXR0cih7eDogMTAwLCB5OiAxMDAsIHc6IDUwLCBoOiA1MH0pXG4gICAgKiAgIC5jb2xvcihcInJlZFwiKVxuICAgICogICAuYmluZCgnS2V5RG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICAqICAgICBpZihlLmtleSA9PSBDcmFmdHkua2V5c1snTEVGVF9BUlJPVyddKSB7XG4gICAgKiAgICAgICB0aGlzLng9dGhpcy54LTE7XG4gICAgKiAgICAgfSBlbHNlIGlmIChlLmtleSA9PSBDcmFmdHkua2V5c1snUklHSFRfQVJST1cnXSkge1xuICAgICogICAgIHRoaXMueD10aGlzLngrMTtcbiAgICAqICAgICB9IGVsc2UgaWYgKGUua2V5ID09IENyYWZ0eS5rZXlzWydVUF9BUlJPVyddKSB7XG4gICAgKiAgICAgdGhpcy55PXRoaXMueS0xO1xuICAgICogICAgIH0gZWxzZSBpZiAoZS5rZXkgPT0gQ3JhZnR5LmtleXNbJ0RPV05fQVJST1cnXSkge1xuICAgICogICAgIHRoaXMueT10aGlzLnkrMTtcbiAgICAqICAgICB9XG4gICAgKiAgIH0pO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LmtleXNcblx0Ki9cblxuXHQvKipAXG5cdCogI0NyYWZ0eS5ldmVudE9iamVjdFxuXHQqIEBjYXRlZ29yeSBJbnB1dFxuXHQqIFxuXHQqIEV2ZW50IE9iamVjdCB1c2VkIGluIENyYWZ0eSBmb3IgY3Jvc3MgYnJvd3NlciBjb21wYXRpYmlsaXR5XG5cdCovXG5cblx0LyoqQFxuXHQqICMua2V5XG5cdCogQGNvbXAgQ3JhZnR5LmV2ZW50T2JqZWN0XG5cdCogXG5cdCogVW5pY29kZSBvZiB0aGUga2V5IHByZXNzZWRcblx0Ki9cblx0a2V5Ym9hcmREaXNwYXRjaDogZnVuY3Rpb24gKGUpIHtcblx0XHQvLyBVc2UgYSBDcmFmdHktc3RhbmRhcmQgZXZlbnQgb2JqZWN0IHRvIGF2b2lkIGNyb3NzLWJyb3dzZXIgaXNzdWVzXG5cdFx0dmFyIG9yaWdpbmFsID0gZSxcblx0XHRcdGV2bnQgPSB7fSxcblx0XHRcdHByb3BzID0gXCJjaGFyIGNoYXJDb2RlIGtleUNvZGUgdHlwZSBzaGlmdEtleSBjdHJsS2V5IG1ldGFLZXkgdGltZXN0YW1wXCIuc3BsaXQoXCIgXCIpO1xuXHRcdGZvciAodmFyIGkgPSBwcm9wcy5sZW5ndGg7IGk7KSB7XG5cdFx0XHR2YXIgcHJvcCA9IHByb3BzWy0taV07XG5cdFx0XHRldm50W3Byb3BdID0gb3JpZ2luYWxbcHJvcF07XG5cdFx0fVxuXHRcdGV2bnQud2hpY2ggPSBvcmlnaW5hbC5jaGFyQ29kZSAhPSBudWxsID8gb3JpZ2luYWwuY2hhckNvZGUgOiBvcmlnaW5hbC5rZXlDb2RlO1xuXHRcdGV2bnQua2V5ID0gb3JpZ2luYWwua2V5Q29kZSB8fCBvcmlnaW5hbC53aGljaDtcblx0XHRldm50Lm9yaWdpbmFsRXZlbnQgPSBvcmlnaW5hbDtcblx0XHRlID0gZXZudDtcblxuXHRcdGlmIChlLnR5cGUgPT09IFwia2V5ZG93blwiKSB7XG5cdFx0XHRpZiAoQ3JhZnR5LmtleWRvd25bZS5rZXldICE9PSB0cnVlKSB7XG5cdFx0XHRcdENyYWZ0eS5rZXlkb3duW2Uua2V5XSA9IHRydWU7XG5cdFx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiS2V5RG93blwiLCBlKTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gXCJrZXl1cFwiKSB7XG5cdFx0XHRkZWxldGUgQ3JhZnR5LmtleWRvd25bZS5rZXldO1xuXHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJLZXlVcFwiLCBlKTtcblx0XHR9XG5cblx0XHQvL3ByZXZlbnQgZGVmYXVsdCBhY3Rpb25zIGZvciBhbGwga2V5cyBleGNlcHQgYmFja3NwYWNlIGFuZCBGMS1GMTIuXG5cdFx0Ly9BbW9uZyBvdGhlcnMgdGhpcyBwcmV2ZW50IHRoZSBhcnJvdyBrZXlzIGZyb20gc2Nyb2xsaW5nIHRoZSBwYXJlbnQgcGFnZVxuXHRcdC8vb2YgYW4gaWZyYW1lIGhvc3RpbmcgdGhlIGdhbWVcblx0XHRpZihDcmFmdHkuc2VsZWN0ZWQgJiYgIShlLmtleSA9PSA4IHx8IGUua2V5ID49IDExMiAmJiBlLmtleSA8PSAxMzUpKSB7XG5cdFx0XHRpZihlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGVsc2UgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuXG5cdFx0XHRpZihlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRlbHNlIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vL2luaXRpYWxpemUgdGhlIGlucHV0IGV2ZW50cyBvbmxvYWRcbkNyYWZ0eS5iaW5kKFwiTG9hZFwiLCBmdW5jdGlvbiAoKSB7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBcImtleWRvd25cIiwgQ3JhZnR5LmtleWJvYXJkRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgXCJrZXl1cFwiLCBDcmFmdHkua2V5Ym9hcmREaXNwYXRjaCk7XG5cblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlZG93blwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIGRvY3VtZW50LmJvZHksIFwibW91c2V1cFwiLCBDcmFmdHkuZGV0ZWN0Qmx1cik7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZW1vdmVcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwiY2xpY2tcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwiZGJsY2xpY2tcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaHN0YXJ0XCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNobW92ZVwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGVuZFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG4gICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoY2FuY2VsXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcbiAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hsZWF2ZVwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG4gICB9KTtcblxuQ3JhZnR5LmJpbmQoXCJDcmFmdHlTdG9wXCIsIGZ1bmN0aW9uICgpIHtcblx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIFwia2V5ZG93blwiLCBDcmFmdHkua2V5Ym9hcmREaXNwYXRjaCk7XG5cdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBcImtleXVwXCIsIENyYWZ0eS5rZXlib2FyZERpc3BhdGNoKTtcblxuXHRpZiAoQ3JhZnR5LnN0YWdlKSB7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlZG93blwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZW1vdmVcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJjbGlja1wiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcImRibGNsaWNrXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblxuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaHN0YXJ0XCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2htb3ZlXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hlbmRcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGNhbmNlbFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNobGVhdmVcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHR9XG5cblx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIGRvY3VtZW50LmJvZHksIFwibW91c2V1cFwiLCBDcmFmdHkuZGV0ZWN0Qmx1cik7XG59KTtcblxuLyoqQFxuKiAjTW91c2VcbiogQGNhdGVnb3J5IElucHV0XG4qIFByb3ZpZGVzIHRoZSBlbnRpdHkgd2l0aCBtb3VzZSByZWxhdGVkIGV2ZW50c1xuKiBAdHJpZ2dlciBNb3VzZU92ZXIgLSB3aGVuIHRoZSBtb3VzZSBlbnRlcnMgdGhlIGVudGl0eSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgTW91c2VPdXQgLSB3aGVuIHRoZSBtb3VzZSBsZWF2ZXMgdGhlIGVudGl0eSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgTW91c2VEb3duIC0gd2hlbiB0aGUgbW91c2UgYnV0dG9uIGlzIHByZXNzZWQgb24gdGhlIGVudGl0eSAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgTW91c2VVcCAtIHdoZW4gdGhlIG1vdXNlIGJ1dHRvbiBpcyByZWxlYXNlZCBvbiB0aGUgZW50aXR5IC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBDbGljayAtIHdoZW4gdGhlIHVzZXIgY2xpY2tzIHRoZSBlbnRpdHkuIFtTZWUgZG9jdW1lbnRhdGlvbl0oaHR0cDovL3d3dy5xdWlya3Ntb2RlLm9yZy9kb20vZXZlbnRzL2NsaWNrLmh0bWwpIC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBEb3VibGVDbGljayAtIHdoZW4gdGhlIHVzZXIgZG91YmxlIGNsaWNrcyB0aGUgZW50aXR5IC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBNb3VzZU1vdmUgLSB3aGVuIHRoZSBtb3VzZSBpcyBvdmVyIHRoZSBlbnRpdHkgYW5kIG1vdmVzIC0gTW91c2VFdmVudFxuKiBDcmFmdHkgYWRkcyB0aGUgbW91c2VCdXR0b24gcHJvcGVydHkgdG8gTW91c2VFdmVudHMgdGhhdCBtYXRjaCBvbmUgb2Zcbipcbiogfn5+XG4qIC0gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5MRUZUXG4qIC0gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5SSUdIVFxuKiAtIENyYWZ0eS5tb3VzZUJ1dHRvbnMuTUlERExFXG4qIH5+flxuKiBcbiogQGV4YW1wbGVcbiogfn5+XG4qIG15RW50aXR5LmJpbmQoJ0NsaWNrJywgZnVuY3Rpb24oKSB7XG4qICAgICAgY29uc29sZS5sb2coXCJDbGlja2VkISFcIik7XG4qIH0pXG4qXG4qIG15RW50aXR5LmJpbmQoJ01vdXNlVXAnLCBmdW5jdGlvbihlKSB7XG4qICAgIGlmKCBlLm1vdXNlQnV0dG9uID09IENyYWZ0eS5tb3VzZUJ1dHRvbnMuUklHSFQgKVxuKiAgICAgICAgY29uc29sZS5sb2coXCJDbGlja2VkIHJpZ2h0IGJ1dHRvblwiKTtcbiogfSlcbiogfn5+XG4qL1xuQ3JhZnR5LmMoXCJNb3VzZVwiLCB7XG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRDcmFmdHkubW91c2VPYmpzKys7XG5cdFx0dGhpcy5iaW5kKFwiUmVtb3ZlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdENyYWZ0eS5tb3VzZU9ianMtLTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5hcmVhTWFwXG5cdCogQGNvbXAgTW91c2Vcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYXJlYU1hcChDcmFmdHkucG9seWdvbiBwb2x5Z29uKVxuXHQqIEBwYXJhbSBwb2x5Z29uIC0gSW5zdGFuY2Ugb2YgQ3JhZnR5LnBvbHlnb24gdXNlZCB0byBjaGVjayBpZiB0aGUgbW91c2UgY29vcmRpbmF0ZXMgYXJlIGluc2lkZSB0aGlzIHJlZ2lvblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hcmVhTWFwKEFycmF5IHBvaW50MSwgLi4sIEFycmF5IHBvaW50Tilcblx0KiBAcGFyYW0gcG9pbnQjIC0gQXJyYXkgd2l0aCBhbiBgeGAgYW5kIGB5YCBwb3NpdGlvbiB0byBnZW5lcmF0ZSBhIHBvbHlnb25cblx0KiBcblx0KiBBc3NpZ24gYSBwb2x5Z29uIHRvIHRoZSBlbnRpdHkgc28gdGhhdCBtb3VzZSBldmVudHMgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBpZlxuXHQqIHRoZSBjb29yZGluYXRlcyBhcmUgaW5zaWRlIHRoZSBnaXZlbiBwb2x5Z29uLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvciwgTW91c2VcIilcblx0KiAgICAgLmNvbG9yKFwicmVkXCIpXG5cdCogICAgIC5hdHRyKHsgdzogMTAwLCBoOiAxMDAgfSlcblx0KiAgICAgLmJpbmQoJ01vdXNlT3ZlcicsIGZ1bmN0aW9uKCkge2NvbnNvbGUubG9nKFwib3ZlclwiKX0pXG5cdCogICAgIC5hcmVhTWFwKFswLDBdLCBbNTAsMF0sIFs1MCw1MF0sIFswLDUwXSlcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5wb2x5Z29uXG5cdCovXG5cdGFyZWFNYXA6IGZ1bmN0aW9uIChwb2x5KSB7XG5cdFx0Ly9jcmVhdGUgcG9seWdvblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly9jb252ZXJ0IGFyZ3MgdG8gYXJyYXkgdG8gY3JlYXRlIHBvbHlnb25cblx0XHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblx0XHRcdHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oYXJncyk7XG5cdFx0fVxuXG5cdFx0cG9seS5zaGlmdCh0aGlzLl94LCB0aGlzLl95KTtcblx0XHQvL3RoaXMubWFwID0gcG9seTtcblx0XHR0aGlzLm1hcEFyZWEgPSBwb2x5O1xuXG5cdFx0dGhpcy5hdHRhY2godGhpcy5tYXBBcmVhKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0RyYWdnYWJsZVxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogRW5hYmxlIGRyYWcgYW5kIGRyb3Agb2YgdGhlIGVudGl0eS5cbiogQHRyaWdnZXIgRHJhZ2dpbmcgLSBpcyB0cmlnZ2VyZWQgZWFjaCBmcmFtZSB0aGUgZW50aXR5IGlzIGJlaW5nIGRyYWdnZWQgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIFN0YXJ0RHJhZyAtIGlzIHRyaWdnZXJlZCB3aGVuIGRyYWdnaW5nIGJlZ2lucyAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgU3RvcERyYWcgLSBpcyB0cmlnZ2VyZWQgd2hlbiBkcmFnZ2luZyBlbmRzIC0gTW91c2VFdmVudFxuKi9cbkNyYWZ0eS5jKFwiRHJhZ2dhYmxlXCIsIHtcbiAgX29yaWdNb3VzZURPTVBvczogbnVsbCxcblx0X29sZFg6IG51bGwsXG5cdF9vbGRZOiBudWxsLFxuXHRfZHJhZ2dpbmc6IGZhbHNlLFxuXHRfZGlyOm51bGwsXG5cblx0X29uZHJhZzogbnVsbCxcblx0X29uZG93bjogbnVsbCxcblx0X29udXA6IG51bGwsXG5cblx0Ly9Ob3RlOiB0aGUgY29kZSBpcyBub3RlIHRlc3RlZCB3aXRoIHpvb20sIGV0Yy4sIHRoYXQgbWF5IGRpc3RvcnQgdGhlIGRpcmVjdGlvbiBiZXR3ZWVuIHRoZSB2aWV3cG9ydCBhbmQgdGhlIGNvb3JkaW5hdGUgb24gdGhlIGNhbnZhcy5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucmVxdWlyZXMoXCJNb3VzZVwiKTtcblx0XHRcblx0XHR0aGlzLl9vbmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIHBvcyA9IENyYWZ0eS5ET00udHJhbnNsYXRlKGUuY2xpZW50WCwgZS5jbGllbnRZKTtcblxuXHRcdFx0Ly8gaWdub3JlIGludmFsaWQgMCAwIHBvc2l0aW9uIC0gc3RyYW5nZSBwcm9ibGVtIG9uIGlwYWRcblx0XHRcdGlmIChwb3MueCA9PSAwIHx8IHBvcy55ID09IDApIHtcblx0XHRcdCAgICByZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdCAgICBcblx0XHRcdGlmKHRoaXMuX2Rpcikge1xuXHRcdFx0ICAgIHZhciBsZW4gPSAocG9zLnggLSB0aGlzLl9vcmlnTW91c2VET01Qb3MueCkgKiB0aGlzLl9kaXIueCArIChwb3MueSAtIHRoaXMuX29yaWdNb3VzZURPTVBvcy55KSAqIHRoaXMuX2Rpci55O1xuXHRcdFx0ICAgIHRoaXMueCA9IHRoaXMuX29sZFggKyBsZW4gKiB0aGlzLl9kaXIueDtcblx0XHRcdCAgICB0aGlzLnkgPSB0aGlzLl9vbGRZICsgbGVuICogdGhpcy5fZGlyLnk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0ICAgIHRoaXMueCA9IHRoaXMuX29sZFggKyAocG9zLnggLSB0aGlzLl9vcmlnTW91c2VET01Qb3MueCk7XG5cdFx0XHQgICAgdGhpcy55ID0gdGhpcy5fb2xkWSArIChwb3MueSAtIHRoaXMuX29yaWdNb3VzZURPTVBvcy55KTtcblx0XHRcdH1cblx0ICAgIFxuXHRcdFx0dGhpcy50cmlnZ2VyKFwiRHJhZ2dpbmdcIiwgZSk7XG5cdFx0fTtcblxuXHRcdHRoaXMuX29uZG93biA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoZS5tb3VzZUJ1dHRvbiAhPT0gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5MRUZUKSByZXR1cm47XG5cdFx0XHR0aGlzLl9zdGFydERyYWcoZSk7XG5cdFx0fTtcblxuXHRcdHRoaXMuX29udXAgPSBmdW5jdGlvbiB1cHBlcihlKSB7XG5cdFx0XHRpZiAodGhpcy5fZHJhZ2dpbmcgPT0gdHJ1ZSkge1xuXHRcdFx0ICAgIENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZW1vdmVcIiwgdGhpcy5fb25kcmFnKTtcblx0XHRcdCAgICBDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCB0aGlzLl9vbnVwKTtcblx0XHRcdCAgICB0aGlzLl9kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdFx0ICAgIHRoaXMudHJpZ2dlcihcIlN0b3BEcmFnXCIsIGUpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLmVuYWJsZURyYWcoKTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5kcmFnRGlyZWN0aW9uXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRyYWdEaXJlY3Rpb24oKVxuICAgICogUmVtb3ZlIGFueSBwcmV2aW91c2x5IHNwZWNpZmllZCBkaXJlY3Rpb24uXG4gICAgKlxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kcmFnRGlyZWN0aW9uKHZlY3RvcilcbiAgICAqIEBwYXJhbSB2ZWN0b3IgLSBPZiB0aGUgZm9ybSBvZiB7eDogdmFseCwgeTogdmFseX0sIHRoZSB2ZWN0b3IgKHZhbHgsIHZhbHkpIGRlbm90ZXMgdGhlIG1vdmUgZGlyZWN0aW9uLlxuICAgICogXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRyYWdEaXJlY3Rpb24oZGVncmVlKVxuICAgICogQHBhcmFtIGRlZ3JlZSAtIEEgbnVtYmVyLCB0aGUgZGVncmVlIChjbG9ja3dpc2UpIG9mIHRoZSBtb3ZlIGRpcmVjdGlvbiB3aXRoIHJlc3BlY3QgdG8gdGhlIHggYXhpcy4gXG5cdCogU3BlY2lmeSB0aGUgZHJhZ2dpbmcgZGlyZWN0aW9uLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5kcmFnRGlyZWN0aW9uKClcblx0KiB0aGlzLmRyYWdEaXJlY3Rpb24oe3g6MSwgeTowfSkgLy9Ib3Jpem9udGFsXG5cdCogdGhpcy5kcmFnRGlyZWN0aW9uKHt4OjAsIHk6MX0pIC8vVmVydGljYWxcbiAgICAqIC8vIE5vdGU6IGJlY2F1c2Ugb2YgdGhlIG9yaWVudGF0aW9uIG9mIHggYW5kIHkgYXhpcyxcbiAgICAqIC8vIHRoaXMgaXMgNDUgZGVncmVlIGNsb2Nrd2lzZSB3aXRoIHJlc3BlY3QgdG8gdGhlIHggYXhpcy5cblx0KiB0aGlzLmRyYWdEaXJlY3Rpb24oe3g6MSwgeToxfSkgLy80NSBkZWdyZWUuXG5cdCogdGhpcy5kcmFnRGlyZWN0aW9uKDYwKSAvLzYwIGRlZ3JlZS5cblx0KiB+fn5cblx0Ki9cblx0ZHJhZ0RpcmVjdGlvbjogZnVuY3Rpb24oZGlyKSB7XG5cdFx0aWYgKHR5cGVvZiBkaXIgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLl9kaXI9bnVsbDtcblx0XHR9IGVsc2UgaWYgKChcIlwiICsgcGFyc2VJbnQoZGlyKSkgPT0gZGlyKSB7IC8vZGlyIGlzIGEgbnVtYmVyXG4gICAgICB0aGlzLl9kaXI9e1xuICAgICAgICB4OiBNYXRoLmNvcyhkaXIvMTgwKk1hdGguUEkpXG4gICAgICAgICwgeTogTWF0aC5zaW4oZGlyLzE4MCpNYXRoLlBJKVxuICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgcj1NYXRoLnNxcnQoZGlyLnggKiBkaXIueCArIGRpci55ICogZGlyLnkpXG5cdFx0XHR0aGlzLl9kaXI9e1xuICAgICAgICB4OiBkaXIueC9yXG4gICAgICAgICwgeTogZGlyLnkvclxuICAgICAgfTtcblx0XHR9XG5cdH0sXG5cdFxuXHRcblx0LyoqQFxuXHQqICMuX3N0YXJ0RHJhZ1xuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEludGVybmFsIG1ldGhvZCBmb3Igc3RhcnRpbmcgYSBkcmFnIG9mIGFuIGVudGl0eSBlaXRoZXIgcHJvZ3JhbWF0aWNhbGx5IG9yIHZpYSBNb3VzZSBjbGlja1xuXHQqXG5cdCogQHBhcmFtIGUgLSBhIG1vdXNlIGV2ZW50XG5cdCovXG5cdF9zdGFydERyYWc6IGZ1bmN0aW9uKGUpe1xuXHRcdHRoaXMuX29yaWdNb3VzZURPTVBvcyA9IENyYWZ0eS5ET00udHJhbnNsYXRlKGUuY2xpZW50WCwgZS5jbGllbnRZKTtcblx0XHR0aGlzLl9vbGRYID0gdGhpcy5feDtcblx0XHR0aGlzLl9vbGRZID0gdGhpcy5feTtcblx0XHR0aGlzLl9kcmFnZ2luZyA9IHRydWU7XG5cblx0XHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vtb3ZlXCIsIHRoaXMuX29uZHJhZyk7XG5cdFx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgdGhpcy5fb251cCk7XG5cdFx0dGhpcy50cmlnZ2VyKFwiU3RhcnREcmFnXCIsIGUpO1xuXHR9LFxuXHRcblx0LyoqQFxuXHQqICMuc3RvcERyYWdcblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuc3RvcERyYWcodm9pZClcblx0KiBAdHJpZ2dlciBTdG9wRHJhZyAtIENhbGxlZCByaWdodCBhZnRlciB0aGUgbW91c2UgbGlzdGVuZXJzIGFyZSByZW1vdmVkXG5cdCogXG5cdCogU3RvcCB0aGUgZW50aXR5IGZyb20gZHJhZ2dpbmcuIEVzc2VudGlhbGx5IHJlcHJvZHVjaW5nIHRoZSBkcm9wLlxuXHQqIFxuXHQqIEBzZWUgLnN0YXJ0RHJhZ1xuXHQqL1xuXHRzdG9wRHJhZzogZnVuY3Rpb24gKCkge1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZW1vdmVcIiwgdGhpcy5fb25kcmFnKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCB0aGlzLl9vbnVwKTtcblxuXHRcdHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy50cmlnZ2VyKFwiU3RvcERyYWdcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc3RhcnREcmFnXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnN0YXJ0RHJhZyh2b2lkKVxuXHQqIFxuXHQqIE1ha2UgdGhlIGVudGl0eSBmb2xsb3cgdGhlIG1vdXNlIHBvc2l0aW9ucy5cblx0KiBcblx0KiBAc2VlIC5zdG9wRHJhZ1xuXHQqL1xuXHRzdGFydERyYWc6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX2RyYWdnaW5nKSB7XG5cdFx0XHQvL1VzZSB0aGUgbGFzdCBrbm93biBwb3NpdGlvbiBvZiB0aGUgbW91c2Vcblx0XHRcdHRoaXMuX3N0YXJ0RHJhZyhDcmFmdHkubGFzdEV2ZW50KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZW5hYmxlRHJhZ1xuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5lbmFibGVEcmFnKHZvaWQpXG5cdCogXG5cdCogUmViaW5kIHRoZSBtb3VzZSBldmVudHMuIFVzZSBpZiBgLmRpc2FibGVEcmFnYCBoYXMgYmVlbiBjYWxsZWQuXG5cdCogXG5cdCogQHNlZSAuZGlzYWJsZURyYWdcblx0Ki9cblx0ZW5hYmxlRHJhZzogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuYmluZChcIk1vdXNlRG93blwiLCB0aGlzLl9vbmRvd24pO1xuXG5cdFx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgdGhpcy5fb251cCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZGlzYWJsZURyYWdcblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZGlzYWJsZURyYWcodm9pZClcblx0KiBcblx0KiBTdG9wcyBlbnRpdHkgZnJvbSBiZWluZyBkcmFnZ2FibGUuIFJlZW5hYmxlIHdpdGggYC5lbmFibGVEcmFnKClgLlxuXHQqIFxuXHQqIEBzZWUgLmVuYWJsZURyYWdcblx0Ki9cblx0ZGlzYWJsZURyYWc6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnVuYmluZChcIk1vdXNlRG93blwiLCB0aGlzLl9vbmRvd24pO1xuXHRcdHRoaXMuc3RvcERyYWcoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0tleWJvYXJkXG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBHaXZlIGVudGl0aWVzIGtleWJvYXJkIGV2ZW50cyAoYGtleWRvd25gIGFuZCBga2V5dXBgKS5cbiovXG5DcmFmdHkuYyhcIktleWJvYXJkXCIsIHtcbi8qKkBcblx0KiAjLmlzRG93blxuXHQqIEBjb21wIEtleWJvYXJkXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gaXNEb3duKFN0cmluZyBrZXlOYW1lKVxuXHQqIEBwYXJhbSBrZXlOYW1lIC0gTmFtZSBvZiB0aGUga2V5IHRvIGNoZWNrLiBTZWUgYENyYWZ0eS5rZXlzYC5cblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiBpc0Rvd24oTnVtYmVyIGtleUNvZGUpXG5cdCogQHBhcmFtIGtleUNvZGUgLSBLZXkgY29kZSBpbiBgQ3JhZnR5LmtleXNgLlxuXHQqIFxuXHQqIERldGVybWluZSBpZiBhIGNlcnRhaW4ga2V5IGlzIGN1cnJlbnRseSBkb3duLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogZW50aXR5LnJlcXVpcmVzKCdLZXlib2FyZCcpLmJpbmQoJ0tleURvd24nLCBmdW5jdGlvbiAoKSB7IGlmICh0aGlzLmlzRG93bignU1BBQ0UnKSkganVtcCgpOyB9KTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5rZXlzXG5cdCovXG5cdGlzRG93bjogZnVuY3Rpb24gKGtleSkge1xuXHRcdGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRrZXkgPSBDcmFmdHkua2V5c1trZXldO1xuXHRcdH1cblx0XHRyZXR1cm4gISFDcmFmdHkua2V5ZG93bltrZXldO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjTXVsdGl3YXlcbiogQGNhdGVnb3J5IElucHV0XG4qIFVzZWQgdG8gYmluZCBrZXlzIHRvIGRpcmVjdGlvbnMgYW5kIGhhdmUgdGhlIGVudGl0eSBtb3ZlIGFjY29yZGluZ2x5XG4qIEB0cmlnZ2VyIE5ld0RpcmVjdGlvbiAtIHRyaWdnZXJlZCB3aGVuIGRpcmVjdGlvbiBjaGFuZ2VzIC0geyB4Ok51bWJlciwgeTpOdW1iZXIgfSAtIE5ldyBkaXJlY3Rpb25cbiogQHRyaWdnZXIgTW92ZWQgLSB0cmlnZ2VyZWQgb24gbW92ZW1lbnQgb24gZWl0aGVyIHggb3IgeSBheGlzLiBJZiB0aGUgZW50aXR5IGhhcyBtb3ZlZCBvbiBib3RoIGF4ZXMgZm9yIGRpYWdvbmFsIG1vdmVtZW50IHRoZSBldmVudCBpcyB0cmlnZ2VyZWQgdHdpY2UgLSB7IHg6TnVtYmVyLCB5Ok51bWJlciB9IC0gT2xkIHBvc2l0aW9uXG4qL1xuQ3JhZnR5LmMoXCJNdWx0aXdheVwiLCB7XG5cdF9zcGVlZDogMyxcblxuICBfa2V5ZG93bjogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAodGhpcy5fa2V5c1tlLmtleV0pIHtcblx0XHRcdHRoaXMuX21vdmVtZW50LnggPSBNYXRoLnJvdW5kKCh0aGlzLl9tb3ZlbWVudC54ICsgdGhpcy5fa2V5c1tlLmtleV0ueCkgKiAxMDAwKSAvIDEwMDA7XG5cdFx0XHR0aGlzLl9tb3ZlbWVudC55ID0gTWF0aC5yb3VuZCgodGhpcy5fbW92ZW1lbnQueSArIHRoaXMuX2tleXNbZS5rZXldLnkpICogMTAwMCkgLyAxMDAwO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdOZXdEaXJlY3Rpb24nLCB0aGlzLl9tb3ZlbWVudCk7XG5cdFx0fVxuXHR9LFxuXG4gIF9rZXl1cDogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAodGhpcy5fa2V5c1tlLmtleV0pIHtcblx0XHRcdHRoaXMuX21vdmVtZW50LnggPSBNYXRoLnJvdW5kKCh0aGlzLl9tb3ZlbWVudC54IC0gdGhpcy5fa2V5c1tlLmtleV0ueCkgKiAxMDAwKSAvIDEwMDA7XG5cdFx0XHR0aGlzLl9tb3ZlbWVudC55ID0gTWF0aC5yb3VuZCgodGhpcy5fbW92ZW1lbnQueSAtIHRoaXMuX2tleXNbZS5rZXldLnkpICogMTAwMCkgLyAxMDAwO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdOZXdEaXJlY3Rpb24nLCB0aGlzLl9tb3ZlbWVudCk7XG5cdFx0fVxuXHR9LFxuXG4gIF9lbnRlcmZyYW1lOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuZGlzYWJsZUNvbnRyb2xzKSByZXR1cm47XG5cblx0XHRpZiAodGhpcy5fbW92ZW1lbnQueCAhPT0gMCkge1xuXHRcdFx0dGhpcy54ICs9IHRoaXMuX21vdmVtZW50Lng7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ01vdmVkJywgeyB4OiB0aGlzLnggLSB0aGlzLl9tb3ZlbWVudC54LCB5OiB0aGlzLnkgfSk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tb3ZlbWVudC55ICE9PSAwKSB7XG5cdFx0XHR0aGlzLnkgKz0gdGhpcy5fbW92ZW1lbnQueTtcblx0XHRcdHRoaXMudHJpZ2dlcignTW92ZWQnLCB7IHg6IHRoaXMueCwgeTogdGhpcy55IC0gdGhpcy5fbW92ZW1lbnQueSB9KTtcblx0XHR9XG5cdH0sXG5cblx0LyoqQFxuXHQqICMubXVsdGl3YXlcblx0KiBAY29tcCBNdWx0aXdheVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5tdWx0aXdheShbTnVtYmVyIHNwZWVkLF0gT2JqZWN0IGtleUJpbmRpbmdzIClcblx0KiBAcGFyYW0gc3BlZWQgLSBBbW91bnQgb2YgcGl4ZWxzIHRvIG1vdmUgdGhlIGVudGl0eSB3aGlsc3QgYSBrZXkgaXMgZG93blxuXHQqIEBwYXJhbSBrZXlCaW5kaW5ncyAtIFdoYXQga2V5cyBzaG91bGQgbWFrZSB0aGUgZW50aXR5IGdvIGluIHdoaWNoIGRpcmVjdGlvbi4gRGlyZWN0aW9uIGlzIHNwZWNpZmllZCBpbiBkZWdyZWVzXG5cdCogQ29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSB0aGUgc3BlZWQgYW5kIGtleUJpbmRpbmdzLiBDb21wb25lbnQgd2lsbCBsaXN0ZW4gdG8ga2V5IGV2ZW50cyBhbmQgbW92ZSB0aGUgZW50aXR5IGFwcHJvcHJpYXRlbHkuXG5cdCpcblx0KiBXaGVuIGRpcmVjdGlvbiBjaGFuZ2VzIGEgTmV3RGlyZWN0aW9uIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBkZXRhaWxpbmcgdGhlIG5ldyBkaXJlY3Rpb246IHt4OiB4X21vdmVtZW50LCB5OiB5X21vdmVtZW50fVxuXHQqIFdoZW4gZW50aXR5IGhhcyBtb3ZlZCBvbiBlaXRoZXIgeC0gb3IgeS1heGlzIGEgTW92ZWQgZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IHNwZWNpZnlpbmcgdGhlIG9sZCBwb3NpdGlvbiB7eDogb2xkX3gsIHk6IG9sZF95fVxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5tdWx0aXdheSgzLCB7VVBfQVJST1c6IC05MCwgRE9XTl9BUlJPVzogOTAsIFJJR0hUX0FSUk9XOiAwLCBMRUZUX0FSUk9XOiAxODB9KTtcblx0KiB0aGlzLm11bHRpd2F5KHt4OjMseToxLjV9LCB7VVBfQVJST1c6IC05MCwgRE9XTl9BUlJPVzogOTAsIFJJR0hUX0FSUk9XOiAwLCBMRUZUX0FSUk9XOiAxODB9KTtcblx0KiB0aGlzLm11bHRpd2F5KHtXOiAtOTAsIFM6IDkwLCBEOiAwLCBBOiAxODB9KTtcblx0KiB+fn5cblx0Ki9cblx0bXVsdGl3YXk6IGZ1bmN0aW9uIChzcGVlZCwga2V5cykge1xuXHRcdHRoaXMuX2tleURpcmVjdGlvbiA9IHt9O1xuXHRcdHRoaXMuX2tleXMgPSB7fTtcblx0XHR0aGlzLl9tb3ZlbWVudCA9IHsgeDogMCwgeTogMCB9O1xuXHRcdHRoaXMuX3NwZWVkID0geyB4OiAzLCB5OiAzIH07XG5cblx0XHRpZiAoa2V5cykge1xuXHRcdFx0aWYgKHNwZWVkLnggJiYgc3BlZWQueSkge1xuXHRcdFx0XHR0aGlzLl9zcGVlZC54ID0gc3BlZWQueDtcblx0XHRcdFx0dGhpcy5fc3BlZWQueSA9IHNwZWVkLnk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9zcGVlZC54ID0gc3BlZWQ7XG5cdFx0XHRcdHRoaXMuX3NwZWVkLnkgPSBzcGVlZDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0a2V5cyA9IHNwZWVkO1xuXHRcdH1cblxuXHRcdHRoaXMuX2tleURpcmVjdGlvbiA9IGtleXM7XG5cdFx0dGhpcy5zcGVlZCh0aGlzLl9zcGVlZCk7XG5cblx0XHR0aGlzLmRpc2FibGVDb250cm9sKCk7XG5cdFx0dGhpcy5lbmFibGVDb250cm9sKCk7XG5cblx0XHQvL0FwcGx5IG1vdmVtZW50IGlmIGtleSBpcyBkb3duIHdoZW4gY3JlYXRlZFxuXHRcdGZvciAodmFyIGsgaW4ga2V5cykge1xuXHRcdFx0aWYgKENyYWZ0eS5rZXlkb3duW0NyYWZ0eS5rZXlzW2tdXSkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoXCJLZXlEb3duXCIsIHsga2V5OiBDcmFmdHkua2V5c1trXSB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5lbmFibGVDb250cm9sXG5cdCogQGNvbXAgTXVsdGl3YXlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZW5hYmxlQ29udHJvbCgpXG5cdCogXG5cdCogRW5hYmxlIHRoZSBjb21wb25lbnQgdG8gbGlzdGVuIHRvIGtleSBldmVudHMuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuICAgICogdGhpcy5lbmFibGVDb250cm9sKCk7XG5cdCogfn5+XG5cdCovXG4gIGVuYWJsZUNvbnRyb2w6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYmluZChcIktleURvd25cIiwgdGhpcy5fa2V5ZG93bilcblx0XHQuYmluZChcIktleVVwXCIsIHRoaXMuX2tleXVwKVxuXHRcdC5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLl9lbnRlcmZyYW1lKTtcblx0XHRyZXR1cm4gdGhpcztcbiAgfSxcblxuXHQvKipAXG5cdCogIy5kaXNhYmxlQ29udHJvbFxuXHQqIEBjb21wIE11bHRpd2F5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRpc2FibGVDb250cm9sKClcblx0KiBcblx0KiBEaXNhYmxlIHRoZSBjb21wb25lbnQgdG8gbGlzdGVuIHRvIGtleSBldmVudHMuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuICAgICogdGhpcy5kaXNhYmxlQ29udHJvbCgpO1xuXHQqIH5+flxuXHQqL1xuXG4gIGRpc2FibGVDb250cm9sOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnVuYmluZChcIktleURvd25cIiwgdGhpcy5fa2V5ZG93bilcblx0XHQudW5iaW5kKFwiS2V5VXBcIiwgdGhpcy5fa2V5dXApXG5cdFx0LnVuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy5fZW50ZXJmcmFtZSk7XG5cdFx0cmV0dXJuIHRoaXM7XG4gIH0sXG5cblx0c3BlZWQ6IGZ1bmN0aW9uIChzcGVlZCkge1xuXHRcdGZvciAodmFyIGsgaW4gdGhpcy5fa2V5RGlyZWN0aW9uKSB7XG5cdFx0XHR2YXIga2V5Q29kZSA9IENyYWZ0eS5rZXlzW2tdIHx8IGs7XG5cdFx0XHR0aGlzLl9rZXlzW2tleUNvZGVdID0ge1xuXHRcdFx0XHR4OiBNYXRoLnJvdW5kKE1hdGguY29zKHRoaXMuX2tleURpcmVjdGlvbltrXSAqIChNYXRoLlBJIC8gMTgwKSkgKiAxMDAwICogc3BlZWQueCkgLyAxMDAwLFxuXHRcdFx0XHR5OiBNYXRoLnJvdW5kKE1hdGguc2luKHRoaXMuX2tleURpcmVjdGlvbltrXSAqIChNYXRoLlBJIC8gMTgwKSkgKiAxMDAwICogc3BlZWQueSkgLyAxMDAwXG5cdFx0XHR9O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0ZvdXJ3YXlcbiogQGNhdGVnb3J5IElucHV0XG4qIE1vdmUgYW4gZW50aXR5IGluIGZvdXIgZGlyZWN0aW9ucyBieSB1c2luZyB0aGVcbiogYXJyb3cga2V5cyBvciBgV2AsIGBBYCwgYFNgLCBgRGAuXG4qL1xuQ3JhZnR5LmMoXCJGb3Vyd2F5XCIsIHtcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcyhcIk11bHRpd2F5XCIpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmZvdXJ3YXlcblx0KiBAY29tcCBGb3Vyd2F5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmZvdXJ3YXkoTnVtYmVyIHNwZWVkKVxuXHQqIEBwYXJhbSBzcGVlZCAtIEFtb3VudCBvZiBwaXhlbHMgdG8gbW92ZSB0aGUgZW50aXR5IHdoaWxzdCBhIGtleSBpcyBkb3duXG5cdCogQ29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSB0aGUgc3BlZWQuIENvbXBvbmVudCB3aWxsIGxpc3RlbiBmb3Iga2V5IGV2ZW50cyBhbmQgbW92ZSB0aGUgZW50aXR5IGFwcHJvcHJpYXRlbHkuXG5cdCogVGhpcyBpbmNsdWRlcyBgVXAgQXJyb3dgLCBgUmlnaHQgQXJyb3dgLCBgRG93biBBcnJvd2AsIGBMZWZ0IEFycm93YCBhcyB3ZWxsIGFzIGBXYCwgYEFgLCBgU2AsIGBEYC5cblx0KlxuXHQqIFdoZW4gZGlyZWN0aW9uIGNoYW5nZXMgYSBOZXdEaXJlY3Rpb24gZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IGRldGFpbGluZyB0aGUgbmV3IGRpcmVjdGlvbjoge3g6IHhfbW92ZW1lbnQsIHk6IHlfbW92ZW1lbnR9XG5cdCogV2hlbiBlbnRpdHkgaGFzIG1vdmVkIG9uIGVpdGhlciB4LSBvciB5LWF4aXMgYSBNb3ZlZCBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3Qgc3BlY2lmeWluZyB0aGUgb2xkIHBvc2l0aW9uIHt4OiBvbGRfeCwgeTogb2xkX3l9XG5cdCpcblx0KiBUaGUga2V5IHByZXNzZXMgd2lsbCBtb3ZlIHRoZSBlbnRpdHkgaW4gdGhhdCBkaXJlY3Rpb24gYnkgdGhlIHNwZWVkIHBhc3NlZCBpbiB0aGUgYXJndW1lbnQuXG5cdCogXG5cdCogQHNlZSBNdWx0aXdheVxuXHQqL1xuXHRmb3Vyd2F5OiBmdW5jdGlvbiAoc3BlZWQpIHtcblx0XHR0aGlzLm11bHRpd2F5KHNwZWVkLCB7XG5cdFx0XHRVUF9BUlJPVzogLTkwLFxuXHRcdFx0RE9XTl9BUlJPVzogOTAsXG5cdFx0XHRSSUdIVF9BUlJPVzogMCxcblx0XHRcdExFRlRfQVJST1c6IDE4MCxcblx0XHRcdFc6IC05MCxcblx0XHRcdFM6IDkwLFxuXHRcdFx0RDogMCxcblx0XHRcdEE6IDE4MCxcblx0XHRcdFo6IC05MCxcblx0XHRcdFE6IDE4MFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNUd293YXlcbiogQGNhdGVnb3J5IElucHV0XG4qIE1vdmUgYW4gZW50aXR5IGxlZnQgb3IgcmlnaHQgdXNpbmcgdGhlIGFycm93IGtleXMgb3IgYERgIGFuZCBgQWAgYW5kIGp1bXAgdXNpbmcgdXAgYXJyb3cgb3IgYFdgLlxuKlxuKiBXaGVuIGRpcmVjdGlvbiBjaGFuZ2VzIGEgTmV3RGlyZWN0aW9uIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBkZXRhaWxpbmcgdGhlIG5ldyBkaXJlY3Rpb246IHt4OiB4X21vdmVtZW50LCB5OiB5X21vdmVtZW50fS4gVGhpcyBpcyBjb25zaXN0ZW50IHdpdGggRm91cndheSBhbmQgTXVsdGl3YXkgY29tcG9uZW50cy5cbiogV2hlbiBlbnRpdHkgaGFzIG1vdmVkIG9uIHgtYXhpcyBhIE1vdmVkIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBzcGVjaWZ5aW5nIHRoZSBvbGQgcG9zaXRpb24ge3g6IG9sZF94LCB5OiBvbGRfeX1cbiovXG5DcmFmdHkuYyhcIlR3b3dheVwiLCB7XG5cdF9zcGVlZDogMyxcblx0X3VwOiBmYWxzZSxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcyhcIkZvdXJ3YXksIEtleWJvYXJkXCIpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnR3b3dheVxuXHQqIEBjb21wIFR3b3dheVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC50d293YXkoTnVtYmVyIHNwZWVkWywgTnVtYmVyIGp1bXBTcGVlZF0pXG5cdCogQHBhcmFtIHNwZWVkIC0gQW1vdW50IG9mIHBpeGVscyB0byBtb3ZlIGxlZnQgb3IgcmlnaHRcblx0KiBAcGFyYW0ganVtcFNwZWVkIC0gSG93IGhpZ2ggdGhlIGVudGl0eSBzaG91bGQganVtcFxuXHQqIFxuXHQqIENvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUgdGhlIHNwZWVkIGFuZCBwb3dlciBvZiBqdW1wLiBDb21wb25lbnQgd2lsbFxuXHQqIGxpc3RlbiBmb3Iga2V5IGV2ZW50cyBhbmQgbW92ZSB0aGUgZW50aXR5IGFwcHJvcHJpYXRlbHkuIFRoaXMgaW5jbHVkZXNcblx0KiB+fn5cblx0KiBgVXAgQXJyb3dgLCBgUmlnaHQgQXJyb3dgLCBgTGVmdCBBcnJvd2AgYXMgd2VsbCBhcyBXLCBBLCBELiBVc2VkIHdpdGggdGhlXG5cdCogYGdyYXZpdHlgIGNvbXBvbmVudCB0byBzaW11bGF0ZSBqdW1waW5nLlxuXHQqIH5+flxuXHQqIFxuXHQqIFRoZSBrZXkgcHJlc3NlcyB3aWxsIG1vdmUgdGhlIGVudGl0eSBpbiB0aGF0IGRpcmVjdGlvbiBieSB0aGUgc3BlZWQgcGFzc2VkIGluXG5cdCogdGhlIGFyZ3VtZW50LiBQcmVzc2luZyB0aGUgYFVwIEFycm93YCBvciBgV2Agd2lsbCBjYXVzZSB0aGUgZW50aXR5IHRvIGp1bXAuXG5cdCogXG5cdCogQHNlZSBHcmF2aXR5LCBGb3Vyd2F5XG5cdCovXG5cdHR3b3dheTogZnVuY3Rpb24gKHNwZWVkLCBqdW1wKSB7XG5cblx0XHR0aGlzLm11bHRpd2F5KHNwZWVkLCB7XG5cdFx0XHRSSUdIVF9BUlJPVzogMCxcblx0XHRcdExFRlRfQVJST1c6IDE4MCxcblx0XHRcdEQ6IDAsXG5cdFx0XHRBOiAxODAsXG5cdFx0XHRROiAxODBcblx0XHR9KTtcblxuXHRcdGlmIChzcGVlZCkgdGhpcy5fc3BlZWQgPSBzcGVlZDtcblx0XHRqdW1wID0ganVtcCB8fCB0aGlzLl9zcGVlZCAqIDI7XG5cblx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLmRpc2FibGVDb250cm9scykgcmV0dXJuO1xuXHRcdFx0aWYgKHRoaXMuX3VwKSB7XG5cdFx0XHRcdHRoaXMueSAtPSBqdW1wO1xuXHRcdFx0XHR0aGlzLl9mYWxsaW5nID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KS5iaW5kKFwiS2V5RG93blwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5pc0Rvd24oXCJVUF9BUlJPV1wiKSB8fCB0aGlzLmlzRG93bihcIldcIikgfHwgdGhpcy5pc0Rvd24oXCJaXCIpKSB0aGlzLl91cCA9IHRydWU7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI1Nwcml0ZUFuaW1hdGlvblxuKiBAY2F0ZWdvcnkgQW5pbWF0aW9uXG4qIEB0cmlnZ2VyIEFuaW1hdGlvbkVuZCAtIFdoZW4gdGhlIGFuaW1hdGlvbiBmaW5pc2hlcyAtIHsgcmVlbCB9XG4qIEB0cmlnZ2VyIENoYW5nZSAtIE9uIGVhY2ggZnJhbWVcbipcbiogVXNlZCB0byBhbmltYXRlIHNwcml0ZXMgYnkgY2hhbmdpbmcgdGhlIHNwcml0ZXMgaW4gdGhlIHNwcml0ZSBtYXAuXG4qXG4qL1xuQ3JhZnR5LmMoXCJTcHJpdGVBbmltYXRpb25cIiwge1xuLyoqQFxuXHQqICMuX3JlZWxzXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCpcblx0KiBBIG1hcCBjb25zaXN0cyBvZiBhcnJheXMgdGhhdCBjb250YWlucyB0aGUgY29vcmRpbmF0ZXMgb2YgZWFjaCBmcmFtZSB3aXRoaW4gdGhlIHNwcml0ZSwgZS5nLixcbiAgICAqIGB7XCJ3YWxrX2xlZnRcIjpbWzk2LDQ4XSxbMTEyLDQ4XSxbMTI4LDQ4XV19YFxuXHQqL1xuXHRfcmVlbHM6IG51bGwsXG5cdF9mcmFtZTogbnVsbCxcblxuXHQvKipAXG5cdCogIy5fY3VycmVudFJlZWxJZFxuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqXG5cdCogVGhlIGN1cnJlbnQgcGxheWluZyByZWVsIChvbmUgZWxlbWVudCBvZiBgdGhpcy5fcmVlbHNgKS4gSXQgaXMgYG51bGxgIGlmIG5vIHJlZWwgaXMgcGxheWluZy5cblx0Ki9cblx0X2N1cnJlbnRSZWVsSWQ6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX3JlZWxzID0ge307XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuYW5pbWF0ZVxuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hbmltYXRlKFN0cmluZyByZWVsSWQsIE51bWJlciBmcm9tWCwgTnVtYmVyIHksIE51bWJlciB0b1gpXG5cdCogQHBhcmFtIHJlZWxJZCAtIElEIG9mIHRoZSBhbmltYXRpb24gcmVlbCBiZWluZyBjcmVhdGVkXG5cdCogQHBhcmFtIGZyb21YIC0gU3RhcnRpbmcgYHhgIHBvc2l0aW9uIChpbiB0aGUgdW5pdCBvZiBzcHJpdGUgaG9yaXpvbnRhbCBzaXplKSBvbiB0aGUgc3ByaXRlIG1hcFxuXHQqIEBwYXJhbSB5IC0gYHlgIHBvc2l0aW9uIG9uIHRoZSBzcHJpdGUgbWFwIChpbiB0aGUgdW5pdCBvZiBzcHJpdGUgdmVydGljYWwgc2l6ZSkuIFJlbWFpbnMgY29uc3RhbnQgdGhyb3VnaCB0aGUgYW5pbWF0aW9uLlxuXHQqIEBwYXJhbSB0b1ggLSBFbmQgYHhgIHBvc2l0aW9uIG9uIHRoZSBzcHJpdGUgbWFwIChpbiB0aGUgdW5pdCBvZiBzcHJpdGUgaG9yaXpvbnRhbCBzaXplKVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hbmltYXRlKFN0cmluZyByZWVsSWQsIEFycmF5IGZyYW1lcylcblx0KiBAcGFyYW0gcmVlbElkIC0gSUQgb2YgdGhlIGFuaW1hdGlvbiByZWVsIGJlaW5nIGNyZWF0ZWRcblx0KiBAcGFyYW0gZnJhbWVzIC0gQXJyYXkgb2YgYXJyYXlzIGNvbnRhaW5pbmcgdGhlIGB4YCBhbmQgYHlgIHZhbHVlczogW1t4MSx5MV0sW3gyLHkyXSwuLi5dXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFuaW1hdGUoU3RyaW5nIHJlZWxJZCwgTnVtYmVyIGR1cmF0aW9uWywgTnVtYmVyIHJlcGVhdENvdW50XSlcblx0KiBAcGFyYW0gcmVlbElkIC0gSUQgb2YgdGhlIGFuaW1hdGlvbiByZWVsIHRvIHBsYXlcblx0KiBAcGFyYW0gZHVyYXRpb24gLSBQbGF5IHRoZSBhbmltYXRpb24gd2l0aGluIGEgZHVyYXRpb24gKGluIGZyYW1lcylcblx0KiBAcGFyYW0gcmVwZWF0Q291bnQgLSBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBhbmltYXRpb24uIFVzZSAtMSBmb3IgaW5maW5pdGVseVxuXHQqXG5cdCogTWV0aG9kIHRvIHNldHVwIGFuaW1hdGlvbiByZWVscyBvciBwbGF5IHByZS1tYWRlIHJlZWxzLiBBbmltYXRpb24gd29ya3MgYnkgY2hhbmdpbmcgdGhlIHNwcml0ZXMgb3ZlclxuXHQqIGEgZHVyYXRpb24uIE9ubHkgd29ya3MgZm9yIHNwcml0ZXMgYnVpbHQgd2l0aCB0aGUgQ3JhZnR5LnNwcml0ZSBtZXRob2RzLiBTZWUgdGhlIFR3ZWVuIGNvbXBvbmVudCBmb3IgYW5pbWF0aW9uIG9mIDJEIHByb3BlcnRpZXMuXG5cdCpcblx0KiBUbyBzZXR1cCBhbiBhbmltYXRpb24gcmVlbCwgcGFzcyB0aGUgbmFtZSBvZiB0aGUgcmVlbCAodXNlZCB0byBpZGVudGlmeSB0aGUgcmVlbCBhbmQgcGxheSBpdCBsYXRlciksIGFuZCBlaXRoZXIgYW5cblx0KiBhcnJheSBvZiBhYnNvbHV0ZSBzcHJpdGUgcG9zaXRpb25zIG9yIHRoZSBzdGFydCB4IG9uIHRoZSBzcHJpdGUgbWFwLCB0aGUgeSBvbiB0aGUgc3ByaXRlIG1hcCBhbmQgdGhlbiB0aGUgZW5kIHggb24gdGhlIHNwcml0ZSBtYXAuXG5cdCpcblx0KiBUbyBwbGF5IGEgcmVlbCwgcGFzcyB0aGUgbmFtZSBvZiB0aGUgcmVlbCBhbmQgdGhlIGR1cmF0aW9uIGl0IHNob3VsZCBwbGF5IGZvciAoaW4gZnJhbWVzKS4gSWYgeW91IG5lZWRcblx0KiB0byByZXBlYXQgdGhlIGFuaW1hdGlvbiwgc2ltcGx5IHBhc3MgaW4gdGhlIGFtb3VudCBvZiB0aW1lcyB0aGUgYW5pbWF0aW9uIHNob3VsZCByZXBlYXQuIFRvIHJlcGVhdFxuXHQqIGZvcmV2ZXIsIHBhc3MgaW4gYC0xYC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LnNwcml0ZSgxNiwgXCJpbWFnZXMvc3ByaXRlLnBuZ1wiLCB7XG5cdCogICAgIFBsYXllclNwcml0ZTogWzAsMF1cblx0KiB9KTtcblx0KlxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgU3ByaXRlQW5pbWF0aW9uLCBQbGF5ZXJTcHJpdGVcIilcblx0KiAgICAgLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAwLCAwLCAzKSAvL3NldHVwIGFuaW1hdGlvblxuXHQqICAgICAuYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDE1LCAtMSkgLy8gc3RhcnQgYW5pbWF0aW9uXG5cdCpcblx0KiBDcmFmdHkuZShcIjJELCBET00sIFNwcml0ZUFuaW1hdGlvbiwgUGxheWVyU3ByaXRlXCIpXG5cdCogICAgIC5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMCwgMywgMCkgLy9zZXR1cCBhbmltYXRpb25cblx0KiAgICAgLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAxNSwgLTEpIC8vIHN0YXJ0IGFuaW1hdGlvblxuXHQqIH5+flxuXHQqXG5cdCogQHNlZSBjcmFmdHkuc3ByaXRlXG5cdCovXG5cdGFuaW1hdGU6IGZ1bmN0aW9uIChyZWVsSWQsIGZyb214LCB5LCB0b3gpIHtcblx0XHR2YXIgcmVlbCwgaSwgdGlsZSwgdGlsZWgsIGR1cmF0aW9uLCBwb3M7XG5cblx0XHQvL3BsYXkgYSByZWVsXG5cdFx0Ly8uYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDE1LCAtMSkgLy8gc3RhcnQgYW5pbWF0aW9uXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPCA0ICYmIHR5cGVvZiBmcm9teCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0ZHVyYXRpb24gPSBmcm9teDtcblxuXHRcdFx0Ly9tYWtlIHN1cmUgbm90IGN1cnJlbnRseSBhbmltYXRpbmdcblx0XHRcdHRoaXMuX2N1cnJlbnRSZWVsSWQgPSByZWVsSWQ7XG5cblx0XHRcdGN1cnJlbnRSZWVsID0gdGhpcy5fcmVlbHNbcmVlbElkXTtcblxuXHRcdFx0dGhpcy5fZnJhbWUgPSB7XG5cdFx0XHRcdGN1cnJlbnRSZWVsOiBjdXJyZW50UmVlbCxcblx0XHRcdFx0bnVtYmVyT2ZGcmFtZXNCZXR3ZWVuU2xpZGVzOiBNYXRoLmNlaWwoZHVyYXRpb24gLyBjdXJyZW50UmVlbC5sZW5ndGgpLFxuXHRcdFx0XHRjdXJyZW50U2xpZGVOdW1iZXI6IDAsXG5cdFx0XHRcdGZyYW1lTnVtYmVyQmV0d2VlblNsaWRlczogMCxcblx0XHRcdFx0cmVwZWF0OiAwXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMgJiYgdHlwZW9mIHkgPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdFx0Ly9Vc2VyIHByb3ZpZGVkIHJlcGV0aXRpb24gY291bnRcblx0XHRcdFx0aWYgKHkgPT09IC0xKSB0aGlzLl9mcmFtZS5yZXBlYXRJbmZpbml0bHkgPSB0cnVlO1xuXHRcdFx0XHRlbHNlIHRoaXMuX2ZyYW1lLnJlcGVhdCA9IHk7XG5cdFx0XHR9XG5cblx0XHRcdHBvcyA9IHRoaXMuX2ZyYW1lLmN1cnJlbnRSZWVsWzBdO1xuXHRcdFx0dGhpcy5fX2Nvb3JkWzBdID0gcG9zWzBdO1xuXHRcdFx0dGhpcy5fX2Nvb3JkWzFdID0gcG9zWzFdO1xuXG5cdFx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMudXBkYXRlU3ByaXRlKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHQvLyAuYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDAsIDAsIDMpIC8vc2V0dXAgYW5pbWF0aW9uXG5cdFx0aWYgKHR5cGVvZiBmcm9teCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0Ly8gRGVmaW5kIGluIFNwcml0ZSBjb21wb25lbnQuXG5cdFx0XHR0aWxlID0gdGhpcy5fX3RpbGUgKyBwYXJzZUludCh0aGlzLl9fcGFkZGluZ1swXSB8fCAwLCAxMCk7XG5cdFx0XHR0aWxlaCA9IHRoaXMuX190aWxlaCArIHBhcnNlSW50KHRoaXMuX19wYWRkaW5nWzFdIHx8IDAsIDEwKTtcblxuXHRcdFx0cmVlbCA9IFtdO1xuXHRcdFx0aSA9IGZyb214O1xuXHRcdFx0aWYgKHRveCA+IGZyb214KSB7XG5cdFx0XHRcdGZvciAoOyBpIDw9IHRveDsgaSsrKSB7XG5cdFx0XHRcdFx0cmVlbC5wdXNoKFtpICogdGlsZSwgeSAqIHRpbGVoXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoOyBpID49IHRveDsgaS0tKSB7XG5cdFx0XHRcdFx0cmVlbC5wdXNoKFtpICogdGlsZSwgeSAqIHRpbGVoXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fcmVlbHNbcmVlbElkXSA9IHJlZWw7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgZnJvbXggPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdC8vIEBzaWduIHB1YmxpYyB0aGlzIC5hbmltYXRlKHJlZWxJZCwgW1t4MSx5MV0sW3gyLHkyXSwuLi5dKVxuXHRcdFx0aSA9IDA7XG5cdFx0XHRyZWVsID0gW107XG5cdFx0XHR0b3ggPSBmcm9teC5sZW5ndGggLSAxO1xuXHRcdFx0dGlsZSA9IHRoaXMuX190aWxlICsgcGFyc2VJbnQodGhpcy5fX3BhZGRpbmdbMF0gfHwgMCwgMTApO1xuXHRcdFx0dGlsZWggPSB0aGlzLl9fdGlsZWggKyBwYXJzZUludCh0aGlzLl9fcGFkZGluZ1sxXSB8fCAwLCAxMCk7XG5cblx0XHRcdGZvciAoOyBpIDw9IHRveDsgaSsrKSB7XG5cdFx0XHRcdHBvcyA9IGZyb214W2ldO1xuXHRcdFx0XHRyZWVsLnB1c2goW3Bvc1swXSAqIHRpbGUsIHBvc1sxXSAqIHRpbGVoXSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3JlZWxzW3JlZWxJZF0gPSByZWVsO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnVwZGF0ZVNwcml0ZVxuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqIEBzaWduIHByaXZhdGUgdm9pZCAudXBkYXRlU3ByaXRlKClcblx0KlxuXHQqIFRoaXMgaXMgY2FsbGVkIGF0IGV2ZXJ5IGBFbnRlckZyYW1lYCBldmVudCB3aGVuIGAuYW5pbWF0ZSgpYCBlbmFibGVzIGFuaW1hdGlvbi4gSXQgdXBkYXRlIHRoZSBTcHJpdGVBbmltYXRpb24gY29tcG9uZW50IHdoZW4gdGhlIHNsaWRlIGluIHRoZSBzcHJpdGUgc2hvdWxkIGJlIHVwZGF0ZWQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy51cGRhdGVTcHJpdGUpO1xuXHQqIH5+flxuXHQqXG5cdCogQHNlZSBjcmFmdHkuc3ByaXRlXG5cdCovXG5cdHVwZGF0ZVNwcml0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBkYXRhID0gdGhpcy5fZnJhbWU7XG5cdFx0aWYgKCFkYXRhKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2ZyYW1lLmZyYW1lTnVtYmVyQmV0d2VlblNsaWRlcysrID09PSBkYXRhLm51bWJlck9mRnJhbWVzQmV0d2VlblNsaWRlcykge1xuXHRcdFx0dmFyIHBvcyA9IGRhdGEuY3VycmVudFJlZWxbZGF0YS5jdXJyZW50U2xpZGVOdW1iZXIrK107XG5cblx0XHRcdHRoaXMuX19jb29yZFswXSA9IHBvc1swXTtcblx0XHRcdHRoaXMuX19jb29yZFsxXSA9IHBvc1sxXTtcblx0XHRcdHRoaXMuX2ZyYW1lLmZyYW1lTnVtYmVyQmV0d2VlblNsaWRlcyA9IDA7XG5cdFx0fVxuXG5cblx0XHRpZiAoZGF0YS5jdXJyZW50U2xpZGVOdW1iZXIgPT09IGRhdGEuY3VycmVudFJlZWwubGVuZ3RoKSB7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLl9mcmFtZS5yZXBlYXRJbmZpbml0bHkgPT09IHRydWUgfHwgdGhpcy5fZnJhbWUucmVwZWF0ID4gMCkge1xuXHRcdFx0XHRpZiAodGhpcy5fZnJhbWUucmVwZWF0KSB0aGlzLl9mcmFtZS5yZXBlYXQtLTtcblx0XHRcdFx0dGhpcy5fZnJhbWUuZnJhbWVOdW1iZXJCZXR3ZWVuU2xpZGVzID0gMDtcblx0XHRcdFx0dGhpcy5fZnJhbWUuY3VycmVudFNsaWRlTnVtYmVyID0gMDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLl9mcmFtZS5mcmFtZU51bWJlckJldHdlZW5TbGlkZXMgPT09IGRhdGEubnVtYmVyT2ZGcmFtZXNCZXR3ZWVuU2xpZGVzKSB7XG5cdFx0XHRcdCAgICB0aGlzLnRyaWdnZXIoXCJBbmltYXRpb25FbmRcIiwgeyByZWVsOiBkYXRhLmN1cnJlbnRSZWVsIH0pO1xuXHRcdFx0XHQgICAgdGhpcy5zdG9wKCk7XG5cdFx0XHRcdCAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnN0b3Bcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuc3RvcCh2b2lkKVxuXHQqXG5cdCogU3RvcCBhbnkgYW5pbWF0aW9uIGN1cnJlbnRseSBwbGF5aW5nLlxuXHQqL1xuXHRzdG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy51bmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMudXBkYXRlU3ByaXRlKTtcblx0XHR0aGlzLnVuYmluZChcIkFuaW1hdGlvbkVuZFwiKTtcblx0XHR0aGlzLl9jdXJyZW50UmVlbElkID0gbnVsbDtcblx0XHR0aGlzLl9mcmFtZSA9IG51bGw7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5yZXNldFxuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5yZXNldCh2b2lkKVxuXHQqXG5cdCogTWV0aG9kIHdpbGwgcmVzZXQgdGhlIGVudGl0aWVzIHNwcml0ZSB0byBpdHMgb3JpZ2luYWwuXG5cdCovXG5cdHJlc2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9mcmFtZSkgcmV0dXJuIHRoaXM7XG5cblx0XHR2YXIgY28gPSB0aGlzLl9mcmFtZS5jdXJyZW50UmVlbFswXTtcblx0XHR0aGlzLl9fY29vcmRbMF0gPSBjb1swXTtcblx0XHR0aGlzLl9fY29vcmRbMV0gPSBjb1sxXTtcblx0XHR0aGlzLnN0b3AoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmlzUGxheWluZ1xuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5pc1BsYXlpbmcoW1N0cmluZyByZWVsSWRdKVxuXHQqIEBwYXJhbSByZWVsSWQgLSBEZXRlcm1pbmUgaWYgdGhlIGFuaW1hdGlvbiByZWVsIHdpdGggdGhpcyByZWVsSWQgaXMgcGxheWluZy5cblx0KlxuXHQqIERldGVybWluZXMgaWYgYW4gYW5pbWF0aW9uIGlzIGN1cnJlbnRseSBwbGF5aW5nLiBJZiBhIHJlZWwgaXMgcGFzc2VkLCBpdCB3aWxsIGRldGVybWluZVxuXHQqIGlmIHRoZSBwYXNzZWQgcmVlbCBpcyBwbGF5aW5nLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBteUVudGl0eS5pc1BsYXlpbmcoKSAvL2lzIGFueSBhbmltYXRpb24gcGxheWluZ1xuXHQqIG15RW50aXR5LmlzUGxheWluZygnUGxheWVyUnVubmluZycpIC8vaXMgdGhlIFBsYXllclJ1bm5pbmcgYW5pbWF0aW9uIHBsYXlpbmdcblx0KiB+fn5cblx0Ki9cblx0aXNQbGF5aW5nOiBmdW5jdGlvbiAocmVlbElkKSB7XG5cdFx0aWYgKCFyZWVsSWQpIHJldHVybiAhIXRoaXMuX2N1cnJlbnRSZWVsSWQ7XG5cdFx0cmV0dXJuIHRoaXMuX2N1cnJlbnRSZWVsSWQgPT09IHJlZWxJZDtcblx0fVxufSk7XG5cbi8qKkBcbiogI1R3ZWVuXG4qIEBjYXRlZ29yeSBBbmltYXRpb25cbiogQHRyaWdnZXIgVHdlZW5FbmQgLSB3aGVuIGEgdHdlZW4gZmluaXNoZXMgLSBTdHJpbmcgLSBwcm9wZXJ0eVxuKlxuKiBDb21wb25lbnQgdG8gYW5pbWF0ZSB0aGUgY2hhbmdlIGluIDJEIHByb3BlcnRpZXMgb3ZlciB0aW1lLlxuKi9cbkNyYWZ0eS5jKFwiVHdlZW5cIiwge1xuXHRfc3RlcDogbnVsbCxcblx0X251bVByb3BzOiAwLFxuXG5cdC8qKkBcblx0KiAjLnR3ZWVuXG5cdCogQGNvbXAgVHdlZW5cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAudHdlZW4oT2JqZWN0IHByb3BlcnRpZXMsIE51bWJlciBkdXJhdGlvbilcblx0KiBAcGFyYW0gcHJvcGVydGllcyAtIE9iamVjdCBvZiAyRCBwcm9wZXJ0aWVzIGFuZCB3aGF0IHRoZXkgc2hvdWxkIGFuaW1hdGUgdG9cblx0KiBAcGFyYW0gZHVyYXRpb24gLSBEdXJhdGlvbiB0byBhbmltYXRlIHRoZSBwcm9wZXJ0aWVzIG92ZXIgKGluIGZyYW1lcylcblx0KlxuXHQqIFRoaXMgbWV0aG9kIHdpbGwgYW5pbWF0ZSBhIDJEIGVudGl0aWVzIHByb3BlcnRpZXMgb3ZlciB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uLlxuXHQqIFRoZXNlIGluY2x1ZGUgYHhgLCBgeWAsIGB3YCwgYGhgLCBgYWxwaGFgIGFuZCBgcm90YXRpb25gLlxuXHQqXG5cdCogVGhlIG9iamVjdCBwYXNzZWQgc2hvdWxkIGhhdmUgdGhlIHByb3BlcnRpZXMgYXMga2V5cyBhbmQgdGhlIHZhbHVlIHNob3VsZCBiZSB0aGUgcmVzdWx0aW5nXG5cdCogdmFsdWVzIG9mIHRoZSBwcm9wZXJ0aWVzLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBNb3ZlIGFuIG9iamVjdCB0byAxMDAsMTAwIGFuZCBmYWRlIG91dCBpbiAyMDAgZnJhbWVzLlxuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiMkQsIFR3ZWVuXCIpXG5cdCogICAgLmF0dHIoe2FscGhhOiAxLjAsIHg6IDAsIHk6IDB9KVxuXHQqICAgIC50d2Vlbih7YWxwaGE6IDAuMCwgeDogMTAwLCB5OiAxMDB9LCAyMDApXG5cdCogfn5+XG5cdCovXG5cdHR3ZWVuOiBmdW5jdGlvbiAocHJvcHMsIGR1cmF0aW9uKSB7XG5cdFx0dGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLl9zdGVwID09IG51bGwpIHtcblx0XHRcdFx0dGhpcy5fc3RlcCA9IHt9O1xuXHRcdFx0XHR0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCB0d2VlbkVudGVyRnJhbWUpO1xuXHRcdFx0XHR0aGlzLmJpbmQoJ1JlbW92ZUNvbXBvbmVudCcsIGZ1bmN0aW9uIChjKSB7XG5cdFx0XHRcdFx0aWYgKGMgPT0gJ1R3ZWVuJykge1xuXHRcdFx0XHRcdFx0dGhpcy51bmJpbmQoJ0VudGVyRnJhbWUnLCB0d2VlbkVudGVyRnJhbWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIHByb3AgaW4gcHJvcHMpIHtcblx0XHRcdFx0dGhpcy5fc3RlcFtwcm9wXSA9IHsgcHJvcDogcHJvcHNbcHJvcF0sIHZhbDogKHByb3BzW3Byb3BdIC0gdGhpc1twcm9wXSkgLyBkdXJhdGlvbiwgcmVtOiBkdXJhdGlvbiB9O1xuXHRcdFx0XHR0aGlzLl9udW1Qcm9wcysrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuZnVuY3Rpb24gdHdlZW5FbnRlckZyYW1lKGUpIHtcblx0aWYgKHRoaXMuX251bVByb3BzIDw9IDApIHJldHVybjtcblxuXHR2YXIgcHJvcCwgaztcblx0Zm9yIChrIGluIHRoaXMuX3N0ZXApIHtcblx0XHRwcm9wID0gdGhpcy5fc3RlcFtrXTtcblx0XHR0aGlzW2tdICs9IHByb3AudmFsO1xuXHRcdGlmICgtLXByb3AucmVtID09IDApIHtcblx0XHRcdC8vIGRlY2ltYWwgbnVtYmVycyByb3VuZGluZyBmaXhcblx0XHRcdHRoaXNba10gPSBwcm9wLnByb3A7XG5cdFx0XHR0aGlzLnRyaWdnZXIoXCJUd2VlbkVuZFwiLCBrKTtcblx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgZHVyYXRpb24gd2Fzbid0IGNoYW5nZWQgaW4gVHdlZW5FbmRcblx0XHRcdGlmICh0aGlzLl9zdGVwW2tdLnJlbSA8PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9zdGVwW2tdO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fbnVtUHJvcHMtLTtcblx0XHR9XG5cdH1cblxuXHRpZiAodGhpcy5oYXMoJ01vdXNlJykpIHtcblx0XHR2YXIgb3ZlciA9IENyYWZ0eS5vdmVyLFxuXHRcdFx0bW91c2UgPSBDcmFmdHkubW91c2VQb3M7XG5cdFx0aWYgKG92ZXIgJiYgb3ZlclswXSA9PSB0aGlzWzBdICYmICF0aGlzLmlzQXQobW91c2UueCwgbW91c2UueSkpIHtcblx0XHRcdHRoaXMudHJpZ2dlcignTW91c2VPdXQnLCBDcmFmdHkubGFzdEV2ZW50KTtcblx0XHRcdENyYWZ0eS5vdmVyID0gbnVsbDtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoKCFvdmVyIHx8IG92ZXJbMF0gIT0gdGhpc1swXSkgJiYgdGhpcy5pc0F0KG1vdXNlLngsIG1vdXNlLnkpKSB7XG5cdFx0XHRDcmFmdHkub3ZlciA9IHRoaXM7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ01vdXNlT3ZlcicsIENyYWZ0eS5sYXN0RXZlbnQpO1xuXHRcdH1cblx0fVxufVxuXG5cbi8qKkBcbiogI0NvbG9yXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBEcmF3IGEgc29saWQgY29sb3IgZm9yIHRoZSBlbnRpdHlcbiovXG5DcmFmdHkuYyhcIkNvbG9yXCIsIHtcblx0X2NvbG9yOiBcIlwiLFxuXHRyZWFkeTogdHJ1ZSxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5iaW5kKFwiRHJhd1wiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUudHlwZSA9PT0gXCJET01cIikge1xuXHRcdFx0XHRlLnN0eWxlLmJhY2tncm91bmQgPSB0aGlzLl9jb2xvcjtcblx0XHRcdFx0ZS5zdHlsZS5saW5lSGVpZ2h0ID0gMDtcblx0XHRcdH0gZWxzZSBpZiAoZS50eXBlID09PSBcImNhbnZhc1wiKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9jb2xvcikgZS5jdHguZmlsbFN0eWxlID0gdGhpcy5fY29sb3I7XG5cdFx0XHRcdGUuY3R4LmZpbGxSZWN0KGUucG9zLl94LCBlLnBvcy5feSwgZS5wb3MuX3csIGUucG9zLl9oKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5jb2xvclxuXHQqIEBjb21wIENvbG9yXG5cdCogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgY29sb3IgY2hhbmdlc1xuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5jb2xvcihTdHJpbmcgY29sb3IpXG5cdCogQHNpZ24gcHVibGljIFN0cmluZyAuY29sb3IoKVxuXHQqIEBwYXJhbSBjb2xvciAtIENvbG9yIG9mIHRoZSByZWN0YW5nbGVcblx0KiBXaWxsIGNyZWF0ZSBhIHJlY3RhbmdsZSBvZiBzb2xpZCBjb2xvciBmb3IgdGhlIGVudGl0eSwgb3IgcmV0dXJuIHRoZSBjb2xvciBpZiBubyBhcmd1bWVudCBpcyBnaXZlbi5cblx0KlxuXHQqIFRoZSBhcmd1bWVudCBtdXN0IGJlIGEgY29sb3IgcmVhZGFibGUgZGVwZW5kaW5nIG9uIHdoaWNoIGJyb3dzZXIgeW91XG5cdCogY2hvb3NlIHRvIHN1cHBvcnQuIElFIDggYW5kIGJlbG93IGRvZXNuJ3Qgc3VwcG9ydCB0aGUgcmdiKCkgc3ludGF4LlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvclwiKVxuXHQqICAgIC5jb2xvcihcIiM5Njk2OTZcIik7XG5cdCogfn5+XG5cdCovXG5cdGNvbG9yOiBmdW5jdGlvbiAoY29sb3IpIHtcblx0XHRpZiAoIWNvbG9yKSByZXR1cm4gdGhpcy5fY29sb3I7XG5cdFx0dGhpcy5fY29sb3IgPSBjb2xvcjtcblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNUaW50XG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBTaW1pbGFyIHRvIENvbG9yIGJ5IGFkZGluZyBhbiBvdmVybGF5IG9mIHNlbWktdHJhbnNwYXJlbnQgY29sb3IuXG4qXG4qICpOb3RlOiBDdXJyZW50bHkgb25seSB3b3JrcyBmb3IgQ2FudmFzKlxuKi9cbkNyYWZ0eS5jKFwiVGludFwiLCB7XG5cdF9jb2xvcjogbnVsbCxcblx0X3N0cmVuZ3RoOiAxLjAsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBkcmF3ID0gZnVuY3Rpb24gZChlKSB7XG5cdFx0XHR2YXIgY29udGV4dCA9IGUuY3R4IHx8IENyYWZ0eS5jYW52YXMuY29udGV4dDtcblxuXHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSB0aGlzLl9jb2xvciB8fCBcInJnYigwLDAsMClcIjtcblx0XHRcdGNvbnRleHQuZmlsbFJlY3QoZS5wb3MuX3gsIGUucG9zLl95LCBlLnBvcy5fdywgZS5wb3MuX2gpO1xuXHRcdH07XG5cblx0XHR0aGlzLmJpbmQoXCJEcmF3XCIsIGRyYXcpLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRpZiAoaWQgPT09IFwiVGludFwiKSB0aGlzLnVuYmluZChcIkRyYXdcIiwgZHJhdyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMudGludFxuXHQqIEBjb21wIFRpbnRcblx0KiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSB0aW50IGlzIGFwcGxpZWRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAudGludChTdHJpbmcgY29sb3IsIE51bWJlciBzdHJlbmd0aClcblx0KiBAcGFyYW0gY29sb3IgLSBUaGUgY29sb3IgaW4gaGV4YWRlY2ltYWxcblx0KiBAcGFyYW0gc3RyZW5ndGggLSBMZXZlbCBvZiBvcGFjaXR5XG5cdCogXG5cdCogTW9kaWZ5IHRoZSBjb2xvciBhbmQgbGV2ZWwgb3BhY2l0eSB0byBnaXZlIGEgdGludCBvbiB0aGUgZW50aXR5LlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUaW50XCIpXG5cdCogICAgLnRpbnQoXCIjOTY5Njk2XCIsIDAuMyk7XG5cdCogfn5+XG5cdCovXG5cdHRpbnQ6IGZ1bmN0aW9uIChjb2xvciwgc3RyZW5ndGgpIHtcblx0XHR0aGlzLl9zdHJlbmd0aCA9IHN0cmVuZ3RoO1xuXHRcdHRoaXMuX2NvbG9yID0gQ3JhZnR5LnRvUkdCKGNvbG9yLCB0aGlzLl9zdHJlbmd0aCk7XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNJbWFnZVxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogRHJhdyBhbiBpbWFnZSB3aXRoIG9yIHdpdGhvdXQgcmVwZWF0aW5nICh0aWxpbmcpLlxuKi9cbkNyYWZ0eS5jKFwiSW1hZ2VcIiwge1xuXHRfcmVwZWF0OiBcInJlcGVhdFwiLFxuXHRyZWFkeTogZmFsc2UsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBkcmF3ID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChlLnR5cGUgPT09IFwiY2FudmFzXCIpIHtcblx0XHRcdFx0Ly9za2lwIGlmIG5vIGltYWdlXG5cdFx0XHRcdGlmICghdGhpcy5yZWFkeSB8fCAhdGhpcy5fcGF0dGVybikgcmV0dXJuO1xuXG5cdFx0XHRcdHZhciBjb250ZXh0ID0gZS5jdHg7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuX3BhdHRlcm47XG5cdFx0XHRcdFxuXHRcdFx0XHRjb250ZXh0LnNhdmUoKTtcblx0XHRcdFx0Y29udGV4dC50cmFuc2xhdGUoZS5wb3MuX3gsIGUucG9zLl95KTtcblx0XHRcdFx0Y29udGV4dC5maWxsUmVjdCgwLCAwLCB0aGlzLl93LCB0aGlzLl9oKTtcblx0XHRcdFx0Y29udGV4dC5yZXN0b3JlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gXCJET01cIikge1xuXHRcdFx0XHRpZiAodGhpcy5fX2ltYWdlKVxuXHRcdFx0XHRcdGUuc3R5bGUuYmFja2dyb3VuZCA9IFwidXJsKFwiICsgdGhpcy5fX2ltYWdlICsgXCIpIFwiICsgdGhpcy5fcmVwZWF0O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLmJpbmQoXCJEcmF3XCIsIGRyYXcpLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRpZiAoaWQgPT09IFwiSW1hZ2VcIikgdGhpcy51bmJpbmQoXCJEcmF3XCIsIGRyYXcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmltYWdlXG5cdCogQGNvbXAgSW1hZ2Vcblx0KiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBpbWFnZSBpcyBsb2FkZWRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuaW1hZ2UoU3RyaW5nIHVybFssIFN0cmluZyByZXBlYXRdKVxuXHQqIEBwYXJhbSB1cmwgLSBVUkwgb2YgdGhlIGltYWdlXG5cdCogQHBhcmFtIHJlcGVhdCAtIElmIHRoZSBpbWFnZSBzaG91bGQgYmUgcmVwZWF0ZWQgdG8gZmlsbCB0aGUgZW50aXR5LlxuXHQqIFxuXHQqIERyYXcgc3BlY2lmaWVkIGltYWdlLiBSZXBlYXQgZm9sbG93cyBDU1Mgc3ludGF4IChgXCJuby1yZXBlYXRcIiwgXCJyZXBlYXRcIiwgXCJyZXBlYXQteFwiLCBcInJlcGVhdC15XCJgKTtcblx0KlxuXHQqICpOb3RlOiBEZWZhdWx0IHJlcGVhdCBpcyBgbm8tcmVwZWF0YCB3aGljaCBpcyBkaWZmZXJlbnQgdG8gc3RhbmRhcmQgRE9NICh3aGljaCBpcyBgcmVwZWF0YCkqXG5cdCpcblx0KiBJZiB0aGUgd2lkdGggYW5kIGhlaWdodCBhcmUgYDBgIGFuZCByZXBlYXQgaXMgc2V0IHRvIGBuby1yZXBlYXRgIHRoZSB3aWR0aCBhbmRcblx0KiBoZWlnaHQgd2lsbCBhdXRvbWF0aWNhbGx5IGFzc3VtZSB0aGF0IG9mIHRoZSBpbWFnZS4gVGhpcyBpcyBhblxuXHQqIGVhc3kgd2F5IHRvIGNyZWF0ZSBhbiBpbWFnZSB3aXRob3V0IG5lZWRpbmcgc3ByaXRlcy5cblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIFdpbGwgZGVmYXVsdCB0byBuby1yZXBlYXQuIEVudGl0eSB3aWR0aCBhbmQgaGVpZ2h0IHdpbGwgYmUgc2V0IHRvIHRoZSBpbWFnZXMgd2lkdGggYW5kIGhlaWdodFxuXHQqIH5+flxuXHQqIHZhciBlbnQgPSBDcmFmdHkuZShcIjJELCBET00sIEltYWdlXCIpLmltYWdlKFwibXlpbWFnZS5wbmdcIik7XG5cdCogfn5+XG5cdCogQ3JlYXRlIGEgcmVwZWF0aW5nIGJhY2tncm91bmQuXG5cdCogfn5+XG5cdCogdmFyIGJnID0gQ3JhZnR5LmUoXCIyRCwgRE9NLCBJbWFnZVwiKVxuXHQqICAgICAgICAgICAgICAuYXR0cih7dzogQ3JhZnR5LnZpZXdwb3J0LndpZHRoLCBoOiBDcmFmdHkudmlld3BvcnQuaGVpZ2h0fSlcblx0KiAgICAgICAgICAgICAgLmltYWdlKFwiYmcucG5nXCIsIFwicmVwZWF0XCIpO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LnNwcml0ZVxuXHQqL1xuXHRpbWFnZTogZnVuY3Rpb24gKHVybCwgcmVwZWF0KSB7XG5cdFx0dGhpcy5fX2ltYWdlID0gdXJsO1xuXHRcdHRoaXMuX3JlcGVhdCA9IHJlcGVhdCB8fCBcIm5vLXJlcGVhdFwiO1xuXG5cdFx0dGhpcy5pbWcgPSBDcmFmdHkuYXNzZXQodXJsKTtcblx0XHRpZiAoIXRoaXMuaW1nKSB7XG5cdFx0XHR0aGlzLmltZyA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0Q3JhZnR5LmFzc2V0KHVybCwgdGhpcy5pbWcpO1xuXHRcdFx0dGhpcy5pbWcuc3JjID0gdXJsO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmIChzZWxmLmhhcyhcIkNhbnZhc1wiKSkgc2VsZi5fcGF0dGVybiA9IENyYWZ0eS5jYW52YXMuY29udGV4dC5jcmVhdGVQYXR0ZXJuKHNlbGYuaW1nLCBzZWxmLl9yZXBlYXQpO1xuXHRcdFx0XHRzZWxmLnJlYWR5ID0gdHJ1ZTtcblxuXHRcdFx0XHRpZiAoc2VsZi5fcmVwZWF0ID09PSBcIm5vLXJlcGVhdFwiKSB7XG5cdFx0XHRcdFx0c2VsZi53ID0gc2VsZi5pbWcud2lkdGg7XG5cdFx0XHRcdFx0c2VsZi5oID0gc2VsZi5pbWcuaGVpZ2h0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMucmVhZHkgPSB0cnVlO1xuXHRcdFx0aWYgKHRoaXMuaGFzKFwiQ2FudmFzXCIpKSB0aGlzLl9wYXR0ZXJuID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0LmNyZWF0ZVBhdHRlcm4odGhpcy5pbWcsIHRoaXMuX3JlcGVhdCk7XG5cdFx0XHRpZiAodGhpcy5fcmVwZWF0ID09PSBcIm5vLXJlcGVhdFwiKSB7XG5cdFx0XHRcdHRoaXMudyA9IHRoaXMuaW1nLndpZHRoO1xuXHRcdFx0XHR0aGlzLmggPSB0aGlzLmltZy5oZWlnaHQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbkNyYWZ0eS5leHRlbmQoe1xuXHRfc2NlbmVzOiBbXSxcblx0X2N1cnJlbnQ6IG51bGwsXG5cblx0LyoqQFxuXHQqICNDcmFmdHkuc2NlbmVcblx0KiBAY2F0ZWdvcnkgU2NlbmVzLCBTdGFnZVxuXHQqIEB0cmlnZ2VyIFNjZW5lQ2hhbmdlIC0gd2hlbiBhIHNjZW5lIGlzIHBsYXllZCAtIHsgb2xkU2NlbmU6U3RyaW5nLCBuZXdTY2VuZTpTdHJpbmcgfVxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5zY2VuZShTdHJpbmcgc2NlbmVOYW1lLCBGdW5jdGlvbiBpbml0WywgRnVuY3Rpb24gdW5pbml0XSlcblx0KiBAcGFyYW0gc2NlbmVOYW1lIC0gTmFtZSBvZiB0aGUgc2NlbmUgdG8gYWRkXG5cdCogQHBhcmFtIGluaXQgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gc2NlbmUgaXMgcGxheWVkXG5cdCogQHBhcmFtIHVuaW5pdCAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgYmVmb3JlIG5leHQgc2NlbmUgaXMgcGxheWVkLCBhZnRlciBlbnRpdGllcyB3aXRoIGAyRGAgYXJlIGRlc3Ryb3llZFxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5zY2VuZShTdHJpbmcgc2NlbmVOYW1lKVxuXHQqIEBwYXJhbSBzY2VuZU5hbWUgLSBOYW1lIG9mIHNjZW5lIHRvIHBsYXlcblx0KiBcblx0KiBNZXRob2QgdG8gY3JlYXRlIHNjZW5lcyBvbiB0aGUgc3RhZ2UuIFBhc3MgYW4gSUQgYW5kIGZ1bmN0aW9uIHRvIHJlZ2lzdGVyIGEgc2NlbmUuXG5cdCpcblx0KiBUbyBwbGF5IGEgc2NlbmUsIGp1c3QgcGFzcyB0aGUgSUQuIFdoZW4gYSBzY2VuZSBpcyBwbGF5ZWQsIGFsbFxuXHQqIGVudGl0aWVzIHdpdGggdGhlIGAyRGAgY29tcG9uZW50IG9uIHRoZSBzdGFnZSBhcmUgZGVzdHJveWVkLlxuXHQqXG5cdCogSWYgeW91IHdhbnQgc29tZSBlbnRpdGllcyB0byBwZXJzaXN0IG92ZXIgc2NlbmVzIChhcyBpbiBub3QgYmUgZGVzdHJveWVkKVxuXHQqIHNpbXBseSBhZGQgdGhlIGNvbXBvbmVudCBgUGVyc2lzdGAuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5zY2VuZShcImxvYWRpbmdcIiwgZnVuY3Rpb24oKSB7fSk7XG5cdCpcblx0KiBDcmFmdHkuc2NlbmUoXCJsb2FkaW5nXCIsIGZ1bmN0aW9uKCkge30sIGZ1bmN0aW9uKCkge30pO1xuXHQqXG5cdCogQ3JhZnR5LnNjZW5lKFwibG9hZGluZ1wiKTtcblx0KiB+fn5cblx0Ki9cblx0c2NlbmU6IGZ1bmN0aW9uIChuYW1lLCBpbnRybywgb3V0cm8pIHtcblx0XHQvL3BsYXkgc2NlbmVcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0Q3JhZnR5LnZpZXdwb3J0LnJlc2V0KCk7XG5cdFx0XHRDcmFmdHkoXCIyRFwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKCF0aGlzLmhhcyhcIlBlcnNpc3RcIikpIHRoaXMuZGVzdHJveSgpO1xuXHRcdFx0fSk7XG5cdFx0XHQvLyB1bmluaXRpYWxpemUgcHJldmlvdXMgc2NlbmVcblx0XHRcdGlmICh0aGlzLl9jdXJyZW50ICE9PSBudWxsICYmICd1bmluaXRpYWxpemUnIGluIHRoaXMuX3NjZW5lc1t0aGlzLl9jdXJyZW50XSkge1xuXHRcdFx0XHR0aGlzLl9zY2VuZXNbdGhpcy5fY3VycmVudF0udW5pbml0aWFsaXplLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cdFx0XHQvLyBpbml0aWFsaXplIG5leHQgc2NlbmVcblx0XHRcdHRoaXMuX3NjZW5lc1tuYW1lXS5pbml0aWFsaXplLmNhbGwodGhpcyk7XG5cdFx0XHR2YXIgb2xkU2NlbmUgPSB0aGlzLl9jdXJyZW50O1xuXHRcdFx0dGhpcy5fY3VycmVudCA9IG5hbWU7XG5cdFx0XHRDcmFmdHkudHJpZ2dlcihcIlNjZW5lQ2hhbmdlXCIsIHsgb2xkU2NlbmU6IG9sZFNjZW5lLCBuZXdTY2VuZTogbmFtZSB9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly9hZGQgc2NlbmVcblx0XHR0aGlzLl9zY2VuZXNbbmFtZV0gPSB7fVxuXHRcdHRoaXMuX3NjZW5lc1tuYW1lXS5pbml0aWFsaXplID0gaW50cm9cblx0XHRpZiAodHlwZW9mIG91dHJvICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5fc2NlbmVzW25hbWVdLnVuaW5pdGlhbGl6ZSA9IG91dHJvO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH0sXG5cblx0LyoqQFxuXHQqICNDcmFmdHkudG9SR0Jcblx0KiBAY2F0ZWdvcnkgR3JhcGhpY3Ncblx0KiBAc2lnbiBwdWJsaWMgU3RyaW5nIENyYWZ0eS5zY2VuZShTdHJpbmcgaGV4WywgTnVtYmVyIGFscGhhXSlcblx0KiBAcGFyYW0gaGV4IC0gYSA2IGNoYXJhY3RlciBoZXggbnVtYmVyIHN0cmluZyByZXByZXNlbnRpbmcgUkdCIGNvbG9yXG5cdCogQHBhcmFtIGFscGhhIC0gVGhlIGFscGhhIHZhbHVlLlxuXHQqIFxuXHQqIEdldCBhIHJnYiBzdHJpbmcgb3IgcmdiYSBzdHJpbmcgKGlmIGBhbHBoYWAgcHJlc2VudHMpLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LnRvUkdCKFwiZmZmZmZmXCIpOyAvLyByZ2IoMjU1LDI1NSwyNTUpXG5cdCogQ3JhZnR5LnRvUkdCKFwiI2ZmZmZmZlwiKTsgLy8gcmdiKDI1NSwyNTUsMjU1KVxuXHQqIENyYWZ0eS50b1JHQihcImZmZmZmZlwiLCAuNSk7IC8vIHJnYmEoMjU1LDI1NSwyNTUsMC41KVxuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgVGV4dC50ZXh0Q29sb3Jcblx0Ki9cblx0dG9SR0I6IGZ1bmN0aW9uIChoZXgsIGFscGhhKSB7XG5cdFx0dmFyIGhleCA9IChoZXguY2hhckF0KDApID09PSAnIycpID8gaGV4LnN1YnN0cigxKSA6IGhleCxcblx0XHRcdGMgPSBbXSwgcmVzdWx0O1xuXG5cdFx0Y1swXSA9IHBhcnNlSW50KGhleC5zdWJzdHIoMCwgMiksIDE2KTtcblx0XHRjWzFdID0gcGFyc2VJbnQoaGV4LnN1YnN0cigyLCAyKSwgMTYpO1xuXHRcdGNbMl0gPSBwYXJzZUludChoZXguc3Vic3RyKDQsIDIpLCAxNik7XG5cblx0XHRyZXN1bHQgPSBhbHBoYSA9PT0gdW5kZWZpbmVkID8gJ3JnYignICsgYy5qb2luKCcsJykgKyAnKScgOiAncmdiYSgnICsgYy5qb2luKCcsJykgKyAnLCcgKyBhbHBoYSArICcpJztcblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn0pO1xuXG52YXIgRGlydHlSZWN0YW5nbGVzID0gKGZ1bmN0aW9uKCkge1xuXG5cdGZ1bmN0aW9uIHgxKHJlY3QpIHsgcmV0dXJuIHJlY3QuX3g7IH1cblx0ZnVuY3Rpb24geDIocmVjdCkgeyByZXR1cm4gcmVjdC5feCArIHJlY3QuX3c7IH1cblx0ZnVuY3Rpb24geTEocmVjdCkgeyByZXR1cm4gcmVjdC5feTsgfVxuXHRmdW5jdGlvbiB5MihyZWN0KSB7IHJldHVybiByZWN0Ll95ICsgcmVjdC5faDsgfVxuXG5cdGZ1bmN0aW9uIGludGVyc2VjdHMoYSwgYikge1xuXHRcdHJldHVybiB4MShhKSA8IHgyKGIpICYmIHgyKGEpID4geDEoYikgJiYgeTEoYSkgPCB5MihiKSAmJiB5MihhKSA+IHkxKGIpO1xuXHR9XG5cblx0dmFyIGNvcm5lcl9kYXRhID0ge307XG5cblx0ZnVuY3Rpb24gcmVzZXRfY29ybmVyX2RhdGEoKSB7XG5cdFx0Y29ybmVyX2RhdGEueDF5MSA9IGZhbHNlO1xuXHRcdGNvcm5lcl9kYXRhLngxeTIgPSBmYWxzZTtcblx0XHRjb3JuZXJfZGF0YS54MnkxID0gZmFsc2U7XG5cdFx0Y29ybmVyX2RhdGEueDJ5MiA9IGZhbHNlO1xuXHRcdGNvcm5lcl9kYXRhLmNvdW50ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGNvcm5lcnMgb2YgYiB0aGF0IGFyZSBpbnNpZGUgYS5cblx0Ly8gX2Nvcm5lcnNJbnNpZGUgc3RvcmVzIGl0cyByZXN1bHRzIGluIF9jb3JuZXJfZGF0YS4gVGhpcyBpcyBzYWZlIHRvIGRvXG5cdC8vIHNpbmNlIHRoZSBvbmx5IHJlY3Vyc2l2ZSBjYWxsIGluIHRoaXMgZmlsZSBpcyBpbiB0YWlsIHBvc2l0aW9uLlxuXHRmdW5jdGlvbiBjb3JuZXJzX2luc2lkZShhLCBiKSB7XG5cdFx0cmVzZXRfY29ybmVyX2RhdGEoKTtcblxuXHRcdC8vIFRoZSB4MSwgeTEgY29ybmVyIG9mIGIuXG5cdFx0aWYgKHgxKGIpID49IHgxKGEpICYmIHgxKGIpIDw9IHgyKGEpKSB7XG5cblx0XHRcdC8vIFRoZSB4MSwgeTEgY29ybmVyIG9mIGIuXG5cdFx0XHRpZiAoeTEoYikgPj0geTEoYSkgJiYgeTEoYikgPD0geTIoYSkpIHtcblx0XHRcdFx0Y29ybmVyX2RhdGEueDF5MSA9IHRydWU7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLmNvdW50Kys7XG5cdFx0XHR9XG5cdFx0XHQvLyBUaGUgeDEsIHkyIGNvcm5lciBvZiBiXG5cdFx0XHRpZiAoeTIoYikgPj0geTEoYSkgJiYgeTIoYikgPD0geTIoYSkpIHtcblx0XHRcdFx0Y29ybmVyX2RhdGEueDF5MiA9IHRydWU7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLmNvdW50Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHgyKGIpID49IHgxKGEpICYmIHgyKGIpIDw9IHgyKGEpKSB7XG5cdFx0XHQvLyBUaGUgeDIsIHkxIGNvcm5lciBvZiBiLlxuXHRcdFx0aWYgKHkxKGIpID49IHkxKGEpICYmIHkxKGIpIDw9IHkyKGEpKSB7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLngyeTEgPSB0cnVlO1xuXHRcdFx0XHRjb3JuZXJfZGF0YS5jb3VudCsrO1xuXHRcdFx0fVxuXHRcdFx0Ly8gVGhlIHgyLCB5MiBjb3JuZXIgb2YgYlxuXHRcdFx0aWYgKHkyKGIpID49IHkxKGEpICYmIHkyKGIpIDw9IHkyKGEpKSB7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLngyeTIgPSB0cnVlO1xuXHRcdFx0XHRjb3JuZXJfZGF0YS5jb3VudCsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBjb3JuZXJfZGF0YS5jb3VudDtcblx0fVxuXG5cdC8vIFNocmluayBjb250YWluZWQgc28gdGhhdCBpdCBubyBsb25nZXIgb3ZlcmxhcHMgY29udGFpbmluZy5cblx0Ly8gUmVxdWlyZXM6XG5cdC8vICAgKiBFeGFjdGx5IHR3byBjb3JuZXJzIG9mIGNvbnRhaW5lZCBhcmUgd2l0aGluIGNvbnRhaW5pbmcuXG5cdC8vICAgKiBfY29ybmVyc0luc2lkZSBjYWxsZWQgZm9yIGNvbnRhaW5pbmcgYW5kIGNvbnRhaW5lZC5cblx0ZnVuY3Rpb24gc2hyaW5rX3JlY3QoY29udGFpbmluZywgY29udGFpbmVkKSB7XG5cblx0XHQvLyBUaGUgeDEsIHkxIGFuZCB4MiwgeTEgY29ybmVyIG9mIGNvbnRhaW5lZC5cblx0XHRpZiAoY29ybmVyX2RhdGEueDF5MSAmJiBjb3JuZXJfZGF0YS54MnkxKSB7XG5cdFx0XHRjb250YWluZWQuX2ggLT0geTIoY29udGFpbmluZykgLSB5MShjb250YWluZWQpO1xuXHRcdFx0Y29udGFpbmVkLl95ID0geTIoY29udGFpbmluZyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gVGhlIHgxLCB5MSBhbmQgeDEsIHkyIGNvcm5lciBvZiBjb250YWluZWQuXG5cdFx0aWYgKGNvcm5lcl9kYXRhLngxeTEgJiYgY29ybmVyX2RhdGEueDF5Mikge1xuXHRcdFx0Y29udGFpbmVkLl93IC09IHgyKGNvbnRhaW5pbmcpIC0geDEoY29udGFpbmVkKTtcblx0XHRcdGNvbnRhaW5lZC5feCA9IHgyKGNvbnRhaW5pbmcpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB4MSwgeTIgYW5kIHgyLCB5MiBjb3JuZXIgb2YgY29udGFpbmVkLlxuXHRcdGlmIChjb3JuZXJfZGF0YS54MXkyICYmIGNvcm5lcl9kYXRhLngyeTIpIHtcblx0XHRcdGNvbnRhaW5lZC5faCA9IHkxKGNvbnRhaW5pbmcpIC0geTEoY29udGFpbmVkKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUaGUgeDIsIHkxIGFuZCB4MiwgeTIgY29ybmVyIG9mIGNvbnRhaW5lZC5cblx0XHRpZiAoY29ybmVyX2RhdGEueDJ5MSAmJiBjb3JuZXJfZGF0YS54MnkyKSB7XG5cdFx0XHRjb250YWluZWQuX3cgPSB4MShjb250YWluaW5nKSAtIHgxKGNvbnRhaW5lZCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdH1cblxuXHQvLyBFbmxhcmdlIGBhYCBzdWNoIHRoYXQgaXQgY292ZXJzIGBiYCBhcyB3ZWxsLlxuXHRmdW5jdGlvbiBtZXJnZV9pbnRvKGEsIGIpIHtcblx0XHR2YXIgbmV3WDIgPSBNYXRoLm1heCh4MihhKSwgeDIoYikpO1xuXHRcdHZhciBuZXdZMiA9IE1hdGgubWF4KHkyKGEpLCB5MihiKSk7XG5cblx0XHRhLl94ID0gTWF0aC5taW4oYS5feCwgYi5feCk7XG5cdFx0YS5feSA9IE1hdGgubWluKGEuX3ksIGIuX3kpO1xuXG5cdFx0YS5fdyA9IG5ld1gyIC0gYS5feDtcblx0XHRhLl9oID0gbmV3WTIgLSBhLl95O1xuXHR9XG5cblx0ZnVuY3Rpb24gRGlydHlSZWN0YW5nbGVzKCkge1xuXHRcdHRoaXMucmVjdGFuZ2xlcyA9IFtdO1xuXHR9O1xuXG5cdERpcnR5UmVjdGFuZ2xlcy5wcm90b3R5cGUuYWRkX3JlY3RhbmdsZSA9IGZ1bmN0aW9uKG5ld19yZWN0KSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdHZhciBpbmRpY2VzX3RvX2RlbGV0ZSA9IFtdO1xuXG5cdFx0ZnVuY3Rpb24gZGVsZXRlX2luZGljZXMoKSB7XG5cdFx0XHR2YXIgaSwgaW5kZXg7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgaW5kaWNlc190b19kZWxldGUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXggPSBpbmRpY2VzX3RvX2RlbGV0ZVtpXTtcblx0XHRcdFx0X3RoaXMucmVjdGFuZ2xlcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBpbmRleCwgcmVjdCwgY29ybmVycywgaW5kaWNlc190b19kZWxldGU7XG5cblx0XHRmb3IgKGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLnJlY3RhbmdsZXMubGVuZ3RoOyBpbmRleCsrKSB7XG5cdFx0XHRyZWN0ID0gdGhpcy5yZWN0YW5nbGVzW2luZGV4XTtcblxuXHRcdFx0aWYgKGludGVyc2VjdHMobmV3X3JlY3QsIHJlY3QpKSB7XG5cdFx0XHRcdGNvcm5lcnMgPSBjb3JuZXJzX2luc2lkZShyZWN0LCBuZXdfcmVjdCk7XG5cdFx0XHRcdHN3aXRjaCAoY29ybmVycykge1xuXHRcdFx0XHRcdGNhc2UgNDpcblx0XHRcdFx0XHRcdC8vIElmIDQgY29ybmVycyBvZiBuZXdfcmVjdCBsaWUgd2l0aGluIHJlY3QsIHdlIGNhbiBkaXNjYXJkXG5cdFx0XHRcdFx0XHQvLyBuZXdfcmVjdC4gIFdlIHNob3VsZG4ndCBoYXZlIGZvdW5kIGFueSByZWN0YW5nbGVzIHRvIGRlbGV0ZSxcblx0XHRcdFx0XHRcdC8vIGJlY2F1c2UgaWYgYSByZWN0YW5nbGUgaW4gdGhlIGxpc3QgaXMgY29udGFpbmVkIHdpdGhpblxuXHRcdFx0XHRcdFx0Ly8gbmV3X3JlY3QsIGFuZCBuZXdfcmVjdCBpcyBjb250YWluZWQgd2l0aCByZWN0LCB0aGVuIHRoZXJlIGFyZVxuXHRcdFx0XHRcdFx0Ly8gb3ZlcmxhcHBpbmcgcmVjdGFuZ2xlcyBpbiB0aGUgbGlzdC5cblx0XHRcdFx0XHRcdGlmIChpbmRpY2VzX3RvX2RlbGV0ZS5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRGlydHkgcmVjdGFuZ2xlIGJ1Z1wiKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRjYXNlIDM6XG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSW1wb3NzaWJsZSBjb3JuZXIgY291bnRcIik7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRcdFx0Ly8gU2hyaW5rIG5ld19yZWN0IHRvIG5vdCBvdmVybGFwIHJlY3QuXG5cdFx0XHRcdFx0XHRzaHJpbmtfcmVjdChyZWN0LCBuZXdfcmVjdCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0XHRjb3JuZXJzID0gY29ybmVyc19pbnNpZGUobmV3X3JlY3QsIHJlY3QpO1xuXHRcdFx0XHRcdFx0c3dpdGNoIChjb3JuZXJzKSB7XG5cdFx0XHRcdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRcdFx0XHQvLyBNZXJnZSB0aGUgdHdvIHJlY3RhbmdsZXMuXG5cdFx0XHRcdFx0XHRcdFx0bWVyZ2VfaW50byhyZWN0LCBuZXdfcmVjdCk7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVE9ETzogTXVzdCByZW1vdmUgcmVjdCBhbmQgcmUtaW5zZXJ0IGl0LlxuXHRcdFx0XHRcdFx0XHRcdGluZGljZXNfdG9fZGVsZXRlLnVuc2hpZnQoaW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdGRlbGV0ZV9pbmRpY2VzKCk7XG5cdFx0XHRcdFx0XHRcdFx0X3RoaXMuYWRkX3JlY3RhbmdsZShyZWN0KTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGlzIGNhc2UgbG9va3MgbGlrZSB0aGlzOlxuXHRcdFx0XHRcdFx0XHRcdC8vICstLS0tLS0tLSs9PT09PT09PT0rLS0tLS0tLS0tLStcblx0XHRcdFx0XHRcdFx0XHQvLyB8cmVjdCAgICB8ICAgICAgICAgfCAgICAgICAgICB8XG5cdFx0XHRcdFx0XHRcdFx0Ly8gfCAgICAgICAgfCAgICAgICAgIHwgICAgICAgICAgfFxuXHRcdFx0XHRcdFx0XHRcdC8vICstLS0tLS0tLSstLS0tLS0tLS0rIG5ld19yZWN0IHxcblx0XHRcdFx0XHRcdFx0XHQvLyAgICAgICAgICArLS0tLS0tLS0tLS0tLS0tLS0tLS0rXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTm90ZSBob3cgbmV3X3JlY3QgaGFzIDEgY29ybmVyIGluIHJlY3QsIHdoaWxlXG5cdFx0XHRcdFx0XHRcdFx0Ly8gcmVjdCBoYXMgMiBjb3JuZXJzIGluIG5ld19yZWN0LlxuXHRcdFx0XHRcdFx0XHRcdC8vXG5cdFx0XHRcdFx0XHRcdFx0Ly8gT2J2aW91c2x5LCB3ZSBzaHJpbmsgcmVjdCB0byBub3Qgb3ZlcmxhcCBuZXdfcmVjdC5cblx0XHRcdFx0XHRcdFx0XHRzaHJpbmtfcmVjdChuZXdfcmVjdCwgcmVjdCk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgNDpcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGlzIGNhc2Ugb2NjdXJzIHdoZW4gbmV3X3JlY3QgYW5kIHJlY3QgaGF2ZSAxIGNvcm5lciBpbiBjb21tb24sXG5cdFx0XHRcdFx0XHRcdFx0Ly8gYnV0IHJlY3QgbGllcyBlbnRpcmVseSB3aXRoaW4gbmV3X3JlY3QuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gV2UgZGVsZXRlIHJlY3QsIHNpbmNlIG5ld19yZWN0IGVuY29tcGFzc2VzIGl0LCBhbmQgY29udGludWUgd2l0aFxuXHRcdFx0XHRcdFx0XHRcdC8vIGluc2VydGlvbiBub3JtYWxseS5cblx0XHRcdFx0XHRcdFx0XHRpbmRpY2VzX3RvX2RlbGV0ZS51bnNoaWZ0KGluZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRGlydHkgcmVjdGFuZ2xlIGJ1Z1wiKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMDpcblx0XHRcdFx0XHRcdC8vIE5vIGNvcm5lcnMgb2YgbmV3X3JlY3QgYXJlIGluc2lkZSByZWN0LiBJbnN0ZWFkLCBzZWUgaG93IG1hbnlcblx0XHRcdFx0XHRcdC8vIGNvcm5lcnMgb2YgcmVjdCBhcmUgaW5zaWRlIG5ld19yZWN0XG5cdFx0XHRcdFx0XHRjb3JuZXJzID0gY29ybmVyc19pbnNpZGUobmV3X3JlY3QsIHJlY3QpO1xuXHRcdFx0XHRcdFx0c3dpdGNoIChjb3JuZXJzKSB7XG5cdFx0XHRcdFx0XHRcdGNhc2UgNDpcblx0XHRcdFx0XHRcdFx0XHQvLyBEZWxldGUgcmVjdCwgY29udGludWUgd2l0aCBpbnNlcnRpb24gb2YgbmV3X3JlY3Rcblx0XHRcdFx0XHRcdFx0XHRpbmRpY2VzX3RvX2RlbGV0ZS51bnNoaWZ0KGluZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbXBvc3NpYmxlIGNvcm5lciBjb3VudFwiKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRcdFx0XHQvLyBTaHJpbmsgcmVjdCB0byBub3Qgb3ZlcmxhcCBuZXdfcmVjdCwgY29udGludWUgd2l0aCBpbnNlcnRpb24uXG5cdFx0XHRcdFx0XHRcdFx0c2hyaW5rX3JlY3QobmV3X3JlY3QsIHJlY3QpO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhpcyBzaG91bGQgYmUgaW1wb3NzaWJsZSwgdGhlIGVhcmxpZXIgY2FzZSBvZiAxIGNvcm5lciBvdmVybGFwcGluZ1xuXHRcdFx0XHRcdFx0XHRcdC8vIHNob3VsZCBoYXZlIGJlZW4gdHJpZ2dlcmVkLlxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbXBvc3NpYmxlIGNvcm5lciBjb3VudFwiKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRkZWxldGVfaW5kaWNlcygpO1xuXHRcdHRoaXMucmVjdGFuZ2xlcy5wdXNoKG5ld19yZWN0KTtcblx0fTtcblxuXHRyZXR1cm4gRGlydHlSZWN0YW5nbGVzO1xuXG59KSgpO1xuXG4vKipAXG4qICNDcmFmdHkuRHJhd01hbmFnZXJcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIEBzaWduIENyYWZ0eS5EcmF3TWFuYWdlclxuKiBcbiogQW4gaW50ZXJuYWwgb2JqZWN0IG1hbmFnZSBvYmplY3RzIHRvIGJlIGRyYXduIGFuZCBpbXBsZW1lbnRcbiogdGhlIGJlc3QgbWV0aG9kIG9mIGRyYXdpbmcgaW4gYm90aCBET00gYW5kIGNhbnZhc1xuKi9cbkNyYWZ0eS5EcmF3TWFuYWdlciA9IChmdW5jdGlvbiAoKSB7XG5cdC8qKiBhcnJheSBvZiBkaXJ0eSByZWN0cyBvbiBzY3JlZW4gKi9cblx0dmFyIGRpcnR5X3JlY3RzID0gW10sXG5cdC8qKiBhcnJheSBvZiBET01zIG5lZWRlZCB1cGRhdGluZyAqL1xuXHRcdGRvbSA9IFtdO1xuXG5cdHJldHVybiB7XG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci50b3RhbDJEXG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIFxuXHRcdCogVG90YWwgbnVtYmVyIG9mIHRoZSBlbnRpdGllcyB0aGF0IGhhdmUgdGhlIGAyRGAgY29tcG9uZW50LlxuXHRcdCovXG5cdFx0dG90YWwyRDogQ3JhZnR5KFwiMkRcIikubGVuZ3RoLFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5vblNjcmVlblxuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLm9uU2NyZWVuKE9iamVjdCByZWN0KVxuXHRcdCogQHBhcmFtIHJlY3QgLSBBIHJlY3RhbmdsZSB3aXRoIGZpZWxkIHtfeDogeF92YWwsIF95OiB5X3ZhbCwgX3c6IHdfdmFsLCBfaDogaF92YWx9XG5cdFx0KiBcblx0XHQqIFRlc3QgaWYgYSByZWN0YW5nbGUgaXMgY29tcGxldGVseSBpbiB2aWV3cG9ydFxuXHRcdCovXG5cdFx0b25TY3JlZW46IGZ1bmN0aW9uIChyZWN0KSB7XG5cdFx0XHRyZXR1cm4gQ3JhZnR5LnZpZXdwb3J0Ll94ICsgcmVjdC5feCArIHJlY3QuX3cgPiAwICYmIENyYWZ0eS52aWV3cG9ydC5feSArIHJlY3QuX3kgKyByZWN0Ll9oID4gMCAmJlxuXHRcdFx0XHQgICBDcmFmdHkudmlld3BvcnQuX3ggKyByZWN0Ll94IDwgQ3JhZnR5LnZpZXdwb3J0LndpZHRoICYmIENyYWZ0eS52aWV3cG9ydC5feSArIHJlY3QuX3kgPCBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLm1lcmdlXG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5LkRyYXdNYW5hZ2VyLm1lcmdlKE9iamVjdCBzZXQpXG5cdFx0KiBAcGFyYW0gc2V0IC0gYW4gYXJyYXkgb2YgcmVjdGFuZ3VsYXIgcmVnaW9uc1xuXHRcdCogXG5cdFx0KiBNZXJnZWQgaW50byBub24gb3ZlcmxhcHBpbmcgcmVjdGFuZ3VsYXIgcmVnaW9uXG5cdFx0KiBJdHMgYW4gb3B0aW1pemF0aW9uIGZvciB0aGUgcmVkcmF3IHJlZ2lvbnMuXG5cdFx0Ki9cblx0XHRtZXJnZTogZnVuY3Rpb24gKHNldCkge1xuXHRcdFx0dmFyIGRyID0gbmV3IERpcnR5UmVjdGFuZ2xlcygpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIG5ld19yZWN0OyBuZXdfcmVjdCA9IHNldFtpXTsgaSsrKSB7XG5cdFx0XHRcdGRyLmFkZF9yZWN0YW5nbGUobmV3X3JlY3QpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGRyLnJlY3RhbmdsZXM7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIuYWRkXG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIuYWRkKG9sZCwgY3VycmVudClcblx0XHQqIEBwYXJhbSBvbGQgLSBVbmRvY3VtZW50ZWRcblx0XHQqIEBwYXJhbSBjdXJyZW50IC0gVW5kb2N1bWVudGVkXG5cdFx0KiBcblx0XHQqIENhbGN1bGF0ZSB0aGUgYm91bmRpbmcgcmVjdCBvZiBkaXJ0eSBkYXRhIGFuZCBhZGQgdG8gdGhlIHJlZ2lzdGVyIG9mIGRpcnR5IHJlY3RhbmdsZXNcblx0XHQqL1xuXHRcdGFkZDogZnVuY3Rpb24gYWRkKG9sZCwgY3VycmVudCkge1xuXHRcdFx0aWYgKCFjdXJyZW50KSB7XG5cdFx0XHRcdGRvbS5wdXNoKG9sZCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHJlY3QsXG5cdFx0XHRcdGJlZm9yZSA9IG9sZC5fbWJyIHx8IG9sZCxcblx0XHRcdFx0YWZ0ZXIgPSBjdXJyZW50Ll9tYnIgfHwgY3VycmVudDtcblxuXHRcdFx0aWYgKG9sZCA9PT0gY3VycmVudCkge1xuXHRcdFx0XHRyZWN0ID0gb2xkLm1icigpIHx8IG9sZC5wb3MoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlY3QgPSB7XG5cdFx0XHRcdFx0X3g6IH5+TWF0aC5taW4oYmVmb3JlLl94LCBhZnRlci5feCksXG5cdFx0XHRcdFx0X3k6IH5+TWF0aC5taW4oYmVmb3JlLl95LCBhZnRlci5feSksXG5cdFx0XHRcdFx0X3c6IE1hdGgubWF4KGJlZm9yZS5fdywgYWZ0ZXIuX3cpICsgTWF0aC5tYXgoYmVmb3JlLl94LCBhZnRlci5feCksXG5cdFx0XHRcdFx0X2g6IE1hdGgubWF4KGJlZm9yZS5faCwgYWZ0ZXIuX2gpICsgTWF0aC5tYXgoYmVmb3JlLl95LCBhZnRlci5feSlcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRyZWN0Ll93ID0gKHJlY3QuX3cgLSByZWN0Ll94KTtcblx0XHRcdFx0cmVjdC5faCA9IChyZWN0Ll9oIC0gcmVjdC5feSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZWN0Ll93ID09PSAwIHx8IHJlY3QuX2ggPT09IDAgfHwgIXRoaXMub25TY3JlZW4ocmVjdCkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2Zsb29yL2NlaWxcblx0XHRcdHJlY3QuX3ggPSB+fnJlY3QuX3g7XG5cdFx0XHRyZWN0Ll95ID0gfn5yZWN0Ll95O1xuXHRcdFx0cmVjdC5fdyA9IChyZWN0Ll93ID09PSB+fnJlY3QuX3cpID8gcmVjdC5fdyA6IHJlY3QuX3cgKyAxIHwgMDtcblx0XHRcdHJlY3QuX2ggPSAocmVjdC5faCA9PT0gfn5yZWN0Ll9oKSA/IHJlY3QuX2ggOiByZWN0Ll9oICsgMSB8IDA7XG5cblx0XHRcdC8vYWRkIHRvIGRpcnR5X3JlY3RzLCBjaGVjayBmb3IgbWVyZ2luZ1xuXHRcdFx0ZGlydHlfcmVjdHMucHVzaChyZWN0KTtcblxuXHRcdFx0Ly9pZiBpdCBnb3QgbWVyZ2VkXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5kZWJ1Z1xuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRlYnVnKClcblx0XHQqL1xuXHRcdGRlYnVnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhkaXJ0eV9yZWN0cywgZG9tKTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5kcmF3XG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdyhbT2JqZWN0IHJlY3RdKVxuICAgICAgICAqIEBwYXJhbSByZWN0IC0gYSByZWN0YW5ndWxhciByZWdpb24ge194OiB4X3ZhbCwgX3k6IHlfdmFsLCBfdzogd192YWwsIF9oOiBoX3ZhbH1cbiAgICAgICAgKiB+fn5cblx0XHQqIC0gSWYgcmVjdCBpcyBvbWl0dGVkLCByZWRyYXcgd2l0aGluIHRoZSB2aWV3cG9ydFxuXHRcdCogLSBJZiByZWN0IGlzIHByb3ZpZGVkLCByZWRyYXcgd2l0aGluIHRoZSByZWN0XG5cdFx0KiB+fn5cblx0XHQqL1xuXHRcdGRyYXdBbGw6IGZ1bmN0aW9uIChyZWN0KSB7XG5cdFx0XHR2YXIgcmVjdCA9IHJlY3QgfHwgQ3JhZnR5LnZpZXdwb3J0LnJlY3QoKSxcblx0XHRcdFx0cSA9IENyYWZ0eS5tYXAuc2VhcmNoKHJlY3QpLFxuXHRcdFx0XHRpID0gMCxcblx0XHRcdFx0bCA9IHEubGVuZ3RoLFxuXHRcdFx0XHRjdHggPSBDcmFmdHkuY2FudmFzLmNvbnRleHQsXG5cdFx0XHRcdGN1cnJlbnQ7XG5cblx0XHRcdGN0eC5jbGVhclJlY3QocmVjdC5feCwgcmVjdC5feSwgcmVjdC5fdywgcmVjdC5faCk7XG5cblx0XHRcdC8vc29ydCB0aGUgb2JqZWN0cyBieSB0aGUgZ2xvYmFsIFpcblx0XHRcdHEuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYS5fZ2xvYmFsWiAtIGIuX2dsb2JhbFo7IH0pO1xuXHRcdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0Y3VycmVudCA9IHFbaV07XG5cdFx0XHRcdGlmIChjdXJyZW50Ll92aXNpYmxlICYmIGN1cnJlbnQuX19jLkNhbnZhcykge1xuXHRcdFx0XHRcdGN1cnJlbnQuZHJhdygpO1xuXHRcdFx0XHRcdGN1cnJlbnQuX2NoYW5nZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLmJvdW5kaW5nUmVjdFxuXHRcdCogQGNvbXAgQ3JhZnR5LkRyYXdNYW5hZ2VyXG5cdFx0KiBAc2lnbiBwdWJsaWMgQ3JhZnR5LkRyYXdNYW5hZ2VyLmJvdW5kaW5nUmVjdChzZXQpXG5cdFx0KiBAcGFyYW0gc2V0IC0gVW5kb2N1bWVudGVkXG5cdFx0KiB+fn5cblx0XHQqIC0gQ2FsY3VsYXRlIHRoZSBjb21tb24gYm91bmRpbmcgcmVjdCBvZiBtdWx0aXBsZSBjYW52YXMgZW50aXRpZXMuXG5cdFx0KiAtIFJldHVybnMgY29vcmRzXG5cdFx0KiB+fn5cblx0XHQqL1xuXHRcdGJvdW5kaW5nUmVjdDogZnVuY3Rpb24gKHNldCkge1xuXHRcdFx0aWYgKCFzZXQgfHwgIXNldC5sZW5ndGgpIHJldHVybjtcblx0XHRcdHZhciBuZXdzZXQgPSBbXSwgaSA9IDEsXG5cdFx0XHRsID0gc2V0Lmxlbmd0aCwgY3VycmVudCwgbWFzdGVyID0gc2V0WzBdLCB0bXA7XG5cdFx0XHRtYXN0ZXIgPSBbbWFzdGVyLl94LCBtYXN0ZXIuX3ksIG1hc3Rlci5feCArIG1hc3Rlci5fdywgbWFzdGVyLl95ICsgbWFzdGVyLl9oXTtcblx0XHRcdHdoaWxlIChpIDwgbCkge1xuXHRcdFx0XHRjdXJyZW50ID0gc2V0W2ldO1xuXHRcdFx0XHR0bXAgPSBbY3VycmVudC5feCwgY3VycmVudC5feSwgY3VycmVudC5feCArIGN1cnJlbnQuX3csIGN1cnJlbnQuX3kgKyBjdXJyZW50Ll9oXTtcblx0XHRcdFx0aWYgKHRtcFswXSA8IG1hc3RlclswXSkgbWFzdGVyWzBdID0gdG1wWzBdO1xuXHRcdFx0XHRpZiAodG1wWzFdIDwgbWFzdGVyWzFdKSBtYXN0ZXJbMV0gPSB0bXBbMV07XG5cdFx0XHRcdGlmICh0bXBbMl0gPiBtYXN0ZXJbMl0pIG1hc3RlclsyXSA9IHRtcFsyXTtcblx0XHRcdFx0aWYgKHRtcFszXSA+IG1hc3RlclszXSkgbWFzdGVyWzNdID0gdG1wWzNdO1xuXHRcdFx0XHRpKys7XG5cdFx0XHR9XG5cdFx0XHR0bXAgPSBtYXN0ZXI7XG5cdFx0XHRtYXN0ZXIgPSB7IF94OiB0bXBbMF0sIF95OiB0bXBbMV0sIF93OiB0bXBbMl0gLSB0bXBbMF0sIF9oOiB0bXBbM10gLSB0bXBbMV0gfTtcblxuXHRcdFx0cmV0dXJuIG1hc3Rlcjtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5kcmF3XG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdygpXG5cdFx0KiB+fn5cblx0XHQqIC0gSWYgdGhlIG51bWJlciBvZiByZWN0cyBpcyBvdmVyIDYwJSBvZiB0aGUgdG90YWwgbnVtYmVyIG9mIG9iamVjdHNcblx0XHQqXHRkbyB0aGUgbmFpdmUgbWV0aG9kIHJlZHJhd2luZyBgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGxgXG5cdFx0KiAtIE90aGVyd2lzZSwgY2xlYXIgdGhlIGRpcnR5IHJlZ2lvbnMsIGFuZCByZWRyYXcgZW50aXRpZXMgb3ZlcmxhcHBpbmcgdGhlIGRpcnR5IHJlZ2lvbnMuXG5cdFx0KiB+fn5cblx0XHQqIFxuICAgICAgICAqIEBzZWUgQ2FudmFzLmRyYXcsIERPTS5kcmF3XG5cdFx0Ki9cblx0XHRkcmF3OiBmdW5jdGlvbiBkcmF3KCkge1xuXHRcdFx0Ly9pZiBub3RoaW5nIGluIGRpcnR5X3JlY3RzLCBzdG9wXG5cdFx0XHRpZiAoIWRpcnR5X3JlY3RzLmxlbmd0aCAmJiAhZG9tLmxlbmd0aCkgcmV0dXJuO1xuXG5cdFx0XHR2YXIgaSA9IDAsIGwgPSBkaXJ0eV9yZWN0cy5sZW5ndGgsIGsgPSBkb20ubGVuZ3RoLCByZWN0LCBxLFxuXHRcdFx0XHRqLCBsZW4sIGR1cGVzLCBvYmosIGVudCwgb2JqcyA9IFtdLCBjdHggPSBDcmFmdHkuY2FudmFzLmNvbnRleHQ7XG5cblx0XHRcdC8vbG9vcCBvdmVyIGFsbCBET00gZWxlbWVudHMgbmVlZGluZyB1cGRhdGluZ1xuXHRcdFx0Zm9yICg7IGkgPCBrOyArK2kpIHtcblx0XHRcdFx0ZG9tW2ldLmRyYXcoKS5fY2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0Ly9yZXNldCBET00gYXJyYXlcbiAgICAgICAgICAgIGRvbS5sZW5ndGggPSAwO1xuXHRcdFx0Ly9hZ2Fpbiwgc3RvcCBpZiBub3RoaW5nIGluIGRpcnR5X3JlY3RzXG5cdFx0XHRpZiAoIWwpIHsgcmV0dXJuOyB9XG5cblx0XHRcdC8vaWYgdGhlIGFtb3VudCBvZiByZWN0cyBpcyBvdmVyIDYwJSBvZiB0aGUgdG90YWwgb2JqZWN0c1xuXHRcdFx0Ly9kbyB0aGUgbmFpdmUgbWV0aG9kIHJlZHJhd2luZ1xuXHRcdFx0aWYgKHRydWUgfHwgbCAvIHRoaXMudG90YWwyRCA+IDAuNikge1xuXHRcdFx0XHR0aGlzLmRyYXdBbGwoKTtcblx0XHRcdFx0ZGlydHlfcmVjdHMubGVuZ3RoID0gMDtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRkaXJ0eV9yZWN0cyA9IHRoaXMubWVyZ2UoZGlydHlfcmVjdHMpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7ICsraSkgeyAvL2xvb3Agb3ZlciBldmVyeSBkaXJ0eSByZWN0XG5cdFx0XHRcdHJlY3QgPSBkaXJ0eV9yZWN0c1tpXTtcblx0XHRcdFx0aWYgKCFyZWN0KSBjb250aW51ZTtcblx0XHRcdFx0cSA9IENyYWZ0eS5tYXAuc2VhcmNoKHJlY3QsIGZhbHNlKTsgLy9zZWFyY2ggZm9yIGVudHMgdW5kZXIgZGlydHkgcmVjdFxuXG5cdFx0XHRcdGR1cGVzID0ge307XG5cblx0XHRcdFx0Ly9sb29wIG92ZXIgZm91bmQgb2JqZWN0cyByZW1vdmluZyBkdXBlcyBhbmQgYWRkaW5nIHRvIG9iaiBhcnJheVxuXHRcdFx0XHRmb3IgKGogPSAwLCBsZW4gPSBxLmxlbmd0aDsgaiA8IGxlbjsgKytqKSB7XG5cdFx0XHRcdFx0b2JqID0gcVtqXTtcblxuXHRcdFx0XHRcdGlmIChkdXBlc1tvYmpbMF1dIHx8ICFvYmouX3Zpc2libGUgfHwgIW9iai5fX2MuQ2FudmFzKVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0ZHVwZXNbb2JqWzBdXSA9IHRydWU7XG5cblx0XHRcdFx0XHRvYmpzLnB1c2goeyBvYmo6IG9iaiwgcmVjdDogcmVjdCB9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vY2xlYXIgdGhlIHJlY3QgZnJvbSB0aGUgbWFpbiBjYW52YXNcblx0XHRcdFx0Y3R4LmNsZWFyUmVjdChyZWN0Ll94LCByZWN0Ll95LCByZWN0Ll93LCByZWN0Ll9oKTtcblxuXHRcdFx0fVxuXG5cdFx0XHQvL3NvcnQgdGhlIG9iamVjdHMgYnkgdGhlIGdsb2JhbCBaXG5cdFx0XHRvYmpzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEub2JqLl9nbG9iYWxaIC0gYi5vYmouX2dsb2JhbFo7IH0pO1xuXHRcdFx0aWYgKCFvYmpzLmxlbmd0aCl7IHJldHVybjsgfVxuXG5cdFx0XHQvL2xvb3Agb3ZlciB0aGUgb2JqZWN0c1xuXHRcdFx0Zm9yIChpID0gMCwgbCA9IG9ianMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRcdG9iaiA9IG9ianNbaV07XG5cdFx0XHRcdHJlY3QgPSBvYmoucmVjdDtcblx0XHRcdFx0ZW50ID0gb2JqLm9iajtcblxuXHRcdFx0XHR2YXIgYXJlYSA9IGVudC5fbWJyIHx8IGVudCxcblx0XHRcdFx0XHR4ID0gKHJlY3QuX3ggLSBhcmVhLl94IDw9IDApID8gMCA6IH5+KHJlY3QuX3ggLSBhcmVhLl94KSxcblx0XHRcdFx0XHR5ID0gKHJlY3QuX3kgLSBhcmVhLl95IDwgMCkgPyAwIDogfn4ocmVjdC5feSAtIGFyZWEuX3kpLFxuXHRcdFx0XHRcdHcgPSB+fk1hdGgubWluKGFyZWEuX3cgLSB4LCByZWN0Ll93IC0gKGFyZWEuX3ggLSByZWN0Ll94KSwgcmVjdC5fdywgYXJlYS5fdyksXG5cdFx0XHRcdFx0aCA9IH5+TWF0aC5taW4oYXJlYS5faCAtIHksIHJlY3QuX2ggLSAoYXJlYS5feSAtIHJlY3QuX3kpLCByZWN0Ll9oLCBhcmVhLl9oKTtcblxuXHRcdFx0XHQvL25vIHBvaW50IGRyYXdpbmcgd2l0aCBubyB3aWR0aCBvciBoZWlnaHRcblx0XHRcdFx0aWYgKGggPT09IDAgfHwgdyA9PT0gMCkgY29udGludWU7XG5cblx0XHRcdFx0Y3R4LnNhdmUoKTtcblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0XHRjdHgubW92ZVRvKHJlY3QuX3gsIHJlY3QuX3kpO1xuXHRcdFx0XHRjdHgubGluZVRvKHJlY3QuX3ggKyByZWN0Ll93LCByZWN0Ll95KTtcblx0XHRcdFx0Y3R4LmxpbmVUbyhyZWN0Ll94ICsgcmVjdC5fdywgcmVjdC5faCArIHJlY3QuX3kpO1xuXHRcdFx0XHRjdHgubGluZVRvKHJlY3QuX3gsIHJlY3QuX2ggKyByZWN0Ll95KTtcblx0XHRcdFx0Y3R4LmxpbmVUbyhyZWN0Ll94LCByZWN0Ll95KTtcblxuXHRcdFx0XHRjdHguY2xpcCgpO1xuXG5cdFx0XHRcdGVudC5kcmF3KCk7XG5cdFx0XHRcdGN0eC5jbG9zZVBhdGgoKTtcblx0XHRcdFx0Y3R4LnJlc3RvcmUoKTtcblxuXHRcdFx0XHQvL2FsbG93IGVudGl0eSB0byByZS1kaXJ0eV9yZWN0c1xuXHRcdFx0XHRlbnQuX2NoYW5nZWQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly9lbXB0eSBkaXJ0eV9yZWN0c1xuXHRcdFx0ZGlydHlfcmVjdHMubGVuZ3RoID0gMDtcblx0XHRcdC8vYWxsIG1lcmdlZCBJRHMgYXJlIG5vdyBpbnZhbGlkXG5cdFx0XHRtZXJnZWQgPSB7fTtcblx0XHR9XG5cdH07XG59KSgpO1xuXG5DcmFmdHkuZXh0ZW5kKHtcbi8qKkBcbiogI0NyYWZ0eS5pc29tZXRyaWNcbiogQGNhdGVnb3J5IDJEXG4qIFBsYWNlIGVudGl0aWVzIGluIGEgNDVkZWcgaXNvbWV0cmljIGZhc2hpb24uXG4qL1xuICAgIGlzb21ldHJpYzoge1xuICAgICAgICBfdGlsZToge1xuICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDBcbiAgICAgICAgfSxcbiAgICAgICAgX2VsZW1lbnRzOnt9LFxuICAgICAgICBfcG9zOiB7XG4gICAgICAgICAgICB4OjAsXG4gICAgICAgICAgICB5OjBcbiAgICAgICAgfSxcbiAgICAgICAgX3o6IDAsXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5zaXplXG4gICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMuc2l6ZShOdW1iZXIgdGlsZVNpemUpXG4gICAgICAgICogQHBhcmFtIHRpbGVTaXplIC0gVGhlIHNpemUgb2YgdGhlIHRpbGVzIHRvIHBsYWNlLlxuICAgICAgICAqIFxuICAgICAgICAqIE1ldGhvZCB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHNpemUgb2YgdGhlIGlzb21ldHJpYyBwbGFjZW1lbnQuXG4gICAgICAgICogUmVjb21tZW5kZWQgdG8gdXNlIGEgc2l6ZSB2YWx1ZXMgaW4gdGhlIHBvd2VyIG9mIGAyYCAoMTI4LCA2NCBvciAzMikuXG4gICAgICAgICogVGhpcyBtYWtlcyBpdCBlYXN5IHRvIGNhbGN1bGF0ZSBwb3NpdGlvbnMgYW5kIGltcGxlbWVudCB6b29taW5nLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5Lmlzb21ldHJpYy5wbGFjZVxuICAgICAgICAqL1xuICAgICAgICBzaXplOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5fdGlsZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5fdGlsZS5oZWlnaHQgPSBoZWlnaHQgPiAwID8gaGVpZ2h0IDogd2lkdGgvMjsgLy9TZXR1cCB3aWR0aC8yIGlmIGhlaWdodCBpc24ndCBzZXRcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMucGxhY2VcbiAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5wbGFjZShOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB6LCBFbnRpdHkgdGlsZSlcbiAgICAgICAgKiBAcGFyYW0geCAtIFRoZSBgeGAgcG9zaXRpb24gdG8gcGxhY2UgdGhlIHRpbGVcbiAgICAgICAgKiBAcGFyYW0geSAtIFRoZSBgeWAgcG9zaXRpb24gdG8gcGxhY2UgdGhlIHRpbGVcbiAgICAgICAgKiBAcGFyYW0geiAtIFRoZSBgemAgcG9zaXRpb24gb3IgaGVpZ2h0IHRvIHBsYWNlIHRoZSB0aWxlXG4gICAgICAgICogQHBhcmFtIHRpbGUgLSBUaGUgZW50aXR5IHRoYXQgc2hvdWxkIGJlIHBvc2l0aW9uIGluIHRoZSBpc29tZXRyaWMgZmFzaGlvblxuICAgICAgICAqIFxuICAgICAgICAqIFVzZSB0aGlzIG1ldGhvZCB0byBwbGFjZSBhbiBlbnRpdHkgaW4gYW4gaXNvbWV0cmljIGdyaWQuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCk7XG4gICAgICAgICogaXNvLnBsYWNlKDIsIDEsIDAsIENyYWZ0eS5lKCcyRCwgRE9NLCBDb2xvcicpLmNvbG9yKCdyZWQnKS5hdHRyKHt3OjEyOCwgaDoxMjh9KSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuaXNvbWV0cmljLnNpemVcbiAgICAgICAgKi9cbiAgICAgICAgcGxhY2U6IGZ1bmN0aW9uICh4LCB5LCB6LCBvYmopIHtcbiAgICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBvczJweCh4LHkpO1xuICAgICAgICAgICAgcG9zLnRvcCAtPSB6ICogKHRoaXMuX3RpbGUud2lkdGggLyAyKTtcbiAgICAgICAgICAgIG9iai5hdHRyKHtcbiAgICAgICAgICAgICAgICB4OiBwb3MubGVmdCArIENyYWZ0eS52aWV3cG9ydC5feCwgXG4gICAgICAgICAgICAgICAgeTogcG9zLnRvcCArIENyYWZ0eS52aWV3cG9ydC5feVxuICAgICAgICAgICAgfSkueiArPSB6O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMucG9zMnB4XG4gICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5wb3MycHgoTnVtYmVyIHgsTnVtYmVyIHkpXG4gICAgICAgICAqIEBwYXJhbSB4IFxuICAgICAgICAgKiBAcGFyYW0geVxuICAgICAgICAgKiBAcmV0dXJuIE9iamVjdCB7bGVmdCBOdW1iZXIsdG9wIE51bWJlcn1cbiAgICAgICAgICogXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIGNhbGN1bGF0ZSB0aGUgWCBhbmQgWSBDb29yZGluYXRlcyB0byBQaXhlbCBQb3NpdGlvbnNcbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCw5Nik7XG4gICAgICAgICAqIHZhciBwb3NpdGlvbiA9IGlzby5wb3MycHgoMTAwLDEwMCk7IC8vT2JqZWN0IHsgbGVmdD0xMjgwMCwgdG9wPTQ4MDB9XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgcG9zMnB4OmZ1bmN0aW9uKHgseSl7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGxlZnQ6eCAqIHRoaXMuX3RpbGUud2lkdGggKyAoeSAmIDEpICogKHRoaXMuX3RpbGUud2lkdGggLyAyKSxcbiAgICAgICAgICAgICAgICB0b3A6eSAqIHRoaXMuX3RpbGUuaGVpZ2h0IC8gMiBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMucHgycG9zXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5weDJwb3MoTnVtYmVyIGxlZnQsTnVtYmVyIHRvcClcbiAgICAgICAgICogQHBhcmFtIHRvcCBcbiAgICAgICAgICogQHBhcmFtIGxlZnRcbiAgICAgICAgICogQHJldHVybiBPYmplY3Qge3ggTnVtYmVyLHkgTnVtYmVyfVxuICAgICAgICAgKiBcbiAgICAgICAgICogVGhpcyBtZXRob2QgY2FsY3VsYXRlIHBpeGVsIHRvcCxsZWZ0IHBvc2l0aW9ucyB0byB4LHkgY29vcmRpbmF0ZXNcbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCw5Nik7XG4gICAgICAgICAqIHZhciBweCA9IGlzby5wb3MycHgoMTI4MDAsNDgwMCk7XG4gICAgICAgICAqIGNvbnNvbGUubG9nKHB4KTsgLy9PYmplY3QgeyB4PS0xMDAsIHk9LTEwMH1cbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBweDJwb3M6ZnVuY3Rpb24obGVmdCx0b3Ape1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB4Ok1hdGguY2VpbCgtbGVmdCAvIHRoaXMuX3RpbGUud2lkdGggLSAodG9wICYgMSkqMC41KSxcbiAgICAgICAgICAgICAgICB5Oi10b3AgLyB0aGlzLl90aWxlLmhlaWdodCAqIDJcbiAgICAgICAgICAgIH07IFxuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLmNlbnRlckF0XG4gICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5jZW50ZXJBdChOdW1iZXIgeCxOdW1iZXIgeSlcbiAgICAgICAgICogQHBhcmFtIHRvcCBcbiAgICAgICAgICogQHBhcmFtIGxlZnRcbiAgICAgICAgICogXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIGNlbnRlciB0aGUgVmlld3BvcnQgYXQgeC95IGxvY2F0aW9uIG9yIGdpdmVzIHRoZSBjdXJyZW50IGNlbnRlcnBvaW50IG9mIHRoZSB2aWV3cG9ydFxuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4LDk2KS5jZW50ZXJBdCgxMCwxMCk7IC8vVmlld3BvcnQgaXMgbm93IG1vdmVkXG4gICAgICAgICAqIC8vQWZ0ZXIgbW92aW5nIHRoZSB2aWV3cG9ydCBieSBhbm90aGVyIGV2ZW50IHlvdSBjYW4gZ2V0IHRoZSBuZXcgY2VudGVyIHBvaW50XG4gICAgICAgICAqIGNvbnNvbGUubG9nKGlzby5jZW50ZXJBdCgpKTtcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBjZW50ZXJBdDpmdW5jdGlvbih4LHkpeyAgIFxuICAgICAgICAgICAgaWYodHlwZW9mIHggPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgeSA9PSBcIm51bWJlclwiKXtcbiAgICAgICAgICAgICAgICB2YXIgY2VudGVyID0gdGhpcy5wb3MycHgoeCx5KTtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuX3ggPSAtY2VudGVyLmxlZnQrQ3JhZnR5LnZpZXdwb3J0LndpZHRoLzItdGhpcy5fdGlsZS53aWR0aC8yO1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5feSA9IC1jZW50ZXIudG9wK0NyYWZ0eS52aWV3cG9ydC5oZWlnaHQvMi10aGlzLl90aWxlLmhlaWdodC8yO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOi1DcmFmdHkudmlld3BvcnQuX3krQ3JhZnR5LnZpZXdwb3J0LmhlaWdodC8yLXRoaXMuX3RpbGUuaGVpZ2h0LzIsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6LUNyYWZ0eS52aWV3cG9ydC5feCtDcmFmdHkudmlld3BvcnQud2lkdGgvMi10aGlzLl90aWxlLndpZHRoLzJcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLmFyZWFcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLmFyZWEoKVxuICAgICAgICAgKiBAcmV0dXJuIE9iamVjdCB7eDp7c3RhcnQgTnVtYmVyLGVuZCBOdW1iZXJ9LHk6e3N0YXJ0IE51bWJlcixlbmQgTnVtYmVyfX1cbiAgICAgICAgICogXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIGdldCB0aGUgQXJlYSBzdXJyb3VuZGluZyBieSB0aGUgY2VudGVycG9pbnQgZGVwZW5kcyBvbiB2aWV3cG9ydCBoZWlnaHQgYW5kIHdpZHRoXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgsOTYpLmNlbnRlckF0KDEwLDEwKTsgLy9WaWV3cG9ydCBpcyBub3cgbW92ZWRcbiAgICAgICAgICogdmFyIGFyZWEgPSBpc28uYXJlYSgpOyAvL2dldCB0aGUgYXJlYVxuICAgICAgICAgKiBmb3IodmFyIHkgPSBhcmVhLnkuc3RhcnQ7eSA8PSBhcmVhLnkuZW5kO3krKyl7XG4gICAgICAgICAqICAgZm9yKHZhciB4ID0gYXJlYS54LnN0YXJ0IDt4IDw9IGFyZWEueC5lbmQ7eCsrKXtcbiAgICAgICAgICogICAgICAgaXNvLnBsYWNlKHgseSwwLENyYWZ0eS5lKFwiMkQsRE9NLGdyYXNcIikpOyAvL0Rpc3BsYXkgdGlsZXMgaW4gdGhlIFNjcmVlblxuICAgICAgICAgKiAgIH1cbiAgICAgICAgICogfSAgXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgYXJlYTpmdW5jdGlvbigpe1xuICAgICAgICAgICAgLy9HZXQgdGhlIGNlbnRlciBQb2ludCBpbiB0aGUgdmlld3BvcnRcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSB0aGlzLmNlbnRlckF0KCk7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSB0aGlzLnB4MnBvcygtY2VudGVyLmxlZnQrQ3JhZnR5LnZpZXdwb3J0LndpZHRoLzIsLWNlbnRlci50b3ArQ3JhZnR5LnZpZXdwb3J0LmhlaWdodC8yKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSB0aGlzLnB4MnBvcygtY2VudGVyLmxlZnQtQ3JhZnR5LnZpZXdwb3J0LndpZHRoLzIsLWNlbnRlci50b3AtQ3JhZnR5LnZpZXdwb3J0LmhlaWdodC8yKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgeDp7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0IDogc3RhcnQueCxcbiAgICAgICAgICAgICAgICAgICAgZW5kIDogZW5kLnhcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHk6e1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA6IHN0YXJ0LnksXG4gICAgICAgICAgICAgICAgICAgIGVuZCA6IGVuZC55XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBcbiAgICB9XG59KTtcblxuXG5DcmFmdHkuZXh0ZW5kKHtcbiAgICAvKipAXG4qICNDcmFmdHkuZGlhbW9uZElzb1xuKiBAY2F0ZWdvcnkgMkRcbiogUGxhY2UgZW50aXRpZXMgaW4gYSA0NWRlZyBkaWFtb25kIGlzb21ldHJpYyBmYXNoaW9uLiBJdCBpcyBzaW1pbGFyIHRvIGlzb21ldHJpYyBidXQgaGFzIGFub3RoZXIgZ3JpZCBsb2NhdGlvbnNcbiovXG4gICAgZGlhbW9uZElzbzp7XG4gICAgICAgIF90aWxlOiB7XG4gICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgICAgIHI6MFxuICAgICAgICB9LFxuICAgICAgICBfbWFwOntcbiAgICAgICAgICAgIHdpZHRoOjAsXG4gICAgICAgICAgICBoZWlnaHQ6MCxcbiAgICAgICAgICAgIHg6MCxcbiAgICAgICAgICAgIHk6MFxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgX29yaWdpbjp7XG4gICAgICAgICAgICB4OjAsXG4gICAgICAgICAgICB5OjBcbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZGlhbW9uZElzby5pbml0XG4gICAgICAgICogQGNvbXAgQ3JhZnR5LmRpYW1vbmRJc29cbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuZGlhbW9uZElzby5pbml0KE51bWJlciB0aWxlV2lkdGgsTnVtYmVyIHRpbGVIZWlnaHQsTnVtYmVyIG1hcFdpZHRoLE51bWJlciBtYXBIZWlnaHQpXG4gICAgICAgICogQHBhcmFtIHRpbGVXaWR0aCAtIFRoZSBzaXplIG9mIGJhc2UgdGlsZSB3aWR0aCBpbiBQaXhlbFxuICAgICAgICAqIEBwYXJhbSB0aWxlSGVpZ2h0IC0gVGhlIHNpemUgb2YgYmFzZSB0aWxlIGhlaWdodCBpbiBQaXhlbFxuICAgICAgICAqIEBwYXJhbSBtYXBXaWR0aCAtIFRoZSB3aWR0aCBvZiB3aG9sZSBtYXAgaW4gVGlsZXNcbiAgICAgICAgKiBAcGFyYW0gbWFwSGVpZ2h0IC0gVGhlIGhlaWdodCBvZiB3aG9sZSBtYXAgaW4gVGlsZXNcbiAgICAgICAgKiBcbiAgICAgICAgKiBNZXRob2QgdXNlZCB0byBpbml0aWFsaXplIHRoZSBzaXplIG9mIHRoZSBpc29tZXRyaWMgcGxhY2VtZW50LlxuICAgICAgICAqIFJlY29tbWVuZGVkIHRvIHVzZSBhIHNpemUgYWx1ZXMgaW4gdGhlIHBvd2VyIG9mIGAyYCAoMTI4LCA2NCBvciAzMikuXG4gICAgICAgICogVGhpcyBtYWtlcyBpdCBlYXN5IHRvIGNhbGN1bGF0ZSBwb3NpdGlvbnMgYW5kIGltcGxlbWVudCB6b29taW5nLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5kaWFtb25kSXNvLmluaXQoNjQsMTI4LDIwLDIwKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5kaWFtb25kSXNvLnBsYWNlXG4gICAgICAgICovXG4gICAgICAgIGluaXQ6ZnVuY3Rpb24odHcsIHRoLG13LG1oKXtcbiAgICAgICAgICAgIHRoaXMuX3RpbGUud2lkdGggPSBwYXJzZUludCh0dyk7XG4gICAgICAgICAgICB0aGlzLl90aWxlLmhlaWdodCA9IHBhcnNlSW50KHRoKXx8cGFyc2VJbnQodHcpLzI7XG4gICAgICAgICAgICB0aGlzLl90aWxlLnIgPSB0aGlzLl90aWxlLndpZHRoIC8gdGhpcy5fdGlsZS5oZWlnaHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuX21hcC53aWR0aCA9IHBhcnNlSW50KG13KTtcbiAgICAgICAgICAgIHRoaXMuX21hcC5oZWlnaHQgPSBwYXJzZUludChtaCkgfHwgcGFyc2VJbnQobXcpO1xuICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fb3JpZ2luLnggPSB0aGlzLl9tYXAuaGVpZ2h0ICogdGhpcy5fdGlsZS53aWR0aCAvIDI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmRpYW1vbmRJc28ucGxhY2VcbiAgICAgICAgKiBAY29tcCBDcmFmdHkuZGlhbW9uZElzb1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5kaWFtb25kSXNvLnBsYWNlKEVudGl0eSB0aWxlLE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIGxheWVyKVxuICAgICAgICAqIEBwYXJhbSB4IC0gVGhlIGB4YCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgdGlsZVxuICAgICAgICAqIEBwYXJhbSB5IC0gVGhlIGB5YCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgdGlsZVxuICAgICAgICAqIEBwYXJhbSBsYXllciAtIFRoZSBgemAgcG9zaXRpb24gdG8gcGxhY2UgdGhlIHRpbGUgKGNhbGN1bGF0ZWQgYnkgeSBwb3NpdGlvbiAqIGxheWVyKVxuICAgICAgICAqIEBwYXJhbSB0aWxlIC0gVGhlIGVudGl0eSB0aGF0IHNob3VsZCBiZSBwb3NpdGlvbiBpbiB0aGUgaXNvbWV0cmljIGZhc2hpb25cbiAgICAgICAgKiBcbiAgICAgICAgKiBVc2UgdGhpcyBtZXRob2QgdG8gcGxhY2UgYW4gZW50aXR5IGluIGFuIGlzb21ldHJpYyBncmlkLlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5kaWFtb25kSXNvLmluaXQoNjQsMTI4LDIwLDIwKTtcbiAgICAgICAgKiBpc29zLnBsYWNlKENyYWZ0eS5lKCcyRCwgRE9NLCBDb2xvcicpLmNvbG9yKCdyZWQnKS5hdHRyKHt3OjEyOCwgaDoxMjh9KSwxLDEsMik7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuZGlhbW9uZElzby5zaXplXG4gICAgICAgICovXG4gICAgICAgIHBsYWNlOmZ1bmN0aW9uKG9iaix4LHksbGF5ZXIpe1xuICAgICAgICAgICAgdmFyIHBvcyA9IHRoaXMucG9zMnB4KHgseSk7XG4gICAgICAgICAgICBpZighbGF5ZXIpIGxheWVyID0gMTtcbiAgICAgICAgICAgIHZhciBtYXJnaW5YID0gMCxtYXJnaW5ZID0gMDtcbiAgICAgICAgICAgIGlmKG9iai5fX21hcmdpbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICBtYXJnaW5YID0gb2JqLl9fbWFyZ2luWzBdO1xuICAgICAgICAgICAgICAgIG1hcmdpblkgPSBvYmouX19tYXJnaW5bMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgICBvYmoueCA9IHBvcy5sZWZ0KyhtYXJnaW5YKTtcbiAgICAgICAgICAgIG9iai55ID0gKHBvcy50b3ArbWFyZ2luWSktb2JqLmg7XG4gICAgICAgICAgICBvYmoueiA9IChwb3MudG9wKSpsYXllcjtcbiAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgY2VudGVyQXQ6ZnVuY3Rpb24oeCx5KXtcbiAgICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBvczJweCh4LHkpO1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggPSAtcG9zLmxlZnQrQ3JhZnR5LnZpZXdwb3J0LndpZHRoLzItdGhpcy5fdGlsZS53aWR0aDtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ID0gLXBvcy50b3ArQ3JhZnR5LnZpZXdwb3J0LmhlaWdodC8yO1xuICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgYXJlYTpmdW5jdGlvbihvZmZzZXQpe1xuICAgICAgICAgICAgaWYoIW9mZnNldCkgb2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIC8vY2FsY3VsYXRlIHRoZSBjb3JuZXJzXG4gICAgICAgICAgICB2YXIgdnAgPSBDcmFmdHkudmlld3BvcnQucmVjdCgpO1xuICAgICAgICAgICAgdmFyIG93ID0gb2Zmc2V0KnRoaXMuX3RpbGUud2lkdGg7XG4gICAgICAgICAgICB2YXIgb2ggPSBvZmZzZXQqdGhpcy5fdGlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB2cC5feCAtPSAodGhpcy5fdGlsZS53aWR0aC8yK293KTtcbiAgICAgICAgICAgIHZwLl95IC09ICh0aGlzLl90aWxlLmhlaWdodC8yK29oKTtcbiAgICAgICAgICAgIHZwLl93ICs9ICh0aGlzLl90aWxlLndpZHRoLzIrb3cpO1xuICAgICAgICAgICAgdnAuX2ggKz0gKHRoaXMuX3RpbGUuaGVpZ2h0LzIrb2gpOyBcbiAgICAgICAgICAgIC8qICBDcmFmdHkudmlld3BvcnQueCA9IC12cC5feDtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ID0gLXZwLl95OyAgICBcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC53aWR0aCA9IHZwLl93O1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCA9IHZwLl9oOyAgICovXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBncmlkID0gW107XG4gICAgICAgICAgICBmb3IodmFyIHkgPSB2cC5feSx5bCA9ICh2cC5feSt2cC5faCk7eTx5bDt5Kz10aGlzLl90aWxlLmhlaWdodC8yKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIHggPSB2cC5feCx4bCA9ICh2cC5feCt2cC5fdyk7eDx4bDt4Kz10aGlzLl90aWxlLndpZHRoLzIpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgcm93ID0gdGhpcy5weDJwb3MoeCx5KTtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5wdXNoKFt+fnJvdy54LH5+cm93LnldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZ3JpZDsgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIHBvczJweDpmdW5jdGlvbih4LHkpe1xuICAgICAgICAgICAgcmV0dXJue1xuICAgICAgICAgICAgICAgIGxlZnQ6KCh4LXkpKnRoaXMuX3RpbGUud2lkdGgvMit0aGlzLl9vcmlnaW4ueCksXG4gICAgICAgICAgICAgICAgdG9wOigoeCt5KSp0aGlzLl90aWxlLmhlaWdodC8yKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBweDJwb3M6ZnVuY3Rpb24obGVmdCx0b3Ape1xuICAgICAgICAgICAgdmFyIHggPSAobGVmdCAtIHRoaXMuX29yaWdpbi54KS90aGlzLl90aWxlLnI7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHg6KCh0b3AreCkgLyB0aGlzLl90aWxlLmhlaWdodCksXG4gICAgICAgICAgICAgICAgeTooKHRvcC14KSAvIHRoaXMuX3RpbGUuaGVpZ2h0KVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgcG9seWdvbjpmdW5jdGlvbihvYmope1xuICAgICBcbiAgICAgICAgICAgIG9iai5yZXF1aXJlcyhcIkNvbGxpc2lvblwiKTtcbiAgICAgICAgICAgIHZhciBtYXJnaW5YID0gMCxtYXJnaW5ZID0gMDtcbiAgICAgICAgICAgIGlmKG9iai5fX21hcmdpbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICBtYXJnaW5YID0gb2JqLl9fbWFyZ2luWzBdO1xuICAgICAgICAgICAgICAgIG1hcmdpblkgPSBvYmouX19tYXJnaW5bMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcG9pbnRzID0gW1xuICAgICAgICAgICAgW21hcmdpblgtMCxvYmouaC1tYXJnaW5ZLXRoaXMuX3RpbGUuaGVpZ2h0LzJdLFxuICAgICAgICAgICAgW21hcmdpblgtdGhpcy5fdGlsZS53aWR0aC8yLG9iai5oLW1hcmdpblktMF0sXG4gICAgICAgICAgICBbbWFyZ2luWC10aGlzLl90aWxlLndpZHRoLG9iai5oLW1hcmdpblktdGhpcy5fdGlsZS5oZWlnaHQvMl0sXG4gICAgICAgICAgICBbbWFyZ2luWC10aGlzLl90aWxlLndpZHRoLzIsb2JqLmgtbWFyZ2luWS10aGlzLl90aWxlLmhlaWdodF1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICB2YXIgcG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihwb2ludHMpO1xuICAgICAgICAgICAgcmV0dXJuIHBvbHk7XG4gICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgXG4gICAgfVxufSk7XG5cblxuLyoqQFxuKiAjUGFydGljbGVzXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBCYXNlZCBvbiBQYXJjeWNsZSBieSBNci4gU3BlYWtlciwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCwgUG9ydGVkIGJ5IExlbyBLb3BwZWxrYW1tXG4qICoqVGhpcyBpcyBjYW52YXMgb25seSAmIHdvbid0IGRvIGFueXRoaW5nIGlmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBpdCEqKlxuKiBUbyBzZWUgaG93IHRoaXMgd29ya3MgdGFrZSBhIGxvb2sgaW4gaHR0cHM6Ly9naXRodWIuY29tL2NyYWZ0eWpzL0NyYWZ0eS9ibG9iL21hc3Rlci9zcmMvcGFydGljbGVzLmpzXG4qL1xuQ3JhZnR5LmMoXCJQYXJ0aWNsZXNcIiwge1xuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly9XZSBuZWVkIHRvIGNsb25lIGl0XG5cdFx0dGhpcy5fUGFydGljbGVzID0gQ3JhZnR5LmNsb25lKHRoaXMuX1BhcnRpY2xlcyk7XG5cdH0sXG5cblx0LyoqQFxuICAgICogIy5wYXJ0aWNsZXNcbiAgICAqIEBjb21wIFBhcnRpY2xlc1xuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnBhcnRpY2xlcyhPYmplY3Qgb3B0aW9ucylcbiAgICAqIEBwYXJhbSBvcHRpb25zIC0gTWFwIG9mIG9wdGlvbnMgdGhhdCBzcGVjaWZ5IHRoZSBiZWhhdmlvciBhbmQgbG9vayBvZiB0aGUgcGFydGljbGVzLlxuICAgICpcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cblx0KiB2YXIgb3B0aW9ucyA9IHtcblx0Klx0bWF4UGFydGljbGVzOiAxNTAsXG5cdCpcdHNpemU6IDE4LFxuXHQqXHRzaXplUmFuZG9tOiA0LFxuXHQqXHRzcGVlZDogMSxcblx0Klx0c3BlZWRSYW5kb206IDEuMixcblx0Klx0Ly8gTGlmZXNwYW4gaW4gZnJhbWVzXG5cdCpcdGxpZmVTcGFuOiAyOSxcblx0Klx0bGlmZVNwYW5SYW5kb206IDcsXG5cdCpcdC8vIEFuZ2xlIGlzIGNhbGN1bGF0ZWQgY2xvY2t3aXNlOiAxMnBtIGlzIDBkZWcsIDNwbSBpcyA5MGRlZyBldGMuXG5cdCpcdGFuZ2xlOiA2NSxcblx0Klx0YW5nbGVSYW5kb206IDM0LFxuXHQqXHRzdGFydENvbG91cjogWzI1NSwgMTMxLCAwLCAxXSxcblx0Klx0c3RhcnRDb2xvdXJSYW5kb206IFs0OCwgNTAsIDQ1LCAwXSxcblx0Klx0ZW5kQ29sb3VyOiBbMjQ1LCAzNSwgMCwgMF0sXG5cdCpcdGVuZENvbG91clJhbmRvbTogWzYwLCA2MCwgNjAsIDBdLFxuXHQqXHQvLyBPbmx5IGFwcGxpZXMgd2hlbiBmYXN0TW9kZSBpcyBvZmYsIHNwZWNpZmllcyBob3cgc2hhcnAgdGhlIGdyYWRpZW50cyBhcmUgZHJhd25cblx0Klx0c2hhcnBuZXNzOiAyMCxcblx0Klx0c2hhcnBuZXNzUmFuZG9tOiAxMCxcblx0Klx0Ly8gUmFuZG9tIHNwcmVhZCBmcm9tIG9yaWdpblxuXHQqXHRzcHJlYWQ6IDEwLFxuXHQqXHQvLyBIb3cgbWFueSBmcmFtZXMgc2hvdWxkIHRoaXMgbGFzdFxuXHQqXHRkdXJhdGlvbjogLTEsXG5cdCpcdC8vIFdpbGwgZHJhdyBzcXVhcmVzIGluc3RlYWQgb2YgY2lyY2xlIGdyYWRpZW50c1xuXHQqXHRmYXN0TW9kZTogZmFsc2UsXG5cdCpcdGdyYXZpdHk6IHsgeDogMCwgeTogMC4xIH0sXG5cdCpcdC8vIHNlbnNpYmxlIHZhbHVlcyBhcmUgMC0zXG5cdCpcdGppdHRlcjogMFxuXHQqIH1cblx0KlxuXHQqIENyYWZ0eS5lKFwiMkQsQ2FudmFzLFBhcnRpY2xlc1wiKS5wYXJ0aWNsZXMob3B0aW9ucyk7XG4gICAgKiB+fn5cbiAgICAqL1xuXHRwYXJ0aWNsZXM6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cblx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmNhbnZhcyB8fCBDcmFmdHkuZGVhY3RpdmF0ZVBhcnRpY2xlcykgcmV0dXJuIHRoaXM7XG5cblx0XHQvL0lmIHdlIGRyZXcgb24gdGhlIG1haW4gY2FudmFzLCB3ZSdkIGhhdmUgdG8gcmVkcmF3XG5cdFx0Ly9wb3RlbnRpYWxseSBodWdlIHNlY3Rpb25zIG9mIHRoZSBzY3JlZW4gZXZlcnkgZnJhbWVcblx0XHQvL1NvIHdlIGNyZWF0ZSBhIHNlcGFyYXRlIGNhbnZhcywgd2hlcmUgd2Ugb25seSBoYXZlIHRvIHJlZHJhd1xuXHRcdC8vdGhlIGNoYW5nZWQgcGFydGljbGVzLlxuXHRcdHZhciBjLCBjdHgsIHJlbGF0aXZlWCwgcmVsYXRpdmVZLCBib3VuZGluZztcblxuXHRcdGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuXHRcdGMud2lkdGggPSBDcmFmdHkudmlld3BvcnQud2lkdGg7XG5cdFx0Yy5oZWlnaHQgPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXHRcdGMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXG5cdFx0Q3JhZnR5LnN0YWdlLmVsZW0uYXBwZW5kQ2hpbGQoYyk7XG5cblx0XHRjdHggPSBjLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHR0aGlzLl9QYXJ0aWNsZXMuaW5pdChvcHRpb25zKTtcblxuXHRcdC8vIENsZWFuIHVwIHRoZSBET00gd2hlbiB0aGlzIGNvbXBvbmVudCBpcyByZW1vdmVkXG5cdFx0dGhpcy5iaW5kKCdSZW1vdmUnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5yZW1vdmVDaGlsZChjKTtcblx0XHR9KS5iaW5kKFwiUmVtb3ZlQ29tcG9uZW50XCIsIGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0aWYgKGlkID09PSBcInBhcnRpY2xlc1wiKVxuXHRcdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5yZW1vdmVDaGlsZChjKTtcblx0XHR9KTs7XG5cblx0XHRyZWxhdGl2ZVggPSB0aGlzLnggKyBDcmFmdHkudmlld3BvcnQueDtcblx0XHRyZWxhdGl2ZVkgPSB0aGlzLnkgKyBDcmFmdHkudmlld3BvcnQueTtcblx0XHR0aGlzLl9QYXJ0aWNsZXMucG9zaXRpb24gPSB0aGlzLl9QYXJ0aWNsZXMudmVjdG9ySGVscGVycy5jcmVhdGUocmVsYXRpdmVYLCByZWxhdGl2ZVkpO1xuXG5cdFx0dmFyIG9sZFZpZXdwb3J0ID0geyB4OiBDcmFmdHkudmlld3BvcnQueCwgeTogQ3JhZnR5LnZpZXdwb3J0LnkgfTtcblxuXHRcdHRoaXMuYmluZCgnRW50ZXJGcmFtZScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdHJlbGF0aXZlWCA9IHRoaXMueCArIENyYWZ0eS52aWV3cG9ydC54O1xuXHRcdFx0cmVsYXRpdmVZID0gdGhpcy55ICsgQ3JhZnR5LnZpZXdwb3J0Lnk7XG5cdFx0XHR0aGlzLl9QYXJ0aWNsZXMudmlld3BvcnREZWx0YSA9IHsgeDogQ3JhZnR5LnZpZXdwb3J0LnggLSBvbGRWaWV3cG9ydC54LCB5OiBDcmFmdHkudmlld3BvcnQueSAtIG9sZFZpZXdwb3J0LnkgfTtcblxuXHRcdFx0b2xkVmlld3BvcnQgPSB7IHg6IENyYWZ0eS52aWV3cG9ydC54LCB5OiBDcmFmdHkudmlld3BvcnQueSB9O1xuXG5cdFx0XHR0aGlzLl9QYXJ0aWNsZXMucG9zaXRpb24gPSB0aGlzLl9QYXJ0aWNsZXMudmVjdG9ySGVscGVycy5jcmVhdGUocmVsYXRpdmVYLCByZWxhdGl2ZVkpO1xuXG5cdFx0XHQvL1NlbGVjdGl2ZSBjbGVhcmluZ1xuXHRcdFx0aWYgKHR5cGVvZiBDcmFmdHkuRHJhd01hbmFnZXIuYm91bmRpbmdSZWN0ID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Ym91bmRpbmcgPSBDcmFmdHkuRHJhd01hbmFnZXIuYm91bmRpbmdSZWN0KHRoaXMuX1BhcnRpY2xlcy5yZWdpc3Rlcik7XG5cdFx0XHRcdGlmIChib3VuZGluZykgY3R4LmNsZWFyUmVjdChib3VuZGluZy5feCwgYm91bmRpbmcuX3ksIGJvdW5kaW5nLl93LCBib3VuZGluZy5faCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIENyYWZ0eS52aWV3cG9ydC53aWR0aCwgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vVGhpcyB1cGRhdGVzIGFsbCBwYXJ0aWNsZSBjb2xvcnMgJiBwb3NpdGlvbnNcblx0XHRcdHRoaXMuX1BhcnRpY2xlcy51cGRhdGUoKTtcblxuXHRcdFx0Ly9UaGlzIHJlbmRlcnMgdGhlIHVwZGF0ZWQgcGFydGljbGVzXG5cdFx0XHR0aGlzLl9QYXJ0aWNsZXMucmVuZGVyKGN0eCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdF9QYXJ0aWNsZXM6IHtcblx0XHRwcmVzZXRzOiB7XG5cdFx0XHRtYXhQYXJ0aWNsZXM6IDE1MCxcblx0XHRcdHNpemU6IDE4LFxuXHRcdFx0c2l6ZVJhbmRvbTogNCxcblx0XHRcdHNwZWVkOiAxLFxuXHRcdFx0c3BlZWRSYW5kb206IDEuMixcblx0XHRcdC8vIExpZmVzcGFuIGluIGZyYW1lc1xuXHRcdFx0bGlmZVNwYW46IDI5LFxuXHRcdFx0bGlmZVNwYW5SYW5kb206IDcsXG5cdFx0XHQvLyBBbmdsZSBpcyBjYWxjdWxhdGVkIGNsb2Nrd2lzZTogMTJwbSBpcyAwZGVnLCAzcG0gaXMgOTBkZWcgZXRjLlxuXHRcdFx0YW5nbGU6IDY1LFxuXHRcdFx0YW5nbGVSYW5kb206IDM0LFxuXHRcdFx0c3RhcnRDb2xvdXI6IFsyNTUsIDEzMSwgMCwgMV0sXG5cdFx0XHRzdGFydENvbG91clJhbmRvbTogWzQ4LCA1MCwgNDUsIDBdLFxuXHRcdFx0ZW5kQ29sb3VyOiBbMjQ1LCAzNSwgMCwgMF0sXG5cdFx0XHRlbmRDb2xvdXJSYW5kb206IFs2MCwgNjAsIDYwLCAwXSxcblx0XHRcdC8vIE9ubHkgYXBwbGllcyB3aGVuIGZhc3RNb2RlIGlzIG9mZiwgc3BlY2lmaWVzIGhvdyBzaGFycCB0aGUgZ3JhZGllbnRzIGFyZSBkcmF3blxuXHRcdFx0c2hhcnBuZXNzOiAyMCxcblx0XHRcdHNoYXJwbmVzc1JhbmRvbTogMTAsXG5cdFx0XHQvLyBSYW5kb20gc3ByZWFkIGZyb20gb3JpZ2luXG5cdFx0XHRzcHJlYWQ6IDEwLFxuXHRcdFx0Ly8gSG93IG1hbnkgZnJhbWVzIHNob3VsZCB0aGlzIGxhc3Rcblx0XHRcdGR1cmF0aW9uOiAtMSxcblx0XHRcdC8vIFdpbGwgZHJhdyBzcXVhcmVzIGluc3RlYWQgb2YgY2lyY2xlIGdyYWRpZW50c1xuXHRcdFx0ZmFzdE1vZGU6IGZhbHNlLFxuXHRcdFx0Z3Jhdml0eTogeyB4OiAwLCB5OiAwLjEgfSxcblx0XHRcdC8vIHNlbnNpYmxlIHZhbHVlcyBhcmUgMC0zXG5cdFx0XHRqaXR0ZXI6IDAsXG5cblx0XHRcdC8vRG9uJ3QgbW9kaWZ5IHRoZSBmb2xsb3dpbmdcblx0XHRcdHBhcnRpY2xlczogW10sXG5cdFx0XHRhY3RpdmU6IHRydWUsXG5cdFx0XHRwYXJ0aWNsZUNvdW50OiAwLFxuXHRcdFx0ZWxhcHNlZEZyYW1lczogMCxcblx0XHRcdGVtaXNzaW9uUmF0ZTogMCxcblx0XHRcdGVtaXRDb3VudGVyOiAwLFxuXHRcdFx0cGFydGljbGVJbmRleDogMFxuXHRcdH0sXG5cblxuXHRcdGluaXQ6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0XHR0aGlzLnBvc2l0aW9uID0gdGhpcy52ZWN0b3JIZWxwZXJzLmNyZWF0ZSgwLCAwKTtcblx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAndW5kZWZpbmVkJykgdmFyIG9wdGlvbnMgPSB7fTtcblxuXHRcdFx0Ly9DcmVhdGUgY3VycmVudCBjb25maWcgYnkgbWVyZ2luZyBnaXZlbiBvcHRpb25zIGFuZCBwcmVzZXRzLlxuXHRcdFx0Zm9yIChrZXkgaW4gdGhpcy5wcmVzZXRzKSB7XG5cdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9uc1trZXldICE9ICd1bmRlZmluZWQnKSB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG5cdFx0XHRcdGVsc2UgdGhpc1trZXldID0gdGhpcy5wcmVzZXRzW2tleV07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZW1pc3Npb25SYXRlID0gdGhpcy5tYXhQYXJ0aWNsZXMgLyB0aGlzLmxpZmVTcGFuO1xuXHRcdFx0dGhpcy5wb3NpdGlvblJhbmRvbSA9IHRoaXMudmVjdG9ySGVscGVycy5jcmVhdGUodGhpcy5zcHJlYWQsIHRoaXMuc3ByZWFkKTtcblx0XHR9LFxuXG5cdFx0YWRkUGFydGljbGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLnBhcnRpY2xlQ291bnQgPT0gdGhpcy5tYXhQYXJ0aWNsZXMpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUYWtlIHRoZSBuZXh0IHBhcnRpY2xlIG91dCBvZiB0aGUgcGFydGljbGUgcG9vbCB3ZSBoYXZlIGNyZWF0ZWQgYW5kIGluaXRpYWxpemUgaXRcblx0XHRcdHZhciBwYXJ0aWNsZSA9IG5ldyB0aGlzLnBhcnRpY2xlKHRoaXMudmVjdG9ySGVscGVycyk7XG5cdFx0XHR0aGlzLmluaXRQYXJ0aWNsZShwYXJ0aWNsZSk7XG5cdFx0XHR0aGlzLnBhcnRpY2xlc1t0aGlzLnBhcnRpY2xlQ291bnRdID0gcGFydGljbGU7XG5cdFx0XHQvLyBJbmNyZW1lbnQgdGhlIHBhcnRpY2xlIGNvdW50XG5cdFx0XHR0aGlzLnBhcnRpY2xlQ291bnQrKztcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblx0XHRSQU5ETTFUTzE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBNYXRoLnJhbmRvbSgpICogMiAtIDE7XG5cdFx0fSxcblx0XHRpbml0UGFydGljbGU6IGZ1bmN0aW9uIChwYXJ0aWNsZSkge1xuXHRcdFx0cGFydGljbGUucG9zaXRpb24ueCA9IHRoaXMucG9zaXRpb24ueCArIHRoaXMucG9zaXRpb25SYW5kb20ueCAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRwYXJ0aWNsZS5wb3NpdGlvbi55ID0gdGhpcy5wb3NpdGlvbi55ICsgdGhpcy5wb3NpdGlvblJhbmRvbS55ICogdGhpcy5SQU5ETTFUTzEoKTtcblxuXHRcdFx0dmFyIG5ld0FuZ2xlID0gKHRoaXMuYW5nbGUgKyB0aGlzLmFuZ2xlUmFuZG9tICogdGhpcy5SQU5ETTFUTzEoKSkgKiAoTWF0aC5QSSAvIDE4MCk7IC8vIGNvbnZlcnQgdG8gcmFkaWFuc1xuXHRcdFx0dmFyIHZlY3RvciA9IHRoaXMudmVjdG9ySGVscGVycy5jcmVhdGUoTWF0aC5zaW4obmV3QW5nbGUpLCAtTWF0aC5jb3MobmV3QW5nbGUpKTsgLy8gQ291bGQgbW92ZSB0byBsb29rdXAgZm9yIHNwZWVkXG5cdFx0XHR2YXIgdmVjdG9yU3BlZWQgPSB0aGlzLnNwZWVkICsgdGhpcy5zcGVlZFJhbmRvbSAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRwYXJ0aWNsZS5kaXJlY3Rpb24gPSB0aGlzLnZlY3RvckhlbHBlcnMubXVsdGlwbHkodmVjdG9yLCB2ZWN0b3JTcGVlZCk7XG5cblx0XHRcdHBhcnRpY2xlLnNpemUgPSB0aGlzLnNpemUgKyB0aGlzLnNpemVSYW5kb20gKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0cGFydGljbGUuc2l6ZSA9IHBhcnRpY2xlLnNpemUgPCAwID8gMCA6IH5+cGFydGljbGUuc2l6ZTtcblx0XHRcdHBhcnRpY2xlLnRpbWVUb0xpdmUgPSB0aGlzLmxpZmVTcGFuICsgdGhpcy5saWZlU3BhblJhbmRvbSAqIHRoaXMuUkFORE0xVE8xKCk7XG5cblx0XHRcdHBhcnRpY2xlLnNoYXJwbmVzcyA9IHRoaXMuc2hhcnBuZXNzICsgdGhpcy5zaGFycG5lc3NSYW5kb20gKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0cGFydGljbGUuc2hhcnBuZXNzID0gcGFydGljbGUuc2hhcnBuZXNzID4gMTAwID8gMTAwIDogcGFydGljbGUuc2hhcnBuZXNzIDwgMCA/IDAgOiBwYXJ0aWNsZS5zaGFycG5lc3M7XG5cdFx0XHQvLyBpbnRlcm5hbCBjaXJjbGUgZ3JhZGllbnQgc2l6ZSAtIGFmZmVjdHMgdGhlIHNoYXJwbmVzcyBvZiB0aGUgcmFkaWFsIGdyYWRpZW50XG5cdFx0XHRwYXJ0aWNsZS5zaXplU21hbGwgPSB+figocGFydGljbGUuc2l6ZSAvIDIwMCkgKiBwYXJ0aWNsZS5zaGFycG5lc3MpOyAvLyhzaXplLzIvMTAwKVxuXHRcdFx0dmFyIHN0YXJ0ID0gW1xuXHRcdFx0XHR0aGlzLnN0YXJ0Q29sb3VyWzBdICsgdGhpcy5zdGFydENvbG91clJhbmRvbVswXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuc3RhcnRDb2xvdXJbMV0gKyB0aGlzLnN0YXJ0Q29sb3VyUmFuZG9tWzFdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5zdGFydENvbG91clsyXSArIHRoaXMuc3RhcnRDb2xvdXJSYW5kb21bMl0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLnN0YXJ0Q29sb3VyWzNdICsgdGhpcy5zdGFydENvbG91clJhbmRvbVszXSAqIHRoaXMuUkFORE0xVE8xKClcblx0XHRcdFx0XTtcblxuXHRcdFx0dmFyIGVuZCA9IFtcblx0XHRcdFx0dGhpcy5lbmRDb2xvdXJbMF0gKyB0aGlzLmVuZENvbG91clJhbmRvbVswXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuZW5kQ29sb3VyWzFdICsgdGhpcy5lbmRDb2xvdXJSYW5kb21bMV0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLmVuZENvbG91clsyXSArIHRoaXMuZW5kQ29sb3VyUmFuZG9tWzJdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5lbmRDb2xvdXJbM10gKyB0aGlzLmVuZENvbG91clJhbmRvbVszXSAqIHRoaXMuUkFORE0xVE8xKClcblx0XHRcdFx0XTtcblxuXHRcdFx0cGFydGljbGUuY29sb3VyID0gc3RhcnQ7XG5cdFx0XHRwYXJ0aWNsZS5kZWx0YUNvbG91clswXSA9IChlbmRbMF0gLSBzdGFydFswXSkgLyBwYXJ0aWNsZS50aW1lVG9MaXZlO1xuXHRcdFx0cGFydGljbGUuZGVsdGFDb2xvdXJbMV0gPSAoZW5kWzFdIC0gc3RhcnRbMV0pIC8gcGFydGljbGUudGltZVRvTGl2ZTtcblx0XHRcdHBhcnRpY2xlLmRlbHRhQ29sb3VyWzJdID0gKGVuZFsyXSAtIHN0YXJ0WzJdKSAvIHBhcnRpY2xlLnRpbWVUb0xpdmU7XG5cdFx0XHRwYXJ0aWNsZS5kZWx0YUNvbG91clszXSA9IChlbmRbM10gLSBzdGFydFszXSkgLyBwYXJ0aWNsZS50aW1lVG9MaXZlO1xuXHRcdH0sXG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5hY3RpdmUgJiYgdGhpcy5lbWlzc2lvblJhdGUgPiAwKSB7XG5cdFx0XHRcdHZhciByYXRlID0gMSAvIHRoaXMuZW1pc3Npb25SYXRlO1xuXHRcdFx0XHR0aGlzLmVtaXRDb3VudGVyKys7XG5cdFx0XHRcdHdoaWxlICh0aGlzLnBhcnRpY2xlQ291bnQgPCB0aGlzLm1heFBhcnRpY2xlcyAmJiB0aGlzLmVtaXRDb3VudGVyID4gcmF0ZSkge1xuXHRcdFx0XHRcdHRoaXMuYWRkUGFydGljbGUoKTtcblx0XHRcdFx0XHR0aGlzLmVtaXRDb3VudGVyIC09IHJhdGU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5lbGFwc2VkRnJhbWVzKys7XG5cdFx0XHRcdGlmICh0aGlzLmR1cmF0aW9uICE9IC0xICYmIHRoaXMuZHVyYXRpb24gPCB0aGlzLmVsYXBzZWRGcmFtZXMpIHtcblx0XHRcdFx0XHR0aGlzLnN0b3AoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnBhcnRpY2xlSW5kZXggPSAwO1xuXHRcdFx0dGhpcy5yZWdpc3RlciA9IFtdO1xuXHRcdFx0dmFyIGRyYXc7XG5cdFx0XHR3aGlsZSAodGhpcy5wYXJ0aWNsZUluZGV4IDwgdGhpcy5wYXJ0aWNsZUNvdW50KSB7XG5cblx0XHRcdFx0dmFyIGN1cnJlbnRQYXJ0aWNsZSA9IHRoaXMucGFydGljbGVzW3RoaXMucGFydGljbGVJbmRleF07XG5cblx0XHRcdFx0Ly8gSWYgdGhlIGN1cnJlbnQgcGFydGljbGUgaXMgYWxpdmUgdGhlbiB1cGRhdGUgaXRcblx0XHRcdFx0aWYgKGN1cnJlbnRQYXJ0aWNsZS50aW1lVG9MaXZlID4gMCkge1xuXG5cdFx0XHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBuZXcgZGlyZWN0aW9uIGJhc2VkIG9uIGdyYXZpdHlcblx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUuZGlyZWN0aW9uID0gdGhpcy52ZWN0b3JIZWxwZXJzLmFkZChjdXJyZW50UGFydGljbGUuZGlyZWN0aW9uLCB0aGlzLmdyYXZpdHkpO1xuXHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbiA9IHRoaXMudmVjdG9ySGVscGVycy5hZGQoY3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLCBjdXJyZW50UGFydGljbGUuZGlyZWN0aW9uKTtcblx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUucG9zaXRpb24gPSB0aGlzLnZlY3RvckhlbHBlcnMuYWRkKGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbiwgdGhpcy52aWV3cG9ydERlbHRhKTtcblx0XHRcdFx0XHRpZiAodGhpcy5qaXR0ZXIpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbi54ICs9IHRoaXMuaml0dGVyICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbi55ICs9IHRoaXMuaml0dGVyICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLnRpbWVUb0xpdmUtLTtcblxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBjb2xvdXJzXG5cdFx0XHRcdFx0dmFyIHIgPSBjdXJyZW50UGFydGljbGUuY29sb3VyWzBdICs9IGN1cnJlbnRQYXJ0aWNsZS5kZWx0YUNvbG91clswXTtcblx0XHRcdFx0XHR2YXIgZyA9IGN1cnJlbnRQYXJ0aWNsZS5jb2xvdXJbMV0gKz0gY3VycmVudFBhcnRpY2xlLmRlbHRhQ29sb3VyWzFdO1xuXHRcdFx0XHRcdHZhciBiID0gY3VycmVudFBhcnRpY2xlLmNvbG91clsyXSArPSBjdXJyZW50UGFydGljbGUuZGVsdGFDb2xvdXJbMl07XG5cdFx0XHRcdFx0dmFyIGEgPSBjdXJyZW50UGFydGljbGUuY29sb3VyWzNdICs9IGN1cnJlbnRQYXJ0aWNsZS5kZWx0YUNvbG91clszXTtcblxuXHRcdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgcmdiYSBzdHJpbmcgdG8gZHJhdy5cblx0XHRcdFx0XHRkcmF3ID0gW107XG5cdFx0XHRcdFx0ZHJhdy5wdXNoKFwicmdiYShcIiArIChyID4gMjU1ID8gMjU1IDogciA8IDAgPyAwIDogfn5yKSk7XG5cdFx0XHRcdFx0ZHJhdy5wdXNoKGcgPiAyNTUgPyAyNTUgOiBnIDwgMCA/IDAgOiB+fmcpO1xuXHRcdFx0XHRcdGRyYXcucHVzaChiID4gMjU1ID8gMjU1IDogYiA8IDAgPyAwIDogfn5iKTtcblx0XHRcdFx0XHRkcmF3LnB1c2goKGEgPiAxID8gMSA6IGEgPCAwID8gMCA6IGEudG9GaXhlZCgyKSkgKyBcIilcIik7XG5cdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLmRyYXdDb2xvdXIgPSBkcmF3LmpvaW4oXCIsXCIpO1xuXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmZhc3RNb2RlKSB7XG5cdFx0XHRcdFx0XHRkcmF3WzNdID0gXCIwKVwiO1xuXHRcdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLmRyYXdDb2xvdXJFbmQgPSBkcmF3LmpvaW4oXCIsXCIpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoaXMucGFydGljbGVJbmRleCsrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIFJlcGxhY2UgcGFydGljbGUgd2l0aCB0aGUgbGFzdCBhY3RpdmVcblx0XHRcdFx0XHRpZiAodGhpcy5wYXJ0aWNsZUluZGV4ICE9IHRoaXMucGFydGljbGVDb3VudCAtIDEpIHtcblx0XHRcdFx0XHRcdHRoaXMucGFydGljbGVzW3RoaXMucGFydGljbGVJbmRleF0gPSB0aGlzLnBhcnRpY2xlc1t0aGlzLnBhcnRpY2xlQ291bnQgLSAxXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5wYXJ0aWNsZUNvdW50LS07XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHJlY3QgPSB7fTtcblx0XHRcdFx0cmVjdC5feCA9IH5+Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLng7XG5cdFx0XHRcdHJlY3QuX3kgPSB+fmN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbi55O1xuXHRcdFx0XHRyZWN0Ll93ID0gY3VycmVudFBhcnRpY2xlLnNpemU7XG5cdFx0XHRcdHJlY3QuX2ggPSBjdXJyZW50UGFydGljbGUuc2l6ZTtcblxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyLnB1c2gocmVjdCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XG5cdFx0XHR0aGlzLmVsYXBzZWRGcmFtZXMgPSAwO1xuXHRcdFx0dGhpcy5lbWl0Q291bnRlciA9IDA7XG5cdFx0fSxcblxuXHRcdHJlbmRlcjogZnVuY3Rpb24gKGNvbnRleHQpIHtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGogPSB0aGlzLnBhcnRpY2xlQ291bnQ7IGkgPCBqOyBpKyspIHtcblx0XHRcdFx0dmFyIHBhcnRpY2xlID0gdGhpcy5wYXJ0aWNsZXNbaV07XG5cdFx0XHRcdHZhciBzaXplID0gcGFydGljbGUuc2l6ZTtcblx0XHRcdFx0dmFyIGhhbGZTaXplID0gc2l6ZSA+PiAxO1xuXG5cdFx0XHRcdGlmIChwYXJ0aWNsZS5wb3NpdGlvbi54ICsgc2l6ZSA8IDBcblx0XHRcdFx0XHR8fCBwYXJ0aWNsZS5wb3NpdGlvbi55ICsgc2l6ZSA8IDBcblx0XHRcdFx0XHR8fCBwYXJ0aWNsZS5wb3NpdGlvbi54IC0gc2l6ZSA+IENyYWZ0eS52aWV3cG9ydC53aWR0aFxuXHRcdFx0XHRcdHx8IHBhcnRpY2xlLnBvc2l0aW9uLnkgLSBzaXplID4gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCkge1xuXHRcdFx0XHRcdC8vUGFydGljbGUgaXMgb3V0c2lkZVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB4ID0gfn5wYXJ0aWNsZS5wb3NpdGlvbi54O1xuXHRcdFx0XHR2YXIgeSA9IH5+cGFydGljbGUucG9zaXRpb24ueTtcblxuXHRcdFx0XHRpZiAodGhpcy5mYXN0TW9kZSkge1xuXHRcdFx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gcGFydGljbGUuZHJhd0NvbG91cjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgcmFkZ3JhZCA9IGNvbnRleHQuY3JlYXRlUmFkaWFsR3JhZGllbnQoeCArIGhhbGZTaXplLCB5ICsgaGFsZlNpemUsIHBhcnRpY2xlLnNpemVTbWFsbCwgeCArIGhhbGZTaXplLCB5ICsgaGFsZlNpemUsIGhhbGZTaXplKTtcblx0XHRcdFx0XHRyYWRncmFkLmFkZENvbG9yU3RvcCgwLCBwYXJ0aWNsZS5kcmF3Q29sb3VyKTtcblx0XHRcdFx0XHQvLzAuOSB0byBhdm9pZCB2aXNpYmxlIGJveGluZ1xuXHRcdFx0XHRcdHJhZGdyYWQuYWRkQ29sb3JTdG9wKDAuOSwgcGFydGljbGUuZHJhd0NvbG91ckVuZCk7XG5cdFx0XHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSByYWRncmFkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgc2l6ZSwgc2l6ZSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRwYXJ0aWNsZTogZnVuY3Rpb24gKHZlY3RvckhlbHBlcnMpIHtcblx0XHRcdHRoaXMucG9zaXRpb24gPSB2ZWN0b3JIZWxwZXJzLmNyZWF0ZSgwLCAwKTtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gdmVjdG9ySGVscGVycy5jcmVhdGUoMCwgMCk7XG5cdFx0XHR0aGlzLnNpemUgPSAwO1xuXHRcdFx0dGhpcy5zaXplU21hbGwgPSAwO1xuXHRcdFx0dGhpcy50aW1lVG9MaXZlID0gMDtcblx0XHRcdHRoaXMuY29sb3VyID0gW107XG5cdFx0XHR0aGlzLmRyYXdDb2xvdXIgPSBcIlwiO1xuXHRcdFx0dGhpcy5kZWx0YUNvbG91ciA9IFtdO1xuXHRcdFx0dGhpcy5zaGFycG5lc3MgPSAwO1xuXHRcdH0sXG5cdFx0dmVjdG9ySGVscGVyczoge1xuXHRcdFx0Y3JlYXRlOiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFwieFwiOiB4LFxuXHRcdFx0XHRcdFwieVwiOiB5XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXHRcdFx0bXVsdGlwbHk6IGZ1bmN0aW9uICh2ZWN0b3IsIHNjYWxlRmFjdG9yKSB7XG5cdFx0XHRcdHZlY3Rvci54ICo9IHNjYWxlRmFjdG9yO1xuXHRcdFx0XHR2ZWN0b3IueSAqPSBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0cmV0dXJuIHZlY3Rvcjtcblx0XHRcdH0sXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uICh2ZWN0b3IxLCB2ZWN0b3IyKSB7XG5cdFx0XHRcdHZlY3RvcjEueCArPSB2ZWN0b3IyLng7XG5cdFx0XHRcdHZlY3RvcjEueSArPSB2ZWN0b3IyLnk7XG5cdFx0XHRcdHJldHVybiB2ZWN0b3IxO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5DcmFmdHkuZXh0ZW5kKHtcblx0LyoqQFxuXHQgKiAjQ3JhZnR5LmF1ZGlvXG5cdCAqIEBjYXRlZ29yeSBBdWRpb1xuXHQgKlxuXHQgKiBBZGQgc291bmQgZmlsZXMgYW5kIHBsYXkgdGhlbS4gQ2hvb3NlcyBiZXN0IGZvcm1hdCBmb3IgYnJvd3NlciBzdXBwb3J0LlxuXHQgKiBEdWUgdG8gdGhlIG5hdHVyZSBvZiBIVE1MNSBhdWRpbywgdGhyZWUgdHlwZXMgb2YgYXVkaW8gZmlsZXMgd2lsbCBiZVxuXHQgKiByZXF1aXJlZCBmb3IgY3Jvc3MtYnJvd3NlciBjYXBhYmlsaXRpZXMuIFRoZXNlIGZvcm1hdHMgYXJlIE1QMywgT2dnIGFuZCBXQVYuXG5cdCAqIFdoZW4gc291bmQgd2FzIG5vdCBtdXRlZCBvbiBiZWZvcmUgcGF1c2UsIHNvdW5kIHdpbGwgYmUgdW5tdXRlZCBhZnRlciB1bnBhdXNlLlxuXHQgKiBXaGVuIHNvdW5kIGlzIG11dGVkIENyYWZ0eS5wYXVzZSgpIGRvZXMgbm90IGhhdmUgYW55IGVmZmVjdCBvbiBzb3VuZC5cblx0ICovXG5cdGF1ZGlvIDoge1xuXHRcdHNvdW5kcyA6IHt9LFxuXHRcdHN1cHBvcnRlZCA6IHt9LFxuXHRcdGNvZGVjcyA6IHsvLyBDaGFydCBmcm9tIGpQbGF5ZXJcblx0XHRcdG9nZyA6ICdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJywgLy9PR0dcblx0XHRcdHdhdiA6ICdhdWRpby93YXY7IGNvZGVjcz1cIjFcIicsIC8vIFBDTVxuXHRcdFx0d2VibWEgOiAnYXVkaW8vd2VibTsgY29kZWNzPVwidm9yYmlzXCInLCAvLyBXRUJNXG5cdFx0XHRtcDMgOiAnYXVkaW8vbXBlZzsgY29kZWNzPVwibXAzXCInLCAvL01QM1xuXHRcdFx0bTRhIDogJ2F1ZGlvL21wNDsgY29kZWNzPVwibXA0YS40MC4yXCInLy8gQUFDIC8gTVA0XG5cdFx0fSxcblx0XHR2b2x1bWUgOiAxLCAvL0dsb2JhbCBWb2x1bWVcblx0XHRtdXRlZCA6IGZhbHNlLFxuXHRcdHBhdXNlZCA6IGZhbHNlLFxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHRvIHNldHVwIHN1cHBvcnRlZCBmb3JtYXRzXG5cdFx0ICoqL1xuXHRcdGNhblBsYXkgOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhdWRpbyA9IHRoaXMuYXVkaW9FbGVtZW50KCksIGNhbnBsYXk7XG5cdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuY29kZWNzKSB7XG5cdFx0XHRcdGNhbnBsYXkgPSBhdWRpby5jYW5QbGF5VHlwZSh0aGlzLmNvZGVjc1tpXSk7XG5cdFx0XHRcdGlmIChjYW5wbGF5ICE9PSBcIlwiICYmIGNhbnBsYXkgIT09IFwibm9cIikge1xuXHRcdFx0XHRcdHRoaXMuc3VwcG9ydGVkW2ldID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnN1cHBvcnRlZFtpXSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHRvIGdldCBhbiBBdWRpbyBFbGVtZW50XG5cdFx0ICoqL1xuXHRcdGF1ZGlvRWxlbWVudCA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly9JRSBkb2VzIG5vdCBzdXBwb3J0IEF1ZGlvIE9iamVjdFxuXHRcdFx0cmV0dXJuIHR5cGVvZiBBdWRpbyAhPT0gJ3VuZGVmaW5lZCcgPyBuZXcgQXVkaW8oXCJcIikgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8uYWRkXG5cdFx0ICogQGNvbXAgQ3JhZnR5LmF1ZGlvXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLmFkZChTdHJpbmcgaWQsIFN0cmluZyB1cmwpXG5cdFx0ICogQHBhcmFtIGlkIC0gQSBzdHJpbmcgdG8gcmVmZXIgdG8gc291bmRzXG5cdFx0ICogQHBhcmFtIHVybCAtIEEgc3RyaW5nIHBvaW50aW5nIHRvIHRoZSBzb3VuZCBmaWxlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLmFkZChTdHJpbmcgaWQsIEFycmF5IHVybHMpXG5cdFx0ICogQHBhcmFtIHVybHMgLSBBcnJheSBvZiB1cmxzIHBvaW50aW5nIHRvIGRpZmZlcmVudCBmb3JtYXQgb2YgdGhlIHNhbWUgc291bmQsIHNlbGVjdGluZyB0aGUgZmlyc3QgdGhhdCBpcyBwbGF5YWJsZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5hZGQoT2JqZWN0IG1hcClcblx0XHQgKiBAcGFyYW0gbWFwIC0ga2V5LXZhbHVlIHBhaXJzIHdoZXJlIHRoZSBrZXkgaXMgdGhlIGBpZGAgYW5kIHRoZSB2YWx1ZSBpcyBlaXRoZXIgYSBgdXJsYCBvciBgdXJsc2Bcblx0XHQgKlxuXHRcdCAqIExvYWRzIGEgc291bmQgdG8gYmUgcGxheWVkLiBEdWUgdG8gdGhlIG5hdHVyZSBvZiBIVE1MNSBhdWRpbyxcblx0XHQgKiB0aHJlZSB0eXBlcyBvZiBhdWRpbyBmaWxlcyB3aWxsIGJlIHJlcXVpcmVkIGZvciBjcm9zcy1icm93c2VyIGNhcGFiaWxpdGllcy5cblx0XHQgKiBUaGVzZSBmb3JtYXRzIGFyZSBNUDMsIE9nZyBhbmQgV0FWLlxuXHRcdCAqXG5cdFx0ICogUGFzc2luZyBhbiBhcnJheSBvZiBVUkxzIHdpbGwgZGV0ZXJtaW5lIHdoaWNoIGZvcm1hdCB0aGUgYnJvd3NlciBjYW4gcGxheSBhbmQgc2VsZWN0IGl0IG92ZXIgYW55IG90aGVyLlxuXHRcdCAqXG5cdFx0ICogQWNjZXB0cyBhbiBvYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgYXVkaW8gbmFtZSBhbmRcblx0XHQgKiBlaXRoZXIgYSBVUkwgb3IgYW4gQXJyYXkgb2YgVVJMcyAodG8gZGV0ZXJtaW5lIHdoaWNoIHR5cGUgdG8gdXNlKS5cblx0XHQgKlxuXHRcdCAqIFRoZSBJRCB5b3UgdXNlIHdpbGwgYmUgaG93IHlvdSByZWZlciB0byB0aGF0IHNvdW5kIHdoZW4gdXNpbmcgYENyYWZ0eS5hdWRpby5wbGF5YC5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogLy9hZGRpbmcgYXVkaW8gZnJvbSBhbiBvYmplY3Rcblx0XHQgKiBDcmFmdHkuYXVkaW8uYWRkKHtcblx0XHQgKiBzaG9vdDogW1wic291bmRzL3Nob290LndhdlwiLFxuXHRcdCAqIFwic291bmRzL3Nob290Lm1wM1wiLFxuXHRcdCAqIFwic291bmRzL3Nob290Lm9nZ1wiXSxcblx0XHQgKlxuXHRcdCAqIGNvaW46IFwic291bmRzL2NvaW4ubXAzXCJcblx0XHQgKiB9KTtcblx0XHQgKlxuXHRcdCAqIC8vYWRkaW5nIGEgc2luZ2xlIHNvdW5kXG5cdFx0ICogQ3JhZnR5LmF1ZGlvLmFkZChcIndhbGtcIiwgW1xuXHRcdCAqIFwic291bmRzL3dhbGsubXAzXCIsXG5cdFx0ICogXCJzb3VuZHMvd2Fsay5vZ2dcIixcblx0XHQgKiBcInNvdW5kcy93YWxrLndhdlwiXG5cdFx0ICogXSk7XG5cdFx0ICpcblx0XHQgKiAvL29ubHkgb25lIGZvcm1hdFxuXHRcdCAqIENyYWZ0eS5hdWRpby5hZGQoXCJqdW1wXCIsIFwic291bmRzL2p1bXAubXAzXCIpO1xuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdGFkZCA6IGZ1bmN0aW9uKGlkLCB1cmwpIHtcblx0XHRcdENyYWZ0eS5zdXBwb3J0LmF1ZGlvID0gISF0aGlzLmF1ZGlvRWxlbWVudCgpLmNhblBsYXlUeXBlO1xuXHRcdFx0Ly9TZXR1cCBhdWRpbyBzdXBwb3J0XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdHRoaXMuY2FuUGxheSgpO1xuXHRcdFx0Ly9TZXR1cCBzdXBwb3J0ZWQgRXh0ZW5zaW9uc1xuXG5cdFx0XHR2YXIgYXVkaW8sIGV4dCwgcGF0aDtcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRmb3IgKHZhciBpIGluIGlkKSB7XG5cdFx0XHRcdFx0Zm9yICh2YXIgc3JjIGluIGlkW2ldKSB7XG5cdFx0XHRcdFx0XHRhdWRpbyA9IHRoaXMuYXVkaW9FbGVtZW50KCk7XG5cdFx0XHRcdFx0XHRhdWRpby5pZCA9IGk7XG5cdFx0XHRcdFx0XHRhdWRpby5wcmVsb2FkID0gXCJhdXRvXCI7XG5cdFx0XHRcdFx0XHRhdWRpby52b2x1bWUgPSBDcmFmdHkuYXVkaW8udm9sdW1lO1xuXHRcdFx0XHRcdFx0cGF0aCA9IGlkW2ldW3NyY107XG5cdFx0XHRcdFx0XHRleHQgPSBwYXRoLnN1YnN0cihwYXRoLmxhc3RJbmRleE9mKCcuJykgKyAxKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMuc3VwcG9ydGVkW2V4dF0pIHtcblx0XHRcdFx0XHRcdFx0YXVkaW8uc3JjID0gcGF0aDtcblx0XHRcdFx0XHRcdFx0Q3JhZnR5LmFzc2V0KHBhdGgsIGF1ZGlvKTtcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VuZHNbaV0gPSB7XG5cdFx0XHRcdFx0XHRcdFx0b2JqIDogYXVkaW8sXG5cdFx0XHRcdFx0XHRcdFx0cGxheWVkIDogMCxcblx0XHRcdFx0XHRcdFx0XHR2b2x1bWUgOiBDcmFmdHkuYXVkaW8udm9sdW1lXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCB0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0YXVkaW8gPSB0aGlzLmF1ZGlvRWxlbWVudCgpO1xuXHRcdFx0XHRhdWRpby5pZCA9IGlkO1xuXHRcdFx0XHRhdWRpby5wcmVsb2FkID0gXCJhdXRvXCI7XG5cdFx0XHRcdGF1ZGlvLnZvbHVtZSA9IENyYWZ0eS5hdWRpby52b2x1bWU7XG5cblx0XHRcdFx0aWYgKCB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdFx0ZXh0ID0gdXJsLnN1YnN0cih1cmwubGFzdEluZGV4T2YoJy4nKSArIDEpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0aWYgKHRoaXMuc3VwcG9ydGVkW2V4dF0pIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnNyYyA9IHVybDtcblx0XHRcdFx0XHRcdENyYWZ0eS5hc3NldCh1cmwsIGF1ZGlvKTtcblx0XHRcdFx0XHRcdHRoaXMuc291bmRzW2lkXSA9IHtcblx0XHRcdFx0XHRcdFx0b2JqIDogYXVkaW8sXG5cdFx0XHRcdFx0XHRcdHBsYXllZCA6IDAsXG5cdFx0XHRcdFx0XHRcdHZvbHVtZSA6IENyYWZ0eS5hdWRpby52b2x1bWVcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCB0eXBlb2YgdXJsID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdFx0Zm9yIChzcmMgaW4gdXJsKSB7XG5cdFx0XHRcdFx0XHRhdWRpbyA9IHRoaXMuYXVkaW9FbGVtZW50KCk7XG5cdFx0XHRcdFx0XHRhdWRpby5pZCA9IGlkO1xuXHRcdFx0XHRcdFx0YXVkaW8ucHJlbG9hZCA9IFwiYXV0b1wiO1xuXHRcdFx0XHRcdFx0YXVkaW8udm9sdW1lID0gQ3JhZnR5LmF1ZGlvLnZvbHVtZTtcblx0XHRcdFx0XHRcdHBhdGggPSB1cmxbc3JjXTtcblx0XHRcdFx0XHRcdGV4dCA9IHBhdGguc3Vic3RyKHBhdGgubGFzdEluZGV4T2YoJy4nKSArIDEpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zdXBwb3J0ZWRbZXh0XSkge1xuXHRcdFx0XHRcdFx0XHRhdWRpby5zcmMgPSBwYXRoO1xuXHRcdFx0XHRcdFx0XHRDcmFmdHkuYXNzZXQocGF0aCwgYXVkaW8pO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB7XG5cdFx0XHRcdFx0XHRcdFx0b2JqIDogYXVkaW8sXG5cdFx0XHRcdFx0XHRcdFx0cGxheWVkIDogMCxcblx0XHRcdFx0XHRcdFx0XHR2b2x1bWUgOiBDcmFmdHkuYXVkaW8udm9sdW1lXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnBsYXlcblx0XHQgKiBAY29tcCBDcmFmdHkuYXVkaW9cblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8ucGxheShTdHJpbmcgaWQpXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnBsYXkoU3RyaW5nIGlkLCBOdW1iZXIgcmVwZWF0Q291bnQpXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnBsYXkoU3RyaW5nIGlkLCBOdW1iZXIgcmVwZWF0Q291bnQsTnVtYmVyIHZvbHVtZSlcblx0XHQgKiBAcGFyYW0gaWQgLSBBIHN0cmluZyB0byByZWZlciB0byBzb3VuZHNcblx0XHQgKiBAcGFyYW0gcmVwZWF0Q291bnQgLSBSZXBlYXQgY291bnQgZm9yIHRoZSBmaWxlLCB3aGVyZSAtMSBzdGFuZHMgZm9yIHJlcGVhdCBmb3JldmVyLlxuXHRcdCAqIEBwYXJhbSB2b2x1bWUgLSB2b2x1bWUgY2FuIGJlIGEgbnVtYmVyIGJldHdlZW4gMC4wIGFuZCAxLjBcblx0XHQgKlxuXHRcdCAqIFdpbGwgcGxheSBhIHNvdW5kIHByZXZpb3VzbHkgYWRkZWQgYnkgdXNpbmcgdGhlIElEIHRoYXQgd2FzIHVzZWQgaW4gYENyYWZ0eS5hdWRpby5hZGRgLlxuXHRcdCAqIEhhcyBhIGRlZmF1bHQgbWF4aW11bSBvZiA1IGNoYW5uZWxzIHNvIHRoYXQgdGhlIHNhbWUgc291bmQgY2FuIHBsYXkgc2ltdWx0YW5lb3VzbHkgdW5sZXNzIGFsbCBvZiB0aGUgY2hhbm5lbHMgYXJlIHBsYXlpbmcuXG5cblx0XHQgKiAqTm90ZSB0aGF0IHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBIVE1MNSBBdWRpbyBpcyBidWdneSBhdCBiZXN0Lipcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnBsYXkoXCJ3YWxrXCIpO1xuXHRcdCAqXG5cdFx0ICogLy9wbGF5IGFuZCByZXBlYXQgZm9yZXZlclxuXHRcdCAqIENyYWZ0eS5hdWRpby5wbGF5KFwiYmFja2dyb3VuZE11c2ljXCIsIC0xKTtcblx0XHQgKiBDcmFmdHkuYXVkaW8ucGxheShcImV4cGxvc2lvblwiLDEsMC41KTsgLy9wbGF5IHNvdW5kIG9uY2Ugd2l0aCB2b2x1bWUgb2YgNTAlXG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0cGxheSA6IGZ1bmN0aW9uKGlkLCByZXBlYXQsIHZvbHVtZSkge1xuXHRcdFx0aWYgKHJlcGVhdCA9PSAwIHx8ICFDcmFmdHkuc3VwcG9ydC5hdWRpbyB8fCAhdGhpcy5zb3VuZHNbaWRdKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcyA9IHRoaXMuc291bmRzW2lkXTtcblx0XHRcdHMudm9sdW1lID0gcy5vYmoudm9sdW1lID0gdm9sdW1lIHx8IENyYWZ0eS5hdWRpby52b2x1bWU7XG5cdFx0XHRpZiAocy5vYmouY3VycmVudFRpbWUpXG5cdFx0XHRcdHMub2JqLmN1cnJlbnRUaW1lID0gMDtcblx0XHRcdGlmICh0aGlzLm11dGVkKVxuXHRcdFx0XHRzLm9iai52b2x1bWUgPSAwO1xuXHRcdFx0cy5vYmoucGxheSgpO1xuXHRcdFx0cy5wbGF5ZWQrKztcblx0XHRcdHMub2JqLmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHMucGxheWVkIDwgcmVwZWF0IHx8IHJlcGVhdCA9PSAtMSkge1xuXHRcdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRUaW1lKVxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50VGltZSA9IDA7XG5cdFx0XHRcdFx0dGhpcy5wbGF5KCk7XG5cdFx0XHRcdFx0cy5wbGF5ZWQrKztcblx0XHRcdFx0fVxuXHRcdFx0fSwgdHJ1ZSk7XG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5zdG9wXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnN0b3AoW051bWJlciBJRF0pXG5cdFx0ICpcblx0XHQgKiBTdG9wcyBhbnkgcGxheWluZyBzb3VuZC4gaWYgaWQgaXMgbm90IHNldCwgc3RvcCBhbGwgc291bmRzIHdoaWNoIGFyZSBwbGF5aW5nXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIC8vYWxsIHNvdW5kcyBzdG9wcGVkIHBsYXlpbmcgbm93XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnN0b3AoKTtcblx0XHQgKlxuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdHN0b3AgOiBmdW5jdGlvbihpZCkge1xuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHM7XG5cdFx0XHRpZiAoIWlkKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5zb3VuZHMpIHtcblx0XHRcdFx0XHRzID0gdGhpcy5zb3VuZHNbaV07XG5cdFx0XHRcdFx0aWYgKCFzLm9iai5wYXVzZWQpXG5cdFx0XHRcdFx0XHRzLm9iai5wYXVzZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0cyA9IHRoaXMuc291bmRzW2lkXTtcblx0XHRcdGlmICghcy5vYmoucGF1c2VkKVxuXHRcdFx0XHRzLm9iai5wYXVzZSgpO1xuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5fbXV0ZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5fbXV0ZShbQm9vbGVhbiBtdXRlXSlcblx0XHQgKlxuXHRcdCAqIE11dGUgb3IgdW5tdXRlIGV2ZXJ5IEF1ZGlvIGluc3RhbmNlIHRoYXQgaXMgcGxheWluZy5cblx0XHQgKi9cblx0XHRfbXV0ZSA6IGZ1bmN0aW9uKG11dGUpIHtcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzO1xuXHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLnNvdW5kcykge1xuXHRcdFx0XHRzID0gdGhpcy5zb3VuZHNbaV07XG5cdFx0XHRcdHMub2JqLnZvbHVtZSA9IG11dGUgPyAwIDogcy52b2x1bWU7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm11dGVkID0gbXV0ZTtcblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnRvZ2dsZU11dGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8udG9nZ2xlTXV0ZSgpXG5cdFx0ICpcblx0XHQgKiBNdXRlIG9yIHVubXV0ZSBldmVyeSBBdWRpbyBpbnN0YW5jZSB0aGF0IGlzIHBsYXlpbmcuIFRvZ2dsZXMgYmV0d2VlblxuXHRcdCAqIHBhdXNpbmcgb3IgcGxheWluZyBkZXBlbmRpbmcgb24gdGhlIHN0YXRlLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiAvL3RvZ2dsZSBtdXRlIGFuZCB1bm11dGUgZGVwZW5kaW5nIG9uIGN1cnJlbnQgc3RhdGVcblx0XHQgKiBDcmFmdHkuYXVkaW8udG9nZ2xlTXV0ZSgpO1xuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdHRvZ2dsZU11dGUgOiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghdGhpcy5tdXRlZCkge1xuXHRcdFx0XHR0aGlzLl9tdXRlKHRydWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fbXV0ZShmYWxzZSk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLm11dGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8ubXV0ZSgpXG5cdFx0ICpcblx0XHQgKiBNdXRlIGV2ZXJ5IEF1ZGlvIGluc3RhbmNlIHRoYXQgaXMgcGxheWluZy5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLm11dGUoKTtcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHRtdXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9tdXRlKHRydWUpO1xuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8udW5tdXRlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnVubXV0ZSgpXG5cdFx0ICpcblx0XHQgKiBVbm11dGUgZXZlcnkgQXVkaW8gaW5zdGFuY2UgdGhhdCBpcyBwbGF5aW5nLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8udW5tdXRlKCk7XG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0dW5tdXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9tdXRlKGZhbHNlKTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8ucGF1c2Vcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8ucGF1c2Uoc3RyaW5nIElEKVxuXHRcdCAqXG5cdFx0ICogUGF1c2UgdGhlIEF1ZGlvIGluc3RhbmNlIHNwZWNpZmllZCBieSBpZCBwYXJhbS5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnBhdXNlKCdtdXNpYycpO1xuXHRcdCAqIH5+flxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgYXVkaW8gb2JqZWN0IHRvIHBhdXNlXG5cdFx0ICovXG5cdFx0cGF1c2UgOiBmdW5jdGlvbihpZCkge1xuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbyB8fCAhaWQgfHwgIXRoaXMuc291bmRzW2lkXSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNvdW5kc1tpZF07XG5cdFx0XHRpZiAoIXMub2JqLnBhdXNlZClcblx0XHRcdFx0cy5vYmoucGF1c2UoKTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8udW5wYXVzZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby51bnBhdXNlKHN0cmluZyBJRClcblx0XHQgKlxuXHRcdCAqIFJlc3VtZSBwbGF5aW5nIHRoZSBBdWRpbyBpbnN0YW5jZSBzcGVjaWZpZWQgYnkgaWQgcGFyYW0uXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby51bnBhdXNlKCdtdXNpYycpO1xuXHRcdCAqIH5+flxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgYXVkaW8gb2JqZWN0IHRvIHVucGF1c2Vcblx0XHQgKi9cblx0XHR1bnBhdXNlIDogZnVuY3Rpb24oaWQpIHtcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8gfHwgIWlkIHx8ICF0aGlzLnNvdW5kc1tpZF0pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzID0gdGhpcy5zb3VuZHNbaWRdO1xuXHRcdFx0aWYgKHMub2JqLnBhdXNlZClcblx0XHRcdFx0cy5vYmoucGxheSgpO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby50b2dnbGVQYXVzZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby50b2dnbGVQYXVzZShzdHJpbmcgSUQpXG5cdFx0ICpcblx0XHQgKiBUb2dnbGUgdGhlIHBhdXNlIHN0YXR1cyBvZiB0aGUgQXVkaW8gaW5zdGFuY2Ugc3BlY2lmaWVkIGJ5IGlkIHBhcmFtLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8udG9nZ2xlUGF1c2UoJ211c2ljJyk7XG5cdFx0ICogfn5+XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBhdWRpbyBvYmplY3QgdG8gcGF1c2UvdW5wYXVzZVxuXHRcdCAqL1xuXHRcdHRvZ2dsZVBhdXNlIDogZnVuY3Rpb24oaWQpIHtcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8gfHwgIWlkIHx8ICF0aGlzLnNvdW5kc1tpZF0pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzID0gdGhpcy5zb3VuZHNbaWRdO1xuXHRcdFx0aWYgKHMub2JqLnBhdXNlZCkge1xuXHRcdFx0XHRzLm9iai5wbGF5KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzLm9iai5wYXVzZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8qKkBcbiogI1RleHRcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIHRleHQgaXMgY2hhbmdlZFxuKiBAcmVxdWlyZXMgQ2FudmFzIG9yIERPTVxuKiBDb21wb25lbnQgdG8gZHJhdyB0ZXh0IGluc2lkZSB0aGUgYm9keSBvZiBhbiBlbnRpdHkuXG4qL1xuQ3JhZnR5LmMoXCJUZXh0XCIsIHtcblx0X3RleHQ6IFwiXCIsXG5cdF90ZXh0Rm9udDoge1xuXHRcdFwidHlwZVwiOiBcIlwiLFxuXHRcdFwid2VpZ2h0XCI6IFwiXCIsXG5cdFx0XCJzaXplXCI6IFwiXCIsXG5cdFx0XCJmYW1pbHlcIjogXCJcIlxuXHR9LFxuXHRyZWFkeTogdHJ1ZSxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcyhcIjJEXCIpO1xuXG5cdFx0dGhpcy5iaW5kKFwiRHJhd1wiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIGZvbnQgPSB0aGlzLl90ZXh0Rm9udFtcInR5cGVcIl0gKyAnICcgKyB0aGlzLl90ZXh0Rm9udFtcIndlaWdodFwiXSArICcgJyArXG5cdFx0XHRcdHRoaXMuX3RleHRGb250W1wic2l6ZVwiXSArICcgJyArIHRoaXMuX3RleHRGb250W1wiZmFtaWx5XCJdO1xuXG5cdFx0XHRpZiAoZS50eXBlID09PSBcIkRPTVwiKSB7XG5cdFx0XHRcdHZhciBlbCA9IHRoaXMuX2VsZW1lbnQsXG5cdFx0XHRcdFx0c3R5bGUgPSBlbC5zdHlsZTtcblxuXHRcdFx0XHRzdHlsZS5jb2xvciA9IHRoaXMuX3RleHRDb2xvcjtcblx0XHRcdFx0c3R5bGUuZm9udCA9IGZvbnQ7XG5cdFx0XHRcdGVsLmlubmVySFRNTCA9IHRoaXMuX3RleHQ7XG5cdFx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gXCJjYW52YXNcIikge1xuXHRcdFx0XHR2YXIgY29udGV4dCA9IGUuY3R4LFxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzID0gbnVsbDtcblxuXHRcdFx0XHRjb250ZXh0LnNhdmUoKTtcblxuXHRcdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuX3RleHRDb2xvciB8fCBcInJnYigwLDAsMClcIjtcblx0XHRcdFx0Y29udGV4dC5mb250ID0gZm9udDtcblxuXHRcdFx0XHRjb250ZXh0LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSArIHRoaXMuaCk7XG5cdFx0XHRcdGNvbnRleHQuZmlsbFRleHQodGhpcy5fdGV4dCwgMCwgMCk7XG5cblx0XHRcdFx0bWV0cmljcyA9IGNvbnRleHQubWVhc3VyZVRleHQodGhpcy5fdGV4dCk7XG5cdFx0XHRcdHRoaXMuX3cgPSBtZXRyaWNzLndpZHRoO1xuXG5cdFx0XHRcdGNvbnRleHQucmVzdG9yZSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAqICMudGV4dFxuICAgICogQGNvbXAgVGV4dFxuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRleHQoU3RyaW5nIHRleHQpXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGV4dChGdW5jdGlvbiB0ZXh0Z2VuZXJhdG9yKVxuICAgICogQHBhcmFtIHRleHQgLSBTdHJpbmcgb2YgdGV4dCB0aGF0IHdpbGwgYmUgaW5zZXJ0ZWQgaW50byB0aGUgRE9NIG9yIENhbnZhcyBlbGVtZW50LlxuICAgICogXG4gICAgKiBUaGlzIG1ldGhvZCB3aWxsIHVwZGF0ZSB0aGUgdGV4dCBpbnNpZGUgdGhlIGVudGl0eS5cbiAgICAqIElmIHlvdSB1c2UgRE9NLCB0byBtb2RpZnkgdGhlIGZvbnQsIHVzZSB0aGUgYC5jc3NgIG1ldGhvZCBpbmhlcml0ZWQgZnJvbSB0aGUgRE9NIGNvbXBvbmVudC5cbiAgICAqXG4gICAgKiBJZiB5b3UgbmVlZCB0byByZWZlcmVuY2UgYXR0cmlidXRlcyBvbiB0aGUgZW50aXR5IGl0c2VsZiB5b3UgY2FuIHBhc3MgYSBmdW5jdGlvbiBpbnN0ZWFkIG9mIGEgc3RyaW5nLlxuICAgICogXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG4gICAgKiBDcmFmdHkuZShcIjJELCBET00sIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pLnRleHQoXCJMb29rIGF0IG1lISFcIik7XG4gICAgKlxuICAgICogQ3JhZnR5LmUoXCIyRCwgRE9NLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KVxuICAgICogICAgIC50ZXh0KGZ1bmN0aW9uICgpIHsgcmV0dXJuIFwiTXkgcG9zaXRpb24gaXMgXCIgKyB0aGlzLl94IH0pO1xuICAgICpcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSkudGV4dChcIkxvb2sgYXQgbWUhIVwiKTtcbiAgICAqXG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pXG4gICAgKiAgICAgLnRleHQoZnVuY3Rpb24gKCkgeyByZXR1cm4gXCJNeSBwb3NpdGlvbiBpcyBcIiArIHRoaXMuX3ggfSk7XG4gICAgKiB+fn5cbiAgICAqL1xuXHR0ZXh0OiBmdW5jdGlvbiAodGV4dCkge1xuXHRcdGlmICghKHR5cGVvZiB0ZXh0ICE9PSBcInVuZGVmaW5lZFwiICYmIHRleHQgIT09IG51bGwpKSByZXR1cm4gdGhpcy5fdGV4dDtcblx0XHRpZiAodHlwZW9mKHRleHQpID09IFwiZnVuY3Rpb25cIilcblx0XHRcdHRoaXMuX3RleHQgPSB0ZXh0LmNhbGwodGhpcyk7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5fdGV4dCA9IHRleHQ7XG5cdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAqICMudGV4dENvbG9yXG4gICAgKiBAY29tcCBUZXh0XG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGV4dENvbG9yKFN0cmluZyBjb2xvciwgTnVtYmVyIHN0cmVuZ3RoKVxuICAgICogQHBhcmFtIGNvbG9yIC0gVGhlIGNvbG9yIGluIGhleGFkZWNpbWFsXG4gICAgKiBAcGFyYW0gc3RyZW5ndGggLSBMZXZlbCBvZiBvcGFjaXR5XG4gICAgKlxuICAgICogTW9kaWZ5IHRoZSB0ZXh0IGNvbG9yIGFuZCBsZXZlbCBvZiBvcGFjaXR5LlxuICAgICogXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG4gICAgKiBDcmFmdHkuZShcIjJELCBET00sIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pLnRleHQoXCJMb29rIGF0IG1lISFcIilcbiAgICAqICAgLnRleHRDb2xvcignI0ZGMDAwMCcpO1xuICAgICpcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSkudGV4dCgnTG9vayBhdCBtZSEhJylcbiAgICAqICAgLnRleHRDb2xvcignI0ZGMDAwMCcsIDAuNik7XG4gICAgKiB+fn5cbiAgICAqIEBzZWUgQ3JhZnR5LnRvUkdCXG4gICAgKi9cblx0dGV4dENvbG9yOiBmdW5jdGlvbiAoY29sb3IsIHN0cmVuZ3RoKSB7XG5cdFx0dGhpcy5fc3RyZW5ndGggPSBzdHJlbmd0aDtcblx0XHR0aGlzLl90ZXh0Q29sb3IgPSBDcmFmdHkudG9SR0IoY29sb3IsIHRoaXMuX3N0cmVuZ3RoKTtcblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuICAgICogIy50ZXh0Rm9udFxuICAgICogQGNvbXAgVGV4dFxuICAgICogQHRyaWdnZXJzIENoYW5nZVxuICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRleHRGb250KFN0cmluZyBrZXksICogdmFsdWUpXG4gICAgKiBAcGFyYW0ga2V5IC0gUHJvcGVydHkgb2YgdGhlIGVudGl0eSB0byBtb2RpZnlcbiAgICAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIHNldCB0aGUgcHJvcGVydHkgdG9cbiAgICAqXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGV4dEZvbnQoT2JqZWN0IG1hcClcbiAgICAqIEBwYXJhbSBtYXAgLSBPYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgcHJvcGVydHkgdG8gbW9kaWZ5IGFuZCB0aGUgdmFsdWUgYXMgdGhlIHByb3BlcnR5IHZhbHVlXG4gICAgKlxuICAgICogVXNlIHRoaXMgbWV0aG9kIHRvIHNldCBmb250IHByb3BlcnR5IG9mIHRoZSB0ZXh0IGVudGl0eS5cbiAgICAqIFxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuICAgICogQ3JhZnR5LmUoXCIyRCwgRE9NLCBUZXh0XCIpLnRleHRGb250KHsgdHlwZTogJ2l0YWxpYycsIGZhbWlseTogJ0FyaWFsJyB9KTtcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS50ZXh0Rm9udCh7IHNpemU6ICcyMHB4Jywgd2VpZ2h0OiAnYm9sZCcgfSk7XG4gICAgKlxuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLnRleHRGb250KFwidHlwZVwiLCBcIml0YWxpY1wiKTtcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS50ZXh0Rm9udChcInR5cGVcIik7IC8vIGl0YWxpY1xuICAgICogfn5+XG4gICAgKi9cblx0dGV4dEZvbnQ6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdC8vaWYganVzdCB0aGUga2V5LCByZXR1cm4gdGhlIHZhbHVlXG5cdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fdGV4dEZvbnRba2V5XTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGVvZiBrZXkgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eUtleSBpbiBrZXkpIHtcblx0XHRcdFx0XHR0aGlzLl90ZXh0Rm9udFtwcm9wZXJ0eUtleV0gPSBrZXlbcHJvcGVydHlLZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3RleHRGb250W2tleV0gPSB2YWx1ZTtcblx0XHR9XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5DcmFmdHkuZXh0ZW5kKHtcbi8qKkBcblx0KiAjQ3JhZnR5LmFzc2V0c1xuXHQqIEBjYXRlZ29yeSBBc3NldHNcblx0KiBBbiBvYmplY3QgY29udGFpbmluZyBldmVyeSBhc3NldCB1c2VkIGluIHRoZSBjdXJyZW50IENyYWZ0eSBnYW1lLlxuXHQqIFRoZSBrZXkgaXMgdGhlIFVSTCBhbmQgdGhlIHZhbHVlIGlzIHRoZSBgQXVkaW9gIG9yIGBJbWFnZWAgb2JqZWN0LlxuXHQqXG5cdCogSWYgbG9hZGluZyBhbiBhc3NldCwgY2hlY2sgdGhhdCBpdCBpcyBpbiB0aGlzIG9iamVjdCBmaXJzdCB0byBhdm9pZCBsb2FkaW5nIHR3aWNlLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdmFyIGlzTG9hZGVkID0gISFDcmFmdHkuYXNzZXRzW1wiaW1hZ2VzL3Nwcml0ZS5wbmdcIl07XG5cdCogfn5+XG5cdCogQHNlZSBDcmFmdHkubG9hZGVyXG5cdCovXG5cdGFzc2V0czoge30sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmFzc2V0XG4gICAgKiBAY2F0ZWdvcnkgQXNzZXRzXG4gICAgKiBcbiAgICAqIEB0cmlnZ2VyIE5ld0Fzc2V0IC0gQWZ0ZXIgc2V0dGluZyBuZXcgYXNzZXQgLSBPYmplY3QgLSBrZXkgYW5kIHZhbHVlIG9mIG5ldyBhZGRlZCBhc3NldC5cbiAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5hc3NldChTdHJpbmcga2V5LCBPYmplY3QgYXNzZXQpXG4gICAgKiBAcGFyYW0ga2V5IC0gYXNzZXQgdXJsLlxuICAgICogQHBhcmFtIGFzc2V0IC0gQXVkaW9gIG9yIGBJbWFnZWAgb2JqZWN0LlxuICAgICogQWRkIG5ldyBhc3NldCB0byBhc3NldHMgb2JqZWN0LlxuICAgICogXG4gICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuYXNzZXQoU3RyaW5nIGtleSlcbiAgICAqIEBwYXJhbSBrZXkgLSBhc3NldCB1cmwuXG4gICAgKiBHZXQgYXNzZXQgZnJvbSBhc3NldHMgb2JqZWN0LlxuICAgICogXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG4gICAgKiBDcmFmdHkuYXNzZXQoa2V5LCB2YWx1ZSk7XG4gICAgKiB2YXIgYXNzZXQgPSBDcmFmdHkuYXNzZXQoa2V5KTsgLy9vYmplY3Qgd2l0aCBrZXkgYW5kIHZhbHVlIGZpZWxkc1xuICAgICogfn5+XG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5LmFzc2V0c1xuICAgICovXG4gICAgYXNzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBDcmFmdHkuYXNzZXRzW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUNyYWZ0eS5hc3NldHNba2V5XSkge1xuICAgICAgICAgICAgQ3JhZnR5LmFzc2V0c1trZXldID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJOZXdBc3NldFwiLCB7a2V5IDoga2V5LCB2YWx1ZSA6IHZhbHVlfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICAgICAvKipAXG5cdCogI0NyYWZ0eS5pbWFnZV93aGl0ZWxpc3Rcblx0KiBAY2F0ZWdvcnkgQXNzZXRzXG5cdCogXG4gICAgKiBcbiAgICAqIEEgbGlzdCBvZiBmaWxlIGV4dGVuc2lvbnMgdGhhdCBjYW4gYmUgbG9hZGVkIGFzIGltYWdlcyBieSBDcmFmdHkubG9hZFxuICAgICpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuICAgICAgICAqIENyYWZ0eS5pbWFnZV93aGl0ZWxpc3QucHVzaChcInRpZlwiKVxuXHQqIENyYWZ0eS5sb2FkKFtcImltYWdlcy9zcHJpdGUudGlmXCIsIFwic291bmRzL2p1bXAubXAzXCJdLFxuXHQqICAgICBmdW5jdGlvbigpIHtcblx0KiAgICAgICAgIC8vd2hlbiBsb2FkZWRcblx0KiAgICAgICAgIENyYWZ0eS5zY2VuZShcIm1haW5cIik7IC8vZ28gdG8gbWFpbiBzY2VuZVxuXHQqICAgICAgICAgQ3JhZnR5LmF1ZGlvLnBsYXkoXCJqdW1wLm1wM1wiKTsgLy9QbGF5IHRoZSBhdWRpbyBmaWxlXG5cdCogICAgIH0sXG5cdCpcblx0KiAgICAgZnVuY3Rpb24oZSkge1xuXHQqICAgICAgIC8vcHJvZ3Jlc3Ncblx0KiAgICAgfSxcblx0KlxuXHQqICAgICBmdW5jdGlvbihlKSB7XG5cdCogICAgICAgLy91aCBvaCwgZXJyb3IgbG9hZGluZ1xuXHQqICAgICB9XG5cdCogKTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5hc3NldFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmxvYWRcblx0Ki9cbiAgICBpbWFnZV93aGl0ZWxpc3Q6IFtcImpwZ1wiLCBcImpwZWdcIiwgXCJnaWZcIiwgXCJwbmdcIiwgXCJzdmdcIl0sXG5cdC8qKkBcblx0KiAjQ3JhZnR5LmxvYWRlclxuXHQqIEBjYXRlZ29yeSBBc3NldHNcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkubG9hZChBcnJheSBhc3NldHMsIEZ1bmN0aW9uIG9uTG9hZFssIEZ1bmN0aW9uIG9uUHJvZ3Jlc3MsIEZ1bmN0aW9uIG9uRXJyb3JdKVxuXHQqIEBwYXJhbSBhc3NldHMgLSBBcnJheSBvZiBhc3NldHMgdG8gbG9hZCAoYWNjZXB0cyBzb3VuZHMgYW5kIGltYWdlcylcblx0KiBAcGFyYW0gb25Mb2FkIC0gQ2FsbGJhY2sgd2hlbiB0aGUgYXNzZXRzIGFyZSBsb2FkZWRcblx0KiBAcGFyYW0gb25Qcm9ncmVzcyAtIENhbGxiYWNrIHdoZW4gYW4gYXNzZXQgaXMgbG9hZGVkLiBDb250YWlucyBpbmZvcm1hdGlvbiBhYm91dCBhc3NldHMgbG9hZGVkXG5cdCogQHBhcmFtIG9uRXJyb3IgLSBDYWxsYmFjayB3aGVuIGFuIGFzc2V0IGZhaWxzIHRvIGxvYWRcblx0KiBcblx0KiBQcmVsb2FkZXIgZm9yIGFsbCBhc3NldHMuIFRha2VzIGFuIGFycmF5IG9mIFVSTHMgYW5kXG5cdCogYWRkcyB0aGVtIHRvIHRoZSBgQ3JhZnR5LmFzc2V0c2Agb2JqZWN0LlxuXHQqXG5cdCogRmlsZXMgd2l0aCBzdWZmaXhlcyBpbiBgaW1hZ2Vfd2hpdGVsaXN0YCAoY2FzZSBpbnNlbnNpdGl2ZSkgd2lsbCBiZSBsb2FkZWQuXG5cdCpcblx0KiBJZiBgQ3JhZnR5LnN1cHBvcnQuYXVkaW9gIGlzIGB0cnVlYCwgZmlsZXMgd2l0aCB0aGUgZm9sbG93aW5nIHN1ZmZpeGVzIGBtcDNgLCBgd2F2YCwgYG9nZ2AgYW5kIGBtcDRgIChjYXNlIGluc2Vuc2l0aXZlKSBjYW4gYmUgbG9hZGVkLlxuXHQqXG5cdCogVGhlIGBvblByb2dyZXNzYCBmdW5jdGlvbiB3aWxsIGJlIHBhc3NlZCBvbiBvYmplY3Qgd2l0aCBpbmZvcm1hdGlvbiBhYm91dFxuXHQqIHRoZSBwcm9ncmVzcyBpbmNsdWRpbmcgaG93IG1hbnkgYXNzZXRzIGxvYWRlZCwgdG90YWwgb2YgYWxsIHRoZSBhc3NldHMgdG9cblx0KiBsb2FkIGFuZCBhIHBlcmNlbnRhZ2Ugb2YgdGhlIHByb2dyZXNzLlxuICAgICogfn5+XG4gICAgKiB7IGxvYWRlZDogaiwgdG90YWw6IHRvdGFsLCBwZXJjZW50OiAoaiAvIHRvdGFsICogMTAwKSAsc3JjOnNyY30pXG5cdCogfn5+XG5cdCpcblx0KiBgb25FcnJvcmAgd2lsbCBiZSBwYXNzZWQgd2l0aCB0aGUgYXNzZXQgdGhhdCBjb3VsZG4ndCBsb2FkLlxuICAgICpcblx0KiBXaGVuIGBvbkVycm9yYCBpcyBub3QgcHJvdmlkZWQsIHRoZSBvbkxvYWQgaXMgbG9hZGVkIGV2ZW4gc29tZSBhc3NldHMgYXJlIG5vdCBzdWNjZXNzZnVsbHkgbG9hZGVkLiBPdGhlcndpc2UsIG9uTG9hZCB3aWxsIGJlIGNhbGxlZCBubyBtYXR0ZXIgd2hldGhlciB0aGVyZSBhcmUgZXJyb3JzIG9yIG5vdC4gXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkubG9hZChbXCJpbWFnZXMvc3ByaXRlLnBuZ1wiLCBcInNvdW5kcy9qdW1wLm1wM1wiXSxcblx0KiAgICAgZnVuY3Rpb24oKSB7XG5cdCogICAgICAgICAvL3doZW4gbG9hZGVkXG5cdCogICAgICAgICBDcmFmdHkuc2NlbmUoXCJtYWluXCIpOyAvL2dvIHRvIG1haW4gc2NlbmVcblx0KiAgICAgICAgIENyYWZ0eS5hdWRpby5wbGF5KFwianVtcC5tcDNcIik7IC8vUGxheSB0aGUgYXVkaW8gZmlsZVxuXHQqICAgICB9LFxuXHQqXG5cdCogICAgIGZ1bmN0aW9uKGUpIHtcblx0KiAgICAgICAvL3Byb2dyZXNzXG5cdCogICAgIH0sXG5cdCpcblx0KiAgICAgZnVuY3Rpb24oZSkge1xuXHQqICAgICAgIC8vdWggb2gsIGVycm9yIGxvYWRpbmdcblx0KiAgICAgfVxuXHQqICk7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkuYXNzZXRzXG4gICAgICAgICogQHNlZSBDcmFmdHkuaW1hZ2Vfd2hpdGVsaXN0XG5cdCovXG4gICAgbG9hZDogZnVuY3Rpb24gKGRhdGEsIG9uY29tcGxldGUsIG9ucHJvZ3Jlc3MsIG9uZXJyb3IpIHtcbiAgICAgICAgICAgIFxuICAgICAgICB2YXIgaSA9IDAsIGwgPSBkYXRhLmxlbmd0aCwgY3VycmVudCwgb2JqLCB0b3RhbCA9IGwsIGogPSAwLCBleHQgPSBcIlwiIDtcbiAgXG4gICAgICAgIC8vUHJvZ3Jlc3MgZnVuY3Rpb25cbiAgICAgICAgZnVuY3Rpb24gcHJvKCl7XG4gICAgICAgICAgICB2YXIgc3JjID0gdGhpcy5zcmM7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgLy9SZW1vdmUgZXZlbnRzIGNhdXNlIGF1ZGlvIHRyaWdnZXIgdGhpcyBldmVudCBtb3JlIHRoYW4gb25jZShkZXBlbmRzIG9uIGJyb3dzZXIpXG4gICAgICAgICAgICBpZiAodGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKSB7ICBcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcHJvLCBmYWxzZSk7ICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgXG4gICAgICAgICAgICArK2o7XG4gICAgICAgICAgICAvL2lmIHByb2dyZXNzIGNhbGxiYWNrLCBnaXZlIGluZm9ybWF0aW9uIG9mIGFzc2V0cyBsb2FkZWQsIHRvdGFsIGFuZCBwZXJjZW50XG4gICAgICAgICAgICBpZiAob25wcm9ncmVzcykgXG4gICAgICAgICAgICAgICAgb25wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRlZDogaiwgXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsOiB0b3RhbCwgXG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IChqIC8gdG90YWwgKiAxMDApLFxuICAgICAgICAgICAgICAgICAgICBzcmM6c3JjXG4gICAgICAgICAgICAgICAgfSk7XG5cdFx0XHRcdFxuICAgICAgICAgICAgaWYoaiA9PT0gdG90YWwgJiYgb25jb21wbGV0ZSkgb25jb21wbGV0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICAvL0Vycm9yIGZ1bmN0aW9uXG4gICAgICAgIGZ1bmN0aW9uIGVycigpe1xuICAgICAgICAgICAgdmFyIHNyYyA9IHRoaXMuc3JjO1xuICAgICAgICAgICAgaWYgKG9uZXJyb3IpIFxuICAgICAgICAgICAgICAgIG9uZXJyb3Ioe1xuICAgICAgICAgICAgICAgICAgICBsb2FkZWQ6IGosIFxuICAgICAgICAgICAgICAgICAgICB0b3RhbDogdG90YWwsIFxuICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAoaiAvIHRvdGFsICogMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgc3JjOnNyY1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcdFx0XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBpZihqID09PSB0b3RhbCAmJiBvbmNvbXBsZXRlKSBvbmNvbXBsZXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgICAgIFxuICAgICAgICBmb3IgKDsgaSA8IGw7ICsraSkgeyAgICAgICBcbiAgICAgICAgICAgIGN1cnJlbnQgPSBkYXRhW2ldO1xuICAgICAgICAgICAgZXh0ID0gY3VycmVudC5zdWJzdHIoY3VycmVudC5sYXN0SW5kZXhPZignLicpICsgMSwgMykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgXG4gICAgICAgICAgICBvYmogPSBDcmFmdHkuYXNzZXQoY3VycmVudCkgfHwgbnVsbDsgICBcbiAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3VwcG9ydC5hdWRpbyAmJiBDcmFmdHkuYXVkaW8uc3VwcG9ydGVkW2V4dF0pIHsgICBcbiAgICAgICAgICAgICAgICAvL0NyZWF0ZSBuZXcgb2JqZWN0IGlmIG5vdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZighb2JqKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBjdXJyZW50LnN1YnN0cihjdXJyZW50Lmxhc3RJbmRleE9mKCcvJykgKyAxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBvYmogPSBDcmFmdHkuYXVkaW8uYXVkaW9FbGVtZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIG9iai5pZCA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgIG9iai5zcmMgPSBjdXJyZW50O1xuICAgICAgICAgICAgICAgICAgICBvYmoucHJlbG9hZCA9IFwiYXV0b1wiO1xuICAgICAgICAgICAgICAgICAgICBvYmoudm9sdW1lID0gQ3JhZnR5LmF1ZGlvLnZvbHVtZTtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmFzc2V0KGN1cnJlbnQsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hdWRpby5zb3VuZHNbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmo6b2JqLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVkOjBcbiAgICAgICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgICAgIC8vYWRkRXZlbnRMaXN0ZW5lciBpcyBzdXBwb3J0ZWQgb24gSUU5ICwgQXVkaW8gYXMgd2VsbFxuICAgICAgICAgICAgICAgIGlmIChvYmouYWRkRXZlbnRMaXN0ZW5lcikgeyAgXG4gICAgICAgICAgICAgICAgICAgIG9iai5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHBybywgZmFsc2UpOyAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQ3JhZnR5LmltYWdlX3doaXRlbGlzdC5pbmRleE9mKGV4dCkgPj0gMCkgeyBcbiAgICAgICAgICAgICAgICBpZighb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iaiA9IG5ldyBJbWFnZSgpO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYXNzZXQoY3VycmVudCwgb2JqKTsgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZD1wcm87XG4gICAgICAgICAgICAgICAgb2JqLnNyYyA9IGN1cnJlbnQ7IC8vc2V0dXAgc3JjIGFmdGVyIG9ubG9hZCBmdW5jdGlvbiBPcGVyYS9JRSBCdWdcbiAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG90YWwtLTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTsgLy9za2lwIGlmIG5vdCBhcHBsaWNhYmxlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvYmoub25lcnJvciA9IGVycjtcbiAgICAgICAgfVxuICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cdC8qKkBcblx0KiAjQ3JhZnR5Lm1vZHVsZXNcblx0KiBAY2F0ZWdvcnkgQXNzZXRzXG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5Lm1vZHVsZXMoW1N0cmluZyByZXBvTG9jYXRpb24sXSBPYmplY3QgbW9kdWxlTWFwWywgRnVuY3Rpb24gb25Mb2FkXSlcblx0KiBAcGFyYW0gbW9kdWxlcyAtIE1hcCBvZiBuYW1lOnZlcnNpb24gcGFpcnMgZm9yIG1vZHVsZXMgdG8gbG9hZFxuXHQqIEBwYXJhbSBvbkxvYWQgLSBDYWxsYmFjayB3aGVuIHRoZSBtb2R1bGVzIGFyZSBsb2FkZWRcblx0KiBcblx0KiBCcm93c2UgdGhlIHNlbGVjdGlvbiBvZiBjb21tdW5pdHkgbW9kdWxlcyBvbiBodHRwOi8vY3JhZnR5Y29tcG9uZW50cy5jb21cblx0KiBcbiAgICAqIEl0IGlzIHBvc3NpYmxlIHRvIGNyZWF0ZSB5b3VyIG93biByZXBvc2l0b3J5LlxuXHQqXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIC8vIExvYWRpbmcgZnJvbSBkZWZhdWx0IHJlcG9zaXRvcnlcblx0KiBDcmFmdHkubW9kdWxlcyh7IG1vdmV0bzogJ0RFVicgfSwgZnVuY3Rpb24gKCkge1xuXHQqICAgICAvL21vZHVsZSBpcyByZWFkeVxuXHQqICAgICBDcmFmdHkuZShcIk1vdmVUbywgMkQsIERPTVwiKTtcblx0KiB9KTtcblx0KlxuXHQqIC8vIExvYWRpbmcgZnJvbSB5b3VyIG93biBzZXJ2ZXJcblx0KiBDcmFmdHkubW9kdWxlcyh7ICdodHRwOi8vbXlkb21haW4uY29tL2pzL215c3R1ZmYuanMnOiAnREVWJyB9LCBmdW5jdGlvbiAoKSB7XG5cdCogICAgIC8vbW9kdWxlIGlzIHJlYWR5XG5cdCogICAgIENyYWZ0eS5lKFwiTW92ZVRvLCAyRCwgRE9NXCIpO1xuXHQqIH0pO1xuXHQqXG5cdCogLy8gTG9hZGluZyBmcm9tIGFsdGVybmF0aXZlIHJlcG9zaXRvcnlcblx0KiBDcmFmdHkubW9kdWxlcygnaHR0cDovL2Nkbi5jcmFmdHktbW9kdWxlcy5jb20nLCB7IG1vdmV0bzogJ0RFVicgfSwgZnVuY3Rpb24gKCkge1xuXHQqICAgICAvL21vZHVsZSBpcyByZWFkeVxuXHQqICAgICBDcmFmdHkuZShcIk1vdmVUbywgMkQsIERPTVwiKTtcblx0KiB9KTtcblx0KlxuXHQqIC8vIExvYWRpbmcgZnJvbSB0aGUgbGF0ZXN0IGNvbXBvbmVudCB3ZWJzaXRlXG5cdCogQ3JhZnR5Lm1vZHVsZXMoXG5cdCogICAgICdodHRwOi8vY2RuLmNyYWZ0eWNvbXBvbmVudHMuY29tJ1xuXHQqICAgICAsIHsgTW92ZVRvOiAncmVsZWFzZScgfVxuXHQqICAgICAsIGZ1bmN0aW9uICgpIHtcblx0KiAgICAgQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvciwgTW92ZVRvXCIpXG5cdCogICAgICAgLmF0dHIoe3g6IDAsIHk6IDAsIHc6IDUwLCBoOiA1MH0pXG5cdCogICAgICAgLmNvbG9yKFwiZ3JlZW5cIik7XG5cdCogICAgIH0pO1xuXHQqIH0pO1xuXHQqIH5+flxuXHQqXG5cdCovXG5cdG1vZHVsZXM6IGZ1bmN0aW9uIChtb2R1bGVzUmVwb3NpdG9yeSwgbW9kdWxlTWFwLCBvbmNvbXBsZXRlKSB7XG5cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMiAmJiB0eXBlb2YgbW9kdWxlc1JlcG9zaXRvcnkgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdG9uY29tcGxldGUgPSBtb2R1bGVNYXA7XG5cdFx0XHRtb2R1bGVNYXAgPSBtb2R1bGVzUmVwb3NpdG9yeTtcblx0XHRcdG1vZHVsZXNSZXBvc2l0b3J5ID0gJ2h0dHA6Ly9jZG4uY3JhZnR5Y29tcG9uZW50cy5jb20nO1xuXHRcdH1cblxuXHRcdC8qIVxuXHRcdCAgKiAkc2NyaXB0LmpzIEFzeW5jIGxvYWRlciAmIGRlcGVuZGVuY3kgbWFuYWdlclxuXHRcdCAgKiBodHRwczovL2dpdGh1Yi5jb20vZGVkL3NjcmlwdC5qc1xuXHRcdCAgKiAoYykgRHVzdGluIERpYXosIEphY29iIFRob3JudG9uIDIwMTFcblx0XHQgICogTGljZW5zZTogTUlUXG5cdFx0ICAqL1xuXHRcdHZhciAkc2NyaXB0ID0gKGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciB3aW4gPSB0aGlzLCBkb2MgPSBkb2N1bWVudFxuXHRcdFx0LCBoZWFkID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF1cblx0XHRcdCwgdmFsaWRCYXNlID0gL15odHRwcz86XFwvXFwvL1xuXHRcdFx0LCBvbGQgPSB3aW4uJHNjcmlwdCwgbGlzdCA9IHt9LCBpZHMgPSB7fSwgZGVsYXkgPSB7fSwgc2NyaXB0cGF0aFxuXHRcdFx0LCBzY3JpcHRzID0ge30sIHMgPSAnc3RyaW5nJywgZiA9IGZhbHNlXG5cdFx0XHQsIHB1c2ggPSAncHVzaCcsIGRvbUNvbnRlbnRMb2FkZWQgPSAnRE9NQ29udGVudExvYWRlZCcsIHJlYWR5U3RhdGUgPSAncmVhZHlTdGF0ZSdcblx0XHRcdCwgYWRkRXZlbnRMaXN0ZW5lciA9ICdhZGRFdmVudExpc3RlbmVyJywgb25yZWFkeXN0YXRlY2hhbmdlID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSdcblxuXHRcdFx0ZnVuY3Rpb24gZXZlcnkoYXIsIGZuLCBpKSB7XG5cdFx0XHRcdGZvciAoaSA9IDAsIGogPSBhci5sZW5ndGg7IGkgPCBqOyArK2kpIGlmICghZm4oYXJbaV0pKSByZXR1cm4gZlxuXHRcdFx0XHRyZXR1cm4gMVxuXHRcdFx0fVxuXHRcdFx0ZnVuY3Rpb24gZWFjaChhciwgZm4pIHtcblx0XHRcdFx0ZXZlcnkoYXIsIGZ1bmN0aW9uIChlbCkge1xuXHRcdFx0XHRcdHJldHVybiAhZm4oZWwpXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHRcdGlmICghZG9jW3JlYWR5U3RhdGVdICYmIGRvY1thZGRFdmVudExpc3RlbmVyXSkge1xuXHRcdFx0XHRkb2NbYWRkRXZlbnRMaXN0ZW5lcl0oZG9tQ29udGVudExvYWRlZCwgZnVuY3Rpb24gZm4oKSB7XG5cdFx0XHRcdFx0ZG9jLnJlbW92ZUV2ZW50TGlzdGVuZXIoZG9tQ29udGVudExvYWRlZCwgZm4sIGYpXG5cdFx0XHRcdFx0ZG9jW3JlYWR5U3RhdGVdID0gJ2NvbXBsZXRlJ1xuXHRcdFx0XHR9LCBmKVxuXHRcdFx0XHRkb2NbcmVhZHlTdGF0ZV0gPSAnbG9hZGluZydcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gJHNjcmlwdChwYXRocywgaWRPckRvbmUsIG9wdERvbmUpIHtcblx0XHRcdFx0cGF0aHMgPSBwYXRoc1twdXNoXSA/IHBhdGhzIDogW3BhdGhzXVxuXHRcdFx0XHR2YXIgaWRPckRvbmVJc0RvbmUgPSBpZE9yRG9uZSAmJiBpZE9yRG9uZS5jYWxsXG5cdFx0XHRcdCwgZG9uZSA9IGlkT3JEb25lSXNEb25lID8gaWRPckRvbmUgOiBvcHREb25lXG5cdFx0XHRcdCwgaWQgPSBpZE9yRG9uZUlzRG9uZSA/IHBhdGhzLmpvaW4oJycpIDogaWRPckRvbmVcblx0XHRcdFx0LCBxdWV1ZSA9IHBhdGhzLmxlbmd0aFxuXHRcdFx0XHRmdW5jdGlvbiBsb29wRm4oaXRlbSkge1xuXHRcdFx0XHRcdHJldHVybiBpdGVtLmNhbGwgPyBpdGVtKCkgOiBsaXN0W2l0ZW1dXG5cdFx0XHRcdH1cblx0XHRcdFx0ZnVuY3Rpb24gY2FsbGJhY2soKSB7XG5cdFx0XHRcdFx0aWYgKCEtLXF1ZXVlKSB7XG5cdFx0XHRcdFx0XHRsaXN0W2lkXSA9IDFcblx0XHRcdFx0XHRcdGRvbmUgJiYgZG9uZSgpXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBkc2V0IGluIGRlbGF5KSB7XG5cdFx0XHRcdFx0XHRcdGV2ZXJ5KGRzZXQuc3BsaXQoJ3wnKSwgbG9vcEZuKSAmJiAhZWFjaChkZWxheVtkc2V0XSwgbG9vcEZuKSAmJiAoZGVsYXlbZHNldF0gPSBbXSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0ZWFjaChwYXRocywgZnVuY3Rpb24gKHBhdGgpIHtcblx0XHRcdFx0XHRcdGlmIChzY3JpcHRzW3BhdGhdKSB7XG5cdFx0XHRcdFx0XHRcdGlkICYmIChpZHNbaWRdID0gMSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHNjcmlwdHNbcGF0aF0gPT0gMiAmJiBjYWxsYmFjaygpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRzY3JpcHRzW3BhdGhdID0gMVxuXHRcdFx0XHRcdFx0aWQgJiYgKGlkc1tpZF0gPSAxKVxuXHRcdFx0XHRcdFx0Y3JlYXRlKCF2YWxpZEJhc2UudGVzdChwYXRoKSAmJiBzY3JpcHRwYXRoID8gc2NyaXB0cGF0aCArIHBhdGggKyAnLmpzJyA6IHBhdGgsIGNhbGxiYWNrKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sIDApXG5cdFx0XHRcdHJldHVybiAkc2NyaXB0XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGNyZWF0ZShwYXRoLCBmbikge1xuXHRcdFx0XHR2YXIgZWwgPSBkb2MuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jylcblx0XHRcdFx0LCBsb2FkZWQgPSBmXG5cdFx0XHRcdGVsLm9ubG9hZCA9IGVsLm9uZXJyb3IgPSBlbFtvbnJlYWR5c3RhdGVjaGFuZ2VdID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmICgoZWxbcmVhZHlTdGF0ZV0gJiYgISgvXmN8bG9hZGUvLnRlc3QoZWxbcmVhZHlTdGF0ZV0pKSkgfHwgbG9hZGVkKSByZXR1cm47XG5cdFx0XHRcdFx0ZWwub25sb2FkID0gZWxbb25yZWFkeXN0YXRlY2hhbmdlXSA9IG51bGxcblx0XHRcdFx0XHRsb2FkZWQgPSAxXG5cdFx0XHRcdFx0c2NyaXB0c1twYXRoXSA9IDJcblx0XHRcdFx0XHRmbigpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWwuYXN5bmMgPSAxXG5cdFx0XHRcdGVsLnNyYyA9IHBhdGhcblx0XHRcdFx0aGVhZC5pbnNlcnRCZWZvcmUoZWwsIGhlYWQuZmlyc3RDaGlsZClcblx0XHRcdH1cblxuXHRcdFx0JHNjcmlwdC5nZXQgPSBjcmVhdGVcblxuXHRcdFx0JHNjcmlwdC5vcmRlciA9IGZ1bmN0aW9uIChzY3JpcHRzLCBpZCwgZG9uZSkge1xuXHRcdFx0XHQoZnVuY3Rpb24gY2FsbGJhY2socykge1xuXHRcdFx0XHRcdHMgPSBzY3JpcHRzLnNoaWZ0KClcblx0XHRcdFx0XHRpZiAoIXNjcmlwdHMubGVuZ3RoKSAkc2NyaXB0KHMsIGlkLCBkb25lKVxuXHRcdFx0XHRcdGVsc2UgJHNjcmlwdChzLCBjYWxsYmFjaylcblx0XHRcdFx0fSgpKVxuXHRcdFx0fVxuXG5cdFx0XHQkc2NyaXB0LnBhdGggPSBmdW5jdGlvbiAocCkge1xuXHRcdFx0XHRzY3JpcHRwYXRoID0gcFxuXHRcdFx0fVxuXHRcdFx0JHNjcmlwdC5yZWFkeSA9IGZ1bmN0aW9uIChkZXBzLCByZWFkeSwgcmVxKSB7XG5cdFx0XHRcdGRlcHMgPSBkZXBzW3B1c2hdID8gZGVwcyA6IFtkZXBzXVxuXHRcdFx0XHR2YXIgbWlzc2luZyA9IFtdO1xuXHRcdFx0XHQhZWFjaChkZXBzLCBmdW5jdGlvbiAoZGVwKSB7XG5cdFx0XHRcdFx0bGlzdFtkZXBdIHx8IG1pc3NpbmdbcHVzaF0oZGVwKTtcblx0XHRcdFx0fSkgJiYgZXZlcnkoZGVwcywgZnVuY3Rpb24gKGRlcCkgeyByZXR1cm4gbGlzdFtkZXBdIH0pID9cblx0XHRcdFx0cmVhZHkoKSA6ICFmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRcdFx0ZGVsYXlba2V5XSA9IGRlbGF5W2tleV0gfHwgW11cblx0XHRcdFx0XHRkZWxheVtrZXldW3B1c2hdKHJlYWR5KVxuXHRcdFx0XHRcdHJlcSAmJiByZXEobWlzc2luZylcblx0XHRcdFx0fShkZXBzLmpvaW4oJ3wnKSlcblx0XHRcdFx0cmV0dXJuICRzY3JpcHRcblx0XHRcdH1cblxuXHRcdFx0JHNjcmlwdC5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW4uJHNjcmlwdCA9IG9sZDtcblx0XHRcdFx0cmV0dXJuIHRoaXNcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuICRzY3JpcHRcblx0XHR9KSgpO1xuXG5cdFx0dmFyIG1vZHVsZXMgPSBbXTtcblx0XHR2YXIgdmFsaWRCYXNlID0gL14oaHR0cHM/fGZpbGUpOlxcL1xcLy87XG5cdFx0Zm9yICh2YXIgaSBpbiBtb2R1bGVNYXApIHtcblx0XHRcdGlmICh2YWxpZEJhc2UudGVzdChpKSlcblx0XHRcdFx0bW9kdWxlcy5wdXNoKGkpXG5cdFx0XHRlbHNlXG5cdFx0XHRcdG1vZHVsZXMucHVzaChtb2R1bGVzUmVwb3NpdG9yeSArICcvJyArIGkudG9Mb3dlckNhc2UoKSArICctJyArIG1vZHVsZU1hcFtpXS50b0xvd2VyQ2FzZSgpICsgJy5qcycpO1xuXHRcdH1cblxuXHRcdCRzY3JpcHQobW9kdWxlcywgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKG9uY29tcGxldGUpIG9uY29tcGxldGUoKTtcblx0XHR9KTtcblx0fVxufSk7XG5cbi8qKkBcbiogI0NyYWZ0eS5tYXRoXG4qIEBjYXRlZ29yeSAyRFxuKiBTdGF0aWMgZnVuY3Rpb25zLlxuKi9cbkNyYWZ0eS5tYXRoID0ge1xuLyoqQFxuXHQgKiAjQ3JhZnR5Lm1hdGguYWJzXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG4gICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lm1hdGguYWJzKE51bWJlciBuKVxuICAgICAqIEBwYXJhbSBuIC0gU29tZSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJuIEFic29sdXRlIHZhbHVlLlxuICAgICAqIFxuXHQgKiBSZXR1cm5zIHRoZSBhYnNvbHV0ZSB2YWx1ZS5cbiAgICAgKi9cblx0YWJzOiBmdW5jdGlvbiAoeCkge1xuXHRcdHJldHVybiB4IDwgMCA/IC14IDogeDtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLmFtb3VudE9mXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGguYW1vdW50T2YoTnVtYmVyIGNoZWNrVmFsdWUsIE51bWJlciBtaW5WYWx1ZSwgTnVtYmVyIG1heFZhbHVlKVxuICAgICAqIEBwYXJhbSBjaGVja1ZhbHVlIC0gVmFsdWUgdGhhdCBzaG91bGQgY2hlY2tlZCB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0uXG4gICAgICogQHBhcmFtIG1pblZhbHVlIC0gTWluaW11bSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0gbWF4VmFsdWUgLSBNYXhpbXVtIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm4gQW1vdW50IG9mIGNoZWNrVmFsdWUgY29tcGFyZWQgdG8gbWluVmFsdWUgYW5kIG1heFZhbHVlLlxuICAgICAqIFxuXHQgKiBSZXR1cm5zIHRoZSBhbW91bnQgb2YgaG93IG11Y2ggYSBjaGVja1ZhbHVlIGlzIG1vcmUgbGlrZSBtaW5WYWx1ZSAoPTApXG4gICAgICogb3IgbW9yZSBsaWtlIG1heFZhbHVlICg9MSlcbiAgICAgKi9cblx0YW1vdW50T2Y6IGZ1bmN0aW9uIChjaGVja1ZhbHVlLCBtaW5WYWx1ZSwgbWF4VmFsdWUpIHtcblx0XHRpZiAobWluVmFsdWUgPCBtYXhWYWx1ZSlcblx0XHRcdHJldHVybiAoY2hlY2tWYWx1ZSAtIG1pblZhbHVlKSAvIChtYXhWYWx1ZSAtIG1pblZhbHVlKTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gKGNoZWNrVmFsdWUgLSBtYXhWYWx1ZSkgLyAobWluVmFsdWUgLSBtYXhWYWx1ZSk7XG5cdH0sXG5cblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLmNsYW1wXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGguY2xhbXAoTnVtYmVyIHZhbHVlLCBOdW1iZXIgbWluLCBOdW1iZXIgbWF4KVxuICAgICAqIEBwYXJhbSB2YWx1ZSAtIEEgdmFsdWUuXG4gICAgICogQHBhcmFtIG1heCAtIE1heGltdW0gdGhhdCB2YWx1ZSBjYW4gYmUuXG4gICAgICogQHBhcmFtIG1pbiAtIE1pbmltdW0gdGhhdCB2YWx1ZSBjYW4gYmUuXG4gICAgICogQHJldHVybiBUaGUgdmFsdWUgYmV0d2VlbiBtaW5pbXVtIGFuZCBtYXhpbXVtLlxuICAgICAqIFxuXHQgKiBSZXN0cmljdHMgYSB2YWx1ZSB0byBiZSB3aXRoaW4gYSBzcGVjaWZpZWQgcmFuZ2UuXG4gICAgICovXG5cdGNsYW1wOiBmdW5jdGlvbiAodmFsdWUsIG1pbiwgbWF4KSB7XG5cdFx0aWYgKHZhbHVlID4gbWF4KVxuXHRcdFx0cmV0dXJuIG1heDtcblx0XHRlbHNlIGlmICh2YWx1ZSA8IG1pbilcblx0XHRcdHJldHVybiBtaW47XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIHZhbHVlO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiBDb252ZXJ0cyBhbmdsZSBmcm9tIGRlZ3JlZSB0byByYWRpYW4uXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG4gICAgICogQHBhcmFtIGFuZ2xlSW5EZWcgLSBUaGUgYW5nbGUgaW4gZGVncmVlLlxuICAgICAqIEByZXR1cm4gVGhlIGFuZ2xlIGluIHJhZGlhbi5cbiAgICAgKi9cblx0ZGVnVG9SYWQ6IGZ1bmN0aW9uIChhbmdsZUluRGVnKSB7XG5cdFx0cmV0dXJuIGFuZ2xlSW5EZWcgKiBNYXRoLlBJIC8gMTgwO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGguZGlzdGFuY2Vcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5kaXN0YW5jZShOdW1iZXIgeDEsIE51bWJlciB5MSwgTnVtYmVyIHgyLCBOdW1iZXIgeTIpXG4gICAgICogQHBhcmFtIHgxIC0gRmlyc3QgeCBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB5MSAtIEZpcnN0IHkgY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geDIgLSBTZWNvbmQgeCBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB5MiAtIFNlY29uZCB5IGNvb3JkaW5hdGUuXG4gICAgICogQHJldHVybiBUaGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIHBvaW50cy5cbiAgICAgKiBcblx0ICogRGlzdGFuY2UgYmV0d2VlbiB0d28gcG9pbnRzLlxuICAgICAqL1xuXHRkaXN0YW5jZTogZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKSB7XG5cdFx0dmFyIHNxdWFyZWREaXN0YW5jZSA9IENyYWZ0eS5tYXRoLnNxdWFyZWREaXN0YW5jZSh4MSwgeTEsIHgyLCB5Mik7XG5cdFx0cmV0dXJuIE1hdGguc3FydChwYXJzZUZsb2F0KHNxdWFyZWREaXN0YW5jZSkpO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgubGVycFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLmxlcnAoTnVtYmVyIHZhbHVlMSwgTnVtYmVyIHZhbHVlMiwgTnVtYmVyIGFtb3VudClcbiAgICAgKiBAcGFyYW0gdmFsdWUxIC0gT25lIHZhbHVlLlxuICAgICAqIEBwYXJhbSB2YWx1ZTIgLSBBbm90aGVyIHZhbHVlLlxuICAgICAqIEBwYXJhbSBhbW91bnQgLSBBbW91bnQgb2YgdmFsdWUyIHRvIHZhbHVlMS5cbiAgICAgKiBAcmV0dXJuIExpbmVhciBpbnRlcnBvbGF0ZWQgdmFsdWUuXG4gICAgICogXG5cdCAqIExpbmVhciBpbnRlcnBvbGF0aW9uLiBQYXNzaW5nIGFtb3VudCB3aXRoIGEgdmFsdWUgb2YgMCB3aWxsIGNhdXNlIHZhbHVlMSB0byBiZSByZXR1cm5lZCxcbiAgICAgKiBhIHZhbHVlIG9mIDEgd2lsbCBjYXVzZSB2YWx1ZTIgdG8gYmUgcmV0dXJuZWQuXG4gICAgICovXG5cdGxlcnA6IGZ1bmN0aW9uICh2YWx1ZTEsIHZhbHVlMiwgYW1vdW50KSB7XG5cdFx0cmV0dXJuIHZhbHVlMSArICh2YWx1ZTIgLSB2YWx1ZTEpICogYW1vdW50O1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgubmVnYXRlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGgubmVnYXRlKE51bWJlciBwZXJjZW50KVxuICAgICAqIEBwYXJhbSBwZXJjZW50IC0gSWYgeW91IHBhc3MgMSBhIC0xIHdpbGwgYmUgcmV0dXJuZWQuIElmIHlvdSBwYXNzIDAgYSAxIHdpbGwgYmUgcmV0dXJuZWQuXG4gICAgICogQHJldHVybiAxIG9yIC0xLlxuICAgICAqIFxuXHQgKiBSZXR1cm5lcyBcInJhbmRvbWx5XCIgLTEuXG4gICAgICovXG5cdG5lZ2F0ZTogZnVuY3Rpb24gKHBlcmNlbnQpIHtcblx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IHBlcmNlbnQpXG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIDE7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5yYWRUb0RlZ1xuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLnJhZFRvRGVnKE51bWJlciBhbmdsZSlcbiAgICAgKiBAcGFyYW0gYW5nbGVJblJhZCAtIFRoZSBhbmdsZSBpbiByYWRpYW4uXG4gICAgICogQHJldHVybiBUaGUgYW5nbGUgaW4gZGVncmVlLlxuICAgICAqIFxuXHQgKiBDb252ZXJ0cyBhbmdsZSBmcm9tIHJhZGlhbiB0byBkZWdyZWUuXG4gICAgICovXG5cdHJhZFRvRGVnOiBmdW5jdGlvbiAoYW5nbGVJblJhZCkge1xuXHRcdHJldHVybiBhbmdsZUluUmFkICogMTgwIC8gTWF0aC5QSTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLnJhbmRvbUVsZW1lbnRPZkFycmF5XG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5Lm1hdGgucmFuZG9tRWxlbWVudE9mQXJyYXkoQXJyYXkgYXJyYXkpXG4gICAgICogQHBhcmFtIGFycmF5IC0gQSBzcGVjaWZpYyBhcnJheS5cbiAgICAgKiBAcmV0dXJuIEEgcmFuZG9tIGVsZW1lbnQgb2YgYSBzcGVjaWZpYyBhcnJheS5cbiAgICAgKiBcblx0ICogUmV0dXJucyBhIHJhbmRvbSBlbGVtZW50IG9mIGEgc3BlY2lmaWMgYXJyYXkuXG4gICAgICovXG5cdHJhbmRvbUVsZW1lbnRPZkFycmF5OiBmdW5jdGlvbiAoYXJyYXkpIHtcblx0XHRyZXR1cm4gYXJyYXlbTWF0aC5mbG9vcihhcnJheS5sZW5ndGggKiBNYXRoLnJhbmRvbSgpKV07XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5yYW5kb21JbnRcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5yYW5kb21JbnQoTnVtYmVyIHN0YXJ0LCBOdW1iZXIgZW5kKVxuICAgICAqIEBwYXJhbSBzdGFydCAtIFNtYWxsZXN0IGludCB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZC5cbiAgICAgKiBAcGFyYW0gZW5kIC0gQmlnZ2VzdCBpbnQgdmFsdWUgdGhhdCBjYW4gYmUgcmV0dXJuZWQuXG4gICAgICogQHJldHVybiBBIHJhbmRvbSBpbnQuXG4gICAgICogXG5cdCAqIFJldHVybnMgYSByYW5kb20gaW50IGluIHdpdGhpbiBhIHNwZWNpZmljIHJhbmdlLlxuICAgICAqL1xuXHRyYW5kb21JbnQ6IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuIHN0YXJ0ICsgTWF0aC5mbG9vcigoMSArIGVuZCAtIHN0YXJ0KSAqIE1hdGgucmFuZG9tKCkpO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgucmFuZG9tTnVtYmVyXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGgucmFuZG9tSW50KE51bWJlciBzdGFydCwgTnVtYmVyIGVuZClcbiAgICAgKiBAcGFyYW0gc3RhcnQgLSBTbWFsbGVzdCBudW1iZXIgdmFsdWUgdGhhdCBjYW4gYmUgcmV0dXJuZWQuXG4gICAgICogQHBhcmFtIGVuZCAtIEJpZ2dlc3QgbnVtYmVyIHZhbHVlIHRoYXQgY2FuIGJlIHJldHVybmVkLlxuICAgICAqIEByZXR1cm4gQSByYW5kb20gbnVtYmVyLlxuICAgICAqIFxuXHQgKiBSZXR1cm5zIGEgcmFuZG9tIG51bWJlciBpbiB3aXRoaW4gYSBzcGVjaWZpYyByYW5nZS5cbiAgICAgKi9cblx0cmFuZG9tTnVtYmVyOiBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuXHRcdHJldHVybiBzdGFydCArIChlbmQgLSBzdGFydCkgKiBNYXRoLnJhbmRvbSgpO1xuXHR9LFxuXG5cdC8qKkBcblx0ICogI0NyYWZ0eS5tYXRoLnNxdWFyZWREaXN0YW5jZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLnNxdWFyZWREaXN0YW5jZShOdW1iZXIgeDEsIE51bWJlciB5MSwgTnVtYmVyIHgyLCBOdW1iZXIgeTIpXG4gICAgICogQHBhcmFtIHgxIC0gRmlyc3QgeCBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB5MSAtIEZpcnN0IHkgY29vcmRpbmF0ZS5cbiAgICAgKiBAcGFyYW0geDIgLSBTZWNvbmQgeCBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB5MiAtIFNlY29uZCB5IGNvb3JkaW5hdGUuXG4gICAgICogQHJldHVybiBUaGUgc3F1YXJlZCBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gcG9pbnRzLlxuICAgICAqIFxuXHQgKiBTcXVhcmVkIGRpc3RhbmNlIGJldHdlZW4gdHdvIHBvaW50cy5cbiAgICAgKi9cblx0c3F1YXJlZERpc3RhbmNlOiBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcblx0XHRyZXR1cm4gKHgxIC0geDIpICogKHgxIC0geDIpICsgKHkxIC0geTIpICogKHkxIC0geTIpO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgud2l0aGluUmFuZ2Vcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIEJvb2xlYW4gQ3JhZnR5Lm1hdGgud2l0aGluUmFuZ2UoTnVtYmVyIHZhbHVlLCBOdW1iZXIgbWluLCBOdW1iZXIgbWF4KVxuICAgICAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gbWluIC0gTWluaW11bSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gbWF4IC0gTWF4aW11bSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJuIFJldHVybnMgdHJ1ZSBpZiB2YWx1ZSBpcyB3aXRoaW4gYSBzcGVjaWZpYyByYW5nZS5cbiAgICAgKiBcblx0ICogQ2hlY2sgaWYgYSB2YWx1ZSBpcyB3aXRoaW4gYSBzcGVjaWZpYyByYW5nZS5cbiAgICAgKi9cblx0d2l0aGluUmFuZ2U6IGZ1bmN0aW9uICh2YWx1ZSwgbWluLCBtYXgpIHtcblx0XHRyZXR1cm4gKHZhbHVlID49IG1pbiAmJiB2YWx1ZSA8PSBtYXgpO1xuXHR9XG59O1xuXG5DcmFmdHkubWF0aC5WZWN0b3IyRCA9IChmdW5jdGlvbiAoKSB7XG5cdC8qKkBcblx0ICogI0NyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqIEBjYXRlZ29yeSAyRFxuXHQgKiBAY2xhc3MgVGhpcyBpcyBhIGdlbmVyYWwgcHVycG9zZSAyRCB2ZWN0b3IgY2xhc3Ncblx0ICpcblx0ICogVmVjdG9yMkQgdXNlcyB0aGUgZm9sbG93aW5nIGZvcm06XG5cdCAqIDx4LCB5PlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IFZlY3RvcjJEKCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IFZlY3RvcjJEKFZlY3RvcjJEKTtcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gVmVjdG9yMkQoTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfE51bWJlcj0wfSB4XG5cdCAqIEBwYXJhbSB7TnVtYmVyPTB9IHlcblx0ICovXG5cdGZ1bmN0aW9uIFZlY3RvcjJEKHgsIHkpIHtcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFZlY3RvcjJEKSB7XG5cdFx0XHR0aGlzLnggPSB4Lng7XG5cdFx0XHR0aGlzLnkgPSB4Lnk7XG5cdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG5cdFx0XHR0aGlzLnggPSB4O1xuXHRcdFx0dGhpcy55ID0geTtcblx0XHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKVxuXHRcdFx0dGhyb3cgXCJVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgZm9yIFZlY3RvcjJEKClcIjtcblx0fSAvLyBjbGFzcyBWZWN0b3IyRFxuXG5cdFZlY3RvcjJELnByb3RvdHlwZS54ID0gMDtcblx0VmVjdG9yMkQucHJvdG90eXBlLnkgPSAwO1xuXG5cdC8qKkBcblx0ICogIy5hZGRcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBBZGRzIHRoZSBwYXNzZWQgdmVjdG9yIHRvIHRoaXMgdmVjdG9yXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gYWRkKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHt2ZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIGFmdGVyIGFkZGluZ1xuXHQgKi9cblx0VmVjdG9yMkQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uICh2ZWNSSCkge1xuXHRcdHRoaXMueCArPSB2ZWNSSC54O1xuXHRcdHRoaXMueSArPSB2ZWNSSC55O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9IC8vIGFkZFxuXG5cdC8qKkBcblx0ICogIy5hbmdsZUJldHdlZW5cbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBhbmdsZSBiZXR3ZWVuIHRoZSBwYXNzZWQgdmVjdG9yIGFuZCB0aGlzIHZlY3RvciwgdXNpbmcgPDAsMD4gYXMgdGhlIHBvaW50IG9mIHJlZmVyZW5jZS5cblx0ICogQW5nbGVzIHJldHVybmVkIGhhdmUgdGhlIHJhbmdlICjiiJLPgCwgz4BdLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBhbmdsZUJldHdlZW4oVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgYW5nbGUgYmV0d2VlbiB0aGUgdHdvIHZlY3RvcnMgaW4gcmFkaWFuc1xuXHQgKi9cblx0VmVjdG9yMkQucHJvdG90eXBlLmFuZ2xlQmV0d2VlbiA9IGZ1bmN0aW9uICh2ZWNSSCkge1xuXHRcdHJldHVybiBNYXRoLmF0YW4yKHRoaXMueCAqIHZlY1JILnkgLSB0aGlzLnkgKiB2ZWNSSC54LCB0aGlzLnggKiB2ZWNSSC54ICsgdGhpcy55ICogdmVjUkgueSk7XG5cdH0gLy8gYW5nbGVCZXR3ZWVuXG5cblx0LyoqQFxuXHQgKiAjLmFuZ2xlVG9cbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBhbmdsZSB0byB0aGUgcGFzc2VkIHZlY3RvciBmcm9tIHRoaXMgdmVjdG9yLCB1c2luZyB0aGlzIHZlY3RvciBhcyB0aGUgcG9pbnQgb2YgcmVmZXJlbmNlLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBhbmdsZVRvKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIGFuZ2xlIHRvIHRoZSBwYXNzZWQgdmVjdG9yIGluIHJhZGlhbnNcblx0ICovXG5cdFZlY3RvcjJELnByb3RvdHlwZS5hbmdsZVRvID0gZnVuY3Rpb24gKHZlY1JIKSB7XG5cdFx0cmV0dXJuIE1hdGguYXRhbjIodmVjUkgueSAtIHRoaXMueSwgdmVjUkgueCAtIHRoaXMueCk7XG5cdH07XG5cblx0LyoqQFxuXHQgKiAjLmNsb25lXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ3JlYXRlcyBhbmQgZXhhY3QsIG51bWVyaWMgY29weSBvZiB0aGlzIHZlY3RvclxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IGNsb25lKCk7XG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhlIG5ldyB2ZWN0b3Jcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yMkQodGhpcyk7XG4gICAgfTsgLy8gY2xvbmVcblxuXHQvKipAXG5cdCAqICMuZGlzdGFuY2VcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBkaXN0YW5jZSBmcm9tIHRoaXMgdmVjdG9yIHRvIHRoZSBwYXNzZWQgdmVjdG9yLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBkaXN0YW5jZShWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gdmVjdG9yc1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZGlzdGFuY2UgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KCh2ZWNSSC54IC0gdGhpcy54KSAqICh2ZWNSSC54IC0gdGhpcy54KSArICh2ZWNSSC55IC0gdGhpcy55KSAqICh2ZWNSSC55IC0gdGhpcy55KSk7XG4gICAgfTsgLy8gZGlzdGFuY2VcblxuXHQvKipAXG5cdCAqICMuZGlzdGFuY2VTcVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIHNxdWFyZWQgZGlzdGFuY2UgZnJvbSB0aGlzIHZlY3RvciB0byB0aGUgcGFzc2VkIHZlY3Rvci5cblx0ICogVGhpcyBmdW5jdGlvbiBhdm9pZHMgY2FsY3VsYXRpbmcgdGhlIHNxdWFyZSByb290LCB0aHVzIGJlaW5nIHNsaWdodGx5IGZhc3RlciB0aGFuIC5kaXN0YW5jZSggKS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gZGlzdGFuY2VTcShWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBzcXVhcmVkIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byB2ZWN0b3JzXG5cdCAqIEBzZWUgLmRpc3RhbmNlXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5kaXN0YW5jZVNxID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgcmV0dXJuICh2ZWNSSC54IC0gdGhpcy54KSAqICh2ZWNSSC54IC0gdGhpcy54KSArICh2ZWNSSC55IC0gdGhpcy55KSAqICh2ZWNSSC55IC0gdGhpcy55KTtcbiAgICB9OyAvLyBkaXN0YW5jZVNxXG5cblx0LyoqQFxuXHQgKiAjLmRpdmlkZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIERpdmlkZXMgdGhpcyB2ZWN0b3IgYnkgdGhlIHBhc3NlZCB2ZWN0b3IuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gZGl2aWRlKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBkaXZpZGluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZGl2aWRlID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgdGhpcy54IC89IHZlY1JILng7XG4gICAgICAgIHRoaXMueSAvPSB2ZWNSSC55O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBkaXZpZGVcblxuXHQvKipAXG5cdCAqICMuZG90UHJvZHVjdFxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIGRvdCBwcm9kdWN0IG9mIHRoaXMgYW5kIHRoZSBwYXNzZWQgdmVjdG9yc1xuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBkb3RQcm9kdWN0KFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIHJlc3VsdGFudCBkb3QgcHJvZHVjdFxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZG90UHJvZHVjdCA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWNSSC54ICsgdGhpcy55ICogdmVjUkgueTtcbiAgICB9OyAvLyBkb3RQcm9kdWN0XG5cblx0LyoqQFxuXHQgKiAjLmVxdWFsc1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIERldGVybWluZXMgaWYgdGhpcyB2ZWN0b3IgaXMgbnVtZXJpY2FsbHkgZXF1aXZhbGVudCB0byB0aGUgcGFzc2VkIHZlY3Rvci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge0Jvb2xlYW59IGVxdWFscyhWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufSB0cnVlIGlmIHRoZSB2ZWN0b3JzIGFyZSBlcXVpdmFsZW50XG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICByZXR1cm4gdmVjUkggaW5zdGFuY2VvZiBWZWN0b3IyRCAmJlxuICAgICAgICAgICAgdGhpcy54ID09IHZlY1JILnggJiYgdGhpcy55ID09IHZlY1JILnk7XG4gICAgfTsgLy8gZXF1YWxzXG5cblx0LyoqQFxuXHQgKiAjLmdldE5vcm1hbFxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgYSBuZXcgcmlnaHQtaGFuZGVkIG5vcm1hbCB2ZWN0b3IgZm9yIHRoZSBsaW5lIGNyZWF0ZWQgYnkgdGhpcyBhbmQgdGhlIHBhc3NlZCB2ZWN0b3JzLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IGdldE5vcm1hbChbVmVjdG9yMkRdKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRD08MCwwPn0gW3ZlY1JIXVxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoZSBuZXcgbm9ybWFsIHZlY3RvclxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuZ2V0Tm9ybWFsID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgaWYgKHZlY1JIID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlY3RvcjJEKC10aGlzLnksIHRoaXMueCk7IC8vIGFzc3VtZSB2ZWNSSCBpcyA8MCwgMD5cbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyRCh2ZWNSSC55IC0gdGhpcy55LCB0aGlzLnggLSB2ZWNSSC54KS5ub3JtYWxpemUoKTtcbiAgICB9OyAvLyBnZXROb3JtYWxcblxuXHQvKipAXG5cdCAqICMuaXNaZXJvXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogRGV0ZXJtaW5lcyBpZiB0aGlzIHZlY3RvciBpcyBlcXVhbCB0byA8MCwwPlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7Qm9vbGVhbn0gaXNaZXJvKCk7XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufSB0cnVlIGlmIHRoaXMgdmVjdG9yIGlzIGVxdWFsIHRvIDwwLDA+XG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gMCAmJiB0aGlzLnkgPT09IDA7XG4gICAgfTsgLy8gaXNaZXJvXG5cblx0LyoqQFxuXHQgKiAjLm1hZ25pdHVkZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIG1hZ25pdHVkZSBvZiB0aGlzIHZlY3Rvci5cblx0ICogTm90ZTogRnVuY3Rpb24gb2JqZWN0cyBpbiBKYXZhU2NyaXB0IGFscmVhZHkgaGF2ZSBhICdsZW5ndGgnIG1lbWJlciwgaGVuY2UgdGhlIHVzZSBvZiBtYWduaXR1ZGUgaW5zdGVhZC5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gbWFnbml0dWRlKCk7XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBtYWduaXR1ZGUgb2YgdGhpcyB2ZWN0b3Jcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLm1hZ25pdHVkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gICAgfTsgLy8gbWFnbml0dWRlXG5cblx0LyoqQFxuXHQgKiAjLm1hZ25pdHVkZVNxXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlIG9mIHRoZSBtYWduaXR1ZGUgb2YgdGhpcyB2ZWN0b3IuXG5cdCAqIFRoaXMgZnVuY3Rpb24gYXZvaWRzIGNhbGN1bGF0aW5nIHRoZSBzcXVhcmUgcm9vdCwgdGh1cyBiZWluZyBzbGlnaHRseSBmYXN0ZXIgdGhhbiAubWFnbml0dWRlKCApLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBtYWduaXR1ZGVTcSgpO1xuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgc3F1YXJlIG9mIHRoZSBtYWduaXR1ZGUgb2YgdGhpcyB2ZWN0b3Jcblx0ICogQHNlZSAubWFnbml0dWRlXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5tYWduaXR1ZGVTcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xuICAgIH07IC8vIG1hZ25pdHVkZVNxXG5cblx0LyoqQFxuXHQgKiAjLm11bHRpcGx5XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogTXVsdGlwbGllcyB0aGlzIHZlY3RvciBieSB0aGUgcGFzc2VkIHZlY3RvclxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IG11bHRpcGx5KFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBtdWx0aXBseWluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUubXVsdGlwbHkgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICB0aGlzLnggKj0gdmVjUkgueDtcbiAgICAgICAgdGhpcy55ICo9IHZlY1JILnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIG11bHRpcGx5XG5cblx0LyoqQFxuXHQgKiAjLm5lZ2F0ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIE5lZ2F0ZXMgdGhpcyB2ZWN0b3IgKGllLiA8LXgsLXk+KVxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IG5lZ2F0ZSgpO1xuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIG5lZ2F0aW9uXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5uZWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICAgICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gbmVnYXRlXG5cblx0LyoqQFxuXHQgKiAjLm5vcm1hbGl6ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIE5vcm1hbGl6ZXMgdGhpcyB2ZWN0b3IgKHNjYWxlcyB0aGUgdmVjdG9yIHNvIHRoYXQgaXRzIG5ldyBtYWduaXR1ZGUgaXMgMSlcblx0ICogRm9yIHZlY3RvcnMgd2hlcmUgbWFnbml0dWRlIGlzIDAsIDwxLDA+IGlzIHJldHVybmVkLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IG5vcm1hbGl6ZSgpO1xuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIG5vcm1hbGl6YXRpb25cblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbG5nID0gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG5cbiAgICAgICAgaWYgKGxuZyA9PT0gMCkge1xuICAgICAgICAgICAgLy8gZGVmYXVsdCBkdWUgRWFzdFxuICAgICAgICAgICAgdGhpcy54ID0gMTtcbiAgICAgICAgICAgIHRoaXMueSA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnggLz0gbG5nO1xuICAgICAgICAgICAgdGhpcy55IC89IGxuZztcbiAgICAgICAgfSAvLyBlbHNlXG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gbm9ybWFsaXplXG5cblx0LyoqQFxuXHQgKiAjLnNjYWxlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogU2NhbGVzIHRoaXMgdmVjdG9yIGJ5IHRoZSBwYXNzZWQgYW1vdW50KHMpXG5cdCAqIElmIHNjYWxhclkgaXMgb21pdHRlZCwgc2NhbGFyWCBpcyB1c2VkIGZvciBib3RoIGF4ZXNcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBzY2FsZShOdW1iZXJbLCBOdW1iZXJdKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxhclhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtzY2FsYXJZXVxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgYWZ0ZXIgc2NhbGluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbihzY2FsYXJYLCBzY2FsYXJZKSB7XG4gICAgICAgIGlmIChzY2FsYXJZID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBzY2FsYXJZID0gc2NhbGFyWDtcblxuICAgICAgICB0aGlzLnggKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy55ICo9IHNjYWxhclk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc2NhbGVcblxuXHQvKipAXG5cdCAqICMuc2NhbGVUb01hZ25pdHVkZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFNjYWxlcyB0aGlzIHZlY3RvciBzdWNoIHRoYXQgaXRzIG5ldyBtYWduaXR1ZGUgaXMgZXF1YWwgdG8gdGhlIHBhc3NlZCB2YWx1ZS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBzY2FsZVRvTWFnbml0dWRlKE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBtYWdcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBzY2FsaW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5zY2FsZVRvTWFnbml0dWRlID0gZnVuY3Rpb24obWFnKSB7XG4gICAgICAgIHZhciBrID0gbWFnIC8gdGhpcy5tYWduaXR1ZGUoKTtcbiAgICAgICAgdGhpcy54ICo9IGs7XG4gICAgICAgIHRoaXMueSAqPSBrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzY2FsZVRvTWFnbml0dWRlXG5cblx0LyoqQFxuXHQgKiAjLnNldFZhbHVlc1xuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFNldHMgdGhlIHZhbHVlcyBvZiB0aGlzIHZlY3RvciB1c2luZyBhIHBhc3NlZCB2ZWN0b3Igb3IgcGFpciBvZiBudW1iZXJzLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHNldFZhbHVlcyhWZWN0b3IyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHNldFZhbHVlcyhOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfFZlY3RvcjJEfSB4XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSB5XG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgc2V0dGluZyBvZiB2YWx1ZXNcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnNldFZhbHVlcyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgaWYgKHggaW5zdGFuY2VvZiBWZWN0b3IyRCkge1xuICAgICAgICAgICAgdGhpcy54ID0geC54O1xuICAgICAgICAgICAgdGhpcy55ID0geC55O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIH0gLy8gZWxzZVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHNldFZhbHVlc1xuXG5cdC8qKkBcblx0ICogIy5zdWJ0cmFjdFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIFN1YnRyYWN0cyB0aGUgcGFzc2VkIHZlY3RvciBmcm9tIHRoaXMgdmVjdG9yLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHN1YnRyYWN0KFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge3ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBzdWJ0cmFjdGluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuc3VidHJhY3QgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICB0aGlzLnggLT0gdmVjUkgueDtcbiAgICAgICAgdGhpcy55IC09IHZlY1JILnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHN1YnRyYWN0XG5cblx0LyoqQFxuXHQgKiAjLnRvU3RyaW5nXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIHZlY3Rvci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1N0cmluZ30gdG9TdHJpbmcoKTtcblx0ICogQHJldHVybnMge1N0cmluZ31cblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBcIlZlY3RvcjJEKFwiICsgdGhpcy54ICsgXCIsIFwiICsgdGhpcy55ICsgXCIpXCI7XG4gICAgfTsgLy8gdG9TdHJpbmdcblxuXHQvKipAXG5cdCAqICMudHJhbnNsYXRlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogVHJhbnNsYXRlcyAobW92ZXMpIHRoaXMgdmVjdG9yIGJ5IHRoZSBwYXNzZWQgYW1vdW50cy5cblx0ICogSWYgZHkgaXMgb21pdHRlZCwgZHggaXMgdXNlZCBmb3IgYm90aCBheGVzLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHRyYW5zbGF0ZShOdW1iZXJbLCBOdW1iZXJdKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGR4XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbZHldXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgdHJhbnNsYXRpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgICBpZiAoZHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGR5ID0gZHg7XG5cbiAgICAgICAgdGhpcy54ICs9IGR4O1xuICAgICAgICB0aGlzLnkgKz0gZHk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gdHJhbnNsYXRlXG5cblx0LyoqQFxuXHQgKiAjLnRyaXBsZVByb2R1Y3Rcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSB0cmlwbGUgcHJvZHVjdCBvZiB0aHJlZSB2ZWN0b3JzLlxuXHQgKiB0cmlwbGUgdmVjdG9yIHByb2R1Y3QgPSBiKGHigKJjKSAtIGEoYuKAomMpXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHN0YXRpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSB0cmlwbGVQcm9kdWN0KFZlY3RvcjJELCBWZWN0b3IyRCwgVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSBhXG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IGJcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gY1xuXHQgKiBAcmV0dXJuIHtWZWN0b3IyRH0gdGhlIHRyaXBsZSBwcm9kdWN0IGFzIGEgbmV3IHZlY3RvclxuXHQgKi9cblx0VmVjdG9yMkQudHJpcGxlUHJvZHVjdCA9IGZ1bmN0aW9uIChhLCBiLCBjKSB7XG5cdFx0dmFyIGFjID0gYS5kb3RQcm9kdWN0KGMpO1xuXHRcdHZhciBiYyA9IGIuZG90UHJvZHVjdChjKTtcblx0XHRyZXR1cm4gbmV3IENyYWZ0eS5tYXRoLlZlY3RvcjJEKGIueCAqIGFjIC0gYS54ICogYmMsIGIueSAqIGFjIC0gYS55ICogYmMpO1xuXHR9O1xuXG5cdHJldHVybiBWZWN0b3IyRDtcbn0pKCk7XG5cbkNyYWZ0eS5tYXRoLk1hdHJpeDJEID0gKGZ1bmN0aW9uICgpIHtcblx0LyoqQFxuXHQgKiAjQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICogQGNhdGVnb3J5IDJEXG5cdCAqXG5cdCAqIEBjbGFzcyBUaGlzIGlzIGEgMkQgTWF0cml4MkQgY2xhc3MuIEl0IGlzIDN4MyB0byBhbGxvdyBmb3IgYWZmaW5lIHRyYW5zZm9ybWF0aW9ucyBpbiAyRCBzcGFjZS5cblx0ICogVGhlIHRoaXJkIHJvdyBpcyBhbHdheXMgYXNzdW1lZCB0byBiZSBbMCwgMCwgMV0uXG5cdCAqXG5cdCAqIE1hdHJpeDJEIHVzZXMgdGhlIGZvbGxvd2luZyBmb3JtLCBhcyBwZXIgdGhlIHdoYXR3Zy5vcmcgc3BlY2lmaWNhdGlvbnMgZm9yIGNhbnZhcy50cmFuc2Zvcm0oKTpcblx0ICogW2EsIGMsIGVdXG5cdCAqIFtiLCBkLCBmXVxuXHQgKiBbMCwgMCwgMV1cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBuZXcgTWF0cml4MkQoKTtcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gbmV3IE1hdHJpeDJEKE1hdHJpeDJEKTtcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gbmV3IE1hdHJpeDJEKE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge01hdHJpeDJEfE51bWJlcj0xfSBhXG5cdCAqIEBwYXJhbSB7TnVtYmVyPTB9IGJcblx0ICogQHBhcmFtIHtOdW1iZXI9MH0gY1xuXHQgKiBAcGFyYW0ge051bWJlcj0xfSBkXG5cdCAqIEBwYXJhbSB7TnVtYmVyPTB9IGVcblx0ICogQHBhcmFtIHtOdW1iZXI9MH0gZlxuXHQgKi9cblx0TWF0cml4MkQgPSBmdW5jdGlvbiAoYSwgYiwgYywgZCwgZSwgZikge1xuXHRcdGlmIChhIGluc3RhbmNlb2YgTWF0cml4MkQpIHtcblx0XHRcdHRoaXMuYSA9IGEuYTtcblx0XHRcdHRoaXMuYiA9IGEuYjtcblx0XHRcdHRoaXMuYyA9IGEuYztcblx0XHRcdHRoaXMuZCA9IGEuZDtcblx0XHRcdHRoaXMuZSA9IGEuZTtcblx0XHRcdHRoaXMuZiA9IGEuZjtcblx0XHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDYpIHtcblx0XHRcdHRoaXMuYSA9IGE7XG5cdFx0XHR0aGlzLmIgPSBiO1xuXHRcdFx0dGhpcy5jID0gYztcblx0XHRcdHRoaXMuZCA9IGQ7XG5cdFx0XHR0aGlzLmUgPSBlO1xuXHRcdFx0dGhpcy5mID0gZjtcblx0XHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKVxuXHRcdFx0dGhyb3cgXCJVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgZm9yIE1hdHJpeDJEKClcIjtcblx0fSAvLyBjbGFzcyBNYXRyaXgyRFxuXG5cdE1hdHJpeDJELnByb3RvdHlwZS5hID0gMTtcblx0TWF0cml4MkQucHJvdG90eXBlLmIgPSAwO1xuXHRNYXRyaXgyRC5wcm90b3R5cGUuYyA9IDA7XG5cdE1hdHJpeDJELnByb3RvdHlwZS5kID0gMTtcblx0TWF0cml4MkQucHJvdG90eXBlLmUgPSAwO1xuXHRNYXRyaXgyRC5wcm90b3R5cGUuZiA9IDA7XG5cblx0LyoqQFxuXHQgKiAjLmFwcGx5XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyB0aGUgbWF0cml4IHRyYW5zZm9ybWF0aW9ucyB0byB0aGUgcGFzc2VkIG9iamVjdFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IGFwcGx5KFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkggLSB2ZWN0b3IgdG8gYmUgdHJhbnNmb3JtZWRcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGUgcGFzc2VkIHZlY3RvciBvYmplY3QgYWZ0ZXIgdHJhbnNmb3JtaW5nXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIC8vIEknbSBub3Qgc3VyZSBvZiB0aGUgYmVzdCB3YXkgZm9yIHRoaXMgZnVuY3Rpb24gdG8gYmUgaW1wbGVtZW50ZWQuIElkZWFsbHlcbiAgICAgICAgLy8gc3VwcG9ydCBmb3Igb3RoZXIgb2JqZWN0cyAocmVjdGFuZ2xlcywgcG9seWdvbnMsIGV0Yykgc2hvdWxkIGJlIGVhc2lseVxuICAgICAgICAvLyBhZGRhYmxlIGluIHRoZSBmdXR1cmUuIE1heWJlIGEgZnVuY3Rpb24gKGFwcGx5KSBpcyBub3QgdGhlIGJlc3Qgd2F5IHRvIGRvXG4gICAgICAgIC8vIHRoaXMuLi4/XG5cbiAgICAgICAgdmFyIHRtcFggPSB2ZWNSSC54O1xuICAgICAgICB2ZWNSSC54ID0gdG1wWCAqIHRoaXMuYSArIHZlY1JILnkgKiB0aGlzLmMgKyB0aGlzLmU7XG4gICAgICAgIHZlY1JILnkgPSB0bXBYICogdGhpcy5iICsgdmVjUkgueSAqIHRoaXMuZCArIHRoaXMuZjtcbiAgICAgICAgLy8gbm8gbmVlZCB0byBob21vZ2VuaXplIHNpbmNlIHRoZSB0aGlyZCByb3cgaXMgYWx3YXlzIFswLCAwLCAxXVxuXG4gICAgICAgIHJldHVybiB2ZWNSSDtcbiAgICB9OyAvLyBhcHBseVxuXG5cdC8qKkBcblx0ICogIy5jbG9uZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIENyZWF0ZXMgYW4gZXhhY3QsIG51bWVyaWMgY29weSBvZiB0aGUgY3VycmVudCBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBjbG9uZSgpO1xuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9XG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeDJEKHRoaXMpO1xuICAgIH07IC8vIGNsb25lXG5cblx0LyoqQFxuXHQgKiAjLmNvbWJpbmVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBNdWx0aXBsaWVzIHRoaXMgbWF0cml4IHdpdGggYW5vdGhlciwgb3ZlcnJpZGluZyB0aGUgdmFsdWVzIG9mIHRoaXMgbWF0cml4LlxuXHQgKiBUaGUgcGFzc2VkIG1hdHJpeCBpcyBhc3N1bWVkIHRvIGJlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gY29tYmluZShNYXRyaXgyRCk7XG5cdCAqIEBwYXJhbSB7TWF0cml4MkR9IG10cnhSSFxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGFmdGVyIGNvbWJpbmF0aW9uXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5jb21iaW5lID0gZnVuY3Rpb24obXRyeFJIKSB7XG4gICAgICAgIHZhciB0bXAgPSB0aGlzLmE7XG4gICAgICAgIHRoaXMuYSA9IHRtcCAqIG10cnhSSC5hICsgdGhpcy5iICogbXRyeFJILmM7XG4gICAgICAgIHRoaXMuYiA9IHRtcCAqIG10cnhSSC5iICsgdGhpcy5iICogbXRyeFJILmQ7XG4gICAgICAgIHRtcCA9IHRoaXMuYztcbiAgICAgICAgdGhpcy5jID0gdG1wICogbXRyeFJILmEgKyB0aGlzLmQgKiBtdHJ4UkguYztcbiAgICAgICAgdGhpcy5kID0gdG1wICogbXRyeFJILmIgKyB0aGlzLmQgKiBtdHJ4UkguZDtcbiAgICAgICAgdG1wID0gdGhpcy5lO1xuICAgICAgICB0aGlzLmUgPSB0bXAgKiBtdHJ4UkguYSArIHRoaXMuZiAqIG10cnhSSC5jICsgbXRyeFJILmU7XG4gICAgICAgIHRoaXMuZiA9IHRtcCAqIG10cnhSSC5iICsgdGhpcy5mICogbXRyeFJILmQgKyBtdHJ4UkguZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gY29tYmluZVxuXG5cdC8qKkBcblx0ICogIy5lcXVhbHNcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBDaGVja3MgZm9yIHRoZSBudW1lcmljIGVxdWFsaXR5IG9mIHRoaXMgbWF0cml4IHZlcnN1cyBhbm90aGVyLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7Qm9vbGVhbn0gZXF1YWxzKE1hdHJpeDJEKTtcblx0ICogQHBhcmFtIHtNYXRyaXgyRH0gbXRyeFJIXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufSB0cnVlIGlmIHRoZSB0d28gbWF0cmljZXMgYXJlIG51bWVyaWNhbGx5IGVxdWFsXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbihtdHJ4UkgpIHtcbiAgICAgICAgcmV0dXJuIG10cnhSSCBpbnN0YW5jZW9mIE1hdHJpeDJEICYmXG4gICAgICAgICAgICB0aGlzLmEgPT0gbXRyeFJILmEgJiYgdGhpcy5iID09IG10cnhSSC5iICYmIHRoaXMuYyA9PSBtdHJ4UkguYyAmJlxuICAgICAgICAgICAgdGhpcy5kID09IG10cnhSSC5kICYmIHRoaXMuZSA9PSBtdHJ4UkguZSAmJiB0aGlzLmYgPT0gbXRyeFJILmY7XG4gICAgfTsgLy8gZXF1YWxzXG5cblx0LyoqQFxuXHQgKiAjLmRldGVybWluYW50XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgZGV0ZXJtaW5hbnQgb2YgdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge051bWJlcn0gZGV0ZXJtaW5hbnQoKTtcblx0ICogQHJldHVybnMge051bWJlcn0gZGV0KHRoaXMgbWF0cml4KVxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuZGV0ZXJtaW5hbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYSAqIHRoaXMuZCAtIHRoaXMuYiAqIHRoaXMuYztcbiAgICB9OyAvLyBkZXRlcm1pbmFudFxuXG5cdC8qKkBcblx0ICogIy5pbnZlcnRcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBJbnZlcnRzIHRoaXMgbWF0cml4IGlmIHBvc3NpYmxlXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gaW52ZXJ0KCk7XG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBpbnZlcnRlZCBtYXRyaXggb3IgdGhlIG9yaWdpbmFsIG1hdHJpeCBvbiBmYWlsdXJlXG5cdCAqIEBzZWUgLmlzSW52ZXJ0aWJsZVxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkZXQgPSB0aGlzLmRldGVybWluYW50KCk7XG5cbiAgICAgICAgLy8gbWF0cml4IGlzIGludmVydGlibGUgaWYgaXRzIGRldGVybWluYW50IGlzIG5vbi16ZXJvXG4gICAgICAgIGlmIChkZXQgIT09IDApIHtcbiAgICAgICAgICAgIHZhciBvbGQgPSB7XG4gICAgICAgICAgICAgICAgYTogdGhpcy5hLFxuICAgICAgICAgICAgICAgIGI6IHRoaXMuYixcbiAgICAgICAgICAgICAgICBjOiB0aGlzLmMsXG4gICAgICAgICAgICAgICAgZDogdGhpcy5kLFxuICAgICAgICAgICAgICAgIGU6IHRoaXMuZSxcbiAgICAgICAgICAgICAgICBmOiB0aGlzLmZcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmEgPSBvbGQuZCAvIGRldDtcbiAgICAgICAgICAgIHRoaXMuYiA9IC1vbGQuYiAvIGRldDtcbiAgICAgICAgICAgIHRoaXMuYyA9IC1vbGQuYyAvIGRldDtcbiAgICAgICAgICAgIHRoaXMuZCA9IG9sZC5hIC8gZGV0O1xuICAgICAgICAgICAgdGhpcy5lID0gKG9sZC5jICogb2xkLmYgLSBvbGQuZSAqIG9sZC5kKSAvIGRldDtcbiAgICAgICAgICAgIHRoaXMuZiA9IChvbGQuZSAqIG9sZC5iIC0gb2xkLmEgKiBvbGQuZikgLyBkZXQ7XG4gICAgICAgIH0gLy8gaWZcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBpbnZlcnRcblxuXHQvKipAXG5cdCAqICMuaXNJZGVudGl0eVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIG1hdHJpeCBpcyB0aGUgaWRlbnRpdHkgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtCb29sZWFufSBpc0lkZW50aXR5KCk7XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuaXNJZGVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hID09PSAxICYmIHRoaXMuYiA9PT0gMCAmJiB0aGlzLmMgPT09IDAgJiYgdGhpcy5kID09PSAxICYmIHRoaXMuZSA9PT0gMCAmJiB0aGlzLmYgPT09IDA7XG4gICAgfTsgLy8gaXNJZGVudGl0eVxuXG5cdC8qKkBcblx0ICogIy5pc0ludmVydGlibGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBEZXRlcm1pbmVzIGlzIHRoaXMgbWF0cml4IGlzIGludmVydGlibGUuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtCb29sZWFufSBpc0ludmVydGlibGUoKTtcblx0ICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgdGhpcyBtYXRyaXggaXMgaW52ZXJ0aWJsZVxuXHQgKiBAc2VlIC5pbnZlcnRcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmlzSW52ZXJ0aWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXRlcm1pbmFudCgpICE9PSAwO1xuICAgIH07IC8vIGlzSW52ZXJ0aWJsZVxuXG5cdC8qKkBcblx0ICogIy5wcmVSb3RhdGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgY291bnRlci1jbG9ja3dpc2UgcHJlLXJvdGF0aW9uIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gcHJlUm90YXRlKE51bWJlcik7XG5cdCAqIEBwYXJhbSB7bnVtYmVyfSByYWRzIC0gYW5nbGUgdG8gcm90YXRlIGluIHJhZGlhbnNcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBhZnRlciBwcmUtcm90YXRpb25cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnByZVJvdGF0ZSA9IGZ1bmN0aW9uKHJhZHMpIHtcbiAgICAgICAgdmFyIG5Db3MgPSBNYXRoLmNvcyhyYWRzKTtcbiAgICAgICAgdmFyIG5TaW4gPSBNYXRoLnNpbihyYWRzKTtcblxuICAgICAgICB2YXIgdG1wID0gdGhpcy5hO1xuICAgICAgICB0aGlzLmEgPSBuQ29zICogdG1wIC0gblNpbiAqIHRoaXMuYjtcbiAgICAgICAgdGhpcy5iID0gblNpbiAqIHRtcCArIG5Db3MgKiB0aGlzLmI7XG4gICAgICAgIHRtcCA9IHRoaXMuYztcbiAgICAgICAgdGhpcy5jID0gbkNvcyAqIHRtcCAtIG5TaW4gKiB0aGlzLmQ7XG4gICAgICAgIHRoaXMuZCA9IG5TaW4gKiB0bXAgKyBuQ29zICogdGhpcy5kO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHByZVJvdGF0ZVxuXG5cdC8qKkBcblx0ICogIy5wcmVTY2FsZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBwcmUtc2NhbGluZyB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHByZVNjYWxlKE51bWJlclssIE51bWJlcl0pO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gc2NhbGFyWFxuXHQgKiBAcGFyYW0ge051bWJlcn0gW3NjYWxhclldIHNjYWxhclggaXMgdXNlZCBpZiBzY2FsYXJZIGlzIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgYWZ0ZXIgcHJlLXNjYWxpbmdcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnByZVNjYWxlID0gZnVuY3Rpb24oc2NhbGFyWCwgc2NhbGFyWSkge1xuICAgICAgICBpZiAoc2NhbGFyWSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgc2NhbGFyWSA9IHNjYWxhclg7XG5cbiAgICAgICAgdGhpcy5hICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMuYiAqPSBzY2FsYXJZO1xuICAgICAgICB0aGlzLmMgKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy5kICo9IHNjYWxhclk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gcHJlU2NhbGVcblxuXHQvKipAXG5cdCAqICMucHJlVHJhbnNsYXRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIHByZS10cmFuc2xhdGlvbiB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHByZVRyYW5zbGF0ZShWZWN0b3IyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHByZVRyYW5zbGF0ZShOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfFZlY3RvcjJEfSBkeFxuXHQgKiBAcGFyYW0ge051bWJlcn0gZHlcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBhZnRlciBwcmUtdHJhbnNsYXRpb25cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnByZVRyYW5zbGF0ZSA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgICBpZiAodHlwZW9mIGR4ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0aGlzLmUgKz0gZHg7XG4gICAgICAgICAgICB0aGlzLmYgKz0gZHk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmUgKz0gZHgueDtcbiAgICAgICAgICAgIHRoaXMuZiArPSBkeC55O1xuICAgICAgICB9IC8vIGVsc2VcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBwcmVUcmFuc2xhdGVcblxuXHQvKipAXG5cdCAqICMucm90YXRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIGNvdW50ZXItY2xvY2t3aXNlIHBvc3Qtcm90YXRpb24gdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSByb3RhdGUoTnVtYmVyKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHJhZHMgLSBhbmdsZSB0byByb3RhdGUgaW4gcmFkaWFuc1xuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGFmdGVyIHJvdGF0aW9uXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbihyYWRzKSB7XG4gICAgICAgIHZhciBuQ29zID0gTWF0aC5jb3MocmFkcyk7XG4gICAgICAgIHZhciBuU2luID0gTWF0aC5zaW4ocmFkcyk7XG5cbiAgICAgICAgdmFyIHRtcCA9IHRoaXMuYTtcbiAgICAgICAgdGhpcy5hID0gbkNvcyAqIHRtcCAtIG5TaW4gKiB0aGlzLmI7XG4gICAgICAgIHRoaXMuYiA9IG5TaW4gKiB0bXAgKyBuQ29zICogdGhpcy5iO1xuICAgICAgICB0bXAgPSB0aGlzLmM7XG4gICAgICAgIHRoaXMuYyA9IG5Db3MgKiB0bXAgLSBuU2luICogdGhpcy5kO1xuICAgICAgICB0aGlzLmQgPSBuU2luICogdG1wICsgbkNvcyAqIHRoaXMuZDtcbiAgICAgICAgdG1wID0gdGhpcy5lO1xuICAgICAgICB0aGlzLmUgPSBuQ29zICogdG1wIC0gblNpbiAqIHRoaXMuZjtcbiAgICAgICAgdGhpcy5mID0gblNpbiAqIHRtcCArIG5Db3MgKiB0aGlzLmY7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gcm90YXRlXG5cblx0LyoqQFxuXHQgKiAjLnNjYWxlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIHBvc3Qtc2NhbGluZyB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHNjYWxlKE51bWJlclssIE51bWJlcl0pO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gc2NhbGFyWFxuXHQgKiBAcGFyYW0ge051bWJlcn0gW3NjYWxhclldIHNjYWxhclggaXMgdXNlZCBpZiBzY2FsYXJZIGlzIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgYWZ0ZXIgcG9zdC1zY2FsaW5nXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxhclgsIHNjYWxhclkpIHtcbiAgICAgICAgaWYgKHNjYWxhclkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHNjYWxhclkgPSBzY2FsYXJYO1xuXG4gICAgICAgIHRoaXMuYSAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLmIgKj0gc2NhbGFyWTtcbiAgICAgICAgdGhpcy5jICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMuZCAqPSBzY2FsYXJZO1xuICAgICAgICB0aGlzLmUgKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy5mICo9IHNjYWxhclk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc2NhbGVcblxuXHQvKipAXG5cdCAqICMuc2V0VmFsdWVzXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogU2V0cyB0aGUgdmFsdWVzIG9mIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gc2V0VmFsdWVzKE1hdHJpeDJEKTtcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gc2V0VmFsdWVzKE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge01hdHJpeDJEfE51bWJlcn0gYVxuXHQgKiBAcGFyYW0ge051bWJlcn0gYlxuXHQgKiBAcGFyYW0ge051bWJlcn0gY1xuXHQgKiBAcGFyYW0ge051bWJlcn0gZFxuXHQgKiBAcGFyYW0ge051bWJlcn0gZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZlxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGNvbnRhaW5pbmcgdGhlIG5ldyB2YWx1ZXNcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnNldFZhbHVlcyA9IGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgICAgICAgaWYgKGEgaW5zdGFuY2VvZiBNYXRyaXgyRCkge1xuICAgICAgICAgICAgdGhpcy5hID0gYS5hO1xuICAgICAgICAgICAgdGhpcy5iID0gYS5iO1xuICAgICAgICAgICAgdGhpcy5jID0gYS5jO1xuICAgICAgICAgICAgdGhpcy5kID0gYS5kO1xuICAgICAgICAgICAgdGhpcy5lID0gYS5lO1xuICAgICAgICAgICAgdGhpcy5mID0gYS5mO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hID0gYTtcbiAgICAgICAgICAgIHRoaXMuYiA9IGI7XG4gICAgICAgICAgICB0aGlzLmMgPSBjO1xuICAgICAgICAgICAgdGhpcy5kID0gZDtcbiAgICAgICAgICAgIHRoaXMuZSA9IGU7XG4gICAgICAgICAgICB0aGlzLmYgPSBmO1xuICAgICAgICB9IC8vIGVsc2VcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzZXRWYWx1ZXNcblxuXHQvKipAXG5cdCAqICMudG9TdHJpbmdcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBSZXR1cm5zIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBtYXRyaXguXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtTdHJpbmd9IHRvU3RyaW5nKCk7XG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9XG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJNYXRyaXgyRChbXCIgKyB0aGlzLmEgKyBcIiwgXCIgKyB0aGlzLmMgKyBcIiwgXCIgKyB0aGlzLmUgK1xuICAgICAgICAgICAgXCJdIFtcIiArIHRoaXMuYiArIFwiLCBcIiArIHRoaXMuZCArIFwiLCBcIiArIHRoaXMuZiArIFwiXSBbMCwgMCwgMV0pXCI7XG4gICAgfTsgLy8gdG9TdHJpbmdcblxuXHQvKipAXG5cdCAqICMudHJhbnNsYXRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIHBvc3QtdHJhbnNsYXRpb24gdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSB0cmFuc2xhdGUoVmVjdG9yMkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSB0cmFuc2xhdGUoTnVtYmVyLCBOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge051bWJlcnxWZWN0b3IyRH0gZHhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGR5XG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggYWZ0ZXIgcG9zdC10cmFuc2xhdGlvblxuXHQgKi9cblx0TWF0cml4MkQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcblx0XHRpZiAodHlwZW9mIGR4ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHR0aGlzLmUgKz0gdGhpcy5hICogZHggKyB0aGlzLmMgKiBkeTtcblx0XHRcdHRoaXMuZiArPSB0aGlzLmIgKiBkeCArIHRoaXMuZCAqIGR5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmUgKz0gdGhpcy5hICogZHgueCArIHRoaXMuYyAqIGR4Lnk7XG5cdFx0XHR0aGlzLmYgKz0gdGhpcy5iICogZHgueCArIHRoaXMuZCAqIGR4Lnk7XG5cdFx0fSAvLyBlbHNlXG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSAvLyB0cmFuc2xhdGVcblxuXHRyZXR1cm4gTWF0cml4MkQ7XG59KSgpO1xuXG4vKipAXG4qICNDcmFmdHkgVGltZVxuKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4qL1xuQ3JhZnR5LmMoXCJEZWxheVwiLCB7XG5cdGluaXQgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9kZWxheXMgPSBbXTtcblx0XHR0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0Zm9yKHZhciBpbmRleCBpbiB0aGlzLl9kZWxheXMpIHtcblx0XHRcdFx0dmFyIGl0ZW0gPSB0aGlzLl9kZWxheXNbaW5kZXhdO1xuXHRcdFx0XHRpZighaXRlbS50cmlnZ2VyZWQgJiYgaXRlbS5zdGFydCArIGl0ZW0uZGVsYXkgKyBpdGVtLnBhdXNlIDwgbm93KSB7XG5cdFx0XHRcdFx0aXRlbS50cmlnZ2VyZWQ9dHJ1ZTtcblx0XHRcdFx0XHRpdGVtLmZ1bmMuY2FsbCh0aGlzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYmluZChcIlBhdXNlXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0Zm9yKHZhciBpbmRleCBpbiB0aGlzLl9kZWxheXMpIHtcblx0XHRcdFx0dGhpcy5fZGVsYXlzW2luZGV4XS5wYXVzZUJ1ZmZlciA9IG5vdztcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmJpbmQoXCJVbnBhdXNlXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0Zm9yKHZhciBpbmRleCBpbiB0aGlzLl9kZWxheXMpIHtcblx0XHRcdFx0dmFyIGl0ZW0gPSB0aGlzLl9kZWxheXNbaW5kZXhdO1xuXHRcdFx0XHRpdGVtLnBhdXNlICs9IG5vdy1pdGVtLnBhdXNlQnVmZmVyO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuICAgIC8qKkBcblx0KiAjLmRlbGF5XG5cdCogQGNvbXAgQ3JhZnR5IFRpbWVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcy5kZWxheShGdW5jdGlvbiBjYWxsYmFjaywgTnVtYmVyIGRlbGF5KVxuXHQqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIGFmdGVyIGdpdmVuIGFtb3VudCBvZiBtaWxsaXNlY29uZHNcblx0KiBAcGFyYW0gZGVsYXkgLSBBbW91bnQgb2YgbWlsbGlzZWNvbmRzIHRvIGV4ZWN1dGUgdGhlIG1ldGhvZFxuXHQqIFxuXHQqIFRoZSBkZWxheSBtZXRob2Qgd2lsbCBleGVjdXRlIGEgZnVuY3Rpb24gYWZ0ZXIgYSBnaXZlbiBhbW91bnQgb2YgdGltZSBpbiBtaWxsaXNlY29uZHMuXG5cdCogXG5cdCogSXQgaXMgbm90IGEgd3JhcHBlciBmb3IgYHNldFRpbWVvdXRgLlxuXHQqIFxuXHQqIElmIENyYWZ0eSBpcyBwYXVzZWQsIHRoZSBkZWxheSBpcyBpbnRlcnJ1cHRlZCB3aXRoIHRoZSBwYXVzZSBhbmQgdGhlbiByZXN1bWUgd2hlbiB1bnBhdXNlZFxuXHQqXG5cdCogSWYgdGhlIGVudGl0eSBpcyBkZXN0cm95ZWQsIHRoZSBkZWxheSBpcyBhbHNvIGRlc3Ryb3llZCBhbmQgd2lsbCBub3QgaGF2ZSBlZmZlY3QuIFxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBjb25zb2xlLmxvZyhcInN0YXJ0XCIpO1xuXHQqIHRoaXMuZGVsYXkoZnVuY3Rpb24oKSB7XG5cdCAgICAgY29uc29sZS5sb2coXCIxMDBtcyBsYXRlclwiKTtcblx0KiB9LCAxMDApO1xuXHQqIH5+flxuXHQqL1xuXHRkZWxheSA6IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RlbGF5cy5wdXNoKHtcblx0XHRcdHN0YXJ0IDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHRmdW5jIDogZnVuYyxcblx0XHRcdGRlbGF5IDogZGVsYXksXG5cdFx0XHR0cmlnZ2VyZWQgOiBmYWxzZSxcblx0XHRcdHBhdXNlQnVmZmVyOiAwLFxuXHRcdFx0cGF1c2U6IDBcblx0XHR9KTtcblx0fVxufSk7XG5cbn0pO1xuXG59KSgpIiwiIFxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5leHBvcnRzLkZQUyA9IGZ1bmN0aW9uKCBlbCwgbWF4VmFsdWUgKVxue1xuICB2YXIgZnBzID0gQ3JhZnR5LmUoICcyRCwgQ2FudmFzLCBGUFMnICk7XG4gIGZwcy5hdHRyKCB7IG1heFZhbHVlOiBtYXhWYWx1ZSB9IClcbiAgQ3JhZnR5LmJpbmQoICdNZXNzdXJlRlBTJywgZnVuY3Rpb24oIGZwcyApIHtcbiAgICBlbC5pbm5lckhUTUwgPSBmcHMudmFsdWU7XG4gIH0gKTtcbn07IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5JyksXG4gICAgY2xpZW50ID0gcmVxdWlyZSgnLi9jbGllbnQnKTtcblxucmVxdWlyZSgnLi9xdWV1ZScpO1xuXG5DcmFmdHkuc2NlbmUoJ0xvYWRpbmcnLCBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZHVsZXMgPSB7XG4gICAgICBTaGFwZTogJ1JFTEVBU0UnLFxuICAgICAgTW91c2VGYWNlOiAnUkVMRUFTRSdcbiAgICB9LFxuICAgIGkgPSAyO1xuXG4gIENyYWZ0eS5tb2R1bGVzKG1vZHVsZXMsIGRvbmUpO1xuICBjbGllbnQuY29ubmVjdChkb25lKTtcblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIGlmKC0taSA9PT0gMCkge1xuICAgICAgQ3JhZnR5LnNjZW5lKCdRdWV1ZScpO1xuICAgIH1cbiAgfVxufSk7IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbkNyYWZ0eS5jKCdBY3RvcicsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnMkQsIENhbnZhcywgU29saWQnKTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgaGVhbHRoOiAxMDBcbiAgICB9KTtcbiAgICB0aGlzLmJpbmQoJ1Byb2plY3RpbGVIaXQnLCB0aGlzLl93YXNIaXQpO1xuICAgIHRoaXMuYmluZCgnRGllJywgdGhpcy5kaWUpO1xuICB9LFxuXG4gIGRpZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kZXN0cm95KCk7XG4gIH0sXG4gIFxuICBzdG9wT25Tb2xpZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbkhpdCgnU29saWQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3RvcE1vdmVtZW50KCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIFxuICBzdG9wTW92ZW1lbnQ6IGZ1bmN0aW9uKGxhc3RQb3NpdGlvbikge1xuICAgIHRoaXMuX3NwZWVkID0gMDtcbiAgICBpZihsYXN0UG9zaXRpb24pIHtcbiAgICAgIHRoaXMueCA9IGxhc3RQb3NpdGlvbi54O1xuICAgICAgdGhpcy55ID0gbGFzdFBvc2l0aW9uLnk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX21vdmVtZW50KSB7XG4gICAgICB0aGlzLnggLT0gdGhpcy5fbW92ZW1lbnQueDtcbiAgICAgIHRoaXMueSAtPSB0aGlzLl9tb3ZlbWVudC55O1xuICAgIH1cbiAgfSxcblxuICBfd2FzSGl0OiBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBuZXdIZWFsdGggPSB0aGlzLmhlYWx0aCAtIGV2ZW50LnByb2plY3RpbGUuZGFtYWdlcztcbiAgICB0aGlzLmF0dHIoJ2hlYWx0aCcsIG5ld0hlYWx0aCk7XG4gICAgdGhpcy50cmlnZ2VyKCdXb3VuZCcsIHsgaGVhbHRoOiBuZXdIZWFsdGgsIGRhbWFnZXM6IGV2ZW50LnByb2plY3RpbGUuZGFtYWdlcyB9KTtcbiAgICBpZiggbmV3SGVhbHRoIDw9IDAgKSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ0RpZScpO1xuICAgIH1cbiAgfVxufSApOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCAnLi9zaGlwJyApO1xucmVxdWlyZSggJy4vYm91bmRlZCcgKTtcbnJlcXVpcmUoICcuL21vdXNlc2hvb3RlcicgKTtcblxuQ3JhZnR5LmMoJ1BsYXllclNoaXAnLCB7XG4gIG5hbWU6ICdQbGF5ZXJTaGlwJyxcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnU2hpcCwgQm91bmRlZCwgTW91c2VTaG9vdGVyLCBGb3Vyd2F5LCBNb3VzZUZhY2UnKTtcbiAgICB0aGlzLmZvdXJ3YXkoNCk7XG4gICAgdGhpcy5zdG9wT25Tb2xpZCgpO1xuICAgIHRoaXMuTW91c2VGYWNlKHt4OiAwLCB5OiAwfSk7XG5cbiAgICB0aGlzLmJpbmQoJ01vdXNlTW92ZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICB0aGlzLm9yaWdpbignY2VudGVyJyk7XG4gICAgICB0aGlzLmN1ckFuZ2xlID0gZS5ncmFkICsgOTA7XG4gICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5jdXJBbmdsZTtcbiAgICB9KTtcblxuICAgIHRoaXMuYmluZCgnU3RhcnRTaG9vdGluZycsIHRoaXMuX3Nob290KTtcbiAgICB0aGlzLmJpbmQoJ0hpdEJvdW5kcycsIHRoaXMuc3RvcE1vdmVtZW50KTtcbiAgICB0aGlzLmJpbmQoJ0RpZScsIGZ1bmN0aW9uKCkge1xuICAgICAgQ3JhZnR5LnRyaWdnZXIoJ0Rlc3Ryb3lTaGlwJyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZ286IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2VuZFVwZGF0ZSgpO1xuICB9LFxuXG4gIHNlbmRVcGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIENyYWZ0eS50cmlnZ2VyKCdVcGRhdGVTaGlwJywgdGhpcy5zZXJpYWxpemUoKSk7XG4gICAgICB0aGlzLnNlbmRVcGRhdGUoKTtcbiAgICB9LCAxMCk7XG4gIH1cblxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbkNyYWZ0eS5jKCdIZWFsdGgnLCB7XG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnMkQsIENhbnZhcywgQ29sb3InKTtcbiAgICB0aGlzLmNvbG9yKCdncmVlbicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGhlYWx0aDogZnVuY3Rpb24oYWN0b3IpIHtcbiAgICB0aGlzLmF0dHIoJ2hlYWx0aFdpZHRoJywgTWF0aC5tYXgoKGFjdG9yLnJhZGl1cykgPyAyICogYWN0b3IucmFkaXVzIDogYWN0b3IudywgMzApKTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgbWF4SGVhbHRoOiBhY3Rvci5oZWFsdGgsXG4gICAgICB3OiB0aGlzLmhlYWx0aFdpZHRoLFxuICAgICAgaDogNCxcbiAgICAgIHg6IGFjdG9yLngsXG4gICAgICB5OiBhY3Rvci55IC0gMjBcbiAgICB9KTtcbiAgICBhY3Rvci5iaW5kKCdDaGFuZ2UnLCB0aGlzLl91cGRhdGVIZWFsdGguYmluZCh0aGlzKSk7XG4gICAgYWN0b3IuYmluZCgnTW92ZWQnLCB0aGlzLl91cGRhdGVIZWFsdGguYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fdXBkYXRlSGVhbHRoKHtoZWFsdGg6IGFjdG9yLmhlYWx0aCwgeDogYWN0b3IueCwgeTogYWN0b3IueX0pO1xuICB9LFxuXG4gIF91cGRhdGVIZWFsdGg6IGZ1bmN0aW9uKHByb3BzKSB7XG4gICAgaWYoIXByb3BzKSByZXR1cm47XG4gICAgaWYoJ2hlYWx0aCcgaW4gcHJvcHMpIHtcbiAgICAgIHRoaXMuYXR0cigndycsIE1hdGguZmxvb3IoKHByb3BzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoKSAqIHRoaXMuaGVhbHRoV2lkdGgpKTtcbiAgICB9XG4gICAgaWYoJ3gnIGluIHByb3BzKSB7XG4gICAgICB0aGlzLmF0dHIoJ3gnLCBwcm9wcy54KTtcbiAgICB9XG4gICAgaWYoJ3knIGluIHByb3BzKSB7XG4gICAgICB0aGlzLmF0dHIoJ3knLCBwcm9wcy55IC0gMjApO1xuICAgIH1cbiAgfVxuXG59KTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxuQ3JhZnR5LmMoJ1BsYW5ldCcsIHtcbiAgbmFtZTogJ1BsYW5ldCcsXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJ0FjdG9yLCBTaGFwZSwgU29saWQsIENvbG9yLCBDb2xsaXNpb24sIFRpbnQnKTtcbiAgICB0aGlzLm9yaWdpbignY2VudGVyJyk7XG4gICAgdGhpcy5jaXJjbGUoNTApO1xuICAgIHRoaXMuY29sb3IoJ3doaXRlJyk7XG4gICAgdGhpcy5iaW5kKCdQcm9qZWN0aWxlSGl0JywgdGhpcy5fcGxhbmV0V2FzSGl0KTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgaGVhbHRoOiAyMDBcbiAgICB9KTtcbiAgfSxcblxuICBwdWxzYXRlOiBmdW5jdGlvbihjb2xvcikge1xuICAgIHRoaXMudGludChjb2xvciwgMC41KTtcbiAgICB0aGlzLnRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNvbG9yKCd3aGl0ZScpO1xuICAgIH0uYmluZCh0aGlzKSwgMjAwKTtcbiAgfSxcblxuICBfcGxhbmV0V2FzSGl0OiBmdW5jdGlvbihldmVudCkge1xuICAgIHRoaXMucHVsc2F0ZSgncmVkJyk7XG4gIH1cblxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoJy4vcHJvamVjdGlsZScpO1xuXG5DcmFmdHkuYygnU2F0ZWxsaXRlJywge1xuICBuYW1lOiAnU2F0ZWxsaXRlJyxcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnQWN0b3IsIFNvbGlkLCBQcm9qZWN0aWxlLCBDb2xvcicpO1xuICAgIHRoaXMuYmluZCgnSW5Cb3VuZHMnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ29tcG9uZW50KCdPZmZzY3JlZW4nKTtcbiAgICAgIHRoaXMuYWRkQ29tcG9uZW50KCdCb3VuZGVkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5jb2xvcignI0I3MDAxMScpO1xuICAgIHRoaXMuYmluZCgnSGl0Qm91bmRzJywgdGhpcy5kZXN0cm95KTtcbiAgICB0aGlzLmJpbmQoJ0hpdE9iamVjdCcsIHRoaXMuZGVzdHJveSk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIGhlYWx0aDogMixcbiAgICAgIGRhbWFnZXM6IDEwLFxuICAgICAgc3BlZWQ6IDNcbiAgICB9KTtcbiAgfSxcbiAgZ286IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0KENyYWZ0eSgnUGxhbmV0JykpO1xuICB9XG59ICk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKSxcbiAgICBjb25uZWN0ID0gcmVxdWlyZSgnLi9zb2NrZXQnKSxcbiAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxucmVxdWlyZSgnLi9uZXRzaGlwJyk7XG5yZXF1aXJlKCcuL3NhdGVsbGl0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaWQ6IG51bGwsXG4gIHNvY2tldDogbnVsbCxcblxuICBjb25uZWN0OiBmdW5jdGlvbihjYikge1xuICAgIGNvbm5lY3QoKGZ1bmN0aW9uKHdzKSB7XG4gICAgICB0aGlzLnNvY2tldCA9IHdzO1xuICAgICAgd3Mub25tZXNzYWdlID0gdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgY2IgJiYgY2Iod3MpO1xuICAgIH0pLmJpbmQodGhpcykpO1xuICB9LFxuXG4gIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xuICAgIENyYWZ0eS5iaW5kKCdSZWFkeScsIHRoaXMuY2FsbE1ldGhvZCgncmVhZHknKSk7XG4gICAgQ3JhZnR5LmJpbmQoJ0dhbWVPdmVyJywgdGhpcy5jYWxsTWV0aG9kKCdnYW1lT3ZlcicpKTtcbiAgICBDcmFmdHkuYmluZCgnVXBkYXRlU2hpcCcsIGZ1bmN0aW9uKHNoaXApIHtcbiAgICAgIHRoaXMuY2FsbE1ldGhvZCgndXBkYXRlU2hpcCcsIHNoaXApKCk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICBDcmFmdHkuYmluZCgnRGVzdHJveVNoaXAnLCB0aGlzLmNhbGxNZXRob2QoJ2Rlc3Ryb3lTaGlwJykpO1xuICB9LFxuXG4gIGNhbGxNZXRob2Q6IGZ1bmN0aW9uKG1ldGhvZCAvKiwgcGFyYW1zLi4uICovKSB7XG4gICAgdmFyIHBhcmFtcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgfSkpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgfSxcblxuICBvbk1lc3NhZ2U6IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcbiAgICBpZighZGF0YSB8fCAhZGF0YS5tZXRob2QgfHzCoCF0aGlzW2RhdGEubWV0aG9kXSkge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IGNhbm5vdCBjYWxsIG1ldGhvZDogJywgZGF0YSAmJiBkYXRhLm1ldGhvZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXNbZGF0YS5tZXRob2RdLmFwcGx5KHRoaXMsZGF0YS5wYXJhbXMpO1xuICB9LFxuXG4gIHNldElEOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfSxcblxuICBzaGlwczoge30sXG5cbiAgdXBkYXRlU2hpcDogZnVuY3Rpb24oaWQsIGF0dHIpIHtcbiAgICBpZihpZCA9PT0gdGhpcy5pZCkgcmV0dXJuO1xuICAgIGlmKCF0aGlzLnNoaXBzW2lkXSkge1xuICAgICAgdGhpcy5zaGlwc1tpZF0gPSBDcmFmdHkuZSgnTmV0U2hpcCcpO1xuICAgIH1cbiAgICB0aGlzLnNoaXBzW2lkXS5hdHRyKGF0dHIpO1xuICB9LFxuXG4gIGRlc3Ryb3lTaGlwOiBmdW5jdGlvbihpZCkge1xuICAgIGlmKGlkID09PSB0aGlzLmlkKSByZXR1cm47XG4gICAgdGhpcy5zaGlwc1tpZF0gJiYgdGhpcy5zaGlwc1tpZF0uZGVzdHJveSgpO1xuICAgIGRlbGV0ZSB0aGlzLnNoaXBzW2lkXTtcbiAgfSxcblxuICBzcGF3bjogZnVuY3Rpb24odHlwZSwgYXR0cikge1xuICAgIHZhciBvYmogPSBDcmFmdHkuZSh0eXBlKTtcbiAgICBvYmouYXR0cihhdHRyIHx8wqB7fSk7XG4gICAgaWYgKHR5cGVvZiBvYmouZ28gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2JqLmdvKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgcGxheTogZnVuY3Rpb24oKSB7XG4gICAgQ3JhZnR5LnNjZW5lKCdHYW1lJyk7XG4gIH1cbn07XG5cbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5DcmFmdHkuc2NlbmUoJ1F1ZXVlJywgZnVuY3Rpb24oKSB7XG4gIENyYWZ0eS5lKCcyRCwgRE9NLCBUZXh0JylcbiAgICAuYXR0cih7eDogQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMiAtIDE2MCwgeTogQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIgLSAxMCwgdzogMzIwLCBoOiAyMH0pXG4gICAgLnRleHQoJ1ByZXNzIHNwYWNlIHdoZW4geW91XFwncmUgcmVhZHkuLi4nKVxuICAgIC5iaW5kKCdLZXlEb3duJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYoZS5rZXkgIT09IENyYWZ0eS5rZXlzLlNQQUNFKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMudGV4dCgnV2FpdGluZyBmb3Igb3RoZXJzLi4uJyk7XG4gICAgICBDcmFmdHkudHJpZ2dlcignUmVhZHknKTtcbiAgICB9KTtcbn0pOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCAnLi9ib3VuZGVkJyApO1xuXG5DcmFmdHkuYygnU2hpcCcsIHtcbiAgbmFtZTogJ1NoaXAnLFxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdBY3RvciwgQ29sb3IsIFNob290ZXIsIENvbGxpc2lvbicpO1xuICAgIHRoaXMuYXR0cih7XG4gICAgICB3OiAxMCxcbiAgICAgIGg6IDIwLFxuICAgICAgeDogMTAwLFxuICAgICAgeTogMTAwLFxuICAgICAgZGFtYWdlczogMTAsXG4gICAgICBjdXJBbmdsZTogMFxuICAgIH0pO1xuICAgIHRoaXMuY29sb3IoJ3doaXRlJyk7XG5cbiAgICB0aGlzLmJpbmQoJ0NoYW5nZScsIGZ1bmN0aW9uKHByb3BzKSB7XG4gICAgICBpZihwcm9wcy5pc1Nob290aW5nKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignU3RhcnRTaG9vdGluZycpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX3Nob290KCk7XG4gICAgdGhpcy5iaW5kKCdIaXRCb3VuZHMnLCB0aGlzLnN0b3BNb3ZlbWVudCk7XG4gIH0sXG5cbiAgc2VyaWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogdGhpcy54LFxuICAgICAgeTogdGhpcy55LFxuICAgICAgcm90YXRpb246IHRoaXMucm90YXRpb24sXG4gICAgICBfZGlyQW5nbGU6IHRoaXMuX2RpckFuZ2xlLFxuICAgICAgaGVhbHRoOiB0aGlzLmhlYWx0aCxcbiAgICAgIGlzU2hvb3Rpbmc6IHRoaXMuaXNTaG9vdGluZyxcbiAgICAgIG9yaWdpbjogdGhpcy5vcmlnaW5cbiAgICB9O1xuICB9LFxuXG4gIF9zaG9vdDogZnVuY3Rpb24oKVxuICB7XG4gICAgdGhpcy50aW1lb3V0KHRoaXMuX3Nob290LCAxMjApO1xuICAgIGlmKCF0aGlzLmlzU2hvb3RpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zaG9vdCh0aGlzLl9kaXJBbmdsZSArIE1hdGguUEksIDUpO1xuICB9XG59ICk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxuQ3JhZnR5LmMoJ0JvdW5kZWQnLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJELCBDYW52YXMnKTtcbiAgICB0aGlzLl9sYXN0SW5Cb3VuZHNQb3NpdGlvbiA9IG51bGw7XG4gICAgdGhpcy5iaW5kKCdFbnRlckZyYW1lJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZih0aGlzLmlzT3V0T2ZCb3VuZHMoKSkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ0hpdEJvdW5kcycsIHRoaXMuX2xhc3RJbkJvdW5kc1Bvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2xhc3RJbkJvdW5kc1Bvc2l0aW9uID0ge1xuICAgICAgICAgIHg6IHRoaXMueCxcbiAgICAgICAgICB5OiB0aGlzLnlcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgaXNPdXRPZkJvdW5kczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueCArIHRoaXMudyA+IENyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy54IC0gMTAgPCAtQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMiB8fFxuICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmggPiBDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMiB8fFxuICAgICAgICAgICB0aGlzLnkgLSAxMCA8IC1DcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMjtcbiAgfVxufSApOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCcuL3Nob290ZXInKTtcblxuQ3JhZnR5LmMoJ01vdXNlU2hvb3RlcicsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnU2hvb3RlcicpO1xuICAgIHRoaXMuYmluZCgnTW91c2VEb3duJywgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmF0dHIoJ2lzU2hvb3RpbmcnLCB0cnVlKTtcbiAgICAgIHRoaXMudHJpZ2dlcignU3RhcnRTaG9vdGluZycpO1xuICAgIH0pO1xuICAgIHRoaXMuYmluZCgnTW91c2VVcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5hdHRyKCdpc1Nob290aW5nJywgZmFsc2UpO1xuICAgICAgdGhpcy50cmlnZ2VyKCdTdG9wU2hvb3RpbmcnKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9vZmZzY3JlZW4nKTtcblxuQ3JhZnR5LmMoJ1Byb2plY3RpbGUnLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJELCBDYW52YXMsIE9mZnNjcmVlbiwgQ29sbGlzaW9uJyk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIHc6IDIwLFxuICAgICAgaDogMjAsXG4gICAgICBzcGVlZDogMyxcbiAgICAgIGRhbWFnZXM6IDEwXG4gICAgfSk7XG4gICAgdGhpcy5iaW5kKCdFbnRlckZyYW1lJywgdGhpcy5fZW50ZXJlZEZyYW1lKTtcbiAgICB0aGlzLm9uSGl0KCdTb2xpZCcsIHRoaXMuX2hpdE9iamVjdCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgcHJvamVjdGlsZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmKG9wdGlvbnMuYXR0cikge1xuICAgICAgdGhpcy5hdHRyKG9wdGlvbnMuYXR0cik7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuY29sb3IpIHtcbiAgICAgIHRoaXMuY29sb3Iob3B0aW9ucy5jb2xvcik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHRhcmdldDogZnVuY3Rpb24oZW50aXR5KSB7XG4gICAgICB2YXIgcG9zID0gbmV3IENyYWZ0eS5tYXRoLlZlY3RvcjJEKHRoaXMueCwgdGhpcy55KSxcbiAgICAgICAgICB0YXJnZXQgPSBuZXcgQ3JhZnR5Lm1hdGguVmVjdG9yMkQoZW50aXR5LngsIGVudGl0eS55KSxcbiAgICAgICAgICBhbmdsZSA9IHBvcy5hbmdsZVRvKHRhcmdldCk7XG4gICAgICB0aGlzLmF0dHIoJ2FuZ2xlJywgYW5nbGUpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgX2VudGVyZWRGcmFtZTogZnVuY3Rpb24oZnJhbWUpIHtcbiAgICB0aGlzLnggKz0gTWF0aC5jb3ModGhpcy5hbmdsZSkgKiB0aGlzLnNwZWVkO1xuICAgIHRoaXMueSArPSBNYXRoLnNpbih0aGlzLmFuZ2xlKSAqIHRoaXMuc3BlZWQ7XG4gIH0sXG5cbiAgX2hpdE9iamVjdDogZnVuY3Rpb24oZXZlbnRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmKCFldmVudHMubGVuZ3RoKSByZXR1cm47XG4gICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGV2ZW50Lm9iai50cmlnZ2VyKCdQcm9qZWN0aWxlSGl0JywgeyBwcm9qZWN0aWxlOiBzZWxmIH0pO1xuICAgICAgc2VsZi50cmlnZ2VyKCdIaXRPYmplY3QnLCB7IG9iamVjdDogZXZlbnQub2JqIH0pO1xuICAgIH0pO1xuICB9LFxufSApO1xuIiwiXG52YXIgc29ja2V0U3RhdGUgPSB7XG4gIHNvY2tldDogbnVsbCxcbiAgb3BlbmVkOiBmYWxzZSxcbiAgY29ubmVjdDogZnVuY3Rpb24oY2IpIHtcbiAgICBpZighdGhpcy5vcGVuZWQpIHtcbiAgICAgIHRoaXMuc29ja2V0ID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8nICsgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICsgJzo4MDgwJyk7XG4gICAgICB0aGlzLnNvY2tldC5vbm9wZW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgY2IgJiYgY2IodGhpcy5zb2NrZXQpO1xuICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNvY2tldFN0YXRlLmNvbm5lY3QuYmluZChzb2NrZXRTdGF0ZSk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9zaGlwJyk7XG5cbkNyYWZ0eS5jKCdOZXRTaGlwJywge1xuICBuYW1lOiAnTmV0U2hpcCcsXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJ1NoaXAsIEJvdW5kZWQnKTtcbiAgfVxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoJy4vYnVsbGV0Jyk7XG5cbkNyYWZ0eS5jKCdTaG9vdGVyJywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCcyRCcpO1xuICAgIHRoaXMuYXR0cih7XG4gICAgICBpc1Nob290aW5nOiBmYWxzZVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvb3Q6IGZ1bmN0aW9uKGFuZ2xlLCBzcGVlZCkge1xuICAgIENyYWZ0eS5lKCdCdWxsZXQnKS5idWxsZXQoe1xuICAgICAgYXR0cjoge1xuICAgICAgICB4OiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiBNYXRoLm1heCh0aGlzLncsIHRoaXMuaCksXG4gICAgICAgIHk6IHRoaXMueSArIE1hdGguc2luKGFuZ2xlKSAqIE1hdGgubWF4KHRoaXMudywgdGhpcy5oKSxcbiAgICAgICAgYW5nbGU6IGFuZ2xlLFxuICAgICAgICBzcGVlZDogc3BlZWQgfHzCoDVcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKSxcbiAgICBzaGFyZWQgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQnKTtcblxuQ3JhZnR5LmMoJ09mZnNjcmVlbicsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnMkQsIENhbnZhcycpO1xuICAgIHRoaXMuYmluZCgnTW92ZWQnLCBmdW5jdGlvbihmcm9tKSB7XG4gICAgICBpZih0aGlzLmlzSW5Cb3VuZHMoKSkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ0luQm91bmRzJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgb2Zmc2NyZWVuOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcG9zID0gdGhpcy5yYW5kb21PZmZzY3JlZW5Db29yZGluYXRlcygpO1xuICAgIHRoaXMueCA9IHBvcy54O1xuICAgIHRoaXMueSA9IHBvcy55O1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGlzSW5Cb3VuZHM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnggKyB0aGlzLncgPCBDcmFmdHkudmlld3BvcnQud2lkdGggLyAyIHx8XG4gICAgICAgICAgIHRoaXMueCAtIDEwID4gLUNyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oIDwgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy55IC0gMTAgPiAtQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDI7XG4gIH0sXG5cbiAgcmFuZG9tT2Zmc2NyZWVuQ29vcmRpbmF0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzaGFyZWQucmFuZG9tT2Zmc2NyZWVuQ29vcmRpbmF0ZXMoQ3JhZnR5LnZpZXdwb3J0LCB0aGlzKTtcbiAgfVxufSApO1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICByYW5kb21PZmZzY3JlZW5Db29yZGluYXRlczogZnVuY3Rpb24odmlld3BvcnQsIHNpemUpIHtcbiAgICB2YXIgYW5nbGUgPSBNYXRoLnJhbmRvbSgpICogMiAqIE1hdGguUEksXG4gICAgICAgIHJhZGl1cyA9IE1hdGgubWF4KHZpZXdwb3J0LndpZHRoIC8gMiwgdmlld3BvcnQuaGVpZ2h0IC8gMilcbiAgICAgICAgICAgICAgICsgTWF0aC5tYXgoc2l6ZS53LCBzaXplLmgpO1xuICAgIHJldHVybiB7XG4gICAgICB4OiByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksXG4gICAgICB5OiByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSlcbiAgICB9O1xuICB9XG5cbn07IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoJy4vYm91bmRlZCcpO1xuXG5DcmFmdHkuYygnQnVsbGV0Jywge1xuXG4gIGJ1bGxldDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmKG9wdGlvbnMuYXR0cikge1xuICAgICAgdGhpcy5hdHRyKG9wdGlvbnMuYXR0cik7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuZW1pdHRlcikge1xuICAgICAgdGhpcy5lbWl0dGVyID0gb3B0aW9ucy5lbWl0dGVyO1xuICAgIH1cbiAgICBpZihvcHRpb25zLmNvbG9yKSB7XG4gICAgICB0aGlzLmNvbG9yKG9wdGlvbnMuY29sb3IpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdQcm9qZWN0aWxlLCBDb2xvcicpO1xuICAgIHRoaXMuY29sb3IoJyM2RkIyRkYnKTtcbiAgICB0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCB0aGlzLl9lbnRlcmVkRnJhbWUpO1xuICAgIHRoaXMuYmluZCgnSGl0Qm91bmRzJywgdGhpcy5kZXN0cm95KTtcbiAgICB0aGlzLmJpbmQoJ0hpdE9iamVjdCcsIHRoaXMuZGVzdHJveSk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIHc6IDMsXG4gICAgICBoOiAzLFxuICAgICAgc3BlZWQ6IDUsXG4gICAgICBkYW1hZ2VzOiAxXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxufSk7Il19
;