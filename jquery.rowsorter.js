(function(window, $) {
    "use strict";

    var document    = $(window.document),
        touchDevice = !!('ontouchstart' in document[0].documentElement),
        downEvent   = touchDevice ? 'touchstart' : 'mousedown',
        upEvent     = touchDevice ? 'touchend'   : 'mouseup',
        onselect    = !!('onselectstart' in document[0].documentElement),
        dragging = false,
        defaultOptions = {
            handler          : "tbody > tr",
            tableDragClass   : "sorting-table",
            disabledRowClass : "nodrag",
            dragClass        : "sorting-row",
            onDragStart      : null,
            onDrop           : null
        };

    if (onselect) {
        document[0].onselectstart = function() {
            if (dragging) {
                return false;
            }
        };
    }

    function RowSorter(table, options)
    {
        var settings = $.extend({}, defaultOptions, options),
            tbody = null, rows = null, dragging_row = null,
            last_y = 0, old_index = 0;

        // get jquery object
        table = $(table);

        // is this a table element?
        if (table.is("table") === false) {
            throw new Error("Specified parameter is not a table.");
        }

        // if row sorter didn't attached previously
        if (table.data("row-sorter-attached") !== true) {
            // add mouse down event handler on table
            table.on(downEvent, settings.handler, downFunc);
            table.data("row-sorter-attached", true);
        }

        // mouse down event
        function downFunc(event)
        {
            // get body if exist, otherwise use table as tbody
            tbody = table.find("tbody");
            tbody = tbody.length > 0 ? tbody : table;

            // get all rows of body
            rows = tbody.find("tr");

            // we need two rows at least.
            if (rows.length < 2) {
                return true;
            }

            // if handler is not "tr", search-up for closest tr element.
            dragging_row = $(this).closest("tr");

            // if we couldn't find any rows, kill the event.
            if (dragging_row.length === 0) {
                return true;
            }

            // if found row has disabled class, kill the event.
            if (dragging_row.hasClass(settings.disabledRowClass)) {
                return true;
            }

            // OK, if we are here, there is no problema
            dragging = true;

            // store index while we have started to drag.
            old_index = rows.index(dragging_row[0]);

            // add dragClass to dragging row
            if (settings.dragClass) {
                dragging_row.addClass(settings.dragClass);
            }

            // add tableDragClass to table while dragging
            if (settings.tableDragClass) {
                table.addClass(settings.tableDragClass);
            }

            // call the drag start function
            if (typeof settings.onDragStart === "function") {
                settings.onDragStart(tbody[0], dragging_row[0], old_index);
            }

            // store the current Y coordinate, then attach function to move event.
            if (touchDevice) {
                last_y = parseInt(event.originalEvent.touches[0].pageY, 10);
                // on touch devices, we can't catch finger-move event on any element.
                // so we need to find the element by coordinates.
                document.on("touchmove", touchMoveFunc);
            } else {
                last_y = parseInt(event.pageY, 10);
                rows.not(dragging_row[0]).on("mousemove", moveFunc);
            }

            // on mouse/touch up clear the actions
            document.on(upEvent, upFunc);

            event.preventDefault();
            return false;
        }

        // finds element by touch position
        function touchMoveFunc(event)
        {
            // get the element by touch-coordinates.
            var touch = event.originalEvent.touches[0],
                target = document[0].elementFromPoint(touch.clientX, touch.clientY);

            // if we can't find any element, fall back.
            // this is impossible, but i'm not sure.
            if (!target) {
                return true;
            }

            // search upward for find the row.
            target = $(target).closest("tr");

            // if found any row and row isn't dragging_row and row's parent is current table.
            if (target && target[0] !== dragging_row[0] && target[0].parentNode === tbody[0]) {
                // run the move function
                moveFuncCore(target[0], touch.pageY);
            }
        }

        // mouse move event
        function moveFunc(event)
        {
            moveFuncCore(this, event.pageY);
        }

        function moveFuncCore(element, current_y)
        {
            // if mouse moving to downward and focused element's next sibling is not the dragging row
            if (current_y > last_y && element.nextSibling !== dragging_row[0]) {

                // if current row is not the last child of whole table
                if (element.nextSibling) {
                    tbody[0].insertBefore(dragging_row[0], element.nextSibling);
                } else {
                    tbody[0].appendChild(dragging_row[0]);
                }

            // if mouse moving to upward and focused element's prev sibling is not the dragging row
            } else if (current_y <= last_y && element.previousSibling !== dragging_row[0]) {
                tbody[0].insertBefore(dragging_row[0], element);
            }

            // update last position
            last_y = current_y;
        }

        // fires on mouse up on document
        function upFunc()
        {
            var new_index;

            // remove move event from all rows
            if (touchDevice) {
                document.off("touchmove", touchMoveFunc);
            } else {
                rows.off("mousemove", moveFunc);
            }

            // remove up event from document
            document.off(upEvent, upFunc);

            // remove class from sorted row
            if (settings.dragClass) {
                dragging_row.removeClass(settings.dragClass);
            }

            // remove tableDragClass to table while dragging
            if (settings.tableDragClass) {
                table.removeClass(settings.tableDragClass);
            }

            new_index = tbody.find("tr").index(dragging_row[0]);

            if (new_index !== old_index) {
                if (typeof settings.onDrop === "function") {
                    settings.onDrop(tbody[0], dragging_row[0], new_index, old_index);
                }
            }

            // resetting some variables
            dragging_row = null;
            dragging = false;
            old_index = 0;
        }
    }

    $.fn.extend({
        rowSorter: function(options) {
            this.each(function(index, element) {
                RowSorter(element, options);
            });
        }
    });

})(this, this.jQuery);
