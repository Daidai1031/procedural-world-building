import { create } from 'zustand'
import { safeContext } from './context.js'

export const useTutorStore = create((set) => ({
  isOpen: false,
  messages: [],
  authStatus: 'unknown',
  context: null,
  draft: '',
  open: function (context, draft = '') { set({ isOpen: true, context: context ? safeContext(context) : null, draft }) },
  close: function () { set({ isOpen: false }) },
  add: function (message) { set((state) => ({ messages: [...state.messages, message] })) },
  update: function (id, patch) { set((state) => ({ messages: state.messages.map((message) => message.id === id ? { ...message, ...patch } : message) })) },
}))
