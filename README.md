# DSC Datathon 2026
Team: dvislawa — Dheeraj Vislawath, Kabir Singh, Abhinav Akkiraju, Todd Dong

We partnered with Databricks and the United Nations to build an analytics platform that helps aid officers prioritize humanitarian response. The project addresses two datathon challenges with a shared goal: surface where need is high, resources are low, and programs may be inefficient — then make those signals actionable through an interactive dashboard.

Overview

Millions of people in crisis depend on how the UN allocates limited humanitarian funding. Our solution combines country-level need-vs-resource analysis with project-level cost-per-beneficiary benchmarking into a single decision-support system.

At a high level, we:

Integrate 12+ humanitarian datasets (2M+ rows) spanning humanitarian needs (HNO), response plan requirements (HRP), population statistics (COD), INFORM severity, FTS funding flows, and CERF/CBPF project data.

Compute explainable mismatch scores to rank "forgotten crises" — countries with high need but relatively low requested resources per person in need.

Flag cost-per-beneficiary outliers across humanitarian clusters using robust, cluster-stratified statistics.

Ship an interactive Next.js dashboard with maps, trend views, dataset explorer, crisis detail panels, and an AI-assisted query interface for UN officers.

## Links

- **[Interactive Dashboard](https://datathon-2026.vercel.app)**
- **[Datathon Slides](https://docs.google.com/presentation/d/1qxZySpXLyZtiWoYP0e6SMv-GzA-ChCbVBr0C9NnXCvs/edit?usp=sharing)**
- **[Video Demo](https://drive.google.com/drive/folders/1SaSjHnCMpHp-gEXuXuZKYcp9iaVc2XUI)**

## Demo

### Map Visualizations & Data

![Country Info](assets/Country%20Info.gif)

### Deep Search

![Deep Search](assets/Deep%20Search.gif)
