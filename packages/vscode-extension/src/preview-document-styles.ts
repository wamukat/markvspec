import {
  baseWireframeViewportCss,
  printScrollbarSuppressCss,
  printWireframeViewportCss,
  standardPrintPolicyCss,
  wireframePrintSectionCss
} from "@markvspec/document-renderer";

function previewScrollbarCss(): string {
  return `*{scrollbar-color:#9ca3af #f3f4f6;scrollbar-width:thin}
*::-webkit-scrollbar{height:10px;width:10px}
*::-webkit-scrollbar-track{background:#f3f4f6}
*::-webkit-scrollbar-thumb{background:#9ca3af;border:2px solid #f3f4f6;border-radius:999px}`;
}

export function renderScreenPreviewStyles(): string {
  return `:root{--markvspec-sticky-offset:72px;--markvspec-heading-state-views:18px;--markvspec-heading-viewport:15px;--markvspec-heading-state:14px;--markvspec-heading-detail:12px;--markvspec-heading-badge:11px}
body{background:#ffffff;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0}
.toolbar{align-items:center;background:#fff;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:9px 58px 9px 14px;position:sticky;top:0;z-index:20}
.toolbar-controls{align-items:center;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.control-group{align-items:center;display:flex;gap:7px;min-width:0}
.control-label{color:#4b5563;font-size:11px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}
.segmented{display:inline-flex;gap:0;min-width:0}
.segmented button{background:#fff;border:1px solid #cbd5e1;border-left-width:0;color:#334155;cursor:pointer;font-size:12px;line-height:1;padding:6px 9px}
.segmented button:first-child{border-left-width:1px;border-radius:5px 0 0 5px}
.segmented button:last-child{border-radius:0 5px 5px 0}
.segmented button[aria-pressed="true"]{background:#e0f2fe;border-color:#38bdf8;color:#075985;font-weight:700}
.segmented button:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;position:relative;z-index:1}
.segmented button:disabled{background:#f8fafc;color:#94a3b8;cursor:not-allowed}
.switch-control{align-items:center;display:inline-flex;gap:6px}
.switch-control input{height:16px;margin:0;width:16px}
.switch-control span{color:#334155;font-size:12px;font-weight:600;line-height:1;white-space:nowrap}
.content{min-height:calc(100vh - 44px)}
.preview{overflow:auto}
.document{margin:0 auto;max-width:1180px;padding:20px 24px 40px}
.toc{background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);display:none;max-height:calc(100vh - 92px);overflow:auto;padding:10px;position:fixed;right:16px;top:76px;width:220px;z-index:1}
.toc-inline{background:#fff;border:1px solid #d1d5db;border-radius:8px;display:block;margin:0 0 28px;padding:12px}
.toc-title{color:#374151;font-size:12px;font-weight:700;margin:0 0 8px}
.toc-list{display:grid;gap:2px;list-style:none;margin:0;padding:0}
.toc-status{color:#6b7280;font-size:12px;line-height:1.3;padding:4px 6px}
.toc-list a{border-radius:4px;color:#374151;display:block;font-size:12px;line-height:1.3;overflow:hidden;padding:4px 6px;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}
.toc-list a:hover{background:#f3f4f6;color:#111827}
.toc-list li.is-active > a{background:#dbeafe;color:#1e3a8a;font-weight:650}
.toc-sublist{display:grid;gap:2px;list-style:none;margin:2px 0 3px 12px;padding:0}
.toc-toggle{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba(15,23,42,.12);color:#111827;cursor:pointer;display:inline-flex;height:32px;justify-content:center;padding:0;position:fixed;right:14px;top:10px;width:34px;z-index:21}
.toc-toggle:hover{background:#f9fafb}
.toc-toggle:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.toc-toggle-bars,.toc-toggle-bars::before,.toc-toggle-bars::after{background:currentColor;border-radius:999px;content:"";display:block;height:2px;width:16px}
.toc-toggle-bars{position:relative}
.toc-toggle-bars::before{left:0;position:absolute;top:-5px}
.toc-toggle-bars::after{left:0;position:absolute;top:5px}
body.toc-collapsed .toc,body.toc-collapsed .toc-inline{display:none!important}
${previewScrollbarCss()}
.doc-section{break-inside:avoid;margin:0 0 28px;page-break-inside:avoid;scroll-margin-top:var(--markvspec-sticky-offset)}
.document h2[id],.document h3[id],.document h4[id]{scroll-margin-top:var(--markvspec-sticky-offset)}
.state-screen-section + .state-screen-section{border-top:2px solid #e5e7eb;padding-top:18px}
.doc-section h2{align-items:center;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;font-size:var(--markvspec-heading-state-views);gap:8px;margin:0 0 12px;padding-bottom:6px}
.doc-section h3{font-size:var(--markvspec-heading-viewport);margin:22px 0 8px}
.doc-section h5{font-size:var(--markvspec-heading-detail);margin:16px 0 8px}
.doc-section h6{font-size:12px;margin:14px 0 8px}
.section-number{font-variant-numeric:tabular-nums}
.state-viewport-section{margin:18px 0 24px;scroll-margin-top:var(--markvspec-sticky-offset)}
.state-viewport-section>h3{align-items:center;display:flex;flex-wrap:wrap;gap:8px}
.state-screen-heading{align-items:center;display:flex;flex-wrap:wrap;font-size:var(--markvspec-heading-state);gap:8px;margin:18px 0 10px}
.state-screen-subheading{color:#334155;font-weight:700}
.state-screen-detail-heading{color:#475569;font-size:12px;font-weight:700}
.screen-overview{border:1px solid #d1d5db;border-radius:6px;margin:0 0 12px;padding:12px}
.screen-overview-main{min-width:0}
.screen-id code,.mm-document-ref-id{align-items:center;background:#fff;border:1px solid #111827;border-left:3px solid #111827;border-radius:4px;color:#111827;display:inline-flex;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px;font-variant-numeric:tabular-nums;font-weight:700;justify-content:center;letter-spacing:0;line-height:1.2;min-height:18px;padding:1px 6px;vertical-align:baseline;white-space:nowrap;width:max-content}
.screen-title{font-size:16px;font-weight:650;line-height:1.35;min-width:0;overflow-wrap:anywhere}
.screen-id + .screen-title,.screen-title + .screen-description,.screen-id + .screen-description{margin-top:4px}
.screen-description{color:#374151;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
.screen-description .note-paragraph{margin:0}
.screen-description .note-paragraph + .note-paragraph{margin-top:6px}
.screen-overview-badges{align-items:center;display:flex;float:right;flex-wrap:wrap;gap:6px;justify-content:flex-end;margin:0 0 6px 12px}
.screen-meta-block{margin:12px 0 0}
.screen-meta-block h3{margin:14px 0 8px}
.screen-definition-list{border-top:1px solid #e5e7eb;margin:0}
.screen-definition-list div{border-bottom:1px solid #e5e7eb;display:grid;gap:8px;grid-template-columns:140px minmax(0,1fr);padding:7px 0}
.screen-definition-list dt{color:#4b5563;font-size:12px;font-weight:650}
.screen-definition-list dd{font-size:12px;margin:0;overflow-wrap:anywhere}
.screen-reference-title{font-weight:600}
.screen-reference-status{border:1px solid #d1d5db;border-radius:999px;color:#374151;font-size:11px;line-height:1;padding:2px 6px}
.wireframe-section,.state-flow-section{break-before:auto;page-break-before:auto}
.wireframe-section{max-width:100%;overflow-x:auto;overflow-y:visible;padding-bottom:4px}
.wireframe-section .mm-wireframe{max-width:none;padding:0;position:relative}
.wireframe-section .mm-wireframe-empty{max-width:100%;min-width:0;width:100%}
.system-events-box{background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;margin:10px 0 0;padding:7px 12px 8px}
.system-events-box h4,.system-events-box .state-screen-detail-heading{font-size:12px;margin:0 0 6px}
.system-events-box ul{display:grid;gap:6px;list-style:disc;margin:0;padding-left:18px}
.system-events-box li{font-size:12px;line-height:1.45}
.system-event-trigger{color:#4b5563}
${baseWireframeViewportCss()}
.wireframe-section .mm-layout-overlay-screen,.state-wireframe .mm-layout-overlay-screen{position:absolute}
.state-wireframe-list{display:grid;gap:18px}
.state-wireframe h3{align-items:center;display:flex;font-size:14px;gap:8px;margin:0 0 8px}
.state-wireframe .mm-wireframe{max-width:none;padding:0}
.mm-doc-label{background:#fff;border:1px solid #111827;border-radius:999px;color:#111827;display:inline-flex;font-family:inherit;font-size:12px;font-weight:600;line-height:1.3;padding:1px 8px;vertical-align:baseline;white-space:nowrap}
.state-label{font-size:14px}
.mm-doc-label-trigger{border-color:#64748b;color:#334155}
.mm-doc-label-result{border-color:#2563eb;color:#1d4ed8}
.mm-detail-ref-id{background:#fff;border:1px solid #cbd5e1;border-radius:4px;color:#1f2937;display:inline-flex;font-family:inherit;font-size:12px;font-weight:600;line-height:1.3;padding:1px 6px;vertical-align:baseline;white-space:nowrap}
.mm-ref-chip{align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:6px;color:#1f2937;display:inline-flex;font-size:12px;font-weight:600;gap:5px;line-height:1.35;max-width:100%;padding:2px 6px;text-decoration:none;vertical-align:baseline}
.mm-ref-chip .mm-id{align-self:center;margin-right:0}
.mm-ref-chip-note{color:#64748b;font-size:11px;margin-top:2px}
.state-badge{background:#dbeafe;border:1px solid #60a5fa;border-radius:999px;color:#1e3a8a;font-size:var(--markvspec-heading-badge);font-weight:600;padding:1px 6px}
.spec-table-wrap{max-width:100%;overflow:auto}
.spec-table{border-collapse:collapse;font-size:12px;width:100%}
.spec-table th,.spec-table td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}
.spec-table th{background:#f9fafb;font-weight:600;white-space:nowrap}
.spec-table tbody tr:nth-child(even){background:#fcfcfd}
.spec-table code:not(.mm-id):not(.mm-doc-label):not(.mm-document-ref-id){background:#f3f4f6;border-radius:3px;padding:1px 3px}
.state-transition-context-heading{color:#374151;font-size:13px;font-weight:700;margin:12px 0 6px}
.state-transition-axis-cell{min-width:112px;padding:6px 8px!important;position:relative}
.state-transition-axis-cell::before{background:linear-gradient(to top right,transparent calc(50% - .5px),#cbd5e1 calc(50% - .5px),#cbd5e1 calc(50% + .5px),transparent calc(50% + .5px));content:"";inset:0;position:absolute}
.state-transition-axis-labels{align-items:center;display:flex;gap:16px;inset:0;justify-content:space-between;padding:6px 8px;position:absolute}
.state-transition-axis-labels .from,.state-transition-axis-labels .to{background:#f9fafb;padding:0 2px}
.mm-inline-token{color:#0f766e;font-family:inherit;font-weight:650;padding:0 1px}
.model-sample-block{margin:18px 0}
.model-sample-path-heading{color:#374151;font-size:13px;font-weight:650;margin:8px 0 6px}
.mermaid-block{position:relative}
.mermaid-source{background:#f9fafb;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;display:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;line-height:1.5;margin:0;overflow:auto;padding:34px 12px 12px;white-space:pre}
.mermaid-source code{background:transparent;border:0;border-radius:0;color:inherit;font:inherit;padding:0}
.mermaid-block.is-source-visible .mermaid-source{display:block}
.mermaid-block.is-source-visible .mermaid-placeholder,.mermaid-block.is-source-visible .mermaid-render{display:none}
.mermaid-placeholder{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;color:#6b7280;display:flex;font-size:12px;justify-content:center;min-height:160px;padding:34px 12px 12px}
.mermaid-render{background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;overflow:auto;padding:12px}
.mermaid-render svg{height:auto;max-width:100%}
.mermaid-source-toggle{background:#fff;border:1px solid #cbd5e1;border-radius:5px;color:#334155;cursor:pointer;font-size:11px;font-weight:650;line-height:1;padding:5px 8px;position:absolute;right:8px;top:8px;z-index:1}
.mermaid-source-toggle:hover{background:#f8fafc;color:#111827}
.mermaid-source-toggle:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.action-detail-list{display:grid;gap:12px}
.action-detail{border:1px solid #d1d5db;border-radius:6px;padding:12px}
.action-detail h3{font-size:14px;margin:0 0 8px}
.action-detail dl{display:grid;grid-template-columns:120px minmax(0,1fr);gap:6px 10px;margin:0}
.action-detail dt{color:#4b5563;font-size:12px;font-weight:600}
.action-detail dd{font-size:12px;margin:0}
.action-detail ul{margin:0;padding-left:16px}
.process-flow{display:grid;gap:8px}
.process-card{background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;padding:8px}
.process-card-header{align-items:center;display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between;margin-bottom:6px}
.process-card-title{align-items:center;display:inline-flex;flex-wrap:wrap;font-weight:650;gap:5px;min-width:0}
.process-card-meta{background:#f8fafc;border:1px solid #cbd5e1;border-radius:999px;color:#475569;font-size:11px;font-weight:600;line-height:1.2;padding:2px 7px}
.process-flow-connector{align-items:center;color:#64748b;display:flex;font-size:13px;font-weight:700;justify-content:center;line-height:1;margin:-2px 0}
.process-flow-connector::before{content:"↓"}
.process-parallel-group-card{background:#f8fafc;border-style:dashed}
.process-parallel-children{display:grid;gap:8px}
.process-step-card-child{background:#fff}
.process-resolve-card{border-color:#93c5fd}
.entity-notes,.entity-overview{display:grid;gap:6px}
.entity-notes .note-paragraph,.entity-overview .note-paragraph{margin:0}
.entity-notes pre,.entity-overview pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;margin:0;overflow:auto;padding:8px;white-space:pre-wrap}
.doc-section>.entity-overview+.spec-table-wrap,.doc-section>.entity-overview+.spec-empty,.doc-section>.entity-overview+.form-group-spec-fragment,.element-spec-fragment>.entity-overview+.spec-table-wrap,.action-spec-fragment>.entity-overview+.spec-table-wrap{margin-top:12px}
.doc-section>.spec-table-wrap+.entity-notes,.doc-section>.spec-empty+.entity-notes,.doc-section>.form-group-spec-fragment+.entity-notes,.element-spec-fragment>.spec-table-wrap+.entity-notes,.action-spec-fragment>.spec-table-wrap+.entity-notes{margin-top:12px}
.note-list{display:grid;gap:12px}
.note-block{border:1px solid #d1d5db;border-radius:6px;padding:12px}
.note-block h3{align-items:center;display:flex;font-size:14px;gap:8px;justify-content:space-between;margin:0 0 8px}
.note-line{color:#6b7280;font-size:12px;font-weight:400}
.note-content{background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;line-height:1.5;margin:0;overflow:auto;padding:10px;white-space:pre-wrap}
.spec-empty{color:#6b7280;font-size:12px}
.spec-reference{font-size:12px;margin:0 0 10px}
.state-flow-diagram{position:relative}
.state-flow-diagram,.state-flow-diagram .mermaid-block,.state-flow-diagram .mermaid-placeholder,.state-flow-diagram .mermaid-render{min-height:260px}
.state-flow-table-link{align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:5px;box-shadow:0 2px 8px rgba(15,23,42,.12);color:#334155;display:inline-flex;height:28px;justify-content:center;left:8px;position:absolute;text-decoration:none;top:8px;width:28px;z-index:2}
.state-flow-table-link:hover{background:#f8fafc;color:#111827}
.state-flow-table-link:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.state-flow-table-link-icon{background:linear-gradient(currentColor,currentColor) 0 33%/100% 1px no-repeat,linear-gradient(currentColor,currentColor) 0 66%/100% 1px no-repeat,linear-gradient(90deg,currentColor,currentColor) 33% 0/1px 100% no-repeat,linear-gradient(90deg,currentColor,currentColor) 66% 0/1px 100% no-repeat;border:1px solid currentColor;border-radius:2px;box-sizing:border-box;height:15px;width:15px}
.state-flow-table-link-label{display:none}
.spec-list{margin:0;padding-left:16px}
.spec-effect-list{display:grid;gap:3px}
.spec-nested-list{margin-top:3px}
.spec-list-label{color:#374151;font-weight:600}
.mm-chip{align-items:center;border:1px solid #d1d5db;border-radius:999px;display:inline-flex;font-size:11px;font-weight:650;line-height:1.2;max-width:100%;padding:2px 7px;vertical-align:middle;white-space:normal}
.mm-chip-type{background:#f9fafb;color:#374151}
.mm-chip-tone-neutral{background:#f9fafb;border-color:#d1d5db;color:#374151}
.mm-chip-tone-info{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.mm-chip-tone-success{background:#f0fdf4;border-color:#86efac;color:#15803d}
.mm-chip-tone-warning{background:#fffbeb;border-color:#fcd34d;color:#b45309}
.mm-chip-tone-danger{background:#fef2f2;border-color:#fca5a5;color:#b91c1c}
.mm-repeated-badge{background:#f8fafc;border-color:#cbd5e1;color:#64748b;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}
.mm-unplaced-badge{background:#fff7ed;border-color:#fdba74;color:#9a3412;gap:4px}
.mm-unplaced-icon{border:1.5px solid currentColor;border-radius:999px;box-sizing:border-box;display:inline-block;height:8px;position:relative;width:12px}
.mm-unplaced-icon::after{background:currentColor;content:"";height:1.5px;left:-2px;position:absolute;top:3px;transform:rotate(-35deg);width:16px}
.spec-table tr:has(.mm-repeated-badge){background:#f8fafc;color:#64748b}
.spec-table tr:has(.mm-unplaced-badge){background:#fff7ed}
body.hide-repeated-content .spec-table tr:has(.mm-repeated-badge){display:none}
body.hide-repeated-content .system-events-box li:has(.mm-repeated-badge){display:none}
body.hide-repeated-content .mm-marker-repeated{display:none}
body.hide-repeated-content .mm-marker-link:has(.mm-marker-repeated){display:none}
body.hide-repeated-content .spec-table-wrap[data-mm-repeated-empty="true"],body.hide-repeated-content .spec-empty[data-mm-repeated-empty="true"],body.hide-repeated-content .element-detail-group[data-mm-repeated-empty="true"],body.hide-repeated-content .layout-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .element-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .action-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .system-events-box[data-mm-repeated-empty="true"]{display:none}
body.hide-repeated-content [data-mm-repeated-empty-heading="true"]{display:none}
.repeated-layout-only-message{display:none}
body.hide-repeated-content .repeated-layout-only-message[data-mm-show-repeated-hidden="true"]{display:block}
.mm-partial-preview{position:relative}
.mm-partial-preview .mm-wireframe{max-width:100%!important;min-width:0!important;padding:0!important;width:100%!important}
.mm-partial-preview-link{color:inherit;display:inline-block;text-decoration:none}
.mm-partial-preview-link:focus-visible .mm-partial-preview-badge,.mm-partial-preview-link:hover .mm-partial-preview-badge{background:#e0e7ff;border-color:#4f46e5;color:#312e81}
.mm-partial-preview-badge{background:#eef2ff;border:1px solid #818cf8;border-radius:999px;color:#3730a3;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:10px;font-weight:700;line-height:1;max-width:calc(100% - 12px);overflow:hidden;padding:3px 7px;position:absolute;right:4px;text-overflow:ellipsis;top:-11px;white-space:nowrap;z-index:3}
.mm-id{align-items:center;align-self:flex-start;border:1px solid transparent;display:inline-flex;flex:0 0 auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:9px;font-variant-numeric:tabular-nums;font-weight:700;justify-content:center;letter-spacing:0;line-height:1;margin-right:6px;min-height:16px;min-width:16px;padding:1px 4px;width:max-content}
.mm-marker-layout{background:#ecfeff;border-color:#67e8f9;border-left:3px solid #0891b2;border-radius:4px;color:#155e75}
.mm-marker-element{background:rgba(255,255,255,.72);border-color:#f59e0b;border-radius:999px;color:#92400e;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.mm-marker-action{background:rgba(255,255,255,.78);border-color:#22c55e;border-radius:4px;color:#166534;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.mm-marker-message{background:#fef2f2;border-color:#fca5a5;border-radius:4px;color:#991b1b;box-shadow:0 1px 2px rgba(15,23,42,.12);margin-right:4px}
.mm-marker-link{display:inline-flex;pointer-events:auto;text-decoration:none}
body.hide-marker-layout .mm-marker-layout{display:none}
body.hide-marker-element .mm-marker-element{display:none}
body.hide-marker-action .mm-marker-action{display:none}
@media (min-width:760px){
    .content{padding-right:252px}
    body.toc-collapsed .content{padding-right:0}
    .toc{display:block}
    .toc-inline{display:none}
}
@media (max-width:640px){
    .toolbar{align-items:flex-start;padding-right:58px}
    .toolbar-controls{justify-content:flex-start;width:100%}
    .control-group{flex-wrap:wrap}
    .document{padding:14px 12px 32px}
    .screen-overview-badges{float:none;justify-content:flex-start;margin:0 0 8px}
    .screen-definition-list div{grid-template-columns:1fr}
    .spec-table{font-size:11px}
}
@media print{
    @page{margin:14mm;size:A4 landscape}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{background:#fff;font-size:11pt}
    :root{--markvspec-sticky-offset:0px;--markvspec-heading-state-views:15pt;--markvspec-heading-viewport:12.5pt;--markvspec-heading-state:11.5pt;--markvspec-heading-detail:10pt;--markvspec-heading-badge:8.5pt}
    .toolbar{display:none}
    .toc-toggle{display:none}
    .toc{display:none}
    .toc-inline{box-shadow:none;break-inside:avoid;display:block;margin-bottom:18pt;page-break-inside:avoid}
    .toc-status.is-loading{display:none}
    .toc-list li.is-active > a{background:transparent;color:#374151;font-weight:400}
    body.toc-collapsed .toc-inline{display:block!important}
    .toc-inline li[hidden]{display:list-item!important}
    .content{display:block;min-height:auto}
    .document{margin:0;max-width:none;padding:0}
    .doc-section{break-inside:auto;margin-bottom:18pt;page-break-inside:auto}
    .state-screen-section + .state-screen-section{border-top:0;padding-top:0}
    ${standardPrintPolicyCss()}
    ${printScrollbarSuppressCss()}
    .doc-section h2{break-after:avoid;font-size:15pt;page-break-after:avoid}
    .doc-section h3,.doc-section h4,.doc-section h5,.doc-section h6{break-after:avoid;page-break-after:avoid}
    .wireframe-section{overflow:visible}
    ${wireframePrintSectionCss()}
    .wireframe-section .mm-wireframe{border:1px solid #d1d5db;box-shadow:none;box-sizing:border-box;max-width:100%!important;outline:0;overflow:visible;padding:10pt;position:relative;width:100%!important}
    .wireframe-section .mm-wireframe-empty{max-width:100%!important;min-width:0!important;width:100%!important}
    ${printWireframeViewportCss({ includeMinWidth: true })}
    .state-screen-section[data-viewport] .wireframe-section .mm-partial-preview .mm-wireframe{max-width:100%!important;min-width:0!important;padding:0!important;width:100%!important;zoom:1!important}
    .wireframe-section .mm-layout{max-width:100%;overflow-wrap:anywhere}
    .wireframe-section .mm-layout-row{flex-wrap:wrap}
    .wireframe-section input,.wireframe-section select,.wireframe-section textarea{max-width:100%;min-width:0}
    .wireframe-section .mm-element-wrap-table{align-self:stretch!important;box-sizing:border-box!important;display:block!important;max-width:100%!important;min-width:0!important;width:100%!important}
    .wireframe-section .mm-element-table{max-width:100%!important;min-width:0!important;table-layout:fixed!important;width:100%!important}
    .wireframe-section .mm-element-table th,.wireframe-section .mm-element-table td{box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word}
    .state-wireframe{break-inside:avoid;page-break-inside:avoid}
    .state-wireframe .mm-layout-row{flex-wrap:wrap}
    .state-wireframe input,.state-wireframe select,.state-wireframe textarea{max-width:100%;min-width:0}
    .spec-table-wrap{overflow:visible}
    .spec-table{font-size:8.5pt;table-layout:fixed;width:100%}
    .spec-table thead{display:table-header-group}
    .spec-table tr{break-inside:avoid;page-break-inside:avoid}
    .spec-table th,.spec-table td{overflow-wrap:anywhere;padding:4pt 5pt;word-break:break-word}
    .spec-table th{white-space:normal}
    .spec-table code:not(.mm-id):not(.mm-doc-label):not(.mm-document-ref-id){background:transparent;padding:0}
    .mm-inline-token{color:inherit}
    .spec-table code.mm-id{padding:1px 4px}
    .mm-marker-layout{background:#ecfeff!important;border-color:#67e8f9!important;border-left-color:#0891b2!important;color:#155e75!important}
    .mm-marker-element{background:rgba(255,255,255,.72)!important;border-color:#f59e0b!important;box-shadow:0 1px 2px rgba(15,23,42,.12)!important;color:#92400e!important}
    .mm-marker-action{background:rgba(255,255,255,.78)!important;border-color:#22c55e!important;box-shadow:0 1px 2px rgba(15,23,42,.12)!important;color:#166534!important}
    .mm-marker-message{background:#fef2f2!important;border-color:#fca5a5!important;box-shadow:0 1px 2px rgba(15,23,42,.12)!important;color:#991b1b!important}
    .mm-marker-link{display:inline-flex;pointer-events:auto;text-decoration:none}
    body.hide-repeated-content .spec-table tr:has(.mm-repeated-badge){display:table-row}
    body.hide-repeated-content .system-events-box li:has(.mm-repeated-badge){display:list-item}
    body.hide-repeated-content .mm-marker-repeated{display:inline-flex}
    body.hide-repeated-content .mm-marker-link:has(.mm-marker-repeated){display:inline-flex}
    body.hide-repeated-content .spec-table-wrap[data-mm-repeated-empty="true"],body.hide-repeated-content .spec-empty[data-mm-repeated-empty="true"],body.hide-repeated-content .element-detail-group[data-mm-repeated-empty="true"],body.hide-repeated-content .layout-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .element-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .action-spec-fragment[data-mm-repeated-empty="true"],body.hide-repeated-content .system-events-box[data-mm-repeated-empty="true"]{display:block}
    body.hide-repeated-content [data-mm-repeated-empty-heading="true"]{display:block}
    .repeated-layout-only-message{display:none!important}
    .mermaid-source,.mermaid-render{break-inside:avoid;font-size:8.5pt;max-width:100%;overflow:visible;page-break-inside:avoid;white-space:pre-wrap}
    .mermaid-render svg{display:block;height:auto!important;margin:0 auto;max-height:180mm;max-width:100%;width:auto!important}
    .action-detail,.note-block,.process-card{break-inside:avoid;page-break-inside:avoid}
    .process-flow{gap:6px}
    .process-flow-connector{font-size:10pt}
}
`;
}

