# Agent instructions

Read docs/PRD.md, docs/ARCHITECTURE.md, docs/DESIGN_SYSTEM.md and docs/AI_AGENTS.md before changing this project.

Keep forecasting and inventory math in src/domain.js, free from browser dependencies. Never invent validation metrics, claim synthetic data is real, or label an estimate as a guarantee. No random time-series splits or fitting on future observations. All quantities and costs must be finite and nonnegative. Render imported text as text, never trusted HTML. Preserve keyboard interaction, accessible labels and mobile layouts.

Changes to planning logic require meaningful domain tests. Run npm test, npm run check and npm run build. Verify relevant browser interactions and report what was actually checked. Do not deploy, purchase services, upload business data, or add external AI providers without user authorization. Do not spawn other agents unless the user requests delegation.
