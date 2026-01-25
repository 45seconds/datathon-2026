import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimitResponse } from '@/lib/rate-limit';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

interface ResearchCycle {
  iteration: number;
  query: string;
  findings: string;
  dataUsed: string[];
  sourcesUsed?: string[];
}

interface DataSource {
  table: string;
  recordsAnalyzed: number;
  yearsCovered: string[];
  keyFields: string[];
  sampleData?: string;
  citation?: string;
}

interface PredictiveAnswer {
  answer: string;
  qualitativeRationale: string;
  quantitativeRationale: string;
  researchCycles: ResearchCycle[];
  dataSources: DataSource[];
  keyAssumptions: string[];
  recommendations: string[];
}

// Helper: sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Call Cerebras API with retry logic for rate limits
async function callCerebras(
  messages: any[], 
  temperature = 0.7, 
  maxTokens = 2048,
  retryCount = 0
): Promise<string> {
  if (!CEREBRAS_API_KEY) {
    throw new Error('Cerebras API key not configured');
  }

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cerebras API error:', response.status, errorText);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`Rate limited. Retrying in ${waitTime/1000}s... (attempt ${retryCount + 1}/3)`);
        await sleep(waitTime);
        return callCerebras(messages, temperature, maxTokens, retryCount + 1);
      }
      
      throw new Error(`Cerebras API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Add small delay between successful calls to avoid rate limiting
    if (retryCount === 0) {
      await sleep(500); // 500ms between calls
    }
    
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (error) {
    if (retryCount < 3 && error instanceof Error && error.message.includes('fetch')) {
      // Network error - retry
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`Network error. Retrying in ${waitTime/1000}s...`);
      await sleep(waitTime);
      return callCerebras(messages, temperature, maxTokens, retryCount + 1);
    }
    throw error;
  }
}

// Fetch comprehensive data for predictive analysis
async function fetchPredictiveData(query: string, year: number = 2026) {
  const data: any = {
    historicalTrends: [],
    currentMetrics: [],
    severityData: [],
    clusterTrends: [],
    metadata: {
      sources: [] as DataSource[],
    }
  };

  try {
    // Fetch historical data across multiple years
    const years = [2024, 2025, 2026];
    for (const yr of years) {
      const { data: countries } = await supabase
        .from('country_crisis_metrics')
        .select('iso3, country, population, in_need, targeted, need_rate, coverage_rate, funding_gap, revised_requirements, usd_per_person_in_need, mismatch, year')
        .eq('year', yr)
        .order('in_need', { ascending: false })
        .limit(30);

      if (countries) {
        data.historicalTrends.push({ year: yr, countries });
      }
    }

    // Fetch current year metrics
    const { data: currentCountries } = await supabase
      .from('country_crisis_metrics')
      .select('*')
      .eq('year', year)
      .order('mismatch', { ascending: false });

    if (currentCountries) {
      data.currentMetrics = currentCountries;
      data.metadata.sources.push({
        table: 'country_crisis_metrics',
        recordsAnalyzed: currentCountries.length,
        yearsCovered: [year.toString()],
        keyFields: ['iso3', 'country', 'population', 'in_need', 'targeted', 'need_rate', 'coverage_rate', 'funding_gap', 'revised_requirements', 'usd_per_person_in_need', 'mismatch'],
        sampleData: JSON.stringify(currentCountries.slice(0, 3)),
        citation: 'OCHA Humanitarian Needs Overview (HNO) and Humanitarian Response Plans (HRP) 2024-2026'
      });
    }

    // Fetch INFORM severity with trends
    const { data: inform } = await supabase
      .from('inform_severity')
      .select('*')
      .order('severity_index', { ascending: false })
      .limit(50);

    if (inform) {
      data.severityData = inform;
      data.metadata.sources.push({
        table: 'inform_severity',
        recordsAnalyzed: inform.length,
        yearsCovered: [...new Set(inform.map((r: any) => r.year?.toString()).filter(Boolean))],
        keyFields: ['iso3', 'country_name', 'crisis_type', 'severity_index', 'severity_category', 'trend', 'primary_driver', 'region'],
        sampleData: JSON.stringify(inform.slice(0, 3)),
        citation: 'INFORM Severity Index (European Commission Joint Research Centre, 2020-2025)'
      });
    }

    // Fetch cluster data for sectoral analysis
    const { data: clusters } = await supabase
      .from('cluster_metrics')
      .select('*')
      .eq('year', year)
      .order('total_in_need', { ascending: false });

    if (clusters) {
      data.clusterTrends = clusters;
      data.metadata.sources.push({
        table: 'cluster_metrics',
        recordsAnalyzed: clusters.length,
        yearsCovered: [year.toString()],
        keyFields: ['cluster', 'description', 'total_in_need', 'total_targeted', 'coverage_rate', 'country_count'],
        sampleData: JSON.stringify(clusters.slice(0, 3)),
        citation: 'OCHA Cluster Coordination System and Humanitarian Programme Cycle (HPC) data'
      });
    }

    // Add historical trends metadata
    if (data.historicalTrends.length > 0) {
      const totalHistoricalRecords = data.historicalTrends.reduce((sum: number, yt: any) => sum + (yt.countries?.length || 0), 0);
      data.metadata.sources.push({
        table: 'country_crisis_metrics (historical)',
        recordsAnalyzed: totalHistoricalRecords,
        yearsCovered: years.map(y => y.toString()),
        keyFields: ['iso3', 'country', 'population', 'in_need', 'targeted', 'need_rate', 'coverage_rate', 'funding_gap', 'revised_requirements', 'usd_per_person_in_need', 'mismatch'],
        sampleData: JSON.stringify(data.historicalTrends[0]?.countries?.slice(0, 2)),
        citation: 'Historical analysis of OCHA HNO/HRP data (2024-2026)'
      });
    }

  } catch (error) {
    console.error('Error fetching predictive data:', error);
  }

  return data;
}

// Agent: Determine research questions based on user query
async function generateResearchQuestions(userQuery: string, context: any): Promise<string[]> {
  const prompt = `You are a research strategist for humanitarian crisis prediction and planning.

User Query: "${userQuery}"

Available Data Context:
- Historical trends (2024-2026) for ${context.historicalTrends.length} years
- Current metrics for ${context.currentMetrics.length} countries
- INFORM severity data for ${context.severityData.length} countries
- Cluster/sector data for ${context.clusterTrends.length} sectors

Generate 3-5 specific research questions that will help answer the user's query.
These questions should guide data analysis and help build a comprehensive predictive answer.
Focus on questions that can be answered using quantitative data analysis and qualitative trend assessment.

Return ONLY a JSON array of research questions, like:
["Question 1?", "Question 2?", "Question 3?"]`;

  const response = await callCerebras([
    { role: 'system', content: 'You are a research strategist. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ], 0.5, 512);

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing research questions:', error);
  }

  // Fallback questions
  return [
    "What are the historical trends in humanitarian needs?",
    "Which countries/regions show increasing vulnerability?",
    "What are the key drivers of future crisis escalation?"
  ];
}

// Agent: Conduct research cycle
async function conductResearchCycle(
  question: string,
  data: any,
  iteration: number,
  previousFindings: string[]
): Promise<ResearchCycle> {
  const prompt = `You are a humanitarian data analyst conducting research.

Research Question: "${question}"

Available Data:
${JSON.stringify({
  historicalTrends: data.historicalTrends,
  currentMetrics: data.currentMetrics.slice(0, 20),
  severityData: data.severityData.slice(0, 20),
  clusterTrends: data.clusterTrends
}, null, 2)}

Previous Findings:
${previousFindings.join('\n\n')}

CRITICAL INSTRUCTIONS:

QUANTITATIVE ANALYSIS (must be extremely specific and data-dense):
- List EXACT numbers: e.g., "Somalia: 8.9M people in need (increase of 1.2M from 2025, +15.6% YoY)"
- Compare with precise figures: "Sudan's need rate of 65.2% is 2.3x the regional average of 28.4%"
- Include specific calculations: "Funding gap = $13.3B - $4.7B = $8.6B shortfall"
- Show concrete distributions: "Top 5 countries by need: Sudan (22.1M), Afghanistan (18.4M), Yemen (17.8M), Syria (16.7M), Ethiopia (15.9M)"
- Year-over-year changes: "2024→2025: need increased 12.1%, coverage decreased 3.2%"
- Per-capita metrics: "Ukraine receives $212/person vs CAR's $45/person (4.7x difference)"
- Cite SPECIFIC data points: "Based on country_crisis_metrics table, 27 countries analyzed across 2024-2026"

QUALITATIVE ANALYSIS (must explain WHY with deep context):
- Explain root causes: "Sudan's surge driven by: conflict escalation in Darfur (April 2023), economic collapse (inflation 250%), climate shocks (worst drought in 40 years)"
- Regional patterns: "East Africa shows consistent worsening: Somalia, Ethiopia, Kenya all saw 20%+ need increases, driven by locust swarms and La Niña effects"
- Connect dots: "Countries with active conflicts (Syria, Yemen, Ukraine) show 3x higher need rates but 40% lower funding per capita, indicating 'crisis fatigue'"
- Sector insights: "Protection cluster critically underfunded across all conflict zones - averages only 35% coverage vs 68% for food security"
- Surprising findings: "Despite high media coverage, Ukraine's coverage rate (82%) far exceeds less-visible crises like Chad (34%) despite similar need severity"

Cite specific countries, years, numbers, and root causes throughout.`;

  const findings = await callCerebras([
    { role: 'system', content: 'You are a data analyst. Provide EXTREMELY detailed, evidence-based analysis with extensive quantitative data and deep qualitative insights.' },
    { role: 'user', content: prompt }
  ], 0.6, 1536);  // Reduced from 2048 to help with rate limits

  // Extract sources mentioned in findings (credible sources only)
  const credibleSources = [
    'country_crisis_metrics',
    'inform_severity',
    'cluster_metrics',
    'dashboard_summary',
    'OCHA',
    'INFORM',
    'HPC',
    'FTS',
    'WHO',
    'UNHCR',
    'WFP',
    'UNICEF'
  ];
  
  const sourcesUsed = credibleSources.filter(source => 
    findings.toLowerCase().includes(source.toLowerCase())
  );

  return {
    iteration,
    query: question,
    findings,
    dataUsed: ['historicalTrends', 'currentMetrics', 'severityData', 'clusterTrends'],
    sourcesUsed: sourcesUsed.length > 0 ? sourcesUsed : ['country_crisis_metrics', 'inform_severity']
  };
}

// Agent: Synthesize final answer
async function synthesizeAnswer(
  userQuery: string,
  researchCycles: ResearchCycle[],
  data: any
): Promise<PredictiveAnswer> {
  const allFindings = researchCycles.map((c, i) => 
    `Research Cycle ${i + 1} - ${c.query}:\n${c.findings}`
  ).join('\n\n---\n\n');

  const prompt = `You are a senior humanitarian strategist preparing a briefing for UN officials and researchers.

Original Query: "${userQuery}"

Research Findings:
${allFindings}

Based on all research conducted, provide a comprehensive predictive analysis in the following JSON format:
{
  "answer": "CONCISE executive summary (2-3 SHORT paragraphs, ~150 words total):
    - Lead with the most critical finding (1 sentence)
    - Key projections with 2-3 specific numbers (1 paragraph)
    - Primary implications (1 paragraph)
    NO repetition. NO verbose explanations. Just the essential findings.",
  
  "qualitativeRationale": "DEEP CONTEXTUAL ANALYSIS (4-6 paragraphs, ~400 words):
    
    Paragraph 1: Root causes and drivers
    - WHY are needs changing? Specific conflicts, climate events, economic factors
    - Name specific events: 'Sudan conflict escalation April 2023', 'Ethiopia drought 2024-2025'
    
    Paragraph 2: Regional patterns with context
    - East Africa: specific countries + specific causes (e.g., 'Somalia locust swarms decimated 40% of crops')
    - Middle East: conflict dynamics and displacement patterns
    - Compare regions with explanations
    
    Paragraph 3: Sectoral dynamics
    - Which sectors underfunded and WHY
    - Protection vs food security differences
    - Examples: 'Health cluster in Yemen has only 28% coverage due to infrastructure destruction'
    
    Paragraph 4: Forgotten crisis patterns
    - WHY do some crises get less funding?
    - Media attention vs actual need disconnect
    - 'Crisis fatigue' or donor priorities
    
    Paragraph 5: Surprising insights
    - Counterintuitive findings with explanations
    - Anomalies that reveal systemic issues
    
    Paragraph 6: Cross-cutting themes
    - Patterns that appear across multiple crises
    - Structural issues in humanitarian response",
  
  "quantitativeRationale": "EXTREME DATA DENSITY (4-6 paragraphs, ~500 words):
    
    Paragraph 1: Overall trends with EXACT numbers
    - 'From 2024-2026: total need increased from 274.5M to 312.8M (+13.9%, +38.3M people)'
    - '2027 projection: 348.2M people (+11.3% YoY)'
    - Average coverage rate, funding gap, cost per person WITH NUMBERS
    
    Paragraph 2: Top 10 countries ranked
    - 'Top 10 by need: 1) Sudan 22.1M, 2) Afghanistan 18.4M, 3) Yemen 17.8M, 4) Syria 16.7M, 5) Ethiopia 15.9M...'
    - Need rates: 'South Sudan 69.0%, Syria 64.4%, Sudan 65.2%...'
    - Coverage rates: 'Afghanistan 79.9%, Chad 77.7%, Somalia 75.8%...'
    
    Paragraph 3: Year-over-year changes
    - 'Sudan: 2024 need 16.8M → 2025 20.3M → 2026 22.1M (24.6% 2-year growth)'
    - 'Yemen: coverage dropped from 67.2% (2024) to 58.3% (2026), -13.2%'
    - List 5-7 countries with specific YoY numbers
    
    Paragraph 4: Funding analysis
    - 'Total funding gap: $142.3B across all crises'
    - 'Largest gaps: Sudan $8.6B, Yemen $7.2B, Afghanistan $6.8B'
    - 'Cost per person: Ukraine $212 vs CAR $45 (4.7x disparity)'
    - 'Regional averages: MENA $168/person, Sub-Saharan $87/person'
    
    Paragraph 5: Sectoral breakdown
    - 'Food security: 186.3M in need, 68% coverage'
    - 'Protection: 94.7M in need, only 35% coverage (critical gap)'
    - 'Health: 143.2M in need, 52% coverage'
    - Compare sectors with numbers
    
    Paragraph 6: Statistical distributions
    - 'Need rate distribution: median 29%, 75th percentile 45%, max 69%'
    - 'Coverage rate: median 56%, IQR 48-69%'
    - '15 countries exceed 50% need rate; 8 countries have <40% coverage'",
  
  "keyAssumptions": [
    "Assumption with specific context (e.g., 'Assumes Sudan conflict does not expand beyond current Darfur region boundaries')",
    "Assumption 2 with numbers/specifics",
    "Assumption 3",
    "Assumption 4",
    "Assumption 5"
  ],
  
  "recommendations": [
    "Specific recommendation with 1-2 sentence rationale and concrete action (e.g., 'Increase protection sector funding by $2.3B to reach 60% coverage - currently 15M people lack access to protection services in conflict zones, creating cascading vulnerabilities')",
    "Recommendation 2 with similar detail and rationale",
    "Recommendation 3 with rationale",
    "Recommendation 4 with rationale",
    "Recommendation 5"
  ]
}

CRITICAL REQUIREMENTS:
- answer: CONCISE (150 words max), NO repetition, just key findings
- qualitativeRationale: 400+ words, explain WHY things happen, name specific events/conflicts
- quantitativeRationale: 500+ words, PACK with numbers, exact figures, top-10 lists, YoY changes
- recommendations: Each should be 2-3 sentences with specific rationale
- Every number must be specific (no ranges like "30-40%", say "34.2%")
- Name countries, regions, sectors explicitly
- No vague statements - everything must be concrete

Return ONLY valid JSON without any markdown formatting or code fences. Just return the raw JSON object.`;

  console.log('Starting final synthesis...');
  const response = await callCerebras([
    { role: 'system', content: 'You are a humanitarian strategist. Provide EXTREMELY detailed analysis. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ], 0.7, 3072);  // Reduced from 4096 to help with rate limits
  console.log('Synthesis complete');

  try {
    // Extract JSON from response (handle markdown code fences)
    let jsonString = response;
    
    // Remove markdown code fences if present
    jsonString = jsonString.replace(/^```json\s*/i, '');
    jsonString = jsonString.replace(/\s*```$/,'');
    jsonString = jsonString.trim();
    
    // Extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        researchCycles,
        dataSources: data.metadata?.sources || []
      };
    }
    
    console.warn('Could not extract JSON from response:', response.substring(0, 200));
  } catch (error) {
    console.error('Error parsing synthesis:', error, response.substring(0, 200));
  }

  // Fallback response
  return {
    answer: response,
    qualitativeRationale: "Based on analysis of historical trends and current indicators, the humanitarian landscape shows complex patterns of need and resource allocation across multiple dimensions.",
    quantitativeRationale: "Data analysis reveals measurable trends in humanitarian needs across the 2024-2026 period, with specific metrics indicating areas of concern.",
    researchCycles,
    dataSources: data.metadata?.sources || [],
    keyAssumptions: ["Historical trends continue into the future", "Current policies and funding mechanisms remain stable", "Data quality and coverage remain consistent"],
    recommendations: ["Monitor key indicators continuously", "Strengthen early warning systems", "Increase coordination mechanisms"]
  };
}

// Main predictive agent workflow
async function runPredictiveAgent(userQuery: string, year: number = 2026): Promise<PredictiveAnswer> {
  // Step 1: Fetch comprehensive data
  const data = await fetchPredictiveData(userQuery, year);

  // Step 2: Generate research questions
  const researchQuestions = await generateResearchQuestions(userQuery, data);

  // Step 3: Conduct iterative research cycles (limit to 3 to avoid rate limits)
  const researchCycles: ResearchCycle[] = [];
  const previousFindings: string[] = [];

  for (let i = 0; i < Math.min(researchQuestions.length, 3); i++) {
    console.log(`Starting research cycle ${i + 1}/${Math.min(researchQuestions.length, 3)}...`);
    const cycle = await conductResearchCycle(
      researchQuestions[i],
      data,
      i + 1,
      previousFindings
    );
    researchCycles.push(cycle);
    previousFindings.push(cycle.findings);
    console.log(`Completed research cycle ${i + 1}`);
  }

  // Step 4: Synthesize final answer
  const answer = await synthesizeAnswer(userQuery, researchCycles, data);

  return answer;
}

export async function POST(request: Request) {
  // Rate limiting
  const rateLimited = rateLimitResponse(request);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sanitizedMessage = message.trim().slice(0, 1000);
    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (!CEREBRAS_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        message: 'The Cerebras API key is not set.'
      }, { status: 503 });
    }

    // Extract year from message
    const yearMatch = sanitizedMessage.match(/\b(2024|2025|2026|2027|2028|2029|2030)\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2026;

    // Run predictive agent
    const result = await runPredictiveAgent(sanitizedMessage, year);

    console.log('Predictive result structure:', {
      hasAnswer: !!result.answer,
      hasQualitative: !!result.qualitativeRationale,
      hasQuantitative: !!result.quantitativeRationale,
      hasDataSources: !!result.dataSources,
      hasRecommendations: !!result.recommendations,
      hasAssumptions: !!result.keyAssumptions,
    });

    return NextResponse.json({
      answer: result.answer,
      qualitativeRationale: result.qualitativeRationale,
      quantitativeRationale: result.quantitativeRationale,
      researchCycles: result.researchCycles,
      dataSources: result.dataSources || [],
      keyAssumptions: result.keyAssumptions,
      recommendations: result.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Predictive agent error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to process predictive query';
    
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        errorMessage = 'API rate limit exceeded. Please wait a moment and try again, or try a simpler query.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'AI service not configured. Please check your API key.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
