// Shared markdown → HTML parser — safe, no external dependencies

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inline = (s) => {
  let r = esc(s)
  r = r
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const safe = /^https?:\/\//.test(url) ? url : '#'
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`
    })
  return r
}

export function md(text) {
  if (!text) return ''
  const lines = text.split('\n')
  let html = ''
  let inP = false
  let listType = null
  let inCode = false
  let codeLines = []

  const closeP = () => { if (inP) { html += '</p>'; inP = false } }
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null } }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html += `<pre><code>${esc(codeLines.join('\n'))}</code></pre>`
        codeLines = []; inCode = false
      } else { closeP(); closeList(); inCode = true }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    if (/^# /.test(line))        { closeP(); closeList(); html += `<h2>${inline(line.slice(2))}</h2>` }
    else if (/^## /.test(line))  { closeP(); closeList(); html += `<h3>${inline(line.slice(3))}</h3>` }
    else if (/^### /.test(line)) { closeP(); closeList(); html += `<h4>${inline(line.slice(4))}</h4>` }
    else if (/^[*-] /.test(line)) {
      closeP()
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul' }
      html += `<li>${inline(line.slice(2))}</li>`
    } else if (/^\d+\. /.test(line)) {
      closeP()
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol' }
      html += `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`
    } else if (/^-{3,}$/.test(line.trim())) {
      closeP(); closeList(); html += '<hr />'
    } else if (line.trim() === '') {
      closeP(); closeList()
    } else {
      if (!inP) { html += '<p>'; inP = true } else { html += ' ' }
      html += inline(line)
    }
  }
  closeP(); closeList()
  return html
}
