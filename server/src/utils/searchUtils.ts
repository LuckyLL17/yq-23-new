import { pinyin } from 'pinyin-pro';

export function toPinyin(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'string' }).replace(/\s+/g, '');
}

export function toPinyinInitials(text: string): string {
  return pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' }).replace(/\s+/g, '');
}

export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

export function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

export function fuzzyMatch(target: string, query: string, threshold: number = 0.6): boolean {
  const targetLower = target.toLowerCase();
  const queryLower = query.toLowerCase();

  if (targetLower.includes(queryLower)) {
    return true;
  }

  const targetPinyin = toPinyin(target);
  const queryPinyin = toPinyin(query);
  if (targetPinyin.includes(queryPinyin)) {
    return true;
  }

  const targetInitials = toPinyinInitials(target);
  const queryInitials = toPinyinInitials(query);
  if (targetInitials.includes(queryInitials) && queryInitials.length >= 2) {
    return true;
  }

  const similarity = stringSimilarity(targetLower, queryLower);
  if (similarity >= threshold) {
    return true;
  }

  const pinyinSimilarity = stringSimilarity(targetPinyin, queryPinyin);
  if (pinyinSimilarity >= threshold) {
    return true;
  }

  return false;
}

export function getMatchScore(target: string, query: string): number {
  const targetLower = target.toLowerCase();
  const queryLower = query.toLowerCase();
  let score = 0;

  if (targetLower === queryLower) {
    score += 100;
  } else if (targetLower.startsWith(queryLower)) {
    score += 80;
  } else if (targetLower.includes(queryLower)) {
    score += 60;
  }

  const targetPinyin = toPinyin(target);
  const queryPinyin = toPinyin(query);
  if (targetPinyin === queryPinyin) {
    score += 70;
  } else if (targetPinyin.startsWith(queryPinyin)) {
    score += 50;
  } else if (targetPinyin.includes(queryPinyin)) {
    score += 40;
  }

  const targetInitials = toPinyinInitials(target);
  const queryInitials = toPinyinInitials(query);
  if (targetInitials.includes(queryInitials) && queryInitials.length >= 2) {
    score += 30;
  }

  score += stringSimilarity(targetLower, queryLower) * 20;

  return score;
}
