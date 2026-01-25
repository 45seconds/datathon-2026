'use client';

import { useState, useRef, useEffect } from 'react';

interface Source {
  name: string;
  type: 'database' | 'link' | 'document';
  url?: string;
  query?: string;
}

interface ResearchCycle {
  iteration: number;
  query: string;
  findings: string;
  dataUsed: string[];
}

interface DataSource {
  table: string;
  recordsAnalyzed: number;
  yearsCovered: string[];
  keyFields: string[];
  sampleData?: string;
  citation?: string;
}

interface PredictiveResponse {
  answer: string;
  qualitativeRationale: string;
  quantitativeRationale: string;
  researchCycles: ResearchCycle[];
  dataSources: DataSource[];
  keyAssumptions: string[];
  recommendations: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  predictive?: PredictiveResponse;
  timestamp: Date;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Source citation dropdown component
function SourceCitation({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!sources || sources.length === 0) return null;

  const dbSources = sources.filter(s => s.type === 'database');
  const linkSources = sources.filter(s => s.type === 'link');

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{sources.length} sources used</span>
        <svg 
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-1 pl-4 border-l-2 border-neutral-200">
          {dbSources.length > 0 && (
            <div>
              <span className="text-neutral-400 text-[10px] uppercase tracking-wider">Database Queries</span>
              <ul className="mt-0.5 space-y-0.5">
                {dbSources.map((source, i) => (
                  <li key={i} className="text-neutral-600 flex items-center gap-1">
                    <svg className="h-2.5 w-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {source.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {linkSources.length > 0 && (
            <div className="mt-1">
              <span className="text-neutral-400 text-[10px] uppercase tracking-wider">External Sources</span>
              <ul className="mt-0.5 space-y-0.5">
                {linkSources.map((source, i) => (
                  <li key={i}>
                    {source.url ? (
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {source.name}
                      </a>
                    ) : (
                      <span className="text-neutral-600">{source.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Predictive answer component
function PredictiveAnswer({ data }: { data: PredictiveResponse }) {
  const [expandedSection, setExpandedSection] = useState<string | null>('answer');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-3 text-sm">
      {/* Main Answer */}
      <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          <span className="font-semibold text-blue-900">Predictive Analysis</span>
        </div>
        <p className="text-neutral-700 whitespace-pre-wrap">{data.answer}</p>
      </div>

      {/* Qualitative Rationale */}
      <div className="border border-neutral-200 rounded-lg">
        <button
          onClick={() => toggleSection('qualitative')}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-semibold text-neutral-900">Qualitative Rationale</span>
          </div>
          <svg 
            className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'qualitative' ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'qualitative' && (
          <div className="px-3 pb-3 text-neutral-700 whitespace-pre-wrap border-t border-neutral-200 pt-3 max-h-96 overflow-y-auto">
            {data.qualitativeRationale}
          </div>
        )}
      </div>

      {/* Quantitative Rationale */}
      <div className="border border-neutral-200 rounded-lg">
        <button
          onClick={() => toggleSection('quantitative')}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-semibold text-neutral-900">Quantitative Evidence</span>
          </div>
          <svg 
            className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'quantitative' ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'quantitative' && (
          <div className="px-3 pb-3 text-neutral-700 whitespace-pre-wrap border-t border-neutral-200 pt-3 max-h-96 overflow-y-auto">
            {data.quantitativeRationale}
          </div>
        )}
      </div>

      {/* Data Sources */}
      {data.dataSources && data.dataSources.length > 0 && (
        <div className="border border-neutral-200 rounded-lg">
          <button
            onClick={() => toggleSection('sources')}
            className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="font-semibold text-neutral-900">Data Sources</span>
              <span className="text-xs text-neutral-500">({data.dataSources.length} sources)</span>
            </div>
            <svg 
              className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'sources' ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === 'sources' && (
            <div className="px-3 pb-3 border-t border-neutral-200 pt-3 space-y-3">
              {data.dataSources.map((source, i) => (
                <div key={i} className="bg-neutral-50 rounded p-2.5 border-l-2 border-indigo-200">
                  <div className="font-medium text-neutral-900 text-xs mb-1.5 flex items-center gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                      {i + 1}
                    </span>
                    {source.table}
                  </div>
                  {source.citation && (
                    <div className="text-xs text-indigo-700 italic ml-7 mb-2">
                      {source.citation}
                    </div>
                  )}
                  <div className="text-xs text-neutral-600 space-y-0.5 ml-7">
                    <div><span className="font-medium">Records analyzed:</span> {source.recordsAnalyzed.toLocaleString()}</div>
                    <div><span className="font-medium">Time period:</span> {source.yearsCovered.join(', ')}</div>
                    <div><span className="font-medium">Key metrics:</span> {source.keyFields.slice(0, 4).join(', ')}{source.keyFields.length > 4 ? '...' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Assumptions */}
      <div className="border border-neutral-200 rounded-lg">
        <button
          onClick={() => toggleSection('assumptions')}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold text-neutral-900">Key Assumptions</span>
            <span className="text-xs text-neutral-500">({data.keyAssumptions.length})</span>
          </div>
          <svg 
            className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'assumptions' ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'assumptions' && (
          <div className="px-3 pb-3 border-t border-neutral-200 pt-3">
            <ul className="space-y-1">
              {data.keyAssumptions.map((assumption, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-700">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="border border-neutral-200 rounded-lg bg-neutral-50">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="font-semibold text-neutral-900">Recommendations</span>
            <span className="text-xs text-neutral-500">({data.recommendations.length})</span>
          </div>
          <svg 
            className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'recommendations' ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'recommendations' && (
          <div className="px-3 pb-3 border-t border-neutral-200 pt-3">
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-700">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Research Process */}
      {data.researchCycles.length > 0 && (
        <div className="border border-neutral-200 rounded-lg">
          <button
            onClick={() => toggleSection('research')}
            className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-semibold text-neutral-900">Research Process</span>
              <span className="text-xs text-neutral-500">({data.researchCycles.length} cycles)</span>
            </div>
            <svg 
              className={`h-4 w-4 text-neutral-500 transition-transform ${expandedSection === 'research' ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === 'research' && (
            <div className="px-3 pb-3 border-t border-neutral-200 pt-3 space-y-3">
              {data.researchCycles.map((cycle) => (
                <div key={cycle.iteration} className="bg-neutral-50 rounded p-2">
                  <div className="font-medium text-neutral-900 text-xs mb-1">
                    Cycle {cycle.iteration}: {cycle.query}
                  </div>
                  <div className="text-neutral-600 text-xs whitespace-pre-wrap">
                    {cycle.findings.slice(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Example questions for empty state
const EXAMPLE_QUESTIONS = [
  "Which countries have the highest mismatch between need and funding?",
  "What sectors are most underfunded in 2026?",
  "Tell me about the crisis in Sudan",
  "Which regions have the most people in need?",
  "Compare funding gaps between Africa and Middle East",
  "What will the humanitarian crisis look like in 2027?", // Predictive
  "How should we plan for future crises in East Africa?", // Predictive
];

export default function AIChatSidebar({ isOpen, onClose }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPredictiveMode, setIsPredictiveMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // First, check if this requires predictive agent
      const checkResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        if (checkResponse.status === 429) {
          setError(`Rate limit exceeded. Please wait ${checkData.retryAfter || 60} seconds.`);
        } else {
          setError(checkData.error || 'Failed to get response');
        }
        return;
      }

      // If it's a predictive query, use the predictive agent
      if (checkData.usePredictiveAgent) {
        setIsPredictiveMode(true);
        
        const predictiveResponse = await fetch('/api/chat/predictive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
          }),
        });

        const predictiveData = await predictiveResponse.json();

        if (!predictiveResponse.ok) {
          setError(predictiveData.error || 'Failed to get predictive response');
          return;
        }

        console.log('Received predictive data:', {
          hasAnswer: !!predictiveData.answer,
          hasQualitative: !!predictiveData.qualitativeRationale,
          hasQuantitative: !!predictiveData.quantitativeRationale,
          hasDataSources: !!predictiveData.dataSources,
          answerPreview: predictiveData.answer?.substring(0, 100),
        });

        // Add assistant message with predictive analysis
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: predictiveData.answer || 'No answer provided',
          predictive: {
            answer: predictiveData.answer,
            qualitativeRationale: predictiveData.qualitativeRationale,
            quantitativeRationale: predictiveData.quantitativeRationale,
            researchCycles: predictiveData.researchCycles || [],
            dataSources: predictiveData.dataSources || [],
            keyAssumptions: predictiveData.keyAssumptions || [],
            recommendations: predictiveData.recommendations || [],
          },
          timestamp: new Date(predictiveData.timestamp),
        };
        
        console.log('Created assistant message with predictive:', !!assistantMessage.predictive);
        setMessages(prev => [...prev, assistantMessage]);
        setIsPredictiveMode(false);
      } else {
        // Regular response
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: checkData.response,
          sources: checkData.sources,
          timestamp: new Date(checkData.timestamp),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleExampleClick = (question: string) => {
    sendMessage(question);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-12 z-50 flex h-[calc(100vh-48px)] w-[400px] flex-col border-l border-neutral-200 bg-white shadow-lg">
      {/* Header */}
      <div className="border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-neutral-900">Crisis Insights AI</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Predictive capability indicator */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-md px-2 py-1.5">
            <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-blue-900 font-medium">Predictive Agent Active</span>
            <div className="flex-1"></div>
            <span className="text-blue-700 text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">BETA</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="font-medium text-neutral-900 mb-2">Ask about humanitarian crises</h3>
            <p className="text-sm text-neutral-500 mb-6">
              I can help you explore crisis data, funding gaps, and regional needs.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Try asking:</p>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="block w-full text-left text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded px-3 py-2 transition-colors"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${
                  message.role === 'user' 
                    ? 'max-w-[85%] bg-neutral-900 text-white rounded-lg px-3 py-2' 
                    : message.predictive 
                      ? 'w-full'
                      : 'max-w-[85%] bg-neutral-100 text-neutral-700 rounded-lg px-3 py-2'
                }`}
              >
                {message.role === 'assistant' && message.predictive ? (
                  <PredictiveAnswer data={message.predictive} />
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.role === 'assistant' && message.sources && (
                      <SourceCitation sources={message.sources} />
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`${isPredictiveMode ? 'bg-blue-50 border border-blue-200' : 'bg-neutral-100'} rounded-lg px-3 py-2`}>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>
                  {isPredictiveMode 
                    ? 'Running predictive analysis (this may take 30-60 seconds)...' 
                    : 'Analyzing crisis data...'}
                </span>
              </div>
              {isPredictiveMode && (
                <div className="mt-2 text-xs text-blue-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Fetching historical data...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span>Conducting research cycles...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>Synthesizing insights...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about crisis data..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400 text-center">
          Powered by Cerebras • Data from HPC, INFORM, OCHA
        </p>
      </form>
    </div>
  );
}
