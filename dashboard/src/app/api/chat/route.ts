import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimitResponse, getClientIP, checkRateLimit } from '@/lib/rate-limit';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Source {
  name: string;
  type: 'database' | 'link' | 'document';
  url?: string;
  query?: string;
}

interface ContextData {
  countries: unknown[];
  clusters: unknown[];
  inform: unknown[];
  summary: unknown;
}

// Fetch relevant context from Supabase
async function fetchContext(question: string, year: number = 2026): Promise<{ context: ContextData; sources: Source[] }> {
  const sources: Source[] = [];
  const context: ContextData = {
    countries: [],
    clusters: [],
    inform: [],
    summary: null,
  };

  try {
    // Fetch country crisis metrics
    const { data: countries, error: countriesError } = await supabase
      .from('country_crisis_metrics')
      .select('iso3, country, population, in_need, targeted, need_rate, coverage_rate, funding_gap, revised_requirements, usd_per_person_in_need, mismatch, year')
      .eq('year', year)
      .order('mismatch', { ascending: false })
      .limit(30);

    if (!countriesError && countries) {
      context.countries = countries;
      sources.push({
        name: `Country Crisis Metrics ${year}`,
        type: 'database',
        query: 'country_crisis_metrics table',
      });
    }

    // Fetch cluster metrics
    const { data: clusters, error: clustersError } = await supabase
      .from('cluster_metrics')
      .select('cluster, description, total_in_need, total_targeted, coverage_rate, country_count, year')
      .eq('year', year)
      .order('total_in_need', { ascending: false })
      .limit(15);

    if (!clustersError && clusters) {
      context.clusters = clusters;
      sources.push({
        name: `Cluster Metrics ${year}`,
        type: 'database',
        query: 'cluster_metrics table',
      });
    }

    // Fetch INFORM severity data
    const { data: inform, error: informError } = await supabase
      .from('inform_severity')
      .select('iso3, country_name, crisis_type, severity_index, severity_category, trend, primary_driver, region, year')
      .order('severity_index', { ascending: false })
      .limit(30);

    if (!informError && inform) {
      context.inform = inform;
      sources.push({
        name: 'INFORM Severity Index',
        type: 'database',
        query: 'inform_severity table',
        url: 'https://drmkc.jrc.ec.europa.eu/inform-index',
      });
    }

    // Fetch dashboard summary
    const { data: summary, error: summaryError } = await supabase
      .from('dashboard_summary')
      .select('*')
      .eq('year', year)
      .single();

    if (!summaryError && summary) {
      context.summary = summary;
      sources.push({
        name: `Dashboard Summary ${year}`,
        type: 'database',
        query: 'dashboard_summary table',
      });
    }

    // Add external reference sources
    sources.push({
      name: 'HPC HNO Data',
      type: 'link',
      url: 'https://data.humdata.org/',
    });
    sources.push({
      name: 'OCHA Financial Tracking',
      type: 'link',
      url: 'https://fts.unocha.org/',
    });

  } catch (error) {
    console.error('Error fetching context:', error);
  }

  return { context, sources };
}

// Build the system prompt with context
function buildSystemPrompt(context: ContextData): string {
  return `You are a humanitarian crisis analyst assistant for a dashboard analyzing global humanitarian needs and funding gaps.

You have access to the following data context:

## Global Summary (2026)
${JSON.stringify(context.summary, null, 2)}

## Top Countries by Crisis Mismatch (high need, low resources)
${JSON.stringify(context.countries?.slice(0, 15), null, 2)}

## Humanitarian Clusters/Sectors
${JSON.stringify(context.clusters, null, 2)}

## INFORM Severity Index Data
${JSON.stringify(context.inform?.slice(0, 15), null, 2)}

## Your Role and Rules:
1. ONLY answer questions using the data provided above. Do not make up statistics.
2. If asked about something not in the data, say "I don't have that specific data in my current context."
3. Always cite which data source supports your claims (e.g., "According to the country metrics..." or "The INFORM index shows...").
4. Focus on humanitarian insights: who needs help most, where are funding gaps, which sectors are underfunded.
5. Use specific numbers when available (populations, percentages, USD amounts).
6. Keep responses concise but informative.
7. If asked about non-humanitarian topics, redirect: "I'm focused on humanitarian crisis analysis. How can I help you understand the crisis data?"

## Key Metrics Explained:
- mismatch: Higher values mean high need but low resources (most "forgotten" crises)
- need_rate: Percentage of population in need
- coverage_rate: Percentage of needs being targeted
- usd_per_person_in_need: Funding per person requiring assistance
- severity_index: INFORM severity score (higher = more severe crisis)`;
}

