/* Antigravity Machine background animation.
   Hairline triangles, bars and circles drift upwards, come apart and re-form.
   They respond to scrolling and to the cursor, and hold still when the visitor
   has "reduce motion" switched on.
   Needs one element on the page: <canvas data-agm-bg="1"></canvas> */
(function () {
  function startBg() {
    var cv = this.cv || document.querySelector('canvas[data-agm-bg]');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var TINTS = [[152, 133, 166], [92, 84, 140], [68, 66, 140], [48, 52, 140]];
    var INK = [48, 52, 140];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var bg = { raf: 0, motion: this.props.motion !== false };
    this.bg = bg;
    var W = 0, H = 0, forms = [], rot = 0, frame = 0;
    var scrollVel = 0, lastScroll = 0, mx = -1, my = -1;
    function rnd(a, b) { return a + Math.random() * (b - a); }

    function polyFor(kind, r) {
      var pts = [], i, a;
      if (kind === 'tri' || kind === 'itri') {
        var start = kind === 'tri' ? -Math.PI / 2 : Math.PI / 2;
        for (i = 0; i < 3; i++) { a = start + i * (Math.PI * 2 / 3); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      } else if (kind === 'bar') {
        var w = r * 0.34, h = r * 1.15;
        pts = [[-w, -h], [w, -h], [w, h], [-w, h]];
      } else {
        for (i = 0; i < 40; i++) { a = i * (Math.PI * 2 / 40); pts.push([Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82]); }
      }
      return pts;
    }
    function spawn(x, y) {
      var kinds = ['tri', 'itri', 'bar', 'circle', 'tri', 'itri'];
      var kind = kinds[Math.floor(Math.random() * kinds.length)];
      var base = Math.min(W, H, 900);
      var r = rnd(base * 0.07, base * 0.24);
      return {
        kind: kind, r: r, pts: polyFor(kind, r),
        x: x === undefined ? rnd(0, W) : x, y: y === undefined ? rnd(0, H) : y,
        vx: rnd(-0.28, 0.28), vy: rnd(-0.34, 0.08),
        a: rnd(0, Math.PI * 2), va: rnd(-0.0022, 0.0022),
        un: rnd(0, 0.25), dir: Math.random() < 0.5 ? 1 : -1, rate: rnd(0.0018, 0.005),
        tint: TINTS[Math.floor(Math.random() * TINTS.length)], seed: rnd(0, 1000)
      };
    }
    function size() {
      W = window.innerWidth || cv.clientWidth || 1200;
      H = window.innerHeight || cv.clientHeight || 800;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (W * H * dpr * dpr > 6000000) dpr = 1;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(8, Math.min(36, Math.round(W * H / 90000)));
      while (forms.length < n) forms.push(spawn());
      forms.length = n;
    }
    function drawForm(f) {
      var pts = f.pts, n = pts.length, un = f.un;
      var gap = un * 0.42, push = un * f.r * 0.55, jitter = un * f.r * 0.16;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a + rot);
      var alpha = (200 * (1 - un * 0.55) + 30) * 0.34 / 255;
      ctx.strokeStyle = 'rgba(' + f.tint[0] + ',' + f.tint[1] + ',' + f.tint[2] + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        var cxm = (a[0] + b[0]) / 2, cym = (a[1] + b[1]) / 2;
        var len = Math.hypot(cxm, cym) || 1;
        var ox = (cxm / len) * push, oy = (cym / len) * push;
        var jx = Math.sin(f.seed + i * 2.1 + frame * 0.006) * jitter;
        var jy = Math.cos(f.seed + i * 1.7 + frame * 0.005) * jitter;
        ctx.moveTo(a[0] + (b[0] - a[0]) * gap * 0.5 + ox + jx, a[1] + (b[1] - a[1]) * gap * 0.5 + oy + jy);
        ctx.lineTo(b[0] - (b[0] - a[0]) * gap * 0.5 + ox + jx, b[1] - (b[1] - a[1]) * gap * 0.5 + oy + jy);
      }
      ctx.stroke();
      if (un > 0.55 && f.kind !== 'circle') {
        ctx.fillStyle = 'rgba(' + INK[0] + ',' + INK[1] + ',' + INK[2] + ',' + Math.min(1, (un - 0.55) * 240 / 255).toFixed(3) + ')';
        for (var k = 0; k < n; k++) {
          ctx.beginPath();
          ctx.arc(pts[k][0] * (1 + un * 0.5), pts[k][1] * (1 + un * 0.5), 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    function step() {
      frame++;
      scrollVel *= 0.9;
      rot += scrollVel * 0.00012;
      var drift = 1 + Math.min(3.2, Math.abs(scrollVel) * 0.035);
      var hasMouse = mx > 0 && my > 0 && mx < W && my < H;
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i];
        f.x += f.vx * drift;
        f.y += f.vy * drift - Math.abs(scrollVel) * 0.012;
        f.a += f.va * drift;
        var pad = f.r * 1.8;
        if (f.x < -pad) f.x = W + pad; if (f.x > W + pad) f.x = -pad;
        if (f.y < -pad) f.y = H + pad; if (f.y > H + pad) f.y = -pad;
        for (var j = i + 1; j < forms.length; j++) {
          var g = forms[j];
          var d = Math.hypot(f.x - g.x, f.y - g.y);
          if (d < (f.r + g.r) * 0.78) {
            f.dir = 1; g.dir = 1;
            var nx = (f.x - g.x) / (d || 1), ny = (f.y - g.y) / (d || 1);
            f.vx += nx * 0.006; f.vy += ny * 0.006; g.vx -= nx * 0.006; g.vy -= ny * 0.006;
          }
        }
        if (hasMouse && Math.hypot(f.x - mx, f.y - my) < f.r * 2.4) { f.un = Math.min(1, f.un + 0.02); f.dir = 1; }
        f.un += f.dir * f.rate * drift;
        if (f.un >= 1) { f.un = 1; f.dir = -1; }
        if (f.un <= 0) {
          f.un = 0; f.dir = 1;
          if (Math.random() < 0.35) { var next = spawn(f.x, f.y); next.un = 0; forms[i] = next; f = next; }
        }
        f.vx = Math.max(-0.7, Math.min(0.7, f.vx));
        f.vy = Math.max(-0.7, Math.min(0.5, f.vy));
      }
    }
    function paint() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < forms.length; i++) drawForm(forms[i]);
    }
    function loop() {
      if (bg !== undefined && bg.motion && !reduce) step();
      paint();
      bg.raf = requestAnimationFrame(loop);
    }
    bg.onScroll = function (e) {
      var t = e.target;
      var v = (!t || t === document || t === window) ? (window.scrollY || document.documentElement.scrollTop || 0) : (t.scrollTop || 0);
      scrollVel += (v - lastScroll); lastScroll = v;
    };
    bg.onResize = function () { size(); };
    bg.onMove = function (e) { mx = e.clientX; my = e.clientY; };
    window.addEventListener('scroll', bg.onScroll, true);
    window.addEventListener('resize', bg.onResize);
    window.addEventListener('pointermove', bg.onMove);
    size();
    if (reduce) { paint(); return; }
    loop();
  }
  function boot() {
    startBg.call({ props: { motion: true }, cv: document.querySelector('canvas[data-agm-bg]') });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
