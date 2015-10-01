RowSorter.js
============
## Drag & drop row sorter plugin.
* Works on Touch devices.
* Supports IE8+ and all other modern browsers.
* No framework dependency (But registers itself as a jquery plugin if exists.)

### Install
    bower install rowsorter
```html
<script type="text/javascript" src="/path/dist/RowSorter.js"></script>
```

### Options:

    handler         : _string_ drag handler selector (default: null)
    tbody           : _boolean_ pass true if want to sort only tbody > tr. (default: true)
    tableClass      : _string_ adds this class name to table while rows are sorting (default: "sorting-table")
    dragClass       : _string_ dragging row's class name (default: "sorting-row").
    stickTopRows    : _number_ count of top sticky rows (default: 0),
    stickBottomRows : _number_ count of bottom sticky rows (default: 0),
    onDragStart     : _function_ (default: null)
    onDrop          : _function_ (default: null)

#### Using Event Handlers
```javascript
    onDragStart: function(tbody, row, old_index) {
        // finding the table
        var table = tbody.tagName === "TBODY" ? tbody.parentNode : tbody;

        // old_index is zero-based index of row in tbody (or table if tbody not exists)
        console.log(table, row, old_index);
    }

    // if new_index === old_index, this function won't be called.
    onDrop: function(tbody, row, new_index, old_index) {
        // finding the table
        var table = tbody.tagName === "TBODY" ? tbody.parentNode : tbody;

        // old_index is stored index of row in table/tbody before start the dragging.
        // new_index is index of row in table/tbody after the row has been dragged.
        console.log(table, row, new_index, old_index);
    }
```

### Sample Usages

* [Basic Usage][basic]
* [Custom Handler 1][handler1]
* [Custom Handler 2][handler2]
* [Sticky Top & Bottom][sticky]
* [jQuery Plugin][jquery]
* [Custom CSS][style]
* [Big Table][bigtable]
* [Mobile Sample][touchtest]

### File Sizes

Minified: ~7kb
Minified and gzipped: < 3kb

[basic]: http://borayazilim.com/projects/rowsorter/examples/basic.html
[handler1]: http://borayazilim.com/projects/rowsorter/examples/handler1.html
[handler2]: http://borayazilim.com/projects/rowsorter/examples/handler2.html
[sticky]: http://borayazilim.com/projects/rowsorter/examples/sticky.html
[jquery]: http://borayazilim.com/projects/rowsorter/examples/jquery.html
[style]: http://borayazilim.com/projects/rowsorter/examples/style.html
[bigtable]: http://borayazilim.com/projects/rowsorter/examples/big_table.php
[touchtest]: http://borayazilim.com/projects/rowsorter/examples/touch_test.html
