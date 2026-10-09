# Stockwise design system · v0.2

Operational analytics workspace, designed for scanning dense information. White navigation, cool slate canvas, blue primary actions and navy insight panels. One type family (system sans serif) keeps numbers and labels legible; no decorative serif headings or external font requests.

Tokens: canvas #f6f8fc; surface #ffffff; ink #152238; muted #64748b; primary #2563eb; primary-soft #eff5ff; border #e3e9f2; forecast #8b5cf6; warning #a96509; danger #b33f37; healthy #247452. Actual demand is blue; projected demand is dashed violet. Status has text and colored dots. Main UI is 12–14px, titles 27–30px, metrics 29–32px, cards 12px radius, controls 8px radius. Spacing uses 4/8/12/16/24/32px.

Logo: public/brand/mark.svg. An original vector mark combines stacked inventory layers and forward movement in a 48px blue square; not a Unicode icon. Display 34–38px in navigation, preserve square aspect ratio and clear space of at least 8px. The wordmark is “Stockwise” in a semibold sans face. Favicon uses the same symbol. Trademark availability has not been researched.

Components: keyboard-accessible navigation, dataset provenance banner, metric cards, chart with accessible summary, risk panel, stock table, scenario controls, inventory inputs, benchmark table, data provenance panel, upload control, sign-in dialog and explicit workspace save states. Imported names are escaped. Error/loading/empty states are visible. No color-only status cues. Focus uses a 3px blue ring.

Responsive: navigation moves to a horizontal section below 700px; content stacks below 1000px; dense tables scroll inside their panel. Numerical labels stay near inputs. Dialog supports Escape and native focus trapping. Reduced motion respected. Readability and source/assumption distinctions take priority over marketing copy.
