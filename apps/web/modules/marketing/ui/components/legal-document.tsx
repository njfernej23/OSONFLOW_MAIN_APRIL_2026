import type { ReactNode } from "react"

export type LegalSection = {
  heading: string
  body: ReactNode
}

export const LegalList = ({ items }: { items: ReactNode[] }) => (
  <ul className="legal__list">
    {items.map((item, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static prose, order never changes
      <li key={index}>{item}</li>
    ))}
  </ul>
)

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export const LegalDocument = ({
  title,
  summary,
  lastUpdated,
  sections,
}: {
  title: string
  summary: string
  lastUpdated: string
  sections: LegalSection[]
}) => (
  <>
    <section className="section legal-hero">
      <div className="container">
        <span className="eyebrow">Legal</span>
        <h1 className="legal-hero__title">{title}</h1>
        <p className="legal-hero__lead">{summary}</p>
        <p className="legal-hero__meta">
          Last updated{" "}
          <time dateTime={lastUpdated}>
            {new Date(lastUpdated).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </p>
      </div>
    </section>

    <section className="section legal">
      <div className="container legal__grid">
        <nav aria-label="On this page" className="legal__toc">
          <h2 className="legal__toc-title">On this page</h2>
          <ol className="legal__toc-list">
            {sections.map((section, index) => (
              <li key={section.heading}>
                <a href={`#${slugify(section.heading)}`}>
                  <span className="legal__toc-num">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal__body">
          {sections.map((section, index) => (
            <section
              className="legal__section"
              id={slugify(section.heading)}
              key={section.heading}
            >
              <h2 className="legal__heading">
                <span className="legal__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.heading}
              </h2>
              <div className="legal__prose">{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </section>
  </>
)
