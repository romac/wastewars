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
    i = 4;

  Crafty.modules(modules, done);
  Crafty.load(['assets/ship.png'], done);
  Crafty.load(['assets/assault.png'], done);
  Crafty.load(['assets/earth.png'], done);
  client.connect(done);

  function done() {
    if(--i === 0) {
      Crafty.sprite(24, 'assets/ship.png', { PlayerSprite: [ 0, 0 ] } );
      Crafty.sprite(1, 'assets/assault.png', { SatelliteSprite: [ 0, 0, 24, 19 ] } );
      Crafty.sprite(1, 'assets/earth.png', { EarthSprite: [ 0, 0, 121, 118 ] } );
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
},{"./lib/crafty":2}],6:[function(require,module,exports){

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

},{"./lib/crafty":2,"./ship":12,"./bounded":13,"./mouseshooter":14}],8:[function(require,module,exports){

var Crafty = require('./lib/crafty');

Crafty.c('Planet', {
  name: 'Planet',
  init: function() {
    this.requires('Actor, Solid, Collision, EarthSprite');
    this.origin('center');
    this.attr({
      w: 121,
      h: 119,
      health: 200
    });
  },
} );

},{"./lib/crafty":2}],9:[function(require,module,exports){

var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  name: 'Satellite',
  init: function() {
    this.requires('Actor, Solid, Projectile, SatelliteSprite');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.bind('EnterFrame', this._satEnterFrame)
    this.attr({
      health: 2,
      damages: 10,
      speed: 3
    });
  },
  
  go: function() {
    this.target(Crafty('Planet'));
  },

  _satEnterFrame: function() {
    this.rotation += 1.5;
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
    this.requires('Actor, Shooter, Collision, PlayerSprite');
    this.attr({
      w: 24,
      h: 24,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvZ2FtZS5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9saWIvY3JhZnR5LmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3N0YXRzLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL2xvYWRpbmcuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvYWN0b3IuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvaGVhbHRoLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3BsYXllcnNoaXAuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvcGxhbmV0LmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3NhdGVsbGl0ZS5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9jbGllbnQuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvcXVldWUuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvc2hpcC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9ib3VuZGVkLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL21vdXNlc2hvb3Rlci5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9wcm9qZWN0aWxlLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3NvY2tldC5qcyIsIi9Vc2Vycy9yb21hYy9EZXYvd2FzdGV3YXJzL2NsaWVudC9qcy9uZXRzaGlwLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL3Nob290ZXIuanMiLCIvVXNlcnMvcm9tYWMvRGV2L3dhc3Rld2Fycy9jbGllbnQvanMvb2Zmc2NyZWVuLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvc2hhcmVkLmpzIiwiL1VzZXJzL3JvbWFjL0Rldi93YXN0ZXdhcnMvY2xpZW50L2pzL2J1bGxldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxNlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpLFxuICAgIFN0YXRzICA9IHJlcXVpcmUoJy4vc3RhdHMnKTtcblxucmVxdWlyZSgnLi9sb2FkaW5nJyk7XG5yZXF1aXJlKCcuL2FjdG9yJyk7XG5yZXF1aXJlKCcuL2hlYWx0aCcpO1xucmVxdWlyZSgnLi9wbGF5ZXJzaGlwJyk7XG5yZXF1aXJlKCcuL3BsYW5ldCcpO1xucmVxdWlyZSgnLi9zYXRlbGxpdGUnKTtcblxudmFyIEdhbWUgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblxuICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgQ3JhZnR5LmluaXQoODAwLCA2MDApO1xuICAgIENyYWZ0eS52aWV3cG9ydC5ib3VuZHMgPSB7XG4gICAgICBtaW46IHtcbiAgICAgICAgeDogLUNyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIsXG4gICAgICAgIHk6IC1DcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMlxuICAgICAgfSxcbiAgICAgIG1heDoge1xuICAgICAgICB4OiBDcmFmdHkudmlld3BvcnQud2lkdGggLyAyLFxuICAgICAgICB5OiBDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMlxuICAgICAgfVxuICAgIH07XG4gICAgQ3JhZnR5LmNhbnZhcy5pbml0KCk7XG4gICAgQ3JhZnR5LmJhY2tncm91bmQoJ2JsYWNrJyk7XG4gICAgQ3JhZnR5LnNjZW5lKCdMb2FkaW5nJyk7XG4gICAgU3RhdHMuRlBTKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNmcHMnKSk7XG4gIH1cblxufTtcblxuQ3JhZnR5LnNjZW5lKCdHYW1lJywgZnVuY3Rpb24oKSB7XG4gIHRoaXMucGxheWVyID0gQ3JhZnR5LmUoJ1BsYXllclNoaXAnKTtcbiAgdGhpcy5wbGF5ZXIuYXR0cih7IHg6IENyYWZ0eS5tYXRoLnJhbmRvbUludCgtMzUwLCAzNTApLCB5OiBDcmFmdHkubWF0aC5yYW5kb21JbnQoLTEwMCwgLTI1MCkgfSk7XG4gIHRoaXMucGxheWVyLmdvKCk7XG4gIHRoaXMucGxhbmV0ID0gQ3JhZnR5LmUoJ1BsYW5ldCcpO1xuICB0aGlzLnBsYW5ldC5iaW5kKCdEaWUnLCBmdW5jdGlvbigpIHtcbiAgICBDcmFmdHkudHJpZ2dlcignR2FtZU92ZXInKTtcbiAgfSk7XG4gIENyYWZ0eS5lKCdIZWFsdGgnKS5oZWFsdGgodGhpcy5wbGF5ZXIpO1xuICBDcmFmdHkuZSgnSGVhbHRoJykuaGVhbHRoKHRoaXMucGxhbmV0KTtcbiAgQ3JhZnR5LnZpZXdwb3J0LmNlbnRlck9uKHRoaXMucGxhbmV0LCAxKTsgXG59KTtcblxuQ3JhZnR5LmJpbmQoJ0dhbWVPdmVyJywgZnVuY3Rpb24oKSB7XG4gIENyYWZ0eSgnQWN0b3InKS5kZXN0cm95KCk7XG4gIENyYWZ0eS5zY2VuZSgnR2FtZU92ZXInKTtcbn0pO1xuXG5DcmFmdHkuc2NlbmUoJ0dhbWVPdmVyJywgZnVuY3Rpb24oKSB7XG4gIENyYWZ0eS5lKCcyRCwgRE9NLCBUZXh0JylcbiAgICAuYXR0cih7eDogLTUwLCB5OiAtMTAsIHc6IDIwMCwgaDogMjB9KVxuICAgIC50ZXh0KCdHYW1lIE9WRVIhJyk7XG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBHYW1lLnN0YXJ0KTtcbiIsIihmdW5jdGlvbigpey8qIVxuKiBDcmFmdHkgdjAuNS4zXG4qIGh0dHA6Ly9jcmFmdHlqcy5jb21cbipcbiogQ29weXJpZ2h0IDIwMTAsIExvdWlzIFN0b3dhc3NlclxuKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIGxpY2Vuc2VzLlxuKi9cblxuKGZ1bmN0aW9uICh3aW5kb3csIGluaXRDb21wb25lbnRzLCB1bmRlZmluZWQpIHtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHlcbiAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgKiBTZWxlY3QgYSBzZXQgb2Ygb3Igc2luZ2xlIGVudGl0aWVzIGJ5IGNvbXBvbmVudHMgb3IgYW4gZW50aXR5J3MgSUQuXG4gICAgKlxuICAgICogQ3JhZnR5IHVzZXMgc3ludGF4IHNpbWlsYXIgdG8galF1ZXJ5IGJ5IGhhdmluZyBhIHNlbGVjdG9yIGVuZ2luZSB0byBzZWxlY3QgZW50aXRpZXMgYnkgdGhlaXIgY29tcG9uZW50cy5cbiAgICAqXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG4gICAgKiAgICBDcmFmdHkoXCJNeUNvbXBvbmVudFwiKVxuICAgICogICAgQ3JhZnR5KFwiSGVsbG8gMkQgQ29tcG9uZW50XCIpXG4gICAgKiAgICBDcmFmdHkoXCJIZWxsbywgMkQsIENvbXBvbmVudFwiKVxuICAgICogfn5+XG4gICAgKiBcbiAgICAqIFRoZSBmaXJzdCBzZWxlY3RvciB3aWxsIHJldHVybiBhbGwgZW50aXRpZXMgdGhhdCBoYXZlIHRoZSBjb21wb25lbnQgYE15Q29tcG9uZW50YC4gVGhlIHNlY29uZCB3aWxsIHJldHVybiBhbGwgZW50aXRpZXMgdGhhdCBoYXZlIGBIZWxsb2AgYW5kIGAyRGAgYW5kIGBDb21wb25lbnRgIHdoZXJlYXMgdGhlIGxhc3Qgd2lsbCByZXR1cm4gYWxsIGVudGl0aWVzIHRoYXQgaGF2ZSBhdCBsZWFzdCBvbmUgb2YgdGhvc2UgY29tcG9uZW50cyAob3IpLlxuICAgICpcbiAgICAqIH5+flxuICAgICogICBDcmFmdHkoXCIqXCIpXG4gICAgKiB+fn5cbiAgICAqIFBhc3NpbmcgYCpgIHdpbGwgc2VsZWN0IGFsbCBlbnRpdGllcy5cbiAgICAqXG4gICAgKiB+fn5cbiAgICAqICAgQ3JhZnR5KDEpXG4gICAgKiB+fn5cbiAgICAqIFBhc3NpbmcgYW4gaW50ZWdlciB3aWxsIHNlbGVjdCB0aGUgZW50aXR5IHdpdGggdGhhdCBgSURgLlxuICAgICpcbiAgICAqIEZpbmRpbmcgb3V0IHRoZSBgSURgIG9mIGFuIGVudGl0eSBjYW4gYmUgZG9uZSBieSByZXR1cm5pbmcgdGhlIHByb3BlcnR5IGAwYC5cbiAgICAqIH5+flxuICAgICogICAgdmFyIGVudCA9IENyYWZ0eS5lKFwiMkRcIik7XG4gICAgKiAgICBlbnRbMF07IC8vSURcbiAgICAqIH5+flxuICAgICovXG4gICAgdmFyIENyYWZ0eSA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gbmV3IENyYWZ0eS5mbi5pbml0KHNlbGVjdG9yKTtcbiAgICB9LFxuXG4gICAgR1VJRCwgRlBTLCBmcmFtZSwgY29tcG9uZW50cywgZW50aXRpZXMsIGhhbmRsZXJzLCBvbmxvYWRzLCB0aWNrLCByZXF1ZXN0SUQsXG5cdG5vU2V0dGVyLCBsb29wcywgbWlsbGlTZWNQZXJGcmFtZSwgbmV4dEdhbWVUaWNrLCBzbGljZSwgcmxpc3QsIHJzcGFjZSxcblxuXHRpbml0U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHRHVUlEID0gMTsgLy9HVUlEIGZvciBlbnRpdHkgSURzXG4gICAgXHRGUFMgPSA1MDtcbiAgICBcdGZyYW1lID0gMTtcblxuICAgIFx0Y29tcG9uZW50cyA9IHt9OyAvL21hcCBvZiBjb21wb25lbnRzIGFuZCB0aGVpciBmdW5jdGlvbnNcbiAgICBcdGVudGl0aWVzID0ge307IC8vbWFwIG9mIGVudGl0aWVzIGFuZCB0aGVpciBkYXRhXG4gICAgICAgIGVudGl0eUZhY3RvcmllcyA9IHt9OyAvL3RlbXBsYXRlcyBvZiBlbnRpdGllc1xuICAgIFx0aGFuZGxlcnMgPSB7fTsgLy9nbG9iYWwgZXZlbnQgaGFuZGxlcnNcbiAgICBcdG9ubG9hZHMgPSBbXTsgLy90ZW1wb3Jhcnkgc3RvcmFnZSBvZiBvbmxvYWQgaGFuZGxlcnNcbiAgICBcdHRpY2s7XG5cbiAgICBcdC8qXG5cdFx0KiBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgb3IgaXRzIHZhcmlhbnRzIGlzIGNhbGxlZCBmb3IgYW5pbWF0aW9uLlxuXHRcdCogYC5yZXF1ZXN0SURgIGtlZXBzIGEgcmVjb3JkIG9mIHRoZSByZXR1cm4gdmFsdWUgcHJldmlvdXMgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIGNhbGwuXG5cdFx0KiBUaGlzIGlzIGFuIGludGVybmFsIHZhcmlhYmxlLiBVc2VkIHRvIHN0b3AgZnJhbWUuXG5cdFx0Ki9cbiAgICBcdHJlcXVlc3RJRDtcblxuICAgIFx0bm9TZXR0ZXI7XG5cbiAgICBcdGxvb3BzID0gMDtcbiAgICBcdG1pbGxpU2VjUGVyRnJhbWUgPSAxMDAwIC8gRlBTO1xuICAgIFx0bmV4dEdhbWVUaWNrID0gKG5ldyBEYXRlKS5nZXRUaW1lKCk7XG5cbiAgICBcdHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICAgIFx0cmxpc3QgPSAvXFxzKixcXHMqLztcbiAgICBcdHJzcGFjZSA9IC9cXHMrLztcbiAgICB9O1xuXG4gICAgaW5pdFN0YXRlKCk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5IENvcmVcbiAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgKiBAdHJpZ2dlciBOZXdFbnRpdHlOYW1lIC0gQWZ0ZXIgc2V0dGluZyBuZXcgbmFtZSBmb3IgZW50aXR5IC0gU3RyaW5nIC0gZW50aXR5IG5hbWVcbiAgICAqIEB0cmlnZ2VyIE5ld0NvbXBvbmVudCAtIHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGFkZGVkIHRvIHRoZSBlbnRpdHkgLSBTdHJpbmcgLSBDb21wb25lbnRcbiAgICAqIEB0cmlnZ2VyIFJlbW92ZUNvbXBvbmVudCAtIHdoZW4gYSBjb21wb25lbnQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRpdHkgLSBTdHJpbmcgLSBDb21wb25lbnRcbiAgICAqIEB0cmlnZ2VyIFJlbW92ZSAtIHdoZW4gdGhlIGVudGl0eSBpcyByZW1vdmVkIGJ5IGNhbGxpbmcgLmRlc3Ryb3koKVxuICAgICogXG4gICAgKiBTZXQgb2YgbWV0aG9kcyBhZGRlZCB0byBldmVyeSBzaW5nbGUgZW50aXR5LlxuICAgICovXG4gICAgQ3JhZnR5LmZuID0gQ3JhZnR5LnByb3RvdHlwZSA9IHtcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIC8vc2VsZWN0IGVudGl0aWVzIGJ5IGNvbXBvbmVudFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbGVtID0gMCwgLy9pbmRleCBlbGVtZW50c1xuICAgICAgICAgICAgICAgIGUsIC8vZW50aXR5IGZvckVhY2hcbiAgICAgICAgICAgICAgICBjdXJyZW50LFxuICAgICAgICAgICAgICAgIGFuZCA9IGZhbHNlLCAvL2ZsYWdzIGZvciBtdWx0aXBsZVxuICAgICAgICAgICAgICAgIG9yID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVsLFxuICAgICAgICAgICAgICAgIGNvbXBzLFxuICAgICAgICAgICAgICAgIHNjb3JlLFxuICAgICAgICAgICAgICAgIGksIGw7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGUgaW4gZW50aXRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbK2VdID0gZW50aXRpZXNbZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZW5ndGggPSBlbGVtO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL211bHRpcGxlIGNvbXBvbmVudHMgT1JcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IuaW5kZXhPZignLCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRlbCA9IHJsaXN0O1xuICAgICAgICAgICAgICAgICAgICAvL2RlYWwgd2l0aCBtdWx0aXBsZSBjb21wb25lbnRzIEFORFxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZWN0b3IuaW5kZXhPZignICcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhbmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZWwgPSByc3BhY2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9sb29wIG92ZXIgZW50aXRpZXNcbiAgICAgICAgICAgICAgICBmb3IgKGUgaW4gZW50aXRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdGllcy5oYXNPd25Qcm9wZXJ0eShlKSkgY29udGludWU7IC8vc2tpcFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gZW50aXRpZXNbZV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZCB8fCBvcikgeyAvL211bHRpcGxlIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBzID0gc2VsZWN0b3Iuc3BsaXQoZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbCA9IGNvbXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3JlID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIC8vbG9vcCBvdmVyIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5fX2NbY29tcHNbaV1dKSBzY29yZSsrOyAvL2lmIGNvbXBvbmVudCBleGlzdHMgYWRkIHRvIHNjb3JlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaWYgYW5kZWQgY29tcHMgYW5kIGhhcyBhbGwgT1Igb3JlZCBjb21wcyBhbmQgYXQgbGVhc3QgMVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuZCAmJiBzY29yZSA9PT0gbCB8fCBvciAmJiBzY29yZSA+IDApIHRoaXNbZWxlbSsrXSA9ICtlO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudC5fX2Nbc2VsZWN0b3JdKSB0aGlzW2VsZW0rK10gPSArZTsgLy9jb252ZXJ0IHRvIGludFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vZXh0ZW5kIGFsbCBjb21tb24gY29tcG9uZW50c1xuICAgICAgICAgICAgICAgIGlmIChlbGVtID4gMCAmJiAhYW5kICYmICFvcikgdGhpcy5leHRlbmQoY29tcG9uZW50c1tzZWxlY3Rvcl0pO1xuICAgICAgICAgICAgICAgIGlmIChjb21wcyAmJiBhbmQpIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHRoaXMuZXh0ZW5kKGNvbXBvbmVudHNbY29tcHNbaV1dKTtcblxuICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gZWxlbTsgLy9sZW5ndGggaXMgdGhlIGxhc3QgaW5kZXggKGFscmVhZHkgaW5jcmVtZW50ZWQpXG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBpZiB0aGVyZSdzIG9ubHkgb25lIGVudGl0eSwgcmV0dXJuIHRoZSBhY3R1YWwgZW50aXR5XG5cdFx0XHRcdGlmIChlbGVtID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVudGl0aWVzW3RoaXNbZWxlbS0xXV07XG5cdFx0XHRcdH1cblxuICAgICAgICAgICAgfSBlbHNlIHsgLy9TZWxlY3QgYSBzcGVjaWZpYyBlbnRpdHlcblxuICAgICAgICAgICAgICAgIGlmICghc2VsZWN0b3IpIHsgLy9ub3RoaW4gcGFzc2VkIGNyZWF0ZXMgR29kIGVudGl0eVxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHNlbGVjdG9yIGluIGVudGl0aWVzKSkgZW50aXRpZXNbc2VsZWN0b3JdID0gdGhpcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2lmIG5vdCBleGlzdHMsIHJldHVybiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICBpZiAoIShzZWxlY3RvciBpbiBlbnRpdGllcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzWzBdID0gc2VsZWN0b3I7XG4gICAgICAgICAgICAgICAgdGhpcy5sZW5ndGggPSAxO1xuXG4gICAgICAgICAgICAgICAgLy91cGRhdGUgZnJvbSB0aGUgY2FjaGVcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX19jKSB0aGlzLl9fYyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgLy91cGRhdGUgdG8gdGhlIGNhY2hlIGlmIE5VTExcbiAgICAgICAgICAgICAgICBpZiAoIWVudGl0aWVzW3NlbGVjdG9yXSkgZW50aXRpZXNbc2VsZWN0b3JdID0gdGhpcztcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50aXRpZXNbc2VsZWN0b3JdOyAvL3JldHVybiB0aGUgY2FjaGVkIHNlbGVjdG9yXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnNldE5hbWVcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5zZXROYW1lKFN0cmluZyBuYW1lKVxuICAgICAgICAqIEBwYXJhbSBuYW1lIC0gQSBodW1hbiByZWFkYWJsZSBuYW1lIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHRoaXMuc2V0TmFtZShcIlBsYXllclwiKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgc2V0TmFtZTogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBlbnRpdHlOYW1lID0gU3RyaW5nKG5hbWUpO1xuXG4gICAgICAgICAgICB0aGlzLl9lbnRpdHlOYW1lID0gZW50aXR5TmFtZTtcblxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiTmV3RW50aXR5TmFtZVwiLCBlbnRpdHlOYW1lKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmFkZENvbXBvbmVudFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmFkZENvbXBvbmVudChTdHJpbmcgY29tcG9uZW50TGlzdClcbiAgICAgICAgKiBAcGFyYW0gY29tcG9uZW50TGlzdCAtIEEgc3RyaW5nIG9mIGNvbXBvbmVudHMgdG8gYWRkIHNlcGFyYXRlZCBieSBhIGNvbW1hIGAsYFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5hZGRDb21wb25lbnQoU3RyaW5nIENvbXBvbmVudDFbLCAuLiwgU3RyaW5nIENvbXBvbmVudE5dKVxuICAgICAgICAqIEBwYXJhbSBDb21wb25lbnQjIC0gQ29tcG9uZW50IElEIHRvIGFkZC5cbiAgICAgICAgKiBBZGRzIGEgY29tcG9uZW50IHRvIHRoZSBzZWxlY3RlZCBlbnRpdGllcyBvciBlbnRpdHkuXG4gICAgICAgICpcbiAgICAgICAgKiBDb21wb25lbnRzIGFyZSB1c2VkIHRvIGV4dGVuZCB0aGUgZnVuY3Rpb25hbGl0eSBvZiBlbnRpdGllcy5cbiAgICAgICAgKiBUaGlzIG1lYW5zIGl0IHdpbGwgY29weSBwcm9wZXJ0aWVzIGFuZCBhc3NpZ24gbWV0aG9kcyB0b1xuICAgICAgICAqIGF1Z21lbnQgdGhlIGZ1bmN0aW9uYWxpdHkgb2YgdGhlIGVudGl0eS5cbiAgICAgICAgKlxuICAgICAgICAqIFRoZXJlIGFyZSBtdWx0aXBsZSBtZXRob2RzIG9mIGFkZGluZyBjb21wb25lbnRzLiBQYXNzaW5nIGFcbiAgICAgICAgKiBzdHJpbmcgd2l0aCBhIGxpc3Qgb2YgY29tcG9uZW50IG5hbWVzIG9yIHBhc3NpbmcgbXVsdGlwbGVcbiAgICAgICAgKiBhcmd1bWVudHMgd2l0aCB0aGUgY29tcG9uZW50IG5hbWVzLlxuICAgICAgICAqXG4gICAgICAgICogSWYgdGhlIGNvbXBvbmVudCBoYXMgYSBmdW5jdGlvbiBuYW1lZCBgaW5pdGAgaXQgd2lsbCBiZSBjYWxsZWQuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHRoaXMuYWRkQ29tcG9uZW50KFwiMkQsIENhbnZhc1wiKTtcbiAgICAgICAgKiB0aGlzLmFkZENvbXBvbmVudChcIjJEXCIsIFwiQ2FudmFzXCIpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBhZGRDb21wb25lbnQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgdmFyIHVuaW5pdCA9IFtdLCBjID0gMCwgdWwsIC8vYXJyYXkgb2YgY29tcG9uZW50cyB0byBpbml0XG4gICAgICAgICAgICBpID0gMCwgbCwgY29tcHM7XG5cbiAgICAgICAgICAgIC8vYWRkIG11bHRpcGxlIGFyZ3VtZW50c1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NbYXJndW1lbnRzW2ldXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVuaW5pdC5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vc3BsaXQgY29tcG9uZW50cyBpZiBjb250YWlucyBjb21tYVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpZC5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgY29tcHMgPSBpZC5zcGxpdChybGlzdCk7XG4gICAgICAgICAgICAgICAgbCA9IGNvbXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY1tjb21wc1tpXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB1bmluaXQucHVzaChjb21wc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vc2luZ2xlIGNvbXBvbmVudCBwYXNzZWRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2NbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB1bmluaXQucHVzaChpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vZXh0ZW5kIHRoZSBjb21wb25lbnRzXG4gICAgICAgICAgICB1bCA9IHVuaW5pdC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKDsgYyA8IHVsOyBjKyspIHtcbiAgICAgICAgICAgICAgICBjb21wID0gY29tcG9uZW50c1t1bmluaXRbY11dO1xuICAgICAgICAgICAgICAgIHRoaXMuZXh0ZW5kKGNvbXApO1xuXG4gICAgICAgICAgICAgICAgLy9pZiBjb25zdHJ1Y3RvciwgY2FsbCBpdFxuICAgICAgICAgICAgICAgIGlmIChjb21wICYmIFwiaW5pdFwiIGluIGNvbXApIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcC5pbml0LmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJOZXdDb21wb25lbnRcIiwgdWwpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMudG9nZ2xlQ29tcG9uZW50XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudG9nZ2xlQ29tcG9uZW50KFN0cmluZyBDb21wb25lbnRMaXN0KVxuICAgICAgICAqIEBwYXJhbSBDb21wb25lbnRMaXN0IC0gQSBzdHJpbmcgb2YgY29tcG9uZW50cyB0byBhZGQgb3IgcmVtb3ZlIHNlcGFyYXRlZCBieSBhIGNvbW1hIGAsYFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50b2dnbGVDb21wb25lbnQoU3RyaW5nIENvbXBvbmVudDFbLCAuLiwgU3RyaW5nIGNvbXBvbmVudE5dKVxuICAgICAgICAqIEBwYXJhbSBDb21wb25lbnQjIC0gQ29tcG9uZW50IElEIHRvIGFkZCBvciByZW1vdmUuXG4gICAgICAgICogQWRkIG9yIFJlbW92ZSBDb21wb25lbnRzIGZyb20gYW4gZW50aXR5LlxuICAgICAgICAqIFxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogdmFyIGUgPSBDcmFmdHkuZShcIjJELERPTSxUZXN0XCIpO1xuICAgICAgICAqIGUudG9nZ2xlQ29tcG9uZW50KFwiVGVzdCxUZXN0MlwiKTsgLy9SZW1vdmUgVGVzdCwgYWRkIFRlc3QyXG4gICAgICAgICogZS50b2dnbGVDb21wb25lbnQoXCJUZXN0LFRlc3QyXCIpOyAvL0FkZCBUZXN0LCByZW1vdmUgVGVzdDJcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBlID0gQ3JhZnR5LmUoXCIyRCxET00sVGVzdFwiKTtcbiAgICAgICAgKiBlLnRvZ2dsZUNvbXBvbmVudChcIlRlc3RcIixcIlRlc3QyXCIpOyAvL1JlbW92ZSBUZXN0LCBhZGQgVGVzdDJcbiAgICAgICAgKiBlLnRvZ2dsZUNvbXBvbmVudChcIlRlc3RcIixcIlRlc3QyXCIpOyAvL0FkZCBUZXN0LCByZW1vdmUgVGVzdDJcbiAgICAgICAgKiBlLnRvZ2dsZUNvbXBvbmVudChcIlRlc3RcIik7ICAgICAgICAgLy9SZW1vdmUgVGVzdFxuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgIHRvZ2dsZUNvbXBvbmVudDpmdW5jdGlvbih0b2dnbGUpe1xuICAgICAgICAgICAgdmFyIGkgPSAwLCBsLCBjb21wcztcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5oYXMoYXJndW1lbnRzW2ldKSl7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVDb21wb25lbnQoYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9zcGxpdCBjb21wb25lbnRzIGlmIGNvbnRhaW5zIGNvbW1hXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRvZ2dsZS5pbmRleE9mKCcsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgY29tcHMgPSB0b2dnbGUuc3BsaXQocmxpc3QpO1xuICAgICAgICAgICAgICAgIGwgPSBjb21wcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5oYXMoY29tcHNbaV0pKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNvbXBvbmVudChjb21wc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY29tcHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9zaW5nbGUgY29tcG9uZW50IHBhc3NlZFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZih0aGlzLmhhcyh0b2dnbGUpKXsgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ29tcG9uZW50KHRvZ2dsZSk7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRvZ2dsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5yZXF1aXJlc1xuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnJlcXVpcmVzKFN0cmluZyBjb21wb25lbnRMaXN0KVxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnRMaXN0IC0gTGlzdCBvZiBjb21wb25lbnRzIHRoYXQgbXVzdCBiZSBhZGRlZFxuICAgICAgICAqIFxuICAgICAgICAqIE1ha2VzIHN1cmUgdGhlIGVudGl0eSBoYXMgdGhlIGNvbXBvbmVudHMgbGlzdGVkLiBJZiB0aGUgZW50aXR5IGRvZXMgbm90XG4gICAgICAgICogaGF2ZSB0aGUgY29tcG9uZW50LCBpdCB3aWxsIGFkZCBpdC5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIC5hZGRDb21wb25lbnRcbiAgICAgICAgKi9cbiAgICAgICAgcmVxdWlyZXM6IGZ1bmN0aW9uIChsaXN0KSB7XG4gICAgICAgICAgICB2YXIgY29tcHMgPSBsaXN0LnNwbGl0KHJsaXN0KSxcbiAgICAgICAgICAgIGkgPSAwLCBsID0gY29tcHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcDtcblxuICAgICAgICAgICAgLy9sb29wIG92ZXIgdGhlIGxpc3Qgb2YgY29tcG9uZW50cyBhbmQgYWRkIGlmIG5lZWRlZFxuICAgICAgICAgICAgZm9yICg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb21wID0gY29tcHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhcyhjb21wKSkgdGhpcy5hZGRDb21wb25lbnQoY29tcCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnJlbW92ZUNvbXBvbmVudFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnJlbW92ZUNvbXBvbmVudChTdHJpbmcgQ29tcG9uZW50Wywgc29mdF0pXG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudCAtIENvbXBvbmVudCB0byByZW1vdmVcbiAgICAgICAgKiBAcGFyYW0gc29mdCAtIFdoZXRoZXIgdG8gc29mdCByZW1vdmUgaXQgKGRlZmF1bHRzIHRvIGB0cnVlYClcbiAgICAgICAgKlxuICAgICAgICAqIFJlbW92ZXMgYSBjb21wb25lbnQgZnJvbSBhbiBlbnRpdHkuIEEgc29mdCByZW1vdmUgKHRoZSBkZWZhdWx0KSB3aWxsIG9ubHlcbiAgICAgICAgKiByZWZyYWluIGAuaGFzKClgIGZyb20gcmV0dXJuaW5nIHRydWUuIEhhcmQgd2lsbCByZW1vdmUgYWxsXG4gICAgICAgICogYXNzb2NpYXRlZCBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzLlxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgZSA9IENyYWZ0eS5lKFwiMkQsRE9NLFRlc3RcIik7XG4gICAgICAgICogZS5yZW1vdmVDb21wb25lbnQoXCJUZXN0XCIpOyAgICAgICAgLy9Tb2Z0IHJlbW92ZSBUZXN0IGNvbXBvbmVudFxuICAgICAgICAqIGUucmVtb3ZlQ29tcG9uZW50KFwiVGVzdFwiLCBmYWxzZSk7IC8vSGFyZCByZW1vdmUgVGVzdCBjb21wb25lbnRcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlQ29tcG9uZW50OiBmdW5jdGlvbiAoaWQsIHNvZnQpIHtcbiAgICAgICAgICAgIGlmIChzb2Z0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wcyA9IGNvbXBvbmVudHNbaWRdLCBwcm9wO1xuICAgICAgICAgICAgICAgIGZvciAocHJvcCBpbiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpc1twcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fX2NbaWRdO1xuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJSZW1vdmVDb21wb25lbnRcIiwgaWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuaGFzXG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuaGFzKFN0cmluZyBjb21wb25lbnQpXG4gICAgICAgICogUmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYCBkZXBlbmRpbmcgb24gaWYgdGhlXG4gICAgICAgICogZW50aXR5IGhhcyB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgICAgICAqXG4gICAgICAgICogRm9yIGJldHRlciBwZXJmb3JtYW5jZSwgc2ltcGx5IHVzZSB0aGUgYC5fX2NgIG9iamVjdFxuICAgICAgICAqIHdoaWNoIHdpbGwgYmUgYHRydWVgIGlmIHRoZSBlbnRpdHkgaGFzIHRoZSBjb21wb25lbnQgb3JcbiAgICAgICAgKiB3aWxsIG5vdCBleGlzdCAob3IgYmUgYGZhbHNlYCkuXG4gICAgICAgICovXG4gICAgICAgIGhhczogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLl9fY1tpZF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuYXR0clxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLmF0dHIoU3RyaW5nIHByb3BlcnR5LCAqIHZhbHVlKVxuICAgICAgICAqIEBwYXJhbSBwcm9wZXJ0eSAtIFByb3BlcnR5IG9mIHRoZSBlbnRpdHkgdG8gbW9kaWZ5XG4gICAgICAgICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gc2V0IHRoZSBwcm9wZXJ0eSB0b1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5hdHRyKE9iamVjdCBtYXApXG4gICAgICAgICogQHBhcmFtIG1hcCAtIE9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHRoZSBwcm9wZXJ0eSB0byBtb2RpZnkgYW5kIHRoZSB2YWx1ZSBhcyB0aGUgcHJvcGVydHkgdmFsdWVcbiAgICAgICAgKiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHByb3BlcnRpZXMgY2hhbmdlIC0ge2tleTogdmFsdWV9XG4gICAgICAgICogXG4gICAgICAgICogVXNlIHRoaXMgbWV0aG9kIHRvIHNldCBhbnkgcHJvcGVydHkgb2YgdGhlIGVudGl0eS5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHRoaXMuYXR0cih7a2V5OiBcInZhbHVlXCIsIHByb3A6IDV9KTtcbiAgICAgICAgKiB0aGlzLmtleTsgLy92YWx1ZVxuICAgICAgICAqIHRoaXMucHJvcDsgLy81XG4gICAgICAgICpcbiAgICAgICAgKiB0aGlzLmF0dHIoXCJrZXlcIiwgXCJuZXd2YWx1ZVwiKTtcbiAgICAgICAgKiB0aGlzLmtleTsgLy9uZXd2YWx1ZVxuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICBhdHRyOiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvL2lmIGp1c3QgdGhlIGtleSwgcmV0dXJuIHRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9leHRlbmQgaWYgb2JqZWN0XG4gICAgICAgICAgICAgICAgdGhpcy5leHRlbmQoa2V5KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIiwga2V5KTsgLy90cmlnZ2VyIGNoYW5nZSBldmVudFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9pZiBrZXkgdmFsdWUgcGFpclxuICAgICAgICAgICAgdGhpc1trZXldID0gdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSB7fTtcbiAgICAgICAgICAgIGNoYW5nZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIiwgY2hhbmdlKTsgLy90cmlnZ2VyIGNoYW5nZSBldmVudFxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMudG9BcnJheVxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnRvQXJyYXkodm9pZClcbiAgICAgICAgKiBcbiAgICAgICAgKiBUaGlzIG1ldGhvZCB3aWxsIHNpbXBseSByZXR1cm4gdGhlIGZvdW5kIGVudGl0aWVzIGFzIGFuIGFycmF5LlxuICAgICAgICAqL1xuICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gc2xpY2UuY2FsbCh0aGlzLCAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy50aW1lb3V0XG4gICAgICAgICogQGNvbXAgQ3JhZnR5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGltZW91dChGdW5jdGlvbiBjYWxsYmFjaywgTnVtYmVyIGRlbGF5KVxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCB0byBleGVjdXRlIGFmdGVyIGdpdmVuIGFtb3VudCBvZiBtaWxsaXNlY29uZHNcbiAgICAgICAgKiBAcGFyYW0gZGVsYXkgLSBBbW91bnQgb2YgbWlsbGlzZWNvbmRzIHRvIGV4ZWN1dGUgdGhlIG1ldGhvZFxuICAgICAgICAqIFxuICAgICAgICAqIFRoZSBkZWxheSBtZXRob2Qgd2lsbCBleGVjdXRlIGEgZnVuY3Rpb24gYWZ0ZXIgYSBnaXZlbiBhbW91bnQgb2YgdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAgICAgICpcbiAgICAgICAgKiBFc3NlbnRpYWxseSBhIHdyYXBwZXIgZm9yIGBzZXRUaW1lb3V0YC5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogRGVzdHJveSBpdHNlbGYgYWZ0ZXIgMTAwIG1pbGxpc2Vjb25kc1xuICAgICAgICAqIH5+flxuICAgICAgICAqIHRoaXMudGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgKiB9LCAxMDApO1xuICAgICAgICAqIH5+flxuICAgICAgICAqL1xuICAgICAgICB0aW1lb3V0OiBmdW5jdGlvbiAoY2FsbGJhY2ssIGR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChzZWxmKTtcbiAgICAgICAgICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmJpbmRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5iaW5kKFN0cmluZyBldmVudE5hbWUsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBOYW1lIG9mIHRoZSBldmVudCB0byBiaW5kIHRvXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgd2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkXG4gICAgICAgICogQXR0YWNoIHRoZSBjdXJyZW50IGVudGl0eSAob3IgZW50aXRpZXMpIHRvIGxpc3RlbiBmb3IgYW4gZXZlbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBDYWxsYmFjayB3aWxsIGJlIGludm9rZWQgd2hlbiBhbiBldmVudCB3aXRoIHRoZSBldmVudCBuYW1lIHBhc3NlZFxuICAgICAgICAqIGlzIHRyaWdnZXJlZC4gRGVwZW5kaW5nIG9uIHRoZSBldmVudCwgc29tZSBkYXRhIG1heSBiZSBwYXNzZWRcbiAgICAgICAgKiB2aWEgYW4gYXJndW1lbnQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICAqXG4gICAgICAgICogVGhlIGZpcnN0IGFyZ3VtZW50IGlzIHRoZSBldmVudCBuYW1lIChjYW4gYmUgYW55dGhpbmcpIHdoaWxzdCB0aGVcbiAgICAgICAgKiBzZWNvbmQgYXJndW1lbnQgaXMgdGhlIGNhbGxiYWNrLiBJZiB0aGUgZXZlbnQgaGFzIGRhdGEsIHRoZVxuICAgICAgICAqIGNhbGxiYWNrIHNob3VsZCBoYXZlIGFuIGFyZ3VtZW50LlxuICAgICAgICAqXG4gICAgICAgICogRXZlbnRzIGFyZSBhcmJpdHJhcnkgYW5kIHByb3ZpZGUgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIGNvbXBvbmVudHMuXG4gICAgICAgICogWW91IGNhbiB0cmlnZ2VyIG9yIGJpbmQgYW4gZXZlbnQgZXZlbiBpZiBpdCBkb2Vzbid0IGV4aXN0IHlldC5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHRoaXMuYXR0cihcInRyaWdnZXJzXCIsIDApOyAvL3NldCBhIHRyaWdnZXIgY291bnRcbiAgICAgICAgKiB0aGlzLmJpbmQoXCJteWV2ZW50XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgICB0aGlzLnRyaWdnZXJzKys7IC8vd2hlbmV2ZXIgbXlldmVudCBpcyB0cmlnZ2VyZWQsIGluY3JlbWVudFxuICAgICAgICAqIH0pO1xuICAgICAgICAqIHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICogICAgIHRoaXMudHJpZ2dlcihcIm15ZXZlbnRcIik7IC8vdHJpZ2dlciBteWV2ZW50IG9uIGV2ZXJ5IGZyYW1lXG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSAudHJpZ2dlciwgLnVuYmluZFxuICAgICAgICAqL1xuICAgICAgICBiaW5kOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvL29wdGltaXphdGlvbiBmb3IgMSBlbnRpdHlcbiAgICAgICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGlmICghaGFuZGxlcnNbZXZlbnRdKSBoYW5kbGVyc1tldmVudF0gPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgaCA9IGhhbmRsZXJzW2V2ZW50XTtcblxuICAgICAgICAgICAgICAgIGlmICghaFt0aGlzWzBdXSkgaFt0aGlzWzBdXSA9IFtdOyAvL2luaXQgaGFuZGxlciBhcnJheSBmb3IgZW50aXR5XG4gICAgICAgICAgICAgICAgaFt0aGlzWzBdXS5wdXNoKGNhbGxiYWNrKTsgLy9hZGQgY3VycmVudCBjYWxsYmFja1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vaW5pdCBldmVudCBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCFoYW5kbGVyc1tldmVudF0pIGhhbmRsZXJzW2V2ZW50XSA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBoID0gaGFuZGxlcnNbZXZlbnRdO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFoW3RoaXNbMF1dKSBoW3RoaXNbMF1dID0gW107IC8vaW5pdCBoYW5kbGVyIGFycmF5IGZvciBlbnRpdHlcbiAgICAgICAgICAgICAgICBoW3RoaXNbMF1dLnB1c2goY2FsbGJhY2spOyAvL2FkZCBjdXJyZW50IGNhbGxiYWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnVuYmluZFxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnVuYmluZChTdHJpbmcgZXZlbnROYW1lWywgRnVuY3Rpb24gY2FsbGJhY2tdKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBOYW1lIG9mIHRoZSBldmVudCB0byB1bmJpbmRcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byB1bmJpbmRcbiAgICAgICAgKiBSZW1vdmVzIGJpbmRpbmcgd2l0aCBhbiBldmVudCBmcm9tIGN1cnJlbnQgZW50aXR5LlxuICAgICAgICAqXG4gICAgICAgICogUGFzc2luZyBhbiBldmVudCBuYW1lIHdpbGwgcmVtb3ZlIGFsbCBldmVudHMgYm91bmQgdG9cbiAgICAgICAgKiB0aGF0IGV2ZW50LiBQYXNzaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBjYWxsYmFjayB3aWxsXG4gICAgICAgICogdW5iaW5kIG9ubHkgdGhhdCBjYWxsYmFjay5cbiAgICAgICAgKiBAc2VlIC5iaW5kLCAudHJpZ2dlclxuICAgICAgICAqL1xuICAgICAgICB1bmJpbmQ6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhkbCA9IGhhbmRsZXJzW2V2ZW50XSwgaSA9IDAsIGwsIGN1cnJlbnQ7XG4gICAgICAgICAgICAgICAgLy9pZiBubyBldmVudHMsIGNhbmNlbFxuICAgICAgICAgICAgICAgIGlmIChoZGwgJiYgaGRsW3RoaXNbMF1dKSBsID0gaGRsW3RoaXNbMF1dLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiB0aGlzO1xuXG4gICAgICAgICAgICAgICAgLy9pZiBubyBmdW5jdGlvbiwgZGVsZXRlIGFsbFxuICAgICAgICAgICAgICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGhkbFt0aGlzWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vbG9vayBmb3IgYSBtYXRjaCBpZiB0aGUgZnVuY3Rpb24gaXMgcGFzc2VkXG4gICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGhkbFt0aGlzWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRbaV0gPT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnRyaWdnZXJcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50cmlnZ2VyKFN0cmluZyBldmVudE5hbWVbLCBPYmplY3QgZGF0YV0pXG4gICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAtIEV2ZW50IHRvIHRyaWdnZXJcbiAgICAgICAgKiBAcGFyYW0gZGF0YSAtIEFyYml0cmFyeSBkYXRhIHRoYXQgd2lsbCBiZSBwYXNzZWQgaW50byBldmVyeSBjYWxsYmFjayBhcyBhbiBhcmd1bWVudFxuICAgICAgICAqIFRyaWdnZXIgYW4gZXZlbnQgd2l0aCBhcmJpdHJhcnkgZGF0YS4gV2lsbCBpbnZva2UgYWxsIGNhbGxiYWNrcyB3aXRoXG4gICAgICAgICogdGhlIGNvbnRleHQgKHZhbHVlIG9mIGB0aGlzYCkgb2YgdGhlIGN1cnJlbnQgZW50aXR5IG9iamVjdC5cbiAgICAgICAgKlxuICAgICAgICAqICpOb3RlOiBUaGlzIHdpbGwgb25seSBleGVjdXRlIGNhbGxiYWNrcyB3aXRoaW4gdGhlIGN1cnJlbnQgZW50aXR5LCBubyBvdGhlciBlbnRpdHkuKlxuICAgICAgICAqXG4gICAgICAgICogVGhlIGZpcnN0IGFyZ3VtZW50IGlzIHRoZSBldmVudCBuYW1lIHRvIHRyaWdnZXIgYW5kIHRoZSBvcHRpb25hbFxuICAgICAgICAqIHNlY29uZCBhcmd1bWVudCBpcyB0aGUgYXJiaXRyYXJ5IGV2ZW50IGRhdGEuIFRoaXMgY2FuIGJlIGFic29sdXRlbHkgYW55dGhpbmcuXG4gICAgICAgICovXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgLy9maW5kIHRoZSBoYW5kbGVycyBhc3NpZ25lZCB0byB0aGUgZXZlbnQgYW5kIGVudGl0eVxuICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyc1tldmVudF0gJiYgaGFuZGxlcnNbZXZlbnRdW3RoaXNbMF1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSBoYW5kbGVyc1tldmVudF1bdGhpc1swXV0sIGkgPSAwLCBsID0gY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5jYWxsKHRoaXMsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vZmluZCB0aGUgaGFuZGxlcnMgYXNzaWduZWQgdG8gdGhlIGV2ZW50IGFuZCBlbnRpdHlcbiAgICAgICAgICAgICAgICBpZiAoaGFuZGxlcnNbZXZlbnRdICYmIGhhbmRsZXJzW2V2ZW50XVt0aGlzWzBdXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gaGFuZGxlcnNbZXZlbnRdW3RoaXNbMF1dLCBpID0gMCwgbCA9IGNhbGxiYWNrcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3NbaV0uY2FsbCh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICMuZWFjaFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5lYWNoKEZ1bmN0aW9uIG1ldGhvZClcbiAgICAgICAgKiBAcGFyYW0gbWV0aG9kIC0gTWV0aG9kIHRvIGNhbGwgb24gZWFjaCBpdGVyYXRpb25cbiAgICAgICAgKiBJdGVyYXRlcyBvdmVyIGZvdW5kIGVudGl0aWVzLCBjYWxsaW5nIGEgZnVuY3Rpb24gZm9yIGV2ZXJ5IGVudGl0eS5cbiAgICAgICAgKlxuICAgICAgICAqIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgZW50aXR5IGFuZCB3aWxsIHBhc3MgdGhlIGluZGV4XG4gICAgICAgICogaW4gdGhlIGl0ZXJhdGlvbiBhcyBhbiBhcmd1bWVudC4gVGhlIGNvbnRleHQgKHZhbHVlIG9mIGB0aGlzYCkgb2YgdGhlXG4gICAgICAgICogZnVuY3Rpb24gd2lsbCBiZSB0aGUgY3VycmVudCBlbnRpdHkgaW4gdGhlIGl0ZXJhdGlvbi5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIERlc3Ryb3kgZXZlcnkgc2Vjb25kIDJEIGVudGl0eVxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eShcIjJEXCIpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAqICAgICBpZihpICUgMiA9PT0gMCkge1xuICAgICAgICAqICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgICogICAgIH1cbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgZWFjaDogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBpID0gMCwgbCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvL3NraXAgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICghZW50aXRpZXNbdGhpc1tpXV0pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGZ1bmMuY2FsbChlbnRpdGllc1t0aGlzW2ldXSwgaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogIy5jbG9uZVxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIEVudGl0eSAuY2xvbmUodm9pZClcbiAgICAgICAgKiBAcmV0dXJucyBDbG9uZWQgZW50aXR5IG9mIHRoZSBjdXJyZW50IGVudGl0eVxuICAgICAgICAqIFxuICAgICAgICAqIE1ldGhvZCB3aWxsIGNyZWF0ZSBhbm90aGVyIGVudGl0eSB3aXRoIHRoZSBleGFjdCBzYW1lXG4gICAgICAgICogcHJvcGVydGllcywgY29tcG9uZW50cyBhbmQgbWV0aG9kcyBhcyB0aGUgY3VycmVudCBlbnRpdHkuXG4gICAgICAgICovXG4gICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29tcHMgPSB0aGlzLl9fYyxcbiAgICAgICAgICAgIGNvbXAsXG4gICAgICAgICAgICBwcm9wLFxuICAgICAgICAgICAgY2xvbmUgPSBDcmFmdHkuZSgpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbXAgaW4gY29tcHMpIHtcbiAgICAgICAgICAgICAgICBjbG9uZS5hZGRDb21wb25lbnQoY29tcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHByb3AgaW4gdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wICE9IFwiMFwiICYmIHByb3AgIT0gXCJfZ2xvYmFsXCIgJiYgcHJvcCAhPSBcIl9jaGFuZ2VkXCIgJiYgdHlwZW9mIHRoaXNbcHJvcF0gIT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB0aGlzW3Byb3BdICE9IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xvbmVbcHJvcF0gPSB0aGlzW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLnNldHRlclxuICAgICAgICAqIEBjb21wIENyYWZ0eSBDb3JlXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgLnNldHRlcihTdHJpbmcgcHJvcGVydHksIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBwcm9wZXJ0eSAtIFByb3BlcnR5IHRvIHdhdGNoIGZvciBtb2RpZmljYXRpb25cbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBNZXRob2QgdG8gZXhlY3V0ZSBpZiB0aGUgcHJvcGVydHkgaXMgbW9kaWZpZWRcbiAgICAgICAgKiBXaWxsIHdhdGNoIGEgcHJvcGVydHkgd2FpdGluZyBmb3IgbW9kaWZpY2F0aW9uIGFuZCB3aWxsIHRoZW4gaW52b2tlIHRoZVxuICAgICAgICAqIGdpdmVuIGNhbGxiYWNrIHdoZW4gYXR0ZW1wdGluZyB0byBtb2RpZnkuXG4gICAgICAgICpcbiAgICAgICAgKiAqTm90ZTogU3VwcG9ydCBpbiBJRTw5IGlzIHNsaWdodGx5IGRpZmZlcmVudC4gVGhlIG1ldGhvZCB3aWxsIGJlIGV4ZWN1dGVkXG4gICAgICAgICogYWZ0ZXIgdGhlIHByb3BlcnR5IGhhcyBiZWVuIHNldCpcbiAgICAgICAgKi9cbiAgICAgICAgc2V0dGVyOiBmdW5jdGlvbiAocHJvcCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3VwcG9ydC5zZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZGVmaW5lU2V0dGVyX18ocHJvcCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChDcmFmdHkuc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wLCB7XG4gICAgICAgICAgICAgICAgICAgIHNldDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub1NldHRlci5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcDogcHJvcCxcbiAgICAgICAgICAgICAgICAgICAgb2JqOiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICBmbjogY2FsbGJhY2tcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmRlc3Ryb3lcbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5kZXN0cm95KHZvaWQpXG4gICAgICAgICogV2lsbCByZW1vdmUgYWxsIGV2ZW50IGxpc3RlbmVycyBhbmQgZGVsZXRlIGFsbCBwcm9wZXJ0aWVzIGFzIHdlbGwgYXMgcmVtb3ZpbmcgZnJvbSB0aGUgc3RhZ2VcbiAgICAgICAgKi9cbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy9yZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXJzLCBkZWxldGUgZnJvbSBlbnRpdGllc1xuICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJSZW1vdmVcIik7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgZSBpbiBoYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuYmluZChlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIGVudGl0aWVzW3RoaXNbMF1dO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9naXZlIHRoZSBpbml0IGluc3RhbmNlcyB0aGUgQ3JhZnR5IHByb3RvdHlwZVxuICAgIENyYWZ0eS5mbi5pbml0LnByb3RvdHlwZSA9IENyYWZ0eS5mbjtcblxuICAgIC8qKlxuICAgICogRXh0ZW5zaW9uIG1ldGhvZCB0byBleHRlbmQgdGhlIG5hbWVzcGFjZSBhbmRcbiAgICAqIHNlbGVjdG9yIGluc3RhbmNlc1xuICAgICovXG4gICAgQ3JhZnR5LmV4dGVuZCA9IENyYWZ0eS5mbi5leHRlbmQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLCBrZXk7XG5cbiAgICAgICAgLy9kb24ndCBib3RoZXIgd2l0aCBudWxsc1xuICAgICAgICBpZiAoIW9iaikgcmV0dXJuIHRhcmdldDtcblxuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT09IG9ialtrZXldKSBjb250aW51ZTsgLy9oYW5kbGUgY2lyY3VsYXIgcmVmZXJlbmNlXG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5leHRlbmRcbiAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgKiBVc2VkIHRvIGV4dGVuZCB0aGUgQ3JhZnR5IG5hbWVzcGFjZS5cbiAgICAqL1xuICAgIENyYWZ0eS5leHRlbmQoe1xuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5pbml0XG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAdHJpZ2dlciBFbnRlckZyYW1lIC0gb24gZWFjaCBmcmFtZSAtIHsgZnJhbWU6IE51bWJlciB9XG4gICAgICAgICogQHRyaWdnZXIgTG9hZCAtIEp1c3QgYWZ0ZXIgdGhlIHZpZXdwb3J0IGlzIGluaXRpYWxpc2VkLiBCZWZvcmUgdGhlIEVudGVyRnJhbWUgbG9vcHMgaXMgc3RhcnRlZFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pbml0KFtOdW1iZXIgd2lkdGgsIE51bWJlciBoZWlnaHRdKVxuICAgICAgICAqIEBwYXJhbSB3aWR0aCAtIFdpZHRoIG9mIHRoZSBzdGFnZVxuICAgICAgICAqIEBwYXJhbSBoZWlnaHQgLSBIZWlnaHQgb2YgdGhlIHN0YWdlXG4gICAgICAgICogXG4gICAgICAgICogQ3JlYXRlIGEgZGl2IHdpdGggaWQgYGNyLXN0YWdlYCwgaWYgdGhlcmUgaXMgbm90IGFscmVhZHkgYW4gSFRNTEVsZW1lbnQgd2l0aCBpZCBgY3Itc3RhZ2VgIChieSBgQ3JhZnR5LnZpZXdwb3J0LmluaXRgKS5cbiAgICAgICAgKlxuICAgICAgICAqIFN0YXJ0cyB0aGUgYEVudGVyRnJhbWVgIGludGVydmFsLiBUaGlzIHdpbGwgY2FsbCB0aGUgYEVudGVyRnJhbWVgIGV2ZW50IGZvciBldmVyeSBmcmFtZS5cbiAgICAgICAgKlxuICAgICAgICAqIENhbiBwYXNzIHdpZHRoIGFuZCBoZWlnaHQgdmFsdWVzIGZvciB0aGUgc3RhZ2Ugb3RoZXJ3aXNlIHdpbGwgZGVmYXVsdCB0byB3aW5kb3cgc2l6ZSAoc2VlIGBDcmFmdHkuRE9NLndpbmRvd2ApLlxuICAgICAgICAqXG4gICAgICAgICogQWxsIGBMb2FkYCBldmVudHMgd2lsbCBiZSBleGVjdXRlZC5cbiAgICAgICAgKlxuICAgICAgICAqIFVzZXMgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgdG8gc3luYyB0aGUgZHJhd2luZyB3aXRoIHRoZSBicm93c2VyIGJ1dCB3aWxsIGRlZmF1bHQgdG8gYHNldEludGVydmFsYCBpZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGl0LlxuICAgICAgICAqIEBzZWUgQ3JhZnR5LnN0b3AsICBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgKi9cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKHcsIGgpIHtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5pbml0KHcsIGgpO1xuXG4gICAgICAgICAgICAvL2NhbGwgYWxsIGFyYml0cmFyeSBmdW5jdGlvbnMgYXR0YWNoZWQgdG8gb25sb2FkXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJMb2FkXCIpO1xuICAgICAgICAgICAgdGhpcy50aW1lci5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjLmdldFZlcnNpb25cbiAgICAgICAgKiBAY29tcCBDcmFmdHkgQ29yZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC5nZXRWZXJzaW9uKClcbiAgICAgICAgKiBAcmV0dXJucyBBY3R1YWxseSBjcmFmdHkgdmVyc2lvblxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkuZ2V0VmVyc2lvbigpOyAvLycwLjUuMidcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKi9cbiAgICAgICAgZ2V0VmVyc2lvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICcwLjUuMyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuc3RvcFxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHRyaWdnZXIgQ3JhZnR5U3RvcCAtIHdoZW4gdGhlIGdhbWUgaXMgc3RvcHBlZFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5zdG9wKFtib29sIGNsZWFyU3RhdGVdKVxuXHRcdCogQHBhcmFtIGNsZWFyU3RhdGUgLSBpZiB0cnVlIHRoZSBzdGFnZSBhbmQgYWxsIGdhbWUgc3RhdGUgaXMgY2xlYXJlZC5cbiAgICAgICAgKlxuICAgICAgICAqIFN0b3BzIHRoZSBFbnRlckZyYW1lIGludGVydmFsIGFuZCByZW1vdmVzIHRoZSBzdGFnZSBlbGVtZW50LlxuICAgICAgICAqXG4gICAgICAgICogVG8gcmVzdGFydCwgdXNlIGBDcmFmdHkuaW5pdCgpYC5cbiAgICAgICAgKiBAc2VlIENyYWZ0eS5pbml0XG4gICAgICAgICovXG4gICAgICAgIHN0b3A6IGZ1bmN0aW9uIChjbGVhclN0YXRlKSB7XG4gICAgICAgIFx0dGhpcy50aW1lci5zdG9wKCk7XG4gICAgICAgIFx0aWYgKGNsZWFyU3RhdGUpIHtcbiAgICAgICAgXHRcdGlmIChDcmFmdHkuc3RhZ2UgJiYgQ3JhZnR5LnN0YWdlLmVsZW0ucGFyZW50Tm9kZSkge1xuICAgICAgICBcdFx0XHR2YXIgbmV3Q3JTdGFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBcdFx0XHRuZXdDclN0YWdlLmlkID0gXCJjci1zdGFnZVwiO1xuICAgICAgICBcdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdDclN0YWdlLCBDcmFmdHkuc3RhZ2UuZWxlbSk7XG4gICAgICAgIFx0XHR9XG4gICAgICAgIFx0XHRpbml0U3RhdGUoKTtcbiAgICAgICAgXHRcdGluaXRDb21wb25lbnRzKENyYWZ0eSwgd2luZG93LCB3aW5kb3cuZG9jdW1lbnQpO1xuICAgICAgICBcdH1cblxuICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJDcmFmdHlTdG9wXCIpO1xuXG4gICAgICAgIFx0cmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkucGF1c2VcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEB0cmlnZ2VyIFBhdXNlIC0gd2hlbiB0aGUgZ2FtZSBpcyBwYXVzZWRcbiAgICAgICAgKiBAdHJpZ2dlciBVbnBhdXNlIC0gd2hlbiB0aGUgZ2FtZSBpcyB1bnBhdXNlZFxuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5wYXVzZSh2b2lkKVxuICAgICAgICAqIFxuICAgICAgICAqIFBhdXNlcyB0aGUgZ2FtZSBieSBzdG9wcGluZyB0aGUgRW50ZXJGcmFtZSBldmVudCBmcm9tIGZpcmluZy4gSWYgdGhlIGdhbWUgaXMgYWxyZWFkeSBwYXVzZWQgaXQgaXMgdW5wYXVzZWQuXG4gICAgICAgICogWW91IGNhbiBwYXNzIGEgYm9vbGVhbiBwYXJhbWV0ZXIgaWYgeW91IHdhbnQgdG8gcGF1c2Ugb3IgdW5wYXVzZSBtbyBtYXR0ZXIgd2hhdCB0aGUgY3VycmVudCBzdGF0ZSBpcy5cbiAgICAgICAgKiBNb2Rlcm4gYnJvd3NlcnMgcGF1c2VzIHRoZSBnYW1lIHdoZW4gdGhlIHBhZ2UgaXMgbm90IHZpc2libGUgdG8gdGhlIHVzZXIuIElmIHlvdSB3YW50IHRoZSBQYXVzZSBldmVudFxuICAgICAgICAqIHRvIGJlIHRyaWdnZXJlZCB3aGVuIHRoYXQgaGFwcGVucyB5b3UgY2FuIGVuYWJsZSBhdXRvUGF1c2UgaW4gYENyYWZ0eS5zZXR0aW5nc2AuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiBIYXZlIGFuIGVudGl0eSBwYXVzZSB0aGUgZ2FtZSB3aGVuIGl0IGlzIGNsaWNrZWQuXG4gICAgICAgICogfn5+XG4gICAgICAgICogYnV0dG9uLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgICAgQ3JhZnR5LnBhdXNlKCk7XG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICovXG4gICAgICAgIHBhdXNlOiBmdW5jdGlvbiAodG9nZ2xlKSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxID8gdG9nZ2xlIDogIXRoaXMuX3BhdXNlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcignUGF1c2UnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgQ3JhZnR5LnRpbWVyLnN0b3AoKTsgfSwgMCk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LmtleWRvd24gPSB7fTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdVbnBhdXNlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpeyBDcmFmdHkudGltZXIuaW5pdCgpOyB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS5pc1BhdXNlZFxuICAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNQYXVzZWQoKVxuICAgICAgICAgKiBcbiAgICAgICAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2FtZSBpcyBhbHJlYWR5IHBhdXNlZCBvciBub3QuXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogQ3JhZnR5LmlzUGF1c2VkKCk7XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgaXNQYXVzZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudGltZXJcbiAgICAgICAgKiBAY2F0ZWdvcnkgSW50ZXJuYWxcbiAgICAgICAgKiBIYW5kbGVzIGdhbWUgdGlja3NcbiAgICAgICAgKi9cbiAgICAgICAgdGltZXI6IHtcbiAgICAgICAgICAgIHByZXY6ICgrbmV3IERhdGUpLFxuICAgICAgICAgICAgY3VycmVudDogKCtuZXcgRGF0ZSksXG4gICAgICAgICAgICBjdXJyZW50VGltZTogK25ldyBEYXRlKCksXG4gICAgICAgICAgICBmcmFtZXM6MCxcbiAgICAgICAgICAgIGZyYW1lVGltZTowLFxuICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIG51bGw7XG5cbiAgICAgICAgICAgICAgICBpZiAob25GcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnRpbWVyLnN0ZXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RJRCA9IG9uRnJhbWUodGljayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlcXVlc3RJRCArICcsICcgKyBmcmFtZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRpY2soKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aWNrID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkgeyBDcmFmdHkudGltZXIuc3RlcCgpOyB9LCAxMDAwIC8gRlBTKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJDcmFmdHlTdG9wVGltZXJcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRpY2sgPT09IFwibnVtYmVyXCIpIGNsZWFySW50ZXJ2YWwodGljayk7XG5cbiAgICAgICAgICAgICAgICB2YXIgb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LndlYmtpdENhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubW96Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5tc0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICBudWxsO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9uRnJhbWUpIG9uRnJhbWUocmVxdWVzdElEKTtcbiAgICAgICAgICAgICAgICB0aWNrID0gbnVsbDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS50aW1lci5zdGVwXG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS50aW1lclxuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudGltZXIuc3RlcCgpXG4gICAgICAgICAgICAqIEFkdmFuY2VzIHRoZSBnYW1lIGJ5IHRyaWdnZXJpbmcgYEVudGVyRnJhbWVgIGFuZCBjYWxscyBgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdgIHRvIHVwZGF0ZSB0aGUgc3RhZ2UuXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RlcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxvb3BzID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lID0gK25ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgLSBuZXh0R2FtZVRpY2sgPiA2MCAqIG1pbGxpU2VjUGVyRnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEdhbWVUaWNrID0gdGhpcy5jdXJyZW50VGltZSAtIG1pbGxpU2VjUGVyRnJhbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLmN1cnJlbnRUaW1lID4gbmV4dEdhbWVUaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS50cmlnZ2VyKFwiRW50ZXJGcmFtZVwiLCB7IGZyYW1lOiBmcmFtZSsrIH0pO1xuICAgICAgICAgICAgICAgICAgICBuZXh0R2FtZVRpY2sgKz0gbWlsbGlTZWNQZXJGcmFtZTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcHMrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxvb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgaWYodGhpcy5jdXJyZW50VGltZSA+IHRoaXMuZnJhbWVUaW1lKXtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJNZXNzdXJlRlBTXCIse3ZhbHVlOnRoaXMuZnJhbWV9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVUaW1lID0gdGhpcy5jdXJyZW50VGltZSArIDEwMDA7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWUrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAqICNDcmFmdHkudGltZXIuZ2V0RlBTXG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS50aW1lclxuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudGltZXIuZ2V0RlBTKClcbiAgICAgICAgICAgICogUmV0dXJucyB0aGUgdGFyZ2V0IGZyYW1lcyBwZXIgc2Vjb25kLiBUaGlzIGlzIG5vdCBhbiBhY3R1YWwgZnJhbWUgcmF0ZS5cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXRGUFM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRlBTO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnRpbWVyLnNpbXVsYXRlRnJhbWVzXG4gICAgICAgICAgICAqIEBjb21wIENyYWZ0eS50aW1lclxuICAgICAgICAgICAgKiBBZHZhbmNlcyB0aGUgZ2FtZSBzdGF0ZSBieSBhIG51bWJlciBvZiBmcmFtZXMgYW5kIGRyYXdzIHRoZSByZXN1bHRpbmcgc3RhZ2UgYXQgdGhlIGVuZC4gVXNlZnVsIGZvciB0ZXN0cyBhbmQgZGVidWdnaW5nLlxuICAgICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkudGltZXIuc2ltdWxhdGVGcmFtZXMoTnVtYmVyIGZyYW1lcylcbiAgICAgICAgICAgICogQHBhcmFtIGZyYW1lcyAtIG51bWJlciBvZiBmcmFtZXMgdG8gc2ltdWxhdGVcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBzaW11bGF0ZUZyYW1lczogZnVuY3Rpb24gKGZyYW1lcykge1xuICAgICAgICAgICAgICAgIHdoaWxlIChmcmFtZXMtLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJFbnRlckZyYW1lXCIsIHsgZnJhbWU6IGZyYW1lKysgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5hZGRFbnRpdHlGYWN0b3J5XG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAcGFyYW0gbmFtZSAtIE5hbWUgb2YgdGhlIGVudGl0eSBmYWN0b3J5LlxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIGNvbnRhaW5pbmcgdGhlIGVudGl0eSBjcmVhdGlvbiBwcm9jZWR1cmUuXG4gICAgICAgICogXG4gICAgICAgICogUmVnaXN0ZXJzIGFuIEVudGl0eSBGYWN0b3J5LiAgQW4gRW50aXR5IEZhY3RvcnkgYWxsb3dzIGZvciB0aGUgcmVwZWF0YWJsZSBjcmVhdGlvbiBvZiBhbiBFbnRpdHkuXG4gICAgICAgICpcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIENyYWZ0eS5hZGRFbnRpdHlGYWN0b3J5KCdQcm9qZWN0aWxlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICogICB2YXIgZW50aXR5ID0gQ3JhZnR5LmUoJzJELCBDYW52YXMsIENvbG9yLCBQaHlzaWNzLCBDb2xsaXNpb24nKVxuICAgICAgICAqICAgLmNvbG9yKFwicmVkXCIpXG4gICAgICAgICogICAuYXR0cih7XG4gICAgICAgICogICAgIHc6IDMsXG4gICAgICAgICogICAgIGg6IDMsXG4gICAgICAgICogICAgIHg6IHRoaXMueCxcbiAgICAgICAgKiAgICAgeTogdGhpcy55XG4gICAgICAgICogICB9KVxuICAgICAgICAqICAgLmFkZENvbXBvbmVudCgnR3Jhdml0eScpLmdyYXZpdHkoXCJGbG9vclwiKTtcbiAgICAgICAgKiAgIFxuICAgICAgICAqICAgcmV0dXJuIGVudGl0eTtcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5lXG4gICAgICAgICovXG4gICAgICAgIGFkZEVudGl0eUZhY3Rvcnk6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmVudGl0eUZhY3Rvcmllc1tuYW1lXSA9IGNhbGxiYWNrO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5Lm5ld0ZhY3RvcnlFbnRpdHlcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICAgICAqIEBwYXJhbSBuYW1lIC0gTmFtZSBvZiB0aGUgZW50aXR5IGZhY3RvcnkuXG4gICAgICAgICogXG4gICAgICAgICogQ3JlYXRlcyBhIG5ldyBlbnRpdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBFbnRpdHkgRmFjdG9yeS5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5LmFkZEVudGl0eUZhY3RvcnkoJ1Byb2plY3RpbGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgKiAgIHZhciBlbnRpdHkgPSBDcmFmdHkuZSgnMkQsIENhbnZhcywgQ29sb3IsIFBoeXNpY3MsIENvbGxpc2lvbicpXG4gICAgICAgICogICAuY29sb3IoXCJyZWRcIilcbiAgICAgICAgKiAgIC5hdHRyKHtcbiAgICAgICAgKiAgICAgdzogMyxcbiAgICAgICAgKiAgICAgaDogMyxcbiAgICAgICAgKiAgICAgeDogdGhpcy54LFxuICAgICAgICAqICAgICB5OiB0aGlzLnlcbiAgICAgICAgKiAgIH0pXG4gICAgICAgICogICAuYWRkQ29tcG9uZW50KCdHcmF2aXR5JykuZ3Jhdml0eShcIkZsb29yXCIpO1xuICAgICAgICAqICAgXG4gICAgICAgICogICByZXR1cm4gZW50aXR5O1xuICAgICAgICAqIH0pO1xuICAgICAgICAqXG4gICAgICAgICogQ3JhZnR5Lm5ld0ZhY3RvcnlFbnRpdHkoJ1Byb2plY3RpbGUnKTsgLy8gVGhpcyByZXR1cm5zIGEgbmV3IFByb2plY3RpbGUgRW50aXR5LlxuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmVcbiAgICAgICAgKi9cbiAgICAgICAgbmV3RmFjdG9yeUVudGl0eTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW50aXR5VGVtcGxhdGVzW25hbWVdKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZVxuICAgICAgICAqIEBjYXRlZ29yeSBDb3JlXG4gICAgICAgICogQHRyaWdnZXIgTmV3RW50aXR5IC0gV2hlbiB0aGUgZW50aXR5IGlzIGNyZWF0ZWQgYW5kIGFsbCBjb21wb25lbnRzIGFyZSBhZGRlZCAtIHsgaWQ6TnVtYmVyIH1cbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgRW50aXR5IENyYWZ0eS5lKFN0cmluZyBjb21wb25lbnRMaXN0KVxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnRMaXN0IC0gTGlzdCBvZiBjb21wb25lbnRzIHRvIGFzc2lnbiB0byBuZXcgZW50aXR5XG4gICAgICAgICogQHNpZ24gcHVibGljIEVudGl0eSBDcmFmdHkuZShTdHJpbmcgY29tcG9uZW50MVssIC4uLCBTdHJpbmcgY29tcG9uZW50Tl0pXG4gICAgICAgICogQHBhcmFtIGNvbXBvbmVudCMgLSBDb21wb25lbnQgdG8gYWRkXG4gICAgICAgICogXG4gICAgICAgICogQ3JlYXRlcyBhbiBlbnRpdHkuIEFueSBhcmd1bWVudHMgd2lsbCBiZSBhcHBsaWVkIGluIHRoZSBzYW1lXG4gICAgICAgICogd2F5IGAuYWRkQ29tcG9uZW50KClgIGlzIGFwcGxpZWQgYXMgYSBxdWljayB3YXkgdG8gYWRkIGNvbXBvbmVudHMuXG4gICAgICAgICpcbiAgICAgICAgKiBBbnkgY29tcG9uZW50IGFkZGVkIHdpbGwgYXVnbWVudCB0aGUgZnVuY3Rpb25hbGl0eSBvZlxuICAgICAgICAqIHRoZSBjcmVhdGVkIGVudGl0eSBieSBhc3NpZ25pbmcgdGhlIHByb3BlcnRpZXMgYW5kIG1ldGhvZHMgZnJvbSB0aGUgY29tcG9uZW50IHRvIHRoZSBlbnRpdHkuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgbXlFbnRpdHkgPSBDcmFmdHkuZShcIjJELCBET00sIENvbG9yXCIpO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmNcbiAgICAgICAgKi9cbiAgICAgICAgZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gVUlEKCksIGNyYWZ0O1xuXG4gICAgICAgICAgICBlbnRpdGllc1tpZF0gPSBudWxsOyAvL3JlZ2lzdGVyIHRoZSBzcGFjZVxuICAgICAgICAgICAgZW50aXRpZXNbaWRdID0gY3JhZnQgPSBDcmFmdHkoaWQpO1xuXG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjcmFmdC5hZGRDb21wb25lbnQuYXBwbHkoY3JhZnQsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjcmFmdC5zZXROYW1lKCdFbnRpdHkgIycraWQpOyAvL3NldCBkZWZhdWx0IGVudGl0eSBodW1hbiByZWFkYWJsZSBuYW1lXG4gICAgICAgICAgICBjcmFmdC5hZGRDb21wb25lbnQoXCJvYmpcIik7IC8vZXZlcnkgZW50aXR5IGF1dG9tYXRpY2FsbHkgYXNzdW1lcyBvYmpcblxuICAgICAgICAgICAgQ3JhZnR5LnRyaWdnZXIoXCJOZXdFbnRpdHlcIiwgeyBpZDogaWQgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjcmFmdDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5jXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuYyhTdHJpbmcgbmFtZSwgT2JqZWN0IGNvbXBvbmVudClcbiAgICAgICAgKiBAcGFyYW0gbmFtZSAtIE5hbWUgb2YgdGhlIGNvbXBvbmVudFxuICAgICAgICAqIEBwYXJhbSBjb21wb25lbnQgLSBPYmplY3Qgd2l0aCB0aGUgY29tcG9uZW50cyBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzXG4gICAgICAgICogQ3JlYXRlcyBhIGNvbXBvbmVudCB3aGVyZSB0aGUgZmlyc3QgYXJndW1lbnQgaXMgdGhlIElEIGFuZCB0aGUgc2Vjb25kXG4gICAgICAgICogaXMgdGhlIG9iamVjdCB0aGF0IHdpbGwgYmUgaW5oZXJpdGVkIGJ5IGVudGl0aWVzLlxuICAgICAgICAqXG4gICAgICAgICogVGhlcmUgaXMgYSBjb252ZW50aW9uIGZvciB3cml0aW5nIGNvbXBvbmVudHMuIFxuICAgICAgICAqXG4gICAgICAgICogLSBQcm9wZXJ0aWVzIG9yIG1ldGhvZHMgdGhhdCBzdGFydCB3aXRoIGFuIHVuZGVyc2NvcmUgYXJlIGNvbnNpZGVyZWQgcHJpdmF0ZS5cbiAgICAgICAgKiAtIEEgbWV0aG9kIGNhbGxlZCBgaW5pdGAgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIGNhbGxlZCBhcyBzb29uIGFzIHRoZVxuICAgICAgICAqIGNvbXBvbmVudCBpcyBhZGRlZCB0byBhbiBlbnRpdHkuXG4gICAgICAgICogLSBBIG1ldGhvZCB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgdGhlIGNvbXBvbmVudCBpcyBjb25zaWRlcmVkIHRvIGJlIGEgY29uc3RydWN0b3JcbiAgICAgICAgKiBhbmQgaXMgZ2VuZXJhbGx5IHVzZWQgd2hlbiB5b3UgbmVlZCB0byBwYXNzIGNvbmZpZ3VyYXRpb24gZGF0YSB0byB0aGUgY29tcG9uZW50IG9uIGEgcGVyIGVudGl0eSBiYXNpcy5cbiAgICAgICAgKlxuICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICogfn5+XG4gICAgICAgICogQ3JhZnR5LmMoXCJBbm5veWluZ1wiLCB7XG4gICAgICAgICogICAgIF9tZXNzYWdlOiBcIkhpSGlcIixcbiAgICAgICAgKiAgICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICogICAgICAgICB0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uKCkgeyBhbGVydCh0aGlzLm1lc3NhZ2UpOyB9KTtcbiAgICAgICAgKiAgICAgfSxcbiAgICAgICAgKiAgICAgYW5ub3lpbmc6IGZ1bmN0aW9uKG1lc3NhZ2UpIHsgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTsgfVxuICAgICAgICAqIH0pO1xuICAgICAgICAqXG4gICAgICAgICogQ3JhZnR5LmUoXCJBbm5veWluZ1wiKS5hbm5veWluZyhcIkknbSBhbiBvcmFuZ2UuLi5cIik7XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBcbiAgICAgICAgKiBXQVJOSU5HOiBcbiAgICAgICAgKlxuICAgICAgICAqIGluIHRoZSBleGFtcGxlIGFib3ZlIHRoZSBmaWVsZCBfbWVzc2FnZSBpcyBsb2NhbCB0byB0aGUgZW50aXR5LiBUaGF0IGlzLCBpZiB5b3UgY3JlYXRlIG1hbnkgZW50aXRpZXMgd2l0aCB0aGUgQW5ub3lpbmcgY29tcG9uZW50IHRoZXkgY2FuIGFsbCBoYXZlIGRpZmZlcmVudCB2YWx1ZXMgZm9yIF9tZXNzYWdlLiBUaGF0IGlzIGJlY2F1c2UgaXQgaXMgYSBzaW1wbGUgdmFsdWUsIGFuZCBzaW1wbGUgdmFsdWVzIGFyZSBjb3BpZWQgYnkgdmFsdWUuIElmIGhvd2V2ZXIgdGhlIGZpZWxkIGhhZCBiZWVuIGFuIG9iamVjdCBvciBhcnJheSwgdGhlIHZhbHVlIHdvdWxkIGhhdmUgYmVlbiBzaGFyZWQgYnkgYWxsIGVudGl0aWVzIHdpdGggdGhlIGNvbXBvbmVudCBiZWNhdXNlIGNvbXBsZXggdHlwZXMgYXJlIGNvcGllZCBieSByZWZlcmVuY2UgaW4gamF2YXNjcmlwdC4gVGhpcyBpcyBwcm9iYWJseSBub3Qgd2hhdCB5b3Ugd2FudCBhbmQgdGhlIGZvbGxvd2luZyBleGFtcGxlIGRlbW9uc3RyYXRlcyBob3cgdG8gd29yayBhcm91bmQgaXQ6XG4gICAgICAgICpcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBDcmFmdHkuYyhcIk15Q29tcG9uZW50XCIsIHtcbiAgICAgICAgKiAgICAgX2lBbVNoYXJlZDogeyBhOiAzLCBiOiA0IH0sXG4gICAgICAgICogICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAqICAgICAgICAgdGhpcy5faUFtTm90U2hhcmVkID0geyBhOiAzLCBiOiA0IH07XG4gICAgICAgICogICAgIH0sXG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5lXG4gICAgICAgICovXG4gICAgICAgIGM6IGZ1bmN0aW9uIChjb21wTmFtZSwgY29tcG9uZW50KSB7XG4gICAgICAgICAgICBjb21wb25lbnRzW2NvbXBOYW1lXSA9IGNvbXBvbmVudDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS50cmlnZ2VyXG4gICAgICAgICogQGNhdGVnb3J5IENvcmUsIEV2ZW50c1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS50cmlnZ2VyKFN0cmluZyBldmVudE5hbWUsICogZGF0YSlcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnQgdG8gdHJpZ2dlclxuICAgICAgICAqIEBwYXJhbSBkYXRhIC0gQXJiaXRyYXJ5IGRhdGEgdG8gcGFzcyBpbnRvIHRoZSBjYWxsYmFjayBhcyBhbiBhcmd1bWVudFxuICAgICAgICAqIFxuICAgICAgICAqIFRoaXMgbWV0aG9kIHdpbGwgdHJpZ2dlciBldmVyeSBzaW5nbGUgY2FsbGJhY2sgYXR0YWNoZWQgdG8gdGhlIGV2ZW50IG5hbWUuIFRoaXMgbWVhbnNcbiAgICAgICAgKiBldmVyeSBnbG9iYWwgZXZlbnQgYW5kIGV2ZXJ5IGVudGl0eSB0aGF0IGhhcyBhIGNhbGxiYWNrLlxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmJpbmRcbiAgICAgICAgKi9cbiAgICAgICAgdHJpZ2dlcjogZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgaGRsID0gaGFuZGxlcnNbZXZlbnRdLCBoLCBpLCBsO1xuICAgICAgICAgICAgLy9sb29wIG92ZXIgZXZlcnkgb2JqZWN0IGJvdW5kXG4gICAgICAgICAgICBmb3IgKGggaW4gaGRsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoZGwuaGFzT3duUHJvcGVydHkoaCkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgLy9sb29wIG92ZXIgZXZlcnkgaGFuZGxlciB3aXRoaW4gb2JqZWN0XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGhkbFtoXS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhkbFtoXSAmJiBoZGxbaF1baV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaWYgYW4gZW50aXR5LCBjYWxsIHdpdGggdGhhdCBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXRpZXNbaF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZGxbaF1baV0uY2FsbChDcmFmdHkoK2gpLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vZWxzZSBjYWxsIHdpdGggQ3JhZnR5IGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZGxbaF1baV0uY2FsbChDcmFmdHksIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmJpbmRcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZSwgRXZlbnRzXG4gICAgICAgICogQHNpZ24gcHVibGljIE51bWJlciBiaW5kKFN0cmluZyBldmVudE5hbWUsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgLSBOYW1lIG9mIHRoZSBldmVudCB0byBiaW5kIHRvXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgdXBvbiBldmVudCB0cmlnZ2VyZWRcbiAgICAgICAgKiBAcmV0dXJucyBJRCBvZiB0aGUgY3VycmVudCBjYWxsYmFjayB1c2VkIHRvIHVuYmluZFxuICAgICAgICAqIFxuICAgICAgICAqIEJpbmRzIHRvIGEgZ2xvYmFsIGV2ZW50LiBNZXRob2Qgd2lsbCBiZSBleGVjdXRlZCB3aGVuIGBDcmFmdHkudHJpZ2dlcmAgaXMgdXNlZFxuICAgICAgICAqIHdpdGggdGhlIGV2ZW50IG5hbWUuXG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkudHJpZ2dlciwgQ3JhZnR5LnVuYmluZFxuICAgICAgICAqL1xuICAgICAgICBiaW5kOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoIWhhbmRsZXJzW2V2ZW50XSkgaGFuZGxlcnNbZXZlbnRdID0ge307XG4gICAgICAgICAgICB2YXIgaGRsID0gaGFuZGxlcnNbZXZlbnRdO1xuXG4gICAgICAgICAgICBpZiAoIWhkbC5nbG9iYWwpIGhkbC5nbG9iYWwgPSBbXTtcbiAgICAgICAgICAgIHJldHVybiBoZGwuZ2xvYmFsLnB1c2goY2FsbGJhY2spIC0gMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS51bmJpbmRcbiAgICAgICAgKiBAY2F0ZWdvcnkgQ29yZSwgRXZlbnRzXG4gICAgICAgICogQHNpZ24gcHVibGljIEJvb2xlYW4gQ3JhZnR5LnVuYmluZChTdHJpbmcgZXZlbnROYW1lLCBGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnQgdG8gdW5iaW5kXG4gICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gdW5iaW5kXG4gICAgICAgICogQHNpZ24gcHVibGljIEJvb2xlYW4gQ3JhZnR5LnVuYmluZChTdHJpbmcgZXZlbnROYW1lLCBOdW1iZXIgY2FsbGJhY2tJRClcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2tJRCAtIElEIG9mIHRoZSBjYWxsYmFja1xuICAgICAgICAqIEByZXR1cm5zIFRydWUgb3IgZmFsc2UgZGVwZW5kaW5nIG9uIGlmIGEgY2FsbGJhY2sgd2FzIHVuYm91bmRcbiAgICAgICAgKiBVbmJpbmQgYW55IGV2ZW50IGZyb20gYW55IGVudGl0eSBvciBnbG9iYWwgZXZlbnQuXG4gICAgICAgICovXG4gICAgICAgIHVuYmluZDogZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGhkbCA9IGhhbmRsZXJzW2V2ZW50XSwgaCwgaSwgbDtcblxuICAgICAgICAgICAgLy9sb29wIG92ZXIgZXZlcnkgb2JqZWN0IGJvdW5kXG4gICAgICAgICAgICBmb3IgKGggaW4gaGRsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoZGwuaGFzT3duUHJvcGVydHkoaCkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgLy9pZiBwYXNzZWQgdGhlIElEXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaGRsW2hdW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9sb29wIG92ZXIgZXZlcnkgaGFuZGxlciB3aXRoaW4gb2JqZWN0XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGhkbFtoXS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhkbFtoXVtpXSA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBoZGxbaF1baV07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LmZyYW1lXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5mcmFtZSh2b2lkKVxuICAgICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZnJhbWUgbnVtYmVyXG4gICAgICAgICovXG4gICAgICAgIGZyYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZnJhbWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcG9uZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNDb21wOiBmdW5jdGlvbiAoY29tcCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXAgaW4gY29tcG9uZW50cztcbiAgICAgICAgfSxcblxuICAgICAgICBkZWJ1ZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGVudGl0aWVzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnNldHRpbmdzXG4gICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgKiBNb2RpZnkgdGhlIGlubmVyIHdvcmtpbmdzIG9mIENyYWZ0eSB0aHJvdWdoIHRoZSBzZXR0aW5ncy5cbiAgICAgICAgKi9cbiAgICAgICAgc2V0dGluZ3M6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGVzID0ge30sXG4gICAgICAgICAgICBjYWxsYmFja3MgPSB7fTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlclxuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkuc2V0dGluZ3NcbiAgICAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyKFN0cmluZyBzZXR0aW5nTmFtZSwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgICAgICAgICAqIEBwYXJhbSBzZXR0aW5nTmFtZSAtIE5hbWUgb2YgdGhlIHNldHRpbmdcbiAgICAgICAgICAgICogQHBhcmFtIGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHVzZSBtb2RpZmllcyBzZXR0aW5nXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBVc2UgdGhpcyB0byByZWdpc3RlciBjdXN0b20gc2V0dGluZ3MuIENhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWQgd2hlbiBgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeWAgaXMgdXNlZC5cbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIEBzZWUgQ3JhZnR5LnNldHRpbmdzLm1vZGlmeVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNldHRpbmcsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tzZXR0aW5nXSA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICogI0NyYWZ0eS5zZXR0aW5ncy5tb2RpZnlcbiAgICAgICAgICAgICogQGNvbXAgQ3JhZnR5LnNldHRpbmdzXG4gICAgICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5zZXR0aW5ncy5tb2RpZnkoU3RyaW5nIHNldHRpbmdOYW1lLCAqIHZhbHVlKVxuICAgICAgICAgICAgKiBAcGFyYW0gc2V0dGluZ05hbWUgLSBOYW1lIG9mIHRoZSBzZXR0aW5nXG4gICAgICAgICAgICAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIHNldCB0aGUgc2V0dGluZyB0b1xuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogTW9kaWZ5IHNldHRpbmdzIHRocm91Z2ggdGhpcyBtZXRob2QuXG4gICAgICAgICAgICAqIFxuICAgICAgICAgICAgKiBAc2VlIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlciwgQ3JhZnR5LnNldHRpbmdzLmdldFxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtb2RpZnk6IGZ1bmN0aW9uIChzZXR0aW5nLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrc1tzZXR0aW5nXSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Nbc2V0dGluZ10uY2FsbChzdGF0ZXNbc2V0dGluZ10sIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzW3NldHRpbmddID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgKiAjQ3JhZnR5LnNldHRpbmdzLmdldFxuICAgICAgICAgICAgKiBAY29tcCBDcmFmdHkuc2V0dGluZ3NcbiAgICAgICAgICAgICogQHNpZ24gcHVibGljICogQ3JhZnR5LnNldHRpbmdzLmdldChTdHJpbmcgc2V0dGluZ05hbWUpXG4gICAgICAgICAgICAqIEBwYXJhbSBzZXR0aW5nTmFtZSAtIE5hbWUgb2YgdGhlIHNldHRpbmdcbiAgICAgICAgICAgICogQHJldHVybnMgQ3VycmVudCB2YWx1ZSBvZiB0aGUgc2V0dGluZ1xuICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICogUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgc2V0dGluZy5cbiAgICAgICAgICAgICogXG4gICAgICAgICAgICAqIEBzZWUgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyLCBDcmFmdHkuc2V0dGluZ3MuZ2V0XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKHNldHRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlc1tzZXR0aW5nXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSgpLFxuXG4gICAgICAgIGNsb25lOiBjbG9uZVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgKiBSZXR1cm4gYSB1bmlxdWUgSURcbiAgICAqL1xuICAgIGZ1bmN0aW9uIFVJRCgpIHtcbiAgICAgICAgdmFyIGlkID0gR1VJRCsrO1xuICAgICAgICAvL2lmIEdVSUQgaXMgbm90IHVuaXF1ZVxuICAgICAgICBpZiAoaWQgaW4gZW50aXRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBVSUQoKTsgLy9yZWN1cnNlIHVudGlsIGl0IGlzIHVuaXF1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmNsb25lXG4gICAgKiBAY2F0ZWdvcnkgQ29yZVxuICAgICogQHNpZ24gcHVibGljIE9iamVjdCAuY2xvbmUoT2JqZWN0IG9iailcbiAgICAqIEBwYXJhbSBvYmogLSBhbiBvYmplY3RcbiAgICAqIFxuICAgICogRGVlcCBjb3B5IChhLmsuYSBjbG9uZSkgb2YgYW4gb2JqZWN0LlxuICAgICovXG4gICAgZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gICAgICAgIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mKG9iaikgIT0gJ29iamVjdCcpXG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuXG4gICAgICAgIHZhciB0ZW1wID0gb2JqLmNvbnN0cnVjdG9yKCk7IC8vIGNoYW5nZWRcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKVxuICAgICAgICAgICAgdGVtcFtrZXldID0gY2xvbmUob2JqW2tleV0pO1xuICAgICAgICByZXR1cm4gdGVtcDtcbiAgICB9XG5cbiAgICBDcmFmdHkuYmluZChcIkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIUNyYWZ0eS5zdXBwb3J0LnNldHRlciAmJiBDcmFmdHkuc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eSkge1xuICAgICAgICAgICAgbm9TZXR0ZXIgPSBbXTtcbiAgICAgICAgICAgIENyYWZ0eS5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSAwLCBsID0gbm9TZXR0ZXIubGVuZ3RoLCBjdXJyZW50O1xuICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBub1NldHRlcltpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQub2JqW2N1cnJlbnQucHJvcF0gIT09IGN1cnJlbnQub2JqWydfJyArIGN1cnJlbnQucHJvcF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQuZm4uY2FsbChjdXJyZW50Lm9iaiwgY3VycmVudC5vYmpbY3VycmVudC5wcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaW5pdENvbXBvbmVudHMoQ3JhZnR5LCB3aW5kb3csIHdpbmRvdy5kb2N1bWVudCk7XG5cbiAgICAvL21ha2UgQ3JhZnR5IGdsb2JhbFxuICAgIHdpbmRvdy5DcmFmdHkgPSBDcmFmdHk7XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkZWZpbmUoJ2NyYWZ0eScsIFtdLCBmdW5jdGlvbigpIHsgcmV0dXJuIENyYWZ0eTsgfSk7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDcmFmdHk7XG59KSh3aW5kb3csXG5cbi8vd3JhcCBhcm91bmQgY29tcG9uZW50c1xuZnVuY3Rpb24oQ3JhZnR5LCB3aW5kb3csIGRvY3VtZW50KSB7XG5cbi8qKlxuKiBTcGF0aWFsIEhhc2hNYXAgZm9yIGJyb2FkIHBoYXNlIGNvbGxpc2lvblxuKlxuKiBAYXV0aG9yIExvdWlzIFN0b3dhc3NlclxuKi9cbihmdW5jdGlvbiAocGFyZW50KSB7XG5cblxuXHQvKipAXG5cdCogI0NyYWZ0eS5IYXNoTWFwLmNvbnN0cnVjdG9yXG5cdCogQGNvbXAgQ3JhZnR5Lkhhc2hNYXBcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkuSGFzaE1hcChbY2VsbHNpemVdKVxuXHQqIEBwYXJhbSBjZWxsc2l6ZSAtIHRoZSBjZWxsIHNpemUuIElmIG9taXR0ZWQsIGBjZWxsc2l6ZWAgaXMgNjQuXG5cdCogXG4gICAgKiBTZXQgYGNlbGxzaXplYC5cbiAgICAqIEFuZCBjcmVhdGUgYHRoaXMubWFwYC5cblx0Ki9cblx0dmFyIGNlbGxzaXplLFxuXG5cdEhhc2hNYXAgPSBmdW5jdGlvbiAoY2VsbCkge1xuXHRcdGNlbGxzaXplID0gY2VsbCB8fCA2NDtcblx0XHR0aGlzLm1hcCA9IHt9O1xuXHR9LFxuXG5cdFNQQUNFID0gXCIgXCI7XG5cblx0SGFzaE1hcC5wcm90b3R5cGUgPSB7XG5cdC8qKkBcblx0KiAjQ3JhZnR5Lm1hcC5pbnNlcnRcblx0KiBAY29tcCBDcmFmdHkubWFwXG4gICAgKiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5tYXAuaW5zZXJ0KE9iamVjdCBvYmopXG5cdCogQHBhcmFtIG9iaiAtIEFuIGVudGl0eSB0byBiZSBpbnNlcnRlZC5cblx0KiBcbiAgICAqIGBvYmpgIGlzIGluc2VydGVkIGluICcubWFwJyBvZiB0aGUgY29ycmVzcG9uZGluZyBicm9hZCBwaGFzZSBjZWxscy4gQW4gb2JqZWN0IG9mIHRoZSBmb2xsb3dpbmcgZmllbGRzIGlzIHJldHVybmVkLlxuICAgICogfn5+XG4gICAgKiAtIHRoZSBvYmplY3QgdGhhdCBrZWVwIHRyYWNrIG9mIGNlbGxzIChrZXlzKVxuICAgICogLSBgb2JqYFxuICAgICogLSB0aGUgSGFzaE1hcCBvYmplY3RcbiAgICAqIH5+flxuXHQqL1xuXHRcdGluc2VydDogZnVuY3Rpb24gKG9iaikge1xuXHRcdFx0dmFyIGtleXMgPSBIYXNoTWFwLmtleShvYmopLFxuXHRcdFx0ZW50cnkgPSBuZXcgRW50cnkoa2V5cywgb2JqLCB0aGlzKSxcblx0XHRcdGkgPSAwLFxuXHRcdFx0aixcblx0XHRcdGhhc2g7XG5cblx0XHRcdC8vaW5zZXJ0IGludG8gYWxsIHggYnVja2V0c1xuXHRcdFx0Zm9yIChpID0ga2V5cy54MTsgaSA8PSBrZXlzLngyOyBpKyspIHtcblx0XHRcdFx0Ly9pbnNlcnQgaW50byBhbGwgeSBidWNrZXRzXG5cdFx0XHRcdGZvciAoaiA9IGtleXMueTE7IGogPD0ga2V5cy55MjsgaisrKSB7XG5cdFx0XHRcdFx0aGFzaCA9IGkgKyBTUEFDRSArIGo7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLm1hcFtoYXNoXSkgdGhpcy5tYXBbaGFzaF0gPSBbXTtcblx0XHRcdFx0XHR0aGlzLm1hcFtoYXNoXS5wdXNoKG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGVudHJ5O1xuXHRcdH0sXG5cblx0LyoqQFxuXHQqICNDcmFmdHkubWFwLnNlYXJjaFxuXHQqIEBjb21wIENyYWZ0eS5tYXBcbiAgICAqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5Lm1hcC5zZWFyY2goT2JqZWN0IHJlY3RbLCBCb29sZWFuIGZpbHRlcl0pXG5cdCogQHBhcmFtIHJlY3QgLSB0aGUgcmVjdGFuZ3VsYXIgcmVnaW9uIHRvIHNlYXJjaCBmb3IgZW50aXRpZXMuXG5cdCogQHBhcmFtIGZpbHRlciAtIERlZmF1bHQgdmFsdWUgaXMgdHJ1ZS4gT3RoZXJ3aXNlLCBtdXN0IGJlIGZhbHNlLlxuXHQqIFxuICAgICogLSBJZiBgZmlsdGVyYCBpcyBgZmFsc2VgLCBqdXN0IHNlYXJjaCBmb3IgYWxsIHRoZSBlbnRyaWVzIGluIHRoZSBnaXZlIGByZWN0YCByZWdpb24gYnkgYnJvYWQgcGhhc2UgY29sbGlzaW9uLiBFbnRpdHkgbWF5IGJlIHJldHVybmVkIGR1cGxpY2F0ZWQuXG4gICAgKiAtIElmIGBmaWx0ZXJgIGlzIGB0cnVlYCwgZmlsdGVyIHRoZSBhYm92ZSByZXN1bHRzIGJ5IGNoZWNraW5nIHRoYXQgdGhleSBhY3R1YWxseSBvdmVybGFwIGByZWN0YC5cbiAgICAqIFRoZSBlYXNpZXIgdXNhZ2UgaXMgd2l0aCBgZmlsdGVyYD1gdHJ1ZWAuIEZvciBwZXJmb3JtYW5jZSByZWFzb24sIHlvdSBtYXkgdXNlIGBmaWx0ZXJgPWBmYWxzZWAsIGFuZCBmaWx0ZXIgdGhlIHJlc3VsdCB5b3Vyc2VsZi4gU2VlIGV4YW1wbGVzIGluIGRyYXdpbmcuanMgYW5kIGNvbGxpc2lvbi5qc1xuXHQqL1xuXHRcdHNlYXJjaDogZnVuY3Rpb24gKHJlY3QsIGZpbHRlcikge1xuXHRcdFx0dmFyIGtleXMgPSBIYXNoTWFwLmtleShyZWN0KSxcblx0XHRcdGksIGosXG5cdFx0XHRoYXNoLFxuXHRcdFx0cmVzdWx0cyA9IFtdO1xuXG5cdFx0XHRpZiAoZmlsdGVyID09PSB1bmRlZmluZWQpIGZpbHRlciA9IHRydWU7IC8vZGVmYXVsdCBmaWx0ZXIgdG8gdHJ1ZVxuXG5cdFx0XHQvL3NlYXJjaCBpbiBhbGwgeCBidWNrZXRzXG5cdFx0XHRmb3IgKGkgPSBrZXlzLngxOyBpIDw9IGtleXMueDI7IGkrKykge1xuXHRcdFx0XHQvL2luc2VydCBpbnRvIGFsbCB5IGJ1Y2tldHNcblx0XHRcdFx0Zm9yIChqID0ga2V5cy55MTsgaiA8PSBrZXlzLnkyOyBqKyspIHtcblx0XHRcdFx0XHRoYXNoID0gaSArIFNQQUNFICsgajtcblxuXHRcdFx0XHRcdGlmICh0aGlzLm1hcFtoYXNoXSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHRoaXMubWFwW2hhc2hdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGZpbHRlcikge1xuXHRcdFx0XHR2YXIgb2JqLCBpZCwgZmluYWxyZXN1bHQgPSBbXSwgZm91bmQgPSB7fTtcblx0XHRcdFx0Ly9hZGQgdW5pcXVlIGVsZW1lbnRzIHRvIGxvb2t1cCB0YWJsZSB3aXRoIHRoZSBlbnRpdHkgSUQgYXMgdW5pcXVlIGtleVxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gcmVzdWx0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRvYmogPSByZXN1bHRzW2ldO1xuXHRcdFx0XHRcdGlmICghb2JqKSBjb250aW51ZTsgLy9za2lwIGlmIGRlbGV0ZWRcblx0XHRcdFx0XHRpZCA9IG9ialswXTsgLy91bmlxdWUgSURcblxuXHRcdFx0XHRcdC8vY2hlY2sgaWYgbm90IGFkZGVkIHRvIGhhc2ggYW5kIHRoYXQgYWN0dWFsbHkgaW50ZXJzZWN0c1xuXHRcdFx0XHRcdGlmICghZm91bmRbaWRdICYmIG9iai54IDwgcmVjdC5feCArIHJlY3QuX3cgJiYgb2JqLl94ICsgb2JqLl93ID4gcmVjdC5feCAmJlxuXHRcdFx0XHRcdFx0XHRcdCBvYmoueSA8IHJlY3QuX3kgKyByZWN0Ll9oICYmIG9iai5faCArIG9iai5feSA+IHJlY3QuX3kpXG5cdFx0XHRcdFx0XHRmb3VuZFtpZF0gPSByZXN1bHRzW2ldO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9sb29wIG92ZXIgbG9va3VwIHRhYmxlIGFuZCBjb3B5IHRvIGZpbmFsIGFycmF5XG5cdFx0XHRcdGZvciAob2JqIGluIGZvdW5kKSBmaW5hbHJlc3VsdC5wdXNoKGZvdW5kW29ial0pO1xuXG5cdFx0XHRcdHJldHVybiBmaW5hbHJlc3VsdDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiByZXN1bHRzO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0LyoqQFxuXHQqICNDcmFmdHkubWFwLnJlbW92ZVxuXHQqIEBjb21wIENyYWZ0eS5tYXBcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkubWFwLnJlbW92ZShbT2JqZWN0IGtleXMsIF1PYmplY3Qgb2JqKVxuXHQqIEBwYXJhbSBrZXlzIC0ga2V5IHJlZ2lvbi4gSWYgb21pdHRlZCwgaXQgd2lsbCBiZSBkZXJpdmVkIGZyb20gb2JqIGJ5IGBDcmFmdHkuSGFzaE1hcC5rZXlgLlxuXHQqIEBwYXJhbSBvYmogLSBuZWVkIG1vcmUgZG9jdW1lbnQuXG5cdCogXG5cdCogUmVtb3ZlIGFuIGVudGl0eSBpbiBhIGJyb2FkIHBoYXNlIG1hcC5cblx0KiAtIFRoZSBzZWNvbmQgZm9ybSBpcyBvbmx5IHVzZWQgaW4gQ3JhZnR5Lkhhc2hNYXAgdG8gc2F2ZSB0aW1lIGZvciBjb21wdXRpbmcga2V5cyBhZ2Fpbiwgd2hlcmUga2V5cyB3ZXJlIGNvbXB1dGVkIHByZXZpb3VzbHkgZnJvbSBvYmouIEVuZCB1c2VycyBzaG91bGQgbm90IGNhbGwgdGhpcyBmb3JtIGRpcmVjdGx5LlxuXHQqXG5cdCogQGV4YW1wbGUgXG5cdCogfn5+XG5cdCogQ3JhZnR5Lm1hcC5yZW1vdmUoZSk7XG5cdCogfn5+XG5cdCovXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbiAoa2V5cywgb2JqKSB7XG5cdFx0XHR2YXIgaSA9IDAsIGosIGhhc2g7XG5cblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0b2JqID0ga2V5cztcblx0XHRcdFx0a2V5cyA9IEhhc2hNYXAua2V5KG9iaik7XG5cdFx0XHR9XG5cblx0XHRcdC8vc2VhcmNoIGluIGFsbCB4IGJ1Y2tldHNcblx0XHRcdGZvciAoaSA9IGtleXMueDE7IGkgPD0ga2V5cy54MjsgaSsrKSB7XG5cdFx0XHRcdC8vaW5zZXJ0IGludG8gYWxsIHkgYnVja2V0c1xuXHRcdFx0XHRmb3IgKGogPSBrZXlzLnkxOyBqIDw9IGtleXMueTI7IGorKykge1xuXHRcdFx0XHRcdGhhc2ggPSBpICsgU1BBQ0UgKyBqO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXMubWFwW2hhc2hdKSB7XG5cdFx0XHRcdFx0XHR2YXIgY2VsbCA9IHRoaXMubWFwW2hhc2hdLFxuXHRcdFx0XHRcdFx0bSxcblx0XHRcdFx0XHRcdG4gPSBjZWxsLmxlbmd0aDtcblx0XHRcdFx0XHRcdC8vbG9vcCBvdmVyIG9ianMgaW4gY2VsbCBhbmQgZGVsZXRlXG5cdFx0XHRcdFx0XHRmb3IgKG0gPSAwOyBtIDwgbjsgbSsrKVxuXHRcdFx0XHRcdFx0XHRpZiAoY2VsbFttXSAmJiBjZWxsW21dWzBdID09PSBvYmpbMF0pXG5cdFx0XHRcdFx0XHRcdFx0Y2VsbC5zcGxpY2UobSwgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS5tYXAuYm91bmRhcmllc1xuXHQqIEBjb21wIENyYWZ0eS5tYXBcblx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IENyYWZ0eS5tYXAuYm91bmRhcmllcygpXG5cdCogXG4gICAgKiBUaGUgcmV0dXJuIGBPYmplY3RgIGlzIG9mIHRoZSBmb2xsb3dpbmcgZm9ybWF0LlxuICAgICogfn5+XG5cdCoge1xuICAgICogICBtaW46IHtcbiAgICAqICAgICB4OiB2YWxfeCxcbiAgICAqICAgICB5OiB2YWxfeVxuICAgICogICB9LFxuICAgICogICBtYXg6IHtcbiAgICAqICAgICB4OiB2YWxfeCxcbiAgICAqICAgICB5OiB2YWxfeVxuICAgICogICB9XG4gICAgKiB9XG4gICAgKiB+fn5cblx0Ki9cblx0XHRib3VuZGFyaWVzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgaywgZW50LFxuXHRcdFx0aGFzaCA9IHtcblx0XHRcdFx0bWF4OiB7IHg6IC1JbmZpbml0eSwgeTogLUluZmluaXR5IH0sXG5cdFx0XHRcdG1pbjogeyB4OiBJbmZpbml0eSwgeTogSW5maW5pdHkgfVxuXHRcdFx0fSxcblx0XHRcdGNvb3JkcyA9IHtcblx0XHRcdFx0bWF4OiB7IHg6IC1JbmZpbml0eSwgeTogLUluZmluaXR5IH0sXG5cdFx0XHRcdG1pbjogeyB4OiBJbmZpbml0eSwgeTogSW5maW5pdHkgfVxuXHRcdFx0fTtcblxuICAgICAgLy9Vc2luZyBicm9hZCBwaGFzZSBoYXNoIHRvIHNwZWVkIHVwIHRoZSBjb21wdXRhdGlvbiBvZiBib3VuZGFyaWVzLlxuXHRcdFx0Zm9yICh2YXIgaCBpbiB0aGlzLm1hcCkge1xuXHRcdFx0XHRpZiAoIXRoaXMubWFwW2hdLmxlbmd0aCkgY29udGludWU7XG5cbiAgICAgICAgLy9icm9hZCBwaGFzZSBjb29yZGluYXRlXG5cdFx0XHRcdHZhciBtYXBfY29vcmQgPSBoLnNwbGl0KFNQQUNFKSxcblx0XHRcdFx0XHRpPW1hcF9jb29yZFswXSxcblx0XHRcdFx0XHRqPW1hcF9jb29yZFswXTtcblx0XHRcdFx0aWYgKGkgPj0gaGFzaC5tYXgueCkge1xuXHRcdFx0XHRcdGhhc2gubWF4LnggPSBpO1xuXHRcdFx0XHRcdGZvciAoayBpbiB0aGlzLm1hcFtoXSkge1xuXHRcdFx0XHRcdFx0ZW50ID0gdGhpcy5tYXBbaF1ba107XG5cdFx0XHRcdFx0XHQvL21ha2Ugc3VyZSB0aGF0IHRoaXMgaXMgYSBDcmFmdHkgZW50aXR5XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGVudCA9PSAnb2JqZWN0JyAmJiAncmVxdWlyZXMnIGluIGVudCkge1xuXHRcdFx0XHRcdFx0XHRjb29yZHMubWF4LnggPSBNYXRoLm1heChjb29yZHMubWF4LngsIGVudC54ICsgZW50LncpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaSA8PSBoYXNoLm1pbi54KSB7XG5cdFx0XHRcdFx0aGFzaC5taW4ueCA9IGk7XG5cdFx0XHRcdFx0Zm9yIChrIGluIHRoaXMubWFwW2hdKSB7XG5cdFx0XHRcdFx0XHRlbnQgPSB0aGlzLm1hcFtoXVtrXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZW50ID09ICdvYmplY3QnICYmICdyZXF1aXJlcycgaW4gZW50KSB7XG5cdFx0XHRcdFx0XHRcdGNvb3Jkcy5taW4ueCA9IE1hdGgubWluKGNvb3Jkcy5taW4ueCwgZW50LngpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaiA+PSBoYXNoLm1heC55KSB7XG5cdFx0XHRcdFx0aGFzaC5tYXgueSA9IGo7XG5cdFx0XHRcdFx0Zm9yIChrIGluIHRoaXMubWFwW2hdKSB7XG5cdFx0XHRcdFx0XHRlbnQgPSB0aGlzLm1hcFtoXVtrXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZW50ID09ICdvYmplY3QnICYmICdyZXF1aXJlcycgaW4gZW50KSB7XG5cdFx0XHRcdFx0XHRcdGNvb3Jkcy5tYXgueSA9IE1hdGgubWF4KGNvb3Jkcy5tYXgueSwgZW50LnkgKyBlbnQuaCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChqIDw9IGhhc2gubWluLnkpIHtcblx0XHRcdFx0XHRoYXNoLm1pbi55ID0gajtcblx0XHRcdFx0XHRmb3IgKGsgaW4gdGhpcy5tYXBbaF0pIHtcblx0XHRcdFx0XHRcdGVudCA9IHRoaXMubWFwW2hdW2tdO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlbnQgPT0gJ29iamVjdCcgJiYgJ3JlcXVpcmVzJyBpbiBlbnQpIHtcblx0XHRcdFx0XHRcdFx0Y29vcmRzLm1pbi55ID0gTWF0aC5taW4oY29vcmRzLm1pbi55LCBlbnQueSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBjb29yZHM7XG5cdFx0fVxuXHR9O1xuXG4vKipAXG4qICNDcmFmdHkuSGFzaE1hcFxuKiBAY2F0ZWdvcnkgMkRcbiogQnJvYWQtcGhhc2UgY29sbGlzaW9uIGRldGVjdGlvbiBlbmdpbmUuIFNlZSBiYWNrZ3JvdW5kIGluZm9ybWF0aW9uIGF0IFxuKlxuKiB+fn5cbiogLSBbTiBUdXRvcmlhbCBCIC0gQnJvYWQtUGhhc2UgQ29sbGlzaW9uXShodHRwOi8vd3d3Lm1ldGFuZXRzb2Z0d2FyZS5jb20vdGVjaG5pcXVlL3R1dG9yaWFsQi5odG1sKVxuKiAtIFtCcm9hZC1QaGFzZSBDb2xsaXNpb24gRGV0ZWN0aW9uIHdpdGggQ1VEQV0oaHR0cC5kZXZlbG9wZXIubnZpZGlhLmNvbS9HUFVHZW1zMy9ncHVnZW1zM19jaDMyLmh0bWwpXG4qIH5+flxuKiBAc2VlIENyYWZ0eS5tYXBcbiovXG5cblx0LyoqQFxuXHQqICNDcmFmdHkuSGFzaE1hcC5rZXlcblx0KiBAY29tcCBDcmFmdHkuSGFzaE1hcFxuXHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5Lkhhc2hNYXAua2V5KE9iamVjdCBvYmopXG5cdCogQHBhcmFtIG9iaiAtIGFuIE9iamVjdCB0aGF0IGhhcyAubWJyKCkgb3IgX3gsIF95LCBfdyBhbmQgX2guXG4gICAgKiBHZXQgdGhlIHJlY3Rhbmd1bGFyIHJlZ2lvbiAoaW4gdGVybXMgb2YgdGhlIGdyaWQsIHdpdGggZ3JpZCBzaXplIGBjZWxsc2l6ZWApLCB3aGVyZSB0aGUgb2JqZWN0IG1heSBmYWxsIGluLiBUaGlzIHJlZ2lvbiBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBvYmplY3QncyBib3VuZGluZyBib3guXG4gICAgKiBUaGUgYGNlbGxzaXplYCBpcyA2NCBieSBkZWZhdWx0LlxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS5IYXNoTWFwLmNvbnN0cnVjdG9yXG5cdCovXG5cdEhhc2hNYXAua2V5ID0gZnVuY3Rpb24gKG9iaikge1xuXHRcdGlmIChvYmouaGFzT3duUHJvcGVydHkoJ21icicpKSB7XG5cdFx0XHRvYmogPSBvYmoubWJyKCk7XG5cdFx0fVxuXHRcdHZhciB4MSA9IE1hdGguZmxvb3Iob2JqLl94IC8gY2VsbHNpemUpLFxuXHRcdHkxID0gTWF0aC5mbG9vcihvYmouX3kgLyBjZWxsc2l6ZSksXG5cdFx0eDIgPSBNYXRoLmZsb29yKChvYmouX3cgKyBvYmouX3gpIC8gY2VsbHNpemUpLFxuXHRcdHkyID0gTWF0aC5mbG9vcigob2JqLl9oICsgb2JqLl95KSAvIGNlbGxzaXplKTtcblx0XHRyZXR1cm4geyB4MTogeDEsIHkxOiB5MSwgeDI6IHgyLCB5MjogeTIgfTtcblx0fTtcblxuXHRIYXNoTWFwLmhhc2ggPSBmdW5jdGlvbiAoa2V5cykge1xuXHRcdHJldHVybiBrZXlzLngxICsgU1BBQ0UgKyBrZXlzLnkxICsgU1BBQ0UgKyBrZXlzLngyICsgU1BBQ0UgKyBrZXlzLnkyO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIEVudHJ5KGtleXMsIG9iaiwgbWFwKSB7XG5cdFx0dGhpcy5rZXlzID0ga2V5cztcblx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR0aGlzLm9iaiA9IG9iajtcblx0fVxuXG5cdEVudHJ5LnByb3RvdHlwZSA9IHtcblx0XHR1cGRhdGU6IGZ1bmN0aW9uIChyZWN0KSB7XG5cdFx0XHQvL2NoZWNrIGlmIGJ1Y2tldHMgY2hhbmdlXG5cdFx0XHRpZiAoSGFzaE1hcC5oYXNoKEhhc2hNYXAua2V5KHJlY3QpKSAhPSBIYXNoTWFwLmhhc2godGhpcy5rZXlzKSkge1xuXHRcdFx0XHR0aGlzLm1hcC5yZW1vdmUodGhpcy5rZXlzLCB0aGlzLm9iaik7XG5cdFx0XHRcdHZhciBlID0gdGhpcy5tYXAuaW5zZXJ0KHRoaXMub2JqKTtcblx0XHRcdFx0dGhpcy5rZXlzID0gZS5rZXlzO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRwYXJlbnQuSGFzaE1hcCA9IEhhc2hNYXA7XG59KShDcmFmdHkpO1xuXG4vKipAXG4qICNDcmFmdHkubWFwXG4qIEBjYXRlZ29yeSAyRFxuKiBGdW5jdGlvbnMgcmVsYXRlZCB3aXRoIHF1ZXJ5aW5nIGVudGl0aWVzLlxuKiBAc2VlIENyYWZ0eS5IYXNoTWFwXG4qL1xuQ3JhZnR5Lm1hcCA9IG5ldyBDcmFmdHkuSGFzaE1hcCgpO1xudmFyIE0gPSBNYXRoLFxuXHRNYyA9IE0uY29zLFxuXHRNcyA9IE0uc2luLFxuXHRQSSA9IE0uUEksXG5cdERFR19UT19SQUQgPSBQSSAvIDE4MDtcblxuXG4vKipAXG4qICMyRFxuKiBAY2F0ZWdvcnkgMkRcbiogQ29tcG9uZW50IGZvciBhbnkgZW50aXR5IHRoYXQgaGFzIGEgcG9zaXRpb24gb24gdGhlIHN0YWdlLlxuKiBAdHJpZ2dlciBNb3ZlIC0gd2hlbiB0aGUgZW50aXR5IGhhcyBtb3ZlZCAtIHsgX3g6TnVtYmVyLCBfeTpOdW1iZXIsIF93Ok51bWJlciwgX2g6TnVtYmVyIH0gLSBPbGQgcG9zaXRpb25cbiogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgZW50aXR5IGhhcyBtb3ZlZCAtIHsgX3g6TnVtYmVyLCBfeTpOdW1iZXIsIF93Ok51bWJlciwgX2g6TnVtYmVyIH0gLSBPbGQgcG9zaXRpb25cbiogQHRyaWdnZXIgUm90YXRlIC0gd2hlbiB0aGUgZW50aXR5IGlzIHJvdGF0ZWQgLSB7IGNvczpOdW1iZXIsIHNpbjpOdW1iZXIsIGRlZzpOdW1iZXIsIHJhZDpOdW1iZXIsIG86IHt4Ok51bWJlciwgeTpOdW1iZXJ9LCBtYXRyaXg6IHtNMTEsIE0xMiwgTTIxLCBNMjJ9IH1cbiovXG5DcmFmdHkuYyhcIjJEXCIsIHtcbi8qKkBcblx0KiAjLnhcblx0KiBAY29tcCAyRFxuXHQqIFRoZSBgeGAgcG9zaXRpb24gb24gdGhlIHN0YWdlLiBXaGVuIG1vZGlmaWVkLCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcmVkcmF3bi5cblx0KiBJcyBhY3R1YWxseSBhIGdldHRlci9zZXR0ZXIgc28gd2hlbiB1c2luZyB0aGlzIHZhbHVlIGZvciBjYWxjdWxhdGlvbnMgYW5kIG5vdCBtb2RpZnlpbmcgaXQsXG5cdCogdXNlIHRoZSBgLl94YCBwcm9wZXJ0eS5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfeDogMCxcblx0LyoqQFxuXHQqICMueVxuXHQqIEBjb21wIDJEXG5cdCogVGhlIGB5YCBwb3NpdGlvbiBvbiB0aGUgc3RhZ2UuIFdoZW4gbW9kaWZpZWQsIHdpbGwgYXV0b21hdGljYWxseSBiZSByZWRyYXduLlxuXHQqIElzIGFjdHVhbGx5IGEgZ2V0dGVyL3NldHRlciBzbyB3aGVuIHVzaW5nIHRoaXMgdmFsdWUgZm9yIGNhbGN1bGF0aW9ucyBhbmQgbm90IG1vZGlmeWluZyBpdCxcblx0KiB1c2UgdGhlIGAuX3lgIHByb3BlcnR5LlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF95OiAwLFxuXHQvKipAXG5cdCogIy53XG5cdCogQGNvbXAgMkRcblx0KiBUaGUgd2lkdGggb2YgdGhlIGVudGl0eS4gV2hlbiBtb2RpZmllZCwgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHJlZHJhd24uXG5cdCogSXMgYWN0dWFsbHkgYSBnZXR0ZXIvc2V0dGVyIHNvIHdoZW4gdXNpbmcgdGhpcyB2YWx1ZSBmb3IgY2FsY3VsYXRpb25zIGFuZCBub3QgbW9kaWZ5aW5nIGl0LFxuXHQqIHVzZSB0aGUgYC5fd2AgcHJvcGVydHkuXG5cdCpcblx0KiBDaGFuZ2luZyB0aGlzIHZhbHVlIGlzIG5vdCByZWNvbW1lbmRlZCBhcyBjYW52YXMgaGFzIHRlcnJpYmxlIHJlc2l6ZSBxdWFsaXR5IGFuZCBET00gd2lsbCBqdXN0IGNsaXAgdGhlIGltYWdlLlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF93OiAwLFxuXHQvKipAXG5cdCogIy5oXG5cdCogQGNvbXAgMkRcblx0KiBUaGUgaGVpZ2h0IG9mIHRoZSBlbnRpdHkuIFdoZW4gbW9kaWZpZWQsIHdpbGwgYXV0b21hdGljYWxseSBiZSByZWRyYXduLlxuXHQqIElzIGFjdHVhbGx5IGEgZ2V0dGVyL3NldHRlciBzbyB3aGVuIHVzaW5nIHRoaXMgdmFsdWUgZm9yIGNhbGN1bGF0aW9ucyBhbmQgbm90IG1vZGlmeWluZyBpdCxcblx0KiB1c2UgdGhlIGAuX2hgIHByb3BlcnR5LlxuXHQqXG5cdCogQ2hhbmdpbmcgdGhpcyB2YWx1ZSBpcyBub3QgcmVjb21tZW5kZWQgYXMgY2FudmFzIGhhcyB0ZXJyaWJsZSByZXNpemUgcXVhbGl0eSBhbmQgRE9NIHdpbGwganVzdCBjbGlwIHRoZSBpbWFnZS5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfaDogMCxcblx0LyoqQFxuXHQqICMuelxuXHQqIEBjb21wIDJEXG5cdCogVGhlIGB6YCBpbmRleCBvbiB0aGUgc3RhZ2UuIFdoZW4gbW9kaWZpZWQsIHdpbGwgYXV0b21hdGljYWxseSBiZSByZWRyYXduLlxuXHQqIElzIGFjdHVhbGx5IGEgZ2V0dGVyL3NldHRlciBzbyB3aGVuIHVzaW5nIHRoaXMgdmFsdWUgZm9yIGNhbGN1bGF0aW9ucyBhbmQgbm90IG1vZGlmeWluZyBpdCxcblx0KiB1c2UgdGhlIGAuX3pgIHByb3BlcnR5LlxuXHQqXG5cdCogQSBoaWdoZXIgYHpgIHZhbHVlIHdpbGwgYmUgY2xvc2VyIHRvIHRoZSBmcm9udCBvZiB0aGUgc3RhZ2UuIEEgc21hbGxlciBgemAgdmFsdWUgd2lsbCBiZSBjbG9zZXIgdG8gdGhlIGJhY2suXG5cdCogQSBnbG9iYWwgWiBpbmRleCBpcyBwcm9kdWNlZCBiYXNlZCBvbiBpdHMgYHpgIHZhbHVlIGFzIHdlbGwgYXMgdGhlIEdJRCAod2hpY2ggZW50aXR5IHdhcyBjcmVhdGVkIGZpcnN0KS5cblx0KiBUaGVyZWZvcmUgZW50aXRpZXMgd2lsbCBuYXR1cmFsbHkgbWFpbnRhaW4gb3JkZXIgZGVwZW5kaW5nIG9uIHdoZW4gaXQgd2FzIGNyZWF0ZWQgaWYgc2FtZSB6IHZhbHVlLlxuXHQqIEBzZWUgLl9hdHRyXG5cdCovXG5cdF96OiAwLFxuXHQvKipAXG5cdCogIy5yb3RhdGlvblxuXHQqIEBjb21wIDJEXG5cdCogU2V0IHRoZSByb3RhdGlvbiBvZiB5b3VyIGVudGl0eS4gUm90YXRpb24gdGFrZXMgZGVncmVlcyBpbiBhIGNsb2Nrd2lzZSBkaXJlY3Rpb24uXG5cdCogSXQgaXMgaW1wb3J0YW50IHRvIG5vdGUgdGhlcmUgaXMgbm8gbGltaXQgb24gdGhlIHJvdGF0aW9uIHZhbHVlLiBTZXR0aW5nIGEgcm90YXRpb25cblx0KiBtb2QgMzYwIHdpbGwgZ2l2ZSB0aGUgc2FtZSByb3RhdGlvbiB3aXRob3V0IHJlYWNoaW5nIGh1Z2UgbnVtYmVycy5cblx0KiBAc2VlIC5fYXR0clxuXHQqL1xuXHRfcm90YXRpb246IDAsXG5cdC8qKkBcblx0KiAjLmFscGhhXG5cdCogQGNvbXAgMkRcblx0KiBUcmFuc3BhcmVuY3kgb2YgYW4gZW50aXR5LiBNdXN0IGJlIGEgZGVjaW1hbCB2YWx1ZSBiZXR3ZWVuIDAuMCBiZWluZyBmdWxseSB0cmFuc3BhcmVudCB0byAxLjAgYmVpbmcgZnVsbHkgb3BhcXVlLlxuXHQqL1xuXHRfYWxwaGE6IDEuMCxcblx0LyoqQFxuXHQqICMudmlzaWJsZVxuXHQqIEBjb21wIDJEXG5cdCogSWYgdGhlIGVudGl0eSBpcyB2aXNpYmxlIG9yIG5vdC4gQWNjZXB0cyBhIHRydWUgb3IgZmFsc2UgdmFsdWUuXG5cdCogQ2FuIGJlIHVzZWQgZm9yIG9wdGltaXphdGlvbiBieSBzZXR0aW5nIGFuIGVudGl0aWVzIHZpc2liaWxpdHkgdG8gZmFsc2Ugd2hlbiBub3QgbmVlZGVkIHRvIGJlIGRyYXduLlxuXHQqXG5cdCogVGhlIGVudGl0eSB3aWxsIHN0aWxsIGV4aXN0IGFuZCBjYW4gYmUgY29sbGlkZWQgd2l0aCBidXQganVzdCB3b24ndCBiZSBkcmF3bi5cbiAgKiBAc2VlIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3LCBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbFxuXHQqL1xuXHRfdmlzaWJsZTogdHJ1ZSxcblxuXHQvKipAXG5cdCogIy5fZ2xvYmFsWlxuXHQqIEBjb21wIDJEXG5cdCogV2hlbiB0d28gZW50aXRpZXMgb3ZlcmxhcCwgdGhlIG9uZSB3aXRoIHRoZSBsYXJnZXIgYF9nbG9iYWxaYCB3aWxsIGJlIG9uIHRvcCBvZiB0aGUgb3RoZXIuXG5cdCogQHNlZSBDcmFmdHkuRHJhd01hbmFnZXIuZHJhdywgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGxcblx0Ki9cblx0X2dsb2JhbFo6IG51bGwsXG5cblx0X29yaWdpbjogbnVsbCxcblx0X21icjogbnVsbCxcblx0X2VudHJ5OiBudWxsLFxuXHRfY2hpbGRyZW46IG51bGwsXG5cdF9wYXJlbnQ6IG51bGwsXG5cdF9jaGFuZ2VkOiBmYWxzZSxcblxuXHRfZGVmaW5lR2V0dGVyU2V0dGVyX3NldHRlcjogZnVuY3Rpb24oKSB7XG5cdFx0Ly9jcmVhdGUgZ2V0dGVycyBhbmQgc2V0dGVycyB1c2luZyBfX2RlZmluZVNldHRlcl9fIGFuZCBfX2RlZmluZUdldHRlcl9fXG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCd4JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3gnLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCd5JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3knLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCd3JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3cnLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCdoJywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX2gnLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCd6JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3onLCB2KTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZVNldHRlcl9fKCdyb3RhdGlvbicsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ19yb3RhdGlvbicsIHYpOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ2FscGhhJywgZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX2FscGhhJywgdik7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVTZXR0ZXJfXygndmlzaWJsZScsIGZ1bmN0aW9uICh2KSB7IHRoaXMuX2F0dHIoJ192aXNpYmxlJywgdik7IH0pO1xuXG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCd4JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feDsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCd5JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feTsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCd3JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fdzsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCdoJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5faDsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCd6JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fejsgfSk7XG5cdFx0dGhpcy5fX2RlZmluZUdldHRlcl9fKCdyb3RhdGlvbicsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3JvdGF0aW9uOyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ2FscGhhJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fYWxwaGE7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygndmlzaWJsZScsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3Zpc2libGU7IH0pO1xuXHRcdHRoaXMuX19kZWZpbmVHZXR0ZXJfXygncGFyZW50JywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fcGFyZW50OyB9KTtcblx0XHR0aGlzLl9fZGVmaW5lR2V0dGVyX18oJ251bUNoaWxkcmVuJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fY2hpbGRyZW4ubGVuZ3RoOyB9KTtcblx0fSxcblxuXHRfZGVmaW5lR2V0dGVyU2V0dGVyX2RlZmluZVByb3BlcnR5OiBmdW5jdGlvbigpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3gnLCB7XG5cdFx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3gnLCB2KTsgfVxuXHRcdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feDsgfVxuXHRcdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3knLCB7XG5cdFx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3knLCB2KTsgfVxuXHRcdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feTsgfVxuXHRcdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3cnLCB7XG5cdFx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3cnLCB2KTsgfVxuXHRcdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fdzsgfVxuXHRcdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2gnLCB7XG5cdFx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX2gnLCB2KTsgfVxuXHRcdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5faDsgfVxuXHRcdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3onLCB7XG5cdFx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3onLCB2KTsgfVxuXHRcdFx0XHQsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fejsgfVxuXHRcdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdFx0fSk7XG5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JvdGF0aW9uJywge1xuXHRcdFx0c2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9hdHRyKCdfcm90YXRpb24nLCB2KTsgfVxuXHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3JvdGF0aW9uOyB9XG5cdFx0XHQsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhbHBoYScsIHtcblx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX2FscGhhJywgdik7IH1cblx0XHRcdCwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9hbHBoYTsgfVxuXHRcdFx0LCBjb25maWd1cmFibGU6IHRydWVcblx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlzaWJsZScsIHtcblx0XHRcdHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fYXR0cignX3Zpc2libGUnLCB2KTsgfVxuXHRcdFx0LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3Zpc2libGU7IH1cblx0XHRcdCwgY29uZmlndXJhYmxlOiB0cnVlXG5cdFx0fSk7XG5cdH0sXG5cblx0X2RlZmluZUdldHRlclNldHRlcl9mYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0Ly9zZXQgdGhlIHB1YmxpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjdXJyZW50IHByaXZhdGUgcHJvcGVydGllc1xuXHRcdHRoaXMueCA9IHRoaXMuX3g7XG5cdFx0dGhpcy55ID0gdGhpcy5feTtcblx0XHR0aGlzLncgPSB0aGlzLl93O1xuXHRcdHRoaXMuaCA9IHRoaXMuX2g7XG5cdFx0dGhpcy56ID0gdGhpcy5fejtcblx0XHR0aGlzLnJvdGF0aW9uID0gdGhpcy5fcm90YXRpb247XG5cdFx0dGhpcy5hbHBoYSA9IHRoaXMuX2FscGhhO1xuXHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuX3Zpc2libGU7XG5cblx0XHQvL29uIGV2ZXJ5IGZyYW1lIGNoZWNrIGZvciBhIGRpZmZlcmVuY2UgaW4gYW55IHByb3BlcnR5XG5cdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvL2lmIHRoZXJlIGFyZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBwdWJsaWMgYW5kIHByaXZhdGUgcHJvcGVydGllc1xuXHRcdFx0aWYgKHRoaXMueCAhPT0gdGhpcy5feCB8fCB0aGlzLnkgIT09IHRoaXMuX3kgfHxcblx0XHRcdFx0dGhpcy53ICE9PSB0aGlzLl93IHx8IHRoaXMuaCAhPT0gdGhpcy5faCB8fFxuXHRcdFx0XHR0aGlzLnogIT09IHRoaXMuX3ogfHwgdGhpcy5yb3RhdGlvbiAhPT0gdGhpcy5fcm90YXRpb24gfHxcblx0XHRcdFx0dGhpcy5hbHBoYSAhPT0gdGhpcy5fYWxwaGEgfHwgdGhpcy52aXNpYmxlICE9PSB0aGlzLl92aXNpYmxlKSB7XG5cblx0XHRcdFx0Ly9zYXZlIHRoZSBvbGQgcG9zaXRpb25zXG5cdFx0XHRcdHZhciBvbGQgPSB0aGlzLm1icigpIHx8IHRoaXMucG9zKCk7XG5cblx0XHRcdFx0Ly9pZiByb3RhdGlvbiBoYXMgY2hhbmdlZCwgdXNlIHRoZSBwcml2YXRlIHJvdGF0ZSBtZXRob2Rcblx0XHRcdFx0aWYgKHRoaXMucm90YXRpb24gIT09IHRoaXMuX3JvdGF0aW9uKSB7XG5cdFx0XHRcdFx0dGhpcy5fcm90YXRlKHRoaXMucm90YXRpb24pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vdXBkYXRlIHRoZSBNQlJcblx0XHRcdFx0XHR2YXIgbWJyID0gdGhpcy5fbWJyLCBtb3ZlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3QgaGF2ZSBnZXR0ZXJzIG9yIHNldHRlcnMsXG5cdFx0XHRcdFx0Ly8ge3gsIHksIHcsIGgsIHp9IGFuZCB7X3gsIF95LCBfdywgX2gsIF96fSBtYXkgYmUgb3V0IG9mIHN5bmMsXG5cdFx0XHRcdFx0Ly8gaW4gd2hpY2ggY2FzZSB0IGNoZWNrcyBpZiB0aGV5IGFyZSBkaWZmZXJlbnQgb24gdGljayBhbmQgZXhlY3V0ZXMgdGhlIENoYW5nZSBldmVudC5cblx0XHRcdFx0XHRpZiAobWJyKSB7IC8vY2hlY2sgZWFjaCB2YWx1ZSB0byBzZWUgd2hpY2ggaGFzIGNoYW5nZWRcblx0XHRcdFx0XHRcdGlmICh0aGlzLnggIT09IHRoaXMuX3gpIHsgbWJyLl94IC09IHRoaXMueCAtIHRoaXMuX3g7IG1vdmVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy55ICE9PSB0aGlzLl95KSB7IG1ici5feSAtPSB0aGlzLnkgLSB0aGlzLl95OyBtb3ZlZCA9IHRydWU7IH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHRoaXMudyAhPT0gdGhpcy5fdykgeyBtYnIuX3cgLT0gdGhpcy53IC0gdGhpcy5fdzsgbW92ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLmggIT09IHRoaXMuX2gpIHsgbWJyLl9oIC09IHRoaXMuaCAtIHRoaXMuX2g7IG1vdmVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy56ICE9PSB0aGlzLl96KSB7IG1ici5feiAtPSB0aGlzLnogLSB0aGlzLl96OyBtb3ZlZCA9IHRydWU7IH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL2lmIHRoZSBtb3ZlZCBmbGFnIGlzIHRydWUsIHRyaWdnZXIgYSBtb3ZlXG5cdFx0XHRcdFx0aWYgKG1vdmVkKSB0aGlzLnRyaWdnZXIoXCJNb3ZlXCIsIG9sZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL3NldCB0aGUgcHVibGljIHByb3BlcnRpZXMgdG8gdGhlIHByaXZhdGUgcHJvcGVydGllc1xuXHRcdFx0XHR0aGlzLl94ID0gdGhpcy54O1xuXHRcdFx0XHR0aGlzLl95ID0gdGhpcy55O1xuXHRcdFx0XHR0aGlzLl93ID0gdGhpcy53O1xuXHRcdFx0XHR0aGlzLl9oID0gdGhpcy5oO1xuXHRcdFx0XHR0aGlzLl96ID0gdGhpcy56O1xuXHRcdFx0XHR0aGlzLl9yb3RhdGlvbiA9IHRoaXMucm90YXRpb247XG5cdFx0XHRcdHRoaXMuX2FscGhhID0gdGhpcy5hbHBoYTtcblx0XHRcdFx0dGhpcy5fdmlzaWJsZSA9IHRoaXMudmlzaWJsZTtcblxuXHRcdFx0XHQvL3RyaWdnZXIgdGhlIGNoYW5nZXNcblx0XHRcdFx0dGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIsIG9sZCk7XG5cdFx0XHRcdC8vd2l0aG91dCB0aGlzIGVudGl0aWVzIHdlcmVuJ3QgYWRkZWQgY29ycmVjdGx5IHRvIENyYWZ0eS5tYXAubWFwIGluIElFOC5cblx0XHRcdFx0Ly9ub3QgZW50aXJlbHkgc3VyZSB0aGlzIGlzIHRoZSBiZXN0IHdheSB0byBmaXggaXQgdGhvdWdoXG5cdFx0XHRcdHRoaXMudHJpZ2dlcihcIk1vdmVcIiwgb2xkKTtcblx0XHRcdH1cblx0XHR9KTtcbiAgfSxcblxuXHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9nbG9iYWxaID0gdGhpc1swXTtcblx0XHR0aGlzLl9vcmlnaW4gPSB7IHg6IDAsIHk6IDAgfTtcblx0XHR0aGlzLl9jaGlsZHJlbiA9IFtdO1xuXG5cdFx0aWYoQ3JhZnR5LnN1cHBvcnQuc2V0dGVyKSB7XG4gICAgICB0aGlzLl9kZWZpbmVHZXR0ZXJTZXR0ZXJfc2V0dGVyKCk7XG5cdFx0fSBlbHNlIGlmIChDcmFmdHkuc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eSkge1xuXHRcdFx0Ly9JRTkgc3VwcG9ydHMgT2JqZWN0LmRlZmluZVByb3BlcnR5XG4gICAgICB0aGlzLl9kZWZpbmVHZXR0ZXJTZXR0ZXJfZGVmaW5lUHJvcGVydHkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Lypcblx0XHRcdElmIG5vIHNldHRlcnMgYW5kIGdldHRlcnMgYXJlIHN1cHBvcnRlZCAoZS5nLiBJRTgpIHN1cHBvcnRzLFxuXHRcdFx0Y2hlY2sgb24gZXZlcnkgZnJhbWUgZm9yIGEgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoaXMuXyh4fHl8d3xofHouLi4pXG5cdFx0XHRhbmQgdGhpcy4oeHx5fHd8aHx6KSBhbmQgdXBkYXRlIGFjY29yZGluZ2x5LlxuXHRcdFx0Ki9cbiAgICAgIHRoaXMuX2RlZmluZUdldHRlclNldHRlcl9mYWxsYmFjaygpO1xuXHRcdH1cblxuXHRcdC8vaW5zZXJ0IHNlbGYgaW50byB0aGUgSGFzaE1hcFxuXHRcdHRoaXMuX2VudHJ5ID0gQ3JhZnR5Lm1hcC5pbnNlcnQodGhpcyk7XG5cblx0XHQvL3doZW4gb2JqZWN0IGNoYW5nZXMsIHVwZGF0ZSBIYXNoTWFwXG5cdFx0dGhpcy5iaW5kKFwiTW92ZVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIGFyZWEgPSB0aGlzLl9tYnIgfHwgdGhpcztcblx0XHRcdHRoaXMuX2VudHJ5LnVwZGF0ZShhcmVhKTtcblx0XHRcdHRoaXMuX2Nhc2NhZGUoZSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmJpbmQoXCJSb3RhdGVcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBvbGQgPSB0aGlzLl9tYnIgfHwgdGhpcztcblx0XHRcdHRoaXMuX2VudHJ5LnVwZGF0ZShvbGQpO1xuXHRcdFx0dGhpcy5fY2FzY2FkZShlKTtcblx0XHR9KTtcblxuXHRcdC8vd2hlbiBvYmplY3QgaXMgcmVtb3ZlZCwgcmVtb3ZlIGZyb20gSGFzaE1hcCBhbmQgZGVzdHJveSBhdHRhY2hlZCBjaGlsZHJlblxuXHRcdHRoaXMuYmluZChcIlJlbW92ZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGhpcy5fY2hpbGRyZW4pIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGlmICh0aGlzLl9jaGlsZHJlbltpXS5kZXN0cm95KSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9jaGlsZHJlbltpXS5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuID0gW107XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLl9wYXJlbnQpIHtcblx0XHRcdFx0dGhpcy5fcGFyZW50LmRldGFjaCh0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0Q3JhZnR5Lm1hcC5yZW1vdmUodGhpcyk7XG5cblx0XHRcdHRoaXMuZGV0YWNoKCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCogQ2FsY3VsYXRlcyB0aGUgTUJSIHdoZW4gcm90YXRlZCB3aXRoIGFuIG9yaWdpbiBwb2ludFxuXHQqL1xuXHRfcm90YXRlOiBmdW5jdGlvbiAodikge1xuXHRcdHZhciB0aGV0YSA9IC0xICogKHYgJSAzNjApLCAvL2FuZ2xlIGFsd2F5cyBiZXR3ZWVuIDAgYW5kIDM1OVxuXHRcdFx0cmFkID0gdGhldGEgKiBERUdfVE9fUkFELFxuXHRcdFx0Y3QgPSBNYXRoLmNvcyhyYWQpLCAvL2NhY2hlIHRoZSBzaW4gYW5kIGNvc2luZSBvZiB0aGV0YVxuXHRcdFx0c3QgPSBNYXRoLnNpbihyYWQpLFxuXHRcdFx0byA9IHtcblx0XHRcdHg6IHRoaXMuX29yaWdpbi54ICsgdGhpcy5feCxcblx0XHRcdHk6IHRoaXMuX29yaWdpbi55ICsgdGhpcy5feVxuXHRcdH07XG5cblx0XHQvL2lmIHRoZSBhbmdsZSBpcyAwIGFuZCBpcyBjdXJyZW50bHkgMCwgc2tpcFxuXHRcdGlmICghdGhldGEpIHtcblx0XHRcdHRoaXMuX21iciA9IG51bGw7XG5cdFx0XHRpZiAoIXRoaXMuX3JvdGF0aW9uICUgMzYwKSByZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHgwID0gby54ICsgKHRoaXMuX3ggLSBvLngpICogY3QgKyAodGhpcy5feSAtIG8ueSkgKiBzdCxcblx0XHRcdHkwID0gby55IC0gKHRoaXMuX3ggLSBvLngpICogc3QgKyAodGhpcy5feSAtIG8ueSkgKiBjdCxcblx0XHRcdHgxID0gby54ICsgKHRoaXMuX3ggKyB0aGlzLl93IC0gby54KSAqIGN0ICsgKHRoaXMuX3kgLSBvLnkpICogc3QsXG5cdFx0XHR5MSA9IG8ueSAtICh0aGlzLl94ICsgdGhpcy5fdyAtIG8ueCkgKiBzdCArICh0aGlzLl95IC0gby55KSAqIGN0LFxuXHRcdFx0eDIgPSBvLnggKyAodGhpcy5feCArIHRoaXMuX3cgLSBvLngpICogY3QgKyAodGhpcy5feSArIHRoaXMuX2ggLSBvLnkpICogc3QsXG5cdFx0XHR5MiA9IG8ueSAtICh0aGlzLl94ICsgdGhpcy5fdyAtIG8ueCkgKiBzdCArICh0aGlzLl95ICsgdGhpcy5faCAtIG8ueSkgKiBjdCxcblx0XHRcdHgzID0gby54ICsgKHRoaXMuX3ggLSBvLngpICogY3QgKyAodGhpcy5feSArIHRoaXMuX2ggLSBvLnkpICogc3QsXG5cdFx0XHR5MyA9IG8ueSAtICh0aGlzLl94IC0gby54KSAqIHN0ICsgKHRoaXMuX3kgKyB0aGlzLl9oIC0gby55KSAqIGN0LFxuXHRcdFx0bWlueCA9IE1hdGgucm91bmQoTWF0aC5taW4oeDAsIHgxLCB4MiwgeDMpKSxcblx0XHRcdG1pbnkgPSBNYXRoLnJvdW5kKE1hdGgubWluKHkwLCB5MSwgeTIsIHkzKSksXG5cdFx0XHRtYXh4ID0gTWF0aC5yb3VuZChNYXRoLm1heCh4MCwgeDEsIHgyLCB4MykpLFxuXHRcdFx0bWF4eSA9IE1hdGgucm91bmQoTWF0aC5tYXgoeTAsIHkxLCB5MiwgeTMpKTtcblxuXHRcdHRoaXMuX21iciA9IHsgX3g6IG1pbngsIF95OiBtaW55LCBfdzogbWF4eCAtIG1pbngsIF9oOiBtYXh5IC0gbWlueSB9O1xuXG5cdFx0Ly90cmlnZ2VyIHJvdGF0aW9uIGV2ZW50XG5cdFx0dmFyIGRpZmZlcmVuY2UgPSB0aGlzLl9yb3RhdGlvbiAtIHYsXG5cdFx0XHRkcmFkID0gZGlmZmVyZW5jZSAqIERFR19UT19SQUQ7XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJSb3RhdGVcIiwge1xuXHRcdFx0Y29zOiBNYXRoLmNvcyhkcmFkKSxcblx0XHRcdHNpbjogTWF0aC5zaW4oZHJhZCksXG5cdFx0XHRkZWc6IGRpZmZlcmVuY2UsXG5cdFx0XHRyYWQ6IGRyYWQsXG5cdFx0XHRvOiB7IHg6IG8ueCwgeTogby55IH0sXG5cdFx0XHRtYXRyaXg6IHsgTTExOiBjdCwgTTEyOiBzdCwgTTIxOiAtc3QsIE0yMjogY3QgfVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmFyZWFcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBOdW1iZXIgLmFyZWEodm9pZClcblx0KiBDYWxjdWxhdGVzIHRoZSBhcmVhIG9mIHRoZSBlbnRpdHlcblx0Ki9cblx0YXJlYTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl93ICogdGhpcy5faDtcblx0fSxcblxuXHQvKipAXG5cdCogIy5pbnRlcnNlY3Rcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5pbnRlcnNlY3QoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHcgLSBXaWR0aCBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSBoIC0gSGVpZ2h0IG9mIHRoZSByZWN0XG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmludGVyc2VjdChPYmplY3QgcmVjdClcblx0KiBAcGFyYW0gcmVjdCAtIEFuIG9iamVjdCB0aGF0IG11c3QgaGF2ZSB0aGUgYHgsIHksIHcsIGhgIHZhbHVlcyBhcyBwcm9wZXJ0aWVzXG5cdCogRGV0ZXJtaW5lcyBpZiB0aGlzIGVudGl0eSBpbnRlcnNlY3RzIGEgcmVjdGFuZ2xlLlxuXHQqL1xuXHRpbnRlcnNlY3Q6IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0dmFyIHJlY3QsIG9iaiA9IHRoaXMuX21iciB8fCB0aGlzO1xuXHRcdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0cmVjdCA9IHg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlY3QgPSB7IHg6IHgsIHk6IHksIHc6IHcsIGg6IGggfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gb2JqLl94IDwgcmVjdC54ICsgcmVjdC53ICYmIG9iai5feCArIG9iai5fdyA+IHJlY3QueCAmJlxuXHRcdFx0ICAgb2JqLl95IDwgcmVjdC55ICsgcmVjdC5oICYmIG9iai5faCArIG9iai5feSA+IHJlY3QueTtcblx0fSxcblxuXHQvKipAXG5cdCogIy53aXRoaW5cblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC53aXRoaW4oTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHkgLSBZIHBvc2l0aW9uIG9mIHRoZSByZWN0XG5cdCogQHBhcmFtIHcgLSBXaWR0aCBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSBoIC0gSGVpZ2h0IG9mIHRoZSByZWN0XG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLndpdGhpbihPYmplY3QgcmVjdClcblx0KiBAcGFyYW0gcmVjdCAtIEFuIG9iamVjdCB0aGF0IG11c3QgaGF2ZSB0aGUgYHgsIHksIHcsIGhgIHZhbHVlcyBhcyBwcm9wZXJ0aWVzXG5cdCogRGV0ZXJtaW5lcyBpZiB0aGlzIGN1cnJlbnQgZW50aXR5IGlzIHdpdGhpbiBhbm90aGVyIHJlY3RhbmdsZS5cblx0Ki9cblx0d2l0aGluOiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdHZhciByZWN0O1xuXHRcdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0cmVjdCA9IHg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlY3QgPSB7IHg6IHgsIHk6IHksIHc6IHcsIGg6IGggfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVjdC54IDw9IHRoaXMueCAmJiByZWN0LnggKyByZWN0LncgPj0gdGhpcy54ICsgdGhpcy53ICYmXG5cdFx0XHRcdHJlY3QueSA8PSB0aGlzLnkgJiYgcmVjdC55ICsgcmVjdC5oID49IHRoaXMueSArIHRoaXMuaDtcblx0fSxcblxuXHQvKipAXG5cdCogIy5jb250YWluc1xuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmNvbnRhaW5zKE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcmVjdFxuXHQqIEBwYXJhbSB3IC0gV2lkdGggb2YgdGhlIHJlY3Rcblx0KiBAcGFyYW0gaCAtIEhlaWdodCBvZiB0aGUgcmVjdFxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIC5jb250YWlucyhPYmplY3QgcmVjdClcblx0KiBAcGFyYW0gcmVjdCAtIEFuIG9iamVjdCB0aGF0IG11c3QgaGF2ZSB0aGUgYHgsIHksIHcsIGhgIHZhbHVlcyBhcyBwcm9wZXJ0aWVzXG5cdCogRGV0ZXJtaW5lcyBpZiB0aGUgcmVjdGFuZ2xlIGlzIHdpdGhpbiB0aGUgY3VycmVudCBlbnRpdHkuXG5cdCovXG5cdGNvbnRhaW5zOiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdHZhciByZWN0O1xuXHRcdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0cmVjdCA9IHg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlY3QgPSB7IHg6IHgsIHk6IHksIHc6IHcsIGg6IGggfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVjdC54ID49IHRoaXMueCAmJiByZWN0LnggKyByZWN0LncgPD0gdGhpcy54ICsgdGhpcy53ICYmXG5cdFx0XHRcdHJlY3QueSA+PSB0aGlzLnkgJiYgcmVjdC55ICsgcmVjdC5oIDw9IHRoaXMueSArIHRoaXMuaDtcblx0fSxcblxuXHQvKipAXG5cdCogIy5wb3Ncblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyBPYmplY3QgLnBvcyh2b2lkKVxuXHQqIFJldHVybnMgdGhlIHgsIHksIHcsIGggcHJvcGVydGllcyBhcyBhIHJlY3Qgb2JqZWN0XG5cdCogKGEgcmVjdCBvYmplY3QgaXMganVzdCBhbiBvYmplY3Qgd2l0aCB0aGUga2V5cyBfeCwgX3ksIF93LCBfaCkuXG5cdCpcblx0KiBUaGUga2V5cyBoYXZlIGFuIHVuZGVyc2NvcmUgcHJlZml4LiBUaGlzIGlzIGR1ZSB0byB0aGUgeCwgeSwgdywgaFxuXHQqIHByb3BlcnRpZXMgYmVpbmcgbWVyZWx5IHNldHRlcnMgYW5kIGdldHRlcnMgdGhhdCB3cmFwIHRoZSBwcm9wZXJ0aWVzIHdpdGggYW4gdW5kZXJzY29yZSAoX3gsIF95LCBfdywgX2gpLlxuXHQqL1xuXHRwb3M6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0X3g6ICh0aGlzLl94KSxcblx0XHRcdF95OiAodGhpcy5feSksXG5cdFx0XHRfdzogKHRoaXMuX3cpLFxuXHRcdFx0X2g6ICh0aGlzLl9oKVxuXHRcdH07XG5cdH0sXG5cblx0LyoqQFxuXHQqICMubWJyXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgT2JqZWN0IC5tYnIoKVxuXHQqIFJldHVybnMgdGhlIG1pbmltdW0gYm91bmRpbmcgcmVjdGFuZ2xlLiBJZiB0aGVyZSBpcyBubyByb3RhdGlvblxuXHQqIG9uIHRoZSBlbnRpdHkgaXQgd2lsbCByZXR1cm4gdGhlIHJlY3QuXG5cdCovXG5cdG1icjogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5fbWJyKSByZXR1cm4gdGhpcy5wb3MoKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0X3g6ICh0aGlzLl9tYnIuX3gpLFxuXHRcdFx0X3k6ICh0aGlzLl9tYnIuX3kpLFxuXHRcdFx0X3c6ICh0aGlzLl9tYnIuX3cpLFxuXHRcdFx0X2g6ICh0aGlzLl9tYnIuX2gpXG5cdFx0fTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5pc0F0XG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiAuaXNBdChOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBYIHBvc2l0aW9uIG9mIHRoZSBwb2ludFxuXHQqIEBwYXJhbSB5IC0gWSBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBwb2ludCBpcyBjb250YWluZWQgYnkgdGhlIGVudGl0eS4gVW5saWtlIG90aGVyIG1ldGhvZHMsXG5cdCogYW4gb2JqZWN0IGNhbid0IGJlIHBhc3NlZC4gVGhlIGFyZ3VtZW50cyByZXF1aXJlIHRoZSB4IGFuZCB5IHZhbHVlXG5cdCovXG5cdGlzQXQ6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0aWYgKHRoaXMubWFwQXJlYSkge1xuICAgICAgXHRcdHJldHVybiB0aGlzLm1hcEFyZWEuY29udGFpbnNQb2ludCh4LCB5KTtcblx0XHR9IGVsc2UgaWYgKHRoaXMubWFwKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXAuY29udGFpbnNQb2ludCh4LCB5KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMueCA8PSB4ICYmIHRoaXMueCArIHRoaXMudyA+PSB4ICYmXG5cdFx0XHQgICB0aGlzLnkgPD0geSAmJiB0aGlzLnkgKyB0aGlzLmggPj0geTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5tb3ZlXG5cdCogQGNvbXAgMkRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAubW92ZShTdHJpbmcgZGlyLCBOdW1iZXIgYnkpXG5cdCogQHBhcmFtIGRpciAtIERpcmVjdGlvbiB0byBtb3ZlIChuLHMsZSx3LG5lLG53LHNlLHN3KVxuXHQqIEBwYXJhbSBieSAtIEFtb3VudCB0byBtb3ZlIGluIHRoZSBzcGVjaWZpZWQgZGlyZWN0aW9uXG5cdCogUXVpY2sgbWV0aG9kIHRvIG1vdmUgdGhlIGVudGl0eSBpbiBhIGRpcmVjdGlvbiAobiwgcywgZSwgdywgbmUsIG53LCBzZSwgc3cpIGJ5IGFuIGFtb3VudCBvZiBwaXhlbHMuXG5cdCovXG5cdG1vdmU6IGZ1bmN0aW9uIChkaXIsIGJ5KSB7XG5cdFx0aWYgKGRpci5jaGFyQXQoMCkgPT09ICduJykgdGhpcy55IC09IGJ5O1xuXHRcdGlmIChkaXIuY2hhckF0KDApID09PSAncycpIHRoaXMueSArPSBieTtcblx0XHRpZiAoZGlyID09PSAnZScgfHwgZGlyLmNoYXJBdCgxKSA9PT0gJ2UnKSB0aGlzLnggKz0gYnk7XG5cdFx0aWYgKGRpciA9PT0gJ3cnIHx8IGRpci5jaGFyQXQoMSkgPT09ICd3JykgdGhpcy54IC09IGJ5O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc2hpZnRcblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5zaGlmdChOdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaClcblx0KiBAcGFyYW0geCAtIEFtb3VudCB0byBtb3ZlIFhcblx0KiBAcGFyYW0geSAtIEFtb3VudCB0byBtb3ZlIFlcblx0KiBAcGFyYW0gdyAtIEFtb3VudCB0byB3aWRlblxuXHQqIEBwYXJhbSBoIC0gQW1vdW50IHRvIGluY3JlYXNlIGhlaWdodFxuXHQqIFNoaWZ0IG9yIG1vdmUgdGhlIGVudGl0eSBieSBhbiBhbW91bnQuIFVzZSBuZWdhdGl2ZSB2YWx1ZXNcblx0KiBmb3IgYW4gb3Bwb3NpdGUgZGlyZWN0aW9uLlxuXHQqL1xuXHRzaGlmdDogZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcblx0XHRpZiAoeCkgdGhpcy54ICs9IHg7XG5cdFx0aWYgKHkpIHRoaXMueSArPSB5O1xuXHRcdGlmICh3KSB0aGlzLncgKz0gdztcblx0XHRpZiAoaCkgdGhpcy5oICs9IGg7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5fY2FzY2FkZVxuXHQqIEBjb21wIDJEXG4gICAgKiBAc2lnbiBwdWJsaWMgdm9pZCAuX2Nhc2NhZGUoZSlcblx0KiBAcGFyYW0gZSAtIEFtb3VudCB0byBtb3ZlIFhcblx0KiBTaGlmdCBtb3ZlIG9yIHJvdGF0ZSB0aGUgZW50aXR5IGJ5IGFuIGFtb3VudC4gVXNlIG5lZ2F0aXZlIHZhbHVlc1xuXHQqIGZvciBhbiBvcHBvc2l0ZSBkaXJlY3Rpb24uXG5cdCovXG5cdF9jYXNjYWRlOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICghZSkgcmV0dXJuOyAvL25vIGNoYW5nZSBpbiBwb3NpdGlvblxuXHRcdHZhciBpID0gMCwgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbiwgbCA9IGNoaWxkcmVuLmxlbmd0aCwgb2JqO1xuXHRcdC8vcm90YXRpb25cblx0XHRpZiAoZS5jb3MpIHtcblx0XHRcdGZvciAoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRcdG9iaiA9IGNoaWxkcmVuW2ldO1xuXHRcdFx0XHRpZiAoJ3JvdGF0ZScgaW4gb2JqKSBvYmoucm90YXRlKGUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvL3VzZSBNQlIgb3IgY3VycmVudFxuXHRcdFx0dmFyIHJlY3QgPSB0aGlzLl9tYnIgfHwgdGhpcyxcblx0XHRcdFx0ZHggPSByZWN0Ll94IC0gZS5feCxcblx0XHRcdFx0ZHkgPSByZWN0Ll95IC0gZS5feSxcblx0XHRcdFx0ZHcgPSByZWN0Ll93IC0gZS5fdyxcblx0XHRcdFx0ZGggPSByZWN0Ll9oIC0gZS5faDtcblxuXHRcdFx0Zm9yICg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0b2JqID0gY2hpbGRyZW5baV07XG5cdFx0XHRcdG9iai5zaGlmdChkeCwgZHksIGR3LCBkaCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmF0dGFjaFxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmF0dGFjaChFbnRpdHkgb2JqWywgLi4sIEVudGl0eSBvYmpOXSlcblx0KiBAcGFyYW0gb2JqIC0gRW50aXR5KHMpIHRvIGF0dGFjaFxuXHQqIEF0dGFjaGVzIGFuIGVudGl0aWVzIHBvc2l0aW9uIGFuZCByb3RhdGlvbiB0byBjdXJyZW50IGVudGl0eS4gV2hlbiB0aGUgY3VycmVudCBlbnRpdHkgbW92ZXMsXG5cdCogdGhlIGF0dGFjaGVkIGVudGl0eSB3aWxsIG1vdmUgYnkgdGhlIHNhbWUgYW1vdW50LiBBdHRhY2hlZCBlbnRpdGllcyBzdG9yZWQgaW4gX2NoaWxkcmVuIGFycmF5LFxuXHQqIHRoZSBwYXJlbnQgb2JqZWN0IGlzIHN0b3JlZCBpbiBfcGFyZW50IG9uIHRoZSBjaGlsZCBlbnRpdGllcy5cblx0KlxuXHQqIEFzIG1hbnkgb2JqZWN0cyBhcyB3YW50ZWQgY2FuIGJlIGF0dGFjaGVkIGFuZCBhIGhpZXJhcmNoeSBvZiBvYmplY3RzIGlzIHBvc3NpYmxlIGJ5IGF0dGFjaGluZy5cblx0Ki9cblx0YXR0YWNoOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGkgPSAwLCBhcmcgPSBhcmd1bWVudHMsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBvYmo7XG5cdFx0Zm9yICg7IGkgPCBsOyArK2kpIHtcblx0XHRcdG9iaiA9IGFyZ1tpXTtcblx0XHRcdGlmIChvYmouX3BhcmVudCkgeyBvYmouX3BhcmVudC5kZXRhY2gob2JqKTsgfVxuXHRcdFx0b2JqLl9wYXJlbnQgPSB0aGlzO1xuXHRcdFx0dGhpcy5fY2hpbGRyZW4ucHVzaChvYmopO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmRldGFjaFxuXHQqIEBjb21wIDJEXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRldGFjaChbRW50aXR5IG9ial0pXG5cdCogQHBhcmFtIG9iaiAtIFRoZSBlbnRpdHkgdG8gZGV0YWNoLiBMZWZ0IGJsYW5rIHdpbGwgcmVtb3ZlIGFsbCBhdHRhY2hlZCBlbnRpdGllc1xuXHQqIFN0b3AgYW4gZW50aXR5IGZyb20gZm9sbG93aW5nIHRoZSBjdXJyZW50IGVudGl0eS4gUGFzc2luZyBubyBhcmd1bWVudHMgd2lsbCBzdG9wXG5cdCogZXZlcnkgZW50aXR5IGF0dGFjaGVkLlxuXHQqL1xuXHRkZXRhY2g6IGZ1bmN0aW9uIChvYmopIHtcblx0XHQvL2lmIG5vdGhpbmcgcGFzc2VkLCByZW1vdmUgYWxsIGF0dGFjaGVkIG9iamVjdHNcblx0XHRpZiAoIW9iaikge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR0aGlzLl9jaGlsZHJlbltpXS5fcGFyZW50ID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdHRoaXMuX2NoaWxkcmVuID0gW107XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHQvL2lmIG9iaiBwYXNzZWQsIGZpbmQgdGhlIGhhbmRsZXIgYW5kIHVuYmluZFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9jaGlsZHJlbltpXSA9PSBvYmopIHtcblx0XHRcdFx0dGhpcy5fY2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRvYmouX3BhcmVudCA9IG51bGw7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5vcmlnaW5cblx0KiBAY29tcCAyRFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5vcmlnaW4oTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gUGl4ZWwgdmFsdWUgb2Ygb3JpZ2luIG9mZnNldCBvbiB0aGUgWCBheGlzXG5cdCogQHBhcmFtIHkgLSBQaXhlbCB2YWx1ZSBvZiBvcmlnaW4gb2Zmc2V0IG9uIHRoZSBZIGF4aXNcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAub3JpZ2luKFN0cmluZyBvZmZzZXQpXG5cdCogQHBhcmFtIG9mZnNldCAtIENvbWJpbmF0aW9uIG9mIGNlbnRlciwgdG9wLCBib3R0b20sIG1pZGRsZSwgbGVmdCBhbmQgcmlnaHRcblx0KiBTZXQgdGhlIG9yaWdpbiBwb2ludCBvZiBhbiBlbnRpdHkgZm9yIGl0IHRvIHJvdGF0ZSBhcm91bmQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHRoaXMub3JpZ2luKFwidG9wIGxlZnRcIilcblx0KiB0aGlzLm9yaWdpbihcImNlbnRlclwiKVxuXHQqIHRoaXMub3JpZ2luKFwiYm90dG9tIHJpZ2h0XCIpXG5cdCogdGhpcy5vcmlnaW4oXCJtaWRkbGUgcmlnaHRcIilcblx0KiB+fn5cblx0KlxuXHQqIEBzZWUgLnJvdGF0aW9uXG5cdCovXG5cdG9yaWdpbjogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHQvL3RleHQgYmFzZWQgb3JpZ2luXG5cdFx0aWYgKHR5cGVvZiB4ID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRpZiAoeCA9PT0gXCJjZW50cmVcIiB8fCB4ID09PSBcImNlbnRlclwiIHx8IHguaW5kZXhPZignICcpID09PSAtMSkge1xuXHRcdFx0XHR4ID0gdGhpcy5fdyAvIDI7XG5cdFx0XHRcdHkgPSB0aGlzLl9oIC8gMjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBjbWQgPSB4LnNwbGl0KCcgJyk7XG5cdFx0XHRcdGlmIChjbWRbMF0gPT09IFwidG9wXCIpIHkgPSAwO1xuXHRcdFx0XHRlbHNlIGlmIChjbWRbMF0gPT09IFwiYm90dG9tXCIpIHkgPSB0aGlzLl9oO1xuXHRcdFx0XHRlbHNlIGlmIChjbWRbMF0gPT09IFwibWlkZGxlXCIgfHwgY21kWzFdID09PSBcImNlbnRlclwiIHx8IGNtZFsxXSA9PT0gXCJjZW50cmVcIikgeSA9IHRoaXMuX2ggLyAyO1xuXG5cdFx0XHRcdGlmIChjbWRbMV0gPT09IFwiY2VudGVyXCIgfHwgY21kWzFdID09PSBcImNlbnRyZVwiIHx8IGNtZFsxXSA9PT0gXCJtaWRkbGVcIikgeCA9IHRoaXMuX3cgLyAyO1xuXHRcdFx0XHRlbHNlIGlmIChjbWRbMV0gPT09IFwibGVmdFwiKSB4ID0gMDtcblx0XHRcdFx0ZWxzZSBpZiAoY21kWzFdID09PSBcInJpZ2h0XCIpIHggPSB0aGlzLl93O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX29yaWdpbi54ID0geDtcblx0XHR0aGlzLl9vcmlnaW4ueSA9IHk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5mbGlwXG5cdCogQGNvbXAgMkRcblx0KiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBlbnRpdHkgaGFzIGZsaXBwZWRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZmxpcChTdHJpbmcgZGlyKVxuXHQqIEBwYXJhbSBkaXIgLSBGbGlwIGRpcmVjdGlvblxuXHQqXG5cdCogRmxpcCBlbnRpdHkgb24gcGFzc2VkIGRpcmVjdGlvblxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLmZsaXAoXCJYXCIpXG5cdCogfn5+XG5cdCovXG5cdGZsaXA6IGZ1bmN0aW9uIChkaXIpIHtcblx0XHRkaXIgPSBkaXIgfHwgXCJYXCI7XG4gICAgICAgICAgICAgICAgaWYoIXRoaXNbXCJfZmxpcFwiICsgZGlyXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW1wiX2ZsaXBcIiArIGRpcl0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG4gICAgICAgICAgICAgICAgfVxuXHR9LFxuXG4gICAgICAgIC8qKkBcblx0KiAjLnVuZmxpcFxuXHQqIEBjb21wIDJEXG5cdCogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgZW50aXR5IGhhcyB1bmZsaXBwZWRcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAudW5mbGlwKFN0cmluZyBkaXIpXG5cdCogQHBhcmFtIGRpciAtIFVuZmxpcCBkaXJlY3Rpb25cblx0KlxuXHQqIFVuZmxpcCBlbnRpdHkgb24gcGFzc2VkIGRpcmVjdGlvbiAoaWYgaXQncyBmbGlwcGVkKVxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLnVuZmxpcChcIlhcIilcblx0KiB+fn5cblx0Ki9cblx0dW5mbGlwOiBmdW5jdGlvbiAoZGlyKSB7XG5cdFx0ZGlyID0gZGlyIHx8IFwiWFwiO1xuICAgICAgICAgICAgICAgIGlmKHRoaXNbXCJfZmxpcFwiICsgZGlyXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW1wiX2ZsaXBcIiArIGRpcl0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuICAgICAgICAgICAgICAgIH1cblx0fSxcblxuXHQvKipcblx0KiBNZXRob2QgZm9yIHJvdGF0aW9uIHJhdGhlciB0aGFuIHRocm91Z2ggYSBzZXR0ZXJcblx0Ki9cblx0cm90YXRlOiBmdW5jdGlvbiAoZSkge1xuXHRcdC8vYXNzdW1lIGV2ZW50IGRhdGEgb3JpZ2luXG5cdFx0dGhpcy5fb3JpZ2luLnggPSBlLm8ueCAtIHRoaXMuX3g7XG5cdFx0dGhpcy5fb3JpZ2luLnkgPSBlLm8ueSAtIHRoaXMuX3k7XG5cblx0XHQvL21vZGlmeSB0aHJvdWdoIHRoZSBzZXR0ZXIgbWV0aG9kXG5cdFx0dGhpcy5fYXR0cignX3JvdGF0aW9uJywgZS50aGV0YSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuX2F0dHJcblx0KiBAY29tcCAyRFxuXHQqIFNldHRlciBtZXRob2QgZm9yIGFsbCAyRCBwcm9wZXJ0aWVzIGluY2x1ZGluZ1xuXHQqIHgsIHksIHcsIGgsIGFscGhhLCByb3RhdGlvbiBhbmQgdmlzaWJsZS5cblx0Ki9cblx0X2F0dHI6IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuXHRcdC8va2VlcCBhIHJlZmVyZW5jZSBvZiB0aGUgb2xkIHBvc2l0aW9uc1xuXHRcdHZhciBwb3MgPSB0aGlzLnBvcygpLFxuXHRcdFx0b2xkID0gdGhpcy5tYnIoKSB8fCBwb3M7XG5cblx0XHQvL2lmIHJvdGF0aW9uLCB1c2UgdGhlIHJvdGF0ZSBtZXRob2Rcblx0XHRpZiAobmFtZSA9PT0gJ19yb3RhdGlvbicpIHtcblx0XHRcdHRoaXMuX3JvdGF0ZSh2YWx1ZSk7XG5cdFx0XHR0aGlzLnRyaWdnZXIoXCJSb3RhdGVcIik7XG5cdFx0XHQvL3NldCB0aGUgZ2xvYmFsIFogYW5kIHRyaWdnZXIgcmVvcmRlciBqdXN0IGluIGNhc2Vcblx0XHR9IGVsc2UgaWYgKG5hbWUgPT09ICdfeicpIHtcblx0XHRcdHRoaXMuX2dsb2JhbFogPSBwYXJzZUludCh2YWx1ZSArIENyYWZ0eS56ZXJvRmlsbCh0aGlzWzBdLCA1KSwgMTApOyAvL21hZ2ljIG51bWJlciAxMGU1IGlzIHRoZSBtYXggbnVtIG9mIGVudGl0aWVzXG5cdFx0XHR0aGlzLnRyaWdnZXIoXCJyZW9yZGVyXCIpO1xuXHRcdFx0Ly9pZiB0aGUgcmVjdCBib3VuZHMgY2hhbmdlLCB1cGRhdGUgdGhlIE1CUiBhbmQgdHJpZ2dlciBtb3ZlXG5cdFx0fSBlbHNlIGlmIChuYW1lID09ICdfeCcgfHwgbmFtZSA9PT0gJ195JyB8fCBuYW1lID09PSAnX3cnIHx8IG5hbWUgPT09ICdfaCcpIHtcblx0XHRcdHZhciBtYnIgPSB0aGlzLl9tYnI7XG5cdFx0XHRpZiAobWJyKSB7XG5cdFx0XHRcdG1icltuYW1lXSAtPSB0aGlzW25hbWVdIC0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0XHR0aGlzW25hbWVdID0gdmFsdWU7XG5cdFx0XHR0aGlzLnRyaWdnZXIoXCJNb3ZlXCIsIG9sZCk7XG5cdFx0fVxuXG5cdFx0Ly9ldmVyeXRoaW5nIHdpbGwgYXNzdW1lIHRoZSB2YWx1ZVxuXHRcdHRoaXNbbmFtZV0gPSB2YWx1ZTtcblxuXHRcdC8vdHJpZ2dlciBhIGNoYW5nZVxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiLCBvbGQpO1xuXHR9XG59KTtcblxuQ3JhZnR5LmMoXCJQaHlzaWNzXCIsIHtcblx0X2dyYXZpdHk6IDAuNCxcblx0X2ZyaWN0aW9uOiAwLjIsXG5cdF9ib3VuY2U6IDAuNSxcblxuXHRncmF2aXR5OiBmdW5jdGlvbiAoZ3Jhdml0eSkge1xuXHRcdHRoaXMuX2dyYXZpdHkgPSBncmF2aXR5O1xuXHR9XG59KTtcblxuLyoqQFxuKiAjR3Jhdml0eVxuKiBAY2F0ZWdvcnkgMkRcbiogQWRkcyBncmF2aXRhdGlvbmFsIHB1bGwgdG8gdGhlIGVudGl0eS5cbiovXG5DcmFmdHkuYyhcIkdyYXZpdHlcIiwge1xuXHRfZ3Jhdml0eUNvbnN0OiAwLjIsXG5cdF9neTogMCxcblx0X2ZhbGxpbmc6IHRydWUsXG5cdF9hbnRpOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKFwiMkRcIik7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZ3Jhdml0eVxuXHQqIEBjb21wIEdyYXZpdHlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZ3Jhdml0eShbY29tcF0pXG5cdCogQHBhcmFtIGNvbXAgLSBUaGUgbmFtZSBvZiBhIGNvbXBvbmVudCB0aGF0IHdpbGwgc3RvcCB0aGlzIGVudGl0eSBmcm9tIGZhbGxpbmdcblx0KlxuXHQqIEVuYWJsZSBncmF2aXR5IGZvciB0aGlzIGVudGl0eSBubyBtYXR0ZXIgd2hldGhlciBjb21wIHBhcmFtZXRlciBpcyBub3Qgc3BlY2lmaWVkLFxuXHQqIElmIGNvbXAgcGFyYW1ldGVyIGlzIHNwZWNpZmllZCBhbGwgZW50aXRpZXMgd2l0aCB0aGF0IGNvbXBvbmVudCB3aWxsIHN0b3AgdGhpcyBlbnRpdHkgZnJvbSBmYWxsaW5nLlxuXHQqIEZvciBhIHBsYXllciBlbnRpdHkgaW4gYSBwbGF0Zm9ybSBnYW1lIHRoaXMgd291bGQgYmUgYSBjb21wb25lbnQgdGhhdCBpcyBhZGRlZCB0byBhbGwgZW50aXRpZXNcblx0KiB0aGF0IHRoZSBwbGF5ZXIgc2hvdWxkIGJlIGFibGUgdG8gd2FsayBvbi5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvciwgR3Jhdml0eVwiKVxuXHQqXHQgLmNvbG9yKFwicmVkXCIpXG5cdCpcdCAuYXR0cih7IHc6IDEwMCwgaDogMTAwIH0pXG5cdCpcdCAuZ3Jhdml0eShcInBsYXRmb3JtXCIpXG5cdCogfn5+XG5cdCovXG5cdGdyYXZpdHk6IGZ1bmN0aW9uIChjb21wKSB7XG5cdFx0aWYgKGNvbXApIHRoaXMuX2FudGkgPSBjb21wO1xuXG5cdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLl9lbnRlckZyYW1lKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmdyYXZpdHlDb25zdFxuXHQqIEBjb21wIEdyYXZpdHlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZ3Jhdml0eUNvbnN0KGcpXG5cdCogQHBhcmFtIGcgLSBncmF2aXRhdGlvbmFsIGNvbnN0YW50XG5cdCpcblx0KiBTZXQgdGhlIGdyYXZpdGF0aW9uYWwgY29uc3RhbnQgdG8gZy4gVGhlIGRlZmF1bHQgaXMgLjIuIFRoZSBncmVhdGVyIGcsIHRoZSBmYXN0ZXIgdGhlIG9iamVjdCBmYWxscy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBDb2xvciwgR3Jhdml0eVwiKVxuXHQqICAgLmNvbG9yKFwicmVkXCIpXG5cdCogICAuYXR0cih7IHc6IDEwMCwgaDogMTAwIH0pXG5cdCogICAuZ3Jhdml0eShcInBsYXRmb3JtXCIpXG5cdCogICAuZ3Jhdml0eUNvbnN0KDIpXG5cdCogfn5+XG5cdCovXG5cdGdyYXZpdHlDb25zdDogZnVuY3Rpb24oZykge1xuXHRcdHRoaXMuX2dyYXZpdHlDb25zdD1nO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9lbnRlckZyYW1lOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX2ZhbGxpbmcpIHtcblx0XHRcdC8vaWYgZmFsbGluZywgbW92ZSB0aGUgcGxheWVycyBZXG5cdFx0XHR0aGlzLl9neSArPSB0aGlzLl9ncmF2aXR5Q29uc3Q7XG5cdFx0XHR0aGlzLnkgKz0gdGhpcy5fZ3k7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2d5ID0gMDsgLy9yZXNldCBjaGFuZ2UgaW4geVxuXHRcdH1cblxuXHRcdHZhciBvYmosIGhpdCA9IGZhbHNlLCBwb3MgPSB0aGlzLnBvcygpLFxuXHRcdFx0cSwgaSA9IDAsIGw7XG5cblx0XHQvL0luY3JlYXNlIGJ5IDEgdG8gbWFrZSBzdXJlIG1hcC5zZWFyY2goKSBmaW5kcyB0aGUgZmxvb3Jcblx0XHRwb3MuX3krKztcblxuXHRcdC8vbWFwLnNlYXJjaCB3YW50cyBfeCBhbmQgaW50ZXJzZWN0IHdhbnRzIHguLi5cblx0XHRwb3MueCA9IHBvcy5feDtcblx0XHRwb3MueSA9IHBvcy5feTtcblx0XHRwb3MudyA9IHBvcy5fdztcblx0XHRwb3MuaCA9IHBvcy5faDtcblxuXHRcdHEgPSBDcmFmdHkubWFwLnNlYXJjaChwb3MpO1xuXHRcdGwgPSBxLmxlbmd0aDtcblxuXHRcdGZvciAoOyBpIDwgbDsgKytpKSB7XG5cdFx0XHRvYmogPSBxW2ldO1xuXHRcdFx0Ly9jaGVjayBmb3IgYW4gaW50ZXJzZWN0aW9uIGRpcmVjdGx5IGJlbG93IHRoZSBwbGF5ZXJcblx0XHRcdGlmIChvYmogIT09IHRoaXMgJiYgb2JqLmhhcyh0aGlzLl9hbnRpKSAmJiBvYmouaW50ZXJzZWN0KHBvcykpIHtcblx0XHRcdFx0aGl0ID0gb2JqO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaGl0KSB7IC8vc3RvcCBmYWxsaW5nIGlmIGZvdW5kXG5cdFx0XHRpZiAodGhpcy5fZmFsbGluZykgdGhpcy5zdG9wRmFsbGluZyhoaXQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9mYWxsaW5nID0gdHJ1ZTsgLy9rZWVwIGZhbGxpbmcgb3RoZXJ3aXNlXG5cdFx0fVxuXHR9LFxuXG5cdHN0b3BGYWxsaW5nOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmIChlKSB0aGlzLnkgPSBlLl95IC0gdGhpcy5faDsgLy9tb3ZlIG9iamVjdFxuXG5cdFx0Ly90aGlzLl9neSA9IC0xICogdGhpcy5fYm91bmNlO1xuXHRcdHRoaXMuX2ZhbGxpbmcgPSBmYWxzZTtcblx0XHRpZiAodGhpcy5fdXApIHRoaXMuX3VwID0gZmFsc2U7XG5cdFx0dGhpcy50cmlnZ2VyKFwiaGl0XCIpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmFudGlncmF2aXR5XG5cdCogQGNvbXAgR3Jhdml0eVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hbnRpZ3Jhdml0eSgpXG5cdCogRGlzYWJsZSBncmF2aXR5IGZvciB0aGlzIGNvbXBvbmVudC4gSXQgY2FuIGJlIHJlZW5hYmxlZCBieSBjYWxsaW5nIC5ncmF2aXR5KClcblx0Ki9cblx0YW50aWdyYXZpdHk6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnVuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy5fZW50ZXJGcmFtZSk7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNDcmFmdHkucG9seWdvblxuKiBAY2F0ZWdvcnkgMkRcbipcbiogUG9seWdvbiBvYmplY3QgdXNlZCBmb3IgaGl0Ym94ZXMgYW5kIGNsaWNrIG1hcHMuIE11c3QgcGFzcyBhbiBBcnJheSBmb3IgZWFjaCBwb2ludCBhcyBhblxuKiBhcmd1bWVudCB3aGVyZSBpbmRleCAwIGlzIHRoZSB4IHBvc2l0aW9uIGFuZCBpbmRleCAxIGlzIHRoZSB5IHBvc2l0aW9uLlxuKlxuKiBGb3IgZXhhbXBsZSBvbmUgcG9pbnQgb2YgYSBwb2x5Z29uIHdpbGwgbG9vayBsaWtlIHRoaXM6IGBbMCw1XWAgd2hlcmUgdGhlIGB4YCBpcyBgMGAgYW5kIHRoZSBgeWAgaXMgYDVgLlxuKlxuKiBDYW4gcGFzcyBhbiBhcnJheSBvZiB0aGUgcG9pbnRzIG9yIHNpbXBseSBwdXQgZWFjaCBwb2ludCBhcyBhbiBhcmd1bWVudC5cbipcbiogV2hlbiBjcmVhdGluZyBhIHBvbHlnb24gZm9yIGFuIGVudGl0eSwgZWFjaCBwb2ludCBzaG91bGQgYmUgb2Zmc2V0IG9yIHJlbGF0aXZlIGZyb20gdGhlIGVudGl0aWVzIGB4YCBhbmQgYHlgXG4qIChkb24ndCBpbmNsdWRlIHRoZSBhYnNvbHV0ZSB2YWx1ZXMgYXMgaXQgd2lsbCBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZSB0aGlzKS5cbipcbipcbiogQGV4YW1wbGVcbiogfn5+XG4qIG5ldyBDcmFmdHkucG9seWdvbihbNTAsMF0sWzEwMCwxMDBdLFswLDEwMF0pO1xuKiBuZXcgQ3JhZnR5LnBvbHlnb24oW1s1MCwwXSxbMTAwLDEwMF0sWzAsMTAwXV0pO1xuKiB+fn5cbiovXG5DcmFmdHkucG9seWdvbiA9IGZ1bmN0aW9uIChwb2x5KSB7XG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdHBvbHkgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXHR9XG5cdHRoaXMucG9pbnRzID0gcG9seTtcbn07XG5cbkNyYWZ0eS5wb2x5Z29uLnByb3RvdHlwZSA9IHtcblx0LyoqQFxuXHQqICMuY29udGFpbnNQb2ludFxuXHQqIEBjb21wIENyYWZ0eS5wb2x5Z29uXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmNvbnRhaW5zUG9pbnQoTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCpcblx0KiBNZXRob2QgaXMgdXNlZCB0byBkZXRlcm1pbmUgaWYgYSBnaXZlbiBwb2ludCBpcyBjb250YWluZWQgYnkgdGhlIHBvbHlnb24uXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIHZhciBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKFs1MCwwXSxbMTAwLDEwMF0sWzAsMTAwXSk7XG5cdCogcG9seS5jb250YWluc1BvaW50KDUwLCA1MCk7IC8vVFJVRVxuXHQqIHBvbHkuY29udGFpbnNQb2ludCgwLCAwKTsgLy9GQUxTRVxuXHQqIH5+flxuXHQqL1xuXHRjb250YWluc1BvaW50OiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdHZhciBwID0gdGhpcy5wb2ludHMsIGksIGosIGMgPSBmYWxzZTtcblxuXHRcdGZvciAoaSA9IDAsIGogPSBwLmxlbmd0aCAtIDE7IGkgPCBwLmxlbmd0aDsgaiA9IGkrKykge1xuXHRcdFx0aWYgKCgocFtpXVsxXSA+IHkpICE9IChwW2pdWzFdID4geSkpICYmICh4IDwgKHBbal1bMF0gLSBwW2ldWzBdKSAqICh5IC0gcFtpXVsxXSkgLyAocFtqXVsxXSAtIHBbaV1bMV0pICsgcFtpXVswXSkpIHtcblx0XHRcdFx0YyA9ICFjO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBjO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnNoaWZ0XG5cdCogQGNvbXAgQ3JhZnR5LnBvbHlnb25cblx0KiBAc2lnbiBwdWJsaWMgdm9pZCAuc2hpZnQoTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gQW1vdW50IHRvIHNoaWZ0IHRoZSBgeGAgYXhpc1xuXHQqIEBwYXJhbSB5IC0gQW1vdW50IHRvIHNoaWZ0IHRoZSBgeWAgYXhpc1xuXHQqXG5cdCogU2hpZnRzIGV2ZXJ5IHNpbmdsZSBwb2ludCBpbiB0aGUgcG9seWdvbiBieSB0aGUgc3BlY2lmaWVkIGFtb3VudC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdmFyIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oWzUwLDBdLFsxMDAsMTAwXSxbMCwxMDBdKTtcblx0KiBwb2x5LnNoaWZ0KDUsNSk7XG5cdCogLy9bWzU1LDVdLCBbMTA1LDVdLCBbNSwxMDVdXTtcblx0KiB+fn5cblx0Ki9cblx0c2hpZnQ6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0dmFyIGkgPSAwLCBsID0gdGhpcy5wb2ludHMubGVuZ3RoLCBjdXJyZW50O1xuXHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50ID0gdGhpcy5wb2ludHNbaV07XG5cdFx0XHRjdXJyZW50WzBdICs9IHg7XG5cdFx0XHRjdXJyZW50WzFdICs9IHk7XG5cdFx0fVxuXHR9LFxuXG5cdHJvdGF0ZTogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgaSA9IDAsIGwgPSB0aGlzLnBvaW50cy5sZW5ndGgsXG5cdFx0XHRjdXJyZW50LCB4LCB5O1xuXG5cdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdGN1cnJlbnQgPSB0aGlzLnBvaW50c1tpXTtcblxuXHRcdFx0eCA9IGUuby54ICsgKGN1cnJlbnRbMF0gLSBlLm8ueCkgKiBlLmNvcyArIChjdXJyZW50WzFdIC0gZS5vLnkpICogZS5zaW47XG5cdFx0XHR5ID0gZS5vLnkgLSAoY3VycmVudFswXSAtIGUuby54KSAqIGUuc2luICsgKGN1cnJlbnRbMV0gLSBlLm8ueSkgKiBlLmNvcztcblxuXHRcdFx0Y3VycmVudFswXSA9IHg7XG5cdFx0XHRjdXJyZW50WzFdID0geTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKkBcbiogI0NyYWZ0eS5jaXJjbGVcbiogQGNhdGVnb3J5IDJEXG4qIENpcmNsZSBvYmplY3QgdXNlZCBmb3IgaGl0Ym94ZXMgYW5kIGNsaWNrIG1hcHMuIE11c3QgcGFzcyBhIGB4YCwgYSBgeWAgYW5kIGEgYHJhZGl1c2AgdmFsdWUuXG4qXG4qQGV4YW1wbGVcbiogfn5+XG4qIHZhciBjZW50ZXJYID0gNSxcbiogICAgIGNlbnRlclkgPSAxMCxcbiogICAgIHJhZGl1cyA9IDI1O1xuKlxuKiBuZXcgQ3JhZnR5LmNpcmNsZShjZW50ZXJYLCBjZW50ZXJZLCByYWRpdXMpO1xuKiB+fn5cbipcbiogV2hlbiBjcmVhdGluZyBhIGNpcmNsZSBmb3IgYW4gZW50aXR5LCBlYWNoIHBvaW50IHNob3VsZCBiZSBvZmZzZXQgb3IgcmVsYXRpdmUgZnJvbSB0aGUgZW50aXRpZXMgYHhgIGFuZCBgeWBcbiogKGRvbid0IGluY2x1ZGUgdGhlIGFic29sdXRlIHZhbHVlcyBhcyBpdCB3aWxsIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlIHRoaXMpLlxuKi9cbkNyYWZ0eS5jaXJjbGUgPSBmdW5jdGlvbiAoeCwgeSwgcmFkaXVzKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMucmFkaXVzID0gcmFkaXVzO1xuXG4gICAgLy8gQ3JlYXRlcyBhbiBvY3RhZ29uIHRoYXQgYXBwcm94aW1hdGUgdGhlIGNpcmNsZSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eS5cbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHZhciB0aGV0YTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICAgIHRoZXRhID0gaSAqIE1hdGguUEkgLyA0O1xuICAgICAgICB0aGlzLnBvaW50c1tpXSA9IFt0aGlzLnggKyAoTWF0aC5zaW4odGhldGEpICogcmFkaXVzKSwgdGhpcy55ICsgKE1hdGguY29zKHRoZXRhKSAqIHJhZGl1cyldO1xuICAgIH1cbn07XG5cbkNyYWZ0eS5jaXJjbGUucHJvdG90eXBlID0ge1xuICAgIC8qKkBcblx0KiAjLmNvbnRhaW5zUG9pbnRcblx0KiBAY29tcCBDcmFmdHkuY2lyY2xlXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmNvbnRhaW5zUG9pbnQoTnVtYmVyIHgsIE51bWJlciB5KVxuXHQqIEBwYXJhbSB4IC0gWCBwb3NpdGlvbiBvZiB0aGUgcG9pbnRcblx0KiBAcGFyYW0geSAtIFkgcG9zaXRpb24gb2YgdGhlIHBvaW50XG5cdCpcblx0KiBNZXRob2QgaXMgdXNlZCB0byBkZXRlcm1pbmUgaWYgYSBnaXZlbiBwb2ludCBpcyBjb250YWluZWQgYnkgdGhlIGNpcmNsZS5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdmFyIGNpcmNsZSA9IG5ldyBDcmFmdHkuY2lyY2xlKDAsIDAsIDEwKTtcblx0KiBjaXJjbGUuY29udGFpbnNQb2ludCgwLCAwKTsgLy9UUlVFXG5cdCogY2lyY2xlLmNvbnRhaW5zUG9pbnQoNTAsIDUwKTsgLy9GQUxTRVxuXHQqIH5+flxuXHQqL1xuXHRjb250YWluc1BvaW50OiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cyxcblx0XHQgICAgc3FydCA9IE1hdGguc3FydCxcblx0XHQgICAgZGVsdGFYID0gdGhpcy54IC0geCxcblx0XHQgICAgZGVsdGFZID0gdGhpcy55IC0geTtcblxuXHRcdHJldHVybiAoZGVsdGFYICogZGVsdGFYICsgZGVsdGFZICogZGVsdGFZKSA8IChyYWRpdXMgKiByYWRpdXMpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnNoaWZ0XG5cdCogQGNvbXAgQ3JhZnR5LmNpcmNsZVxuXHQqIEBzaWduIHB1YmxpYyB2b2lkIC5zaGlmdChOdW1iZXIgeCwgTnVtYmVyIHkpXG5cdCogQHBhcmFtIHggLSBBbW91bnQgdG8gc2hpZnQgdGhlIGB4YCBheGlzXG5cdCogQHBhcmFtIHkgLSBBbW91bnQgdG8gc2hpZnQgdGhlIGB5YCBheGlzXG5cdCpcblx0KiBTaGlmdHMgdGhlIGNpcmNsZSBieSB0aGUgc3BlY2lmaWVkIGFtb3VudC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdmFyIHBvbHkgPSBuZXcgQ3JhZnR5LmNpcmNsZSgwLCAwLCAxMCk7XG5cdCogY2lyY2xlLnNoaWZ0KDUsNSk7XG5cdCogLy97eDogNSwgeTogNSwgcmFkaXVzOiAxMH07XG5cdCogfn5+XG5cdCovXG5cdHNoaWZ0OiBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdHRoaXMueCArPSB4O1xuXHRcdHRoaXMueSArPSB5O1xuXG5cdFx0dmFyIGkgPSAwLCBsID0gdGhpcy5wb2ludHMubGVuZ3RoLCBjdXJyZW50O1xuXHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50ID0gdGhpcy5wb2ludHNbaV07XG5cdFx0XHRjdXJyZW50WzBdICs9IHg7XG5cdFx0XHRjdXJyZW50WzFdICs9IHk7XG5cdFx0fVxuXHR9LFxuXG5cdHJvdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdC8vIFdlIGFyZSBhIGNpcmNsZSwgd2UgZG9uJ3QgaGF2ZSB0byByb3RhdGUgOilcblx0fVxufTtcblxuXG5DcmFmdHkubWF0cml4ID0gZnVuY3Rpb24gKG0pIHtcblx0dGhpcy5tdHggPSBtO1xuXHR0aGlzLndpZHRoID0gbVswXS5sZW5ndGg7XG5cdHRoaXMuaGVpZ2h0ID0gbS5sZW5ndGg7XG59O1xuXG5DcmFmdHkubWF0cml4LnByb3RvdHlwZSA9IHtcblx0eDogZnVuY3Rpb24gKG90aGVyKSB7XG5cdFx0aWYgKHRoaXMud2lkdGggIT0gb3RoZXIuaGVpZ2h0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5oZWlnaHQ7IGkrKykge1xuXHRcdFx0cmVzdWx0W2ldID0gW107XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IG90aGVyLndpZHRoOyBqKyspIHtcblx0XHRcdFx0dmFyIHN1bSA9IDA7XG5cdFx0XHRcdGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy53aWR0aDsgaysrKSB7XG5cdFx0XHRcdFx0c3VtICs9IHRoaXMubXR4W2ldW2tdICogb3RoZXIubXR4W2tdW2pdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlc3VsdFtpXVtqXSA9IHN1bTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG5ldyBDcmFmdHkubWF0cml4KHJlc3VsdCk7XG5cdH0sXG5cblxuXHRlOiBmdW5jdGlvbiAocm93LCBjb2wpIHtcblx0XHQvL3Rlc3QgaWYgb3V0IG9mIGJvdW5kc1xuXHRcdGlmIChyb3cgPCAxIHx8IHJvdyA+IHRoaXMubXR4Lmxlbmd0aCB8fCBjb2wgPCAxIHx8IGNvbCA+IHRoaXMubXR4WzBdLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cdFx0cmV0dXJuIHRoaXMubXR4W3JvdyAtIDFdW2NvbCAtIDFdO1xuXHR9XG59XG5cbi8qKkBcbiogI0NvbGxpc2lvblxuKiBAY2F0ZWdvcnkgMkRcbiogQ29tcG9uZW50IHRvIGRldGVjdCBjb2xsaXNpb24gYmV0d2VlbiBhbnkgdHdvIGNvbnZleCBwb2x5Z29ucy5cbiovXG5DcmFmdHkuYyhcIkNvbGxpc2lvblwiLCB7XG4gICAgLyoqQFxuICAgICAqICMuaW5pdFxuICAgICAqIEBjb21wIENvbGxpc2lvblxuICAgICAqIENyZWF0ZSBhIHJlY3RhbmdsZSBwb2x5Z29uIGJhc2VkIG9uIHRoZSB4LCB5LCB3LCBoIGRpbWVuc2lvbnMuXG4gICAgICpcbiAgICAgKiBZb3UgbXVzdCBlbnN1cmUgdGhhdCB0aGUgeCwgeSwgdywgaCBwcm9wZXJ0aWVzIGFyZSBzZXQgYmVmb3JlIHRoZSBpbml0IGZ1bmN0aW9uIGlzIGNhbGxlZC4gSWYgeW91IGhhdmUgYSBDYXIgY29tcG9uZW50IHRoYXQgc2V0cyB0aGVzZSBwcm9wZXJ0aWVzIHlvdSBzaG91bGQgY3JlYXRlIHlvdXIgZW50aXR5IGxpa2UgdGhpc1xuICAgICAqIH5+flxuICAgICAqIENyYWZ0eS5lKCcyRCwgRE9NLCBDYXIsIENvbGxpc2lvbicpO1xuICAgICAqIH5+flxuICAgICAqIEFuZCBub3QgbGlrZVxuICAgICAqIH5+flxuICAgICAqIENyYWZ0eS5lKCcyRCwgRE9NLCBDb2xsaXNpb24sIENhcicpO1xuICAgICAqIH5+flxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZXF1aXJlcyhcIjJEXCIpO1xuICAgICAgICB2YXIgYXJlYSA9IHRoaXMuX21iciB8fCB0aGlzO1xuXG4gICAgICAgIHBvbHkgPSBuZXcgQ3JhZnR5LnBvbHlnb24oWzAsIDBdLCBbYXJlYS5fdywgMF0sIFthcmVhLl93LCBhcmVhLl9oXSwgWzAsIGFyZWEuX2hdKTtcbiAgICAgICAgdGhpcy5tYXAgPSBwb2x5O1xuICAgICAgICB0aGlzLmF0dGFjaCh0aGlzLm1hcCk7XG4gICAgICAgIHRoaXMubWFwLnNoaWZ0KGFyZWEuX3gsIGFyZWEuX3kpO1xuICAgIH0sXG5cbiAgICAvKipAXG5cdCogIy5jb2xsaXNpb25cblx0KiBAY29tcCBDb2xsaXNpb25cblx0KiBcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuY29sbGlzaW9uKFtDcmFmdHkucG9seWdvbiBwb2x5Z29uXSlcblx0KiBAcGFyYW0gcG9seWdvbiAtIENyYWZ0eS5wb2x5Z29uIG9iamVjdCB0aGF0IHdpbGwgYWN0IGFzIHRoZSBoaXQgYXJlYVxuXHQqIFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5jb2xsaXNpb24oQXJyYXkgcG9pbnQxLCAuLiwgQXJyYXkgcG9pbnROKVxuXHQqIEBwYXJhbSBwb2ludCMgLSBBcnJheSB3aXRoIGFuIGB4YCBhbmQgYHlgIHBvc2l0aW9uIHRvIGdlbmVyYXRlIGEgcG9seWdvblxuXHQqIFxuXHQqIENvbnN0cnVjdG9yIHRha2VzIGEgcG9seWdvbiBvciBhcnJheSBvZiBwb2ludHMgdG8gdXNlIGFzIHRoZSBoaXQgYXJlYS5cblx0KlxuXHQqIFRoZSBoaXQgYXJlYSAocG9seWdvbikgbXVzdCBiZSBhIGNvbnZleCBzaGFwZSBhbmQgbm90IGNvbmNhdmVcblx0KiBmb3IgdGhlIGNvbGxpc2lvbiBkZXRlY3Rpb24gdG8gd29yay5cbiAgICAqXG4gICAgKiBJZiBubyBoaXQgYXJlYSBpcyBzcGVjaWZpZWQgeCwgeSwgdywgaCBwcm9wZXJ0aWVzIG9mIHRoZSBlbnRpdHkgd2lsbCBiZSB1c2VkLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgQ29sbGlzaW9uXCIpLmNvbGxpc2lvbihcblx0KiAgICAgbmV3IENyYWZ0eS5wb2x5Z29uKFs1MCwwXSwgWzEwMCwxMDBdLCBbMCwxMDBdKVxuXHQqICk7XG4gICAgKiBcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENvbGxpc2lvblwiKS5jb2xsaXNpb24oWzUwLDBdLCBbMTAwLDEwMF0sIFswLDEwMF0pO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LnBvbHlnb25cblx0Ki9cbiAgICBjb2xsaXNpb246IGZ1bmN0aW9uIChwb2x5KSB7XG4gICAgICAgIHZhciBhcmVhID0gdGhpcy5fbWJyIHx8IHRoaXM7XG5cbiAgICAgICAgaWYgKCFwb2x5KSB7XG4gICAgICAgICAgICBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKFswLCAwXSwgW2FyZWEuX3csIDBdLCBbYXJlYS5fdywgYXJlYS5faF0sIFswLCBhcmVhLl9oXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vY29udmVydCBhcmdzIHRvIGFycmF5IHRvIGNyZWF0ZSBwb2x5Z29uXG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgICAgICBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYXAgPSBwb2x5O1xuICAgICAgICB0aGlzLmF0dGFjaCh0aGlzLm1hcCk7XG4gICAgICAgIHRoaXMubWFwLnNoaWZ0KGFyZWEuX3gsIGFyZWEuX3kpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqQFxuXHQqICMuaGl0XG5cdCogQGNvbXAgQ29sbGlzaW9uXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4vQXJyYXkgaGl0KFN0cmluZyBjb21wb25lbnQpXG5cdCogQHBhcmFtIGNvbXBvbmVudCAtIENoZWNrIGNvbGxpc2lvbiB3aXRoIGVudGl0aWVzIHRoYXQgaGFzIHRoaXMgY29tcG9uZW50XG5cdCogQHJldHVybiBgZmFsc2VgIGlmIG5vIGNvbGxpc2lvbi4gSWYgYSBjb2xsaXNpb24gaXMgZGV0ZWN0ZWQsIHJldHVybnMgYW4gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGFyZSBjb2xsaWRpbmcuXG5cdCogXG5cdCogVGFrZXMgYW4gYXJndW1lbnQgZm9yIGEgY29tcG9uZW50IHRvIHRlc3QgY29sbGlzaW9uIGZvci4gSWYgYSBjb2xsaXNpb24gaXMgZm91bmQsIGFuIGFycmF5IG9mXG5cdCogZXZlcnkgb2JqZWN0IGluIGNvbGxpc2lvbiBhbG9uZyB3aXRoIHRoZSBhbW91bnQgb2Ygb3ZlcmxhcCBpcyBwYXNzZWQuXG5cdCpcblx0KiBJZiBubyBjb2xsaXNpb24sIHdpbGwgcmV0dXJuIGZhbHNlLiBUaGUgcmV0dXJuIGNvbGxpc2lvbiBkYXRhIHdpbGwgYmUgYW4gQXJyYXkgb2YgT2JqZWN0cyB3aXRoIHRoZVxuXHQqIHR5cGUgb2YgY29sbGlzaW9uIHVzZWQsIHRoZSBvYmplY3QgY29sbGlkZWQgYW5kIGlmIHRoZSB0eXBlIHVzZWQgd2FzIFNBVCAoYSBwb2x5Z29uIHdhcyB1c2VkIGFzIHRoZSBoaXRib3gpIHRoZW4gYW4gYW1vdW50IG9mIG92ZXJsYXAuXFxcblx0KiB+fn5cblx0KiBbe1xuXHQqICAgIG9iajogW2VudGl0eV0sXG5cdCogICAgdHlwZSBcIk1CUlwiIG9yIFwiU0FUXCIsXG5cdCogICAgb3ZlcmxhcDogW251bWJlcl1cblx0KiB9XVxuXHQqIH5+flxuXHQqIGBNQlJgIGlzIHlvdXIgc3RhbmRhcmQgYXhpcyBhbGlnbmVkIHJlY3RhbmdsZSBpbnRlcnNlY3Rpb24gKGAuaW50ZXJzZWN0YCBpbiB0aGUgMkQgY29tcG9uZW50KS5cblx0KiBgU0FUYCBpcyBjb2xsaXNpb24gYmV0d2VlbiBhbnkgY29udmV4IHBvbHlnb24uXG5cdCogXG5cdCogQHNlZSAub25IaXQsIDJEXG5cdCovXG5cdGhpdDogZnVuY3Rpb24gKGNvbXApIHtcblx0XHR2YXIgYXJlYSA9IHRoaXMuX21iciB8fCB0aGlzLFxuXHRcdFx0cmVzdWx0cyA9IENyYWZ0eS5tYXAuc2VhcmNoKGFyZWEsIGZhbHNlKSxcblx0XHRcdGkgPSAwLCBsID0gcmVzdWx0cy5sZW5ndGgsXG5cdFx0XHRkdXBlcyA9IHt9LFxuXHRcdFx0aWQsIG9iaiwgb2FyZWEsIGtleSxcblx0XHRcdGhhc01hcCA9ICgnbWFwJyBpbiB0aGlzICYmICdjb250YWluc1BvaW50JyBpbiB0aGlzLm1hcCksXG5cdFx0XHRmaW5hbHJlc3VsdCA9IFtdO1xuXG5cdFx0aWYgKCFsKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Zm9yICg7IGkgPCBsOyArK2kpIHtcblx0XHRcdG9iaiA9IHJlc3VsdHNbaV07XG5cdFx0XHRvYXJlYSA9IG9iai5fbWJyIHx8IG9iajsgLy91c2UgdGhlIG1iclxuXG5cdFx0XHRpZiAoIW9iaikgY29udGludWU7XG5cdFx0XHRpZCA9IG9ialswXTtcblxuXHRcdFx0Ly9jaGVjayBpZiBub3QgYWRkZWQgdG8gaGFzaCBhbmQgdGhhdCBhY3R1YWxseSBpbnRlcnNlY3RzXG5cdFx0XHRpZiAoIWR1cGVzW2lkXSAmJiB0aGlzWzBdICE9PSBpZCAmJiBvYmouX19jW2NvbXBdICYmXG5cdFx0XHRcdFx0XHRcdCBvYXJlYS5feCA8IGFyZWEuX3ggKyBhcmVhLl93ICYmIG9hcmVhLl94ICsgb2FyZWEuX3cgPiBhcmVhLl94ICYmXG5cdFx0XHRcdFx0XHRcdCBvYXJlYS5feSA8IGFyZWEuX3kgKyBhcmVhLl9oICYmIG9hcmVhLl9oICsgb2FyZWEuX3kgPiBhcmVhLl95KVxuXHRcdFx0XHRkdXBlc1tpZF0gPSBvYmo7XG5cdFx0fVxuXG5cdFx0Zm9yIChrZXkgaW4gZHVwZXMpIHtcblx0XHRcdG9iaiA9IGR1cGVzW2tleV07XG5cblx0XHRcdGlmIChoYXNNYXAgJiYgJ21hcCcgaW4gb2JqKSB7XG5cdFx0XHRcdHZhciBTQVQgPSB0aGlzLl9TQVQodGhpcy5tYXAsIG9iai5tYXApO1xuXHRcdFx0XHRTQVQub2JqID0gb2JqO1xuXHRcdFx0XHRTQVQudHlwZSA9IFwiU0FUXCI7XG5cdFx0XHRcdGlmIChTQVQpIGZpbmFscmVzdWx0LnB1c2goU0FUKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZpbmFscmVzdWx0LnB1c2goeyBvYmo6IG9iaiwgdHlwZTogXCJNQlJcIiB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoIWZpbmFscmVzdWx0Lmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmaW5hbHJlc3VsdDtcblx0fSxcblxuXHQvKipAXG5cdCogIy5vbkhpdFxuXHQqIEBjb21wIENvbGxpc2lvblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5vbkhpdChTdHJpbmcgY29tcG9uZW50LCBGdW5jdGlvbiBoaXRbLCBGdW5jdGlvbiBub0hpdF0pXG5cdCogQHBhcmFtIGNvbXBvbmVudCAtIENvbXBvbmVudCB0byBjaGVjayBjb2xsaXNpb25zIGZvclxuXHQqIEBwYXJhbSBoaXQgLSBDYWxsYmFjayBtZXRob2QgdG8gZXhlY3V0ZSB3aGVuIGNvbGxpZGVkIHdpdGggY29tcG9uZW50XG5cdCogQHBhcmFtIG5vSGl0IC0gQ2FsbGJhY2sgbWV0aG9kIGV4ZWN1dGVkIG9uY2UgYXMgc29vbiBhcyBjb2xsaXNpb24gc3RvcHNcblx0KiBcblx0KiBDcmVhdGVzIGFuIGVudGVyZnJhbWUgZXZlbnQgY2FsbGluZyAuaGl0KCkgZWFjaCB0aW1lIGFuZCBpZiBjb2xsaXNpb24gZGV0ZWN0ZWQgd2lsbCBpbnZva2UgdGhlIGNhbGxiYWNrLlxuXHQqIFxuXHQqIEBzZWUgLmhpdFxuXHQqL1xuXHRvbkhpdDogZnVuY3Rpb24gKGNvbXAsIGNhbGxiYWNrLCBjYWxsYmFja09mZikge1xuXHRcdHZhciBqdXN0SGl0ID0gZmFsc2U7XG5cdFx0dGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgaGl0ZGF0YSA9IHRoaXMuaGl0KGNvbXApO1xuXHRcdFx0aWYgKGhpdGRhdGEpIHtcblx0XHRcdFx0anVzdEhpdCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrLmNhbGwodGhpcywgaGl0ZGF0YSk7XG5cdFx0XHR9IGVsc2UgaWYgKGp1c3RIaXQpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBjYWxsYmFja09mZiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2tPZmYuY2FsbCh0aGlzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRqdXN0SGl0ID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X1NBVDogZnVuY3Rpb24gKHBvbHkxLCBwb2x5Mikge1xuXHRcdHZhciBwb2ludHMxID0gcG9seTEucG9pbnRzLFxuXHRcdFx0cG9pbnRzMiA9IHBvbHkyLnBvaW50cyxcblx0XHRcdGkgPSAwLCBsID0gcG9pbnRzMS5sZW5ndGgsXG5cdFx0XHRqLCBrID0gcG9pbnRzMi5sZW5ndGgsXG5cdFx0XHRub3JtYWwgPSB7IHg6IDAsIHk6IDAgfSxcblx0XHRcdGxlbmd0aCxcblx0XHRcdG1pbjEsIG1pbjIsXG5cdFx0XHRtYXgxLCBtYXgyLFxuXHRcdFx0aW50ZXJ2YWwsXG5cdFx0XHRNVFYgPSBudWxsLFxuXHRcdFx0TVRWMiA9IG51bGwsXG5cdFx0XHRNTiA9IG51bGwsXG5cdFx0XHRkb3QsXG5cdFx0XHRuZXh0UG9pbnQsXG5cdFx0XHRjdXJyZW50UG9pbnQ7XG5cblx0XHQvL2xvb3AgdGhyb3VnaCB0aGUgZWRnZXMgb2YgUG9seWdvbiAxXG5cdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdG5leHRQb2ludCA9IHBvaW50czFbKGkgPT0gbCAtIDEgPyAwIDogaSArIDEpXTtcblx0XHRcdGN1cnJlbnRQb2ludCA9IHBvaW50czFbaV07XG5cblx0XHRcdC8vZ2VuZXJhdGUgdGhlIG5vcm1hbCBmb3IgdGhlIGN1cnJlbnQgZWRnZVxuXHRcdFx0bm9ybWFsLnggPSAtKG5leHRQb2ludFsxXSAtIGN1cnJlbnRQb2ludFsxXSk7XG5cdFx0XHRub3JtYWwueSA9IChuZXh0UG9pbnRbMF0gLSBjdXJyZW50UG9pbnRbMF0pO1xuXG5cdFx0XHQvL25vcm1hbGl6ZSB0aGUgdmVjdG9yXG5cdFx0XHRsZW5ndGggPSBNYXRoLnNxcnQobm9ybWFsLnggKiBub3JtYWwueCArIG5vcm1hbC55ICogbm9ybWFsLnkpO1xuXHRcdFx0bm9ybWFsLnggLz0gbGVuZ3RoO1xuXHRcdFx0bm9ybWFsLnkgLz0gbGVuZ3RoO1xuXG5cdFx0XHQvL2RlZmF1bHQgbWluIG1heFxuXHRcdFx0bWluMSA9IG1pbjIgPSAtMTtcblx0XHRcdG1heDEgPSBtYXgyID0gLTE7XG5cblx0XHRcdC8vcHJvamVjdCBhbGwgdmVydGljZXMgZnJvbSBwb2x5MSBvbnRvIGF4aXNcblx0XHRcdGZvciAoaiA9IDA7IGogPCBsOyArK2opIHtcblx0XHRcdFx0ZG90ID0gcG9pbnRzMVtqXVswXSAqIG5vcm1hbC54ICsgcG9pbnRzMVtqXVsxXSAqIG5vcm1hbC55O1xuXHRcdFx0XHRpZiAoZG90ID4gbWF4MSB8fCBtYXgxID09PSAtMSkgbWF4MSA9IGRvdDtcblx0XHRcdFx0aWYgKGRvdCA8IG1pbjEgfHwgbWluMSA9PT0gLTEpIG1pbjEgPSBkb3Q7XG5cdFx0XHR9XG5cblx0XHRcdC8vcHJvamVjdCBhbGwgdmVydGljZXMgZnJvbSBwb2x5MiBvbnRvIGF4aXNcblx0XHRcdGZvciAoaiA9IDA7IGogPCBrOyArK2opIHtcblx0XHRcdFx0ZG90ID0gcG9pbnRzMltqXVswXSAqIG5vcm1hbC54ICsgcG9pbnRzMltqXVsxXSAqIG5vcm1hbC55O1xuXHRcdFx0XHRpZiAoZG90ID4gbWF4MiB8fCBtYXgyID09PSAtMSkgbWF4MiA9IGRvdDtcblx0XHRcdFx0aWYgKGRvdCA8IG1pbjIgfHwgbWluMiA9PT0gLTEpIG1pbjIgPSBkb3Q7XG5cdFx0XHR9XG5cblx0XHRcdC8vY2FsY3VsYXRlIHRoZSBtaW5pbXVtIHRyYW5zbGF0aW9uIHZlY3RvciBzaG91bGQgYmUgbmVnYXRpdmVcblx0XHRcdGlmIChtaW4xIDwgbWluMikge1xuXHRcdFx0XHRpbnRlcnZhbCA9IG1pbjIgLSBtYXgxO1xuXG5cdFx0XHRcdG5vcm1hbC54ID0gLW5vcm1hbC54O1xuXHRcdFx0XHRub3JtYWwueSA9IC1ub3JtYWwueTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGludGVydmFsID0gbWluMSAtIG1heDI7XG5cdFx0XHR9XG5cblx0XHRcdC8vZXhpdCBlYXJseSBpZiBwb3NpdGl2ZVxuXHRcdFx0aWYgKGludGVydmFsID49IDApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoTVRWID09PSBudWxsIHx8IGludGVydmFsID4gTVRWKSB7XG5cdFx0XHRcdE1UViA9IGludGVydmFsO1xuXHRcdFx0XHRNTiA9IHsgeDogbm9ybWFsLngsIHk6IG5vcm1hbC55IH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9sb29wIHRocm91Z2ggdGhlIGVkZ2VzIG9mIFBvbHlnb24gMlxuXHRcdGZvciAoaSA9IDA7IGkgPCBrOyBpKyspIHtcblx0XHRcdG5leHRQb2ludCA9IHBvaW50czJbKGkgPT0gayAtIDEgPyAwIDogaSArIDEpXTtcblx0XHRcdGN1cnJlbnRQb2ludCA9IHBvaW50czJbaV07XG5cblx0XHRcdC8vZ2VuZXJhdGUgdGhlIG5vcm1hbCBmb3IgdGhlIGN1cnJlbnQgZWRnZVxuXHRcdFx0bm9ybWFsLnggPSAtKG5leHRQb2ludFsxXSAtIGN1cnJlbnRQb2ludFsxXSk7XG5cdFx0XHRub3JtYWwueSA9IChuZXh0UG9pbnRbMF0gLSBjdXJyZW50UG9pbnRbMF0pO1xuXG5cdFx0XHQvL25vcm1hbGl6ZSB0aGUgdmVjdG9yXG5cdFx0XHRsZW5ndGggPSBNYXRoLnNxcnQobm9ybWFsLnggKiBub3JtYWwueCArIG5vcm1hbC55ICogbm9ybWFsLnkpO1xuXHRcdFx0bm9ybWFsLnggLz0gbGVuZ3RoO1xuXHRcdFx0bm9ybWFsLnkgLz0gbGVuZ3RoO1xuXG5cdFx0XHQvL2RlZmF1bHQgbWluIG1heFxuXHRcdFx0bWluMSA9IG1pbjIgPSAtMTtcblx0XHRcdG1heDEgPSBtYXgyID0gLTE7XG5cblx0XHRcdC8vcHJvamVjdCBhbGwgdmVydGljZXMgZnJvbSBwb2x5MSBvbnRvIGF4aXNcblx0XHRcdGZvciAoaiA9IDA7IGogPCBsOyArK2opIHtcblx0XHRcdFx0ZG90ID0gcG9pbnRzMVtqXVswXSAqIG5vcm1hbC54ICsgcG9pbnRzMVtqXVsxXSAqIG5vcm1hbC55O1xuXHRcdFx0XHRpZiAoZG90ID4gbWF4MSB8fCBtYXgxID09PSAtMSkgbWF4MSA9IGRvdDtcblx0XHRcdFx0aWYgKGRvdCA8IG1pbjEgfHwgbWluMSA9PT0gLTEpIG1pbjEgPSBkb3Q7XG5cdFx0XHR9XG5cblx0XHRcdC8vcHJvamVjdCBhbGwgdmVydGljZXMgZnJvbSBwb2x5MiBvbnRvIGF4aXNcblx0XHRcdGZvciAoaiA9IDA7IGogPCBrOyArK2opIHtcblx0XHRcdFx0ZG90ID0gcG9pbnRzMltqXVswXSAqIG5vcm1hbC54ICsgcG9pbnRzMltqXVsxXSAqIG5vcm1hbC55O1xuXHRcdFx0XHRpZiAoZG90ID4gbWF4MiB8fCBtYXgyID09PSAtMSkgbWF4MiA9IGRvdDtcblx0XHRcdFx0aWYgKGRvdCA8IG1pbjIgfHwgbWluMiA9PT0gLTEpIG1pbjIgPSBkb3Q7XG5cdFx0XHR9XG5cblx0XHRcdC8vY2FsY3VsYXRlIHRoZSBtaW5pbXVtIHRyYW5zbGF0aW9uIHZlY3RvciBzaG91bGQgYmUgbmVnYXRpdmVcblx0XHRcdGlmIChtaW4xIDwgbWluMikge1xuXHRcdFx0XHRpbnRlcnZhbCA9IG1pbjIgLSBtYXgxO1xuXG5cdFx0XHRcdG5vcm1hbC54ID0gLW5vcm1hbC54O1xuXHRcdFx0XHRub3JtYWwueSA9IC1ub3JtYWwueTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGludGVydmFsID0gbWluMSAtIG1heDI7XG5cblxuXHRcdFx0fVxuXG5cdFx0XHQvL2V4aXQgZWFybHkgaWYgcG9zaXRpdmVcblx0XHRcdGlmIChpbnRlcnZhbCA+PSAwKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKE1UViA9PT0gbnVsbCB8fCBpbnRlcnZhbCA+IE1UVikgTVRWID0gaW50ZXJ2YWw7XG5cdFx0XHRpZiAoaW50ZXJ2YWwgPiBNVFYyIHx8IE1UVjIgPT09IG51bGwpIHtcblx0XHRcdFx0TVRWMiA9IGludGVydmFsO1xuXHRcdFx0XHRNTiA9IHsgeDogbm9ybWFsLngsIHk6IG5vcm1hbC55IH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHsgb3ZlcmxhcDogTVRWMiwgbm9ybWFsOiBNTiB9O1xuXHR9XG59KTtcblxuXG4vKipAXG4qICMuV2lyZWRIaXRCb3hcbiogQGNvbXAgQ29sbGlzaW9uXG4qIFxuKiBDb21wb25lbnRzIHRvIGRpc3BsYXkgQ3JhZnR5LnBvbHlnb24gQXJyYXkgZm9yIGRlYnVnZ2luZyBjb2xsaXNpb24gZGV0ZWN0aW9uXG4qIFxuKiBAZXhhbXBsZVxuKiBUaGlzIHdpbGwgZGlzcGxheSBhIHdpcmVkIHNxdWFyZSBvdmVyIHlvdXIgb3JpZ2luYWwgQ2FudmFzIHNjcmVlblxuKiB+fn5cbiogQ3JhZnR5LmUoXCIyRCxET00sUGxheWVyLENvbGxpc2lvbixXaXJlZEhpdEJveFwiKS5jb2xsaXNpb24obmV3IENyYWZ0eS5wb2x5Z29uKFswLDBdLFswLDMwMF0sWzMwMCwzMDBdLFszMDAsMF0pKVxuKiB+fn5cbiovXG5DcmFmdHkuYyhcIldpcmVkSGl0Qm94XCIsIHtcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQuY2FudmFzKSB7XG5cdFx0XHR2YXIgYyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdIaXRCb3gnKTtcblx0XHRcdGlmICghYykge1xuXHRcdFx0XHRjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHRcdFx0Yy5pZCA9ICdIaXRCb3gnO1xuXHRcdFx0XHRjLndpZHRoID0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoO1xuXHRcdFx0XHRjLmhlaWdodCA9IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cdFx0XHRcdGMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdFx0XHRjLnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHRcdFx0XHRjLnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0XHRcdGMuc3R5bGUuekluZGV4ID0gJzEwMDAnO1xuXHRcdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5hcHBlbmRDaGlsZChjKTtcblx0XHRcdH1cblx0XHRcdHZhciBjdHggPSBjLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XHR2YXIgZHJhd2VkID0gMCwgdG90YWwgPSBDcmFmdHkoXCJXaXJlZEhpdEJveFwiKS5sZW5ndGg7XG5cdFx0XHR0aGlzLnJlcXVpcmVzKFwiQ29sbGlzaW9uXCIpLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKGRyYXdlZCA9PSB0b3RhbCkge1xuXHRcdFx0XHRcdGN0eC5jbGVhclJlY3QoMCwgMCwgQ3JhZnR5LnZpZXdwb3J0LndpZHRoLCBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KTtcblx0XHRcdFx0XHRkcmF3ZWQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdFx0Zm9yICh2YXIgcCBpbiB0aGlzLm1hcC5wb2ludHMpIHtcblx0XHRcdFx0XHRjdHgubGluZVRvKENyYWZ0eS52aWV3cG9ydC54ICsgdGhpcy5tYXAucG9pbnRzW3BdWzBdLCBDcmFmdHkudmlld3BvcnQueSArIHRoaXMubWFwLnBvaW50c1twXVsxXSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmNsb3NlUGF0aCgpO1xuXHRcdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0XHRcdGRyYXdlZCsrO1xuXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG4vKipAXG4qICMuU29saWRIaXRCb3hcbiogQGNvbXAgQ29sbGlzaW9uXG4qIFxuKiBDb21wb25lbnRzIHRvIGRpc3BsYXkgQ3JhZnR5LnBvbHlnb24gQXJyYXkgZm9yIGRlYnVnZ2luZyBjb2xsaXNpb24gZGV0ZWN0aW9uXG4qIFxuKiBAZXhhbXBsZVxuKiBUaGlzIHdpbGwgZGlzcGxheSBhIHNvbGlkIHRyaWFuZ2xlIG92ZXIgeW91ciBvcmlnaW5hbCBDYW52YXMgc2NyZWVuXG4qIH5+flxuKiBDcmFmdHkuZShcIjJELERPTSxQbGF5ZXIsQ29sbGlzaW9uLFNvbGlkSGl0Qm94XCIpLmNvbGxpc2lvbihuZXcgQ3JhZnR5LnBvbHlnb24oWzAsMF0sWzAsMzAwXSxbMzAwLDMwMF0pKVxuKiB+fn5cbiovXG5DcmFmdHkuYyhcIlNvbGlkSGl0Qm94XCIsIHtcblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdGlmIChDcmFmdHkuc3VwcG9ydC5jYW52YXMpIHtcblx0XHRcdHZhciBjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ0hpdEJveCcpO1xuXHRcdFx0aWYgKCFjKSB7XG5cdFx0XHRcdGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuXHRcdFx0XHRjLmlkID0gJ0hpdEJveCc7XG5cdFx0XHRcdGMud2lkdGggPSBDcmFmdHkudmlld3BvcnQud2lkdGg7XG5cdFx0XHRcdGMuaGVpZ2h0ID0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodDtcblx0XHRcdFx0Yy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRcdGMuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdFx0XHRcdGMuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRcdFx0Yy5zdHlsZS56SW5kZXggPSAnMTAwMCc7XG5cdFx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLmFwcGVuZENoaWxkKGMpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGN0eCA9IGMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHZhciBkcmF3ZWQgPSAwLCB0b3RhbCA9IENyYWZ0eShcIlNvbGlkSGl0Qm94XCIpLmxlbmd0aDtcblx0XHRcdHRoaXMucmVxdWlyZXMoXCJDb2xsaXNpb25cIikuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoZHJhd2VkID09IHRvdGFsKSB7XG5cdFx0XHRcdFx0Y3R4LmNsZWFyUmVjdCgwLCAwLCBDcmFmdHkudmlld3BvcnQud2lkdGgsIENyYWZ0eS52aWV3cG9ydC5oZWlnaHQpO1xuXHRcdFx0XHRcdGRyYXdlZCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0XHRmb3IgKHZhciBwIGluIHRoaXMubWFwLnBvaW50cykge1xuXHRcdFx0XHRcdGN0eC5saW5lVG8oQ3JhZnR5LnZpZXdwb3J0LnggKyB0aGlzLm1hcC5wb2ludHNbcF1bMF0sIENyYWZ0eS52aWV3cG9ydC55ICsgdGhpcy5tYXAucG9pbnRzW3BdWzFdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguY2xvc2VQYXRoKCk7XG5cdFx0XHRcdGN0eC5maWxsKCk7XG5cdFx0XHRcdGRyYXdlZCsrO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuLyoqQFxuKiAjRE9NXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBEcmF3cyBlbnRpdGllcyBhcyBET00gbm9kZXMsIHNwZWNpZmljYWxseSBgPERJVj5gcy5cbiovXG5DcmFmdHkuYyhcIkRPTVwiLCB7XG4gICAgLyoqQFxuXHQqICMuX2VsZW1lbnRcblx0KiBAY29tcCBET01cblx0KiBUaGUgRE9NIGVsZW1lbnQgdXNlZCB0byByZXByZXNlbnQgdGhlIGVudGl0eS5cblx0Ki9cblx0X2VsZW1lbnQ6IG51bGwsXG5cdC8vaG9sZHMgY3VycmVudCBzdHlsZXMsIHNvIHdlIGNhbiBjaGVjayBpZiB0aGVyZSBhcmUgY2hhbmdlcyB0byBiZSB3cml0dGVuIHRvIHRoZSBET01cblx0X2Nzc1N0eWxlczogbnVsbCxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fY3NzU3R5bGVzID0geyB2aXNpYmlsaXR5OiAnJywgbGVmdDogJycsIHRvcDogJycsIHdpZHRoOiAnJywgaGVpZ2h0OiAnJywgekluZGV4OiAnJywgb3BhY2l0eTogJycsIHRyYW5zZm9ybU9yaWdpbjogJycsIHRyYW5zZm9ybTogJycgfTtcblx0XHR0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRDcmFmdHkuc3RhZ2UuaW5uZXIuYXBwZW5kQ2hpbGQodGhpcy5fZWxlbWVudCk7XG5cdFx0dGhpcy5fZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcblx0XHR0aGlzLl9lbGVtZW50LmlkID0gXCJlbnRcIiArIHRoaXNbMF07XG5cblx0XHR0aGlzLmJpbmQoXCJDaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCF0aGlzLl9jaGFuZ2VkKSB7XG5cdFx0XHRcdHRoaXMuX2NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRDcmFmdHkuRHJhd01hbmFnZXIuYWRkKHRoaXMpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlQ2xhc3MoKSB7XG5cdFx0XHR2YXIgaSA9IDAsIGMgPSB0aGlzLl9fYywgc3RyID0gXCJcIjtcblx0XHRcdGZvciAoaSBpbiBjKSB7XG5cdFx0XHRcdHN0ciArPSAnICcgKyBpO1xuXHRcdFx0fVxuXHRcdFx0c3RyID0gc3RyLnN1YnN0cigxKTtcblx0XHRcdHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gc3RyO1xuXHRcdH1cblxuXHRcdHRoaXMuYmluZChcIk5ld0NvbXBvbmVudFwiLCB1cGRhdGVDbGFzcykuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCB1cGRhdGVDbGFzcyk7XG5cblx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQucHJlZml4ID09PSBcIm1zXCIgJiYgQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA8IDkpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSB7fTtcblxuXHRcdFx0dGhpcy5iaW5kKFwiUm90YXRlXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHZhciBtID0gZS5tYXRyaXgsXG5cdFx0XHRcdFx0ZWxlbSA9IHRoaXMuX2VsZW1lbnQuc3R5bGUsXG5cdFx0XHRcdFx0TTExID0gbS5NMTEudG9GaXhlZCg4KSxcblx0XHRcdFx0XHRNMTIgPSBtLk0xMi50b0ZpeGVkKDgpLFxuXHRcdFx0XHRcdE0yMSA9IG0uTTIxLnRvRml4ZWQoOCksXG5cdFx0XHRcdFx0TTIyID0gbS5NMjIudG9GaXhlZCg4KTtcblxuXHRcdFx0XHR0aGlzLl9maWx0ZXJzLnJvdGF0aW9uID0gXCJwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuTWF0cml4KE0xMT1cIiArIE0xMSArIFwiLCBNMTI9XCIgKyBNMTIgKyBcIiwgTTIxPVwiICsgTTIxICsgXCIsIE0yMj1cIiArIE0yMiArIFwiLHNpemluZ01ldGhvZD0nYXV0byBleHBhbmQnKVwiO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5iaW5kKFwiUmVtb3ZlXCIsIHRoaXMudW5kcmF3KTtcblx0XHR0aGlzLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgZnVuY3Rpb24gKGNvbXBOYW1lKSB7XG5cdFx0XHRpZiAoY29tcE5hbWUgPT09IFwiRE9NXCIpXG5cdFx0XHRcdHRoaXMudW5kcmF3KCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZ2V0RG9tSWRcblx0KiBAY29tcCBET01cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZ2V0SWQoKVxuXHQqIFxuXHQqIEdldCB0aGUgSWQgb2YgdGhlIERPTSBlbGVtZW50IHVzZWQgdG8gcmVwcmVzZW50IHRoZSBlbnRpdHkuXG5cdCovXG5cdGdldERvbUlkOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudC5pZDtcblx0fSxcblxuXHQvKipAXG5cdCogIy5ET01cblx0KiBAY29tcCBET01cblx0KiBAdHJpZ2dlciBEcmF3IC0gd2hlbiB0aGUgZW50aXR5IGlzIHJlYWR5IHRvIGJlIGRyYXduIHRvIHRoZSBzdGFnZSAtIHsgc3R5bGU6U3RyaW5nLCB0eXBlOlwiRE9NXCIsIGNvfVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5ET00oSFRNTEVsZW1lbnQgZWxlbSlcblx0KiBAcGFyYW0gZWxlbSAtIEhUTUwgZWxlbWVudCB0aGF0IHdpbGwgcmVwbGFjZSB0aGUgZHluYW1pY2FsbHkgY3JlYXRlZCBvbmVcblx0KiBcblx0KiBQYXNzIGEgRE9NIGVsZW1lbnQgdG8gdXNlIHJhdGhlciB0aGFuIG9uZSBjcmVhdGVkLiBXaWxsIHNldCBgLl9lbGVtZW50YCB0byB0aGlzIHZhbHVlLiBSZW1vdmVzIHRoZSBvbGQgZWxlbWVudC5cblx0Ki9cblx0RE9NOiBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdGlmIChlbGVtICYmIGVsZW0ubm9kZVR5cGUpIHtcblx0XHRcdHRoaXMudW5kcmF3KCk7XG5cdFx0XHR0aGlzLl9lbGVtZW50ID0gZWxlbTtcblx0XHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5kcmF3XG5cdCogQGNvbXAgRE9NXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRyYXcodm9pZClcblx0KiBcblx0KiBVcGRhdGVzIHRoZSBDU1MgcHJvcGVydGllcyBvZiB0aGUgbm9kZSB0byBkcmF3IG9uIHRoZSBzdGFnZS5cblx0Ki9cblx0ZHJhdzogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzdHlsZSA9IHRoaXMuX2VsZW1lbnQuc3R5bGUsXG5cdFx0XHRjb29yZCA9IHRoaXMuX19jb29yZCB8fCBbMCwgMCwgMCwgMF0sXG5cdFx0XHRjbyA9IHsgeDogY29vcmRbMF0sIHk6IGNvb3JkWzFdIH0sXG5cdFx0XHRwcmVmaXggPSBDcmFmdHkuc3VwcG9ydC5wcmVmaXgsXG5cdFx0XHR0cmFucyA9IFtdO1xuXG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy52aXNpYmlsaXR5ICE9IHRoaXMuX3Zpc2libGUpIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy52aXNpYmlsaXR5ID0gdGhpcy5fdmlzaWJsZTtcblx0XHRcdGlmICghdGhpcy5fdmlzaWJsZSkge1xuXHRcdFx0XHRzdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL3V0aWxpemUgQ1NTMyBpZiBzdXBwb3J0ZWRcblx0XHRpZiAoQ3JhZnR5LnN1cHBvcnQuY3NzM2R0cmFuc2Zvcm0pIHtcblx0XHRcdHRyYW5zLnB1c2goXCJ0cmFuc2xhdGUzZChcIiArICh+fnRoaXMuX3gpICsgXCJweCxcIiArICh+fnRoaXMuX3kpICsgXCJweCwwKVwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy5sZWZ0ICE9IHRoaXMuX3gpIHtcblx0XHRcdFx0dGhpcy5fY3NzU3R5bGVzLmxlZnQgPSB0aGlzLl94O1xuXHRcdFx0XHRzdHlsZS5sZWZ0ID0gfn4odGhpcy5feCkgKyBcInB4XCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLnRvcCAhPSB0aGlzLl95KSB7XG5cdFx0XHRcdHRoaXMuX2Nzc1N0eWxlcy50b3AgPSB0aGlzLl95O1xuXHRcdFx0XHRzdHlsZS50b3AgPSB+fih0aGlzLl95KSArIFwicHhcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLndpZHRoICE9IHRoaXMuX3cpIHtcblx0XHRcdHRoaXMuX2Nzc1N0eWxlcy53aWR0aCA9IHRoaXMuX3c7XG5cdFx0XHRzdHlsZS53aWR0aCA9IH5+KHRoaXMuX3cpICsgXCJweFwiO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLmhlaWdodCAhPSB0aGlzLl9oKSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMuaGVpZ2h0ID0gdGhpcy5faDtcblx0XHRcdHN0eWxlLmhlaWdodCA9IH5+KHRoaXMuX2gpICsgXCJweFwiO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLnpJbmRleCAhPSB0aGlzLl96KSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMuekluZGV4ID0gdGhpcy5fejtcblx0XHRcdHN0eWxlLnpJbmRleCA9IHRoaXMuX3o7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2Nzc1N0eWxlcy5vcGFjaXR5ICE9IHRoaXMuX2FscGhhKSB7XG5cdFx0XHR0aGlzLl9jc3NTdHlsZXMub3BhY2l0eSA9IHRoaXMuX2FscGhhO1xuXHRcdFx0c3R5bGUub3BhY2l0eSA9IHRoaXMuX2FscGhhO1xuXHRcdFx0c3R5bGVbcHJlZml4ICsgXCJPcGFjaXR5XCJdID0gdGhpcy5fYWxwaGE7XG5cdFx0fVxuXG5cdFx0Ly9pZiBub3QgdmVyc2lvbiA5IG9mIElFXG5cdFx0aWYgKHByZWZpeCA9PT0gXCJtc1wiICYmIENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPCA5KSB7XG5cdFx0XHQvL2ZvciBJRSB2ZXJzaW9uIDgsIHVzZSBJbWFnZVRyYW5zZm9ybSBmaWx0ZXJcblx0XHRcdGlmIChDcmFmdHkuc3VwcG9ydC52ZXJzaW9uID09PSA4KSB7XG5cdFx0XHRcdHRoaXMuX2ZpbHRlcnMuYWxwaGEgPSBcInByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5BbHBoYShPcGFjaXR5PVwiICsgKHRoaXMuX2FscGhhICogMTAwKSArIFwiKVwiOyAvLyBmaXJzdCFcblx0XHRcdFx0Ly9hbGwgb3RoZXIgdmVyc2lvbnMgdXNlIGZpbHRlclxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZmlsdGVycy5hbHBoYSA9IFwiYWxwaGEob3BhY2l0eT1cIiArICh0aGlzLl9hbHBoYSAqIDEwMCkgKyBcIilcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5fbWJyKSB7XG5cdFx0XHR2YXIgb3JpZ2luID0gdGhpcy5fb3JpZ2luLnggKyBcInB4IFwiICsgdGhpcy5fb3JpZ2luLnkgKyBcInB4XCI7XG5cdFx0XHRzdHlsZS50cmFuc2Zvcm1PcmlnaW4gPSBvcmlnaW47XG5cdFx0XHRzdHlsZVtwcmVmaXggKyBcIlRyYW5zZm9ybU9yaWdpblwiXSA9IG9yaWdpbjtcblx0XHRcdGlmIChDcmFmdHkuc3VwcG9ydC5jc3MzZHRyYW5zZm9ybSkgdHJhbnMucHVzaChcInJvdGF0ZVooXCIgKyB0aGlzLl9yb3RhdGlvbiArIFwiZGVnKVwiKTtcblx0XHRcdGVsc2UgdHJhbnMucHVzaChcInJvdGF0ZShcIiArIHRoaXMuX3JvdGF0aW9uICsgXCJkZWcpXCIpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9mbGlwWCkge1xuXHRcdFx0dHJhbnMucHVzaChcInNjYWxlWCgtMSlcIik7XG5cdFx0XHRpZiAocHJlZml4ID09PSBcIm1zXCIgJiYgQ3JhZnR5LnN1cHBvcnQudmVyc2lvbiA8IDkpIHtcblx0XHRcdFx0dGhpcy5fZmlsdGVycy5mbGlwWCA9IFwiZmxpcGhcIjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5fZmxpcFkpIHtcblx0XHRcdHRyYW5zLnB1c2goXCJzY2FsZVkoLTEpXCIpO1xuXHRcdFx0aWYgKHByZWZpeCA9PT0gXCJtc1wiICYmIENyYWZ0eS5zdXBwb3J0LnZlcnNpb24gPCA5KSB7XG5cdFx0XHRcdHRoaXMuX2ZpbHRlcnMuZmxpcFkgPSBcImZsaXB2XCI7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9hcHBseSB0aGUgZmlsdGVycyBpZiBJRVxuXHRcdGlmIChwcmVmaXggPT09IFwibXNcIiAmJiBDcmFmdHkuc3VwcG9ydC52ZXJzaW9uIDwgOSkge1xuXHRcdFx0dGhpcy5hcHBseUZpbHRlcnMoKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fY3NzU3R5bGVzLnRyYW5zZm9ybSAhPSB0cmFucy5qb2luKFwiIFwiKSkge1xuXHRcdFx0dGhpcy5fY3NzU3R5bGVzLnRyYW5zZm9ybSA9IHRyYW5zLmpvaW4oXCIgXCIpO1xuXHRcdFx0c3R5bGUudHJhbnNmb3JtID0gdGhpcy5fY3NzU3R5bGVzLnRyYW5zZm9ybTtcblx0XHRcdHN0eWxlW3ByZWZpeCArIFwiVHJhbnNmb3JtXCJdID0gdGhpcy5fY3NzU3R5bGVzLnRyYW5zZm9ybTtcblx0XHR9XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJEcmF3XCIsIHsgc3R5bGU6IHN0eWxlLCB0eXBlOiBcIkRPTVwiLCBjbzogY28gfSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRhcHBseUZpbHRlcnM6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLmZpbHRlciA9IFwiXCI7XG5cdFx0dmFyIHN0ciA9IFwiXCI7XG5cblx0XHRmb3IgKHZhciBmaWx0ZXIgaW4gdGhpcy5fZmlsdGVycykge1xuXHRcdFx0aWYgKCF0aGlzLl9maWx0ZXJzLmhhc093blByb3BlcnR5KGZpbHRlcikpIGNvbnRpbnVlO1xuXHRcdFx0c3RyICs9IHRoaXMuX2ZpbHRlcnNbZmlsdGVyXSArIFwiIFwiO1xuXHRcdH1cblxuXHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUuZmlsdGVyID0gc3RyO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnVuZHJhd1xuXHQqIEBjb21wIERPTVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC51bmRyYXcodm9pZClcblx0KiBcblx0KiBSZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIHN0YWdlLlxuXHQqL1xuXHR1bmRyYXc6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fZWxlbWVudCkge1xuXHRcdFx0Q3JhZnR5LnN0YWdlLmlubmVyLnJlbW92ZUNoaWxkKHRoaXMuX2VsZW1lbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5jc3Ncblx0KiBAY29tcCBET01cblx0KiBAc2lnbiBwdWJsaWMgKiBjc3MoU3RyaW5nIHByb3BlcnR5LCBTdHJpbmcgdmFsdWUpXG5cdCogQHBhcmFtIHByb3BlcnR5IC0gQ1NTIHByb3BlcnR5IHRvIG1vZGlmeVxuXHQqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIGdpdmUgdGhlIENTUyBwcm9wZXJ0eVxuXHQqIEBzaWduIHB1YmxpYyAqIGNzcyhPYmplY3QgbWFwKVxuXHQqIEBwYXJhbSBtYXAgLSBPYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgQ1NTIHByb3BlcnR5IGFuZCB0aGUgdmFsdWUgaXMgQ1NTIHZhbHVlXG5cdCogXG5cdCogQXBwbHkgQ1NTIHN0eWxlcyB0byB0aGUgZWxlbWVudC5cblx0KlxuXHQqIENhbiBwYXNzIGFuIG9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHRoZSBzdHlsZSBwcm9wZXJ0eSBhbmQgdGhlIHZhbHVlIGlzIHN0eWxlIHZhbHVlLlxuXHQqXG5cdCogRm9yIHNldHRpbmcgb25lIHN0eWxlLCBzaW1wbHkgcGFzcyB0aGUgc3R5bGUgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCB0aGUgdmFsdWUgYXMgdGhlIHNlY29uZC5cblx0KlxuXHQqIFRoZSBub3RhdGlvbiBjYW4gYmUgQ1NTIG9yIEpTIChlLmcuIGB0ZXh0LWFsaWduYCBvciBgdGV4dEFsaWduYCkuXG5cdCpcblx0KiBUbyByZXR1cm4gYSB2YWx1ZSwgcGFzcyB0aGUgcHJvcGVydHkuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLmNzcyh7J3RleHQtYWxpZ24nLCAnY2VudGVyJywgZm9udDogJ0FyaWFsJ30pO1xuXHQqIHRoaXMuY3NzKFwidGV4dEFsaWduXCIsIFwiY2VudGVyXCIpO1xuXHQqIHRoaXMuY3NzKFwidGV4dC1hbGlnblwiKTsgLy9yZXR1cm5zIGNlbnRlclxuXHQqIH5+flxuXHQqL1xuXHRjc3M6IGZ1bmN0aW9uIChvYmosIHZhbHVlKSB7XG5cdFx0dmFyIGtleSxcblx0XHRcdGVsZW0gPSB0aGlzLl9lbGVtZW50LFxuXHRcdFx0dmFsLFxuXHRcdFx0c3R5bGUgPSBlbGVtLnN0eWxlO1xuXG5cdFx0Ly9pZiBhbiBvYmplY3QgcGFzc2VkXG5cdFx0aWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdGZvciAoa2V5IGluIG9iaikge1xuXHRcdFx0XHRpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblx0XHRcdFx0dmFsID0gb2JqW2tleV07XG5cdFx0XHRcdGlmICh0eXBlb2YgdmFsID09PSBcIm51bWJlclwiKSB2YWwgKz0gJ3B4JztcblxuXHRcdFx0XHRzdHlsZVtDcmFmdHkuRE9NLmNhbWVsaXplKGtleSldID0gdmFsO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvL2lmIGEgdmFsdWUgaXMgcGFzc2VkLCBzZXQgdGhlIHByb3BlcnR5XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgdmFsdWUgKz0gJ3B4Jztcblx0XHRcdFx0c3R5bGVbQ3JhZnR5LkRPTS5jYW1lbGl6ZShvYmopXSA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHsgLy9vdGhlcndpc2UgcmV0dXJuIHRoZSBjb21wdXRlZCBwcm9wZXJ0eVxuXHRcdFx0XHRyZXR1cm4gQ3JhZnR5LkRPTS5nZXRTdHlsZShlbGVtLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqXG4qIEZpeCBJRTYgYmFja2dyb3VuZCBmbGlja2VyaW5nXG4qL1xudHJ5IHtcblx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJCYWNrZ3JvdW5kSW1hZ2VDYWNoZVwiLCBmYWxzZSwgdHJ1ZSk7XG59IGNhdGNoIChlKSB7IH1cblxuQ3JhZnR5LmV4dGVuZCh7XG4gICAgLyoqQFxuXHQqICNDcmFmdHkuRE9NXG5cdCogQGNhdGVnb3J5IEdyYXBoaWNzXG5cdCogXG5cdCogQ29sbGVjdGlvbiBvZiB1dGlsaXRpZXMgZm9yIHVzaW5nIHRoZSBET00uXG5cdCovXG5cdERPTToge1xuXHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRPTS53aW5kb3dcblx0XHQqIEBjb21wIENyYWZ0eS5ET01cblx0XHQqIFxuXHRcdCogT2JqZWN0IHdpdGggYHdpZHRoYCBhbmQgYGhlaWdodGAgdmFsdWVzIHJlcHJlc2VudGluZyB0aGUgd2lkdGhcblx0XHQqIGFuZCBoZWlnaHQgb2YgdGhlIGB3aW5kb3dgLlxuXHRcdCovXG5cdFx0d2luZG93OiB7XG5cdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHRoaXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCB8fCAod2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCB8fCB3aW5kb3cuZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCk7XG5cdFx0XHRcdHRoaXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IHx8ICh3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCB8fCB3aW5kb3cuZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQpO1xuXHRcdFx0fSxcblxuXHRcdFx0d2lkdGg6IDAsXG5cdFx0XHRoZWlnaHQ6IDBcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5ET00uaW5uZXJcblx0XHQqIEBjb21wIENyYWZ0eS5ET01cblx0XHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5LkRPTS5pbm5lcihIVE1MRWxlbWVudCBvYmopXG5cdFx0KiBAcGFyYW0gb2JqIC0gSFRNTCBlbGVtZW50IHRvIGNhbGN1bGF0ZSB0aGUgcG9zaXRpb25cblx0XHQqIEByZXR1cm5zIE9iamVjdCB3aXRoIGB4YCBrZXkgYmVpbmcgdGhlIGB4YCBwb3NpdGlvbiwgYHlgIGJlaW5nIHRoZSBgeWAgcG9zaXRpb25cblx0XHQqIFxuXHRcdCogRmluZCBhIERPTSBlbGVtZW50cyBwb3NpdGlvbiBpbmNsdWRpbmdcblx0XHQqIHBhZGRpbmcgYW5kIGJvcmRlci5cblx0XHQqL1xuXHRcdGlubmVyOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0XHR2YXIgcmVjdCA9IG9iai5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcblx0XHRcdFx0eCA9IHJlY3QubGVmdCArICh3aW5kb3cucGFnZVhPZmZzZXQgPyB3aW5kb3cucGFnZVhPZmZzZXQgOiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQpLFxuXHRcdFx0XHR5ID0gcmVjdC50b3AgKyAod2luZG93LnBhZ2VZT2Zmc2V0ID8gd2luZG93LnBhZ2VZT2Zmc2V0IDogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3ApLFxuXG5cdFx0XHQvL2JvcmRlciBsZWZ0XG5cdFx0XHRcdGJvcmRlclggPSBwYXJzZUludCh0aGlzLmdldFN0eWxlKG9iaiwgJ2JvcmRlci1sZWZ0LXdpZHRoJykgfHwgMCwgMTApIHx8IHBhcnNlSW50KHRoaXMuZ2V0U3R5bGUob2JqLCAnYm9yZGVyTGVmdFdpZHRoJykgfHwgMCwgMTApIHx8IDAsXG5cdFx0XHRcdGJvcmRlclkgPSBwYXJzZUludCh0aGlzLmdldFN0eWxlKG9iaiwgJ2JvcmRlci10b3Atd2lkdGgnKSB8fCAwLCAxMCkgfHwgcGFyc2VJbnQodGhpcy5nZXRTdHlsZShvYmosICdib3JkZXJUb3BXaWR0aCcpIHx8IDAsIDEwKSB8fCAwO1xuXG5cdFx0XHR4ICs9IGJvcmRlclg7XG5cdFx0XHR5ICs9IGJvcmRlclk7XG5cblx0XHRcdHJldHVybiB7IHg6IHgsIHk6IHkgfTtcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5ET00uZ2V0U3R5bGVcblx0XHQqIEBjb21wIENyYWZ0eS5ET01cblx0XHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5LkRPTS5nZXRTdHlsZShIVE1MRWxlbWVudCBvYmosIFN0cmluZyBwcm9wZXJ0eSlcblx0XHQqIEBwYXJhbSBvYmogLSBIVE1MIGVsZW1lbnQgdG8gZmluZCB0aGUgc3R5bGVcblx0XHQqIEBwYXJhbSBwcm9wZXJ0eSAtIFN0eWxlIHRvIHJldHVyblxuXHRcdCogXG5cdFx0KiBEZXRlcm1pbmUgdGhlIHZhbHVlIG9mIGEgc3R5bGUgb24gYW4gSFRNTCBlbGVtZW50LiBOb3RhdGlvbiBjYW4gYmVcblx0XHQqIGluIGVpdGhlciBDU1Mgb3IgSlMuXG5cdFx0Ki9cblx0XHRnZXRTdHlsZTogZnVuY3Rpb24gKG9iaiwgcHJvcCkge1xuXHRcdFx0dmFyIHJlc3VsdDtcblx0XHRcdGlmIChvYmouY3VycmVudFN0eWxlKVxuXHRcdFx0XHRyZXN1bHQgPSBvYmouY3VycmVudFN0eWxlW3RoaXMuY2FtZWxpemUocHJvcCldO1xuXHRcdFx0ZWxzZSBpZiAod2luZG93LmdldENvbXB1dGVkU3R5bGUpXG5cdFx0XHRcdHJlc3VsdCA9IGRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUob2JqLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKHRoaXMuY3NzZWxpemUocHJvcCkpO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0KiBVc2VkIGluIHRoZSBaZXB0byBmcmFtZXdvcmtcblx0XHQqXG5cdFx0KiBDb252ZXJ0cyBDU1Mgbm90YXRpb24gdG8gSlMgbm90YXRpb25cblx0XHQqL1xuXHRcdGNhbWVsaXplOiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoLy0rKC4pPy9nLCBmdW5jdGlvbiAobWF0Y2gsIGNocil7IHJldHVybiBjaHIgPyBjaHIudG9VcHBlckNhc2UoKSA6ICcnIH0pO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQqIENvbnZlcnRzIEpTIG5vdGF0aW9uIHRvIENTUyBub3RhdGlvblxuXHRcdCovXG5cdFx0Y3NzZWxpemU6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvW0EtWl0vZywgZnVuY3Rpb24gKGNocil7IHJldHVybiBjaHIgPyAnLScgKyBjaHIudG9Mb3dlckNhc2UoKSA6ICcnIH0pO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRPTS50cmFuc2xhdGVcblx0XHQqIEBjb21wIENyYWZ0eS5ET01cblx0XHQqIEBzaWduIHB1YmxpYyBPYmplY3QgQ3JhZnR5LkRPTS50cmFuc2xhdGUoTnVtYmVyIHgsIE51bWJlciB5KVxuXHRcdCogQHBhcmFtIHggLSB4IHBvc2l0aW9uIHRvIHRyYW5zbGF0ZVxuXHRcdCogQHBhcmFtIHkgLSB5IHBvc2l0aW9uIHRvIHRyYW5zbGF0ZVxuXHRcdCogQHJldHVybiBPYmplY3Qgd2l0aCB4IGFuZCB5IGFzIGtleXMgYW5kIHRyYW5zbGF0ZWQgdmFsdWVzXG5cdFx0KlxuXHRcdCogTWV0aG9kIHdpbGwgdHJhbnNsYXRlIHggYW5kIHkgcG9zaXRpb25zIHRvIHBvc2l0aW9ucyBvbiB0aGVcblx0XHQqIHN0YWdlLiBVc2VmdWwgZm9yIG1vdXNlIGV2ZW50cyB3aXRoIGBlLmNsaWVudFhgIGFuZCBgZS5jbGllbnRZYC5cblx0XHQqL1xuXHRcdHRyYW5zbGF0ZTogZnVuY3Rpb24gKHgsIHkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6ICh4IC0gQ3JhZnR5LnN0YWdlLnggKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCAtIENyYWZ0eS52aWV3cG9ydC5feCkvQ3JhZnR5LnZpZXdwb3J0Ll96b29tLFxuXHRcdFx0XHR5OiAoeSAtIENyYWZ0eS5zdGFnZS55ICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIC0gQ3JhZnR5LnZpZXdwb3J0Ll95KS9DcmFmdHkudmlld3BvcnQuX3pvb21cblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4vKipAXG4qICNIVE1MXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBDb21wb25lbnQgYWxsb3cgZm9yIGluc2VydGlvbiBvZiBhcmJpdHJhcnkgSFRNTCBpbnRvIGFuIGVudGl0eVxuKi9cbkNyYWZ0eS5jKFwiSFRNTFwiLCB7XG5cdGlubmVyOiAnJyxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcygnMkQsIERPTScpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnJlcGxhY2Vcblx0KiBAY29tcCBIVE1MXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnJlcGxhY2UoU3RyaW5nIGh0bWwpXG5cdCogQHBhcmFtIGh0bWwgLSBhcmJpdHJhcnkgaHRtbFxuXHQqIFxuXHQqIFRoaXMgbWV0aG9kIHdpbGwgcmVwbGFjZSB0aGUgY29udGVudCBvZiB0aGlzIGVudGl0eSB3aXRoIHRoZSBzdXBwbGllZCBodG1sXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIENyZWF0ZSBhIGxpbmtcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIkhUTUxcIilcblx0KiAgICAuYXR0cih7eDoyMCwgeToyMCwgdzoxMDAsIGg6MTAwfSlcbiAgICAqICAgIC5yZXBsYWNlKFwiPGEgaHJlZj0naHR0cDovL3d3dy5jcmFmdHlqcy5jb20nPkNyYWZ0eS5qczwvYT5cIik7XG5cdCogfn5+XG5cdCovXG5cdHJlcGxhY2U6IGZ1bmN0aW9uIChuZXdfaHRtbCkge1xuXHRcdHRoaXMuaW5uZXIgPSBuZXdfaHRtbDtcblx0XHR0aGlzLl9lbGVtZW50LmlubmVySFRNTCA9IG5ld19odG1sO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmFwcGVuZFxuXHQqIEBjb21wIEhUTUxcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYXBwZW5kKFN0cmluZyBodG1sKVxuXHQqIEBwYXJhbSBodG1sIC0gYXJiaXRyYXJ5IGh0bWxcblx0KiBcblx0KiBUaGlzIG1ldGhvZCB3aWxsIGFkZCB0aGUgc3VwcGxpZWQgaHRtbCBpbiB0aGUgZW5kIG9mIHRoZSBlbnRpdHlcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogQ3JlYXRlIGEgbGlua1xuXHQqIH5+flxuXHQqIENyYWZ0eS5lKFwiSFRNTFwiKVxuXHQqICAgIC5hdHRyKHt4OjIwLCB5OjIwLCB3OjEwMCwgaDoxMDB9KVxuICAgICogICAgLmFwcGVuZChcIjxhIGhyZWY9J2h0dHA6Ly93d3cuY3JhZnR5anMuY29tJz5DcmFmdHkuanM8L2E+XCIpO1xuXHQqIH5+flxuXHQqL1xuXHRhcHBlbmQ6IGZ1bmN0aW9uIChuZXdfaHRtbCkge1xuXHRcdHRoaXMuaW5uZXIgKz0gbmV3X2h0bWw7XG5cdFx0dGhpcy5fZWxlbWVudC5pbm5lckhUTUwgKz0gbmV3X2h0bWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMucHJlcGVuZFxuXHQqIEBjb21wIEhUTUxcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAucHJlcGVuZChTdHJpbmcgaHRtbClcblx0KiBAcGFyYW0gaHRtbCAtIGFyYml0cmFyeSBodG1sXG5cdCogXG5cdCogVGhpcyBtZXRob2Qgd2lsbCBhZGQgdGhlIHN1cHBsaWVkIGh0bWwgaW4gdGhlIGJlZ2lubmluZyBvZiB0aGUgZW50aXR5XG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIENyZWF0ZSBhIGxpbmtcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIkhUTUxcIilcblx0KiAgICAuYXR0cih7eDoyMCwgeToyMCwgdzoxMDAsIGg6MTAwfSlcbiAgICAqICAgIC5wcmVwZW5kKFwiPGEgaHJlZj0naHR0cDovL3d3dy5jcmFmdHlqcy5jb20nPkNyYWZ0eS5qczwvYT5cIik7XG5cdCogfn5+XG5cdCovXG5cdHByZXBlbmQ6IGZ1bmN0aW9uIChuZXdfaHRtbCkge1xuXHRcdHRoaXMuaW5uZXIgPSBuZXdfaHRtbCArIHRoaXMuaW5uZXI7XG5cdFx0dGhpcy5fZWxlbWVudC5pbm5lckhUTUwgPSBuZXdfaHRtbCArIHRoaXMuaW5uZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuLyoqQFxuICogI1N0b3JhZ2VcbiAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAqIFV0aWxpdHkgdG8gYWxsb3cgZGF0YSB0byBiZSBzYXZlZCB0byBhIHBlcm1hbmVudCBzdG9yYWdlIHNvbHV0aW9uOiBJbmRleGVkREIsIFdlYlNxbCwgbG9jYWxzdG9yYWdlIG9yIGNvb2tpZXNcbiAqL1xuICAgIC8qKkBcblx0ICogIy5vcGVuXG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHNpZ24gLm9wZW4oU3RyaW5nIGdhbWVOYW1lKVxuXHQgKiBAcGFyYW0gZ2FtZU5hbWUgLSBhIG1hY2hpbmUgcmVhZGFibGUgc3RyaW5nIHRvIHVuaXF1ZWx5IGlkZW50aWZ5IHlvdXIgZ2FtZVxuXHQgKiBcblx0ICogT3BlbnMgYSBjb25uZWN0aW9uIHRvIHRoZSBkYXRhYmFzZS4gSWYgdGhlIGJlc3QgdGhleSBoYXZlIGlzIGxvY2Fsc3RvcmFnZSBvciBsb3dlciwgaXQgZG9lcyBub3RoaW5nXG5cdCAqXG5cdCAqIEBleGFtcGxlXG5cdCAqIE9wZW4gYSBkYXRhYmFzZVxuXHQgKiB+fn5cblx0ICogQ3JhZnR5LnN0b3JhZ2Uub3BlbignTXlHYW1lJyk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogIy5zYXZlXG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHNpZ24gLnNhdmUoU3RyaW5nIGtleSwgU3RyaW5nIHR5cGUsIE1peGVkIGRhdGEpXG5cdCAqIEBwYXJhbSBrZXkgLSBBIHVuaXF1ZSBrZXkgZm9yIGlkZW50aWZ5aW5nIHRoaXMgcGllY2Ugb2YgZGF0YVxuXHQgKiBAcGFyYW0gdHlwZSAtICdzYXZlJyBvciAnY2FjaGUnXG5cdCAqIEBwYXJhbSBkYXRhIC0gU29tZSBraW5kIG9mIGRhdGEuXG5cdCAqIFxuXHQgKiBTYXZlcyBhIHBpZWNlIG9mIGRhdGEgdG8gdGhlIGRhdGFiYXNlLiBDYW4gYmUgYW55dGhpbmcsIGFsdGhvdWdoIGVudGl0aWVzIGFyZSBwcmVmZXJyZWQuXG5cdCAqIEZvciBhbGwgc3RvcmFnZSBtZXRob2RzIGJ1dCBJbmRleGVkREIsIHRoZSBkYXRhIHdpbGwgYmUgc2VyaWFsaXplZCBhcyBhIHN0cmluZ1xuXHQgKiBEdXJpbmcgc2VyaWFsaXphdGlvbiwgYW4gZW50aXR5J3MgU2F2ZURhdGEgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQuXG5cdCAqIENvbXBvbmVudHMgc2hvdWxkIGltcGxlbWVudCBhIFNhdmVEYXRhIGhhbmRsZXIgYW5kIGF0dGFjaCB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHRoZSBwYXNzZWQgb2JqZWN0XG5cdCAqXG5cdCAqIEBleGFtcGxlXG5cdCAqIFNhdmVzIGFuIGVudGl0eSB0byB0aGUgZGF0YWJhc2Vcblx0ICogfn5+XG5cdCAqIHZhciBlbnQgPSBDcmFmdHkuZShcIjJELCBET01cIilcblx0ICogICAgICAgICAgICAgICAgICAgICAuYXR0cih7eDogMjAsIHk6IDIwLCB3OiAxMDAsIGg6MTAwfSk7XG5cdCAqIENyYWZ0eS5zdG9yYWdlLm9wZW4oJ015R2FtZScpO1xuXHQgKiBDcmFmdHkuc3RvcmFnZS5zYXZlKCdNeUVudGl0eScsICdzYXZlJywgZW50KTtcblx0ICogfn5+XG5cdCAqL1xuXG4gICAgLyoqQFxuXHQgKiAjLmxvYWRcblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAc2lnbiAubG9hZChTdHJpbmcga2V5LCBTdHJpbmcgdHlwZSlcblx0ICogQHBhcmFtIGtleSAtIEEgdW5pcXVlIGtleSB0byBzZWFyY2ggZm9yXG5cdCAqIEBwYXJhbSB0eXBlIC0gJ3NhdmUnIG9yICdjYWNoZSdcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gRG8gdGhpbmdzIHdpdGggdGhlIGRhdGEgeW91IGdldCBiYWNrXG5cdCAqIFxuXHQgKiBMb2FkcyBhIHBpZWNlIG9mIGRhdGEgZnJvbSB0aGUgZGF0YWJhc2UuXG5cdCAqIEVudGl0aWVzIHdpbGwgYmUgcmVjb25zdHJ1Y3RlZCBmcm9tIHRoZSBzZXJpYWxpemVkIHN0cmluZ1xuXG5cdCAqIEBleGFtcGxlXG5cdCAqIExvYWRzIGFuIGVudGl0eSBmcm9tIHRoZSBkYXRhYmFzZVxuXHQgKiB+fn5cblx0ICogQ3JhZnR5LnN0b3JhZ2Uub3BlbignTXlHYW1lJyk7XG5cdCAqIENyYWZ0eS5zdG9yYWdlLmxvYWQoJ015RW50aXR5JywgJ3NhdmUnLCBmdW5jdGlvbiAoZGF0YSkgeyAvLyBkbyB0aGluZ3MgfSk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogIy5nZXRBbGxLZXlzXG5cdCAqIEBjb21wIFN0b3JhZ2Vcblx0ICogQHNpZ24gLmdldEFsbEtleXMoU3RyaW5nIHR5cGUpXG5cdCAqIEBwYXJhbSB0eXBlIC0gJ3NhdmUnIG9yICdjYWNoZSdcblx0ICogR2V0cyBhbGwgdGhlIGtleXMgZm9yIGEgZ2l2ZW4gdHlwZVxuXG5cdCAqIEBleGFtcGxlXG5cdCAqIEdldHMgYWxsIHRoZSBzYXZlIGdhbWVzIHNhdmVkXG5cdCAqIH5+flxuXHQgKiBDcmFmdHkuc3RvcmFnZS5vcGVuKCdNeUdhbWUnKTtcblx0ICogdmFyIHNhdmVzID0gQ3JhZnR5LnN0b3JhZ2UuZ2V0QWxsS2V5cygnc2F2ZScpO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICMuZXh0ZXJuYWxcblx0ICogQGNvbXAgU3RvcmFnZVxuXHQgKiBAc2lnbiAuZXh0ZXJuYWwoU3RyaW5nIHVybClcblx0ICogQHBhcmFtIHVybCAtIFVSTCB0byBhbiBleHRlcm5hbCB0byBzYXZlIGdhbWVzIHRvb1xuXHQgKiBcblx0ICogRW5hYmxlcyBhbmQgc2V0cyB0aGUgdXJsIGZvciBzYXZpbmcgZ2FtZXMgdG8gYW4gZXh0ZXJuYWwgc2VydmVyXG5cdCAqIFxuXHQgKiBAZXhhbXBsZVxuXHQgKiBTYXZlIGFuIGVudGl0eSB0byBhbiBleHRlcm5hbCBzZXJ2ZXJcblx0ICogfn5+XG5cdCAqIENyYWZ0eS5zdG9yYWdlLmV4dGVybmFsKCdodHRwOi8vc29tZXdoZXJlLmNvbS9zZXJ2ZXIucGhwJyk7XG5cdCAqIENyYWZ0eS5zdG9yYWdlLm9wZW4oJ015R2FtZScpO1xuXHQgKiB2YXIgZW50ID0gQ3JhZnR5LmUoJzJELCBET00nKVxuXHQgKiAgICAgICAgICAgICAgICAgICAgIC5hdHRyKHt4OiAyMCwgeTogMjAsIHc6IDEwMCwgaDoxMDB9KTtcblx0ICogQ3JhZnR5LnN0b3JhZ2Uuc2F2ZSgnc2F2ZTAxJywgJ3NhdmUnLCBlbnQpO1xuXHQgKiB+fn5cblx0ICovXG5cbiAgICAvKipAXG5cdCAqICNTYXZlRGF0YSBldmVudFxuXHQgKiBAY29tcCBTdG9yYWdlXG5cdCAqIEBwYXJhbSBkYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkYXRhIHRvIGJlIHNlcmlhbGl6ZWRcblx0ICogQHBhcmFtIHByZXBhcmUgLSBUaGUgZnVuY3Rpb24gdG8gcHJlcGFyZSBhbiBlbnRpdHkgZm9yIHNlcmlhbGl6YXRpb25cblx0ICogXG5cdCAqIEFueSBkYXRhIGEgY29tcG9uZW50IHdhbnRzIHRvIHNhdmUgd2hlbiBpdCdzIHNlcmlhbGl6ZWQgc2hvdWxkIGJlIGFkZGVkIHRvIHRoaXMgb2JqZWN0LlxuXHQgKiBTdHJhaWdodCBhdHRyaWJ1dGUgc2hvdWxkIGJlIHNldCBpbiBkYXRhLmF0dHIuXG5cdCAqIEFueXRoaW5nIHRoYXQgcmVxdWlyZXMgYSBzcGVjaWFsIGhhbmRsZXIgc2hvdWxkIGJlIHNldCBpbiBhIHVuaXF1ZSBwcm9wZXJ0eS5cblx0ICpcblx0ICogQGV4YW1wbGVcblx0ICogU2F2ZXMgdGhlIGlubmVySFRNTCBvZiBhbiBlbnRpdHlcblx0ICogfn5+XG5cdCAqIENyYWZ0eS5lKFwiMkQgRE9NXCIpLmJpbmQoXCJTYXZlRGF0YVwiLCBmdW5jdGlvbiAoZGF0YSwgcHJlcGFyZSkge1xuXHQgKiAgICAgZGF0YS5hdHRyLnggPSB0aGlzLng7XG5cdCAqICAgICBkYXRhLmF0dHIueSA9IHRoaXMueTtcblx0ICogICAgIGRhdGEuZG9tID0gdGhpcy5lbGVtZW50LmlubmVySFRNTDtcblx0ICogfSk7XG5cdCAqIH5+flxuXHQgKi9cblxuICAgIC8qKkBcblx0ICogI0xvYWREYXRhIGV2ZW50XG5cdCAqIEBwYXJhbSBkYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIHRoZSBkYXRhIHRoYXQgYmVlbiBzYXZlZFxuXHQgKiBAcGFyYW0gcHJvY2VzcyAtIFRoZSBmdW5jdGlvbiB0byB0dXJuIGEgc3RyaW5nIGludG8gYW4gZW50aXR5XG5cdCAqIFxuXHQgKiBIYW5kbGVycyBmb3IgcHJvY2Vzc2luZyBhbnkgZGF0YSB0aGF0IG5lZWRzIG1vcmUgdGhhbiBzdHJhaWdodCBhc3NpZ25tZW50XG5cdCAqXG5cdCAqIE5vdGUgdGhhdCBkYXRhIHN0b3JlZCBpbiB0aGUgLmF0dHIgb2JqZWN0IGlzIGF1dG9tYXRpY2FsbHkgYWRkZWQgdG8gdGhlIGVudGl0eS5cblx0ICogSXQgZG9lcyBub3QgbmVlZCB0byBiZSBoYW5kbGVkIGhlcmVcblx0ICpcblx0ICogQGV4YW1wbGVcblx0ICogfn5+XG5cdCAqIFNldHMgdGhlIGlubmVySFRNTCBmcm9tIGEgc2F2ZWQgZW50aXR5XG5cdCAqIENyYWZ0eS5lKFwiMkQgRE9NXCIpLmJpbmQoXCJMb2FkRGF0YVwiLCBmdW5jdGlvbiAoZGF0YSwgcHJvY2Vzcykge1xuXHQgKiAgICAgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9IGRhdGEuZG9tO1xuXHQgKiB9KTtcblx0ICogfn5+XG5cdCAqL1xuXG5DcmFmdHkuc3RvcmFnZSA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciBkYiA9IG51bGwsIHVybCwgZ2FtZU5hbWUsIHRpbWVzdGFtcHMgPSB7fSwgXG5cdFx0dHJhbnNhY3Rpb25UeXBlID0geyBSRUFEOiBcInJlYWRvbmx5XCIsIFJFQURfV1JJVEU6IFwicmVhZHdyaXRlXCIgfTtcblxuXHQvKlxuXHQgKiBQcm9jZXNzZXMgYSByZXRyaWV2ZWQgb2JqZWN0LlxuXHQgKiBDcmVhdGVzIGFuIGVudGl0eSBpZiBpdCBpcyBvbmVcblx0ICovXG5cdGZ1bmN0aW9uIHByb2Nlc3Mob2JqKSB7XG5cdFx0aWYgKG9iai5jKSB7XG5cdFx0XHR2YXIgZCA9IENyYWZ0eS5lKG9iai5jKVxuXHRcdFx0XHRcdFx0LmF0dHIob2JqLmF0dHIpXG5cdFx0XHRcdFx0XHQudHJpZ2dlcignTG9hZERhdGEnLCBvYmosIHByb2Nlc3MpO1xuXHRcdFx0cmV0dXJuIGQ7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHR5cGVvZiBvYmogPT0gJ29iamVjdCcpIHtcblx0XHRcdGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG5cdFx0XHRcdG9ialtwcm9wXSA9IHByb2Nlc3Mob2JqW3Byb3BdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cdGZ1bmN0aW9uIHVuc2VyaWFsaXplKHN0cikge1xuXHRcdGlmICh0eXBlb2Ygc3RyICE9ICdzdHJpbmcnKSByZXR1cm4gbnVsbDtcblx0XHR2YXIgZGF0YSA9IChKU09OID8gSlNPTi5wYXJzZShzdHIpIDogZXZhbCgnKCcgKyBzdHIgKyAnKScpKTtcblx0XHRyZXR1cm4gcHJvY2VzcyhkYXRhKTtcblx0fVxuXG5cdC8qIHJlY3Vyc2l2ZSBmdW5jdGlvblxuXHQgKiBzZWFyY2hlcyBmb3IgZW50aXRpZXMgaW4gYW4gb2JqZWN0IGFuZCBwcm9jZXNzZXMgdGhlbSBmb3Igc2VyaWFsaXphdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gcHJlcChvYmopIHtcblx0XHRpZiAob2JqLl9fYykge1xuXHRcdFx0Ly8gb2JqZWN0IGlzIGVudGl0eVxuXHRcdFx0dmFyIGRhdGEgPSB7IGM6IFtdLCBhdHRyOiB7fSB9O1xuXHRcdFx0b2JqLnRyaWdnZXIoXCJTYXZlRGF0YVwiLCBkYXRhLCBwcmVwKTtcblx0XHRcdGZvciAodmFyIGkgaW4gb2JqLl9fYykge1xuXHRcdFx0XHRkYXRhLmMucHVzaChpKTtcblx0XHRcdH1cblx0XHRcdGRhdGEuYyA9IGRhdGEuYy5qb2luKCcsICcpO1xuXHRcdFx0b2JqID0gZGF0YTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodHlwZW9mIG9iaiA9PSAnb2JqZWN0Jykge1xuXHRcdFx0Ly8gcmVjdXJzZSBhbmQgbG9vayBmb3IgZW50aXRpZXNcblx0XHRcdGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG5cdFx0XHRcdG9ialtwcm9wXSA9IHByZXAob2JqW3Byb3BdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cdGZ1bmN0aW9uIHNlcmlhbGl6ZShlKSB7XG5cdFx0aWYgKEpTT04pIHtcblx0XHRcdHZhciBkYXRhID0gcHJlcChlKTtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRhbGVydChcIkNyYWZ0eSBkb2VzIG5vdCBzdXBwb3J0IHNhdmluZyBvbiB5b3VyIGJyb3dzZXIuIFBsZWFzZSB1cGdyYWRlIHRvIGEgbmV3ZXIgYnJvd3Nlci5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0Ly8gZm9yIHNhdmluZyBhIGdhbWUgdG8gYSBjZW50cmFsIHNlcnZlclxuXHRmdW5jdGlvbiBleHRlcm5hbChzZXRVcmwpIHtcblx0XHR1cmwgPSBzZXRVcmw7XG5cdH1cblxuXHRmdW5jdGlvbiBvcGVuRXh0ZXJuYWwoKSB7XG5cdFx0aWYgKDEgJiYgdHlwZW9mIHVybCA9PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cdFx0Ly8gZ2V0IHRoZSB0aW1lc3RhbXBzIGZvciBleHRlcm5hbCBzYXZlcyBhbmQgY29tcGFyZSB0aGVtIHRvIGxvY2FsXG5cdFx0Ly8gaWYgdGhlIGV4dGVybmFsIGlzIG5ld2VyLCBsb2FkIGl0XG5cblx0XHR2YXIgeG1sID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0eGhyLm9wZW4oXCJQT1NUXCIsIHVybCk7XG5cdFx0eGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldnQpIHtcblx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuXHRcdFx0XHRcdHZhciBkYXRhID0gZXZhbChcIihcIiArIHhoci5yZXNwb25zZVRleHQgKyBcIilcIik7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaSBpbiBkYXRhKSB7XG5cdFx0XHRcdFx0XHRpZiAoQ3JhZnR5LnN0b3JhZ2UuY2hlY2soZGF0YVtpXS5rZXksIGRhdGFbaV0udGltZXN0YW1wKSkge1xuXHRcdFx0XHRcdFx0XHRsb2FkRXh0ZXJuYWwoZGF0YVtpXS5rZXkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR4aHIuc2VuZChcIm1vZGU9dGltZXN0YW1wcyZnYW1lPVwiICsgZ2FtZU5hbWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZUV4dGVybmFsKGtleSwgZGF0YSwgdHMpIHtcblx0XHRpZiAoMSAmJiB0eXBlb2YgdXJsID09IFwidW5kZWZpbmVkXCIpIHJldHVybjtcblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0eGhyLm9wZW4oXCJQT1NUXCIsIHVybCk7XG5cdFx0eGhyLnNlbmQoXCJtb2RlPXNhdmUma2V5PVwiICsga2V5ICsgXCImZGF0YT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhKSArIFwiJnRzPVwiICsgdHMgKyBcIiZnYW1lPVwiICsgZ2FtZU5hbWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbG9hZEV4dGVybmFsKGtleSkge1xuXHRcdGlmICgxICYmIHR5cGVvZiB1cmwgPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbihcIlBPU1RcIiwgdXJsKTtcblx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2dCkge1xuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG5cdFx0XHRcdFx0dmFyIGRhdGEgPSBldmFsKFwiKFwiICsgeGhyLnJlc3BvbnNlVGV4dCArIFwiKVwiKTtcblx0XHRcdFx0XHRDcmFmdHkuc3RvcmFnZS5zYXZlKGtleSwgJ3NhdmUnLCBkYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR4aHIuc2VuZChcIm1vZGU9bG9hZCZrZXk9XCIgKyBrZXkgKyBcIiZnYW1lPVwiICsgZ2FtZU5hbWUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIGdldCB0aW1lc3RhbXBcblx0ICovXG5cdGZ1bmN0aW9uIHRzKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKTtcblx0XHRyZXR1cm4gZC5nZXRUaW1lKCk7XG5cdH1cblxuXHQvLyBldmVyeW9uZSBuYW1lcyB0aGVpciBvYmplY3QgZGlmZmVyZW50LiBGaXggdGhhdCBub25zZW5zZS5cblx0aWYgKHR5cGVvZiBpbmRleGVkREIgIT0gJ29iamVjdCcpIHtcblx0XHR3aW5kb3cuaW5kZXhlZERCID0gd2luZG93LmluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy53ZWJraXRJbmRleGVkREIgfHwgd2luZG93Lm1zSW5kZXhlZERCO1xuXHRcdHdpbmRvdy5JREJUcmFuc2FjdGlvbiA9IHdpbmRvdy5JREJUcmFuc2FjdGlvbiB8fCB3aW5kb3cud2Via2l0SURCVHJhbnNhY3Rpb247XG5cdFx0XG5cdFx0LyogTnVtZXJpYyBjb25zdGFudHMgZm9yIHRyYW5zYWN0aW9uIHR5cGUgYXJlIGRlcHJlY2F0ZWRcblx0XHQgKiBFbnN1cmUgdGhhdCB0aGUgc2NyaXB0IHdpbGwgd29yayBjb25zaXN0ZW5seSBmb3IgcmVjZW50IGFuZCBsZWdhY3kgYnJvd3NlciB2ZXJzaW9uc1xuXHRcdCAqL1xuXHRcdGlmICh0eXBlb2YgSURCVHJhbnNhY3Rpb24gPT0gJ29iamVjdCcpIHtcblx0XHRcdHRyYW5zYWN0aW9uVHlwZS5SRUFEID0gSURCVHJhbnNhY3Rpb24uUkVBRCB8fCBJREJUcmFuc2FjdGlvbi5yZWFkb25seSB8fCB0cmFuc2FjdGlvblR5cGUuUkVBRDtcblx0XHRcdHRyYW5zYWN0aW9uVHlwZS5SRUFEX1dSSVRFID0gSURCVHJhbnNhY3Rpb24uUkVBRF9XUklURSB8fCBJREJUcmFuc2FjdGlvbi5yZWFkd3JpdGUgfHwgdHJhbnNhY3Rpb25UeXBlLlJFQURfV1JJVEU7XG5cdFx0fVxuXHR9XG5cblx0aWYgKHR5cGVvZiBpbmRleGVkREIgPT0gJ29iamVjdCcpIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuOiBmdW5jdGlvbiAoZ2FtZU5hbWVfbikge1xuXHRcdFx0XHRnYW1lTmFtZSA9IGdhbWVOYW1lX247XG5cdFx0XHRcdHZhciBzdG9yZXMgPSBbXTtcblxuXHRcdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdFx0c3RvcmVzLnB1c2goJ3NhdmUnKTtcblx0XHRcdFx0XHRzdG9yZXMucHVzaCgnY2FjaGUnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRzdG9yZXMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0c3RvcmVzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0c3RvcmVzLnB1c2goJ3NhdmUnKTtcblx0XHRcdFx0XHRzdG9yZXMucHVzaCgnY2FjaGUnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGIgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHZhciByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oZ2FtZU5hbWUpO1xuXHRcdFx0XHRcdHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdGRiID0gZS50YXJnZXQucmVzdWx0O1xuXHRcdFx0XHRcdFx0Y3JlYXRlU3RvcmVzKCk7XG5cdFx0XHRcdFx0XHRnZXRUaW1lc3RhbXBzKCk7XG5cdFx0XHRcdFx0XHRvcGVuRXh0ZXJuYWwoKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGNyZWF0ZVN0b3JlcygpO1xuXHRcdFx0XHRcdGdldFRpbWVzdGFtcHMoKTtcblx0XHRcdFx0XHRvcGVuRXh0ZXJuYWwoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGdldCBhbGwgdGhlIHRpbWVzdGFtcHMgZm9yIGV4aXN0aW5nIGtleXNcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0VGltZXN0YW1wcygpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0dmFyIHRyYW5zID0gZGIudHJhbnNhY3Rpb24oWydzYXZlJ10sIHRyYW5zYWN0aW9uVHlwZS5SRUFEKSxcblx0XHRcdFx0XHRcdHN0b3JlID0gdHJhbnMub2JqZWN0U3RvcmUoJ3NhdmUnKSxcblx0XHRcdFx0XHRcdHJlcXVlc3QgPSBzdG9yZS5nZXRBbGwoKTtcblx0XHRcdFx0XHRcdHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0dmFyIGkgPSAwLCBhID0gZXZlbnQudGFyZ2V0LnJlc3VsdCwgbCA9IGEubGVuZ3RoO1xuXHRcdFx0XHRcdFx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRcdHRpbWVzdGFtcHNbYVtpXS5rZXldID0gYVtpXS50aW1lc3RhbXA7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gY3JlYXRlU3RvcmVzKCkge1xuXHRcdFx0XHRcdHZhciByZXF1ZXN0ID0gZGIuc2V0VmVyc2lvbihcIjEuMFwiKTtcblx0XHRcdFx0XHRyZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN0b3Jlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgc3QgPSBzdG9yZXNbaV07XG5cdFx0XHRcdFx0XHRcdGlmIChkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKHN0KSkgY29udGludWU7XG5cdFx0XHRcdFx0XHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKHN0LCB7IGtleVBhdGg6IFwia2V5XCIgfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZTogZnVuY3Rpb24gKGtleSwgdHlwZSwgZGF0YSkge1xuXHRcdFx0XHRpZiAoZGIgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBDcmFmdHkuc3RvcmFnZS5zYXZlKGtleSwgdHlwZSwgZGF0YSk7IH0sIDEpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBzdHIgPSBzZXJpYWxpemUoZGF0YSksIHQgPSB0cygpO1xuXHRcdFx0XHRpZiAodHlwZSA9PSAnc2F2ZScpXHRzYXZlRXh0ZXJuYWwoa2V5LCBzdHIsIHQpO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciB0cmFucyA9IGRiLnRyYW5zYWN0aW9uKFt0eXBlXSwgdHJhbnNhY3Rpb25UeXBlLlJFQURfV1JJVEUpLFxuXHRcdFx0XHRcdHN0b3JlID0gdHJhbnMub2JqZWN0U3RvcmUodHlwZSksXG5cdFx0XHRcdFx0cmVxdWVzdCA9IHN0b3JlLnB1dCh7XG5cdFx0XHRcdFx0XHRcImRhdGFcIjogc3RyLFxuXHRcdFx0XHRcdFx0XCJ0aW1lc3RhbXBcIjogdCxcblx0XHRcdFx0XHRcdFwia2V5XCI6IGtleVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0bG9hZDogZnVuY3Rpb24gKGtleSwgdHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKGRiID09IG51bGwpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnN0b3JhZ2UubG9hZChrZXksIHR5cGUsIGNhbGxiYWNrKTsgfSwgMSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIHRyYW5zID0gZGIudHJhbnNhY3Rpb24oW3R5cGVdLCB0cmFuc2FjdGlvblR5cGUuUkVBRCksXG5cdFx0XHRcdFx0c3RvcmUgPSB0cmFucy5vYmplY3RTdG9yZSh0eXBlKSxcblx0XHRcdFx0XHRyZXF1ZXN0ID0gc3RvcmUuZ2V0KGtleSk7XG5cdFx0XHRcdFx0cmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2sodW5zZXJpYWxpemUoZS50YXJnZXQucmVzdWx0LmRhdGEpKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0QWxsS2V5czogZnVuY3Rpb24gKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkYiA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IENyYWZ0eS5zdG9yYWdlLmdldEFsbGtleXModHlwZSwgY2FsbGJhY2spOyB9LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciB0cmFucyA9IGRiLnRyYW5zYWN0aW9uKFt0eXBlXSwgdHJhbnNhY3Rpb25UeXBlLlJFQUQpLFxuXHRcdFx0XHRcdHN0b3JlID0gdHJhbnMub2JqZWN0U3RvcmUodHlwZSksXG5cdFx0XHRcdFx0cmVxdWVzdCA9IHN0b3JlLmdldEN1cnNvcigpLFxuXHRcdFx0XHRcdHJlcyA9IFtdO1xuXHRcdFx0XHRcdHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdHZhciBjdXJzb3IgPSBlLnRhcmdldC5yZXN1bHQ7XG5cdFx0XHRcdFx0XHRpZiAoY3Vyc29yKSB7XG5cdFx0XHRcdFx0XHRcdHJlcy5wdXNoKGN1cnNvci5rZXkpO1xuXHRcdFx0XHRcdFx0XHQvLyAnY29udGludWUnIGlzIGEgcmVzZXJ2ZWQgd29yZCwgc28gLmNvbnRpbnVlKCkgY2F1c2VzIElFOCB0byBjb21wbGV0ZWx5IGJhcmsgd2l0aCBcIlNDUklQVDEwMTA6IEV4cGVjdGVkIGlkZW50aWZpZXJcIi5cblx0XHRcdFx0XHRcdFx0Y3Vyc29yWydjb250aW51ZSddKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2socmVzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0Y2hlY2s6IGZ1bmN0aW9uIChrZXksIHRpbWVzdGFtcCkge1xuXHRcdFx0XHRyZXR1cm4gKHRpbWVzdGFtcHNba2V5XSA+IHRpbWVzdGFtcCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRleHRlcm5hbDogZXh0ZXJuYWxcblx0XHR9O1xuXHR9XG5cdGVsc2UgaWYgKHR5cGVvZiBvcGVuRGF0YWJhc2UgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuOiBmdW5jdGlvbiAoZ2FtZU5hbWVfbikge1xuXHRcdFx0XHRnYW1lTmFtZSA9IGdhbWVOYW1lX247XG5cdFx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0XHRkYiA9IHtcblx0XHRcdFx0XHRcdHNhdmU6IG9wZW5EYXRhYmFzZShnYW1lTmFtZV9uICsgJ19zYXZlJywgJzEuMCcsICdTYXZlcyBnYW1lcyBmb3IgJyArIGdhbWVOYW1lX24sIDUgKiAxMDI0ICogMTAyNCksXG5cdFx0XHRcdFx0XHRjYWNoZTogb3BlbkRhdGFiYXNlKGdhbWVOYW1lX24gKyAnX2NhY2hlJywgJzEuMCcsICdDYWNoZSBmb3IgJyArIGdhbWVOYW1lX24sIDUgKiAxMDI0ICogMTAyNClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Ly8gYWxsb3dzIGZvciBhbnkgb3RoZXIgdHlwZXMgdGhhdCBjYW4gYmUgdGhvdWdodCBvZlxuXHRcdFx0XHRcdHZhciBhcmdzID0gYXJndW1lbnRzLCBpID0gMDtcblx0XHRcdFx0XHRhcmdzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0Zm9yICg7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGRiW2FyZ3NbaV1dID09ICd1bmRlZmluZWQnKVxuXHRcdFx0XHRcdFx0XHRkYlthcmdzW2ldXSA9IG9wZW5EYXRhYmFzZShnYW1lTmFtZSArICdfJyArIGFyZ3NbaV0sICcxLjAnLCB0eXBlLCA1ICogMTAyNCAqIDEwMjQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRiWydzYXZlJ10udHJhbnNhY3Rpb24oZnVuY3Rpb24gKHR4KSB7XG5cdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnU0VMRUNUIGtleSwgdGltZXN0YW1wIEZST00gZGF0YScsIFtdLCBmdW5jdGlvbiAodHgsIHJlcykge1xuXHRcdFx0XHRcdFx0dmFyIGkgPSAwLCBhID0gcmVzLnJvd3MsIGwgPSBhLmxlbmd0aDtcblx0XHRcdFx0XHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdHRpbWVzdGFtcHNbYS5pdGVtKGkpLmtleV0gPSBhLml0ZW0oaSkudGltZXN0YW1wO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cblx0XHRcdHNhdmU6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGRhdGEpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBkYlt0eXBlXSA9PSAndW5kZWZpbmVkJyAmJiBnYW1lTmFtZSAhPSAnJykge1xuXHRcdFx0XHRcdHRoaXMub3BlbihnYW1lTmFtZSwgdHlwZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgc3RyID0gc2VyaWFsaXplKGRhdGEpLCB0ID0gdHMoKTtcblx0XHRcdFx0aWYgKHR5cGUgPT0gJ3NhdmUnKVx0c2F2ZUV4dGVybmFsKGtleSwgc3RyLCB0KTtcblx0XHRcdFx0ZGJbdHlwZV0udHJhbnNhY3Rpb24oZnVuY3Rpb24gKHR4KSB7XG5cdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZGF0YSAoa2V5IHVuaXF1ZSwgdGV4dCwgdGltZXN0YW1wKScpO1xuXHRcdFx0XHRcdHR4LmV4ZWN1dGVTcWwoJ1NFTEVDVCAqIEZST00gZGF0YSBXSEVSRSBrZXkgPSA/JywgW2tleV0sIGZ1bmN0aW9uICh0eCwgcmVzdWx0cykge1xuXHRcdFx0XHRcdFx0aWYgKHJlc3VsdHMucm93cy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnVVBEQVRFIGRhdGEgU0VUIHRleHQgPSA/LCB0aW1lc3RhbXAgPSA/IFdIRVJFIGtleSA9ID8nLCBbc3RyLCB0LCBrZXldKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdJTlNFUlQgSU5UTyBkYXRhIFZBTFVFUyAoPywgPywgPyknLCBba2V5LCBzdHIsIHRdKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRsb2FkOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAoZGJbdHlwZV0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBDcmFmdHkuc3RvcmFnZS5sb2FkKGtleSwgdHlwZSwgY2FsbGJhY2spOyB9LCAxKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGJbdHlwZV0udHJhbnNhY3Rpb24oZnVuY3Rpb24gKHR4KSB7XG5cdFx0XHRcdFx0dHguZXhlY3V0ZVNxbCgnU0VMRUNUIHRleHQgRlJPTSBkYXRhIFdIRVJFIGtleSA9ID8nLCBba2V5XSwgZnVuY3Rpb24gKHR4LCByZXN1bHRzKSB7XG5cdFx0XHRcdFx0XHRpZiAocmVzdWx0cy5yb3dzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRyZXMgPSB1bnNlcmlhbGl6ZShyZXN1bHRzLnJvd3MuaXRlbSgwKS50ZXh0KTtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2socmVzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRBbGxLZXlzOiBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKGRiW3R5cGVdID09IG51bGwpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgQ3JhZnR5LnN0b3JhZ2UuZ2V0QWxsS2V5cyh0eXBlLCBjYWxsYmFjayk7IH0sIDEpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRkYlt0eXBlXS50cmFuc2FjdGlvbihmdW5jdGlvbiAodHgpIHtcblx0XHRcdFx0XHR0eC5leGVjdXRlU3FsKCdTRUxFQ1Qga2V5IEZST00gZGF0YScsIFtdLCBmdW5jdGlvbiAodHgsIHJlc3VsdHMpIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKHJlc3VsdHMucm93cyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblxuXHRcdFx0Y2hlY2s6IGZ1bmN0aW9uIChrZXksIHRpbWVzdGFtcCkge1xuXHRcdFx0XHRyZXR1cm4gKHRpbWVzdGFtcHNba2V5XSA+IHRpbWVzdGFtcCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRleHRlcm5hbDogZXh0ZXJuYWxcblx0XHR9O1xuXHR9XG5cdGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cubG9jYWxTdG9yYWdlID09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW46IGZ1bmN0aW9uIChnYW1lTmFtZV9uKSB7XG5cdFx0XHRcdGdhbWVOYW1lID0gZ2FtZU5hbWVfbjtcblx0XHRcdH0sXG5cblx0XHRcdHNhdmU6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGRhdGEpIHtcblx0XHRcdFx0dmFyIGsgPSBnYW1lTmFtZSArICcuJyArIHR5cGUgKyAnLicgKyBrZXksXG5cdFx0XHRcdFx0c3RyID0gc2VyaWFsaXplKGRhdGEpLFxuXHRcdFx0XHRcdHQgPSB0cygpO1xuXHRcdFx0XHRpZiAodHlwZSA9PSAnc2F2ZScpXHRzYXZlRXh0ZXJuYWwoa2V5LCBzdHIsIHQpO1xuXHRcdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlW2tdID0gc3RyO1xuXHRcdFx0XHRpZiAodHlwZSA9PSAnc2F2ZScpXG5cdFx0XHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZVtrICsgJy50cyddID0gdDtcblx0XHRcdH0sXG5cblx0XHRcdGxvYWQ6IGZ1bmN0aW9uIChrZXksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdHZhciBrID0gZ2FtZU5hbWUgKyAnLicgKyB0eXBlICsgJy4nICsga2V5LFxuXHRcdFx0XHRcdHN0ciA9IHdpbmRvdy5sb2NhbFN0b3JhZ2Vba107XG5cblx0XHRcdFx0Y2FsbGJhY2sodW5zZXJpYWxpemUoc3RyKSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRBbGxLZXlzOiBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0dmFyIHJlcyA9IHt9LCBvdXRwdXQgPSBbXSwgaGVhZGVyID0gZ2FtZU5hbWUgKyAnLicgKyB0eXBlO1xuXHRcdFx0XHRmb3IgKHZhciBpIGluIHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcblx0XHRcdFx0XHRpZiAoaS5pbmRleE9mKGhlYWRlcikgIT0gLTEpIHtcblx0XHRcdFx0XHRcdHZhciBrZXkgPSBpLnJlcGxhY2UoaGVhZGVyLCAnJykucmVwbGFjZSgnLnRzJywgJycpO1xuXHRcdFx0XHRcdFx0cmVzW2tleV0gPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKGkgaW4gcmVzKSB7XG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2sob3V0cHV0KTtcblx0XHRcdH0sXG5cblx0XHRcdGNoZWNrOiBmdW5jdGlvbiAoa2V5LCB0aW1lc3RhbXApIHtcblx0XHRcdFx0dmFyIHRzID0gd2luZG93LmxvY2FsU3RvcmFnZVtnYW1lTmFtZSArICcuc2F2ZS4nICsga2V5ICsgJy50cyddO1xuXG5cdFx0XHRcdHJldHVybiAocGFyc2VJbnQodGltZXN0YW1wKSA+IHBhcnNlSW50KHRzKSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRleHRlcm5hbDogZXh0ZXJuYWxcblx0XHR9O1xuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIGRlZmF1bHQgZmFsbGJhY2sgdG8gY29va2llc1xuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuOiBmdW5jdGlvbiAoZ2FtZU5hbWVfbikge1xuXHRcdFx0XHRnYW1lTmFtZSA9IGdhbWVOYW1lX247XG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlOiBmdW5jdGlvbiAoa2V5LCB0eXBlLCBkYXRhKSB7XG5cdFx0XHRcdC8vIGNvb2tpZXMgYXJlIHZlcnkgbGltaXRlZCBpbiBzcGFjZS4gd2UgY2FuIG9ubHkga2VlcCBzYXZlcyB0aGVyZVxuXHRcdFx0XHRpZiAodHlwZSAhPSAnc2F2ZScpIHJldHVybjtcblx0XHRcdFx0dmFyIHN0ciA9IHNlcmlhbGl6ZShkYXRhKSwgdCA9IHRzKCk7XG5cdFx0XHRcdGlmICh0eXBlID09ICdzYXZlJylcdHNhdmVFeHRlcm5hbChrZXksIHN0ciwgdCk7XG5cdFx0XHRcdGRvY3VtZW50LmNvb2tpZSA9IGdhbWVOYW1lICsgJ18nICsga2V5ICsgJz0nICsgc3RyICsgJzsgJyArIGdhbWVOYW1lICsgJ18nICsga2V5ICsgJ190cz0nICsgdCArICc7IGV4cGlyZXM9VGh1ciwgMzEgRGVjIDIwOTkgMjM6NTk6NTkgVVRDOyBwYXRoPS8nO1xuXHRcdFx0fSxcblxuXHRcdFx0bG9hZDogZnVuY3Rpb24gKGtleSwgdHlwZSwgY2FsbGJhY2spIHtcblx0XHRcdFx0aWYgKHR5cGUgIT0gJ3NhdmUnKSByZXR1cm47XG5cdFx0XHRcdHZhciByZWcgPSBuZXcgUmVnRXhwKGdhbWVOYW1lICsgJ18nICsga2V5ICsgJz1bXjtdKicpLFxuXHRcdFx0XHRcdHJlc3VsdCA9IHJlZy5leGVjKGRvY3VtZW50LmNvb2tpZSksXG5cdFx0XHRcdFx0ZGF0YSA9IHVuc2VyaWFsaXplKHJlc3VsdFswXS5yZXBsYWNlKGdhbWVOYW1lICsgJ18nICsga2V5ICsgJz0nLCAnJykpO1xuXG5cdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0fSxcblxuXHRcdFx0Z2V0QWxsS2V5czogZnVuY3Rpb24gKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmICh0eXBlICE9ICdzYXZlJykgcmV0dXJuO1xuXHRcdFx0XHR2YXIgcmVnID0gbmV3IFJlZ0V4cChnYW1lTmFtZSArICdfW15fPV0nLCAnZycpLFxuXHRcdFx0XHRcdG1hdGNoZXMgPSByZWcuZXhlYyhkb2N1bWVudC5jb29raWUpLFxuXHRcdFx0XHRcdGkgPSAwLCBsID0gbWF0Y2hlcy5sZW5ndGgsIHJlcyA9IHt9LCBvdXRwdXQgPSBbXTtcblx0XHRcdFx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHR2YXIga2V5ID0gbWF0Y2hlc1tpXS5yZXBsYWNlKGdhbWVOYW1lICsgJ18nLCAnJyk7XG5cdFx0XHRcdFx0cmVzW2tleV0gPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAoaSBpbiByZXMpIHtcblx0XHRcdFx0XHRvdXRwdXQucHVzaChpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhvdXRwdXQpO1xuXHRcdFx0fSxcblxuXHRcdFx0Y2hlY2s6IGZ1bmN0aW9uIChrZXksIHRpbWVzdGFtcCkge1xuXHRcdFx0XHR2YXIgaGVhZGVyID0gZ2FtZU5hbWUgKyAnXycgKyBrZXkgKyAnX3RzJyxcblx0XHRcdFx0XHRyZWcgPSBuZXcgUmVnRXhwKGhlYWRlciArICc9W147XScpLFxuXHRcdFx0XHRcdHJlc3VsdCA9IHJlZy5leGVjKGRvY3VtZW50LmNvb2tpZSksXG5cdFx0XHRcdFx0dHMgPSByZXN1bHRbMF0ucmVwbGFjZShoZWFkZXIgKyAnPScsICcnKTtcblxuXHRcdFx0XHRyZXR1cm4gKHBhcnNlSW50KHRpbWVzdGFtcCkgPiBwYXJzZUludCh0cykpO1xuXHRcdFx0fSxcblxuXHRcdFx0ZXh0ZXJuYWw6IGV4dGVybmFsXG5cdFx0fTtcblx0fVxuXHQvKiB0ZW1wbGF0ZVxuXHRyZXR1cm4ge1xuXHRcdG9wZW46IGZ1bmN0aW9uIChnYW1lTmFtZSkge1xuXHRcdH0sXG5cdFx0c2F2ZTogZnVuY3Rpb24gKGtleSwgdHlwZSwgZGF0YSkge1xuXHRcdH0sXG5cdFx0bG9hZDogZnVuY3Rpb24gKGtleSwgdHlwZSwgY2FsbGJhY2spIHtcblx0XHR9LFxuXHR9Ki9cbn0pKCk7XG4vKipAXG4qICNDcmFmdHkuc3VwcG9ydFxuKiBAY2F0ZWdvcnkgTWlzYywgQ29yZVxuKiBEZXRlcm1pbmVzIGZlYXR1cmUgc3VwcG9ydCBmb3Igd2hhdCBDcmFmdHkgY2FuIGRvLlxuKi9cblxuKGZ1bmN0aW9uIHRlc3RTdXBwb3J0KCkge1xuICAgIHZhciBzdXBwb3J0ID0gQ3JhZnR5LnN1cHBvcnQgPSB7fSxcbiAgICAgICAgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCksXG4gICAgICAgIG1hdGNoID0gLyh3ZWJraXQpWyBcXC9dKFtcXHcuXSspLy5leGVjKHVhKSB8fFxuICAgICAgICAgICAgICAgIC8obylwZXJhKD86Lip2ZXJzaW9uKT9bIFxcL10oW1xcdy5dKykvLmV4ZWModWEpIHx8XG4gICAgICAgICAgICAgICAgLyhtcylpZSAoW1xcdy5dKykvLmV4ZWModWEpIHx8XG4gICAgICAgICAgICAgICAgLyhtb3opaWxsYSg/Oi4qPyBydjooW1xcdy5dKykpPy8uZXhlYyh1YSkgfHwgW10sXG4gICAgICAgIG1vYmlsZSA9IC9pUGFkfGlQb2R8aVBob25lfEFuZHJvaWR8d2ViT1N8SUVNb2JpbGUvaS5leGVjKHVhKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkubW9iaWxlXG4gICAgKiBAY29tcCBDcmFmdHkuZGV2aWNlXG4gICAgKiBcbiAgICAqIERldGVybWluZXMgaWYgQ3JhZnR5IGlzIHJ1bm5pbmcgb24gbW9iaWxlIGRldmljZS5cbiAgICAqIFxuICAgICogSWYgQ3JhZnR5Lm1vYmlsZSBpcyBlcXVhbCB0cnVlIENyYWZ0eSBkb2VzIHNvbWUgdGhpbmdzIHVuZGVyIGhvb2Q6XG4gICAgKiB+fn5cbiAgICAqIC0gc2V0IHZpZXdwb3J0IG9uIG1heCBkZXZpY2Ugd2lkdGggYW5kIGhlaWdodFxuICAgICogLSBzZXQgQ3JhZnR5LnN0YWdlLmZ1bGxzY3JlZW4gb24gdHJ1ZVxuICAgICogLSBoaWRlIHdpbmRvdyBzY3JvbGxiYXJzXG4gICAgKiB+fn5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkudmlld3BvcnRcbiAgICAqL1xuICAgIGlmIChtb2JpbGUpIENyYWZ0eS5tb2JpbGUgPSBtb2JpbGVbMF07XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuc2V0dGVyXG4gICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICogSXMgYF9fZGVmaW5lU2V0dGVyX19gIHN1cHBvcnRlZD9cbiAgICAqL1xuICAgIHN1cHBvcnQuc2V0dGVyID0gKCdfX2RlZmluZVNldHRlcl9fJyBpbiB0aGlzICYmICdfX2RlZmluZUdldHRlcl9fJyBpbiB0aGlzKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5kZWZpbmVQcm9wZXJ0eVxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgIHN1cHBvcnRlZD9cbiAgICAqL1xuICAgIHN1cHBvcnQuZGVmaW5lUHJvcGVydHkgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoISdkZWZpbmVQcm9wZXJ0eScgaW4gT2JqZWN0KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRyeSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3gnLCB7fSk7IH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgcmV0dXJuIGZhbHNlIH07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pKCk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuYXVkaW9cbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBIVE1MNSBgQXVkaW9gIHN1cHBvcnRlZD9cbiAgICAqL1xuICAgIHN1cHBvcnQuYXVkaW8gPSAoJ0F1ZGlvJyBpbiB3aW5kb3cpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LnByZWZpeFxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIFJldHVybnMgdGhlIGJyb3dzZXIgc3BlY2lmaWMgcHJlZml4IChgTW96YCwgYE9gLCBgbXNgLCBgd2Via2l0YCkuXG4gICAgKi9cbiAgICBzdXBwb3J0LnByZWZpeCA9IChtYXRjaFsxXSB8fCBtYXRjaFswXSk7XG5cbiAgICAvL2Jyb3dzZXIgc3BlY2lmaWMgcXVpcmtzXG4gICAgaWYgKHN1cHBvcnQucHJlZml4ID09PSBcIm1velwiKSBzdXBwb3J0LnByZWZpeCA9IFwiTW96XCI7XG4gICAgaWYgKHN1cHBvcnQucHJlZml4ID09PSBcIm9cIikgc3VwcG9ydC5wcmVmaXggPSBcIk9cIjtcblxuICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5zdXBwb3J0LnZlcnNpb25OYW1lXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAgICAgKiBWZXJzaW9uIG9mIHRoZSBicm93c2VyXG4gICAgICAgICovXG4gICAgICAgIHN1cHBvcnQudmVyc2lvbk5hbWUgPSBtYXRjaFsyXTtcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5zdXBwb3J0LnZlcnNpb25cbiAgICAgICAgKiBAY29tcCBDcmFmdHkuc3VwcG9ydFxuICAgICAgICAqIFZlcnNpb24gbnVtYmVyIG9mIHRoZSBicm93c2VyIGFzIGFuIEludGVnZXIgKGZpcnN0IG51bWJlcilcbiAgICAgICAgKi9cbiAgICAgICAgc3VwcG9ydC52ZXJzaW9uID0gKyhtYXRjaFsyXS5zcGxpdChcIi5cIikpWzBdO1xuICAgIH1cblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5jYW52YXNcbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyB0aGUgYGNhbnZhc2AgZWxlbWVudCBzdXBwb3J0ZWQ/XG4gICAgKi9cbiAgICBzdXBwb3J0LmNhbnZhcyA9ICgnZ2V0Q29udGV4dCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSk7XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQud2ViZ2xcbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBXZWJHTCBzdXBwb3J0ZWQgb24gdGhlIGNhbnZhcyBlbGVtZW50P1xuICAgICovXG4gICAgaWYgKHN1cHBvcnQuY2FudmFzKSB7XG4gICAgICAgIHZhciBnbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGdsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKS5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIpO1xuICAgICAgICAgICAgZ2wudmlld3BvcnRXaWR0aCA9IHN1cHBvcnQuY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgZ2wudmlld3BvcnRIZWlnaHQgPSBzdXBwb3J0LmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgfVxuICAgICAgICBzdXBwb3J0LndlYmdsID0gISFnbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHN1cHBvcnQud2ViZ2wgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnN1cHBvcnQuY3NzM2R0cmFuc2Zvcm1cbiAgICAqIEBjb21wIENyYWZ0eS5zdXBwb3J0XG4gICAgKiBJcyBjc3MzRHRyYW5zZm9ybSBzdXBwb3J0ZWQgYnkgYnJvd3Nlci5cbiAgICAqL1xuICAgIHN1cHBvcnQuY3NzM2R0cmFuc2Zvcm0gPSAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikuc3R5bGVbXCJQZXJzcGVjdGl2ZVwiXSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikuc3R5bGVbc3VwcG9ydC5wcmVmaXggKyBcIlBlcnNwZWN0aXZlXCJdICE9PSBcInVuZGVmaW5lZFwiKTtcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuc3VwcG9ydC5kZXZpY2VvcmllbnRhdGlvblxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIGRldmljZW9yaWVudGF0aW9uIGV2ZW50IHN1cHBvcnRlZCBieSBicm93c2VyLlxuICAgICovXG4gICAgc3VwcG9ydC5kZXZpY2VvcmllbnRhdGlvbiA9ICh0eXBlb2Ygd2luZG93LkRldmljZU9yaWVudGF0aW9uRXZlbnQgIT09IFwidW5kZWZpbmVkXCIpIHx8ICh0eXBlb2Ygd2luZG93Lk9yaWVudGF0aW9uRXZlbnQgIT09IFwidW5kZWZpbmVkXCIpO1xuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5zdXBwb3J0LmRldmljZW1vdGlvblxuICAgICogQGNvbXAgQ3JhZnR5LnN1cHBvcnRcbiAgICAqIElzIGRldmljZW1vdGlvbiBldmVudCBzdXBwb3J0ZWQgYnkgYnJvd3Nlci5cbiAgICAqL1xuICAgIHN1cHBvcnQuZGV2aWNlbW90aW9uID0gKHR5cGVvZiB3aW5kb3cuRGV2aWNlTW90aW9uRXZlbnQgIT09IFwidW5kZWZpbmVkXCIpO1xuXG59KSgpO1xuQ3JhZnR5LmV4dGVuZCh7XG5cbiAgICB6ZXJvRmlsbDogZnVuY3Rpb24gKG51bWJlciwgd2lkdGgpIHtcbiAgICAgICAgd2lkdGggLT0gbnVtYmVyLnRvU3RyaW5nKCkubGVuZ3RoO1xuICAgICAgICBpZiAod2lkdGggPiAwKVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBcnJheSh3aWR0aCArICgvXFwuLy50ZXN0KG51bWJlcikgPyAyIDogMSkpLmpvaW4oJzAnKSArIG51bWJlcjtcbiAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnNwcml0ZVxuICAgICogQGNhdGVnb3J5IEdyYXBoaWNzXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuc3ByaXRlKFtOdW1iZXIgdGlsZV0sIFN0cmluZyB1cmwsIE9iamVjdCBtYXBbLCBOdW1iZXIgcGFkZGluZ1hbLCBOdW1iZXIgcGFkZGluZ1ldXSlcbiAgICAqIEBwYXJhbSB0aWxlIC0gVGlsZSBzaXplIG9mIHRoZSBzcHJpdGUgbWFwLCBkZWZhdWx0cyB0byAxXG4gICAgKiBAcGFyYW0gdXJsIC0gVVJMIG9mIHRoZSBzcHJpdGUgaW1hZ2VcbiAgICAqIEBwYXJhbSBtYXAgLSBPYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB3aGF0IGJlY29tZXMgYSBuZXcgY29tcG9uZW50IGFuZCB0aGUgdmFsdWUgcG9pbnRzIHRvIGEgcG9zaXRpb24gb24gdGhlIHNwcml0ZSBtYXBcbiAgICAqIEBwYXJhbSBwYWRkaW5nWCAtIEhvcml6b250YWwgc3BhY2UgaW4gYmV0d2VlbiB0aWxlcy4gRGVmYXVsdHMgdG8gMC5cbiAgICAqIEBwYXJhbSBwYWRkaW5nWSAtIFZlcnRpY2FsIHNwYWNlIGluIGJldHdlZW4gdGlsZXMuIERlZmF1bHRzIHRvIHBhZGRpbmdYLlxuICAgICogR2VuZXJhdGVzIGNvbXBvbmVudHMgYmFzZWQgb24gcG9zaXRpb25zIGluIGEgc3ByaXRlIGltYWdlIHRvIGJlIGFwcGxpZWQgdG8gZW50aXRpZXMuXG4gICAgKlxuICAgICogQWNjZXB0cyBhIHRpbGUgc2l6ZSwgVVJMIGFuZCBtYXAgZm9yIHRoZSBuYW1lIG9mIHRoZSBzcHJpdGUgYW5kIGl0J3MgcG9zaXRpb24uXG4gICAgKlxuICAgICogVGhlIHBvc2l0aW9uIG11c3QgYmUgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgcG9zaXRpb24gb2YgdGhlIHNwcml0ZSB3aGVyZSBpbmRleCBgMGBcbiAgICAqIGlzIHRoZSBgeGAgcG9zaXRpb24sIGAxYCBpcyB0aGUgYHlgIHBvc2l0aW9uIGFuZCBvcHRpb25hbGx5IGAyYCBpcyB0aGUgd2lkdGggYW5kIGAzYFxuICAgICogaXMgdGhlIGhlaWdodC4gSWYgdGhlIHNwcml0ZSBtYXAgaGFzIHBhZGRpbmcsIHBhc3MgdGhlIHZhbHVlcyBmb3IgdGhlIGB4YCBwYWRkaW5nXG4gICAgKiBvciBgeWAgcGFkZGluZy4gSWYgdGhleSBhcmUgdGhlIHNhbWUsIGp1c3QgYWRkIG9uZSB2YWx1ZS5cbiAgICAqXG4gICAgKiBJZiB0aGUgc3ByaXRlIGltYWdlIGhhcyBubyBjb25zaXN0ZW50IHRpbGUgc2l6ZSwgYDFgIG9yIG5vIGFyZ3VtZW50IG5lZWQgYmVcbiAgICAqIHBhc3NlZCBmb3IgdGlsZSBzaXplLlxuICAgICpcbiAgICAqIEVudGl0aWVzIHRoYXQgYWRkIHRoZSBnZW5lcmF0ZWQgY29tcG9uZW50cyBhcmUgYWxzbyBnaXZlbiBhIGNvbXBvbmVudCBjYWxsZWQgYFNwcml0ZWAuXG4gICAgKiBcbiAgICAqIEBzZWUgU3ByaXRlXG4gICAgKi9cbiAgICBzcHJpdGU6IGZ1bmN0aW9uICh0aWxlLCB0aWxlaCwgdXJsLCBtYXAsIHBhZGRpbmdYLCBwYWRkaW5nWSkge1xuICAgICAgICB2YXIgc3ByaXRlTmFtZSwgdGVtcCwgeCwgeSwgdywgaCwgaW1nO1xuXG4gICAgICAgIC8vaWYgbm8gdGlsZSB2YWx1ZSwgZGVmYXVsdCB0byAxXG4gICAgICAgIGlmICh0eXBlb2YgdGlsZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcGFkZGluZ1kgPSBwYWRkaW5nWDtcbiAgICAgICAgICAgIHBhZGRpbmdYID0gbWFwO1xuICAgICAgICAgICAgbWFwID0gdGlsZWg7XG4gICAgICAgICAgICB1cmwgPSB0aWxlO1xuICAgICAgICAgICAgdGlsZSA9IDE7XG4gICAgICAgICAgICB0aWxlaCA9IDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHRpbGVoID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHBhZGRpbmdZID0gcGFkZGluZ1g7XG4gICAgICAgICAgICBwYWRkaW5nWCA9IG1hcDtcbiAgICAgICAgICAgIG1hcCA9IHVybDtcbiAgICAgICAgICAgIHVybCA9IHRpbGVoO1xuICAgICAgICAgICAgdGlsZWggPSB0aWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9pZiBubyBwYWRkaW5nWSwgdXNlIHBhZGRpbmdYXG4gICAgICAgIGlmICghcGFkZGluZ1kgJiYgcGFkZGluZ1gpIHBhZGRpbmdZID0gcGFkZGluZ1g7XG4gICAgICAgIHBhZGRpbmdYID0gcGFyc2VJbnQocGFkZGluZ1ggfHwgMCwgMTApOyAvL2p1c3QgaW5jYXNlXG4gICAgICAgIHBhZGRpbmdZID0gcGFyc2VJbnQocGFkZGluZ1kgfHwgMCwgMTApO1xuXG4gICAgICAgIGltZyA9IENyYWZ0eS5hc3NldCh1cmwpO1xuICAgICAgICBpZiAoIWltZykge1xuICAgICAgICAgICAgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgICAgICAgICBpbWcuc3JjID0gdXJsO1xuICAgICAgICAgICAgQ3JhZnR5LmFzc2V0KHVybCwgaW1nKTtcbiAgICAgICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy9hbGwgY29tcG9uZW50cyB3aXRoIHRoaXMgaW1nIGFyZSBub3cgcmVhZHlcbiAgICAgICAgICAgICAgICBmb3IgKHNwcml0ZU5hbWUgaW4gbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eShzcHJpdGVOYW1lKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiQ2hhbmdlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChzcHJpdGVOYW1lIGluIG1hcCkge1xuICAgICAgICAgICAgaWYgKCFtYXAuaGFzT3duUHJvcGVydHkoc3ByaXRlTmFtZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB0ZW1wID0gbWFwW3Nwcml0ZU5hbWVdO1xuICAgICAgICAgICAgeCA9IHRlbXBbMF0gKiAodGlsZSArIHBhZGRpbmdYKTtcbiAgICAgICAgICAgIHkgPSB0ZW1wWzFdICogKHRpbGVoICsgcGFkZGluZ1kpO1xuICAgICAgICAgICAgdyA9IHRlbXBbMl0gKiB0aWxlIHx8IHRpbGU7XG4gICAgICAgICAgICBoID0gdGVtcFszXSAqIHRpbGVoIHx8IHRpbGVoO1xuXG4gICAgICAgICAgICAvL2dlbmVyYXRlcyBzcHJpdGUgY29tcG9uZW50cyBmb3IgZWFjaCB0aWxlIGluIHRoZSBtYXBcbiAgICAgICAgICAgIENyYWZ0eS5jKHNwcml0ZU5hbWUsIHtcbiAgICAgICAgICAgICAgICByZWFkeTogZmFsc2UsXG4gICAgICAgICAgICAgICAgX19jb29yZDogW3gsIHksIHcsIGhdLFxuXG4gICAgICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVpcmVzKFwiU3ByaXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdHJpbSA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2ltYWdlID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29vcmQgPSBbdGhpcy5fX2Nvb3JkWzBdLCB0aGlzLl9fY29vcmRbMV0sIHRoaXMuX19jb29yZFsyXSwgdGhpcy5fX2Nvb3JkWzNdXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RpbGUgPSB0aWxlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdGlsZWggPSB0aWxlaDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3BhZGRpbmcgPSBbcGFkZGluZ1gsIHBhZGRpbmdZXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWcgPSBpbWc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9kcmF3IG5vd1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pbWcuY29tcGxldGUgJiYgdGhpcy5pbWcud2lkdGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vc2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IHRvIHRoZSBzcHJpdGUgc2l6ZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLncgPSB0aGlzLl9fY29vcmRbMl07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaCA9IHRoaXMuX19jb29yZFszXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfZXZlbnRzOiB7fSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuYWRkRXZlbnRcbiAgICAqIEBjYXRlZ29yeSBFdmVudHMsIE1pc2NcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hZGRFdmVudChPYmplY3QgY3R4LCBIVE1MRWxlbWVudCBvYmosIFN0cmluZyBldmVudCwgRnVuY3Rpb24gY2FsbGJhY2spXG4gICAgKiBAcGFyYW0gY3R4IC0gQ29udGV4dCBvZiB0aGUgY2FsbGJhY2sgb3IgdGhlIHZhbHVlIG9mIGB0aGlzYFxuICAgICogQHBhcmFtIG9iaiAtIEVsZW1lbnQgdG8gYWRkIHRoZSBET00gZXZlbnQgdG9cbiAgICAqIEBwYXJhbSBldmVudCAtIEV2ZW50IG5hbWUgdG8gYmluZCB0b1xuICAgICogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWRcbiAgICAqIFxuICAgICogQWRkcyBET00gbGV2ZWwgMyBldmVudHMgdG8gZWxlbWVudHMuIFRoZSBhcmd1bWVudHMgaXQgYWNjZXB0cyBhcmUgdGhlIGNhbGxcbiAgICAqIGNvbnRleHQgKHRoZSB2YWx1ZSBvZiBgdGhpc2ApLCB0aGUgRE9NIGVsZW1lbnQgdG8gYXR0YWNoIHRoZSBldmVudCB0byxcbiAgICAqIHRoZSBldmVudCBuYW1lICh3aXRob3V0IGBvbmAgKGBjbGlja2AgcmF0aGVyIHRoYW4gYG9uY2xpY2tgKSkgYW5kXG4gICAgKiBmaW5hbGx5IHRoZSBjYWxsYmFjayBtZXRob2QuXG4gICAgKlxuICAgICogSWYgbm8gZWxlbWVudCBpcyBwYXNzZWQsIHRoZSBkZWZhdWx0IGVsZW1lbnQgd2lsbCBiZSBgd2luZG93LmRvY3VtZW50YC5cbiAgICAqXG4gICAgKiBDYWxsYmFja3MgYXJlIHBhc3NlZCB3aXRoIGV2ZW50IGRhdGEuXG4gICAgKiBcbiAgICAqIEBzZWUgQ3JhZnR5LnJlbW92ZUV2ZW50XG4gICAgKi9cbiAgICBhZGRFdmVudDogZnVuY3Rpb24gKGN0eCwgb2JqLCB0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0eXBlO1xuICAgICAgICAgICAgdHlwZSA9IG9iajtcbiAgICAgICAgICAgIG9iaiA9IHdpbmRvdy5kb2N1bWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vc2F2ZSBhbm9ueW1vdXMgZnVuY3Rpb24gdG8gYmUgYWJsZSB0byByZW1vdmVcbiAgICAgICAgdmFyIGFmbiA9IGZ1bmN0aW9uIChlKSB7IFxuICAgICAgICAgICAgICAgIHZhciBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7IFxuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKGN0eCwgZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlkID0gY3R4WzBdIHx8IFwiXCI7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHNbaWQgKyBvYmogKyB0eXBlICsgY2FsbGJhY2tdKSB0aGlzLl9ldmVudHNbaWQgKyBvYmogKyB0eXBlICsgY2FsbGJhY2tdID0gYWZuO1xuICAgICAgICBlbHNlIHJldHVybjtcblxuICAgICAgICBpZiAob2JqLmF0dGFjaEV2ZW50KSB7IC8vSUVcbiAgICAgICAgICAgIG9iai5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgYWZuKTtcbiAgICAgICAgfSBlbHNlIHsgLy9FdmVyeW9uZSBlbHNlXG4gICAgICAgICAgICBvYmouYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBhZm4sIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnJlbW92ZUV2ZW50XG4gICAgKiBAY2F0ZWdvcnkgRXZlbnRzLCBNaXNjXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkucmVtb3ZlRXZlbnQoT2JqZWN0IGN0eCwgSFRNTEVsZW1lbnQgb2JqLCBTdHJpbmcgZXZlbnQsIEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICogQHBhcmFtIGN0eCAtIENvbnRleHQgb2YgdGhlIGNhbGxiYWNrIG9yIHRoZSB2YWx1ZSBvZiBgdGhpc2BcbiAgICAqIEBwYXJhbSBvYmogLSBFbGVtZW50IHRoZSBldmVudCBpcyBvblxuICAgICogQHBhcmFtIGV2ZW50IC0gTmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSBjYWxsYmFjayAtIE1ldGhvZCBleGVjdXRlZCB3aGVuIHRyaWdnZXJlZFxuICAgICogXG4gICAgKiBSZW1vdmVzIGV2ZW50cyBhdHRhY2hlZCBieSBgQ3JhZnR5LmFkZEV2ZW50KClgLiBBbGwgcGFyYW1ldGVycyBtdXN0XG4gICAgKiBiZSB0aGUgc2FtZSB0aGF0IHdlcmUgdXNlZCB0byBhdHRhY2ggdGhlIGV2ZW50IGluY2x1ZGluZyBhIHJlZmVyZW5jZVxuICAgICogdG8gdGhlIGNhbGxiYWNrIG1ldGhvZC5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkuYWRkRXZlbnRcbiAgICAqL1xuICAgIHJlbW92ZUV2ZW50OiBmdW5jdGlvbiAoY3R4LCBvYmosIHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHR5cGU7XG4gICAgICAgICAgICB0eXBlID0gb2JqO1xuICAgICAgICAgICAgb2JqID0gd2luZG93LmRvY3VtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy9yZXRyaWV2ZSBhbm9ueW1vdXMgZnVuY3Rpb25cbiAgICAgICAgdmFyIGlkID0gY3R4WzBdIHx8IFwiXCIsXG4gICAgICAgICAgICBhZm4gPSB0aGlzLl9ldmVudHNbaWQgKyBvYmogKyB0eXBlICsgY2FsbGJhY2tdO1xuXG4gICAgICAgIGlmIChhZm4pIHtcbiAgICAgICAgICAgIGlmIChvYmouZGV0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBvYmouZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGFmbik7XG4gICAgICAgICAgICB9IGVsc2Ugb2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgYWZuLCBmYWxzZSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW2lkICsgb2JqICsgdHlwZSArIGNhbGxiYWNrXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmJhY2tncm91bmRcbiAgICAqIEBjYXRlZ29yeSBHcmFwaGljcywgU3RhZ2VcbiAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5iYWNrZ3JvdW5kKFN0cmluZyB2YWx1ZSlcbiAgICAqIEBwYXJhbSBzdHlsZSAtIE1vZGlmeSB0aGUgYmFja2dyb3VuZCB3aXRoIGEgY29sb3Igb3IgaW1hZ2VcbiAgICAqIFxuICAgICogVGhpcyBtZXRob2QgaXMgZXNzZW50aWFsbHkgYSBzaG9ydGN1dCBmb3IgYWRkaW5nIGEgYmFja2dyb3VuZFxuICAgICogc3R5bGUgdG8gdGhlIHN0YWdlIGVsZW1lbnQuXG4gICAgKi9cbiAgICBiYWNrZ3JvdW5kOiBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0uc3R5bGUuYmFja2dyb3VuZCA9IHN0eWxlO1xuICAgIH0sXG5cbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LnZpZXdwb3J0XG4gICAgKiBAY2F0ZWdvcnkgU3RhZ2VcbiAgICAqIFxuICAgICogVmlld3BvcnQgaXMgZXNzZW50aWFsbHkgYSAyRCBjYW1lcmEgbG9va2luZyBhdCB0aGUgc3RhZ2UuIENhbiBiZSBtb3ZlZCB3aGljaFxuICAgICogaW4gdHVybiB3aWxsIHJlYWN0IGp1c3QgbGlrZSBhIGNhbWVyYSBtb3ZpbmcgaW4gdGhhdCBkaXJlY3Rpb24uXG4gICAgKi9cbiAgICB2aWV3cG9ydDoge1xuICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LmNsYW1wVG9FbnRpdGllc1xuICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAqIFxuICAgICAgICAqIERlY2lkZXMgaWYgdGhlIHZpZXdwb3J0IGZ1bmN0aW9ucyBzaG91bGQgY2xhbXAgdG8gZ2FtZSBlbnRpdGllcy5cbiAgICAgICAgKiBXaGVuIHNldCB0byBgdHJ1ZWAgZnVuY3Rpb25zIHN1Y2ggYXMgQ3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vaygpIHdpbGwgbm90IGFsbG93IHlvdSB0byBtb3ZlIHRoZVxuICAgICAgICAqIHZpZXdwb3J0IG92ZXIgYXJlYXMgb2YgdGhlIGdhbWUgdGhhdCBoYXMgbm8gZW50aXRpZXMuXG4gICAgICAgICogRm9yIGRldmVsb3BtZW50IGl0IGNhbiBiZSB1c2VmdWwgdG8gc2V0IHRoaXMgdG8gZmFsc2UuXG4gICAgICAgICovXG4gICAgICAgIGNsYW1wVG9FbnRpdGllczogdHJ1ZSxcbiAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkudmlld3BvcnQueFxuICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAqIFxuICAgICAgICAqIFdpbGwgbW92ZSB0aGUgc3RhZ2UgYW5kIHRoZXJlZm9yZSBldmVyeSB2aXNpYmxlIGVudGl0eSBhbG9uZyB0aGUgYHhgXG4gICAgICAgICogYXhpcyBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uLlxuICAgICAgICAqXG4gICAgICAgICogV2hlbiB0aGlzIHZhbHVlIGlzIHNldCwgaXQgd2lsbCBzaGlmdCB0aGUgZW50aXJlIHN0YWdlLiBUaGlzIG1lYW5zIHRoYXQgZW50aXR5XG4gICAgICAgICogcG9zaXRpb25zIGFyZSBub3QgZXhhY3RseSB3aGVyZSB0aGV5IGFyZSBvbiBzY3JlZW4uIFRvIGdldCB0aGUgZXhhY3QgcG9zaXRpb24sXG4gICAgICAgICogc2ltcGx5IGFkZCBgQ3JhZnR5LnZpZXdwb3J0LnhgIG9udG8gdGhlIGVudGl0aWVzIGB4YCBwb3NpdGlvbi5cbiAgICAgICAgKi9cbiAgICAgICAgX3g6IDAsXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnlcbiAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgKiBcbiAgICAgICAgKiBXaWxsIG1vdmUgdGhlIHN0YWdlIGFuZCB0aGVyZWZvcmUgZXZlcnkgdmlzaWJsZSBlbnRpdHkgYWxvbmcgdGhlIGB5YFxuICAgICAgICAqIGF4aXMgaW4gdGhlIG9wcG9zaXRlIGRpcmVjdGlvbi5cbiAgICAgICAgKlxuICAgICAgICAqIFdoZW4gdGhpcyB2YWx1ZSBpcyBzZXQsIGl0IHdpbGwgc2hpZnQgdGhlIGVudGlyZSBzdGFnZS4gVGhpcyBtZWFucyB0aGF0IGVudGl0eVxuICAgICAgICAqIHBvc2l0aW9ucyBhcmUgbm90IGV4YWN0bHkgd2hlcmUgdGhleSBhcmUgb24gc2NyZWVuLiBUbyBnZXQgdGhlIGV4YWN0IHBvc2l0aW9uLFxuICAgICAgICAqIHNpbXBseSBhZGQgYENyYWZ0eS52aWV3cG9ydC55YCBvbnRvIHRoZSBlbnRpdGllcyBgeWAgcG9zaXRpb24uXG4gICAgICAgICovXG4gICAgICAgIF95OiAwLFxuXHRcdFxuXHRcdC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5ib3VuZHNcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqXG5cdFx0ICogQSByZWN0YW5nbGUgd2hpY2ggZGVmaW5lcyB0aGUgYm91bmRzIG9mIHRoZSB2aWV3cG9ydC4gSWYgdGhpcyBcblx0XHQgKiB2YXJpYWJsZSBpcyBudWxsLCBDcmFmdHkgdXNlcyB0aGUgYm91bmRpbmcgYm94IG9mIGFsbCB0aGUgaXRlbXNcblx0XHQgKiBvbiB0aGUgc3RhZ2UuXG4gICAgICAgICAqL1xuICAgICAgICBib3VuZHM6bnVsbCxcblxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQuc2Nyb2xsXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKFN0cmluZyBheGlzLCBOdW1iZXIgdilcbiAgICAgICAgICogQHBhcmFtIGF4aXMgLSAneCcgb3IgJ3knXG4gICAgICAgICAqIEBwYXJhbSB2IC0gVGhlIG5ldyBhYnNvbHV0ZSBwb3NpdGlvbiBvbiB0aGUgYXhpc1xuICAgICAgICAgKlxuICAgICAgICAgKiBXaWxsIG1vdmUgdGhlIHZpZXdwb3J0IHRvIHRoZSBwb3NpdGlvbiBnaXZlbiBvbiB0aGUgc3BlY2lmaWVkIGF4aXNcbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlIFxuICAgICAgICAgKiBXaWxsIG1vdmUgdGhlIGNhbWVyYSA1MDAgcGl4ZWxzIHJpZ2h0IG9mIGl0cyBpbml0aWFsIHBvc2l0aW9uLCBpbiBlZmZlY3RcbiAgICAgICAgICogc2hpZnRpbmcgZXZlcnl0aGluZyBpbiB0aGUgdmlld3BvcnQgNTAwIHBpeGVscyB0byB0aGUgbGVmdC5cbiAgICAgICAgICogXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiBDcmFmdHkudmlld3BvcnQuc2Nyb2xsKCdfeCcsIDUwMCk7XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgc2Nyb2xsOiBmdW5jdGlvbiAoYXhpcywgdikge1xuICAgICAgICAgICAgdiA9IE1hdGguZmxvb3Iodik7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gdiAtIHRoaXNbYXhpc10sIC8vY2hhbmdlIGluIGRpcmVjdGlvblxuICAgICAgICAgICAgICAgIGNvbnRleHQgPSBDcmFmdHkuY2FudmFzLmNvbnRleHQsXG4gICAgICAgICAgICAgICAgc3R5bGUgPSBDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGUsXG4gICAgICAgICAgICAgICAgY2FudmFzO1xuXG4gICAgICAgICAgICAvL3VwZGF0ZSB2aWV3cG9ydCBhbmQgRE9NIHNjcm9sbFxuICAgICAgICAgICAgdGhpc1theGlzXSA9IHY7XG5cdFx0XHRpZiAoY29udGV4dCkge1xuXHRcdFx0XHRpZiAoYXhpcyA9PSAnX3gnKSB7XG5cdFx0XHRcdFx0Y29udGV4dC50cmFuc2xhdGUoY2hhbmdlLCAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb250ZXh0LnRyYW5zbGF0ZSgwLCBjaGFuZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsKCk7XG5cdFx0XHR9XG4gICAgICAgICAgICBzdHlsZVtheGlzID09ICdfeCcgPyBcImxlZnRcIiA6IFwidG9wXCJdID0gdiArIFwicHhcIjtcbiAgICAgICAgfSxcblxuICAgICAgICByZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4geyBfeDogLXRoaXMuX3gsIF95OiAtdGhpcy5feSwgX3c6IHRoaXMud2lkdGgsIF9oOiB0aGlzLmhlaWdodCB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5wYW5cbiAgICAgICAgICogQGNvbXAgQ3JhZnR5LnZpZXdwb3J0XG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS52aWV3cG9ydC5wYW4oU3RyaW5nIGF4aXMsIE51bWJlciB2LCBOdW1iZXIgdGltZSlcbiAgICAgICAgICogQHBhcmFtIFN0cmluZyBheGlzIC0gJ3gnIG9yICd5Jy4gVGhlIGF4aXMgdG8gbW92ZSB0aGUgY2FtZXJhIG9uXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgdiAtIHRoZSBkaXN0YW5jZSB0byBtb3ZlIHRoZSBjYW1lcmEgYnlcbiAgICAgICAgICogQHBhcmFtIE51bWJlciB0aW1lIC0gVGhlIGR1cmF0aW9uIGluIGZyYW1lcyBmb3IgdGhlIGVudGlyZSBjYW1lcmEgbW92ZW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogUGFucyB0aGUgY2FtZXJhIGEgZ2l2ZW4gbnVtYmVyIG9mIHBpeGVscyBvdmVyIGEgZ2l2ZW4gbnVtYmVyIG9mIGZyYW1lc1xuICAgICAgICAgKi9cbiAgICAgICAgcGFuOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHR3ZWVucyA9IHt9LCBpLCBib3VuZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBlbnRlckZyYW1lKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgbCA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChpIGluIHR3ZWVucykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IHR3ZWVuc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3AucmVtVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3AuY3VycmVudCArPSBwcm9wLmRpZmY7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wLnJlbVRpbWUtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydFtpXSA9IE1hdGguZmxvb3IocHJvcC5jdXJyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGwrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0d2VlbnNbaV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGwpIENyYWZ0eS52aWV3cG9ydC5fY2xhbXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChheGlzLCB2LCB0aW1lKSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LmZvbGxvdygpO1xuICAgICAgICAgICAgICAgIGlmIChheGlzID09ICdyZXNldCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpIGluIHR3ZWVucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHdlZW5zW2ldLnJlbVRpbWUgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRpbWUgPT0gMCkgdGltZSA9IDE7XG4gICAgICAgICAgICAgICAgdHdlZW5zW2F4aXNdID0ge1xuICAgICAgICAgICAgICAgICAgICBkaWZmOiAtdiAvIHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQ6IENyYWZ0eS52aWV3cG9ydFtheGlzXSxcbiAgICAgICAgICAgICAgICAgICAgcmVtVGltZTogdGltZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKCFib3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYmluZChcIkVudGVyRnJhbWVcIiwgZW50ZXJGcmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCksXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LmZvbGxvd1xuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0LmZvbGxvdyhPYmplY3QgdGFyZ2V0LCBOdW1iZXIgb2Zmc2V0eCwgTnVtYmVyIG9mZnNldHkpXG4gICAgICAgICAqIEBwYXJhbSBPYmplY3QgdGFyZ2V0IC0gQW4gZW50aXR5IHdpdGggdGhlIDJEIGNvbXBvbmVudFxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIG9mZnNldHggLSBGb2xsb3cgdGFyZ2V0IHNob3VsZCBiZSBvZmZzZXR4IHBpeGVscyBhd2F5IGZyb20gY2VudGVyXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgb2Zmc2V0eSAtIFBvc2l0aXZlIHB1dHMgdGFyZ2V0IHRvIHRoZSByaWdodCBvZiBjZW50ZXJcbiAgICAgICAgICpcbiAgICAgICAgICogRm9sbG93cyBhIGdpdmVuIGVudGl0eSB3aXRoIHRoZSAyRCBjb21wb25lbnQuIElmIGZvbGxvd2luZyB0YXJnZXQgd2lsbCB0YWtlIGEgcG9ydGlvbiBvZlxuICAgICAgICAgKiB0aGUgdmlld3BvcnQgb3V0IG9mIGJvdW5kcyBvZiB0aGUgd29ybGQsIGZvbGxvd2luZyB3aWxsIHN0b3AgdW50aWwgdGhlIHRhcmdldCBtb3ZlcyBhd2F5LlxuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIHZhciBlbnQgPSBDcmFmdHkuZSgnMkQsIERPTScpLmF0dHIoe3c6IDEwMCwgaDogMTAwOn0pO1xuICAgICAgICAgKiBDcmFmdHkudmlld3BvcnQuZm9sbG93KGVudCwgMCwgMCk7XG4gICAgICAgICAqIH5+flxuICAgICAgICAgKi9cbiAgICAgICAgZm9sbG93OiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9sZFRhcmdldCwgb2ZmeCwgb2ZmeTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gY2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5zY3JvbGwoJ194JywgLSh0aGlzLnggKyAodGhpcy53IC8gMikgLSAoQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMikgLSBvZmZ4KSk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbCgnX3knLCAtKHRoaXMueSArICh0aGlzLmggLyAyKSAtIChDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMikgLSBvZmZ5KSk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0Ll9jbGFtcCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgb2Zmc2V0eCwgb2Zmc2V0eSkge1xuICAgICAgICAgICAgICAgIGlmIChvbGRUYXJnZXQpXG4gICAgICAgICAgICAgICAgICAgIG9sZFRhcmdldC51bmJpbmQoJ0NoYW5nZScsIGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgIXRhcmdldC5oYXMoJzJEJykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCdyZXNldCcpO1xuXG4gICAgICAgICAgICAgICAgb2xkVGFyZ2V0ID0gdGFyZ2V0O1xuICAgICAgICAgICAgICAgIG9mZnggPSAodHlwZW9mIG9mZnNldHggIT0gJ3VuZGVmaW5lZCcpID8gb2Zmc2V0eCA6IDA7XG4gICAgICAgICAgICAgICAgb2ZmeSA9ICh0eXBlb2Ygb2Zmc2V0eSAhPSAndW5kZWZpbmVkJykgPyBvZmZzZXR5IDogMDtcblxuICAgICAgICAgICAgICAgIHRhcmdldC5iaW5kKCdDaGFuZ2UnLCBjaGFuZ2UpO1xuICAgICAgICAgICAgICAgIGNoYW5nZS5jYWxsKHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCksXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LmNlbnRlck9uXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQuY2VudGVyT24oT2JqZWN0IHRhcmdldCwgTnVtYmVyIHRpbWUpXG4gICAgICAgICAqIEBwYXJhbSBPYmplY3QgdGFyZ2V0IC0gQW4gZW50aXR5IHdpdGggdGhlIDJEIGNvbXBvbmVudFxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIHRpbWUgLSBUaGUgbnVtYmVyIG9mIGZyYW1lcyB0byBwZXJmb3JtIHRoZSBjZW50ZXJpbmcgb3ZlclxuICAgICAgICAgKlxuICAgICAgICAgKiBDZW50ZXJzIHRoZSB2aWV3cG9ydCBvbiB0aGUgZ2l2ZW4gZW50aXR5XG4gICAgICAgICAqL1xuICAgICAgICBjZW50ZXJPbjogZnVuY3Rpb24gKHRhcmcsIHRpbWUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gdGFyZy54LFxuICAgICAgICAgICAgICAgICAgICB5ID0gdGFyZy55LFxuICAgICAgICAgICAgICAgICAgICBtaWRfeCA9IHRhcmcudyAvIDIsXG4gICAgICAgICAgICAgICAgICAgIG1pZF95ID0gdGFyZy5oIC8gMixcbiAgICAgICAgICAgICAgICAgICAgY2VudF94ID0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMixcbiAgICAgICAgICAgICAgICAgICAgY2VudF95ID0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIsXG4gICAgICAgICAgICAgICAgICAgIG5ld194ID0geCArIG1pZF94IC0gY2VudF94LFxuICAgICAgICAgICAgICAgICAgICBuZXdfeSA9IHkgKyBtaWRfeSAtIGNlbnRfeTtcblxuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigncmVzZXQnKTtcbiAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5wYW4oJ3gnLCBuZXdfeCwgdGltZSk7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCd5JywgbmV3X3ksIHRpbWUpO1xuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5fem9vbVxuICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAqIFxuICAgICAgICAqIFRoaXMgdmFsdWUga2VlcHMgYW4gYW1vdW50IG9mIHZpZXdwb3J0IHpvb20sIHJlcXVpcmVkIGZvciBjYWxjdWxhdGluZyBtb3VzZSBwb3NpdGlvbiBhdCBlbnRpdHlcbiAgICAgICAgKi9cbiAgICAgICAgX3pvb20gOiAxLFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC56b29tXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQuem9vbShOdW1iZXIgYW10LCBOdW1iZXIgY2VudF94LCBOdW1iZXIgY2VudF95LCBOdW1iZXIgdGltZSlcbiAgICAgICAgICogQHBhcmFtIE51bWJlciBhbXQgLSBhbW91bnQgdG8gem9vbSBpbiBvbiB0aGUgdGFyZ2V0IGJ5IChlZy4gMiwgNCwgMC41KVxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIGNlbnRfeCAtIHRoZSBjZW50ZXIgdG8gem9vbSBvblxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIGNlbnRfeSAtIHRoZSBjZW50ZXIgdG8gem9vbSBvblxuICAgICAgICAgKiBAcGFyYW0gTnVtYmVyIHRpbWUgLSB0aGUgZHVyYXRpb24gaW4gZnJhbWVzIG9mIHRoZSBlbnRpcmUgem9vbSBvcGVyYXRpb25cbiAgICAgICAgICpcbiAgICAgICAgICogWm9vbXMgdGhlIGNhbWVyYSBpbiBvbiBhIGdpdmVuIHBvaW50LiBhbXQgPiAxIHdpbGwgYnJpbmcgdGhlIGNhbWVyYSBjbG9zZXIgdG8gdGhlIHN1YmplY3RcbiAgICAgICAgICogYW10IDwgMSB3aWxsIGJyaW5nIGl0IGZhcnRoZXIgYXdheS4gYW10ID0gMCB3aWxsIGRvIG5vdGhpbmcuXG4gICAgICAgICAqIFpvb21pbmcgaXMgbXVsdGlwbGljYXRpdmUuIFRvIHJlc2V0IHRoZSB6b29tIGFtb3VudCwgcGFzcyAwLlxuICAgICAgICAgKi9cbiAgICAgICAgem9vbTogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB6b29tID0gMSxcbiAgICAgICAgICAgICAgICB6b29tX3RpY2sgPSAwLFxuICAgICAgICAgICAgICAgIGR1ciA9IDAsXG4gICAgICAgICAgICAgICAgcHJvcCA9IENyYWZ0eS5zdXBwb3J0LnByZWZpeCArIFwiVHJhbnNmb3JtXCIsXG4gICAgICAgICAgICAgICAgYm91bmQgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3QgPSB7fSxcbiAgICAgICAgICAgICAgICBwcmN0ID0ge307XG4gICAgICAgICAgICAvLyB3aGF0J3MgZ29pbmcgb246XG4gICAgICAgICAgICAvLyAxLiBHZXQgdGhlIG9yaWdpbmFsIHBvaW50IGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgc3RhZ2VcbiAgICAgICAgICAgIC8vIDIuIFNjYWxlIHRoZSBzdGFnZVxuICAgICAgICAgICAgLy8gMy4gR2V0IHRoZSBuZXcgc2l6ZSBvZiB0aGUgc3RhZ2VcbiAgICAgICAgICAgIC8vIDQuIEdldCB0aGUgYWJzb2x1dGUgcG9zaXRpb24gb2Ygb3VyIHBvaW50IHVzaW5nIHByZXZpb3VzIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIC8vIDQuIE9mZnNldCBpbm5lciBieSB0aGF0IG11Y2hcblxuICAgICAgICAgICAgZnVuY3Rpb24gZW50ZXJGcmFtZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZHVyID4gMCkge1xuXHRcdFx0XHRcdGlmIChpc0Zpbml0ZShDcmFmdHkudmlld3BvcnQuX3pvb20pKSB6b29tID0gQ3JhZnR5LnZpZXdwb3J0Ll96b29tO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGFjdC53aWR0aCAqIHpvb20sXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGFjdC5oZWlnaHQgKiB6b29tXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHpvb20gKz0gem9vbV90aWNrO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuX3pvb20gPSB6b29tO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3X3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYWN0LndpZHRoICogem9vbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogYWN0LmhlaWdodCAqIHpvb21cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBuZXdfcy53aWR0aCAtIG9sZC53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogbmV3X3MuaGVpZ2h0IC0gb2xkLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuaW5uZXIuc3R5bGVbcHJvcF0gPSAnc2NhbGUoJyArIHpvb20gKyAnLCcgKyB6b29tICsgJyknO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LmNhbnZhcy5fY2FudmFzKSB7XG5cdFx0XHRcdFx0XHR2YXIgY3pvb20gPSB6b29tIC8gKHpvb20gLSB6b29tX3RpY2spO1xuXHRcdFx0XHRcdFx0Q3JhZnR5LmNhbnZhcy5jb250ZXh0LnNjYWxlKGN6b29tLCBjem9vbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC54IC09IGRpZmYud2lkdGggKiBwcmN0LndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSAtPSBkaWZmLmhlaWdodCAqIHByY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBkdXItLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoYW10LCBjZW50X3gsIGNlbnRfeSwgdGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kcyB8fCBDcmFmdHkubWFwLmJvdW5kYXJpZXMoKSxcbiAgICAgICAgICAgICAgICAgICAgZmluYWxfem9vbSA9IGFtdCA/IHpvb20gKiBhbXQgOiAxO1xuXHRcdFx0XHRpZiAoIWFtdCkge1x0Ly8gd2UncmUgcmVzZXR0aW5nIHRvIGRlZmF1bHRzXG5cdFx0XHRcdFx0em9vbSA9IDE7XG5cdFx0XHRcdFx0dGhpcy5fem9vbSA9IDE7XG5cdFx0XHRcdH1cblxuICAgICAgICAgICAgICAgIGFjdC53aWR0aCA9IGJvdW5kcy5tYXgueCAtIGJvdW5kcy5taW4ueDtcbiAgICAgICAgICAgICAgICBhY3QuaGVpZ2h0ID0gYm91bmRzLm1heC55IC0gYm91bmRzLm1pbi55O1xuXG4gICAgICAgICAgICAgICAgcHJjdC53aWR0aCA9IGNlbnRfeCAvIGFjdC53aWR0aDtcbiAgICAgICAgICAgICAgICBwcmN0LmhlaWdodCA9IGNlbnRfeSAvIGFjdC5oZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodGltZSA9PSAwKSB0aW1lID0gMTtcbiAgICAgICAgICAgICAgICB6b29tX3RpY2sgPSAoZmluYWxfem9vbSAtIHpvb20pIC8gdGltZTtcbiAgICAgICAgICAgICAgICBkdXIgPSB0aW1lO1xuXG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnBhbigncmVzZXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5iaW5kKCdFbnRlckZyYW1lJywgZW50ZXJGcmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCksXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5zY2FsZVxuICAgICAgICAgKiBAY29tcCBDcmFmdHkudmlld3BvcnRcbiAgICAgICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnZpZXdwb3J0LnNjYWxlKE51bWJlciBhbXQpXG4gICAgICAgICAqIEBwYXJhbSBOdW1iZXIgYW10IC0gYW1vdW50IHRvIHpvb20vc2NhbGUgaW4gb24gdGhlIGVsZW1lbnQgb24gdGhlIHZpZXdwb3J0IGJ5IChlZy4gMiwgNCwgMC41KVxuICAgICAgICAgKlxuICAgICAgICAgKiBab29tcy9zY2FsZSB0aGUgY2FtZXJhLiBhbXQgPiAxIGluY3JlYXNlIGFsbCBlbnRpdGllcyBvbiBzdGFnZSBcbiAgICAgICAgICogYW10IDwgMSB3aWxsIHJlZHVjZSBhbGwgZW50aXRpZXMgb24gc3RhZ2UuIGFtdCA9IDAgd2lsbCByZXNldCB0aGUgem9vbS9zY2FsZS5cbiAgICAgICAgICogWm9vbWluZy9zY2FsaW5nIGlzIG11bHRpcGxpY2F0aXZlLiBUbyByZXNldCB0aGUgem9vbS9zY2FsZSBhbW91bnQsIHBhc3MgMC5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIENyYWZ0eS52aWV3cG9ydC5zY2FsZSgyKTsgLy90byBzZWUgZWZmZWN0IGFkZCBzb21lIGVudGl0aWVzIG9uIHN0YWdlLlxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIHNjYWxlOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHByb3AgPSBDcmFmdHkuc3VwcG9ydC5wcmVmaXggKyBcIlRyYW5zZm9ybVwiLFxuICAgICAgICAgICAgICAgIGFjdCA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhbXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHMgfHwgQ3JhZnR5Lm1hcC5ib3VuZGFyaWVzKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbmFsX3pvb20gPSBhbXQgPyB0aGlzLl96b29tICogYW10IDogMSxcblx0XHRcdFx0XHRjem9vbSA9IGZpbmFsX3pvb20gLyB0aGlzLl96b29tO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fem9vbSA9IGZpbmFsX3pvb207XG4gICAgICAgICAgICAgICAgYWN0LndpZHRoID0gYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54O1xuICAgICAgICAgICAgICAgIGFjdC5oZWlnaHQgPSBib3VuZHMubWF4LnkgLSBib3VuZHMubWluLnk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld19zID0ge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogYWN0LndpZHRoICogZmluYWxfem9vbSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBhY3QuaGVpZ2h0ICogZmluYWxfem9vbVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQucGFuKCdyZXNldCcpO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5pbm5lci5zdHlsZVsndHJhbnNmb3JtJ10gPSBcblx0XHRcdFx0Q3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlW3Byb3BdID0gJ3NjYWxlKCcgKyB0aGlzLl96b29tICsgJywnICsgdGhpcy5fem9vbSArICcpJztcblxuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkuY2FudmFzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmNhbnZhcy5jb250ZXh0LnNjYWxlKGN6b29tLCBjem9vbSk7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3QWxsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vQ3JhZnR5LnZpZXdwb3J0LndpZHRoID0gbmV3X3Mud2lkdGg7XG4gICAgICAgICAgICAgICAgLy9DcmFmdHkudmlld3BvcnQuaGVpZ2h0ID0gbmV3X3MuaGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpLFxuICAgICAgICAvKipAXG4gICAgICAgICAqICNDcmFmdHkudmlld3BvcnQubW91c2Vsb29rXG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQubW91c2Vsb29rKEJvb2xlYW4gYWN0aXZlKVxuICAgICAgICAgKiBAcGFyYW0gQm9vbGVhbiBhY3RpdmUgLSBBY3RpdmF0ZSBvciBkZWFjdGl2YXRlIG1vdXNlbG9va1xuICAgICAgICAgKlxuICAgICAgICAgKiBUb2dnbGUgbW91c2Vsb29rIG9uIHRoZSBjdXJyZW50IHZpZXdwb3J0LlxuICAgICAgICAgKiBTaW1wbHkgY2FsbCB0aGlzIGZ1bmN0aW9uIGFuZCB0aGUgdXNlciB3aWxsIGJlIGFibGUgdG9cbiAgICAgICAgICogZHJhZyB0aGUgdmlld3BvcnQgYXJvdW5kLlxuICAgICAgICAgKi9cbiAgICAgICAgbW91c2Vsb29rOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFjdGl2ZSA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRyYWdnaW5nID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbGFzdE1vdXNlID0ge31cbiAgICAgICAgICAgIG9sZCA9IHt9O1xuXG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAob3AsIGFyZykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3AgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZSA9IG9wO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkubW91c2VPYmpzKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkubW91c2VPYmpzID0gTWF0aC5tYXgoMCwgQ3JhZnR5Lm1vdXNlT2JqcyAtIDEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFhY3RpdmUpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vdmUnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdkcmFnJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogYXJnLmNsaWVudFggLSBsYXN0TW91c2UueCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBhcmcuY2xpZW50WSAtIGxhc3RNb3VzZS55XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCArPSBkaWZmLng7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueSArPSBkaWZmLnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuX2NsYW1wKCk7IFxuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0TW91c2UueCA9IGFyZy5jbGllbnRYO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdE1vdXNlLnkgPSBhcmcuY2xpZW50WTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdG9wJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSgpLFxuICAgICAgICBfY2xhbXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNsYW1wcyB0aGUgdmlld3BvcnQgdG8gdGhlIHZpZXdhYmxlIGFyZWFcbiAgICAgICAgICAgIC8vIHVuZGVyIG5vIGNpcmN1bXN0YW5jZXMgc2hvdWxkIHRoZSB2aWV3cG9ydCBzZWUgc29tZXRoaW5nIG91dHNpZGUgdGhlIGJvdW5kYXJ5IG9mIHRoZSAnd29ybGQnXG4gICAgICAgICAgICBpZiAoIXRoaXMuY2xhbXBUb0VudGl0aWVzKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgYm91bmQgPSB0aGlzLmJvdW5kcyB8fCBDcmFmdHkubWFwLmJvdW5kYXJpZXMoKTtcblx0XHRcdGJvdW5kLm1heC54ICo9IHRoaXMuX3pvb207XG5cdFx0XHRib3VuZC5taW4ueCAqPSB0aGlzLl96b29tO1xuXHRcdFx0Ym91bmQubWF4LnkgKj0gdGhpcy5fem9vbTtcblx0XHRcdGJvdW5kLm1pbi55ICo9IHRoaXMuX3pvb207XG4gICAgICAgICAgICBpZiAoYm91bmQubWF4LnggLSBib3VuZC5taW4ueCA+IENyYWZ0eS52aWV3cG9ydC53aWR0aCkge1xuICAgICAgICAgICAgICAgIGJvdW5kLm1heC54IC09IENyYWZ0eS52aWV3cG9ydC53aWR0aDtcblxuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkudmlld3BvcnQueCA8IC1ib3VuZC5tYXgueCkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCA9IC1ib3VuZC5tYXgueDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoQ3JhZnR5LnZpZXdwb3J0LnggPiAtYm91bmQubWluLngpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggPSAtYm91bmQubWluLng7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnggPSAtMSAqIChib3VuZC5taW4ueCArIChib3VuZC5tYXgueCAtIGJvdW5kLm1pbi54KSAvIDIgLSBDcmFmdHkudmlld3BvcnQud2lkdGggLyAyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChib3VuZC5tYXgueSAtIGJvdW5kLm1pbi55ID4gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCkge1xuICAgICAgICAgICAgICAgIGJvdW5kLm1heC55IC09IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5LnZpZXdwb3J0LnkgPCAtYm91bmQubWF4LnkpIHtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgPSAtYm91bmQubWF4Lnk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKENyYWZ0eS52aWV3cG9ydC55ID4gLWJvdW5kLm1pbi55KSB7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ID0gLWJvdW5kLm1pbi55O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC55ID0gLTEgKiAoYm91bmQubWluLnkgKyAoYm91bmQubWF4LnkgLSBib3VuZC5taW4ueSkgLyAyIC0gQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS52aWV3cG9ydC5pbml0XG4gICAgICAgICAqIEBjb21wIENyYWZ0eS52aWV3cG9ydFxuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkudmlld3BvcnQuaW5pdChbTnVtYmVyIHdpZHRoLCBOdW1iZXIgaGVpZ2h0XSlcbiAgICAgICAgICogQHBhcmFtIHdpZHRoIC0gV2lkdGggb2YgdGhlIHZpZXdwb3J0XG4gICAgICAgICAqIEBwYXJhbSBoZWlnaHQgLSBIZWlnaHQgb2YgdGhlIHZpZXdwb3J0XG4gICAgICAgICAqXG4gICAgICAgICAqIEluaXRpYWxpemUgdGhlIHZpZXdwb3J0LiBJZiB0aGUgYXJndW1lbnRzICd3aWR0aCcgb3IgJ2hlaWdodCcgYXJlIG1pc3NpbmcsIG9yIENyYWZ0eS5tb2JpbGUgaXMgdHJ1ZSwgdXNlIENyYWZ0eS5ET00ud2luZG93LndpZHRoIGFuZCBDcmFmdHkuRE9NLndpbmRvdy5oZWlnaHQgKGZ1bGwgc2NyZWVuIG1vZGVsKS5cbiAgICAgICAgICogQ3JlYXRlIGEgZGl2IHdpdGggaWQgYGNyLXN0YWdlYCwgaWYgdGhlcmUgaXMgbm90IGFscmVhZHkgYW4gSFRNTEVsZW1lbnQgd2l0aCBpZCBgY3Itc3RhZ2VgIChieSBgQ3JhZnR5LnZpZXdwb3J0LmluaXRgKS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHNlZSBDcmFmdHkuZGV2aWNlLCBDcmFmdHkuRE9NLCBDcmFmdHkuc3RhZ2VcbiAgICAgICAgICovXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICh3LCBoKSB7XG4gICAgICAgICAgICBDcmFmdHkuRE9NLndpbmRvdy5pbml0KCk7XG5cbiAgICAgICAgICAgIC8vZnVsbHNjcmVlbiBpZiBtb2JpbGUgb3Igbm90IHNwZWNpZmllZFxuICAgICAgICAgICAgdGhpcy53aWR0aCA9ICghdyB8fCBDcmFmdHkubW9iaWxlKSA/IENyYWZ0eS5ET00ud2luZG93LndpZHRoIDogdztcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gKCFoIHx8IENyYWZ0eS5tb2JpbGUpID8gQ3JhZnR5LkRPTS53aW5kb3cuaGVpZ2h0IDogaDtcblxuICAgICAgICAgICAgLy9jaGVjayBpZiBzdGFnZSBleGlzdHNcbiAgICAgICAgICAgIHZhciBjcnN0YWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjci1zdGFnZVwiKTtcblxuICAgICAgICAgICAgLyoqQFxuICAgICAgICAgICAgICogI0NyYWZ0eS5zdGFnZVxuICAgICAgICAgICAgICogQGNhdGVnb3J5IENvcmVcbiAgICAgICAgICAgICAqIFRoZSBzdGFnZSB3aGVyZSBhbGwgdGhlIERPTSBlbnRpdGllcyB3aWxsIGJlIHBsYWNlZC5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipAXG4gICAgICAgICAgICAgKiAjQ3JhZnR5LnN0YWdlLmVsZW1cbiAgICAgICAgICAgICAqIEBjb21wIENyYWZ0eS5zdGFnZVxuICAgICAgICAgICAgICogVGhlIGAjY3Itc3RhZ2VgIGRpdiBlbGVtZW50LlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKkBcbiAgICAgICAgICAgICAqICNDcmFmdHkuc3RhZ2UuaW5uZXJcbiAgICAgICAgICAgICAqIEBjb21wIENyYWZ0eS5zdGFnZVxuICAgICAgICAgICAgICogYENyYWZ0eS5zdGFnZS5pbm5lcmAgaXMgYSBkaXYgaW5zaWRlIHRoZSBgI2NyLXN0YWdlYCBkaXYgdGhhdCBob2xkcyBhbGwgRE9NIGVudGl0aWVzLlxuICAgICAgICAgICAgICogSWYgeW91IHVzZSBjYW52YXMsIGEgYGNhbnZhc2AgZWxlbWVudCBpcyBjcmVhdGVkIGF0IHRoZSBzYW1lIGxldmVsIGluIHRoZSBkb21cbiAgICAgICAgICAgICAqIGFzIHRoZSB0aGUgYENyYWZ0eS5zdGFnZS5pbm5lcmAgZGl2LiBTbyB0aGUgaGllcmFyY2h5IGluIHRoZSBET00gaXNcbiAgICAgICAgICAgICAqIFxuICAgICAgICAgICAgICogYENyYWZ0eS5zdGFnZS5lbGVtYFxuICAgICAgICAgICAgICogPCEtLSBub3Qgc3VyZSBob3cgdG8gZG8gaW5kZW50YXRpb24gaW4gdGhlIGRvY3VtZW50LS0+XG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogICAgIC0gYENyYWZ0eS5zdGFnZS5pbm5lcmAgKGEgZGl2IEhUTUxFbGVtZW50KVxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqICAgICAtIGBDcmFmdHkuY2FudmFzLl9jYW52YXNgIChhIGNhbnZhcyBIVE1MRWxlbWVudCkgXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLy9jcmVhdGUgc3RhZ2UgZGl2IHRvIGNvbnRhaW4gZXZlcnl0aGluZ1xuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlID0ge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgICAgICBmdWxsc2NyZWVuOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbGVtOiAoY3JzdGFnZSA/IGNyc3RhZ2UgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpKSxcbiAgICAgICAgICAgICAgICBpbm5lcjogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy9mdWxsc2NyZWVuLCBzdG9wIHNjcm9sbGJhcnNcbiAgICAgICAgICAgIGlmICgoIXcgJiYgIWgpIHx8IENyYWZ0eS5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZnVsbHNjcmVlbiA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csIFwicmVzaXplXCIsIENyYWZ0eS52aWV3cG9ydC5yZWxvYWQpO1xuXG4gICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCBcImJsdXJcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChDcmFmdHkuc2V0dGluZ3MuZ2V0KFwiYXV0b1BhdXNlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFDcmFmdHkuX3BhdXNlZCkgQ3JhZnR5LnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgd2luZG93LCBcImZvY3VzXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoQ3JhZnR5Ll9wYXVzZWQgJiYgQ3JhZnR5LnNldHRpbmdzLmdldChcImF1dG9QYXVzZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy9tYWtlIHRoZSBzdGFnZSB1bnNlbGVjdGFibGVcbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlcihcInN0YWdlU2VsZWN0YWJsZVwiLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLm9uc2VsZWN0c3RhcnQgPSB2ID8gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfSA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5KFwic3RhZ2VTZWxlY3RhYmxlXCIsIGZhbHNlKTtcblxuICAgICAgICAgICAgLy9tYWtlIHRoZSBzdGFnZSBoYXZlIG5vIGNvbnRleHQgbWVudVxuICAgICAgICAgICAgQ3JhZnR5LnNldHRpbmdzLnJlZ2lzdGVyKFwic3RhZ2VDb250ZXh0TWVudVwiLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLm9uY29udGV4dG1lbnUgPSB2ID8gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfSA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5KFwic3RhZ2VDb250ZXh0TWVudVwiLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIENyYWZ0eS5zZXR0aW5ncy5yZWdpc3RlcihcImF1dG9QYXVzZVwiLCBmdW5jdGlvbiAoKXsgfSk7XG4gICAgICAgICAgICBDcmFmdHkuc2V0dGluZ3MubW9kaWZ5KFwiYXV0b1BhdXNlXCIsIGZhbHNlKTtcblxuICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGJvZHkgYW5kIGdpdmUgaXQgYW4gSUQgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCFjcnN0YWdlKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChDcmFmdHkuc3RhZ2UuZWxlbSk7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmVsZW0uaWQgPSBcImNyLXN0YWdlXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVtID0gQ3JhZnR5LnN0YWdlLmVsZW0uc3R5bGUsXG4gICAgICAgICAgICAgICAgb2Zmc2V0O1xuXG4gICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5hcHBlbmRDaGlsZChDcmFmdHkuc3RhZ2UuaW5uZXIpO1xuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLmlubmVyLnN0eWxlLnpJbmRleCA9IFwiMVwiO1xuXG4gICAgICAgICAgICAvL2NzcyBzdHlsZVxuICAgICAgICAgICAgZWxlbS53aWR0aCA9IHRoaXMud2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICBlbGVtLmhlaWdodCA9IHRoaXMuaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgZWxlbS5vdmVyZmxvdyA9IFwiaGlkZGVuXCI7XG5cbiAgICAgICAgICAgIGlmIChDcmFmdHkubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgICAgICAgICBlbGVtLmxlZnQgPSBcIjBweFwiO1xuICAgICAgICAgICAgICAgIGVsZW0udG9wID0gXCIwcHhcIjtcblxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBkZWZhdWx0IGdyYXkgaGlnaGxpZ2h0aW5nIGFmdGVyIHRvdWNoXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBlbGVtLndlYmtpdFRhcEhpZ2hsaWdodENvbG9yICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLndlYmtpdFRhcEhpZ2hsaWdodENvbG9yID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1ldGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibWV0YVwiKSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiSEVBRFwiKVswXTtcblxuICAgICAgICAgICAgICAgIC8vc3RvcCBtb2JpbGUgem9vbWluZyBhbmQgc2Nyb2xsaW5nXG4gICAgICAgICAgICAgICAgbWV0YS5zZXRBdHRyaWJ1dGUoXCJuYW1lXCIsIFwidmlld3BvcnRcIik7XG4gICAgICAgICAgICAgICAgbWV0YS5zZXRBdHRyaWJ1dGUoXCJjb250ZW50XCIsIFwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEsIG1heGltdW0tc2NhbGU9MSwgdXNlci1zY2FsYWJsZT1ub1wiKTtcbiAgICAgICAgICAgICAgICBoZWFkLmFwcGVuZENoaWxkKG1ldGEpO1xuXG4gICAgICAgICAgICAgICAgLy9oaWRlIHRoZSBhZGRyZXNzIGJhclxuICAgICAgICAgICAgICAgIG1ldGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibWV0YVwiKTtcbiAgICAgICAgICAgICAgICBtZXRhLnNldEF0dHJpYnV0ZShcIm5hbWVcIiwgXCJhcHBsZS1tb2JpbGUtd2ViLWFwcC1jYXBhYmxlXCIpO1xuICAgICAgICAgICAgICAgIG1ldGEuc2V0QXR0cmlidXRlKFwiY29udGVudFwiLCBcInllc1wiKTtcbiAgICAgICAgICAgICAgICBoZWFkLmFwcGVuZENoaWxkKG1ldGEpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyB3aW5kb3cuc2Nyb2xsVG8oMCwgMSk7IH0sIDApO1xuXG4gICAgICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnggPSAwO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS55ID0gMDtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICAgICAgICAgIC8vZmluZCBvdXQgdGhlIG9mZnNldCBwb3NpdGlvbiBvZiB0aGUgc3RhZ2VcbiAgICAgICAgICAgICAgICBvZmZzZXQgPSBDcmFmdHkuRE9NLmlubmVyKENyYWZ0eS5zdGFnZS5lbGVtKTtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UueCA9IG9mZnNldC54O1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS55ID0gb2Zmc2V0Lnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChDcmFmdHkuc3VwcG9ydC5zZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAvL2RlZmluZSBnZXR0ZXJzIGFuZCBzZXR0ZXJzIHRvIHNjcm9sbCB0aGUgdmlld3BvcnRcbiAgICAgICAgICAgICAgICB0aGlzLl9fZGVmaW5lU2V0dGVyX18oJ3gnLCBmdW5jdGlvbiAodikgeyB0aGlzLnNjcm9sbCgnX3gnLCB2KTsgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZVNldHRlcl9fKCd5JywgZnVuY3Rpb24gKHYpIHsgdGhpcy5zY3JvbGwoJ195Jywgdik7IH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX19kZWZpbmVHZXR0ZXJfXygneCcsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3g7IH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX19kZWZpbmVHZXR0ZXJfXygneScsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3k7IH0pO1xuICAgICAgICAgICAgICAgIC8vSUU5XG4gICAgICAgICAgICB9IGVsc2UgaWYgKENyYWZ0eS5zdXBwb3J0LmRlZmluZVByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd4JywgeyBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuc2Nyb2xsKCdfeCcsIHYpOyB9LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3g7IH0gfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd5JywgeyBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuc2Nyb2xsKCdfeScsIHYpOyB9LCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3k7IH0gfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIGVtcHR5IGVudGl0eSB3YWl0aW5nIGZvciBlbnRlcmZyYW1lXG4gICAgICAgICAgICAgICAgdGhpcy54ID0gdGhpcy5feDtcbiAgICAgICAgICAgICAgICB0aGlzLnkgPSB0aGlzLl95O1xuICAgICAgICAgICAgICAgIENyYWZ0eS5lKFwidmlld3BvcnRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5LnZpZXdwb3J0LnJlbG9hZFxuICAgICAgICAgKiBAY29tcCBDcmFmdHkuc3RhZ2VcbiAgICAgICAgICogXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyBDcmFmdHkudmlld3BvcnQucmVsb2FkKClcbiAgICAgICAgICogXG4gICAgICAgICAqIFJlY2FsY3VsYXRlIGFuZCByZWxvYWQgc3RhZ2Ugd2lkdGgsIGhlaWdodCBhbmQgcG9zaXRpb24uXG4gICAgICAgICAqIFVzZWZ1bCB3aGVuIGJyb3dzZXIgcmV0dXJuIHdyb25nIHJlc3VsdHMgb24gaW5pdCAobGlrZSBzYWZhcmkgb24gSXBhZDIpLlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIHJlbG9hZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIENyYWZ0eS5ET00ud2luZG93LmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3ID0gQ3JhZnR5LkRPTS53aW5kb3cud2lkdGgsXG4gICAgICAgICAgICAgICAgaCA9IENyYWZ0eS5ET00ud2luZG93LmhlaWdodCxcbiAgICAgICAgICAgICAgICBvZmZzZXQ7XG5cblxuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdGFnZS5mdWxsc2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53aWR0aCA9IHc7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQgPSBoO1xuICAgICAgICAgICAgICAgIENyYWZ0eS5zdGFnZS5lbGVtLnN0eWxlLndpZHRoID0gdyArIFwicHhcIjtcbiAgICAgICAgICAgICAgICBDcmFmdHkuc3RhZ2UuZWxlbS5zdHlsZS5oZWlnaHQgPSBoICsgXCJweFwiO1xuXG4gICAgICAgICAgICAgICAgaWYgKENyYWZ0eS5jYW52YXMuX2NhbnZhcykge1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuY2FudmFzLl9jYW52YXMud2lkdGggPSB3O1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuY2FudmFzLl9jYW52YXMuaGVpZ2h0ID0gaDtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdBbGwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9mZnNldCA9IENyYWZ0eS5ET00uaW5uZXIoQ3JhZnR5LnN0YWdlLmVsZW0pO1xuICAgICAgICAgICAgQ3JhZnR5LnN0YWdlLnggPSBvZmZzZXQueDtcbiAgICAgICAgICAgIENyYWZ0eS5zdGFnZS55ID0gb2Zmc2V0Lnk7XG4gICAgICAgIH0sXG5cdFx0XG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkudmlld3BvcnQucmVzZXRcblx0XHQgKiBAY29tcCBDcmFmdHkuc3RhZ2Vcblx0XHQgKlxuXHRcdCAqIEBzaWduIHB1YmxpYyBDcmFmdHkudmlld3BvcnQucmVzZXQoKVxuXHRcdCAqXG5cdFx0ICogUmVzZXRzIHRoZSB2aWV3cG9ydCB0byBzdGFydGluZyB2YWx1ZXNcblx0XHQgKiBDYWxsZWQgd2hlbiBzY2VuZSgpIGlzIHJ1bi5cblx0XHQgKi9cblx0XHRyZXNldDogZnVuY3Rpb24gKCkge1xuXHRcdFx0Q3JhZnR5LnZpZXdwb3J0LnBhbigncmVzZXQnKTtcblx0XHRcdENyYWZ0eS52aWV3cG9ydC5mb2xsb3coKTtcblx0XHRcdENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soJ3N0b3AnKTtcblx0XHRcdENyYWZ0eS52aWV3cG9ydC5zY2FsZSgpO1xuXHRcdH1cbiAgICB9LFxuXG4gICAgLyoqQFxuICAgICogI0NyYWZ0eS5rZXlzXG4gICAgKiBAY2F0ZWdvcnkgSW5wdXRcbiAgICAqIE9iamVjdCBvZiBrZXkgbmFtZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGtleSBjb2RlLlxuICAgICogXG4gICAgKiB+fn5cbiAgICAqIEJBQ0tTUEFDRTogOCxcbiAgICAqIFRBQjogOSxcbiAgICAqIEVOVEVSOiAxMyxcbiAgICAqIFBBVVNFOiAxOSxcbiAgICAqIENBUFM6IDIwLFxuICAgICogRVNDOiAyNyxcbiAgICAqIFNQQUNFOiAzMixcbiAgICAqIFBBR0VfVVA6IDMzLFxuICAgICogUEFHRV9ET1dOOiAzNCxcbiAgICAqIEVORDogMzUsXG4gICAgKiBIT01FOiAzNixcbiAgICAqIExFRlRfQVJST1c6IDM3LFxuICAgICogVVBfQVJST1c6IDM4LFxuICAgICogUklHSFRfQVJST1c6IDM5LFxuICAgICogRE9XTl9BUlJPVzogNDAsXG4gICAgKiBJTlNFUlQ6IDQ1LFxuICAgICogREVMRVRFOiA0NixcbiAgICAqIDA6IDQ4LFxuICAgICogMTogNDksXG4gICAgKiAyOiA1MCxcbiAgICAqIDM6IDUxLFxuICAgICogNDogNTIsXG4gICAgKiA1OiA1MyxcbiAgICAqIDY6IDU0LFxuICAgICogNzogNTUsXG4gICAgKiA4OiA1NixcbiAgICAqIDk6IDU3LFxuICAgICogQTogNjUsXG4gICAgKiBCOiA2NixcbiAgICAqIEM6IDY3LFxuICAgICogRDogNjgsXG4gICAgKiBFOiA2OSxcbiAgICAqIEY6IDcwLFxuICAgICogRzogNzEsXG4gICAgKiBIOiA3MixcbiAgICAqIEk6IDczLFxuICAgICogSjogNzQsXG4gICAgKiBLOiA3NSxcbiAgICAqIEw6IDc2LFxuICAgICogTTogNzcsXG4gICAgKiBOOiA3OCxcbiAgICAqIE86IDc5LFxuICAgICogUDogODAsXG4gICAgKiBROiA4MSxcbiAgICAqIFI6IDgyLFxuICAgICogUzogODMsXG4gICAgKiBUOiA4NCxcbiAgICAqIFU6IDg1LFxuICAgICogVjogODYsXG4gICAgKiBXOiA4NyxcbiAgICAqIFg6IDg4LFxuICAgICogWTogODksXG4gICAgKiBaOiA5MCxcbiAgICAqIE5VTVBBRF8wOiA5NixcbiAgICAqIE5VTVBBRF8xOiA5NyxcbiAgICAqIE5VTVBBRF8yOiA5OCxcbiAgICAqIE5VTVBBRF8zOiA5OSxcbiAgICAqIE5VTVBBRF80OiAxMDAsXG4gICAgKiBOVU1QQURfNTogMTAxLFxuICAgICogTlVNUEFEXzY6IDEwMixcbiAgICAqIE5VTVBBRF83OiAxMDMsXG4gICAgKiBOVU1QQURfODogMTA0LFxuICAgICogTlVNUEFEXzk6IDEwNSxcbiAgICAqIE1VTFRJUExZOiAxMDYsXG4gICAgKiBBREQ6IDEwNyxcbiAgICAqIFNVQlNUUkFDVDogMTA5LFxuICAgICogREVDSU1BTDogMTEwLFxuICAgICogRElWSURFOiAxMTEsXG4gICAgKiBGMTogMTEyLFxuICAgICogRjI6IDExMyxcbiAgICAqIEYzOiAxMTQsXG4gICAgKiBGNDogMTE1LFxuICAgICogRjU6IDExNixcbiAgICAqIEY2OiAxMTcsXG4gICAgKiBGNzogMTE4LFxuICAgICogRjg6IDExOSxcbiAgICAqIEY5OiAxMjAsXG4gICAgKiBGMTA6IDEyMSxcbiAgICAqIEYxMTogMTIyLFxuICAgICogRjEyOiAxMjMsXG4gICAgKiBTSElGVDogMTYsXG4gICAgKiBDVFJMOiAxNyxcbiAgICAqIEFMVDogMTgsXG4gICAgKiBQTFVTOiAxODcsXG4gICAgKiBDT01NQTogMTg4LFxuICAgICogTUlOVVM6IDE4OSxcbiAgICAqIFBFUklPRDogMTkwLFxuICAgICogUFVMVF9VUDogMjk0NjAsXG4gICAgKiBQVUxUX0RPV046IDI5NDYxLFxuICAgICogUFVMVF9MRUZUOiA0LFxuICAgICogUFVMVF9SSUdIVCc6IDVcbiAgICAqIH5+flxuICAgICovXG4gICAga2V5czoge1xuICAgICAgICAnQkFDS1NQQUNFJzogOCxcbiAgICAgICAgJ1RBQic6IDksXG4gICAgICAgICdFTlRFUic6IDEzLFxuICAgICAgICAnUEFVU0UnOiAxOSxcbiAgICAgICAgJ0NBUFMnOiAyMCxcbiAgICAgICAgJ0VTQyc6IDI3LFxuICAgICAgICAnU1BBQ0UnOiAzMixcbiAgICAgICAgJ1BBR0VfVVAnOiAzMyxcbiAgICAgICAgJ1BBR0VfRE9XTic6IDM0LFxuICAgICAgICAnRU5EJzogMzUsXG4gICAgICAgICdIT01FJzogMzYsXG4gICAgICAgICdMRUZUX0FSUk9XJzogMzcsXG4gICAgICAgICdVUF9BUlJPVyc6IDM4LFxuICAgICAgICAnUklHSFRfQVJST1cnOiAzOSxcbiAgICAgICAgJ0RPV05fQVJST1cnOiA0MCxcbiAgICAgICAgJ0lOU0VSVCc6IDQ1LFxuICAgICAgICAnREVMRVRFJzogNDYsXG4gICAgICAgICcwJzogNDgsXG4gICAgICAgICcxJzogNDksXG4gICAgICAgICcyJzogNTAsXG4gICAgICAgICczJzogNTEsXG4gICAgICAgICc0JzogNTIsXG4gICAgICAgICc1JzogNTMsXG4gICAgICAgICc2JzogNTQsXG4gICAgICAgICc3JzogNTUsXG4gICAgICAgICc4JzogNTYsXG4gICAgICAgICc5JzogNTcsXG4gICAgICAgICdBJzogNjUsXG4gICAgICAgICdCJzogNjYsXG4gICAgICAgICdDJzogNjcsXG4gICAgICAgICdEJzogNjgsXG4gICAgICAgICdFJzogNjksXG4gICAgICAgICdGJzogNzAsXG4gICAgICAgICdHJzogNzEsXG4gICAgICAgICdIJzogNzIsXG4gICAgICAgICdJJzogNzMsXG4gICAgICAgICdKJzogNzQsXG4gICAgICAgICdLJzogNzUsXG4gICAgICAgICdMJzogNzYsXG4gICAgICAgICdNJzogNzcsXG4gICAgICAgICdOJzogNzgsXG4gICAgICAgICdPJzogNzksXG4gICAgICAgICdQJzogODAsXG4gICAgICAgICdRJzogODEsXG4gICAgICAgICdSJzogODIsXG4gICAgICAgICdTJzogODMsXG4gICAgICAgICdUJzogODQsXG4gICAgICAgICdVJzogODUsXG4gICAgICAgICdWJzogODYsXG4gICAgICAgICdXJzogODcsXG4gICAgICAgICdYJzogODgsXG4gICAgICAgICdZJzogODksXG4gICAgICAgICdaJzogOTAsXG4gICAgICAgICdOVU1QQURfMCc6IDk2LFxuICAgICAgICAnTlVNUEFEXzEnOiA5NyxcbiAgICAgICAgJ05VTVBBRF8yJzogOTgsXG4gICAgICAgICdOVU1QQURfMyc6IDk5LFxuICAgICAgICAnTlVNUEFEXzQnOiAxMDAsXG4gICAgICAgICdOVU1QQURfNSc6IDEwMSxcbiAgICAgICAgJ05VTVBBRF82JzogMTAyLFxuICAgICAgICAnTlVNUEFEXzcnOiAxMDMsXG4gICAgICAgICdOVU1QQURfOCc6IDEwNCxcbiAgICAgICAgJ05VTVBBRF85JzogMTA1LFxuICAgICAgICAnTVVMVElQTFknOiAxMDYsXG4gICAgICAgICdBREQnOiAxMDcsXG4gICAgICAgICdTVUJTVFJBQ1QnOiAxMDksXG4gICAgICAgICdERUNJTUFMJzogMTEwLFxuICAgICAgICAnRElWSURFJzogMTExLFxuICAgICAgICAnRjEnOiAxMTIsXG4gICAgICAgICdGMic6IDExMyxcbiAgICAgICAgJ0YzJzogMTE0LFxuICAgICAgICAnRjQnOiAxMTUsXG4gICAgICAgICdGNSc6IDExNixcbiAgICAgICAgJ0Y2JzogMTE3LFxuICAgICAgICAnRjcnOiAxMTgsXG4gICAgICAgICdGOCc6IDExOSxcbiAgICAgICAgJ0Y5JzogMTIwLFxuICAgICAgICAnRjEwJzogMTIxLFxuICAgICAgICAnRjExJzogMTIyLFxuICAgICAgICAnRjEyJzogMTIzLFxuICAgICAgICAnU0hJRlQnOiAxNixcbiAgICAgICAgJ0NUUkwnOiAxNyxcbiAgICAgICAgJ0FMVCc6IDE4LFxuICAgICAgICAnUExVUyc6IDE4NyxcbiAgICAgICAgJ0NPTU1BJzogMTg4LFxuICAgICAgICAnTUlOVVMnOiAxODksXG4gICAgICAgICdQRVJJT0QnOiAxOTAsXG4gICAgICAgICdQVUxUX1VQJzogMjk0NjAsXG4gICAgICAgICdQVUxUX0RPV04nOiAyOTQ2MSxcbiAgICAgICAgJ1BVTFRfTEVGVCc6IDQsXG4gICAgICAgICdQVUxUX1JJR0hUJzogNVxuXG4gICAgfSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkubW91c2VCdXR0b25zXG4gICAgKiBAY2F0ZWdvcnkgSW5wdXRcbiAgICAqIE9iamVjdCBvZiBtb3VzZUJ1dHRvbiBuYW1lcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgYnV0dG9uIElELlxuICAgICogSW4gYWxsIG1vdXNlRXZlbnRzIHdlIGFkZCB0aGUgZS5tb3VzZUJ1dHRvbiBwcm9wZXJ0eSB3aXRoIGEgdmFsdWUgbm9ybWFsaXplZCB0byBtYXRjaCBlLmJ1dHRvbiBvZiBtb2Rlcm4gd2Via2l0XG4gICAgKiBcbiAgICAqIH5+flxuICAgICogTEVGVDogMCxcbiAgICAqIE1JRERMRTogMSxcbiAgICAqIFJJR0hUOiAyXG4gICAgKiB+fn5cbiAgICAqL1xuICAgIG1vdXNlQnV0dG9uczoge1xuICAgICAgICBMRUZUOiAwLFxuICAgICAgICBNSURETEU6IDEsXG4gICAgICAgIFJJR0hUOiAyXG4gICAgfVxufSk7XG5cblxuXG4vKipcbiogRW50aXR5IGZpeGVzIHRoZSBsYWNrIG9mIHNldHRlciBzdXBwb3J0XG4qL1xuQ3JhZnR5LmMoXCJ2aWV3cG9ydFwiLCB7XG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmJpbmQoXCJFbnRlckZyYW1lXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChDcmFmdHkudmlld3BvcnQuX3ggIT09IENyYWZ0eS52aWV3cG9ydC54KSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbCgnX3gnLCBDcmFmdHkudmlld3BvcnQueCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChDcmFmdHkudmlld3BvcnQuX3kgIT09IENyYWZ0eS52aWV3cG9ydC55KSB7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnNjcm9sbCgnX3knLCBDcmFmdHkudmlld3BvcnQueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0pO1xuXG5DcmFmdHkuZXh0ZW5kKHtcbiAgICAvKipAXG4gICAgKiAjQ3JhZnR5LmRldmljZVxuICAgICogQGNhdGVnb3J5IE1pc2NcbiAgICAqL1xuICAgIGRldmljZSA6IHtcbiAgICAgICAgX2RldmljZU9yaWVudGF0aW9uQ2FsbGJhY2sgOiBmYWxzZSxcbiAgICAgICAgX2RldmljZU1vdGlvbkNhbGxiYWNrIDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICogVGhlIEhUTUw1IERldmljZU9yaWVudGF0aW9uIGV2ZW50IHJldHVybnMgdGhyZWUgcGllY2VzIG9mIGRhdGE6XG4gICAgICAgICogICogYWxwaGEgdGhlIGRpcmVjdGlvbiB0aGUgZGV2aWNlIGlzIGZhY2luZyBhY2NvcmRpbmcgdG8gdGhlIGNvbXBhc3NcbiAgICAgICAgKiAgKiBiZXRhIHRoZSBhbmdsZSBpbiBkZWdyZWVzIHRoZSBkZXZpY2UgaXMgdGlsdGVkIGZyb250LXRvLWJhY2tcbiAgICAgICAgKiAgKiBnYW1tYSB0aGUgYW5nbGUgaW4gZGVncmVlcyB0aGUgZGV2aWNlIGlzIHRpbHRlZCBsZWZ0LXRvLXJpZ2h0LlxuICAgICAgICAqICAqIFRoZSBhbmdsZXMgdmFsdWVzIGluY3JlYXNlIGFzIHlvdSB0aWx0IHRoZSBkZXZpY2UgdG8gdGhlIHJpZ2h0IG9yIHRvd2FyZHMgeW91LlxuICAgICAgICAqXG4gICAgICAgICogU2luY2UgRmlyZWZveCB1c2VzIHRoZSBNb3pPcmllbnRhdGlvbkV2ZW50IHdoaWNoIHJldHVybnMgc2ltaWxhciBkYXRhIGJ1dFxuICAgICAgICAqIHVzaW5nIGRpZmZlcmVudCBwYXJhbWV0ZXJzIGFuZCBhIGRpZmZlcmVudCBtZWFzdXJlbWVudCBzeXN0ZW0sIHdlIHdhbnQgdG9cbiAgICAgICAgKiBub3JtYWxpemUgdGhhdCBiZWZvcmUgd2UgcGFzcyBpdCB0byBvdXIgX2RldmljZU9yaWVudGF0aW9uQ2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0gZXZlbnREYXRhIEhUTUw1IERldmljZU9yaWVudGF0aW9uIGV2ZW50XG4gICAgICAgICovXG4gICAgICAgIF9ub3JtYWxpemVEZXZpY2VPcmllbnRhdGlvbiA6IGZ1bmN0aW9uKGV2ZW50RGF0YSkge1xuICAgICAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgICAgICBpZiAod2luZG93LkRldmljZU9yaWVudGF0aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAvLyBnYW1tYSBpcyB0aGUgbGVmdC10by1yaWdodCB0aWx0IGluIGRlZ3JlZXMsIHdoZXJlIHJpZ2h0IGlzIHBvc2l0aXZlXG4gICAgICAgICAgICAgICAgICAgICd0aWx0TFInICAgIDogICAgZXZlbnREYXRhLmdhbW1hLFxuICAgICAgICAgICAgICAgICAgICAvLyBiZXRhIGlzIHRoZSBmcm9udC10by1iYWNrIHRpbHQgaW4gZGVncmVlcywgd2hlcmUgZnJvbnQgaXMgcG9zaXRpdmVcbiAgICAgICAgICAgICAgICAgICAgJ3RpbHRGQicgICAgOiAgICAgZXZlbnREYXRhLmJldGEsXG4gICAgICAgICAgICAgICAgICAgIC8vIGFscGhhIGlzIHRoZSBjb21wYXNzIGRpcmVjdGlvbiB0aGUgZGV2aWNlIGlzIGZhY2luZyBpbiBkZWdyZWVzXG4gICAgICAgICAgICAgICAgICAgICdkaXInICAgICAgICAgOiAgICAgZXZlbnREYXRhLmFscGhhLFxuICAgICAgICAgICAgICAgICAgICAvLyBkZXZpY2VvcmllbnRhdGlvbiBkb2VzIG5vdCBwcm92aWRlIHRoaXMgZGF0YVxuICAgICAgICAgICAgICAgICAgICAnbW90VUQnICAgICA6ICAgICBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuT3JpZW50YXRpb25FdmVudCkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHggaXMgdGhlIGxlZnQtdG8tcmlnaHQgdGlsdCBmcm9tIC0xIHRvICsxLCBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgdG8gZGVncmVlc1xuICAgICAgICAgICAgICAgICAgICAndGlsdExSJyAgICA6ICAgIGV2ZW50RGF0YS54ICogOTAsXG4gICAgICAgICAgICAgICAgICAgIC8vIHkgaXMgdGhlIGZyb250LXRvLWJhY2sgdGlsdCBmcm9tIC0xIHRvICsxLCBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgdG8gZGVncmVlc1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBhbHNvIG5lZWQgdG8gaW52ZXJ0IHRoZSB2YWx1ZSBzbyB0aWx0aW5nIHRoZSBkZXZpY2UgdG93YXJkcyB1cyAoZm9yd2FyZClcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzdWx0cyBpbiBhIHBvc2l0aXZlIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAndGlsdEZCJyAgICA6ICAgICBldmVudERhdGEueSAqIC05MCxcbiAgICAgICAgICAgICAgICAgICAgLy8gTW96T3JpZW50YXRpb24gZG9lcyBub3QgcHJvdmlkZSB0aGlzIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgJ2RpcicgICAgICAgICA6ICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAvLyB6IGlzIHRoZSB2ZXJ0aWNhbCBhY2NlbGVyYXRpb24gb2YgdGhlIGRldmljZVxuICAgICAgICAgICAgICAgICAgICAnbW90VUQnICAgICA6ICAgICBldmVudERhdGEuelxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ3JhZnR5LmRldmljZS5fZGV2aWNlT3JpZW50YXRpb25DYWxsYmFjayhkYXRhKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgKiBAcGFyYW0gZXZlbnREYXRhIEhUTUw1IERldmljZU1vdGlvbiBldmVudFxuICAgICAgICAqL1xuICAgICAgICBfbm9ybWFsaXplRGV2aWNlTW90aW9uIDogZnVuY3Rpb24oZXZlbnREYXRhKSB7XG4gICAgICAgICAgICB2YXIgYWNjZWxlcmF0aW9uICAgID0gZXZlbnREYXRhLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHksXG4gICAgICAgICAgICAgICAgZmFjaW5nVXAgICAgICAgID0gKGFjY2VsZXJhdGlvbi56ID4gMCkgPyArMSA6IC0xO1xuXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAvLyBHcmFiIHRoZSBhY2NlbGVyYXRpb24gaW5jbHVkaW5nIGdyYXZpdHkgZnJvbSB0aGUgcmVzdWx0c1xuICAgICAgICAgICAgICAgICdhY2NlbGVyYXRpb24nIDogYWNjZWxlcmF0aW9uLFxuICAgICAgICAgICAgICAgICdyYXdBY2NlbGVyYXRpb24nIDogXCJbXCIrICBNYXRoLnJvdW5kKGFjY2VsZXJhdGlvbi54KSArXCIsIFwiK01hdGgucm91bmQoYWNjZWxlcmF0aW9uLnkpICsgXCIsIFwiICsgTWF0aC5yb3VuZChhY2NlbGVyYXRpb24ueikgKyBcIl1cIixcbiAgICAgICAgICAgICAgICAvLyBaIGlzIHRoZSBhY2NlbGVyYXRpb24gaW4gdGhlIFogYXhpcywgYW5kIGlmIHRoZSBkZXZpY2UgaXMgZmFjaW5nIHVwIG9yIGRvd25cbiAgICAgICAgICAgICAgICAnZmFjaW5nVXAnIDogZmFjaW5nVXAsXG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgdmFsdWUgZnJvbSBhY2NlbGVyYXRpb24gdG8gZGVncmVlcyBhY2NlbGVyYXRpb24ueHx5IGlzIHRoZVxuICAgICAgICAgICAgICAgIC8vIGFjY2VsZXJhdGlvbiBhY2NvcmRpbmcgdG8gZ3Jhdml0eSwgd2UnbGwgYXNzdW1lIHdlJ3JlIG9uIEVhcnRoIGFuZCBkaXZpZGVcbiAgICAgICAgICAgICAgICAvLyBieSA5LjgxIChlYXJ0aCBncmF2aXR5KSB0byBnZXQgYSBwZXJjZW50YWdlIHZhbHVlLCBhbmQgdGhlbiBtdWx0aXBseSB0aGF0XG4gICAgICAgICAgICAgICAgLy8gYnkgOTAgdG8gY29udmVydCB0byBkZWdyZWVzLlxuICAgICAgICAgICAgICAgICd0aWx0TFInIDogTWF0aC5yb3VuZCgoKGFjY2VsZXJhdGlvbi54KSAvIDkuODEpICogLTkwKSxcbiAgICAgICAgICAgICAgICAndGlsdEZCJyA6IE1hdGgucm91bmQoKChhY2NlbGVyYXRpb24ueSArIDkuODEpIC8gOS44MSkgKiA5MCAqIGZhY2luZ1VwKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgQ3JhZnR5LmRldmljZS5fZGV2aWNlTW90aW9uQ2FsbGJhY2soZGF0YSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZGV2aWNlLmRldmljZU9yaWVudGF0aW9uXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LmRldmljZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBDcmFmdHkuZGV2aWNlLmRldmljZU9yaWVudGF0aW9uKEZ1bmN0aW9uIGNhbGxiYWNrKVxuICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIENhbGxiYWNrIG1ldGhvZCBleGVjdXRlZCBvbmNlIGFzIHNvb24gYXMgZGV2aWNlIG9yaWVudGF0aW9uIGlzIGNoYW5nZVxuICAgICAgICAqXG4gICAgICAgICogRG8gc29tZXRoaW5nIHdpdGggbm9ybWFsaXplZCBkZXZpY2Ugb3JpZW50YXRpb24gZGF0YTpcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB7XG4gICAgICAgICogICAndGlsdExSJyAgICA6ICAgJ2dhbW1hIHRoZSBhbmdsZSBpbiBkZWdyZWVzIHRoZSBkZXZpY2UgaXMgdGlsdGVkIGxlZnQtdG8tcmlnaHQuJyxcbiAgICAgICAgKiAgICd0aWx0RkInICAgIDogICAnYmV0YSB0aGUgYW5nbGUgaW4gZGVncmVlcyB0aGUgZGV2aWNlIGlzIHRpbHRlZCBmcm9udC10by1iYWNrJyxcbiAgICAgICAgKiAgICdkaXInICAgICAgIDogICAnYWxwaGEgdGhlIGRpcmVjdGlvbiB0aGUgZGV2aWNlIGlzIGZhY2luZyBhY2NvcmRpbmcgdG8gdGhlIGNvbXBhc3MnLFxuICAgICAgICAqICAgJ21vdFVEJyAgICAgOiAgICdUaGUgYW5nbGVzIHZhbHVlcyBpbmNyZWFzZSBhcyB5b3UgdGlsdCB0aGUgZGV2aWNlIHRvIHRoZSByaWdodCBvciB0b3dhcmRzIHlvdS4nXG4gICAgICAgICogfVxuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiAvLyBHZXQgRGV2aWNlT3JpZW50YXRpb24gZXZlbnQgbm9ybWFsaXplZCBkYXRhLlxuICAgICAgICAqIENyYWZ0eS5kZXZpY2UuZGV2aWNlT3JpZW50YXRpb24oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICogICAgIGNvbnNvbGUubG9nKCdkYXRhLnRpbHRMUiA6ICcrTWF0aC5yb3VuZChkYXRhLnRpbHRMUikrJywgZGF0YS50aWx0RkIgOiAnK01hdGgucm91bmQoZGF0YS50aWx0RkIpKycsIGRhdGEuZGlyIDogJytNYXRoLnJvdW5kKGRhdGEuZGlyKSsnLCBkYXRhLm1vdFVEIDogJytkYXRhLm1vdFVEKycnKTtcbiAgICAgICAgKiB9KTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKlxuICAgICAgICAqIFNlZSBicm93c2VyIHN1cHBvcnQgYXQgaHR0cDovL2Nhbml1c2UuY29tLyNzZWFyY2g9ZGV2aWNlIG9yaWVudGF0aW9uLlxuICAgICAgICAqL1xuICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiA6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIHRoaXMuX2RldmljZU9yaWVudGF0aW9uQ2FsbGJhY2sgPSBmdW5jO1xuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdXBwb3J0LmRldmljZW9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5EZXZpY2VPcmllbnRhdGlvbkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExpc3RlbiBmb3IgdGhlIGRldmljZW9yaWVudGF0aW9uIGV2ZW50IGFuZCBoYW5kbGUgRGV2aWNlT3JpZW50YXRpb25FdmVudCBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmFkZEV2ZW50KHRoaXMsIHdpbmRvdywgJ2RldmljZW9yaWVudGF0aW9uJywgdGhpcy5fbm9ybWFsaXplRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93Lk9yaWVudGF0aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciB0aGUgTW96T3JpZW50YXRpb24gZXZlbnQgYW5kIGhhbmRsZSBPcmllbnRhdGlvbkRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csICdNb3pPcmllbnRhdGlvbicsIHRoaXMuX25vcm1hbGl6ZURldmljZU9yaWVudGF0aW9uKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5kZXZpY2UuZGV2aWNlTW90aW9uXG4gICAgICAgICogQGNvbXAgQ3JhZnR5LmRldmljZVxuICAgICAgICAqIEBzaWduIHB1YmxpYyBDcmFmdHkuZGV2aWNlLmRldmljZU1vdGlvbihGdW5jdGlvbiBjYWxsYmFjaylcbiAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsYmFjayBtZXRob2QgZXhlY3V0ZWQgb25jZSBhcyBzb29uIGFzIGRldmljZSBtb3Rpb24gaXMgY2hhbmdlXG4gICAgICAgICpcbiAgICAgICAgKiBEbyBzb21ldGhpbmcgd2l0aCBub3JtYWxpemVkIGRldmljZSBtb3Rpb24gZGF0YTpcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB7XG4gICAgICAgICogICAgICdhY2NlbGVyYXRpb24nIDogJyBHcmFiIHRoZSBhY2NlbGVyYXRpb24gaW5jbHVkaW5nIGdyYXZpdHkgZnJvbSB0aGUgcmVzdWx0cycsXG4gICAgICAgICogICAgICdyYXdBY2NlbGVyYXRpb24nIDogJ0Rpc3BsYXkgdGhlIHJhdyBhY2NlbGVyYXRpb24gZGF0YScsXG4gICAgICAgICogICAgICdmYWNpbmdVcCcgOiAnWiBpcyB0aGUgYWNjZWxlcmF0aW9uIGluIHRoZSBaIGF4aXMsIGFuZCBpZiB0aGUgZGV2aWNlIGlzIGZhY2luZyB1cCBvciBkb3duJyxcbiAgICAgICAgKiAgICAgJ3RpbHRMUicgOiAnQ29udmVydCB0aGUgdmFsdWUgZnJvbSBhY2NlbGVyYXRpb24gdG8gZGVncmVlcy4gYWNjZWxlcmF0aW9uLnggaXMgdGhlIGFjY2VsZXJhdGlvbiBhY2NvcmRpbmcgdG8gZ3Jhdml0eSwgd2UnbGwgYXNzdW1lIHdlJ3JlIG9uIEVhcnRoIGFuZCBkaXZpZGUgYnkgOS44MSAoZWFydGggZ3Jhdml0eSkgdG8gZ2V0IGEgcGVyY2VudGFnZSB2YWx1ZSwgYW5kIHRoZW4gbXVsdGlwbHkgdGhhdCBieSA5MCB0byBjb252ZXJ0IHRvIGRlZ3JlZXMuJyxcbiAgICAgICAgKiAgICAgJ3RpbHRGQicgOiAnQ29udmVydCB0aGUgdmFsdWUgZnJvbSBhY2NlbGVyYXRpb24gdG8gZGVncmVlcy4nXG4gICAgICAgICogfVxuICAgICAgICAqIH5+flxuICAgICAgICAqXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiAvLyBHZXQgRGV2aWNlTW90aW9uIGV2ZW50IG5vcm1hbGl6ZWQgZGF0YS5cbiAgICAgICAgKiBDcmFmdHkuZGV2aWNlLmRldmljZU1vdGlvbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgKiAgICAgY29uc29sZS5sb2coJ2RhdGEubW9BY2NlbCA6ICcrZGF0YS5yYXdBY2NlbGVyYXRpb24rJywgZGF0YS5tb0NhbGNUaWx0TFIgOiAnK01hdGgucm91bmQoZGF0YS50aWx0TFIpKycsIGRhdGEubW9DYWxjVGlsdEZCIDogJytNYXRoLnJvdW5kKGRhdGEudGlsdEZCKSsnJyk7XG4gICAgICAgICogfSk7XG4gICAgICAgICogfn5+XG4gICAgICAgICpcbiAgICAgICAgKiBTZWUgYnJvd3NlciBzdXBwb3J0IGF0IGh0dHA6Ly9jYW5pdXNlLmNvbS8jc2VhcmNoPW1vdGlvbi5cbiAgICAgICAgKi9cbiAgICAgICAgZGV2aWNlTW90aW9uIDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgdGhpcy5fZGV2aWNlTW90aW9uQ2FsbGJhY2sgPSBmdW5jO1xuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdXBwb3J0LmRldmljZW1vdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICh3aW5kb3cuRGV2aWNlTW90aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciB0aGUgZGV2aWNlbW90aW9uIGV2ZW50IGFuZCBoYW5kbGUgRGV2aWNlTW90aW9uRXZlbnQgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCB3aW5kb3csICdkZXZpY2Vtb3Rpb24nLCB0aGlzLl9ub3JtYWxpemVEZXZpY2VNb3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vKipAXG4qICNTcHJpdGVcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIHNwcml0ZXMgY2hhbmdlXG4qIENvbXBvbmVudCBmb3IgdXNpbmcgdGlsZXMgaW4gYSBzcHJpdGUgbWFwLlxuKi9cbkNyYWZ0eS5jKFwiU3ByaXRlXCIsIHtcblx0X19pbWFnZTogJycsXG5cdC8qXG5cdCogIy5fX3RpbGVcblx0KiBAY29tcCBTcHJpdGVcblx0KlxuXHQqIEhvcml6b250YWwgc3ByaXRlIHRpbGUgc2l6ZS5cblx0Ki9cblx0X190aWxlOiAwLFxuXHQvKlxuXHQqICMuX190aWxlaFxuXHQqIEBjb21wIFNwcml0ZVxuXHQqXG5cdCogVmVydGljYWwgc3ByaXRlIHRpbGUgc2l6ZS5cblx0Ki9cblx0X190aWxlaDogMCxcblx0X19wYWRkaW5nOiBudWxsLFxuXHRfX3RyaW06IG51bGwsXG5cdGltZzogbnVsbCxcblx0Ly9yZWFkeSBpcyBjaGFuZ2VkIHRvIHRydWUgaW4gQ3JhZnR5LnNwcml0ZVxuXHRyZWFkeTogZmFsc2UsXG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX190cmltID0gWzAsIDAsIDAsIDBdO1xuXG5cdFx0dmFyIGRyYXcgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIGNvID0gZS5jbyxcblx0XHRcdFx0cG9zID0gZS5wb3MsXG5cdFx0XHRcdGNvbnRleHQgPSBlLmN0eDtcblxuXHRcdFx0aWYgKGUudHlwZSA9PT0gXCJjYW52YXNcIikge1xuXHRcdFx0XHQvL2RyYXcgdGhlIGltYWdlIG9uIHRoZSBjYW52YXMgZWxlbWVudFxuXHRcdFx0XHRjb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltZywgLy9pbWFnZSBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdFx0IGNvLngsIC8veCBwb3NpdGlvbiBvbiBzcHJpdGVcblx0XHRcdFx0XHRcdFx0XHQgY28ueSwgLy95IHBvc2l0aW9uIG9uIHNwcml0ZVxuXHRcdFx0XHRcdFx0XHRcdCBjby53LCAvL3dpZHRoIG9uIHNwcml0ZVxuXHRcdFx0XHRcdFx0XHRcdCBjby5oLCAvL2hlaWdodCBvbiBzcHJpdGVcblx0XHRcdFx0XHRcdFx0XHQgcG9zLl94LCAvL3ggcG9zaXRpb24gb24gY2FudmFzXG5cdFx0XHRcdFx0XHRcdFx0IHBvcy5feSwgLy95IHBvc2l0aW9uIG9uIGNhbnZhc1xuXHRcdFx0XHRcdFx0XHRcdCBwb3MuX3csIC8vd2lkdGggb24gY2FudmFzXG5cdFx0XHRcdFx0XHRcdFx0IHBvcy5faCAvL2hlaWdodCBvbiBjYW52YXNcblx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSBpZiAoZS50eXBlID09PSBcIkRPTVwiKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUuYmFja2dyb3VuZCA9IFwidXJsKCdcIiArIHRoaXMuX19pbWFnZSArIFwiJykgbm8tcmVwZWF0IC1cIiArIGNvLnggKyBcInB4IC1cIiArIGNvLnkgKyBcInB4XCI7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUuYmFja2dyb3VuZFNpemUgPSAnY292ZXInO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLmJpbmQoXCJEcmF3XCIsIGRyYXcpLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRpZiAoaWQgPT09IFwiU3ByaXRlXCIpIHRoaXMudW5iaW5kKFwiRHJhd1wiLCBkcmF3KTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5zcHJpdGVcblx0KiBAY29tcCBTcHJpdGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuc3ByaXRlKE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHcsIE51bWJlciBoKVxuXHQqIEBwYXJhbSB4IC0gWCBjZWxsIHBvc2l0aW9uXG5cdCogQHBhcmFtIHkgLSBZIGNlbGwgcG9zaXRpb25cblx0KiBAcGFyYW0gdyAtIFdpZHRoIGluIGNlbGxzXG5cdCogQHBhcmFtIGggLSBIZWlnaHQgaW4gY2VsbHNcblx0KiBcblx0KiBVc2VzIGEgbmV3IGxvY2F0aW9uIG9uIHRoZSBzcHJpdGUgbWFwIGFzIGl0cyBzcHJpdGUuXG5cdCpcblx0KiBWYWx1ZXMgc2hvdWxkIGJlIGluIHRpbGVzIG9yIGNlbGxzIChub3QgcGl4ZWxzKS5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBTcHJpdGVcIilcblx0KiBcdC5zcHJpdGUoMCwgMCwgMiwgMik7XG5cdCogfn5+XG5cdCovXG5cblx0LyoqQFxuXHQqICMuX19jb29yZFxuXHQqIEBjb21wIFNwcml0ZVxuXHQqXG5cdCogVGhlIGNvb3JkaW5hdGUgb2YgdGhlIHNsaWRlIHdpdGhpbiB0aGUgc3ByaXRlIGluIHRoZSBmb3JtYXQgb2YgW3gsIHksIHcsIGhdLlxuXHQqL1xuXHRzcHJpdGU6IGZ1bmN0aW9uICh4LCB5LCB3LCBoKSB7XG5cdFx0dGhpcy5fX2Nvb3JkID0gW3ggKiB0aGlzLl9fdGlsZSArIHRoaXMuX19wYWRkaW5nWzBdICsgdGhpcy5fX3RyaW1bMF0sXG5cdFx0XHRcdFx0XHR5ICogdGhpcy5fX3RpbGVoICsgdGhpcy5fX3BhZGRpbmdbMV0gKyB0aGlzLl9fdHJpbVsxXSxcblx0XHRcdFx0XHRcdHRoaXMuX190cmltWzJdIHx8IHcgKiB0aGlzLl9fdGlsZSB8fCB0aGlzLl9fdGlsZSxcblx0XHRcdFx0XHRcdHRoaXMuX190cmltWzNdIHx8IGggKiB0aGlzLl9fdGlsZWggfHwgdGhpcy5fX3RpbGVoXTtcblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5jcm9wXG5cdCogQGNvbXAgU3ByaXRlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmNyb3AoTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgdywgTnVtYmVyIGgpXG5cdCogQHBhcmFtIHggLSBPZmZzZXQgeCBwb3NpdGlvblxuXHQqIEBwYXJhbSB5IC0gT2Zmc2V0IHkgcG9zaXRpb25cblx0KiBAcGFyYW0gdyAtIE5ldyB3aWR0aFxuXHQqIEBwYXJhbSBoIC0gTmV3IGhlaWdodFxuXHQqIFxuXHQqIElmIHRoZSBlbnRpdHkgbmVlZHMgdG8gYmUgc21hbGxlciB0aGFuIHRoZSB0aWxlIHNpemUsIHVzZSB0aGlzIG1ldGhvZCB0byBjcm9wIGl0LlxuXHQqXG5cdCogVGhlIHZhbHVlcyBzaG91bGQgYmUgaW4gcGl4ZWxzIHJhdGhlciB0aGFuIHRpbGVzLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIFNwcml0ZVwiKVxuXHQqIFx0LmNyb3AoNDAsIDQwLCAyMiwgMjMpO1xuXHQqIH5+flxuXHQqL1xuXHRjcm9wOiBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuXHRcdHZhciBvbGQgPSB0aGlzLl9tYnIgfHwgdGhpcy5wb3MoKTtcblx0XHR0aGlzLl9fdHJpbSA9IFtdO1xuXHRcdHRoaXMuX190cmltWzBdID0geDtcblx0XHR0aGlzLl9fdHJpbVsxXSA9IHk7XG5cdFx0dGhpcy5fX3RyaW1bMl0gPSB3O1xuXHRcdHRoaXMuX190cmltWzNdID0gaDtcblxuXHRcdHRoaXMuX19jb29yZFswXSArPSB4O1xuXHRcdHRoaXMuX19jb29yZFsxXSArPSB5O1xuXHRcdHRoaXMuX19jb29yZFsyXSA9IHc7XG5cdFx0dGhpcy5fX2Nvb3JkWzNdID0gaDtcblx0XHR0aGlzLl93ID0gdztcblx0XHR0aGlzLl9oID0gaDtcblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiLCBvbGQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjQ2FudmFzXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBAdHJpZ2dlciBEcmF3IC0gd2hlbiB0aGUgZW50aXR5IGlzIHJlYWR5IHRvIGJlIGRyYXduIHRvIHRoZSBzdGFnZSAtIHt0eXBlOiBcImNhbnZhc1wiLCBwb3MsIGNvLCBjdHh9XG4qIEB0cmlnZ2VyIE5vQ2FudmFzIC0gaWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBjYW52YXNcbiogXG4qIFdoZW4gdGhpcyBjb21wb25lbnQgaXMgYWRkZWQgdG8gYW4gZW50aXR5IGl0IHdpbGwgYmUgZHJhd24gdG8gdGhlIGdsb2JhbCBjYW52YXMgZWxlbWVudC4gVGhlIGNhbnZhcyBlbGVtZW50IChhbmQgaGVuY2UgYWxsIENhbnZhcyBlbnRpdGllcykgaXMgYWx3YXlzIHJlbmRlcmVkIGJlbG93IGFueSBET00gZW50aXRpZXMuIFxuKiBcbiogQ3JhZnR5LmNhbnZhcy5pbml0KCkgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGNhbGxlZCBpZiBpdCBpcyBub3QgY2FsbGVkIGFscmVhZHkgdG8gaW5pdGlhbGl6ZSB0aGUgY2FudmFzIGVsZW1lbnQuXG4qXG4qIENyZWF0ZSBhIGNhbnZhcyBlbnRpdHkgbGlrZSB0aGlzXG4qIH5+flxuKiB2YXIgbXlFbnRpdHkgPSBDcmFmdHkuZShcIjJELCBDYW52YXMsIENvbG9yXCIpLmNvbG9yKFwiZ3JlZW5cIilcbiogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cih7eDogMTMsIHk6IDM3LCB3OiA0MiwgaDogNDJ9KTtcbip+fn5cbiovXG5DcmFmdHkuYyhcIkNhbnZhc1wiLCB7XG5cblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghQ3JhZnR5LmNhbnZhcy5jb250ZXh0KSB7XG5cdFx0XHRDcmFmdHkuY2FudmFzLmluaXQoKTtcblx0XHR9XG5cblx0XHQvL2luY3JlbWVudCB0aGUgYW1vdW50IG9mIGNhbnZhcyBvYmpzXG5cdFx0Q3JhZnR5LkRyYXdNYW5hZ2VyLnRvdGFsMkQrKztcblxuXHRcdHRoaXMuYmluZChcIkNoYW5nZVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0Ly9pZiB3aXRoaW4gc2NyZWVuLCBhZGQgdG8gbGlzdFxuXHRcdFx0aWYgKHRoaXMuX2NoYW5nZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRcdHRoaXMuX2NoYW5nZWQgPSBDcmFmdHkuRHJhd01hbmFnZXIuYWRkKGUgfHwgdGhpcywgdGhpcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoZSkgdGhpcy5fY2hhbmdlZCA9IENyYWZ0eS5EcmF3TWFuYWdlci5hZGQoZSwgdGhpcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmJpbmQoXCJSZW1vdmVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0Q3JhZnR5LkRyYXdNYW5hZ2VyLnRvdGFsMkQtLTtcblx0XHRcdENyYWZ0eS5EcmF3TWFuYWdlci5hZGQodGhpcywgdGhpcyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZHJhd1xuXHQqIEBjb21wIENhbnZhc1xuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kcmF3KFtbQ29udGV4dCBjdHgsIF1OdW1iZXIgeCwgTnVtYmVyIHksIE51bWJlciB3LCBOdW1iZXIgaF0pXG5cdCogQHBhcmFtIGN0eCAtIENhbnZhcyAyRCBjb250ZXh0IGlmIGRyYXdpbmcgb24gYW5vdGhlciBjYW52YXMgaXMgcmVxdWlyZWRcblx0KiBAcGFyYW0geCAtIFggb2Zmc2V0IGZvciBkcmF3aW5nIGEgc2VnbWVudFxuXHQqIEBwYXJhbSB5IC0gWSBvZmZzZXQgZm9yIGRyYXdpbmcgYSBzZWdtZW50XG5cdCogQHBhcmFtIHcgLSBXaWR0aCBvZiB0aGUgc2VnbWVudCB0byBkcmF3XG5cdCogQHBhcmFtIGggLSBIZWlnaHQgb2YgdGhlIHNlZ21lbnQgdG8gZHJhd1xuXHQqIFxuXHQqIE1ldGhvZCB0byBkcmF3IHRoZSBlbnRpdHkgb24gdGhlIGNhbnZhcyBlbGVtZW50LiBDYW4gcGFzcyByZWN0IHZhbHVlcyBmb3IgcmVkcmF3aW5nIGEgc2VnbWVudCBvZiB0aGUgZW50aXR5LlxuXHQqL1xuXHRkcmF3OiBmdW5jdGlvbiAoY3R4LCB4LCB5LCB3LCBoKSB7XG5cdFx0aWYgKCF0aGlzLnJlYWR5KSByZXR1cm47XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDQpIHtcblx0XHRcdGggPSB3O1xuXHRcdFx0dyA9IHk7XG5cdFx0XHR5ID0geDtcblx0XHRcdHggPSBjdHg7XG5cdFx0XHRjdHggPSBDcmFmdHkuY2FudmFzLmNvbnRleHQ7XG5cdFx0fVxuXG5cdFx0dmFyIHBvcyA9IHsgLy9pbmxpbmVkIHBvcygpIGZ1bmN0aW9uLCBmb3Igc3BlZWRcblx0XHRcdF94OiAodGhpcy5feCArICh4IHx8IDApKSxcblx0XHRcdF95OiAodGhpcy5feSArICh5IHx8IDApKSxcblx0XHRcdF93OiAodyB8fCB0aGlzLl93KSxcblx0XHRcdF9oOiAoaCB8fCB0aGlzLl9oKVxuXHRcdH0sXG5cdFx0XHRjb250ZXh0ID0gY3R4IHx8IENyYWZ0eS5jYW52YXMuY29udGV4dCxcblx0XHRcdGNvb3JkID0gdGhpcy5fX2Nvb3JkIHx8IFswLCAwLCAwLCAwXSxcblx0XHRcdGNvID0ge1xuXHRcdFx0eDogY29vcmRbMF0gKyAoeCB8fCAwKSxcblx0XHRcdHk6IGNvb3JkWzFdICsgKHkgfHwgMCksXG5cdFx0XHR3OiB3IHx8IGNvb3JkWzJdLFxuXHRcdFx0aDogaCB8fCBjb29yZFszXVxuXHRcdH07XG5cblx0XHRpZiAodGhpcy5fbWJyKSB7XG5cdFx0XHRjb250ZXh0LnNhdmUoKTtcblxuXHRcdFx0Y29udGV4dC50cmFuc2xhdGUodGhpcy5fb3JpZ2luLnggKyB0aGlzLl94LCB0aGlzLl9vcmlnaW4ueSArIHRoaXMuX3kpO1xuXHRcdFx0cG9zLl94ID0gLXRoaXMuX29yaWdpbi54O1xuXHRcdFx0cG9zLl95ID0gLXRoaXMuX29yaWdpbi55O1xuXG5cdFx0XHRjb250ZXh0LnJvdGF0ZSgodGhpcy5fcm90YXRpb24gJSAzNjApICogKE1hdGguUEkgLyAxODApKTtcblx0XHR9XG5cdFx0XG5cdFx0aWYodGhpcy5fZmxpcFggfHwgdGhpcy5fZmxpcFkpIHtcblx0XHRcdGNvbnRleHQuc2F2ZSgpO1xuXHRcdFx0Y29udGV4dC5zY2FsZSgodGhpcy5fZmxpcFggPyAtMSA6IDEpLCAodGhpcy5fZmxpcFkgPyAtMSA6IDEpKTtcblx0XHRcdGlmKHRoaXMuX2ZsaXBYKSB7XG5cdFx0XHRcdHBvcy5feCA9IC0ocG9zLl94ICsgcG9zLl93KVxuXHRcdFx0fVxuXHRcdFx0aWYodGhpcy5fZmxpcFkpIHtcblx0XHRcdFx0cG9zLl95ID0gLShwb3MuX3kgKyBwb3MuX2gpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vZHJhdyB3aXRoIGFscGhhXG5cdFx0aWYgKHRoaXMuX2FscGhhIDwgMS4wKSB7XG5cdFx0XHR2YXIgZ2xvYmFscGhhID0gY29udGV4dC5nbG9iYWxBbHBoYTtcblx0XHRcdGNvbnRleHQuZ2xvYmFsQWxwaGEgPSB0aGlzLl9hbHBoYTtcblx0XHR9XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJEcmF3XCIsIHsgdHlwZTogXCJjYW52YXNcIiwgcG9zOiBwb3MsIGNvOiBjbywgY3R4OiBjb250ZXh0IH0pO1xuXG5cdFx0aWYgKHRoaXMuX21iciB8fCAodGhpcy5fZmxpcFggfHwgdGhpcy5fZmxpcFkpKSB7XG5cdFx0XHRjb250ZXh0LnJlc3RvcmUoKTtcblx0XHR9XG5cdFx0aWYgKGdsb2JhbHBoYSkge1xuXHRcdFx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IGdsb2JhbHBoYTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG4vKipAXG4qICNDcmFmdHkuY2FudmFzXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBcbiogQ29sbGVjdGlvbiBvZiBtZXRob2RzIHRvIGRyYXcgb24gY2FudmFzLlxuKi9cbkNyYWZ0eS5leHRlbmQoe1xuXHRjYW52YXM6IHtcblx0LyoqQFxuXHRcdCogI0NyYWZ0eS5jYW52YXMuY29udGV4dFxuXHRcdCogQGNvbXAgQ3JhZnR5LmNhbnZhc1xuXHRcdCogXG5cdFx0KiBUaGlzIHdpbGwgcmV0dXJuIHRoZSAyRCBjb250ZXh0IG9mIHRoZSBtYWluIGNhbnZhcyBlbGVtZW50LlxuXHRcdCogVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYENyYWZ0eS5jYW52YXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpYC5cblx0XHQqL1xuXHRcdGNvbnRleHQ6IG51bGwsXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5jYW52YXMuX2NhbnZhc1xuXHRcdCogQGNvbXAgQ3JhZnR5LmNhbnZhc1xuXHRcdCogXG5cdFx0KiBNYWluIENhbnZhcyBlbGVtZW50XG5cdFx0Ki9cblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuY2FudmFzLmluaXRcblx0XHQqIEBjb21wIENyYWZ0eS5jYW52YXNcblx0XHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5jYW52YXMuaW5pdCh2b2lkKVxuICAgICAgICAqIEB0cmlnZ2VyIE5vQ2FudmFzIC0gdHJpZ2dlcmVkIGlmIGBDcmFmdHkuc3VwcG9ydC5jYW52YXNgIGlzIGZhbHNlXG4gICAgICAgICogXG5cdFx0KiBDcmVhdGVzIGEgYGNhbnZhc2AgZWxlbWVudCBpbnNpZGUgYENyYWZ0eS5zdGFnZS5lbGVtYC4gTXVzdCBiZSBjYWxsZWRcblx0XHQqIGJlZm9yZSBhbnkgZW50aXRpZXMgd2l0aCB0aGUgQ2FudmFzIGNvbXBvbmVudCBjYW4gYmUgZHJhd24uXG5cdFx0KlxuXHRcdCogVGhpcyBtZXRob2Qgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIGNhbGxlZCBpZiBubyBgQ3JhZnR5LmNhbnZhcy5jb250ZXh0YCBpc1xuXHRcdCogZm91bmQuXG5cdFx0Ki9cblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvL2NoZWNrIGlmIGNhbnZhcyBpcyBzdXBwb3J0ZWRcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuY2FudmFzKSB7XG5cdFx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiTm9DYW52YXNcIik7XG5cdFx0XHRcdENyYWZ0eS5zdG9wKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly9jcmVhdGUgMyBlbXB0eSBjYW52YXMgZWxlbWVudHNcblx0XHRcdHZhciBjO1xuXHRcdFx0YyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0XHRjLndpZHRoID0gQ3JhZnR5LnZpZXdwb3J0LndpZHRoO1xuXHRcdFx0Yy5oZWlnaHQgPSBDcmFmdHkudmlld3BvcnQuaGVpZ2h0O1xuXHRcdFx0Yy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRjLnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHRcdFx0Yy5zdHlsZS50b3AgPSBcIjBweFwiO1xuXG5cdFx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5hcHBlbmRDaGlsZChjKTtcblx0XHRcdENyYWZ0eS5jYW52YXMuY29udGV4dCA9IGMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdENyYWZ0eS5jYW52YXMuX2NhbnZhcyA9IGM7XG5cdFx0fVxuXHR9XG59KTtcblxuQ3JhZnR5LmV4dGVuZCh7XG5cdG92ZXI6IG51bGwsIC8vb2JqZWN0IG1vdXNlb3Zlciwgd2FpdGluZyBmb3Igb3V0XG5cdG1vdXNlT2JqczogMCxcblx0bW91c2VQb3M6IHt9LFxuXHRsYXN0RXZlbnQ6IG51bGwsXG5cdGtleWRvd246IHt9LFxuXHRzZWxlY3RlZDogZmFsc2UsXG5cblx0LyoqQFxuXHQqICNDcmFmdHkua2V5ZG93blxuXHQqIEBjYXRlZ29yeSBJbnB1dFxuXHQqIFJlbWVtYmVyaW5nIHdoYXQga2V5cyAocmVmZXJyZWQgYnkgVW5pY29kZSkgYXJlIGRvd24uXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuYyhcIktleWJvYXJkXCIsIHtcblx0KiAgIGlzRG93bjogZnVuY3Rpb24gKGtleSkge1xuXHQqICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuXHQqICAgICAgIGtleSA9IENyYWZ0eS5rZXlzW2tleV07XG5cdCogICAgIH1cblx0KiAgICAgcmV0dXJuICEhQ3JhZnR5LmtleWRvd25ba2V5XTtcblx0KiAgIH1cblx0KiB9KTtcblx0KiB+fn5cblx0KiBAc2VlIEtleWJvYXJkLCBDcmFmdHkua2V5c1xuXHQqL1xuXG5cdGRldGVjdEJsdXI6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIHNlbGVjdGVkID0gKChlLmNsaWVudFggPiBDcmFmdHkuc3RhZ2UueCAmJiBlLmNsaWVudFggPCBDcmFmdHkuc3RhZ2UueCArIENyYWZ0eS52aWV3cG9ydC53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICAgICAgKGUuY2xpZW50WSA+IENyYWZ0eS5zdGFnZS55ICYmIGUuY2xpZW50WSA8IENyYWZ0eS5zdGFnZS55ICsgQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCkpO1xuXG5cdFx0aWYgKCFDcmFmdHkuc2VsZWN0ZWQgJiYgc2VsZWN0ZWQpXG5cdFx0XHRDcmFmdHkudHJpZ2dlcihcIkNyYWZ0eUZvY3VzXCIpO1xuXHRcdGlmIChDcmFmdHkuc2VsZWN0ZWQgJiYgIXNlbGVjdGVkKVxuXHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJDcmFmdHlCbHVyXCIpO1xuXG5cdFx0Q3JhZnR5LnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG5cdH0sXG5cblx0bW91c2VEaXNwYXRjaDogZnVuY3Rpb24gKGUpIHtcblx0XHRcblx0XHRpZiAoIUNyYWZ0eS5tb3VzZU9ianMpIHJldHVybjtcblx0XHRDcmFmdHkubGFzdEV2ZW50ID0gZTtcblxuXHRcdHZhciBtYXh6ID0gLTEsXG5cdFx0XHRjbG9zZXN0LFxuXHRcdFx0cSxcblx0XHRcdGkgPSAwLCBsLFxuXHRcdFx0cG9zID0gQ3JhZnR5LkRPTS50cmFuc2xhdGUoZS5jbGllbnRYLCBlLmNsaWVudFkpLFxuXHRcdFx0eCwgeSxcblx0XHRcdGR1cGVzID0ge30sXG5cdFx0XHR0YXIgPSBlLnRhcmdldCA/IGUudGFyZ2V0IDogZS5zcmNFbGVtZW50LFxuXHRcdFx0dHlwZSA9IGUudHlwZTtcblxuXHRcdC8vTm9ybWFsaXplIGJ1dHRvbiBhY2NvcmRpbmcgdG8gaHR0cDovL3VuaXhwYXBhLmNvbS9qcy9tb3VzZS5odG1sXG5cdFx0aWYgKGUud2hpY2ggPT0gbnVsbCkge1xuXHRcdFx0ZS5tb3VzZUJ1dHRvbiA9IChlLmJ1dHRvbiA8IDIpID8gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5MRUZUIDogKChlLmJ1dHRvbiA9PSA0KSA/IENyYWZ0eS5tb3VzZUJ1dHRvbnMuTUlERExFIDogQ3JhZnR5Lm1vdXNlQnV0dG9ucy5SSUdIVCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGUubW91c2VCdXR0b24gPSAoZS53aGljaCA8IDIpID8gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5MRUZUIDogKChlLndoaWNoID09IDIpID8gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5NSURETEUgOiBDcmFmdHkubW91c2VCdXR0b25zLlJJR0hUKTtcblx0XHR9XG5cblx0XHRlLnJlYWxYID0geCA9IENyYWZ0eS5tb3VzZVBvcy54ID0gcG9zLng7XG5cdFx0ZS5yZWFsWSA9IHkgPSBDcmFmdHkubW91c2VQb3MueSA9IHBvcy55O1xuXG5cdFx0Ly9pZiBpdCdzIGEgRE9NIGVsZW1lbnQgd2l0aCBNb3VzZSBjb21wb25lbnQgd2UgYXJlIGRvbmVcblx0XHRpZiAodGFyLm5vZGVOYW1lICE9IFwiQ0FOVkFTXCIpIHtcblx0XHRcdHdoaWxlICh0eXBlb2YgKHRhci5pZCkgIT0gJ3N0cmluZycgJiYgdGFyLmlkLmluZGV4T2YoJ2VudCcpID09IC0xKSB7XG5cdFx0XHRcdHRhciA9IHRhci5wYXJlbnROb2RlO1xuXHRcdFx0fVxuXHRcdFx0ZW50ID0gQ3JhZnR5KHBhcnNlSW50KHRhci5pZC5yZXBsYWNlKCdlbnQnLCAnJykpKVxuXHRcdFx0aWYgKGVudC5oYXMoJ01vdXNlJykgJiYgZW50LmlzQXQoeCwgeSkpXG5cdFx0XHRcdGNsb3Nlc3QgPSBlbnQ7XG5cdFx0fVxuXHRcdC8vZWxzZSB3ZSBzZWFyY2ggZm9yIGFuIGVudGl0eSB3aXRoIE1vdXNlIGNvbXBvbmVudFxuXHRcdGlmICghY2xvc2VzdCkge1xuXHRcdFx0cSA9IENyYWZ0eS5tYXAuc2VhcmNoKHsgX3g6IHgsIF95OiB5LCBfdzogMSwgX2g6IDEgfSwgZmFsc2UpO1xuXG5cdFx0XHRmb3IgKGwgPSBxLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuXHRcdFx0XHRpZiAoIXFbaV0uX19jLk1vdXNlIHx8ICFxW2ldLl92aXNpYmxlKSBjb250aW51ZTtcblxuXHRcdFx0XHR2YXIgY3VycmVudCA9IHFbaV0sXG5cdFx0XHRcdFx0ZmxhZyA9IGZhbHNlO1xuXG5cdFx0XHRcdC8vd2VlZCBvdXQgZHVwbGljYXRlc1xuXHRcdFx0XHRpZiAoZHVwZXNbY3VycmVudFswXV0pIGNvbnRpbnVlO1xuXHRcdFx0XHRlbHNlIGR1cGVzW2N1cnJlbnRbMF1dID0gdHJ1ZTtcblxuXHRcdFx0XHRpZiAoY3VycmVudC5tYXBBcmVhKSB7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnQubWFwQXJlYS5jb250YWluc1BvaW50KHgsIHkpKSB7XG5cdFx0XHRcdFx0XHRmbGFnID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudC5pc0F0KHgsIHkpKSBmbGFnID0gdHJ1ZTtcblxuXHRcdFx0XHRpZiAoZmxhZyAmJiAoY3VycmVudC5feiA+PSBtYXh6IHx8IG1heHogPT09IC0xKSkge1xuXHRcdFx0XHRcdC8vaWYgdGhlIFogaXMgdGhlIHNhbWUsIHNlbGVjdCB0aGUgY2xvc2VzdCBHVUlEXG5cdFx0XHRcdFx0aWYgKGN1cnJlbnQuX3ogPT09IG1heHogJiYgY3VycmVudFswXSA8IGNsb3Nlc3RbMF0pIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXh6ID0gY3VycmVudC5fejtcblx0XHRcdFx0XHRjbG9zZXN0ID0gY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vZm91bmQgY2xvc2VzdCBvYmplY3QgdG8gbW91c2Vcblx0XHRpZiAoY2xvc2VzdCkge1xuXHRcdFx0Ly9jbGljayBtdXN0IG1vdXNlZG93biBhbmQgb3V0IG9uIHRpbGVcblx0XHRcdGlmICh0eXBlID09PSBcIm1vdXNlZG93blwiKSB7XG5cdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIk1vdXNlRG93blwiLCBlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJtb3VzZXVwXCIpIHtcblx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiTW91c2VVcFwiLCBlKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PSBcImRibGNsaWNrXCIpIHtcblx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiRG91YmxlQ2xpY2tcIiwgZSk7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT0gXCJjbGlja1wiKSB7XG5cdFx0XHRcdGNsb3Nlc3QudHJpZ2dlcihcIkNsaWNrXCIsIGUpO1xuXHRcdFx0fWVsc2UgaWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIHtcblx0XHRcdFx0Y2xvc2VzdC50cmlnZ2VyKFwiTW91c2VNb3ZlXCIsIGUpO1xuXHRcdFx0XHRpZiAodGhpcy5vdmVyICE9PSBjbG9zZXN0KSB7IC8vaWYgbmV3IG1vdXNlbW92ZSwgaXQgaXMgb3ZlclxuXHRcdFx0XHRcdGlmICh0aGlzLm92ZXIpIHtcblx0XHRcdFx0XHRcdHRoaXMub3Zlci50cmlnZ2VyKFwiTW91c2VPdXRcIiwgZSk7IC8vaWYgb3ZlciB3YXNuJ3QgbnVsbCwgc2VuZCBtb3VzZW91dFxuXHRcdFx0XHRcdFx0dGhpcy5vdmVyID0gbnVsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5vdmVyID0gY2xvc2VzdDtcblx0XHRcdFx0XHRjbG9zZXN0LnRyaWdnZXIoXCJNb3VzZU92ZXJcIiwgZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBjbG9zZXN0LnRyaWdnZXIodHlwZSwgZSk7IC8vdHJpZ2dlciB3aGF0ZXZlciBpdCBpc1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIiAmJiB0aGlzLm92ZXIpIHtcblx0XHRcdFx0dGhpcy5vdmVyLnRyaWdnZXIoXCJNb3VzZU91dFwiLCBlKTtcblx0XHRcdFx0dGhpcy5vdmVyID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlID09PSBcIm1vdXNlZG93blwiKSB7XG5cdFx0XHRcdENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soJ3N0YXJ0JywgZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlID09PSBcIm1vdXNlbW92ZVwiKSB7XG5cdFx0XHRcdENyYWZ0eS52aWV3cG9ydC5tb3VzZWxvb2soJ2RyYWcnLCBlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGUgPT0gXCJtb3VzZXVwXCIpIHtcblx0XHRcdFx0Q3JhZnR5LnZpZXdwb3J0Lm1vdXNlbG9vaygnc3RvcCcpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0eXBlID09PSBcIm1vdXNlbW92ZVwiKSB7XG5cdFx0XHR0aGlzLmxhc3RFdmVudCA9IGU7XG5cdFx0fVxuXG5cdH0sXG5cblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkudG91Y2hEaXNwYXRjaFxuICAgICogQGNhdGVnb3J5IElucHV0XG4gICAgKiBcbiAgICAqIFRvdWNoRXZlbnRzIGhhdmUgYSBkaWZmZXJlbnQgc3RydWN0dXJlIHRoZW4gTW91c2VFdmVudHMuXG4gICAgKiBUaGUgcmVsZXZhbnQgZGF0YSBsaXZlcyBpbiBlLmNoYW5nZWRUb3VjaGVzWzBdLlxuICAgICogVG8gbm9ybWFsaXplIFRvdWNoRXZlbnRzIHdlIGNhdGNoIGVtIGFuZCBkaXNwYXRjaCBhIG1vY2sgTW91c2VFdmVudCBpbnN0ZWFkLlxuICAgICogXG4gICAgKiBAc2VlIENyYWZ0eS5tb3VzZURpc3BhdGNoXG4gICAgKi9cblxuICAgIHRvdWNoRGlzcGF0Y2g6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIHR5cGUsXG4gICAgICAgICAgICBsYXN0RXZlbnQgPSBDcmFmdHkubGFzdEV2ZW50O1xuXG4gICAgICAgIGlmIChlLnR5cGUgPT09IFwidG91Y2hzdGFydFwiKSB0eXBlID0gXCJtb3VzZWRvd25cIjtcbiAgICAgICAgZWxzZSBpZiAoZS50eXBlID09PSBcInRvdWNobW92ZVwiKSB0eXBlID0gXCJtb3VzZW1vdmVcIjtcbiAgICAgICAgZWxzZSBpZiAoZS50eXBlID09PSBcInRvdWNoZW5kXCIpIHR5cGUgPSBcIm1vdXNldXBcIjtcbiAgICAgICAgZWxzZSBpZiAoZS50eXBlID09PSBcInRvdWNoY2FuY2VsXCIpIHR5cGUgPSBcIm1vdXNldXBcIjtcbiAgICAgICAgZWxzZSBpZiAoZS50eXBlID09PSBcInRvdWNobGVhdmVcIikgdHlwZSA9IFwibW91c2V1cFwiO1xuICAgICAgICBcbiAgICAgICAgaWYoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZpcnN0ID0gZS50b3VjaGVzWzBdO1xuICAgICAgICB9IGVsc2UgaWYoZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgZmlyc3QgPSBlLmNoYW5nZWRUb3VjaGVzWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50XCIpO1xuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsXG4gICAgICAgICAgICBmaXJzdC5zY3JlZW5YLCBcbiAgICAgICAgICAgIGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgICBmaXJzdC5jbGllbnRYLCBcbiAgICAgICAgICAgIGZpcnN0LmNsaWVudFksIFxuICAgICAgICAgICAgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIGUucmVsYXRlZFRhcmdldFxuICAgICAgICApO1xuXG4gICAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcblxuICAgICAgICAvLyB0cmlnZ2VyIGNsaWNrIHdoZW4gaXQgc2hvdWxkIGJlIHRyaWdnZXJlZFxuICAgICAgICBpZiAobGFzdEV2ZW50ICE9IG51bGwgJiYgbGFzdEV2ZW50LnR5cGUgPT0gJ21vdXNlZG93bicgJiYgdHlwZSA9PSAnbW91c2V1cCcpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnY2xpY2snO1xuXG4gICAgICAgICAgICB2YXIgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRcIik7XG4gICAgICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsXG4gICAgICAgICAgICAgICAgZmlyc3Quc2NyZWVuWCwgXG4gICAgICAgICAgICAgICAgZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAgICAgICBmaXJzdC5jbGllbnRYLCBcbiAgICAgICAgICAgICAgICBmaXJzdC5jbGllbnRZLCBcbiAgICAgICAgICAgICAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgZS5yZWxhdGVkVGFyZ2V0XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlbHNlIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICB9LFxuXG5cblx0LyoqQFxuXHQqICNLZXlib2FyZEV2ZW50XG5cdCogQGNhdGVnb3J5IElucHV0XG4gICAgKiBLZXlib2FyZCBFdmVudCB0cmlnZ2VyZWQgYnkgQ3JhZnR5IENvcmVcblx0KiBAdHJpZ2dlciBLZXlEb3duIC0gaXMgdHJpZ2dlcmVkIGZvciBlYWNoIGVudGl0eSB3aGVuIHRoZSBET00gJ2tleWRvd24nIGV2ZW50IGlzIHRyaWdnZXJlZC5cblx0KiBAdHJpZ2dlciBLZXlVcCAtIGlzIHRyaWdnZXJlZCBmb3IgZWFjaCBlbnRpdHkgd2hlbiB0aGUgRE9NICdrZXl1cCcgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG4gICAgKiBDcmFmdHkuZShcIjJELCBET00sIENvbG9yXCIpXG4gICAgKiAgIC5hdHRyKHt4OiAxMDAsIHk6IDEwMCwgdzogNTAsIGg6IDUwfSlcbiAgICAqICAgLmNvbG9yKFwicmVkXCIpXG4gICAgKiAgIC5iaW5kKCdLZXlEb3duJywgZnVuY3Rpb24oZSkge1xuICAgICogICAgIGlmKGUua2V5ID09IENyYWZ0eS5rZXlzWydMRUZUX0FSUk9XJ10pIHtcbiAgICAqICAgICAgIHRoaXMueD10aGlzLngtMTtcbiAgICAqICAgICB9IGVsc2UgaWYgKGUua2V5ID09IENyYWZ0eS5rZXlzWydSSUdIVF9BUlJPVyddKSB7XG4gICAgKiAgICAgdGhpcy54PXRoaXMueCsxO1xuICAgICogICAgIH0gZWxzZSBpZiAoZS5rZXkgPT0gQ3JhZnR5LmtleXNbJ1VQX0FSUk9XJ10pIHtcbiAgICAqICAgICB0aGlzLnk9dGhpcy55LTE7XG4gICAgKiAgICAgfSBlbHNlIGlmIChlLmtleSA9PSBDcmFmdHkua2V5c1snRE9XTl9BUlJPVyddKSB7XG4gICAgKiAgICAgdGhpcy55PXRoaXMueSsxO1xuICAgICogICAgIH1cbiAgICAqICAgfSk7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkua2V5c1xuXHQqL1xuXG5cdC8qKkBcblx0KiAjQ3JhZnR5LmV2ZW50T2JqZWN0XG5cdCogQGNhdGVnb3J5IElucHV0XG5cdCogXG5cdCogRXZlbnQgT2JqZWN0IHVzZWQgaW4gQ3JhZnR5IGZvciBjcm9zcyBicm93c2VyIGNvbXBhdGliaWxpdHlcblx0Ki9cblxuXHQvKipAXG5cdCogIy5rZXlcblx0KiBAY29tcCBDcmFmdHkuZXZlbnRPYmplY3Rcblx0KiBcblx0KiBVbmljb2RlIG9mIHRoZSBrZXkgcHJlc3NlZFxuXHQqL1xuXHRrZXlib2FyZERpc3BhdGNoOiBmdW5jdGlvbiAoZSkge1xuXHRcdC8vIFVzZSBhIENyYWZ0eS1zdGFuZGFyZCBldmVudCBvYmplY3QgdG8gYXZvaWQgY3Jvc3MtYnJvd3NlciBpc3N1ZXNcblx0XHR2YXIgb3JpZ2luYWwgPSBlLFxuXHRcdFx0ZXZudCA9IHt9LFxuXHRcdFx0cHJvcHMgPSBcImNoYXIgY2hhckNvZGUga2V5Q29kZSB0eXBlIHNoaWZ0S2V5IGN0cmxLZXkgbWV0YUtleSB0aW1lc3RhbXBcIi5zcGxpdChcIiBcIik7XG5cdFx0Zm9yICh2YXIgaSA9IHByb3BzLmxlbmd0aDsgaTspIHtcblx0XHRcdHZhciBwcm9wID0gcHJvcHNbLS1pXTtcblx0XHRcdGV2bnRbcHJvcF0gPSBvcmlnaW5hbFtwcm9wXTtcblx0XHR9XG5cdFx0ZXZudC53aGljaCA9IG9yaWdpbmFsLmNoYXJDb2RlICE9IG51bGwgPyBvcmlnaW5hbC5jaGFyQ29kZSA6IG9yaWdpbmFsLmtleUNvZGU7XG5cdFx0ZXZudC5rZXkgPSBvcmlnaW5hbC5rZXlDb2RlIHx8IG9yaWdpbmFsLndoaWNoO1xuXHRcdGV2bnQub3JpZ2luYWxFdmVudCA9IG9yaWdpbmFsO1xuXHRcdGUgPSBldm50O1xuXG5cdFx0aWYgKGUudHlwZSA9PT0gXCJrZXlkb3duXCIpIHtcblx0XHRcdGlmIChDcmFmdHkua2V5ZG93bltlLmtleV0gIT09IHRydWUpIHtcblx0XHRcdFx0Q3JhZnR5LmtleWRvd25bZS5rZXldID0gdHJ1ZTtcblx0XHRcdFx0Q3JhZnR5LnRyaWdnZXIoXCJLZXlEb3duXCIsIGUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoZS50eXBlID09PSBcImtleXVwXCIpIHtcblx0XHRcdGRlbGV0ZSBDcmFmdHkua2V5ZG93bltlLmtleV07XG5cdFx0XHRDcmFmdHkudHJpZ2dlcihcIktleVVwXCIsIGUpO1xuXHRcdH1cblxuXHRcdC8vcHJldmVudCBkZWZhdWx0IGFjdGlvbnMgZm9yIGFsbCBrZXlzIGV4Y2VwdCBiYWNrc3BhY2UgYW5kIEYxLUYxMi5cblx0XHQvL0Ftb25nIG90aGVycyB0aGlzIHByZXZlbnQgdGhlIGFycm93IGtleXMgZnJvbSBzY3JvbGxpbmcgdGhlIHBhcmVudCBwYWdlXG5cdFx0Ly9vZiBhbiBpZnJhbWUgaG9zdGluZyB0aGUgZ2FtZVxuXHRcdGlmKENyYWZ0eS5zZWxlY3RlZCAmJiAhKGUua2V5ID09IDggfHwgZS5rZXkgPj0gMTEyICYmIGUua2V5IDw9IDEzNSkpIHtcblx0XHRcdGlmKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZWxzZSBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG5cblx0XHRcdGlmKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGVsc2UgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vaW5pdGlhbGl6ZSB0aGUgaW5wdXQgZXZlbnRzIG9ubG9hZFxuQ3JhZnR5LmJpbmQoXCJMb2FkXCIsIGZ1bmN0aW9uICgpIHtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIFwia2V5ZG93blwiLCBDcmFmdHkua2V5Ym9hcmREaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBcImtleXVwXCIsIENyYWZ0eS5rZXlib2FyZERpc3BhdGNoKTtcblxuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vkb3duXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNldXBcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgZG9jdW1lbnQuYm9keSwgXCJtb3VzZXVwXCIsIENyYWZ0eS5kZXRlY3RCbHVyKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlbW92ZVwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJjbGlja1wiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJkYmxjbGlja1wiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoc3RhcnRcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2htb3ZlXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0Q3JhZnR5LmFkZEV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoZW5kXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcbiAgICBDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hjYW5jZWxcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuICAgIENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGxlYXZlXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcbiAgIH0pO1xuXG5DcmFmdHkuYmluZChcIkNyYWZ0eVN0b3BcIiwgZnVuY3Rpb24gKCkge1xuXHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgXCJrZXlkb3duXCIsIENyYWZ0eS5rZXlib2FyZERpc3BhdGNoKTtcblx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIFwia2V5dXBcIiwgQ3JhZnR5LmtleWJvYXJkRGlzcGF0Y2gpO1xuXG5cdGlmIChDcmFmdHkuc3RhZ2UpIHtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2Vkb3duXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlbW92ZVwiLCBDcmFmdHkubW91c2VEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcImNsaWNrXCIsIENyYWZ0eS5tb3VzZURpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwiZGJsY2xpY2tcIiwgQ3JhZnR5Lm1vdXNlRGlzcGF0Y2gpO1xuXG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoc3RhcnRcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaG1vdmVcIiwgQ3JhZnR5LnRvdWNoRGlzcGF0Y2gpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJ0b3VjaGVuZFwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcInRvdWNoY2FuY2VsXCIsIENyYWZ0eS50b3VjaERpc3BhdGNoKTtcblx0XHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwidG91Y2hsZWF2ZVwiLCBDcmFmdHkudG91Y2hEaXNwYXRjaCk7XG5cdH1cblxuXHRDcmFmdHkucmVtb3ZlRXZlbnQodGhpcywgZG9jdW1lbnQuYm9keSwgXCJtb3VzZXVwXCIsIENyYWZ0eS5kZXRlY3RCbHVyKTtcbn0pO1xuXG4vKipAXG4qICNNb3VzZVxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogUHJvdmlkZXMgdGhlIGVudGl0eSB3aXRoIG1vdXNlIHJlbGF0ZWQgZXZlbnRzXG4qIEB0cmlnZ2VyIE1vdXNlT3ZlciAtIHdoZW4gdGhlIG1vdXNlIGVudGVycyB0aGUgZW50aXR5IC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBNb3VzZU91dCAtIHdoZW4gdGhlIG1vdXNlIGxlYXZlcyB0aGUgZW50aXR5IC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBNb3VzZURvd24gLSB3aGVuIHRoZSBtb3VzZSBidXR0b24gaXMgcHJlc3NlZCBvbiB0aGUgZW50aXR5IC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBNb3VzZVVwIC0gd2hlbiB0aGUgbW91c2UgYnV0dG9uIGlzIHJlbGVhc2VkIG9uIHRoZSBlbnRpdHkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIENsaWNrIC0gd2hlbiB0aGUgdXNlciBjbGlja3MgdGhlIGVudGl0eS4gW1NlZSBkb2N1bWVudGF0aW9uXShodHRwOi8vd3d3LnF1aXJrc21vZGUub3JnL2RvbS9ldmVudHMvY2xpY2suaHRtbCkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIERvdWJsZUNsaWNrIC0gd2hlbiB0aGUgdXNlciBkb3VibGUgY2xpY2tzIHRoZSBlbnRpdHkgLSBNb3VzZUV2ZW50XG4qIEB0cmlnZ2VyIE1vdXNlTW92ZSAtIHdoZW4gdGhlIG1vdXNlIGlzIG92ZXIgdGhlIGVudGl0eSBhbmQgbW92ZXMgLSBNb3VzZUV2ZW50XG4qIENyYWZ0eSBhZGRzIHRoZSBtb3VzZUJ1dHRvbiBwcm9wZXJ0eSB0byBNb3VzZUV2ZW50cyB0aGF0IG1hdGNoIG9uZSBvZlxuKlxuKiB+fn5cbiogLSBDcmFmdHkubW91c2VCdXR0b25zLkxFRlRcbiogLSBDcmFmdHkubW91c2VCdXR0b25zLlJJR0hUXG4qIC0gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5NSURETEVcbiogfn5+XG4qIFxuKiBAZXhhbXBsZVxuKiB+fn5cbiogbXlFbnRpdHkuYmluZCgnQ2xpY2snLCBmdW5jdGlvbigpIHtcbiogICAgICBjb25zb2xlLmxvZyhcIkNsaWNrZWQhIVwiKTtcbiogfSlcbipcbiogbXlFbnRpdHkuYmluZCgnTW91c2VVcCcsIGZ1bmN0aW9uKGUpIHtcbiogICAgaWYoIGUubW91c2VCdXR0b24gPT0gQ3JhZnR5Lm1vdXNlQnV0dG9ucy5SSUdIVCApXG4qICAgICAgICBjb25zb2xlLmxvZyhcIkNsaWNrZWQgcmlnaHQgYnV0dG9uXCIpO1xuKiB9KVxuKiB+fn5cbiovXG5DcmFmdHkuYyhcIk1vdXNlXCIsIHtcblx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdENyYWZ0eS5tb3VzZU9ianMrKztcblx0XHR0aGlzLmJpbmQoXCJSZW1vdmVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0Q3JhZnR5Lm1vdXNlT2Jqcy0tO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmFyZWFNYXBcblx0KiBAY29tcCBNb3VzZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5hcmVhTWFwKENyYWZ0eS5wb2x5Z29uIHBvbHlnb24pXG5cdCogQHBhcmFtIHBvbHlnb24gLSBJbnN0YW5jZSBvZiBDcmFmdHkucG9seWdvbiB1c2VkIHRvIGNoZWNrIGlmIHRoZSBtb3VzZSBjb29yZGluYXRlcyBhcmUgaW5zaWRlIHRoaXMgcmVnaW9uXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFyZWFNYXAoQXJyYXkgcG9pbnQxLCAuLiwgQXJyYXkgcG9pbnROKVxuXHQqIEBwYXJhbSBwb2ludCMgLSBBcnJheSB3aXRoIGFuIGB4YCBhbmQgYHlgIHBvc2l0aW9uIHRvIGdlbmVyYXRlIGEgcG9seWdvblxuXHQqIFxuXHQqIEFzc2lnbiBhIHBvbHlnb24gdG8gdGhlIGVudGl0eSBzbyB0aGF0IG1vdXNlIGV2ZW50cyB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGlmXG5cdCogdGhlIGNvb3JkaW5hdGVzIGFyZSBpbnNpZGUgdGhlIGdpdmVuIHBvbHlnb24uXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIENvbG9yLCBNb3VzZVwiKVxuXHQqICAgICAuY29sb3IoXCJyZWRcIilcblx0KiAgICAgLmF0dHIoeyB3OiAxMDAsIGg6IDEwMCB9KVxuXHQqICAgICAuYmluZCgnTW91c2VPdmVyJywgZnVuY3Rpb24oKSB7Y29uc29sZS5sb2coXCJvdmVyXCIpfSlcblx0KiAgICAgLmFyZWFNYXAoWzAsMF0sIFs1MCwwXSwgWzUwLDUwXSwgWzAsNTBdKVxuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LnBvbHlnb25cblx0Ki9cblx0YXJlYU1hcDogZnVuY3Rpb24gKHBvbHkpIHtcblx0XHQvL2NyZWF0ZSBwb2x5Z29uXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHQvL2NvbnZlcnQgYXJncyB0byBhcnJheSB0byBjcmVhdGUgcG9seWdvblxuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXHRcdFx0cG9seSA9IG5ldyBDcmFmdHkucG9seWdvbihhcmdzKTtcblx0XHR9XG5cblx0XHRwb2x5LnNoaWZ0KHRoaXMuX3gsIHRoaXMuX3kpO1xuXHRcdC8vdGhpcy5tYXAgPSBwb2x5O1xuXHRcdHRoaXMubWFwQXJlYSA9IHBvbHk7XG5cblx0XHR0aGlzLmF0dGFjaCh0aGlzLm1hcEFyZWEpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjRHJhZ2dhYmxlXG4qIEBjYXRlZ29yeSBJbnB1dFxuKiBFbmFibGUgZHJhZyBhbmQgZHJvcCBvZiB0aGUgZW50aXR5LlxuKiBAdHJpZ2dlciBEcmFnZ2luZyAtIGlzIHRyaWdnZXJlZCBlYWNoIGZyYW1lIHRoZSBlbnRpdHkgaXMgYmVpbmcgZHJhZ2dlZCAtIE1vdXNlRXZlbnRcbiogQHRyaWdnZXIgU3RhcnREcmFnIC0gaXMgdHJpZ2dlcmVkIHdoZW4gZHJhZ2dpbmcgYmVnaW5zIC0gTW91c2VFdmVudFxuKiBAdHJpZ2dlciBTdG9wRHJhZyAtIGlzIHRyaWdnZXJlZCB3aGVuIGRyYWdnaW5nIGVuZHMgLSBNb3VzZUV2ZW50XG4qL1xuQ3JhZnR5LmMoXCJEcmFnZ2FibGVcIiwge1xuICBfb3JpZ01vdXNlRE9NUG9zOiBudWxsLFxuXHRfb2xkWDogbnVsbCxcblx0X29sZFk6IG51bGwsXG5cdF9kcmFnZ2luZzogZmFsc2UsXG5cdF9kaXI6bnVsbCxcblxuXHRfb25kcmFnOiBudWxsLFxuXHRfb25kb3duOiBudWxsLFxuXHRfb251cDogbnVsbCxcblxuXHQvL05vdGU6IHRoZSBjb2RlIGlzIG5vdGUgdGVzdGVkIHdpdGggem9vbSwgZXRjLiwgdGhhdCBtYXkgZGlzdG9ydCB0aGUgZGlyZWN0aW9uIGJldHdlZW4gdGhlIHZpZXdwb3J0IGFuZCB0aGUgY29vcmRpbmF0ZSBvbiB0aGUgY2FudmFzLlxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yZXF1aXJlcyhcIk1vdXNlXCIpO1xuXHRcdFxuXHRcdHRoaXMuX29uZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgcG9zID0gQ3JhZnR5LkRPTS50cmFuc2xhdGUoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuXG5cdFx0XHQvLyBpZ25vcmUgaW52YWxpZCAwIDAgcG9zaXRpb24gLSBzdHJhbmdlIHByb2JsZW0gb24gaXBhZFxuXHRcdFx0aWYgKHBvcy54ID09IDAgfHwgcG9zLnkgPT0gMCkge1xuXHRcdFx0ICAgIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0ICAgIFxuXHRcdFx0aWYodGhpcy5fZGlyKSB7XG5cdFx0XHQgICAgdmFyIGxlbiA9IChwb3MueCAtIHRoaXMuX29yaWdNb3VzZURPTVBvcy54KSAqIHRoaXMuX2Rpci54ICsgKHBvcy55IC0gdGhpcy5fb3JpZ01vdXNlRE9NUG9zLnkpICogdGhpcy5fZGlyLnk7XG5cdFx0XHQgICAgdGhpcy54ID0gdGhpcy5fb2xkWCArIGxlbiAqIHRoaXMuX2Rpci54O1xuXHRcdFx0ICAgIHRoaXMueSA9IHRoaXMuX29sZFkgKyBsZW4gKiB0aGlzLl9kaXIueTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgICAgdGhpcy54ID0gdGhpcy5fb2xkWCArIChwb3MueCAtIHRoaXMuX29yaWdNb3VzZURPTVBvcy54KTtcblx0XHRcdCAgICB0aGlzLnkgPSB0aGlzLl9vbGRZICsgKHBvcy55IC0gdGhpcy5fb3JpZ01vdXNlRE9NUG9zLnkpO1xuXHRcdFx0fVxuXHQgICAgXG5cdFx0XHR0aGlzLnRyaWdnZXIoXCJEcmFnZ2luZ1wiLCBlKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5fb25kb3duID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChlLm1vdXNlQnV0dG9uICE9PSBDcmFmdHkubW91c2VCdXR0b25zLkxFRlQpIHJldHVybjtcblx0XHRcdHRoaXMuX3N0YXJ0RHJhZyhlKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5fb251cCA9IGZ1bmN0aW9uIHVwcGVyKGUpIHtcblx0XHRcdGlmICh0aGlzLl9kcmFnZ2luZyA9PSB0cnVlKSB7XG5cdFx0XHQgICAgQ3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlbW92ZVwiLCB0aGlzLl9vbmRyYWcpO1xuXHRcdFx0ICAgIENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIHRoaXMuX29udXApO1xuXHRcdFx0ICAgIHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdFx0XHQgICAgdGhpcy50cmlnZ2VyKFwiU3RvcERyYWdcIiwgZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuZW5hYmxlRHJhZygpO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmRyYWdEaXJlY3Rpb25cblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZHJhZ0RpcmVjdGlvbigpXG4gICAgKiBSZW1vdmUgYW55IHByZXZpb3VzbHkgc3BlY2lmaWVkIGRpcmVjdGlvbi5cbiAgICAqXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmRyYWdEaXJlY3Rpb24odmVjdG9yKVxuICAgICogQHBhcmFtIHZlY3RvciAtIE9mIHRoZSBmb3JtIG9mIHt4OiB2YWx4LCB5OiB2YWx5fSwgdGhlIHZlY3RvciAodmFseCwgdmFseSkgZGVub3RlcyB0aGUgbW92ZSBkaXJlY3Rpb24uXG4gICAgKiBcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZHJhZ0RpcmVjdGlvbihkZWdyZWUpXG4gICAgKiBAcGFyYW0gZGVncmVlIC0gQSBudW1iZXIsIHRoZSBkZWdyZWUgKGNsb2Nrd2lzZSkgb2YgdGhlIG1vdmUgZGlyZWN0aW9uIHdpdGggcmVzcGVjdCB0byB0aGUgeCBheGlzLiBcblx0KiBTcGVjaWZ5IHRoZSBkcmFnZ2luZyBkaXJlY3Rpb24uXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLmRyYWdEaXJlY3Rpb24oKVxuXHQqIHRoaXMuZHJhZ0RpcmVjdGlvbih7eDoxLCB5OjB9KSAvL0hvcml6b250YWxcblx0KiB0aGlzLmRyYWdEaXJlY3Rpb24oe3g6MCwgeToxfSkgLy9WZXJ0aWNhbFxuICAgICogLy8gTm90ZTogYmVjYXVzZSBvZiB0aGUgb3JpZW50YXRpb24gb2YgeCBhbmQgeSBheGlzLFxuICAgICogLy8gdGhpcyBpcyA0NSBkZWdyZWUgY2xvY2t3aXNlIHdpdGggcmVzcGVjdCB0byB0aGUgeCBheGlzLlxuXHQqIHRoaXMuZHJhZ0RpcmVjdGlvbih7eDoxLCB5OjF9KSAvLzQ1IGRlZ3JlZS5cblx0KiB0aGlzLmRyYWdEaXJlY3Rpb24oNjApIC8vNjAgZGVncmVlLlxuXHQqIH5+flxuXHQqL1xuXHRkcmFnRGlyZWN0aW9uOiBmdW5jdGlvbihkaXIpIHtcblx0XHRpZiAodHlwZW9mIGRpciA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuX2Rpcj1udWxsO1xuXHRcdH0gZWxzZSBpZiAoKFwiXCIgKyBwYXJzZUludChkaXIpKSA9PSBkaXIpIHsgLy9kaXIgaXMgYSBudW1iZXJcbiAgICAgIHRoaXMuX2Rpcj17XG4gICAgICAgIHg6IE1hdGguY29zKGRpci8xODAqTWF0aC5QSSlcbiAgICAgICAgLCB5OiBNYXRoLnNpbihkaXIvMTgwKk1hdGguUEkpXG4gICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciByPU1hdGguc3FydChkaXIueCAqIGRpci54ICsgZGlyLnkgKiBkaXIueSlcblx0XHRcdHRoaXMuX2Rpcj17XG4gICAgICAgIHg6IGRpci54L3JcbiAgICAgICAgLCB5OiBkaXIueS9yXG4gICAgICB9O1xuXHRcdH1cblx0fSxcblx0XG5cdFxuXHQvKipAXG5cdCogIy5fc3RhcnREcmFnXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogSW50ZXJuYWwgbWV0aG9kIGZvciBzdGFydGluZyBhIGRyYWcgb2YgYW4gZW50aXR5IGVpdGhlciBwcm9ncmFtYXRpY2FsbHkgb3IgdmlhIE1vdXNlIGNsaWNrXG5cdCpcblx0KiBAcGFyYW0gZSAtIGEgbW91c2UgZXZlbnRcblx0Ki9cblx0X3N0YXJ0RHJhZzogZnVuY3Rpb24oZSl7XG5cdFx0dGhpcy5fb3JpZ01vdXNlRE9NUG9zID0gQ3JhZnR5LkRPTS50cmFuc2xhdGUoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuXHRcdHRoaXMuX29sZFggPSB0aGlzLl94O1xuXHRcdHRoaXMuX29sZFkgPSB0aGlzLl95O1xuXHRcdHRoaXMuX2RyYWdnaW5nID0gdHJ1ZTtcblxuXHRcdENyYWZ0eS5hZGRFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZW1vdmVcIiwgdGhpcy5fb25kcmFnKTtcblx0XHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCB0aGlzLl9vbnVwKTtcblx0XHR0aGlzLnRyaWdnZXIoXCJTdGFydERyYWdcIiwgZSk7XG5cdH0sXG5cdFxuXHQvKipAXG5cdCogIy5zdG9wRHJhZ1xuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5zdG9wRHJhZyh2b2lkKVxuXHQqIEB0cmlnZ2VyIFN0b3BEcmFnIC0gQ2FsbGVkIHJpZ2h0IGFmdGVyIHRoZSBtb3VzZSBsaXN0ZW5lcnMgYXJlIHJlbW92ZWRcblx0KiBcblx0KiBTdG9wIHRoZSBlbnRpdHkgZnJvbSBkcmFnZ2luZy4gRXNzZW50aWFsbHkgcmVwcm9kdWNpbmcgdGhlIGRyb3AuXG5cdCogXG5cdCogQHNlZSAuc3RhcnREcmFnXG5cdCovXG5cdHN0b3BEcmFnOiBmdW5jdGlvbiAoKSB7XG5cdFx0Q3JhZnR5LnJlbW92ZUV2ZW50KHRoaXMsIENyYWZ0eS5zdGFnZS5lbGVtLCBcIm1vdXNlbW92ZVwiLCB0aGlzLl9vbmRyYWcpO1xuXHRcdENyYWZ0eS5yZW1vdmVFdmVudCh0aGlzLCBDcmFmdHkuc3RhZ2UuZWxlbSwgXCJtb3VzZXVwXCIsIHRoaXMuX29udXApO1xuXG5cdFx0dGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHR0aGlzLnRyaWdnZXIoXCJTdG9wRHJhZ1wiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5zdGFydERyYWdcblx0KiBAY29tcCBEcmFnZ2FibGVcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuc3RhcnREcmFnKHZvaWQpXG5cdCogXG5cdCogTWFrZSB0aGUgZW50aXR5IGZvbGxvdyB0aGUgbW91c2UgcG9zaXRpb25zLlxuXHQqIFxuXHQqIEBzZWUgLnN0b3BEcmFnXG5cdCovXG5cdHN0YXJ0RHJhZzogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5fZHJhZ2dpbmcpIHtcblx0XHRcdC8vVXNlIHRoZSBsYXN0IGtub3duIHBvc2l0aW9uIG9mIHRoZSBtb3VzZVxuXHRcdFx0dGhpcy5fc3RhcnREcmFnKENyYWZ0eS5sYXN0RXZlbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5lbmFibGVEcmFnXG5cdCogQGNvbXAgRHJhZ2dhYmxlXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmVuYWJsZURyYWcodm9pZClcblx0KiBcblx0KiBSZWJpbmQgdGhlIG1vdXNlIGV2ZW50cy4gVXNlIGlmIGAuZGlzYWJsZURyYWdgIGhhcyBiZWVuIGNhbGxlZC5cblx0KiBcblx0KiBAc2VlIC5kaXNhYmxlRHJhZ1xuXHQqL1xuXHRlbmFibGVEcmFnOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5iaW5kKFwiTW91c2VEb3duXCIsIHRoaXMuX29uZG93bik7XG5cblx0XHRDcmFmdHkuYWRkRXZlbnQodGhpcywgQ3JhZnR5LnN0YWdlLmVsZW0sIFwibW91c2V1cFwiLCB0aGlzLl9vbnVwKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG5cdCogIy5kaXNhYmxlRHJhZ1xuXHQqIEBjb21wIERyYWdnYWJsZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5kaXNhYmxlRHJhZyh2b2lkKVxuXHQqIFxuXHQqIFN0b3BzIGVudGl0eSBmcm9tIGJlaW5nIGRyYWdnYWJsZS4gUmVlbmFibGUgd2l0aCBgLmVuYWJsZURyYWcoKWAuXG5cdCogXG5cdCogQHNlZSAuZW5hYmxlRHJhZ1xuXHQqL1xuXHRkaXNhYmxlRHJhZzogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMudW5iaW5kKFwiTW91c2VEb3duXCIsIHRoaXMuX29uZG93bik7XG5cdFx0dGhpcy5zdG9wRHJhZygpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjS2V5Ym9hcmRcbiogQGNhdGVnb3J5IElucHV0XG4qIEdpdmUgZW50aXRpZXMga2V5Ym9hcmQgZXZlbnRzIChga2V5ZG93bmAgYW5kIGBrZXl1cGApLlxuKi9cbkNyYWZ0eS5jKFwiS2V5Ym9hcmRcIiwge1xuLyoqQFxuXHQqICMuaXNEb3duXG5cdCogQGNvbXAgS2V5Ym9hcmRcblx0KiBAc2lnbiBwdWJsaWMgQm9vbGVhbiBpc0Rvd24oU3RyaW5nIGtleU5hbWUpXG5cdCogQHBhcmFtIGtleU5hbWUgLSBOYW1lIG9mIHRoZSBrZXkgdG8gY2hlY2suIFNlZSBgQ3JhZnR5LmtleXNgLlxuXHQqIEBzaWduIHB1YmxpYyBCb29sZWFuIGlzRG93bihOdW1iZXIga2V5Q29kZSlcblx0KiBAcGFyYW0ga2V5Q29kZSAtIEtleSBjb2RlIGluIGBDcmFmdHkua2V5c2AuXG5cdCogXG5cdCogRGV0ZXJtaW5lIGlmIGEgY2VydGFpbiBrZXkgaXMgY3VycmVudGx5IGRvd24uXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBlbnRpdHkucmVxdWlyZXMoJ0tleWJvYXJkJykuYmluZCgnS2V5RG93bicsIGZ1bmN0aW9uICgpIHsgaWYgKHRoaXMuaXNEb3duKCdTUEFDRScpKSBqdW1wKCk7IH0pO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LmtleXNcblx0Ki9cblx0aXNEb3duOiBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0aWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdGtleSA9IENyYWZ0eS5rZXlzW2tleV07XG5cdFx0fVxuXHRcdHJldHVybiAhIUNyYWZ0eS5rZXlkb3duW2tleV07XG5cdH1cbn0pO1xuXG4vKipAXG4qICNNdWx0aXdheVxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogVXNlZCB0byBiaW5kIGtleXMgdG8gZGlyZWN0aW9ucyBhbmQgaGF2ZSB0aGUgZW50aXR5IG1vdmUgYWNjb3JkaW5nbHlcbiogQHRyaWdnZXIgTmV3RGlyZWN0aW9uIC0gdHJpZ2dlcmVkIHdoZW4gZGlyZWN0aW9uIGNoYW5nZXMgLSB7IHg6TnVtYmVyLCB5Ok51bWJlciB9IC0gTmV3IGRpcmVjdGlvblxuKiBAdHJpZ2dlciBNb3ZlZCAtIHRyaWdnZXJlZCBvbiBtb3ZlbWVudCBvbiBlaXRoZXIgeCBvciB5IGF4aXMuIElmIHRoZSBlbnRpdHkgaGFzIG1vdmVkIG9uIGJvdGggYXhlcyBmb3IgZGlhZ29uYWwgbW92ZW1lbnQgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZCB0d2ljZSAtIHsgeDpOdW1iZXIsIHk6TnVtYmVyIH0gLSBPbGQgcG9zaXRpb25cbiovXG5DcmFmdHkuYyhcIk11bHRpd2F5XCIsIHtcblx0X3NwZWVkOiAzLFxuXG4gIF9rZXlkb3duOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICh0aGlzLl9rZXlzW2Uua2V5XSkge1xuXHRcdFx0dGhpcy5fbW92ZW1lbnQueCA9IE1hdGgucm91bmQoKHRoaXMuX21vdmVtZW50LnggKyB0aGlzLl9rZXlzW2Uua2V5XS54KSAqIDEwMDApIC8gMTAwMDtcblx0XHRcdHRoaXMuX21vdmVtZW50LnkgPSBNYXRoLnJvdW5kKCh0aGlzLl9tb3ZlbWVudC55ICsgdGhpcy5fa2V5c1tlLmtleV0ueSkgKiAxMDAwKSAvIDEwMDA7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ05ld0RpcmVjdGlvbicsIHRoaXMuX21vdmVtZW50KTtcblx0XHR9XG5cdH0sXG5cbiAgX2tleXVwOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICh0aGlzLl9rZXlzW2Uua2V5XSkge1xuXHRcdFx0dGhpcy5fbW92ZW1lbnQueCA9IE1hdGgucm91bmQoKHRoaXMuX21vdmVtZW50LnggLSB0aGlzLl9rZXlzW2Uua2V5XS54KSAqIDEwMDApIC8gMTAwMDtcblx0XHRcdHRoaXMuX21vdmVtZW50LnkgPSBNYXRoLnJvdW5kKCh0aGlzLl9tb3ZlbWVudC55IC0gdGhpcy5fa2V5c1tlLmtleV0ueSkgKiAxMDAwKSAvIDEwMDA7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ05ld0RpcmVjdGlvbicsIHRoaXMuX21vdmVtZW50KTtcblx0XHR9XG5cdH0sXG5cbiAgX2VudGVyZnJhbWU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5kaXNhYmxlQ29udHJvbHMpIHJldHVybjtcblxuXHRcdGlmICh0aGlzLl9tb3ZlbWVudC54ICE9PSAwKSB7XG5cdFx0XHR0aGlzLnggKz0gdGhpcy5fbW92ZW1lbnQueDtcblx0XHRcdHRoaXMudHJpZ2dlcignTW92ZWQnLCB7IHg6IHRoaXMueCAtIHRoaXMuX21vdmVtZW50LngsIHk6IHRoaXMueSB9KTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21vdmVtZW50LnkgIT09IDApIHtcblx0XHRcdHRoaXMueSArPSB0aGlzLl9tb3ZlbWVudC55O1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdNb3ZlZCcsIHsgeDogdGhpcy54LCB5OiB0aGlzLnkgLSB0aGlzLl9tb3ZlbWVudC55IH0pO1xuXHRcdH1cblx0fSxcblxuXHQvKipAXG5cdCogIy5tdWx0aXdheVxuXHQqIEBjb21wIE11bHRpd2F5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLm11bHRpd2F5KFtOdW1iZXIgc3BlZWQsXSBPYmplY3Qga2V5QmluZGluZ3MgKVxuXHQqIEBwYXJhbSBzcGVlZCAtIEFtb3VudCBvZiBwaXhlbHMgdG8gbW92ZSB0aGUgZW50aXR5IHdoaWxzdCBhIGtleSBpcyBkb3duXG5cdCogQHBhcmFtIGtleUJpbmRpbmdzIC0gV2hhdCBrZXlzIHNob3VsZCBtYWtlIHRoZSBlbnRpdHkgZ28gaW4gd2hpY2ggZGlyZWN0aW9uLiBEaXJlY3Rpb24gaXMgc3BlY2lmaWVkIGluIGRlZ3JlZXNcblx0KiBDb25zdHJ1Y3RvciB0byBpbml0aWFsaXplIHRoZSBzcGVlZCBhbmQga2V5QmluZGluZ3MuIENvbXBvbmVudCB3aWxsIGxpc3RlbiB0byBrZXkgZXZlbnRzIGFuZCBtb3ZlIHRoZSBlbnRpdHkgYXBwcm9wcmlhdGVseS5cblx0KlxuXHQqIFdoZW4gZGlyZWN0aW9uIGNoYW5nZXMgYSBOZXdEaXJlY3Rpb24gZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IGRldGFpbGluZyB0aGUgbmV3IGRpcmVjdGlvbjoge3g6IHhfbW92ZW1lbnQsIHk6IHlfbW92ZW1lbnR9XG5cdCogV2hlbiBlbnRpdHkgaGFzIG1vdmVkIG9uIGVpdGhlciB4LSBvciB5LWF4aXMgYSBNb3ZlZCBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3Qgc3BlY2lmeWluZyB0aGUgb2xkIHBvc2l0aW9uIHt4OiBvbGRfeCwgeTogb2xkX3l9XG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB0aGlzLm11bHRpd2F5KDMsIHtVUF9BUlJPVzogLTkwLCBET1dOX0FSUk9XOiA5MCwgUklHSFRfQVJST1c6IDAsIExFRlRfQVJST1c6IDE4MH0pO1xuXHQqIHRoaXMubXVsdGl3YXkoe3g6Myx5OjEuNX0sIHtVUF9BUlJPVzogLTkwLCBET1dOX0FSUk9XOiA5MCwgUklHSFRfQVJST1c6IDAsIExFRlRfQVJST1c6IDE4MH0pO1xuXHQqIHRoaXMubXVsdGl3YXkoe1c6IC05MCwgUzogOTAsIEQ6IDAsIEE6IDE4MH0pO1xuXHQqIH5+flxuXHQqL1xuXHRtdWx0aXdheTogZnVuY3Rpb24gKHNwZWVkLCBrZXlzKSB7XG5cdFx0dGhpcy5fa2V5RGlyZWN0aW9uID0ge307XG5cdFx0dGhpcy5fa2V5cyA9IHt9O1xuXHRcdHRoaXMuX21vdmVtZW50ID0geyB4OiAwLCB5OiAwIH07XG5cdFx0dGhpcy5fc3BlZWQgPSB7IHg6IDMsIHk6IDMgfTtcblxuXHRcdGlmIChrZXlzKSB7XG5cdFx0XHRpZiAoc3BlZWQueCAmJiBzcGVlZC55KSB7XG5cdFx0XHRcdHRoaXMuX3NwZWVkLnggPSBzcGVlZC54O1xuXHRcdFx0XHR0aGlzLl9zcGVlZC55ID0gc3BlZWQueTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX3NwZWVkLnggPSBzcGVlZDtcblx0XHRcdFx0dGhpcy5fc3BlZWQueSA9IHNwZWVkO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXlzID0gc3BlZWQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5fa2V5RGlyZWN0aW9uID0ga2V5cztcblx0XHR0aGlzLnNwZWVkKHRoaXMuX3NwZWVkKTtcblxuXHRcdHRoaXMuZGlzYWJsZUNvbnRyb2woKTtcblx0XHR0aGlzLmVuYWJsZUNvbnRyb2woKTtcblxuXHRcdC8vQXBwbHkgbW92ZW1lbnQgaWYga2V5IGlzIGRvd24gd2hlbiBjcmVhdGVkXG5cdFx0Zm9yICh2YXIgayBpbiBrZXlzKSB7XG5cdFx0XHRpZiAoQ3JhZnR5LmtleWRvd25bQ3JhZnR5LmtleXNba11dKSB7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcihcIktleURvd25cIiwgeyBrZXk6IENyYWZ0eS5rZXlzW2tdIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmVuYWJsZUNvbnRyb2xcblx0KiBAY29tcCBNdWx0aXdheVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5lbmFibGVDb250cm9sKClcblx0KiBcblx0KiBFbmFibGUgdGhlIGNvbXBvbmVudCB0byBsaXN0ZW4gdG8ga2V5IGV2ZW50cy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG4gICAgKiB0aGlzLmVuYWJsZUNvbnRyb2woKTtcblx0KiB+fn5cblx0Ki9cbiAgZW5hYmxlQ29udHJvbDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5iaW5kKFwiS2V5RG93blwiLCB0aGlzLl9rZXlkb3duKVxuXHRcdC5iaW5kKFwiS2V5VXBcIiwgdGhpcy5fa2V5dXApXG5cdFx0LmJpbmQoXCJFbnRlckZyYW1lXCIsIHRoaXMuX2VudGVyZnJhbWUpO1xuXHRcdHJldHVybiB0aGlzO1xuICB9LFxuXG5cdC8qKkBcblx0KiAjLmRpc2FibGVDb250cm9sXG5cdCogQGNvbXAgTXVsdGl3YXlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZGlzYWJsZUNvbnRyb2woKVxuXHQqIFxuXHQqIERpc2FibGUgdGhlIGNvbXBvbmVudCB0byBsaXN0ZW4gdG8ga2V5IGV2ZW50cy5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG4gICAgKiB0aGlzLmRpc2FibGVDb250cm9sKCk7XG5cdCogfn5+XG5cdCovXG5cbiAgZGlzYWJsZUNvbnRyb2w6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMudW5iaW5kKFwiS2V5RG93blwiLCB0aGlzLl9rZXlkb3duKVxuXHRcdC51bmJpbmQoXCJLZXlVcFwiLCB0aGlzLl9rZXl1cClcblx0XHQudW5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLl9lbnRlcmZyYW1lKTtcblx0XHRyZXR1cm4gdGhpcztcbiAgfSxcblxuXHRzcGVlZDogZnVuY3Rpb24gKHNwZWVkKSB7XG5cdFx0Zm9yICh2YXIgayBpbiB0aGlzLl9rZXlEaXJlY3Rpb24pIHtcblx0XHRcdHZhciBrZXlDb2RlID0gQ3JhZnR5LmtleXNba10gfHwgaztcblx0XHRcdHRoaXMuX2tleXNba2V5Q29kZV0gPSB7XG5cdFx0XHRcdHg6IE1hdGgucm91bmQoTWF0aC5jb3ModGhpcy5fa2V5RGlyZWN0aW9uW2tdICogKE1hdGguUEkgLyAxODApKSAqIDEwMDAgKiBzcGVlZC54KSAvIDEwMDAsXG5cdFx0XHRcdHk6IE1hdGgucm91bmQoTWF0aC5zaW4odGhpcy5fa2V5RGlyZWN0aW9uW2tdICogKE1hdGguUEkgLyAxODApKSAqIDEwMDAgKiBzcGVlZC55KSAvIDEwMDBcblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjRm91cndheVxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogTW92ZSBhbiBlbnRpdHkgaW4gZm91ciBkaXJlY3Rpb25zIGJ5IHVzaW5nIHRoZVxuKiBhcnJvdyBrZXlzIG9yIGBXYCwgYEFgLCBgU2AsIGBEYC5cbiovXG5DcmFmdHkuYyhcIkZvdXJ3YXlcIiwge1xuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKFwiTXVsdGl3YXlcIik7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuZm91cndheVxuXHQqIEBjb21wIEZvdXJ3YXlcblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuZm91cndheShOdW1iZXIgc3BlZWQpXG5cdCogQHBhcmFtIHNwZWVkIC0gQW1vdW50IG9mIHBpeGVscyB0byBtb3ZlIHRoZSBlbnRpdHkgd2hpbHN0IGEga2V5IGlzIGRvd25cblx0KiBDb25zdHJ1Y3RvciB0byBpbml0aWFsaXplIHRoZSBzcGVlZC4gQ29tcG9uZW50IHdpbGwgbGlzdGVuIGZvciBrZXkgZXZlbnRzIGFuZCBtb3ZlIHRoZSBlbnRpdHkgYXBwcm9wcmlhdGVseS5cblx0KiBUaGlzIGluY2x1ZGVzIGBVcCBBcnJvd2AsIGBSaWdodCBBcnJvd2AsIGBEb3duIEFycm93YCwgYExlZnQgQXJyb3dgIGFzIHdlbGwgYXMgYFdgLCBgQWAsIGBTYCwgYERgLlxuXHQqXG5cdCogV2hlbiBkaXJlY3Rpb24gY2hhbmdlcyBhIE5ld0RpcmVjdGlvbiBldmVudCBpcyB0cmlnZ2VyZWQgd2l0aCBhbiBvYmplY3QgZGV0YWlsaW5nIHRoZSBuZXcgZGlyZWN0aW9uOiB7eDogeF9tb3ZlbWVudCwgeTogeV9tb3ZlbWVudH1cblx0KiBXaGVuIGVudGl0eSBoYXMgbW92ZWQgb24gZWl0aGVyIHgtIG9yIHktYXhpcyBhIE1vdmVkIGV2ZW50IGlzIHRyaWdnZXJlZCB3aXRoIGFuIG9iamVjdCBzcGVjaWZ5aW5nIHRoZSBvbGQgcG9zaXRpb24ge3g6IG9sZF94LCB5OiBvbGRfeX1cblx0KlxuXHQqIFRoZSBrZXkgcHJlc3NlcyB3aWxsIG1vdmUgdGhlIGVudGl0eSBpbiB0aGF0IGRpcmVjdGlvbiBieSB0aGUgc3BlZWQgcGFzc2VkIGluIHRoZSBhcmd1bWVudC5cblx0KiBcblx0KiBAc2VlIE11bHRpd2F5XG5cdCovXG5cdGZvdXJ3YXk6IGZ1bmN0aW9uIChzcGVlZCkge1xuXHRcdHRoaXMubXVsdGl3YXkoc3BlZWQsIHtcblx0XHRcdFVQX0FSUk9XOiAtOTAsXG5cdFx0XHRET1dOX0FSUk9XOiA5MCxcblx0XHRcdFJJR0hUX0FSUk9XOiAwLFxuXHRcdFx0TEVGVF9BUlJPVzogMTgwLFxuXHRcdFx0VzogLTkwLFxuXHRcdFx0UzogOTAsXG5cdFx0XHREOiAwLFxuXHRcdFx0QTogMTgwLFxuXHRcdFx0WjogLTkwLFxuXHRcdFx0UTogMTgwXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI1R3b3dheVxuKiBAY2F0ZWdvcnkgSW5wdXRcbiogTW92ZSBhbiBlbnRpdHkgbGVmdCBvciByaWdodCB1c2luZyB0aGUgYXJyb3cga2V5cyBvciBgRGAgYW5kIGBBYCBhbmQganVtcCB1c2luZyB1cCBhcnJvdyBvciBgV2AuXG4qXG4qIFdoZW4gZGlyZWN0aW9uIGNoYW5nZXMgYSBOZXdEaXJlY3Rpb24gZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IGRldGFpbGluZyB0aGUgbmV3IGRpcmVjdGlvbjoge3g6IHhfbW92ZW1lbnQsIHk6IHlfbW92ZW1lbnR9LiBUaGlzIGlzIGNvbnNpc3RlbnQgd2l0aCBGb3Vyd2F5IGFuZCBNdWx0aXdheSBjb21wb25lbnRzLlxuKiBXaGVuIGVudGl0eSBoYXMgbW92ZWQgb24geC1heGlzIGEgTW92ZWQgZXZlbnQgaXMgdHJpZ2dlcmVkIHdpdGggYW4gb2JqZWN0IHNwZWNpZnlpbmcgdGhlIG9sZCBwb3NpdGlvbiB7eDogb2xkX3gsIHk6IG9sZF95fVxuKi9cbkNyYWZ0eS5jKFwiVHdvd2F5XCIsIHtcblx0X3NwZWVkOiAzLFxuXHRfdXA6IGZhbHNlLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKFwiRm91cndheSwgS2V5Ym9hcmRcIik7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMudHdvd2F5XG5cdCogQGNvbXAgVHdvd2F5XG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnR3b3dheShOdW1iZXIgc3BlZWRbLCBOdW1iZXIganVtcFNwZWVkXSlcblx0KiBAcGFyYW0gc3BlZWQgLSBBbW91bnQgb2YgcGl4ZWxzIHRvIG1vdmUgbGVmdCBvciByaWdodFxuXHQqIEBwYXJhbSBqdW1wU3BlZWQgLSBIb3cgaGlnaCB0aGUgZW50aXR5IHNob3VsZCBqdW1wXG5cdCogXG5cdCogQ29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSB0aGUgc3BlZWQgYW5kIHBvd2VyIG9mIGp1bXAuIENvbXBvbmVudCB3aWxsXG5cdCogbGlzdGVuIGZvciBrZXkgZXZlbnRzIGFuZCBtb3ZlIHRoZSBlbnRpdHkgYXBwcm9wcmlhdGVseS4gVGhpcyBpbmNsdWRlc1xuXHQqIH5+flxuXHQqIGBVcCBBcnJvd2AsIGBSaWdodCBBcnJvd2AsIGBMZWZ0IEFycm93YCBhcyB3ZWxsIGFzIFcsIEEsIEQuIFVzZWQgd2l0aCB0aGVcblx0KiBgZ3Jhdml0eWAgY29tcG9uZW50IHRvIHNpbXVsYXRlIGp1bXBpbmcuXG5cdCogfn5+XG5cdCogXG5cdCogVGhlIGtleSBwcmVzc2VzIHdpbGwgbW92ZSB0aGUgZW50aXR5IGluIHRoYXQgZGlyZWN0aW9uIGJ5IHRoZSBzcGVlZCBwYXNzZWQgaW5cblx0KiB0aGUgYXJndW1lbnQuIFByZXNzaW5nIHRoZSBgVXAgQXJyb3dgIG9yIGBXYCB3aWxsIGNhdXNlIHRoZSBlbnRpdHkgdG8ganVtcC5cblx0KiBcblx0KiBAc2VlIEdyYXZpdHksIEZvdXJ3YXlcblx0Ki9cblx0dHdvd2F5OiBmdW5jdGlvbiAoc3BlZWQsIGp1bXApIHtcblxuXHRcdHRoaXMubXVsdGl3YXkoc3BlZWQsIHtcblx0XHRcdFJJR0hUX0FSUk9XOiAwLFxuXHRcdFx0TEVGVF9BUlJPVzogMTgwLFxuXHRcdFx0RDogMCxcblx0XHRcdEE6IDE4MCxcblx0XHRcdFE6IDE4MFxuXHRcdH0pO1xuXG5cdFx0aWYgKHNwZWVkKSB0aGlzLl9zcGVlZCA9IHNwZWVkO1xuXHRcdGp1bXAgPSBqdW1wIHx8IHRoaXMuX3NwZWVkICogMjtcblxuXHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMuZGlzYWJsZUNvbnRyb2xzKSByZXR1cm47XG5cdFx0XHRpZiAodGhpcy5fdXApIHtcblx0XHRcdFx0dGhpcy55IC09IGp1bXA7XG5cdFx0XHRcdHRoaXMuX2ZhbGxpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pLmJpbmQoXCJLZXlEb3duXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLmlzRG93bihcIlVQX0FSUk9XXCIpIHx8IHRoaXMuaXNEb3duKFwiV1wiKSB8fCB0aGlzLmlzRG93bihcIlpcIikpIHRoaXMuX3VwID0gdHJ1ZTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjU3ByaXRlQW5pbWF0aW9uXG4qIEBjYXRlZ29yeSBBbmltYXRpb25cbiogQHRyaWdnZXIgQW5pbWF0aW9uRW5kIC0gV2hlbiB0aGUgYW5pbWF0aW9uIGZpbmlzaGVzIC0geyByZWVsIH1cbiogQHRyaWdnZXIgQ2hhbmdlIC0gT24gZWFjaCBmcmFtZVxuKlxuKiBVc2VkIHRvIGFuaW1hdGUgc3ByaXRlcyBieSBjaGFuZ2luZyB0aGUgc3ByaXRlcyBpbiB0aGUgc3ByaXRlIG1hcC5cbipcbiovXG5DcmFmdHkuYyhcIlNwcml0ZUFuaW1hdGlvblwiLCB7XG4vKipAXG5cdCogIy5fcmVlbHNcblx0KiBAY29tcCBTcHJpdGVBbmltYXRpb25cblx0KlxuXHQqIEEgbWFwIGNvbnNpc3RzIG9mIGFycmF5cyB0aGF0IGNvbnRhaW5zIHRoZSBjb29yZGluYXRlcyBvZiBlYWNoIGZyYW1lIHdpdGhpbiB0aGUgc3ByaXRlLCBlLmcuLFxuICAgICogYHtcIndhbGtfbGVmdFwiOltbOTYsNDhdLFsxMTIsNDhdLFsxMjgsNDhdXX1gXG5cdCovXG5cdF9yZWVsczogbnVsbCxcblx0X2ZyYW1lOiBudWxsLFxuXG5cdC8qKkBcblx0KiAjLl9jdXJyZW50UmVlbElkXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCpcblx0KiBUaGUgY3VycmVudCBwbGF5aW5nIHJlZWwgKG9uZSBlbGVtZW50IG9mIGB0aGlzLl9yZWVsc2ApLiBJdCBpcyBgbnVsbGAgaWYgbm8gcmVlbCBpcyBwbGF5aW5nLlxuXHQqL1xuXHRfY3VycmVudFJlZWxJZDogbnVsbCxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fcmVlbHMgPSB7fTtcblx0fSxcblxuXHQvKipAXG5cdCogIy5hbmltYXRlXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFuaW1hdGUoU3RyaW5nIHJlZWxJZCwgTnVtYmVyIGZyb21YLCBOdW1iZXIgeSwgTnVtYmVyIHRvWClcblx0KiBAcGFyYW0gcmVlbElkIC0gSUQgb2YgdGhlIGFuaW1hdGlvbiByZWVsIGJlaW5nIGNyZWF0ZWRcblx0KiBAcGFyYW0gZnJvbVggLSBTdGFydGluZyBgeGAgcG9zaXRpb24gKGluIHRoZSB1bml0IG9mIHNwcml0ZSBob3Jpem9udGFsIHNpemUpIG9uIHRoZSBzcHJpdGUgbWFwXG5cdCogQHBhcmFtIHkgLSBgeWAgcG9zaXRpb24gb24gdGhlIHNwcml0ZSBtYXAgKGluIHRoZSB1bml0IG9mIHNwcml0ZSB2ZXJ0aWNhbCBzaXplKS4gUmVtYWlucyBjb25zdGFudCB0aHJvdWdoIHRoZSBhbmltYXRpb24uXG5cdCogQHBhcmFtIHRvWCAtIEVuZCBgeGAgcG9zaXRpb24gb24gdGhlIHNwcml0ZSBtYXAgKGluIHRoZSB1bml0IG9mIHNwcml0ZSBob3Jpem9udGFsIHNpemUpXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmFuaW1hdGUoU3RyaW5nIHJlZWxJZCwgQXJyYXkgZnJhbWVzKVxuXHQqIEBwYXJhbSByZWVsSWQgLSBJRCBvZiB0aGUgYW5pbWF0aW9uIHJlZWwgYmVpbmcgY3JlYXRlZFxuXHQqIEBwYXJhbSBmcmFtZXMgLSBBcnJheSBvZiBhcnJheXMgY29udGFpbmluZyB0aGUgYHhgIGFuZCBgeWAgdmFsdWVzOiBbW3gxLHkxXSxbeDIseTJdLC4uLl1cblx0KiBAc2lnbiBwdWJsaWMgdGhpcyAuYW5pbWF0ZShTdHJpbmcgcmVlbElkLCBOdW1iZXIgZHVyYXRpb25bLCBOdW1iZXIgcmVwZWF0Q291bnRdKVxuXHQqIEBwYXJhbSByZWVsSWQgLSBJRCBvZiB0aGUgYW5pbWF0aW9uIHJlZWwgdG8gcGxheVxuXHQqIEBwYXJhbSBkdXJhdGlvbiAtIFBsYXkgdGhlIGFuaW1hdGlvbiB3aXRoaW4gYSBkdXJhdGlvbiAoaW4gZnJhbWVzKVxuXHQqIEBwYXJhbSByZXBlYXRDb3VudCAtIG51bWJlciBvZiB0aW1lcyB0byByZXBlYXQgdGhlIGFuaW1hdGlvbi4gVXNlIC0xIGZvciBpbmZpbml0ZWx5XG5cdCpcblx0KiBNZXRob2QgdG8gc2V0dXAgYW5pbWF0aW9uIHJlZWxzIG9yIHBsYXkgcHJlLW1hZGUgcmVlbHMuIEFuaW1hdGlvbiB3b3JrcyBieSBjaGFuZ2luZyB0aGUgc3ByaXRlcyBvdmVyXG5cdCogYSBkdXJhdGlvbi4gT25seSB3b3JrcyBmb3Igc3ByaXRlcyBidWlsdCB3aXRoIHRoZSBDcmFmdHkuc3ByaXRlIG1ldGhvZHMuIFNlZSB0aGUgVHdlZW4gY29tcG9uZW50IGZvciBhbmltYXRpb24gb2YgMkQgcHJvcGVydGllcy5cblx0KlxuXHQqIFRvIHNldHVwIGFuIGFuaW1hdGlvbiByZWVsLCBwYXNzIHRoZSBuYW1lIG9mIHRoZSByZWVsICh1c2VkIHRvIGlkZW50aWZ5IHRoZSByZWVsIGFuZCBwbGF5IGl0IGxhdGVyKSwgYW5kIGVpdGhlciBhblxuXHQqIGFycmF5IG9mIGFic29sdXRlIHNwcml0ZSBwb3NpdGlvbnMgb3IgdGhlIHN0YXJ0IHggb24gdGhlIHNwcml0ZSBtYXAsIHRoZSB5IG9uIHRoZSBzcHJpdGUgbWFwIGFuZCB0aGVuIHRoZSBlbmQgeCBvbiB0aGUgc3ByaXRlIG1hcC5cblx0KlxuXHQqIFRvIHBsYXkgYSByZWVsLCBwYXNzIHRoZSBuYW1lIG9mIHRoZSByZWVsIGFuZCB0aGUgZHVyYXRpb24gaXQgc2hvdWxkIHBsYXkgZm9yIChpbiBmcmFtZXMpLiBJZiB5b3UgbmVlZFxuXHQqIHRvIHJlcGVhdCB0aGUgYW5pbWF0aW9uLCBzaW1wbHkgcGFzcyBpbiB0aGUgYW1vdW50IG9mIHRpbWVzIHRoZSBhbmltYXRpb24gc2hvdWxkIHJlcGVhdC4gVG8gcmVwZWF0XG5cdCogZm9yZXZlciwgcGFzcyBpbiBgLTFgLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuc3ByaXRlKDE2LCBcImltYWdlcy9zcHJpdGUucG5nXCIsIHtcblx0KiAgICAgUGxheWVyU3ByaXRlOiBbMCwwXVxuXHQqIH0pO1xuXHQqXG5cdCogQ3JhZnR5LmUoXCIyRCwgRE9NLCBTcHJpdGVBbmltYXRpb24sIFBsYXllclNwcml0ZVwiKVxuXHQqICAgICAuYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDAsIDAsIDMpIC8vc2V0dXAgYW5pbWF0aW9uXG5cdCogICAgIC5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMTUsIC0xKSAvLyBzdGFydCBhbmltYXRpb25cblx0KlxuXHQqIENyYWZ0eS5lKFwiMkQsIERPTSwgU3ByaXRlQW5pbWF0aW9uLCBQbGF5ZXJTcHJpdGVcIilcblx0KiAgICAgLmFuaW1hdGUoJ1BsYXllclJ1bm5pbmcnLCAwLCAzLCAwKSAvL3NldHVwIGFuaW1hdGlvblxuXHQqICAgICAuYW5pbWF0ZSgnUGxheWVyUnVubmluZycsIDE1LCAtMSkgLy8gc3RhcnQgYW5pbWF0aW9uXG5cdCogfn5+XG5cdCpcblx0KiBAc2VlIGNyYWZ0eS5zcHJpdGVcblx0Ki9cblx0YW5pbWF0ZTogZnVuY3Rpb24gKHJlZWxJZCwgZnJvbXgsIHksIHRveCkge1xuXHRcdHZhciByZWVsLCBpLCB0aWxlLCB0aWxlaCwgZHVyYXRpb24sIHBvcztcblxuXHRcdC8vcGxheSBhIHJlZWxcblx0XHQvLy5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMTUsIC0xKSAvLyBzdGFydCBhbmltYXRpb25cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDQgJiYgdHlwZW9mIGZyb214ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRkdXJhdGlvbiA9IGZyb214O1xuXG5cdFx0XHQvL21ha2Ugc3VyZSBub3QgY3VycmVudGx5IGFuaW1hdGluZ1xuXHRcdFx0dGhpcy5fY3VycmVudFJlZWxJZCA9IHJlZWxJZDtcblxuXHRcdFx0Y3VycmVudFJlZWwgPSB0aGlzLl9yZWVsc1tyZWVsSWRdO1xuXG5cdFx0XHR0aGlzLl9mcmFtZSA9IHtcblx0XHRcdFx0Y3VycmVudFJlZWw6IGN1cnJlbnRSZWVsLFxuXHRcdFx0XHRudW1iZXJPZkZyYW1lc0JldHdlZW5TbGlkZXM6IE1hdGguY2VpbChkdXJhdGlvbiAvIGN1cnJlbnRSZWVsLmxlbmd0aCksXG5cdFx0XHRcdGN1cnJlbnRTbGlkZU51bWJlcjogMCxcblx0XHRcdFx0ZnJhbWVOdW1iZXJCZXR3ZWVuU2xpZGVzOiAwLFxuXHRcdFx0XHRyZXBlYXQ6IDBcblx0XHRcdH07XG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyAmJiB0eXBlb2YgeSA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHQvL1VzZXIgcHJvdmlkZWQgcmVwZXRpdGlvbiBjb3VudFxuXHRcdFx0XHRpZiAoeSA9PT0gLTEpIHRoaXMuX2ZyYW1lLnJlcGVhdEluZmluaXRseSA9IHRydWU7XG5cdFx0XHRcdGVsc2UgdGhpcy5fZnJhbWUucmVwZWF0ID0geTtcblx0XHRcdH1cblxuXHRcdFx0cG9zID0gdGhpcy5fZnJhbWUuY3VycmVudFJlZWxbMF07XG5cdFx0XHR0aGlzLl9fY29vcmRbMF0gPSBwb3NbMF07XG5cdFx0XHR0aGlzLl9fY29vcmRbMV0gPSBwb3NbMV07XG5cblx0XHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy51cGRhdGVTcHJpdGUpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdC8vIC5hbmltYXRlKCdQbGF5ZXJSdW5uaW5nJywgMCwgMCwgMykgLy9zZXR1cCBhbmltYXRpb25cblx0XHRpZiAodHlwZW9mIGZyb214ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHQvLyBEZWZpbmQgaW4gU3ByaXRlIGNvbXBvbmVudC5cblx0XHRcdHRpbGUgPSB0aGlzLl9fdGlsZSArIHBhcnNlSW50KHRoaXMuX19wYWRkaW5nWzBdIHx8IDAsIDEwKTtcblx0XHRcdHRpbGVoID0gdGhpcy5fX3RpbGVoICsgcGFyc2VJbnQodGhpcy5fX3BhZGRpbmdbMV0gfHwgMCwgMTApO1xuXG5cdFx0XHRyZWVsID0gW107XG5cdFx0XHRpID0gZnJvbXg7XG5cdFx0XHRpZiAodG94ID4gZnJvbXgpIHtcblx0XHRcdFx0Zm9yICg7IGkgPD0gdG94OyBpKyspIHtcblx0XHRcdFx0XHRyZWVsLnB1c2goW2kgKiB0aWxlLCB5ICogdGlsZWhdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICg7IGkgPj0gdG94OyBpLS0pIHtcblx0XHRcdFx0XHRyZWVsLnB1c2goW2kgKiB0aWxlLCB5ICogdGlsZWhdKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9yZWVsc1tyZWVsSWRdID0gcmVlbDtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBmcm9teCA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0Ly8gQHNpZ24gcHVibGljIHRoaXMgLmFuaW1hdGUocmVlbElkLCBbW3gxLHkxXSxbeDIseTJdLC4uLl0pXG5cdFx0XHRpID0gMDtcblx0XHRcdHJlZWwgPSBbXTtcblx0XHRcdHRveCA9IGZyb214Lmxlbmd0aCAtIDE7XG5cdFx0XHR0aWxlID0gdGhpcy5fX3RpbGUgKyBwYXJzZUludCh0aGlzLl9fcGFkZGluZ1swXSB8fCAwLCAxMCk7XG5cdFx0XHR0aWxlaCA9IHRoaXMuX190aWxlaCArIHBhcnNlSW50KHRoaXMuX19wYWRkaW5nWzFdIHx8IDAsIDEwKTtcblxuXHRcdFx0Zm9yICg7IGkgPD0gdG94OyBpKyspIHtcblx0XHRcdFx0cG9zID0gZnJvbXhbaV07XG5cdFx0XHRcdHJlZWwucHVzaChbcG9zWzBdICogdGlsZSwgcG9zWzFdICogdGlsZWhdKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fcmVlbHNbcmVlbElkXSA9IHJlZWw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMudXBkYXRlU3ByaXRlXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCogQHNpZ24gcHJpdmF0ZSB2b2lkIC51cGRhdGVTcHJpdGUoKVxuXHQqXG5cdCogVGhpcyBpcyBjYWxsZWQgYXQgZXZlcnkgYEVudGVyRnJhbWVgIGV2ZW50IHdoZW4gYC5hbmltYXRlKClgIGVuYWJsZXMgYW5pbWF0aW9uLiBJdCB1cGRhdGUgdGhlIFNwcml0ZUFuaW1hdGlvbiBjb21wb25lbnQgd2hlbiB0aGUgc2xpZGUgaW4gdGhlIHNwcml0ZSBzaG91bGQgYmUgdXBkYXRlZC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogdGhpcy5iaW5kKFwiRW50ZXJGcmFtZVwiLCB0aGlzLnVwZGF0ZVNwcml0ZSk7XG5cdCogfn5+XG5cdCpcblx0KiBAc2VlIGNyYWZ0eS5zcHJpdGVcblx0Ki9cblx0dXBkYXRlU3ByaXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGRhdGEgPSB0aGlzLl9mcmFtZTtcblx0XHRpZiAoIWRhdGEpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fZnJhbWUuZnJhbWVOdW1iZXJCZXR3ZWVuU2xpZGVzKysgPT09IGRhdGEubnVtYmVyT2ZGcmFtZXNCZXR3ZWVuU2xpZGVzKSB7XG5cdFx0XHR2YXIgcG9zID0gZGF0YS5jdXJyZW50UmVlbFtkYXRhLmN1cnJlbnRTbGlkZU51bWJlcisrXTtcblxuXHRcdFx0dGhpcy5fX2Nvb3JkWzBdID0gcG9zWzBdO1xuXHRcdFx0dGhpcy5fX2Nvb3JkWzFdID0gcG9zWzFdO1xuXHRcdFx0dGhpcy5fZnJhbWUuZnJhbWVOdW1iZXJCZXR3ZWVuU2xpZGVzID0gMDtcblx0XHR9XG5cblxuXHRcdGlmIChkYXRhLmN1cnJlbnRTbGlkZU51bWJlciA9PT0gZGF0YS5jdXJyZW50UmVlbC5sZW5ndGgpIHtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuX2ZyYW1lLnJlcGVhdEluZmluaXRseSA9PT0gdHJ1ZSB8fCB0aGlzLl9mcmFtZS5yZXBlYXQgPiAwKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9mcmFtZS5yZXBlYXQpIHRoaXMuX2ZyYW1lLnJlcGVhdC0tO1xuXHRcdFx0XHR0aGlzLl9mcmFtZS5mcmFtZU51bWJlckJldHdlZW5TbGlkZXMgPSAwO1xuXHRcdFx0XHR0aGlzLl9mcmFtZS5jdXJyZW50U2xpZGVOdW1iZXIgPSAwO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHRoaXMuX2ZyYW1lLmZyYW1lTnVtYmVyQmV0d2VlblNsaWRlcyA9PT0gZGF0YS5udW1iZXJPZkZyYW1lc0JldHdlZW5TbGlkZXMpIHtcblx0XHRcdFx0ICAgIHRoaXMudHJpZ2dlcihcIkFuaW1hdGlvbkVuZFwiLCB7IHJlZWw6IGRhdGEuY3VycmVudFJlZWwgfSk7XG5cdFx0XHRcdCAgICB0aGlzLnN0b3AoKTtcblx0XHRcdFx0ICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuc3RvcFxuXHQqIEBjb21wIFNwcml0ZUFuaW1hdGlvblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5zdG9wKHZvaWQpXG5cdCpcblx0KiBTdG9wIGFueSBhbmltYXRpb24gY3VycmVudGx5IHBsYXlpbmcuXG5cdCovXG5cdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnVuYmluZChcIkVudGVyRnJhbWVcIiwgdGhpcy51cGRhdGVTcHJpdGUpO1xuXHRcdHRoaXMudW5iaW5kKFwiQW5pbWF0aW9uRW5kXCIpO1xuXHRcdHRoaXMuX2N1cnJlbnRSZWVsSWQgPSBudWxsO1xuXHRcdHRoaXMuX2ZyYW1lID0gbnVsbDtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLnJlc2V0XG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLnJlc2V0KHZvaWQpXG5cdCpcblx0KiBNZXRob2Qgd2lsbCByZXNldCB0aGUgZW50aXRpZXMgc3ByaXRlIHRvIGl0cyBvcmlnaW5hbC5cblx0Ki9cblx0cmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX2ZyYW1lKSByZXR1cm4gdGhpcztcblxuXHRcdHZhciBjbyA9IHRoaXMuX2ZyYW1lLmN1cnJlbnRSZWVsWzBdO1xuXHRcdHRoaXMuX19jb29yZFswXSA9IGNvWzBdO1xuXHRcdHRoaXMuX19jb29yZFsxXSA9IGNvWzFdO1xuXHRcdHRoaXMuc3RvcCgpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuaXNQbGF5aW5nXG5cdCogQGNvbXAgU3ByaXRlQW5pbWF0aW9uXG5cdCogQHNpZ24gcHVibGljIEJvb2xlYW4gLmlzUGxheWluZyhbU3RyaW5nIHJlZWxJZF0pXG5cdCogQHBhcmFtIHJlZWxJZCAtIERldGVybWluZSBpZiB0aGUgYW5pbWF0aW9uIHJlZWwgd2l0aCB0aGlzIHJlZWxJZCBpcyBwbGF5aW5nLlxuXHQqXG5cdCogRGV0ZXJtaW5lcyBpZiBhbiBhbmltYXRpb24gaXMgY3VycmVudGx5IHBsYXlpbmcuIElmIGEgcmVlbCBpcyBwYXNzZWQsIGl0IHdpbGwgZGV0ZXJtaW5lXG5cdCogaWYgdGhlIHBhc3NlZCByZWVsIGlzIHBsYXlpbmcuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIG15RW50aXR5LmlzUGxheWluZygpIC8vaXMgYW55IGFuaW1hdGlvbiBwbGF5aW5nXG5cdCogbXlFbnRpdHkuaXNQbGF5aW5nKCdQbGF5ZXJSdW5uaW5nJykgLy9pcyB0aGUgUGxheWVyUnVubmluZyBhbmltYXRpb24gcGxheWluZ1xuXHQqIH5+flxuXHQqL1xuXHRpc1BsYXlpbmc6IGZ1bmN0aW9uIChyZWVsSWQpIHtcblx0XHRpZiAoIXJlZWxJZCkgcmV0dXJuICEhdGhpcy5fY3VycmVudFJlZWxJZDtcblx0XHRyZXR1cm4gdGhpcy5fY3VycmVudFJlZWxJZCA9PT0gcmVlbElkO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjVHdlZW5cbiogQGNhdGVnb3J5IEFuaW1hdGlvblxuKiBAdHJpZ2dlciBUd2VlbkVuZCAtIHdoZW4gYSB0d2VlbiBmaW5pc2hlcyAtIFN0cmluZyAtIHByb3BlcnR5XG4qXG4qIENvbXBvbmVudCB0byBhbmltYXRlIHRoZSBjaGFuZ2UgaW4gMkQgcHJvcGVydGllcyBvdmVyIHRpbWUuXG4qL1xuQ3JhZnR5LmMoXCJUd2VlblwiLCB7XG5cdF9zdGVwOiBudWxsLFxuXHRfbnVtUHJvcHM6IDAsXG5cblx0LyoqQFxuXHQqICMudHdlZW5cblx0KiBAY29tcCBUd2VlblxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC50d2VlbihPYmplY3QgcHJvcGVydGllcywgTnVtYmVyIGR1cmF0aW9uKVxuXHQqIEBwYXJhbSBwcm9wZXJ0aWVzIC0gT2JqZWN0IG9mIDJEIHByb3BlcnRpZXMgYW5kIHdoYXQgdGhleSBzaG91bGQgYW5pbWF0ZSB0b1xuXHQqIEBwYXJhbSBkdXJhdGlvbiAtIER1cmF0aW9uIHRvIGFuaW1hdGUgdGhlIHByb3BlcnRpZXMgb3ZlciAoaW4gZnJhbWVzKVxuXHQqXG5cdCogVGhpcyBtZXRob2Qgd2lsbCBhbmltYXRlIGEgMkQgZW50aXRpZXMgcHJvcGVydGllcyBvdmVyIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24uXG5cdCogVGhlc2UgaW5jbHVkZSBgeGAsIGB5YCwgYHdgLCBgaGAsIGBhbHBoYWAgYW5kIGByb3RhdGlvbmAuXG5cdCpcblx0KiBUaGUgb2JqZWN0IHBhc3NlZCBzaG91bGQgaGF2ZSB0aGUgcHJvcGVydGllcyBhcyBrZXlzIGFuZCB0aGUgdmFsdWUgc2hvdWxkIGJlIHRoZSByZXN1bHRpbmdcblx0KiB2YWx1ZXMgb2YgdGhlIHByb3BlcnRpZXMuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIE1vdmUgYW4gb2JqZWN0IHRvIDEwMCwxMDAgYW5kIGZhZGUgb3V0IGluIDIwMCBmcmFtZXMuXG5cdCogfn5+XG5cdCogQ3JhZnR5LmUoXCIyRCwgVHdlZW5cIilcblx0KiAgICAuYXR0cih7YWxwaGE6IDEuMCwgeDogMCwgeTogMH0pXG5cdCogICAgLnR3ZWVuKHthbHBoYTogMC4wLCB4OiAxMDAsIHk6IDEwMH0sIDIwMClcblx0KiB+fn5cblx0Ki9cblx0dHdlZW46IGZ1bmN0aW9uIChwcm9wcywgZHVyYXRpb24pIHtcblx0XHR0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMuX3N0ZXAgPT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLl9zdGVwID0ge307XG5cdFx0XHRcdHRoaXMuYmluZCgnRW50ZXJGcmFtZScsIHR3ZWVuRW50ZXJGcmFtZSk7XG5cdFx0XHRcdHRoaXMuYmluZCgnUmVtb3ZlQ29tcG9uZW50JywgZnVuY3Rpb24gKGMpIHtcblx0XHRcdFx0XHRpZiAoYyA9PSAnVHdlZW4nKSB7XG5cdFx0XHRcdFx0XHR0aGlzLnVuYmluZCgnRW50ZXJGcmFtZScsIHR3ZWVuRW50ZXJGcmFtZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBwcm9wcykge1xuXHRcdFx0XHR0aGlzLl9zdGVwW3Byb3BdID0geyBwcm9wOiBwcm9wc1twcm9wXSwgdmFsOiAocHJvcHNbcHJvcF0gLSB0aGlzW3Byb3BdKSAvIGR1cmF0aW9uLCByZW06IGR1cmF0aW9uIH07XG5cdFx0XHRcdHRoaXMuX251bVByb3BzKys7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5mdW5jdGlvbiB0d2VlbkVudGVyRnJhbWUoZSkge1xuXHRpZiAodGhpcy5fbnVtUHJvcHMgPD0gMCkgcmV0dXJuO1xuXG5cdHZhciBwcm9wLCBrO1xuXHRmb3IgKGsgaW4gdGhpcy5fc3RlcCkge1xuXHRcdHByb3AgPSB0aGlzLl9zdGVwW2tdO1xuXHRcdHRoaXNba10gKz0gcHJvcC52YWw7XG5cdFx0aWYgKC0tcHJvcC5yZW0gPT0gMCkge1xuXHRcdFx0Ly8gZGVjaW1hbCBudW1iZXJzIHJvdW5kaW5nIGZpeFxuXHRcdFx0dGhpc1trXSA9IHByb3AucHJvcDtcblx0XHRcdHRoaXMudHJpZ2dlcihcIlR3ZWVuRW5kXCIsIGspO1xuXHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBkdXJhdGlvbiB3YXNuJ3QgY2hhbmdlZCBpbiBUd2VlbkVuZFxuXHRcdFx0aWYgKHRoaXMuX3N0ZXBba10ucmVtIDw9IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX3N0ZXBba107XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9udW1Qcm9wcy0tO1xuXHRcdH1cblx0fVxuXG5cdGlmICh0aGlzLmhhcygnTW91c2UnKSkge1xuXHRcdHZhciBvdmVyID0gQ3JhZnR5Lm92ZXIsXG5cdFx0XHRtb3VzZSA9IENyYWZ0eS5tb3VzZVBvcztcblx0XHRpZiAob3ZlciAmJiBvdmVyWzBdID09IHRoaXNbMF0gJiYgIXRoaXMuaXNBdChtb3VzZS54LCBtb3VzZS55KSkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdNb3VzZU91dCcsIENyYWZ0eS5sYXN0RXZlbnQpO1xuXHRcdFx0Q3JhZnR5Lm92ZXIgPSBudWxsO1xuXHRcdH1cblx0XHRlbHNlIGlmICgoIW92ZXIgfHwgb3ZlclswXSAhPSB0aGlzWzBdKSAmJiB0aGlzLmlzQXQobW91c2UueCwgbW91c2UueSkpIHtcblx0XHRcdENyYWZ0eS5vdmVyID0gdGhpcztcblx0XHRcdHRoaXMudHJpZ2dlcignTW91c2VPdmVyJywgQ3JhZnR5Lmxhc3RFdmVudCk7XG5cdFx0fVxuXHR9XG59XG5cblxuLyoqQFxuKiAjQ29sb3JcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIERyYXcgYSBzb2xpZCBjb2xvciBmb3IgdGhlIGVudGl0eVxuKi9cbkNyYWZ0eS5jKFwiQ29sb3JcIiwge1xuXHRfY29sb3I6IFwiXCIsXG5cdHJlYWR5OiB0cnVlLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLmJpbmQoXCJEcmF3XCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoZS50eXBlID09PSBcIkRPTVwiKSB7XG5cdFx0XHRcdGUuc3R5bGUuYmFja2dyb3VuZCA9IHRoaXMuX2NvbG9yO1xuXHRcdFx0XHRlLnN0eWxlLmxpbmVIZWlnaHQgPSAwO1xuXHRcdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09IFwiY2FudmFzXCIpIHtcblx0XHRcdFx0aWYgKHRoaXMuX2NvbG9yKSBlLmN0eC5maWxsU3R5bGUgPSB0aGlzLl9jb2xvcjtcblx0XHRcdFx0ZS5jdHguZmlsbFJlY3QoZS5wb3MuX3gsIGUucG9zLl95LCBlLnBvcy5fdywgZS5wb3MuX2gpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKkBcblx0KiAjLmNvbG9yXG5cdCogQGNvbXAgQ29sb3Jcblx0KiBAdHJpZ2dlciBDaGFuZ2UgLSB3aGVuIHRoZSBjb2xvciBjaGFuZ2VzXG5cdCogQHNpZ24gcHVibGljIHRoaXMgLmNvbG9yKFN0cmluZyBjb2xvcilcblx0KiBAc2lnbiBwdWJsaWMgU3RyaW5nIC5jb2xvcigpXG5cdCogQHBhcmFtIGNvbG9yIC0gQ29sb3Igb2YgdGhlIHJlY3RhbmdsZVxuXHQqIFdpbGwgY3JlYXRlIGEgcmVjdGFuZ2xlIG9mIHNvbGlkIGNvbG9yIGZvciB0aGUgZW50aXR5LCBvciByZXR1cm4gdGhlIGNvbG9yIGlmIG5vIGFyZ3VtZW50IGlzIGdpdmVuLlxuXHQqXG5cdCogVGhlIGFyZ3VtZW50IG11c3QgYmUgYSBjb2xvciByZWFkYWJsZSBkZXBlbmRpbmcgb24gd2hpY2ggYnJvd3NlciB5b3Vcblx0KiBjaG9vc2UgdG8gc3VwcG9ydC4gSUUgOCBhbmQgYmVsb3cgZG9lc24ndCBzdXBwb3J0IHRoZSByZ2IoKSBzeW50YXguXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBET00sIENvbG9yXCIpXG5cdCogICAgLmNvbG9yKFwiIzk2OTY5NlwiKTtcblx0KiB+fn5cblx0Ki9cblx0Y29sb3I6IGZ1bmN0aW9uIChjb2xvcikge1xuXHRcdGlmICghY29sb3IpIHJldHVybiB0aGlzLl9jb2xvcjtcblx0XHR0aGlzLl9jb2xvciA9IGNvbG9yO1xuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI1RpbnRcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIFNpbWlsYXIgdG8gQ29sb3IgYnkgYWRkaW5nIGFuIG92ZXJsYXkgb2Ygc2VtaS10cmFuc3BhcmVudCBjb2xvci5cbipcbiogKk5vdGU6IEN1cnJlbnRseSBvbmx5IHdvcmtzIGZvciBDYW52YXMqXG4qL1xuQ3JhZnR5LmMoXCJUaW50XCIsIHtcblx0X2NvbG9yOiBudWxsLFxuXHRfc3RyZW5ndGg6IDEuMCxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGRyYXcgPSBmdW5jdGlvbiBkKGUpIHtcblx0XHRcdHZhciBjb250ZXh0ID0gZS5jdHggfHwgQ3JhZnR5LmNhbnZhcy5jb250ZXh0O1xuXG5cdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuX2NvbG9yIHx8IFwicmdiKDAsMCwwKVwiO1xuXHRcdFx0Y29udGV4dC5maWxsUmVjdChlLnBvcy5feCwgZS5wb3MuX3ksIGUucG9zLl93LCBlLnBvcy5faCk7XG5cdFx0fTtcblxuXHRcdHRoaXMuYmluZChcIkRyYXdcIiwgZHJhdykuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdGlmIChpZCA9PT0gXCJUaW50XCIpIHRoaXMudW5iaW5kKFwiRHJhd1wiLCBkcmF3KTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipAXG5cdCogIy50aW50XG5cdCogQGNvbXAgVGludFxuXHQqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIHRpbnQgaXMgYXBwbGllZFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC50aW50KFN0cmluZyBjb2xvciwgTnVtYmVyIHN0cmVuZ3RoKVxuXHQqIEBwYXJhbSBjb2xvciAtIFRoZSBjb2xvciBpbiBoZXhhZGVjaW1hbFxuXHQqIEBwYXJhbSBzdHJlbmd0aCAtIExldmVsIG9mIG9wYWNpdHlcblx0KiBcblx0KiBNb2RpZnkgdGhlIGNvbG9yIGFuZCBsZXZlbCBvcGFjaXR5IHRvIGdpdmUgYSB0aW50IG9uIHRoZSBlbnRpdHkuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRpbnRcIilcblx0KiAgICAudGludChcIiM5Njk2OTZcIiwgMC4zKTtcblx0KiB+fn5cblx0Ki9cblx0dGludDogZnVuY3Rpb24gKGNvbG9yLCBzdHJlbmd0aCkge1xuXHRcdHRoaXMuX3N0cmVuZ3RoID0gc3RyZW5ndGg7XG5cdFx0dGhpcy5fY29sb3IgPSBDcmFmdHkudG9SR0IoY29sb3IsIHRoaXMuX3N0cmVuZ3RoKTtcblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbi8qKkBcbiogI0ltYWdlXG4qIEBjYXRlZ29yeSBHcmFwaGljc1xuKiBEcmF3IGFuIGltYWdlIHdpdGggb3Igd2l0aG91dCByZXBlYXRpbmcgKHRpbGluZykuXG4qL1xuQ3JhZnR5LmMoXCJJbWFnZVwiLCB7XG5cdF9yZXBlYXQ6IFwicmVwZWF0XCIsXG5cdHJlYWR5OiBmYWxzZSxcblxuXHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGRyYXcgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUudHlwZSA9PT0gXCJjYW52YXNcIikge1xuXHRcdFx0XHQvL3NraXAgaWYgbm8gaW1hZ2Vcblx0XHRcdFx0aWYgKCF0aGlzLnJlYWR5IHx8ICF0aGlzLl9wYXR0ZXJuKSByZXR1cm47XG5cblx0XHRcdFx0dmFyIGNvbnRleHQgPSBlLmN0eDtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5fcGF0dGVybjtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnRleHQuc2F2ZSgpO1xuXHRcdFx0XHRjb250ZXh0LnRyYW5zbGF0ZShlLnBvcy5feCwgZS5wb3MuX3kpO1xuXHRcdFx0XHRjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHRoaXMuX3csIHRoaXMuX2gpO1xuXHRcdFx0XHRjb250ZXh0LnJlc3RvcmUoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS50eXBlID09PSBcIkRPTVwiKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9faW1hZ2UpXG5cdFx0XHRcdFx0ZS5zdHlsZS5iYWNrZ3JvdW5kID0gXCJ1cmwoXCIgKyB0aGlzLl9faW1hZ2UgKyBcIikgXCIgKyB0aGlzLl9yZXBlYXQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuYmluZChcIkRyYXdcIiwgZHJhdykuYmluZChcIlJlbW92ZUNvbXBvbmVudFwiLCBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdGlmIChpZCA9PT0gXCJJbWFnZVwiKSB0aGlzLnVuYmluZChcIkRyYXdcIiwgZHJhdyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuXHQqICMuaW1hZ2Vcblx0KiBAY29tcCBJbWFnZVxuXHQqIEB0cmlnZ2VyIENoYW5nZSAtIHdoZW4gdGhlIGltYWdlIGlzIGxvYWRlZFxuXHQqIEBzaWduIHB1YmxpYyB0aGlzIC5pbWFnZShTdHJpbmcgdXJsWywgU3RyaW5nIHJlcGVhdF0pXG5cdCogQHBhcmFtIHVybCAtIFVSTCBvZiB0aGUgaW1hZ2Vcblx0KiBAcGFyYW0gcmVwZWF0IC0gSWYgdGhlIGltYWdlIHNob3VsZCBiZSByZXBlYXRlZCB0byBmaWxsIHRoZSBlbnRpdHkuXG5cdCogXG5cdCogRHJhdyBzcGVjaWZpZWQgaW1hZ2UuIFJlcGVhdCBmb2xsb3dzIENTUyBzeW50YXggKGBcIm5vLXJlcGVhdFwiLCBcInJlcGVhdFwiLCBcInJlcGVhdC14XCIsIFwicmVwZWF0LXlcImApO1xuXHQqXG5cdCogKk5vdGU6IERlZmF1bHQgcmVwZWF0IGlzIGBuby1yZXBlYXRgIHdoaWNoIGlzIGRpZmZlcmVudCB0byBzdGFuZGFyZCBET00gKHdoaWNoIGlzIGByZXBlYXRgKSpcblx0KlxuXHQqIElmIHRoZSB3aWR0aCBhbmQgaGVpZ2h0IGFyZSBgMGAgYW5kIHJlcGVhdCBpcyBzZXQgdG8gYG5vLXJlcGVhdGAgdGhlIHdpZHRoIGFuZFxuXHQqIGhlaWdodCB3aWxsIGF1dG9tYXRpY2FsbHkgYXNzdW1lIHRoYXQgb2YgdGhlIGltYWdlLiBUaGlzIGlzIGFuXG5cdCogZWFzeSB3YXkgdG8gY3JlYXRlIGFuIGltYWdlIHdpdGhvdXQgbmVlZGluZyBzcHJpdGVzLlxuXHQqIFxuXHQqIEBleGFtcGxlXG5cdCogV2lsbCBkZWZhdWx0IHRvIG5vLXJlcGVhdC4gRW50aXR5IHdpZHRoIGFuZCBoZWlnaHQgd2lsbCBiZSBzZXQgdG8gdGhlIGltYWdlcyB3aWR0aCBhbmQgaGVpZ2h0XG5cdCogfn5+XG5cdCogdmFyIGVudCA9IENyYWZ0eS5lKFwiMkQsIERPTSwgSW1hZ2VcIikuaW1hZ2UoXCJteWltYWdlLnBuZ1wiKTtcblx0KiB+fn5cblx0KiBDcmVhdGUgYSByZXBlYXRpbmcgYmFja2dyb3VuZC5cblx0KiB+fn5cblx0KiB2YXIgYmcgPSBDcmFmdHkuZShcIjJELCBET00sIEltYWdlXCIpXG5cdCogICAgICAgICAgICAgIC5hdHRyKHt3OiBDcmFmdHkudmlld3BvcnQud2lkdGgsIGg6IENyYWZ0eS52aWV3cG9ydC5oZWlnaHR9KVxuXHQqICAgICAgICAgICAgICAuaW1hZ2UoXCJiZy5wbmdcIiwgXCJyZXBlYXRcIik7XG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBDcmFmdHkuc3ByaXRlXG5cdCovXG5cdGltYWdlOiBmdW5jdGlvbiAodXJsLCByZXBlYXQpIHtcblx0XHR0aGlzLl9faW1hZ2UgPSB1cmw7XG5cdFx0dGhpcy5fcmVwZWF0ID0gcmVwZWF0IHx8IFwibm8tcmVwZWF0XCI7XG5cblx0XHR0aGlzLmltZyA9IENyYWZ0eS5hc3NldCh1cmwpO1xuXHRcdGlmICghdGhpcy5pbWcpIHtcblx0XHRcdHRoaXMuaW1nID0gbmV3IEltYWdlKCk7XG5cdFx0XHRDcmFmdHkuYXNzZXQodXJsLCB0aGlzLmltZyk7XG5cdFx0XHR0aGlzLmltZy5zcmMgPSB1cmw7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHNlbGYuaGFzKFwiQ2FudmFzXCIpKSBzZWxmLl9wYXR0ZXJuID0gQ3JhZnR5LmNhbnZhcy5jb250ZXh0LmNyZWF0ZVBhdHRlcm4oc2VsZi5pbWcsIHNlbGYuX3JlcGVhdCk7XG5cdFx0XHRcdHNlbGYucmVhZHkgPSB0cnVlO1xuXG5cdFx0XHRcdGlmIChzZWxmLl9yZXBlYXQgPT09IFwibm8tcmVwZWF0XCIpIHtcblx0XHRcdFx0XHRzZWxmLncgPSBzZWxmLmltZy53aWR0aDtcblx0XHRcdFx0XHRzZWxmLmggPSBzZWxmLmltZy5oZWlnaHQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzZWxmLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZWFkeSA9IHRydWU7XG5cdFx0XHRpZiAodGhpcy5oYXMoXCJDYW52YXNcIikpIHRoaXMuX3BhdHRlcm4gPSBDcmFmdHkuY2FudmFzLmNvbnRleHQuY3JlYXRlUGF0dGVybih0aGlzLmltZywgdGhpcy5fcmVwZWF0KTtcblx0XHRcdGlmICh0aGlzLl9yZXBlYXQgPT09IFwibm8tcmVwZWF0XCIpIHtcblx0XHRcdFx0dGhpcy53ID0gdGhpcy5pbWcud2lkdGg7XG5cdFx0XHRcdHRoaXMuaCA9IHRoaXMuaW1nLmhlaWdodDtcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuQ3JhZnR5LmV4dGVuZCh7XG5cdF9zY2VuZXM6IFtdLFxuXHRfY3VycmVudDogbnVsbCxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS5zY2VuZVxuXHQqIEBjYXRlZ29yeSBTY2VuZXMsIFN0YWdlXG5cdCogQHRyaWdnZXIgU2NlbmVDaGFuZ2UgLSB3aGVuIGEgc2NlbmUgaXMgcGxheWVkIC0geyBvbGRTY2VuZTpTdHJpbmcsIG5ld1NjZW5lOlN0cmluZyB9XG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnNjZW5lKFN0cmluZyBzY2VuZU5hbWUsIEZ1bmN0aW9uIGluaXRbLCBGdW5jdGlvbiB1bmluaXRdKVxuXHQqIEBwYXJhbSBzY2VuZU5hbWUgLSBOYW1lIG9mIHRoZSBzY2VuZSB0byBhZGRcblx0KiBAcGFyYW0gaW5pdCAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBzY2VuZSBpcyBwbGF5ZWRcblx0KiBAcGFyYW0gdW5pbml0IC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBiZWZvcmUgbmV4dCBzY2VuZSBpcyBwbGF5ZWQsIGFmdGVyIGVudGl0aWVzIHdpdGggYDJEYCBhcmUgZGVzdHJveWVkXG5cdCogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LnNjZW5lKFN0cmluZyBzY2VuZU5hbWUpXG5cdCogQHBhcmFtIHNjZW5lTmFtZSAtIE5hbWUgb2Ygc2NlbmUgdG8gcGxheVxuXHQqIFxuXHQqIE1ldGhvZCB0byBjcmVhdGUgc2NlbmVzIG9uIHRoZSBzdGFnZS4gUGFzcyBhbiBJRCBhbmQgZnVuY3Rpb24gdG8gcmVnaXN0ZXIgYSBzY2VuZS5cblx0KlxuXHQqIFRvIHBsYXkgYSBzY2VuZSwganVzdCBwYXNzIHRoZSBJRC4gV2hlbiBhIHNjZW5lIGlzIHBsYXllZCwgYWxsXG5cdCogZW50aXRpZXMgd2l0aCB0aGUgYDJEYCBjb21wb25lbnQgb24gdGhlIHN0YWdlIGFyZSBkZXN0cm95ZWQuXG5cdCpcblx0KiBJZiB5b3Ugd2FudCBzb21lIGVudGl0aWVzIHRvIHBlcnNpc3Qgb3ZlciBzY2VuZXMgKGFzIGluIG5vdCBiZSBkZXN0cm95ZWQpXG5cdCogc2ltcGx5IGFkZCB0aGUgY29tcG9uZW50IGBQZXJzaXN0YC5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogQ3JhZnR5LnNjZW5lKFwibG9hZGluZ1wiLCBmdW5jdGlvbigpIHt9KTtcblx0KlxuXHQqIENyYWZ0eS5zY2VuZShcImxvYWRpbmdcIiwgZnVuY3Rpb24oKSB7fSwgZnVuY3Rpb24oKSB7fSk7XG5cdCpcblx0KiBDcmFmdHkuc2NlbmUoXCJsb2FkaW5nXCIpO1xuXHQqIH5+flxuXHQqL1xuXHRzY2VuZTogZnVuY3Rpb24gKG5hbWUsIGludHJvLCBvdXRybykge1xuXHRcdC8vcGxheSBzY2VuZVxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRDcmFmdHkudmlld3BvcnQucmVzZXQoKTtcblx0XHRcdENyYWZ0eShcIjJEXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoIXRoaXMuaGFzKFwiUGVyc2lzdFwiKSkgdGhpcy5kZXN0cm95KCk7XG5cdFx0XHR9KTtcblx0XHRcdC8vIHVuaW5pdGlhbGl6ZSBwcmV2aW91cyBzY2VuZVxuXHRcdFx0aWYgKHRoaXMuX2N1cnJlbnQgIT09IG51bGwgJiYgJ3VuaW5pdGlhbGl6ZScgaW4gdGhpcy5fc2NlbmVzW3RoaXMuX2N1cnJlbnRdKSB7XG5cdFx0XHRcdHRoaXMuX3NjZW5lc1t0aGlzLl9jdXJyZW50XS51bmluaXRpYWxpemUuY2FsbCh0aGlzKTtcblx0XHRcdH1cblx0XHRcdC8vIGluaXRpYWxpemUgbmV4dCBzY2VuZVxuXHRcdFx0dGhpcy5fc2NlbmVzW25hbWVdLmluaXRpYWxpemUuY2FsbCh0aGlzKTtcblx0XHRcdHZhciBvbGRTY2VuZSA9IHRoaXMuX2N1cnJlbnQ7XG5cdFx0XHR0aGlzLl9jdXJyZW50ID0gbmFtZTtcblx0XHRcdENyYWZ0eS50cmlnZ2VyKFwiU2NlbmVDaGFuZ2VcIiwgeyBvbGRTY2VuZTogb2xkU2NlbmUsIG5ld1NjZW5lOiBuYW1lIH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvL2FkZCBzY2VuZVxuXHRcdHRoaXMuX3NjZW5lc1tuYW1lXSA9IHt9XG5cdFx0dGhpcy5fc2NlbmVzW25hbWVdLmluaXRpYWxpemUgPSBpbnRyb1xuXHRcdGlmICh0eXBlb2Ygb3V0cm8gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLl9zY2VuZXNbbmFtZV0udW5pbml0aWFsaXplID0gb3V0cm87XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fSxcblxuXHQvKipAXG5cdCogI0NyYWZ0eS50b1JHQlxuXHQqIEBjYXRlZ29yeSBHcmFwaGljc1xuXHQqIEBzaWduIHB1YmxpYyBTdHJpbmcgQ3JhZnR5LnNjZW5lKFN0cmluZyBoZXhbLCBOdW1iZXIgYWxwaGFdKVxuXHQqIEBwYXJhbSBoZXggLSBhIDYgY2hhcmFjdGVyIGhleCBudW1iZXIgc3RyaW5nIHJlcHJlc2VudGluZyBSR0IgY29sb3Jcblx0KiBAcGFyYW0gYWxwaGEgLSBUaGUgYWxwaGEgdmFsdWUuXG5cdCogXG5cdCogR2V0IGEgcmdiIHN0cmluZyBvciByZ2JhIHN0cmluZyAoaWYgYGFscGhhYCBwcmVzZW50cykuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiBDcmFmdHkudG9SR0IoXCJmZmZmZmZcIik7IC8vIHJnYigyNTUsMjU1LDI1NSlcblx0KiBDcmFmdHkudG9SR0IoXCIjZmZmZmZmXCIpOyAvLyByZ2IoMjU1LDI1NSwyNTUpXG5cdCogQ3JhZnR5LnRvUkdCKFwiZmZmZmZmXCIsIC41KTsgLy8gcmdiYSgyNTUsMjU1LDI1NSwwLjUpXG5cdCogfn5+XG5cdCogXG5cdCogQHNlZSBUZXh0LnRleHRDb2xvclxuXHQqL1xuXHR0b1JHQjogZnVuY3Rpb24gKGhleCwgYWxwaGEpIHtcblx0XHR2YXIgaGV4ID0gKGhleC5jaGFyQXQoMCkgPT09ICcjJykgPyBoZXguc3Vic3RyKDEpIDogaGV4LFxuXHRcdFx0YyA9IFtdLCByZXN1bHQ7XG5cblx0XHRjWzBdID0gcGFyc2VJbnQoaGV4LnN1YnN0cigwLCAyKSwgMTYpO1xuXHRcdGNbMV0gPSBwYXJzZUludChoZXguc3Vic3RyKDIsIDIpLCAxNik7XG5cdFx0Y1syXSA9IHBhcnNlSW50KGhleC5zdWJzdHIoNCwgMiksIDE2KTtcblxuXHRcdHJlc3VsdCA9IGFscGhhID09PSB1bmRlZmluZWQgPyAncmdiKCcgKyBjLmpvaW4oJywnKSArICcpJyA6ICdyZ2JhKCcgKyBjLmpvaW4oJywnKSArICcsJyArIGFscGhhICsgJyknO1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufSk7XG5cbnZhciBEaXJ0eVJlY3RhbmdsZXMgPSAoZnVuY3Rpb24oKSB7XG5cblx0ZnVuY3Rpb24geDEocmVjdCkgeyByZXR1cm4gcmVjdC5feDsgfVxuXHRmdW5jdGlvbiB4MihyZWN0KSB7IHJldHVybiByZWN0Ll94ICsgcmVjdC5fdzsgfVxuXHRmdW5jdGlvbiB5MShyZWN0KSB7IHJldHVybiByZWN0Ll95OyB9XG5cdGZ1bmN0aW9uIHkyKHJlY3QpIHsgcmV0dXJuIHJlY3QuX3kgKyByZWN0Ll9oOyB9XG5cblx0ZnVuY3Rpb24gaW50ZXJzZWN0cyhhLCBiKSB7XG5cdFx0cmV0dXJuIHgxKGEpIDwgeDIoYikgJiYgeDIoYSkgPiB4MShiKSAmJiB5MShhKSA8IHkyKGIpICYmIHkyKGEpID4geTEoYik7XG5cdH1cblxuXHR2YXIgY29ybmVyX2RhdGEgPSB7fTtcblxuXHRmdW5jdGlvbiByZXNldF9jb3JuZXJfZGF0YSgpIHtcblx0XHRjb3JuZXJfZGF0YS54MXkxID0gZmFsc2U7XG5cdFx0Y29ybmVyX2RhdGEueDF5MiA9IGZhbHNlO1xuXHRcdGNvcm5lcl9kYXRhLngyeTEgPSBmYWxzZTtcblx0XHRjb3JuZXJfZGF0YS54MnkyID0gZmFsc2U7XG5cdFx0Y29ybmVyX2RhdGEuY291bnQgPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBudW1iZXIgb2YgY29ybmVycyBvZiBiIHRoYXQgYXJlIGluc2lkZSBhLlxuXHQvLyBfY29ybmVyc0luc2lkZSBzdG9yZXMgaXRzIHJlc3VsdHMgaW4gX2Nvcm5lcl9kYXRhLiBUaGlzIGlzIHNhZmUgdG8gZG9cblx0Ly8gc2luY2UgdGhlIG9ubHkgcmVjdXJzaXZlIGNhbGwgaW4gdGhpcyBmaWxlIGlzIGluIHRhaWwgcG9zaXRpb24uXG5cdGZ1bmN0aW9uIGNvcm5lcnNfaW5zaWRlKGEsIGIpIHtcblx0XHRyZXNldF9jb3JuZXJfZGF0YSgpO1xuXG5cdFx0Ly8gVGhlIHgxLCB5MSBjb3JuZXIgb2YgYi5cblx0XHRpZiAoeDEoYikgPj0geDEoYSkgJiYgeDEoYikgPD0geDIoYSkpIHtcblxuXHRcdFx0Ly8gVGhlIHgxLCB5MSBjb3JuZXIgb2YgYi5cblx0XHRcdGlmICh5MShiKSA+PSB5MShhKSAmJiB5MShiKSA8PSB5MihhKSkge1xuXHRcdFx0XHRjb3JuZXJfZGF0YS54MXkxID0gdHJ1ZTtcblx0XHRcdFx0Y29ybmVyX2RhdGEuY291bnQrKztcblx0XHRcdH1cblx0XHRcdC8vIFRoZSB4MSwgeTIgY29ybmVyIG9mIGJcblx0XHRcdGlmICh5MihiKSA+PSB5MShhKSAmJiB5MihiKSA8PSB5MihhKSkge1xuXHRcdFx0XHRjb3JuZXJfZGF0YS54MXkyID0gdHJ1ZTtcblx0XHRcdFx0Y29ybmVyX2RhdGEuY291bnQrKztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoeDIoYikgPj0geDEoYSkgJiYgeDIoYikgPD0geDIoYSkpIHtcblx0XHRcdC8vIFRoZSB4MiwgeTEgY29ybmVyIG9mIGIuXG5cdFx0XHRpZiAoeTEoYikgPj0geTEoYSkgJiYgeTEoYikgPD0geTIoYSkpIHtcblx0XHRcdFx0Y29ybmVyX2RhdGEueDJ5MSA9IHRydWU7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLmNvdW50Kys7XG5cdFx0XHR9XG5cdFx0XHQvLyBUaGUgeDIsIHkyIGNvcm5lciBvZiBiXG5cdFx0XHRpZiAoeTIoYikgPj0geTEoYSkgJiYgeTIoYikgPD0geTIoYSkpIHtcblx0XHRcdFx0Y29ybmVyX2RhdGEueDJ5MiA9IHRydWU7XG5cdFx0XHRcdGNvcm5lcl9kYXRhLmNvdW50Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNvcm5lcl9kYXRhLmNvdW50O1xuXHR9XG5cblx0Ly8gU2hyaW5rIGNvbnRhaW5lZCBzbyB0aGF0IGl0IG5vIGxvbmdlciBvdmVybGFwcyBjb250YWluaW5nLlxuXHQvLyBSZXF1aXJlczpcblx0Ly8gICAqIEV4YWN0bHkgdHdvIGNvcm5lcnMgb2YgY29udGFpbmVkIGFyZSB3aXRoaW4gY29udGFpbmluZy5cblx0Ly8gICAqIF9jb3JuZXJzSW5zaWRlIGNhbGxlZCBmb3IgY29udGFpbmluZyBhbmQgY29udGFpbmVkLlxuXHRmdW5jdGlvbiBzaHJpbmtfcmVjdChjb250YWluaW5nLCBjb250YWluZWQpIHtcblxuXHRcdC8vIFRoZSB4MSwgeTEgYW5kIHgyLCB5MSBjb3JuZXIgb2YgY29udGFpbmVkLlxuXHRcdGlmIChjb3JuZXJfZGF0YS54MXkxICYmIGNvcm5lcl9kYXRhLngyeTEpIHtcblx0XHRcdGNvbnRhaW5lZC5faCAtPSB5Mihjb250YWluaW5nKSAtIHkxKGNvbnRhaW5lZCk7XG5cdFx0XHRjb250YWluZWQuX3kgPSB5Mihjb250YWluaW5nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUaGUgeDEsIHkxIGFuZCB4MSwgeTIgY29ybmVyIG9mIGNvbnRhaW5lZC5cblx0XHRpZiAoY29ybmVyX2RhdGEueDF5MSAmJiBjb3JuZXJfZGF0YS54MXkyKSB7XG5cdFx0XHRjb250YWluZWQuX3cgLT0geDIoY29udGFpbmluZykgLSB4MShjb250YWluZWQpO1xuXHRcdFx0Y29udGFpbmVkLl94ID0geDIoY29udGFpbmluZyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gVGhlIHgxLCB5MiBhbmQgeDIsIHkyIGNvcm5lciBvZiBjb250YWluZWQuXG5cdFx0aWYgKGNvcm5lcl9kYXRhLngxeTIgJiYgY29ybmVyX2RhdGEueDJ5Mikge1xuXHRcdFx0Y29udGFpbmVkLl9oID0geTEoY29udGFpbmluZykgLSB5MShjb250YWluZWQpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB4MiwgeTEgYW5kIHgyLCB5MiBjb3JuZXIgb2YgY29udGFpbmVkLlxuXHRcdGlmIChjb3JuZXJfZGF0YS54MnkxICYmIGNvcm5lcl9kYXRhLngyeTIpIHtcblx0XHRcdGNvbnRhaW5lZC5fdyA9IHgxKGNvbnRhaW5pbmcpIC0geDEoY29udGFpbmVkKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0fVxuXG5cdC8vIEVubGFyZ2UgYGFgIHN1Y2ggdGhhdCBpdCBjb3ZlcnMgYGJgIGFzIHdlbGwuXG5cdGZ1bmN0aW9uIG1lcmdlX2ludG8oYSwgYikge1xuXHRcdHZhciBuZXdYMiA9IE1hdGgubWF4KHgyKGEpLCB4MihiKSk7XG5cdFx0dmFyIG5ld1kyID0gTWF0aC5tYXgoeTIoYSksIHkyKGIpKTtcblxuXHRcdGEuX3ggPSBNYXRoLm1pbihhLl94LCBiLl94KTtcblx0XHRhLl95ID0gTWF0aC5taW4oYS5feSwgYi5feSk7XG5cblx0XHRhLl93ID0gbmV3WDIgLSBhLl94O1xuXHRcdGEuX2ggPSBuZXdZMiAtIGEuX3k7XG5cdH1cblxuXHRmdW5jdGlvbiBEaXJ0eVJlY3RhbmdsZXMoKSB7XG5cdFx0dGhpcy5yZWN0YW5nbGVzID0gW107XG5cdH07XG5cblx0RGlydHlSZWN0YW5nbGVzLnByb3RvdHlwZS5hZGRfcmVjdGFuZ2xlID0gZnVuY3Rpb24obmV3X3JlY3QpIHtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0dmFyIGluZGljZXNfdG9fZGVsZXRlID0gW107XG5cblx0XHRmdW5jdGlvbiBkZWxldGVfaW5kaWNlcygpIHtcblx0XHRcdHZhciBpLCBpbmRleDtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBpbmRpY2VzX3RvX2RlbGV0ZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpbmRleCA9IGluZGljZXNfdG9fZGVsZXRlW2ldO1xuXHRcdFx0XHRfdGhpcy5yZWN0YW5nbGVzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIGluZGV4LCByZWN0LCBjb3JuZXJzLCBpbmRpY2VzX3RvX2RlbGV0ZTtcblxuXHRcdGZvciAoaW5kZXggPSAwOyBpbmRleCA8IHRoaXMucmVjdGFuZ2xlcy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdHJlY3QgPSB0aGlzLnJlY3RhbmdsZXNbaW5kZXhdO1xuXG5cdFx0XHRpZiAoaW50ZXJzZWN0cyhuZXdfcmVjdCwgcmVjdCkpIHtcblx0XHRcdFx0Y29ybmVycyA9IGNvcm5lcnNfaW5zaWRlKHJlY3QsIG5ld19yZWN0KTtcblx0XHRcdFx0c3dpdGNoIChjb3JuZXJzKSB7XG5cdFx0XHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRcdFx0Ly8gSWYgNCBjb3JuZXJzIG9mIG5ld19yZWN0IGxpZSB3aXRoaW4gcmVjdCwgd2UgY2FuIGRpc2NhcmRcblx0XHRcdFx0XHRcdC8vIG5ld19yZWN0LiAgV2Ugc2hvdWxkbid0IGhhdmUgZm91bmQgYW55IHJlY3RhbmdsZXMgdG8gZGVsZXRlLFxuXHRcdFx0XHRcdFx0Ly8gYmVjYXVzZSBpZiBhIHJlY3RhbmdsZSBpbiB0aGUgbGlzdCBpcyBjb250YWluZWQgd2l0aGluXG5cdFx0XHRcdFx0XHQvLyBuZXdfcmVjdCwgYW5kIG5ld19yZWN0IGlzIGNvbnRhaW5lZCB3aXRoIHJlY3QsIHRoZW4gdGhlcmUgYXJlXG5cdFx0XHRcdFx0XHQvLyBvdmVybGFwcGluZyByZWN0YW5nbGVzIGluIHRoZSBsaXN0LlxuXHRcdFx0XHRcdFx0aWYgKGluZGljZXNfdG9fZGVsZXRlLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEaXJ0eSByZWN0YW5nbGUgYnVnXCIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdGNhc2UgMzpcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbXBvc3NpYmxlIGNvcm5lciBjb3VudFwiKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0XHQvLyBTaHJpbmsgbmV3X3JlY3QgdG8gbm90IG92ZXJsYXAgcmVjdC5cblx0XHRcdFx0XHRcdHNocmlua19yZWN0KHJlY3QsIG5ld19yZWN0KTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRcdGNvcm5lcnMgPSBjb3JuZXJzX2luc2lkZShuZXdfcmVjdCwgcmVjdCk7XG5cdFx0XHRcdFx0XHRzd2l0Y2ggKGNvcm5lcnMpIHtcblx0XHRcdFx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdFx0XHRcdC8vIE1lcmdlIHRoZSB0d28gcmVjdGFuZ2xlcy5cblx0XHRcdFx0XHRcdFx0XHRtZXJnZV9pbnRvKHJlY3QsIG5ld19yZWN0KTtcblx0XHRcdFx0XHRcdFx0XHQvLyBUT0RPOiBNdXN0IHJlbW92ZSByZWN0IGFuZCByZS1pbnNlcnQgaXQuXG5cdFx0XHRcdFx0XHRcdFx0aW5kaWNlc190b19kZWxldGUudW5zaGlmdChpbmRleCk7XG5cdFx0XHRcdFx0XHRcdFx0ZGVsZXRlX2luZGljZXMoKTtcblx0XHRcdFx0XHRcdFx0XHRfdGhpcy5hZGRfcmVjdGFuZ2xlKHJlY3QpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRcdFx0XHRcdC8vIFRoaXMgY2FzZSBsb29rcyBsaWtlIHRoaXM6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gKy0tLS0tLS0tKz09PT09PT09PSstLS0tLS0tLS0tK1xuXHRcdFx0XHRcdFx0XHRcdC8vIHxyZWN0ICAgIHwgICAgICAgICB8ICAgICAgICAgIHxcblx0XHRcdFx0XHRcdFx0XHQvLyB8ICAgICAgICB8ICAgICAgICAgfCAgICAgICAgICB8XG5cdFx0XHRcdFx0XHRcdFx0Ly8gKy0tLS0tLS0tKy0tLS0tLS0tLSsgbmV3X3JlY3QgfFxuXHRcdFx0XHRcdFx0XHRcdC8vICAgICAgICAgICstLS0tLS0tLS0tLS0tLS0tLS0tLStcblx0XHRcdFx0XHRcdFx0XHQvLyBOb3RlIGhvdyBuZXdfcmVjdCBoYXMgMSBjb3JuZXIgaW4gcmVjdCwgd2hpbGVcblx0XHRcdFx0XHRcdFx0XHQvLyByZWN0IGhhcyAyIGNvcm5lcnMgaW4gbmV3X3JlY3QuXG5cdFx0XHRcdFx0XHRcdFx0Ly9cblx0XHRcdFx0XHRcdFx0XHQvLyBPYnZpb3VzbHksIHdlIHNocmluayByZWN0IHRvIG5vdCBvdmVybGFwIG5ld19yZWN0LlxuXHRcdFx0XHRcdFx0XHRcdHNocmlua19yZWN0KG5ld19yZWN0LCByZWN0KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRcdFx0XHRcdC8vIFRoaXMgY2FzZSBvY2N1cnMgd2hlbiBuZXdfcmVjdCBhbmQgcmVjdCBoYXZlIDEgY29ybmVyIGluIGNvbW1vbixcblx0XHRcdFx0XHRcdFx0XHQvLyBidXQgcmVjdCBsaWVzIGVudGlyZWx5IHdpdGhpbiBuZXdfcmVjdC5cblx0XHRcdFx0XHRcdFx0XHQvLyBXZSBkZWxldGUgcmVjdCwgc2luY2UgbmV3X3JlY3QgZW5jb21wYXNzZXMgaXQsIGFuZCBjb250aW51ZSB3aXRoXG5cdFx0XHRcdFx0XHRcdFx0Ly8gaW5zZXJ0aW9uIG5vcm1hbGx5LlxuXHRcdFx0XHRcdFx0XHRcdGluZGljZXNfdG9fZGVsZXRlLnVuc2hpZnQoaW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEaXJ0eSByZWN0YW5nbGUgYnVnXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRcdFx0Ly8gTm8gY29ybmVycyBvZiBuZXdfcmVjdCBhcmUgaW5zaWRlIHJlY3QuIEluc3RlYWQsIHNlZSBob3cgbWFueVxuXHRcdFx0XHRcdFx0Ly8gY29ybmVycyBvZiByZWN0IGFyZSBpbnNpZGUgbmV3X3JlY3Rcblx0XHRcdFx0XHRcdGNvcm5lcnMgPSBjb3JuZXJzX2luc2lkZShuZXdfcmVjdCwgcmVjdCk7XG5cdFx0XHRcdFx0XHRzd2l0Y2ggKGNvcm5lcnMpIHtcblx0XHRcdFx0XHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRcdFx0XHRcdC8vIERlbGV0ZSByZWN0LCBjb250aW51ZSB3aXRoIGluc2VydGlvbiBvZiBuZXdfcmVjdFxuXHRcdFx0XHRcdFx0XHRcdGluZGljZXNfdG9fZGVsZXRlLnVuc2hpZnQoaW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlIDM6XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkltcG9zc2libGUgY29ybmVyIGNvdW50XCIpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRcdFx0XHRcdC8vIFNocmluayByZWN0IHRvIG5vdCBvdmVybGFwIG5ld19yZWN0LCBjb250aW51ZSB3aXRoIGluc2VydGlvbi5cblx0XHRcdFx0XHRcdFx0XHRzaHJpbmtfcmVjdChuZXdfcmVjdCwgcmVjdCk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGlzIHNob3VsZCBiZSBpbXBvc3NpYmxlLCB0aGUgZWFybGllciBjYXNlIG9mIDEgY29ybmVyIG92ZXJsYXBwaW5nXG5cdFx0XHRcdFx0XHRcdFx0Ly8gc2hvdWxkIGhhdmUgYmVlbiB0cmlnZ2VyZWQuXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkltcG9zc2libGUgY29ybmVyIGNvdW50XCIpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGRlbGV0ZV9pbmRpY2VzKCk7XG5cdFx0dGhpcy5yZWN0YW5nbGVzLnB1c2gobmV3X3JlY3QpO1xuXHR9O1xuXG5cdHJldHVybiBEaXJ0eVJlY3RhbmdsZXM7XG5cbn0pKCk7XG5cbi8qKkBcbiogI0NyYWZ0eS5EcmF3TWFuYWdlclxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQHNpZ24gQ3JhZnR5LkRyYXdNYW5hZ2VyXG4qIFxuKiBBbiBpbnRlcm5hbCBvYmplY3QgbWFuYWdlIG9iamVjdHMgdG8gYmUgZHJhd24gYW5kIGltcGxlbWVudFxuKiB0aGUgYmVzdCBtZXRob2Qgb2YgZHJhd2luZyBpbiBib3RoIERPTSBhbmQgY2FudmFzXG4qL1xuQ3JhZnR5LkRyYXdNYW5hZ2VyID0gKGZ1bmN0aW9uICgpIHtcblx0LyoqIGFycmF5IG9mIGRpcnR5IHJlY3RzIG9uIHNjcmVlbiAqL1xuXHR2YXIgZGlydHlfcmVjdHMgPSBbXSxcblx0LyoqIGFycmF5IG9mIERPTXMgbmVlZGVkIHVwZGF0aW5nICovXG5cdFx0ZG9tID0gW107XG5cblx0cmV0dXJuIHtcblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLnRvdGFsMkRcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogXG5cdFx0KiBUb3RhbCBudW1iZXIgb2YgdGhlIGVudGl0aWVzIHRoYXQgaGF2ZSB0aGUgYDJEYCBjb21wb25lbnQuXG5cdFx0Ki9cblx0XHR0b3RhbDJEOiBDcmFmdHkoXCIyRFwiKS5sZW5ndGgsXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLm9uU2NyZWVuXG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIub25TY3JlZW4oT2JqZWN0IHJlY3QpXG5cdFx0KiBAcGFyYW0gcmVjdCAtIEEgcmVjdGFuZ2xlIHdpdGggZmllbGQge194OiB4X3ZhbCwgX3k6IHlfdmFsLCBfdzogd192YWwsIF9oOiBoX3ZhbH1cblx0XHQqIFxuXHRcdCogVGVzdCBpZiBhIHJlY3RhbmdsZSBpcyBjb21wbGV0ZWx5IGluIHZpZXdwb3J0XG5cdFx0Ki9cblx0XHRvblNjcmVlbjogZnVuY3Rpb24gKHJlY3QpIHtcblx0XHRcdHJldHVybiBDcmFmdHkudmlld3BvcnQuX3ggKyByZWN0Ll94ICsgcmVjdC5fdyA+IDAgJiYgQ3JhZnR5LnZpZXdwb3J0Ll95ICsgcmVjdC5feSArIHJlY3QuX2ggPiAwICYmXG5cdFx0XHRcdCAgIENyYWZ0eS52aWV3cG9ydC5feCArIHJlY3QuX3ggPCBDcmFmdHkudmlld3BvcnQud2lkdGggJiYgQ3JhZnR5LnZpZXdwb3J0Ll95ICsgcmVjdC5feSA8IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIubWVyZ2Vcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkuRHJhd01hbmFnZXIubWVyZ2UoT2JqZWN0IHNldClcblx0XHQqIEBwYXJhbSBzZXQgLSBhbiBhcnJheSBvZiByZWN0YW5ndWxhciByZWdpb25zXG5cdFx0KiBcblx0XHQqIE1lcmdlZCBpbnRvIG5vbiBvdmVybGFwcGluZyByZWN0YW5ndWxhciByZWdpb25cblx0XHQqIEl0cyBhbiBvcHRpbWl6YXRpb24gZm9yIHRoZSByZWRyYXcgcmVnaW9ucy5cblx0XHQqL1xuXHRcdG1lcmdlOiBmdW5jdGlvbiAoc2V0KSB7XG5cdFx0XHR2YXIgZHIgPSBuZXcgRGlydHlSZWN0YW5nbGVzKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbmV3X3JlY3Q7IG5ld19yZWN0ID0gc2V0W2ldOyBpKyspIHtcblx0XHRcdFx0ZHIuYWRkX3JlY3RhbmdsZShuZXdfcmVjdCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZHIucmVjdGFuZ2xlcztcblx0XHR9LFxuXG5cdFx0LyoqQFxuXHRcdCogI0NyYWZ0eS5EcmF3TWFuYWdlci5hZGRcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5hZGQob2xkLCBjdXJyZW50KVxuXHRcdCogQHBhcmFtIG9sZCAtIFVuZG9jdW1lbnRlZFxuXHRcdCogQHBhcmFtIGN1cnJlbnQgLSBVbmRvY3VtZW50ZWRcblx0XHQqIFxuXHRcdCogQ2FsY3VsYXRlIHRoZSBib3VuZGluZyByZWN0IG9mIGRpcnR5IGRhdGEgYW5kIGFkZCB0byB0aGUgcmVnaXN0ZXIgb2YgZGlydHkgcmVjdGFuZ2xlc1xuXHRcdCovXG5cdFx0YWRkOiBmdW5jdGlvbiBhZGQob2xkLCBjdXJyZW50KSB7XG5cdFx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdFx0ZG9tLnB1c2gob2xkKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcmVjdCxcblx0XHRcdFx0YmVmb3JlID0gb2xkLl9tYnIgfHwgb2xkLFxuXHRcdFx0XHRhZnRlciA9IGN1cnJlbnQuX21iciB8fCBjdXJyZW50O1xuXG5cdFx0XHRpZiAob2xkID09PSBjdXJyZW50KSB7XG5cdFx0XHRcdHJlY3QgPSBvbGQubWJyKCkgfHwgb2xkLnBvcygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVjdCA9IHtcblx0XHRcdFx0XHRfeDogfn5NYXRoLm1pbihiZWZvcmUuX3gsIGFmdGVyLl94KSxcblx0XHRcdFx0XHRfeTogfn5NYXRoLm1pbihiZWZvcmUuX3ksIGFmdGVyLl95KSxcblx0XHRcdFx0XHRfdzogTWF0aC5tYXgoYmVmb3JlLl93LCBhZnRlci5fdykgKyBNYXRoLm1heChiZWZvcmUuX3gsIGFmdGVyLl94KSxcblx0XHRcdFx0XHRfaDogTWF0aC5tYXgoYmVmb3JlLl9oLCBhZnRlci5faCkgKyBNYXRoLm1heChiZWZvcmUuX3ksIGFmdGVyLl95KVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHJlY3QuX3cgPSAocmVjdC5fdyAtIHJlY3QuX3gpO1xuXHRcdFx0XHRyZWN0Ll9oID0gKHJlY3QuX2ggLSByZWN0Ll95KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlY3QuX3cgPT09IDAgfHwgcmVjdC5faCA9PT0gMCB8fCAhdGhpcy5vblNjcmVlbihyZWN0KSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vZmxvb3IvY2VpbFxuXHRcdFx0cmVjdC5feCA9IH5+cmVjdC5feDtcblx0XHRcdHJlY3QuX3kgPSB+fnJlY3QuX3k7XG5cdFx0XHRyZWN0Ll93ID0gKHJlY3QuX3cgPT09IH5+cmVjdC5fdykgPyByZWN0Ll93IDogcmVjdC5fdyArIDEgfCAwO1xuXHRcdFx0cmVjdC5faCA9IChyZWN0Ll9oID09PSB+fnJlY3QuX2gpID8gcmVjdC5faCA6IHJlY3QuX2ggKyAxIHwgMDtcblxuXHRcdFx0Ly9hZGQgdG8gZGlydHlfcmVjdHMsIGNoZWNrIGZvciBtZXJnaW5nXG5cdFx0XHRkaXJ0eV9yZWN0cy5wdXNoKHJlY3QpO1xuXG5cdFx0XHQvL2lmIGl0IGdvdCBtZXJnZWRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLmRlYnVnXG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIuZGVidWcoKVxuXHRcdCovXG5cdFx0ZGVidWc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnNvbGUubG9nKGRpcnR5X3JlY3RzLCBkb20pO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3KFtPYmplY3QgcmVjdF0pXG4gICAgICAgICogQHBhcmFtIHJlY3QgLSBhIHJlY3Rhbmd1bGFyIHJlZ2lvbiB7X3g6IHhfdmFsLCBfeTogeV92YWwsIF93OiB3X3ZhbCwgX2g6IGhfdmFsfVxuICAgICAgICAqIH5+flxuXHRcdCogLSBJZiByZWN0IGlzIG9taXR0ZWQsIHJlZHJhdyB3aXRoaW4gdGhlIHZpZXdwb3J0XG5cdFx0KiAtIElmIHJlY3QgaXMgcHJvdmlkZWQsIHJlZHJhdyB3aXRoaW4gdGhlIHJlY3Rcblx0XHQqIH5+flxuXHRcdCovXG5cdFx0ZHJhd0FsbDogZnVuY3Rpb24gKHJlY3QpIHtcblx0XHRcdHZhciByZWN0ID0gcmVjdCB8fCBDcmFmdHkudmlld3BvcnQucmVjdCgpLFxuXHRcdFx0XHRxID0gQ3JhZnR5Lm1hcC5zZWFyY2gocmVjdCksXG5cdFx0XHRcdGkgPSAwLFxuXHRcdFx0XHRsID0gcS5sZW5ndGgsXG5cdFx0XHRcdGN0eCA9IENyYWZ0eS5jYW52YXMuY29udGV4dCxcblx0XHRcdFx0Y3VycmVudDtcblxuXHRcdFx0Y3R4LmNsZWFyUmVjdChyZWN0Ll94LCByZWN0Ll95LCByZWN0Ll93LCByZWN0Ll9oKTtcblxuXHRcdFx0Ly9zb3J0IHRoZSBvYmplY3RzIGJ5IHRoZSBnbG9iYWwgWlxuXHRcdFx0cS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhLl9nbG9iYWxaIC0gYi5fZ2xvYmFsWjsgfSk7XG5cdFx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRjdXJyZW50ID0gcVtpXTtcblx0XHRcdFx0aWYgKGN1cnJlbnQuX3Zpc2libGUgJiYgY3VycmVudC5fX2MuQ2FudmFzKSB7XG5cdFx0XHRcdFx0Y3VycmVudC5kcmF3KCk7XG5cdFx0XHRcdFx0Y3VycmVudC5fY2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQqICNDcmFmdHkuRHJhd01hbmFnZXIuYm91bmRpbmdSZWN0XG5cdFx0KiBAY29tcCBDcmFmdHkuRHJhd01hbmFnZXJcblx0XHQqIEBzaWduIHB1YmxpYyBDcmFmdHkuRHJhd01hbmFnZXIuYm91bmRpbmdSZWN0KHNldClcblx0XHQqIEBwYXJhbSBzZXQgLSBVbmRvY3VtZW50ZWRcblx0XHQqIH5+flxuXHRcdCogLSBDYWxjdWxhdGUgdGhlIGNvbW1vbiBib3VuZGluZyByZWN0IG9mIG11bHRpcGxlIGNhbnZhcyBlbnRpdGllcy5cblx0XHQqIC0gUmV0dXJucyBjb29yZHNcblx0XHQqIH5+flxuXHRcdCovXG5cdFx0Ym91bmRpbmdSZWN0OiBmdW5jdGlvbiAoc2V0KSB7XG5cdFx0XHRpZiAoIXNldCB8fCAhc2V0Lmxlbmd0aCkgcmV0dXJuO1xuXHRcdFx0dmFyIG5ld3NldCA9IFtdLCBpID0gMSxcblx0XHRcdGwgPSBzZXQubGVuZ3RoLCBjdXJyZW50LCBtYXN0ZXIgPSBzZXRbMF0sIHRtcDtcblx0XHRcdG1hc3RlciA9IFttYXN0ZXIuX3gsIG1hc3Rlci5feSwgbWFzdGVyLl94ICsgbWFzdGVyLl93LCBtYXN0ZXIuX3kgKyBtYXN0ZXIuX2hdO1xuXHRcdFx0d2hpbGUgKGkgPCBsKSB7XG5cdFx0XHRcdGN1cnJlbnQgPSBzZXRbaV07XG5cdFx0XHRcdHRtcCA9IFtjdXJyZW50Ll94LCBjdXJyZW50Ll95LCBjdXJyZW50Ll94ICsgY3VycmVudC5fdywgY3VycmVudC5feSArIGN1cnJlbnQuX2hdO1xuXHRcdFx0XHRpZiAodG1wWzBdIDwgbWFzdGVyWzBdKSBtYXN0ZXJbMF0gPSB0bXBbMF07XG5cdFx0XHRcdGlmICh0bXBbMV0gPCBtYXN0ZXJbMV0pIG1hc3RlclsxXSA9IHRtcFsxXTtcblx0XHRcdFx0aWYgKHRtcFsyXSA+IG1hc3RlclsyXSkgbWFzdGVyWzJdID0gdG1wWzJdO1xuXHRcdFx0XHRpZiAodG1wWzNdID4gbWFzdGVyWzNdKSBtYXN0ZXJbM10gPSB0bXBbM107XG5cdFx0XHRcdGkrKztcblx0XHRcdH1cblx0XHRcdHRtcCA9IG1hc3Rlcjtcblx0XHRcdG1hc3RlciA9IHsgX3g6IHRtcFswXSwgX3k6IHRtcFsxXSwgX3c6IHRtcFsyXSAtIHRtcFswXSwgX2g6IHRtcFszXSAtIHRtcFsxXSB9O1xuXG5cdFx0XHRyZXR1cm4gbWFzdGVyO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0KiAjQ3JhZnR5LkRyYXdNYW5hZ2VyLmRyYXdcblx0XHQqIEBjb21wIENyYWZ0eS5EcmF3TWFuYWdlclxuXHRcdCogQHNpZ24gcHVibGljIENyYWZ0eS5EcmF3TWFuYWdlci5kcmF3KClcblx0XHQqIH5+flxuXHRcdCogLSBJZiB0aGUgbnVtYmVyIG9mIHJlY3RzIGlzIG92ZXIgNjAlIG9mIHRoZSB0b3RhbCBudW1iZXIgb2Ygb2JqZWN0c1xuXHRcdCpcdGRvIHRoZSBuYWl2ZSBtZXRob2QgcmVkcmF3aW5nIGBDcmFmdHkuRHJhd01hbmFnZXIuZHJhd0FsbGBcblx0XHQqIC0gT3RoZXJ3aXNlLCBjbGVhciB0aGUgZGlydHkgcmVnaW9ucywgYW5kIHJlZHJhdyBlbnRpdGllcyBvdmVybGFwcGluZyB0aGUgZGlydHkgcmVnaW9ucy5cblx0XHQqIH5+flxuXHRcdCogXG4gICAgICAgICogQHNlZSBDYW52YXMuZHJhdywgRE9NLmRyYXdcblx0XHQqL1xuXHRcdGRyYXc6IGZ1bmN0aW9uIGRyYXcoKSB7XG5cdFx0XHQvL2lmIG5vdGhpbmcgaW4gZGlydHlfcmVjdHMsIHN0b3Bcblx0XHRcdGlmICghZGlydHlfcmVjdHMubGVuZ3RoICYmICFkb20ubGVuZ3RoKSByZXR1cm47XG5cblx0XHRcdHZhciBpID0gMCwgbCA9IGRpcnR5X3JlY3RzLmxlbmd0aCwgayA9IGRvbS5sZW5ndGgsIHJlY3QsIHEsXG5cdFx0XHRcdGosIGxlbiwgZHVwZXMsIG9iaiwgZW50LCBvYmpzID0gW10sIGN0eCA9IENyYWZ0eS5jYW52YXMuY29udGV4dDtcblxuXHRcdFx0Ly9sb29wIG92ZXIgYWxsIERPTSBlbGVtZW50cyBuZWVkaW5nIHVwZGF0aW5nXG5cdFx0XHRmb3IgKDsgaSA8IGs7ICsraSkge1xuXHRcdFx0XHRkb21baV0uZHJhdygpLl9jaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHQvL3Jlc2V0IERPTSBhcnJheVxuICAgICAgICAgICAgZG9tLmxlbmd0aCA9IDA7XG5cdFx0XHQvL2FnYWluLCBzdG9wIGlmIG5vdGhpbmcgaW4gZGlydHlfcmVjdHNcblx0XHRcdGlmICghbCkgeyByZXR1cm47IH1cblxuXHRcdFx0Ly9pZiB0aGUgYW1vdW50IG9mIHJlY3RzIGlzIG92ZXIgNjAlIG9mIHRoZSB0b3RhbCBvYmplY3RzXG5cdFx0XHQvL2RvIHRoZSBuYWl2ZSBtZXRob2QgcmVkcmF3aW5nXG5cdFx0XHRpZiAodHJ1ZSB8fCBsIC8gdGhpcy50b3RhbDJEID4gMC42KSB7XG5cdFx0XHRcdHRoaXMuZHJhd0FsbCgpO1xuXHRcdFx0XHRkaXJ0eV9yZWN0cy5sZW5ndGggPSAwO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGRpcnR5X3JlY3RzID0gdGhpcy5tZXJnZShkaXJ0eV9yZWN0cyk7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgKytpKSB7IC8vbG9vcCBvdmVyIGV2ZXJ5IGRpcnR5IHJlY3Rcblx0XHRcdFx0cmVjdCA9IGRpcnR5X3JlY3RzW2ldO1xuXHRcdFx0XHRpZiAoIXJlY3QpIGNvbnRpbnVlO1xuXHRcdFx0XHRxID0gQ3JhZnR5Lm1hcC5zZWFyY2gocmVjdCwgZmFsc2UpOyAvL3NlYXJjaCBmb3IgZW50cyB1bmRlciBkaXJ0eSByZWN0XG5cblx0XHRcdFx0ZHVwZXMgPSB7fTtcblxuXHRcdFx0XHQvL2xvb3Agb3ZlciBmb3VuZCBvYmplY3RzIHJlbW92aW5nIGR1cGVzIGFuZCBhZGRpbmcgdG8gb2JqIGFycmF5XG5cdFx0XHRcdGZvciAoaiA9IDAsIGxlbiA9IHEubGVuZ3RoOyBqIDwgbGVuOyArK2opIHtcblx0XHRcdFx0XHRvYmogPSBxW2pdO1xuXG5cdFx0XHRcdFx0aWYgKGR1cGVzW29ialswXV0gfHwgIW9iai5fdmlzaWJsZSB8fCAhb2JqLl9fYy5DYW52YXMpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRkdXBlc1tvYmpbMF1dID0gdHJ1ZTtcblxuXHRcdFx0XHRcdG9ianMucHVzaCh7IG9iajogb2JqLCByZWN0OiByZWN0IH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9jbGVhciB0aGUgcmVjdCBmcm9tIHRoZSBtYWluIGNhbnZhc1xuXHRcdFx0XHRjdHguY2xlYXJSZWN0KHJlY3QuX3gsIHJlY3QuX3ksIHJlY3QuX3csIHJlY3QuX2gpO1xuXG5cdFx0XHR9XG5cblx0XHRcdC8vc29ydCB0aGUgb2JqZWN0cyBieSB0aGUgZ2xvYmFsIFpcblx0XHRcdG9ianMuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYS5vYmouX2dsb2JhbFogLSBiLm9iai5fZ2xvYmFsWjsgfSk7XG5cdFx0XHRpZiAoIW9ianMubGVuZ3RoKXsgcmV0dXJuOyB9XG5cblx0XHRcdC8vbG9vcCBvdmVyIHRoZSBvYmplY3RzXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gb2Jqcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0b2JqID0gb2Jqc1tpXTtcblx0XHRcdFx0cmVjdCA9IG9iai5yZWN0O1xuXHRcdFx0XHRlbnQgPSBvYmoub2JqO1xuXG5cdFx0XHRcdHZhciBhcmVhID0gZW50Ll9tYnIgfHwgZW50LFxuXHRcdFx0XHRcdHggPSAocmVjdC5feCAtIGFyZWEuX3ggPD0gMCkgPyAwIDogfn4ocmVjdC5feCAtIGFyZWEuX3gpLFxuXHRcdFx0XHRcdHkgPSAocmVjdC5feSAtIGFyZWEuX3kgPCAwKSA/IDAgOiB+fihyZWN0Ll95IC0gYXJlYS5feSksXG5cdFx0XHRcdFx0dyA9IH5+TWF0aC5taW4oYXJlYS5fdyAtIHgsIHJlY3QuX3cgLSAoYXJlYS5feCAtIHJlY3QuX3gpLCByZWN0Ll93LCBhcmVhLl93KSxcblx0XHRcdFx0XHRoID0gfn5NYXRoLm1pbihhcmVhLl9oIC0geSwgcmVjdC5faCAtIChhcmVhLl95IC0gcmVjdC5feSksIHJlY3QuX2gsIGFyZWEuX2gpO1xuXG5cdFx0XHRcdC8vbm8gcG9pbnQgZHJhd2luZyB3aXRoIG5vIHdpZHRoIG9yIGhlaWdodFxuXHRcdFx0XHRpZiAoaCA9PT0gMCB8fCB3ID09PSAwKSBjb250aW51ZTtcblxuXHRcdFx0XHRjdHguc2F2ZSgpO1xuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdGN0eC5tb3ZlVG8ocmVjdC5feCwgcmVjdC5feSk7XG5cdFx0XHRcdGN0eC5saW5lVG8ocmVjdC5feCArIHJlY3QuX3csIHJlY3QuX3kpO1xuXHRcdFx0XHRjdHgubGluZVRvKHJlY3QuX3ggKyByZWN0Ll93LCByZWN0Ll9oICsgcmVjdC5feSk7XG5cdFx0XHRcdGN0eC5saW5lVG8ocmVjdC5feCwgcmVjdC5faCArIHJlY3QuX3kpO1xuXHRcdFx0XHRjdHgubGluZVRvKHJlY3QuX3gsIHJlY3QuX3kpO1xuXG5cdFx0XHRcdGN0eC5jbGlwKCk7XG5cblx0XHRcdFx0ZW50LmRyYXcoKTtcblx0XHRcdFx0Y3R4LmNsb3NlUGF0aCgpO1xuXHRcdFx0XHRjdHgucmVzdG9yZSgpO1xuXG5cdFx0XHRcdC8vYWxsb3cgZW50aXR5IHRvIHJlLWRpcnR5X3JlY3RzXG5cdFx0XHRcdGVudC5fY2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2VtcHR5IGRpcnR5X3JlY3RzXG5cdFx0XHRkaXJ0eV9yZWN0cy5sZW5ndGggPSAwO1xuXHRcdFx0Ly9hbGwgbWVyZ2VkIElEcyBhcmUgbm93IGludmFsaWRcblx0XHRcdG1lcmdlZCA9IHt9O1xuXHRcdH1cblx0fTtcbn0pKCk7XG5cbkNyYWZ0eS5leHRlbmQoe1xuLyoqQFxuKiAjQ3JhZnR5Lmlzb21ldHJpY1xuKiBAY2F0ZWdvcnkgMkRcbiogUGxhY2UgZW50aXRpZXMgaW4gYSA0NWRlZyBpc29tZXRyaWMgZmFzaGlvbi5cbiovXG4gICAgaXNvbWV0cmljOiB7XG4gICAgICAgIF90aWxlOiB7XG4gICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgIGhlaWdodDogMFxuICAgICAgICB9LFxuICAgICAgICBfZWxlbWVudHM6e30sXG4gICAgICAgIF9wb3M6IHtcbiAgICAgICAgICAgIHg6MCxcbiAgICAgICAgICAgIHk6MFxuICAgICAgICB9LFxuICAgICAgICBfejogMCxcbiAgICAgICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuaXNvbWV0cmljLnNpemVcbiAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5Lmlzb21ldHJpYy5zaXplKE51bWJlciB0aWxlU2l6ZSlcbiAgICAgICAgKiBAcGFyYW0gdGlsZVNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgdGlsZXMgdG8gcGxhY2UuXG4gICAgICAgICogXG4gICAgICAgICogTWV0aG9kIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgc2l6ZSBvZiB0aGUgaXNvbWV0cmljIHBsYWNlbWVudC5cbiAgICAgICAgKiBSZWNvbW1lbmRlZCB0byB1c2UgYSBzaXplIHZhbHVlcyBpbiB0aGUgcG93ZXIgb2YgYDJgICgxMjgsIDY0IG9yIDMyKS5cbiAgICAgICAgKiBUaGlzIG1ha2VzIGl0IGVhc3kgdG8gY2FsY3VsYXRlIHBvc2l0aW9ucyBhbmQgaW1wbGVtZW50IHpvb21pbmcuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCk7XG4gICAgICAgICogfn5+XG4gICAgICAgICogXG4gICAgICAgICogQHNlZSBDcmFmdHkuaXNvbWV0cmljLnBsYWNlXG4gICAgICAgICovXG4gICAgICAgIHNpemU6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLl90aWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB0aGlzLl90aWxlLmhlaWdodCA9IGhlaWdodCA+IDAgPyBoZWlnaHQgOiB3aWR0aC8yOyAvL1NldHVwIHdpZHRoLzIgaWYgaGVpZ2h0IGlzbid0IHNldFxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5wbGFjZVxuICAgICAgICAqIEBjb21wIENyYWZ0eS5pc29tZXRyaWNcbiAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLnBsYWNlKE51bWJlciB4LCBOdW1iZXIgeSwgTnVtYmVyIHosIEVudGl0eSB0aWxlKVxuICAgICAgICAqIEBwYXJhbSB4IC0gVGhlIGB4YCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgdGlsZVxuICAgICAgICAqIEBwYXJhbSB5IC0gVGhlIGB5YCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgdGlsZVxuICAgICAgICAqIEBwYXJhbSB6IC0gVGhlIGB6YCBwb3NpdGlvbiBvciBoZWlnaHQgdG8gcGxhY2UgdGhlIHRpbGVcbiAgICAgICAgKiBAcGFyYW0gdGlsZSAtIFRoZSBlbnRpdHkgdGhhdCBzaG91bGQgYmUgcG9zaXRpb24gaW4gdGhlIGlzb21ldHJpYyBmYXNoaW9uXG4gICAgICAgICogXG4gICAgICAgICogVXNlIHRoaXMgbWV0aG9kIHRvIHBsYWNlIGFuIGVudGl0eSBpbiBhbiBpc29tZXRyaWMgZ3JpZC5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAqIH5+flxuICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4KTtcbiAgICAgICAgKiBpc28ucGxhY2UoMiwgMSwgMCwgQ3JhZnR5LmUoJzJELCBET00sIENvbG9yJykuY29sb3IoJ3JlZCcpLmF0dHIoe3c6MTI4LCBoOjEyOH0pKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5pc29tZXRyaWMuc2l6ZVxuICAgICAgICAqL1xuICAgICAgICBwbGFjZTogZnVuY3Rpb24gKHgsIHksIHosIG9iaikge1xuICAgICAgICAgICAgdmFyIHBvcyA9IHRoaXMucG9zMnB4KHgseSk7XG4gICAgICAgICAgICBwb3MudG9wIC09IHogKiAodGhpcy5fdGlsZS53aWR0aCAvIDIpO1xuICAgICAgICAgICAgb2JqLmF0dHIoe1xuICAgICAgICAgICAgICAgIHg6IHBvcy5sZWZ0ICsgQ3JhZnR5LnZpZXdwb3J0Ll94LCBcbiAgICAgICAgICAgICAgICB5OiBwb3MudG9wICsgQ3JhZnR5LnZpZXdwb3J0Ll95XG4gICAgICAgICAgICB9KS56ICs9IHo7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5wb3MycHhcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLnBvczJweChOdW1iZXIgeCxOdW1iZXIgeSlcbiAgICAgICAgICogQHBhcmFtIHggXG4gICAgICAgICAqIEBwYXJhbSB5XG4gICAgICAgICAqIEByZXR1cm4gT2JqZWN0IHtsZWZ0IE51bWJlcix0b3AgTnVtYmVyfVxuICAgICAgICAgKiBcbiAgICAgICAgICogVGhpcyBtZXRob2QgY2FsY3VsYXRlIHRoZSBYIGFuZCBZIENvb3JkaW5hdGVzIHRvIFBpeGVsIFBvc2l0aW9uc1xuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4LDk2KTtcbiAgICAgICAgICogdmFyIHBvc2l0aW9uID0gaXNvLnBvczJweCgxMDAsMTAwKTsgLy9PYmplY3QgeyBsZWZ0PTEyODAwLCB0b3A9NDgwMH1cbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBwb3MycHg6ZnVuY3Rpb24oeCx5KXtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbGVmdDp4ICogdGhpcy5fdGlsZS53aWR0aCArICh5ICYgMSkgKiAodGhpcy5fdGlsZS53aWR0aCAvIDIpLFxuICAgICAgICAgICAgICAgIHRvcDp5ICogdGhpcy5fdGlsZS5oZWlnaHQgLyAyIFxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAgLyoqQFxuICAgICAgICAgKiAjQ3JhZnR5Lmlzb21ldHJpYy5weDJwb3NcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLnB4MnBvcyhOdW1iZXIgbGVmdCxOdW1iZXIgdG9wKVxuICAgICAgICAgKiBAcGFyYW0gdG9wIFxuICAgICAgICAgKiBAcGFyYW0gbGVmdFxuICAgICAgICAgKiBAcmV0dXJuIE9iamVjdCB7eCBOdW1iZXIseSBOdW1iZXJ9XG4gICAgICAgICAqIFxuICAgICAgICAgKiBUaGlzIG1ldGhvZCBjYWxjdWxhdGUgcGl4ZWwgdG9wLGxlZnQgcG9zaXRpb25zIHRvIHgseSBjb29yZGluYXRlc1xuICAgICAgICAgKiBcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqIHZhciBpc28gPSBDcmFmdHkuaXNvbWV0cmljLnNpemUoMTI4LDk2KTtcbiAgICAgICAgICogdmFyIHB4ID0gaXNvLnBvczJweCgxMjgwMCw0ODAwKTtcbiAgICAgICAgICogY29uc29sZS5sb2cocHgpOyAvL09iamVjdCB7IHg9LTEwMCwgeT0tMTAwfVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIHB4MnBvczpmdW5jdGlvbihsZWZ0LHRvcCl7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHg6TWF0aC5jZWlsKC1sZWZ0IC8gdGhpcy5fdGlsZS53aWR0aCAtICh0b3AgJiAxKSowLjUpLFxuICAgICAgICAgICAgICAgIHk6LXRvcCAvIHRoaXMuX3RpbGUuaGVpZ2h0ICogMlxuICAgICAgICAgICAgfTsgXG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMuY2VudGVyQXRcbiAgICAgICAgICogQGNvbXAgQ3JhZnR5Lmlzb21ldHJpY1xuICAgICAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuaXNvbWV0cmljLmNlbnRlckF0KE51bWJlciB4LE51bWJlciB5KVxuICAgICAgICAgKiBAcGFyYW0gdG9wIFxuICAgICAgICAgKiBAcGFyYW0gbGVmdFxuICAgICAgICAgKiBcbiAgICAgICAgICogVGhpcyBtZXRob2QgY2VudGVyIHRoZSBWaWV3cG9ydCBhdCB4L3kgbG9jYXRpb24gb3IgZ2l2ZXMgdGhlIGN1cnJlbnQgY2VudGVycG9pbnQgb2YgdGhlIHZpZXdwb3J0XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiB+fn5cbiAgICAgICAgICogdmFyIGlzbyA9IENyYWZ0eS5pc29tZXRyaWMuc2l6ZSgxMjgsOTYpLmNlbnRlckF0KDEwLDEwKTsgLy9WaWV3cG9ydCBpcyBub3cgbW92ZWRcbiAgICAgICAgICogLy9BZnRlciBtb3ZpbmcgdGhlIHZpZXdwb3J0IGJ5IGFub3RoZXIgZXZlbnQgeW91IGNhbiBnZXQgdGhlIG5ldyBjZW50ZXIgcG9pbnRcbiAgICAgICAgICogY29uc29sZS5sb2coaXNvLmNlbnRlckF0KCkpO1xuICAgICAgICAgKiB+fn5cbiAgICAgICAgICovXG4gICAgICAgIGNlbnRlckF0OmZ1bmN0aW9uKHgseSl7ICAgXG4gICAgICAgICAgICBpZih0eXBlb2YgeCA9PSBcIm51bWJlclwiICYmIHR5cGVvZiB5ID09IFwibnVtYmVyXCIpe1xuICAgICAgICAgICAgICAgIHZhciBjZW50ZXIgPSB0aGlzLnBvczJweCh4LHkpO1xuICAgICAgICAgICAgICAgIENyYWZ0eS52aWV3cG9ydC5feCA9IC1jZW50ZXIubGVmdCtDcmFmdHkudmlld3BvcnQud2lkdGgvMi10aGlzLl90aWxlLndpZHRoLzI7XG4gICAgICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0Ll95ID0gLWNlbnRlci50b3ArQ3JhZnR5LnZpZXdwb3J0LmhlaWdodC8yLXRoaXMuX3RpbGUuaGVpZ2h0LzI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0b3A6LUNyYWZ0eS52aWV3cG9ydC5feStDcmFmdHkudmlld3BvcnQuaGVpZ2h0LzItdGhpcy5fdGlsZS5oZWlnaHQvMixcbiAgICAgICAgICAgICAgICAgICAgbGVmdDotQ3JhZnR5LnZpZXdwb3J0Ll94K0NyYWZ0eS52aWV3cG9ydC53aWR0aC8yLXRoaXMuX3RpbGUud2lkdGgvMlxuICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKkBcbiAgICAgICAgICogI0NyYWZ0eS5pc29tZXRyaWMuYXJlYVxuICAgICAgICAgKiBAY29tcCBDcmFmdHkuaXNvbWV0cmljXG4gICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5pc29tZXRyaWMuYXJlYSgpXG4gICAgICAgICAqIEByZXR1cm4gT2JqZWN0IHt4OntzdGFydCBOdW1iZXIsZW5kIE51bWJlcn0seTp7c3RhcnQgTnVtYmVyLGVuZCBOdW1iZXJ9fVxuICAgICAgICAgKiBcbiAgICAgICAgICogVGhpcyBtZXRob2QgZ2V0IHRoZSBBcmVhIHN1cnJvdW5kaW5nIGJ5IHRoZSBjZW50ZXJwb2ludCBkZXBlbmRzIG9uIHZpZXdwb3J0IGhlaWdodCBhbmQgd2lkdGhcbiAgICAgICAgICogXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIH5+flxuICAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5Lmlzb21ldHJpYy5zaXplKDEyOCw5NikuY2VudGVyQXQoMTAsMTApOyAvL1ZpZXdwb3J0IGlzIG5vdyBtb3ZlZFxuICAgICAgICAgKiB2YXIgYXJlYSA9IGlzby5hcmVhKCk7IC8vZ2V0IHRoZSBhcmVhXG4gICAgICAgICAqIGZvcih2YXIgeSA9IGFyZWEueS5zdGFydDt5IDw9IGFyZWEueS5lbmQ7eSsrKXtcbiAgICAgICAgICogICBmb3IodmFyIHggPSBhcmVhLnguc3RhcnQgO3ggPD0gYXJlYS54LmVuZDt4Kyspe1xuICAgICAgICAgKiAgICAgICBpc28ucGxhY2UoeCx5LDAsQ3JhZnR5LmUoXCIyRCxET00sZ3Jhc1wiKSk7IC8vRGlzcGxheSB0aWxlcyBpbiB0aGUgU2NyZWVuXG4gICAgICAgICAqICAgfVxuICAgICAgICAgKiB9ICBcbiAgICAgICAgICogfn5+XG4gICAgICAgICAqL1xuICAgICAgICBhcmVhOmZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvL0dldCB0aGUgY2VudGVyIFBvaW50IGluIHRoZSB2aWV3cG9ydFxuICAgICAgICAgICAgdmFyIGNlbnRlciA9IHRoaXMuY2VudGVyQXQoKTtcbiAgICAgICAgICAgIHZhciBzdGFydCA9IHRoaXMucHgycG9zKC1jZW50ZXIubGVmdCtDcmFmdHkudmlld3BvcnQud2lkdGgvMiwtY2VudGVyLnRvcCtDcmFmdHkudmlld3BvcnQuaGVpZ2h0LzIpO1xuICAgICAgICAgICAgdmFyIGVuZCA9IHRoaXMucHgycG9zKC1jZW50ZXIubGVmdC1DcmFmdHkudmlld3BvcnQud2lkdGgvMiwtY2VudGVyLnRvcC1DcmFmdHkudmlld3BvcnQuaGVpZ2h0LzIpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB4OntcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgOiBzdGFydC54LFxuICAgICAgICAgICAgICAgICAgICBlbmQgOiBlbmQueFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeTp7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0IDogc3RhcnQueSxcbiAgICAgICAgICAgICAgICAgICAgZW5kIDogZW5kLnlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IFxuICAgIH1cbn0pO1xuXG5cbkNyYWZ0eS5leHRlbmQoe1xuICAgIC8qKkBcbiogI0NyYWZ0eS5kaWFtb25kSXNvXG4qIEBjYXRlZ29yeSAyRFxuKiBQbGFjZSBlbnRpdGllcyBpbiBhIDQ1ZGVnIGRpYW1vbmQgaXNvbWV0cmljIGZhc2hpb24uIEl0IGlzIHNpbWlsYXIgdG8gaXNvbWV0cmljIGJ1dCBoYXMgYW5vdGhlciBncmlkIGxvY2F0aW9uc1xuKi9cbiAgICBkaWFtb25kSXNvOntcbiAgICAgICAgX3RpbGU6IHtcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgcjowXG4gICAgICAgIH0sXG4gICAgICAgIF9tYXA6e1xuICAgICAgICAgICAgd2lkdGg6MCxcbiAgICAgICAgICAgIGhlaWdodDowLFxuICAgICAgICAgICAgeDowLFxuICAgICAgICAgICAgeTowXG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBfb3JpZ2luOntcbiAgICAgICAgICAgIHg6MCxcbiAgICAgICAgICAgIHk6MFxuICAgICAgICB9LFxuICAgICAgICAvKipAXG4gICAgICAgICogI0NyYWZ0eS5kaWFtb25kSXNvLmluaXRcbiAgICAgICAgKiBAY29tcCBDcmFmdHkuZGlhbW9uZElzb1xuICAgICAgICAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5kaWFtb25kSXNvLmluaXQoTnVtYmVyIHRpbGVXaWR0aCxOdW1iZXIgdGlsZUhlaWdodCxOdW1iZXIgbWFwV2lkdGgsTnVtYmVyIG1hcEhlaWdodClcbiAgICAgICAgKiBAcGFyYW0gdGlsZVdpZHRoIC0gVGhlIHNpemUgb2YgYmFzZSB0aWxlIHdpZHRoIGluIFBpeGVsXG4gICAgICAgICogQHBhcmFtIHRpbGVIZWlnaHQgLSBUaGUgc2l6ZSBvZiBiYXNlIHRpbGUgaGVpZ2h0IGluIFBpeGVsXG4gICAgICAgICogQHBhcmFtIG1hcFdpZHRoIC0gVGhlIHdpZHRoIG9mIHdob2xlIG1hcCBpbiBUaWxlc1xuICAgICAgICAqIEBwYXJhbSBtYXBIZWlnaHQgLSBUaGUgaGVpZ2h0IG9mIHdob2xlIG1hcCBpbiBUaWxlc1xuICAgICAgICAqIFxuICAgICAgICAqIE1ldGhvZCB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHNpemUgb2YgdGhlIGlzb21ldHJpYyBwbGFjZW1lbnQuXG4gICAgICAgICogUmVjb21tZW5kZWQgdG8gdXNlIGEgc2l6ZSBhbHVlcyBpbiB0aGUgcG93ZXIgb2YgYDJgICgxMjgsIDY0IG9yIDMyKS5cbiAgICAgICAgKiBUaGlzIG1ha2VzIGl0IGVhc3kgdG8gY2FsY3VsYXRlIHBvc2l0aW9ucyBhbmQgaW1wbGVtZW50IHpvb21pbmcuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5LmRpYW1vbmRJc28uaW5pdCg2NCwxMjgsMjAsMjApO1xuICAgICAgICAqIH5+flxuICAgICAgICAqIFxuICAgICAgICAqIEBzZWUgQ3JhZnR5LmRpYW1vbmRJc28ucGxhY2VcbiAgICAgICAgKi9cbiAgICAgICAgaW5pdDpmdW5jdGlvbih0dywgdGgsbXcsbWgpe1xuICAgICAgICAgICAgdGhpcy5fdGlsZS53aWR0aCA9IHBhcnNlSW50KHR3KTtcbiAgICAgICAgICAgIHRoaXMuX3RpbGUuaGVpZ2h0ID0gcGFyc2VJbnQodGgpfHxwYXJzZUludCh0dykvMjtcbiAgICAgICAgICAgIHRoaXMuX3RpbGUuciA9IHRoaXMuX3RpbGUud2lkdGggLyB0aGlzLl90aWxlLmhlaWdodDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fbWFwLndpZHRoID0gcGFyc2VJbnQobXcpO1xuICAgICAgICAgICAgdGhpcy5fbWFwLmhlaWdodCA9IHBhcnNlSW50KG1oKSB8fCBwYXJzZUludChtdyk7XG4gICAgICAgXG4gICAgICAgICAgICB0aGlzLl9vcmlnaW4ueCA9IHRoaXMuX21hcC5oZWlnaHQgKiB0aGlzLl90aWxlLndpZHRoIC8gMjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgLyoqQFxuICAgICAgICAqICNDcmFmdHkuZGlhbW9uZElzby5wbGFjZVxuICAgICAgICAqIEBjb21wIENyYWZ0eS5kaWFtb25kSXNvXG4gICAgICAgICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmRpYW1vbmRJc28ucGxhY2UoRW50aXR5IHRpbGUsTnVtYmVyIHgsIE51bWJlciB5LCBOdW1iZXIgbGF5ZXIpXG4gICAgICAgICogQHBhcmFtIHggLSBUaGUgYHhgIHBvc2l0aW9uIHRvIHBsYWNlIHRoZSB0aWxlXG4gICAgICAgICogQHBhcmFtIHkgLSBUaGUgYHlgIHBvc2l0aW9uIHRvIHBsYWNlIHRoZSB0aWxlXG4gICAgICAgICogQHBhcmFtIGxheWVyIC0gVGhlIGB6YCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgdGlsZSAoY2FsY3VsYXRlZCBieSB5IHBvc2l0aW9uICogbGF5ZXIpXG4gICAgICAgICogQHBhcmFtIHRpbGUgLSBUaGUgZW50aXR5IHRoYXQgc2hvdWxkIGJlIHBvc2l0aW9uIGluIHRoZSBpc29tZXRyaWMgZmFzaGlvblxuICAgICAgICAqIFxuICAgICAgICAqIFVzZSB0aGlzIG1ldGhvZCB0byBwbGFjZSBhbiBlbnRpdHkgaW4gYW4gaXNvbWV0cmljIGdyaWQuXG4gICAgICAgICogXG4gICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiB2YXIgaXNvID0gQ3JhZnR5LmRpYW1vbmRJc28uaW5pdCg2NCwxMjgsMjAsMjApO1xuICAgICAgICAqIGlzb3MucGxhY2UoQ3JhZnR5LmUoJzJELCBET00sIENvbG9yJykuY29sb3IoJ3JlZCcpLmF0dHIoe3c6MTI4LCBoOjEyOH0pLDEsMSwyKTtcbiAgICAgICAgKiB+fn5cbiAgICAgICAgKiBcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5kaWFtb25kSXNvLnNpemVcbiAgICAgICAgKi9cbiAgICAgICAgcGxhY2U6ZnVuY3Rpb24ob2JqLHgseSxsYXllcil7XG4gICAgICAgICAgICB2YXIgcG9zID0gdGhpcy5wb3MycHgoeCx5KTtcbiAgICAgICAgICAgIGlmKCFsYXllcikgbGF5ZXIgPSAxO1xuICAgICAgICAgICAgdmFyIG1hcmdpblggPSAwLG1hcmdpblkgPSAwO1xuICAgICAgICAgICAgaWYob2JqLl9fbWFyZ2luICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgIG1hcmdpblggPSBvYmouX19tYXJnaW5bMF07XG4gICAgICAgICAgICAgICAgbWFyZ2luWSA9IG9iai5fX21hcmdpblsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAgIG9iai54ID0gcG9zLmxlZnQrKG1hcmdpblgpO1xuICAgICAgICAgICAgb2JqLnkgPSAocG9zLnRvcCttYXJnaW5ZKS1vYmouaDtcbiAgICAgICAgICAgIG9iai56ID0gKHBvcy50b3ApKmxheWVyO1xuICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjZW50ZXJBdDpmdW5jdGlvbih4LHkpe1xuICAgICAgICAgICAgdmFyIHBvcyA9IHRoaXMucG9zMnB4KHgseSk7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQueCA9IC1wb3MubGVmdCtDcmFmdHkudmlld3BvcnQud2lkdGgvMi10aGlzLl90aWxlLndpZHRoO1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgPSAtcG9zLnRvcCtDcmFmdHkudmlld3BvcnQuaGVpZ2h0LzI7XG4gICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBhcmVhOmZ1bmN0aW9uKG9mZnNldCl7XG4gICAgICAgICAgICBpZighb2Zmc2V0KSBvZmZzZXQgPSAwO1xuICAgICAgICAgICAgLy9jYWxjdWxhdGUgdGhlIGNvcm5lcnNcbiAgICAgICAgICAgIHZhciB2cCA9IENyYWZ0eS52aWV3cG9ydC5yZWN0KCk7XG4gICAgICAgICAgICB2YXIgb3cgPSBvZmZzZXQqdGhpcy5fdGlsZS53aWR0aDtcbiAgICAgICAgICAgIHZhciBvaCA9IG9mZnNldCp0aGlzLl90aWxlLmhlaWdodDtcbiAgICAgICAgICAgIHZwLl94IC09ICh0aGlzLl90aWxlLndpZHRoLzIrb3cpO1xuICAgICAgICAgICAgdnAuX3kgLT0gKHRoaXMuX3RpbGUuaGVpZ2h0LzIrb2gpO1xuICAgICAgICAgICAgdnAuX3cgKz0gKHRoaXMuX3RpbGUud2lkdGgvMitvdyk7XG4gICAgICAgICAgICB2cC5faCArPSAodGhpcy5fdGlsZS5oZWlnaHQvMitvaCk7IFxuICAgICAgICAgICAgLyogIENyYWZ0eS52aWV3cG9ydC54ID0gLXZwLl94O1xuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LnkgPSAtdnAuX3k7ICAgIFxuICAgICAgICAgICAgQ3JhZnR5LnZpZXdwb3J0LndpZHRoID0gdnAuX3c7XG4gICAgICAgICAgICBDcmFmdHkudmlld3BvcnQuaGVpZ2h0ID0gdnAuX2g7ICAgKi9cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGdyaWQgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgeSA9IHZwLl95LHlsID0gKHZwLl95K3ZwLl9oKTt5PHlsO3krPXRoaXMuX3RpbGUuaGVpZ2h0LzIpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgeCA9IHZwLl94LHhsID0gKHZwLl94K3ZwLl93KTt4PHhsO3grPXRoaXMuX3RpbGUud2lkdGgvMil7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3cgPSB0aGlzLnB4MnBvcyh4LHkpO1xuICAgICAgICAgICAgICAgICAgICBncmlkLnB1c2goW35+cm93Lngsfn5yb3cueV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBncmlkOyAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgcG9zMnB4OmZ1bmN0aW9uKHgseSl7XG4gICAgICAgICAgICByZXR1cm57XG4gICAgICAgICAgICAgICAgbGVmdDooKHgteSkqdGhpcy5fdGlsZS53aWR0aC8yK3RoaXMuX29yaWdpbi54KSxcbiAgICAgICAgICAgICAgICB0b3A6KCh4K3kpKnRoaXMuX3RpbGUuaGVpZ2h0LzIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHB4MnBvczpmdW5jdGlvbihsZWZ0LHRvcCl7XG4gICAgICAgICAgICB2YXIgeCA9IChsZWZ0IC0gdGhpcy5fb3JpZ2luLngpL3RoaXMuX3RpbGUucjtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgeDooKHRvcCt4KSAvIHRoaXMuX3RpbGUuaGVpZ2h0KSxcbiAgICAgICAgICAgICAgICB5OigodG9wLXgpIC8gdGhpcy5fdGlsZS5oZWlnaHQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBwb2x5Z29uOmZ1bmN0aW9uKG9iail7XG4gICAgIFxuICAgICAgICAgICAgb2JqLnJlcXVpcmVzKFwiQ29sbGlzaW9uXCIpO1xuICAgICAgICAgICAgdmFyIG1hcmdpblggPSAwLG1hcmdpblkgPSAwO1xuICAgICAgICAgICAgaWYob2JqLl9fbWFyZ2luICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgIG1hcmdpblggPSBvYmouX19tYXJnaW5bMF07XG4gICAgICAgICAgICAgICAgbWFyZ2luWSA9IG9iai5fX21hcmdpblsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwb2ludHMgPSBbXG4gICAgICAgICAgICBbbWFyZ2luWC0wLG9iai5oLW1hcmdpblktdGhpcy5fdGlsZS5oZWlnaHQvMl0sXG4gICAgICAgICAgICBbbWFyZ2luWC10aGlzLl90aWxlLndpZHRoLzIsb2JqLmgtbWFyZ2luWS0wXSxcbiAgICAgICAgICAgIFttYXJnaW5YLXRoaXMuX3RpbGUud2lkdGgsb2JqLmgtbWFyZ2luWS10aGlzLl90aWxlLmhlaWdodC8yXSxcbiAgICAgICAgICAgIFttYXJnaW5YLXRoaXMuX3RpbGUud2lkdGgvMixvYmouaC1tYXJnaW5ZLXRoaXMuX3RpbGUuaGVpZ2h0XVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHZhciBwb2x5ID0gbmV3IENyYWZ0eS5wb2x5Z29uKHBvaW50cyk7XG4gICAgICAgICAgICByZXR1cm4gcG9seTtcbiAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICAgICBcbiAgICB9XG59KTtcblxuXG4vKipAXG4qICNQYXJ0aWNsZXNcbiogQGNhdGVnb3J5IEdyYXBoaWNzXG4qIEJhc2VkIG9uIFBhcmN5Y2xlIGJ5IE1yLiBTcGVha2VyLCBsaWNlbnNlZCB1bmRlciB0aGUgTUlULCBQb3J0ZWQgYnkgTGVvIEtvcHBlbGthbW1cbiogKipUaGlzIGlzIGNhbnZhcyBvbmx5ICYgd29uJ3QgZG8gYW55dGhpbmcgaWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IGl0ISoqXG4qIFRvIHNlZSBob3cgdGhpcyB3b3JrcyB0YWtlIGEgbG9vayBpbiBodHRwczovL2dpdGh1Yi5jb20vY3JhZnR5anMvQ3JhZnR5L2Jsb2IvbWFzdGVyL3NyYy9wYXJ0aWNsZXMuanNcbiovXG5DcmFmdHkuYyhcIlBhcnRpY2xlc1wiLCB7XG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHQvL1dlIG5lZWQgdG8gY2xvbmUgaXRcblx0XHR0aGlzLl9QYXJ0aWNsZXMgPSBDcmFmdHkuY2xvbmUodGhpcy5fUGFydGljbGVzKTtcblx0fSxcblxuXHQvKipAXG4gICAgKiAjLnBhcnRpY2xlc1xuICAgICogQGNvbXAgUGFydGljbGVzXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAucGFydGljbGVzKE9iamVjdCBvcHRpb25zKVxuICAgICogQHBhcmFtIG9wdGlvbnMgLSBNYXAgb2Ygb3B0aW9ucyB0aGF0IHNwZWNpZnkgdGhlIGJlaGF2aW9yIGFuZCBsb29rIG9mIHRoZSBwYXJ0aWNsZXMuXG4gICAgKlxuICAgICogQGV4YW1wbGVcbiAgICAqIH5+flxuXHQqIHZhciBvcHRpb25zID0ge1xuXHQqXHRtYXhQYXJ0aWNsZXM6IDE1MCxcblx0Klx0c2l6ZTogMTgsXG5cdCpcdHNpemVSYW5kb206IDQsXG5cdCpcdHNwZWVkOiAxLFxuXHQqXHRzcGVlZFJhbmRvbTogMS4yLFxuXHQqXHQvLyBMaWZlc3BhbiBpbiBmcmFtZXNcblx0Klx0bGlmZVNwYW46IDI5LFxuXHQqXHRsaWZlU3BhblJhbmRvbTogNyxcblx0Klx0Ly8gQW5nbGUgaXMgY2FsY3VsYXRlZCBjbG9ja3dpc2U6IDEycG0gaXMgMGRlZywgM3BtIGlzIDkwZGVnIGV0Yy5cblx0Klx0YW5nbGU6IDY1LFxuXHQqXHRhbmdsZVJhbmRvbTogMzQsXG5cdCpcdHN0YXJ0Q29sb3VyOiBbMjU1LCAxMzEsIDAsIDFdLFxuXHQqXHRzdGFydENvbG91clJhbmRvbTogWzQ4LCA1MCwgNDUsIDBdLFxuXHQqXHRlbmRDb2xvdXI6IFsyNDUsIDM1LCAwLCAwXSxcblx0Klx0ZW5kQ29sb3VyUmFuZG9tOiBbNjAsIDYwLCA2MCwgMF0sXG5cdCpcdC8vIE9ubHkgYXBwbGllcyB3aGVuIGZhc3RNb2RlIGlzIG9mZiwgc3BlY2lmaWVzIGhvdyBzaGFycCB0aGUgZ3JhZGllbnRzIGFyZSBkcmF3blxuXHQqXHRzaGFycG5lc3M6IDIwLFxuXHQqXHRzaGFycG5lc3NSYW5kb206IDEwLFxuXHQqXHQvLyBSYW5kb20gc3ByZWFkIGZyb20gb3JpZ2luXG5cdCpcdHNwcmVhZDogMTAsXG5cdCpcdC8vIEhvdyBtYW55IGZyYW1lcyBzaG91bGQgdGhpcyBsYXN0XG5cdCpcdGR1cmF0aW9uOiAtMSxcblx0Klx0Ly8gV2lsbCBkcmF3IHNxdWFyZXMgaW5zdGVhZCBvZiBjaXJjbGUgZ3JhZGllbnRzXG5cdCpcdGZhc3RNb2RlOiBmYWxzZSxcblx0Klx0Z3Jhdml0eTogeyB4OiAwLCB5OiAwLjEgfSxcblx0Klx0Ly8gc2Vuc2libGUgdmFsdWVzIGFyZSAwLTNcblx0Klx0aml0dGVyOiAwXG5cdCogfVxuXHQqXG5cdCogQ3JhZnR5LmUoXCIyRCxDYW52YXMsUGFydGljbGVzXCIpLnBhcnRpY2xlcyhvcHRpb25zKTtcbiAgICAqIH5+flxuICAgICovXG5cdHBhcnRpY2xlczogZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuXHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuY2FudmFzIHx8IENyYWZ0eS5kZWFjdGl2YXRlUGFydGljbGVzKSByZXR1cm4gdGhpcztcblxuXHRcdC8vSWYgd2UgZHJldyBvbiB0aGUgbWFpbiBjYW52YXMsIHdlJ2QgaGF2ZSB0byByZWRyYXdcblx0XHQvL3BvdGVudGlhbGx5IGh1Z2Ugc2VjdGlvbnMgb2YgdGhlIHNjcmVlbiBldmVyeSBmcmFtZVxuXHRcdC8vU28gd2UgY3JlYXRlIGEgc2VwYXJhdGUgY2FudmFzLCB3aGVyZSB3ZSBvbmx5IGhhdmUgdG8gcmVkcmF3XG5cdFx0Ly90aGUgY2hhbmdlZCBwYXJ0aWNsZXMuXG5cdFx0dmFyIGMsIGN0eCwgcmVsYXRpdmVYLCByZWxhdGl2ZVksIGJvdW5kaW5nO1xuXG5cdFx0YyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0Yy53aWR0aCA9IENyYWZ0eS52aWV3cG9ydC53aWR0aDtcblx0XHRjLmhlaWdodCA9IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQ7XG5cdFx0Yy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cblx0XHRDcmFmdHkuc3RhZ2UuZWxlbS5hcHBlbmRDaGlsZChjKTtcblxuXHRcdGN0eCA9IGMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRcdHRoaXMuX1BhcnRpY2xlcy5pbml0KG9wdGlvbnMpO1xuXG5cdFx0Ly8gQ2xlYW4gdXAgdGhlIERPTSB3aGVuIHRoaXMgY29tcG9uZW50IGlzIHJlbW92ZWRcblx0XHR0aGlzLmJpbmQoJ1JlbW92ZScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLnJlbW92ZUNoaWxkKGMpO1xuXHRcdH0pLmJpbmQoXCJSZW1vdmVDb21wb25lbnRcIiwgZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRpZiAoaWQgPT09IFwicGFydGljbGVzXCIpXG5cdFx0XHRcdENyYWZ0eS5zdGFnZS5lbGVtLnJlbW92ZUNoaWxkKGMpO1xuXHRcdH0pOztcblxuXHRcdHJlbGF0aXZlWCA9IHRoaXMueCArIENyYWZ0eS52aWV3cG9ydC54O1xuXHRcdHJlbGF0aXZlWSA9IHRoaXMueSArIENyYWZ0eS52aWV3cG9ydC55O1xuXHRcdHRoaXMuX1BhcnRpY2xlcy5wb3NpdGlvbiA9IHRoaXMuX1BhcnRpY2xlcy52ZWN0b3JIZWxwZXJzLmNyZWF0ZShyZWxhdGl2ZVgsIHJlbGF0aXZlWSk7XG5cblx0XHR2YXIgb2xkVmlld3BvcnQgPSB7IHg6IENyYWZ0eS52aWV3cG9ydC54LCB5OiBDcmFmdHkudmlld3BvcnQueSB9O1xuXG5cdFx0dGhpcy5iaW5kKCdFbnRlckZyYW1lJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0cmVsYXRpdmVYID0gdGhpcy54ICsgQ3JhZnR5LnZpZXdwb3J0Lng7XG5cdFx0XHRyZWxhdGl2ZVkgPSB0aGlzLnkgKyBDcmFmdHkudmlld3BvcnQueTtcblx0XHRcdHRoaXMuX1BhcnRpY2xlcy52aWV3cG9ydERlbHRhID0geyB4OiBDcmFmdHkudmlld3BvcnQueCAtIG9sZFZpZXdwb3J0LngsIHk6IENyYWZ0eS52aWV3cG9ydC55IC0gb2xkVmlld3BvcnQueSB9O1xuXG5cdFx0XHRvbGRWaWV3cG9ydCA9IHsgeDogQ3JhZnR5LnZpZXdwb3J0LngsIHk6IENyYWZ0eS52aWV3cG9ydC55IH07XG5cblx0XHRcdHRoaXMuX1BhcnRpY2xlcy5wb3NpdGlvbiA9IHRoaXMuX1BhcnRpY2xlcy52ZWN0b3JIZWxwZXJzLmNyZWF0ZShyZWxhdGl2ZVgsIHJlbGF0aXZlWSk7XG5cblx0XHRcdC8vU2VsZWN0aXZlIGNsZWFyaW5nXG5cdFx0XHRpZiAodHlwZW9mIENyYWZ0eS5EcmF3TWFuYWdlci5ib3VuZGluZ1JlY3QgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRib3VuZGluZyA9IENyYWZ0eS5EcmF3TWFuYWdlci5ib3VuZGluZ1JlY3QodGhpcy5fUGFydGljbGVzLnJlZ2lzdGVyKTtcblx0XHRcdFx0aWYgKGJvdW5kaW5nKSBjdHguY2xlYXJSZWN0KGJvdW5kaW5nLl94LCBib3VuZGluZy5feSwgYm91bmRpbmcuX3csIGJvdW5kaW5nLl9oKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGN0eC5jbGVhclJlY3QoMCwgMCwgQ3JhZnR5LnZpZXdwb3J0LndpZHRoLCBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KTtcblx0XHRcdH1cblxuXHRcdFx0Ly9UaGlzIHVwZGF0ZXMgYWxsIHBhcnRpY2xlIGNvbG9ycyAmIHBvc2l0aW9uc1xuXHRcdFx0dGhpcy5fUGFydGljbGVzLnVwZGF0ZSgpO1xuXG5cdFx0XHQvL1RoaXMgcmVuZGVycyB0aGUgdXBkYXRlZCBwYXJ0aWNsZXNcblx0XHRcdHRoaXMuX1BhcnRpY2xlcy5yZW5kZXIoY3R4KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0X1BhcnRpY2xlczoge1xuXHRcdHByZXNldHM6IHtcblx0XHRcdG1heFBhcnRpY2xlczogMTUwLFxuXHRcdFx0c2l6ZTogMTgsXG5cdFx0XHRzaXplUmFuZG9tOiA0LFxuXHRcdFx0c3BlZWQ6IDEsXG5cdFx0XHRzcGVlZFJhbmRvbTogMS4yLFxuXHRcdFx0Ly8gTGlmZXNwYW4gaW4gZnJhbWVzXG5cdFx0XHRsaWZlU3BhbjogMjksXG5cdFx0XHRsaWZlU3BhblJhbmRvbTogNyxcblx0XHRcdC8vIEFuZ2xlIGlzIGNhbGN1bGF0ZWQgY2xvY2t3aXNlOiAxMnBtIGlzIDBkZWcsIDNwbSBpcyA5MGRlZyBldGMuXG5cdFx0XHRhbmdsZTogNjUsXG5cdFx0XHRhbmdsZVJhbmRvbTogMzQsXG5cdFx0XHRzdGFydENvbG91cjogWzI1NSwgMTMxLCAwLCAxXSxcblx0XHRcdHN0YXJ0Q29sb3VyUmFuZG9tOiBbNDgsIDUwLCA0NSwgMF0sXG5cdFx0XHRlbmRDb2xvdXI6IFsyNDUsIDM1LCAwLCAwXSxcblx0XHRcdGVuZENvbG91clJhbmRvbTogWzYwLCA2MCwgNjAsIDBdLFxuXHRcdFx0Ly8gT25seSBhcHBsaWVzIHdoZW4gZmFzdE1vZGUgaXMgb2ZmLCBzcGVjaWZpZXMgaG93IHNoYXJwIHRoZSBncmFkaWVudHMgYXJlIGRyYXduXG5cdFx0XHRzaGFycG5lc3M6IDIwLFxuXHRcdFx0c2hhcnBuZXNzUmFuZG9tOiAxMCxcblx0XHRcdC8vIFJhbmRvbSBzcHJlYWQgZnJvbSBvcmlnaW5cblx0XHRcdHNwcmVhZDogMTAsXG5cdFx0XHQvLyBIb3cgbWFueSBmcmFtZXMgc2hvdWxkIHRoaXMgbGFzdFxuXHRcdFx0ZHVyYXRpb246IC0xLFxuXHRcdFx0Ly8gV2lsbCBkcmF3IHNxdWFyZXMgaW5zdGVhZCBvZiBjaXJjbGUgZ3JhZGllbnRzXG5cdFx0XHRmYXN0TW9kZTogZmFsc2UsXG5cdFx0XHRncmF2aXR5OiB7IHg6IDAsIHk6IDAuMSB9LFxuXHRcdFx0Ly8gc2Vuc2libGUgdmFsdWVzIGFyZSAwLTNcblx0XHRcdGppdHRlcjogMCxcblxuXHRcdFx0Ly9Eb24ndCBtb2RpZnkgdGhlIGZvbGxvd2luZ1xuXHRcdFx0cGFydGljbGVzOiBbXSxcblx0XHRcdGFjdGl2ZTogdHJ1ZSxcblx0XHRcdHBhcnRpY2xlQ291bnQ6IDAsXG5cdFx0XHRlbGFwc2VkRnJhbWVzOiAwLFxuXHRcdFx0ZW1pc3Npb25SYXRlOiAwLFxuXHRcdFx0ZW1pdENvdW50ZXI6IDAsXG5cdFx0XHRwYXJ0aWNsZUluZGV4OiAwXG5cdFx0fSxcblxuXG5cdFx0aW5pdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRcdHRoaXMucG9zaXRpb24gPSB0aGlzLnZlY3RvckhlbHBlcnMuY3JlYXRlKDAsIDApO1xuXHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zID09ICd1bmRlZmluZWQnKSB2YXIgb3B0aW9ucyA9IHt9O1xuXG5cdFx0XHQvL0NyZWF0ZSBjdXJyZW50IGNvbmZpZyBieSBtZXJnaW5nIGdpdmVuIG9wdGlvbnMgYW5kIHByZXNldHMuXG5cdFx0XHRmb3IgKGtleSBpbiB0aGlzLnByZXNldHMpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zW2tleV0gIT0gJ3VuZGVmaW5lZCcpIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcblx0XHRcdFx0ZWxzZSB0aGlzW2tleV0gPSB0aGlzLnByZXNldHNba2V5XTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5lbWlzc2lvblJhdGUgPSB0aGlzLm1heFBhcnRpY2xlcyAvIHRoaXMubGlmZVNwYW47XG5cdFx0XHR0aGlzLnBvc2l0aW9uUmFuZG9tID0gdGhpcy52ZWN0b3JIZWxwZXJzLmNyZWF0ZSh0aGlzLnNwcmVhZCwgdGhpcy5zcHJlYWQpO1xuXHRcdH0sXG5cblx0XHRhZGRQYXJ0aWNsZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRoaXMucGFydGljbGVDb3VudCA9PSB0aGlzLm1heFBhcnRpY2xlcykge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRha2UgdGhlIG5leHQgcGFydGljbGUgb3V0IG9mIHRoZSBwYXJ0aWNsZSBwb29sIHdlIGhhdmUgY3JlYXRlZCBhbmQgaW5pdGlhbGl6ZSBpdFxuXHRcdFx0dmFyIHBhcnRpY2xlID0gbmV3IHRoaXMucGFydGljbGUodGhpcy52ZWN0b3JIZWxwZXJzKTtcblx0XHRcdHRoaXMuaW5pdFBhcnRpY2xlKHBhcnRpY2xlKTtcblx0XHRcdHRoaXMucGFydGljbGVzW3RoaXMucGFydGljbGVDb3VudF0gPSBwYXJ0aWNsZTtcblx0XHRcdC8vIEluY3JlbWVudCB0aGUgcGFydGljbGUgY291bnRcblx0XHRcdHRoaXMucGFydGljbGVDb3VudCsrO1xuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXHRcdFJBTkRNMVRPMTogZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcblx0XHR9LFxuXHRcdGluaXRQYXJ0aWNsZTogZnVuY3Rpb24gKHBhcnRpY2xlKSB7XG5cdFx0XHRwYXJ0aWNsZS5wb3NpdGlvbi54ID0gdGhpcy5wb3NpdGlvbi54ICsgdGhpcy5wb3NpdGlvblJhbmRvbS54ICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdHBhcnRpY2xlLnBvc2l0aW9uLnkgPSB0aGlzLnBvc2l0aW9uLnkgKyB0aGlzLnBvc2l0aW9uUmFuZG9tLnkgKiB0aGlzLlJBTkRNMVRPMSgpO1xuXG5cdFx0XHR2YXIgbmV3QW5nbGUgPSAodGhpcy5hbmdsZSArIHRoaXMuYW5nbGVSYW5kb20gKiB0aGlzLlJBTkRNMVRPMSgpKSAqIChNYXRoLlBJIC8gMTgwKTsgLy8gY29udmVydCB0byByYWRpYW5zXG5cdFx0XHR2YXIgdmVjdG9yID0gdGhpcy52ZWN0b3JIZWxwZXJzLmNyZWF0ZShNYXRoLnNpbihuZXdBbmdsZSksIC1NYXRoLmNvcyhuZXdBbmdsZSkpOyAvLyBDb3VsZCBtb3ZlIHRvIGxvb2t1cCBmb3Igc3BlZWRcblx0XHRcdHZhciB2ZWN0b3JTcGVlZCA9IHRoaXMuc3BlZWQgKyB0aGlzLnNwZWVkUmFuZG9tICogdGhpcy5SQU5ETTFUTzEoKTtcblx0XHRcdHBhcnRpY2xlLmRpcmVjdGlvbiA9IHRoaXMudmVjdG9ySGVscGVycy5tdWx0aXBseSh2ZWN0b3IsIHZlY3RvclNwZWVkKTtcblxuXHRcdFx0cGFydGljbGUuc2l6ZSA9IHRoaXMuc2l6ZSArIHRoaXMuc2l6ZVJhbmRvbSAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRwYXJ0aWNsZS5zaXplID0gcGFydGljbGUuc2l6ZSA8IDAgPyAwIDogfn5wYXJ0aWNsZS5zaXplO1xuXHRcdFx0cGFydGljbGUudGltZVRvTGl2ZSA9IHRoaXMubGlmZVNwYW4gKyB0aGlzLmxpZmVTcGFuUmFuZG9tICogdGhpcy5SQU5ETTFUTzEoKTtcblxuXHRcdFx0cGFydGljbGUuc2hhcnBuZXNzID0gdGhpcy5zaGFycG5lc3MgKyB0aGlzLnNoYXJwbmVzc1JhbmRvbSAqIHRoaXMuUkFORE0xVE8xKCk7XG5cdFx0XHRwYXJ0aWNsZS5zaGFycG5lc3MgPSBwYXJ0aWNsZS5zaGFycG5lc3MgPiAxMDAgPyAxMDAgOiBwYXJ0aWNsZS5zaGFycG5lc3MgPCAwID8gMCA6IHBhcnRpY2xlLnNoYXJwbmVzcztcblx0XHRcdC8vIGludGVybmFsIGNpcmNsZSBncmFkaWVudCBzaXplIC0gYWZmZWN0cyB0aGUgc2hhcnBuZXNzIG9mIHRoZSByYWRpYWwgZ3JhZGllbnRcblx0XHRcdHBhcnRpY2xlLnNpemVTbWFsbCA9IH5+KChwYXJ0aWNsZS5zaXplIC8gMjAwKSAqIHBhcnRpY2xlLnNoYXJwbmVzcyk7IC8vKHNpemUvMi8xMDApXG5cdFx0XHR2YXIgc3RhcnQgPSBbXG5cdFx0XHRcdHRoaXMuc3RhcnRDb2xvdXJbMF0gKyB0aGlzLnN0YXJ0Q29sb3VyUmFuZG9tWzBdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5zdGFydENvbG91clsxXSArIHRoaXMuc3RhcnRDb2xvdXJSYW5kb21bMV0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLnN0YXJ0Q29sb3VyWzJdICsgdGhpcy5zdGFydENvbG91clJhbmRvbVsyXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuc3RhcnRDb2xvdXJbM10gKyB0aGlzLnN0YXJ0Q29sb3VyUmFuZG9tWzNdICogdGhpcy5SQU5ETTFUTzEoKVxuXHRcdFx0XHRdO1xuXG5cdFx0XHR2YXIgZW5kID0gW1xuXHRcdFx0XHR0aGlzLmVuZENvbG91clswXSArIHRoaXMuZW5kQ29sb3VyUmFuZG9tWzBdICogdGhpcy5SQU5ETTFUTzEoKSxcblx0XHRcdFx0dGhpcy5lbmRDb2xvdXJbMV0gKyB0aGlzLmVuZENvbG91clJhbmRvbVsxXSAqIHRoaXMuUkFORE0xVE8xKCksXG5cdFx0XHRcdHRoaXMuZW5kQ29sb3VyWzJdICsgdGhpcy5lbmRDb2xvdXJSYW5kb21bMl0gKiB0aGlzLlJBTkRNMVRPMSgpLFxuXHRcdFx0XHR0aGlzLmVuZENvbG91clszXSArIHRoaXMuZW5kQ29sb3VyUmFuZG9tWzNdICogdGhpcy5SQU5ETTFUTzEoKVxuXHRcdFx0XHRdO1xuXG5cdFx0XHRwYXJ0aWNsZS5jb2xvdXIgPSBzdGFydDtcblx0XHRcdHBhcnRpY2xlLmRlbHRhQ29sb3VyWzBdID0gKGVuZFswXSAtIHN0YXJ0WzBdKSAvIHBhcnRpY2xlLnRpbWVUb0xpdmU7XG5cdFx0XHRwYXJ0aWNsZS5kZWx0YUNvbG91clsxXSA9IChlbmRbMV0gLSBzdGFydFsxXSkgLyBwYXJ0aWNsZS50aW1lVG9MaXZlO1xuXHRcdFx0cGFydGljbGUuZGVsdGFDb2xvdXJbMl0gPSAoZW5kWzJdIC0gc3RhcnRbMl0pIC8gcGFydGljbGUudGltZVRvTGl2ZTtcblx0XHRcdHBhcnRpY2xlLmRlbHRhQ29sb3VyWzNdID0gKGVuZFszXSAtIHN0YXJ0WzNdKSAvIHBhcnRpY2xlLnRpbWVUb0xpdmU7XG5cdFx0fSxcblx0XHR1cGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLmFjdGl2ZSAmJiB0aGlzLmVtaXNzaW9uUmF0ZSA+IDApIHtcblx0XHRcdFx0dmFyIHJhdGUgPSAxIC8gdGhpcy5lbWlzc2lvblJhdGU7XG5cdFx0XHRcdHRoaXMuZW1pdENvdW50ZXIrKztcblx0XHRcdFx0d2hpbGUgKHRoaXMucGFydGljbGVDb3VudCA8IHRoaXMubWF4UGFydGljbGVzICYmIHRoaXMuZW1pdENvdW50ZXIgPiByYXRlKSB7XG5cdFx0XHRcdFx0dGhpcy5hZGRQYXJ0aWNsZSgpO1xuXHRcdFx0XHRcdHRoaXMuZW1pdENvdW50ZXIgLT0gcmF0ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmVsYXBzZWRGcmFtZXMrKztcblx0XHRcdFx0aWYgKHRoaXMuZHVyYXRpb24gIT0gLTEgJiYgdGhpcy5kdXJhdGlvbiA8IHRoaXMuZWxhcHNlZEZyYW1lcykge1xuXHRcdFx0XHRcdHRoaXMuc3RvcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMucGFydGljbGVJbmRleCA9IDA7XG5cdFx0XHR0aGlzLnJlZ2lzdGVyID0gW107XG5cdFx0XHR2YXIgZHJhdztcblx0XHRcdHdoaWxlICh0aGlzLnBhcnRpY2xlSW5kZXggPCB0aGlzLnBhcnRpY2xlQ291bnQpIHtcblxuXHRcdFx0XHR2YXIgY3VycmVudFBhcnRpY2xlID0gdGhpcy5wYXJ0aWNsZXNbdGhpcy5wYXJ0aWNsZUluZGV4XTtcblxuXHRcdFx0XHQvLyBJZiB0aGUgY3VycmVudCBwYXJ0aWNsZSBpcyBhbGl2ZSB0aGVuIHVwZGF0ZSBpdFxuXHRcdFx0XHRpZiAoY3VycmVudFBhcnRpY2xlLnRpbWVUb0xpdmUgPiAwKSB7XG5cblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIG5ldyBkaXJlY3Rpb24gYmFzZWQgb24gZ3Jhdml0eVxuXHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5kaXJlY3Rpb24gPSB0aGlzLnZlY3RvckhlbHBlcnMuYWRkKGN1cnJlbnRQYXJ0aWNsZS5kaXJlY3Rpb24sIHRoaXMuZ3Jhdml0eSk7XG5cdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uID0gdGhpcy52ZWN0b3JIZWxwZXJzLmFkZChjdXJyZW50UGFydGljbGUucG9zaXRpb24sIGN1cnJlbnRQYXJ0aWNsZS5kaXJlY3Rpb24pO1xuXHRcdFx0XHRcdGN1cnJlbnRQYXJ0aWNsZS5wb3NpdGlvbiA9IHRoaXMudmVjdG9ySGVscGVycy5hZGQoY3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLCB0aGlzLnZpZXdwb3J0RGVsdGEpO1xuXHRcdFx0XHRcdGlmICh0aGlzLmppdHRlcikge1xuXHRcdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLnggKz0gdGhpcy5qaXR0ZXIgKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0XHRcdFx0Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLnkgKz0gdGhpcy5qaXR0ZXIgKiB0aGlzLlJBTkRNMVRPMSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUudGltZVRvTGl2ZS0tO1xuXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIGNvbG91cnNcblx0XHRcdFx0XHR2YXIgciA9IGN1cnJlbnRQYXJ0aWNsZS5jb2xvdXJbMF0gKz0gY3VycmVudFBhcnRpY2xlLmRlbHRhQ29sb3VyWzBdO1xuXHRcdFx0XHRcdHZhciBnID0gY3VycmVudFBhcnRpY2xlLmNvbG91clsxXSArPSBjdXJyZW50UGFydGljbGUuZGVsdGFDb2xvdXJbMV07XG5cdFx0XHRcdFx0dmFyIGIgPSBjdXJyZW50UGFydGljbGUuY29sb3VyWzJdICs9IGN1cnJlbnRQYXJ0aWNsZS5kZWx0YUNvbG91clsyXTtcblx0XHRcdFx0XHR2YXIgYSA9IGN1cnJlbnRQYXJ0aWNsZS5jb2xvdXJbM10gKz0gY3VycmVudFBhcnRpY2xlLmRlbHRhQ29sb3VyWzNdO1xuXG5cdFx0XHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSByZ2JhIHN0cmluZyB0byBkcmF3LlxuXHRcdFx0XHRcdGRyYXcgPSBbXTtcblx0XHRcdFx0XHRkcmF3LnB1c2goXCJyZ2JhKFwiICsgKHIgPiAyNTUgPyAyNTUgOiByIDwgMCA/IDAgOiB+fnIpKTtcblx0XHRcdFx0XHRkcmF3LnB1c2goZyA+IDI1NSA/IDI1NSA6IGcgPCAwID8gMCA6IH5+Zyk7XG5cdFx0XHRcdFx0ZHJhdy5wdXNoKGIgPiAyNTUgPyAyNTUgOiBiIDwgMCA/IDAgOiB+fmIpO1xuXHRcdFx0XHRcdGRyYXcucHVzaCgoYSA+IDEgPyAxIDogYSA8IDAgPyAwIDogYS50b0ZpeGVkKDIpKSArIFwiKVwiKTtcblx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUuZHJhd0NvbG91ciA9IGRyYXcuam9pbihcIixcIik7XG5cblx0XHRcdFx0XHRpZiAoIXRoaXMuZmFzdE1vZGUpIHtcblx0XHRcdFx0XHRcdGRyYXdbM10gPSBcIjApXCI7XG5cdFx0XHRcdFx0XHRjdXJyZW50UGFydGljbGUuZHJhd0NvbG91ckVuZCA9IGRyYXcuam9pbihcIixcIik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhpcy5wYXJ0aWNsZUluZGV4Kys7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gUmVwbGFjZSBwYXJ0aWNsZSB3aXRoIHRoZSBsYXN0IGFjdGl2ZVxuXHRcdFx0XHRcdGlmICh0aGlzLnBhcnRpY2xlSW5kZXggIT0gdGhpcy5wYXJ0aWNsZUNvdW50IC0gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5wYXJ0aWNsZXNbdGhpcy5wYXJ0aWNsZUluZGV4XSA9IHRoaXMucGFydGljbGVzW3RoaXMucGFydGljbGVDb3VudCAtIDFdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLnBhcnRpY2xlQ291bnQtLTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgcmVjdCA9IHt9O1xuXHRcdFx0XHRyZWN0Ll94ID0gfn5jdXJyZW50UGFydGljbGUucG9zaXRpb24ueDtcblx0XHRcdFx0cmVjdC5feSA9IH5+Y3VycmVudFBhcnRpY2xlLnBvc2l0aW9uLnk7XG5cdFx0XHRcdHJlY3QuX3cgPSBjdXJyZW50UGFydGljbGUuc2l6ZTtcblx0XHRcdFx0cmVjdC5faCA9IGN1cnJlbnRQYXJ0aWNsZS5zaXplO1xuXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXIucHVzaChyZWN0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblx0XHRcdHRoaXMuZWxhcHNlZEZyYW1lcyA9IDA7XG5cdFx0XHR0aGlzLmVtaXRDb3VudGVyID0gMDtcblx0XHR9LFxuXG5cdFx0cmVuZGVyOiBmdW5jdGlvbiAoY29udGV4dCkge1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMCwgaiA9IHRoaXMucGFydGljbGVDb3VudDsgaSA8IGo7IGkrKykge1xuXHRcdFx0XHR2YXIgcGFydGljbGUgPSB0aGlzLnBhcnRpY2xlc1tpXTtcblx0XHRcdFx0dmFyIHNpemUgPSBwYXJ0aWNsZS5zaXplO1xuXHRcdFx0XHR2YXIgaGFsZlNpemUgPSBzaXplID4+IDE7XG5cblx0XHRcdFx0aWYgKHBhcnRpY2xlLnBvc2l0aW9uLnggKyBzaXplIDwgMFxuXHRcdFx0XHRcdHx8IHBhcnRpY2xlLnBvc2l0aW9uLnkgKyBzaXplIDwgMFxuXHRcdFx0XHRcdHx8IHBhcnRpY2xlLnBvc2l0aW9uLnggLSBzaXplID4gQ3JhZnR5LnZpZXdwb3J0LndpZHRoXG5cdFx0XHRcdFx0fHwgcGFydGljbGUucG9zaXRpb24ueSAtIHNpemUgPiBDcmFmdHkudmlld3BvcnQuaGVpZ2h0KSB7XG5cdFx0XHRcdFx0Ly9QYXJ0aWNsZSBpcyBvdXRzaWRlXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHggPSB+fnBhcnRpY2xlLnBvc2l0aW9uLng7XG5cdFx0XHRcdHZhciB5ID0gfn5wYXJ0aWNsZS5wb3NpdGlvbi55O1xuXG5cdFx0XHRcdGlmICh0aGlzLmZhc3RNb2RlKSB7XG5cdFx0XHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSBwYXJ0aWNsZS5kcmF3Q29sb3VyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciByYWRncmFkID0gY29udGV4dC5jcmVhdGVSYWRpYWxHcmFkaWVudCh4ICsgaGFsZlNpemUsIHkgKyBoYWxmU2l6ZSwgcGFydGljbGUuc2l6ZVNtYWxsLCB4ICsgaGFsZlNpemUsIHkgKyBoYWxmU2l6ZSwgaGFsZlNpemUpO1xuXHRcdFx0XHRcdHJhZGdyYWQuYWRkQ29sb3JTdG9wKDAsIHBhcnRpY2xlLmRyYXdDb2xvdXIpO1xuXHRcdFx0XHRcdC8vMC45IHRvIGF2b2lkIHZpc2libGUgYm94aW5nXG5cdFx0XHRcdFx0cmFkZ3JhZC5hZGRDb2xvclN0b3AoMC45LCBwYXJ0aWNsZS5kcmF3Q29sb3VyRW5kKTtcblx0XHRcdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IHJhZGdyYWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29udGV4dC5maWxsUmVjdCh4LCB5LCBzaXplLCBzaXplKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHBhcnRpY2xlOiBmdW5jdGlvbiAodmVjdG9ySGVscGVycykge1xuXHRcdFx0dGhpcy5wb3NpdGlvbiA9IHZlY3RvckhlbHBlcnMuY3JlYXRlKDAsIDApO1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSB2ZWN0b3JIZWxwZXJzLmNyZWF0ZSgwLCAwKTtcblx0XHRcdHRoaXMuc2l6ZSA9IDA7XG5cdFx0XHR0aGlzLnNpemVTbWFsbCA9IDA7XG5cdFx0XHR0aGlzLnRpbWVUb0xpdmUgPSAwO1xuXHRcdFx0dGhpcy5jb2xvdXIgPSBbXTtcblx0XHRcdHRoaXMuZHJhd0NvbG91ciA9IFwiXCI7XG5cdFx0XHR0aGlzLmRlbHRhQ29sb3VyID0gW107XG5cdFx0XHR0aGlzLnNoYXJwbmVzcyA9IDA7XG5cdFx0fSxcblx0XHR2ZWN0b3JIZWxwZXJzOiB7XG5cdFx0XHRjcmVhdGU6IGZ1bmN0aW9uICh4LCB5KSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XCJ4XCI6IHgsXG5cdFx0XHRcdFx0XCJ5XCI6IHlcblx0XHRcdFx0fTtcblx0XHRcdH0sXG5cdFx0XHRtdWx0aXBseTogZnVuY3Rpb24gKHZlY3Rvciwgc2NhbGVGYWN0b3IpIHtcblx0XHRcdFx0dmVjdG9yLnggKj0gc2NhbGVGYWN0b3I7XG5cdFx0XHRcdHZlY3Rvci55ICo9IHNjYWxlRmFjdG9yO1xuXHRcdFx0XHRyZXR1cm4gdmVjdG9yO1xuXHRcdFx0fSxcblx0XHRcdGFkZDogZnVuY3Rpb24gKHZlY3RvcjEsIHZlY3RvcjIpIHtcblx0XHRcdFx0dmVjdG9yMS54ICs9IHZlY3RvcjIueDtcblx0XHRcdFx0dmVjdG9yMS55ICs9IHZlY3RvcjIueTtcblx0XHRcdFx0cmV0dXJuIHZlY3RvcjE7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcbkNyYWZ0eS5leHRlbmQoe1xuXHQvKipAXG5cdCAqICNDcmFmdHkuYXVkaW9cblx0ICogQGNhdGVnb3J5IEF1ZGlvXG5cdCAqXG5cdCAqIEFkZCBzb3VuZCBmaWxlcyBhbmQgcGxheSB0aGVtLiBDaG9vc2VzIGJlc3QgZm9ybWF0IGZvciBicm93c2VyIHN1cHBvcnQuXG5cdCAqIER1ZSB0byB0aGUgbmF0dXJlIG9mIEhUTUw1IGF1ZGlvLCB0aHJlZSB0eXBlcyBvZiBhdWRpbyBmaWxlcyB3aWxsIGJlXG5cdCAqIHJlcXVpcmVkIGZvciBjcm9zcy1icm93c2VyIGNhcGFiaWxpdGllcy4gVGhlc2UgZm9ybWF0cyBhcmUgTVAzLCBPZ2cgYW5kIFdBVi5cblx0ICogV2hlbiBzb3VuZCB3YXMgbm90IG11dGVkIG9uIGJlZm9yZSBwYXVzZSwgc291bmQgd2lsbCBiZSB1bm11dGVkIGFmdGVyIHVucGF1c2UuXG5cdCAqIFdoZW4gc291bmQgaXMgbXV0ZWQgQ3JhZnR5LnBhdXNlKCkgZG9lcyBub3QgaGF2ZSBhbnkgZWZmZWN0IG9uIHNvdW5kLlxuXHQgKi9cblx0YXVkaW8gOiB7XG5cdFx0c291bmRzIDoge30sXG5cdFx0c3VwcG9ydGVkIDoge30sXG5cdFx0Y29kZWNzIDogey8vIENoYXJ0IGZyb20galBsYXllclxuXHRcdFx0b2dnIDogJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInLCAvL09HR1xuXHRcdFx0d2F2IDogJ2F1ZGlvL3dhdjsgY29kZWNzPVwiMVwiJywgLy8gUENNXG5cdFx0XHR3ZWJtYSA6ICdhdWRpby93ZWJtOyBjb2RlY3M9XCJ2b3JiaXNcIicsIC8vIFdFQk1cblx0XHRcdG1wMyA6ICdhdWRpby9tcGVnOyBjb2RlY3M9XCJtcDNcIicsIC8vTVAzXG5cdFx0XHRtNGEgOiAnYXVkaW8vbXA0OyBjb2RlY3M9XCJtcDRhLjQwLjJcIicvLyBBQUMgLyBNUDRcblx0XHR9LFxuXHRcdHZvbHVtZSA6IDEsIC8vR2xvYmFsIFZvbHVtZVxuXHRcdG11dGVkIDogZmFsc2UsXG5cdFx0cGF1c2VkIDogZmFsc2UsXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gdG8gc2V0dXAgc3VwcG9ydGVkIGZvcm1hdHNcblx0XHQgKiovXG5cdFx0Y2FuUGxheSA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGF1ZGlvID0gdGhpcy5hdWRpb0VsZW1lbnQoKSwgY2FucGxheTtcblx0XHRcdGZvciAodmFyIGkgaW4gdGhpcy5jb2RlY3MpIHtcblx0XHRcdFx0Y2FucGxheSA9IGF1ZGlvLmNhblBsYXlUeXBlKHRoaXMuY29kZWNzW2ldKTtcblx0XHRcdFx0aWYgKGNhbnBsYXkgIT09IFwiXCIgJiYgY2FucGxheSAhPT0gXCJub1wiKSB7XG5cdFx0XHRcdFx0dGhpcy5zdXBwb3J0ZWRbaV0gPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuc3VwcG9ydGVkW2ldID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gdG8gZ2V0IGFuIEF1ZGlvIEVsZW1lbnRcblx0XHQgKiovXG5cdFx0YXVkaW9FbGVtZW50IDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvL0lFIGRvZXMgbm90IHN1cHBvcnQgQXVkaW8gT2JqZWN0XG5cdFx0XHRyZXR1cm4gdHlwZW9mIEF1ZGlvICE9PSAndW5kZWZpbmVkJyA/IG5ldyBBdWRpbyhcIlwiKSA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5hZGRcblx0XHQgKiBAY29tcCBDcmFmdHkuYXVkaW9cblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8uYWRkKFN0cmluZyBpZCwgU3RyaW5nIHVybClcblx0XHQgKiBAcGFyYW0gaWQgLSBBIHN0cmluZyB0byByZWZlciB0byBzb3VuZHNcblx0XHQgKiBAcGFyYW0gdXJsIC0gQSBzdHJpbmcgcG9pbnRpbmcgdG8gdGhlIHNvdW5kIGZpbGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8uYWRkKFN0cmluZyBpZCwgQXJyYXkgdXJscylcblx0XHQgKiBAcGFyYW0gdXJscyAtIEFycmF5IG9mIHVybHMgcG9pbnRpbmcgdG8gZGlmZmVyZW50IGZvcm1hdCBvZiB0aGUgc2FtZSBzb3VuZCwgc2VsZWN0aW5nIHRoZSBmaXJzdCB0aGF0IGlzIHBsYXlhYmxlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLmFkZChPYmplY3QgbWFwKVxuXHRcdCAqIEBwYXJhbSBtYXAgLSBrZXktdmFsdWUgcGFpcnMgd2hlcmUgdGhlIGtleSBpcyB0aGUgYGlkYCBhbmQgdGhlIHZhbHVlIGlzIGVpdGhlciBhIGB1cmxgIG9yIGB1cmxzYFxuXHRcdCAqXG5cdFx0ICogTG9hZHMgYSBzb3VuZCB0byBiZSBwbGF5ZWQuIER1ZSB0byB0aGUgbmF0dXJlIG9mIEhUTUw1IGF1ZGlvLFxuXHRcdCAqIHRocmVlIHR5cGVzIG9mIGF1ZGlvIGZpbGVzIHdpbGwgYmUgcmVxdWlyZWQgZm9yIGNyb3NzLWJyb3dzZXIgY2FwYWJpbGl0aWVzLlxuXHRcdCAqIFRoZXNlIGZvcm1hdHMgYXJlIE1QMywgT2dnIGFuZCBXQVYuXG5cdFx0ICpcblx0XHQgKiBQYXNzaW5nIGFuIGFycmF5IG9mIFVSTHMgd2lsbCBkZXRlcm1pbmUgd2hpY2ggZm9ybWF0IHRoZSBicm93c2VyIGNhbiBwbGF5IGFuZCBzZWxlY3QgaXQgb3ZlciBhbnkgb3RoZXIuXG5cdFx0ICpcblx0XHQgKiBBY2NlcHRzIGFuIG9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHRoZSBhdWRpbyBuYW1lIGFuZFxuXHRcdCAqIGVpdGhlciBhIFVSTCBvciBhbiBBcnJheSBvZiBVUkxzICh0byBkZXRlcm1pbmUgd2hpY2ggdHlwZSB0byB1c2UpLlxuXHRcdCAqXG5cdFx0ICogVGhlIElEIHlvdSB1c2Ugd2lsbCBiZSBob3cgeW91IHJlZmVyIHRvIHRoYXQgc291bmQgd2hlbiB1c2luZyBgQ3JhZnR5LmF1ZGlvLnBsYXlgLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiAvL2FkZGluZyBhdWRpbyBmcm9tIGFuIG9iamVjdFxuXHRcdCAqIENyYWZ0eS5hdWRpby5hZGQoe1xuXHRcdCAqIHNob290OiBbXCJzb3VuZHMvc2hvb3Qud2F2XCIsXG5cdFx0ICogXCJzb3VuZHMvc2hvb3QubXAzXCIsXG5cdFx0ICogXCJzb3VuZHMvc2hvb3Qub2dnXCJdLFxuXHRcdCAqXG5cdFx0ICogY29pbjogXCJzb3VuZHMvY29pbi5tcDNcIlxuXHRcdCAqIH0pO1xuXHRcdCAqXG5cdFx0ICogLy9hZGRpbmcgYSBzaW5nbGUgc291bmRcblx0XHQgKiBDcmFmdHkuYXVkaW8uYWRkKFwid2Fsa1wiLCBbXG5cdFx0ICogXCJzb3VuZHMvd2Fsay5tcDNcIixcblx0XHQgKiBcInNvdW5kcy93YWxrLm9nZ1wiLFxuXHRcdCAqIFwic291bmRzL3dhbGsud2F2XCJcblx0XHQgKiBdKTtcblx0XHQgKlxuXHRcdCAqIC8vb25seSBvbmUgZm9ybWF0XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLmFkZChcImp1bXBcIiwgXCJzb3VuZHMvanVtcC5tcDNcIik7XG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0YWRkIDogZnVuY3Rpb24oaWQsIHVybCkge1xuXHRcdFx0Q3JhZnR5LnN1cHBvcnQuYXVkaW8gPSAhIXRoaXMuYXVkaW9FbGVtZW50KCkuY2FuUGxheVR5cGU7XG5cdFx0XHQvL1NldHVwIGF1ZGlvIHN1cHBvcnRcblx0XHRcdGlmICghQ3JhZnR5LnN1cHBvcnQuYXVkaW8pXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0dGhpcy5jYW5QbGF5KCk7XG5cdFx0XHQvL1NldHVwIHN1cHBvcnRlZCBFeHRlbnNpb25zXG5cblx0XHRcdHZhciBhdWRpbywgZXh0LCBwYXRoO1xuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYgdHlwZW9mIGlkID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgaW4gaWQpIHtcblx0XHRcdFx0XHRmb3IgKHZhciBzcmMgaW4gaWRbaV0pIHtcblx0XHRcdFx0XHRcdGF1ZGlvID0gdGhpcy5hdWRpb0VsZW1lbnQoKTtcblx0XHRcdFx0XHRcdGF1ZGlvLmlkID0gaTtcblx0XHRcdFx0XHRcdGF1ZGlvLnByZWxvYWQgPSBcImF1dG9cIjtcblx0XHRcdFx0XHRcdGF1ZGlvLnZvbHVtZSA9IENyYWZ0eS5hdWRpby52b2x1bWU7XG5cdFx0XHRcdFx0XHRwYXRoID0gaWRbaV1bc3JjXTtcblx0XHRcdFx0XHRcdGV4dCA9IHBhdGguc3Vic3RyKHBhdGgubGFzdEluZGV4T2YoJy4nKSArIDEpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zdXBwb3J0ZWRbZXh0XSkge1xuXHRcdFx0XHRcdFx0XHRhdWRpby5zcmMgPSBwYXRoO1xuXHRcdFx0XHRcdFx0XHRDcmFmdHkuYXNzZXQocGF0aCwgYXVkaW8pO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnNvdW5kc1tpXSA9IHtcblx0XHRcdFx0XHRcdFx0XHRvYmogOiBhdWRpbyxcblx0XHRcdFx0XHRcdFx0XHRwbGF5ZWQgOiAwLFxuXHRcdFx0XHRcdFx0XHRcdHZvbHVtZSA6IENyYWZ0eS5hdWRpby52b2x1bWVcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIHR5cGVvZiBpZCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRhdWRpbyA9IHRoaXMuYXVkaW9FbGVtZW50KCk7XG5cdFx0XHRcdGF1ZGlvLmlkID0gaWQ7XG5cdFx0XHRcdGF1ZGlvLnByZWxvYWQgPSBcImF1dG9cIjtcblx0XHRcdFx0YXVkaW8udm9sdW1lID0gQ3JhZnR5LmF1ZGlvLnZvbHVtZTtcblxuXHRcdFx0XHRpZiAoIHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0XHRleHQgPSB1cmwuc3Vic3RyKHVybC5sYXN0SW5kZXhPZignLicpICsgMSkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRpZiAodGhpcy5zdXBwb3J0ZWRbZXh0XSkge1xuXHRcdFx0XHRcdFx0YXVkaW8uc3JjID0gdXJsO1xuXHRcdFx0XHRcdFx0Q3JhZnR5LmFzc2V0KHVybCwgYXVkaW8pO1xuXHRcdFx0XHRcdFx0dGhpcy5zb3VuZHNbaWRdID0ge1xuXHRcdFx0XHRcdFx0XHRvYmogOiBhdWRpbyxcblx0XHRcdFx0XHRcdFx0cGxheWVkIDogMCxcblx0XHRcdFx0XHRcdFx0dm9sdW1lIDogQ3JhZnR5LmF1ZGlvLnZvbHVtZVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIHR5cGVvZiB1cmwgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHRmb3IgKHNyYyBpbiB1cmwpIHtcblx0XHRcdFx0XHRcdGF1ZGlvID0gdGhpcy5hdWRpb0VsZW1lbnQoKTtcblx0XHRcdFx0XHRcdGF1ZGlvLmlkID0gaWQ7XG5cdFx0XHRcdFx0XHRhdWRpby5wcmVsb2FkID0gXCJhdXRvXCI7XG5cdFx0XHRcdFx0XHRhdWRpby52b2x1bWUgPSBDcmFmdHkuYXVkaW8udm9sdW1lO1xuXHRcdFx0XHRcdFx0cGF0aCA9IHVybFtzcmNdO1xuXHRcdFx0XHRcdFx0ZXh0ID0gcGF0aC5zdWJzdHIocGF0aC5sYXN0SW5kZXhPZignLicpICsgMSkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRcdGlmICh0aGlzLnN1cHBvcnRlZFtleHRdKSB7XG5cdFx0XHRcdFx0XHRcdGF1ZGlvLnNyYyA9IHBhdGg7XG5cdFx0XHRcdFx0XHRcdENyYWZ0eS5hc3NldChwYXRoLCBhdWRpbyk7XG5cdFx0XHRcdFx0XHRcdHRoaXMuc291bmRzW2lkXSA9IHtcblx0XHRcdFx0XHRcdFx0XHRvYmogOiBhdWRpbyxcblx0XHRcdFx0XHRcdFx0XHRwbGF5ZWQgOiAwLFxuXHRcdFx0XHRcdFx0XHRcdHZvbHVtZSA6IENyYWZ0eS5hdWRpby52b2x1bWVcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8ucGxheVxuXHRcdCAqIEBjb21wIENyYWZ0eS5hdWRpb1xuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5wbGF5KFN0cmluZyBpZClcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8ucGxheShTdHJpbmcgaWQsIE51bWJlciByZXBlYXRDb3VudClcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8ucGxheShTdHJpbmcgaWQsIE51bWJlciByZXBlYXRDb3VudCxOdW1iZXIgdm9sdW1lKVxuXHRcdCAqIEBwYXJhbSBpZCAtIEEgc3RyaW5nIHRvIHJlZmVyIHRvIHNvdW5kc1xuXHRcdCAqIEBwYXJhbSByZXBlYXRDb3VudCAtIFJlcGVhdCBjb3VudCBmb3IgdGhlIGZpbGUsIHdoZXJlIC0xIHN0YW5kcyBmb3IgcmVwZWF0IGZvcmV2ZXIuXG5cdFx0ICogQHBhcmFtIHZvbHVtZSAtIHZvbHVtZSBjYW4gYmUgYSBudW1iZXIgYmV0d2VlbiAwLjAgYW5kIDEuMFxuXHRcdCAqXG5cdFx0ICogV2lsbCBwbGF5IGEgc291bmQgcHJldmlvdXNseSBhZGRlZCBieSB1c2luZyB0aGUgSUQgdGhhdCB3YXMgdXNlZCBpbiBgQ3JhZnR5LmF1ZGlvLmFkZGAuXG5cdFx0ICogSGFzIGEgZGVmYXVsdCBtYXhpbXVtIG9mIDUgY2hhbm5lbHMgc28gdGhhdCB0aGUgc2FtZSBzb3VuZCBjYW4gcGxheSBzaW11bHRhbmVvdXNseSB1bmxlc3MgYWxsIG9mIHRoZSBjaGFubmVscyBhcmUgcGxheWluZy5cblxuXHRcdCAqICpOb3RlIHRoYXQgdGhlIGltcGxlbWVudGF0aW9uIG9mIEhUTUw1IEF1ZGlvIGlzIGJ1Z2d5IGF0IGJlc3QuKlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8ucGxheShcIndhbGtcIik7XG5cdFx0ICpcblx0XHQgKiAvL3BsYXkgYW5kIHJlcGVhdCBmb3JldmVyXG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnBsYXkoXCJiYWNrZ3JvdW5kTXVzaWNcIiwgLTEpO1xuXHRcdCAqIENyYWZ0eS5hdWRpby5wbGF5KFwiZXhwbG9zaW9uXCIsMSwwLjUpOyAvL3BsYXkgc291bmQgb25jZSB3aXRoIHZvbHVtZSBvZiA1MCVcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHRwbGF5IDogZnVuY3Rpb24oaWQsIHJlcGVhdCwgdm9sdW1lKSB7XG5cdFx0XHRpZiAocmVwZWF0ID09IDAgfHwgIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvIHx8ICF0aGlzLnNvdW5kc1tpZF0pXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHZhciBzID0gdGhpcy5zb3VuZHNbaWRdO1xuXHRcdFx0cy52b2x1bWUgPSBzLm9iai52b2x1bWUgPSB2b2x1bWUgfHwgQ3JhZnR5LmF1ZGlvLnZvbHVtZTtcblx0XHRcdGlmIChzLm9iai5jdXJyZW50VGltZSlcblx0XHRcdFx0cy5vYmouY3VycmVudFRpbWUgPSAwO1xuXHRcdFx0aWYgKHRoaXMubXV0ZWQpXG5cdFx0XHRcdHMub2JqLnZvbHVtZSA9IDA7XG5cdFx0XHRzLm9iai5wbGF5KCk7XG5cdFx0XHRzLnBsYXllZCsrO1xuXHRcdFx0cy5vYmouYWRkRXZlbnRMaXN0ZW5lcihcImVuZGVkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAocy5wbGF5ZWQgPCByZXBlYXQgfHwgcmVwZWF0ID09IC0xKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUpXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRUaW1lID0gMDtcblx0XHRcdFx0XHR0aGlzLnBsYXkoKTtcblx0XHRcdFx0XHRzLnBsYXllZCsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCB0cnVlKTtcblx0XHR9LFxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnN0b3Bcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8uc3RvcChbTnVtYmVyIElEXSlcblx0XHQgKlxuXHRcdCAqIFN0b3BzIGFueSBwbGF5aW5nIHNvdW5kLiBpZiBpZCBpcyBub3Qgc2V0LCBzdG9wIGFsbCBzb3VuZHMgd2hpY2ggYXJlIHBsYXlpbmdcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogLy9hbGwgc291bmRzIHN0b3BwZWQgcGxheWluZyBub3dcblx0XHQgKiBDcmFmdHkuYXVkaW8uc3RvcCgpO1xuXHRcdCAqXG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0c3RvcCA6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcztcblx0XHRcdGlmICghaWQpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSBpbiB0aGlzLnNvdW5kcykge1xuXHRcdFx0XHRcdHMgPSB0aGlzLnNvdW5kc1tpXTtcblx0XHRcdFx0XHRpZiAoIXMub2JqLnBhdXNlZClcblx0XHRcdFx0XHRcdHMub2JqLnBhdXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5zb3VuZHNbaWRdKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRzID0gdGhpcy5zb3VuZHNbaWRdO1xuXHRcdFx0aWYgKCFzLm9iai5wYXVzZWQpXG5cdFx0XHRcdHMub2JqLnBhdXNlKCk7XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLl9tdXRlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLl9tdXRlKFtCb29sZWFuIG11dGVdKVxuXHRcdCAqXG5cdFx0ICogTXV0ZSBvciB1bm11dGUgZXZlcnkgQXVkaW8gaW5zdGFuY2UgdGhhdCBpcyBwbGF5aW5nLlxuXHRcdCAqL1xuXHRcdF9tdXRlIDogZnVuY3Rpb24obXV0ZSkge1xuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHM7XG5cdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuc291bmRzKSB7XG5cdFx0XHRcdHMgPSB0aGlzLnNvdW5kc1tpXTtcblx0XHRcdFx0cy5vYmoudm9sdW1lID0gbXV0ZSA/IDAgOiBzLnZvbHVtZTtcblx0XHRcdH1cblx0XHRcdHRoaXMubXV0ZWQgPSBtdXRlO1xuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8udG9nZ2xlTXV0ZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby50b2dnbGVNdXRlKClcblx0XHQgKlxuXHRcdCAqIE11dGUgb3IgdW5tdXRlIGV2ZXJ5IEF1ZGlvIGluc3RhbmNlIHRoYXQgaXMgcGxheWluZy4gVG9nZ2xlcyBiZXR3ZWVuXG5cdFx0ICogcGF1c2luZyBvciBwbGF5aW5nIGRlcGVuZGluZyBvbiB0aGUgc3RhdGUuXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIC8vdG9nZ2xlIG11dGUgYW5kIHVubXV0ZSBkZXBlbmRpbmcgb24gY3VycmVudCBzdGF0ZVxuXHRcdCAqIENyYWZ0eS5hdWRpby50b2dnbGVNdXRlKCk7XG5cdFx0ICogfn5+XG5cdFx0ICovXG5cdFx0dG9nZ2xlTXV0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCF0aGlzLm11dGVkKSB7XG5cdFx0XHRcdHRoaXMuX211dGUodHJ1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9tdXRlKGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdH0sXG5cdFx0LyoqQFxuXHRcdCAqICNDcmFmdHkuYXVkaW8ubXV0ZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5tdXRlKClcblx0XHQgKlxuXHRcdCAqIE11dGUgZXZlcnkgQXVkaW8gaW5zdGFuY2UgdGhhdCBpcyBwbGF5aW5nLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8ubXV0ZSgpO1xuXHRcdCAqIH5+flxuXHRcdCAqL1xuXHRcdG11dGUgOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX211dGUodHJ1ZSk7XG5cdFx0fSxcblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby51bm11dGVcblx0XHQgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkuYXVkaW8udW5tdXRlKClcblx0XHQgKlxuXHRcdCAqIFVubXV0ZSBldmVyeSBBdWRpbyBpbnN0YW5jZSB0aGF0IGlzIHBsYXlpbmcuXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby51bm11dGUoKTtcblx0XHQgKiB+fn5cblx0XHQgKi9cblx0XHR1bm11dGUgOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX211dGUoZmFsc2UpO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby5wYXVzZVxuXHRcdCAqIEBzaWduIHB1YmxpYyB0aGlzIENyYWZ0eS5hdWRpby5wYXVzZShzdHJpbmcgSUQpXG5cdFx0ICpcblx0XHQgKiBQYXVzZSB0aGUgQXVkaW8gaW5zdGFuY2Ugc3BlY2lmaWVkIGJ5IGlkIHBhcmFtLlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB+fn5cblx0XHQgKiBDcmFmdHkuYXVkaW8ucGF1c2UoJ211c2ljJyk7XG5cdFx0ICogfn5+XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBhdWRpbyBvYmplY3QgdG8gcGF1c2Vcblx0XHQgKi9cblx0XHRwYXVzZSA6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRpZiAoIUNyYWZ0eS5zdXBwb3J0LmF1ZGlvIHx8ICFpZCB8fCAhdGhpcy5zb3VuZHNbaWRdKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR2YXIgcyA9IHRoaXMuc291bmRzW2lkXTtcblx0XHRcdGlmICghcy5vYmoucGF1c2VkKVxuXHRcdFx0XHRzLm9iai5wYXVzZSgpO1xuXHRcdH0sXG5cblx0XHQvKipAXG5cdFx0ICogI0NyYWZ0eS5hdWRpby51bnBhdXNlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnVucGF1c2Uoc3RyaW5nIElEKVxuXHRcdCAqXG5cdFx0ICogUmVzdW1lIHBsYXlpbmcgdGhlIEF1ZGlvIGluc3RhbmNlIHNwZWNpZmllZCBieSBpZCBwYXJhbS5cblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogfn5+XG5cdFx0ICogQ3JhZnR5LmF1ZGlvLnVucGF1c2UoJ211c2ljJyk7XG5cdFx0ICogfn5+XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBhdWRpbyBvYmplY3QgdG8gdW5wYXVzZVxuXHRcdCAqL1xuXHRcdHVucGF1c2UgOiBmdW5jdGlvbihpZCkge1xuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbyB8fCAhaWQgfHwgIXRoaXMuc291bmRzW2lkXSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNvdW5kc1tpZF07XG5cdFx0XHRpZiAocy5vYmoucGF1c2VkKVxuXHRcdFx0XHRzLm9iai5wbGF5KCk7XG5cdFx0fSxcblxuXHRcdC8qKkBcblx0XHQgKiAjQ3JhZnR5LmF1ZGlvLnRvZ2dsZVBhdXNlXG5cdFx0ICogQHNpZ24gcHVibGljIHRoaXMgQ3JhZnR5LmF1ZGlvLnRvZ2dsZVBhdXNlKHN0cmluZyBJRClcblx0XHQgKlxuXHRcdCAqIFRvZ2dsZSB0aGUgcGF1c2Ugc3RhdHVzIG9mIHRoZSBBdWRpbyBpbnN0YW5jZSBzcGVjaWZpZWQgYnkgaWQgcGFyYW0uXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIH5+flxuXHRcdCAqIENyYWZ0eS5hdWRpby50b2dnbGVQYXVzZSgnbXVzaWMnKTtcblx0XHQgKiB+fn5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBpZCBUaGUgaWQgb2YgdGhlIGF1ZGlvIG9iamVjdCB0byBwYXVzZS91bnBhdXNlXG5cdFx0ICovXG5cdFx0dG9nZ2xlUGF1c2UgOiBmdW5jdGlvbihpZCkge1xuXHRcdFx0aWYgKCFDcmFmdHkuc3VwcG9ydC5hdWRpbyB8fCAhaWQgfHwgIXRoaXMuc291bmRzW2lkXSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dmFyIHMgPSB0aGlzLnNvdW5kc1tpZF07XG5cdFx0XHRpZiAocy5vYmoucGF1c2VkKSB7XG5cdFx0XHRcdHMub2JqLnBsYXkoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHMub2JqLnBhdXNlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqQFxuKiAjVGV4dFxuKiBAY2F0ZWdvcnkgR3JhcGhpY3NcbiogQHRyaWdnZXIgQ2hhbmdlIC0gd2hlbiB0aGUgdGV4dCBpcyBjaGFuZ2VkXG4qIEByZXF1aXJlcyBDYW52YXMgb3IgRE9NXG4qIENvbXBvbmVudCB0byBkcmF3IHRleHQgaW5zaWRlIHRoZSBib2R5IG9mIGFuIGVudGl0eS5cbiovXG5DcmFmdHkuYyhcIlRleHRcIiwge1xuXHRfdGV4dDogXCJcIixcblx0X3RleHRGb250OiB7XG5cdFx0XCJ0eXBlXCI6IFwiXCIsXG5cdFx0XCJ3ZWlnaHRcIjogXCJcIixcblx0XHRcInNpemVcIjogXCJcIixcblx0XHRcImZhbWlseVwiOiBcIlwiXG5cdH0sXG5cdHJlYWR5OiB0cnVlLFxuXG5cdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnJlcXVpcmVzKFwiMkRcIik7XG5cblx0XHR0aGlzLmJpbmQoXCJEcmF3XCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgZm9udCA9IHRoaXMuX3RleHRGb250W1widHlwZVwiXSArICcgJyArIHRoaXMuX3RleHRGb250W1wid2VpZ2h0XCJdICsgJyAnICtcblx0XHRcdFx0dGhpcy5fdGV4dEZvbnRbXCJzaXplXCJdICsgJyAnICsgdGhpcy5fdGV4dEZvbnRbXCJmYW1pbHlcIl07XG5cblx0XHRcdGlmIChlLnR5cGUgPT09IFwiRE9NXCIpIHtcblx0XHRcdFx0dmFyIGVsID0gdGhpcy5fZWxlbWVudCxcblx0XHRcdFx0XHRzdHlsZSA9IGVsLnN0eWxlO1xuXG5cdFx0XHRcdHN0eWxlLmNvbG9yID0gdGhpcy5fdGV4dENvbG9yO1xuXHRcdFx0XHRzdHlsZS5mb250ID0gZm9udDtcblx0XHRcdFx0ZWwuaW5uZXJIVE1MID0gdGhpcy5fdGV4dDtcblx0XHRcdH0gZWxzZSBpZiAoZS50eXBlID09PSBcImNhbnZhc1wiKSB7XG5cdFx0XHRcdHZhciBjb250ZXh0ID0gZS5jdHgsXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3MgPSBudWxsO1xuXG5cdFx0XHRcdGNvbnRleHQuc2F2ZSgpO1xuXG5cdFx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5fdGV4dENvbG9yIHx8IFwicmdiKDAsMCwwKVwiO1xuXHRcdFx0XHRjb250ZXh0LmZvbnQgPSBmb250O1xuXG5cdFx0XHRcdGNvbnRleHQudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55ICsgdGhpcy5oKTtcblx0XHRcdFx0Y29udGV4dC5maWxsVGV4dCh0aGlzLl90ZXh0LCAwLCAwKTtcblxuXHRcdFx0XHRtZXRyaWNzID0gY29udGV4dC5tZWFzdXJlVGV4dCh0aGlzLl90ZXh0KTtcblx0XHRcdFx0dGhpcy5fdyA9IG1ldHJpY3Mud2lkdGg7XG5cblx0XHRcdFx0Y29udGV4dC5yZXN0b3JlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqQFxuICAgICogIy50ZXh0XG4gICAgKiBAY29tcCBUZXh0XG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGV4dChTdHJpbmcgdGV4dClcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50ZXh0KEZ1bmN0aW9uIHRleHRnZW5lcmF0b3IpXG4gICAgKiBAcGFyYW0gdGV4dCAtIFN0cmluZyBvZiB0ZXh0IHRoYXQgd2lsbCBiZSBpbnNlcnRlZCBpbnRvIHRoZSBET00gb3IgQ2FudmFzIGVsZW1lbnQuXG4gICAgKiBcbiAgICAqIFRoaXMgbWV0aG9kIHdpbGwgdXBkYXRlIHRoZSB0ZXh0IGluc2lkZSB0aGUgZW50aXR5LlxuICAgICogSWYgeW91IHVzZSBET00sIHRvIG1vZGlmeSB0aGUgZm9udCwgdXNlIHRoZSBgLmNzc2AgbWV0aG9kIGluaGVyaXRlZCBmcm9tIHRoZSBET00gY29tcG9uZW50LlxuICAgICpcbiAgICAqIElmIHlvdSBuZWVkIHRvIHJlZmVyZW5jZSBhdHRyaWJ1dGVzIG9uIHRoZSBlbnRpdHkgaXRzZWxmIHlvdSBjYW4gcGFzcyBhIGZ1bmN0aW9uIGluc3RlYWQgb2YgYSBzdHJpbmcuXG4gICAgKiBcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cbiAgICAqIENyYWZ0eS5lKFwiMkQsIERPTSwgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSkudGV4dChcIkxvb2sgYXQgbWUhIVwiKTtcbiAgICAqXG4gICAgKiBDcmFmdHkuZShcIjJELCBET00sIFRleHRcIikuYXR0cih7IHg6IDEwMCwgeTogMTAwIH0pXG4gICAgKiAgICAgLnRleHQoZnVuY3Rpb24gKCkgeyByZXR1cm4gXCJNeSBwb3NpdGlvbiBpcyBcIiArIHRoaXMuX3ggfSk7XG4gICAgKlxuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KS50ZXh0KFwiTG9vayBhdCBtZSEhXCIpO1xuICAgICpcbiAgICAqIENyYWZ0eS5lKFwiMkQsIENhbnZhcywgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSlcbiAgICAqICAgICAudGV4dChmdW5jdGlvbiAoKSB7IHJldHVybiBcIk15IHBvc2l0aW9uIGlzIFwiICsgdGhpcy5feCB9KTtcbiAgICAqIH5+flxuICAgICovXG5cdHRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG5cdFx0aWYgKCEodHlwZW9mIHRleHQgIT09IFwidW5kZWZpbmVkXCIgJiYgdGV4dCAhPT0gbnVsbCkpIHJldHVybiB0aGlzLl90ZXh0O1xuXHRcdGlmICh0eXBlb2YodGV4dCkgPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhpcy5fdGV4dCA9IHRleHQuY2FsbCh0aGlzKTtcblx0XHRlbHNlXG5cdFx0XHR0aGlzLl90ZXh0ID0gdGV4dDtcblx0XHR0aGlzLnRyaWdnZXIoXCJDaGFuZ2VcIik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqQFxuICAgICogIy50ZXh0Q29sb3JcbiAgICAqIEBjb21wIFRleHRcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50ZXh0Q29sb3IoU3RyaW5nIGNvbG9yLCBOdW1iZXIgc3RyZW5ndGgpXG4gICAgKiBAcGFyYW0gY29sb3IgLSBUaGUgY29sb3IgaW4gaGV4YWRlY2ltYWxcbiAgICAqIEBwYXJhbSBzdHJlbmd0aCAtIExldmVsIG9mIG9wYWNpdHlcbiAgICAqXG4gICAgKiBNb2RpZnkgdGhlIHRleHQgY29sb3IgYW5kIGxldmVsIG9mIG9wYWNpdHkuXG4gICAgKiBcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cbiAgICAqIENyYWZ0eS5lKFwiMkQsIERPTSwgVGV4dFwiKS5hdHRyKHsgeDogMTAwLCB5OiAxMDAgfSkudGV4dChcIkxvb2sgYXQgbWUhIVwiKVxuICAgICogICAudGV4dENvbG9yKCcjRkYwMDAwJyk7XG4gICAgKlxuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLmF0dHIoeyB4OiAxMDAsIHk6IDEwMCB9KS50ZXh0KCdMb29rIGF0IG1lISEnKVxuICAgICogICAudGV4dENvbG9yKCcjRkYwMDAwJywgMC42KTtcbiAgICAqIH5+flxuICAgICogQHNlZSBDcmFmdHkudG9SR0JcbiAgICAqL1xuXHR0ZXh0Q29sb3I6IGZ1bmN0aW9uIChjb2xvciwgc3RyZW5ndGgpIHtcblx0XHR0aGlzLl9zdHJlbmd0aCA9IHN0cmVuZ3RoO1xuXHRcdHRoaXMuX3RleHRDb2xvciA9IENyYWZ0eS50b1JHQihjb2xvciwgdGhpcy5fc3RyZW5ndGgpO1xuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipAXG4gICAgKiAjLnRleHRGb250XG4gICAgKiBAY29tcCBUZXh0XG4gICAgKiBAdHJpZ2dlcnMgQ2hhbmdlXG4gICAgKiBAc2lnbiBwdWJsaWMgdGhpcyAudGV4dEZvbnQoU3RyaW5nIGtleSwgKiB2YWx1ZSlcbiAgICAqIEBwYXJhbSBrZXkgLSBQcm9wZXJ0eSBvZiB0aGUgZW50aXR5IHRvIG1vZGlmeVxuICAgICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gc2V0IHRoZSBwcm9wZXJ0eSB0b1xuICAgICpcbiAgICAqIEBzaWduIHB1YmxpYyB0aGlzIC50ZXh0Rm9udChPYmplY3QgbWFwKVxuICAgICogQHBhcmFtIG1hcCAtIE9iamVjdCB3aGVyZSB0aGUga2V5IGlzIHRoZSBwcm9wZXJ0eSB0byBtb2RpZnkgYW5kIHRoZSB2YWx1ZSBhcyB0aGUgcHJvcGVydHkgdmFsdWVcbiAgICAqXG4gICAgKiBVc2UgdGhpcyBtZXRob2QgdG8gc2V0IGZvbnQgcHJvcGVydHkgb2YgdGhlIHRleHQgZW50aXR5LlxuICAgICogXG4gICAgKiBAZXhhbXBsZVxuICAgICogfn5+XG4gICAgKiBDcmFmdHkuZShcIjJELCBET00sIFRleHRcIikudGV4dEZvbnQoeyB0eXBlOiAnaXRhbGljJywgZmFtaWx5OiAnQXJpYWwnIH0pO1xuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLnRleHRGb250KHsgc2l6ZTogJzIwcHgnLCB3ZWlnaHQ6ICdib2xkJyB9KTtcbiAgICAqXG4gICAgKiBDcmFmdHkuZShcIjJELCBDYW52YXMsIFRleHRcIikudGV4dEZvbnQoXCJ0eXBlXCIsIFwiaXRhbGljXCIpO1xuICAgICogQ3JhZnR5LmUoXCIyRCwgQ2FudmFzLCBUZXh0XCIpLnRleHRGb250KFwidHlwZVwiKTsgLy8gaXRhbGljXG4gICAgKiB+fn5cbiAgICAqL1xuXHR0ZXh0Rm9udDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0Ly9pZiBqdXN0IHRoZSBrZXksIHJldHVybiB0aGUgdmFsdWVcblx0XHRcdGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl90ZXh0Rm9udFtrZXldO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRmb3IgKHByb3BlcnR5S2V5IGluIGtleSkge1xuXHRcdFx0XHRcdHRoaXMuX3RleHRGb250W3Byb3BlcnR5S2V5XSA9IGtleVtwcm9wZXJ0eUtleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fdGV4dEZvbnRba2V5XSA9IHZhbHVlO1xuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcihcIkNoYW5nZVwiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbkNyYWZ0eS5leHRlbmQoe1xuLyoqQFxuXHQqICNDcmFmdHkuYXNzZXRzXG5cdCogQGNhdGVnb3J5IEFzc2V0c1xuXHQqIEFuIG9iamVjdCBjb250YWluaW5nIGV2ZXJ5IGFzc2V0IHVzZWQgaW4gdGhlIGN1cnJlbnQgQ3JhZnR5IGdhbWUuXG5cdCogVGhlIGtleSBpcyB0aGUgVVJMIGFuZCB0aGUgdmFsdWUgaXMgdGhlIGBBdWRpb2Agb3IgYEltYWdlYCBvYmplY3QuXG5cdCpcblx0KiBJZiBsb2FkaW5nIGFuIGFzc2V0LCBjaGVjayB0aGF0IGl0IGlzIGluIHRoaXMgb2JqZWN0IGZpcnN0IHRvIGF2b2lkIGxvYWRpbmcgdHdpY2UuXG5cdCogXG5cdCogQGV4YW1wbGVcblx0KiB+fn5cblx0KiB2YXIgaXNMb2FkZWQgPSAhIUNyYWZ0eS5hc3NldHNbXCJpbWFnZXMvc3ByaXRlLnBuZ1wiXTtcblx0KiB+fn5cblx0KiBAc2VlIENyYWZ0eS5sb2FkZXJcblx0Ki9cblx0YXNzZXRzOiB7fSxcblxuICAgIC8qKkBcbiAgICAqICNDcmFmdHkuYXNzZXRcbiAgICAqIEBjYXRlZ29yeSBBc3NldHNcbiAgICAqIFxuICAgICogQHRyaWdnZXIgTmV3QXNzZXQgLSBBZnRlciBzZXR0aW5nIG5ldyBhc3NldCAtIE9iamVjdCAtIGtleSBhbmQgdmFsdWUgb2YgbmV3IGFkZGVkIGFzc2V0LlxuICAgICogQHNpZ24gcHVibGljIHZvaWQgQ3JhZnR5LmFzc2V0KFN0cmluZyBrZXksIE9iamVjdCBhc3NldClcbiAgICAqIEBwYXJhbSBrZXkgLSBhc3NldCB1cmwuXG4gICAgKiBAcGFyYW0gYXNzZXQgLSBBdWRpb2Agb3IgYEltYWdlYCBvYmplY3QuXG4gICAgKiBBZGQgbmV3IGFzc2V0IHRvIGFzc2V0cyBvYmplY3QuXG4gICAgKiBcbiAgICAqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5hc3NldChTdHJpbmcga2V5KVxuICAgICogQHBhcmFtIGtleSAtIGFzc2V0IHVybC5cbiAgICAqIEdldCBhc3NldCBmcm9tIGFzc2V0cyBvYmplY3QuXG4gICAgKiBcbiAgICAqIEBleGFtcGxlXG4gICAgKiB+fn5cbiAgICAqIENyYWZ0eS5hc3NldChrZXksIHZhbHVlKTtcbiAgICAqIHZhciBhc3NldCA9IENyYWZ0eS5hc3NldChrZXkpOyAvL29iamVjdCB3aXRoIGtleSBhbmQgdmFsdWUgZmllbGRzXG4gICAgKiB+fn5cbiAgICAqIFxuICAgICogQHNlZSBDcmFmdHkuYXNzZXRzXG4gICAgKi9cbiAgICBhc3NldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIENyYWZ0eS5hc3NldHNba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghQ3JhZnR5LmFzc2V0c1trZXldKSB7XG4gICAgICAgICAgICBDcmFmdHkuYXNzZXRzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcIk5ld0Fzc2V0XCIsIHtrZXkgOiBrZXksIHZhbHVlIDogdmFsdWV9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgICAgIC8qKkBcblx0KiAjQ3JhZnR5LmltYWdlX3doaXRlbGlzdFxuXHQqIEBjYXRlZ29yeSBBc3NldHNcblx0KiBcbiAgICAqIFxuICAgICogQSBsaXN0IG9mIGZpbGUgZXh0ZW5zaW9ucyB0aGF0IGNhbiBiZSBsb2FkZWQgYXMgaW1hZ2VzIGJ5IENyYWZ0eS5sb2FkXG4gICAgKlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG4gICAgICAgICogQ3JhZnR5LmltYWdlX3doaXRlbGlzdC5wdXNoKFwidGlmXCIpXG5cdCogQ3JhZnR5LmxvYWQoW1wiaW1hZ2VzL3Nwcml0ZS50aWZcIiwgXCJzb3VuZHMvanVtcC5tcDNcIl0sXG5cdCogICAgIGZ1bmN0aW9uKCkge1xuXHQqICAgICAgICAgLy93aGVuIGxvYWRlZFxuXHQqICAgICAgICAgQ3JhZnR5LnNjZW5lKFwibWFpblwiKTsgLy9nbyB0byBtYWluIHNjZW5lXG5cdCogICAgICAgICBDcmFmdHkuYXVkaW8ucGxheShcImp1bXAubXAzXCIpOyAvL1BsYXkgdGhlIGF1ZGlvIGZpbGVcblx0KiAgICAgfSxcblx0KlxuXHQqICAgICBmdW5jdGlvbihlKSB7XG5cdCogICAgICAgLy9wcm9ncmVzc1xuXHQqICAgICB9LFxuXHQqXG5cdCogICAgIGZ1bmN0aW9uKGUpIHtcblx0KiAgICAgICAvL3VoIG9oLCBlcnJvciBsb2FkaW5nXG5cdCogICAgIH1cblx0KiApO1xuXHQqIH5+flxuXHQqIFxuXHQqIEBzZWUgQ3JhZnR5LmFzc2V0XG4gICAgICAgICogQHNlZSBDcmFmdHkubG9hZFxuXHQqL1xuICAgIGltYWdlX3doaXRlbGlzdDogW1wianBnXCIsIFwianBlZ1wiLCBcImdpZlwiLCBcInBuZ1wiLCBcInN2Z1wiXSxcblx0LyoqQFxuXHQqICNDcmFmdHkubG9hZGVyXG5cdCogQGNhdGVnb3J5IEFzc2V0c1xuXHQqIEBzaWduIHB1YmxpYyB2b2lkIENyYWZ0eS5sb2FkKEFycmF5IGFzc2V0cywgRnVuY3Rpb24gb25Mb2FkWywgRnVuY3Rpb24gb25Qcm9ncmVzcywgRnVuY3Rpb24gb25FcnJvcl0pXG5cdCogQHBhcmFtIGFzc2V0cyAtIEFycmF5IG9mIGFzc2V0cyB0byBsb2FkIChhY2NlcHRzIHNvdW5kcyBhbmQgaW1hZ2VzKVxuXHQqIEBwYXJhbSBvbkxvYWQgLSBDYWxsYmFjayB3aGVuIHRoZSBhc3NldHMgYXJlIGxvYWRlZFxuXHQqIEBwYXJhbSBvblByb2dyZXNzIC0gQ2FsbGJhY2sgd2hlbiBhbiBhc3NldCBpcyBsb2FkZWQuIENvbnRhaW5zIGluZm9ybWF0aW9uIGFib3V0IGFzc2V0cyBsb2FkZWRcblx0KiBAcGFyYW0gb25FcnJvciAtIENhbGxiYWNrIHdoZW4gYW4gYXNzZXQgZmFpbHMgdG8gbG9hZFxuXHQqIFxuXHQqIFByZWxvYWRlciBmb3IgYWxsIGFzc2V0cy4gVGFrZXMgYW4gYXJyYXkgb2YgVVJMcyBhbmRcblx0KiBhZGRzIHRoZW0gdG8gdGhlIGBDcmFmdHkuYXNzZXRzYCBvYmplY3QuXG5cdCpcblx0KiBGaWxlcyB3aXRoIHN1ZmZpeGVzIGluIGBpbWFnZV93aGl0ZWxpc3RgIChjYXNlIGluc2Vuc2l0aXZlKSB3aWxsIGJlIGxvYWRlZC5cblx0KlxuXHQqIElmIGBDcmFmdHkuc3VwcG9ydC5hdWRpb2AgaXMgYHRydWVgLCBmaWxlcyB3aXRoIHRoZSBmb2xsb3dpbmcgc3VmZml4ZXMgYG1wM2AsIGB3YXZgLCBgb2dnYCBhbmQgYG1wNGAgKGNhc2UgaW5zZW5zaXRpdmUpIGNhbiBiZSBsb2FkZWQuXG5cdCpcblx0KiBUaGUgYG9uUHJvZ3Jlc3NgIGZ1bmN0aW9uIHdpbGwgYmUgcGFzc2VkIG9uIG9iamVjdCB3aXRoIGluZm9ybWF0aW9uIGFib3V0XG5cdCogdGhlIHByb2dyZXNzIGluY2x1ZGluZyBob3cgbWFueSBhc3NldHMgbG9hZGVkLCB0b3RhbCBvZiBhbGwgdGhlIGFzc2V0cyB0b1xuXHQqIGxvYWQgYW5kIGEgcGVyY2VudGFnZSBvZiB0aGUgcHJvZ3Jlc3MuXG4gICAgKiB+fn5cbiAgICAqIHsgbG9hZGVkOiBqLCB0b3RhbDogdG90YWwsIHBlcmNlbnQ6IChqIC8gdG90YWwgKiAxMDApICxzcmM6c3JjfSlcblx0KiB+fn5cblx0KlxuXHQqIGBvbkVycm9yYCB3aWxsIGJlIHBhc3NlZCB3aXRoIHRoZSBhc3NldCB0aGF0IGNvdWxkbid0IGxvYWQuXG4gICAgKlxuXHQqIFdoZW4gYG9uRXJyb3JgIGlzIG5vdCBwcm92aWRlZCwgdGhlIG9uTG9hZCBpcyBsb2FkZWQgZXZlbiBzb21lIGFzc2V0cyBhcmUgbm90IHN1Y2Nlc3NmdWxseSBsb2FkZWQuIE90aGVyd2lzZSwgb25Mb2FkIHdpbGwgYmUgY2FsbGVkIG5vIG1hdHRlciB3aGV0aGVyIHRoZXJlIGFyZSBlcnJvcnMgb3Igbm90LiBcblx0KiBcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIENyYWZ0eS5sb2FkKFtcImltYWdlcy9zcHJpdGUucG5nXCIsIFwic291bmRzL2p1bXAubXAzXCJdLFxuXHQqICAgICBmdW5jdGlvbigpIHtcblx0KiAgICAgICAgIC8vd2hlbiBsb2FkZWRcblx0KiAgICAgICAgIENyYWZ0eS5zY2VuZShcIm1haW5cIik7IC8vZ28gdG8gbWFpbiBzY2VuZVxuXHQqICAgICAgICAgQ3JhZnR5LmF1ZGlvLnBsYXkoXCJqdW1wLm1wM1wiKTsgLy9QbGF5IHRoZSBhdWRpbyBmaWxlXG5cdCogICAgIH0sXG5cdCpcblx0KiAgICAgZnVuY3Rpb24oZSkge1xuXHQqICAgICAgIC8vcHJvZ3Jlc3Ncblx0KiAgICAgfSxcblx0KlxuXHQqICAgICBmdW5jdGlvbihlKSB7XG5cdCogICAgICAgLy91aCBvaCwgZXJyb3IgbG9hZGluZ1xuXHQqICAgICB9XG5cdCogKTtcblx0KiB+fn5cblx0KiBcblx0KiBAc2VlIENyYWZ0eS5hc3NldHNcbiAgICAgICAgKiBAc2VlIENyYWZ0eS5pbWFnZV93aGl0ZWxpc3Rcblx0Ki9cbiAgICBsb2FkOiBmdW5jdGlvbiAoZGF0YSwgb25jb21wbGV0ZSwgb25wcm9ncmVzcywgb25lcnJvcikge1xuICAgICAgICAgICAgXG4gICAgICAgIHZhciBpID0gMCwgbCA9IGRhdGEubGVuZ3RoLCBjdXJyZW50LCBvYmosIHRvdGFsID0gbCwgaiA9IDAsIGV4dCA9IFwiXCIgO1xuICBcbiAgICAgICAgLy9Qcm9ncmVzcyBmdW5jdGlvblxuICAgICAgICBmdW5jdGlvbiBwcm8oKXtcbiAgICAgICAgICAgIHZhciBzcmMgPSB0aGlzLnNyYztcbiAgICAgICAgICAgXG4gICAgICAgICAgICAvL1JlbW92ZSBldmVudHMgY2F1c2UgYXVkaW8gdHJpZ2dlciB0aGlzIGV2ZW50IG1vcmUgdGhhbiBvbmNlKGRlcGVuZHMgb24gYnJvd3NlcilcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHsgIFxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBwcm8sIGZhbHNlKTsgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICBcbiAgICAgICAgICAgICsrajtcbiAgICAgICAgICAgIC8vaWYgcHJvZ3Jlc3MgY2FsbGJhY2ssIGdpdmUgaW5mb3JtYXRpb24gb2YgYXNzZXRzIGxvYWRlZCwgdG90YWwgYW5kIHBlcmNlbnRcbiAgICAgICAgICAgIGlmIChvbnByb2dyZXNzKSBcbiAgICAgICAgICAgICAgICBvbnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVkOiBqLCBcbiAgICAgICAgICAgICAgICAgICAgdG90YWw6IHRvdGFsLCBcbiAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogKGogLyB0b3RhbCAqIDEwMCksXG4gICAgICAgICAgICAgICAgICAgIHNyYzpzcmNcbiAgICAgICAgICAgICAgICB9KTtcblx0XHRcdFx0XG4gICAgICAgICAgICBpZihqID09PSB0b3RhbCAmJiBvbmNvbXBsZXRlKSBvbmNvbXBsZXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIC8vRXJyb3IgZnVuY3Rpb25cbiAgICAgICAgZnVuY3Rpb24gZXJyKCl7XG4gICAgICAgICAgICB2YXIgc3JjID0gdGhpcy5zcmM7XG4gICAgICAgICAgICBpZiAob25lcnJvcikgXG4gICAgICAgICAgICAgICAgb25lcnJvcih7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRlZDogaiwgXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsOiB0b3RhbCwgXG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IChqIC8gdG90YWwgKiAxMDApLFxuICAgICAgICAgICAgICAgICAgICBzcmM6c3JjXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIFx0XHRcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGogPT09IHRvdGFsICYmIG9uY29tcGxldGUpIG9uY29tcGxldGUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgICAgXG4gICAgICAgIGZvciAoOyBpIDwgbDsgKytpKSB7ICAgICAgIFxuICAgICAgICAgICAgY3VycmVudCA9IGRhdGFbaV07XG4gICAgICAgICAgICBleHQgPSBjdXJyZW50LnN1YnN0cihjdXJyZW50Lmxhc3RJbmRleE9mKCcuJykgKyAxLCAzKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICBcbiAgICAgICAgICAgIG9iaiA9IENyYWZ0eS5hc3NldChjdXJyZW50KSB8fCBudWxsOyAgIFxuICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKENyYWZ0eS5zdXBwb3J0LmF1ZGlvICYmIENyYWZ0eS5hdWRpby5zdXBwb3J0ZWRbZXh0XSkgeyAgIFxuICAgICAgICAgICAgICAgIC8vQ3JlYXRlIG5ldyBvYmplY3QgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmKCFvYmope1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IGN1cnJlbnQuc3Vic3RyKGN1cnJlbnQubGFzdEluZGV4T2YoJy8nKSArIDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIG9iaiA9IENyYWZ0eS5hdWRpby5hdWRpb0VsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqLmlkID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNyYyA9IGN1cnJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIG9iai5wcmVsb2FkID0gXCJhdXRvXCI7XG4gICAgICAgICAgICAgICAgICAgIG9iai52b2x1bWUgPSBDcmFmdHkuYXVkaW8udm9sdW1lO1xuICAgICAgICAgICAgICAgICAgICBDcmFmdHkuYXNzZXQoY3VycmVudCwgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgQ3JhZnR5LmF1ZGlvLnNvdW5kc1tuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iajpvYmosXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZWQ6MFxuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAgICAgLy9hZGRFdmVudExpc3RlbmVyIGlzIHN1cHBvcnRlZCBvbiBJRTkgLCBBdWRpbyBhcyB3ZWxsXG4gICAgICAgICAgICAgICAgaWYgKG9iai5hZGRFdmVudExpc3RlbmVyKSB7ICBcbiAgICAgICAgICAgICAgICAgICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcHJvLCBmYWxzZSk7ICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIGlmIChDcmFmdHkuaW1hZ2Vfd2hpdGVsaXN0LmluZGV4T2YoZXh0KSA+PSAwKSB7IFxuICAgICAgICAgICAgICAgIGlmKCFvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gbmV3IEltYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIENyYWZ0eS5hc3NldChjdXJyZW50LCBvYmopOyAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvYmoub25sb2FkPXBybztcbiAgICAgICAgICAgICAgICBvYmouc3JjID0gY3VycmVudDsgLy9zZXR1cCBzcmMgYWZ0ZXIgb25sb2FkIGZ1bmN0aW9uIE9wZXJhL0lFIEJ1Z1xuICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b3RhbC0tO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvL3NraXAgaWYgbm90IGFwcGxpY2FibGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9iai5vbmVycm9yID0gZXJyO1xuICAgICAgICB9XG4gICAgICAgXG4gICAgICAgXG4gICAgfSxcblx0LyoqQFxuXHQqICNDcmFmdHkubW9kdWxlc1xuXHQqIEBjYXRlZ29yeSBBc3NldHNcblx0KiBAc2lnbiBwdWJsaWMgdm9pZCBDcmFmdHkubW9kdWxlcyhbU3RyaW5nIHJlcG9Mb2NhdGlvbixdIE9iamVjdCBtb2R1bGVNYXBbLCBGdW5jdGlvbiBvbkxvYWRdKVxuXHQqIEBwYXJhbSBtb2R1bGVzIC0gTWFwIG9mIG5hbWU6dmVyc2lvbiBwYWlycyBmb3IgbW9kdWxlcyB0byBsb2FkXG5cdCogQHBhcmFtIG9uTG9hZCAtIENhbGxiYWNrIHdoZW4gdGhlIG1vZHVsZXMgYXJlIGxvYWRlZFxuXHQqIFxuXHQqIEJyb3dzZSB0aGUgc2VsZWN0aW9uIG9mIGNvbW11bml0eSBtb2R1bGVzIG9uIGh0dHA6Ly9jcmFmdHljb21wb25lbnRzLmNvbVxuXHQqIFxuICAgICogSXQgaXMgcG9zc2libGUgdG8gY3JlYXRlIHlvdXIgb3duIHJlcG9zaXRvcnkuXG5cdCpcblx0KlxuXHQqIEBleGFtcGxlXG5cdCogfn5+XG5cdCogLy8gTG9hZGluZyBmcm9tIGRlZmF1bHQgcmVwb3NpdG9yeVxuXHQqIENyYWZ0eS5tb2R1bGVzKHsgbW92ZXRvOiAnREVWJyB9LCBmdW5jdGlvbiAoKSB7XG5cdCogICAgIC8vbW9kdWxlIGlzIHJlYWR5XG5cdCogICAgIENyYWZ0eS5lKFwiTW92ZVRvLCAyRCwgRE9NXCIpO1xuXHQqIH0pO1xuXHQqXG5cdCogLy8gTG9hZGluZyBmcm9tIHlvdXIgb3duIHNlcnZlclxuXHQqIENyYWZ0eS5tb2R1bGVzKHsgJ2h0dHA6Ly9teWRvbWFpbi5jb20vanMvbXlzdHVmZi5qcyc6ICdERVYnIH0sIGZ1bmN0aW9uICgpIHtcblx0KiAgICAgLy9tb2R1bGUgaXMgcmVhZHlcblx0KiAgICAgQ3JhZnR5LmUoXCJNb3ZlVG8sIDJELCBET01cIik7XG5cdCogfSk7XG5cdCpcblx0KiAvLyBMb2FkaW5nIGZyb20gYWx0ZXJuYXRpdmUgcmVwb3NpdG9yeVxuXHQqIENyYWZ0eS5tb2R1bGVzKCdodHRwOi8vY2RuLmNyYWZ0eS1tb2R1bGVzLmNvbScsIHsgbW92ZXRvOiAnREVWJyB9LCBmdW5jdGlvbiAoKSB7XG5cdCogICAgIC8vbW9kdWxlIGlzIHJlYWR5XG5cdCogICAgIENyYWZ0eS5lKFwiTW92ZVRvLCAyRCwgRE9NXCIpO1xuXHQqIH0pO1xuXHQqXG5cdCogLy8gTG9hZGluZyBmcm9tIHRoZSBsYXRlc3QgY29tcG9uZW50IHdlYnNpdGVcblx0KiBDcmFmdHkubW9kdWxlcyhcblx0KiAgICAgJ2h0dHA6Ly9jZG4uY3JhZnR5Y29tcG9uZW50cy5jb20nXG5cdCogICAgICwgeyBNb3ZlVG86ICdyZWxlYXNlJyB9XG5cdCogICAgICwgZnVuY3Rpb24gKCkge1xuXHQqICAgICBDcmFmdHkuZShcIjJELCBET00sIENvbG9yLCBNb3ZlVG9cIilcblx0KiAgICAgICAuYXR0cih7eDogMCwgeTogMCwgdzogNTAsIGg6IDUwfSlcblx0KiAgICAgICAuY29sb3IoXCJncmVlblwiKTtcblx0KiAgICAgfSk7XG5cdCogfSk7XG5cdCogfn5+XG5cdCpcblx0Ki9cblx0bW9kdWxlczogZnVuY3Rpb24gKG1vZHVsZXNSZXBvc2l0b3J5LCBtb2R1bGVNYXAsIG9uY29tcGxldGUpIHtcblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyICYmIHR5cGVvZiBtb2R1bGVzUmVwb3NpdG9yeSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0b25jb21wbGV0ZSA9IG1vZHVsZU1hcDtcblx0XHRcdG1vZHVsZU1hcCA9IG1vZHVsZXNSZXBvc2l0b3J5O1xuXHRcdFx0bW9kdWxlc1JlcG9zaXRvcnkgPSAnaHR0cDovL2Nkbi5jcmFmdHljb21wb25lbnRzLmNvbSc7XG5cdFx0fVxuXG5cdFx0LyohXG5cdFx0ICAqICRzY3JpcHQuanMgQXN5bmMgbG9hZGVyICYgZGVwZW5kZW5jeSBtYW5hZ2VyXG5cdFx0ICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9kZWQvc2NyaXB0LmpzXG5cdFx0ICAqIChjKSBEdXN0aW4gRGlheiwgSmFjb2IgVGhvcm50b24gMjAxMVxuXHRcdCAgKiBMaWNlbnNlOiBNSVRcblx0XHQgICovXG5cdFx0dmFyICRzY3JpcHQgPSAoZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHdpbiA9IHRoaXMsIGRvYyA9IGRvY3VtZW50XG5cdFx0XHQsIGhlYWQgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXVxuXHRcdFx0LCB2YWxpZEJhc2UgPSAvXmh0dHBzPzpcXC9cXC8vXG5cdFx0XHQsIG9sZCA9IHdpbi4kc2NyaXB0LCBsaXN0ID0ge30sIGlkcyA9IHt9LCBkZWxheSA9IHt9LCBzY3JpcHRwYXRoXG5cdFx0XHQsIHNjcmlwdHMgPSB7fSwgcyA9ICdzdHJpbmcnLCBmID0gZmFsc2Vcblx0XHRcdCwgcHVzaCA9ICdwdXNoJywgZG9tQ29udGVudExvYWRlZCA9ICdET01Db250ZW50TG9hZGVkJywgcmVhZHlTdGF0ZSA9ICdyZWFkeVN0YXRlJ1xuXHRcdFx0LCBhZGRFdmVudExpc3RlbmVyID0gJ2FkZEV2ZW50TGlzdGVuZXInLCBvbnJlYWR5c3RhdGVjaGFuZ2UgPSAnb25yZWFkeXN0YXRlY2hhbmdlJ1xuXG5cdFx0XHRmdW5jdGlvbiBldmVyeShhciwgZm4sIGkpIHtcblx0XHRcdFx0Zm9yIChpID0gMCwgaiA9IGFyLmxlbmd0aDsgaSA8IGo7ICsraSkgaWYgKCFmbihhcltpXSkpIHJldHVybiBmXG5cdFx0XHRcdHJldHVybiAxXG5cdFx0XHR9XG5cdFx0XHRmdW5jdGlvbiBlYWNoKGFyLCBmbikge1xuXHRcdFx0XHRldmVyeShhciwgZnVuY3Rpb24gKGVsKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFmbihlbClcblx0XHRcdFx0fSlcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFkb2NbcmVhZHlTdGF0ZV0gJiYgZG9jW2FkZEV2ZW50TGlzdGVuZXJdKSB7XG5cdFx0XHRcdGRvY1thZGRFdmVudExpc3RlbmVyXShkb21Db250ZW50TG9hZGVkLCBmdW5jdGlvbiBmbigpIHtcblx0XHRcdFx0XHRkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcihkb21Db250ZW50TG9hZGVkLCBmbiwgZilcblx0XHRcdFx0XHRkb2NbcmVhZHlTdGF0ZV0gPSAnY29tcGxldGUnXG5cdFx0XHRcdH0sIGYpXG5cdFx0XHRcdGRvY1tyZWFkeVN0YXRlXSA9ICdsb2FkaW5nJ1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiAkc2NyaXB0KHBhdGhzLCBpZE9yRG9uZSwgb3B0RG9uZSkge1xuXHRcdFx0XHRwYXRocyA9IHBhdGhzW3B1c2hdID8gcGF0aHMgOiBbcGF0aHNdXG5cdFx0XHRcdHZhciBpZE9yRG9uZUlzRG9uZSA9IGlkT3JEb25lICYmIGlkT3JEb25lLmNhbGxcblx0XHRcdFx0LCBkb25lID0gaWRPckRvbmVJc0RvbmUgPyBpZE9yRG9uZSA6IG9wdERvbmVcblx0XHRcdFx0LCBpZCA9IGlkT3JEb25lSXNEb25lID8gcGF0aHMuam9pbignJykgOiBpZE9yRG9uZVxuXHRcdFx0XHQsIHF1ZXVlID0gcGF0aHMubGVuZ3RoXG5cdFx0XHRcdGZ1bmN0aW9uIGxvb3BGbihpdGVtKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGl0ZW0uY2FsbCA/IGl0ZW0oKSA6IGxpc3RbaXRlbV1cblx0XHRcdFx0fVxuXHRcdFx0XHRmdW5jdGlvbiBjYWxsYmFjaygpIHtcblx0XHRcdFx0XHRpZiAoIS0tcXVldWUpIHtcblx0XHRcdFx0XHRcdGxpc3RbaWRdID0gMVxuXHRcdFx0XHRcdFx0ZG9uZSAmJiBkb25lKClcblx0XHRcdFx0XHRcdGZvciAodmFyIGRzZXQgaW4gZGVsYXkpIHtcblx0XHRcdFx0XHRcdFx0ZXZlcnkoZHNldC5zcGxpdCgnfCcpLCBsb29wRm4pICYmICFlYWNoKGRlbGF5W2RzZXRdLCBsb29wRm4pICYmIChkZWxheVtkc2V0XSA9IFtdKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRlYWNoKHBhdGhzLCBmdW5jdGlvbiAocGF0aCkge1xuXHRcdFx0XHRcdFx0aWYgKHNjcmlwdHNbcGF0aF0pIHtcblx0XHRcdFx0XHRcdFx0aWQgJiYgKGlkc1tpZF0gPSAxKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gc2NyaXB0c1twYXRoXSA9PSAyICYmIGNhbGxiYWNrKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHNjcmlwdHNbcGF0aF0gPSAxXG5cdFx0XHRcdFx0XHRpZCAmJiAoaWRzW2lkXSA9IDEpXG5cdFx0XHRcdFx0XHRjcmVhdGUoIXZhbGlkQmFzZS50ZXN0KHBhdGgpICYmIHNjcmlwdHBhdGggPyBzY3JpcHRwYXRoICsgcGF0aCArICcuanMnIDogcGF0aCwgY2FsbGJhY2spXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSwgMClcblx0XHRcdFx0cmV0dXJuICRzY3JpcHRcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gY3JlYXRlKHBhdGgsIGZuKSB7XG5cdFx0XHRcdHZhciBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuXHRcdFx0XHQsIGxvYWRlZCA9IGZcblx0XHRcdFx0ZWwub25sb2FkID0gZWwub25lcnJvciA9IGVsW29ucmVhZHlzdGF0ZWNoYW5nZV0gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKChlbFtyZWFkeVN0YXRlXSAmJiAhKC9eY3xsb2FkZS8udGVzdChlbFtyZWFkeVN0YXRlXSkpKSB8fCBsb2FkZWQpIHJldHVybjtcblx0XHRcdFx0XHRlbC5vbmxvYWQgPSBlbFtvbnJlYWR5c3RhdGVjaGFuZ2VdID0gbnVsbFxuXHRcdFx0XHRcdGxvYWRlZCA9IDFcblx0XHRcdFx0XHRzY3JpcHRzW3BhdGhdID0gMlxuXHRcdFx0XHRcdGZuKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbC5hc3luYyA9IDFcblx0XHRcdFx0ZWwuc3JjID0gcGF0aFxuXHRcdFx0XHRoZWFkLmluc2VydEJlZm9yZShlbCwgaGVhZC5maXJzdENoaWxkKVxuXHRcdFx0fVxuXG5cdFx0XHQkc2NyaXB0LmdldCA9IGNyZWF0ZVxuXG5cdFx0XHQkc2NyaXB0Lm9yZGVyID0gZnVuY3Rpb24gKHNjcmlwdHMsIGlkLCBkb25lKSB7XG5cdFx0XHRcdChmdW5jdGlvbiBjYWxsYmFjayhzKSB7XG5cdFx0XHRcdFx0cyA9IHNjcmlwdHMuc2hpZnQoKVxuXHRcdFx0XHRcdGlmICghc2NyaXB0cy5sZW5ndGgpICRzY3JpcHQocywgaWQsIGRvbmUpXG5cdFx0XHRcdFx0ZWxzZSAkc2NyaXB0KHMsIGNhbGxiYWNrKVxuXHRcdFx0XHR9KCkpXG5cdFx0XHR9XG5cblx0XHRcdCRzY3JpcHQucGF0aCA9IGZ1bmN0aW9uIChwKSB7XG5cdFx0XHRcdHNjcmlwdHBhdGggPSBwXG5cdFx0XHR9XG5cdFx0XHQkc2NyaXB0LnJlYWR5ID0gZnVuY3Rpb24gKGRlcHMsIHJlYWR5LCByZXEpIHtcblx0XHRcdFx0ZGVwcyA9IGRlcHNbcHVzaF0gPyBkZXBzIDogW2RlcHNdXG5cdFx0XHRcdHZhciBtaXNzaW5nID0gW107XG5cdFx0XHRcdCFlYWNoKGRlcHMsIGZ1bmN0aW9uIChkZXApIHtcblx0XHRcdFx0XHRsaXN0W2RlcF0gfHwgbWlzc2luZ1twdXNoXShkZXApO1xuXHRcdFx0XHR9KSAmJiBldmVyeShkZXBzLCBmdW5jdGlvbiAoZGVwKSB7IHJldHVybiBsaXN0W2RlcF0gfSkgP1xuXHRcdFx0XHRyZWFkeSgpIDogIWZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdFx0XHRkZWxheVtrZXldID0gZGVsYXlba2V5XSB8fCBbXVxuXHRcdFx0XHRcdGRlbGF5W2tleV1bcHVzaF0ocmVhZHkpXG5cdFx0XHRcdFx0cmVxICYmIHJlcShtaXNzaW5nKVxuXHRcdFx0XHR9KGRlcHMuam9pbignfCcpKVxuXHRcdFx0XHRyZXR1cm4gJHNjcmlwdFxuXHRcdFx0fVxuXG5cdFx0XHQkc2NyaXB0Lm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHdpbi4kc2NyaXB0ID0gb2xkO1xuXHRcdFx0XHRyZXR1cm4gdGhpc1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gJHNjcmlwdFxuXHRcdH0pKCk7XG5cblx0XHR2YXIgbW9kdWxlcyA9IFtdO1xuXHRcdHZhciB2YWxpZEJhc2UgPSAvXihodHRwcz98ZmlsZSk6XFwvXFwvLztcblx0XHRmb3IgKHZhciBpIGluIG1vZHVsZU1hcCkge1xuXHRcdFx0aWYgKHZhbGlkQmFzZS50ZXN0KGkpKVxuXHRcdFx0XHRtb2R1bGVzLnB1c2goaSlcblx0XHRcdGVsc2Vcblx0XHRcdFx0bW9kdWxlcy5wdXNoKG1vZHVsZXNSZXBvc2l0b3J5ICsgJy8nICsgaS50b0xvd2VyQ2FzZSgpICsgJy0nICsgbW9kdWxlTWFwW2ldLnRvTG93ZXJDYXNlKCkgKyAnLmpzJyk7XG5cdFx0fVxuXG5cdFx0JHNjcmlwdChtb2R1bGVzLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAob25jb21wbGV0ZSkgb25jb21wbGV0ZSgpO1xuXHRcdH0pO1xuXHR9XG59KTtcblxuLyoqQFxuKiAjQ3JhZnR5Lm1hdGhcbiogQGNhdGVnb3J5IDJEXG4qIFN0YXRpYyBmdW5jdGlvbnMuXG4qL1xuQ3JhZnR5Lm1hdGggPSB7XG4vKipAXG5cdCAqICNDcmFmdHkubWF0aC5hYnNcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcbiAgICAgKiBAc2lnbiBwdWJsaWMgdGhpcyBDcmFmdHkubWF0aC5hYnMoTnVtYmVyIG4pXG4gICAgICogQHBhcmFtIG4gLSBTb21lIHZhbHVlLlxuICAgICAqIEByZXR1cm4gQWJzb2x1dGUgdmFsdWUuXG4gICAgICogXG5cdCAqIFJldHVybnMgdGhlIGFic29sdXRlIHZhbHVlLlxuICAgICAqL1xuXHRhYnM6IGZ1bmN0aW9uICh4KSB7XG5cdFx0cmV0dXJuIHggPCAwID8gLXggOiB4O1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGguYW1vdW50T2Zcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5hbW91bnRPZihOdW1iZXIgY2hlY2tWYWx1ZSwgTnVtYmVyIG1pblZhbHVlLCBOdW1iZXIgbWF4VmFsdWUpXG4gICAgICogQHBhcmFtIGNoZWNrVmFsdWUgLSBWYWx1ZSB0aGF0IHNob3VsZCBjaGVja2VkIHdpdGggbWluaW11bSBhbmQgbWF4aW11bS5cbiAgICAgKiBAcGFyYW0gbWluVmFsdWUgLSBNaW5pbXVtIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSBtYXhWYWx1ZSAtIE1heGltdW0gdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybiBBbW91bnQgb2YgY2hlY2tWYWx1ZSBjb21wYXJlZCB0byBtaW5WYWx1ZSBhbmQgbWF4VmFsdWUuXG4gICAgICogXG5cdCAqIFJldHVybnMgdGhlIGFtb3VudCBvZiBob3cgbXVjaCBhIGNoZWNrVmFsdWUgaXMgbW9yZSBsaWtlIG1pblZhbHVlICg9MClcbiAgICAgKiBvciBtb3JlIGxpa2UgbWF4VmFsdWUgKD0xKVxuICAgICAqL1xuXHRhbW91bnRPZjogZnVuY3Rpb24gKGNoZWNrVmFsdWUsIG1pblZhbHVlLCBtYXhWYWx1ZSkge1xuXHRcdGlmIChtaW5WYWx1ZSA8IG1heFZhbHVlKVxuXHRcdFx0cmV0dXJuIChjaGVja1ZhbHVlIC0gbWluVmFsdWUpIC8gKG1heFZhbHVlIC0gbWluVmFsdWUpO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiAoY2hlY2tWYWx1ZSAtIG1heFZhbHVlKSAvIChtaW5WYWx1ZSAtIG1heFZhbHVlKTtcblx0fSxcblxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGguY2xhbXBcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5jbGFtcChOdW1iZXIgdmFsdWUsIE51bWJlciBtaW4sIE51bWJlciBtYXgpXG4gICAgICogQHBhcmFtIHZhbHVlIC0gQSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0gbWF4IC0gTWF4aW11bSB0aGF0IHZhbHVlIGNhbiBiZS5cbiAgICAgKiBAcGFyYW0gbWluIC0gTWluaW11bSB0aGF0IHZhbHVlIGNhbiBiZS5cbiAgICAgKiBAcmV0dXJuIFRoZSB2YWx1ZSBiZXR3ZWVuIG1pbmltdW0gYW5kIG1heGltdW0uXG4gICAgICogXG5cdCAqIFJlc3RyaWN0cyBhIHZhbHVlIHRvIGJlIHdpdGhpbiBhIHNwZWNpZmllZCByYW5nZS5cbiAgICAgKi9cblx0Y2xhbXA6IGZ1bmN0aW9uICh2YWx1ZSwgbWluLCBtYXgpIHtcblx0XHRpZiAodmFsdWUgPiBtYXgpXG5cdFx0XHRyZXR1cm4gbWF4O1xuXHRcdGVsc2UgaWYgKHZhbHVlIDwgbWluKVxuXHRcdFx0cmV0dXJuIG1pbjtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gdmFsdWU7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqIENvbnZlcnRzIGFuZ2xlIGZyb20gZGVncmVlIHRvIHJhZGlhbi5cblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcbiAgICAgKiBAcGFyYW0gYW5nbGVJbkRlZyAtIFRoZSBhbmdsZSBpbiBkZWdyZWUuXG4gICAgICogQHJldHVybiBUaGUgYW5nbGUgaW4gcmFkaWFuLlxuICAgICAqL1xuXHRkZWdUb1JhZDogZnVuY3Rpb24gKGFuZ2xlSW5EZWcpIHtcblx0XHRyZXR1cm4gYW5nbGVJbkRlZyAqIE1hdGguUEkgLyAxODA7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5kaXN0YW5jZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLmRpc3RhbmNlKE51bWJlciB4MSwgTnVtYmVyIHkxLCBOdW1iZXIgeDIsIE51bWJlciB5MilcbiAgICAgKiBAcGFyYW0geDEgLSBGaXJzdCB4IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHkxIC0gRmlyc3QgeSBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB4MiAtIFNlY29uZCB4IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHkyIC0gU2Vjb25kIHkgY29vcmRpbmF0ZS5cbiAgICAgKiBAcmV0dXJuIFRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gcG9pbnRzLlxuICAgICAqIFxuXHQgKiBEaXN0YW5jZSBiZXR3ZWVuIHR3byBwb2ludHMuXG4gICAgICovXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcblx0XHR2YXIgc3F1YXJlZERpc3RhbmNlID0gQ3JhZnR5Lm1hdGguc3F1YXJlZERpc3RhbmNlKHgxLCB5MSwgeDIsIHkyKTtcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KHBhcnNlRmxvYXQoc3F1YXJlZERpc3RhbmNlKSk7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5sZXJwXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGgubGVycChOdW1iZXIgdmFsdWUxLCBOdW1iZXIgdmFsdWUyLCBOdW1iZXIgYW1vdW50KVxuICAgICAqIEBwYXJhbSB2YWx1ZTEgLSBPbmUgdmFsdWUuXG4gICAgICogQHBhcmFtIHZhbHVlMiAtIEFub3RoZXIgdmFsdWUuXG4gICAgICogQHBhcmFtIGFtb3VudCAtIEFtb3VudCBvZiB2YWx1ZTIgdG8gdmFsdWUxLlxuICAgICAqIEByZXR1cm4gTGluZWFyIGludGVycG9sYXRlZCB2YWx1ZS5cbiAgICAgKiBcblx0ICogTGluZWFyIGludGVycG9sYXRpb24uIFBhc3NpbmcgYW1vdW50IHdpdGggYSB2YWx1ZSBvZiAwIHdpbGwgY2F1c2UgdmFsdWUxIHRvIGJlIHJldHVybmVkLFxuICAgICAqIGEgdmFsdWUgb2YgMSB3aWxsIGNhdXNlIHZhbHVlMiB0byBiZSByZXR1cm5lZC5cbiAgICAgKi9cblx0bGVycDogZnVuY3Rpb24gKHZhbHVlMSwgdmFsdWUyLCBhbW91bnQpIHtcblx0XHRyZXR1cm4gdmFsdWUxICsgKHZhbHVlMiAtIHZhbHVlMSkgKiBhbW91bnQ7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5uZWdhdGVcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5uZWdhdGUoTnVtYmVyIHBlcmNlbnQpXG4gICAgICogQHBhcmFtIHBlcmNlbnQgLSBJZiB5b3UgcGFzcyAxIGEgLTEgd2lsbCBiZSByZXR1cm5lZC4gSWYgeW91IHBhc3MgMCBhIDEgd2lsbCBiZSByZXR1cm5lZC5cbiAgICAgKiBAcmV0dXJuIDEgb3IgLTEuXG4gICAgICogXG5cdCAqIFJldHVybmVzIFwicmFuZG9tbHlcIiAtMS5cbiAgICAgKi9cblx0bmVnYXRlOiBmdW5jdGlvbiAocGVyY2VudCkge1xuXHRcdGlmIChNYXRoLnJhbmRvbSgpIDwgcGVyY2VudClcblx0XHRcdHJldHVybiAtMTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gMTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLnJhZFRvRGVnXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGgucmFkVG9EZWcoTnVtYmVyIGFuZ2xlKVxuICAgICAqIEBwYXJhbSBhbmdsZUluUmFkIC0gVGhlIGFuZ2xlIGluIHJhZGlhbi5cbiAgICAgKiBAcmV0dXJuIFRoZSBhbmdsZSBpbiBkZWdyZWUuXG4gICAgICogXG5cdCAqIENvbnZlcnRzIGFuZ2xlIGZyb20gcmFkaWFuIHRvIGRlZ3JlZS5cbiAgICAgKi9cblx0cmFkVG9EZWc6IGZ1bmN0aW9uIChhbmdsZUluUmFkKSB7XG5cdFx0cmV0dXJuIGFuZ2xlSW5SYWQgKiAxODAgLyBNYXRoLlBJO1xuXHR9LFxuXG5cdC8qKkBcbiAgICAgKiAjQ3JhZnR5Lm1hdGgucmFuZG9tRWxlbWVudE9mQXJyYXlcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE9iamVjdCBDcmFmdHkubWF0aC5yYW5kb21FbGVtZW50T2ZBcnJheShBcnJheSBhcnJheSlcbiAgICAgKiBAcGFyYW0gYXJyYXkgLSBBIHNwZWNpZmljIGFycmF5LlxuICAgICAqIEByZXR1cm4gQSByYW5kb20gZWxlbWVudCBvZiBhIHNwZWNpZmljIGFycmF5LlxuICAgICAqIFxuXHQgKiBSZXR1cm5zIGEgcmFuZG9tIGVsZW1lbnQgb2YgYSBzcGVjaWZpYyBhcnJheS5cbiAgICAgKi9cblx0cmFuZG9tRWxlbWVudE9mQXJyYXk6IGZ1bmN0aW9uIChhcnJheSkge1xuXHRcdHJldHVybiBhcnJheVtNYXRoLmZsb29yKGFycmF5Lmxlbmd0aCAqIE1hdGgucmFuZG9tKCkpXTtcblx0fSxcblxuXHQvKipAXG4gICAgICogI0NyYWZ0eS5tYXRoLnJhbmRvbUludFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgTnVtYmVyIENyYWZ0eS5tYXRoLnJhbmRvbUludChOdW1iZXIgc3RhcnQsIE51bWJlciBlbmQpXG4gICAgICogQHBhcmFtIHN0YXJ0IC0gU21hbGxlc3QgaW50IHZhbHVlIHRoYXQgY2FuIGJlIHJldHVybmVkLlxuICAgICAqIEBwYXJhbSBlbmQgLSBCaWdnZXN0IGludCB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZC5cbiAgICAgKiBAcmV0dXJuIEEgcmFuZG9tIGludC5cbiAgICAgKiBcblx0ICogUmV0dXJucyBhIHJhbmRvbSBpbnQgaW4gd2l0aGluIGEgc3BlY2lmaWMgcmFuZ2UuXG4gICAgICovXG5cdHJhbmRvbUludDogZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm4gc3RhcnQgKyBNYXRoLmZsb29yKCgxICsgZW5kIC0gc3RhcnQpICogTWF0aC5yYW5kb20oKSk7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC5yYW5kb21OdW1iZXJcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGhcblx0ICogQHNpZ24gcHVibGljIE51bWJlciBDcmFmdHkubWF0aC5yYW5kb21JbnQoTnVtYmVyIHN0YXJ0LCBOdW1iZXIgZW5kKVxuICAgICAqIEBwYXJhbSBzdGFydCAtIFNtYWxsZXN0IG51bWJlciB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZC5cbiAgICAgKiBAcGFyYW0gZW5kIC0gQmlnZ2VzdCBudW1iZXIgdmFsdWUgdGhhdCBjYW4gYmUgcmV0dXJuZWQuXG4gICAgICogQHJldHVybiBBIHJhbmRvbSBudW1iZXIuXG4gICAgICogXG5cdCAqIFJldHVybnMgYSByYW5kb20gbnVtYmVyIGluIHdpdGhpbiBhIHNwZWNpZmljIHJhbmdlLlxuICAgICAqL1xuXHRyYW5kb21OdW1iZXI6IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuIHN0YXJ0ICsgKGVuZCAtIHN0YXJ0KSAqIE1hdGgucmFuZG9tKCk7XG5cdH0sXG5cblx0LyoqQFxuXHQgKiAjQ3JhZnR5Lm1hdGguc3F1YXJlZERpc3RhbmNlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoXG5cdCAqIEBzaWduIHB1YmxpYyBOdW1iZXIgQ3JhZnR5Lm1hdGguc3F1YXJlZERpc3RhbmNlKE51bWJlciB4MSwgTnVtYmVyIHkxLCBOdW1iZXIgeDIsIE51bWJlciB5MilcbiAgICAgKiBAcGFyYW0geDEgLSBGaXJzdCB4IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHkxIC0gRmlyc3QgeSBjb29yZGluYXRlLlxuICAgICAqIEBwYXJhbSB4MiAtIFNlY29uZCB4IGNvb3JkaW5hdGUuXG4gICAgICogQHBhcmFtIHkyIC0gU2Vjb25kIHkgY29vcmRpbmF0ZS5cbiAgICAgKiBAcmV0dXJuIFRoZSBzcXVhcmVkIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBwb2ludHMuXG4gICAgICogXG5cdCAqIFNxdWFyZWQgZGlzdGFuY2UgYmV0d2VlbiB0d28gcG9pbnRzLlxuICAgICAqL1xuXHRzcXVhcmVkRGlzdGFuY2U6IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuXHRcdHJldHVybiAoeDEgLSB4MikgKiAoeDEgLSB4MikgKyAoeTEgLSB5MikgKiAoeTEgLSB5Mik7XG5cdH0sXG5cblx0LyoqQFxuICAgICAqICNDcmFmdHkubWF0aC53aXRoaW5SYW5nZVxuXHQgKiBAY29tcCBDcmFmdHkubWF0aFxuXHQgKiBAc2lnbiBwdWJsaWMgQm9vbGVhbiBDcmFmdHkubWF0aC53aXRoaW5SYW5nZShOdW1iZXIgdmFsdWUsIE51bWJlciBtaW4sIE51bWJlciBtYXgpXG4gICAgICogQHBhcmFtIHZhbHVlIC0gVGhlIHNwZWNpZmljIHZhbHVlLlxuICAgICAqIEBwYXJhbSBtaW4gLSBNaW5pbXVtIHZhbHVlLlxuICAgICAqIEBwYXJhbSBtYXggLSBNYXhpbXVtIHZhbHVlLlxuICAgICAqIEByZXR1cm4gUmV0dXJucyB0cnVlIGlmIHZhbHVlIGlzIHdpdGhpbiBhIHNwZWNpZmljIHJhbmdlLlxuICAgICAqIFxuXHQgKiBDaGVjayBpZiBhIHZhbHVlIGlzIHdpdGhpbiBhIHNwZWNpZmljIHJhbmdlLlxuICAgICAqL1xuXHR3aXRoaW5SYW5nZTogZnVuY3Rpb24gKHZhbHVlLCBtaW4sIG1heCkge1xuXHRcdHJldHVybiAodmFsdWUgPj0gbWluICYmIHZhbHVlIDw9IG1heCk7XG5cdH1cbn07XG5cbkNyYWZ0eS5tYXRoLlZlY3RvcjJEID0gKGZ1bmN0aW9uICgpIHtcblx0LyoqQFxuXHQgKiAjQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICogQGNhdGVnb3J5IDJEXG5cdCAqIEBjbGFzcyBUaGlzIGlzIGEgZ2VuZXJhbCBwdXJwb3NlIDJEIHZlY3RvciBjbGFzc1xuXHQgKlxuXHQgKiBWZWN0b3IyRCB1c2VzIHRoZSBmb2xsb3dpbmcgZm9ybTpcblx0ICogPHgsIHk+XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gVmVjdG9yMkQoKTtcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gVmVjdG9yMkQoVmVjdG9yMkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBWZWN0b3IyRChOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR8TnVtYmVyPTB9IHhcblx0ICogQHBhcmFtIHtOdW1iZXI9MH0geVxuXHQgKi9cblx0ZnVuY3Rpb24gVmVjdG9yMkQoeCwgeSkge1xuXHRcdGlmICh4IGluc3RhbmNlb2YgVmVjdG9yMkQpIHtcblx0XHRcdHRoaXMueCA9IHgueDtcblx0XHRcdHRoaXMueSA9IHgueTtcblx0XHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMueCA9IHg7XG5cdFx0XHR0aGlzLnkgPSB5O1xuXHRcdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApXG5cdFx0XHR0aHJvdyBcIlVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgVmVjdG9yMkQoKVwiO1xuXHR9IC8vIGNsYXNzIFZlY3RvcjJEXG5cblx0VmVjdG9yMkQucHJvdG90eXBlLnggPSAwO1xuXHRWZWN0b3IyRC5wcm90b3R5cGUueSA9IDA7XG5cblx0LyoqQFxuXHQgKiAjLmFkZFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIEFkZHMgdGhlIHBhc3NlZCB2ZWN0b3IgdG8gdGhpcyB2ZWN0b3Jcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBhZGQoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge3ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgYWZ0ZXIgYWRkaW5nXG5cdCAqL1xuXHRWZWN0b3IyRC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHZlY1JIKSB7XG5cdFx0dGhpcy54ICs9IHZlY1JILng7XG5cdFx0dGhpcy55ICs9IHZlY1JILnk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0gLy8gYWRkXG5cblx0LyoqQFxuXHQgKiAjLmFuZ2xlQmV0d2VlblxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIGFuZ2xlIGJldHdlZW4gdGhlIHBhc3NlZCB2ZWN0b3IgYW5kIHRoaXMgdmVjdG9yLCB1c2luZyA8MCwwPiBhcyB0aGUgcG9pbnQgb2YgcmVmZXJlbmNlLlxuXHQgKiBBbmdsZXMgcmV0dXJuZWQgaGF2ZSB0aGUgcmFuZ2UgKOKIks+ALCDPgF0uXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGFuZ2xlQmV0d2VlbihWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IHZlY1JIXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBhbmdsZSBiZXR3ZWVuIHRoZSB0d28gdmVjdG9ycyBpbiByYWRpYW5zXG5cdCAqL1xuXHRWZWN0b3IyRC5wcm90b3R5cGUuYW5nbGVCZXR3ZWVuID0gZnVuY3Rpb24gKHZlY1JIKSB7XG5cdFx0cmV0dXJuIE1hdGguYXRhbjIodGhpcy54ICogdmVjUkgueSAtIHRoaXMueSAqIHZlY1JILngsIHRoaXMueCAqIHZlY1JILnggKyB0aGlzLnkgKiB2ZWNSSC55KTtcblx0fSAvLyBhbmdsZUJldHdlZW5cblxuXHQvKipAXG5cdCAqICMuYW5nbGVUb1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIGFuZ2xlIHRvIHRoZSBwYXNzZWQgdmVjdG9yIGZyb20gdGhpcyB2ZWN0b3IsIHVzaW5nIHRoaXMgdmVjdG9yIGFzIHRoZSBwb2ludCBvZiByZWZlcmVuY2UuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGFuZ2xlVG8oVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgYW5nbGUgdG8gdGhlIHBhc3NlZCB2ZWN0b3IgaW4gcmFkaWFuc1xuXHQgKi9cblx0VmVjdG9yMkQucHJvdG90eXBlLmFuZ2xlVG8gPSBmdW5jdGlvbiAodmVjUkgpIHtcblx0XHRyZXR1cm4gTWF0aC5hdGFuMih2ZWNSSC55IC0gdGhpcy55LCB2ZWNSSC54IC0gdGhpcy54KTtcblx0fTtcblxuXHQvKipAXG5cdCAqICMuY2xvbmVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDcmVhdGVzIGFuZCBleGFjdCwgbnVtZXJpYyBjb3B5IG9mIHRoaXMgdmVjdG9yXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gY2xvbmUoKTtcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGUgbmV3IHZlY3RvclxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyRCh0aGlzKTtcbiAgICB9OyAvLyBjbG9uZVxuXG5cdC8qKkBcblx0ICogIy5kaXN0YW5jZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG5cdCAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIGRpc3RhbmNlIGZyb20gdGhpcyB2ZWN0b3IgdG8gdGhlIHBhc3NlZCB2ZWN0b3IuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGRpc3RhbmNlKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byB2ZWN0b3JzXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5kaXN0YW5jZSA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQoKHZlY1JILnggLSB0aGlzLngpICogKHZlY1JILnggLSB0aGlzLngpICsgKHZlY1JILnkgLSB0aGlzLnkpICogKHZlY1JILnkgLSB0aGlzLnkpKTtcbiAgICB9OyAvLyBkaXN0YW5jZVxuXG5cdC8qKkBcblx0ICogIy5kaXN0YW5jZVNxXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoaXMgdmVjdG9yIHRvIHRoZSBwYXNzZWQgdmVjdG9yLlxuXHQgKiBUaGlzIGZ1bmN0aW9uIGF2b2lkcyBjYWxjdWxhdGluZyB0aGUgc3F1YXJlIHJvb3QsIHRodXMgYmVpbmcgc2xpZ2h0bHkgZmFzdGVyIHRoYW4gLmRpc3RhbmNlKCApLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBkaXN0YW5jZVNxKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIHNxdWFyZWQgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIHZlY3RvcnNcblx0ICogQHNlZSAuZGlzdGFuY2Vcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmRpc3RhbmNlU3EgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICByZXR1cm4gKHZlY1JILnggLSB0aGlzLngpICogKHZlY1JILnggLSB0aGlzLngpICsgKHZlY1JILnkgLSB0aGlzLnkpICogKHZlY1JILnkgLSB0aGlzLnkpO1xuICAgIH07IC8vIGRpc3RhbmNlU3FcblxuXHQvKipAXG5cdCAqICMuZGl2aWRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogRGl2aWRlcyB0aGlzIHZlY3RvciBieSB0aGUgcGFzc2VkIHZlY3Rvci5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1ZlY3RvcjJEfSBkaXZpZGUoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIGRpdmlkaW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5kaXZpZGUgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICB0aGlzLnggLz0gdmVjUkgueDtcbiAgICAgICAgdGhpcy55IC89IHZlY1JILnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIGRpdmlkZVxuXG5cdC8qKkBcblx0ICogIy5kb3RQcm9kdWN0XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgZG90IHByb2R1Y3Qgb2YgdGhpcyBhbmQgdGhlIHBhc3NlZCB2ZWN0b3JzXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IGRvdFByb2R1Y3QoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgcmVzdWx0YW50IGRvdCBwcm9kdWN0XG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5kb3RQcm9kdWN0ID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHZlY1JILnggKyB0aGlzLnkgKiB2ZWNSSC55O1xuICAgIH07IC8vIGRvdFByb2R1Y3RcblxuXHQvKipAXG5cdCAqICMuZXF1YWxzXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogRGV0ZXJtaW5lcyBpZiB0aGlzIHZlY3RvciBpcyBudW1lcmljYWxseSBlcXVpdmFsZW50IHRvIHRoZSBwYXNzZWQgdmVjdG9yLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7Qm9vbGVhbn0gZXF1YWxzKFZlY3RvcjJEKTtcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gdmVjUkhcblx0ICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgdGhlIHZlY3RvcnMgYXJlIGVxdWl2YWxlbnRcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHJldHVybiB2ZWNSSCBpbnN0YW5jZW9mIFZlY3RvcjJEICYmXG4gICAgICAgICAgICB0aGlzLnggPT0gdmVjUkgueCAmJiB0aGlzLnkgPT0gdmVjUkgueTtcbiAgICB9OyAvLyBlcXVhbHNcblxuXHQvKipAXG5cdCAqICMuZ2V0Tm9ybWFsXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyBhIG5ldyByaWdodC1oYW5kZWQgbm9ybWFsIHZlY3RvciBmb3IgdGhlIGxpbmUgY3JlYXRlZCBieSB0aGlzIGFuZCB0aGUgcGFzc2VkIHZlY3RvcnMuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gZ2V0Tm9ybWFsKFtWZWN0b3IyRF0pO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEPTwwLDA+fSBbdmVjUkhdXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhlIG5ldyBub3JtYWwgdmVjdG9yXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5nZXROb3JtYWwgPSBmdW5jdGlvbih2ZWNSSCkge1xuICAgICAgICBpZiAodmVjUkggPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjdG9yMkQoLXRoaXMueSwgdGhpcy54KTsgLy8gYXNzdW1lIHZlY1JIIGlzIDwwLCAwPlxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcjJEKHZlY1JILnkgLSB0aGlzLnksIHRoaXMueCAtIHZlY1JILngpLm5vcm1hbGl6ZSgpO1xuICAgIH07IC8vIGdldE5vcm1hbFxuXG5cdC8qKkBcblx0ICogIy5pc1plcm9cbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBEZXRlcm1pbmVzIGlmIHRoaXMgdmVjdG9yIGlzIGVxdWFsIHRvIDwwLDA+XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtCb29sZWFufSBpc1plcm8oKTtcblx0ICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgdGhpcyB2ZWN0b3IgaXMgZXF1YWwgdG8gPDAsMD5cblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ID09PSAwICYmIHRoaXMueSA9PT0gMDtcbiAgICB9OyAvLyBpc1plcm9cblxuXHQvKipAXG5cdCAqICMubWFnbml0dWRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogQ2FsY3VsYXRlcyB0aGUgbWFnbml0dWRlIG9mIHRoaXMgdmVjdG9yLlxuXHQgKiBOb3RlOiBGdW5jdGlvbiBvYmplY3RzIGluIEphdmFTY3JpcHQgYWxyZWFkeSBoYXZlIGEgJ2xlbmd0aCcgbWVtYmVyLCBoZW5jZSB0aGUgdXNlIG9mIG1hZ25pdHVkZSBpbnN0ZWFkLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBtYWduaXR1ZGUoKTtcblx0ICogQHJldHVybnMge051bWJlcn0gdGhlIG1hZ25pdHVkZSBvZiB0aGlzIHZlY3RvclxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUubWFnbml0dWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcbiAgICB9OyAvLyBtYWduaXR1ZGVcblxuXHQvKipAXG5cdCAqICMubWFnbml0dWRlU3FcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBzcXVhcmUgb2YgdGhlIG1hZ25pdHVkZSBvZiB0aGlzIHZlY3Rvci5cblx0ICogVGhpcyBmdW5jdGlvbiBhdm9pZHMgY2FsY3VsYXRpbmcgdGhlIHNxdWFyZSByb290LCB0aHVzIGJlaW5nIHNsaWdodGx5IGZhc3RlciB0aGFuIC5tYWduaXR1ZGUoICkuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtOdW1iZXJ9IG1hZ25pdHVkZVNxKCk7XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBzcXVhcmUgb2YgdGhlIG1hZ25pdHVkZSBvZiB0aGlzIHZlY3RvclxuXHQgKiBAc2VlIC5tYWduaXR1ZGVcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLm1hZ25pdHVkZVNxID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XG4gICAgfTsgLy8gbWFnbml0dWRlU3FcblxuXHQvKipAXG5cdCAqICMubXVsdGlwbHlcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuXHQgKlxuXHQgKiBNdWx0aXBsaWVzIHRoaXMgdmVjdG9yIGJ5IHRoZSBwYXNzZWQgdmVjdG9yXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gbXVsdGlwbHkoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIG11bHRpcGx5aW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5tdWx0aXBseSA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHRoaXMueCAqPSB2ZWNSSC54O1xuICAgICAgICB0aGlzLnkgKj0gdmVjUkgueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gbXVsdGlwbHlcblxuXHQvKipAXG5cdCAqICMubmVnYXRlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogTmVnYXRlcyB0aGlzIHZlY3RvciAoaWUuIDwteCwteT4pXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gbmVnYXRlKCk7XG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgbmVnYXRpb25cblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLm5lZ2F0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgICAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBuZWdhdGVcblxuXHQvKipAXG5cdCAqICMubm9ybWFsaXplXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcblx0ICpcblx0ICogTm9ybWFsaXplcyB0aGlzIHZlY3RvciAoc2NhbGVzIHRoZSB2ZWN0b3Igc28gdGhhdCBpdHMgbmV3IG1hZ25pdHVkZSBpcyAxKVxuXHQgKiBGb3IgdmVjdG9ycyB3aGVyZSBtYWduaXR1ZGUgaXMgMCwgPDEsMD4gaXMgcmV0dXJuZWQuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gbm9ybWFsaXplKCk7XG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyB2ZWN0b3IgYWZ0ZXIgbm9ybWFsaXphdGlvblxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBsbmcgPSBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcblxuICAgICAgICBpZiAobG5nID09PSAwKSB7XG4gICAgICAgICAgICAvLyBkZWZhdWx0IGR1ZSBFYXN0XG4gICAgICAgICAgICB0aGlzLnggPSAxO1xuICAgICAgICAgICAgdGhpcy55ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueCAvPSBsbmc7XG4gICAgICAgICAgICB0aGlzLnkgLz0gbG5nO1xuICAgICAgICB9IC8vIGVsc2VcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBub3JtYWxpemVcblxuXHQvKipAXG5cdCAqICMuc2NhbGVcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBTY2FsZXMgdGhpcyB2ZWN0b3IgYnkgdGhlIHBhc3NlZCBhbW91bnQocylcblx0ICogSWYgc2NhbGFyWSBpcyBvbWl0dGVkLCBzY2FsYXJYIGlzIHVzZWQgZm9yIGJvdGggYXhlc1xuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHNjYWxlKE51bWJlclssIE51bWJlcl0pO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gc2NhbGFyWFxuXHQgKiBAcGFyYW0ge051bWJlcn0gW3NjYWxhclldXG5cdCAqIEByZXR1cm5zIHtWZWN0b3IyRH0gdGhpcyBhZnRlciBzY2FsaW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxhclgsIHNjYWxhclkpIHtcbiAgICAgICAgaWYgKHNjYWxhclkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHNjYWxhclkgPSBzY2FsYXJYO1xuXG4gICAgICAgIHRoaXMueCAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLnkgKj0gc2NhbGFyWTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzY2FsZVxuXG5cdC8qKkBcblx0ICogIy5zY2FsZVRvTWFnbml0dWRlXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogU2NhbGVzIHRoaXMgdmVjdG9yIHN1Y2ggdGhhdCBpdHMgbmV3IG1hZ25pdHVkZSBpcyBlcXVhbCB0byB0aGUgcGFzc2VkIHZhbHVlLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHNjYWxlVG9NYWduaXR1ZGUoTnVtYmVyKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ9IG1hZ1xuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIHNjYWxpbmdcblx0ICovXG4gICAgVmVjdG9yMkQucHJvdG90eXBlLnNjYWxlVG9NYWduaXR1ZGUgPSBmdW5jdGlvbihtYWcpIHtcbiAgICAgICAgdmFyIGsgPSBtYWcgLyB0aGlzLm1hZ25pdHVkZSgpO1xuICAgICAgICB0aGlzLnggKj0gaztcbiAgICAgICAgdGhpcy55ICo9IGs7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHNjYWxlVG9NYWduaXR1ZGVcblxuXHQvKipAXG5cdCAqICMuc2V0VmFsdWVzXG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogU2V0cyB0aGUgdmFsdWVzIG9mIHRoaXMgdmVjdG9yIHVzaW5nIGEgcGFzc2VkIHZlY3RvciBvciBwYWlyIG9mIG51bWJlcnMuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gc2V0VmFsdWVzKFZlY3RvcjJEKTtcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gc2V0VmFsdWVzKE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ8VmVjdG9yMkR9IHhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHlcblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciBzZXR0aW5nIG9mIHZhbHVlc1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICBpZiAoeCBpbnN0YW5jZW9mIFZlY3RvcjJEKSB7XG4gICAgICAgICAgICB0aGlzLnggPSB4Lng7XG4gICAgICAgICAgICB0aGlzLnkgPSB4Lnk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnggPSB4O1xuICAgICAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgfSAvLyBlbHNlXG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc2V0VmFsdWVzXG5cblx0LyoqQFxuXHQgKiAjLnN1YnRyYWN0XG5cdCAqIEBjb21wIENyYWZ0eS5tYXRoLlZlY3RvcjJEXG4gICAgICpcblx0ICogU3VidHJhY3RzIHRoZSBwYXNzZWQgdmVjdG9yIGZyb20gdGhpcyB2ZWN0b3IuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gc3VidHJhY3QoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSFxuXHQgKiBAcmV0dXJucyB7dmVjdG9yMkR9IHRoaXMgdmVjdG9yIGFmdGVyIHN1YnRyYWN0aW5nXG5cdCAqL1xuICAgIFZlY3RvcjJELnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uKHZlY1JIKSB7XG4gICAgICAgIHRoaXMueCAtPSB2ZWNSSC54O1xuICAgICAgICB0aGlzLnkgLT0gdmVjUkgueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gc3VidHJhY3RcblxuXHQvKipAXG5cdCAqICMudG9TdHJpbmdcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgdmVjdG9yLlxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7U3RyaW5nfSB0b1N0cmluZygpO1xuXHQgKiBAcmV0dXJucyB7U3RyaW5nfVxuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFwiVmVjdG9yMkQoXCIgKyB0aGlzLnggKyBcIiwgXCIgKyB0aGlzLnkgKyBcIilcIjtcbiAgICB9OyAvLyB0b1N0cmluZ1xuXG5cdC8qKkBcblx0ICogIy50cmFuc2xhdGVcblx0ICogQGNvbXAgQ3JhZnR5Lm1hdGguVmVjdG9yMkRcbiAgICAgKlxuXHQgKiBUcmFuc2xhdGVzIChtb3ZlcykgdGhpcyB2ZWN0b3IgYnkgdGhlIHBhc3NlZCBhbW91bnRzLlxuXHQgKiBJZiBkeSBpcyBvbWl0dGVkLCBkeCBpcyB1c2VkIGZvciBib3RoIGF4ZXMuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gdHJhbnNsYXRlKE51bWJlclssIE51bWJlcl0pO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gZHhcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtkeV1cblx0ICogQHJldHVybnMge1ZlY3RvcjJEfSB0aGlzIHZlY3RvciBhZnRlciB0cmFuc2xhdGluZ1xuXHQgKi9cbiAgICBWZWN0b3IyRC5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIGlmIChkeSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZHkgPSBkeDtcblxuICAgICAgICB0aGlzLnggKz0gZHg7XG4gICAgICAgIHRoaXMueSArPSBkeTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyB0cmFuc2xhdGVcblxuXHQvKipAXG5cdCAqICMudHJpcGxlUHJvZHVjdFxuXHQgKiBAY29tcCBDcmFmdHkubWF0aC5WZWN0b3IyRFxuICAgICAqXG5cdCAqIENhbGN1bGF0ZXMgdGhlIHRyaXBsZSBwcm9kdWN0IG9mIHRocmVlIHZlY3RvcnMuXG5cdCAqIHRyaXBsZSB2ZWN0b3IgcHJvZHVjdCA9IGIoYeKAomMpIC0gYShi4oCiYylcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc3RhdGljXG5cdCAqIEBzaWduIHB1YmxpYyB7VmVjdG9yMkR9IHRyaXBsZVByb2R1Y3QoVmVjdG9yMkQsIFZlY3RvcjJELCBWZWN0b3IyRCk7XG5cdCAqIEBwYXJhbSB7VmVjdG9yMkR9IGFcblx0ICogQHBhcmFtIHtWZWN0b3IyRH0gYlxuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSBjXG5cdCAqIEByZXR1cm4ge1ZlY3RvcjJEfSB0aGUgdHJpcGxlIHByb2R1Y3QgYXMgYSBuZXcgdmVjdG9yXG5cdCAqL1xuXHRWZWN0b3IyRC50cmlwbGVQcm9kdWN0ID0gZnVuY3Rpb24gKGEsIGIsIGMpIHtcblx0XHR2YXIgYWMgPSBhLmRvdFByb2R1Y3QoYyk7XG5cdFx0dmFyIGJjID0gYi5kb3RQcm9kdWN0KGMpO1xuXHRcdHJldHVybiBuZXcgQ3JhZnR5Lm1hdGguVmVjdG9yMkQoYi54ICogYWMgLSBhLnggKiBiYywgYi55ICogYWMgLSBhLnkgKiBiYyk7XG5cdH07XG5cblx0cmV0dXJuIFZlY3RvcjJEO1xufSkoKTtcblxuQ3JhZnR5Lm1hdGguTWF0cml4MkQgPSAoZnVuY3Rpb24gKCkge1xuXHQvKipAXG5cdCAqICNDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKiBAY2F0ZWdvcnkgMkRcblx0ICpcblx0ICogQGNsYXNzIFRoaXMgaXMgYSAyRCBNYXRyaXgyRCBjbGFzcy4gSXQgaXMgM3gzIHRvIGFsbG93IGZvciBhZmZpbmUgdHJhbnNmb3JtYXRpb25zIGluIDJEIHNwYWNlLlxuXHQgKiBUaGUgdGhpcmQgcm93IGlzIGFsd2F5cyBhc3N1bWVkIHRvIGJlIFswLCAwLCAxXS5cblx0ICpcblx0ICogTWF0cml4MkQgdXNlcyB0aGUgZm9sbG93aW5nIGZvcm0sIGFzIHBlciB0aGUgd2hhdHdnLm9yZyBzcGVjaWZpY2F0aW9ucyBmb3IgY2FudmFzLnRyYW5zZm9ybSgpOlxuXHQgKiBbYSwgYywgZV1cblx0ICogW2IsIGQsIGZdXG5cdCAqIFswLCAwLCAxXVxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IG5ldyBNYXRyaXgyRCgpO1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBuZXcgTWF0cml4MkQoTWF0cml4MkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBuZXcgTWF0cml4MkQoTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TWF0cml4MkR8TnVtYmVyPTF9IGFcblx0ICogQHBhcmFtIHtOdW1iZXI9MH0gYlxuXHQgKiBAcGFyYW0ge051bWJlcj0wfSBjXG5cdCAqIEBwYXJhbSB7TnVtYmVyPTF9IGRcblx0ICogQHBhcmFtIHtOdW1iZXI9MH0gZVxuXHQgKiBAcGFyYW0ge051bWJlcj0wfSBmXG5cdCAqL1xuXHRNYXRyaXgyRCA9IGZ1bmN0aW9uIChhLCBiLCBjLCBkLCBlLCBmKSB7XG5cdFx0aWYgKGEgaW5zdGFuY2VvZiBNYXRyaXgyRCkge1xuXHRcdFx0dGhpcy5hID0gYS5hO1xuXHRcdFx0dGhpcy5iID0gYS5iO1xuXHRcdFx0dGhpcy5jID0gYS5jO1xuXHRcdFx0dGhpcy5kID0gYS5kO1xuXHRcdFx0dGhpcy5lID0gYS5lO1xuXHRcdFx0dGhpcy5mID0gYS5mO1xuXHRcdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gNikge1xuXHRcdFx0dGhpcy5hID0gYTtcblx0XHRcdHRoaXMuYiA9IGI7XG5cdFx0XHR0aGlzLmMgPSBjO1xuXHRcdFx0dGhpcy5kID0gZDtcblx0XHRcdHRoaXMuZSA9IGU7XG5cdFx0XHR0aGlzLmYgPSBmO1xuXHRcdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApXG5cdFx0XHR0aHJvdyBcIlVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgTWF0cml4MkQoKVwiO1xuXHR9IC8vIGNsYXNzIE1hdHJpeDJEXG5cblx0TWF0cml4MkQucHJvdG90eXBlLmEgPSAxO1xuXHRNYXRyaXgyRC5wcm90b3R5cGUuYiA9IDA7XG5cdE1hdHJpeDJELnByb3RvdHlwZS5jID0gMDtcblx0TWF0cml4MkQucHJvdG90eXBlLmQgPSAxO1xuXHRNYXRyaXgyRC5wcm90b3R5cGUuZSA9IDA7XG5cdE1hdHJpeDJELnByb3RvdHlwZS5mID0gMDtcblxuXHQvKipAXG5cdCAqICMuYXBwbHlcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIHRoZSBtYXRyaXggdHJhbnNmb3JtYXRpb25zIHRvIHRoZSBwYXNzZWQgb2JqZWN0XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtWZWN0b3IyRH0gYXBwbHkoVmVjdG9yMkQpO1xuXHQgKiBAcGFyYW0ge1ZlY3RvcjJEfSB2ZWNSSCAtIHZlY3RvciB0byBiZSB0cmFuc2Zvcm1lZFxuXHQgKiBAcmV0dXJucyB7VmVjdG9yMkR9IHRoZSBwYXNzZWQgdmVjdG9yIG9iamVjdCBhZnRlciB0cmFuc2Zvcm1pbmdcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24odmVjUkgpIHtcbiAgICAgICAgLy8gSSdtIG5vdCBzdXJlIG9mIHRoZSBiZXN0IHdheSBmb3IgdGhpcyBmdW5jdGlvbiB0byBiZSBpbXBsZW1lbnRlZC4gSWRlYWxseVxuICAgICAgICAvLyBzdXBwb3J0IGZvciBvdGhlciBvYmplY3RzIChyZWN0YW5nbGVzLCBwb2x5Z29ucywgZXRjKSBzaG91bGQgYmUgZWFzaWx5XG4gICAgICAgIC8vIGFkZGFibGUgaW4gdGhlIGZ1dHVyZS4gTWF5YmUgYSBmdW5jdGlvbiAoYXBwbHkpIGlzIG5vdCB0aGUgYmVzdCB3YXkgdG8gZG9cbiAgICAgICAgLy8gdGhpcy4uLj9cblxuICAgICAgICB2YXIgdG1wWCA9IHZlY1JILng7XG4gICAgICAgIHZlY1JILnggPSB0bXBYICogdGhpcy5hICsgdmVjUkgueSAqIHRoaXMuYyArIHRoaXMuZTtcbiAgICAgICAgdmVjUkgueSA9IHRtcFggKiB0aGlzLmIgKyB2ZWNSSC55ICogdGhpcy5kICsgdGhpcy5mO1xuICAgICAgICAvLyBubyBuZWVkIHRvIGhvbW9nZW5pemUgc2luY2UgdGhlIHRoaXJkIHJvdyBpcyBhbHdheXMgWzAsIDAsIDFdXG5cbiAgICAgICAgcmV0dXJuIHZlY1JIO1xuICAgIH07IC8vIGFwcGx5XG5cblx0LyoqQFxuXHQgKiAjLmNsb25lXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQ3JlYXRlcyBhbiBleGFjdCwgbnVtZXJpYyBjb3B5IG9mIHRoZSBjdXJyZW50IG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IGNsb25lKCk7XG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH1cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWF0cml4MkQodGhpcyk7XG4gICAgfTsgLy8gY2xvbmVcblxuXHQvKipAXG5cdCAqICMuY29tYmluZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIE11bHRpcGxpZXMgdGhpcyBtYXRyaXggd2l0aCBhbm90aGVyLCBvdmVycmlkaW5nIHRoZSB2YWx1ZXMgb2YgdGhpcyBtYXRyaXguXG5cdCAqIFRoZSBwYXNzZWQgbWF0cml4IGlzIGFzc3VtZWQgdG8gYmUgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBjb21iaW5lKE1hdHJpeDJEKTtcblx0ICogQHBhcmFtIHtNYXRyaXgyRH0gbXRyeFJIXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggYWZ0ZXIgY29tYmluYXRpb25cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbihtdHJ4UkgpIHtcbiAgICAgICAgdmFyIHRtcCA9IHRoaXMuYTtcbiAgICAgICAgdGhpcy5hID0gdG1wICogbXRyeFJILmEgKyB0aGlzLmIgKiBtdHJ4UkguYztcbiAgICAgICAgdGhpcy5iID0gdG1wICogbXRyeFJILmIgKyB0aGlzLmIgKiBtdHJ4UkguZDtcbiAgICAgICAgdG1wID0gdGhpcy5jO1xuICAgICAgICB0aGlzLmMgPSB0bXAgKiBtdHJ4UkguYSArIHRoaXMuZCAqIG10cnhSSC5jO1xuICAgICAgICB0aGlzLmQgPSB0bXAgKiBtdHJ4UkguYiArIHRoaXMuZCAqIG10cnhSSC5kO1xuICAgICAgICB0bXAgPSB0aGlzLmU7XG4gICAgICAgIHRoaXMuZSA9IHRtcCAqIG10cnhSSC5hICsgdGhpcy5mICogbXRyeFJILmMgKyBtdHJ4UkguZTtcbiAgICAgICAgdGhpcy5mID0gdG1wICogbXRyeFJILmIgKyB0aGlzLmYgKiBtdHJ4UkguZCArIG10cnhSSC5mO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBjb21iaW5lXG5cblx0LyoqQFxuXHQgKiAjLmVxdWFsc1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIENoZWNrcyBmb3IgdGhlIG51bWVyaWMgZXF1YWxpdHkgb2YgdGhpcyBtYXRyaXggdmVyc3VzIGFub3RoZXIuXG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtCb29sZWFufSBlcXVhbHMoTWF0cml4MkQpO1xuXHQgKiBAcGFyYW0ge01hdHJpeDJEfSBtdHJ4Ukhcblx0ICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgdGhlIHR3byBtYXRyaWNlcyBhcmUgbnVtZXJpY2FsbHkgZXF1YWxcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKG10cnhSSCkge1xuICAgICAgICByZXR1cm4gbXRyeFJIIGluc3RhbmNlb2YgTWF0cml4MkQgJiZcbiAgICAgICAgICAgIHRoaXMuYSA9PSBtdHJ4UkguYSAmJiB0aGlzLmIgPT0gbXRyeFJILmIgJiYgdGhpcy5jID09IG10cnhSSC5jICYmXG4gICAgICAgICAgICB0aGlzLmQgPT0gbXRyeFJILmQgJiYgdGhpcy5lID09IG10cnhSSC5lICYmIHRoaXMuZiA9PSBtdHJ4UkguZjtcbiAgICB9OyAvLyBlcXVhbHNcblxuXHQvKipAXG5cdCAqICMuZGV0ZXJtaW5hbnRcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBDYWxjdWxhdGVzIHRoZSBkZXRlcm1pbmFudCBvZiB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TnVtYmVyfSBkZXRlcm1pbmFudCgpO1xuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBkZXQodGhpcyBtYXRyaXgpXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5kZXRlcm1pbmFudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hICogdGhpcy5kIC0gdGhpcy5iICogdGhpcy5jO1xuICAgIH07IC8vIGRldGVybWluYW50XG5cblx0LyoqQFxuXHQgKiAjLmludmVydFxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEludmVydHMgdGhpcyBtYXRyaXggaWYgcG9zc2libGVcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBpbnZlcnQoKTtcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIGludmVydGVkIG1hdHJpeCBvciB0aGUgb3JpZ2luYWwgbWF0cml4IG9uIGZhaWx1cmVcblx0ICogQHNlZSAuaXNJbnZlcnRpYmxlXG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGRldCA9IHRoaXMuZGV0ZXJtaW5hbnQoKTtcblxuICAgICAgICAvLyBtYXRyaXggaXMgaW52ZXJ0aWJsZSBpZiBpdHMgZGV0ZXJtaW5hbnQgaXMgbm9uLXplcm9cbiAgICAgICAgaWYgKGRldCAhPT0gMCkge1xuICAgICAgICAgICAgdmFyIG9sZCA9IHtcbiAgICAgICAgICAgICAgICBhOiB0aGlzLmEsXG4gICAgICAgICAgICAgICAgYjogdGhpcy5iLFxuICAgICAgICAgICAgICAgIGM6IHRoaXMuYyxcbiAgICAgICAgICAgICAgICBkOiB0aGlzLmQsXG4gICAgICAgICAgICAgICAgZTogdGhpcy5lLFxuICAgICAgICAgICAgICAgIGY6IHRoaXMuZlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuYSA9IG9sZC5kIC8gZGV0O1xuICAgICAgICAgICAgdGhpcy5iID0gLW9sZC5iIC8gZGV0O1xuICAgICAgICAgICAgdGhpcy5jID0gLW9sZC5jIC8gZGV0O1xuICAgICAgICAgICAgdGhpcy5kID0gb2xkLmEgLyBkZXQ7XG4gICAgICAgICAgICB0aGlzLmUgPSAob2xkLmMgKiBvbGQuZiAtIG9sZC5lICogb2xkLmQpIC8gZGV0O1xuICAgICAgICAgICAgdGhpcy5mID0gKG9sZC5lICogb2xkLmIgLSBvbGQuYSAqIG9sZC5mKSAvIGRldDtcbiAgICAgICAgfSAvLyBpZlxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIGludmVydFxuXG5cdC8qKkBcblx0ICogIy5pc0lkZW50aXR5XG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogUmV0dXJucyB0cnVlIGlmIHRoaXMgbWF0cml4IGlzIHRoZSBpZGVudGl0eSBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge0Jvb2xlYW59IGlzSWRlbnRpdHkoKTtcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuICAgIE1hdHJpeDJELnByb3RvdHlwZS5pc0lkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmEgPT09IDEgJiYgdGhpcy5iID09PSAwICYmIHRoaXMuYyA9PT0gMCAmJiB0aGlzLmQgPT09IDEgJiYgdGhpcy5lID09PSAwICYmIHRoaXMuZiA9PT0gMDtcbiAgICB9OyAvLyBpc0lkZW50aXR5XG5cblx0LyoqQFxuXHQgKiAjLmlzSW52ZXJ0aWJsZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIERldGVybWluZXMgaXMgdGhpcyBtYXRyaXggaXMgaW52ZXJ0aWJsZS5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge0Jvb2xlYW59IGlzSW52ZXJ0aWJsZSgpO1xuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGlzIG1hdHJpeCBpcyBpbnZlcnRpYmxlXG5cdCAqIEBzZWUgLmludmVydFxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuaXNJbnZlcnRpYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRldGVybWluYW50KCkgIT09IDA7XG4gICAgfTsgLy8gaXNJbnZlcnRpYmxlXG5cblx0LyoqQFxuXHQgKiAjLnByZVJvdGF0ZVxuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIEFwcGxpZXMgYSBjb3VudGVyLWNsb2Nrd2lzZSBwcmUtcm90YXRpb24gdG8gdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBwcmVSb3RhdGUoTnVtYmVyKTtcblx0ICogQHBhcmFtIHtudW1iZXJ9IHJhZHMgLSBhbmdsZSB0byByb3RhdGUgaW4gcmFkaWFuc1xuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGFmdGVyIHByZS1yb3RhdGlvblxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUucHJlUm90YXRlID0gZnVuY3Rpb24ocmFkcykge1xuICAgICAgICB2YXIgbkNvcyA9IE1hdGguY29zKHJhZHMpO1xuICAgICAgICB2YXIgblNpbiA9IE1hdGguc2luKHJhZHMpO1xuXG4gICAgICAgIHZhciB0bXAgPSB0aGlzLmE7XG4gICAgICAgIHRoaXMuYSA9IG5Db3MgKiB0bXAgLSBuU2luICogdGhpcy5iO1xuICAgICAgICB0aGlzLmIgPSBuU2luICogdG1wICsgbkNvcyAqIHRoaXMuYjtcbiAgICAgICAgdG1wID0gdGhpcy5jO1xuICAgICAgICB0aGlzLmMgPSBuQ29zICogdG1wIC0gblNpbiAqIHRoaXMuZDtcbiAgICAgICAgdGhpcy5kID0gblNpbiAqIHRtcCArIG5Db3MgKiB0aGlzLmQ7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gcHJlUm90YXRlXG5cblx0LyoqQFxuXHQgKiAjLnByZVNjYWxlXG4gICAgICogQGNvbXAgQ3JhZnR5Lm1hdGguTWF0cml4MkRcblx0ICpcblx0ICogQXBwbGllcyBhIHByZS1zY2FsaW5nIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gcHJlU2NhbGUoTnVtYmVyWywgTnVtYmVyXSk7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBzY2FsYXJYXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbc2NhbGFyWV0gc2NhbGFyWCBpcyB1c2VkIGlmIHNjYWxhclkgaXMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBhZnRlciBwcmUtc2NhbGluZ1xuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUucHJlU2NhbGUgPSBmdW5jdGlvbihzY2FsYXJYLCBzY2FsYXJZKSB7XG4gICAgICAgIGlmIChzY2FsYXJZID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBzY2FsYXJZID0gc2NhbGFyWDtcblxuICAgICAgICB0aGlzLmEgKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy5iICo9IHNjYWxhclk7XG4gICAgICAgIHRoaXMuYyAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLmQgKj0gc2NhbGFyWTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBwcmVTY2FsZVxuXG5cdC8qKkBcblx0ICogIy5wcmVUcmFuc2xhdGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgcHJlLXRyYW5zbGF0aW9uIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gcHJlVHJhbnNsYXRlKFZlY3RvcjJEKTtcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gcHJlVHJhbnNsYXRlKE51bWJlciwgTnVtYmVyKTtcblx0ICogQHBhcmFtIHtOdW1iZXJ8VmVjdG9yMkR9IGR4XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkeVxuXHQgKiBAcmV0dXJucyB7TWF0cml4MkR9IHRoaXMgbWF0cml4IGFmdGVyIHByZS10cmFuc2xhdGlvblxuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUucHJlVHJhbnNsYXRlID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIGlmICh0eXBlb2YgZHggPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZSArPSBkeDtcbiAgICAgICAgICAgIHRoaXMuZiArPSBkeTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZSArPSBkeC54O1xuICAgICAgICAgICAgdGhpcy5mICs9IGR4Lnk7XG4gICAgICAgIH0gLy8gZWxzZVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHByZVRyYW5zbGF0ZVxuXG5cdC8qKkBcblx0ICogIy5yb3RhdGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgY291bnRlci1jbG9ja3dpc2UgcG9zdC1yb3RhdGlvbiB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHJvdGF0ZShOdW1iZXIpO1xuXHQgKiBAcGFyYW0ge051bWJlcn0gcmFkcyAtIGFuZ2xlIHRvIHJvdGF0ZSBpbiByYWRpYW5zXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggYWZ0ZXIgcm90YXRpb25cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uKHJhZHMpIHtcbiAgICAgICAgdmFyIG5Db3MgPSBNYXRoLmNvcyhyYWRzKTtcbiAgICAgICAgdmFyIG5TaW4gPSBNYXRoLnNpbihyYWRzKTtcblxuICAgICAgICB2YXIgdG1wID0gdGhpcy5hO1xuICAgICAgICB0aGlzLmEgPSBuQ29zICogdG1wIC0gblNpbiAqIHRoaXMuYjtcbiAgICAgICAgdGhpcy5iID0gblNpbiAqIHRtcCArIG5Db3MgKiB0aGlzLmI7XG4gICAgICAgIHRtcCA9IHRoaXMuYztcbiAgICAgICAgdGhpcy5jID0gbkNvcyAqIHRtcCAtIG5TaW4gKiB0aGlzLmQ7XG4gICAgICAgIHRoaXMuZCA9IG5TaW4gKiB0bXAgKyBuQ29zICogdGhpcy5kO1xuICAgICAgICB0bXAgPSB0aGlzLmU7XG4gICAgICAgIHRoaXMuZSA9IG5Db3MgKiB0bXAgLSBuU2luICogdGhpcy5mO1xuICAgICAgICB0aGlzLmYgPSBuU2luICogdG1wICsgbkNvcyAqIHRoaXMuZjtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyByb3RhdGVcblxuXHQvKipAXG5cdCAqICMuc2NhbGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgcG9zdC1zY2FsaW5nIHRvIHRoaXMgbWF0cml4XG5cdCAqXG5cdCAqIEBwdWJsaWNcblx0ICogQHNpZ24gcHVibGljIHtNYXRyaXgyRH0gc2NhbGUoTnVtYmVyWywgTnVtYmVyXSk7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBzY2FsYXJYXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbc2NhbGFyWV0gc2NhbGFyWCBpcyB1c2VkIGlmIHNjYWxhclkgaXMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBhZnRlciBwb3N0LXNjYWxpbmdcblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oc2NhbGFyWCwgc2NhbGFyWSkge1xuICAgICAgICBpZiAoc2NhbGFyWSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgc2NhbGFyWSA9IHNjYWxhclg7XG5cbiAgICAgICAgdGhpcy5hICo9IHNjYWxhclg7XG4gICAgICAgIHRoaXMuYiAqPSBzY2FsYXJZO1xuICAgICAgICB0aGlzLmMgKj0gc2NhbGFyWDtcbiAgICAgICAgdGhpcy5kICo9IHNjYWxhclk7XG4gICAgICAgIHRoaXMuZSAqPSBzY2FsYXJYO1xuICAgICAgICB0aGlzLmYgKj0gc2NhbGFyWTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyBzY2FsZVxuXG5cdC8qKkBcblx0ICogIy5zZXRWYWx1ZXNcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBTZXRzIHRoZSB2YWx1ZXMgb2YgdGhpcyBtYXRyaXhcblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBzZXRWYWx1ZXMoTWF0cml4MkQpO1xuXHQgKiBAc2lnbiBwdWJsaWMge01hdHJpeDJEfSBzZXRWYWx1ZXMoTnVtYmVyLCBOdW1iZXIsIE51bWJlciwgTnVtYmVyLCBOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TWF0cml4MkR8TnVtYmVyfSBhXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBiXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBmXG5cdCAqIEByZXR1cm5zIHtNYXRyaXgyRH0gdGhpcyBtYXRyaXggY29udGFpbmluZyB0aGUgbmV3IHZhbHVlc1xuXHQgKi9cbiAgICBNYXRyaXgyRC5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24oYSwgYiwgYywgZCwgZSwgZikge1xuICAgICAgICBpZiAoYSBpbnN0YW5jZW9mIE1hdHJpeDJEKSB7XG4gICAgICAgICAgICB0aGlzLmEgPSBhLmE7XG4gICAgICAgICAgICB0aGlzLmIgPSBhLmI7XG4gICAgICAgICAgICB0aGlzLmMgPSBhLmM7XG4gICAgICAgICAgICB0aGlzLmQgPSBhLmQ7XG4gICAgICAgICAgICB0aGlzLmUgPSBhLmU7XG4gICAgICAgICAgICB0aGlzLmYgPSBhLmY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmEgPSBhO1xuICAgICAgICAgICAgdGhpcy5iID0gYjtcbiAgICAgICAgICAgIHRoaXMuYyA9IGM7XG4gICAgICAgICAgICB0aGlzLmQgPSBkO1xuICAgICAgICAgICAgdGhpcy5lID0gZTtcbiAgICAgICAgICAgIHRoaXMuZiA9IGY7XG4gICAgICAgIH0gLy8gZWxzZVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07IC8vIHNldFZhbHVlc1xuXG5cdC8qKkBcblx0ICogIy50b1N0cmluZ1xuICAgICAqIEBjb21wIENyYWZ0eS5tYXRoLk1hdHJpeDJEXG5cdCAqXG5cdCAqIFJldHVybnMgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIG1hdHJpeC5cblx0ICpcblx0ICogQHB1YmxpY1xuXHQgKiBAc2lnbiBwdWJsaWMge1N0cmluZ30gdG9TdHJpbmcoKTtcblx0ICogQHJldHVybnMge1N0cmluZ31cblx0ICovXG4gICAgTWF0cml4MkQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBcIk1hdHJpeDJEKFtcIiArIHRoaXMuYSArIFwiLCBcIiArIHRoaXMuYyArIFwiLCBcIiArIHRoaXMuZSArXG4gICAgICAgICAgICBcIl0gW1wiICsgdGhpcy5iICsgXCIsIFwiICsgdGhpcy5kICsgXCIsIFwiICsgdGhpcy5mICsgXCJdIFswLCAwLCAxXSlcIjtcbiAgICB9OyAvLyB0b1N0cmluZ1xuXG5cdC8qKkBcblx0ICogIy50cmFuc2xhdGVcbiAgICAgKiBAY29tcCBDcmFmdHkubWF0aC5NYXRyaXgyRFxuXHQgKlxuXHQgKiBBcHBsaWVzIGEgcG9zdC10cmFuc2xhdGlvbiB0byB0aGlzIG1hdHJpeFxuXHQgKlxuXHQgKiBAcHVibGljXG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHRyYW5zbGF0ZShWZWN0b3IyRCk7XG5cdCAqIEBzaWduIHB1YmxpYyB7TWF0cml4MkR9IHRyYW5zbGF0ZShOdW1iZXIsIE51bWJlcik7XG5cdCAqIEBwYXJhbSB7TnVtYmVyfFZlY3RvcjJEfSBkeFxuXHQgKiBAcGFyYW0ge051bWJlcn0gZHlcblx0ICogQHJldHVybnMge01hdHJpeDJEfSB0aGlzIG1hdHJpeCBhZnRlciBwb3N0LXRyYW5zbGF0aW9uXG5cdCAqL1xuXHRNYXRyaXgyRC5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKGR4LCBkeSkge1xuXHRcdGlmICh0eXBlb2YgZHggPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdHRoaXMuZSArPSB0aGlzLmEgKiBkeCArIHRoaXMuYyAqIGR5O1xuXHRcdFx0dGhpcy5mICs9IHRoaXMuYiAqIGR4ICsgdGhpcy5kICogZHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZSArPSB0aGlzLmEgKiBkeC54ICsgdGhpcy5jICogZHgueTtcblx0XHRcdHRoaXMuZiArPSB0aGlzLmIgKiBkeC54ICsgdGhpcy5kICogZHgueTtcblx0XHR9IC8vIGVsc2VcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9IC8vIHRyYW5zbGF0ZVxuXG5cdHJldHVybiBNYXRyaXgyRDtcbn0pKCk7XG5cbi8qKkBcbiogI0NyYWZ0eSBUaW1lXG4qIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiovXG5DcmFmdHkuYyhcIkRlbGF5XCIsIHtcblx0aW5pdCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2RlbGF5cyA9IFtdO1xuXHRcdHRoaXMuYmluZChcIkVudGVyRnJhbWVcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRmb3IodmFyIGluZGV4IGluIHRoaXMuX2RlbGF5cykge1xuXHRcdFx0XHR2YXIgaXRlbSA9IHRoaXMuX2RlbGF5c1tpbmRleF07XG5cdFx0XHRcdGlmKCFpdGVtLnRyaWdnZXJlZCAmJiBpdGVtLnN0YXJ0ICsgaXRlbS5kZWxheSArIGl0ZW0ucGF1c2UgPCBub3cpIHtcblx0XHRcdFx0XHRpdGVtLnRyaWdnZXJlZD10cnVlO1xuXHRcdFx0XHRcdGl0ZW0uZnVuYy5jYWxsKHRoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5iaW5kKFwiUGF1c2VcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRmb3IodmFyIGluZGV4IGluIHRoaXMuX2RlbGF5cykge1xuXHRcdFx0XHR0aGlzLl9kZWxheXNbaW5kZXhdLnBhdXNlQnVmZmVyID0gbm93O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYmluZChcIlVucGF1c2VcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRmb3IodmFyIGluZGV4IGluIHRoaXMuX2RlbGF5cykge1xuXHRcdFx0XHR2YXIgaXRlbSA9IHRoaXMuX2RlbGF5c1tpbmRleF07XG5cdFx0XHRcdGl0ZW0ucGF1c2UgKz0gbm93LWl0ZW0ucGF1c2VCdWZmZXI7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG4gICAgLyoqQFxuXHQqICMuZGVsYXlcblx0KiBAY29tcCBDcmFmdHkgVGltZVxuXHQqIEBzaWduIHB1YmxpYyB0aGlzLmRlbGF5KEZ1bmN0aW9uIGNhbGxiYWNrLCBOdW1iZXIgZGVsYXkpXG5cdCogQHBhcmFtIGNhbGxiYWNrIC0gTWV0aG9kIHRvIGV4ZWN1dGUgYWZ0ZXIgZ2l2ZW4gYW1vdW50IG9mIG1pbGxpc2Vjb25kc1xuXHQqIEBwYXJhbSBkZWxheSAtIEFtb3VudCBvZiBtaWxsaXNlY29uZHMgdG8gZXhlY3V0ZSB0aGUgbWV0aG9kXG5cdCogXG5cdCogVGhlIGRlbGF5IG1ldGhvZCB3aWxsIGV4ZWN1dGUgYSBmdW5jdGlvbiBhZnRlciBhIGdpdmVuIGFtb3VudCBvZiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cblx0KiBcblx0KiBJdCBpcyBub3QgYSB3cmFwcGVyIGZvciBgc2V0VGltZW91dGAuXG5cdCogXG5cdCogSWYgQ3JhZnR5IGlzIHBhdXNlZCwgdGhlIGRlbGF5IGlzIGludGVycnVwdGVkIHdpdGggdGhlIHBhdXNlIGFuZCB0aGVuIHJlc3VtZSB3aGVuIHVucGF1c2VkXG5cdCpcblx0KiBJZiB0aGUgZW50aXR5IGlzIGRlc3Ryb3llZCwgdGhlIGRlbGF5IGlzIGFsc28gZGVzdHJveWVkIGFuZCB3aWxsIG5vdCBoYXZlIGVmZmVjdC4gXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIH5+flxuXHQqIGNvbnNvbGUubG9nKFwic3RhcnRcIik7XG5cdCogdGhpcy5kZWxheShmdW5jdGlvbigpIHtcblx0ICAgICBjb25zb2xlLmxvZyhcIjEwMG1zIGxhdGVyXCIpO1xuXHQqIH0sIDEwMCk7XG5cdCogfn5+XG5cdCovXG5cdGRlbGF5IDogZnVuY3Rpb24oZnVuYywgZGVsYXkpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGVsYXlzLnB1c2goe1xuXHRcdFx0c3RhcnQgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdGZ1bmMgOiBmdW5jLFxuXHRcdFx0ZGVsYXkgOiBkZWxheSxcblx0XHRcdHRyaWdnZXJlZCA6IGZhbHNlLFxuXHRcdFx0cGF1c2VCdWZmZXI6IDAsXG5cdFx0XHRwYXVzZTogMFxuXHRcdH0pO1xuXHR9XG59KTtcblxufSk7XG5cbn0pKCkiLCIgXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbmV4cG9ydHMuRlBTID0gZnVuY3Rpb24oIGVsLCBtYXhWYWx1ZSApXG57XG4gIHZhciBmcHMgPSBDcmFmdHkuZSggJzJELCBDYW52YXMsIEZQUycgKTtcbiAgZnBzLmF0dHIoIHsgbWF4VmFsdWU6IG1heFZhbHVlIH0gKVxuICBDcmFmdHkuYmluZCggJ01lc3N1cmVGUFMnLCBmdW5jdGlvbiggZnBzICkge1xuICAgIGVsLmlubmVySFRNTCA9IGZwcy52YWx1ZTtcbiAgfSApO1xufTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKSxcbiAgICBjbGllbnQgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xuXG5yZXF1aXJlKCcuL3F1ZXVlJyk7XG5cbkNyYWZ0eS5zY2VuZSgnTG9hZGluZycsIGZ1bmN0aW9uKCkge1xuICB2YXIgbW9kdWxlcyA9IHtcbiAgICAgIFNoYXBlOiAnUkVMRUFTRScsXG4gICAgICBNb3VzZUZhY2U6ICdSRUxFQVNFJ1xuICAgIH0sXG4gICAgaSA9IDQ7XG5cbiAgQ3JhZnR5Lm1vZHVsZXMobW9kdWxlcywgZG9uZSk7XG4gIENyYWZ0eS5sb2FkKFsnYXNzZXRzL3NoaXAucG5nJ10sIGRvbmUpO1xuICBDcmFmdHkubG9hZChbJ2Fzc2V0cy9hc3NhdWx0LnBuZyddLCBkb25lKTtcbiAgQ3JhZnR5LmxvYWQoWydhc3NldHMvZWFydGgucG5nJ10sIGRvbmUpO1xuICBjbGllbnQuY29ubmVjdChkb25lKTtcblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIGlmKC0taSA9PT0gMCkge1xuICAgICAgQ3JhZnR5LnNwcml0ZSgyNCwgJ2Fzc2V0cy9zaGlwLnBuZycsIHsgUGxheWVyU3ByaXRlOiBbIDAsIDAgXSB9ICk7XG4gICAgICBDcmFmdHkuc3ByaXRlKDEsICdhc3NldHMvYXNzYXVsdC5wbmcnLCB7IFNhdGVsbGl0ZVNwcml0ZTogWyAwLCAwLCAyNCwgMTkgXSB9ICk7XG4gICAgICBDcmFmdHkuc3ByaXRlKDEsICdhc3NldHMvZWFydGgucG5nJywgeyBFYXJ0aFNwcml0ZTogWyAwLCAwLCAxMjEsIDExOCBdIH0gKTtcbiAgICAgIENyYWZ0eS5zY2VuZSgnUXVldWUnKTtcbiAgICB9XG4gIH1cbn0pOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5DcmFmdHkuYygnQWN0b3InLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJELCBDYW52YXMsIFNvbGlkJyk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIGhlYWx0aDogMTAwXG4gICAgfSk7XG4gICAgdGhpcy5iaW5kKCdQcm9qZWN0aWxlSGl0JywgdGhpcy5fd2FzSGl0KTtcbiAgICB0aGlzLmJpbmQoJ0RpZScsIHRoaXMuZGllKTtcbiAgfSxcblxuICBkaWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGVzdHJveSgpO1xuICB9LFxuICBcbiAgc3RvcE9uU29saWQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub25IaXQoJ1NvbGlkJywgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN0b3BNb3ZlbWVudCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBcbiAgc3RvcE1vdmVtZW50OiBmdW5jdGlvbihsYXN0UG9zaXRpb24pIHtcbiAgICB0aGlzLl9zcGVlZCA9IDA7XG4gICAgaWYobGFzdFBvc2l0aW9uKSB7XG4gICAgICB0aGlzLnggPSBsYXN0UG9zaXRpb24ueDtcbiAgICAgIHRoaXMueSA9IGxhc3RQb3NpdGlvbi55O1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9tb3ZlbWVudCkge1xuICAgICAgdGhpcy54IC09IHRoaXMuX21vdmVtZW50Lng7XG4gICAgICB0aGlzLnkgLT0gdGhpcy5fbW92ZW1lbnQueTtcbiAgICB9XG4gIH0sXG5cbiAgX3dhc0hpdDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgbmV3SGVhbHRoID0gdGhpcy5oZWFsdGggLSBldmVudC5wcm9qZWN0aWxlLmRhbWFnZXM7XG4gICAgdGhpcy5hdHRyKCdoZWFsdGgnLCBuZXdIZWFsdGgpO1xuICAgIHRoaXMudHJpZ2dlcignV291bmQnLCB7IGhlYWx0aDogbmV3SGVhbHRoLCBkYW1hZ2VzOiBldmVudC5wcm9qZWN0aWxlLmRhbWFnZXMgfSk7XG4gICAgaWYoIG5ld0hlYWx0aCA8PSAwICkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdEaWUnKTtcbiAgICB9XG4gIH1cbn0gKTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxuQ3JhZnR5LmMoJ0hlYWx0aCcsIHtcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCcyRCwgQ2FudmFzLCBDb2xvcicpO1xuICAgIHRoaXMuY29sb3IoJ2dyZWVuJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgaGVhbHRoOiBmdW5jdGlvbihhY3Rvcikge1xuICAgIHRoaXMuYXR0cignaGVhbHRoV2lkdGgnLCBNYXRoLm1heCgoYWN0b3IucmFkaXVzKSA/IDIgKiBhY3Rvci5yYWRpdXMgOiBhY3Rvci53LCAzMCkpO1xuICAgIHRoaXMuYXR0cih7XG4gICAgICBtYXhIZWFsdGg6IGFjdG9yLmhlYWx0aCxcbiAgICAgIHc6IHRoaXMuaGVhbHRoV2lkdGgsXG4gICAgICBoOiA0LFxuICAgICAgeDogYWN0b3IueCxcbiAgICAgIHk6IGFjdG9yLnkgLSAyMFxuICAgIH0pO1xuICAgIGFjdG9yLmJpbmQoJ0NoYW5nZScsIHRoaXMuX3VwZGF0ZUhlYWx0aC5iaW5kKHRoaXMpKTtcbiAgICBhY3Rvci5iaW5kKCdNb3ZlZCcsIHRoaXMuX3VwZGF0ZUhlYWx0aC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl91cGRhdGVIZWFsdGgoe2hlYWx0aDogYWN0b3IuaGVhbHRoLCB4OiBhY3Rvci54LCB5OiBhY3Rvci55fSk7XG4gIH0sXG5cbiAgX3VwZGF0ZUhlYWx0aDogZnVuY3Rpb24ocHJvcHMpIHtcbiAgICBpZighcHJvcHMpIHJldHVybjtcbiAgICBpZignaGVhbHRoJyBpbiBwcm9wcykge1xuICAgICAgdGhpcy5hdHRyKCd3JywgTWF0aC5mbG9vcigocHJvcHMuaGVhbHRoIC8gdGhpcy5tYXhIZWFsdGgpICogdGhpcy5oZWFsdGhXaWR0aCkpO1xuICAgIH1cbiAgICBpZigneCcgaW4gcHJvcHMpIHtcbiAgICAgIHRoaXMuYXR0cigneCcsIHByb3BzLngpO1xuICAgIH1cbiAgICBpZigneScgaW4gcHJvcHMpIHtcbiAgICAgIHRoaXMuYXR0cigneScsIHByb3BzLnkgLSAyMCk7XG4gICAgfVxuICB9XG5cbn0pOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCAnLi9zaGlwJyApO1xucmVxdWlyZSggJy4vYm91bmRlZCcgKTtcbnJlcXVpcmUoICcuL21vdXNlc2hvb3RlcicgKTtcblxuQ3JhZnR5LmMoJ1BsYXllclNoaXAnLCB7XG4gIG5hbWU6ICdQbGF5ZXJTaGlwJyxcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnU2hpcCwgQm91bmRlZCwgTW91c2VTaG9vdGVyLCBGb3Vyd2F5LCBNb3VzZUZhY2UnKTtcbiAgICB0aGlzLmZvdXJ3YXkoNCk7XG4gICAgdGhpcy5zdG9wT25Tb2xpZCgpO1xuICAgIHRoaXMuTW91c2VGYWNlKHt4OiAwLCB5OiAwfSk7XG5cbiAgICB0aGlzLmJpbmQoJ01vdXNlTW92ZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICB0aGlzLm9yaWdpbignY2VudGVyJyk7XG4gICAgICB0aGlzLmN1ckFuZ2xlID0gZS5ncmFkICsgOTA7XG4gICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5jdXJBbmdsZTtcbiAgICB9KTtcblxuICAgIHRoaXMuYmluZCgnU3RhcnRTaG9vdGluZycsIHRoaXMuX3Nob290KTtcbiAgICB0aGlzLmJpbmQoJ0hpdEJvdW5kcycsIHRoaXMuc3RvcE1vdmVtZW50KTtcbiAgICB0aGlzLmJpbmQoJ0RpZScsIGZ1bmN0aW9uKCkge1xuICAgICAgQ3JhZnR5LnRyaWdnZXIoJ0Rlc3Ryb3lTaGlwJyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZ286IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2VuZFVwZGF0ZSgpO1xuICB9LFxuXG4gIHNlbmRVcGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIENyYWZ0eS50cmlnZ2VyKCdVcGRhdGVTaGlwJywgdGhpcy5zZXJpYWxpemUoKSk7XG4gICAgICB0aGlzLnNlbmRVcGRhdGUoKTtcbiAgICB9LCAxMCk7XG4gIH1cblxufSApO1xuIiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbkNyYWZ0eS5jKCdQbGFuZXQnLCB7XG4gIG5hbWU6ICdQbGFuZXQnLFxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdBY3RvciwgU29saWQsIENvbGxpc2lvbiwgRWFydGhTcHJpdGUnKTtcbiAgICB0aGlzLm9yaWdpbignY2VudGVyJyk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIHc6IDEyMSxcbiAgICAgIGg6IDExOSxcbiAgICAgIGhlYWx0aDogMjAwXG4gICAgfSk7XG4gIH0sXG59ICk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9wcm9qZWN0aWxlJyk7XG5cbkNyYWZ0eS5jKCdTYXRlbGxpdGUnLCB7XG4gIG5hbWU6ICdTYXRlbGxpdGUnLFxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdBY3RvciwgU29saWQsIFByb2plY3RpbGUsIFNhdGVsbGl0ZVNwcml0ZScpO1xuICAgIHRoaXMuYmluZCgnSW5Cb3VuZHMnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ29tcG9uZW50KCdPZmZzY3JlZW4nKTtcbiAgICAgIHRoaXMuYWRkQ29tcG9uZW50KCdCb3VuZGVkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5iaW5kKCdIaXRCb3VuZHMnLCB0aGlzLmRlc3Ryb3kpO1xuICAgIHRoaXMuYmluZCgnSGl0T2JqZWN0JywgdGhpcy5kZXN0cm95KTtcbiAgICB0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCB0aGlzLl9zYXRFbnRlckZyYW1lKVxuICAgIHRoaXMuYXR0cih7XG4gICAgICBoZWFsdGg6IDIsXG4gICAgICBkYW1hZ2VzOiAxMCxcbiAgICAgIHNwZWVkOiAzXG4gICAgfSk7XG4gIH0sXG4gIFxuICBnbzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50YXJnZXQoQ3JhZnR5KCdQbGFuZXQnKSk7XG4gIH0sXG5cbiAgX3NhdEVudGVyRnJhbWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucm90YXRpb24gKz0gMS41O1xuICB9XG59ICk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKSxcbiAgICBjb25uZWN0ID0gcmVxdWlyZSgnLi9zb2NrZXQnKSxcbiAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxucmVxdWlyZSgnLi9uZXRzaGlwJyk7XG5yZXF1aXJlKCcuL3NhdGVsbGl0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaWQ6IG51bGwsXG4gIHNvY2tldDogbnVsbCxcblxuICBjb25uZWN0OiBmdW5jdGlvbihjYikge1xuICAgIGNvbm5lY3QoKGZ1bmN0aW9uKHdzKSB7XG4gICAgICB0aGlzLnNvY2tldCA9IHdzO1xuICAgICAgd3Mub25tZXNzYWdlID0gdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgY2IgJiYgY2Iod3MpO1xuICAgIH0pLmJpbmQodGhpcykpO1xuICB9LFxuXG4gIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xuICAgIENyYWZ0eS5iaW5kKCdSZWFkeScsIHRoaXMuY2FsbE1ldGhvZCgncmVhZHknKSk7XG4gICAgQ3JhZnR5LmJpbmQoJ0dhbWVPdmVyJywgdGhpcy5jYWxsTWV0aG9kKCdnYW1lT3ZlcicpKTtcbiAgICBDcmFmdHkuYmluZCgnVXBkYXRlU2hpcCcsIGZ1bmN0aW9uKHNoaXApIHtcbiAgICAgIHRoaXMuY2FsbE1ldGhvZCgndXBkYXRlU2hpcCcsIHNoaXApKCk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICBDcmFmdHkuYmluZCgnRGVzdHJveVNoaXAnLCB0aGlzLmNhbGxNZXRob2QoJ2Rlc3Ryb3lTaGlwJykpO1xuICB9LFxuXG4gIGNhbGxNZXRob2Q6IGZ1bmN0aW9uKG1ldGhvZCAvKiwgcGFyYW1zLi4uICovKSB7XG4gICAgdmFyIHBhcmFtcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgfSkpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgfSxcblxuICBvbk1lc3NhZ2U6IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcbiAgICBpZighZGF0YSB8fCAhZGF0YS5tZXRob2QgfHzCoCF0aGlzW2RhdGEubWV0aG9kXSkge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IGNhbm5vdCBjYWxsIG1ldGhvZDogJywgZGF0YSAmJiBkYXRhLm1ldGhvZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXNbZGF0YS5tZXRob2RdLmFwcGx5KHRoaXMsZGF0YS5wYXJhbXMpO1xuICB9LFxuXG4gIHNldElEOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfSxcblxuICBzaGlwczoge30sXG5cbiAgdXBkYXRlU2hpcDogZnVuY3Rpb24oaWQsIGF0dHIpIHtcbiAgICBpZihpZCA9PT0gdGhpcy5pZCkgcmV0dXJuO1xuICAgIGlmKCF0aGlzLnNoaXBzW2lkXSkge1xuICAgICAgdGhpcy5zaGlwc1tpZF0gPSBDcmFmdHkuZSgnTmV0U2hpcCcpO1xuICAgIH1cbiAgICB0aGlzLnNoaXBzW2lkXS5hdHRyKGF0dHIpO1xuICB9LFxuXG4gIGRlc3Ryb3lTaGlwOiBmdW5jdGlvbihpZCkge1xuICAgIGlmKGlkID09PSB0aGlzLmlkKSByZXR1cm47XG4gICAgdGhpcy5zaGlwc1tpZF0gJiYgdGhpcy5zaGlwc1tpZF0uZGVzdHJveSgpO1xuICAgIGRlbGV0ZSB0aGlzLnNoaXBzW2lkXTtcbiAgfSxcblxuICBzcGF3bjogZnVuY3Rpb24odHlwZSwgYXR0cikge1xuICAgIHZhciBvYmogPSBDcmFmdHkuZSh0eXBlKTtcbiAgICBvYmouYXR0cihhdHRyIHx8wqB7fSk7XG4gICAgaWYgKHR5cGVvZiBvYmouZ28gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2JqLmdvKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgcGxheTogZnVuY3Rpb24oKSB7XG4gICAgQ3JhZnR5LnNjZW5lKCdHYW1lJyk7XG4gIH1cbn07XG5cbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5DcmFmdHkuc2NlbmUoJ1F1ZXVlJywgZnVuY3Rpb24oKSB7XG4gIENyYWZ0eS5lKCcyRCwgRE9NLCBUZXh0JylcbiAgICAuYXR0cih7eDogQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMiAtIDE2MCwgeTogQ3JhZnR5LnZpZXdwb3J0LmhlaWdodCAvIDIgLSAxMCwgdzogMzIwLCBoOiAyMH0pXG4gICAgLnRleHQoJ1ByZXNzIHNwYWNlIHdoZW4geW91XFwncmUgcmVhZHkuLi4nKVxuICAgIC5iaW5kKCdLZXlEb3duJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYoZS5rZXkgIT09IENyYWZ0eS5rZXlzLlNQQUNFKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMudGV4dCgnV2FpdGluZyBmb3Igb3RoZXJzLi4uJyk7XG4gICAgICBDcmFmdHkudHJpZ2dlcignUmVhZHknKTtcbiAgICB9KTtcbn0pOyIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCAnLi9ib3VuZGVkJyApO1xuXG5DcmFmdHkuYygnU2hpcCcsIHtcbiAgbmFtZTogJ1NoaXAnLFxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdBY3RvciwgU2hvb3RlciwgQ29sbGlzaW9uLCBQbGF5ZXJTcHJpdGUnKTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgdzogMjQsXG4gICAgICBoOiAyNCxcbiAgICAgIHg6IDEwMCxcbiAgICAgIHk6IDEwMCxcbiAgICAgIGRhbWFnZXM6IDEwLFxuICAgICAgY3VyQW5nbGU6IDBcbiAgICB9KTtcblxuICAgIHRoaXMuYmluZCgnQ2hhbmdlJywgZnVuY3Rpb24ocHJvcHMpIHtcbiAgICAgIGlmKHByb3BzLmlzU2hvb3RpbmcpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdTdGFydFNob290aW5nJyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fc2hvb3QoKTtcbiAgICB0aGlzLmJpbmQoJ0hpdEJvdW5kcycsIHRoaXMuc3RvcE1vdmVtZW50KTtcbiAgfSxcblxuICBzZXJpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB4OiB0aGlzLngsXG4gICAgICB5OiB0aGlzLnksXG4gICAgICByb3RhdGlvbjogdGhpcy5yb3RhdGlvbixcbiAgICAgIF9kaXJBbmdsZTogdGhpcy5fZGlyQW5nbGUsXG4gICAgICBoZWFsdGg6IHRoaXMuaGVhbHRoLFxuICAgICAgaXNTaG9vdGluZzogdGhpcy5pc1Nob290aW5nLFxuICAgICAgb3JpZ2luOiB0aGlzLm9yaWdpblxuICAgIH07XG4gIH0sXG5cbiAgX3Nob290OiBmdW5jdGlvbigpXG4gIHtcbiAgICB0aGlzLnRpbWVvdXQodGhpcy5fc2hvb3QsIDEyMCk7XG4gICAgaWYoIXRoaXMuaXNTaG9vdGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNob290KHRoaXMuX2RpckFuZ2xlICsgTWF0aC5QSSwgNSk7XG4gIH1cbn0gKTtcbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5DcmFmdHkuYygnQm91bmRlZCcsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnMkQsIENhbnZhcycpO1xuICAgIHRoaXMuX2xhc3RJbkJvdW5kc1Bvc2l0aW9uID0gbnVsbDtcbiAgICB0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmKHRoaXMuaXNPdXRPZkJvdW5kcygpKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignSGl0Qm91bmRzJywgdGhpcy5fbGFzdEluQm91bmRzUG9zaXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbGFzdEluQm91bmRzUG9zaXRpb24gPSB7XG4gICAgICAgICAgeDogdGhpcy54LFxuICAgICAgICAgIHk6IHRoaXMueVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBpc091dE9mQm91bmRzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy54ICsgdGhpcy53ID4gQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMiB8fFxuICAgICAgICAgICB0aGlzLnggLSAxMCA8IC1DcmFmdHkudmlld3BvcnQud2lkdGggLyAyIHx8XG4gICAgICAgICAgIHRoaXMueSArIHRoaXMuaCA+IENyYWZ0eS52aWV3cG9ydC5oZWlnaHQgLyAyIHx8XG4gICAgICAgICAgIHRoaXMueSAtIDEwIDwgLUNyYWZ0eS52aWV3cG9ydC5oZWlnaHQgLyAyO1xuICB9XG59ICk7IiwiXG52YXIgQ3JhZnR5ID0gcmVxdWlyZSgnLi9saWIvY3JhZnR5Jyk7XG5cbnJlcXVpcmUoJy4vc2hvb3RlcicpO1xuXG5DcmFmdHkuYygnTW91c2VTaG9vdGVyJywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCdTaG9vdGVyJyk7XG4gICAgdGhpcy5iaW5kKCdNb3VzZURvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYXR0cignaXNTaG9vdGluZycsIHRydWUpO1xuICAgICAgdGhpcy50cmlnZ2VyKCdTdGFydFNob290aW5nJyk7XG4gICAgfSk7XG4gICAgdGhpcy5iaW5kKCdNb3VzZVVwJywgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmF0dHIoJ2lzU2hvb3RpbmcnLCBmYWxzZSk7XG4gICAgICB0aGlzLnRyaWdnZXIoJ1N0b3BTaG9vdGluZycpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCcuL29mZnNjcmVlbicpO1xuXG5DcmFmdHkuYygnUHJvamVjdGlsZScsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnMkQsIENhbnZhcywgT2Zmc2NyZWVuLCBDb2xsaXNpb24nKTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgdzogMjAsXG4gICAgICBoOiAyMCxcbiAgICAgIHNwZWVkOiAzLFxuICAgICAgZGFtYWdlczogMTBcbiAgICB9KTtcbiAgICB0aGlzLmJpbmQoJ0VudGVyRnJhbWUnLCB0aGlzLl9lbnRlcmVkRnJhbWUpO1xuICAgIHRoaXMub25IaXQoJ1NvbGlkJywgdGhpcy5faGl0T2JqZWN0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBwcm9qZWN0aWxlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYob3B0aW9ucy5hdHRyKSB7XG4gICAgICB0aGlzLmF0dHIob3B0aW9ucy5hdHRyKTtcbiAgICB9XG4gICAgaWYob3B0aW9ucy5jb2xvcikge1xuICAgICAgdGhpcy5jb2xvcihvcHRpb25zLmNvbG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgdGFyZ2V0OiBmdW5jdGlvbihlbnRpdHkpIHtcbiAgICAgIHZhciBwb3MgPSBuZXcgQ3JhZnR5Lm1hdGguVmVjdG9yMkQodGhpcy54LCB0aGlzLnkpLFxuICAgICAgICAgIHRhcmdldCA9IG5ldyBDcmFmdHkubWF0aC5WZWN0b3IyRChlbnRpdHkueCwgZW50aXR5LnkpLFxuICAgICAgICAgIGFuZ2xlID0gcG9zLmFuZ2xlVG8odGFyZ2V0KTtcbiAgICAgIHRoaXMuYXR0cignYW5nbGUnLCBhbmdsZSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBfZW50ZXJlZEZyYW1lOiBmdW5jdGlvbihmcmFtZSkge1xuICAgIHRoaXMueCArPSBNYXRoLmNvcyh0aGlzLmFuZ2xlKSAqIHRoaXMuc3BlZWQ7XG4gICAgdGhpcy55ICs9IE1hdGguc2luKHRoaXMuYW5nbGUpICogdGhpcy5zcGVlZDtcbiAgfSxcblxuICBfaGl0T2JqZWN0OiBmdW5jdGlvbihldmVudHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYoIWV2ZW50cy5sZW5ndGgpIHJldHVybjtcbiAgICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuICAgICAgZXZlbnQub2JqLnRyaWdnZXIoJ1Byb2plY3RpbGVIaXQnLCB7IHByb2plY3RpbGU6IHNlbGYgfSk7XG4gICAgICBzZWxmLnRyaWdnZXIoJ0hpdE9iamVjdCcsIHsgb2JqZWN0OiBldmVudC5vYmogfSk7XG4gICAgfSk7XG4gIH0sXG59ICk7XG4iLCJcbnZhciBzb2NrZXRTdGF0ZSA9IHtcbiAgc29ja2V0OiBudWxsLFxuICBvcGVuZWQ6IGZhbHNlLFxuICBjb25uZWN0OiBmdW5jdGlvbihjYikge1xuICAgIGlmKCF0aGlzLm9wZW5lZCkge1xuICAgICAgdGhpcy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgKyAnOjgwODAnKTtcbiAgICAgIHRoaXMuc29ja2V0Lm9ub3BlbiA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5vcGVuZWQgPSB0cnVlO1xuICAgICAgICBjYiAmJiBjYih0aGlzLnNvY2tldCk7XG4gICAgICB9KS5iaW5kKHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zb2NrZXQ7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc29ja2V0U3RhdGUuY29ubmVjdC5iaW5kKHNvY2tldFN0YXRlKTtcbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpO1xuXG5yZXF1aXJlKCcuL3NoaXAnKTtcblxuQ3JhZnR5LmMoJ05ldFNoaXAnLCB7XG4gIG5hbWU6ICdOZXRTaGlwJyxcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXF1aXJlcygnU2hpcCwgQm91bmRlZCcpO1xuICB9XG59ICk7XG4iLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9idWxsZXQnKTtcblxuQ3JhZnR5LmMoJ1Nob290ZXInLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJzJEJyk7XG4gICAgdGhpcy5hdHRyKHtcbiAgICAgIGlzU2hvb3Rpbmc6IGZhbHNlXG4gICAgfSlcbiAgfSxcblxuICBzaG9vdDogZnVuY3Rpb24oYW5nbGUsIHNwZWVkKSB7XG4gICAgQ3JhZnR5LmUoJ0J1bGxldCcpLmJ1bGxldCh7XG4gICAgICBhdHRyOiB7XG4gICAgICAgIHg6IHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIE1hdGgubWF4KHRoaXMudywgdGhpcy5oKSxcbiAgICAgICAgeTogdGhpcy55ICsgTWF0aC5zaW4oYW5nbGUpICogTWF0aC5tYXgodGhpcy53LCB0aGlzLmgpLFxuICAgICAgICBhbmdsZTogYW5nbGUsXG4gICAgICAgIHNwZWVkOiBzcGVlZCB8fMKgNVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59KTtcbiIsIlxudmFyIENyYWZ0eSA9IHJlcXVpcmUoJy4vbGliL2NyYWZ0eScpLFxuICAgIHNoYXJlZCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZCcpO1xuXG5DcmFmdHkuYygnT2Zmc2NyZWVuJywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlcXVpcmVzKCcyRCwgQ2FudmFzJyk7XG4gICAgdGhpcy5iaW5kKCdNb3ZlZCcsIGZ1bmN0aW9uKGZyb20pIHtcbiAgICAgIGlmKHRoaXMuaXNJbkJvdW5kcygpKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignSW5Cb3VuZHMnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBvZmZzY3JlZW46IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwb3MgPSB0aGlzLnJhbmRvbU9mZnNjcmVlbkNvb3JkaW5hdGVzKCk7XG4gICAgdGhpcy54ID0gcG9zLng7XG4gICAgdGhpcy55ID0gcG9zLnk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgaXNJbkJvdW5kczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueCArIHRoaXMudyA8IENyYWZ0eS52aWV3cG9ydC53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgdGhpcy54IC0gMTAgPiAtQ3JhZnR5LnZpZXdwb3J0LndpZHRoIC8gMiB8fFxuICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmggPCBDcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMiB8fFxuICAgICAgICAgICB0aGlzLnkgLSAxMCA+IC1DcmFmdHkudmlld3BvcnQuaGVpZ2h0IC8gMjtcbiAgfSxcblxuICByYW5kb21PZmZzY3JlZW5Db29yZGluYXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNoYXJlZC5yYW5kb21PZmZzY3JlZW5Db29yZGluYXRlcyhDcmFmdHkudmlld3BvcnQsIHRoaXMpO1xuICB9XG59ICk7XG4iLCJcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIHJhbmRvbU9mZnNjcmVlbkNvb3JkaW5hdGVzOiBmdW5jdGlvbih2aWV3cG9ydCwgc2l6ZSkge1xuICAgIHZhciBhbmdsZSA9IE1hdGgucmFuZG9tKCkgKiAyICogTWF0aC5QSSxcbiAgICAgICAgcmFkaXVzID0gTWF0aC5tYXgodmlld3BvcnQud2lkdGggLyAyLCB2aWV3cG9ydC5oZWlnaHQgLyAyKVxuICAgICAgICAgICAgICAgKyBNYXRoLm1heChzaXplLncsIHNpemUuaCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSxcbiAgICAgIHk6IHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKVxuICAgIH07XG4gIH1cblxufTsiLCJcbnZhciBDcmFmdHkgPSByZXF1aXJlKCcuL2xpYi9jcmFmdHknKTtcblxucmVxdWlyZSgnLi9ib3VuZGVkJyk7XG5cbkNyYWZ0eS5jKCdCdWxsZXQnLCB7XG5cbiAgYnVsbGV0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYob3B0aW9ucy5hdHRyKSB7XG4gICAgICB0aGlzLmF0dHIob3B0aW9ucy5hdHRyKTtcbiAgICB9XG4gICAgaWYob3B0aW9ucy5lbWl0dGVyKSB7XG4gICAgICB0aGlzLmVtaXR0ZXIgPSBvcHRpb25zLmVtaXR0ZXI7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuY29sb3IpIHtcbiAgICAgIHRoaXMuY29sb3Iob3B0aW9ucy5jb2xvcik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVxdWlyZXMoJ1Byb2plY3RpbGUsIENvbG9yJyk7XG4gICAgdGhpcy5jb2xvcignIzZGQjJGRicpO1xuICAgIHRoaXMuYmluZCgnRW50ZXJGcmFtZScsIHRoaXMuX2VudGVyZWRGcmFtZSk7XG4gICAgdGhpcy5iaW5kKCdIaXRCb3VuZHMnLCB0aGlzLmRlc3Ryb3kpO1xuICAgIHRoaXMuYmluZCgnSGl0T2JqZWN0JywgdGhpcy5kZXN0cm95KTtcbiAgICB0aGlzLmF0dHIoe1xuICAgICAgdzogMyxcbiAgICAgIGg6IDMsXG4gICAgICBzcGVlZDogNSxcbiAgICAgIGRhbWFnZXM6IDFcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG59KTsiXX0=
;