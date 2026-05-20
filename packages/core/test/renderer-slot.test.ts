import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarkVSpecDocumentComposition,
  buildStateScreenReadModels,
  composeMarkVSpecTemplate,
  documentCompositionItemIds,
  parseMarkVSpec,
  renderMarkVSpecHtml,
  renderMarkVSpecHtmlFragment,
  resolveDocumentCompositionLayoutsForViewport,
  stateScreenLayoutsForModel
} from "../src/index.js";

test("renders template slots standalone and composes screen slot content", () => {
  const templateSource = `---
id: TPL-MYPAGE-SHELL
type: template
title: マイページ共通レイアウト
---

# TPL-MYPAGE-SHELL マイページ共通レイアウト

## Layout: desktop

### TL1:L-Shell Page Shell

- row

#### Items

- L-LeftPane
- L-RightPane

### TL2:L-LeftPane Left Pane

- stack

#### Items

- E-ロゴ
- E-ログアウトボタン

### TL3:L-RightPane Right Pane

- stack

#### Items

- E-Header
- slot: content
- E-Footer

## Slots

### content Main Content

- purpose: Page-specific main content.
- required

## Elements

### TE1:E-ロゴ Image

- alt: Service logo

### TE2:E-ログアウトボタン Button

- label: Logout

### TE3:E-Header Text

- value: Member ID: M-001

### TE4:E-Footer Text

- value: Copyright
`;
  const screenSource = `---
id: SCR-MYPAGE-HOME
type: screen
title: マイページホーム
template:
  id: TPL-MYPAGE-SHELL
  src: ../templates/mypage-shell.vspec.md
---

# SCR-MYPAGE-HOME マイページホーム

## States

- idle*

## Slot: content

### L1:L-HomeContent Home Content

- stack

#### Items

- E-ページタイトル

## Elements

### 1:E-ページタイトル Heading

- level: 1
- value: Home
`;
  const template = parseMarkVSpec(templateSource);
  const screen = parseMarkVSpec(screenSource);
  const templateHtml = renderMarkVSpecHtml(template, { includeStyles: false, viewport: "desktop" });
  const composed = composeMarkVSpecTemplate(template, screen);
  const composedHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });

  assert.equal(template.screen.type, "template");
  assert.equal(template.diagnostics.length, 0);
  assert.equal(template.slotDefinitions[0]?.name, "content");
  assert.match(templateHtml, /<div class="mm-slot-placeholder" data-mm-slot="content" data-mm-render-key="slot:content">Slot: content<\/div>/);
  assert.equal(screen.slotContents[0]?.layoutGroups[0]?.id, "L-HomeContent");
  assert.equal(composed.screen.id, "SCR-MYPAGE-HOME");
  assert.equal(composed.layoutGroups.find((group) => group.id === "L-Shell")?.documentRole, "template");
  assert.equal(composed.layoutGroups.find((group) => group.id === "L-Shell")?.properties["marker"], undefined);
  assert.equal(composed.elements.find((element) => element.id === "E-ロゴ")?.documentRole, "template");
  assert.equal(composed.elements.find((element) => element.id === "E-ロゴ")?.properties["marker"], undefined);
  assert.equal(composed.slotContents[0]?.layoutGroups[0]?.properties["marker"], "L1");
  assert.match(composedHtml, /data-mm-id="L-LeftPane"/);
  assert.match(composedHtml, /data-mm-id="L-HomeContent"/);
  assert.match(composedHtml, /Home<\/h1>/);
  assert.doesNotMatch(composedHtml, /mm-slot-placeholder/);
  assert.doesNotMatch(renderMarkVSpecHtml(composed, {
    includeStyles: false,
    viewport: "desktop",
    markerVisibility: { layout: true, element: true, action: true }
  }), />TL1<\/code>|>TE1<\/code>/);
});

