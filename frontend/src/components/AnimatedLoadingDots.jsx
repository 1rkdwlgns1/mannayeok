import { useEffect, useState } from 'react'

function AnimatedLoadingDots() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDots((currentDots) => (currentDots.length >= 3 ? '.' : `${currentDots}.`))
    }, 450)

    return () => window.clearInterval(intervalId)
  }, [])

  return <span aria-hidden="true">{dots}</span>
}

export default AnimatedLoadingDots
