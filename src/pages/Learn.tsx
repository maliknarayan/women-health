import { marked } from 'marked'
import { Link, useParams } from 'react-router-dom'

const files = import.meta.glob('../content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// files are named NN-slug.md so the prefix sets the order
const articles = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, md]) => ({
    slug: path.split('/').pop()!.replace(/^\d+-/, '').replace(/\.md$/, ''),
    title: md.match(/^# (.+)$/m)?.[1] ?? '',
    summary: md.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '',
    html: marked.parse(md, { async: false }),
  }))

const Disclaimer = () => (
  <p className="muted small">General information, not medical advice. Pending review by a qualified doctor.</p>
)

export function LearnList() {
  return (
    <>
      <h1>Learn</h1>
      <ul className="plain articles">
        {articles.map((a) => (
          <li key={a.slug} className="card">
            <Link to={`/learn/${a.slug}`}><h2>{a.title}</h2></Link>
            <p className="muted">{a.summary}</p>
          </li>
        ))}
      </ul>
      <Disclaimer />
    </>
  )
}

export function Article() {
  const { slug } = useParams()
  const article = articles.find((a) => a.slug === slug)
  if (!article) return <p>Article not found. <Link to="/learn">Back to Learn</Link></p>
  return (
    <>
      <Link to="/learn">← All topics</Link>
      {/* content is bundled from our own markdown files, never user input */}
      <article className="card prose" dangerouslySetInnerHTML={{ __html: article.html }} />
      <Disclaimer />
    </>
  )
}
