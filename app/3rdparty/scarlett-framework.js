/**
* matter-js 0.10.0 by @liabru 2016-05-01
* http://brm.io/matter-js/
* License MIT
*/

/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Liam Brummitt
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Matter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
* The `Matter.Body` module contains methods for creating and manipulating body models.
* A `Matter.Body` is a rigid body that can be simulated by a `Matter.Engine`.
* Factories for commonly used body configurations (such as rectangles, circles and other polygons) can be found in the module `Matter.Bodies`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).

* @class Body
*/

var Body = {};

module.exports = Body;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Sleeping = require('../core/Sleeping');
var Render = require('../render/Render');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');
var Axes = require('../geometry/Axes');

(function() {

    Body._inertiaScale = 4;
    Body._nextCollidingGroupId = 1;
    Body._nextNonCollidingGroupId = -1;
    Body._nextCategory = 0x0001;

    /**
     * Creates a new rigid body model. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} options
     * @return {body} body
     */
    Body.create = function(options) {
        var defaults = {
            id: Common.nextId(),
            type: 'body',
            label: 'Body',
            parts: [],
            angle: 0,
            vertices: Vertices.fromPath('L 0 0 L 40 0 L 40 40 L 0 40'),
            position: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            torque: 0,
            positionImpulse: { x: 0, y: 0 },
            constraintImpulse: { x: 0, y: 0, angle: 0 },
            totalContacts: 0,
            speed: 0,
            angularSpeed: 0,
            velocity: { x: 0, y: 0 },
            angularVelocity: 0,
            isSensor: false,
            isStatic: false,
            isSleeping: false,
            motion: 0,
            sleepThreshold: 60,
            density: 0.001,
            restitution: 0,
            friction: 0.1,
            frictionStatic: 0.5,
            frictionAir: 0.01,
            collisionFilter: {
                category: 0x0001,
                mask: 0xFFFFFFFF,
                group: 0
            },
            slop: 0.05,
            timeScale: 1,
            render: {
                visible: true,
                opacity: 1,
                sprite: {
                    xScale: 1,
                    yScale: 1,
                    xOffset: 0,
                    yOffset: 0
                },
                lineWidth: 1.5
            }
        };

        var body = Common.extend(defaults, options);

        _initProperties(body, options);

        return body;
    };

    /**
     * Returns the next unique group index for which bodies will collide.
     * If `isNonColliding` is `true`, returns the next unique group index for which bodies will _not_ collide.
     * See `body.collisionFilter` for more information.
     * @method nextGroup
     * @param {bool} [isNonColliding=false]
     * @return {Number} Unique group index
     */
    Body.nextGroup = function(isNonColliding) {
        if (isNonColliding)
            return Body._nextNonCollidingGroupId--;

        return Body._nextCollidingGroupId++;
    };

    /**
     * Returns the next unique category bitfield (starting after the initial default category `0x0001`).
     * There are 32 available. See `body.collisionFilter` for more information.
     * @method nextCategory
     * @return {Number} Unique category bitfield
     */
    Body.nextCategory = function() {
        Body._nextCategory = Body._nextCategory << 1;
        return Body._nextCategory;
    };

    /**
     * Initialises body properties.
     * @method _initProperties
     * @private
     * @param {body} body
     * @param {} options
     */
    var _initProperties = function(body, options) {
        // init required properties (order is important)
        Body.set(body, {
            bounds: body.bounds || Bounds.create(body.vertices),
            positionPrev: body.positionPrev || Vector.clone(body.position),
            anglePrev: body.anglePrev || body.angle,
            vertices: body.vertices,
            parts: body.parts || [body],
            isStatic: body.isStatic,
            isSleeping: body.isSleeping,
            parent: body.parent || body
        });

        Vertices.rotate(body.vertices, body.angle, body.position);
        Axes.rotate(body.axes, body.angle);
        Bounds.update(body.bounds, body.vertices, body.velocity);

        // allow options to override the automatically calculated properties
        Body.set(body, {
            axes: options.axes || body.axes,
            area: options.area || body.area,
            mass: options.mass || body.mass,
            inertia: options.inertia || body.inertia
        });

        // render properties
        var defaultFillStyle = (body.isStatic ? '#eeeeee' : Common.choose(['#556270', '#4ECDC4', '#C7F464', '#FF6B6B', '#C44D58'])),
            defaultStrokeStyle = Common.shadeColor(defaultFillStyle, -20);
        body.render.fillStyle = body.render.fillStyle || defaultFillStyle;
        body.render.strokeStyle = body.render.strokeStyle || defaultStrokeStyle;
        body.render.sprite.xOffset += -(body.bounds.min.x - body.position.x) / (body.bounds.max.x - body.bounds.min.x);
        body.render.sprite.yOffset += -(body.bounds.min.y - body.position.y) / (body.bounds.max.y - body.bounds.min.y);
    };

    /**
     * Given a property and a value (or map of), sets the property(s) on the body, using the appropriate setter functions if they exist.
     * Prefer to use the actual setter functions in performance critical situations.
     * @method set
     * @param {body} body
     * @param {} settings A property name (or map of properties and values) to set on the body.
     * @param {} value The value to set if `settings` is a single property name.
     */
    Body.set = function(body, settings, value) {
        var property;

        if (typeof settings === 'string') {
            property = settings;
            settings = {};
            settings[property] = value;
        }

        for (property in settings) {
            value = settings[property];

            if (!settings.hasOwnProperty(property))
                continue;

            switch (property) {

            case 'isStatic':
                Body.setStatic(body, value);
                break;
            case 'isSleeping':
                Sleeping.set(body, value);
                break;
            case 'mass':
                Body.setMass(body, value);
                break;
            case 'density':
                Body.setDensity(body, value);
                break;
            case 'inertia':
                Body.setInertia(body, value);
                break;
            case 'vertices':
                Body.setVertices(body, value);
                break;
            case 'position':
                Body.setPosition(body, value);
                break;
            case 'angle':
                Body.setAngle(body, value);
                break;
            case 'velocity':
                Body.setVelocity(body, value);
                break;
            case 'angularVelocity':
                Body.setAngularVelocity(body, value);
                break;
            case 'parts':
                Body.setParts(body, value);
                break;
            default:
                body[property] = value;

            }
        }
    };

    /**
     * Sets the body as static, including isStatic flag and setting mass and inertia to Infinity.
     * @method setStatic
     * @param {body} body
     * @param {bool} isStatic
     */
    Body.setStatic = function(body, isStatic) {
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.isStatic = isStatic;

            if (isStatic) {
                part.restitution = 0;
                part.friction = 1;
                part.mass = part.inertia = part.density = Infinity;
                part.inverseMass = part.inverseInertia = 0;

                part.positionPrev.x = part.position.x;
                part.positionPrev.y = part.position.y;
                part.anglePrev = part.angle;
                part.angularVelocity = 0;
                part.speed = 0;
                part.angularSpeed = 0;
                part.motion = 0;
            }
        }
    };

    /**
     * Sets the mass of the body. Inverse mass and density are automatically updated to reflect the change.
     * @method setMass
     * @param {body} body
     * @param {number} mass
     */
    Body.setMass = function(body, mass) {
        body.mass = mass;
        body.inverseMass = 1 / body.mass;
        body.density = body.mass / body.area;
    };

    /**
     * Sets the density of the body. Mass is automatically updated to reflect the change.
     * @method setDensity
     * @param {body} body
     * @param {number} density
     */
    Body.setDensity = function(body, density) {
        Body.setMass(body, density * body.area);
        body.density = density;
    };

    /**
     * Sets the moment of inertia (i.e. second moment of area) of the body of the body. 
     * Inverse inertia is automatically updated to reflect the change. Mass is not changed.
     * @method setInertia
     * @param {body} body
     * @param {number} inertia
     */
    Body.setInertia = function(body, inertia) {
        body.inertia = inertia;
        body.inverseInertia = 1 / body.inertia;
    };

    /**
     * Sets the body's vertices and updates body properties accordingly, including inertia, area and mass (with respect to `body.density`).
     * Vertices will be automatically transformed to be orientated around their centre of mass as the origin.
     * They are then automatically translated to world space based on `body.position`.
     *
     * The `vertices` argument should be passed as an array of `Matter.Vector` points (or a `Matter.Vertices` array).
     * Vertices must form a convex hull, concave hulls are not supported.
     *
     * @method setVertices
     * @param {body} body
     * @param {vector[]} vertices
     */
    Body.setVertices = function(body, vertices) {
        // change vertices
        if (vertices[0].body === body) {
            body.vertices = vertices;
        } else {
            body.vertices = Vertices.create(vertices, body);
        }

        // update properties
        body.axes = Axes.fromVertices(body.vertices);
        body.area = Vertices.area(body.vertices);
        Body.setMass(body, body.density * body.area);

        // orient vertices around the centre of mass at origin (0, 0)
        var centre = Vertices.centre(body.vertices);
        Vertices.translate(body.vertices, centre, -1);

        // update inertia while vertices are at origin (0, 0)
        Body.setInertia(body, Body._inertiaScale * Vertices.inertia(body.vertices, body.mass));

        // update geometry
        Vertices.translate(body.vertices, body.position);
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

    /**
     * Sets the parts of the `body` and updates mass, inertia and centroid.
     * Each part will have its parent set to `body`.
     * By default the convex hull will be automatically computed and set on `body`, unless `autoHull` is set to `false.`
     * Note that this method will ensure that the first part in `body.parts` will always be the `body`.
     * @method setParts
     * @param {body} body
     * @param [body] parts
     * @param {bool} [autoHull=true]
     */
    Body.setParts = function(body, parts, autoHull) {
        var i;

        // add all the parts, ensuring that the first part is always the parent body
        parts = parts.slice(0);
        body.parts.length = 0;
        body.parts.push(body);
        body.parent = body;

        for (i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part !== body) {
                part.parent = body;
                body.parts.push(part);
            }
        }

        if (body.parts.length === 1)
            return;

        autoHull = typeof autoHull !== 'undefined' ? autoHull : true;

        // find the convex hull of all parts to set on the parent body
        if (autoHull) {
            var vertices = [];
            for (i = 0; i < parts.length; i++) {
                vertices = vertices.concat(parts[i].vertices);
            }

            Vertices.clockwiseSort(vertices);

            var hull = Vertices.hull(vertices),
                hullCentre = Vertices.centre(hull);

            Body.setVertices(body, hull);
            Vertices.translate(body.vertices, hullCentre);
        }

        // sum the properties of all compound parts of the parent body
        var total = _totalProperties(body);

        body.area = total.area;
        body.parent = body;
        body.position.x = total.centre.x;
        body.position.y = total.centre.y;
        body.positionPrev.x = total.centre.x;
        body.positionPrev.y = total.centre.y;

        Body.setMass(body, total.mass);
        Body.setInertia(body, total.inertia);
        Body.setPosition(body, total.centre);
    };

    /**
     * Sets the position of the body instantly. Velocity, angle, force etc. are unchanged.
     * @method setPosition
     * @param {body} body
     * @param {vector} position
     */
    Body.setPosition = function(body, position) {
        var delta = Vector.sub(position, body.position);
        body.positionPrev.x += delta.x;
        body.positionPrev.y += delta.y;

        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.position.x += delta.x;
            part.position.y += delta.y;
            Vertices.translate(part.vertices, delta);
            Bounds.update(part.bounds, part.vertices, body.velocity);
        }
    };

    /**
     * Sets the angle of the body instantly. Angular velocity, position, force etc. are unchanged.
     * @method setAngle
     * @param {body} body
     * @param {number} angle
     */
    Body.setAngle = function(body, angle) {
        var delta = angle - body.angle;
        body.anglePrev += delta;

        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.angle += delta;
            Vertices.rotate(part.vertices, delta, body.position);
            Axes.rotate(part.axes, delta);
            Bounds.update(part.bounds, part.vertices, body.velocity);
            if (i > 0) {
                Vector.rotateAbout(part.position, delta, body.position, part.position);
            }
        }
    };

    /**
     * Sets the linear velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
     * @method setVelocity
     * @param {body} body
     * @param {vector} velocity
     */
    Body.setVelocity = function(body, velocity) {
        body.positionPrev.x = body.position.x - velocity.x;
        body.positionPrev.y = body.position.y - velocity.y;
        body.velocity.x = velocity.x;
        body.velocity.y = velocity.y;
        body.speed = Vector.magnitude(body.velocity);
    };

    /**
     * Sets the angular velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
     * @method setAngularVelocity
     * @param {body} body
     * @param {number} velocity
     */
    Body.setAngularVelocity = function(body, velocity) {
        body.anglePrev = body.angle - velocity;
        body.angularVelocity = velocity;
        body.angularSpeed = Math.abs(body.angularVelocity);
    };

    /**
     * Moves a body by a given vector relative to its current position, without imparting any velocity.
     * @method translate
     * @param {body} body
     * @param {vector} translation
     */
    Body.translate = function(body, translation) {
        Body.setPosition(body, Vector.add(body.position, translation));
    };

    /**
     * Rotates a body by a given angle relative to its current angle, without imparting any angular velocity.
     * @method rotate
     * @param {body} body
     * @param {number} rotation
     */
    Body.rotate = function(body, rotation) {
        Body.setAngle(body, body.angle + rotation);
    };

    /**
     * Scales the body, including updating physical properties (mass, area, axes, inertia), from a world-space point (default is body centre).
     * @method scale
     * @param {body} body
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} [point]
     */
    Body.scale = function(body, scaleX, scaleY, point) {
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];

            // scale vertices
            Vertices.scale(part.vertices, scaleX, scaleY, body.position);

            // update properties
            part.axes = Axes.fromVertices(part.vertices);

            if (!body.isStatic) {
                part.area = Vertices.area(part.vertices);
                Body.setMass(part, body.density * part.area);

                // update inertia (requires vertices to be at origin)
                Vertices.translate(part.vertices, { x: -part.position.x, y: -part.position.y });
                Body.setInertia(part, Vertices.inertia(part.vertices, part.mass));
                Vertices.translate(part.vertices, { x: part.position.x, y: part.position.y });
            }

            // update bounds
            Bounds.update(part.bounds, part.vertices, body.velocity);
        }

        // handle circles
        if (body.circleRadius) { 
            if (scaleX === scaleY) {
                body.circleRadius *= scaleX;
            } else {
                // body is no longer a circle
                body.circleRadius = null;
            }
        }

        if (!body.isStatic) {
            var total = _totalProperties(body);
            body.area = total.area;
            Body.setMass(body, total.mass);
            Body.setInertia(body, total.inertia);
        }
    };

    /**
     * Performs a simulation step for the given `body`, including updating position and angle using Verlet integration.
     * @method update
     * @param {body} body
     * @param {number} deltaTime
     * @param {number} timeScale
     * @param {number} correction
     */
    Body.update = function(body, deltaTime, timeScale, correction) {
        var deltaTimeSquared = Math.pow(deltaTime * timeScale * body.timeScale, 2);

        // from the previous step
        var frictionAir = 1 - body.frictionAir * timeScale * body.timeScale,
            velocityPrevX = body.position.x - body.positionPrev.x,
            velocityPrevY = body.position.y - body.positionPrev.y;

        // update velocity with Verlet integration
        body.velocity.x = (velocityPrevX * frictionAir * correction) + (body.force.x / body.mass) * deltaTimeSquared;
        body.velocity.y = (velocityPrevY * frictionAir * correction) + (body.force.y / body.mass) * deltaTimeSquared;

        body.positionPrev.x = body.position.x;
        body.positionPrev.y = body.position.y;
        body.position.x += body.velocity.x;
        body.position.y += body.velocity.y;

        // update angular velocity with Verlet integration
        body.angularVelocity = ((body.angle - body.anglePrev) * frictionAir * correction) + (body.torque / body.inertia) * deltaTimeSquared;
        body.anglePrev = body.angle;
        body.angle += body.angularVelocity;

        // track speed and acceleration
        body.speed = Vector.magnitude(body.velocity);
        body.angularSpeed = Math.abs(body.angularVelocity);

        // transform the body geometry
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];

            Vertices.translate(part.vertices, body.velocity);
            
            if (i > 0) {
                part.position.x += body.velocity.x;
                part.position.y += body.velocity.y;
            }

            if (body.angularVelocity !== 0) {
                Vertices.rotate(part.vertices, body.angularVelocity, body.position);
                Axes.rotate(part.axes, body.angularVelocity);
                if (i > 0) {
                    Vector.rotateAbout(part.position, body.angularVelocity, body.position, part.position);
                }
            }

            Bounds.update(part.bounds, part.vertices, body.velocity);
        }
    };

    /**
     * Applies a force to a body from a given world-space position, including resulting torque.
     * @method applyForce
     * @param {body} body
     * @param {vector} position
     * @param {vector} force
     */
    Body.applyForce = function(body, position, force) {
        body.force.x += force.x;
        body.force.y += force.y;
        var offset = { x: position.x - body.position.x, y: position.y - body.position.y };
        body.torque += offset.x * force.y - offset.y * force.x;
    };

    /**
     * Returns the sums of the properties of all compound parts of the parent body.
     * @method _totalProperties
     * @private
     * @param {body} body
     * @return {}
     */
    var _totalProperties = function(body) {
        // https://ecourses.ou.edu/cgi-bin/ebook.cgi?doc=&topic=st&chap_sec=07.2&page=theory
        // http://output.to/sideway/default.asp?qno=121100087

        var properties = {
            mass: 0,
            area: 0,
            inertia: 0,
            centre: { x: 0, y: 0 }
        };

        // sum the properties of all compound parts of the parent body
        for (var i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; i++) {
            var part = body.parts[i];
            properties.mass += part.mass;
            properties.area += part.area;
            properties.inertia += part.inertia;
            properties.centre = Vector.add(properties.centre, 
                                           Vector.mult(part.position, part.mass !== Infinity ? part.mass : 1));
        }

        properties.centre = Vector.div(properties.centre, 
                                       properties.mass !== Infinity ? properties.mass : body.parts.length);

        return properties;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when a body starts sleeping (where `this` is the body).
    *
    * @event sleepStart
    * @this {body} The body that has started sleeping
    * @param {} event An event object
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a body ends sleeping (where `this` is the body).
    *
    * @event sleepEnd
    * @this {body} The body that has ended sleeping
    * @param {} event An event object
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Body.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "body"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage bodies.
     *
     * @property label
     * @type string
     * @default "Body"
     */

    /**
     * An array of bodies that make up this body. 
     * The first body in the array must always be a self reference to the current body instance.
     * All bodies in the `parts` array together form a single rigid compound body.
     * Parts are allowed to overlap, have gaps or holes or even form concave bodies.
     * Parts themselves should never be added to a `World`, only the parent body should be.
     * Use `Body.setParts` when setting parts to ensure correct updates of all properties.
     *
     * @property parts
     * @type body[]
     */

    /**
     * A self reference if the body is _not_ a part of another body.
     * Otherwise this is a reference to the body that this is a part of.
     * See `body.parts`.
     *
     * @property parent
     * @type body
     */

    /**
     * A `Number` specifying the angle of the body, in radians.
     *
     * @property angle
     * @type number
     * @default 0
     */

    /**
     * An array of `Vector` objects that specify the convex hull of the rigid body.
     * These should be provided about the origin `(0, 0)`. E.g.
     *
     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
     *
     * When passed via `Body.create`, the vertices are translated relative to `body.position` (i.e. world-space, and constantly updated by `Body.update` during simulation).
     * The `Vector` objects are also augmented with additional properties required for efficient collision detection. 
     *
     * Other properties such as `inertia` and `bounds` are automatically calculated from the passed vertices (unless provided via `options`).
     * Concave hulls are not currently supported. The module `Matter.Vertices` contains useful methods for working with vertices.
     *
     * @property vertices
     * @type vector[]
     */

    /**
     * A `Vector` that specifies the current world-space position of the body.
     *
     * @property position
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Vector` that specifies the force to apply in the current step. It is zeroed after every `Body.update`. See also `Body.applyForce`.
     *
     * @property force
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that specifies the torque (turning force) to apply in the current step. It is zeroed after every `Body.update`.
     *
     * @property torque
     * @type number
     * @default 0
     */

    /**
     * A `Number` that _measures_ the current speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.velocity`).
     *
     * @readOnly
     * @property speed
     * @type number
     * @default 0
     */

    /**
     * A `Number` that _measures_ the current angular speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.angularVelocity`).
     *
     * @readOnly
     * @property angularSpeed
     * @type number
     * @default 0
     */

    /**
     * A `Vector` that _measures_ the current velocity of the body after the last `Body.update`. It is read-only. 
     * If you need to modify a body's velocity directly, you should either apply a force or simply change the body's `position` (as the engine uses position-Verlet integration).
     *
     * @readOnly
     * @property velocity
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that _measures_ the current angular velocity of the body after the last `Body.update`. It is read-only. 
     * If you need to modify a body's angular velocity directly, you should apply a torque or simply change the body's `angle` (as the engine uses position-Verlet integration).
     *
     * @readOnly
     * @property angularVelocity
     * @type number
     * @default 0
     */

    /**
     * A flag that indicates whether a body is considered static. A static body can never change position or angle and is completely fixed.
     * If you need to set a body as static after its creation, you should use `Body.setStatic` as this requires more than just setting this flag.
     *
     * @property isStatic
     * @type boolean
     * @default false
     */

    /**
     * A flag that indicates whether a body is a sensor. Sensor triggers collision events, but doesn't react with colliding body physically.
     *
     * @property isSensor
     * @type boolean
     * @default false
     */

    /**
     * A flag that indicates whether the body is considered sleeping. A sleeping body acts similar to a static body, except it is only temporary and can be awoken.
     * If you need to set a body as sleeping, you should use `Sleeping.set` as this requires more than just setting this flag.
     *
     * @property isSleeping
     * @type boolean
     * @default false
     */

    /**
     * A `Number` that _measures_ the amount of movement a body currently has (a combination of `speed` and `angularSpeed`). It is read-only and always positive.
     * It is used and updated by the `Matter.Sleeping` module during simulation to decide if a body has come to rest.
     *
     * @readOnly
     * @property motion
     * @type number
     * @default 0
     */

    /**
     * A `Number` that defines the number of updates in which this body must have near-zero velocity before it is set as sleeping by the `Matter.Sleeping` module (if sleeping is enabled by the engine).
     *
     * @property sleepThreshold
     * @type number
     * @default 60
     */

    /**
     * A `Number` that defines the density of the body, that is its mass per unit area.
     * If you pass the density via `Body.create` the `mass` property is automatically calculated for you based on the size (area) of the object.
     * This is generally preferable to simply setting mass and allows for more intuitive definition of materials (e.g. rock has a higher density than wood).
     *
     * @property density
     * @type number
     * @default 0.001
     */

    /**
     * A `Number` that defines the mass of the body, although it may be more appropriate to specify the `density` property instead.
     * If you modify this value, you must also modify the `body.inverseMass` property (`1 / mass`).
     *
     * @property mass
     * @type number
     */

    /**
     * A `Number` that defines the inverse mass of the body (`1 / mass`).
     * If you modify this value, you must also modify the `body.mass` property.
     *
     * @property inverseMass
     * @type number
     */

    /**
     * A `Number` that defines the moment of inertia (i.e. second moment of area) of the body.
     * It is automatically calculated from the given convex hull (`vertices` array) and density in `Body.create`.
     * If you modify this value, you must also modify the `body.inverseInertia` property (`1 / inertia`).
     *
     * @property inertia
     * @type number
     */

    /**
     * A `Number` that defines the inverse moment of inertia of the body (`1 / inertia`).
     * If you modify this value, you must also modify the `body.inertia` property.
     *
     * @property inverseInertia
     * @type number
     */

    /**
     * A `Number` that defines the restitution (elasticity) of the body. The value is always positive and is in the range `(0, 1)`.
     * A value of `0` means collisions may be perfectly inelastic and no bouncing may occur. 
     * A value of `0.8` means the body may bounce back with approximately 80% of its kinetic energy.
     * Note that collision response is based on _pairs_ of bodies, and that `restitution` values are _combined_ with the following formula:
     *
     *     Math.max(bodyA.restitution, bodyB.restitution)
     *
     * @property restitution
     * @type number
     * @default 0
     */

    /**
     * A `Number` that defines the friction of the body. The value is always positive and is in the range `(0, 1)`.
     * A value of `0` means that the body may slide indefinitely.
     * A value of `1` means the body may come to a stop almost instantly after a force is applied.
     *
     * The effects of the value may be non-linear. 
     * High values may be unstable depending on the body.
     * The engine uses a Coulomb friction model including static and kinetic friction.
     * Note that collision response is based on _pairs_ of bodies, and that `friction` values are _combined_ with the following formula:
     *
     *     Math.min(bodyA.friction, bodyB.friction)
     *
     * @property friction
     * @type number
     * @default 0.1
     */

    /**
     * A `Number` that defines the static friction of the body (in the Coulomb friction model). 
     * A value of `0` means the body will never 'stick' when it is nearly stationary and only dynamic `friction` is used.
     * The higher the value (e.g. `10`), the more force it will take to initially get the body moving when nearly stationary.
     * This value is multiplied with the `friction` property to make it easier to change `friction` and maintain an appropriate amount of static friction.
     *
     * @property frictionStatic
     * @type number
     * @default 0.5
     */

    /**
     * A `Number` that defines the air friction of the body (air resistance). 
     * A value of `0` means the body will never slow as it moves through space.
     * The higher the value, the faster a body slows when moving through space.
     * The effects of the value are non-linear. 
     *
     * @property frictionAir
     * @type number
     * @default 0.01
     */

    /**
     * An `Object` that specifies the collision filtering properties of this body.
     *
     * Collisions between two bodies will obey the following rules:
     * - If the two bodies have the same non-zero value of `collisionFilter.group`,
     *   they will always collide if the value is positive, and they will never collide
     *   if the value is negative.
     * - If the two bodies have different values of `collisionFilter.group` or if one
     *   (or both) of the bodies has a value of 0, then the category/mask rules apply as follows:
     *
     * Each body belongs to a collision category, given by `collisionFilter.category`. This
     * value is used as a bit field and the category should have only one bit set, meaning that
     * the value of this property is a power of two in the range [1, 2^31]. Thus, there are 32
     * different collision categories available.
     *
     * Each body also defines a collision bitmask, given by `collisionFilter.mask` which specifies
     * the categories it collides with (the value is the bitwise AND value of all these categories).
     *
     * Using the category/mask rules, two bodies `A` and `B` collide if each includes the other's
     * category in its mask, i.e. `(categoryA & maskB) !== 0` and `(categoryB & maskA) !== 0`
     * are both true.
     *
     * @property collisionFilter
     * @type object
     */

    /**
     * An Integer `Number`, that specifies the collision group this body belongs to.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.group
     * @type object
     * @default 0
     */

    /**
     * A bit field that specifies the collision category this body belongs to.
     * The category value should have only one bit set, for example `0x0001`.
     * This means there are up to 32 unique collision categories available.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.category
     * @type object
     * @default 1
     */

    /**
     * A bit mask that specifies the collision categories this body may collide with.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.mask
     * @type object
     * @default -1
     */

    /**
     * A `Number` that specifies a tolerance on how far a body is allowed to 'sink' or rotate into other bodies.
     * Avoid changing this value unless you understand the purpose of `slop` in physics engines.
     * The default should generally suffice, although very large bodies may require larger values for stable stacking.
     *
     * @property slop
     * @type number
     * @default 0.05
     */

    /**
     * A `Number` that allows per-body time scaling, e.g. a force-field where bodies inside are in slow-motion, while others are at full speed.
     *
     * @property timeScale
     * @type number
     * @default 1
     */

    /**
     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
     *
     * @property render
     * @type object
     */

    /**
     * A flag that indicates if the body should be rendered.
     *
     * @property render.visible
     * @type boolean
     * @default true
     */

    /**
     * Sets the opacity to use when rendering.
     *
     * @property render.opacity
     * @type number
     * @default 1
    */

    /**
     * An `Object` that defines the sprite properties to use when rendering, if any.
     *
     * @property render.sprite
     * @type object
     */

    /**
     * An `String` that defines the path to the image to use as the sprite texture, if any.
     *
     * @property render.sprite.texture
     * @type string
     */
     
    /**
     * A `Number` that defines the scaling in the x-axis for the sprite, if any.
     *
     * @property render.sprite.xScale
     * @type number
     * @default 1
     */

    /**
     * A `Number` that defines the scaling in the y-axis for the sprite, if any.
     *
     * @property render.sprite.yScale
     * @type number
     * @default 1
     */

     /**
      * A `Number` that defines the offset in the x-axis for the sprite (normalised by texture width).
      *
      * @property render.sprite.xOffset
      * @type number
      * @default 0
      */

     /**
      * A `Number` that defines the offset in the y-axis for the sprite (normalised by texture height).
      *
      * @property render.sprite.yOffset
      * @type number
      * @default 0
      */

    /**
     * A `Number` that defines the line width to use when rendering the body outline (if a sprite is not defined).
     * A value of `0` means no outline will be rendered.
     *
     * @property render.lineWidth
     * @type number
     * @default 1.5
     */

    /**
     * A `String` that defines the fill style to use when rendering the body (if a sprite is not defined).
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.fillStyle
     * @type string
     * @default a random colour
     */

    /**
     * A `String` that defines the stroke style to use when rendering the body outline (if a sprite is not defined).
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.strokeStyle
     * @type string
     * @default a random colour
     */

    /**
     * An array of unique axis vectors (edge normals) used for collision detection.
     * These are automatically calculated from the given convex hull (`vertices` array) in `Body.create`.
     * They are constantly updated by `Body.update` during the simulation.
     *
     * @property axes
     * @type vector[]
     */
     
    /**
     * A `Number` that _measures_ the area of the body's convex hull, calculated at creation by `Body.create`.
     *
     * @property area
     * @type string
     * @default 
     */

    /**
     * A `Bounds` object that defines the AABB region for the body.
     * It is automatically calculated from the given convex hull (`vertices` array) in `Body.create` and constantly updated by `Body.update` during simulation.
     *
     * @property bounds
     * @type bounds
     */

})();

},{"../core/Common":14,"../core/Sleeping":20,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27,"../render/Render":29}],2:[function(require,module,exports){
/**
* The `Matter.Composite` module contains methods for creating and manipulating composite bodies.
* A composite body is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`, therefore composites form a tree structure.
* It is important to use the functions in this module to modify composites, rather than directly modifying their properties.
* Note that the `Matter.World` object is also a type of `Matter.Composite` and as such all composite methods here can also operate on a `Matter.World`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Composite
*/

var Composite = {};

module.exports = Composite;

var Events = require('../core/Events');
var Common = require('../core/Common');
var Body = require('./Body');

(function() {

    /**
     * Creates a new composite. The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properites section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} [options]
     * @return {composite} A new composite
     */
    Composite.create = function(options) {
        return Common.extend({ 
            id: Common.nextId(),
            type: 'composite',
            parent: null,
            isModified: false,
            bodies: [], 
            constraints: [], 
            composites: [],
            label: 'Composite'
        }, options);
    };

    /**
     * Sets the composite's `isModified` flag. 
     * If `updateParents` is true, all parents will be set (default: false).
     * If `updateChildren` is true, all children will be set (default: false).
     * @method setModified
     * @param {composite} composite
     * @param {boolean} isModified
     * @param {boolean} [updateParents=false]
     * @param {boolean} [updateChildren=false]
     */
    Composite.setModified = function(composite, isModified, updateParents, updateChildren) {
        composite.isModified = isModified;

        if (updateParents && composite.parent) {
            Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
        }

        if (updateChildren) {
            for(var i = 0; i < composite.composites.length; i++) {
                var childComposite = composite.composites[i];
                Composite.setModified(childComposite, isModified, updateParents, updateChildren);
            }
        }
    };

    /**
     * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Triggers `beforeAdd` and `afterAdd` events on the `composite`.
     * @method add
     * @param {composite} composite
     * @param {} object
     * @return {composite} The original composite with the objects added
     */
    Composite.add = function(composite, object) {
        var objects = [].concat(object);

        Events.trigger(composite, 'beforeAdd', { object: object });

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                // skip adding compound parts
                if (obj.parent !== obj) {
                    Common.log('Composite.add: skipped adding a compound body part (you must add its parent instead)', 'warn');
                    break;
                }

                Composite.addBody(composite, obj);
                break;
            case 'constraint':
                Composite.addConstraint(composite, obj);
                break;
            case 'composite':
                Composite.addComposite(composite, obj);
                break;
            case 'mouseConstraint':
                Composite.addConstraint(composite, obj.constraint);
                break;

            }
        }

        Events.trigger(composite, 'afterAdd', { object: object });

        return composite;
    };

    /**
     * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Optionally searching its children recursively.
     * Triggers `beforeRemove` and `afterRemove` events on the `composite`.
     * @method remove
     * @param {composite} composite
     * @param {} object
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the objects removed
     */
    Composite.remove = function(composite, object, deep) {
        var objects = [].concat(object);

        Events.trigger(composite, 'beforeRemove', { object: object });

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                Composite.removeBody(composite, obj, deep);
                break;
            case 'constraint':
                Composite.removeConstraint(composite, obj, deep);
                break;
            case 'composite':
                Composite.removeComposite(composite, obj, deep);
                break;
            case 'mouseConstraint':
                Composite.removeConstraint(composite, obj.constraint);
                break;

            }
        }

        Events.trigger(composite, 'afterRemove', { object: object });

        return composite;
    };

    /**
     * Adds a composite to the given composite.
     * @private
     * @method addComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @return {composite} The original compositeA with the objects from compositeB added
     */
    Composite.addComposite = function(compositeA, compositeB) {
        compositeA.composites.push(compositeB);
        compositeB.parent = compositeA;
        Composite.setModified(compositeA, true, true, false);
        return compositeA;
    };

    /**
     * Removes a composite from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @param {boolean} [deep=false]
     * @return {composite} The original compositeA with the composite removed
     */
    Composite.removeComposite = function(compositeA, compositeB, deep) {
        var position = Common.indexOf(compositeA.composites, compositeB);
        if (position !== -1) {
            Composite.removeCompositeAt(compositeA, position);
            Composite.setModified(compositeA, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < compositeA.composites.length; i++){
                Composite.removeComposite(compositeA.composites[i], compositeB, true);
            }
        }

        return compositeA;
    };

    /**
     * Removes a composite from the given composite.
     * @private
     * @method removeCompositeAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the composite removed
     */
    Composite.removeCompositeAt = function(composite, position) {
        composite.composites.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Adds a body to the given composite.
     * @private
     * @method addBody
     * @param {composite} composite
     * @param {body} body
     * @return {composite} The original composite with the body added
     */
    Composite.addBody = function(composite, body) {
        composite.bodies.push(body);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a body from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeBody
     * @param {composite} composite
     * @param {body} body
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBody = function(composite, body, deep) {
        var position = Common.indexOf(composite.bodies, body);
        if (position !== -1) {
            Composite.removeBodyAt(composite, position);
            Composite.setModified(composite, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeBody(composite.composites[i], body, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeBodyAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBodyAt = function(composite, position) {
        composite.bodies.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Adds a constraint to the given composite.
     * @private
     * @method addConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @return {composite} The original composite with the constraint added
     */
    Composite.addConstraint = function(composite, constraint) {
        composite.constraints.push(constraint);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a constraint from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraint = function(composite, constraint, deep) {
        var position = Common.indexOf(composite.constraints, constraint);
        if (position !== -1) {
            Composite.removeConstraintAt(composite, position);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeConstraint(composite.composites[i], constraint, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeConstraintAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraintAt = function(composite, position) {
        composite.constraints.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes all bodies, constraints and composites from the given composite.
     * Optionally clearing its children recursively.
     * @method clear
     * @param {composite} composite
     * @param {boolean} keepStatic
     * @param {boolean} [deep=false]
     */
    Composite.clear = function(composite, keepStatic, deep) {
        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.clear(composite.composites[i], keepStatic, true);
            }
        }
        
        if (keepStatic) {
            composite.bodies = composite.bodies.filter(function(body) { return body.isStatic; });
        } else {
            composite.bodies.length = 0;
        }

        composite.constraints.length = 0;
        composite.composites.length = 0;
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Returns all bodies in the given composite, including all bodies in its children, recursively.
     * @method allBodies
     * @param {composite} composite
     * @return {body[]} All the bodies
     */
    Composite.allBodies = function(composite) {
        var bodies = [].concat(composite.bodies);

        for (var i = 0; i < composite.composites.length; i++)
            bodies = bodies.concat(Composite.allBodies(composite.composites[i]));

        return bodies;
    };

    /**
     * Returns all constraints in the given composite, including all constraints in its children, recursively.
     * @method allConstraints
     * @param {composite} composite
     * @return {constraint[]} All the constraints
     */
    Composite.allConstraints = function(composite) {
        var constraints = [].concat(composite.constraints);

        for (var i = 0; i < composite.composites.length; i++)
            constraints = constraints.concat(Composite.allConstraints(composite.composites[i]));

        return constraints;
    };

    /**
     * Returns all composites in the given composite, including all composites in its children, recursively.
     * @method allComposites
     * @param {composite} composite
     * @return {composite[]} All the composites
     */
    Composite.allComposites = function(composite) {
        var composites = [].concat(composite.composites);

        for (var i = 0; i < composite.composites.length; i++)
            composites = composites.concat(Composite.allComposites(composite.composites[i]));

        return composites;
    };

    /**
     * Searches the composite recursively for an object matching the type and id supplied, null if not found.
     * @method get
     * @param {composite} composite
     * @param {number} id
     * @param {string} type
     * @return {object} The requested object, if found
     */
    Composite.get = function(composite, id, type) {
        var objects,
            object;

        switch (type) {
        case 'body':
            objects = Composite.allBodies(composite);
            break;
        case 'constraint':
            objects = Composite.allConstraints(composite);
            break;
        case 'composite':
            objects = Composite.allComposites(composite).concat(composite);
            break;
        }

        if (!objects)
            return null;

        object = objects.filter(function(object) { 
            return object.id.toString() === id.toString(); 
        });

        return object.length === 0 ? null : object[0];
    };

    /**
     * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add).
     * @method move
     * @param {compositeA} compositeA
     * @param {object[]} objects
     * @param {compositeB} compositeB
     * @return {composite} Returns compositeA
     */
    Composite.move = function(compositeA, objects, compositeB) {
        Composite.remove(compositeA, objects);
        Composite.add(compositeB, objects);
        return compositeA;
    };

    /**
     * Assigns new ids for all objects in the composite, recursively.
     * @method rebase
     * @param {composite} composite
     * @return {composite} Returns composite
     */
    Composite.rebase = function(composite) {
        var objects = Composite.allBodies(composite)
                        .concat(Composite.allConstraints(composite))
                        .concat(Composite.allComposites(composite));

        for (var i = 0; i < objects.length; i++) {
            objects[i].id = Common.nextId();
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Translates all children in the composite by a given vector relative to their current positions, 
     * without imparting any velocity.
     * @method translate
     * @param {composite} composite
     * @param {vector} translation
     * @param {bool} [recursive=true]
     */
    Composite.translate = function(composite, translation, recursive) {
        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            Body.translate(bodies[i], translation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Rotates all children in the composite by a given angle about the given point, without imparting any angular velocity.
     * @method rotate
     * @param {composite} composite
     * @param {number} rotation
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.rotate = function(composite, rotation, point, recursive) {
        var cos = Math.cos(rotation),
            sin = Math.sin(rotation),
            bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                dx = body.position.x - point.x,
                dy = body.position.y - point.y;
                
            Body.setPosition(body, {
                x: point.x + (dx * cos - dy * sin),
                y: point.y + (dx * sin + dy * cos)
            });

            Body.rotate(body, rotation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Scales all children in the composite, including updating physical properties (mass, area, axes, inertia), from a world-space point.
     * @method scale
     * @param {composite} composite
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.scale = function(composite, scaleX, scaleY, point, recursive) {
        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                dx = body.position.x - point.x,
                dy = body.position.y - point.y;
                
            Body.setPosition(body, {
                x: point.x + dx * scaleX,
                y: point.y + dy * scaleY
            });

            Body.scale(body, scaleX, scaleY);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when a call to `Composite.add` is made, before objects have been added.
    *
    * @event beforeAdd
    * @param {} event An event object
    * @param {} event.object The object(s) to be added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.add` is made, after objects have been added.
    *
    * @event afterAdd
    * @param {} event An event object
    * @param {} event.object The object(s) that have been added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, before objects have been removed.
    *
    * @event beforeRemove
    * @param {} event An event object
    * @param {} event.object The object(s) to be removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, after objects have been removed.
    *
    * @event afterRemove
    * @param {} event An event object
    * @param {} event.object The object(s) that have been removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "composite"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage composites.
     *
     * @property label
     * @type string
     * @default "Composite"
     */

    /**
     * A flag that specifies whether the composite has been modified during the current step.
     * Most `Matter.Composite` methods will automatically set this flag to `true` to inform the engine of changes to be handled.
     * If you need to change it manually, you should use the `Composite.setModified` method.
     *
     * @property isModified
     * @type boolean
     * @default false
     */

    /**
     * The `Composite` that is the parent of this composite. It is automatically managed by the `Matter.Composite` methods.
     *
     * @property parent
     * @type composite
     * @default null
     */

    /**
     * An array of `Body` that are _direct_ children of this composite.
     * To add or remove bodies you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allBodies` method.
     *
     * @property bodies
     * @type body[]
     * @default []
     */

    /**
     * An array of `Constraint` that are _direct_ children of this composite.
     * To add or remove constraints you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allConstraints` method.
     *
     * @property constraints
     * @type constraint[]
     * @default []
     */

    /**
     * An array of `Composite` that are _direct_ children of this composite.
     * To add or remove composites you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allComposites` method.
     *
     * @property composites
     * @type composite[]
     * @default []
     */

})();

},{"../core/Common":14,"../core/Events":16,"./Body":1}],3:[function(require,module,exports){
/**
* The `Matter.World` module contains methods for creating and manipulating the world composite.
* A `Matter.World` is a `Matter.Composite` body, which is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`.
* A `Matter.World` has a few additional properties including `gravity` and `bounds`.
* It is important to use the functions in the `Matter.Composite` module to modify the world composite, rather than directly modifying its properties.
* There are also a few methods here that alias those in `Matter.Composite` for easier readability.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class World
* @extends Composite
*/

var World = {};

module.exports = World;

var Composite = require('./Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new world composite. The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @constructor
     * @param {} options
     * @return {world} A new world
     */
    World.create = function(options) {
        var composite = Composite.create();

        var defaults = {
            label: 'World',
            gravity: {
                x: 0,
                y: 1,
                scale: 0.001
            },
            bounds: { 
                min: { x: -Infinity, y: -Infinity }, 
                max: { x: Infinity, y: Infinity } 
            }
        };
        
        return Common.extend(composite, defaults, options);
    };

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * The gravity to apply on the world.
     *
     * @property gravity
     * @type object
     */

    /**
     * The gravity x component.
     *
     * @property gravity.x
     * @type object
     * @default 0
     */

    /**
     * The gravity y component.
     *
     * @property gravity.y
     * @type object
     * @default 1
     */

    /**
     * The gravity scale factor.
     *
     * @property gravity.scale
     * @type object
     * @default 0.001
     */

    /**
     * A `Bounds` object that defines the world bounds for collision detection.
     *
     * @property bounds
     * @type bounds
     * @default { min: { x: -Infinity, y: -Infinity }, max: { x: Infinity, y: Infinity } }
     */

    // World is a Composite body
    // see src/module/Outro.js for these aliases:
    
    /**
     * An alias for Composite.clear
     * @method clear
     * @param {world} world
     * @param {boolean} keepStatic
     */

    /**
     * An alias for Composite.add
     * @method addComposite
     * @param {world} world
     * @param {composite} composite
     * @return {world} The original world with the objects from composite added
     */
    
     /**
      * An alias for Composite.addBody
      * @method addBody
      * @param {world} world
      * @param {body} body
      * @return {world} The original world with the body added
      */

     /**
      * An alias for Composite.addConstraint
      * @method addConstraint
      * @param {world} world
      * @param {constraint} constraint
      * @return {world} The original world with the constraint added
      */

})();

},{"../constraint/Constraint":12,"../core/Common":14,"./Composite":2}],4:[function(require,module,exports){
/**
* The `Matter.Contact` module contains methods for creating and manipulating collision contacts.
*
* @class Contact
*/

var Contact = {};

module.exports = Contact;

(function() {

    /**
     * Creates a new contact.
     * @method create
     * @param {vertex} vertex
     * @return {contact} A new contact
     */
    Contact.create = function(vertex) {
        return {
            id: Contact.id(vertex),
            vertex: vertex,
            normalImpulse: 0,
            tangentImpulse: 0
        };
    };
    
    /**
     * Generates a contact id.
     * @method id
     * @param {vertex} vertex
     * @return {string} Unique contactID
     */
    Contact.id = function(vertex) {
        return vertex.body.id + '_' + vertex.index;
    };

})();

},{}],5:[function(require,module,exports){
/**
* The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
*
* @class Detector
*/

// TODO: speculative contacts

var Detector = {};

module.exports = Detector;

var SAT = require('./SAT');
var Pair = require('./Pair');
var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Finds all collisions given a list of pairs.
     * @method collisions
     * @param {pair[]} broadphasePairs
     * @param {engine} engine
     * @return {array} collisions
     */
    Detector.collisions = function(broadphasePairs, engine) {
        var collisions = [],
            pairsTable = engine.pairs.table;

        
        for (var i = 0; i < broadphasePairs.length; i++) {
            var bodyA = broadphasePairs[i][0], 
                bodyB = broadphasePairs[i][1];

            if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
                continue;
            
            if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
                continue;


            // mid phase
            if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {
                for (var j = bodyA.parts.length > 1 ? 1 : 0; j < bodyA.parts.length; j++) {
                    var partA = bodyA.parts[j];

                    for (var k = bodyB.parts.length > 1 ? 1 : 0; k < bodyB.parts.length; k++) {
                        var partB = bodyB.parts[k];

                        if ((partA === bodyA && partB === bodyB) || Bounds.overlaps(partA.bounds, partB.bounds)) {
                            // find a previous collision we could reuse
                            var pairId = Pair.id(partA, partB),
                                pair = pairsTable[pairId],
                                previousCollision;

                            if (pair && pair.isActive) {
                                previousCollision = pair.collision;
                            } else {
                                previousCollision = null;
                            }

                            // narrow phase
                            var collision = SAT.collides(partA, partB, previousCollision);


                            if (collision.collided) {
                                collisions.push(collision);
                            }
                        }
                    }
                }
            }
        }

        return collisions;
    };

    /**
     * Returns `true` if both supplied collision filters will allow a collision to occur.
     * See `body.collisionFilter` for more information.
     * @method canCollide
     * @param {} filterA
     * @param {} filterB
     * @return {bool} `true` if collision can occur
     */
    Detector.canCollide = function(filterA, filterB) {
        if (filterA.group === filterB.group && filterA.group !== 0)
            return filterA.group > 0;

        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
    };

})();

},{"../geometry/Bounds":24,"./Pair":7,"./SAT":11}],6:[function(require,module,exports){
/**
* The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
*
* @class Grid
*/

var Grid = {};

module.exports = Grid;

var Pair = require('./Pair');
var Detector = require('./Detector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new grid.
     * @method create
     * @param {} options
     * @return {grid} A new grid
     */
    Grid.create = function(options) {
        var defaults = {
            controller: Grid,
            detector: Detector.collisions,
            buckets: {},
            pairs: {},
            pairsList: [],
            bucketWidth: 48,
            bucketHeight: 48
        };

        return Common.extend(defaults, options);
    };

    /**
     * The width of a single grid bucket.
     *
     * @property bucketWidth
     * @type number
     * @default 48
     */

    /**
     * The height of a single grid bucket.
     *
     * @property bucketHeight
     * @type number
     * @default 48
     */

    /**
     * Updates the grid.
     * @method update
     * @param {grid} grid
     * @param {body[]} bodies
     * @param {engine} engine
     * @param {boolean} forceUpdate
     */
    Grid.update = function(grid, bodies, engine, forceUpdate) {
        var i, col, row,
            world = engine.world,
            buckets = grid.buckets,
            bucket,
            bucketId,
            gridChanged = false;


        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isSleeping && !forceUpdate)
                continue;

            // don't update out of world bodies
            if (body.bounds.max.x < world.bounds.min.x || body.bounds.min.x > world.bounds.max.x
                || body.bounds.max.y < world.bounds.min.y || body.bounds.min.y > world.bounds.max.y)
                continue;

            var newRegion = _getRegion(grid, body);

            // if the body has changed grid region
            if (!body.region || newRegion.id !== body.region.id || forceUpdate) {


                if (!body.region || forceUpdate)
                    body.region = newRegion;

                var union = _regionUnion(newRegion, body.region);

                // update grid buckets affected by region change
                // iterate over the union of both regions
                for (col = union.startCol; col <= union.endCol; col++) {
                    for (row = union.startRow; row <= union.endRow; row++) {
                        bucketId = _getBucketId(col, row);
                        bucket = buckets[bucketId];

                        var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
                                                && row >= newRegion.startRow && row <= newRegion.endRow);

                        var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
                                                && row >= body.region.startRow && row <= body.region.endRow);

                        // remove from old region buckets
                        if (!isInsideNewRegion && isInsideOldRegion) {
                            if (isInsideOldRegion) {
                                if (bucket)
                                    _bucketRemoveBody(grid, bucket, body);
                            }
                        }

                        // add to new region buckets
                        if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
                            if (!bucket)
                                bucket = _createBucket(buckets, bucketId);
                            _bucketAddBody(grid, bucket, body);
                        }
                    }
                }

                // set the new region
                body.region = newRegion;

                // flag changes so we can update pairs
                gridChanged = true;
            }
        }

        // update pairs list only if pairs changed (i.e. a body changed region)
        if (gridChanged)
            grid.pairsList = _createActivePairsList(grid);
    };

    /**
     * Clears the grid.
     * @method clear
     * @param {grid} grid
     */
    Grid.clear = function(grid) {
        grid.buckets = {};
        grid.pairs = {};
        grid.pairsList = [];
    };

    /**
     * Finds the union of two regions.
     * @method _regionUnion
     * @private
     * @param {} regionA
     * @param {} regionB
     * @return {} region
     */
    var _regionUnion = function(regionA, regionB) {
        var startCol = Math.min(regionA.startCol, regionB.startCol),
            endCol = Math.max(regionA.endCol, regionB.endCol),
            startRow = Math.min(regionA.startRow, regionB.startRow),
            endRow = Math.max(regionA.endRow, regionB.endRow);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Gets the region a given body falls in for a given grid.
     * @method _getRegion
     * @private
     * @param {} grid
     * @param {} body
     * @return {} region
     */
    var _getRegion = function(grid, body) {
        var bounds = body.bounds,
            startCol = Math.floor(bounds.min.x / grid.bucketWidth),
            endCol = Math.floor(bounds.max.x / grid.bucketWidth),
            startRow = Math.floor(bounds.min.y / grid.bucketHeight),
            endRow = Math.floor(bounds.max.y / grid.bucketHeight);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Creates a region.
     * @method _createRegion
     * @private
     * @param {} startCol
     * @param {} endCol
     * @param {} startRow
     * @param {} endRow
     * @return {} region
     */
    var _createRegion = function(startCol, endCol, startRow, endRow) {
        return { 
            id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
            startCol: startCol, 
            endCol: endCol, 
            startRow: startRow, 
            endRow: endRow 
        };
    };

    /**
     * Gets the bucket id at the given position.
     * @method _getBucketId
     * @private
     * @param {} column
     * @param {} row
     * @return {string} bucket id
     */
    var _getBucketId = function(column, row) {
        return column + ',' + row;
    };

    /**
     * Creates a bucket.
     * @method _createBucket
     * @private
     * @param {} buckets
     * @param {} bucketId
     * @return {} bucket
     */
    var _createBucket = function(buckets, bucketId) {
        var bucket = buckets[bucketId] = [];
        return bucket;
    };

    /**
     * Adds a body to a bucket.
     * @method _bucketAddBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketAddBody = function(grid, bucket, body) {
        // add new pairs
        for (var i = 0; i < bucket.length; i++) {
            var bodyB = bucket[i];

            if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
                continue;

            // keep track of the number of buckets the pair exists in
            // important for Grid.update to work
            var pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair) {
                pair[2] += 1;
            } else {
                grid.pairs[pairId] = [body, bodyB, 1];
            }
        }

        // add to bodies (after pairs, otherwise pairs with self)
        bucket.push(body);
    };

    /**
     * Removes a body from a bucket.
     * @method _bucketRemoveBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketRemoveBody = function(grid, bucket, body) {
        // remove from bucket
        bucket.splice(Common.indexOf(bucket, body), 1);

        // update pair counts
        for (var i = 0; i < bucket.length; i++) {
            // keep track of the number of buckets the pair exists in
            // important for _createActivePairsList to work
            var bodyB = bucket[i],
                pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair)
                pair[2] -= 1;
        }
    };

    /**
     * Generates a list of the active pairs in the grid.
     * @method _createActivePairsList
     * @private
     * @param {} grid
     * @return [] pairs
     */
    var _createActivePairsList = function(grid) {
        var pairKeys,
            pair,
            pairs = [];

        // grid.pairs is used as a hashmap
        pairKeys = Common.keys(grid.pairs);

        // iterate over grid.pairs
        for (var k = 0; k < pairKeys.length; k++) {
            pair = grid.pairs[pairKeys[k]];

            // if pair exists in at least one bucket
            // it is a pair that needs further collision testing so push it
            if (pair[2] > 0) {
                pairs.push(pair);
            } else {
                delete grid.pairs[pairKeys[k]];
            }
        }

        return pairs;
    };
    
})();

},{"../core/Common":14,"./Detector":5,"./Pair":7}],7:[function(require,module,exports){
/**
* The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
*
* @class Pair
*/

var Pair = {};

module.exports = Pair;

var Contact = require('./Contact');

(function() {
    
    /**
     * Creates a pair.
     * @method create
     * @param {collision} collision
     * @param {number} timestamp
     * @return {pair} A new pair
     */
    Pair.create = function(collision, timestamp) {
        var bodyA = collision.bodyA,
            bodyB = collision.bodyB,
            parentA = collision.parentA,
            parentB = collision.parentB;

        var pair = {
            id: Pair.id(bodyA, bodyB),
            bodyA: bodyA,
            bodyB: bodyB,
            contacts: {},
            activeContacts: [],
            separation: 0,
            isActive: true,
            isSensor: bodyA.isSensor || bodyB.isSensor,
            timeCreated: timestamp,
            timeUpdated: timestamp,
            inverseMass: parentA.inverseMass + parentB.inverseMass,
            friction: Math.min(parentA.friction, parentB.friction),
            frictionStatic: Math.max(parentA.frictionStatic, parentB.frictionStatic),
            restitution: Math.max(parentA.restitution, parentB.restitution),
            slop: Math.max(parentA.slop, parentB.slop)
        };

        Pair.update(pair, collision, timestamp);

        return pair;
    };

    /**
     * Updates a pair given a collision.
     * @method update
     * @param {pair} pair
     * @param {collision} collision
     * @param {number} timestamp
     */
    Pair.update = function(pair, collision, timestamp) {
        var contacts = pair.contacts,
            supports = collision.supports,
            activeContacts = pair.activeContacts,
            parentA = collision.parentA,
            parentB = collision.parentB;
        
        pair.collision = collision;
        pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
        pair.friction = Math.min(parentA.friction, parentB.friction);
        pair.frictionStatic = Math.max(parentA.frictionStatic, parentB.frictionStatic);
        pair.restitution = Math.max(parentA.restitution, parentB.restitution);
        pair.slop = Math.max(parentA.slop, parentB.slop);
        activeContacts.length = 0;
        
        if (collision.collided) {
            for (var i = 0; i < supports.length; i++) {
                var support = supports[i],
                    contactId = Contact.id(support),
                    contact = contacts[contactId];

                if (contact) {
                    activeContacts.push(contact);
                } else {
                    activeContacts.push(contacts[contactId] = Contact.create(support));
                }
            }

            pair.separation = collision.depth;
            Pair.setActive(pair, true, timestamp);
        } else {
            if (pair.isActive === true)
                Pair.setActive(pair, false, timestamp);
        }
    };
    
    /**
     * Set a pair as active or inactive.
     * @method setActive
     * @param {pair} pair
     * @param {bool} isActive
     * @param {number} timestamp
     */
    Pair.setActive = function(pair, isActive, timestamp) {
        if (isActive) {
            pair.isActive = true;
            pair.timeUpdated = timestamp;
        } else {
            pair.isActive = false;
            pair.activeContacts.length = 0;
        }
    };

    /**
     * Get the id for the given pair.
     * @method id
     * @param {body} bodyA
     * @param {body} bodyB
     * @return {string} Unique pairId
     */
    Pair.id = function(bodyA, bodyB) {
        if (bodyA.id < bodyB.id) {
            return bodyA.id + '_' + bodyB.id;
        } else {
            return bodyB.id + '_' + bodyA.id;
        }
    };

})();

},{"./Contact":4}],8:[function(require,module,exports){
/**
* The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
*
* @class Pairs
*/

var Pairs = {};

module.exports = Pairs;

var Pair = require('./Pair');
var Common = require('../core/Common');

(function() {
    
    var _pairMaxIdleLife = 1000;

    /**
     * Creates a new pairs structure.
     * @method create
     * @param {object} options
     * @return {pairs} A new pairs structure
     */
    Pairs.create = function(options) {
        return Common.extend({ 
            table: {},
            list: [],
            collisionStart: [],
            collisionActive: [],
            collisionEnd: []
        }, options);
    };

    /**
     * Updates pairs given a list of collisions.
     * @method update
     * @param {object} pairs
     * @param {collision[]} collisions
     * @param {number} timestamp
     */
    Pairs.update = function(pairs, collisions, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            collisionStart = pairs.collisionStart,
            collisionEnd = pairs.collisionEnd,
            collisionActive = pairs.collisionActive,
            activePairIds = [],
            collision,
            pairId,
            pair,
            i;

        // clear collision state arrays, but maintain old reference
        collisionStart.length = 0;
        collisionEnd.length = 0;
        collisionActive.length = 0;

        for (i = 0; i < collisions.length; i++) {
            collision = collisions[i];

            if (collision.collided) {
                pairId = Pair.id(collision.bodyA, collision.bodyB);
                activePairIds.push(pairId);

                pair = pairsTable[pairId];
                
                if (pair) {
                    // pair already exists (but may or may not be active)
                    if (pair.isActive) {
                        // pair exists and is active
                        collisionActive.push(pair);
                    } else {
                        // pair exists but was inactive, so a collision has just started again
                        collisionStart.push(pair);
                    }

                    // update the pair
                    Pair.update(pair, collision, timestamp);
                } else {
                    // pair did not exist, create a new pair
                    pair = Pair.create(collision, timestamp);
                    pairsTable[pairId] = pair;

                    // push the new pair
                    collisionStart.push(pair);
                    pairsList.push(pair);
                }
            }
        }

        // deactivate previously active pairs that are now inactive
        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            if (pair.isActive && Common.indexOf(activePairIds, pair.id) === -1) {
                Pair.setActive(pair, false, timestamp);
                collisionEnd.push(pair);
            }
        }
    };
    
    /**
     * Finds and removes pairs that have been inactive for a set amount of time.
     * @method removeOld
     * @param {object} pairs
     * @param {number} timestamp
     */
    Pairs.removeOld = function(pairs, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            indexesToRemove = [],
            pair,
            collision,
            pairIndex,
            i;

        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            collision = pair.collision;
            
            // never remove sleeping pairs
            if (collision.bodyA.isSleeping || collision.bodyB.isSleeping) {
                pair.timeUpdated = timestamp;
                continue;
            }

            // if pair is inactive for too long, mark it to be removed
            if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
                indexesToRemove.push(i);
            }
        }

        // remove marked pairs
        for (i = 0; i < indexesToRemove.length; i++) {
            pairIndex = indexesToRemove[i] - i;
            pair = pairsList[pairIndex];
            delete pairsTable[pair.id];
            pairsList.splice(pairIndex, 1);
        }
    };

    /**
     * Clears the given pairs structure.
     * @method clear
     * @param {pairs} pairs
     * @return {pairs} pairs
     */
    Pairs.clear = function(pairs) {
        pairs.table = {};
        pairs.list.length = 0;
        pairs.collisionStart.length = 0;
        pairs.collisionActive.length = 0;
        pairs.collisionEnd.length = 0;
        return pairs;
    };

})();

},{"../core/Common":14,"./Pair":7}],9:[function(require,module,exports){
/**
* The `Matter.Query` module contains methods for performing collision queries.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Query
*/

var Query = {};

module.exports = Query;

var Vector = require('../geometry/Vector');
var SAT = require('./SAT');
var Bounds = require('../geometry/Bounds');
var Bodies = require('../factory/Bodies');
var Vertices = require('../geometry/Vertices');

(function() {

    /**
     * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
     * @method ray
     * @param {body[]} bodies
     * @param {vector} startPoint
     * @param {vector} endPoint
     * @param {number} [rayWidth]
     * @return {object[]} Collisions
     */
    Query.ray = function(bodies, startPoint, endPoint, rayWidth) {
        rayWidth = rayWidth || 1e-100;

        var rayAngle = Vector.angle(startPoint, endPoint),
            rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
            rayX = (endPoint.x + startPoint.x) * 0.5,
            rayY = (endPoint.y + startPoint.y) * 0.5,
            ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
            collisions = [];

        for (var i = 0; i < bodies.length; i++) {
            var bodyA = bodies[i];
            
            if (Bounds.overlaps(bodyA.bounds, ray.bounds)) {
                for (var j = bodyA.parts.length === 1 ? 0 : 1; j < bodyA.parts.length; j++) {
                    var part = bodyA.parts[j];

                    if (Bounds.overlaps(part.bounds, ray.bounds)) {
                        var collision = SAT.collides(part, ray);
                        if (collision.collided) {
                            collision.body = collision.bodyA = collision.bodyB = bodyA;
                            collisions.push(collision);
                            break;
                        }
                    }
                }
            }
        }

        return collisions;
    };

    /**
     * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
     * @method region
     * @param {body[]} bodies
     * @param {bounds} bounds
     * @param {bool} [outside=false]
     * @return {body[]} The bodies matching the query
     */
    Query.region = function(bodies, bounds, outside) {
        var result = [];

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                overlaps = Bounds.overlaps(body.bounds, bounds);
            if ((overlaps && !outside) || (!overlaps && outside))
                result.push(body);
        }

        return result;
    };

    /**
     * Returns all bodies whose vertices contain the given point, from the given set of bodies.
     * @method point
     * @param {body[]} bodies
     * @param {vector} point
     * @return {body[]} The bodies matching the query
     */
    Query.point = function(bodies, point) {
        var result = [];

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            
            if (Bounds.contains(body.bounds, point)) {
                for (var j = body.parts.length === 1 ? 0 : 1; j < body.parts.length; j++) {
                    var part = body.parts[j];

                    if (Bounds.contains(part.bounds, point)
                        && Vertices.contains(part.vertices, point)) {
                        result.push(body);
                        break;
                    }
                }
            }
        }

        return result;
    };

})();

},{"../factory/Bodies":21,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27,"./SAT":11}],10:[function(require,module,exports){
/**
* The `Matter.Resolver` module contains methods for resolving collision pairs.
*
* @class Resolver
*/

var Resolver = {};

module.exports = Resolver;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');

(function() {

    Resolver._restingThresh = 4;
    Resolver._restingThreshTangent = 6;
    Resolver._positionDampen = 0.9;
    Resolver._positionWarming = 0.8;
    Resolver._frictionNormalMultiplier = 5;

    /**
     * Prepare pairs for position solving.
     * @method preSolvePosition
     * @param {pair[]} pairs
     */
    Resolver.preSolvePosition = function(pairs) {
        var i,
            pair,
            activeCount;

        // find total contacts on each body
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            activeCount = pair.activeContacts.length;
            pair.collision.parentA.totalContacts += activeCount;
            pair.collision.parentB.totalContacts += activeCount;
        }
    };

    /**
     * Find a solution for pair positions.
     * @method solvePosition
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solvePosition = function(pairs, timeScale) {
        var i,
            pair,
            collision,
            bodyA,
            bodyB,
            normal,
            bodyBtoA,
            contactShare,
            positionImpulse,
            contactCount = {},
            tempA = Vector._temp[0],
            tempB = Vector._temp[1],
            tempC = Vector._temp[2],
            tempD = Vector._temp[3];

        // find impulses required to resolve penetration
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;

            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;

            // get current separation between body edges involved in collision
            bodyBtoA = Vector.sub(Vector.add(bodyB.positionImpulse, bodyB.position, tempA), 
                                    Vector.add(bodyA.positionImpulse, 
                                        Vector.sub(bodyB.position, collision.penetration, tempB), tempC), tempD);

            pair.separation = Vector.dot(normal, bodyBtoA);
        }
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive || pair.isSensor || pair.separation < 0)
                continue;
            
            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;
            positionImpulse = (pair.separation - pair.slop) * timeScale;

            if (bodyA.isStatic || bodyB.isStatic)
                positionImpulse *= 2;
            
            if (!(bodyA.isStatic || bodyA.isSleeping)) {
                contactShare = Resolver._positionDampen / bodyA.totalContacts;
                bodyA.positionImpulse.x += normal.x * positionImpulse * contactShare;
                bodyA.positionImpulse.y += normal.y * positionImpulse * contactShare;
            }

            if (!(bodyB.isStatic || bodyB.isSleeping)) {
                contactShare = Resolver._positionDampen / bodyB.totalContacts;
                bodyB.positionImpulse.x -= normal.x * positionImpulse * contactShare;
                bodyB.positionImpulse.y -= normal.y * positionImpulse * contactShare;
            }
        }
    };

    /**
     * Apply position resolution.
     * @method postSolvePosition
     * @param {body[]} bodies
     */
    Resolver.postSolvePosition = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            // reset contact count
            body.totalContacts = 0;

            if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
                // update body geometry
                for (var j = 0; j < body.parts.length; j++) {
                    var part = body.parts[j];
                    Vertices.translate(part.vertices, body.positionImpulse);
                    Bounds.update(part.bounds, part.vertices, body.velocity);
                    part.position.x += body.positionImpulse.x;
                    part.position.y += body.positionImpulse.y;
                }

                // move the body without changing velocity
                body.positionPrev.x += body.positionImpulse.x;
                body.positionPrev.y += body.positionImpulse.y;

                if (Vector.dot(body.positionImpulse, body.velocity) < 0) {
                    // reset cached impulse if the body has velocity along it
                    body.positionImpulse.x = 0;
                    body.positionImpulse.y = 0;
                } else {
                    // warm the next iteration
                    body.positionImpulse.x *= Resolver._positionWarming;
                    body.positionImpulse.y *= Resolver._positionWarming;
                }
            }
        }
    };

    /**
     * Prepare pairs for velocity solving.
     * @method preSolveVelocity
     * @param {pair[]} pairs
     */
    Resolver.preSolveVelocity = function(pairs) {
        var i,
            j,
            pair,
            contacts,
            collision,
            bodyA,
            bodyB,
            normal,
            tangent,
            contact,
            contactVertex,
            normalImpulse,
            tangentImpulse,
            offset,
            impulse = Vector._temp[0],
            tempA = Vector._temp[1];
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;
            
            contacts = pair.activeContacts;
            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;
            tangent = collision.tangent;

            // resolve each contact
            for (j = 0; j < contacts.length; j++) {
                contact = contacts[j];
                contactVertex = contact.vertex;
                normalImpulse = contact.normalImpulse;
                tangentImpulse = contact.tangentImpulse;

                if (normalImpulse !== 0 || tangentImpulse !== 0) {
                    // total impulse from contact
                    impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                    impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                    
                    // apply impulse from contact
                    if (!(bodyA.isStatic || bodyA.isSleeping)) {
                        offset = Vector.sub(contactVertex, bodyA.position, tempA);
                        bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                        bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                        bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
                    }

                    if (!(bodyB.isStatic || bodyB.isSleeping)) {
                        offset = Vector.sub(contactVertex, bodyB.position, tempA);
                        bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                        bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                        bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
                    }
                }
            }
        }
    };

    /**
     * Find a solution for pair velocities.
     * @method solveVelocity
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solveVelocity = function(pairs, timeScale) {
        var timeScaleSquared = timeScale * timeScale,
            impulse = Vector._temp[0],
            tempA = Vector._temp[1],
            tempB = Vector._temp[2],
            tempC = Vector._temp[3],
            tempD = Vector._temp[4],
            tempE = Vector._temp[5];
        
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;
            
            var collision = pair.collision,
                bodyA = collision.parentA,
                bodyB = collision.parentB,
                normal = collision.normal,
                tangent = collision.tangent,
                contacts = pair.activeContacts,
                contactShare = 1 / contacts.length;

            // update body velocities
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // resolve each contact
            for (var j = 0; j < contacts.length; j++) {
                var contact = contacts[j],
                    contactVertex = contact.vertex,
                    offsetA = Vector.sub(contactVertex, bodyA.position, tempA),
                    offsetB = Vector.sub(contactVertex, bodyB.position, tempB),
                    velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity), tempC),
                    velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity), tempD), 
                    relativeVelocity = Vector.sub(velocityPointA, velocityPointB, tempE),
                    normalVelocity = Vector.dot(normal, relativeVelocity);

                var tangentVelocity = Vector.dot(tangent, relativeVelocity),
                    tangentSpeed = Math.abs(tangentVelocity),
                    tangentVelocityDirection = Common.sign(tangentVelocity);

                // raw impulses
                var normalImpulse = (1 + pair.restitution) * normalVelocity,
                    normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1) * Resolver._frictionNormalMultiplier;

                // coulomb friction
                var tangentImpulse = tangentVelocity,
                    maxFriction = Infinity;

                if (tangentSpeed > pair.friction * pair.frictionStatic * normalForce * timeScaleSquared) {
                    maxFriction = tangentSpeed;
                    tangentImpulse = Common.clamp(
                        pair.friction * tangentVelocityDirection * timeScaleSquared,
                        -maxFriction, maxFriction
                    );
                }

                // modify impulses accounting for mass, inertia and offset
                var oAcN = Vector.cross(offsetA, normal),
                    oBcN = Vector.cross(offsetB, normal),
                    share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);

                normalImpulse *= share;
                tangentImpulse *= share;

                // handle high velocity and resting collisions separately
                if (normalVelocity < 0 && normalVelocity * normalVelocity > Resolver._restingThresh * timeScaleSquared) {
                    // high normal velocity so clear cached contact normal impulse
                    contact.normalImpulse = 0;
                } else {
                    // solve resting collision constraints using Erin Catto's method (GDC08)
                    // impulse constraint tends to 0
                    var contactNormalImpulse = contact.normalImpulse;
                    contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                    normalImpulse = contact.normalImpulse - contactNormalImpulse;
                }

                // handle high velocity and resting collisions separately
                if (tangentVelocity * tangentVelocity > Resolver._restingThreshTangent * timeScaleSquared) {
                    // high tangent velocity so clear cached contact tangent impulse
                    contact.tangentImpulse = 0;
                } else {
                    // solve resting collision constraints using Erin Catto's method (GDC08)
                    // tangent impulse tends to -tangentSpeed or +tangentSpeed
                    var contactTangentImpulse = contact.tangentImpulse;
                    contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
                    tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                }

                // total impulse from contact
                impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                
                // apply impulse from contact
                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                    bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                    bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
                }

                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                    bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                    bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
                }
            }
        }
    };

})();

},{"../core/Common":14,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],11:[function(require,module,exports){
/**
* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
*
* @class SAT
*/

// TODO: true circles and curves

var SAT = {};

module.exports = SAT;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');

(function() {

    /**
     * Detect collision between two bodies using the Separating Axis Theorem.
     * @method collides
     * @param {body} bodyA
     * @param {body} bodyB
     * @param {collision} previousCollision
     * @return {collision} collision
     */
    SAT.collides = function(bodyA, bodyB, previousCollision) {
        var overlapAB,
            overlapBA, 
            minOverlap,
            collision,
            prevCol = previousCollision,
            canReusePrevCol = false;

        if (prevCol) {
            // estimate total motion
            var parentA = bodyA.parent,
                parentB = bodyB.parent,
                motion = parentA.speed * parentA.speed + parentA.angularSpeed * parentA.angularSpeed
                       + parentB.speed * parentB.speed + parentB.angularSpeed * parentB.angularSpeed;

            // we may be able to (partially) reuse collision result 
            // but only safe if collision was resting
            canReusePrevCol = prevCol && prevCol.collided && motion < 0.2;

            // reuse collision object
            collision = prevCol;
        } else {
            collision = { collided: false, bodyA: bodyA, bodyB: bodyB };
        }

        if (prevCol && canReusePrevCol) {
            // if we can reuse the collision result
            // we only need to test the previously found axis
            var axisBodyA = collision.axisBody,
                axisBodyB = axisBodyA === bodyA ? bodyB : bodyA,
                axes = [axisBodyA.axes[prevCol.axisNumber]];

            minOverlap = _overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
            collision.reused = true;

            if (minOverlap.overlap <= 0) {
                collision.collided = false;
                return collision;
            }
        } else {
            // if we can't reuse a result, perform a full SAT test

            overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

            if (overlapAB.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

            if (overlapBA.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            if (overlapAB.overlap < overlapBA.overlap) {
                minOverlap = overlapAB;
                collision.axisBody = bodyA;
            } else {
                minOverlap = overlapBA;
                collision.axisBody = bodyB;
            }

            // important for reuse later
            collision.axisNumber = minOverlap.axisNumber;
        }

        collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
        collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
        collision.collided = true;
        collision.normal = minOverlap.axis;
        collision.depth = minOverlap.overlap;
        collision.parentA = collision.bodyA.parent;
        collision.parentB = collision.bodyB.parent;
        
        bodyA = collision.bodyA;
        bodyB = collision.bodyB;

        // ensure normal is facing away from bodyA
        if (Vector.dot(collision.normal, Vector.sub(bodyB.position, bodyA.position)) > 0) 
            collision.normal = Vector.neg(collision.normal);

        collision.tangent = Vector.perp(collision.normal);

        collision.penetration = { 
            x: collision.normal.x * collision.depth, 
            y: collision.normal.y * collision.depth 
        };

        // find support points, there is always either exactly one or two
        var verticesB = _findSupports(bodyA, bodyB, collision.normal),
            supports = collision.supports || [];
        supports.length = 0;

        // find the supports from bodyB that are inside bodyA
        if (Vertices.contains(bodyA.vertices, verticesB[0]))
            supports.push(verticesB[0]);

        if (Vertices.contains(bodyA.vertices, verticesB[1]))
            supports.push(verticesB[1]);

        // find the supports from bodyA that are inside bodyB
        if (supports.length < 2) {
            var verticesA = _findSupports(bodyB, bodyA, Vector.neg(collision.normal));
                
            if (Vertices.contains(bodyB.vertices, verticesA[0]))
                supports.push(verticesA[0]);

            if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
                supports.push(verticesA[1]);
        }

        // account for the edge case of overlapping but no vertex containment
        if (supports.length < 1)
            supports = [verticesB[0]];
        
        collision.supports = supports;

        return collision;
    };

    /**
     * Find the overlap between two sets of vertices.
     * @method _overlapAxes
     * @private
     * @param {} verticesA
     * @param {} verticesB
     * @param {} axes
     * @return result
     */
    var _overlapAxes = function(verticesA, verticesB, axes) {
        var projectionA = Vector._temp[0], 
            projectionB = Vector._temp[1],
            result = { overlap: Number.MAX_VALUE },
            overlap,
            axis;

        for (var i = 0; i < axes.length; i++) {
            axis = axes[i];

            _projectToAxis(projectionA, verticesA, axis);
            _projectToAxis(projectionB, verticesB, axis);

            overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

            if (overlap <= 0) {
                result.overlap = overlap;
                return result;
            }

            if (overlap < result.overlap) {
                result.overlap = overlap;
                result.axis = axis;
                result.axisNumber = i;
            }
        }

        return result;
    };

    /**
     * Projects vertices on an axis and returns an interval.
     * @method _projectToAxis
     * @private
     * @param {} projection
     * @param {} vertices
     * @param {} axis
     */
    var _projectToAxis = function(projection, vertices, axis) {
        var min = Vector.dot(vertices[0], axis),
            max = min;

        for (var i = 1; i < vertices.length; i += 1) {
            var dot = Vector.dot(vertices[i], axis);

            if (dot > max) { 
                max = dot; 
            } else if (dot < min) { 
                min = dot; 
            }
        }

        projection.min = min;
        projection.max = max;
    };
    
    /**
     * Finds supporting vertices given two bodies along a given direction using hill-climbing.
     * @method _findSupports
     * @private
     * @param {} bodyA
     * @param {} bodyB
     * @param {} normal
     * @return [vector]
     */
    var _findSupports = function(bodyA, bodyB, normal) {
        var nearestDistance = Number.MAX_VALUE,
            vertexToBody = Vector._temp[0],
            vertices = bodyB.vertices,
            bodyAPosition = bodyA.position,
            distance,
            vertex,
            vertexA,
            vertexB;

        // find closest vertex on bodyB
        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            vertexToBody.x = vertex.x - bodyAPosition.x;
            vertexToBody.y = vertex.y - bodyAPosition.y;
            distance = -Vector.dot(normal, vertexToBody);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                vertexA = vertex;
            }
        }

        // find next closest vertex using the two connected to it
        var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
        vertex = vertices[prevIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        nearestDistance = -Vector.dot(normal, vertexToBody);
        vertexB = vertex;

        var nextIndex = (vertexA.index + 1) % vertices.length;
        vertex = vertices[nextIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        distance = -Vector.dot(normal, vertexToBody);
        if (distance < nearestDistance) {
            vertexB = vertex;
        }

        return [vertexA, vertexB];
    };

})();

},{"../geometry/Vector":26,"../geometry/Vertices":27}],12:[function(require,module,exports){
/**
* The `Matter.Constraint` module contains methods for creating and manipulating constraints.
* Constraints are used for specifying that a fixed distance must be maintained between two bodies (or a body and a fixed world-space position).
* The stiffness of constraints can be modified to create springs or elastic.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Constraint
*/

// TODO: fix instability issues with torque
// TODO: linked constraints
// TODO: breakable constraints
// TODO: collision constraints
// TODO: allow constrained bodies to sleep
// TODO: handle 0 length constraints properly
// TODO: impulse caching and warming

var Constraint = {};

module.exports = Constraint;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Sleeping = require('../core/Sleeping');
var Bounds = require('../geometry/Bounds');
var Axes = require('../geometry/Axes');
var Common = require('../core/Common');

(function() {

    var _minLength = 0.000001,
        _minDifference = 0.001;

    /**
     * Creates a new constraint.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} options
     * @return {constraint} constraint
     */
    Constraint.create = function(options) {
        var constraint = options;

        // if bodies defined but no points, use body centre
        if (constraint.bodyA && !constraint.pointA)
            constraint.pointA = { x: 0, y: 0 };
        if (constraint.bodyB && !constraint.pointB)
            constraint.pointB = { x: 0, y: 0 };

        // calculate static length using initial world space points
        var initialPointA = constraint.bodyA ? Vector.add(constraint.bodyA.position, constraint.pointA) : constraint.pointA,
            initialPointB = constraint.bodyB ? Vector.add(constraint.bodyB.position, constraint.pointB) : constraint.pointB,
            length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
    
        constraint.length = constraint.length || length || _minLength;

        // render
        var render = {
            visible: true,
            lineWidth: 2,
            strokeStyle: '#666'
        };
        
        constraint.render = Common.extend(render, constraint.render);

        // option defaults
        constraint.id = constraint.id || Common.nextId();
        constraint.label = constraint.label || 'Constraint';
        constraint.type = 'constraint';
        constraint.stiffness = constraint.stiffness || 1;
        constraint.angularStiffness = constraint.angularStiffness || 0;
        constraint.angleA = constraint.bodyA ? constraint.bodyA.angle : constraint.angleA;
        constraint.angleB = constraint.bodyB ? constraint.bodyB.angle : constraint.angleB;

        return constraint;
    };

    /**
     * Solves all constraints in a list of collisions.
     * @private
     * @method solveAll
     * @param {constraint[]} constraints
     * @param {number} timeScale
     */
    Constraint.solveAll = function(constraints, timeScale) {
        for (var i = 0; i < constraints.length; i++) {
            Constraint.solve(constraints[i], timeScale);
        }
    };

    /**
     * Solves a distance constraint with Gauss-Siedel method.
     * @private
     * @method solve
     * @param {constraint} constraint
     * @param {number} timeScale
     */
    Constraint.solve = function(constraint, timeScale) {
        var bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB;

        // update reference angle
        if (bodyA && !bodyA.isStatic) {
            constraint.pointA = Vector.rotate(pointA, bodyA.angle - constraint.angleA);
            constraint.angleA = bodyA.angle;
        }
        
        // update reference angle
        if (bodyB && !bodyB.isStatic) {
            constraint.pointB = Vector.rotate(pointB, bodyB.angle - constraint.angleB);
            constraint.angleB = bodyB.angle;
        }

        var pointAWorld = pointA,
            pointBWorld = pointB;

        if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
        if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);

        if (!pointAWorld || !pointBWorld)
            return;

        var delta = Vector.sub(pointAWorld, pointBWorld),
            currentLength = Vector.magnitude(delta);

        // prevent singularity
        if (currentLength === 0)
            currentLength = _minLength;

        // solve distance constraint with Gauss-Siedel method
        var difference = (currentLength - constraint.length) / currentLength,
            normal = Vector.div(delta, currentLength),
            force = Vector.mult(delta, difference * 0.5 * constraint.stiffness * timeScale * timeScale);
        
        // if difference is very small, we can skip
        if (Math.abs(1 - (currentLength / constraint.length)) < _minDifference * timeScale)
            return;

        var velocityPointA,
            velocityPointB,
            offsetA,
            offsetB,
            oAn,
            oBn,
            bodyADenom,
            bodyBDenom;
    
        if (bodyA && !bodyA.isStatic) {
            // point body offset
            offsetA = { 
                x: pointAWorld.x - bodyA.position.x + force.x, 
                y: pointAWorld.y - bodyA.position.y + force.y
            };
            
            // update velocity
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            
            // find point velocity and body mass
            velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity));
            oAn = Vector.dot(offsetA, normal);
            bodyADenom = bodyA.inverseMass + bodyA.inverseInertia * oAn * oAn;
        } else {
            velocityPointA = { x: 0, y: 0 };
            bodyADenom = bodyA ? bodyA.inverseMass : 0;
        }
            
        if (bodyB && !bodyB.isStatic) {
            // point body offset
            offsetB = { 
                x: pointBWorld.x - bodyB.position.x - force.x, 
                y: pointBWorld.y - bodyB.position.y - force.y 
            };
            
            // update velocity
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // find point velocity and body mass
            velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity));
            oBn = Vector.dot(offsetB, normal);
            bodyBDenom = bodyB.inverseMass + bodyB.inverseInertia * oBn * oBn;
        } else {
            velocityPointB = { x: 0, y: 0 };
            bodyBDenom = bodyB ? bodyB.inverseMass : 0;
        }
        
        var relativeVelocity = Vector.sub(velocityPointB, velocityPointA),
            normalImpulse = Vector.dot(normal, relativeVelocity) / (bodyADenom + bodyBDenom);
    
        if (normalImpulse > 0) normalImpulse = 0;
    
        var normalVelocity = {
            x: normal.x * normalImpulse, 
            y: normal.y * normalImpulse
        };

        var torque;
 
        if (bodyA && !bodyA.isStatic) {
            torque = Vector.cross(offsetA, normalVelocity) * bodyA.inverseInertia * (1 - constraint.angularStiffness);

            // keep track of applied impulses for post solving
            bodyA.constraintImpulse.x -= force.x;
            bodyA.constraintImpulse.y -= force.y;
            bodyA.constraintImpulse.angle += torque;

            // apply forces
            bodyA.position.x -= force.x;
            bodyA.position.y -= force.y;
            bodyA.angle += torque;
        }

        if (bodyB && !bodyB.isStatic) {
            torque = Vector.cross(offsetB, normalVelocity) * bodyB.inverseInertia * (1 - constraint.angularStiffness);

            // keep track of applied impulses for post solving
            bodyB.constraintImpulse.x += force.x;
            bodyB.constraintImpulse.y += force.y;
            bodyB.constraintImpulse.angle -= torque;
            
            // apply forces
            bodyB.position.x += force.x;
            bodyB.position.y += force.y;
            bodyB.angle -= torque;
        }

    };

    /**
     * Performs body updates required after solving constraints.
     * @private
     * @method postSolveAll
     * @param {body[]} bodies
     */
    Constraint.postSolveAll = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                impulse = body.constraintImpulse;

            if (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0) {
                continue;
            }

            Sleeping.set(body, false);

            // update geometry and reset
            for (var j = 0; j < body.parts.length; j++) {
                var part = body.parts[j];
                
                Vertices.translate(part.vertices, impulse);

                if (j > 0) {
                    part.position.x += impulse.x;
                    part.position.y += impulse.y;
                }

                if (impulse.angle !== 0) {
                    Vertices.rotate(part.vertices, impulse.angle, body.position);
                    Axes.rotate(part.axes, impulse.angle);
                    if (j > 0) {
                        Vector.rotateAbout(part.position, impulse.angle, body.position, part.position);
                    }
                }

                Bounds.update(part.bounds, part.vertices, body.velocity);
            }

            impulse.angle = 0;
            impulse.x = 0;
            impulse.y = 0;
        }
    };

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "constraint"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage bodies.
     *
     * @property label
     * @type string
     * @default "Constraint"
     */

    /**
     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
     *
     * @property render
     * @type object
     */

    /**
     * A flag that indicates if the constraint should be rendered.
     *
     * @property render.visible
     * @type boolean
     * @default true
     */

    /**
     * A `Number` that defines the line width to use when rendering the constraint outline.
     * A value of `0` means no outline will be rendered.
     *
     * @property render.lineWidth
     * @type number
     * @default 2
     */

    /**
     * A `String` that defines the stroke style to use when rendering the constraint outline.
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.strokeStyle
     * @type string
     * @default a random colour
     */

    /**
     * The first possible `Body` that this constraint is attached to.
     *
     * @property bodyA
     * @type body
     * @default null
     */

    /**
     * The second possible `Body` that this constraint is attached to.
     *
     * @property bodyB
     * @type body
     * @default null
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
     *
     * @property pointA
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
     *
     * @property pointB
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that specifies the stiffness of the constraint, i.e. the rate at which it returns to its resting `constraint.length`.
     * A value of `1` means the constraint should be very stiff.
     * A value of `0.2` means the constraint acts like a soft spring.
     *
     * @property stiffness
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the target resting length of the constraint. 
     * It is calculated automatically in `Constraint.create` from initial positions of the `constraint.bodyA` and `constraint.bodyB`.
     *
     * @property length
     * @type number
     */

})();

},{"../core/Common":14,"../core/Sleeping":20,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],13:[function(require,module,exports){
/**
* The `Matter.MouseConstraint` module contains methods for creating mouse constraints.
* Mouse constraints are used for allowing user interaction, providing the ability to move bodies via the mouse or touch.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class MouseConstraint
*/

var MouseConstraint = {};

module.exports = MouseConstraint;

var Vertices = require('../geometry/Vertices');
var Sleeping = require('../core/Sleeping');
var Mouse = require('../core/Mouse');
var Events = require('../core/Events');
var Detector = require('../collision/Detector');
var Constraint = require('./Constraint');
var Composite = require('../body/Composite');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Creates a new mouse constraint.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {engine} engine
     * @param {} options
     * @return {MouseConstraint} A new MouseConstraint
     */
    MouseConstraint.create = function(engine, options) {
        var mouse = (engine ? engine.mouse : null) || (options ? options.mouse : null);

        if (!mouse) {
            if (engine && engine.render && engine.render.canvas) {
                mouse = Mouse.create(engine.render.canvas);
            } else if (options && options.element) {
                mouse = Mouse.create(options.element);
            } else {
                mouse = Mouse.create();
                Common.log('MouseConstraint.create: options.mouse was undefined, options.element was undefined, may not function as expected', 'warn');
            }
        }

        var constraint = Constraint.create({ 
            label: 'Mouse Constraint',
            pointA: mouse.position,
            pointB: { x: 0, y: 0 },
            length: 0.01, 
            stiffness: 0.1,
            angularStiffness: 1,
            render: {
                strokeStyle: '#90EE90',
                lineWidth: 3
            }
        });

        var defaults = {
            type: 'mouseConstraint',
            mouse: mouse,
            element: null,
            body: null,
            constraint: constraint,
            collisionFilter: {
                category: 0x0001,
                mask: 0xFFFFFFFF,
                group: 0
            }
        };

        var mouseConstraint = Common.extend(defaults, options);

        Events.on(engine, 'tick', function() {
            var allBodies = Composite.allBodies(engine.world);
            MouseConstraint.update(mouseConstraint, allBodies);
            _triggerEvents(mouseConstraint);
        });

        return mouseConstraint;
    };

    /**
     * Updates the given mouse constraint.
     * @private
     * @method update
     * @param {MouseConstraint} mouseConstraint
     * @param {body[]} bodies
     */
    MouseConstraint.update = function(mouseConstraint, bodies) {
        var mouse = mouseConstraint.mouse,
            constraint = mouseConstraint.constraint,
            body = mouseConstraint.body;

        if (mouse.button === 0) {
            if (!constraint.bodyB) {
                for (var i = 0; i < bodies.length; i++) {
                    body = bodies[i];
                    if (Bounds.contains(body.bounds, mouse.position) 
                            && Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter)) {
                        for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
                            var part = body.parts[j];
                            if (Vertices.contains(part.vertices, mouse.position)) {
                                constraint.pointA = mouse.position;
                                constraint.bodyB = mouseConstraint.body = body;
                                constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                                constraint.angleB = body.angle;

                                Sleeping.set(body, false);
                                Events.trigger(mouseConstraint, 'startdrag', { mouse: mouse, body: body });

                                break;
                            }
                        }
                    }
                }
            } else {
                Sleeping.set(constraint.bodyB, false);
                constraint.pointA = mouse.position;
            }
        } else {
            constraint.bodyB = mouseConstraint.body = null;
            constraint.pointB = null;

            if (body)
                Events.trigger(mouseConstraint, 'enddrag', { mouse: mouse, body: body });
        }
    };

    /**
     * Triggers mouse constraint events.
     * @method _triggerEvents
     * @private
     * @param {mouse} mouseConstraint
     */
    var _triggerEvents = function(mouseConstraint) {
        var mouse = mouseConstraint.mouse,
            mouseEvents = mouse.sourceEvents;

        if (mouseEvents.mousemove)
            Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });

        if (mouseEvents.mousedown)
            Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });

        if (mouseEvents.mouseup)
            Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });

        // reset the mouse state ready for the next step
        Mouse.clearSourceEvents(mouse);
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when the mouse has moved (or a touch moves) during the last step
    *
    * @event mousemove
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is down (or a touch has started) during the last step
    *
    * @event mousedown
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is up (or a touch has ended) during the last step
    *
    * @event mouseup
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the user starts dragging a body
    *
    * @event startdrag
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {body} event.body The body being dragged
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the user ends dragging a body
    *
    * @event enddrag
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {body} event.body The body that has stopped being dragged
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "constraint"
     * @readOnly
     */

    /**
     * The `Mouse` instance in use. If not supplied in `MouseConstraint.create`, one will be created.
     *
     * @property mouse
     * @type mouse
     * @default mouse
     */

    /**
     * The `Body` that is currently being moved by the user, or `null` if no body.
     *
     * @property body
     * @type body
     * @default null
     */

    /**
     * The `Constraint` object that is used to move the body during interaction.
     *
     * @property constraint
     * @type constraint
     */

    /**
     * An `Object` that specifies the collision filter properties.
     * The collision filter allows the user to define which types of body this mouse constraint can interact with.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter
     * @type object
     */

})();

},{"../body/Composite":2,"../collision/Detector":5,"../core/Common":14,"../core/Events":16,"../core/Mouse":18,"../core/Sleeping":20,"../geometry/Bounds":24,"../geometry/Vertices":27,"./Constraint":12}],14:[function(require,module,exports){
/**
* The `Matter.Common` module contains utility functions that are common to all modules.
*
* @class Common
*/

var Common = {};

module.exports = Common;

(function() {

    Common._nextId = 0;
    Common._seed = 0;

    /**
     * Extends the object in the first argument using the object in the second argument.
     * @method extend
     * @param {} obj
     * @param {boolean} deep
     * @return {} obj extended
     */
    Common.extend = function(obj, deep) {
        var argsStart,
            args,
            deepClone;

        if (typeof deep === 'boolean') {
            argsStart = 2;
            deepClone = deep;
        } else {
            argsStart = 1;
            deepClone = true;
        }

        args = Array.prototype.slice.call(arguments, argsStart);

        for (var i = 0; i < args.length; i++) {
            var source = args[i];

            if (source) {
                for (var prop in source) {
                    if (deepClone && source[prop] && source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            Common.extend(obj[prop], deepClone, source[prop]);
                        } else {
                            obj[prop] = source[prop];
                        }
                    } else {
                        obj[prop] = source[prop];
                    }
                }
            }
        }
        
        return obj;
    };

    /**
     * Creates a new clone of the object, if deep is true references will also be cloned.
     * @method clone
     * @param {} obj
     * @param {bool} deep
     * @return {} obj cloned
     */
    Common.clone = function(obj, deep) {
        return Common.extend({}, deep, obj);
    };

    /**
     * Returns the list of keys for the given object.
     * @method keys
     * @param {} obj
     * @return {string[]} keys
     */
    Common.keys = function(obj) {
        if (Object.keys)
            return Object.keys(obj);

        // avoid hasOwnProperty for performance
        var keys = [];
        for (var key in obj)
            keys.push(key);
        return keys;
    };

    /**
     * Returns the list of values for the given object.
     * @method values
     * @param {} obj
     * @return {array} Array of the objects property values
     */
    Common.values = function(obj) {
        var values = [];
        
        if (Object.keys) {
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                values.push(obj[keys[i]]);
            }
            return values;
        }
        
        // avoid hasOwnProperty for performance
        for (var key in obj)
            values.push(obj[key]);
        return values;
    };

    /**
     * Returns a hex colour string made by lightening or darkening color by percent.
     * @method shadeColor
     * @param {string} color
     * @param {number} percent
     * @return {string} A hex colour
     */
    Common.shadeColor = function(color, percent) {   
        // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
        var colorInteger = parseInt(color.slice(1),16), 
            amount = Math.round(2.55 * percent), 
            R = (colorInteger >> 16) + amount, 
            B = (colorInteger >> 8 & 0x00FF) + amount, 
            G = (colorInteger & 0x0000FF) + amount;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R :255) * 0x10000 
                + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 
                + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    };

    /**
     * Shuffles the given array in-place.
     * The function uses a seeded random generator.
     * @method shuffle
     * @param {array} array
     * @return {array} array shuffled randomly
     */
    Common.shuffle = function(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Common.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };

    /**
     * Randomly chooses a value from a list with equal probability.
     * The function uses a seeded random generator.
     * @method choose
     * @param {array} choices
     * @return {object} A random choice object from the array
     */
    Common.choose = function(choices) {
        return choices[Math.floor(Common.random() * choices.length)];
    };

    /**
     * Returns true if the object is a HTMLElement, otherwise false.
     * @method isElement
     * @param {object} obj
     * @return {boolean} True if the object is a HTMLElement, otherwise false
     */
    Common.isElement = function(obj) {
        // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        try {
            return obj instanceof HTMLElement;
        }
        catch(e){
            return (typeof obj==="object") &&
              (obj.nodeType===1) && (typeof obj.style === "object") &&
              (typeof obj.ownerDocument ==="object");
        }
    };

    /**
     * Returns true if the object is an array.
     * @method isArray
     * @param {object} obj
     * @return {boolean} True if the object is an array, otherwise false
     */
    Common.isArray = function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };
    
    /**
     * Returns the given value clamped between a minimum and maximum value.
     * @method clamp
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @return {number} The value clamped between min and max inclusive
     */
    Common.clamp = function(value, min, max) {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    };
    
    /**
     * Returns the sign of the given value.
     * @method sign
     * @param {number} value
     * @return {number} -1 if negative, +1 if 0 or positive
     */
    Common.sign = function(value) {
        return value < 0 ? -1 : 1;
    };
    
    /**
     * Returns the current timestamp (high-res if available).
     * @method now
     * @return {number} the current timestamp (high-res if available)
     */
    Common.now = function() {
        // http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
        // https://gist.github.com/davidwaterston/2982531

        var performance = window.performance || {};

        performance.now = (function() {
            return performance.now    ||
            performance.webkitNow     ||
            performance.msNow         ||
            performance.oNow          ||
            performance.mozNow        ||
            function() { return +(new Date()); };
        })();
              
        return performance.now();
    };

    
    /**
     * Returns a random value between a minimum and a maximum value inclusive.
     * The function uses a seeded random generator.
     * @method random
     * @param {number} min
     * @param {number} max
     * @return {number} A random number between min and max inclusive
     */
    Common.random = function(min, max) {
        min = (typeof min !== "undefined") ? min : 0;
        max = (typeof max !== "undefined") ? max : 1;
        return min + _seededRandom() * (max - min);
    };

    /**
     * Converts a CSS hex colour string into an integer.
     * @method colorToNumber
     * @param {string} colorString
     * @return {number} An integer representing the CSS hex string
     */
    Common.colorToNumber = function(colorString) {
        colorString = colorString.replace('#','');

        if (colorString.length == 3) {
            colorString = colorString.charAt(0) + colorString.charAt(0)
                        + colorString.charAt(1) + colorString.charAt(1)
                        + colorString.charAt(2) + colorString.charAt(2);
        }

        return parseInt(colorString, 16);
    };

    /**
     * A wrapper for console.log, for providing errors and warnings.
     * @method log
     * @param {string} message
     * @param {string} type
     */
    Common.log = function(message, type) {
        if (!console || !console.log || !console.warn)
            return;

        switch (type) {

        case 'warn':
            console.warn('Matter.js:', message);
            break;
        case 'error':
            console.log('Matter.js:', message);
            break;

        }
    };

    /**
     * Returns the next unique sequential ID.
     * @method nextId
     * @return {Number} Unique sequential ID
     */
    Common.nextId = function() {
        return Common._nextId++;
    };

    /**
     * A cross browser compatible indexOf implementation.
     * @method indexOf
     * @param {array} haystack
     * @param {object} needle
     */
    Common.indexOf = function(haystack, needle) {
        if (haystack.indexOf)
            return haystack.indexOf(needle);

        for (var i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle)
                return i;
        }

        return -1;
    };

    var _seededRandom = function() {
        // https://gist.github.com/ngryman/3830489
        Common._seed = (Common._seed * 9301 + 49297) % 233280;
        return Common._seed / 233280;
    };

})();

},{}],15:[function(require,module,exports){
/**
* The `Matter.Engine` module contains methods for creating and manipulating engines.
* An engine is a controller that manages updating the simulation of the world.
* See `Matter.Runner` for an optional game loop utility.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Engine
*/

var Engine = {};

module.exports = Engine;

var World = require('../body/World');
var Sleeping = require('./Sleeping');
var Resolver = require('../collision/Resolver');
var Render = require('../render/Render');
var Pairs = require('../collision/Pairs');
var Metrics = require('./Metrics');
var Grid = require('../collision/Grid');
var Events = require('./Events');
var Composite = require('../body/Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('./Common');
var Body = require('../body/Body');

(function() {

    /**
     * Creates a new engine. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {object} [options]
     * @return {engine} engine
     */
    Engine.create = function(element, options) {
        // options may be passed as the first (and only) argument
        options = Common.isElement(element) ? options : element;
        element = Common.isElement(element) ? element : null;
        options = options || {};

        if (element || options.render) {
            Common.log('Engine.create: engine.render is deprecated (see docs)', 'warn');
        }

        var defaults = {
            positionIterations: 6,
            velocityIterations: 4,
            constraintIterations: 2,
            enableSleeping: false,
            events: [],
            timing: {
                timestamp: 0,
                timeScale: 1
            },
            broadphase: {
                controller: Grid
            }
        };

        var engine = Common.extend(defaults, options);

        // @deprecated
        if (element || engine.render) {
            var renderDefaults = {
                element: element,
                controller: Render
            };
            
            engine.render = Common.extend(renderDefaults, engine.render);
        }

        // @deprecated
        if (engine.render && engine.render.controller) {
            engine.render = engine.render.controller.create(engine.render);
        }

        // @deprecated
        if (engine.render) {
            engine.render.engine = engine;
        }

        engine.world = options.world || World.create(engine.world);
        engine.pairs = Pairs.create();
        engine.broadphase = engine.broadphase.controller.create(engine.broadphase);
        engine.metrics = engine.metrics || { extended: false };


        return engine;
    };

    /**
     * Moves the simulation forward in time by `delta` ms.
     * The `correction` argument is an optional `Number` that specifies the time correction factor to apply to the update.
     * This can help improve the accuracy of the simulation in cases where `delta` is changing between updates.
     * The value of `correction` is defined as `delta / lastDelta`, i.e. the percentage change of `delta` over the last step.
     * Therefore the value is always `1` (no correction) when `delta` constant (or when no correction is desired, which is the default).
     * See the paper on <a href="http://lonesock.net/article/verlet.html">Time Corrected Verlet</a> for more information.
     *
     * Triggers `beforeUpdate` and `afterUpdate` events.
     * Triggers `collisionStart`, `collisionActive` and `collisionEnd` events.
     * @method update
     * @param {engine} engine
     * @param {number} [delta=16.666]
     * @param {number} [correction=1]
     */
    Engine.update = function(engine, delta, correction) {
        delta = delta || 1000 / 60;
        correction = correction || 1;

        var world = engine.world,
            timing = engine.timing,
            broadphase = engine.broadphase,
            broadphasePairs = [],
            i;

        // increment timestamp
        timing.timestamp += delta * timing.timeScale;

        // create an event object
        var event = {
            timestamp: timing.timestamp
        };

        Events.trigger(engine, 'beforeUpdate', event);

        // get lists of all bodies and constraints, no matter what composites they are in
        var allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world);


        // if sleeping enabled, call the sleeping controller
        if (engine.enableSleeping)
            Sleeping.update(allBodies, timing.timeScale);

        // applies gravity to all bodies
        _bodiesApplyGravity(allBodies, world.gravity);

        // update all body position and rotation by integration
        _bodiesUpdate(allBodies, delta, timing.timeScale, correction, world.bounds);

        // update all constraints
        for (i = 0; i < engine.constraintIterations; i++) {
            Constraint.solveAll(allConstraints, timing.timeScale);
        }
        Constraint.postSolveAll(allBodies);

        // broadphase pass: find potential collision pairs
        if (broadphase.controller) {

            // if world is dirty, we must flush the whole grid
            if (world.isModified)
                broadphase.controller.clear(broadphase);

            // update the grid buckets based on current bodies
            broadphase.controller.update(broadphase, allBodies, engine, world.isModified);
            broadphasePairs = broadphase.pairsList;
        } else {

            // if no broadphase set, we just pass all bodies
            broadphasePairs = allBodies;
        }

        // clear all composite modified flags
        if (world.isModified) {
            Composite.setModified(world, false, false, true);
        }

        // narrowphase pass: find actual collisions, then create or update collision pairs
        var collisions = broadphase.detector(broadphasePairs, engine);

        // update collision pairs
        var pairs = engine.pairs,
            timestamp = timing.timestamp;
        Pairs.update(pairs, collisions, timestamp);
        Pairs.removeOld(pairs, timestamp);

        // wake up bodies involved in collisions
        if (engine.enableSleeping)
            Sleeping.afterCollisions(pairs.list, timing.timeScale);

        // trigger collision events
        if (pairs.collisionStart.length > 0)
            Events.trigger(engine, 'collisionStart', { pairs: pairs.collisionStart });

        // iteratively resolve position between collisions
        Resolver.preSolvePosition(pairs.list);
        for (i = 0; i < engine.positionIterations; i++) {
            Resolver.solvePosition(pairs.list, timing.timeScale);
        }
        Resolver.postSolvePosition(allBodies);

        // iteratively resolve velocity between collisions
        Resolver.preSolveVelocity(pairs.list);
        for (i = 0; i < engine.velocityIterations; i++) {
            Resolver.solveVelocity(pairs.list, timing.timeScale);
        }

        // trigger collision events
        if (pairs.collisionActive.length > 0)
            Events.trigger(engine, 'collisionActive', { pairs: pairs.collisionActive });

        if (pairs.collisionEnd.length > 0)
            Events.trigger(engine, 'collisionEnd', { pairs: pairs.collisionEnd });


        // clear force buffers
        _bodiesClearForces(allBodies);

        Events.trigger(engine, 'afterUpdate', event);

        return engine;
    };
    
    /**
     * Merges two engines by keeping the configuration of `engineA` but replacing the world with the one from `engineB`.
     * @method merge
     * @param {engine} engineA
     * @param {engine} engineB
     */
    Engine.merge = function(engineA, engineB) {
        Common.extend(engineA, engineB);
        
        if (engineB.world) {
            engineA.world = engineB.world;

            Engine.clear(engineA);

            var bodies = Composite.allBodies(engineA.world);

            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                Sleeping.set(body, false);
                body.id = Common.nextId();
            }
        }
    };

    /**
     * Clears the engine including the world, pairs and broadphase.
     * @method clear
     * @param {engine} engine
     */
    Engine.clear = function(engine) {
        var world = engine.world;
        
        Pairs.clear(engine.pairs);

        var broadphase = engine.broadphase;
        if (broadphase.controller) {
            var bodies = Composite.allBodies(world);
            broadphase.controller.clear(broadphase);
            broadphase.controller.update(broadphase, bodies, engine, true);
        }
    };

    /**
     * Zeroes the `body.force` and `body.torque` force buffers.
     * @method bodiesClearForces
     * @private
     * @param {body[]} bodies
     */
    var _bodiesClearForces = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            // reset force buffers
            body.force.x = 0;
            body.force.y = 0;
            body.torque = 0;
        }
    };

    /**
     * Applys a mass dependant force to all given bodies.
     * @method bodiesApplyGravity
     * @private
     * @param {body[]} bodies
     * @param {vector} gravity
     */
    var _bodiesApplyGravity = function(bodies, gravity) {
        var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;

        if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
            return;
        }
        
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            // apply gravity
            body.force.y += body.mass * gravity.y * gravityScale;
            body.force.x += body.mass * gravity.x * gravityScale;
        }
    };

    /**
     * Applys `Body.update` to all given `bodies`.
     * @method updateAll
     * @private
     * @param {body[]} bodies
     * @param {number} deltaTime 
     * The amount of time elapsed between updates
     * @param {number} timeScale
     * @param {number} correction 
     * The Verlet correction factor (deltaTime / lastDeltaTime)
     * @param {bounds} worldBounds
     */
    var _bodiesUpdate = function(bodies, deltaTime, timeScale, correction, worldBounds) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            Body.update(body, deltaTime, timeScale, correction);
        }
    };

    /**
     * An alias for `Runner.run`, see `Matter.Runner` for more information.
     * @method run
     * @param {engine} engine
     */

    /**
    * Fired just before an update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update and all collision events
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have started to collide in the current tick (if any)
    *
    * @event collisionStart
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that are colliding in the current tick (if any)
    *
    * @event collisionActive
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have ended collision in the current tick (if any)
    *
    * @event collisionEnd
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` that specifies the number of position iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property positionIterations
     * @type number
     * @default 6
     */

    /**
     * An integer `Number` that specifies the number of velocity iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property velocityIterations
     * @type number
     * @default 4
     */

    /**
     * An integer `Number` that specifies the number of constraint iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     * The default value of `2` is usually very adequate.
     *
     * @property constraintIterations
     * @type number
     * @default 2
     */

    /**
     * A flag that specifies whether the engine should allow sleeping via the `Matter.Sleeping` module.
     * Sleeping can improve stability and performance, but often at the expense of accuracy.
     *
     * @property enableSleeping
     * @type boolean
     * @default false
     */

    /**
     * An `Object` containing properties regarding the timing systems of the engine. 
     *
     * @property timing
     * @type object
     */

    /**
     * A `Number` that specifies the global scaling factor of time for all bodies.
     * A value of `0` freezes the simulation.
     * A value of `0.1` gives a slow-motion effect.
     * A value of `1.2` gives a speed-up effect.
     *
     * @property timing.timeScale
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the current simulation-time in milliseconds starting from `0`. 
     * It is incremented on every `Engine.update` by the given `delta` argument. 
     *
     * @property timing.timestamp
     * @type number
     * @default 0
     */

    /**
     * An instance of a `Render` controller. The default value is a `Matter.Render` instance created by `Engine.create`.
     * One may also develop a custom renderer module based on `Matter.Render` and pass an instance of it to `Engine.create` via `options.render`.
     *
     * A minimal custom renderer object must define at least three functions: `create`, `clear` and `world` (see `Matter.Render`).
     * It is also possible to instead pass the _module_ reference via `options.render.controller` and `Engine.create` will instantiate one for you.
     *
     * @property render
     * @type render
     * @deprecated see Demo.js for an example of creating a renderer
     * @default a Matter.Render instance
     */

    /**
     * An instance of a broadphase controller. The default value is a `Matter.Grid` instance created by `Engine.create`.
     *
     * @property broadphase
     * @type grid
     * @default a Matter.Grid instance
     */

    /**
     * A `World` composite object that will contain all simulated bodies and constraints.
     *
     * @property world
     * @type world
     * @default a Matter.World instance
     */

})();

},{"../body/Body":1,"../body/Composite":2,"../body/World":3,"../collision/Grid":6,"../collision/Pairs":8,"../collision/Resolver":10,"../constraint/Constraint":12,"../render/Render":29,"./Common":14,"./Events":16,"./Metrics":17,"./Sleeping":20}],16:[function(require,module,exports){
/**
* The `Matter.Events` module contains methods to fire and listen to events on other objects.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Events
*/

var Events = {};

module.exports = Events;

var Common = require('./Common');

(function() {

    /**
     * Subscribes a callback function to the given object's `eventName`.
     * @method on
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.on = function(object, eventNames, callback) {
        var names = eventNames.split(' '),
            name;

        for (var i = 0; i < names.length; i++) {
            name = names[i];
            object.events = object.events || {};
            object.events[name] = object.events[name] || [];
            object.events[name].push(callback);
        }

        return callback;
    };

    /**
     * Removes the given event callback. If no callback, clears all callbacks in `eventNames`. If no `eventNames`, clears all events.
     * @method off
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.off = function(object, eventNames, callback) {
        if (!eventNames) {
            object.events = {};
            return;
        }

        // handle Events.off(object, callback)
        if (typeof eventNames === 'function') {
            callback = eventNames;
            eventNames = Common.keys(object.events).join(' ');
        }

        var names = eventNames.split(' ');

        for (var i = 0; i < names.length; i++) {
            var callbacks = object.events[names[i]],
                newCallbacks = [];

            if (callback && callbacks) {
                for (var j = 0; j < callbacks.length; j++) {
                    if (callbacks[j] !== callback)
                        newCallbacks.push(callbacks[j]);
                }
            }

            object.events[names[i]] = newCallbacks;
        }
    };

    /**
     * Fires all the callbacks subscribed to the given object's `eventName`, in the order they subscribed, if any.
     * @method trigger
     * @param {} object
     * @param {string} eventNames
     * @param {} event
     */
    Events.trigger = function(object, eventNames, event) {
        var names,
            name,
            callbacks,
            eventClone;

        if (object.events) {
            if (!event)
                event = {};

            names = eventNames.split(' ');

            for (var i = 0; i < names.length; i++) {
                name = names[i];
                callbacks = object.events[name];

                if (callbacks) {
                    eventClone = Common.clone(event, false);
                    eventClone.name = name;
                    eventClone.source = object;

                    for (var j = 0; j < callbacks.length; j++) {
                        callbacks[j].apply(object, [eventClone]);
                    }
                }
            }
        }
    };

})();

},{"./Common":14}],17:[function(require,module,exports){

},{"../body/Composite":2,"./Common":14}],18:[function(require,module,exports){
/**
* The `Matter.Mouse` module contains methods for creating and manipulating mouse inputs.
*
* @class Mouse
*/

var Mouse = {};

module.exports = Mouse;

var Common = require('../core/Common');

(function() {

    /**
     * Creates a mouse input.
     * @method create
     * @param {HTMLElement} element
     * @return {mouse} A new mouse
     */
    Mouse.create = function(element) {
        var mouse = {};

        if (!element) {
            Common.log('Mouse.create: element was undefined, defaulting to document.body', 'warn');
        }
        
        mouse.element = element || document.body;
        mouse.absolute = { x: 0, y: 0 };
        mouse.position = { x: 0, y: 0 };
        mouse.mousedownPosition = { x: 0, y: 0 };
        mouse.mouseupPosition = { x: 0, y: 0 };
        mouse.offset = { x: 0, y: 0 };
        mouse.scale = { x: 1, y: 1 };
        mouse.wheelDelta = 0;
        mouse.button = -1;
        mouse.pixelRatio = mouse.element.getAttribute('data-pixel-ratio') || 1;

        mouse.sourceEvents = {
            mousemove: null,
            mousedown: null,
            mouseup: null,
            mousewheel: null
        };
        
        mouse.mousemove = function(event) { 
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.sourceEvents.mousemove = event;
        };
        
        mouse.mousedown = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            } else {
                mouse.button = event.button;
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mousedownPosition.x = mouse.position.x;
            mouse.mousedownPosition.y = mouse.position.y;
            mouse.sourceEvents.mousedown = event;
        };
        
        mouse.mouseup = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                event.preventDefault();
            }
            
            mouse.button = -1;
            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mouseupPosition.x = mouse.position.x;
            mouse.mouseupPosition.y = mouse.position.y;
            mouse.sourceEvents.mouseup = event;
        };

        mouse.mousewheel = function(event) {
            mouse.wheelDelta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
            event.preventDefault();
        };

        Mouse.setElement(mouse, mouse.element);

        return mouse;
    };

    /**
     * Sets the element the mouse is bound to (and relative to).
     * @method setElement
     * @param {mouse} mouse
     * @param {HTMLElement} element
     */
    Mouse.setElement = function(mouse, element) {
        mouse.element = element;

        element.addEventListener('mousemove', mouse.mousemove);
        element.addEventListener('mousedown', mouse.mousedown);
        element.addEventListener('mouseup', mouse.mouseup);
        
        element.addEventListener('mousewheel', mouse.mousewheel);
        element.addEventListener('DOMMouseScroll', mouse.mousewheel);

        element.addEventListener('touchmove', mouse.mousemove);
        element.addEventListener('touchstart', mouse.mousedown);
        element.addEventListener('touchend', mouse.mouseup);
    };

    /**
     * Clears all captured source events.
     * @method clearSourceEvents
     * @param {mouse} mouse
     */
    Mouse.clearSourceEvents = function(mouse) {
        mouse.sourceEvents.mousemove = null;
        mouse.sourceEvents.mousedown = null;
        mouse.sourceEvents.mouseup = null;
        mouse.sourceEvents.mousewheel = null;
        mouse.wheelDelta = 0;
    };

    /**
     * Sets the mouse position offset.
     * @method setOffset
     * @param {mouse} mouse
     * @param {vector} offset
     */
    Mouse.setOffset = function(mouse, offset) {
        mouse.offset.x = offset.x;
        mouse.offset.y = offset.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };

    /**
     * Sets the mouse position scale.
     * @method setScale
     * @param {mouse} mouse
     * @param {vector} scale
     */
    Mouse.setScale = function(mouse, scale) {
        mouse.scale.x = scale.x;
        mouse.scale.y = scale.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };
    
    /**
     * Gets the mouse position relative to an element given a screen pixel ratio.
     * @method _getRelativeMousePosition
     * @private
     * @param {} event
     * @param {} element
     * @param {number} pixelRatio
     * @return {}
     */
    var _getRelativeMousePosition = function(event, element, pixelRatio) {
        var elementBounds = element.getBoundingClientRect(),
            rootNode = (document.documentElement || document.body.parentNode || document.body),
            scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft,
            scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop,
            touches = event.changedTouches,
            x, y;
        
        if (touches) {
            x = touches[0].pageX - elementBounds.left - scrollX;
            y = touches[0].pageY - elementBounds.top - scrollY;
        } else {
            x = event.pageX - elementBounds.left - scrollX;
            y = event.pageY - elementBounds.top - scrollY;
        }

        return { 
            x: x / (element.clientWidth / element.width * pixelRatio),
            y: y / (element.clientHeight / element.height * pixelRatio)
        };
    };

})();

},{"../core/Common":14}],19:[function(require,module,exports){
/**
* The `Matter.Runner` module is an optional utility which provides a game loop, 
* that handles continuously updating a `Matter.Engine` for you within a browser.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* If you are using your own game loop instead, then you do not need the `Matter.Runner` module.
* Instead just call `Engine.update(engine, delta)` in your own loop.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Runner
*/

var Runner = {};

module.exports = Runner;

var Events = require('./Events');
var Engine = require('./Engine');
var Common = require('./Common');

(function() {

    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }

    /**
     * Creates a new Runner. The options parameter is an object that specifies any properties you wish to override the defaults.
     * @method create
     * @param {} options
     */
    Runner.create = function(options) {
        var defaults = {
            fps: 60,
            correction: 1,
            deltaSampleSize: 60,
            counterTimestamp: 0,
            frameCounter: 0,
            deltaHistory: [],
            timePrev: null,
            timeScalePrev: 1,
            frameRequestId: null,
            isFixed: false,
            enabled: true
        };

        var runner = Common.extend(defaults, options);

        runner.delta = runner.delta || 1000 / runner.fps;
        runner.deltaMin = runner.deltaMin || 1000 / runner.fps;
        runner.deltaMax = runner.deltaMax || 1000 / (runner.fps * 0.5);
        runner.fps = 1000 / runner.delta;

        return runner;
    };

    /**
     * Continuously ticks a `Matter.Engine` by calling `Runner.tick` on the `requestAnimationFrame` event.
     * @method run
     * @param {engine} engine
     */
    Runner.run = function(runner, engine) {
        // create runner if engine is first argument
        if (typeof runner.positionIterations !== 'undefined') {
            engine = runner;
            runner = Runner.create();
        }

        (function render(time){
            runner.frameRequestId = _requestAnimationFrame(render);

            if (time && runner.enabled) {
                Runner.tick(runner, engine, time);
            }
        })();

        return runner;
    };

    /**
     * A game loop utility that updates the engine and renderer by one step (a 'tick').
     * Features delta smoothing, time correction and fixed or dynamic timing.
     * Triggers `beforeTick`, `tick` and `afterTick` events on the engine.
     * Consider just `Engine.update(engine, delta)` if you're using your own loop.
     * @method tick
     * @param {runner} runner
     * @param {engine} engine
     * @param {number} time
     */
    Runner.tick = function(runner, engine, time) {
        var timing = engine.timing,
            correction = 1,
            delta;

        // create an event object
        var event = {
            timestamp: timing.timestamp
        };

        Events.trigger(runner, 'beforeTick', event);
        Events.trigger(engine, 'beforeTick', event); // @deprecated

        if (runner.isFixed) {
            // fixed timestep
            delta = runner.delta;
        } else {
            // dynamic timestep based on wall clock between calls
            delta = (time - runner.timePrev) || runner.delta;
            runner.timePrev = time;

            // optimistically filter delta over a few frames, to improve stability
            runner.deltaHistory.push(delta);
            runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize);
            delta = Math.min.apply(null, runner.deltaHistory);
            
            // limit delta
            delta = delta < runner.deltaMin ? runner.deltaMin : delta;
            delta = delta > runner.deltaMax ? runner.deltaMax : delta;

            // correction for delta
            correction = delta / runner.delta;

            // update engine timing object
            runner.delta = delta;
        }

        // time correction for time scaling
        if (runner.timeScalePrev !== 0)
            correction *= timing.timeScale / runner.timeScalePrev;

        if (timing.timeScale === 0)
            correction = 0;

        runner.timeScalePrev = timing.timeScale;
        runner.correction = correction;

        // fps counter
        runner.frameCounter += 1;
        if (time - runner.counterTimestamp >= 1000) {
            runner.fps = runner.frameCounter * ((time - runner.counterTimestamp) / 1000);
            runner.counterTimestamp = time;
            runner.frameCounter = 0;
        }

        Events.trigger(runner, 'tick', event);
        Events.trigger(engine, 'tick', event); // @deprecated

        // if world has been modified, clear the render scene graph
        if (engine.world.isModified 
            && engine.render
            && engine.render.controller
            && engine.render.controller.clear) {
            engine.render.controller.clear(engine.render);
        }

        // update
        Events.trigger(runner, 'beforeUpdate', event);
        Engine.update(engine, delta, correction);
        Events.trigger(runner, 'afterUpdate', event);

        // render
        // @deprecated
        if (engine.render && engine.render.controller) {
            Events.trigger(runner, 'beforeRender', event);
            Events.trigger(engine, 'beforeRender', event); // @deprecated

            engine.render.controller.world(engine.render);

            Events.trigger(runner, 'afterRender', event);
            Events.trigger(engine, 'afterRender', event); // @deprecated
        }

        Events.trigger(runner, 'afterTick', event);
        Events.trigger(engine, 'afterTick', event); // @deprecated
    };

    /**
     * Ends execution of `Runner.run` on the given `runner`, by canceling the animation frame request event loop.
     * If you wish to only temporarily pause the engine, see `engine.enabled` instead.
     * @method stop
     * @param {runner} runner
     */
    Runner.stop = function(runner) {
        _cancelAnimationFrame(runner.frameRequestId);
    };

    /**
     * Alias for `Runner.run`.
     * @method start
     * @param {runner} runner
     * @param {engine} engine
     */
    Runner.start = function(runner, engine) {
        Runner.run(runner, engine);
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired at the start of a tick, before any updates to the engine or timing
    *
    * @event beforeTick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine timing updated, but just before update
    *
    * @event tick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired at the end of a tick, after engine update and after rendering
    *
    * @event afterTick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired before update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after update
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired before rendering
    *
    * @event beforeRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    * @deprecated
    */

    /**
    * Fired after rendering
    *
    * @event afterRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    * @deprecated
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A flag that specifies whether the runner is running or not.
     *
     * @property enabled
     * @type boolean
     * @default true
     */

    /**
     * A `Boolean` that specifies if the runner should use a fixed timestep (otherwise it is variable).
     * If timing is fixed, then the apparent simulation speed will change depending on the frame rate (but behaviour will be deterministic).
     * If the timing is variable, then the apparent simulation speed will be constant (approximately, but at the cost of determininism).
     *
     * @property isFixed
     * @type boolean
     * @default false
     */

    /**
     * A `Number` that specifies the time step between updates in milliseconds.
     * If `engine.timing.isFixed` is set to `true`, then `delta` is fixed.
     * If it is `false`, then `delta` can dynamically change to maintain the correct apparent simulation speed.
     *
     * @property delta
     * @type number
     * @default 1000 / 60
     */

})();

},{"./Common":14,"./Engine":15,"./Events":16}],20:[function(require,module,exports){
/**
* The `Matter.Sleeping` module contains methods to manage the sleeping state of bodies.
*
* @class Sleeping
*/

var Sleeping = {};

module.exports = Sleeping;

var Events = require('./Events');

(function() {

    Sleeping._motionWakeThreshold = 0.18;
    Sleeping._motionSleepThreshold = 0.08;
    Sleeping._minBias = 0.9;

    /**
     * Puts bodies to sleep or wakes them up depending on their motion.
     * @method update
     * @param {body[]} bodies
     * @param {number} timeScale
     */
    Sleeping.update = function(bodies, timeScale) {
        var timeFactor = timeScale * timeScale * timeScale;

        // update bodies sleeping status
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                motion = body.speed * body.speed + body.angularSpeed * body.angularSpeed;

            // wake up bodies if they have a force applied
            if (body.force.x !== 0 || body.force.y !== 0) {
                Sleeping.set(body, false);
                continue;
            }

            var minMotion = Math.min(body.motion, motion),
                maxMotion = Math.max(body.motion, motion);
        
            // biased average motion estimation between frames
            body.motion = Sleeping._minBias * minMotion + (1 - Sleeping._minBias) * maxMotion;
            
            if (body.sleepThreshold > 0 && body.motion < Sleeping._motionSleepThreshold * timeFactor) {
                body.sleepCounter += 1;
                
                if (body.sleepCounter >= body.sleepThreshold)
                    Sleeping.set(body, true);
            } else if (body.sleepCounter > 0) {
                body.sleepCounter -= 1;
            }
        }
    };

    /**
     * Given a set of colliding pairs, wakes the sleeping bodies involved.
     * @method afterCollisions
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Sleeping.afterCollisions = function(pairs, timeScale) {
        var timeFactor = timeScale * timeScale * timeScale;

        // wake up bodies involved in collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            // don't wake inactive pairs
            if (!pair.isActive)
                continue;

            var collision = pair.collision,
                bodyA = collision.bodyA.parent, 
                bodyB = collision.bodyB.parent;
        
            // don't wake if at least one body is static
            if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
                continue;
        
            if (bodyA.isSleeping || bodyB.isSleeping) {
                var sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                    movingBody = sleepingBody === bodyA ? bodyB : bodyA;

                if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) {
                    Sleeping.set(sleepingBody, false);
                }
            }
        }
    };
  
    /**
     * Set a body as sleeping or awake.
     * @method set
     * @param {body} body
     * @param {boolean} isSleeping
     */
    Sleeping.set = function(body, isSleeping) {
        var wasSleeping = body.isSleeping;

        if (isSleeping) {
            body.isSleeping = true;
            body.sleepCounter = body.sleepThreshold;

            body.positionImpulse.x = 0;
            body.positionImpulse.y = 0;

            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;

            body.anglePrev = body.angle;
            body.speed = 0;
            body.angularSpeed = 0;
            body.motion = 0;

            if (!wasSleeping) {
                Events.trigger(body, 'sleepStart');
            }
        } else {
            body.isSleeping = false;
            body.sleepCounter = 0;

            if (wasSleeping) {
                Events.trigger(body, 'sleepEnd');
            }
        }
    };

})();

},{"./Events":16}],21:[function(require,module,exports){
/**
* The `Matter.Bodies` module contains factory methods for creating rigid body models 
* with commonly used body configurations (such as rectangles, circles and other polygons).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Bodies
*/

// TODO: true circle bodies

var Bodies = {};

module.exports = Bodies;

var Vertices = require('../geometry/Vertices');
var Common = require('../core/Common');
var Body = require('../body/Body');
var Bounds = require('../geometry/Bounds');
var Vector = require('../geometry/Vector');

(function() {

    /**
     * Creates a new rigid body model with a rectangle hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method rectangle
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {object} [options]
     * @return {body} A new rectangle body
     */
    Bodies.rectangle = function(x, y, width, height, options) {
        options = options || {};

        var rectangle = { 
            label: 'Rectangle Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath('L 0 0 L ' + width + ' 0 L ' + width + ' ' + height + ' L 0 ' + height)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            rectangle.vertices = Vertices.chamfer(rectangle.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, rectangle, options));
    };
    
    /**
     * Creates a new rigid body model with a trapezoid hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method trapezoid
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} slope
     * @param {object} [options]
     * @return {body} A new trapezoid body
     */
    Bodies.trapezoid = function(x, y, width, height, slope, options) {
        options = options || {};

        slope *= 0.5;
        var roof = (1 - (slope * 2)) * width;
        
        var x1 = width * slope,
            x2 = x1 + roof,
            x3 = x2 + x1,
            verticesPath;

        if (slope < 0.5) {
            verticesPath = 'L 0 0 L ' + x1 + ' ' + (-height) + ' L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
        } else {
            verticesPath = 'L 0 0 L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
        }

        var trapezoid = { 
            label: 'Trapezoid Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath(verticesPath)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            trapezoid.vertices = Vertices.chamfer(trapezoid.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, trapezoid, options));
    };

    /**
     * Creates a new rigid body model with a circle hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method circle
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {object} [options]
     * @param {number} [maxSides]
     * @return {body} A new circle body
     */
    Bodies.circle = function(x, y, radius, options, maxSides) {
        options = options || {};

        var circle = {
            label: 'Circle Body',
            circleRadius: radius
        };
        
        // approximate circles with polygons until true circles implemented in SAT
        maxSides = maxSides || 25;
        var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

        // optimisation: always use even number of sides (half the number of unique axes)
        if (sides % 2 === 1)
            sides += 1;

        return Bodies.polygon(x, y, sides, radius, Common.extend({}, circle, options));
    };

    /**
     * Creates a new rigid body model with a regular polygon hull with the given number of sides. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method polygon
     * @param {number} x
     * @param {number} y
     * @param {number} sides
     * @param {number} radius
     * @param {object} [options]
     * @return {body} A new regular polygon body
     */
    Bodies.polygon = function(x, y, sides, radius, options) {
        options = options || {};

        if (sides < 3)
            return Bodies.circle(x, y, radius, options);

        var theta = 2 * Math.PI / sides,
            path = '',
            offset = theta * 0.5;

        for (var i = 0; i < sides; i += 1) {
            var angle = offset + (i * theta),
                xx = Math.cos(angle) * radius,
                yy = Math.sin(angle) * radius;

            path += 'L ' + xx.toFixed(3) + ' ' + yy.toFixed(3) + ' ';
        }

        var polygon = { 
            label: 'Polygon Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath(path)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            polygon.vertices = Vertices.chamfer(polygon.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, polygon, options));
    };

    /**
     * Creates a body using the supplied vertices (or an array containing multiple sets of vertices).
     * If the vertices are convex, they will pass through as supplied.
     * Otherwise if the vertices are concave, they will be decomposed if [poly-decomp.js](https://github.com/schteppe/poly-decomp.js) is available.
     * Note that this process is not guaranteed to support complex sets of vertices (e.g. those with holes may fail).
     * By default the decomposition will discard collinear edges (to improve performance).
     * It can also optionally discard any parts that have an area less than `minimumArea`.
     * If the vertices can not be decomposed, the result will fall back to using the convex hull.
     * The options parameter is an object that specifies any `Matter.Body` properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method fromVertices
     * @param {number} x
     * @param {number} y
     * @param [[vector]] vertexSets
     * @param {object} [options]
     * @param {bool} [flagInternal=false]
     * @param {number} [removeCollinear=0.01]
     * @param {number} [minimumArea=10]
     * @return {body}
     */
    Bodies.fromVertices = function(x, y, vertexSets, options, flagInternal, removeCollinear, minimumArea) {
        var body,
            parts,
            isConvex,
            vertices,
            i,
            j,
            k,
            v,
            z;

        options = options || {};
        parts = [];

        flagInternal = typeof flagInternal !== 'undefined' ? flagInternal : false;
        removeCollinear = typeof removeCollinear !== 'undefined' ? removeCollinear : 0.01;
        minimumArea = typeof minimumArea !== 'undefined' ? minimumArea : 10;

        if (!window.decomp) {
            Common.log('Bodies.fromVertices: poly-decomp.js required. Could not decompose vertices. Fallback to convex hull.', 'warn');
        }

        // ensure vertexSets is an array of arrays
        if (!Common.isArray(vertexSets[0])) {
            vertexSets = [vertexSets];
        }

        for (v = 0; v < vertexSets.length; v += 1) {
            vertices = vertexSets[v];
            isConvex = Vertices.isConvex(vertices);

            if (isConvex || !window.decomp) {
                if (isConvex) {
                    vertices = Vertices.clockwiseSort(vertices);
                } else {
                    // fallback to convex hull when decomposition is not possible
                    vertices = Vertices.hull(vertices);
                }

                parts.push({
                    position: { x: x, y: y },
                    vertices: vertices
                });
            } else {
                // initialise a decomposition
                var concave = new decomp.Polygon();
                for (i = 0; i < vertices.length; i++) {
                    concave.vertices.push([vertices[i].x, vertices[i].y]);
                }

                // vertices are concave and simple, we can decompose into parts
                concave.makeCCW();
                if (removeCollinear !== false)
                    concave.removeCollinearPoints(removeCollinear);

                // use the quick decomposition algorithm (Bayazit)
                var decomposed = concave.quickDecomp();

                // for each decomposed chunk
                for (i = 0; i < decomposed.length; i++) {
                    var chunk = decomposed[i],
                        chunkVertices = [];

                    // convert vertices into the correct structure
                    for (j = 0; j < chunk.vertices.length; j++) {
                        chunkVertices.push({ x: chunk.vertices[j][0], y: chunk.vertices[j][1] });
                    }

                    // skip small chunks
                    if (minimumArea > 0 && Vertices.area(chunkVertices) < minimumArea)
                        continue;

                    // create a compound part
                    parts.push({
                        position: Vertices.centre(chunkVertices),
                        vertices: chunkVertices
                    });
                }
            }
        }

        // create body parts
        for (i = 0; i < parts.length; i++) {
            parts[i] = Body.create(Common.extend(parts[i], options));
        }

        // flag internal edges (coincident part edges)
        if (flagInternal) {
            var coincident_max_dist = 5;

            for (i = 0; i < parts.length; i++) {
                var partA = parts[i];

                for (j = i + 1; j < parts.length; j++) {
                    var partB = parts[j];

                    if (Bounds.overlaps(partA.bounds, partB.bounds)) {
                        var pav = partA.vertices,
                            pbv = partB.vertices;

                        // iterate vertices of both parts
                        for (k = 0; k < partA.vertices.length; k++) {
                            for (z = 0; z < partB.vertices.length; z++) {
                                // find distances between the vertices
                                var da = Vector.magnitudeSquared(Vector.sub(pav[(k + 1) % pav.length], pbv[z])),
                                    db = Vector.magnitudeSquared(Vector.sub(pav[k], pbv[(z + 1) % pbv.length]));

                                // if both vertices are very close, consider the edge concident (internal)
                                if (da < coincident_max_dist && db < coincident_max_dist) {
                                    pav[k].isInternal = true;
                                    pbv[z].isInternal = true;
                                }
                            }
                        }

                    }
                }
            }
        }

        if (parts.length > 1) {
            // create the parent body to be returned, that contains generated compound parts
            body = Body.create(Common.extend({ parts: parts.slice(0) }, options));
            Body.setPosition(body, { x: x, y: y });

            return body;
        } else {
            return parts[0];
        }
    };

})();
},{"../body/Body":1,"../core/Common":14,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],22:[function(require,module,exports){
/**
* The `Matter.Composites` module contains factory methods for creating composite bodies
* with commonly used configurations (such as stacks and chains).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Composites
*/

var Composites = {};

module.exports = Composites;

var Composite = require('../body/Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('../core/Common');
var Body = require('../body/Body');
var Bodies = require('./Bodies');

(function() {

    /**
     * Create a new composite containing bodies created in the callback in a grid arrangement.
     * This function uses the body's bounds to prevent overlaps.
     * @method stack
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.stack = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        var stack = Composite.create({ label: 'Stack' }),
            x = xx,
            y = yy,
            lastBody,
            i = 0;

        for (var row = 0; row < rows; row++) {
            var maxHeight = 0;
            
            for (var column = 0; column < columns; column++) {
                var body = callback(x, y, column, row, lastBody, i);
                    
                if (body) {
                    var bodyHeight = body.bounds.max.y - body.bounds.min.y,
                        bodyWidth = body.bounds.max.x - body.bounds.min.x; 

                    if (bodyHeight > maxHeight)
                        maxHeight = bodyHeight;
                    
                    Body.translate(body, { x: bodyWidth * 0.5, y: bodyHeight * 0.5 });

                    x = body.bounds.max.x + columnGap;

                    Composite.addBody(stack, body);
                    
                    lastBody = body;
                    i += 1;
                } else {
                    x += columnGap;
                }
            }
            
            y += maxHeight + rowGap;
            x = xx;
        }

        return stack;
    };
    
    /**
     * Chains all bodies in the given composite together using constraints.
     * @method chain
     * @param {composite} composite
     * @param {number} xOffsetA
     * @param {number} yOffsetA
     * @param {number} xOffsetB
     * @param {number} yOffsetB
     * @param {object} options
     * @return {composite} A new composite containing objects chained together with constraints
     */
    Composites.chain = function(composite, xOffsetA, yOffsetA, xOffsetB, yOffsetB, options) {
        var bodies = composite.bodies;
        
        for (var i = 1; i < bodies.length; i++) {
            var bodyA = bodies[i - 1],
                bodyB = bodies[i],
                bodyAHeight = bodyA.bounds.max.y - bodyA.bounds.min.y,
                bodyAWidth = bodyA.bounds.max.x - bodyA.bounds.min.x, 
                bodyBHeight = bodyB.bounds.max.y - bodyB.bounds.min.y,
                bodyBWidth = bodyB.bounds.max.x - bodyB.bounds.min.x;
        
            var defaults = {
                bodyA: bodyA,
                pointA: { x: bodyAWidth * xOffsetA, y: bodyAHeight * yOffsetA },
                bodyB: bodyB,
                pointB: { x: bodyBWidth * xOffsetB, y: bodyBHeight * yOffsetB }
            };
            
            var constraint = Common.extend(defaults, options);
        
            Composite.addConstraint(composite, Constraint.create(constraint));
        }

        composite.label += ' Chain';
        
        return composite;
    };

    /**
     * Connects bodies in the composite with constraints in a grid pattern, with optional cross braces.
     * @method mesh
     * @param {composite} composite
     * @param {number} columns
     * @param {number} rows
     * @param {boolean} crossBrace
     * @param {object} options
     * @return {composite} The composite containing objects meshed together with constraints
     */
    Composites.mesh = function(composite, columns, rows, crossBrace, options) {
        var bodies = composite.bodies,
            row,
            col,
            bodyA,
            bodyB,
            bodyC;
        
        for (row = 0; row < rows; row++) {
            for (col = 1; col < columns; col++) {
                bodyA = bodies[(col - 1) + (row * columns)];
                bodyB = bodies[col + (row * columns)];
                Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));
            }

            if (row > 0) {
                for (col = 0; col < columns; col++) {
                    bodyA = bodies[col + ((row - 1) * columns)];
                    bodyB = bodies[col + (row * columns)];
                    Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));

                    if (crossBrace && col > 0) {
                        bodyC = bodies[(col - 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }

                    if (crossBrace && col < columns - 1) {
                        bodyC = bodies[(col + 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }
                }
            }
        }

        composite.label += ' Mesh';
        
        return composite;
    };
    
    /**
     * Create a new composite containing bodies created in the callback in a pyramid arrangement.
     * This function uses the body's bounds to prevent overlaps.
     * @method pyramid
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.pyramid = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        return Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y, column, row, lastBody, i) {
            var actualRows = Math.min(rows, Math.ceil(columns / 2)),
                lastBodyWidth = lastBody ? lastBody.bounds.max.x - lastBody.bounds.min.x : 0;
            
            if (row > actualRows)
                return;
            
            // reverse row order
            row = actualRows - row;
            
            var start = row,
                end = columns - 1 - row;

            if (column < start || column > end)
                return;
            
            // retroactively fix the first body's position, since width was unknown
            if (i === 1) {
                Body.translate(lastBody, { x: (column + (columns % 2 === 1 ? 1 : -1)) * lastBodyWidth, y: 0 });
            }

            var xOffset = lastBody ? column * lastBodyWidth : 0;
            
            return callback(xx + xOffset + column * columnGap, y, column, row, lastBody, i);
        });
    };

    /**
     * Creates a composite with a Newton's Cradle setup of bodies and constraints.
     * @method newtonsCradle
     * @param {number} xx
     * @param {number} yy
     * @param {number} number
     * @param {number} size
     * @param {number} length
     * @return {composite} A new composite newtonsCradle body
     */
    Composites.newtonsCradle = function(xx, yy, number, size, length) {
        var newtonsCradle = Composite.create({ label: 'Newtons Cradle' });

        for (var i = 0; i < number; i++) {
            var separation = 1.9,
                circle = Bodies.circle(xx + i * (size * separation), yy + length, size, 
                            { inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0.0001, slop: 1 }),
                constraint = Constraint.create({ pointA: { x: xx + i * (size * separation), y: yy }, bodyB: circle });

            Composite.addBody(newtonsCradle, circle);
            Composite.addConstraint(newtonsCradle, constraint);
        }

        return newtonsCradle;
    };
    
    /**
     * Creates a composite with simple car setup of bodies and constraints.
     * @method car
     * @param {number} xx
     * @param {number} yy
     * @param {number} width
     * @param {number} height
     * @param {number} wheelSize
     * @return {composite} A new composite car body
     */
    Composites.car = function(xx, yy, width, height, wheelSize) {
        var group = Body.nextGroup(true),
            wheelBase = -20,
            wheelAOffset = -width * 0.5 + wheelBase,
            wheelBOffset = width * 0.5 - wheelBase,
            wheelYOffset = 0;
    
        var car = Composite.create({ label: 'Car' }),
            body = Bodies.trapezoid(xx, yy, width, height, 0.3, { 
                collisionFilter: {
                    group: group
                },
                friction: 0.01,
                chamfer: {
                    radius: 10
                }
            });
    
        var wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, { 
            collisionFilter: {
                group: group
            },
            friction: 0.8,
            density: 0.01
        });
                    
        var wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, { 
            collisionFilter: {
                group: group
            },
            friction: 0.8,
            density: 0.01
        });
                    
        var axelA = Constraint.create({
            bodyA: body,
            pointA: { x: wheelAOffset, y: wheelYOffset },
            bodyB: wheelA,
            stiffness: 0.2
        });
                        
        var axelB = Constraint.create({
            bodyA: body,
            pointA: { x: wheelBOffset, y: wheelYOffset },
            bodyB: wheelB,
            stiffness: 0.2
        });
        
        Composite.addBody(car, body);
        Composite.addBody(car, wheelA);
        Composite.addBody(car, wheelB);
        Composite.addConstraint(car, axelA);
        Composite.addConstraint(car, axelB);

        return car;
    };

    /**
     * Creates a simple soft body like object.
     * @method softBody
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {boolean} crossBrace
     * @param {number} particleRadius
     * @param {} particleOptions
     * @param {} constraintOptions
     * @return {composite} A new composite softBody
     */
    Composites.softBody = function(xx, yy, columns, rows, columnGap, rowGap, crossBrace, particleRadius, particleOptions, constraintOptions) {
        particleOptions = Common.extend({ inertia: Infinity }, particleOptions);
        constraintOptions = Common.extend({ stiffness: 0.4 }, constraintOptions);

        var softBody = Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y) {
            return Bodies.circle(x, y, particleRadius, particleOptions);
        });

        Composites.mesh(softBody, columns, rows, crossBrace, constraintOptions);

        softBody.label = 'Soft Body';

        return softBody;
    };

})();

},{"../body/Body":1,"../body/Composite":2,"../constraint/Constraint":12,"../core/Common":14,"./Bodies":21}],23:[function(require,module,exports){
/**
* The `Matter.Axes` module contains methods for creating and manipulating sets of axes.
*
* @class Axes
*/

var Axes = {};

module.exports = Axes;

var Vector = require('../geometry/Vector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of axes from the given vertices.
     * @method fromVertices
     * @param {vertices} vertices
     * @return {axes} A new axes from the given vertices
     */
    Axes.fromVertices = function(vertices) {
        var axes = {};

        // find the unique axes, using edge normal gradients
        for (var i = 0; i < vertices.length; i++) {
            var j = (i + 1) % vertices.length, 
                normal = Vector.normalise({ 
                    x: vertices[j].y - vertices[i].y, 
                    y: vertices[i].x - vertices[j].x
                }),
                gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);
            
            // limit precision
            gradient = gradient.toFixed(3).toString();
            axes[gradient] = normal;
        }

        return Common.values(axes);
    };

    /**
     * Rotates a set of axes by the given angle.
     * @method rotate
     * @param {axes} axes
     * @param {number} angle
     */
    Axes.rotate = function(axes, angle) {
        if (angle === 0)
            return;
        
        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i],
                xx;
            xx = axis.x * cos - axis.y * sin;
            axis.y = axis.x * sin + axis.y * cos;
            axis.x = xx;
        }
    };

})();

},{"../core/Common":14,"../geometry/Vector":26}],24:[function(require,module,exports){
/**
* The `Matter.Bounds` module contains methods for creating and manipulating axis-aligned bounding boxes (AABB).
*
* @class Bounds
*/

var Bounds = {};

module.exports = Bounds;

(function() {

    /**
     * Creates a new axis-aligned bounding box (AABB) for the given vertices.
     * @method create
     * @param {vertices} vertices
     * @return {bounds} A new bounds object
     */
    Bounds.create = function(vertices) {
        var bounds = { 
            min: { x: 0, y: 0 }, 
            max: { x: 0, y: 0 }
        };

        if (vertices)
            Bounds.update(bounds, vertices);
        
        return bounds;
    };

    /**
     * Updates bounds using the given vertices and extends the bounds given a velocity.
     * @method update
     * @param {bounds} bounds
     * @param {vertices} vertices
     * @param {vector} velocity
     */
    Bounds.update = function(bounds, vertices, velocity) {
        bounds.min.x = Infinity;
        bounds.max.x = -Infinity;
        bounds.min.y = Infinity;
        bounds.max.y = -Infinity;

        for (var i = 0; i < vertices.length; i++) {
            var vertex = vertices[i];
            if (vertex.x > bounds.max.x) bounds.max.x = vertex.x;
            if (vertex.x < bounds.min.x) bounds.min.x = vertex.x;
            if (vertex.y > bounds.max.y) bounds.max.y = vertex.y;
            if (vertex.y < bounds.min.y) bounds.min.y = vertex.y;
        }
        
        if (velocity) {
            if (velocity.x > 0) {
                bounds.max.x += velocity.x;
            } else {
                bounds.min.x += velocity.x;
            }
            
            if (velocity.y > 0) {
                bounds.max.y += velocity.y;
            } else {
                bounds.min.y += velocity.y;
            }
        }
    };

    /**
     * Returns true if the bounds contains the given point.
     * @method contains
     * @param {bounds} bounds
     * @param {vector} point
     * @return {boolean} True if the bounds contain the point, otherwise false
     */
    Bounds.contains = function(bounds, point) {
        return point.x >= bounds.min.x && point.x <= bounds.max.x 
               && point.y >= bounds.min.y && point.y <= bounds.max.y;
    };

    /**
     * Returns true if the two bounds intersect.
     * @method overlaps
     * @param {bounds} boundsA
     * @param {bounds} boundsB
     * @return {boolean} True if the bounds overlap, otherwise false
     */
    Bounds.overlaps = function(boundsA, boundsB) {
        return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
    };

    /**
     * Translates the bounds by the given vector.
     * @method translate
     * @param {bounds} bounds
     * @param {vector} vector
     */
    Bounds.translate = function(bounds, vector) {
        bounds.min.x += vector.x;
        bounds.max.x += vector.x;
        bounds.min.y += vector.y;
        bounds.max.y += vector.y;
    };

    /**
     * Shifts the bounds to the given position.
     * @method shift
     * @param {bounds} bounds
     * @param {vector} position
     */
    Bounds.shift = function(bounds, position) {
        var deltaX = bounds.max.x - bounds.min.x,
            deltaY = bounds.max.y - bounds.min.y;
            
        bounds.min.x = position.x;
        bounds.max.x = position.x + deltaX;
        bounds.min.y = position.y;
        bounds.max.y = position.y + deltaY;
    };
    
})();

},{}],25:[function(require,module,exports){
/**
* The `Matter.Svg` module contains methods for converting SVG images into an array of vector points.
*
* To use this module you also need the SVGPathSeg polyfill: https://github.com/progers/pathseg
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Svg
*/

var Svg = {};

module.exports = Svg;

var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Converts an SVG path into an array of vector points.
     * If the input path forms a concave shape, you must decompose the result into convex parts before use.
     * See `Bodies.fromVertices` which provides support for this.
     * Note that this function is not guaranteed to support complex paths (such as those with holes).
     * @method pathToVertices
     * @param {SVGPathElement} path
     * @param {Number} [sampleLength=15]
     * @return {Vector[]} points
     */
    Svg.pathToVertices = function(path, sampleLength) {
        // https://github.com/wout/svg.topoly.js/blob/master/svg.topoly.js
        var i, il, total, point, segment, segments, 
            segmentsQueue, lastSegment, 
            lastPoint, segmentIndex, points = [],
            lx, ly, length = 0, x = 0, y = 0;

        sampleLength = sampleLength || 15;

        var addPoint = function(px, py, pathSegType) {
            // all odd-numbered path types are relative except PATHSEG_CLOSEPATH (1)
            var isRelative = pathSegType % 2 === 1 && pathSegType > 1;

            // when the last point doesn't equal the current point add the current point
            if (!lastPoint || px != lastPoint.x || py != lastPoint.y) {
                if (lastPoint && isRelative) {
                    lx = lastPoint.x;
                    ly = lastPoint.y;
                } else {
                    lx = 0;
                    ly = 0;
                }

                var point = {
                    x: lx + px,
                    y: ly + py
                };

                // set last point
                if (isRelative || !lastPoint) {
                    lastPoint = point;
                }

                points.push(point);

                x = lx + px;
                y = ly + py;
            }
        };

        var addSegmentPoint = function(segment) {
            var segType = segment.pathSegTypeAsLetter.toUpperCase();

            // skip path ends
            if (segType === 'Z') 
                return;

            // map segment to x and y
            switch (segType) {

            case 'M':
            case 'L':
            case 'T':
            case 'C':
            case 'S':
            case 'Q':
                x = segment.x;
                y = segment.y;
                break;
            case 'H':
                x = segment.x;
                break;
            case 'V':
                y = segment.y;
                break;
            }

            addPoint(x, y, segment.pathSegType);
        };

        // ensure path is absolute
        _svgPathToAbsolute(path);

        // get total length
        total = path.getTotalLength();

        // queue segments
        segments = [];
        for (i = 0; i < path.pathSegList.numberOfItems; i += 1)
            segments.push(path.pathSegList.getItem(i));

        segmentsQueue = segments.concat();

        // sample through path
        while (length < total) {
            // get segment at position
            segmentIndex = path.getPathSegAtLength(length);
            segment = segments[segmentIndex];

            // new segment
            if (segment != lastSegment) {
                while (segmentsQueue.length && segmentsQueue[0] != segment)
                    addSegmentPoint(segmentsQueue.shift());

                lastSegment = segment;
            }

            // add points in between when curving
            // TODO: adaptive sampling
            switch (segment.pathSegTypeAsLetter.toUpperCase()) {

            case 'C':
            case 'T':
            case 'S':
            case 'Q':
            case 'A':
                point = path.getPointAtLength(length);
                addPoint(point.x, point.y, 0);
                break;

            }

            // increment by sample value
            length += sampleLength;
        }

        // add remaining segments not passed by sampling
        for (i = 0, il = segmentsQueue.length; i < il; ++i)
            addSegmentPoint(segmentsQueue[i]);

        return points;
    };

    var _svgPathToAbsolute = function(path) {
        // http://phrogz.net/convert-svg-path-to-all-absolute-commands
        var x0, y0, x1, y1, x2, y2, segs = path.pathSegList,
            x = 0, y = 0, len = segs.numberOfItems;

        for (var i = 0; i < len; ++i) {
            var seg = segs.getItem(i),
                segType = seg.pathSegTypeAsLetter;

            if (/[MLHVCSQTA]/.test(segType)) {
                if ('x' in seg) x = seg.x;
                if ('y' in seg) y = seg.y;
            } else {
                if ('x1' in seg) x1 = x + seg.x1;
                if ('x2' in seg) x2 = x + seg.x2;
                if ('y1' in seg) y1 = y + seg.y1;
                if ('y2' in seg) y2 = y + seg.y2;
                if ('x' in seg) x += seg.x;
                if ('y' in seg) y += seg.y;

                switch (segType) {

                case 'm':
                    segs.replaceItem(path.createSVGPathSegMovetoAbs(x, y), i);
                    break;
                case 'l':
                    segs.replaceItem(path.createSVGPathSegLinetoAbs(x, y), i);
                    break;
                case 'h':
                    segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x), i);
                    break;
                case 'v':
                    segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y), i);
                    break;
                case 'c':
                    segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2), i);
                    break;
                case 's':
                    segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2), i);
                    break;
                case 'q':
                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1), i);
                    break;
                case 't':
                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y), i);
                    break;
                case 'a':
                    segs.replaceItem(path.createSVGPathSegArcAbs(x, y, seg.r1, seg.r2, seg.angle, seg.largeArcFlag, seg.sweepFlag), i);
                    break;
                case 'z':
                case 'Z':
                    x = x0;
                    y = y0;
                    break;

                }
            }

            if (segType == 'M' || segType == 'm') {
                x0 = x;
                y0 = y;
            }
        }
    };

})();
},{"../geometry/Bounds":24}],26:[function(require,module,exports){
/**
* The `Matter.Vector` module contains methods for creating and manipulating vectors.
* Vectors are the basis of all the geometry related operations in the engine.
* A `Matter.Vector` object is of the form `{ x: 0, y: 0 }`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vector
*/

// TODO: consider params for reusing vector objects

var Vector = {};

module.exports = Vector;

(function() {

    /**
     * Creates a new vector.
     * @method create
     * @param {number} x
     * @param {number} y
     * @return {vector} A new vector
     */
    Vector.create = function(x, y) {
        return { x: x || 0, y: y || 0 };
    };

    /**
     * Returns a new vector with `x` and `y` copied from the given `vector`.
     * @method clone
     * @param {vector} vector
     * @return {vector} A new cloned vector
     */
    Vector.clone = function(vector) {
        return { x: vector.x, y: vector.y };
    };

    /**
     * Returns the magnitude (length) of a vector.
     * @method magnitude
     * @param {vector} vector
     * @return {number} The magnitude of the vector
     */
    Vector.magnitude = function(vector) {
        return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
    };

    /**
     * Returns the magnitude (length) of a vector (therefore saving a `sqrt` operation).
     * @method magnitudeSquared
     * @param {vector} vector
     * @return {number} The squared magnitude of the vector
     */
    Vector.magnitudeSquared = function(vector) {
        return (vector.x * vector.x) + (vector.y * vector.y);
    };

    /**
     * Rotates the vector about (0, 0) by specified angle.
     * @method rotate
     * @param {vector} vector
     * @param {number} angle
     * @return {vector} A new vector rotated about (0, 0)
     */
    Vector.rotate = function(vector, angle) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos
        };
    };

    /**
     * Rotates the vector about a specified point by specified angle.
     * @method rotateAbout
     * @param {vector} vector
     * @param {number} angle
     * @param {vector} point
     * @param {vector} [output]
     * @return {vector} A new vector rotated about the point
     */
    Vector.rotateAbout = function(vector, angle, point, output) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        if (!output) output = {};
        var x = point.x + ((vector.x - point.x) * cos - (vector.y - point.y) * sin);
        output.y = point.y + ((vector.x - point.x) * sin + (vector.y - point.y) * cos);
        output.x = x;
        return output;
    };

    /**
     * Normalises a vector (such that its magnitude is `1`).
     * @method normalise
     * @param {vector} vector
     * @return {vector} A new vector normalised
     */
    Vector.normalise = function(vector) {
        var magnitude = Vector.magnitude(vector);
        if (magnitude === 0)
            return { x: 0, y: 0 };
        return { x: vector.x / magnitude, y: vector.y / magnitude };
    };

    /**
     * Returns the dot-product of two vectors.
     * @method dot
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The dot product of the two vectors
     */
    Vector.dot = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y);
    };

    /**
     * Returns the cross-product of two vectors.
     * @method cross
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The cross product of the two vectors
     */
    Vector.cross = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
    };

    /**
     * Returns the cross-product of three vectors.
     * @method cross3
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} vectorC
     * @return {number} The cross product of the three vectors
     */
    Vector.cross3 = function(vectorA, vectorB, vectorC) {
        return (vectorB.x - vectorA.x) * (vectorC.y - vectorA.y) - (vectorB.y - vectorA.y) * (vectorC.x - vectorA.x);
    };

    /**
     * Adds the two vectors.
     * @method add
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB added
     */
    Vector.add = function(vectorA, vectorB, output) {
        if (!output) output = {};
        output.x = vectorA.x + vectorB.x;
        output.y = vectorA.y + vectorB.y;
        return output;
    };

    /**
     * Subtracts the two vectors.
     * @method sub
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB subtracted
     */
    Vector.sub = function(vectorA, vectorB, output) {
        if (!output) output = {};
        output.x = vectorA.x - vectorB.x;
        output.y = vectorA.y - vectorB.y;
        return output;
    };

    /**
     * Multiplies a vector and a scalar.
     * @method mult
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector multiplied by scalar
     */
    Vector.mult = function(vector, scalar) {
        return { x: vector.x * scalar, y: vector.y * scalar };
    };

    /**
     * Divides a vector and a scalar.
     * @method div
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector divided by scalar
     */
    Vector.div = function(vector, scalar) {
        return { x: vector.x / scalar, y: vector.y / scalar };
    };

    /**
     * Returns the perpendicular vector. Set `negate` to true for the perpendicular in the opposite direction.
     * @method perp
     * @param {vector} vector
     * @param {bool} [negate=false]
     * @return {vector} The perpendicular vector
     */
    Vector.perp = function(vector, negate) {
        negate = negate === true ? -1 : 1;
        return { x: negate * -vector.y, y: negate * vector.x };
    };

    /**
     * Negates both components of a vector such that it points in the opposite direction.
     * @method neg
     * @param {vector} vector
     * @return {vector} The negated vector
     */
    Vector.neg = function(vector) {
        return { x: -vector.x, y: -vector.y };
    };

    /**
     * Returns the angle in radians between the two vectors relative to the x-axis.
     * @method angle
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The angle in radians
     */
    Vector.angle = function(vectorA, vectorB) {
        return Math.atan2(vectorB.y - vectorA.y, vectorB.x - vectorA.x);
    };

    /**
     * Temporary vector pool (not thread-safe).
     * @property _temp
     * @type {vector[]}
     * @private
     */
    Vector._temp = [Vector.create(), Vector.create(), 
                    Vector.create(), Vector.create(), 
                    Vector.create(), Vector.create()];

})();
},{}],27:[function(require,module,exports){
/**
* The `Matter.Vertices` module contains methods for creating and manipulating sets of vertices.
* A set of vertices is an array of `Matter.Vector` with additional indexing properties inserted by `Vertices.create`.
* A `Matter.Body` maintains a set of vertices to represent the shape of the object (its convex hull).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vertices
*/

var Vertices = {};

module.exports = Vertices;

var Vector = require('../geometry/Vector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of `Matter.Body` compatible vertices.
     * The `points` argument accepts an array of `Matter.Vector` points orientated around the origin `(0, 0)`, for example:
     *
     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
     *
     * The `Vertices.create` method returns a new array of vertices, which are similar to Matter.Vector objects,
     * but with some additional references required for efficient collision detection routines.
     *
     * Note that the `body` argument is not optional, a `Matter.Body` reference must be provided.
     *
     * @method create
     * @param {vector[]} points
     * @param {body} body
     */
    Vertices.create = function(points, body) {
        var vertices = [];

        for (var i = 0; i < points.length; i++) {
            var point = points[i],
                vertex = {
                    x: point.x,
                    y: point.y,
                    index: i,
                    body: body,
                    isInternal: false
                };

            vertices.push(vertex);
        }

        return vertices;
    };

    /**
     * Parses a string containing ordered x y pairs separated by spaces (and optionally commas), 
     * into a `Matter.Vertices` object for the given `Matter.Body`.
     * For parsing SVG paths, see `Svg.pathToVertices`.
     * @method fromPath
     * @param {string} path
     * @param {body} body
     * @return {vertices} vertices
     */
    Vertices.fromPath = function(path, body) {
        var pathPattern = /L?\s*([\-\d\.e]+)[\s,]*([\-\d\.e]+)*/ig,
            points = [];

        path.replace(pathPattern, function(match, x, y) {
            points.push({ x: parseFloat(x), y: parseFloat(y) });
        });

        return Vertices.create(points, body);
    };

    /**
     * Returns the centre (centroid) of the set of vertices.
     * @method centre
     * @param {vertices} vertices
     * @return {vector} The centre point
     */
    Vertices.centre = function(vertices) {
        var area = Vertices.area(vertices, true),
            centre = { x: 0, y: 0 },
            cross,
            temp,
            j;

        for (var i = 0; i < vertices.length; i++) {
            j = (i + 1) % vertices.length;
            cross = Vector.cross(vertices[i], vertices[j]);
            temp = Vector.mult(Vector.add(vertices[i], vertices[j]), cross);
            centre = Vector.add(centre, temp);
        }

        return Vector.div(centre, 6 * area);
    };

    /**
     * Returns the average (mean) of the set of vertices.
     * @method mean
     * @param {vertices} vertices
     * @return {vector} The average point
     */
    Vertices.mean = function(vertices) {
        var average = { x: 0, y: 0 };

        for (var i = 0; i < vertices.length; i++) {
            average.x += vertices[i].x;
            average.y += vertices[i].y;
        }

        return Vector.div(average, vertices.length);
    };

    /**
     * Returns the area of the set of vertices.
     * @method area
     * @param {vertices} vertices
     * @param {bool} signed
     * @return {number} The area
     */
    Vertices.area = function(vertices, signed) {
        var area = 0,
            j = vertices.length - 1;

        for (var i = 0; i < vertices.length; i++) {
            area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
            j = i;
        }

        if (signed)
            return area / 2;

        return Math.abs(area) / 2;
    };

    /**
     * Returns the moment of inertia (second moment of area) of the set of vertices given the total mass.
     * @method inertia
     * @param {vertices} vertices
     * @param {number} mass
     * @return {number} The polygon's moment of inertia
     */
    Vertices.inertia = function(vertices, mass) {
        var numerator = 0,
            denominator = 0,
            v = vertices,
            cross,
            j;

        // find the polygon's moment of inertia, using second moment of area
        // http://www.physicsforums.com/showthread.php?t=25293
        for (var n = 0; n < v.length; n++) {
            j = (n + 1) % v.length;
            cross = Math.abs(Vector.cross(v[j], v[n]));
            numerator += cross * (Vector.dot(v[j], v[j]) + Vector.dot(v[j], v[n]) + Vector.dot(v[n], v[n]));
            denominator += cross;
        }

        return (mass / 6) * (numerator / denominator);
    };

    /**
     * Translates the set of vertices in-place.
     * @method translate
     * @param {vertices} vertices
     * @param {vector} vector
     * @param {number} scalar
     */
    Vertices.translate = function(vertices, vector, scalar) {
        var i;
        if (scalar) {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x * scalar;
                vertices[i].y += vector.y * scalar;
            }
        } else {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x;
                vertices[i].y += vector.y;
            }
        }

        return vertices;
    };

    /**
     * Rotates the set of vertices in-place.
     * @method rotate
     * @param {vertices} vertices
     * @param {number} angle
     * @param {vector} point
     */
    Vertices.rotate = function(vertices, angle, point) {
        if (angle === 0)
            return;

        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                dx = vertice.x - point.x,
                dy = vertice.y - point.y;
                
            vertice.x = point.x + (dx * cos - dy * sin);
            vertice.y = point.y + (dx * sin + dy * cos);
        }

        return vertices;
    };

    /**
     * Returns `true` if the `point` is inside the set of `vertices`.
     * @method contains
     * @param {vertices} vertices
     * @param {vector} point
     * @return {boolean} True if the vertices contains point, otherwise false
     */
    Vertices.contains = function(vertices, point) {
        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                nextVertice = vertices[(i + 1) % vertices.length];
            if ((point.x - vertice.x) * (nextVertice.y - vertice.y) + (point.y - vertice.y) * (vertice.x - nextVertice.x) > 0) {
                return false;
            }
        }

        return true;
    };

    /**
     * Scales the vertices from a point (default is centre) in-place.
     * @method scale
     * @param {vertices} vertices
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     */
    Vertices.scale = function(vertices, scaleX, scaleY, point) {
        if (scaleX === 1 && scaleY === 1)
            return vertices;

        point = point || Vertices.centre(vertices);

        var vertex,
            delta;

        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            delta = Vector.sub(vertex, point);
            vertices[i].x = point.x + delta.x * scaleX;
            vertices[i].y = point.y + delta.y * scaleY;
        }

        return vertices;
    };

    /**
     * Chamfers a set of vertices by giving them rounded corners, returns a new set of vertices.
     * The radius parameter is a single number or an array to specify the radius for each vertex.
     * @method chamfer
     * @param {vertices} vertices
     * @param {number[]} radius
     * @param {number} quality
     * @param {number} qualityMin
     * @param {number} qualityMax
     */
    Vertices.chamfer = function(vertices, radius, quality, qualityMin, qualityMax) {
        radius = radius || [8];

        if (!radius.length)
            radius = [radius];

        // quality defaults to -1, which is auto
        quality = (typeof quality !== 'undefined') ? quality : -1;
        qualityMin = qualityMin || 2;
        qualityMax = qualityMax || 14;

        var newVertices = [];

        for (var i = 0; i < vertices.length; i++) {
            var prevVertex = vertices[i - 1 >= 0 ? i - 1 : vertices.length - 1],
                vertex = vertices[i],
                nextVertex = vertices[(i + 1) % vertices.length],
                currentRadius = radius[i < radius.length ? i : radius.length - 1];

            if (currentRadius === 0) {
                newVertices.push(vertex);
                continue;
            }

            var prevNormal = Vector.normalise({ 
                x: vertex.y - prevVertex.y, 
                y: prevVertex.x - vertex.x
            });

            var nextNormal = Vector.normalise({ 
                x: nextVertex.y - vertex.y, 
                y: vertex.x - nextVertex.x
            });

            var diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2)),
                radiusVector = Vector.mult(Common.clone(prevNormal), currentRadius),
                midNormal = Vector.normalise(Vector.mult(Vector.add(prevNormal, nextNormal), 0.5)),
                scaledVertex = Vector.sub(vertex, Vector.mult(midNormal, diagonalRadius));

            var precision = quality;

            if (quality === -1) {
                // automatically decide precision
                precision = Math.pow(currentRadius, 0.32) * 1.75;
            }

            precision = Common.clamp(precision, qualityMin, qualityMax);

            // use an even value for precision, more likely to reduce axes by using symmetry
            if (precision % 2 === 1)
                precision += 1;

            var alpha = Math.acos(Vector.dot(prevNormal, nextNormal)),
                theta = alpha / precision;

            for (var j = 0; j < precision; j++) {
                newVertices.push(Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex));
            }
        }

        return newVertices;
    };

    /**
     * Sorts the input vertices into clockwise order in place.
     * @method clockwiseSort
     * @param {vertices} vertices
     * @return {vertices} vertices
     */
    Vertices.clockwiseSort = function(vertices) {
        var centre = Vertices.mean(vertices);

        vertices.sort(function(vertexA, vertexB) {
            return Vector.angle(centre, vertexA) - Vector.angle(centre, vertexB);
        });

        return vertices;
    };

    /**
     * Returns true if the vertices form a convex shape (vertices must be in clockwise order).
     * @method isConvex
     * @param {vertices} vertices
     * @return {bool} `true` if the `vertices` are convex, `false` if not (or `null` if not computable).
     */
    Vertices.isConvex = function(vertices) {
        // http://paulbourke.net/geometry/polygonmesh/

        var flag = 0,
            n = vertices.length,
            i,
            j,
            k,
            z;

        if (n < 3)
            return null;

        for (i = 0; i < n; i++) {
            j = (i + 1) % n;
            k = (i + 2) % n;
            z = (vertices[j].x - vertices[i].x) * (vertices[k].y - vertices[j].y);
            z -= (vertices[j].y - vertices[i].y) * (vertices[k].x - vertices[j].x);

            if (z < 0) {
                flag |= 1;
            } else if (z > 0) {
                flag |= 2;
            }

            if (flag === 3) {
                return false;
            }
        }

        if (flag !== 0){
            return true;
        } else {
            return null;
        }
    };

    /**
     * Returns the convex hull of the input vertices as a new array of points.
     * @method hull
     * @param {vertices} vertices
     * @return [vertex] vertices
     */
    Vertices.hull = function(vertices) {
        // http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain

        var upper = [],
            lower = [], 
            vertex,
            i;

        // sort vertices on x-axis (y-axis for ties)
        vertices = vertices.slice(0);
        vertices.sort(function(vertexA, vertexB) {
            var dx = vertexA.x - vertexB.x;
            return dx !== 0 ? dx : vertexA.y - vertexB.y;
        });

        // build lower hull
        for (i = 0; i < vertices.length; i++) {
            vertex = vertices[i];

            while (lower.length >= 2 
                   && Vector.cross3(lower[lower.length - 2], lower[lower.length - 1], vertex) <= 0) {
                lower.pop();
            }

            lower.push(vertex);
        }

        // build upper hull
        for (i = vertices.length - 1; i >= 0; i--) {
            vertex = vertices[i];

            while (upper.length >= 2 
                   && Vector.cross3(upper[upper.length - 2], upper[upper.length - 1], vertex) <= 0) {
                upper.pop();
            }

            upper.push(vertex);
        }

        // concatenation of the lower and upper hulls gives the convex hull
        // omit last points because they are repeated at the beginning of the other list
        upper.pop();
        lower.pop();

        return upper.concat(lower);
    };

})();

},{"../core/Common":14,"../geometry/Vector":26}],28:[function(require,module,exports){
var Matter = module.exports = {};
Matter.version = 'master';

Matter.Body = require('../body/Body');
Matter.Composite = require('../body/Composite');
Matter.World = require('../body/World');

Matter.Contact = require('../collision/Contact');
Matter.Detector = require('../collision/Detector');
Matter.Grid = require('../collision/Grid');
Matter.Pairs = require('../collision/Pairs');
Matter.Pair = require('../collision/Pair');
Matter.Query = require('../collision/Query');
Matter.Resolver = require('../collision/Resolver');
Matter.SAT = require('../collision/SAT');

Matter.Constraint = require('../constraint/Constraint');
Matter.MouseConstraint = require('../constraint/MouseConstraint');

Matter.Common = require('../core/Common');
Matter.Engine = require('../core/Engine');
Matter.Events = require('../core/Events');
Matter.Mouse = require('../core/Mouse');
Matter.Runner = require('../core/Runner');
Matter.Sleeping = require('../core/Sleeping');


Matter.Bodies = require('../factory/Bodies');
Matter.Composites = require('../factory/Composites');

Matter.Axes = require('../geometry/Axes');
Matter.Bounds = require('../geometry/Bounds');
Matter.Svg = require('../geometry/Svg');
Matter.Vector = require('../geometry/Vector');
Matter.Vertices = require('../geometry/Vertices');

Matter.Render = require('../render/Render');
Matter.RenderPixi = require('../render/RenderPixi');

// aliases

Matter.World.add = Matter.Composite.add;
Matter.World.remove = Matter.Composite.remove;
Matter.World.addComposite = Matter.Composite.addComposite;
Matter.World.addBody = Matter.Composite.addBody;
Matter.World.addConstraint = Matter.Composite.addConstraint;
Matter.World.clear = Matter.Composite.clear;
Matter.Engine.run = Matter.Runner.run;

},{"../body/Body":1,"../body/Composite":2,"../body/World":3,"../collision/Contact":4,"../collision/Detector":5,"../collision/Grid":6,"../collision/Pair":7,"../collision/Pairs":8,"../collision/Query":9,"../collision/Resolver":10,"../collision/SAT":11,"../constraint/Constraint":12,"../constraint/MouseConstraint":13,"../core/Common":14,"../core/Engine":15,"../core/Events":16,"../core/Metrics":17,"../core/Mouse":18,"../core/Runner":19,"../core/Sleeping":20,"../factory/Bodies":21,"../factory/Composites":22,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Svg":25,"../geometry/Vector":26,"../geometry/Vertices":27,"../render/Render":29,"../render/RenderPixi":30}],29:[function(require,module,exports){
/**
* The `Matter.Render` module is a simple HTML5 canvas based renderer for visualising instances of `Matter.Engine`.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* It includes a number of drawing options including wireframe, vector with support for sprites and viewports.
*
* @class Render
*/

var Render = {};

module.exports = Render;

var Common = require('../core/Common');
var Composite = require('../body/Composite');
var Bounds = require('../geometry/Bounds');
var Events = require('../core/Events');
var Grid = require('../collision/Grid');
var Vector = require('../geometry/Vector');

(function() {
    
    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }

    /**
     * Creates a new renderer. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {object} [options]
     * @return {render} A new renderer
     */
    Render.create = function(options) {
        var defaults = {
            controller: Render,
            engine: null,
            element: null,
            canvas: null,
            mouse: null,
            frameRequestId: null,
            options: {
                width: 800,
                height: 600,
                pixelRatio: 1,
                background: '#fafafa',
                wireframeBackground: '#222',
                hasBounds: !!options.bounds,
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showSeparations: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false,
                showVertexNumbers: false,
                showConvexHulls: false,
                showInternalEdges: false,
                showMousePosition: false
            }
        };

        var render = Common.extend(defaults, options);

        if (render.canvas) {
            render.canvas.width = render.options.width || render.canvas.width;
            render.canvas.height = render.options.height || render.canvas.height;
        }

        render.mouse = options.mouse;
        render.engine = options.engine;
        render.canvas = render.canvas || _createCanvas(render.options.width, render.options.height);
        render.context = render.canvas.getContext('2d');
        render.textures = {};

        render.bounds = render.bounds || { 
            min: { 
                x: 0,
                y: 0
            }, 
            max: { 
                x: render.canvas.width,
                y: render.canvas.height
            }
        };

        if (render.options.pixelRatio !== 1) {
            Render.setPixelRatio(render, render.options.pixelRatio);
        }

        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('Render.create: options.element was undefined, render.canvas was created but not appended', 'warn');
        }

        return render;
    };

    /**
     * Continuously updates the render canvas on the `requestAnimationFrame` event.
     * @method run
     * @param {render} render
     */
    Render.run = function(render) {
        (function loop(time){
            render.frameRequestId = _requestAnimationFrame(loop);
            Render.world(render);
        })();
    };

    /**
     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
     * @method stop
     * @param {render} render
     */
    Render.stop = function(render) {
        _cancelAnimationFrame(render.frameRequestId);
    };

    /**
     * Sets the pixel ratio of the renderer and updates the canvas.
     * To automatically detect the correct ratio, pass the string `'auto'` for `pixelRatio`.
     * @method setPixelRatio
     * @param {render} render
     * @param {number} pixelRatio
     */
    Render.setPixelRatio = function(render, pixelRatio) {
        var options = render.options,
            canvas = render.canvas;

        if (pixelRatio === 'auto') {
            pixelRatio = _getPixelRatio(canvas);
        }

        options.pixelRatio = pixelRatio;
        canvas.setAttribute('data-pixel-ratio', pixelRatio);
        canvas.width = options.width * pixelRatio;
        canvas.height = options.height * pixelRatio;
        canvas.style.width = options.width + 'px';
        canvas.style.height = options.height + 'px';
        render.context.scale(pixelRatio, pixelRatio);
    };

    /**
     * Renders the given `engine`'s `Matter.World` object.
     * This is the entry point for all rendering and should be called every time the scene changes.
     * @method world
     * @param {render} render
     */
    Render.world = function(render) {
        var engine = render.engine,
            world = engine.world,
            canvas = render.canvas,
            context = render.context,
            options = render.options,
            allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world),
            background = options.wireframes ? options.wireframeBackground : options.background,
            bodies = [],
            constraints = [],
            i;

        var event = {
            timestamp: engine.timing.timestamp
        };

        Events.trigger(render, 'beforeRender', event);

        // apply background if it has changed
        if (render.currentBackground !== background)
            _applyBackground(render, background);

        // clear the canvas with a transparent fill, to allow the canvas background to show
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = "transparent";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';

        // handle bounds
        if (options.hasBounds) {
            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
                boundsHeight = render.bounds.max.y - render.bounds.min.y,
                boundsScaleX = boundsWidth / options.width,
                boundsScaleY = boundsHeight / options.height;

            // filter out bodies that are not in view
            for (i = 0; i < allBodies.length; i++) {
                var body = allBodies[i];
                if (Bounds.overlaps(body.bounds, render.bounds))
                    bodies.push(body);
            }

            // filter out constraints that are not in view
            for (i = 0; i < allConstraints.length; i++) {
                var constraint = allConstraints[i],
                    bodyA = constraint.bodyA,
                    bodyB = constraint.bodyB,
                    pointAWorld = constraint.pointA,
                    pointBWorld = constraint.pointB;

                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

                if (!pointAWorld || !pointBWorld)
                    continue;

                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
                    constraints.push(constraint);
            }

            // transform the view
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        } else {
            constraints = allConstraints;
            bodies = allBodies;
        }

        if (!options.wireframes || (engine.enableSleeping && options.showSleeping)) {
            // fully featured rendering of bodies
            Render.bodies(render, bodies, context);
        } else {
            if (options.showConvexHulls)
                Render.bodyConvexHulls(render, bodies, context);

            // optimised method for wireframes only
            Render.bodyWireframes(render, bodies, context);
        }

        if (options.showBounds)
            Render.bodyBounds(render, bodies, context);

        if (options.showAxes || options.showAngleIndicator)
            Render.bodyAxes(render, bodies, context);
        
        if (options.showPositions)
            Render.bodyPositions(render, bodies, context);

        if (options.showVelocity)
            Render.bodyVelocity(render, bodies, context);

        if (options.showIds)
            Render.bodyIds(render, bodies, context);

        if (options.showSeparations)
            Render.separations(render, engine.pairs.list, context);

        if (options.showCollisions)
            Render.collisions(render, engine.pairs.list, context);

        if (options.showVertexNumbers)
            Render.vertexNumbers(render, bodies, context);

        if (options.showMousePosition)
            Render.mousePosition(render, render.mouse, context);

        Render.constraints(constraints, context);

        if (options.showBroadphase && engine.broadphase.controller === Grid)
            Render.grid(render, engine.broadphase, context);

        if (options.showDebug)
            Render.debug(render, context);

        if (options.hasBounds) {
            // revert view transforms
            context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0);
        }

        Events.trigger(render, 'afterRender', event);
    };

    /**
     * Description
     * @private
     * @method debug
     * @param {render} render
     * @param {RenderingContext} context
     */
    Render.debug = function(render, context) {
        var c = context,
            engine = render.engine,
            world = engine.world,
            metrics = engine.metrics,
            options = render.options,
            bodies = Composite.allBodies(world),
            space = "    ";

        if (engine.timing.timestamp - (render.debugTimestamp || 0) >= 500) {
            var text = "";

            if (metrics.timing) {
                text += "fps: " + Math.round(metrics.timing.fps) + space;
            }


            render.debugString = text;
            render.debugTimestamp = engine.timing.timestamp;
        }

        if (render.debugString) {
            c.font = "12px Arial";

            if (options.wireframes) {
                c.fillStyle = 'rgba(255,255,255,0.5)';
            } else {
                c.fillStyle = 'rgba(0,0,0,0.5)';
            }

            var split = render.debugString.split('\n');

            for (var i = 0; i < split.length; i++) {
                c.fillText(split[i], 50, 50 + i * 18);
            }
        }
    };

    /**
     * Description
     * @private
     * @method constraints
     * @param {constraint[]} constraints
     * @param {RenderingContext} context
     */
    Render.constraints = function(constraints, context) {
        var c = context;

        for (var i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];

            if (!constraint.render.visible || !constraint.pointA || !constraint.pointB)
                continue;

            var bodyA = constraint.bodyA,
                bodyB = constraint.bodyB;

            if (bodyA) {
                c.beginPath();
                c.moveTo(bodyA.position.x + constraint.pointA.x, bodyA.position.y + constraint.pointA.y);
            } else {
                c.beginPath();
                c.moveTo(constraint.pointA.x, constraint.pointA.y);
            }

            if (bodyB) {
                c.lineTo(bodyB.position.x + constraint.pointB.x, bodyB.position.y + constraint.pointB.y);
            } else {
                c.lineTo(constraint.pointB.x, constraint.pointB.y);
            }

            c.lineWidth = constraint.render.lineWidth;
            c.strokeStyle = constraint.render.strokeStyle;
            c.stroke();
        }
    };
    
    /**
     * Description
     * @private
     * @method bodyShadows
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyShadows = function(render, bodies, context) {
        var c = context,
            engine = render.engine;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            if (body.circleRadius) {
                c.beginPath();
                c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
                c.closePath();
            } else {
                c.beginPath();
                c.moveTo(body.vertices[0].x, body.vertices[0].y);
                for (var j = 1; j < body.vertices.length; j++) {
                    c.lineTo(body.vertices[j].x, body.vertices[j].y);
                }
                c.closePath();
            }

            var distanceX = body.position.x - render.options.width * 0.5,
                distanceY = body.position.y - render.options.height * 0.2,
                distance = Math.abs(distanceX) + Math.abs(distanceY);

            c.shadowColor = 'rgba(0,0,0,0.15)';
            c.shadowOffsetX = 0.05 * distanceX;
            c.shadowOffsetY = 0.05 * distanceY;
            c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

            c.fill();

            c.shadowColor = null;
            c.shadowOffsetX = null;
            c.shadowOffsetY = null;
            c.shadowBlur = null;
        }
    };

    /**
     * Description
     * @private
     * @method bodies
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodies = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            showInternalEdges = options.showInternalEdges || !options.wireframes,
            body,
            part,
            i,
            k;

        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                if (!part.render.visible)
                    continue;

                if (options.showSleeping && body.isSleeping) {
                    c.globalAlpha = 0.5 * part.render.opacity;
                } else if (part.render.opacity !== 1) {
                    c.globalAlpha = part.render.opacity;
                }

                if (part.render.sprite && part.render.sprite.texture && !options.wireframes) {
                    // part sprite
                    var sprite = part.render.sprite,
                        texture = _getTexture(render, sprite.texture);

                    c.translate(part.position.x, part.position.y); 
                    c.rotate(part.angle);

                    c.drawImage(
                        texture,
                        texture.width * -sprite.xOffset * sprite.xScale, 
                        texture.height * -sprite.yOffset * sprite.yScale, 
                        texture.width * sprite.xScale, 
                        texture.height * sprite.yScale
                    );

                    // revert translation, hopefully faster than save / restore
                    c.rotate(-part.angle);
                    c.translate(-part.position.x, -part.position.y); 
                } else {
                    // part polygon
                    if (part.circleRadius) {
                        c.beginPath();
                        c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
                    } else {
                        c.beginPath();
                        c.moveTo(part.vertices[0].x, part.vertices[0].y);

                        for (var j = 1; j < part.vertices.length; j++) {
                            if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                                c.lineTo(part.vertices[j].x, part.vertices[j].y);
                            } else {
                                c.moveTo(part.vertices[j].x, part.vertices[j].y);
                            }

                            if (part.vertices[j].isInternal && !showInternalEdges) {
                                c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
                            }
                        }
                        
                        c.lineTo(part.vertices[0].x, part.vertices[0].y);
                        c.closePath();
                    }

                    if (!options.wireframes) {
                        c.fillStyle = part.render.fillStyle;
                        c.lineWidth = part.render.lineWidth;
                        c.strokeStyle = part.render.strokeStyle;
                        c.fill();
                    } else {
                        c.lineWidth = 1;
                        c.strokeStyle = '#bbb';
                    }

                    c.stroke();
                }

                c.globalAlpha = 1;
            }
        }
    };

    /**
     * Optimised method for drawing body wireframes in one pass
     * @private
     * @method bodyWireframes
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyWireframes = function(render, bodies, context) {
        var c = context,
            showInternalEdges = render.options.showInternalEdges,
            body,
            part,
            i,
            j,
            k;

        c.beginPath();

        // render all bodies
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                c.moveTo(part.vertices[0].x, part.vertices[0].y);

                for (j = 1; j < part.vertices.length; j++) {
                    if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                        c.lineTo(part.vertices[j].x, part.vertices[j].y);
                    } else {
                        c.moveTo(part.vertices[j].x, part.vertices[j].y);
                    }

                    if (part.vertices[j].isInternal && !showInternalEdges) {
                        c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
                    }
                }
                
                c.lineTo(part.vertices[0].x, part.vertices[0].y);
            }
        }

        c.lineWidth = 1;
        c.strokeStyle = '#bbb';
        c.stroke();
    };

    /**
     * Optimised method for drawing body convex hull wireframes in one pass
     * @private
     * @method bodyConvexHulls
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyConvexHulls = function(render, bodies, context) {
        var c = context,
            body,
            part,
            i,
            j,
            k;

        c.beginPath();

        // render convex hulls
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible || body.parts.length === 1)
                continue;

            c.moveTo(body.vertices[0].x, body.vertices[0].y);

            for (j = 1; j < body.vertices.length; j++) {
                c.lineTo(body.vertices[j].x, body.vertices[j].y);
            }
            
            c.lineTo(body.vertices[0].x, body.vertices[0].y);
        }

        c.lineWidth = 1;
        c.strokeStyle = 'rgba(255,255,255,0.2)';
        c.stroke();
    };

    /**
     * Renders body vertex numbers.
     * @private
     * @method vertexNumbers
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.vertexNumbers = function(render, bodies, context) {
        var c = context,
            i,
            j,
            k;

        for (i = 0; i < bodies.length; i++) {
            var parts = bodies[i].parts;
            for (k = parts.length > 1 ? 1 : 0; k < parts.length; k++) {
                var part = parts[k];
                for (j = 0; j < part.vertices.length; j++) {
                    c.fillStyle = 'rgba(255,255,255,0.2)';
                    c.fillText(i + '_' + j, part.position.x + (part.vertices[j].x - part.position.x) * 0.8, part.position.y + (part.vertices[j].y - part.position.y) * 0.8);
                }
            }
        }
    };

    /**
     * Renders mouse position.
     * @private
     * @method mousePosition
     * @param {render} render
     * @param {mouse} mouse
     * @param {RenderingContext} context
     */
    Render.mousePosition = function(render, mouse, context) {
        var c = context;
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.fillText(mouse.position.x + '  ' + mouse.position.y, mouse.position.x + 5, mouse.position.y - 5);
    };

    /**
     * Draws body bounds
     * @private
     * @method bodyBounds
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyBounds = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.render.visible) {
                var parts = bodies[i].parts;
                for (var j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    var part = parts[j];
                    c.rect(part.bounds.min.x, part.bounds.min.y, part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y);
                }
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,255,255,0.08)';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.1)';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Draws body angle indicators and axes
     * @private
     * @method bodyAxes
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyAxes = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            part,
            i,
            j,
            k;

        c.beginPath();

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                parts = body.parts;

            if (!body.render.visible)
                continue;

            if (options.showAxes) {
                // render all axes
                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    part = parts[j];
                    for (k = 0; k < part.axes.length; k++) {
                        var axis = part.axes[k];
                        c.moveTo(part.position.x, part.position.y);
                        c.lineTo(part.position.x + axis.x * 20, part.position.y + axis.y * 20);
                    }
                }
            } else {
                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    part = parts[j];
                    for (k = 0; k < part.axes.length; k++) {
                        // render a single axis indicator
                        c.moveTo(part.position.x, part.position.y);
                        c.lineTo((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2, 
                                 (part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2);
                    }
                }
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'indianred';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.8)';
            c.globalCompositeOperation = 'overlay';
        }

        c.lineWidth = 1;
        c.stroke();
        c.globalCompositeOperation = 'source-over';
    };

    /**
     * Draws body positions
     * @private
     * @method bodyPositions
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyPositions = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            body,
            part,
            i,
            k;

        c.beginPath();

        // render current positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = 0; k < body.parts.length; k++) {
                part = body.parts[k];
                c.arc(part.position.x, part.position.y, 3, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'indianred';
        } else {
            c.fillStyle = 'rgba(0,0,0,0.5)';
        }
        c.fill();

        c.beginPath();

        // render previous positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];
            if (body.render.visible) {
                c.arc(body.positionPrev.x, body.positionPrev.y, 2, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        c.fillStyle = 'rgba(255,165,0,0.8)';
        c.fill();
    };

    /**
     * Draws body velocity
     * @private
     * @method bodyVelocity
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyVelocity = function(render, bodies, context) {
        var c = context;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            c.moveTo(body.position.x, body.position.y);
            c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
        }

        c.lineWidth = 3;
        c.strokeStyle = 'cornflowerblue';
        c.stroke();
    };

    /**
     * Draws body ids
     * @private
     * @method bodyIds
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyIds = function(render, bodies, context) {
        var c = context,
            i,
            j;

        for (i = 0; i < bodies.length; i++) {
            if (!bodies[i].render.visible)
                continue;

            var parts = bodies[i].parts;
            for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                var part = parts[j];
                c.font = "12px Arial";
                c.fillStyle = 'rgba(255,255,255,0.5)';
                c.fillText(part.id, part.position.x + 10, part.position.y - 10);
            }
        }
    };

    /**
     * Description
     * @private
     * @method collisions
     * @param {render} render
     * @param {pair[]} pairs
     * @param {RenderingContext} context
     */
    Render.collisions = function(render, pairs, context) {
        var c = context,
            options = render.options,
            pair,
            collision,
            corrected,
            bodyA,
            bodyB,
            i,
            j;

        c.beginPath();

        // render collision positions
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;
            for (j = 0; j < pair.activeContacts.length; j++) {
                var contact = pair.activeContacts[j],
                    vertex = contact.vertex;
                c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'rgba(255,255,255,0.7)';
        } else {
            c.fillStyle = 'orange';
        }
        c.fill();

        c.beginPath();
            
        // render collision normals
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;

            if (pair.activeContacts.length > 0) {
                var normalPosX = pair.activeContacts[0].vertex.x,
                    normalPosY = pair.activeContacts[0].vertex.y;

                if (pair.activeContacts.length === 2) {
                    normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
                    normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
                }
                
                if (collision.bodyB === collision.supports[0].body || collision.bodyA.isStatic === true) {
                    c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
                } else {
                    c.moveTo(normalPosX + collision.normal.x * 8, normalPosY + collision.normal.y * 8);
                }

                c.lineTo(normalPosX, normalPosY);
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,165,0,0.7)';
        } else {
            c.strokeStyle = 'orange';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method separations
     * @param {render} render
     * @param {pair[]} pairs
     * @param {RenderingContext} context
     */
    Render.separations = function(render, pairs, context) {
        var c = context,
            options = render.options,
            pair,
            collision,
            corrected,
            bodyA,
            bodyB,
            i,
            j;

        c.beginPath();

        // render separations
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;

            var k = 1;

            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
            if (bodyB.isStatic) k = 0;

            c.moveTo(bodyB.position.x, bodyB.position.y);
            c.lineTo(bodyB.position.x - collision.penetration.x * k, bodyB.position.y - collision.penetration.y * k);

            k = 1;

            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
            if (bodyA.isStatic) k = 0;

            c.moveTo(bodyA.position.x, bodyA.position.y);
            c.lineTo(bodyA.position.x + collision.penetration.x * k, bodyA.position.y + collision.penetration.y * k);
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,165,0,0.5)';
        } else {
            c.strokeStyle = 'orange';
        }
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method grid
     * @param {render} render
     * @param {grid} grid
     * @param {RenderingContext} context
     */
    Render.grid = function(render, grid, context) {
        var c = context,
            options = render.options;

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,180,0,0.1)';
        } else {
            c.strokeStyle = 'rgba(255,180,0,0.5)';
        }

        c.beginPath();

        var bucketKeys = Common.keys(grid.buckets);

        for (var i = 0; i < bucketKeys.length; i++) {
            var bucketId = bucketKeys[i];

            if (grid.buckets[bucketId].length < 2)
                continue;

            var region = bucketId.split(',');
            c.rect(0.5 + parseInt(region[0], 10) * grid.bucketWidth, 
                    0.5 + parseInt(region[1], 10) * grid.bucketHeight, 
                    grid.bucketWidth, 
                    grid.bucketHeight);
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method inspector
     * @param {inspector} inspector
     * @param {RenderingContext} context
     */
    Render.inspector = function(inspector, context) {
        var engine = inspector.engine,
            selected = inspector.selected,
            render = inspector.render,
            options = render.options,
            bounds;

        if (options.hasBounds) {
            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
                boundsHeight = render.bounds.max.y - render.bounds.min.y,
                boundsScaleX = boundsWidth / render.options.width,
                boundsScaleY = boundsHeight / render.options.height;
            
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        }

        for (var i = 0; i < selected.length; i++) {
            var item = selected[i].data;

            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.9)';
            context.setLineDash([1,2]);

            switch (item.type) {

            case 'body':

                // render body selections
                bounds = item.bounds;
                context.beginPath();
                context.rect(Math.floor(bounds.min.x - 3), Math.floor(bounds.min.y - 3), 
                             Math.floor(bounds.max.x - bounds.min.x + 6), Math.floor(bounds.max.y - bounds.min.y + 6));
                context.closePath();
                context.stroke();

                break;

            case 'constraint':

                // render constraint selections
                var point = item.pointA;
                if (item.bodyA)
                    point = item.pointB;
                context.beginPath();
                context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                context.closePath();
                context.stroke();

                break;

            }

            context.setLineDash([]);
            context.translate(-0.5, -0.5);
        }

        // render selection region
        if (inspector.selectStart !== null) {
            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.6)';
            context.fillStyle = 'rgba(255,165,0,0.1)';
            bounds = inspector.selectBounds;
            context.beginPath();
            context.rect(Math.floor(bounds.min.x), Math.floor(bounds.min.y), 
                         Math.floor(bounds.max.x - bounds.min.x), Math.floor(bounds.max.y - bounds.min.y));
            context.closePath();
            context.stroke();
            context.fill();
            context.translate(-0.5, -0.5);
        }

        if (options.hasBounds)
            context.setTransform(1, 0, 0, 1, 0, 0);
    };

    /**
     * Description
     * @method _createCanvas
     * @private
     * @param {} width
     * @param {} height
     * @return canvas
     */
    var _createCanvas = function(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.oncontextmenu = function() { return false; };
        canvas.onselectstart = function() { return false; };
        return canvas;
    };

    /**
     * Gets the pixel ratio of the canvas.
     * @method _getPixelRatio
     * @private
     * @param {HTMLElement} canvas
     * @return {Number} pixel ratio
     */
    var _getPixelRatio = function(canvas) {
        var context = canvas.getContext('2d'),
            devicePixelRatio = window.devicePixelRatio || 1,
            backingStorePixelRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio
                                      || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio
                                      || context.backingStorePixelRatio || 1;

        return devicePixelRatio / backingStorePixelRatio;
    };

    /**
     * Gets the requested texture (an Image) via its path
     * @method _getTexture
     * @private
     * @param {render} render
     * @param {string} imagePath
     * @return {Image} texture
     */
    var _getTexture = function(render, imagePath) {
        var image = render.textures[imagePath];

        if (image)
            return image;

        image = render.textures[imagePath] = new Image();
        image.src = imagePath;

        return image;
    };

    /**
     * Applies the background to the canvas using CSS.
     * @method applyBackground
     * @private
     * @param {render} render
     * @param {string} background
     */
    var _applyBackground = function(render, background) {
        var cssBackground = background;

        if (/(jpg|gif|png)$/.test(background))
            cssBackground = 'url(' + background + ')';

        render.canvas.style.background = cssBackground;
        render.canvas.style.backgroundSize = "contain";
        render.currentBackground = background;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired before rendering
    *
    * @event beforeRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after rendering
    *
    * @event afterRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A back-reference to the `Matter.Render` module.
     *
     * @property controller
     * @type render
     */

    /**
     * A reference to the `Matter.Engine` instance to be used.
     *
     * @property engine
     * @type engine
     */

    /**
     * A reference to the element where the canvas is to be inserted (if `render.canvas` has not been specified)
     *
     * @property element
     * @type HTMLElement
     * @default null
     */

    /**
     * The canvas element to render to. If not specified, one will be created if `render.element` has been specified.
     *
     * @property canvas
     * @type HTMLCanvasElement
     * @default null
     */

    /**
     * The configuration options of the renderer.
     *
     * @property options
     * @type {}
     */

    /**
     * The target width in pixels of the `render.canvas` to be created.
     *
     * @property options.width
     * @type number
     * @default 800
     */

    /**
     * The target height in pixels of the `render.canvas` to be created.
     *
     * @property options.height
     * @type number
     * @default 600
     */

    /**
     * A flag that specifies if `render.bounds` should be used when rendering.
     *
     * @property options.hasBounds
     * @type boolean
     * @default false
     */

    /**
     * A `Bounds` object that specifies the drawing view region. 
     * Rendering will be automatically transformed and scaled to fit within the canvas size (`render.options.width` and `render.options.height`).
     * This allows for creating views that can pan or zoom around the scene.
     * You must also set `render.options.hasBounds` to `true` to enable bounded rendering.
     *
     * @property bounds
     * @type bounds
     */

    /**
     * The 2d rendering context from the `render.canvas` element.
     *
     * @property context
     * @type CanvasRenderingContext2D
     */

    /**
     * The sprite texture cache.
     *
     * @property textures
     * @type {}
     */

})();

},{"../body/Composite":2,"../collision/Grid":6,"../core/Common":14,"../core/Events":16,"../geometry/Bounds":24,"../geometry/Vector":26}],30:[function(require,module,exports){
/**
* The `Matter.RenderPixi` module is an example renderer using pixi.js.
* See also `Matter.Render` for a canvas based renderer.
*
* @class RenderPixi
* @deprecated the Matter.RenderPixi module will soon be removed from the Matter.js core.
* It will likely be moved to its own repository (but maintenance will be limited).
*/

var RenderPixi = {};

module.exports = RenderPixi;

var Composite = require('../body/Composite');
var Common = require('../core/Common');

(function() {

    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }
    
    /**
     * Creates a new Pixi.js WebGL renderer
     * @method create
     * @param {object} options
     * @return {RenderPixi} A new renderer
     * @deprecated
     */
    RenderPixi.create = function(options) {
        Common.log('RenderPixi.create: Matter.RenderPixi is deprecated (see docs)', 'warn');

        var defaults = {
            controller: RenderPixi,
            engine: null,
            element: null,
            frameRequestId: null,
            canvas: null,
            renderer: null,
            container: null,
            spriteContainer: null,
            pixiOptions: null,
            options: {
                width: 800,
                height: 600,
                background: '#fafafa',
                wireframeBackground: '#222',
                hasBounds: false,
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false
            }
        };

        var render = Common.extend(defaults, options),
            transparent = !render.options.wireframes && render.options.background === 'transparent';

        // init pixi
        render.pixiOptions = render.pixiOptions || {
            view: render.canvas,
            transparent: transparent,
            antialias: true,
            backgroundColor: options.background
        };

        render.mouse = options.mouse;
        render.engine = options.engine;
        render.renderer = render.renderer || new PIXI.WebGLRenderer(render.options.width, render.options.height, render.pixiOptions);
        render.container = render.container || new PIXI.Container();
        render.spriteContainer = render.spriteContainer || new PIXI.Container();
        render.canvas = render.canvas || render.renderer.view;
        render.bounds = render.bounds || { 
            min: {
                x: 0,
                y: 0
            }, 
            max: { 
                x: render.options.width,
                y: render.options.height
            }
        };

        // caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // use a sprite batch for performance
        render.container.addChild(render.spriteContainer);

        // insert canvas
        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('No "render.element" passed, "render.canvas" was not inserted into document.', 'warn');
        }

        // prevent menus on canvas
        render.canvas.oncontextmenu = function() { return false; };
        render.canvas.onselectstart = function() { return false; };

        return render;
    };

    /**
     * Continuously updates the render canvas on the `requestAnimationFrame` event.
     * @method run
     * @param {render} render
     * @deprecated
     */
    RenderPixi.run = function(render) {
        (function loop(time){
            render.frameRequestId = _requestAnimationFrame(loop);
            RenderPixi.world(render);
        })();
    };

    /**
     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
     * @method stop
     * @param {render} render
     * @deprecated
     */
    RenderPixi.stop = function(render) {
        _cancelAnimationFrame(render.frameRequestId);
    };

    /**
     * Clears the scene graph
     * @method clear
     * @param {RenderPixi} render
     * @deprecated
     */
    RenderPixi.clear = function(render) {
        var container = render.container,
            spriteContainer = render.spriteContainer;

        // clear stage container
        while (container.children[0]) { 
            container.removeChild(container.children[0]); 
        }

        // clear sprite batch
        while (spriteContainer.children[0]) { 
            spriteContainer.removeChild(spriteContainer.children[0]); 
        }

        var bgSprite = render.sprites['bg-0'];

        // clear caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // set background sprite
        render.sprites['bg-0'] = bgSprite;
        if (bgSprite)
            container.addChildAt(bgSprite, 0);

        // add sprite batch back into container
        render.container.addChild(render.spriteContainer);

        // reset background state
        render.currentBackground = null;

        // reset bounds transforms
        container.scale.set(1, 1);
        container.position.set(0, 0);
    };

    /**
     * Sets the background of the canvas 
     * @method setBackground
     * @param {RenderPixi} render
     * @param {string} background
     * @deprecated
     */
    RenderPixi.setBackground = function(render, background) {
        if (render.currentBackground !== background) {
            var isColor = background.indexOf && background.indexOf('#') !== -1,
                bgSprite = render.sprites['bg-0'];

            if (isColor) {
                // if solid background color
                var color = Common.colorToNumber(background);
                render.renderer.backgroundColor = color;

                // remove background sprite if existing
                if (bgSprite)
                    render.container.removeChild(bgSprite); 
            } else {
                // initialise background sprite if needed
                if (!bgSprite) {
                    var texture = _getTexture(render, background);

                    bgSprite = render.sprites['bg-0'] = new PIXI.Sprite(texture);
                    bgSprite.position.x = 0;
                    bgSprite.position.y = 0;
                    render.container.addChildAt(bgSprite, 0);
                }
            }

            render.currentBackground = background;
        }
    };

    /**
     * Description
     * @method world
     * @param {engine} engine
     * @deprecated
     */
    RenderPixi.world = function(render) {
        var engine = render.engine,
            world = engine.world,
            renderer = render.renderer,
            container = render.container,
            options = render.options,
            bodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world),
            constraints = [],
            i;

        if (options.wireframes) {
            RenderPixi.setBackground(render, options.wireframeBackground);
        } else {
            RenderPixi.setBackground(render, options.background);
        }

        // handle bounds
        var boundsWidth = render.bounds.max.x - render.bounds.min.x,
            boundsHeight = render.bounds.max.y - render.bounds.min.y,
            boundsScaleX = boundsWidth / render.options.width,
            boundsScaleY = boundsHeight / render.options.height;

        if (options.hasBounds) {
            // Hide bodies that are not in view
            for (i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                body.render.sprite.visible = Bounds.overlaps(body.bounds, render.bounds);
            }

            // filter out constraints that are not in view
            for (i = 0; i < allConstraints.length; i++) {
                var constraint = allConstraints[i],
                    bodyA = constraint.bodyA,
                    bodyB = constraint.bodyB,
                    pointAWorld = constraint.pointA,
                    pointBWorld = constraint.pointB;

                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

                if (!pointAWorld || !pointBWorld)
                    continue;

                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
                    constraints.push(constraint);
            }

            // transform the view
            container.scale.set(1 / boundsScaleX, 1 / boundsScaleY);
            container.position.set(-render.bounds.min.x * (1 / boundsScaleX), -render.bounds.min.y * (1 / boundsScaleY));
        } else {
            constraints = allConstraints;
        }

        for (i = 0; i < bodies.length; i++)
            RenderPixi.body(render, bodies[i]);

        for (i = 0; i < constraints.length; i++)
            RenderPixi.constraint(render, constraints[i]);

        renderer.render(container);
    };


    /**
     * Description
     * @method constraint
     * @param {engine} engine
     * @param {constraint} constraint
     * @deprecated
     */
    RenderPixi.constraint = function(render, constraint) {
        var engine = render.engine,
            bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB,
            container = render.container,
            constraintRender = constraint.render,
            primitiveId = 'c-' + constraint.id,
            primitive = render.primitives[primitiveId];

        // initialise constraint primitive if not existing
        if (!primitive)
            primitive = render.primitives[primitiveId] = new PIXI.Graphics();

        // don't render if constraint does not have two end points
        if (!constraintRender.visible || !constraint.pointA || !constraint.pointB) {
            primitive.clear();
            return;
        }

        // add to scene graph if not already there
        if (Common.indexOf(container.children, primitive) === -1)
            container.addChild(primitive);

        // render the constraint on every update, since they can change dynamically
        primitive.clear();
        primitive.beginFill(0, 0);
        primitive.lineStyle(constraintRender.lineWidth, Common.colorToNumber(constraintRender.strokeStyle), 1);
        
        if (bodyA) {
            primitive.moveTo(bodyA.position.x + pointA.x, bodyA.position.y + pointA.y);
        } else {
            primitive.moveTo(pointA.x, pointA.y);
        }

        if (bodyB) {
            primitive.lineTo(bodyB.position.x + pointB.x, bodyB.position.y + pointB.y);
        } else {
            primitive.lineTo(pointB.x, pointB.y);
        }

        primitive.endFill();
    };
    
    /**
     * Description
     * @method body
     * @param {engine} engine
     * @param {body} body
     * @deprecated
     */
    RenderPixi.body = function(render, body) {
        var engine = render.engine,
            bodyRender = body.render;

        if (!bodyRender.visible)
            return;

        if (bodyRender.sprite && bodyRender.sprite.texture) {
            var spriteId = 'b-' + body.id,
                sprite = render.sprites[spriteId],
                spriteContainer = render.spriteContainer;

            // initialise body sprite if not existing
            if (!sprite)
                sprite = render.sprites[spriteId] = _createBodySprite(render, body);

            // add to scene graph if not already there
            if (Common.indexOf(spriteContainer.children, sprite) === -1)
                spriteContainer.addChild(sprite);

            // update body sprite
            sprite.position.x = body.position.x;
            sprite.position.y = body.position.y;
            sprite.rotation = body.angle;
            sprite.scale.x = bodyRender.sprite.xScale || 1;
            sprite.scale.y = bodyRender.sprite.yScale || 1;
        } else {
            var primitiveId = 'b-' + body.id,
                primitive = render.primitives[primitiveId],
                container = render.container;

            // initialise body primitive if not existing
            if (!primitive) {
                primitive = render.primitives[primitiveId] = _createBodyPrimitive(render, body);
                primitive.initialAngle = body.angle;
            }

            // add to scene graph if not already there
            if (Common.indexOf(container.children, primitive) === -1)
                container.addChild(primitive);

            // update body primitive
            primitive.position.x = body.position.x;
            primitive.position.y = body.position.y;
            primitive.rotation = body.angle - primitive.initialAngle;
        }
    };

    /**
     * Creates a body sprite
     * @method _createBodySprite
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Sprite} sprite
     * @deprecated
     */
    var _createBodySprite = function(render, body) {
        var bodyRender = body.render,
            texturePath = bodyRender.sprite.texture,
            texture = _getTexture(render, texturePath),
            sprite = new PIXI.Sprite(texture);

        sprite.anchor.x = body.render.sprite.xOffset;
        sprite.anchor.y = body.render.sprite.yOffset;

        return sprite;
    };

    /**
     * Creates a body primitive
     * @method _createBodyPrimitive
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Graphics} graphics
     * @deprecated
     */
    var _createBodyPrimitive = function(render, body) {
        var bodyRender = body.render,
            options = render.options,
            primitive = new PIXI.Graphics(),
            fillStyle = Common.colorToNumber(bodyRender.fillStyle),
            strokeStyle = Common.colorToNumber(bodyRender.strokeStyle),
            strokeStyleIndicator = Common.colorToNumber(bodyRender.strokeStyle),
            strokeStyleWireframe = Common.colorToNumber('#bbb'),
            strokeStyleWireframeIndicator = Common.colorToNumber('#CD5C5C'),
            part;

        primitive.clear();

        // handle compound parts
        for (var k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
            part = body.parts[k];

            if (!options.wireframes) {
                primitive.beginFill(fillStyle, 1);
                primitive.lineStyle(bodyRender.lineWidth, strokeStyle, 1);
            } else {
                primitive.beginFill(0, 0);
                primitive.lineStyle(1, strokeStyleWireframe, 1);
            }

            primitive.moveTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

            for (var j = 1; j < part.vertices.length; j++) {
                primitive.lineTo(part.vertices[j].x - body.position.x, part.vertices[j].y - body.position.y);
            }

            primitive.lineTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

            primitive.endFill();

            // angle indicator
            if (options.showAngleIndicator || options.showAxes) {
                primitive.beginFill(0, 0);

                if (options.wireframes) {
                    primitive.lineStyle(1, strokeStyleWireframeIndicator, 1);
                } else {
                    primitive.lineStyle(1, strokeStyleIndicator);
                }

                primitive.moveTo(part.position.x - body.position.x, part.position.y - body.position.y);
                primitive.lineTo(((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2 - body.position.x), 
                                 ((part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2 - body.position.y));

                primitive.endFill();
            }
        }

        return primitive;
    };

    /**
     * Gets the requested texture (a PIXI.Texture) via its path
     * @method _getTexture
     * @private
     * @param {RenderPixi} render
     * @param {string} imagePath
     * @return {PIXI.Texture} texture
     * @deprecated
     */
    var _getTexture = function(render, imagePath) {
        var texture = render.textures[imagePath];

        if (!texture)
            texture = render.textures[imagePath] = PIXI.Texture.fromImage(imagePath);

        return texture;
    };

})();

},{"../body/Composite":2,"../core/Common":14}]},{},[28])(28)
});;/**
 * Attribute dictionary for property definitions
 * @constructor
 */
var AttributeDictionary = function () {};
AttributeDictionary._rules = {};
AttributeDictionary._inheritance = {};

/**
 *
 * @param context
 * @param propertyName
 * @param rule
 * @returns {boolean}
 */
AttributeDictionary.addRule = function (context, propertyName, rule) {
    if (isObjectAssigned(context)) {
        context = context.toLowerCase();

        if (!isObjectAssigned(AttributeDictionary._rules[context])) {
            AttributeDictionary._rules[context] = {}
        }

        AttributeDictionary._rules[context][propertyName] = rule;

        return true;
    }

    return false;
};

/**
 *
 * @param context
 * @param propertyName
 * @returns {*}
 */
AttributeDictionary.getRule = function (context, propertyName) {
    context = context.toLowerCase();

    // first check the first order rules:
    if (AttributeDictionary._rules[context] && AttributeDictionary._rules[context][propertyName]) {
        return AttributeDictionary._rules[context][propertyName];
    }

    // maybe the parents have this rule?
    if (AttributeDictionary._inheritance[context]) {
        // recursively try to get the rule from the parents:
        for (var i = 0; i < AttributeDictionary._inheritance[context].length; ++i) {
            var result = AttributeDictionary.getRule(AttributeDictionary._inheritance[context][i], propertyName);
            if (result != null) {
                return result;
            }
        }
    }

    return null;
};

/**
 *
 * @param typeName
 * @param parent
 */
AttributeDictionary.inherit = function (context, parent) {
    context = context.toLowerCase();
    parent = parent.toLowerCase();

    if (!isObjectAssigned(AttributeDictionary._inheritance[context])) {
        AttributeDictionary._inheritance[context] = [];
    }

    AttributeDictionary._inheritance[context].push(parent);
};;/**
 * CallbackResponse class
 */
function CallbackResponse(params) {
    params = params || {};

    this.success = params.success;
    this.data = params.data || {};

   
}

CallbackResponse.prototype.isSuccessful = function() {
    return this.success;
};;// alias for scarlett constants:
var SCARLETT = SC = {
	WEBGL: "webgl",
	EXECUTION_PHASES: {
		WAITING: 0,
		UPDATE: 10,
		SCENE_UPDATE: 11,
		LATE_UPDATE: 12,
		RENDER: 13,
		SCENE_RENDER: 14,
		LATE_RENDER: 15
	}
};;/**
 * Event Manager
 * @constructor
 */
var EventManager = function () {};

EventManager._handlers = {};

/**
 *
 * @param topic
 * @param callback
 * @param context (optional)
 */
EventManager.subscribe = function(topic, callback, context) {
    if(!EventManager._handlers.hasOwnProperty(topic)) {
        EventManager._handlers[topic] = [];
    }

    EventManager._handlers[topic].push({
        callback: callback,
        context: context
    });
};

/**
 *
 * @param topic
 */
EventManager.emit = function(topic) {
    // get the remaining arguments (if exist)
    var args = [];
    if(arguments.length > 1) {
        for(var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
    }

    if(EventManager._handlers.hasOwnProperty(topic)) {
        EventManager._handlers[topic].forEach(function(handler) {
            // call the function by sending the arguments and applying the given context (might not be available)
            handler.callback.apply(handler.context, args);
        });
    }
};

/**
 * Clears all subscriptions
 */
EventManager.clear = function() {
    EventManager._handlers = {};
};;/**
 * Inserts an element at a desirable position
 * @param index
 * @param item
 */
if (!Array.prototype.insert) {
	Array.prototype.insert = function (index, item) {
		this.splice(index, 0, item);
	};
}

/**
 * Ends Width Polyfill
 */

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString();
		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
			position = subjectString.length;
		}
		position -= searchString.length;
		var lastIndex = subjectString.indexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}

/**
 * Running the following code before any other code will create Array.isArray() if it's not natively available.
 */
if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

/**
 * Adds index of object to arrays, uses the object "equals()" function if available
 * @param search
 * @returns {number}
 */
Array.prototype.indexOfObject = function arrayObjectIndexOf(search) {
	for (var i = 0, len = this.length; i < len; i++) {
		if (isEqual(this[i], search)) return i;
	}
	return -1;
};;/**
 * Image Loader static class
 */
var ImageLoader = function () {
};

/**
 *
 * @type {{}}
 */
ImageLoader.loaded = {};


/**
 * loads an image from a specified path into memory
 * @param path
 * @param callback
 * @returns {*}
 */
ImageLoader.loadImage = function (path, callback) {
    var image;

    // is this a relative path?
    if(GameManager.activeProjectPath && path.indexOf(GameManager.activeProjectPath) < 0) {
       path = GameManager.activeProjectPath + path;
    }

    // is the image on cache?
    if (ImageLoader.loaded.hasOwnProperty(path)) {
        // the image is already cached. let's use it!
        image = ImageLoader.loaded[path];

        if (isFunction(callback)) {
            callback(new CallbackResponse({
                success: true,
                data: image
            }));
        }
    } else {
        // the image is not in cache, we must load it:
        image = new Image();
        image.src = path;
        image.onload = function () {
            ImageLoader.loaded[path] = image;

            if (isFunction(callback)) {
                callback(new CallbackResponse({
                    success: true,
                    data: image
                }));
            }
        };
        image.onerror = function () {
            if (isFunction(callback)) {
                callback(new CallbackResponse({
                    success: false
                }));
            }
        };
    }

    return image;
};

;function Logger(params) {
    params = params || {};

    // private properties:
    this._context = params.context || "Default";
}

// functions
Logger.prototype.log = function(message) {
    console.log(this._context + " | " + message);
};

Logger.prototype.warn = function(message) {
    console.warn(this._context + " | " + message);
};

Logger.prototype.error = function(message) {
    console.error(this._context + " | " + message);
};

// General Debug Logger
var debug = new Logger("Debug");;/**
 * Attribute dictionary for property definitions
 * @constructor
 */
var SetterDictionary  = function () {};
SetterDictionary._rules = {};

/**
 *
 * @param context
 * @param rule
 * @returns {boolean}
 */
SetterDictionary.addRule = function (context, rule) {
	if(isObjectAssigned(context)) {
		context = context.toLowerCase();
		SetterDictionary._rules[context] = rule;
		return true;
	}

	return false;
};

/**
 *
 * @param typeName
 * @returns {*}
 */
SetterDictionary.getRule = function (typeName) {
	typeName = typeName.toLowerCase();
	if (SetterDictionary._rules[typeName]) {
		return SetterDictionary._rules[typeName];
	}
};;/**
 * Scarlett @ DevTeam
 * This javascript file will include global utility functions that can be called from any context
 */

/**
 * This function will return true if there is something assigned to the given object and false if it isn't
 * @param obj
 * @returns {boolean}
 */
function isObjectAssigned(obj) {
    return (typeof obj !== "undefined" && obj !== null);
}

/**
 * Validates if the given object is a string
 * @param obj
 * @returns {boolean}
 */
function isString(obj) {
    return typeof obj === "string";
}

/**
 * Validates if the given object is a number
 * @param obj
 * @returns {boolean}
 */
function isNumber(obj) {
    return typeof obj === "number";
}

/**
 * Validates if the given object is a game object
 * @param obj
 * @returns {boolean}
 */
function isGame(obj) {
    return obj instanceof Game;
}

/**
 * Validates if the given object is a game scene
 * @param obj
 * @returns {boolean}
 */
function isGameScene(obj) {
    return obj instanceof GameScene;
}

/**
 * Validates if the given object is a texture2d
 * @param obj
 * @returns {boolean}
 */
function isTexture2D(obj) {
    return obj instanceof Texture2D;
}

/**
 * Validates if the given object is a function
 * @param obj
 * @returns {boolean}
 */
function isFunction(obj) {
    return typeof obj === "function";
}

/**
 * Validates if the given object is a sprite
 * @param obj
 * @returns {boolean}
 */
function isSprite(obj) {
    return obj instanceof Sprite;
}

/**
 * Creates inheritance between classes by cloning the prototype
 * @param child
 * @param parent
 */
function inheritsFrom(child, parent) {
    child.prototype = Object.create(parent.prototype);
}

/**
 * Generates a unique natural number
 * @type {number}
 * @private
 */
var _SS_UID = 0;
function generateUID() {
    return ++_SS_UID;
}

/**
 * Capitalizes a string
 * @param string
 * @returns {*}
 */
function capitalize(string) {
    if (string.length >= 2) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    } else if (string.length == 1) {
        return string.charAt(0).toUpperCase();
    }
    return string;
}

/**
 * Split camel case
 * @param string
 * @returns {string}
 */
function splitCamelCase(string) {
    return string.replace(/([a-z](?=[A-Z]))/g, '$1 ');
}

/**
 * Gets the type of the object
 * @param object
 * @returns {*}
 */
function getType(object) {
    if (object === null) return "[object Null]"; // special case
    if (object.getType) return object.getType();
    return object.constructor.name || Object.prototype.toString.call(object);
}

/**
 * The following function compares both given objects applying the 'equal' function if it exist in the first
 * @param a
 * @param b
 */
function isEqual(a, b) {
    if (isFunction(a.equals)) {
        return a.equals(b);
    }

    return a === b;
}
;function RigidBody (params) {
	params = params || {};

	// private properties
	this._isStatic = params.static || false;
	this._mass = params.mass || null;
	this._friction = params.friction || null;
	this._gameObject = null;
	this._body = null;

}

RigidBody.prototype._sync = function() {
	var self = this;

	if(!isObjectAssigned(this._gameObject)) {
		return;
	}

	if(!isObjectAssigned(this._body)) {
		var pos = this._gameObject.transform.getPosition();

		// TODO assign the body based on the object
		var width = 1,
			height = 1;
		
		if(isSprite(this._gameObject)) {
			width = this._gameObject.getTexture().getWidth();
			height = this._gameObject.getTexture().getHeight();
		}

		this._body = Matter.Bodies.rectangle(pos.x, pos.y, width, height,
			{
				isStatic: this._isStatic
			});

		Matter.World.add(GameManager.activeScene.getPhysicsWorld(), [this._body]);

		var objScale = this._gameObject.transform.getScale();
		Matter.Body.scale(this._body, objScale.x, objScale.y);

		this._gameObject.transform.overridePositionGetter(function() {
			return {
				x: self._body.position.x,
				y: self._body.position.y
			}
		});

		this._gameObject.transform.overrideRotationGetter(function() {
			return self._body.angle;
		});
	}

	if(isObjectAssigned(this._mass)) {
		Matter.Body.setMass(this._body, this._mass);
	}

	if(isObjectAssigned(this._friction)) {
		this._body.friction = this._friction;
	}
};

RigidBody.prototype.setMass = function(mass) {
	this._mass = mass;
	Matter.Body.setMass(this._body, this._mass);
};

RigidBody.prototype.getMass = function() {
	return this.mass;
};

RigidBody.prototype.setGameObject = function(gameObject) {
	this._gameObject = gameObject;
	this._sync();
};

RigidBody.prototype.onGameObjectDetach = function() {
	this._gameObject.transform.clearPositionGetter();
	this._gameObject.transform.clearScaleGetter();
	this._gameObject.transform.clearRotationGetter();
};

RigidBody.prototype.onGameObjectPositionUpdated = function(value) {
	if(isObjectAssigned(this._body)) {
		Matter.Body.setPosition(this._body, value);
	}
};

RigidBody.prototype.onGameObjectRotationUpdated = function(value) {
	if(isObjectAssigned(this._body)) {
		Matter.Body.setAngle(this._body, value);
	}
};

RigidBody.prototype.onGameObjectScaleUpdated = function(value) {
	if(isObjectAssigned(this._body)) {
		Matter.Body.scale(this._body, value.x, value.y);
	}
};

RigidBody.prototype.unload = function() {
	// TODO: do this
};;/**
 * Content Object
 * @param params
 * @constructor
 */
function ContentObject(params) {
    params = params || {};

    // public properties
    this.name = params.name;
};/**
 * Content Texture
 * @param params
 * @constructor
 */
function ContentScript(params) {
    params = params || {};

    ContentObject.call(this, params);

    // public properties:
    this.source = params.source || null;
}

inheritsFrom(ContentTexture, ContentObject);;/**
 * Content Texture
 * @param params
 * @constructor
 */
function ContentTexture(params) {
    params = params || {};

    ContentObject.call(this, params);

    // public properties:
    this.source = params.source || "";
}

inheritsFrom(ContentTexture, ContentObject);;/**
 * Content Texture
 * @param params
 * @constructor
 */
function ContentTextureAtlas(params) {
    params = params || {};

    ContentObject.call(this, params);

    // public properties:
    this.source = params.source || null;
}

inheritsFrom(ContentTexture, ContentObject);;/**
 * Camera2D class
 */
function Camera2D(x, y, viewWidth, viewHeight, zoom) {
    // public properties:
    this.x = x || 0;
    this.y = y || 0;
    this.zoom = zoom || 1.0;
    this.viewWidth = viewWidth || 0;
    this.viewHeight = viewHeight || 0;

    // private properties:
    this._lastX = null;
    this._lastY = null;
    this._lastZoom = null;
    this._matrix = mat4.create();
    this._omatrix = mat4.create(); // used for temporary calculations
}

Camera2D.prototype.calculateMatrix = function () {
    // generate orthographic perspective:
    mat4.ortho(
        this._matrix,
        this.x + -this.viewWidth * this.zoom / 2.0,
        this.x + this.viewWidth * this.zoom / 2.0,
        this.y + this.viewHeight * this.zoom / 2.0,
        this.y + -this.viewHeight * this.zoom / 2.0,
        0.0, 1.0);

    this._lastX = this.x;
    this._lastY = this.y;
    this._lastZoom = this.zoom;

    return this._matrix;
};

Camera2D.prototype.setViewSize = function (viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;

    // force the camera calculations
    this.calculateMatrix();
};

Camera2D.prototype.getViewWidth = function() {
    return this.viewWidth;
};

Camera2D.prototype.getViewHeight = function() {
    return this.viewHeight;
};

/**
 * Calculates (if necessary) and returns the transformation matrix of the camera
 * @returns {mat4|*}
 */
Camera2D.prototype.getMatrix = function () {
    // needs to have a new calculation?
    if (this.x != this._lastX || this.y != this._lastY || this._lastZoom != this.zoom) {
        return this.calculateMatrix();
    }

    return this._matrix;
};

/**
 * Gets the world coordinates based on the screen X and Y
 * @param screenX
 * @param screenY
 */
Camera2D.prototype.screenToWorldCoordinates = function(screenX, screenY) {
    // first we normalize the screen position:
    var x = (2.0 * screenX) / this.viewWidth - 1.0;
    var y = 1.0 - (2.0 * screenY) / this.viewHeight;

    // then we calculate and return the world coordinates:
    mat4.invert(this._omatrix, this.getMatrix());

    return Vector2.transformMat4(new Vector2(x, y), this._omatrix);
};


Camera2D.prototype.unload = function () {

};

Camera2D.prototype.objectify = function() {
    return {
        x: this.x,
        y: this.y,
        zoom: this.zoom
    }
};

Camera2D.restore = function(data) {
    return new Camera2D(data.x, data.y, data.viewWidth, data.viewHeight, data.zoom);
};;SetterDictionary.addRule("color", ["r", "g", "b", "a"]);

/**
 * Color Class
 * @param r
 * @param g
 * @param b
 * @param a
 * @constructor
 */
function Color(r, g, b, a) {
    // public properties:
    this.r = r || 0.0;
    this.g = g || 0.0;
    this.b = b || 0.0;
    this.a = a || 1.0;
}

/**
 *
 */
Color.prototype.clone = function() {
   return new Color(this.r, this.g, this.b, this.a);
};

/**
 *
 * @param r
 * @param g
 * @param b
 * @param a
 */
Color.prototype.set = function(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};

/**
 * Compares the color object
 * @param obj
 * @returns {boolean}
 */
Color.prototype.equals = function (obj) {
    return (obj.r === this.r && obj.g === this.g && obj.b === this.b && obj.a === this.a);
};

/**
 * Compares the color object ignoring the alpha color
 * @param obj
 */
Color.prototype.equalsIgnoreAlpha = function (obj) {
    return (obj.r === this.r && obj.g === this.g && obj.b === this.b);
};

/**
 *
 */
Color.prototype.objectify = function () {
    return {
        r: this.r,
        g: this.g,
        b: this.b,
        a: this.a
    };
};

/**
 *
 * @param data
 */
Color.restore = function(data) {
    return new Color(data.r, data.g, data.b, data.a);
};

/**
 *
 * @returns {string}
 */
Color.prototype.toHex = function () {
    return Color.rgbToHex(this.r * 255, this.g * 255, this.b * 255);
};

/**
 *
 * @returns {*[]}
 */
Color.prototype.toArray = function () {
    return [this.r, this.g, this.b, this.a];
};

/**
 *
 * @returns {Float32Array}
 */
Color.prototype.toFloat32Array = function () {
    return new Float32Array([this.r, this.g, this.b, this.a]);
};

/**
 *
 */
Color.prototype.unload = function () {

};

// static functions

Color.rgbToHex = function(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

Color.fromRGBA = function (red, green, blue, alpha) {
    return new Color(red / 255.0, green / 255.0, blue / 255.0, alpha);
};

Color.fromRGB = function (red, green, blue) {
    return new Color(red / 255.0, green / 255.0, blue / 255.0, 1.0);
};

Color.random = function (alpha) {
    alpha = alpha || 1.0;
    return Color.fromRGBA(Math.random() * 255, Math.random() * 255, Math.random() * 255, alpha);
};

// static properties

Color.CornflowerBlue = Color.fromRGB(100.0, 149.0, 237.0);
Color.Scarlet = Color.fromRGB(255.0, 36.0, 0.0);
Color.Red = Color.fromRGB(255.0, 0.0, 0.0);
Color.Green = Color.fromRGB(0.0, 255.0, 0.0);
Color.Blue = Color.fromRGB(0.0, 0.0, 255.0);
Color.White = Color.fromRGB(255.0, 255.0, 255.0);
Color.Black = Color.fromRGB(0.0, 0.0, 0.0);
Color.Gray = Color.fromRGB(80.0, 80.0, 80.0);
Color.Nephritis = Color.fromRGB(39.0, 174.0, 96.0);
Color.Wisteria = Color.fromRGB(142.0, 68.0, 173.0);
Color.Amethyst = Color.fromRGB(155.0, 89.0, 182.0);
Color.Carrot = Color.fromRGB(230, 126, 34);
Color.Pumpkin = Color.fromRGB(211, 84, 0);
Color.Orange = Color.fromRGB(243, 156, 18);
Color.SunFlower = Color.fromRGB(241, 196, 15);
Color.Alizarin = Color.fromRGB(231, 76, 60);;/**
 * GameScene class
 */
function Game(params) {
    params = params || {};

    var DEFAULT_VIRTUAL_WIDTH = 800,
        DEFAULT_VIRTUAL_HEIGHT = 640;

    // public properties:


    // private properties:
    this._renderContext = null;
    this._logger = new Logger(arguments.callee.name);
    this._initialized = false;
    this._gameScene = params.scene;
    this._totalElapsedTime = null;
    this._virtualResolution = null;
    this._shaderManager = null;
    this._executionPhase = SCARLETT.EXECUTION_PHASES.WAITING;
    this._physicsEngine = Matter.Engine.create();
    this._physicsEngine.enableSleeping = true;
    this._renderExtensions = {};
    this._paused = false;
    this._swapScene = null; // used to contain a temporary scene before swapping
    this._swappingScenes = false;

    Matter.Engine.run(this._physicsEngine);

    // set the default virtual resolution
    this.setVirtualResolution(DEFAULT_VIRTUAL_WIDTH, DEFAULT_VIRTUAL_HEIGHT);

    // the target container is defined?
    if (isString(params.target)) {
        this.setTarget(params.target);
    }
}

/**
 *
 * @param name
 * @param extension
 */
Game.prototype.addRenderExtension = function (name, extension) {
    this._renderExtensions[name] = extension;
};

/**
 *
 * @param name
 */
Game.prototype.removeRenderExtension = function (name) {
    delete this._renderExtensions[name];
};

/**
 *
 */
Game.prototype.clearRenderExtensions = function () {
    this._renderExtensions = [];
};

/**
 *
 * @returns {engine|*}
 */
Game.prototype.getPhysicsEngine = function () {
    return this._physicsEngine;
};

/**
 *
 * @param timestamp
 */
Game.prototype._onAnimationFrame = function (timestamp) {
    // is this the first run?
    if (this._totalElapsedTime === null) {
        this._totalElapsedTime = timestamp;
    }

    // any scene waiting to be swapped?
    if (this._swapScene && !this._swappingScenes) {
        this.changeScene(this._swapScene);
        this._swapScene = null;
    }

    // calculate the current delta time value:
    var delta = timestamp - this._totalElapsedTime;
    var self = this;
    this._totalElapsedTime = timestamp;

    if (!this._paused && isGameScene(this._gameScene) && !this._swappingScenes) {
        // handle the active game scene interactions here:

        // TODO: before release, add the try here..
        //try {
        // the user defined the game scene update function?
        if (isFunction(this._gameScene.update)) {
            // call user defined update function:
            this._executionPhase = SC.EXECUTION_PHASES.UPDATE;
            this._gameScene.update(delta);
        }

        if (isFunction(this._gameScene.lateUpdate)) {
            // call user defined update function:
            this._executionPhase = SC.EXECUTION_PHASES.LATE_UPDATE;
            this._gameScene.lateUpdate(delta);
        }

        this._gameScene.sceneLateUpdate(delta);

        // prepare the webgl context for rendering:
        this._gameScene.prepareRender();

        // render extensions?
        var renderExtensions = Object.keys(this._renderExtensions);
        renderExtensions.forEach(function (name) {
            self._renderExtensions[name].render(delta);
        });

        // the user defined the game scene early-render function?
        if (isFunction(this._gameScene.render)) {
            this._executionPhase = SC.EXECUTION_PHASES.RENDER;
            this._gameScene.render(delta);
        }

        // call internal scene render function:
        this._executionPhase = SC.EXECUTION_PHASES.SCENE_RENDER;
        this._gameScene.sceneRender(delta);

        // the user defined the game scene pre-render function?
        if (isFunction(this._gameScene.lateRender)) {
            this._executionPhase = SC.EXECUTION_PHASES.LATE_RENDER;
            this._gameScene.lateRender(delta);
        }

        //} catch (ex) {
        //	this._logger.error(ex);
        //}

        this._executionPhase = SC.EXECUTION_PHASES.WAITING;
    }

    // request a new animation frame:
    requestAnimationFrame(this._onAnimationFrame.bind(this));
};

Game.prototype.pauseGame = function () {
    this._pause = true;
};

Game.prototype.resumeGame = function () {
    this._pause = false;
};

Game.prototype.getShaderManager = function () {
    return this._shaderManager;
};

Game.prototype.getActiveCamera = function () {
    return this._gameScene ? this._gameScene.getCamera() : null;
};

Game.prototype.getExecutionPhase = function () {
    return this._executionPhase;
};

Game.prototype.init = function () {
    // context initialization
    if (!isObjectAssigned(this._canvas)) {
        this._logger.warn("Cannot initialize game, the render display target was not provided or is invalid.");
        return;
    }

    // request to begin the animation frame handling
    this._onAnimationFrame(0);

    // set this as the active game:
    GameManager.activeGame = this;

    this._initalized = true;
};

/**
 * Set this as the active game
 */
Game.prototype.setActive = function () {
    GameManager.activeGame = this;
};

Game.prototype.setVirtualResolution = function (width, height) {
    this._virtualResolution = {
        width: width,
        height: height
    };

    if (isObjectAssigned(this._renderContext)) {
        this._renderContext.setVirtualResolution(width, height);

        // update camera view size:
        this.getActiveCamera().setViewSize(width, height);
    }
};

Game.prototype.refreshVirtualResolution = function () {
    this._renderContext.setVirtualResolution(this._virtualResolution.width, this._virtualResolution.height);

    var camera = this.getActiveCamera();
    if (camera) {
        camera.setViewSize(this._virtualResolution.width, this._virtualResolution.height);
    }
};

Game.prototype.getVirtualResolution = function () {
    return this._virtualResolution;
};

Game.prototype.getRenderContext = function () {
    return this._renderContext;
};

Game.prototype.setTarget = function (target) {
    this._canvas = isString(target) ? document.getElementById(target) : null;

    if (isObjectAssigned(this._canvas)) {
        // OPTIONAL: for now there is only WebGL Context, add more if needed:
        // assign the render context..
        this._renderContext = new WebGLContext({
            renderContainer: this._canvas
        });

        // setting the global active render as the one selected for this game:
        GameManager.renderContext = this._renderContext;
        this._shaderManager = new ShaderManager(this);

        this.refreshVirtualResolution();
    }
};

Game.prototype.changeScene = function (scene) {
    if (!isGameScene(scene)) {
        return;
    }

    // is it safe to swap scenes now?
    if (this._executionPhase == SC.EXECUTION_PHASES.WAITING) {
        // flag the swapping state
        this._swappingScenes = true;

        if (this._gameScene) {
            // unload the active scene:
            this._gameScene.unload();
        }

        this._gameScene = scene;
        this._gameScene.setGame(this);

        GameManager.activeScene = scene;
        this.refreshVirtualResolution();

        // the user defined the game scene initialize function?
        if (isFunction(this._gameScene.initialize)) {
            // call user defined update function:
            this._gameScene.initialize();
        }

        this._swappingScenes = false;

    } else {
        // nope, store this scene to change in the next animation frame start
        this._swapScene = scene;
    }
};

Game.prototype.getTotalElapsedTime = function () {
    return this._totalElapsedTime;
};

Game.prototype.unload = function () {
};;/**
 * Game Manager static class
 */
var GameManager = function() {};

/**
 * The active render context
 * @type {renderContext}
 */
GameManager.renderContext = null;
GameManager.activeScene = null;
GameManager.activeProject = null;
GameManager.activeGame = null;
GameManager.activeProjectPath = null;;/**
 * GameObject class
 */
AttributeDictionary.addRule("gameobject", "transform", {ownContainer: true});
AttributeDictionary.addRule("gameobject", "_parent", {visible: false});

function GameObject(params) {
    params = params || {};

    // public properties:
    this.name = params.name || "GameObject";
    this.enabled = true;

    if (params.transform) {
        params.transform.gameObject = this;
    }

    this.transform = params.transform || new Transform({gameObject: this});

    // private properties:
    this._uid = generateUID();
    this._parent = params.parent || null;
    this._children = params.children || [];
    this._components = params.components || [];
    this._transformMatrix = mat4.create();
}

GameObject.prototype.equals = function (other) {
    if (other.getUID) {
        return this._uid === other.getUID();
    }

    return this === other;
};

GameObject.prototype.getBaseWidth = function() {
    return 1;
};

GameObject.prototype.getBaseHeight = function() {
    return 1;
};

GameObject.prototype.getType = function () {
    return "GameObject";
};

GameObject.prototype.getUID = function () {
    return this._uid;
};

GameObject.prototype.propagatePropertyUpdate = function (property, value) {
    for (var i = 0; i < this._components.length; ++i) {
        if (this._components[i]["onGameObject" + property + "Updated"]) {
            this._components[i]["onGameObject" + property + "Updated"](value);
        }
    }
};

GameObject.prototype.getMatrix = function () {
    mat4.identity(this._transformMatrix);
    mat4.translate(this._transformMatrix, this._transformMatrix, [this.transform.getPosition().x, this.transform.getPosition().y, 0]);

    return this._transformMatrix;
};

GameObject.prototype.getParent = function () {
    return this._parent;
};

GameObject.prototype.setParent = function (gameObject) {
    if (gameObject.getParent() != null) {
        gameObject.getParent().removeChild(gameObject);
    }

    this._parent = gameObject;
};

GameObject.prototype.removeChild = function (gameObject) {
    for (var i = this._children.length - 1; i >= 0; i--) {
        if (this._children[i].getUID() == gameObject.getUID()) {
            this._children.splice(i, 1);
            break;
        }
    }
};

GameObject.prototype.getChildren = function () {
    return this._children;
};

GameObject.prototype.addChild = function (gameObject) {
    // update the object parent
    gameObject.setParent(gameObject);

    // add this to our children array
    this._children.push(gameObject);
};

GameObject.prototype.addComponent = function (component) {
    if (isFunction(component.setGameObject)) {
        component.setGameObject(this);
    }

    this._components.push(component);
};

GameObject.prototype.update = function (delta) {
    if (!this.enabled) {
        return;
    }

    // update children:
    this._children.forEach(function (elem) {
        if (elem.update) {
            elem.update(delta);
        }
    });
};

GameObject.prototype.render = function (delta, spriteBatch) {
    if (!this.enabled) {
        return;
    }

    // render children:
    this._children.forEach(function (elem) {
        if (elem.render) {
            elem.render(delta, spriteBatch);
        }
    });
};

GameObject.prototype.getComponents = function () {
    return this._components;
};

/**
 * Gets the boundary of this game object with added bulk if needed
 * @param bulk
 * @returns {Boundary}
 */
GameObject.prototype.getBoundary = function (bulk) {
    var mat = this.getMatrix();

    var boundary = new Boundary(
        Vector2.transformMat4(new Vector2(0, 0), mat),
        Vector2.transformMat4(new Vector2(1, 0), mat),
        Vector2.transformMat4(new Vector2(1, 1), mat),
        Vector2.transformMat4(new Vector2(0, 1), mat)
    );

    if (bulk) {
        boundary.topLeft.x -= bulk;
        boundary.topLeft.y -= bulk;
        boundary.topRight.x += bulk;
        boundary.topRight.y -= bulk;
        boundary.bottomRight.x += bulk;
        boundary.bottomRight.y += bulk;
        boundary.bottomLeft.x -= bulk;
        boundary.bottomLeft.y += bulk;
    }

    return boundary;
};

/**
 * Fast boundary mapping without taking in consideration rotation
 * @param bulk
 * @returns {Rectangle}
 */
GameObject.prototype.getRectangleBoundary = function (bulk) {
    var vertices = this.getBoundary(bulk);

    // find the min and max width to form the rectangle boundary
    var minX = Math.min(vertices.topLeft.x, vertices.topRight.x, vertices.bottomLeft.x, vertices.bottomRight.x);
    var maxX = Math.max(vertices.topLeft.x, vertices.topRight.x, vertices.bottomLeft.x, vertices.bottomRight.x);
    var minY = Math.min(vertices.topLeft.y, vertices.topRight.y, vertices.bottomLeft.y, vertices.bottomRight.y);
    var maxY = Math.max(vertices.topLeft.y, vertices.topRight.y, vertices.bottomLeft.y, vertices.bottomRight.y);

    // return the generated rectangle:
    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
};

/**
 *
 * @param gameObject
 * @param bulk
 * @param bulkOther
 * @returns {boolean}
 */
GameObject.prototype.collidesWith = function (gameObject, bulk, bulkOther) {
    var boundaryA = this.getBoundary(bulk);
    var boundaryB = gameObject.getBoundary(bulkOther);

    return Boundary.overlap(boundaryA, boundaryB);
};

/**
 * Tests collision with a point
 * @param point
 * @param bulk
 * @returns {boolean}
 */
GameObject.prototype.collidesWithPoint = function (point, bulk) {
    var boundaryA = this.getBoundary(bulk);
    var boundaryB = new Boundary(
        new Vector2(point.x, point.y),
        new Vector2(point.x + 1, point.y),
        new Vector2(point.x + 1, point.y + 1),
        new Vector2(point.x, point.y + 1));

    return Boundary.overlap(boundaryA, boundaryB);
};

GameObject.prototype.objectify = function () {
    return {
        name: this.name,
        transform: this.transform.objectify(),
        children: Objectify.array(this._children),
        components: Objectify.array(this._components)
    };
};

GameObject.restore = function (data) {
    return new GameObject({
        name: data.name,
        transform: Transform.restore(data.transform),
        children: Objectify.restoreArray(data.children),
        components: Objectify.restoreArray(data.components)
    });
};

GameObject.prototype.unload = function () {
    for (var i = 0; i < this._components.length; ++i) {
        if (isFunction(this._components[i].unload)) {
            this._components[i].unload();
        }
    }
};

;/**
 * GameProject class
 */
function GameProject (name) {
	// public properties:
	this.name = name;
}

GameProject.prototype.toJSON = function() {
	return {
		name: this.name
	};
};

;/**
 * GameScene class
 */
function GameScene(params) {
    params = params || {};

    if (!params.game) {
        throw "cannot create a game scene without the game parameter";
    }

    // public properties:

    this.name = params.name || "GameScene";

    // private properties:
    this._uid = generateUID();
    this._game = params.game || null;
    this._backgroundColor = params.backgroundColor || Color.CornflowerBlue;
    this._gameObjects = params.gameObjects || [];
    this._camera = params.camera || new Camera2D(0, 0, this._game.getVirtualResolution().width, this._game.getVirtualResolution().height); // the default scene camera
    this._spriteBatch = new SpriteBatch(params.game);
}

GameScene.prototype.getUID = function () {
    return this._uid;
};

GameScene.prototype.getPhysicsWorld = function () {
    return this._game.getPhysicsEngine().world;
};

GameScene.prototype.getCamera = function () {
    return this._camera
};

GameScene.prototype.setGame = function (game) {
    this._game = game;
};

GameScene.prototype.getGame = function () {
    return this._game;
};

GameScene.prototype.setBackgroundColor = function (color) {
    this._backgroundColor = color;
};

GameScene.prototype.getBackgroundColor = function () {
    return this._backgroundColor;
};

GameScene.prototype.addGameObject = function (entity) {
    this._gameObjects.push(entity);
};

GameScene.prototype.getGameObjects = function () {
    return this._gameObjects;
};

GameScene.prototype.removeEntity = function (entity) {
    // TODO: implement
};

/**
 * Returns an array with all the game objects of this scene. All child game objects are included.
 */
GameScene.prototype.getAllGameObjects = function () {
    var result = [];

    function recursive(gameObjects) {
        gameObjects.forEach(function (elem) {
            result.push(elem);
            recursive(elem.getChildren());
        });
    }

    recursive(this._gameObjects);

    return result;
};

GameScene.prototype.prepareRender = function () {
    var gl = this._game.getRenderContext().getContext();

    // set clear color and clear the screen:
    gl.clearColor(this._backgroundColor.r, this._backgroundColor.g, this._backgroundColor.b, this._backgroundColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

GameScene.prototype.sceneLateUpdate = function (delta) {
    Matter.Engine.update(this._game.getPhysicsEngine(), 1000 / 60);
};

GameScene.prototype.sceneRender = function (delta) {
    // let's render all game objects on scene:
    for (var i = 0; i < this._gameObjects.length; i++) {
        this._gameObjects[i].render(delta, this._spriteBatch);
    }

    // all draw data was stored, now let's actually render stuff into the screen!
    this._spriteBatch.flush();
};

GameScene.prototype.objectify = function () {
    return {
        name: this.name,
        camera: this._camera.objectify(),
        backgroundColor: this._backgroundColor.objectify(),
        gameObjects: Objectify.array(this._gameObjects)
    };
};

GameScene.restore = function (data) {
    return new GameScene({
        game: GameManager.activeGame,
        backgroundColor: Color.restore(data.backgroundColor),
        camera: Camera2D.restore(data.camera),
        gameObjects: Objectify.restoreArray(data.gameObjects)
    });
};

GameScene.prototype.unload = function () {

};;/**
 * PrimitiveBatch class for on demand direct drawing
 */
function PrimitiveBatch(game) {
	if (!isGame(game)) {
		throw error("Cannot create primitive render, the Game object is missing from the parameters");
	}

	// public properties:


	// private properties:
	this._game = game;
	this._gl = game.getRenderContext().getContext();
	this._primitiveShader = new PrimitiveShader();
	this._vertexBuffer = this._gl.createBuffer();
	this._colorBuffer = this._gl.createBuffer();

	this._rectangleVertexData = [];
	this._rectangleColorData = [];
	this._rectangleCount = 0;
	
	this._transformMatrix = mat4.create();
	this._rectangleData = new Float32Array([
		0.0,  0.0,
		1.0,  0.0,
		0.0,  1.0,
		0.0,  1.0,
		1.0,  0.0,
		1.0,  1.0
	]);
}

PrimitiveBatch.prototype.unload = function () {
	gl.deleteBuffer(this._vertexBuffer);
	gl.deleteBuffer(this._colorBuffer);

	this._primitiveShader.unload();
};

PrimitiveBatch.prototype.begin = function() {
	var gl = this._gl;

	// bind buffers
	//gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
};

PrimitiveBatch.prototype.clear = function() {
	this._rectangleVertexData = [];
	this._rectangleColorData = [];
	this._rectangleCount = 0;
};

PrimitiveBatch.prototype.flush = function() {
	var gl = this._gl;
	var cameraMatrix = this._game.getActiveCamera().getMatrix();

	this._game.getShaderManager().useShader(this._primitiveShader);

	// draw rectangles?
	if(this._rectangleCount > 0) {
		// position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this._rectangleData, gl.STATIC_DRAW);

		gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
		gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

		// set uniforms
		gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, cameraMatrix);

		for(var i = 0; i < this._rectangleCount; i++) {
			mat4.identity(this._transformMatrix);
			mat4.translate(this._transformMatrix, this._transformMatrix, [this._rectangleVertexData[i].x, this._rectangleVertexData[i].y, 0]);
			mat4.scale(this._transformMatrix, this._transformMatrix, [this._rectangleVertexData[i].width, this._rectangleVertexData[i].height, 0]);

			gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, this._transformMatrix);
			gl.uniform4f(this._primitiveShader.uniforms.uColor._location,
						 this._rectangleColorData[i].r, this._rectangleColorData[i].g, this._rectangleColorData[i].b, this._rectangleColorData[i].a);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}
	}

	this.clear();
};

PrimitiveBatch.prototype.drawPoint = function (vector, size, color) {

};

PrimitiveBatch.prototype.storeRectangle = function (rectangle, color) {
	this._rectangleColorData.push(color);
	this._rectangleVertexData.push(rectangle);
	this._rectangleCount++;
};

PrimitiveBatch.prototype.drawLine = function (vectorA, vectorB, thickness, color) {

};;/**
 * PrimitiveRender class for on demand direct drawing
 */
function PrimitiveRender(game) {
    if (!isGame(game)) {
        throw "Cannot create primitive render, the Game object is missing from the parameters";
    }

    // public properties:


    // private properties:
    this._game = game;
    this._gl = game.getRenderContext().getContext();
    this._primitiveShader = new PrimitiveShader();
    this._vertexBuffer = this._gl.createBuffer();
    this._transformMatrix = mat4.create();
    this._rectangleData = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]);
    this._pointData = new Float32Array([
        0.0, 0.0
    ]);
}

PrimitiveRender.prototype.unload = function () {
    gl.deleteBuffer(this._vertexBuffer);

    this._primitiveShader.unload();
};

PrimitiveRender.prototype.drawPoint = function (vector, size, color) {
    // TODO: refactor this method
    var gl = this._gl;

    this._game.getShaderManager().useShader(this._primitiveShader);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._pointData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, this._gl.FLOAT, false, 0, 0);

    // calculate transformation matrix:
    mat4.identity(this._transformMatrix);
    mat4.translate(this._transformMatrix, this._transformMatrix, [vector.x, vector.y, 0]);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, this._transformMatrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);
    gl.uniform1f(this._primitiveShader.uniforms.uPointSize._location, size);

    gl.drawArrays(gl.POINTS, 0, 1);
};

PrimitiveRender.prototype.drawTriangle = function (vectorA, vectorB, vectorC, color) {
    var gl = this._gl;
    var transformMatrix = this._transformMatrix;

    this._game.getShaderManager().useShader(this._primitiveShader);

    var triangleData = new Float32Array([
        vectorA.x, vectorA.y,
        vectorB.x, vectorB.y,
        vectorC.x, vectorC.y
    ]);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    // calculate transformation matrix (if not provided):
    mat4.identity(transformMatrix);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, transformMatrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
};

PrimitiveRender.prototype.drawCircle = function (position, radius, iterations, color) {
    var gl = this._gl;

    this._game.getShaderManager().useShader(this._primitiveShader);

    var triangleData = [];
    for (var i = 0; i < iterations; i++) {
        triangleData.push(position.x + (radius * Math.cos(i * MathHelper.PI2 / iterations)));
        triangleData.push(position.y + (radius * Math.sin(i * MathHelper.PI2 / iterations)));
    }
    triangleData = new Float32Array(triangleData);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, this._gl.FLOAT, false, 0, 0);

    mat4.identity(this._transformMatrix);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, this._transformMatrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, iterations);
};

PrimitiveRender.prototype.drawRectangle = function (rectangle, color, rotation) {
    var gl = this._gl;
    var transformMatrix = this._transformMatrix;

    this._game.getShaderManager().useShader(this._primitiveShader);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._rectangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    // calculate transformation matrix (if not provided):
    mat4.identity(transformMatrix);
    mat4.translate(transformMatrix, transformMatrix, [rectangle.x, rectangle.y, 0]);

    // rotate the rectangle?
    if (rotation) {
        mat4.translate(transformMatrix, transformMatrix, [rectangle.width / 2, rectangle.height / 2, 0]);
        mat4.rotate(transformMatrix, transformMatrix, rotation, [0.0, 0.0, 1.0]);
        mat4.translate(transformMatrix, transformMatrix, [-rectangle.width / 2, -rectangle.height / 2, 0]);
    }

    mat4.scale(transformMatrix, transformMatrix, [rectangle.width, rectangle.height, 0]);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, transformMatrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

PrimitiveRender.prototype.drawRectangleFromMatrix = function (matrix, color) {
    var gl = this._gl;

    this._game.getShaderManager().useShader(this._primitiveShader);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._rectangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, matrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

PrimitiveRender.prototype.drawLine = function (vectorA, vectorB, thickness, color) {
    var gl = this._gl;
    //gl.lineWidth(thickness); // not all implementations support this

    this._game.getShaderManager().useShader(this._primitiveShader);

    var pointData = new Float32Array([
        vectorA.x, vectorA.y,
        vectorB.x, vectorB.y
    ]);

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._primitiveShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._primitiveShader.attributes.aVertexPosition, 2, this._gl.FLOAT, false, 0, 0);

    mat4.identity(this._transformMatrix);

    // set uniforms
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uMatrix._location, false, this._game.getActiveCamera().getMatrix());
    gl.uniformMatrix4fv(this._primitiveShader.uniforms.uTransform._location, false, this._transformMatrix);
    gl.uniform4f(this._primitiveShader.uniforms.uColor._location, color.r, color.g, color.b, color.a);

    gl.drawArrays(gl.LINES, 0, 2);
};;/**
 * Sprite class
 */
AttributeDictionary.inherit("sprite", "gameobject");
AttributeDictionary.addRule("sprite", "_textureSrc", {displayName: "Image Src", editor: "filepath"});
AttributeDictionary.addRule("sprite", "_tint", {displayName: "Tint"});
AttributeDictionary.addRule("sprite", "_texture", {visible: false});

function Sprite(params) {
    params = params || {};
    params.name = params.name || "Sprite";

    GameObject.call(this, params);

    // private properties:
    this._texture = params.texture;
    this._textureSrc = "";
    this._tint = params.tint || Color.fromRGB(255, 255, 255);
    this._textureWidth = 0;
    this._textureHeight = 0;
    this._origin = new Vector2(0.5, 0.5);
}

inheritsFrom(Sprite, GameObject);

Sprite.prototype.getBaseWidth = function() {
    return this._textureWidth;
};

Sprite.prototype.getBaseHeight = function() {
    return this._textureHeight;
};

Sprite.prototype.getMatrix = function () {
    var width = this._textureWidth * this.transform.getScale().x;
    var height = this._textureHeight * this.transform.getScale().y;

    mat4.identity(this._transformMatrix);
    mat4.translate(this._transformMatrix, this._transformMatrix, [this.transform.getPosition().x - width * this._origin.x, this.transform.getPosition().y - height * this._origin.y, 0]);
    mat4.translate(this._transformMatrix, this._transformMatrix, [width * this._origin.x, height * this._origin.y, 0]);
    mat4.rotate(this._transformMatrix, this._transformMatrix, this.transform.getRotation(), [0.0, 0.0, 1.0]);
    mat4.translate(this._transformMatrix, this._transformMatrix, [-width * this._origin.x, -height * this._origin.y, 0]);
    mat4.scale(this._transformMatrix, this._transformMatrix, [width, height, 0]);

    return this._transformMatrix;
};

Sprite.prototype.setOrigin = function (origin) {
    this._origin = origin;
};

Sprite.prototype.getOrigin = function () {
    return this._origin;
};

Sprite.prototype.setTint = function (color) {
    this._tint = color;
};

Sprite.prototype.getTint = function () {
    return this._tint;
};

Sprite.prototype.setTextureSrc = function (path) {
    this._textureSrc = path;

    if (path && path.length > 0) {
        Texture2D.fromPath(path).then(
            (function (texture) {
                this.setTexture(texture);
            }).bind(this), (function (error) {
                this.setTexture(null);
            }).bind(this)
        );
    } else {
        this.setTexture(null);
    }
};

Sprite.prototype.getTextureSrc = function () {
    return this._textureSrc;
};

Sprite.prototype.getType = function () {
    return "Sprite";
};

Sprite.prototype.getTexture = function () {
    return this._texture;
};

Sprite.prototype.setTexture = function (texture) {
    // is this a ready texture?
    if (!texture || !texture.isReady()) {
        return;
    }

    this._texture = texture;

    // cache the dimensions
    this._textureWidth = this._texture.getWidth();
    this._textureHeight = this._texture.getHeight();
};

Sprite.prototype.render = function (delta, spriteBatch) {
    if (!this.enabled) {
        return;
    }

    // just store the sprite to render on flush:
    spriteBatch.storeSprite(this);

    // parent render function:
    GameObject.prototype.render.call(this, delta, spriteBatch);
};

// functions:
Sprite.prototype.objectify = function () {
    var superObjectify = GameObject.prototype.objectify.call(this);
    return Objectify.extend(superObjectify, {
        src: this._textureSrc,
        tint: this._tint.objectify()
    });
};

Sprite.restore = function (data) {
    var sprite = new Sprite({
        name: data.name,
        transform: Transform.restore(data.transform),
        children: Objectify.restoreArray(data.children),
        components: Objectify.restoreArray(data.components)
    });

    sprite.setTextureSrc(data.src);

    return sprite;
};

Sprite.prototype.unload = function () {

};
;/**
 * SpriteBatch class
 */
function SpriteBatch(game) {
    if (!isGame(game)) {
        throw error("Cannot create sprite render, the Game object is missing from the parameters");
    }

    // public properties:


    // private properties:
    this._game = game;
    this._gl = game.getRenderContext().getContext();
    this._vertexBuffer = this._gl.createBuffer();
    this._texBuffer = this._gl.createBuffer();
    this._textureShader = new TextureShader();
    this._lastTexUID = -1;
    this._sprites = [];
    this._rectangleData = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]);
    this._textureData = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]);
}

SpriteBatch.prototype.clear = function () {
    this._sprites = [];
};

SpriteBatch.prototype.storeSprite = function (sprite) {
    this._sprites.push(sprite);
};

SpriteBatch.prototype.flush = function () {
    if (this._sprites.length == 0) {
        return;
    }

    var gl = this._gl;
    var cameraMatrix = this._game.getActiveCamera().getMatrix();

    this._game.getShaderManager().useShader(this._textureShader);

    // position buffer attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._rectangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._textureShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._textureShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    // texture attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._textureData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this._textureShader.attributes.aTextureCoord);
    gl.vertexAttribPointer(this._textureShader.attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

    // set uniforms
    gl.uniformMatrix4fv(this._textureShader.uniforms.uMatrix._location, false, cameraMatrix);

    var texture, tint;
    for (var i = 0; i < this._sprites.length; i++) {
        texture = this._sprites[i].getTexture();

        if (texture && texture.isReady()) {
            tint = this._sprites[i].getTint();

            // for performance sake, consider if the texture is the same so we don't need to bind again
            // TODO: maybe it's a good idea to group the textures somehow (depth should be considered)
            if (this._lastTexUID != texture.getUID()) {
                texture.bind();
                this._lastTexUID = texture.getUID();
            }

            gl.uniformMatrix4fv(this._textureShader.uniforms.uTransform._location, false, this._sprites[i].getMatrix());

            if (tint) {
                gl.uniform4f(this._textureShader.uniforms.uColor._location, tint.r, tint.g, tint.b, tint.a);
            }

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }

    this.clear();
};

SpriteBatch.prototype.unload = function () {
    gl.deleteBuffer(this._vertexBuffer);
    gl.deleteBuffer(this._texBuffer);

    this._textureShader.unload();
};;/**
 * SpriteBatch class
 */
function SpriteBatchOld(game) {
    if (!isGame(game)) {
        throw error("Cannot create sprite render, the Game object is missing from the parameters");
    }

    // public properties:


    // private properties:
    this._game = game;
    this._gl = game.getRenderContext().getContext();
    this._vertexBuffer = this._gl.createBuffer();
    this._texBuffer = this._gl.createBuffer();
    this._transformMatrix = mat4.create();
    this._textureShader = new TextureShader();
    this._lastTexUID = -1;
    this._drawData = [];
    this._rectangleData = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]);
    this._textureData = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]);
}

SpriteBatchOld.prototype.clear = function () {
    this._drawData = [];
};

SpriteBatchOld.prototype.storeSprite = function (sprite) {
    this._drawData.push({
        texture: sprite.getTexture(),
        x: sprite.transform.getPosition().x,
        y: sprite.transform.getPosition().y,
        scaleX: sprite.transform.getScale().x,
        scaleY: sprite.transform.getScale().y,
        rotation: sprite.transform.getRotation(),
        tint: sprite.getTint()
    });
};

SpriteBatchOld.prototype.store = function (texture, x, y, scaleX, scaleY, rotation) {
    this._drawData.push({
        texture: texture,
        x: x,
        y: y,
        scaleX: scaleX,
        scaleY: scaleY,
        rotation: rotation
    });
};

SpriteBatchOld.prototype.flush = function () {
    if (this._drawData.length == 0) {
        return;
    }

    var gl = this._gl;
    var cameraMatrix = this._game.getActiveCamera().getMatrix();

    this._game.getShaderManager().useShader(this._textureShader);

    // position buffer attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._rectangleData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._textureShader.attributes.aVertexPosition);
    gl.vertexAttribPointer(this._textureShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    //gl.enableVertexAttribArray(this._textureShader.attributes.aColor);
    //gl.vertexAttribPointer(this._textureShader.attributes.aColor, 4, gl.FLOAT, false, 0, 0);

    // texture attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._textureData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this._textureShader.attributes.aTextureCoord);
    gl.vertexAttribPointer(this._textureShader.attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

    // set uniforms
    gl.uniformMatrix4fv(this._textureShader.uniforms.uMatrix._location, false, cameraMatrix);

    for (var i = 0; i < this._drawData.length; i++) {
        var texture = this._drawData[i].texture;
        if (texture && texture.isReady()) {

            // for performance sake, consider if the texture is the same so we don't need to bind again
            // TODO: maybe it's a good idea to group the textures somehow (depth should be considered)
            if (this._lastTexUID != texture.getUID()) {
                texture.bind();
                this._lastTexUID = texture.getUID();
            }

            var width = texture.getImageData().width * this._drawData[i].scaleX;
            var height = texture.getImageData().height * this._drawData[i].scaleY;

            mat4.identity(this._transformMatrix);
            mat4.translate(this._transformMatrix, this._transformMatrix, [this._drawData[i].x, this._drawData[i].y, 0]);
            mat4.translate(this._transformMatrix, this._transformMatrix, [width / 2, height / 2, 0]);
            mat4.rotate(this._transformMatrix, this._transformMatrix, this._drawData[i].rotation, [0.0, 0.0, 1.0]);
            mat4.translate(this._transformMatrix, this._transformMatrix, [-width / 2, -height / 2, 0]);
            mat4.scale(this._transformMatrix, this._transformMatrix, [width, height, 0]);
            
            gl.uniformMatrix4fv(this._textureShader.uniforms.uTransform._location, false, this._transformMatrix);

            if (this._drawData[i].tint) {
                gl.uniform4f(this._textureShader.uniforms.uColor._location, this._drawData[i].tint.r, this._drawData[i].tint.g, this._drawData[i].tint.b, this._drawData[i].tint.a);
            }

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }

    this.clear();
};

SpriteBatchOld.prototype.unload = function () {
    gl.deleteBuffer(this._vertexBuffer);
    gl.deleteBuffer(this._texBuffer);

    this._textureShader.unload();
};;/**
 * Texture2D class
 */
function Texture2D(source) {
    if (!isObjectAssigned(source)) {
        throw error("Cannot create Texture2D without a valid source filename");
    }

    // public properties:


    // private properties:
    this._uid = generateUID();
    this._source = source;
    this._texture = null;
    this._gl = gl = GameManager.renderContext.getContext();

    // Prepare the webgl texture:
    this._texture = gl.createTexture();

    // binding
    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._source);

    this._hasLoaded = true;
}

Texture2D.fromPath = function (path) {
    var promise = new Promise((function (resolve, reject) {
        ImageLoader.loadImage(path, function (e) {
            if (e.success) {
                var texture = new Texture2D(e.data);
                resolve(texture);

            } else {
                reject();

                // TODO: log this
            }
        });
    }).bind(this));

    return promise;
};

Texture2D.prototype.getUID = function () {
    return this._uid;
};

Texture2D.prototype.bind = function () {
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
};

Texture2D.prototype.setImageData = function (imageData) {
    this._source = imageData;
};

Texture2D.prototype.getWidth = function () {
    return this._source.width;
};

Texture2D.prototype.getHeight = function () {
    return this._source.height;
};

Texture2D.prototype.getImageData = function () {
    return this._source;
};

Texture2D.prototype.getTexture = function () {
    return this._texture;
};

Texture2D.prototype.isReady = function () {
    return this._hasLoaded;
};

Texture2D.prototype.unload = function () {

};;/**
 * Transform class
 */
AttributeDictionary.addRule("transform", "gameObject", {ownContainer: true});

function Transform(params) {
    params = params || {};

    // public properties:
    this.gameObject = params.gameObject || null;

    // private properties:
    this._position = params.position || new Vector2();
    this._rotation = params.rotation || 0.0;
    this._scale = params.scale || new Vector2(1.0, 1.0);

    this._overridePositionFunction = null;
    this._overrideRotationFunction = null;
    this._overrideScaleFunction = null;
}

Transform.prototype.clearPositionGetter = function () {
    this._overridePositionFunction = null;
};

Transform.prototype.clearRotationGetter = function () {
    this._overrideRotationFunction = null;
};

Transform.prototype.clearScaleGetter = function () {
    this._overrideScaleFunction = null;
};

Transform.prototype.overridePositionGetter = function (overrideFunction) {
    this._overridePositionFunction = overrideFunction;
};

Transform.prototype.overrideScaleGetter = function (overrideFunction) {
    this._overrideScaleFunction = overrideFunction;
};

Transform.prototype.overrideRotationGetter = function (overrideFunction) {
    this._overrideRotationFunction = overrideFunction;
};

Transform.prototype.setPosition = function (x, y) {
    this._position.set(x, y);
    this.gameObject.propagatePropertyUpdate("Position", this._position);
};

Transform.prototype.getPosition = function () {
    if (isFunction(this._overridePositionFunction)) {
        return this._overridePositionFunction();
    }

    return this._position;
};

Transform.prototype.setRotation = function (value) {
    this._rotation = value;
    this.gameObject.propagatePropertyUpdate("Rotation", this._rotation);
};

Transform.prototype.getRotation = function () {
    if (isFunction(this._overrideRotationFunction)) {
        return this._overrideRotationFunction();
    }

    return this._rotation;
};

Transform.prototype.setScale = function (x, y) {
    this._scale.set(x, y);
    this.gameObject.propagatePropertyUpdate("Scale", this._scale);
};

Transform.prototype.getScale = function () {
    if (isFunction(this._overrideScaleFunction)) {
        return this._overrideScaleFunction();
    }

    return this._scale;
};

Transform.prototype.clone = function() {
    return Transform.restore(this.objectify());
};

Transform.prototype.objectify = function () {
    return {
        position: this._position.objectify(),
        rotation: this._rotation,
        scale: this._scale.objectify()
    };
};

Transform.restore = function (data) {
    return new Transform({
        position: Vector2.restore(data.position),
        rotation: data.rotation,
        scale: Vector2.restore(data.scale)
    });
};

Transform.prototype.unload = function () {

};
;/**
 * GridExt class
 */
function GridExt(params) {
    params = params || {};

    if (!params.game) {
        throw "cannot create debug extension without game parameter";
    }

    // public properties:
    this.enabled = true;

    // private properties:
    this._game = params.game || null;
    this._gridSize = 32;
    this._gridColor = Color.Red;
    this._originLines = true;
    this._zoomMultiplier = 2;
    this._primitiveRender = new PrimitiveRender(params.game); // maybe get a batch here?
}

/**
 *
 * @param enable
 */
GridExt.prototype.setOriginLines = function (enable) {
    this._originLines = enable;
};

/**
 *
 * @param value
 */
GridExt.prototype.setGridSize = function (value) {
    this._gridSize = value;
};

/**
 *
 */
GridExt.prototype.getGridSize = function () {
    return this._gridSize;
};

/**
 *
 * @param color
 */
GridExt.prototype.setGridColor = function (color) {
    this._gridColor = color;
};

/**
 *
 * @param delta
 */
GridExt.prototype.render = function (delta) {
    // render a grid?
    if (this.enabled) {
        // I have an idea that can be great here..
        // create a global event for whenever the camera properties change (aka, calculate matrix is called), and store
        // the following calculations on event:
        var zoom = this._game.getActiveCamera().zoom;
        var floorZoom = Math.floor(zoom);

        //var gridSize = floorZoom > 1 ? this._gridSize * floorZoom : this._gridSize;
        var gridSize = this._gridSize;
        for (var i = 0; i < floorZoom - 1; i++) {
            if (i % this._zoomMultiplier == 0) {
                gridSize *= 2;
            }
        }

        var upperGridSize = gridSize * 2;
        var screenResolution = this._game.getVirtualResolution();
        var offsetX = this._game.getActiveCamera().x - (this._game.getActiveCamera().x % gridSize);
        var offsetY = this._game.getActiveCamera().y - (this._game.getActiveCamera().y % gridSize);
        var zoomDifX = (zoom * screenResolution.width) * 2.0;
        var zoomDifY = (zoom * screenResolution.height) * 2.0;
        var howManyX = Math.floor((screenResolution.width + zoomDifX) / gridSize + 2);
        var howManyY = Math.floor((screenResolution.height + zoomDifY) / gridSize + 2);
        var alignedX = Math.floor(howManyX / 2.0) % 2 == 0;
        var alignedY = Math.floor(howManyY / 2.0) % 2 == 0;
        var left = -(screenResolution.width + zoomDifX) / 2;
        var right = (screenResolution.width + zoomDifX) / 2;
        var top = -(screenResolution.height + zoomDifY) / 2;
        var bottom = (screenResolution.height + zoomDifY) / 2;
        var dynColor = this._gridColor.clone();
        var color = null;

        if (zoom > 1) {
            dynColor.a = 1 - ((zoom % this._zoomMultiplier) / this._zoomMultiplier);
        }

        // horizontal shift ||||||||
        for (var x = 0; x < howManyX; x++) {
            color = this._gridColor;
            if (((x * gridSize) + offsetX + (alignedX ? gridSize : 0)) % upperGridSize) {
                color = dynColor;
            }

            this._primitiveRender.drawLine(
                {
                    x: x * gridSize + left - (left % gridSize) + offsetX,
                    y: bottom + gridSize + offsetY
                },
                {
                    x: x * gridSize + left - (left % gridSize) + offsetX,
                    y: top - gridSize + offsetY
                },
                1, color);
        }

        // vertical shift _ _ _ _ _
        for (var y = 0; y < howManyY; y++) {
            color = this._gridColor;
            if (((y * gridSize) + offsetY + (alignedY ? gridSize : 0)) % upperGridSize) {
                color = dynColor;
            }

            this._primitiveRender.drawLine(
                {
                    x: right + this._gridSize + offsetX,
                    y: y * gridSize + top - (top % gridSize) + offsetY
                },
                {
                    x: left - gridSize + offsetX,
                    y: y * gridSize + top - (top % gridSize) + offsetY
                },
                1, color);
        }

        // main "lines" (origin)
        if (this._originLines ) {
            // vertical
            this._primitiveRender.drawRectangle(
                new Rectangle(-2, top - this._gridSize + offsetY, 4, screenResolution.height + zoomDifY),
                this._gridColor);

            // horizontal
            this._primitiveRender.drawRectangle(
                new Rectangle(left - this._gridSize + offsetX, -2, screenResolution.width + zoomDifX, 4),
                this._gridColor);
        }
    }
};;/**
 * Boundary structure
 * @param topLeft
 * @param topRight
 * @param bottomRight
 * @param bottomLeft
 * @constructor
 */
function Boundary(topLeft, topRight, bottomRight, bottomLeft) {
    // public properties:
    this.topLeft = topLeft || new Vector2();
    this.topRight = topRight || new Vector2();
    this.bottomRight = bottomRight || new Vector2();
    this.bottomLeft = bottomLeft || new Vector2();
}

/**
 * Returns all vertices in an array (topLeft, topRight, bottomRight, bottomLeft)
 */
Boundary.prototype.getVertices = function () {
    return [
        this.topLeft,
        this.topRight,
        this.bottomRight,
        this.bottomLeft
    ];
};

/**
 * Calculate the normals of each boundary side and returns a object mapped with the values of each side
 */
Boundary.prototype.getNormals = function () {
    return {
        top: new Vector2(this.topRight.x - this.topLeft.x, this.topRight.y - this.topLeft.y).normalLeft(),
        right: new Vector2(this.bottomRight.x - this.topRight.x, this.bottomRight.y - this.topRight.y).normalLeft(),
        bottom: new Vector2(this.bottomLeft.x - this.bottomRight.x, this.bottomLeft.y - this.bottomRight.y).normalLeft(),
        left: new Vector2(this.topLeft.x - this.bottomLeft.x, this.topLeft.y - this.bottomLeft.y).normalLeft()
    }
};

/**
 * Tests if the boundary is overlapping another
 * @param other
 * @returns {boolean}
 */
Boundary.prototype.overlapsWith = function (other) {
    return Boundary.overlap(this, other);
};

/**
 * Tests if two boundaries are overlapping each other
 * @param boundaryA
 * @param boundaryB
 * @returns {boolean}
 */
Boundary.overlap = function (boundaryA, boundaryB) {
    // the following collision detection is based on the separating axis theorem:
    // http://www.gamedev.net/page/resources/_/technical/game-programming/2d-rotated-rectangle-collision-r2604
    var normA = boundaryA.getNormals();
    var normB = boundaryB.getNormals();

    function getMinMax(boundary, norm) {
        var probeA = boundary.topRight.dot(norm);
        var probeB = boundary.bottomRight.dot(norm);
        var probeC = boundary.bottomLeft.dot(norm);
        var probeD = boundary.topLeft.dot(norm);

        return {
            max: Math.max(probeA, probeB, probeC, probeD),
            min: Math.min(probeA, probeB, probeC, probeD)
        }
    }

    var p1, p2, normNode, norm;
    for (var i = 0; i < 4; i++) {
        normNode = i >= 2 ? normB : normA;
        norm = i % 2 == 0 ? normNode.bottom : normNode.right;
        p1 = getMinMax(boundaryA, norm);
        p2 = getMinMax(boundaryB, norm);

        if (p1.max < p2.min || p2.max < p1.min) {
            return false;
        }
    }

    return true;
};

/**
 * Creates a boundary object based on a given vector and adds the specified bulk dimension
 * @param vec
 * @param bulk
 */
Boundary.fromVector2 = function (vec, bulk) {
    var halfBulk = bulk / 2.0;
    return new Boundary(
        new Vector2(vec.x - halfBulk, vec.y - halfBulk),
        new Vector2(vec.x + halfBulk, vec.y - halfBulk),
        new Vector2(vec.x + halfBulk, vec.y + halfBulk),
        new Vector2(vec.x - halfBulk, vec.y + halfBulk)
    )
};;/**
 * Math helper utility class
 * @constructor
 */
var MathHelper = function () {};

/**
 * PI value
 * @type {number}
 */
MathHelper.PI = Math.PI;

/**
 * PI multiplied by two
 * @type {number}
 */
MathHelper.PI2 = MathHelper.PI * 2.0;

/**
 * PI multiplied by four
 * @type {number}
 */
MathHelper.PI4 = MathHelper.PI * 4.0;

/**
 * PI divided by two
 * @type {number}
 */
MathHelper.PIo2 = MathHelper.PI / 2.0;

/**
 * PI divided by four
 * @type {number}
 */
MathHelper.PIo4 = MathHelper.PI / 4.0;

/**
 * Clamp a value between a min and max value
 * @param value
 * @param min
 * @param max
 */
MathHelper.clamp = function (value, min, max) {
    return (value < min ? min : value > max ? max : value);
};

/**
 * Converts degree to radians
 * @param degrees
 */
MathHelper.degToRad = function (degrees) {
    return degrees * 0.0174532925;
};

/**
 * Converts radians to degrees
 * @param radians
 */
MathHelper.radToDeg = function(radians) {
    return radians * 57.295779513;
};;/**
 * Rectangle class
 */
/**
 * @constructor
 */
SetterDictionary.addRule("ray", ["origin", "direction"]);

function Ray(origin, direction) {
    // public properties:
    this.origin = origin || 0;
    this.direction = direction || 0;

    // private properties:

}

Ray.prototype.set = function(origin, direction) {
    this.origin = origin;
    this.direction = direction;
};

Ray.prototype.objectify = function() {
    return {
        origin: this.origin,
        direction: this.direction
    };
};

Ray.restore = function(data) {
    return new Ray(data.origin, data.direction);
};

Ray.prototype.equals = function(obj) {
    return (obj.origin === this.origin && obj.direction === this.direction);
};

Ray.prototype.unload = function () {

};;/**
 * Rectangle class
 */
/**
 * @constructor
 */
SetterDictionary.addRule("rectangle", ["x", "y", "width", "height"]);

function Rectangle(x, y, width, height) {
    // public properties:
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 10;
    this.height = height || 10;

    // private properties:

}

// static methods

Rectangle.fromVectors = function (va, vb) {
    var x, y, width, height;

    if (va.x > vb.x) {
        x = vb.x;
        width = Math.abs(va.x - vb.x);
    } else {
        x = va.x;
        width = Math.abs(vb.x - va.x);
    }

    if (va.y > vb.y) {
        y = vb.y;
        height = Math.abs(va.y - vb.y);
    } else {
        y = va.y;
        height = Math.abs(vb.y - va.y);
    }

    return new Rectangle(x, y, width, height);
};

// instance methods

/**
 * Get the rectangle vertices based on the position and width/height
 * @returns {{topLeft: Vector2, topRight: Vector2, bottomRight: Vector2, bottomLeft: Vector2}}
 */
Rectangle.prototype.getVertices = function () {
    return {
        topLeft: new Vector2(this.x, this.y),
        topRight: new Vector2(this.x + this.width, this.y),
        bottomRight: new Vector2(this.x + this.width, this.y + this.height),
        bottomLeft: new Vector2(this.x, this.y + this.height)
    }
};

/**
 * Checks if the rectangle is intersecting another given rectangle
 * @param rectangle
 * @returns {boolean}
 */
Rectangle.prototype.intersects = function (rectangle) {
    return (rectangle.x <= this.x + this.width && this.x <= rectangle.x + rectangle.width &&
    rectangle.y <= this.y + this.height && this.y <= rectangle.y + rectangle.height);
};

/**
 * Checks if the given rectangle is contained by the instance
 * @param rectangle
 */
Rectangle.prototype.contains = function (rectangle) {
    return (rectangle.x >= this.x && rectangle.x + rectangle.width <= this.x + this.width &&
    rectangle.y >= this.y && rectangle.y + rectangle.height <= this.y + this.height);
};

Rectangle.prototype.set = function (x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};

Rectangle.prototype.objectify = function () {
    return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
    };
};

Rectangle.restore = function (data) {
    return new Rectangle(data.x, data.y, data.width, data.height);
};

Rectangle.prototype.equals = function (obj) {
    return (obj.x === this.x && obj.y === this.y && obj.width === this.width && obj.height === this.height);
};

Rectangle.prototype.unload = function () {

};;/**
 * Vector2 class for bi dimensional point references
 */
/**
 * @constructor
 */
SetterDictionary.addRule("vector2", ["x", "y"]);

function Vector2(x, y) {
    // public properties:
    this.x = x || 0;
    this.y = y || 0;

    // private properties:

}

// instance functions:

Vector2.prototype.set = function (x, y) {
    this.x = x;
    this.y = y;
};

Vector2.prototype.objectify = function () {
    return {
        x: this.x,
        y: this.y
    };
};

/**
 * The magnitude, or length, of this vector.
 * The magnitude is the L2 norm, or Euclidean distance between the origin and
 * the point represented by the (x, y) components of this Vector object.
 * @returns {number}
 */
Vector2.prototype.magnitude = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 * The square of the magnitude, or length, of this vector.
 * See http://docs.unity3d.com/ScriptReference/Vector3-sqrMagnitude.html
 * @returns {number}
 */
Vector2.prototype.sqrMagnitude = function () {
  return this.x * this.x + this.y * this.y;
};

Vector2.prototype.normalLeft = function () {
    return new Vector2(this.y, -1 * this.x);
};

Vector2.prototype.normalRight = function () {
    return new Vector2(-1 * this.y, this.x);
};

/**
 * The dot product of this vector with another vector.
 * @param vector
 * @returns {number}
 */
Vector2.prototype.dot = function (vector) {
    return this.x * vector.x + this.y * vector.y;
};

/**
 * Calculates the magnitude of the vector that would result from a regular 3D cross product of the input vectors,
 * taking their Z values implicitly as 0 (i.e., treating the 2D space as a plane in the 3D space).
 * The 3D cross product will be perpendicular to that plane, and thus have 0 X & Y components
 * (thus the scalar returned is the Z value of the 3D cross product vector).
 * @param vector
 */
Vector2.prototype.cross = function (vector) {
    return this.x * vector.y - this.y * vector.x;
};

/**
 * The distance between the point represented by this Vector
 * object and a point represented by the given Vector object.
 * @param vector
 * @returns {number}
 */
Vector2.prototype.distanceTo = function (vector) {
    return Math.sqrt((this.x - vector.x)*(this.x - vector.x) +
                     (this.y - vector.y) * (this.y - vector.y));
};

Vector2.prototype.multiply = function (vector) {
    this.x *= vector.x;
    this.y *= vector.y;
};

Vector2.prototype.equals = function (obj) {
    return (obj.x === this.x && obj.y === this.y);
};

Vector2.prototype.unload = function () {

};

Vector2.multiply = function (vectorA, vectorB) {
    return new Vector2(vectorA.x * vectorB.x, vectorA.y * vectorB.y);
};

Vector2.restore = function (data) {
    return new Vector2(data.x, data.y);
};

/**
 * The distance between the points represented by VectorA and VectorB
 * @param vectorA
 * @param vectorB
 * @returns {number}
 */
Vector2.distance = function (vectorA, vectorB) {
    var v1 = vectorA.x - vectorB.x;
    var v2 = vectorA.y - vectorB.y;
    return Math.sqrt((v1 * v1) + (v2 * v2));
};

/**
 * The squared distance between the points represented by VectorA and VectorB
 * @param vectorA
 * @param vectorB
 * @returns {number}
 */
Vector2.sqrDistance = function (vectorA, vectorB) {
    var v1 = vectorA.x - vectorB.x;
    var v2 = vectorA.y - vectorB.y;
    return (v1 * v1) + (v2 * v2);
};

// static functions:

Vector2.transformMat4 = function (vec2, mat) {
    return new Vector2(
        (mat[0] * vec2.x) + (mat[4] * vec2.y) + mat[12],
        (mat[1] * vec2.x) + (mat[5] * vec2.y) + mat[13]);
};

Vector2.transformMat3 = function (vec2, mat) {
    return new Vector2(
        mat[0] * vec2.x + mat[3] * vec2.y + mat[6],
        mat[1] * vec2.x + mat[4] * vec2.y + mat[7]);
};
;/**
 * Vector3 class for tri dimensional point references
 */
SetterDictionary.addRule("vector3", ["x", "y", "z"]);

function Vector3(x, y, z) {
	// public properties:
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;

	// private properties:

}

Vector3.prototype.set = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
};

Vector3.prototype.objectify = function() {
	return {
		x: this.x,
		y: this.y,
		z: this.z
	};
};

Vector3.restore = function(data) {
	return new Vector3(data.x, data.y, data.z);
};

Vector3.prototype.equals = function(obj) {
	return (obj.x === this.x && obj.y === this.y && obj.z === this.z);
};

Vector3.prototype.unload = function () {

};

/**
 * The magnitude, or length, of this vector.
 * The magnitude is the L2 norm, or Euclidean distance between the origin and
 * the point represented by the (x, y, z) components of this Vector object.
 * @returns {number}
 */
Vector3.prototype.magnitude = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

/**
 * The square of the magnitude, or length, of this vector.
 * See http://docs.unity3d.com/ScriptReference/Vector3-sqrMagnitude.html
 * @returns {number}
 */
Vector3.prototype.sqrMagnitude = function () {
	return this.x * this.x + this.y * this.y + this.z * this.z;
};

/**
 * The distance between the point represented by this Vector
 * object and a point represented by the given Vector object.
 * @param vector
 * @returns {number}
 */
Vector3.prototype.distanceTo = function (vector) {
	return Math.sqrt((this.x - vector.x)*(this.x - vector.x) +
		(this.y - vector.y) * (this.y - vector.y) +
		(this.z - vector.z) * (this.z - vector.z));
};

/**
 * The dot product of this vector with another vector.
 * @param vector
 * @returns {number}
 */
Vector3.prototype.dot = function (vector) {
	return (this.x * vector.x) + (this.y * vector.y) + (this.z * vector.z);
};

/**
 * The cross product of this vector and the given vector.
 *
 * The cross product is a vector orthogonal to both original vectors.
 * It has a magnitude equal to the area of a parallelogram having the
 * two vectors as sides. The direction of the returned vector is
 * determined by the right-hand rule.
 * @param vector
 */
Vector3.prototype.cross = function (vector) {
	return new Vector3((this.y * vector.z) - (this.z * vector.y),
		(this.z * vector.x) - (this.x * vector.z),
		(this.x * vector.y) - (this.y * vector.x));
};;/**
 * Vector4 class for tri dimensional point references
 */
SetterDictionary.addRule("vector4", ["x", "y", "z", "w"]);

function Vector4(x, y, z, w) {
	// public properties:
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
	this.w = w || 0;

	// private properties:

}

// instance functions

Vector4.prototype.set = function(x, y, z, w) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;
};

Vector4.prototype.objectify = function() {
	return {
		x: this.x,
		y: this.y,
		z: this.z,
		w: this.w
	};
};

Vector4.restore = function(data) {
	return new Vector4(data.x, data.y, data.z, data.w);
};

Vector4.prototype.equals = function(obj) {
	return (obj.x === this.x && obj.y === this.y && obj.z === this.z && obj.w === this.w);
};

Vector4.prototype.unload = function () {
	
};

// static functions
;/**
 * Shader class
 * Some cool code ideas were applied from Pixi.JS Shader class
 */
function Shader(vertexScript, fragmentScript, uniforms, attributes) {
    if (!isObjectAssigned(vertexScript) || !isObjectAssigned(fragmentScript)) {
        throw new Error("Vertex and Fragment scripts are required to create a shader, discarding..");
    }

    if (!isObjectAssigned(GameManager.renderContext)) {
        throw new Error("The WebGL render context is not yet set, can't create shader.");
    }

    // public properties:
    this.uniforms = uniforms || {};
    this.attributes = attributes || {};

    // private properties:
    this._gl = GameManager.renderContext.getContext();
    this._program = null;
    this._vertexScript = vertexScript;
    this._fragmentScript = fragmentScript;
    this._textureCount = 1;
    this._uid = generateUID();

    this.setup();
}

/**
 * Setup shader logic
 */
Shader.prototype.setup = function () {
    if (this.compile()) {
        var shaderManager = GameManager.activeGame.getShaderManager();
        if (shaderManager) {
            shaderManager.useShader(this);
        } else {
            this._gl.useProgram(this._program);
        }

        // cache some script locations:
        this.cacheUniformLocations(Object.keys(this.uniforms));
        this.cacheAttributeLocations(Object.keys(this.attributes));

    } else {
        debug.error("Shader setup failed");
    }
};

/**
 * Compiles the shader and generates the shader program
 * @returns {boolean}
 */
Shader.prototype.compile = function () {
    var program = glu.createProgramFromScripts(this._gl, this._vertexScript, this._fragmentScript);

    if (isObjectAssigned(program)) {
        this._program = program;

        return true;
    } else {
        program = null;
    }

    return false;
};

/**
 * Gets the unique id of this shader instance
 */
Shader.prototype.getUID = function () {
    return this._uid;
};

/**
 * Cache the uniform locations for faster re-utilization
 * @param keys
 */
Shader.prototype.cacheUniformLocations = function (keys) {
    for (var i = 0; i < keys.length; ++i) {
        this.uniforms[keys[i]]._location = this._gl.getUniformLocation(this._program, keys[i]);
    }
};

/**
 * Cache the attribute locations for faster re-utilization
 * @param keys
 */
Shader.prototype.cacheAttributeLocations = function (keys) {
    for (var i = 0; i < keys.length; ++i) {
        this.attributes[keys[i]] = this._gl.getAttribLocation(this._program, keys[i]);
    }
};

/**
 * Syncs all the uniforms attached to this shader
 */
Shader.prototype.syncUniforms = function () {
    this._textureCount = 1;

    for (var key in this.uniforms) {
        this.syncUniform(this.uniforms[key]);
    }
};

/**
 * Synchronizes/updates the values for the given uniform
 * @param uniform
 */
Shader.prototype.syncUniform = function (uniform) {
    var location = uniform._location,
        value = uniform.value,
        gl = this._gl;

    // depending on the uniform type, WebGL has different ways of synchronizing values
    // the values can either be a Float32Array or JS Array object
    switch (uniform.type) {
        case 'b':
        case 'bool':
            gl.uniform1i(location, value ? 1 : 0);
            break;
        case 'i':
        case '1i':
            gl.uniform1i(location, value);
            break;
        case '2i':
            gl.uniform2i(location, value[0], value[1]);
            break;
        case '3i':
            gl.uniform3i(location, value[0], value[1], value[2]);
            break;
        case '4i':
            gl.uniform4i(location, value[0], value[1], value[2], value[3]);
            break;
        case 'f':
        case '1f':
            gl.uniform1f(location, value);
            break;
        case '2f':
            gl.uniform2f(location, value[0], value[1]);
            break;
        case '3f':
            gl.uniform3f(location, value[0], value[1], value[2]);
            break;
        case '4f':
            gl.uniform4f(location, value[0], value[1], value[2], value[3]);
            break;
        case 'm2':
        case 'mat2':
            gl.uniformMatrix2fv(location, uniform.transpose, value);
            break;
        case 'm3':
        case 'mat3':
            gl.uniformMatrix3fv(location, uniform.transpose, value);
            break;
        case 'm4':
        case 'mat4':
            gl.uniformMatrix4fv(location, uniform.transpose, value);
            break;
        case 'tex':
            if (!isTexture2D(uniform.value) || !uniform.value.isReady()) {
                debug.warn("Could not assign texture uniform because the texture isn't ready.");
                break;
            }

            gl.activeTexture(gl["TEXTURE" + this._textureCount]);

            var texture = uniform.value.getImageData()._glTextures[gl.id];

            // the texture was already sampled?
            if (!isObjectAssigned(texture)) {
                // TODO: do stuff here? :D
            }

            break;
        default:
            debug.warn("Unknown uniform type: " + uniform.type);
            break;
    }
};

Shader.prototype.getProgram = function () {
    return this._program;
};

Shader.prototype.initSampler2D = function (uniform) {
    if (!isTexture2D(uniform.value) || !uniform.value.isReady()) {
        debug.warn("Could not initialize sampler2D because the texture isn't ready.");
        return;
    }

    var imgData = uniform.value.getImageData();
    var texture = imgData.baseTexture;
};

Shader.prototype.unload = function () {
    // clean up program using WebGL flow
    this._gl.deleteProgram(this._program);
};;/**
 * ShaderManager class
 */
/**
 * @constructor
 */
function ShaderManager(game) {
	// private variables
	this._game = game;
	this._gl = this._game.getRenderContext().getContext();
	this._activeShader = null;
}

ShaderManager.prototype.unload = function () {

};

ShaderManager.prototype.useShader = function(shader) {
	// is this the same shader that is being used?
	if(!isObjectAssigned(this._activeShader) || this._activeShader.getUID() !== shader.getUID()) {
		this._activeShader = shader;
		this._gl.useProgram(shader.getProgram());
	}
};
;/**
 * TextureShader class
 * @depends shader.js
 */
function TextureShader() {
    Shader.call(this,
        // inline-vertex shader:
        [
            'precision mediump float;',

            'attribute vec2 aVertexPosition;',
            'attribute vec2 aTextureCoord;',

            'uniform mat4 uMatrix;',
            'uniform mat4 uTransform;',

            'varying vec2 vTextureCoord;',

            'void main(void){',
            '   gl_Position = uMatrix * uTransform * vec4(aVertexPosition, 0.0, 1.0);',
            '   vTextureCoord = aTextureCoord;',
            '}'
        ].join('\n'),
        // inline-fragment shader
        [
            'precision mediump float;',

            'varying vec2 vTextureCoord;',
            'varying vec4 vColor;',

            'uniform sampler2D uSampler;',
            'uniform vec4 uColor;',

            'void main(void){',
            '   gl_FragColor = texture2D(uSampler, vTextureCoord) * uColor;',
            '}'
        ].join('\n'),
        // uniforms:
        {
            uSampler: {type: 'tex', value: 0},
            uMatrix: {type: 'mat4', value: mat4.create()},
            uTransform: {type: 'mat4', value: mat4.create()},
            uColor: [1.0, 1.0, 1.0, 1.0]
        },
        // attributes:
        {
            aVertexPosition:    0,
            aTextureCoord:      0
        });
}

inheritsFrom(TextureShader, Shader);;/**
 * Objectify utility class
 */
var Objectify = function () {
};
Objectify._logger = new Logger("Objectify");

/**
 * Objectify an array:
 * @param array
 */
Objectify.array = function (array) {
    var result = [];
    array.forEach(function (elem) {
        // this element has objectify implemented?
        if (isFunction(elem.objectify)) {
            try {
                var obj = Objectify.create(elem);
                if (obj) {
                    result.push(obj);
                }

            } catch (ex) {
                Objectify._logger.error("Failed to objectify element: " + ex);
            }
        }
    });

    return result;
};

/**
 * Restores to the original state an array of objectified data
 * @param array
 */
Objectify.restoreArray = function (array) {
    var result = [];
    array.forEach(function (elem) {
        if (elem._otype) {
            result.push(Objectify.restore(elem._otype, elem));
        }
    });

    return result;
};

/**
 * Creates an objectify valid data object
 * @param object
 */
Objectify.create = function (object) {
    var type = getType(object);
    var result;

    // this object has objectify?
    if (object.objectify) {
        result = object.objectify();

    } else {
        // nope, we can try to get the public properties then:
        result = JSON.parse(JSON.stringify(object));
    }

    result._otype = type;

    return result;
};

/**
 * Restores an object of a given type
 * @param typeName (the name of the type to restore)
 * @param data (the data to restore)
 */
Objectify.restore = function (typeName, data) {
    try {
        var type = eval(typeName);
        if (type && type.restore) {
            return type.restore(data);
        }
    } catch (ex) {
        Objectify._logger.error("Failed to restore element: " + ex);
    }
};

/**
 * Extends the properties of the objA with the properties of objB
 * @param objA
 * @param objB
 * @returns {*}
 */
Objectify.extend = function (objA, objB) {
    Object.keys(objB).forEach(function (prop) {
        objA[prop] = objB[prop];
    });

    return objA
};;/**
 * IO Path utility class
 */
var Path = function () {
};

/**
 *
 * @type {boolean}
 * @private
 */
Path._IS_WIN = navigator.platform.toLowerCase().indexOf('win') > -1;

/**
 * The appropriate system trailing slash
 * @type {string}
 */
Path.TRAILING_SLASH = Path._IS_WIN ? "\\" : "/";

/**
 * Ensures this is a valid string directory (eg. ends with slash)
 * @param path
 * @returns {string}
 */
Path.wrapDirectoryPath = function (path) {
    return path + (path.endsWith('/') || path.endsWith('\\') ? '' : Path.TRAILING_SLASH);
};

/**
 * Strips only the directory path (excludes file names)
 * @param path
 */
Path.getDirectory = function (path) {
    var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return path.substring(0, (index >= 0 ? index : path.length));
};

/**
 * Returns the directory name from a given path
 * @param path
 * @returns {string}
 */
Path.getDirectoryName = function (path) {
    if (path.endsWith("/") || path.endsWith("\\")) {
        path = path.substring(0, path.length - 1);
    }

    var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return path.substring(index + 1, path.length);
};

/**
 * Gets a filename from a given path
 * @param path
 */
Path.getFilename = function (path) {
    var index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return path.substring((index >= 0 && index < path.length - 1 ? index + 1 : 0), path.length);
};

/**
 * Gets a file extension from a given path
 * @param path
 */
Path.getFileExtension = function (path) {
    return path.substring(path.lastIndexOf('.'), path.length);
};

/**
 * Checks if pathA can be contained inside pathB
 * @param pathA
 * @param pathB
 */
Path.relativeTo = function (pathA, pathB) {
    return Path.wrapDirectoryPath(pathA).indexOf(Path.wrapDirectoryPath(pathB)) === 0;
};

/**
 * Makes the full path relative to the base path
 * @param basePath
 * @param fullPath
 */
Path.makeRelative = function (basePath, fullPath) {
    return fullPath.replace(Path.wrapDirectoryPath(basePath), "");
};;/**
 * WebGL Context class
 */
function WebGLContext(params) {
    params = params || {};

    // public properties:


    // private properties:
    this._logger = new Logger(arguments.callee.name);
    this._canvas = null;
    this._gl = null;

    if (isObjectAssigned(params.renderContainer)) {
        this.assignContextFromContainer(params.renderContainer);
    }
}

WebGLContext.prototype.setVirtualResolution = function (width, height) {
    if (isObjectAssigned(this._gl)) {
        this._canvas.width = width;
        this._canvas.height = height;

        this._gl.viewport(0, 0, width, height);
    }
};

WebGLContext.prototype.assignContextFromContainer = function (canvas) {
    // let's try to get the webgl context from the given container:
    var gl = this._gl = canvas.getContext("experimental-webgl") || canvas.getContext("webgl") ||
        canvas.getContext("webkit-3d") || canvas.getContext("moz-webgl");

    if (!isObjectAssigned(this._gl)) {
        this._logger.warn("WebGL not supported, find a container that does (eg. Chrome, Firefox)");
        return;
    }

    this._canvas = canvas;

    // disable gl functions:
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);

    // enable gl functions:
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

WebGLContext.prototype.getName = function () {
    return SCARLETT.WEBGL;
};

WebGLContext.prototype.getContext = function () {
    return this._gl;
};

WebGLContext.prototype.unload = function () {

};;/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.3.2
 */

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE. */

(function webpackUniversalModuleDefinition(root, factory) {
    if(typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if(typeof define === 'function' && define.amd)
        define([], factory);
    else {
        var a = factory();
        for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
    }
})(this, function() {
    return /******/ (function(modules) { // webpackBootstrap
        /******/ 	// The module cache
        /******/ 	var installedModules = {};

        /******/ 	// The require function
        /******/ 	function __webpack_require__(moduleId) {

            /******/ 		// Check if module is in cache
            /******/ 		if(installedModules[moduleId])
            /******/ 			return installedModules[moduleId].exports;

            /******/ 		// Create a new module (and put it into the cache)
            /******/ 		var module = installedModules[moduleId] = {
                /******/ 			exports: {},
                /******/ 			id: moduleId,
                /******/ 			loaded: false
                /******/ 		};

            /******/ 		// Execute the module function
            /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

            /******/ 		// Flag the module as loaded
            /******/ 		module.loaded = true;

            /******/ 		// Return the exports of the module
            /******/ 		return module.exports;
            /******/ 	}


        /******/ 	// expose the modules object (__webpack_modules__)
        /******/ 	__webpack_require__.m = modules;

        /******/ 	// expose the module cache
        /******/ 	__webpack_require__.c = installedModules;

        /******/ 	// __webpack_public_path__
        /******/ 	__webpack_require__.p = "";

        /******/ 	// Load entry module and return exports
        /******/ 	return __webpack_require__(0);
        /******/ })
    /************************************************************************/
    /******/ ([
        /* 0 */
        /***/ function(module, exports, __webpack_require__) {

            /**
             * @fileoverview gl-matrix - High performance matrix and vector operations
             * @author Brandon Jones
             * @author Colin MacKenzie IV
             * @version 2.3.2
             */

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */
            // END HEADER

            exports.glMatrix = __webpack_require__(1);
            exports.mat2 = __webpack_require__(2);
            exports.mat2d = __webpack_require__(3);
            exports.mat3 = __webpack_require__(4);
            exports.mat4 = __webpack_require__(5);
            exports.quat = __webpack_require__(6);
            exports.vec2 = __webpack_require__(9);
            exports.vec3 = __webpack_require__(7);
            exports.vec4 = __webpack_require__(8);

            /***/ },
        /* 1 */
        /***/ function(module, exports) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            /**
             * @class Common utilities
             * @name glMatrix
             */
            var glMatrix = {};

            // Configuration Constants
            glMatrix.EPSILON = 0.000001;
            glMatrix.ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
            glMatrix.RANDOM = Math.random;
            glMatrix.ENABLE_SIMD = false;

            // Capability detection
            glMatrix.SIMD_AVAILABLE = (glMatrix.ARRAY_TYPE === this.Float32Array) && ('SIMD' in this);
            glMatrix.USE_SIMD = glMatrix.ENABLE_SIMD && glMatrix.SIMD_AVAILABLE;

            /**
             * Sets the type of array used when creating new vectors and matrices
             *
             * @param {Type} type Array type, such as Float32Array or Array
             */
            glMatrix.setMatrixArrayType = function(type) {
                glMatrix.ARRAY_TYPE = type;
            }

            var degree = Math.PI / 180;

            /**
             * Convert Degree To Radian
             *
             * @param {Number} a Angle in Degrees
             */
            glMatrix.toRadian = function(a){
                return a * degree;
            }

            /**
             * Tests whether or not the arguments have approximately the same value, within an absolute
             * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
             * than or equal to 1.0, and a relative tolerance is used for larger values)
             *
             * @param {Number} a The first number to test.
             * @param {Number} b The second number to test.
             * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
             */
            glMatrix.equals = function(a, b) {
                return Math.abs(a - b) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a), Math.abs(b));
            }

            module.exports = glMatrix;


            /***/ },
        /* 2 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 2x2 Matrix
             * @name mat2
             */
            var mat2 = {};

            /**
             * Creates a new identity mat2
             *
             * @returns {mat2} a new 2x2 matrix
             */
            mat2.create = function() {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                return out;
            };

            /**
             * Creates a new mat2 initialized with values from an existing matrix
             *
             * @param {mat2} a matrix to clone
             * @returns {mat2} a new 2x2 matrix
             */
            mat2.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                return out;
            };

            /**
             * Copy the values from one mat2 to another
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the source matrix
             * @returns {mat2} out
             */
            mat2.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                return out;
            };

            /**
             * Set a mat2 to the identity matrix
             *
             * @param {mat2} out the receiving matrix
             * @returns {mat2} out
             */
            mat2.identity = function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                return out;
            };

            /**
             * Create a new mat2 with the given values
             *
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m10 Component in column 1, row 0 position (index 2)
             * @param {Number} m11 Component in column 1, row 1 position (index 3)
             * @returns {mat2} out A new 2x2 matrix
             */
            mat2.fromValues = function(m00, m01, m10, m11) {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = m00;
                out[1] = m01;
                out[2] = m10;
                out[3] = m11;
                return out;
            };

            /**
             * Set the components of a mat2 to the given values
             *
             * @param {mat2} out the receiving matrix
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m10 Component in column 1, row 0 position (index 2)
             * @param {Number} m11 Component in column 1, row 1 position (index 3)
             * @returns {mat2} out
             */
            mat2.set = function(out, m00, m01, m10, m11) {
                out[0] = m00;
                out[1] = m01;
                out[2] = m10;
                out[3] = m11;
                return out;
            };


            /**
             * Transpose the values of a mat2
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the source matrix
             * @returns {mat2} out
             */
            mat2.transpose = function(out, a) {
                // If we are transposing ourselves we can skip a few steps but have to cache some values
                if (out === a) {
                    var a1 = a[1];
                    out[1] = a[2];
                    out[2] = a1;
                } else {
                    out[0] = a[0];
                    out[1] = a[2];
                    out[2] = a[1];
                    out[3] = a[3];
                }

                return out;
            };

            /**
             * Inverts a mat2
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the source matrix
             * @returns {mat2} out
             */
            mat2.invert = function(out, a) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

                    // Calculate the determinant
                    det = a0 * a3 - a2 * a1;

                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] =  a3 * det;
                out[1] = -a1 * det;
                out[2] = -a2 * det;
                out[3] =  a0 * det;

                return out;
            };

            /**
             * Calculates the adjugate of a mat2
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the source matrix
             * @returns {mat2} out
             */
            mat2.adjoint = function(out, a) {
                // Caching this value is nessecary if out == a
                var a0 = a[0];
                out[0] =  a[3];
                out[1] = -a[1];
                out[2] = -a[2];
                out[3] =  a0;

                return out;
            };

            /**
             * Calculates the determinant of a mat2
             *
             * @param {mat2} a the source matrix
             * @returns {Number} determinant of a
             */
            mat2.determinant = function (a) {
                return a[0] * a[3] - a[2] * a[1];
            };

            /**
             * Multiplies two mat2's
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the first operand
             * @param {mat2} b the second operand
             * @returns {mat2} out
             */
            mat2.multiply = function (out, a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
                var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                out[0] = a0 * b0 + a2 * b1;
                out[1] = a1 * b0 + a3 * b1;
                out[2] = a0 * b2 + a2 * b3;
                out[3] = a1 * b2 + a3 * b3;
                return out;
            };

            /**
             * Alias for {@link mat2.multiply}
             * @function
             */
            mat2.mul = mat2.multiply;

            /**
             * Rotates a mat2 by the given angle
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat2} out
             */
            mat2.rotate = function (out, a, rad) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                    s = Math.sin(rad),
                    c = Math.cos(rad);
                out[0] = a0 *  c + a2 * s;
                out[1] = a1 *  c + a3 * s;
                out[2] = a0 * -s + a2 * c;
                out[3] = a1 * -s + a3 * c;
                return out;
            };

            /**
             * Scales the mat2 by the dimensions in the given vec2
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the matrix to rotate
             * @param {vec2} v the vec2 to scale the matrix by
             * @returns {mat2} out
             **/
            mat2.scale = function(out, a, v) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                    v0 = v[0], v1 = v[1];
                out[0] = a0 * v0;
                out[1] = a1 * v0;
                out[2] = a2 * v1;
                out[3] = a3 * v1;
                return out;
            };

            /**
             * Creates a matrix from a given angle
             * This is equivalent to (but much faster than):
             *
             *     mat2.identity(dest);
             *     mat2.rotate(dest, dest, rad);
             *
             * @param {mat2} out mat2 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat2} out
             */
            mat2.fromRotation = function(out, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad);
                out[0] = c;
                out[1] = s;
                out[2] = -s;
                out[3] = c;
                return out;
            }

            /**
             * Creates a matrix from a vector scaling
             * This is equivalent to (but much faster than):
             *
             *     mat2.identity(dest);
             *     mat2.scale(dest, dest, vec);
             *
             * @param {mat2} out mat2 receiving operation result
             * @param {vec2} v Scaling vector
             * @returns {mat2} out
             */
            mat2.fromScaling = function(out, v) {
                out[0] = v[0];
                out[1] = 0;
                out[2] = 0;
                out[3] = v[1];
                return out;
            }

            /**
             * Returns a string representation of a mat2
             *
             * @param {mat2} a matrix to represent as a string
             * @returns {String} string representation of the matrix
             */
            mat2.str = function (a) {
                return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
            };

            /**
             * Returns Frobenius norm of a mat2
             *
             * @param {mat2} a the matrix to calculate Frobenius norm of
             * @returns {Number} Frobenius norm
             */
            mat2.frob = function (a) {
                return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
            };

            /**
             * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
             * @param {mat2} L the lower triangular matrix
             * @param {mat2} D the diagonal matrix
             * @param {mat2} U the upper triangular matrix
             * @param {mat2} a the input matrix to factorize
             */

            mat2.LDU = function (L, D, U, a) {
                L[2] = a[2]/a[0];
                U[0] = a[0];
                U[1] = a[1];
                U[3] = a[3] - L[2] * U[1];
                return [L, D, U];
            };

            /**
             * Adds two mat2's
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the first operand
             * @param {mat2} b the second operand
             * @returns {mat2} out
             */
            mat2.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                out[3] = a[3] + b[3];
                return out;
            };

            /**
             * Subtracts matrix b from matrix a
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the first operand
             * @param {mat2} b the second operand
             * @returns {mat2} out
             */
            mat2.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                out[3] = a[3] - b[3];
                return out;
            };

            /**
             * Alias for {@link mat2.subtract}
             * @function
             */
            mat2.sub = mat2.subtract;

            /**
             * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
             *
             * @param {mat2} a The first matrix.
             * @param {mat2} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat2.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
            };

            /**
             * Returns whether or not the matrices have approximately the same elements in the same position.
             *
             * @param {mat2} a The first matrix.
             * @param {mat2} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat2.equals = function (a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
                var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
                Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)));
            };

            /**
             * Multiply each element of the matrix by a scalar.
             *
             * @param {mat2} out the receiving matrix
             * @param {mat2} a the matrix to scale
             * @param {Number} b amount to scale the matrix's elements by
             * @returns {mat2} out
             */
            mat2.multiplyScalar = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                out[3] = a[3] * b;
                return out;
            };

            /**
             * Adds two mat2's after multiplying each element of the second operand by a scalar value.
             *
             * @param {mat2} out the receiving vector
             * @param {mat2} a the first operand
             * @param {mat2} b the second operand
             * @param {Number} scale the amount to scale b's elements by before adding
             * @returns {mat2} out
             */
            mat2.multiplyScalarAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                out[3] = a[3] + (b[3] * scale);
                return out;
            };

            module.exports = mat2;


            /***/ },
        /* 3 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 2x3 Matrix
             * @name mat2d
             *
             * @description
             * A mat2d contains six elements defined as:
             * <pre>
             * [a, c, tx,
             *  b, d, ty]
             * </pre>
             * This is a short form for the 3x3 matrix:
             * <pre>
             * [a, c, tx,
             *  b, d, ty,
             *  0, 0, 1]
             * </pre>
             * The last row is ignored so the array is shorter and operations are faster.
             */
            var mat2d = {};

            /**
             * Creates a new identity mat2d
             *
             * @returns {mat2d} a new 2x3 matrix
             */
            mat2d.create = function() {
                var out = new glMatrix.ARRAY_TYPE(6);
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
                return out;
            };

            /**
             * Creates a new mat2d initialized with values from an existing matrix
             *
             * @param {mat2d} a matrix to clone
             * @returns {mat2d} a new 2x3 matrix
             */
            mat2d.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(6);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                return out;
            };

            /**
             * Copy the values from one mat2d to another
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the source matrix
             * @returns {mat2d} out
             */
            mat2d.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                return out;
            };

            /**
             * Set a mat2d to the identity matrix
             *
             * @param {mat2d} out the receiving matrix
             * @returns {mat2d} out
             */
            mat2d.identity = function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
                return out;
            };

            /**
             * Create a new mat2d with the given values
             *
             * @param {Number} a Component A (index 0)
             * @param {Number} b Component B (index 1)
             * @param {Number} c Component C (index 2)
             * @param {Number} d Component D (index 3)
             * @param {Number} tx Component TX (index 4)
             * @param {Number} ty Component TY (index 5)
             * @returns {mat2d} A new mat2d
             */
            mat2d.fromValues = function(a, b, c, d, tx, ty) {
                var out = new glMatrix.ARRAY_TYPE(6);
                out[0] = a;
                out[1] = b;
                out[2] = c;
                out[3] = d;
                out[4] = tx;
                out[5] = ty;
                return out;
            };

            /**
             * Set the components of a mat2d to the given values
             *
             * @param {mat2d} out the receiving matrix
             * @param {Number} a Component A (index 0)
             * @param {Number} b Component B (index 1)
             * @param {Number} c Component C (index 2)
             * @param {Number} d Component D (index 3)
             * @param {Number} tx Component TX (index 4)
             * @param {Number} ty Component TY (index 5)
             * @returns {mat2d} out
             */
            mat2d.set = function(out, a, b, c, d, tx, ty) {
                out[0] = a;
                out[1] = b;
                out[2] = c;
                out[3] = d;
                out[4] = tx;
                out[5] = ty;
                return out;
            };

            /**
             * Inverts a mat2d
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the source matrix
             * @returns {mat2d} out
             */
            mat2d.invert = function(out, a) {
                var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
                    atx = a[4], aty = a[5];

                var det = aa * ad - ab * ac;
                if(!det){
                    return null;
                }
                det = 1.0 / det;

                out[0] = ad * det;
                out[1] = -ab * det;
                out[2] = -ac * det;
                out[3] = aa * det;
                out[4] = (ac * aty - ad * atx) * det;
                out[5] = (ab * atx - aa * aty) * det;
                return out;
            };

            /**
             * Calculates the determinant of a mat2d
             *
             * @param {mat2d} a the source matrix
             * @returns {Number} determinant of a
             */
            mat2d.determinant = function (a) {
                return a[0] * a[3] - a[1] * a[2];
            };

            /**
             * Multiplies two mat2d's
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the first operand
             * @param {mat2d} b the second operand
             * @returns {mat2d} out
             */
            mat2d.multiply = function (out, a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                    b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
                out[0] = a0 * b0 + a2 * b1;
                out[1] = a1 * b0 + a3 * b1;
                out[2] = a0 * b2 + a2 * b3;
                out[3] = a1 * b2 + a3 * b3;
                out[4] = a0 * b4 + a2 * b5 + a4;
                out[5] = a1 * b4 + a3 * b5 + a5;
                return out;
            };

            /**
             * Alias for {@link mat2d.multiply}
             * @function
             */
            mat2d.mul = mat2d.multiply;

            /**
             * Rotates a mat2d by the given angle
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat2d} out
             */
            mat2d.rotate = function (out, a, rad) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                    s = Math.sin(rad),
                    c = Math.cos(rad);
                out[0] = a0 *  c + a2 * s;
                out[1] = a1 *  c + a3 * s;
                out[2] = a0 * -s + a2 * c;
                out[3] = a1 * -s + a3 * c;
                out[4] = a4;
                out[5] = a5;
                return out;
            };

            /**
             * Scales the mat2d by the dimensions in the given vec2
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the matrix to translate
             * @param {vec2} v the vec2 to scale the matrix by
             * @returns {mat2d} out
             **/
            mat2d.scale = function(out, a, v) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                    v0 = v[0], v1 = v[1];
                out[0] = a0 * v0;
                out[1] = a1 * v0;
                out[2] = a2 * v1;
                out[3] = a3 * v1;
                out[4] = a4;
                out[5] = a5;
                return out;
            };

            /**
             * Translates the mat2d by the dimensions in the given vec2
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the matrix to translate
             * @param {vec2} v the vec2 to translate the matrix by
             * @returns {mat2d} out
             **/
            mat2d.translate = function(out, a, v) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
                    v0 = v[0], v1 = v[1];
                out[0] = a0;
                out[1] = a1;
                out[2] = a2;
                out[3] = a3;
                out[4] = a0 * v0 + a2 * v1 + a4;
                out[5] = a1 * v0 + a3 * v1 + a5;
                return out;
            };

            /**
             * Creates a matrix from a given angle
             * This is equivalent to (but much faster than):
             *
             *     mat2d.identity(dest);
             *     mat2d.rotate(dest, dest, rad);
             *
             * @param {mat2d} out mat2d receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat2d} out
             */
            mat2d.fromRotation = function(out, rad) {
                var s = Math.sin(rad), c = Math.cos(rad);
                out[0] = c;
                out[1] = s;
                out[2] = -s;
                out[3] = c;
                out[4] = 0;
                out[5] = 0;
                return out;
            }

            /**
             * Creates a matrix from a vector scaling
             * This is equivalent to (but much faster than):
             *
             *     mat2d.identity(dest);
             *     mat2d.scale(dest, dest, vec);
             *
             * @param {mat2d} out mat2d receiving operation result
             * @param {vec2} v Scaling vector
             * @returns {mat2d} out
             */
            mat2d.fromScaling = function(out, v) {
                out[0] = v[0];
                out[1] = 0;
                out[2] = 0;
                out[3] = v[1];
                out[4] = 0;
                out[5] = 0;
                return out;
            }

            /**
             * Creates a matrix from a vector translation
             * This is equivalent to (but much faster than):
             *
             *     mat2d.identity(dest);
             *     mat2d.translate(dest, dest, vec);
             *
             * @param {mat2d} out mat2d receiving operation result
             * @param {vec2} v Translation vector
             * @returns {mat2d} out
             */
            mat2d.fromTranslation = function(out, v) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = v[0];
                out[5] = v[1];
                return out;
            }

            /**
             * Returns a string representation of a mat2d
             *
             * @param {mat2d} a matrix to represent as a string
             * @returns {String} string representation of the matrix
             */
            mat2d.str = function (a) {
                return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
            };

            /**
             * Returns Frobenius norm of a mat2d
             *
             * @param {mat2d} a the matrix to calculate Frobenius norm of
             * @returns {Number} Frobenius norm
             */
            mat2d.frob = function (a) {
                return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
            };

            /**
             * Adds two mat2d's
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the first operand
             * @param {mat2d} b the second operand
             * @returns {mat2d} out
             */
            mat2d.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                out[3] = a[3] + b[3];
                out[4] = a[4] + b[4];
                out[5] = a[5] + b[5];
                return out;
            };

            /**
             * Subtracts matrix b from matrix a
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the first operand
             * @param {mat2d} b the second operand
             * @returns {mat2d} out
             */
            mat2d.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                out[3] = a[3] - b[3];
                out[4] = a[4] - b[4];
                out[5] = a[5] - b[5];
                return out;
            };

            /**
             * Alias for {@link mat2d.subtract}
             * @function
             */
            mat2d.sub = mat2d.subtract;

            /**
             * Multiply each element of the matrix by a scalar.
             *
             * @param {mat2d} out the receiving matrix
             * @param {mat2d} a the matrix to scale
             * @param {Number} b amount to scale the matrix's elements by
             * @returns {mat2d} out
             */
            mat2d.multiplyScalar = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                out[3] = a[3] * b;
                out[4] = a[4] * b;
                out[5] = a[5] * b;
                return out;
            };

            /**
             * Adds two mat2d's after multiplying each element of the second operand by a scalar value.
             *
             * @param {mat2d} out the receiving vector
             * @param {mat2d} a the first operand
             * @param {mat2d} b the second operand
             * @param {Number} scale the amount to scale b's elements by before adding
             * @returns {mat2d} out
             */
            mat2d.multiplyScalarAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                out[3] = a[3] + (b[3] * scale);
                out[4] = a[4] + (b[4] * scale);
                out[5] = a[5] + (b[5] * scale);
                return out;
            };

            /**
             * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
             *
             * @param {mat2d} a The first matrix.
             * @param {mat2d} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat2d.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
            };

            /**
             * Returns whether or not the matrices have approximately the same elements in the same position.
             *
             * @param {mat2d} a The first matrix.
             * @param {mat2d} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat2d.equals = function (a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
                var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
                Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
                Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
                Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)));
            };

            module.exports = mat2d;


            /***/ },
        /* 4 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 3x3 Matrix
             * @name mat3
             */
            var mat3 = {};

            /**
             * Creates a new identity mat3
             *
             * @returns {mat3} a new 3x3 matrix
             */
            mat3.create = function() {
                var out = new glMatrix.ARRAY_TYPE(9);
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 1;
                out[5] = 0;
                out[6] = 0;
                out[7] = 0;
                out[8] = 1;
                return out;
            };

            /**
             * Copies the upper-left 3x3 values into the given mat3.
             *
             * @param {mat3} out the receiving 3x3 matrix
             * @param {mat4} a   the source 4x4 matrix
             * @returns {mat3} out
             */
            mat3.fromMat4 = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[4];
                out[4] = a[5];
                out[5] = a[6];
                out[6] = a[8];
                out[7] = a[9];
                out[8] = a[10];
                return out;
            };

            /**
             * Creates a new mat3 initialized with values from an existing matrix
             *
             * @param {mat3} a matrix to clone
             * @returns {mat3} a new 3x3 matrix
             */
            mat3.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(9);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                out[6] = a[6];
                out[7] = a[7];
                out[8] = a[8];
                return out;
            };

            /**
             * Copy the values from one mat3 to another
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the source matrix
             * @returns {mat3} out
             */
            mat3.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                out[6] = a[6];
                out[7] = a[7];
                out[8] = a[8];
                return out;
            };

            /**
             * Create a new mat3 with the given values
             *
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m02 Component in column 0, row 2 position (index 2)
             * @param {Number} m10 Component in column 1, row 0 position (index 3)
             * @param {Number} m11 Component in column 1, row 1 position (index 4)
             * @param {Number} m12 Component in column 1, row 2 position (index 5)
             * @param {Number} m20 Component in column 2, row 0 position (index 6)
             * @param {Number} m21 Component in column 2, row 1 position (index 7)
             * @param {Number} m22 Component in column 2, row 2 position (index 8)
             * @returns {mat3} A new mat3
             */
            mat3.fromValues = function(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
                var out = new glMatrix.ARRAY_TYPE(9);
                out[0] = m00;
                out[1] = m01;
                out[2] = m02;
                out[3] = m10;
                out[4] = m11;
                out[5] = m12;
                out[6] = m20;
                out[7] = m21;
                out[8] = m22;
                return out;
            };

            /**
             * Set the components of a mat3 to the given values
             *
             * @param {mat3} out the receiving matrix
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m02 Component in column 0, row 2 position (index 2)
             * @param {Number} m10 Component in column 1, row 0 position (index 3)
             * @param {Number} m11 Component in column 1, row 1 position (index 4)
             * @param {Number} m12 Component in column 1, row 2 position (index 5)
             * @param {Number} m20 Component in column 2, row 0 position (index 6)
             * @param {Number} m21 Component in column 2, row 1 position (index 7)
             * @param {Number} m22 Component in column 2, row 2 position (index 8)
             * @returns {mat3} out
             */
            mat3.set = function(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
                out[0] = m00;
                out[1] = m01;
                out[2] = m02;
                out[3] = m10;
                out[4] = m11;
                out[5] = m12;
                out[6] = m20;
                out[7] = m21;
                out[8] = m22;
                return out;
            };

            /**
             * Set a mat3 to the identity matrix
             *
             * @param {mat3} out the receiving matrix
             * @returns {mat3} out
             */
            mat3.identity = function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 1;
                out[5] = 0;
                out[6] = 0;
                out[7] = 0;
                out[8] = 1;
                return out;
            };

            /**
             * Transpose the values of a mat3
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the source matrix
             * @returns {mat3} out
             */
            mat3.transpose = function(out, a) {
                // If we are transposing ourselves we can skip a few steps but have to cache some values
                if (out === a) {
                    var a01 = a[1], a02 = a[2], a12 = a[5];
                    out[1] = a[3];
                    out[2] = a[6];
                    out[3] = a01;
                    out[5] = a[7];
                    out[6] = a02;
                    out[7] = a12;
                } else {
                    out[0] = a[0];
                    out[1] = a[3];
                    out[2] = a[6];
                    out[3] = a[1];
                    out[4] = a[4];
                    out[5] = a[7];
                    out[6] = a[2];
                    out[7] = a[5];
                    out[8] = a[8];
                }

                return out;
            };

            /**
             * Inverts a mat3
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the source matrix
             * @returns {mat3} out
             */
            mat3.invert = function(out, a) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8],

                    b01 = a22 * a11 - a12 * a21,
                    b11 = -a22 * a10 + a12 * a20,
                    b21 = a21 * a10 - a11 * a20,

                    // Calculate the determinant
                    det = a00 * b01 + a01 * b11 + a02 * b21;

                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] = b01 * det;
                out[1] = (-a22 * a01 + a02 * a21) * det;
                out[2] = (a12 * a01 - a02 * a11) * det;
                out[3] = b11 * det;
                out[4] = (a22 * a00 - a02 * a20) * det;
                out[5] = (-a12 * a00 + a02 * a10) * det;
                out[6] = b21 * det;
                out[7] = (-a21 * a00 + a01 * a20) * det;
                out[8] = (a11 * a00 - a01 * a10) * det;
                return out;
            };

            /**
             * Calculates the adjugate of a mat3
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the source matrix
             * @returns {mat3} out
             */
            mat3.adjoint = function(out, a) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8];

                out[0] = (a11 * a22 - a12 * a21);
                out[1] = (a02 * a21 - a01 * a22);
                out[2] = (a01 * a12 - a02 * a11);
                out[3] = (a12 * a20 - a10 * a22);
                out[4] = (a00 * a22 - a02 * a20);
                out[5] = (a02 * a10 - a00 * a12);
                out[6] = (a10 * a21 - a11 * a20);
                out[7] = (a01 * a20 - a00 * a21);
                out[8] = (a00 * a11 - a01 * a10);
                return out;
            };

            /**
             * Calculates the determinant of a mat3
             *
             * @param {mat3} a the source matrix
             * @returns {Number} determinant of a
             */
            mat3.determinant = function (a) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8];

                return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
            };

            /**
             * Multiplies two mat3's
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the first operand
             * @param {mat3} b the second operand
             * @returns {mat3} out
             */
            mat3.multiply = function (out, a, b) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8],

                    b00 = b[0], b01 = b[1], b02 = b[2],
                    b10 = b[3], b11 = b[4], b12 = b[5],
                    b20 = b[6], b21 = b[7], b22 = b[8];

                out[0] = b00 * a00 + b01 * a10 + b02 * a20;
                out[1] = b00 * a01 + b01 * a11 + b02 * a21;
                out[2] = b00 * a02 + b01 * a12 + b02 * a22;

                out[3] = b10 * a00 + b11 * a10 + b12 * a20;
                out[4] = b10 * a01 + b11 * a11 + b12 * a21;
                out[5] = b10 * a02 + b11 * a12 + b12 * a22;

                out[6] = b20 * a00 + b21 * a10 + b22 * a20;
                out[7] = b20 * a01 + b21 * a11 + b22 * a21;
                out[8] = b20 * a02 + b21 * a12 + b22 * a22;
                return out;
            };

            /**
             * Alias for {@link mat3.multiply}
             * @function
             */
            mat3.mul = mat3.multiply;

            /**
             * Translate a mat3 by the given vector
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the matrix to translate
             * @param {vec2} v vector to translate by
             * @returns {mat3} out
             */
            mat3.translate = function(out, a, v) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8],
                    x = v[0], y = v[1];

                out[0] = a00;
                out[1] = a01;
                out[2] = a02;

                out[3] = a10;
                out[4] = a11;
                out[5] = a12;

                out[6] = x * a00 + y * a10 + a20;
                out[7] = x * a01 + y * a11 + a21;
                out[8] = x * a02 + y * a12 + a22;
                return out;
            };

            /**
             * Rotates a mat3 by the given angle
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat3} out
             */
            mat3.rotate = function (out, a, rad) {
                var a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[3], a11 = a[4], a12 = a[5],
                    a20 = a[6], a21 = a[7], a22 = a[8],

                    s = Math.sin(rad),
                    c = Math.cos(rad);

                out[0] = c * a00 + s * a10;
                out[1] = c * a01 + s * a11;
                out[2] = c * a02 + s * a12;

                out[3] = c * a10 - s * a00;
                out[4] = c * a11 - s * a01;
                out[5] = c * a12 - s * a02;

                out[6] = a20;
                out[7] = a21;
                out[8] = a22;
                return out;
            };

            /**
             * Scales the mat3 by the dimensions in the given vec2
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the matrix to rotate
             * @param {vec2} v the vec2 to scale the matrix by
             * @returns {mat3} out
             **/
            mat3.scale = function(out, a, v) {
                var x = v[0], y = v[1];

                out[0] = x * a[0];
                out[1] = x * a[1];
                out[2] = x * a[2];

                out[3] = y * a[3];
                out[4] = y * a[4];
                out[5] = y * a[5];

                out[6] = a[6];
                out[7] = a[7];
                out[8] = a[8];
                return out;
            };

            /**
             * Creates a matrix from a vector translation
             * This is equivalent to (but much faster than):
             *
             *     mat3.identity(dest);
             *     mat3.translate(dest, dest, vec);
             *
             * @param {mat3} out mat3 receiving operation result
             * @param {vec2} v Translation vector
             * @returns {mat3} out
             */
            mat3.fromTranslation = function(out, v) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 1;
                out[5] = 0;
                out[6] = v[0];
                out[7] = v[1];
                out[8] = 1;
                return out;
            }

            /**
             * Creates a matrix from a given angle
             * This is equivalent to (but much faster than):
             *
             *     mat3.identity(dest);
             *     mat3.rotate(dest, dest, rad);
             *
             * @param {mat3} out mat3 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat3} out
             */
            mat3.fromRotation = function(out, rad) {
                var s = Math.sin(rad), c = Math.cos(rad);

                out[0] = c;
                out[1] = s;
                out[2] = 0;

                out[3] = -s;
                out[4] = c;
                out[5] = 0;

                out[6] = 0;
                out[7] = 0;
                out[8] = 1;
                return out;
            }

            /**
             * Creates a matrix from a vector scaling
             * This is equivalent to (but much faster than):
             *
             *     mat3.identity(dest);
             *     mat3.scale(dest, dest, vec);
             *
             * @param {mat3} out mat3 receiving operation result
             * @param {vec2} v Scaling vector
             * @returns {mat3} out
             */
            mat3.fromScaling = function(out, v) {
                out[0] = v[0];
                out[1] = 0;
                out[2] = 0;

                out[3] = 0;
                out[4] = v[1];
                out[5] = 0;

                out[6] = 0;
                out[7] = 0;
                out[8] = 1;
                return out;
            }

            /**
             * Copies the values from a mat2d into a mat3
             *
             * @param {mat3} out the receiving matrix
             * @param {mat2d} a the matrix to copy
             * @returns {mat3} out
             **/
            mat3.fromMat2d = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = 0;

                out[3] = a[2];
                out[4] = a[3];
                out[5] = 0;

                out[6] = a[4];
                out[7] = a[5];
                out[8] = 1;
                return out;
            };

            /**
             * Calculates a 3x3 matrix from the given quaternion
             *
             * @param {mat3} out mat3 receiving operation result
             * @param {quat} q Quaternion to create matrix from
             *
             * @returns {mat3} out
             */
            mat3.fromQuat = function (out, q) {
                var x = q[0], y = q[1], z = q[2], w = q[3],
                    x2 = x + x,
                    y2 = y + y,
                    z2 = z + z,

                    xx = x * x2,
                    yx = y * x2,
                    yy = y * y2,
                    zx = z * x2,
                    zy = z * y2,
                    zz = z * z2,
                    wx = w * x2,
                    wy = w * y2,
                    wz = w * z2;

                out[0] = 1 - yy - zz;
                out[3] = yx - wz;
                out[6] = zx + wy;

                out[1] = yx + wz;
                out[4] = 1 - xx - zz;
                out[7] = zy - wx;

                out[2] = zx - wy;
                out[5] = zy + wx;
                out[8] = 1 - xx - yy;

                return out;
            };

            /**
             * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
             *
             * @param {mat3} out mat3 receiving operation result
             * @param {mat4} a Mat4 to derive the normal matrix from
             *
             * @returns {mat3} out
             */
            mat3.normalFromMat4 = function (out, a) {
                var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                    b00 = a00 * a11 - a01 * a10,
                    b01 = a00 * a12 - a02 * a10,
                    b02 = a00 * a13 - a03 * a10,
                    b03 = a01 * a12 - a02 * a11,
                    b04 = a01 * a13 - a03 * a11,
                    b05 = a02 * a13 - a03 * a12,
                    b06 = a20 * a31 - a21 * a30,
                    b07 = a20 * a32 - a22 * a30,
                    b08 = a20 * a33 - a23 * a30,
                    b09 = a21 * a32 - a22 * a31,
                    b10 = a21 * a33 - a23 * a31,
                    b11 = a22 * a33 - a23 * a32,

                    // Calculate the determinant
                    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

                out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

                out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

                return out;
            };

            /**
             * Returns a string representation of a mat3
             *
             * @param {mat3} a matrix to represent as a string
             * @returns {String} string representation of the matrix
             */
            mat3.str = function (a) {
                return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' +
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
            };

            /**
             * Returns Frobenius norm of a mat3
             *
             * @param {mat3} a the matrix to calculate Frobenius norm of
             * @returns {Number} Frobenius norm
             */
            mat3.frob = function (a) {
                return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
            };

            /**
             * Adds two mat3's
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the first operand
             * @param {mat3} b the second operand
             * @returns {mat3} out
             */
            mat3.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                out[3] = a[3] + b[3];
                out[4] = a[4] + b[4];
                out[5] = a[5] + b[5];
                out[6] = a[6] + b[6];
                out[7] = a[7] + b[7];
                out[8] = a[8] + b[8];
                return out;
            };

            /**
             * Subtracts matrix b from matrix a
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the first operand
             * @param {mat3} b the second operand
             * @returns {mat3} out
             */
            mat3.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                out[3] = a[3] - b[3];
                out[4] = a[4] - b[4];
                out[5] = a[5] - b[5];
                out[6] = a[6] - b[6];
                out[7] = a[7] - b[7];
                out[8] = a[8] - b[8];
                return out;
            };

            /**
             * Alias for {@link mat3.subtract}
             * @function
             */
            mat3.sub = mat3.subtract;

            /**
             * Multiply each element of the matrix by a scalar.
             *
             * @param {mat3} out the receiving matrix
             * @param {mat3} a the matrix to scale
             * @param {Number} b amount to scale the matrix's elements by
             * @returns {mat3} out
             */
            mat3.multiplyScalar = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                out[3] = a[3] * b;
                out[4] = a[4] * b;
                out[5] = a[5] * b;
                out[6] = a[6] * b;
                out[7] = a[7] * b;
                out[8] = a[8] * b;
                return out;
            };

            /**
             * Adds two mat3's after multiplying each element of the second operand by a scalar value.
             *
             * @param {mat3} out the receiving vector
             * @param {mat3} a the first operand
             * @param {mat3} b the second operand
             * @param {Number} scale the amount to scale b's elements by before adding
             * @returns {mat3} out
             */
            mat3.multiplyScalarAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                out[3] = a[3] + (b[3] * scale);
                out[4] = a[4] + (b[4] * scale);
                out[5] = a[5] + (b[5] * scale);
                out[6] = a[6] + (b[6] * scale);
                out[7] = a[7] + (b[7] * scale);
                out[8] = a[8] + (b[8] * scale);
                return out;
            };

            /**
             * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
             *
             * @param {mat3} a The first matrix.
             * @param {mat3} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat3.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
                    a[3] === b[3] && a[4] === b[4] && a[5] === b[5] &&
                    a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
            };

            /**
             * Returns whether or not the matrices have approximately the same elements in the same position.
             *
             * @param {mat3} a The first matrix.
             * @param {mat3} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat3.equals = function (a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8];
                var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = a[6], b7 = b[7], b8 = b[8];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
                Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
                Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
                Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
                Math.abs(a6 - b6) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
                Math.abs(a7 - b7) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
                Math.abs(a8 - b8) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a8), Math.abs(b8)));
            };


            module.exports = mat3;


            /***/ },
        /* 5 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 4x4 Matrix
             * @name mat4
             */
            var mat4 = {
                scalar: {},
                SIMD: {}
            };

            /**
             * Creates a new identity mat4
             *
             * @returns {mat4} a new 4x4 matrix
             */
            mat4.create = function() {
                var out = new glMatrix.ARRAY_TYPE(16);
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = 1;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 1;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            };

            /**
             * Creates a new mat4 initialized with values from an existing matrix
             *
             * @param {mat4} a matrix to clone
             * @returns {mat4} a new 4x4 matrix
             */
            mat4.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(16);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                out[6] = a[6];
                out[7] = a[7];
                out[8] = a[8];
                out[9] = a[9];
                out[10] = a[10];
                out[11] = a[11];
                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
                return out;
            };

            /**
             * Copy the values from one mat4 to another
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4];
                out[5] = a[5];
                out[6] = a[6];
                out[7] = a[7];
                out[8] = a[8];
                out[9] = a[9];
                out[10] = a[10];
                out[11] = a[11];
                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
                return out;
            };

            /**
             * Create a new mat4 with the given values
             *
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m02 Component in column 0, row 2 position (index 2)
             * @param {Number} m03 Component in column 0, row 3 position (index 3)
             * @param {Number} m10 Component in column 1, row 0 position (index 4)
             * @param {Number} m11 Component in column 1, row 1 position (index 5)
             * @param {Number} m12 Component in column 1, row 2 position (index 6)
             * @param {Number} m13 Component in column 1, row 3 position (index 7)
             * @param {Number} m20 Component in column 2, row 0 position (index 8)
             * @param {Number} m21 Component in column 2, row 1 position (index 9)
             * @param {Number} m22 Component in column 2, row 2 position (index 10)
             * @param {Number} m23 Component in column 2, row 3 position (index 11)
             * @param {Number} m30 Component in column 3, row 0 position (index 12)
             * @param {Number} m31 Component in column 3, row 1 position (index 13)
             * @param {Number} m32 Component in column 3, row 2 position (index 14)
             * @param {Number} m33 Component in column 3, row 3 position (index 15)
             * @returns {mat4} A new mat4
             */
            mat4.fromValues = function(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
                var out = new glMatrix.ARRAY_TYPE(16);
                out[0] = m00;
                out[1] = m01;
                out[2] = m02;
                out[3] = m03;
                out[4] = m10;
                out[5] = m11;
                out[6] = m12;
                out[7] = m13;
                out[8] = m20;
                out[9] = m21;
                out[10] = m22;
                out[11] = m23;
                out[12] = m30;
                out[13] = m31;
                out[14] = m32;
                out[15] = m33;
                return out;
            };

            /**
             * Set the components of a mat4 to the given values
             *
             * @param {mat4} out the receiving matrix
             * @param {Number} m00 Component in column 0, row 0 position (index 0)
             * @param {Number} m01 Component in column 0, row 1 position (index 1)
             * @param {Number} m02 Component in column 0, row 2 position (index 2)
             * @param {Number} m03 Component in column 0, row 3 position (index 3)
             * @param {Number} m10 Component in column 1, row 0 position (index 4)
             * @param {Number} m11 Component in column 1, row 1 position (index 5)
             * @param {Number} m12 Component in column 1, row 2 position (index 6)
             * @param {Number} m13 Component in column 1, row 3 position (index 7)
             * @param {Number} m20 Component in column 2, row 0 position (index 8)
             * @param {Number} m21 Component in column 2, row 1 position (index 9)
             * @param {Number} m22 Component in column 2, row 2 position (index 10)
             * @param {Number} m23 Component in column 2, row 3 position (index 11)
             * @param {Number} m30 Component in column 3, row 0 position (index 12)
             * @param {Number} m31 Component in column 3, row 1 position (index 13)
             * @param {Number} m32 Component in column 3, row 2 position (index 14)
             * @param {Number} m33 Component in column 3, row 3 position (index 15)
             * @returns {mat4} out
             */
            mat4.set = function(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
                out[0] = m00;
                out[1] = m01;
                out[2] = m02;
                out[3] = m03;
                out[4] = m10;
                out[5] = m11;
                out[6] = m12;
                out[7] = m13;
                out[8] = m20;
                out[9] = m21;
                out[10] = m22;
                out[11] = m23;
                out[12] = m30;
                out[13] = m31;
                out[14] = m32;
                out[15] = m33;
                return out;
            };


            /**
             * Set a mat4 to the identity matrix
             *
             * @param {mat4} out the receiving matrix
             * @returns {mat4} out
             */
            mat4.identity = function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = 1;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 1;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            };

            /**
             * Transpose the values of a mat4 not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.scalar.transpose = function(out, a) {
                // If we are transposing ourselves we can skip a few steps but have to cache some values
                if (out === a) {
                    var a01 = a[1], a02 = a[2], a03 = a[3],
                        a12 = a[6], a13 = a[7],
                        a23 = a[11];

                    out[1] = a[4];
                    out[2] = a[8];
                    out[3] = a[12];
                    out[4] = a01;
                    out[6] = a[9];
                    out[7] = a[13];
                    out[8] = a02;
                    out[9] = a12;
                    out[11] = a[14];
                    out[12] = a03;
                    out[13] = a13;
                    out[14] = a23;
                } else {
                    out[0] = a[0];
                    out[1] = a[4];
                    out[2] = a[8];
                    out[3] = a[12];
                    out[4] = a[1];
                    out[5] = a[5];
                    out[6] = a[9];
                    out[7] = a[13];
                    out[8] = a[2];
                    out[9] = a[6];
                    out[10] = a[10];
                    out[11] = a[14];
                    out[12] = a[3];
                    out[13] = a[7];
                    out[14] = a[11];
                    out[15] = a[15];
                }

                return out;
            };

            /**
             * Transpose the values of a mat4 using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.SIMD.transpose = function(out, a) {
                var a0, a1, a2, a3,
                    tmp01, tmp23,
                    out0, out1, out2, out3;

                a0 = SIMD.Float32x4.load(a, 0);
                a1 = SIMD.Float32x4.load(a, 4);
                a2 = SIMD.Float32x4.load(a, 8);
                a3 = SIMD.Float32x4.load(a, 12);

                tmp01 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
                tmp23 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
                out0  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
                out1  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
                SIMD.Float32x4.store(out, 0,  out0);
                SIMD.Float32x4.store(out, 4,  out1);

                tmp01 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
                tmp23 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
                out2  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
                out3  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
                SIMD.Float32x4.store(out, 8,  out2);
                SIMD.Float32x4.store(out, 12, out3);

                return out;
            };

            /**
             * Transpse a mat4 using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.transpose = glMatrix.USE_SIMD ? mat4.SIMD.transpose : mat4.scalar.transpose;

            /**
             * Inverts a mat4 not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.scalar.invert = function(out, a) {
                var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                    b00 = a00 * a11 - a01 * a10,
                    b01 = a00 * a12 - a02 * a10,
                    b02 = a00 * a13 - a03 * a10,
                    b03 = a01 * a12 - a02 * a11,
                    b04 = a01 * a13 - a03 * a11,
                    b05 = a02 * a13 - a03 * a12,
                    b06 = a20 * a31 - a21 * a30,
                    b07 = a20 * a32 - a22 * a30,
                    b08 = a20 * a33 - a23 * a30,
                    b09 = a21 * a32 - a22 * a31,
                    b10 = a21 * a33 - a23 * a31,
                    b11 = a22 * a33 - a23 * a32,

                    // Calculate the determinant
                    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
                out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
                out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
                out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
                out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
                out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
                out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
                out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
                out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
                out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

                return out;
            };

            /**
             * Inverts a mat4 using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.SIMD.invert = function(out, a) {
                var row0, row1, row2, row3,
                    tmp1,
                    minor0, minor1, minor2, minor3,
                    det,
                    a0 = SIMD.Float32x4.load(a, 0),
                    a1 = SIMD.Float32x4.load(a, 4),
                    a2 = SIMD.Float32x4.load(a, 8),
                    a3 = SIMD.Float32x4.load(a, 12);

                // Compute matrix adjugate
                tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
                row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
                row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
                row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);
                tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
                row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
                row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
                row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

                tmp1   = SIMD.Float32x4.mul(row2, row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor0 = SIMD.Float32x4.mul(row1, tmp1);
                minor1 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
                minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
                minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(row1, row2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
                minor3 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
                minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
                minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
                minor2 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
                minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
                minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(row0, row1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
                minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
                minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

                tmp1   = SIMD.Float32x4.mul(row0, row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
                minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
                minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

                tmp1   = SIMD.Float32x4.mul(row0, row2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
                minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
                minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

                // Compute matrix determinant
                det   = SIMD.Float32x4.mul(row0, minor0);
                det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 2, 3, 0, 1), det);
                det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 1, 0, 3, 2), det);
                tmp1  = SIMD.Float32x4.reciprocalApproximation(det);
                det   = SIMD.Float32x4.sub(
                    SIMD.Float32x4.add(tmp1, tmp1),
                    SIMD.Float32x4.mul(det, SIMD.Float32x4.mul(tmp1, tmp1)));
                det   = SIMD.Float32x4.swizzle(det, 0, 0, 0, 0);
                if (!det) {
                    return null;
                }

                // Compute matrix inverse
                SIMD.Float32x4.store(out, 0,  SIMD.Float32x4.mul(det, minor0));
                SIMD.Float32x4.store(out, 4,  SIMD.Float32x4.mul(det, minor1));
                SIMD.Float32x4.store(out, 8,  SIMD.Float32x4.mul(det, minor2));
                SIMD.Float32x4.store(out, 12, SIMD.Float32x4.mul(det, minor3));
                return out;
            }

            /**
             * Inverts a mat4 using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.invert = glMatrix.USE_SIMD ? mat4.SIMD.invert : mat4.scalar.invert;

            /**
             * Calculates the adjugate of a mat4 not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.scalar.adjoint = function(out, a) {
                var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

                out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
                out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
                out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
                out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
                out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
                out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
                out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
                out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
                out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
                out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
                out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
                out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
                out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
                out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
                out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
                out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
                return out;
            };

            /**
             * Calculates the adjugate of a mat4 using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.SIMD.adjoint = function(out, a) {
                var a0, a1, a2, a3;
                var row0, row1, row2, row3;
                var tmp1;
                var minor0, minor1, minor2, minor3;

                a0 = SIMD.Float32x4.load(a, 0);
                a1 = SIMD.Float32x4.load(a, 4);
                a2 = SIMD.Float32x4.load(a, 8);
                a3 = SIMD.Float32x4.load(a, 12);

                // Transpose the source matrix.  Sort of.  Not a true transpose operation
                tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
                row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
                row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
                row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);

                tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
                row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
                row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
                row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

                tmp1   = SIMD.Float32x4.mul(row2, row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor0 = SIMD.Float32x4.mul(row1, tmp1);
                minor1 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
                minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
                minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(row1, row2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
                minor3 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
                minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
                minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
                minor2 = SIMD.Float32x4.mul(row0, tmp1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
                minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
                minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

                tmp1   = SIMD.Float32x4.mul(row0, row1);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
                minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
                minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

                tmp1   = SIMD.Float32x4.mul(row0, row3);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
                minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
                minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

                tmp1   = SIMD.Float32x4.mul(row0, row2);
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
                minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
                minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
                tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
                minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
                minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

                SIMD.Float32x4.store(out, 0,  minor0);
                SIMD.Float32x4.store(out, 4,  minor1);
                SIMD.Float32x4.store(out, 8,  minor2);
                SIMD.Float32x4.store(out, 12, minor3);
                return out;
            };

            /**
             * Calculates the adjugate of a mat4 using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            mat4.adjoint = glMatrix.USE_SIMD ? mat4.SIMD.adjoint : mat4.scalar.adjoint;

            /**
             * Calculates the determinant of a mat4
             *
             * @param {mat4} a the source matrix
             * @returns {Number} determinant of a
             */
            mat4.determinant = function (a) {
                var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

                    b00 = a00 * a11 - a01 * a10,
                    b01 = a00 * a12 - a02 * a10,
                    b02 = a00 * a13 - a03 * a10,
                    b03 = a01 * a12 - a02 * a11,
                    b04 = a01 * a13 - a03 * a11,
                    b05 = a02 * a13 - a03 * a12,
                    b06 = a20 * a31 - a21 * a30,
                    b07 = a20 * a32 - a22 * a30,
                    b08 = a20 * a33 - a23 * a30,
                    b09 = a21 * a32 - a22 * a31,
                    b10 = a21 * a33 - a23 * a31,
                    b11 = a22 * a33 - a23 * a32;

                // Calculate the determinant
                return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
            };

            /**
             * Multiplies two mat4's explicitly using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand, must be a Float32Array
             * @param {mat4} b the second operand, must be a Float32Array
             * @returns {mat4} out
             */
            mat4.SIMD.multiply = function (out, a, b) {
                var a0 = SIMD.Float32x4.load(a, 0);
                var a1 = SIMD.Float32x4.load(a, 4);
                var a2 = SIMD.Float32x4.load(a, 8);
                var a3 = SIMD.Float32x4.load(a, 12);

                var b0 = SIMD.Float32x4.load(b, 0);
                var out0 = SIMD.Float32x4.add(
                    SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 0, 0, 0, 0), a0),
                    SIMD.Float32x4.add(
                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 1, 1, 1, 1), a1),
                        SIMD.Float32x4.add(
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 2, 2, 2, 2), a2),
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 3, 3, 3, 3), a3))));
                SIMD.Float32x4.store(out, 0, out0);

                var b1 = SIMD.Float32x4.load(b, 4);
                var out1 = SIMD.Float32x4.add(
                    SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 0, 0, 0, 0), a0),
                    SIMD.Float32x4.add(
                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 1, 1, 1, 1), a1),
                        SIMD.Float32x4.add(
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 2, 2, 2, 2), a2),
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 3, 3, 3, 3), a3))));
                SIMD.Float32x4.store(out, 4, out1);

                var b2 = SIMD.Float32x4.load(b, 8);
                var out2 = SIMD.Float32x4.add(
                    SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 0, 0, 0, 0), a0),
                    SIMD.Float32x4.add(
                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 1, 1, 1, 1), a1),
                        SIMD.Float32x4.add(
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 2, 2, 2, 2), a2),
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 3, 3, 3, 3), a3))));
                SIMD.Float32x4.store(out, 8, out2);

                var b3 = SIMD.Float32x4.load(b, 12);
                var out3 = SIMD.Float32x4.add(
                    SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 0, 0, 0, 0), a0),
                    SIMD.Float32x4.add(
                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 1, 1, 1, 1), a1),
                        SIMD.Float32x4.add(
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 2, 2, 2, 2), a2),
                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 3, 3, 3, 3), a3))));
                SIMD.Float32x4.store(out, 12, out3);

                return out;
            };

            /**
             * Multiplies two mat4's explicitly not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @returns {mat4} out
             */
            mat4.scalar.multiply = function (out, a, b) {
                var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
                    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
                    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
                    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

                // Cache only the current line of the second matrix
                var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
                out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
                out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

                b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
                out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
                out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
                out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
                out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
                return out;
            };

            /**
             * Multiplies two mat4's using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @returns {mat4} out
             */
            mat4.multiply = glMatrix.USE_SIMD ? mat4.SIMD.multiply : mat4.scalar.multiply;

            /**
             * Alias for {@link mat4.multiply}
             * @function
             */
            mat4.mul = mat4.multiply;

            /**
             * Translate a mat4 by the given vector not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to translate
             * @param {vec3} v vector to translate by
             * @returns {mat4} out
             */
            mat4.scalar.translate = function (out, a, v) {
                var x = v[0], y = v[1], z = v[2],
                    a00, a01, a02, a03,
                    a10, a11, a12, a13,
                    a20, a21, a22, a23;

                if (a === out) {
                    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
                    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
                    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
                    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
                } else {
                    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
                    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
                    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

                    out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
                    out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
                    out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

                    out[12] = a00 * x + a10 * y + a20 * z + a[12];
                    out[13] = a01 * x + a11 * y + a21 * z + a[13];
                    out[14] = a02 * x + a12 * y + a22 * z + a[14];
                    out[15] = a03 * x + a13 * y + a23 * z + a[15];
                }

                return out;
            };

            /**
             * Translates a mat4 by the given vector using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to translate
             * @param {vec3} v vector to translate by
             * @returns {mat4} out
             */
            mat4.SIMD.translate = function (out, a, v) {
                var a0 = SIMD.Float32x4.load(a, 0),
                    a1 = SIMD.Float32x4.load(a, 4),
                    a2 = SIMD.Float32x4.load(a, 8),
                    a3 = SIMD.Float32x4.load(a, 12),
                    vec = SIMD.Float32x4(v[0], v[1], v[2] , 0);

                if (a !== out) {
                    out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
                    out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
                    out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
                }

                a0 = SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0));
                a1 = SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1));
                a2 = SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2));

                var t0 = SIMD.Float32x4.add(a0, SIMD.Float32x4.add(a1, SIMD.Float32x4.add(a2, a3)));
                SIMD.Float32x4.store(out, 12, t0);

                return out;
            };

            /**
             * Translates a mat4 by the given vector using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to translate
             * @param {vec3} v vector to translate by
             * @returns {mat4} out
             */
            mat4.translate = glMatrix.USE_SIMD ? mat4.SIMD.translate : mat4.scalar.translate;

            /**
             * Scales the mat4 by the dimensions in the given vec3 not using vectorization
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to scale
             * @param {vec3} v the vec3 to scale the matrix by
             * @returns {mat4} out
             **/
            mat4.scalar.scale = function(out, a, v) {
                var x = v[0], y = v[1], z = v[2];

                out[0] = a[0] * x;
                out[1] = a[1] * x;
                out[2] = a[2] * x;
                out[3] = a[3] * x;
                out[4] = a[4] * y;
                out[5] = a[5] * y;
                out[6] = a[6] * y;
                out[7] = a[7] * y;
                out[8] = a[8] * z;
                out[9] = a[9] * z;
                out[10] = a[10] * z;
                out[11] = a[11] * z;
                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
                return out;
            };

            /**
             * Scales the mat4 by the dimensions in the given vec3 using vectorization
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to scale
             * @param {vec3} v the vec3 to scale the matrix by
             * @returns {mat4} out
             **/
            mat4.SIMD.scale = function(out, a, v) {
                var a0, a1, a2;
                var vec = SIMD.Float32x4(v[0], v[1], v[2], 0);

                a0 = SIMD.Float32x4.load(a, 0);
                SIMD.Float32x4.store(
                    out, 0, SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0)));

                a1 = SIMD.Float32x4.load(a, 4);
                SIMD.Float32x4.store(
                    out, 4, SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1)));

                a2 = SIMD.Float32x4.load(a, 8);
                SIMD.Float32x4.store(
                    out, 8, SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2)));

                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
                return out;
            };

            /**
             * Scales the mat4 by the dimensions in the given vec3 using SIMD if available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to scale
             * @param {vec3} v the vec3 to scale the matrix by
             * @returns {mat4} out
             */
            mat4.scale = glMatrix.USE_SIMD ? mat4.SIMD.scale : mat4.scalar.scale;

            /**
             * Rotates a mat4 by the given angle around the given axis
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @param {vec3} axis the axis to rotate around
             * @returns {mat4} out
             */
            mat4.rotate = function (out, a, rad, axis) {
                var x = axis[0], y = axis[1], z = axis[2],
                    len = Math.sqrt(x * x + y * y + z * z),
                    s, c, t,
                    a00, a01, a02, a03,
                    a10, a11, a12, a13,
                    a20, a21, a22, a23,
                    b00, b01, b02,
                    b10, b11, b12,
                    b20, b21, b22;

                if (Math.abs(len) < glMatrix.EPSILON) { return null; }

                len = 1 / len;
                x *= len;
                y *= len;
                z *= len;

                s = Math.sin(rad);
                c = Math.cos(rad);
                t = 1 - c;

                a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
                a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
                a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

                // Construct the elements of the rotation matrix
                b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
                b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
                b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

                // Perform rotation-specific matrix multiplication
                out[0] = a00 * b00 + a10 * b01 + a20 * b02;
                out[1] = a01 * b00 + a11 * b01 + a21 * b02;
                out[2] = a02 * b00 + a12 * b01 + a22 * b02;
                out[3] = a03 * b00 + a13 * b01 + a23 * b02;
                out[4] = a00 * b10 + a10 * b11 + a20 * b12;
                out[5] = a01 * b10 + a11 * b11 + a21 * b12;
                out[6] = a02 * b10 + a12 * b11 + a22 * b12;
                out[7] = a03 * b10 + a13 * b11 + a23 * b12;
                out[8] = a00 * b20 + a10 * b21 + a20 * b22;
                out[9] = a01 * b20 + a11 * b21 + a21 * b22;
                out[10] = a02 * b20 + a12 * b21 + a22 * b22;
                out[11] = a03 * b20 + a13 * b21 + a23 * b22;

                if (a !== out) { // If the source and destination differ, copy the unchanged last row
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the X axis not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.scalar.rotateX = function (out, a, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad),
                    a10 = a[4],
                    a11 = a[5],
                    a12 = a[6],
                    a13 = a[7],
                    a20 = a[8],
                    a21 = a[9],
                    a22 = a[10],
                    a23 = a[11];

                if (a !== out) { // If the source and destination differ, copy the unchanged rows
                    out[0]  = a[0];
                    out[1]  = a[1];
                    out[2]  = a[2];
                    out[3]  = a[3];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                out[4] = a10 * c + a20 * s;
                out[5] = a11 * c + a21 * s;
                out[6] = a12 * c + a22 * s;
                out[7] = a13 * c + a23 * s;
                out[8] = a20 * c - a10 * s;
                out[9] = a21 * c - a11 * s;
                out[10] = a22 * c - a12 * s;
                out[11] = a23 * c - a13 * s;
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the X axis using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.SIMD.rotateX = function (out, a, rad) {
                var s = SIMD.Float32x4.splat(Math.sin(rad)),
                    c = SIMD.Float32x4.splat(Math.cos(rad));

                if (a !== out) { // If the source and destination differ, copy the unchanged rows
                    out[0]  = a[0];
                    out[1]  = a[1];
                    out[2]  = a[2];
                    out[3]  = a[3];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                var a_1 = SIMD.Float32x4.load(a, 4);
                var a_2 = SIMD.Float32x4.load(a, 8);
                SIMD.Float32x4.store(out, 4,
                    SIMD.Float32x4.add(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_2, s)));
                SIMD.Float32x4.store(out, 8,
                    SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_2, c), SIMD.Float32x4.mul(a_1, s)));
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the X axis using SIMD if availabe and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.rotateX = glMatrix.USE_SIMD ? mat4.SIMD.rotateX : mat4.scalar.rotateX;

            /**
             * Rotates a matrix by the given angle around the Y axis not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.scalar.rotateY = function (out, a, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad),
                    a00 = a[0],
                    a01 = a[1],
                    a02 = a[2],
                    a03 = a[3],
                    a20 = a[8],
                    a21 = a[9],
                    a22 = a[10],
                    a23 = a[11];

                if (a !== out) { // If the source and destination differ, copy the unchanged rows
                    out[4]  = a[4];
                    out[5]  = a[5];
                    out[6]  = a[6];
                    out[7]  = a[7];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                out[0] = a00 * c - a20 * s;
                out[1] = a01 * c - a21 * s;
                out[2] = a02 * c - a22 * s;
                out[3] = a03 * c - a23 * s;
                out[8] = a00 * s + a20 * c;
                out[9] = a01 * s + a21 * c;
                out[10] = a02 * s + a22 * c;
                out[11] = a03 * s + a23 * c;
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the Y axis using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.SIMD.rotateY = function (out, a, rad) {
                var s = SIMD.Float32x4.splat(Math.sin(rad)),
                    c = SIMD.Float32x4.splat(Math.cos(rad));

                if (a !== out) { // If the source and destination differ, copy the unchanged rows
                    out[4]  = a[4];
                    out[5]  = a[5];
                    out[6]  = a[6];
                    out[7]  = a[7];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                var a_0 = SIMD.Float32x4.load(a, 0);
                var a_2 = SIMD.Float32x4.load(a, 8);
                SIMD.Float32x4.store(out, 0,
                    SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_2, s)));
                SIMD.Float32x4.store(out, 8,
                    SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, s), SIMD.Float32x4.mul(a_2, c)));
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the Y axis if SIMD available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.rotateY = glMatrix.USE_SIMD ? mat4.SIMD.rotateY : mat4.scalar.rotateY;

            /**
             * Rotates a matrix by the given angle around the Z axis not using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.scalar.rotateZ = function (out, a, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad),
                    a00 = a[0],
                    a01 = a[1],
                    a02 = a[2],
                    a03 = a[3],
                    a10 = a[4],
                    a11 = a[5],
                    a12 = a[6],
                    a13 = a[7];

                if (a !== out) { // If the source and destination differ, copy the unchanged last row
                    out[8]  = a[8];
                    out[9]  = a[9];
                    out[10] = a[10];
                    out[11] = a[11];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                out[0] = a00 * c + a10 * s;
                out[1] = a01 * c + a11 * s;
                out[2] = a02 * c + a12 * s;
                out[3] = a03 * c + a13 * s;
                out[4] = a10 * c - a00 * s;
                out[5] = a11 * c - a01 * s;
                out[6] = a12 * c - a02 * s;
                out[7] = a13 * c - a03 * s;
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the Z axis using SIMD
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.SIMD.rotateZ = function (out, a, rad) {
                var s = SIMD.Float32x4.splat(Math.sin(rad)),
                    c = SIMD.Float32x4.splat(Math.cos(rad));

                if (a !== out) { // If the source and destination differ, copy the unchanged last row
                    out[8]  = a[8];
                    out[9]  = a[9];
                    out[10] = a[10];
                    out[11] = a[11];
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }

                // Perform axis-specific matrix multiplication
                var a_0 = SIMD.Float32x4.load(a, 0);
                var a_1 = SIMD.Float32x4.load(a, 4);
                SIMD.Float32x4.store(out, 0,
                    SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_1, s)));
                SIMD.Float32x4.store(out, 4,
                    SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_0, s)));
                return out;
            };

            /**
             * Rotates a matrix by the given angle around the Z axis if SIMD available and enabled
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to rotate
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.rotateZ = glMatrix.USE_SIMD ? mat4.SIMD.rotateZ : mat4.scalar.rotateZ;

            /**
             * Creates a matrix from a vector translation
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.translate(dest, dest, vec);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {vec3} v Translation vector
             * @returns {mat4} out
             */
            mat4.fromTranslation = function(out, v) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = 1;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 1;
                out[11] = 0;
                out[12] = v[0];
                out[13] = v[1];
                out[14] = v[2];
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from a vector scaling
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.scale(dest, dest, vec);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {vec3} v Scaling vector
             * @returns {mat4} out
             */
            mat4.fromScaling = function(out, v) {
                out[0] = v[0];
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = v[1];
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = v[2];
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from a given angle around a given axis
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.rotate(dest, dest, rad, axis);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @param {vec3} axis the axis to rotate around
             * @returns {mat4} out
             */
            mat4.fromRotation = function(out, rad, axis) {
                var x = axis[0], y = axis[1], z = axis[2],
                    len = Math.sqrt(x * x + y * y + z * z),
                    s, c, t;

                if (Math.abs(len) < glMatrix.EPSILON) { return null; }

                len = 1 / len;
                x *= len;
                y *= len;
                z *= len;

                s = Math.sin(rad);
                c = Math.cos(rad);
                t = 1 - c;

                // Perform rotation-specific matrix multiplication
                out[0] = x * x * t + c;
                out[1] = y * x * t + z * s;
                out[2] = z * x * t - y * s;
                out[3] = 0;
                out[4] = x * y * t - z * s;
                out[5] = y * y * t + c;
                out[6] = z * y * t + x * s;
                out[7] = 0;
                out[8] = x * z * t + y * s;
                out[9] = y * z * t - x * s;
                out[10] = z * z * t + c;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from the given angle around the X axis
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.rotateX(dest, dest, rad);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.fromXRotation = function(out, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad);

                // Perform axis-specific matrix multiplication
                out[0]  = 1;
                out[1]  = 0;
                out[2]  = 0;
                out[3]  = 0;
                out[4] = 0;
                out[5] = c;
                out[6] = s;
                out[7] = 0;
                out[8] = 0;
                out[9] = -s;
                out[10] = c;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from the given angle around the Y axis
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.rotateY(dest, dest, rad);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.fromYRotation = function(out, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad);

                // Perform axis-specific matrix multiplication
                out[0]  = c;
                out[1]  = 0;
                out[2]  = -s;
                out[3]  = 0;
                out[4] = 0;
                out[5] = 1;
                out[6] = 0;
                out[7] = 0;
                out[8] = s;
                out[9] = 0;
                out[10] = c;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from the given angle around the Z axis
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.rotateZ(dest, dest, rad);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {Number} rad the angle to rotate the matrix by
             * @returns {mat4} out
             */
            mat4.fromZRotation = function(out, rad) {
                var s = Math.sin(rad),
                    c = Math.cos(rad);

                // Perform axis-specific matrix multiplication
                out[0]  = c;
                out[1]  = s;
                out[2]  = 0;
                out[3]  = 0;
                out[4] = -s;
                out[5] = c;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 1;
                out[11] = 0;
                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;
                return out;
            }

            /**
             * Creates a matrix from a quaternion rotation and vector translation
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.translate(dest, vec);
             *     var quatMat = mat4.create();
             *     quat4.toMat4(quat, quatMat);
             *     mat4.multiply(dest, quatMat);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {quat4} q Rotation quaternion
             * @param {vec3} v Translation vector
             * @returns {mat4} out
             */
            mat4.fromRotationTranslation = function (out, q, v) {
                // Quaternion math
                var x = q[0], y = q[1], z = q[2], w = q[3],
                    x2 = x + x,
                    y2 = y + y,
                    z2 = z + z,

                    xx = x * x2,
                    xy = x * y2,
                    xz = x * z2,
                    yy = y * y2,
                    yz = y * z2,
                    zz = z * z2,
                    wx = w * x2,
                    wy = w * y2,
                    wz = w * z2;

                out[0] = 1 - (yy + zz);
                out[1] = xy + wz;
                out[2] = xz - wy;
                out[3] = 0;
                out[4] = xy - wz;
                out[5] = 1 - (xx + zz);
                out[6] = yz + wx;
                out[7] = 0;
                out[8] = xz + wy;
                out[9] = yz - wx;
                out[10] = 1 - (xx + yy);
                out[11] = 0;
                out[12] = v[0];
                out[13] = v[1];
                out[14] = v[2];
                out[15] = 1;

                return out;
            };

            /**
             * Returns the translation vector component of a transformation
             *  matrix. If a matrix is built with fromRotationTranslation,
             *  the returned vector will be the same as the translation vector
             *  originally supplied.
             * @param  {vec3} out Vector to receive translation component
             * @param  {mat4} mat Matrix to be decomposed (input)
             * @return {vec3} out
             */
            mat4.getTranslation = function (out, mat) {
                out[0] = mat[12];
                out[1] = mat[13];
                out[2] = mat[14];

                return out;
            };

            /**
             * Returns a quaternion representing the rotational component
             *  of a transformation matrix. If a matrix is built with
             *  fromRotationTranslation, the returned quaternion will be the
             *  same as the quaternion originally supplied.
             * @param {quat} out Quaternion to receive the rotation component
             * @param {mat4} mat Matrix to be decomposed (input)
             * @return {quat} out
             */
            mat4.getRotation = function (out, mat) {
                // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
                var trace = mat[0] + mat[5] + mat[10];
                var S = 0;

                if (trace > 0) {
                    S = Math.sqrt(trace + 1.0) * 2;
                    out[3] = 0.25 * S;
                    out[0] = (mat[6] - mat[9]) / S;
                    out[1] = (mat[8] - mat[2]) / S;
                    out[2] = (mat[1] - mat[4]) / S;
                } else if ((mat[0] > mat[5])&(mat[0] > mat[10])) {
                    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
                    out[3] = (mat[6] - mat[9]) / S;
                    out[0] = 0.25 * S;
                    out[1] = (mat[1] + mat[4]) / S;
                    out[2] = (mat[8] + mat[2]) / S;
                } else if (mat[5] > mat[10]) {
                    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
                    out[3] = (mat[8] - mat[2]) / S;
                    out[0] = (mat[1] + mat[4]) / S;
                    out[1] = 0.25 * S;
                    out[2] = (mat[6] + mat[9]) / S;
                } else {
                    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
                    out[3] = (mat[1] - mat[4]) / S;
                    out[0] = (mat[8] + mat[2]) / S;
                    out[1] = (mat[6] + mat[9]) / S;
                    out[2] = 0.25 * S;
                }

                return out;
            };

            /**
             * Creates a matrix from a quaternion rotation, vector translation and vector scale
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.translate(dest, vec);
             *     var quatMat = mat4.create();
             *     quat4.toMat4(quat, quatMat);
             *     mat4.multiply(dest, quatMat);
             *     mat4.scale(dest, scale)
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {quat4} q Rotation quaternion
             * @param {vec3} v Translation vector
             * @param {vec3} s Scaling vector
             * @returns {mat4} out
             */
            mat4.fromRotationTranslationScale = function (out, q, v, s) {
                // Quaternion math
                var x = q[0], y = q[1], z = q[2], w = q[3],
                    x2 = x + x,
                    y2 = y + y,
                    z2 = z + z,

                    xx = x * x2,
                    xy = x * y2,
                    xz = x * z2,
                    yy = y * y2,
                    yz = y * z2,
                    zz = z * z2,
                    wx = w * x2,
                    wy = w * y2,
                    wz = w * z2,
                    sx = s[0],
                    sy = s[1],
                    sz = s[2];

                out[0] = (1 - (yy + zz)) * sx;
                out[1] = (xy + wz) * sx;
                out[2] = (xz - wy) * sx;
                out[3] = 0;
                out[4] = (xy - wz) * sy;
                out[5] = (1 - (xx + zz)) * sy;
                out[6] = (yz + wx) * sy;
                out[7] = 0;
                out[8] = (xz + wy) * sz;
                out[9] = (yz - wx) * sz;
                out[10] = (1 - (xx + yy)) * sz;
                out[11] = 0;
                out[12] = v[0];
                out[13] = v[1];
                out[14] = v[2];
                out[15] = 1;

                return out;
            };

            /**
             * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
             * This is equivalent to (but much faster than):
             *
             *     mat4.identity(dest);
             *     mat4.translate(dest, vec);
             *     mat4.translate(dest, origin);
             *     var quatMat = mat4.create();
             *     quat4.toMat4(quat, quatMat);
             *     mat4.multiply(dest, quatMat);
             *     mat4.scale(dest, scale)
             *     mat4.translate(dest, negativeOrigin);
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {quat4} q Rotation quaternion
             * @param {vec3} v Translation vector
             * @param {vec3} s Scaling vector
             * @param {vec3} o The origin vector around which to scale and rotate
             * @returns {mat4} out
             */
            mat4.fromRotationTranslationScaleOrigin = function (out, q, v, s, o) {
                // Quaternion math
                var x = q[0], y = q[1], z = q[2], w = q[3],
                    x2 = x + x,
                    y2 = y + y,
                    z2 = z + z,

                    xx = x * x2,
                    xy = x * y2,
                    xz = x * z2,
                    yy = y * y2,
                    yz = y * z2,
                    zz = z * z2,
                    wx = w * x2,
                    wy = w * y2,
                    wz = w * z2,

                    sx = s[0],
                    sy = s[1],
                    sz = s[2],

                    ox = o[0],
                    oy = o[1],
                    oz = o[2];

                out[0] = (1 - (yy + zz)) * sx;
                out[1] = (xy + wz) * sx;
                out[2] = (xz - wy) * sx;
                out[3] = 0;
                out[4] = (xy - wz) * sy;
                out[5] = (1 - (xx + zz)) * sy;
                out[6] = (yz + wx) * sy;
                out[7] = 0;
                out[8] = (xz + wy) * sz;
                out[9] = (yz - wx) * sz;
                out[10] = (1 - (xx + yy)) * sz;
                out[11] = 0;
                out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
                out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
                out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
                out[15] = 1;

                return out;
            };

            /**
             * Calculates a 4x4 matrix from the given quaternion
             *
             * @param {mat4} out mat4 receiving operation result
             * @param {quat} q Quaternion to create matrix from
             *
             * @returns {mat4} out
             */
            mat4.fromQuat = function (out, q) {
                var x = q[0], y = q[1], z = q[2], w = q[3],
                    x2 = x + x,
                    y2 = y + y,
                    z2 = z + z,

                    xx = x * x2,
                    yx = y * x2,
                    yy = y * y2,
                    zx = z * x2,
                    zy = z * y2,
                    zz = z * z2,
                    wx = w * x2,
                    wy = w * y2,
                    wz = w * z2;

                out[0] = 1 - yy - zz;
                out[1] = yx + wz;
                out[2] = zx - wy;
                out[3] = 0;

                out[4] = yx - wz;
                out[5] = 1 - xx - zz;
                out[6] = zy + wx;
                out[7] = 0;

                out[8] = zx + wy;
                out[9] = zy - wx;
                out[10] = 1 - xx - yy;
                out[11] = 0;

                out[12] = 0;
                out[13] = 0;
                out[14] = 0;
                out[15] = 1;

                return out;
            };

            /**
             * Generates a frustum matrix with the given bounds
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {Number} left Left bound of the frustum
             * @param {Number} right Right bound of the frustum
             * @param {Number} bottom Bottom bound of the frustum
             * @param {Number} top Top bound of the frustum
             * @param {Number} near Near bound of the frustum
             * @param {Number} far Far bound of the frustum
             * @returns {mat4} out
             */
            mat4.frustum = function (out, left, right, bottom, top, near, far) {
                var rl = 1 / (right - left),
                    tb = 1 / (top - bottom),
                    nf = 1 / (near - far);
                out[0] = (near * 2) * rl;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = (near * 2) * tb;
                out[6] = 0;
                out[7] = 0;
                out[8] = (right + left) * rl;
                out[9] = (top + bottom) * tb;
                out[10] = (far + near) * nf;
                out[11] = -1;
                out[12] = 0;
                out[13] = 0;
                out[14] = (far * near * 2) * nf;
                out[15] = 0;
                return out;
            };

            /**
             * Generates a perspective projection matrix with the given bounds
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {number} fovy Vertical field of view in radians
             * @param {number} aspect Aspect ratio. typically viewport width/height
             * @param {number} near Near bound of the frustum
             * @param {number} far Far bound of the frustum
             * @returns {mat4} out
             */
            mat4.perspective = function (out, fovy, aspect, near, far) {
                var f = 1.0 / Math.tan(fovy / 2),
                    nf = 1 / (near - far);
                out[0] = f / aspect;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = f;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = (far + near) * nf;
                out[11] = -1;
                out[12] = 0;
                out[13] = 0;
                out[14] = (2 * far * near) * nf;
                out[15] = 0;
                return out;
            };

            /**
             * Generates a perspective projection matrix with the given field of view.
             * This is primarily useful for generating projection matrices to be used
             * with the still experiemental WebVR API.
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
             * @param {number} near Near bound of the frustum
             * @param {number} far Far bound of the frustum
             * @returns {mat4} out
             */
            mat4.perspectiveFromFieldOfView = function (out, fov, near, far) {
                var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
                    downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
                    leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
                    rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
                    xScale = 2.0 / (leftTan + rightTan),
                    yScale = 2.0 / (upTan + downTan);

                out[0] = xScale;
                out[1] = 0.0;
                out[2] = 0.0;
                out[3] = 0.0;
                out[4] = 0.0;
                out[5] = yScale;
                out[6] = 0.0;
                out[7] = 0.0;
                out[8] = -((leftTan - rightTan) * xScale * 0.5);
                out[9] = ((upTan - downTan) * yScale * 0.5);
                out[10] = far / (near - far);
                out[11] = -1.0;
                out[12] = 0.0;
                out[13] = 0.0;
                out[14] = (far * near) / (near - far);
                out[15] = 0.0;
                return out;
            }

            /**
             * Generates a orthogonal projection matrix with the given bounds
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {number} left Left bound of the frustum
             * @param {number} right Right bound of the frustum
             * @param {number} bottom Bottom bound of the frustum
             * @param {number} top Top bound of the frustum
             * @param {number} near Near bound of the frustum
             * @param {number} far Far bound of the frustum
             * @returns {mat4} out
             */
            mat4.ortho = function (out, left, right, bottom, top, near, far) {
                var lr = 1 / (left - right),
                    bt = 1 / (bottom - top),
                    nf = 1 / (near - far);
                out[0] = -2 * lr;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = -2 * bt;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 2 * nf;
                out[11] = 0;
                out[12] = (left + right) * lr;
                out[13] = (top + bottom) * bt;
                out[14] = (far + near) * nf;
                out[15] = 1;
                return out;
            };

            /**
             * Generates a look-at matrix with the given eye position, focal point, and up axis
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {vec3} eye Position of the viewer
             * @param {vec3} center Point the viewer is looking at
             * @param {vec3} up vec3 pointing up
             * @returns {mat4} out
             */
            mat4.lookAt = function (out, eye, center, up) {
                var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
                    eyex = eye[0],
                    eyey = eye[1],
                    eyez = eye[2],
                    upx = up[0],
                    upy = up[1],
                    upz = up[2],
                    centerx = center[0],
                    centery = center[1],
                    centerz = center[2];

                if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
                    Math.abs(eyey - centery) < glMatrix.EPSILON &&
                    Math.abs(eyez - centerz) < glMatrix.EPSILON) {
                    return mat4.identity(out);
                }

                z0 = eyex - centerx;
                z1 = eyey - centery;
                z2 = eyez - centerz;

                len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
                z0 *= len;
                z1 *= len;
                z2 *= len;

                x0 = upy * z2 - upz * z1;
                x1 = upz * z0 - upx * z2;
                x2 = upx * z1 - upy * z0;
                len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
                if (!len) {
                    x0 = 0;
                    x1 = 0;
                    x2 = 0;
                } else {
                    len = 1 / len;
                    x0 *= len;
                    x1 *= len;
                    x2 *= len;
                }

                y0 = z1 * x2 - z2 * x1;
                y1 = z2 * x0 - z0 * x2;
                y2 = z0 * x1 - z1 * x0;

                len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
                if (!len) {
                    y0 = 0;
                    y1 = 0;
                    y2 = 0;
                } else {
                    len = 1 / len;
                    y0 *= len;
                    y1 *= len;
                    y2 *= len;
                }

                out[0] = x0;
                out[1] = y0;
                out[2] = z0;
                out[3] = 0;
                out[4] = x1;
                out[5] = y1;
                out[6] = z1;
                out[7] = 0;
                out[8] = x2;
                out[9] = y2;
                out[10] = z2;
                out[11] = 0;
                out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
                out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
                out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
                out[15] = 1;

                return out;
            };

            /**
             * Returns a string representation of a mat4
             *
             * @param {mat4} a matrix to represent as a string
             * @returns {String} string representation of the matrix
             */
            mat4.str = function (a) {
                return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
            };

            /**
             * Returns Frobenius norm of a mat4
             *
             * @param {mat4} a the matrix to calculate Frobenius norm of
             * @returns {Number} Frobenius norm
             */
            mat4.frob = function (a) {
                return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
            };

            /**
             * Adds two mat4's
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @returns {mat4} out
             */
            mat4.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                out[3] = a[3] + b[3];
                out[4] = a[4] + b[4];
                out[5] = a[5] + b[5];
                out[6] = a[6] + b[6];
                out[7] = a[7] + b[7];
                out[8] = a[8] + b[8];
                out[9] = a[9] + b[9];
                out[10] = a[10] + b[10];
                out[11] = a[11] + b[11];
                out[12] = a[12] + b[12];
                out[13] = a[13] + b[13];
                out[14] = a[14] + b[14];
                out[15] = a[15] + b[15];
                return out;
            };

            /**
             * Subtracts matrix b from matrix a
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @returns {mat4} out
             */
            mat4.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                out[3] = a[3] - b[3];
                out[4] = a[4] - b[4];
                out[5] = a[5] - b[5];
                out[6] = a[6] - b[6];
                out[7] = a[7] - b[7];
                out[8] = a[8] - b[8];
                out[9] = a[9] - b[9];
                out[10] = a[10] - b[10];
                out[11] = a[11] - b[11];
                out[12] = a[12] - b[12];
                out[13] = a[13] - b[13];
                out[14] = a[14] - b[14];
                out[15] = a[15] - b[15];
                return out;
            };

            /**
             * Alias for {@link mat4.subtract}
             * @function
             */
            mat4.sub = mat4.subtract;

            /**
             * Multiply each element of the matrix by a scalar.
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to scale
             * @param {Number} b amount to scale the matrix's elements by
             * @returns {mat4} out
             */
            mat4.multiplyScalar = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                out[3] = a[3] * b;
                out[4] = a[4] * b;
                out[5] = a[5] * b;
                out[6] = a[6] * b;
                out[7] = a[7] * b;
                out[8] = a[8] * b;
                out[9] = a[9] * b;
                out[10] = a[10] * b;
                out[11] = a[11] * b;
                out[12] = a[12] * b;
                out[13] = a[13] * b;
                out[14] = a[14] * b;
                out[15] = a[15] * b;
                return out;
            };

            /**
             * Adds two mat4's after multiplying each element of the second operand by a scalar value.
             *
             * @param {mat4} out the receiving vector
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @param {Number} scale the amount to scale b's elements by before adding
             * @returns {mat4} out
             */
            mat4.multiplyScalarAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                out[3] = a[3] + (b[3] * scale);
                out[4] = a[4] + (b[4] * scale);
                out[5] = a[5] + (b[5] * scale);
                out[6] = a[6] + (b[6] * scale);
                out[7] = a[7] + (b[7] * scale);
                out[8] = a[8] + (b[8] * scale);
                out[9] = a[9] + (b[9] * scale);
                out[10] = a[10] + (b[10] * scale);
                out[11] = a[11] + (b[11] * scale);
                out[12] = a[12] + (b[12] * scale);
                out[13] = a[13] + (b[13] * scale);
                out[14] = a[14] + (b[14] * scale);
                out[15] = a[15] + (b[15] * scale);
                return out;
            };

            /**
             * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
             *
             * @param {mat4} a The first matrix.
             * @param {mat4} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat4.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] &&
                    a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] &&
                    a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
                    a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
            };

            /**
             * Returns whether or not the matrices have approximately the same elements in the same position.
             *
             * @param {mat4} a The first matrix.
             * @param {mat4} b The second matrix.
             * @returns {Boolean} True if the matrices are equal, false otherwise.
             */
            mat4.equals = function (a, b) {
                var a0  = a[0],  a1  = a[1],  a2  = a[2],  a3  = a[3],
                    a4  = a[4],  a5  = a[5],  a6  = a[6],  a7  = a[7],
                    a8  = a[8],  a9  = a[9],  a10 = a[10], a11 = a[11],
                    a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];

                var b0  = b[0],  b1  = b[1],  b2  = b[2],  b3  = b[3],
                    b4  = b[4],  b5  = b[5],  b6  = b[6],  b7  = b[7],
                    b8  = b[8],  b9  = b[9],  b10 = b[10], b11 = b[11],
                    b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
                Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
                Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
                Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
                Math.abs(a6 - b6) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
                Math.abs(a7 - b7) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
                Math.abs(a8 - b8) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a8), Math.abs(b8)) &&
                Math.abs(a9 - b9) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a9), Math.abs(b9)) &&
                Math.abs(a10 - b10) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a10), Math.abs(b10)) &&
                Math.abs(a11 - b11) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a11), Math.abs(b11)) &&
                Math.abs(a12 - b12) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a12), Math.abs(b12)) &&
                Math.abs(a13 - b13) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a13), Math.abs(b13)) &&
                Math.abs(a14 - b14) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a14), Math.abs(b14)) &&
                Math.abs(a15 - b15) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a15), Math.abs(b15)));
            };



            module.exports = mat4;


            /***/ },
        /* 6 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);
            var mat3 = __webpack_require__(4);
            var vec3 = __webpack_require__(7);
            var vec4 = __webpack_require__(8);

            /**
             * @class Quaternion
             * @name quat
             */
            var quat = {};

            /**
             * Creates a new identity quat
             *
             * @returns {quat} a new quaternion
             */
            quat.create = function() {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = 0;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                return out;
            };

            /**
             * Sets a quaternion to represent the shortest rotation from one
             * vector to another.
             *
             * Both vectors are assumed to be unit length.
             *
             * @param {quat} out the receiving quaternion.
             * @param {vec3} a the initial vector
             * @param {vec3} b the destination vector
             * @returns {quat} out
             */
            quat.rotationTo = (function() {
                var tmpvec3 = vec3.create();
                var xUnitVec3 = vec3.fromValues(1,0,0);
                var yUnitVec3 = vec3.fromValues(0,1,0);

                return function(out, a, b) {
                    var dot = vec3.dot(a, b);
                    if (dot < -0.999999) {
                        vec3.cross(tmpvec3, xUnitVec3, a);
                        if (vec3.length(tmpvec3) < 0.000001)
                            vec3.cross(tmpvec3, yUnitVec3, a);
                        vec3.normalize(tmpvec3, tmpvec3);
                        quat.setAxisAngle(out, tmpvec3, Math.PI);
                        return out;
                    } else if (dot > 0.999999) {
                        out[0] = 0;
                        out[1] = 0;
                        out[2] = 0;
                        out[3] = 1;
                        return out;
                    } else {
                        vec3.cross(tmpvec3, a, b);
                        out[0] = tmpvec3[0];
                        out[1] = tmpvec3[1];
                        out[2] = tmpvec3[2];
                        out[3] = 1 + dot;
                        return quat.normalize(out, out);
                    }
                };
            })();

            /**
             * Sets the specified quaternion with values corresponding to the given
             * axes. Each axis is a vec3 and is expected to be unit length and
             * perpendicular to all other specified axes.
             *
             * @param {vec3} view  the vector representing the viewing direction
             * @param {vec3} right the vector representing the local "right" direction
             * @param {vec3} up    the vector representing the local "up" direction
             * @returns {quat} out
             */
            quat.setAxes = (function() {
                var matr = mat3.create();

                return function(out, view, right, up) {
                    matr[0] = right[0];
                    matr[3] = right[1];
                    matr[6] = right[2];

                    matr[1] = up[0];
                    matr[4] = up[1];
                    matr[7] = up[2];

                    matr[2] = -view[0];
                    matr[5] = -view[1];
                    matr[8] = -view[2];

                    return quat.normalize(out, quat.fromMat3(out, matr));
                };
            })();

            /**
             * Creates a new quat initialized with values from an existing quaternion
             *
             * @param {quat} a quaternion to clone
             * @returns {quat} a new quaternion
             * @function
             */
            quat.clone = vec4.clone;

            /**
             * Creates a new quat initialized with the given values
             *
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @param {Number} w W component
             * @returns {quat} a new quaternion
             * @function
             */
            quat.fromValues = vec4.fromValues;

            /**
             * Copy the values from one quat to another
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the source quaternion
             * @returns {quat} out
             * @function
             */
            quat.copy = vec4.copy;

            /**
             * Set the components of a quat to the given values
             *
             * @param {quat} out the receiving quaternion
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @param {Number} w W component
             * @returns {quat} out
             * @function
             */
            quat.set = vec4.set;

            /**
             * Set a quat to the identity quaternion
             *
             * @param {quat} out the receiving quaternion
             * @returns {quat} out
             */
            quat.identity = function(out) {
                out[0] = 0;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                return out;
            };

            /**
             * Sets a quat from the given angle and rotation axis,
             * then returns it.
             *
             * @param {quat} out the receiving quaternion
             * @param {vec3} axis the axis around which to rotate
             * @param {Number} rad the angle in radians
             * @returns {quat} out
             **/
            quat.setAxisAngle = function(out, axis, rad) {
                rad = rad * 0.5;
                var s = Math.sin(rad);
                out[0] = s * axis[0];
                out[1] = s * axis[1];
                out[2] = s * axis[2];
                out[3] = Math.cos(rad);
                return out;
            };

            /**
             * Gets the rotation axis and angle for a given
             *  quaternion. If a quaternion is created with
             *  setAxisAngle, this method will return the same
             *  values as providied in the original parameter list
             *  OR functionally equivalent values.
             * Example: The quaternion formed by axis [0, 0, 1] and
             *  angle -90 is the same as the quaternion formed by
             *  [0, 0, 1] and 270. This method favors the latter.
             * @param  {vec3} out_axis  Vector receiving the axis of rotation
             * @param  {quat} q     Quaternion to be decomposed
             * @return {Number}     Angle, in radians, of the rotation
             */
            quat.getAxisAngle = function(out_axis, q) {
                var rad = Math.acos(q[3]) * 2.0;
                var s = Math.sin(rad / 2.0);
                if (s != 0.0) {
                    out_axis[0] = q[0] / s;
                    out_axis[1] = q[1] / s;
                    out_axis[2] = q[2] / s;
                } else {
                    // If s is zero, return any axis (no rotation - axis does not matter)
                    out_axis[0] = 1;
                    out_axis[1] = 0;
                    out_axis[2] = 0;
                }
                return rad;
            };

            /**
             * Adds two quat's
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @returns {quat} out
             * @function
             */
            quat.add = vec4.add;

            /**
             * Multiplies two quat's
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @returns {quat} out
             */
            quat.multiply = function(out, a, b) {
                var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                    bx = b[0], by = b[1], bz = b[2], bw = b[3];

                out[0] = ax * bw + aw * bx + ay * bz - az * by;
                out[1] = ay * bw + aw * by + az * bx - ax * bz;
                out[2] = az * bw + aw * bz + ax * by - ay * bx;
                out[3] = aw * bw - ax * bx - ay * by - az * bz;
                return out;
            };

            /**
             * Alias for {@link quat.multiply}
             * @function
             */
            quat.mul = quat.multiply;

            /**
             * Scales a quat by a scalar number
             *
             * @param {quat} out the receiving vector
             * @param {quat} a the vector to scale
             * @param {Number} b amount to scale the vector by
             * @returns {quat} out
             * @function
             */
            quat.scale = vec4.scale;

            /**
             * Rotates a quaternion by the given angle about the X axis
             *
             * @param {quat} out quat receiving operation result
             * @param {quat} a quat to rotate
             * @param {number} rad angle (in radians) to rotate
             * @returns {quat} out
             */
            quat.rotateX = function (out, a, rad) {
                rad *= 0.5;

                var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                    bx = Math.sin(rad), bw = Math.cos(rad);

                out[0] = ax * bw + aw * bx;
                out[1] = ay * bw + az * bx;
                out[2] = az * bw - ay * bx;
                out[3] = aw * bw - ax * bx;
                return out;
            };

            /**
             * Rotates a quaternion by the given angle about the Y axis
             *
             * @param {quat} out quat receiving operation result
             * @param {quat} a quat to rotate
             * @param {number} rad angle (in radians) to rotate
             * @returns {quat} out
             */
            quat.rotateY = function (out, a, rad) {
                rad *= 0.5;

                var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                    by = Math.sin(rad), bw = Math.cos(rad);

                out[0] = ax * bw - az * by;
                out[1] = ay * bw + aw * by;
                out[2] = az * bw + ax * by;
                out[3] = aw * bw - ay * by;
                return out;
            };

            /**
             * Rotates a quaternion by the given angle about the Z axis
             *
             * @param {quat} out quat receiving operation result
             * @param {quat} a quat to rotate
             * @param {number} rad angle (in radians) to rotate
             * @returns {quat} out
             */
            quat.rotateZ = function (out, a, rad) {
                rad *= 0.5;

                var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                    bz = Math.sin(rad), bw = Math.cos(rad);

                out[0] = ax * bw + ay * bz;
                out[1] = ay * bw - ax * bz;
                out[2] = az * bw + aw * bz;
                out[3] = aw * bw - az * bz;
                return out;
            };

            /**
             * Calculates the W component of a quat from the X, Y, and Z components.
             * Assumes that quaternion is 1 unit in length.
             * Any existing W component will be ignored.
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a quat to calculate W component of
             * @returns {quat} out
             */
            quat.calculateW = function (out, a) {
                var x = a[0], y = a[1], z = a[2];

                out[0] = x;
                out[1] = y;
                out[2] = z;
                out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
                return out;
            };

            /**
             * Calculates the dot product of two quat's
             *
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @returns {Number} dot product of a and b
             * @function
             */
            quat.dot = vec4.dot;

            /**
             * Performs a linear interpolation between two quat's
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {quat} out
             * @function
             */
            quat.lerp = vec4.lerp;

            /**
             * Performs a spherical linear interpolation between two quat
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {quat} out
             */
            quat.slerp = function (out, a, b, t) {
                // benchmarks:
                //    http://jsperf.com/quaternion-slerp-implementations

                var ax = a[0], ay = a[1], az = a[2], aw = a[3],
                    bx = b[0], by = b[1], bz = b[2], bw = b[3];

                var        omega, cosom, sinom, scale0, scale1;

                // calc cosine
                cosom = ax * bx + ay * by + az * bz + aw * bw;
                // adjust signs (if necessary)
                if ( cosom < 0.0 ) {
                    cosom = -cosom;
                    bx = - bx;
                    by = - by;
                    bz = - bz;
                    bw = - bw;
                }
                // calculate coefficients
                if ( (1.0 - cosom) > 0.000001 ) {
                    // standard case (slerp)
                    omega  = Math.acos(cosom);
                    sinom  = Math.sin(omega);
                    scale0 = Math.sin((1.0 - t) * omega) / sinom;
                    scale1 = Math.sin(t * omega) / sinom;
                } else {
                    // "from" and "to" quaternions are very close
                    //  ... so we can do a linear interpolation
                    scale0 = 1.0 - t;
                    scale1 = t;
                }
                // calculate final values
                out[0] = scale0 * ax + scale1 * bx;
                out[1] = scale0 * ay + scale1 * by;
                out[2] = scale0 * az + scale1 * bz;
                out[3] = scale0 * aw + scale1 * bw;

                return out;
            };

            /**
             * Performs a spherical linear interpolation with two control points
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a the first operand
             * @param {quat} b the second operand
             * @param {quat} c the third operand
             * @param {quat} d the fourth operand
             * @param {Number} t interpolation amount
             * @returns {quat} out
             */
            quat.sqlerp = (function () {
                var temp1 = quat.create();
                var temp2 = quat.create();

                return function (out, a, b, c, d, t) {
                    quat.slerp(temp1, a, d, t);
                    quat.slerp(temp2, b, c, t);
                    quat.slerp(out, temp1, temp2, 2 * t * (1 - t));

                    return out;
                };
            }());

            /**
             * Calculates the inverse of a quat
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a quat to calculate inverse of
             * @returns {quat} out
             */
            quat.invert = function(out, a) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
                    dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
                    invDot = dot ? 1.0/dot : 0;

                // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

                out[0] = -a0*invDot;
                out[1] = -a1*invDot;
                out[2] = -a2*invDot;
                out[3] = a3*invDot;
                return out;
            };

            /**
             * Calculates the conjugate of a quat
             * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a quat to calculate conjugate of
             * @returns {quat} out
             */
            quat.conjugate = function (out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                out[2] = -a[2];
                out[3] = a[3];
                return out;
            };

            /**
             * Calculates the length of a quat
             *
             * @param {quat} a vector to calculate length of
             * @returns {Number} length of a
             * @function
             */
            quat.length = vec4.length;

            /**
             * Alias for {@link quat.length}
             * @function
             */
            quat.len = quat.length;

            /**
             * Calculates the squared length of a quat
             *
             * @param {quat} a vector to calculate squared length of
             * @returns {Number} squared length of a
             * @function
             */
            quat.squaredLength = vec4.squaredLength;

            /**
             * Alias for {@link quat.squaredLength}
             * @function
             */
            quat.sqrLen = quat.squaredLength;

            /**
             * Normalize a quat
             *
             * @param {quat} out the receiving quaternion
             * @param {quat} a quaternion to normalize
             * @returns {quat} out
             * @function
             */
            quat.normalize = vec4.normalize;

            /**
             * Creates a quaternion from the given 3x3 rotation matrix.
             *
             * NOTE: The resultant quaternion is not normalized, so you should be sure
             * to renormalize the quaternion yourself where necessary.
             *
             * @param {quat} out the receiving quaternion
             * @param {mat3} m rotation matrix
             * @returns {quat} out
             * @function
             */
            quat.fromMat3 = function(out, m) {
                // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
                // article "Quaternion Calculus and Fast Animation".
                var fTrace = m[0] + m[4] + m[8];
                var fRoot;

                if ( fTrace > 0.0 ) {
                    // |w| > 1/2, may as well choose w > 1/2
                    fRoot = Math.sqrt(fTrace + 1.0);  // 2w
                    out[3] = 0.5 * fRoot;
                    fRoot = 0.5/fRoot;  // 1/(4w)
                    out[0] = (m[5]-m[7])*fRoot;
                    out[1] = (m[6]-m[2])*fRoot;
                    out[2] = (m[1]-m[3])*fRoot;
                } else {
                    // |w| <= 1/2
                    var i = 0;
                    if ( m[4] > m[0] )
                        i = 1;
                    if ( m[8] > m[i*3+i] )
                        i = 2;
                    var j = (i+1)%3;
                    var k = (i+2)%3;

                    fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
                    out[i] = 0.5 * fRoot;
                    fRoot = 0.5 / fRoot;
                    out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
                    out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
                    out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
                }

                return out;
            };

            /**
             * Returns a string representation of a quatenion
             *
             * @param {quat} a vector to represent as a string
             * @returns {String} string representation of the vector
             */
            quat.str = function (a) {
                return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
            };

            /**
             * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
             *
             * @param {quat} a The first quaternion.
             * @param {quat} b The second quaternion.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            quat.exactEquals = vec4.exactEquals;

            /**
             * Returns whether or not the quaternions have approximately the same elements in the same position.
             *
             * @param {quat} a The first vector.
             * @param {quat} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            quat.equals = vec4.equals;

            module.exports = quat;


            /***/ },
        /* 7 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 3 Dimensional Vector
             * @name vec3
             */
            var vec3 = {};

            /**
             * Creates a new, empty vec3
             *
             * @returns {vec3} a new 3D vector
             */
            vec3.create = function() {
                var out = new glMatrix.ARRAY_TYPE(3);
                out[0] = 0;
                out[1] = 0;
                out[2] = 0;
                return out;
            };

            /**
             * Creates a new vec3 initialized with values from an existing vector
             *
             * @param {vec3} a vector to clone
             * @returns {vec3} a new 3D vector
             */
            vec3.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(3);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                return out;
            };

            /**
             * Creates a new vec3 initialized with the given values
             *
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @returns {vec3} a new 3D vector
             */
            vec3.fromValues = function(x, y, z) {
                var out = new glMatrix.ARRAY_TYPE(3);
                out[0] = x;
                out[1] = y;
                out[2] = z;
                return out;
            };

            /**
             * Copy the values from one vec3 to another
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the source vector
             * @returns {vec3} out
             */
            vec3.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                return out;
            };

            /**
             * Set the components of a vec3 to the given values
             *
             * @param {vec3} out the receiving vector
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @returns {vec3} out
             */
            vec3.set = function(out, x, y, z) {
                out[0] = x;
                out[1] = y;
                out[2] = z;
                return out;
            };

            /**
             * Adds two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                return out;
            };

            /**
             * Subtracts vector b from vector a
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                return out;
            };

            /**
             * Alias for {@link vec3.subtract}
             * @function
             */
            vec3.sub = vec3.subtract;

            /**
             * Multiplies two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.multiply = function(out, a, b) {
                out[0] = a[0] * b[0];
                out[1] = a[1] * b[1];
                out[2] = a[2] * b[2];
                return out;
            };

            /**
             * Alias for {@link vec3.multiply}
             * @function
             */
            vec3.mul = vec3.multiply;

            /**
             * Divides two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.divide = function(out, a, b) {
                out[0] = a[0] / b[0];
                out[1] = a[1] / b[1];
                out[2] = a[2] / b[2];
                return out;
            };

            /**
             * Alias for {@link vec3.divide}
             * @function
             */
            vec3.div = vec3.divide;

            /**
             * Math.ceil the components of a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to ceil
             * @returns {vec3} out
             */
            vec3.ceil = function (out, a) {
                out[0] = Math.ceil(a[0]);
                out[1] = Math.ceil(a[1]);
                out[2] = Math.ceil(a[2]);
                return out;
            };

            /**
             * Math.floor the components of a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to floor
             * @returns {vec3} out
             */
            vec3.floor = function (out, a) {
                out[0] = Math.floor(a[0]);
                out[1] = Math.floor(a[1]);
                out[2] = Math.floor(a[2]);
                return out;
            };

            /**
             * Returns the minimum of two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.min = function(out, a, b) {
                out[0] = Math.min(a[0], b[0]);
                out[1] = Math.min(a[1], b[1]);
                out[2] = Math.min(a[2], b[2]);
                return out;
            };

            /**
             * Returns the maximum of two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.max = function(out, a, b) {
                out[0] = Math.max(a[0], b[0]);
                out[1] = Math.max(a[1], b[1]);
                out[2] = Math.max(a[2], b[2]);
                return out;
            };

            /**
             * Math.round the components of a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to round
             * @returns {vec3} out
             */
            vec3.round = function (out, a) {
                out[0] = Math.round(a[0]);
                out[1] = Math.round(a[1]);
                out[2] = Math.round(a[2]);
                return out;
            };

            /**
             * Scales a vec3 by a scalar number
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to scale
             * @param {Number} b amount to scale the vector by
             * @returns {vec3} out
             */
            vec3.scale = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                return out;
            };

            /**
             * Adds two vec3's after scaling the second operand by a scalar value
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @param {Number} scale the amount to scale b by before adding
             * @returns {vec3} out
             */
            vec3.scaleAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                return out;
            };

            /**
             * Calculates the euclidian distance between two vec3's
             *
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {Number} distance between a and b
             */
            vec3.distance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1],
                    z = b[2] - a[2];
                return Math.sqrt(x*x + y*y + z*z);
            };

            /**
             * Alias for {@link vec3.distance}
             * @function
             */
            vec3.dist = vec3.distance;

            /**
             * Calculates the squared euclidian distance between two vec3's
             *
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {Number} squared distance between a and b
             */
            vec3.squaredDistance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1],
                    z = b[2] - a[2];
                return x*x + y*y + z*z;
            };

            /**
             * Alias for {@link vec3.squaredDistance}
             * @function
             */
            vec3.sqrDist = vec3.squaredDistance;

            /**
             * Calculates the length of a vec3
             *
             * @param {vec3} a vector to calculate length of
             * @returns {Number} length of a
             */
            vec3.length = function (a) {
                var x = a[0],
                    y = a[1],
                    z = a[2];
                return Math.sqrt(x*x + y*y + z*z);
            };

            /**
             * Alias for {@link vec3.length}
             * @function
             */
            vec3.len = vec3.length;

            /**
             * Calculates the squared length of a vec3
             *
             * @param {vec3} a vector to calculate squared length of
             * @returns {Number} squared length of a
             */
            vec3.squaredLength = function (a) {
                var x = a[0],
                    y = a[1],
                    z = a[2];
                return x*x + y*y + z*z;
            };

            /**
             * Alias for {@link vec3.squaredLength}
             * @function
             */
            vec3.sqrLen = vec3.squaredLength;

            /**
             * Negates the components of a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to negate
             * @returns {vec3} out
             */
            vec3.negate = function(out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                out[2] = -a[2];
                return out;
            };

            /**
             * Returns the inverse of the components of a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to invert
             * @returns {vec3} out
             */
            vec3.inverse = function(out, a) {
                out[0] = 1.0 / a[0];
                out[1] = 1.0 / a[1];
                out[2] = 1.0 / a[2];
                return out;
            };

            /**
             * Normalize a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to normalize
             * @returns {vec3} out
             */
            vec3.normalize = function(out, a) {
                var x = a[0],
                    y = a[1],
                    z = a[2];
                var len = x*x + y*y + z*z;
                if (len > 0) {
                    //TODO: evaluate use of glm_invsqrt here?
                    len = 1 / Math.sqrt(len);
                    out[0] = a[0] * len;
                    out[1] = a[1] * len;
                    out[2] = a[2] * len;
                }
                return out;
            };

            /**
             * Calculates the dot product of two vec3's
             *
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {Number} dot product of a and b
             */
            vec3.dot = function (a, b) {
                return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            };

            /**
             * Computes the cross product of two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            vec3.cross = function(out, a, b) {
                var ax = a[0], ay = a[1], az = a[2],
                    bx = b[0], by = b[1], bz = b[2];

                out[0] = ay * bz - az * by;
                out[1] = az * bx - ax * bz;
                out[2] = ax * by - ay * bx;
                return out;
            };

            /**
             * Performs a linear interpolation between two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {vec3} out
             */
            vec3.lerp = function (out, a, b, t) {
                var ax = a[0],
                    ay = a[1],
                    az = a[2];
                out[0] = ax + t * (b[0] - ax);
                out[1] = ay + t * (b[1] - ay);
                out[2] = az + t * (b[2] - az);
                return out;
            };

            /**
             * Performs a hermite interpolation with two control points
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @param {vec3} c the third operand
             * @param {vec3} d the fourth operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {vec3} out
             */
            vec3.hermite = function (out, a, b, c, d, t) {
                var factorTimes2 = t * t,
                    factor1 = factorTimes2 * (2 * t - 3) + 1,
                    factor2 = factorTimes2 * (t - 2) + t,
                    factor3 = factorTimes2 * (t - 1),
                    factor4 = factorTimes2 * (3 - 2 * t);

                out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
                out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
                out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;

                return out;
            };

            /**
             * Performs a bezier interpolation with two control points
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @param {vec3} c the third operand
             * @param {vec3} d the fourth operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {vec3} out
             */
            vec3.bezier = function (out, a, b, c, d, t) {
                var inverseFactor = 1 - t,
                    inverseFactorTimesTwo = inverseFactor * inverseFactor,
                    factorTimes2 = t * t,
                    factor1 = inverseFactorTimesTwo * inverseFactor,
                    factor2 = 3 * t * inverseFactorTimesTwo,
                    factor3 = 3 * factorTimes2 * inverseFactor,
                    factor4 = factorTimes2 * t;

                out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
                out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
                out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;

                return out;
            };

            /**
             * Generates a random vector with the given scale
             *
             * @param {vec3} out the receiving vector
             * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
             * @returns {vec3} out
             */
            vec3.random = function (out, scale) {
                scale = scale || 1.0;

                var r = glMatrix.RANDOM() * 2.0 * Math.PI;
                var z = (glMatrix.RANDOM() * 2.0) - 1.0;
                var zScale = Math.sqrt(1.0-z*z) * scale;

                out[0] = Math.cos(r) * zScale;
                out[1] = Math.sin(r) * zScale;
                out[2] = z * scale;
                return out;
            };

            /**
             * Transforms the vec3 with a mat4.
             * 4th vector component is implicitly '1'
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to transform
             * @param {mat4} m matrix to transform with
             * @returns {vec3} out
             */
            vec3.transformMat4 = function(out, a, m) {
                var x = a[0], y = a[1], z = a[2],
                    w = m[3] * x + m[7] * y + m[11] * z + m[15];
                w = w || 1.0;
                out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
                out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
                out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
                return out;
            };

            /**
             * Transforms the vec3 with a mat3.
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to transform
             * @param {mat4} m the 3x3 matrix to transform with
             * @returns {vec3} out
             */
            vec3.transformMat3 = function(out, a, m) {
                var x = a[0], y = a[1], z = a[2];
                out[0] = x * m[0] + y * m[3] + z * m[6];
                out[1] = x * m[1] + y * m[4] + z * m[7];
                out[2] = x * m[2] + y * m[5] + z * m[8];
                return out;
            };

            /**
             * Transforms the vec3 with a quat
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to transform
             * @param {quat} q quaternion to transform with
             * @returns {vec3} out
             */
            vec3.transformQuat = function(out, a, q) {
                // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

                var x = a[0], y = a[1], z = a[2],
                    qx = q[0], qy = q[1], qz = q[2], qw = q[3],

                    // calculate quat * vec
                    ix = qw * x + qy * z - qz * y,
                    iy = qw * y + qz * x - qx * z,
                    iz = qw * z + qx * y - qy * x,
                    iw = -qx * x - qy * y - qz * z;

                // calculate result * inverse quat
                out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
                out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
                out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
                return out;
            };

            /**
             * Rotate a 3D vector around the x-axis
             * @param {vec3} out The receiving vec3
             * @param {vec3} a The vec3 point to rotate
             * @param {vec3} b The origin of the rotation
             * @param {Number} c The angle of rotation
             * @returns {vec3} out
             */
            vec3.rotateX = function(out, a, b, c){
                var p = [], r=[];
                //Translate point to the origin
                p[0] = a[0] - b[0];
                p[1] = a[1] - b[1];
                p[2] = a[2] - b[2];

                //perform rotation
                r[0] = p[0];
                r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
                r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

                //translate to correct position
                out[0] = r[0] + b[0];
                out[1] = r[1] + b[1];
                out[2] = r[2] + b[2];

                return out;
            };

            /**
             * Rotate a 3D vector around the y-axis
             * @param {vec3} out The receiving vec3
             * @param {vec3} a The vec3 point to rotate
             * @param {vec3} b The origin of the rotation
             * @param {Number} c The angle of rotation
             * @returns {vec3} out
             */
            vec3.rotateY = function(out, a, b, c){
                var p = [], r=[];
                //Translate point to the origin
                p[0] = a[0] - b[0];
                p[1] = a[1] - b[1];
                p[2] = a[2] - b[2];

                //perform rotation
                r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
                r[1] = p[1];
                r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);

                //translate to correct position
                out[0] = r[0] + b[0];
                out[1] = r[1] + b[1];
                out[2] = r[2] + b[2];

                return out;
            };

            /**
             * Rotate a 3D vector around the z-axis
             * @param {vec3} out The receiving vec3
             * @param {vec3} a The vec3 point to rotate
             * @param {vec3} b The origin of the rotation
             * @param {Number} c The angle of rotation
             * @returns {vec3} out
             */
            vec3.rotateZ = function(out, a, b, c){
                var p = [], r=[];
                //Translate point to the origin
                p[0] = a[0] - b[0];
                p[1] = a[1] - b[1];
                p[2] = a[2] - b[2];

                //perform rotation
                r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
                r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
                r[2] = p[2];

                //translate to correct position
                out[0] = r[0] + b[0];
                out[1] = r[1] + b[1];
                out[2] = r[2] + b[2];

                return out;
            };

            /**
             * Perform some operation over an array of vec3s.
             *
             * @param {Array} a the array of vectors to iterate over
             * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
             * @param {Number} offset Number of elements to skip at the beginning of the array
             * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
             * @param {Function} fn Function to call for each vector in the array
             * @param {Object} [arg] additional argument to pass to fn
             * @returns {Array} a
             * @function
             */
            vec3.forEach = (function() {
                var vec = vec3.create();

                return function(a, stride, offset, count, fn, arg) {
                    var i, l;
                    if(!stride) {
                        stride = 3;
                    }

                    if(!offset) {
                        offset = 0;
                    }

                    if(count) {
                        l = Math.min((count * stride) + offset, a.length);
                    } else {
                        l = a.length;
                    }

                    for(i = offset; i < l; i += stride) {
                        vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
                        fn(vec, vec, arg);
                        a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
                    }

                    return a;
                };
            })();

            /**
             * Get the angle between two 3D vectors
             * @param {vec3} a The first operand
             * @param {vec3} b The second operand
             * @returns {Number} The angle in radians
             */
            vec3.angle = function(a, b) {

                var tempA = vec3.fromValues(a[0], a[1], a[2]);
                var tempB = vec3.fromValues(b[0], b[1], b[2]);

                vec3.normalize(tempA, tempA);
                vec3.normalize(tempB, tempB);

                var cosine = vec3.dot(tempA, tempB);

                if(cosine > 1.0){
                    return 0;
                } else {
                    return Math.acos(cosine);
                }
            };

            /**
             * Returns a string representation of a vector
             *
             * @param {vec3} a vector to represent as a string
             * @returns {String} string representation of the vector
             */
            vec3.str = function (a) {
                return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
            };

            /**
             * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
             *
             * @param {vec3} a The first vector.
             * @param {vec3} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec3.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
            };

            /**
             * Returns whether or not the vectors have approximately the same elements in the same position.
             *
             * @param {vec3} a The first vector.
             * @param {vec3} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec3.equals = function (a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2];
                var b0 = b[0], b1 = b[1], b2 = b[2];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)));
            };

            module.exports = vec3;


            /***/ },
        /* 8 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 4 Dimensional Vector
             * @name vec4
             */
            var vec4 = {};

            /**
             * Creates a new, empty vec4
             *
             * @returns {vec4} a new 4D vector
             */
            vec4.create = function() {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = 0;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                return out;
            };

            /**
             * Creates a new vec4 initialized with values from an existing vector
             *
             * @param {vec4} a vector to clone
             * @returns {vec4} a new 4D vector
             */
            vec4.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                return out;
            };

            /**
             * Creates a new vec4 initialized with the given values
             *
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @param {Number} w W component
             * @returns {vec4} a new 4D vector
             */
            vec4.fromValues = function(x, y, z, w) {
                var out = new glMatrix.ARRAY_TYPE(4);
                out[0] = x;
                out[1] = y;
                out[2] = z;
                out[3] = w;
                return out;
            };

            /**
             * Copy the values from one vec4 to another
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the source vector
             * @returns {vec4} out
             */
            vec4.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                return out;
            };

            /**
             * Set the components of a vec4 to the given values
             *
             * @param {vec4} out the receiving vector
             * @param {Number} x X component
             * @param {Number} y Y component
             * @param {Number} z Z component
             * @param {Number} w W component
             * @returns {vec4} out
             */
            vec4.set = function(out, x, y, z, w) {
                out[0] = x;
                out[1] = y;
                out[2] = z;
                out[3] = w;
                return out;
            };

            /**
             * Adds two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                out[2] = a[2] + b[2];
                out[3] = a[3] + b[3];
                return out;
            };

            /**
             * Subtracts vector b from vector a
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                out[2] = a[2] - b[2];
                out[3] = a[3] - b[3];
                return out;
            };

            /**
             * Alias for {@link vec4.subtract}
             * @function
             */
            vec4.sub = vec4.subtract;

            /**
             * Multiplies two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.multiply = function(out, a, b) {
                out[0] = a[0] * b[0];
                out[1] = a[1] * b[1];
                out[2] = a[2] * b[2];
                out[3] = a[3] * b[3];
                return out;
            };

            /**
             * Alias for {@link vec4.multiply}
             * @function
             */
            vec4.mul = vec4.multiply;

            /**
             * Divides two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.divide = function(out, a, b) {
                out[0] = a[0] / b[0];
                out[1] = a[1] / b[1];
                out[2] = a[2] / b[2];
                out[3] = a[3] / b[3];
                return out;
            };

            /**
             * Alias for {@link vec4.divide}
             * @function
             */
            vec4.div = vec4.divide;

            /**
             * Math.ceil the components of a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to ceil
             * @returns {vec4} out
             */
            vec4.ceil = function (out, a) {
                out[0] = Math.ceil(a[0]);
                out[1] = Math.ceil(a[1]);
                out[2] = Math.ceil(a[2]);
                out[3] = Math.ceil(a[3]);
                return out;
            };

            /**
             * Math.floor the components of a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to floor
             * @returns {vec4} out
             */
            vec4.floor = function (out, a) {
                out[0] = Math.floor(a[0]);
                out[1] = Math.floor(a[1]);
                out[2] = Math.floor(a[2]);
                out[3] = Math.floor(a[3]);
                return out;
            };

            /**
             * Returns the minimum of two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.min = function(out, a, b) {
                out[0] = Math.min(a[0], b[0]);
                out[1] = Math.min(a[1], b[1]);
                out[2] = Math.min(a[2], b[2]);
                out[3] = Math.min(a[3], b[3]);
                return out;
            };

            /**
             * Returns the maximum of two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {vec4} out
             */
            vec4.max = function(out, a, b) {
                out[0] = Math.max(a[0], b[0]);
                out[1] = Math.max(a[1], b[1]);
                out[2] = Math.max(a[2], b[2]);
                out[3] = Math.max(a[3], b[3]);
                return out;
            };

            /**
             * Math.round the components of a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to round
             * @returns {vec4} out
             */
            vec4.round = function (out, a) {
                out[0] = Math.round(a[0]);
                out[1] = Math.round(a[1]);
                out[2] = Math.round(a[2]);
                out[3] = Math.round(a[3]);
                return out;
            };

            /**
             * Scales a vec4 by a scalar number
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the vector to scale
             * @param {Number} b amount to scale the vector by
             * @returns {vec4} out
             */
            vec4.scale = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                out[2] = a[2] * b;
                out[3] = a[3] * b;
                return out;
            };

            /**
             * Adds two vec4's after scaling the second operand by a scalar value
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @param {Number} scale the amount to scale b by before adding
             * @returns {vec4} out
             */
            vec4.scaleAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                out[2] = a[2] + (b[2] * scale);
                out[3] = a[3] + (b[3] * scale);
                return out;
            };

            /**
             * Calculates the euclidian distance between two vec4's
             *
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {Number} distance between a and b
             */
            vec4.distance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1],
                    z = b[2] - a[2],
                    w = b[3] - a[3];
                return Math.sqrt(x*x + y*y + z*z + w*w);
            };

            /**
             * Alias for {@link vec4.distance}
             * @function
             */
            vec4.dist = vec4.distance;

            /**
             * Calculates the squared euclidian distance between two vec4's
             *
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {Number} squared distance between a and b
             */
            vec4.squaredDistance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1],
                    z = b[2] - a[2],
                    w = b[3] - a[3];
                return x*x + y*y + z*z + w*w;
            };

            /**
             * Alias for {@link vec4.squaredDistance}
             * @function
             */
            vec4.sqrDist = vec4.squaredDistance;

            /**
             * Calculates the length of a vec4
             *
             * @param {vec4} a vector to calculate length of
             * @returns {Number} length of a
             */
            vec4.length = function (a) {
                var x = a[0],
                    y = a[1],
                    z = a[2],
                    w = a[3];
                return Math.sqrt(x*x + y*y + z*z + w*w);
            };

            /**
             * Alias for {@link vec4.length}
             * @function
             */
            vec4.len = vec4.length;

            /**
             * Calculates the squared length of a vec4
             *
             * @param {vec4} a vector to calculate squared length of
             * @returns {Number} squared length of a
             */
            vec4.squaredLength = function (a) {
                var x = a[0],
                    y = a[1],
                    z = a[2],
                    w = a[3];
                return x*x + y*y + z*z + w*w;
            };

            /**
             * Alias for {@link vec4.squaredLength}
             * @function
             */
            vec4.sqrLen = vec4.squaredLength;

            /**
             * Negates the components of a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to negate
             * @returns {vec4} out
             */
            vec4.negate = function(out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                out[2] = -a[2];
                out[3] = -a[3];
                return out;
            };

            /**
             * Returns the inverse of the components of a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to invert
             * @returns {vec4} out
             */
            vec4.inverse = function(out, a) {
                out[0] = 1.0 / a[0];
                out[1] = 1.0 / a[1];
                out[2] = 1.0 / a[2];
                out[3] = 1.0 / a[3];
                return out;
            };

            /**
             * Normalize a vec4
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a vector to normalize
             * @returns {vec4} out
             */
            vec4.normalize = function(out, a) {
                var x = a[0],
                    y = a[1],
                    z = a[2],
                    w = a[3];
                var len = x*x + y*y + z*z + w*w;
                if (len > 0) {
                    len = 1 / Math.sqrt(len);
                    out[0] = x * len;
                    out[1] = y * len;
                    out[2] = z * len;
                    out[3] = w * len;
                }
                return out;
            };

            /**
             * Calculates the dot product of two vec4's
             *
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @returns {Number} dot product of a and b
             */
            vec4.dot = function (a, b) {
                return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
            };

            /**
             * Performs a linear interpolation between two vec4's
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the first operand
             * @param {vec4} b the second operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {vec4} out
             */
            vec4.lerp = function (out, a, b, t) {
                var ax = a[0],
                    ay = a[1],
                    az = a[2],
                    aw = a[3];
                out[0] = ax + t * (b[0] - ax);
                out[1] = ay + t * (b[1] - ay);
                out[2] = az + t * (b[2] - az);
                out[3] = aw + t * (b[3] - aw);
                return out;
            };

            /**
             * Generates a random vector with the given scale
             *
             * @param {vec4} out the receiving vector
             * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
             * @returns {vec4} out
             */
            vec4.random = function (out, scale) {
                scale = scale || 1.0;

                //TODO: This is a pretty awful way of doing this. Find something better.
                out[0] = glMatrix.RANDOM();
                out[1] = glMatrix.RANDOM();
                out[2] = glMatrix.RANDOM();
                out[3] = glMatrix.RANDOM();
                vec4.normalize(out, out);
                vec4.scale(out, out, scale);
                return out;
            };

            /**
             * Transforms the vec4 with a mat4.
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the vector to transform
             * @param {mat4} m matrix to transform with
             * @returns {vec4} out
             */
            vec4.transformMat4 = function(out, a, m) {
                var x = a[0], y = a[1], z = a[2], w = a[3];
                out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
                out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
                out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
                out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
                return out;
            };

            /**
             * Transforms the vec4 with a quat
             *
             * @param {vec4} out the receiving vector
             * @param {vec4} a the vector to transform
             * @param {quat} q quaternion to transform with
             * @returns {vec4} out
             */
            vec4.transformQuat = function(out, a, q) {
                var x = a[0], y = a[1], z = a[2],
                    qx = q[0], qy = q[1], qz = q[2], qw = q[3],

                    // calculate quat * vec
                    ix = qw * x + qy * z - qz * y,
                    iy = qw * y + qz * x - qx * z,
                    iz = qw * z + qx * y - qy * x,
                    iw = -qx * x - qy * y - qz * z;

                // calculate result * inverse quat
                out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
                out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
                out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
                out[3] = a[3];
                return out;
            };

            /**
             * Perform some operation over an array of vec4s.
             *
             * @param {Array} a the array of vectors to iterate over
             * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
             * @param {Number} offset Number of elements to skip at the beginning of the array
             * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
             * @param {Function} fn Function to call for each vector in the array
             * @param {Object} [arg] additional argument to pass to fn
             * @returns {Array} a
             * @function
             */
            vec4.forEach = (function() {
                var vec = vec4.create();

                return function(a, stride, offset, count, fn, arg) {
                    var i, l;
                    if(!stride) {
                        stride = 4;
                    }

                    if(!offset) {
                        offset = 0;
                    }

                    if(count) {
                        l = Math.min((count * stride) + offset, a.length);
                    } else {
                        l = a.length;
                    }

                    for(i = offset; i < l; i += stride) {
                        vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
                        fn(vec, vec, arg);
                        a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
                    }

                    return a;
                };
            })();

            /**
             * Returns a string representation of a vector
             *
             * @param {vec4} a vector to represent as a string
             * @returns {String} string representation of the vector
             */
            vec4.str = function (a) {
                return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
            };

            /**
             * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
             *
             * @param {vec4} a The first vector.
             * @param {vec4} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec4.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
            };

            /**
             * Returns whether or not the vectors have approximately the same elements in the same position.
             *
             * @param {vec4} a The first vector.
             * @param {vec4} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec4.equals = function (a, b) {
                var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
                var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
                Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)));
            };

            module.exports = vec4;


            /***/ },
        /* 9 */
        /***/ function(module, exports, __webpack_require__) {

            /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

             Permission is hereby granted, free of charge, to any person obtaining a copy
             of this software and associated documentation files (the "Software"), to deal
             in the Software without restriction, including without limitation the rights
             to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
             copies of the Software, and to permit persons to whom the Software is
             furnished to do so, subject to the following conditions:

             The above copyright notice and this permission notice shall be included in
             all copies or substantial portions of the Software.

             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
             THE SOFTWARE. */

            var glMatrix = __webpack_require__(1);

            /**
             * @class 2 Dimensional Vector
             * @name vec2
             */
            var vec2 = {};

            /**
             * Creates a new, empty vec2
             *
             * @returns {vec2} a new 2D vector
             */
            vec2.create = function() {
                var out = new glMatrix.ARRAY_TYPE(2);
                out[0] = 0;
                out[1] = 0;
                return out;
            };

            /**
             * Creates a new vec2 initialized with values from an existing vector
             *
             * @param {vec2} a vector to clone
             * @returns {vec2} a new 2D vector
             */
            vec2.clone = function(a) {
                var out = new glMatrix.ARRAY_TYPE(2);
                out[0] = a[0];
                out[1] = a[1];
                return out;
            };

            /**
             * Creates a new vec2 initialized with the given values
             *
             * @param {Number} x X component
             * @param {Number} y Y component
             * @returns {vec2} a new 2D vector
             */
            vec2.fromValues = function(x, y) {
                var out = new glMatrix.ARRAY_TYPE(2);
                out[0] = x;
                out[1] = y;
                return out;
            };

            /**
             * Copy the values from one vec2 to another
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the source vector
             * @returns {vec2} out
             */
            vec2.copy = function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                return out;
            };

            /**
             * Set the components of a vec2 to the given values
             *
             * @param {vec2} out the receiving vector
             * @param {Number} x X component
             * @param {Number} y Y component
             * @returns {vec2} out
             */
            vec2.set = function(out, x, y) {
                out[0] = x;
                out[1] = y;
                return out;
            };

            /**
             * Adds two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.add = function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                return out;
            };

            /**
             * Subtracts vector b from vector a
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.subtract = function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                return out;
            };

            /**
             * Alias for {@link vec2.subtract}
             * @function
             */
            vec2.sub = vec2.subtract;

            /**
             * Multiplies two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.multiply = function(out, a, b) {
                out[0] = a[0] * b[0];
                out[1] = a[1] * b[1];
                return out;
            };

            /**
             * Alias for {@link vec2.multiply}
             * @function
             */
            vec2.mul = vec2.multiply;

            /**
             * Divides two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.divide = function(out, a, b) {
                out[0] = a[0] / b[0];
                out[1] = a[1] / b[1];
                return out;
            };

            /**
             * Alias for {@link vec2.divide}
             * @function
             */
            vec2.div = vec2.divide;

            /**
             * Math.ceil the components of a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to ceil
             * @returns {vec2} out
             */
            vec2.ceil = function (out, a) {
                out[0] = Math.ceil(a[0]);
                out[1] = Math.ceil(a[1]);
                return out;
            };

            /**
             * Math.floor the components of a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to floor
             * @returns {vec2} out
             */
            vec2.floor = function (out, a) {
                out[0] = Math.floor(a[0]);
                out[1] = Math.floor(a[1]);
                return out;
            };

            /**
             * Returns the minimum of two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.min = function(out, a, b) {
                out[0] = Math.min(a[0], b[0]);
                out[1] = Math.min(a[1], b[1]);
                return out;
            };

            /**
             * Returns the maximum of two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec2} out
             */
            vec2.max = function(out, a, b) {
                out[0] = Math.max(a[0], b[0]);
                out[1] = Math.max(a[1], b[1]);
                return out;
            };

            /**
             * Math.round the components of a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to round
             * @returns {vec2} out
             */
            vec2.round = function (out, a) {
                out[0] = Math.round(a[0]);
                out[1] = Math.round(a[1]);
                return out;
            };

            /**
             * Scales a vec2 by a scalar number
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the vector to scale
             * @param {Number} b amount to scale the vector by
             * @returns {vec2} out
             */
            vec2.scale = function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                return out;
            };

            /**
             * Adds two vec2's after scaling the second operand by a scalar value
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @param {Number} scale the amount to scale b by before adding
             * @returns {vec2} out
             */
            vec2.scaleAndAdd = function(out, a, b, scale) {
                out[0] = a[0] + (b[0] * scale);
                out[1] = a[1] + (b[1] * scale);
                return out;
            };

            /**
             * Calculates the euclidian distance between two vec2's
             *
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {Number} distance between a and b
             */
            vec2.distance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1];
                return Math.sqrt(x*x + y*y);
            };

            /**
             * Alias for {@link vec2.distance}
             * @function
             */
            vec2.dist = vec2.distance;

            /**
             * Calculates the squared euclidian distance between two vec2's
             *
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {Number} squared distance between a and b
             */
            vec2.squaredDistance = function(a, b) {
                var x = b[0] - a[0],
                    y = b[1] - a[1];
                return x*x + y*y;
            };

            /**
             * Alias for {@link vec2.squaredDistance}
             * @function
             */
            vec2.sqrDist = vec2.squaredDistance;

            /**
             * Calculates the length of a vec2
             *
             * @param {vec2} a vector to calculate length of
             * @returns {Number} length of a
             */
            vec2.length = function (a) {
                var x = a[0],
                    y = a[1];
                return Math.sqrt(x*x + y*y);
            };

            /**
             * Alias for {@link vec2.length}
             * @function
             */
            vec2.len = vec2.length;

            /**
             * Calculates the squared length of a vec2
             *
             * @param {vec2} a vector to calculate squared length of
             * @returns {Number} squared length of a
             */
            vec2.squaredLength = function (a) {
                var x = a[0],
                    y = a[1];
                return x*x + y*y;
            };

            /**
             * Alias for {@link vec2.squaredLength}
             * @function
             */
            vec2.sqrLen = vec2.squaredLength;

            /**
             * Negates the components of a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to negate
             * @returns {vec2} out
             */
            vec2.negate = function(out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                return out;
            };

            /**
             * Returns the inverse of the components of a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to invert
             * @returns {vec2} out
             */
            vec2.inverse = function(out, a) {
                out[0] = 1.0 / a[0];
                out[1] = 1.0 / a[1];
                return out;
            };

            /**
             * Normalize a vec2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a vector to normalize
             * @returns {vec2} out
             */
            vec2.normalize = function(out, a) {
                var x = a[0],
                    y = a[1];
                var len = x*x + y*y;
                if (len > 0) {
                    //TODO: evaluate use of glm_invsqrt here?
                    len = 1 / Math.sqrt(len);
                    out[0] = a[0] * len;
                    out[1] = a[1] * len;
                }
                return out;
            };

            /**
             * Calculates the dot product of two vec2's
             *
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {Number} dot product of a and b
             */
            vec2.dot = function (a, b) {
                return a[0] * b[0] + a[1] * b[1];
            };

            /**
             * Computes the cross product of two vec2's
             * Note that the cross product must by definition produce a 3D vector
             *
             * @param {vec3} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @returns {vec3} out
             */
            vec2.cross = function(out, a, b) {
                var z = a[0] * b[1] - a[1] * b[0];
                out[0] = out[1] = 0;
                out[2] = z;
                return out;
            };

            /**
             * Performs a linear interpolation between two vec2's
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the first operand
             * @param {vec2} b the second operand
             * @param {Number} t interpolation amount between the two inputs
             * @returns {vec2} out
             */
            vec2.lerp = function (out, a, b, t) {
                var ax = a[0],
                    ay = a[1];
                out[0] = ax + t * (b[0] - ax);
                out[1] = ay + t * (b[1] - ay);
                return out;
            };

            /**
             * Generates a random vector with the given scale
             *
             * @param {vec2} out the receiving vector
             * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
             * @returns {vec2} out
             */
            vec2.random = function (out, scale) {
                scale = scale || 1.0;
                var r = glMatrix.RANDOM() * 2.0 * Math.PI;
                out[0] = Math.cos(r) * scale;
                out[1] = Math.sin(r) * scale;
                return out;
            };

            /**
             * Transforms the vec2 with a mat2
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the vector to transform
             * @param {mat2} m matrix to transform with
             * @returns {vec2} out
             */
            vec2.transformMat2 = function(out, a, m) {
                var x = a[0],
                    y = a[1];
                out[0] = m[0] * x + m[2] * y;
                out[1] = m[1] * x + m[3] * y;
                return out;
            };

            /**
             * Transforms the vec2 with a mat2d
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the vector to transform
             * @param {mat2d} m matrix to transform with
             * @returns {vec2} out
             */
            vec2.transformMat2d = function(out, a, m) {
                var x = a[0],
                    y = a[1];
                out[0] = m[0] * x + m[2] * y + m[4];
                out[1] = m[1] * x + m[3] * y + m[5];
                return out;
            };

            /**
             * Transforms the vec2 with a mat3
             * 3rd vector component is implicitly '1'
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the vector to transform
             * @param {mat3} m matrix to transform with
             * @returns {vec2} out
             */
            vec2.transformMat3 = function(out, a, m) {
                var x = a[0],
                    y = a[1];
                out[0] = m[0] * x + m[3] * y + m[6];
                out[1] = m[1] * x + m[4] * y + m[7];
                return out;
            };

            /**
             * Transforms the vec2 with a mat4
             * 3rd vector component is implicitly '0'
             * 4th vector component is implicitly '1'
             *
             * @param {vec2} out the receiving vector
             * @param {vec2} a the vector to transform
             * @param {mat4} m matrix to transform with
             * @returns {vec2} out
             */
            vec2.transformMat4 = function(out, a, m) {
                var x = a[0],
                    y = a[1];
                out[0] = m[0] * x + m[4] * y + m[12];
                out[1] = m[1] * x + m[5] * y + m[13];
                return out;
            };

            /**
             * Perform some operation over an array of vec2s.
             *
             * @param {Array} a the array of vectors to iterate over
             * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
             * @param {Number} offset Number of elements to skip at the beginning of the array
             * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
             * @param {Function} fn Function to call for each vector in the array
             * @param {Object} [arg] additional argument to pass to fn
             * @returns {Array} a
             * @function
             */
            vec2.forEach = (function() {
                var vec = vec2.create();

                return function(a, stride, offset, count, fn, arg) {
                    var i, l;
                    if(!stride) {
                        stride = 2;
                    }

                    if(!offset) {
                        offset = 0;
                    }

                    if(count) {
                        l = Math.min((count * stride) + offset, a.length);
                    } else {
                        l = a.length;
                    }

                    for(i = offset; i < l; i += stride) {
                        vec[0] = a[i]; vec[1] = a[i+1];
                        fn(vec, vec, arg);
                        a[i] = vec[0]; a[i+1] = vec[1];
                    }

                    return a;
                };
            })();

            /**
             * Returns a string representation of a vector
             *
             * @param {vec2} a vector to represent as a string
             * @returns {String} string representation of the vector
             */
            vec2.str = function (a) {
                return 'vec2(' + a[0] + ', ' + a[1] + ')';
            };

            /**
             * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
             *
             * @param {vec2} a The first vector.
             * @param {vec2} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec2.exactEquals = function (a, b) {
                return a[0] === b[0] && a[1] === b[1];
            };

            /**
             * Returns whether or not the vectors have approximately the same elements in the same position.
             *
             * @param {vec2} a The first vector.
             * @param {vec2} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            vec2.equals = function (a, b) {
                var a0 = a[0], a1 = a[1];
                var b0 = b[0], b1 = b[1];
                return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)));
            };

            module.exports = vec2;


            /***/ }
        /******/ ])
});
;;/**
 * WebGL Utils class
 *
 * Some boilerplate code fetched from Gregg Tavares webgl utilities
 * http://webglfundamentals.org/webgl/resources/webgl-utils.js
 */
function WebGLUtils() {
    // private fields
    this._logger = new Logger(arguments.callee.name);
}

/**
 * Compiles a shader
 * @param gl
 * @param shaderSource
 * @param shaderType
 */
WebGLUtils.prototype._compileShader = function(gl, shaderSource, shaderType) {
    // Create the shader object
    var shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        // Something went wrong during compilation; get the error
        var lastError = gl.getShaderInfoLog(shader);

        this._logger.error("Error compiling shader '" + shader + "':" + lastError);

        gl.deleteShader(shader);

        return null;
    }

    return shader;
}

/**
 * Creates a program from 2 shaders.
 * @param gl
 * @param vertexShader
 * @param fragmentShader
 * @returns {WebGLProgram}
 */
WebGLUtils.prototype.createProgram = function (gl, vertexShader, fragmentShader) {
    // create a program.
    var program = gl.createProgram();

    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // link the program.
    gl.linkProgram(program);

    // Check if it linked.
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        this._logger.error("Program filed to link:" + gl.getProgramInfoLog(program));
        // TEST: gl.getError() has more info?
    }

    return program;
};

/**
 * Creates a shader from the script string
 * @param gl
 * @param script
 * @param shaderType
 * @returns {null}
 */
WebGLUtils.prototype.createShader = function (gl, script, shaderType) {
    // If we didn't pass in a type, use the 'type' from
    // the script tag.
    var glShaderType;
    if (shaderType === "vertex") {
        glShaderType = gl.VERTEX_SHADER;
    } else if (shaderType === "fragment") {
        glShaderType = gl.FRAGMENT_SHADER;
    } else if (!shaderType) {
        this._logger.warn("Shader type not set, discarding..");
        return null;
    }

    return this._compileShader(gl, script, glShaderType);
};

/**
 * Creates a shader from the content of a script tag
 * @param gl
 * @param scriptId
 * @param shaderType
 */
WebGLUtils.prototype.createShaderFromScript = function (gl, scriptId, shaderType) {
    // look up the script tag by id.
    var shaderScriptElem = document.getElementById(scriptId);
    if (!shaderScriptElem) {
        this._logger.warn("Unknown script target element, discarding..");
        return null;
    }

    // extract the contents of the script tag.
    this.createShader(gl, shaderScriptElem.text, shaderType);
};

/**
 * Creates a program based on both vertex and fragment given scripts
 * @param gl
 * @param vertexScript
 * @param fragmentScript
 */
WebGLUtils.prototype.createProgramFromScripts = function(gl, vertexScript, fragmentScript) {
    var vshader = this.createShader(gl, vertexScript, "vertex");
    var fshader = this.createShader(gl, fragmentScript, "fragment");

    if(isObjectAssigned(vshader) && isObjectAssigned(fshader)) {
        return this.createProgram(gl, vshader, fshader);
    } else {
        this._logger.warn("Could not create program because scripts could not be compiled, discarding..");
    }

    // clean up shaders
    gl.deleteShader(vshader);
    gl.deleteShader(fshader);

    return null;
};

/**
 * Creates a program based on both vertex and fragment given elements
 * @param gl
 * @param vertexScriptId
 * @param fragmentScriptId
 */
WebGLUtils.prototype.createProgramFromScriptElements = function(gl, vertexScriptId, fragmentScriptId) {
    var vshader = this.createShaderFromScript(gl, vertexScriptId, "vertex");
    var fshader = this.createShaderFromScript(gl, fragmentScriptId, "fragment");

    if(isObjectAssigned(vshader) && isObjectAssigned(fshader)) {
        return this.createProgram(gl, vshader, fshader);
    } else {
        this._logger.warn("Could not create program because scripts could not be compiled, discarding..");
    }

    // clean up shaders
    gl.deleteShader(vshader);
    gl.deleteShader(fshader);

    return null;
};

/* for simplicity sake, add a global instance of the webgl utils */
var glu = new WebGLUtils();

;/**
 * PrimitiveShader class
 * @depends shader.js
 */
function PrimitiveShader() {
    Shader.call(this,
        // inline-vertex shader:
        [
            'attribute vec2 aVertexPosition;',

            'uniform mat4 uMatrix;',
            'uniform mat4 uTransform;',
            'uniform float uPointSize;',

            'void main(void) {',
            '   gl_PointSize = uPointSize;',
            '   gl_Position = uMatrix * uTransform * vec4(aVertexPosition, 0.0, 1.0);',
            '}'
        ].join('\n'),
        // inline-fragment shader
        [
            'precision mediump float;',

            'uniform vec4 uColor;',

            'void main(void) {',
            '   gl_FragColor = uColor;',
            '}'
        ].join('\n'),
        // uniforms:
        {
            uMatrix: {type: 'mat4', value: mat4.create()},
            uTransform: {type: 'mat4', value: mat4.create()},
            uColor: [0.0, 0.0, 0.0, 1.0],
            uPointSize: 2
        },
        // attributes:
        {
            aVertexPosition: 0
        });
}

inheritsFrom(PrimitiveShader, Shader);