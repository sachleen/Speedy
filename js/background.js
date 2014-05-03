console.log('Speedy BG script');
tabToCapture = -1;
cardId = -1;

canvas = document.createElement('canvas');
ctx = canvas.getContext("2d");
screenShot = new Image();
thumbHeight = -1;

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting == "captureNextTab") {
            console.log("Got request for screenshot of " + request.id);
            cardId = request.id;
            tabToCapture = request.tabId;
            thumbHeight = -1;
            sendResponse({farewell: 'OK'});
        }
    }
);

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tabId == tabToCapture && changeInfo.status == "complete") {
        // Some pages (Google Calendar) don't show anything even though it reports loaded.
        console.log("waiting a couple of seconds...");
        setTimeout(function() {
            getScreenshot(tab.windowId);
        }, 2000);
    }
});

function getScreenshot(windowId) {
    console.log("taking screenshot of " + cardId);

    // Get current window state
    chrome.windows.get(windowId, function(window) {
        var currentState = window.state;
        // full screen window for screenshot
        chrome.windows.update(windowId, {"state":"fullscreen"}, function() {
            // Take screenshot - have to wait for window to fully maximize before taking screenshot
            setTimeout(function() {
                chrome.tabs.captureVisibleTab({"format":"png"}, function(dataUrl) {
                    screenShot.src = dataUrl;
                    // restore window state
                    chrome.windows.update(windowId, {"state":currentState});
                });
            }, 1000);
        });
    });
}

screenShot.onload = function() {

    if (thumbHeight < 0) {
        thumbHeight = Math.floor(screenShot.height / 3);
    }
    
    newHeight = Math.floor(screenShot.height * (0.61));

    if (newHeight < thumbHeight) {
        newHeight = thumbHeight;
    }

    newWidth = Math.floor(screenShot.width / screenShot.height * newHeight);

    if (newHeight >= thumbHeight) {
        console.log("resizing down");
        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.drawImage(screenShot, 0, 0, newWidth, newHeight);

        if (newHeight == thumbHeight) {
            console.log("saving");
            
            
            localStorage[cardId] = canvas.toDataURL();

            cardId = -1;
            tabToCapture = -1;
            thumbHeight = -1;
            screenShot.removeAttribute('height');
            screenShot.removeAttribute('width');
            screenShot.removeAttribute('src');
        } else {
            screenShot.src = canvas.toDataURL();
            screenShot.height = newHeight;
            screenShot.width = newWidth;
        }
        
    }
}

var removeBlanks = function (imgWidth, imgHeight) {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
             data = imageData.data,
           getRBG = function(x, y) {
                      return {
                        red:   data[(imgWidth*y + x) * 4],
                        green: data[(imgWidth*y + x) * 4 + 1],
                        blue:  data[(imgWidth*y + x) * 4 + 2]
                      };
                    },
          isWhite = function (rgb) {
                      return rgb.red == 255 && rgb.green == 255 && rgb.blue == 255;
                    },
            scanY = function (fromTop) {
                      var offset = fromTop ? 1 : -1;

                      // loop through each row
                      for(var y = fromTop ? 0 : imgHeight - 1; fromTop ? (y < imgHeight) : (y > -1); y += offset) {

                        // loop through each column
                        for(var x = 0; x < imgWidth; x++) {
                            if (!isWhite(getRBG(x, y))) {
                                return y;                        
                            }      
                        }
                    }
                    return null; // all image is white
                },
            scanX = function (fromLeft) {
                      var offset = fromLeft? 1 : -1;

                      // loop through each column
                      for(var x = fromLeft ? 0 : imgWidth - 1; fromLeft ? (x < imgWidth) : (x > -1); x += offset) {

                        // loop through each row
                        for(var y = 0; y < imgHeight; y++) {
                            if (!isWhite(getRBG(x, y))) {
                                return x;                        
                            }      
                        }
                    }
                    return null; // all image is white
                };


        var cropTop = scanY(true),
            cropBottom = scanY(false),
            cropLeft = scanX(true),
            cropRight = scanX(false);
    // cropTop is the last topmost white row. Above this row all is white
    // cropBottom is the last bottommost white row. Below this row all is white
    // cropLeft is the last leftmost white column.
    // cropRight is the last rightmost white column.
};