// Call Cerebras API
async function callCerebras(
  messages: ChatMessage[], 
  temperature: number = 0.7,
  maxTokens: number = 1024
): Promise<string> {
  if (!CEREBRAS_API_KEY) {
    throw new Error('Cerebras API key not configured');
  }

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
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cerebras API error:', response.status, errorText);
    throw new Error(`Cerebras API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

// Detect if query requires predictive agent using LLM
async function isPredictiveQuery(message: string): Promise<boolean> {
  try {
    const detectionPrompt = `You are a query classifier for a humanitarian crisis analysis system.

Your task: Determine if the user's query is asking for PREDICTIVE/FUTURE analysis or CURRENT/HISTORICAL data.

PREDICTIVE queries ask about:
- Future scenarios (2027, 2028, next year, coming years)
- Predictions or forecasts
- Planning strategies or recommendations
- "What will happen", "How should we plan", "What if"
- Policy interventions for the future
- Trends and projections

CURRENT/HISTORICAL queries ask about:
- Existing data (2024, 2025, 2026)
- Current statistics or facts
- "What is", "Show me", "Tell me about"
- Comparisons of existing data

User query: "${message}"

Respond with ONLY one word: "PREDICTIVE" or "CURRENT"`;

    const response = await callCerebras(
      [
        { role: 'system', content: 'You are a query classifier. Respond with only one word: PREDICTIVE or CURRENT.' },
        { role: 'user', content: detectionPrompt }
      ],
      0.3,  // Low temperature for consistent classification
      50    // Only need one word
    );

    const classification = response.trim().toUpperCase();
    return classification.includes('PREDICTIVE');
  } catch (error) {
    console.error('Error in LLM-based detection, falling back to keywords:', error);
    // Fallback to keyword-based detection if LLM fails
    const predictiveKeywords = [
      'predict', 'forecast', 'future', 'will be', 'will happen', 'expect', 'anticipate',
      'projection', 'trend', 'outlook', 'scenario', 'plan', 'planning', 'strategy',
      'next year', 'coming years', 'by 2027', 'by 2028', 'by 2029', 'by 2030',
      'should prepare', 'should plan', 'what if', 'potential', 'likely',
      'recommend', 'policy', 'intervention', 'prepare for', 'mitigation'
    ];
    const lowerMessage = message.toLowerCase();
    return predictiveKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export async function POST(request: Request) {
  // Rate limiting
  const rateLimited = rateLimitResponse(request);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Sanitize input
    const sanitizedMessage = message.trim().slice(0, 1000);
    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Check for Cerebras API key
    if (!CEREBRAS_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        message: 'The Cerebras API key is not set. Please contact the administrator.'
      }, { status: 503 });
    }

    // Detect if this is a predictive query using LLM
    const isPredictive = await isPredictiveQuery(sanitizedMessage);
    
    if (isPredictive) {
      // Route to predictive agent
      return NextResponse.json({
        usePredictiveAgent: true,
        message: sanitizedMessage,
      });
    }

    // Extract year from message if mentioned
    const yearMatch = sanitizedMessage.match(/\b(2024|2025|2026)\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2026;

    // Fetch context from Supabase
    const { context, sources } = await fetchContext(sanitizedMessage, year);

    // Build messages for Cerebras
    const systemPrompt = buildSystemPrompt(context);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      // Include last 4 messages of history for context
      ...history.slice(-4).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: sanitizedMessage },
    ];

    // Call Cerebras
    const response = await callCerebras(messages);

    // Get rate limit info for headers
    const ip = getClientIP(request);
    const { remaining, resetIn } = checkRateLimit(ip);

    return NextResponse.json(
      {
        response,
        sources,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(resetIn / 1000).toString(),
        },
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
