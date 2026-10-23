// Mock analytics data (the schema has no seat/quota tables yet).
export const branchSeats = [
  { branch: 'CSE',   sanctioned: 240, filled: 228 },
  { branch: 'AI&DS', sanctioned: 120, filled: 119 },
  { branch: 'IT',    sanctioned: 120, filled: 117 },
  { branch: 'ECE',   sanctioned: 180, filled: 161 },
  { branch: 'Mech',  sanctioned: 120, filled: 84 },
  { branch: 'Civil', sanctioned: 60,  filled: 38 },
  { branch: 'MBA',   sanctioned: 60,  filled: 63 }, // breach, drives compliance alert
]

export const totalFilled = branchSeats.reduce((s, b) => s + b.filled, 0)
export const totalSanctioned = branchSeats.reduce((s, b) => s + b.sanctioned, 0)

const actualPct = { General: 48, OBC: 28, SC: 16, ST: 8 }
export const mandatedPct = { General: 50.5, OBC: 27, SC: 15, ST: 7.5 }

export const quotaData = Object.keys(actualPct).map((name) => ({
  name,
  value: Math.round((totalFilled * actualPct[name]) / 100),
  actual: actualPct[name],
  mandated: mandatedPct[name],
}))

export const ghostPool = [
  { apaar: '100000000011', name: 'Suresh Kumar',  a: 'Anna University',    b: 'IIT Madras',         risk: 'High' },
  { apaar: '100000000012', name: 'Meera Joshi',   a: 'University of Delhi', b: 'Loyola College',     risk: 'High' },
  { apaar: '100000000013', name: 'Imran Sheikh',  a: 'Loyola College',     b: 'Anna University',    risk: 'Medium' },
  { apaar: '100000000014', name: 'Lavanya R',     a: 'IIT Madras',         b: 'University of Delhi', risk: 'Medium' },
  { apaar: '100000000015', name: 'Gaurav Singh',  a: 'Anna University',    b: 'Loyola College',     risk: 'Low' },
]