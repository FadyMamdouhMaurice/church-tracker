// ─────────────────────────────────────────────
//  js/points.js  —  Points calculation engine
//
//  Rules:
//    Sunday school attendance  = 1 pt / week
//    Mass attendance           = 1 pt / friday
//    Both in same week         = 1 bonus pt
//
//  All calculated on-the-fly from Firestore records
//  Admin can add manual adjustments stored in Firestore
// ─────────────────────────────────────────────

const Points = (() => {

  // ── Core calculation ───────────────────────
  // Returns { monthly, total, breakdown } for one student
  const calcStudent = (studentId, records, manualAdj = []) => {
    const now      = new Date();
    const monthYM  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    // Get relevant records
    const attRecs  = records.filter(r => r.type === 'attendance'      && r.studentId === studentId && r.present);
    const massRecs = records.filter(r => r.type === 'mass-attendance' && r.studentId === studentId && r.present);

    // Group by week
    const attWeeks  = new Set(attRecs.map(r => r.week));
    const massWeeks = new Set(massRecs.map(r => r.week));

    // All weeks that have any activity
    const allWeeks  = new Set([...attWeeks, ...massWeeks]);

    let totalPts = 0, monthlyPts = 0;
    const weekBreakdown = [];

    allWeeks.forEach(week => {
      if (!week) return;
      const hasAtt  = attWeeks.has(week);
      const hasMass = massWeeks.has(week);
      const bonus   = hasAtt && hasMass ? 1 : 0;
      const pts     = (hasAtt ? 1 : 0) + (hasMass ? 1 : 0) + bonus;

      totalPts += pts;
      if (week.startsWith(monthYM)) monthlyPts += pts;

      weekBreakdown.push({ week, hasAtt, hasMass, bonus, pts });
    });

    // Add manual adjustments
    const myAdj    = manualAdj.filter(a => a.studentId === studentId);
    const adjTotal = myAdj.reduce((s, a) => s + (a.points ?? 0), 0);
    const adjMonth = myAdj
      .filter(a => a.date?.startsWith(monthYM))
      .reduce((s, a) => s + (a.points ?? 0), 0);

    return {
      studentId,
      total:   totalPts + adjTotal,
      monthly: monthlyPts + adjMonth,
      breakdown: weekBreakdown.sort((a,b) => b.week.localeCompare(a.week)),
      adjustments: myAdj,
    };
  };

  // ── Leaderboard for a set of students ──────
  const leaderboard = (students, records, manualAdj = [], mode = 'monthly', limit = 10) => {
    return students
      .map(s => ({ ...s, ...calcStudent(s.id, records, manualAdj) }))
      .sort((a, b) => b[mode] - a[mode])
      .slice(0, limit);
  };

  // ── Load manual adjustments from Firestore ─
  const loadAdjustments = async () => {
    try {
      const snap = await firebase.firestore()
        .collection('point_adjustments').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      return [];
    }
  };

  // ── Save manual adjustment (admin) ─────────
  const saveAdjustment = async (studentId, points, note, by) => {
    await firebase.firestore().collection('point_adjustments').add({
      studentId,
      points,
      note:      note || '',
      by:        by   || '',
      date:      new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  };

  // ── Medal helper ───────────────────────────
  const medal = (rank) => ['🥇','🥈','🥉'][rank] ?? `${rank+1}.`;

  return { calcStudent, leaderboard, loadAdjustments, saveAdjustment, medal };
})();
