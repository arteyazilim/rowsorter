<!DOCTYPE HTML>
<html lang="en-US">
<head>
    <meta charset="UTF-8">
    <title>rowsorter.js - big table</title>
    <script type="text/javascript" src="../dist/RowSorter.js"></script>
</head>
<body>

<style>
table {width: 80%; font-size: 14px; font-family: tahoma, arial, sans-serif;}
table thead th {background-color: #ccc; padding: 5px 8px;}
table td {background-color: #ddd; padding: 5px 8px;}

table.sorting-table {cursor: move;}
table tr.sorting-row td {background-color: #8b8;}
table td.div {padding: 0;}
table td.div > div {background-color: #b88;line-height:2;}
</style>

<table class="sample_table">
    <thead>
        <tr>
            <th colspan="4">Big Table Sorting - 1000 Rows</th>
        </tr>
    </thead>
    <tbody>
    <?php
    for ($i = 0; $i < 1000; $i++):
    ?>
        <tr>
            <td>Row <?=$i?></td>
            <td>Sample Content <?=$i?></td>
            <td class="div"><div><div><span>Inner Elements <?=$i?></span></div></div></td>
            <td>Sample Content Sample Content Sample Content Sample Content Sample Content Sample Content Sample Content Sample Content</td>
        </tr>
    <?php endfor; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4"><button type="button" onclick="RowSorter.destroy('.sample_table');">Destroy RowSorter</button></td>
        </tr>
    </tfoot>
</table>

<script type="text/javascript">
RowSorter(".sample_table");
</script>

</body>
</html>
