import { useState } from 'react'
import { lessons } from './lessons/index.js'
import './App.css'

export default function App() {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0].id)
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId)
  const Lesson = selectedLesson.component

  return (
    <div className="app-shell">
      <header className="course-header">
        <span className="course-title">Procedural World Building</span>
        <nav className="lesson-nav" aria-label="Course lessons">
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              className="lesson-nav__button"
              aria-current={lesson.id === selectedLessonId ? 'page' : undefined}
              aria-controls="lesson-content"
              onClick={() => setSelectedLessonId(lesson.id)}
            >
              Lesson {lesson.number} — {lesson.title}
            </button>
          ))}
        </nav>
      </header>

      <main id="lesson-content" className="lesson-content" aria-label={`Lesson ${selectedLesson.number} — ${selectedLesson.title}`}>
        <Lesson key={selectedLessonId} />
      </main>
    </div>
  )
}
