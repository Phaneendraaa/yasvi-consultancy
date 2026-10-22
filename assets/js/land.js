// Draws an equirectangular land mask (white land on black) from Natural Earth data.
// Loaded once and shared by the 3D globe and the dotted world maps.
import { geoEquirectangular, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/+esm';
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';

const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json';
let cache = null;

export function getLandMask(width = 2048) {
  if (cache) return cache;
  cache = fetch(LAND_URL)
    .then((r) => { if (!r.ok) throw new Error('Map data ' + r.status); return r.json(); })
    .then((topo) => {
      const land = feature(topo, topo.objects.land);
      const w = width, h = width / 2;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const projection = geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]).precision(0.2);
      ctx.beginPath();
      geoPath(projection, ctx)(land);
      ctx.fillStyle = '#fff';
      ctx.fill('evenodd');
      return canvas;
    });
  return cache;
}