test("builds document composition origins for template, slot, and partial items", () => {
  const template = parseMarkVSpec(`---
id: TPL-COMPOSITION
type: template
title: Composition Shell
---

# TPL-COMPOSITION Composition Shell

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- slot:content

## Elements

### E-Nav Text

- value: Nav

## Form Groups

### F-TemplateNav Template nav form

- fields: E-Nav
`);
  const screen = parseMarkVSpec(`---
id: SCR-COMPOSITION
type: screen
title: Composition
references:
  partials:
    PRT-SUMMARY: ./summary.vspec.md
---

# SCR-COMPOSITION Composition

## States

- idle*

## Slot: content

### L-Content Content

- stack
- partial:
  - id: PRT-SUMMARY
  - states:
    - idle: loaded

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Title
`);
  const partial = parseMarkVSpec(`---
id: PRT-SUMMARY
type: partial
title: Summary
---

# PRT-SUMMARY Summary

## States

- loaded*

## Layout: mobile

### L-PartialSummary Summary

- stack
- gap: lg

#### Items

- E-PartialTitle

## Layout: mobile

### L-PartialSummary Common Summary

- stack
- gap: sm

#### Items

- E-PartialTitle

## Elements

### E-PartialTitle Text

- value: Summary
`);
  const composed = composeMarkVSpecTemplate(template, screen);
  const composition = buildMarkVSpecDocumentComposition(composed, {
    partialPreviews: new Map([["PRT-SUMMARY", partial]]),
    partialPaths: new Map([["PRT-SUMMARY", "/docs/summary.vspec.md"]])
  });

  assert.equal(composition.layouts.find((entry) => entry.id === "L-Shell")?.origin.kind, "template");
  assert.deepEqual(composition.layouts.find((entry) => entry.id === "L-Content")?.origin, {
    kind: "slot",
    slotName: "content",
    viewport: undefined
  });
  assert.deepEqual(composition.layouts.find((entry) => entry.id === "L-PartialSummary")?.origin, {
    kind: "partial",
    partialId: "PRT-SUMMARY",
    path: "/docs/summary.vspec.md"
  });
  assert.equal(composition.elements.find((entry) => entry.id === "E-Nav")?.origin.kind, "template");
  assert.equal(composition.elements.find((entry) => entry.id === "E-Title")?.origin.kind, "screen");
  assert.equal(composition.elements.find((entry) => entry.id === "E-PartialTitle")?.origin.kind, "partial");
  assert.equal(composition.formGroups.find((entry) => entry.id === "F-TemplateNav")?.origin.kind, "template");

  const specIds = documentCompositionItemIds(composition, { includeTemplateItems: false, includePartialItems: false });
  assert.deepEqual([...specIds.layoutIds].sort(), ["L-Content"]);
  assert.deepEqual([...specIds.elementIds].sort(), ["E-Title"]);
  assert.deepEqual([...specIds.formGroupIds].sort(), []);

  const resolved = resolveDocumentCompositionLayoutsForViewport(composition, {
    viewport: "mobile",
    includeTemplateLayouts: true,
    includePartialLayouts: true
  });
  assert.deepEqual(resolved.map((entry) => [entry.id, entry.origin.kind]), [
    ["L-Shell", "template"],
    ["L-Content", "slot"],
    ["L-PartialSummary", "partial"]
  ]);
  assert.equal(resolved.find((entry) => entry.id === "L-PartialSummary")?.item.viewport, "mobile");
});

