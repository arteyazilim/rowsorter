(function(window, $) {
    "use strict";

    var document    = $(window.document),
        touchDevice = !!('ontouchstart' in document[0].documentElement),
        downEvent   = touchDevice ? 'touchstart' : 'mousedown',
        upEvent     = touchDevice ? 'touchend'   : 'mouseup',
        onselect    = !!('onselectstart' in document[0].documentElement),
        dragging = false,
        defaultOptions = {
            handler          : "tr",
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
        var settings = $.extend(defaultOptions, options),
            tbody = null, rows = null, dragging_row = null,
            last_y = 0, old_index = 0;

        // get jquery object
        table = $(table);

        // is this a table element?
        if (table.is("table") === false) {
            throw new Error("Specified parameter is not a table.");
        }

        // get bodies
        tbody = table.find("tbody");

        // check, is there any body?
        if (tbody.length === 0) {
            return false;
        }

        // get first body
        tbody = tbody.eq(0);

        // add mouse down event to rows
        tbody.on(downEvent, settings.handler, downFunc);

        // mouse down event
        function downFunc(event)
        {
            // get rows
            rows = tbody.find("tr");

            // check, is there any rows?
            if (rows.length < 2) {
                return true;
            }

            dragging_row = $(this).closest("tr");

            if (dragging_row.length === 0) {
                //throw new Error("Row not found by specified handler.");
                return true;
            }

            if (dragging_row.hasClass(settings.disabledRowClass)) {
                return true;
            }

            dragging = true;
            old_index = rows.index(dragging_row[0]);

            // add dragClass to dragging row
            settings.dragClass && dragging_row.addClass(settings.dragClass);
            // add tableDragClass to table while dragging
            settings.tableDragClass && table.addClass(settings.tableDragClass);

            if (typeof settings.onDragStart === "function") {
                settings.onDragStart(tbody[0], dragging_row[0], old_index);
            }

            if (touchDevice) {
                last_y = parseInt(event.originalEvent.touches[0].pageY, 10);
            } else {
                last_y = parseInt(event.pageY, 10);
            }

            if (touchDevice) {
                document.on("touchmove", touchMoveFunc);
            } else {
                rows.not(dragging_row[0]).on("mousemove", moveFunc);
            }
            document.on(upEvent, upFunc);

            event.preventDefault();
            return false;
        }

        function touchMoveFunc(event)
        {
            var touch = event.originalEvent.touches[0],
                target = document[0].elementFromPoint(touch.clientX, touch.clientY);

            if (!target) {
                return true;
            }

            target = $(target).closest("tr");

            if (target && target[0] !== dragging_row[0] && target[0].parentNode === tbody[0]) {
                moveFuncCore(target, touch.pageY);
            }
        }

        // mouse move event
        function moveFunc(event)
        {
            moveFuncCore(this, event.pageY);
        }

        function moveFuncCore(element, current_y)
        {
            element = $(element);

            if (current_y > last_y && element.nextSibling !== dragging_row[0]) {
                element.after(dragging_row[0]);
            } else if (current_y <= last_y && element.previousSibling !== dragging_row[0]) {
                element.before(dragging_row[0]);
            }
            // update last position
            last_y = current_y;
        }

        // fires on mouse up on document
        function upFunc()
        {
            var index;

            // remove move event from all rows
            if (touchDevice) {
                document.off("touchmove", touchMoveFunc);
            } else {
                rows.off("mousemove", moveFunc);
            }

            // remove up event from document
            document.off(upEvent, upFunc);
            // remove class from sorted row
            settings.dragClass && dragging_row.removeClass(settings.dragClass);
            // remove tableDragClass to table while dragging
            settings.tableDragClass && table.removeClass(settings.tableDragClass);

            index = tbody.find("tr").index(dragging_row[0]);

            if (index !== old_index) {
                if (typeof settings.onDrop === "function") {
                    settings.onDrop(tbody[0], dragging_row[0], index, old_index);
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
