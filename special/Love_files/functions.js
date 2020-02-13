/*
 * http://love.hackerzhou.me
 */

// variables
var $win = $(window);
var clientWidth = $win.width();
var clientHeight = $win.height();

$(window).resize(function() {
    var newWidth = $win.width();
    var newHeight = $win.height();
    if (newWidth != clientWidth &amp;&amp; newHeight != clientHeight) {
        location.replace(location);
    }
});

(function($) {
	$.fn.typewriter = function() {
		this.each(function() {
			var $ele = $(this), str = $ele.html(), progress = 0;
			$ele.html(&apos;&apos;);
			var timer = setInterval(function() {
				var current = str.substr(progress, 1);
				if (current == &apos;<') { progress="str.indexOf(&apos;">&apos;, progress) + 1;
				} else {
					progress++;
				}
				$ele.html(str.substring(0, progress) + (progress &amp; 1 ? &apos;_&apos; : &apos;&apos;));
				if (progress &gt;= str.length) {
					clearInterval(timer);
				}
			}, 75);
		});
		return this;
	};
})(jQuery);

function timeElapse(date){
	var current = Date();
	var seconds = (Date.parse(current) - Date.parse(date)) / 1000;
	var days = Math.floor(seconds / (3600 * 24));
	seconds = seconds % (3600 * 24);
	var hours = Math.floor(seconds / 3600);
	if (hours &lt; 10) {
		hours = &quot;0&quot; + hours;
	}
	seconds = seconds % 3600;
	var minutes = Math.floor(seconds / 60);
	if (minutes &lt; 10) {
		minutes = &quot;0&quot; + minutes;
	}
	seconds = seconds % 60;
	if (seconds &lt; 10) {
		seconds = &quot;0&quot; + seconds;
	}
	var result = &quot;&#x7B2C; <span class="\" digit\"">&quot; + days + &quot;</span> &#x5929; <span class="\" digit\"">&quot; + hours + &quot;</span> &#x5C0F;&#x65F6; <span class="\" digit\"">&quot; + minutes + &quot;</span> &#x5206;&#x949F; <span class="\" digit\"">&quot; + seconds + &quot;</span> &#x79D2;&quot;; 
	$(&quot;#clock&quot;).html(result);
}
</')>