test("counts slot content depth from the template insertion point", () => {
  const templateSource = `---
id: TPL-NESTED-SHELL
type: template
title: Nested Shell
---

# TPL-NESTED-SHELL Nested Shell

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- L-Body

### L-Body Body

- stack

#### Items

- slot: content
`;
  const screenSource = `---
id: SCR-NESTED-HOME
type: screen
title: Nested Home
template:
  id: TPL-NESTED-SHELL
---

# SCR-NESTED-HOME Nested Home

## Slot: content

### L-Content Content

- row

#### Items

- E-Title

## Elements

### E-Title Text

- value: Home
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const fullHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const fragment = renderMarkVSpecHtmlFragment(composed, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" });
  const slotContentStyle = 'class="mm-layout mm-layout-row mm-layout-depth-2" style="--mm-layout-margin-block:4px;--mm-layout-padding:10px;--mm-gap-xs:2px;--mm-gap-sm:5px;--mm-gap-md:7px;--mm-gap-lg:10px;--mm-gap-xl:14px" data-mm-id="L-Content"';

  assert.ok(fullHtml.includes(slotContentStyle));
  assert.ok(fragment?.html.includes(slotContentStyle));
});

test("renders slot content Tabs panels consistently in full and fragment renders", () => {
  const source = `---
id: SCR-SLOT-TABS
type: screen
title: Slot Tabs
---

# SCR-SLOT-TABS Slot Tabs

## States

- profile*

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content

## Slot: content

### L-Content Content

- stack

#### Items

- E-SlotTabs

### L-ProfilePanel Profile Panel

- stack

#### Items

- E-ProfileText

## Elements

### E-SlotTabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile

### E-ProfileText Text

- value: Profile details
`;
  const result = parseMarkVSpec(source);
  const fullHtml = renderMarkVSpecHtml(result, { includeStyles: false, viewport: "desktop" });
  const fragment = renderMarkVSpecHtmlFragment(result, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" });
  const controlledPanel = 'class="mm-controlled-panel mm-controlled-panel-tabs" data-mm-controlled-panel="L-ProfilePanel"';

  assert.ok(fullHtml.includes(controlledPanel));
  assert.ok(fragment?.html.includes(controlledPanel));
  assert.ok(fullHtml.includes("Profile details"));
  assert.ok(fragment?.html.includes("Profile details"));
});

test("keeps normally contained slot Tabs panels out of controlled panel expansion", () => {
  const source = `---
id: SCR-SLOT-CONTAINED-TABS
type: screen
title: Slot Contained Tabs
---

# SCR-SLOT-CONTAINED-TABS Slot Contained Tabs

## States

- profile*

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content

## Slot: content

### L-Content Content

- stack

#### Items

- E-SlotTabs
- L-ProfilePanel

### L-ProfilePanel Profile Panel

- stack

#### Items

- E-ProfileText

## Elements

### E-SlotTabs Tabs

- items:
  - Profile
    - panel: L-ProfilePanel
    - active when: profile

### E-ProfileText Text

- value: Profile details
`;
  const result = parseMarkVSpec(source);
  const fullHtml = renderMarkVSpecHtml(result, { includeStyles: false, viewport: "desktop" });
  const fragment = renderMarkVSpecHtmlFragment(result, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" });

  assert.doesNotMatch(fullHtml, /mm-controlled-panel-tabs/u);
  assert.doesNotMatch(fragment?.html ?? "", /mm-controlled-panel-tabs/u);
  assert.equal((fullHtml.match(/Profile details/gu) ?? []).length, 1);
  assert.equal((fragment?.html.match(/Profile details/gu) ?? []).length, 1);
});

test("skips slot content fragments for multiple template insertion points", () => {
  const templateSource = `---
id: TPL-MULTI-SLOT
type: template
title: Multi Slot
---

# TPL-MULTI-SLOT Multi Slot

## Layout: desktop

### L-Shell Shell

- stack

#### Items

- slot: content
- L-Aside

### L-Aside Aside

- stack

#### Items

- slot: content
`;
  const screenSource = `---
id: SCR-MULTI-SLOT
type: screen
title: Multi Slot
template:
  id: TPL-MULTI-SLOT
---

# SCR-MULTI-SLOT Multi Slot

## Slot: content

### L-Content Content

- row
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));

  assert.equal(renderMarkVSpecHtmlFragment(composed, "slot-content:content:default:L-Content", { includeStyles: false, viewport: "desktop" }), undefined);
});