export function renderProjectPreviewStyles(): string {
  return `:root{--markvspec-sticky-offset:72px;--markvspec-heading-state-views:18px;--markvspec-heading-viewport:15px;--markvspec-heading-state:14px;--markvspec-heading-detail:12px;--markvspec-heading-badge:11px}
body{background:#ffffff;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0}
.toolbar{align-items:center;background:#fff;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;padding:10px 58px 10px 14px;position:sticky;top:0;z-index:20}
.toolbar > div:first-child{min-width:220px}
.title{font-size:14px;font-weight:600}
.meta{color:#6b7280;display:flex;flex-wrap:wrap;font-size:12px;gap:8px}
.toolbar-controls{align-items:center;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.control-group{align-items:center;display:flex;gap:7px;min-width:0}
.control-label{color:#4b5563;font-size:11px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}
.segmented{display:inline-flex;gap:0;min-width:0}
.segmented button{background:#fff;border:1px solid #cbd5e1;border-left-width:0;color:#334155;cursor:pointer;font-size:12px;line-height:1;padding:6px 9px}
.segmented button:first-child{border-left-width:1px;border-radius:5px 0 0 5px}
.segmented button:last-child{border-radius:0 5px 5px 0}
.segmented button[aria-pressed="true"]{background:#e0f2fe;border-color:#38bdf8;color:#075985;font-weight:700}
.segmented button:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;position:relative;z-index:1}
.segmented button:disabled{background:#f8fafc;color:#94a3b8;cursor:not-allowed}
.switch-control{align-items:center;display:inline-flex;gap:6px}
.switch-control input{height:16px;margin:0;width:16px}
.switch-control span{color:#334155;font-size:12px;font-weight:600;line-height:1;white-space:nowrap}
.content{min-height:calc(100vh - 44px)}
.document{margin:0 auto;max-width:1180px;padding:20px 24px 40px}
.toc{background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);display:none;max-height:calc(100vh - 92px);overflow:auto;padding:10px;position:fixed;right:16px;top:76px;width:220px;z-index:1}
.toc-title{color:#374151;font-size:12px;font-weight:700;margin:0 0 8px}
.toc-list{display:grid;gap:2px;list-style:none;margin:0;padding:0}
.toc-status{color:#6b7280;font-size:12px;line-height:1.3;padding:4px 6px}
.toc-list a{border-radius:4px;color:#374151;display:block;font-size:12px;line-height:1.3;overflow:hidden;padding:4px 6px;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}
.toc-list a:hover{background:#f3f4f6;color:#111827}
.toc-list li.is-active > a{background:#dbeafe;color:#1e3a8a;font-weight:650}
.toc-toggle{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba(15,23,42,.12);color:#111827;cursor:pointer;display:inline-flex;height:32px;justify-content:center;padding:0;position:fixed;right:14px;top:10px;width:34px;z-index:21}
.toc-toggle:hover{background:#f9fafb}
.toc-toggle:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.toc-toggle-bars,.toc-toggle-bars::before,.toc-toggle-bars::after{background:currentColor;border-radius:999px;content:"";display:block;height:2px;width:16px}
.toc-toggle-bars{position:relative}
.toc-toggle-bars::before{left:0;position:absolute;top:-5px}
.toc-toggle-bars::after{left:0;position:absolute;top:5px}
body.toc-collapsed .toc{display:none!important}
${previewScrollbarCss()}
.doc-section{break-inside:avoid;margin:0 0 28px;page-break-inside:avoid;scroll-margin-top:var(--markvspec-sticky-offset)}
.document h2[id],.document h3[id],.document h4[id]{scroll-margin-top:var(--markvspec-sticky-offset)}
.state-viewport-section{margin:18px 0 24px;scroll-margin-top:var(--markvspec-sticky-offset)}
.state-viewport-section>h3{align-items:center;display:flex;flex-wrap:wrap;font-size:var(--markvspec-heading-viewport);gap:8px;margin:22px 0 8px}
.state-screen-heading{align-items:center;display:flex;flex-wrap:wrap;font-size:var(--markvspec-heading-state);gap:8px;margin:18px 0 10px}
.state-screen-subheading{color:#334155;font-size:var(--markvspec-heading-detail);font-weight:700}
.state-screen-detail-heading{color:#475569;font-size:12px;font-weight:700;margin:14px 0 8px}
.state-badge{background:#dbeafe;border:1px solid #60a5fa;border-radius:999px;color:#1e3a8a;font-size:var(--markvspec-heading-badge);font-weight:600;padding:1px 6px}
.section-number{font-variant-numeric:tabular-nums}
.wireframe-section{max-width:100%;overflow-x:auto;overflow-y:visible;padding-bottom:4px}
.wireframe-section .mm-wireframe{max-width:none;padding:0;position:relative}
.wireframe-section .mm-wireframe-empty{max-width:100%;min-width:0;width:100%}
.display-explanations-box{background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;margin:10px 0 0;padding:7px 12px 8px}
.display-explanations-box .state-screen-detail-heading{font-size:12px;margin:0 0 6px}
.display-explanation-item{margin-top:6px}
.display-explanation-item h6{align-items:center;display:flex;font-size:12px;gap:4px;margin:0 0 4px}
.display-explanation-item dl{display:grid;gap:2px 8px;grid-template-columns:max-content 1fr;margin:0}
.display-explanation-item dt{color:#475569;font-weight:700}
.display-explanation-item dd{margin:0}
.display-explanation-item ul{margin:0;padding-left:18px}
.display-updates-box .spec-table-wrap{margin-top:6px}
.display-update-trigger{display:grid;gap:2px}
.display-update-note{color:#64748b;font-size:11px}
.display-update-line{align-items:center;display:flex;flex-wrap:wrap;gap:7px}
.display-update-arrow{color:#64748b;font-weight:700}
.display-update-ref{align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:4px;display:inline-flex;font-weight:600;gap:2px;line-height:1.2;padding:2px 7px;white-space:nowrap}
.display-update-layout{border-color:#67e8f9;color:#155e75}
.display-update-element{border-color:#f59e0b;color:#92400e}
.display-update-overlay{color:#475569}
.display-update-suffix{color:#64748b;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px}
.system-events-box{background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;margin:10px 0 0;padding:7px 12px 8px}
.system-events-box h4,.system-events-box .state-screen-detail-heading{font-size:12px;margin:0 0 6px}
.system-events-box ul{display:grid;gap:6px;list-style:disc;margin:0;padding-left:18px}
.system-events-box li{font-size:12px;line-height:1.45}
.system-event-trigger{color:#4b5563}
${baseWireframeViewportCss()}
.doc-section h2{border-bottom:1px solid #d1d5db;font-size:var(--markvspec-heading-state-views);margin:0 0 12px;padding-bottom:6px}
.spec-table-wrap{max-width:100%;overflow:auto}
.spec-table{border-collapse:collapse;font-size:12px;width:100%}
.spec-table th,.spec-table td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}
.spec-table th{background:#f9fafb;font-weight:600;white-space:nowrap}
.spec-table tbody tr:nth-child(even){background:#fcfcfd}
.spec-table code:not(.mm-id):not(.mm-doc-label):not(.mm-document-ref-id){background:#f3f4f6;border-radius:3px;padding:1px 3px}
.state-transition-context-heading{color:#374151;font-size:13px;font-weight:700;margin:12px 0 6px}
.state-transition-axis-cell{min-width:112px;padding:6px 8px!important;position:relative}
.state-transition-axis-cell::before{background:linear-gradient(to top right,transparent calc(50% - .5px),#cbd5e1 calc(50% - .5px),#cbd5e1 calc(50% + .5px),transparent calc(50% + .5px));content:"";inset:0;position:absolute}
.state-transition-axis-labels{align-items:center;display:flex;gap:16px;inset:0;justify-content:space-between;padding:6px 8px;position:absolute}
.state-transition-axis-labels .from,.state-transition-axis-labels .to{background:#f9fafb;padding:0 2px}
.mm-repeated-badge{background:#f8fafc;border-color:#cbd5e1;color:#64748b}
.mm-unplaced-badge{background:#fff7ed;border-color:#fdba74;color:#9a3412}
.spec-table tr:has(.mm-repeated-badge){background:#f8fafc;color:#64748b}
.spec-table tr:has(.mm-unplaced-badge){background:#fff7ed}
.mm-inline-token{color:#0f766e;font-family:inherit;font-weight:650;padding:0 1px}
.model-sample-block{margin:18px 0}
.model-sample-path-heading{color:#374151;font-size:13px;font-weight:650;margin:8px 0 6px}
.spec-empty{color:#6b7280;font-size:12px}
.spec-reference{font-size:12px;margin:0 0 10px}
.mermaid-block{position:relative}
.mermaid-source{background:#f9fafb;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;display:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;line-height:1.5;margin:0;overflow:auto;padding:34px 12px 12px;white-space:pre}
.mermaid-source code{background:transparent;border:0;border-radius:0;color:inherit;font:inherit;padding:0}
.mermaid-block.is-source-visible .mermaid-source{display:block}
.mermaid-block.is-source-visible .mermaid-placeholder,.mermaid-block.is-source-visible .mermaid-render{display:none}
.mermaid-placeholder{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;color:#6b7280;display:flex;font-size:12px;justify-content:center;min-height:160px;padding:34px 12px 12px}
.mermaid-render{background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;overflow:auto;padding:12px}
.mermaid-render svg{height:auto;max-width:100%}
.mermaid-source-toggle{background:#fff;border:1px solid #cbd5e1;border-radius:5px;color:#334155;cursor:pointer;font-size:11px;font-weight:650;line-height:1;padding:5px 8px;position:absolute;right:8px;top:8px;z-index:1}
.mermaid-source-toggle:hover{background:#f8fafc;color:#111827}
.mermaid-source-toggle:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
@media (min-width:760px){
    .content{padding-right:252px}
    body.toc-collapsed .content{padding-right:0}
    .toc{display:block}
}
@media (max-width:640px){
    .toolbar{align-items:flex-start;padding-right:58px}
    .document{padding:14px 12px 32px}
    .spec-table{font-size:11px}
}
@media print{
    @page{margin:14mm;size:A4 landscape}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{background:#fff}
    :root{--markvspec-sticky-offset:0px;--markvspec-heading-state-views:15pt;--markvspec-heading-viewport:12.5pt;--markvspec-heading-state:11.5pt;--markvspec-heading-detail:10pt;--markvspec-heading-badge:8.5pt}
    .toolbar{display:none}
    .toc-toggle{display:none}
    .toc{display:none}
    .toc-status.is-loading{display:none}
    .toc-list li.is-active > a{background:transparent;color:#374151;font-weight:400}
    .document{margin:0;max-width:none;padding:0}
    .doc-section{break-inside:auto;margin-bottom:18pt;page-break-inside:auto}
    ${standardPrintPolicyCss()}
    ${printScrollbarSuppressCss()}
    .wireframe-section{overflow:visible}
    ${wireframePrintSectionCss()}
    .wireframe-section .mm-wireframe{border:1px solid #d1d5db;box-shadow:none;box-sizing:border-box;max-width:100%!important;outline:0;width:100%!important}
    .wireframe-section .mm-wireframe-empty{max-width:100%!important;min-width:0!important;width:100%!important}
    ${printWireframeViewportCss({ includeMinWidth: true })}
    .wireframe-section .mm-element-wrap-table{align-self:stretch!important;box-sizing:border-box!important;display:block!important;max-width:100%!important;min-width:0!important;width:100%!important}
    .wireframe-section .mm-element-table{max-width:100%!important;min-width:0!important;table-layout:fixed!important;width:100%!important}
    .wireframe-section .mm-element-table th,.wireframe-section .mm-element-table td{box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word}
    .spec-table-wrap{overflow:visible}
    .spec-table{font-size:8.5pt;table-layout:fixed;width:100%}
    .spec-table thead{display:table-header-group}
    .spec-table th,.spec-table td{overflow-wrap:anywhere;padding:4pt 5pt;word-break:break-word}
    .mm-inline-token{color:inherit}
    .mermaid-source,.mermaid-render{break-inside:avoid;font-size:8.5pt;max-width:100%;overflow:visible;page-break-inside:avoid;white-space:pre-wrap}
    .mermaid-render svg{display:block;height:auto!important;margin:0 auto;max-height:180mm;max-width:100%;width:auto!important}
}
`;
}
