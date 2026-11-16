// The barn page's viewer, packed (work/palace/pack.py): big data files are stored gzipped (and the land as row
// differences) because the static host serves .bin files uncompressed. fetch() is wrapped so the viewer asks for the
// plain file and gets it unpacked. Needs DecompressionStream (all current browsers).
// Nothing is read from or kept in browser storage: localStorage and sessionStorage are empty in-memory stand-ins, so the
// page always opens on the build's fixed defaults (no quality, view, panel or loading-time values from earlier visits).
(function () {
  function Mem() { var m = {}; return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; }, clear: function () { m = {}; },
    key: function (i) { return Object.keys(m)[i] || null; }, get length() { return Object.keys(m).length; } }; }
  ['localStorage', 'sessionStorage'].forEach(function (n) { try { Object.defineProperty(window, n, { value: Mem(), configurable: true }); } catch (e) { /* left as is */ } });
})();
(function () {
  var GZ = {"terrain_veg/web/shrubs.bin":{"k":"gz"},"terrain_veg/web/terrain/dem.bin":{"k":"dz16","nx":1748},"terrain_veg/web/trees.bin":{"k":"gz"},"terrain_veg/web/woodshed/hd.bin":{"k":"gz"},"terrain_veg/web/woodshed/quick_shed.bin":{"k":"gz"},"work/trees/site/trees_site.bin":{"k":"gz"},"work/understory/web/shrubs_us.bin":{"k":"gz"},"work/trees/out/donors/900071_black_oak/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900050_black_oak/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900034_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900017_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900013_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900033_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/tinyhouse/model/black_oak/wood.glb":{"k":"gz"},"work/trees/tinyhouse/model/live_oak/crown.glb":{"k":"gz"},"work/integrate/buildings/out/playground_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/slackline_v1_walk.glb":{"k":"gz"},"work/integrate/buildings/out/lloyd_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/well_house_v1.glb":{"k":"gz"},"work/integrate/buildings/out/goat_pen_v1.glb":{"k":"gz"},"work/integrate/buildings/out/tiny_house_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/coop_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/fire_ring_v2_w1.glb":{"k":"gz"},"work/integrate/buildings/out/light_house_v5.glb":{"k":"gz"},"work/integrate/buildings/out/barn_house_v8.glb":{"k":"gz"},"work/integrate/buildings/out/utility_pole_v1.glb":{"k":"gz"},"work/integrate/cars/out_v4/subaru_photo.glb":{"k":"gz"},"work/integrate/cars/out_v4/f150_photo.glb":{"k":"gz"},"work/integrate/cars/out/tractor.glb":{"k":"gz"},"work/integrate/cars/out_v3/4runner_ink.glb":{"k":"gz"},"work/integrate/cars/out_v3/prius_ink.glb":{"k":"gz"}}, keys = Object.keys(GZ), of = window.fetch.bind(window);
  function unpack(res, k) {
    if (!res.ok) return res;
    var ds = new DecompressionStream('gzip');
    return new Response(res.body.pipeThrough(ds)).arrayBuffer().then(function (buf) {
      if (k.k === 'dz16') {
        var a = new Uint16Array(buf), nx = k.nx;
        for (var r = 0; r < a.length; r += nx) for (var i = r + 1; i < r + nx; i++) a[i] = (a[i] + a[i - 1]) & 0xffff;
      }
      return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
    });
  }
  window.fetch = function (input, init) {
    try {
      var u = new URL(typeof input === 'string' ? input : input.url, location.href);
      for (var j = 0; j < keys.length; j++) {
        if (u.pathname.slice(-keys[j].length - 1) === '/' + keys[j]) {
          var k = GZ[keys[j]]; u.search = '';
          return of(u.href + (k.k === 'gz' ? '.gz' : '.dz'), init).then(function (res) { return unpack(res, k); });
        }
      }
    } catch (e) { /* fall through */ }
    return of(input, init);
  };
})();
// Loading progress for the page around the frame (its "Loading 3D view" bar): bytes of the finished downloads under
// model/ (resource timing) against the build's total (__TOTAL__, written by the packer), at most ten times a second.
(function () {
  var TOTAL = 23233791, got = 0, seen = {}, last = 0;
  function send(force) {
    var now = Date.now(); if (!force && now - last < 100) return; last = now;
    try { parent.postMessage({ palace: 'progress', p: Math.min(0.97, got / TOTAL) }, '*'); } catch (e) { /* no parent */ }
  }
  function take(list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i]; if (seen[r.name] || r.name.indexOf('/model/') < 0) continue;
      seen[r.name] = 1; got += r.encodedBodySize || r.transferSize || 0;
    }
    send();
  }
  try { new PerformanceObserver(function (l) { take(l.getEntries()); }).observe({ type: 'resource', buffered: true }); } catch (e) { /* old browser */ }
  try { performance.setResourceTimingBufferSize(1000); } catch (e) { /* fine */ }
})();
