export interface LogEntry {
  ts: number;
  app: string;
}

export interface Segment {
  start: number;
  end: number;
  type: 'stone' | 'wave';
  app?: string;
}

/**
 * ログからセグメント（石/波の区間）を計算する
 */
export function computeSegments(
  logs: LogEntry[],
  targetApps: string[],
  selectedDate: string,
  prevDayLastLog?: LogEntry | null,
  limitMin?: number
): Segment[] {
  const totalMinutes = 24 * 60;
  const startOfDay = new Date(`${selectedDate}T00:00:00+09:00`).getTime();

  // limitMinが指定されない場合のデフォルト計算
  if (limitMin === undefined) {
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    const isToday = selectedDate === todayStr;
    const isFuture = selectedDate > todayStr;

    if (isToday) {
      const jstTimeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' });
      const [hours, minutes] = jstTimeStr.split(':').map(Number);
      limitMin = hours * 60 + minutes;
    } else if (isFuture) {
      limitMin = 0;
    } else {
      limitMin = totalMinutes;
    }
  }

  const sortedLogs = [...logs].sort((a, b) => a.ts - b.ts);
  const segments: Segment[] = [];

  if (targetApps.length === 0) return segments;

  let lastTs = startOfDay;
  let isStoneActive = prevDayLastLog ? targetApps.includes(prevDayLastLog.app) : false;
  let currentPrevLog = prevDayLastLog;

  sortedLogs.forEach((log) => {
    const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
    const endMin = (log.ts - startOfDay) / (1000 * 60);
    const effectiveEndMin = Math.min(endMin, limitMin!);

    if (effectiveEndMin > startMin) {
      const type = isStoneActive ? 'stone' : 'wave';
      if (segments.length > 0 && segments[segments.length - 1].type === type) {
        segments[segments.length - 1].end = effectiveEndMin;
      } else {
        segments.push({
          start: startMin,
          end: effectiveEndMin,
          type,
          app: isStoneActive ? (currentPrevLog?.app || 'Unknown') : undefined
        });
      }
    }

    isStoneActive = targetApps.includes(log.app);
    lastTs = log.ts;
    currentPrevLog = log;
  });

  // 最後のログから制限時刻まで
  const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
  if (startMin < limitMin) {
    const type = isStoneActive ? 'stone' : 'wave';
    if (segments.length > 0 && segments[segments.length - 1].type === type) {
      segments[segments.length - 1].end = limitMin;
    } else {
      segments.push({
        start: startMin,
        end: limitMin,
        type,
        app: isStoneActive ? (currentPrevLog?.app || 'Unknown') : undefined
      });
    }
  }

  return segments;
}

/**
 * セグメントから石/波の合計時間（分）を計算する
 */
export function computeStoneTotals(segments: Segment[]): { stoneMin: number; waveMin: number } {
  const stoneMin = segments.reduce((acc, seg) => seg.type === 'stone' ? acc + (seg.end - seg.start) : acc, 0);
  const waveMin = segments.reduce((acc, seg) => seg.type === 'wave' ? acc + (seg.end - seg.start) : acc, 0);
  return { stoneMin, waveMin };
}
