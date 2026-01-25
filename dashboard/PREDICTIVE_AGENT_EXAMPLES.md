# Predictive Agent API Examples

## Testing the Predictive Agent

### Example 1: Future Humanitarian Needs

**Query:**
```
What will humanitarian needs look like in East Africa by 2027?
```

**Expected Response Structure:**
```json
{
  "answer": "Based on historical trends and current indicators...",
  "qualitativeRationale": "East Africa shows concerning patterns...",
  "quantitativeRationale": "Data analysis reveals: Population in need increased 23% from 2024-2026...",
  "researchCycles": [
    {
      "iteration": 1,
      "query": "What are the historical trends in humanitarian needs in East Africa?",
      "findings": "Analysis of 2024-2026 data shows...",
      "dataUsed": ["historicalTrends", "currentMetrics"]
    }
  ],
  "confidence": 0.75,
  "keyAssumptions": [
    "Current climate patterns continue",
    "Political stability remains at current levels",
    "Funding mechanisms remain unchanged"
  ],
  "recommendations": [
    "Strengthen early warning systems in Somalia and Ethiopia",
    "Increase food security funding by 30%",
    "Expand cross-border coordination mechanisms"
  ],
  "timestamp": "2026-01-24T..."
}
```

---

### Example 2: Policy Planning

**Query:**
```
How should OCHA prepare for future displacement crises in the Sahel region?
```

**What Happens:**
1. System detects predictive keywords: "prepare", "future", "should"
2. Routes to `/api/chat/predictive` endpoint
3. Agent runs 3-4 research cycles:
   - Analyzes historical displacement patterns
   - Identifies key drivers (climate, conflict, economic factors)
   - Projects future scenarios
   - Evaluates policy options
4. Synthesizes comprehensive answer with rationale

---

### Example 3: Sectoral Analysis

**Query:**
```
Which humanitarian sectors will face the biggest funding gaps by 2028?
```

**Expected Insights:**
- Quantitative projections based on 2024-2026 trends
- Sectoral growth rates and funding velocity
- Regional breakdown of sector-specific needs
- Recommendations for resource allocation

---

## API Endpoints

### 1. Standard Chat (Detection)

**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "message": "What will crisis trends look like in 2027?",
  "history": []
}
```

**Response (Predictive Query Detected):**
```json
{
  "usePredictiveAgent": true,
  "message": "What will crisis trends look like in 2027?"
}
```

---

### 2. Predictive Agent

**Endpoint:** `POST /api/chat/predictive`

**Request:**
```json
{
  "message": "What will crisis trends look like in 2027?"
}
```

**Response:** Full predictive analysis (see Example 1 structure)

**Typical Response Time:** 30-60 seconds

---

## Testing Workflow

### Frontend Testing

1. Open the dashboard at `http://localhost:3000`
2. Click the chat icon to open AI Chat Sidebar
3. Look for "Predictive Agent Active" badge in header
4. Try one of these queries:
   - "What will humanitarian needs be in 2027?"
   - "How should we plan for future food security crises?"
   - "Predict which countries will need the most support"

### Backend Testing (cURL)

```bash
# Test detection
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What will happen in 2027?",
    "history": []
  }'

# Test predictive agent directly
curl -X POST http://localhost:3000/api/chat/predictive \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What will humanitarian needs look like in East Africa by 2027?"
  }'
```

---

## Sample Queries by Category

### 🔮 Future Predictions
- "What will the humanitarian crisis landscape look like in 2028?"
- "Forecast food security needs for the next three years"
- "Which countries will likely face increased humanitarian needs?"

### 📋 Strategic Planning
- "How should UN agencies prepare for future crises?"
- "What planning strategies will reduce future funding gaps?"
- "How can we better target resources in the coming years?"

### 🎯 Policy & Intervention
- "What policy interventions will be most effective?"
- "Should we increase funding for specific sectors?"
- "What mitigation strategies will prevent crisis escalation?"

### 📊 Trend Analysis
- "What trends indicate worsening humanitarian conditions?"
- "Which regions show concerning patterns?"
- "What are the key drivers of future crisis escalation?"

---

## Interpreting Results

### Confidence Levels
- **80-100%**: High confidence - Strong historical data, clear trends
- **60-79%**: Moderate confidence - Some uncertainties, reasonable projections
- **<60%**: Lower confidence - Limited data, higher uncertainty

### Rationale Sections

**Qualitative Rationale:**
- Contextual factors (political, environmental, social)
- Pattern recognition and correlations
- Expert interpretation of data

**Quantitative Rationale:**
- Specific percentages and growth rates
- Historical comparisons (year-over-year changes)
- Statistical projections

### Key Assumptions
Pay special attention to assumptions - these represent:
- Critical preconditions for predictions
- Potential points of failure
- Areas requiring monitoring

---

## Common Issues & Solutions

### Issue: Agent Not Activating
**Solution:** Use explicit predictive language
- ❌ "Tell me about 2027"
- ✅ "What will humanitarian needs be in 2027?"

### Issue: Low Confidence Scores
**Possible Causes:**
- Limited historical data for specific region/sector
- High uncertainty in current trends
- Multiple conflicting indicators

**Action:** Review key assumptions and recommendations for risk mitigation

### Issue: Slow Response (>60 seconds)
**Possible Causes:**
- High server load
- Multiple concurrent research cycles
- Large data retrieval

**Action:** Normal for complex queries; ensure user sees progress indicator

---

## Best Practices

### For Accurate Predictions:
1. **Be Specific**: Include regions, sectors, timeframes
2. **Provide Context**: Mention relevant factors (climate, conflict, etc.)
3. **Ask Focused Questions**: One main question per query
4. **Use Timeframes**: "by 2027", "next 3 years", "coming decade"

### For Actionable Insights:
1. **Ask About Plans**: "How should we...", "What strategies..."
2. **Request Recommendations**: "What interventions...", "What policies..."
3. **Explore Scenarios**: "What if...", "What happens when..."

---

## Performance Expectations

### Typical Metrics:
- **Response Time**: 30-60 seconds
- **Research Cycles**: 3-4 iterations
- **Data Points Analyzed**: 50-200 records
- **Token Usage**: ~3000-5000 tokens
- **Accuracy**: Depends on data quality and query specificity

### Rate Limits:
- Same as standard chat endpoint
- ~10 requests per minute per IP
- Consider longer rate limit windows for predictive queries

---

## Advanced Usage

### Combining Multiple Contexts:
```
"What will happen in East Africa by 2027 considering both food 
security and displacement trends, and how should regional bodies 
coordinate their response?"
```

### Multi-Year Projections:
```
"Compare expected humanitarian needs between 2027 and 2030 across 
different regions"
```

### Policy Evaluation:
```
"If we increase funding to conflict-affected countries by 50%, 
what impact will it have on coverage rates by 2028?"
```

---

## Monitoring & Analytics

### Metrics to Track:
- Query detection accuracy
- Average response time
- Confidence score distribution
- User engagement with different sections
- Prediction accuracy (when future data becomes available)

### Logging:
All predictive queries are logged with:
- User query
- Research cycles generated
- Final confidence score
- Timestamp
- Response time

---

**For detailed implementation details, see [PREDICTIVE_AGENT_GUIDE.md](../PREDICTIVE_AGENT_GUIDE.md)**
