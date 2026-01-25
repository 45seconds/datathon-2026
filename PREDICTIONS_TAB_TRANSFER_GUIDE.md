# Predictions Tab Transfer Guide

## Quick Reference
This guide helps you transfer the Predictions tab from this branch to another GitHub branch.

---

## Files to Transfer

### 1. API Route (Backend)
**Source:** `dashboard/src/app/api/predictions/route.ts`
- **What it does:** Provides prediction data endpoint
- **Dependencies:** None (standalone)
- **Action:** Copy entire file as-is

### 2. Main Component (Frontend)
**Source:** `dashboard/src/components/PredictionsView.tsx`
- **What it does:** Main predictions dashboard UI
- **Dependencies:** Requires AnimatedCounter, RiskRadarChart, flags utility
- **Action:** Copy entire file as-is

### 3. Helper Components
**Source:** `dashboard/src/components/AnimatedCounter.tsx`
- **What it does:** Animated number counter
- **Dependencies:** None
- **Action:** Copy entire file as-is

**Source:** `dashboard/src/components/RiskRadarChart.tsx`
- **What it does:** SVG radar chart for risk analysis
- **Dependencies:** None
- **Action:** Copy entire file as-is

### 4. Component Exports
**Source:** `dashboard/src/components/index.ts`
- **What to add:**
```typescript
export { PredictionsView } from './PredictionsView';
export { AnimatedCounter } from './AnimatedCounter';
export { RiskRadarChart } from './RiskRadarChart';
```
- **Action:** Append these 3 lines to the existing index.ts file

### 5. Navbar Integration
**Source:** `dashboard/src/components/Navbar.tsx`
- **What to add:** A "Predictions" tab button
- **Look for:** The section where other tab buttons are (Overview, Maps, Datasets, etc.)
- **Action:** Add this button in the appropriate location:
```typescript
<button
  onClick={() => handleTabClick('predictions')}
  className={`px-3 py-1.5 text-sm transition-colors ${
    isPredictions ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
  }`}
>
  Predictions
</button>
```
- **Note:** You'll need to add logic for `isPredictions` state check

### 6. Main Page Integration
**Source:** `dashboard/src/app/page.tsx`
- **What to add:**
  1. Import PredictionsView:
     ```typescript
     import { ..., PredictionsView } from '@/components';
     ```
  2. Add conditional render (place near other tab renders):
     ```typescript
     {/* Predictions Tab */}
     {activeTab === 'predictions' && <PredictionsView />}
     ```
- **Action:** Add import and render logic

---

## Transfer Steps

### Option A: Manual Copy (Recommended for understanding)

1. **Create API directory structure** (if it doesn't exist):
   ```bash
   mkdir -p dashboard/src/app/api/predictions
   ```

2. **Copy API route**:
   ```bash
   cp dashboard/src/app/api/predictions/route.ts <destination>/dashboard/src/app/api/predictions/route.ts
   ```

3. **Copy components**:
   ```bash
   cp dashboard/src/components/PredictionsView.tsx <destination>/dashboard/src/components/
   cp dashboard/src/components/AnimatedCounter.tsx <destination>/dashboard/src/components/
   cp dashboard/src/components/RiskRadarChart.tsx <destination>/dashboard/src/components/
   ```

4. **Update index.ts**:
   - Open `<destination>/dashboard/src/components/index.ts`
   - Add the 3 export lines at the bottom

5. **Update Navbar.tsx**:
   - Open `<destination>/dashboard/src/components/Navbar.tsx`
   - Add the Predictions button where appropriate
   - Ensure the state logic handles 'predictions' as a valid tab

6. **Update page.tsx**:
   - Open `<destination>/dashboard/src/app/page.tsx`
   - Add PredictionsView to imports
   - Add the conditional render for predictions tab

### Option B: Use the provided script
See `copy_predictions_tab.sh` below

---

## Verification Checklist

After transferring, verify:

- [ ] API route accessible at `/api/predictions?type=summary`
- [ ] API route accessible at `/api/predictions?type=countries`
- [ ] No TypeScript errors in transferred files
- [ ] PredictionsView component renders without errors
- [ ] Predictions tab button appears in navbar
- [ ] Clicking Predictions tab shows the predictions dashboard
- [ ] Animated counters work smoothly
- [ ] Risk radar charts render correctly
- [ ] Country cards expand/collapse on click
- [ ] All 12 countries show in the list
- [ ] Top 4 risk radar charts display

---

## Dependencies Required

The Predictions tab assumes these utilities exist in your codebase:

1. **Flags utility**: `@/lib/flags` with `getCountryFlag(iso3: string)` function
2. **Tailwind CSS**: For styling
3. **React 18+**: For hooks (useState, useEffect)
4. **Next.js 14+**: For API routes and app router

If any are missing, you'll need to implement them or modify the code accordingly.

---

## Troubleshooting

### "Cannot find module '@/lib/flags'"
- Ensure you have a flags utility or create a simple one:
```typescript
export function getCountryFlag(iso3: string): string {
  const flags: Record<string, string> = {
    'SDN': '🇸🇩', 'AFG': '🇦🇫', 'YEM': '🇾🇪', 'ETH': '🇪🇹',
    'SOM': '🇸🇴', 'SYR': '🇸🇾', 'COD': '🇨🇩', 'SSD': '🇸🇸',
    'NGA': '🇳🇬', 'MMR': '🇲🇲', 'PSE': '🇵🇸', 'HTI': '🇭🇹'
  };
  return flags[iso3] || '🏳️';
}
```

### "activeTab is not defined"
- Ensure your page.tsx has tab state management:
```typescript
const [activeTab, setActiveTab] = useState<string>('overview');
```

### Components not rendering
- Check that all exports are correct in index.ts
- Verify imports match your project structure (@/components vs ../components)

---

## Git Commands

After copying files, commit them:

```bash
git checkout <your-target-branch>
git add dashboard/src/app/api/predictions/
git add dashboard/src/components/PredictionsView.tsx
git add dashboard/src/components/AnimatedCounter.tsx
git add dashboard/src/components/RiskRadarChart.tsx
git add dashboard/src/components/index.ts
git add dashboard/src/components/Navbar.tsx
git add dashboard/src/app/page.tsx
git commit -m "Add Predictions tab with ML forecasting dashboard"
git push origin <your-target-branch>
```

---

## Notes

- The API currently uses mock data. In production, you'd replace the `PREDICTIONS` array with actual ML model output.
- The predictions are for 2027 and assume baseline/optimistic/pessimistic scenarios.
- All monetary values are in USD.
- Priority scores range from 0-1 (higher = more critical).
- Risk scores are composite metrics from your ML model.

---

## Questions?

If you encounter issues:
1. Check that all file paths match your project structure
2. Verify all dependencies are installed
3. Check browser console for runtime errors
4. Check terminal for build errors
