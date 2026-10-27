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
    { name: 'Croatia', also: [] },
    { name: 'Sweden', also: ['Sverige'] },
    { name: 'Thailand', also: [] }
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
  function accountKey(ig) { return norm(ig).replace(/^@/, ''); }

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
    result.countries = Object.keys(set).sort();
    return result;
  }

  /* Works out each entry's account, and whether the account has several entries.
     Each person needs .ig, .country and .sendToText. Adds .account, .any, .allowed, .multi */
  function prepare(people) {
    var count = {};
    people.forEach(function (p) {
      p.account = accountKey(p.ig);
      var st = parseSendTo(p.sendToText);
      p.any = st.any;
      p.allowed = st.countries;
      count[p.account] = (count[p.account] || 0) + 1;
    });
    people.forEach(function (p) { p.multi = count[p.account] > 1; });
    return people;
  }

  /* "westiedog – Isla (Canada)" when the account has several entries, else "westiedog (Canada)" */
  function label(p, withCountry) {
    return p.ig + (p.multi ? ' – ' + p.dog : '') + (withCountry === false ? '' : ' (' + p.country + ')');
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

    var seenEntry = {}, firstOfAccount = {}, emailAccount = {};
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
      var where = 'Row ' + p.row + (p.ig ? ' (' + p.ig + (p.dog ? ' – ' + p.dog : '') + ')' : '') + ': ';

      if (!p.ig) errors.push(where + 'the IG Account is blank.');
      if (!p.email) errors.push(where + 'the Email Address is blank.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push(where + '“' + p.email + '” doesn’t look like an email address.');
      if (!p.address) errors.push(where + 'the Address is blank.');
      if (!p.dog) warnings.push(where + 'the Dog’s Name is blank.');

      p.country = canonicalCountry(p.countryText);
      if (!p.countryText) errors.push(where + 'the Country of Residence is blank.');
      else if (!p.country) errors.push(where + 'the Country of Residence “' + p.countryText + '” isn’t on the app’s country list.');

      var st = parseSendTo(p.sendToText);
      if (!p.sendToText) errors.push(where + 'Will Send To is blank (write “Any” if they’ll send anywhere).');
      st.unknown.forEach(function (u) {
        errors.push(where + 'Will Send To includes “' + u + '”, which isn’t on the app’s list.');
      });

      if (p.ig) {
        var acc = accountKey(p.ig);
        var entry = acc + '|' + norm(p.dog);
        if (seenEntry[entry]) errors.push(where + 'this account and dog also appear on row ' + seenEntry[entry] + '.');
        else seenEntry[entry] = p.row;

        // Every entry for one account must have the same country and Will Send To
        var first = firstOfAccount[acc];
        if (!first) firstOfAccount[acc] = { row: p.row, country: p.country, countryText: p.countryText, send: st, sendToText: p.sendToText };
        else {
          if (p.country && first.country && p.country !== first.country) {
            errors.push(where + 'Country of Residence is “' + p.countryText + '”, but row ' + first.row +
              ' for the same account says “' + first.countryText + '”. All entries for one account must be the same.');
          }
          if (!st.unknown.length && (st.any !== first.send.any || st.countries.join('|') !== first.send.countries.join('|'))) {
            errors.push(where + 'Will Send To is “' + p.sendToText + '”, but row ' + first.row +
              ' for the same account says “' + first.sendToText + '”. All entries for one account must be the same.');
          }
        }
        if (p.email) {
          var e = p.email.toLowerCase();
          if (emailAccount[e] && emailAccount[e].acc !== acc) {
            warnings.push(where + 'this email address is also used by a different account on row ' + emailAccount[e].row +
              '. That’s fine if one person runs both accounts, but those two accounts could be matched with each other.');
          } else if (!emailAccount[e]) emailAccount[e] = { acc: acc, row: p.row };
        }
      }
      people.push(p);
    }

    if (people.length < 2) errors.push('At least two entries are needed for a draw.');
    prepare(people);

    // Warn about restricted senders who have nobody they could send to
    if (!errors.length) {
      var warned = {};
      people.forEach(function (p, g) {
        if (p.any || warned[p.account]) return;
        var reachable = people.some(function (q, r) { return canSend(people, g, r); });
        if (!reachable) {
          warned[p.account] = true;
          warnings.push('Row ' + p.row + ' (' + p.ig + '): will only send to ' + p.sendToText +
            ', but nobody from another account lives there, so no match is possible for them.');
        }
      });
    }
    return { people: people, errors: errors, warnings: warnings };
  }

  /* ------------------------------------------------------------------
     MATCHING
     assign[g] = index of the entry that entry g sends to.
     Fixed rules: Will Send To, never to your own account, one gift each way.
     Avoided where possible (in this order):
       1. one account sending to the same account more than once
       2. two accounts sending to each other (a swap)
     ------------------------------------------------------------------ */
  function canSend(people, g, r) {
    var giver = people[g], receiver = people[r];
    if (g === r || giver.account === receiver.account) return false;
    return giver.any || giver.allowed.indexOf(receiver.country) !== -1;
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

  /* Lists the "avoid where possible" situations in a draw */
  function analyse(people, assign) {
    var links = {}, doubles = [], swaps = [];
    assign.forEach(function (r, g) {
      var k = people[g].account + '>' + people[r].account;
      (links[k] = links[k] || []).push(g);
    });
    Object.keys(links).forEach(function (k) {
      var gs = links[k];
      if (gs.length > 1) doubles.push({ givers: gs, receivers: gs.map(function (g) { return assign[g]; }) });
      var parts = k.split('>');
      if (parts[0] < parts[1] && links[parts[1] + '>' + parts[0]]) {
        swaps.push({ a: gs[0], b: links[parts[1] + '>' + parts[0]][0] });
      }
    });
    return { doubles: doubles, swaps: swaps };
  }

  function score(people, assign) {
    var links = {}, dup = 0, sw = 0;
    for (var g = 0; g < assign.length; g++) {
      var k = people[g].account + '>' + people[assign[g]].account;
      if (links[k]) dup++; else links[k] = 1;
    }
    Object.keys(links).forEach(function (k) {
      var parts = k.split('>');
      if (parts[0] < parts[1] && links[parts[1] + '>' + parts[0]]) sw++;
    });
    return dup * 1000 + sw;
  }

  /* Rearrange recipients (keeping every fixed rule) to reduce the score.
     Keeps a count of links between accounts so each change is scored quickly. */
  function improve(people, assign, rng, iterations, allowed) {
    var n = assign.length, accIndex = {}, acc = [], na = 0;
    people.forEach(function (p, i) {
      if (accIndex[p.account] === undefined) accIndex[p.account] = na++;
      acc[i] = accIndex[p.account];
    });
    var cnt = new Int32Array(na * na);
    assign.forEach(function (r, g) { cnt[acc[g] * na + acc[r]]++; });
    // score contribution of the pair of accounts x, y (x != y)
    function pairScore(x, y) {
      var xy = cnt[x * na + y], yx = cnt[y * na + x];
      return (xy > 1 ? (xy - 1) * 1000 : 0) + (yx > 1 ? (yx - 1) * 1000 : 0) + (xy > 0 && yx > 0 ? 1 : 0);
    }
    function pairsOf(givers, receivers) {
      var seen = {}, list = [];
      for (var i = 0; i < givers.length; i++) {
        var x = acc[givers[i]], y = acc[receivers[i]];
        var k = x < y ? x * na + y : y * na + x;
        if (!seen[k]) { seen[k] = true; list.push([x, y]); }
      }
      return list;
    }
    function total(pairs) { var s = 0; for (var i = 0; i < pairs.length; i++) s += pairScore(pairs[i][0], pairs[i][1]); return s; }
    function move(givers, from, to) {
      for (var i = 0; i < givers.length; i++) {
        cnt[acc[givers[i]] * na + acc[from[i]]]--;
        cnt[acc[givers[i]] * na + acc[to[i]]]++;
        assign[givers[i]] = to[i];
      }
    }

    var cur = score(people, assign);
    for (var it = 0; it < iterations && cur > 0; it++) {
      var a = Math.floor(rng() * n), b = Math.floor(rng() * n);
      if (a === b) continue;
      var givers, from, to;
      if (rng() < 0.7) {           // exchange the recipients of a and b
        givers = [a, b]; from = [assign[a], assign[b]]; to = [assign[b], assign[a]];
      } else {                     // rotate the recipients of three entries
        var c = Math.floor(rng() * n);
        if (c === a || c === b) continue;
        givers = [a, b, c]; from = [assign[a], assign[b], assign[c]]; to = [assign[b], assign[c], assign[a]];
      }
      var okMove = true;
      for (var i = 0; i < givers.length; i++) if (!allowed[givers[i]][to[i]]) { okMove = false; break; }
      if (!okMove) continue;
      var pairs = pairsOf(givers.concat(givers), from.concat(to));
      var before = total(pairs);
      move(givers, from, to);
      var after = total(pairs);
      if (after <= before) cur += after - before;
      else move(givers, to, from);
    }
    return cur;
  }

  /* Explain why no complete match exists.
     Returns [{ title, lists: [{ heading, names: [] }], action }] */
  function explainFailure(people, adj, mm) {
    var n = people.length, problems = [], seenKeys = {};

    function add(kind, groupIdx, helperIdx) {
      var key = kind + ':' + groupIdx.slice().sort(function (x, y) { return x - y; }).join(',');
      if (seenKeys[key]) return;
      seenKeys[key] = true;
      problems.push({ kind: kind, group: groupIdx, helpers: helperIdx, size: groupIdx.length });
    }

    // Entries nobody (or too few) can send to
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
    // Senders with too few entries they're allowed to send to
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
    function names(idx) { return idx.map(function (i) { return label(people[i]); }); }
    function countries(idx) {
      var c = {};
      idx.forEach(function (i) { c[people[i].country] = true; });
      return Object.keys(c).sort().join(', ');
    }

    return shown.map(function (p) {
      var first = people[p.group[0]];
      if (p.kind === 'receive') {
        if (!p.helpers.length) {
          return {
            title: 'Nobody is able to send a gift to ' + label(first) + '.',
            lists: [],
            action: 'At least one person from another account needs to change to “Any” or add ' + first.country + ' to their Will Send To.'
          };
        }
        return {
          title: p.group.length + ' entries in ' + countries(p.group) + ' can only be sent gifts by ' +
            p.helpers.length + (p.helpers.length === 1 ? ' entry' : ' entries') + ', so one would be left out.',
          lists: [{ heading: 'Need a Secret Santa', names: names(p.group) },
                  { heading: 'The only entries allowed to send to them', names: names(p.helpers) }],
          action: 'One more person needs to be willing to send to ' + countries(p.group) + ' (or choose “Any”).'
        };
      }
      if (!p.helpers.length) {
        return {
          title: label(first) + ' will only send to ' + first.sendToText + ', but nobody from another account lives there.',
          lists: [],
          action: 'They need to widen their Will Send To.'
        };
      }
      return {
        title: p.group.length + ' entries have limited where they will send, and between them there are only ' +
          p.helpers.length + (p.helpers.length === 1 ? ' entry' : ' entries') + ' they are allowed to send to.',
        lists: [{ heading: 'Restricted senders', names: names(p.group) },
                { heading: 'Entries they could send to', names: names(p.helpers) }],
        action: 'One of them needs to widen their Will Send To.'
      };
    });
  }

  /* Main entry point. people must have been through readParticipants (or prepare).
     Returns { ok, assign, doubles, swaps } or { ok:false, problems } */
  function makeMatches(people, rng, restarts) {
    rng = rng || Math.random;
    restarts = restarts || 30;
    var adj = buildAdj(people);
    var n = people.length;
    var allowed = adj.map(function (list) {
      var row = new Uint8Array(n);
      list.forEach(function (r) { row[r] = 1; });
      return row;
    });
    var iterations = Math.max(5000, 300 * n);
    var best = null, bestScore = Infinity;
    for (var t = 0; t < restarts; t++) {
      var mm = maxMatching(adj, rng);
      if (mm.matchG.indexOf(-1) !== -1) {
        // Augmenting paths find a full match whenever one exists, so this is a real impossibility
        return { ok: false, problems: explainFailure(people, adj, mm) };
      }
      var assign = mm.matchG.slice();
      var s = improve(people, assign, rng, iterations, allowed);
      if (s < bestScore) { best = assign; bestScore = s; }
      if (bestScore === 0) break;
    }
    var a = analyse(people, best);
    return { ok: true, assign: best, doubles: a.doubles, swaps: a.swaps, n: n };
  }

  /* Independent check of a finished draw. Returns { ok, lines: [{ok, text}] } */
  function verify(people, assign) {
    var n = people.length, lines = [];
    var gives = assign.length === n && assign.every(function (r) { return r >= 0 && r < n; });
    var received = new Array(n).fill(0);
    if (gives) assign.forEach(function (r) { received[r]++; });
    var receivesOnce = gives && received.every(function (c) { return c === 1; });
    var ownAccount = [], badRule = [];
    if (gives) assign.forEach(function (r, g) {
      if (people[g].account === people[r].account) ownAccount.push(label(people[g], false));
      else if (!canSend(people, g, r)) badRule.push(label(people[g], false));
    });
    lines.push({ ok: gives, text: 'Every entry (' + n + ') sends exactly one gift' });
    lines.push({ ok: receivesOnce, text: 'Every entry receives exactly one gift' });
    lines.push({ ok: gives && ownAccount.length === 0, text: ownAccount.length ?
      'Sending to their own account: ' + ownAccount.join(', ') : 'Nobody is sending to their own account' });
    lines.push({ ok: gives && badRule.length === 0, text: badRule.length ?
      'Country rules broken for: ' + badRule.join(', ') : 'Every match follows the Will Send To rules' });
    return { ok: lines.every(function (l) { return l.ok; }), lines: lines };
  }

  var api = {
    COUNTRIES: COUNTRIES, GROUPS: GROUPS, FIELDS: FIELDS,
    canonicalCountry: canonicalCountry, parseSendTo: parseSendTo, readParticipants: readParticipants,
    prepare: prepare, label: label, accountKey: accountKey,
    canSend: canSend, makeMatches: makeMatches, verify: verify, analyse: analyse, score: score
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSP = api;
})(this);
