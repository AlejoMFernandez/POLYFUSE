/* ============================================================
   Tiny DOM builder — framework-free, typed, ergonomic.
   ============================================================ */

type Child = Node | string | number | false | null | undefined | Child[];

export interface ElProps {
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  style?: Partial<CSSStyleDeclaration> | Record<string, string>;
  dataset?: Record<string, string>;
  attrs?: Record<string, string | number | boolean>;
  /** Event listeners, e.g. { click: () => {} } */
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[K]) => void }> &
    Record<string, (ev: Event) => void>;
  [key: string]: unknown;
}

function appendChildren(node: Node, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) appendChildren(node, child);
    else if (child instanceof Node) node.appendChild(child);
    else node.appendChild(document.createTextNode(String(child)));
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

function applyProps(node: HTMLElement | SVGElement, props: ElProps): void {
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (key === 'class') node.setAttribute('class', String(value));
    else if (key === 'id') node.setAttribute('id', String(value));
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else if (key === 'style') Object.assign((node as HTMLElement).style, value);
    else if (key === 'dataset') {
      for (const [d, v] of Object.entries(value as Record<string, string>)) {
        (node as HTMLElement).dataset[d] = v;
      }
    } else if (key === 'attrs') {
      for (const [a, v] of Object.entries(value as Record<string, unknown>)) {
        node.setAttribute(a, String(v));
      }
    } else if (key === 'on') {
      for (const [evt, fn] of Object.entries(value as Record<string, EventListener>)) {
        node.addEventListener(evt, fn);
      }
    }
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Build an SVG element in the SVG namespace. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  appendChildren(node, children);
  return node;
}

/** Remove all children from a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** querySelector with a non-null assertion + type. */
export function qs<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(sel);
  if (!node) throw new Error(`Element not found: ${sel}`);
  return node;
}

/** Icon helper — returns an inline SVG built from a path string (24x24 grid). */
export function icon(paths: string, size = 24): SVGSVGElement {
  const node = svg('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  });
  node.innerHTML = paths;
  return node;
}
