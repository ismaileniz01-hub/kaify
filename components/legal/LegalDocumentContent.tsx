import type { LegalDocument } from "@/lib/legal/documents/types";

type LegalDocumentContentProps = {
  document: LegalDocument;
};

export function LegalDocumentContent({ document }: LegalDocumentContentProps) {
  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-emerald-400">
      <p className="text-sm text-zinc-400">{document.subtitle}</p>
      {document.intro ? (
        <p className="lead text-zinc-300">{document.intro}</p>
      ) : null}
      <nav className="not-prose mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Contents
        </p>
        <ul className="grid gap-1 text-sm text-emerald-300/90 sm:grid-cols-2">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      {document.sections.map((section) => (
        <section key={section.id} id={section.id} className="mb-10">
          <h2>{section.title}</h2>
          <div className="text-zinc-300 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
            {section.blocks.map((block, index) => {
              if (block.type === "p") {
                return <p key={index}>{block.text}</p>;
              }
              return (
                <ul key={index}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            })}
          </div>
        </section>
      ))}
      {document.footer ? (
        <p className="text-sm text-zinc-400">{document.footer}</p>
      ) : null}
    </article>
  );
}
