import { generate } from './lsystem.js'
import { parseInstructions } from './turtle.js'

// Step 1: three instructions typed by hand.
export const FIRST_PROGRAM = parseInstructions('F + F - F')
export const FIRST_LENGTH = 1.2

// Step 2: one starting symbol and one rule. The segment length stays fixed so
// one generation can be laid over the next.
export const LINE_AXIOM = 'F'
export const LINE_RULES = { F: 'F+F' }
export const LINE_LENGTH = 0.6
export const MAX_GENERATION = 4
export const LINE_GENERATIONS = generate(LINE_AXIOM, LINE_RULES, MAX_GENERATION)

// What the pen does for each instruction, shown beside the playback.
export const INSTRUCTION_ACTIONS = {
  F: 'move forward and draw',
  '+': 'turn left, draw nothing',
  '-': 'turn right, draw nothing',
  '[': 'remember this spot',
  ']': 'go back to the saved spot, draw nothing',
}
