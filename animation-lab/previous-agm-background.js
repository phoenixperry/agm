/* Antigravity Machine: background animation
   ------------------------------------------------------------------
   The letters of the logo (the A triangle, the open G with its bar,
   and the M's two overlapping triangles) drift up the page as
   hairline drawings. Each one keeps coming apart and closing up again
   ("unmaking" and "remaking"), the same behaviour as the Machines We
   Imagine background.

   Every 20 seconds or so, one A, one G and one M are pulled together
   into the full mark. That is convergence: the pull towards the most
   likely outcome that the project is about. The mark holds briefly,
   then breaks apart and floats upwards again. Pointing at the mark
   while it holds breaks it early.

   The big logo at the top of the page is part of the animation. While
   the page is at the top, its three letters are drawn here, in full
   ink, exactly where the logo sits. Scrolling down sets them loose one
   at a time: they fade to hairlines and drift off into the field.
   Scrolling back to the top brings them home to re-form the logo.
   The SVG logo stays in the page (hidden from view, not from screen
   readers), so the logo still shows if this script never runs.

   It runs all the time as a quiet, ambient layer, like the Machines
   We Imagine site (machinesweimagine.com). Scrolling eases the letters
   along with the page and turns the whole field slightly, then lets
   them settle back to their usual drift.

   Needs one element on the page: <canvas data-agm-bg="1"></canvas>
   Optional: data-agm-hero on the hero logo's <svg> (viewBox as in logo/).
   Optional: data-agm-invert on any number of bands (the hero, the
   footer) to show the field in inverted colours there: this script
   paints each band's indigo itself and draws the letters inside it in
   grey, so a letter changes colour exactly as it crosses a band's edge. The page's own CSS gives the
   band its colour when the script isn't running.
   index.html carries an identical copy of this file inline, so the
   page still works as a single file. Change both together. */

