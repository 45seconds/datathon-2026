import { NextResponse } from 'next/server';
import * as supabaseData from '@/lib/data-supabase';
import * as csvData from '@/lib/data';
import * as supabaseInform from '@/lib/inform-supabase';
import * as csvInform from '@/lib/inform';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
};

// Use Supabase if configured, otherwise fallback to CSV
const dataSource = isSupabaseConfigured() ? supabaseData : csvData;
const informSource = isSupabaseConfigured() ? supabaseInform : csvInform;

interface SectorGap {
  cluster: string;
  inNeed: number;
  targeted: number;
  coverageRate: number;
  gap: number;
}


async function getCountrySectorGaps(iso3: string, year: number): Promise<SectorGap[]> {
  try {
    if (isSupabaseConfigured()) {
      // Use Supabase
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('country_cluster_gaps')
        .select('*')
        .eq('iso3', iso3)
        .eq('year', year)
        .order('coverage_rate', { ascending: true });

      if (error || !data) return [];

      return data.map((row) => ({
        cluster: row.cluster,
        inNeed: Number(row.in_need),
        targeted: Number(row.targeted),
        coverageRate: Number(row.coverage_rate),
        gap: Number(row.gap),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

interface QAResponse {
  answer: string;
  sources: { name: string; url?: string }[];
}

// Country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  AFG: 'Afghanistan',
  BFA: 'Burkina Faso',
  CAF: 'Central African Republic',
  CMR: 'Cameroon',
  COD: 'DR Congo',
  COL: 'Colombia',
  ETH: 'Ethiopia',
  HTI: 'Haiti',
  IRQ: 'Iraq',
  KEN: 'Kenya',
  LBY: 'Libya',
  MLI: 'Mali',
  MMR: 'Myanmar',
  MOZ: 'Mozambique',
  NER: 'Niger',
  NGA: 'Nigeria',
  PAK: 'Pakistan',
  PSE: 'Palestine',
  SDN: 'Sudan',
  SOM: 'Somalia',
  SSD: 'South Sudan',
  SYR: 'Syria',
  TCD: 'Chad',
  UKR: 'Ukraine',
  VEN: 'Venezuela',
  YEM: 'Yemen',
  ZWE: 'Zimbabwe',
};

// Find country ISO3 from question
function extractCountry(question: string): string | null {
  const lowerQ = question.toLowerCase();
  
  // Check full names first
  for (const [iso3, name] of Object.entries(COUNTRY_NAMES)) {
    if (lowerQ.includes(name.toLowerCase())) {
      return iso3;
    }
  }
  
  // Check ISO codes
  for (const iso3 of Object.keys(COUNTRY_NAMES)) {
    if (lowerQ.includes(iso3.toLowerCase())) {
      return iso3;
    }
  }
  
  return null;
}

// Detect question type
function detectQuestionType(question: string): 'why_underfunded' | 'sectors' | 'trends' | 'drivers' | 'general' {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('why') && (lowerQ.includes('underfund') || lowerQ.includes('forgotten') || lowerQ.includes('underserved'))) {
    return 'why_underfunded';
  }
  if (lowerQ.includes('sector') || lowerQ.includes('cluster') || lowerQ.includes('health') || lowerQ.includes('protection') || lowerQ.includes('food')) {
    return 'sectors';
  }
  if (lowerQ.includes('trend') || lowerQ.includes('change') || lowerQ.includes('over time') || lowerQ.includes('history')) {
    return 'trends';
  }
  if (lowerQ.includes('driver') || lowerQ.includes('cause') || lowerQ.includes('reason') || lowerQ.includes('type')) {
    return 'drivers';
  }
  
  return 'general';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const year = 2026;
    const iso3 = extractCountry(question);
    const questionType = detectQuestionType(question);
    
    const sources: QAResponse['sources'] = [];
    let answer = '';

    if (iso3) {
      // Country-specific question
      const allMetrics = await dataSource.getCountryCrisisMetrics(year);
      const countryData = allMetrics.find((m) => m.iso3 === iso3);
      
      if (!countryData) {
        return NextResponse.json({
          answer: `I don't have data for that country in the ${year} dataset.`,
          sources: [],
        });
      }

      sources.push({ name: `HPC HNO ${year}`, url: 'https://data.humdata.org/' });
      sources.push({ name: 'HRP Data', url: 'https://fts.unocha.org/' });

      const severity = await informSource.getINFORMForCountry(iso3, year);
      if (severity) {
        sources.push({ name: `INFORM Severity ${severity.year}`, url: 'https://drmkc.jrc.ec.europa.eu/inform-index' });
      }

      const countryName = COUNTRY_NAMES[iso3] || iso3;

      switch (questionType) {
        case 'why_underfunded': {
          const mismatchRank = allMetrics
            .sort((a, b) => b.mismatch - a.mismatch)
            .findIndex((m) => m.iso3 === iso3) + 1;
          
          answer = `**${countryName}** ranks #${mismatchRank} in underfunding (mismatch score: ${countryData.mismatch > 0 ? '+' : ''}${(countryData.mismatch * 100).toFixed(0)}%).\n\n`;
          answer += `Key factors:\n`;
          answer += `- **High need**: ${formatNumber(countryData.inNeed)} people in need (${(countryData.needRate * 100).toFixed(0)}% of population)\n`;
          answer += `- **Low resources**: Only $${countryData.usdPerPersonInNeed.toFixed(0)} requested per person in need\n`;
          answer += `- **Coverage gap**: ${(countryData.coverageRate * 100).toFixed(0)}% coverage rate\n`;
          
          if (severity) {
            answer += `\n**INFORM Severity**: ${severity.severityIndex.toFixed(1)}/5 (${severity.severityCategory})\n`;
            answer += `**Crisis Type**: ${severity.crisisType}\n`;
            if (severity.primaryDriver !== 'Unknown') {
              answer += `**Primary Driver**: ${severity.primaryDriver}\n`;
            }
          }
          break;
        }

        case 'sectors': {
          // Fetch sector data for this country
          const sectorGaps = await getCountrySectorGaps(iso3, year);
          
          if (sectorGaps.length > 0) {
            answer = `**Sector analysis for ${countryName}:**\n\n`;
            sectorGaps.slice(0, 6).forEach((gap, i) => {
              const status = gap.coverageRate < 0.3 ? '🔴' : gap.coverageRate < 0.6 ? '🟡' : '🟢';
              answer += `${i + 1}. **${gap.cluster}**: ${(gap.coverageRate * 100).toFixed(0)}% coverage ${status}\n`;
              answer += `   - ${formatNumber(gap.gap)} people unserved\n`;
            });
          } else {
            answer = `I don't have detailed sector data for ${countryName}.`;
          }
          break;
        }

        case 'trends': {
          const years = [2024, 2025, 2026];
          const trends: { year: number; mismatch: number; inNeed: number }[] = [];
          
          for (const y of years) {
            try {
              const yearMetrics = await dataSource.getCountryCrisisMetrics(y);
              const match = yearMetrics.find((m) => m.iso3 === iso3);
              if (match) {
                trends.push({ year: y, mismatch: match.mismatch, inNeed: match.inNeed });
              }
            } catch {
              // Year may not exist
            }
          }
          
          if (trends.length > 1) {
            const first = trends[0];
            const last = trends[trends.length - 1];
            const change = last.mismatch - first.mismatch;
            
            answer = `**${countryName} trends (${first.year}-${last.year}):**\n\n`;
            trends.forEach((t) => {
              answer += `- **${t.year}**: ${formatNumber(t.inNeed)} in need, mismatch ${t.mismatch > 0 ? '+' : ''}${(t.mismatch * 100).toFixed(0)}%\n`;
            });
            answer += `\n**Overall change**: ${change > 0 ? 'Worsening' : 'Improving'} (${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}% mismatch change)`;
          } else {
            answer = `I only have data for ${countryName} in one year.`;
          }
          break;
        }

        case 'drivers': {
          if (severity) {
            answer = `**Crisis drivers for ${countryName}:**\n\n`;
            answer += `- **Crisis Type**: ${severity.crisisType}\n`;
            answer += `- **Primary Driver**: ${severity.primaryDriver}\n`;
            if (severity.drivers.length > 1) {
              answer += `- **All Drivers**: ${severity.drivers.join(', ')}\n`;
            }
            answer += `- **Trend**: ${severity.trend || 'Stable'}\n`;
            answer += `- **Operating Environment**: ${severity.operatingEnv.toFixed(1)}/5 (higher = more difficult)\n`;
          } else {
            answer = `I don't have INFORM driver data for ${countryName}.`;
          }
          break;
        }

        default: {
          answer = `**${countryName} Overview (${year}):**\n\n`;
          answer += `- **Population in Need**: ${formatNumber(countryData.inNeed)} (${(countryData.needRate * 100).toFixed(0)}% of population)\n`;
          answer += `- **Targeted**: ${formatNumber(countryData.targeted)}\n`;
          answer += `- **Coverage Rate**: ${(countryData.coverageRate * 100).toFixed(0)}%\n`;
          answer += `- **Funding Requested**: $${formatNumber(countryData.revisedRequirements)}\n`;
          answer += `- **USD per Person**: $${countryData.usdPerPersonInNeed.toFixed(0)}\n`;
          answer += `- **Mismatch Score**: ${countryData.mismatch > 0 ? '+' : ''}${(countryData.mismatch * 100).toFixed(0)}%\n`;
          
          if (severity) {
            answer += `\n**INFORM Severity**: ${severity.severityIndex.toFixed(1)}/5 (${severity.severityCategory})\n`;
            answer += `**Crisis Type**: ${severity.crisisType}`;
          }
        }
      }
    } else {
      // General question (no specific country)
      sources.push({ name: `HPC HNO ${year}`, url: 'https://data.humdata.org/' });
      
      const forgotten = await getTopForgottenCrises(year, 10);
      const allMetrics = await dataSource.getCountryCrisisMetrics(year);
      
      if (question.toLowerCase().includes('most') || question.toLowerCase().includes('top') || question.toLowerCase().includes('worst')) {
        answer = `**Top 5 most underserved crises (${year}):**\n\n`;
        forgotten.slice(0, 5).forEach((crisis, i) => {
          const name = COUNTRY_NAMES[crisis.iso3] || crisis.iso3;
          answer += `${i + 1}. **${name}** — ${formatNumber(crisis.inNeed)} in need, ${(crisis.coverageRate * 100).toFixed(0)}% coverage, mismatch +${(crisis.mismatch * 100).toFixed(0)}%\n`;
        });
      } else {
        // General summary
        const totalInNeed = allMetrics.reduce((sum, m) => sum + m.inNeed, 0);
        const avgCoverage = allMetrics.reduce((sum, m) => sum + m.coverageRate, 0) / allMetrics.length;
        
        answer = `**Global humanitarian crisis summary (${year}):**\n\n`;
        answer += `- **Countries in crisis**: ${allMetrics.length}\n`;
        answer += `- **Total people in need**: ${formatNumber(totalInNeed)}\n`;
        answer += `- **Average coverage rate**: ${(avgCoverage * 100).toFixed(0)}%\n\n`;
        answer += `**Top 3 underserved:**\n`;
        forgotten.slice(0, 3).forEach((crisis, i) => {
          const name = COUNTRY_NAMES[crisis.iso3] || crisis.iso3;
          answer += `${i + 1}. ${name} (${formatNumber(crisis.inNeed)} in need)\n`;
        });
      }
    }

    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error('QA API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
