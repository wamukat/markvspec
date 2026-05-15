import { printWireframeViewportCss } from "@markvspec/document-renderer";

export function renderPreviewPrintWireframeOverrideStyle(options: { includePartialPreviewClamp?: boolean } = {}): string {
  const partialPreviewClamp = options.includePartialPreviewClamp
    ? "\n        .state-screen-section[data-viewport] .wireframe-section .mm-partial-preview .mm-wireframe{max-width:100%!important;min-width:0!important;padding:0!important;width:100%!important;zoom:1!important}"
    : "";
  return `<style>
      @media print {
        .wireframe-section .mm-wireframe{border:1px solid #d1d5db!important;box-shadow:none!important;box-sizing:border-box!important;max-width:100%!important;min-width:0!important;outline:0!important;width:100%!important}
        .wireframe-section .mm-wireframe-empty{max-width:100%!important;min-width:0!important;width:100%!important}
        ${printWireframeViewportCss({ importantZoom: true })}${partialPreviewClamp}
        .wireframe-section .mm-element-wrap-table{align-self:stretch!important;box-sizing:border-box!important;display:block!important;max-width:100%!important;min-width:0!important;width:100%!important}
        .wireframe-section .mm-element-table{max-width:100%!important;min-width:0!important;table-layout:fixed!important;width:100%!important}
        .wireframe-section .mm-element-table th,.wireframe-section .mm-element-table td{box-sizing:border-box!important;overflow-wrap:anywhere!important;word-break:break-word!important}
      }
    </style>`;
}