test("renders viewport-specific slot content with common fallback", () => {
  const templateSource = `---
id: TPL-RESPONSIVE-SHELL
type: template
title: Responsive Shell
---

# TPL-RESPONSIVE-SHELL Responsive Shell

## Layout: mobile

### L-MobileShell Mobile Shell

- stack

#### Items

- slot: content
- slot: aside

## Layout: desktop

### L-DesktopShell Desktop Shell

- stack

#### Items

- slot: content
- slot: aside

## Layout: tablet

### L-TabletShell Tablet Shell

- stack

#### Items

- slot: content

## Slots

### content Main Content
`;
  const screenSource = `---
id: SCR-RESPONSIVE-HOME
type: screen
title: Responsive Home
template:
  id: TPL-RESPONSIVE-SHELL
  src: ../templates/responsive-shell.vspec.md
---

# SCR-RESPONSIVE-HOME Responsive Home

## States

- idle*

## Slot: content

### L-CommonContent Common Content

- stack
- source: \${model.cards.items}
- as: card

#### Items

- E-CommonTitle
- slot: sidebar

## Slot: sidebar

### L-CommonSidebar Common Sidebar

- stack

#### Items

- E-CommonSidebar

## Slot: sidebar: tablet

### L-TabletSidebar Tablet Sidebar

- stack

#### Items

- E-TabletSidebar

## Slot: aside

### L-CommonAside Common Aside

- stack

#### Items

- E-CommonAside

## Slot: aside: desktop

### L-DesktopAside Desktop Aside

- stack

#### Items

- E-DesktopAside

## Slot: content: mobile

### L-MobileContent Mobile Content

- stack

#### Items

- E-MobileTitle

## Slot: content: desktop

### L-DesktopContent Desktop Content

- stack

#### Items

- E-DesktopTitle

## Elements

### E-CommonTitle Heading

- value: Common content {card.title}
- src: \${model.card.title}

### E-MobileTitle Heading

- value: Mobile content

### E-DesktopTitle Heading

- value: Desktop content

### E-CommonSidebar Text

- value: Common sidebar

### E-TabletSidebar Text

- value: Tablet sidebar

### E-CommonAside Text

- value: Common aside

### E-DesktopAside Text

- value: Desktop aside
`;
  const template = parseMarkVSpec(templateSource);
  const screen = parseMarkVSpec(screenSource);
  const composed = composeMarkVSpecTemplate(template, screen);
  const mobileHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "mobile" });
  const desktopHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const tabletHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "tablet" });

  assert.equal(screen.slotContents.find((slot) => slot.name === "content" && slot.viewport === "mobile")?.layoutGroups[0]?.id, "L-MobileContent");
  assert.equal(screen.slotContents.find((slot) => slot.name === "content" && slot.viewport === "desktop")?.layoutGroups[0]?.id, "L-DesktopContent");
  assert.match(mobileHtml, /data-mm-id="L-MobileContent"/);
  assert.match(mobileHtml, /Mobile content/);
  assert.match(mobileHtml, /data-mm-id="L-CommonAside"/);
  assert.match(mobileHtml, /Common aside/);
  assert.doesNotMatch(mobileHtml, /Desktop aside/);
  assert.doesNotMatch(mobileHtml, /Desktop content/);
  assert.match(desktopHtml, /data-mm-id="L-DesktopContent"/);
  assert.match(desktopHtml, /Desktop content/);
  assert.match(desktopHtml, /data-mm-id="L-DesktopAside"/);
  assert.match(desktopHtml, /Desktop aside/);
  assert.doesNotMatch(desktopHtml, /Common aside/);
  assert.doesNotMatch(desktopHtml, /Mobile content/);
  assert.match(tabletHtml, /data-mm-id="L-CommonContent"/);
  assert.match(tabletHtml, /Common content \{card\.title\}/);
  assert.doesNotMatch(tabletHtml, /Alpha/);
  assert.doesNotMatch(tabletHtml, /Beta/);
  assert.equal((tabletHtml.match(/data-mm-id="L-TabletSidebar"/g) ?? []).length, 1);
  assert.equal((tabletHtml.match(/Tablet sidebar/g) ?? []).length, 1);
  assert.doesNotMatch(tabletHtml, /Common sidebar/);
});

