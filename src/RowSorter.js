(function(root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('RowSorter', factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        root.RowSorter = factory();
    }
})(this, function() {
    'use strict';

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
    if (!String.prototype.trim) {
        String.prototype.trim = function()
        {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
    }

    var $ = window.jQuery||false,
        isTouchDevice = !!('ontouchstart' in document),
        helperAttrName = 'data-rowsorter',
        dragging = false,
        defaults = {
            handler         : null,
            tbody           : true,
            tableClass      : 'sorting-table',
            dragClass       : 'sorting-row',
            stickTopRows    : 0,
            stickBottomRows : 0,
            onDragStart     : null,
            onDrop          : null
        };

    // if document has onselectstart event (old-ie)
    if ('onselectstart' in document) {
        document.onselectstart = function() {
            // if dragging status is true
            if (dragging) {
                // prevent default
                return false;
            }
        };
    }

    function RowSorter(table, opts)
    {
        var helper;

        // if opts is false
        if (opts === false) {
            if (table[ helperAttrName ]) {
                if (typeof table[ helperAttrName ] === 'object') {

                    // get the helper.
                    helper = table[ helperAttrName ];

                    // detach events
                    if (helper.events && typeof helper.events === 'object') {
                        helper.events.mousedown && removeEvent(table, 'mousedown', helper.events.mousedown);
                        helper.events.touchstart && removeEvent(table, 'touchstart', helper.events.touchstart);
                    }
                }
                delete table[ helperAttrName ];
            }
            return;
        }

        // if row sorter attached previously
        if (table[ helperAttrName ]) {
            //RowSorter(table, false);
            return;
        }

        // helper for storing event.
        helper = {events: {}};

        // store helper object.
        table[ helperAttrName ] = helper;

        // extend default options
        var options = extend(defaults, opts),
            tbody = table, rows,
            draggingRow = null,
            lastY, old_index = 0;

        if (options.tbody) {
            var bodies = table.getElementsByTagName('TBODY');
            if (bodies.length > 0) {
                tbody = bodies[0];
            }
        }

        // attach mousedown event
        addEvent(table, 'mousedown', onStart);
        helper.events.mousedown = onStart;
        if (isTouchDevice) {
            addEvent(table, 'touchstart', onStart);
            helper.events.touchstart = onStart;
        }

        // pre-check handlers
        if (typeof options.onDragStart !== 'function') {
            options.onDragStart = null;
        }

        if (typeof options.onDrop !== 'function') {
            options.onDrop = null;
        }

        if (typeof options.stickTopRows !== 'number' || options.stickTopRows < 0) {
            options.stickTopRows = 0;
        }

        if (typeof options.stickBottomRows !== 'number' || options.stickBottomRows < 0) {
            options.stickBottomRows = 0;
        }

        function onStart(e)
        {
            // handle event for old-ie
            var ev = e||window.event;

            rows = tbody.rows;
            if (rows.length < 2) {
                return true;
            }

            var target, clientY;
            if (ev.touches) {
                if (ev.touches.length === 0) {
                    return true;
                }
                var touch = ev.touches[0];
                target = document.elementFromPoint(touch.clientX, touch.clientY);
                clientY = touch.clientY;
                if (!target) {
                    return true;
                }
            } else {
                target = ev.target||ev.srcElement;
                clientY = ev.clientY;
            }

            // if handler options is specified
            if (options.handler) {
                // find the handlers
                var handlers = qsa(table, options.handler);
                // check targeted element in handlers
                if (inArray(target, handlers) === false) {
                    return true;
                }
            }

            // find the closest row element.
            draggingRow = closest(target, 'tr');

            // find current index
            var current_index = rowIndex(tbody, draggingRow);

            if (
                // if not found any tr element
                draggingRow === null ||
                // if active row is not valid
                inArray(draggingRow, rows) === false ||
                // if stickTopRows > 0 and active row is in top sticky rows
                (options.stickTopRows > 0 && current_index < options.stickTopRows) ||
                // if stickBottomRows > 0 and active row is in bottom sticky rows
                (options.stickBottomRows > 0 && current_index >= rows.length - options.stickBottomRows)
            ) {
                draggingRow = null;
                return true;
            }

            // add tableClass to table
            if (options.tableClass) {
                addClass(table, options.tableClass);
            }

            // add dragClass to active row
            if (options.dragClass) {
                addClass(draggingRow, options.dragClass);
            }

            // store current index as old index
            old_index = current_index;

            // call onDragStart
            if (options.onDragStart) {
                options.onDragStart(tbody, draggingRow, old_index);
            }

            // store last mouse position
            lastY = clientY;

            // attach events
            addEvent(table, 'mousemove', onMove);
            addEvent(document, 'mouseup', onEnd);

            // attach touch move event
            if (isTouchDevice) {
                addEvent(document, 'touchend', onEnd);
                addEvent(table, 'touchmove', onMove);
            }

            if (ev.preventDefault) {
                ev.preventDefault();
            } else {
                ev.returnValue = false;
            }
            return false;
        }

        function onMove(e)
        {
            // handle event for old-ie
            var ev = e||window.event;

            // if there is not a draggingRow, kill the event.
            if (!draggingRow) {
                return true;
            }

            var target, clientY;
            if (ev.touches) {
                if (ev.touches.length === 0) {
                    return true;
                }
                var touch = ev.touches[0];
                target = document.elementFromPoint(touch.clientX, touch.clientY);
                clientY = touch.clientY;
                if (!target) {
                    return true;
                }
            } else {
                target = ev.target||ev.srcElement;
                clientY = ev.clientY;
            }

            // store dragging status as true
            dragging = true;

            // find direction by last stored position
            var direction = clientY > lastY ? 1 : (clientY < lastY ? -1 : 0);

            // if direction is not zero (when first mouse-drag, this can be zero)
            if (direction !== 0) {

                // search the hovered row
                var hoveredRow = closest(target, 'tr');

                // if found any row
                // and hovered row is not the dragging row
                // and the hovered row is valid
                if (hoveredRow && hoveredRow !== draggingRow && inArray(hoveredRow, rows)) {

                    var move = true;
                    if (options.stickTopRows > 0 || options.stickBottomRows > 0) {
                        // find new position
                        var new_index = rowIndex(tbody, hoveredRow);

                        if (
                            (options.stickTopRows > 0 && new_index < options.stickTopRows) ||
                            (options.stickBottomRows > 0 && new_index >= rows.length - options.stickBottomRows)
                        ) {
                            move = false;
                        }
                    }

                    // move row
                    move && moveRow(draggingRow, hoveredRow, direction);

                    // store last mouse position
                    lastY = clientY;
                }
            }
        }

        function onEnd(e)
        {
            // store dragging status as true
            dragging = false;

            // if there is not a draggingRow, kill the event.
            if (!draggingRow) {
                return true;
            }

            // remove table class
            if (options.tableClass) {
                removeClass(table, options.tableClass);
            }

            // remove draggingRow class
            if (options.dragClass) {
                removeClass(draggingRow, options.dragClass);
            }

            // find the dragging row's new index
            var new_index = rowIndex(tbody, draggingRow);

            // if new index is not the old index
            if (options.onDrop && new_index !== old_index) {
                options.onDrop(tbody, draggingRow, new_index, old_index);
            }

            // remove stored active row
            draggingRow = null;

            // detach events
            removeEvent(table, 'mousemove', onMove);
            removeEvent(document, 'mouseup', onEnd);
            if (isTouchDevice) {
                removeEvent(table, 'touchmove', onMove);
                removeEvent(document, 'touchend', onEnd);
            }
        }
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
     * Adds a new event handler.
     *
     * @param {Element}  element
     * @param {string}   name
     * @param {Function} fn
     */
    function addEvent(element, name, fn)
    {
        if (element.addEventListener) {
            element.addEventListener(name, fn, true);
        } else if(element.attachEvent) {
            element.attachEvent('on' + name, fn);
        }
    }

    /**
     * Removes an event handler.
     *
     * @param {Element}  element
     * @param {string}   name
     * @param {Function} fn
     */
    function removeEvent(element, name, fn)
    {
        if (element.removeEventListener) {
            element.removeEventListener(name, fn, true);
        } else if(element.detachEvent) {
            element.detachEvent('on' + name, fn);
        }
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
        cls = cls.trim();
        if (cls === '') {
            return false;
        }

        if (cls.indexOf(' ') !== -1) {
            var classes = cls.split(' '),
                i = 0, len = classes.length;
            for (; i < len; i++) {
                if (hasClass(element, classes[ i ]) == false) {
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
        cls = cls.trim();
        if (cls.indexOf(' ') !== -1) {
            var classes = cls.split(' '),
                i = 0, len = classes.length;
            for (; i < len; i++) {
                addClass(element, classes[ i ]);
            }
            return;
        }

        if (hasClass(element, cls) == false) {
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
        cls = cls.trim();
        if (cls.indexOf(' ') !== -1) {
            var classes = cls.split(' '),
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
                var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                element.className = element.className.replace(reg, ' ');
            }
        }
    }

    /**
     * Extends an abject.
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

        if ('[object Object]' === Object.prototype.toString.call(from)) {
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
        var i = 0, max = 100, found = element;
        tag = tag.toLowerCase();
        while (found.tagName && found.tagName.toLowerCase() !== tag) {
            found = found.parentNode;
            i++;
            if (i > max) {
                return null;
            }
        }
        return found;
    }

    /**
     * Search in array
     *
     * @param  {mixed} search
     * @param  {Array} arr
     * @return {Boolean}
     */
    function inArray(search, arr)
    {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (search === arr[ i ]) {
                return true;
            }
        }
        return false;
    }

    // if jQuery, register plugin.
    if ($) {
        $.fn.extend({
            rowSorter: function(options) {
                this.each(function(index, element) {
                    RowSorter(element, options);
                });
            }
        });
    }

    return RowSorter;
});
