/// <reference path="jquery-1.7.1.js" />
var txtInput;
var txtResult;


function initialize()
{
    $("#inputFile").change(function (event) {
        // grab the first image in the FileList object and pass it to the function
        openFile(event);
    });
}

function canvasX(fileWidth, fileMinX, canvasWidth, x) {
    return (canvasWidth * ((x - fileMinX) / fileWidth));
}

function canvasY(fileHeight, fileMinY, canvasHeight, y) {
    return (canvasHeight - canvasHeight * ((y - fileMinY) / fileHeight));
}


function shapeFileType(typ) {
    var answer;
    switch (typ) {
        case 0:
            answer = "Null shape";
            break;
        case 1:
            answer = "Point";
            break;
        case 3:
            answer = "PolyLine";
            break;
        case 5:
            answer = "Polygon";
            break;
        case 8:
            answer = "Multipoint";
            break;
        case 11:
            answer = "PointZ";
            break;
        case 13:
            answer = "PolyLineZ";
            break;
        case 15:
            answer = "PolygonZ";
            break;
        case 18:
            answer = "MultipointZ";
            break;
        case 21:
            answer = "PointM";
            break;
        case 23:
            answer = "PolyLineM";
            break;
        case 25:
            answer = "PolygonM";
            break;
        case 28:
            answer = "MultiPointM";
            break;
        case 31:
            answer = "MultiPatch";
            break;
        default:
            answer = "unknown";
            break;
    }
    return answer;
}

