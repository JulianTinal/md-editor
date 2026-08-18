<p align="center">
  <img src="public/favicon.svg" alt="MD Editor" width="112" />
</p>

<h1 align="center">MD&nbsp;Editor</h1>

<p align="center">
  <strong>Escribe en texto plano, exporta documentos con diseño profesional en segundos.</strong>
</p>

<p align="center">
  Editor de Markdown con vista previa en vivo y exportación a <strong>PDF</strong> y <strong>Word</strong>
  con tipografía cuidada. Todo corre en tu navegador — sin cuentas, sin backend, sin esperas.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=20232A" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/CodeMirror-D30707?style=for-the-badge&logo=codemirror&logoColor=white" alt="CodeMirror" />
  <img src="https://img.shields.io/badge/Mermaid-FF3670?style=for-the-badge&logo=mermaid&logoColor=white" alt="Mermaid" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Licencia-MIT-a78bfa?style=flat-square" alt="Licencia MIT" />
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2022.12-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 22.12" />
  <img src="https://img.shields.io/badge/PRs-welcome-22c55e?style=flat-square" alt="PRs welcome" />
</p>

---

**MD Editor** es un editor de Markdown que convierte lo que escribes en documentos con calidad de imprenta.
El diferencial no está en features de colaboración o nube: está en la **calidad tipográfica del output**
— PDF paginado en A4 con CSS de impresión nativo, y DOCX con estilos de Word mapeados correctamente.

Abres, escribes o pegas Markdown, ves el resultado renderizado en tiempo real, y cuando estás listo exportas.
Todo el procesamiento ocurre en el cliente: **tu contenido nunca sale de tu navegador**.

## ✨ Características

- **Editor con resaltado de sintaxis** — [CodeMirror 6](https://codemirror.net/) con soporte Markdown (GFM).
- **Vista previa en vivo** — pipeline [unified](https://unifiedjs.com/) (remark → rehype) que renderiza mientras escribes.
- **Exportación a PDF** — documento A4 paginado vía [`@react-pdf/renderer`](https://react-pdf.org/), con jerarquía de títulos, tablas y código.
- **Exportación a Word** — archivo `.docx` editable vía [`@m2d/md2docx`](https://github.com/md2docx/md2docx), 100% client-side.
- **Diagramas Mermaid** — los bloques ` ```mermaid ` se renderizan en la vista previa **y** se incrustan como imagen en el PDF.
- **5 temas** — 3 oscuros (Violeta, Carmesí, Océano) y 2 claros (Papel, Escarcha), con selector en la barra.
- **Persistencia local** — tu documento se guarda en `localStorage`: recargas y sigue ahí.
- **Panel dividido redimensionable** con scroll sincronizado entre editor y vista previa.
- **Sin backend, sin rastreo** — todo se ejecuta en el navegador.

## ⚙️ Cómo funciona

```
Markdown  ──►  remark (parse + GFM)  ──►  rehype (+ sanitize)  ──►  Vista previa HTML
                     │
                     ├──►  @react-pdf/renderer  ──►  PDF (A4)
                     ├──►  @m2d/md2docx          ──►  Word (.docx)
                     └──►  mermaid               ──►  Diagramas (SVG en preview, PNG en PDF)
```

La landing es estática (Astro SSG) y el editor es una única *island* de React cargada solo en el cliente.

## 🧱 Stack

| Capa | Tecnología |
| --- | --- |
| Framework | [Astro](https://astro.build/) 7 |
| UI interactiva | [React](https://react.dev/) 19 |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) v4 |
| Editor | [CodeMirror](https://codemirror.net/) 6 |
| Markdown | [unified](https://unifiedjs.com/) (remark + rehype) |
| PDF | [`@react-pdf/renderer`](https://react-pdf.org/) |
| Word | [`@m2d/md2docx`](https://github.com/md2docx/md2docx) |
| Diagramas | [Mermaid](https://mermaid.js.org/) |
| Lenguaje | TypeScript (modo estricto) |

## 🚀 Empezar

Requisitos: **Node.js ≥ 22.12** y [pnpm](https://pnpm.io/).

```bash
# Clonar
git clone https://github.com/JulianTinal/md-editor.git
cd md-editor

# Instalar dependencias
pnpm install

# Levantar el servidor de desarrollo
pnpm dev
```

Abre <http://localhost:4321> para la landing y <http://localhost:4321/editor> para el editor.

### Compilar para producción

```bash
pnpm build      # genera el sitio estático en dist/
pnpm preview    # sirve la build localmente
```

## 📁 Estructura del proyecto

```text
src/
├── components/
│   ├── editor/          # EditorApp, EditorPane (CodeMirror), PreviewPane
│   └── landing/         # Hero, Nav, Footer, mockups animados
├── layouts/             # Layout base
├── lib/                 # markdown, exportPdf, exportDocx, mermaid, themes, site
├── pages/               # index.astro (landing), editor.astro
└── styles/              # global, prose, themes, print
public/                  # logo, favicon y assets estáticos
```

Los imports usan el alias `@` → `src` (p. ej. `@/lib/markdown`).

## 🧑‍💻 Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo con HMR |
| `pnpm build` | Compila el sitio estático a `dist/` |
| `pnpm preview` | Sirve la build de producción |

## 🤝 Contribuir

Los PRs son bienvenidos. Para cambios grandes, abre primero un *issue* para conversar el enfoque.

1. Haz un fork y crea tu rama (`git checkout -b feature/mi-mejora`).
2. Confirma tus cambios con mensajes claros.
3. Abre un Pull Request.

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Mira el archivo [`LICENSE`](LICENSE) para más detalle.

---

<p align="center">
  Hecho con <img src="https://img.shields.io/badge/-%E2%99%A5-a78bfa" alt="amor" height="14" /> por <strong>Julian Varguez</strong>
</p>
