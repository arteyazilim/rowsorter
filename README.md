RowSorter.js
============
## Drag 'n drop row sorter plugin.
* Small size - 2kb minified (~6kb non-minified).
* Touch devices are supported.
* Supports IE8+ (not tested with ie7) and all other modern browsers.

## Options:
    handler          : drag handler selector (default: "tr")
    tableDragClass   : adds this class name to table while rows are sorting (default: "sorting-table")
    disabledRowClass : undraggable rows' class name for disabling the drag (default: "nodrag").
    dragClass        : dragging row's class name (default: "sorting-row").
    onDragStart      : (default: null)
    onDrop           : (default: null)

* onDragStart : Fires when started to drag. Takes 3 arguments as "tbody", "dragging_row" and "index".
* onDrop : Fires after row is dropped. Takes 4 arguments as "tbody", "dragging_row", "new_index" and "old_index".

## Sample Usages

[http://borayazilim.com/projects/rowsorter/samples/sample1.html]

[http://borayazilim.com/projects/rowsorter/samples/sample2.html]

[http://borayazilim.com/projects/rowsorter/samples/sample1.html]: http://borayazilim.com/projects/rowsorter/samples/sample1.html

[http://borayazilim.com/projects/rowsorter/samples/sample2.html]: http://borayazilim.com/projects/rowsorter/samples/sample2.html
