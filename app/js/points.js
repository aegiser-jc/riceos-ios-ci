/* Points engine -- JS port of proto/riceproto/engine.py evaluate()/in_force()/week_start().
   Rules are data (data/ruleset_v2.json); the ledger is append-only (reversals, never edits). */
(function (g) {
  'use strict';
  function weekStart(ts) {
    var d = new Date(ts); d.setHours(0, 0, 0, 0);
    var wd = (d.getDay() + 6) % 7; // Monday = 0, as Python weekday()
    d.setDate(d.getDate() - wd);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function inForce(ruleSets, ts) {
    var t = new Date(ts).getTime(), best = null;
    ruleSets.forEach(function (rs) {
      var f = new Date(rs.effective_from).getTime();
      var to = rs.effective_to ? new Date(rs.effective_to).getTime() : Infinity;
      if (f <= t && t < to && (!best || f > new Date(best.effective_from).getTime())) best = rs;
    });
    return best;
  }
  function condOk(cond, val) {
    if (cond !== null && typeof cond === 'object') {
      if (val === undefined || val === null) return false;
      if ('gte' in cond && !(val >= cond.gte)) return false;
      if ('lte' in cond && !(val <= cond.lte)) return false;
      if ('gt' in cond && !(val > cond.gt)) return false;
      if ('lt' in cond && !(val < cond.lt)) return false;
      if ('in' in cond && cond['in'].indexOf(val) < 0) return false;
      return true;
    }
    return cond === val;
  }
  /* Pure. used = {"ruleId|week": points so far}; mutated. */
  function evaluate(ruleSet, event, areaRai, areaSource, used) {
    var wk = weekStart(event.occurred_at), rows = [];
    ruleSet.rules.forEach(function (rule) {
      if (rule.when !== event.type) return;
      var c = rule.conditions || {};
      for (var k in c) if (!condOk(c[k], event.payload[k])) return;
      var f = rule.formula, pts = f.base * (f.per_rai ? (areaRai || 0) : 1);
      var key = rule.id + '|' + wk;
      if (f.cap_per_week != null) pts = Math.max(0, Math.min(pts, f.cap_per_week - (used[key] || 0)));
      used[key] = (used[key] || 0) + pts;
      var w = rule.league_weight == null ? 1 : rule.league_weight;
      rows.push({ rule_set_version: ruleSet.version, rule_id: rule.id,
        points: Math.round(pts * 100) / 100, league_points: Math.round(pts * w * 100) / 100,
        per_rai_basis: f.per_rai ? areaRai : null, area_source: f.per_rai ? areaSource : null,
        inputs: { payload: event.payload, area_rai: areaRai, week: wk, formula: f } });
    });
    return rows;
  }
  function usedFromLedger(ledger) {
    var u = {};
    ledger.forEach(function (r) { var k = r.rule_id + '|' + weekStart(r.occurred_at); u[k] = (u[k] || 0) + r.points; });
    return u;
  }
  g.RicePoints = { weekStart: weekStart, inForce: inForce, evaluate: evaluate, usedFromLedger: usedFromLedger };
})(typeof window !== 'undefined' ? window : globalThis);
