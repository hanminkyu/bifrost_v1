function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

(function ($) {
 "use strict";

 window.setInterval(function(){
   var dt = new Date($.now());
   var currentTime = dt.getFullYear() + "." + (dt.getMonth()+1) + "." + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
   $("#currentTimeSpan").html(currentTime);
 }, 1000);

})(jQuery);
