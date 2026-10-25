/* Secret Santa Paws – countries, spreadsheet checks and matching.
   Everything here runs in the organiser's browser; nothing is sent anywhere. */

(function (root) {
  'use strict';

  /* ------------------------------------------------------------------
     COUNTRIES THE APP KNOWS ABOUT
     To add a new country, add one line in the same style, e.g.
       { name: 'Spain', also: ['España'] },
     "also" lists other spellings that mean the same country.
     ------------------------------------------------------------------ */
  var COUNTRIES = [
    { name: 'United Kingdom', also: ['UK', 'Great Britain', 'GB', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'] },
    { name: 'United States of America', also: ['USA', 'US', 'United States', 'America'] },
    { name: 'Canada', also: [] },
    { name: 'Australia', also: [] },
    { name: 'Iceland', also: [] },
    { name: 'Japan', also: [] },
    { name: 'Germany', also: ['Deutschland'] },
    { name: 'Netherlands', also: ['The Netherlands', 'Holland'] },
    { name: 'France', also: [] },
    { name: 'Italy', also: [] },
    { name: 'Croatia', also: [] }
  ];

  /* Groups that can be used in the "Will Send To" column. */
  var GROUPS = [
    {
      name: 'EU', also: ['European Union'],
      members: ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
        'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania',
        'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
        'Spain', 'Sweden']
    }
  ];

  var ANY_WORDS = ['any', 'anywhere', 'all', 'worldwide', 'anyone'];

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^the /, '');
  }

  var countryLookup = {};
  COUNTRIES.forEach(function (c) {
    [c.name].concat(c.also).forEach(function (n) { countryLookup[norm(n)] = c.name; });
  });
  var groupLookup = {};
  GROUPS.forEach(function (g) {
    [g.name].concat(g.also).forEach(function (n) { groupLookup[norm(n)] = g; });
  });

  function canonicalCountry(text) {
    return countryLookup[norm(text)] || null;
  }

  /* "Canada, USA" / "Canada or USA" / "UK & EU" -> list of terms */
  function splitTerms(text) {
    return String(text == null ? '' : text)
      .split(/\s*(?:,|;|\/|&|\+|\bor\b|\band\b)\s*/i)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });
  }

  /* Returns { any, countries: [canonical names], unknown: [terms not recognised] } */
  function parseSendTo(text) {
    var result = { any: false, countries: [], unknown: [] };
    var set = {};
    splitTerms(text).forEach(function (term) {
      var n = norm(term);
      if (ANY_WORDS.indexOf(n) !== -1) { result.any = true; return; }
      var c = countryLookup[n];
      if (c) { set[c] = true; return; }
      var g = groupLookup[n];
      if (g) { g.members.forEach(function (m) { set[m] = true; }); return; }
      result.unknown.push(term);
    });
    result.countries = Object.keys(set);
    return result;
  }

  /* ------------------------------------------------------------------
     READING THE SPREADSHEET ROWS
     rows: array of arrays (first row = headings), as SheetJS gives with header:1
     ------------------------------------------------------------------ */
  var FIELDS = {
    ig: 'IG Account',
    dog: "Dog's Name",
    address: 'Address',
    country: 'Country of Residence',
    sendTo: 'Will Send To',
    email: 'Email Address'
  };

  function headingField(h) {
    var n = String(h == null ? '' : h).toLowerCase().replace(/[^a-z]/g, '');
    if (!n) return null;
    if (n.indexOf('email') !== -1) return 'email';
    if (n.indexOf('sendto') !== -1 || n.indexOf('preferred') !== -1 || n.indexOf('gifting') !== -1) return 'sendTo';
    if (n.indexOf('residence') !== -1 || n === 'country') return 'country';
    if (n.indexOf('address') !== -1) return 'address';
    if (n.indexOf('dog') !== -1) return 'dog';
    if (n.indexOf('igaccount') !== -1 || n.indexOf('instagram') !== -1 || n === 'ig' || n === 'account') return 'ig';
    return null;
  }

  function cell(v) {
    return String(v == null ? '' : v).replace(/\r\n/g, '\n').trim();
  }

  /* Returns { people, errors: [text], warnings: [text] } */
  function readParticipants(rows) {
    var errors = [], warnings = [], people = [];
    // Find the heading row: the first row with at least 4 recognised headings
    var headRow = -1, map = {};
    for (var r = 0; r < Math.min(rows.length, 10); r++) {
      var m = {}, count = 0;
      (rows[r] || []).forEach(function (h, i) {
        var f = headingField(h);
        if (f && m[f] === undefined) { m[f] = i; count++; }
      });
      if (count >= 4) { headRow = r; map = m; break; }
    }
    if (headRow === -1) {
      errors.push('I couldn’t find the column headings. The first row should have: ' +
        Object.keys(FIELDS).map(function (k) { return FIELDS[k]; }).join(', ') + '.');
      return { people: people, errors: errors, warnings: warnings };
    }
    Object.keys(FIELDS).forEach(function (k) {
      if (map[k] === undefined) errors.push('The column “' + FIELDS[k] + '” is missing.');
    });
    if (errors.length) return { people: people, errors: errors, warnings: warnings };

    var seenIg = {}, seenEmail = {};
    for (var i = headRow + 1; i < rows.length; i++) {
      var row = rows[i] || [];
      var p = {
        row: i + 1,
        ig: cell(row[map.ig]),
        dog: cell(row[map.dog]),
        address: cell(row[map.address]),
        countryText: cell(row[map.country]),
        sendToText: cell(row[map.sendTo]),
        email: cell(row[map.email])
      };
      if (!p.ig && !p.dog && !p.address && !p.countryText && !p.sendToText && !p.email) continue; // blank row
      var where = 'Row ' + p.row + (p.ig ? ' (' + p.ig + ')' : '') + ': ';

      if (!p.ig) errors.push(where + 'the IG Account is blank.');
      if (!p.email) errors.push(where + 'the Email Address is blank.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push(where + '“' + p.email + '” doesn’t look like an email address.');
      if (!p.address) errors.push(where + 'the Address is blank.');
      if (!p.dog) warnings.push(where + 'the Dog’s Name is blank.');

      p.country = canonicalCountry(p.countryText);
      if (!p.countryText) errors.push(where + 'the Country of Residence is blank.');
      else if (!p.country) errors.push(where + 'the Country of Residence “' + p.countryText + '” isn’t on the app’s country list.');

      var st = parseSendTo(p.sendToText);
      p.any = st.any;
      p.allowed = st.countries;
      if (!p.sendToText) errors.push(where + 'Will Send To is blank (write “Any” if they’ll send anywhere).');
      st.unknown.forEach(function (u) {
        errors.push(where + 'Will Send To includes “' + u + '”, which isn’t on the app’s list.');
      });

      if (p.ig) {
        var k = norm(p.ig).replace(/^@/, '');
        if (seenIg[k]) errors.push(where + 'this IG Account also appears on row ' + seenIg[k] + '.');
        else seenIg[k] = p.row;
      }
      if (p.email) {
        var e = p.email.toLowerCase();
        if (seenEmail[e]) warnings.push(where + 'this email address also appears on row ' + seenEmail[e] + '. That’s fine if one person runs two accounts.');
        else seenEmail[e] = p.row;
      }
      people.push(p);
    }

    if (people.length < 2) errors.push('At least two people are needed for a draw.');

    // Warn about restricted senders whose countries have nobody in them
    if (!errors.length) {
      var living = {};
      people.forEach(function (p) { living[p.country] = (living[p.country] || 0) + 1; });
      people.forEach(function (p) {
        if (p.any) return;
        var reachable = people.filter(function (q) { return q !== p && p.allowed.indexOf(q.country) !== -1; }).length;
        if (reachable === 0) {
          warnings.push('Row ' + p.row + ' (' + p.ig + '): will only send to ' + describeSendTo(p) +
            ', but nobody else in the group lives there, so no match is possible for them.');
        }
      });
    }
    return { people: people, errors: errors, warnings: warnings };
  }

  function describeSendTo(p) {
    if (p.any) return 'anywhere';
    return p.sendToText;
  }

  /* ------------------------------------------------------------------
     MATCHING
     assign[g] = index of the person that giver g sends to.
     ------------------------------------------------------------------ */
  function canSend(people, g, r) {
    if (g === r) return false;
    var giver = people[g];
    return giver.any || giver.allowed.indexOf(people[r].country) !== -1;
  }

  function shuffled(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildAdj(people) {
    var n = people.length, adj = [];
    for (var g = 0; g < n; g++) {
      adj.push([]);
      for (var r = 0; r < n; r++) if (canSend(people, g, r)) adj[g].push(r);
    }
    return adj;
  }

  /* Maximum bipartite matching (augmenting paths), in random order */
  function maxMatching(adj, rng) {
    var n = adj.length;
    var matchG = new Array(n).fill(-1), matchR = new Array(n).fill(-1);
    var radj = adj.map(function (list) { return shuffled(list, rng); });
    function tryGiver(g, seen) {
      var list = radj[g];
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (seen[r]) continue;
        seen[r] = true;
        if (matchR[r] === -1 || tryGiver(matchR[r], seen)) {
          matchG[g] = r; matchR[r] = g;
          return true;
        }
      }
      return false;
    }
    shuffled(adj.map(function (_, i) { return i; }), rng).forEach(function (g) {
      tryGiver(g, new Array(n).fill(false));
    });
    return { matchG: matchG, matchR: matchR };
  }

  function findSwaps(assign) {
    var swaps = [];
    for (var g = 0; g < assign.length; g++) {
      var r = assign[g];
      if (r > g && assign[r] === g) swaps.push([g, r]);
    }
    return swaps;
  }

  /* Try to break up two-person swaps by exchanging recipients with someone else */
  function reduceSwaps(people, assign, rng) {
    var improved = true, guard = 0;
    while (improved && guard++ < 500) {
      improved = false;
      var swaps = findSwaps(assign);
      if (!swaps.length) return assign;
      var before = swaps.length;
      outer:
      for (var s = 0; s < swaps.length; s++) {
        var pair = swaps[s];
        for (var side = 0; side < 2; side++) {
          var a = pair[side];
          var others = shuffled(assign.map(function (_, i) { return i; }), rng);
          for (var k = 0; k < others.length; k++) {
            var c = others[k];
            if (c === pair[0] || c === pair[1]) continue;
            var ra = assign[a], rc = assign[c];
            if (canSend(people, a, rc) && canSend(people, c, ra)) {
              assign[a] = rc; assign[c] = ra;
              if (findSwaps(assign).length < before) { improved = true; break outer; }
              assign[a] = ra; assign[c] = rc; // undo
            }
          }
        }
      }
    }
    return assign;
  }

  /* Explain why no complete match exists, using the people who block it */
  function explainFailure(people, adj, mm) {
    var n = people.length, problems = [], seenKeys = {};

    function label(i) { return people[i].ig + ' (' + people[i].country + ')'; }
    function add(kind, groupIdx, helperIdx) {
      var key = kind + ':' + groupIdx.slice().sort(function (x, y) { return x - y; }).join(',');
      if (seenKeys[key]) return;
      seenKeys[key] = true;
      problems.push({ kind: kind, group: groupIdx, helpers: helperIdx, size: groupIdx.length });
    }

    // Receivers nobody (or too few people) can send to
    for (var r0 = 0; r0 < n; r0++) {
      if (mm.matchR[r0] !== -1) continue;
      var S = [r0], inS = {}, T = [], inT = {};
      inS[r0] = true;
      for (var qi = 0; qi < S.length; qi++) {
        var r = S[qi];
        for (var g = 0; g < n; g++) {
          if (inT[g] || adj[g].indexOf(r) === -1) continue;
          inT[g] = true; T.push(g);
          var nr = mm.matchG[g];
          if (nr !== -1 && !inS[nr]) { inS[nr] = true; S.push(nr); }
        }
      }
      add('receive', S, T);
    }
    // Givers with too few people they're allowed to send to
    for (var g0 = 0; g0 < n; g0++) {
      if (mm.matchG[g0] !== -1) continue;
      var G = [g0], inG = {}, R = [], inR = {};
      inG[g0] = true;
      for (var qj = 0; qj < G.length; qj++) {
        adj[G[qj]].forEach(function (rr) {
          if (inR[rr]) return;
          inR[rr] = true; R.push(rr);
          var ng = mm.matchR[rr];
          if (ng !== -1 && !inG[ng]) { inG[ng] = true; G.push(ng); }
        });
      }
      add('send', G, R);
    }

    // Smallest (most specific) problems first; skip any that overlap one already shown
    problems.sort(function (a, b) { return a.size - b.size; });
    var shown = [], used = {};
    problems.forEach(function (p) {
      if (p.group.some(function (i) { return used[i]; })) return;
      p.group.forEach(function (i) { used[i] = true; });
      shown.push(p);
    });
    function list(idx) {
      var names = idx.map(label);
      return names.length > 10 ? names.slice(0, 10).join(', ') + ' and ' + (names.length - 10) + ' others' : names.join(', ');
    }
    return shown.slice(0, 5).map(function (p) {
      var who = list(p.group);
      var helpers = list(p.helpers);
      if (p.kind === 'receive') {
        if (!p.helpers.length) {
          return 'Nobody is able to send a gift to ' + who +
            ': everyone else has limited where they will send. At least one person needs to change to “Any” or add ' +
            people[p.group[0]].country + ' to their Will Send To.';
        }
        return 'These ' + p.group.length + ' people can only be sent gifts by ' + p.helpers.length +
          (p.helpers.length === 1 ? ' person' : ' people') + ', so someone would be left out.\n' +
          'Need a Secret Santa: ' + who + '.\nThe only people allowed to send to them: ' + helpers +
          '.\nOne more person needs to be willing to send to their country (or “Any”).';
      }
      if (!p.helpers.length) {
        return who + ' will only send to ' + describeSendTo(people[p.group[0]]) +
          ', but nobody else in the group lives there.';
      }
      return 'These ' + p.group.length + ' people have limited where they will send, and between them there are only ' +
        p.helpers.length + (p.helpers.length === 1 ? ' person' : ' people') + ' they are allowed to send to.\n' +
        'Restricted senders: ' + who + '.\nPeople they could send to: ' + helpers +
        '.\nOne of them needs to widen their Will Send To.';
    });
  }

  /* Main entry point.
     Returns { ok, assign, swaps, forcedSwaps, attempts } or { ok:false, problems } */
  function makeMatches(people, rng, attempts) {
    rng = rng || Math.random;
    attempts = attempts || 300;
    var adj = buildAdj(people);
    var n = people.length;
    var best = null;
    for (var t = 0; t < attempts; t++) {
      var mm = maxMatching(adj, rng);
      if (mm.matchG.indexOf(-1) !== -1) {
        // Augmenting paths find a full match whenever one exists, so this is a real impossibility
        return { ok: false, problems: explainFailure(people, adj, mm) };
      }
      var assign = reduceSwaps(people, mm.matchG.slice(), rng);
      var swaps = findSwaps(assign);
      if (!best || swaps.length < best.swaps.length) best = { assign: assign, swaps: swaps };
      if (!best.swaps.length) break;
    }
    // A swap is "forced" when each of the pair can send to nobody but the other
    var forced = best.swaps.filter(function (pr) {
      return adj[pr[0]].length === 1 && adj[pr[1]].length === 1;
    });
    return { ok: true, assign: best.assign, swaps: best.swaps, forcedSwaps: forced, attempts: t + 1, n: n };
  }

  /* Independent check of a finished draw. Returns { ok, lines: [{ok, text}] } */
  function verify(people, assign) {
    var n = people.length, lines = [];
    var gives = assign.length === n && assign.every(function (r) { return r >= 0 && r < n; });
    var received = new Array(n).fill(0);
    if (gives) assign.forEach(function (r) { received[r]++; });
    var receivesOnce = gives && received.every(function (c) { return c === 1; });
    var noSelf = gives && assign.every(function (r, g) { return r !== g; });
    var badRule = [];
    if (gives) assign.forEach(function (r, g) { if (r !== g && !canSend(people, g, r)) badRule.push(people[g].ig); });
    lines.push({ ok: gives, text: 'Everyone (' + n + ') sends exactly one gift' });
    lines.push({ ok: receivesOnce, text: 'Everyone receives exactly one gift' });
    lines.push({ ok: noSelf, text: 'Nobody is sending to themselves' });
    lines.push({ ok: gives && badRule.length === 0, text: badRule.length ?
      'Country rules broken for: ' + badRule.join(', ') : 'Every match follows the Will Send To rules' });
    return { ok: lines.every(function (l) { return l.ok; }), lines: lines };
  }

  var api = {
    COUNTRIES: COUNTRIES, GROUPS: GROUPS, FIELDS: FIELDS,
    canonicalCountry: canonicalCountry, parseSendTo: parseSendTo, readParticipants: readParticipants,
    canSend: canSend, makeMatches: makeMatches, verify: verify, findSwaps: findSwaps
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSP = api;
})(this);