test("renders template slot defaults without treating them as screen content", () => {
  const templateSource = `---
id: TPL-DEFAULT-SHELL
type: template
title: Default Shell
---

# TPL-DEFAULT-SHELL Default Shell

## Layout: mobile

### L-MobileShell Mobile Shell

- stack

#### Items

- slot: hero
- slot: notice
- slot: action

### L-DefaultNotice Default Notice

- stack

#### Items

- E-DefaultNoticeText

### L-DefaultAction Default Action

- stack

#### Items

- E-DefaultActionText

## Layout: desktop

### L-DesktopShell Desktop Shell

- stack

#### Items

- slot: hero
- slot: notice
- slot: action

### L-DefaultNotice Default Notice

- stack

#### Items

- E-DefaultNoticeText

### L-DefaultAction Default Action

- stack

#### Items

- E-DefaultActionText

## Slots

### hero Hero

- default: E-DefaultHero

### notice Notice

- default: L-DefaultNotice

### action Action

- default: L-DefaultAction

## Elements

### E-DefaultHero Heading

- value: Template hero

### E-DefaultNoticeText Text

- value: Template notice

### E-DefaultActionText Text

- value: Template action
`;
  const screenSource = `---
id: SCR-DEFAULT-HOME
type: screen
title: Default Home
template:
  id: TPL-DEFAULT-SHELL
  src: ../templates/default-shell.vspec.md
---

# SCR-DEFAULT-HOME Default Home

## States

- idle*

## Slot: action

### L-CommonAction Common Action

- stack

#### Items

- E-CommonAction

## Slot: action: desktop

### L-DesktopAction Desktop Action

- stack

#### Items

- E-DesktopAction

## Elements

### E-CommonAction Button

- label: Common action

### E-DesktopAction Button

- label: Desktop action
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const mobileHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "mobile" });
  const desktopHtml = renderMarkVSpecHtml(composed, { includeStyles: false, viewport: "desktop" });
  const heroFragment = renderMarkVSpecHtmlFragment(composed, "slot-default:hero:mobile:E-DefaultHero", { includeStyles: false, viewport: "mobile" });
  const mobileModels = buildStateScreenReadModels(composed, composed, "mobile");
  const desktopModels = buildStateScreenReadModels(composed, composed, "desktop");

  assert.match(mobileHtml, /Default: E-DefaultHero/);
  assert.match(mobileHtml, /Template hero/);
  assert.match(mobileHtml, /Default: L-DefaultNotice/);
  assert.match(mobileHtml, /Template notice/);
  assert.match(mobileHtml, /Common action/);
  assert.doesNotMatch(mobileHtml, /Template action/);
  assert.doesNotMatch(mobileHtml, /Desktop action/);
  assert.match(desktopHtml, /Desktop action/);
  assert.doesNotMatch(desktopHtml, /Common action/);
  assert.doesNotMatch(desktopHtml, /Template action/);
  assert.match(heroFragment?.html ?? "", /Template hero/);
  assert(!mobileModels[0]?.renderedIds.elementIds.has("E-DefaultHero"));
  assert(!mobileModels[0]?.renderedIds.layoutIds.has("L-DefaultNotice"));
  assert(!stateScreenLayoutsForModel(composed, mobileModels[0]!).some((layout) => layout.id === "L-DefaultNotice"));
  assert(mobileModels[0]?.renderedIds.elementIds.has("E-CommonAction"));
  assert(desktopModels[0]?.renderedIds.elementIds.has("E-DesktopAction"));
});