(function () {
  'use strict';

  /* ---- Settings: the numbers worth tweaking ---------------------- */

  var SETTINGS = {
    // Line opacity at its strongest (0 to 1). Kept low so text stays readable.
    strokeAlpha: 0.24,
    // Letter height as a fraction of the shorter screen edge.
    minSize: 0.12,
    maxSize: 0.34,
    // How close the cursor must be, in letter radii, to start unmaking one.
    mouseReach: 2.2,
    // Chance a remade letter comes back as a different letter.
    respawnChance: 0.2,
    // Seconds between gatherings of the full mark (a random time in this range).
    gatherEvery: [20, 30],
    // Seconds before the first gathering after the page loads.
    firstGather: 6,
    // Seconds the letters take to travel into the mark, and how long it holds.
    gatherSeconds: 8,
    holdSeconds: 3.5,
    // Width of the gathered mark as a fraction of the screen width, and its cap in px.
    markWidth: 0.82,
    markMaxWidth: 1100,
    // Letters on wide and narrow (under 700px) screens. Fewer than Machines
    // We Imagine (15 and 8), for a calmer field.
    formsWide: 9,
    formsNarrow: 5,
    // Overall pace of the field: 1 is the Machines We Imagine speed.
    // Lower is calmer. Scales drift, spin, unmaking and the wobble.
    pace: 0.45,
    // How much faster the field moves while scrolling, at most (1 = not at all).
    maxScrollSpeedUp: 1.6,
    // How quickly the field catches up with scrolling (0 to 1 per frame).
    // Lower is smoother and lazier.
    scrollEase: 0.04,
    // How far down the page (as a fraction of the screen height) each hero
    // letter, A then G then M, comes loose. Staggered so they leave in turn.
    heroRelease: [0.05, 0.11, 0.17],
    // Seconds for a loose hero letter to fade from full ink to a hairline,
    // and for the letters to travel home when the page returns to the top.
    heroFadeSeconds: 1.6,
    heroReturnSeconds: 1.8,
    // Ink line width of the hero logo, matching the SVG's stroke-width.
    heroLineWidth: 2.5
  };

  // The hero logo SVG's viewBox: x, y and width, in logo units.
  var HERO_VIEWBOX = [-8, -12, 668.99];

  // Two colour sets: the usual one (indigo lines on grey) and the inverted
  // one for the band (grey lines on indigo). Each has four hairline tints,
  // the full ink colour, and, for the inverted set, the band's background.
  // A letter keeps its tint number, so it keeps its shade in either set.
  var PALETTE = {
    tints: [[152, 133, 166], [92, 84, 140], [68, 66, 140], [48, 52, 140]],
    ink: [48, 52, 140]
  };
  var INVERTED = {
    tints: [[234, 229, 224], [214, 206, 222], [196, 186, 216], [234, 229, 224]],
    ink: [234, 229, 224],
    background: [48, 52, 140]
  };

  /* ---- Logo geometry --------------------------------------------- */

  // The letters, in the logo's own units (the SVG viewBox in logo/).
  // Each letter is a list of strokes; a stroke is a list of points and
  // says whether it closes back on itself and whether its corners get
  // loose dots when the letter comes apart. Points are made relative
  // to the letter's centre further down, so the letters can spin.

  // Sample the G's open arc into short straight pieces, so it can come
  // apart piece by piece like the straight edges do. The circle centre
  // (259.99, 122.5) and radius 87.5 come from the SVG arc command.
  function arcPoints(cx, cy, r, fromDeg, toDeg, pieces) {
    var pts = [];
    for (var i = 0; i <= pieces; i++) {
      var a = (fromDeg + (toDeg - fromDeg) * (i / pieces)) * Math.PI / 180;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  var LETTERS = {
    A: {
      centre: [87.5, 87.5],
      strokes: [{ closed: true, dots: true, pts: [[0, 175], [87.5, 0], [175, 175]] }]
    },
    G: {
      centre: [259.99, 122.5],
      strokes: [
        // From the top of the circle, anticlockwise round to just below
        // the right-hand side: 261.8 degrees, leaving the G's mouth open.
        { closed: false, dots: false, pts: arcPoints(259.99, 122.5, 87.5, -90, -351.8, 30) },
        { closed: true, dots: true, pts: [[346.6, 135], [259.99, 135], [259.99, 110], [346.6, 110]] }
      ]
    },
    M: {
      centre: [498.99, 87.5],
      strokes: [
        { closed: true, dots: true, pts: [[344.99, 175], [432.49, 0], [519.99, 175]] },
        { closed: true, dots: true, pts: [[477.99, 175], [565.49, 0], [652.99, 175]] }
      ]
    }
  };

  // The centre of the whole mark, used to place the letters when they gather.
  var MARK_CENTRE = [326.5, 105];
  var MARK_UNITS_WIDE = 653;

  // Turn each letter into flat edge lists, relative to its centre.
  // Returns, per letter: its edges [ax, ay, bx, by], the corner points
  // that get dots, and its extent (furthest point from the centre).
  function buildShapes() {
    var shapes = {};
    Object.keys(LETTERS).forEach(function (key) {
      var letter = LETTERS[key];
      var edges = [], corners = [], paths = [], extent = 0;
      letter.strokes.forEach(function (stroke) {
        var pts = stroke.pts.map(function (p) {
          return [p[0] - letter.centre[0], p[1] - letter.centre[1]];
        });
        paths.push({ pts: pts, closed: stroke.closed });
        var count = stroke.closed ? pts.length : pts.length - 1;
        for (var i = 0; i < count; i++) {
          var a = pts[i], b = pts[(i + 1) % pts.length];
          edges.push([a[0], a[1], b[0], b[1]]);
        }
        pts.forEach(function (p) {
          extent = Math.max(extent, Math.hypot(p[0], p[1]));
          if (stroke.dots) corners.push(p);
        });
      });
      shapes[key] = {
        edges: edges,
        corners: corners,
        // The strokes as joined paths, for drawing a whole letter with clean corners.
        paths: paths,
        extent: extent,
        // Where this letter sits in the full mark, relative to the mark's centre.
        home: [letter.centre[0] - MARK_CENTRE[0], letter.centre[1] - MARK_CENTRE[1]]
      };
    });
    return shapes;
  }

  var SHAPES = buildShapes();
  var KINDS = ['A', 'G', 'M'];

  /* ---- Small helpers --------------------------------------------- */

  function between(low, high) { return low + Math.random() * (high - low); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function clamp(v, low, high) { return Math.max(low, Math.min(high, v)); }

  // The shortest signed turn from angle `from` to angle `to`, in radians.
  function turnBetween(from, to) {
    var d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // Blend from a to b by t (0 to 1).
  function mix(a, b, t) { return a + (b - a) * t; }

  // Ease in and out over t from 0 to 1.
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* ---- The animation --------------------------------------------- */

  function start(canvas) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0;           // viewport size in CSS pixels
    var forms = [];             // every letter on screen
    var fieldTurn = 0;          // whole-field rotation, driven by scrolling
    // Scrolling: each scroll event adds to scrollPush; scrollSpeed eases
    // towards it, so a jumpy mouse wheel still moves the field smoothly.
    var scrollPush = 0, scrollSpeed = 0, lastScroll = window.scrollY || 0;
    var mouseX = -1, mouseY = -1;
    var clock = 0;              // seconds since start, advanced per frame
    var lastTime = 0;

    // The hero logo, if the page has one. Its letters are forms[0..2].
    var heroSvg = document.querySelector('svg[data-agm-hero]');
    // The inverted bands, if the page has any. Once this script runs, each
    // band's CSS background is switched off (class is-animated) and painted here.
    var invertBands = Array.prototype.slice.call(document.querySelectorAll('[data-agm-invert]'));
    invertBands.forEach(function (band) { band.classList.add('is-animated'); });

    // The gathering cycle. One state at a time:
    //   drifting:  letters wander; `next` is when the next gathering starts
    //   gathering: three letters travel into place over `gatherSeconds`
    //   holding:   the mark stands still until `until`
    var cycle = { state: 'drifting', next: SETTINGS.firstGather, started: 0, until: 0, members: [] };

    // Make one letter. With no kind given, choose one at random.
    function makeForm(kind, x, y) {
      kind = kind || pick(KINDS);
      var shape = SHAPES[kind];
      var base = Math.min(W, H, 900);
      // Scale: screen pixels per logo unit. A letter is 175 units tall.
      var scale = between(base * SETTINGS.minSize, base * SETTINGS.maxSize) / 175;
      return {
        kind: kind,
        scale: scale,
        radius: shape.extent * scale,
        x: x === undefined ? between(0, W) : x,
        y: y === undefined ? between(0, H) : y,
        vx: between(-0.28, 0.28),
        vy: between(-0.34, 0.06),       // mostly upwards: anti-gravity
        angle: between(0, Math.PI * 2),
        spin: between(-0.0022, 0.0022),
        unmade: between(0, 0.25),       // 0 = whole, 1 = fully apart
        direction: Math.random() < 0.5 ? 1 : -1,   // 1 = unmaking, -1 = remaking
        rate: between(0.0018, 0.005),
        tint: Math.floor(Math.random() * PALETTE.tints.length),   // index into a palette's tints
        seed: between(0, 1000),
        gathered: null,                 // while gathering: { from, to, ... }
        ink: 0,                         // 0 = hairline, 1 = full logo ink (hero letters)
        appear: 1,                      // fade-in on page load (hero letters)
        hero: null                      // hero letters only: see setUpHero
      };
    }

    // Fit the canvas to the window and set how many letters there are.
    // Writes: canvas size, W, H, and the forms list.
    function resizeField() {
      W = window.innerWidth || canvas.clientWidth || 1200;
      H = window.innerHeight || canvas.clientHeight || 800;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (W * H * dpr * dpr > 6000000) dpr = 1;   // keep very large screens cheap
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = W < 700 ? SETTINGS.formsNarrow : SETTINGS.formsWide;
      // The first three are always one of each letter, so a gathering can
      // always find its A, G and M.
      while (forms.length < count) forms.push(makeForm(KINDS[forms.length] || null));
      forms.length = count;
    }

    // Draw one letter. As it unmakes, each edge shortens from both ends
    // (gap), moves away from the centre (push) and wobbles (jitter).
    // Past 55% unmade, loose dots appear at the corners.
    function drawForm(f, palette) {
      var shape = SHAPES[f.kind], s = f.scale, un = f.unmade;
      var gap = un * 0.42, push = un * f.radius * 0.5, jitter = un * f.radius * 0.08;
      // Hero letters blend from full logo ink (ink = 1) to a background hairline.
      var alpha = mix(SETTINGS.strokeAlpha * (1 - un * 0.55), 1, f.ink) * f.appear;
      var tint = palette.tints[f.tint];
      var colour = [0, 1, 2].map(function (c) { return Math.round(mix(tint[c], palette.ink[c], f.ink)); });

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle + fieldTurn);
      ctx.strokeStyle = 'rgba(' + colour.join(',') + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = mix(1.25, SETTINGS.heroLineWidth, f.ink);
      ctx.lineJoin = 'miter';
      ctx.beginPath();

      // A whole letter is drawn as joined paths, so its corners meet cleanly
      // like the SVG logo's. Once it starts coming apart, edge by edge.
      if (un < 0.002) {
        shape.paths.forEach(function (path) {
          path.pts.forEach(function (pt, n) {
            if (n === 0) ctx.moveTo(pt[0] * s, pt[1] * s);
            else ctx.lineTo(pt[0] * s, pt[1] * s);
          });
          if (path.closed) ctx.closePath();
        });
        ctx.stroke();
        ctx.restore();
        return;
      }

      for (var i = 0; i < shape.edges.length; i++) {
        var e = shape.edges[i];
        var ax = e[0] * s, ay = e[1] * s, bx = e[2] * s, by = e[3] * s;
        // Outward direction: from the letter's centre through the edge's middle.
        var midX = (ax + bx) / 2, midY = (ay + by) / 2;
        var len = Math.hypot(midX, midY) || 1;
        var ox = midX / len * push, oy = midY / len * push;
        var jx = Math.sin(f.seed + i * 2.1 + clock * 0.36 * SETTINGS.pace) * jitter;
        var jy = Math.cos(f.seed + i * 1.7 + clock * 0.3 * SETTINGS.pace) * jitter;
        ctx.moveTo(ax + (bx - ax) * gap * 0.5 + ox + jx, ay + (by - ay) * gap * 0.5 + oy + jy);
        ctx.lineTo(bx - (bx - ax) * gap * 0.5 + ox + jx, by - (by - ay) * gap * 0.5 + oy + jy);
      }
      ctx.stroke();

      if (un > 0.55) {
        ctx.fillStyle = 'rgba(' + palette.ink.join(',') + ',' + Math.min(1, (un - 0.55) * 0.9).toFixed(3) + ')';
        for (var k = 0; k < shape.corners.length; k++) {
          var c = shape.corners[k];
          ctx.beginPath();
          ctx.arc(c[0] * s * (1 + un * 0.5), c[1] * s * (1 + un * 0.5), 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Choose one A, one G and one M, and give each a place in the mark.
    // Writes: cycle (now gathering) and each chosen form's `gathered`.
    function beginGathering() {
      var markScale = Math.min(W * SETTINGS.markWidth, SETTINGS.markMaxWidth) / MARK_UNITS_WIDE;
      // Sit the mark a little below the middle, where the hero text is not.
      var cx = W / 2, cy = H * 0.58;
      var members = [];
      KINDS.forEach(function (kind) {
        var candidates = forms.filter(function (f) {
          return f.kind === kind && !f.gathered && (!f.hero || f.hero.state === 'loose');
        });
        var f = candidates.length ? pick(candidates) : null;
        if (!f) return;
        var home = SHAPES[kind].home;
        f.gathered = {
          from: { x: f.x, y: f.y, angle: f.angle, scale: f.scale, unmade: f.unmade },
          to: { x: cx + home[0] * markScale, y: cy + home[1] * markScale, scale: markScale }
        };
        members.push(f);
      });
      cycle.state = 'gathering';
      cycle.started = clock;
      cycle.members = members;
    }

    // Move the gathering letters along their paths, settling upright and whole.
    // Writes: position, angle, scale and unmade of each member.
    function updateGathering() {
      var t = clamp((clock - cycle.started) / SETTINGS.gatherSeconds, 0, 1);
      var e = smooth(t);
      cycle.members.forEach(function (f) {
        var g = f.gathered;
        f.x = g.from.x + (g.to.x - g.from.x) * e;
        f.y = g.from.y + (g.to.y - g.from.y) * e;
        f.scale = g.from.scale + (g.to.scale - g.from.scale) * e;
        f.radius = SHAPES[f.kind].extent * f.scale;
        // Turn to upright, allowing for the field's own rotation.
        f.angle = g.from.angle + turnBetween(g.from.angle, -fieldTurn) * e;
        f.unmade = g.from.unmade * (1 - e);
      });
      if (t >= 1) {
        cycle.state = 'holding';
        cycle.until = clock + SETTINGS.holdSeconds;
      }
    }

    // Break the mark: each letter starts unmaking and floats upwards.
    // Writes: cycle (back to drifting) and each member's motion.
    function releaseMark() {
      cycle.members.forEach(function (f) {
        f.gathered = null;
        f.direction = 1;
        f.rate = between(0.003, 0.005);
        f.vx = between(-0.3, 0.3);
        f.vy = between(-0.4, -0.2);
        f.spin = between(-0.0025, 0.0025);
      });
      cycle.members = [];
      cycle.state = 'drifting';
      cycle.next = clock + between(SETTINGS.gatherEvery[0], SETTINGS.gatherEvery[1]);
    }

    // Is the cursor over the gathered mark?
    function pointerOnMark() {
      if (mouseX < 0) return false;
      return cycle.members.some(function (f) {
        return Math.hypot(f.x - mouseX, f.y - mouseY) < f.radius;
      });
    }

    // Advance one drifting letter by `k` frames' worth of motion.
    function updateDrifting(f, i, k, speedUp, mouseOnScreen) {
      k *= SETTINGS.pace;   // everything below moves at the calmer pace
      f.x += f.vx * speedUp * k;
      // Letters travel with the scroll: down the page, they slide up the screen.
      f.y += (f.vy * speedUp - scrollSpeed * 0.008) * k;
      f.angle += f.spin * speedUp * k;

      // Wrap round the screen edges.
      var pad = f.radius * 1.4;
      if (f.x < -pad) f.x = W + pad;
      if (f.x > W + pad) f.x = -pad;
      if (f.y < -pad) f.y = H + pad;
      if (f.y > H + pad) f.y = -pad;

      // Overlapping letters start coming apart and nudge away from each other.
      for (var j = i + 1; j < forms.length; j++) {
        var g = forms[j];
        if (!isDrifting(g)) continue;
        var d = Math.hypot(f.x - g.x, f.y - g.y);
        if (d < (f.radius + g.radius) * 0.7) {
          f.direction = 1; g.direction = 1;
          var nx = (f.x - g.x) / (d || 1), ny = (f.y - g.y) / (d || 1);
          f.vx += nx * 0.006; f.vy += ny * 0.006;
          g.vx -= nx * 0.006; g.vy -= ny * 0.006;
        }
      }

      // The cursor pulls nearby letters apart.
      if (mouseOnScreen && Math.hypot(f.x - mouseX, f.y - mouseY) < f.radius * SETTINGS.mouseReach) {
        f.unmade = Math.min(1, f.unmade + 0.012 * k);
        f.direction = 1;
      }

      // Unmake, then remake. Once whole again, sometimes return as another letter,
      // except the first three, which stay one of each (see resizeField) and
      // are the hero letters when the page has a hero logo.
      f.unmade += f.direction * f.rate * speedUp * k;
      if (f.unmade >= 1) { f.unmade = 1; f.direction = -1; }
      if (f.unmade <= 0) {
        f.unmade = 0;
        f.direction = 1;
        if (i >= KINDS.length && Math.random() < SETTINGS.respawnChance) {
          var next = makeForm(null, f.x, f.y);
          next.unmade = 0;
          forms[i] = next;
          f = next;
        }
      }

      // Slowly let released letters calm down to the usual drift.
      f.vx = clamp(f.vx * (1 - 0.002 * k), -0.7, 0.7);
      f.vy = clamp(f.vy, -0.7, 0.5);
      f.spin = clamp(f.spin * (1 - 0.002 * k), -0.003, 0.003);
    }

    // Is this letter moving freely (not gathering, not held in the hero)?
    function isDrifting(f) {
      return !f.gathered && (!f.hero || f.hero.state === 'loose');
    }

    // Where each hero letter belongs right now, in screen pixels, read from
    // the SVG's current position (it moves as the page scrolls).
    // Returns null if the logo isn't laid out (for example, display: none).
    function readHeroAnchors() {
      var rect = heroSvg.getBoundingClientRect();
      if (!rect.width) return null;
      var scale = rect.width / HERO_VIEWBOX[2];
      var anchors = {};
      KINDS.forEach(function (kind) {
        var centre = LETTERS[kind].centre;
        anchors[kind] = {
          x: rect.left + (centre[0] - HERO_VIEWBOX[0]) * scale,
          y: rect.top + (centre[1] - HERO_VIEWBOX[1]) * scale,
          scale: scale
        };
      });
      return anchors;
    }

    // Make forms[0..2] the hero letters and hide the SVG logo they replace.
    // Each hero letter is in one of three states:
    //   held:      sits exactly on the logo, in full ink
    //   loose:     drifts like any other letter, fading to a hairline
    //   returning: travels back to the logo over heroReturnSeconds
    // Writes: the first three forms' hero state, and a class on the SVG.
    function setUpHero() {
      if (!heroSvg) return;
      var y = window.scrollY || 0;
      for (var i = 0; i < KINDS.length; i++) {
        var f = forms[i];
        var releaseAt = H * SETTINGS.heroRelease[i];
        var startsHeld = y <= releaseAt;
        f.hero = { state: startsHeld ? 'held' : 'loose', releaseAt: releaseAt, from: null, started: 0 };
        f.ink = startsHeld ? 1 : 0;
        f.unmade = startsHeld ? 0 : f.unmade;
        f.appear = 0;
      }
      // Hidden by opacity, so screen readers still find the logo's label.
      heroSvg.classList.add('is-animated');
    }

    // Set a held hero letter loose: it drifts upwards and starts unmaking.
    // Writes: the letter's state and motion.
    function setLoose(f) {
      f.hero.state = 'loose';
      f.direction = 1;
      f.rate = between(0.002, 0.0035);
      f.vx = between(-0.25, 0.25);
      f.vy = between(-0.45, -0.25);
      f.spin = between(-0.0018, 0.0018);
    }

    // Advance the hero letters by `k` frames.
    // Writes: each hero letter's state, position, scale, angle, unmade and ink.
    function updateHero(k) {
      var anchors = readHeroAnchors();
      if (!anchors) return;
      var y = window.scrollY || 0;
      var fade = k / 60 / SETTINGS.heroFadeSeconds;

      for (var i = 0; i < KINDS.length; i++) {
        var f = forms[i], hero = f.hero, home = anchors[f.kind];
        hero.releaseAt = H * SETTINGS.heroRelease[i];
        // Fade in on page load, just after the hero text starts to rise.
        f.appear = Math.min(1, f.appear + k / 60 / 0.8);

        if (hero.state === 'held') {
          if (y > hero.releaseAt) { setLoose(f); continue; }
          f.x = home.x; f.y = home.y;
          f.scale = home.scale;
          f.radius = SHAPES[f.kind].extent * f.scale;
          f.angle = -fieldTurn;          // upright, whatever the field's turn
          f.unmade = 0;
          f.ink = 1;
        } else if (hero.state === 'loose') {
          f.ink = Math.max(0, f.ink - fade);
          // Back near the top: head home. Half the release distance, so a
          // small scroll back and forth doesn't flicker between states.
          if (y < hero.releaseAt * 0.5) {
            if (f.gathered) releaseMark();
            hero.state = 'returning';
            hero.started = clock;
            hero.from = { x: f.x, y: f.y, scale: f.scale, angle: f.angle, unmade: f.unmade, ink: f.ink };
          }
        } else if (hero.state === 'returning') {
          if (y > hero.releaseAt) { setLoose(f); continue; }
          var e = smooth(clamp((clock - hero.started) / SETTINGS.heroReturnSeconds, 0, 1));
          f.x = mix(hero.from.x, home.x, e);
          f.y = mix(hero.from.y, home.y, e);
          f.scale = mix(hero.from.scale, home.scale, e);
          f.radius = SHAPES[f.kind].extent * f.scale;
          f.angle = hero.from.angle + turnBetween(hero.from.angle, -fieldTurn) * e;
          f.unmade = hero.from.unmade * (1 - e);
          f.ink = mix(hero.from.ink, 1, e);
          if (e >= 1) hero.state = 'held';
        }
      }
    }

    // Advance the whole field by `k` frames (1 = one 60fps frame).
    function updateField(k) {
      clock += k / 60;
      scrollPush *= Math.pow(0.9, k);
      scrollSpeed += (scrollPush - scrollSpeed) * (1 - Math.pow(1 - SETTINGS.scrollEase, k));
      fieldTurn += scrollSpeed * 0.00006 * k;
      var speedUp = 1 + Math.min(SETTINGS.maxScrollSpeedUp - 1, Math.abs(scrollSpeed) * 0.015);
      var mouseOnScreen = mouseX > 0 && mouseY > 0 && mouseX < W && mouseY < H;

      if (heroSvg) updateHero(k);

      // Gather the mark in the background only once the hero logo has come
      // apart; while the logo is whole at the top, one mark is enough.
      if (cycle.state === 'drifting' && clock >= cycle.next) {
        var heroIsWhole = heroSvg && forms.slice(0, KINDS.length).some(function (f) {
          return f.hero && f.hero.state !== 'loose';
        });
        if (heroIsWhole) cycle.next = clock + 3;
        else beginGathering();
      }
      if (cycle.state === 'gathering') updateGathering();
      if (cycle.state === 'holding') {
        // Keep the mark upright while the page scrolls under it.
        cycle.members.forEach(function (f) { f.angle = -fieldTurn; });
        if (clock >= cycle.until || pointerOnMark()) releaseMark();
      }

      for (var i = 0; i < forms.length; i++) {
        if (isDrifting(forms[i])) updateDrifting(forms[i], i, k, speedUp, mouseOnScreen);
      }
    }

    // Draw the field: everything in the usual colours, then, inside each
    // inverted band on screen, the band's background and everything again inverted.
    function paint() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < forms.length; i++) drawForm(forms[i], PALETTE);
      invertBands.forEach(paintInverted);
    }

    // Paint one inverted band: its indigo, then the letters in grey,
    // clipped to the band so nothing spills over its edges.
    function paintInverted(element) {
      var band = element.getBoundingClientRect();
      if (band.bottom <= 0 || band.top >= H) return;   // band is off screen
      ctx.save();
      ctx.beginPath();
      ctx.rect(band.left, band.top, band.width, band.height);
      ctx.clip();
      ctx.fillStyle = 'rgb(' + INVERTED.background.join(',') + ')';
      ctx.fillRect(band.left, band.top, band.width, band.height);
      for (var i = 0; i < forms.length; i++) drawForm(forms[i], INVERTED);
      ctx.restore();
    }

    function frame(time) {
      // Scale motion by real elapsed time, so it runs at the same speed on
      // 60Hz and 120Hz screens. Cap the step so a background tab doesn't jump.
      var k = lastTime ? clamp((time - lastTime) / (1000 / 60), 0, 3) : 1;
      lastTime = time;
      updateField(k);
      paint();
      requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', function () {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      scrollPush += y - lastScroll;
      lastScroll = y;
    }, { passive: true });
    window.addEventListener('resize', resizeField);
    window.addEventListener('pointermove', function (e) { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('pointerleave', function () { mouseX = -1; mouseY = -1; });

    resizeField();
    setUpHero();
    requestAnimationFrame(frame);
  }

  function boot() { start(document.querySelector('canvas[data-agm-bg]')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
