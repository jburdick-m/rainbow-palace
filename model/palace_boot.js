// The barn page's viewer, packed (work/palace/pack.py): big data files are stored gzipped (and the land as row
// differences) because the static host serves .bin files uncompressed. fetch() is wrapped so the viewer asks for the
// plain file and gets it unpacked. Needs DecompressionStream (all current browsers).
(function () {
  var GZ = {"terrain_veg/web/shrubs.bin":{"k":"gz"},"terrain_veg/web/terrain/dem.bin":{"k":"dz16","nx":1748},"terrain_veg/web/trees.bin":{"k":"gz"},"terrain_veg/web/woodshed/hd.bin":{"k":"gz"},"terrain_veg/web/woodshed/quick_shed.bin":{"k":"gz"},"work/trees/site/trees_site.bin":{"k":"gz"},"work/understory/web/shrubs_us.bin":{"k":"gz"},"work/trees/out/donors/900071_black_oak/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900050_black_oak/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900034_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900017_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900013_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/out/donors/900033_ponderosa/wood_lod.glb":{"k":"gz"},"work/trees/tinyhouse/model/black_oak/wood.glb":{"k":"gz"},"work/trees/tinyhouse/model/live_oak/crown.glb":{"k":"gz"},"work/integrate/buildings/out/playground_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/slackline_v1_walk.glb":{"k":"gz"},"work/integrate/buildings/out/lloyd_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/well_house_v1.glb":{"k":"gz"},"work/integrate/buildings/out/goat_pen_v1.glb":{"k":"gz"},"work/integrate/buildings/out/tiny_house_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/coop_v3_w1.glb":{"k":"gz"},"work/integrate/buildings/out/fire_ring_v2_w1.glb":{"k":"gz"},"work/integrate/buildings/out/light_house_v5.glb":{"k":"gz"},"work/integrate/buildings/out/barn_house_v8.glb":{"k":"gz"},"work/integrate/buildings/out/utility_pole_v1.glb":{"k":"gz"},"work/integrate/cars/out_v3/4runner_ink.glb":{"k":"gz"},"work/integrate/cars/out_v3/prius_ink.glb":{"k":"gz"}}, keys = Object.keys(GZ), of = window.fetch.bind(window);
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
