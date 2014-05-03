chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting == "tabScreenshot") {
            $("#ss").attr('src', request.message);
            sendResponse({farewell: 'Thanks'});
        }
    }
);

var numberOfCards = 0;

$(function() {
    var cardTemplate = $("#cardTemplate").html();
    // Load all "Other Bookmarks" (id="2")
    var folderId = localStorage['folder'] ? localStorage['folder'] : getBookmarksFolder();
    
    
    chrome.bookmarks.getSubTree(folderId, function(results) {
        var children = results[0].children;
        var len = children.length;
        numberOfCards = len;
        
        for (var i = 0; i < len; i++) {
            var site = children[i];
            
            var thumb = localStorage[site.id];

            var refreshThumb = false;

            if (!thumb || thumb == "undefined") {
                thumb = "";
                refreshThumb = true;
            }
            
            var template = cardTemplate.format(site.id, site.url, refreshThumb, site.title, thumb);
            
            $("#container").append(template);
            
            $("#" + site.id).click(function(event) {
                if (event.which == 1 && $(this).data('reloadthumb')) {
                    var that = $(this);
                    chrome.tabs.getCurrent(function(tab) {
                        chrome.extension.sendMessage(
                            {
                                greeting: "captureNextTab",
                                id: that.attr('id'),
                                tabId: tab.id
                            }
                        );
                    });
                }
            });
        }
        
        $(".favicon").on('load', function() {
            siteId = $(this).parents('.card').attr('id');
            borderColor = getDominantColor($(this)[0]);
            // If page doesn't have favicon, give it a default color (that's not almost white)
            if (borderColor == "242,242,243") {
                borderColor = "150,150,150";
            }
            
            $("#" + siteId).find(".thumb").css("border-bottom", "2px solid rgb("+borderColor+")");
        });
        
        // Stretchy wrapper calculation based on http://stackoverflow.com/a/10441480/219118
        $(".stretchy-wrapper").css("padding-bottom", (100*(screen.height/screen.width)) + '' + "%");
        
        // Cleanup localStorage by removing entries for pages that don't exist.
        var keys = Object.keys(localStorage);
        var len = keys.length;
        for (var i = 0; i < len; i++) {
            if (keys[i] != "folder" && !$("#"+keys[i]).length) {
                localStorage.removeItem(keys[i]);
            }
        }
    });
    
    
    // Apps
    var appTemplate =  $("#appTemplate").html();
    chrome.management.getAll(function(list) {
        for (var i in list)
        {
            var app = list[i];
            if(app.isApp && app.enabled)
            {
                var appId = app.id;
                var appName = app.name;
                console.log(app.name);
                var appIcon = findIcon(app.icons, 128);

                var template = appTemplate.format(appId, appIcon);
                
                $("#apps").append(template);
                $("#" + appId).click(function(event) {
                    chrome.management.launchApp(this.id);
                });
            }
        }
    });
});


function getBookmarksFolder() {
    // Load all "Other Bookmarks" (id="2")
    chrome.bookmarks.getSubTree("2", function(results) {
        var children = results[0].children;
        var len = children.length;
        var foundSpeedy = 0;
        
        for (var i = 0; i < len; i++) {
            if (children[i].title == "Speedy") {
                localStorage['folder'] = children[i].id;
                foundSpeedy = 1;
                break;
            }
        }
        
        if (!foundSpeedy) {
            // Speedy doesn't exist, create it.
            chrome.bookmarks.create({'parentId': "2",
                                     'title': 'Speedy'},
                function(newFolder) {
                    localStorage['folder'] = newFolder.id;
            }); 
        }
    });
    window.location.reload();
}

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

/**
* Get the URL for an application icon of specified size.
*
* @param {array of IconInfo} appIcons Array of IconInfo, includes size and url.
* @param {int} size Required size.
* @return {string} Returns URL to app icon of required size. If the app does not have an icon of required size,
*         the last (largest) icon found is returned.
*/

function findIcon(appIcons, size)
{
    for (i in appIcons)
    {
        if(appIcons[i].size == size)
            return appIcons[i].url;
    }
    return appIcons[appIcons.length-1].url;
}

/*
    getDominantColor function from Speed Dial 2 extension.
    http://speeddial2.com/
    https://chrome.google.com/webstore/detail/speed-dial-2/jpfpebmajhhopeonhlcgidhclcccjcik
*/
function getDominantColor(aImg) {
    var canvas = document.createElement("canvas");
    canvas.height = aImg.height;
    canvas.width = aImg.width;

    var context = canvas.getContext("2d");
    context.drawImage(aImg, 0, 0);

    // keep track of how many times a color appears in the image
    var colorCount = {};
    var maxCount = 0;
    var dominantColor = "";

    // data is an array of a series of 4 one-byte values representing the rgba values of each pixel
    var data = context.getImageData(0, 0, aImg.height, aImg.width).data;

    for (var i = 0; i < data.length; i += 4) {
        // ignore transparent pixels
        if (data[i + 3] == 0) continue;

        var color = data[i] + "," + data[i + 1] + "," + data[i + 2];
        // ignore white
        if (color == "255,255,255") continue;

        colorCount[color] = colorCount[color] ? colorCount[color] + 1 : 1;

        // keep track of the color that appears the most times
        if (colorCount[color] > maxCount) {
            maxCount = colorCount[color];
            dominantColor = color;
        }
    }

    var rgb = dominantColor.split(",");
    return dominantColor;
}