function redraw(dataView)
{
    var startTime = Date.now();
    var fileMinX, fileMinY, fileMaxX, fileMaxY, fileMinZ, fileMaxZ;
    var fileLength, buf, fileShapeType;
    var recordContentLength, recordNumber, recordShapeType, recordMinX, recordMinY, recordMaxX, recordMaxY;
    var recordNumPoints, recordNumParts;
    var fileHeight, fileWidth;
    var recordParts;
    var pa, po;
    var pointX, pointY;
    var c = document.getElementById("canvas1");
    var ctx = c.getContext("2d");
    var canvasWidth, canvasHeight;
    var canvasX1, canvasY1, canvasX2, canvasY2;
    var minHorizontalGrid, maxHorizontalGrid, minVerticalGrid, maxVerticalGrid;
    var g, gridX, gridY, gridInterval;
    var border = 15;
    
    $("#fileProperties").empty();
    $("#recordProperties").empty();
    $("#performanceProperties").empty();
    $("#fileProperties").append("<b>File Data</b><br/>");
    $("#recordProperties").append("<b>Record Data</b><br/>");
    $("#performanceProperties").append("<b>Performance Data</b><br/>");

    buf = dataView.getInt32(0);
    $("#fileProperties").append("Header=" + buf.toString(10) + "<br/>");
    fileLength = 2 * dataView.getInt32(24);
    $("#fileProperties").append("File length=" + fileLength.toString(10) + "<br/>");
    buf = dataView.getInt32(28, true);
    $("#fileProperties").append("Version=" + buf.toString(10) + "<br/>");
    fileShapeType = dataView.getInt32(32, true);
    $("#fileProperties").append("Shape type=" + fileShapeType.toString(10) + " (" + shapeFileType(fileShapeType) + ")<br/>");

    fileMinX = dataView.getFloat64(36, true);
    fileMinY = dataView.getFloat64(44, true);
    fileMaxX = dataView.getFloat64(52, true);
    fileMaxY = dataView.getFloat64(60, true);
    fileMinZ = dataView.getFloat64(68, true);
    fileMaxZ = dataView.getFloat64(76, true);
    fileHeight = fileMaxY - fileMinY;
    fileWidth = fileMaxX - fileMinX;
    /*
    var margin = 0.05;
    fileHeight = fileHeight * (1 + 2 * margin);
    fileWidth = fileWidth * (1 + 2 * margin);
    fileMinX = fileMinX - fileWidth * margin;
    fileMaxX = fileMaxX + fileWidth * margin;
    fileMinY = fileMinY - fileHeight * margin;
    fileMaxY = fileMaxY + fileHeight * margin;
    */
    $("#fileProperties").append("X<span class=\"subscript\">min</span>=" + fileMinX.toString(10) + "<br/>" +
                            "X<span class=\"subscript\">max</span>=" + fileMaxX.toString(10) + "<br/>" +
                            "Y<span class=\"subscript\">min</span>=" + fileMinY.toString(10) + "<br/>" +
                            "Y<span class=\"subscript\">max</span>=" + fileMaxY.toString(10) + "<br/>" +
                            "Z<span class=\"subscript\">min</span>=" + fileMinZ.toString(10) + "<br/>" +
                            "Z<span class=\"subscript\">max</span>=" + fileMaxZ.toString(10) + "<br/>");
    $("#fileProperties").append("FileWidth=" + fileWidth + " fileHeight=" + fileHeight + "<br/>");

    canvasWidth = c.width;
    canvasHeight = c.width * fileHeight / fileWidth;
    c.height = canvasHeight;
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "#000000";
    $("#performanceProperties").append("CanvasWidth=" + canvasWidth + " canvasHeight=" + canvasHeight + "<br/>");

    ctx.strokeStyle = "#0000FF";
    minHorizontalGrid = Math.ceil(fileMinY);
    maxHorizontalGrid = Math.floor(fileMaxY);
    minVerticalGrid = Math.ceil(fileMinX);
    maxVerticalGrid = Math.floor(fileMaxX);
    gridInterval = 1;
    if ((fileHeight > 100) || (fileWidth > 100)) gridInterval = 10;
    if ((fileHeight > 1000) || (fileWidth > 1000)) gridInterval = 100;
    if ((fileHeight > 10000) || (fileWidth > 10000)) gridInterval = 1000;
    if ((fileHeight > 100000) || (fileWidth > 100000)) gridInterval = 10000;
    if ((fileHeight > 1000000) || (fileWidth > 1000000)) gridInterval = 100000;
    for (g = minHorizontalGrid; g <= maxHorizontalGrid; g += gridInterval) {
        gridY = canvasY(fileHeight, fileMinY, canvasHeight, g);
        ctx.beginPath();
        ctx.moveTo(border, gridY);
        ctx.lineTo(canvasWidth-border, gridY);
        ctx.stroke();
        ctx.strokeText(g, 0, gridY);
    }
    for (g = minVerticalGrid; g <= maxVerticalGrid; g+=gridInterval) {
        gridX = canvasX(fileWidth, fileMinX, canvasWidth, g);
        ctx.beginPath();
        ctx.moveTo(gridX, border);
        ctx.lineTo(gridX, canvasHeight-border);
        ctx.stroke();
        ctx.strokeText(g, gridX, border);
    }

    ctx.strokeStyle = "#000000";
    pos = 100;
    if ((fileShapeType == 3) || (fileShapeType == 5)) {
        while (pos < fileLength) {
            recordNumber = dataView.getInt32(pos);
            pos += 4;
            recordContentLength = dataView.getInt32(pos);
            pos += 4;
            recordShapeType = dataView.getInt32(pos, true);
            pos += 4;
            recordMinX = dataView.getFloat64(pos, true);
            pos += 8;
            recordMinY = dataView.getFloat64(pos, true);
            pos += 8;
            recordMaxX = dataView.getFloat64(pos, true);
            pos += 8;
            recordMaxY = dataView.getFloat64(pos, true);
            pos += 8;
            recordNumParts = dataView.getInt32(pos, true);
            pos += 4;
            recordNumPoints = dataView.getInt32(pos, true);
            pos += 4;
        
            if ((recordMinX < fileMinX) ||
                (recordMinY < fileMinY) ||
                (recordMaxX > fileMaxX) ||
                (recordMaxY > fileMaxY))
            {
                $("#recordProperties").append(
                    "recordNumber=" + recordNumber +
                    " contentLength=" + recordContentLength +
                    " shapeType=" + recordShapeType +
                    " minX=" + recordMinX +
                    " maxX=" + recordMaxX +
                    " numParts=" + recordNumParts +
                    " numPoints=" + recordNumPoints +
                    " (outside file)" +
                    "<br/><br/>"
                    );
            }
            if (recordNumber % 1000 == 0) {
                $("#recordProperties").append(
                    "recordNumber=" + recordNumber +
                    " contentLength=" + recordContentLength +
                    " shapeType=" + recordShapeType +
                    " minX=" + recordMinX +
                    " maxX=" + recordMaxX +
                    " numParts=" + recordNumParts +
                    " numPoints=" + recordNumPoints +
                    "<br/><br/>"
                    );
            }
            recordParts = new Array();
            for (pa = 0; pa < recordNumParts; pa++) {
                recordParts[pa] = dataView.getInt32(pos, true);
                pos += 4;
            }
            for (po = 0; po < recordNumPoints; po++) {
                pointX = dataView.getFloat64(pos, true);
                pos += 8;
                pointY = dataView.getFloat64(pos, true);
                pos += 8;

                //pointX = (fileMaxX + fileMinX) / 2;
                //pointY = (fileMaxY + fileMinY) / 2;

                canvasX1 = canvasX(fileWidth, fileMinX, canvasWidth, pointX);
                canvasY1 = canvasY(fileHeight, fileMinY, canvasHeight, pointY);
                /*
                $("#divHeader").append(
                    "po=" + po +
                    " pointX=" + pointX +
                    " pointY=" + pointY +
                    " canvasX1=" + canvasX1 +
                    " canvasY1=" + canvasY1 +
                    "<br/>"
                    );
                */
                if (po > 0) {
                    ctx.beginPath();
                    ctx.moveTo(canvasX1, canvasY1);
                    ctx.lineTo(canvasX2, canvasY2);
                    ctx.stroke();
                }
                canvasX2 = canvasX1;
                canvasY2 = canvasY1;
            }
        }
    }

    if (fileShapeType == 1) {
        while (pos < fileLength) {
            recordNumber = dataView.getInt32(pos);
            pos += 4;
            recordContentLength = dataView.getInt32(pos);
            pos += 4;
            recordShapeType = dataView.getInt32(pos, true);
            pos += 4;

            if (recordNumber % 1000 == 0) {
                $("#recordProperties").append(
                    "recordNumber=" + recordNumber +
                    "recordContentLength=" + recordContentLength +
                    " recordShapeType=" + recordShapeType +
                    "<br/>"
                    );
            }
            pointX = dataView.getFloat64(pos, true);
            pos += 8;
            pointY = dataView.getFloat64(pos, true);
            pos += 8;

            canvasX1 = canvasX(fileWidth, fileMinX, canvasWidth, pointX);
            canvasY1 = canvasY(fileHeight, fileMinY, canvasHeight, pointY);
            ctx.beginPath(); 
            ctx.arc(canvasX1, canvasY1, 1, 0, 2 * Math.PI, true);
            ctx.fill();
        }
    }
    var endTime = Date.now();
    $("#performanceProperties").append("Duration=" + (endTime-startTime) +"ms<br/>");
}

var openFile = function (event) {
    var input = event.target;

    if (!FileReader) {
        Alert("FileReader not supported");
        throw "It doesn't work";
    }
    var reader = new FileReader();

    reader.onload = function () {
        var pos;
        var arrayBuffer = reader.result;
        var dataView = new DataView(arrayBuffer);
        redraw(dataView);
    };
    reader.readAsArrayBuffer(input.files[0]);
};


function renderImage(file) {
    // generate a new FileReader object
    var reader = new FileReader();

    // inject an image with the src url
    reader.onload = function (event) {
        the_url = event.target.result
        $('#imageContainer').html("<img src='" + the_url + "' />")
    }

    // when the file is read it triggers the onload event above.
    reader.readAsDataURL(file);
}

// handle input changes
$("#inputFile").change(function () {
    // grab the first image in the FileList object and pass it to the function
    renderImage(this.files[0])
});