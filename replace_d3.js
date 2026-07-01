var fs = require("fs");
var h = fs.readFileSync("graph_causal.html", "utf8");

// Find markers
var s = h.indexOf("D3 图谱引擎");
var e = h.indexOf("3D 视图控制器（保留，之后补充）", s);
if (s < 0 || e < 0) { console.log("MARKERS FAIL"); process.exit(2); }
// adjust: s = start of <script> after the comment
var scStart = h.lastIndexOf("<!-- ═════", s);
if (scStart < 0) scStart = h.lastIndexOf("<script>", s);
// find the closing </script>
var scEnd = h.indexOf("</script>", s);
if (scEnd < 0) scEnd = e;

console.log("Found blocks: comment start=" + scStart + " script end=" + scEnd);

var d3code = fs.readFileSync("d3_engine.js", "utf8");

h = h.substring(0, scStart) + d3code + h.substring(scEnd);
fs.writeFileSync("graph_causal.html", h);
console.log("Done. New len=" + h.length);
