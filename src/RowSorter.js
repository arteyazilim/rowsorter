(function(root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('RowSorter', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.RowSorter = factory();
    }
})(this, function() {
    'use strict';

    var $ = window.jQuery||false,
        arrProto = Array.prototype,
        touchSupport = !!('ontouchstart' in document),
        helperAttrName = 'data-rowsorter',
        defaults = {
            handler         : null,
            tbody           : true,
            tableClass      : 'sorting-table',
            dragClass       : 'sorting-row',
            stickTopRows    : 0,
            stickBottomRows : 0,
            onDragStart     : null,
            onDragEnd       : null,
            onDrop          : null
        };

    function RowSorter(table, opts)
    {
        if (!(this instanceof RowSorter)) {
            return new RowSorter(table, opts);
        }

        if (typeof table === 'string') {
            table = findTable(table);
        }

        if (is(table, 'table') === false) {
            throw new Error('Table not found.');
        }

        if (table[ helperAttrName ] instanceof RowSorter) {
            return table[ helperAttrName ];
        }

        this._options = extend(defaults, opts);
        this._table = table;
        this._tbody = table;
        this._rows = [];
        this._lastY = false;
        this._draggingRow = null;
        this._firstTouch = true;
        this._lastSort = null;
        this._ended = true;

        this._mousedown = bind(mousedown, this);
        this._mousemove = bind(mousemove, this);
        this._mouseup = bind(mouseup, this);

        this._touchstart = bind(touchstart, this);
        this._touchmove = bind(touchmove, this);
        this._touchend = bind(touchend, this);
        this._touchId = null;

        this._table[ helperAttrName ] = this;
        this.init();
    }

    RowSorter.prototype.init = function()
    {
        if (this._options.tbody) {
            var bodies = this._table.getElementsByTagName('tbody');
            if (bodies.length > 0) {
                this._tbody = bodies[0];
            }
        }

        // pre-check handlers
        if (typeof this._options.onDragStart !== 'function') {
            this._options.onDragStart = null;
        }

        if (typeof this._options.onDrop !== 'function') {
            this._options.onDrop = null;
        }

        if (typeof this._options.onDragEnd !== 'function') {
            this._options.onDragEnd = null;
        }

        if (typeof this._options.stickTopRows !== 'number' || this._options.stickTopRows < 0) {
            this._options.stickTopRows = 0;
        }

        if (typeof this._options.stickBottomRows !== 'number' || this._options.stickBottomRows < 0) {
            this._options.stickBottomRows = 0;
        }

        addEvent(this._table, 'mousedown', this._mousedown);
        addEvent(document, 'mouseup', this._mouseup);

        if (touchSupport) {
            addEvent(this._table, 'touchstart', this._touchstart);
            addEvent(this._table, 'touchend', this._touchend);
        }

        // if document has onselectstart event (old-ie)
        if ('onselectstart' in document) {
            var that = this;
            addEvent(document, 'selectstart', function(e) {
                var ev = e||window.event;
                // if dragging status is true
                if (that._draggingRow !== null) {
                    // prevent default
                    if (ev.preventDefault) {
                        ev.preventDefault();
                    } else {
                        ev.returnValue = false;
                    }
                    return false;
                }
            });
        }
    };

    function mousedown(ev)
    {
        ev = ev || window.event;
        if (this._start(ev.target || ev.srcElement, ev.clientY)) {
            if (ev.preventDefault) {
                ev.preventDefault();
            } else {
                ev.returnValue = false;
            }
            return false;
        }
        return true;
    }

    function touchstart(ev)
    {
        if (ev.touches.length === 1) {
            var touch = ev.touches[0],
                target = document.elementFromPoint(touch.clientX, touch.clientY);

            this._touchId = touch.identifier;
            if (this._start(target, touch.clientY)) {
                if (ev.preventDefault) {
                    ev.preventDefault();
                } else {
                    ev.returnValue = false;
                }
                return false;
            }
        }
        return true;
    }

    RowSorter.prototype._start = function(target, clientY)
    {
        if (this._draggingRow) {
            this._end();
        }

        // read rows
        this._rows = this._tbody.rows;
        if (this._rows.length < 2) {
            return false;
        }

        // if handler options is specified
        if (this._options.handler) {
            // find the handlers
            var handlers = qsa(this._table, this._options.handler);
            // check targeted element in handlers
            if (!handlers || inArray(handlers, target) === -1) {
                return false;
            }
        }

        // find the closest row element.
        var draggingRow = closest(target, 'tr');

        // find current index
        var current_index = rowIndex(this._tbody, draggingRow);

        if (
            // if not found any tr element or not valid
            current_index === -1 ||
            // if stickTopRows > 0 and active row is in top sticky rows
            (this._options.stickTopRows > 0 && current_index < this._options.stickTopRows) ||
            // if stickBottomRows > 0 and active row is in bottom sticky rows
            (this._options.stickBottomRows > 0 && current_index >= this._rows.length - this._options.stickBottomRows)
        ) {
            return false;
        }

        this._draggingRow = draggingRow;

        // add tableClass to table
        if (this._options.tableClass) {
            addClass(this._table, this._options.tableClass);
        }

        // add dragClass to active row
        if (this._options.dragClass) {
            addClass(this._draggingRow, this._options.dragClass);
        }

        // store current index as old index
        this._oldIndex = current_index;

        // call onDragStart
        if (this._options.onDragStart) {
            this._options.onDragStart(this._tbody, this._draggingRow, this._oldIndex);
        }

        // store last mouse position
        this._lastY = clientY;
        this._ended = false;

        // attach events
        addEvent(this._table, 'mousemove', this._mousemove);

        if (touchSupport) {
            addEvent(this._table, 'touchmove', this._touchmove);
        }

        return true;
    };

    function mousemove(ev)
    {
        ev = ev || window.event;
        this._move(ev.target || ev.srcElement, ev.clientY);
        return true;
    }

    function touchmove(ev)
    {
        if (ev.touches.length === 1) {
            var touch = ev.touches[0],
                target = document.elementFromPoint(touch.clientX, touch.clientY);

            if (this._touchId === touch.identifier) {
                this._move(target, touch.clientY);
            }
        }
        return true;
    }

    RowSorter.prototype._move = function(target, clientY)
    {
        // if there is not a draggingRow, kill the event.
        if (!this._draggingRow) {
            return;
        }

        // find direction by last stored position
        var direction = clientY > this._lastY ? 1 : (clientY < this._lastY ? -1 : 0);

        // if direction is not zero (when first mouse-drag, it can be zero)
        if (direction !== 0) {

            // search the hovered row
            var hoveredRow = closest(target, 'tr');

            // if found any row
            // and hovered row is not the dragging row
            // and the hovered row is valid
            if (hoveredRow && hoveredRow !== this._draggingRow && inArray(this._rows, hoveredRow) !== -1) {

                var move = true;
                if (this._options.stickTopRows > 0 || this._options.stickBottomRows > 0) {
                    // find new position
                    var new_index = rowIndex(this._tbody, hoveredRow);

                    if (
                        (this._options.stickTopRows > 0 && new_index < this._options.stickTopRows) ||
                        (this._options.stickBottomRows > 0 && new_index >= this._rows.length - this._options.stickBottomRows)
                    ) {
                        move = false;
                    }
                }

                // move row
                if (move) {
                    moveRow(this._draggingRow, hoveredRow, direction);
                }

                // store last mouse position
                this._lastY = clientY;
            }
        }
    };

    function mouseup()
    {
        this._end();
    }

    function touchend(ev)
    {
        if (ev.changedTouches.length > 0 && this._touchId === ev.changedTouches[0].identifier) {
            this._end();
        }
    }

    RowSorter.prototype._end = function()
    {
        // if there is not a draggingRow, kill the event.
        if (!this._draggingRow) {
            return true;
        }

        // remove table class
        if (this._options.tableClass) {
            removeClass(this._table, this._options.tableClass);
        }

        // remove draggingRow class
        if (this._options.dragClass) {
            removeClass(this._draggingRow, this._options.dragClass);
        }

        // find the dragging row's new index
        var new_index = rowIndex(this._tbody, this._draggingRow);

        // if new index is not the old index
        if (new_index !== this._oldIndex) {
            // backup previous sort operation
            var previous = this._lastSort;
            // store current sort operation and backup data
            this._lastSort = {
                previous: previous,
                newIndex: new_index,
                oldIndex: this._oldIndex
            };

            if (this._options.onDrop) {
                this._options.onDrop(this._tbody, this._draggingRow, new_index, this._oldIndex);
            }
        } else if (this._options.onDragEnd) {
            this._options.onDragEnd(this._tbody, this._draggingRow, this._oldIndex);
        }

        // remove stored active row
        this._draggingRow = null;
        this._lastY = false;
        this._touchId = null;
        this._ended = true;

        // attach events
        removeEvent(this._table, 'mousemove', this._mousemove);

        if (touchSupport) {
            removeEvent(this._table, 'touchmove', this._touchmove);
        }
    };

    // @deprecated
    // bad method name, use undo instead
    RowSorter.prototype.revert = function()
    {
        if (this._lastSort !== null) {
            var lastSort = this._lastSort,
                old_index = lastSort.oldIndex,
                new_index = lastSort.newIndex,
                rows = this._tbody.rows,
                max_index = rows.length - 1;

            if (rows.length > 1) {
                if (old_index < max_index) {
                    this._tbody.insertBefore(rows[ new_index ], rows[ old_index + (new_index > old_index ? 0 : 1) ]);
                } else {
                    this._tbody.appendChild(rows[ new_index ]);
                }
            }

            this._lastSort = lastSort.previous;
        }
    };

    RowSorter.prototype.undo = RowSorter.prototype.revert;

    RowSorter.prototype.destroy = function()
    {
        this._table[ helperAttrName ] = null;

        if (this._ended === false) {
            this._end();
        }

        removeEvent(this._table, 'mousedown', this._mousedown);
        removeEvent(document, 'mouseup', this._mouseup);

        if (touchSupport) {
            removeEvent(this._table, 'touchstart', this._touchstart);
            removeEvent(this._table, 'touchend', this._touchend);
        }
    };

    // not necessary
    /*
    RowSorter.get = function(table)
    {
        if (helperAttrName in table && table[ helperAttrName ] instanceof RowSorter) {
            return table[ helperAttrName ];
        }
        return null;
    };*/

    // @deprecated
    // bad method name, use undo instead
    RowSorter.revert = function(table, suppressError)
    {
        var sorter = getSorterObject(table);

        if (sorter === null && suppressError === false) {
            throw new Error('Table not found.');
        }

        if (sorter) {
            sorter.revert();
        }
    };

    RowSorter.undo = RowSorter.revert;

    RowSorter.destroy = function(table, suppressError)
    {
        var sorter = getSorterObject(table);

        if (sorter === null && suppressError === false) {
            throw new Error('Table not found.');
        }

        if (sorter) {
            sorter.destroy();
        }
    };

    /**
     * Returns RowSorter object by table element.
     *
     * @param  {Element}        table
     * @return {RowSorter|null}
     */
    function getSorterObject(table)
    {
        if (table instanceof RowSorter) {
            return table;
        }

        if (typeof table === 'string') {
            table = findTable(table);
        }

        if (is(table, 'table') && helperAttrName in table && table[ helperAttrName ] instanceof RowSorter) {
            return table[ helperAttrName ];
        }
        return null;
    }

    /**
     * Searchs table by specified query.
     *
     * @param  {string}     query
     * @return {mixed|null}
     */
    function findTable(query)
    {
        var elements = qsa(document, query);
        if (elements.length > 0 && is(elements[0], 'table')) {
            return elements[0];
        }
        return null;
    }

    /**
     * Is specified object an html element?
     *
     * @param  {object}  obj
     * @param  {string}  tag
     * @return {boolean}
     */
    function is(obj, tag)
    {
        return obj && typeof obj === 'object' &&
            'nodeName' in obj && obj.nodeName === tag.toUpperCase();
    }

    /**
     * Moves row by direction.
     *
     * @param {Element} row
     * @param {Element} reference
     * @param {Number}  direction
     */
    function moveRow(row, reference, direction)
    {
        var parent = row.parentNode;
        // 1 = down, -1 = up
        if (direction === 1) {
            if (reference.nextSibling) {
                parent.insertBefore(row, reference.nextSibling);
            } else {
                parent.appendChild(row);
            }
        } else if (direction === -1) {
            parent.insertBefore(row, reference);
        }
    }

    /**
     * Finds row index.
     *
     * @param  {Element} tbody
     * @param  {Element} row
     * @return {Number}
     */
    function rowIndex(tbody, row)
    {
        var rows = tbody.rows, length = rows.length, i = 0;
        for (; i < length; i++) {
            if (row === rows[ i ]) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Attachs an event to an element.
     *
     * @param {Element}  element
     * @param {string}   type
     * @param {Function} fn
     */
    function addEvent(obj, type, fn)
    {
        if (obj.attachEvent) {
            obj.attachEvent('on' + type, fn);
        } else {
            obj.addEventListener(type, fn, false);
        }
    }

    /**
     * Detachs an event from an element.
     *
     * @param {Element}  element
     * @param {string}   type
     * @param {Function} fn
     */
    function removeEvent(obj, type, fn)
    {
        if (obj.detachEvent) {
            obj.detachEvent('on' + type, fn);
        } else {
            obj.removeEventListener(type, fn, false);
        }
    }

    function trim(str)
    {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }

    /**
     * Checks an element has a class.
     *
     * @param  {Element} element
     * @param  {string}  cls
     * @return {boolean}
     */
    function hasClass(element, cls)
    {
        cls = trim(cls);
        if (cls === '') {
            return false;
        }

        if (cls.indexOf(' ') !== -1) {
            var classes = cls.replace(/\s+/g, ' ').split(' '),
                i = 0, len = classes.length;
            for (; i < len; i++) {
                if (hasClass(element, classes[ i ]) === false) {
                    return false;
                }
            }
            return true;
        }

        if (element.classList) {
            return !!element.classList.contains(cls);
        } else {
            return !!element.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
        }
    }

    /**
     * Adds a class name to an element.
     *
     * @param {Element} element
     * @param {string}  cls
     */
    function addClass(element, cls)
    {
        cls = trim(cls);
        if (cls === '') {
            return;
        }

        if (cls.indexOf(' ') !== -1) {
            var classes = cls.replace(/\s+/g, ' ').split(' '),
                i = 0, len = classes.length;
            for (; i < len; i++) {
                addClass(element, classes[ i ]);
            }
            return;
        }

        if (hasClass(element, cls) === false) {
            if (element.classList) {
                element.classList.add(cls);
            } else {
                element.className += ' ' + cls;
            }
        }
    }

    /**
     * Removes a class name from an element if exists.
     *
     * @param {Element} element
     * @param {string}  cls
     */
    function removeClass(element, cls)
    {
        cls = trim(cls);
        if (cls === '') {
            return;
        }

        if (cls.indexOf(' ') !== -1) {
            var classes = cls.replace(/\s+/g, ' ').split(' '),
                i = 0, len = classes.length;
            for (; i < len; i++) {
                removeClass(element, classes[ i ]);
            }
            return;
        }

        if (hasClass(element, cls)) {
            if (element.classList) {
                element.classList.remove(cls);
            } else {
                element.className = element.className.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)'), ' ');
            }
        }
    }

    function bind(fn, context)
    {
        if (Function.prototype.bind) {
            return fn.bind(context);
        }
        return function () {
            fn.apply(context, arrProto.slice.call(arguments));
        };
    }

    /**
     * Extends an object.
     *
     * @param  {Object} base Main Object
     * @param  {Object} from Extender Object
     * @return {Object}      New extended Object
     */
    function extend(base, from)
    {
        if ($) {
            return $.extend({}, base, from);
        }

        var obj = {}, key;
        for (key in base) {
            if (base.hasOwnProperty(key)) {
                obj[ key ] = base[ key ];
            }
        }

        if (from && '[object Object]' === Object.prototype.toString.call(from)) {
            for (key in from) {
                if (from.hasOwnProperty(key)) {
                    obj[ key ] = from[ key ];
                }
            }
        }
        return obj;
    }

    /**
     * Dom Query
     *
     * @param  {Element} element
     * @param  {string}  query
     * @return {Array}
     */
    function qsa(element, query)
    {
        if ($) {
            return $.makeArray($(element).find(query));
        }
        return element.querySelectorAll(query);
    }

    /**
     * Searchs up the closest element.
     *
     * @param  {Element} element
     * @param  {string}  tag
     * @return {Element|null}
     */
    function closest(element, tag)
    {
        var c = 1, max = 20, found = element;
        tag = tag.toLowerCase();
        while (found.tagName && found.tagName.toLowerCase() !== tag) {
            if (c > max || !found.parentNode) {
                return null;
            }
            found = found.parentNode;
            c++;
        }
        return found;
    }

    /**
     * Search in array
     *
     * @param  {Array}  arr
     * @param  {mixed}  search
     * @return {Number}
     */
    function inArray(arr, search)
    {
        if (arrProto.indexOf) {
            return arrProto.indexOf.call(arr, search);
        }

        for (var i = 0, len = arr.length; i < len; i++) {
            if (search === arr[ i ]) {
                return i;
            }
        }
        return -1;
    }

    // if jQuery, register plugin.
    if ($) {
        $.fn.extend({
            rowSorter: function(options) {
                var sorters = [];
                this.each(function(index, element) {
                    sorters.push(new RowSorter(element, options));
                });
                return sorters.length === 1 ? sorters[0] : sorters;
            }
        });
        $.rowSorter = {undo: RowSorter.undo, revert: RowSorter.revert, destroy: RowSorter.destroy};
    }

    return RowSorter;
});
