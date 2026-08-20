function getLineChipStyle(line) {
  const theme = getSubwayLineTheme(line)

  return {
    color: theme.textColor || theme.color,
    borderColor: `${theme.color}55`,
    backgroundColor: mixLineColorWithWhite(theme.color, 0.12),
  }
}

function getSubwayLineDisplayName(line = '') {
  const displayName = String(line).trim()
  const compactName = displayName.replace(/[·\s]+/g, '')

  if (compactName === '경의선' || compactName === '경의중앙선') {
    return '경의·중앙선'
  }

  return displayName
}

function mixLineColorWithWhite(hexColor, strength) {
  const normalizedHex = hexColor.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalizedHex.slice(offset, offset + 2), 16))
  const mixedChannels = channels.map((channel) =>
    Math.round(255 + (channel - 255) * strength)
      .toString(16)
      .padStart(2, '0'),
  )

  return `#${mixedChannels.join('')}`
}

function getSubwayLineTheme(line = '') {
  const normalizedLine = getSubwayLineDisplayName(line).replace(/[·\s]+/g, '')
  const themes = [
    ['인천1호선', '#7CA8D5'],
    ['인천2호선', '#ED8B00'],
    ['경의중앙', '#77C4A3'],
    ['수인분당', '#F5A200'],
    ['신분당', '#D4003B'],
    ['김포골드', '#A17800'],
    ['공항', '#0090D2'],
    ['경춘', '#0C8E72'],
    ['경강', '#003DA5'],
    ['서해', '#8FC31F'],
    ['에버라인', '#6FB245'],
    ['의정부', '#FDA600'],
    ['우이신설', '#B0CE18'],
    ['신림', '#6789CA'],
    ['GTX-A', '#9A6292'],
    ['자기부상', '#FFCD12'],
    ['분당', '#F5A200'],
    ['1호선', '#0052A4'],
    ['2호선', '#00A84D'],
    ['3호선', '#EF7C1C'],
    ['4호선', '#00A5DE'],
    ['5호선', '#996CAC'],
    ['6호선', '#CD7C2F'],
    ['7호선', '#747F00'],
    ['8호선', '#E6186C'],
    ['9호선', '#BDB092', '#756B46'],
  ]
  const matchedTheme = themes.find(([name]) => normalizedLine.includes(name))

  if (!matchedTheme) return { color: '#94A3B8', textColor: '#64748B' }

  return {
    color: matchedTheme[1],
    textColor: matchedTheme[2] || matchedTheme[1],
  }
}

export { getLineChipStyle, getSubwayLineDisplayName, getSubwayLineTheme }
